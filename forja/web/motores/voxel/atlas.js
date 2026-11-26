// Forja · voxel · atlas de texturas PROCEDURAL y original: cada loseta de 16×16 px se calcula con hash y ruido
// (sin imágenes descargadas). El orden de las losetas lo da el registro de bloques (bloques.js), así el Worker sabe
// el índice sin ver el atlas. Atlas de 16×16 losetas = 256×256 px, filtrado NEAREST (aspecto pixelado limpio).
import { LOSETAS } from './bloques.js';
import { hash2 } from '../nucleo/semilla.js';

const R = (n, k) => (hash2(0x5eed + k, n % 16, (n / 16) | 0) / 4294967296);
// receta: base RGB, variación, patrón y extras
const RECETAS = {
  tierra: { base: [134, 96, 67], v: 22, p: 'grano' }, cesped: { base: [92, 160, 64], v: 26, p: 'grano' },
  cesped_lado: { base: [134, 96, 67], v: 20, p: 'franja', franja: [92, 160, 64] }, piedra: { base: [128, 128, 132], v: 22, p: 'piedra' },
  arena: { base: [222, 205, 150], v: 14, p: 'grano' }, agua: { base: [48, 110, 200], v: 16, p: 'ondas', a: 170 },
  lava: { base: [235, 110, 30], v: 40, p: 'ondas', extra: [255, 200, 60] }, tronco_corte: { base: [168, 130, 84], v: 12, p: 'anillos', extra: [110, 80, 50] },
  tronco: { base: [104, 78, 50], v: 18, p: 'vetas' }, hojas: { base: [60, 130, 52], v: 30, p: 'hojas' }, pino: { base: [40, 96, 58], v: 24, p: 'hojas' },
  nieve: { base: [240, 245, 250], v: 8, p: 'grano' }, hielo: { base: [160, 200, 240], v: 14, p: 'grietas', a: 190 },
  carbon: { base: [128, 128, 132], v: 20, p: 'mineral', extra: [40, 40, 44] }, hierro: { base: [128, 128, 132], v: 20, p: 'mineral', extra: [214, 168, 128] },
  oro: { base: [128, 128, 132], v: 20, p: 'mineral', extra: [250, 210, 60] }, cristal: { base: [110, 100, 150], v: 20, p: 'mineral', extra: [150, 240, 255], brillo: true },
  ladrillos: { base: [170, 80, 62], v: 16, p: 'ladrillo', extra: [200, 190, 180] }, vidrio: { base: [210, 235, 245], v: 6, p: 'marco', a: 70 },
  tablas: { base: [178, 136, 86], v: 14, p: 'tablas' }, escalera: { base: [150, 110, 66], v: 10, p: 'escalera' }, cofre_tapa: { base: [150, 104, 56], v: 12, p: 'tablas', extra: [70, 60, 50] },
  cofre: { base: [150, 104, 56], v: 12, p: 'cofre', extra: [230, 200, 90] }, antorcha: { base: [120, 85, 50], v: 0, p: 'antorcha' }, flor: { base: [70, 150, 60], v: 0, p: 'flor' },
  hierba: { base: [96, 168, 70], v: 20, p: 'hierba' }, cactus_arriba: { base: [70, 140, 60], v: 14, p: 'anillos', extra: [50, 110, 45] }, cactus: { base: [70, 140, 60], v: 14, p: 'cactus' },
  musgosa: { base: [120, 124, 120], v: 22, p: 'musgo', extra: [80, 140, 70] }, grava: { base: [130, 124, 118], v: 34, p: 'piedra' }, arcilla: { base: [178, 96, 64], v: 12, p: 'grano' },
  lecho: { base: [70, 70, 74], v: 40, p: 'piedra' }, abedul: { base: [225, 222, 210], v: 10, p: 'abedul', extra: [50, 50, 45] }, arenisca: { base: [214, 190, 130], v: 10, p: 'estratos' },
  barro: { base: [92, 80, 58], v: 18, p: 'grano' }, pasto_seco: { base: [170, 168, 82], v: 22, p: 'grano' }, pasto_seco_lado: { base: [134, 96, 67], v: 18, p: 'franja', franja: [170, 168, 82] },
  tallada: { base: [140, 140, 146], v: 10, p: 'tallada' }, nevado_lado: { base: [134, 96, 67], v: 18, p: 'franja', franja: [240, 245, 250] }, arcilla_clara: { base: [214, 170, 130], v: 10, p: 'grano' },
  lampara: { base: [170, 230, 250], v: 20, p: 'lampara', brillo: true }, mesa_arriba: { base: [178, 136, 86], v: 10, p: 'rejilla', extra: [110, 80, 50] }, mesa: { base: [160, 120, 76], v: 12, p: 'tablas', extra: [100, 100, 110] },
  horno: { base: [118, 118, 122], v: 14, p: 'horno' }, lana: { base: [236, 232, 222], v: 10, p: 'grano' }, bandera: { base: [200, 60, 70], v: 0, p: 'bandera' },
};
export const recetas = RECETAS;
// plugins: un bloque nuevo trae su receta de textura (datos, no código)
export function registrarReceta(nombre, receta) { if (!RECETAS[nombre] && receta && Array.isArray(receta.base)) RECETAS[nombre] = { base: receta.base.slice(0, 3).map((x) => Math.max(0, Math.min(255, x | 0))), v: Math.max(0, Math.min(60, receta.v | 0)), p: String(receta.p || 'grano'), extra: receta.extra, a: receta.a }; }
export const LADO = 16, TEJAS = 16;

