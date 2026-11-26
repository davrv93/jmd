// Forja · motores · Scene Manager. Una escena es un objeto { entrar(datos), salir(), actualizar(dt), dibujar(alfa) }.
// cambiar() reemplaza la pila; apilar() pone una encima (pausa, menú) y la de abajo deja de actualizarse pero se dibuja.
export function crearEscenas(contexto = {}) {
  const registro = new Map(), pila = [];
  const g = {
    registrar(nombre, escena) { registro.set(nombre, escena); return g; },
    get actual() { return pila[pila.length - 1] || null; },
    get nombre() { return g.actual?.__nombre || null; },
    cambiar(nombre, datos) { while (pila.length) pila.pop().salir?.(contexto); return g.apilar(nombre, datos); },
    apilar(nombre, datos) {
      const e = registro.get(nombre); if (!e) throw new Error(`escena desconocida: ${nombre}`);
      const inst = Object.assign(Object.create(e), { __nombre: nombre }); pila.push(inst); inst.entrar?.(datos, contexto); return inst;
    },
    desapilar() { const e = pila.pop(); e?.salir?.(contexto); return e; },
    actualizar(dt) { g.actual?.actualizar?.(dt, contexto); },
    dibujar(alfa, dt) { for (const e of pila) e.dibujar?.(alfa, dt, contexto); },
  };
  return g;
}
