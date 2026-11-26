// Catálogo de reglas de la plantilla Persecución (plantillas/persecucion.js). Contrato en ./index.js.
// Género: laberinto de persecución. Lo que se vio en la clase 2: rivales con reglas distintas (cada uno elige su
// CELDA OBJETIVO), búsqueda del camino (BFS, A*, voraz) y huida con mapa de Dijkstra (Walker, 2010: ×−1,2 y reescanear).
import { clave } from './index.js';
import { tamanoHeroe, inmunidad, vidas } from './comunes.js';
const P = 'persecucion';
const C = (elemento, grupo, k, ajuste, opciones, extra) => clave(P, elemento, grupo, k, ajuste, opciones, extra);
const coma = (v) => String(v).replace('.', ',');
const id = (v) => String(v).replace('.', '_').replace('-', 'm');
// opciones numéricas: [valor, nombre?, d?] → [sufijo, nombre, valor, d, defecto]
const nums = (vals, def, fmt, d) => vals.map((v) => [`n${id(v)}`, fmt(v), v, typeof d === 'function' ? d(v) : d || '', v === def]);

export const ficha = {
  tipo: 'Persecución',
  objetivo: 'Juntar todas las gemas del laberinto sin que los rivales te atrapen.',
  recursos: ['Gemas: cada una suma puntos', 'Supergemas: por unos segundos los rivales huyen', 'Bonus que aparece un rato', 'Vidas'],
  conflicto: 'Rivales que te buscan, cada uno con su propia regla y su algoritmo (BFS, A* o voraz).',
  limites: 'Un laberinto generado por semilla, con túneles que cruzan de un borde al otro.',
  gana: 'Limpias el laberinto y pasas de nivel; ganas al superar todos los niveles (o tu meta).',
  pierde: 'Te quedas sin vidas.',
};

// Los seis rivales posibles (cada uno con su color en los rayos X).
export const RIVALES = [
  { n: 1, color: 'coral', regla: 'cazador', esquina: 'arribaDer', salida: 0 },
  { n: 2, color: 'lila', regla: 'emboscada', esquina: 'arribaIzq', salida: 2 },
  { n: 3, color: 'verde', regla: 'pinza', esquina: 'abajoDer', salida: 4 },
  { n: 4, color: 'ámbar', regla: 'indeciso', esquina: 'abajoIzq', salida: 6 },
  { n: 5, color: 'turquesa', regla: 'azar', esquina: 'arribaDer', salida: 8 },
  { n: 6, color: 'rosa', regla: 'espejo', esquina: 'abajoIzq', salida: 10 },
];
const REGLAS = [
  ['cazador', 'Cazador', 'Va a tu celda'], ['emboscada', 'Emboscada', 'Va N celdas delante de ti'],
  ['pinza', 'Pinza', 'Con el rival 1, te encierra por el otro lado'], ['indeciso', 'Indeciso', 'Te persigue si está lejos; cerca, se va a su esquina'],
  ['esquina', 'Guardián', 'Se queda rondando su esquina'], ['azar', 'Paseante', 'Va a celdas al azar'], ['espejo', 'Espejo', 'Va a tu posición reflejada: te corta el paso'],
];
const BUSQUEDAS = [['bfs', 'BFS', 'La ola: siempre el camino más corto'], ['astar', 'A*', 'La ola con brújula: igual de corto, revisa menos'], ['voraz', 'Voraz', 'Solo la brújula: rápido de pensar, a veces se mete en callejones']];
const ESQUINAS = [['arribaIzq', 'Arriba a la izquierda'], ['arribaDer', 'Arriba a la derecha'], ['abajoIzq', 'Abajo a la izquierda'], ['abajoDer', 'Abajo a la derecha']];

