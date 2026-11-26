// Forja · Anime Battle Engine · dibujo con p5.js (modo 2D: se usa su drawingContext, el canvas 2D de siempre).
// Escenarios procedurales en capas con paralaje (se pintan UNA vez a lienzos fuera de pantalla), luchadores articulados
// o con la hoja de sprites del estudio, jefe, avisos telegrafiados, proyectiles, estelas, postimágenes y cajas de
// depuración. Interpola posiciones con alfa del bucle de paso fijo (sin tirones aunque la pantalla vaya a 144 Hz).
import { poseDe, acercar, dibujarLuchador, oscurecer } from './esqueleto.js';
import { crearRuido } from '../nucleo/ruido.js';
import { ESTADOS } from './estados.js';

export const ANCHO = 960, ALTO = 540, SUELO = 468;
export const TEMAS = {
  noche:  { cielo: ['#0b0c24', '#2b1d4f', '#5a2f63'], lejos: '#1a1636', medio: '#251f47', suelo: '#2a2238', linea: '#7fd4ff', luna: true, estrellas: true, ventanas: '#ffd94a' },
  dojo:   { cielo: ['#3b2a22', '#6b4a33', '#a37a52'], lejos: '#5a3f2c', medio: '#7a5638', suelo: '#8f6a45', linea: '#f3d9a4', papel: true },
  puerto: { cielo: ['#1c2a44', '#3c5a7a', '#e39a6a'], lejos: '#2a3a52', medio: '#33465e', suelo: '#3b3f4a', linea: '#ffb35a', gruas: true },
  azotea: { cielo: ['#060914', '#141c3c', '#2a3d6e'], lejos: '#0f1730', medio: '#172244', suelo: '#262a3a', linea: '#9fe3ff', estrellas: true, ventanas: '#9fe3ff', lluvia: true },
  templo: { cielo: ['#2a1f2e', '#5a3d4a', '#c78a5a'], lejos: '#3d2d3c', medio: '#4d3a44', suelo: '#5d4c48', linea: '#ffd27a', montes: true, columnas: true },
  bosque: { cielo: ['#12261e', '#25523d', '#8cc08a'], lejos: '#1d3a2c', medio: '#2a4f39', suelo: '#3c5a3a', linea: '#c6ff4a', arboles: true },
};

