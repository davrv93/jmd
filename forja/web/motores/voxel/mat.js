// Forja · voxel · matemáticas de cámara (matrices 4×4 en columnas, convención de WebGL) y frustum culling.
// La cámara SIEMPRE está en el origen: lo que se dibuja se desplaza por (posición − cámara), restado en doble
// precisión en JS. Es la forma «relativa a la cámara» del floating origin: a 1 000 000 bloques los vértices siguen
// teniendo valores pequeños y la GPU (float32) no tiembla.
export function perspectiva(fovy, aspecto, cerca, lejos, o = new Float32Array(16)) {
  const f = 1 / Math.tan(fovy / 2), nf = 1 / (cerca - lejos);
  o.fill(0); o[0] = f / aspecto; o[5] = f; o[10] = (lejos + cerca) * nf; o[11] = -1; o[14] = 2 * lejos * cerca * nf; return o;
}
// vista desde el origen mirando hacia (yaw, pitch): yaw 0 mira a −Z, pitch > 0 mira arriba
export function vista(yaw, pitch, o = new Float32Array(16)) {
  const cp = Math.cos(pitch), f = [Math.sin(yaw) * cp, Math.sin(pitch), -Math.cos(yaw) * cp];
  const r = norm(cruz(f, [0, 1, 0])), u = cruz(r, f);
  o.set([r[0], u[0], -f[0], 0, r[1], u[1], -f[1], 0, r[2], u[2], -f[2], 0, 0, 0, 0, 1]); return o;
}
export function mult(a, b, o = new Float32Array(16)) {
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k]; o[i * 4 + j] = s; }
  return o;
}
export const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
export const adelante = (yaw, pitch) => { const cp = Math.cos(pitch); return [Math.sin(yaw) * cp, Math.sin(pitch), -Math.cos(yaw) * cp]; };
// planos del frustum (Gribb y Hartmann, 2001) a partir de la matriz vista·proyección
export function planos(m, o = new Float32Array(24)) {
  const fila = (i) => [m[i], m[4 + i], m[8 + i], m[12 + i]], r0 = fila(0), r1 = fila(1), r2 = fila(2), r3 = fila(3);
  const P = [r3.map((v, i) => v + r0[i]), r3.map((v, i) => v - r0[i]), r3.map((v, i) => v + r1[i]), r3.map((v, i) => v - r1[i]), r3.map((v, i) => v + r2[i]), r3.map((v, i) => v - r2[i])];
  P.forEach((p, k) => { const l = Math.hypot(p[0], p[1], p[2]) || 1; for (let i = 0; i < 4; i++) o[k * 4 + i] = p[i] / l; });
  return o;
}
// ¿la caja [min, max] (relativa a la cámara) toca el frustum?
export function cajaVisible(pl, x0, y0, z0, x1, y1, z1) {
  for (let k = 0; k < 6; k++) {
    const a = pl[k * 4], b = pl[k * 4 + 1], c = pl[k * 4 + 2], d = pl[k * 4 + 3];
    if (a * (a > 0 ? x1 : x0) + b * (b > 0 ? y1 : y0) + c * (c > 0 ? z1 : z0) + d < 0) return false;
  }
  return true;
}
