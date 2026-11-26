// Forja · voxel · World Persistence con almacenamiento DELTA. Nunca se guardan los bloques generados: solo la semilla,
// la versión del generador, el jugador, el inventario, las entidades persistentes, el estado de la partida y los
// bloques que cambiaron (con su valor original, para poder deshacer). Los deltas van en binario y comprimidos:
//   por chunk: cx int32 · cz int32 · n uint32 · n × (índice uint16 · id uint8 · original uint8)
//   compresión: deflate-raw (CompressionStream del navegador o de Node) y, si no existe, RLE propio
// Las partidas se guardan en IndexedDB; se exportan e importan como archivo .json (todo texto, seguro de compartir).
// FORMATO sube cuando cambia el formato; migrar() trae partidas viejas al formato actual.
import { VERSION_GENERADOR } from './generador.js';

export const FORMATO = 2;
const DESCONOCIDO = 255;

export function codificarDeltas(deltas) {   // deltas: { "cx,cz": [[i, id, orig], …] }
  const entradas = Object.entries(deltas || {}).filter(([, l]) => l.length);
  let n = 4; for (const [, l] of entradas) n += 12 + l.length * 4;
  const dv = new DataView(new ArrayBuffer(n)); let p = 0;
  dv.setUint32(p, entradas.length, true); p += 4;
  for (const [k, l] of entradas) {
    const [cx, cz] = k.split(',').map(Number); dv.setInt32(p, cx, true); dv.setInt32(p + 4, cz, true); dv.setUint32(p + 8, l.length, true); p += 12;
    for (const [i, id, orig] of l) { dv.setUint16(p, i, true); dv.setUint8(p + 2, id); dv.setUint8(p + 3, orig ?? DESCONOCIDO); p += 4; }
  }
  return new Uint8Array(dv.buffer);
}
export function decodificarDeltas(bytes) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), o = {}; let p = 0;
  const nc = dv.getUint32(p, true); p += 4;
  for (let c = 0; c < nc; c++) {
    const cx = dv.getInt32(p, true), cz = dv.getInt32(p + 4, true), n = dv.getUint32(p + 8, true); p += 12; const l = [];
    for (let j = 0; j < n; j++) { l.push([dv.getUint16(p, true), dv.getUint8(p + 2), dv.getUint8(p + 3)]); p += 4; }
    o[cx + ',' + cz] = l;
  }
  return o;
}
// RLE de bytes: [cuenta, byte]… (cuenta 1..255)
export function rle(b) { const out = []; for (let i = 0; i < b.length;) { let j = i; while (j < b.length && b[j] === b[i] && j - i < 255) j++; out.push(j - i, b[i]); i = j; } return new Uint8Array(out); }
export function unrle(b) { let n = 0; for (let i = 0; i < b.length; i += 2) n += b[i]; const o = new Uint8Array(n); let p = 0; for (let i = 0; i < b.length; i += 2) { o.fill(b[i + 1], p, p + b[i]); p += b[i]; } return o; }
async function flujo(bytes, Tipo, modo) { const s = new Blob([bytes]).stream().pipeThrough(new Tipo(modo)); return new Uint8Array(await new Response(s).arrayBuffer()); }
export async function comprimir(bytes) {
  if (typeof CompressionStream !== 'undefined') { const z = await flujo(bytes, CompressionStream, 'deflate-raw'); return concat([2], z); }
  return concat([1], rle(bytes));
}
export async function descomprimir(b) {
  const tipo = b[0], datos = b.subarray(1);
  if (tipo === 0) return datos.slice();
  if (tipo === 1) return unrle(datos);
  if (tipo === 2) { if (typeof DecompressionStream === 'undefined') throw new Error('este navegador no puede leer esta partida (deflate)'); return flujo(datos, DecompressionStream, 'deflate-raw'); }
  throw new Error('compresión desconocida');
}
const concat = (cab, b) => { const o = new Uint8Array(cab.length + b.length); o.set(cab); o.set(b, cab.length); return o; };
const b64 = (u8) => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000)); return btoa(s); };
const deb64 = (t) => { const s = atob(t), o = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) o[i] = s.charCodeAt(i); return o; };

