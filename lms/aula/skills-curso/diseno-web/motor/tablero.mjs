#!/usr/bin/env node
// Tablero de diseño web: de diseno.json (el brief del negocio) a UN archivo HTML para aprobar.
// No genera código de producción: wireframes en gris, portada en alta fidelidad a 1280 y 360 px,
// guía de estilo con contrastes calculados, componentes, reglas de dimensión y checklist.
// Uso:  node tablero.mjs diseno.json [--salida tablero.html]     (también con bun)
//       node tablero.mjs diseno.json --validar                   (solo revisa las reglas)
// Sin dependencias. Sale con código 1 si hay errores de regla (contraste, táctil, largo de línea…).
import { readFileSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const entrada = args.find((a) => !a.startsWith('--'));
if (!entrada) { console.error('Uso: node tablero.mjs diseno.json [--salida tablero.html] [--validar]'); process.exit(2); }
const iSal = args.indexOf('--salida');
const salida = iSal >= 0 ? args[iSal + 1] : entrada.replace(/\.json$/i, '') + '-tablero.html';
const soloValidar = args.includes('--validar');
const D = JSON.parse(readFileSync(entrada, 'utf8'));

// ---------- utilidades ----------
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hex = (h) => { h = String(h).replace('#', ''); if (h.length === 3) h = h.split('').map((c) => c + c).join(''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
const lum = (h) => { const [r, g, b] = hex(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contraste = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
const mezclar = (a, b, t) => '#' + hex(a).map((v, i) => Math.round(v + (hex(b)[i] - v) * t).toString(16).padStart(2, '0')).join('');
const sobre = (fondo) => (contraste(fondo, '#ffffff') >= contraste(fondo, '#111111') ? '#ffffff' : '#111111');
const r1 = (n) => Math.round(n * 10) / 10;

const P = Object.assign({ fondo: '#ffffff', superficie: '#f6f6f6', texto: '#1a1a1a', suave: '#5c5c5c', primario: '#1f3a5f', acento: '#c8743a', borde: '#dddddd' }, D.paleta || {});
const T = Object.assign({ titulos: 'Georgia', texto: 'Inter', base: 16, escala: 1.25, escala_movil: 1.2, linea: 1.6, medida_ch: 65 }, D.tipografia || {});
const negocio = D.negocio || '[completar]';
const accion = D.accion || { texto: 'Escríbenos por WhatsApp' };
const portada = D.portada || {};
const secciones = D.secciones || [];
const menu = (D.menu || []).slice(0, 6);
const paginas = D.paginas && D.paginas.length ? D.paginas : [{ nombre: 'Inicio', secciones: ['portada', ...secciones.map((s) => s.tipo)] }];
const sobrePrim = sobre(P.primario);
const fuenteT = `'${T.titulos}', Georgia, 'Times New Roman', serif`;
const fuenteX = `'${T.texto}', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`;

// ---------- reglas de dimensión (fijas) ----------
const R = {
  anchos: [360, 768, 1280], contenedor: 1200, columnas: 12, canal: 24, margen_movil: 16, columnas_movil: 4, canal_movil: 16,
  pliegue: { 1280: 720, 768: 1024, 360: 640 }, tactil: 44, boton: 48, medida: [45, 75], base8: [4, 8, 16, 24, 32, 48, 64, 96, 128],
};

// ---------- validación ----------
const hallazgos = [];
const regla = (ok, nivel, texto) => hallazgos.push({ ok, nivel, texto });
const pares = [
  ['Texto sobre fondo', P.texto, P.fondo, 4.5],
  ['Texto sobre superficie', P.texto, P.superficie, 4.5],
  ['Texto suave sobre fondo', P.suave, P.fondo, 4.5],
  ['Botón: texto sobre primario', sobrePrim, P.primario, 4.5],
  ['Acento sobre fondo (solo títulos ≥ 24 px o iconos)', P.acento, P.fondo, 3],
  ['Borde de campo de formulario (texto suave) sobre fondo', P.suave, P.fondo, 3],
];
for (const [n, a, b, min] of pares) {
  const c = contraste(a, b);
  regla(c >= min, min >= 4.5 ? 'error' : 'aviso', `${n}: ${r1(c)}:1 (mínimo ${min}:1)`);
}
const tituloP = portada.titulo || '';
const palabras = tituloP.replace(/\*/g, '').trim().split(/\s+/).filter(Boolean).length;
regla(palabras > 0 && palabras <= 10, 'error', `Título de portada: ${palabras} palabras (de 2 a 10; se lee en 3 segundos)`);
const sub = portada.subtitulo || '';
regla(sub.length <= 160, 'aviso', `Subtítulo de portada: ${sub.length} caracteres (máximo 160)`);
regla((D.menu || []).length <= 5, 'error', `Menú: ${(D.menu || []).length} opciones (máximo 5; la acción principal va aparte, como botón)`);
regla(T.medida_ch >= R.medida[0] && T.medida_ch <= R.medida[1], 'error', `Largo de línea del texto corrido: ${T.medida_ch} caracteres (entre 45 y 75)`);
regla(T.base >= 16, 'error', `Texto base: ${T.base} px (mínimo 16 px; en el teléfono, menos obliga a hacer zoom)`);
regla(T.escala >= 1.125 && T.escala <= 1.5, 'aviso', `Escala tipográfica de escritorio: ${T.escala} (entre 1,125 y 1,5)`);
regla(!!(accion.texto && accion.texto.split(/\s+/).length <= 5), 'error', `Acción principal: «${accion.texto || ''}» (un verbo y máximo 5 palabras)`);
regla(secciones.length >= 3 && secciones.length <= 9, 'aviso', `Secciones de la página de inicio: ${secciones.length} (entre 3 y 9)`);
const inventa = JSON.stringify(D).match(/(\d+\s*%\s*de\s*clientes|miles de clientes|n[uú]mero\s*1|el mejor del per[uú])/i);
regla(!inventa, 'error', inventa ? `Dato sin respaldo: «${inventa[0]}». Si el cliente no lo dio, va [completar]` : 'Sin cifras ni premios inventados');
const falta = (JSON.stringify(D).match(/\[completar[^\]]*\]/g) || []).length;
regla(true, 'info', falta ? `${falta} dato(s) en [completar]: pídeselos al cliente antes de aprobar` : 'Ningún dato pendiente');
const errores = hallazgos.filter((h) => !h.ok && h.nivel === 'error');
const avisos = hallazgos.filter((h) => !h.ok && h.nivel === 'aviso');

// ---------- wireframes (SVG en gris, rejilla real) ----------
const G = { fondo: '#f4f4f4', caja: '#d9d9d9', linea: '#bdbdbd', titulo: '#8a8a8a', texto: '#b8b8b8', marca: '#6f6f6f', guia: 'rgba(230,80,80,.08)' };
const colD = (i) => 40 + i * (78 + 24); const anD = (n) => n * 78 + (n - 1) * 24;
const colM = (i) => 16 + i * (70 + 16); const anM = (n) => n * 70 + (n - 1) * 16;
const img = (x, y, w, h, r = 6) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${G.caja}"/><path d="M${x} ${y}L${x + w} ${y + h}M${x + w} ${y}L${x} ${y + h}" stroke="${G.linea}" stroke-width="1.5"/>`;
const barras = (x, y, w, n, alto = 10, sep = 18) => Array.from({ length: n }, (_, i) => `<rect x="${x}" y="${y + i * sep}" width="${i === n - 1 ? w * 0.62 : w}" height="${alto}" rx="3" fill="${G.texto}"/>`).join('');
const tit = (x, y, w, h = 22) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="${G.titulo}"/>`;
const btn = (x, y, w, h = 48, lleno = true) => lleno ? `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${G.marca}"/>` : `<rect x="${x + 1}" y="${y + 1}" width="${w - 2}" height="${h - 2}" rx="8" fill="none" stroke="${G.marca}" stroke-width="2"/>`;
const etiqueta = (x, y, t) => `<text x="${x}" y="${y}" font-size="13" font-family="system-ui,sans-serif" fill="#9a3b3b">${esc(t)}</text>`;
const rejilla = (alto, movil) => movil
  ? Array.from({ length: 4 }, (_, i) => `<rect x="${colM(i)}" y="0" width="70" height="${alto}" fill="${G.guia}"/>`).join('')
  : Array.from({ length: 12 }, (_, i) => `<rect x="${colD(i)}" y="0" width="78" height="${alto}" fill="${G.guia}"/>`).join('');

function wire(tipo, movil, n = 3) {
  // Devuelve [alto, contenido] de la sección en 1280 (movil=false) o 360 (movil=true)
  const W = movil ? 360 : 1280;
  if (tipo === 'portada') {
    if (movil) return [600, `${tit(16, 40, 300, 30)}${tit(16, 80, 220, 30)}${barras(16, 130, 328, 3)}${btn(16, 200, 328)}${btn(16, 260, 328, 48, false)}${img(16, 330, 328, 240)}${etiqueta(16, 324, 'pliegue a 640 px: el botón ya se ve')}`];
    return [560, `${tit(colD(0), 120, anD(5), 44)}${tit(colD(0), 176, anD(4), 44)}${barras(colD(0), 250, anD(5), 3, 12, 22)}${btn(colD(0), 340, 220)}${btn(colD(0) + 236, 340, 180, 48, false)}${img(colD(6), 60, anD(6), 440, 10)}${etiqueta(colD(0), 60, 'texto: 6 col · imagen: 6 col')}`];
  }
  if (['beneficios', 'proceso', 'servicios', 'valores'].includes(tipo)) {
    const k = Math.min(Math.max(n, 2), 4); const span = 12 / k;
    if (movil) return [90 + k * 120, `${tit(16, 30, 240)}${Array.from({ length: k }, (_, i) => `<circle cx="40" cy="${100 + i * 120}" r="22" fill="${G.caja}"/>${tit(76, 84 + i * 120, 200, 16)}${barras(76, 110 + i * 120, 268, 2)}`).join('')}`];
    return [300, `${tit(colD(0), 40, anD(5), 30)}${Array.from({ length: k }, (_, i) => `<circle cx="${colD(i * span) + 30}" cy="${140}" r="28" fill="${G.caja}"/>${tit(colD(i * span), 186, anD(span) * 0.7, 18)}${barras(colD(i * span), 220, anD(span), 3)}`).join('')}${etiqueta(colD(0), 24, `${k} × ${span} columnas`)}`];
  }
  if (['catalogo', 'menu', 'productos', 'galeria'].includes(tipo)) {
    if (movil) return [700, `${tit(16, 30, 220)}${Array.from({ length: 4 }, (_, i) => { const x = i % 2 ? colM(2) : colM(0), y = 80 + Math.floor(i / 2) * 300; return `${img(x, y, anM(2), 170)}${tit(x, y + 184, 110, 14)}${barras(x, y + 208, anM(2), 2)}${tipo === 'galeria' ? '' : btn(x, y + 246, anM(2), 44, false)}`; }).join('')}${etiqueta(16, 66, '2 por fila · botón 44 px')}`];
    return [480, `${tit(colD(0), 40, anD(4), 30)}${Array.from({ length: 4 }, (_, i) => `${img(colD(i * 3), 100, anD(3), 220)}${tit(colD(i * 3), 336, 160, 16)}${barras(colD(i * 3), 364, anD(3), 2)}${tipo === 'galeria' ? '' : btn(colD(i * 3), 410, anD(3), 44, false)}`).join('')}${etiqueta(colD(0), 24, '4 × 3 columnas')}`];
  }
  if (['testimonios', 'opiniones'].includes(tipo)) {
    if (movil) return [300, `${tit(16, 30, 220)}<rect x="16" y="80" width="328" height="190" rx="10" fill="none" stroke="${G.linea}" stroke-width="2"/>${barras(36, 104, 288, 4)}<circle cx="52" cy="226" r="18" fill="${G.caja}"/>${tit(80, 218, 140, 14)}${etiqueta(16, 292, 'se desliza de lado · solo opiniones reales')}`];
    return [320, `${tit(colD(0), 40, anD(4), 30)}${Array.from({ length: 3 }, (_, i) => `<rect x="${colD(i * 4)}" y="100" width="${anD(4)}" height="190" rx="10" fill="none" stroke="${G.linea}" stroke-width="2"/>${barras(colD(i * 4) + 24, 128, anD(4) - 48, 4)}<circle cx="${colD(i * 4) + 44}" cy="${250}" r="18" fill="${G.caja}"/>${tit(colD(i * 4) + 74, 242, 120, 14)}`).join('')}${etiqueta(colD(0), 24, '3 × 4 columnas · solo opiniones reales')}`];
  }
  if (['preguntas', 'faq'].includes(tipo)) {
    const k = Math.min(Math.max(n, 3), 6);
    if (movil) return [90 + k * 64, `${tit(16, 30, 240)}${Array.from({ length: k }, (_, i) => `<rect x="16" y="${80 + i * 64}" width="328" height="52" rx="8" fill="none" stroke="${G.linea}" stroke-width="2"/>${tit(32, 98 + i * 64, 220, 14)}<path d="M318 ${100 + i * 64}l6 6 6-6" stroke="${G.marca}" stroke-width="2" fill="none"/>`).join('')}`];
    return [110 + k * 64, `${tit(colD(2), 40, anD(5), 30)}${Array.from({ length: k }, (_, i) => `<rect x="${colD(2)}" y="${96 + i * 64}" width="${anD(8)}" height="52" rx="8" fill="none" stroke="${G.linea}" stroke-width="2"/>${tit(colD(2) + 20, 114 + i * 64, 420, 14)}<path d="M${colD(2) + anD(8) - 34} ${116 + i * 64}l6 6 6-6" stroke="${G.marca}" stroke-width="2" fill="none"/>`).join('')}${etiqueta(colD(2), 24, '8 columnas centradas: la línea no pasa de 75 caracteres')}`];
  }
  if (['ubicacion', 'contacto', 'horario'].includes(tipo)) {
    if (movil) return [560, `${tit(16, 30, 240)}${barras(16, 80, 328, 4)}${btn(16, 170, 328)}${img(16, 240, 328, 220)}${barras(16, 480, 328, 3)}`];
    return [420, `${tit(colD(0), 60, anD(4), 30)}${barras(colD(0), 120, anD(5), 5, 12, 24)}${btn(colD(0), 270, 240)}${img(colD(6), 40, anD(6), 340, 10)}${etiqueta(colD(0), 30, 'datos: 5 col · mapa o foto: 6 col')}`];
  }
  if (['promocion', 'oferta', 'banda'].includes(tipo)) {
    if (movil) return [260, `<rect x="16" y="20" width="328" height="220" rx="12" fill="${G.caja}"/>${tit(36, 50, 240, 26)}${barras(36, 96, 288, 2)}${btn(36, 160, 288)}`];
    return [220, `<rect x="${colD(0)}" y="20" width="${anD(12)}" height="180" rx="14" fill="${G.caja}"/>${tit(colD(1), 70, anD(6), 34)}${barras(colD(1), 124, anD(6), 2)}${btn(colD(9), 86, anD(3))}`];
  }
  // genérica: título + párrafo + imagen
  if (movil) return [420, `${tit(16, 30, 240)}${barras(16, 80, 328, 5)}${img(16, 190, 328, 200)}`];
  return [340, `${tit(colD(0), 40, anD(5), 30)}${barras(colD(0), 100, anD(6), 6, 12, 22)}${img(colD(7), 40, anD(5), 260, 10)}`];
}
function svgWire(tipo, movil, n) {
  const W = movil ? 360 : 1280; const [h, c] = wire(tipo, movil, n);
  return `<svg viewBox="0 0 ${W} ${h}" width="${W}" height="${h}" role="img" aria-label="Wireframe ${esc(tipo)} a ${W} px"><rect width="${W}" height="${h}" fill="${G.fondo}"/>${rejilla(h, movil)}${c}</svg>`;
}
const encabezadoWire = (movil) => {
  const W = movil ? 360 : 1280;
  return movil
    ? `<svg viewBox="0 0 360 64" width="360" height="64"><rect width="360" height="64" fill="#e9e9e9"/>${tit(16, 22, 110, 20)}<rect x="300" y="10" width="44" height="44" rx="8" fill="none" stroke="${G.marca}" stroke-width="2"/><path d="M311 25h22M311 32h22M311 39h22" stroke="${G.marca}" stroke-width="2"/>${etiqueta(176, 38, 'menú 44 × 44')}</svg>`
    : `<svg viewBox="0 0 1280 80" width="1280" height="80"><rect width="1280" height="80" fill="#e9e9e9"/>${tit(colD(0), 28, 150, 24)}${menu.map((_, i) => `<rect x="${colD(5) + i * 110}" y="34" width="80" height="12" rx="3" fill="${G.titulo}"/>`).join('')}${btn(colD(10), 16, anD(2))}</svg>`;
};

// ---------- portada en alta fidelidad ----------
const marcar = (t) => esc(t).replace(/\*([^*]+)\*/g, '<em>$1</em>');
const icono = {
  chat: '<path d="M4 5h16v11H9l-5 4z"/>', pin: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  reloj: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/>', envio: '<path d="M3 7h11v9H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/>',
  pago: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18M7 15h4"/>', estrella: '<path d="M12 4l2.4 5 5.4.6-4 3.7 1.1 5.3L12 16l-4.9 2.6 1.1-5.3-4-3.7 5.4-.6z"/>',
  bolsa: '<path d="M5 8h14l-1 12H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>', telefono: '<path d="M6 3h4l1.5 5-2.5 1.5a11 11 0 0 0 5.5 5.5l1.5-2.5 5 1.5v4a2 2 0 0 1-2 2A17 17 0 0 1 4 5a2 2 0 0 1 2-2z"/>',
  hoja: '<path d="M5 19c0-9 6-14 14-14 0 8-5 14-14 14zM5 19l7-7"/>', plato: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="3.5"/>',
};
const ico = (n, s = 24) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icono[n] || icono.estrella}</svg>`;
const foto = (desc, alto) => `<figure class="mk-foto" style="height:${alto}px"><span class="mk-forma a"></span><span class="mk-forma b"></span><figcaption>Foto por producir: ${esc(desc || '[completar]')}</figcaption></figure>`;
const primera = secciones.find((s) => (s.items || []).length && !['catalogo', 'menu', 'productos', 'preguntas', 'faq'].includes(s.tipo)) || secciones.find((s) => (s.items || []).length) || { tipo: 'beneficios', titulo: '', items: [] };
const tarjetasPrimera = (primera.items || []).slice(0, 4).map((it, i) => `<article class="mk-card"><span class="mk-ico">${ico(it.icono || ['estrella', 'envio', 'pago', 'reloj'][i])}</span><h3>${esc(it.titulo || it.nombre || '')}</h3><p>${esc(it.texto || it.detalle || '')}</p></article>`).join('');

function mockup(movil) {
  const W = movil ? 360 : 1280, pl = R.pliegue[W];
  const nav = movil
    ? `<header class="mk-nav"><span class="mk-logo">${esc(negocio)}</span><button class="mk-menu" aria-label="Abrir menú"><span></span><span></span><span></span></button></header>`
    : `<header class="mk-nav"><span class="mk-logo">${esc(negocio)}</span><nav>${menu.map((m) => `<a>${esc(m)}</a>`).join('')}</nav><a class="mk-btn chico">${ico('chat', 18)} ${esc(accion.texto)}</a></header>`;
  const hero = `<section class="mk-hero"><div class="mk-hero-txt">${portada.etiqueta ? `<p class="mk-eti">${esc(portada.etiqueta)}</p>` : ''}<h1>${marcar(portada.titulo || '[completar]')}</h1><p class="mk-sub">${esc(portada.subtitulo || '')}</p><div class="mk-acciones"><a class="mk-btn">${ico('chat', 20)} ${esc(accion.texto)}</a>${portada.secundaria ? `<a class="mk-btn sec">${esc(portada.secundaria)}</a>` : ''}</div>${portada.prueba ? `<p class="mk-prueba">${esc(portada.prueba)}</p>` : ''}</div>${foto(portada.imagen, movil ? 260 : 470)}</section>`;
  const sig = `<section class="mk-sig"><h2>${esc(primera.titulo || '')}</h2><div class="mk-cards">${tarjetasPrimera}</div></section>`;
  return `<div class="mk ${movil ? 'mk-m' : 'mk-d'}" style="width:${W}px;min-height:${pl + (movil ? 260 : 300)}px">${nav}${hero}${sig}<div class="mk-pliegue" style="top:${pl}px"><span>Pliegue: primer pantallazo ${W} × ${pl} px</span></div></div>`;
}

// ---------- mapa del sitio ----------
function mapa() {
  const n = paginas.length, ancho = Math.max(760, n * 210), x0 = ancho / 2;
  const alto = 110 + Math.max(...paginas.map((p) => (p.secciones || []).length)) * 26 + 90;
  let s = `<svg viewBox="0 0 ${ancho} ${alto}" width="100%" style="max-width:${ancho}px;display:block;margin:0 auto" role="img" aria-label="Mapa del sitio"><rect x="${x0 - 90}" y="10" width="180" height="44" rx="8" fill="#222"/><text x="${x0}" y="38" text-anchor="middle" fill="#fff" font-size="15" font-weight="700">${esc(negocio)}</text>`;
  paginas.forEach((p, i) => {
    const x = (ancho / n) * (i + 0.5);
    s += `<path d="M${x0} 54V72H${x}V92" fill="none" stroke="#999" stroke-width="1.5"/><rect x="${x - 92}" y="92" width="184" height="36" rx="6" fill="#fff" stroke="#222" stroke-width="1.5"/><text x="${x}" y="115" text-anchor="middle" font-size="14" font-weight="700" fill="#222">${esc(p.nombre)}</text>`;
    (p.secciones || []).forEach((sec, j) => { s += `<text x="${x - 80}" y="${152 + j * 26}" font-size="13" fill="#555">${j + 1}. ${esc(sec)}</text>`; });
  });
  s += `<text x="${x0}" y="${alto - 18}" text-anchor="middle" font-size="13" fill="#9a3b3b">Toda página termina en la misma acción: ${esc(accion.texto)}</text></svg>`;
  return s;
}

// ---------- guía de estilo ----------
const escalaD = [-1, 0, 1, 2, 3, 4, 5].map((k) => Math.round(T.base * T.escala ** k));
const escalaM = [-1, 0, 1, 2, 3, 4, 5].map((k) => Math.round(T.base * T.escala_movil ** k));
const nombresEsc = ['Pequeño', 'Cuerpo', 'H4', 'H3', 'H2', 'H1', 'Portada'];
const hover = mezclar(P.primario, '#000000', 0.12), presion = mezclar(P.primario, '#000000', 0.24);
const muestras = [['fondo', 'Fondo'], ['superficie', 'Superficie'], ['texto', 'Texto'], ['suave', 'Texto suave'], ['primario', 'Primario (acción)'], ['acento', 'Acento'], ['borde', 'Borde']];

const filasReglas = [
  ['Anchos de diseño', '360 · 768 · 1280 px', 'Se diseña primero 360 (teléfono). 768 es tableta; 1280, laptop.'],
  ['Contenedor', `máx. ${R.contenedor} px centrado`, 'En 1280 deja 40 px a cada lado.'],
  ['Rejilla escritorio', '12 columnas de 78 px · canal 24 px', 'Todo empieza y termina en una columna.'],
  ['Rejilla teléfono', '4 columnas de 70 px · canal 16 · margen 16', 'Tarjetas a 2 columnas o a ancho completo.'],
  ['Primer pantallazo', '1280 × 720 · 768 × 1024 · 360 × 640', 'Nombre, promesa y botón de acción antes del pliegue.'],
  ['Área táctil', `mínimo ${R.tactil} × ${R.tactil} px`, `Botones de ${R.boton} px de alto; 8 px entre dos áreas táctiles.`],
  ['Largo de línea', '45 a 75 caracteres', `Texto corrido a ${T.medida_ch} ch como máximo.`],
  ['Espaciado', 'múltiplos de 8 px (4 solo dentro de un componente)', 'Entre secciones: 96 px en escritorio, 64 en teléfono.'],
  ['Texto', `base ${T.base} px · interlineado ${T.linea}`, `Escala ${T.escala} en escritorio y ${T.escala_movil} en teléfono.`],
  ['Contraste', '4,5:1 texto · 3:1 títulos grandes e iconos', 'Se calcula, no se mira a ojo.'],
];

const manual = [
  'El nombre del negocio y lo que vende se entienden en 5 segundos sin hacer scroll.',
  'El botón de acción se ve en el primer pantallazo a 360 y a 1280 px.',
  'No hay precios, cifras, premios ni opiniones que el cliente no haya dado.',
  'Cada foto indicada se puede producir: dice qué se ve, la luz y el fondo.',
  'Las personas en fotos van sin aretes ni joyas; nada de platos de cerdo.',
  'A 360 px nada se sale por los lados y ningún texto queda menor de 16 px.',
  'El menú tiene 5 opciones o menos y lleva a secciones que existen en el mapa.',
  'El cliente aprobó por escrito: tablero, versión y fecha.',
];

// ---------- HTML del tablero ----------
const fuentesG = [...new Set([T.titulos, T.texto])].filter((f) => !/^(georgia|arial|system-ui|helvetica|times)/i.test(f)).map((f) => 'family=' + f.replace(/ /g, '+') + ':wght@400;600;700').join('&');
const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Tablero de diseño · ${esc(negocio)}</title>
${fuentesG ? `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?${fuentesG}&display=swap">` : ''}
<style>
:root { color-scheme: light; --t-bg:#eceae6; --t-hoja:#ffffff; --t-txt:#1c1c1c; --t-suave:#5f5f5f; --t-linea:#d6d3cd; --t-rojo:#9a3b3b; --t-ok:#1d6b3a;
  --fondo:${P.fondo}; --sup:${P.superficie}; --txt:${P.texto}; --suave:${P.suave}; --prim:${P.primario}; --sobre:${sobrePrim}; --acento:${P.acento}; --borde:${P.borde}; --hover:${hover}; --presion:${presion};
  --ft:${fuenteT}; --fx:${fuenteX}; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--t-bg); color: var(--t-txt); font: 15px/1.55 system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; }
.t-pag { max-width: 1440px; margin: 0 auto; padding: 32px 24px 80px; }
.t-cab { display: flex; flex-wrap: wrap; gap: 8px 24px; align-items: end; justify-content: space-between; border-bottom: 2px solid var(--t-txt); padding-bottom: 16px; margin-bottom: 24px; }
.t-cab h1 { margin: 0; font-size: 30px; letter-spacing: -.01em; }
.t-cab p { margin: 0; color: var(--t-suave); }
.t-sello { font: 600 12px/1 ui-monospace, Menlo, monospace; text-transform: uppercase; letter-spacing: .08em; border: 1.5px solid var(--t-txt); padding: 8px 10px; border-radius: 4px; }
.t-sec { background: var(--t-hoja); border: 1px solid var(--t-linea); border-radius: 10px; padding: 24px; margin: 0 0 24px; }
.t-sec > h2 { margin: 0 0 4px; font-size: 20px; display: flex; gap: 12px; align-items: baseline; }
.t-sec > h2 b { font: 700 12px/1 ui-monospace, Menlo, monospace; color: var(--t-rojo); }
.t-sec > p.t-nota { margin: 0 0 16px; color: var(--t-suave); max-width: 75ch; }
.t-grid2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; }
.t-ficha { border: 1px solid var(--t-linea); border-radius: 8px; padding: 14px 16px; }
.t-ficha h3 { margin: 0 0 4px; font-size: 12px; text-transform: uppercase; letter-spacing: .08em; color: var(--t-suave); }
.t-ficha p { margin: 0; }
.t-wire { display: grid; grid-template-columns: minmax(0, 3.2fr) minmax(0, 1fr); gap: 16px; align-items: start; margin: 0 0 20px; }
.t-wire svg { width: 100%; height: auto; display: block; border: 1px solid var(--t-linea); border-radius: 6px; }
.t-wire h3 { grid-column: 1 / -1; margin: 8px 0 -6px; font-size: 14px; }
.t-wire h3 small { font-weight: 400; color: var(--t-suave); }
.t-esc { overflow: hidden; border: 1px solid var(--t-linea); border-radius: 8px; background: #fff; position: relative; }
.t-esc > .mk { transform-origin: 0 0; position: absolute; top: 0; left: 0; }
.t-mocks { display: grid; grid-template-columns: minmax(0, 3.2fr) minmax(0, 1fr); gap: 16px; align-items: start; }
.t-mocks figcaption { font-size: 13px; color: var(--t-suave); margin-top: 6px; }
table { border-collapse: collapse; width: 100%; font-size: 14px; }
th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid var(--t-linea); vertical-align: top; }
th { font-size: 12px; text-transform: uppercase; letter-spacing: .06em; color: var(--t-suave); }
.ok { color: var(--t-ok); font-weight: 700; } .mal { color: var(--t-rojo); font-weight: 700; } .av { color: #8a5a00; font-weight: 700; }
.sw { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; }
.sw div { border: 1px solid var(--t-linea); border-radius: 8px; overflow: hidden; font-size: 13px; }
.sw i { display: block; height: 72px; }
.sw span { display: block; padding: 8px 10px; }
.sw code { font-size: 12px; color: var(--t-suave); }
.esc-tipo div { display: grid; grid-template-columns: 90px 120px 1fr; gap: 12px; align-items: baseline; padding: 6px 0; border-bottom: 1px dashed var(--t-linea); }
.esc-tipo small { color: var(--t-suave); font: 12px/1.3 ui-monospace, Menlo, monospace; }
.medida { font-family: var(--fx); font-size: ${T.base}px; line-height: ${T.linea}; max-width: ${T.medida_ch}ch; background: repeating-linear-gradient(90deg, transparent 0 calc(10ch - 1px), rgba(154,59,59,.25) calc(10ch - 1px) 10ch); padding: 8px 0; color: #222; }
.esp { display: flex; flex-wrap: wrap; gap: 16px; align-items: end; }
.esp div { text-align: center; font: 12px ui-monospace, Menlo, monospace; color: var(--t-suave); }
.esp i { display: block; background: var(--t-rojo); opacity: .7; margin: 0 auto 6px; }
.lienzo { background: var(--fondo); color: var(--txt); font-family: var(--fx); border-radius: 8px; padding: 20px; border: 1px solid var(--t-linea); }
.estados { display: flex; flex-wrap: wrap; gap: 16px; align-items: start; }
.estados figure { margin: 0; text-align: center; font: 12px ui-monospace, Menlo, monospace; color: var(--suave); }
.b { display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 48px; min-width: 44px; padding: 0 20px; border-radius: 8px; border: 2px solid var(--prim); background: var(--prim); color: var(--sobre); font: 600 16px/1 var(--fx); margin-bottom: 6px; }
.b.h { background: var(--hover); border-color: var(--hover); } .b.p { background: var(--presion); border-color: var(--presion); transform: translateY(1px); }
.b.f { outline: 3px solid var(--acento); outline-offset: 2px; } .b.d { background: #d8d8d8; border-color: #d8d8d8; color: #6a6a6a; }
.b.s { background: transparent; color: var(--prim); } .b.ic { padding: 0; width: 48px; }
.iconos { display: flex; flex-wrap: wrap; gap: 14px; color: var(--txt); }
.iconos div { width: 76px; text-align: center; font: 11px ui-monospace, Menlo, monospace; color: var(--suave); }
.iconos span { display: grid; place-items: center; width: 44px; height: 44px; margin: 0 auto 4px; border-radius: 8px; background: var(--sup); color: var(--prim); outline: 1px dashed var(--borde); }
.comp { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 20px; }
.c-card { background: var(--sup); border-radius: 12px; overflow: hidden; border: 1px solid var(--borde); }
.c-card .mk-foto { height: 160px; border-radius: 0; }
.c-card div { padding: 16px; } .c-card h4 { margin: 0 0 4px; font: 600 20px/1.2 var(--ft); } .c-card p { margin: 0 0 12px; color: var(--suave); font-size: 15px; }
.c-precio { font-weight: 700; color: var(--txt); }
.c-campo label { display: block; font-weight: 600; margin-bottom: 6px; } .c-campo input { width: 100%; height: 48px; border: 1.5px solid var(--suave); border-radius: 8px; padding: 0 14px; font: 16px var(--fx); background: var(--fondo); color: var(--txt); }
.c-campo.err input { border-color: #b3261e; } .c-campo small { display: block; margin-top: 6px; color: var(--suave); } .c-campo.err small { color: #b3261e; }
.c-acor { border: 1px solid var(--borde); border-radius: 10px; background: var(--sup); }
.c-acor p { margin: 0; padding: 14px 16px; display: flex; justify-content: space-between; font-weight: 600; min-height: 52px; align-items: center; }
.c-acor p + p { border-top: 1px solid var(--borde); } .c-acor .abierta { display: block; font-weight: 400; color: var(--suave); }
.c-flot { width: 56px; height: 56px; border-radius: 50%; background: var(--prim); color: var(--sobre); display: grid; place-items: center; box-shadow: 0 6px 18px rgba(0,0,0,.2); }
.chk li { margin: 6px 0; list-style: none; } .chk { padding: 0; } .chk input { width: 18px; height: 18px; vertical-align: -3px; margin-right: 8px; }
/* ---- maqueta de marca (alta fidelidad) ---- */
.mk { background: var(--fondo); color: var(--txt); font-family: var(--fx); font-size: ${T.base}px; line-height: ${T.linea}; position: relative; }
.mk em { font-style: italic; color: var(--acento); }
.mk-nav { display: flex; align-items: center; justify-content: space-between; height: 80px; padding: 0 40px; border-bottom: 1px solid var(--borde); }
.mk-logo { font: 700 24px/1 var(--ft); letter-spacing: .01em; }
.mk-nav nav { display: flex; gap: 32px; font-size: 15px; } .mk-nav nav a { color: var(--txt); }
.mk-btn { display: inline-flex; align-items: center; gap: 10px; height: 48px; padding: 0 24px; border-radius: 8px; background: var(--prim); color: var(--sobre); font-weight: 600; font-size: 16px; white-space: nowrap; }
.mk-btn.chico { height: 44px; padding: 0 18px; font-size: 15px; } .mk-btn.sec { background: transparent; color: var(--prim); box-shadow: inset 0 0 0 2px var(--prim); }
.mk-hero { display: grid; grid-template-columns: 6fr 6fr; gap: 24px; align-items: center; padding: 56px 40px 48px; }
.mk-eti { font-size: 13px; text-transform: uppercase; letter-spacing: .14em; color: var(--suave); margin: 0 0 16px; font-weight: 600; }
.mk-hero h1 { font: 600 ${escalaD[6]}px/1.08 var(--ft); margin: 0 0 20px; letter-spacing: -.015em; }
.mk-sub { font-size: ${escalaD[2]}px; color: var(--suave); margin: 0 0 32px; max-width: ${Math.min(T.medida_ch, 52)}ch; }
.mk-acciones { display: flex; gap: 16px; flex-wrap: wrap; } .mk-prueba { font-size: 14px; color: var(--suave); margin: 20px 0 0; }
.mk-foto { margin: 0; position: relative; border-radius: 14px; overflow: hidden; background: linear-gradient(150deg, ${mezclar(P.acento, P.fondo, 0.55)}, ${mezclar(P.primario, P.fondo, 0.25)}); display: flex; align-items: end; }
.mk-forma { position: absolute; border-radius: 50%; } .mk-forma.a { width: 46%; aspect-ratio: 1; right: 12%; top: 14%; background: ${mezclar(P.acento, '#ffffff', 0.25)}; opacity: .75; }
.mk-forma.b { width: 30%; aspect-ratio: .55; border-radius: 40% 40% 12px 12px; left: 18%; bottom: 14%; background: ${mezclar(P.primario, '#000000', 0.1)}; opacity: .85; }
.mk-foto figcaption { position: relative; margin: 12px; padding: 8px 10px; background: rgba(255,255,255,.88); color: #222; font: 12px/1.35 ui-monospace, Menlo, monospace; border-radius: 6px; }
.mk-sig { padding: 40px 40px 56px; background: var(--sup); } .mk-sig h2 { font: 600 ${escalaD[4]}px/1.15 var(--ft); margin: 0 0 24px; }
.mk-cards { display: grid; grid-template-columns: repeat(${Math.min(Math.max((primera.items || []).length, 1), 4)}, 1fr); gap: 24px; }
.mk-card { background: var(--fondo); border-radius: 12px; padding: 24px; border: 1px solid var(--borde); } .mk-card h3 { margin: 12px 0 6px; font-size: ${escalaD[2]}px; } .mk-card p { margin: 0; color: var(--suave); font-size: 15px; }
.mk-ico { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 10px; background: var(--sup); color: var(--prim); }
.mk-pliegue { position: absolute; left: 0; right: 0; border-top: 2px dashed #d32f2f; pointer-events: none; }
.mk-pliegue span { position: absolute; right: 8px; top: 4px; background: #d32f2f; color: #fff; font: 600 12px/1 ui-monospace, Menlo, monospace; padding: 5px 7px; border-radius: 3px; }
.mk-m .mk-nav { height: 64px; padding: 0 16px; } .mk-m .mk-logo { font-size: 20px; }
.mk-menu { width: 44px; height: 44px; border-radius: 8px; border: 1.5px solid var(--borde); background: transparent; display: grid; place-content: center; gap: 5px; padding: 0; }
.mk-menu span { display: block; width: 20px; height: 2px; background: var(--txt); }
.mk-m .mk-hero { grid-template-columns: 1fr; padding: 28px 16px 32px; gap: 24px; }
.mk-m .mk-hero h1 { font-size: ${escalaM[6]}px; } .mk-m .mk-sub { font-size: ${escalaM[1]}px; margin-bottom: 24px; }
.mk-m .mk-acciones { flex-direction: column; } .mk-m .mk-btn { justify-content: center; width: 100%; }
.mk-m .mk-sig { padding: 32px 16px; } .mk-m .mk-sig h2 { font-size: ${escalaM[4]}px; } .mk-m .mk-cards { grid-template-columns: 1fr; gap: 16px; }
@media (max-width: 860px) { .t-wire, .t-mocks { grid-template-columns: 1fr; } .esc-tipo div { grid-template-columns: 70px 1fr; } .esc-tipo div > :last-child { grid-column: 1 / -1; } }
@media print { body { background: #fff; } .t-sec { break-inside: avoid; } }
</style>
</head>
<body>
<div class="t-pag">
<header class="t-cab">
  <div><p>Tablero de diseño web · para aprobar, no para programar</p><h1>${esc(negocio)}${D.rubro ? ` · <span style="font-weight:400">${esc(D.rubro)}</span>` : ''}</h1></div>
  <span class="t-sello">Versión ${esc(D.version || '1')} · ${errores.length ? `${errores.length} regla(s) sin cumplir` : 'reglas cumplidas'}</span>
</header>

<section class="t-sec"><h2><b>01</b> Objetivo y público</h2><p class="t-nota">Lo que la web tiene que lograr. Todo lo demás del tablero se juzga contra esto.</p>
  <div class="t-grid2">
    <div class="t-ficha"><h3>Objetivo</h3><p>${esc(D.objetivo || '[completar]')}</p></div>
    <div class="t-ficha"><h3>Público</h3><p>${esc(D.publico || '[completar]')}</p></div>
    <div class="t-ficha"><h3>Acción principal</h3><p><b>${esc(accion.texto)}</b>${accion.whatsapp ? ` · WhatsApp ${esc(accion.whatsapp)}` : ''}</p></div>
    <div class="t-ficha"><h3>Cómo sabremos que funciona</h3><p>${esc(D.metrica || '[completar]')}</p></div>
    <div class="t-ficha"><h3>Tono</h3><p>${esc((D.tono || []).join(' · ') || '[completar]')}</p></div>
    <div class="t-ficha"><h3>Lo que no va</h3><p>${esc((D.evitar || []).join(' · ') || 'Datos inventados, fotos de banco genéricas')}</p></div>
  </div>
</section>

<section class="t-sec"><h2><b>02</b> Mapa del sitio</h2><p class="t-nota">Páginas y orden de las secciones. Si una sección no ayuda a la acción principal, sale.</p>${mapa()}</section>

<section class="t-sec"><h2><b>03</b> Wireframes de baja fidelidad</h2><p class="t-nota">Solo grises, para discutir orden y tamaño sin distraerse con colores. Las franjas rojas claras son las columnas: 12 de 78 px con canal de 24 en 1280; 4 de 70 px con canal de 16 en 360.</p>
  <div class="t-wire"><h3>Encabezado <small>· 1280 y 360</small></h3>${encabezadoWire(false)}${encabezadoWire(true)}</div>
  <div class="t-wire"><h3>Portada <small>· ${esc(portada.titulo ? portada.titulo.replace(/\*/g, '') : '')}</small></h3>${svgWire('portada', false)}${svgWire('portada', true)}</div>
  ${secciones.map((s, i) => `<div class="t-wire"><h3>${i + 2}. ${esc(s.titulo || s.tipo)} <small>· ${esc(s.tipo)}${s.nota ? ' · ' + esc(s.nota) : ''}</small></h3>${svgWire(s.tipo, false, (s.items || []).length)}${svgWire(s.tipo, true, (s.items || []).length)}</div>`).join('\n  ')}
</section>

<section class="t-sec" id="t-portada"><h2><b>04</b> Portada en alta fidelidad</h2><p class="t-nota">Lo que verá el cliente al abrir el enlace. La línea roja punteada es el pliegue: lo que está arriba se ve sin hacer scroll. Las fotos son indicaciones para producir, no imágenes finales.</p>
  <div class="t-mocks">
    <figure style="margin:0"><div class="t-esc" data-w="1280" data-h="${R.pliegue[1280] + 300}" style="aspect-ratio:1280/${R.pliegue[1280] + 300}">${mockup(false)}</div><figcaption>Laptop · 1280 px · pliegue a 720 px</figcaption></figure>
    <figure style="margin:0"><div class="t-esc" data-w="360" data-h="${R.pliegue[360] + 260}" style="aspect-ratio:360/${R.pliegue[360] + 260}">${mockup(true)}</div><figcaption>Teléfono · 360 px · pliegue a 640 px</figcaption></figure>
  </div>
</section>

<section class="t-sec"><h2><b>05</b> Guía de estilo</h2><p class="t-nota">Cada valor tiene una regla detrás. El contraste se calcula con la fórmula de WCAG 2.2.</p>
  <h3>Paleta</h3>
  <div class="sw">${muestras.map(([k, n]) => `<div><i style="background:${P[k]}"></i><span><b>${n}</b><br><code>${P[k]}</code></span></div>`).join('')}</div>
  <table style="margin-top:16px"><thead><tr><th>Par</th><th>Muestra</th><th>Contraste</th><th>Resultado</th></tr></thead><tbody>
  ${pares.map(([n, a, b, min]) => { const c = contraste(a, b); return `<tr><td>${esc(n)}</td><td><span style="display:inline-block;padding:4px 10px;border-radius:4px;background:${b};color:${a};border:1px solid #ccc;font-weight:600">Aa ${esc(negocio).slice(0, 14)}</span></td><td>${r1(c)}:1</td><td class="${c >= min ? 'ok' : (min >= 4.5 ? 'mal' : 'av')}">${c >= min ? 'Cumple' : 'No cumple'} (≥ ${min})</td></tr>`; }).join('')}
  </tbody></table>
  <h3 style="margin-top:24px">Tipografías y escala</h3>
  <p class="t-nota">Títulos: <b>${esc(T.titulos)}</b> · Texto: <b>${esc(T.texto)}</b> · base ${T.base} px · escala ${T.escala} (escritorio) y ${T.escala_movil} (teléfono).</p>
  <div class="esc-tipo lienzo">${nombresEsc.map((n, i) => `<div><small>${n}</small><small>${escalaD[i]} px · ${escalaM[i]} px</small><span style="font:${i >= 2 ? 600 : 400} ${Math.min(escalaD[i], 64)}px/1.2 ${i >= 2 ? 'var(--ft)' : 'var(--fx)'}">${i >= 2 ? esc(negocio) : 'Texto de lectura para el cliente'}</span></div>`).join('')}</div>
  <h3 style="margin-top:24px">Largo de línea: ${T.medida_ch} caracteres</h3>
  <p class="medida">${esc(D.parrafo_muestra || 'Este párrafo mide lo mismo que el texto corrido de la web. Cada franja marca diez caracteres. Entre cuarenta y cinco y setenta y cinco caracteres por línea, el ojo vuelve al inicio de la siguiente sin perderse; más largo cansa y más corto corta las ideas.')}</p>
  <h3 style="margin-top:24px">Espaciado de 8 px</h3>
  <div class="esp">${R.base8.map((v) => `<div><i style="width:${v}px;height:${v}px"></i>${v}</div>`).join('')}</div>
  <h3 style="margin-top:24px">Botones y estados</h3>
  <div class="lienzo estados">
    <figure><span class="b">${ico('chat', 20)} ${esc(accion.texto)}</span><figcaption>normal · 48 px</figcaption></figure>
    <figure><span class="b h">${ico('chat', 20)} ${esc(accion.texto)}</span><figcaption>encima (hover)</figcaption></figure>
    <figure><span class="b f">${ico('chat', 20)} ${esc(accion.texto)}</span><figcaption>foco del teclado</figcaption></figure>
    <figure><span class="b p">${ico('chat', 20)} ${esc(accion.texto)}</span><figcaption>presionado</figcaption></figure>
    <figure><span class="b d">${esc(accion.texto)}</span><figcaption>deshabilitado</figcaption></figure>
    <figure><span class="b s">${esc(portada.secundaria || 'Ver más')}</span><figcaption>secundario</figcaption></figure>
    <figure><span class="b ic" aria-label="Menú">${ico('chat', 22)}</span><figcaption>solo icono 48 × 48</figcaption></figure>
  </div>
  <h3 style="margin-top:24px">Iconografía</h3>
  <p class="t-nota">Una sola familia: trazo de 1,75 px, esquinas redondeadas, dibujados en 24 px y siempre dentro de un área de 44 × 44 px. Nunca iconos de colores ni emojis.</p>
  <div class="lienzo iconos">${Object.keys(icono).map((k) => `<div><span>${ico(k)}</span>${k}</div>`).join('')}</div>
</section>

<section class="t-sec"><h2><b>06</b> Componentes</h2><p class="t-nota">Las piezas que se repiten. Se diseñan una vez y se usan igual en todas las páginas.</p>
  <div class="lienzo comp">
    ${(() => { const cat = secciones.find((s) => ['catalogo', 'menu', 'productos'].includes(s.tipo)); const it = (cat && cat.items && cat.items[0]) || { nombre: '[completar]', detalle: '', precio: '' }; return `<div class="c-card">${foto(it.foto || it.nombre, 160)}<div><h4>${esc(it.nombre || it.titulo)}</h4><p>${esc(it.detalle || it.texto || '')}</p><p class="c-precio">${esc(it.precio || '[completar precio]')}</p><span class="b" style="width:100%">${ico('chat', 20)} Pedir este</span></div></div>`; })()}
    <div style="display:grid;gap:16px;align-content:start">
      <div class="c-campo"><label>Tu nombre</label><input value="" placeholder="Como quieres que te llamemos"><small>Lo usamos solo para responderte.</small></div>
      <div class="c-campo err"><label>Celular</label><input value="98 61"><small>Escribe los 9 dígitos de tu celular.</small></div>
    </div>
    <div style="display:grid;gap:16px;align-content:start">
      <div class="c-acor"><p>${esc(((secciones.find((s) => ['preguntas', 'faq'].includes(s.tipo)) || {}).items || [{ titulo: '¿Hacen envíos?' }])[0].titulo)} <span>−</span></p><p class="abierta">${esc(((secciones.find((s) => ['preguntas', 'faq'].includes(s.tipo)) || {}).items || [{ texto: '[completar]' }])[0].texto || '[completar]')}</p><p>Pregunta cerrada <span>+</span></p></div>
      <div style="display:flex;gap:16px;align-items:center"><span class="c-flot">${ico('chat', 26)}</span><span style="font-size:14px;color:var(--suave)">Botón flotante de WhatsApp · 56 px · abajo a la derecha, a 16 px de los bordes</span></div>
    </div>
  </div>
</section>

<section class="t-sec"><h2><b>07</b> Reglas de dimensión</h2><p class="t-nota">Las medidas con las que se diseña y con las que se revisa. Quien programe después las recibe tal cual.</p>
  <table><thead><tr><th>Regla</th><th>Valor</th><th>Para qué</th></tr></thead><tbody>${filasReglas.map((f) => `<tr><td><b>${f[0]}</b></td><td>${f[1]}</td><td>${f[2]}</td></tr>`).join('')}</tbody></table>
</section>

<section class="t-sec"><h2><b>08</b> Checklist de revisión</h2><p class="t-nota">Lo automático lo revisó el motor al generar este tablero. Lo manual lo marca quien revisa, con el cliente al lado.</p>
  <div class="t-grid2">
    <div><h3 style="margin-top:0">Automático</h3><ul class="chk">${hallazgos.map((h) => `<li><span class="${h.ok ? 'ok' : h.nivel === 'error' ? 'mal' : h.nivel === 'aviso' ? 'av' : ''}">${h.ok ? (h.nivel === 'info' ? 'ℹ' : '✓') : '✗'}</span> ${esc(h.texto)}</li>`).join('')}</ul></div>
    <div><h3 style="margin-top:0">Manual</h3><ul class="chk">${manual.map((m) => `<li><label><input type="checkbox">${esc(m)}</label></li>`).join('')}</ul></div>
  </div>
</section>
<p style="color:var(--t-suave);font-size:13px">Generado con la skill diseno-web (JMD Learning). Es un diseño para aprobar: el código se hace después, con estas medidas.</p>
</div>
<script>
(() => {
  const ajustar = () => document.querySelectorAll('.t-esc').forEach((c) => {
    const w = +c.dataset.w, h = +c.dataset.h, k = c.clientWidth / w;
    const m = c.firstElementChild; m.style.transform = 'scale(' + k + ')';
  });
  // Para capturas: alto total y posición de la portada (los lee capturar.sh con --dump-dom)
  const pt = document.getElementById('t-portada');
  document.body.dataset.alto = document.documentElement.scrollHeight;
  if (pt) { const r = pt.getBoundingClientRect(); document.body.dataset.portada = Math.round(r.top + scrollY) + ',' + Math.round(r.height); }
  ajustar(); addEventListener('resize', ajustar); document.fonts && document.fonts.ready.then(ajustar);
})();
</script>
</body>
</html>
`;

// ---------- salida ----------
for (const h of hallazgos) console.log(`${h.ok ? (h.nivel === 'info' ? 'INFO ' : 'OK   ') : h.nivel === 'error' ? 'ERROR' : 'AVISO'} ${h.texto}`);
if (!soloValidar) { writeFileSync(salida, html); console.log(`\nTablero: ${salida}`); }
console.log(errores.length ? `\n${errores.length} error(es): corrige diseno.json y vuelve a generar.` : `\nReglas cumplidas (${avisos.length} aviso/s).`);
process.exit(errores.length ? 1 : 0);
