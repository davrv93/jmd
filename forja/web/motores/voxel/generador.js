// Forja · voxel · Procedural Generation Engine. FUNCIÓN PURA de (semilla, opciones, x, y, z): no guarda el mundo,
// lo recalcula. Por eso descargar y regenerar un chunk da exactamente lo mismo, el orden de exploración no importa
// y las coordenadas negativas funcionan (todo pasa por Math.floor y hashes de enteros con signo).
//
// Tubería por columna (x, z):
//   1. domain warping de las coordenadas (costas y valles orgánicos)
//   2. mapas de muy baja frecuencia: continentalidad, erosión, temperatura, humedad y «rareza» (mesetas, cañones,
//      archipiélagos) → la ALTURA se calcula de estas variables continuas (sin saltos en las fronteras de bioma)
//   3. montañas: ridged noise ponderado por continentalidad alta y erosión baja; colinas: fBm de frecuencia media;
//      detalle: simplex de alta frecuencia
//   4. bioma: el más cercano en (temperatura, humedad) con reglas de geografía, con borde difuso (ruido fino)
// Por bloque: densidad 3D en las montañas (salientes), cuevas (túneles «espagueti» = dos ruidos 3D cerca de cero,
// cavernas = fBm 3D alto, muestreadas en una red de 4×4×4 e interpoladas), lagos subterráneos, lava profunda,
// minerales por profundidad y bioma, y luego árboles (L-systems) y estructuras (regiones deterministas).
import { crearRuido, voronoi2, suave } from '../nucleo/ruido.js';
import { derivar, hash2, hash3 } from '../nucleo/semilla.js';
import { ID } from './bloques.js';
import { BIOMAS, BIOMA_ID } from './biomas.js';
import { arbol, roca, RADIO_MAX } from './arboles.js';
import { crearEstructuras } from './estructuras.js';

export const VERSION_GENERADOR = 4;   // 4: prados de flores, helechos, arbustos, rocas, más especies de árbol, senderos y ruinas con columnas
export const CHUNK = 16;
export const OPCIONES_BASE = {
  altura: 128, mar: 48, relieve: 1, montanas: 1, oceanos: 1, lagos: 1, cuevas: 1, cavernas: 1, minerales: 1, vegetacion: 1, flores: 1,
  temperatura: 0, humedad: 0, escala: 1, biomas: null, estructuras: {}, lava: 1, entradasCuevas: 1, rios: 1,
};
const lerp = (a, b, t) => a + (b - a) * t;
const tramo = (x, pts) => { if (x <= pts[0][0]) return pts[0][1]; for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) return lerp(pts[i - 1][1], pts[i][1], (x - pts[i - 1][0]) / (pts[i][0] - pts[i - 1][0])); return pts[pts.length - 1][1]; };

