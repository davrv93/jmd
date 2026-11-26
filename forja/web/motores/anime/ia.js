// Forja · Anime Battle Engine · IA de combate (§13). Sin LLM: un árbol de comportamiento (selector de prioridades)
// arriba, una FSM de planes (secuencias de teclas con tiempo) abajo y Utility AI para elegir qué hacer en neutro.
// La CPU NO lee el estado real del jugador: lo PERCIBE con retraso (tiempo de reacción humano configurable) a través de
// un historial de instantáneas, predice su posición con su velocidad y aprende de sus patrones recientes.
// Produce la misma entrada que un humano ({ x, y, recien, abajo }) y pasa por el mismo buffer y las mismas reglas.
import { ESTADOS } from './estados.js';
import { crearPRNG } from '../nucleo/semilla.js';

export const NIVELES = {
  principiante: { reaccionMs: 430, error: 0.35, bloqueo: 0.22, parada: 0, castigo: 0.12, comboLargo: 1, adapta: 0, agresion: 0.35, piensaCada: 22, antiaereo: 0.1 },
  intermedio:   { reaccionMs: 320, error: 0.2,  bloqueo: 0.45, parada: 0.03, castigo: 0.35, comboLargo: 2, adapta: 0.35, agresion: 0.5, piensaCada: 16, antiaereo: 0.3 },
  avanzado:     { reaccionMs: 240, error: 0.1,  bloqueo: 0.65, parada: 0.08, castigo: 0.6, comboLargo: 3, adapta: 0.6, agresion: 0.6, piensaCada: 12, antiaereo: 0.55 },
  experto:      { reaccionMs: 185, error: 0.05, bloqueo: 0.8,  parada: 0.15, castigo: 0.8, comboLargo: 4, adapta: 0.85, agresion: 0.65, piensaCada: 9, antiaereo: 0.75 },
  jefe:         { reaccionMs: 160, error: 0.03, bloqueo: 0.85, parada: 0.2, castigo: 0.9, comboLargo: 5, adapta: 1, agresion: 0.75, piensaCada: 8, antiaereo: 0.85 },
};

// combos que la CPU sabe hacer, por largo (se filtran por los movimientos que tenga el personaje)
const COMBOS = [
  ['ligero', 'ligero2', 'fuerte'], ['bajoLigero', 'bajoMedio', 'especial'], ['ligero', 'ligero2', 'medio', 'fuerte', 'especial'],
  ['bajoMedio', 'lanzador'], ['medio', 'fuerte', 'especial'], ['ligero', 'medio', 'fuerte', 'antiaereo'],
];
const ENTRADA = { ligero: [0, 0, 'ligero'], ligero2: [0, 0, 'ligero'], medio: [0, 0, 'medio'], fuerte: [0, 0, 'fuerte'], bajoLigero: [0, 1, 'ligero'], bajoMedio: [0, 1, 'medio'], lanzador: [0, 1, 'fuerte'] };

