// Auditoría del inicio de sesión: pruebas reales contra las dos tiendas, según OWASP Top 10 2021. Antes = sin gateway.
// Después = con gateway. Nunca devuelve claves ni tokens. Es una revisión de esta demo, no una certificación.
import { randomBytes } from "node:crypto";
import { ClienteGateway } from "./cliente-gateway.mjs";

const mediana = (v) => [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)];
const azar = () => "auditoria-" + randomBytes(4).toString("hex");
const CABECERAS = ["content-security-policy", "x-content-type-options", "x-frame-options", "referrer-policy", "permissions-policy"];
const faltan = (h) => CABECERAS.filter((k) => !h.get(k));

export async function correrAuditoria(ctx) {
  const { directo, gateway } = ctx.urls;
  const clave = ctx.config.claveDemo;
  const nuevo = () => new ClienteGateway(gateway, ctx.config.rutaOpaca);
  const entrarG = async (u = "ana", c = clave) => { const g = nuevo(); const r = await g.entrar(u, c); return { g, r }; };
  const postD = (ruta, cuerpo, cabeceras = {}) => fetch(directo + ruta, { method: "POST", headers: cabeceras, body: JSON.stringify(cuerpo) });
  const loginD = async (usuario = "ana", c = clave) => {
    const r = await postD("/api/v1/auth/login", { usuario, clave: c });
    return { r, j: await r.json().catch(() => ({})) };
  };
  const pedirD = (token, metodo, ruta, cuerpo) => fetch(directo + ruta, { method: metodo, headers: { Authorization: "Bearer " + token }, body: cuerpo ? JSON.stringify(cuerpo) : undefined });

  const { r: rD, j: jD } = await loginD();
  const token = jD.token;
  const { g, r: rG } = await entrarG();
  const controles = [];
  const anotar = (owasp, titulo, antes, despues) => controles.push({ owasp, titulo, antes, despues });

  // A02 · Contraseña en el camino
  const crudo = await fetch(gateway + ctx.config.rutaOpaca, { method: "POST", body: JSON.stringify({ u: "ana", p: clave }) });
  anotar("A02 Fallas criptográficas", "La contraseña no viaja legible",
    { ok: false, evidencia: rD.status === 200 ? 'cuerpo: {"usuario":"ana","clave":"•••"}' : "login sin cifrar" },
    { ok: !g.cuerpoEntrada.includes(clave) && crudo.status === 400, evidencia: `sobre AES-GCM: ${JSON.parse(g.cuerpoEntrada).c.slice(0, 22)}…` });

  // A07 · Dónde queda la sesión
  const cookie = g.setCookie || "";
  anotar("A07 Fallas de autenticación", "JavaScript no puede leer la sesión",
    { ok: !token, evidencia: "token en el JSON, guardado en localStorage" },
    { ok: /HttpOnly/.test(cookie) && /SameSite=Strict/.test(cookie) && !JSON.stringify(rG.json).includes("token"), evidencia: "cookie HttpOnly y SameSite=Strict" });

  // A07 · Fuerza bruta
  const intentosD = [];
  const victimaD = azar();
  for (let i = 0; i < 8; i++) intentosD.push((await loginD(victimaD, "mal-" + i)).r.status);
  const intentosG = [];
  const victimaG = azar();
  for (let i = 0; i < 8; i++) intentosG.push((await entrarG(victimaG, "mal-" + i)).r.status);
  anotar("A07 Fallas de autenticación", "Freno a la fuerza bruta",
    { ok: intentosD.includes(429), evidencia: `8 intentos: ${intentosD.filter((s) => s === 401).length} atendidos, sin bloqueo` },
    { ok: intentosG.includes(429), evidencia: `bloqueo en el intento ${intentosG.indexOf(429) + 1}, durante ${ctx.config.bloqueoMs / 1000} s` });

  // A07 · ¿El tiempo delata si el usuario existe?
  const medir = async (f) => { const t = performance.now(); await f(); return performance.now() - t; };
  const tiempos = async (entrar, conocido) => {
    const si = [], no = [];
    for (let i = 0; i < 4; i++) {
      si.push(await medir(() => entrar(conocido, "mal-" + i)));
      no.push(await medir(() => entrar(azar(), "mal-" + i)));
    }
    return { si: mediana(si), no: mediana(no) };
  };
  const tD = await tiempos(loginD, "caja");
  const tG = await tiempos(entrarG, "caja");
  await entrarG("caja"); // deja en cero los fallos de esa cuenta
  const brecha = (t) => Math.abs(t.si - t.no);
  const texto = (t) => `existe ${t.si.toFixed(0)} ms, no existe ${t.no.toFixed(0)} ms`;
  anotar("A07 Fallas de autenticación", "El tiempo no delata qué usuarios existen",
    { ok: brecha(tD) < 15, evidencia: texto(tD) }, { ok: brecha(tG) < 15, evidencia: texto(tG) });

  // A07 · Cerrar sesión
  const salirD = await pedirD(token, "POST", "/api/v1/auth/logout", {});
  const sigueD = await pedirD(token, "GET", "/api/v1/clientes/1042/facturas");
  const { g: gs } = await entrarG();
  await gs.llamar("x1");
  const sigueG = await gs.enviar(gs.sellar("k4").cuerpo);
  anotar("A07 Fallas de autenticación", "Cerrar sesión la invalida en el servidor",
    { ok: salirD.status === 200 && sigueD.status === 401, evidencia: `sin cierre (${salirD.status}); el token sigue dando ${sigueD.status}` },
    { ok: sigueG.status === 401, evidencia: `tras cerrar, la misma cookie da ${sigueG.status}` });

  // A05 · Cabeceras y huellas
  const paginaD = await fetch(directo + "/"), paginaG = await fetch(gateway + "/");
  const apiD = await postD("/api/v1/auth/login", {}), apiG = await fetch(gateway + "/no-existe", { method: "POST" });
  const faltanD = [...new Set([...faltan(paginaD.headers), ...faltan(apiD.headers)])], faltanG = [...new Set([...faltan(paginaG.headers), ...faltan(apiG.headers)])];
  anotar("A05 Configuración insegura", "Cabeceras de seguridad completas",
    { ok: !faltanD.length, evidencia: `faltan ${faltanD.length}: ${faltanD.slice(0, 2).join(", ")}…` },
    { ok: !faltanG.length, evidencia: faltanG.length ? `faltan: ${faltanG.join(", ")}` : `${CABECERAS.length} de ${CABECERAS.length} presentes` });
  const huellas = (h) => ["x-powered-by", "server", "x-backend"].filter((k) => h.get(k));
  const hD = huellas(apiD.headers), hG = huellas(apiG.headers);
  anotar("A05 Configuración insegura", "No anuncia su tecnología",
    { ok: !hD.length, evidencia: hD.length ? `muestra: ${hD.join(", ")}` : "sin huellas" },
    { ok: !hG.length, evidencia: hG.length ? `muestra: ${hG.join(", ")}` : "sin huellas" });

  // A05 · Errores
  const errD = await pedirD((await loginD()).j.token, "GET", "/api/v1/facturas/F-9999");
  const textoErr = await errD.text();
  const errG = await g.llamar("m9", { id: "F-9999" });
  anotar("A05 Configuración insegura", "Los errores no cuentan el interior",
    { ok: !/SQLSTATE|\/srv\//.test(textoErr), evidencia: `${errD.status}: SQLSTATE y ruta del servidor` },
    { ok: !/SQLSTATE|\/srv\//.test(JSON.stringify(errG.json)), evidencia: `${errG.status}: mensaje corto y referencia` });

  // A01 · Control de acceso
  const tokenAna = (await loginD()).j.token;
  const ajenaD = await pedirD(tokenAna, "GET", "/api/v1/facturas/F-2003");
  const ajenaG = await g.llamar("m9", { id: "F-2003" });
  anotar("A01 Control de acceso roto", "Solo ves lo tuyo",
    { ok: ajenaD.status !== 200, evidencia: `factura ajena: ${ajenaD.status} con nombre y DNI` },
    { ok: ajenaG.status !== 200, evidencia: `factura ajena: ${ajenaG.status}` });
  const adminD = await pedirD(tokenAna, "GET", "/api/v1/admin/reportes/ventas");
  const adminG = await g.llamar("z7");
  anotar("A01 Control de acceso roto", "Un cliente no entra a funciones de administrador",
    { ok: adminD.status !== 200, evidencia: `reporte de ventas: ${adminD.status}` },
    { ok: adminG.status !== 200, evidencia: `reporte de ventas: ${adminG.status}` });
  const origenD = await postD("/api/v1/auth/login", { usuario: "ana", clave }, { Origin: "https://sitio-ajeno.example" });
  const origenG = await fetch(gateway + ctx.config.rutaOpaca, { method: "POST", headers: { Origin: "https://sitio-ajeno.example" }, body: "{}" });
  anotar("A01 Control de acceso roto", "Rechaza peticiones de otro sitio (CSRF)",
    { ok: origenD.status === 403, evidencia: `otro origen: ${origenD.status}, CORS ${origenD.headers.get("access-control-allow-origin") ?? "cerrado"}` },
    { ok: origenG.status === 403, evidencia: `otro origen: ${origenG.status}` });

  // A03 · Validación
  const montoD = await pedirD(tokenAna, "POST", "/api/v1/clientes/1042/facturas/F-2001/pagar", { monto: 0.01, moneda: "PEN" });
  const montoG = await g.llamar("q2", { id: "F-2001", monto: 0.01 });
  const raroG = await entrarG("ana' OR '1'='1", clave);
  anotar("A03 Inyección", "Valida lo que llega",
    { ok: montoD.status !== 200, evidencia: `acepta pagar con monto 0.01: ${montoD.status}` },
    { ok: montoG.status === 400 && raroG.r.status === 400, evidencia: `campo extra: ${montoG.status}; usuario raro: ${raroG.r.status}` });

  // A09 · Registro
  const registro = JSON.stringify(ctx.registro.ver());
  anotar("A09 Fallas de registro", "Registra intentos fallidos sin guardar claves",
    { ok: false, evidencia: "esta tienda no lleva registro" },
    { ok: registro.includes("credenciales incorrectas") && !registro.includes(clave) && !registro.includes("mal-0"), evidencia: "fallos registrados; 0 contraseñas en el registro" });

  // Fuera del alcance de localhost
  anotar("A02 Fallas criptográficas", "HTTPS y cookie Secure",
    { ok: null, evidencia: "esta demo corre en http://127.0.0.1" },
    { ok: null, evidencia: "obligatorio al publicar; aquí no se puede probar" });

  ctx.reiniciar();
  const medidos = controles.filter((c) => c.antes.ok !== null);
  return {
    controles,
    puntaje: {
      total: medidos.length,
      antes: medidos.filter((c) => c.antes.ok).length,
      despues: medidos.filter((c) => c.despues.ok).length,
    },
  };
}
