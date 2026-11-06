// PARTE 1 · Sin gateway. Una API común, de las que escribe la IA a la primera: funciona, y por eso nadie la revisa.
// Fallos a propósito: rutas que cuentan el negocio, campos internos en la respuesta, monto que manda el cliente,
// solo mira si hay sesión, sin límite, sin anti-repetición y errores que cuentan demasiado.
import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { json, leerCuerpo, servirEstatico } from "./http.mjs";

const CABECERAS = {
  "X-Powered-By": "DemoFramework/1.0",
  Server: "demo-api/1.0 (node)",
  "X-Backend": "api-01.interna.bodega-demo",
  "Access-Control-Allow-Origin": "*",
};

export function crearDirecta({ config, politicas, tienda, credenciales, captura, publico }) {
  const sesiones = new Map();
  const responder = (res, status, cuerpo) => json(res, status, cuerpo, CABECERAS);

  return createServer(async (req, res) => {
    const url = new URL(req.url, "http://directa");
    const ruta = url.pathname;
    const carpeta = path.join(publico, "directo");
    if (req.method === "GET" && (await servirEstatico(res, carpeta, { "/": "index.html", "/app.js": "app.js", "/estilo.css": "../comun.css" }, ruta))) return;

    const cuerpoTexto = req.method === "POST" ? await leerCuerpo(req, 1024 * 1024) : "";
    captura.envolver("directo", req, res, cuerpoTexto);
    const d = tienda.datos;

    if (req.method === "POST" && ruta === "/api/v1/auth/login") {
      let entrada = {};
      try { entrada = JSON.parse(cuerpoTexto); } catch {}
      const u = d.usuarios.find((x) => x.usuario === entrada.usuario);
      if (!u || !credenciales.verificar(entrada.clave ?? "")) return responder(res, 401, { error: "usuario o clave incorrectos" });
      const token = randomBytes(24).toString("hex");
      sesiones.set(token, u);
      return responder(res, 200, { token, usuario: u });
    }

    const token = (req.headers.authorization || "").replace(/^Bearer /, "");
    const u = sesiones.get(token);
    if (!u) return responder(res, 401, { error: "falta sesión" });

    let m;
    if (req.method === "GET" && (m = ruta.match(/^\/api\/v1\/clientes\/(\d+)\/facturas$/))) {
      if (politicas.listadoV2) return responder(res, 410, { error: "ruta retirada: usa /api/v2/comprobantes" });
      return responder(res, 200, { servidor_db: "pg-01.interna:5432", facturas: d.facturas.filter((f) => f.clienteId === m[1]) });
    }
    if (req.method === "GET" && (m = ruta.match(/^\/api\/v1\/facturas\/([^/]+)$/))) {
      const f = d.facturas.find((x) => x.id === decodeURIComponent(m[1]));
      if (!f) {
        return responder(res, 500, { error: "SQLSTATE[42S02]: tabla facturas_2026 no existe", detalle: "at FacturaRepo.buscar (/srv/api/src/facturas.repo.js:42)" });
      }
      const dueno = d.usuarios.find((x) => x.clienteId === f.clienteId);
      return responder(res, 200, { factura: f, cliente: { nombre: dueno.nombre, dni: dueno.dni } }); // solo miró si hay sesión
    }
    if (req.method === "POST" && (m = ruta.match(/^\/api\/v1\/clientes\/(\d+)\/facturas\/([^/]+)\/pagar$/))) {
      let entrada = {};
      try { entrada = JSON.parse(cuerpoTexto); } catch {}
      const f = d.facturas.find((x) => x.id === m[2]);
      if (!f) return responder(res, 404, { error: "factura no encontrada" });
      f.estado = "pagada";
      const pago = { factura: f.id, monto: entrada.monto, moneda: entrada.moneda ?? "PEN" }; // confía en lo que manda el cliente
      d.pagos.push(pago);
      return responder(res, 200, { pago, pagos_registrados: d.pagos.filter((p) => p.factura === f.id).length });
    }
    if (req.method === "GET" && ruta === "/api/v1/admin/reportes/ventas") {
      return responder(res, 200, { ventas_total: d.facturas.reduce((s, f) => s + f.total, 0), margen_promedio_pct: 29.5 });
    }
    return responder(res, 404, { error: "ruta no encontrada", rutas_disponibles: ["/api/v1/clientes", "/api/v1/facturas", "/api/v1/admin/reportes"] });
  });
}
