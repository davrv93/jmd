// Témpano IA · la física y la IA de los ositos, sin nada de pantalla.
// Se usa en el navegador y también desde Node (simular.mjs) para medir la
// dificultad. Unidades: píxeles del mundo; el centro del témpano es (0, 0).

export const R_OSO = 24;          // radio de cada osito
export const R_HIELO = 300;       // radio inicial del témpano
export const R_MIN = 66;          // el centro nunca se rompe
export const SECTORES = 40;       // el borde es un polígono de 40 puntas
export const DURACION = 60;       // segundos máximos por ronda
export const ACEL = 560;          // aceleración con el joystick a fondo
export const ROCE = 2.6;          // hielo resbaloso: frena poco
export const V_MAX = 620;
export const EMBESTIDA = 300;     // impulso de la embestida
export const ENFRIA = 1.2;        // segundos de espera entre embestidas
export const INVULNERABLE = 1.5;  // tras un rescate
const REBOTE = 0.3;               // un poco «de dibujito»: rebota más que lo real
const AVISO_GRIETA = 0.75;        // la grieta se ve antes de romperse

export const COLORES = [
  { nombre: "Tú", bufanda: "#ff7a3d", oscura: "#c4501b" },
  { nombre: "Copo", bufanda: "#3db7ff", oscura: "#1f7fbd" },
  { nombre: "Escarcha", bufanda: "#7be08f", oscura: "#3b9c52" },
  { nombre: "Nieve", bufanda: "#ff6fb5", oscura: "#c23d81" },
];

const TAU = Math.PI * 2;
const largo = (x, y) => Math.hypot(x, y);

// Ronda nueva: témpano entero y los 4 ositos en cruz mirando al centro.
// «nivel» (0..1) ajusta la IA: 0 = tranquila, 1 = brava.
export function nuevaRonda(azar = Math.random, nivel = 0.5) {
  const hielo = { r: new Float32Array(SECTORES).fill(R_HIELO), grietas: [], trozos: [], proxima: 4.5 };
  const giro = azar() * TAU;
  const osos = COLORES.map((c, i) => {
    const a = giro + (i * TAU) / 4, d = 175;
    return {
      id: i, cpu: i > 0, nombre: c.nombre, color: c,
      x: Math.cos(a) * d, y: Math.sin(a) * d, vx: 0, vy: 0,
      fx: -Math.cos(a), fy: -Math.sin(a),       // hacia dónde mira
      vivo: true, fuera: false, cayendo: -1, cd: 0.4 + azar() * 0.6, dash: 0, inv: 0, golpe: 0, paso: azar() * 10,
      ia: { pensar: 0.4 + azar() * 0.5, mx: 0, my: 0, quiere: false, obj: -1 },
    };
  });
  return { t: 0, hielo, osos, nivel, azar, eventos: [], fin: null };
}

// Radio del témpano en la dirección del ángulo (interpola entre puntas).
export function radioEn(hielo, ang) {
  let u = ((ang % TAU) + TAU) % TAU / TAU * SECTORES;
  const i = Math.floor(u) % SECTORES, k = u - Math.floor(u);
  return hielo.r[i] * (1 - k) + hielo.r[(i + 1) % SECTORES] * k;
}

export const radioMedio = (hielo) => hielo.r.reduce((a, b) => a + b, 0) / SECTORES;
export const radioMax = (hielo) => Math.max(...hielo.r);

// ¿Cuánto le falta al osito para caer? (negativo = ya está fuera)
export function margen(m, o) {
  return radioEn(m.hielo, Math.atan2(o.y, o.x)) - largo(o.x, o.y);
}

export const enPie = (o) => o.vivo && o.cayendo < 0;

// El tamaño al que debería ir encogiendo el témpano: del todo a ~95 px en 56 s.
function radioObjetivo(t) {
  if (t < 4) return R_HIELO;
  return Math.max(95, R_HIELO - (R_HIELO - 95) * Math.min(1, (t - 4) / 38));
}

