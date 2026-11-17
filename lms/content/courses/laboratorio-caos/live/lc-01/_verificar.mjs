#!/usr/bin/env node
// Verifica las escenas de la sesión lc-01 (Laboratorio de caos · Suelta al monito). Node, sin dependencias:
//   node live/lc-01/_verificar.mjs
// Adaptado del de ds-01 (Documenta y audita sistemas). Para cada carpeta NN-nombre: escena.yaml con los campos
// obligatorios, id igual a la carpeta y una fase válida; escena.html sin http:// ni https:// (salvo el namespace
// de SVG), menos de 300 elementos y menos de 1 MB. Además:
//   · las láminas de teoría (enlazan ../../comun/teoria.css) deben tener tantos pasos en el script como <li> en
//     el relato, paso "" y compuerta «ninguna», y no usar «principiantes» ni «ya pe»;
//   · las demás escenas deben respetar prefers-reduced-motion (llevan sus estilos dentro, no escena.css);
//   · la suma de duracion_min no debe pasar de la duración de la lección (lessons/lc-01-*.md).
// La carpeta 02-arena es el juego: tiene su propio motor y la edita otra sesión. De ella solo se lee el yaml
// (para sumar minutos) y lo que se encuentre sale como aviso, nunca como fallo.
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const aqui = dirname(fileURLToPath(import.meta.url));
const FASES = ["experiencia", "reflexion", "conceptualizacion", "experimentacion"];
const OBLIG = ["id", "titulo", "fase", "duracion_min", "lo_logre", "evidencia", "compuerta"];
const AJENAS = ["02-arena"];
let fallos = 0, minutos = 0;

function yamlPlano(txt) {
  // Lector mínimo: claves de primer nivel «clave: valor».
  const out = {};
  for (const linea of txt.split("\n")) {
    const m = /^([a-z_]+):\s*(.*)$/.exec(linea);
    if (m) out[m[1]] = m[2].replace(/^"(.*)"$/, "$1");
  }
  return out;
}

const carpetas = readdirSync(aqui).filter((d) => !d.startsWith("_") && statSync(join(aqui, d)).isDirectory()).sort();
for (const d of carpetas) {
  const errores = [], ajena = AJENAS.includes(d);
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
    minutos += Number(y.duracion_min) || 0;
  }
  let resumen = "";
  if (existsSync(rh) && !ajena) {
    const html = readFileSync(rh, "utf8");
    const bytes = Buffer.byteLength(html, "utf8");
    const elementos = (html.match(/<[a-zA-Z][^\s>/]*/g) || []).length;
    const externos = html.match(/https?:\/\/[^\s"'<)]+/g) || [];
    // El namespace de SVG en el JS (createElementNS) no es un recurso: se permite solo esa URL.
    const malos = externos.filter((u) => u !== "http://www.w3.org/2000/svg");
    const teoria = html.includes("comun/teoria.css");
    if (malos.length) errores.push(`recursos externos: ${[...new Set(malos)].join(", ")}`);
    if (elementos >= 300) errores.push(`${elementos} elementos (≥ 300)`);
    if (bytes >= 1024 * 1024) errores.push(`${bytes} bytes (≥ 1 MB)`);
    if (teoria) {
      const relato = (/<aside class="teo-relato"[\s\S]*?<\/aside>/.exec(html) || [""])[0];
      const lis = (relato.match(/<li>/g) || []).length;
      const pasos = (html.match(/function \(tl\) \{/g) || []).length;
      if (!lis || lis !== pasos) errores.push(`relato con ${lis} pasos y script con ${pasos}`);
      if (!/class="teo-fuente">[^<]{20,}/.test(html)) errores.push("sin referencia al pie");
      if (/principiantes|\bya pe\b/i.test(html)) errores.push("usa «principiantes» o «ya pe»");
      if (y.paso !== "") errores.push('la teoría va con paso: ""');
      if (y.compuerta !== "ninguna") errores.push("la teoría va con compuerta: ninguna");
      resumen = `teoría · ${lis} pasos · `;
    } else if (!html.includes("prefers-reduced-motion")) errores.push("sin prefers-reduced-motion");
    resumen += `${elementos} elementos · ${(bytes / 1024).toFixed(1)} KB`;
  }
  if (ajena) {
    console.log(`·  ${d} (${y.duracion_min || "?"} min): no se revisa aquí, la edita otra sesión` + (errores.length ? ` · aviso: ${errores.join("; ")}` : ""));
  } else if (errores.length) {
    fallos += errores.length;
    console.log(`✗  ${d}: ${errores.join("; ")}`);
  } else console.log(`✓  ${d} (${y.duracion_min} min) · ${resumen}`);
}

// La suma de minutos contra la duración de la lección.
const dirLecciones = join(aqui, "..", "..", "lessons");
const md = readdirSync(dirLecciones).find((f) => f.startsWith("lc-01"));
const duracion = md ? Number((/^duration:\s*(\d+)/m.exec(readFileSync(join(dirLecciones, md), "utf8")) || [])[1]) : 0;
if (duracion && minutos > duracion) { fallos++; console.log(`✗  las escenas suman ${minutos} min y la lección dura ${duracion}`); }
else console.log(`✓  las escenas suman ${minutos} min de ${duracion || "?"}`);

console.log(fallos ? `\n${fallos} fallo(s)` : `\nTodo en orden: ${carpetas.length} escenas`);
process.exit(fallos ? 1 : 0);