export function crearRender(s, { tema = 'noche', semilla = 9, acc, fx, cuerpos = {}, sprites = {}, mostrarCajas = false, postimagenes = true, estelas: conEstelas = true, zoomFijo = false, zoomMax = 1.15 }) {
  const ctx = s.drawingContext, R = crearRuido(semilla);
  const cam = { x: 0, zoom: 1, px: 0, pzoom: 1, y: 0 };
  const capas = pintarFondo(tema, R);
  const poses = new Map(), estelas = new Map(), fantasmas = new Map(), grietas = [];
  const r = { cam, mostrarCajas, tema, capas, cuadro: 0, dibujos: 0 };
  const aPant = (wx, wy, wz = 0) => [(wx - cam.x) * cam.zoom + ANCHO / 2, SUELO - (wy + wz * 0.35) * cam.zoom + cam.y];
  r.aPant = aPant;
  r.cambiarTema = (t) => { r.tema = t; Object.assign(capas, pintarFondo(t, R)); };

  // cámara: sigue el punto medio de los activos y ajusta el zoom a la distancia; el director la toma en cinemáticas
  r.camara = (c, director, alfa) => {
    const act = [...c.luchadores, ...c.extras].filter((l) => l.activo && (!l.ko || l.f < 120));
    let xs = act.map((l) => l.px + (l.x - l.px) * alfa); if (!xs.length) xs = [0];
    const jefe = act.find((l) => l.tipo === 'jefe');
    let objetivoX = (Math.min(...xs) + Math.max(...xs)) / 2, dist = Math.max(...xs) - Math.min(...xs);
    if (jefe) { const yo = act.find((l) => l.tipo !== 'jefe'); objetivoX = yo ? (yo.x * 0.6 + jefe.x * 0.4) : jefe.x; dist = Math.max(dist, 700); }
    let z = zoomFijo ? 1 : Math.max(0.72, Math.min(zoomMax, 760 / (dist + 380)));
    if (director?.activa) { objetivoX = director.cam.foco; z = director.cam.zoom; }
    const lim = c.limites, medio = ANCHO / 2 / z;
    objetivoX = Math.max(lim.izq + medio - 60, Math.min(lim.der - medio + 60, objetivoX));
    if (lim.der - lim.izq < ANCHO / z) objetivoX = (lim.izq + lim.der) / 2;
    const k = director?.activa ? 0.5 : 0.12;
    cam.x += (objetivoX - cam.x) * k; cam.zoom += (z - cam.zoom) * k;
    const sac = (fx?.sacudida || 0) + (director?.cam.sacudida || 0);
    cam.y = sac ? (Math.sin(r.cuadro * 1.7) * sac * 0.6) : 0; r.sacX = sac ? Math.cos(r.cuadro * 2.3) * sac : 0;
    if (director?.cam.sacudida) director.cam.sacudida *= 0.9;
  };

  r.dibujar = (c, partida, alfa, t) => {
    r.cuadro++; r.dibujos = 0;
    ctx.save(); ctx.setTransform(s.pixelDensity(), 0, 0, s.pixelDensity(), 0, 0); ctx.scale(s.width / ANCHO, s.height / ALTO);
    ctx.translate(r.sacX || 0, 0);
    fondo(ctx, capas, cam, partida.director, t);
    // grietas y obstáculos
    for (const g of grietas) { const [gx] = aPant(g.lado > 0 ? c.limites.der : c.limites.izq, 0); ctx.strokeStyle = 'rgba(255,240,200,.55)'; ctx.lineWidth = 3; ctx.beginPath(); for (const [i, p] of g.pts.entries()) i ? ctx.lineTo(gx + p[0], p[1]) : ctx.moveTo(gx + p[0], p[1]); ctx.stroke(); }
    for (const o of c.obstaculos) if (!o.roto) { const [ox, oy] = aPant(o.x, o.y + o.h); const w = o.w * cam.zoom, h = o.h * cam.zoom; ctx.fillStyle = o.color || '#6f6a7d'; ctx.strokeStyle = '#120d1c'; ctx.lineWidth = 3; ctx.fillRect(ox, oy, w, h); ctx.strokeRect(ox, oy, w, h); const d = 1 - o.vida / 120; if (d > 0.2) { ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.beginPath(); ctx.moveTo(ox + w * 0.3, oy); ctx.lineTo(ox + w * 0.5, oy + h * d); ctx.lineTo(ox + w * 0.7, oy + h * d * 0.6); ctx.stroke(); } }
    const todos = [...c.luchadores, ...c.extras].filter((l) => l.activo);
    // avisos del jefe (debajo de todo lo demás)
    for (const J of todos) if (J.tipo === 'jefe') avisos(ctx, J, aPant, cam, t);
    // sombras
    for (const L of todos) { const x = L.px + (L.x - L.px) * alfa, [sx, sy] = aPant(x, 0, L.z || 0); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(sx, sy + 2, (L.ancho * 0.7) * cam.zoom, 7 * cam.zoom, 0, 0, Math.PI * 2); ctx.fill(); }
    // orden de dibujo por profundidad (2.5D): lo de atrás primero
    for (const L of todos.sort((a, b) => (b.z || 0) - (a.z || 0))) {
      if (L.tipo === 'jefe') dibujarJefe(ctx, L, aPant, cam, t, alfa);
      else luchador(ctx, L, c, alfa, t);
    }
    for (const p of c.proyectiles) proyectil(ctx, p, aPant, cam, t, alfa);
    // rayo del movimiento cargado
    for (const L of todos) if (L.mov?.rayo && L.movF >= L.mov.arranque && L.movF < L.mov.arranque + L.mov.activo) { const hb = c.hitbox(L); if (hb) { const [x0, y0] = aPant(L.dir > 0 ? hb.x : hb.x + hb.w, hb.y + hb.h / 2); fx.rayoEnergia(L.dir > 0 ? hb.x : hb.x + hb.w, hb.y + hb.h / 2, hb.w * L.dir, hb.h, { color: L.mov.rayo.color, dur: 0.05 }); void x0; void y0; } }
    fx.dibujar(ctx, (x, y) => aPant(x, y), cam.zoom);
    if (r.mostrarCajas) cajas(ctx, c, aPant);
    ctx.restore();
    ctx.save(); ctx.setTransform(s.pixelDensity(), 0, 0, s.pixelDensity(), 0, 0); ctx.scale(s.width / ANCHO, s.height / ALTO);
    if (partida.director?.activa) cinematica(ctx, partida.director, t);
    fx.dibujarPantalla(ctx, ANCHO, ALTO);
    ctx.restore();
  };
  r.grieta = (lado) => { const pts = []; let y = 80 + Math.random() * 0; for (let i = 0; i < 9; i++) { pts.push([(lado > 0 ? -1 : 1) * (6 + (i % 2) * 18 + i * 3), y]); y += 40; } grietas.push({ lado, pts }); if (grietas.length > 6) grietas.shift(); };

  function luchador(ctx, L, c, alfa, t) {
    const x = L.px + (L.x - L.px) * alfa, y = L.py + (L.y - L.py) * alfa, [sx, sy] = aPant(x, y, L.z || 0);
    const escala = cam.zoom * (1 - (L.z || 0) * 0.0012), alto = L.alto * escala;
    const cuerpo = { ...(cuerpos[L.def.id] || L.def.cuerpo || {}), ...(L.transformado?.colores || {}) };
    const aura = L.transformado ? (L.transformado.colores?.aura || L.def.efectos?.aura) : L.estado === 'carga' ? L.def.efectos?.aura : null;
    if (aura) fx.aura(x, y, L.alto, aura, t, L.estado === 'carga' ? 1.4 : 0.7);
    const invis = L.mov?.teleporta && L.movF < L.mov.arranque;
    const destello = L.pausa > 0 && ESTADOS[L.estado]?.sinControl ? 0.55 : L.estado === 'parada' && L.f < 6 ? 0.7 : 0;
    // postimágenes: guardan pose y posición en movimientos rápidos
    const fant = fantasmas.get(L.id) || []; fantasmas.set(L.id, fant);
    const rapido = ['impulso', 'correr', 'esquiva'].includes(L.estado) || L.mov?.avance > 6 || L.mov?.tipo === 'especial' || !!L.transformado;
    const pose = acercar(poses.get(L.id), poseDe(L, t, L.def.animaciones), L.pausa > 0 ? 1 : 0.5); poses.set(L.id, pose);
    if (postimagenes && rapido && r.cuadro % 3 === 0) { fant.push({ x: sx, y: sy, pose: { ...pose }, dir: L.dir, vida: 1 }); if (fant.length > 5) fant.shift(); }
    for (const f of fant) { f.vida -= 0.08; if (f.vida > 0) dibujarLuchador(ctx, f.pose, { x: f.x, y: f.y, alto, dir: f.dir, cuerpo: { ...cuerpo, sombra: false }, alfa: f.vida * 0.35, contorno: L.def.efectos?.estela || '#ffffff', t }); }
    while (fant.length && fant[0].vida <= 0) fant.shift();
    const spr = sprites[L.def.id];
    let ancla = null;
    if (invis) { /* teletransportándose: no se dibuja */ }
    else if (spr) ancla = dibujarSprite(ctx, spr, L, sx, sy, alto, destello, aura, t);
    else ancla = dibujarLuchador(ctx, pose, { x: sx, y: sy, alto, dir: L.dir, cuerpo, destello, aura, t });
    r.dibujos += 24;
    // estela del golpe: curva por las últimas posiciones de la mano/pie
    if (conEstelas && ancla && L.mov && L.movF >= L.mov.arranque - 1 && L.movF < L.mov.arranque + L.mov.activo + 2 && !L.mov.proyectil) {
      const e = estelas.get(L.id) || []; estelas.set(L.id, e); const pt = L.mov.tipo === 'fuerte' || L.mov.bajo || L.mov.aire ? ancla.pie : ancla.mano;
      e.push([pt.x, pt.y]); if (e.length > 6) e.shift();
      if (e.length > 2) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = L.def.efectos?.estela || '#ffffff'; ctx.lineCap = 'round'; for (let i = 1; i < e.length; i++) { ctx.globalAlpha = i / e.length * 0.8; ctx.lineWidth = i * 2.4 * cam.zoom; ctx.beginPath(); ctx.moveTo(e[i - 1][0], e[i - 1][1]); ctx.lineTo(e[i][0], e[i][1]); ctx.stroke(); } ctx.restore(); }
    } else estelas.delete(L.id);
  }
  function dibujarSprite(ctx, spr, L, sx, sy, alto, destello, aura, t) {
    const mapa = { reposo: 'quieto', bloqueo: 'quieto', carga: 'quieto', parada: 'quieto', aterrizaje: 'quieto', caminar: 'caminar', correr: 'correr', impulso: 'correr', salto: 'saltar', caida: 'saltar', agachado: 'agachado', aturdido: 'dano', aturdidoBloqueo: 'quieto', empujado: 'dano', derribado: 'morir', derrota: 'morir', victoria: 'celebrar', levantarse: 'agachado', esquiva: 'correr', transformacion: 'celebrar' };
    const anim = ESTADOS[L.estado]?.ataque ? 'golpe' : mapa[L.estado] || 'quieto', cuadros = spr.anim[anim] || spr.anim.quieto || Object.values(spr.anim)[0];
    let i; if (anim === 'golpe' && L.mov) i = Math.min(cuadros.length - 1, Math.floor(L.movF / Math.max(1, L.durEstado) * cuadros.length)); else i = Math.floor(t * 10) % cuadros.length;
    const f = cuadros[i], h = alto / (spr.relAlto || 0.8), w = h * f.w / f.h;
    ctx.save(); ctx.translate(sx, sy); ctx.scale(L.dir, 1);
    if (aura) { ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(0, -alto / 2, 10, 0, -alto / 2, alto * 0.8); g.addColorStop(0, aura + '99'); g.addColorStop(1, aura + '00'); ctx.fillStyle = g; ctx.fillRect(-alto, -alto * 1.4, alto * 2, alto * 1.6); ctx.globalCompositeOperation = 'source-over'; }
    if (destello) ctx.filter = `brightness(${(1 + destello * 2.2).toFixed(2)})`;
    ctx.drawImage(spr.imagen, f.x, f.y, f.w, f.h, -w / 2, -h * 0.96, w, h);
    ctx.filter = 'none';
    ctx.restore();
    return { mano: { x: sx + L.dir * alto * 0.35, y: sy - alto * 0.6 }, pie: { x: sx + L.dir * alto * 0.35, y: sy - alto * 0.2 }, cabeza: { x: sx, y: sy - alto * 0.9 } };
  }
  return r;
}

