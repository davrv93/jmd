// Duelo anime · plantilla de Forja (JMD Learning) · motor Anime Battle Engine. DEMO A «Shadow Warriors».
// DATOS (datos.js) trae tu personaje, las REGLAS que elegiste en «Diseña tu videojuego» (DATOS.reglas) y la
// configuración avanzada del Editor (DATOS.config, JSON validado). Este archivo traduce cada regla a una opción del
// motor. El motor vive en motores/anime/ (simulación determinista) y motores/nucleo/ (bucle, entrada, HUD…).
import { iniciarAnime } from 'motores/anime/juego.js';
import { personajesCon } from 'motores/anime/config.js';
import { MODOS } from 'motores/anime/modos.js';

const D = window.DATOS || {}, C = D.config || {};
const R = (k, defecto) => { const v = D.reglas && D.reglas[k]; return v === undefined || v === null ? defecto : v; };

// >>> reglas
// Cada línea lee UNA regla del catálogo (motor/juegos/duelo-anime.js) con su valor por defecto.
const reglas = {
  danoMul: R('reglas.danoMul', 1) * (C.combate?.danoMul ?? 1), vidaMul: R('reglas.vidaMul', 1), defensaMul: R('reglas.defensaMul', 1),
  escalado: { desde: 3, paso: C.combate?.escaladoPaso ?? R('reglas.escalado', 0.1), minimo: C.combate?.escaladoMinimo ?? R('reglas.escaladoMinimo', 0.3) },
  malabarMax: C.combate?.malabarMax ?? R('reglas.malabarMax', 6), comboMaxCuadros: C.combate?.comboMaxCuadros ?? R('reglas.comboMax', 360),
  decaeAturd: R('reglas.decaeAturd', 2), repetidoMul: R('reglas.repetidoMul', 0.8), contraMul: R('reglas.contraMul', 1.25), chip: C.combate?.chip ?? R('reglas.chip', 0.12),
  rebotePared: R('reglas.rebotePared', true), reboteSuelo: R('reglas.reboteSuelo', true), empujeEsquina: R('reglas.empujeEsquina', 0.5), debilidades: R('reglas.debilidades', true),
  energiaInicial: R('recursos.energiaInicial', 0), energiaMul: (C.combate?.energiaMul ?? 1) * R('recursos.energiaMul', 1),
  aguanteBloqueo: R('recursos.aguanteBloqueo', 0.28), aguanteRecupera: R('recursos.aguanteRecupera', 0.35),
  impulso: R('proc.impulso', true), saltosAereos: R('proc.saltosAereos', -1) < 0 ? null : R('proc.saltosAereos', -1), esquiva: R('proc.esquiva', true), esquivaAguante: R('proc.esquivaCosto', 18),
  cargaPorCuadro: R('proc.carga', 0.55), paradaActiva: R('proc.parada', true), ventanaParada: C.combate?.ventanaParada ?? R('proc.ventanaParada', 6), bloqueoAereo: R('proc.bloqueoAereo', false),
  cancelRecuperacion: R('proc.cancelRecuperacion', { activo: true, costo: 25 }), cancelAereo: R('proc.cancelAereo', true),
  ventanaMovimiento: R('proc.ventanaMovimiento', 14), ventanaPulsacion: R('proc.ventanaPulsacion', 6), relevoEspera: R('proc.relevoEspera', 180),
  transformacion: R('conflicto.transformacion', true), definitivo: R('conflicto.definitivo', true), cinematicas: R('conflicto.cinematicas', true),
  tiempoRonda: C.combate?.tiempoRonda ?? R('objetivo.tiempo', 99), desempate: R('resultado.desempate', 'vida'),
  gravedadMul: R('limites.gravedad', 0.82) / 0.82, velocidadMul: R('limites.velocidadMovimiento', 1), saltoMul: R('limites.salto', 1),
  fisica: { friccionSuelo: R('limites.friccion', 0.78), ...(C.fisica || {}) },
  limites: { izq: -R('limites.escenario', 700), der: R('limites.escenario', 700) },
};
// <<<

