// Forja · voxel · esquema de configuración y valores de fábrica de las cuatro plantillas voxel.
// La configuración es SOLO DATOS (nucleo/esquema.js la valida; nada se evalúa). Las claves del catálogo de reglas
// (motor/juegos/<plantilla>.js) son rutas de esta configuración: 'mundo.relieve' → config.mundo.relieve.
import { BIOMAS } from './biomas.js';

const num = (min, max, defecto) => ({ tipo: 'numero', min, max, defecto });
const ent = (min, max, defecto) => ({ tipo: 'entero', min, max, defecto });
const bool = (defecto) => ({ tipo: 'booleano', defecto });
const txt = (opciones, defecto) => ({ tipo: 'texto', enum: opciones, defecto });
const obj = (props) => ({ tipo: 'objeto', props, extra: false });

export const MODOS = ['exploracion', 'supervivencia', 'creativo', 'aventura'];
export const ESQUEMA = obj({
  version: ent(1, 99, 1),
  semilla: { tipo: 'texto', maxLargo: 80, defecto: 'INFINITE-LANDS' },
  modo: txt(MODOS, 'exploracion'),
  mundo: obj({
    altura: { tipo: 'entero', enum: [96, 128, 160, 192], defecto: 128 }, mar: ent(24, 80, 48), relieve: num(0.3, 2.5, 1), montanas: num(0, 2.5, 1), oceanos: num(0, 2, 1),
    lagos: num(0, 2, 1), rios: num(0, 2, 1), cuevas: num(0, 2.5, 1), cavernas: num(0, 2, 1), minerales: num(0, 4, 1), vegetacion: num(0, 2.5, 1), flores: num(0, 3, 1),
    temperatura: num(-0.8, 0.8, 0), humedad: num(-0.8, 0.8, 0), escala: num(0.5, 2.5, 1), lava: num(0, 1, 1), entradasCuevas: num(0, 2, 1),
    biomas: { tipo: 'lista', items: { tipo: 'texto', enum: BIOMAS.map((b) => b.id) }, maxItems: 15, defecto: [] },
    borde: ent(0, 100000, 0),
  }),
  estructuras: obj({ aldea: num(0, 3, 1), ruina: num(0, 3, 1), mazmorra: num(0, 3, 1), torre: num(0, 3, 1), templo: num(0, 3, 1), campamento: num(0, 3, 1), caminos: num(0, 1, 1), puentes: num(0, 1, 1) }),
  jugador: obj({
    camara: txt(['primera', 'tercera'], 'primera'), fov: num(50, 110, 75), sensibilidad: num(0.2, 3, 1), invertirY: bool(false), velocidad: num(2, 9, 4.4), carrera: num(1, 2.5, 1.65),
    salto: num(5, 14, 8.6), gravedad: num(8, 50, 28), nado: num(1, 6, 3), alcance: num(3, 12, 6), caidaSegura: num(2, 50, 3.5), pasoAuto: bool(true), vuelo: bool(false), avatar: txt(['personaje', 'cajas'], 'personaje'),
  }),
  render: obj({ distancia: ent(2, 12, 6), perfil: txt(['auto', 'bajo', 'medio', 'alto', 'ultra'], 'auto'), ao: bool(true), niebla: num(0.3, 2, 1), olas: num(0, 2, 1), brilloBloques: num(0.3, 2, 1), resolucion: num(0.35, 1, 1) }),
  ambiente: obj({ duracionDia: ent(60, 3600, 600), horaInicio: num(0, 1, 0.3), cicloDia: bool(true), clima: txt(['auto', 'despejado', 'lluvia', 'nieve'], 'auto'), intensidadClima: num(0, 2, 1), luzNoche: num(0, 0.6, 0.12), estrellas: bool(true) }),
  modulos: obj({
    inventario: bool(true), hotbar: bool(true), herramientas: bool(false), durabilidad: bool(false), crafting: bool(false), cofres: bool(true), salud: bool(false), hambre: bool(false),
    resistencia: bool(false), danoAmbiental: bool(false), experiencia: bool(false), misiones: bool(false), criaturas: bool(true), enemigos: bool(false), comercio: bool(false), minado: txt(['instantaneo', 'por_dureza'], 'instantaneo'),
  }),
  supervivencia: obj({ saludMax: ent(4, 60, 20), hambreRitmo: num(0, 4, 1), regeneracion: num(0, 4, 1), danoCaida: num(0, 3, 1), danoLava: num(0, 4, 1), ahogo: ent(5, 120, 15), inventarioInicial: txt(['vacio', 'basico', 'completo'], 'basico'), velocidadMinado: num(0.3, 4, 1), dificultad: txt(['pacifica', 'facil', 'normal', 'dificil'], 'normal') }),
  criaturas: obj({ densidad: num(0, 3, 1), pasivas: bool(true), neutrales: bool(true), nocturnas: bool(true), radioSim: ent(16, 96, 48), comerciantes: bool(true), exploradores: bool(true), jefe: bool(true), agresividad: num(0, 3, 1), velocidad: num(0.4, 2, 1), maximo: ent(0, 120, 40) }),
  misiones: obj({ lista: txt(['exploracion', 'supervivencia', 'aventura', 'constructor', 'ninguna'], 'exploracion'), cantidad: ent(1, 12, 5), recompensaXP: num(0, 5, 1), brujula: bool(true) }),
  resultado: obj({ fin: txt(['libre', 'misiones', 'jefe', 'tiempo'], 'libre'), derrota: txt(['reaparecer', 'perder_objetos', 'fin'], 'reaparecer'), tiempo: ent(60, 7200, 900) }),
  audio: obj({ volumen: num(0, 1, 0.5), efectos: bool(true), pasos: bool(true) }),
  accesibilidad: obj({ reducirMovimiento: bool(false), reducirDestellos: bool(false), mirilla: txt(['cruz', 'punto', 'grande'], 'cruz') }),
  hotbar: { tipo: 'lista', items: { tipo: 'texto', maxLargo: 24, patron: '^[a-z_]+$' }, maxItems: 9, defecto: [] },
});

