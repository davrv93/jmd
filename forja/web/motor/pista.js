// Forja · pista jugable. Motor 2D mínimo en lienzo: el personaje recién forjado corre el nivel de prueba con su
// propia hoja de sprites, su física por reglas, sus sonidos, monedas, un par de enemigos y la meta.
import { nivel as crearNivel, fisicaJugable, LOSA, VISTA, SUELO_Y } from './nivel.js';
import { sonar } from './sonido.js';

const TECLAS = { ArrowLeft: 'izq', a: 'izq', A: 'izq', ArrowRight: 'der', d: 'der', D: 'der', ArrowUp: 'salto', w: 'salto', W: 'salto', ' ': 'salto', ArrowDown: 'abajo', s: 'abajo', S: 'abajo', x: 'golpe', X: 'golpe', j: 'golpe', J: 'golpe' };

export function crearPista(lienzo, D) {
  // D: { spec, hoja (hojaSprites), enemigo: { spec, hoja }, escenario, objetos (hojaObjetos), sonidos (banco), semilla, alTerminar }
  const ctx = lienzo.getContext('2d'); lienzo.width = VISTA.w; lienzo.height = VISTA.h;
  const N = crearNivel(D.semilla), F = fisicaJugable(D.spec.fisica), K = {}, parts = [];
  const anim = Object.fromEntries(D.hoja.animaciones.map((a, fila) => [a.clave, { ...a, fila }]));
  const animE = Object.fromEntries(D.enemigo.hoja.animaciones.map((a, fila) => [a.clave, { ...a, fila }]));
  const TAM = 150, medidas = (h) => ({ w: Math.max(30, TAM * h.relAncho * 0.6), h: Math.max(40, TAM * h.relAlto * 0.92) });
  const mJ = medidas(D.hoja), mE = medidas(D.enemigo.hoja);
  const J = { x: N.inicio.x, y: N.inicio.y, vx: 0, vy: 0, mira: 1, suelo: false, anim: 'quieto', t: 0, golpe: 0, inmune: 0, vidas: 3, muerto: 0, gana: false, paso: 0 };
  const enemigos = N.enemigos.map((e) => ({ ...e, dir: -1, t: 0, muere: 0 }));
  const monedas = N.monedas.map((m) => ({ ...m, viva: true })), extras = [{ ...N.gema, id: 'gema', viva: true }, { ...N.corazon, id: 'corazon', viva: true }];
  let camX = 0, puntos = 0, tiempo = 0, fin = false, activo = true, previo = performance.now();
  const sfx = (n, v) => D.sonidos[n] && sonar(D.sonidos[n], v);
  const polvo = (x, y, n, color, fuerza = 1) => { for (let i = 0; i < n; i++) parts.push({ x, y, vx: (Math.random() - 0.5) * 220 * fuerza, vy: -Math.random() * 200 * fuerza, t: 0, d: 0.35 + Math.random() * 0.3, r: 3 + Math.random() * 5, color }); };

  // superficies sólidas: tramos de suelo y plataformas (estas últimas solo se pisan desde arriba)
  const pisoEn = (x, yAntes, yAhora) => {
    let mejor = null;
    const col = Math.floor(x / LOSA);
    if (x >= 0 && x < N.ancho && N.suelo[col] && yAntes <= SUELO_Y + 1 && yAhora >= SUELO_Y) mejor = SUELO_Y;
    for (const p of N.plataformas) if (x > p.x - 6 && x < p.x + p.w * LOSA + 6 && yAntes <= p.y + 1 && yAhora >= p.y && (mejor == null || p.y < mejor)) mejor = p.y;
    return mejor;
  };
  function reaparecer() { J.x = Math.max(N.inicio.x, J.xSeguro ?? N.inicio.x); J.y = SUELO_Y - 4; J.vx = J.vy = 0; J.inmune = 1.5; J.muerto = 0; if (J.vidas <= 0) { J.vidas = 3; J.x = N.inicio.x; } }
  function herir() { if (J.inmune > 0 || J.gana) return; J.vidas--; J.inmune = 1.2; J.vy = -420; J.vx = -J.mira * 260; sfx('dano', 0.6); polvo(J.x, J.y - mJ.h / 2, 8, '#ff7a66'); if (J.vidas <= 0) { J.muerto = 1.3; sfx('morir', 0.6); } }

  function paso(dt) {
    tiempo += fin ? 0 : dt; J.t += dt; J.inmune = Math.max(0, J.inmune - dt); J.golpe = Math.max(0, J.golpe - dt);
    if (J.muerto > 0) { J.muerto -= dt; J.vy += F.gravedad * dt; const y0 = J.y; J.y += J.vy * dt; const p = pisoEn(J.x, y0, J.y); if (p != null && J.vy > 0) { J.y = p; J.vy = 0; } if (J.muerto <= 0) reaparecer(); }
    else if (!J.gana) {
      const dir = (K.der ? 1 : 0) - (K.izq ? 1 : 0), agach = K.abajo && J.suelo;
      const obj = agach ? 0 : dir * F.velocidad;
      J.vx += (obj - J.vx) * Math.min(1, dt * (J.suelo ? 12 : 6));
      if (dir) J.mira = dir;
      if (K.salto && J.suelo && !agach) { J.vy = -F.salto; J.suelo = false; sfx('salto', 0.45); polvo(J.x, J.y, 5, 'rgba(255,255,255,.7)', 0.5); }
      if (!K.salto && J.vy < -260) J.vy = -260; // salto corto si se suelta la tecla
      if (K.golpe && J.golpe <= 0) { J.golpe = 0.38; K.golpe = false; sfx('golpe', 0.5); }
      J.vy += F.gravedad * dt;
      J.x = Math.max(20, Math.min(N.ancho - 20, J.x + J.vx * dt));
      const y0 = J.y; J.y += J.vy * dt;
      const p = J.vy >= 0 ? pisoEn(J.x, y0, J.y) : null, antes = J.suelo;
      if (p != null) { J.y = p; if (!antes && J.vy > 300) polvo(J.x, J.y, 6, 'rgba(255,255,255,.7)', 0.6); J.vy = 0; J.suelo = true; if (N.suelo[Math.floor(J.x / LOSA)] && p === SUELO_Y) J.xSeguro = J.x; } else J.suelo = false;
      if (J.y > VISTA.h + 200) { J.vidas--; sfx('dano', 0.6); if (J.vidas <= 0) sfx('morir', 0.5); reaparecer(); }
      if (J.suelo && Math.abs(J.vx) > 60) { J.paso -= dt; if (J.paso <= 0) { J.paso = 0.26; sfx('paso', 0.25); } }
      // monedas, gema, corazón
      for (const m of monedas) if (m.viva && Math.abs(m.x - J.x) < 34 && Math.abs(m.y - (J.y - mJ.h / 2)) < mJ.h / 2 + 22) { m.viva = false; puntos++; sfx('moneda', 0.4); polvo(m.x, m.y, 6, '#ffd94a', 0.6); }
      for (const e of extras) if (e.viva && Math.abs(e.x - J.x) < 38 && Math.abs(e.y - (J.y - mJ.h / 2)) < mJ.h / 2 + 26) { e.viva = false; sfx('celebrar', 0.4); polvo(e.x, e.y, 12, e.id === 'gema' ? '#7fe9ff' : '#ff6b8a'); if (e.id === 'gema') puntos += 5; else J.vidas = Math.min(5, J.vidas + 1); }
      if (Math.abs(J.x - N.meta.x) < 40 && J.suelo) { J.gana = true; fin = true; J.t = 0; sfx('celebrar', 0.6); polvo(J.x, J.y - mJ.h, 26, '#c6ff4a', 1.4); D.alTerminar?.({ puntos, total: monedas.length + 5, tiempo }); }
    }
    for (const e of enemigos) {
      e.t += dt;
      if (e.muere > 0) { e.muere -= dt; continue; }
      if (e.muere < 0) continue;
      e.x += e.dir * 70 * dt; if (e.x < e.min) e.dir = 1; if (e.x > e.max) e.dir = -1;
      const cerca = Math.abs(e.x - J.x) < (mJ.w + mE.w) / 2 + 8 && J.y > SUELO_Y - mE.h - 10 && J.y <= SUELO_Y + 2;
      const alcance = J.golpe > 0.12 && Math.abs(e.x - (J.x + J.mira * 46)) < 70 && Math.abs(J.y - SUELO_Y) < 80;
      const pisa = cerca && J.vy > 200 && J.y < SUELO_Y - mE.h * 0.45;
      if (alcance || pisa) { e.muere = 0.8; e.t = 0; puntos += 3; sfx('golpe', 0.5); polvo(e.x, SUELO_Y - mE.h / 2, 14, '#fff', 1.1); if (pisa) J.vy = -520; }
      else if (cerca && J.muerto <= 0) herir();
    }
    for (const e of enemigos) if (e.muere <= 0 && e.muere !== 0 && e.muere > -1) e.muere = -1;
    for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.t += dt; p.vy += 520 * dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.t > p.d) parts.splice(i, 1); }
    // qué animación toca
    const a = J.muerto > 0 ? 'morir' : J.gana ? 'celebrar' : J.inmune > 0.9 ? 'dano' : J.golpe > 0 ? 'golpe' : !J.suelo ? 'saltar' : K.abajo ? 'agachado' : Math.abs(J.vx) > 250 ? 'correr' : Math.abs(J.vx) > 40 ? 'caminar' : 'quieto';
    if (a !== J.anim) { J.anim = a; J.t = 0; }
    camX += (Math.max(0, Math.min(N.ancho - VISTA.w, J.x - VISTA.w * 0.4)) - camX) * Math.min(1, dt * 6);
  }

  function cuadroDe(tabla, a, t, unaVez) { const A = tabla[a] || tabla.quieto; let i = Math.floor(t * A.fps); i = unaVez || A.repetir === 0 ? Math.min(A.cuadros - 1, i) : i % A.cuadros; return [i, A.fila]; }
  function sprite(h, i, fila, x, y, mira, alfa = 1) {
    const px = h.px, yPie = TAM * 0.96; // los pies quedan al 96 % del alto del cuadro
    ctx.save(); ctx.globalAlpha = alfa; ctx.translate(Math.round(x - camX), Math.round(y)); ctx.scale(mira, 1);
    ctx.drawImage(h.hoja, i * px, fila * px, px, px, -TAM / 2, -yPie, TAM, TAM); ctx.restore();
  }
  function objeto(id, x, y, t, tam = 46) { const o = D.objetos, fila = o.ids.indexOf(id), i = Math.floor(t * 9) % o.cuadros; ctx.drawImage(o.hoja, i * o.px, fila * o.px, o.px, o.px, Math.round(x - camX - tam / 2), Math.round(y - tam / 2), tam, tam); }

  function dibujar() {
    const E = D.escenario;
    ctx.drawImage(E.cielo, 0, 0);
    E.capas.forEach((c, i) => { const f = [0.12, 0.3, 0.55][i], ox = -((camX * f) % E.ancho); ctx.drawImage(c, ox, 0); ctx.drawImage(c, ox + E.ancho, 0); });
    const c0 = Math.floor(camX / LOSA);
    for (let c = c0; c <= c0 + VISTA.w / LOSA + 1; c++) if (N.suelo[c]) { ctx.drawImage(E.losas, 0, 0, LOSA, LOSA, c * LOSA - Math.round(camX), SUELO_Y, LOSA, LOSA); }
    for (const p of N.plataformas) for (let i = 0; i < p.w; i++) ctx.drawImage(E.losas, (i === 0 ? 2 : i === p.w - 1 ? 4 : 3) * LOSA, 0, LOSA, 30, p.x + i * LOSA - Math.round(camX), p.y, LOSA, 30);
    objeto('meta', N.meta.x, N.meta.y - 60, tiempo, 120);
    for (const m of monedas) if (m.viva) objeto('moneda', m.x, m.y + Math.sin(tiempo * 4 + m.x) * 3, tiempo + m.x * 0.01);
    for (const e of extras) if (e.viva) objeto(e.id, e.x, e.y + Math.sin(tiempo * 3) * 5, tiempo, 58);
    for (const e of enemigos) { if (e.muere === -1) continue; const [i, f] = cuadroDe(animE, e.muere > 0 ? 'morir' : 'caminar', e.t, e.muere > 0); sprite(D.enemigo.hoja, i, f, e.x, SUELO_Y, e.dir, e.muere > 0 ? Math.min(1, e.muere * 2.5) : 1); }
    const [i, f] = cuadroDe(anim, J.anim, J.t, ['morir', 'golpe', 'dano'].includes(J.anim));
    sprite(D.hoja, J.anim === 'saltar' ? Math.max(1, Math.min(6, Math.round(3.5 + J.vy / 260))) : i, f, J.x, J.y, J.mira, J.inmune > 0 && Math.floor(J.inmune * 14) % 2 ? 0.45 : 1);
    for (const p of parts) { ctx.globalAlpha = 1 - p.t / p.d; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x - camX, p.y, p.r * (1 - p.t / p.d * 0.5), 0, 6.283); ctx.fill(); }
    ctx.globalAlpha = 1;
    // marcador
    ctx.font = '800 22px Figtree, system-ui, sans-serif'; ctx.textBaseline = 'middle';
    const caja = (x, w) => { ctx.fillStyle = 'rgba(15,12,24,.62)'; ctx.beginPath(); ctx.roundRect(x, 14, w, 38, 19); ctx.fill(); };
    caja(14, 104); ctx.drawImage(D.objetos.hoja, 0, D.objetos.ids.indexOf('moneda') * D.objetos.px, D.objetos.px, D.objetos.px, 20, 17, 32, 32); ctx.fillStyle = '#fff'; ctx.fillText(String(puntos), 58, 34);
    caja(128, 30 + J.vidas * 30); for (let v = 0; v < J.vidas; v++) ctx.drawImage(D.objetos.hoja, 0, D.objetos.ids.indexOf('corazon') * D.objetos.px, D.objetos.px, D.objetos.px, 138 + v * 30, 18, 30, 30);
    const s = Math.floor(tiempo); caja(VISTA.w - 104, 90); ctx.fillStyle = '#fff'; ctx.fillText(`${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`, VISTA.w - 78, 34);
    if (fin) { ctx.fillStyle = 'rgba(15,12,24,.7)'; ctx.beginPath(); ctx.roundRect(VISTA.w / 2 - 250, 190, 500, 130, 24); ctx.fill(); ctx.textAlign = 'center'; ctx.fillStyle = '#c6ff4a'; ctx.font = '900 40px Unbounded, system-ui, sans-serif'; ctx.fillText('¡Meta!', VISTA.w / 2, 236); ctx.fillStyle = '#fff'; ctx.font = '700 20px Figtree, system-ui, sans-serif'; ctx.fillText(`${puntos} puntos · ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} · R para repetir`, VISTA.w / 2, 286); ctx.textAlign = 'left'; }
  }

  function bucle(ahora) { if (!activo) return; requestAnimationFrame(bucle); let dt = Math.min(0.05, (ahora - previo) / 1000); previo = ahora; for (; dt > 0; dt -= 1 / 120) paso(Math.min(dt, 1 / 120)); dibujar(); }
  const baja = (e) => { if (e.key === 'r' || e.key === 'R') { D.alRepetir?.(); return; } const k = TECLAS[e.key]; if (k) { e.preventDefault(); if (k === 'golpe' && e.repeat) return; K[k] = true; } };
  const sube = (e) => { const k = TECLAS[e.key]; if (k) K[k] = false; };
  addEventListener('keydown', baja); addEventListener('keyup', sube);
  requestAnimationFrame((t) => { previo = t; bucle(t); });
  return {
    tecla: (k, v) => { K[k] = v; }, estado: () => ({ x: J.x, y: J.y, puntos, vidas: J.vidas, fin, anim: J.anim, tiempo }),
    detener() { activo = false; removeEventListener('keydown', baja); removeEventListener('keyup', sube); },
  };
}
