// Forja · voxel · registro DECLARATIVO de bloques. Cada bloque es datos: nada de código por bloque.
// Un id cabe en un byte (Uint8Array por chunk). Los plugins agregan bloques con registrarBloque() (ids 64..255).
//   forma: 'cubo' | 'liquido' | 'planta' (dos planos en cruz) · pase: 'opaco' | 'recorte' (hojas: descarta píxeles) |
//   'transparente' (vidrio, hielo, agua: se dibujan después, de atrás hacia adelante)
//   textura: nombre de la loseta del atlas, o { arriba, lado, abajo }
//   tinte: el shader tiñe sus píxeles marcados (atlas.js) con el color del clima · vaiven: el viento lo mece
export const AIRE = 0;
const B = (id, clave, nombre, o) => ({ id, clave, nombre, forma: 'cubo', pase: 'opaco', solido: true, transparente: false, dureza: 1, friccion: 0.6, inflamable: false, luz: 0, resistencia: 1, herramienta: null, suelta: clave, ...o });
export const BLOQUES = [
  B(0, 'aire', 'Aire', { solido: false, transparente: true, dureza: 0, suelta: null, forma: 'nada' }),
  B(1, 'tierra', 'Tierra', { textura: 'tierra', dureza: 0.5, herramienta: 'pala' }),
  B(2, 'cesped', 'Césped', { textura: { arriba: 'cesped', lado: 'cesped_lado', abajo: 'tierra' }, dureza: 0.6, herramienta: 'pala', suelta: 'tierra', tinte: true }),
  B(3, 'piedra', 'Piedra', { textura: 'piedra', dureza: 1.5, resistencia: 6, herramienta: 'pico' }),
  B(4, 'arena', 'Arena', { textura: 'arena', dureza: 0.5, herramienta: 'pala', friccion: 0.5 }),
  B(5, 'agua', 'Agua', { textura: 'agua', forma: 'liquido', pase: 'transparente', solido: false, transparente: true, dureza: -1, suelta: null, resistencia: 100 }),
  B(6, 'lava', 'Lava', { textura: 'lava', forma: 'liquido', pase: 'opaco', solido: false, transparente: false, dureza: -1, luz: 15, suelta: null, resistencia: 100, dano: 4 }),
  B(7, 'madera', 'Tronco', { textura: { arriba: 'tronco_corte', lado: 'tronco', abajo: 'tronco_corte' }, dureza: 2, herramienta: 'hacha', inflamable: true }),
  B(8, 'hojas', 'Hojas', { textura: 'hojas', pase: 'recorte', transparente: true, dureza: 0.2, inflamable: true, suelta: 'baya', probSuelta: 0.08, tinte: true, vaiven: true }),
  B(9, 'nieve', 'Nieve', { textura: 'nieve', dureza: 0.2, herramienta: 'pala', friccion: 0.5 }),
  B(10, 'hielo', 'Hielo', { textura: 'hielo', pase: 'transparente', transparente: true, dureza: 0.5, friccion: 0.02, herramienta: 'pico', suelta: null }),
  B(11, 'carbon', 'Carbón', { textura: 'carbon', dureza: 3, resistencia: 6, herramienta: 'pico', suelta: 'carbon', xp: 1 }),
  B(12, 'hierro', 'Hierro', { textura: 'hierro', dureza: 3, resistencia: 6, herramienta: 'pico', nivel: 1, suelta: 'hierro', xp: 2 }),
  B(13, 'oro', 'Oro', { textura: 'oro', dureza: 3, resistencia: 6, herramienta: 'pico', nivel: 2, suelta: 'oro', xp: 4 }),
  B(14, 'cristal', 'Cristales', { textura: 'cristal', dureza: 2, luz: 9, herramienta: 'pico', nivel: 2, suelta: 'cristal', xp: 6 }),
  B(15, 'ladrillos', 'Ladrillos', { textura: 'ladrillos', dureza: 2, resistencia: 6, herramienta: 'pico' }),
  B(16, 'vidrio', 'Vidrio', { textura: 'vidrio', pase: 'transparente', transparente: true, dureza: 0.3, suelta: null }),
  // estructuras, vegetación y ambiente
  B(17, 'tablas', 'Tablas', { textura: 'tablas', dureza: 2, herramienta: 'hacha', inflamable: true }),
  B(18, 'escalera', 'Escalera de mano', { textura: 'escalera', pase: 'recorte', transparente: true, solido: false, escalable: true, dureza: 0.4, herramienta: 'hacha' }),
  B(19, 'cofre', 'Cofre', { textura: { arriba: 'cofre_tapa', lado: 'cofre', abajo: 'tablas' }, dureza: 2.5, herramienta: 'hacha', contenedor: true }),
  B(20, 'antorcha', 'Antorcha', { textura: 'antorcha', forma: 'planta', pase: 'recorte', solido: false, transparente: true, luz: 14, dureza: 0 }),
  B(21, 'flor', 'Flor', { textura: 'flor', forma: 'planta', pase: 'recorte', solido: false, transparente: true, dureza: 0, vaiven: true }),
  B(22, 'hierba', 'Hierba alta', { textura: 'hierba', forma: 'planta', pase: 'recorte', solido: false, transparente: true, dureza: 0, suelta: 'semilla', probSuelta: 0.2, tinte: true, vaiven: true }),
  B(23, 'cactus', 'Cactus', { textura: { arriba: 'cactus_arriba', lado: 'cactus', abajo: 'cactus_arriba' }, dureza: 0.4, dano: 1 }),
  B(24, 'musgosa', 'Piedra musgosa', { textura: 'musgosa', dureza: 2, herramienta: 'pico' }),
  B(25, 'grava', 'Grava', { textura: 'grava', dureza: 0.6, herramienta: 'pala' }),
  B(26, 'arcilla', 'Arcilla roja', { textura: 'arcilla', dureza: 1.2, herramienta: 'pico' }),
  B(27, 'lecho', 'Roca madre', { textura: 'lecho', dureza: -1, resistencia: 1e9, suelta: null }),
  B(28, 'pino', 'Hojas de pino', { textura: 'pino', pase: 'recorte', transparente: true, dureza: 0.2, inflamable: true, suelta: null, vaiven: true }),
  B(29, 'abedul', 'Tronco claro', { textura: { arriba: 'tronco_corte', lado: 'abedul', abajo: 'tronco_corte' }, dureza: 2, herramienta: 'hacha', inflamable: true, suelta: 'madera' }),
  B(30, 'arenisca', 'Arenisca', { textura: { arriba: 'arena', lado: 'arenisca', abajo: 'arena' }, dureza: 1, herramienta: 'pico' }),
  B(31, 'barro', 'Barro', { textura: 'barro', dureza: 0.5, herramienta: 'pala', friccion: 0.9 }),
  B(32, 'pasto_seco', 'Pasto seco', { textura: { arriba: 'pasto_seco', lado: 'pasto_seco_lado', abajo: 'tierra' }, dureza: 0.6, herramienta: 'pala', suelta: 'tierra' }),
  B(33, 'tallada', 'Piedra tallada', { textura: 'tallada', dureza: 2.5, resistencia: 8, herramienta: 'pico' }),
  B(34, 'nevado', 'Césped nevado', { textura: { arriba: 'nieve', lado: 'nevado_lado', abajo: 'tierra' }, dureza: 0.6, herramienta: 'pala', suelta: 'tierra' }),
  B(35, 'arcilla_clara', 'Arcilla clara', { textura: 'arcilla_clara', dureza: 1.2, herramienta: 'pico' }),
  B(36, 'lampara', 'Lámpara de cristal', { textura: 'lampara', dureza: 0.6, luz: 15 }),
  B(37, 'mesa', 'Mesa de trabajo', { textura: { arriba: 'mesa_arriba', lado: 'mesa', abajo: 'tablas' }, dureza: 2, herramienta: 'hacha', estacion: 'mesa' }),
  B(38, 'horno', 'Horno', { textura: { arriba: 'piedra', lado: 'horno', abajo: 'piedra' }, dureza: 3, herramienta: 'pico', estacion: 'horno' }),
  B(39, 'lana', 'Lana', { textura: 'lana', dureza: 0.6, inflamable: true }),
  B(40, 'bandera', 'Estandarte', { textura: 'bandera', forma: 'planta', pase: 'recorte', solido: false, transparente: true, dureza: 0, vaiven: true }),
  // paisaje: más flores, helechos, arbustos, copas en flor y doradas, senderos y enredaderas (se agregan AL FINAL: los
  // ids y las losetas de antes no cambian, así las partidas guardadas siguen valiendo)
  B(41, 'flor_azul', 'Campanilla', { textura: 'flor_azul', forma: 'planta', pase: 'recorte', solido: false, transparente: true, dureza: 0, vaiven: true }),
  B(42, 'flor_amarilla', 'Flor amarilla', { textura: 'flor_amarilla', forma: 'planta', pase: 'recorte', solido: false, transparente: true, dureza: 0, vaiven: true }),
  B(43, 'helecho', 'Helecho', { textura: 'helecho', forma: 'planta', pase: 'recorte', solido: false, transparente: true, dureza: 0, suelta: null, tinte: true, vaiven: true }),
  B(44, 'arbusto', 'Arbusto', { textura: 'arbusto', pase: 'recorte', transparente: true, dureza: 0.2, inflamable: true, suelta: 'baya', probSuelta: 0.25, tinte: true, vaiven: true }),
  B(45, 'hojas_flor', 'Copa en flor', { textura: 'hojas_flor', pase: 'recorte', transparente: true, dureza: 0.2, inflamable: true, suelta: null, vaiven: true }),
  B(46, 'hojas_oro', 'Hojas doradas', { textura: 'hojas_oro', pase: 'recorte', transparente: true, dureza: 0.2, inflamable: true, suelta: null, vaiven: true }),
  B(47, 'sendero', 'Sendero', { textura: { arriba: 'sendero', lado: 'tierra', abajo: 'tierra' }, dureza: 0.5, herramienta: 'pala', suelta: 'tierra' }),
  B(48, 'enredadera', 'Enredadera', { textura: 'enredadera', forma: 'planta', pase: 'recorte', solido: false, transparente: true, escalable: true, dureza: 0, suelta: null, tinte: true, vaiven: true }),
];
export const PORCLAVE = Object.fromEntries(BLOQUES.map((b) => [b.clave, b]));
export const ID = Object.fromEntries(BLOQUES.map((b) => [b.clave, b.id]));

