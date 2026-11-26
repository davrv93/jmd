// Forja · voxel · reparte trabajos entre Workers (pool) o, si no hay Workers (Node, pruebas), los corre en el hilo.
// enviar(orden) → Promise con la respuesta; cancelar(id) avisa al Worker para que la salte si aún no empezó.
import { crearGenerador } from './generador.js';
import { mallar, climaDeChunk } from './malla.js';

export function crearEjecutor({ semilla, opciones, hilos = null, bloquesExtra = [], forzarLocal = false } = {}) {
  const puede = !forzarLocal && typeof Worker !== 'undefined';
  let siguiente = 1;
  if (!puede) {   // en el mismo hilo: misma API, misma salida (las pruebas usan este)
    const gen = crearGenerador(semilla, opciones), cancel = new Set();
    return {
      hilos: 0, local: true, gen,
      enviar(o) {
        const id = siguiente++; o.id = id;
        const p = Promise.resolve().then(() => {
          if (cancel.delete(id)) return { id, cancelado: true };
          const t0 = performance.now();
          if (o.tipo === 'generar') { const c = gen.generarChunk(o.cx, o.cz); return { id, tipo: 'generar', cx: o.cx, cz: o.cz, bloques: c.bloques, alturas: c.alturas, biomas: c.biomas, marcadores: c.marcadores, ms: performance.now() - t0 }; }
          const r = mallar(o.vol, o.H, { ao: o.ao !== false, clima: climaDeChunk(gen, o.cx, o.cz) }); return { id, tipo: 'malla', cx: o.cx, cz: o.cz, version: o.version, malla: r, ms: performance.now() - t0 };
        });
        p.id = id; return p;
      },
      cancelar(id) { cancel.add(id); }, enVuelo: () => 0, destruir() {},
    };
  }
  const n = Math.max(1, Math.min(4, hilos ?? ((globalThis.navigator?.hardwareConcurrency || 4) - 1)));
  const ws = [], espera = new Map();
  for (let i = 0; i < n; i++) {
    const w = new Worker(new URL('./trabajador.js', import.meta.url), { type: 'module' });
    w.carga = 0; w.onmessage = (e) => { const r = e.data, x = espera.get(r.id); if (!x) return; espera.delete(r.id); x.w.carga--; r.error ? x.mal(new Error(r.error)) : x.ok(r); };
    w.onerror = (e) => console.error('worker voxel:', e.message);
    w.postMessage({ tipo: 'iniciar', semilla, opciones, bloquesExtra }); ws.push(w);
  }
  return {
    hilos: n, local: false,
    enviar(o, transferir = []) {
      const id = siguiente++; o.id = id; const w = ws.reduce((a, b) => (b.carga < a.carga ? b : a)); w.carga++;
      const p = new Promise((ok, mal) => espera.set(id, { ok, mal, w })); p.id = id; w.postMessage(o, transferir); return p;
    },
    cancelar(id) { const x = espera.get(id); if (x) x.w.postMessage({ tipo: 'cancelar', id }); },
    enVuelo: () => espera.size,
    destruir() { for (const w of ws) w.terminate(); espera.clear(); },
  };
}
