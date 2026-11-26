// Forja · voxel · criaturas e IA. Cada tipo es DATOS (modelo de cajas, vida, velocidad, clase, biomas).
// La IA combina:
//   · percepción: vista (distancia + rayo DDA sin bloques opacos en medio) y oído (si corres cerca)
//   · Behavior Tree de arriba: huir > atacar/perseguir > atender al jugador > ocio
//   · Utility AI para el ocio: descansar, deambular, pastar o volver a casa, según puntajes que cambian con el tiempo
//   · A* sobre la superficie, limitado a 20 bloques y 400 nodos (solo cuando el camino directo está bloqueado)
//   · steering: buscar, huir, llegar, deambular y separación entre criaturas
// Solo se simulan las que están dentro de radioSim; las más lejanas quedan dormidas y las muy lejanas se retiran
// (las persistentes, como el guardián o los mercaderes de las aldeas, se recuerdan por su marcador).
import { T } from './bloques.js';
import { lanzarRayo } from './rayo.js';
import { crearPRNG } from '../nucleo/semilla.js';
import { crearCola } from '../nucleo/cola.js';

const C = (r, g, b) => [r, g, b];
export const TIPOS = {
  lanudo: { nombre: 'Lanudo', clase: 'pasiva', vida: 8, vel: 1.5, alto: 1.1, suelta: [['lana', 1]], cajas: [[-0.45, 0.35, -0.6, 0.9, 0.7, 1.2, C(238, 232, 220)], [-0.25, 0.55, -0.95, 0.5, 0.45, 0.4, C(90, 80, 70)], [-0.4, 0, -0.5, 0.2, 0.4, 0.2, C(90, 80, 70)], [0.2, 0, -0.5, 0.2, 0.4, 0.2, C(90, 80, 70)], [-0.4, 0, 0.3, 0.2, 0.4, 0.2, C(90, 80, 70)], [0.2, 0, 0.3, 0.2, 0.4, 0.2, C(90, 80, 70)]] },
  saltarin: { nombre: 'Saltarín', clase: 'pasiva', vida: 4, vel: 2.6, alto: 0.6, salta: true, suelta: [['baya', 1]], cajas: [[-0.22, 0, -0.3, 0.44, 0.4, 0.6, C(196, 160, 110)], [-0.18, 0.3, -0.42, 0.36, 0.3, 0.3, C(210, 175, 125)], [-0.15, 0.55, -0.35, 0.08, 0.3, 0.06, C(230, 200, 160)], [0.07, 0.55, -0.35, 0.08, 0.3, 0.06, C(230, 200, 160)]] },
  zancuda: { nombre: 'Zancuda', clase: 'pasiva', vida: 6, vel: 1.8, alto: 1.4, suelta: [['semilla', 2]], cajas: [[-0.25, 0.7, -0.35, 0.5, 0.4, 0.7, C(120, 170, 200)], [-0.1, 1.0, -0.55, 0.2, 0.4, 0.2, C(140, 190, 215)], [-0.05, 1.2, -0.85, 0.1, 0.08, 0.35, C(240, 190, 60)], [-0.15, 0, -0.05, 0.06, 0.7, 0.06, C(240, 190, 60)], [0.09, 0, -0.05, 0.06, 0.7, 0.06, C(240, 190, 60)]] },
  tejon: { nombre: 'Tejón de roca', clase: 'neutral', vida: 12, vel: 2.4, alto: 0.8, dano: 2, suelta: [['piedra', 2]], cajas: [[-0.35, 0.15, -0.55, 0.7, 0.55, 1.1, C(110, 110, 118)], [-0.3, 0.25, -0.85, 0.6, 0.4, 0.35, C(230, 230, 230)], [-0.32, 0, -0.45, 0.2, 0.2, 0.2, C(60, 60, 64)], [0.12, 0, 0.25, 0.2, 0.2, 0.2, C(60, 60, 64)]] },
  escarabajo: { nombre: 'Escarabajo de cobre', clase: 'neutral', vida: 10, vel: 1.8, alto: 0.6, dano: 1, suelta: [['hierro', 1]], cajas: [[-0.4, 0.1, -0.5, 0.8, 0.45, 1, C(184, 115, 51)], [-0.25, 0.15, -0.75, 0.5, 0.3, 0.3, C(60, 40, 30)]] },
  golem: { nombre: 'Gólem de barro', clase: 'enemiga', vida: 16, vel: 1.7, alto: 1.8, dano: 3, nocturna: true, suelta: [['arcilla', 2], ['carbon', 1]], cajas: [[-0.4, 0.7, -0.25, 0.8, 0.8, 0.5, C(120, 92, 66)], [-0.3, 1.5, -0.3, 0.6, 0.5, 0.6, C(140, 108, 78)], [-0.18, 1.62, -0.32, 0.12, 0.1, 0.05, C(255, 210, 90)], [0.06, 1.62, -0.32, 0.12, 0.1, 0.05, C(255, 210, 90)], [-0.35, 0, -0.2, 0.3, 0.7, 0.4, C(100, 78, 56)], [0.05, 0, -0.2, 0.3, 0.7, 0.4, C(100, 78, 56)], [-0.65, 0.75, -0.15, 0.25, 0.7, 0.3, C(100, 78, 56)], [0.4, 0.75, -0.15, 0.25, 0.7, 0.3, C(100, 78, 56)]] },
  cardo: { nombre: 'Cardo andante', clase: 'enemiga', vida: 10, vel: 2.2, alto: 1.3, dano: 2, biomas: ['desierto', 'meseta', 'canon'], suelta: [['cactus', 1]], cajas: [[-0.3, 0.3, -0.3, 0.6, 1, 0.6, C(70, 140, 60)], [-0.65, 0.7, -0.12, 0.35, 0.22, 0.24, C(70, 140, 60)], [0.3, 0.8, -0.12, 0.35, 0.22, 0.24, C(70, 140, 60)], [-0.2, 1.3, -0.2, 0.4, 0.15, 0.4, C(240, 120, 160)], [-0.25, 0, -0.1, 0.18, 0.3, 0.2, C(150, 110, 60)], [0.07, 0, -0.1, 0.18, 0.3, 0.2, C(150, 110, 60)]] },
  chispa: { nombre: 'Chispa', clase: 'enemiga', vida: 6, vel: 3, alto: 0.6, dano: 1, vuela: true, nocturna: true, luz: 0.9, suelta: [['cristal', 1]], cajas: [[-0.25, 0.2, -0.25, 0.5, 0.5, 0.5, C(150, 240, 255)], [-0.12, 0.33, -0.4, 0.24, 0.24, 0.8, C(255, 255, 255)]] },
  mercader: { nombre: 'Mercader', clase: 'comerciante', vida: 20, vel: 1.1, alto: 1.8, persistente: true, cajas: [[-0.3, 0, -0.2, 0.6, 0.75, 0.4, C(60, 70, 120)], [-0.32, 0.75, -0.22, 0.64, 0.7, 0.44, C(150, 60, 80)], [-0.25, 1.45, -0.25, 0.5, 0.45, 0.5, C(225, 180, 140)], [-0.35, 1.85, -0.35, 0.7, 0.12, 0.7, C(200, 160, 60)]] },
  aldeano: { nombre: 'Aldeana', clase: 'exploradora', vida: 20, vel: 1.3, alto: 1.8, persistente: true, cajas: [[-0.3, 0, -0.2, 0.6, 0.75, 0.4, C(90, 60, 40)], [-0.32, 0.75, -0.22, 0.64, 0.7, 0.44, C(70, 130, 90)], [-0.25, 1.45, -0.25, 0.5, 0.45, 0.5, C(170, 120, 90)]] },
  cartografa: { nombre: 'Cartógrafa', clase: 'exploradora', vida: 20, vel: 1.6, alto: 1.8, persistente: true, cajas: [[-0.3, 0, -0.2, 0.6, 0.75, 0.4, C(70, 70, 80)], [-0.32, 0.75, -0.22, 0.64, 0.7, 0.44, C(220, 180, 60)], [-0.25, 1.45, -0.25, 0.5, 0.45, 0.5, C(120, 80, 60)], [0.3, 0.8, -0.3, 0.15, 0.5, 0.15, C(240, 230, 200)]] },
  guardian: { nombre: 'Guardián de la mazmorra', clase: 'jefe', vida: 140, vel: 1.5, alto: 3.6, dano: 5, escala: 2, persistente: true, suelta: [['cristal', 6], ['oro', 4]], cajas: [[-0.45, 0.7, -0.3, 0.9, 0.85, 0.6, C(118, 124, 132)], [-0.35, 1.55, -0.35, 0.7, 0.55, 0.7, C(140, 146, 154)], [-0.25, 1.72, -0.37, 0.5, 0.12, 0.05, C(150, 240, 255)], [-0.38, 0, -0.22, 0.32, 0.7, 0.44, C(96, 100, 108)], [0.06, 0, -0.22, 0.32, 0.7, 0.44, C(96, 100, 108)], [-0.8, 0.8, -0.2, 0.32, 0.8, 0.4, C(96, 100, 108)], [0.48, 0.8, -0.2, 0.32, 0.8, 0.4, C(96, 100, 108)], [-0.15, 2.1, -0.1, 0.3, 0.25, 0.2, C(150, 240, 255)]] },
};

