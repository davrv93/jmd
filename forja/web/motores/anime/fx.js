// Forja · Anime Battle Engine · efectos visuales anime (§10). Todo es PRESENTACIÓN: no cambia el combate.
// Partículas en arreglos tipados (structure of arrays) con presupuesto fijo: cero objetos nuevos por partícula; las
// que no caben se descartan (el presupuesto lo da el perfil gráfico). Los efectos con forma (ondas, rayos eléctricos,
// cortes, líneas de velocidad, columnas de luz, distorsión) salen de un pool de objetos reciclados.
// Matemática: arcos eléctricos por desplazamiento del punto medio; cortes con curvas de Bézier cuadráticas; auras y
// fuego con ruido simplex; ondas y destellos radiales con trigonometría. Cada efecto acepta intensidad, color,
// duración y densidad; «reducir movimiento» quita sacudidas y «reducir destellos» limita los flashes.
import { crearPool } from '../nucleo/pool.js';
import { crearRuido } from '../nucleo/ruido.js';
import { crearPRNG } from '../nucleo/semilla.js';

const T = { chispa: 0, fuego: 1, polvo: 2, fragmento: 3, energia: 4, humo: 5 };
export function crearFX({ max = 2000, acc = { reducirMovimiento: false, reducirDestellos: false, destello: (t, a) => a }, densidad = 1, intensidad = 1, semilla = 3 } = {}) {
  const x = new Float32Array(max), y = new Float32Array(max), vx = new Float32Array(max), vy = new Float32Array(max), vida = new Float32Array(max), vmax = new Float32Array(max),
    tam = new Float32Array(max), rot = new Float32Array(max), vrot = new Float32Array(max), grav = new Float32Array(max), tipo = new Uint8Array(max), col = new Uint8Array(max);
  let n = 0, descartadas = 0;
  const paleta = [], idx = new Map();
  const color = (c) => { let i = idx.get(c); if (i == null) { i = paleta.length; paleta.push(c); idx.set(c, i); } return i; };
  const rng = crearPRNG(semilla), ruido = crearRuido(semilla);
  const r = () => rng.num();
  const formas = crearPool(() => ({ tipo: '', x: 0, y: 0, t: 0, dur: 0, color: '#fff', a: 0, b: 0, c: 0, d: 0, pts: null, dir: 1 }), 160);
  const fx = { permitirImpacto: true, permitirLineas: true, sacudida: 0, flash: 0, flashColor: '#fff', lineas: 0, lineasDir: 0, impactoCuadro: 0, tiempo: 0, densidad, intensidad, presupuesto: max };
  function emitir(t, cx, cy, ang, dang, vel, dvel, vidaS, tamano, c, g = 0) {
    if (n >= fx.presupuesto) { descartadas++; return; }
    const a = ang + (r() - 0.5) * dang, v = vel + (r() - 0.5) * dvel;
    x[n] = cx; y[n] = cy; vx[n] = Math.cos(a) * v; vy[n] = Math.sin(a) * v; vida[n] = vmax[n] = vidaS * (0.7 + r() * 0.6); tam[n] = tamano * (0.6 + r() * 0.8);
    rot[n] = r() * 6.28; vrot[n] = (r() - 0.5) * 12; grav[n] = g; tipo[n] = t; col[n] = color(c); n++;
  }
  const cuantas = (k) => Math.max(1, Math.round(k * fx.densidad));
  const forma = (o) => { const f = formas.tomar(); if (!f) return null; Object.assign(f, { t: 0, pts: null, a: 0, b: 0, c: 0, d: 0, dir: 1 }, o); return f; };

  // ------------------------------------------------ efectos (coordenadas de MUNDO: x, y hacia arriba en píxeles)
  fx.impacto = (px, py, { fuerza = 8, color: c = '#ffe27a', dir = 1, elemento = null, bloqueado = false } = {}) => {
    const k = fuerza / 8 * fx.intensidad;
    for (let i = 0; i < cuantas(10 * k); i++) emitir(T.chispa, px, py, dir > 0 ? 0 : Math.PI, 2.4, 9 * k, 7, 0.32, 3.2, bloqueado ? '#bfe9ff' : c, -18);
    forma({ tipo: 'onda', x: px, y: py, dur: 0.24, color: bloqueado ? '#bfe9ff' : '#ffffff', a: 10, b: 60 * k });
    if (!bloqueado && fuerza >= 9) { forma({ tipo: 'radial', x: px, y: py, dur: 0.18, color: c, a: 14 + fuerza, b: 30 + fuerza * 6 }); fx.impactoCuadro = Math.max(fx.impactoCuadro, fuerza >= 12 ? 3 : 2); }
    if (elemento === 'electrico') fx.arco(px - 40 * dir, py + 30, px + 30 * dir, py - 20, { color: '#bfe9ff', ramas: 2 });
    if (elemento === 'fuego') fx.fuego(px, py, { cantidad: 14 * k });
    fx.sacudir(fuerza * 0.6 * k);
  };
  fx.sacudir = (v) => { if (!acc.reducirMovimiento) fx.sacudida = Math.min(24, Math.max(fx.sacudida, v)); };
  fx.destellar = (alfa = 0.6, c = '#fff') => { const a = acc.destello(fx.tiempo, alfa); if (a > 0) { fx.flash = Math.max(fx.flash, a); fx.flashColor = c; } };
  fx.chispas = (px, py, { color: c = '#ffe27a', cantidad = 12, vel = 7 } = {}) => { for (let i = 0; i < cuantas(cantidad); i++) emitir(T.chispa, px, py, -Math.PI / 2, 6.28, vel, vel, 0.5, 2.6, c, -16); };
  fx.fuego = (px, py, { color: c = '#ffb35a', cantidad = 16 } = {}) => { for (let i = 0; i < cuantas(cantidad); i++) emitir(T.fuego, px + (r() - 0.5) * 20, py, Math.PI / 2, 1.2, 3.5, 2, 0.6, 10, i % 3 ? c : '#ffe27a', 4); };
  fx.polvo = (px, py, { cantidad = 10, color: c = '#d9cbb8' } = {}) => { for (let i = 0; i < cuantas(cantidad); i++) emitir(T.polvo, px + (r() - 0.5) * 30, py + 4, Math.PI / 2 + (r() > 0.5 ? -1 : 1) * 1.2, 0.8, 2.5, 2, 0.7, 12, c, 0); };
  fx.fragmentos = (px, py, { cantidad = 16, color: c = '#8e889e', fuerza = 9 } = {}) => { for (let i = 0; i < cuantas(cantidad); i++) emitir(T.fragmento, px, py, Math.PI / 2, 2.4, fuerza, fuerza * 0.8, 1.4, 9, i % 4 ? c : '#5a5566', -26); };
  fx.explosion = (px, py, { color: c = '#ffb35a', radio = 90 } = {}) => {
    for (let i = 0; i < cuantas(26); i++) emitir(T.fuego, px, py, 0, 6.28, radio * 0.09, radio * 0.06, 0.7, 14, i % 2 ? c : '#ffe27a', 2);
    for (let i = 0; i < cuantas(12); i++) emitir(T.humo, px, py, Math.PI / 2, 2, 2, 1.5, 1.4, 20, '#5b5266', 1.5);
    forma({ tipo: 'onda', x: px, y: py, dur: 0.4, color: '#ffffff', a: 20, b: radio * 1.6 }); fx.destellar(0.55, '#fff6dd'); fx.sacudir(14);
  };
  fx.ondaExpansiva = (px, py, { color: c = '#ffffff', radio = 220, dur = 0.5 } = {}) => forma({ tipo: 'onda', x: px, y: py, dur, color: c, a: 10, b: radio });
  // rayo eléctrico: desplazamiento del punto medio, recursivo, con ramas
  fx.arco = (x0, y0, x1, y1, { color: c = '#bfe9ff', ramas = 1, dur = 0.14, detalle = 5 } = {}) => {
    const pts = [[x0, y0], [x1, y1]];
    const dividir = (a, b, d, prof) => { if (prof === 0) return [a]; const mx = (a[0] + b[0]) / 2 + (r() - 0.5) * d, my = (a[1] + b[1]) / 2 + (r() - 0.5) * d; return [...dividir(a, [mx, my], d / 2, prof - 1), ...dividir([mx, my], b, d / 2, prof - 1)]; };
    const largo = Math.hypot(x1 - x0, y1 - y0); pts.splice(0, 2, ...dividir([x0, y0], [x1, y1], largo * 0.45, detalle), [x1, y1]);
    forma({ tipo: 'arco', pts, dur, color: c });
    for (let i = 0; i < ramas; i++) { const p = pts[Math.floor(pts.length * (0.3 + r() * 0.4))]; fx.arco(p[0], p[1], p[0] + (r() - 0.5) * largo * 0.6, p[1] + (r() - 0.5) * largo * 0.5, { color: c, ramas: 0, dur, detalle: 3 }); }
  };
  // corte de espada / garra de energía: media luna con dos Bézier
  fx.corte = (px, py, { dir = 1, color: c = '#ffffff', radio = 80, dur = 0.16, giro = 0 } = {}) => forma({ tipo: 'corte', x: px, y: py, dir, dur, color: c, a: radio, b: giro });
  fx.rayoEnergia = (x0, y0, largo, alto, { color: c = '#bfe9ff', dur = 0.12 } = {}) => forma({ tipo: 'haz', x: x0, y: y0, a: largo, b: alto, dur, color: c });
  fx.lineasVelocidad = (dir = 0, fuerza = 1) => { fx.lineas = Math.max(fx.lineas, 0.35 * fuerza); fx.lineasDir = dir; };
  fx.columna = (px, { color: c = '#ffffff', dur = 1.1, ancho = 90 } = {}) => { forma({ tipo: 'columna', x: px, y: 0, dur, color: c, a: ancho }); for (let i = 0; i < cuantas(30); i++) emitir(T.energia, px + (r() - 0.5) * ancho, r() * 40, Math.PI / 2, 0.4, 6, 4, 1, 5, c, 0); };
  fx.teletransporte = (px, py, { color: c = '#bfe9ff' } = {}) => { forma({ tipo: 'franjas', x: px, y: py, dur: 0.3, color: c, a: 60, b: 130 }); fx.chispas(px, py + 60, { color: c, cantidad: 14, vel: 5 }); };
  fx.distorsion = (px, py, { radio = 160, dur = 0.35 } = {}) => { if (!acc.reducirMovimiento) forma({ tipo: 'distorsion', x: px, y: py, dur, a: radio }); };
  fx.aura = (px, py, alto, c, t, fuerza = 1) => {   // se dibuja cada cuadro (no deja objetos): llamas de ruido alrededor del cuerpo
    if (r() < 0.5 * fx.densidad * fuerza) emitir(T.energia, px + (r() - 0.5) * 50, py + r() * alto * 0.8, Math.PI / 2, 0.5, 2.5, 1.5, 0.5, 6, c, 0);
  };

  fx.actualizar = (dt) => {
    fx.tiempo += dt;
    for (let i = 0; i < n; i++) {
      vida[i] -= dt;
      if (vida[i] <= 0) { n--; x[i] = x[n]; y[i] = y[n]; vx[i] = vx[n]; vy[i] = vy[n]; vida[i] = vida[n]; vmax[i] = vmax[n]; tam[i] = tam[n]; rot[i] = rot[n]; vrot[i] = vrot[n]; grav[i] = grav[n]; tipo[i] = tipo[n]; col[i] = col[n]; i--; continue; }
      const k = dt * 60; x[i] += vx[i] * k; y[i] += vy[i] * k; vy[i] += grav[i] * dt; rot[i] += vrot[i] * dt;
      if (tipo[i] === T.fragmento && y[i] < 0) { y[i] = 0; vy[i] *= -0.35; vx[i] *= 0.6; }
      if (tipo[i] === T.fuego) { vx[i] += ruido.s2(x[i] * 0.02, fx.tiempo * 2) * 0.3; }
      if (tipo[i] === T.polvo || tipo[i] === T.humo) { vx[i] *= 0.96; vy[i] *= 0.96; }
    }
    formas.cada((f) => { f.t += dt; });
    formas.soltarSi((f) => f.t >= f.dur);
    fx.sacudida *= Math.pow(0.0009, dt); if (fx.sacudida < 0.2) fx.sacudida = 0;
    fx.flash = Math.max(0, fx.flash - dt * 3.2); fx.lineas = Math.max(0, fx.lineas - dt * 1.6);
    if (fx.impactoCuadro > 0) fx.impactoCuadro--;
  };
  // ctx: CanvasRenderingContext2D; aPant(x, y) → [sx, sy] de mundo a pantalla; escala: px de pantalla por px de mundo
  fx.dibujar = (ctx, aPant, escala = 1) => {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let c = 0; c < paleta.length; c++) {
      ctx.fillStyle = paleta[c];
      for (let i = 0; i < n; i++) {
        if (col[i] !== c || tipo[i] === T.fragmento || tipo[i] === T.humo || tipo[i] === T.polvo) continue;
        const [sx, sy] = aPant(x[i], y[i]), u = vida[i] / vmax[i], s = tam[i] * escala * (tipo[i] === T.fuego ? 0.5 + u : u);
        ctx.globalAlpha = Math.min(1, u * 1.4);
        if (tipo[i] === T.chispa) { ctx.save(); ctx.translate(sx, sy); ctx.rotate(Math.atan2(-vy[i], vx[i])); ctx.fillRect(-s * 2.2, -s * 0.35, s * 4.4, s * 0.7); ctx.restore(); }
        else { ctx.beginPath(); ctx.arc(sx, sy, s, 0, 6.283); ctx.fill(); }
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < n; i++) {
      if (tipo[i] !== T.fragmento && tipo[i] !== T.humo && tipo[i] !== T.polvo) continue;
      const [sx, sy] = aPant(x[i], y[i]), u = vida[i] / vmax[i], s = tam[i] * escala;
      ctx.globalAlpha = tipo[i] === T.fragmento ? Math.min(1, u * 2) : u * 0.5; ctx.fillStyle = paleta[col[i]];
      if (tipo[i] === T.fragmento) { ctx.save(); ctx.translate(sx, sy); ctx.rotate(rot[i]); ctx.fillRect(-s / 2, -s / 2, s, s * 0.7); ctx.strokeStyle = '#1d1828'; ctx.lineWidth = 1.5; ctx.strokeRect(-s / 2, -s / 2, s, s * 0.7); ctx.restore(); }
      else { ctx.beginPath(); ctx.arc(sx, sy, s * (1.6 - u), 0, 6.283); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
    formas.cada((f) => dibujarForma(ctx, f, aPant, escala));
    ctx.restore();
  };
  function dibujarForma(ctx, f, aPant, e) {
    const u = f.t / f.dur, [sx, sy] = aPant(f.x, f.y);
    ctx.save(); ctx.strokeStyle = ctx.fillStyle = f.color;
    if (f.tipo === 'onda') { ctx.globalAlpha = 1 - u; ctx.lineWidth = Math.max(1, 10 * (1 - u) * e); ctx.beginPath(); ctx.ellipse(sx, sy, (f.a + (f.b - f.a) * Math.sqrt(u)) * e, (f.a + (f.b - f.a) * Math.sqrt(u)) * e * 0.62, 0, 0, 6.283); ctx.stroke(); }
    else if (f.tipo === 'radial') { ctx.globalAlpha = 1 - u; ctx.lineWidth = 3 * e; const nR = 14; for (let i = 0; i < nR; i++) { const a = i / nR * 6.283 + i * 0.37; ctx.beginPath(); ctx.moveTo(sx + Math.cos(a) * f.a * e, sy + Math.sin(a) * f.a * e); ctx.lineTo(sx + Math.cos(a) * (f.a + (f.b - f.a) * u) * e, sy + Math.sin(a) * (f.a + (f.b - f.a) * u) * e); ctx.stroke(); } }
    else if (f.tipo === 'arco') { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1 - u * 0.6; ctx.lineJoin = 'round'; for (const [w, a] of [[7, 0.25], [2.5, 1]]) { ctx.lineWidth = w * e; ctx.globalAlpha = a * (1 - u * 0.6); ctx.beginPath(); f.pts.forEach((p, i) => { const [qx, qy] = aPant(p[0], p[1]); i ? ctx.lineTo(qx, qy) : ctx.moveTo(qx, qy); }); ctx.stroke(); } }
    else if (f.tipo === 'corte') {
      const R = f.a * e, a0 = -1.1 + f.b, a1 = 1.1 + f.b, s = f.dir, w = R * 0.32 * (1 - u);
      ctx.globalAlpha = 1 - u; ctx.beginPath();
      const p = (ang, rr) => [sx + s * Math.cos(ang) * rr, sy - Math.sin(ang) * rr];
      const [ax, ay] = p(a0, R), [bx, by] = p(a1, R), [cx1, cy1] = p((a0 + a1) / 2, R * 1.35), [cx2, cy2] = p((a0 + a1) / 2, R * 1.35 - w * 2.2);
      ctx.moveTo(ax, ay); ctx.quadraticCurveTo(cx1, cy1, bx, by); ctx.quadraticCurveTo(cx2, cy2, ax, ay); ctx.fill();
    }
    else if (f.tipo === 'haz') { const [ex] = aPant(f.x + f.a, f.y); ctx.globalCompositeOperation = 'lighter'; const h = f.b * e; for (const [k, a] of [[1, 0.35], [0.45, 0.9]]) { ctx.globalAlpha = a * (1 - u * 0.5); ctx.beginPath(); ctx.moveTo(sx, sy - h * k / 2); for (let i = 0; i <= 12; i++) { const t = i / 12, qx = sx + (ex - sx) * t; ctx.lineTo(qx, sy - h * k / 2 + ruido.s2(t * 6, fx.tiempo * 9) * h * 0.08); } for (let i = 12; i >= 0; i--) { const t = i / 12, qx = sx + (ex - sx) * t; ctx.lineTo(qx, sy + h * k / 2 + ruido.s2(t * 6 + 9, fx.tiempo * 9) * h * 0.08); } ctx.closePath(); ctx.fill(); } }
    else if (f.tipo === 'columna') { ctx.globalCompositeOperation = 'lighter'; const w = f.a * e * (u < 0.15 ? u / 0.15 : 1 - (u - 0.15) * 0.8); const g = ctx.createLinearGradient(sx - w, 0, sx + w, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, f.color); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.globalAlpha = 0.85 * (1 - u * 0.7); ctx.fillRect(sx - w, 0, w * 2, sy); }
    else if (f.tipo === 'franjas') { ctx.globalAlpha = 1 - u; for (let i = 0; i < 8; i++) { const h = f.b * e / 8; ctx.fillRect(sx - f.a * e / 2 + Math.sin(i * 7 + u * 20) * 20 * u * e, sy - f.b * e + i * h, f.a * e * (1 - u), h * 0.55); } }
    else if (f.tipo === 'distorsion') {   // ondulación: franjas del propio lienzo corridas con un seno (sin shaders)
      const cv = ctx.canvas, R = f.a * e, x0 = Math.max(0, sx - R), y0 = Math.max(0, sy - R), w = Math.min(cv.width - x0, R * 2), h = Math.min(cv.height - y0, R * 2), filas = 12;
      if (w > 4 && h > 4) for (let i = 0; i < filas; i++) { const yy = y0 + i * h / filas, off = Math.sin(i * 1.3 + u * 18) * 9 * (1 - u) * e; try { ctx.drawImage(cv, x0, yy, w, h / filas + 1, x0 + off, yy, w, h / filas + 1); } catch { /* lienzo sucio: sin distorsión */ } }
    }
    ctx.restore();
  }
  // capa de pantalla: líneas de velocidad, cuadro de impacto (inversión de 2–3 cuadros), destello
  fx.dibujarPantalla = (ctx, w, h) => {
    if (fx.lineas > 0 && fx.permitirLineas) { ctx.save(); ctx.globalAlpha = Math.min(0.7, fx.lineas); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; const cx = w / 2, cy = h / 2; for (let i = 0; i < 40; i++) { const a = rng.num() * 6.283, r0 = Math.min(w, h) * (0.35 + rng.num() * 0.2), r1 = Math.max(w, h) * 0.8; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); ctx.stroke(); } ctx.restore(); }
    if (fx.impactoCuadro > 0 && fx.permitirImpacto && !acc.reducirDestellos) { ctx.save(); ctx.globalCompositeOperation = 'difference'; ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.85; ctx.fillRect(0, 0, w, h); ctx.restore(); }
    if (fx.flash > 0) { ctx.save(); ctx.globalAlpha = fx.flash; ctx.fillStyle = fx.flashColor; ctx.fillRect(0, 0, w, h); ctx.restore(); }
  };
  Object.defineProperty(fx, 'particulas', { get: () => n });
  Object.defineProperty(fx, 'descartadas', { get: () => descartadas });
  Object.defineProperty(fx, 'formas', { get: () => formas.activos });
  return fx;
}
