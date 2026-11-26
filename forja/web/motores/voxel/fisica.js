// Forja · voxel · física del jugador con AABB contra la rejilla. Solo se consultan los bloques que toca la caja
// (unas pocas decenas), nunca el mundo entero. Se resuelve eje por eje (primero Y, luego X y Z): así no se atraviesan
// paredes aunque el paso sea grande, y un paso muy largo se parte en sub-pasos de ≤ 0,45 bloques (anti-túnel).
// Incluye: gravedad, salto, carrera, agacharse (no se cae del borde), natación (flotación y arrastre), escaleras de
// mano, vuelo (creativo), fricción del bloque pisado (hielo resbala) y daño por caída.
import { T, bloque as def } from './bloques.js';

export const FISICA_BASE = { gravedad: 28, salto: 8.6, velocidad: 4.4, carrera: 1.65, agachado: 0.45, nado: 3, flotacion: 14, vuelo: 10, ancho: 0.6, alto: 1.8, altoAgachado: 1.5, caidaSegura: 3.5, aceleracion: 40, aire: 0.35, pasoAuto: true };

export function crearCuerpo(x, y, z, f = {}) { return { x, y, z, vx: 0, vy: 0, vz: 0, enSuelo: false, enAgua: false, cabezaAgua: false, enEscalera: false, volando: false, agachado: false, caidaDesde: y, f: { ...FISICA_BASE, ...f } }; }

// solido(x,y,z) → bool. Los chunks sin cargar cuentan como sólidos: el jugador no cae al vacío mientras cargan.
export function solidoDe(mundo) { return (x, y, z) => { const id = mundo.bloque(x, y, z); return id < 0 ? true : !!T.solido[id]; }; }