function porRival() {
  const out = [];
  for (const R of RIVALES) {
    const g = `Rival ${R.n} (${R.color})`, k = (s) => `rival${R.n}.${s}`, simple = R.n === 1;
    out.push(
      ...C('conflicto', g, k('regla'), `Regla del rival ${R.n}`, REGLAS.map(([v, n, d]) => [v, n, v, d, v === R.regla]), { simple }),
      ...C('conflicto', g, k('busqueda'), `Algoritmo del rival ${R.n}`, BUSQUEDAS.map(([v, n, d]) => [v, n, v, d, v === 'bfs'])),
      ...C('jugadores', g, k('inicio'), `El rival ${R.n} empieza`, [['casa', 'En la casa', 'casa', '', true], ['esquina', 'En su esquina', 'esquina', 'Ya está afuera desde el principio']]),
      ...C('conflicto', g, k('ritmo'), `Velocidad del rival ${R.n}`, nums([0.8, 0.9, 1, 1.1, 1.2], 1, (v) => `×${coma(v)}`, 'Sobre la velocidad de los rivales')),
      ...C('conflicto', g, k('n'), `N del rival ${R.n} (emboscada, pinza, indeciso)`, [['auto', 'El de todos', 'auto', '', true], ...nums([2, 4, 6, 8], -1, (v) => `${v} celdas`)]),
      ...C('conflicto', g, k('miedo'), `Con la supergema, el rival ${R.n}`, [['huye', 'Huye', 'huye', 'Como todos', true], ['congela', 'Se congela', 'congela', 'Se queda quieto y lo puedes atrapar'], ['valiente', 'No se asusta', 'valiente', 'Sigue persiguiendo: cuidado']]),
      ...C('reglas', g, k('salida'), `El rival ${R.n} sale de casa a los`, nums([0, 2, 4, 6, 8, 10], R.salida, (v) => `${v} s`)),
      ...C('reglas', g, k('repiensa'), `El rival ${R.n} repiensa su ruta`, [['global', 'Como todos', 'global', '', true], ...nums([0.2, 0.5, 1], -1, (v) => `Cada ${coma(v)} s`, 'Más lento = más torpe')]),
      ...C('limites', g, k('esquina'), `Esquina del rival ${R.n}`, ESQUINAS.map(([v, n]) => [v, n, v, 'Adonde va cuando se dispersa', v === R.esquina])),
      ...C('conflicto', g, k('vision'), `El rival ${R.n} te ve`, [['siempre', 'Siempre', 99, '', true], ['diez', 'A 10 celdas', 10, 'Más lejos, pasea'], ['seis', 'A 6 celdas', 6, 'Más lejos, pasea']]),
    );
  }
  return out;
}

