// Forja · Anime Battle Engine · escenarios. SOLO DIBUJO: nada de este archivo toca la simulación ni el PRNG del combate.
// Cada escenario es un set ORIGINAL pintado por código en capas:
//   · cielo fijo (degradado, astro con halo, estrellas o nubes),
//   · planos con paralaje (lejos → medio → cerca) con perspectiva atmosférica: cuanto más lejos, más se funde con la
//     niebla del horizonte,
//   · un suelo en perspectiva REAL, con reflejos donde el material brilla,
//   · vida animada (faroles que se mecen, lluvia, hojas, agua, neón que parpadea, brasas…).
// Lo caro se pinta UNA vez en lienzos fuera de pantalla; cada cuadro solo copia esos lienzos (drawImage) y dibuja lo
// que se mueve con sprites ya hechos (halos, nubes, faroles).
// Perspectiva del suelo: la cámara está a HC px sobre el suelo y el horizonte cae en Y_HOR. La fila de pantalla y está
// a profundidad d = HC / (y − Y_HOR) (d = 1 donde pisan los luchadores) y su escala horizontal es 1/d. La textura del
// suelo se pinta en (x de mundo, profundidad) y se copia en franjas de 3 px, cada una con su escala: las juntas que se
// alejan convergen solas y las losas se acortan con la distancia.
import { crearRuido } from '../nucleo/ruido.js';
import { crearPRNG } from '../nucleo/semilla.js';

export const ANCHO = 960, ALTO = 540, SUELO = 468, Y_FONDO = 404, Y_HOR = 300;
const HC = SUELO - Y_HOR, D0 = 600, BANDA = 3, TW = 1024, TH = 128, W = 2048, MARGEN = 44, PAR_CERCA = 0.62;
const dDe = (y) => HC / (y - Y_HOR);
const D_LEJOS = dDe(Y_FONDO), D_CERCA = dDe(ALTO + MARGEN);
const filaDe = (y) => (D_LEJOS - dDe(y)) / (D_LEJOS - D_CERCA) * TH;
const TAU = Math.PI * 2;

// ---------------------------------------------------------------- color
const COL = new Map(), MEZ = new Map();
export function rgb(c) {
  let v = COL.get(c); if (v) return v;
  if (c[0] === '#') { const h = c.length === 4 ? c.slice(1).split('').map((x) => x + x).join('') : c.slice(1, 7), n = parseInt(h, 16); v = [n >> 16, (n >> 8) & 255, n & 255]; }
  else v = (c.match(/[\d.]+/g) || [0, 0, 0]).slice(0, 3).map(Number);
  COL.set(c, v); return v;
}
export function mezclar(a, b, k) {
  const key = a + '|' + b + '|' + k; let s = MEZ.get(key); if (s) return s;
  const A = rgb(a), B = rgb(b); s = `rgb(${Math.round(A[0] + (B[0] - A[0]) * k)},${Math.round(A[1] + (B[1] - A[1]) * k)},${Math.round(A[2] + (B[2] - A[2]) * k)})`;
  if (MEZ.size > 6000) MEZ.clear(); MEZ.set(key, s); return s;
}
export const conAlfa = (c, a) => { const A = rgb(c); return `rgba(${A[0]},${A[1]},${A[2]},${a})`; };
const escalar = (c, k) => { const A = rgb(c); return `rgb(${A.map((v) => Math.max(0, Math.min(255, Math.round(v * k)))).join(',')})`; };

// ---------------------------------------------------------------- lienzos y sprites
// cpu: lienzos en memoria (willReadFrequently). Con GL por software (SwiftShader) dibujar en la GPU emulada es lento;
// rasterizar en CPU y subir el cuadro es varias veces más rápido. Todos los lienzos de un render usan el mismo modo:
// copiar de un lienzo de GPU a uno de CPU obligaría a leer la GPU en cada cuadro.
export function lienzoDe(cpu) {
  return (w, h) => {
    w = Math.max(1, Math.ceil(w)); h = Math.max(1, Math.ceil(h));
    const c = typeof document !== 'undefined' ? Object.assign(document.createElement('canvas'), { width: w, height: h }) : new OffscreenCanvas(w, h);
    return [c, c.getContext('2d', cpu ? { willReadFrequently: true } : undefined)];
  };
}
const SPRITES = new Map();
function cache(clave, crear) { let s = SPRITES.get(clave); if (!s) { s = crear(); SPRITES.set(clave, s); } return s; }
// halo radial (luz, brillo, bloom falso): un drawImage por luz en vez de un degradado por cuadro
export function halo(color, cpu = false) {
  return cache('halo' + color + cpu, () => {
    const [c, x] = lienzoDe(cpu)(128, 128), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, conAlfa(color, 1)); g.addColorStop(0.18, conAlfa(color, 0.55)); g.addColorStop(0.45, conAlfa(color, 0.16)); g.addColorStop(1, conAlfa(color, 0));
    x.fillStyle = g; x.fillRect(0, 0, 128, 128); return c;
  });
}
// sombra de contacto: elipse suave (más ancha que alta), se escala con la altura del luchador
export function sombraSprite(cpu = false) {
  return cache('sombra' + cpu, () => {
    const [c, x] = lienzoDe(cpu)(128, 128), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(0,0,0,.85)'); g.addColorStop(0.45, 'rgba(0,0,0,.5)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128); return c;
  });
}

// ---------------------------------------------------------------- kit de pintura (una vez por escenario)
function kit(semilla, cpu) {
  const rng = crearPRNG(semilla), N = crearRuido(semilla), r = () => rng.num(), lienzo = lienzoDe(cpu);
  // ruido periódico en x (periodo W): se muestrea en un círculo, así la capa se repite sin costura
  const nP = (x, frec, s = 0, oct = 4, periodo = W) => { const a = x / periodo * TAU, rho = periodo * frec / TAU; return N.fbm2(Math.cos(a) * rho + s * 13.7, Math.sin(a) * rho - s * 7.1, { octavas: oct }); };
  const rep = (x0, w, f, periodo = W) => { f(x0); if (x0 < w) f(x0 + periodo); if (x0 + w > periodo) f(x0 - periodo); };
  const vert = (x, y0, y1, stops, x0 = 0, w = W) => { const g = x.createLinearGradient(0, y0, 0, y1); for (const [p, c] of stops) g.addColorStop(p, c); x.fillStyle = g; x.fillRect(x0, y0, w, y1 - y0); };
  const capa = (nombre, y0, h, par, pintar, extra = {}) => { const [c, x] = lienzo(W, h); x.translate(0, -y0); pintar(x); return { nombre, img: c, par, y0, h, ...extra }; };
  const cresta = (x, { base, amp, frec, color, s = 0, oct = 4, pico = 1, paso = 4, fondo = ALTO }) => {
    x.fillStyle = color; x.beginPath(); x.moveTo(0, fondo);
    for (let i = 0; i <= W; i += paso) { const n = Math.max(0, nP(i, frec, s, oct) * 0.5 + 0.5); x.lineTo(i, base - amp * Math.pow(n, pico)); }
    x.lineTo(W, fondo); x.closePath(); x.fill();
  };
  // niebla: tiñe SOLO lo ya pintado (source-atop), más fuerte abajo: perspectiva atmosférica
  const atmos = (x, y0, y1, color, a0 = 0, a1 = 1) => { x.save(); x.globalCompositeOperation = 'source-atop'; vert(x, y0, y1, [[0, conAlfa(color, a0)], [1, conAlfa(color, a1)]]); x.restore(); };
  const estrellas = (x, n, y1, [ex, ey, er] = [-999, 0, 0]) => {
    for (let i = 0; i < n; i++) {
      const sx = r() * ANCHO, sy = Math.pow(r(), 1.5) * y1; if (Math.hypot(sx - ex, sy - ey) < er) continue;
      const g = r(), t = g > 0.97 ? 2.4 : g > 0.85 ? 1.6 : 1; x.globalAlpha = 0.25 + r() * 0.6 * (1 - sy / y1 * 0.6);
      x.fillStyle = g > 0.9 ? '#ffe9c8' : g > 0.8 ? '#cfe0ff' : '#ffffff'; x.fillRect(sx, sy, t, t);
    }
    x.globalAlpha = 1;
  };
  const disco = (x, cx, cy, rad, centro, borde, haloCol, haloR, haloA) => {
    const h = x.createRadialGradient(cx, cy, rad * 0.8, cx, cy, haloR); h.addColorStop(0, conAlfa(haloCol, haloA)); h.addColorStop(0.3, conAlfa(haloCol, haloA * 0.35)); h.addColorStop(1, conAlfa(haloCol, 0));
    x.fillStyle = h; x.fillRect(cx - haloR, cy - haloR, haloR * 2, haloR * 2);
    const g = x.createRadialGradient(cx - rad * 0.25, cy - rad * 0.25, rad * 0.1, cx, cy, rad); g.addColorStop(0, centro); g.addColorStop(1, borde);
    x.fillStyle = g; x.beginPath(); x.arc(cx, cy, rad, 0, TAU); x.fill();
  };
  // nube: racimo de bolas suaves, clara arriba (donde le da la luz) y oscura abajo
  const nube = (w, h, claro, oscuro, n = 18, semillaN = 1) => {
    const [c, x] = lienzo(w, h), p = crearPRNG(semilla * 31 + semillaN), q = () => p.num();
    const bolas = Array.from({ length: n }, (_, i) => { const u = (i + 0.5) / n; return { cx: w * (0.12 + u * 0.76) + (q() - 0.5) * w * 0.08, cy: h * (0.62 - Math.sin(u * Math.PI) * 0.26 + (q() - 0.5) * 0.12), r: h * (0.18 + Math.sin(u * Math.PI) * 0.2 + q() * 0.1) }; });
    for (const [col, dy, a] of [[oscuro, 0.06, 0.9], [claro, -0.05, 0.85]]) for (const b of bolas) {
      const g = x.createRadialGradient(b.cx, b.cy + dy * h, 0, b.cx, b.cy + dy * h, b.r); g.addColorStop(0, conAlfa(col, a)); g.addColorStop(0.7, conAlfa(col, a * 0.7)); g.addColorStop(1, conAlfa(col, 0));
      x.fillStyle = g; x.beginPath(); x.arc(b.cx, b.cy + dy * h, b.r, 0, TAU); x.fill();
    }
    return c;
  };
  // rayos de luz (god rays) desde (cx, cy): un solo relleno con degradado radial
  const rayos = (cx, cy, color, n, largo, ancho, a, ang0 = 0, ang1 = Math.PI, w = ANCHO, h = ALTO) => {
    const [c, x] = lienzo(w, h), g = x.createRadialGradient(cx, cy, 0, cx, cy, largo);
    g.addColorStop(0, conAlfa(color, a)); g.addColorStop(0.5, conAlfa(color, a * 0.4)); g.addColorStop(1, conAlfa(color, 0)); x.fillStyle = g; x.beginPath();
    for (let i = 0; i < n; i++) { const an = ang0 + (ang1 - ang0) * (i + 0.5 + (r() - 0.5) * 0.7) / n, aw = ancho * (0.4 + r()); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(an - aw) * largo, cy + Math.sin(an - aw) * largo); x.lineTo(cx + Math.cos(an + aw) * largo, cy + Math.sin(an + aw) * largo); x.closePath(); }
    x.fill(); return c;
  };
  return { rng, N, r, lienzo, nP, rep, vert, capa, cresta, atmos, estrellas, disco, nube, rayos, cpu, halo: (col) => halo(col, cpu) };
}