// Tablas rápidas por id (Uint8Array) para el mallador y la física: sin buscar objetos en el bucle caliente.
export const T = { solido: new Uint8Array(256), opaco: new Uint8Array(256), pase: new Uint8Array(256), forma: new Uint8Array(256), luz: new Uint8Array(256), escalable: new Uint8Array(256), liquido: new Uint8Array(256), tinte: new Uint8Array(256), vaiven: new Uint8Array(256) };
const PASE = { opaco: 0, recorte: 1, transparente: 2 }, FORMA = { nada: 0, cubo: 1, liquido: 2, planta: 3 };
// texturas por id y cara (0 arriba, 1 abajo, 2 lado): índice de loseta en el atlas; se rellena con fijarLosetas()
export const LOSETA = new Uint16Array(256 * 3);
function indexar(b) {
  T.solido[b.id] = b.solido ? 1 : 0; T.pase[b.id] = PASE[b.pase] ?? 0; T.forma[b.id] = FORMA[b.forma] ?? 1;
  T.opaco[b.id] = b.forma === 'cubo' && b.pase === 'opaco' ? 1 : 0; T.luz[b.id] = b.luz | 0; T.escalable[b.id] = b.escalable ? 1 : 0; T.liquido[b.id] = b.forma === 'liquido' ? 1 : 0;
  T.tinte[b.id] = b.tinte ? 1 : 0; T.vaiven[b.id] = b.vaiven ? 1 : 0;
}
BLOQUES.forEach(indexar);
export const nombresTextura = (b) => (typeof b.textura === 'object' ? [b.textura.arriba, b.textura.abajo, b.textura.lado] : [b.textura, b.textura, b.textura]);
// Orden de losetas = orden de aparición en el registro: el Worker y el atlas (hilo principal) llegan al mismo índice
// sin pasarse nada. Hasta 256 losetas (atlas de 16×16 losetas).
export const LOSETAS = [];
export function indexarLosetas() {
  for (const b of BLOQUES) { if (!b?.textura) continue; nombresTextura(b).forEach((n, c) => { let i = LOSETAS.indexOf(n); if (i < 0) { i = LOSETAS.length; LOSETAS.push(n); } LOSETA[b.id * 3 + c] = i; }); }
  return LOSETAS;
}
// Plugins: { id, clave, nombre, textura, receta? (de atlas.js), …propiedades }
export function registrarBloque(def) {
  if (!Number.isInteger(def.id) || def.id < 64 || def.id > 255) throw new Error('los bloques de plugins usan ids 64..255');
  if (BLOQUES[def.id] || PORCLAVE[def.clave]) throw new Error(`bloque repetido: ${def.clave}`);
  const b = B(def.id, def.clave, def.nombre, def); BLOQUES[def.id] = b; PORCLAVE[b.clave] = b; ID[b.clave] = b.id; indexar(b); indexarLosetas(); return b;
}
export const bloque = (id) => BLOQUES[id] || BLOQUES[0];
indexarLosetas();
