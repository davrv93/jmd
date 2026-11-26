// Forja · Anime Battle Engine · animación por articulaciones (§11). El luchador es un esqueleto 2D (cadera, torso,
// cabeza, brazos y piernas de dos tramos) con LARGOS FIJOS sacados de su altura: solo se animan ángulos, así que las
// proporciones nunca se deforman. La pose sale del MISMO contador de cuadros del combate (estado + movF + frame data):
// arranque = preparación, activo = golpe extendido, recuperación = vuelta a guardia. Imposible que dibujo y daño se
// desincronicen. Interpolación de poses con suavizado; reposo, caminar y correr son procedurales (seno del tiempo).
// Orientación: se espeja el cuerpo, pero el lado de cada accesorio se respeta (la hombrera izquierda sigue en el brazo
// izquierdo, que pasa a dibujarse detrás) y los textos/emblemas no se espejan.
import { mezclar } from './escenarios.js';
const K = Math.PI / 180;
// Medidas del esqueleto en UNIDADES (el dibujo las escala con alto / ESCALA): con la cabeza incluida mide ~126.
export const ESCALA = 126, SUELA = 5;
export const LARGOS = { torso: 40, cuello: 6, cabeza: 15, brazo: 22, ante: 21, muslo: 28, pierna: 28, hombro: 36 };
// ángulos en grados. torso/cabeza: 0 = vertical; extremidades: 0 = colgando, positivo = hacia adelante.
// Los brazos son relativos al torso; las piernas, absolutas. cy sube o baja la cadera (en el suelo se recalcula para que
// el pie más bajo pise justo la línea del suelo: ni flota ni se hunde).
export const POSES = {
  guardia:   { torso: 6, cabeza: -4, hC: 60, cC: 95, hL: 35, cL: 105, pC: 18, rC: -22, pL: -14, rL: -18, cy: -4 },
  caminarA:  { torso: 8, cabeza: -4, hC: 50, cC: 90, hL: 25, cL: 100, pC: 30, rC: -10, pL: -22, rL: -35, cy: -2 },
  caminarB:  { torso: 8, cabeza: -4, hC: 30, cC: 90, hL: 45, cL: 100, pC: -22, rC: -35, pL: 30, rL: -10, cy: -2 },
  correrA:   { torso: 22, cabeza: -10, hC: 75, cC: 100, hL: -40, cL: 70, pC: 55, rC: -20, pL: -40, rL: -70, cy: -6 },
  correrB:   { torso: 22, cabeza: -10, hC: -40, cC: 70, hL: 75, cL: 100, pC: -40, rC: -70, pL: 55, rL: -20, cy: -6 },
  impulso:   { torso: 30, cabeza: -16, hC: -40, cC: 40, hL: -55, cL: 40, pC: 55, rC: -60, pL: -45, rL: -40, cy: -10 },
  despegue:  { torso: 2, cabeza: -6, hC: 140, cC: 20, hL: 120, cL: 30, pC: 6, rC: -4, pL: -10, rL: -6, cy: 0 },
  salto:     { torso: 4, cabeza: 0, hC: 80, cC: 110, hL: 60, cL: 120, pC: 70, rC: -100, pL: 20, rL: -110, cy: 0 },
  caida:     { torso: 4, cabeza: 2, hC: 75, cC: 55, hL: 55, cL: 70, pC: 22, rC: -34, pL: -8, rL: -22, cy: 0 },
  aterrizaje:{ torso: 16, cabeza: -8, hC: 55, cC: 100, hL: 30, cL: 100, pC: 62, rC: -105, pL: 8, rL: -70, cy: -16 },
  agachado:  { torso: 18, cabeza: -10, hC: 60, cC: 100, hL: 40, cL: 110, pC: 95, rC: -140, pL: 70, rL: -150, cy: -34 },
  bloqueo:   { torso: -4, cabeza: 6, hC: 120, cC: 130, hL: 105, cL: 135, pC: 12, rC: -18, pL: -18, rL: -16, cy: -6 },
  bloqueoBajo: { torso: 10, cabeza: 0, hC: 90, cC: 120, hL: 70, cL: 125, pC: 95, rC: -140, pL: 70, rL: -150, cy: -34 },
  parada:    { torso: -10, cabeza: 8, hC: 150, cC: 40, hL: 20, cL: 80, pC: 10, rC: -10, pL: -30, rL: -10, cy: -2 },
  esquiva:   { torso: -26, cabeza: 10, hC: 30, cC: 90, hL: 10, cL: 90, pC: 40, rC: -60, pL: -40, rL: -30, cy: -12 },
  carga:     { torso: 2, cabeza: -14, hC: 20, cC: 40, hL: 20, cL: 40, pC: 30, rC: -30, pL: -30, rL: -30, cy: -14 },
  transformacion: { torso: -6, cabeza: -24, hC: 120, cC: 20, hL: 120, cL: 20, pC: 24, rC: -10, pL: -24, rL: -10, cy: -4 },
  // reacciones al golpe según la altura del impacto: cabeza atrás, doblado por el estómago o rodilla que cede
  dano:      { torso: -22, cabeza: 18, hC: -30, cC: 40, hL: -50, cL: 30, pC: 10, rC: -20, pL: -20, rL: -20, cy: -4 },
  danoAlto:  { torso: -26, cabeza: 30, hC: -25, cC: 55, hL: -45, cL: 45, pC: 22, rC: -26, pL: -20, rL: -12, cy: -4, dx: -4 },
  danoMedio: { torso: 22, cabeza: 24, hC: 5, cC: 95, hL: -15, cL: 85, pC: 6, rC: -30, pL: -34, rL: -12, cy: -6, dx: -9 },
  danoBajo:  { torso: 10, cabeza: -4, hC: -20, cC: 60, hL: -40, cL: 55, pC: 48, rC: -92, pL: -22, rL: -12, cy: -10 },
  empujado:  { torso: -60, cabeza: 24, hC: -90, cC: 20, hL: -110, cL: 10, pC: 40, rC: -30, pL: 10, rL: -20, cy: 0 },
  derribado: { torso: -88, cabeza: 6, hC: -150, cC: 10, hL: -170, cL: 0, pC: 80, rC: -10, pL: 92, rL: 0, cy: -44 },
  levantarse:{ torso: 30, cabeza: -10, hC: 40, cC: 60, hL: 10, cL: 60, pC: 90, rC: -120, pL: 40, rL: -110, cy: -26 },
  victoria:  { torso: -4, cabeza: -14, hC: 170, cC: 10, hL: 30, cL: 100, pC: 10, rC: -8, pL: -12, rL: -8, cy: 0 },
  derrota:   { torso: 40, cabeza: 30, hC: 10, cC: 20, hL: 0, cL: 20, pC: 95, rC: -150, pL: 60, rL: -100, cy: -36 },
  // golpes: [preparación, golpe]. En el golpe, la extremidad que pega (GOLPEA) se apunta con cinemática inversa a su
  // hitbox, así el puño o el pie llega justo donde está la caja de daño.
  ligero:    [{ torso: 2, hC: 40, cC: 130 }, { torso: 12, hC: 90, cC: 4, hL: 30, cL: 120 }],
  ligero2:   [{ torso: 4, hL: 30, cL: 130 }, { torso: 14, hL: 92, cL: 6, hC: 50, cC: 120 }],
  medio:     [{ torso: -6, hC: 10, cC: 150 }, { torso: 24, hC: 96, cC: 2, hL: 10, cL: 120, dx: 6 }],
  fuerte:    [{ torso: -6, hC: 70, cC: 90, hL: 40, cL: 100, pC: 82, rC: -125 }, { torso: -16, pC: 100, rC: -4, hC: 30, cC: 90, hL: 10, cL: 100, dx: 10 }],
  bajoLigero:[{ pC: 75, rC: -120 }, { pC: 88, rC: -2 }],
  bajoMedio: [{ pC: 60, rC: -100, torso: 30 }, { pC: 92, rC: 0, torso: 34, dx: 10 }],
  lanzador:  [{ torso: 24, hC: -20, cC: 140, cy: -22 }, { torso: -10, hC: 175, cC: 10, cy: 4, dx: 4 }],
  impulsoFuerte: [{ torso: 30, hC: -30, cC: 120 }, { torso: 36, hC: 88, cC: 0, hL: -40, cL: 60, dx: 10 }],
  aereoLigero: [{ pC: 70, rC: -110 }, { pC: 80, rC: -10, torso: -10 }],
  aereoMedio: [{ hC: 30, cC: 140 }, { hC: 90, cC: 0, torso: 32 }],
  aereoFuerte: [{ torso: -10, hC: 170, cC: 40, hL: 160, cL: 40 }, { torso: 40, hC: 40, cC: 10, hL: 30, cL: 10 }],
  rompeGuardia: [{ torso: -20, hC: 140, cC: 60, hL: 130, cL: 60 }, { torso: 26, hC: 70, cC: 0, hL: 60, cL: 0, dx: 6 }],
  especial:  [{ torso: -8, hC: 20, cC: 140, hL: 10, cL: 150 }, { torso: 16, hC: 80, cC: 0, hL: 76, cL: 4 }],
  antiaereo: [{ torso: 20, hC: -10, cC: 150, cy: -24 }, { torso: -14, hC: 178, cC: 4, pC: 60, rC: -60, cy: 6 }],
  teleporte: [{ torso: 0, hC: 100, cC: 120 }, { torso: 0, hC: 100, cC: 120 }],
  embestida: [{ torso: 30, hC: 0, cC: 140 }, { torso: 42, hC: 80, cC: 20, hL: 70, cL: 30, dx: 8 }],
  cargado:   [{ torso: -10, hC: 60, cC: 140, hL: 50, cL: 140, cy: -10 }, { torso: 14, hC: 90, cC: 0, hL: 88, cL: 0, cy: -10 }],
  aereoEspecial: [{ hC: 40, cC: 140 }, { hC: 110, cC: 0, torso: 30 }],
  definitivo:[{ torso: -12, hC: 150, cC: 30, hL: 150, cL: 30, cy: -12 }, { torso: 20, hC: 90, cC: 0, hL: 90, cL: 0, cy: -8 }],
};
// qué extremidad pega en cada golpe: bC/bL brazo cercano/lejano, pC pierna cercana, bb los dos brazos
export const GOLPEA = { ligero: 'bC', ligero2: 'bL', medio: 'bC', fuerte: 'pC', bajoLigero: 'pC', bajoMedio: 'pC', lanzador: 'bC', impulsoFuerte: 'bC',
  aereoLigero: 'pC', aereoMedio: 'bC', aereoFuerte: 'bb', rompeGuardia: 'bb', antiaereo: 'bC', embestida: 'bb', aereoEspecial: 'pC' };
