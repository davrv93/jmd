// Forja · motores · Spatial hashing: rejilla de celdas para preguntar «¿quién está cerca?» sin comparar todos contra todos.
export function crearRejilla(celda = 64) {
  const m = new Map(), k = (cx, cy) => cx * 73856093 ^ cy * 19349663;
  return {
    limpiar() { m.clear(); },
    meter(obj, x0, y0, x1, y1) {
      for (let cx = Math.floor(x0 / celda); cx <= Math.floor(x1 / celda); cx++) for (let cy = Math.floor(y0 / celda); cy <= Math.floor(y1 / celda); cy++) {
        const key = k(cx, cy); let l = m.get(key); if (!l) m.set(key, (l = [])); l.push(obj);
      }
    },
    cerca(x0, y0, x1, y1, fuera = new Set()) {
      fuera.clear();
      for (let cx = Math.floor(x0 / celda); cx <= Math.floor(x1 / celda); cx++) for (let cy = Math.floor(y0 / celda); cy <= Math.floor(y1 / celda); cy++) for (const o of m.get(k(cx, cy)) || []) fuera.add(o);
      return fuera;
    },
  };
}
