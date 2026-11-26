// Reglas que comparten «Duelo anime» y «Jefe titán» (motor Anime Battle Engine). Cada clave la lee la plantilla
// (plantillas/duelo-anime.js, plantillas/jefe-titan.js) y la traduce a una opción real del motor.
import { clave } from './index.js';

const si = (p, el, gr, k, aj, def = true, dSi = '', dNo = '', extra) => clave(p, el, gr, k, aj, [['si', 'Sí', true, dSi, def], ['no', 'No', false, dNo, !def]], extra);
const nums = (p, el, gr, k, aj, lista, def, extra) => clave(p, el, gr, k, aj, lista.map(([n, v, d]) => [String(v).replace('.', '_').replace('-', 'm'), n, v, d || '', v === def]), extra);

// luchadores (jugadores) — compartido
export const luchador = (p) => clave(p, 'jugadores', 'Tu luchador', 'jugadores.luchador', 'Luchador', [
  ['ren', 'Ren Shiden', 'ren', 'Velocista del trueno: rápido, dos saltos en el aire, proyectil eléctrico', true],
  ['mako', 'Mako Enjin', 'mako', 'Coloso de brasas: lento, pesado, golpes que duelen'],
  ['forja', 'Tu personaje de Forja', 'forja', 'El que diseñaste en el estudio, con las técnicas de Ren']], { simple: true });

export const procedimientos = (p) => [
  ...si(p, 'procedimientos', 'Movimiento', 'proc.impulso', 'Impulso (→ →)', true, 'Doble toque adelante para lanzarte', 'Sin impulso: solo caminar'),
  ...nums(p, 'procedimientos', 'Movimiento', 'proc.saltosAereos', 'Saltos en el aire', [['Ninguno', 0], ['Los de cada personaje', -1, 'Ren 2, Mako 1'], ['Uno', 1], ['Dos', 2], ['Tres', 3]], -1),
  ...si(p, 'procedimientos', 'Defensa', 'proc.esquiva', 'Esquiva (O)', true, 'Invulnerable un instante', 'Sin esquiva: solo bloquear', { simple: true }),
  ...nums(p, 'procedimientos', 'Defensa', 'proc.esquivaCosto', 'Aguante por esquiva', [['Barata', 8], ['Normal', 18], ['Cara', 30]], 18),
  ...nums(p, 'procedimientos', 'Energía', 'proc.carga', 'Velocidad de carga (H)', [['Lenta', 0.3], ['Normal', 0.55], ['Rápida', 0.9], ['Instantánea', 1.6]], 0.55),
  ...si(p, 'procedimientos', 'Defensa', 'proc.parada', 'Parada (bloquear justo a tiempo)', true, 'Desvía el golpe y deja al rival expuesto', 'Bloquear tarde o temprano da igual'),
  ...nums(p, 'procedimientos', 'Defensa', 'proc.ventanaParada', 'Margen de la parada', [['Estricto (3 cuadros)', 3], ['Normal (6)', 6], ['Generoso (10)', 10]], 6),
  ...si(p, 'procedimientos', 'Defensa', 'proc.bloqueoAereo', 'Bloquear en el aire', false, 'Se puede bloquear saltando', 'En el aire estás expuesto'),
  ...clave(p, 'procedimientos', 'Combos', 'proc.cancelRecuperacion', 'Cancelar la recuperación (O tras un golpe)', [['no', 'No se puede', { activo: false, costo: 0 }], ['25', 'Cuesta 25 de energía', { activo: true, costo: 25 }, '', true], ['50', 'Cuesta 50', { activo: true, costo: 50 }], ['gratis', 'Gratis', { activo: true, costo: 0 }, 'Muy permisivo']]),
  ...si(p, 'procedimientos', 'Combos', 'proc.cancelAereo', 'Cancelar con salto en el aire', true, 'Golpe aéreo → salto → otro golpe'),
  ...nums(p, 'procedimientos', 'Controles', 'proc.ventanaMovimiento', 'Tolerancia de ↓↘→', [['Estricta (8 cuadros)', 8], ['Normal (14)', 14], ['Amplia (22)', 22, 'Más fácil para empezar']], 14),
  ...nums(p, 'procedimientos', 'Controles', 'proc.ventanaPulsacion', 'Memoria del botón (buffer)', [['Corta (3)', 3], ['Normal (6)', 6], ['Larga (10)', 10]], 6),
];

