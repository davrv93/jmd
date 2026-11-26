// Forja · voxel · estructuras deterministas que cruzan chunks. El mundo se parte en REGIONES (una rejilla grande por
// tipo de estructura); cada región tiene a lo sumo una estructura, en una posición y con una forma que salen del hash
// (semilla, región). Al generar un chunk se miran solo las regiones cuyo radio lo toca y se estampan los bloques que
// caen dentro. Así una aldea que ocupa 9 chunks sale igual cargue el chunk que cargue primero.
// Las piezas son PLANTILLAS DECLARATIVAS en texto (una capa por altura, una letra por bloque), más dos generadores
// paramétricos (torre cilíndrica y templo escalonado) y una mazmorra en laberinto (DFS con azar determinista).
// Wave Function Collapse no se usa: para estas piezas no aporta nada medible sobre plantillas + laberinto (ver DECISIONES).
import { ID } from './bloques.js';
import { hash2, derivar } from '../nucleo/semilla.js';

const LEYENDA = { M: 'madera', T: 'tablas', V: 'vidrio', L: 'ladrillos', C: 'cofre', A: 'antorcha', E: 'escalera', S: 'tallada', K: 'musgosa', G: 'grava', W: 'mesa', O: 'horno', Q: 'lana', B: 'bandera', X: 'lampara', P: 'piedra', R: 'arenisca', N: 'nieve', '.': 'aire' };
export const PLANTILLAS = {
  casa: { capas: [
    ['MTTTM', 'TTTTT', 'TTTTT', 'TTTTT', 'MTTTM'],
    ['MTTTM', 'T..WT', 'T...T', 'T..CT', 'MT.TM'],
    ['MTVTM', 'T...T', 'V...V', 'T.A.T', 'MT.TM'],
    ['MTTTM', 'T...T', 'T...T', 'T...T', 'MTTTM'],
    ['LLLLL', 'LTTTL', 'LTTTL', 'LTTTL', 'LLLLL'],
    ['.....', '.LLL.', '.LXL.', '.LLL.', '.....'] ], puerta: [2, 4] },
  casa_grande: { capas: [
    ['MTTTTTM', 'TTTTTTT', 'TTTTTTT', 'TTTTTTT', 'MTTTTTM'],
    ['MTTTTTM', 'TW...OT', 'T.....T', 'TQ...CT', 'MTT.TTM'],
    ['MTVTVTM', 'T.....T', 'V.....V', 'T..A..T', 'MTT.TTM'],
    ['MTTTTTM', 'T.....T', 'T.....T', 'T.....T', 'MTTTTTM'],
    ['LLLLLLL', 'LTTTTTL', 'LTTTTTL', 'LTTTTTL', 'LLLLLLL'],
    ['.......', '.LLLLL.', '.LLXLL.', '.LLLLL.', '.......'] ], puerta: [3, 4] },
  pozo: { capas: [['SSS', 'S.S', 'SSS'], ['S.S', '...', 'S.S'], ['M.M', '...', 'M.M'], ['TTT', 'TXT', 'TTT']], agua: [1, 1] },
  campamento: { capas: [
    ['.......', '.QQQ...', '.Q.Q.A.', '.QQQ...', '....C..'],
    ['.......', '.QQQ...', '.Q.Q...', '.QQQ...', '.......'],
    ['.......', '..Q....', '..Q....', '..Q....', '.......'] ] },
  santuario: { capas: [['SSSSS', 'SKSKS', 'SSXSS', 'SKSKS', 'SSSSS'], ['S...S', '.....', '..C..', '.....', 'S...S'], ['S...S', '.....', '.....', '.....', 'S...S'], ['SSSSS', 'S...S', 'S.X.S', 'S...S', 'SSSSS']] },
};

