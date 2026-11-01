#!/usr/bin/env node
// Verifica las escenas del taller qa-01 (Node, sin dependencias):
//   node live/qa-01/_verificar.mjs
// Para cada carpeta NN-nombre: escena.yaml con los campos obligatorios y una fase válida; escena.html sin
// http:// ni https://, menos de 300 elementos (se cuentan las etiquetas de apertura como aproximación),
// menos de 1 MB, con el enlace ../../comun/escena.css y con prefers-reduced-motion. El «paso» debe ser uno de los
// ids del ciclo de la lección (lessons/01-taller-qa.md) y las tareas, si las hay, llevan id y título.
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const aqui = dirname(fileURLToPath(import.meta.url));
const FASES = ["experiencia", "reflexion", "conceptualizacion", "experimentacion"];
const PASOS = ["ver", "casos", "pom", "pruebas", "motores", "portal", "monitoreo", "preguntar", "entregar"];
const OBLIG = ["id", "titulo", "fase", "paso", "duracion_min", "lo_logre", "evidencia", "compuerta"];
let fallos = 0;
const minutos = [0,0,0,0,0,0];
// Escenas de teoría de la primera versión (pedidas de vuelta el 01-11): tienen su propio diseño, sin la barra de
// bloque ni la guía lateral. Aquí se declara a qué bloque de la agenda suman sus minutos.
const TEORIA = { "03-piramide-y-casos": 1, "04-page-object-model": 1, "07-semillas-y-flaky": 2, "09-navegadores-sin-interfaz": 3, "16-monitoreo-sla": 5 };

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
  const numero = carpetas.indexOf(d) + 1;
  if (!d.startsWith(String(numero).padStart(2, '0') + '-')) errores.push('secuencia numerada con un salto');
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
    if (y.paso && !PASOS.includes(y.paso)) errores.push(`paso «${y.paso}» no es un id del ciclo`);
    if (y.umbral_pct && !(Number(y.umbral_pct) > 0 && Number(y.umbral_pct) <= 100)) errores.push("umbral_pct fuera de 1-100");
    const ry2 = readFileSync(ry, "utf8");
    for (const t of ry2.matchAll(/^\s*-\s*\{(.*)\}\s*$/gm)) if (!/id:\s*\S/.test(t[1]) || !/titulo:\s*\S/.test(t[1])) errores.push(`tarea sin id o título: ${t[1].trim()}`);
  }
  let resumen = "";
  if (existsSync(rh)) {
    const html = readFileSync(rh, "utf8");
    const bytes = Buffer.byteLength(html, "utf8");
    if (TEORIA[d]) {
      minutos[TEORIA[d]-1] += Number(y.duracion_min || 0);
      if (!html.includes('href="../../comun/escena.css"')) errores.push("no enlaza ../../comun/escena.css");
    } else {
      const bloque = /Bloque ([1-6])\/6 · (9:00|9:45|10:30|11:15|12:00|12:45)/.exec(html);
      if (!bloque) errores.push('falta barra de bloque y hora');
      else minutos[Number(bloque[1])-1] += Number(y.duracion_min || 0);
      for (const texto of ['Objetivo', 'Tu acción', 'Lo logré', 'Antes ·', 'Después ·', 'Experiencia', 'Reflexión', 'Concepto', 'Experimento']) {
        if (!html.includes(texto)) errores.push('falta «' + texto + '»');
      }
    }
    if (/__(SALIDAS|REPORTE|TRACE|PORTAL|LATENCIA)__/.test(html)) errores.push('datos de réplica sin completar');
    if (/window\.(alert|confirm|prompt)\s*\(/.test(html)) errores.push('diálogo nativo');
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
const agenda = [45,45,45,45,45,15];
if (minutos.some((n,i) => n !== agenda[i])) { fallos++; console.log('✗ Agenda: ' + minutos.join(', ') + ' min; se esperan 45,45,45,45,45,15'); }
console.log(fallos ? `${fallos} escena(s) con fallos` : `${carpetas.length} escenas en verde`);
process.exit(fallos ? 1 : 0);