const base = () => ({
  version: 1, semilla: 'INFINITE-LANDS', modo: 'exploracion',
  mundo: { altura: 128, mar: 48, relieve: 1, montanas: 1, oceanos: 1, lagos: 1, rios: 1, cuevas: 1, cavernas: 1, minerales: 1, vegetacion: 1, flores: 1, temperatura: 0, humedad: 0, escala: 1, lava: 1, entradasCuevas: 1, biomas: [], borde: 0 },
  estructuras: { aldea: 1, ruina: 1, mazmorra: 1, torre: 1, templo: 1, campamento: 1, caminos: 1, puentes: 1 },
  jugador: { camara: 'primera', fov: 75, sensibilidad: 1, invertirY: false, velocidad: 4.4, carrera: 1.65, salto: 8.6, gravedad: 28, nado: 3, alcance: 6, caidaSegura: 3.5, pasoAuto: true, vuelo: false, avatar: 'personaje' },
  render: { distancia: 6, perfil: 'auto', ao: true, niebla: 1, olas: 1, brilloBloques: 1, resolucion: 1 },
  ambiente: { duracionDia: 600, horaInicio: 0.3, cicloDia: true, clima: 'auto', intensidadClima: 1, luzNoche: 0.12, estrellas: true },
  modulos: { inventario: true, hotbar: true, herramientas: false, durabilidad: false, crafting: false, cofres: true, salud: false, hambre: false, resistencia: false, danoAmbiental: false, experiencia: false, misiones: true, criaturas: true, enemigos: false, comercio: false, minado: 'instantaneo' },
  supervivencia: { saludMax: 20, hambreRitmo: 1, regeneracion: 1, danoCaida: 1, danoLava: 1, ahogo: 15, inventarioInicial: 'basico', velocidadMinado: 1, dificultad: 'normal' },
  criaturas: { densidad: 1, pasivas: true, neutrales: true, nocturnas: false, radioSim: 48, comerciantes: true, exploradores: true, jefe: false, agresividad: 1, velocidad: 1, maximo: 30 },
  misiones: { lista: 'exploracion', cantidad: 5, recompensaXP: 1, brujula: true },
  resultado: { fin: 'libre', derrota: 'reaparecer', tiempo: 900 },
  audio: { volumen: 0.5, efectos: true, pasos: true },
  accesibilidad: { reducirMovimiento: false, reducirDestellos: false, mirilla: 'cruz' },
  hotbar: [],
});
export function defecto(id) {
  const c = base();
  if (id === 'supervivencia-voxel') {
    Object.assign(c, { semilla: 'AMANECER-7', modo: 'supervivencia' });
    Object.assign(c.modulos, { herramientas: true, durabilidad: true, crafting: true, salud: true, hambre: true, resistencia: true, danoAmbiental: true, experiencia: true, enemigos: true, comercio: true, minado: 'por_dureza' });
    Object.assign(c.criaturas, { nocturnas: true, jefe: false, maximo: 40 }); c.supervivencia.inventarioInicial = 'vacio'; c.misiones.lista = 'supervivencia'; c.ambiente.duracionDia = 480;
  } else if (id === 'creativo-voxel') {
    Object.assign(c, { semilla: 'LIENZO', modo: 'creativo' });
    Object.assign(c.modulos, { misiones: false, cofres: true, enemigos: false, crafting: false }); c.jugador.vuelo = true; c.criaturas.densidad = 0.5; c.misiones.lista = 'constructor'; c.modulos.misiones = true; c.misiones.cantidad = 3;
    c.supervivencia.inventarioInicial = 'completo'; c.ambiente.cicloDia = false; c.ambiente.horaInicio = 0.32; c.mundo.relieve = 0.8;
    c.hotbar = ['ladrillos', 'tablas', 'vidrio', 'tallada', 'lampara', 'cesped', 'madera', 'lana', 'cristal'];
  } else if (id === 'aventura-voxel') {
    // DEMO D «Lost Kingdom»: ruinas, mazmorras, criaturas, recursos y misiones
    Object.assign(c, { semilla: 'LOST-KINGDOM', modo: 'aventura' });
    Object.assign(c.modulos, { herramientas: true, durabilidad: true, crafting: true, salud: true, hambre: false, experiencia: true, misiones: true, enemigos: true, comercio: true, danoAmbiental: true, minado: 'por_dureza' });
    Object.assign(c.estructuras, { ruina: 2.4, mazmorra: 2.6, torre: 1.8, templo: 2, aldea: 1.2 });
    Object.assign(c.criaturas, { nocturnas: true, jefe: true, densidad: 1.2, maximo: 45 });
    c.misiones = { lista: 'aventura', cantidad: 6, recompensaXP: 1.5, brujula: true }; c.resultado.fin = 'jefe'; c.supervivencia.inventarioInicial = 'basico';
  } else {
    // DEMO C «Infinite Lands»: 1.ª persona, semillas, montañas, bosques, océanos, cuevas y construcción
    c.mundo.montanas = 1.2; c.estructuras.aldea = 1.2;
  }
  return c;
}
export const opcionesGenerador = (cfg) => ({ ...cfg.mundo, biomas: cfg.mundo.biomas?.length ? cfg.mundo.biomas : null, estructuras: cfg.estructuras });
