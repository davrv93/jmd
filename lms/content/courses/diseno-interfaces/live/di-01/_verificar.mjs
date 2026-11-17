#!/usr/bin/env node
// Verifica las escenas LIVE de di-01 (Node, sin dependencias):
//   node lms/content/courses/diseno-interfaces/live/di-01/_verificar.mjs
// Viene de bot-whatsapp-avanzado-2/live/bwb-01/_verificar.mjs, con lo que este curso necesita además:
// - escena.yaml: campos obligatorios, id = carpeta, fase válida y el paso en el ciclo de la lección (o "");
// - escena.html: sin http:// ni https://, menos de 300 etiquetas y de 1 MB, con su hoja base (escena.css,
//   teoria.css o el motor Arena), con prefers-reduced-motion y con las etiquetas bien cerradas;
// - los ../../comun/<archivo> que pide existen en _comun, y _comun no tiene subcarpetas (no se sirven);
// - en la carpeta de la escena solo hay archivos .js .mjs .json .png .webp .svg .woff2 además de yaml y html;
// - la suma de duracion_min cabe en los 90 minutos de la sesión.
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { dirname, join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const aqui = dirname(fileURLToPath(import.meta.url));
const comun = join(aqui, "..", "_comun");
const leccion = join(aqui, "..", "..", "lessons", "01-fundamentos-visuales.md");
const FASES = ["experiencia", "reflexion", "conceptualizacion", "experimentacion"];
const OBLIG = ["id", "titulo", "fase", "paso", "duracion_min", "lo_logre", "evidencia", "compuerta"];
const HERMANOS = [".js", ".mjs", ".json", ".png", ".webp", ".svg", ".woff2"];
const VACIAS = new Set(["meta", "link", "input", "br", "img", "hr", "source", "area", "col", "embed", "wbr", "track", "param"]);
const MINUTOS = 90;
let fallos = 0, minutos = 0;

const md = readFileSync(leccion, "utf8");
const ciclo = [...md.split(/^---$/m)[1].matchAll(/^\s+- id: ([a-z0-9-]+)$/gm)].map((m) => m[1]);
if (!/^published: true$/m.test(md)) { console.log("✗ la lección no tiene published: true"); fallos++; }

function yamlPlano(txt) { // claves de primer nivel «clave: valor»; las listas (comandos) solo se detectan
  const out = {};
  for (const linea of txt.split("\n")) { const m = /^([a-z_]+):\s*(.*)$/.exec(linea); if (m) out[m[1]] = m[2].replace(/^"(.*)"$/, "$1"); }
  return out;
}
function balance(html) { // pila de etiquetas, sin contar el contenido de <script> y <style>
  const limpio = html.replace(/<!--[\s\S]*?-->/g, "").replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "<$1></$1>");
  const pila = [], re = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*?(\/?)>/g;
  let m;
  while ((m = re.exec(limpio))) {
    const [, cierra, nombre, auto] = m, t = nombre.toLowerCase();
    if (VACIAS.has(t) || auto) continue;
    if (!cierra) { pila.push(t); continue; }
    if (pila[pila.length - 1] !== t) return `</${t}> no cierra <${pila[pila.length - 1] || "nada"}>`;
    pila.pop();
  }
  return pila.length ? `quedan abiertas: ${pila.slice(-3).join(", ")}` : "";
}

if (existsSync(comun)) {
  for (const f of readdirSync(comun)) if (statSync(join(comun, f)).isDirectory()) { console.log(`✗ _comun/${f}: las subcarpetas de _comun no se sirven`); fallos++; }
}

const carpetas = readdirSync(aqui).filter((d) => !d.startsWith("_") && statSync(join(aqui, d)).isDirectory()).sort();
for (const d of carpetas) {
  const errores = [];
  const ry = join(aqui, d, "escena.yaml"), rh = join(aqui, d, "escena.html");
  if (!/^[0-9]{2}[a-z]?-[a-z0-9]+(-[a-z0-9]+)*$/.test(d)) errores.push("la carpeta no sigue NN[b]-nombre");
  if (!existsSync(ry)) errores.push("falta escena.yaml");
  if (!existsSync(rh)) errores.push("falta escena.html");
  let y = {};
  if (existsSync(ry)) {
    const txt = readFileSync(ry, "utf8");
    y = yamlPlano(txt);
    for (const k of OBLIG) if (!(k in y)) errores.push(`yaml sin «${k}»`);
    if (y.id && y.id !== d) errores.push(`yaml id «${y.id}» ≠ carpeta`);
    if (y.fase && !FASES.includes(y.fase)) errores.push(`fase «${y.fase}» no es una de las cuatro`);
    if ("paso" in y && y.paso !== "" && y.paso !== '""' && !ciclo.includes(y.paso)) errores.push(`paso «${y.paso}» no está en el ciclo (${ciclo.join(", ")})`);
    if (!(Number(y.duracion_min) > 0)) errores.push("duracion_min no es un número positivo");
    if (y.lo_logre && !["true", "false"].includes(y.lo_logre)) errores.push("lo_logre debe ser true o false");
    if (y.dsh === "true" && !/^comandos:/m.test(txt)) errores.push("dsh: true sin comandos");
    minutos += Number(y.duracion_min) || 0;
  }
  for (const f of readdirSync(join(aqui, d))) {
    if (f === "escena.yaml" || f === "escena.html") continue;
    if (!HERMANOS.includes(extname(f).toLowerCase())) errores.push(`archivo hermano no permitido: ${f}`);
  }
  let resumen = "";
  if (existsSync(rh)) {
    const html = readFileSync(rh, "utf8");
    const bytes = Buffer.byteLength(html, "utf8");
    const elementos = (html.match(/<[a-zA-Z][^\s>/]*/g) || []).length;
    const externos = html.match(/https?:\/\/[^\s"'<)]+/g) || [];
    if (externos.length) errores.push(`URL con http(s) en el html: ${[...new Set(externos)].join(", ")}`);
    if (elementos >= 300) errores.push(`${elementos} elementos (≥ 300)`);
    if (bytes >= 1024 * 1024) errores.push(`${bytes} bytes (≥ 1 MB)`);
    if (!/href="\.\.\/\.\.\/comun\/(escena|teoria)\.css"|src="\.\.\/\.\.\/arena\/arena-jmd\.js"/.test(html)) errores.push("no enlaza escena.css, teoria.css ni el motor Arena");
    if (!html.includes("prefers-reduced-motion")) errores.push("sin prefers-reduced-motion");
    for (const m of html.matchAll(/\.\.\/\.\.\/comun\/([^"'\s)]+)/g)) if (!existsSync(join(comun, m[1]))) errores.push(`pide ../../comun/${m[1]} y no existe`);
    const b = balance(html); if (b) errores.push(`etiquetas: ${b}`);
    resumen = `${elementos} etiquetas · ${(bytes / 1024).toFixed(1)} KB`;
  }
  if (errores.length) { fallos++; console.log(`✗ ${d}: ${errores.join("; ")}`); }
  else console.log(`✓ ${d} · ${y.fase} · paso ${y.paso || '""'} · ${y.duracion_min} min · ${resumen}`);
}
if (minutos > MINUTOS) { fallos++; console.log(`✗ las escenas suman ${minutos} min (> ${MINUTOS})`); }
console.log(`${carpetas.length} escenas · ${minutos} de ${MINUTOS} min · ciclo: ${ciclo.join(", ")}`);
console.log(fallos ? `${fallos} con fallos` : "todo en verde");
process.exit(fallos ? 1 : 0);
