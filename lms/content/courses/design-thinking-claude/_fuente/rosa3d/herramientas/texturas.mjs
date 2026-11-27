// Texturas de Rosa a partir de las TGA de Rocketbox Female_Adult_11 (convertidas a PNG sin pérdida en tex/src).
// Salida en tex/out: color en WebP, normales y ORM en JPEG 4:4:4, máscara húmeda en PNG gris.
//   piel: un poco más morena y cálida (Rosa es limeña, 38 años); la liga dorada del moño pasa a castaño oscuro;
//   ORM (glTF): R = oclusión (el interior de la boca, oscuro), G = rugosidad (sale del mapa especular), B = 0;
//   húmedo: ojos (córnea) y labios, para la capa transparente (clearcoat);
//   pelo: RGBA con el color del pelo extendido bajo lo transparente (sin halo oscuro al bajar de mipmap).
import { leer, escalar, jpg, webp, png, rgb2hsv, smooth } from './img.mjs';
import fs from 'node:fs';
const SRC = '../tex/src/', OUT = '../tex/out/', M = '../out/';
fs.mkdirSync(OUT, { recursive: true });
const arg = Object.fromEntries(process.argv.slice(2).map((a) => a.split('=')));
const PIEL = (arg.piel || '0.90,0.86,0.83').split(',').map(Number);   // multiplicador de la piel (r,g,b)
const TAM = { cabeza: +(arg.cabeza || 2048), cabezaN: +(arg.cabezaN || 2048), cuerpo: +(arg.cuerpo || 1024), pelo: +(arg.pelo || 2048) };
const tam = {};

// máscara de piel: tono anaranjado, algo de saturación, ni muy oscuro (pelo) ni gris (ojos, dientes)
function pielDe(r, g, b) {
  const [h, s, v] = rgb2hsv(r / 255, g / 255, b / 255);
  const tono = h < 50 || h > 345 ? 1 : 0;
  return tono * smooth(0.12, 0.22, s) * (1 - smooth(0.78, 0.9, s)) * smooth(0.22, 0.36, v);
}
function oscurecerPiel(img, excluir) {
  const d = img.d;
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    let k = pielDe(d[i], d[i + 1], d[i + 2]); if (excluir) k *= 1 - excluir[p];
    if (k <= 0) continue;
    for (let c = 0; c < 3; c++) d[i + c] = d[i + c] * (1 - k + k * PIEL[c]);
  }
}
// zonas de la cara en la textura de la cabeza (u, v desde arriba a la izquierda, radio): para el rubor y la zona T
const ZONA = { nariz: [0.5, 0.345, 0.04], mejillaI: [0.385, 0.365, 0.065], mejillaD: [0.615, 0.365, 0.065], orejaI: [0.25, 0.355, 0.05], orejaD: [0.75, 0.355, 0.05],
  frente: [0.5, 0.2, 0.1], dorso: [0.5, 0.3, 0.035], menton: [0.5, 0.47, 0.04] };
const zona = (u, v, z) => { const [cx, cy, r] = ZONA[z]; return 1 - smooth(0, r, Math.hypot(u - cx, v - cy)); };
const OJO = [0.263, 0.931];   // centro del globo ocular en la textura de la cabeza (medido con la máscara de los ojos)
const masc = (f, W) => { const m = escalar(leer(M + f), W, W); const o = new Float32Array(W * W); for (let p = 0; p < o.length; p++) o[p] = m.d[p * 4] / 255; return o; };

