// Forja · Anime Battle Engine · dibujo con p5.js (modo 2D: se usa su drawingContext, el canvas 2D de siempre).
// SOLO PRESENTACIÓN: lee el estado del combate y lo pinta; nunca escribe en él (la simulación sigue determinista).
// Escenarios en escenarios.js (capas con paralaje pintadas una vez, suelo en perspectiva, vida animada, etalonaje).
// Aquí: cámara (encuadre de los dos, zoom suave, seguimiento vertical, sacudida con ruido), luchadores articulados con
// la luz del escenario (sombra de celuloide + contraluz), hoja de sprites del estudio con contraluz, sombras de contacto
// que se achican con la altura, reflejos en suelos pulidos, estelas en cinta, jefe con piedra sombreada, avisos
// telegrafiados, proyectiles con halo y cajas de depuración. Interpola posiciones con el alfa del bucle de paso fijo.
// Con GL por software el cuadro se rasteriza en un lienzo de CPU y se copia entero: varias veces más rápido que la
// GPU emulada (medido: ver motores/DECISIONES.md).
import { poseDe, acercar, dibujarLuchador, oscurecer, ESCALA, CICLO } from './esqueleto.js';
import { INCLINA } from './jefe.js';
import { crearRuido } from '../nucleo/ruido.js';
import { ESTADOS } from './estados.js';
import { crearEscenario, elegirEscenario, ESCENARIOS, halo, sombraSprite, lienzoDe, mezclar, conAlfa } from './escenarios.js';

export const ANCHO = 960, ALTO = 540, SUELO = 468;
export const TEMAS = ESCENARIOS;
export { elegirEscenario };
// lo que cada perfil gráfico permite (los perfiles bajan solos si el cuadro pasa de ~20 ms)
const CALIDAD = {
  bajo:  { reflejos: false, fantasmas: 3, luz: true },
  medio: { reflejos: true, fantasmas: 4, luz: true },
  alto:  { reflejos: true, fantasmas: 5, luz: true },
  ultra: { reflejos: true, fantasmas: 6, luz: true },
};

