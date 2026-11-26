// Forja · Anime Battle Engine · animación por articulaciones (§11). El luchador es un esqueleto 2D (cadera, torso,
// cabeza, brazos y piernas de dos tramos) con LARGOS FIJOS sacados de su altura: solo se animan ángulos, así que las
// proporciones nunca se deforman. La pose sale del MISMO contador de cuadros del combate (estado + movF + frame data):
// arranque = preparación, activo = golpe extendido, recuperación = vuelta a guardia. Imposible que dibujo y daño se
// desincronicen. Interpolación de poses con suavizado; reposo, caminar y correr son procedurales (seno del tiempo).
// Orientación: se espeja el cuerpo, pero el lado de cada accesorio se respeta (la hombrera izquierda sigue en el brazo
// izquierdo, que pasa a dibujarse detrás) y los textos/emblemas no se espejan.
const K = Math.PI / 180;
// ángulos en grados. torso/cabeza: 0 = vertical; extremidades: 0 = colgando, positivo = hacia adelante
export const POSES = {
  guardia:   { torso: 6, cabeza: -4, hC: 60, cC: 95, hL: 35, cL: 105, pC: 18, rC: -22, pL: -14, rL: -18, cy: -4 },
  caminarA:  { torso: 8, cabeza: -4, hC: 50, cC: 90, hL: 25, cL: 100, pC: 30, rC: -10, pL: -22, rL: -35, cy: -2 },
  caminarB:  { torso: 8, cabeza: -4, hC: 30, cC: 90, hL: 45, cL: 100, pC: -22, rC: -35, pL: 30, rL: -10, cy: -2 },
  correrA:   { torso: 22, cabeza: -10, hC: 75, cC: 100, hL: -40, cL: 70, pC: 55, rC: -20, pL: -40, rL: -70, cy: -6 },
  correrB:   { torso: 22, cabeza: -10, hC: -40, cC: 70, hL: 75, cL: 100, pC: -40, rC: -70, pL: 55, rL: -20, cy: -6 },
  impulso:   { torso: 34, cabeza: -16, hC: -50, cC: 30, hL: -60, cL: 30, pC: 60, rC: -40, pL: -50, rL: -40, cy: -14 },
  salto:     { torso: 4, cabeza: 0, hC: 80, cC: 110, hL: 60, cL: 120, pC: 70, rC: -100, pL: 20, rL: -110, cy: 0 },
  caida:     { torso: -4, cabeza: 4, hC: 110, cC: 40, hL: 100, cL: 50, pC: 30, rC: -40, pL: -10, rL: -30, cy: 0 },
  agachado:  { torso: 18, cabeza: -10, hC: 60, cC: 100, hL: 40, cL: 110, pC: 95, rC: -140, pL: 70, rL: -150, cy: -34 },
  bloqueo:   { torso: -4, cabeza: 6, hC: 120, cC: 130, hL: 105, cL: 135, pC: 12, rC: -18, pL: -18, rL: -16, cy: -6 },
  bloqueoBajo: { torso: 10, cabeza: 0, hC: 90, cC: 120, hL: 70, cL: 125, pC: 95, rC: -140, pL: 70, rL: -150, cy: -34 },
  parada:    { torso: -10, cabeza: 8, hC: 150, cC: 40, hL: 20, cL: 80, pC: 10, rC: -10, pL: -30, rL: -10, cy: -2 },
  esquiva:   { torso: -26, cabeza: 10, hC: 30, cC: 90, hL: 10, cL: 90, pC: 40, rC: -60, pL: -40, rL: -30, cy: -12 },
  carga:     { torso: 2, cabeza: -14, hC: 20, cC: 40, hL: 20, cL: 40, pC: 30, rC: -30, pL: -30, rL: -30, cy: -14 },
  transformacion: { torso: -6, cabeza: -24, hC: 120, cC: 20, hL: 120, cL: 20, pC: 24, rC: -10, pL: -24, rL: -10, cy: -4 },
  dano:      { torso: -22, cabeza: 18, hC: -30, cC: 40, hL: -50, cL: 30, pC: 10, rC: -20, pL: -20, rL: -20, cy: -4 },
  empujado:  { torso: -60, cabeza: 24, hC: -90, cC: 20, hL: -110, cL: 10, pC: 40, rC: -30, pL: 10, rL: -20, cy: 0 },
  derribado: { torso: -88, cabeza: 6, hC: -150, cC: 10, hL: -170, cL: 0, pC: 80, rC: -10, pL: 92, rL: 0, cy: -44 },
  levantarse:{ torso: 30, cabeza: -10, hC: 40, cC: 60, hL: 10, cL: 60, pC: 90, rC: -120, pL: 40, rL: -110, cy: -26 },
  victoria:  { torso: -4, cabeza: -14, hC: 170, cC: 10, hL: 30, cL: 100, pC: 10, rC: -8, pL: -12, rL: -8, cy: 0 },
  derrota:   { torso: 40, cabeza: 30, hC: 10, cC: 20, hL: 0, cL: 20, pC: 95, rC: -150, pL: 60, rL: -100, cy: -36 },
  // golpes: [preparación, golpe]
  ligero:    [{ torso: 2, hC: 40, cC: 130 }, { torso: 12, hC: 90, cC: 4, hL: 30, cL: 120 }],
  ligero2:   [{ torso: 4, hL: 30, cL: 130 }, { torso: 14, hL: 92, cL: 6, hC: 50, cC: 120 }],
  medio:     [{ torso: -6, hC: 10, cC: 150 }, { torso: 18, hC: 96, cC: 2, hL: 10, cL: 120 }],
  fuerte:    [{ torso: -14, pC: -40, rC: -60, hC: 80 }, { torso: -24, pC: 100, rC: -4, hC: 20, cC: 100, hL: -20, cL: 90 }],
  bajoLigero:[{ pC: 80, rC: -120 }, { pC: 88, rC: -2 }],
  bajoMedio: [{ pC: 60, rC: -100, torso: 30 }, { pC: 92, rC: 0, torso: 34 }],
  lanzador:  [{ torso: 24, hC: -20, cC: 140, cy: -22 }, { torso: -10, hC: 175, cC: 10, cy: 4 }],
  impulsoFuerte: [{ torso: 30, hC: -30, cC: 120 }, { torso: 36, hC: 88, cC: 0, hL: -40, cL: 60 }],
  aereoLigero: [{ pC: 60, rC: -100 }, { pC: 80, rC: -10, torso: -10 }],
  aereoMedio: [{ hC: 30, cC: 140 }, { hC: 90, cC: 0, torso: 14 }],
  aereoFuerte: [{ torso: -10, hC: 170, cC: 40, hL: 160, cL: 40 }, { torso: 40, hC: 40, cC: 10, hL: 30, cL: 10 }],
  rompeGuardia: [{ torso: -20, hC: 140, cC: 60, hL: 130, cL: 60 }, { torso: 26, hC: 70, cC: 0, hL: 60, cL: 0 }],
  especial:  [{ torso: -8, hC: 20, cC: 140, hL: 10, cL: 150 }, { torso: 16, hC: 90, cC: 0, hL: 86, cL: 4 }],
  antiaereo: [{ torso: 20, hC: -10, cC: 150, cy: -24 }, { torso: -14, hC: 178, cC: 4, pC: 60, rC: -60, cy: 6 }],
  teleporte: [{ torso: 0, hC: 100, cC: 120 }, { torso: 0, hC: 100, cC: 120 }],
  embestida: [{ torso: 30, hC: 0, cC: 140 }, { torso: 42, hC: 80, cC: 20, hL: 70, cL: 30 }],
  cargado:   [{ torso: -10, hC: 60, cC: 140, hL: 50, cL: 140, cy: -10 }, { torso: 14, hC: 90, cC: 0, hL: 88, cL: 0, cy: -10 }],
  aereoEspecial: [{ hC: 40, cC: 140 }, { hC: 110, cC: 0, torso: 30 }],
  definitivo:[{ torso: -12, hC: 150, cC: 30, hL: 150, cL: 30, cy: -12 }, { torso: 20, hC: 90, cC: 0, hL: 90, cL: 0, cy: -8 }],
};
const CLAVES = ['torso', 'cabeza', 'hC', 'cC', 'hL', 'cL', 'pC', 'rC', 'pL', 'rL', 'cy'];
const mezcla = (a, b, t) => { const o = {}; for (const k of CLAVES) o[k] = (a[k] ?? 0) + ((b[k] ?? a[k] ?? 0) - (a[k] ?? 0)) * t; return o; };
const suave = (t) => t * t * (3 - 2 * t);

