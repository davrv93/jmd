// Catálogo de reglas de la plantilla Laberinto (plantillas/laberinto.js). Contrato en ./index.js.
import { clave } from './index.js';
import { tamanoHeroe, inmunidad, vidas } from './comunes.js';
const P = 'laberinto';
export const ficha = { tipo: 'Escape', objetivo: 'Juntar las gemas y salir por la meta sin que te atrapen.', recursos: ['Gemas', 'Vidas'],
  conflicto: 'Rivales que te buscan por el camino más corto (pathfinding).', limites: 'Un laberinto generado al azar; las paredes no se atraviesan.',
  gana: 'Escapas: tu tiempo en segundos.', pierde: 'Te atrapan cuando no te quedan vidas, o se acaba el tiempo.' };
export const reglas = () => [
  ...tamanoHeroe(P), ...inmunidad(P, 1.6),
  ...clave(P, 'objetivo', 'Escapar', 'meta.requiere', 'Para abrir la salida', [['todas', 'Todas las gemas', 'todas', '', true], ['ninguna', 'Nada: solo llegar', 'ninguna', 'Una carrera hasta la salida']], { simple: true }),
  ...clave(P, 'procedimientos', 'Moverte', 'jugador.velocidadMax', 'Tu velocidad máxima', [[130, 'Lenta'], [175, 'Normal', true], [220, 'Rápida']].map(([v, n, d]) => [`v${v}`, n, v, `${v} px/s`, !!d]), { simple: true }),
  ...clave(P, 'reglas', 'Rivales', 'rivales.vista', 'A cuántas celdas te ven', [[3, '3 celdas'], [6, '6 celdas', true], [10, '10 celdas'], [99, 'Siempre te ven']].map(([v, n, d]) => [`c${v}`, n, v, 'Si estás más lejos, patrullan', !!d]), { simple: true }),
  ...clave(P, 'reglas', 'Rivales', 'rivales.piensa', 'Cada cuánto recalculan la ruta', [[0.15, '0,15 s'], [0.35, '0,35 s', true], [0.8, '0,8 s'], [1.5, '1,5 s']].map(([v, n, d]) => [`p${v}`, n, v, 'Más lento = más torpe', !!d])),
  ...vidas(P),
  ...clave(P, 'recursos', 'Gemas', 'gemas.cuantas', 'Gemas en el laberinto', [3, 5, 7, 10].map((n) => [`g${n}`, `${n}`, n, '', n === 7]), { simple: true }),
  ...clave(P, 'conflicto', 'Rivales', 'rivales.cuantos', 'Cuántos rivales', [1, 2, 3, 4].map((n) => [`r${n}`, `${n}`, n, '', n === 2]), { simple: true }),
  ...clave(P, 'conflicto', 'Rivales', 'rivales.velocidad', 'Velocidad de los rivales', [[0.7, 'Lenta'], [1, 'Normal', true], [1.3, 'Rápida']].map(([v, n, d]) => [`x${v}`, n, v, '', !!d]), { simple: true }),
  ...clave(P, 'limites', 'Laberinto', 'laberinto.atajos', 'Atajos abiertos', [[0, 'Ninguno: un solo camino'], [14, 'Algunos', true], [30, 'Muchos']].map(([v, n, d]) => [`a${v}`, n, v, '', !!d]), { simple: true }),
  ...clave(P, 'resultado', 'Fin', 'resultado.tiempo', 'Tiempo para escapar', [[0, 'Sin límite', true], [60, '1 minuto'], [90, '1,5 minutos'], [150, '2,5 minutos']].map(([v, n, d]) => [`t${v}`, n, v, '', !!d]), { simple: true }),
];
