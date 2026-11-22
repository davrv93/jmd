// Anuncio de ganador: texto, portapapeles, descargas (TXT/PNG/JSON), tarjeta en canvas y compartir.
// No toca `document`/`window` al importarse (solo dentro de las funciones) para que Node pueda importarlo.

import { formatearTiempo } from './cronometro.js';
import { exportarPartidasJson } from './partidas.js';

const COLOR_FONDO = '#fbf8f3';
const COLOR_ACENTO = '#d97757';
const COLOR_TEXTO = '#1b1310';
const COLOR_SUAVE = '#6b5d55';
const PIE = 'JMD Learning · Crucigrama IA';
const FUENTE_SISTEMA = 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
const FUENTE_MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace';

// ---------- utilidades puras ----------

function dosDigitos(n) {
  return String(n).padStart(2, '0');
}

/** Fecha dd/mm/aaaa a partir de un ISO (hora local). Si es inválida usa la fecha actual. */
export function formatearFecha(iso) {
  let fecha = new Date(iso);
  if (!Number.isFinite(fecha.getTime())) fecha = new Date();
  return `${dosDigitos(fecha.getDate())}/${dosDigitos(fecha.getMonth() + 1)}/${fecha.getFullYear()}`;
}

function datosPartida(partida = {}) {
  const jugador = String(partida.jugador ?? '').trim() || 'Jugador anónimo';
  const semilla = String(partida.semilla ?? '').trim().toUpperCase() || '—';
  const correctas = Number.isFinite(Number(partida.correctas)) ? Number(partida.correctas) : 0;
  const total = Number.isFinite(Number(partida.total)) ? Number(partida.total) : 0;
  return {
    jugador,
    semilla,
    correctas,
    total,
    completada: Boolean(partida.completada),
    tiempo: formatearTiempo(partida.duracionMs),
    fecha: formatearFecha(partida.fin),
  };
}

function normalizarHashtag(hashtag) {
  const texto = String(hashtag ?? '').trim();
  if (!texto) return '#JMDLearning';
  return texto.startsWith('#') ? texto : `#${texto}`;
}

function tituloPorDefecto(completada) {
  return completada ? '🏆 ¡Ganador del Crucigrama IA!' : '🧩 Partida del Crucigrama IA';
}

function nombreArchivo(partida, extension) {
  const semilla = String(partida?.semilla ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '') || 'SIN-SEMILLA';
  return `ganador-${semilla}.${extension}`;
}

/**
 * Texto del anuncio, p. ej.:
 * "🏆 ¡Ganador del Crucigrama IA!\n👤 Ana Pérez\n⏱ Tiempo: 02:14.5\n🧩 Semilla: K7Q2ZP · 10/10 palabras\n📅 22/11/2026\n#JMDLearning"
 * extra: { titulo, hashtag }
 */
export function textoAnuncio(partida, extra = {}) {
  const d = datosPartida(partida);
  const titulo = String(extra?.titulo ?? '').trim() || tituloPorDefecto(d.completada);
  const hashtag = normalizarHashtag(extra?.hashtag);
  return [
    titulo,
    `👤 ${d.jugador}`,
    `⏱ Tiempo: ${d.tiempo}`,
    `🧩 Semilla: ${d.semilla} · ${d.correctas}/${d.total} palabras`,
    `📅 ${d.fecha}`,
    hashtag,
  ].join('\n');
}

// ---------- descargas ----------

function descargarBlob(nombre, blob) {
  if (typeof document === 'undefined' || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
    return false;
  }
  try {
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombre;
    enlace.rel = 'noopener';
    enlace.style.display = 'none';
    document.body.appendChild(enlace);
    enlace.click();
    setTimeout(() => {
      enlace.remove();
      URL.revokeObjectURL(url);
    }, 1000);
    return true;
  } catch {
    return false;
  }
}

/** Descarga `contenido` como archivo `nombre` con el tipo MIME indicado. Devuelve true si pudo lanzar la descarga. */
export function descargarTexto(nombre, contenido, tipo = 'text/plain;charset=utf-8') {
  if (typeof Blob === 'undefined') return false;
  try {
    return descargarBlob(nombre, new Blob([String(contenido)], { type: tipo }));
  } catch {
    return false;
  }
}