export function crearRender(s, { tema = 'noche', semilla = 9, acc, fx, cuerpos = {}, sprites = {}, mostrarCajas = false, postimagenes = true, estelas: conEstelas = true, zoomFijo = false, zoomMax = 1.15, calidad = 'alto', cpu = false }) {
  const destino = s.drawingContext, R = crearRuido(semilla), lienzo = lienzoDe(cpu);
  let ctx = destino, escenaCv = null;
  const cam = { x: 0, zoom: 1, px: 0, pzoom: 1, y: 0 };
  const poses = new Map(), estelas = new Map(), fantasmas = new Map(), andares = new Map(), vidaInicial = new Map(), grietas = [];
  const r = { cam, mostrarCajas, tema: null, cuadro: 0, dibujos: 0, sacX: 0, sacY: 0, sacR: 0, cpu, perfil: calidad };
  let E = null, Q = CALIDAD[calidad] || CALIDAD.alto;
  const sprCache = new Map();   // hoja de sprites teñida con la luz del escenario (se rehace al cambiar de escenario)
  const aPant = (wx, wy, wz = 0) => [(wx - cam.x) * cam.zoom + ANCHO / 2, SUELO - (wy + wz * 0.35) * cam.zoom + cam.y];
  r.aPant = aPant;
  r.cambiarTema = (t) => { if (t === r.tema && E) return; r.tema = t; E = crearEscenario(t, { semilla, cpu, calidad: r.perfil, acc }); sprCache.clear(); };
  r.calidad = (id) => { r.perfil = id; Q = CALIDAD[id] || CALIDAD.alto; if (E) E.calidad = id; };
  Object.defineProperty(r, 'escenario', { get: () => E });
  r.cambiarTema(tema);
  if (fx) fx.cpu = cpu;   // los halos de las partículas, en el mismo tipo de lienzo que la escena

  // cámara: encuadra a los activos, ajusta el zoom a la distancia y sube un poco si alguien salta alto.
  // El director la toma en las cinemáticas. La sacudida es ruido suave (no un seno fijo) con un giro mínimo.
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
    // seguimiento vertical: la cabeza más alta no se mete bajo las barras de vida
    const techo = Math.max(0, ...act.filter((l) => l.tipo !== 'jefe').map((l) => (l.py + (l.y - l.py) * alfa) + (l.alto || 116)));
    const yObj = zoomFijo ? 0 : Math.max(0, Math.min(90, (techo * cam.zoom - (SUELO - 120)) * 0.85));
    cam.y += (yObj - cam.y) * 0.1;
    const sac = (fx?.sacudida || 0) + (director?.cam.sacudida || 0), ts = (fx?.tiempo || 0) * 24;
    r.sacX = sac ? sac * R.s2(ts, 0.37) : 0; r.sacY = sac ? sac * 0.7 * R.s2(7.1, ts) : 0; r.sacR = sac && !acc?.reducirMovimiento && !cpu ? sac * 0.0011 * R.s2(ts * 0.6, 3.3) : 0;
    if (cpu) { r.sacX = Math.round(r.sacX); r.sacY = Math.round(r.sacY); }   // en CPU, píxeles enteros: copias sin filtrado
    if (director?.cam.sacudida) director.cam.sacudida *= 0.9;
  };

  r.dibujar = (c, partida, alfa, t) => {
    r.cuadro++; r.dibujos = 0;
    // lienzo de CPU (GL por software) del mismo tamaño que el de p5
    if (cpu) { const w = destino.canvas.width, h = destino.canvas.height; if (!escenaCv || escenaCv.width !== w || escenaCv.height !== h) [escenaCv, ctx] = lienzo(w, h); }
    const k = destino.canvas.width / ANCHO, tE = fx?.tiempo ?? t;   // tiempo de escena: se frena en cámara lenta y se detiene en pausa
    if (c.escenario?.tema && ESCENARIOS[c.escenario.tema] && c.escenario.tema !== r.tema) r.cambiarTema(c.escenario.tema);   // capítulos de la historia
    // r.medir = {} activa la medición por partes (pruebas de rendimiento): con lienzo de CPU, getImageData obliga a
    // rasterizar lo pendiente, así cada parte cuenta su costo real
    let tm = performance.now(); const marca = r.medir ? (n) => { if (cpu) ctx.getImageData(0, 0, 1, 1); const a = performance.now(); r.medir[n] = (r.medir[n] || 0) + a - tm; tm = a; } : () => {};
    ctx.save(); ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.translate(ANCHO / 2 + r.sacX, ALTO / 2 + r.sacY); ctx.rotate(r.sacR); ctx.translate(-ANCHO / 2, -ALTO / 2);
    const todos = [...c.luchadores, ...c.extras].filter((l) => l.activo);
    // pose y posición de cada luchador UNA vez por cuadro (las usan el reflejo y el cuerpo)
    const prep = new Map(); for (const L of todos) if (L.tipo !== 'jefe') prep.set(L.id, preparar(L, alfa, t));
    marca('preparar'); E.fondo(ctx, cam, tE); marca('fondo');
    const cine = partida.director?.activa ? partida.director : null;
    E.suelo(ctx, cam, tE, Q.reflejos ? (cx, a) => { for (const L of todos) { const p = prep.get(L.id); if (p && !p.invis) reflejo(cx, L, p, t, a); } } : null);
    if (cine) fondoCine(ctx, cine, t, cpu);   // la cinemática tapa el escenario, no a los luchadores
    marca('suelo');
    // grietas de las paredes y objetos que se rompen (con el arte del escenario, ocupando su caja de colisión)
    for (const g of grietas) { const [gx] = aPant(g.lado > 0 ? c.limites.der : c.limites.izq, 0); ctx.strokeStyle = 'rgba(255,240,200,.55)'; ctx.lineWidth = 3; ctx.beginPath(); for (const [i, p] of g.pts.entries()) i ? ctx.lineTo(gx + p[0], p[1] + cam.y) : ctx.moveTo(gx + p[0], p[1] + cam.y); ctx.stroke(); }
    for (const o of c.obstaculos) {
      if (!vidaInicial.has(o.id)) vidaInicial.set(o.id, o.vida);
      const [ox, oy] = aPant(o.x, o.y + o.h), w = o.w * cam.zoom, h = o.h * cam.zoom;
      if (o.roto) { escombros(ctx, o, ox, oy + h, w, cam.zoom); continue; }
      ctx.drawImage(sombraSprite(cpu), ox - w * 0.35, oy + h - 8 * cam.zoom, w * 1.7, 16 * cam.zoom);
      E.prop(ctx, o, ox, oy, w, h, 1 - o.vida / (vidaInicial.get(o.id) || 120), cam.zoom);
    }
    // avisos del jefe (debajo de todo lo demás)
    for (const J of todos) if (J.tipo === 'jefe') avisos(ctx, J, aPant, cam, t, cpu);
    // sombras de contacto: se achican y aclaran con la altura, y se corren un poco lejos de la luz
    const spr = sombraSprite(cpu);
    for (const L of todos) {
      const x = L.px + (L.x - L.px) * alfa, alt = Math.max(0, L.py + (L.y - L.py) * alfa), [sx, sy] = aPant(x, 0, L.z || 0), kk = Math.max(0.3, 1 - alt / 280);
      const w = (L.tipo === 'jefe' ? L.ancho * 1.6 : L.ancho * 2.1) * cam.zoom * kk, h = (L.tipo === 'jefe' ? 34 : 15) * cam.zoom * kk;
      ctx.globalAlpha = Math.min(1, 0.9 * kk + 0.1); ctx.drawImage(spr, sx - w / 2 - E.luz.dx * alt * 0.12 * cam.zoom, sy - h / 2 + 2, w, h); ctx.globalAlpha = 1;
    }
    marca('objetos+sombras');
    // orden de dibujo por profundidad (2.5D): lo de atrás primero; el titán, detrás de todos
    for (const L of todos.sort((a, b) => (b.tipo === 'jefe') - (a.tipo === 'jefe') || (b.z || 0) - (a.z || 0))) {
      if (L.tipo === 'jefe') dibujarJefe(ctx, L, aPant, cam, t, alfa, E.luz, cpu);
      else luchador(ctx, L, c, prep.get(L.id), t);
    }
    marca('luchadores');
    for (const p of c.proyectiles) proyectil(ctx, p, aPant, cam, t, alfa, cpu);
    // rayo del movimiento cargado
    for (const L of todos) if (L.mov?.rayo && L.movF >= L.mov.arranque && L.movF < L.mov.arranque + L.mov.activo) { const hb = c.hitbox(L); if (hb) fx.rayoEnergia(L.dir > 0 ? hb.x : hb.x + hb.w, hb.y + hb.h / 2, hb.w * L.dir, hb.h, { color: L.mov.rayo.color, dur: 0.05 }); }
    fx.dibujar(ctx, (x, y) => aPant(x, y), cam.zoom);
    marca('fx'); E.delante(ctx, cam, tE); marca('delante');
    if (r.mostrarCajas) cajas(ctx, c, aPant);
    ctx.restore();
    // capa de pantalla: etalonaje y viñeta del escenario, cinemática, líneas de velocidad, cuadros de impacto, destello
    ctx.save(); ctx.setTransform(k, 0, 0, k, 0, 0);
    E.post(ctx, tE);
    if (cine) cinematica(ctx, cine, t);
    fx.dibujarPantalla(ctx, ANCHO, ALTO, aPant);
    ctx.restore(); marca('post');
    if (cpu) { destino.save(); destino.setTransform(1, 0, 0, 1, 0, 0); destino.globalCompositeOperation = 'copy'; destino.drawImage(escenaCv, 0, 0); destino.restore(); }
    marca('copia'); if (r.medir) r.medir.cuadros = (r.medir.cuadros || 0) + 1;
  };
  r.grieta = (lado) => { const pts = []; let y = 80; for (let i = 0; i < 9; i++) { pts.push([(lado > 0 ? -1 : 1) * (6 + (i % 2) * 18 + i * 3), y]); y += 40; } grietas.push({ lado, pts }); if (grietas.length > 6) grietas.shift(); };

  function preparar(L, alfa, t) {
    const x = L.px + (L.x - L.px) * alfa, y = L.py + (L.y - L.py) * alfa, [sx, sy] = aPant(x, y, L.z || 0), [, sg] = aPant(x, 0, L.z || 0);
    const escala = cam.zoom * (1 - (L.z || 0) * 0.0012), alto = L.alto * escala;
    const cuerpo = { ...(cuerpos[L.def.id] || L.def.cuerpo || {}), ...(L.transformado?.colores || {}) };
    const aura = L.transformado ? (L.transformado.colores?.aura || L.def.efectos?.aura) : L.estado === 'carga' ? L.def.efectos?.aura : null;
    const invis = L.mov?.teleporta && L.movF < L.mov.arranque;
    const destello = L.pausa > 0 && ESTADOS[L.estado]?.sinControl ? 0.55 : L.estado === 'parada' && L.f < 6 ? 0.7 : 0;
    // fase del paso: la distancia que avanzó (en unidades del esqueleto, hacia donde mira) entre el largo del ciclo.
    // Así el pie de apoyo no patina, la cadencia sigue a la velocidad y caminar hacia atrás mueve los pies al revés.
    let an = andares.get(L.id); if (!an) andares.set(L.id, an = { x, fase: 0 });
    const avance = (x - an.x) * L.dir * ESCALA / L.alto; an.x = x;
    if (L.estado === 'caminar') an.fase += avance / CICLO.caminar; else if (L.estado === 'correr') an.fase += avance / CICLO.correr;
    // tiempo de SIMULACIÓN para lo procedural (cuadros en el estado actual): la cámara lenta y la pausa también frenan la respiración
    const tSim = (L.f || 0) / 60;
    const ciclico = (L.estado === 'caminar' || L.estado === 'correr') && L.f > 4, golpeando = L.mov && L.movF >= L.mov.arranque;
    const pose = acercar(poses.get(L.id), poseDe(L, tSim, L.def.animaciones, { fase: an.fase, faseCorrer: an.fase }), L.pausa > 0 || ciclico ? 1 : golpeando ? 0.75 : 0.5); poses.set(L.id, pose);
    const apoyo = L.suelo && L.y <= 0.5 && L.estado !== 'derribado' && L.estado !== 'derrota';
    // parón del impacto: el que recibe tiembla en su sitio (solo dibujo)
    const tiembla = L.pausa > 0 && ESTADOS[L.estado]?.sinControl && !acc?.reducirMovimiento ? (r.cuadro % 2 ? 3 : -3) * cam.zoom : 0;
    return { x, y, sx, sy, sg, alto, cuerpo, aura, invis, destello, pose: { ...pose }, apoyo, tiembla };
  }
  // reflejo en el suelo pulido: el cuerpo espejado sobre su punto de apoyo, plano (sin luz) y tenue
  function reflejo(cx, L, p, t, a) {
    cx.save(); cx.translate(0, p.sg * 2); cx.scale(1, -1);
    const spr = sprites[L.def.id];
    if (spr) { cx.globalAlpha = a; dibujarSprite(cx, spr, L, p.sx, p.sy, p.alto, 0, null, t, null); }
    else dibujarLuchador(cx, p.pose, { x: p.sx, y: p.sy, alto: p.alto, dir: L.dir, cuerpo: p.cuerpo, t, apoyo: p.apoyo, contorno: E.luz.contorno, alfa: a });
    cx.restore();
  }
  function luchador(ctx, L, c, p, t) {
    const { x, y, sx, sy, alto, cuerpo, aura, invis, destello, pose, apoyo, tiembla } = p;
    if (aura) fx.aura(x, y, L.alto, aura, t, L.estado === 'carga' ? 1.4 : 0.7);
    // postimágenes: siluetas del color de su energía, aditivas, en movimientos rápidos
    const fant = fantasmas.get(L.id) || []; fantasmas.set(L.id, fant);
    const rapido = ['impulso', 'correr', 'esquiva'].includes(L.estado) || L.mov?.avance > 6 || L.mov?.tipo === 'especial' || !!L.transformado;
    if (postimagenes && rapido && r.cuadro % 3 === 0) { fant.push({ x: sx, y: sy, pose, dir: L.dir, vida: 1, apoyo }); while (fant.length > Q.fantasmas) fant.shift(); }
    const tinte = L.def.efectos?.estela || '#ffffff', cF = { ...cuerpo, piel: tinte, pelo: tinte, ropa: tinte, ropa2: tinte, acento: tinte, cinta: tinte, sombra: false, emblema: null };
    if (fant.length) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (const f of fant) { f.vida -= 0.08; if (f.vida > 0) dibujarLuchador(ctx, f.pose, { x: f.x, y: f.y, alto, dir: f.dir, cuerpo: cF, alfa: f.vida * 0.24, contorno: tinte, t, apoyo: f.apoyo }); } ctx.restore(); }
    while (fant.length && fant[0].vida <= 0) fant.shift();
    const spr = sprites[L.def.id], luz = Q.luz ? E.luz : null;
    let ancla = null;
    if (invis) { /* teletransportándose: no se dibuja */ }
    else if (spr) ancla = dibujarSprite(ctx, spr, L, sx + tiembla, sy, alto, destello, aura, t, luz);
    else ancla = dibujarLuchador(ctx, pose, { x: sx + tiembla, y: sy, alto, dir: L.dir, cuerpo, destello, aura, t, apoyo, luz, contorno: luz?.contorno || '#120d1c' });
    r.dibujos += 24;
    // estela del golpe: cinta que se afina hacia atrás por las últimas posiciones de la mano o el pie
    if (conEstelas && ancla && L.mov && L.movF >= L.mov.arranque - 1 && L.movF < L.mov.arranque + L.mov.activo + 2 && !L.mov.proyectil) {
      const e = estelas.get(L.id) || []; estelas.set(L.id, e); const pt = L.mov.tipo === 'fuerte' || L.mov.bajo || L.mov.aire ? ancla.pie : ancla.mano;
      e.push([pt.x, pt.y]); if (e.length > 7) e.shift();
      if (e.length > 2) cinta(ctx, e, L.def.efectos?.estela || '#ffffff', (L.mov.tipo === 'fuerte' || L.mov.tipo === 'especial' ? 11 : 8) * cam.zoom);
    } else estelas.delete(L.id);
  }
  // Hoja de sprites del estudio: se tiñe con la luz de ambiente y la sombra del escenario (una vez, en caché) y lleva
  // un filo de contraluz: la silueta en el color del rim, corrida hacia la luz, por detrás del sprite.
  function variantes(spr, luz) {
    let v = sprCache.get(spr); if (v) return v;
    const w = spr.imagen.naturalWidth || spr.imagen.width, h = spr.imagen.naturalHeight || spr.imagen.height;
    const [ten, xt] = lienzo(w, h); xt.drawImage(spr.imagen, 0, 0); xt.globalCompositeOperation = 'source-atop'; xt.globalAlpha = luz.ambK * 1.4; xt.fillStyle = luz.amb; xt.fillRect(0, 0, w, h);
    // sombra suave hacia abajo de cada cuadro (de la hoja): el cuerpo se oscurece hacia los pies
    xt.globalAlpha = 1; for (const cs of Object.values(spr.anim)) for (const f of cs) { const g = xt.createLinearGradient(0, f.y, 0, f.y + f.h); g.addColorStop(0, conAlfa(luz.sombra, 0)); g.addColorStop(0.55, conAlfa(luz.sombra, 0.05)); g.addColorStop(1, conAlfa(luz.sombra, 0.32)); xt.fillStyle = g; xt.fillRect(f.x, f.y, f.w, f.h); }
    const [rim, xr] = lienzo(w, h); xr.drawImage(spr.imagen, 0, 0); xr.globalCompositeOperation = 'source-in'; xr.fillStyle = luz.rim; xr.fillRect(0, 0, w, h);
    v = { ten, rim }; sprCache.set(spr, v); return v;
  }
  function dibujarSprite(ctx, spr, L, sx, sy, alto, destello, aura, t, luz) {
    const mapa = { reposo: 'quieto', bloqueo: 'quieto', carga: 'quieto', parada: 'quieto', aterrizaje: 'quieto', caminar: 'caminar', correr: 'correr', impulso: 'correr', salto: 'saltar', caida: 'saltar', agachado: 'agachado', aturdido: 'dano', aturdidoBloqueo: 'quieto', empujado: 'dano', derribado: 'morir', derrota: 'morir', victoria: 'celebrar', levantarse: 'agachado', esquiva: 'correr', transformacion: 'celebrar' };
    const anim = ESTADOS[L.estado]?.ataque ? 'golpe' : mapa[L.estado] || 'quieto', cuadros = spr.anim[anim] || spr.anim.quieto || Object.values(spr.anim)[0];
    let i; if (anim === 'golpe' && L.mov) i = Math.min(cuadros.length - 1, Math.floor(L.movF / Math.max(1, L.durEstado) * cuadros.length)); else i = Math.floor(t * 10) % cuadros.length;
    const f = cuadros[i], h = alto / (spr.relAlto || 0.8), w = h * f.w / f.h;
    ctx.save(); ctx.translate(sx, sy); ctx.scale(L.dir, 1);
    if (aura) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.75; ctx.drawImage(halo(aura, cpu), -alto * 0.9, -alto * 1.45, alto * 1.8, alto * 1.8); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
    const v = luz && (spr.imagen.complete !== false) ? variantes(spr, luz) : null;
    if (v) { const o = Math.max(1.5, alto * 0.022); ctx.globalAlpha = 0.9; ctx.drawImage(v.rim, f.x, f.y, f.w, f.h, -w / 2 + luz.dx * L.dir * o, -h * 0.96 + luz.dy * o, w, h); ctx.globalAlpha = 1; }
    ctx.drawImage(v ? v.ten : spr.imagen, f.x, f.y, f.w, f.h, -w / 2, -h * 0.96, w, h);
    if (destello) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = destello * 0.8; ctx.drawImage(v ? v.rim : spr.imagen, f.x, f.y, f.w, f.h, -w / 2, -h * 0.96, w, h); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
    ctx.restore();
    return { mano: { x: sx + L.dir * alto * 0.35, y: sy - alto * 0.6 }, pie: { x: sx + L.dir * alto * 0.35, y: sy - alto * 0.2 }, cabeza: { x: sx, y: sy - alto * 0.9 } };
  }
  return r;
}

