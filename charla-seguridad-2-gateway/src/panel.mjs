// PARTE 3 · Panel lado a lado. Solo atiende en 127.0.0.1 y solo a páginas servidas por él mismo.
import { createServer } from "node:http";
import path from "node:path";
import { json, servirEstatico } from "./http.mjs";
import { correrEscenario, listaEscenarios } from "./escenarios.mjs";
import { correrAuditoria } from "./auditoria.mjs";

export function crearPanel({ ctx, publico }) {
  return createServer(async (req, res) => {
    const ruta = new URL(req.url, "http://panel").pathname;
    const host = req.headers.host || "";
    if (!/^(127\.0\.0\.1|localhost):\d+$/.test(host)) return json(res, 403, { error: "solo localhost" });

    if (req.method === "GET") {
      if (await servirEstatico(res, path.join(publico, "panel"), { "/": "index.html", "/panel.js": "panel.js", "/estilo.css": "../comun.css" }, ruta)) return;
      if (ruta === "/api/escenarios") return json(res, 200, listaEscenarios());
      if (ruta === "/api/trafico") return json(res, 200, ctx.captura.ver());
      if (ruta === "/api/registro") return json(res, 200, ctx.registro.ver().slice(0, 40));
      if (ruta === "/api/enlaces") {
        const clave = encodeURIComponent(ctx.config.claveDemo);
        return json(res, 200, { directo: `${ctx.urls.directo}/#clave=${clave}`, gateway: `${ctx.urls.gateway}/#clave=${clave}` });
      }
    }
    if (req.method === "POST") {
      const origen = req.headers.origin;
      if (origen && origen !== `http://${host}`) return json(res, 403, { error: "origen no permitido" });
      if (ruta === "/api/reiniciar") {
        ctx.reiniciar();
        ctx.captura.limpiar();
        ctx.registro.limpiar();
        return json(res, 200, { ok: true });
      }
      if (ruta === "/api/auditoria") return json(res, 200, await correrAuditoria(ctx));
      const m = ruta.match(/^\/api\/escenario\/([a-z-]+)$/);
      if (m) {
        const r = await correrEscenario(ctx, m[1]).catch((e) => ({ error: e.message }));
        return r ? json(res, r.error ? 500 : 200, r) : json(res, 404, { error: "no existe" });
      }
    }
    return json(res, 404, { error: "no existe" });
  });
}
