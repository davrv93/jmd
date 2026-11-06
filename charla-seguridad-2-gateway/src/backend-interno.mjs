// Backend interno. Es el dueño de las reglas de negocio y no conoce ni cifrado ni rutas opacas.
// Solo atiende a quien traiga el secreto interno. En producción, además, vive en una red privada.
import { createServer } from "node:http";
import { createHash, timingSafeEqual } from "node:crypto";
import { json, leerCuerpo } from "./http.mjs";

const hash = (t) => createHash("sha256").update(String(t)).digest();

export function crearBackend({ config, politicas, tienda }) {
  const esperado = hash(config.secretoInterno);

  return createServer(async (req, res) => {
    if (!timingSafeEqual(hash(req.headers["x-interno"] ?? ""), esperado)) {
      return json(res, 403, { error: "solo red interna" });
    }
    const url = new URL(req.url, "http://interno");
    const ruta = url.pathname;
    const identidad = { clienteId: req.headers["x-cliente-id"], rol: req.headers["x-rol"] };
    const d = tienda.datos;

    // Permiso fino: esta factura, ¿es de quien la pide? Lo decide el dueño del dato, no el gateway.
    const puedeVer = (f) => !politicas.autorizacion || identidad.rol === "admin" || f.clienteId === identidad.clienteId;

    let m;
    if (req.method === "GET" && (m = ruta.match(/^\/interno\/v1\/clientes\/(\d+)\/facturas$/))) {
      if (politicas.listadoV2) return json(res, 410, { error: "v1 retirada" });
      return json(res, 200, { facturas: d.facturas.filter((f) => f.clienteId === m[1]) });
    }
    if (req.method === "GET" && ruta === "/interno/v2/comprobantes") {
      const cliente = url.searchParams.get("cliente");
      const comprobantes = d.facturas
        .filter((f) => f.clienteId === cliente)
        .map((f) => ({ codigo: f.id, total_centimos: Math.round(f.total * 100), situacion: f.estado, costo_interno: f.costo_interno }));
      return json(res, 200, { comprobantes });
    }
    if (req.method === "GET" && (m = ruta.match(/^\/interno\/v1\/facturas\/(F-\d{4})$/))) {
      const f = d.facturas.find((x) => x.id === m[1]);
      if (!f) return json(res, 404, { error: "no existe" });
      if (!puedeVer(f)) return json(res, 403, { error: "no es tuya" });
      return json(res, 200, { factura: f });
    }
    if (req.method === "POST" && (m = ruta.match(/^\/interno\/v1\/facturas\/(F-\d{4})\/pagos$/))) {
      await leerCuerpo(req, config.cuerpoMaxBytes);
      const f = d.facturas.find((x) => x.id === m[1]);
      if (!f) return json(res, 404, { error: "no existe" });
      if (!puedeVer(f)) return json(res, 403, { error: "no es tuya" });
      if (f.estado === "pagada") return json(res, 409, { error: "ya pagada" });
      f.estado = "pagada";
      const pago = { factura: f.id, monto: f.total, moneda: f.moneda }; // el monto sale de la base, no del cliente
      d.pagos.push(pago);
      return json(res, 200, { pago, factura: f });
    }
    if (req.method === "GET" && ruta === "/interno/v1/admin/ventas") {
      if (politicas.autorizacion && identidad.rol !== "admin") return json(res, 403, { error: "solo admin" });
      const total = d.facturas.reduce((s, f) => s + f.total, 0);
      return json(res, 200, { ventas_total: total, facturas: d.facturas.length, margen_promedio_pct: 29.5 });
    }
    return json(res, 404, { error: "no existe" });
  });
}
