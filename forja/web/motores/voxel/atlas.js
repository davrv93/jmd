// Forja · voxel · atlas de texturas PROCEDURAL y original: cada loseta de 16×16 px se pinta con código (sin imágenes
// descargadas). El orden de las losetas lo da el registro de bloques (bloques.js), así el Worker sabe el índice sin
// ver el atlas. Atlas de 16×16 losetas = 256×256 px, filtrado NEAREST.
//
// DIRECCIÓN DE ARTE «diorama andino»: nada de ruido píxel a píxel. Cada material tiene una PALETA corta (3–5 tonos)
// y se pinta con manchas grandes de ruido periódico (la loseta se repite sin costura) cuantizadas a esa paleta, como
// pixel art hecho a mano. Motivos propios: piedra tallada de mampostería poligonal, adobe, tejido de lana a rayas y
// rombos, ichu dorado en el pasto seco, cantuta, campanilla y amancay en las flores, tronco claro de corteza moteada,
// copas de jacarandá.
//   · Los píxeles que el shader TIÑE con el clima (césped, hojas, hierba) llevan alfa 200 en `datos` (marca); el
//     lienzo de los iconos los guarda opacos.
//   · `medias`: color medio de cada loseta (el shader funde la textura con él a lo lejos: sin parpadeo de píxeles).
import { LOSETAS } from './bloques.js';
import { hash2 } from '../nucleo/semilla.js';

const R = (n, k) => (hash2(0x5eed + k, n % 16, (n / 16) | 0) / 4294967296);
export const MARCA_TINTE = 200;
// Recetas de respaldo (formato de datos para los bloques de plugins: base RGB, variación, patrón y extras)
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

// ---------------------------------------------------------------- utilidades de pintura
const hx = (s) => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return h >>> 0; };
const az = (k, x, y) => hash2(k, x, y) / 4294967296;
const cl = (v) => Math.max(0, Math.min(255, Math.round(v)));
const hexa = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const pal = (...h) => h.map(hexa);
const suav = (t) => t * t * (3 - 2 * t);
const mezclar = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const luz = (c, d) => [c[0] + d, c[1] + d, c[2] + d];
// ruido de valor PERIÓDICO en 16 px (la loseta se repite sin costura); celda = tamaño de la mancha en px
function vr(k, x, y, celda) {
  const n = 16 / celda, gx = (x + 0.5) / celda, gy = (y + 0.5) / celda, x0 = Math.floor(gx), y0 = Math.floor(gy), fx = suav(gx - x0), fy = suav(gy - y0);
  const v = (i, j) => az(k, ((i % n) + n) % n, ((j % n) + n) % n);
  return (v(x0, y0) * (1 - fx) + v(x0 + 1, y0) * fx) * (1 - fy) + (v(x0, y0 + 1) * (1 - fx) + v(x0 + 1, y0 + 1) * fx) * fy;
}
const fbm = (k, x, y) => vr(k, x, y, 8) * 0.5 + vr(k + 1, x, y, 4) * 0.33 + vr(k + 2, x, y, 2) * 0.17;
// Voronoi periódico (piedras, guijarros, grumos): devuelve distancia a la semilla más cercana, a la segunda y su id
function celdas(k, x, y, n = 4, jit = 0.85) {
  const c = 16 / n; let d1 = 1e9, d2 = 1e9, id = 0;
  const gx = Math.floor((x + 0.5) / c), gy = Math.floor((y + 0.5) / c);
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const ci = gx + i, cj = gy + j, wi = ((ci % n) + n) % n, wj = ((cj % n) + n) % n;
    const px = (ci + 0.5 + (az(k, wi, wj) - 0.5) * jit) * c, py = (cj + 0.5 + (az(k + 7, wi, wj) - 0.5) * jit) * c;
    const d = Math.hypot(x + 0.5 - px, y + 0.5 - py);
    if (d < d1) { d2 = d1; d1 = d; id = wi + wj * n; } else if (d < d2) d2 = d;
  }
  return { d1, d2, id, borde: d2 - d1 };
}
// paleta cuantizada: t ∈ [0,1] → uno de sus tonos (pixel art: tonos discretos, no degradado continuo)
const tono = (p, t) => p[Math.max(0, Math.min(p.length - 1, Math.floor(t * p.length)))];