function pintar(nombre, img, ox, oy, n) {
  const r = RECETAS[nombre] || { base: [255, 0, 255], v: 0, p: 'grano' }, W = LADO * TEJAS;
  const px = (x, y, c, a = 255) => { const i = ((oy + y) * W + ox + x) * 4; img[i] = c[0]; img[i + 1] = c[1]; img[i + 2] = c[2]; img[i + 3] = a; };
  const mez = (c, d) => [Math.max(0, Math.min(255, c[0] + d)), Math.max(0, Math.min(255, c[1] + d)), Math.max(0, Math.min(255, c[2] + d))];
  const ruido = (x, y, k = 0) => hash2(n * 977 + k, x, y) / 4294967296;
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const g = ruido(x, y), d = (g - 0.5) * 2 * r.v; let c = mez(r.base, d), a = r.a ?? 255;
    switch (r.p) {
      case 'franja': if (y < 3 + (ruido(x, 0, 3) * 3 | 0)) c = mez(r.franja, d * 0.7); break;
      case 'piedra': if (ruido(x >> 1, y >> 1, 5) < 0.18) c = mez(c, -22); break;
      case 'ondas': { const o = Math.sin((x + y * 0.5) * 0.8 + ruido(0, y, 1) * 2) * 0.5 + 0.5; c = r.extra ? (o > 0.7 ? mez(r.extra, d * 0.4) : c) : mez(c, o * 18); break; }
      case 'anillos': { const dd = Math.hypot(x - 7.5, y - 7.5); if ((dd | 0) % 3 === 0) c = mez(r.extra, d * 0.5); if (dd > 7) c = mez(r.extra, -10); break; }
      case 'vetas': if ((x + (ruido(0, y, 2) * 2 | 0)) % 4 === 0) c = mez(c, -24); break;
      case 'hojas': if (g < 0.16) a = 0; else if (g > 0.85) c = mez(c, 30); break;
      case 'grietas': if (Math.abs(x - y - 2) < 1 || Math.abs(x + y - 18) < 1) c = mez(c, 40); break;
      case 'mineral': if (ruido(x >> 1, y >> 1, 9) < 0.22 && x > 1 && y > 1 && x < 14 && y < 14) c = mez(r.extra, d * 0.4 + (r.brillo ? 20 : 0)); break;
      case 'ladrillo': { const fila = y >> 2, off = (fila & 1) * 4; if (y % 4 === 3 || (x + off) % 8 === 7) c = mez(r.extra, d * 0.3); break; }
      case 'marco': if (x === 0 || y === 0 || x === 15 || y === 15) { c = [235, 245, 250]; a = 230; } else if (x === y || x === y + 1) { a = 120; } break;
      case 'tablas': if (y % 4 === 3) c = mez(c, -30); else if (((x + (y >> 2) * 5) % 9) === 0) c = mez(c, -18); if (r.extra && (x === 0 || x === 15)) c = r.extra; break;
      case 'escalera': a = (x === 2 || x === 13 || y % 4 === 1) ? 255 : 0; break;
      case 'cofre': if (y === 5 || y === 6) c = mez(r.extra, -40); if (x >= 6 && x <= 9 && y >= 4 && y <= 8) c = r.extra; if (y % 5 === 0) c = mez(c, -25); break;
      case 'antorcha': if (x >= 7 && x <= 8 && y >= 6) c = mez(r.base, d); else if (x >= 6 && x <= 9 && y >= 2 && y < 6) c = y < 4 ? [255, 230, 120] : [255, 150, 40]; else a = 0; break;
      case 'flor': { const tallo = x === 8 && y > 7, petalo = Math.hypot(x - 8, y - 5) < 3.2; if (petalo) c = Math.hypot(x - 8, y - 5) < 1.2 ? [250, 220, 70] : [[230, 80, 120], [130, 120, 240], [250, 250, 250]][n % 3]; else if (tallo || (y === 11 && (x === 7 || x === 9))) c = r.base; else a = 0; break; }
      case 'hierba': a = (y > 4 + ((x * 7) % 5) && ruido(x, 0, 4) > 0.25) ? 255 : 0; break;
      case 'cactus': if (x === 0 || x === 15) c = mez(c, -40); else if ((x === 4 || x === 11) && y % 3 === 0) c = [230, 230, 200]; break;
      case 'musgo': if (ruido(x >> 1, y >> 1, 6) < 0.4) c = mez(r.extra, d * 0.6); break;
      case 'abedul': if (ruido(x >> 2, y, 7) < 0.12) c = r.extra; break;
      case 'estratos': if (y % 5 === 0) c = mez(c, -20); break;
      case 'tallada': if (x === 0 || y === 0) c = mez(c, 22); else if (x === 15 || y === 15) c = mez(c, -26); else if (y === 7) c = mez(c, -14); break;
      case 'lampara': { const dd = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5)); c = dd > 6.5 ? [120, 110, 90] : mez(r.base, 30 - dd * 6); break; }
      case 'rejilla': if (x % 5 === 0 || y % 5 === 0) c = r.extra; break;
      case 'horno': if (y >= 8 && y <= 12 && x >= 4 && x <= 11) c = y > 10 ? [240, 150, 50] : [30, 28, 30]; else if (y % 4 === 0) c = mez(c, -18); break;
      case 'bandera': if (x < 2) c = [110, 80, 50]; else if (y > 10 || x > 13) a = 0; else if (y === 5) c = [250, 230, 120]; break;
      default: break;
    }
    px(x, y, c, a);
  }
}
// Devuelve { lienzo, indice: { nombre: i } }. lienzo: <canvas> o OffscreenCanvas de 256×256.
export function crearAtlas(documento = globalThis.document) {
  const W = LADO * TEJAS, datos = new Uint8ClampedArray(W * W * 4), indice = {};
  LOSETAS.forEach((n, i) => { indice[n] = i; pintar(n, datos, (i % TEJAS) * LADO, ((i / TEJAS) | 0) * LADO, i); });
  let lienzo = null;
  if (documento) { lienzo = documento.createElement('canvas'); lienzo.width = lienzo.height = W; lienzo.getContext('2d').putImageData(new ImageData(datos, W, W), 0, 0); }
  return { lienzo, datos, indice, W };
}
// icono de un bloque para el HUD (data URL de 16×16 de su cara lateral)
export function iconoDe(atlas, loseta, doc = globalThis.document) {
  const c = doc.createElement('canvas'); c.width = c.height = 16; c.getContext('2d').drawImage(atlas.lienzo, (loseta % TEJAS) * LADO, ((loseta / TEJAS) | 0) * LADO, 16, 16, 0, 0, 16, 16); return c.toDataURL();
}
export const _R = R;