const CLAVES = ['torso', 'cabeza', 'hC', 'cC', 'hL', 'cL', 'pC', 'rC', 'pL', 'rL', 'cy', 'dx'];
const mezcla = (a, b, t) => { const o = {}; for (const k of CLAVES) o[k] = (a[k] ?? 0) + ((b[k] ?? a[k] ?? 0) - (a[k] ?? 0)) * t; return o; };
const suave = (t) => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
const lim1 = (v) => Math.max(-1, Math.min(1, v));
const DOS_PI = Math.PI * 2;

// Cinemática inversa de dos tramos (l1, l2) desde la base (bx, by) hacia el objetivo (tx, ty), en unidades con y hacia
// arriba. s = +1 dobla la articulación hacia adelante/arriba (rodilla), −1 hacia abajo (codo). Si no alcanza, estira
// la extremidad apuntando al objetivo. Devuelve los ángulos absolutos de los dos tramos en grados.
export function ik(bx, by, tx, ty, l1, l2, s = 1) {
  const dx = tx - bx, dy = ty - by, th = Math.atan2(dx, -dy);
  const D = Math.max(Math.abs(l1 - l2) + 0.5, Math.min(l1 + l2 - 0.01, Math.hypot(dx, dy)));
  const a = Math.acos(lim1((l1 * l1 + D * D - l2 * l2) / (2 * l1 * D))), b = Math.acos(lim1((l2 * l2 + D * D - l1 * l1) / (2 * l2 * D)));
  return [(th + s * a) / K, (th - s * b) / K];
}
// Puntos del esqueleto (unidades, y hacia arriba, cadera en x = 0). Sirve para apuntar, para apoyar los pies y para las
// pruebas (la punta del golpe tiene que caer dentro de su hitbox).
export function puntos(p) {
  const H = 56 + (p.cy || 0), t = p.torso * K, A = LARGOS, dx = p.dx || 0;
  const cad = { x: dx, y: H }, hom = { x: dx + Math.sin(t) * A.hombro, y: H + Math.cos(t) * A.hombro };
  const seg = (b, ang, l) => ({ x: b.x + Math.sin(ang * K) * l, y: b.y - Math.cos(ang * K) * l });
  const brazo = (h, c) => { const e = seg(hom, h + p.torso, A.brazo); return seg(e, h + c + p.torso, A.ante); };
  const pierna = (q, r) => { const k = seg(cad, q, A.muslo); return seg(k, q + r, A.pierna); };
  return { cad, hom, manoC: brazo(p.hC, p.cC), manoL: brazo(p.hL, p.cL), pieC: pierna(p.pC, p.rC), pieL: pierna(p.pL, p.rL) };
}
// sube o baja la cadera para que el pie más bajo apoye en el suelo (la suela queda justo en la línea)
export function apoyar(p, soloPierna = null) {
  const prof = (q, r) => Math.cos(q * K) * LARGOS.muslo + Math.cos((q + r) * K) * LARGOS.pierna;
  const d = soloPierna === 'C' ? prof(p.pC, p.rC) : soloPierna === 'L' ? prof(p.pL, p.rL) : Math.max(prof(p.pC, p.rC), prof(p.pL, p.rL));
  p.cy = Math.max(6, d) + SUELA - 56; return p;
}
// apunta la extremidad que golpea a la hitbox del movimiento (en unidades del esqueleto)
function apuntar(p, quien, m, u, enSuelo) {
  const b = m.caja; if (!b || !quien) return p;
  if (enSuelo) apoyar(p, quien === 'pC' ? 'L' : null);
  const al = m._alcance || 1, w = b.w * al;
  const vertical = b.h > w * 1.2;   // gancho hacia arriba: apunta a la parte alta de la caja
  const tx = (vertical ? b.x + w * 0.6 : b.x + w - 7) * u, ty = (vertical ? b.y + b.h - 10 : b.y + b.h / 2) * u;
  const P = puntos(p);
  if (quien === 'pC') { const [a1, a2] = ik(P.cad.x, P.cad.y, tx, ty, LARGOS.muslo, LARGOS.pierna, 1); p.pC = a1; p.rC = a2 - a1; return p; }
  for (const lado of quien === 'bb' ? ['C', 'L'] : [quien[1]]) {
    const [a1, a2] = ik(P.hom.x, P.hom.y, tx, ty + (quien === 'bb' && lado === 'L' ? 6 : 0), LARGOS.brazo, LARGOS.ante, -1);
    p['h' + lado] = a1 - p.torso; p['c' + lado] = a2 - a1;
  }
  return p;
}
// Caminar y correr con los pies PLANTADOS: la fase avanza con la distancia recorrida (no con el reloj), el pie de apoyo
// retrocede exactamente lo que avanza el cuerpo y el otro pie viaja por el aire. Caminar hacia atrás invierte la fase.
const ANDAR = { caminar: { H: 52, rango: 40, apoyo: 0.6, alza: 9, torso: 8, brazos: 8 }, correr: { H: 49, rango: 56, apoyo: 0.4, alza: 20, torso: 20, brazos: 34 } };
export const CICLO = { caminar: ANDAR.caminar.rango / ANDAR.caminar.apoyo, correr: ANDAR.correr.rango / ANDAR.correr.apoyo };   // unidades por ciclo (dos pasos)
function andar(tipo, fase) {
  const A = ANDAR[tipo], g = POSES.guardia;
  const p = { ...g, torso: A.torso, cabeza: tipo === 'correr' ? -10 : -4 };
  const H = A.H + Math.cos(fase * DOS_PI * 2) * (tipo === 'correr' ? 2.5 : 1.2);
  p.cy = H - 56;
  for (const [lado, desf] of [['C', 0], ['L', 0.5]]) {
    const f = ((fase + desf) % 1 + 1) % 1;
    let x, y;
    if (f < A.apoyo) { x = A.rango / 2 - (f / A.apoyo) * A.rango; y = SUELA; }
    else { const k = (f - A.apoyo) / (1 - A.apoyo); x = -A.rango / 2 + suave(k) * A.rango; y = SUELA + Math.sin(k * Math.PI) * A.alza; }
    const [a1, a2] = ik(0, H, x, y, LARGOS.muslo, LARGOS.pierna, 1);
    p['p' + lado] = a1; p['r' + lado] = a2 - a1;
  }
  // los brazos se balancean al revés que las piernas, con la guardia arriba al caminar
  const osc = Math.sin(fase * DOS_PI) * A.brazos;
  p.hC = (tipo === 'correr' ? 40 : g.hC) - osc; p.hL = (tipo === 'correr' ? 40 : g.hL) + osc;
  if (tipo === 'correr') { p.cC = 95; p.cL = 95; }
  return p;
}

