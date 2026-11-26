// Forja · Anime Battle Engine · jefes de gran tamaño (Titan Awakening, §4 boss battle, DEMO B).
// El jefe es una entidad del combate con su propia lógica (actualizar), varias hurtboxes con multiplicador (núcleo
// expuesto = punto débil), superarmadura y ataques TELEGRAFIADOS: primero un aviso visible en el suelo o en el aire
// (avisos[] con progreso 0→1), luego la hitbox activa, luego una ventana de recuperación para castigarlo.
// Fases por porcentaje de vida; entre fases, una cinemática del director. Elige ataques con Utility AI + enfriamientos
// usando el PRNG de la partida: con la misma semilla y las mismas entradas, la pelea se repite exacta.
import { crearBuffer } from './buffer.js';

export const JEFES = {
  gaiaron: {
    id: 'gaiaron', nombre: 'Gaiaron, el Titán Dormido', clase: 'Coloso de piedra', salud: 5200, defensa: 1, masa: 20, ancho: 260, alto: 430, elemento: 'tierra',
    debilidades: { electrico: 1.1, fuego: 0.95 }, colores: { piedra: '#6f6a7d', piedra2: '#8e889e', grieta: '#ffb35a', nucleo: '#ffd27a', musgo: '#5f8f5a' },
    fases: [
      { hasta: 0.6, nombre: 'Despertar', velAviso: 1, ataques: ['puno', 'barrido', 'onda', 'lluvia'], agotadoCada: 4 },
      { hasta: 0.25, nombre: 'Segunda forma', velAviso: 1.25, ataques: ['puno', 'barrido', 'onda', 'lluvia', 'rayo'], agotadoCada: 4, cinematica: 'fase' },
      { hasta: 0, nombre: 'Furia del núcleo', velAviso: 1.5, ataques: ['puno', 'barrido', 'rayo', 'lluvia', 'onda', 'doble'], agotadoCada: 5, cinematica: 'fase' },
    ],
    ataques: {
      puno:    { nombre: 'Puño sísmico', aviso: 52, activo: 8, recuperacion: 62, dano: 120, aturd: 30, empuje: [10, 12], pausa: 12, ancho: 170, mano: true },
      barrido: { nombre: 'Barrido de cantera', aviso: 46, activo: 44, recuperacion: 40, dano: 95, aturd: 26, empuje: [11, 9], pausa: 10, alto: 64 },
      onda:    { nombre: 'Pisotón', aviso: 40, activo: 70, recuperacion: 46, dano: 80, aturd: 24, empuje: [6, 13], pausa: 9, alto: 46, vel: 9 },
      lluvia:  { nombre: 'Lluvia de rocas', aviso: 64, activo: 26, recuperacion: 36, dano: 70, aturd: 22, empuje: [3, 6], pausa: 8, rocas: 5, ancho: 90 },
      rayo:    { nombre: 'Mirada del núcleo', aviso: 50, activo: 40, recuperacion: 50, dano: 30, golpes: 4, cadaGolpe: 10, aturd: 14, empuje: [4, 2], pausa: 5, altoRayo: 60 },
      doble:   { nombre: 'Doble impacto', aviso: 38, activo: 8, recuperacion: 70, dano: 110, aturd: 30, empuje: [9, 12], pausa: 12, ancho: 150, mano: true, veces: 2 },
    },
  },
};

