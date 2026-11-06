// PARTE 2 · Con gateway. Un solo punto de entrada. Revisa en orden, de lo barato a lo caro:
// tamaño → límite por IP → sesión (cookie HttpOnly) → ruta dinámica → límite por sesión → sobre → descifrar (GCM)
// → anti-repetición (tiempo + nonce) → operación y validación → permiso → traducir → backend → filtrar → cifrar → registrar.
import { createServer } from "node:http";
import { createHash, createHmac, randomBytes, randomUUID } from "node:crypto";
import path from "node:path";
import { CuerpoGrande, json, leerCuerpo, servirEstatico } from "./http.mjs";
import { aadPeticion, aadRespuesta, cifrar, descifrar, sobreValido } from "./sobre.mjs";
import { crearLimite } from "./limite.mjs";

const idFactura = (v) => typeof v === "string" && /^F-\d{4}$/.test(v);
const soloCampos = (d, permitidos) => !!d && typeof d === "object" && !Array.isArray(d) && Object.keys(d).every((k) => permitidos.includes(k));
const publico = (f) => ({ id: f.id, total: f.total, moneda: f.moneda, estado: f.estado });

// Tabla de traducción: código opaco → ruta real. El cliente solo conoce los códigos.
export const OPERACIONES = {
  k4: { // listar mis facturas. El cliente nunca dice quién es: sale de la sesión.
    nombre: "listar-facturas", roles: ["cliente"],
    valida: (d) => soloCampos(d, []),
    traduce: (_d, s, pol) => pol.listadoV2
      ? { metodo: "GET", ruta: `/interno/v2/comprobantes?cliente=${s.clienteId}` }
      : { metodo: "GET", ruta: `/interno/v1/clientes/${s.clienteId}/facturas` },
    filtra: (r) => ({
      facturas: r.comprobantes
        ? r.comprobantes.map((c) => ({ id: c.codigo, total: c.total_centimos / 100, moneda: "PEN", estado: c.situacion })) // adaptador v2 → v1
        : r.facturas.map(publico),
    }),
  },
  m9: { // ver una factura
    nombre: "ver-factura", roles: ["cliente", "admin"],
    valida: (d) => soloCampos(d, ["id"]) && idFactura(d.id),
    traduce: (d) => ({ metodo: "GET", ruta: `/interno/v1/facturas/${d.id}` }),
    filtra: (r) => ({ factura: publico(r.factura) }),
  },
  q2: { // pagar. Fíjate: no acepta monto. Si llega, se rechaza.
    nombre: "pagar-factura", roles: ["cliente"],
    valida: (d) => soloCampos(d, ["id"]) && idFactura(d.id),
    traduce: (d) => ({ metodo: "POST", ruta: `/interno/v1/facturas/${d.id}/pagos` }),
    filtra: (r) => ({ pago: r.pago, factura: publico(r.factura) }),
  },
  z7: { // reporte: solo admin
    nombre: "reporte-ventas", roles: ["admin"],
    valida: (d) => soloCampos(d, []),
    traduce: () => ({ metodo: "GET", ruta: "/interno/v1/admin/ventas" }),
    filtra: (r) => ({ ventas_total: r.ventas_total, facturas: r.facturas }),
  },
};

// El cliente recibe poco a propósito. El detalle queda en el registro, ligado por la referencia.
const MENSAJES = { 400: "petición rechazada", 401: "sesión no válida", 403: "sin permiso", 404: "no encontrado", 409: "no se pudo completar", 413: "petición rechazada", 429: "demasiadas peticiones", 502: "servicio no disponible", 503: "servicio no disponible" };

const huella = (t) => createHash("sha256").update(t).digest("hex");
const leerCookie = (req, nombre) => {
  for (const parte of (req.headers.cookie || "").split(";")) {
    const [k, ...v] = parte.trim().split("=");
    if (k === nombre) return v.join("=");
  }
  return "";
};

