// Forja · motores · ruido procedural determinista: Simplex 2D/3D (S. Gustavson, «Simplex noise demystified», 2005),
// Perlin clásico 2D, fBm, ridged, domain warping y Voronoi/celular. La tabla de permutación sale del PRNG de
// semilla.js: misma semilla → mismo ruido en cualquier máquina. Sin Math.random.
//   const r = crearRuido(semilla); r.s2(x, y) ∈ [-1,1]; r.fbm2(x, y, { octavas: 5 }); r.voronoi2(x, y)
import { crearPRNG, hash2, hash3 } from './semilla.js';

const F2 = 0.5 * (Math.sqrt(3) - 1), G2 = (3 - Math.sqrt(3)) / 6, F3 = 1 / 3, G3 = 1 / 6;
const GRAD3 = new Float32Array([1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1]);

export function crearRuido(semilla = 1) {
  const g = crearPRNG(semilla >>> 0), p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) { const j = g.u32() % (i + 1); const t = p[i]; p[i] = p[j]; p[j] = t; }
  const perm = new Uint8Array(512), pm12 = new Uint8Array(512);
  for (let i = 0; i < 512; i++) { perm[i] = p[i & 255]; pm12[i] = perm[i] % 12; }

  function s2(xin, yin) {
    const s = (xin + yin) * F2, i = Math.floor(xin + s), j = Math.floor(yin + s), t = (i + j) * G2;
    const x0 = xin - (i - t), y0 = yin - (j - t), i1 = x0 > y0 ? 1 : 0, j1 = 1 - i1;
    const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2, x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
    const ii = i & 255, jj = j & 255;
    let n = 0, t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 > 0) { const gi = pm12[ii + perm[jj]] * 3; t0 *= t0; n += t0 * t0 * (GRAD3[gi] * x0 + GRAD3[gi + 1] * y0); }
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 > 0) { const gi = pm12[ii + i1 + perm[jj + j1]] * 3; t1 *= t1; n += t1 * t1 * (GRAD3[gi] * x1 + GRAD3[gi + 1] * y1); }
    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 > 0) { const gi = pm12[ii + 1 + perm[jj + 1]] * 3; t2 *= t2; n += t2 * t2 * (GRAD3[gi] * x2 + GRAD3[gi + 1] * y2); }
    return 70 * n;
  }

  function s3(xin, yin, zin) {
    const s = (xin + yin + zin) * F3, i = Math.floor(xin + s), j = Math.floor(yin + s), k = Math.floor(zin + s), t = (i + j + k) * G3;
    const x0 = xin - (i - t), y0 = yin - (j - t), z0 = zin - (k - t);
    let i1, j1, k1, i2, j2, k2;
    if (x0 >= y0) {
      if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; } else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1; } else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1; }
    } else if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1; } else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1; } else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
    const x1 = x0 - i1 + G3, y1 = y0 - j1 + G3, z1 = z0 - k1 + G3, x2 = x0 - i2 + 2 * G3, y2 = y0 - j2 + 2 * G3, z2 = z0 - k2 + 2 * G3;
    const x3 = x0 - 1 + 0.5, y3 = y0 - 1 + 0.5, z3 = z0 - 1 + 0.5, ii = i & 255, jj = j & 255, kk = k & 255;
    let n = 0, c;
    c = 0.6 - x0 * x0 - y0 * y0 - z0 * z0; if (c > 0) { const gi = pm12[ii + perm[jj + perm[kk]]] * 3; c *= c; n += c * c * (GRAD3[gi] * x0 + GRAD3[gi + 1] * y0 + GRAD3[gi + 2] * z0); }
    c = 0.6 - x1 * x1 - y1 * y1 - z1 * z1; if (c > 0) { const gi = pm12[ii + i1 + perm[jj + j1 + perm[kk + k1]]] * 3; c *= c; n += c * c * (GRAD3[gi] * x1 + GRAD3[gi + 1] * y1 + GRAD3[gi + 2] * z1); }
    c = 0.6 - x2 * x2 - y2 * y2 - z2 * z2; if (c > 0) { const gi = pm12[ii + i2 + perm[jj + j2 + perm[kk + k2]]] * 3; c *= c; n += c * c * (GRAD3[gi] * x2 + GRAD3[gi + 1] * y2 + GRAD3[gi + 2] * z2); }
    c = 0.6 - x3 * x3 - y3 * y3 - z3 * z3; if (c > 0) { const gi = pm12[ii + 1 + perm[jj + 1 + perm[kk + 1]]] * 3; c *= c; n += c * c * (GRAD3[gi] * x3 + GRAD3[gi + 1] * y3 + GRAD3[gi + 2] * z3); }
    return 32 * n;
  }

  // Perlin clásico 2D (K. Perlin, «Improving noise», 2002): se usa en las texturas por su aspecto más regular
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10), lerp = (a, b, t) => a + (b - a) * t;
  const gr = (h, x, y) => ((h & 1) ? -x : x) + ((h & 2) ? -y : y);
  function perlin2(x, y) {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255; x -= Math.floor(x); y -= Math.floor(y);
    const u = fade(x), v = fade(y), a = perm[X] + Y, b = perm[X + 1] + Y;
    return lerp(lerp(gr(perm[a], x, y), gr(perm[b], x - 1, y), u), lerp(gr(perm[a + 1], x, y - 1), gr(perm[b + 1], x - 1, y - 1), u), v);
  }

  // Fractal Brownian Motion: suma de octavas, cada una al doble de frecuencia y la mitad de amplitud (por defecto)
  function fbm2(x, y, { octavas = 4, lacunaridad = 2, ganancia = 0.5 } = {}) {
    let s = 0, a = 1, f = 1, n = 0;
    for (let o = 0; o < octavas; o++) { s += a * s2(x * f + o * 17.3, y * f - o * 9.1); n += a; a *= ganancia; f *= lacunaridad; }
    return s / n;
  }
  function fbm3(x, y, z, { octavas = 3, lacunaridad = 2, ganancia = 0.5 } = {}) {
    let s = 0, a = 1, f = 1, n = 0;
    for (let o = 0; o < octavas; o++) { s += a * s3(x * f + o * 11.7, y * f, z * f - o * 5.3); n += a; a *= ganancia; f *= lacunaridad; }
    return s / n;
  }
  // Ridged: 1 - |ruido| elevado: crestas afiladas (cordilleras). Cada octava se pondera por la anterior.
  function ridged2(x, y, { octavas = 4, lacunaridad = 2.1, ganancia = 0.5 } = {}) {
    let s = 0, a = 1, f = 1, n = 0, peso = 1;
    for (let o = 0; o < octavas; o++) { let v = 1 - Math.abs(s2(x * f + o * 31.1, y * f + o * 7.7)); v *= v; v *= peso; peso = Math.min(1, v * 2); s += v * a; n += a; a *= ganancia; f *= lacunaridad; }
    return s / n;   // [0,1]
  }
  // Domain warping (Í. Quílez): se deforma la coordenada con otro ruido antes de muestrear → costas y valles orgánicos
  function warp2(x, y, fuerza = 30, escala = 0.004) {
    return [x + fuerza * s2(x * escala + 5.2, y * escala + 1.3), y + fuerza * s2(x * escala - 8.3, y * escala + 2.8)];
  }
  return { semilla, s2, s3, perlin2, fbm2, fbm3, ridged2, warp2 };
}

