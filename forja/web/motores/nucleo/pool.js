// Forja · motores · Object pooling. Se crean `max` objetos al principio y se reciclan: sin basura por cuadro.
//   const p = crearPool(() => ({ x: 0, vida: 0 }), 512); const o = p.tomar(); … p.soltar(o);
export function crearPool(fabrica, max = 256, reiniciar = null) {
  const libres = [], usados = new Set();
  for (let i = 0; i < max; i++) libres.push(fabrica());
  return {
    tomar() { const o = libres.pop(); if (!o) return null; usados.add(o); reiniciar?.(o); return o; },   // null = presupuesto agotado
    soltar(o) { if (usados.delete(o)) libres.push(o); },
    cada(fn) { for (const o of usados) fn(o); },
    soltarSi(fn) { for (const o of usados) if (fn(o)) { usados.delete(o); libres.push(o); } },
    vaciar() { for (const o of usados) libres.push(o); usados.clear(); },
    get activos() { return usados.size; }, get libres() { return libres.length; }, max,
  };
}
