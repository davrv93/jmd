// Forja · voxel · Chunk Manager + Chunk Cache + Chunk Scheduler + Delta Storage.
// El mundo no se guarda: se pide al generador por chunks de 16×16×H alrededor del jugador. Solo se recuerdan los
// bloques que el jugador cambió (deltas). Cada actualización:
//   1. calcula qué chunks hacen falta (radio + 1 para generar, radio para mallar: mallar pide los 8 vecinos)
//   2. los ordena en una cola de prioridad: más cerca primero y, a igual distancia, los que están hacia donde camina
//   3. despacha a los Workers hasta `enVuelo` trabajos; cancela los de chunks que ya quedaron lejos
//   4. descarga los chunks lejanos (libera su geometría) y guarda sus bloques en una caché LRU con tope
// Chunk: bloques Uint8Array(16*16*H), índice x + z*16 + y*256 (cada sección de 16 de alto es contigua).
import { crearCola } from '../nucleo/cola.js';
import { volumenConBorde } from './malla.js';
import { T } from './bloques.js';

export const clave = (cx, cz) => cx + ',' + cz;
export function crearMundo({ ejecutor, H = 128, radio = 5, cacheMax = 128, enVuelo = 6, ao = true, alMalla = () => {}, alQuitar = () => {}, alCargar = () => {} }) {
  const chunks = new Map(), cache = new Map(), deltas = new Map(), pend = new Map(), cola = crearCola();
  const stats = { generados: 0, mallados: 0, msGen: 0, msMalla: 0, cancelados: 0, desdeCache: 0, mallasPor: new Map() };
  let cx0 = 0, cz0 = 0, dirX = 0, dirZ = 0, urgentes = new Set();
  const m = {
    chunks, cache, deltas, stats, H,
    get radio() { return radio; }, set radio(r) { radio = Math.max(1, Math.min(16, r | 0)); },
    get pendientes() { return pend.size + cola.largo; },
    chunk: (cx, cz) => chunks.get(clave(cx, cz)),
    // ---------------------------------------------------------------- consultas de bloques (coordenadas del mundo)
    bloque(x, y, z) {
      if (y < 0) return T.solido[27] ? 27 : 1; if (y >= H) return 0;
      const cx = Math.floor(x / 16), cz = Math.floor(z / 16), c = chunks.get(clave(cx, cz));
      return c ? c.bloques[(x - cx * 16) + (z - cz * 16) * 16 + y * 256] : -1;   // -1 = sin cargar
    },
    cargado(x, z) { return chunks.has(clave(Math.floor(x / 16), Math.floor(z / 16))); },
    poner(x, y, z, id) {
      if (y < 1 || y >= H) return null;
      const cx = Math.floor(x / 16), cz = Math.floor(z / 16), k = clave(cx, cz), c = chunks.get(k); if (!c) return null;
      const lx = x - cx * 16, lz = z - cz * 16, i = lx + lz * 16 + y * 256, antes = c.bloques[i];
      if (antes === id) return antes;
      let d = deltas.get(k); if (!d) deltas.set(k, (d = new Map()));
      const orig = d.has(i) ? d.get(i)[1] : antes;
      if (orig === id) d.delete(i); else d.set(i, [id, orig]);
      if (!d.size) deltas.delete(k);
      c.bloques[i] = id;
      // se rehace la malla de este chunk y, si el bloque toca un borde, la del vecino (y la diagonal en esquinas)
      const tocar = [[cx, cz]];
      const bx = lx === 0 ? -1 : lx === 15 ? 1 : 0, bz = lz === 0 ? -1 : lz === 15 ? 1 : 0;
      if (bx) tocar.push([cx + bx, cz]); if (bz) tocar.push([cx, cz + bz]); if (bx && bz) tocar.push([cx + bx, cz + bz]);
      for (const [a, b] of tocar) { const o = chunks.get(clave(a, b)); if (o) { o.sucio = true; o.version++; urgentes.add(clave(a, b)); } }
      m.planificar();
      return antes;
    },
    // ---------------------------------------------------------------- planificación
    actualizar(x, z, vx = 0, vz = 0) {
      const ncx = Math.floor(x / 16), ncz = Math.floor(z / 16), v = Math.hypot(vx, vz);
      if (v > 0.1) { dirX = vx / v; dirZ = vz / v; }
      const cambio = ncx !== cx0 || ncz !== cz0; cx0 = ncx; cz0 = ncz;
      if (cambio) m.descargar();
      m.planificar();
    },
    planificar() {
      cola.vaciar();
      const R = radio + 1;
      for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) {
        const cx = cx0 + dx, cz = cz0 + dz, k = clave(cx, cz), d = Math.hypot(dx, dz);
        if (d > R + 0.75) continue;
        const hacia = d > 0 ? Math.max(0, (dx * dirX + dz * dirZ) / d) : 1, prio = d - 2.5 * hacia;
        const c = chunks.get(k);
        if (!c) {
          if (pend.has('g' + k)) continue;
          if (cache.has(k)) { cargar(cx, cz, cache.get(k)); cache.delete(k); stats.desdeCache++; continue; }
          cola.poner({ tipo: 'generar', cx, cz, k }, prio);
        } else if (c.sucio && d <= radio + 0.75 && !pend.has('m' + k) && vecinosListos(cx, cz)) {
          cola.poner({ tipo: 'malla', cx, cz, k }, urgentes.has(k) ? -1e6 : prio - 0.5);
        }
      }
      despachar();
    },
    // descarga lo lejano y cancela trabajos que ya no sirven
    descargar() {
      const lim = radio + 2;
      for (const [k, c] of chunks) if (Math.max(Math.abs(c.cx - cx0), Math.abs(c.cz - cz0)) > lim) {
        chunks.delete(k); alQuitar(c);
        cache.set(k, c.crudo); if (cache.size > cacheMax) cache.delete(cache.keys().next().value);
      }
      for (const [k, p] of pend) {
        const [cx, cz] = k.slice(1).split(',').map(Number);
        if (Math.max(Math.abs(cx - cx0), Math.abs(cz - cz0)) > lim) { ejecutor.cancelar(p.id); pend.delete(k); stats.cancelados++; }
      }
    },
    // ---------------------------------------------------------------- deltas (persistencia)
    exportarDeltas() { const o = {}; for (const [k, d] of deltas) o[k] = [...d].map(([i, [id, orig]]) => [i, id, orig]); return o; },
    importarDeltas(o) {
      deltas.clear();
      for (const [k, lista] of Object.entries(o || {})) { const d = new Map(); for (const [i, id, orig] of lista) d.set(i, [id, orig]); deltas.set(k, d); const c = chunks.get(k); if (c) { aplicarDeltas(k, c.bloques); c.sucio = true; c.version++; } }
    },
    // espera a que no quede nada pendiente (pruebas y pantalla de carga)
    async completar(x, z, max = 4000) { for (let i = 0; i < max; i++) { m.actualizar(x, z); if (!pend.size && !cola.largo) return true; await Promise.race([...[...pend.values()].map((p) => p.promesa), new Promise((r) => setTimeout(r, 30))]); } return false; },
  };
  function vecinosListos(cx, cz) { for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) if (!chunks.has(clave(cx + dx, cz + dz))) return false; return true; }
  function aplicarDeltas(k, bloques) { const d = deltas.get(k); if (d) for (const [i, [id]] of d) bloques[i] = id; }
  function cargar(cx, cz, crudo) {
    const k = clave(cx, cz), bloques = crudo.bloques.slice(); aplicarDeltas(k, bloques);
    const c = { cx, cz, k, bloques, alturas: crudo.alturas, biomas: crudo.biomas, marcadores: crudo.marcadores || [], crudo, sucio: true, version: 1, malla: null };
    chunks.set(k, c); alCargar(c);
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { const o = chunks.get(clave(cx + dx, cz + dz)); if (o && (dx || dz) && o.malla) { o.sucio = true; o.version++; } }
  }
  function despachar() {
    while (cola.largo && pend.size < enVuelo) {
      const t = cola.sacar();
      if (t.tipo === 'generar') {
        const p = ejecutor.enviar({ tipo: 'generar', cx: t.cx, cz: t.cz });
        const reg = { id: p.id, promesa: p }; pend.set('g' + t.k, reg);
        p.then((r) => {
          if (pend.get('g' + t.k) !== reg) return; pend.delete('g' + t.k);
          if (r.cancelado) return;
          stats.generados++; stats.msGen += r.ms;
          cargar(t.cx, t.cz, { bloques: r.bloques, alturas: r.alturas, biomas: r.biomas, marcadores: r.marcadores });
          m.planificar();
        }, (e) => { pend.delete('g' + t.k); console.error(e); });
      } else {
        const c = chunks.get(t.k); if (!c) continue;
        const vec = []; for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) vec.push(chunks.get(clave(t.cx + dx, t.cz + dz))?.bloques || null);
        const vol = volumenConBorde(c.bloques, vec, H), version = c.version;
        c.sucio = false; urgentes.delete(t.k);
        const p = ejecutor.enviar({ tipo: 'malla', cx: t.cx, cz: t.cz, vol, H, ao, version }, [vol.buffer]);
        const reg = { id: p.id, promesa: p }; pend.set('m' + t.k, reg);
        p.then((r) => {
          if (pend.get('m' + t.k) !== reg) return; pend.delete('m' + t.k);
          if (r.cancelado) return;
          const cc = chunks.get(t.k); if (!cc) return;
          stats.mallados++; stats.msMalla += r.ms; stats.mallasPor.set(t.k, (stats.mallasPor.get(t.k) || 0) + 1);
          if (cc.version !== r.version) { cc.sucio = true; } else { cc.malla = r.malla; alMalla(cc, r.malla); }
          m.planificar();
        }, (e) => { pend.delete('m' + t.k); console.error(e); });
      }
    }
  }
  return m;
}
