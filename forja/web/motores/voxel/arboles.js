// Forja · voxel · árboles con L-systems (A. Lindenmayer, 1968; Prusinkiewicz y Lindenmayer, «The Algorithmic Beauty
// of Plants», 1990). Cada especie es una gramática: un axioma, reglas de reescritura y un ángulo. Se reescribe n veces
// y una «tortuga» 3D interpreta el texto: F avanza poniendo tronco, + - giran, & ^ inclinan, [ ] guardan y recuperan
// la posición, L pone una copa de hojas. El azar de cada árbol sale del hash de su raíz (x, z del mundo): el mismo
// árbol aparece idéntico aunque se cargue primero el chunk vecino.
import { ID } from './bloques.js';

export const ESPECIES = {
  roble:  { axioma: 'TTTB', reglas: { B: 'F[&+FB][&-FB][&FL]L' }, iter: 2, angulo: 38, tronco: 'madera', hojas: 'hojas', copa: 2 },
  roble_grande: { axioma: 'TTTTB', reglas: { B: 'F[&+FB][&-FB][&+FB]L' }, iter: 2, angulo: 34, tronco: 'madera', hojas: 'hojas', copa: 3 },
  abedul: { axioma: 'TTTTTB', reglas: { B: 'F[&+L][&-L]L' }, iter: 1, angulo: 30, tronco: 'abedul', hojas: 'hojas', copa: 2 },
  // jacarandá: tronco claro y copa ancha y aplanada, lila · dorado: tronco claro y hojas de otoño
  jacaranda: { axioma: 'TTTB', reglas: { B: '[&+FFL][&-FFL][&FL]' }, iter: 1, angulo: 44, tronco: 'abedul', hojas: 'hojas_flor', copa: 2, plana: true },
  dorado: { axioma: 'TTTTB', reglas: { B: 'F[&+L][&-L][&L]L' }, iter: 1, angulo: 32, tronco: 'abedul', hojas: 'hojas_oro', copa: 2 },
  acacia: { axioma: 'TTTB', reglas: { B: '[&+FFFL][&-FFL]' }, iter: 1, angulo: 48, tronco: 'madera', hojas: 'hojas', copa: 2, plana: true },
  selva:  { axioma: 'TTTTTTTTB', reglas: { B: 'F[&+FFL][&-FFL][&FFL]L' }, iter: 1, angulo: 42, tronco: 'madera', hojas: 'hojas', copa: 3, lianas: true },
  sauce:  { axioma: 'TTTTB', reglas: { B: '[&&+FFL][&&-FFL][&&FL]L' }, iter: 1, angulo: 50, tronco: 'madera', hojas: 'hojas', copa: 3, colgante: true },
  palma:  { axioma: 'TCTCTCTCTP', reglas: {}, iter: 0, angulo: 0, tronco: 'madera', hojas: 'hojas', palma: true },
  pino:   { conico: true, tronco: 'madera', hojas: 'pino' },
};
export const RADIO_MAX = 5;   // ninguna copa sale más de 5 bloques de su raíz: margen que mira cada chunk

export function lsistema(axioma, reglas, iter) {
  let s = axioma;
  for (let i = 0; i < iter; i++) { let n = ''; for (const c of s) n += reglas[c] ?? c; s = n; }
  return s;
}

// Rocas: un canto rodado de 1 a 3 bloques de radio, medio enterrado (dy desde −1), con musgo arriba si se pide.
// material: 'piedra' | 'arenisca' | 'musgosa' | 'arcilla' · devuelve [[dx, dy, dz, id], …] como arbol()
export function roca(h, material = 'piedra') {
  let r = h >>> 0 || 7; const azar = () => { r ^= r << 13; r ^= r >>> 17; r ^= r << 5; return (r >>> 0) / 4294967296; };
  const out = [], base = ID[material] ?? ID.piedra, rad = 1.35 + azar() * 1.25, alto = 0.65 + azar() * 0.45, musgo = material === 'musgosa' || material === 'piedra';
  const R = Math.ceil(rad);
  for (let dy = -1; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) for (let dz = -R; dz <= R; dz++) {
    const d = (dx * dx) / (rad * rad) + ((dy + 0.5) * (dy + 0.5)) / (rad * rad * alto * alto) + (dz * dz) / (rad * rad);
    if (d > 1 + (azar() - 0.5) * 0.35) continue;
    const arriba = (dx * dx) / (rad * rad) + ((dy + 1.5) * (dy + 1.5)) / (rad * rad * alto * alto) + (dz * dz) / (rad * rad) > 1;
    out.push([dx, dy, dz, musgo && arriba && azar() < 0.55 ? ID.musgosa : azar() < 0.15 && material === 'piedra' ? ID.grava : base]);
  }
  return out;
}

