// Estilo «Difícil de explicar»: piezas de HTML propias.
// · hero: el titular como collage de recortes (cada letra en una loseta pastel) y el <em> como sticker;
//   la imagen dentro de una ventana de programa de pintura de 1 bit.
// · tarjetas, pasos, oferta y contacto: las mismas clases estables, con siluetas en bits decorativas.
// Las siluetas se dibujan AL CONSTRUIR (recursos/siluetas.js corre aquí en un contexto aislado), así se
// ven sin JavaScript y con «reducir movimiento».
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { piezas, acciones } from '../../secciones.mjs';

const DIR = path.dirname(new URL(import.meta.url).pathname);
const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(DIR, 'recursos', 'siluetas.js'), 'utf8'), ctx);
const S = ctx.window.Siluetas;

const TINTA = '#1E2230';
const PAPEL = '#EFE8DC';
const PASTEL = ['rosa', 'cielo', 'salvia', 'mantequilla', 'lila', 'durazno'];

// Siluetas decorativas (sin nombres de marca): personajes en bits y objetos en vector.
const SIL = {
  gato: (c = TINTA) => S.gato(c),
  moneda: (c = TINTA) => S.moneda(c),
  fontanero: (c = TINTA) => S.fontanero(c),
  dino: (c = TINTA) => S.dino(c),
  erizo: (c = TINTA) => S.erizo(c),
  arpa: (c = TINTA) => S.arpa(c, PAPEL),
  raton: (c = TINTA) => S.raton(c, PAPEL),
  mando: () => S.mando360(PAPEL, TINTA, ['#7FA87A', '#C9706A', '#7F9CC4', '#D9BE62']),
  nes: () => S.mandoNes(TINTA, '#A9A397', '#C9706A'),
};
const ORDEN_TARJETAS = ['gato', 'moneda', 'fontanero', 'dino', 'erizo', 'arpa'];
const svg = (nombre, color) => SIL[nombre](color).replace('<svg ', '<svg aria-hidden="true" focusable="false" ');

