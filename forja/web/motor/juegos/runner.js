// Catálogo de reglas de la plantilla Runner (plantillas/runner.js). Contrato en ./index.js.
import { clave } from './index.js';
import { tamanoHeroe, inmunidad, vidas } from './comunes.js';
const P = 'runner';
export const ficha = { tipo: 'Aguante', objetivo: 'Llegar lo más lejos posible (o a la meta de metros que elijas).', recursos: ['Monedas', 'Vidas'],
  conflicto: 'Bombas que saltar y proyectiles bajo los que agacharte; cada vez más rápido.', limites: 'Un mundo sin fin que se genera al azar.',
  gana: 'Tu récord de metros y monedas, o llegar a la meta de metros.', pierde: 'Te quedas sin vidas.' };
export const reglas = () => [
  ...tamanoHeroe(P), ...inmunidad(P, 1.3),
  ...clave(P, 'objetivo', 'Meta', 'objetivo.monedas', 'Ganar juntando monedas', [[0, 'No: solo correr', true], [30, '30 monedas'], [60, '60 monedas']].map(([v, n, d]) => [`m${v}`, n, v, '', !!d]), { simple: true }),
  ...clave(P, 'resultado', 'Meta', 'resultado.metros', 'Meta de distancia', [[0, 'Sin meta: tu récord', true], [300, '300 m'], [600, '600 m'], [1000, '1 km']].map(([v, n, d]) => [`m${v}`, n, v, '', !!d]), { simple: true }),
  ...clave(P, 'procedimientos', 'Saltar', 'salto.maximos', 'Saltos seguidos', [[1, 'Uno'], [2, 'Doble', true], [3, 'Triple']].map(([v, n, d]) => [`s${v}`, n, v, '', !!d]), { simple: true }),
  ...clave(P, 'reglas', 'Daño', 'dano.golpe', 'Vidas que quita un choque', [['una', '1', 1, '', true], ['dos', '2', 2]], { simple: true }),
  ...vidas(P),
  ...clave(P, 'recursos', 'Monedas', 'monedas.valor', 'Valor de cada moneda', [1, 2, 5].map((n) => [`p${n}`, `${n}`, n, '', n === 1]), { simple: true }),
  ...clave(P, 'conflicto', 'Peligros', 'peligros.mezcla', 'Qué sale más', [[0.65, 'Más peligros'], [1, 'Equilibrado', true], [1.1, 'Más monedas']].map(([v, n, d]) => [`x${v}`, n, v, '', !!d]), { simple: true }),
  ...clave(P, 'conflicto', 'Ritmo', 'ritmo.inicio', 'Velocidad al empezar', [[220, 'Tranquila'], [300, 'Normal', true], [400, 'Rápida']].map(([v, n, d]) => [`i${v}`, n, v, `${v} px/s`, !!d]), { simple: true }),
  ...clave(P, 'conflicto', 'Ritmo', 'ritmo.aumento', 'Cuánto acelera', [[3, 'Poco'], [7, 'Normal', true], [12, 'Mucho']].map(([v, n, d]) => [`a${v}`, n, v, `+${v} px/s cada segundo`, !!d])),
  ...clave(P, 'limites', 'Ritmo', 'ritmo.tope', 'Velocidad máxima', [[560, 'Contenida'], [760, 'Normal', true], [960, 'Sin piedad']].map(([v, n, d]) => [`t${v}`, n, v, '', !!d]), { simple: true }),
  ...clave(P, 'limites', 'Ritmo', 'dificultad.segundos', 'Segundos hasta la dificultad máxima', [[40, '40 s'], [70, '70 s', true], [120, '2 min']].map(([v, n, d]) => [`d${v}`, n, v, '', !!d])),
];
