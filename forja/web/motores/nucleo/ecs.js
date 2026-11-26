// Forja · motores · Entity Component System ligero. Una entidad es un número; un componente es un objeto guardado
// en un Map por tipo; un sistema es una función que recorre las entidades que tienen ciertos componentes.
// Sin clases ni herencia: los motores (combate, voxel) añaden sus propios componentes sin tocar este archivo.
export function crearMundo() {
  let siguiente = 1;
  const tablas = new Map(), vivas = new Set(), sistemas = [], porQuitar = [];
  const tabla = (c) => { let t = tablas.get(c); if (!t) tablas.set(c, (t = new Map())); return t; };
  const m = {
    crear(comps = {}) { const id = siguiente++; vivas.add(id); for (const [c, d] of Object.entries(comps)) tabla(c).set(id, d); return id; },
    quitar(id) { porQuitar.push(id); },   // diferido: no rompe un recorrido en curso
    poner(id, c, d) { tabla(c).set(id, d); return d; },
    sacar(id, c) { tabla(c).delete(id); },
    de(id, c) { return tablas.get(c)?.get(id); },
    tiene(id, c) { return !!tablas.get(c)?.has(id); },
    *con(...cs) {   // entidades con TODOS los componentes, recorriendo la tabla más chica
      const ts = cs.map(tabla).sort((a, b) => a.size - b.size);
      for (const id of ts[0].keys()) if (ts.every((t) => t.has(id))) yield id;
    },
    sistema(nombre, fn, orden = 0) { sistemas.push({ nombre, fn, orden }); sistemas.sort((a, b) => a.orden - b.orden); return m; },
    actualizar(dt) {
      for (const s of sistemas) s.fn(m, dt);
      for (const id of porQuitar.splice(0)) { vivas.delete(id); for (const t of tablas.values()) t.delete(id); }
    },
    get cuantas() { return vivas.size; },
    limpiar() { vivas.clear(); tablas.clear(); porQuitar.length = 0; },
  };
  return m;
}