export function crearGateway({ config, politicas, tienda, credenciales, registro, captura, urlBackend, publico: carpetaPublica }) {
  const sesiones = new Map(); // huella del token → sesión
  const limiteIp = crearLimite(() => config.limites.ip, () => config.limites.ventanaMs);
  const limiteSesion = crearLimite(() => config.limites.sesion, () => config.limites.ventanaMs);
  const limiteEntrada = crearLimite(() => config.limites.entrada, () => 60_000);

  // Ruta dinámica: firmada por sesión y por ventana de tiempo. Se acepta la ventana anterior para no cortar lo que va en camino.
  const ventanaActual = () => Math.floor(Date.now() / config.ventanaRutaMs) + politicas.saltoRuta;
  const rutaDe = (s, ventana) => "/d/" + createHmac("sha256", config.secretoRutas).update(`${s.id}|${ventana}`).digest("base64url").slice(0, 22);
  const rutaVigente = (s, ruta) => ruta === rutaDe(s, ventanaActual()) || ruta === rutaDe(s, ventanaActual() - 1);

  const servidor = createServer(async (req, res) => {
    const inicio = process.hrtime.bigint();
    const url = new URL(req.url, "http://gateway");
    const ruta = url.pathname;
    const ip = req.socket.remoteAddress;
    const ref = randomBytes(4).toString("hex");
    const ctx = { ref, ip, usuario: null, op: null };
    const ms = () => Number((process.hrtime.bigint() - inicio) / 1000n) / 1000;

    const rechazar = (status, motivo) => {
      registro.anotar({ ...ctx, decision: "rechazado", status, motivo, ms: ms() });
      json(res, status, { error: MENSAJES[status], ref });
    };

    if (politicas.gatewayCaido) { captura.envolver("gateway", req, res, ""); return rechazar(503, "gateway caído (simulado)"); }

    if (req.method === "GET") {
      const inyectar = (t, nombre) => (nombre === "index.html" ? t.replace("__ENTRADA__", config.rutaOpaca) : t);
      const hecho = await servirEstatico(res, path.join(carpetaPublica, "gateway"), { "/": "index.html", "/app.js": "app.js", "/estilo.css": "../comun.css" }, ruta, {}, inyectar);
      if (hecho) return;
    }

    let cuerpo = "";
    try {
      // 1 · Tamaño
      if (req.method === "POST") cuerpo = await leerCuerpo(req, config.cuerpoMaxBytes);
    } catch (e) {
      captura.envolver("gateway", req, res, "(cuerpo demasiado grande)");
      if (e instanceof CuerpoGrande) return rechazar(413, "cuerpo demasiado grande");
      return rechazar(400, "no se pudo leer el cuerpo");
    }
    captura.envolver("gateway", req, res, cuerpo);

    // 2 · Límite por IP: antes de gastar CPU en descifrar
    if (!limiteIp("ip:" + ip)) return rechazar(429, "límite por IP");

    if (req.method !== "POST") return rechazar(404, "ruta desconocida");

    // Entrada: la única ruta fija. Inicia la sesión.
    if (ruta === config.rutaOpaca) {
      if (!limiteEntrada("entrada:" + ip)) return rechazar(429, "límite de inicios de sesión");
      let e = {};
      try { e = JSON.parse(cuerpo); } catch { return rechazar(400, "entrada no es JSON"); }
      // Renovar la ruta: basta la cookie. Por eso rotar sube el costo pero no frena a quien controla la sesión.
      if (e.renovar === true) {
        const viva = sesiones.get(huella(leerCookie(req, "sid")));
        if (!viva || Date.now() > viva.vence) return rechazar(401, "renovar sin sesión");
        registro.anotar({ ...ctx, usuario: viva.usuario, decision: "ruta-renovada", status: 200, ms: ms() });
        return json(res, 200, { r: rutaDe(viva, ventanaActual()) });
      }
      const u = tienda.datos.usuarios.find((x) => x.usuario === e.u);
      const claveOk = credenciales.verificar(e.p ?? "");
      if (!u || !claveOk) return rechazar(401, "credenciales incorrectas");
      const token = randomBytes(32).toString("base64url");
      const s = { id: randomUUID(), usuario: u.usuario, clienteId: u.clienteId, rol: u.rol, clave: randomBytes(32), vence: Date.now() + config.sesionMs, nonces: new Map() };
      sesiones.set(huella(token), s);
      registro.anotar({ ...ctx, usuario: u.usuario, decision: "sesion-iniciada", status: 200, ms: ms() });
      // HttpOnly: el JavaScript de la página no puede leer el token. SameSite: no viaja desde otro sitio.
      // En producción, además, Secure. Aquí no se pone porque la demo corre en http://127.0.0.1.
      return json(res, 200, { s: s.id, k: s.clave.toString("base64url"), r: rutaDe(s, ventanaActual()) }, {
        "Set-Cookie": `sid=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${config.sesionMs / 1000}`,
      });
    }

    // 3 · Sesión
    const s = sesiones.get(huella(leerCookie(req, "sid")));
    if (!s || Date.now() > s.vence) return rechazar(401, s ? "sesión vencida" : "sin sesión");
    ctx.usuario = s.usuario;

    // 4 · Ruta dinámica. Si no es la de esta sesión, para el exterior esa ruta no existe.
    if (!rutaVigente(s, ruta)) return rechazar(404, "ruta dinámica vencida o ajena");

    // 5 · Límite por sesión
    if (!limiteSesion("sesion:" + s.id)) return rechazar(429, "límite por sesión");

    // 6 · Sobre y descifrado. GCM detecta cualquier cambio.
    let sobre;
    try { sobre = JSON.parse(cuerpo); } catch { return rechazar(400, "cuerpo no es JSON"); }
    if (!sobreValido(sobre)) return rechazar(400, "sobre mal formado");
    let mensaje;
    try { mensaje = JSON.parse(descifrar(s.clave, sobre, aadPeticion(s.id))); }
    catch { return rechazar(400, "sello GCM inválido: mensaje manipulado o de otra sesión"); }

    // 7 · Anti-repetición: va después de descifrar, para que nadie pueda llenar la lista con basura
    const ahora = Date.now();
    if (typeof mensaje.t !== "number" || Math.abs(ahora - mensaje.t) > config.ventanaPeticionMs) return rechazar(400, "fuera de la ventana de tiempo");
    if (typeof mensaje.n !== "string" || mensaje.n.length < 16) return rechazar(400, "nonce inválido");
    for (const [n, vence] of s.nonces) if (vence < ahora) s.nonces.delete(n);
    if (s.nonces.has(mensaje.n)) return rechazar(400, "nonce repetido: petición reenviada");
    s.nonces.set(mensaje.n, ahora + 2 * config.ventanaPeticionMs);

    // 8 · Operación y validación estricta
    const op = Object.hasOwn(OPERACIONES, mensaje.o) ? OPERACIONES[mensaje.o] : null;
    if (!op) return rechazar(400, "operación desconocida");
    ctx.op = op.nombre;
    if (!op.valida(mensaje.d ?? {})) return rechazar(400, "datos no cumplen el esquema");

    // 9 · Permiso grueso: ¿este rol puede hacer esta operación? El fino (¿es tuya?) lo decide el backend.
    if (politicas.autorizacion && !op.roles.includes(s.rol)) return rechazar(403, "rol sin permiso para la operación");

    // 10 · Traducir y llamar al backend
    const { metodo, ruta: rutaReal } = op.traduce(mensaje.d ?? {}, s, politicas);
    let r;
    try {
      r = await fetch(urlBackend() + rutaReal, {
        method: metodo,
        headers: { "x-interno": config.secretoInterno, "x-cliente-id": s.clienteId, "x-rol": s.rol, "x-ref": ref },
        signal: AbortSignal.timeout(config.timeoutBackendMs),
      });
    } catch { return rechazar(502, "backend no responde"); }
    const respuesta = await r.json().catch(() => ({}));
    if (r.status !== 200) {
      const status = [403, 404, 409].includes(r.status) ? r.status : 502;
      return rechazar(status, `backend ${r.status}: ${respuesta.error ?? "sin detalle"}`);
    }

    // 11 · Filtrar por lista blanca, cifrar y registrar. La respuesta trae la ruta que toca usar ahora.
    const claro = JSON.stringify({ d: op.filtra(respuesta), r: rutaDe(s, ventanaActual()) });
    registro.anotar({ ...ctx, decision: "aceptado", status: 200, ruta_interna: rutaReal.split("?")[0], ms: ms() });
    return json(res, 200, cifrar(s.clave, claro, aadRespuesta(s.id, mensaje.n)));
  });

  return servidor;
}