export function descargarAnuncioTxt(partida, extra = {}) {
  return descargarTexto(nombreArchivo(partida, 'txt'), textoAnuncio(partida, extra), 'text/plain;charset=utf-8');
}

export function descargarPartidasJson() {
  return descargarTexto('partidas-crucigrama.json', exportarPartidasJson(), 'application/json;charset=utf-8');
}

// ---------- portapapeles y compartir ----------

function copiarConTextarea(texto) {
  if (typeof document === 'undefined') return false;
  try {
    const area = document.createElement('textarea');
    area.value = texto;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.top = '-1000px';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.focus();
    area.select();
    area.setSelectionRange(0, texto.length);
    const ok = typeof document.execCommand === 'function' ? document.execCommand('copy') : false;
    area.remove();
    return Boolean(ok);
  } catch {
    return false;
  }
}

/** Copia el anuncio al portapapeles. Devuelve true si se copió. */
export async function copiarAnuncio(partida, extra = {}) {
  const texto = textoAnuncio(partida, extra);
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(texto);
      return true;
    }
  } catch {
    // seguimos con el respaldo
  }
  return copiarConTextarea(texto);
}

/** Comparte con navigator.share si existe; si no (o si el usuario cancela) devuelve false. */
export async function compartirAnuncio(partida, extra = {}) {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') return false;
  const d = datosPartida(partida);
  try {
    await navigator.share({
      title: String(extra?.titulo ?? '').trim() || tituloPorDefecto(d.completada).replace(/^[^\p{L}¡!]+/u, ''),
      text: textoAnuncio(partida, extra),
    });
    return true;
  } catch {
    return false;
  }
}

// ---------- tarjeta en canvas ----------

/** Ajusta ctx.font reduciendo el tamaño hasta que `texto` quepa en `anchoMax`. Devuelve el tamaño usado. */
function ajustarFuente(ctx, texto, { peso = '700', familia = FUENTE_SISTEMA, maximo = 96, minimo = 28, anchoMax = 960 } = {}) {
  let tam = maximo;
  for (;;) {
    ctx.font = `${peso} ${tam}px ${familia}`;
    const ancho = typeof ctx.measureText === 'function' ? ctx.measureText(texto).width : 0;
    if (ancho <= anchoMax || tam <= minimo) return tam;
    tam = Math.max(minimo, Math.floor(tam * 0.92));
  }
}

function recortar(ctx, texto, anchoMax) {
  if (typeof ctx.measureText !== 'function' || ctx.measureText(texto).width <= anchoMax) return texto;
  let corto = texto;
  while (corto.length > 1 && ctx.measureText(`${corto}…`).width > anchoMax) corto = corto.slice(0, -1);
  return `${corto.trimEnd()}…`;
}

/**
 * Pinta una tarjeta 1080×1080 con el anuncio en `canvas`. Devuelve el canvas.
 * Fondo #fbf8f3, acentos #d97757, texto #1b1310. extra: { titulo, hashtag }.
 */