export const reglasCombate = (p) => [
  ...nums(p, 'reglas', 'Daño', 'reglas.danoMul', 'Daño de los golpes', [['La mitad', 0.5], ['Menos', 0.75], ['Normal', 1], ['Más', 1.5], ['El doble', 2]], 1, { simple: true }),
  ...nums(p, 'reglas', 'Daño', 'reglas.vidaMul', 'Vida de los luchadores', [['La mitad', 0.5], ['Normal', 1], ['1,5 veces', 1.5], ['El doble', 2]], 1),
  ...nums(p, 'reglas', 'Daño', 'reglas.defensaMul', 'Defensa general', [['Frágil', 0.7], ['Normal', 1], ['Resistente', 1.3]], 1),
  ...nums(p, 'reglas', 'Combos', 'reglas.escalado', 'Escalado de daño en combos', [['Sin escalado', 0, 'Cada golpe del combo hace todo su daño'], ['Suave', 0.06], ['Normal', 0.1], ['Fuerte', 0.15, 'Los combos largos rinden poco']], 0.1),
  ...nums(p, 'reglas', 'Combos', 'reglas.escaladoMinimo', 'Daño mínimo de un golpe en combo', [['10 %', 0.1], ['30 %', 0.3], ['50 %', 0.5]], 0.3),
  ...nums(p, 'reglas', 'Combos', 'reglas.malabarMax', 'Límite de malabares (golpes en el aire)', [['3', 3], ['6', 6], ['10', 10], ['20 (casi sin límite)', 20]], 6),
  ...nums(p, 'reglas', 'Combos', 'reglas.comboMax', 'Duración máxima de un combo', [['3 s', 180], ['6 s', 360], ['10 s', 600], ['20 s', 1200]], 360),
  ...nums(p, 'reglas', 'Combos', 'reglas.decaeAturd', 'El aturdimiento baja en combos largos', [['No baja', 0], ['Baja un poco', 2], ['Baja mucho', 4]], 2),
  ...nums(p, 'reglas', 'Combos', 'reglas.repetidoMul', 'Repetir el mismo golpe en un combo', [['Rinde igual', 1], ['Rinde 80 %', 0.8], ['Rinde 60 %', 0.6]], 0.8),
  ...nums(p, 'reglas', 'Daño', 'reglas.contraMul', 'Contraataque (golpear durante su arranque)', [['Sin bono', 1], ['+25 %', 1.25], ['+50 %', 1.5]], 1.25),
  ...nums(p, 'reglas', 'Daño', 'reglas.chip', 'Daño al bloquear técnicas', [['Ninguno', 0], ['12 %', 0.12], ['25 %', 0.25]], 0.12),
  ...si(p, 'reglas', 'Física', 'reglas.rebotePared', 'Rebote en la pared', true, 'Ciertos golpes te estrellan y rebotas'),
  ...si(p, 'reglas', 'Física', 'reglas.reboteSuelo', 'Rebote en el suelo', true, 'Los golpes hacia abajo te hacen rebotar'),
  ...nums(p, 'reglas', 'Física', 'reglas.empujeEsquina', 'Empuje contra la esquina', [['El atacante no retrocede', 0], ['Retrocede la mitad', 0.5], ['Retrocede todo', 1]], 0.5),
  ...si(p, 'reglas', 'Daño', 'reglas.debilidades', 'Debilidades por elemento', true, 'El trueno duele más al que es de agua, etc.'),
];

export const recursos = (p) => [
  ...nums(p, 'recursos', 'Energía', 'recursos.energiaInicial', 'Energía al empezar', [['0', 0], ['25', 25], ['50', 50], ['Llena', 100]], 0, { simple: true }),
  ...nums(p, 'recursos', 'Energía', 'recursos.energiaMul', 'Energía que da golpear', [['La mitad', 0.5], ['Normal', 1], ['1,5 veces', 1.5], ['El doble', 2]], 1),
  ...nums(p, 'recursos', 'Energía', 'recursos.costoDefinitivo', 'Costo del definitivo', [['50', 50], ['75', 75], ['100 (barra llena)', 100]], 100),
  ...nums(p, 'recursos', 'Energía', 'recursos.costoEspecial', 'Costo de las técnicas', [['Gratis', 0], ['10', 10], ['15', 15], ['25', 25]], 15),
  ...nums(p, 'recursos', 'Energía', 'recursos.costoCargado', 'Costo de la técnica cargada', [['20', 20], ['35', 35], ['50', 50]], 35),
  ...nums(p, 'recursos', 'Transformación', 'recursos.costoTransformacion', 'Costo de transformarse', [['25', 25], ['50', 50], ['75', 75], ['100', 100]], 50),
  ...nums(p, 'recursos', 'Transformación', 'recursos.duracionTransformacion', 'Duración de la transformación', [['5 s', 300], ['10 s', 600], ['20 s', 1200], ['Toda la ronda', 3600]], 600),
  ...nums(p, 'recursos', 'Aguante', 'recursos.aguante', 'Aguante (para bloquear y esquivar)', [['Poco', 60], ['Normal', 100], ['Mucho', 160], ['Infinito', 999]], 100),
  ...nums(p, 'recursos', 'Aguante', 'recursos.aguanteBloqueo', 'Desgaste al bloquear', [['Poco', 0.15], ['Normal', 0.28], ['Mucho', 0.45, 'Bloquear siempre rompe la guardia']], 0.28),
  ...nums(p, 'recursos', 'Aguante', 'recursos.aguanteRecupera', 'Recuperación del aguante', [['Lenta', 0.2], ['Normal', 0.35], ['Rápida', 0.6]], 0.35),
];

