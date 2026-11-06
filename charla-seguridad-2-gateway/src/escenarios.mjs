// Las simulaciones del panel, del script comparar y de las pruebas. Todas hacen peticiones HTTP de verdad.
import { ClienteGateway } from "./cliente-gateway.mjs";

const PAGAR = { monto: 120.5, moneda: "PEN" };

async function directa(ctx, usuario = "ana") {
  const base = ctx.urls.directo;
  const login = await (await fetch(base + "/api/v1/auth/login", { method: "POST", body: JSON.stringify({ usuario, clave: ctx.config.claveDemo }) })).json();
  const pedir = async (metodo, ruta, cuerpo) => {
    const r = await fetch(base + ruta, { method: metodo, headers: { Authorization: "Bearer " + login.token }, body: cuerpo ? JSON.stringify(cuerpo) : undefined });
    return { status: r.status, json: await r.json().catch(() => null), cabeceras: Object.fromEntries(r.headers) };
  };
  return { pedir };
}

async function gateway(ctx, usuario = "ana") {
  const c = new ClienteGateway(ctx.urls.gateway, ctx.config.rutaOpaca);
  const r = await c.entrar(usuario, ctx.config.claveDemo);
  if (r.status !== 200) throw new Error(r.status === 429 ? "demasiadas peticiones seguidas; espera unos segundos" : `el gateway respondió ${r.status} al iniciar sesión`);
  return c;
}

const corto = (t, n = 150) => { const s = typeof t === "string" ? t : JSON.stringify(t); return s.length > n ? s.slice(0, n) + "…" : s; };
const motivo = (ctx, r) => ctx.registro.porRef(r.json?.ref)?.motivo ?? "";
const lado = (peticion, r, veredicto, nota, registro = "", nombre = "") => ({ peticion, status: r?.status ?? "", respuesta: r ? corto(r.json) : "", veredicto, nota, registro, nombre });
const rutaGw = (c) => "POST " + c.ruta;

function voltearByte(cuerpo) {
  const s = JSON.parse(cuerpo);
  const b = Buffer.from(s.c, "base64url");
  b[3] ^= 1;
  return JSON.stringify({ ...s, c: b.toString("base64url") });
}

