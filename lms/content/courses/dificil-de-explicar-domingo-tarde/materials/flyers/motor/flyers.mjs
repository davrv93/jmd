#!/usr/bin/env node
// Motor de flyers: brief (JSON) + reglas -> HTML/CSS por familia -> Chrome headless (CDP) -> WebP/PNG.
// Regla de oro: la IA no dibuja el texto. El texto lo compone el navegador con fuentes reales.
// Node 22+ (WebSocket nativo). Sin dependencias.
//
//   node flyers.mjs --briefs mio.json --salida mis-flyers
//   node flyers.mjs --briefs ../datos/briefs.json --salida ../salida --mini ./mini --informe ../datos/informe.json --contacto ../contacto.webp
//
// Tras cada render comprueba: texto que desborda su caja, contraste real y zona segura.
// Si algo falla, reduce la letra o corrige el color y vuelve a renderizar (hasta 7 veces).
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { conPack, fondoPack, fotoPack, CSS_PACK } from './estilo.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => {
  if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]);
  return acc;
}, []));
const RUTA_REGLAS = args.reglas || path.join(AQUI, '..', 'reglas.json');
const REGLAS = JSON.parse(fs.readFileSync(RUTA_REGLAS, 'utf8'));
const RAW = 'https://raw.githubusercontent.com/davrv93/jmd/main/lms/content/courses/dificil-de-explicar-domingo-tarde/live/_comun/';

// ---------- color ----------
const hexOk = (h) => typeof h === 'string' && /^#[0-9a-fA-F]{6}$/.test(h.trim());
const rgb = (h) => { h = h.replace('#', ''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
const hex = (c) => '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const lum = (c) => { const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contraste = (a, b) => { const la = lum(typeof a === 'string' ? rgb(a) : a), lb = lum(typeof b === 'string' ? rgb(b) : b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); };
const mezcla = (a, b, t) => hex(rgb(a).map((v, i) => v + (rgb(b)[i] - v) * t));
const aclara = (h, t) => mezcla(h, '#ffffff', t);
const oscurece = (h, t) => mezcla(h, '#000000', t);
// Mueve fg hacia blanco o negro (el lado que más se aleja de bg) hasta cumplir min.
function asegura(fg, bg, min) {
  if (contraste(fg, bg) >= min) return fg;
  const haciaBlanco = contraste('#ffffff', bg) >= contraste('#000000', bg);
  for (let t = 0.1; t <= 1.0001; t += 0.1) {
    const c = haciaBlanco ? aclara(fg, t) : oscurece(fg, t);
    if (contraste(c, bg) >= min) return c;
  }
  return haciaBlanco ? '#ffffff' : '#000000';
}

// ---------- validación del brief ----------
const FUENTES = Object.fromEntries(REGLAS.fuentes.map((f) => [f.id, f]));
const TITULO_OK = REGLAS.fuentes.filter((f) => f.rol !== 'cuerpo').map((f) => f.id);
const CUERPO_OK = REGLAS.fuentes.filter((f) => f.rol !== 'titulo').map((f) => f.id);
const VISUAL_RUBRO = { perfumes: 'frasco', cosmeticos: 'tubo', ropa: 'prenda', comida: 'plato', postres: 'pastel', cafe: 'taza', tecnologia: 'laptop', servicios: 'estrella', b2b: 'edificio', educacion: 'libro' };
const VACIAS = new Set(['y', 'de', 'del', 'con', 'para', 'a', 'en', 'la', 'el', 'los', 'las', 'tu', 'tus', 'su', 'sus', 'o', 'que', 'por', 'al', 'un', 'una', 'sin', 'más', 'e']);
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F2FF}\u{FE0F}]/gu;

function recorta(txt, maxP, maxC) {
  let p = String(txt || '').trim().split(/\s+/).filter(Boolean);
  if (p.length > maxP) p = p.slice(0, maxP);
  while (p.join(' ').length > maxC && p.length > 1) p.pop();
  while (p.length > 1 && VACIAS.has(p[p.length - 1].toLowerCase().replace(/[.,;:]/g, ''))) p.pop();
  return p.join(' ').replace(/[,;:]$/, '');
}