export const reglas = () => [
  // ── JUGADORES
  ...tamanoHeroe(P), ...inmunidad(P, 2),
  ...C('jugadores', 'Tu héroe', 'heroe.velocidad', 'Tu velocidad', nums([100, 130, 160, 190, 220], 160, (v) => `${v} px/s`), { simple: true }),
  ...C('jugadores', 'Tu héroe', 'heroe.inicio', 'Dónde empiezas', [['abajo', 'Abajo, al centro', 'abajo', '', true], ['esquina', 'En una esquina', 'esquina'], ['cerca', 'Cerca de la casa de los rivales', 'cerca', 'Arranque con tensión']]),
  ...C('jugadores', 'Rivales', 'rivales.cantidad', 'Cuántos rivales', [1, 2, 3, 4, 5, 6].map((n) => [`r${n}`, `${n}`, n, '', n === 4]), { simple: true }),
  ...C('jugadores', 'Rivales', 'rivales.marca', 'Cómo distinguir a cada rival', [['anillo', 'Anillo de color', 'anillo', '', true], ['tinte', 'Teñidos de su color', 'tinte'], ['ambos', 'Las dos cosas', 'ambos']]),
  // ── OBJETIVO
  ...C('objetivo', 'Meta', 'objetivo.modo', 'Qué tienes que lograr', [['todas', 'Juntar todas las gemas', 'todas', 'Cada laberinto limpio es un nivel', true], ['puntos', 'Llegar a unos puntos', 'puntos'], ['sobrevivir', 'Sobrevivir un tiempo', 'sobrevivir'], ['cazar', 'Atrapar rivales', 'cazar', 'Con las supergemas']], { simple: true }),
  ...C('objetivo', 'Meta', 'objetivo.niveles', 'Niveles para ganar', [[1, '1'], [2, '2'], [3, '3', true], [5, '5'], [0, 'Sin fin']].map(([v, n, d]) => [`l${v}`, n, v, v ? '' : 'Juegas hasta perder', !!d]), { simple: true }),
  ...C('objetivo', 'Meta', 'objetivo.puntos', 'Puntos para ganar (meta «puntos»)', nums([1000, 2000, 3000, 5000, 8000], 3000, (v) => `${v}`)),
  ...C('objetivo', 'Meta', 'objetivo.segundos', 'Segundos (meta «sobrevivir»)', nums([30, 45, 60, 90, 120], 60, (v) => `${v} s`)),
  ...C('objetivo', 'Meta', 'objetivo.cazar', 'Rivales que atrapar (meta «atrapar»)', nums([2, 4, 6, 8, 12], 6, (v) => `${v}`)),
  // ── PROCEDIMIENTOS
  ...C('procedimientos', 'Moverte', 'controles.modo', 'Al soltar la tecla', [['continuo', 'Sigues avanzando', 'continuo', 'Hasta chocar con una pared', true], ['mantener', 'Te detienes', 'mantener', 'Solo te mueves mientras aprietas']], { simple: true }),
  ...C('procedimientos', 'Moverte', 'heroe.esquinas', 'Girar antes de llegar a la esquina', nums([0, 4, 8, 14], 8, (v) => (v ? `${v} px antes` : 'Exacto'), 'Más píxeles = giros más fáciles')),
  ...C('procedimientos', 'Moverte', 'heroe.freno', 'Al comer una gema', nums([1, 0.95, 0.9, 0.85], 1, (v) => (v === 1 ? 'No frenas' : `Vas al ${Math.round(v * 100)} %`))),
  ...C('procedimientos', 'Moverte', 'heroe.mediavuelta', 'Puedes dar media vuelta', [['si', 'En cualquier momento', true, '', true], ['no', 'Solo en los cruces', false, 'Más difícil']]),
  ...C('procedimientos', 'Moverte', 'heroe.paso', 'Tu héroe', [['camina', 'Camina', 'caminar', '', true], ['corre', 'Corre', 'correr', 'Solo cambia la animación']]),
  ...C('procedimientos', 'Poderes', 'heroe.turbo', 'Turbo con Espacio', [['no', 'Sin turbo', 'no', '', true], ['corto', '1 s, cada 5 s', 'corto'], ['largo', '2 s, cada 9 s', 'largo']], { simple: true }),
  ...C('procedimientos', 'Poderes', 'supergema.efecto', 'La supergema hace que los rivales', [['asustar', 'Huyan', 'asustar', 'Y los puedes atrapar', true], ['congelar', 'Se congelen', 'congelar', 'Quietos y atrapables'], ['lentos', 'Vayan lentos', 'lentos', 'Siguen siendo peligrosos']], { simple: true }),
  // ── REGLAS
  ...C('reglas', 'Rivales', 'rivales.mediavuelta', 'Los rivales pueden dar media vuelta', [['no', 'No pueden', false, 'Regla clásica: se comprometen con su camino', true], ['si', 'Sí pueden', true, 'Más peligrosos']], { simple: true }),
  ...C('reglas', 'Rivales', 'rivales.modos', 'Turnos de dispersarse y perseguir', [
    ['siempre', 'Siempre persiguen', [[0, 999]]], ['corto', '5 s se dispersan, 20 s persiguen', [[5, 20]]], ['medio', '7 s y 20 s', [[7, 20]], '', true],
    ['largo', '10 s y 15 s', [[10, 15]]], ['alterna', '7 s y 7 s', [[7, 7]]], ['calmado', '12 s y 10 s', [[12, 10]], 'Más respiro']], { simple: true }),
  ...C('reglas', 'Rivales', 'rivales.repiensa', 'Cada cuánto repiensan su ruta', nums([0.15, 0.25, 0.35, 0.5, 0.8, 1.2], 0.35, (v) => `${coma(v)} s`, 'Más lento = más torpe'), { simple: true }),
  ...C('reglas', 'Rivales', 'rivales.reversa', 'Al cambiar de turno, se dan vuelta', [['si', 'Sí', true, 'Avisa que cambió el turno', true], ['no', 'No', false]]),
  ...C('reglas', 'Inicio', 'inicio.listos', 'Cuenta «¡Listos!» al empezar', nums([0, 1, 2], 2, (v) => (v ? `${v} s` : 'Sin cuenta'))),
  ...C('reglas', 'Rivales', 'rivales.salida', 'Espera extra entre salidas de casa', nums([0, 1, 2, 3], 0, (v) => `+${v} s`)),
  ...C('reglas', 'Rivales', 'tuneles.lentos', 'En los túneles, los rivales van', nums([1, 0.7, 0.5], 0.5, (v) => (v === 1 ? 'Igual' : `Al ${Math.round(v * 100)} %`))),
  ...C('reglas', 'Casa', 'casa.regreso', 'Un rival atrapado vuelve a casa', nums([1.5, 2, 3], 2, (v) => `×${coma(v)} más rápido`)),
  ...C('reglas', 'Casa', 'casa.espera', 'Y espera en casa', nums([0, 2, 4], 2, (v) => `${v} s`)),
  // ── RECURSOS
  ...vidas(P),
  ...C('recursos', 'Vidas', 'vida.extra', 'Vida extra cada', [['nunca', 'Nunca', 0], ...nums([5000, 10000, 20000], 10000, (v) => `${v} puntos`)]),
  ...C('recursos', 'Gemas', 'gemas.valor', 'Puntos por gema', nums([5, 10, 20, 50], 10, (v) => `${v}`), { simple: true }),
  ...C('recursos', 'Gemas', 'gemas.forma', 'Las gemas son', [['gema', 'Gemas', 'gema', '', true], ['moneda', 'Monedas', 'moneda'], ['estrella', 'Estrellas', 'estrella']]),
  ...C('recursos', 'Gemas', 'gemas.densidad', 'Cuántos pasillos tienen gema', [['todas', 'Todos', 1, '', true], ['mitad', 'La mitad', 2], ['tercio', 'Uno de cada tres', 3]]),
  ...C('recursos', 'Supergemas', 'supergemas.cantidad', 'Supergemas', nums([0, 2, 4, 6], 4, (v) => `${v}`), { simple: true }),
  ...C('recursos', 'Supergemas', 'supergemas.lugar', 'Supergemas en', [['esquinas', 'Las esquinas', 'esquinas', '', true], ['azar', 'Lugares al azar', 'azar']]),
  ...C('recursos', 'Supergemas', 'supergemas.valor', 'Puntos por supergema', nums([25, 50, 100], 50, (v) => `${v}`)),
  ...C('recursos', 'Bonus', 'bonus.tipo', 'El bonus es', [['cofre', 'Un cofre', 'cofre', '', true], ['pocion', 'Una poción', 'pocion'], ['corazon', 'Un corazón', 'corazon'], ['llave', 'Una llave', 'llave'], ['ninguno', 'Sin bonus', 'ninguno']]),
  ...C('recursos', 'Bonus', 'bonus.valor', 'Puntos del bonus', nums([100, 300, 500, 1000, 2000], 500, (v) => `${v}`)),
  ...C('recursos', 'Bonus', 'bonus.aparece', 'Aparece al juntar', nums([0.25, 0.5, 0.7], 0.5, (v) => `el ${Math.round(v * 100)} % de las gemas`)),
  ...C('recursos', 'Bonus', 'bonus.dura', 'Dura', nums([6, 9, 12], 9, (v) => `${v} s`)),
  ...C('recursos', 'Bonus', 'bonus.veces', 'Bonus por nivel', nums([1, 2, 3], 1, (v) => `${v}`, 'Cada uno al juntar más gemas')),
  ...C('recursos', 'Bonus', 'bonus.lugar', 'Aparece', [['centro', 'Debajo de la casa', 'centro', '', true], ['azar', 'En un lugar al azar', 'azar'], ['lejos', 'Lo más lejos de ti', 'lejos']]),
  ...C('recursos', 'Puntos', 'puntos.cadena', 'Puntos por rival atrapado', [['doble', '200, 400, 800, 1600…', 'doble', 'Se duplica en cada cadena', true], ['triple', '100, 300, 900…', 'triple'], ['fijo200', 'Siempre 200', 'fijo200'], ['fijo500', 'Siempre 500', 'fijo500']]),
  ...C('recursos', 'Puntos', 'puntos.tiempo', 'Bonus por terminar rápido', [['no', 'No', false, '', true], ['si', 'Sí: 10 puntos por segundo bajo 90 s', true]]),
  // ── CONFLICTO
  ...C('conflicto', 'Rivales', 'rivales.velocidad', 'Velocidad de los rivales', nums([70, 85, 100, 115, 130, 145], 115, (v) => `${v} px/s`), { simple: true }),
  ...C('conflicto', 'Rivales', 'rivales.n', 'N de la emboscada, la pinza y el indeciso', nums([2, 3, 4, 5, 6, 8], 4, (v) => `${v} celdas`)),
  ...C('conflicto', 'Rivales', 'rivales.alcance', 'A qué distancia te atrapan', nums([0.35, 0.45, 0.55], 0.45, (v) => `${Math.round(v * 100)} % de una celda`)),
  ...C('conflicto', 'Rivales', 'rivales.acelera', 'Cuando quedan pocas gemas, el rival 1', [['no', 'No cambia', 0], ['poco', '+15 % con el 20 % de gemas', 0.15, '', true], ['mucho', '+25 % con el 10 % de gemas', 0.25]]),
  ...C('conflicto', 'Susto', 'susto.duracion', 'Cuánto dura el susto', nums([2, 4, 6, 8, 10], 6, (v) => `${v} s`), { simple: true }),
  ...C('conflicto', 'Susto', 'susto.velocidad', 'Asustados van', nums([0.4, 0.5, 0.6, 0.75], 0.5, (v) => `Al ${Math.round(v * 100)} %`)),
  ...C('conflicto', 'Susto', 'susto.huida', 'Cómo huyen', [['dijkstra', 'Mapa de Dijkstra', 'dijkstra', 'Huyen hacia la salida más segura (Walker, 2010)', true], ['azar', 'Al azar', 'azar', 'En cada cruce, cualquier camino'], ['lejos', 'Lejos de ti (voraz)', 'lejos', 'Se alejan en línea recta: se arrinconan']], { simple: true }),
  ...C('conflicto', 'Susto', 'susto.coef', 'Coeficiente del mapa de huida', nums([-1, -1.2, -1.5, -2], -1.2, (v) => `×${coma(v)}`, 'Más negativo = prefieren escapar lejos')),
  ...C('conflicto', 'Susto', 'susto.parpadeo', 'Avisan que el susto termina', nums([0, 1, 2], 2, (v) => (v ? `${v} s antes` : 'No avisan'))),
  ...porRival(),
  // ── LÍMITES
  ...C('limites', 'Laberinto', 'laberinto.tamano', 'Tamaño del laberinto', [['chico', '15 × 9', [15, 9]], ['mediano', '19 × 11', [19, 11], '', true], ['grande', '23 × 13', [23, 13]], ['enorme', '27 × 15', [27, 15]]], { simple: true }),
  ...C('limites', 'Laberinto', 'laberinto.simetria', 'Forma', [['espejo', 'Simétrico', 'espejo', 'La mitad derecha copia la izquierda', true], ['libre', 'Libre', 'libre']], { simple: true }),
  ...C('limites', 'Laberinto', 'laberinto.tuneles', 'Túneles de borde a borde', nums([0, 1, 2], 1, (v) => `${v}`), { simple: true }),
  ...C('limites', 'Laberinto', 'laberinto.atajos', 'Atajos', [['ninguno', 'Ninguno', 0], ['pocos', 'Pocos', 6], ['algunos', 'Algunos', 14], ['muchos', 'Muchos', 24], ['sinCallejones', 'Sin callejones sin salida', -1, '', true]]),
  ...C('limites', 'Laberinto', 'laberinto.semilla', 'Laberinto', ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((l, i) => [l, `Laberinto ${l}`, i, '', i === 0])),
  ...C('limites', 'Laberinto', 'laberinto.estilo', 'Muros de', [['piedra', 'Piedra', 0xffffff, '', true], ['hielo', 'Hielo', 0x9fd8ff], ['bosque', 'Bosque', 0xa8e6a0], ['lava', 'Lava', 0xff9a7a]]),
  ...C('limites', 'Laberinto', 'laberinto.oscuridad', 'Oscuridad', [['no', 'Todo a la vista', 0, '', true], ['seis', 'Ves 6 celdas a tu alrededor', 6], ['cuatro', 'Ves 4 celdas', 4]]),
  ...C('limites', 'Casa', 'casa.ancho', 'Ancho de la casa', nums([3, 5], 3, (v) => `${v} celdas`)),
  ...C('limites', 'Laberinto', 'tuneles.fila', 'Los túneles cruzan', [['centro', 'Por el centro', 'centro', '', true], ['extremos', 'Arriba y abajo', 'extremos']]),
  ...C('limites', 'Casa', 'casa.lugar', 'La casa de los rivales', [['centro', 'Al centro', 'centro', '', true], ['arriba', 'Arriba', 'arriba']]),
  // ── RESULTADO
  ...C('resultado', 'Niveles', 'niveles.acelera', 'Cada nivel, los rivales', nums([0, 0.05, 0.1, 0.15], 0.1, (v) => (v ? `+${Math.round(v * 100)} % de velocidad` : 'Igual')), { simple: true }),
  ...C('resultado', 'Niveles', 'niveles.susto', 'Cada nivel, el susto dura', nums([0, 0.5, 1, 2], 1, (v) => (v ? `${coma(v)} s menos` : 'Igual'))),
  ...C('resultado', 'Niveles', 'niveles.rivalExtra', 'Un rival más cada', [['no', 'Nunca', 0, '', true], ['dos', '2 niveles', 2], ['tres', '3 niveles', 3]]),
  ...C('resultado', 'Niveles', 'niveles.nuevo', 'Cada nivel', [['otro', 'Otro laberinto', true, '', true], ['mismo', 'El mismo laberinto', false]]),
  ...C('resultado', 'Niveles', 'niveles.supergemas', 'Supergemas por nivel', [['igual', 'Siempre las mismas', false, '', true], ['menos', 'Una menos cada nivel', true]]),
  ...C('resultado', 'Fin', 'resultado.mensaje', 'Mensaje final', [['corto', 'Corto', 'corto'], ['puntos', 'Con tus puntos', 'puntos', '', true], ['todo', 'Con estadísticas', 'todo', 'Gemas, rivales atrapados y tiempo']], { simple: true }),
  ...C('resultado', 'Fin', 'resultado.perder', 'Al perder una vida', [['reinicio', 'Todos vuelven a su lugar', 'reinicio', '', true], ['sigue', 'Solo tú vuelves a tu lugar', 'sigue']]),
  ...C('resultado', 'Fin', 'resultado.record', 'Récord', [['si', 'Guardar y mostrar tu récord', true, '', true], ['no', 'Sin récord', false]]),
  ...C('resultado', 'Fin', 'resultado.sacudida', 'La pantalla tiembla al atraparte', [['si', 'Sí', true, '', true], ['no', 'No', false]]),
  ...C('resultado', 'Fin', 'resultado.reloj', 'Cronómetro en pantalla', [['no', 'No', false, '', true], ['si', 'Sí', true]]),
  ...C('resultado', 'Fin', 'resultado.continuar', 'Con R, tras perder', [['cero', 'Empiezas de cero', 'cero', '', true], ['nivel', 'Sigues en tu nivel con 0 puntos', 'nivel']]),
];
