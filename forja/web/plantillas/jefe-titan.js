// Jefe titán · plantilla de Forja (JMD Learning) · motor Anime Battle Engine. DEMO B «Titan Awakening».
// Un coloso de piedra con fases, ataques telegrafiados (primero el aviso, después el golpe), puntos débiles y
// cinemáticas. Este archivo traduce tus reglas (DATOS.reglas) y el Editor (DATOS.config) a opciones del motor.
import { iniciarAnime } from 'motores/anime/juego.js';
import { personajesCon } from 'motores/anime/config.js';
import { JEFES } from 'motores/anime/jefe.js';

const D = window.DATOS || {}, C = D.config || {};
const R = (k, defecto) => { const v = D.reglas && D.reglas[k]; return v === undefined || v === null ? defecto : v; };

// >>> titan
// El jefe es un objeto de datos: fases (por % de vida), ataques con aviso/activo/recuperación y colores.
const base = JEFES.gaiaron, ACTIVOS = Object.entries({ puno: R('jefe.ataque.puno', true), barrido: R('jefe.ataque.barrido', true), onda: R('jefe.ataque.onda', true), lluvia: R('jefe.ataque.lluvia', true), rayo: R('jefe.ataque.rayo', true), doble: R('jefe.ataque.doble', true) }).filter(([, v]) => v).map(([k]) => k);
const usar = (lista) => { const l = lista.filter((a) => ACTIVOS.includes(a)); return l.length ? l : ['puno']; };
const umbrales = [R('jefe.umbralFase2', 0.6), R('jefe.umbralFase3', 0.25)], nFases = R('jefe.fases', 3), cada = R('jefe.agotadoCada', 4);
const fases = base.fases.slice(0, nFases).map((f, i, a) => ({ ...f, hasta: i === a.length - 1 ? 0 : umbrales[i], ataques: usar(i === a.length - 1 && nFases > 1 ? base.fases[2].ataques : f.ataques), agotadoCada: cada + (i === 2 ? 1 : 0) }));
const jefe = { ...base, nombre: C.jefe?.nombre || R('jefe.nombre', base.nombre), salud: C.jefe?.salud ?? R('jefe.salud', 5200), fases, colores: { ...base.colores, ...R('jefe.colores', {}) } };
const reglasJefe = {
  danoMul: (C.jefe?.danoMul ?? 1) * R('jefe.dano', 1), avisoMul: (C.jefe?.avisoMul ?? 1) * R('jefe.avisos', 1), agotadoMul: (C.jefe?.agotadoMul ?? 1) * R('jefe.agotado', 1),
  nucleoMul: R('jefe.nucleoMul', 1.6), manoVulnerable: R('jefe.puntoDebil', true), rocas: R('jefe.rocas', 5), ondaVel: R('jefe.ondaVel', 9), empujeMul: R('jefe.empuje', 1),
  recuperacionMul: R('jefe.recuperacion', 1), repetir: R('jefe.repetir', false), lluviaApunta: R('jefe.lluviaApunta', true), enfurecido: R('jefe.enfurecido', 1.5),
};
// <<<