// ---------------------------------------------------------------- escenario
function lienzo(w, h) { const c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h }); return [c, c.getContext('2d')]; }
function pintarFondo(id, R) {
  const T = TEMAS[id] || TEMAS.noche, W = 2400;
  const [cielo, x0] = lienzo(ANCHO, ALTO), g = x0.createLinearGradient(0, 0, 0, ALTO);
  g.addColorStop(0, T.cielo[0]); g.addColorStop(0.6, T.cielo[1]); g.addColorStop(1, T.cielo[2]); x0.fillStyle = g; x0.fillRect(0, 0, ANCHO, ALTO);
  if (T.estrellas) { x0.fillStyle = '#fff'; for (let i = 0; i < 160; i++) { const a = (R.s2(i * 3.1, 7) + 1) / 2, b = (R.s2(9, i * 2.7) + 1) / 2; x0.globalAlpha = 0.3 + ((i * 37) % 10) / 14; x0.fillRect(a * ANCHO, b * ALTO * 0.55, i % 9 ? 1.5 : 2.5, i % 9 ? 1.5 : 2.5); } x0.globalAlpha = 1; }
  if (T.luna) { x0.fillStyle = '#fff6dd'; x0.beginPath(); x0.arc(ANCHO * 0.78, 92, 38, 0, Math.PI * 2); x0.fill(); x0.fillStyle = T.cielo[0]; x0.beginPath(); x0.arc(ANCHO * 0.78 + 14, 84, 34, 0, Math.PI * 2); x0.fill(); }
  const capa = (color, base, amp, frec, deco) => {
    const [c, x] = lienzo(W, ALTO); x.fillStyle = color; x.beginPath(); x.moveTo(0, ALTO);
    for (let i = 0; i <= W; i += 8) x.lineTo(i, base - (T.montes ? Math.abs(R.fbm2(i * frec, base, { octavas: 4 })) * amp * 2 : Math.floor((R.s2(Math.floor(i / 70) * 0.9, base) + 1) * amp)));
    x.lineTo(W, ALTO); x.closePath(); x.fill(); deco?.(x); return c;
  };
  const lejos = capa(T.lejos, 330, T.montes ? 110 : 70, T.montes ? 0.003 : 1, (x) => {
    if (T.ventanas) { x.fillStyle = T.ventanas; for (let i = 0; i < 380; i++) { const a = (R.s2(i * 1.7, 3) + 1) / 2, b = (R.s2(5, i * 1.3) + 1) / 2; x.globalAlpha = 0.35; x.fillRect(Math.floor(a * W / 9) * 9, 300 + b * 120, 3, 4); } x.globalAlpha = 1; }
  });
  const medio = capa(T.medio, 380, T.montes ? 60 : 46, T.montes ? 0.006 : 1, (x) => {
    if (T.gruas) { x.strokeStyle = '#1b2433'; x.lineWidth = 6; for (const gx of [300, 1100, 1900]) { x.beginPath(); x.moveTo(gx, 400); x.lineTo(gx, 170); x.lineTo(gx + 220, 170); x.moveTo(gx, 200); x.lineTo(gx + 160, 170); x.stroke(); } }
    if (T.columnas) { x.fillStyle = '#6a5660'; for (let i = 0; i < 9; i++) { const cx = 120 + i * 270, h = 120 + ((i * 53) % 90); x.fillRect(cx, 410 - h, 34, h); x.fillRect(cx - 8, 410 - h - 12, 50, 12); } }
    if (T.arboles) { x.fillStyle = '#183326'; for (let i = 0; i < 40; i++) { const cx = i * 64 + ((i * 29) % 30), h = 90 + ((i * 41) % 70); x.beginPath(); x.moveTo(cx, 410); x.lineTo(cx + 26, 410 - h); x.lineTo(cx + 52, 410); x.fill(); } }
    if (T.papel) { x.fillStyle = 'rgba(255,240,210,.18)'; for (let i = 0; i < 16; i++) { x.fillRect(40 + i * 150, 200, 120, 190); } x.strokeStyle = 'rgba(40,20,10,.5)'; x.lineWidth = 4; for (let i = 0; i < 16; i++) x.strokeRect(40 + i * 150, 200, 120, 190); }
  });
  const [suelo, xs] = lienzo(W, ALTO - SUELO + 80); xs.fillStyle = T.suelo; xs.fillRect(0, 0, W, ALTO); xs.strokeStyle = T.linea; xs.globalAlpha = 0.5; xs.lineWidth = 2; xs.beginPath(); xs.moveTo(0, 1); xs.lineTo(W, 1); xs.stroke();
  xs.globalAlpha = 0.12; for (let i = 0; i < W; i += 60) { xs.beginPath(); xs.moveTo(i, 0); xs.lineTo(i - 160, ALTO); xs.stroke(); } xs.globalAlpha = 1;
  return { cielo, lejos, medio, suelo, T, W };
}
function fondo(ctx, k, cam, director, t) {
  ctx.drawImage(k.cielo, 0, 0);
  const W = k.W, par = (img, f, y = 0) => { const off = ((cam.x * f) % W + W) % W; ctx.drawImage(img, -off - W / 2 + ANCHO / 2 - 600, y); ctx.drawImage(img, -off + W / 2 + ANCHO / 2 - 600, y); };
  par(k.lejos, 0.15); par(k.medio, 0.4);
  ctx.save(); const z = cam.zoom; ctx.translate(ANCHO / 2, SUELO + cam.y); ctx.scale(z, 1); const off = ((cam.x) % 60 + 60) % 60; ctx.drawImage(k.suelo, -W / 2 - off, 0); ctx.restore();
  if (k.T.lluvia) { ctx.save(); ctx.strokeStyle = 'rgba(180,210,255,.28)'; ctx.lineWidth = 1; ctx.beginPath(); for (let i = 0; i < 90; i++) { const x = ((i * 97 + t * 900) % ANCHO), y = ((i * 53 + t * 1400) % ALTO); ctx.moveTo(x, y); ctx.lineTo(x - 6, y + 16); } ctx.stroke(); ctx.restore(); }
  if (director?.activa && director.cam.fondo > 0) {   // cambio de fondo de la cinemática: viñeta de energía
    const d = director.actual?.def, a = director.cam.fondo; ctx.save(); ctx.globalAlpha = a * 0.85; const g = ctx.createRadialGradient(ANCHO / 2, ALTO / 2, 40, ANCHO / 2, ALTO / 2, ANCHO * 0.7); g.addColorStop(0, d?.color || '#fff'); g.addColorStop(0.35, '#1a1030'); g.addColorStop(1, '#05030a'); ctx.fillStyle = g; ctx.fillRect(0, 0, ANCHO, ALTO);
    ctx.globalAlpha = a * 0.5; ctx.strokeStyle = d?.color || '#fff'; ctx.lineWidth = 2; for (let i = 0; i < 36; i++) { const an = i / 36 * Math.PI * 2 + t * 0.6; ctx.beginPath(); ctx.moveTo(ANCHO / 2 + Math.cos(an) * 120, ALTO / 2 + Math.sin(an) * 120); ctx.lineTo(ANCHO / 2 + Math.cos(an) * 900, ALTO / 2 + Math.sin(an) * 900); ctx.stroke(); } ctx.restore();
  }
}
function cinematica(ctx, d, t) {
  const cam = d.cam, def = d.actual?.def; if (!def) return;
  // franjas de cine
  const h = 54 * Math.min(1, cam.fondo * 1.4); ctx.fillStyle = '#05030a'; ctx.fillRect(0, 0, ANCHO, h); ctx.fillRect(0, ALTO - h, ANCHO, h);
  if (cam.retrato > 0) {   // retrato dramático: banda diagonal con el color del golpe
    ctx.save(); ctx.globalAlpha = cam.retrato; ctx.translate((1 - cam.retrato) * -200, 0); ctx.fillStyle = def.color || '#fff';
    ctx.beginPath(); ctx.moveTo(0, 150); ctx.lineTo(ANCHO * 0.62, 110); ctx.lineTo(ANCHO * 0.58, 260); ctx.lineTo(0, 300); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#0b0912'; ctx.beginPath(); ctx.moveTo(0, 162); ctx.lineTo(ANCHO * 0.6, 124); ctx.lineTo(ANCHO * 0.565, 248); ctx.lineTo(0, 288); ctx.closePath(); ctx.fill();
    ctx.fillStyle = def.color || '#fff'; ctx.font = '900 13px system-ui'; ctx.fillText('ATAQUE DEFINITIVO', 60, 186); ctx.font = '900 34px system-ui'; ctx.fillStyle = '#ffffff'; ctx.fillText((d.actual?.ctx?.atacante?.nombre || '').toUpperCase(), 60, 228); ctx.restore();
  }
  ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.font = '600 12px system-ui'; ctx.textAlign = 'right'; ctx.fillText('Espacio / Enter: omitir', ANCHO - 16, ALTO - 18); ctx.textAlign = 'left';
}
function proyectil(ctx, p, aPant, cam, t, alfa) {
  const x = p.px + (p.x - p.px) * alfa, [sx, sy] = aPant(x, p.y, p.z || 0), r = p.w / 2 * cam.zoom;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 3; i >= 0; i--) { ctx.globalAlpha = 0.25 + (3 - i) * 0.2; ctx.fillStyle = i ? p.color : '#ffffff'; ctx.beginPath(); ctx.ellipse(sx - Math.sign(p.vx) * i * 10 * cam.zoom, sy, r * (1 - i * 0.12) * (1 + Math.sin(t * 30) * 0.06), r * 0.75 * (1 - i * 0.12), 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}
function avisos(ctx, J, aPant, cam, t) {
  for (const a of J.avisos) {
    const [x0, y0] = aPant(a.x, a.y + a.h), [x1, y1] = aPant(a.x + a.w, a.y), p = a.p || 0, pulso = 0.35 + 0.35 * Math.sin(t * 18) * (p > 0.6 ? 1 : 0.5);
    ctx.save(); ctx.globalAlpha = pulso + p * 0.3; ctx.fillStyle = p > 0.7 ? '#ff5c4a' : '#ffd27a';
    if (a.tipo === 'suelo') { ctx.fillRect(x0, y1 - 10, x1 - x0, 14); ctx.globalAlpha *= 0.5; ctx.fillRect(x0 + (x1 - x0) * (1 - p) / 2, y1 - 120 * cam.zoom, (x1 - x0) * p, 110 * cam.zoom); }
    else { ctx.globalAlpha *= 0.55; ctx.fillRect(x0, y0, x1 - x0, y1 - y0); ctx.globalAlpha = 1; ctx.strokeStyle = '#ffd27a'; ctx.setLineDash([10, 8]); ctx.lineWidth = 2; ctx.strokeRect(x0, y0, x1 - x0, y1 - y0); }
    if (a.d) { ctx.globalAlpha = 1; ctx.setLineDash([]); ctx.fillStyle = '#fff'; ctx.font = '900 18px system-ui'; ctx.textAlign = 'center'; ctx.fillText(`¡${a.d}!`, (x0 + x1) / 2, Math.min(y0, y1) - 12); }
    ctx.restore();
  }
  for (const rk of J.rocas) if (rk.y < 900) { const [sx, sy] = aPant(rk.x, rk.y); ctx.fillStyle = '#7d768c'; ctx.strokeStyle = '#120d1c'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(sx - 34 * cam.zoom, sy); ctx.lineTo(sx - 20 * cam.zoom, sy - 60 * cam.zoom); ctx.lineTo(sx + 28 * cam.zoom, sy - 54 * cam.zoom); ctx.lineTo(sx + 36 * cam.zoom, sy - 8 * cam.zoom); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  for (const o of J.ondas) { const [sx, sy] = aPant(o.x, 0); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = '#ffd27a'; ctx.globalAlpha = 0.8; ctx.beginPath(); ctx.moveTo(sx - 46 * cam.zoom, sy); ctx.quadraticCurveTo(sx, sy - 90 * cam.zoom, sx + 46 * cam.zoom, sy); ctx.fill(); ctx.restore(); }
}
function dibujarJefe(ctx, J, aPant, cam, t, alfa) {
  const C = J.def.colores, z = cam.zoom, [sx, sy] = aPant(J.x, 0), W = J.def.ancho * z, H = J.def.alto * z;
  const agotado = J.agotado > 0, a = J.ataque, k = a ? Math.min(1, J.t / a.avisoF) : 0, golpeando = a && J.t >= a.avisoF && J.t < a.avisoF + a.activo;
  const baja = agotado ? H * 0.32 : 0, resp = Math.sin(t * 1.6) * 4 * z;
  ctx.save(); ctx.lineJoin = 'round'; ctx.strokeStyle = '#120d1c'; ctx.lineWidth = 5;
  if (J.dormido) ctx.filter = 'grayscale(0.6) brightness(0.7)';
  if (J.ko) { ctx.globalAlpha = Math.max(0, 1 - J.f / 150); }
  const piedra = (pts, col) => { ctx.fillStyle = col; ctx.beginPath(); pts.forEach(([px, py], i) => (i ? ctx.lineTo(sx + px * z, sy - py * z) : ctx.moveTo(sx + px * z, sy - py * z))); ctx.closePath(); ctx.fill(); ctx.stroke(); };
  const by = baja / z;
  // piernas
  piedra([[-100, 0], [-40, 0], [-30, 150 - by], [-110, 150 - by]], C.piedra); piedra([[30, 0], [100, 0], [110, 150 - by], [30, 150 - by]], C.piedra);
  // torso
  piedra([[-130, 140 - by], [130, 140 - by], [150, 330 - by + resp / z], [-150, 330 - by + resp / z]], C.piedra2);
  ctx.fillStyle = C.musgo; ctx.fillRect(sx - 150 * z, sy - (330 - by) * z - resp, 300 * z, 12 * z);
  // grietas que brillan más en cada fase
  ctx.save(); ctx.strokeStyle = C.grieta; ctx.globalAlpha = 0.4 + J.fase * 0.25 + (agotado ? 0.3 : 0); ctx.lineWidth = 4 * z; ctx.globalCompositeOperation = 'lighter';
  ctx.beginPath(); ctx.moveTo(sx - 60 * z, sy - (300 - by) * z); ctx.lineTo(sx - 20 * z, sy - (240 - by) * z); ctx.lineTo(sx - 50 * z, sy - (180 - by) * z); ctx.moveTo(sx + 70 * z, sy - (310 - by) * z); ctx.lineTo(sx + 30 * z, sy - (230 - by) * z); ctx.stroke(); ctx.restore();
  // brazo (se levanta al telegrafiar, cae al golpear)
  const xm = a?.xMano != null ? (a.xMano - J.x) : -170, alzado = a && !golpeando && J.t < a.avisoF ? k : golpeando ? 0 : 0.15;
  const hx = -140, hy = 300 - by, mx = golpeando && a?.mano ? xm : -190 - alzado * 40, my = golpeando && a?.mano ? 30 : 160 + alzado * 260;
  ctx.lineWidth = 46 * z; ctx.strokeStyle = '#120d1c'; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(sx + hx * z, sy - hy * z); ctx.lineTo(sx + mx * z, sy - my * z); ctx.stroke();
  ctx.lineWidth = 38 * z; ctx.strokeStyle = C.piedra; ctx.stroke();
  ctx.fillStyle = C.piedra2; ctx.strokeStyle = '#120d1c'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(sx + mx * z, sy - my * z, 40 * z, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  if (a && !golpeando && J.t < a.avisoF) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = C.nucleo; ctx.globalAlpha = 0.3 + k * 0.5; ctx.beginPath(); ctx.arc(sx + mx * z, sy - my * z, (40 + k * 20) * z, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
  // brazo de atrás
  ctx.lineWidth = 40 * z; ctx.strokeStyle = oscurecer(C.piedra, 0.7); ctx.beginPath(); ctx.moveTo(sx + 130 * z, sy - (300 - by) * z); ctx.lineTo(sx + 160 * z, sy - (150 - by) * z); ctx.stroke();
  // cabeza con núcleo
  const cy = 330 - by + 50 + resp / z;
  piedra([[-60, cy - 50], [60, cy - 50], [70, cy + 40], [0, cy + 70], [-70, cy + 40]], C.piedra2);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; const brillo = agotado ? 1 : a?.id === 'rayo' && !golpeando ? k : 0.5;
  const g = ctx.createRadialGradient(sx, sy - cy * z, 4, sx, sy - cy * z, 46 * z); g.addColorStop(0, '#ffffff'); g.addColorStop(0.3, C.nucleo); g.addColorStop(1, 'rgba(255,210,120,0)');
  ctx.globalAlpha = 0.5 + brillo * 0.5; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy - cy * z, 46 * z, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  if (golpeando && a.id === 'rayo') { const [x0] = aPant(J.x - 80, 0), [xl] = aPant(-2000, 0); const [, yr] = aPant(0, a.yRayo + a.altoRayo / 2); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = C.nucleo; ctx.globalAlpha = 0.8; ctx.fillRect(xl, yr - a.altoRayo * z / 2, x0 - xl, a.altoRayo * z); ctx.fillStyle = '#fff'; ctx.fillRect(xl, yr - a.altoRayo * z / 6, x0 - xl, a.altoRayo * z / 3); ctx.restore(); }
  if (agotado) { ctx.fillStyle = '#fff'; ctx.font = '900 16px system-ui'; ctx.textAlign = 'center'; ctx.fillText('¡NÚCLEO EXPUESTO!', sx, sy - (cy + 90) * z); }
  void W; ctx.restore();
}
function cajas(ctx, c, aPant) {
  ctx.save(); ctx.lineWidth = 2;
  const rect = (b, col) => { const [x0, y0] = aPant(b.x, b.y + b.h), [x1, y1] = aPant(b.x + b.w, b.y); ctx.strokeStyle = col; ctx.fillStyle = col.replace('1)', '.18)'); ctx.fillRect(x0, y0, x1 - x0, y1 - y0); ctx.strokeRect(x0, y0, x1 - x0, y1 - y0); };
  for (const L of [...c.luchadores, ...c.extras]) {
    if (!L.activo) continue;
    for (const h of c.hurtbox(L)) rect(h, c.invulnerable(L) ? 'rgba(255,255,255,1)' : 'rgba(80,170,255,1)');
    for (const h of L.hitboxes ? L.hitboxes(c) : [c.hitbox(L)].filter(Boolean)) rect(h, 'rgba(255,70,70,1)');
    const [sx, sy] = aPant(L.x, L.alto + 20); ctx.fillStyle = '#fff'; ctx.font = '700 11px ui-monospace,monospace'; ctx.textAlign = 'center';
    ctx.fillText(`${L.estado}${L.mov ? ' ' + L.mov.id + ' ' + L.movF + '/' + L.durEstado : ''}`, sx, sy);
  }
  for (const p of c.proyectiles) rect({ x: p.x - p.w / 2, y: p.y - p.h / 2, w: p.w, h: p.h }, 'rgba(255,70,70,1)');
  ctx.restore();
}
