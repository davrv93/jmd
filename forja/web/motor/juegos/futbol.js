// Catálogo de reglas de la plantilla Fútbol (plantillas/futbol.js). Contrato en ./index.js.
import { clave } from './index.js';
import { tamanoHeroe } from './comunes.js';
const P = 'futbol';
export const ficha = { tipo: 'Anotar', objetivo: 'Meter el balón en el arco rival más veces que él.', recursos: ['El tiempo del partido', 'El balón: uno para los cuatro'],
  conflicto: 'Un defensa y un arquero rivales.', limites: 'La cancha y sus dos arcos.',
  gana: 'Llegas a los goles pedidos o vas arriba cuando acaba el tiempo.', pierde: 'El rival termina arriba (también puede haber empate).' };
const mult = (P2, el, gr, k, aj, simple, nombres = ['Lento', 'Normal', 'Rápido', 'Muy rápido']) => clave(P2, el, gr, k, aj, [0.7, 1, 1.3, 1.6].map((v, i) => [`x${v}`, nombres[i], v, `×${String(v).replace('.', ',')}`, v === 1]), { simple });
export const reglas = () => [
  ...tamanoHeroe(P),
  ...clave(P, 'jugadores', 'Tu héroe', 'jugador.velocidadMax', 'Tu velocidad máxima', [[200, 'Tranquila'], [260, 'Normal', true], [320, 'Rápida'], [380, 'Relámpago']].map(([v, n, d]) => [`v${v}`, n, v, `${v} px/s`, !!d])),
  ...clave(P, 'objetivo', 'Ganar', 'partido.goles', 'Goles para ganar', [[1, '1 gol'], [3, '3 goles', true], [5, '5 goles'], [0, 'Solo el reloj']].map(([v, n, d]) => [`g${v}`, n, v, '', !!d]), { simple: true }),
  ...clave(P, 'procedimientos', 'Patear', 'patada.fuerza', 'Fuerza de tu patada', [[420, 'Suave'], [540, 'Normal', true], [680, 'Fuerte'], [820, 'Cañonazo']].map(([v, n, d]) => [`f${v}`, n, v, '', !!d]), { simple: true }),
  ...clave(P, 'reglas', 'Balón', 'balon.rebote', 'Cuánto rebota en los bordes', [[0.4, 'Poco'], [0.75, 'Normal', true], [0.95, 'Como pelota de goma']].map(([v, n, d]) => [`r${v}`, n, v, '', !!d]), { simple: true }),
  ...clave(P, 'reglas', 'Balón', 'balon.frenado', 'Cuánto frena en el pasto', [[0.25, 'Mucho'], [0.45, 'Normal', true], [0.75, 'Casi nada']].map(([v, n, d]) => [`f${v}`, n, v, 'Fracción de velocidad que queda cada segundo', !!d])),
  ...clave(P, 'recursos', 'Tiempo', 'partido.tiempo', 'Duración del partido', [[45, '45 s'], [90, '90 s', true], [120, '2 min'], [180, '3 min']].map(([v, n, d]) => [`t${v}`, n, v, '', !!d]), { simple: true }),
  ...mult(P, 'conflicto', 'Rivales', 'rival.velocidad', 'Velocidad del defensa rival', true),
  ...mult(P, 'conflicto', 'Rivales', 'rival.fuerza', 'Fuerza de las patadas rivales', false, ['Suave', 'Normal', 'Fuerte', 'Muy fuerte']),
  ...mult(P, 'limites', 'Arcos', 'arquero.rival', 'Reflejos del arquero rival', true),
  ...mult(P, 'limites', 'Arcos', 'arquero.tuyo', 'Reflejos de tu arquero', false),
  ...clave(P, 'resultado', 'Fin', 'partido.empate', 'Si empatan al final', [['empate', 'Queda empate', 'empate', '', true], ['oro', 'Gol de oro', 'oro', 'Se sigue hasta que alguien anote']], { simple: true }),
];