function choca(solido, x0, y0, z0, x1, y1, z1) {
  for (let y = Math.floor(y0); y <= Math.floor(y1 - 1e-6); y++) for (let z = Math.floor(z0); z <= Math.floor(z1 - 1e-6); z++) for (let x = Math.floor(x0); x <= Math.floor(x1 - 1e-6); x++) if (solido(x, y, z)) return true;
  return false;
}
// entrada: { x, z } dirección deseada en el plano (ya rotada por la cámara), salto, carrera, agachar, subir, bajar
export function pasoCuerpo(c, dt, entrada, mundo, solido = solidoDe(mundo)) {
  const f = c.f, w = f.ancho / 2, alto = c.agachado ? f.altoAgachado : f.alto;
  const idPies = mundo.bloque(Math.floor(c.x), Math.floor(c.y + 0.1), Math.floor(c.z)), idCabeza = mundo.bloque(Math.floor(c.x), Math.floor(c.y + alto - 0.2), Math.floor(c.z));
  c.enAgua = T.liquido[idPies] === 1 || T.liquido[idCabeza] === 1; c.cabezaAgua = T.liquido[idCabeza] === 1; c.enLava = idPies === 6 || idCabeza === 6;
  c.enEscalera = !!(T.escalable[idPies] || T.escalable[idCabeza]);
  c.agachado = !!entrada.agachar && !c.volando && !c.enAgua;
  // velocidad horizontal deseada
  let vel = f.velocidad * (entrada.carrera && !c.agachado ? f.carrera : 1) * (c.agachado ? f.agachado : 1);
  if (c.enAgua) vel = Math.min(vel, f.nado); if (c.volando) vel = f.vuelo * (entrada.carrera ? 1.6 : 1);
  const bajo = c.enSuelo ? def(mundo.bloque(Math.floor(c.x), Math.floor(c.y - 0.05), Math.floor(c.z))) : null;
  const agarre = c.volando ? 1 : c.enSuelo ? Math.max(0.05, (bajo?.friccion ?? 0.6) / 0.6) : f.aire;
  const k = Math.min(1, f.aceleracion * agarre * dt / Math.max(0.1, vel));
  c.vx += (entrada.x * vel - c.vx) * k; c.vz += (entrada.z * vel - c.vz) * k;
  // vertical
  if (c.volando) { c.vy += ((entrada.subir ? 1 : 0) - (entrada.bajar ? 1 : 0)) * f.vuelo * 4 * dt; c.vy *= Math.pow(0.02, dt); }
  else if (c.enEscalera) { c.vy = entrada.salto || (entrada.adelante && (Math.abs(c.vx) + Math.abs(c.vz) > 0.1)) ? 3 : entrada.agachar ? 0 : -2; c.caidaDesde = c.y; }
  else if (c.enAgua) { c.vy -= f.gravedad * 0.25 * dt; if (entrada.salto) c.vy += f.flotacion * dt; c.vy *= Math.pow(0.15, dt); c.vy = Math.max(-3, Math.min(4, c.vy)); c.caidaDesde = c.y; }
  else { c.vy -= f.gravedad * dt; if (entrada.salto && c.enSuelo) { c.vy = f.salto; c.enSuelo = false; } c.vy = Math.max(c.vy, -55); }
  // movimiento con sub-pasos y resolución por ejes
  const total = Math.max(Math.abs(c.vx), Math.abs(c.vy), Math.abs(c.vz)) * dt, n = Math.max(1, Math.ceil(total / 0.45)), h = dt / n;
  let golpeSuelo = false, dano = 0;
  for (let s = 0; s < n; s++) {
    // Y
    let ny = c.y + c.vy * h;
    if (choca(solido, c.x - w, ny, c.z - w, c.x + w, ny + alto, c.z + w)) {
      if (c.vy < 0) { ny = Math.floor(ny) + 1; golpeSuelo = true; } else ny = Math.floor(ny + alto) - alto - 1e-4;
      if (choca(solido, c.x - w, ny, c.z - w, c.x + w, ny + alto, c.z + w)) ny = c.y;
      c.vy = 0;
    }
    c.y = ny;
    // X y Z, con borde seguro al ir agachado y subida automática de 1 bloque bajo los pies (opcional)
    for (const eje of ['x', 'z']) {
      const v = eje === 'x' ? c.vx : c.vz; if (!v) continue;
      const nx = eje === 'x' ? c.x + v * h : c.x, nz = eje === 'z' ? c.z + v * h : c.z;
      if (choca(solido, nx - w, c.y, nz - w, nx + w, c.y + alto, nz + w)) {
        if (f.pasoAuto && c.enSuelo && !c.agachado && !choca(solido, nx - w, c.y + 1.01, nz - w, nx + w, c.y + 1.01 + alto, nz + w) && solido(Math.floor(nx + Math.sign(eje === 'x' ? v : 0) * w), Math.floor(c.y + 0.5), Math.floor(nz + Math.sign(eje === 'z' ? v : 0) * w))) { c.vy = Math.max(c.vy, 6.2); }
        if (eje === 'x') c.vx = 0; else c.vz = 0; continue;
      }
      if (c.agachado && c.enSuelo && !choca(solido, nx - w, c.y - 0.6, nz - w, nx + w, c.y - 0.05, nz + w)) { if (eje === 'x') c.vx = 0; else c.vz = 0; continue; }   // caída controlada
      c.x = nx; c.z = nz;
    }
  }
  const antes = c.enSuelo;
  c.enSuelo = golpeSuelo || choca(solido, c.x - w, c.y - 0.04, c.z - w, c.x + w, c.y, c.z + w);
  if (c.enSuelo && !antes && !c.volando) { const caida = c.caidaDesde - c.y; if (caida > f.caidaSegura) dano = Math.round(caida - f.caidaSegura); }
  if (c.enSuelo || c.volando) c.caidaDesde = c.y; else c.caidaDesde = Math.max(c.caidaDesde, c.y);
  return { dano };
}
// ¿el bloque (x, y, z) se cruza con el cuerpo? (no se puede poner un bloque dentro del jugador)
export function dentroDelCuerpo(c, x, y, z) { const w = c.f.ancho / 2, alto = c.agachado ? c.f.altoAgachado : c.f.alto; return x + 1 > c.x - w && x < c.x + w && y + 1 > c.y && y < c.y + alto && z + 1 > c.z - w && z < c.z + w; }