export function dibujarAnuncio(canvas, partida, extra = {}) {
  if (!canvas || typeof canvas.getContext !== 'function') {
    throw new Error('Se necesita un canvas para dibujar el anuncio');
  }
  const L = 1080;
  canvas.width = L;
  canvas.height = L;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo obtener el contexto 2D del canvas');

  const d = datosPartida(partida);
  const titulo = (String(extra?.titulo ?? '').trim() || tituloPorDefecto(d.completada))
    .replace(/^[^\p{L}¡!]+/u, ''); // sin emoji inicial: no todas las fuentes de canvas los dibujan bien
  const hashtag = normalizarHashtag(extra?.hashtag);
  const margen = 72;
  const anchoUtil = L - margen * 2;

  // Fondo y franja superior
  ctx.fillStyle = COLOR_FONDO;
  ctx.fillRect(0, 0, L, L);
  ctx.fillStyle = COLOR_ACENTO;
  ctx.fillRect(0, 0, L, 22);
  // Acento lateral
  ctx.fillRect(margen, 130, 10, 180);

  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';

  // Kicker
  ctx.fillStyle = COLOR_ACENTO;
  ctx.font = `700 30px ${FUENTE_SISTEMA}`;
  ctx.fillText(recortar(ctx, titulo.toUpperCase(), anchoUtil - 40), margen + 36, 165);

  // Nombre grande (se ajusta si es largo)
  ctx.fillStyle = COLOR_TEXTO;
  ajustarFuente(ctx, d.jugador, { peso: '800', familia: FUENTE_SISTEMA, maximo: 96, minimo: 44, anchoMax: anchoUtil - 46 });
  ctx.fillText(recortar(ctx, d.jugador, anchoUtil - 46), margen + 36, 290);

  // Etiqueta y tiempo enorme en monoespaciada
  ctx.fillStyle = COLOR_SUAVE;
  ctx.font = `600 32px ${FUENTE_SISTEMA}`;
  ctx.fillText('TIEMPO', margen, 400);
  ctx.fillStyle = COLOR_TEXTO;
  ajustarFuente(ctx, d.tiempo, { peso: '700', familia: FUENTE_MONO, maximo: 220, minimo: 96, anchoMax: anchoUtil });
  ctx.fillText(d.tiempo, margen, 600);

  // Línea separadora
  ctx.fillStyle = COLOR_ACENTO;
  ctx.fillRect(margen, 660, 140, 6);

  // Semilla, aciertos y fecha
  const filas = [
    ['SEMILLA', d.semilla],
    ['ACIERTOS', `${d.correctas}/${d.total} palabras`],
    ['FECHA', d.fecha],
  ];
  let y = 740;
  for (const [etiqueta, valor] of filas) {
    ctx.fillStyle = COLOR_SUAVE;
    ctx.font = `600 28px ${FUENTE_SISTEMA}`;
    ctx.fillText(etiqueta, margen, y);
    ctx.fillStyle = COLOR_TEXTO;
    ctx.font = `700 44px ${etiqueta === 'SEMILLA' ? FUENTE_MONO : FUENTE_SISTEMA}`;
    ctx.fillText(recortar(ctx, valor, anchoUtil - 260), margen + 240, y);
    y += 74;
  }

  // Hashtag
  ctx.fillStyle = COLOR_ACENTO;
  ctx.font = `700 34px ${FUENTE_SISTEMA}`;
  ctx.fillText(hashtag, margen, 976);

  // Pie
  ctx.fillStyle = COLOR_SUAVE;
  ctx.font = `500 26px ${FUENTE_SISTEMA}`;
  ctx.textAlign = 'right';
  ctx.fillText(PIE, L - margen, 976);
  ctx.textAlign = 'left';

  // Franja inferior
  ctx.fillStyle = COLOR_ACENTO;
  ctx.fillRect(0, L - 12, L, 12);

  return canvas;
}

/** Dibuja la tarjeta y la descarga como `ganador-<semilla>.png`. Devuelve una promesa con true/false. */
export function descargarAnuncioPng(partida, extra = {}) {
  return new Promise((resolver) => {
    if (typeof document === 'undefined') { resolver(false); return; }
    let canvas;
    try {
      canvas = document.createElement('canvas');
      dibujarAnuncio(canvas, partida, extra);
    } catch {
      resolver(false);
      return;
    }
    const nombre = nombreArchivo(partida, 'png');
    if (typeof canvas.toBlob === 'function') {
      canvas.toBlob((blob) => {
        resolver(blob ? descargarBlob(nombre, blob) : false);
      }, 'image/png');
      return;
    }
    // Respaldo: dataURL → Blob
    try {
      const dataUrl = canvas.toDataURL('image/png');
      const binario = atob(dataUrl.split(',')[1]);
      const bytes = new Uint8Array(binario.length);
      for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
      resolver(descargarBlob(nombre, new Blob([bytes], { type: 'image/png' })));
    } catch {
      resolver(false);
    }
  });
}
