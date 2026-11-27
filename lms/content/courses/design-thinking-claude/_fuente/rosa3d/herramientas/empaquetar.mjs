// geometria.glb (sin texturas) + tex/out/* → rosa.glb: un solo archivo, válido glTF 2.0
// (WebP por EXT_texture_webp, córnea y labios húmedos por KHR_materials_clearcoat).
import fs from 'node:fs';
const [, , ENT = '../out/geometria.glb', SAL = '../out/rosa.glb'] = process.argv;
const T = '../tex/out/';
const glb = fs.readFileSync(ENT);
const jl = glb.readUInt32LE(12); const J = JSON.parse(glb.subarray(20, 20 + jl).toString());
const bo = 20 + jl; const bl = glb.readUInt32LE(bo); const BIN0 = glb.subarray(bo + 8, bo + 8 + bl);
// Formas de cara en accesores dispersos (sparse): cada forma mueve unos cientos de vértices de miles; guardar solo
// esos (índice + delta) reduce el .glb a menos de la mitad. GLTFLoader los rearma al cargar.
const vistaDe = (v) => BIN0.subarray((v.byteOffset || 0), (v.byteOffset || 0) + v.byteLength);
const nuevasVistas = [], mapa = new Map(), partes = []; let largo = 0;
function agregar(datos) {
  const pad = (4 - (largo % 4)) % 4; if (pad) { partes.push(Buffer.alloc(pad)); largo += pad; }
  nuevasVistas.push({ buffer: 0, byteOffset: largo, byteLength: datos.length }); partes.push(datos); largo += datos.length;
  return nuevasVistas.length - 1;
}
const formas = new Set();
for (const m of J.meshes) for (const pr of m.primitives) for (const t of pr.targets || []) for (const k in t) formas.add(t[k]);
let antes = 0, despues = 0;
for (const i of formas) {
  const a = J.accessors[i]; if (a.sparse || a.bufferView === undefined || a.componentType !== 5126 || a.type !== 'VEC3') continue;
  const v = J.bufferViews[a.bufferView], d = vistaDe(v), off = a.byteOffset || 0, st = v.byteStride || 12;
  const f = (k, c) => d.readFloatLE(off + k * st + c * 4);
  const idx = []; for (let k = 0; k < a.count; k++) if (Math.abs(f(k, 0)) > 1e-4 || Math.abs(f(k, 1)) > 1e-4 || Math.abs(f(k, 2)) > 1e-4) idx.push(k);
  if (!idx.length) idx.push(0);
  const corto = a.count < 65536, bi = Buffer.alloc(idx.length * (corto ? 2 : 4)), bv = Buffer.alloc(idx.length * 12);
  idx.forEach((k, j) => { corto ? bi.writeUInt16LE(k, j * 2) : bi.writeUInt32LE(k, j * 4); for (let c = 0; c < 3; c++) bv.writeFloatLE(f(k, c), j * 12 + c * 4); });
  antes += a.count * 12; despues += bi.length + bv.length;
  delete a.bufferView; delete a.byteOffset;
  a.sparse = { count: idx.length, indices: { bufferView: agregar(bi), componentType: corto ? 5123 : 5125 }, values: { bufferView: agregar(bv) } };
}
// el resto de las vistas que siguen en uso, copiadas tal cual
for (const a of J.accessors) if (a.bufferView !== undefined) {
  if (!mapa.has(a.bufferView)) { const v = J.bufferViews[a.bufferView], n = agregar(vistaDe(v)); if (v.byteStride) nuevasVistas[n].byteStride = v.byteStride; if (v.target) nuevasVistas[n].target = v.target; mapa.set(a.bufferView, n); }
  a.bufferView = mapa.get(a.bufferView);
}
J.bufferViews = nuevasVistas;
console.log('formas de cara:', formas.size, 'accesores;', (antes / 1e6).toFixed(2), 'MB →', (despues / 1e6).toFixed(2), 'MB en disperso');
J.bufferViews ||= []; J.images = []; J.textures = []; J.samplers = [{ magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497 }];
const tex = {};
function imagen(nombre, archivo, mime) {
  const datos = fs.readFileSync(T + archivo);
  const pad = (4 - (largo % 4)) % 4; if (pad) { partes.push(Buffer.alloc(pad)); largo += pad; }
  J.bufferViews.push({ buffer: 0, byteOffset: largo, byteLength: datos.length }); partes.push(datos); largo += datos.length;
  J.images.push({ name: nombre, mimeType: mime, bufferView: J.bufferViews.length - 1 });
  const src = J.images.length - 1;
  J.textures.push(mime === 'image/webp' ? { name: nombre, sampler: 0, extensions: { EXT_texture_webp: { source: src } } } : { name: nombre, sampler: 0, source: src });
  return (tex[nombre] = J.textures.length - 1);
}
imagen('cabeza_color', 'cabeza_color.webp', 'image/webp');
imagen('cabeza_normal', 'cabeza_normal.jpg', 'image/jpeg');
imagen('cabeza_orm', 'cabeza_orm.jpg', 'image/jpeg');
imagen('cabeza_humedo', 'cabeza_humedo.png', 'image/png');
imagen('cuerpo_color', 'cuerpo_color.webp', 'image/webp');
imagen('cuerpo_normal', 'cuerpo_normal.jpg', 'image/jpeg');
imagen('cuerpo_orm', 'cuerpo_orm.jpg', 'image/jpeg');
imagen('pelo', 'pelo.webp', 'image/webp');
const MAT = {
  cabeza: { pbrMetallicRoughness: { baseColorTexture: { index: tex.cabeza_color }, metallicFactor: 0, roughnessFactor: 1, metallicRoughnessTexture: { index: tex.cabeza_orm } },
    normalTexture: { index: tex.cabeza_normal }, occlusionTexture: { index: tex.cabeza_orm },
    extensions: { KHR_materials_clearcoat: { clearcoatFactor: 1, clearcoatTexture: { index: tex.cabeza_humedo }, clearcoatRoughnessFactor: 0.06 } } },
  cuerpo: { pbrMetallicRoughness: { baseColorTexture: { index: tex.cuerpo_color }, metallicFactor: 0, roughnessFactor: 1, metallicRoughnessTexture: { index: tex.cuerpo_orm } },
    normalTexture: { index: tex.cuerpo_normal } },
  pelo: { pbrMetallicRoughness: { baseColorTexture: { index: tex.pelo }, metallicFactor: 0, roughnessFactor: 0.55 }, alphaMode: 'MASK', alphaCutoff: 0.35, doubleSided: true },
};
for (const m of J.materials) if (MAT[m.name]) { const n = m.name; for (const k of Object.keys(m)) delete m[k]; Object.assign(m, { name: n }, MAT[n]); }
J.extensionsUsed = [...new Set([...(J.extensionsUsed || []), 'EXT_texture_webp', 'KHR_materials_clearcoat'])];
J.extensionsRequired = [...new Set([...(J.extensionsRequired || []), 'EXT_texture_webp'])];
J.asset = { version: '2.0', generator: 'rosa3d (three.js GLTFExporter + empaquetar.mjs)', copyright: 'Microsoft Rocketbox Female_Adult_11, MIT (c) 2020 Microsoft. Adaptado para JMD Learning: Rosa, personaje ficticio.' };
const pad = (4 - (largo % 4)) % 4; if (pad) { partes.push(Buffer.alloc(pad)); largo += pad; }
const BIN = Buffer.concat(partes, largo); J.buffers = [{ byteLength: BIN.length }];
let js = Buffer.from(JSON.stringify(J)); const jp = (4 - (js.length % 4)) % 4; js = Buffer.concat([js, Buffer.alloc(jp, 0x20)]);
const cab = Buffer.alloc(12); cab.writeUInt32LE(0x46546c67, 0); cab.writeUInt32LE(2, 4); cab.writeUInt32LE(12 + 8 + js.length + 8 + BIN.length, 8);
const cj = Buffer.alloc(8); cj.writeUInt32LE(js.length, 0); cj.writeUInt32LE(0x4e4f534a, 4);
const cb = Buffer.alloc(8); cb.writeUInt32LE(BIN.length, 0); cb.writeUInt32LE(0x004e4942, 4);
fs.writeFileSync(SAL, Buffer.concat([cab, cj, js, cb, BIN]));
console.log(SAL, fs.statSync(SAL).size, 'bytes; materiales', J.materials.map((m) => m.name).join(','), '; mallas', J.meshes.length, '; nodos', J.nodes.length);