function grietas(m, dt) {
  const h = m.hielo, az = m.azar;
  // Programa una grieta nueva en la parte más ancha (con algo de azar).
  if (m.t >= h.proxima) {
    h.proxima = m.t + 0.85 + az() * 0.5;
    const objetivo = radioObjetivo(m.t + AVISO_GRIETA);
    let mejor = -1, peso = -1;
    for (let i = 0; i < SECTORES; i++) {
      const p = (h.r[i] - R_MIN) * (0.6 + az() * 0.8);
      if (p > peso) { peso = p; mejor = i; }
    }
    const exceso = radioMedio(h) - objetivo;
    if (mejor >= 0 && h.r[mejor] > R_MIN + 8 && exceso > -10) {
      const n = 3 + Math.floor(az() * 3);
      const prof = Math.min(70, Math.max(16, exceso * 0.9 + 14 + az() * 16));
      h.grietas.push({ i: mejor - Math.floor(n / 2), n, prof, t0: m.t });
      m.eventos.push({ tipo: "aviso" });
    }
  }
  // Las grietas avisadas se rompen: sale un trozo flotando.
  for (let g = h.grietas.length - 1; g >= 0; g--) {
    const gr = h.grietas[g];
    if (m.t - gr.t0 < AVISO_GRIETA) continue;
    h.grietas.splice(g, 1);
    const afuera = [], adentro = [];
    for (let k = 0; k <= gr.n; k++) {
      const i = (((gr.i + k) % SECTORES) + SECTORES) % SECTORES;
      const a = (i / SECTORES) * TAU;
      const viejo = h.r[i];
      const borde = k === 0 || k === gr.n;
      const nuevo = borde ? viejo : Math.max(R_MIN, viejo - gr.prof * (0.75 + m.azar() * 0.5));
      if (!borde) h.r[i] = nuevo;
      afuera.push([Math.cos(a) * viejo, Math.sin(a) * viejo]);
      adentro.unshift([Math.cos(a) * nuevo, Math.sin(a) * nuevo]);
    }
    const pts = afuera.concat(adentro);
    const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
    const d = largo(cx, cy) || 1;
    h.trozos.push({ pts: pts.map(([x, y]) => [x - cx, y - cy]), x: cx, y: cy, vx: (cx / d) * 26, vy: (cy / d) * 26,
      rot: 0, vr: (m.azar() - 0.5) * 0.8, t: 0 });
    m.eventos.push({ tipo: "grieta", x: cx, y: cy });
  }
  for (let k = h.trozos.length - 1; k >= 0; k--) {
    const tr = h.trozos[k];
    tr.t += dt; tr.x += tr.vx * dt; tr.y += tr.vy * dt; tr.rot += tr.vr * dt;
    tr.vx *= 1 - 0.6 * dt; tr.vy *= 1 - 0.6 * dt;
    if (tr.t > 5) h.trozos.splice(k, 1);
  }
}

