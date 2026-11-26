// Forja · Anime Battle Engine · esquema de la configuración avanzada (Editor de Forja, config.json, agentes).
// Es SOLO datos: números, textos cortos, colores y listas. validar() rechaza claves desconocidas y cualquier valor
// que no sea JSON puro; ninguna parte de la configuración se ejecuta.
import { MODOS } from './modos.js';
import { NIVELES } from './ia.js';
import { TEMAS } from './render.js';
import { PERSONAJES } from './personajes.js';

const num = (min, max, defecto) => ({ tipo: 'numero', min, max, ...(defecto !== undefined ? { defecto } : {}) });
const ent = (min, max) => ({ tipo: 'entero', min, max });
const color = { tipo: 'texto', patron: '^#[0-9a-fA-F]{6}$' };
const nombre = { tipo: 'texto', minLargo: 1, maxLargo: 40, patron: '^[^<>{}]*$' };
const id = { tipo: 'texto', patron: '^[a-z][a-z0-9-]{0,23}$' };
const caja = { tipo: 'objeto', extra: false, props: { x: num(-200, 300), y: num(-60, 260), w: num(4, 700), h: num(4, 400) } };
const movimiento = { tipo: 'objeto', extra: false, props: {
  dano: num(0, 400), arranque: ent(1, 60), activo: ent(0, 60), recuperacion: ent(0, 90), aturd: ent(0, 120), aturdB: ent(0, 90), pausa: ent(0, 30),
  energia: num(0, 100), prioridad: ent(0, 9), malabar: ent(0, 6), golpes: ent(1, 12), avance: num(0, 20), caja, empuje: { tipo: 'lista', minItems: 2, maxItems: 2, items: num(-30, 30) },
  cancel: { tipo: 'lista', maxItems: 12, items: id }, ventana: { tipo: 'lista', minItems: 2, maxItems: 2, items: ent(0, 90) }, invul: { tipo: 'lista', minItems: 2, maxItems: 2, items: ent(0, 90) },
  entrada: { tipo: 'texto', patron: '^[a-z0-9+>]{1,30}$' }, nombre,
} };
const personaje = { tipo: 'objeto', extra: false, props: {
  nombre, clase: nombre, salud: num(100, 9999), resistencia: num(10, 400), velocidad: num(1, 9), aceleracion: num(0.2, 2), masa: num(0.4, 3), fuerza: num(0.3, 3), defensa: num(0.3, 3),
  alcance: num(0.5, 2), velAtaque: num(0.5, 2), salto: num(6, 26), saltosAereos: ent(0, 3), elemento: { tipo: 'texto', enum: ['electrico', 'fuego', 'agua', 'viento', 'tierra', 'luz', 'sombra', 'hielo'] },
  cuerpo: { tipo: 'objeto', extra: false, props: { piel: color, pelo: color, ropa: color, ropa2: color, acento: color, cinta: color, peinado: { tipo: 'texto', enum: ['puntas', 'moño', 'corto'] }, cintaFrente: { tipo: 'booleano' }, hombrera: { tipo: 'texto', enum: ['izq', 'der'] }, emblema: { tipo: 'texto', maxLargo: 2, patron: '^[^<>]*$' } } },
  efectos: { tipo: 'objeto', extra: false, props: { aura: color, estela: color } },
  movimientos: { tipo: 'objeto', extra: movimiento },
  transformacion: { tipo: 'objeto', extra: false, props: { nombre, costo: num(0, 100), duracion: ent(60, 3600), fuerza: num(1, 2), velocidad: num(1, 2), defensa: num(1, 2), aura: color } },
} };