// ---------------------------------------------------------------- piezas
function cinta(ctx, e, color, ancho) {
  const izq = [], der = [], n = e.length;
  for (let i = 0; i < n; i++) { const p = e[i], q = e[Math.min(n - 1, i + 1)], o = e[Math.max(0, i - 1)], dx = q[0] - o[0], dy = q[1] - o[1], l = Math.hypot(dx, dy) || 1, w = Math.pow(i / (n - 1), 1.3) * ancho; izq.push([p[0] - dy / l * w, p[1] + dx / l * w]); der.push([p[0] + dy / l * w, p[1] - dx / l * w]); }
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const [k, col, a] of [[1, color, 0.55], [0.42, '#ffffff', 0.75]]) {
    ctx.globalAlpha = a; ctx.fillStyle = col; ctx.beginPath();
    for (let i = 0; i < n; i++) { const [x, y] = e[i], [ax, ay] = izq[i]; const px = x + (ax - x) * k, py = y + (ay - y) * k; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
    for (let i = n - 1; i >= 0; i--) { const [x, y] = e[i], [bx, by] = der[i]; ctx.lineTo(x + (bx - x) * k, y + (by - y) * k); }
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
function escombros(ctx, o, x0, y0, w, z) {
  ctx.fillStyle = mezclar(o.color || '#6f6a7d', '#000000', 0.25); ctx.strokeStyle = '#120d1c'; ctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) { const cx = x0 + w * (0.1 + i * 0.27), r = (6 + (i % 2) * 5) * z; ctx.beginPath(); ctx.moveTo(cx - r, y0); ctx.lineTo(cx - r * 0.5, y0 - r * 1.1); ctx.lineTo(cx + r * 0.7, y0 - r * 0.8); ctx.lineTo(cx + r, y0); ctx.closePath(); ctx.fill(); ctx.stroke(); }
}
const CINE = new Map(), MARGEN_CINE = 40;
function fondoCine(ctx, d, t, cpu) {
  const a = d.cam.fondo; if (!(a > 0)) return;
  const col = d.actual?.def?.color || '#ffffff';
  let img = CINE.get(col + cpu);
  if (!img) { const [c, x] = lienzoDe(cpu)(ANCHO, ALTO), g = x.createRadialGradient(ANCHO / 2, ALTO / 2, 40, ANCHO / 2, ALTO / 2, ANCHO * 0.7); g.addColorStop(0, col); g.addColorStop(0.35, '#1a1030'); g.addColorStop(1, '#05030a'); x.fillStyle = g; x.fillRect(0, 0, ANCHO, ALTO); CINE.set(col + cpu, img = c); }
  // cambio de fondo de la cinemática: viñeta de energía con rayos que giran (encima del escenario, debajo del HUD)
  ctx.save(); ctx.globalAlpha = a * 0.85; ctx.drawImage(img, -MARGEN_CINE, -MARGEN_CINE, ANCHO + MARGEN_CINE * 2, ALTO + MARGEN_CINE * 2);
  ctx.globalAlpha = a * 0.45; ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath();
  for (let i = 0; i < 36; i++) { const an = i / 36 * Math.PI * 2 + t * 0.6; ctx.moveTo(ANCHO / 2 + Math.cos(an) * 120, ALTO / 2 + Math.sin(an) * 120); ctx.lineTo(ANCHO / 2 + Math.cos(an) * 900, ALTO / 2 + Math.sin(an) * 900); }
  ctx.stroke(); ctx.restore();
}
function cinematica(ctx, d, t) {
  const cam = d.cam, def = d.actual?.def; if (!def) return;
  // franjas de cine
  const h = 54 * Math.min(1, cam.fondo * 1.4); ctx.fillStyle = '#05030a'; ctx.fillRect(-40, -40, ANCHO + 80, h + 40); ctx.fillRect(-40, ALTO - h, ANCHO + 80, h + 40);
  if (cam.retrato > 0) {   // retrato dramático: banda diagonal con el color del golpe
    ctx.save(); ctx.globalAlpha = cam.retrato; ctx.translate((1 - cam.retrato) * -200, 0); ctx.fillStyle = def.color || '#fff';
    ctx.beginPath(); ctx.moveTo(0, 150); ctx.lineTo(ANCHO * 0.62, 110); ctx.lineTo(ANCHO * 0.58, 260); ctx.lineTo(0, 300); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#0b0912'; ctx.beginPath(); ctx.moveTo(0, 162); ctx.lineTo(ANCHO * 0.6, 124); ctx.lineTo(ANCHO * 0.565, 248); ctx.lineTo(0, 288); ctx.closePath(); ctx.fill();
    ctx.fillStyle = def.color || '#fff'; ctx.font = '900 13px system-ui'; ctx.fillText('ATAQUE DEFINITIVO', 60, 186); ctx.font = '900 34px system-ui'; ctx.fillStyle = '#ffffff'; ctx.fillText((d.actual?.ctx?.atacante?.nombre || '').toUpperCase(), 60, 228); ctx.restore();
  }
  ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.font = '600 12px system-ui'; ctx.textAlign = 'right'; ctx.fillText('Espacio / Enter: omitir', ANCHO - 16, ALTO - 18); ctx.textAlign = 'left';
}
function proyectil(ctx, p, aPant, cam, t, alfa, cpu) {
  const x = p.px + (p.x - p.px) * alfa, [sx, sy] = aPant(x, p.y, p.z || 0), r = p.w / 2 * cam.zoom, dir = Math.sign(p.vx) || 1;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.85; ctx.drawImage(halo(p.color, cpu), sx - r * 3, sy - r * 3, r * 6, r * 6);
  ctx.globalAlpha = 0.5; ctx.drawImage(halo(p.color, cpu), sx - dir * r * 3.2 - r * 1.6, sy - r * 0.9, r * 3.2, r * 1.8);   // estela
  for (let i = 3; i >= 0; i--) { ctx.globalAlpha = 0.25 + (3 - i) * 0.2; ctx.fillStyle = i ? p.color : '#ffffff'; ctx.beginPath(); ctx.ellipse(sx - dir * i * 10 * cam.zoom, sy, r * (1 - i * 0.12) * (1 + Math.sin(t * 30) * 0.06), r * 0.75 * (1 - i * 0.12), 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}
// Avisos del jefe: el MISMO rectángulo que su hitbox, más legible. Suelo: zona en perspectiva con un anillo que se
// cierra al ritmo del aviso y una columna de luz; aire: banda con franjas que corren. Dorado = prepárate, rojo = ya.
function avisos(ctx, J, aPant, cam, t, cpu) {
  for (const a of J.avisos) {
    const [x0, y0] = aPant(a.x, a.y + a.h), [x1, y1] = aPant(a.x + a.w, a.y), p = a.p || 0, peligro = p > 0.7, col = peligro ? '#ff4a3a' : '#ffc94a', pulso = 0.5 + 0.5 * Math.sin(t * (peligro ? 26 : 12));
    ctx.save();
    if (a.tipo === 'suelo') {
      const cx = (x0 + x1) / 2, rx = (x1 - x0) / 2, ry = 9 * cam.zoom;
      ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = col; ctx.globalAlpha = 0.18 + p * 0.3 + pulso * 0.08; ctx.beginPath(); ctx.ellipse(cx, y1, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
      const g = ctx.createLinearGradient(0, y1, 0, y1 - 150 * cam.zoom); g.addColorStop(0, conAlfa(col, 0.32 * p + 0.05)); g.addColorStop(1, conAlfa(col, 0)); ctx.fillStyle = g; ctx.globalAlpha = 1; ctx.fillRect(x0 + rx * 0.1, y1 - 150 * cam.zoom, rx * 1.8, 150 * cam.zoom);
      ctx.globalCompositeOperation = 'source-over'; ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.ellipse(cx, y1, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 2; ctx.globalAlpha = 0.8; ctx.beginPath(); ctx.ellipse(cx, y1, Math.max(2, rx * (1 - p)), Math.max(1, ry * (1 - p)), 0, 0, Math.PI * 2); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.rect(x0, y0, x1 - x0, y1 - y0); ctx.clip();
      ctx.fillStyle = col; ctx.globalAlpha = 0.16 + p * 0.22; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
      ctx.globalAlpha = 0.22 + p * 0.2; ctx.beginPath(); const hh = y1 - y0, paso = 26, off = (t * (peligro ? 160 : 70)) % paso;
      for (let xx = x0 - hh - paso + off; xx < x1; xx += paso) { ctx.moveTo(xx, y1); ctx.lineTo(xx + 10, y1); ctx.lineTo(xx + 10 + hh, y0); ctx.lineTo(xx + hh, y0); ctx.closePath(); }
      ctx.fill(); ctx.globalAlpha = 0.95; ctx.fillRect(x0, y0, x1 - x0, 2.5); ctx.fillRect(x0, y1 - 2.5, x1 - x0, 2.5);
    }
    ctx.restore();
    if (a.d) { const tx = (x0 + x1) / 2, ty = Math.min(y0, y1) - 12 - pulso * 3; ctx.save(); ctx.font = '900 18px system-ui'; ctx.textAlign = 'center'; ctx.lineJoin = 'round'; ctx.lineWidth = 5; ctx.strokeStyle = '#1a0a08'; ctx.strokeText(`¡${a.d}!`, tx, ty); ctx.fillStyle = peligro ? '#ffd2c8' : '#fff6dc'; ctx.fillText(`¡${a.d}!`, tx, ty); ctx.restore(); }
  }
  for (const rk of J.rocas) if (rk.y < 900) {
    const [sx, sy] = aPant(rk.x, rk.y), z = cam.zoom, pts = [[-34, 0], [-20, -60], [10, -66], [28, -54], [36, -8]];
    ctx.save(); const ge = ctx.createLinearGradient(0, sy - 150 * z, 0, sy - 50 * z); ge.addColorStop(0, 'rgba(255,220,170,0)'); ge.addColorStop(1, 'rgba(255,220,170,.35)'); ctx.fillStyle = ge; ctx.beginPath(); ctx.moveTo(sx - 2 * z, sy - 150 * z); ctx.lineTo(sx + 2 * z, sy - 150 * z); ctx.lineTo(sx + 22 * z, sy - 50 * z); ctx.lineTo(sx - 22 * z, sy - 50 * z); ctx.closePath(); ctx.fill();   // estela de la caída
    ctx.fillStyle = '#7d768c'; ctx.strokeStyle = '#120d1c'; ctx.lineWidth = 3; ctx.beginPath(); pts.forEach(([px, py], i) => (i ? ctx.lineTo(sx + px * z, sy + py * z) : ctx.moveTo(sx + px * z, sy + py * z))); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.clip(); ctx.fillStyle = 'rgba(30,20,40,.35)'; ctx.fillRect(sx - 40 * z, sy - 70 * z, 34 * z, 70 * z); ctx.fillStyle = 'rgba(255,200,140,.35)'; ctx.fillRect(sx + 20 * z, sy - 70 * z, 20 * z, 70 * z); ctx.restore(); ctx.stroke(); ctx.restore();
  }
  for (const o of J.ondas) { const [sx, sy] = aPant(o.x, 0), z = cam.zoom; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.7; ctx.drawImage(halo('#ffb050', cpu), sx - 70 * z, sy - 90 * z, 140 * z, 110 * z); ctx.fillStyle = '#ffd27a'; ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.moveTo(sx - 46 * z, sy); ctx.quadraticCurveTo(sx, sy - 90 * z, sx + 46 * z, sy); ctx.fill(); ctx.fillStyle = '#fff6dc'; ctx.beginPath(); ctx.moveTo(sx - 22 * z, sy); ctx.quadraticCurveTo(sx, sy - 50 * z, sx + 22 * z, sy); ctx.fill(); ctx.restore(); }
}
// El titán: piedra con sombra del lado contrario a la luz del escenario, filo de contraluz en las aristas que miran a la
// luz, grietas y núcleo que brillan con halo. Las medidas (cabeza, mano, cuerpo) son las mismas que usa jefe.js para
// sus hurtboxes: lo que se ve es lo que se golpea.
function dibujarJefe(ctx, J, aPant, cam, t, alfa, luz, cpu) {
  const tinte = (c) => { let v = mezclar(c, luz.amb, 0.1); if (J.dormido) v = mezclar(v, '#2a2630', 0.45); return v; };
  const C0 = J.def.colores, C = { ...C0, piedra: tinte(C0.piedra), piedra2: tinte(C0.piedra2), musgo: tinte(C0.musgo) };
  const z = cam.zoom, xJ = J.px + (J.x - J.px) * alfa, [sx, sy] = aPant(xJ, 0);
  const agotado = J.agotado > 0, a = J.ataque, k = a ? Math.min(1, J.t / a.avisoF) : 0, golpeando = a && J.t >= a.avisoF && J.t < a.avisoF + a.activo;
  const resp = Math.sin(t * 1.6) * 4 * z, cont = luz.contorno, lado = luz.dx >= 0 ? 1 : -1;
  ctx.save(); ctx.lineJoin = 'round'; ctx.strokeStyle = cont; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.rect(-1e4, -1e4, 2e4, sy + 1e4 + 3); ctx.clip();   // nada del titán se dibuja bajo el suelo
  if (J.ko) { ctx.globalAlpha = Math.max(0, 1 - J.f / 150); }
  const piedra = (pts, col) => {
    ctx.fillStyle = col; ctx.beginPath(); pts.forEach(([px, py], i) => (i ? ctx.lineTo(sx + px * z, sy - py * z) : ctx.moveTo(sx + px * z, sy - py * z))); ctx.closePath(); ctx.fill();
    // sombra del lado contrario a la luz (banda recortada al bloque) y filo de contraluz en las aristas iluminadas
    const xs = pts.map((p) => p[0]), mn = Math.min(...xs), mx = Math.max(...xs), ys = pts.map((p) => p[1]);
    ctx.save(); ctx.clip(); ctx.fillStyle = conAlfa(luz.sombra, 0.42); const bw = (mx - mn) * 0.42 * z; ctx.fillRect(lado > 0 ? sx + mn * z : sx + mx * z - bw, sy - Math.max(...ys) * z, bw, (Math.max(...ys) - Math.min(...ys)) * z);
    ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fillRect(sx + mn * z, sy - Math.min(...ys) * z - 18 * z, (mx - mn) * z, 18 * z); ctx.restore();
    ctx.stroke();
    // aristas que miran a la luz (normal hacia afuera del bloque · dirección de la luz, en pantalla)
    const cxp = xs.reduce((u, v) => u + v, 0) / xs.length, cyp = ys.reduce((u, v) => u + v, 0) / ys.length;
    ctx.save(); ctx.strokeStyle = luz.rim; ctx.globalAlpha = 0.85; ctx.lineWidth = Math.max(1.5, 3 * z); ctx.beginPath();
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length], ex = bx - ax, ey = -(by - ay), l = Math.hypot(ex, ey) || 1; let nx = ey / l, ny = -ex / l;
      if (nx * ((ax + bx) / 2 - cxp) + ny * -((ay + by) / 2 - cyp) < 0) { nx = -nx; ny = -ny; }
      if (nx * luz.dx + ny * luz.dy < 0.3) continue;
      ctx.moveTo(sx + ax * z - nx * 3, sy - ay * z - ny * 3); ctx.lineTo(sx + bx * z - nx * 3, sy - by * z - ny * 3);
    }
    ctx.stroke(); ctx.restore();
  };
  const by = agotado ? 110 : 0;   // igual que jefe.js: de rodillas, el torso baja hasta apoyarse en las espinillas
  // piernas: al caminar se alternan (levanta una y otra según la distancia recorrida)
  const paso = J.vx ? Math.sin(J.x * 0.05) * 12 : 0, pi = Math.max(0, paso), pd = Math.max(0, -paso);
  if (agotado) {   // de rodillas: las espinillas apoyadas en el suelo hacia adelante, el torso sentado sobre ellas
    piedra([[-170, 0], [-40, 0], [-30, 46], [-150, 50]], C.piedra); piedra([[20, 0], [120, 0], [116, 44], [30, 46]], oscurecer(C0.piedra, 0.85));
  } else { piedra([[-100, pi], [-40, pi], [-30, 150 - by], [-110, 150 - by]], C.piedra); piedra([[30, pd], [100, pd], [110, 150 - by], [30, 150 - by]], C.piedra); }
  // de rodillas, el cuerpo de arriba se inclina hacia adelante girando sobre la base del torso (mismo ángulo que jefe.js)
  if (agotado) { ctx.save(); ctx.translate(sx, sy - 30 * z); ctx.rotate(-INCLINA); ctx.translate(-sx, -(sy - 30 * z)); }
  // torso
  piedra([[-130, 140 - by], [130, 140 - by], [150, 330 - by + resp / z], [-150, 330 - by + resp / z]], C.piedra2);
  ctx.fillStyle = C.musgo; ctx.fillRect(sx - 150 * z, sy - (330 - by) * z - resp, 300 * z, 12 * z);
  ctx.fillStyle = conAlfa('#9ad07a', 0.5); for (let m = 0; m < 6; m++) ctx.fillRect(sx + (-140 + m * 50) * z, sy - (330 - by) * z - resp + 10 * z, 14 * z, (6 + (m % 3) * 5) * z);
  // runas talladas: se encienden con la fase
  ctx.save(); ctx.strokeStyle = C.grieta; ctx.globalAlpha = 0.15 + J.fase * 0.2; ctx.lineWidth = 2.5 * z; ctx.beginPath();
  for (const [rx, ry] of [[-90, 200], [80, 260], [-40, 170]]) { ctx.moveTo(sx + (rx - 10) * z, sy - (ry - by) * z); ctx.lineTo(sx + rx * z, sy - (ry + 14 - by) * z); ctx.lineTo(sx + (rx + 10) * z, sy - (ry - by) * z); ctx.moveTo(sx + rx * z, sy - (ry + 14 - by) * z); ctx.lineTo(sx + rx * z, sy - (ry - 12 - by) * z); }
  ctx.stroke(); ctx.restore();
  // grietas que brillan más en cada fase (con halo)
  ctx.save(); ctx.strokeStyle = C.grieta; ctx.globalAlpha = 0.4 + J.fase * 0.25 + (agotado ? 0.3 : 0); ctx.lineWidth = 4 * z; ctx.globalCompositeOperation = 'lighter';
  ctx.beginPath(); ctx.moveTo(sx - 60 * z, sy - (300 - by) * z); ctx.lineTo(sx - 20 * z, sy - (240 - by) * z); ctx.lineTo(sx - 50 * z, sy - (180 - by) * z); ctx.moveTo(sx + 70 * z, sy - (310 - by) * z); ctx.lineTo(sx + 30 * z, sy - (230 - by) * z); ctx.stroke();
  ctx.globalAlpha = (0.25 + J.fase * 0.2) * (0.8 + 0.2 * Math.sin(t * 4)); for (const [gx, gy] of [[-20, 240], [30, 230], [-50, 180]]) ctx.drawImage(halo(C.grieta, cpu), sx + (gx - 40) * z, sy - (gy - by + 40) * z, 80 * z, 80 * z);
  ctx.restore();
  // brazo: del hombro a la mano que calcula jefe.js (alzada en el aviso, en el suelo al golpear y al recuperarse)
  const brazo = (hx, hy) => {
    const m = J.mano ? J.mano() : { x: J.x - 196, y: 199 }, mx = m.x - J.x, my = m.y;
    ctx.lineWidth = 46 * z; ctx.strokeStyle = cont; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(sx + hx * z, sy - hy * z); ctx.lineTo(sx + mx * z, sy - my * z); ctx.stroke();
    ctx.lineWidth = 38 * z; ctx.strokeStyle = C.piedra; ctx.stroke();
    { const dx = mx - hx, dy = my - hy, l = Math.hypot(dx, dy) || 1; let nx = -dy / l, ny = dx / l; if (nx * luz.dx - ny * luz.dy < 0) { nx = -nx; ny = -ny; } ctx.lineWidth = 16 * z; ctx.strokeStyle = conAlfa(luz.sombra, 0.4); ctx.beginPath(); ctx.moveTo(sx + (hx - nx * 11) * z, sy - (hy - ny * 11) * z); ctx.lineTo(sx + (mx - nx * 11) * z, sy - (my - ny * 11) * z); ctx.stroke(); ctx.lineWidth = 4 * z; ctx.strokeStyle = luz.rim; ctx.beginPath(); ctx.moveTo(sx + (hx + nx * 15) * z, sy - (hy + ny * 15) * z); ctx.lineTo(sx + (mx + nx * 15) * z, sy - (my + ny * 15) * z); ctx.stroke(); }
    ctx.fillStyle = C.piedra2; ctx.strokeStyle = cont; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(sx + mx * z, sy - my * z, 40 * z, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = luz.rim; ctx.lineWidth = 3 * z; const an = Math.atan2(-luz.dy, luz.dx); ctx.beginPath(); ctx.arc(sx + mx * z, sy - my * z, 34 * z, -an - 0.8, -an + 0.8); ctx.stroke();
    if (a && !golpeando && J.t < a.avisoF) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.35 + k * 0.6; ctx.drawImage(halo(C.nucleo, cpu), sx + mx * z - (70 + k * 40) * z, sy - my * z - (70 + k * 40) * z, (140 + k * 80) * z, (140 + k * 80) * z); ctx.restore(); }
  };
  // de pie, el brazo sale del hombro; de rodillas (cuerpo girado) se dibuja después, desde el hombro ya girado
  if (!agotado) brazo(-140, 300 - by);
  // brazo de atrás
  ctx.lineWidth = 40 * z; ctx.strokeStyle = oscurecer(C0.piedra, 0.6); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(sx + 130 * z, sy - (300 - by) * z); ctx.lineTo(sx + 160 * z, sy - (150 - by) * z); ctx.stroke();
  ctx.lineWidth = 4 * z; ctx.strokeStyle = conAlfa(luz.rim, 0.6); ctx.beginPath(); ctx.moveTo(sx + 150 * z, sy - (300 - by) * z); ctx.lineTo(sx + 180 * z, sy - (150 - by) * z); ctx.stroke();
  // cabeza con núcleo (con la inclinación, su centro coincide con J.cabeza(), la caja «nucleo»)
  const cy = 380 - by + resp / z;
  piedra([[-60, cy - 50], [60, cy - 50], [70, cy + 40], [0, cy + 70], [-70, cy + 40]], C.piedra2);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; const brillo = agotado ? 1 : a?.id === 'rayo' && !golpeando ? k : 0.5;
  ctx.globalAlpha = (0.35 + brillo * 0.5) * (0.85 + 0.15 * Math.sin(t * 5)); ctx.drawImage(halo(C.nucleo, cpu), sx - 120 * z, sy - cy * z - 120 * z, 240 * z, 240 * z);
  const g = ctx.createRadialGradient(sx, sy - cy * z, 4, sx, sy - cy * z, 46 * z); g.addColorStop(0, '#ffffff'); g.addColorStop(0.3, C.nucleo); g.addColorStop(1, 'rgba(255,210,120,0)');
  ctx.globalAlpha = 0.5 + brillo * 0.5; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy - cy * z, 46 * z, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#fff6dc'; ctx.globalAlpha = 0.3 + brillo * 0.4; ctx.lineWidth = 2 * z; ctx.beginPath(); ctx.arc(sx, sy - cy * z, (30 + Math.sin(t * 3) * 4) * z, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  // mirada del núcleo: el rayo NACE en la cara, baja hasta su altura y barre el suelo hacia la izquierda (su hitbox)
  if (golpeando && a.id === 'rayo') {
    const [x0] = aPant(J.x - 80, 0), [xl] = aPant(-2000, 0), [, yr] = aPant(0, a.yRayo + a.altoRayo / 2);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = C.nucleo; ctx.globalAlpha = 0.85; ctx.lineCap = 'round';
    ctx.lineWidth = a.altoRayo * z * 0.6; ctx.beginPath(); ctx.moveTo(sx, sy - cy * z); ctx.lineTo(x0, yr); ctx.stroke();
    ctx.fillStyle = C.nucleo; ctx.fillRect(xl, yr - a.altoRayo * z / 2, x0 - xl, a.altoRayo * z); ctx.fillStyle = '#fff'; ctx.fillRect(xl, yr - a.altoRayo * z / 6, x0 - xl, a.altoRayo * z / 3);
    ctx.globalAlpha = 0.4; ctx.drawImage(halo(C.nucleo, cpu), xl, yr - a.altoRayo * z * 1.5, x0 - xl, a.altoRayo * z * 3); ctx.restore();
  }
  // barrido: la mano golpea el suelo y levanta una ola de escombros que corre por el suelo (donde está su hitbox)
  if (golpeando && a.id === 'barrido') {
    const kk = (J.t - a.avisoF) / a.activo, xo = J.x - 120 - kk * 1200, [ox, oy] = aPant(xo, 0);
    ctx.fillStyle = C.piedra; ctx.strokeStyle = cont; ctx.lineWidth = 3;
    for (let i = 0; i < 5; i++) { const w = (26 + (i % 3) * 8) * z, hh = (a.alto * (0.55 + 0.45 * Math.sin(i * 1.7 + kk * 9) ** 2)) * z, x = ox + (-70 + i * 32) * z; ctx.beginPath(); ctx.moveTo(x - w / 2, oy); ctx.lineTo(x - w / 3, oy - hh); ctx.lineTo(x + w / 3, oy - hh * 0.85); ctx.lineTo(x + w / 2, oy); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  }
  if (agotado) { ctx.restore(); const dx = -140, dy = 300 - by - 30, cs = Math.cos(INCLINA), sn = Math.sin(INCLINA); brazo(dx * cs - dy * sn, dx * sn + dy * cs + 30); const cz = J.cabeza ? J.cabeza() : { x: J.x, y: cy }, [tx, ty] = aPant(cz.x + (xJ - J.x), cz.y + 90); ctx.font = '900 16px system-ui'; ctx.textAlign = 'center'; ctx.lineJoin = 'round'; ctx.lineWidth = 5; ctx.strokeStyle = '#1a0a08'; ctx.strokeText('¡NÚCLEO EXPUESTO!', tx, ty); ctx.fillStyle = '#fff'; ctx.fillText('¡NÚCLEO EXPUESTO!', tx, ty); }
  ctx.restore();
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
