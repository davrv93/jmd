// Aventura voxel · DEMO D «Lost Kingdom» · plantilla de Forja (JMD Learning), motor Infinite Voxel Engine (p5.js WEBGL + Web Workers).
// Exploración con ruinas procedurales, mazmorras, criaturas, recursos y misiones.
// El mundo NO se guarda: nace de la semilla bajo demanda, por chunks de 16×16. Solo se guardan los bloques que cambias.
// Los algoritmos del motor están en motores/voxel/ (generador.js, malla.js, mundo.js, rayo.js, fisica.js, criaturas.js…).
import { iniciarVoxel, aplicarReglas } from 'motores/voxel/juego.js';
import { defecto } from 'motores/voxel/config.js';
import { semillaDe } from 'motores/nucleo/semilla.js';

const D = window.DATOS || {};
const FABRICA = defecto('aventura-voxel');

// >>> reglas
// Cada regla que elegiste en «Diseña tu videojuego» es una RUTA de la configuración del motor:
// 'mundo.relieve' → config.mundo.relieve. Se copian todas; las que dejaste como venían no pisan el Editor.
const CLAVES = [
  'jugador.avatar', 'jugador.velocidad', 'jugador.carrera', 'jugador.salto', 'jugador.nado', 'jugador.vuelo',
  'jugador.pasoAuto', 'jugador.camara', 'jugador.fov', 'jugador.sensibilidad', 'jugador.invertirY',
  'jugador.alcance', 'modulos.minado', 'supervivencia.velocidadMinado', 'jugador.gravedad', 'jugador.caidaSegura',
  'semilla', 'mundo.relieve', 'mundo.montanas', 'mundo.escala', 'mundo.oceanos', 'mundo.mar', 'mundo.lagos',
  'mundo.rios', 'mundo.temperatura', 'mundo.humedad', 'mundo.biomas', 'mundo.minerales', 'mundo.vegetacion',
  'mundo.flores', 'supervivencia.inventarioInicial', 'modulos.inventario', 'modulos.hotbar', 'modulos.cofres',
  'modulos.crafting', 'modulos.herramientas', 'modulos.durabilidad', 'modulos.comercio', 'modulos.salud',
  'modulos.hambre', 'modulos.resistencia', 'supervivencia.saludMax', 'supervivencia.hambreRitmo',
  'supervivencia.regeneracion', 'modulos.criaturas', 'modulos.enemigos', 'criaturas.densidad', 'criaturas.maximo',
  'criaturas.agresividad', 'criaturas.velocidad', 'criaturas.pasivas', 'criaturas.neutrales', 'criaturas.nocturnas',
  'criaturas.jefe', 'criaturas.comerciantes', 'criaturas.exploradores', 'supervivencia.dificultad',
  'modulos.danoAmbiental', 'supervivencia.danoCaida', 'supervivencia.danoLava', 'supervivencia.ahogo', 'mundo.borde',
  'mundo.altura', 'mundo.cuevas', 'mundo.cavernas', 'mundo.entradasCuevas', 'mundo.lava', 'render.distancia',
  'render.perfil', 'render.ao', 'render.niebla', 'render.olas', 'render.brilloBloques', 'render.resolucion',
  'ambiente.duracionDia', 'ambiente.horaInicio', 'ambiente.cicloDia', 'ambiente.clima', 'ambiente.intensidadClima',
  'ambiente.luzNoche', 'ambiente.estrellas', 'modulos.misiones', 'misiones.lista', 'misiones.cantidad',
  'misiones.brujula', 'misiones.recompensaXP', 'modulos.experiencia', 'resultado.fin', 'resultado.tiempo',
  'resultado.derrota', 'estructuras.aldea', 'estructuras.ruina', 'estructuras.mazmorra', 'estructuras.torre',
  'estructuras.templo', 'estructuras.campamento', 'estructuras.caminos', 'estructuras.puentes',
  'accesibilidad.reducirMovimiento', 'accesibilidad.reducirDestellos', 'accesibilidad.mirilla', 'audio.volumen',
  'audio.efectos', 'audio.pasos',
];
let config = aplicarReglas(D.config || FABRICA, D.reglas || {}, CLAVES, FABRICA);
// <<<

// >>> semilla
// La semilla es un texto («ANDES-2026») o un número. El motor la convierte en 32 bits con un hash estable
// (FNV-1a + mezcla de murmur3): la misma semilla da el mismo mundo en cualquier computadora.
// Prueba en la dirección: ?semilla=MI-MUNDO  (y &nueva para no cargar la partida guardada)
const pedida = new URLSearchParams(location.search).get('semilla');
if (pedida) config = { ...config, semilla: pedida.slice(0, 80) };
console.log(`Semilla «${config.semilla}» → ${semillaDe(config.semilla)}`);
// <<<

// >>> historia
// La historia del reino perdido es una lista de MISIONES (datos): tipo de objetivo y cuántas veces.
// El motor las comprueba cada medio segundo con lo que haces (motores/voxel/supervivencia.js, revisarMisiones).
const HISTORIA = [
  { id: 'r1', texto: 'Encuentra las ruinas del reino perdido', tipo: 'visitar', estructura: 'ruina' },
  { id: 'r2', texto: 'Recupera el botín de 2 cofres antiguos', tipo: 'cofres', n: 2 },
  { id: 'r3', texto: 'Sube a una torre vigía para ver el reino', tipo: 'visitar', estructura: 'torre' },
  { id: 'r4', texto: 'Consigue una espada', tipo: 'tener', objetos: ['espada_madera', 'espada_piedra', 'espada_hierro'] },
  { id: 'r5', texto: 'Baja a la mazmorra', tipo: 'visitar', estructura: 'mazmorra' },
  { id: 'r6', texto: 'Vence a 3 gólems de barro', tipo: 'vencer', criatura: 'golem', n: 3 },
  { id: 'r7', texto: 'Vence al guardián de la mazmorra', tipo: 'vencer', criatura: 'guardian', n: 1 },
  { id: 'r8', texto: 'Consigue 3 cristales', tipo: 'recoger', objeto: 'cristal', n: 3 },
];
// <<<
iniciarVoxel({ datos: D, config, plantilla: 'aventura-voxel', misiones: config.misiones.lista === 'aventura' ? HISTORIA.slice(0, config.misiones.cantidad + 2) : null });