// pose objetivo de un luchador en este instante (L = luchador de combate.js). tiempo: segundos de SIMULACIÓN para lo
// procedural (respiración). extra.fase: ciclos de paso recorridos (los lleva el render con la distancia caminada).
export function poseDe(L, tiempo = 0, anim = {}, extra = {}) {
  const P = { ...POSES, ...anim }, g = P.guardia, e = L.estado;
  const u = ESCALA / (L.alto || L.def?.alto || 116);   // píxeles del mundo → unidades del esqueleto
  const enSuelo = L.suelo !== false && (L.y || 0) <= 0.5;
  const fin = (p) => (enSuelo && e !== 'derribado' && e !== 'derrota' ? apoyar(p) : p);
  if (L.mov && ['ataqueLigero', 'ataqueMedio', 'ataqueFuerte', 'ataqueAereo', 'combo', 'especial', 'definitivo'].includes(e)) {
    const m = L.mov, par = P[m.id] || P[m.tipo] || P.medio, base = m.aire ? P.salto : m.bajo ? P.agachado : g;
    const prep = { ...base, ...par[0] }, k = L.movF;
    let golpe = { ...base, ...par[1] };
    if (!m.proyectil && !m.rayo && !m.onda && m.tipo !== 'definitivo') golpe = apuntar(golpe, P[m.id] ? GOLPEA[m.id] : null, { ...m, _alcance: (L.def?.alcance || 1) }, u, enSuelo);
    if (k < m.arranque) return fin(mezcla(base, prep, suave(k / Math.max(1, m.arranque))));
    if (k < m.arranque + m.activo) return fin(golpe);
    return fin(mezcla(golpe, base, suave((k - m.arranque - m.activo) / Math.max(1, m.recuperacion))));
  }
  const fase = extra.fase ?? (L.x || 0) / (CICLO.caminar / u);
  const f = L.f || 0, dur = Math.max(1, L.durEstado || 1);
  switch (e) {
    case 'caminar': return andar('caminar', fase);
    case 'correr': return andar('correr', extra.faseCorrer ?? fase * CICLO.caminar / CICLO.correr);
    case 'reposo': { const r = { ...g }; r.cy += Math.sin(tiempo * 3.2) * 1.5; r.torso += Math.sin(tiempo * 3.2) * 1.5; r.hC += Math.sin(tiempo * 3.2 + 1) * 2; return fin(r); }
    case 'aterrizaje': return fin(mezcla(P.aterrizaje, g, suave(f / 6)));
    case 'impulso': return fin({ ...P.impulso });
    case 'bloqueo': case 'aturdidoBloqueo': { const b = { ...(L.agachaBloqueo ? P.bloqueoBajo : P.bloqueo) }; if (e === 'aturdidoBloqueo' && f < 4) b.torso -= 6 - f; return fin(b); }
    case 'salto': return f < 4 ? mezcla(P.despegue, P.salto, f / 4) : L.vy > 2 ? P.salto : mezcla(P.salto, P.caida, suave((2 - L.vy) / 6));
    case 'caida': return L.voló ? P.empujado : P.caida;
    case 'aturdido': {
      if (!enSuelo) return P.empujado;
      const r = L.reaccion || {}, pose = r.zona === 'alto' ? P.danoAlto : r.zona === 'bajo' ? P.danoBajo : P.danoMedio;
      const amp = (r.fuerza ?? 0.8) * (1 - 0.85 * suave(f / dur));   // golpe seco al recibir, vuelve a la guardia al final
      return fin(mezcla(g, pose, amp));
    }
    case 'levantarse': return fin(f < dur * 0.55 ? mezcla(P.derribado, P.levantarse, suave(f / (dur * 0.55))) : mezcla(P.levantarse, g, suave((f - dur * 0.55) / (dur * 0.45))));
    case 'derribado': return P.derribado;
    case 'carga': { const r = { ...P.carga }; r.cy += Math.sin(tiempo * 20) * 0.8; return fin(r); }
    default: return fin({ ...(P[e] || g) });
  }
}
// suavizado entre la pose anterior y la objetivo (interpolación visual entre cuadros)
export function acercar(actual, objetivo, k = 0.45) { if (!actual) return { ...objetivo }; for (const c of CLAVES) actual[c] += ((objetivo[c] ?? 0) - actual[c]) * k; return actual; }

