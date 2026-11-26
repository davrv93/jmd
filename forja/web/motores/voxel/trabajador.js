// Forja · voxel · Worker de generación y mallado. Recibe órdenes pequeñas y devuelve TypedArrays TRANSFERIDOS
// (sin copiar ni pasar por JSON). Las órdenes canceladas antes de empezar se descartan.
//   { tipo:'iniciar', semilla, opciones, bloquesExtra } · { tipo:'generar', id, cx, cz } · { tipo:'malla', id, vol, H, ao }
//   { tipo:'cancelar', id }
import { crearGenerador } from './generador.js';
import { mallar } from './malla.js';
import { registrarBloque, BLOQUES } from './bloques.js';

let gen = null; const cancelados = new Set();
self.onmessage = (e) => {
  const m = e.data;
  if (m.tipo === 'iniciar') { for (const b of m.bloquesExtra || []) if (!BLOQUES[b.id]) registrarBloque(b); gen = crearGenerador(m.semilla, m.opciones); return; }
  if (m.tipo === 'cancelar') { cancelados.add(m.id); return; }
  if (cancelados.delete(m.id)) { self.postMessage({ id: m.id, cancelado: true }); return; }
  const t0 = performance.now();
  try {
    if (m.tipo === 'generar') {
      const c = gen.generarChunk(m.cx, m.cz);
      self.postMessage({ id: m.id, tipo: 'generar', cx: m.cx, cz: m.cz, bloques: c.bloques, alturas: c.alturas, biomas: c.biomas, marcadores: c.marcadores, ms: performance.now() - t0 }, [c.bloques.buffer, c.alturas.buffer, c.biomas.buffer]);
    } else if (m.tipo === 'malla') {
      const r = mallar(m.vol, m.H, { ao: m.ao !== false }), t = [];
      for (const g of [r.opaco, r.transp]) t.push(g.pos.buffer, g.nor.buffer, g.uv.buffer, g.col.buffer, g.idx.buffer);
      self.postMessage({ id: m.id, tipo: 'malla', cx: m.cx, cz: m.cz, version: m.version, malla: r, ms: performance.now() - t0 }, t);
    }
  } catch (err) { self.postMessage({ id: m.id, error: String(err && err.message || err) }); }
};
