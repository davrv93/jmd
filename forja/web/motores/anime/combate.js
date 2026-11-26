// Forja · Anime Battle Engine · simulación de combate (§6–§9, §12). Determinista: mismo estado inicial + mismas entradas
// por paso = mismo resultado, en el navegador y en Node. Sin Math.random (la IA usa el PRNG de la partida), sin reloj.
// La animación NO decide el daño: cada golpe sale de su frame data (hitbox del movimiento contra hurtbox del cuerpo),
// y la pose se calcula desde el mismo contador de cuadros, así que dibujo y combate no se pueden desincronizar.
//   const c = crearCombate({ luchadores: [{ def, eq: 0 }, { def, eq: 1 }], reglas }); c.paso([entrada0, entrada1]);
import { ESTADOS, permitida } from './estados.js';
import { crearBuffer, parsearComando, cumple } from './buffer.js';
import { FISICA_BASE, integrar, separar, impulso, solapan, barrido } from './fisica.js';
import { crearPRNG } from '../nucleo/semilla.js';

export const REGLAS_BASE = {
  danoMul: 1, vidaMul: 1, defensaMul: 1, energiaInicial: 0, energiaMul: 1, energiaMax: 100, cargaPorCuadro: 0.55,
  escalado: { desde: 3, paso: 0.1, minimo: 0.3 }, malabarMax: 6, comboMaxCuadros: 360, decaeAturd: 2,
  ventanaParada: 6, paradaActiva: true, aguanteBloqueo: 0.28, aguanteRecupera: 0.35, chip: 0.12, bloqueoAereo: false,
  cancelRecuperacion: { activo: true, costo: 25 }, cancelAereo: true, contraMul: 1.25, rebotePared: true, reboteSuelo: true,
  transformacion: true, definitivo: true, cinematicas: true, tiempoRonda: 99, empujeEsquina: 0.5, esquivaAguante: 18,
  velocidadMul: 1, saltoMul: 1, gravedadMul: 1, fisica: {}, profundidad: false, limites: { izq: -700, der: 700 }, relevoEspera: 180,
  ventanaMovimiento: 14, ventanaPulsacion: 6, repetidoDesde: 3, repetidoMul: 0.8, debilidades: true, desempate: 'vida', impulso: true, esquiva: true, saltosAereos: null,
};

let SIGUIENTE = 1;
function crearLuchador(o, i, reglas) {
  const d = o.def;
  const L = {
    tipo: 'luchador', id: o.id ?? i + 1, i, def: d, eq: o.eq ?? i, nombre: o.nombre || d.nombre, control: o.control || 'humano',
    x: o.x ?? (i % 2 ? 180 : -180), y: 0, z: o.z ?? 0, vx: 0, vy: 0, vz: 0, px: 0, py: 0, pz: 0, dir: o.dir ?? (i % 2 ? -1 : 1), suelo: true,
    ancho: d.ancho, alto: d.alto, masa: d.masa,
    estado: 'reposo', f: 0, mov: null, movF: 0, inst: null, durEstado: 0,
    vidaMax: Math.round(d.salud * reglas.vidaMul), vida: Math.round(d.salud * reglas.vidaMul), energia: reglas.energiaInicial, aguante: d.resistencia,
    pausa: 0, invul: 0, saltosAereos: reglas.saltosAereos ?? d.saltosAereos, combo: null, transformado: null, voló: false, ko: false, activo: o.activo ?? true,
    reboteParedUsado: false, reboteSueloUsado: false, relevoEspera: 0, flotaInvul: false,
    buffer: crearBuffer({ ventanaMovimiento: reglas.ventanaMovimiento, ventanaPulsacion: reglas.ventanaPulsacion }), cmd: {}, ultimoGolpe: null, rechazos: 0, ventaja: null,
  };
  for (const [k, m] of Object.entries(d.movimientos)) L.cmd[k] = parsearComando(m.entrada || k);
  return L;
}