export const ESQUEMA = { tipo: 'objeto', extra: false, props: {
  version: ent(1, 1),
  modo: { tipo: 'texto', enum: Object.keys(MODOS) },
  modosMenu: { tipo: 'lista', maxItems: 12, items: { tipo: 'texto', enum: Object.keys(MODOS) } },
  jugador: id, rival: id, nivel: { tipo: 'texto', enum: Object.keys(NIVELES) },
  titulo: nombre, velocidad: num(0.4, 1.8),
  personajes: { tipo: 'objeto', extra: personaje },
  escenario: { tipo: 'objeto', extra: false, props: { tema: { tipo: 'texto', enum: [...Object.keys(TEMAS), 'hora', 'rotar', 'elemento'] }, obstaculos: { tipo: 'lista', maxItems: 8, items: { tipo: 'objeto', extra: false, props: { x: num(-1200, 1200), y: num(0, 300), w: num(10, 200), h: num(10, 300), vida: num(10, 2000), color } } } } },
  fisica: { tipo: 'objeto', extra: false, props: { gravedad: num(0.2, 2.5), friccionSuelo: num(0.3, 0.99), friccionAire: num(0.8, 1), rebotePared: num(0, 1), reboteSuelo: num(0, 1) } },
  combate: { tipo: 'objeto', extra: false, props: { danoMul: num(0.2, 4), malabarMax: ent(1, 20), comboMaxCuadros: ent(60, 3600), ventanaParada: ent(0, 20), escaladoPaso: num(0, 0.4), escaladoMinimo: num(0.05, 1), chip: num(0, 0.5), energiaMul: num(0, 4), tiempoRonda: ent(10, 999) } },
  efectos: { tipo: 'objeto', extra: false, props: { intensidad: num(0, 2), densidad: num(0, 2) } },
  camara: { tipo: 'objeto', extra: false, props: { cajas: { tipo: 'booleano' } } },
  accesibilidad: { tipo: 'objeto', extra: false, props: { reducirMovimiento: { tipo: 'booleano' }, reducirDestellos: { tipo: 'booleano' } } },
  audio: { tipo: 'objeto', extra: false, props: { volumen: num(0, 1), silencio: { tipo: 'booleano' } } },
  jefe: { tipo: 'objeto', extra: false, props: { nombre, salud: num(500, 30000), danoMul: num(0.2, 3), avisoMul: num(0.4, 2.5), agotadoMul: num(0.3, 3) } },
  ia: { tipo: 'objeto', extra: false, props: { reaccionMs: num(80, 900), agresion: num(0, 1), bloqueo: num(0, 1), error: num(0, 1) } },
  perfil: { tipo: 'texto', enum: ['auto', 'bajo', 'medio', 'alto', 'ultra'] },
} };

export function defecto(plantilla) {
  if (plantilla === 'jefe-titan') return { version: 1, modo: 'jefe', modosMenu: ['jefe'], jugador: 'ren', titulo: 'Titan Awakening', velocidad: 1, efectos: { intensidad: 1, densidad: 1 }, camara: { cajas: false }, accesibilidad: { reducirMovimiento: false, reducirDestellos: false }, audio: { volumen: 0.5, silencio: false }, jefe: { salud: 5200, danoMul: 1, avisoMul: 1, agotadoMul: 1 }, perfil: 'auto' };
  return { version: 1, modo: 'cpu', modosMenu: ['cpu', 'versus', 'entrenamiento', 'supervivencia', 'torneo', 'historia', 'equipos', 'lateral', 'arena25d'], jugador: 'ren', rival: 'mako', nivel: 'intermedio', titulo: 'Shadow Warriors', velocidad: 1,
    // sin «escenario»: lo deciden las reglas (limites.escenarioTema, conflicto.obstaculos). Si el Editor lo fija, manda.
    efectos: { intensidad: 1, densidad: 1 }, camara: { cajas: false }, accesibilidad: { reducirMovimiento: false, reducirDestellos: false }, audio: { volumen: 0.5, silencio: false }, perfil: 'auto' };
}

// mezcla la configuración (ya validada) con los personajes del motor: solo lo que el esquema conoce
export function personajesCon(config = {}) {
  const out = { ...PERSONAJES };
  for (const [k, v] of Object.entries(config.personajes || {})) {
    const base = out[k] || PERSONAJES.ren;
    const movs = { ...base.movimientos };
    for (const [mk, mv] of Object.entries(v.movimientos || {})) if (movs[mk]) movs[mk] = { ...movs[mk], ...mv, caja: { ...movs[mk].caja, ...(mv.caja || {}) } };
    const tr = v.transformacion ? [{ ...base.transformaciones[0], nombre: v.transformacion.nombre ?? base.transformaciones[0]?.nombre, costo: v.transformacion.costo ?? base.transformaciones[0]?.costo, duracion: v.transformacion.duracion ?? base.transformaciones[0]?.duracion, mult: { ...base.transformaciones[0]?.mult, ...(['fuerza', 'velocidad', 'defensa'].reduce((o, x) => (v.transformacion[x] ? { ...o, [x]: v.transformacion[x] } : o), {})) }, colores: { ...base.transformaciones[0]?.colores, ...(v.transformacion.aura ? { aura: v.transformacion.aura } : {}) } }] : base.transformaciones;
    out[k] = { ...base, ...v, id: k, cuerpo: { ...base.cuerpo, ...(v.cuerpo || {}) }, efectos: { ...base.efectos, ...(v.efectos || {}) }, movimientos: movs, transformaciones: tr };
    delete out[k].transformacion;
  }
  return out;
}
