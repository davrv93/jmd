#!/usr/bin/env node
/*
 * es5.mjs · Comprueba que lo que se entrega en dist/ sea compatible con IE11
 * ----------------------------------------------------------------------------
 *   node pruebas/es5.mjs            revisa todos los dist/<id>/
 *   node pruebas/es5.mjs --solo id  revisa uno
 * Revisa tres cosas y sale con código distinto de 0 si algo falla:
 *   1. Todo .js se analiza con acorn en ecmaVersion 5 (sin let, const, =>, plantillas, clases…).
 *   2. Ningún .js usa las APIs que no existen en IE11 (lista del contrato y algunas más),
 *      ni red, ni diálogos nativos, ni innerHTML.
 *   3. El CSS no usa var(), display: grid ni gap.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ACORN = '/Users/david.roncal/Documents/jmd/lms/web/node_modules/acorn/dist/acorn.mjs';
const acorn = await import(ACORN);

const solo = process.argv.includes('--solo') ? process.argv[process.argv.indexOf('--solo') + 1] : null;

/* [expresión regular, explicación] — se aplica al código sin comentarios */
const PROHIBIDAS = [
  [/\bObject\.assign\b/, 'Object.assign (usa U.asignar)'],
  [/\bObject\.(values|entries|fromEntries)\b/, 'Object.values/entries/fromEntries no existen en IE11'],
  [/\bArray\.from\b/, 'Array.from'],
  [/\bArray\.of\b/, 'Array.of'],
  [/\.(find|findIndex|includes|fill|flat|flatMap|copyWithin)\s*\(/, 'Array/String.prototype.find/findIndex/includes/fill/flat (usa U.buscar, U.posicion, U.incluye)'],
  [/\.(startsWith|endsWith|repeat|padStart|padEnd|trimStart|trimEnd|codePointAt|normalize)\s*\(/, 'String.prototype.startsWith/endsWith/repeat/padStart/padEnd/normalize (usa U.empiezaCon, U.terminaCon, U.repetir, U.relleno, U.sinTildes)'],
  [/\bNumber\.(isInteger|isNaN|isFinite|isSafeInteger|parseFloat|parseInt|EPSILON)\b/, 'Number.isInteger/isNaN/isFinite/EPSILON…'],
  [/\bMath\.(trunc|sign|log10|log2|cbrt|hypot|fround)\b/, 'Math.trunc/sign/log10…'],
  [/\.closest\s*\(/, 'Element.closest (usa U.ancestro)'],
  [/\.matches\s*\(/, 'Element.matches sin prefijo'],
  [/\.remove\s*\(\s*\)/, 'Element.remove() (usa U.quitar)'],
  [/\.(append|prepend|replaceWith|before|after)\s*\(/, 'ParentNode.append/prepend/replaceWith/before/after'],
  [/\.classList\b/, 'classList (no existe en SVG de IE11; usa U.agregarClase/U.quitarClase)'],
  [/(querySelectorAll\s*\([^)]*\)|childNodes|\.children|getElementsBy\w+\s*\([^)]*\))\s*\.forEach\b/, 'NodeList.forEach'],
  [/\bnew\s+(Map|Set|WeakMap|WeakSet|Promise|Proxy)\b/, 'Map/Set/WeakMap/Promise'],
  [/\b(Promise|Symbol|Reflect)\b/, 'Promise/Symbol/Reflect'],
  [/\b(new\s+)?(CustomEvent|Event)\s*\(\s*['"]/, 'constructor de Event/CustomEvent (IE11 no lo trae)'],
  [/\bTextEncoder|TextDecoder|URLSearchParams|IntersectionObserver|ResizeObserver\b/, 'APIs modernas ausentes en IE11'],
  [/\bfetch\s*\(/, 'fetch (no hay red)'],
  [/\bXMLHttpRequest\b|\bWebSocket\b|\bnavigator\.sendBeacon\b/, 'acceso a la red'],
  [/\bnew\s+Worker\b|\bServiceWorker\b|\bimportScripts\b/, 'Web Workers'],
  [/\bimport\s*\(|^\s*import\s|^\s*export\s/m, 'módulos ES'],
  [/\beval\s*\(|\bnew\s+Function\s*\(/, 'eval / new Function'],
  [/(^|[^\w.$])(alert|confirm|prompt)\s*\(/, 'diálogo nativo alert/confirm/prompt (usa UI.aviso/UI.confirmar/UI.pedirTexto)'],
  [/\.innerHTML\b|\.outerHTML\b|\binsertAdjacentHTML\b|\bdocument\.write\b/, 'innerHTML/outerHTML/document.write (se construye con createElement/textContent)'],
  [/\.setAttribute\(\s*['"]style['"]/, 'style por atributo (la CSP lo bloquea; usa element.style.x)'],
  [/\bperformance\.now\b.*\bperformance\.now\b/, ''],
  [/\bnew\s+Intl\./, 'Intl no es fiable en IE11'],
  [/\.toLocale(String|DateString|TimeString)\s*\(/, 'toLocale*String (formato distinto en cada navegador; usa U.fmt)']
].filter((p) => p[1]);

let fallos = 0;
const avisar = (arch, msg) => { fallos++; console.error(`  ✗ ${arch}: ${msg}`); };

function quitarComentarios(codigo, comentarios) {
  let salida = codigo.split('');
  comentarios.forEach((c) => { for (let i = c.start; i < c.end; i++) { if (salida[i] !== '\n') { salida[i] = ' '; } } });
  return salida.join('');
}

function revisarJs(archivo, rel) {
  const codigo = fs.readFileSync(archivo, 'utf8');
  const comentarios = [];
  try {
    acorn.parse(codigo, { ecmaVersion: 5, sourceType: 'script', allowHashBang: false, onComment: (bloque, texto, start, end) => comentarios.push({ start, end }) });
  } catch (e) {
    avisar(rel, `no es ES5 válido: ${e.message}`);
    return;
  }
  const limpio = quitarComentarios(codigo, comentarios);
  limpio.split('\n').forEach((linea, i) => {
    PROHIBIDAS.forEach(([re, msg]) => {
      if (re.test(linea)) { avisar(`${rel}:${i + 1}`, `${msg} → ${linea.trim().slice(0, 100)}`); }
    });
  });
}

function revisarCss(archivo, rel) {
  const codigo = fs.readFileSync(archivo, 'utf8').replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
  const reglas = [
    [/\bvar\s*\(/, 'variables CSS var()'],
    [/display\s*:\s*(inline-)?grid\b/, 'display: grid'],
    [/(^|[\s;{])(grid-[a-z-]+|grid)\s*:/, 'propiedades grid'],
    [/(^|[\s;{])((row|column|grid)-)?gap\s*:/, 'gap'],
    [/position\s*:\s*sticky/, 'position: sticky'],
    [/:(is|where|has)\s*\(/, 'selectores :is/:where/:has'],
    [/@supports\b/, '@supports'],
    [/--[a-z][\w-]*\s*:/, 'propiedades personalizadas --x']
  ];
  codigo.split('\n').forEach((linea, i) => reglas.forEach(([re, msg]) => { if (re.test(linea)) { avisar(`${rel}:${i + 1}`, `${msg} → ${linea.trim().slice(0, 100)}`); } }));
}

const dist = path.join(RAIZ, 'dist');
if (!fs.existsSync(dist)) { console.error('No existe dist/: ejecuta antes node construir.mjs'); process.exit(2); }
const sistemas = fs.readdirSync(dist, { withFileTypes: true }).filter((d) => d.isDirectory() && (!solo || d.name === solo)).map((d) => d.name).sort();
if (!sistemas.length) { console.error('No hay sistemas construidos en dist/'); process.exit(2); }

let archivos = 0;
sistemas.forEach((id) => {
  const base = path.join(dist, id);
  (function recorrer(dir) {
    fs.readdirSync(dir, { withFileTypes: true }).forEach((d) => {
      const p = path.join(dir, d.name);
      if (d.isDirectory()) { recorrer(p); return; }
      const rel = path.relative(RAIZ, p);
      if (d.name.endsWith('.js')) { archivos++; revisarJs(p, rel); }
      else if (d.name.endsWith('.css')) { archivos++; revisarCss(p, rel); }
    });
  })(base);
  console.log(`· ${id} revisado`);
});

if (fallos) { console.error(`\n✗ es5.mjs: ${fallos} problema(s) en ${archivos} archivos`); process.exit(1); }
console.log(`✓ es5.mjs: ${archivos} archivos de ${sistemas.length} sistema(s) sin problemas (acorn ES5 + APIs prohibidas + CSS)`);