// A* en la superficie: nodos (x, z) con su altura de pie; paso de subida ≤ 1, de bajada ≤ 3
export function aEstrella(mundo, ini, fin, { radio = 20, maxNodos = 400 } = {}) {
  const pisable = (x, y, z) => { const b = mundo.bloque(x, y - 1, z), a = mundo.bloque(x, y, z), c = mundo.bloque(x, y + 1, z); return b > 0 && T.solido[b] && !T.solido[a] && a >= 0 && !T.solido[c] && !T.liquido[a] && a !== 6; };
  const alturaPie = (x, z, yRef) => { for (let dy = 1; dy >= -3; dy--) if (pisable(x, yRef + dy, z)) return yRef + dy; return null; };
  const k = (x, z) => x + ',' + z, abierta = crearCola(), g = new Map(), de = new Map(), y0 = new Map();
  abierta.poner([ini[0], ini[2]], 0); g.set(k(ini[0], ini[2]), 0); y0.set(k(ini[0], ini[2]), ini[1]);
  let n = 0;
  while (abierta.largo && n++ < maxNodos) {
    const [x, z] = abierta.sacar(), kk = k(x, z), y = y0.get(kk);
    if (Math.abs(x - fin[0]) <= 1 && Math.abs(z - fin[2]) <= 1) { const ruta = [[x, y, z]]; let c = kk; while (de.has(c)) { c = de.get(c); const [a, b] = c.split(',').map(Number); ruta.push([a, y0.get(c), b]); } return { ruta: ruta.reverse(), nodos: n }; }
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, nz = z + dz; if (Math.abs(nx - ini[0]) > radio || Math.abs(nz - ini[2]) > radio) continue;
      const ny = alturaPie(nx, nz, y); if (ny == null) continue;
      const nk = k(nx, nz), ng = g.get(kk) + 1 + Math.max(0, ny - y) * 0.5;
      if (ng < (g.get(nk) ?? Infinity)) { g.set(nk, ng); de.set(nk, kk); y0.set(nk, ny); abierta.poner([nx, nz], ng + Math.abs(nx - fin[0]) + Math.abs(nz - fin[2])); }
    }
  }
  return { ruta: null, nodos: n };
}

