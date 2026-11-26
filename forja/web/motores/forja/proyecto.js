// Forja · motores · cómo se arma un juego de los motores nuevos (anime, voxel) dentro del flujo de siempre:
// exportar.js llama a armarMotor() cuando meta.motor no es «phaser». El proyecto lleva:
//   index.html (importmap) · datos.js (window.DATOS) · juego.js (plantillas/<id>.js) · config.json
//   motores/…  (solo los módulos que juego.js importa, hallados siguiendo sus import; los Workers son .js aparte)
//   motor/sonido.js (la síntesis del estudio) · vendor/p5.min.js · vendor/anime.esm.min.js (+ licencia)
//   assets/heroe.png|json, enemigo.png|json (las hojas de sprites que el estudio ya hace con tu personaje)
// El ZIP y «Guardar en mi aula» usan estos mismos archivos; dentro del estudio se juega en el iframe srcdoc con los
// módulos servidos desde /forja/motores/ (mismo origen) y las imágenes en blob:.
import { pngDeLienzo } from '../../motor/zip.js';
import { catalogoDe, porDefecto } from '../../motor/juegos/index.js';
import { leerAjustes } from '../../motor/ajustes.js';
import { configDe } from './config.js';

const cacheTexto = new Map(), cacheBytes = new Map();
const base = () => new URL('./', globalThis.location?.href || 'http://localhost/');
async function texto(ruta) { if (!cacheTexto.has(ruta)) cacheTexto.set(ruta, fetch(new URL(ruta, base())).then((r) => { if (!r.ok) throw new Error(`${ruta}: ${r.status}`); return r.text(); })); return cacheTexto.get(ruta); }
async function bytes(ruta) { if (!cacheBytes.has(ruta)) cacheBytes.set(ruta, fetch(new URL(ruta, base())).then(async (r) => { if (!r.ok) throw new Error(`${ruta}: ${r.status}`); return new Uint8Array(await r.arrayBuffer()); })); return cacheBytes.get(ruta); }

// Sigue los import (estáticos, dinámicos con texto fijo y new URL('…', import.meta.url) de los Workers).
// Rutas relativas a web/. 'motores/…' es el prefijo del importmap; 'animejs' es vendor.
export function importsDe(codigo, ruta) {
  const out = new Set(), dir = ruta.includes('/') ? ruta.slice(0, ruta.lastIndexOf('/') + 1) : '';
  const res = (esp) => {
    if (esp === 'animejs') return 'vendor/anime.esm.min.js';
    if (esp.startsWith('motores/')) return esp;
    if (!esp.startsWith('.')) return null;
    const partes = (dir + esp).split('/'), pila = [];
    for (const p of partes) { if (p === '..') pila.pop(); else if (p !== '.' && p !== '') pila.push(p); }
    return pila.join('/');
  };
  const sinComentarios = codigo.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/[^\n]*/g, '$1');
  for (const re of [/(?:import|export)\s[^'"`;]*?from\s*['"]([^'"]+)['"]/g, /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g, /import\s+['"]([^'"]+)['"]/g, /new\s+URL\(\s*['"]([^'"]+)['"]\s*,\s*import\.meta\.url/g]) {
    for (const m of sinComentarios.matchAll(re)) { const r = res(m[1]); if (r) out.add(r); }
  }
  return [...out];
}
export async function dependencias(entrada, leer = texto) {
  const vistos = new Set(), cola = [...importsDe(await leer(entrada), entrada)];
  while (cola.length) {
    const r = cola.shift(); if (vistos.has(r)) continue; vistos.add(r);
    if (r.startsWith('vendor/')) continue;
    for (const x of importsDe(await leer(r), r)) if (!vistos.has(x)) cola.push(x);
  }
  return [...vistos].sort();
}

const LEEME = (nombre, juego, controles, motor, enlace) => `${nombre} · ${juego} · proyecto hecho con Forja (JMD Learning), motor ${motor === 'anime' ? 'Anime Battle Engine' : 'Infinite Voxel Engine'}

CÓMO ABRIRLO
Hace falta un servidor local (los módulos de JavaScript y los Workers no cargan con doble clic):
  npx serve      ·   python3 -m http.server 8000   ·   VS Code «Live Server»
No necesita internet: p5.js y Anime.js vienen dentro (vendor/).

CONTROLES
  ${controles}
  F3 muestra el monitor de rendimiento (FPS, tiempos, contadores).

QUÉ HAY
  index.html      la página (importmap: «motores/» y «animejs» apuntan a carpetas de aquí)
  datos.js        DATOS: tu personaje, las reglas que elegiste en «Diseña tu videojuego» y la configuración
  config.json     la configuración avanzada (la del Editor de Forja). Es solo datos: el juego la valida y nunca la ejecuta
  juego.js        EL JUEGO. Los algoritmos están marcados con «// >>> nombre»
  motores/        el motor (núcleo compartido + ${motor}). Los Workers son archivos .js aparte
  motor/sonido.js sonidos calculados con ondas (los mismos del estudio)
  assets/         hojas de sprites de tu personaje y del rival

Para volver a editar el personaje: ${enlace || 'https://jmd-learn.online/forja/'}
`;