// Tipos: rejilla de regiones, radio máximo (para saber qué chunks toca), probabilidad base y biomas que la aceptan.
export const TIPOS = {
  aldea:      { rejilla: 176, radio: 26, prob: 0.55 },
  ruina:      { rejilla: 96,  radio: 8,  prob: 0.55 },
  mazmorra:   { rejilla: 128, radio: 20, prob: 0.45 },
  torre:      { rejilla: 128, radio: 5,  prob: 0.45 },
  templo:     { rejilla: 192, radio: 10, prob: 0.5 },
  campamento: { rejilla: 88,  radio: 5,  prob: 0.45 },
};

export function crearEstructuras({ semilla, H = 128, mar = 48, columna, opciones = {} }) {
  const cache = new Map(), MAXC = 96;
  const factor = (t) => opciones[t] ?? 1;
  // Candidata de una región: posición y existencia (sin construirla todavía)
  function candidata(tipo, rx, rz) {
    const T = TIPOS[tipo], s = derivar(semilla, 'estr:' + tipo), h = hash2(s, rx, rz);
    const margen = T.radio + 4, x = rx * T.rejilla + margen + (h % (T.rejilla - 2 * margen)), z = rz * T.rejilla + margen + ((h >>> 12) % (T.rejilla - 2 * margen));
    const c = columna(x, z), bioma = c.bioma;
    const mult = bioma.estructuras?.[tipo] ?? (tipo === 'mazmorra' ? 0.6 : 0.25);
    const p = T.prob * mult * factor(tipo);
    if (((h >>> 20) & 1023) / 1024 >= p) return null;
    if (tipo !== 'mazmorra' && c.h <= mar) return null;   // nada sobre el agua (los puentes salen de los caminos)
    return { tipo, rx, rz, x, z, y: c.h + 1, h, bioma: bioma.id, clave: `${tipo}:${rx}:${rz}` };
  }
  function construir(c) {
    if (cache.has(c.clave)) { const v = cache.get(c.clave); cache.delete(c.clave); cache.set(c.clave, v); return v; }
    const out = { ...c, bloques: [], marcadores: [] };
    CONSTRUCTORES[c.tipo](out, { columna, mar, H, semilla, opciones });
    cache.set(c.clave, out); if (cache.size > MAXC) cache.delete(cache.keys().next().value);
    return out;
  }
  return {
    candidata, construir,
    // estructuras que tocan el chunk (cx, cz), en orden fijo (tipo, región) → el resultado no depende del orden de carga
    enChunk(cx, cz) {
      const lista = [], x0 = cx * 16, z0 = cz * 16;
      for (const tipo of Object.keys(TIPOS)) {
        if (factor(tipo) <= 0) continue;
        const T = TIPOS[tipo];
        for (let rx = Math.floor((x0 - T.radio - T.rejilla) / T.rejilla); rx <= Math.floor((x0 + 16 + T.radio) / T.rejilla); rx++)
          for (let rz = Math.floor((z0 - T.radio - T.rejilla) / T.rejilla); rz <= Math.floor((z0 + 16 + T.radio) / T.rejilla); rz++) {
            const c = candidata(tipo, rx, rz); if (!c) continue;
            if (c.x + T.radio < x0 || c.x - T.radio > x0 + 15 || c.z + T.radio < z0 || c.z - T.radio > z0 + 15) continue;
            lista.push(construir(c));
          }
      }
      return lista;
    },
    cerca(x, z, radio) {   // para misiones, mapa y brújula
      const out = [];
      for (const tipo of Object.keys(TIPOS)) {
        if (factor(tipo) <= 0) continue;
        const T = TIPOS[tipo];
        for (let rx = Math.floor((x - radio) / T.rejilla); rx <= Math.floor((x + radio) / T.rejilla); rx++) for (let rz = Math.floor((z - radio) / T.rejilla); rz <= Math.floor((z + radio) / T.rejilla); rz++) {
          const c = candidata(tipo, rx, rz); if (c && Math.hypot(c.x - x, c.z - z) <= radio) out.push(c);
        }
      }
      return out.sort((a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z));
    },
  };
}

