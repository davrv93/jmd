// Forja · voxel · traductor DETERMINISTA de una descripción a la configuración del motor (sin LLM al jugar).
//   «Crea un mundo voxel infinito con semilla ANDES-2026, montañas elevadas, lagos, bosques, cuevas y aldeas»
//   → semilla 'ANDES-2026', mundo.montanas 1.8, mundo.lagos 1.6, biomas con bosque, cuevas 1.6, estructuras.aldea 1.8
// texto: ya normalizado (minúsculas, sin tildes) · original: el texto tal cual (para respetar la semilla escrita)
const REGLAS = [
  [/montanas? (muy )?(elevadas|altas|gigantes|enormes)|cordillera|picos/, (c) => { c.mundo.montanas = 1.8; c.mundo.relieve = Math.max(c.mundo.relieve, 1.3); }, 'montañas elevadas'],
  [/sin montanas|llano|plano/, (c) => { c.mundo.montanas = 0; c.mundo.relieve = 0.5; }, 'terreno llano'],
  [/\blagos?\b/, (c) => { c.mundo.lagos = 1.6; }, 'lagos'], [/\brios?\b/, (c) => { c.mundo.rios = 1.6; }, 'ríos'],
  [/islas?|archipielago/, (c) => { c.mundo.oceanos = 1.8; }, 'islas'], [/oceanos?|\bmar\b|mares/, (c) => { c.mundo.oceanos = Math.max(c.mundo.oceanos, 1.3); }, 'océanos'],
  [/sin (mar|oceanos?)|continente/, (c) => { c.mundo.oceanos = 0.2; }, 'casi sin mar'],
  [/cuevas?|cavernas?|grutas?/, (c) => { c.mundo.cuevas = 1.6; c.mundo.cavernas = 1.4; c.mundo.entradasCuevas = 1.4; }, 'cuevas'],
  [/minerales|mina|tesoros?/, (c) => { c.mundo.minerales = 1.8; }, 'minerales abundantes'],
  [/aldeas?|pueblos?/, (c) => { c.estructuras.aldea = 1.8; }, 'aldeas'], [/ruinas?/, (c) => { c.estructuras.ruina = 2.2; }, 'ruinas'],
  [/mazmorras?|calabozos?/, (c) => { c.estructuras.mazmorra = 2.2; }, 'mazmorras'], [/torres?/, (c) => { c.estructuras.torre = 2; }, 'torres'], [/templos?/, (c) => { c.estructuras.templo = 2; }, 'templos'],
  [/bosques?|arboles|selva/, (c) => { c.mundo.vegetacion = Math.max(c.mundo.vegetacion, 1.5); }, 'mucha vegetación'], [/flores|jardin/, (c) => { c.mundo.flores = 2.5; }, 'flores'],
  [/desierto|arido|seco/, (c) => { c.mundo.humedad = -0.5; c.mundo.temperatura = 0.4; }, 'clima seco'], [/nieve|helado|glaciar|frio/, (c) => { c.mundo.temperatura = -0.5; }, 'clima frío'],
  [/tropical|calido|caluroso/, (c) => { c.mundo.temperatura = 0.45; c.mundo.humedad = 0.3; }, 'clima cálido'],
  [/lluvia|lluvioso|tormenta/, (c) => { c.ambiente.clima = 'lluvia'; }, 'lluvia'], [/nevad/, (c) => { c.ambiente.clima = 'nieve'; }, 'nevadas'],
  [/de noche|nocturno|noche eterna/, (c) => { c.ambiente.horaInicio = 0.9; }, 'empieza de noche'], [/siempre de dia|sin noche/, (c) => { c.ambiente.cicloDia = false; c.ambiente.horaInicio = 0.45; }, 'siempre de día'],
  [/criaturas|animales/, (c) => { c.modulos.criaturas = true; c.criaturas.densidad = 1.4; }, 'criaturas'], [/enemigos|hostiles|peligros/, (c) => { c.modulos.enemigos = true; c.modulos.salud = true; }, 'enemigos'],
  [/pacifico|sin enemigos|tranquilo/, (c) => { c.modulos.enemigos = false; c.supervivencia.dificultad = 'pacifica'; }, 'pacífico'],
  [/volar|vuelo/, (c) => { c.jugador.vuelo = true; }, 'vuelo'], [/tercera persona/, (c) => { c.jugador.camara = 'tercera'; }, 'tercera persona'],
  [/hambre|sobrevivir|supervivencia/, (c) => { Object.assign(c.modulos, { salud: true, hambre: true, crafting: true, herramientas: true }); }, 'supervivencia'],
  [/misiones|aventura/, (c) => { c.modulos.misiones = true; }, 'misiones'], [/jefe|guardian/, (c) => { c.criaturas.jefe = true; c.modulos.enemigos = true; }, 'jefe'],
  [/mundo (pequeno|chico)|isla pequena/, (c) => { c.mundo.borde = 250; }, 'mundo pequeño'], [/infinito/, (c) => { c.mundo.borde = 0; }, 'infinito'],
];
export function traducir(texto, config, plantillaId, original = texto) {
  const entendido = [];
  const m = /semilla\s*[:=«"']?\s*([A-Za-zÁÉÍÓÚÑáéíóúñ0-9][\wÁÉÍÓÚÑáéíóúñ-]{0,40})/i.exec(original);
  if (m) { config.semilla = m[1].replace(/[»"']+$/, '').toUpperCase(); entendido.push(`semilla ${config.semilla}`); }
  for (const [re, f, nombre] of REGLAS) if (re.test(texto)) { f(config); entendido.push(nombre); }
  return { config, entendido };
}
