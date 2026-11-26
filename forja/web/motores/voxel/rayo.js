// Forja · voxel · raycasting voxel DDA (J. Amanatides y A. Woo, «A Fast Voxel Traversal Algorithm», 1987).
// Recorre exactamente las celdas que cruza el rayo, en orden, sin saltarse ninguna ni probar las demás.
// Devuelve el primer bloque «apuntable» y la cara por la que entró (normal), que es donde se pone un bloque nuevo.
import { T } from './bloques.js';
export function lanzarRayo(bloque, ox, oy, oz, dx, dy, dz, maxDist = 6, apuntable = (id) => id > 0 && !T.liquido[id]) {
  let x = Math.floor(ox), y = Math.floor(oy), z = Math.floor(oz);
  const sx = Math.sign(dx), sy = Math.sign(dy), sz = Math.sign(dz);
  const tdx = dx ? Math.abs(1 / dx) : Infinity, tdy = dy ? Math.abs(1 / dy) : Infinity, tdz = dz ? Math.abs(1 / dz) : Infinity;
  let tx = dx ? ((sx > 0 ? x + 1 - ox : ox - x) * tdx) : Infinity, ty = dy ? ((sy > 0 ? y + 1 - oy : oy - y) * tdy) : Infinity, tz = dz ? ((sz > 0 ? z + 1 - oz : oz - z) * tdz) : Infinity;
  let nx = 0, ny = 0, nz = 0, t = 0, pasos = 0;
  while (t <= maxDist && pasos++ < 256) {
    const id = bloque(x, y, z);
    if (id > 0 && apuntable(id)) return { x, y, z, id, nx, ny, nz, dist: t };
    if (tx < ty && tx < tz) { x += sx; t = tx; tx += tdx; nx = -sx; ny = 0; nz = 0; }
    else if (ty < tz) { y += sy; t = ty; ty += tdy; nx = 0; ny = -sy; nz = 0; }
    else { z += sz; t = tz; tz += tdz; nx = 0; ny = 0; nz = -sz; }
  }
  return null;
}