// partida → objeto serializable (texto). estado: { semilla, semillaTexto, plantilla, jugador, inventario, entidades, juego }
export async function serializar(estado, deltas) {
  const bin = await comprimir(codificarDeltas(deltas));
  return { formato: FORMATO, generador: VERSION_GENERADOR, guardado: new Date().toISOString(), ...estado, deltas: b64(bin), cambios: Object.values(deltas || {}).reduce((s, l) => s + l.length, 0) };
}
export async function deserializar(obj) {
  const o = migrar(obj);
  const deltas = o.deltas ? decodificarDeltas(await descomprimir(deb64(o.deltas))) : {};
  return { ...o, deltas, avisoVersion: o.generador !== VERSION_GENERADOR ? `La partida se creó con el generador v${o.generador}; este es v${VERSION_GENERADOR}: el terreno nuevo puede verse distinto, tus cambios se conservan.` : null };
}
// migraciones de formato: 1 → 2 (deltas en JSON plano sin valor original)
export function migrar(obj) {
  if (!obj || typeof obj !== 'object') throw new Error('partida inválida');
  let o = { ...obj };
  if (!o.formato || o.formato === 1) {
    const d = {}; for (const [k, l] of Object.entries(o.bloques || o.deltas || {})) d[k] = l.map(([i, id]) => [i, id, DESCONOCIDO]);
    const bin = codificarDeltas(d), crudo = concat([0], bin);
    o = { ...o, formato: 2, generador: o.generador ?? 1, deltas: b64(crudo) }; delete o.bloques;
  }
  if (o.formato > FORMATO) throw new Error('partida de una versión más nueva de Forja');
  return o;
}

// ---------------------------------------------------------------- almacenes
export function almacenMemoria() { const m = new Map(); return { async poner(k, v) { m.set(k, structuredClone(v)); }, async leer(k) { return m.has(k) ? structuredClone(m.get(k)) : null; }, async borrar(k) { m.delete(k); }, async listar() { return [...m.keys()]; } }; }
export function almacenIDB(nombre = 'forja-voxel') {
  if (typeof indexedDB === 'undefined') return almacenMemoria();
  let db = null;
  const abrir = () => db || (db = new Promise((ok, mal) => { const r = indexedDB.open(nombre, 1); r.onupgradeneeded = () => r.result.createObjectStore('mundos'); r.onsuccess = () => ok(r.result); r.onerror = () => mal(r.error); }));
  const tx = async (modo, f) => { const d = await abrir(); return new Promise((ok, mal) => { const t = d.transaction('mundos', modo), s = t.objectStore('mundos'), r = f(s); t.oncomplete = () => ok(r?.result); t.onerror = () => mal(t.error); }); };
  return { poner: (k, v) => tx('readwrite', (s) => s.put(v, k)), leer: async (k) => (await tx('readonly', (s) => s.get(k))) ?? null, borrar: (k) => tx('readwrite', (s) => s.delete(k)), listar: async () => (await tx('readonly', (s) => s.getAllKeys())) || [] };
}
export async function guardarPartida(almacen, nombre, estado, deltas) { const o = await serializar(estado, deltas); await almacen.poner(nombre, o); return o; }
export async function cargarPartida(almacen, nombre) { const o = await almacen.leer(nombre); return o ? deserializar(o) : null; }
export function exportarArchivo(obj) { return new Blob([JSON.stringify(obj)], { type: 'application/json' }); }
export async function importarArchivo(texto) { const o = JSON.parse(texto); if (typeof o.semilla !== 'number') throw new Error('el archivo no es un mundo de Forja'); return deserializar(o); }
