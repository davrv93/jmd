// Forja · Anime Battle Engine · física determinista (§9). Unidades: píxeles y CUADROS (60 por segundo), y hacia arriba.
// Se integra con Euler semi-implícito en un paso fijo, así que el resultado no depende del framerate de la pantalla.
// Cajas AABB { x, y, w, h } con (x, y) = esquina inferior izquierda en coordenadas del mundo.
export const FISICA_BASE = { gravedad: 0.82, friccionSuelo: 0.78, friccionAire: 0.985, rebotePared: 0.55, reboteSuelo: 0.5, velMaxCaida: 20, empujeCuerpo: 0.5 };

export const solapan = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

// Swept AABB (barrido): ¿la caja a, moviéndose (dx, dy) en este paso, toca b? Devuelve el instante t ∈ [0, 1] o -1.
// Sirve para proyectiles rápidos que en un paso saltarían por encima de un cuerpo delgado (efecto túnel).
export function barrido(a, dx, dy, b) {
  if (solapan(a, b)) return 0;
  const inv = (d, cerca, lejos) => (d === 0 ? [-Infinity, Infinity] : [cerca / d, lejos / d].sort((p, q) => p - q));
  const [tx0, tx1] = dx === 0 ? (a.x + a.w > b.x && a.x < b.x + b.w ? [-Infinity, Infinity] : [Infinity, -Infinity]) : inv(dx, dx > 0 ? b.x - (a.x + a.w) : b.x + b.w - a.x, dx > 0 ? b.x + b.w - a.x : b.x - (a.x + a.w));
  const [ty0, ty1] = dy === 0 ? (a.y + a.h > b.y && a.y < b.y + b.h ? [-Infinity, Infinity] : [Infinity, -Infinity]) : inv(dy, dy > 0 ? b.y - (a.y + a.h) : b.y + b.h - a.y, dy > 0 ? b.y + b.h - a.y : b.y - (a.y + a.h));
  const entra = Math.max(tx0, ty0), sale = Math.min(tx1, ty1);
  return entra <= sale && entra >= 0 && entra <= 1 ? entra : -1;
}

// Un paso de un cuerpo { x, y, vx, vy, masa, suelo }. limites: { izq, der }. Devuelve eventos de choque.
export function integrar(c, F, limites, { gravedad = true, enSuelo = 'normal' } = {}) {
  const ev = [];
  if (gravedad && !c.suelo) c.vy = Math.max(-F.velMaxCaida, c.vy - F.gravedad * (c.gravedadMul ?? 1));
  c.x += c.vx; c.y += c.vy;
  if (c.suelo) c.vx *= enSuelo === 'libre' ? 1 : F.friccionSuelo; else c.vx *= F.friccionAire;
  if (Math.abs(c.vx) < 0.02) c.vx = 0;
  // suelo
  if (c.y <= 0) {
    if (!c.suelo && c.vy < 0) ev.push({ tipo: 'suelo', v: -c.vy });
    c.y = 0; if (c.vy < 0) c.vy = 0; c.suelo = true;
  } else if (c.y > 0.01) c.suelo = false;
  // paredes del escenario
  const r = c.ancho / 2;
  if (c.x - r < limites.izq) { if (c.vx < -1) ev.push({ tipo: 'pared', lado: -1, v: -c.vx }); c.x = limites.izq + r; if (c.vx < 0) c.vx = 0; }
  if (c.x + r > limites.der) { if (c.vx > 1) ev.push({ tipo: 'pared', lado: 1, v: c.vx }); c.x = limites.der - r; if (c.vx > 0) c.vx = 0; }
  return ev;
}

// Empujón de cuerpos: dos luchadores no se encimen. Reparte la separación según la masa (el pesado se mueve menos).
export function separar(a, b, F, limites) {
  if (Math.abs(a.y - b.y) > Math.max(a.alto, b.alto) * 0.8 || Math.abs((a.z || 0) - (b.z || 0)) > 26) return;
  // +10: las guardias (brazos adelante) son más anchas que el tronco; sin este margen los dibujos se meten uno en otro
  const d = b.x - a.x, min = (a.ancho + b.ancho) / 2 + 10;
  if (Math.abs(d) >= min) return;
  const sol = (min - Math.abs(d)) * F.empujeCuerpo, s = d === 0 ? (a.id < b.id ? 1 : -1) : Math.sign(d);
  const ma = a.masa || 1, mb = b.masa || 1, pa = mb / (ma + mb), pb = ma / (ma + mb);
  a.x -= s * sol * pa * 2; b.x += s * sol * pb * 2;
  for (const c of [a, b]) c.x = Math.min(limites.der - c.ancho / 2, Math.max(limites.izq + c.ancho / 2, c.x));
}

// Impulso de un golpe: el empuje se divide por la masa (relativa a 1).
export function impulso(c, ix, iy) { const m = Math.max(0.4, c.masa || 1); c.vx = ix / m; c.vy = iy / Math.sqrt(m); if (iy > 0) c.suelo = false; }