// pose objetivo de un luchador en este instante (L = luchador de combate.js). tiempo: segundos para lo procedural.
export function poseDe(L, tiempo = 0, anim = {}) {
  const P = { ...POSES, ...anim }, g = P.guardia, e = L.estado;
  if (L.mov && ['ataqueLigero', 'ataqueMedio', 'ataqueFuerte', 'ataqueAereo', 'combo', 'especial', 'definitivo'].includes(e)) {
    const m = L.mov, par = P[m.id] || P[m.tipo] || P.medio, base = m.aire ? P.salto : m.bajo ? P.agachado : g;
    const prep = { ...base, ...par[0] }, golpe = { ...base, ...par[1] }, k = L.movF;
    if (k < m.arranque) return mezcla(base, prep, suave(k / Math.max(1, m.arranque)));
    if (k < m.arranque + m.activo) return golpe;
    return mezcla(golpe, base, suave((k - m.arranque - m.activo) / Math.max(1, m.recuperacion)));
  }
  const ciclo = (a, b, vel) => mezcla(P[a], P[b], (Math.sin(tiempo * vel) + 1) / 2);
  switch (e) {
    case 'caminar': return ciclo('caminarA', 'caminarB', 9);
    case 'correr': return ciclo('correrA', 'correrB', 15);
    case 'reposo': case 'aterrizaje': { const r = mezcla(g, P.carga, 0); r.cy += Math.sin(tiempo * 3.2) * 2; r.torso += Math.sin(tiempo * 3.2) * 1.5; return r; }
    case 'bloqueo': case 'aturdidoBloqueo': return L.agachaBloqueo ? P.bloqueoBajo : P.bloqueo;
    case 'salto': return L.vy > 0 ? P.salto : P.caida;
    case 'aturdido': return L.suelo ? P.dano : P.empujado;
    default: return P[e] || g;
  }
}
// suavizado entre la pose anterior y la objetivo (interpolación visual entre cuadros)
export function acercar(actual, objetivo, k = 0.45) { if (!actual) return { ...objetivo }; for (const c of CLAVES) actual[c] += ((objetivo[c] ?? 0) - actual[c]) * k; return actual; }