// ---------- cabeza
{
  const W = TAM.cabeza, c = leer(SRC + 'head_color.png', W, W), d = c.d;
  const ojos = masc('mask_ojos.png', W), boca = masc('mask_boca.png', W);
  const excl = new Float32Array(W * W); for (let p = 0; p < excl.length; p++) excl[p] = Math.max(ojos[p], boca[p]);
  oscurecerPiel(c, excl);
  // el iris de Rocketbox trae dos brillos pintados (giran con el ojo): se rellenan con el mismo iris girado (su dibujo
  // es radial) y el brillo de la córnea lo pone el motor, quieto respecto de la luz
  {
    const cx = OJO[0] * W, cy = OJO[1] * W, R = Math.ceil(0.019 * W), x0 = Math.floor(cx - R), y0 = Math.floor(cy - R), N = 2 * R + 1;
    const lum = (x, y) => { const i = (y * W + x) * 4; return d[i] + d[i + 1] + d[i + 2]; };
    const perfil = new Float32Array(R + 2), cuenta = new Float32Array(R + 2);
    const vals = Array.from({ length: R + 2 }, () => []);
    for (let y = y0; y < y0 + N; y++) for (let x = x0; x < x0 + N; x++) { const r = Math.round(Math.hypot(x - cx, y - cy)); if (r <= R) vals[r].push(lum(x, y)); }
    vals.forEach((v, r) => { v.sort((a, b) => a - b); perfil[r] = v.length ? v[Math.floor(v.length * 0.5)] : 0; });
    const mk = new Float32Array(N * N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const r = Math.round(Math.hypot(x0 + x - cx, y0 + y - cy)); if (r > 0.0172 * W) continue; const l = lum(x0 + x, y0 + y); mk[y * N + x] = smooth(perfil[r] * 1.3 + 20, perfil[r] * 1.75 + 30, l); }
    const mk2 = new Float32Array(N * N);   // dilatar 2 px (los bordes del brillo también están aclarados)
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { let m = 0; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < N && yy < N) m = Math.max(m, mk[yy * N + xx] * (1 - 0.18 * Math.hypot(dx, dy))); } mk2[y * N + x] = m; }
    const copia = d.slice((y0 * W + x0) * 4, ((y0 + N) * W + x0 + N) * 4);
    const src = (x, y) => ((y - y0) * W + (x - x0)) * 4;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const k = mk2[y * N + x]; if (k <= 0.01) continue;
      const px = x0 + x - cx, py = y0 + y - cy;
      for (const a of [Math.PI, Math.PI * 0.6, -Math.PI * 0.6, Math.PI * 0.35, -Math.PI * 0.35]) {
        const sx = Math.round(cx + px * Math.cos(a) - py * Math.sin(a)), sy = Math.round(cy + px * Math.sin(a) + py * Math.cos(a));
        const mx = sx - x0, my = sy - y0; if (mx < 0 || my < 0 || mx >= N || my >= N || mk2[my * N + mx] > 0.05) continue;
        const o = src(sx, sy), i = ((y0 + y) * W + x0 + x) * 4;
        for (let c = 0; c < 3; c++) d[i + c] = d[i + c] * (1 - k) + copia[o + c] * k;
        break;
      }
    }
  }
  // tono natural: menos saturado, rubor en mejillas, nariz y orejas (la sangre se ve ahí), y el ojo con su sombra
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
    const p = y * W + x, i = p * 4, u = x / W, v = y / W;
    const piel = pielDe(d[i], d[i + 1], d[i + 2]) * (1 - excl[p]);
    if (piel > 0) {
      const g = 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2];
      for (let k = 0; k < 3; k++) d[i + k] = d[i + k] * (1 - 0.1 * piel) + g * 0.1 * piel;
      const rubor = Math.max(zona(u, v, 'nariz') * 0.75, zona(u, v, 'mejillaI') * 0.35, zona(u, v, 'mejillaD') * 0.35, zona(u, v, 'orejaI') * 0.7, zona(u, v, 'orejaD') * 0.7) * piel;
      d[i] *= 1 + 0.03 * rubor; d[i + 1] *= 1 - 0.075 * rubor; d[i + 2] *= 1 - 0.07 * rubor;
    }
    // globo ocular: la esclera algo más tibia y la órbita en sombra hacia los lados (no un blanco plano)
    const r = Math.hypot(u - OJO[0], v - OJO[1]);
    if (r < 0.06) {
      const escl = smooth(0.016, 0.022, r) * (1 - smooth(0.05, 0.058, r));
      d[i] *= 1 - 0.05 * escl; d[i + 1] *= 1 - 0.09 * escl; d[i + 2] *= 1 - 0.11 * escl;
      const orbita = 1 - 0.38 * smooth(0.02, 0.046, r);
      for (let k = 0; k < 3; k++) d[i + k] *= orbita;
    }
  }
  // liga dorada del moño (franja de arriba de la textura) → castaño oscuro, conservando el relieve
  for (let y = 0; y < Math.round(W * 0.11); y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4, [h, s, v] = rgb2hsv(d[i] / 255, d[i + 1] / 255, d[i + 2] / 255);
    const k = (h > 30 && h < 70 ? 1 : 0) * smooth(0.3, 0.5, s);
    if (!k) continue;
    const l = v * 0.32; const nr = l * 255 * 1.0, ng = l * 255 * 0.78, nb = l * 255 * 0.66;
    d[i] = d[i] * (1 - k) + nr * k; d[i + 1] = d[i + 1] * (1 - k) + ng * k; d[i + 2] = d[i + 2] * (1 - k) + nb * k;
  }
  // variación natural del tono (melanina en manchas grandes y suaves) y unas pecas y dos lunares chicos (38 años)
  { const rn = (() => { let q = 97; return () => (q = (q * 16807) % 2147483647) / 2147483647; })();
    const G = 48, ruido = new Float32Array(G * G); for (let i = 0; i < G * G; i++) ruido[i] = rn();
    const vn = (u, v, f) => { const x = u * f, y = v * f, x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0, a = (i, j) => ruido[((j % G + G) % G) * G + ((i % G + G) % G)];
      const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy); return (a(x0, y0) * (1 - sx) + a(x0 + 1, y0) * sx) * (1 - sy) + (a(x0, y0 + 1) * (1 - sx) + a(x0 + 1, y0 + 1) * sx) * sy; };
    for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
      const p = y * W + x, i = p * 4, piel = pielDe(d[i], d[i + 1], d[i + 2]) * (1 - excl[p]); if (piel <= 0) continue;
      const u = x / W, v = y / W, m = (vn(u, v, 9) - 0.5) * 0.09 + (vn(u + 0.37, v + 0.11, 23) - 0.5) * 0.05;
      d[i] *= 1 + m * piel * 0.8; d[i + 1] *= 1 + m * piel; d[i + 2] *= 1 + m * piel * 1.15;
    }
    const mancha = (u0, v0, r, k, col) => { const R = Math.ceil(r * W) + 1, cx = u0 * W, cy = v0 * W;
      for (let y = Math.floor(cy - R); y <= cy + R; y++) for (let x = Math.floor(cx - R); x <= cx + R; x++) {
        if (x < 0 || y < 0 || x >= W || y >= W) continue; const t = Math.hypot(x - cx, y - cy) / (r * W); if (t > 1) continue;
        const a = k * (1 - t * t) * (1 - excl[y * W + x]), i = (y * W + x) * 4; for (let j = 0; j < 3; j++) d[i + j] = d[i + j] * (1 - a) + col[j] * a; } };
    for (let n = 0; n < 34; n++) {   // pecas: mejillas y dorso de la nariz
      const lado = rn() < 0.5 ? -1 : 1, u = 0.5 + lado * (0.03 + rn() * 0.12), v = 0.3 + rn() * 0.09;
      mancha(u, v, 0.0012 + rn() * 0.0012, 0.18 + rn() * 0.18, [d[0] * 0 + 118, 74, 52]);
    }
    mancha(0.395, 0.405, 0.0021, 0.55, [92, 58, 44]); mancha(0.612, 0.46, 0.0017, 0.45, [96, 62, 46]);   // dos lunares
  }
  tam.cabeza_color = webp(c, OUT + 'cabeza_color.webp', 90);
  const n = leer(SRC + 'head_normal.png', TAM.cabezaN, TAM.cabezaN); tam.cabeza_normal = jpg(n, OUT + 'cabeza_normal.jpg', 3);
  // ORM 1024 + húmedo 512
  const S = 1024, sp = leer(SRC + 'head_specular.png', S, S), col = leer(SRC + 'head_color.png', S, S);
  // cavidad: divergencia del mapa de normales (convenio OpenGL) en dos escalas; los pliegues (párpados, aletas de la
  // nariz, surcos nasogenianos, comisuras, orejas) quedan algo más oscuros, también para la luz directa
  const cav = new Float32Array(S * S);
  { const nm = leer(SRC + 'head_normal.png', S, S), nx = new Float32Array(S * S), ny = new Float32Array(S * S);
    for (let q = 0; q < S * S; q++) { nx[q] = nm.d[q * 4] / 127.5 - 1; ny[q] = nm.d[q * 4 + 1] / 127.5 - 1; }
    const caja = (a, r) => { const o = new Float32Array(a.length), t = new Float32Array(a.length), k = 1 / (2 * r + 1);
      for (let y = 0; y < S; y++) { let z = 0; for (let x = -r; x <= r; x++) z += a[y * S + Math.min(S - 1, Math.max(0, x))]; for (let x = 0; x < S; x++) { t[y * S + x] = z * k; z += a[y * S + Math.min(S - 1, x + r + 1)] - a[y * S + Math.max(0, x - r)]; } }
      for (let x = 0; x < S; x++) { let z = 0; for (let y = -r; y <= r; y++) z += t[Math.min(S - 1, Math.max(0, y)) * S + x]; for (let y = 0; y < S; y++) { o[y * S + x] = z * k; z += t[Math.min(S - 1, y + r + 1) * S + x] - t[Math.max(0, y - r) * S + x]; } }
      return o; };
    const bx = caja(nx, 1), by = caja(ny, 1), bx2 = caja(nx, 4), by2 = caja(ny, 4);
    for (let y = 4; y < S - 4; y++) for (let x = 4; x < S - 4; x++) {
      const q = y * S + x, d1 = (bx[q + 1] - bx[q - 1]) - (by[q + S] - by[q - S]), d2 = ((bx2[q + 4] - bx2[q - 4]) - (by2[q + 4 * S] - by2[q - 4 * S])) / 4;
      cav[q] = Math.min(1, Math.max(0, -(d1 * 6 + d2 * 10)) * 0.6);
    }
    const c2 = caja(cav, 1); cav.set(c2);
    // el surco bajo la nariz sale como una mancha oscura (parece bigote): fuera
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const t = Math.hypot(x / S - 0.5, y / S - 0.372) / 0.016; if (t < 1) cav[y * S + x] *= smooth(0.55, 1, t); }
  }
  const ojosS = masc('mask_ojos.png', S), labS = masc('mask_labios.png', S), bocaS = masc('mask_boca.png', S);
  const lagrimal = new Float32Array(S * S);
  for (const [u0, u1] of [[0.37, 0.47], [0.53, 0.63]]) for (let x = Math.floor(u0 * S); x < u1 * S; x++) {
    let yb = -1; for (let y = Math.floor(0.25 * S); y < 0.32 * S; y++) { const i = (y * S + x) * 4, r = col.d[i], g = col.d[i + 1], b = col.d[i + 2];
      if (r > 60 && r > g * 1.35 && r > b * 1.3 && (r + g + b) / 3 < 120) yb = y; }
    if (yb > 0) for (let k = 1; k <= 3; k++) lagrimal[(yb + k) * S + x] = Math.max(lagrimal[(yb + k) * S + x], 1 - (k - 1) / 3);
  }
  const orm = { d: new Uint8ClampedArray(S * S * 4), W: S, H: S }, hum = { d: new Uint8ClampedArray(S * S * 4), W: S, H: S };
  for (let p = 0; p < S * S; p++) {
    const i = p * 4, s = sp.d[i] / 255;
    // labios: los píxeles rojizos dentro de la zona de los labios
    const [h, sat] = rgb2hsv(col.d[i] / 255, col.d[i + 1] / 255, col.d[i + 2] / 255);
    const labio = labS[p] * smooth(0.36, 0.48, sat) * (h < 20 || h > 340 ? 1 : 0.4);
    let rug = Math.min(0.72, Math.max(0.34, 0.70 - 1.05 * s));
    { const u = (p % S) / S, v = Math.floor(p / S) / S;   // zona T más brillante, mejillas más mate
      rug += -0.09 * Math.max(zona(u, v, 'frente'), zona(u, v, 'dorso'), zona(u, v, 'nariz'), zona(u, v, 'menton') * 0.7) + 0.06 * Math.max(zona(u, v, 'mejillaI'), zona(u, v, 'mejillaD')); }
    rug = rug * (1 - labio) + 0.36 * labio;            // labios algo más lisos
    rug = rug * (1 - ojosS[p]) + 0.2 * ojosS[p];        // esclera / iris
    rug = rug * (1 - bocaS[p]) + 0.42 * bocaS[p];       // dientes y lengua (húmedos, pero en sombra)
    const oc = (1 - 0.7 * bocaS[p]) * (1 - 0.42 * cav[p]);
    orm.d[i] = oc * 255; orm.d[i + 1] = rug * 255; orm.d[i + 2] = 0; orm.d[i + 3] = 255;
    const w = Math.max(ojosS[p], labio * 0.1, lagrimal[p] * 0.5);
    hum.d[i] = hum.d[i + 1] = hum.d[i + 2] = w * 255; hum.d[i + 3] = 255;
  }
  tam.cabeza_orm = jpg(orm, OUT + 'cabeza_orm.jpg', 3);
  tam.cabeza_humedo = png(escalar(hum, 512, 512), OUT + 'cabeza_humedo.png', true);
}
// ---------- cuerpo
{
  const W = TAM.cuerpo, c = leer(SRC + 'body_color.png', W, W); oscurecerPiel(c);
  // el mismo 10 % menos de saturación que la piel de la cabeza (si no, la costura del escote se nota)
  { const d = c.d; for (let i = 0; i < d.length; i += 4) { const k = pielDe(d[i], d[i + 1], d[i + 2]) * 0.1; if (!k) continue; const g = 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]; for (let j = 0; j < 3; j++) d[i + j] = d[i + j] * (1 - k) + g * k; } }
  tam.cuerpo_color = webp(c, OUT + 'cuerpo_color.webp', 88);
  tam.cuerpo_normal = jpg(leer(SRC + 'body_normal.png', W, W), OUT + 'cuerpo_normal.jpg', 4);
  const S = 512, sp = leer(SRC + 'body_specular.png', S, S), orm = { d: new Uint8ClampedArray(S * S * 4), W: S, H: S };
  for (let p = 0; p < S * S; p++) { const i = p * 4, s = sp.d[i] / 255; orm.d[i] = 255; orm.d[i + 1] = Math.min(0.94, Math.max(0.42, 0.92 - 1.1 * s)) * 255; orm.d[i + 2] = 0; orm.d[i + 3] = 255; }
  tam.cuerpo_orm = jpg(orm, OUT + 'cuerpo_orm.jpg', 4);
}
// ---------- pelo (láminas + pestañas): color extendido bajo el alfa
{
  const W = TAM.pelo, c = leer(SRC + 'opacity_color.png', W, W), d = c.d;
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 220) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
  r /= n; g /= n; b /= n;
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3] / 255, k = smooth(0.0, 0.6, a);   // por debajo de ~0.6 de alfa, hacia el color medio
    d[i] = d[i] * k + r * (1 - k); d[i + 1] = d[i + 1] * k + g * (1 - k); d[i + 2] = d[i + 2] * k + b * (1 - k);
  }
  tam.pelo = webp(c, OUT + 'pelo.webp', 90, true);
  tam.peloMedio = [r, g, b].map(Math.round);
}
console.log(JSON.stringify(tam));
