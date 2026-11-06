// Límite de peticiones por ventana fija. En producción con varias réplicas, esto va en un almacén compartido.
export function crearLimite(maximo, ventanaMs) {
  const cubos = new Map();
  return (clave, tope = maximo()) => {
    const ahora = Date.now();
    let c = cubos.get(clave);
    if (!c || ahora >= c.fin) {
      if (cubos.size > 10_000) cubos.clear();
      c = { n: 0, fin: ahora + ventanaMs() };
      cubos.set(clave, c);
    }
    c.n += 1;
    return c.n <= tope;
  };
}