// Azar con semilla: el mismo título da siempre el mismo collage.
function azar(semilla) {
  let s = semilla >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
const huella = (t) => Array.from(t).reduce((h, ch) => (h * 31 + ch.codePointAt(0)) >>> 0, 7);

// Divide «Café que se *siente* de altura.» en tramos normales y resaltados.
function tramos(texto) {
  const out = [];
  String(texto).split(/(\*[^*]+\*)/).forEach((t) => {
    if (!t) return;
    if (/^\*[^*]+\*$/.test(t)) out.push({ em: true, t: t.slice(1, -1) });
    else out.push({ em: false, t });
  });
  return out;
}

function collage(c, titulo) {
  const r = azar(huella(titulo));
  const plano = tramos(titulo).map((p) => p.t).join('');
  let previo = -1;
  const loseta = (ch) => {
    let k;
    do { k = Math.floor(r() * 7); } while (k === previo);
    previo = k;
    const color = k === 6 ? 'papel' : PASTEL[k];
    const giro = ((r() - 0.5) * 14).toFixed(1);
    const alto = ((r() - 0.5) * 0.12).toFixed(3);
    const escala = (0.94 + r() * 0.1).toFixed(3);
    const v = r();
    const fuente = v < 0.56 ? 'f1' : v < 0.8 ? 'f2' : v < 0.92 ? 'f3' : 'f4';
    return `<span class="loseta ${fuente}" style="--c:var(--${color});--r:${giro}deg;--y:${alto}em;--s:${escala}">${c.esc(ch)}</span>`;
  };
  // Fichas: letras sueltas, espacios y stickers. Lo que no está separado por un espacio va junto
  // (así la coma tras el sticker no queda huérfana al partir la línea).
  const grupos = [[]];
  for (const p of tramos(titulo)) {
    if (p.em) { grupos[grupos.length - 1].push({ html: `<em class="sticker">${c.esc(p.t)}</em>`, ancho: (Array.from(p.t).length * 0.74 + 0.9) / 0.92 }); continue; }
    for (const ch of Array.from(p.t)) {
      if (/\s/.test(ch)) { if (grupos[grupos.length - 1].length) grupos.push([]); continue; }
      grupos[grupos.length - 1].push({ html: loseta(ch), ancho: 1 });
    }
  }
  const llenos = grupos.filter((g) => g.length);
  const maxPalabra = Math.max(4, ...llenos.map((g) => g.reduce((a, x) => a + x.ancho, 0)));
  const html = llenos.map((g) => `<span class="palabra">${g.map((x) => x.html).join('')}</span>`).join(' ');
  const largo = Array.from(plano).length;
  // Tamaño de partida: que el collage llene el ancho en 2 líneas (títulos cortos) o 3 (largos).
  const lineas = largo <= 28 ? 2 : 3;
  const fsMax = Math.round(Math.max(72, Math.min(lineas === 2 ? 140 : 116, (1180 * lineas) / (largo * 0.84))));
  return { html, plano, n: maxPalabra.toFixed(2), fsMax };
}

// Pega al <em> la puntuación de al lado («herramienta*: la IA» → el «:» no salta solo de línea).
const pegar = (html) => html.replace(/([^\s>]*)(<em>[^<]*<\/em>)([^\s<]*)/g, (m, a, em, b) => (a || b ? `<span class="pegado">${a}${em}${b}</span>` : m));

const ventana = (c, clave, { prioridad = false, extra = '' } = {}) => `<div class="ventana-barra" aria-hidden="true"><span>Sin título · Pintura</span></div>
      <div class="ventana-menu" aria-hidden="true"><span>Archivo</span><span>Edición</span><span>Ver</span></div>
      ${c.imagen(clave, { prioridad, extra })}`;

export default {
  cabeza(c, s) {
    if (!s.titulo && !s.texto) return '';
    return `<header class="s-cabeza">${s.antetitulo ? `<p class="s-ante">${c.esc(s.antetitulo)}</p>` : ''}
      ${s.titulo ? `<h2 class="s-titulo"${c.mov('titulo')}>${pegar(c.fmt(s.titulo))}</h2>` : ''}
      ${s.texto ? `<p class="s-texto"${c.mov('texto')}>${c.fmt(s.texto)}</p>` : ''}</header>`;
  },

  hero(c) {
    const h = c.n.hero;
    const t = collage(c, h.titulo);
    const media = h.imagen && c.img(h.imagen)
      ? `<figure class="hero-media ventana" data-mov="ventana">${ventana(c, h.imagen, { prioridad: true })}</figure>` : '';
    const losetas = [['fontanero', 'rosa'], ['erizo', 'cielo'], ['mando', 'mantequilla'], ['gato', 'papel'], ['moneda', 'salvia'], ['arpa', 'durazno']]
      .map(([s, col]) => `<span class="loseta-mini mini-${s}" style="--c:var(--${col})">${svg(s)}</span>`).join('');
    return `<section class="hero hero-collage" id="inicio"><div class="hero-contenido contenedor">
      ${h.antetitulo ? `<p class="antetitulo"><span class="cinta-n" aria-hidden="true">Cinta 01 ·</span> ${c.fmt(h.antetitulo)}</p>` : ''}
      <h1 class="hero-titulo" data-mov="collage" aria-label="${c.esc(t.plano)}" style="--n:${t.n};--fs-max:${t.fsMax}px"><span class="collage" aria-hidden="true">${t.html}</span></h1>
      <div class="hero-abajo">
        <div class="hero-texto">
          ${h.subtitulo ? `<p class="hero-sub"${c.mov('texto')}>${c.fmt(h.subtitulo)}</p>` : ''}
          ${acciones(c)}
          <div class="hero-losetas" aria-hidden="true">${losetas}</div>
        </div>
        ${media}
      </div>
    </div></section>`;
  },

  oferta(c) {
    const o = c.n.oferta;
    if (!o) return '';
    return piezas.oferta(c).replace(
      /<p class="oferta-etiqueta">([\s\S]*?)<\/p>/,
      (_, txt) => `<p class="oferta-etiqueta"><span class="sello-fig">${svg('moneda')}</span><span class="sello-txt">${txt}</span></p>`,
    ).replace('class="oferta"', `class="oferta${o.etiqueta ? ' oferta-con-sello' : ''}"`);
  },

  caracteristicas(c, s) {
    const items = s.items || [];
    return `<ul class="tarjetas tarjetas-${items.length}"${c.mov('grupo')}>${items.map((it, i) => `<li class="tarjeta${it.imagen ? ' tarjeta-con-imagen' : ''}${i === 0 ? ' tarjeta-primera' : ''}">
      <span class="tarjeta-num" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
      ${it.imagen ? `<figure class="tarjeta-media"${c.mov('imagen')}>${c.imagen(it.imagen)}</figure>` : ''}
      <div class="tarjeta-texto">${it.etiqueta ? `<p class="tarjeta-etiqueta">${c.esc(it.etiqueta)}</p>` : ''}<h3>${c.fmt(it.titulo)}</h3>${it.texto ? `<p>${c.fmt(it.texto)}</p>` : ''}</div>
      <span class="tarjeta-silueta sil-${ORDEN_TARJETAS[i % ORDEN_TARJETAS.length]}" aria-hidden="true">${svg(ORDEN_TARJETAS[i % ORDEN_TARJETAS.length])}</span>
    </li>`).join('')}</ul>`;
  },

  // Pasos: en escritorio con JS, la imagen va en un monitor fijo (efecto «pasos» común);
  // en móvil, sin JS o con movimiento reducido, cada paso lleva su propia foto.
  pasos(c, s) {
    const items = s.items || [];
    const conMedios = items.some((it) => it.imagen);
    const medios = conMedios
      ? `<div class="pasos-medios">${items.map((it, i) => `<figure class="paso-media" data-paso="${i}">${c.imagen(it.imagen)}</figure>`).join('')}
        <span class="monitor-rotulo" aria-hidden="true">Monitor · CRT</span><span class="monitor-led" aria-hidden="true"></span></div>` : '';
    return `<div class="pasos${conMedios ? ' pasos-con-medios' : ''}"${c.mov('pasos')}>${medios}
      <ol class="pasos-lista">${items.map((it, i) => `<li class="paso" data-paso="${i}"><span class="paso-num">${String(i + 1).padStart(2, '0')}</span><h3>${c.fmt(it.titulo)}</h3>${it.texto ? `<p>${c.fmt(it.texto)}</p>` : ''}${it.imagen ? `<figure class="paso-foto">${c.imagen(it.imagen)}</figure>` : ''}</li>`).join('')}</ol></div>`;
  },

  contacto(c, s) {
    const desfile = ['fontanero', 'erizo', 'dino', 'gato', 'moneda']
      .map((n) => `<span class="desfile-${n}">${svg(n)}</span>`).join('');
    return `<div class="desfile" aria-hidden="true">${desfile}</div>${piezas.contacto(c, s)}`;
  },
};