export function crearIA(L, combate, { nivel = 'intermedio', semilla = 7, ajustes = {} } = {}) {
  const N = { ...NIVELES[nivel] || NIVELES.intermedio, ...ajustes }, rng = crearPRNG(semilla);
  const retraso = Math.max(1, Math.round(N.reaccionMs / (1000 / 60)));
  const memoria = [], plan = [], patrones = { salto: 0, impulso: 0, especial: 0, bloqueo: 0, total: 0, ultimo: null, secuencia: {} };
  let foco = 'neutro', hasta = 0, sostener = { x: 0, y: 0, bloq: false }, cuadro = 0;
  const ia = { L, nivel, N, get foco() { return foco; }, patrones, get plan() { return plan.length; } };

  function percibir() {   // instantánea del rival este cuadro; la IA solo usa la de hace `retraso` cuadros
    const op = combate.rival(L); if (!op) return null;
    memoria.push({ x: op.x, y: op.y, vx: op.vx, vy: op.vy, estado: op.estado, mov: op.mov?.id || null, movF: op.movF, arr: op.mov?.arranque ?? 0, act: op.mov?.activo ?? 0, rec: op.mov?.recuperacion ?? 0, suelo: op.suelo, vida: op.vida, bajo: !!op.mov?.bajo, proy: combate.proyectiles.some((p) => p.eq !== L.eq && Math.abs(p.x - L.x) < 300 && Math.sign(p.vx) === Math.sign(L.x - p.x)) });
    if (memoria.length > retraso + 2) memoria.shift();
    return memoria.length > retraso ? memoria[memoria.length - 1 - retraso] : null;
  }
  // patrones recientes: qué hace el jugador y qué hace después de qué (para adaptarse a lo repetitivo)
  ia.observar = (eventos) => {
    const op = combate.rival(L); if (!op) return;
    for (const e of eventos) {
      if (e.id !== op.id) continue;
      const k = e.tipo === 'movimiento' ? (op.def.movimientos[e.mov]?.tipo === 'especial' ? 'especial' : 'ataque') : e.tipo === 'salto' ? 'salto' : e.tipo === 'impulso' ? 'impulso' : e.tipo === 'estado' && e.estado === 'bloqueo' ? 'bloqueo' : null;
      if (!k) continue;
      patrones[k] = (patrones[k] || 0) * 0.92 + 1; patrones.total = patrones.total * 0.92 + 1;
      if (patrones.ultimo) { const s = patrones.ultimo + '>' + k; patrones.secuencia[s] = (patrones.secuencia[s] || 0) * 0.9 + 1; }
      patrones.ultimo = k;
    }
  };
  const tendencia = (k) => (patrones.total > 2 ? (patrones[k] || 0) / patrones.total : 0) * N.adapta;
  const tiene = (k) => !!L.def.movimientos[k];
  // alcance real de un golpe: borde lejano de su hitbox + media hurtbox del rival (distancia entre centros a la que pega)
  const alcance = (k, op) => { const m = L.def.movimientos[k], b = m?.caja; if (!b || m.proyectil) return 0; return b.x + b.w * (L.def.alcance || 1) + (op?.def?.hurtbox?.depie?.w ?? 44) / 2 + (m.avance || 0) * m.arranque * 0.3; };
  const adelante = (op) => Math.sign(op.x - L.x) || L.dir;

  // ---- planes: lista de { en: cuadro relativo, x, y, r: botones recién apretados, sostener }
  function planCombo(lista, op) {
    plan.length = 0; let t = 0, prev = null;
    for (const k of lista) {
      const m = L.def.movimientos[k]; if (!m) break;
      if (prev) t += prev.ventana ? prev.ventana[0] + 2 : prev.arranque + prev.activo;
      if (k === 'especial') plan.push({ en: t, x: 0, y: 1 }, { en: t + 1, x: adelante(op), y: 1 }, { en: t + 2, x: adelante(op), y: 0, r: ['especial'] });
      else if (k === 'antiaereo') plan.push({ en: t, x: adelante(op), y: 0 }, { en: t + 1, x: 0, y: 1 }, { en: t + 2, x: adelante(op), y: 1, r: ['especial'] });
      else { const [, y, b] = ENTRADA[k] || [0, 0, k]; plan.push({ en: t, x: 0, y, r: [b] }); }
      prev = m;
    }
    const base = cuadro; for (const p of plan) p.en += base;
  }
  function planMovimiento(k, op) {
    plan.length = 0; const f = adelante(op), b = cuadro;
    const seq = { especial: [[0, 1], [f, 1], [f, 0, 'especial']], antiaereo: [[f, 0], [0, 1], [f, 1, 'especial']], teleporte: [[0, 1], [-f, 1], [-f, 0, 'especial']], embestida: [[0, 1], [-f, 1], [-f, 0, 'especial']] }[k];
    if (seq) seq.forEach(([x, y, r], i) => plan.push({ en: b + i, x, y, r: r ? [r] : [] }));
    else if (k === 'definitivo') plan.push({ en: b, x: 0, y: 0, r: ['definitivo'] });
    else if (k === 'transformar') plan.push({ en: b, x: 0, y: 0, r: ['transformar'] });
    else if (k === 'aereo') plan.push({ en: b, x: f, y: 0, r: ['salto'] }, { en: b + 14, x: f, y: 0, r: [rng.prob(0.5) ? 'medio' : 'fuerte'] });
    else if (k === 'impulsoFuerte') plan.push({ en: b, x: f, y: 0 }, { en: b + 1, x: 0, y: 0 }, { en: b + 2, x: f, y: 0 }, { en: b + 6, x: f, y: 0, r: ['fuerte'] });
  }

  // ---- árbol de comportamiento (selector): la primera rama que acepta, manda
  function pensar(vista, op) {
    const d = Math.abs(vista.x + vista.vx * retraso * 0.5 - L.x);   // predicción: dónde estará cuando yo reaccione
    const atacando = vista.mov && ESTADOS[vista.estado]?.ataque && vista.movF < vista.arr + vista.act;
    const enRecuperacion = vista.mov && ESTADOS[vista.estado]?.ataque && vista.movF >= vista.arr + vista.act && vista.movF < vista.arr + vista.act + vista.rec - 4;
    const enAire = !vista.suelo;
    const corto = alcance('ligero', op) || 84;   // a esta distancia (o menos) sus golpes rápidos llegan
    // 1) amenaza → defensa
    if ((atacando && d < 190) || vista.proy) {
      const pBloq = N.bloqueo + tendencia('ataque') * 0.2;
      if (rng.prob(N.parada) && atacando) { foco = 'parada'; plan.length = 0; plan.push({ en: cuadro, x: 0, y: 0, r: ['bloqueo'] }); return; }
      if (rng.prob(pBloq)) { foco = 'bloquear'; sostener = { x: -adelante(op), y: vista.bajo ? 1 : 0, bloq: true }; hasta = cuadro + 14; return; }
      if (rng.prob(0.25) && L.aguante > 25) { foco = 'esquivar'; plan.length = 0; plan.push({ en: cuadro, x: -adelante(op), y: 0, r: ['esquiva'] }); return; }
    }
    // 1b) anticipación: un humano tampoco reacciona a un golpe de 8 cuadros; se cubre si el rival suele atacar de cerca
    if (!enAire && d < 130 && rng.prob(N.bloqueo * (0.25 + tendencia('ataque')))) { foco = 'bloquear'; sostener = { x: -adelante(op), y: tendencia('bajo') > 0.3 ? 1 : 0, bloq: true }; hasta = cuadro + N.piensaCada; return; }
    // 2) rival saltando cerca → antiaéreo (más probable si el jugador abusa del salto)
    if (enAire && d < 170 && tiene('antiaereo') && L.energia >= (L.def.movimientos.antiaereo.energia || 0) && rng.prob(N.antiaereo + tendencia('salto'))) { foco = 'antiaereo'; planMovimiento('antiaereo', op); return; }
    // 3) castigar un ataque fallido
    if (enRecuperacion && d < corto + 12 && rng.prob(N.castigo)) { foco = 'castigar'; planCombo(mejorCombo(), op); return; }
    // 4) Utility AI en neutro: cada opción recibe un puntaje según el contexto
    const u = {
      acercarse: (d > corto ? 0.6 : 0.05) + N.agresion * 0.4,
      retroceder: (d < corto * 0.6 ? 0.35 : 0.05) + (L.vida < L.vidaMax * 0.3 ? 0.2 : 0),
      combo: d < corto ? 0.55 + N.agresion * 0.5 - tendencia('bloqueo') * 0.4 : 0,
      rompeGuardia: d < corto && tiene('rompeGuardia') ? tendencia('bloqueo') * 1.2 : 0,
      saltar: d > 120 && d < 260 ? 0.18 + N.agresion * 0.15 : 0.02,
      especial: d > 260 && tiene('especial') && L.energia >= 15 ? 0.45 : 0,
      impulsar: d > 200 && d < 380 && tiene('impulsoFuerte') ? 0.3 : 0,
      cargar: d > 330 && L.energia < 80 ? 0.4 : 0.02,
      definitivo: L.energia >= 100 && d < corto + 40 && !atacando ? 0.9 : 0,
      transformar: !L.transformado && L.def.transformaciones?.[0] && L.energia >= L.def.transformaciones[0].costo && d > 260 ? 0.7 : 0,
      esperar: 0.12 + (1 - N.agresion) * 0.2,
    };
    for (const k of Object.keys(u)) u[k] *= 1 + (rng.num() - 0.5) * N.error * 2;   // la CPU también se equivoca
    const elegido = Object.entries(u).sort((a, b) => b[1] - a[1])[0][0];
    foco = elegido; hasta = cuadro + N.piensaCada;
    if (elegido === 'acercarse') sostener = { x: adelante(op), y: 0 };
    else if (elegido === 'retroceder') sostener = { x: -adelante(op), y: 0 };
    else if (elegido === 'cargar') sostener = { x: 0, y: 0, carga: true };
    else if (elegido === 'esperar') sostener = { x: 0, y: rng.prob(0.3) ? 1 : 0 };
    else { sostener = { x: 0, y: 0 }; if (elegido === 'combo') planCombo(mejorCombo(), op); else if (elegido === 'saltar') planMovimiento('aereo', op); else if (elegido === 'rompeGuardia') { plan.length = 0; plan.push({ en: cuadro, x: 0, y: 0, r: ['ligero', 'medio'] }); } else planMovimiento({ especial: 'especial', impulsar: 'impulsoFuerte', definitivo: 'definitivo', transformar: 'transformar' }[elegido], op); }
  }
  function mejorCombo() {
    const posibles = COMBOS.filter((c) => c.every(tiene)).filter((c) => !c.includes('especial') || L.energia >= 15).filter((c) => !c.includes('antiaereo') || L.energia >= 20);
    const largos = posibles.filter((c) => c.length <= N.comboLargo + 1);
    return (largos.length ? largos : [['ligero']])[Math.floor(rng.num() * (largos.length || 1))];
  }

  ia.entrada = () => {
    cuadro++;
    const vista = percibir(), op = combate.rival(L);
    const e = { x: 0, y: 0, recien: new Set(), abajo: new Set() };
    if (!op || L.ko || combate.terminado) return e;
    if (ESTADOS[L.estado]?.sinControl) { plan.length = 0; return e; }
    if (L.pausa > 0) for (const p of plan) p.en++;   // parón del impacto: el plan espera (si no, el siguiente botón llega antes de la ventana)
    if (plan.length) {
      const p = plan[0];
      if (p.en <= cuadro) { plan.shift(); e.x = p.x; e.y = p.y; for (const r of p.r || []) { e.recien.add(r); e.abajo.add(r); } return e; }
      e.x = p.x * 0; return e;
    }
    if (vista && cuadro >= hasta) pensar(vista, op);
    e.x = sostener.x; e.y = sostener.y;
    if (sostener.bloq) e.abajo.add('bloqueo');
    if (sostener.carga) e.abajo.add('carga');
    if (cuadro >= hasta && foco === 'bloquear') sostener = { x: 0, y: 0 };
    return e;
  };
  return ia;
}

// muñeco de entrenamiento: quieto, bloquea todo, salta o agachado
export function crearMuneco(L, modo = 'quieto') {
  let f = 0;
  return { L, entrada: () => { f++; const e = { x: 0, y: 0, recien: new Set(), abajo: new Set() }; if (modo === 'bloquea') e.abajo.add('bloqueo'); if (modo === 'agachado') e.y = 1; if (modo === 'salta' && f % 50 === 0) { e.recien.add('salto'); e.abajo.add('salto'); } return e; }, observar() {} };
}
