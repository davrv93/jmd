// Forja · motores · Priority Queue: montículo binario (menor prioridad sale primero). O(log n) por operación.
export function crearCola() {
  const h = [];
  const sube = (i) => { while (i > 0) { const p = (i - 1) >> 1; if (h[p].p <= h[i].p) break; [h[p], h[i]] = [h[i], h[p]]; i = p; } };
  const baja = (i) => { for (;;) { const l = i * 2 + 1, r = l + 1; let m = i; if (l < h.length && h[l].p < h[m].p) m = l; if (r < h.length && h[r].p < h[m].p) m = r; if (m === i) break; [h[m], h[i]] = [h[i], h[m]]; i = m; } };
  return {
    poner(valor, p) { h.push({ valor, p }); sube(h.length - 1); },
    sacar() { if (!h.length) return undefined; const t = h[0], u = h.pop(); if (h.length) { h[0] = u; baja(0); } return t.valor; },
    mirar() { return h[0]?.valor; },
    vaciar() { h.length = 0; },
    get largo() { return h.length; },
  };
}