// piedras sueltas y matas alrededor de una ruina (sobre el terreno, sin tapar la entrada)
function escombros(o, columna, azar, cx, cz, radio, n) {
  for (let k = 0; k < n; k++) {
    const a = azar() * 6.283, r = radio * (0.6 + azar() * 0.6), x = Math.round(cx + Math.cos(a) * r), z = Math.round(cz + Math.sin(a) * r), h = columna(x, z).h;
    pon(o, x, h + 1, z, azar() < 0.6 ? 'musgosa' : 'tallada'); if (azar() < 0.3) pon(o, x, h + 2, z, 'musgosa');
    const hx = x + (azar() < 0.5 ? 1 : -1); pon(o, hx, columna(hx, z).h + 1, z, azar() < 0.5 ? 'helecho' : 'hierba');
  }
}
// columnata: plataforma de 11×11, 8 columnas en anillo con alturas rotas, un arco al norte, un altar con farol y el cofre
function columnata(o, columna, azar, y) {
  const R = 5;
  cimiento(o, o.x - R, o.z - R, 2 * R + 1, 2 * R + 1, y, 6, columna, 'piedra');
  for (let dx = -R; dx <= R; dx++) for (let dz = -R; dz <= R; dz++) {
    const d = Math.hypot(dx, dz); if (d > R + 0.3) continue;
    const t = azar();
    pon(o, o.x + dx, y, o.z + dz, t < 0.12 ? 'grava' : t < 0.5 ? 'musgosa' : 'tallada');
    if (d < R - 0.5 && t > 0.93) pon(o, o.x + dx, y + 1, o.z + dz, azar() < 0.5 ? 'hierba' : 'flor_azul');
  }
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * 6.283 + 0.2, px = Math.round(o.x + Math.cos(a) * 4), pz = Math.round(o.z + Math.sin(a) * 4);
    if (Math.abs(pz - (o.z - R + 1)) <= 1 && Math.abs(px - o.x) <= 2) continue;   // el arco ocupa ese lado
    const alto = 1 + (azar() * 5 | 0);
    for (let dy = 1; dy <= alto; dy++) pon(o, px, y + dy, pz, dy === alto && azar() < 0.5 ? 'musgosa' : 'tallada');
    if (alto <= 2) {   // columna caída: sus piezas quedan tendidas al lado
      const dir = azar() < 0.5 ? [1, 0] : [0, 1];
      for (let j = 1; j <= 2; j++) pon(o, px + dir[0] * j, y + 1, pz + dir[1] * j, 'tallada');
    } else if (azar() < 0.6) for (let dy = 1; dy < alto; dy++) if (azar() < 0.6) pon(o, px + (azar() < 0.5 ? 1 : -1), y + dy, pz, 'enredadera');
  }
  // arco: dos columnas de 5 y un dintel con piezas que faltan
  const az = o.z - R + 1;
  for (const px of [o.x - 2, o.x + 2]) for (let dy = 1; dy <= 5; dy++) pon(o, px, y + dy, az, 'tallada');
  for (let dx = -2; dx <= 2; dx++) if (Math.abs(dx) === 2 || azar() < 0.75) pon(o, o.x + dx, y + 6, az, dx === 0 ? 'musgosa' : 'tallada');
  for (let dy = 2; dy <= 4; dy++) pon(o, o.x - 3, y + dy, az, 'enredadera');
  // altar con farol encendido (se ve de noche) y el cofre delante
  for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) pon(o, o.x + dx, y + 1, o.z + dz, 'tallada');
  pon(o, o.x, y + 2, o.z, 'lampara');
  pon(o, o.x, y + 1, o.z + 2, 'cofre');
  escombros(o, columna, azar, o.x, o.z, R + 3, 8);
  o.marcadores.push({ tipo: 'cofre', x: o.x, y: y + 1, z: o.z + 2, botin: 'ruina' }, { tipo: 'ruina', x: o.x, y: y + 1, z: o.z + 2 });
}
// ---------------------------------------------------------------- constructores
function azarDe(h) { let r = h >>> 0 || 1; return () => { r ^= r << 13; r ^= r >>> 17; r ^= r << 5; return (r >>> 0) / 4294967296; }; }
const pon = (o, x, y, z, clave) => o.bloques.push([x, y, z, typeof clave === 'number' ? clave : ID[clave]]);
// estampa una plantilla de texto con su esquina en (x, y, z); rot 0..3 gira 90°; deterioro: prob. de faltar
function estampar(o, nombre, x, y, z, rot = 0, deterioro = 0, azar = null, sustituir = null) {
  const P = PLANTILLAS[nombre], filas = P.capas[0].length, cols = P.capas[0][0].length;
  P.capas.forEach((capa, dy) => capa.forEach((fila, fz) => [...fila].forEach((ch, fx) => {
    if (ch === ' ') return;
    let k = LEYENDA[ch]; if (!k) return;
    if (deterioro && k !== 'aire' && azar() < deterioro * (1 + dy * 0.25)) k = dy === 0 ? 'musgosa' : 'aire';
    if (sustituir && sustituir[k]) k = sustituir[k];
    let ax = fx, az = fz;
    if (rot === 1) [ax, az] = [filas - 1 - fz, fx]; else if (rot === 2) [ax, az] = [cols - 1 - fx, filas - 1 - fz]; else if (rot === 3) [ax, az] = [fz, cols - 1 - fx];
    pon(o, x + ax, y + dy, z + az, k);
  })));
  return { ancho: rot & 1 ? filas : cols, fondo: rot & 1 ? cols : filas };
}
// cimiento: rellena desde el terreno hasta el piso y despeja encima (la estructura no flota ni queda enterrada)
function cimiento(o, x0, z0, ancho, fondo, y, alto, columna, material = 'piedra') {
  for (let x = x0; x < x0 + ancho; x++) for (let z = z0; z < z0 + fondo; z++) {
    const h = columna(x, z).h;
    for (let yy = Math.min(h, y - 1); yy < y; yy++) pon(o, x, yy, z, material);
    for (let yy = y; yy < y + alto + 2; yy++) pon(o, x, yy, z, 'aire');
  }
}
// camino de grava sobre el terreno; si cruza agua, puente de tablas con barandas de troncos
function camino(o, xa, za, xb, zb, columna, mar, conPuentes = true) {
  const n = Math.max(Math.abs(xb - xa), Math.abs(zb - za));
  for (let i = 0; i <= n; i++) {
    const x = Math.round(xa + ((xb - xa) * i) / n), z = Math.round(za + ((zb - za) * i) / n), h = columna(x, z).h;
    for (const [dx, dz] of [[0, 0], [1, 0], [0, 1]]) {
      const hh = columna(x + dx, z + dz).h;
      if (hh < mar) { if (conPuentes) { pon(o, x + dx, mar + 1, z + dz, 'tablas'); o.puente = true; } }
      else { pon(o, x + dx, hh, z + dz, (Math.imul(x + dx, 73856093) ^ Math.imul(z + dz, 19349663)) % 7 === 0 ? 'grava' : 'sendero'); pon(o, x + dx, hh + 1, z + dz, 'aire'); pon(o, x + dx, hh + 2, z + dz, 'aire'); }
    }
    if (h < mar && conPuentes && i % 4 === 0) { pon(o, x - 1, mar + 2, z - 1, 'madera'); pon(o, x + 2, mar + 2, z + 2, 'madera'); }
  }
}
const CONSTRUCTORES = {
  aldea(o, { columna, mar, opciones }) {
    const azar = azarDe(o.h), y = o.y;
    cimiento(o, o.x - 1, o.z - 1, 3, 3, y, 4, columna); estampar(o, 'pozo', o.x - 1, y, o.z - 1); pon(o, o.x, y, o.z, 'agua');
    const n = 4 + (azar() * 4 | 0);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 6.283 + azar() * 0.5, r = 10 + azar() * 12, x = Math.round(o.x + Math.cos(a) * r), z = Math.round(o.z + Math.sin(a) * r);
      const c = columna(x, z); if (c.h <= mar) continue;
      const nombre = azar() < 0.35 ? 'casa_grande' : 'casa', P = PLANTILLAS[nombre], ancho = P.capas[0][0].length, fondo = P.capas[0].length;
      cimiento(o, x, z, ancho, fondo, c.h + 1, P.capas.length, columna, 'piedra');
      estampar(o, nombre, x, c.h + 1, z);
      o.marcadores.push({ tipo: 'casa', x: x + 2, y: c.h + 2, z: z + 2 });
      if ((opciones.caminos ?? 1) > 0) camino(o, o.x, o.z, x + P.puerta[0], z + fondo, columna, mar, (opciones.puentes ?? 1) > 0);
    }
    o.marcadores.push({ tipo: 'mercader', x: o.x + 2, y: y + 1, z: o.z + 2 }, { tipo: 'aldeano', x: o.x - 3, y: y + 1, z: o.z + 1 });
  },
  // Ruinas: una casa o un santuario derruidos, o una COLUMNATA (plataforma, columnas rotas, un arco y un altar con
  // farol). Alrededor, piedras sueltas y enredaderas: se ven desde lejos y de noche brillan un poco.
  ruina(o, { columna }) {
    const azar = azarDe(o.h), y = o.y - 1, tirada = azar();
    if (tirada < 0.45) { columnata(o, columna, azar, y); return; }
    const nombre = tirada < 0.72 ? 'casa' : 'santuario', P = PLANTILLAS[nombre];
    const ancho = P.capas[0][0].length, fondo = P.capas[0].length;
    cimiento(o, o.x, o.z, ancho, fondo, y, 2, columna, 'musgosa');
    estampar(o, nombre, o.x, y, o.z, (o.h >>> 3) & 3, 0.4, azar, { tablas: 'tallada', madera: 'musgosa', ladrillos: 'musgosa', vidrio: 'aire', lana: 'aire' });
    escombros(o, columna, azar, o.x + 2, o.z + 2, 6, 7);
    for (let k = 0; k < 5; k++) { const lado = k & 3, t = 1 + (azar() * 3 | 0), px = lado === 0 ? o.x - 1 : lado === 1 ? o.x + ancho : o.x + t, pz = lado === 2 ? o.z - 1 : lado === 3 ? o.z + fondo : o.z + t; for (let dy = 1 + (azar() * 2 | 0); dy <= 3; dy++) pon(o, px, y + dy, pz, 'enredadera'); }
    pon(o, o.x + 2, y + 1, o.z + 2, 'cofre'); o.marcadores.push({ tipo: 'cofre', x: o.x + 2, y: y + 1, z: o.z + 2, botin: 'ruina' }, { tipo: 'ruina', x: o.x + 2, y: y + 1, z: o.z + 2 });
  },
  campamento(o, { columna }) {
    cimiento(o, o.x - 3, o.z - 2, 7, 5, o.y, 3, columna, 'tierra'); estampar(o, 'campamento', o.x - 3, o.y, o.z - 2, (o.h >>> 5) & 3);
    o.marcadores.push({ tipo: 'cofre', x: o.x, y: o.y, z: o.z, botin: 'campamento' }, { tipo: 'cartografa', x: o.x + 1, y: o.y, z: o.z + 1 });
  },
  torre(o, { columna }) {
    const azar = azarDe(o.h), alto = 12 + (azar() * 8 | 0), y = o.y, R = 3;
    cimiento(o, o.x - R, o.z - R, 2 * R + 1, 2 * R + 1, y, alto + 2, columna, 'tallada');
    for (let yy = 0; yy <= alto; yy++) for (let dx = -R; dx <= R; dx++) for (let dz = -R; dz <= R; dz++) {
      const d = Math.hypot(dx, dz); if (d > R + 0.4) continue;
      const borde = d > R - 0.6;
      if (yy === 0 || (yy % 6 === 0 && !borde && !(dx === 0 && dz === 0))) pon(o, o.x + dx, y + yy, o.z + dz, 'tablas');
      else if (borde) pon(o, o.x + dx, y + yy, o.z + dz, yy % 5 === 3 && (dx === 0 || dz === 0) ? 'vidrio' : (azar() < 0.15 ? 'musgosa' : 'tallada'));
      else pon(o, o.x + dx, y + yy, o.z + dz, 'aire');
    }
    for (let yy = 1; yy <= alto; yy++) pon(o, o.x, y + yy, o.z - R + 1, 'escalera');   // escalera de mano por dentro
    for (let dx = -R; dx <= R; dx++) for (let dz = -R; dz <= R; dz++) if (Math.hypot(dx, dz) <= R + 0.4 && Math.hypot(dx, dz) > R - 0.6 && ((dx + dz) & 1)) pon(o, o.x + dx, y + alto + 1, o.z + dz, 'tallada');
    pon(o, o.x, y + 1, o.z - R, 'aire'); pon(o, o.x, y + 2, o.z - R, 'aire');   // puerta
    pon(o, o.x + 1, y + alto + 1, o.z, 'cofre'); pon(o, o.x - 1, y + alto + 1, o.z, 'antorcha'); pon(o, o.x, y + alto + 2, o.z + 1, 'bandera');
    o.marcadores.push({ tipo: 'cofre', x: o.x + 1, y: y + alto + 1, z: o.z, botin: 'torre' }, { tipo: 'torre', x: o.x, y: y + alto + 1, z: o.z });
  },
  templo(o, { columna }) {
    const azar = azarDe(o.h), niveles = 4 + (azar() * 3 | 0), desierto = o.bioma === 'desierto' || o.bioma === 'meseta' || o.bioma === 'canon';
    const piedra = desierto ? 'arenisca' : 'tallada', y = o.y, R = niveles * 2 + 1;
    cimiento(o, o.x - R, o.z - R, 2 * R + 1, 2 * R + 1, y, niveles * 2 + 4, columna, piedra);
    for (let n = 0; n < niveles; n++) { const r = R - n * 2; for (let dy = 0; dy < 2; dy++) for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) pon(o, o.x + dx, y + n * 2 + dy, o.z + dz, !desierto && azar() < 0.2 ? 'musgosa' : piedra); }
    // cámara interior y pasillo de entrada
    for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) for (let dy = 1; dy <= 3; dy++) pon(o, o.x + dx, y + dy, o.z + dz, 'aire');
    for (let dz = 3; dz <= R; dz++) for (let dy = 1; dy <= 2; dy++) pon(o, o.x, y + dy, o.z + dz, 'aire');
    pon(o, o.x, y + 1, o.z - 1, 'cofre'); pon(o, o.x - 2, y + 2, o.z - 2, 'lampara'); pon(o, o.x + 2, y + 2, o.z - 2, 'lampara'); pon(o, o.x, y + 1, o.z + 1, 'cristal');
    o.marcadores.push({ tipo: 'cofre', x: o.x, y: y + 1, z: o.z - 1, botin: 'templo' }, { tipo: 'templo', x: o.x, y: y + 1, z: o.z });
  },
  // Mazmorra: rejilla de 4×4 salas bajo tierra unidas por un laberinto (DFS determinista). Sala final con el guardián.
  mazmorra(o, { columna }) {
    const azar = azarDe(o.h), N = 4, S = 7, y0 = Math.max(10, Math.min(o.y - 22, 34)), x0 = o.x - (N * S) / 2 | 0, z0 = o.z - (N * S) / 2 | 0;
    const visit = new Uint8Array(N * N), abiertos = new Set(), pila = [0]; visit[0] = 1;
    while (pila.length) {
      const c = pila[pila.length - 1], cx = c % N, cz = (c / N) | 0, vec = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([a, b]) => [cx + a, cz + b]).filter(([a, b]) => a >= 0 && b >= 0 && a < N && b < N && !visit[b * N + a]);
      if (!vec.length) { pila.pop(); continue; }
      const [a, b] = vec[(azar() * vec.length) | 0], n = b * N + a; visit[n] = 1; abiertos.add(Math.min(c, n) + ':' + Math.max(c, n)); pila.push(n);
    }
    for (let x = 0; x < N * S + 1; x++) for (let z = 0; z < N * S + 1; z++) for (let dy = 0; dy <= 5; dy++) {
      const enMuro = x % S === 0 || z % S === 0, techo = dy === 5, piso = dy === 0;
      pon(o, x0 + x, y0 + dy, z0 + z, piso || techo || enMuro ? (azar() < 0.3 ? 'musgosa' : 'tallada') : 'aire');
    }
    for (const k of abiertos) {   // puertas entre salas conectadas
      const [a, b] = k.split(':').map(Number), ax = a % N, az = (a / N) | 0, bx = b % N, bz = (b / N) | 0;
      const px = bx !== ax ? Math.max(ax, bx) * S : ax * S + 3, pz = bz !== az ? Math.max(az, bz) * S : az * S + 3;
      for (let dy = 1; dy <= 2; dy++) pon(o, x0 + px, y0 + dy, z0 + pz, 'aire');
    }
    for (let i = 0; i < N * N; i++) { const x = x0 + (i % N) * S + 3, z = z0 + ((i / N) | 0) * S + 3; pon(o, x, y0 + 4, z, 'lampara'); if (i && azar() < 0.4) { pon(o, x + 1, y0 + 1, z + 1, 'cofre'); o.marcadores.push({ tipo: 'cofre', x: x + 1, y: y0 + 1, z: z + 1, botin: 'mazmorra' }); } else if (i) o.marcadores.push({ tipo: 'golem', x, y: y0 + 1, z }); }
    const fin = N * N - 1, fx = x0 + (fin % N) * S + 3, fz = z0 + ((fin / N) | 0) * S + 3;
    pon(o, fx, y0 + 1, fz - 2, 'cofre'); o.marcadores.push({ tipo: 'guardian', x: fx, y: y0 + 1, z: fz }, { tipo: 'cofre', x: fx, y: y0 + 1, z: fz - 2, botin: 'jefe' }, { tipo: 'mazmorra', x: fx, y: y0 + 1, z: fz });
    // pozo de entrada con escalera de mano desde la superficie, y un arco de piedra arriba
    const ex = x0 + 3, ez = z0 + 3, hs = columna(ex, ez).h;
    for (let yy = y0 + 1; yy <= hs + 2; yy++) { pon(o, ex, yy, ez, 'aire'); pon(o, ex, yy, ez - 1, yy > y0 + 5 ? 'tallada' : 'aire'); pon(o, ex + 1, yy, ez, 'aire'); pon(o, ex - 1, yy, ez, 'escalera'); }
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) for (let dy = 1; dy <= 3; dy++) pon(o, ex + dx * 2, hs + dy, ez + dz * 2, 'tallada');
    for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) pon(o, ex + dx, hs + 4, ez + dz, Math.abs(dx) === 2 || Math.abs(dz) === 2 ? 'tallada' : 'aire');
    pon(o, ex + 2, hs + 5, ez + 2, 'antorcha');
    o.marcadores.push({ tipo: 'entrada', x: ex, y: hs + 1, z: ez });
    o.y = y0 + 1; o.entrada = [ex, hs + 1, ez];
  },
};