export function crearJefe(combate, def, { x = 420, eq = 1, reglasJefe = {} } = {}) {
  const R = { danoMul: 1, avisoMul: 1, agotadoMul: 1, nucleoMul: 1.6, manoVulnerable: true, rocas: null, ondaVel: null, empujeMul: 1, recuperacionMul: 1, repetir: false, lluviaApunta: true, enfurecido: null, ...reglasJefe };
  const rng = combate.prng;
  const J = combate.agregar({ def: { ...def, movimientos: {}, hurtbox: { depie: { x: -def.ancho / 2, y: 0, w: def.ancho, h: def.alto } }, saltosAereos: 0, resistencia: 100, salud: def.salud, velocidad: 1, aceleracion: 1, salto: 0, sonidos: {}, efectos: {} }, eq, x, dir: -1, control: 'jefe' });
  Object.assign(J, { armadura: true, tipo: 'jefe', ancho: def.ancho, alto: def.alto, masa: def.masa, buffer: crearBuffer(), fase: 0, ataque: null, t: 0, avisos: [], rocas: [], ondas: [], hechos: 0, agotado: 0, espera: 90, ultimo: null, enfria: {}, dormido: true, cambioFase: null });
  const objetivo = () => combate.rival(J);
  const inst = () => ({ id: Math.floor(rng.num() * 1e9), golpeados: new Map() });
  J.hurtboxes = () => {
    const b = [{ x: J.x - def.ancho * 0.36, y: 0, w: def.ancho * 0.72, h: def.alto * 0.78, zona: 'cuerpo', mul: 1 }];
    const bajo = J.agotado > 0;   // agotado: se arrodilla y el núcleo de la cabeza queda al alcance
    b.push({ x: J.x - 55, y: bajo ? 120 : def.alto * 0.8, w: 110, h: 90, zona: 'nucleo', mul: bajo ? R.nucleoMul : 1.15 });
    if (R.manoVulnerable && J.ataque?.mano && J.t > J.ataque.avisoF) b.push({ x: J.ataque.xMano - 70, y: 0, w: 140, h: 70, zona: 'mano', mul: 1.3 });
    return b;
  };
  J.hitboxes = () => {
    const a = J.ataque, out = []; if (!a || J.t < a.avisoF || J.t >= a.avisoF + a.activo) return out;
    const k = (J.t - a.avisoF) / a.activo;
    const mov = { ...a, id: a.id, tipo: 'jefe', prioridad: 8, aturdB: 18, imbloqueable: !!a.mano, caja: { y: 0 }, golpes: a.golpes || 1, malabar: 1, contra: false, gana: 0, dano: a.dano * R.danoMul, empuje: [a.empuje[0] * R.empujeMul, a.empuje[1] * R.empujeMul] };
    if (a.id === 'puno' || a.id === 'doble') out.push({ x: a.xMano - a.ancho / 2, y: 0, w: a.ancho, h: 120, mov, inst: a.inst, fx: J.x });
    if (a.id === 'barrido') { const x = J.x - 120 - k * 1200; out.push({ x: x - 80, y: 0, w: 160, h: a.alto, mov, inst: a.inst, fx: x + 200 }); }
    if (a.id === 'onda') for (const o of J.ondas) out.push({ x: o.x - 40, y: 0, w: 80, h: a.alto, mov, inst: o.inst, fx: o.x - o.dir * 50 });
    if (a.id === 'lluvia') for (const r of J.rocas) if (r.y < 140 && r.y > -10) out.push({ x: r.x - 40, y: r.y, w: 80, h: 80, mov, inst: r.inst, fx: r.x });
    if (a.id === 'rayo') out.push({ x: combate.limites.izq, y: a.yRayo, w: J.x - 80 - combate.limites.izq, h: a.altoRayo, mov, inst: a.inst, fx: J.x });
    return out;
  };
  function elegir(op) {
    const f = def.fases[J.fase], d = Math.abs(op.x - J.x);
    const u = f.ataques.map((id) => {
      let s = 1 + rng.num() * 0.6;
      if (id === 'puno' || id === 'doble') s += d < 450 ? 0.8 : 0.1;
      if (id === 'barrido') s += op.suelo ? 0.6 : -0.4;
      if (id === 'onda') s += d > 250 ? 0.5 : 0.2;
      if (id === 'lluvia') s += d > 300 ? 0.7 : 0.3;
      if (id === 'rayo') s += 0.4;
      if (J.ultimo === id && !R.repetir) s -= 1.2;                 // no repetir el mismo dos veces seguidas
      if ((J.enfria[id] || 0) > combate.cuadro) s -= 2;
      return s;
    });
    return f.ataques[u.indexOf(Math.max(...u))];
  }
  function empezar(id, op) {
    const b = def.ataques[id], f = def.fases[J.fase];
    const vel = J.fase === def.fases.length - 1 && R.enfurecido ? R.enfurecido : f.velAviso;
    const a = { ...b, id, t0: combate.cuadro, avisoF: Math.round(b.aviso / vel * R.avisoMul), inst: inst(), veces: b.veces || 1, vel: R.ondaVel ?? b.vel };
    a.recuperacion = Math.round(b.recuperacion * (J.fase === 2 ? 0.8 : 1) * R.recuperacionMul);
    J.ataque = a; J.t = 0; J.ultimo = id; J.enfria[id] = combate.cuadro + 240; J.avisos = []; J.rocas = []; J.ondas = [];
    // el aviso apunta a donde ESTÁ el jugador al empezar (no lo persigue: se puede esquivar moviéndose)
    if (a.mano) { a.xMano = Math.max(combate.limites.izq + 90, Math.min(J.x - 160, op.x)); J.avisos.push({ tipo: 'suelo', x: a.xMano - a.ancho / 2, w: a.ancho, y: 0, h: 14 }); }
    if (id === 'barrido') J.avisos.push({ tipo: 'franja', x: combate.limites.izq, w: J.x - combate.limites.izq - 120, y: 0, h: a.alto, d: 'salta' });
    if (id === 'onda') J.avisos.push({ tipo: 'franja', x: combate.limites.izq, w: J.x - combate.limites.izq, y: 0, h: a.alto, d: 'salta' });
    if (id === 'rayo') { a.yRayo = rng.prob(0.5) ? 70 : 6; J.avisos.push({ tipo: 'linea', x: combate.limites.izq, w: J.x - combate.limites.izq - 80, y: a.yRayo, h: a.altoRayo, d: a.yRayo > 30 ? 'agáchate' : 'salta' }); }
    if (id === 'lluvia') { const n = (R.rocas ?? a.rocas) + J.fase * 2; for (let i = 0; i < n; i++) { const x = combate.limites.izq + 80 + rng.num() * (J.x - combate.limites.izq - 260); J.rocas.push({ x, y: 900, vy: 0, inst: inst() }); J.avisos.push({ tipo: 'suelo', x: x - a.ancho / 2, w: a.ancho, y: 0, h: 14 }); } if (R.lluviaApunta) { J.rocas.push({ x: op.x, y: 960, vy: 0, inst: inst() }); J.avisos.push({ tipo: 'suelo', x: op.x - 45, w: 90, y: 0, h: 14 }); } }
    combate.eventos.push({ cuadro: combate.cuadro, tipo: 'jefeAviso', id: J.id, ataque: id, nombre: b.nombre });
  }
  J.actualizar = (c) => {
    J.f++; J.px = J.x; J.pausa = 0;
    const op = objetivo();
    if (J.ko) { J.ataque = null; J.avisos = []; return; }
    if (J.dormido) return;
    // cambio de fase por vida
    const pct = J.vida / J.vidaMax;
    while (J.fase < def.fases.length - 1 && pct <= def.fases[J.fase].hasta) { J.fase++; J.ataque = null; J.avisos = []; J.agotado = 0; J.espera = 70; c.eventos.push({ cuadro: c.cuadro, tipo: 'jefeFase', id: J.id, fase: J.fase, nombre: def.fases[J.fase].nombre, cinematica: def.fases[J.fase].cinematica || null }); }
    // el cuerpo del titán empuja al jugador (no se le atraviesa)
    for (const L of c.luchadores) if (L.activo && L.eq !== J.eq && L.y < def.alto * 0.7) { const borde = J.x - def.ancho * 0.36 - L.ancho / 2; if (L.x > borde) { L.x = borde; if (L.vx > 0) L.vx = 0; } }
    if (!op) return;
    if (J.agotado > 0) { J.agotado--; if (J.agotado === 0) c.eventos.push({ cuadro: c.cuadro, tipo: 'jefeSeLevanta', id: J.id }); return; }
    if (!J.ataque) {
      if (--J.espera > 0) return;
      if (J.hechos > 0 && J.hechos % def.fases[J.fase].agotadoCada === 0 && !J._agotoEn?.[J.hechos]) { (J._agotoEn ||= {})[J.hechos] = 1; J.agotado = Math.round(150 * R.agotadoMul); c.eventos.push({ cuadro: c.cuadro, tipo: 'jefeAgotado', id: J.id }); return; }
      empezar(elegir(op), op); return;
    }
    const a = J.ataque; J.t++;
    for (const av of J.avisos) av.p = Math.min(1, J.t / a.avisoF);
    if (J.t === a.avisoF) { c.eventos.push({ cuadro: c.cuadro, tipo: 'jefeGolpe', id: J.id, ataque: a.id, x: a.xMano ?? J.x - 200 }); J.avisos = []; if (a.id === 'onda') J.ondas = [{ x: J.x - 120, dir: -1, inst: inst() }]; }
    if (a.id === 'onda') for (const o of J.ondas) o.x += o.dir * a.vel;
    if (a.id === 'lluvia' && J.t >= a.avisoF - 22) for (const r of J.rocas) { r.vy -= 1.6; r.y = Math.max(-60, r.y + r.vy); if (r.y <= 0 && !r.cayo) { r.cayo = true; c.eventos.push({ cuadro: c.cuadro, tipo: 'roca', x: r.x }); } }
    if (J.t >= a.avisoF + a.activo + a.recuperacion) {
      if (--a.veces > 0) { const o = objetivo(); J.t = 0; a.inst = inst(); a.xMano = Math.max(c.limites.izq + 90, Math.min(J.x - 160, o.x)); J.avisos = [{ tipo: 'suelo', x: a.xMano - a.ancho / 2, w: a.ancho, y: 0, h: 14 }]; a.avisoF = Math.round(a.avisoF * 0.7); return; }
      J.ataque = null; J.hechos++; J.espera = Math.round((J.fase === 2 ? 26 : 44) * R.avisoMul); J.ondas = []; J.rocas = [];
    }
  };
  J.despertar = () => { J.dormido = false; J.espera = 60; };
  return J;
}