// Voronoi / ruido celular (S. Worley, 1996): distancia al punto de rasgo más cercano (F1), al segundo (F2) e id de celda.
// Los puntos salen de hash2(semilla, celda): determinista y válido con coordenadas negativas.
export function voronoi2(semilla, x, y, jitter = 0.9) {
  const cx = Math.floor(x), cy = Math.floor(y); let f1 = 9, f2 = 9, id = 0, px = 0, py = 0;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const gx = cx + i, gy = cy + j, h = hash2(semilla, gx, gy);
    const ox = gx + 0.5 + jitter * (((h & 0xffff) / 65535) - 0.5), oy = gy + 0.5 + jitter * (((h >>> 16) / 65535) - 0.5);
    const d = (ox - x) ** 2 + (oy - y) ** 2;
    if (d < f1) { f2 = f1; f1 = d; id = h; px = ox; py = oy; } else if (d < f2) f2 = d;
  }
  return { f1: Math.sqrt(f1), f2: Math.sqrt(f2), id, px, py };
}
export function voronoi3(semilla, x, y, z) {
  const cx = Math.floor(x), cy = Math.floor(y), cz = Math.floor(z); let f1 = 9;
  for (let k = -1; k <= 1; k++) for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const h = hash3(semilla, cx + i, cy + j, cz + k), d = (cx + i + (h & 255) / 255 - x) ** 2 + (cy + j + ((h >>> 8) & 255) / 255 - y) ** 2 + (cz + k + ((h >>> 16) & 255) / 255 - z) ** 2;
    if (d < f1) f1 = d;
  }
  return Math.sqrt(f1);
}
export const suave = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