// La IA de un osito de la máquina: busca al más cercano (la persona le
// atrae un poco más), lo empuja hacia afuera, embiste cuando está alineado y,
// a veces, se acuerda de alejarse del borde.
export function pensar(m, o, dt, nv = m.nivel) {
  const ia = o.ia, az = m.azar;
  ia.pensar -= dt;
  if (ia.pensar > 0) return;
  ia.pensar = 0.16 + az() * (0.3 - 0.12 * nv);
  ia.quiere = false;
  let obj = null, mejor = Infinity;
  for (const p of m.osos) {
    if (p === o || !enPie(p)) continue;
    const d = largo(p.x - o.x, p.y - o.y) * (p.cpu ? 1 : 0.9) + az() * 90;
    if (d < mejor) { mejor = d; obj = p; }
  }
  const mio = margen(m, o);
  const dc = largo(o.x, o.y) || 1;
  const vaAfuera = (o.vx * o.x + o.vy * o.y) / dc;
  if (!obj || (mio < 58 + 20 * nv && az() < 0.55 + 0.3 * nv) || (vaAfuera > 200 && mio < 110 && az() < 0.5 + 0.4 * nv)) {
    // Al centro, con un poco de temblor.
    const a = Math.atan2(-o.y, -o.x) + (az() - 0.5) * 0.6;
    ia.mx = Math.cos(a); ia.my = Math.sin(a); ia.obj = -1;
    return;
  }
  ia.obj = obj.id;
  // Apunta un poco adelante de donde va el otro y lo empuja hacia afuera.
  const lx = obj.x + obj.vx * 0.22, ly = obj.y + obj.vy * 0.22;
  let dx = lx - o.x, dy = ly - o.y;
  const dd = largo(dx, dy) || 1;
  dx /= dd; dy /= dd;
  const ox = obj.x / (largo(obj.x, obj.y) || 1), oy = obj.y / (largo(obj.x, obj.y) || 1);
  let mx = dx + ox * 0.35, my = dy + oy * 0.35;
  const temblor = (az() - 0.5) * (0.7 - 0.4 * nv);
  const c = Math.cos(temblor), s = Math.sin(temblor);
  [mx, my] = [mx * c - my * s, mx * s + my * c];
  const ml = largo(mx, my) || 1;
  ia.mx = mx / ml; ia.my = my / ml;
  const alineado = (dx * o.fx + dy * o.fy) > 0.9;
  if (o.cd <= 0 && dd < 150 + 40 * nv && alineado && az() < 0.22 + 0.3 * nv) ia.quiere = true;
}