// d: el mismo paquete que reciben las plantillas Phaser (spec, hoja, enemigo, semilla, estado, enlace…).
export async function armarMotor(d, meta) {
  const id = meta.id, archivos = [];
  const png = async (nombre, lienzo) => archivos.push({ nombre: 'assets/' + nombre, datos: await pngDeLienzo(lienzo), lienzo });
  const atlas = (h, nombre) => { const a = JSON.parse(JSON.stringify(h.atlas)); a.meta.image = nombre + '.png'; return a; };
  if (d?.hoja) { await png('heroe.png', d.hoja.hoja); archivos.push({ nombre: 'assets/heroe.json', datos: JSON.stringify(atlas(d.hoja, 'heroe')) }); }
  if (d?.enemigo?.hoja) { await png('enemigo.png', d.enemigo.hoja.hoja); archivos.push({ nombre: 'assets/enemigo.json', datos: JSON.stringify(atlas(d.enemigo.hoja, 'enemigo')) }); }
  const cifras = (h) => (h ? { px: h.px, relAlto: +h.relAlto.toFixed(3), relAncho: +h.relAncho.toFixed(3), animaciones: h.animaciones } : null);
  const cat = await catalogoDe(id);
  const reglas = { ...porDefecto(cat.reglas), ...(leerAjustes().reglas?.[id] || {}) };
  const config = configDe(id);
  const DATOS = { motor: meta.motor, plantilla: id, nombre: d?.spec?.nombre || 'Sin nombre', juego: meta.nombre, semilla: d?.semilla ?? 1,
    heroe: cifras(d?.hoja), enemigo: cifras(d?.enemigo?.hoja), colores: d?.spec?.colores ? colores(d.spec) : null, fisicaBase: d?.spec?.fisica || null, hora: d?.escenario?.hora || null, reglas, config };
  const datosJS = `// datos.js · generado por Forja para «${DATOS.nombre}». Son solo datos: cámbialos y mira qué pasa.\nwindow.DATOS = ${JSON.stringify(DATOS, null, 1)};\n`;
  const entrada = `plantillas/${id}.js`;
  const [juego, plantillaIndex, deps] = await Promise.all([texto(entrada), texto('motores/forja/index.html'), dependencias(entrada)]);
  const vendor = ['vendor/p5.min.js', 'vendor/anime.esm.min.js', 'vendor/LICENSE-animejs.txt'];
  const propios = deps.filter((r) => !r.startsWith('vendor/'));
  const contenidos = await Promise.all([...propios.map((r) => texto(r)), ...vendor.map((r) => bytes(r))]);
  [...propios, ...vendor].forEach((r, i) => archivos.push({ nombre: r, datos: contenidos[i] }));
  const html = plantillaIndex.replaceAll('__NOMBRE__', esc(DATOS.nombre)).replaceAll('__JUEGO__', esc(meta.nombre));
  const guiones = `<script type="importmap">{"imports":{"animejs":"./vendor/anime.esm.min.js","motores/":"./motores/"}}</script>\n<script src="vendor/p5.min.js"></script>\n<script src="datos.js"></script>\n<script type="module" src="juego.js"></script>`;
  archivos.push({ nombre: 'datos.js', datos: datosJS }, { nombre: 'juego.js', datos: juego }, { nombre: 'config.json', datos: JSON.stringify(config, null, 1) },
    { nombre: 'index.html', datos: html.replace('__SCRIPTS__', () => guiones) },
    { nombre: 'LEEME.txt', datos: LEEME(DATOS.nombre, meta.nombre, meta.controles, meta.motor, d?.enlace) },
    { nombre: 'ficha.json', datos: JSON.stringify({ nombre: DATOS.nombre, plantilla: id, motor: meta.motor, estado: d?.estado || null, reglas, enlace: d?.enlace || null }, null, 1) });
  const p = { motor: meta.motor, meta, archivos, DATOS, datosJS, comun: '', juego, index: html };
  p.enMemoria = () => paginaMotor(p);
  return p;
}
const esc = (t) => String(t).replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
const colores = (spec) => Object.fromEntries(Object.entries(spec.colores).map(([k, c]) => [k, `hsl(${Math.round(c.h)} ${Math.round(c.s * 100)}% ${Math.round(c.l * 100)}%)`]));

// La misma página, para el iframe srcdoc del estudio: importmap con direcciones absolutas y recursos en blob:.
export function paginaMotor(p) {
  const urls = [], mapa = {}, abs = (r) => new URL(r, base()).href;
  for (const a of p.archivos) {
    if (!a.nombre.startsWith('assets/')) continue;
    const n = a.nombre.slice(7);
    if (n.endsWith('.json')) mapa[n] = JSON.parse(a.datos);
    else { const u = URL.createObjectURL(new Blob([a.datos], { type: 'image/png' })); urls.push(u); mapa[n] = u; }
  }
  const juego = p.juego.replace(/<\/script/gi, '<\\/script');
  const guiones = `<script type="importmap">${JSON.stringify({ imports: { animejs: abs('vendor/anime.esm.min.js'), 'motores/': abs('motores/') } })}</script>
<script>window.FORJA_ASSETS = ${JSON.stringify(mapa)};</script>
<script src="${abs('vendor/p5.min.js')}"></script>
<script>${p.datosJS.replace(/<\/script/gi, '<\\/script')}</script>
<script type="module">${juego}</script>`;
  return { html: p.index.replace('__SCRIPTS__', () => guiones), liberar: () => urls.forEach((u) => URL.revokeObjectURL(u)) };
}
