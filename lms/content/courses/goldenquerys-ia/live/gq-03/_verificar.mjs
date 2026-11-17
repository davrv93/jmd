#!/usr/bin/env node
// Verifica las escenas de la sesión 2 de GoldenQuerys (gq-03), Node sin dependencias:
//   node lms/content/courses/goldenquerys-ia/live/gq-03/_verificar.mjs
// Por escena: escena.yaml con los campos obligatorios, id = carpeta, fase válida y paso del ciclo de la lección;
// escena.html sin «http://» ni «https://», menos de 300 elementos (etiquetas de apertura) y de 1 MB, con
// ../../comun/escena.css y prefers-reduced-motion; solo archivos hermanos .js .mjs .json .png .webp .svg .woff2;
// todo lo que pide de ../../comun/ existe en _comun (sin subcarpetas).
// Y de la lección: las duraciones suman la duración de la sesión, está publicada, y los pedidos dicen lo mismo en
// la escena (_comun/gq3.js), en el panel de comandos (escena.yaml) y en lessons/gq-03-tablero-dinamico.md.
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { dirname, join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const aqui = dirname(fileURLToPath(import.meta.url));
const comun = join(aqui, "..", "_comun");
const leccionMd = join(aqui, "..", "..", "lessons", "gq-03-tablero-dinamico.md");
const FASES = ["experiencia", "reflexion", "conceptualizacion", "experimentacion"];
const OBLIG = ["id", "titulo", "fase", "paso", "duracion_min", "lo_logre", "evidencia", "compuerta"];
const HERMANOS = new Set([".js", ".mjs", ".json", ".png", ".webp", ".svg", ".woff2"]);
const PROHIBIDAS = [/principiantes/i, /ya pe\b/i];
let fallos = 0;
const mal = (q, m) => { fallos++; console.log(`✗ ${q}: ${m}`); };

function yamlPlano(txt) {
  const out = { cmds: [] };
  for (const linea of txt.split("\n")) {
    const m = /^([a-z_]+):\s*(.*)$/.exec(linea);
    if (m) out[m[1]] = m[2].replace(/^"(.*)"$/, "$1");
    const c = /^\s+cmd:\s*(".*")\s*$/.exec(linea);
    if (c) out.cmds.push(JSON.parse(c[1]));
  }
  return out;
}

// la lección: ciclo, duración y publicación
const md = readFileSync(leccionMd, "utf8");
const fm = md.split(/^---$/m)[1] || "";
const ciclo = [...(fm.split(/^cycle:\s*$/m)[1] || "").matchAll(/^\s+- id: ([a-z0-9-]+)$/gm)].map((m) => m[1]);
const duracion = Number((/^duration:\s*(\d+)/m.exec(fm) || [])[1]);
if (!/^published:\s*true\s*$/m.test(fm)) mal("lección", "no está publicada (published: true)");
if (!ciclo.length) mal("lección", "sin ciclo");

// los pedidos de la escena
const ctx = { window: {}, document: { readyState: "complete", querySelectorAll: () => [] } };
vm.createContext(ctx);
vm.runInContext(readFileSync(join(comun, "gq3.js"), "utf8"), ctx);
const PEDIDOS = ctx.window.GQ3.PEDIDOS;
const valores = new Set(Object.values(PEDIDOS));
const usadosYaml = new Set();

const carpetas = readdirSync(aqui).filter((d) => !d.startsWith("_") && statSync(join(aqui, d)).isDirectory()).sort();
let minutos = 0;
const pasosUsados = new Set();
for (const d of carpetas) {
  const errores = [];
  const ry = join(aqui, d, "escena.yaml"), rh = join(aqui, d, "escena.html");
  if (!existsSync(ry)) errores.push("falta escena.yaml");
  if (!existsSync(rh)) errores.push("falta escena.html");
  let y = { cmds: [] };
  if (existsSync(ry)) {
    const ty = readFileSync(ry, "utf8");
    y = yamlPlano(ty);
    for (const k of OBLIG) if (!(k in y)) errores.push(`yaml sin «${k}»`);
    if (y.id && y.id !== d) errores.push(`yaml id «${y.id}» ≠ carpeta`);
    if (!/^\d\d[a-z]?-[a-z0-9-]+$/.test(d)) errores.push("la carpeta no sigue NN[b]-nombre");
    if (y.fase && !FASES.includes(y.fase)) errores.push(`fase «${y.fase}» no es una de las cuatro`);
    if (y.paso && !ciclo.includes(y.paso)) errores.push(`paso «${y.paso}» no está en el ciclo`);
    if (y.paso) pasosUsados.add(y.paso);
    if (!(Number(y.duracion_min) > 0)) errores.push("duracion_min no es un número positivo");
    if (y.lo_logre && !["true", "false"].includes(y.lo_logre)) errores.push("lo_logre debe ser true o false");
    minutos += Number(y.duracion_min) || 0;
    for (const c of y.cmds) {
      if (c.startsWith("Retoma") || c.length > 160) { if (!valores.has(c)) errores.push(`pedido del yaml que no está en gq3.js: «${c.slice(0, 50)}…»`); else usadosYaml.add(c); }
      else if (valores.has(c)) usadosYaml.add(c);
    }
    for (const p of PROHIBIDAS) if (p.test(ty)) errores.push(`palabra prohibida ${p}`);
  }
  let resumen = "";
  if (existsSync(rh)) {
    const html = readFileSync(rh, "utf8");
    const bytes = Buffer.byteLength(html, "utf8");
    const elementos = (html.match(/<[a-zA-Z][^\s>/]*/g) || []).length;
    if (/https?:\/\//i.test(html)) errores.push(`contiene «http»: ${[...new Set(html.match(/https?:\/\/[^\s"'<)]+/gi))].join(", ")}`);
    if (elementos >= 300) errores.push(`${elementos} elementos (≥ 300)`);
    if (bytes >= 1024 * 1024) errores.push(`${bytes} bytes (≥ 1 MB)`);
    if (!html.includes('href="../../comun/escena.css"')) errores.push("no enlaza ../../comun/escena.css");
    if (!html.includes("prefers-reduced-motion")) errores.push("sin prefers-reduced-motion");
    for (const m of html.matchAll(/(?:src|href)="\.\.\/\.\.\/comun\/([^"]+)"/g)) {
      if (m[1].includes("/")) errores.push(`pide una subcarpeta de _comun: ${m[1]}`);
      else if (!existsSync(join(comun, m[1]))) errores.push(`no existe _comun/${m[1]}`);
    }
    for (const m of html.matchAll(/data-pedido(?:-copiar)?="([^"]+)"/g)) if (!(m[1] in PEDIDOS)) errores.push(`pedido desconocido «${m[1]}»`);
    for (const p of PROHIBIDAS) if (p.test(html)) errores.push(`palabra prohibida ${p}`);
    resumen = `${elementos} elementos · ${(bytes / 1024).toFixed(1)} KB`;
  }
  for (const f of readdirSync(join(aqui, d))) {
    if (f === "escena.yaml" || f === "escena.html") continue;
    if (statSync(join(aqui, d, f)).isDirectory()) errores.push(`subcarpeta ${f}`);
    else if (!HERMANOS.has(extname(f))) errores.push(`archivo hermano no permitido: ${f}`);
  }
  if (errores.length) mal(d, errores.join("; "));
  else console.log(`✓ ${d} · ${y.fase} · ${y.paso || "—"} · ${y.duracion_min} min · ${resumen}`);
}

// la lección y los pedidos, juntos
if (minutos !== duracion) mal("lección", `las escenas suman ${minutos} min y la sesión dura ${duracion}`);
for (const p of ciclo) if (!pasosUsados.has(p) && p !== "ver") mal("lección", `el paso «${p}» no tiene escena`);
for (const [k, v] of Object.entries(PEDIDOS)) {
  if (!usadosYaml.has(v)) mal("pedidos", `«${k}» no está en ningún escena.yaml`);
  if ((!k.startsWith("nuevo-") || k === "nuevo-botica") && !md.includes(v)) mal("pedidos", `«${k}» no está igual en la lección`);
}
for (const p of PROHIBIDAS) { if (p.test(md)) mal("lección", `palabra prohibida ${p}`); if (p.test(readFileSync(join(comun, "gq3.js"), "utf8"))) mal("gq3.js", `palabra prohibida ${p}`); }
console.log(`${carpetas.length} escenas · ${minutos} de ${duracion} min · ciclo: ${ciclo.join(", ")}`);
console.log(fallos ? `${fallos} problema(s)` : "todo en verde");
process.exit(fallos ? 1 : 0);
