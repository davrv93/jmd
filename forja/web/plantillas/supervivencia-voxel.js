// Supervivencia voxel · plantilla de Forja (JMD Learning), motor Infinite Voxel Engine (p5.js WEBGL + Web Workers).
// Recolecta, fabrica herramientas y aguanta la noche: salud, hambre, resistencia y criaturas hostiles.
// El mundo NO se guarda: nace de la semilla bajo demanda, por chunks de 16×16. Solo se guardan los bloques que cambias.
// Los algoritmos del motor están en motores/voxel/ (generador.js, malla.js, mundo.js, rayo.js, fisica.js, criaturas.js…).
import { iniciarVoxel, aplicarReglas } from 'motores/voxel/juego.js';
import { defecto } from 'motores/voxel/config.js';
import { semillaDe } from 'motores/nucleo/semilla.js';

const D = window.DATOS || {};
const FABRICA = defecto('supervivencia-voxel');

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

// >>> recetas
// Las recetas son una TABLA de datos en motores/voxel/supervivencia.js (RECETAS): qué usas, qué sale y qué mesa
// hace falta cerca. Aquí sumamos una propia, solo para este juego: carbón + palo → antorchas extra.
import { RECETAS } from 'motores/voxel/supervivencia.js';
if (!RECETAS.some((r) => r.id === 'antorchas-dobles')) RECETAS.push({ id: 'antorchas-dobles', sale: ['antorcha', 8], usa: { carbon: 2, palo: 1 }, estacion: 'mesa' });
// <<<
iniciarVoxel({ datos: D, config, plantilla: 'supervivencia-voxel' });
