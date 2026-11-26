// Forja · voxel · física del jugador con AABB contra la rejilla. Solo se consultan los bloques que toca la caja
// (unas pocas decenas), nunca el mundo entero. Se resuelve eje por eje (primero Y, luego X y Z): así no se atraviesan
// paredes aunque el paso sea grande, y un paso muy largo se parte en sub-pasos de ≤ 0,45 bloques (anti-túnel).
// Incluye: gravedad, salto (con un margen de 0,1 s al salir de un borde), carrera, agacharse (no se cae del borde),
// natación (flotación, arrastre y salida a la orilla), escaleras de mano, vuelo (creativo), fricción del bloque pisado
// (hielo resbala), escalones (sube solo un bloque si pasoAuto; siempre los desniveles de menos de 0,6) y daño por caída.
// Al chocar con una pared el cuerpo queda pegado a ella (sin hueco y sin temblar).
import { T, bloque as def } from './bloques.js';

export const FISICA_BASE = { gravedad: 28, salto: 8.6, velocidad: 4.4, carrera: 1.65, agachado: 0.45, nado: 3, flotacion: 14, vuelo: 10, ancho: 0.6, alto: 1.8, altoAgachado: 1.5, caidaSegura: 3.5, aceleracion: 40, aire: 0.35, pasoAuto: true, escalon: 0.6, coyote: 0.1 };

export function crearCuerpo(x, y, z, f = {}) { return { x, y, z, vx: 0, vy: 0, vz: 0, enSuelo: false, enAgua: false, cabezaAgua: false, enEscalera: false, volando: false, agachado: false, coyote: 0, caidaDesde: y, f: { ...FISICA_BASE, ...f } }; }

// solido(x,y,z) → bool. Los chunks sin cargar cuentan como sólidos: el jugador no cae al vacío mientras cargan.
export function solidoDe(mundo) { return (x, y, z) => { const id = mundo.bloque(x, y, z); return id < 0 ? true : !!T.solido[id]; }; }

