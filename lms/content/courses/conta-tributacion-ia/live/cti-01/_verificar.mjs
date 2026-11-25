// Verificador de la sesión LIVE (estructura + consistencia básica)
// Basado en verificadores de otros cursos.

import fs from "node:fs";
import path from "node:path";

function leer(p) { return fs.readFileSync(p, "utf8"); }
function existe(p) { try { fs.accessSync(p); return true; } catch { return false; } }

function parseYAMLMin(txt) {
  // YAML mínimo (clave: valor + listas simples) suficiente para escena.yaml.
  // Evita dependencias.
  const out = {};
  const lines = txt.split(/\r?\n/);
  let k = null;
  for (const ln of lines) {
    if (!ln.trim() || ln.trim().startsWith("#")) continue;
    const m = ln.match(/^([A-Za-z0-9_\-]+):\s*(.*)$/);
    if (m) {
      k = m[1];
      const v = m[2];
      if (v === "") out[k] = [];
      else if (v === "true" || v === "false") out[k] = v === "true";
      else if (/^-?\d+(\.\d+)?$/.test(v)) out[k] = Number(v);
      else out[k] = v;
      continue;
    }
    const li = ln.match(/^\s*-\s*(.*)$/);
    if (li && k) {
      if (!Array.isArray(out[k])) out[k] = [];
      out[k].push(li[1]);
    }
  }
  return out;
}

function main() {
  const sesDir = path.dirname(new URL(import.meta.url).pathname);
  const courseDir = path.resolve(sesDir, "..", "..");
  const lessonPath = path.resolve(courseDir, "lessons", "cti-01-registros-ventas-compras.md");

  if (!existe(lessonPath)) throw new Error("No existe la lección: " + lessonPath);

  const escenas = fs.readdirSync(sesDir, { withFileTypes: true })
    .filter(d => d.isDirectory() && !d.name.startsWith("_"))
    .map(d => d.name)
    .sort();

  const errs = [];
  const mins = [];
  for (const e of escenas) {
    const dir = path.join(sesDir, e);
    const y = path.join(dir, "escena.yaml");
    const h = path.join(dir, "escena.html");
    if (!existe(y)) errs.push(`Falta escena.yaml: ${e}`);
    if (!existe(h)) errs.push(`Falta escena.html: ${e}`);
    if (existe(h)) {
      const html = leer(h);
      if (/https?:\/\//i.test(html)) errs.push(`No debe haber http(s):// en ${e}/escena.html`);
      const tags = (html.match(/<\/?[a-zA-Z][^>]*>/g) || []).length;
      if (tags > 300) errs.push(`Más de 300 etiquetas HTML (${tags}) en ${e}/escena.html`);
    }
    if (existe(y)) {
      const obj = parseYAMLMin(leer(y));
      if (!obj.id) errs.push(`Sin id en ${e}/escena.yaml`);
      if (!obj.titulo) errs.push(`Sin titulo en ${e}/escena.yaml`);
      if (!obj.fase) errs.push(`Sin fase en ${e}/escena.yaml`);
      if (typeof obj.duracion_min !== "number") errs.push(`Sin duracion_min numérica en ${e}/escena.yaml`);
      if (typeof obj.duracion_min === "number") mins.push(obj.duracion_min);
      if (obj.dsh && (!obj.comandos || !Array.isArray(obj.comandos) || obj.comandos.length === 0)) {
        errs.push(`dsh=true pero sin comandos en ${e}/escena.yaml`);
      }
    }
  }

  const total = mins.reduce((a, b) => a + b, 0);
  if (total > 90) errs.push(`Duración total ${total} min (debe ser <= 90)`);

  if (errs.length) {
    console.error("\nERRORES:\n" + errs.map(x => "- " + x).join("\n") + "\n");
    process.exit(1);
  }
  console.log(`OK cti-01 · escenas=${escenas.length} · minutos=${total}`);
}

main();
