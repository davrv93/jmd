// Catálogo de «Duelo anime» (DEMO A · Shadow Warriors). Motor: Anime Battle Engine (web/motores/anime).
import { clave } from './index.js';
import { luchador, procedimientos, reglasCombate, recursos, conflicto, limites, presentacion, medidas } from './anime-comun.js';

const P = 'duelo-anime';
export const ficha = {
  tipo: 'Lucha 1 contra 1',
  objetivo: 'Dejar sin vida a tu rival antes de que se acabe el reloj; gana quien se lleva más rondas.',
  recursos: ['Vida', 'Energía (técnicas, transformación y definitivo)', 'Aguante (bloquear y esquivar)', 'El reloj de la ronda'],
  conflicto: 'Un rival con su propia IA que bloquea, castiga y aprende de lo que repites.',
  limites: 'Una arena con paredes que se agrietan y pilares que se rompen.',
  gana: 'Ganas las rondas que pide el combate (o el torneo, o todos los capítulos).',
  pierde: 'Tu vida llega a cero o el reloj termina con menos vida que el rival.',
};
export function reglas() {
  return [
    ...clave(P, 'jugadores', 'Partida', 'jugadores.modo', 'Modo de juego', [
      ['cpu', 'Contra la CPU', 'cpu', 'Al mejor de tres rondas', true], ['versus', 'Dos jugadores en el mismo teclado', 'versus', 'WASD + F G H contra flechas + 1 2 3'],
      ['entrenamiento', 'Entrenamiento', 'entrenamiento', 'Muñeco, cajas visibles y frame data'], ['supervivencia', 'Supervivencia', 'supervivencia', 'Rivales seguidos, cada vez más hábiles'],
      ['torneo', 'Torneo', 'torneo', 'Llave de eliminación'], ['historia', 'Historia', 'historia', 'Tres capítulos con relato'], ['equipos', '2 contra 2 con relevos', 'equipos', 'Q cambia de luchador'],
      ['lateral', 'Avance lateral', 'lateral', 'Oleadas de ecos de sombra'], ['arena25d', 'Arena 2.5D', 'arena25d', 'También te mueves hacia el fondo']], { simple: true }),
    ...clave(P, 'jugadores', 'Partida', 'jugadores.menu', 'Al empezar', [['menu', 'Mostrar el menú de modos', 'menu', '', true], ['directo', 'Ir directo al combate', 'directo']]),
    ...luchador(P),
    ...clave(P, 'jugadores', 'Rival', 'jugadores.rival', 'Rival', [['mako', 'Mako Enjin', 'mako', '', true], ['ren', 'Ren Shiden', 'ren'], ['eco', 'Eco de sombra', 'eco', 'Débil: para practicar']]),
    ...clave(P, 'jugadores', 'Rival', 'cpu.nivel', 'Nivel de la CPU', [['principiante', 'Principiante', 'principiante'], ['intermedio', 'Intermedio', 'intermedio', '', true], ['avanzado', 'Avanzado', 'avanzado'], ['experto', 'Experto', 'experto'], ['jefe', 'Jefe', 'jefe', 'Casi sin errores']], { simple: true }),
    ...clave(P, 'jugadores', 'Rival', 'cpu.reaccion', 'Tiempo de reacción de la CPU', [['nivel', 'El de su nivel', null, '', true], ['lenta', 'Lenta (0,5 s)', 500], ['humana', 'Humana (0,32 s)', 320], ['rapida', 'Rápida (0,2 s)', 200], ['refleja', 'Refleja (0,14 s)', 140]]),
    ...clave(P, 'jugadores', 'Rival', 'cpu.agresion', 'Actitud de la CPU', [['nivel', 'La de su nivel', null, '', true], ['cauta', 'Cauta', 0.25], ['agresiva', 'Agresiva', 0.8], ['implacable', 'Implacable', 1]]),
    ...clave(P, 'jugadores', 'Rival', 'cpu.bloqueo', 'Cuánto bloquea la CPU', [['nivel', 'Lo de su nivel', null, '', true], ['nunca', 'Nunca', 0], ['aveces', 'A veces', 0.3], ['muro', 'Casi siempre', 0.95]]),
    ...clave(P, 'jugadores', 'Rival', 'cpu.errores', 'Errores de la CPU', [['nivel', 'Los de su nivel', null, '', true], ['ninguno', 'Ninguno', 0], ['pocos', 'Pocos', 0.08], ['muchos', 'Muchos', 0.45]]),
    ...clave(P, 'jugadores', 'Rival', 'cpu.aprende', 'La CPU aprende tus mañas', [['nivel', 'Según su nivel', null, '', true], ['no', 'No aprende', 0], ['mucho', 'Aprende mucho', 1]]),
    ...clave(P, 'jugadores', 'Rival', 'cpu.parada', 'La CPU hace paradas', [['nivel', 'Según su nivel', null, '', true], ['no', 'Nunca', 0], ['si', 'Seguido', 0.3]]),
    ...medidas(P, 'ren', 'Ren'), ...medidas(P, 'mako', 'Mako'),
    ...clave(P, 'objetivo', 'Rondas', 'objetivo.rondas', 'Rondas para ganar', [['1', 'Una', 1], ['2', 'Dos (al mejor de tres)', 2, '', true], ['3', 'Tres', 3], ['5', 'Cinco', 5]], { simple: true }),
    ...clave(P, 'objetivo', 'Rondas', 'objetivo.tiempo', 'Reloj de la ronda', [['30', '30 s', 30], ['60', '60 s', 60], ['99', '99 s', 99, '', true], ['sin', 'Sin reloj', 999]]),
    ...clave(P, 'objetivo', 'Modos', 'objetivo.supervivenciaRivales', 'Rivales en supervivencia', [['3', '3', 3], ['5', '5', 5], ['7', '7', 7, '', true], ['10', '10', 10]]),
    ...clave(P, 'objetivo', 'Modos', 'objetivo.torneoTamano', 'Tamaño del torneo', [['4', '4 luchadores', 4], ['8', '8 luchadores', 8, '', true], ['16', '16 luchadores', 16]]),
    ...clave(P, 'objetivo', 'Modos', 'objetivo.oleadasLateral', 'Oleadas del avance lateral', [['2', '2', 2], ['3', '3', 3], ['4', '4', 4, '', true], ['6', '6', 6]]),
    ...procedimientos(P),
    ...clave(P, 'procedimientos', 'Equipos', 'proc.relevoEspera', 'Espera entre relevos', [['1', '1 s', 60], ['3', '3 s', 180, '', true], ['6', '6 s', 360]]),
    ...reglasCombate(P), ...recursos(P),
    ...clave(P, 'recursos', 'Modos', 'recursos.supervivenciaCuracion', 'Curación entre rivales', [['0', 'Nada', 0], ['20', '20 %', 0.2], ['35', '35 %', 0.35, '', true], ['60', '60 %', 0.6], ['100', 'Toda', 1]]),
    ...conflicto(P),
    ...clave(P, 'conflicto', 'Escenario', 'conflicto.obstaculos', 'Objetos que se rompen', [['ninguno', 'Ninguno', 'ninguno'], ['pilares', 'Dos pilares', 'pilares', '', true], ['cuatro', 'Cuatro pilares', 'cuatro'], ['cajas', 'Cajas frágiles', 'cajas']]),
    ...limites(P), ...presentacion(P),
    ...clave(P, 'resultado', 'Final', 'resultado.desempate', 'Si se acaba el reloj', [['vida', 'Gana quien tiene más vida', 'vida', '', true], ['empate', 'Es empate', 'empate'], ['energia', 'Gana quien tiene más energía', 'energia']]),
    ...clave(P, 'resultado', 'Final', 'resultado.historiaReintentar', 'En la historia, si pierdes', [['si', 'Repites el capítulo', true, '', true], ['no', 'Se acaba la historia', false]]),
  ];
}