function choca(solido, x0, y0, z0, x1, y1, z1) {
  for (let y = Math.floor(y0); y <= Math.floor(y1 - 1e-6); y++) for (let z = Math.floor(z0); z <= Math.floor(z1 - 1e-6); z++) for (let x = Math.floor(x0); x <= Math.floor(x1 - 1e-6); x++) if (solido(x, y, z)) return true;
  return false;
}
// entrada: { x, z } dirección deseada en el plano (ya rotada por la cámara), salto, carrera, agachar, subir, bajar
// Devuelve { dano, subida }: subida = cuánto subió por escalones en este paso (la cámara lo suaviza).
export function pasoCuerpo(c, dt, entrada, mundo, solido = solidoDe(mundo)) {
  const f = c.f, w = f.ancho / 2;
  const caja = (x, y, z, a) => choca(solido, x - w, y, z - w, x + w, y + a, z + w);
  // agacharse; al soltar, solo se levanta si cabe de pie (bajo un techo de 1,5 sigue agachado)
  const quiere = !!entrada.agachar && !c.volando;
  if (quiere !== c.agachado) c.agachado = quiere || caja(c.x, c.y, c.z, f.alto);
  const alto = c.agachado ? f.altoAgachado : f.alto;
  const idPies = mundo.bloque(Math.floor(c.x), Math.floor(c.y + 0.1), Math.floor(c.z)), idCabeza = mundo.bloque(Math.floor(c.x), Math.floor(c.y + alto - 0.2), Math.floor(c.z));
  c.enAgua = T.liquido[idPies] === 1 || T.liquido[idCabeza] === 1; c.cabezaAgua = T.liquido[idCabeza] === 1; c.enLava = idPies === 6 || idCabeza === 6;
  c.enEscalera = !!(T.escalable[idPies] || T.escalable[idCabeza]);
  if (c.enAgua && c.agachado && !caja(c.x, c.y, c.z, f.alto)) c.agachado = false;
  // margen de salto: 0,1 s después de salir del borde todavía se puede saltar
  c.coyote = c.enSuelo ? f.coyote : Math.max(0, (c.coyote || 0) - dt);
  // velocidad horizontal deseada
  let vel = f.velocidad * (entrada.carrera && !c.agachado ? f.carrera : 1) * (c.agachado ? f.agachado : 1);
  if (c.enAgua) vel = Math.min(vel, f.nado); if (c.volando) vel = f.vuelo * (entrada.carrera ? 1.6 : 1);
  const bajo = c.enSuelo ? def(mundo.bloque(Math.floor(c.x), Math.floor(c.y - 0.05), Math.floor(c.z))) : null;
  const agarre = c.volando ? 1 : c.enSuelo ? Math.max(0.05, (bajo?.friccion ?? 0.6) / 0.6) : f.aire;
  const k = Math.min(1, f.aceleracion * agarre * dt / Math.max(0.1, vel));
  c.vx += ((entrada.x || 0) * vel - c.vx) * k; c.vz += ((entrada.z || 0) * vel - c.vz) * k;
  // vertical
  if (c.volando) { c.vy += ((entrada.subir ? 1 : 0) - (entrada.bajar ? 1 : 0)) * f.vuelo * 4 * dt; c.vy *= Math.pow(0.02, dt); }
  else if (c.enEscalera) { c.vy = entrada.salto || (entrada.adelante && (Math.abs(c.vx) + Math.abs(c.vz) > 0.1)) ? 3 : entrada.agachar ? 0 : -2; c.caidaDesde = c.y; }
  else if (c.enAgua) { c.vy -= f.gravedad * 0.25 * dt; if (entrada.salto) c.vy += f.flotacion * dt; c.vy *= Math.pow(0.15, dt); c.vy = Math.max(-3, Math.min(4, c.vy)); c.caidaDesde = c.y; }
  else {
    c.vy -= f.gravedad * dt;
    if (entrada.salto && (c.enSuelo || c.coyote > 0) && c.vy <= 0.5) { c.vy = f.salto; c.enSuelo = false; c.coyote = 0; }
    c.vy = Math.max(c.vy, -55);
  }
  // movimiento con sub-pasos y resolución por ejes
  const total = Math.max(Math.abs(c.vx), Math.abs(c.vy), Math.abs(c.vz)) * dt, n = Math.max(1, Math.ceil(total / 0.45)), h = dt / n;
  let golpeSuelo = false, dano = 0, subida = 0;
  for (let s = 0; s < n; s++) {
    // Y
    const dy = c.vy * h;
    if (dy) {
      let ny = c.y + dy;
      if (caja(c.x, ny, c.z, alto)) {
        if (dy < 0) { ny = Math.floor(ny) + 1; golpeSuelo = true; } else ny = Math.floor(ny + alto) - alto - 1e-4;
        if (caja(c.x, ny, c.z, alto)) ny = c.y;
        c.vy = 0;
      }
      c.y = ny;
    }
    // X y Z: escalón (subida automática), pegarse a la pared, borde seguro al ir agachado
    for (const eje of ['x', 'z']) {
      const v = eje === 'x' ? c.vx : c.vz; if (!v) continue;
      const nx = eje === 'x' ? c.x + v * h : c.x, nz = eje === 'z' ? c.z + v * h : c.z;
      if (caja(nx, c.y, nz, alto)) {
        // ¿escalón? Solo pisando el suelo (o nadando hacia la orilla) y sin ir subiendo de un salto
        const apoyo = c.enSuelo || c.coyote > 0 || c.enAgua, lim = c.agachado ? f.escalon : (f.pasoAuto || c.enAgua) ? (c.enAgua ? 1.25 : 1.05) : f.escalon;
        let subio = false;
        if (apoyo && c.vy <= 0.5 && !c.volando) {
          for (let kk = 1; kk <= 2 && !subio; kk++) {
            const y2 = Math.floor(c.y + 1e-6) + kk; if (y2 - c.y > lim) break;
            // cabe arriba en el destino y no hay techo en el camino vertical
            if (!caja(nx, y2, nz, alto) && !choca(solido, c.x - w, c.y, c.z - w, c.x + w, y2 + alto, c.z + w)) { subida += y2 - c.y; c.y = y2; c.x = nx; c.z = nz; c.vy = Math.max(0, c.vy); golpeSuelo = true; subio = true; }
          }
        }
        if (subio) continue;
        // pegarse a la cara del bloque (sin hueco), sin retroceder nunca
        const pos = eje === 'x' ? c.x : c.z, sig = eje === 'x' ? nx : nz;
        const contacto = v > 0 ? Math.floor(sig + w) - w - 1e-4 : Math.floor(sig - w) + 1 + w + 1e-4;
        if ((v > 0 ? contacto > pos : contacto < pos) && !caja(eje === 'x' ? contacto : c.x, c.y, eje === 'z' ? contacto : c.z, alto)) { if (eje === 'x') c.x = contacto; else c.z = contacto; }
        if (c.enAgua && !c.volando) c.vy = Math.max(c.vy, entrada.salto ? 3.2 : c.vy);   // contra la pared del agua se trepa con salto
        if (eje === 'x') c.vx = 0; else c.vz = 0; continue;
      }
      if (c.agachado && c.enSuelo && !c.enAgua && !choca(solido, nx - w, c.y - 0.6, nz - w, nx + w, c.y - 0.05, nz + w)) { if (eje === 'x') c.vx = 0; else c.vz = 0; continue; }   // caída controlada
      c.x = nx; c.z = nz;
    }
  }
  const antes = c.enSuelo;
  c.enSuelo = golpeSuelo || choca(solido, c.x - w, c.y - 0.04, c.z - w, c.x + w, c.y, c.z + w);
  if (c.enSuelo && !antes && !c.volando) { const caida = c.caidaDesde - c.y; if (caida > f.caidaSegura) dano = Math.round(caida - f.caidaSegura); }
  if (c.enSuelo || c.volando) c.caidaDesde = c.y; else c.caidaDesde = Math.max(c.caidaDesde, c.y);
  return { dano, subida };
}
// ¿el bloque (x, y, z) se cruza con el cuerpo? (no se puede poner un bloque dentro del jugador)
export function dentroDelCuerpo(c, x, y, z) { const w = c.f.ancho / 2, alto = c.agachado ? c.f.altoAgachado : c.f.alto; return x + 1 > c.x - w && x < c.x + w && y + 1 > c.y && y < c.y + alto && z + 1 > c.z - w && z < c.z + w; }
// ¿el cuerpo está metido en un bloque sólido? (aparición, bloques que caen encima)
export function atascado(c, solido) { const w = c.f.ancho / 2, alto = c.agachado ? c.f.altoAgachado : c.f.alto; return choca(solido, c.x - w, c.y, c.z - w, c.x + w, c.y + alto, c.z + w); }
