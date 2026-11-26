// Forja · motores · Seed Manager. Convierte números, palabras o frases en una semilla de 32 bits con un hash
// estable (FNV-1a + mezcla final de murmur3) y da un PRNG determinista: xoshiro128** sembrado con SplitMix32.
// Math.random NUNCA decide nada que deba repetirse: solo se usa (vía crypto) para inventar una semilla «al azar».
// Todo es aritmética entera de 32 bits (Math.imul, >>>), así que da lo mismo en cualquier navegador y en Node.

export const VERSION_SEMILLA = 1;

const fmix = (h) => { h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); return (h ^ (h >>> 16)) >>> 0; };

// Hash estable de un texto (normaliza espacios y mayúsculas: «Andes 2026» = «andes  2026»).
export function hashTexto(texto) {
  const t = String(texto).normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();
  let h = 0x811c9dc5;
  for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return fmix(h ^ t.length);
}

// Acepta 42, "42", "ANDES-2026", "un valle con niebla", "aleatoria" / "" / null (inventa una).
export function semillaDe(entrada) {
  if (typeof entrada === 'number' && Number.isFinite(entrada)) return (Math.trunc(entrada) >>> 0) || 1;
  const t = entrada == null ? '' : String(entrada).trim();
  if (/^-?\d{1,15}$/.test(t)) return (Number(t) >>> 0) || 1;
  if (!t || /^(aleatoria|al azar|azar|random)$/i.test(t)) return semillaAleatoria();
  return hashTexto(t) || 1;
}
export function semillaAleatoria() {
  const u = new Uint32Array(1);
  try { globalThis.crypto.getRandomValues(u); } catch { u[0] = (Date.now() * 2654435761) >>> 0; }
  return u[0] || 1;
}

// Mezcla de enteros: el contenido de una coordenada depende solo de (semilla, x, y, z), nunca del orden de visita.
// Funciona con coordenadas negativas porque todo pasa por |0 (complemento a dos).
export function hash2(semilla, x, y) { return fmix(Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1) ^ Math.imul(semilla | 0, 0x9e3779b1)); }
export function hash3(semilla, x, y, z) { return fmix(Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1) ^ Math.imul(z | 0, 0xd3a2646c) ^ Math.imul(semilla | 0, 0x9e3779b1)); }
export const azar2 = (s, x, y) => hash2(s, x, y) / 4294967296;
export const azar3 = (s, x, y, z) => hash3(s, x, y, z) / 4294967296;
// Sub-semilla con nombre: semilla del mundo + «cuevas» → otra semilla independiente.
export const derivar = (semilla, nombre) => fmix((semilla ^ hashTexto(nombre)) + 0x9e3779b9);

function splitmix32(s) { return () => { s = (s + 0x9e3779b9) | 0; let z = s; z = Math.imul(z ^ (z >>> 16), 0x85ebca6b); z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35); return (z ^ (z >>> 16)) >>> 0; }; }

// PRNG: xoshiro128**. prng.estado() / prng.restaurar() permiten repetir una partida exacta (repeticiones, pruebas).
export function crearPRNG(semilla = 1) {
  const sm = splitmix32(semilla >>> 0);
  let a = sm(), b = sm(), c = sm(), d = sm();
  const rotl = (x, k) => (x << k) | (x >>> (32 - k));
  const u32 = () => {
    const r = Math.imul(rotl(Math.imul(b, 5), 7), 9) >>> 0, t = b << 9;
    c ^= a; d ^= b; b ^= c; a ^= d; c ^= t; d = rotl(d, 11);
    return r;
  };
  const g = {
    u32,
    num: () => u32() / 4294967296,                                  // [0, 1)
    entre: (min, max) => min + (max - min) * (u32() / 4294967296),
    entero: (min, max) => min + Math.floor((u32() / 4294967296) * (max - min + 1)),
    elegir: (lista) => lista[Math.floor((u32() / 4294967296) * lista.length)],
    prob: (p) => u32() / 4294967296 < p,
    ponderado(pesos) { let t = 0; for (const p of pesos) t += Math.max(0, p); let r = (u32() / 4294967296) * t; for (let i = 0; i < pesos.length; i++) { r -= Math.max(0, pesos[i]); if (r < 0) return i; } return pesos.length - 1; },
    estado: () => [a, b, c, d],
    restaurar: (e) => { [a, b, c, d] = e.map((x) => x | 0); return g; },
  };
  return g;
}