// >>> reglas
const reglas = {
  danoMul: R('reglas.danoMul', 1), vidaMul: R('reglas.vidaMul', 1), defensaMul: R('reglas.defensaMul', 1),
  escalado: { desde: 3, paso: R('reglas.escalado', 0.1), minimo: R('reglas.escaladoMinimo', 0.3) }, malabarMax: R('reglas.malabarMax', 6), comboMaxCuadros: R('reglas.comboMax', 360),
  decaeAturd: R('reglas.decaeAturd', 2), repetidoMul: R('reglas.repetidoMul', 0.8), contraMul: R('reglas.contraMul', 1.25), chip: R('reglas.chip', 0.12),
  rebotePared: R('reglas.rebotePared', true), reboteSuelo: R('reglas.reboteSuelo', true), empujeEsquina: R('reglas.empujeEsquina', 0.5), debilidades: R('reglas.debilidades', true),
  energiaInicial: R('recursos.energiaInicial', 0), energiaMul: R('recursos.energiaMul', 1), aguanteBloqueo: R('recursos.aguanteBloqueo', 0.28), aguanteRecupera: R('recursos.aguanteRecupera', 0.35),
  impulso: R('proc.impulso', true), saltosAereos: R('proc.saltosAereos', -1) < 0 ? null : R('proc.saltosAereos', -1), esquiva: R('proc.esquiva', true), esquivaAguante: R('proc.esquivaCosto', 18),
  cargaPorCuadro: R('proc.carga', 0.55), paradaActiva: R('proc.parada', true), ventanaParada: R('proc.ventanaParada', 6), bloqueoAereo: R('proc.bloqueoAereo', false),
  cancelRecuperacion: R('proc.cancelRecuperacion', { activo: true, costo: 25 }), cancelAereo: R('proc.cancelAereo', true), ventanaMovimiento: R('proc.ventanaMovimiento', 14), ventanaPulsacion: R('proc.ventanaPulsacion', 6),
  transformacion: R('conflicto.transformacion', true), definitivo: R('conflicto.definitivo', true), cinematicas: R('conflicto.cinematicas', true), tiempoRonda: 999,
  gravedadMul: R('limites.gravedad', 0.82) / 0.82, velocidadMul: R('limites.velocidadMovimiento', 1), saltoMul: R('limites.salto', 1), fisica: { friccionSuelo: R('limites.friccion', 0.78), ...(C.fisica || {}) },
  limites: { izq: -Math.max(560, R('limites.escenario', 700) - 80), der: 620 },
};
// <<<

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
const sinSacudida = !R('efectos.sacudida', true) || C.accesibilidad?.reducirMovimiento, sinDestellos = !R('efectos.destellos', true) || C.accesibilidad?.reducirDestellos;

iniciarAnime({
  titulo: C.titulo || 'Titan Awakening', subtitulo: `${jefe.nombre} despierta en la cantera. Mira los avisos: dorado = prepárate, rojo = ya viene. O esquiva (invulnerable un instante). Cuando se agota, su núcleo queda expuesto.`,
  modosMenu: ['jefe'], directo: null, jugador: R('jugadores.luchador', C.jugador || 'ren'), nombreForja: D.nombre, usarForja: R('jugadores.luchador', 'ren') === 'forja' || !!D.heroe, saltarSeleccion: false,
  reglas, personajes, jefe, reglasJefe, sinIntro: !R('jefe.intro', true), continues: R('jugador.continues', 0), semilla: typeof D.semilla === 'number' ? D.semilla : 1,
  modos: { jefe: { sinIntro: !R('jefe.intro', true) } },
  escenario: { tema: C.escenario?.tema || R('limites.escenarioTema', 'templo') }, hora: D.hora || null,
  fx: { intensidad: C.efectos?.intensidad ?? R('efectos.intensidad', 1), densidad: C.efectos?.densidad ?? R('efectos.densidad', 1) },
  acc: { reducirMovimiento: sinSacudida || undefined, reducirDestellos: sinDestellos || undefined },
  presentacion: { impactoCuadro: R('efectos.impactoCuadro', true), lineasVelocidad: R('efectos.lineasVelocidad', true), postimagenes: R('efectos.postimagenes', true), estelas: R('efectos.estelas', true),
    zoomFijo: !R('camara.dinamica', true), zoomMax: R('camara.zoomMax', 1.15), resortes: R('hud.resortes', true), numerosDano: R('resultado.numerosDano', true), cuentaCombo: R('resultado.cuentaCombo', true), koLento: R('resultado.koLento', true) },
  mostrarCajas: C.camara?.cajas || R('efectos.cajas', false), volumen: C.audio?.volumen ?? R('audio.volumen', 0.5), silencio: C.audio?.silencio || R('audio.volumen', 0.5) === 0,
  velocidad: (C.velocidad ?? 1) * R('limites.velocidad', 1), perfil: C.perfil && C.perfil !== 'auto' ? C.perfil : R('perfil.grafico', 'auto'),
});