// >>> personajes
// Los luchadores son datos (motores/anime/personajes.js). Aquí se ajustan con tus reglas y con el Editor.
const personajes = personajesCon(C);
const ELEMENTO = { electrico: ['#7fd4ff', '#bfe9ff'], hielo: ['#bfefff', '#e6fbff'], viento: ['#b8f5c8', '#e2ffe9'], luz: ['#fff1a8', '#fffbe0'], fuego: ['#ff9a3c', '#ffd08a'], tierra: ['#d1a46a', '#f0d3a8'], sombra: ['#a99bff', '#d6ceff'] };
for (const [quien, elemento] of [['ren', R('conflicto.elementoRen', 'electrico')], ['mako', R('conflicto.elementoMako', 'fuego')]]) {
  const p = personajes[quien], q = quien === 'ren'
    ? { velocidad: R('ren.velocidad', 1), fuerza: R('ren.fuerza', 1), salud: R('ren.salud', 1), alcance: R('ren.alcance', 1), ropa: R('ren.ropa', null) }
    : { velocidad: R('mako.velocidad', 1), fuerza: R('mako.fuerza', 1), salud: R('mako.salud', 1), alcance: R('mako.alcance', 1), ropa: R('mako.ropa', null) };
  personajes[quien] = { ...p, elemento, velocidad: p.velocidad * q.velocidad, fuerza: p.fuerza * q.fuerza, salud: Math.round(p.salud * q.salud), alcance: (p.alcance || 1) * q.alcance, resistencia: R('recursos.aguante', 100),
    cuerpo: { ...p.cuerpo, ...(q.ropa ? { ropa: q.ropa } : {}) }, efectos: { ...p.efectos, elemento, aura: ELEMENTO[elemento][0], estela: ELEMENTO[elemento][1] } };
}
for (const p of Object.values(personajes)) {
  const m = p.movimientos = { ...p.movimientos };
  for (const k of ['especial', 'antiaereo', 'teleporte', 'embestida', 'aereoEspecial']) if (m[k]) m[k] = { ...m[k], energia: R('recursos.costoEspecial', 15) };
  if (m.cargado) m.cargado = { ...m.cargado, energia: R('recursos.costoCargado', 35) };
  if (m.definitivo) m.definitivo = { ...m.definitivo, energia: R('recursos.costoDefinitivo', 100) };
  if (!R('conflicto.proyectiles', true)) { delete m.especial; delete m.aereoEspecial; if (m.cargado?.rayo) delete m.cargado; }
  if (!R('conflicto.rompeGuardia', true)) delete m.rompeGuardia;
  if (!R('conflicto.lanzador', true)) delete m.lanzador;
  for (const mv of Object.values(m)) if (mv.cancel) mv.cancel = mv.cancel.filter((x) => x === 'saltoAereo' || m[x]);
  p.transformaciones = (p.transformaciones || []).map((t) => ({ ...t, costo: R('recursos.costoTransformacion', 50), duracion: R('recursos.duracionTransformacion', 600), mult: { ...t.mult, fuerza: R('conflicto.fuerzaTransformacion', 1.25) } }));
}
// <<<

// >>> modos
// Los modos son configuraciones declarativas (motores/anime/modos.js). Las reglas cambian sus números.
const rivales = MODOS.supervivencia.rivales, niveles = MODOS.supervivencia.niveles, n = R('objetivo.supervivenciaRivales', 7);
const nOleadas = R('objetivo.oleadasLateral', 4), oleadas = Array.from({ length: nOleadas }, (_, i) => ({ x: 500 + i * 800, enemigos: 2 + Math.min(2, i), rival: i === nOleadas - 1 }));
const modos = {
  cpu: { rondas: R('objetivo.rondas', 2) }, versus: { rondas: R('objetivo.rondas', 2) }, arena25d: { rondas: R('objetivo.rondas', 2) }, equipos: { rondas: Math.max(1, R('objetivo.rondas', 2) - 1) },
  supervivencia: { rivales: Array.from({ length: n }, (_, i) => rivales[i % rivales.length]), niveles: Array.from({ length: n }, (_, i) => niveles[Math.min(niveles.length - 1, Math.floor(i * niveles.length / n))]), curacion: R('recursos.supervivenciaCuracion', 0.35) },
  torneo: { participantes: R('objetivo.torneoTamano', 8) }, lateral: { oleadas, largo: 500 + oleadas.length * 800 + 400 },
};
const OBSTACULOS = { ninguno: [], pilares: [{ x: -560, y: 0, w: 50, h: 120, vida: 160, color: '#5a5068' }, { x: 510, y: 0, w: 50, h: 120, vida: 160, color: '#5a5068' }],
  cuatro: [-560, -300, 250, 510].map((x) => ({ x, y: 0, w: 46, h: 110, vida: 140, color: '#5a5068' })), cajas: [-420, -200, 160, 380].map((x) => ({ x, y: 0, w: 60, h: 60, vida: 60, color: '#8a6a44' })) };