export function crearCriaturas({ mundo, cfg, semilla, alAtacar = () => {}, alMorir = () => {}, alEvento = () => {} }) {
  const lista = [], CR = cfg.criaturas, M = cfg.modulos, azar = crearPRNG((semilla ^ 0xc0ffee) >>> 0);
  let siguienteId = 1, relojIA = 0, relojAparicion = 0;
  const enabled = (t) => { const c = TIPOS[t].clase; if (!M.criaturas) return false; if (c === 'pasiva') return CR.pasivas; if (c === 'neutral') return CR.neutrales; if (c === 'enemiga') return M.enemigos; if (c === 'comerciante') return CR.comerciantes; if (c === 'exploradora') return CR.exploradores; if (c === 'jefe') return CR.jefe && M.enemigos; return true; };
  const solido = (x, y, z) => { const b = mundo.bloque(Math.floor(x), Math.floor(y), Math.floor(z)); return b < 0 || !!T.solido[b]; };
  const cr = {
    lista,
    crear(tipo, x, y, z, extra = {}) {
      if (!TIPOS[tipo] || !enabled(tipo)) return null;
      const t = TIPOS[tipo], e = { id: siguienteId++, tipo, t, x: x + 0.5, y, z: z + 0.5, px: x + 0.5, py: y, pz: z + 0.5, vx: 0, vy: 0, vz: 0, giro: azar.entre(0, 6.28), vida: t.vida * (t.clase === 'jefe' ? 1 + (cfg.supervivencia.dificultad === 'dificil' ? 0.5 : 0) : 1), estado: 'descanso', t0: 0, casa: [x, y, z], ruta: null, provocada: false, golpe: 0, cool: 0, activa: true, ...extra };
      lista.push(e); return e;
    },
    // marcadores de las estructuras (mercader en la aldea, gólems y guardián en la mazmorra)
    desdeMarcadores(marcadores, vencidos) {
      for (const m of marcadores) {
        const tipo = m.tipo === 'casa' || m.tipo === 'cofre' || m.tipo === 'entrada' || m.tipo === 'ruina' || m.tipo === 'torre' || m.tipo === 'templo' || m.tipo === 'mazmorra' ? null : m.tipo;
        if (!tipo || !TIPOS[tipo]) continue;
        const clave = `${m.tipo}@${m.x},${m.y},${m.z}`;
        if (vencidos.has(clave) || lista.some((e) => e.marcador === clave)) continue;
        cr.crear(tipo, m.x, m.y, m.z, { marcador: clave, persistente: true });
      }
    },
    // paso fijo: física sencilla para todas las activas; la IA piensa 10 veces por segundo
    paso(dt, jug, ctx) {
      relojIA += dt; relojAparicion += dt;
      const piensa = relojIA >= 0.1; if (piensa) relojIA = 0;
      for (let i = lista.length - 1; i >= 0; i--) {
        const e = lista[i], dx = jug.x - e.x, dz = jug.z - e.z, d = Math.hypot(dx, dz, jug.y - e.y);
        e.activa = d < CR.radioSim;
        if (!e.activa) { if (d > CR.radioSim * 1.7 && !e.persistente) lista.splice(i, 1); continue; }
        if (!mundo.cargado(e.x, e.z)) continue;
        e.px = e.x; e.py = e.y; e.pz = e.z;
        if (piensa) pensar(e, jug, d, ctx);
        mover(e, dt);
        if (e.cool > 0) e.cool -= dt; if (e.golpe > 0) e.golpe -= dt;
        // ataque cuerpo a cuerpo
        if ((e.estado === 'atacar') && d < 1.6 + (e.t.escala || 1) * 0.4 && e.cool <= 0) { e.cool = e.t.clase === 'jefe' ? 1.6 : 1.1; alAtacar(e, (e.t.dano || 1) * (CR.agresividad > 1.5 ? 1.25 : 1)); }
        // golpe en el suelo del jefe: aviso (destello) y onda a los 0,8 s
        if (e.t.clase === 'jefe' && e.estado === 'atacar' && !e.slam && d < 7 && azar.prob(0.004)) e.slam = 0.8;
        if (e.slam != null) { e.slam -= dt; if (e.slam <= 0) { e.slam = null; if (d < 5 && jug.enSuelo) alAtacar(e, 4, 'onda'); alEvento('onda', e); } }
        if (e.y < -10) lista.splice(i, 1);
      }
      if (relojAparicion > 2) { relojAparicion = 0; aparecer(jug, ctx); }
    },
    golpear(e, dano, dir) {
      e.vida -= dano; e.golpe = 0.25; e.provocada = true; e.vx += dir[0] * 6; e.vz += dir[2] * 6; e.vy = Math.max(e.vy, 4);
      if (e.t.clase === 'pasiva') { e.estado = 'huir'; e.t0 = 0; }
      if (e.t.clase === 'jefe' && e.vida < e.t.vida * 0.5 && !e.fase2) { e.fase2 = true; alEvento('fase', e); for (let k = 0; k < 2; k++) cr.crear('golem', Math.floor(e.x) + (k ? 3 : -3), Math.floor(e.y), Math.floor(e.z)); }
      if (e.vida <= 0) { lista.splice(lista.indexOf(e), 1); alMorir(e); }
    },
    // rayo contra las cajas de las criaturas (para atacar con el clic)
    apuntada(o, d, max) {
      let mejor = null, tm = max;
      for (const e of lista) {
        if (!e.activa) continue; const s = e.t.escala || 1, w = 0.5 * s, h = e.t.alto * s;
        const t = rayoCaja(o, d, e.x - w, e.y, e.z - w, e.x + w, e.y + h, e.z + w); if (t != null && t < tm) { tm = t; mejor = e; }
      }
      return mejor ? { e: mejor, dist: tm } : null;
    },
    exportar() { return lista.filter((e) => e.persistente && e.marcador).map((e) => ({ marcador: e.marcador, vida: e.vida })); },
  };
  function percibe(e, jug, d) {
    if (d > 22) return false;
    if (d < 4 || (jug.corriendo && d < 10)) return true;   // oído
    const ox = e.x, oy = e.y + e.t.alto * 0.8, oz = e.z, dx = jug.x - ox, dy = jug.y + 1.5 - oy, dz = jug.z - oz, l = Math.hypot(dx, dy, dz);
    const r = lanzarRayo((x, y, z) => mundo.bloque(x, y, z), ox, oy, oz, dx / l, dy / l, dz / l, l, (id) => T.opaco[id] === 1);
    return !r;
  }
  function pensar(e, jug, d, ctx) {
    const c = e.t.clase, hostil = c === 'enemiga' || c === 'jefe' || (c === 'neutral' && e.provocada);
    const ve = hostil || c === 'pasiva' ? percibe(e, jug, d) : d < 8;
    // árbol de comportamiento
    if (c === 'pasiva' && e.estado === 'huir') { e.objetivo = [jug.x, jug.y, jug.z]; if ((e.t0 += 0.1) < 4) return; }
    if (hostil && ve && !ctx.pacifica) { e.estado = d < 1.8 + (e.t.escala || 1) * 0.3 ? 'atacar' : 'perseguir'; e.objetivo = [jug.x, jug.y, jug.z]; if (e.estado === 'perseguir' && (!e.ruta || (e.tRuta = (e.tRuta || 0) + 0.1) > 1.5)) { e.tRuta = 0; e.ruta = bloqueado(e, jug) ? aEstrella(mundo, [Math.floor(e.x), Math.floor(e.y), Math.floor(e.z)], [Math.floor(jug.x), Math.floor(jug.y), Math.floor(jug.z)]).ruta : null; } return; }
    if ((c === 'comerciante' || c === 'exploradora') && d < 5) { e.estado = 'atender'; return; }
    // utilidad: cada opción tiene un puntaje; gana la mayor (con un poco de azar para que no sea un reloj)
    e.t0 += 0.1;
    if (e.t0 < 1.5 && e.estado !== 'descanso') return;
    const lejosCasa = Math.hypot(e.x - e.casa[0], e.z - e.casa[2]);
    const pts = { descanso: 0.3 + (ctx.noche && c !== 'enemiga' ? 0.5 : 0) + azar.num() * 0.3, deambular: 0.45 + azar.num() * 0.4, pastar: c === 'pasiva' ? 0.35 + azar.num() * 0.4 : 0, volver: e.persistente || c === 'jefe' ? lejosCasa / 12 : 0 };
    e.estado = Object.entries(pts).sort((a, b) => b[1] - a[1])[0][0]; e.t0 = 0;
    if (e.estado === 'deambular') { const a = azar.entre(0, 6.28), r = azar.entre(3, 9); e.objetivo = [e.x + Math.cos(a) * r, e.y, e.z + Math.sin(a) * r]; }
    if (e.estado === 'volver') e.objetivo = [e.casa[0] + 0.5, e.casa[1], e.casa[2] + 0.5];
    e.ruta = null;
  }
  const bloqueado = (e, jug) => { const dx = Math.sign(jug.x - e.x), dz = Math.sign(jug.z - e.z); return solido(e.x + dx * 0.8, e.y + 0.5, e.z) && solido(e.x + dx * 0.8, e.y + 1.5, e.z) || solido(e.x, e.y + 0.5, e.z + dz * 0.8) && solido(e.x, e.y + 1.5, e.z + dz * 0.8); };
  function mover(e, dt) {
    const v = e.t.vel * CR.velocidad * (e.estado === 'huir' ? 1.6 : e.estado === 'perseguir' || e.estado === 'atacar' ? 1.25 * Math.min(1.6, 0.7 + 0.3 * CR.agresividad) : e.estado === 'deambular' || e.estado === 'volver' ? 0.6 : 0);
    let ox = 0, oz = 0;
    if (e.estado === 'huir' && e.objetivo) { ox = e.x - e.objetivo[0]; oz = e.z - e.objetivo[2]; }
    else if (e.ruta && e.ruta.length > 1) { const p = e.ruta[1]; ox = p[0] + 0.5 - e.x; oz = p[2] + 0.5 - e.z; if (Math.hypot(ox, oz) < 0.4) e.ruta.shift(); }
    else if (e.objetivo && e.estado !== 'descanso' && e.estado !== 'atender' && e.estado !== 'pastar') { ox = e.objetivo[0] - e.x; oz = e.objetivo[2] - e.z; }
    // separación (steering): que no se encimen
    for (const o of lista) { if (o === e || !o.activa) continue; const sx = e.x - o.x, sz = e.z - o.z, dd = sx * sx + sz * sz; if (dd < 0.8 && dd > 1e-4) { ox += sx / dd * 0.3; oz += sz / dd * 0.3; } }
    const l = Math.hypot(ox, oz), llega = e.estado === 'volver' || e.estado === 'deambular' ? Math.min(1, l / 1.5) : 1;   // «arrive»: frena al llegar
    const tx = l > 0.05 ? (ox / l) * v * llega : 0, tz = l > 0.05 ? (oz / l) * v * llega : 0;
    e.vx += (tx - e.vx) * Math.min(1, dt * 6); e.vz += (tz - e.vz) * Math.min(1, dt * 6);
    if (l > 0.05 && v > 0) { const g = Math.atan2(e.vx, -e.vz); e.giro += ((((g - e.giro) % 6.283) + 9.42) % 6.283 - 3.14) * Math.min(1, dt * 8); }
    if (e.t.vuela) { const suelo = altura(e.x, e.z, e.y); e.vy += ((suelo + 2.2 + Math.sin(performance.now() / 400 + e.id) * 0.4) - e.y) * dt * 3; e.vy *= 0.9; }
    else { e.vy -= 26 * dt; if (e.enAgua) { e.vy = Math.max(e.vy, 1.2); } }
    const w = 0.3 * (e.t.escala || 1), h = e.t.alto * (e.t.escala || 1);
    let ny = e.y + e.vy * dt;
    if (cajaChoca(e.x, ny, e.z, w, h)) { if (e.vy < 0) { ny = Math.floor(ny) + 1; e.enSuelo = true; } else ny = e.y; e.vy = 0; } else e.enSuelo = false;
    e.y = ny;
    for (const eje of ['x', 'z']) {
      const nx = eje === 'x' ? e.x + e.vx * dt : e.x, nz = eje === 'z' ? e.z + e.vz * dt : e.z;
      if (cajaChoca(nx, e.y, nz, w, h)) { if (e.enSuelo && !cajaChoca(nx, e.y + 1.05, nz, w, h)) e.vy = 6.5; else if (eje === 'x') e.vx = 0; else e.vz = 0; continue; }
      const bajo = mundo.bloque(Math.floor(nx), Math.floor(e.y - 1), Math.floor(nz)), bajo2 = mundo.bloque(Math.floor(nx), Math.floor(e.y - 2), Math.floor(nz));
      if (!e.t.vuela && e.estado !== 'perseguir' && (bajo === 6 || (!T.solido[bajo] && !T.solido[bajo2] && bajo >= 0))) { if (eje === 'x') e.vx = 0; else e.vz = 0; continue; }   // no se tira por barrancos ni a la lava
      e.x = nx; e.z = nz;
    }
    if (e.t.salta && e.enSuelo && Math.hypot(e.vx, e.vz) > 0.5) e.vy = 5;
    const id = mundo.bloque(Math.floor(e.x), Math.floor(e.y + 0.2), Math.floor(e.z)); e.enAgua = T.liquido[id] === 1;
    e.vx *= 0.98; e.vz *= 0.98;
  }
  const cajaChoca = (x, y, z, w, h) => { for (let yy = Math.floor(y); yy <= Math.floor(y + h - 0.01); yy++) for (let xx = Math.floor(x - w); xx <= Math.floor(x + w); xx++) for (let zz = Math.floor(z - w); zz <= Math.floor(z + w); zz++) if (solido(xx, yy, zz)) return true; return false; };
  const altura = (x, z, y0) => { for (let y = Math.floor(y0); y > y0 - 12; y--) if (solido(x, y, z)) return y + 1; return y0 - 12; };
  function aparecer(jug, ctx) {
    const vivos = lista.filter((e) => !e.persistente).length, tope = Math.round(CR.maximo * Math.min(1.5, CR.densidad));
    if (vivos >= tope || !M.criaturas) return;
    for (let intento = 0; intento < 3; intento++) {
      const a = azar.entre(0, 6.28), r = azar.entre(18, 36), x = Math.floor(jug.x + Math.cos(a) * r), z = Math.floor(jug.z + Math.sin(a) * r);
      if (!mundo.cargado(x, z)) continue;
      let y = null; for (let yy = Math.min(mundo.H - 2, Math.floor(jug.y) + 20); yy > Math.max(2, jug.y - 30); yy--) { const b = mundo.bloque(x, yy - 1, z); if (b > 0 && T.solido[b] && !T.solido[mundo.bloque(x, yy, z)] && !T.solido[mundo.bloque(x, yy + 1, z)] && !T.liquido[mundo.bloque(x, yy, z)]) { y = yy; break; } }
      if (y == null) continue;
      const bioma = ctx.biomaEn(x, z), oscuro = ctx.noche || y < ctx.mar - 10;
      let candidatos = (bioma.fauna || []).filter((t) => TIPOS[t] && TIPOS[t].clase !== 'comerciante' && TIPOS[t].clase !== 'exploradora' && TIPOS[t].clase !== 'jefe' && enabled(t) && (!TIPOS[t].nocturna || oscuro));
      if (M.enemigos && oscuro && (CR.nocturnas || y < ctx.mar - 10)) candidatos = candidatos.concat(['golem', 'chispa'].filter(enabled), bioma.id === 'desierto' ? ['cardo'] : []);
      if (!candidatos.length || azar.num() > CR.densidad) continue;
      cr.crear(azar.elegir(candidatos), x, y, z); return;
    }
  }
  return cr;
}
// intersección rayo-caja (método de las losas)
export function rayoCaja(o, d, x0, y0, z0, x1, y1, z1) {
  let tmin = 0, tmax = 1e9;
  for (const [oo, dd, a, b] of [[o[0], d[0], x0, x1], [o[1], d[1], y0, y1], [o[2], d[2], z0, z1]]) {
    if (Math.abs(dd) < 1e-9) { if (oo < a || oo > b) return null; continue; }
    let t1 = (a - oo) / dd, t2 = (b - oo) / dd; if (t1 > t2) [t1, t2] = [t2, t1]; tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2); if (tmin > tmax) return null;
  }
  return tmin;
}
