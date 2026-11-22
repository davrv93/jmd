// semilla.js · utilidades de semilla y generador pseudoaleatorio determinista.
// Módulo ES sin dependencias, válido en navegador y en Node 20+.

const ALFABETO_SEMILLA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const LARGO_MAX_SEMILLA = 12;
const LARGO_SEMILLA_ALEATORIA = 6;

/**
 * Normaliza un texto de semilla: MAYÚSCULAS, solo [A-Z0-9], máximo 12 caracteres.
 * Cualquier valor no textual o vacío devuelve ''.
 */
export function normalizarSemilla(texto) {
  if (texto === null || texto === undefined) return '';
  const limpio = String(texto)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  return limpio.slice(0, LARGO_MAX_SEMILLA);
}

/**
 * Devuelve una semilla aleatoria de 6 caracteres [A-Z0-9].
 * Usa crypto.getRandomValues cuando está disponible; si no, Math.random.
 */
export function semillaAleatoria() {
  const n = ALFABETO_SEMILLA.length;
  const indices = new Uint32Array(LARGO_SEMILLA_ALEATORIA);
  const cripto = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
  if (cripto && typeof cripto.getRandomValues === 'function') {
    cripto.getRandomValues(indices);
  } else {
    for (let i = 0; i < indices.length; i++) {
      indices[i] = Math.floor(Math.random() * 0x100000000);
    }
  }
  let salida = '';
  for (let i = 0; i < indices.length; i++) {
    salida += ALFABETO_SEMILLA[indices[i] % n];
  }
  return salida;
}

/**
 * Hash xmur3: convierte un texto en una función que entrega enteros de 32 bits.
 * Sirve para derivar el estado inicial de mulberry32 a partir de la semilla.
 */
function xmur3(texto) {
  let h = 1779033703 ^ texto.length;
  for (let i = 0; i < texto.length; i++) {
    h = Math.imul(h ^ texto.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function siguiente() {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

/**
 * Generador mulberry32: rápido, de 32 bits, con buena distribución para juegos.
 */
function mulberry32(estadoInicial) {
  let a = estadoInicial >>> 0;
  return function rng() {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Devuelve una función `() => number` en [0,1) determinista para la semilla dada.
 * Misma semilla ⇒ misma secuencia siempre. La semilla se normaliza primero.
 */
export function rngDesdeSemilla(semilla) {
  const normal = normalizarSemilla(semilla);
  const hash = xmur3(normal);
  return mulberry32(hash());
}