// Un paso de física. «control» = { x, y, dash } de la persona (y opcional
// para los demás: controles[id]).
export function paso(m, dt, controles = {}) {
  m.t += dt;
  grietas(m, dt);
  for (const o of m.osos) {
    if (o.cayendo >= 0) {
      o.cayendo += dt;
      o.x += o.vx * dt; o.y += o.vy * dt; o.vx *= 1 - 3 * dt; o.vy *= 1 - 3 * dt;
      continue;
    }
    if (!o.vivo) continue;
    let mx = 0, my = 0, dash = false;
    const c = controles[o.id];
    if (c) { mx = c.x; my = c.y; dash = c.dash; }
    else if (o.cpu && !o.quieto) { pensar(m, o, dt); mx = o.ia.mx; my = o.ia.my; dash = o.ia.quiere; o.ia.quiere = false; }
    const ml = largo(mx, my);
    if (ml > 1) { mx /= ml; my /= ml; }
    const acel = ACEL * (o.cpu ? 0.86 + 0.12 * m.nivel : 1);
    o.vx += mx * acel * dt; o.vy += my * acel * dt;
    o.vx *= 1 - ROCE * dt; o.vy *= 1 - ROCE * dt;
    if (ml > 0.15) {
      const k = Math.min(1, dt * 12);
      o.fx += (mx / Math.max(ml, 1e-6) - o.fx) * k; o.fy += (my / Math.max(ml, 1e-6) - o.fy) * k;
      const fl = largo(o.fx, o.fy) || 1; o.fx /= fl; o.fy /= fl;
    }
    o.cd = Math.max(0, o.cd - dt);
    o.dash = Math.max(0, o.dash - dt);
    o.inv = Math.max(0, o.inv - dt);
    o.golpe = Math.max(0, o.golpe - dt * 3);
    if (dash && o.cd <= 0) {
      let ex = ml > 0.15 ? mx / ml : o.fx, ey = ml > 0.15 ? my / ml : o.fy;
      if (o.cpu && o.ia.obj >= 0) {
        const t = m.osos[o.ia.obj];
        const d = largo(t.x - o.x, t.y - o.y) || 1;
        ex = (t.x - o.x) / d; ey = (t.y - o.y) / d;
      }
      o.vx += ex * EMBESTIDA; o.vy += ey * EMBESTIDA;
      o.fx = ex; o.fy = ey;
      o.cd = ENFRIA; o.dash = 0.24;
      m.eventos.push({ tipo: "embestida", id: o.id });
    }
    const v = largo(o.vx, o.vy);
    if (v > V_MAX) { o.vx *= V_MAX / v; o.vy *= V_MAX / v; }
    o.x += o.vx * dt; o.y += o.vy * dt;
    o.paso += v * dt * 0.05;
  }
  // Choques entre ositos (círculos con masa y rebote).
  const en = m.osos.filter(enPie);
  for (let a = 0; a < en.length; a++) {
    for (let b = a + 1; b < en.length; b++) {
      const p = en[a], q = en[b];
      let nx = q.x - p.x, ny = q.y - p.y;
      const d = largo(nx, ny);
      if (d >= R_OSO * 2 || d === 0) continue;
      nx /= d; ny /= d;
      const mp = p.inv > 0 ? 40 : p.dash > 0 ? 1.6 : 1, mq = q.inv > 0 ? 40 : q.dash > 0 ? 1.6 : 1;
      const ip = 1 / mp, iq = 1 / mq;
      const solape = R_OSO * 2 - d;
      p.x -= nx * solape * ip / (ip + iq); p.y -= ny * solape * ip / (ip + iq);
      q.x += nx * solape * iq / (ip + iq); q.y += ny * solape * iq / (ip + iq);
      const vn = (p.vx - q.vx) * nx + (p.vy - q.vy) * ny;
      if (vn <= 0) continue;
      const J = (REBOTE + 1) * vn / (ip + iq);
      p.vx -= J * ip * nx; p.vy -= J * ip * ny;
      q.vx += J * iq * nx; q.vy += J * iq * ny;
      p.golpe = q.golpe = Math.min(1, vn / 300);
      m.eventos.push({ tipo: "golpe", fuerza: vn, x: (p.x + q.x) / 2, y: (p.y + q.y) / 2, ids: [p.id, q.id] });
    }
  }
  // ¿Alguien se salió del hielo?
  for (const o of m.osos) {
    if (!enPie(o)) continue;
    if (o.inv > 0) {
      // Recién rescatado: no se cae, el borde lo devuelve.
      const mg = margen(m, o);
      if (mg < 6) { const d = largo(o.x, o.y) || 1; o.x -= (o.x / d) * (6 - mg); o.y -= (o.y / d) * (6 - mg); o.vx *= 0.3; o.vy *= 0.3; }
      continue;
    }
    if (margen(m, o) < -4) {
      o.cayendo = 0;
      m.eventos.push({ tipo: "caida", id: o.id, x: o.x, y: o.y });
    }
  }
  // Los que terminaron de hundirse quedan fuera (la persona espera rescate).
  for (const o of m.osos) {
    if (o.cayendo > 0.75 && o.vivo) {
      o.vivo = false;
      if (o.cpu) o.fuera = true;
      m.eventos.push({ tipo: "hundido", id: o.id });
    }
  }
}

// La persona vuelve al centro del hielo, quieta y sin que la empujen un rato.
export function rescatar(m, id = 0) {
  const o = m.osos[id];
  o.vivo = true; o.cayendo = -1; o.x = 0; o.y = 0; o.vx = 0; o.vy = 0; o.inv = INVULNERABLE; o.cd = 0.3;
}

// Resultado de la ronda (null si sigue). «esperaRescate» = la persona cayó y
// todavía no responde su pregunta.
export function resultado(m, esperaRescate = false) {
  if (esperaRescate) return null;
  const yo = m.osos[0];
  if (yo.fuera) return "perdio";
  if (enPie(yo) && m.osos.filter(enPie).length === 1) return "gano";
  if (m.t >= DURACION) return "tiempo";
  return null;
}
