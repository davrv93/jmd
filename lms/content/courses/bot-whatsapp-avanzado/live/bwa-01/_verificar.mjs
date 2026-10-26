#!/usr/bin/env node
// Verifica las escenas de la clase extra bwa-01 (Node, sin dependencias):
//   node live/bwa-01/_verificar.mjs
// Para cada carpeta NN-nombre: escena.yaml con los campos obligatorios y una fase válida; escena.html sin
// http:// ni https://, menos de 300 elementos (se cuentan las etiquetas de apertura como aproximación),
// menos de 1 MB, con el enlace ../../comun/escena.css y con prefers-reduced-motion.
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const aqui = dirname(fileURLToPath(import.meta.url));
const FASES = ["experiencia", "reflexion", "conceptualizacion", "experimentacion"];
const OBLIG = ["id", "titulo", "fase", "paso", "duracion_min", "lo_logre", "evidencia", "compuerta"];
let fallos = 0;

function yamlPlano(txt) {
  // Lector mínimo: claves de primer nivel «clave: valor»; las listas (comandos) solo se detectan.
  const out = {};
  for (const linea of txt.split("\n")) {
    const m = /^([a-z_]+):\s*(.*)$/.exec(linea);
    if (m) out[m[1]] = m[2].replace(/^"(.*)"$/, "$1");
  }
  return out;
}

const carpetas = readdirSync(aqui).filter((d) => !d.startsWith("_") && statSync(join(aqui, d)).isDirectory()).sort();
for (const d of carpetas) {
  const errores = [];
  const ry = join(aqui, d, "escena.yaml"), rh = join(aqui, d, "escena.html");
  if (!existsSync(ry)) errores.push("falta escena.yaml");
  if (!existsSync(rh)) errores.push("falta escena.html");
  let y = {};
  if (existsSync(ry)) {
    y = yamlPlano(readFileSync(ry, "utf8"));
    for (const k of OBLIG) if (!(k in y)) errores.push(`yaml sin «${k}»`);
    if (y.id && y.id !== d) errores.push(`yaml id «${y.id}» ≠ carpeta`);
    if (y.fase && !FASES.includes(y.fase)) errores.push(`fase «${y.fase}» no es una de las cuatro`);
    if (y.duracion_min && !(Number(y.duracion_min) > 0)) errores.push("duracion_min no es un número positivo");
    if (y.lo_logre && !["true", "false"].includes(y.lo_logre)) errores.push("lo_logre debe ser true o false");
  }
  let resumen = "";
  if (existsSync(rh)) {
    const html = readFileSync(rh, "utf8");
    const bytes = Buffer.byteLength(html, "utf8");
    const elementos = (html.match(/<[a-zA-Z][^\s>/]*/g) || []).length;
    const externos = html.match(/https?:\/\/[^\s"'<)]+/g) || [];
    // El namespace de SVG en el JS (createElementNS) no es un recurso: se permite solo esa URL.
    const malos = externos.filter((u) => u !== "http://www.w3.org/2000/svg");
    if (malos.length) errores.push(`recursos externos: ${[...new Set(malos)].join(", ")}`);
    if (elementos >= 300) errores.push(`${elementos} elementos (≥ 300)`);
    if (bytes >= 1024 * 1024) errores.push(`${bytes} bytes (≥ 1 MB)`);
    if (!html.includes('href="../../comun/escena.css"')) errores.push("no enlaza ../../comun/escena.css");
    if (!html.includes("prefers-reduced-motion")) errores.push("sin prefers-reduced-motion");
    if (html.includes("<!--CIELO-->")) errores.push("marcador <!--CIELO--> sin sustituir");
    resumen = `${elementos} elementos · ${(bytes / 1024).toFixed(1)} KB`;
  }
  if (errores.length) { fallos++; console.log(`✗ ${d}: ${errores.join("; ")}`); }
  else console.log(`✓ ${d} · ${y.fase} · ${y.duracion_min} min · ${resumen}`);
}
console.log(fallos ? `${fallos} escena(s) con fallos` : `${carpetas.length} escenas en verde`);
process.exit(fallos ? 1 : 0);
