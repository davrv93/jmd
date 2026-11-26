// Forja · Anime Battle Engine · modos de combate (§4) como CONFIGURACIONES DECLARATIVAS y la partida que los corre.
// La partida no dibuja: reparte entradas (humanas o de CPU), avanza el combate y el director, y decide rondas, oleadas,
// torneo, capítulos y jefe. Es determinista y corre igual en Node (pruebas) que en el navegador.
import { crearCombate } from './combate.js';
import { crearIA, crearMuneco } from './ia.js';
import { crearDirector } from './director.js';
import { crearJefe, JEFES } from './jefe.js';
import { PERSONAJES, CINEMATICAS } from './personajes.js';
import { crearPRNG } from '../nucleo/semilla.js';

export const MODOS = {
  cpu:           { tipo: 'duelo', nombre: 'Contra la CPU', rondas: 2, rival: 'cpu' },
  versus:        { tipo: 'duelo', nombre: '1 contra 1 (dos jugadores)', rondas: 2, rival: 'humano' },
  entrenamiento: { tipo: 'entrenamiento', nombre: 'Entrenamiento', muneco: 'quieto', vidaInfinita: true, energiaInfinita: true, cajas: true },
  supervivencia: { tipo: 'oleadas', nombre: 'Supervivencia', curacion: 0.35, rivales: ['eco', 'mako', 'eco', 'ren', 'eco', 'mako', 'ren'], niveles: ['principiante', 'principiante', 'intermedio', 'intermedio', 'avanzado', 'avanzado', 'experto'] },
  torneo:        { tipo: 'torneo', nombre: 'Torneo', participantes: 8 },
  historia:      { tipo: 'historia', nombre: 'Historia', capitulos: [
    { titulo: 'Capítulo 1 · El eco en el patio', texto: 'Una sombra copia tus movimientos en el patio del dojo. Muéstrale que el original es más rápido.', rival: 'eco', nivel: 'principiante', escenario: 'dojo' },
    { titulo: 'Capítulo 2 · Brasas en el puerto', texto: 'Tu rival de siempre te espera bajo las grúas. Dice que esta vez no se contendrá.', rival: 'rival', nivel: 'intermedio', escenario: 'puerto' },
    { titulo: 'Capítulo 3 · La noche de la tormenta', texto: 'Sobre la azotea, con la ciudad iluminada, el duelo decide quién guía la próxima generación.', rival: 'rival', nivel: 'avanzado', escenario: 'azotea' },
  ] },
  jefe:          { tipo: 'jefe', nombre: 'Batalla contra jefe', jefe: 'gaiaron' },
  equipos:       { tipo: 'equipos', nombre: '2 contra 2 (relevos)', rondas: 1, rival: 'cpu' },
  lateral:       { tipo: 'lateral', nombre: 'Avance lateral', largo: 3600, oleadas: [{ x: 500, enemigos: 2 }, { x: 1300, enemigos: 3 }, { x: 2100, enemigos: 3 }, { x: 2900, enemigos: 4, rival: true }] },
  arena25d:      { tipo: 'duelo', nombre: 'Arena 2.5D', rondas: 2, rival: 'cpu', profundidad: true },
};

const vacia = () => ({ x: 0, y: 0, recien: new Set(), abajo: new Set() });

