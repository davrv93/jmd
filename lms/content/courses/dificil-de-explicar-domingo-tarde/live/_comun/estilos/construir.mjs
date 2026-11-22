// construir.mjs · fuente única → archivos servibles
//   /opt/homebrew/bin/node live/_comun/estilos/construir.mjs
// 1) lee ../estilos-catalogo.json y fotos-origen.json (metadatos de las fotos);
// 2) completa `fotos` de cada pack (rubros del pack, primero las del tono del pack);
// 3) verifica el contraste AA de cada paleta (falla si alguna no cumple);
// 4) escribe ../estilos.css (@font-face, variables por pack y utilidades editoriales);
// 5) embebe el catálogo en ../estilos-clasificar.js (entre CATALOGO:INICIO y CATALOGO:FIN).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const COMUN = path.dirname(AQUI);
const rutaCat = path.join(COMUN, 'estilos-catalogo.json');
const rutaJs = path.join(COMUN, 'estilos-clasificar.js');
const cat = JSON.parse(fs.readFileSync(rutaCat, 'utf8'));
const fotos = JSON.parse(fs.readFileSync(path.join(AQUI, 'fotos-origen.json'), 'utf8'));
const E = await import(pathToFileURL(rutaJs).href + '?v=' + Date.now());

// ── fotos: nombres planos (est-foto-<rubro>-NN.webp) y metadatos en el catálogo
cat.fotos = fotos.map((f) => ({ ...f, archivo: 'est-foto-' + path.basename(f.archivo) }));
for (const f of cat.fotos) if (!fs.existsSync(path.join(COMUN, f.archivo))) throw new Error('falta ' + f.archivo);
for (const p of cat.packs) {
  // las fotos con una marca ajena legible (marca_visible) quedan en la biblioteca pero no se sugieren
  const propias = cat.fotos.filter((f) => p.fotos_rubros.includes(f.rubro) && !f.marca_visible);
  const peso = (f) => (f.tono === p.tono ? 0 : f.tono === 'medio' ? 1 : 2) + p.fotos_rubros.indexOf(f.rubro) * 0.5;
  p.fotos = propias.sort((a, b) => peso(a) - peso(b) || a.archivo.localeCompare(b.archivo)).map((f) => f.archivo);
  // la portada (elegida a ojo, dirección de arte) va primero
  if (p.portada) { if (!fs.existsSync(path.join(COMUN, p.portada))) throw new Error('falta portada ' + p.portada); p.fotos = [p.portada, ...p.fotos.filter((f) => f !== p.portada)]; }
  p.fotos = p.fotos.slice(0, 6);
}

// ── contraste
let fallos = 0;
console.log('pack'.padEnd(20), 'txt/fon', 'txt/sup', 'suave', 'acento', 'sobreAc', 'sobreSec');
for (const p of cat.packs) {
  const v = E.verificarPaleta(p.paleta);
  p.contraste = v;
  if (!v.ok) fallos++;
  console.log(p.id.padEnd(20), [v.texto_fondo, v.texto_superficie, v.texto_suave_fondo, v.acento_fondo, v.sobre_acento, v.sobre_secundario].map((x) => String(x).padStart(6)).join(' '), v.ok ? 'AA' : '✗ FALLA');
  // recursos referidos
  const archivos = [p.textura && p.textura.archivo, p.forma, ...p.iconos.lista.map((n) => E.icono(n, p))].filter(Boolean);
  for (const a of archivos) if (!fs.existsSync(path.join(COMUN, a))) { console.log('  falta archivo', a); fallos++; }
  for (const k of ['titular', 'texto', 'detalle']) if (p.tipos[k] && !cat.fuentes[p.tipos[k].familia]) { console.log('  fuente sin registrar', p.tipos[k].familia); fallos++; }
}
for (const [fam, lista] of Object.entries(cat.fuentes)) for (const d of lista) if (!fs.existsSync(path.join(COMUN, d.archivo))) { console.log('falta fuente', fam, d.archivo); fallos++; }
if (fallos) { console.error(`\n${fallos} problema(s): corrige estilos-catalogo.json`); process.exit(1); }