export const conflicto = (p) => [
  ...si(p, 'conflicto', 'Técnicas', 'conflicto.transformacion', 'Transformación (T)', true, 'Gasta energía: más fuerza y velocidad un tiempo', 'Nadie se transforma', { simple: true }),
  ...si(p, 'conflicto', 'Técnicas', 'conflicto.definitivo', 'Ataque definitivo (Y)', true, 'Con la barra llena, un golpe con cinemática', '', { simple: true }),
  ...si(p, 'conflicto', 'Técnicas', 'conflicto.cinematicas', 'Cinemáticas de definitivos', true, 'Zoom, retrato y cámara lenta', 'El daño es el mismo, sin escena'),
  ...si(p, 'conflicto', 'Técnicas', 'conflicto.proyectiles', 'Proyectiles de energía', true, '', 'Solo cuerpo a cuerpo'),
  ...si(p, 'conflicto', 'Técnicas', 'conflicto.rompeGuardia', 'Rompeguardia (J + K a la vez)', true, 'Lento pero no se puede bloquear'),
  ...si(p, 'conflicto', 'Técnicas', 'conflicto.lanzador', 'Lanzador (↓ + L)', true, 'Manda al rival al aire para malabares'),
  ...nums(p, 'conflicto', 'Transformación', 'conflicto.fuerzaTransformacion', 'Fuerza al transformarse', [['+10 %', 1.1], ['+25 %', 1.25], ['+50 %', 1.5]], 1.25),
  ...clave(p, 'conflicto', 'Elementos', 'conflicto.elementoRen', 'Elemento de Ren', [['electrico', 'Trueno', 'electrico', '', true], ['hielo', 'Hielo', 'hielo'], ['viento', 'Viento', 'viento'], ['luz', 'Luz', 'luz']]),
  ...clave(p, 'conflicto', 'Elementos', 'conflicto.elementoMako', 'Elemento de Mako', [['fuego', 'Fuego', 'fuego', '', true], ['tierra', 'Tierra', 'tierra'], ['sombra', 'Sombra', 'sombra']]),
];

export const limites = (p) => [
  ...clave(p, 'limites', 'Escenario', 'limites.escenario', 'Ancho del escenario', [['estrecho', 'Estrecho', 450, 'Siempre cerca de la esquina'], ['normal', 'Normal', 700, '', true], ['amplio', 'Amplio', 1000]]),
  ...nums(p, 'limites', 'Física', 'limites.gravedad', 'Gravedad', [['Lunar', 0.45], ['Ligera', 0.65], ['Normal', 0.82], ['Pesada', 1.1]], 0.82, { simple: true }),
  ...nums(p, 'limites', 'Física', 'limites.friccion', 'Suelo', [['Hielo', 0.95], ['Normal', 0.78], ['Arena', 0.6]], 0.78),
  ...nums(p, 'limites', 'Ritmo', 'limites.velocidad', 'Velocidad del juego', [['Lenta', 0.8], ['Normal', 1], ['Rápida', 1.25], ['Turbo', 1.5]], 1, { simple: true }),
  ...nums(p, 'limites', 'Ritmo', 'limites.velocidadMovimiento', 'Velocidad al caminar', [['Lenta', 0.8], ['Normal', 1], ['Rápida', 1.2]], 1),
  ...nums(p, 'limites', 'Física', 'limites.salto', 'Altura del salto', [['Bajo', 0.8], ['Normal', 1], ['Alto', 1.2]], 1),
  ...clave(p, 'limites', 'Escenario', 'limites.escenarioTema', 'Escenario', [['noche', 'Arena nocturna', 'noche'], ['dojo', 'Dojo', 'dojo'], ['puerto', 'Puerto al atardecer', 'puerto'], ['azotea', 'Azotea con lluvia', 'azotea'], ['templo', 'Templo en ruinas', 'templo'], ['bosque', 'Bosque', 'bosque']].map((x, i, a) => (x[0] === (p === 'jefe-titan' ? 'templo' : 'noche') ? [...x, '', true] : x)), { simple: true }),
];