export function valida(b0) {
  const b = JSON.parse(JSON.stringify(b0));
  const c = [];
  b.extra = b.extra || {};
  b.paleta = b.paleta || {};
  b.tipografias = b.tipografias || {};
  // textos: emojis, palabras prohibidas, límites
  const prohib = REGLAS.prohibido.palabras;
  for (const k of [...REGLAS.jerarquia, 'nombre']) {
    let v = String(b[k] ?? '').trim();
    if (EMOJI.test(v)) { v = v.replace(EMOJI, '').trim(); c.push(`${k}: sin emojis`); }
    if (/!{2,}|¡{2,}/.test(v)) { v = v.replace(/!{2,}/g, '!').replace(/¡{2,}/g, '¡'); c.push(`${k}: exclamaciones`); }
    for (const p of prohib) if (v.toLowerCase().includes(p)) { v = v.replace(new RegExp(p, 'gi'), k === 'nombre' ? 'Casa' : 'especial'); c.push(`${k}: palabra no permitida «${p}»`); }
    const maxP = REGLAS.max_palabras[k] ?? 6, maxC = REGLAS.max_caracteres[k] ?? 40;
    if (k !== 'nombre' && (v.split(/\s+/).length > maxP || v.length > maxC)) { v = recorta(v, maxP, maxC); c.push(`${k}: recortado a ${maxP} palabras`); }
    if (!v) { v = { gancho: b.nombre || 'Nuevo', cta: 'Escríbenos', marca: '@' + String(b.nombre || 'marca').toLowerCase().replace(/[^a-z0-9]/g, '') }[k] || ''; if (v) c.push(`${k}: vacío, se completó`); }
    b[k] = v;
  }
  if (b.familia === 'menu') {
    let it = Array.isArray(b.extra.items) ? b.extra.items.filter((x) => x && x.nombre) : [];
    if (it.length < 3) c.push('menú: faltaban platos');
    it = it.slice(0, 4).map((x) => ({ nombre: recorta(x.nombre, 4, 26), precio: String(x.precio || '').replace(/^S\/\s*/i, 'S/ ').slice(0, 10) }));
    for (const x of it) for (const p of prohib) if (x.nombre.toLowerCase().includes(p)) { x.nombre = 'Plato de la casa'; c.push('menú: plato no permitido'); }
    b.extra.items = it;
  }
  if (b.familia === 'cupon') {
    const cod = String(b.extra.codigo || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
    if (cod !== b.extra.codigo) c.push('cupón: código normalizado');
    b.extra.codigo = cod || 'BIENVENIDA';
  }
  if (b.familia === 'antes-despues') {
    for (const k of ['antes', 'despues']) {
      const v = recorta(b.extra[k] || '', 5, 34);
      if (v !== (b.extra[k] || '')) c.push(`${k}: recortado`);
      b.extra[k] = v || (k === 'antes' ? 'Sin orden' : 'Todo claro');
    }
  }
  // paleta
  const P = b.paleta, porDefecto = { fondo: '#F4EFE6', superficie: '#E6DCCB', texto: '#1E1A16', acento: '#B5462C', texto_acento: '#FFFFFF' };
  for (const k of Object.keys(porDefecto)) if (!hexOk(P[k])) { P[k] = porDefecto[k]; c.push(`paleta.${k}: hex inválido`); }
  const { contraste_min_texto: min } = REGLAS.color;
  const t1 = asegura(P.texto, P.fondo, min); if (t1 !== P.texto) { P.texto = t1; c.push(`contraste texto/fondo < ${min}: texto corregido`); }
  if (contraste(P.texto, P.superficie) < min) {
    const s = asegura(P.superficie, P.texto, min); c.push('contraste texto/superficie: superficie corregida'); P.superficie = s;
  }
  if (contraste(P.texto_acento, P.acento) < min) {
    const best = contraste('#ffffff', P.acento) >= contraste('#111111', P.acento) ? '#FFFFFF' : '#111111';
    if (contraste(best, P.acento) >= min) P.texto_acento = best;
    else { P.acento = asegura(P.acento, best, min); P.texto_acento = best; }
    c.push('contraste texto_acento/acento: corregido');
  }
  // tipografías
  const T = b.tipografias;
  if (b.pack) { T.titulo = b.pack.titulo.familia; T.cuerpo = b.pack.cuerpo.familia; }
  else {
  if (!TITULO_OK.includes(T.titulo)) { c.push(`titulo: fuente «${T.titulo}» no válida`); T.titulo = 'archivo-black'; }
  if (!CUERPO_OK.includes(T.cuerpo)) { c.push(`cuerpo: fuente «${T.cuerpo}» no válida`); T.cuerpo = 'inter'; }
  if (T.cuerpo === T.titulo) { T.cuerpo = T.titulo === 'inter' ? 'sora' : 'inter'; c.push('cuerpo: igual al título'); }
  }
  if (!REGLAS.visuales.includes(b.visual)) { c.push(`visual «${b.visual}» no existe`); b.visual = VISUAL_RUBRO[b.rubro] || 'estrella'; }
  if (!REGLAS.familias.some((f) => f.id === b.familia)) { c.push('familia desconocida'); b.familia = 'heroe'; }
  if (!REGLAS.formatos[b.formato]) b.formato = 'feed';
  return { brief: b, correcciones: c };
}

// ---------- visuales SVG (sin IA, sin cupo) ----------
let uidN = 0;
function visual(tipo, P) {
  const u = 'g' + (++uidN), a = P.acento, d = oscurece(a, 0.35), l = aclara(a, 0.35), s = P.superficie, t = P.texto;
  const gr = `<linearGradient id="${u}" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="${d}"/><stop offset=".45" stop-color="${l}"/><stop offset="1" stop-color="${oscurece(a, .2)}"/></linearGradient>`;
  const gv = `<linearGradient id="${u}v" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${l}"/><stop offset="1" stop-color="${d}"/></linearGradient>`;
  const sombra = `<ellipse cx="200" cy="378" rx="130" ry="13" fill="#000" opacity=".2"/>`;
  const brillo = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${w / 2}" fill="#fff" opacity=".32"/>`;
  const f = {
    frasco: `${sombra}<rect x="105" y="150" width="190" height="225" rx="46" fill="url(#${u})"/>${brillo(124, 172, 20, 170)}<rect x="150" y="232" width="100" height="74" rx="6" fill="${s}" opacity=".92"/><rect x="166" y="252" width="68" height="7" rx="3" fill="${t}" opacity=".55"/><rect x="178" y="270" width="44" height="5" rx="2" fill="${t}" opacity=".4"/><rect x="172" y="112" width="56" height="42" rx="6" fill="${d}"/><rect x="146" y="44" width="108" height="72" rx="16" fill="${oscurece(t, .1)}"/>${brillo(160, 54, 12, 50)}`,
    taza: `<ellipse cx="200" cy="352" rx="160" ry="24" fill="${oscurece(s, .15)}"/>${sombra}<path d="M98 168h204v86a102 96 0 0 1-204 0z" fill="url(#${u})"/><path d="M300 196a46 44 0 1 1 0 88" fill="none" stroke="${d}" stroke-width="18"/><ellipse cx="200" cy="168" rx="102" ry="18" fill="#3b2418"/>${brillo(118, 186, 16, 110)}<g fill="none" stroke="${t}" stroke-width="7" stroke-linecap="round" opacity=".35"><path d="M160 140c-22-28 22-46 0-80"/><path d="M200 132c-22-28 22-46 0-80"/><path d="M240 140c-22-28 22-46 0-80"/></g>`,
    caja: `${sombra}<rect x="92" y="172" width="216" height="196" rx="10" fill="url(#${u})"/><rect x="76" y="136" width="248" height="50" rx="10" fill="${d}"/><rect x="186" y="136" width="28" height="232" fill="${s}"/><path d="M200 136c-70-70-110-10-40 0zM200 136c70-70 110-10 40 0z" fill="${s}" stroke="${oscurece(s, .2)}" stroke-width="4"/><circle cx="200" cy="134" r="14" fill="${oscurece(s, .15)}"/>`,
    plato: `${sombra}<path d="M66 208h268a134 124 0 0 1-268 0z" fill="url(#${u})"/><ellipse cx="200" cy="208" rx="134" ry="22" fill="${l}"/><ellipse cx="200" cy="200" rx="112" ry="40" fill="#F1E2C4"/><circle cx="160" cy="190" r="16" fill="#4E8B3A"/><circle cx="196" cy="180" r="12" fill="#D1495B"/><circle cx="232" cy="192" r="15" fill="#E9B44C"/><circle cx="214" cy="206" r="10" fill="#4E8B3A"/><circle cx="176" cy="210" r="9" fill="#C2552D"/><g fill="none" stroke="${t}" stroke-width="7" stroke-linecap="round" opacity=".3"><path d="M170 140c-20-26 20-42 0-72"/><path d="M230 140c-20-26 20-42 0-72"/></g>`,
    bolsa: `${sombra}<path d="M150 150c0-90 100-90 100 0" fill="none" stroke="${d}" stroke-width="16"/><path d="M106 148h188l22 220H84z" fill="url(#${u})"/><rect x="106" y="148" width="188" height="30" fill="${d}" opacity=".5"/><circle cx="200" cy="262" r="40" fill="${s}"/><circle cx="200" cy="262" r="18" fill="${a}"/>`,
    tubo: `${sombra}<path d="M128 52h144l-20 262h-104z" fill="url(#${u})"/><rect x="122" y="40" width="156" height="22" rx="4" fill="${d}"/><rect x="158" y="312" width="84" height="62" rx="12" fill="${oscurece(t, .1)}"/><rect x="160" y="130" width="80" height="90" rx="8" fill="${s}" opacity=".9"/><rect x="172" y="152" width="56" height="6" rx="3" fill="${t}" opacity=".5"/><rect x="180" y="170" width="40" height="5" rx="2" fill="${t}" opacity=".35"/>${brillo(142, 70, 14, 200)}`,
    pastel: `<ellipse cx="200" cy="360" rx="170" ry="22" fill="${oscurece(s, .12)}"/><rect x="78" y="240" width="244" height="112" rx="14" fill="url(#${u}v)"/><rect x="120" y="156" width="160" height="92" rx="12" fill="${aclara(a, .5)}"/><path d="M120 168h160v18c-14 18-24-6-40 10s-26-10-40 6-26-10-40 4-26-8-40 0z" fill="${s}"/><path d="M78 252h244v18c-16 20-30-6-48 10s-30-12-48 4-30-10-48 6-30-10-48 2-30-8-52 0z" fill="${s}"/><circle cx="170" cy="146" r="14" fill="#C8102E"/><circle cx="200" cy="140" r="14" fill="#C8102E"/><circle cx="230" cy="146" r="14" fill="#C8102E"/><path d="M200 126c4-12 14-16 18-14" stroke="#3E7B2E" stroke-width="5" fill="none"/>`,
    laptop: `${sombra}<rect x="78" y="84" width="244" height="172" rx="12" fill="#1c1c22"/><rect x="90" y="96" width="220" height="148" rx="4" fill="url(#${u}v)"/><rect x="106" y="114" width="90" height="12" rx="6" fill="#fff" opacity=".7"/><rect x="106" y="136" width="140" height="8" rx="4" fill="#fff" opacity=".45"/><rect x="106" y="174" width="56" height="50" rx="6" fill="#fff" opacity=".3"/><rect x="172" y="174" width="56" height="50" rx="6" fill="#fff" opacity=".3"/><rect x="238" y="174" width="56" height="50" rx="6" fill="#fff" opacity=".3"/><path d="M44 262h312l-26 36H70z" fill="#c9ccd3"/><rect x="170" y="262" width="60" height="8" rx="4" fill="#9a9ea8"/>`,
    telefono: `${sombra}<rect x="128" y="34" width="144" height="320" rx="28" fill="#16161a"/><rect x="138" y="46" width="124" height="296" rx="20" fill="url(#${u}v)"/><rect x="178" y="54" width="44" height="12" rx="6" fill="#16161a"/><rect x="152" y="96" width="96" height="64" rx="10" fill="#fff" opacity=".35"/><rect x="152" y="172" width="96" height="10" rx="5" fill="#fff" opacity=".6"/><rect x="152" y="192" width="70" height="8" rx="4" fill="#fff" opacity=".4"/><rect x="152" y="290" width="96" height="30" rx="15" fill="#fff" opacity=".8"/>`,
    prenda: `${sombra}<path d="M146 70l-48 22-50 64 50 30 16-22v206h172V164l16 22 50-30-50-64-48-22c-8 30-100 30-108 0z" fill="url(#${u})"/><path d="M146 70c8 30 100 30 108 0" fill="none" stroke="${d}" stroke-width="8"/>`,
    libro: `${sombra}<rect x="70" y="288" width="260" height="58" rx="6" fill="${d}"/><rect x="70" y="300" width="260" height="8" fill="#fff" opacity=".35"/><rect x="92" y="226" width="226" height="62" rx="6" fill="${s}" stroke="${oscurece(s, .25)}" stroke-width="4"/><rect x="80" y="160" width="240" height="66" rx="6" fill="url(#${u})"/><rect x="96" y="182" width="120" height="8" rx="4" fill="#fff" opacity=".55"/><path d="M290 160v50l12-10 12 10v-50z" fill="${s}"/>`,
    edificio: `${sombra}<rect x="70" y="150" width="90" height="222" fill="${oscurece(a, .15)}"/><rect x="150" y="70" width="110" height="302" fill="url(#${u})"/><rect x="250" y="190" width="84" height="182" fill="${d}"/>${Array.from({ length: 24 }, (_, i) => `<rect x="${166 + (i % 3) * 30}" y="${92 + Math.floor(i / 3) * 34}" width="18" height="20" fill="#fff" opacity="${i % 5 ? .55 : .2}"/>`).join('')}${Array.from({ length: 10 }, (_, i) => `<rect x="${84 + (i % 2) * 36}" y="${170 + Math.floor(i / 2) * 38}" width="22" height="22" fill="#fff" opacity=".35"/>`).join('')}`,
    engranaje: (() => { const pts = []; for (let i = 0; i < 40; i++) { const ang = (i / 40) * Math.PI * 2, r = (i % 4 < 2) ? 150 : 118; pts.push(`${200 + r * Math.cos(ang)},${200 + r * Math.sin(ang)}`); } return `<polygon points="${pts.join(' ')}" fill="url(#${u})"/><circle cx="200" cy="200" r="56" fill="${P.fondo}"/><circle cx="200" cy="200" r="86" fill="none" stroke="#fff" stroke-width="6" opacity=".3"/>`; })(),
    hoja: `${sombra}<path d="M200 366C56 284 76 116 200 34c124 82 144 250 0 332z" fill="url(#${u})"/><path d="M200 70v290M200 150l-50-36M200 200l60-42M200 250l-64-40M200 300l58-36" stroke="${l}" stroke-width="6" stroke-linecap="round" fill="none"/>`,
    estrella: `<path d="M200 40c14 96 64 146 160 160-96 14-146 64-160 160-14-96-64-146-160-160 96-14 146-64 160-160z" fill="url(#${u})"/><path d="M320 64c5 30 20 45 50 50-30 5-45 20-50 50-5-30-20-45-50-50 30-5 45-20 50-50z" fill="${l}"/><path d="M86 290c4 22 14 32 36 36-22 4-32 14-36 36-4-22-14-32-36-36 22-4 32-14 36-36z" fill="${s}"/>`,
  };
  return `<svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet"><defs>${gr}${gv}</defs>${f[tipo] || f.estrella}</svg>`;
}

// ---------- fondos ----------
function patron(id, P, W, H) {
  const n = [...String(id)].reduce((s, ch) => s + ch.charCodeAt(0), 0) % 6, c = P.texto, u = 'p' + (++uidN);
  const defs = [
    `<pattern id="${u}" width="40" height="40" patternUnits="userSpaceOnUse"><circle cx="20" cy="20" r="3" fill="${c}" opacity=".12"/></pattern>`,
    `<pattern id="${u}" width="32" height="32" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="10" height="32" fill="${c}" opacity=".06"/></pattern>`,
    `<pattern id="${u}" width="64" height="64" patternUnits="userSpaceOnUse"><path d="M64 0H0V64" fill="none" stroke="${c}" stroke-width="1.5" opacity=".1"/></pattern>`,
    `<pattern id="${u}" width="120" height="40" patternUnits="userSpaceOnUse"><path d="M0 20q30-20 60 0t60 0" fill="none" stroke="${c}" stroke-width="3" opacity=".08"/></pattern>`,
  ];
  if (n < 4) return `<svg class="fondo" width="${W}" height="${H}"><defs>${defs[n]}</defs><rect width="100%" height="100%" fill="url(#${u})"/></svg>`;
  if (n === 4) return `<svg class="fondo" width="${W}" height="${H}">${[1, 2, 3, 4, 5].map((i) => `<circle cx="${W * 0.9}" cy="${H * 0.1}" r="${i * 160}" fill="none" stroke="${c}" stroke-width="2" opacity=".08"/>`).join('')}</svg>`;
  return `<svg class="fondo" width="${W}" height="${H}"><defs><radialGradient id="${u}"><stop offset="0" stop-color="${P.acento}" stop-opacity=".35"/><stop offset="1" stop-color="${P.acento}" stop-opacity="0"/></radialGradient></defs><circle cx="${W * 0.15}" cy="${H * 0.85}" r="${W * 0.6}" fill="url(#${u})"/></svg>`;
}

// ---------- fuentes ----------
const DIR_FUENTES = args.fuentes || path.join(AQUI, '..', '..', '..', 'live', '_comun');
const cacheF = new Map();
async function fuente64(id) {
  if (cacheF.has(id)) return cacheF.get(id);
  const archivo = FUENTES[id].archivo;
  let p = path.join(DIR_FUENTES, archivo);
  if (!fs.existsSync(p)) {
    const dir = path.join(os.homedir(), '.cache', 'jmd-flyers'); fs.mkdirSync(dir, { recursive: true });
    p = path.join(dir, archivo);
    if (!fs.existsSync(p)) { const r = await fetch(RAW + archivo); if (!r.ok) throw new Error('no pude bajar ' + archivo); fs.writeFileSync(p, Buffer.from(await r.arrayBuffer())); }
  }
  const b = fs.readFileSync(p).toString('base64'); cacheF.set(id, b); return b;
}
const PESO_TITULO = { playfair: 700, fraunces: 600, 'space-grotesk': 700 };
const MAYUS = new Set(['anton', 'barlow-condensed', 'archivo-black']);

// ---------- plantillas ----------
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const E = REGLAS.escala_tipografica.pasos;

export async function html(b, A = { k: {}, col: {} }) {
  const F = REGLAS.formatos[b.formato], W = F.ancho, H = F.alto, Z = F.zona_segura;
  const AW = W - 2 * Z.lados, AH = H - Z.arriba - Z.abajo, P = b.paleta;
  const tf = b.tipografias.titulo, cf = b.tipografias.cuerpo;
  const K = b.pack;
  const [t64, c64] = K ? [K.titulo.b64, K.cuerpo.b64] : await Promise.all([fuente64(tf), fuente64(cf)]);
  const may = K ? K.titulo.mayus : MAYUS.has(tf);
  // T: bloque de texto medible. o.bg = color real debajo; o.c = color del texto; o.mh = alto máximo.
  const T = (k, txt, size, o = {}) => {
    const bg = o.bg || P.fondo, c = A.col[k] || o.c || P.texto;
    return `<div data-t="${k}" data-bg="${bg}" class="t ${o.cls || ''}" style="font-size:${(size * (A.k[k] || 1)).toFixed(1)}px;color:${c};${o.mh ? `max-height:${o.mh}px;` : ''}${o.st || ''}">${o.ico || ''}${esc(txt)}</div>`;
  };
  const G = (k, txt, size, o = {}) => T(k, txt, size, { ...o, cls: 'tit ' + (o.cls || '') });
  const pill = (k, txt, size, o = {}) => { const bg = o.bg || P.acento; if (K && k === 'cta' && /whats/i.test(txt)) o.ico = K.iconos.whatsapp; return T(k, txt, size, { bg, c: o.c || (o.bg ? P.fondo : P.texto_acento), cls: 'pill ' + (o.cls || ''), st: `background:${bg};` + (o.st || ''), ico: o.ico }); };
  const V = (st = '', vt = b.visual) => K ? `<div class="vis" style="${st}">${fotoPack(b, vt === 'otra' ? 'foto2' : 'foto')}</div>` : `<div class="vis" style="${st}">${visual(vt, P)}</div>`;
  const kicker = (st = '') => T('nombre', b.nombre, E.xs, { cls: 'kick', st });
  const marca = (o = {}) => T('marca', b.marca, E.xs, { cls: 'marca', ...(K && String(b.marca).startsWith('@') ? { ico: K.iconos.instagram } : {}), ...o });
  const hist = b.formato === 'historia';
  let cuerpo = '', sangrado = '';

  switch (b.familia) {
    case 'heroe':
      cuerpo = `<div class="col c" style="height:100%;gap:20px">
        ${kicker()}${G('gancho', b.gancho, E.xxl, { mh: AH * 0.24 })}
        <div style="position:relative;flex:1 1 0;min-height:160px;width:100%;display:flex;justify-content:center">
          ${K ? V('height:100%;aspect-ratio:4/5;max-width:100%') : `<div class="disco" style="background:${P.superficie}"></div>${V('height:100%;width:100%')}`}
          <div class="sello" style="background:${P.acento}">${T('oferta', b.oferta, E.m, { bg: P.acento, c: P.texto_acento, mh: 150, st: 'width:190px;text-align:center' })}</div>
        </div>
        ${G('producto', b.producto, E.l, { mh: 140 })}${T('beneficio', b.beneficio, E.s, { mh: 130, st: 'max-width:86%' })}
        <div class="fila">${pill('cta', b.cta, E.s)}${marca()}</div></div>`;
      break;
    case 'dividido':
      sangrado = hist
        ? (K ? `<div class="panel" style="left:0;top:0;width:${W}px;height:${H * 0.46}px">${fotoPack(b, 'foto', { radio: '0', sombra: false })}</div>` : `<div class="panel" style="left:0;top:0;width:${W}px;height:${H * 0.46}px;background:${P.superficie}"><div class="vis" style="position:absolute;left:15%;top:${Z.arriba * 0.6}px;width:70%;height:${H * 0.46 - Z.arriba * 0.8}px">${visual(b.visual, P)}</div></div>`)
        : (K ? `<div class="panel" style="left:0;top:0;width:${W * 0.44}px;height:${H}px">${fotoPack(b, 'foto', { radio: '0', sombra: false })}</div>` : `<div class="panel" style="left:0;top:0;width:${W * 0.44}px;height:${H}px;background:${P.superficie}"><div class="vis" style="position:absolute;left:6%;top:22%;width:88%;height:56%">${visual(b.visual, P)}</div></div>`);
      cuerpo = hist
        ? `<div class="col" style="position:absolute;left:0;right:0;bottom:0;height:${AH - (H * 0.46 - Z.arriba) - 40}px;gap:22px;justify-content:flex-end">${kicker()}${G('gancho', b.gancho, E.xxl, { mh: 330 })}${T('producto', b.producto, E.m, { mh: 120 })}${T('beneficio', b.beneficio, E.s, { mh: 130 })}<div class="fila izq">${pill('oferta', b.oferta, E.m)}</div><div class="fila izq">${pill('cta', b.cta, E.s, { bg: P.texto, c: P.fondo })}${marca()}</div></div>`
        : `<div class="col" style="margin-left:${W * 0.44 - Z.lados + 48}px;height:100%;gap:26px;justify-content:center">${kicker()}${G('gancho', b.gancho, E.xl, { mh: 420 })}${T('producto', b.producto, E.m, { mh: 120 })}${T('beneficio', b.beneficio, E.s, { mh: 170 })}<div class="fila izq">${pill('oferta', b.oferta, E.m)}</div><div class="fila izq" style="flex-direction:column;align-items:flex-start">${pill('cta', b.cta, E.s, { bg: P.texto, c: P.fondo })}${marca()}</div></div>`;
      break;
    case 'tipografico':
      cuerpo = `<div class="col" style="height:100%;gap:22px">${kicker()}
        ${G('gancho', b.gancho, E.xxxl, { mh: AH * (hist ? 0.5 : 0.48), st: 'line-height:1' })}
        <div style="height:10px;width:180px;background:${P.acento};flex:none"></div>
        ${G('producto', b.producto, E.l, { mh: 140 })}${T('beneficio', b.beneficio, E.s, { mh: 130, st: 'max-width:70%' })}
        <div style="flex:1 1 0;min-height:0"></div>
        <div class="fila izq" style="justify-content:space-between;align-items:flex-end"><div class="col" style="gap:16px;align-items:flex-start">${pill('oferta', b.oferta, E.m)}${pill('cta', b.cta, E.s, { bg: P.texto, c: P.fondo })}${marca()}</div>${V(K ? (hist ? 'width:420px;height:560px;flex:none' : 'width:380px;height:460px;flex:none') : 'width:240px;height:240px;flex:none')}</div></div>`;
      break;
    case 'collage': {
      const papel = aclara(P.superficie, 0.15);
      const tp = asegura(P.texto, papel, 4.5);
      sangrado = `<div class="recorte" style="left:${W * 0.08}px;top:${H * (hist ? 0.27 : 0.25)}px;width:${W * 0.5}px;height:${W * 0.5}px;transform:rotate(-6deg);background:${K ? '#FBFAF7' : P.superficie}">${K ? fotoPack(b, 'foto', { radio: '0', sombra: false }) : visual(b.visual, P)}<i class="cinta" style="background:${P.acento}"></i></div>
        <div class="recorte" style="left:${W * 0.5}px;top:${H * (hist ? 0.33 : 0.33)}px;width:${W * 0.38}px;height:${W * 0.38}px;transform:rotate(5deg);background:${K ? '#FBFAF7' : aclara(P.acento, .55)}">${K ? fotoPack(b, 'foto2', { radio: '0', sombra: false }) : visual(b.visual === 'estrella' ? 'hoja' : 'estrella', P)}<i class="cinta" style="background:${P.texto};opacity:.5"></i></div>`;
      cuerpo = `<div class="col" style="height:100%;gap:22px;justify-content:space-between">
        <div class="col" style="gap:18px;align-items:flex-start">${kicker()}
          <div class="tira" style="background:${papel};transform:rotate(-2deg)">${G('gancho', b.gancho, E.xl, { bg: papel, c: tp, mh: 260 })}</div></div>
        <div class="col" style="gap:18px;align-items:flex-start">
          <div class="tira" style="background:${P.acento};transform:rotate(2deg)">${T('oferta', b.oferta, E.l, { bg: P.acento, c: P.texto_acento, mh: 150 })}</div>
          ${G('producto', b.producto, E.m, { mh: 120 })}${T('beneficio', b.beneficio, E.s, { mh: 130, st: 'max-width:88%' })}
          <div class="fila izq">${pill('cta', b.cta, E.s, { bg: P.texto, c: P.fondo })}${marca()}</div></div></div>`;
      break;
    }
    case 'cupon': {
      const S = P.superficie, ts = P.texto;
      cuerpo = `<div class="col c" style="height:100%;gap:28px;justify-content:center">${kicker()}${K ? V('width:100%;flex:1 1 0;min-height:140px') : ''}
        <div class="ticket" style="background:${S};--hueco:${P.fondo}">
          <div class="col c" style="gap:14px">${G('gancho', b.gancho, E.xl, { bg: S, c: ts, mh: 220 })}${T('producto', b.producto, E.m, { bg: S, c: ts, mh: 120 })}</div>
          <div class="corte" style="border-color:${ts}"></div>
          <div class="col c" style="gap:16px">${G('oferta', b.oferta, E.xxl, { bg: S, c: ts, mh: 280 })}
            <div class="codigo" style="border-color:${ts}">${T('codigo', b.extra.codigo, E.m, { bg: S, c: ts, cls: 'mono', st: 'white-space:nowrap;letter-spacing:.12em' })}</div></div></div>
        ${T('beneficio', b.beneficio, E.s, { mh: 130, st: 'max-width:86%' })}<div class="fila">${pill('cta', b.cta, E.s)}${marca()}</div></div>`;
      break;
    }
    case 'menu': {
      const items = (b.extra.items || []).map((x, i) => `<div class="item" style="border-color:${mezcla(P.texto, P.fondo, .6)}">${T('item' + i, x.nombre, E.m, { st: 'white-space:nowrap;flex:1 1 0;min-width:0' })}${T('precio' + i, x.precio, E.m, { cls: 'mono', st: 'white-space:nowrap;flex:none;max-width:260px' })}</div>`).join('');
      cuerpo = `<div class="col" style="height:100%;gap:22px">
        <div style="display:flex;gap:24px;align-items:flex-start"><div class="col" style="gap:14px;flex:1;min-width:0">${kicker()}${G('gancho', b.gancho, E.xl, { mh: 260 })}</div>${V('width:230px;height:230px;flex:none')}</div>
        <div style="height:6px;background:${P.acento};flex:none"></div>
        <div class="col" style="gap:10px">${items}</div>
        ${T('beneficio', b.beneficio, E.s, { mh: 130 })}
        <div style="flex:1 1 0;min-height:0"></div>
        <div class="fila izq" style="justify-content:space-between">${pill('oferta', b.oferta, E.m)}${pill('cta', b.cta, E.s, { bg: P.texto, c: P.fondo })}</div>${marca()}</div>`;
      break;
    }
    case 'antes-despues': {
      const caja = (k, txt, et, bg, c) => `<div class="caja" style="background:${bg}">${T('et' + k, et, E.xs, { bg, c, cls: 'kick' })}${G(k, txt, E.l, { bg, c, mh: 220 })}</div>`;
      cuerpo = `<div class="col" style="height:100%;gap:26px">${kicker()}${G('gancho', b.gancho, E.xl, { mh: 230 })}
        <div class="ad ${hist ? 'v' : ''}">${caja('antes', b.extra.antes, 'Antes', P.superficie, P.texto)}<div class="flecha" style="color:${P.acento}">${hist ? '↓' : '→'}</div>${caja('despues', b.extra.despues, 'Después', P.acento, P.texto_acento)}</div>
        ${V('flex:1 1 0;min-height:0;width:100%')}
        ${T('producto', b.producto, E.m, { mh: 120 })}${T('beneficio', b.beneficio, E.s, { mh: 130 })}
        <div class="fila izq">${pill('cta', b.cta, E.s)}${marca()}</div></div>`;
      break;
    }
    case 'lujo':
      cuerpo = `<div class="col c" style="height:100%;gap:26px;justify-content:center">
        ${T('nombre', b.nombre, E.xs, { cls: 'kick', st: 'letter-spacing:.4em' })}<div style="height:2px;width:140px;background:${P.acento};flex:none"></div>
        ${V(`flex:0 1 ${AH * 0.36}px;min-height:0;width:60%`)}
        ${G('gancho', b.gancho, E.xl, { mh: 230, st: 'font-weight:400' })}
        ${T('producto', b.producto, E.xs, { mh: 80, st: 'letter-spacing:.3em;text-transform:uppercase' })}
        ${T('beneficio', b.beneficio, E.s, { mh: 130, st: 'max-width:76%' })}
        ${T('oferta', b.oferta, E.m, { mh: 120 })}
        ${T('cta', b.cta, E.s, { st: `white-space:nowrap;border-bottom:3px solid ${P.acento};padding-bottom:6px` })}${marca()}</div>`;
      break;
    case 'diagonal':
      cuerpo = `<div class="col" style="height:100%;gap:22px">${kicker()}${G('gancho', b.gancho, E.xxl, { mh: AH * 0.26 })}
        ${V('flex:1 1 0;min-height:0;width:100%')}
        <div class="banda" style="background:${P.acento}">${G('oferta', b.oferta, E.xl, { bg: P.acento, c: P.texto_acento, mh: 220, st: 'text-align:center;margin:0 auto;max-width:84%' })}</div>
        ${T('producto', b.producto, E.m, { mh: 120 })}${T('beneficio', b.beneficio, E.s, { mh: 130 })}
        <div class="fila izq">${pill('cta', b.cta, E.s, { bg: P.texto, c: P.fondo })}${marca()}</div></div>`;
      break;
    case 'tarjeta':
    default: {
      const S = P.superficie;
      cuerpo = `<div class="col c" style="height:100%;gap:28px;justify-content:center">
        <div class="tarjeta" style="background:${S}">${V(`flex:0 1 ${AH * 0.3}px;min-height:0;width:70%`)}
          ${T('nombre', b.nombre, E.xs, { bg: S, cls: 'kick' })}${G('gancho', b.gancho, E.xl, { bg: S, mh: 230 })}
          ${T('producto', b.producto, E.m, { bg: S, mh: 120 })}${T('beneficio', b.beneficio, E.s, { bg: S, mh: 130 })}
          <div class="fila">${pill('oferta', b.oferta, E.m)}${pill('cta', b.cta, E.s, { bg: P.texto, c: S })}</div></div>
        ${marca()}</div>`;
    }
  }

  const safe = { l: Z.lados, t: Z.arriba, r: W - Z.lados, b: H - Z.abajo };
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>
@font-face{font-family:T;src:url(data:font/woff2;base64,${t64}) format('woff2');font-weight:${K ? K.titulo.rango : '100 900'}}
@font-face{font-family:C;src:url(data:font/woff2;base64,${c64}) format('woff2');font-weight:${K ? K.cuerpo.rango : '100 900'}}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:${W}px;height:${H}px;overflow:hidden;background:${P.fondo}}
#lienzo{position:relative;width:${W}px;height:${H}px;background:${P.fondo};overflow:hidden;font-family:C,sans-serif;color:${P.texto}}
.fondo{position:absolute;inset:0}
#area{position:absolute;left:${Z.lados}px;top:${Z.arriba}px;width:${AW}px;height:${AH}px}
.col{display:flex;flex-direction:column}.c{align-items:center;text-align:center}
.t{overflow:visible;line-height:1.28;flex:none;max-width:100%}
.tit{font-family:T,serif;font-weight:${K ? K.titulo.peso : (PESO_TITULO[tf] || 400)};line-height:${K ? K.titulo.interlineado : 1.06};letter-spacing:${K ? K.titulo.tracking : '-.01em'};${may ? 'text-transform:uppercase;' : ''}}${K ? CSS_PACK : ''}
#lienzo{font-weight:${K ? K.cuerpo.peso : 400}}
.kick{text-transform:uppercase;letter-spacing:.22em;font-size:${E.xs}px;opacity:1}
.marca{font-family:C,sans-serif;white-space:nowrap}
.mono{font-family:C,monospace}
.pill{display:inline-block;padding:.42em 1em;border-radius:${K ? (/999/.test(K.radio) ? '999px' : K.radio.split(' ')[0]) : '999px'};white-space:nowrap;font-weight:600;line-height:1.1}
.fila{display:flex;gap:24px;align-items:center;justify-content:center;flex-wrap:wrap;flex:none;width:100%}.fila.izq{justify-content:flex-start}
.vis{display:flex;align-items:center;justify-content:center;position:relative}.vis svg{width:100%;height:100%;display:block}
.disco{position:absolute;aspect-ratio:1;height:100%;max-width:100%;border-radius:50%;left:50%;transform:translateX(-50%)}
.sello{position:absolute;right:2%;top:4%;width:230px;height:230px;border-radius:50%;display:grid;place-items:center;transform:rotate(8deg);box-shadow:0 10px 30px rgba(0,0,0,.18)}
.panel{position:absolute}
.recorte{position:absolute;padding:22px;box-shadow:0 14px 36px rgba(0,0,0,.25)}.recorte svg{width:100%;height:100%}
.cinta{position:absolute;top:-16px;left:30%;width:40%;height:34px;opacity:.75;transform:rotate(-3deg)}
.tira{padding:14px 24px;max-width:100%;box-shadow:0 6px 18px rgba(0,0,0,.15)}
.ticket{width:100%;border-radius:28px;padding:56px 48px;display:flex;flex-direction:column;gap:30px;position:relative;box-shadow:0 18px 40px rgba(0,0,0,.18)}
.ticket::before,.ticket::after{content:"";position:absolute;top:calc(50% - 30px);width:60px;height:60px;border-radius:50%;background:var(--hueco)}
.ticket::before{left:-30px}.ticket::after{right:-30px}
.corte{border-top:4px dashed;opacity:.5}
.codigo{border:3px dashed;border-radius:14px;padding:12px 28px;max-width:100%}
.item{display:flex;gap:24px;align-items:baseline;border-bottom:2px dotted;padding-bottom:10px}
.ad{display:flex;gap:18px;align-items:stretch;flex:none}.ad.v{flex-direction:column}
.caja{flex:1 1 0;min-width:0;border-radius:24px;padding:28px;display:flex;flex-direction:column;gap:10px}
.flecha{font-size:72px;align-self:center;font-family:C,sans-serif}
.banda{margin:0 -${Z.lados + 140}px;padding:34px ${Z.lados + 140}px;transform:rotate(-5deg);flex:none}
.tarjeta{width:100%;border-radius:${K ? (/999/.test(K.radio) ? '32px' : K.radio.split(' ')[0]) : '40px'};padding:56px;display:flex;flex-direction:column;align-items:center;text-align:center;gap:20px;box-shadow:0 24px 60px rgba(0,0,0,.22);flex:0 1 auto;min-height:0;overflow:hidden}
</style></head><body><div id="lienzo">${K ? fondoPack(b, W, H) : patron(b.id, P, W, H)}${sangrado}<div id="area">${cuerpo}</div></div>
<script>window.__SAFE=${JSON.stringify(safe)};</script></body></html>`;
}

// Comprobación dentro de la página (texto desbordado, zona segura, contraste real).
const CHEQUEO = `(async()=>{await document.fonts.ready;await Promise.all([...document.fonts].map(f=>f.load().catch(()=>0)));
const L=c=>{c=c.map(v=>{v/=255;return v<=.03928?v/12.92:((v+.055)/1.055)**2.4});return .2126*c[0]+.7152*c[1]+.0722*c[2]};
const H=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));const S=window.__SAFE;const out=[];
for(const el of document.querySelectorAll('[data-t]')){if(!el.textContent.trim())continue;const r=el.getBoundingClientRect();const cs=getComputedStyle(el);
const fs=parseFloat(cs.fontSize);const m=cs.color.match(/[\\d.]+/g).map(Number);const a=L(m.slice(0,3)),b=L(H(el.dataset.bg));
const c=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
out.push({k:el.dataset.t,bg:el.dataset.bg,sw:el.scrollWidth,cw:el.clientWidth,sh:el.scrollHeight,ch:el.clientHeight,
fuera:r.left<S.l-1||r.top<S.t-1||r.right>S.r+1||r.bottom>S.b+1,c:Math.round(c*100)/100,min:fs>=${REGLAS.color.titulo_grande_desde_px}?${REGLAS.color.contraste_min_titulo_grande}:${REGLAS.color.contraste_min_texto},fs})}
return JSON.stringify(out)})()`;

// ---------- Chrome por CDP ----------
function buscaChrome() {
  const c = [process.env.CHROME, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/lib/chromium/chromium'];
  const pw = path.join(os.homedir(), '.cache', 'ms-playwright');
  if (fs.existsSync(pw)) for (const d of fs.readdirSync(pw)) for (const s of ['chrome-linux/chrome', 'chrome-headless-shell-linux64/chrome-headless-shell', 'chrome-mac/Chromium.app/Contents/MacOS/Chromium']) c.push(path.join(pw, d, s));
  return c.find((p) => p && fs.existsSync(p));
}
class CDP {
  constructor(url) { this.ws = new WebSocket(url); this.n = 0; this.p = new Map(); }
  abre() {
    return new Promise((ok, mal) => {
      this.ws.onopen = ok; this.ws.onerror = mal;
      this.ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && this.p.has(d.id)) { const q = this.p.get(d.id); this.p.delete(d.id); d.error ? q.mal(new Error(d.error.message)) : q.ok(d.result); } };
    });
  }
  manda(method, params = {}, sessionId) { const id = ++this.n; this.ws.send(JSON.stringify({ id, method, params, sessionId })); return new Promise((ok, mal) => this.p.set(id, { ok, mal })); }
}
export async function abreChrome() {
  const exe = buscaChrome(); if (!exe) throw new Error('No encontré Chrome/Chromium. Define CHROME=/ruta/al/chrome');
  const perfil = fs.mkdtempSync(path.join(os.tmpdir(), 'flyers-'));
  const ch = spawn(exe, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${perfil}`, '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--disable-gpu', '--no-sandbox', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  const ws = await new Promise((ok, mal) => { let buf = ''; const t = setTimeout(() => mal(new Error('Chrome no respondió')), 20000); ch.stderr.on('data', (d) => { buf += d; const m = buf.match(/ws:\/\/[^\s]+/); if (m) { clearTimeout(t); ok(m[0]); } }); });
  const cdp = new CDP(ws); await cdp.abre();
  return { cdp, cierra: () => { try { ch.kill(); } catch {} setTimeout(() => { try { fs.rmSync(perfil, { recursive: true, force: true }); } catch {} }, 500); } };
}
export async function pagina(cdp) {
  const { targetId } = await cdp.manda('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await cdp.manda('Target.attachToTarget', { targetId, flatten: true });
  await cdp.manda('Page.enable', {}, sessionId);
  const { frameTree } = await cdp.manda('Page.getFrameTree', {}, sessionId);
  return { s: sessionId, frame: frameTree.frame.id };
}

// Renderiza un brief con comprobaciones y correcciones automáticas.
export async function renderiza(cdp, pg, b, salidas) {
  const F = REGLAS.formatos[b.formato];
  await cdp.manda('Emulation.setDeviceMetricsOverride', { width: F.ancho, height: F.alto, deviceScaleFactor: 1, mobile: false }, pg.s);
  const A = { k: {}, col: {} }, arreglos = [];
  let malos = [], vuelta = 0;
  for (; vuelta < 8; vuelta++) {
    await cdp.manda('Page.setDocumentContent', { frameId: pg.frame, html: await html(b, A) }, pg.s);
    const r = await cdp.manda('Runtime.evaluate', { expression: CHEQUEO, awaitPromise: true, returnByValue: true }, pg.s);
    const res = JSON.parse(r.result.value);
    // alto: tolera la tinta de ascendentes y descendentes (< 30 % de la letra); una línea de más sí cuenta.
    const sobra = (x) => x.sw - x.cw > 1 || x.sh - x.ch > Math.max(2, 0.3 * x.fs);
    malos = res.filter((x) => sobra(x) || x.fuera || x.c < x.min);
    if (!malos.length) break;
    for (const x of malos) {
      if (x.c < x.min) {
        const bg = x.bg || b.paleta.fondo;
        const cand = [b.paleta.texto, b.paleta.texto_acento, '#111111', '#FFFFFF'].sort((p, q) => contraste(q, bg) - contraste(p, bg));
        A.col[x.k] = cand[0]; arreglos.push(`${x.k}: contraste ${x.c} -> color ${cand[0]}`);
      }
      const fw = x.sw > x.cw + 1 ? x.cw / x.sw : 1, fh = x.sh - x.ch > Math.max(2, 0.3 * x.fs) ? Math.sqrt(x.ch / x.sh) : 1;
      let f = Math.min(fw * 0.98, fh * 0.97);
      if (x.fuera && f >= 1) f = 0.9;
      if (f < 1) { A.k[x.k] = (A.k[x.k] || 1) * Math.max(0.55, f); arreglos.push(`${x.k}: letra al ${Math.round(A.k[x.k] * 100)} %${x.fuera ? ' (zona segura)' : ''}`); }
    }
  }
  for (const s of salidas) {
    const scale = (s.ancho || F.ancho) / F.ancho;
    const shot = await cdp.manda('Page.captureScreenshot', { format: s.formato || 'webp', quality: s.formato === 'png' ? undefined : (s.calidad || 82), clip: { x: 0, y: 0, width: F.ancho, height: F.alto, scale } }, pg.s);
    fs.writeFileSync(s.ruta, Buffer.from(shot.data, 'base64'));
  }
  return { vueltas: vuelta + 1, arreglos, pendientes: malos.map((x) => x.k), detalle: malos };
}
async function contacto(cdp, pg, lista, ruta) {
  const col = 10, cw = 180, chh = 225, W = 80 + col * cw + (col - 1) * 14;
  const celdas = lista.map((x) => `<figure><img src="data:image/webp;base64,${fs.readFileSync(x.mini).toString('base64')}"><figcaption>${esc(x.id)} · ${esc(x.rubro)}</figcaption></figure>`).join('');
  const filas = Math.ceil(lista.length / col), H = 150 + filas * (chh + 44);
  await cdp.manda('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false }, pg.s);
  await cdp.manda('Page.setDocumentContent', { frameId: pg.frame, html: `<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#141414;color:#eee;font:20px/1.3 system-ui,sans-serif;width:${W}px}h1{margin:0;padding:40px 40px 10px;font-size:40px}p{margin:0 40px 20px;color:#aaa}main{display:grid;grid-template-columns:repeat(${col},${cw}px);gap:12px 14px;padding:0 40px}figure{margin:0}img{width:${cw}px;height:${chh}px;object-fit:contain;background:#000;display:block}figcaption{font-size:14px;color:#aaa;padding-top:4px;white-space:nowrap;overflow:hidden}</style><h1>${lista.length} flyers · reglas + DeepSeek + packs de estilo</h1><p>Fotos reales, texturas y tipografía por rubro. El texto lo compone el navegador. Difícil de explicar · Sesión 2</p><main>${celdas}</main>` }, pg.s);
  await cdp.manda('Runtime.evaluate', { expression: 'Promise.all([...document.images].map(i=>i.decode().catch(()=>0)))', awaitPromise: true }, pg.s);
  const shot = await cdp.manda('Page.captureScreenshot', { format: 'webp', quality: 80, clip: { x: 0, y: 0, width: W, height: H, scale: 1 } }, pg.s);
  fs.writeFileSync(ruta, Buffer.from(shot.data, 'base64'));
}

// ---------- principal ----------
async function main() {
  if (!args.briefs) { console.log('Uso: node flyers.mjs --briefs briefs.json --salida carpeta [--png] [--mini carpeta] [--informe informe.json] [--contacto contacto.webp] [--solo f001]'); process.exit(1); }
  let briefs = JSON.parse(fs.readFileSync(args.briefs, 'utf8'));
  if (!Array.isArray(briefs)) briefs = briefs.briefs || [briefs];
  if (args.solo) briefs = briefs.filter((b) => String(args.solo).split(',').includes(b.id));
  const salida = args.salida || 'salida'; fs.mkdirSync(salida, { recursive: true });
  if (args.mini) fs.mkdirSync(args.mini, { recursive: true });
  const hilos = Number(args.hilos || 4);
  // Sin Chrome (o con --html): deja cada flyer como HTML para abrirlo en el Visor. Sin comprobaciones de medida.
  if (args.html || !buscaChrome()) {
    if (!args.html) console.log('No encontré Chrome: dejo los flyers como HTML (define CHROME=/ruta para tener WebP/PNG medidos).');
    for (const [n, b0] of briefs.entries()) {
      b0.id = b0.id || 'f' + String(n + 1).padStart(3, '0');
      const { brief: b, correcciones } = valida(args['sin-estilo'] ? b0 : conPack(b0));
      const ruta = path.join(salida, `${b.id}-${b.rubro}-${b.familia}`.toLowerCase().replace(/[^a-z0-9-]/g, '') + '.html');
      fs.writeFileSync(ruta, await html(b));
      console.log(ruta, correcciones.length ? 'reglas: ' + correcciones.join('; ') : '');
    }
    return;
  }
  const { cdp, cierra } = await abreChrome();
  const informe = [];
  let i = 0, conCorreccion = 0, conAjuste = 0;
  const t0 = Date.now();
  try {
    const pags = await Promise.all(Array.from({ length: Math.min(hilos, briefs.length) }, () => pagina(cdp)));
    await Promise.all(pags.map(async (pg) => {
      while (i < briefs.length) {
        const b0 = briefs[i++];
        b0.id = b0.id || 'f' + String(i).padStart(3, '0');
        const { brief: b, correcciones } = valida(args['sin-estilo'] ? b0 : conPack(b0));
        const nombre = `${b.id}-${b.rubro}-${b.familia}`.toLowerCase().replace(/[^a-z0-9-]/g, '');
        const ext = args.png ? 'png' : 'webp';
        const s = [{ ruta: path.join(salida, `${nombre}.${ext}`), formato: ext, calidad: 82 }];
        if (args.mini) s.push({ ruta: path.join(args.mini, `${b.id}.webp`), formato: 'webp', calidad: 78, ancho: 720 });
        const r = await renderiza(cdp, pg, b, s);
        if (correcciones.length) conCorreccion++;
        if (r.arreglos.length) conAjuste++;
        informe.push({ id: b.id, pack: b.pack ? b.pack.id : null, foto: b.pack && b.pack.foto ? b.pack.foto.archivo : null, archivo: path.basename(s[0].ruta), mini: args.mini ? `${b.id}.webp` : null, rubro: b.rubro, familia: b.familia, formato: b.formato, nombre: b.nombre, gancho: b.gancho, tono: b.tono || '', paleta: b.paleta, tipografias: b.tipografias, correcciones_brief: correcciones, ajustes_render: r.arreglos, vueltas: r.vueltas, pendientes: r.pendientes, _mini: args.mini ? path.join(args.mini, `${b.id}.webp`) : s[0].ruta });
        process.stdout.write(`${b.id} ${b.rubro} ${b.familia} ${b.pack ? b.pack.id : ''} vueltas=${r.vueltas}${r.pendientes.length ? ' PENDIENTE ' + JSON.stringify(r.detalle) : ''}\n`);
      }
    }));
    informe.sort((a, b) => a.id.localeCompare(b.id));
    if (args.contacto) await contacto(cdp, await pagina(cdp), informe.map((x) => ({ id: x.id, rubro: x.rubro, mini: x._mini })), args.contacto);
  } finally { cierra(); }
  const resumen = { total: informe.length, briefs_corregidos_por_reglas: conCorreccion, ajustados_al_renderizar: conAjuste, con_pendientes: informe.filter((x) => x.pendientes.length).length, segundos: Math.round((Date.now() - t0) / 1000) };
  for (const x of informe) delete x._mini;
  if (args.informe) fs.writeFileSync(args.informe, JSON.stringify({ resumen, flyers: informe }, null, 1));
  console.log(JSON.stringify(resumen));
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main().catch((e) => { console.error(e); process.exit(1); });