export function crearCombate(opc = {}) {
  const reglas = { ...REGLAS_BASE, ...(opc.reglas || {}), escalado: { ...REGLAS_BASE.escalado, ...(opc.reglas?.escalado || {}) }, cancelRecuperacion: { ...REGLAS_BASE.cancelRecuperacion, ...(opc.reglas?.cancelRecuperacion || {}) } };
  const F = { ...FISICA_BASE, ...(reglas.fisica || {}) }; F.gravedad *= reglas.gravedadMul;
  const lim = { ...REGLAS_BASE.limites, ...(opc.escenario?.limites || reglas.limites) };
  const c = {
    reglas, F, limites: lim, escenario: opc.escenario || {}, prng: crearPRNG(opc.semilla ?? 1), cuadro: 0,
    luchadores: (opc.luchadores || []).map((o, i) => crearLuchador(o, i, reglas)), extras: [], proyectiles: [], obstaculos: (opc.escenario?.obstaculos || []).map((o, i) => ({ id: 'o' + i, vida: 120, ...o, roto: false })),
    eventos: [], cinematica: null, terminado: null, tiempo: reglas.tiempoRonda * 60, transicionesRechazadas: 0, golpesAplicados: 0,
  };
  const todos = () => [...c.luchadores, ...c.extras];
  const ev = (o) => { c.eventos.push({ cuadro: c.cuadro, ...o }); };
  const activos = () => todos().filter((l) => l.activo);
  const rival = (L) => { let best = null, d = Infinity; for (const o of activos()) if (o.eq !== L.eq && !o.ko) { const dd = Math.abs(o.x - L.x) + Math.abs(o.z - L.z) * 0.5; if (dd < d) { d = dd; best = o; } } return best; };
  c.rival = rival;
  // multiplicador de un atributo: el del personaje (fuerza, defensa, velAtaque son factores ≈ 1) por el de su
  // transformación. velocidad y alcance NO: def.velocidad son píxeles por cuadro (4.8) y def.alcance ya se aplica en la
  // hitbox; multiplicarlos aquí los elevaba al cuadrado (caminar a 23 px/cuadro, saltos de 700 px).
  const mult = (L, k) => (k === 'velocidad' || k === 'alcance' ? 1 : L.def[k] ?? 1) * (L.transformado ? L.transformado.mult[k] ?? 1 : 1);
  c.mult = mult;

  // ---------------------------------------------------------------- cambios de estado (validados)
  function cambiar(L, a, forzada = false) {
    if (L.estado === a && !ESTADOS[a].ataque) { if (forzada) L.f = 0; return true; }   // otro golpe en aturdimiento reinicia su cuenta
    if (!permitida(L.estado, a, forzada)) { L.rechazos++; c.transicionesRechazadas++; ev({ tipo: 'rechazo', id: L.id, de: L.estado, a }); return false; }
    L.estado = a; L.f = 0; ev({ tipo: 'estado', id: L.id, estado: a });
    if (!ESTADOS[a].ataque) { L.mov = null; L.inst = null; }
    return true;
  }
  c.cambiar = cambiar;
  // transición pedida por el jugador o la IA: si la tabla no la permite, simplemente no ocurre (no es un error del motor)
  const intentar = (L, a) => (L.estado === a || permitida(L.estado, a) ? cambiar(L, a) : false);
  function iniciarMov(L, k, comoCombo = false) {
    const m = L.def.movimientos[k]; if (!m) return false;
    if (m.energia && L.energia < m.energia) return false;
    const destino = comoCombo ? 'combo' : m.tipo === 'definitivo' ? 'definitivo' : m.tipo === 'especial' ? 'especial' : m.aire ? 'ataqueAereo' : { ligero: 'ataqueLigero', medio: 'ataqueMedio', fuerte: 'ataqueFuerte' }[m.tipo] || 'ataqueFuerte';
    if (destino === 'definitivo' && (!reglas.definitivo || !L.suelo)) return false;
    if (!permitida(L.estado, destino) || !cambiar(L, destino)) return false;
    L.energia -= m.energia || 0;
    L.mov = m; L.movF = 0; L.inst = { id: SIGUIENTE++, golpeados: new Map(), contacto: false, golpeo: false };
    L.durEstado = m.arranque + m.activo + m.recuperacion;
    for (const b of m.entrada.split('+')) L.buffer.consumir(b); if (L.cmd[k].movimiento) L.buffer.consumirMovimiento();
    ev({ tipo: 'movimiento', id: L.id, mov: k, nombre: m.nombre || null });
    if (m.tipo === 'definitivo' || m.tipo === 'especial') ev({ tipo: 'sonido', nombre: L.def.sonidos?.[m.tipo] || (m.tipo === 'especial' ? 'carga' : 'rayo') });
    return true;
  }

  // ---------------------------------------------------------------- decisión: qué quiere hacer el luchador este paso
  const ORDEN = ['definitivo', 'cargado', 'antiaereo', 'teleporte', 'embestida', 'especial', 'aereoEspecial', 'rompeGuardia', 'impulsoFuerte', 'lanzador', 'bajoMedio', 'bajoLigero', 'aereoFuerte', 'aereoMedio', 'aereoLigero', 'fuerte', 'medio', 'ligero'];
  function quiereMovimiento(L, lista) {
    let falta = null;
    for (const k of lista) {
      const m = L.def.movimientos[k]; if (!m || m.solo === 'cancel' && !lista.cancel) continue;
      const pide = cumple(L.buffer, L.cmd[k], { enAire: !L.suelo, impulsando: L.estado === 'impulso' || L.estado === 'correr' });
      if (m.energia && L.energia < m.energia) { if (pide && !falta) falta = k; continue; }
      if (pide) return k;
    }
    // pidió una técnica sin energía suficiente: se avisa (y se gasta la pulsación) para que no parezca que la tecla falla
    if (falta && !lista.cancel) { for (const b of L.cmd[falta].botones) L.buffer.consumir(b); ev({ tipo: 'sinEnergia', id: L.id, mov: falta, falta: L.def.movimientos[falta].energia - Math.floor(L.energia) }); }
    return null;
  }
  function decidir(L, e) {
    const st = ESTADOS[L.estado], B = L.buffer, op = rival(L);
    if (st.sinControl) return;
    if (L.estado === 'caida' && L.voló) return;   // saliendo volando de un golpe: sin control hasta tocar el suelo
    const libre = ['reposo', 'caminar', 'correr', 'agachado', 'aterrizaje', 'carga', 'bloqueo'].includes(L.estado);
    const aire = ['salto', 'caida'].includes(L.estado);
    // cancelaciones dentro de un ataque (combo cancel, air cancel, recovery cancel)
    if (st.ataque && L.mov) {
      const m = L.mov, enVentana = m.ventana && L.movF >= m.ventana[0] && L.movF <= m.ventana[1];
      if (enVentana && L.inst.contacto && m.cancel.length) {
        if (m.cancel.includes('saltoAereo') && reglas.cancelAereo && L.saltosAereos > 0 && B.pulsado('salto')) { B.consumir('salto'); L.saltosAereos--; L.vy = L.def.salto * 0.85 * reglas.saltoMul; intentar(L, 'caida'); ev({ tipo: 'saltoAereo', id: L.id }); return; }
        const lista = m.cancel.filter((k) => L.def.movimientos[k]); lista.cancel = true;
        const k = quiereMovimiento(L, lista.sort((a, b) => ORDEN.indexOf(a) - ORDEN.indexOf(b)));
        if (k && (L.def.movimientos[k].aire ? !L.suelo : L.suelo || L.def.movimientos[k].tipo === 'especial')) { iniciarMov(L, k, true); return; }
      }
      // recovery cancel: gastar energía para volver a neutro durante la recuperación
      const enRecup = L.movF >= m.arranque + m.activo;
      if (enRecup && reglas.cancelRecuperacion.activo && B.pulsado('esquiva') && L.energia >= reglas.cancelRecuperacion.costo) {
        B.consumir('esquiva'); L.energia -= reglas.cancelRecuperacion.costo; intentar(L, L.suelo ? 'reposo' : 'caida'); ev({ tipo: 'cancelRecuperacion', id: L.id }); return;
      }
      return;
    }
    if (L.estado === 'parada' && L.f > 2) { const k = quiereMovimiento(L, ORDEN); if (k) iniciarMov(L, k, true); return; }
    if (L.estado === 'impulso' && L.f > 3) { const k = quiereMovimiento(L, ['impulsoFuerte', 'especial', 'medio']); if (k) { iniciarMov(L, k); return; } }
    if (!libre && !aire && L.estado !== 'impulso') return;
    // relevo (2 vs 2)
    if (B.pulsado('relevo') && relevo(L)) return;
    if (libre) {
      if (reglas.transformacion && B.pulsado('transformar') && !L.transformado && L.def.transformaciones[0] && L.energia >= L.def.transformaciones[0].costo) { B.consumir('transformar'); L.energia -= L.def.transformaciones[0].costo; intentar(L, 'transformacion'); L.durEstado = ESTADOS.transformacion.dur; ev({ tipo: 'transformacion', id: L.id, fase: 'inicio', nombre: L.def.transformaciones[0].nombre }); return; }
      const k = quiereMovimiento(L, ORDEN.filter((x) => !L.def.movimientos[x]?.aire)); if (k) { iniciarMov(L, k); return; }
      if (reglas.esquiva && B.pulsado('esquiva') && L.aguante >= reglas.esquivaAguante) { B.consumir('esquiva'); L.aguante -= reglas.esquivaAguante; intentar(L, 'esquiva'); L.durEstado = ESTADOS.esquiva.dur; const lado = e.x ? Math.sign(e.x) : -L.dir; L.vx = lado * 7.5; L.esquivaDir = lado; ev({ tipo: 'esquiva', id: L.id }); return; }
      const atras = op ? Math.sign(e.x || 0) === -Math.sign(op.x - L.x) && e.x : false;
      const bloquea = e.abajo?.has('bloqueo') || (atras && op && amenaza(L, op));
      if (bloquea) { if (L.estado !== 'bloqueo') intentar(L, 'bloqueo'); L.agachaBloqueo = (e.y || 0) > 0; L.vx *= 0.5; return; }
      if (L.estado === 'bloqueo' && !bloquea) intentar(L, 'reposo');
      if (e.abajo?.has('carga')) { if (L.estado !== 'carga') { intentar(L, 'carga'); ev({ tipo: 'carga', id: L.id }); } L.energia = Math.min(reglas.energiaMax, L.energia + reglas.cargaPorCuadro * reglas.energiaMul); L.vx *= 0.6; return; }
      if (L.estado === 'carga') intentar(L, 'reposo');
      const saltar = B.pulsado('salto') || (!reglas.profundidad && (e.y || 0) < 0 && B.dir(1) !== 8 && B.dir(1) !== 7 && B.dir(1) !== 9);
      if (saltar && L.suelo) { B.consumir('salto'); if (intentar(L, 'salto')) { L.vy = L.def.salto * reglas.saltoMul * Math.sqrt(mult(L, 'velocidad')); L.suelo = false; L.vx = (e.x || 0) * L.def.velocidad * mult(L, 'velocidad') * reglas.velocidadMul * 1.05; ev({ tipo: 'salto', id: L.id }); } return; }
      if (reglas.impulso && B.movimiento('66') && L.estado !== 'impulso') { B.consumirMovimiento(); if (intentar(L, 'impulso')) { L.durEstado = ESTADOS.impulso.dur; L.vx = L.dir * 11 * mult(L, 'velocidad'); ev({ tipo: 'impulso', id: L.id }); } return; }
      if (!reglas.profundidad && (e.y || 0) > 0) { intentar(L, 'agachado'); L.vx *= 0.6; return; }
      if (e.x) {
        const corre = L.estado === 'correr' || (L.estado === 'impulso' && Math.sign(e.x) === L.dir);
        intentar(L, corre && Math.sign(e.x) === L.dir ? 'correr' : 'caminar');
        const vmax = L.def.velocidad * mult(L, 'velocidad') * reglas.velocidadMul * (L.estado === 'correr' ? 1.7 : Math.sign(e.x) === L.dir ? 1 : 0.8);
        L.vx += (e.x * vmax - L.vx) * Math.min(1, L.def.aceleracion * 0.35);
      } else if (['caminar', 'correr', 'agachado'].includes(L.estado)) intentar(L, 'reposo');
      if (reglas.profundidad && e.y) L.vz = e.y * L.def.velocidad * 0.6; else L.vz = 0;
      return;
    }
    if (aire) {
      const k = quiereMovimiento(L, ORDEN.filter((x) => L.def.movimientos[x]?.aire)); if (k) { iniciarMov(L, k); return; }
      if (B.pulsado('salto') && L.saltosAereos > 0 && L.f > 4) { B.consumir('salto'); L.saltosAereos--; L.vy = L.def.salto * 0.85 * reglas.saltoMul; L.vx = (e.x || 0) * L.def.velocidad * 0.9; ev({ tipo: 'saltoAereo', id: L.id }); return; }
      if (e.x) L.vx += (e.x * L.def.velocidad * 0.9 - L.vx) * 0.06;   // control aéreo limitado
    }
  }
  // ¿hay un ataque del rival que podría alcanzarme pronto? (para bloquear sosteniendo atrás sin quedarse pegado)
  // Solo cuando de verdad viene algo: un ataque del rival que aún no terminó su parte activa, un proyectil que se acerca o
  // un golpe bloqueable del jefe a punto de caer. Antes bastaba con estar a menos de 160 px: de cerca, «atrás» siempre
  // bloqueaba y era imposible retroceder caminando (y junto al titán no se podía huir de su puño, que no se bloquea).
  function amenaza(L, op) {
    if (c.proyectiles.some((p) => p.eq !== L.eq && Math.abs(p.x - L.x) < 320 && Math.sign(p.vx) === Math.sign(L.x - p.x))) return true;
    if (op.ataque) return !op.ataque.mano && op.t >= op.ataque.avisoF - 8 && op.t < op.ataque.avisoF + op.ataque.activo;
    return !!(op.mov && ESTADOS[op.estado].ataque && op.movF < op.mov.arranque + op.mov.activo && Math.abs(op.x - L.x) < 260);
  }

  function relevo(L) {
    const comp = c.luchadores.find((o) => o.eq === L.eq && o !== L && !o.activo && !o.ko);
    if (!comp || L.relevoEspera > 0) return false;
    L.buffer.consumir('relevo');
    entrar(comp, L); L.activo = false; L.estado = 'reposo'; L.mov = null; L.relevoEspera = reglas.relevoEspera; comp.relevoEspera = reglas.relevoEspera;
    ev({ tipo: 'relevo', sale: L.id, entra: comp.id }); return true;
  }
  function entrar(comp, ref) { comp.activo = true; comp.x = ref.x - ref.dir * 40; comp.y = 140; comp.vy = 0; comp.vx = ref.dir * 3; comp.suelo = false; comp.estado = 'caida'; comp.f = 0; comp.dir = ref.dir; comp.invul = 30; comp.px = comp.x; comp.py = comp.y; }

  // ---------------------------------------------------------------- avance del movimiento en curso
  function avanzarMov(L) {
    const m = L.mov; if (!m) return;
    L.movF++;
    const k = L.movF, act0 = m.arranque, act1 = m.arranque + m.activo;
    const vel = mult(L, 'velAtaque');
    if (k === act0) {
      if (m.proyectil) { const p = m.proyectil; c.proyectiles.push({ id: SIGUIENTE++, dueño: L.id, eq: L.eq, mov: m, x: L.x + L.dir * 40, y: (L.y || 0) + p.y, z: L.z, vx: p.vx * L.dir, vy: p.vy || 0, w: p.w, h: p.h, vida: p.vida, golpes: p.golpes, cadaGolpe: p.cadaGolpe || 8, efecto: p.efecto, color: p.color, inst: { id: SIGUIENTE++, golpeados: new Map() }, px: 0, py: 0 }); ev({ tipo: 'proyectil', id: L.id, efecto: p.efecto }); }
      if (m.teleporta) { const op = rival(L); if (op) { const nx = op.x + op.dir * -1 * 0 + (op.x > L.x ? 1 : -1) * 70; L.x = Math.min(lim.der - L.ancho / 2, Math.max(lim.izq + L.ancho / 2, nx)); L.dir = Math.sign(op.x - L.x) || L.dir; ev({ tipo: 'teleporte', id: L.id, x: L.x }); } }
      if (m.sube) { L.vy = m.sube; L.suelo = false; }
      if (m.caida) L.vy = m.caida;
    }
    if (k >= act0 && k < act1 && m.avance) L.vx = L.dir * m.avance * vel;
    else if (k < act0 && m.avance) L.vx = L.dir * m.avance * 0.3;
    if (k >= L.durEstado) {   // fin del movimiento
      const a = L.suelo ? 'reposo' : 'caida';
      cambiar(L, a);
    }
  }
  // cajas en coordenadas de mundo
  function hitbox(L) {
    const m = L.mov; if (!m || !L.inst) return null;
    const k = L.movF; if (k < m.arranque || k >= m.arranque + m.activo) return null;
    if (m.rayo) { const r = m.rayo; return { x: L.dir > 0 ? L.x + 20 : L.x - 20 - r.largo, y: L.y + r.y - r.alto / 2, w: r.largo, h: r.alto, z: L.z }; }
    if (m.proyectil || m.teleporta) return null;
    const b = m.caja, al = mult(L, 'alcance') * (L.def.alcance || 1);
    const w = b.w * al, x = L.dir > 0 ? L.x + b.x : L.x - b.x - w;
    return { x, y: L.y + b.y, w, h: b.h, z: L.z };
  }
  function hurtbox(L) {
    const st = ESTADOS[L.estado];
    const h = L.estado === 'agachado' || (L.estado === 'bloqueo' && L.agachaBloqueo) || L.mov?.bajo ? L.def.hurtbox.agachado : !L.suelo ? L.def.hurtbox.aire : L.def.hurtbox.depie;
    // tumbado: la caja también se acuesta (el dibujo queda en el suelo, con la cabeza hacia atrás); es invulnerable igual
    if (L.estado === 'derribado' || (L.estado === 'levantarse' && L.f < 8)) { const w = L.alto * 0.8; return [{ x: L.dir > 0 ? L.x - w + 20 : L.x - 20, y: 0, w, h: 30 }]; }
    const cajas = [{ x: L.x + h.x, y: L.y + h.y, w: h.w, h: h.h }];
    // el brazo o la pierna que golpea también se puede golpear (castigar un ataque que falló)
    if (st.ataque && L.mov && !L.mov.proyectil && !L.mov.rayo && L.movF >= L.mov.arranque) { const b = L.mov.caja, w = b.w * 0.7; cajas.push({ x: L.dir > 0 ? L.x + b.x : L.x - b.x - w, y: L.y + b.y + 2, w, h: Math.max(10, b.h - 4) }); }
    return cajas;
  }
  c.hitbox = hitbox; c.hurtbox = (L) => (L.hurtboxes ? L.hurtboxes() : hurtbox(L));
  const invulnerable = (L) => L.invul > 0 || !ESTADOS[L.estado]?.recibe || L.flotaInvul || (L.mov?.invul && L.movF >= L.mov.invul[0] && L.movF <= L.mov.invul[1]) || (L.estado === 'esquiva' && L.f >= 2 && L.f <= 14) || L.estado === 'transformacion';
  c.invulnerable = invulnerable;

  // ---------------------------------------------------------------- golpe
  function puedeBloquear(D, m, desde) {
    if (m.imbloqueable) return false;
    if (!['reposo', 'caminar', 'agachado', 'bloqueo', 'aturdidoBloqueo', 'carga'].includes(D.estado)) return false;
    if (!D.suelo && !reglas.bloqueoAereo) return false;
    const e = D.ultimaEntrada || {}, hacia = Math.sign(desde - D.x) || D.dir;
    const sostiene = e.abajo?.has('bloqueo') || (e.x && Math.sign(e.x) === -hacia) || D.estado === 'bloqueo' || D.estado === 'aturdidoBloqueo';
    if (!sostiene) return false;
    const agachado = (e.y || 0) > 0 || D.estado === 'agachado' || D.agachaBloqueo;
    if (m.bajo && !agachado) return false;
    if (m.alto && agachado) return false;
    return true;
  }
  function escala(combo) { const s = reglas.escalado; return combo.golpes < s.desde ? 1 : Math.max(s.minimo, 1 - s.paso * (combo.golpes - s.desde + 1)); }
  // A golpea a D con el movimiento m desde la posición fx. instancia: registro para no golpear dos veces.
  function golpear(A, D, m, inst, fx, { proyectil = null } = {}) {
    const previo = inst.golpeados.get(D.id);
    if (previo && (previo.n >= (m.golpes || 1) || c.cuadro - previo.f < (m.cadaGolpe || proyectil?.cadaGolpe || 99))) return false;
    if (invulnerable(D)) return false;
    // límite de malabares y duración del combo: impiden combos infinitos
    const enCombo = D.armadura ? !!D.combo && c.cuadro - D.combo.ultimo < 70 : D.combo && ['aturdido', 'empujado'].includes(D.estado);
    if (enCombo && !D.suelo && D.combo.malabar + (m.malabar || 1) > reglas.malabarMax) { D.flotaInvul = true; ev({ tipo: 'malabarMax', id: D.id }); return false; }
    if (enCombo && c.cuadro - D.combo.inicio > reglas.comboMaxCuadros) { D.flotaInvul = true; ev({ tipo: 'comboMax', id: D.id }); return false; }
    inst.golpeados.set(D.id, { n: (previo?.n || 0) + 1, f: c.cuadro }); inst.contacto = true;
    const hacia = Math.sign(D.x - fx) || A.dir;
    // parada (parry): bloqueo apretado justo antes del impacto
    if (reglas.paradaActiva && !m.imbloqueable && permitida(D.estado, 'parada') && D.buffer.pulsado('bloqueo', reglas.ventanaParada) && D.suelo) {
      D.buffer.consumir('bloqueo'); cambiar(D, 'parada'); D.durEstado = ESTADOS.parada.dur; D.vx = 0;
      if (!proyectil) A.pausa = Math.max(A.pausa, 18); D.pausa = 6; D.energia = Math.min(reglas.energiaMax, D.energia + 8);
      ev({ tipo: 'parada', id: D.id, de: A.id, x: D.x, y: D.y + 70 }); return true;
    }
    if (puedeBloquear(D, m, fx)) {
      const chip = (m.tipo === 'especial' || m.tipo === 'definitivo' || m.tipo === 'jefe') ? m.dano * reglas.chip * (m.tipo === 'jefe' ? 2 : 1) : 0;
      D.vida = Math.max(1, D.vida - Math.round(chip)); D.aguante -= m.dano * reglas.aguanteBloqueo;
      if (D.aguante <= 0) { D.aguante = 0; cambiar(D, 'aturdido', true); D.durEstado = 44; D.combo = { golpes: 0, dano: 0, malabar: 0, inicio: c.cuadro }; ev({ tipo: 'guardiaRota', id: D.id, x: D.x, y: D.y + 70 }); }
      else { cambiar(D, 'aturdidoBloqueo', true); D.durEstado = m.aturdB; }
      D.vx = hacia * (m.empuje[0] * 0.7) / D.masa; if (contraPared(D)) A.vx -= hacia * m.empuje[0] * reglas.empujeEsquina;
      const p = Math.round(m.pausa * 0.7); if (!proyectil) A.pausa = p; D.pausa = p;
      A.energia = Math.min(reglas.energiaMax, A.energia + m.gana * 0.5 * reglas.energiaMul); D.energia = Math.min(reglas.energiaMax, D.energia + 3 * reglas.energiaMul);
      D.ventaja = m.aturdB - (m.activo + m.recuperacion);
      ev({ tipo: 'bloqueo', id: D.id, de: A.id, x: D.x - hacia * 20, y: D.y + 70, dano: chip, ventaja: D.ventaja }); return true;
    }
    // golpe que entra
    if (!enCombo) D.combo = { golpes: 0, dano: 0, malabar: 0, inicio: c.cuadro, usados: {} };
    D.combo.ultimo = c.cuadro;
    const contra = m.contra && D.mov && ESTADOS[D.estado].ataque && D.movF < D.mov.arranque;
    D.combo.golpes++; if (!D.suelo || m.lanza) D.combo.malabar += m.malabar || 1;
    const usados = (D.combo.usados ||= {}); usados[m.id] = (usados[m.id] || 0) + 1;
    const repetido = usados[m.id] >= reglas.repetidoDesde ? reglas.repetidoMul : 1;   // repetir el mismo golpe en un combo rinde menos
    const elem = reglas.debilidades ? D.def.debilidades?.[A.def.elemento] ?? 1 : 1;
    let dano = (D.zonaMul ?? 1) * m.dano * mult(A, 'fuerza') / (mult(D, 'defensa') * reglas.defensaMul) * elem * escala(D.combo) * repetido * reglas.danoMul * (contra ? reglas.contraMul : 1);
    dano = Math.max(1, Math.round(dano));
    D.vida = Math.max(0, D.vida - dano); D.combo.dano += dano; c.golpesAplicados++;
    if (D.armadura) {   // jefes: superarmadura (reciben daño, no se aturden ni salen volando)
      const p = Math.round(m.pausa * 0.8); if (!proyectil) A.pausa = p; D.pausa = 0;
      A.energia = Math.min(reglas.energiaMax, A.energia + m.gana * reglas.energiaMul); A.ultimoGolpe = { mov: m.id, cuadro: c.cuadro };
      ev({ tipo: 'golpe', id: D.id, de: A.id, mov: m.id, movTipo: m.tipo, dano, x: fx + hacia * 40, y: (A.y || 0) + (m.caja?.y ?? 60) + 10, fuerza: m.pausa, contra, combo: D.combo.golpes, comboDano: D.combo.dano, efecto: m.efecto || A.def.efectos?.elemento, zona: D.zonaGolpeada });
      if (m.cinematica && !c.cinematica && D.vida > 0) { iniciarCinematica(A, D, m); if (!reglas.cinematicas) c.finCinematica(); }
      if (D.vida <= 0) ko(D, A);
      return true;
    }
    const aturd = Math.max(6, m.aturd - Math.floor(D.combo.golpes / 4) * reglas.decaeAturd);
    const pesado = m.empuje[0] >= 12 || m.tipo === 'definitivo' || m.rebotePared || m.reboteSuelo || D.vida <= 0;
    const vuela = m.lanza || !D.suelo || m.empuje[1] > 6 || pesado;
    if (vuela) D.voló = true;
    cambiar(D, pesado ? 'empujado' : 'aturdido', true); D.durEstado = aturd;
    // dónde y cuán fuerte pegó: solo lo lee el dibujo (cabeza atrás, doblarse o rodilla que cede); no cambia el combate
    const yImp = proyectil ? proyectil.y : (A.y || 0) + (m.caja?.y ?? 60) + (m.caja?.h ?? 20) / 2, rel = (yImp - (D.y || 0)) / (D.alto || 116);
    D.reaccion = { zona: m.bajo || rel < 0.32 ? 'bajo' : rel > 0.66 ? 'alto' : 'medio', fuerza: Math.min(1, 0.45 + (m.pausa || 6) / 20) };
    impulso(D, hacia * m.empuje[0] * (pesado ? 1.1 : 1), m.empuje[1] + (vuela && !D.suelo ? 2.5 : 0));
    if (D.suelo && !vuela) D.vy = 0;
    if (pesado && D.vy < 5) { D.vy = 5; D.suelo = false; }
    if (contraPared(D) && !vuela) A.vx -= hacia * m.empuje[0] * reglas.empujeEsquina;
    D.reboteParedPend = reglas.rebotePared && m.rebotePared && !D.reboteParedUsado;
    D.reboteSueloPend = reglas.reboteSuelo && m.reboteSuelo && !D.reboteSueloUsado;
    const p = m.pausa + (contra ? 4 : 0); if (!proyectil) A.pausa = p; D.pausa = p;
    A.energia = Math.min(reglas.energiaMax, A.energia + m.gana * reglas.energiaMul); D.energia = Math.min(reglas.energiaMax, D.energia + dano * 0.04 * reglas.energiaMul);
    D.ventaja = aturd - (m.activo + m.recuperacion);
    A.ultimoGolpe = { mov: m.id, cuadro: c.cuadro };
    ev({ tipo: 'golpe', id: D.id, de: A.id, mov: m.id, movTipo: m.tipo, dano, x: D.x - hacia * 10, y: D.y + (m.caja?.y ?? 60) + 10, fuerza: m.pausa, contra, combo: D.combo.golpes, comboDano: D.combo.dano, efecto: m.efecto || A.def.efectos?.elemento, ventaja: D.ventaja });
    if (m.cinematica && !c.cinematica && D.vida > 0) { iniciarCinematica(A, D, m); if (!reglas.cinematicas) c.finCinematica(); }   // sin cinemáticas: mismo daño, al instante
    if (D.vida <= 0) ko(D, A);
    return true;
  }
  const contraPared = (L) => L.x - L.ancho / 2 <= lim.izq + 2 || L.x + L.ancho / 2 >= lim.der - 2;
  function ko(D, A) {
    if (D.ko) return; D.ko = true; D.flotaInvul = false; ev({ tipo: 'ko', id: D.id, de: A?.id, x: D.x, y: D.y + 60 });
    if (D.armadura) { D.estado = 'derrota'; D.f = 0; return; }
    impulso(D, (Math.sign(D.x - (A?.x ?? D.x)) || -D.dir) * 9, 11); D.estado = 'empujado'; D.f = 0; D.durEstado = 999;
  }

  // ---------------------------------------------------------------- cinemática de definitivo (§12)
  // El motor CONGELA la física y espera eventos del Cinematic Director: impacto(i) aplica golpesCine[i] una sola vez,
  // fin() aplica lo que falte (si se omitió) y suelta al defensor con el empujón final. Daño total idéntico siempre.
  function iniciarCinematica(A, D, m) {
    c.cinematica = { id: m.cinematica, atacante: A.id, objetivo: D.id, golpes: m.golpesCine || [], aplicados: new Set(), mov: m, fin: false };
    ev({ tipo: 'cinematica', id: m.cinematica, atacante: A.id, objetivo: D.id, nombre: m.nombre || 'Definitivo' });
  }
  c.impactoCinematica = (i) => {
    const k = c.cinematica; if (!k || k.fin || k.aplicados.has(i) || i < 0 || i >= k.golpes.length) return false;
    k.aplicados.add(i);
    const A = buscar(k.atacante), D = buscar(k.objetivo);
    const dano = Math.max(1, Math.round(k.golpes[i] * mult(A, 'fuerza') / mult(D, 'defensa') * reglas.danoMul * (D.def.debilidades?.[A.def.elemento] ?? 1)));
    D.vida = Math.max(0, D.vida - dano); D.combo && (D.combo.golpes++, D.combo.dano += dano); c.golpesAplicados++;
    ev({ tipo: 'golpe', id: D.id, de: A.id, mov: 'definitivo', movTipo: 'definitivo', dano, x: D.x, y: D.y + 70, fuerza: 14, cine: i, combo: D.combo?.golpes || 1, comboDano: D.combo?.dano || dano, efecto: A.def.efectos?.elemento });
    return true;
  };
  c.finCinematica = () => {
    const k = c.cinematica; if (!k || k.fin) return false;
    for (let i = 0; i < k.golpes.length; i++) c.impactoCinematica(i);   // lo omitido se aplica aquí, una vez
    k.fin = true; const A = buscar(k.atacante), D = buscar(k.objetivo);
    if (D.vida <= 0) ko(D, A); else if (!D.armadura) { impulso(D, Math.sign(D.x - A.x || 1) * 12, 12); D.estado = 'empujado'; D.f = 0; D.durEstado = 40; }
    c.cinematica = null; ev({ tipo: 'cinematicaFin', id: k.id }); return true;
  };
  const buscar = (id) => todos().find((l) => l.id === id);
  c.buscar = buscar;

  // ---------------------------------------------------------------- paso de simulación
  c.paso = (entradas = []) => {
    c.eventos.length = 0; c.cuadro++;
    for (const L of todos()) { L.px = L.x; L.py = L.y; L.pz = L.z; }
    for (const p of c.proyectiles) { p.px = p.x; p.py = p.y; }
    if (c.cinematica) return c.eventos;            // congelado: el director manda
    if (c.terminado) { for (const L of todos()) L.f++; return c.eventos; }
    const ent = [...todos()];
    ent.forEach((L, i) => {
      if (!L.activo) { L.relevoEspera = Math.max(0, L.relevoEspera - 1); if (!L.ko && L.vida < L.vidaMax) L.vida = Math.min(L.vidaMax, L.vida + 0.15); return; }
      const e = (L.actualizar ? null : entradas[i]) || {}; L.ultimaEntrada = e;
      L.buffer.registrar(e, L.dir);
      if (L.actualizar) { L.actualizar(c); return; }   // entidades con su propia lógica (jefe)
      if (L.pausa > 0) { L.pausa--; return; }         // hitstop: congelado, pero la entrada ya quedó en el buffer
      L.f++; if (L.invul > 0) L.invul--; if (L.relevoEspera > 0) L.relevoEspera--;
      if (L.estado !== 'bloqueo' && L.estado !== 'aturdidoBloqueo') L.aguante = Math.min(L.def.resistencia, L.aguante + reglas.aguanteRecupera);
      if (L.transformado && --L.transformado.resta <= 0) { L.transformado = null; ev({ tipo: 'transformacion', id: L.id, fase: 'fin' }); }
      decidir(L, e);
      if (ESTADOS[L.estado].ataque) avanzarMov(L);
      // duraciones de estados no-ataque
      const st = ESTADOS[L.estado];
      if (st.dur && st.dur !== 'mov' && L.f >= L.durEstado && L.durEstado > 0) finEstado(L);
    });
    // física
    for (const L of todos()) {
      if (!L.activo || L.actualizar || L.pausa > 0) continue;
      const estabaSuelo = L.suelo;
      const choques = integrar(L, F, lim, { enSuelo: ['caminar', 'correr', 'impulso', 'esquiva'].includes(L.estado) || (L.mov && L.mov.avance) ? 'libre' : 'normal' });
      if (reglas.profundidad) { L.z = Math.max(-120, Math.min(120, L.z + L.vz)); }
      for (const ch of choques) {
        if (ch.tipo === 'pared' && L.reboteParedPend && ['empujado', 'aturdido'].includes(L.estado)) { L.reboteParedPend = false; L.reboteParedUsado = true; L.vx = -Math.sign(ch.lado) * ch.v * F.rebotePared; L.vy = Math.max(L.vy, 6); L.suelo = false; ev({ tipo: 'rebotePared', id: L.id, x: L.x, y: L.y + 60, lado: ch.lado }); golpearObstaculoPared(L, ch.lado); }
        if (ch.tipo === 'suelo') aterrizar(L, ch.v);
      }
      if (estabaSuelo && !L.suelo && ['reposo', 'caminar', 'correr', 'agachado'].includes(L.estado)) cambiar(L, 'caida');
      if (!L.suelo && L.estado === 'salto' && L.vy < 0) cambiar(L, 'caida');
    }
    const act = activos();
    for (let i = 0; i < act.length; i++) for (let j = i + 1; j < act.length; j++) if (act[i].eq !== act[j].eq && !act[i].actualizar && !act[j].actualizar) separar(act[i], act[j], F, lim);
    // orientación: los que tienen control miran a su rival más cercano
    for (const L of act) { if (L.actualizar || ESTADOS[L.estado].sinGiro || ESTADOS[L.estado].ataque || L.pausa) continue; const op = rival(L); if (op && Math.abs(op.x - L.x) > 4) L.dir = Math.sign(op.x - L.x); }
    // proyectiles (swept AABB contra hurtboxes: no atraviesan cuerpos aunque vayan rápido)
    for (const p of c.proyectiles) {
      const caja = { x: p.x - p.w / 2, y: p.y - p.h / 2, w: p.w, h: p.h };
      for (const D of act) {
        if (D.eq === p.eq || D.ko) continue; if (reglas.profundidad && Math.abs((D.z || 0) - (p.z || 0)) > 34) continue;
        for (const hb of c.hurtbox(D)) { const t = barrido(caja, p.vx, p.vy, hb); if (t >= 0) { const A = buscar(p.dueño); if (golpear(A, D, p.mov, p.inst, p.x, { proyectil: p })) { p.golpes--; if (p.golpes <= 0) p.vida = 0; else { p.vx = 0; p.vy = 0; p.vida = Math.min(p.vida, (p.cadaGolpe + 1) * p.golpes + 1); } } break; } }   // con golpes pendientes, el proyectil se queda pegado al cuerpo: no lo atraviesa
      }
      for (const o of c.obstaculos) if (!o.roto && solapan(caja, o)) { danarObstaculo(o, p.mov.dano); p.vida = 0; }
      p.x += p.vx; p.y += p.vy; p.vida--;
      if (p.x < lim.izq - 100 || p.x > lim.der + 100 || p.y < -40) p.vida = 0;
    }
    // choque entre proyectiles: se anulan golpe por golpe
    for (const a of c.proyectiles) for (const b of c.proyectiles) if (a !== b && a.eq !== b.eq && a.vida > 0 && b.vida > 0 && solapan({ x: a.x - a.w / 2, y: a.y - a.h / 2, w: a.w, h: a.h }, { x: b.x - b.w / 2, y: b.y - b.h / 2, w: b.w, h: b.h })) { const n = Math.min(a.golpes, b.golpes); a.golpes -= n; b.golpes -= n; if (a.golpes <= 0) a.vida = 0; if (b.golpes <= 0) b.vida = 0; ev({ tipo: 'choqueProyectil', x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }); }
    c.proyectiles = c.proyectiles.filter((p) => p.vida > 0);
    // golpes cuerpo a cuerpo: primero se juntan, luego se aplican (intercambio justo en el mismo cuadro)
    const golpes = [];
    for (const A of act) {
      if (A.pausa > 0) continue;
      const cajasA = A.hitboxes ? A.hitboxes(c) : [hitbox(A)].filter(Boolean);
      for (const hb of cajasA) for (const D of act) {
        if (D === A || D.eq === A.eq || D.ko) continue;
        if (reglas.profundidad && Math.abs((D.z || 0) - (hb.z ?? A.z ?? 0)) > 34) continue;
        const toca = c.hurtbox(D).filter((h) => solapan(hb, h)); if (toca.length) golpes.push({ A, D, m: hb.mov || A.mov, inst: hb.inst || A.inst, fx: hb.fx ?? A.x, zona: toca.sort((p, q) => (q.mul || 1) - (p.mul || 1))[0] });
      }
      for (const o of c.obstaculos) for (const hb of cajasA) if (!o.roto && A.inst && solapan(hb, o) && !A.inst.golpeados.has(o.id)) { A.inst.golpeados.set(o.id, { n: 1, f: c.cuadro }); danarObstaculo(o, (hb.mov || A.mov).dano); }
    }
    // choque de prioridades: si dos se golpean en el mismo cuadro, gana la prioridad mayor por 2 o más; si no, intercambian
    const quitar = new Set();
    for (const g of golpes) { const r = golpes.find((h) => h.A === g.D && h.D === g.A); if (r && (g.m.prioridad ?? 1) - (r.m.prioridad ?? 1) >= 2) quitar.add(r); }
    for (const g of golpes) if (!quitar.has(g)) { g.D.zonaMul = g.zona?.mul ?? 1; g.D.zonaGolpeada = g.zona?.zona || null; golpear(g.A, g.D, g.m, g.inst, g.fx); g.D.zonaMul = 1; }
    // fin de combate
    c.tiempo = Math.max(0, c.tiempo - 1);
    revisarFin();
    return c.eventos;
  };
  function finEstado(L) {
    const sigue = L.ultimaEntrada?.x && Math.sign(L.ultimaEntrada.x) === L.dir;
    const a = ({ impulso: sigue ? 'correr' : 'reposo', aterrizaje: 'reposo', parada: 'reposo', esquiva: L.suelo ? 'reposo' : 'caida', transformacion: 'reposo', aturdidoBloqueo: 'reposo', derribado: 'levantarse', levantarse: 'reposo' })[L.estado];
    if (L.estado === 'transformacion') { const t = L.def.transformaciones[0]; L.transformado = { id: t.id, nombre: t.nombre, mult: t.mult, colores: t.colores, resta: t.duracion }; ev({ tipo: 'transformacion', id: L.id, fase: 'listo', nombre: t.nombre }); }
    if (L.estado === 'aturdido') { if (L.suelo) { cambiar(L, L.voló ? 'derribado' : 'reposo'); if (L.estado === 'derribado') L.durEstado = ESTADOS.derribado.dur; else terminarCombo(L); } else cambiar(L, 'caida'); return; }
    if (L.estado === 'levantarse') { L.invul = 6; terminarCombo(L); }
    if (L.estado === 'derribado') L.durEstado = ESTADOS.levantarse.dur;
    if (L.estado === 'empujado') { if (L.suelo) { cambiar(L, 'derribado', true); L.durEstado = ESTADOS.derribado.dur; } return; }
    if (a) { cambiar(L, a); if (ESTADOS[a].dur && ESTADOS[a].dur !== 'golpe') L.durEstado = ESTADOS[a].dur; }
  }
  function terminarCombo(L) { if (L.combo) ev({ tipo: 'comboFin', id: L.id, golpes: L.combo.golpes, dano: L.combo.dano }); L.combo = null; L.voló = false; L.flotaInvul = false; L.reboteParedUsado = false; L.reboteSueloUsado = false; }
  function aterrizar(L, v) {
    L.saltosAereos = reglas.saltosAereos ?? L.def.saltosAereos;
    if (L.reboteSueloPend && ['empujado', 'aturdido'].includes(L.estado)) { L.reboteSueloPend = false; L.reboteSueloUsado = true; L.vy = Math.max(7, v * F.reboteSuelo); L.suelo = false; L.y = 0.5; ev({ tipo: 'reboteSuelo', id: L.id, x: L.x, y: 0 }); return; }
    if (L.ko) { if (L.estado !== 'derrota') { L.estado = 'derribado'; L.f = 0; L.durEstado = 9999; L.vx *= 0.3; } ev({ tipo: 'caidaKO', id: L.id, x: L.x }); return; }
    if (L.estado === 'empujado' || ((L.estado === 'aturdido' || L.estado === 'caida') && L.voló)) { cambiar(L, 'derribado', true); L.durEstado = ESTADOS.derribado.dur; L.vx *= 0.4; ev({ tipo: 'derribo', id: L.id, x: L.x, v }); return; }   // lanzado: cae derribado, no de pie
    if (L.estado === 'aturdido') return;
    if (['salto', 'caida'].includes(L.estado)) { if (L.combo) terminarCombo(L); cambiar(L, 'aterrizaje'); L.durEstado = ESTADOS.aterrizaje.dur; L.flotaInvul = false; ev({ tipo: 'aterriza', id: L.id }); return; }
    if (ESTADOS[L.estado].ataque && !ESTADOS[L.estado].suelo && L.mov?.aire) { cambiar(L, 'aterrizaje'); L.durEstado = 6; return; }
    if (L.estado === 'esquiva' || L.estado === 'especial' || L.estado === 'combo') return;
  }
  function danarObstaculo(o, dano) { o.vida -= dano; ev({ tipo: 'obstaculo', id: o.id, x: o.x + o.w / 2, y: o.y + o.h / 2 }); if (o.vida <= 0 && !o.roto) { o.roto = true; ev({ tipo: 'romper', id: o.id, x: o.x + o.w / 2, y: o.y + o.h / 2, w: o.w, h: o.h, color: o.color }); } }
  function golpearObstaculoPared(L, lado) { for (const o of c.obstaculos) if (!o.roto && Math.abs(o.x + o.w / 2 - L.x) < o.w + 60) danarObstaculo(o, 60); ev({ tipo: 'paredGrieta', lado }); }

  function revisarFin() {
    if (c.terminado) return;
    const eqs = [...new Set(todos().map((l) => l.eq))];
    const vivos = eqs.filter((e) => todos().some((l) => l.eq === e && !l.ko && (l.activo || l.tipo === 'luchador')));
    // relevo automático: si cae el activo y queda compañero, entra
    for (const L of c.luchadores) if (L.ko && L.activo && L.f > 60 && L.suelo) { const comp = c.luchadores.find((o) => o.eq === L.eq && !o.activo && !o.ko); if (comp) { entrar(comp, L); L.activo = false; ev({ tipo: 'relevo', sale: L.id, entra: comp.id, forzado: true }); } }
    const esperandoCaida = todos().some((l) => l.ko && l.activo && (!l.suelo || l.f < (l.armadura ? 150 : 40)));
    if (vivos.length <= 1 && !esperandoCaida && !c.cinematica && !c.sigue?.()) return terminar(vivos[0] ?? null, 'ko');
    if (c.tiempo <= 0 && !c.cinematica) {
      const pct = eqs.map((e) => { const ls = todos().filter((l) => l.eq === e); return ls.reduce((s, l) => s + Math.max(0, l.vida), 0) / ls.reduce((s, l) => s + l.vidaMax, 0); });
      let g = pct[0] === pct[1] ? null : eqs[pct.indexOf(Math.max(...pct))];
      if (reglas.desempate === 'empate') g = null;
      if (reglas.desempate === 'energia') { const en = eqs.map((e) => todos().filter((l) => l.eq === e).reduce((s, l) => s + l.energia, 0)); g = en[0] === en[1] ? g : eqs[en.indexOf(Math.max(...en))]; }
      terminar(g, 'tiempo');
    }
  }
  function terminar(eq, motivo) {
    c.terminado = { ganador: eq, motivo, cuadro: c.cuadro };
    for (const L of todos()) { if (!L.activo && L.tipo === 'luchador') continue; const gana = L.eq === eq && !L.ko; L.estado = gana ? 'victoria' : 'derrota'; L.f = 0; L.mov = null; L.vx = 0; }
    ev({ tipo: 'fin', ganador: eq, motivo }); ev({ tipo: 'sonido', nombre: eq == null ? 'aviso' : 'victoria' });
  }
  c.terminar = terminar;
  // utilidades para modos y pruebas
  c.agregar = (o) => { const L = crearLuchador(o, c.luchadores.length + c.extras.length, reglas); c.extras.push(L); return L; };
  c.quitarCaidos = () => { c.extras = c.extras.filter((l) => !(l.ko && l.f > 90)); };
  c.instantanea = () => JSON.stringify(todos().map((l) => [l.id, +l.x.toFixed(3), +l.y.toFixed(3), l.vida, +l.energia.toFixed(2), l.estado, l.movF]));
  return c;
}