export const presentacion = (p) => [
  ...nums(p, 'reglas', 'Efectos', 'efectos.intensidad', 'Intensidad de los efectos', [['Suave', 0.5], ['Normal', 1], ['Espectacular', 1.5]], 1),
  ...nums(p, 'reglas', 'Efectos', 'efectos.densidad', 'Cantidad de partículas', [['Pocas', 0.5], ['Normal', 1], ['Muchas', 1.5]], 1),
  ...si(p, 'reglas', 'Accesibilidad', 'efectos.sacudida', 'Sacudidas de cámara', true, '', 'Reducir movimiento: la cámara no tiembla'),
  ...si(p, 'reglas', 'Accesibilidad', 'efectos.destellos', 'Destellos', true, '', 'Reducir destellos: máximo 3 por segundo y tenues'),
  ...si(p, 'reglas', 'Efectos', 'efectos.impactoCuadro', 'Cuadros de impacto (inversión de color)', true),
  ...si(p, 'reglas', 'Efectos', 'efectos.lineasVelocidad', 'Líneas de velocidad', true),
  ...si(p, 'reglas', 'Efectos', 'efectos.postimagenes', 'Postimágenes al moverse rápido', true),
  ...si(p, 'reglas', 'Efectos', 'efectos.estelas', 'Estelas de los golpes', true),
  ...si(p, 'reglas', 'Efectos', 'efectos.cajas', 'Ver siempre las cajas de golpe', false, 'Azul: donde te pueden golpear. Rojo: donde golpeas'),
  ...nums(p, 'reglas', 'Sonido', 'audio.volumen', 'Volumen', [['Silencio', 0], ['Bajo', 0.25], ['Medio', 0.5], ['Alto', 0.8]], 0.5),
  ...si(p, 'reglas', 'Cámara', 'camara.dinamica', 'Zoom dinámico', true, 'Se acerca cuando están cerca', 'Cámara fija'),
  ...nums(p, 'reglas', 'Cámara', 'camara.zoomMax', 'Acercamiento máximo', [['Nada', 1], ['Normal', 1.15], ['Mucho', 1.35]], 1.15),
  ...si(p, 'reglas', 'Interfaz', 'hud.resortes', 'Barras con resorte', true, 'La barra rebota al bajar (Anime.js)', 'Cambio instantáneo'),
  ...si(p, 'resultado', 'Interfaz', 'resultado.numerosDano', 'Números de daño', true),
  ...si(p, 'resultado', 'Interfaz', 'resultado.cuentaCombo', 'Contador de combo', true),
  ...si(p, 'resultado', 'Final', 'resultado.koLento', 'Cámara lenta en el K.O.', true, '', '', { simple: true }),
  ...clave(p, 'limites', 'Rendimiento', 'perfil.grafico', 'Calidad gráfica', [['auto', 'Automática (se ajusta sola)', 'auto', '', true], ['bajo', 'Baja', 'bajo'], ['medio', 'Media', 'medio'], ['alto', 'Alta', 'alto'], ['ultra', 'Ultra', 'ultra']]),
];

// medidas de un luchador (clave p. ej. 'ren.velocidad')
export const medidas = (p, quien, nombre) => [
  ...nums(p, 'jugadores', nombre, `${quien}.velocidad`, `Velocidad de ${nombre}`, [['Más lento', 0.85], ['Normal', 1], ['Más rápido', 1.15]], 1),
  ...nums(p, 'jugadores', nombre, `${quien}.fuerza`, `Fuerza de ${nombre}`, [['Menos', 0.85], ['Normal', 1], ['Más', 1.15]], 1),
  ...nums(p, 'jugadores', nombre, `${quien}.salud`, `Vida de ${nombre}`, [['Menos', 0.85], ['Normal', 1], ['Más', 1.15]], 1),
  ...nums(p, 'jugadores', nombre, `${quien}.alcance`, `Alcance de ${nombre}`, [['Corto', 0.85], ['Normal', 1], ['Largo', 1.2]], 1),
  ...clave(p, 'jugadores', nombre, `${quien}.ropa`, `Ropa de ${nombre}`, [['base', 'La de siempre', null, '', true], ['rojo', 'Roja', '#a3242c'], ['verde', 'Verde', '#2f7a46'], ['negro', 'Negra', '#24212e']]),
];