// Dibuja el luchador en un contexto 2D de canvas (p5: drawingContext). x, y: pies en píxeles de pantalla; alto: px.
// cuerpo: colores y detalles del personaje; dir: 1 derecha / -1 izquierda.
export function dibujarLuchador(ctx, pose, { x, y, alto, dir = 1, cuerpo = {}, contorno = '#120d1c', destello = 0, alfa = 1, aura = null, t = 0 }) {
  const s = alto / 116, L = (n) => n * s;
  const largo = { torso: L(40), cuello: L(6), cabeza: L(15), brazo: L(22), ante: L(21), muslo: L(28), pierna: L(28) };
  const ladoCerca = dir > 0 ? 'izq' : 'der';   // mirando a la derecha, la cámara ve el lado izquierdo del cuerpo
  ctx.save(); ctx.globalAlpha = alfa; ctx.translate(x, y); ctx.scale(dir, 1);
  // destello de golpe: filtro de brillo solo mientras se dibuja este cuerpo (no tiñe el fondo)
  if (destello > 0) ctx.filter = `brightness(${(1 + destello * 2.2).toFixed(2)})`; else if (cuerpo.sombra) ctx.filter = 'saturate(0.6) brightness(0.85)';
  const cad = { x: 0, y: -(L(56) + L(pose.cy)) };
  const rot = (p, ang, l) => ({ x: p.x + Math.sin(ang * K) * l, y: p.y + Math.cos(ang * K) * l });
  const tor = pose.torso * K, cuelloP = { x: cad.x + Math.sin(tor) * largo.torso, y: cad.y - Math.cos(tor) * largo.torso };
  const cabezaP = { x: cuelloP.x + Math.sin(tor + pose.cabeza * K) * (largo.cuello + largo.cabeza), y: cuelloP.y - Math.cos(tor + pose.cabeza * K) * (largo.cuello + largo.cabeza) };
  const hombro = { x: cuelloP.x - Math.sin(tor) * L(4), y: cuelloP.y + Math.cos(tor) * L(4) };
  const brazo = (h, c) => { const a = rot(hombro, h + pose.torso, largo.brazo), b = rot(a, h + pose.torso + c, largo.ante); return [hombro, a, b]; };
  const pierna = (p, r) => { const a = rot(cad, p, largo.muslo), b = rot(a, p + r, largo.pierna); return [cad, a, b]; };
  const col = { piel: '#f0c9a0', pelo: '#222', ropa: '#3b4a9a', ropa2: '#eee', acento: '#ffd94a', cinta: '#ffd94a', ...cuerpo };
  const trazo = (pts, ancho, color, fondo = false) => {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); for (const p of pts.slice(1)) ctx.lineTo(p.x, p.y);
    ctx.strokeStyle = contorno; ctx.lineWidth = ancho + L(4.5); ctx.stroke();
    ctx.strokeStyle = fondo ? oscurecer(color, 0.72) : color; ctx.lineWidth = ancho; ctx.stroke();
    if (!fondo) { ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = ancho * 0.28; ctx.beginPath(); ctx.moveTo(pts[0].x - ancho * 0.18, pts[0].y); for (const p of pts.slice(1)) ctx.lineTo(p.x - ancho * 0.18, p.y); ctx.stroke(); }
  };
  if (aura) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(cad.x, cad.y - L(10), L(8), cad.x, cad.y - L(10), L(90)); g.addColorStop(0, aura + 'aa'); g.addColorStop(1, aura + '00'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(cad.x, cad.y - L(6), L(62), L(96), 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
  const bL = brazo(pose.hL, pose.cL), bC = brazo(pose.hC, pose.cC), pL = pierna(pose.pL, pose.rL), pC = pierna(pose.pC, pose.rC);
  // lejos (detrás del torso)
  trazo(pL, L(12), col.ropa, true); trazo([pL[2], { x: pL[2].x + L(8), y: pL[2].y }], L(9), col.ropa2, true);
  trazo(bL, L(9), col.piel, true);
  if (cuerpo.hombrera && cuerpo.hombrera !== ladoCerca) hombrera(ctx, bL[0], L, col, contorno, true);
  // torso
  const cint = { x: cad.x + Math.sin(tor) * L(6), y: cad.y - Math.cos(tor) * L(6) };
  trazo([cad, cuelloP], L(25), col.ropa);
  trazo([cad, cint], L(26), col.ropa2);
  // cabeza
  ctx.fillStyle = col.piel; ctx.strokeStyle = contorno; ctx.lineWidth = L(3.5);
  ctx.beginPath(); ctx.arc(cabezaP.x, cabezaP.y, largo.cabeza, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  pelo(ctx, cabezaP, largo.cabeza, col, contorno, cuerpo.peinado, L, t);
  // ojo y ceño (solo de frente al rival: no se dibujan «al revés»)
  ctx.fillStyle = contorno; ctx.beginPath(); ctx.ellipse(cabezaP.x + largo.cabeza * 0.45, cabezaP.y - L(1), L(2), L(3.2), 0, 0, Math.PI * 2); ctx.fill();
  ctx.lineWidth = L(2); ctx.beginPath(); ctx.moveTo(cabezaP.x + largo.cabeza * 0.2, cabezaP.y - L(6)); ctx.lineTo(cabezaP.x + largo.cabeza * 0.75, cabezaP.y - L(4)); ctx.stroke();
  if (cuerpo.cintaFrente) { ctx.strokeStyle = col.cinta; ctx.lineWidth = L(4); ctx.beginPath(); ctx.arc(cabezaP.x, cabezaP.y, largo.cabeza * 0.92, Math.PI * 1.05, Math.PI * 1.9); ctx.stroke(); cinta(ctx, { x: cabezaP.x - largo.cabeza * 0.9, y: cabezaP.y - L(4) }, col.cinta, L, t); }
  // cerca (delante)
  trazo(pC, L(13), col.ropa); trazo([pC[2], { x: pC[2].x + L(9), y: pC[2].y }], L(10), col.ropa2);
  trazo(bC, L(10), col.piel); ctx.fillStyle = col.piel; ctx.beginPath(); ctx.arc(bC[2].x, bC[2].y, L(6), 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = contorno; ctx.lineWidth = L(2.5); ctx.stroke();
  if (cuerpo.hombrera && cuerpo.hombrera === ladoCerca) hombrera(ctx, bC[0], L, col, contorno, false);
  ctx.filter = 'none'; ctx.restore();
  // emblema sin espejar (texto legible a ambos lados)
  if (cuerpo.emblema) { ctx.save(); ctx.font = `900 ${L(12)}px system-ui`; ctx.fillStyle = col.acento; ctx.textAlign = 'center'; ctx.fillText(cuerpo.emblema, x + dir * (cuelloP.x + cad.x) / 2, y + (cuelloP.y + cad.y) / 2 + L(4)); ctx.restore(); }
  return { mano: { x: x + dir * bC[2].x, y: y + bC[2].y }, pie: { x: x + dir * pC[2].x, y: y + pC[2].y }, cabeza: { x: x + dir * cabezaP.x, y: y + cabezaP.y } };
}
function hombrera(ctx, p, L, col, contorno, atras) { ctx.fillStyle = atras ? oscurecer(col.acento, 0.7) : col.acento; ctx.strokeStyle = contorno; ctx.lineWidth = L(3); ctx.beginPath(); ctx.ellipse(p.x, p.y + L(2), L(11), L(8), -0.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
function cinta(ctx, p, color, L, t) { ctx.strokeStyle = color; ctx.lineWidth = L(3.5); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.quadraticCurveTo(p.x - L(12), p.y + Math.sin(t * 7) * L(5), p.x - L(24), p.y + L(4) + Math.sin(t * 7 + 1) * L(7)); ctx.stroke(); }
function pelo(ctx, c, r, col, contorno, tipo = 'corto', L, t) {
  ctx.fillStyle = col.pelo; ctx.strokeStyle = contorno; ctx.lineWidth = L(3);
  ctx.beginPath();
  if (tipo === 'puntas') { ctx.moveTo(c.x + r * 0.9, c.y - r * 0.3); const n = 6; for (let i = 0; i <= n; i++) { const a = Math.PI * (1.05 + i / n * 0.95), ra = r * (i % 2 ? 1.9 : 1.05); ctx.lineTo(c.x - Math.cos(a) * -ra * (i % 2 ? 0.9 : 1), c.y + Math.sin(a) * ra + (i % 2 ? Math.sin(t * 4 + i) * L(1.2) : 0)); } ctx.lineTo(c.x - r * 0.9, c.y + r * 0.2); }
  else if (tipo === 'moño') { ctx.arc(c.x, c.y - r * 0.15, r * 1.02, Math.PI * 0.95, Math.PI * 2.05); ctx.moveTo(c.x - r * 0.55, c.y - r * 1.05); ctx.arc(c.x - r * 0.55, c.y - r * 1.15, r * 0.45, 0, Math.PI * 2); }
  else ctx.arc(c.x, c.y - r * 0.1, r * 1.04, Math.PI * 0.92, Math.PI * 2.08);
  ctx.closePath(); ctx.fill(); ctx.stroke();
}
export function oscurecer(hex, k) { if (!/^#[0-9a-f]{6}$/i.test(hex)) return hex; const n = parseInt(hex.slice(1), 16), f = (v) => Math.max(0, Math.min(255, Math.round(v * k))); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; }
