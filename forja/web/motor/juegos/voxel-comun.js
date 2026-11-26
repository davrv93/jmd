// Reglas que comparten las cuatro plantillas voxel (Mundo, Supervivencia, Creativo y Aventura voxel).
// Cada clave ES una ruta de la configuración del motor (motores/voxel/config.js): 'mundo.relieve' → config.mundo.relieve.
// La plantilla (plantillas/<id>.js) lee cada clave por su nombre y la copia en esa ruta; el motor la usa de verdad.
// La opción por defecto de cada clave es el valor de fábrica de ESA plantilla (defecto(id)), así cada juego
// arranca como se diseñó y el alumno ve qué lo hace distinto.
import { clave } from './index.js';
import { defecto } from '../../motores/voxel/config.js';
import { BIOMAS } from '../../motores/voxel/biomas.js';

const ruta = (o, k) => k.split('.').reduce((a, p) => (a == null ? a : a[p]), o);
const coma = (v) => String(v).replace('.', ',');

export function reglasVoxel(P, id) {
  const D = defecto(id), out = [];
  // opciones: [[sufijo, nombre, valor, descripción?]]; la por defecto es la que coincide con la fábrica de la plantilla
  const k = (elemento, grupo, kk, ajuste, opciones, simple = false) => {
    const v0 = JSON.stringify(ruta(D, kk));
    let ops = opciones.map(([s, n, v, d]) => [s, n, v, d || '', JSON.stringify(v) === v0]);
    if (!ops.some((o) => o[4])) ops = [...ops, ['fabrica', 'Como viene', ruta(D, kk), 'El valor de fábrica de este juego', true]];
    out.push(...clave(P, elemento, grupo, kk, ajuste, ops, { simple }));
  };
  const mult = (elemento, grupo, kk, ajuste, valores, nombres, simple = false, unidad = '×') => k(elemento, grupo, kk, ajuste, valores.map((v, i) => [`x${coma(v)}`, nombres[i], v, `${unidad}${coma(v)}`]), simple);
  const si = (elemento, grupo, kk, ajuste, dSi, dNo, simple = false) => k(elemento, grupo, kk, ajuste, [['si', 'Sí', true, dSi], ['no', 'No', false, dNo]], simple);

  // ---------------------------------------------------------------- jugadores: el explorador
  k('jugadores', 'Tu explorador', 'jugador.avatar', 'Cómo te ven en 3.ª persona', [['personaje', 'Tu personaje de Forja', 'personaje', 'La hoja de sprites que hiciste en el estudio'], ['cajas', 'Muñeco de bloques', 'cajas']], true);
  mult('jugadores', 'Tu explorador', 'jugador.velocidad', 'Velocidad al caminar', [3, 4.4, 5.5, 7], ['Pausada', 'Normal', 'Ágil', 'Veloz'], true, '');
  mult('jugadores', 'Tu explorador', 'jugador.carrera', 'Cuánto más rápido al correr', [1.3, 1.65, 2, 2.4], ['Trote', 'Normal', 'Sprint', 'Atleta'], false);
  mult('jugadores', 'Tu explorador', 'jugador.salto', 'Fuerza del salto', [6.5, 8.6, 10.5, 13], ['Bajo', 'Normal', 'Alto (2 bloques)', 'Rebote lunar'], true, '');
  mult('jugadores', 'Tu explorador', 'jugador.nado', 'Velocidad al nadar', [1.8, 3, 4.5], ['Lenta', 'Normal', 'Pez'], false, '');
  si('jugadores', 'Tu explorador', 'jugador.vuelo', 'Puedes volar (doble espacio)', 'Doble toque de espacio para volar', 'Siempre con los pies en el suelo', true);
  si('jugadores', 'Tu explorador', 'jugador.pasoAuto', 'Subir escalones de 1 bloque solo', 'Caminas por colinas sin saltar', 'Hay que saltar cada escalón');
  // ---------------------------------------------------------------- procedimientos: cómo se juega
  k('procedimientos', 'Cámara', 'jugador.camara', 'Cámara al empezar (F cambia)', [['primera', 'Primera persona', 'primera'], ['tercera', 'Tercera persona', 'tercera']], true);
  mult('procedimientos', 'Cámara', 'jugador.fov', 'Campo de visión', [60, 75, 90, 105], ['Estrecho', 'Normal', 'Amplio', 'Ojo de pez'], false, '');
  mult('procedimientos', 'Cámara', 'jugador.sensibilidad', 'Sensibilidad del ratón', [0.5, 1, 1.5, 2.2], ['Suave', 'Normal', 'Rápida', 'Muy rápida'], false);
  si('procedimientos', 'Cámara', 'jugador.invertirY', 'Invertir el eje vertical', 'Subir el ratón mira abajo', 'Subir el ratón mira arriba');
  mult('procedimientos', 'Construir', 'jugador.alcance', 'Alcance para romper y poner', [4, 6, 8, 11], ['Corto', 'Normal', 'Largo', 'Muy largo'], true, '');
  k('procedimientos', 'Construir', 'modulos.minado', 'Cómo se rompe un bloque', [['instantaneo', 'De un clic', 'instantaneo', 'Ideal para construir'], ['por_dureza', 'Según su dureza', 'por_dureza', 'La piedra tarda más que la tierra']], true);
  mult('procedimientos', 'Construir', 'supervivencia.velocidadMinado', 'Velocidad de minado', [0.5, 1, 1.6, 2.5], ['Lenta', 'Normal', 'Rápida', 'Turbo'], false);
  // ---------------------------------------------------------------- reglas: el mundo y su física
  mult('reglas', 'Física', 'jugador.gravedad', 'Gravedad', [14, 28, 38], ['Luna', 'Tierra', 'Planeta pesado'], true, '');
  mult('reglas', 'Física', 'jugador.caidaSegura', 'Altura de caída sin daño', [2, 3.5, 6, 40], ['Frágil', 'Normal', 'Resistente', 'Nunca te dañas'], false, '');
  k('reglas', 'Semilla', 'semilla', 'Semilla del mundo', [['infinite', 'INFINITE-LANDS', 'INFINITE-LANDS'], ['andes', 'ANDES-2026', 'ANDES-2026', 'Del ejemplo del curso'], ['reino', 'LOST-KINGDOM', 'LOST-KINGDOM'], ['amanecer', 'AMANECER-7', 'AMANECER-7'], ['lienzo', 'LIENZO', 'LIENZO'], ['42', '42', '42'], ['archi', 'MAR DE ISLAS', 'MAR DE ISLAS'], ['volcan', 'CORAZON DE PIEDRA', 'CORAZON DE PIEDRA']], true);
  mult('reglas', 'Relieve', 'mundo.relieve', 'Relieve', [0.5, 0.8, 1, 1.4, 2], ['Casi plano', 'Suave', 'Normal', 'Accidentado', 'Extremo'], true);
  mult('reglas', 'Relieve', 'mundo.montanas', 'Montañas', [0, 0.6, 1, 1.2, 1.8, 2.4], ['Sin montañas', 'Pocas', 'Normales', 'Elevadas', 'Cordilleras', 'Picos gigantes'], true);
  mult('reglas', 'Relieve', 'mundo.escala', 'Tamaño de los paisajes', [0.6, 1, 1.5, 2.2], ['Pequeños', 'Normales', 'Amplios', 'Continentales'], false);
  mult('reglas', 'Agua', 'mundo.oceanos', 'Océanos', [0, 0.5, 1, 1.5, 2], ['Casi sin mar', 'Mares chicos', 'Normales', 'Mucho mar', 'Mundo de islas'], true);
  k('reglas', 'Agua', 'mundo.mar', 'Nivel del mar', [[36, 'Bajo', 36], [48, 'Normal', 48], [58, 'Alto (inundado)', 58], [70, 'Diluvio', 70]].map(([s, n, v]) => [`m${s}`, n, v]), false);
  mult('reglas', 'Agua', 'mundo.lagos', 'Lagos', [0, 0.6, 1, 1.6, 2], ['Sin lagos', 'Pocos', 'Normales', 'Muchos', 'Tierra de lagos'], false);
  mult('reglas', 'Agua', 'mundo.rios', 'Ríos', [0, 0.6, 1, 1.6], ['Sin ríos', 'Pocos', 'Normales', 'Caudalosos'], false);
  mult('reglas', 'Clima', 'mundo.temperatura', 'Temperatura del mundo', [-0.6, -0.3, 0, 0.3, 0.6], ['Glacial', 'Fresco', 'Templado', 'Cálido', 'Tórrido'], true, '');
  mult('reglas', 'Clima', 'mundo.humedad', 'Humedad del mundo', [-0.6, -0.3, 0, 0.3, 0.6], ['Árido', 'Seco', 'Normal', 'Húmedo', 'Selvático'], false, '');
  const grupos = { todos: [], calidos: ['desierto', 'sabana', 'selva', 'playa', 'oceano', 'meseta', 'canon', 'archipielago'], frios: ['tundra', 'taiga', 'bosque_nevado', 'montana', 'oceano', 'playa'], verdes: ['bosque', 'pradera', 'selva', 'pantano', 'taiga', 'oceano', 'playa', 'montana'], islas: ['oceano', 'archipielago', 'playa', 'selva'], secos: ['desierto', 'meseta', 'canon', 'sabana', 'oceano', 'playa'] };
  k('reglas', 'Clima', 'mundo.biomas', 'Biomas que aparecen', [['todos', 'Los 15 biomas', grupos.todos], ['calidos', 'Solo cálidos', grupos.calidos], ['frios', 'Solo fríos', grupos.frios], ['verdes', 'Verdes', grupos.verdes], ['islas', 'Islas tropicales', grupos.islas], ['secos', 'Tierras secas', grupos.secos], ...BIOMAS.filter((b) => b.id !== 'oceano').slice(0, 6).map((b) => [`solo_${b.id}`, `${b.nombre} y mar`, [b.id, 'oceano', 'playa']])], true);
  // ---------------------------------------------------------------- recursos
  mult('recursos', 'Subsuelo', 'mundo.minerales', 'Minerales', [0.3, 0.6, 1, 1.8, 3], ['Escasos', 'Pocos', 'Normales', 'Abundantes', 'Mina de oro'], true);
  mult('recursos', 'Superficie', 'mundo.vegetacion', 'Árboles y plantas', [0, 0.5, 1, 1.6, 2.2], ['Sin árboles', 'Pocos', 'Normales', 'Bosque denso', 'Jungla total'], true);
  mult('recursos', 'Superficie', 'mundo.flores', 'Flores', [0, 1, 2, 3], ['Ninguna', 'Normales', 'Muchas', 'Jardín'], false);
  k('recursos', 'Inventario', 'supervivencia.inventarioInicial', 'Con qué empiezas', [['vacio', 'Con las manos vacías', 'vacio'], ['basico', 'Lo básico', 'basico', 'Herramientas de madera, antorchas y bloques'], ['completo', 'Todos los bloques', 'completo']], true);
  si('recursos', 'Inventario', 'modulos.inventario', 'Inventario (E)', 'Guardas lo que recoges', 'No se recoge nada');
  si('recursos', 'Inventario', 'modulos.hotbar', 'Barra rápida (1-9)', 'Elige bloque con números o la rueda', 'Solo el bloque de la mano');
  si('recursos', 'Inventario', 'modulos.cofres', 'Cofres con botín', 'Los cofres de ruinas y torres guardan objetos', 'Los cofres son solo decoración');
  si('recursos', 'Fabricar', 'modulos.crafting', 'Fabricar objetos', 'Mesa, herramientas, antorchas y bloques nuevos', 'Sin recetas', true);
  si('recursos', 'Fabricar', 'modulos.herramientas', 'Herramientas', 'Pico, hacha y pala aceleran el trabajo y algunos minerales las exigen', 'Todo se rompe a mano');
  si('recursos', 'Fabricar', 'modulos.durabilidad', 'Las herramientas se gastan', 'Cada golpe resta durabilidad', 'Duran para siempre');
  si('recursos', 'Fabricar', 'modulos.comercio', 'Comercio con mercaderes', 'Cambia minerales por objetos', 'Los mercaderes solo conversan');
  si('recursos', 'Salud', 'modulos.salud', 'Salud', 'Tienes corazones', 'Nada te hace daño', true);
  si('recursos', 'Salud', 'modulos.hambre', 'Hambre', 'Hay que comer bayas y pan', 'Nunca tienes hambre');
  si('recursos', 'Salud', 'modulos.resistencia', 'Resistencia al correr', 'Correr cansa', 'Corres sin límite');
  k('recursos', 'Salud', 'supervivencia.saludMax', 'Salud máxima', [[10, '5 corazones', 10], [20, '10 corazones', 20], [30, '15 corazones', 30], [40, '20 corazones', 40]].map(([s, n, v]) => [`s${s}`, n, v]), false);
  mult('recursos', 'Salud', 'supervivencia.hambreRitmo', 'Qué tan rápido da hambre', [0.5, 1, 1.8], ['Lento', 'Normal', 'Rápido'], false);
  mult('recursos', 'Salud', 'supervivencia.regeneracion', 'Recuperar salud', [0, 0.5, 1, 2], ['Nunca solo', 'Lento', 'Normal', 'Rápido'], false);
  // ---------------------------------------------------------------- conflicto
  si('conflicto', 'Criaturas', 'modulos.criaturas', 'Criaturas en el mundo', 'Lanudos, saltarines, zancudas…', 'Un mundo en silencio', true);
  si('conflicto', 'Criaturas', 'modulos.enemigos', 'Criaturas hostiles', 'Gólems de barro y cardos andantes te persiguen', 'Nadie te ataca', true);
  mult('conflicto', 'Criaturas', 'criaturas.densidad', 'Cuántas criaturas', [0.3, 0.6, 1, 1.2, 2], ['Muy pocas', 'Pocas', 'Normal', 'Bastantes', 'Muchísimas'], false);
  k('conflicto', 'Criaturas', 'criaturas.maximo', 'Tope de criaturas a la vez', [[10, '10', 10], [30, '30', 30], [40, '40', 40], [45, '45', 45], [70, '70', 70]].map(([s, n, v]) => [`m${s}`, n, v]), false);
  mult('conflicto', 'Criaturas', 'criaturas.agresividad', 'Agresividad de las hostiles', [0.5, 1, 1.6, 2.5], ['Despistadas', 'Normal', 'Atentas', 'Implacables'], false);
  mult('conflicto', 'Criaturas', 'criaturas.velocidad', 'Velocidad de las criaturas', [0.6, 1, 1.4], ['Lentas', 'Normal', 'Rápidas'], false);
  si('conflicto', 'Criaturas', 'criaturas.pasivas', 'Animales pasivos', 'Pastan y huyen si los molestas', 'No hay animales');
  si('conflicto', 'Criaturas', 'criaturas.neutrales', 'Criaturas neutrales', 'El tejón de roca solo ataca si lo golpeas', 'No hay neutrales');
  si('conflicto', 'Criaturas', 'criaturas.nocturnas', 'Hostiles salen de noche', 'De noche aparecen más', 'Solo en cuevas y mazmorras');
  si('conflicto', 'Criaturas', 'criaturas.jefe', 'Guardián de la mazmorra', 'Un jefe grande protege la última sala', 'La sala final está vacía', true);
  si('conflicto', 'Criaturas', 'criaturas.comerciantes', 'Mercaderes en las aldeas', 'Venden y compran', 'Aldeas sin mercader');
  si('conflicto', 'Criaturas', 'criaturas.exploradores', 'Cartógrafas que exploran', 'Te cuentan dónde hay estructuras', 'Sin exploradoras');
  k('conflicto', 'Peligros', 'supervivencia.dificultad', 'Dificultad', [['pacifica', 'Pacífica', 'pacifica', 'Las hostiles no hacen daño'], ['facil', 'Fácil', 'facil'], ['normal', 'Normal', 'normal'], ['dificil', 'Difícil', 'dificil']], true);
  si('conflicto', 'Peligros', 'modulos.danoAmbiental', 'Daño del ambiente', 'Lava, caídas, cactus y ahogarse hacen daño', 'El ambiente no daña');
  mult('conflicto', 'Peligros', 'supervivencia.danoCaida', 'Daño por caída', [0, 0.5, 1, 2], ['Nunca', 'Mitad', 'Normal', 'Doble'], false);
  mult('conflicto', 'Peligros', 'supervivencia.danoLava', 'Daño de la lava', [0.5, 1, 2], ['Tibia', 'Normal', 'Ardiente'], false);
  k('conflicto', 'Peligros', 'supervivencia.ahogo', 'Aire bajo el agua', [[8, '8 s', 8], [15, '15 s', 15], [30, '30 s', 30], [120, '2 min', 120]].map(([s, n, v]) => [`a${s}`, n, v]), false);
  // ---------------------------------------------------------------- límites
  k('limites', 'Mundo', 'mundo.borde', 'Borde del mundo', [[0, 'Infinito', 0, 'Generación bajo demanda sin borde'], [250, 'Isla de 500 bloques', 250], [1000, '2 km', 1000], [5000, '10 km', 5000]].map(([s, n, v, d]) => [`b${s}`, n, v, d]), true);
  k('limites', 'Mundo', 'mundo.altura', 'Altura del mundo', [[96, '96 bloques', 96], [128, '128 bloques', 128], [160, '160 bloques', 160], [192, '192 bloques', 192]].map(([s, n, v]) => [`h${s}`, n, v]), false);
  mult('limites', 'Subsuelo', 'mundo.cuevas', 'Túneles', [0, 0.5, 1, 1.6, 2.2], ['Sin túneles', 'Pocos', 'Normales', 'Muchos', 'Queso suizo'], true);
  mult('limites', 'Subsuelo', 'mundo.cavernas', 'Cavernas grandes', [0, 0.6, 1, 1.6], ['Ninguna', 'Pocas', 'Normales', 'Enormes'], false);
  mult('limites', 'Subsuelo', 'mundo.entradasCuevas', 'Bocas de cueva en la superficie', [0, 0.6, 1, 1.6], ['Ninguna', 'Raras', 'Normales', 'Frecuentes'], false);
  mult('limites', 'Subsuelo', 'mundo.lava', 'Lava profunda', [0, 1], ['Sin lava', 'Con lava'], false, '');
  k('limites', 'Vista', 'render.distancia', 'Distancia de visión (chunks)', [[3, 'Corta (3)', 3], [4, 'Media (4)', 4], [6, 'Normal (6)', 6], [8, 'Lejana (8)', 8], [10, 'Muy lejana (10)', 10]].map(([s, n, v]) => [`d${s}`, n, v]), true);
  k('limites', 'Vista', 'render.perfil', 'Calidad gráfica', [['auto', 'Automática', 'auto', 'Se ajusta si baja el rendimiento'], ['bajo', 'Baja', 'bajo'], ['medio', 'Media', 'medio'], ['alto', 'Alta', 'alto'], ['ultra', 'Ultra', 'ultra']], false);
  si('limites', 'Vista', 'render.ao', 'Sombras en las esquinas (AO)', 'Oclusión ambiental por vértice', 'Más plano, más rápido');
  mult('limites', 'Vista', 'render.niebla', 'Niebla', [0.5, 1, 1.5, 2], ['Poca', 'Normal', 'Densa', 'Muy densa'], false);
  mult('limites', 'Vista', 'render.olas', 'Olas del agua', [0, 1, 2], ['Quieta', 'Normal', 'Marejada'], false);
  mult('limites', 'Vista', 'render.brilloBloques', 'Brillo de antorchas y lava', [0.6, 1, 1.5], ['Tenue', 'Normal', 'Intenso'], false);
  mult('limites', 'Vista', 'render.resolucion', 'Resolución', [0.5, 0.75, 1], ['Media', 'Alta', 'Completa'], false);
  k('limites', 'Tiempo', 'ambiente.duracionDia', 'Duración de un día', [[120, '2 min', 120], [300, '5 min', 300], [480, '8 min', 480], [600, '10 min', 600], [1200, '20 min', 1200]].map(([s, n, v]) => [`d${s}`, n, v]), true);
  k('limites', 'Tiempo', 'ambiente.horaInicio', 'Hora al empezar', [[0.25, 'Amanecer', 0.25], [0.3, 'Mañana', 0.3], [0.32, 'Media mañana', 0.32], [0.5, 'Mediodía', 0.5], [0.72, 'Atardecer', 0.72], [0.9, 'Noche', 0.9]].map(([s, n, v]) => [`h${coma(s)}`, n, v]), false);
  si('limites', 'Tiempo', 'ambiente.cicloDia', 'Ciclo de día y noche', 'El sol se mueve', 'La hora se queda quieta');
  k('limites', 'Tiempo', 'ambiente.clima', 'Clima', [['auto', 'Según el bioma', 'auto'], ['despejado', 'Siempre despejado', 'despejado'], ['lluvia', 'Lluvia', 'lluvia'], ['nieve', 'Nieve', 'nieve']], false);
  mult('limites', 'Tiempo', 'ambiente.intensidadClima', 'Intensidad de lluvia y nieve', [0.5, 1, 2], ['Llovizna', 'Normal', 'Temporal'], false);
  k('limites', 'Tiempo', 'ambiente.luzNoche', 'Luz de luna', [[0.04, 'Muy oscura', 0.04], [0.12, 'Normal', 0.12], [0.3, 'Clara', 0.3]].map(([s, n, v]) => [`l${coma(s)}`, n, v]), false);
  si('limites', 'Tiempo', 'ambiente.estrellas', 'Estrellas de noche', 'Cielo estrellado', 'Cielo liso');
  // ---------------------------------------------------------------- objetivo
  si('objetivo', 'Misiones', 'modulos.misiones', 'Misiones', 'Una lista de objetivos (Q)', 'Juego libre', true);
  k('objetivo', 'Misiones', 'misiones.lista', 'Tipo de misiones', [['exploracion', 'Explorar', 'exploracion', 'Descubrir biomas y estructuras'], ['supervivencia', 'Sobrevivir', 'supervivencia', 'Recolectar, fabricar y aguantar la noche'], ['aventura', 'Aventura', 'aventura', 'Ruinas, mazmorra y el guardián'], ['constructor', 'Construir', 'constructor', 'Levanta una casa, una torre y un faro'], ['ninguna', 'Ninguna', 'ninguna']], true);
  k('objetivo', 'Misiones', 'misiones.cantidad', 'Cuántas misiones', [[3, '3', 3], [5, '5', 5], [6, '6', 6], [8, '8', 8], [12, '12', 12]].map(([s, n, v]) => [`n${s}`, n, v]), false);
  si('objetivo', 'Misiones', 'misiones.brujula', 'Brújula hacia el objetivo', 'Flecha que señala la próxima meta', 'Encuéntralo tú');
  mult('objetivo', 'Misiones', 'misiones.recompensaXP', 'Experiencia por misión', [0.5, 1, 1.5, 3], ['Poca', 'Normal', 'Generosa', 'Mucha'], false);
  si('objetivo', 'Progreso', 'modulos.experiencia', 'Experiencia y niveles', 'Ganas experiencia al minar y cumplir misiones', 'Sin niveles');
  // ---------------------------------------------------------------- resultado
  k('resultado', 'Fin', 'resultado.fin', 'Cuándo terminas', [['libre', 'Nunca: mundo libre', 'libre'], ['misiones', 'Al cumplir las misiones', 'misiones'], ['jefe', 'Al vencer al guardián', 'jefe'], ['tiempo', 'Al acabarse el tiempo', 'tiempo']], true);
  k('resultado', 'Fin', 'resultado.tiempo', 'Tiempo de partida (si cuenta)', [[300, '5 min', 300], [900, '15 min', 900], [1800, '30 min', 1800]].map(([s, n, v]) => [`t${s}`, n, v]), false);
  k('resultado', 'Fin', 'resultado.derrota', 'Si tu salud llega a cero', [['reaparecer', 'Reapareces', 'reaparecer'], ['perder_objetos', 'Reapareces sin tus objetos', 'perder_objetos'], ['fin', 'Fin de la partida', 'fin']], true);
  // ---------------------------------------------------------------- estructuras (procedimientos del mundo)
  const estr = [['aldea', 'Aldeas'], ['ruina', 'Ruinas'], ['mazmorra', 'Mazmorras'], ['torre', 'Torres'], ['templo', 'Templos'], ['campamento', 'Campamentos']];
  for (const [e, n] of estr) mult('objetivo', 'Estructuras', `estructuras.${e}`, n, [0, 0.5, 1, 1.2, 1.8, 2, 2.4, 2.6].filter((v, i, a) => a.indexOf(v) === i).slice(0, 8), ['Ninguna', 'Pocas', 'Normales', 'Algunas más', 'Frecuentes', 'Muchas', 'Muchísimas', 'Por todas partes'], e === 'aldea' || e === 'mazmorra');
  k('objetivo', 'Estructuras', 'estructuras.caminos', 'Caminos de grava en las aldeas', [['si', 'Sí', 1, 'Unen las casas con el pozo'], ['no', 'No', 0, 'Sin caminos']]);
  k('objetivo', 'Estructuras', 'estructuras.puentes', 'Puentes sobre el agua', [['si', 'Sí', 1, 'Los caminos cruzan ríos con tablas'], ['no', 'No', 0, 'Los caminos se cortan en el agua']]);
  // ---------------------------------------------------------------- accesibilidad y sonido (procedimientos)
  si('procedimientos', 'Accesibilidad', 'accesibilidad.reducirMovimiento', 'Reducir movimiento', 'Sin balanceo de cámara ni animaciones de interfaz', 'Con balanceo al caminar');
  si('procedimientos', 'Accesibilidad', 'accesibilidad.reducirDestellos', 'Reducir destellos', 'Sin parpadeo al recibir daño', 'Destello rojo al recibir daño');
  k('procedimientos', 'Accesibilidad', 'accesibilidad.mirilla', 'Mirilla', [['cruz', 'Cruz', 'cruz'], ['punto', 'Punto', 'punto'], ['grande', 'Cruz grande', 'grande']], false);
  mult('procedimientos', 'Sonido', 'audio.volumen', 'Volumen', [0, 0.3, 0.5, 0.8], ['Silencio', 'Bajo', 'Normal', 'Alto'], false, '');
  si('procedimientos', 'Sonido', 'audio.efectos', 'Efectos de sonido', 'Romper, poner, recoger…', 'Sin efectos');
  si('procedimientos', 'Sonido', 'audio.pasos', 'Sonido de pasos', 'Pasos al caminar', 'Pasos silenciosos');
  return out;
}