// ── estilos.css
const decl = (obj) => Object.entries(obj).map(([k, v]) => `  ${k}: ${v};`).join('\n');
let css = `/* estilos.css · Taller de diseño (JMD Learning)
   GENERADO por estilos/construir.mjs desde estilos-catalogo.json: no lo edites a mano.
   Uso: <html data-pack="lujo-noir-dorado"> o cualquier elemento con data-pack, y las clases .e-*.
   En las escenas LIVE la CSP no deja @font-face con url(): carga las fuentes con
   cargarFuentes(pack) de estilos-clasificar.js (fetch + FontFace). Fuera del LIVE, @font-face basta. */

`;
for (const [fam, lista] of Object.entries(cat.fuentes)) {
  for (const d of lista) css += `@font-face { font-family: '${fam}'; src: url("${d.archivo}") format("woff2"); font-weight: ${d.weight}; font-style: ${d.style}; font-display: swap; }\n`;
}
const defecto = cat.packs.find((p) => p.id === 'minimal-galeria') || cat.packs[0];
css += `\n:root {\n${decl(E.variablesCSS(defecto, cat))}\n}\n`;
for (const p of cat.packs) css += `\n[data-pack="${p.id}"] {\n${decl(E.variablesCSS(p, cat))}\n}\n`;
css += `
/* ── utilidades editoriales ── */
.e-lienzo { position: relative; isolation: isolate; background: var(--e-fondo); color: var(--e-texto); font-family: var(--e-f-texto); font-weight: var(--e-texto-peso); line-height: var(--e-texto-interlineado); -webkit-font-smoothing: antialiased; }
.e-lienzo::before { content: ""; position: absolute; inset: 0; z-index: -1; pointer-events: none; background-image: var(--e-textura); background-size: 720px; mix-blend-mode: var(--e-textura-mezcla); opacity: var(--e-textura-opacidad); }
.e-grano::after { content: ""; position: absolute; inset: 0; pointer-events: none; z-index: 5; background-image: url("est-forma-grano.svg"); background-size: 240px; opacity: var(--e-grano); mix-blend-mode: multiply; }
[data-tono="oscuro"] .e-grano::after, .e-grano[data-tono="oscuro"]::after { mix-blend-mode: screen; filter: invert(1); }

.e-titular { font-family: var(--e-f-titular); font-weight: var(--e-titular-peso); font-style: var(--e-titular-estilo); letter-spacing: var(--e-titular-tracking); text-transform: var(--e-titular-caja); line-height: var(--e-titular-interlineado); text-wrap: balance; font-size: calc(1rem * var(--e-razon) * var(--e-razon) * var(--e-razon)); margin: 0; font-optical-sizing: auto; }
.e-display { font-family: var(--e-f-titular); font-weight: var(--e-titular-peso); font-style: var(--e-titular-estilo); letter-spacing: var(--e-titular-tracking); text-transform: var(--e-titular-caja); line-height: var(--e-titular-interlineado); text-wrap: balance; font-size: clamp(3rem, 11vw, 10rem); margin: 0; }
.e-subtitulo { font-family: var(--e-f-titular); font-weight: var(--e-titular-peso); font-style: var(--e-titular-estilo); letter-spacing: var(--e-titular-tracking); line-height: 1.15; font-size: calc(1rem * var(--e-razon) * var(--e-razon)); margin: 0; text-wrap: balance; }
.e-texto { font-family: var(--e-f-texto); font-weight: var(--e-texto-peso); line-height: var(--e-texto-interlineado); color: var(--e-texto-suave); max-width: 60ch; text-wrap: pretty; }
.e-detalle { font-family: var(--e-f-detalle); font-weight: var(--e-detalle-peso); font-style: var(--e-detalle-estilo); letter-spacing: var(--e-detalle-tracking); text-transform: var(--e-detalle-caja); font-size: .8rem; }
.e-cifra { font-family: var(--e-f-titular); font-variant-numeric: tabular-nums lining-nums; font-weight: var(--e-titular-peso); letter-spacing: -.01em; }

.e-boton { display: inline-flex; align-items: center; gap: .55em; padding: .85em 1.5em; border: 0; border-radius: min(var(--e-radio), 999px); background: var(--e-acento); color: var(--e-sobre-acento); font: 600 .95rem/1 var(--e-f-texto); letter-spacing: .02em; text-decoration: none; cursor: pointer; transition: transform .2s ease, filter .2s ease; }
.e-boton:hover { transform: translateY(-1px); filter: brightness(1.06); }
.e-boton:focus-visible { outline: 2px solid var(--e-texto); outline-offset: 3px; }
.e-banda { background: var(--e-secundario); color: var(--e-sobre-secundario); }
.e-tarjeta { background: var(--e-superficie); border-radius: var(--e-radio); box-shadow: var(--e-sombra); }
.e-foto { display: block; width: 100%; height: 100%; object-fit: cover; border-radius: var(--e-radio); }
.e-filete { border: 1px solid color-mix(in srgb, var(--e-texto) 22%, transparent); }
.e-regla { height: 1px; border: 0; background: color-mix(in srgb, var(--e-texto) 22%, transparent); margin: 0; }
.e-acento { color: var(--e-acento); }
.e-sombra-suave { box-shadow: 0 1px 2px rgb(0 0 0 / .06), 0 24px 48px -28px rgb(0 0 0 / .35); }
.e-icono { width: 1.25em; height: 1.25em; display: inline-block; vertical-align: -.2em; background: currentColor; -webkit-mask: var(--e-icono) center / contain no-repeat; mask: var(--e-icono) center / contain no-repeat; }
`;
fs.writeFileSync(path.join(COMUN, 'estilos.css'), css);

// ── catálogo embebido y JSON con los campos calculados
fs.writeFileSync(rutaCat, JSON.stringify(cat, null, 2) + '\n');
const js = fs.readFileSync(rutaJs, 'utf8');
const nuevo = js.replace(/\/\* CATALOGO:INICIO \*\/[\s\S]*?\/\* CATALOGO:FIN \*\//, `/* CATALOGO:INICIO */\nexport const CATALOGO = ${JSON.stringify(cat)};\n/* CATALOGO:FIN */`);
if (nuevo === js && !js.includes('CATALOGO:INICIO')) throw new Error('no encontré las marcas del catálogo');
fs.writeFileSync(rutaJs, nuevo);
console.log(`\nOK · ${cat.packs.length} packs · ${cat.fotos.length} fotos · estilos.css ${(css.length / 1024).toFixed(1)} KB · clasificar ${(nuevo.length / 1024).toFixed(1)} KB`);
