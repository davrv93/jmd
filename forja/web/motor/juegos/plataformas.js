// Catálogo de reglas de la plantilla Plataformas (plantillas/plataformas.js). Contrato en ./index.js.
import { clave } from './index.js';
import { tamanoHeroe, inmunidad, vidas } from './comunes.js';
const P = 'plataformas';
export const ficha = { tipo: 'Carrera', objetivo: 'Correr, saltar y llegar a la meta.', recursos: ['Monedas: suman puntos', 'Gemas', 'Vidas'],
  conflicto: 'Obstáculos y enemigos que patrullan las plataformas.', limites: 'Un nivel de plataformas; la cámara te sigue y el borde no se cruza.',
  gana: 'Llegas a la meta: tus puntos y tu tiempo.', pierde: 'Te quedas sin vidas o se acaba el tiempo.' };
export const reglas = () => [
  ...tamanoHeroe(P), ...inmunidad(P, 1.2),
  ...clave(P, 'objetivo', 'La meta', 'meta.requiere', 'Para que la meta cuente', [['nada', 'Solo llegar', 'nada', '', true], ['gema', 'Llevar la gema', 'gema'], ['mitad', 'Media bolsa de monedas', 'mitad'], ['todas', 'Todas las monedas', 'todas', 'El reto completo']], { simple: true }),
  ...clave(P, 'procedimientos', 'Saltar', 'salto.aire', 'Saltos en el aire', [['cero', 'Ninguno', 0, '', true], ['doble', 'Doble salto', 1], ['triple', 'Triple salto', 2]], { simple: true }),
  ...clave(P, 'procedimientos', 'Saltar', 'salto.variable', 'Salto corto si sueltas', [['si', 'Sí', true, 'Controlas la altura', true], ['no', 'No', false, 'Siempre el salto completo']]),
  ...clave(P, 'procedimientos', 'Golpear', 'golpe.permitido', 'Golpear con X', [['si', 'Permitido', true, '', true], ['no', 'Prohibido', false, 'Solo puedes esquivar o pisar']]),
  ...clave(P, 'reglas', 'Enemigos', 'enemigos.pisar', 'Pisar a un enemigo', [['si', 'Lo derrota', true, '', true], ['no', 'No sirve', false, 'Hay que esquivarlo o golpearlo']], { simple: true }),
  ...clave(P, 'reglas', 'Daño', 'dano.golpe', 'Vidas que quita un golpe', [['una', '1', 1, '', true], ['dos', '2', 2, 'Cada error pesa el doble']]),
  ...vidas(P), ...clave(P, 'recursos', 'Vidas', 'vidas.maximo', 'Máximo de vidas', [3, 5, 9].map((n) => [`m${n}`, `${n}`, n, '', n === 5])),
  ...clave(P, 'recursos', 'Monedas', 'monedas.valor', 'Puntos por moneda', [1, 2, 5, 10].map((n) => [`p${n}`, `${n}`, n, '', n === 1]), { simple: true }),
  ...clave(P, 'recursos', 'Monedas', 'gema.valor', 'Puntos por la gema', [5, 10, 25, 50].map((n) => [`g${n}`, `${n}`, n, '', n === 5])),
  ...clave(P, 'conflicto', 'Enemigos', 'enemigos.cuantos', 'Cuántos enemigos', [['ninguno', 'Ninguno', 'ninguno', 'Para practicar'], ['mitad', 'La mitad', 'mitad'], ['todos', 'Todos', 'todos', '', true], ['doble', 'El doble', 'doble', 'De a dos']], { simple: true }),
  ...clave(P, 'conflicto', 'Enemigos', 'enemigos.velocidad', 'Velocidad de los enemigos', [[40, 'Lenta'], [70, 'Normal', true], [110, 'Rápida'], [160, 'Muy rápida']].map(([v, n, d]) => [`v${v}`, n, v, `${v} px/s`, !!d]), { simple: true }),
  ...clave(P, 'conflicto', 'Enemigos', 'enemigos.puntos', 'Puntos por derrotar a uno', [1, 3, 5, 10].map((n) => [`p${n}`, `${n}`, n, '', n === 3])),
  ...clave(P, 'limites', 'El vacío', 'caida.castigo', 'Si caes al vacío', [['vida', 'Pierdes una vida', 'vida', '', true], ['nada', 'Vuelves sin castigo', 'nada'], ['inicio', 'Vuelves al inicio', 'inicio', 'Y pierdes una vida']], { simple: true }),
  ...clave(P, 'limites', 'Cámara', 'camara.suavidad', 'Cómo te sigue la cámara', [[0.05, 'Lenta'], [0.12, 'Suave', true], [0.3, 'Rápida'], [1, 'Pegada']].map(([v, n, d]) => [`c${v}`, n, v, '', !!d])),
  ...clave(P, 'resultado', 'Fin', 'resultado.tiempo', 'Tiempo para llegar', [[0, 'Sin límite', true], [45, '45 s'], [60, '1 minuto'], [90, '1,5 minutos'], [120, '2 minutos']].map(([v, n, d]) => [`t${v}`, n, v, '', !!d]), { simple: true }),
  ...clave(P, 'resultado', 'Fin', 'resultado.alMorir', 'Si te quedas sin vidas', [['reiniciar', 'Vuelves al inicio', 'reiniciar', '', true], ['fin', 'Pierdes la partida', 'fin']], { simple: true }),
  ...clave(P, 'resultado', 'Fin', 'resultado.mide', 'Qué número muestra al ganar', [['ambos', 'Puntos y tiempo', 'ambos', '', true], ['puntos', 'Solo puntos', 'puntos'], ['tiempo', 'Solo tiempo', 'tiempo']]),
];