// ---------------------------------------------------------------- pintores por loseta
// cada uno recibe (x, y, k) y devuelve [r, g, b, a] (a 255 = opaco, 0 = hueco, MARCA_TINTE = opaco y teñible)
const P = {};
const PT = { tierra: pal('#4d3224', '#5e3d2b', '#6f4a33', '#7f583c'), cesped: pal('#4c8b3f', '#5a9a46', '#69a84f', '#7bb85a', '#8ec66a'), piedra: pal('#5b616c', '#6a717c', '#79808b', '#888f99', '#9aa0a9'), arena: pal('#cdb183', '#d8bd8f', '#e2c99d', '#ead5ad') };
function tierraEn(x, y, k) {
  const t = fbm(k, x, y) * 0.85 + az(k + 9, x, y) * 0.15, cel = celdas(k + 3, x, y, 4, 0.9);
  let c = tono(PT.tierra, t);
  if (cel.d1 < 1.1 && az(k + 5, cel.id, 1) < 0.45) c = cel.d1 < 0.6 ? hexa('#a58a6c') : hexa('#8a6d52');   // guijarros
  return c;
}
P.tierra = (x, y, k) => [...tierraEn(x, y, k), 255];
function cespedEn(x, y, k) {
  // matas: trazos cortos inclinados más claros sobre una base con manchas grandes
  const t = fbm(k, x, y), mata = vr(k + 4, x * 1.0 + y * 0.6, y, 2);
  let c = tono(PT.cesped, t * 0.75 + 0.1);
  if (mata > 0.72) c = PT.cesped[Math.min(4, PT.cesped.indexOf(c) + 1)];
  if (mata < 0.18) c = PT.cesped[Math.max(0, PT.cesped.indexOf(c) - 1)];
  return c;
}
P.cesped = (x, y, k) => [...cespedEn(x, y, k), MARCA_TINTE];
// lado: tierra con una capa de césped gruesa y ondulada (borde redondeado con sombra debajo)
function lado(cap, capaFn, marca) {
  return (x, y, k) => {
    const borde = 3.6 + Math.sin((x + 0.5) * 0.9 + az(k, 0, 0) * 6) * 0.9 + vr(k + 2, x, 0, 4) * 1.6;
    if (y < borde) return [...capaFn(x, y, k), marca];
    if (y < borde + 1) return [...luz(tierraEn(x, y, k), -22), 255];
    return [...tierraEn(x, y, k), 255];
  };
}
P.cesped_lado = lado(4, cespedEn, MARCA_TINTE);
P.piedra = (x, y, k) => {
  // estratos ondulados + grietas finas + liquen escaso
  const band = vr(k, x, y * 2.2 + Math.sin(x * 0.4) * 1.5, 4), t = band * 0.6 + fbm(k + 3, x, y) * 0.4;
  let c = tono(PT.piedra, t);
  const g = celdas(k + 11, x, y, 3, 0.9);
  if (g.borde < 0.55 && az(k + 2, g.id, 3) < 0.7) c = luz(c, -20);
  else if (g.borde < 1.3 && (x + y) % 2 === 0) c = luz(c, 8);
  if (vr(k + 21, x, y, 2) > 0.86) c = hexa('#8f9a6e');
  return [...c, 255];
};
P.arena = (x, y, k) => {
  const ond = Math.sin((x * 0.55 + y * 1.1) + vr(k, x, y, 8) * 4) * 0.5 + 0.5, t = ond * 0.55 + fbm(k + 2, x, y) * 0.45;
  let c = tono(PT.arena, t);
  if (az(k + 5, x, y) > 0.965) c = hexa('#b59a70');
  return [...c, 255];
};
P.agua = (x, y, k) => { const o = vr(k, x + y * 0.5, y, 4) * 0.6 + vr(k + 1, x, y, 2) * 0.4; return [...mezclar(hexa('#2f6f8f'), hexa('#4c93ad'), o > 0.62 ? 1 : o > 0.45 ? 0.45 : 0), 150]; };
P.lava = (x, y, k) => {
  const cel = celdas(k, x, y, 4, 0.9), f = fbm(k + 3, x, y);
  let c = cel.borde < 1 ? hexa('#ffd27a') : tono(pal('#7d1d0c', '#b23a10', '#e0621a', '#f7922d'), f * 0.7 + (1 - Math.min(1, cel.d1 / 4)) * 0.4);
  return [...c, 255];
};
P.tronco = (x, y, k) => {
  // corteza: surcos verticales sinuosos y placas
  const surco = Math.abs(Math.sin((x + vr(k, x, y, 8) * 3) * 1.15)), t = fbm(k + 2, x, y);
  let c = tono(pal('#3f2a1d', '#4f3524', '#5f412c', '#6f4e35'), t * 0.7 + 0.15);
  if (surco < 0.28) c = hexa('#2e1f15'); else if (surco > 0.93) c = luz(c, 14);
  return [...c, 255];
};
P.tronco_corte = (x, y, k) => {
  const d = Math.hypot(x - 7.5, y - 7.5) + vr(k, x, y, 4) * 1.2;
  if (d > 7) return [...hexa('#4a3222'), 255];
  const anillo = (Math.floor(d * 0.9) % 2) === 0;
  return [...(anillo ? hexa('#b8884f') : hexa('#a5773f')), 255];
};
function copa(paleta, hueco, marca, k0 = 0) {
  return (x, y, k) => {
    // grumos de hojas: celdas con luz arriba a la izquierda y huecos entre ellas
    const cel = celdas(k + k0, x, y, 5, 0.9), n = fbm(k + 4, x, y);
    // huecos AGRUPADOS (no píxeles sueltos): a lo largo de algunos bordes entre grumos, donde un ruido grueso lo pide
    const zona = vr(k + 8, x, y, 4);
    if (cel.borde < 0.9 && zona < hueco) return [0, 0, 0, 0];
    if (cel.d1 > 2.9 && zona < hueco * 0.8) return [0, 0, 0, 0];
    const cx = Math.floor(cel.id % 5), cy = Math.floor(cel.id / 5);
    const dentro = 1 - Math.min(1, cel.d1 / 3);
    let t = dentro * 0.55 + n * 0.45;
    // luz arriba a la izquierda dentro del grumo
    const sx = (x + 0.5) - ((cx + 0.5) * 3.2), sy = (y + 0.5) - ((cy + 0.5) * 3.2);
    if (sx + sy < -1.2) t += 0.18; else if (sx + sy > 1.6) t -= 0.18;
    return [...tono(paleta, t), marca];
  };
}
P.hojas = copa(pal('#2c6233', '#36733a', '#438543', '#55984d', '#6aab5a'), 0.32, MARCA_TINTE);
P.pino = (x, y, k) => {
  // agujas: trazos diagonales cruzados, verde azulado oscuro
  const a = (x + y * 2 + Math.floor(vr(k, x, y, 4) * 3)) % 4, b = (x * 2 - y + 32 + Math.floor(vr(k + 1, x, y, 4) * 3)) % 5;
  if (a === 0 && b === 0) return [0, 0, 0, 0];
  if (az(k + 3, x, y) < 0.1) return [0, 0, 0, 0];
  const t = fbm(k + 5, x, y) * 0.7 + (a === 1 ? 0.25 : 0);
  return [...tono(pal('#234b3c', '#2d5e48', '#397054', '#488161'), t), 255];
};
P.nieve = (x, y, k) => { const t = fbm(k, x, y); let c = tono(pal('#d6e1ee', '#e4ecf5', '#eef3f9', '#f8fbfe'), t * 0.8 + 0.25); if (az(k + 3, x, y) > 0.975) c = [255, 255, 255]; return [...c, 255]; };
P.hielo = (x, y, k) => {
  const g = celdas(k, x, y, 3, 0.95), t = fbm(k + 2, x, y);
  let c = mezclar(hexa('#8fc3df'), hexa('#c4e6f5'), t);
  if (g.borde < 0.5) c = hexa('#e8f7ff'); if ((x - y + 16) % 11 === 0 && x > 2 && x < 13) c = luz(c, 22);
  return [...c, 195];
};
function mena(gema, borde, brillo = false) {
  return (x, y, k) => {
    const base = P.piedra(x, y, k + 100);
    const cel = celdas(k, x, y, 4, 0.7);
    if (cel.d1 < 1.7 && az(k + 3, cel.id, 0) < 0.55) {
      const sx = (x + 0.5) % 4 - 2, sy = (y + 0.5) % 4 - 2;
      let c = cel.d1 > 1.15 ? borde : gema;
      if (cel.d1 <= 1.15 && sx + sy < -0.4) c = luz(gema, brillo ? 70 : 45);
      return [...c, 255];
    }
    return base;
  };
}
P.carbon = mena(hexa('#2a2b31'), hexa('#3f4047'));
P.hierro = mena(hexa('#d39b7c'), hexa('#9a6a55'));
P.oro = mena(hexa('#f2c33a'), hexa('#a87b18'));
P.cristal = mena(hexa('#7ff0e8'), hexa('#7d58c9'), true);
P.ladrillos = (x, y, k) => {
  // adobe: bloques grandes de bordes redondeados, junta clara de barro
  const fila = y >> 2, off = (fila & 1) * 4, bx = (x + off) % 8, by = y % 4;
  const junta = by === 3 || bx === 7;
  if (junta) return [...luz(hexa('#c9b089'), (az(k, x, y) - 0.5) * 10), 255];
  const id = Math.floor((x + off) / 8) + fila * 3, t = az(k + 1, id, 0) * 0.5 + fbm(k + 2, x, y) * 0.5;
  let c = tono(pal('#9c5634', '#ab623c', '#ba7046', '#c77d50'), t);
  if (by === 0 || bx === 0) c = luz(c, 12); else if (by === 2 && bx === 6) c = luz(c, -12);
  return [...c, 255];
};
P.vidrio = (x, y, k) => {
  if (x === 0 || y === 0 || x === 15 || y === 15) return [...hexa('#d9e7ee'), 235];
  if (x === 1 || y === 1) return [...hexa('#f4fbff'), 160];
  if ((x + y === 9 || x + y === 10) && x > 2 && x < 9) return [255, 255, 255, 150];
  if (x + y === 20 && x > 8) return [255, 255, 255, 120];
  return [...hexa('#cfe8f2'), 55];
};
P.tablas = (x, y, k) => {
  const tabla = y >> 2, by = y % 4, corte = (x + tabla * 7) % 16 === 0;
  if (by === 3 || corte) return [...hexa('#5a3b22'), 255];
  const veta = vr(k + tabla, x, y * 4, 4) > 0.66, t = az(k + 1, tabla, 0) * 0.5 + fbm(k + 2, x, y) * 0.5;
  let c = tono(pal('#8c5f37', '#9a6b40', '#a8794a', '#b58654'), t);
  if (veta) c = luz(c, -14); if (by === 0) c = luz(c, 12);
  if ((x === 2 || x === 13) && by === 1 && (tabla & 1)) c = hexa('#3b3a3a');
  return [...c, 255];
};
P.escalera = (x, y, k) => {
  const larguero = x === 2 || x === 3 || x === 12 || x === 13, peldano = y % 5 === 2 && x > 3 && x < 12;
  if (!larguero && !peldano) return [0, 0, 0, 0];
  return [...(larguero ? (x === 2 || x === 12 ? hexa('#8a5d36') : hexa('#6f4a2b')) : (y % 5 === 2 ? hexa('#a5764a') : hexa('#7c5533'))), 255];
};
P.cofre_tapa = (x, y, k) => { const c = P.tablas(x, y, k); if (x < 2 || x > 13 || y < 2 || y > 13) return [...hexa('#4a3a2c'), 255]; return c; };
P.cofre = (x, y, k) => {
  if (y === 6 || y === 7) return [...hexa('#3b3530'), 255];
  if (x >= 6 && x <= 9 && y >= 5 && y <= 9) return [...(x === 6 || y === 5 ? hexa('#f6dc7a') : hexa('#d5a93a')), 255];
  if (x === 0 || x === 15 || y === 0 || y === 15) return [...hexa('#4a3a2c'), 255];
  return P.tablas(x, (y + 1) % 16, k);
};
P.antorcha = (x, y, k) => {
  if (x >= 7 && x <= 8 && y >= 6) return [...(x === 7 ? hexa('#8a5d36') : hexa('#6b4528')), 255];
  const d = Math.hypot((x - 7.5) * 1.3, y - 4.2);
  if (y < 7 && d < 3.3) return [...(d < 1.4 ? hexa('#fff3c4') : d < 2.4 ? hexa('#ffc85a') : hexa('#ff8a2a')), 255];
  return [0, 0, 0, 0];
};
function flor(petalo, centro, forma) {
  return (x, y, k) => {
    // tallo con hojas (teñibles) y una o dos flores
    const tallo = (x === 8 && y > 7) || (x === 5 && y > 10), hoja = (y === 12 && (x === 9 || x === 10)) || (y === 13 && (x === 6 || x === 7)) || (y === 11 && x === 4);
    for (const [fx, fy, r] of [[8, 5, 3], [5, 9, 2]]) {
      const dx = x - fx, dy = y - fy;
      if (forma === 'campana' ? (dy >= -r && dy <= r * 0.7 && Math.abs(dx) <= (dy + r) * 0.45 + 0.6) : forma === 'tubo' ? (Math.abs(dx) <= 1 && dy >= -r && dy <= r * 0.8) || (dy === -r && Math.abs(dx) <= 2) : Math.hypot(dx, dy) < r + 0.3) {
        const c = Math.hypot(dx, dy) < 1 && forma !== 'tubo' ? centro : (dx + dy < 0 ? luz(petalo, 26) : petalo);
        return [...c, 255];
      }
    }
    if (tallo) return [...hexa('#4b8a3b'), 255];
    if (hoja) return [...hexa('#5d9e45'), 255];
    return [0, 0, 0, 0];
  };
}
P.flor = flor(hexa('#d8325a'), hexa('#ffd04a'), 'tubo');          // cantuta
P.flor_azul = flor(hexa('#5b6fd8'), hexa('#f1f1ff'), 'campana');  // campanilla
P.flor_amarilla = flor(hexa('#f5c22d'), hexa('#c4621c'), 'disco'); // amancay
P.hierba = (x, y, k) => {
  // matas finas que se abren en abanico desde la base
  for (let b = 0; b < 6; b++) {
    const bx = 2 + b * 2.4 + az(k, b, 0) * 1.5, alto = 6 + az(k, b, 1) * 8, incl = (az(k, b, 2) - 0.5) * 0.7;
    const yy = 15.5 - y; if (yy > alto) continue;
    if (Math.abs(x + 0.5 - (bx + incl * yy)) < (yy < alto - 2 ? 0.75 : 0.5)) return [...tono(PT.cesped, 0.3 + yy / alto * 0.7), MARCA_TINTE];
  }
  return [0, 0, 0, 0];
};
P.helecho = (x, y, k) => {
  // frondas arqueadas con foliolos
  for (const [x0, dir, largo] of [[8, -1, 7], [8, 1, 7], [8, 0.15, 9]]) {
    for (let t = 0; t < largo; t++) {
      const fx = x0 + dir * t * 0.9, fy = 15 - t * (dir === 0.15 ? 1.4 : 1.1) + (dir !== 0.15 ? t * t * 0.07 : 0);
      if (Math.abs(x + 0.5 - fx) < 0.6 && Math.abs(y + 0.5 - fy) < 0.7) return [...hexa('#3f7b35'), MARCA_TINTE];
      if (t > 1 && Math.abs(y + 0.5 - (fy - 0.8)) < 0.6 && Math.abs(x + 0.5 - fx) < 2.2 - t * 0.2 && (x + y + t) % 2 === 0) return [...hexa('#5a9a46'), MARCA_TINTE];
    }
  }
  return [0, 0, 0, 0];
};
P.arbusto = (x, y, k) => {
  const c = copa(pal('#2f6a35', '#3a7b3d', '#4b8f48', '#5ea255'), 0.18, MARCA_TINTE, 50)(x, y, k);
  const cel = celdas(k + 9, x, y, 4, 0.8);
  if (c[3] && cel.d1 < 0.9 && az(k + 4, cel.id, 0) < 0.4) return [...(cel.d1 < 0.45 ? hexa('#ff6a6a') : hexa('#c52638')), 255];   // bayas
  return c;
};
P.hojas_flor = copa(pal('#6d4fa8', '#7d5cbd', '#8f6ccc', '#a481d9', '#bb9ce6'), 0.3, 255, 20);   // jacarandá
P.hojas_oro = copa(pal('#a8641c', '#c47a22', '#d9922c', '#e7ab3e', '#f2c25a'), 0.3, 255, 30);
P.sendero = (x, y, k) => {
  const t = fbm(k, x, y), cel = celdas(k + 3, x, y, 4, 0.9);
  let c = tono(pal('#7d5f43', '#8a6b4d', '#977857', '#a38563'), t);
  if (cel.d1 < 1.2 && az(k + 1, cel.id, 0) < 0.5) c = cel.d1 < 0.7 ? hexa('#bfae95') : hexa('#9c8c78');
  return [...c, 255];
};
P.enredadera = (x, y, k) => {
  for (let h = 0; h < 3; h++) {
    const hx0 = 3 + h * 5 + az(k, h, 0) * 2, largo = 9 + az(k, h, 1) * 7, cx = hx0 + Math.sin(y * 0.7 + h) * 0.8;
    if (y > largo) continue;
    if (Math.abs(x + 0.5 - cx) < 0.55) return [...hexa('#3d6e2f'), MARCA_TINTE];
    if ((y + h) % 3 === 0 && Math.abs(x + 0.5 - cx - 1.3) < 1) return [...hexa('#5c9b45'), MARCA_TINTE];
    if ((y + h) % 3 === 1 && Math.abs(x + 0.5 - cx + 1.3) < 1) return [...hexa('#4f8d3e'), MARCA_TINTE];
  }
  return [0, 0, 0, 0];
};
P.cactus_arriba = (x, y, k) => { const d = Math.hypot(x - 7.5, y - 7.5); if (d > 7.2) return [...hexa('#3d7a3a'), 255]; return [...((Math.floor(Math.atan2(y - 7.5, x - 7.5) * 2.5 + 8) % 2) ? hexa('#5d9c4e') : hexa('#4e8b43')), 255]; };
P.cactus = (x, y, k) => {
  const costilla = x % 4;
  let c = costilla === 0 ? hexa('#3a7436') : costilla === 1 ? hexa('#6aa858') : hexa('#549448');
  if (costilla === 0 && y % 4 === 1) c = hexa('#f1ebc8');
  return [...c, 255];
};
P.musgosa = (x, y, k) => {
  const base = P.tallada(x, y, k + 40), m = vr(k, x, y, 4) * 0.6 + vr(k + 1, x, y, 2) * 0.4;
  if (m > 0.6 && base[0] > 70) return [...tono(pal('#3f6537', '#4a733d', '#577f44'), (m - 0.6) * 2.5), 255];
  return base;
};
P.grava = (x, y, k) => {
  const cel = celdas(k, x, y, 5, 0.95);
  if (cel.borde < 0.5) return [...hexa('#4c4743'), 255];
  const c = tono(pal('#6f6862', '#837b73', '#958d84', '#a49a8d', '#8a7f6e'), az(k + 1, cel.id, 0));
  return [...(cel.d1 < 0.9 ? luz(c, 14) : c), 255];
};
const estrato = (p) => (x, y, k) => { const t = fbm(k, x, y); let c = tono(p, t * 0.8 + 0.1); if (y % 5 === 0) c = luz(c, -14); return [...c, 255]; };
P.arcilla = estrato(pal('#9a4b2d', '#a85636', '#b5623f', '#c06f49'));
P.arcilla_clara = estrato(pal('#c58f66', '#d19c72', '#dba97f', '#e3b68e'));
P.arenisca = (x, y, k) => { const b = Math.floor((y + vr(k, x, y, 8) * 2) / 4); let c = tono(pal('#c9a56d', '#d4b17a', '#dcbd88', '#e4c995'), az(k + 2, b, 0) * 0.6 + fbm(k + 3, x, y) * 0.4); if ((y + 1) % 4 === 0) c = luz(c, -16); return [...c, 255]; };
P.lecho = (x, y, k) => { const cel = celdas(k, x, y, 3, 0.9); let c = tono(pal('#2b2c31', '#36373d', '#42434a', '#4f5058'), fbm(k + 1, x, y)); if (cel.borde < 0.6) c = hexa('#1d1e22'); return [...c, 255]; };
P.abedul = (x, y, k) => {
  // tronco claro de corteza moteada (placas crema, gris y salvia que se desprenden)
  const m = vr(k, x * 1.6, y * 0.6, 4) * 0.7 + vr(k + 1, x, y, 2) * 0.3;
  let c = m > 0.62 ? hexa('#9aa58a') : m > 0.42 ? hexa('#d9d3c2') : m > 0.28 ? hexa('#bdb8a9') : hexa('#e8e2d2');
  if (x === 0 || x === 15) c = luz(c, -24);
  return [...c, 255];
};
P.barro = (x, y, k) => { const t = fbm(k, x, y); let c = tono(pal('#3e3326', '#4a3d2d', '#574835', '#65543e'), t); if (vr(k + 4, x, y, 4) > 0.78) c = hexa('#7a7466'); return [...c, 255]; };
// ichu: pasto dorado de la puna, en trazos largos
function ichuEn(x, y, k) {
  const tr = vr(k, x * 0.5 + y * 0.9, y * 0.3, 2), t = fbm(k + 3, x, y);
  let c = tono(pal('#9c8a3e', '#ad9a48', '#bfaa55', '#cdb964', '#d9c774'), t * 0.6 + tr * 0.4);
  return c;
}
P.pasto_seco = (x, y, k) => [...ichuEn(x, y, k), 255];
P.pasto_seco_lado = lado(4, ichuEn, 255);
P.tallada = (x, y, k) => {
  // mampostería poligonal: piedras de varios lados, juntas finas y oscuras, bisel claro arriba a la izquierda
  const cel = celdas(k, x, y, 3, 0.95);
  if (cel.borde < 0.7) return [...hexa('#4a4d53'), 255];
  let c = tono(pal('#7d8088', '#888b93', '#93969d', '#9ea1a7'), az(k + 1, cel.id, 0) * 0.7 + fbm(k + 2, x, y) * 0.3);
  if (cel.borde < 1.5) { const vx = celdas(k, x - 1, y - 1, 3, 0.95).id === cel.id; c = luz(c, vx ? -10 : 14); }
  return [...c, 255];
};
P.nevado_lado = lado(4, (x, y, k) => tono(pal('#dfe8f2', '#eef3f9', '#f8fbfe'), fbm(k, x, y)), 255);
P.lampara = (x, y, k) => {
  const marco = x === 0 || y === 0 || x === 15 || y === 15 || ((x === 7 || x === 8) && (y < 2 || y > 13));
  if (marco) return [...hexa('#3a3530'), 255];
  if (x === 1 || y === 1 || x === 14 || y === 14) return [...hexa('#6b5a40'), 255];
  const d = Math.hypot(x - 7.5, y - 7.5);
  return [...mezclar(hexa('#fff6d8'), hexa('#ffb54a'), Math.min(1, d / 7)), 255];
};
P.mesa_arriba = (x, y, k) => { const c = P.tablas(x, y, k); if (x === 0 || y === 0 || x === 15 || y === 15) return [...hexa('#4a3222'), 255]; if ((x === 4 || x === 11) && y > 3 && y < 12) return [...hexa('#7b7f88'), 255]; return c; };
P.mesa = (x, y, k) => { if (y < 3) return [...hexa('#a8794a'), 255]; if (y === 3) return [...hexa('#4a3222'), 255]; if ((x === 1 || x === 2 || x === 13 || x === 14)) return [...hexa('#6f4a2b'), 255]; if (y > 5 && y < 9 && x > 4 && x < 11) return [...hexa('#7b7f88'), 255]; return [...hexa('#5a3b22'), 255]; };
P.horno = (x, y, k) => {
  if (y >= 8 && y <= 13 && x >= 4 && x <= 11) { if (y === 8 || x === 4 || x === 11) return [...hexa('#2a2a2e'), 255]; return [...(y > 11 ? hexa('#ff9a3a') : y > 10 ? hexa('#c4521c') : hexa('#1b1a1d')), 255]; }
  return P.tallada(x, y, k + 60);
};
P.lana = (x, y, k) => {
  // tejido andino: franjas y rombos escalonados en rojo, amarillo, azul y crema
  const f = y % 8, dx = Math.abs((x % 8) - 3.5), rombo = Math.abs(f - 3.5) + dx;
  let c;
  if (f === 0 || f === 7) c = hexa('#b8323a'); else if (rombo < 2.2) c = hexa('#f0b73a'); else if (rombo < 3.4) c = hexa('#2f5fa8'); else c = hexa('#efe5d2');
  if ((x + y) % 2 === 0) c = luz(c, -8);
  return [...c, 255];
};
P.bandera = (x, y, k) => {
  if (x < 2) return [...(x === 0 ? hexa('#8a5d36') : hexa('#6b4528')), 255];
  if (y > 12 - (x % 3 === 0 ? 1 : 0) || x > 14) return [0, 0, 0, 0];
  const cx = Math.abs(x - 8.5), cy = Math.abs(y - 6), esc = Math.max(cx, cy) < 2.5 || (cx < 1 && cy < 4.5) || (cy < 1 && cx < 4.5);
  let c = esc ? hexa('#f3c64a') : hexa('#b8323a'); if (y === 1 || y === 11) c = hexa('#2f5fa8');
  return [...c, 255];
};