// ---------------------------------------------------------------- suelos (textura en x de mundo × profundidad)
// p: px de mundo detrás (+) o delante (−) de la línea donde pisan los luchadores → fila de la textura
const filaP = (p) => (D_LEJOS - (1 + p / D0)) / (D_LEJOS - D_CERCA) * TH;
const P_LEJOS = D0 * (D_LEJOS - 1), P_CERCA = D0 * (D_CERCA - 1);
function pintarSuelo(S, k) {
  const [c, x] = k.lienzo(TW * 2, TH), { r, N } = k, repT = (x0, w, f) => k.rep(x0, w, f, TW);
  k.vert(x, 0, TH, [[0, S.lejos], [1, S.cerca]], 0, TW);
  // manchas grandes de tono (ruido de baja frecuencia) y motas
  for (let i = 0; i < TW; i += 8) for (let v = 0; v < TH; v += 2) {
    const n = k.nP(i, 0.012, 3 + v * 0.05, 3, TW); if (Math.abs(n) < 0.12) continue;
    x.fillStyle = n > 0 ? conAlfa('#ffffff', Math.min(0.06, n * 0.08)) : conAlfa('#000000', Math.min(0.12, -n * 0.16)); x.fillRect(i, v, 8, 2);
  }
  for (let i = 0; i < 2600; i++) { x.fillStyle = r() > 0.5 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.08)'; x.fillRect(r() * TW, r() * TH, 1 + r() * 2, 1); }
  const junta = (x0, v0, w, h) => { x.fillStyle = S.junta; x.fillRect(x0, v0, w, h); };
  const t = S.tipo, T = TW / Math.max(1, Math.round(TW / (S.tam || 160)));
  const psDe = (paso, desfase = 0) => { const out = []; for (let p = Math.floor((P_CERCA - desfase) / paso) * paso + desfase; p <= P_LEJOS + paso; p += paso) out.push(p); return out.sort((a, b) => b - a); };
  const filasDe = (paso, desfase = 0) => psDe(paso, desfase).map(filaP);
  if (t === 'losas' || t === 'marmol' || t === 'templo' || t === 'concreto') {
    const fs = filasDe(T, T * 0.3);
    // las juntas que se ALEJAN se dibujan como vectores en cada cuadro (en la textura saldrían escalonadas)
    c.juntas = { T, ps: psDe(T, T * 0.3), desf: t !== 'concreto' };
    for (let j = 0; j < fs.length - 1; j++) {
      const v0 = Math.max(0, fs[j]), v1 = Math.min(TH, fs[j + 1]); if (v1 <= v0) continue;
      const desf = t === 'concreto' ? 0 : (j % 2) * T * 0.5;
      for (let i = -1; i <= TW / T; i++) {
        const x0 = i * T + desf, tono = (r() - 0.5) * (t === 'concreto' ? 0.05 : 0.12);
        repT(x0, T, (xx) => { x.fillStyle = tono > 0 ? conAlfa('#ffffff', tono) : conAlfa('#000000', -tono * 1.4); x.fillRect(xx, v0, T, v1 - v0); });
        if (t === 'marmol') repT(x0, T, (xx) => { x.strokeStyle = 'rgba(120,130,160,.18)'; x.lineWidth = 1.2; x.beginPath(); let px = xx + r() * T, pv = v0; x.moveTo(px, pv); while (pv < v1) { px += (r() - 0.4) * 22; pv += 1.5 + r() * 2; x.lineTo(px, pv); } x.stroke(); });
        if (t === 'templo' && r() < 0.45) repT(x0, T, (xx) => { const cx = xx + T / 2, cv = (v0 + v1) / 2, rx = T * 0.3, rv = (v1 - v0) * 0.3; x.strokeStyle = 'rgba(0,0,0,.22)'; x.lineWidth = 2; x.beginPath(); x.ellipse(cx, cv, rx, rv, 0, 0, TAU); x.stroke(); x.beginPath(); x.ellipse(cx, cv, rx * 0.55, rv * 0.55, 0, 0, TAU); x.stroke(); x.strokeStyle = 'rgba(255,220,170,.10)'; x.beginPath(); x.ellipse(cx, cv + 0.6, rx, rv, 0, 0, Math.PI); x.stroke(); });
      }
      junta(0, v0, TW, t === 'concreto' ? 0.6 : 1); x.fillStyle = conAlfa(S.bisel || '#ffffff', 0.35); x.fillRect(0, v0 + 1, TW, 0.7);
      if (t === 'marmol') { x.fillStyle = 'rgba(214,170,70,.85)'; x.fillRect(0, v0 + (v1 - v0) * 0.5, TW, 0.8); }
    }
    if (t === 'concreto') for (let i = 0; i < 14; i++) { const cx = r() * TW, cv = r() * TH, rw = 40 + r() * 120, rh = 3 + r() * 9; repT(cx - rw, rw * 2, (xx) => { const g = x.createRadialGradient(xx + rw, cv, 0, xx + rw, cv, rw); g.addColorStop(0, 'rgba(0,0,0,.28)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.save(); x.translate(xx + rw, cv); x.scale(1, rh / rw); x.translate(-(xx + rw), -cv); x.beginPath(); x.arc(xx + rw, cv, rw, 0, TAU); x.fill(); x.restore(); }); }
    if (t === 'templo') for (let i = 0; i < 18; i++) { const cx = r() * TW, cv = r() * TH; repT(cx, 60, (xx) => { x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = 1; x.beginPath(); let px = xx, pv = cv; x.moveTo(px, pv); for (let s = 0; s < 6; s++) { px += 6 + r() * 10; pv += (r() - 0.5) * 3; x.lineTo(px, pv); } x.stroke(); }); }
  } else if (t === 'tablas') {   // tablones que se alejan (las juntas convergen hacia el horizonte)
    const A = TW / Math.max(1, Math.round(TW / (S.tam || 44))); c.juntas = { T: A, ps: null, desf: false };
    for (let i = 0; i < TW; i += A) {
      const tono = (r() - 0.5) * 0.16; x.fillStyle = tono > 0 ? conAlfa('#ffe2b0', tono * 0.8) : conAlfa('#000000', -tono); x.fillRect(i, 0, A, TH);
      for (let g = 0; g < 5; g++) { x.fillStyle = 'rgba(60,30,10,.12)'; x.fillRect(i + 3 + r() * (A - 6), 0, 1, TH); }
      for (let p = P_CERCA + r() * 200; p < P_LEJOS; p += 180 + r() * 240) { const v = filaP(p); junta(i, v, A, 0.8); }
    }
  } else if (t === 'muelle') {   // tablones de lado a lado
    const fs = filasDe(S.tam || 34);
    for (let j = 0; j < fs.length - 1; j++) {
      const v0 = Math.max(0, fs[j]), v1 = Math.min(TH, fs[j + 1]); if (v1 <= v0) continue;
      const tono = (r() - 0.5) * 0.18; x.fillStyle = tono > 0 ? conAlfa('#ffd8b0', tono) : conAlfa('#000000', -tono); x.fillRect(0, v0, TW, v1 - v0);
      for (let e = r() * 300; e < TW; e += 220 + r() * 260) { junta(e, v0, 2, v1 - v0); x.fillStyle = 'rgba(30,20,20,.6)'; x.fillRect(e - 8, (v0 + v1) / 2 - 0.4, 2, 0.8); x.fillRect(e + 8, (v0 + v1) / 2 - 0.4, 2, 0.8); }
      junta(0, v0, TW, Math.max(0.6, (v1 - v0) * 0.12)); x.fillStyle = 'rgba(255,210,160,.14)'; x.fillRect(0, v0 + (v1 - v0) * 0.14, TW, 0.6);
    }
  } else if (t === 'arena') {   // ondas de arena y losas medio enterradas
    for (let v = 0; v < TH; v += 1) for (let i = 0; i < TW; i += 4) { const n = Math.sin(i * 0.05 + k.nP(i, 0.004, v * 0.02, 2, TW) * 6 + v * 0.9); if (n > 0.7) { x.fillStyle = 'rgba(255,240,210,.10)'; x.fillRect(i, v, 4, 1); } else if (n < -0.75) { x.fillStyle = 'rgba(120,70,30,.10)'; x.fillRect(i, v, 4, 1); } }
    for (let i = 0; i < 7; i++) { const cx = r() * TW, p = P_CERCA + r() * (P_LEJOS - P_CERCA), w = 90 + r() * 120, v0 = filaP(p + 60), v1 = filaP(p); repT(cx, w, (xx) => { x.fillStyle = 'rgba(150,100,70,.45)'; x.fillRect(xx, v0, w, v1 - v0); x.fillStyle = 'rgba(255,230,190,.25)'; x.fillRect(xx, v0, w, 0.8); x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(xx + w * 0.4, v0, 2, v1 - v0); }); }
  } else if (t === 'musgo' || t === 'asfalto') {   // piedras irregulares con musgo / asfalto mojado con tapas y rayas
    if (t === 'musgo') {
      for (let i = 0; i < 70; i++) { const cx = r() * TW, p = P_CERCA + r() * (P_LEJOS - P_CERCA), w = 60 + r() * 90, dv = Math.abs(filaP(p + w * 0.5) - filaP(p)); repT(cx, w, (xx) => { x.fillStyle = conAlfa(r() > 0.5 ? '#9a9a84' : '#7f8270', 0.6); x.beginPath(); x.ellipse(xx + w / 2, filaP(p), w * 0.48, Math.max(1.5, dv), 0, 0, TAU); x.fill(); x.strokeStyle = 'rgba(30,40,20,.45)'; x.lineWidth = 1.2; x.stroke(); x.fillStyle = 'rgba(255,255,230,.12)'; x.fillRect(xx + w * 0.2, filaP(p) - dv * 0.6, w * 0.6, 0.7); }); }
      for (let i = 0; i < 900; i++) { x.fillStyle = conAlfa(r() > 0.5 ? '#5f8a3a' : '#3f6a2a', 0.35); x.fillRect(r() * TW, r() * TH, 2 + r() * 4, 1); }
    } else {
      for (let i = 0; i < TW; i += 512) repT(i + 200, 160, (xx) => { x.fillStyle = 'rgba(230,220,180,.16)'; x.fillRect(xx, filaP(40), 160, 1.4); });
      for (let i = 0; i < 4; i++) { const cx = 120 + i * 256 + r() * 60, p = -60 + r() * 220, v = filaP(p); repT(cx, 40, (xx) => { x.strokeStyle = 'rgba(0,0,0,.4)'; x.lineWidth = 1.2; x.beginPath(); x.ellipse(xx + 20, v, 20, 2.4, 0, 0, TAU); x.stroke(); }); }
    }
  }
  x.drawImage(c, 0, 0, TW, TH, TW, 0, TW, TH);
  return c;
}

// ---------------------------------------------------------------- piezas de decorado reutilizables
// techo de pagoda con aleros curvos (silueta)
function techo(x, cx, y, w, h, col) { x.fillStyle = col; x.beginPath(); x.moveTo(cx - w / 2 - 16, y - 7); x.quadraticCurveTo(cx - w / 2 + 6, y + 3, cx - w * 0.3, y - h); x.lineTo(cx + w * 0.3, y - h); x.quadraticCurveTo(cx + w / 2 - 6, y + 3, cx + w / 2 + 16, y - 7); x.lineTo(cx + w / 2, y + 2); x.lineTo(cx - w / 2, y + 2); x.closePath(); x.fill(); }
function ventanas(x, k, x0, y0, w, h, { col, prob = 0.3, cw = 3, ch = 4, px = 9, py = 11, alfa = 0.8 }) {
  for (let i = x0 + 4; i < x0 + w - cw - 2; i += px) for (let j = y0 + 6; j < y0 + h - ch - 2; j += py) if (k.r() < prob) { x.globalAlpha = alfa * (0.5 + k.r() * 0.5); x.fillStyle = Array.isArray(col) ? col[Math.floor(k.r() * col.length)] : col; x.fillRect(i, j, cw, ch); }
  x.globalAlpha = 1;
}
function bambu(x, k, { n, base, color, luz, hojas, ancho = [8, 16], alto = 0, nudo = 56 }) {
  for (let i = 0; i < n; i++) {
    const cx = k.r() * W, w = ancho[0] + k.r() * (ancho[1] - ancho[0]), lean = (k.r() - 0.5) * 0.05, top = alto - 40;
    k.rep(cx - 30, 60 + w, (xx) => {
      const bx = xx + 30; x.save(); x.translate(bx, base); x.rotate(lean); x.fillStyle = color; x.fillRect(-w / 2, top - base, w, base - top);
      x.fillStyle = luz; x.fillRect(-w / 2 + w * 0.18, top - base, w * 0.18, base - top);
      for (let y = base - 20 - k.r() * 30; y > top; y -= nudo * (0.85 + k.r() * 0.3)) { x.fillStyle = escalar(color, 0.7); x.fillRect(-w / 2 - 1, y - base, w + 2, 3); x.fillStyle = luz; x.fillRect(-w / 2, y - base - 2, w, 1); }
      x.restore();
    });
    if (hojas) for (let h = 0; h < 4; h++) { const hy = top + 30 + k.r() * (base - top) * 0.55, hx = cx + (k.r() - 0.5) * 10, lado = k.r() > 0.5 ? 1 : -1; k.rep(hx - 60, 120, (xx) => { x.fillStyle = hojas; for (let q = 0; q < 5; q++) { const a = lado * (0.3 + q * 0.22) + (k.r() - 0.5) * 0.3, L = 26 + k.r() * 22; x.save(); x.translate(xx + 60, hy + q * 3); x.rotate(a + Math.PI / 2 * lado); x.beginPath(); x.ellipse(L / 2, 0, L / 2, 3.2, 0, 0, TAU); x.fill(); x.restore(); } }); }
  }
}
function farolSprite(color, cpu) {
  return cache('farol' + color + cpu, () => {
    const [c, x] = lienzoDe(cpu)(30, 40), g = x.createRadialGradient(15, 22, 2, 15, 22, 16);
    g.addColorStop(0, '#fff2c8'); g.addColorStop(0.5, color); g.addColorStop(1, escalar(color, 0.55));
    x.fillStyle = '#2a1a14'; x.fillRect(9, 2, 12, 5); x.fillRect(9, 34, 12, 4);
    x.fillStyle = g; x.beginPath(); x.ellipse(15, 21, 13, 14, 0, 0, TAU); x.fill();
    x.strokeStyle = conAlfa('#5a1a10', 0.45); x.lineWidth = 1; for (const k of [-8, -3, 3, 8]) { x.beginPath(); x.ellipse(15, 21, Math.abs(k), 14, 0, 0, TAU); x.stroke(); }
    x.fillStyle = '#ffd36a'; x.fillRect(14, 36, 2, 4); return c;
  });
}

// ---------------------------------------------------------------- los escenarios
// luz: dirección HACIA la luz principal (pantalla, y hacia abajo), color del contraluz (rim), tono de sombra, luz de
// ambiente que tiñe a los luchadores y color del contorno. grado: etalonaje (soft-light) y viñeta.
export const ESCENARIOS = {
  // ------------------------------------------------ Plaza de los faroles (noche)
  noche: {
    nombre: 'Plaza de los faroles', hora: 'noche', prop: 'farolPiedra', caja: 'madera',
    luz: { dx: 0.62, dy: -0.78, rim: '#c8d8ff', sombra: '#2a1e5e', amb: '#5b4fa8', ambK: 0.12, contorno: '#120c22' },
    grado: { arriba: '#3c3cb0', abajo: '#ff9a5a', fuerza: 0.32, vineta: 0.55, tinta: '#05030f' },
    suelo: { tipo: 'losas', lejos: '#2a2446', cerca: '#3d3358', junta: '#130e20', bisel: '#8a80c0', tam: 170, brillo: 0.5 },
    pintar(k) {
      const [cielo, x] = k.lienzo(ANCHO, ALTO);
      k.vert(x, 0, ALTO, [[0, '#060819'], [0.36, '#15163f'], [0.6, '#3a2560'], [0.76, '#7a3a66'], [1, '#c8646a']], 0, ANCHO);
      k.estrellas(x, 280, 330, [700, 118, 80]);
      k.disco(x, 700, 118, 44, '#fffaf0', '#e6d8bc', '#b8c8ff', 320, 0.34);
      x.fillStyle = 'rgba(110,100,150,.13)'; for (const [a, b, rr] of [[-12, -8, 10], [12, 7, 7], [-4, 17, 6], [17, -15, 5], [-20, 10, 4]]) { x.beginPath(); x.arc(700 + a, 118 + b, rr, 0, TAU); x.fill(); }
      const lejos = k.capa('lejos', 180, 240, 0.07, (x) => {
        k.cresta(x, { base: 336, amp: 130, frec: 0.004, color: '#3b3070', s: 1, pico: 1.5 }); k.cresta(x, { base: 366, amp: 86, frec: 0.0075, color: '#2c2558', s: 2, pico: 1.2 });
        k.atmos(x, 290, 420, '#93507a', 0.05, 0.9);
      });
      const medio = k.capa('medio', 150, 270, 0.24, (x) => {
        const base = 410; let bx = 0;
        while (bx < W) {
          const w = 60 + k.r() * 110, h = 40 + k.r() * 110, col = mezclar('#191535', '#2a2050', k.r() * 0.5), cx = bx + w / 2;
          k.rep(bx, w + 30, (xx) => { x.fillStyle = col; x.fillRect(xx, base - h, w, h); techo(x, xx + w / 2, base - h, w + 8, 16 + k.r() * 10, escalar(col, 0.8)); ventanas(x, k, xx, base - h, w, h, { col: ['#ffcf7a', '#ffb860', '#ffe2a8'], prob: 0.22, cw: 4, ch: 5, px: 12, py: 14 }); });
          if (k.r() < 0.12) k.rep(cx - 60, 120, (xx) => { let y = base - h, tw = 70; for (let t = 0; t < 5; t++) { x.fillStyle = '#1c1738'; x.fillRect(xx + 60 - tw / 2 + 6, y - 26, tw - 12, 26); techo(x, xx + 60, y - 22, tw, 14, '#120f28'); ventanas(x, k, xx + 60 - tw / 2 + 6, y - 26, tw - 12, 26, { col: '#ffcf7a', prob: 0.5, cw: 4, ch: 6, px: 10, py: 12 }); y -= 34; tw *= 0.84; } x.fillStyle = '#120f28'; x.fillRect(xx + 59, y - 30, 2, 26); });
          bx += w + 4 + k.r() * 18;
        }
        k.atmos(x, 330, 420, '#7a3a6a', 0, 0.75);
      });
      const cerca = k.capa('cerca', 200, Y_FONDO + 10 - 200, PAR_CERCA, (x) => {
        const tope = 366;
        for (let i = 0; i < W; i += 18) { x.fillStyle = '#2a2346'; x.beginPath(); x.moveTo(i + 5, tope + 12); x.quadraticCurveTo(i - 1, tope + 26, i + 4, 392); x.lineTo(i + 12, 392); x.quadraticCurveTo(i + 17, tope + 26, i + 11, tope + 12); x.closePath(); x.fill(); x.fillStyle = 'rgba(160,160,230,.18)'; x.fillRect(i + 10, tope + 14, 2, 24); }
        x.fillStyle = '#2f2850'; x.fillRect(0, 390, W, Y_FONDO + 10 - 390); x.fillStyle = '#342c58'; x.fillRect(0, tope, W, 13); x.fillStyle = 'rgba(170,170,240,.55)'; x.fillRect(0, tope, W, 2);
        for (let i = 0; i < W; i += 256) { x.fillStyle = '#2b2450'; x.fillRect(i - 13, tope - 20, 26, 60); x.fillStyle = '#3a3168'; x.fillRect(i - 17, tope - 26, 34, 8); x.fillStyle = 'rgba(180,180,255,.45)'; x.fillRect(i + 8, tope - 20, 3, 60); }
        for (let i = 128; i < W; i += 512) { x.fillStyle = '#1b1530'; x.fillRect(i - 4, 236, 8, tope - 236); x.fillRect(i - 14, 232, 28, 6); x.beginPath(); x.arc(i, 226, 6, 0, TAU); x.fill(); x.fillStyle = 'rgba(180,180,255,.4)'; x.fillRect(i + 2, 238, 2, tope - 238); }
        k.atmos(x, 200, Y_FONDO + 10, '#120c22', 0.0, 0.35);
      });
      const nubes = [k.nube(260, 60, '#6a6aa8', '#2a2450', 14, 1), k.nube(200, 44, '#7a70b0', '#2a2450', 12, 2)];
      return { cielo, capas: [lejos, medio, cerca], nubes };
    },
    vivo(k, P) {
      const farol = farolSprite('#ff6a3a', k.cpu), hF = k.halo('#ffb060'), hL = k.halo('#ffd9a8'), hE = k.halo('#dfe8ff'), estr = Array.from({ length: 14 }, () => [k.r() * ANCHO, k.r() * 260, k.r() * 6]);
      const petalos = Array.from({ length: 16 }, () => [k.r(), k.r(), 0.6 + k.r() * 0.8, k.r() * 6]);
      const faroles = (ctx, E, t, espejo) => E.enPlano(ctx, PAR_CERCA, () => {
        if (espejo) { ctx.translate(0, Y_FONDO * 2); ctx.scale(1, -1); }
        const c = E.centro(PAR_CERCA), i0 = Math.floor((c - 1100 - 128) / 512), i1 = Math.ceil((c + 1100 - 128) / 512);
        ctx.strokeStyle = '#1b1530'; ctx.lineWidth = 1.6;
        for (let i = i0; i < i1; i++) {
          const a = 128 + i * 512, b = a + 512, ya = 240, sag = 46 + Math.sin(t * 0.7 + i) * 3;
          ctx.beginPath(); ctx.moveTo(a, ya); ctx.quadraticCurveTo((a + b) / 2, ya + sag * 2, b, ya); ctx.stroke();
          for (let q = 1; q < 8; q++) {
            const u = q / 8, px = a + (b - a) * u, py = ya + 2 * u * (1 - u) * sag * 2 + 2, sw = Math.sin(t * 1.6 + q * 1.3 + i) * 0.12, fl = 0.82 + 0.18 * Math.sin(t * 9 + q * 3.1 + i);
            ctx.save(); ctx.translate(px, py); ctx.rotate(sw); ctx.drawImage(farol, -9, 0, 18, 24); ctx.restore();
            ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.55 * fl; ctx.drawImage(hF, px - 34 + sw * 10, py - 22, 68, 68); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
          }
        }
      });
      return {
        cielo(ctx, E, t) {
          ctx.globalCompositeOperation = 'lighter';
          for (const [sx, sy, f] of estr) { const a = 0.35 + 0.35 * Math.sin(t * (1.3 + f * 0.3) + f * 7); ctx.globalAlpha = Math.max(0, a); ctx.drawImage(hE, sx - 6, sy - 6, 12, 12); }
          ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
          for (const [i, nb] of P.nubes.entries()) { ctx.globalAlpha = 0.55; ctx.drawImage(nb, ((i * 520 + t * (8 + i * 5) - E.cam.x * 0.03) % 1300 + 1300) % 1300 - 300, 92 + i * 46); }
          ctx.globalAlpha = 1;
        },
        cerca(ctx, E, t) { faroles(ctx, E, t, false); },
        reflejos(ctx, E, t) {
          faroles(ctx, E, t, true);
          ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.22; ctx.drawImage(hL, 700 - 26, Y_FONDO + 6, 52, 150); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        },
        delante(ctx, E, t) {
          ctx.fillStyle = '#ffc6dc';
          for (const [u, v, s, f] of petalos) {
            const y = ((v * ALTO + t * 26 * s) % (ALTO + 40)) - 20, x0 = ((u * ANCHO + Math.sin(t * 0.8 + f) * 40 - t * 18 * s - E.cam.x * 0.9) % (ANCHO + 40) + ANCHO + 40) % (ANCHO + 40) - 20;
            ctx.save(); ctx.translate(x0, y); ctx.rotate(t * 2 * s + f); ctx.globalAlpha = 0.75; ctx.beginPath(); ctx.ellipse(0, 0, 3.6 * s, 1.8 * s, 0, 0, TAU); ctx.fill(); ctx.restore();
          }
          ctx.globalAlpha = 1;
        },
      };
    },
  },

  // ------------------------------------------------ Azotea bajo la tormenta
  azotea: {
    nombre: 'Azotea bajo la tormenta', hora: 'noche', prop: 'tanque', caja: 'metal',
    luz: { dx: -0.55, dy: -0.83, rim: '#86ecff', sombra: '#0f1a3a', amb: '#2f5590', ambK: 0.16, contorno: '#060a16' },
    grado: { arriba: '#1e4a8a', abajo: '#ff3d8a', fuerza: 0.3, vineta: 0.62, tinta: '#02040a' },
    suelo: { tipo: 'concreto', lejos: '#151b2a', cerca: '#232b3e', junta: '#0a0e18', bisel: '#4a6a90', tam: 210, brillo: 0.78 },
    pintar(k) {
      const [cielo, x] = k.lienzo(ANCHO, ALTO);
      k.vert(x, 0, ALTO, [[0, '#04060d'], [0.45, '#0c1426'], [0.68, '#1a2742'], [1, '#2c3656']], 0, ANCHO);
      // nubes de tormenta: ruido a baja resolución, escalado (queda pictórico)
      const [nb, xn] = k.lienzo(240, 100), img = xn.createImageData(240, 100);
      for (let j = 0; j < 100; j++) for (let i = 0; i < 240; i++) {
        const n = k.N.fbm2(i * 0.018, j * 0.045, { octavas: 5 }) * 0.5 + 0.5, a = Math.max(0, Math.min(1, (n - 0.38) * 2.6)), luzAbajo = j / 100;
        const o = (j * 240 + i) * 4; img.data[o] = 26 + luzAbajo * 40 + n * 20; img.data[o + 1] = 34 + luzAbajo * 40 + n * 22; img.data[o + 2] = 58 + luzAbajo * 60 + n * 30; img.data[o + 3] = a * 235;
      }
      xn.putImageData(img, 0, 0); x.imageSmoothingQuality = 'high'; x.drawImage(nb, 0, -10, ANCHO, 360);
      const luces = [];
      const lejos = k.capa('lejos', 140, 290, 0.1, (x) => {
        let bx = 0; while (bx < W) { const w = 28 + k.r() * 70, h = 70 + Math.pow(k.r(), 1.6) * 190, col = mezclar('#121a2e', '#2a3656', 0.35 + k.r() * 0.2); k.rep(bx, w, (xx) => { x.fillStyle = col; x.fillRect(xx, 410 - h, w, h); ventanas(x, k, xx, 410 - h, w, h, { col: ['#a8e6ff', '#ffffff', '#ffd9a0'], prob: 0.2, cw: 2, ch: 3, px: 6, py: 8, alfa: 0.55 }); if (h > 170) { x.fillStyle = col; x.fillRect(xx + w / 2 - 1, 410 - h - 30, 2, 30); } }); if (h > 170) luces.push([bx + w / 2, 410 - h - 30, 0.1]); bx += w + 2 + k.r() * 8; }
        k.atmos(x, 250, 430, '#3a4a6e', 0.1, 0.85);
      });
      const neones = [];
      const medio = k.capa('medio', 110, 310, 0.3, (x) => {
        let bx = 0; while (bx < W) {
          const w = 70 + k.r() * 120, h = 110 + k.r() * 170, col = mezclar('#0a0f1e', '#1a2238', k.r() * 0.4);
          k.rep(bx, w, (xx) => { x.fillStyle = col; x.fillRect(xx, 412 - h, w, h); ventanas(x, k, xx, 412 - h, w, h, { col: ['#ffd9a0', '#9fe3ff', '#ffffff'], prob: 0.18, cw: 3, ch: 4, px: 10, py: 12, alfa: 0.7 }); x.fillStyle = 'rgba(120,200,255,.16)'; x.fillRect(xx, 412 - h, 2, h); });
          if (k.r() < 0.55) {
            const nc = k.r() < 0.5 ? '#ff4fa8' : '#4ff0ff', sx = bx + w - 8, sy = 412 - h + 30 + k.r() * 40, sh = 70 + k.r() * 50; neones.push([sx + 10, sy + sh / 2, nc, sh]);
            k.rep(sx, 24, (xx) => { x.fillStyle = '#05070d'; x.fillRect(xx, sy, 20, sh); x.shadowColor = nc; x.shadowBlur = 14; x.fillStyle = nc; for (let g = sy + 6; g < sy + sh - 10; g += 16) { const f = Math.floor(k.r() * 3); if (f === 0) x.fillRect(xx + 5, g, 10, 3); else if (f === 1) { x.fillRect(xx + 5, g, 3, 10); x.fillRect(xx + 5, g + 7, 10, 3); } else { x.strokeStyle = nc; x.lineWidth = 2.5; x.strokeRect(xx + 5, g, 10, 9); } } x.shadowBlur = 0; });
          }
          bx += w + 6 + k.r() * 30;
        }
        k.atmos(x, 300, 420, '#22304e', 0, 0.55);
      });
      const cerca = k.capa('cerca', 220, Y_FONDO + 10 - 220, PAR_CERCA, (x) => {
        // tanque de agua sobre patas, antena, malla y unidades de aire
        for (let i = 300; i < W; i += 1024) { x.fillStyle = '#101624'; for (const dx of [-40, -14, 14, 40]) x.fillRect(i + dx - 3, 300, 6, 90); x.strokeStyle = '#101624'; x.lineWidth = 2; x.beginPath(); x.moveTo(i - 40, 310); x.lineTo(i + 40, 360); x.moveTo(i + 40, 310); x.lineTo(i - 40, 360); x.stroke(); x.fillStyle = '#1a2236'; x.fillRect(i - 52, 236, 104, 68); x.beginPath(); x.ellipse(i, 236, 52, 10, 0, 0, TAU); x.fill(); x.fillStyle = 'rgba(134,236,255,.25)'; x.fillRect(i - 52, 236, 4, 68); for (let b = 250; b < 300; b += 16) { x.fillStyle = '#0e1424'; x.fillRect(i - 52, b, 104, 3); } }
        for (let i = 760; i < W; i += 1024) { x.fillStyle = '#0e1322'; x.fillRect(i - 2, 240, 4, 150); x.beginPath(); x.ellipse(i + 14, 270, 14, 20, -0.4, 0, TAU); x.fill(); luces.push([i, 238, PAR_CERCA]); }
        for (let i = 0; i < W; i += 160) { x.fillStyle = '#121a2c'; x.fillRect(i, 300, 4, 82); x.strokeStyle = 'rgba(120,150,190,.18)'; x.lineWidth = 1; x.beginPath(); for (let m = 0; m < 160; m += 8) { x.moveTo(i + m, 300); x.lineTo(i + m + 82 * 0.5, 382); x.moveTo(i + m + 41, 300); x.lineTo(i + m, 382); } x.stroke(); }
        for (let i = 520; i < W; i += 640) { x.fillStyle = '#1e2638'; x.fillRect(i, 346, 86, 44); x.fillStyle = '#121828'; x.beginPath(); x.arc(i + 28, 368, 15, 0, TAU); x.fill(); x.strokeStyle = '#2a3450'; x.lineWidth = 2; for (let a = 0; a < 3; a++) { x.beginPath(); x.moveTo(i + 28, 368); x.lineTo(i + 28 + Math.cos(a * 2.1) * 13, 368 + Math.sin(a * 2.1) * 13); x.stroke(); } for (let l = 352; l < 386; l += 6) { x.fillStyle = '#121828'; x.fillRect(i + 52, l, 28, 2); } x.fillStyle = 'rgba(134,236,255,.3)'; x.fillRect(i, 346, 86, 2); }
        x.fillStyle = '#1b2235'; x.fillRect(0, 382, W, Y_FONDO + 10 - 382); x.fillStyle = '#28324c'; x.fillRect(0, 378, W, 8); x.fillStyle = 'rgba(134,236,255,.4)'; x.fillRect(0, 378, W, 1.5);
      });
      return { cielo, capas: [lejos, medio, cerca], luces, neones };
    },
    vivo(k, P) {
      const hR = k.halo('#ff4040'), hA = k.halo('#cfe6ff'), lluvia = Array.from({ length: 150 }, () => [k.r(), k.r(), 0.7 + k.r() * 0.6]), salpic = Array.from({ length: 22 }, () => [k.r(), k.r(), k.r()]);
      let rayo = null, ciclo = -1;
      const neon = (ctx, E, t, espejo) => E.enPlano(ctx, 0.3, () => {
        if (espejo) { ctx.translate(0, Y_FONDO * 2); ctx.scale(1, -1); }
        ctx.globalCompositeOperation = 'lighter';
        for (const [i, [nx, ny, nc, nh]] of P.neones.entries()) { const lx = E.copia(nx, 0.3), on = Math.sin(t * 13 + i * 5) > -0.92 || i % 3; ctx.globalAlpha = on ? (espejo ? 0.35 : 0.5) : 0.08; ctx.drawImage(k.halo(nc), lx - 40, ny - nh * 0.7, 80, nh * 1.4); }
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      });
      return {
        destello: 0,
        cielo(ctx, E, t) {
          const c = Math.floor(t / 6.7); if (c !== ciclo) { ciclo = c; const p = crearPRNG(c * 977 + 13); let x0 = 120 + p.num() * 720, y0 = 0; rayo = [[x0, y0]]; while (y0 < 300) { x0 += (p.num() - 0.5) * 60; y0 += 18 + p.num() * 26; rayo.push([x0, y0]); } }
          const f = t % 6.7, vis = f < 0.42 && (f < 0.1 || (f > 0.18 && f < 0.3));
          this.destello = vis && !E.acc?.reducirDestellos ? (f < 0.1 ? 1 : 0.6) : 0;
          if (vis) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineJoin = 'round'; for (const [w, a] of [[9, 0.18], [3, 0.6], [1.4, 1]]) { ctx.strokeStyle = conAlfa('#d8ecff', E.acc?.reducirDestellos ? a * 0.35 : a); ctx.lineWidth = w; ctx.beginPath(); rayo.forEach(([a1, b1], i) => (i ? ctx.lineTo(a1, b1) : ctx.moveTo(a1, b1))); ctx.stroke(); } ctx.restore(); }
        },
        lejos(ctx, E, t) {
          ctx.globalCompositeOperation = 'lighter';
          for (const [i, [lx, ly, par]] of P.luces.entries()) { const on = Math.sin(t * 2.4 + i * 1.7) > 0.55; if (!on) continue; E.enPlano(ctx, par, () => { ctx.drawImage(hR, E.copia(lx, par) - 9, ly - 9, 18, 18); }); }
          ctx.globalCompositeOperation = 'source-over';
        },
        medio(ctx, E, t) { neon(ctx, E, t, false); },
        reflejos(ctx, E, t) { neon(ctx, E, t, true); },
        suelo(ctx, E, t) {
          ctx.strokeStyle = 'rgba(170,215,255,.35)'; ctx.lineWidth = 1;
          for (const [u, v, f] of salpic) { const ph = (t * 1.6 + f) % 1, y = Y_FONDO + 12 + v * (ALTO - Y_FONDO - 10) + E.cam.y, esc = (y - Y_HOR) / HC, rx = (2 + ph * 12) * esc, x0 = ((u * ANCHO * 1.3 - E.cam.x * E.cam.zoom * esc) % ANCHO + ANCHO) % ANCHO; ctx.globalAlpha = 1 - ph; ctx.beginPath(); ctx.ellipse(x0, y, rx, rx * 0.22, 0, 0, TAU); ctx.stroke(); }
          ctx.globalAlpha = 1;
        },
        delante(ctx, E, t) {
          ctx.lineCap = 'round';
          for (const [capaL, n0, n1, a, w, vel, largo] of [[0, 0, 100, 0.2, 1, 900, 14], [1, 100, 150, 0.32, 1.6, 1300, 22]]) {
            ctx.strokeStyle = `rgba(180,215,255,${a})`; ctx.lineWidth = w; ctx.beginPath();
            for (let i = n0; i < n1; i++) { const [u, v, s] = lluvia[i], y = ((v * ALTO + t * vel * s) % (ALTO + 40)) - 20, x0 = ((u * ANCHO - t * vel * 0.25 * s - E.cam.x * (0.6 + capaL * 0.4)) % ANCHO + ANCHO) % ANCHO; ctx.moveTo(x0, y); ctx.lineTo(x0 - largo * 0.25, y + largo); }
            ctx.stroke();
          }
        },
        post(ctx, E) { if (this.destello > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(120,150,220,${this.destello * 0.22})`; ctx.fillRect(-MARGEN, -MARGEN, ANCHO + MARGEN * 2, ALTO + MARGEN * 2); ctx.globalCompositeOperation = 'source-over'; } },
      };
    },
  },

  // ------------------------------------------------ Dojo del amanecer
  dojo: {
    nombre: 'Dojo del amanecer', hora: 'amanecer', prop: 'poste', caja: 'madera',
    luz: { dx: -0.72, dy: -0.6, rim: '#ffe0b0', sombra: '#5a2a30', amb: '#ff9a6a', ambK: 0.1, contorno: '#1e120c' },
    grado: { arriba: '#ffb08a', abajo: '#4a2418', fuerza: 0.28, vineta: 0.45, tinta: '#1a0c06' },
    suelo: { tipo: 'tablas', lejos: '#6a4228', cerca: '#93613a', junta: '#2e1a0e', tam: 46, brillo: 0.34 },
    pintar(k) {
      const [cielo, x] = k.lienzo(ANCHO, ALTO);
      k.vert(x, 0, ALTO, [[0, '#f2a99a'], [0.45, '#ffd0a8'], [0.72, '#fff0d4'], [1, '#ffe8c0']], 0, ANCHO);
      k.disco(x, 300, 330, 34, '#fffdf2', '#ffe8b8', '#ffd8a0', 300, 0.5);
      const lejos = k.capa('lejos', 200, 230, 0.06, (x) => {
        k.cresta(x, { base: 330, amp: 110, frec: 0.004, color: '#b098b8', s: 4, pico: 1.3 }); k.cresta(x, { base: 360, amp: 70, frec: 0.008, color: '#9a86a8', s: 5 });
        k.atmos(x, 260, 420, '#ffe0c0', 0.15, 0.85);
      });
      const medio = k.capa('medio', 230, 200, 0.2, (x) => {
        x.fillStyle = '#6a5a6a'; x.fillRect(0, 376, W, 40); x.fillStyle = '#5a4a5a'; for (let i = 0; i < W; i += 40) x.fillRect(i, 370, 38, 8);
        for (let i = 0; i < 26; i++) { const cx = k.r() * W, h = 60 + k.r() * 90; k.rep(cx - 70, 140, (xx) => { x.fillStyle = '#7a5a6a'; x.fillRect(xx + 68, 380 - h * 0.5, 5, h * 0.5); for (let q = 0; q < 7; q++) { x.fillStyle = q % 2 ? '#b0607a' : '#c87a80'; x.beginPath(); x.ellipse(xx + 70 + (k.r() - 0.5) * 70, 380 - h * 0.5 - k.r() * h * 0.5, 26 + k.r() * 16, 16 + k.r() * 10, 0, 0, TAU); x.fill(); } }); }
        k.atmos(x, 250, 420, '#ffe6c8', 0.3, 0.65);
      });
      const puertas = [];
      const cerca = k.capa('cerca', -220, Y_FONDO + 230, PAR_CERCA, (x) => {
        x.fillStyle = '#5c3b26'; x.fillRect(0, -220, W, Y_FONDO + 230);
        // techo con vigas (sube por encima de la pantalla: con el zoom alejado no se ve el cielo sobre el techo)
        k.vert(x, -220, 64, [[0, '#120a06'], [1, '#2e1c12']]); for (let i = 0; i < W; i += 64) { x.fillStyle = '#24160c'; x.fillRect(i, -220, 10, 284); } for (let y = -200; y < 60; y += 52) { x.fillStyle = '#1e120a'; x.fillRect(0, y, W, 8); }
        x.fillStyle = '#3a2414'; x.fillRect(0, 62, W, 22); x.fillStyle = 'rgba(255,200,150,.22)'; x.fillRect(0, 82, W, 2);
        x.fillStyle = '#e8d4ae'; x.fillRect(0, 84, W, 36); x.strokeStyle = '#6a4a30'; x.lineWidth = 2; x.beginPath(); for (let i = 0; i < W; i += 24) { x.moveTo(i, 86); x.lineTo(i + 12, 118); x.lineTo(i + 24, 86); } x.stroke();
        const tipos = ['abierta', 'shoji', 'pergamino', 'abierta', 'armero', 'shoji', 'abierta', 'pergamino'];
        for (let b = 0; b < W / 256; b++) {
          const x0 = b * 256 + 14, w = 228, tipo = tipos[b % tipos.length];
          if (tipo === 'abierta') { x.clearRect(x0, 120, w, Y_FONDO - 120); puertas.push(x0); x.fillStyle = '#e8d6b4'; x.fillRect(x0 - 4, 120, 44, Y_FONDO - 124); x.strokeStyle = '#6b4a2c'; x.lineWidth = 3; for (let g = x0; g < x0 + 40; g += 13) { x.beginPath(); x.moveTo(g, 120); x.lineTo(g, Y_FONDO - 4); x.stroke(); } for (let g = 140; g < Y_FONDO; g += 44) { x.beginPath(); x.moveTo(x0 - 4, g); x.lineTo(x0 + 40, g); x.stroke(); } }
          else if (tipo === 'shoji') { const g = x.createRadialGradient(x0 + w / 2, 330, 20, x0 + w / 2, 300, 260); g.addColorStop(0, '#fff6dc'); g.addColorStop(1, '#e8cfa0'); x.fillStyle = g; x.fillRect(x0, 120, w, Y_FONDO - 124); x.strokeStyle = '#6b4a2c'; x.lineWidth = 3; x.beginPath(); for (let gx = x0; gx <= x0 + w; gx += 38) { x.moveTo(gx, 120); x.lineTo(gx, Y_FONDO - 4); } for (let gy = 120; gy < Y_FONDO; gy += 46) { x.moveTo(x0, gy); x.lineTo(x0 + w, gy); } x.stroke(); x.fillStyle = 'rgba(120,80,60,.2)'; x.fillRect(x0 + 60, 210, 4, 130); x.beginPath(); x.ellipse(x0 + 90, 200, 40, 20, -0.4, 0, TAU); x.fill(); }
          else if (tipo === 'pergamino') { x.fillStyle = '#6a4630'; x.fillRect(x0, 120, w, Y_FONDO - 124); for (let l = 0; l < 7; l++) { x.fillStyle = 'rgba(30,15,8,.18)'; x.fillRect(x0, 130 + l * 40, w, 2); } const sx = x0 + w / 2 - 38; x.fillStyle = '#2a1a10'; x.fillRect(sx - 6, 140, 88, 7); x.fillRect(sx - 6, 338, 88, 9); x.fillStyle = '#efe2c8'; x.fillRect(sx, 147, 76, 191); x.strokeStyle = '#22140c'; x.lineCap = 'round'; for (let s = 0; s < 22; s++) { const a = 0.4 + s * 0.24; x.lineWidth = 3 + Math.sin(s / 22 * Math.PI) * 6; x.beginPath(); x.arc(sx + 38, 232, 26, a, a + 0.26); x.stroke(); } x.fillStyle = '#b8282a'; x.fillRect(sx + 52, 296, 10, 10); x.lineCap = 'butt'; }
          else { x.fillStyle = '#6a4630'; x.fillRect(x0, 120, w, Y_FONDO - 124); x.fillStyle = '#3a2414'; x.fillRect(x0 + 30, 180, w - 60, 10); x.fillRect(x0 + 30, 330, w - 60, 10); for (let s = 0; s < 7; s++) { x.fillStyle = s % 2 ? '#a8784a' : '#8a5a34'; x.fillRect(x0 + 44 + s * 24, 150, 6, 210); x.fillStyle = 'rgba(255,230,190,.25)'; x.fillRect(x0 + 44 + s * 24, 150, 2, 210); } }
          x.fillStyle = '#3a2414'; x.fillRect(b * 256 - 14, 84, 28, Y_FONDO + 10 - 84); x.fillStyle = 'rgba(255,210,160,.25)'; x.fillRect(b * 256 - 14, 84, 3, Y_FONDO - 84); x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(b * 256 + 8, 84, 6, Y_FONDO - 84);
        }
        x.fillStyle = '#2e1c12'; x.fillRect(0, Y_FONDO - 8, W, 18); x.fillStyle = '#4a2e1a'; x.fillRect(0, 360, W, 4);
      });
      // rayos de sol por las puertas: paralelogramos que bajan hasta el suelo (mismo plano que la pared)
      const rayosP = k.capa('rayos', 0, ALTO + MARGEN, PAR_CERCA, (x) => {
        for (const x0 of puertas) { const g = x.createLinearGradient(0, 120, 0, ALTO); g.addColorStop(0, 'rgba(255,220,170,.0)'); g.addColorStop(0.25, 'rgba(255,215,160,.20)'); g.addColorStop(0.75, 'rgba(255,200,140,.14)'); g.addColorStop(1, 'rgba(255,200,140,0)'); x.fillStyle = g; x.beginPath(); x.moveTo(x0 + 44, 120); x.lineTo(x0 + 228, 120); x.lineTo(x0 + 228 + 240, ALTO + 20); x.lineTo(x0 + 44 + 240, ALTO + 20); x.closePath(); x.fill(); }
      }, { aditiva: true, tras: 'suelo' });
      return { cielo, capas: [lejos, medio, cerca, rayosP] };
    },
    vivo(k) {
      const motas = Array.from({ length: 46 }, () => [k.r(), k.r(), k.r()]), hM = k.halo('#ffe8c0'), lampara = farolSprite('#f4e0b8', k.cpu), hL = k.halo('#ffd8a0');
      return {
        cerca(ctx, E, t) {
          E.enPlano(ctx, PAR_CERCA, () => { const c = E.centro(PAR_CERCA); for (let i = Math.floor((c - 1000) / 512); i <= Math.ceil((c + 1000) / 512); i++) { const lx = i * 512 + 256, sw = Math.sin(t * 0.9 + i) * 0.04; ctx.strokeStyle = '#1c110a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(lx, 84); ctx.lineTo(lx + Math.sin(sw) * 60, 140); ctx.stroke(); ctx.save(); ctx.translate(lx + Math.sin(sw) * 60, 140); ctx.rotate(sw); ctx.drawImage(lampara, -15, 0, 30, 40); ctx.restore(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5; ctx.drawImage(hL, lx + Math.sin(sw) * 60 - 50, 110, 100, 100); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; } });
        },
        delante(ctx, E, t) {
          ctx.globalCompositeOperation = 'lighter';
          for (const [u, v, f] of motas) { const x0 = ((u * ANCHO + Math.sin(t * 0.3 + f * 9) * 30 - E.cam.x * 0.7) % ANCHO + ANCHO) % ANCHO, y = ((v * 420 + 90 - t * 6 * (0.5 + f)) % 420 + 420) % 420 + 60, a = 0.25 + 0.25 * Math.sin(t * 1.5 + f * 20); ctx.globalAlpha = Math.max(0, a); ctx.drawImage(hM, x0 - 3, y - 3, 6, 6); }
          ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        },
      };
    },
  },

  // ------------------------------------------------ Puerto al atardecer
  puerto: {
    nombre: 'Puerto al atardecer', hora: 'tarde', prop: 'poste', caja: 'madera',
    luz: { dx: -0.78, dy: -0.42, rim: '#ffb26e', sombra: '#3a1f50', amb: '#ff7a5a', ambK: 0.12, contorno: '#1a0f1c' },
    grado: { arriba: '#5a3ab0', abajo: '#ffa060', fuerza: 0.3, vineta: 0.5, tinta: '#140818' },
    suelo: { tipo: 'muelle', lejos: '#5a3a30', cerca: '#7c5038', junta: '#22130e', tam: 30, brillo: 0.16 },
    pintar(k) {
      const [cielo, x] = k.lienzo(ANCHO, ALTO);
      k.vert(x, 0, 332, [[0, '#23285a'], [0.35, '#5a3a78'], [0.65, '#d4626a'], [0.86, '#ff9a5a'], [1, '#ffd08a']], 0, ANCHO);
      k.disco(x, 300, 318, 40, '#fffbe8', '#ffd890', '#ffb070', 330, 0.55);
      for (let i = 0; i < 9; i++) { const cy = 90 + i * 26 + k.r() * 10, cx = k.r() * ANCHO, w = 160 + k.r() * 260, h = 8 + k.r() * 8; x.fillStyle = conAlfa('#4a2a5a', 0.55); x.beginPath(); x.ellipse(cx, cy, w, h, 0, 0, TAU); x.fill(); x.fillStyle = conAlfa('#ff9a6a', 0.55 + i * 0.03); x.beginPath(); x.ellipse(cx + 10, cy + h * 0.55, w * 0.9, h * 0.45, 0, 0, TAU); x.fill(); }
      k.vert(x, 332, ALTO, [[0, '#7a4a7a'], [0.15, '#4a3666'], [1, '#2a2450']], 0, ANCHO);
      for (let y = 334; y < 430; y += 2) { const d = (y - 332) / 100, w = 24 + d * 150; for (let s = 0; s < 3; s++) { if (k.r() < 0.6) { x.fillStyle = conAlfa('#ffd89a', 0.5 * (1 - d * 0.6) * k.r()); x.fillRect(300 - w / 2 + k.r() * w, y, 6 + k.r() * 22, 1.2); } } x.fillStyle = 'rgba(255,190,160,.05)'; x.fillRect(0, y, ANCHO, 1); }
      const lejos = k.capa('lejos', 280, 80, 0.05, (x) => { k.cresta(x, { base: 334, amp: 22, frec: 0.006, color: '#4a3462', s: 6, pico: 2, fondo: 334 }); x.fillStyle = '#4a3462'; x.fillRect(1400, 300, 5, 32); x.fillStyle = '#ffe2a0'; x.fillRect(1400, 298, 5, 4); });
      const medio = k.capa('medio', 120, 300, 0.25, (x) => {
        const col = '#2a2242', lit = 'rgba(255,150,100,.55)';
        for (let i = 200; i < W; i += 680) { x.fillStyle = col; x.fillRect(i, 230, 10, 170); x.fillRect(i + 70, 230, 10, 170); x.fillRect(i - 20, 222, 290, 12); x.fillRect(i + 240, 222, 10, 60); x.strokeStyle = col; x.lineWidth = 4; x.beginPath(); x.moveTo(i, 400); x.lineTo(i + 75, 330); x.lineTo(i + 80, 400); x.moveTo(i + 5, 300); x.lineTo(i + 75, 260); x.moveTo(i + 40, 222); x.lineTo(i + 110, 160); x.lineTo(i + 270, 222); x.stroke(); x.lineWidth = 1.5; x.beginPath(); x.moveTo(i + 200, 234); x.lineTo(i + 200, 310); x.stroke(); x.fillStyle = lit; x.fillRect(i - 20, 222, 290, 2); }
        for (let i = 0; i < 40; i++) { const cx = k.r() * W, n = 1 + Math.floor(k.r() * 4), cw = 70 + k.r() * 50; k.rep(cx, cw, (xx) => { for (let q = 0; q < n; q++) { const c = ['#6a3434', '#2f4a6a', '#6a5a30', '#3a5a4a', '#5a3a5a'][Math.floor(k.r() * 5)]; x.fillStyle = mezclar(c, '#3a2a4a', 0.4); x.fillRect(xx, 398 - (q + 1) * 26, cw, 25); x.fillStyle = 'rgba(0,0,0,.25)'; for (let l = 6; l < cw; l += 8) x.fillRect(xx + l, 398 - (q + 1) * 26 + 3, 1.5, 19); x.fillStyle = lit; x.fillRect(xx, 398 - (q + 1) * 26, cw, 1.5); } }); }
        x.fillStyle = '#231c38'; x.beginPath(); x.moveTo(1150, 400); x.lineTo(1180, 350); x.lineTo(1620, 350); x.lineTo(1640, 400); x.fill(); x.fillRect(1480, 300, 90, 52); x.fillRect(1520, 270, 20, 32); x.fillStyle = lit; x.fillRect(1180, 350, 440, 2);
        k.atmos(x, 200, 420, '#c87a8a', 0.1, 0.55);
      });
      const cerca = k.capa('cerca', 250, Y_FONDO + 10 - 250, PAR_CERCA, (x) => {
        for (let i = 0; i < W; i += 150) { x.fillStyle = '#2a1c1c'; x.fillRect(i - 4, 350, 8, 50); x.fillStyle = 'rgba(255,170,110,.5)'; x.fillRect(i - 4, 350, 2, 50); x.strokeStyle = '#1e1414'; x.lineWidth = 2.5; x.beginPath(); x.moveTo(i, 358); x.quadraticCurveTo(i + 75, 378, i + 150, 358); x.stroke(); }
        for (let i = 90; i < W; i += 600) { x.fillStyle = '#221616'; x.beginPath(); x.moveTo(i - 12, 404); x.lineTo(i - 9, 378); x.quadraticCurveTo(i, 368, i + 9, 378); x.lineTo(i + 12, 404); x.fill(); x.fillRect(i - 16, 372, 32, 7); x.fillStyle = 'rgba(255,170,110,.5)'; x.fillRect(i - 16, 372, 32, 1.5); }
        x.fillStyle = '#1e1416'; x.fillRect(1022, 250, 6, 150); x.fillRect(1010, 250, 30, 5); x.fillStyle = '#2a1e1e'; x.fillRect(1014, 254, 22, 26);
        for (const [cx, n] of [[600, 3], [1500, 2]]) for (let q = 0; q < n; q++) { x.fillStyle = '#5a3a26'; x.fillRect(cx + q * 12, 404 - (q + 1) * 34, 44, 33); x.strokeStyle = '#2a1a12'; x.lineWidth = 2; x.strokeRect(cx + q * 12, 404 - (q + 1) * 34, 44, 33); x.beginPath(); x.moveTo(cx + q * 12, 404 - (q + 1) * 34); x.lineTo(cx + q * 12 + 44, 404 - q * 34); x.stroke(); x.fillStyle = 'rgba(255,170,110,.4)'; x.fillRect(cx + q * 12, 404 - (q + 1) * 34, 44, 1.5); }
        x.fillStyle = '#3a2620'; x.fillRect(0, 398, W, 12); x.fillStyle = 'rgba(255,180,120,.35)'; x.fillRect(0, 398, W, 1.5);
      });
      return { cielo, capas: [lejos, medio, cerca], nubes: [k.nube(240, 50, '#ffb08a', '#7a4a7a', 14, 3), k.nube(180, 40, '#ffc09a', '#6a4078', 12, 4)] };
    },
    vivo(k, P) {
      const hS = k.halo('#ffe0a0'), hL = k.halo('#ffc070'), gaviotas = Array.from({ length: 5 }, () => [k.r(), k.r(), 0.6 + k.r() * 0.6]), brillos = Array.from({ length: 40 }, () => [k.r(), k.r(), k.r()]);
      const farola = (ctx, E, t, espejo) => E.enPlano(ctx, PAR_CERCA, () => { if (espejo) { ctx.translate(0, Y_FONDO * 2); ctx.scale(1, -1); } const lx = E.copia(1025, PAR_CERCA), f = 0.85 + Math.sin(t * 7) * 0.08; ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = f * (espejo ? 0.4 : 0.8); ctx.drawImage(hL, lx - 50, 217, 100, 100); ctx.fillStyle = '#ffe2a8'; ctx.fillRect(lx - 7, 258, 14, 18); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; });
      return {
        cielo(ctx, E, t) {
          for (const [i, nb] of P.nubes.entries()) { ctx.globalAlpha = 0.6; ctx.drawImage(nb, ((i * 610 + t * (5 + i * 4) - E.cam.x * 0.04) % 1300 + 1300) % 1300 - 300, 150 + i * 60); } ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = 'lighter';
          for (const [u, v, f] of brillos) { const y = 336 + v * 80, w = 20 + (y - 332) * 1.3, x0 = 300 - E.cam.x * 0.02 + (u - 0.5) * w, a = Math.max(0, Math.sin(t * 3 + f * 30)); ctx.globalAlpha = a * 0.7; ctx.drawImage(hS, x0 - 6, y - 2, 12, 4); }
          ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
          ctx.strokeStyle = '#2a1a30'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
          for (const [u, v, s] of gaviotas) { const x0 = ((u * 1200 + t * 30 * s - E.cam.x * 0.15) % 1200 + 1200) % 1200 - 120, y = 80 + v * 140 + Math.sin(t * 0.7 + u * 9) * 10, a = Math.sin(t * 6 * s + u * 20) * 4 * s, w = 7 * s; ctx.beginPath(); ctx.moveTo(x0 - w, y - a); ctx.quadraticCurveTo(x0 - w * 0.4, y - 2, x0, y); ctx.quadraticCurveTo(x0 + w * 0.4, y - 2, x0 + w, y - a); ctx.stroke(); }
        },
        cerca(ctx, E, t) { farola(ctx, E, t, false); },
        reflejos(ctx, E, t) { farola(ctx, E, t, true); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.16; ctx.drawImage(hS, 300 - 30 - E.cam.x * 0.02, Y_FONDO, 60, 120); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; },
      };
    },
  },

  // ------------------------------------------------ Cantera del templo (el jefe vive aquí)
  templo: {
    nombre: 'Cantera del templo', hora: 'tarde', prop: 'columna', caja: 'piedra',
    luz: { dx: 0.5, dy: -0.78, rim: '#ffc27a', sombra: '#3a1a34', amb: '#ff6a4a', ambK: 0.12, contorno: '#1a0c14' },
    grado: { arriba: '#a03a7a', abajo: '#ffb060', fuerza: 0.3, vineta: 0.56, tinta: '#120408' },
    suelo: { tipo: 'templo', lejos: '#5a3a3a', cerca: '#7c5444', junta: '#26141a', bisel: '#ffb080', tam: 190, brillo: 0.1 },
    pintar(k) {
      const [cielo, x] = k.lienzo(ANCHO, ALTO);
      k.vert(x, 0, 420, [[0, '#1c0a26'], [0.3, '#5a1a3e'], [0.55, '#b8403c'], [0.78, '#f08a4a'], [1, '#ffd08a']], 0, ANCHO); x.fillStyle = '#ffd08a'; x.fillRect(0, 420, ANCHO, 120);
      k.disco(x, 610, 228, 54, '#fffce8', '#ffd890', '#ffb060', 420, 0.5);
      for (let i = 0; i < 7; i++) { const cy = 150 + i * 30 + k.r() * 14, w = 200 + k.r() * 320, cx = k.r() * ANCHO; x.fillStyle = conAlfa('#4a1838', 0.35 + k.r() * 0.3); x.beginPath(); x.ellipse(cx, cy, w, 4 + k.r() * 5, 0, 0, TAU); x.fill(); x.fillStyle = conAlfa('#ffb080', 0.25); x.beginPath(); x.ellipse(cx + 6, cy + 3, w * 0.85, 2, 0, 0, TAU); x.fill(); }
      const rayos = k.rayos(610, 228, '#ffd8a0', 22, 760, 0.035, 0.22, 0, TAU);
      const lejos = k.capa('lejos', 220, 210, 0.05, (x) => {
        for (const [base, alto, col] of [[350, 120, '#8a4048'], [376, 70, '#6e3040']]) { x.fillStyle = col; x.beginPath(); x.moveTo(0, 430); let px = 0; while (px < W) { const w = 120 + k.r() * 260, h = alto * (0.4 + k.r() * 0.6), lad = 20 + k.r() * 30; x.lineTo(px + lad, base - h); x.lineTo(px + w - lad, base - h); x.lineTo(px + w, base - h * 0.2 * k.r()); px += w; } x.lineTo(W, base); x.lineTo(W, 430); x.closePath(); x.fill(); }
        x.fillStyle = 'rgba(255,190,140,.12)'; for (let i = 0; i < 40; i++) x.fillRect(k.r() * W, 250 + k.r() * 120, 40 + k.r() * 120, 1.5);
        k.atmos(x, 230, 430, '#f08a5a', 0.35, 0.85);
      });
      const medio = k.capa('medio', 30, 400, 0.2, (x) => {
        k.cresta(x, { base: 300, amp: 90, frec: 0.006, color: '#4a2232', s: 8, pico: 0.8, oct: 3 });
        x.fillStyle = '#4a2232'; x.fillRect(0, 300, W, 130);
        // guardián sentado tallado en la roca (diseño original: bloques, manos en las rodillas, corona escalonada)
        for (const gx of [1780]) {
          const c = '#3e1c2c', l = 'rgba(255,160,100,.55)';
          x.fillStyle = c; x.fillRect(gx - 150, 360, 300, 40); x.fillRect(gx - 130, 300, 260, 64); x.fillRect(gx - 70, 170, 140, 140); x.fillRect(gx - 100, 210, 34, 110); x.fillRect(gx + 66, 210, 34, 110); x.fillRect(gx - 112, 296, 62, 22); x.fillRect(gx + 50, 296, 62, 22);
          x.fillRect(gx - 40, 104, 80, 72); for (let s = 0; s < 4; s++) x.fillRect(gx - 46 + s * 8, 104 - (s + 1) * 12, 92 - s * 16, 13); x.fillRect(gx - 50, 140, 12, 30); x.fillRect(gx + 38, 140, 12, 30);
          x.fillStyle = l; x.fillRect(gx + 68, 170, 2, 140); x.fillRect(gx + 98, 210, 2, 110); x.fillRect(gx + 38, 104, 2, 72); x.fillRect(gx + 128, 300, 2, 64); x.fillRect(gx - 150, 360, 300, 1.5); x.fillRect(gx - 40, 104, 80, 1.5);
          x.fillStyle = 'rgba(255,180,120,.25)'; x.fillRect(gx - 22, 136, 14, 3); x.fillRect(gx + 8, 136, 14, 3); x.fillRect(gx - 8, 158, 16, 2);
          x.strokeStyle = 'rgba(20,6,12,.6)'; x.lineWidth = 2; x.beginPath(); x.moveTo(gx + 20, 180); x.lineTo(gx + 6, 230); x.lineTo(gx + 24, 270); x.stroke();
        }
        const fx0 = 420; x.fillStyle = '#3e1c2c'; x.fillRect(fx0 - 170, 210, 340, 190); x.beginPath(); x.moveTo(fx0 - 190, 212); x.lineTo(fx0, 150); x.lineTo(fx0 + 190, 212); x.fill();
        for (let c = 0; c < 6; c++) { x.fillStyle = '#5a2a38'; x.fillRect(fx0 - 150 + c * 58, 224, 22, 170); x.fillStyle = 'rgba(255,160,100,.45)'; x.fillRect(fx0 - 150 + c * 58 + 19, 224, 3, 170); }
        x.fillStyle = '#1a0a12'; x.fillRect(fx0 - 32, 280, 64, 120); x.fillStyle = 'rgba(255,190,120,.25)'; x.fillRect(fx0 - 32, 280, 64, 120);
        for (let s = 0; s < 6; s++) { x.fillStyle = s % 2 ? '#4a2232' : '#55283a'; x.fillRect(fx0 - 80 - s * 14, 400 - (6 - s) * 4, 160 + s * 28, 4); }
        k.atmos(x, 100, 430, '#d0604a', 0.12, 0.55);
      });
      const cerca = k.capa('cerca', 150, Y_FONDO + 10 - 150, PAR_CERCA, (x) => {
        const piedra = '#4e2c32', lit = 'rgba(255,170,110,.6)';
        const columna = (cx, top, roto) => { x.fillStyle = piedra; x.fillRect(cx - 24, top, 48, 404 - top); for (let f = -16; f <= 16; f += 8) { x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(cx + f, top, 2, 404 - top); } x.fillStyle = lit; x.fillRect(cx + 20, top, 4, 404 - top); x.fillStyle = '#5e3640'; x.fillRect(cx - 34, 390, 68, 14); if (roto) { x.fillStyle = piedra; x.beginPath(); x.moveTo(cx - 24, top); x.lineTo(cx - 10, top - 18); x.lineTo(cx + 4, top - 6); x.lineTo(cx + 24, top - 24); x.lineTo(cx + 24, top); x.fill(); } else { x.fillStyle = '#5e3640'; x.fillRect(cx - 34, top - 16, 68, 16); x.fillStyle = lit; x.fillRect(cx - 34, top - 16, 68, 2); } };
        columna(330, 176, false); columna(980, 290, true); columna(1760, 230, true);
        for (const [cx, w, h] of [[1300, 120, 40], [1360, 60, 26], [420, 70, 34], [1900, 90, 30]]) { x.fillStyle = '#52303a'; x.fillRect(cx, 404 - h, w, h); x.fillStyle = lit; x.fillRect(cx, 404 - h, w, 2); x.fillRect(cx + w - 3, 404 - h, 3, h); }
        for (const bx of [520, 1700]) { x.strokeStyle = '#24120e'; x.lineWidth = 4; x.beginPath(); x.moveTo(bx - 22, 404); x.lineTo(bx, 336); x.lineTo(bx + 22, 404); x.moveTo(bx, 404); x.lineTo(bx, 336); x.stroke(); x.fillStyle = '#3a2018'; x.beginPath(); x.moveTo(bx - 30, 330); x.lineTo(bx + 30, 330); x.lineTo(bx + 20, 346); x.lineTo(bx - 20, 346); x.fill(); x.fillStyle = lit; x.fillRect(bx - 30, 330, 60, 2); }
        x.fillStyle = '#3e2228'; x.fillRect(0, 396, W, Y_FONDO + 10 - 396);
      });
      return { cielo, capas: [lejos, medio, cerca], rayos };
    },
    vivo(k, P) {
      const hF = k.halo('#ff9a3c'), hB = k.halo('#ffe0a0'), brasas = Array.from({ length: 30 }, () => [k.r(), k.r(), k.r()]), polvo = Array.from({ length: 34 }, () => [k.r(), k.r(), k.r()]);
      const fuego = (ctx, E, t, espejo) => E.enPlano(ctx, PAR_CERCA, () => {
        if (espejo) { ctx.translate(0, Y_FONDO * 2); ctx.scale(1, -1); }
        ctx.globalCompositeOperation = 'lighter';
        for (const bx0 of [520, 1700]) {
          const bx = E.copia(bx0, PAR_CERCA), f = 0.85 + 0.15 * Math.sin(t * 11 + bx0);
          ctx.globalAlpha = 0.7 * f * (espejo ? 0.5 : 1); ctx.drawImage(hF, bx - 90, 240, 180, 180);
          if (!espejo) for (let q = 0; q < 3; q++) { const h = (34 + q * 8) * (0.8 + 0.25 * Math.sin(t * (9 + q * 3) + q)), w = 14 - q * 3, sw = Math.sin(t * 6 + q * 2) * 5; ctx.globalAlpha = 0.55; ctx.fillStyle = q === 2 ? '#fff0b0' : q === 1 ? '#ffb040' : '#ff6a20'; ctx.beginPath(); ctx.moveTo(bx - w, 332); ctx.quadraticCurveTo(bx - w * 0.6, 332 - h * 0.6, bx + sw, 332 - h); ctx.quadraticCurveTo(bx + w * 0.6, 332 - h * 0.6, bx + w, 332); ctx.closePath(); ctx.fill(); }
          if (!espejo) for (const [u, v, s] of brasas) { if ((u > 0.5) !== (bx0 > 1000)) continue; const ph = (t * (0.3 + s * 0.4) + v) % 1, ex = bx + Math.sin(t * 2 + u * 30) * 18 * ph + (u - 0.75) * 30, ey = 330 - ph * 180; ctx.globalAlpha = (1 - ph) * 0.9; ctx.drawImage(hB, ex - 3, ey - 3, 6, 6); }
        }
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      });
      return {
        cielo(ctx, E, t) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = (0.5 + 0.2 * Math.sin(t * 0.6)) * E.calidadRayos; ctx.drawImage(P.rayos, -E.cam.x * 0.02, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; },
        cerca(ctx, E, t) { fuego(ctx, E, t, false); },
        reflejos(ctx, E, t) { fuego(ctx, E, t, true); },
        delante(ctx, E, t) {
          ctx.globalCompositeOperation = 'lighter';
          for (const [u, v, f] of polvo) { const x0 = ((u * ANCHO + t * 14 * (0.4 + f) - E.cam.x * 0.8) % ANCHO + ANCHO) % ANCHO, y = 80 + v * 380 + Math.sin(t * 0.8 + f * 20) * 12; ctx.globalAlpha = 0.18 + 0.15 * Math.sin(t + f * 9); ctx.drawImage(hB, x0 - 2.5, y - 2.5, 5, 5); }
          ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        },
      };
    },
  },

  // ------------------------------------------------ Bosque de bambú
  bosque: {
    nombre: 'Bosque de bambú', hora: 'amanecer', prop: 'farolPiedra', caja: 'madera',
    luz: { dx: -0.6, dy: -0.8, rim: '#f2ffc4', sombra: '#1f3c2c', amb: '#8ac08a', ambK: 0.12, contorno: '#0f180e' },
    grado: { arriba: '#fff2b0', abajo: '#2a5a3a', fuerza: 0.3, vineta: 0.45, tinta: '#060c04' },
    suelo: { tipo: 'musgo', lejos: '#4a5838', cerca: '#5c6a42', junta: '#2a3020', tam: 150, brillo: 0 },
    pintar(k) {
      const [cielo, x] = k.lienzo(ANCHO, ALTO);
      k.vert(x, 0, ALTO, [[0, '#9cc6a8'], [0.5, '#d8ecc8'], [0.75, '#f4f0d0'], [1, '#e4e0c0']], 0, ANCHO);
      k.disco(x, 170, 40, 30, '#fffff0', '#fff6c8', '#fff2b0', 340, 0.6);
      const rayos = k.rayos(170, 40, '#fff6c8', 14, 820, 0.04, 0.26, 0.15, 1.35);
      const niebla = '#e8f0d4';
      const capas = [[0.04, -180, 0.78, 22, [6, 10]], [0.14, -180, 0.58, 26, [8, 13]], [0.32, -180, 0.34, 22, [10, 16]]].map(([par, y0, kN, n, anc], i) => k.capa('b' + i, y0, Y_FONDO + 12 - y0, par, (x) => {
        bambu(x, k, { n, base: Y_FONDO + 12, color: mezclar('#3c6a34', niebla, kN), luz: mezclar('#8ac070', niebla, kN), hojas: mezclar('#3f7a3a', niebla, kN), ancho: anc, alto: y0 });
        k.atmos(x, 200, Y_FONDO + 12, niebla, 0.05, 0.6);
      }));
      const cerca = k.capa('cerca', -220, Y_FONDO + 232, PAR_CERCA, (x) => {
        bambu(x, k, { n: 14, base: Y_FONDO + 12, color: '#2f5a2a', luz: '#7aa860', hojas: '#2c5a26', ancho: [14, 22], alto: -220, nudo: 70 });
        for (const cx of [400, 1400]) { const c = '#6a6a5a'; x.fillStyle = c; x.fillRect(cx - 26, 394, 52, 10); x.fillRect(cx - 9, 350, 18, 44); x.fillRect(cx - 22, 322, 44, 28); x.fillStyle = '#ffe2a0'; x.fillRect(cx - 9, 330, 18, 14); x.fillStyle = c; x.beginPath(); x.moveTo(cx - 38, 324); x.quadraticCurveTo(cx, 298, cx + 38, 324); x.fill(); x.fillRect(cx - 4, 292, 8, 10); x.fillStyle = 'rgba(255,255,220,.35)'; x.fillRect(cx - 22, 322, 3, 28); }
        for (let i = 0; i < 18; i++) { const cx = k.r() * W, w = 30 + k.r() * 60, h = 10 + k.r() * 20; k.rep(cx, w, (xx) => { x.fillStyle = '#4a5a3a'; x.beginPath(); x.ellipse(xx + w / 2, 404, w / 2, h, 0, Math.PI, TAU); x.fill(); x.fillStyle = '#5f8a3a'; x.beginPath(); x.ellipse(xx + w / 2, 404 - h * 0.6, w * 0.4, h * 0.45, 0, Math.PI, TAU); x.fill(); }); }
        for (let i = 0; i < 40; i++) { const cx = k.r() * W; k.rep(cx, 30, (xx) => { x.strokeStyle = '#3f6a2a'; x.lineWidth = 2; for (let q = 0; q < 5; q++) { x.beginPath(); x.moveTo(xx + 15, 404); x.quadraticCurveTo(xx + 15 + (q - 2) * 6, 390, xx + 15 + (q - 2) * 12, 384 + Math.abs(q - 2) * 4); x.stroke(); } }); }
      });
      return { cielo, capas: [...capas, cerca], rayos };
    },
    vivo(k, P) {
      const hojas = Array.from({ length: 18 }, () => [k.r(), k.r(), 0.6 + k.r() * 0.7, k.r() * 6]), hM = k.halo('#fffbe0'), motas = Array.from({ length: 30 }, () => [k.r(), k.r(), k.r()]);
      return {
        b1(ctx, E, t) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = (0.55 + 0.2 * Math.sin(t * 0.5)) * E.calidadRayos; ctx.drawImage(P.rayos, -E.cam.x * 0.05, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; },
        delante(ctx, E, t) {
          ctx.fillStyle = '#5a8a3a';
          for (const [u, v, s, f] of hojas) { const y = ((v * ALTO + t * 30 * s) % (ALTO + 40)) - 20, x0 = ((u * ANCHO + Math.sin(t * 1.1 * s + f) * 50 + t * 12 - E.cam.x * 0.95) % (ANCHO + 40) + ANCHO + 40) % (ANCHO + 40) - 20; ctx.save(); ctx.translate(x0, y); ctx.rotate(Math.sin(t * 2 * s + f) * 1.2 + f); ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.ellipse(0, 0, 7 * s, 1.7 * s, 0, 0, TAU); ctx.fill(); ctx.restore(); }
          ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'lighter';
          for (const [u, v, f] of motas) { const x0 = ((u * ANCHO + Math.sin(t * 0.4 + f * 9) * 40 - E.cam.x * 0.6) % ANCHO + ANCHO) % ANCHO, y = 100 + v * 330 + Math.sin(t * 0.6 + f * 7) * 14; ctx.globalAlpha = Math.max(0, 0.2 + 0.25 * Math.sin(t * 1.2 + f * 30)); ctx.drawImage(hM, x0 - 3, y - 3, 6, 6); }
          ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        },
      };
    },
  },

  // ------------------------------------------------ Ruinas del desierto
  desierto: {
    nombre: 'Ruinas del desierto', hora: 'dia', prop: 'obelisco', caja: 'vasija',
    luz: { dx: -0.7, dy: -0.7, rim: '#fff2d0', sombra: '#8a4a3a', amb: '#ffcf8a', ambK: 0.1, contorno: '#2a160c' },
    grado: { arriba: '#ffe0a0', abajo: '#c06030', fuerza: 0.26, vineta: 0.36, tinta: '#1a0a02' },
    suelo: { tipo: 'arena', lejos: '#d0a070', cerca: '#e8bc82', junta: '#8a5a3a', tam: 160, brillo: 0 },
    pintar(k) {
      const [cielo, x] = k.lienzo(ANCHO, ALTO);
      k.vert(x, 0, ALTO, [[0, '#3a84c6'], [0.42, '#86bfe0'], [0.68, '#e8dcc0'], [1, '#f6dcb0']], 0, ANCHO);
      k.disco(x, 190, 88, 30, '#ffffff', '#fff6d8', '#fff8e0', 300, 0.75);
      for (let i = 0; i < 5; i++) { x.fillStyle = 'rgba(255,255,255,.18)'; x.beginPath(); x.ellipse(k.r() * ANCHO, 60 + k.r() * 120, 120 + k.r() * 140, 6, 0, 0, TAU); x.fill(); }
      const lejos = k.capa('lejos', 260, 170, 0.04, (x) => { k.cresta(x, { base: 340, amp: 60, frec: 0.003, color: '#e0b88a', s: 11, oct: 2 }); k.cresta(x, { base: 372, amp: 44, frec: 0.005, color: '#d2a272', s: 12, oct: 2 }); k.atmos(x, 280, 420, '#f4e0c0', 0.3, 0.7); });
      const medio = k.capa('medio', 130, 300, 0.2, (x) => {
        const lit = '#e0aa72', som = '#a86e48';
        const bloque = (x0, y0, w, h) => { x.fillStyle = som; x.fillRect(x0, y0, w, h); x.fillStyle = lit; x.fillRect(x0, y0, w * 0.55, h); x.fillStyle = 'rgba(90,50,30,.25)'; for (let y = y0 + 16; y < y0 + h; y += 18) x.fillRect(x0, y, w, 1.5); };
        for (const ax of [300, 1300]) { for (let a = 0; a < 3; a++) { const px = ax + a * 130; bloque(px, 250, 34, 150); if (!(ax === 1300 && a === 2)) { x.fillStyle = lit; x.beginPath(); x.arc(px + 82, 252, 64, Math.PI, TAU); x.arc(px + 82, 252, 44, TAU, Math.PI, true); x.fill(); x.fillStyle = som; x.beginPath(); x.arc(px + 82, 252, 64, -0.6, 0); x.arc(px + 82, 252, 44, 0, -0.6, true); x.fill(); } } bloque(ax + 390, 250, 34, 150); }
        for (const ox of [900, 1850]) { x.fillStyle = lit; x.beginPath(); x.moveTo(ox - 22, 400); x.lineTo(ox - 15, 170); x.lineTo(ox, 145); x.lineTo(ox, 400); x.fill(); x.fillStyle = som; x.beginPath(); x.moveTo(ox, 145); x.lineTo(ox + 15, 170); x.lineTo(ox + 22, 400); x.lineTo(ox, 400); x.fill(); x.fillStyle = 'rgba(90,50,30,.35)'; for (let s = 200; s < 390; s += 40) x.fillRect(ox - 10, s, 20, 3); }
        k.atmos(x, 140, 420, '#f6dcb0', 0.25, 0.5);
      });
      const cerca = k.capa('cerca', 200, Y_FONDO + 10 - 200, PAR_CERCA, (x) => {
        for (const px of [420, 1460]) { x.fillStyle = '#3a2416'; x.fillRect(px - 3, 220, 6, 184); x.beginPath(); x.arc(px, 218, 6, 0, TAU); x.fill(); }
        for (const cx of [900, 1800]) { x.strokeStyle = '#5a3a1c'; x.lineWidth = 9; x.beginPath(); x.moveTo(cx, 404); x.quadraticCurveTo(cx + 10, 320, cx - 6, 250); x.stroke(); x.strokeStyle = '#4a6a2a'; x.lineWidth = 5; for (let f = 0; f < 7; f++) { const a = -Math.PI / 2 + (f - 3) * 0.48; x.beginPath(); x.moveTo(cx - 6, 250); x.quadraticCurveTo(cx - 6 + Math.cos(a) * 40, 250 + Math.sin(a) * 30 - 10, cx - 6 + Math.cos(a) * 70, 250 + Math.sin(a) * 26 + 26); x.stroke(); } }
        for (let i = 0; i < W; i += 380) { const w = 120 + k.r() * 90, h = 26 + k.r() * 26; x.fillStyle = '#b8784a'; x.fillRect(i, 404 - h, w, h); x.fillStyle = '#d8a06a'; x.fillRect(i, 404 - h, w * 0.6, h); x.fillStyle = '#c88a5a'; x.beginPath(); x.moveTo(i + w, 404 - h); x.lineTo(i + w + 14, 404 - h + 10); x.lineTo(i + w + 6, 404); x.lineTo(i + w, 404); x.fill(); x.fillStyle = 'rgba(255,240,210,.5)'; x.fillRect(i, 404 - h, w, 1.5); }
        for (const jx of [640, 1180, 1990]) { x.fillStyle = '#a85a32'; x.beginPath(); x.ellipse(jx, 388, 14, 16, 0, 0, TAU); x.fill(); x.fillRect(jx - 6, 368, 12, 8); x.fillStyle = 'rgba(255,220,170,.5)'; x.beginPath(); x.ellipse(jx - 5, 384, 4, 9, 0, 0, TAU); x.fill(); }
      });
      return { cielo, capas: [lejos, medio, cerca] };
    },
    vivo(k) {
      const granos = Array.from({ length: 40 }, () => [k.r(), k.r(), 0.6 + k.r()]);
      const bandera = (ctx, lx, t, col, col2) => { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(lx + 3, 226); for (let i = 0; i <= 6; i++) { const u = i / 6; ctx.lineTo(lx + 3 + u * 64, 226 + Math.sin(t * 4 - u * 5) * 6 * u); } for (let i = 6; i >= 0; i--) { const u = i / 6; ctx.lineTo(lx + 3 + u * 58, 268 + Math.sin(t * 4 - u * 5 + 0.4) * 7 * u + u * 6); } ctx.closePath(); ctx.fill(); ctx.fillStyle = col2; ctx.fillRect(lx + 12, 238 + Math.sin(t * 4 - 0.7) * 1.2, 16, 16); };
      return {
        cerca(ctx, E, t) { E.enPlano(ctx, PAR_CERCA, () => { bandera(ctx, E.copia(420, PAR_CERCA), t, '#9a2a2a', '#f0c060'); bandera(ctx, E.copia(1460, PAR_CERCA), t + 1.3, '#2a3a8a', '#f0c060'); }); },
        delante(ctx, E, t) { ctx.strokeStyle = 'rgba(255,236,200,.35)'; ctx.lineWidth = 1; ctx.beginPath(); for (const [u, v, s] of granos) { const x0 = ((u * ANCHO + t * 260 * s - E.cam.x) % ANCHO + ANCHO) % ANCHO, y = 330 + v * 200; ctx.moveTo(x0, y); ctx.lineTo(x0 - 18 * s, y + 1); } ctx.stroke(); },
      };
    },
  },

  // ------------------------------------------------ Templo del cielo
  cielo: {
    nombre: 'Templo del cielo', hora: 'dia', prop: 'cristal', caja: 'marmol',
    luz: { dx: 0.6, dy: -0.8, rim: '#fffbe8', sombra: '#5868a8', amb: '#a8c8ff', ambK: 0.12, contorno: '#1a1e34' },
    grado: { arriba: '#ffffff', abajo: '#6a90ff', fuerza: 0.22, vineta: 0.3, tinta: '#0a1030' },
    suelo: { tipo: 'marmol', lejos: '#c8cede', cerca: '#eceff6', junta: '#9aa2b8', bisel: '#ffffff', tam: 150, brillo: 0.5 },
    pintar(k) {
      const [cielo, x] = k.lienzo(ANCHO, ALTO);
      k.vert(x, 0, ALTO, [[0, '#2864cc'], [0.4, '#5a9ae8'], [0.72, '#bfe0ff'], [1, '#eef6ff']], 0, ANCHO);
      k.disco(x, 760, 86, 32, '#ffffff', '#fffbe8', '#fff6d8', 330, 0.7);
      const nubesG = [0, 1, 2].map((i) => k.nube(340, 90, '#ffffff', '#9ab4e0', 18, 10 + i));
      const lejos = k.capa('lejos', 230, 210, 0.03, (x) => {
        for (const [ix, iy, w] of [[200, 280, 80], [900, 260, 60], [1600, 290, 100]]) { x.fillStyle = '#9ab2dc'; x.beginPath(); x.moveTo(ix - w, iy); x.lineTo(ix + w, iy); x.lineTo(ix + w * 0.3, iy + w * 0.6); x.lineTo(ix, iy + w * 0.9); x.lineTo(ix - w * 0.4, iy + w * 0.5); x.fill(); x.fillStyle = '#b8d0f0'; x.fillRect(ix - w, iy - 6, w * 2, 6); x.fillStyle = 'rgba(255,255,255,.5)'; x.fillRect(ix + w * 0.5, iy, 3, 80); }
        for (let i = 0; i < 26; i++) { const cx = (i / 26) * W, nb = nubesG[i % 3]; k.rep(cx - 170, 340, (xx) => x.drawImage(nb, xx, 318 + (i % 3) * 16 - 30, 340 * (1 + (i % 2) * 0.3), 90)); }
        k.atmos(x, 240, 440, '#eef6ff', 0.2, 0.5);
      });
      const medio = k.capa('medio', 40, 380, 0.18, (x) => {
        for (const [ix, iy, w, templo] of [[300, 250, 230, true], [1760, 210, 140, false]]) {
          x.fillStyle = '#6e7fa8'; x.beginPath(); x.moveTo(ix - w, iy); x.lineTo(ix + w, iy); x.lineTo(ix + w * 0.55, iy + w * 0.35); x.lineTo(ix + w * 0.2, iy + w * 0.8); x.lineTo(ix - w * 0.1, iy + w * 0.62); x.lineTo(ix - w * 0.5, iy + w * 0.4); x.closePath(); x.fill();
          x.strokeStyle = 'rgba(40,50,90,.35)'; x.lineWidth = 2; for (let l = 0; l < 6; l++) { x.beginPath(); x.moveTo(ix - w * 0.7 + l * w * 0.28, iy + 4); x.lineTo(ix - w * 0.5 + l * w * 0.2, iy + w * 0.5); x.stroke(); }
          x.fillStyle = '#5a9a5a'; x.fillRect(ix - w, iy - 8, w * 2, 10); x.fillStyle = '#7ac06a'; x.fillRect(ix - w, iy - 8, w * 2, 3);
          for (let tr = 0; tr < 6; tr++) { const tx = ix - w * 0.9 + tr * w * 0.36; x.fillStyle = '#3f7a4a'; x.beginPath(); x.arc(tx, iy - 20, 14 + (tr % 2) * 6, 0, TAU); x.fill(); }
          if (templo) { let y = iy - 8, tw = 180; for (let t = 0; t < 3; t++) { x.fillStyle = '#f4f2ec'; x.fillRect(ix - tw / 2 + 12, y - 40, tw - 24, 40); x.fillStyle = '#c83a3a'; for (let c = 0; c < 5; c++) x.fillRect(ix - tw / 2 + 16 + c * (tw - 36) / 4, y - 40, 5, 40); techo(x, ix, y - 36, tw, 22, '#2a6a8a'); x.fillStyle = '#e0b84a'; x.fillRect(ix - tw / 2 - 10, y - 40, tw + 20, 2); y -= 58; tw *= 0.78; } x.fillStyle = '#e0b84a'; x.fillRect(ix - 2, y - 30, 4, 30); }
          x.fillStyle = 'rgba(235,245,255,.75)'; x.fillRect(ix + w * 0.6, iy, 10, 420 - iy);
        }
        k.atmos(x, 40, 420, '#cfe4ff', 0.18, 0.45);
      });
      const cerca = k.capa('cerca', 230, Y_FONDO + 10 - 230, PAR_CERCA, (x) => {
        for (let i = 0; i < W; i += 20) { x.fillStyle = '#e2e6f0'; x.fillRect(i + 4, 366, 10, 30); x.fillStyle = '#b8c0d6'; x.fillRect(i + 11, 366, 3, 30); }
        x.fillStyle = '#f2f4fa'; x.fillRect(0, 356, W, 12); x.fillStyle = '#e0b84a'; x.fillRect(0, 356, W, 2.5); x.fillStyle = '#d8dce8'; x.fillRect(0, 394, W, Y_FONDO + 10 - 394);
        for (let i = 0; i < W; i += 256) { x.fillStyle = '#f2f4fa'; x.fillRect(i - 14, 330, 28, 74); x.fillStyle = '#bcc4da'; x.fillRect(i + 6, 330, 8, 74); x.fillStyle = '#e0b84a'; x.beginPath(); x.arc(i, 324, 10, 0, TAU); x.fill(); x.fillStyle = '#fff6c8'; x.beginPath(); x.arc(i - 3, 321, 3, 0, TAU); x.fill(); }
        for (const px of [300, 1780]) { x.fillStyle = '#c8a040'; x.fillRect(px - 3, 236, 6, 160); x.beginPath(); x.arc(px, 233, 7, 0, TAU); x.fill(); }
      });
      return { cielo, capas: [lejos, medio, cerca], nubes: nubesG };
    },
    vivo(k, P) {
      const pajaros = Array.from({ length: 6 }, () => [k.r(), k.r(), 0.5 + k.r() * 0.5]);
      const bandera = (ctx, lx, t) => { ctx.fillStyle = '#fbfaf4'; ctx.beginPath(); ctx.moveTo(lx + 3, 240); for (let i = 0; i <= 6; i++) { const u = i / 6; ctx.lineTo(lx + 3 + Math.sin(t * 2.6 - u * 4) * 8 * u + u * 8, 240 + u * 120); } for (let i = 6; i >= 0; i--) { const u = i / 6; ctx.lineTo(lx + 34 + Math.sin(t * 2.6 - u * 4 + 0.5) * 10 * u + u * 10, 240 + u * 116); } ctx.closePath(); ctx.fill(); ctx.fillStyle = '#e0b84a'; ctx.fillRect(lx + 3, 240, 31, 4); };
      return {
        cielo(ctx, E, t) {
          ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
          for (const [u, v, s] of pajaros) { const x0 = ((u * 1200 + t * 24 * s - E.cam.x * 0.1) % 1200 + 1200) % 1200 - 120, y = 60 + v * 140, a = Math.sin(t * 5 + u * 20) * 3 * s, w = 6 * s; ctx.beginPath(); ctx.moveTo(x0 - w, y - a); ctx.quadraticCurveTo(x0 - w * 0.4, y - 1, x0, y); ctx.quadraticCurveTo(x0 + w * 0.4, y - 1, x0 + w, y - a); ctx.stroke(); }
        },
        lejos(ctx, E, t) { ctx.globalAlpha = 0.8; for (const [i, nb] of P.nubes.entries()) ctx.drawImage(nb, ((i * 470 + t * (6 + i * 3) - E.cam.x * 0.06) % 1500 + 1500) % 1500 - 380, 340 + i * 18, 380, 100); ctx.globalAlpha = 1; },
        medio(ctx, E, t) { E.enPlano(ctx, 0.18, () => { for (const [ix, iy, w] of [[300, 250, 230], [1760, 210, 140]]) { const lx = E.copia(ix + w * 0.6, 0.18); ctx.fillStyle = 'rgba(255,255,255,.6)'; for (let s = 0; s < 6; s++) { const y = iy + ((t * 120 + s * 37) % (420 - iy)); ctx.fillRect(lx + 1 + (s % 3) * 3, y, 2, 16); } } }); },
        cerca(ctx, E, t) { E.enPlano(ctx, PAR_CERCA, () => { bandera(ctx, E.copia(300, PAR_CERCA), t); bandera(ctx, E.copia(1780, PAR_CERCA), t + 2); }); },
      };
    },
  },

  // ------------------------------------------------ Mercado de neón
  mercado: {
    nombre: 'Mercado de neón', hora: 'noche', prop: 'maquina', caja: 'fruta',
    luz: { dx: 0.55, dy: -0.75, rim: '#ff7ad8', sombra: '#1a1040', amb: '#6a3aa8', ambK: 0.14, contorno: '#0c0614' },
    grado: { arriba: '#3a1a9a', abajo: '#ff3a8a', fuerza: 0.3, vineta: 0.56, tinta: '#05020c' },
    suelo: { tipo: 'asfalto', lejos: '#17121f', cerca: '#251c30', junta: '#0a070e', tam: 160, brillo: 0.72 },
    pintar(k) {
      const [cielo, x] = k.lienzo(ANCHO, ALTO);
      k.vert(x, 0, ALTO, [[0, '#05040f'], [0.42, '#100c26'], [0.7, '#2a1038'], [1, '#5a1a4a']], 0, ANCHO);
      k.estrellas(x, 60, 160);
      const lejos = k.capa('lejos', 110, 320, 0.08, (x) => { let bx = 0; while (bx < W) { const w = 40 + k.r() * 80, h = 120 + k.r() * 200, col = '#1a1230'; k.rep(bx, w, (xx) => { x.fillStyle = col; x.fillRect(xx, 420 - h, w, h); ventanas(x, k, xx, 420 - h, w, h, { col: ['#ff6ad0', '#6ae0ff', '#ffd27a'], prob: 0.12, cw: 2, ch: 2, px: 7, py: 7, alfa: 0.7 }); }); bx += w + 4; } k.atmos(x, 200, 430, '#5a1a5a', 0.1, 0.85); });
      const neones = [];
      const medio = k.capa('medio', 150, 280, 0.25, (x) => {
        let bx = 0; const iconos = ['cuenco', 'pez', 'farol', 'glifo', 'circulo'];
        while (bx < W) {
          const w = 150 + k.r() * 120, h = 150 + k.r() * 90, col = mezclar('#1a1228', '#24183a', k.r());
          k.rep(bx, w, (xx) => { x.fillStyle = col; x.fillRect(xx, 418 - h, w, h); for (let p = 418 - h + 40; p < 400; p += 50) { x.fillStyle = '#120c1e'; x.fillRect(xx - 4, p, w + 8, 6); } ventanas(x, k, xx, 418 - h, w, h - 60, { col: ['#ffcf7a', '#ff9ad8'], prob: 0.25, cw: 14, ch: 16, px: 28, py: 50, alfa: 0.55 }); });
          const ic = iconos[Math.floor(k.r() * iconos.length)], nc = ['#ff4fa8', '#4ff0ff', '#ffe04a', '#9a7aff'][Math.floor(k.r() * 4)], cx = bx + w / 2 + (k.r() - 0.5) * 40, cy = 418 - h + 60 + k.r() * 30; neones.push([cx, cy, nc]);
          k.rep(cx - 40, 80, (xx) => {
            const c0 = xx + 40; x.save(); x.strokeStyle = nc; x.lineWidth = 3.2; x.lineCap = 'round'; x.shadowColor = nc; x.shadowBlur = 16; x.beginPath();
            if (ic === 'cuenco') { x.arc(c0, cy, 20, 0, Math.PI); x.closePath(); x.moveTo(c0 - 6, cy - 8); x.quadraticCurveTo(c0 - 12, cy - 18, c0 - 6, cy - 28); x.moveTo(c0 + 6, cy - 8); x.quadraticCurveTo(c0, cy - 18, c0 + 6, cy - 28); }
            else if (ic === 'pez') { x.ellipse(c0, cy, 22, 11, 0, 0, TAU); x.moveTo(c0 + 22, cy); x.lineTo(c0 + 34, cy - 10); x.lineTo(c0 + 34, cy + 10); x.closePath(); }
            else if (ic === 'farol') { x.ellipse(c0, cy, 14, 20, 0, 0, TAU); x.moveTo(c0 - 6, cy - 24); x.lineTo(c0 + 6, cy - 24); x.moveTo(c0 - 6, cy + 24); x.lineTo(c0 + 6, cy + 24); }
            else if (ic === 'glifo') { x.rect(c0 - 22, cy - 18, 44, 36); x.moveTo(c0 - 12, cy - 8); x.lineTo(c0 + 12, cy - 8); x.moveTo(c0, cy - 8); x.lineTo(c0, cy + 10); x.moveTo(c0 - 12, cy + 10); x.lineTo(c0 + 12, cy + 10); }
            else { x.arc(c0, cy, 20, 0, TAU); x.moveTo(c0 + 10, cy); x.arc(c0, cy, 10, 0, TAU); }
            x.stroke(); x.restore();
          });
          bx += w + 10 + k.r() * 20;
        }
        x.strokeStyle = '#0a0612'; x.lineWidth = 1.5; for (let c = 0; c < 6; c++) { const y = 200 + k.r() * 60; x.beginPath(); x.moveTo(0, y); for (let i = 0; i <= W; i += 128) x.quadraticCurveTo(i + 64, y + 26, i + 128, y); x.stroke(); }
        k.atmos(x, 260, 420, '#3a1640', 0, 0.55);
      });
      const cerca = k.capa('cerca', 240, Y_FONDO + 10 - 240, PAR_CERCA, (x) => {
        for (let i = 0; i < W; i += 256) {
          const x0 = i + 20, w = 216, [ca, cb] = [['#c83a4a', '#f2e6dc'], ['#2a6ac8', '#f2e6dc'], ['#e0a030', '#3a1a10']][(i / 256) % 3];
          x.fillStyle = '#20141c'; x.fillRect(x0 + 4, 300, 5, 104); x.fillRect(x0 + w - 9, 300, 5, 104);
          for (let s = 0; s < 8; s++) { x.fillStyle = s % 2 ? ca : cb; x.beginPath(); x.moveTo(x0 + s * w / 8, 292); x.lineTo(x0 + (s + 1) * w / 8, 292); x.lineTo(x0 + (s + 1) * w / 8 + 4, 318); x.lineTo(x0 + s * w / 8 + 4, 318); x.fill(); }
          x.fillStyle = 'rgba(0,0,0,.35)'; for (let s = 0; s < 8; s++) { x.beginPath(); x.arc(x0 + s * w / 8 + w / 16 + 4, 318, w / 16, 0, Math.PI); x.fill(); }
          x.fillStyle = '#3a2420'; x.fillRect(x0, 362, w, 42); x.fillStyle = '#4a3028'; x.fillRect(x0 - 4, 356, w + 8, 8); x.fillStyle = 'rgba(255,140,200,.4)'; x.fillRect(x0 - 4, 356, w + 8, 1.5);
          for (let g = 0; g < 9; g++) { x.fillStyle = ['#ff8a3a', '#ffd24a', '#6ac84a', '#e83a4a'][Math.floor(k.r() * 4)]; x.beginPath(); x.arc(x0 + 16 + g * 22, 350, 7, 0, TAU); x.fill(); x.fillStyle = 'rgba(255,255,255,.35)'; x.beginPath(); x.arc(x0 + 14 + g * 22, 347, 2, 0, TAU); x.fill(); }
        }
      });
      return { cielo, capas: [lejos, medio, cerca], neones };
    },
    vivo(k, P) {
      const farol = farolSprite('#ff3a3a', k.cpu), hF = k.halo('#ff7a5a'), vapor = k.halo('#e8d8f0'), humos = Array.from({ length: 16 }, () => [k.r(), k.r(), k.r()]);
      const luces = (ctx, E, t, espejo) => {
        E.enPlano(ctx, 0.25, () => { if (espejo) { ctx.translate(0, Y_FONDO * 2); ctx.scale(1, -1); } ctx.globalCompositeOperation = 'lighter'; for (const [i, [nx, ny, nc]] of P.neones.entries()) { const lx = E.copia(nx, 0.25), on = (Math.sin(t * 17 + i * 3) > -0.95) || i % 2; ctx.globalAlpha = (on ? 0.55 : 0.1) * (espejo ? 0.7 : 1); ctx.drawImage(k.halo(nc), lx - 60, ny - 50, 120, 100); } ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; });
        E.enPlano(ctx, PAR_CERCA, () => { if (espejo) { ctx.translate(0, Y_FONDO * 2); ctx.scale(1, -1); } const c = E.centro(PAR_CERCA); for (let i = Math.floor((c - 1000) / 256); i <= Math.ceil((c + 1000) / 256); i++) { const a = i * 256 + 20, ya = 264; if (!espejo) { ctx.strokeStyle = '#140a14'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(a, ya); ctx.quadraticCurveTo(a + 128, ya + 24, a + 256, ya); ctx.stroke(); } for (let q = 1; q < 4; q++) { const px = a + q * 64, py = ya + 2 * (q / 4) * (1 - q / 4) * 24 + 2, sw = Math.sin(t * 1.4 + q + i) * 0.1; if (!espejo) { ctx.save(); ctx.translate(px, py); ctx.rotate(sw); ctx.drawImage(farol, -8, 0, 16, 22); ctx.restore(); } ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = espejo ? 0.3 : 0.5; ctx.drawImage(hF, px - 30, py - 18, 60, 60); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; } } });
      };
      return {
        medio(ctx, E, t) { luces(ctx, E, t, false); },
        reflejos(ctx, E, t) { luces(ctx, E, t, true); },
        cerca(ctx, E, t) { E.enPlano(ctx, PAR_CERCA, () => { const c = E.centro(PAR_CERCA); for (let i = Math.floor((c - 1000) / 512); i <= Math.ceil((c + 1000) / 512); i++) { const sx = i * 512 + 120; for (const [u, v, f] of humos) { const ph = (t * (0.15 + f * 0.1) + v) % 1, hx = sx + (u - 0.5) * 60 + Math.sin(t + f * 9) * 10 * ph, hy = 350 - ph * 120, r = 10 + ph * 30; ctx.globalAlpha = (1 - ph) * 0.22; ctx.drawImage(vapor, hx - r, hy - r, r * 2, r * 2); } } ctx.globalAlpha = 1; }); },
      };
    },
  },
};
export const TEMAS = ESCENARIOS;   // compatibilidad: config.js arma el enum con estas claves
export const IDS = Object.keys(ESCENARIOS);
const POR_HORA = { amanecer: ['dojo', 'bosque'], dia: ['cielo', 'desierto', 'bosque'], tarde: ['puerto', 'templo', 'desierto'], noche: ['noche', 'mercado', 'azotea'] };
const POR_ELEMENTO = { electrico: 'azotea', fuego: 'templo', hielo: 'cielo', viento: 'bosque', luz: 'cielo', tierra: 'desierto', sombra: 'mercado', agua: 'puerto' };
export const ELECCIONES = ['hora', 'rotar', 'elemento'];
// Resuelve qué escenario se pinta. pedido: un id de ESCENARIOS o una elección:
//   'hora'     → los de la hora de tu escenario en Forja (DATOS.hora), o la del reloj si no hay; cambia en cada pelea
//   'rotar'    → uno distinto en cada pelea (supervivencia, torneo…), en orden
//   'elemento' → el que va con el elemento de tu luchador (trueno → tormenta, fuego → cantera…)
export function elegirEscenario(pedido, { hora = null, indice = 0, elemento = null, reloj = null } = {}) {
  if (ESCENARIOS[pedido]) return pedido;
  if (pedido === 'elemento') return POR_ELEMENTO[elemento] || 'noche';
  if (pedido === 'rotar') return IDS[((indice % IDS.length) + IDS.length) % IDS.length];
  let h = hora;
  if (!POR_HORA[h]) { const H = (reloj ?? new Date()).getHours(); h = H >= 5 && H < 9 ? 'amanecer' : H < 16 ? 'dia' : H < 19 ? 'tarde' : 'noche'; }
  const lista = POR_HORA[h]; return lista[((indice % lista.length) + lista.length) % lista.length];
}

// ---------------------------------------------------------------- el escenario vivo
// opciones: semilla, cpu (lienzos en memoria), calidad ('bajo'|'medio'|'alto'|'ultra'), acc (accesibilidad)
export function crearEscenario(id, { semilla = 9, cpu = false, calidad = 'alto', acc = null } = {}) {
  const def = ESCENARIOS[id] || ESCENARIOS.noche, k = kit((semilla * 7919) ^ id.length * 31, cpu);
  const P = def.pintar(k), tex = pintarSuelo(def.suelo, k), lienzo = k.lienzo, G = def.grado;
  const E = { id, def, luz: def.luz, cam: { x: 0, zoom: 1, y: 0 }, acc, calidad, calidadRayos: 1, cpu };
  const vivo = def.vivo ? def.vivo(k, P, E) : {};
  E.vivo = vivo;
  // Etalonaje HORNEADO: el degradado del escenario se mezcla (soft-light) una sola vez en el cielo, en cada capa y en
  // la textura del suelo. En cada cuadro ya no hay una pasada de pantalla completa (en CPU costaba ~4 ms).
  const graduar = (cv, y0, opaco = false) => {
    const x = cv.getContext('2d'), w = cv.width, h = cv.height; let copia = null;
    if (!opaco) { const [c2, x2] = lienzo(w, h); x2.drawImage(cv, 0, 0); copia = c2; }
    x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'soft-light'; x.globalAlpha = G.fuerza;
    const g = x.createLinearGradient(0, -y0, 0, ALTO - y0); g.addColorStop(0, G.arriba); g.addColorStop(0.5, '#808080'); g.addColorStop(1, G.abajo); x.fillStyle = g; x.fillRect(0, 0, w, h);
    if (copia) { x.globalCompositeOperation = 'destination-in'; x.globalAlpha = 1; x.drawImage(copia, 0, 0); }
    x.restore();
  };
  // cielo con margen (la sacudida no deja bordes) ya escalado: cada cuadro es una copia sin escalar
  const [cielo, xc] = lienzo(ANCHO + MARGEN * 2, ALTO + MARGEN * 2); xc.drawImage(P.cielo, 0, 0, ANCHO + MARGEN * 2, ALTO + MARGEN * 2); graduar(cielo, MARGEN, true);
  for (const cp of P.capas) if (!cp.aditiva) graduar(cp.img, cp.y0);
  { const x = tex.getContext('2d'); x.save(); x.globalCompositeOperation = 'soft-light'; x.globalAlpha = G.fuerza * 0.8; x.fillStyle = G.abajo; x.fillRect(0, 0, tex.width, tex.height); x.restore(); }
  // reflejo del plano del fondo en el suelo pulido: espejado y desvanecido una vez
  const capaCerca = P.capas.find((c) => c.nombre === 'cerca'), brillo = def.suelo.brillo || 0;
  let reflejoCerca = null;
  if (capaCerca && brillo > 0) {
    const hR = 150, [rc, xr] = lienzo(W, hR); xr.save(); xr.translate(0, Y_FONDO - capaCerca.y0); xr.scale(1, -1); xr.drawImage(capaCerca.img, 0, 0); xr.restore();
    xr.globalCompositeOperation = 'destination-in'; const g = xr.createLinearGradient(0, 0, 0, hR); g.addColorStop(0, `rgba(0,0,0,${brillo * 0.55})`); g.addColorStop(0.35, `rgba(0,0,0,${brillo * 0.22})`); g.addColorStop(1, 'rgba(0,0,0,0)'); xr.fillStyle = g; xr.fillRect(0, 0, W, hR);
    reflejoCerca = rc;
  }
  // oclusión donde el suelo toca el fondo y oscurecido hacia el frente: dos franjas (no una capa de pantalla completa)
  const [aoArriba, xa] = lienzo(ANCHO + MARGEN * 2, 26), [aoAbajo, xb] = lienzo(ANCHO + MARGEN * 2, 80);
  { let g = xa.createLinearGradient(0, 0, 0, 26); g.addColorStop(0, conAlfa(G.tinta, 0.55)); g.addColorStop(1, conAlfa(G.tinta, 0)); xa.fillStyle = g; xa.fillRect(0, 0, ANCHO + MARGEN * 2, 26);
    g = xb.createLinearGradient(0, 0, 0, 80); g.addColorStop(0, conAlfa(G.tinta, 0)); g.addColorStop(1, conAlfa(G.tinta, 0.4)); xb.fillStyle = g; xb.fillRect(0, 0, ANCHO + MARGEN * 2, 80); }
  const [vineta, xv] = lienzo(ANCHO, ALTO);
  { const g = xv.createRadialGradient(ANCHO / 2, ALTO * 0.54, ALTO * 0.42, ANCHO / 2, ALTO * 0.54, ANCHO * 0.68); g.addColorStop(0, conAlfa(G.tinta, 0)); g.addColorStop(0.6, conAlfa(G.tinta, G.vineta * 0.45)); g.addColorStop(1, conAlfa(G.tinta, G.vineta)); xv.fillStyle = g; xv.fillRect(0, 0, ANCHO, ALTO); }

  // En CPU, copiar sin escalar y en píxeles enteros es varias veces más rápido que con filtrado: los planos lejanos
  // (paralaje < 0,3) no se escalan con el zoom y las traslaciones se redondean.
  const px = cpu ? Math.round : (v) => v;
  const escDe = (par) => (par < 0.3 ? 1 : 1 + (E.cam.zoom - 1) * Math.min(1, par / PAR_CERCA));
  // dibuja en las coordenadas del plano con paralaje par (x de plano, y de pantalla con zoom 1)
  E.enPlano = (ctx, par, fn) => { const e = escDe(par), c = E.cam; ctx.save(); ctx.translate(px(ANCHO / 2 - c.x * par * e), px(Y_FONDO + c.y * Math.min(1, par / PAR_CERCA))); ctx.scale(e, e); ctx.translate(0, -Y_FONDO); fn(e); ctx.restore(); };
  E.centro = (par) => E.cam.x * par;                                       // x de plano en el centro de la pantalla
  E.copia = (lx, par) => lx + W * Math.round((E.cam.x * par - lx) / W);   // la copia de lx más cercana (capas repetidas)
  const tiras = (ctx, img, par, y) => E.enPlano(ctx, par, (e) => {
    const c = E.cam.x * par, medio = (ANCHO / 2 + MARGEN) / e + 4;
    for (let i = Math.floor((c - medio) / W); i * W < c + medio; i++) { if (e === 1) ctx.drawImage(img, i * W, y); else ctx.drawImage(img, 0, 0, W, img.height, i * W - 0.75, y, W + 1.5, img.height); }
  });
  E.fondo = (ctx, cam, t) => {
    E.cam = cam; E.calidadRayos = E.calidad === 'bajo' ? 0 : 1;
    ctx.drawImage(cielo, -MARGEN, px(-MARGEN + cam.y * 0.1));
    vivo.cielo?.call(vivo, ctx, E, t);
    for (const cp of P.capas) { if (cp.tras) continue; tiras(ctx, cp.img, cp.par, cp.y0); vivo[cp.nombre]?.call(vivo, ctx, E, t); }
  };
  // suelo en perspectiva: franjas de BANDA px, cada una con su escala (z·f) y su origen en x de mundo
  E.suelo = (ctx, cam, t, reflejar) => {
    const z = cam.zoom, oy = cam.y, izq = ANCHO / 2 + MARGEN;
    for (let y = Y_FONDO; y < ALTO + MARGEN; y += BANDA) {
      const y1 = y + BANDA, v0 = filaDe(y), v1 = filaDe(y1), f = ((y + y1) / 2 - Y_HOR) / HC, e = z * f;
      let sx = (((cam.x - izq / e) % TW) + TW) % TW, X = -MARGEN;
      while (X < ANCHO + MARGEN) { const trozo = Math.min(2 * TW - sx, (ANCHO + MARGEN - X) / e + 1); ctx.drawImage(tex, sx, v0, trozo, v1 - v0, X, y + oy, trozo * e + 0.6, BANDA + 0.4); X += trozo * e; sx = (sx + trozo) % TW; }
    }
    // juntas que se alejan: rectas reales hacia el punto de fuga (dos pasadas: la junta y su bisel iluminado)
    const J = tex.juntas;
    if (J) {
      const yDe = (p) => Y_HOR + HC / (1 + p / D0), Xde = (wx, y) => ANCHO / 2 + (wx - cam.x) * z * (y - Y_HOR) / HC;
      const tramos = J.ps ? J.ps.length - 1 : 1;
      for (const [col, dx, w] of [[def.suelo.junta, 0, 2], [conAlfa(def.suelo.bisel || '#ffffff', 0.18), 1.6, 1]]) {
        ctx.beginPath();
        for (let j = 0; j < tramos; j++) {
          const yA = Math.max(Y_FONDO, J.ps ? yDe(J.ps[j]) : Y_FONDO), yB = Math.min(ALTO + MARGEN, J.ps ? yDe(J.ps[j + 1]) : ALTO + MARGEN); if (yB <= yA) continue;
          const desf = J.desf ? (j % 2) * J.T * 0.5 : 0, medio = (ANCHO / 2 + MARGEN) / (z * (yA - Y_HOR) / HC);
          for (let i = Math.floor((cam.x - medio - desf) / J.T); i <= Math.ceil((cam.x + medio - desf) / J.T); i++) { const wx = i * J.T + desf; ctx.moveTo(Xde(wx, yA) + dx, yA + oy); ctx.lineTo(Xde(wx, yB) + dx, yB + oy); }
        }
        ctx.strokeStyle = col; ctx.lineWidth = Math.max(1, w * z); ctx.stroke();
      }
    }
    if (brillo > 0 && E.calidad !== 'bajo') {
      ctx.save(); ctx.beginPath(); ctx.rect(-MARGEN, Y_FONDO + oy, ANCHO + MARGEN * 2, ALTO + MARGEN); ctx.clip();
      if (reflejoCerca) tiras(ctx, reflejoCerca, capaCerca.par, Y_FONDO);
      vivo.reflejos?.call(vivo, ctx, E, t);
      if (reflejar) reflejar(ctx, Math.min(0.42, brillo * 0.55));
      ctx.restore();
    }
    ctx.drawImage(aoArriba, -MARGEN, Y_FONDO + oy); ctx.drawImage(aoAbajo, -MARGEN, ALTO - 80 + Math.max(0, oy));
    for (const cp of P.capas) if (cp.tras === 'suelo' && E.calidad !== 'bajo') { ctx.globalCompositeOperation = cp.aditiva ? 'lighter' : 'source-over'; tiras(ctx, cp.img, cp.par, cp.y0); ctx.globalCompositeOperation = 'source-over'; }
    vivo.suelo?.call(vivo, ctx, E, t);
  };
  E.delante = (ctx, cam, t) => { if (E.calidad === 'bajo') return; vivo.delante?.call(vivo, ctx, E, t); };
  E.post = (ctx, t) => { ctx.drawImage(vineta, 0, 0); vivo.post?.call(vivo, ctx, E, t); };
  E.prop = (ctx, o, x0, y0, w, h, dano, z) => dibujarProp(ctx, def, o, x0, y0, w, h, dano, z, k.cpu);
  return E;
}

// ---------------------------------------------------------------- objetos que se rompen, con el arte de cada escenario
// Ocupan EXACTAMENTE su caja de colisión (x0, y0, w, h en pantalla): lo que se ve es lo que bloquea.
function dibujarProp(ctx, def, o, x0, y0, w, h, dano, z, cpu) {
  const L = def.luz, lado = L.dx > 0 ? 1 : -1, cont = L.contorno, caja = w >= h * 0.7, tipo = caja ? def.caja : def.prop;
  const sombrear = (x, y, ww, hh, base) => { ctx.fillStyle = base; ctx.fillRect(x, y, ww, hh); ctx.fillStyle = conAlfa(L.sombra, 0.45); if (lado > 0) ctx.fillRect(x, y, ww * 0.38, hh); else ctx.fillRect(x + ww * 0.62, y, ww * 0.38, hh); ctx.fillStyle = conAlfa(L.rim, 0.55); ctx.fillRect(lado > 0 ? x + ww - Math.max(1.5, ww * 0.06) : x, y, Math.max(1.5, ww * 0.06), hh); };
  const borde = (x, y, ww, hh) => { ctx.strokeStyle = cont; ctx.lineWidth = Math.max(1.5, 2.5 * z); ctx.strokeRect(x, y, ww, hh); };
  ctx.save(); ctx.lineJoin = 'round';
  const piedra = mezclar(o.color || '#6f6a7d', '#8a8090', 0.3);
  if (tipo === 'farolPiedra') {
    const c = mezclar('#7a7468', L.amb, 0.2), cx = x0 + w / 2;
    sombrear(x0 - w * 0.1, y0 + h * 0.86, w * 1.2, h * 0.14, c); borde(x0 - w * 0.1, y0 + h * 0.86, w * 1.2, h * 0.14);
    sombrear(cx - w * 0.2, y0 + h * 0.5, w * 0.4, h * 0.36, c); borde(cx - w * 0.2, y0 + h * 0.5, w * 0.4, h * 0.36);
    sombrear(x0 + w * 0.05, y0 + h * 0.3, w * 0.9, h * 0.2, c); borde(x0 + w * 0.05, y0 + h * 0.3, w * 0.9, h * 0.2);
    ctx.fillStyle = '#ffd27a'; ctx.fillRect(cx - w * 0.22, y0 + h * 0.34, w * 0.44, h * 0.12);
    ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x0 - w * 0.25, y0 + h * 0.31); ctx.quadraticCurveTo(cx, y0 + h * 0.12, x0 + w * 1.25, y0 + h * 0.31); ctx.closePath(); ctx.fill(); ctx.strokeStyle = cont; ctx.lineWidth = Math.max(1.5, 2.5 * z); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, y0 + h * 0.12, w * 0.14, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.6 + 0.1 * Math.sin(performance.now() / 90); ctx.drawImage(halo('#ffb050', cpu), cx - w * 1.4, y0 + h * 0.4 - w * 1.4, w * 2.8, w * 2.8); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  } else if (tipo === 'columna' || tipo === 'obelisco') {
    const c = tipo === 'obelisco' ? '#c89060' : mezclar('#8a7a78', L.amb, 0.15);
    if (tipo === 'obelisco') { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x0 + w * 0.08, y0 + h); ctx.lineTo(x0 + w * 0.2, y0 + h * 0.12); ctx.lineTo(x0 + w / 2, y0); ctx.lineTo(x0 + w * 0.8, y0 + h * 0.12); ctx.lineTo(x0 + w * 0.92, y0 + h); ctx.closePath(); ctx.fill(); ctx.save(); ctx.clip(); ctx.fillStyle = conAlfa(L.sombra, 0.4); ctx.fillRect(lado > 0 ? x0 : x0 + w / 2, y0, w / 2, h); ctx.fillStyle = 'rgba(80,40,20,.35)'; for (let s = 0.25; s < 0.95; s += 0.17) ctx.fillRect(x0, y0 + h * s, w, Math.max(1, 2 * z)); ctx.restore(); ctx.strokeStyle = cont; ctx.lineWidth = Math.max(1.5, 2.5 * z); ctx.stroke(); }
    else { sombrear(x0 + w * 0.08, y0 + h * 0.08, w * 0.84, h * 0.84, c); ctx.fillStyle = 'rgba(0,0,0,.16)'; for (let f = 0.22; f < 0.9; f += 0.18) ctx.fillRect(x0 + w * f, y0 + h * 0.1, Math.max(1, 1.5 * z), h * 0.8); borde(x0 + w * 0.08, y0 + h * 0.08, w * 0.84, h * 0.84); sombrear(x0, y0, w, h * 0.09, mezclar(c, '#ffffff', 0.08)); borde(x0, y0, w, h * 0.09); sombrear(x0 - w * 0.06, y0 + h * 0.91, w * 1.12, h * 0.09, c); borde(x0 - w * 0.06, y0 + h * 0.91, w * 1.12, h * 0.09); }
  } else if (tipo === 'poste') {
    const c = '#7a5236'; sombrear(x0 + w * 0.1, y0, w * 0.8, h, c); ctx.fillStyle = 'rgba(40,20,10,.25)'; for (let g = 0.25; g < 0.9; g += 0.2) ctx.fillRect(x0 + w * g, y0, Math.max(1, z), h);
    for (const by of [0.18, 0.5, 0.78]) { ctx.fillStyle = '#c8b080'; ctx.fillRect(x0, y0 + h * by, w, h * 0.07); ctx.strokeStyle = 'rgba(90,60,30,.6)'; ctx.lineWidth = Math.max(1, z); for (let q = 0; q < 4; q++) { ctx.beginPath(); ctx.moveTo(x0 + w * q / 4, y0 + h * by); ctx.lineTo(x0 + w * (q + 1) / 4, y0 + h * (by + 0.07)); ctx.stroke(); } }
    borde(x0 + w * 0.1, y0, w * 0.8, h); ctx.fillStyle = '#5a3a26'; ctx.fillRect(x0, y0 - 2, w, h * 0.05); borde(x0, y0 - 2, w, h * 0.05);
  } else if (tipo === 'tanque') {   // torre de ventilación de azotea: chimenea con sombrerete, rejillas y un piloto
    const cx = x0 + w / 2, met = '#56627c';
    sombrear(x0 + w * 0.08, y0 + h * 0.2, w * 0.84, h * 0.8, met); ctx.fillStyle = 'rgba(8,12,22,.55)'; for (let l = 0.3; l < 0.9; l += 0.075) ctx.fillRect(x0 + w * 0.2, y0 + h * l, w * 0.6, Math.max(1, 1.8 * z)); borde(x0 + w * 0.08, y0 + h * 0.2, w * 0.84, h * 0.8);
    ctx.fillStyle = mezclar(met, '#ffffff', 0.1); ctx.beginPath(); ctx.moveTo(x0 - w * 0.12, y0 + h * 0.2); ctx.lineTo(cx, y0); ctx.lineTo(x0 + w * 1.12, y0 + h * 0.2); ctx.closePath(); ctx.fill(); ctx.strokeStyle = cont; ctx.lineWidth = Math.max(1.5, 2.5 * z); ctx.stroke();
    ctx.fillStyle = conAlfa(L.rim, 0.6); ctx.fillRect(lado > 0 ? x0 + w * 0.86 : x0 + w * 0.08, y0 + h * 0.2, Math.max(1.5, w * 0.06), h * 0.8);
    ctx.fillStyle = '#ffd04a'; ctx.fillRect(x0 + w * 0.08, y0 + h * 0.92, w * 0.84, h * 0.04); ctx.fillStyle = '#1a1a1a'; for (let s2 = 0; s2 < 4; s2++) ctx.fillRect(x0 + w * (0.12 + s2 * 0.2), y0 + h * 0.92, w * 0.08, h * 0.04);
    const on = Math.sin(performance.now() / 260) > 0; ctx.fillStyle = on ? '#ff4a4a' : '#5a1a1a'; ctx.beginPath(); ctx.arc(cx, y0 + h * 0.26, Math.max(1.5, 3 * z), 0, TAU); ctx.fill();
    if (on) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.6; ctx.drawImage(halo('#ff4040', cpu), cx - 16 * z, y0 + h * 0.26 - 16 * z, 32 * z, 32 * z); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
  } else if (tipo === 'cristal') {
    const cx = x0 + w / 2; ctx.fillStyle = 'rgba(170,220,255,.85)'; ctx.beginPath(); ctx.moveTo(cx, y0); ctx.lineTo(x0 + w, y0 + h * 0.2); ctx.lineTo(x0 + w * 0.9, y0 + h); ctx.lineTo(x0 + w * 0.1, y0 + h); ctx.lineTo(x0, y0 + h * 0.2); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#3a5a9a'; ctx.lineWidth = Math.max(1.5, 2.5 * z); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.moveTo(cx, y0); ctx.lineTo(cx + w * 0.12, y0 + h * 0.2); ctx.lineTo(cx + w * 0.05, y0 + h); ctx.lineTo(cx - w * 0.08, y0 + h); ctx.closePath(); ctx.fill();
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.45; ctx.drawImage(halo('#9ad8ff', cpu), cx - w * 1.5, y0 + h * 0.5 - w * 1.5, w * 3, w * 3); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  } else if (tipo === 'maquina') {
    sombrear(x0, y0, w, h, '#2a2a48'); borde(x0, y0, w, h); ctx.fillStyle = '#9ae8ff'; ctx.fillRect(x0 + w * 0.12, y0 + h * 0.08, w * 0.76, h * 0.5);
    for (let f = 0; f < 4; f++) for (let c = 0; c < 3; c++) { ctx.fillStyle = ['#ff6a8a', '#ffd24a', '#6ad8ff', '#8aff8a'][(f + c) % 4]; ctx.fillRect(x0 + w * (0.18 + c * 0.24), y0 + h * (0.12 + f * 0.11), w * 0.14, h * 0.07); }
    ctx.fillStyle = '#14142a'; ctx.fillRect(x0 + w * 0.2, y0 + h * 0.72, w * 0.6, h * 0.1);
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.4; ctx.drawImage(halo('#6ae0ff', cpu), x0 - w, y0 - h * 0.1, w * 3, h * 0.9); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  } else if (tipo === 'vasija') {
    for (const [fx, fw] of [[0.02, 0.5], [0.46, 0.52]]) { const cx = x0 + w * (fx + fw / 2), rw = w * fw / 2; ctx.fillStyle = '#b8643a'; ctx.beginPath(); ctx.ellipse(cx, y0 + h * 0.6, rw, h * 0.4, 0, 0, TAU); ctx.fill(); ctx.fillRect(cx - rw * 0.45, y0 + h * 0.08, rw * 0.9, h * 0.2); ctx.fillStyle = conAlfa(L.sombra, 0.4); ctx.beginPath(); ctx.ellipse(cx + rw * 0.35 * -lado, y0 + h * 0.62, rw * 0.6, h * 0.36, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = cont; ctx.lineWidth = Math.max(1.5, 2.2 * z); ctx.beginPath(); ctx.ellipse(cx, y0 + h * 0.6, rw, h * 0.4, 0, 0, TAU); ctx.stroke(); ctx.fillStyle = '#e8c088'; ctx.fillRect(cx - rw, y0 + h * 0.5, rw * 2, Math.max(1, 2 * z)); }
  } else {   // cajas: madera, metal, piedra, mármol, fruta
    const mat = { madera: '#8a6240', metal: '#56607a', piedra: piedra, marmol: '#e4e6ee', fruta: '#6a4630' }[tipo] || '#8a6240';
    sombrear(x0, y0, w, h, mat); borde(x0, y0, w, h);
    ctx.strokeStyle = conAlfa(cont, 0.6); ctx.lineWidth = Math.max(1, 2 * z);
    if (tipo === 'madera' || tipo === 'fruta') { ctx.beginPath(); for (let p = 1; p < 3; p++) { ctx.moveTo(x0, y0 + h * p / 3); ctx.lineTo(x0 + w, y0 + h * p / 3); } ctx.moveTo(x0, y0); ctx.lineTo(x0 + w, y0 + h); ctx.stroke(); }
    else if (tipo === 'metal') { ctx.fillStyle = '#ffd04a'; ctx.fillRect(x0, y0 + h * 0.42, w, h * 0.16); ctx.fillStyle = '#1a1a1a'; for (let s = 0; s < w; s += 10 * z) ctx.fillRect(x0 + s, y0 + h * 0.42, 4 * z, h * 0.16); }
    else if (tipo === 'marmol') { ctx.fillStyle = '#e0b84a'; ctx.fillRect(x0, y0 + h * 0.12, w, h * 0.06); ctx.fillRect(x0, y0 + h * 0.82, w, h * 0.06); }
    else { ctx.beginPath(); ctx.moveTo(x0 + w * 0.3, y0 + h * 0.2); ctx.lineTo(x0 + w * 0.5, y0 + h * 0.3); ctx.stroke(); }
    if (tipo === 'fruta') for (let g = 0; g < 4; g++) { ctx.fillStyle = ['#ff8a3a', '#ffd24a', '#e83a4a', '#6ac84a'][g]; ctx.beginPath(); ctx.arc(x0 + w * (0.18 + g * 0.21), y0 - 2 * z, w * 0.1, Math.PI, TAU); ctx.fill(); }
  }
  // grietas: crecen con el daño; la misma forma siempre (sale del id)
  if (dano > 0.15) {
    let s = 0; for (const ch of String(o.id)) s = (s * 31 + ch.charCodeAt(0)) | 0; const p = crearPRNG(s || 7);
    ctx.strokeStyle = conAlfa('#000000', 0.55); ctx.lineWidth = Math.max(1.2, 2 * z); ctx.beginPath();
    for (let g = 0; g < (dano > 0.55 ? 2 : 1); g++) { let gx = x0 + w * (0.3 + p.num() * 0.4), gy = y0 + h * 0.05; ctx.moveTo(gx, gy); for (let q = 0; q < 6 && gy < y0 + h * dano; q++) { gx += (p.num() - 0.5) * w * 0.5; gy += h * 0.12; ctx.lineTo(Math.max(x0, Math.min(x0 + w, gx)), gy); } }
    ctx.stroke();
  }
  ctx.restore();
}