// Devuelve [[dx, dy, dz, id], …] relativo a la raíz. h: hash de 32 bits de la raíz. nevado: pone nieve arriba.
export function arbol(especie, h, nevado = false) {
  const E = ESPECIES[especie] || ESPECIES.roble, out = new Map(), madera = ID[E.tronco], hoja = ID[E.hojas];
  let r = h >>> 0; const azar = () => { r ^= r << 13; r ^= r >>> 17; r ^= r << 5; return (r >>> 0) / 4294967296; };
  const pon = (x, y, z, id, fuerte = true) => { if (Math.abs(x) > RADIO_MAX || Math.abs(z) > RADIO_MAX || y < 0) return; const k = `${x},${y},${z}`; if (fuerte || !out.has(k)) out.set(k, [x, y, z, id]); };
  const copa = (cx, cy, cz, rad) => {
    for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) for (let dz = -rad; dz <= rad; dz++) {
      const d = dx * dx + (E.plana ? dy * dy * 4 : dy * dy) + dz * dz; if (d > rad * rad + 1) continue;
      if (d > (rad - 1) * (rad - 1) + 1 && azar() < 0.3) continue;   // borde irregular
      pon(cx + dx, cy + dy, cz + dz, hoja, false);
    }
    if (E.colgante) for (let k = 0; k < 6; k++) { const a = azar() * 6.283, x = Math.round(cx + Math.cos(a) * rad), z = Math.round(cz + Math.sin(a) * rad); for (let y = 1; y <= 2 + (azar() * 3 | 0); y++) pon(x, cy - y, z, hoja, false); }
    // lianas de la selva: cuelgan del borde de la copa (enredaderas, se pueden trepar)
    if (E.lianas && ID.enredadera) for (let k = 0; k < 4; k++) { const a = azar() * 6.283, x = Math.round(cx + Math.cos(a) * (rad + 1)), z = Math.round(cz + Math.sin(a) * (rad + 1)); for (let y = 0; y <= 2 + (azar() * 4 | 0); y++) pon(x, cy - y, z, ID.enredadera, false); }
    if (nevado) pon(cx, cy + rad + 1, cz, ID.nieve, false);
  };
  if (E.conico) {   // pino: tronco alto y discos de hojas que se achican hacia la punta
    const alto = 7 + (azar() * 5 | 0);
    for (let y = 0; y < alto; y++) pon(0, y, 0, madera);
    for (let y = 3; y <= alto + 1; y++) { const rad = Math.max(0, Math.round((alto + 1 - y) * 0.45)) - ((y & 1) ? 0 : 1); for (let dx = -rad; dx <= rad; dx++) for (let dz = -rad; dz <= rad; dz++) if (dx * dx + dz * dz <= rad * rad + 0.5 && (dx || dz || y >= alto)) pon(dx, y, dz, hoja, false); }
    pon(0, alto + 1, 0, hoja); if (nevado) pon(0, alto + 2, 0, ID.nieve);
    return [...out.values()];
  }
  if (E.palma) {   // tronco curvo (C desplaza) y hojas en estrella
    let x = 0, z = 0, y = 0; const dx = azar() < 0.5 ? 1 : -1, ex = azar() < 0.5;
    for (const c of E.axioma) { if (c === 'T') pon(x, y++, z, madera); else if (c === 'C' && azar() < 0.4) { if (ex) x += dx; else z += dx; } }
    for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) for (let k = 1; k <= 3; k++) pon(x + a * k, y - (k === 3 ? 1 : 0), z + b * k, hoja, false);
    pon(x, y, z, hoja);
    return [...out.values()];
  }
  const texto = lsistema(E.axioma, E.reglas, E.iter).replace(/B/g, 'L');
  const pila = []; let px = 0, py = 0, pz = 0, guiada = 0, cabeceo = 0;
  const ang = (E.angulo * Math.PI) / 180;
  for (const c of texto) {
    if (c === 'T') { pon(Math.round(px), Math.round(py), Math.round(pz), madera); py += 1; }
    else if (c === 'F') {
      const vx = Math.sin(cabeceo) * Math.cos(guiada), vz = Math.sin(cabeceo) * Math.sin(guiada), vy = Math.cos(cabeceo);
      for (let k = 0; k < 2; k++) { pon(Math.round(px), Math.round(py), Math.round(pz), madera); px += vx; py += vy; pz += vz; }
    } else if (c === '+') guiada += ang + (azar() - 0.5) * 0.9;
    else if (c === '-') guiada -= ang + (azar() - 0.5) * 0.9;
    else if (c === '&') cabeceo += ang * (0.7 + azar() * 0.5);
    else if (c === '^') cabeceo -= ang;
    else if (c === '[') pila.push([px, py, pz, guiada, cabeceo]);
    else if (c === ']') [px, py, pz, guiada, cabeceo] = pila.pop();
    else if (c === 'L') copa(Math.round(px), Math.round(py), Math.round(pz), E.copa);
    if (c === '[') guiada += azar() * 6.283;   // cada rama sale hacia otro lado
  }
  return [...out.values()];
}