export function crearGenerador(semilla, opciones = {}) {
  const o = { ...OPCIONES_BASE, ...opciones }, H = o.altura, MAR = o.mar, E = 1 / (o.escala || 1);
  const nCont = crearRuido(derivar(semilla, 'continentes')), nEro = crearRuido(derivar(semilla, 'erosion')), nClima = crearRuido(derivar(semilla, 'clima'));
  const nRel = crearRuido(derivar(semilla, 'relieve')), nCue = crearRuido(derivar(semilla, 'cuevas')), nLag = crearRuido(derivar(semilla, 'lagos'));
  const sMin = derivar(semilla, 'minerales'), sVeg = derivar(semilla, 'vegetacion'), sIsla = derivar(semilla, 'islas'), sLecho = derivar(semilla, 'lecho');
  const permitidos = Array.isArray(o.biomas) && o.biomas.length ? new Set(o.biomas) : null;

  // ---------------------------------------------------------------- columna: altura y bioma (pura, memorizable)
  const memo = new Map();
  function columna(x, z) {
    const k = x * 73856093 ^ z * 19349663;
    let c = memo.get(k); if (c && c.x === x && c.z === z) return c;
    c = calcular(x, z); if (memo.size > 8192) memo.clear(); memo.set(k, c); return c;
  }
  function calcular(x, z) {
    const xs = x * E, zs = z * E;
    const [wx, wz] = nCont.warp2(xs, zs, 38, 0.0028);
    const cont = nCont.fbm2(wx * 0.0011, wz * 0.0011, { octavas: 5 }) * 1.7 + (o.oceanos < 1 ? (1 - o.oceanos) * 0.5 : -(o.oceanos - 1) * 0.35);
    const ero = nEro.fbm2(xs * 0.0021 + 100, zs * 0.0021, { octavas: 3 }) * 1.6;
    const rareza = nRel.fbm2(xs * 0.0017 + 900, zs * 0.0017 - 400, { octavas: 3 }) * 1.6;
    let h = tramo(cont, [[-0.6, MAR - 30], [-0.3, MAR - 14], [-0.12, MAR - 5], [-0.04, MAR + 1], [0.3, MAR + 9], [1, MAR + 22]]);
    // montañas: crestas donde el continente es alto y la erosión baja
    const wMont = suave(0.02, 0.45, cont) * suave(0.25, -0.35, ero) * o.montanas;
    if (wMont > 0.001) h += wMont * Math.pow(nRel.ridged2(wx * 0.0042, wz * 0.0042, { octavas: 5 }), 1.6) * 78 * o.relieve;
    const tierra = suave(-0.1, 0.15, cont);
    h += nRel.fbm2(xs * 0.011, zs * 0.011, { octavas: 4 }) * 7 * tierra * o.relieve + nRel.s2(xs * 0.07, zs * 0.07) * 1.2;
    // clima: la temperatura baja con la altura; un ruido fino deshilacha las fronteras entre biomas
    let temp = nClima.fbm2(xs * 0.0009 + 300, zs * 0.0009, { octavas: 3 }) * 1.9 + o.temperatura - Math.max(0, h - MAR - 28) * 0.012 + nClima.s2(xs * 0.13, zs * 0.13) * 0.035;
    let hum = nClima.fbm2(xs * 0.0011 - 200, zs * 0.0011 + 50, { octavas: 3 }) * 1.9 + o.humedad + nClima.s2(xs * 0.13 + 40, zs * 0.13) * 0.035;
    let especial = null, wEsp = 0;
    // mesetas: terrazas escalonadas; cañones: mesa alta con cauces tallados
    if (rareza > 0.26 && cont > 0.05 && temp > 0.05) { wEsp = suave(0.26, 0.48, rareza) * suave(0.05, 0.2, cont) * suave(0.05, 0.2, temp); const t = MAR + 22 + Math.floor((nRel.fbm2(xs * 0.006, zs * 0.006) + 1) * 3) * 4; h = lerp(h, Math.max(h, t), wEsp); especial = 'meseta'; }
    else if (rareza < -0.26 && cont > 0.05 && temp > 0.2 && hum < 0.1) {
      wEsp = suave(-0.26, -0.48, rareza) * suave(0.05, 0.2, cont) * suave(0.2, 0.35, temp) * suave(0.1, -0.05, hum); const cauce = Math.abs(nRel.s2(xs * 0.011 + 7, zs * 0.011 - 3)), mesa = MAR + 20;
      h = lerp(h, lerp(mesa, MAR + 1, suave(0.09, 0.03, cauce)), wEsp); especial = 'canon';
    }
    // archipiélago: islas de Voronoi en el mar abierto
    if (cont < -0.08 && rareza > 0.2) { const v = voronoi2(sIsla, xs / 44, zs / 44, 0.8); if (v.f1 < 0.5) { const isla = MAR + 1 + (0.3 - v.f1) * 22 + nRel.s2(xs * 0.05, zs * 0.05) * 1.5; if (isla > h) { h = lerp(h, isla, suave(0.5, 0.12, v.f1) * suave(0.2, 0.32, rareza)); } especial = 'archipielago'; } }
    // lagos tierra adentro (y ríos: cauces finos de ruido)
    if (o.lagos > 0 && cont > 0 && wMont < 0.3 && especial !== 'canon') { const l = nLag.fbm2(xs * 0.006 + 77, zs * 0.006, { octavas: 2 }); const u = 0.48 - 0.12 * (o.lagos - 1); if (l > u) h = lerp(h, MAR - 3 - (l - u) * 20, suave(u, u + 0.06, l)); }
    if (o.rios > 0 && cont > -0.02 && wMont < 0.5 && especial !== 'canon') { const r = Math.abs(nLag.s2(xs * 0.0024 - 31, zs * 0.0024 + 12)); if (r < 0.035 * o.rios) h = lerp(h, MAR - 2, suave(0.035 * o.rios, 0.012 * o.rios, r)); }
    h = Math.max(4, Math.min(H - 12, Math.round(h)));
    let id = elegirBioma(h, temp, hum, cont, wMont, especial, wEsp);
    if (permitidos && !permitidos.has(id)) id = sustituto(id, h, temp, hum);
    return { x, z, h, bioma: BIOMAS[BIOMA_ID[id]], biomaId: BIOMA_ID[id], temp, hum, cont, ero, montana: wMont, rareza };
  }
  function elegirBioma(h, t, hu, cont, wMont, especial, wEsp) {
    if (especial === 'archipielago') return h <= MAR ? 'oceano' : 'archipielago';
    if (h < MAR - 1) return 'oceano';
    if (h <= MAR + 1 && t > -0.3 && cont < 0.25) return 'playa';
    if (wMont > 0.35 && h > MAR + 30) return 'montana';
    if (especial && wEsp > 0.5) return especial;
    if (t < -0.4) return hu > 0.05 ? 'bosque_nevado' : 'tundra';
    if (t < -0.12) return 'taiga';
    if (t > 0.4) return hu < -0.15 ? 'desierto' : hu > 0.25 ? 'selva' : 'sabana';
    if (hu > 0.4 && h < MAR + 6) return 'pantano';
    return hu > 0.02 ? 'bosque' : 'pradera';
  }
  function sustituto(id, h, t, hu) {
    const agua = id === 'oceano';
    let mejor = null, d0 = 1e9;
    for (const b of BIOMAS) { if (!permitidos.has(b.id) || (b.id === 'oceano') !== agua) continue; const d = (b.temperatura - (t + 1) / 2) ** 2 + (b.humedad - (hu + 1) / 2) ** 2; if (d < d0) { d0 = d; mejor = b.id; } }
    return mejor || [...permitidos][0];
  }

  const estructuras = crearEstructuras({ semilla, H, mar: MAR, columna, opciones: o.estructuras || {} });

  // ---------------------------------------------------------------- cuevas: red de 4×4×4 interpolada (trilineal)
  const RED = 4;
  function redCuevas(x0, z0) {
    const nx = CHUNK / RED + 1, ny = Math.ceil(H / RED) + 1, tun = new Float32Array(nx * nx * ny), cav = new Float32Array(nx * nx * ny);
    for (let i = 0; i < nx; i++) for (let k = 0; k < nx; k++) for (let j = 0; j < ny; j++) {
      const x = (x0 + i * RED) * E, y = j * RED, z = (z0 + k * RED) * E, n = (j * nx + k) * nx + i;
      const a = nCue.s3(x * 0.028, y * 0.042, z * 0.028), b = nCue.s3(x * 0.028 + 61, y * 0.042 - 17, z * 0.028 + 9);
      tun[n] = a * a + b * b;
      cav[n] = nCue.fbm3(x * 0.014 - 300, y * 0.024, z * 0.014, { octavas: 2 });
    }
    const muestra = (arr, lx, y, lz) => {
      const fx = lx / RED, fy = y / RED, fz = lz / RED, i = Math.min(nx - 2, fx | 0), j = Math.min(ny - 2, fy | 0), k = Math.min(nx - 2, fz | 0), u = fx - i, v = fy - j, w = fz - k;
      const at = (a, b, c) => arr[((j + b) * nx + (k + c)) * nx + (i + a)];
      return lerp(lerp(lerp(at(0, 0, 0), at(1, 0, 0), u), lerp(at(0, 0, 1), at(1, 0, 1), u), w), lerp(lerp(at(0, 1, 0), at(1, 1, 0), u), lerp(at(0, 1, 1), at(1, 1, 1), u), w), v);
    };
    return { tunel: (lx, y, lz) => muestra(tun, lx, y, lz), caverna: (lx, y, lz) => muestra(cav, lx, y, lz) };
  }

  // ---------------------------------------------------------------- chunk
  const idx = (x, y, z) => x + z * CHUNK + y * 256;
  const MIN = [ // mineral, y máx, prob por grupo 2×2×2, semilla
    ['carbon', MAR + 40, 0.011], ['hierro', MAR - 4, 0.0065], ['oro', 26, 0.0026], ['cristal', 16, 0.0016],
  ].map(([k, ymax, p], i) => ({ id: ID[k], k, ymax, p, s: derivar(sMin, k + i) }));

  function generarChunk(cx, cz) {
    const b = new Uint8Array(CHUNK * CHUNK * H), x0 = cx * CHUNK, z0 = cz * CHUNK;
    const alturas = new Int16Array(256), biomas = new Uint8Array(256), cols = [];
    const cue = o.cuevas > 0 || o.cavernas > 0 ? redCuevas(x0, z0) : null;
    const umbralTunel = 0.0105 * o.cuevas, umbralCav = 0.62 - 0.08 * (o.cavernas - 1);
    for (let lz = 0; lz < CHUNK; lz++) for (let lx = 0; lx < CHUNK; lx++) {
      const x = x0 + lx, z = z0 + lz, c = columna(x, z), bi = c.bioma, s = bi.superficie; cols.push(c);
      let h = c.h; alturas[lx + lz * 16] = h; biomas[lx + lz * 16] = c.biomaId;
      // relleno base
      b[idx(lx, 0, lz)] = ID.lecho;
      for (let y = 1; y <= 3; y++) if ((hash3(sLecho, x, y, z) & 3) < 4 - y) b[idx(lx, y, lz)] = ID.lecho;
      for (let y = 1; y <= h; y++) if (!b[idx(lx, y, lz)]) b[idx(lx, y, lz)] = ID.piedra;
      // densidad 3D: salientes y arcos en las montañas
      if (c.montana > 0.3) for (let y = h - 10; y <= h + 10; y++) {
        if (y < 4 || y >= H - 1) continue;
        const d = (h - y) / 9 + nRel.s3(x * 0.055 * E, y * 0.06, z * 0.055 * E) * 0.75 * c.montana;
        b[idx(lx, y, lz)] = d > 0 ? ID.piedra : 0;
      }
      let top = h; while (top < H - 2 && b[idx(lx, top + 1, lz)]) top++; while (top > 1 && !b[idx(lx, top, lz)]) top--;
      // superficie según bioma (y estratos en el cañón)
      const prof = 3 + (hash2(sVeg, x, z) & 1);
      for (let y = top; y > top - prof && y > 3; y--) {
        if (b[idx(lx, y, lz)] !== ID.piedra) continue;
        let id;
        if (y === top) id = top <= MAR ? ID[s.bajoAgua || s.relleno] : bi.id === 'montana' && top > MAR + 52 ? ID[s.cumbre] : (top <= MAR + 1 && bi.id !== 'pantano' && c.temp > -0.3 ? ID.arena : ID[s.arriba]);
        else id = ID[s.relleno];
        if (s.estratos) id = [ID.arcilla, ID.arcilla_clara, ID.arenisca, ID.arcilla][(y >> 2) & 3];
        b[idx(lx, y, lz)] = id;
      }
      if (s.estratos) for (let y = top - prof; y > MAR - 6; y--) if (b[idx(lx, y, lz)] === ID.piedra) b[idx(lx, y, lz)] = [ID.arcilla, ID.arcilla_clara, ID.arenisca, ID.arcilla][(y >> 2) & 3];
      // agua hasta el nivel del mar (hielo arriba si hace frío)
      for (let y = top + 1; y <= MAR; y++) b[idx(lx, y, lz)] = y === MAR && c.temp < -0.38 ? ID.hielo : ID.agua;
      alturas[lx + lz * 16] = top;
      // cuevas: no perforan la superficie salvo en «entradas» (raras); bajo el agua tampoco
      if (cue) {
        const entrada = o.entradasCuevas > 0 && nCue.s2(x * 0.018 * E + 1000, z * 0.018 * E) > 0.78 - 0.08 * (o.entradasCuevas - 1);
        const techo = top <= MAR ? top - 6 : entrada ? top + 1 : top - 4;
        const lago = nLag.s2(x * 0.012 - 500, z * 0.012 + 200) > 0.25;
        for (let y = 4; y < techo; y++) {
          const i = idx(lx, y, lz), v = b[i]; if (!v || v === ID.agua || v === ID.lecho) continue;
          const t = o.cuevas > 0 ? cue.tunel(lx, y, lz) : 1, cv = o.cavernas > 0 && y < MAR - 6 ? cue.caverna(lx, y, lz) : -1;
          if (t < umbralTunel || cv > umbralCav) b[i] = y <= 7 && o.lava > 0 ? ID.lava : (lago && y <= 20 ? ID.agua : 0);
        }
      }
      // minerales: grupos de 2×2×2 por hash, según profundidad y bioma
      for (const m of MIN) {
        const mult = (bi.recursos?.[m.k] ?? 1) * o.minerales; if (mult <= 0) continue;
        for (let y = 4; y < Math.min(m.ymax, top - 2); y++) {
          const i = idx(lx, y, lz); if (b[i] !== ID.piedra) continue;
          if (hash3(m.s, x >> 1, y >> 1, z >> 1) / 4294967296 < m.p * mult && (hash3(m.s ^ 0x55, x, y, z) & 7) < 5) b[i] = m.id;
        }
      }
    }
    // vegetación de un bloque (flores, hierba, helechos, arbustos, cactus) dentro del chunk. Las flores crecen en PRADOS
    // (manchas de ruido de baja frecuencia) y cada prado es casi de un solo color: cantuta, campanilla o amancay.
    for (let lz = 0; lz < CHUNK; lz++) for (let lx = 0; lx < CHUNK; lx++) {
      const c = cols[lx + lz * 16], v = c.bioma.vegetacion, top = alturas[lx + lz * 16], suelo = b[idx(lx, top, lz)];
      if (top + 3 >= H || top < MAR || b[idx(lx, top + 1, lz)]) continue;
      const r = hash2(sVeg ^ 0x1234, c.x, c.z) / 4294967296, r2 = hash2(sVeg ^ 0x4321, c.x, c.z);
      if (v.cactus && suelo === ID.arena && r < v.cactus * o.vegetacion) { const alto = 1 + (hash2(sVeg, c.x, c.z + 7) % 3); for (let y = 1; y <= alto; y++) b[idx(lx, top + y, lz)] = ID.cactus; continue; }
      if (suelo !== ID.cesped && suelo !== ID.pasto_seco && suelo !== ID.nevado && suelo !== ID.barro) continue;
      const prado = nRel.s2(c.x * 0.045 * E + 300, c.z * 0.045 * E), pf = (v.flores || 0) * o.flores * (prado > 0.35 ? 5 : prado > 0.1 ? 1.2 : 0.25);
      const pa = pf + (v.arbustos || 0) * o.vegetacion, ph = pa + (v.hierba || 0) * Math.min(1.5, o.vegetacion);
      if (r < pf) { const t = nRel.s2(c.x * 0.02 * E - 77, c.z * 0.02 * E + 31) + ((r2 & 255) / 255 - 0.5) * 0.5; b[idx(lx, top + 1, lz)] = t < -0.22 ? ID.flor_azul : t > 0.28 ? ID.flor_amarilla : ID.flor; }
      else if (r < pa && suelo !== ID.nevado) { b[idx(lx, top + 1, lz)] = ID.arbusto; if ((r2 & 7) < 2 && top + 2 < H) b[idx(lx, top + 2, lz)] = ID.arbusto; }
      else if (r < ph) b[idx(lx, top + 1, lz)] = v.helechos && ((r2 >>> 8) & 255) / 256 < v.helechos ? ID.helecho : ID.hierba;
    }
    // rocas: cantos rodados medio enterrados (raíz en el chunk o en un margen de 3: cruzan bordes sin depender del orden)
    if (o.vegetacion > 0) for (let z = z0 - 3; z < z0 + CHUNK + 3; z++) for (let x = x0 - 3; x < x0 + CHUNK + 3; x++) {
      const c = columna(x, z), v = c.bioma.vegetacion; if (!v.rocas) continue;
      const hh = hash2(sVeg ^ 0x5151, x, z); if (hh / 4294967296 >= v.rocas * Math.min(1.5, o.vegetacion) || c.h <= MAR) continue;
      for (const [dx, dy, dz, id] of roca(hh, v.roca || 'piedra')) {
        const lx = x + dx - x0, lz = z + dz - z0, y = c.h + 1 + dy;
        if (lx < 0 || lz < 0 || lx >= CHUNK || lz >= CHUNK || y >= H || y < 1) continue;
        const i = idx(lx, y, lz), ya = b[i]; if (!ya || ya === ID.hierba || ya === ID.flor || ya === ID.helecho || ya === ID.flor_azul || ya === ID.flor_amarilla || dy < 0) b[i] = id;
      }
    }
    // árboles: raíces en el chunk y en un margen de RADIO_MAX (las copas cruzan bordes sin depender del orden)
    if (o.vegetacion > 0) for (let z = z0 - RADIO_MAX; z < z0 + CHUNK + RADIO_MAX; z++) for (let x = x0 - RADIO_MAX; x < x0 + CHUNK + RADIO_MAX; x++) {
      const hh = hash2(sVeg, x, z), c = columna(x, z), v = c.bioma.vegetacion;
      if (!v.arboles || hh / 4294967296 >= v.arboles * o.vegetacion || c.h <= MAR) continue;
      if (c.montana > 0.3 || (c.bioma.id === 'playa' && c.h > MAR + 2)) continue;
      let especie = v.mezcla && (hh & 7) < 3 ? v.mezcla : v.arbol;
      if (v.variantes) { let t = ((hh >>> 8) & 1023) / 1024; for (const [e, p] of v.variantes) { if (t < p) { especie = e; break; } t -= p; } }
      for (const [dx, dy, dz, id] of arbol(especie, hh, !!v.nevado)) {
        const lx = x + dx - x0, lz = z + dz - z0, y = c.h + 1 + dy;
        if (lx < 0 || lz < 0 || lx >= CHUNK || lz >= CHUNK || y >= H) continue;
        const i = idx(lx, y, lz), ya = b[i];
        if (id === ID.madera || id === ID.abedul) b[i] = id; else if (!ya || ya === ID.hierba || ya === ID.flor || ya === ID.helecho || ya === ID.flor_azul || ya === ID.flor_amarilla) b[i] = id;
      }
    }
    // estructuras (después de los árboles: mandan ellas)
    const marcadores = [];
    for (const e of estructuras.enChunk(cx, cz)) {
      for (const [x, y, z, id] of e.bloques) { const lx = x - x0, lz = z - z0; if (lx >= 0 && lz >= 0 && lx < CHUNK && lz < CHUNK && y > 0 && y < H) b[idx(lx, y, lz)] = id; }
      for (const m of e.marcadores) if (m.x >= x0 && m.z >= z0 && m.x < x0 + CHUNK && m.z < z0 + CHUNK) marcadores.push({ ...m, estructura: e.clave });
    }
    return { cx, cz, bloques: b, alturas, biomas, marcadores, version: VERSION_GENERADOR };
  }

  // ¿nace un árbol en (x, z)? (misma regla que generarChunk: sirve para aparecer en un claro y no contra un tronco)
  function arbolEn(x, z) {
    const c = columna(x, z), v = c.bioma.vegetacion;
    return !!v.arboles && hash2(sVeg, x, z) / 4294967296 < v.arboles * o.vegetacion && c.h > MAR && c.montana <= 0.3;
  }
  // bloque suelto sin chunk (pruebas, consultas puntuales): genera el chunk que lo contiene
  function bloqueEn(x, y, z) { const cx = Math.floor(x / 16), cz = Math.floor(z / 16); const c = generarChunk(cx, cz); return c.bloques[idx(x - cx * 16, y, z - cz * 16)]; }
  return { semilla, opciones: o, H, MAR, version: VERSION_GENERADOR, columna, generarChunk, bloqueEn, arbolEn, estructuras, idx };
}