// opc: { modo (id o objeto), jugador, rival, personajes, reglas, semilla, nivel, escenario, reglasJefe, alEvento }
export function crearPartida(opc = {}) {
  const modo = typeof opc.modo === 'object' ? opc.modo : MODOS[opc.modo || 'cpu'];
  const P = { ...PERSONAJES, ...(opc.personajes || {}) };
  const rng = crearPRNG(opc.semilla ?? 1);
  const p = { modo, combate: null, director: null, ias: [], ronda: 1, marcador: [0, 0], fase: 'combate', espera: 0, tarjeta: null, resultado: null, eventos: [], cuadro: 0,
    indice: 0, victorias: 0, llave: null, oleada: 0, escena: null };
  const defDe = (id) => P[id] || P.ren;
  const rivalDe = () => opc.rival || (opc.jugador === 'mako' ? 'ren' : 'mako');
  const cine = { ...CINEMATICAS, ...(opc.cinematicas || {}) };
  function nuevoCombate(conf) {
    const reglas = { ...(opc.reglas || {}), ...(conf.reglas || {}) };
    if (modo.profundidad) reglas.profundidad = true;
    if (modo.tipo === 'entrenamiento' || modo.tipo === 'lateral' || modo.sinTiempo) reglas.tiempoRonda = 1e6;   // sin reloj
    const c = crearCombate({ luchadores: conf.luchadores, reglas, semilla: (opc.semilla ?? 1) + p.ronda * 7919 + p.indice * 104729, escenario: conf.escenario || opc.escenario });
    p.combate = c; p.ias = new Map();
    p.director = crearDirector(c, { cinematicas: cine, acc: opc.acc, alEvento: (e) => p.eventos.push(e) });
    c.luchadores.forEach((L, i) => { const o = conf.luchadores[i]; if (o.control === 'cpu') p.ias.set(L.id, crearIA(L, c, { nivel: o.nivel || opc.nivel || 'intermedio', semilla: (opc.semilla ?? 1) * 31 + i, ajustes: opc.ajustesIA })); else if (o.control === 'muneco') p.ias.set(L.id, crearMuneco(L, o.muneco)); });
    return c;
  }
  const yo = (extra = {}) => ({ def: defDe(opc.jugador || 'ren'), eq: 0, control: 'humano', x: -180, ...extra });
  function arrancar() {
    const t = modo.tipo;
    // presentación de la ronda: ~1,3 s con los dos quietos en guardia antes de que nadie se mueva (ni la CPU)
    p.cuenta = t === 'jefe' || t === 'entrenamiento' || opc.sinCuenta ? 0 : 80;
    if (p.cuenta) p.eventos.push({ tipo: 'ronda', n: p.ronda, indice: p.indice });
    if (t === 'duelo') nuevoCombate({ luchadores: [yo(), { def: defDe(rivalDe()), eq: 1, control: modo.rival === 'humano' ? 'humano' : 'cpu', x: 180, nivel: opc.nivel }] });
    else if (t === 'entrenamiento') nuevoCombate({ luchadores: [yo(), { def: defDe(rivalDe()), eq: 1, control: 'muneco', muneco: modo.muneco, x: 120 }] });
    else if (t === 'oleadas') nuevoCombate({ luchadores: [yo(), { def: defDe(modo.rivales[p.indice % modo.rivales.length]), eq: 1, control: 'cpu', x: 200, nivel: modo.niveles[Math.min(p.indice, modo.niveles.length - 1)] }] });
    else if (t === 'historia') { const cap = modo.capitulos[p.indice]; p.tarjeta = { titulo: cap.titulo, texto: cap.texto }; nuevoCombate({ luchadores: [yo(), { def: defDe(cap.rival === 'rival' ? rivalDe() : cap.rival), eq: 1, control: 'cpu', x: 200, nivel: cap.nivel }], escenario: { ...(opc.escenario || {}), tema: cap.escenario } }); }
    else if (t === 'torneo') {
      if (!p.llave) { const pool = ['ren', 'mako', 'eco'], niveles = ['principiante', 'intermedio', 'avanzado', 'experto']; p.llave = Array.from({ length: (modo.participantes || 8) - 1 }, (_, i) => ({ id: pool[(i + 1) % pool.length], nivel: niveles[Math.min(3, Math.floor(i / 2))], nombre: `${defDe(pool[(i + 1) % pool.length]).nombre} ${['Alfa', 'Beta', 'Gama', 'Delta', 'Épsilon', 'Zeta', 'Eta'][i]}` })); p.rondasTorneo = Math.log2(modo.participantes || 8); }
      const r = p.llave[Math.min(p.indice, p.llave.length - 1)]; p.tarjeta = { titulo: `Torneo · ${['Cuartos de final', 'Semifinal', 'Final'][Math.min(2, p.indice)] || 'Ronda'}`, texto: `Tu rival: ${r.nombre}` };
      nuevoCombate({ luchadores: [yo(), { def: defDe(r.id), eq: 1, control: 'cpu', x: 200, nivel: r.nivel }] });
    }
    else if (t === 'jefe') {
      const c = nuevoCombate({ luchadores: [yo({ x: -300 })], escenario: { limites: { izq: -620, der: 620 }, ...(opc.escenario || {}) } });
      const J = crearJefe(c, opc.jefe || JEFES[modo.jefe], { x: 430, reglasJefe: opc.reglasJefe }); p.jefe = J;
      if (opc.sinIntro) J.despertar(); else iniciarEscena('despertar', J, () => J.despertar());
    }
    else if (t === 'equipos') {
      const otro = rivalDe();
      nuevoCombate({ luchadores: [yo(), { def: defDe(otro), eq: 0, control: 'humano', x: -180, activo: false }, { def: defDe(otro), eq: 1, control: 'cpu', x: 180, nivel: opc.nivel }, { def: defDe(opc.jugador || 'ren'), eq: 1, control: 'cpu', x: 180, activo: false, nivel: opc.nivel }] });
    }
    else if (t === 'lateral') {
      const c = nuevoCombate({ luchadores: [yo({ x: 0 })], escenario: { limites: { izq: -400, der: 500 }, ...(opc.escenario || {}) } });
      p.oleada = 0; c.sigue = () => p.oleada < modo.oleadas.length; lanzarOleada(c);
    }
  }
  function lanzarOleada(c) {
    const o = modo.oleadas[p.oleada]; if (!o) return;
    c.limites.izq = o.x - 650; c.limites.der = o.x + 520;
    for (let i = 0; i < o.enemigos; i++) { const esRival = o.rival && i === 0; const L = c.agregar({ def: defDe(esRival ? rivalDe() : 'eco'), eq: 1, x: o.x + 260 + i * 70, control: 'cpu' }); p.ias.set(L.id, crearIA(L, c, { nivel: esRival ? 'avanzado' : 'principiante', semilla: 900 + p.oleada * 10 + i })); }
    p.eventos.push({ tipo: 'oleada', n: p.oleada + 1, total: modo.oleadas.length });
  }
  function iniciarEscena(id, J, alTerminar) { p.escena = id; p.director.iniciar(id, { objetivo: J }, () => { p.escena = null; alTerminar?.(); }); }
  p.omitir = () => { if (p.director?.activa) { p.director.omitir(); return true; } return false; };

  // entradas: [jugador 1, jugador 2] (lo que muestrea el Input Manager por paso). dt: segundos de simulación del paso.
  p.paso = (entradas = [], dt = 1 / 60) => {
    p.eventos.length = 0; p.cuadro++;
    if (p.fase === 'fin') return p.eventos;
    if (p.tarjeta) { if ([...(entradas[0]?.recien || [])].length) p.tarjeta = null; else return p.eventos; }
    const c = p.combate;
    if (p.director.activa) { p.director.avanzar(dt * 1000); c.paso([]); return p.eventos; }   // cinemática: el combate está congelado
    if (p.cuenta > 0) {   // presentación: el reloj no corre y nadie recibe entradas
      p.cuenta--; for (const L of [...c.luchadores, ...c.extras]) { L.px = L.x; L.py = L.y; L.f++; }
      if (!p.cuenta) p.eventos.push({ tipo: 'pelea' });
      return p.eventos;
    }
    // reparte entradas: humanos en orden, CPU con su IA
    let h = 0; const todos = [...c.luchadores, ...c.extras];
    const ents = todos.map((L) => {
      const ia = p.ias.get(L.id); if (ia) return ia.entrada();
      if (L.control === 'humano') { if (modo.tipo === 'equipos') return L.activo ? entradas[L.eq === 0 ? 0 : 1] || vacia() : vacia(); return entradas[h++] || vacia(); }
      return vacia();
    });
    const evs = c.paso(ents);
    for (const ia of p.ias.values()) ia.observar?.(evs);
    p.eventos.push(...evs);
    for (const e of evs) {
      if (e.tipo === 'cinematica') { const A = c.buscar(e.atacante), D = c.buscar(e.objetivo); p.director.iniciar(e.id, { atacante: A, objetivo: D }); }
      if (e.tipo === 'jefeFase' && e.cinematica) iniciarEscena(e.cinematica, p.jefe);
    }
    // modos con reglas propias
    if (modo.tipo === 'entrenamiento') { const [yoL, mu] = c.luchadores; if (modo.energiaInfinita) yoL.energia = c.reglas.energiaMax; if (modo.vidaInfinita && !mu.combo && mu.vida < mu.vidaMax) mu.vida = mu.vidaMax; if (mu.ko) { mu.ko = false; mu.vida = mu.vidaMax; mu.estado = 'reposo'; c.terminado = null; } }
    if (modo.tipo === 'lateral') {
      c.quitarCaidos();
      const quedan = c.extras.filter((l) => !l.ko).length;
      if (!quedan && p.oleada < modo.oleadas.length) { p.oleada++; if (p.oleada < modo.oleadas.length) lanzarOleada(c); else { c.limites.der = modo.largo; p.eventos.push({ tipo: 'oleadasCompletas' }); } }
    }
    if (c.terminado && !p.espera) p.espera = 150;
    if (p.espera && --p.espera === 0) finDeCombate(c.terminado);
    return p.eventos;
  };
  function finDeCombate(t) {
    const gane = t.ganador === 0, tipo = modo.tipo;
    p.eventos.push({ tipo: 'finCombate', gane, motivo: t.motivo });
    if (tipo === 'duelo' || tipo === 'equipos') {
      if (t.ganador != null) p.marcador[t.ganador]++;
      const meta = modo.rondas || 2;
      if (p.marcador[0] >= meta || p.marcador[1] >= meta) return terminar(p.marcador[0] >= meta);
      p.ronda++; return arrancar();
    }
    if (tipo === 'oleadas') { if (!gane) return terminar(false, { rivalesVencidos: p.victorias }); p.victorias++; p.indice++; const vida = p.combate.luchadores[0]; const resto = vida.vida / vida.vidaMax; arrancar(); const L = p.combate.luchadores[0]; L.vida = Math.min(L.vidaMax, Math.round(L.vidaMax * Math.min(1, resto + modo.curacion))); return; }
    if (tipo === 'torneo') { if (!gane) return terminar(false, { llegaste: p.indice }); p.indice++; if (p.indice >= p.rondasTorneo) return terminar(true, { campeon: true }); return arrancar(); }
    if (tipo === 'historia') { if (!gane) return opc.historiaReintentar === false ? terminar(false, { capitulo: p.indice + 1 }) : arrancar(); p.indice++; if (p.indice >= modo.capitulos.length) return terminar(true); return arrancar(); }
    if (tipo === 'jefe' && !gane && (p.continues ?? opc.continues ?? 0) > 0) {   // continuar: el titán conserva su daño
      p.continues = (p.continues ?? opc.continues) - 1; const J = p.jefe, vida = J.vida, fase = J.fase; arrancar(); p.jefe.vida = vida; p.jefe.fase = fase; p.jefe.despertar(); p.director.omitir(); p.eventos.push({ tipo: 'continuar', quedan: p.continues }); return;
    }
    return terminar(gane);
  }
  function terminar(gane, extra = {}) { p.fase = 'fin'; p.resultado = { gane, ...extra }; p.eventos.push({ tipo: 'finPartida', gane, ...extra }); }
  p.reiniciar = () => { p.ronda = 1; p.marcador = [0, 0]; p.fase = 'combate'; p.espera = 0; p.indice = 0; p.victorias = 0; p.llave = null; p.resultado = null; arrancar(); };
  arrancar();
  return p;
}