export const ESCENARIOS = [
  {
    id: "normal", grupo: "Ver", titulo: "Pagar una factura propia", pregunta: "Misma acción en las dos puertas. ¿Qué se ve?",
    leccion: "El resultado es igual. Cambia lo que le regalas a quien mira el tráfico.",
    async correr(ctx) {
      const d = await directa(ctx);
      const rd = await d.pedir("POST", "/api/v1/clientes/1042/facturas/F-2001/pagar", PAGAR);
      const g = await gateway(ctx);
      const ruta = rutaGw(g);
      const rg = await g.llamar("q2", { id: "F-2001" });
      return {
        directo: lado(`POST /api/v1/clientes/1042/facturas/F-2001/pagar\n${JSON.stringify(PAGAR)}`, rd, "normal", "Se ve cliente, factura, monto y campos."),
        gateway: lado(`${ruta}\n${corto(rg.cuerpo, 90)}`, rg, "normal", "Se ve una ruta sin sentido y un texto cifrado."),
      };
    },
  },
  {
    id: "manipulada", grupo: "Atacar", titulo: "Petición manipulada", pregunta: "Quien intercepta cambia el mensaje. ¿Lo aceptan?",
    leccion: "AES-GCM detecta el cambio de un solo bit. Pero esto solo vale si la clave no está en manos del atacante.",
    async correr(ctx) {
      const d = await directa(ctx);
      const rd = await d.pedir("POST", "/api/v1/clientes/1042/facturas/F-2001/pagar", { monto: 0.01, moneda: "PEN" });
      const g = await gateway(ctx);
      const { cuerpo } = g.sellar("q2", { id: "F-2001" });
      const rg = await g.enviar(voltearByte(cuerpo));
      return {
        directo: lado('Cambia "monto": 120.5 por 0.01', rd, "paso", "Factura pagada con un centavo."),
        gateway: lado("Cambia 1 bit del texto cifrado", rg, "bloqueado", "Rechazada antes de llegar al backend.", motivo(ctx, rg)),
      };
    },
  },
  {
    id: "repetida", grupo: "Atacar", titulo: "Petición repetida", pregunta: "Se reenvía la misma petición, byte por byte. ¿Se cobra dos veces?",
    leccion: "El nonce hace que cada petición sirva una sola vez.",
    async correr(ctx) {
      const d = await directa(ctx);
      await d.pedir("POST", "/api/v1/clientes/1042/facturas/F-2001/pagar", PAGAR);
      const rd = await d.pedir("POST", "/api/v1/clientes/1042/facturas/F-2001/pagar", PAGAR);
      const g = await gateway(ctx);
      const { cuerpo } = g.sellar("q2", { id: "F-2001" });
      await g.enviar(cuerpo);
      const rg = await g.enviar(cuerpo);
      return {
        directo: lado("Reenvía la misma petición", rd, "paso", `Pagos registrados: ${rd.json?.pagos_registrados}.`),
        gateway: lado("Reenvía los mismos bytes", rg, "bloqueado", "La segunda no pasa.", motivo(ctx, rg)),
      };
    },
  },
  {
    id: "vencida", grupo: "Atacar", titulo: "Petición vieja", pregunta: "Una petición capturada hace 5 minutos. ¿Sirve?",
    leccion: "Con la ventana de tiempo, la lista de nonces no crece sin fin.",
    async correr(ctx) {
      const d = await directa(ctx);
      const rd = await d.pedir("POST", "/api/v1/clientes/1042/facturas/F-2001/pagar", PAGAR);
      const g = await gateway(ctx);
      const { cuerpo } = g.sellar("q2", { id: "F-2001" }, { t: Date.now() - 5 * 60_000 });
      const rg = await g.enviar(cuerpo);
      return {
        directo: lado("La misma petición, 5 minutos después", rd, "paso", "La API no mira el tiempo."),
        gateway: lado("Sobre válido, con hora de hace 5 minutos", rg, "bloqueado", "Vencida.", motivo(ctx, rg)),
      };
    },
  },
  {
    id: "sin-permiso", grupo: "Atacar", titulo: "Factura ajena", pregunta: "Ana pide la factura de Beto. Tiene sesión y tiene su clave.",
    leccion: "Ana cifró bien. La detuvo la autorización del servidor, no el cifrado.",
    async correr(ctx) {
      const d = await directa(ctx);
      const rd = await d.pedir("GET", "/api/v1/facturas/F-2003");
      const g = await gateway(ctx);
      const rg = await g.llamar("m9", { id: "F-2003" });
      return {
        directo: lado("GET /api/v1/facturas/F-2003", rd, "paso", "Ve la factura y el DNI de otro cliente."),
        gateway: lado("Ana cifra con su clave legítima", rg, "bloqueado", "El backend comprobó al dueño.", motivo(ctx, rg)),
      };
    },
  },
  {
    id: "admin", grupo: "Atacar", titulo: "Función de administrador", pregunta: "Un cliente pide el reporte de ventas.",
    leccion: "Ocultar el botón no es un permiso. El rol se comprueba en el servidor.",
    async correr(ctx) {
      const d = await directa(ctx);
      const rd = await d.pedir("GET", "/api/v1/admin/reportes/ventas");
      const g = await gateway(ctx);
      const rg = await g.llamar("z7");
      return {
        directo: lado("GET /api/v1/admin/reportes/ventas", rd, "paso", "Cualquier sesión sirve."),
        gateway: lado("Ana manda el código z7, visible en el JS", rg, "bloqueado", "El rol no alcanza.", motivo(ctx, rg)),
      };
    },
  },
  {
    id: "campo-extra", grupo: "Atacar", titulo: "Campo de más, con la clave en la mano", pregunta: "El atacante tiene la clave y cifra un monto falso.",
    leccion: "La validación estricta rechaza lo que no está en el esquema.",
    async correr(ctx) {
      const d = await directa(ctx);
      const rd = await d.pedir("POST", "/api/v1/clientes/1042/facturas/F-2001/pagar", { monto: 0.01, moneda: "PEN", descuento: 100 });
      const g = await gateway(ctx);
      const rg = await g.llamar("q2", { id: "F-2001", monto: 0.01 });
      return {
        directo: lado('Agrega "monto": 0.01', rd, "paso", "Lo acepta tal cual."),
        gateway: lado("Cifra { id, monto: 0.01 } con la clave real", rg, "bloqueado", "El cifrado estaba perfecto. Falló la validación.", motivo(ctx, rg)),
      };
    },
  },
  {
    id: "solo-ofuscar", grupo: "La verdad", titulo: "Gateway que solo ofusca", pregunta: "Apagamos la autorización. Queda ruta opaca y cifrado. Ana pide la factura de Beto.",
    leccion: "Mismo cifrado, cero protección. Ofuscar no es seguridad.",
    async correr(ctx) {
      const g = await gateway(ctx);
      const conPermiso = await g.llamar("m9", { id: "F-2003" });
      ctx.politicas.autorizacion = false;
      try {
        const sin = await g.llamar("m9", { id: "F-2003" });
        return {
          directo: lado("Con autorización encendida", conPermiso, "bloqueado", "El servidor comprueba al dueño.", motivo(ctx, conPermiso), "Gateway con autorización"),
          gateway: lado("Autorización apagada, cifrado encendido", { status: sin.status, json: sin.datos }, "paso", "El tráfico sigue viéndose cifrado. Los datos salieron igual.", "", "Gateway que solo ofusca"),
        };
      } finally { ctx.politicas.autorizacion = true; }
    },
  },
  {
    id: "cookie", grupo: "Sesión", titulo: "Cookie HttpOnly", pregunta: "Un script inyectado busca el token de sesión.",
    leccion: "HttpOnly evita que JavaScript lea la cookie. No evita que un script inyectado actúe desde la página: la cookie viaja sola y la clave del sobre sigue en memoria.",
    async correr(ctx) {
      const login = await fetch(ctx.urls.directo + "/api/v1/auth/login", { method: "POST", body: JSON.stringify({ usuario: "ana", clave: ctx.config.claveDemo }) });
      const j = await login.json();
      const g = await gateway(ctx);
      const r = await g.llamar("k4");
      return {
        directo: lado("El token llega en el JSON y queda en localStorage", { status: login.status, json: { token: "…" + j.token.slice(-6) } }, "paso", "localStorage.getItem('token') lo entrega a cualquier script de la página."),
        gateway: lado(`Set-Cookie: sid=…; ${g.setCookie.split("; ").slice(1).join("; ")}`, { status: r.status, json: { nota: "la petición salió igual, con la cookie" } }, "costo", "document.cookie no muestra sid. Pero un script en la página puede seguir pidiendo cosas."),
      };
    },
  },
  {
    id: "ruta-dinamica", grupo: "Sesión", titulo: "Ruta dinámica", pregunta: "La ruta rota por sesión y por tiempo. ¿Sirve una ruta capturada?",
    leccion: "Una ruta vieja deja de servir y una ajena no existe. Quien controla la página recibe la ruta nueva: sube el costo, no cierra la puerta.",
    async correr(ctx) {
      const d = await directa(ctx);
      const rd = await d.pedir("GET", "/api/v1/clientes/1042/facturas");
      const g = await gateway(ctx);
      const vieja = g.ruta;
      ctx.politicas.saltoRuta += 2; // adelanta el reloj de las rutas dos ventanas
      const rv = await g.enviar(g.sellar("k4").cuerpo, { ruta: vieja });
      const otro = await gateway(ctx);
      const ajena = await g.enviar(g.sellar("k4").cuerpo, { ruta: otro.ruta });
      // Con la cookie se pide la ruta vigente: quien controla la sesión sigue adentro.
      await g.renovar();
      const rn = await g.llamar("k4");
      return {
        directo: lado("GET /api/v1/clientes/1042/facturas", rd, "paso", "La ruta nunca cambia. Sirve hoy y sirve en un año."),
        gateway: lado(`Ruta capturada: ${vieja}`, rv, "bloqueado", `Ruta ajena: ${ajena.status}. Con la cookie se renueva y responde ${rn.status}.`, motivo(ctx, rv)),
      };
    },
  },
  {
    id: "rafaga", grupo: "Atacar", titulo: "Ráfaga de 40 peticiones", pregunta: "Un script dispara 40 peticiones seguidas.",
    leccion: "El límite va antes de descifrar: rechazar es barato.",
    async correr(ctx) {
      const d = await directa(ctx);
      const g = await gateway(ctx);
      let okD = 0, okG = 0, frenadas = 0;
      for (let i = 0; i < 40; i++) if ((await d.pedir("GET", "/api/v1/clientes/1042/facturas")).status === 200) okD++;
      for (let i = 0; i < 40; i++) {
        const r = await g.llamar("k4");
        if (r.status === 200) okG++;
        if (r.status === 429) frenadas++;
      }
      return {
        directo: lado("40 × GET /api/v1/clientes/1042/facturas", { status: 200, json: { atendidas: okD } }, "paso", "Las atendió todas."),
        gateway: lado("40 peticiones con sobre válido", { status: 429, json: { atendidas: okG, frenadas } }, "bloqueado", `Límite: ${ctx.config.limites.sesion} por ventana.`),
      };
    },
  },
  {
    id: "error", grupo: "Atacar", titulo: "Error provocado", pregunta: "Se pide una factura que no existe.",
    leccion: "Lo mismo de la charla 1: error genérico al cliente y detalle en el registro.",
    async correr(ctx) {
      const d = await directa(ctx);
      const rd = await d.pedir("GET", "/api/v1/facturas/F-9999");
      const g = await gateway(ctx);
      const rg = await g.llamar("m9", { id: "F-9999" });
      return {
        directo: lado("GET /api/v1/facturas/F-9999", rd, "paso", "Cuenta tabla, archivo y línea."),
        gateway: lado("Sobre válido con id F-9999", rg, "bloqueado", "El cliente ve poco y lleva una referencia.", motivo(ctx, rg)),
      };
    },
  },
  {
    id: "backend-oculto", grupo: "Atacar", titulo: "Ir directo al backend", pregunta: "Alguien descubre el puerto interno y se salta el gateway.",
    leccion: "El backend solo atiende al gateway. En producción, además, vive en red privada.",
    async correr(ctx) {
      const r = await fetch(ctx.urls.backend + "/interno/v1/admin/ventas");
      return {
        directo: lado("No aplica", null, "normal", "Aquí la API ya está expuesta."),
        gateway: lado("GET /interno/v1/admin/ventas sin secreto interno", { status: r.status, json: await r.json() }, "bloqueado", "Ocultar el backend no bastaba: también exige credencial."),
      };
    },
  },
  {
    id: "version", grupo: "Beneficio", titulo: "Migrar a v2 sin romper clientes", pregunta: "El backend retira v1 y publica v2 con otra forma de datos.",
    leccion: "Se cambió una línea de la tabla del gateway. El cliente no se enteró.",
    async correr(ctx) {
      const d = await directa(ctx);
      const g = await gateway(ctx);
      ctx.politicas.listadoV2 = true;
      try {
        const rd = await d.pedir("GET", "/api/v1/clientes/1042/facturas");
        const rg = await g.llamar("k4");
        return {
          directo: lado("El cliente viejo sigue llamando a v1", rd, "costo", "Hay que actualizar todos los clientes a la vez."),
          gateway: lado("El cliente sigue mandando k4", { status: rg.status, json: rg.datos }, "ok", "Mismo cliente, mismo formato."),
        };
      } finally { ctx.politicas.listadoV2 = false; }
    },
  },
  {
    id: "caida", grupo: "Costo", titulo: "Se cae el gateway", pregunta: "Un solo punto de entrada. ¿Y si cae?",
    leccion: "Punto único de fallo: necesita réplicas, salud y plan de vuelta.",
    async correr(ctx) {
      const d = await directa(ctx);
      const g = await gateway(ctx);
      ctx.politicas.gatewayCaido = true;
      try {
        const rd = await d.pedir("GET", "/api/v1/clientes/1042/facturas");
        const rg = await g.llamar("k4");
        return {
          directo: lado("GET /api/v1/clientes/1042/facturas", rd, "normal", "Sigue atendiendo."),
          gateway: lado("Cualquier operación", rg, "costo", "Todo el sistema queda sin servicio."),
        };
      } finally { ctx.politicas.gatewayCaido = false; }
    },
  },
  {
    id: "latencia", grupo: "Costo", titulo: "Medir la latencia", pregunta: "Cada revisión cuesta tiempo. ¿Cuánto, aquí?",
    leccion: "Medido ahora, en esta máquina y sin red real. Mide en tu sistema: este número no se traslada a otro.",
    async correr(ctx) {
      const N = 15;
      const mediana = (v) => [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)];
      const d = await directa(ctx);
      const g = await gateway(ctx);
      const td = [], tg = [];
      for (let i = 0; i < N; i++) {
        let t = performance.now();
        await d.pedir("GET", "/api/v1/clientes/1042/facturas");
        td.push(performance.now() - t);
        t = performance.now();
        await g.llamar("k4");
        tg.push(performance.now() - t);
      }
      return {
        directo: lado(`${N} peticiones`, { status: 200, json: { mediana_ms: +mediana(td).toFixed(2) } }, "normal", "Un solo salto."),
        gateway: lado(`${N} peticiones`, { status: 200, json: { mediana_ms: +mediana(tg).toFixed(2) } }, "costo", "Un salto más, descifrar, validar, filtrar y cifrar."),
      };
    },
  },
];

export async function correrEscenario(ctx, id) {
  const e = ESCENARIOS.find((x) => x.id === id);
  if (!e) return null;
  ctx.reiniciar();
  const r = await e.correr(ctx);
  ctx.reiniciar();
  return { id: e.id, grupo: e.grupo, titulo: e.titulo, pregunta: e.pregunta, leccion: e.leccion, ...r };
}

export const listaEscenarios = () => ESCENARIOS.map(({ id, grupo, titulo, pregunta }) => ({ id, grupo, titulo, pregunta }));
