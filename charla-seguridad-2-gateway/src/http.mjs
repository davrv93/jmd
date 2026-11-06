// Ayudas mínimas sobre node:http.
import { readFile } from "node:fs/promises";
import path from "node:path";

export class CuerpoGrande extends Error {}

export function leerCuerpo(req, maximo) {
  return new Promise((ok, mal) => {
    const trozos = [];
    let total = 0;
    req.on("data", (t) => {
      total += t.length;
      if (total > maximo) {
        req.removeAllListeners("data");
        req.resume();
        mal(new CuerpoGrande());
        return;
      }
      trozos.push(t);
    });
    req.on("end", () => ok(Buffer.concat(trozos).toString("utf8")));
    req.on("error", mal);
  });
}

export function json(res, status, cuerpo, cabeceras = {}) {
  const texto = JSON.stringify(cuerpo);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...cabeceras });
  res.end(texto);
}

const TIPOS = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8" };

// Sirve un archivo de una lista cerrada: la ruta del cliente nunca se convierte en ruta de disco.
export async function servirEstatico(res, carpeta, archivos, ruta, cabeceras = {}, transformar) {
  const nombre = archivos[ruta];
  if (!nombre) return false;
  let texto = await readFile(path.join(carpeta, nombre), "utf8");
  if (transformar) texto = transformar(texto, nombre);
  res.writeHead(200, {
    "Content-Type": TIPOS[path.extname(nombre)] || "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    ...cabeceras,
  });
  res.end(texto);
  return true;
}

export const escuchar = (servidor, puerto, host) =>
  new Promise((ok, mal) => {
    servidor.once("error", mal);
    servidor.listen(puerto, host, () => {
      servidor.off("error", mal);
      ok(servidor.address().port);
    });
  });