// <<<

const modoElegido = R('jugadores.modo', C.modo || 'cpu');
const ia = { reaccionMs: R('cpu.reaccion', C.ia?.reaccionMs), agresion: R('cpu.agresion', C.ia?.agresion), bloqueo: R('cpu.bloqueo', C.ia?.bloqueo), error: R('cpu.errores', C.ia?.error), adapta: R('cpu.aprende', undefined), parada: R('cpu.parada', undefined) };
for (const k of Object.keys(ia)) if (ia[k] == null) delete ia[k];
const sinSacudida = !R('efectos.sacudida', true) || C.accesibilidad?.reducirMovimiento, sinDestellos = !R('efectos.destellos', true) || C.accesibilidad?.reducirDestellos;

iniciarAnime({
  titulo: C.titulo || 'Shadow Warriors', // los controles se agregan solos al texto (desde el mapa de teclas real, con las que elegiste en Forja)
  subtitulo: `${D.nombre && D.nombre !== 'Prueba' ? D.nombre + ' · ' : ''}Duelo anime hecho con Forja.`,
  modosMenu: C.modosMenu?.length ? [modoElegido, ...C.modosMenu.filter((m) => m !== modoElegido)] : [modoElegido],
  directo: R('jugadores.menu', 'menu') === 'directo' ? modoElegido : null,
  controles: modoElegido === 'versus' ? '2p' : '1p',
  jugador: R('jugadores.luchador', C.jugador || 'ren'), rival: R('jugadores.rival', C.rival || 'mako'), nivel: R('cpu.nivel', C.nivel || 'intermedio'), ia,
  nombreForja: D.nombre, usarForja: R('jugadores.luchador', 'ren') === 'forja' || !!D.heroe,
  reglas, personajes, modos, semilla: typeof D.semilla === 'number' ? D.semilla : 1,
  escenario: { tema: C.escenario?.tema || R('limites.escenarioTema', 'hora'), obstaculos: C.escenario?.obstaculos || OBSTACULOS[R('conflicto.obstaculos', 'pilares')] }, hora: D.hora || null, // la hora que elegiste en Forja elige el escenario si la regla es «Según la hora»
  fx: { intensidad: C.efectos?.intensidad ?? R('efectos.intensidad', 1), densidad: C.efectos?.densidad ?? R('efectos.densidad', 1) },
  acc: { reducirMovimiento: sinSacudida || undefined, reducirDestellos: sinDestellos || undefined },
  presentacion: { impactoCuadro: R('efectos.impactoCuadro', true), lineasVelocidad: R('efectos.lineasVelocidad', true), postimagenes: R('efectos.postimagenes', true), estelas: R('efectos.estelas', true),
    zoomFijo: !R('camara.dinamica', true), zoomMax: R('camara.zoomMax', 1.15), resortes: R('hud.resortes', true), numerosDano: R('resultado.numerosDano', true), cuentaCombo: R('resultado.cuentaCombo', true), koLento: R('resultado.koLento', true) },
  mostrarCajas: C.camara?.cajas || R('efectos.cajas', false), volumen: C.audio?.volumen ?? R('audio.volumen', 0.5), silencio: C.audio?.silencio || R('audio.volumen', 0.5) === 0,
  velocidad: (C.velocidad ?? 1) * R('limites.velocidad', 1), perfil: C.perfil && C.perfil !== 'auto' ? C.perfil : R('perfil.grafico', 'auto'),
  historiaReintentar: R('resultado.historiaReintentar', true),
});