// Dibuja el luchador en un contexto 2D de canvas (p5: drawingContext). x, y: pies en píxeles de pantalla; alto: px.
// cuerpo: colores y detalles del personaje; dir: 1 derecha / -1 izquierda.
// luz (del escenario): { dx, dy } hacia la luz principal, rim (contraluz), sombra, amb + ambK (luz de ambiente).
// Con luz, cada tramo lleva sombreado de celuloide (una banda de sombra del lado contrario a la luz) y un filo de
// contraluz del lado de la luz; la cabeza, una media luna de sombra. Nada de esto cambia la geometría: los largos y
// los ángulos son los mismos que usan las pruebas de alcance (el puño sigue cayendo dentro de su hitbox).
// Sin ctx.filter: el destello y el «cuerpo de sombra» mezclan los colores (un filtro por cuerpo cuesta caro en GPU
// por software).
export function dibujarLuchador(ctx, pose, { x, y, alto, dir = 1, cuerpo = {}, contorno = '#120d1c', destello = 0, alfa = 1, aura = null, t = 0, apoyo = false, luz = null }) {
  // apoyo: está en el suelo → la cadera se recoloca para que el pie más bajo pise la línea (tras el suavizado)
  if (apoyo) pose = apoyar({ ...pose });
  const s = alto / ESCALA, L = (n) => n * s;
  const largo = { torso: L(40), cuello: L(6), cabeza: L(15), brazo: L(22), ante: L(21), muslo: L(28), pierna: L(28) };
  const ladoCerca = dir > 0 ? 'izq' : 'der';   // mirando a la derecha, la cámara ve el lado izquierdo del cuerpo
  ctx.save(); ctx.globalAlpha = alfa; ctx.translate(x, y); ctx.scale(dir, 1);
  const lx = luz ? luz.dx * dir : 0, ly = luz ? luz.dy : 0;   // la luz en coordenadas del cuerpo (que está espejado)
  // tono final de un color: luz de ambiente del escenario, cuerpo de sombra (ecos) y destello del golpe
  const tono = (c) => { if (luz) c = mezclar(c, luz.amb, luz.ambK); if (cuerpo.sombra) c = mezclar(c, '#241d3c', 0.38); if (destello > 0) c = mezclar(c, '#ffffff', Math.min(0.85, destello * 0.8)); return c; };
  const sombraDe = (c) => mezclar(mezclar(c, '#000000', 0.36), luz.sombra, 0.34);
  const cad = { x: L(pose.dx || 0), y: -(L(56) + L(pose.cy)) };
  const rot = (p, ang, l) => ({ x: p.x + Math.sin(ang * K) * l, y: p.y + Math.cos(ang * K) * l });
  const tor = pose.torso * K, cuelloP = { x: cad.x + Math.sin(tor) * largo.torso, y: cad.y - Math.cos(tor) * largo.torso };
  const cabezaP = { x: cuelloP.x + Math.sin(tor + pose.cabeza * K) * (largo.cuello + largo.cabeza), y: cuelloP.y - Math.cos(tor + pose.cabeza * K) * (largo.cuello + largo.cabeza) };
  const hombro = { x: cuelloP.x - Math.sin(tor) * L(4), y: cuelloP.y + Math.cos(tor) * L(4) };
  const brazo = (h, c) => { const a = rot(hombro, h + pose.torso, largo.brazo), b = rot(a, h + pose.torso + c, largo.ante); return [hombro, a, b]; };
  const pierna = (p, r) => { const a = rot(cad, p, largo.muslo), b = rot(a, p + r, largo.pierna); return [cad, a, b]; };
  const col = { piel: '#f0c9a0', pelo: '#222', ropa: '#3b4a9a', ropa2: '#eee', acento: '#ffd94a', cinta: '#ffd94a', ...cuerpo };
  // trazo de una extremidad: anchos por tramo (el muslo más grueso que la pierna, el brazo más que el antebrazo).
  // Primero el contorno de todos los tramos y después el relleno: la rodilla y el codo no muestran una línea interior.
  const trazo = (pts, anchoT, color, fondo = false) => {
    const an = (i) => (Array.isArray(anchoT) ? anchoT[Math.min(anchoT.length - 1, i)] : anchoT);
    const tramo = (i, dx = 0, dy = 0) => { ctx.beginPath(); ctx.moveTo(pts[i].x + dx, pts[i].y + dy); ctx.lineTo(pts[i + 1].x + dx, pts[i + 1].y + dy); };
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = contorno; for (let i = 0; i < pts.length - 1; i++) { tramo(i); ctx.lineWidth = an(i) + L(4.5); ctx.stroke(); }
    const base = tono(fondo ? oscurecer(color, 0.74) : color);
    ctx.strokeStyle = base; for (let i = 0; i < pts.length - 1; i++) { tramo(i); ctx.lineWidth = an(i); ctx.stroke(); }
    if (!luz) { if (!fondo) { ctx.strokeStyle = 'rgba(255,255,255,.22)'; for (let i = 0; i < pts.length - 1; i++) { const w = an(i); tramo(i, -w * 0.18, 0); ctx.lineWidth = w * 0.28; ctx.stroke(); } } return; }
    // banda de sombra (celuloide) del lado contrario a la luz y filo de contraluz del lado de la luz, tramo a tramo
    const som = sombraDe(base), rim = fondo ? mezclar(base, luz.rim, 0.45) : luz.rim;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1], w = an(i); let nx = a.y - b.y, ny = b.x - a.x; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l; if (nx * lx + ny * ly < 0) { nx = -nx; ny = -ny; }
      tramo(i, -nx * w * 0.28, -ny * w * 0.28); ctx.strokeStyle = som; ctx.lineWidth = w * 0.44; ctx.stroke();
      tramo(i, nx * w * 0.39, ny * w * 0.39); ctx.strokeStyle = rim; ctx.lineWidth = Math.max(0.8, w * 0.1); ctx.stroke();
    }
  };
  // bloque con volumen (torso, cadera): relleno de sombra, la parte iluminada corrida hacia la luz, filo de contraluz
  // por dentro y contorno. pts: polígono en coordenadas del cuerpo.
  const bloque = (pts, color) => {
    const base = tono(color), camino = (dx = 0, dy = 0) => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x + dx, p.y + dy) : ctx.moveTo(p.x + dx, p.y + dy))); ctx.closePath(); };
    camino(); ctx.fillStyle = luz ? sombraDe(base) : base; ctx.fill();
    if (luz) { ctx.save(); camino(); ctx.clip(); camino(lx * L(6), ly * L(6)); ctx.fillStyle = base; ctx.fill(); camino(lx * L(2.4), ly * L(2.4)); ctx.strokeStyle = luz.rim; ctx.lineWidth = L(2.6); ctx.stroke(); ctx.restore(); }
    camino(); ctx.strokeStyle = contorno; ctx.lineWidth = L(3.4); ctx.lineJoin = 'round'; ctx.stroke();
  };
  if (aura) auraLlamas(ctx, cad, L, aura, t);
  const bL = brazo(pose.hL, pose.cL), bC = brazo(pose.hC, pose.cC), pL = pierna(pose.pL, pose.rL), pC = pierna(pose.pC, pose.rC);
  // lejos (detrás del torso)
  trazo(pL, [L(13.5), L(11)], col.ropa, true); trazo([pL[2], { x: pL[2].x + L(8), y: pL[2].y }], L(9), col.ropa2, true);
  trazo(bL, [L(9.5), L(8.5)], col.piel, true);
  if (cuerpo.hombrera && cuerpo.hombrera !== ladoCerca) hombrera(ctx, bL[0], L, col, contorno, true, tono);
  // torso
  // torso en V (pecho más ancho que la cintura), cadera del color del pantalón y una faja con sus puntas al viento
  const ax = Math.sin(tor), ay = -Math.cos(tor), qx = -ay, qy = ax, P = (k, d) => ({ x: cad.x + ax * L(k) + qx * L(d), y: cad.y + ay * L(k) + qy * L(d) });
  bloque([P(-5, -12), P(-5, 12), P(8, 12.5), P(8, -12.5)], col.ropa);
  bloque([P(4, -11.5), P(4, 11.5), P(27, 15), P(37, 13), P(41, 7), P(41, -7), P(37, -12.5), P(27, -14)], col.ropa);
  if (luz) { ctx.strokeStyle = sombraDe(tono(col.ropa)); ctx.lineWidth = L(1.6); ctx.beginPath(); const a = P(30, 2), b = P(16, 4); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo(P(24, 7).x, P(24, 7).y, b.x, b.y); ctx.stroke(); }
  bloque([P(3, -12.2), P(3, 12.2), P(9, 12.6), P(9, -12.6)], col.ropa2);
  { const n = P(6, -11), sw = Math.sin(t * 6) * L(2.5); ctx.lineCap = 'round'; for (const [k, d] of [[0, 1], [3, 0.8]]) { ctx.strokeStyle = contorno; ctx.lineWidth = L(5.2); ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.quadraticCurveTo(n.x - L(5 + k), n.y + L(6), n.x - L(9 + k) + sw * d, n.y + L(15 - k)); ctx.stroke(); ctx.strokeStyle = tono(col.cinta); ctx.lineWidth = L(2.8); ctx.stroke(); } }
  // cabeza: media luna de sombra del lado contrario a la luz y filo de contraluz
  const hr = largo.cabeza, piel = tono(col.piel);
  ctx.fillStyle = luz ? sombraDe(piel) : piel; ctx.beginPath(); ctx.arc(cabezaP.x, cabezaP.y, hr, 0, Math.PI * 2); ctx.fill();
  if (luz) {
    ctx.save(); ctx.clip(); ctx.fillStyle = piel; ctx.beginPath(); ctx.arc(cabezaP.x + lx * hr * 0.42, cabezaP.y + ly * hr * 0.42, hr * 1.02, 0, Math.PI * 2); ctx.fill();
    const an = Math.atan2(ly, lx); ctx.strokeStyle = luz.rim; ctx.lineWidth = hr * 0.2; ctx.beginPath(); ctx.arc(cabezaP.x, cabezaP.y, hr * 0.94, an - 0.75, an + 0.75); ctx.stroke(); ctx.restore();
  }
  ctx.strokeStyle = contorno; ctx.lineWidth = L(3.5); ctx.beginPath(); ctx.arc(cabezaP.x, cabezaP.y, hr, 0, Math.PI * 2); ctx.stroke();
  pelo(ctx, cabezaP, hr, { ...col, pelo: tono(col.pelo) }, contorno, cuerpo.peinado, L, t);
  if (luz) { const an = Math.atan2(ly, lx); ctx.strokeStyle = mezclar(tono(col.pelo), luz.rim, 0.6); ctx.lineWidth = L(2.2); ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(cabezaP.x, cabezaP.y - hr * 0.1, hr * 0.9, an - 0.42, an + 0.2); ctx.stroke(); }
  // ojo anime (blanco, iris, brillo) y ceño: solo del lado que mira al rival
  const ex = cabezaP.x + hr * 0.46, ey = cabezaP.y - L(1);
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(ex, ey, L(2.7), L(3.5), 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = contorno; ctx.lineWidth = L(1); ctx.stroke();
  ctx.fillStyle = cuerpo.sombra ? '#b7a9ff' : oscurecer(col.ojos || col.acento, 0.55); ctx.beginPath(); ctx.ellipse(ex + L(0.7), ey + L(0.3), L(1.8), L(2.7), 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = contorno; ctx.beginPath(); ctx.ellipse(ex + L(0.9), ey + L(0.5), L(0.9), L(1.5), 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(ex + L(1.3), ey - L(0.9), L(0.75), 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = contorno; ctx.lineWidth = L(2.2); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cabezaP.x + hr * 0.16, cabezaP.y - L(6.2)); ctx.lineTo(cabezaP.x + hr * 0.78, cabezaP.y - L(4.4)); ctx.stroke();
  if (cuerpo.cintaFrente) { ctx.strokeStyle = tono(col.cinta); ctx.lineWidth = L(4); ctx.beginPath(); ctx.arc(cabezaP.x, cabezaP.y, hr * 0.92, Math.PI * 1.05, Math.PI * 1.9); ctx.stroke(); cinta(ctx, { x: cabezaP.x - hr * 0.9, y: cabezaP.y - L(4) }, tono(col.cinta), L, t); }
  // cerca (delante)
  trazo(pC, [L(14.5), L(11.5)], col.ropa); trazo([pC[2], { x: pC[2].x + L(9), y: pC[2].y }], L(10), col.ropa2);
  trazo(bC, [L(10.5), L(9.2)], col.piel);
  ctx.fillStyle = piel; ctx.beginPath(); ctx.arc(bC[2].x, bC[2].y, L(6), 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = contorno; ctx.lineWidth = L(2.5); ctx.stroke();
  if (luz) { const an = Math.atan2(ly, lx); ctx.strokeStyle = luz.rim; ctx.lineWidth = L(1.4); ctx.beginPath(); ctx.arc(bC[2].x, bC[2].y, L(4.6), an - 0.9, an + 0.9); ctx.stroke(); }
  if (cuerpo.hombrera && cuerpo.hombrera === ladoCerca) hombrera(ctx, bC[0], L, col, contorno, false, tono, luz && { lx, ly, rim: luz.rim });
  ctx.restore();
  // emblema sin espejar (texto legible a ambos lados)
  if (cuerpo.emblema) { ctx.save(); ctx.font = `900 ${L(12)}px system-ui`; ctx.fillStyle = col.acento; ctx.textAlign = 'center'; ctx.fillText(cuerpo.emblema, x + dir * (cuelloP.x + cad.x) / 2, y + (cuelloP.y + cad.y) / 2 + L(4)); ctx.restore(); }
  return { mano: { x: x + dir * bC[2].x, y: y + bC[2].y }, pie: { x: x + dir * pC[2].x, y: y + pC[2].y }, cabeza: { x: x + dir * cabezaP.x, y: y + cabezaP.y } };
}
// Aura de energía: lenguas de fuego que suben por los dos costados del cuerpo (aditivo). Dos pasadas (color y núcleo
// claro), cada una es UN solo relleno: barato aunque el aura esté siempre encendida.
function auraLlamas(ctx, cad, L, color, t) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(cad.x, cad.y - L(10), L(8), cad.x, cad.y - L(10), L(84)); g.addColorStop(0, color + '40'); g.addColorStop(0.6, color + '18'); g.addColorStop(1, color + '00');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(cad.x, cad.y - L(8), L(58), L(92), 0, 0, Math.PI * 2); ctx.fill();
  for (const [k, fill] of [[1, color + '66'], [0.62, 'rgba(255,255,255,.26)']]) {
    ctx.fillStyle = fill; ctx.beginPath();
    for (const sd of [-1, 1]) for (let j = 0; j < 6; j++) {
      const u = j / 5, by = -u * L(118) * k - L(4), bx = cad.x + sd * (L(19) + Math.sin(u * 3.1) * L(6)) * k, w = L(9) * k * (1.1 - u * 0.4);
      const h = L(22 + 16 * u) * k * (0.75 + 0.35 * Math.sin(t * 9 + j * 1.9 + sd * 2.3)), sw = Math.sin(t * 6 + j * 2.1 + sd) * L(5);
      ctx.moveTo(bx - w, by); ctx.quadraticCurveTo(bx - w * 0.4 + sd * L(2), by - h * 0.6, bx + sd * L(7) * k + sw, by - h); ctx.quadraticCurveTo(bx + w * 0.6, by - h * 0.5, bx + w, by); ctx.closePath();
    }
    const h = L(34) * k * (0.8 + 0.25 * Math.sin(t * 8)), top = -L(124) * k; ctx.moveTo(cad.x - L(12) * k, top + L(8)); ctx.quadraticCurveTo(cad.x, top - h * 0.6, cad.x + Math.sin(t * 5) * L(6), top - h); ctx.quadraticCurveTo(cad.x + L(4), top - h * 0.4, cad.x + L(12) * k, top + L(8)); ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}
function hombrera(ctx, p, L, col, contorno, atras, tono = (c) => c, luz = null) {
  ctx.fillStyle = tono(atras ? oscurecer(col.acento, 0.7) : col.acento); ctx.strokeStyle = contorno; ctx.lineWidth = L(3); ctx.beginPath(); ctx.ellipse(p.x, p.y + L(2), L(11), L(8), -0.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  if (luz) { const an = Math.atan2(luz.ly, luz.lx); ctx.strokeStyle = luz.rim; ctx.lineWidth = L(1.8); ctx.beginPath(); ctx.ellipse(p.x, p.y + L(2), L(8.5), L(5.5), -0.3, an - 0.9, an + 0.9); ctx.stroke(); }
}
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
