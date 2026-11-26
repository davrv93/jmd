// Forja · lo que muestra el MENÚ fijo de cada juego (plantillas/menu.js): descripción, controles, ayuda y salir.
// Se arma al exportar (estudio, ZIP y aula) y viaja en DATOS.menu, así el juego descargado trae el mismo menú.
//   descripción: la ficha del catálogo (los elementos formales de Fullerton) y las reglas que el alumno cambió
//   controles:   las teclas que eligió en «Procedimientos» (motor/controles.js)
//   ayuda:       consejos cortos de cada juego (abajo)
import { leyenda } from './controles.js';
import { claves, porDefecto } from './juegos/index.js';

const VOXEL = ['Haz clic en el mundo para mirar con el ratón; Esc lo suelta y pausa.', 'Clic izquierdo rompe; clic derecho pone el bloque elegido. Con 1-9 o la rueda eliges bloque.', 'F cambia entre primera y tercera persona.'];
const AYUDA = {
  plataformas: ['Cae sobre un enemigo para vencerlo; si te toca de lado, pierdes una vida.', 'Golpea a los enemigos que tengas delante.', 'Las monedas suman puntos; la bandera es la meta.', 'V muestra las cajas de choque (rayos X). R vuelve a empezar.'],
  futbol: ['Acércate al balón para llevarlo y patéalo. Si apuntas con ↑ o ↓ al patear, el tiro sale en diagonal.', 'Gana quien llegue a 3 goles o vaya arriba cuando acabe el tiempo.', 'Tu arquero cuida tu arco: tú encárgate de atacar.', 'V muestra las cajas de choque. R empieza otro partido.'],
  laberinto: ['Junta las gemas y sal por la bandera.', 'Los rivales calculan el camino más corto hasta ti: usa las vueltas del laberinto para ganar distancia.', 'V muestra la ruta que piensa cada rival.', 'R arma otro intento.'],
  runner: ['Salta las bombas y agáchate bajo los proyectiles.', 'En el aire puedes volver a saltar (doble salto, si tu regla lo permite).', 'Cada vez va más rápido: tu récord son los metros.', 'R vuelve a empezar.'],
  fortaleza: ['Junto a un borde, ↑ te cuelga y vuelve a pulsarlo para trepar; ↓ te baja colgándote.', 'Caminando con cuidado no te caes de los bordes ni activas los pinchos.', 'Con la espada peleas con los guardias; ↓ frente a ellos bloquea.', 'Guarda pociones y bébelas cuando te haga falta. Busca cómo abrir la puerta de salida: llaves y placas.'],
  persecucion: ['Junta todas las gemas del laberinto para ganar.', 'Con una supergema los rivales huyen un rato: ahí puedes atraparlos.', 'Los pasillos de los costados te llevan al otro lado.', 'V muestra el objetivo y la ruta de cada rival.'],
  'duelo-anime': ['Los golpes ligero, medio y fuerte se encadenan en combos.', 'Bloquea manteniendo la dirección contraria al rival o con bloquear; justo a tiempo es una parada.', 'La energía sube al golpear o al cargar: gástala en el especial y en el definitivo.', 'En la pausa puedes ver las cajas de choque (rayos X).'],
  'jefe-titan': ['Mira el suelo: el anillo dorado o rojo avisa dónde va a caer su golpe.', 'Esquivar te vuelve invulnerable un instante.', 'Cuando el titán queda agotado o de rodillas, golpea su núcleo brillante: ahí duele más.'],
  'mundo-voxel': ['Cada semilla crea un mundo distinto: explora montañas, bosques, cuevas y aldeas.', ...VOXEL],
  'supervivencia-voxel': ['Recolecta madera y piedra, fabrica herramientas en el inventario y arma un refugio antes de la noche.', 'Come para que el hambre no baje la salud.', ...VOXEL],
  'creativo-voxel': ['Toca salto dos veces seguidas para volar; salto sube y agacharte baja.', 'Aquí no hay peligros: construye lo que imagines.', ...VOXEL],
  'aventura-voxel': ['La flecha de arriba apunta a tu próxima misión; con Q ves todas.', 'En la mazmorra te espera el guardián: lleva comida y buenas herramientas.', ...VOXEL],
};

const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
// id: plantilla · ficha y catalogo: del catálogo (motor/juegos) · reglas: DATOS.reglas · controles: DATOS.controles
export function menuDe(id, { ficha = null, catalogo = [], reglas = {}, controles = null } = {}) {
  const tusReglas = [];
  for (const k of claves(catalogo)) {
    if (!(k.clave in reglas) || igual(reglas[k.clave], porDefecto(k.opciones)[k.clave])) continue;
    const o = k.opciones.find((x) => igual(x.valor, reglas[k.clave]));
    if (o) tusReglas.push({ ajuste: k.ajuste, nombre: o.nombre });
  }
  return {
    ficha, tusReglas: tusReglas.slice(0, 14), masReglas: Math.max(0, tusReglas.length - 14), total: catalogo.length,
    controles: leyenda(id, controles || undefined), ayuda: AYUDA[id] || [],
    lado: /-anime$|^jefe-titan$|-voxel$/.test(id) ? 'izq' : 'der',   // donde no tapa el marcador de cada juego
  };
}