function pintar(nombre, img, ox, oy, n) {
  const W = LADO * TEJAS, f = P[nombre];
  if (!f) return pintarReceta(nombre, img, ox, oy, n);
  const k = hx(nombre);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const c = f(x, y, k), i = ((oy + y) * W + ox + x) * 4;
    img[i] = cl(c[0]); img[i + 1] = cl(c[1]); img[i + 2] = cl(c[2]); img[i + 3] = c[3];
  }
}
function pintarReceta(nombre, img, ox, oy, n) {
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
// Devuelve { lienzo, datos, medias, indice: { nombre: i } }. lienzo: <canvas> de 256×256 (iconos, sin marcas de tinte).
// medias: Uint8ClampedArray 16×16×4, el color medio de cada loseta (para fundir a lo lejos)
export function crearAtlas(documento = globalThis.document) {
  const W = LADO * TEJAS, datos = new Uint8ClampedArray(W * W * 4), indice = {}, medias = new Uint8ClampedArray(TEJAS * TEJAS * 4);
  LOSETAS.forEach((n, i) => { indice[n] = i; pintar(n, datos, (i % TEJAS) * LADO, ((i / TEJAS) | 0) * LADO, i); });
  for (let i = 0; i < TEJAS * TEJAS; i++) {
    const tx = (i % TEJAS) * LADO, ty = ((i / TEJAS) | 0) * LADO; let r = 0, g = 0, b = 0, a = 0, n = 0;
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const j = ((ty + y) * W + tx + x) * 4; if (datos[j + 3] > 40) { r += datos[j]; g += datos[j + 1]; b += datos[j + 2]; a += datos[j + 3]; n++; } }
    if (n) { medias[i * 4] = r / n; medias[i * 4 + 1] = g / n; medias[i * 4 + 2] = b / n; medias[i * 4 + 3] = 255; }
  }
  let lienzo = null;
  if (documento) {
    const vista = new Uint8ClampedArray(datos); for (let j = 3; j < vista.length; j += 4) if (vista[j] === MARCA_TINTE) vista[j] = 255;
    lienzo = documento.createElement('canvas'); lienzo.width = lienzo.height = W; lienzo.getContext('2d').putImageData(new ImageData(vista, W, W), 0, 0);
  }
  return { lienzo, datos, medias, indice, W };
}
// icono de un bloque para el HUD (data URL de 16×16 de su cara lateral)
export function iconoDe(atlas, loseta, doc = globalThis.document) {
  const c = doc.createElement('canvas'); c.width = c.height = 16; c.getContext('2d').drawImage(atlas.lienzo, (loseta % TEJAS) * LADO, ((loseta / TEJAS) | 0) * LADO, 16, 16, 0, 0, 16, 16); return c.toDataURL();
}
export const _R = R;
