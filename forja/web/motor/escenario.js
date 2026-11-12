// Forja · escenarios por reglas. Para un ambiente y una hora genera: cielo, tres capas de fondo que se repiten
// horizontalmente (para el desplazamiento con paralaje) y las losetas de suelo y plataforma. Lienzo 2D, con semilla.
import { azar } from './resolver.js';

const ANCHO = 960, ALTO = 540, LOSA = 64;
const c3 = ([h, s, l], dl = 0, a = 1) => `hsla(${h}, ${Math.round(s * 100)}%, ${Math.round(Math.max(3, Math.min(97, (l + dl) * 100)))}%, ${a})`;
const lienzo = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };

// perfil periódico: suma de senos cuyas frecuencias son enteras sobre el ancho, así el borde izquierdo y el derecho coinciden
function perfil(r, rug) { const k = Array.from({ length: 5 }, (_, i) => [i + 1 + Math.floor(r() * 2), r() * 6.283, (0.5 + r() * 0.5) / (i + 1) ** (1.6 - rug)]); const tot = k.reduce((s, x) => s + x[2], 0); return (x) => k.reduce((s, [f, p, a]) => s + a * Math.sin(x / ANCHO * 6.283 * f + p), 0) / tot * 0.5 + 0.5; }

export function generarEscenario(R, ambiente, hora = 'dia', semilla = 1) {
  const T = R.T, col = (capa) => T.escenario[`${ambiente}|${hora}|${capa}`], r = azar(semilla * 53 + 11);
  // ---- cielo
  const [cielo, cx] = lienzo(ANCHO, ALTO), cc = col('cielo');
  const g = cx.createLinearGradient(0, 0, 0, ALTO); g.addColorStop(0, c3(cc, -0.16)); g.addColorStop(0.75, c3(cc, 0.08)); g.addColorStop(1, c3([cc[0] + 20, cc[1], cc[2]], 0.16));
  cx.fillStyle = g; cx.fillRect(0, 0, ANCHO, ALTO);
  const deNoche = hora === 'noche' || ambiente === 'noche' || ambiente === 'cueva';
  if (ambiente !== 'cueva') {
    if (deNoche) { cx.fillStyle = 'rgba(255,255,255,.85)'; for (let i = 0; i < 90; i++) { const s = r() * 1.8 + 0.4; cx.globalAlpha = 0.3 + r() * 0.7; cx.fillRect(r() * ANCHO, r() * ALTO * 0.7, s, s); } cx.globalAlpha = 1; }
    const ax = ANCHO * (0.62 + r() * 0.25), ay = ALTO * (hora === 'tarde' || hora === 'amanecer' ? 0.5 : 0.2), ar = 44;
    const halo = cx.createRadialGradient(ax, ay, ar * 0.5, ax, ay, ar * 3.2); halo.addColorStop(0, deNoche ? 'rgba(220,230,255,.35)' : 'rgba(255,240,190,.55)'); halo.addColorStop(1, 'rgba(255,255,255,0)');
    cx.fillStyle = halo; cx.fillRect(0, 0, ANCHO, ALTO);
    cx.fillStyle = deNoche ? '#eef2ff' : hora === 'dia' ? '#fff6c9' : '#ffd08a'; cx.beginPath(); cx.arc(ax, ay, ar, 0, 6.283); cx.fill();
    if (deNoche) { cx.fillStyle = c3(cc, -0.1); cx.beginPath(); cx.arc(ax + 16, ay - 8, ar * 0.86, 0, 6.283); cx.fill(); }
  }
  // ---- capas con relieve
  const capas = ['lejos', 'medio', 'cerca'].map((nombre, i) => {
    const [cv, x] = lienzo(ANCHO, ALTO), [forma, altura, dens, rug] = T.relieve[`${ambiente}|${nombre}`], c = col(nombre), base = ALTO * (0.52 + i * 0.16), amp = ALTO * altura;
    const p = perfil(r, rug);
    x.fillStyle = c3(c);
    if (forma === 4) { // cueva: techo con estalactitas y piso
      x.beginPath(); x.moveTo(0, 0); for (let px = 0; px <= ANCHO; px += 6) x.lineTo(px, amp * 0.5 * p(px) + (Math.abs(Math.sin(px / ANCHO * 6.283 * (8 + i * 3))) ** 6) * amp * 0.7); x.lineTo(ANCHO, 0); x.fill();
    }
    x.beginPath(); x.moveTo(0, ALTO);
    for (let px = 0; px <= ANCHO; px += 4) {
      let y = base - amp * p(px) * (forma === 3 ? 0.6 : 1);
      if (forma === 1) y -= amp * 0.5 * Math.abs(((px / ANCHO * (6 + i * 2)) % 1) - 0.5) * 2 * p(px);
      x.lineTo(px, y);
    }
    x.lineTo(ANCHO, ALTO); x.fill();
    // elementos sobre la capa: árboles, edificios, cactus, pinos, rocas
    const n = Math.round(dens * (5 + i * 4)), paso = ANCHO / n;
    for (let k = 0; k < n; k++) {
      const px = k * paso + paso * (0.2 + r() * 0.6), y0 = base - amp * p(px) * (forma === 3 ? 0.6 : 1), esc = (0.5 + i * 0.35) * (0.7 + r() * 0.6);
      x.fillStyle = c3(c, -0.05 - r() * 0.05);
      if (forma === 2) { const w = 30 * esc + r() * 30, h = 60 * esc + r() * 150 * esc; x.fillRect(px - w / 2, y0 - h, w, h + 40); x.fillStyle = c3([50, 0.9, 0.7], 0, deNoche ? 0.8 : 0.25); for (let wy = y0 - h + 8; wy < y0 - 6; wy += 14) for (let wx = px - w / 2 + 5; wx < px + w / 2 - 6; wx += 11) if (r() < 0.45) x.fillRect(wx, wy, 5, 7); }
      else if (ambiente === 'bosque' || ambiente === 'noche' || ambiente === 'cielo') { x.fillRect(px - 3 * esc, y0 - 34 * esc, 6 * esc, 40 * esc); x.beginPath(); x.arc(px, y0 - 50 * esc, 26 * esc, 0, 6.283); x.arc(px - 16 * esc, y0 - 36 * esc, 18 * esc, 0, 6.283); x.arc(px + 16 * esc, y0 - 36 * esc, 18 * esc, 0, 6.283); x.fill(); }
      else if (ambiente === 'nieve') { for (let t = 0; t < 3; t++) { x.beginPath(); x.moveTo(px, y0 - (80 - t * 4) * esc); x.lineTo(px - (14 + t * 9) * esc, y0 - (48 - t * 22) * esc); x.lineTo(px + (14 + t * 9) * esc, y0 - (48 - t * 22) * esc); x.fill(); } }
      else if (ambiente === 'desierto') { x.beginPath(); x.roundRect(px - 6 * esc, y0 - 56 * esc, 12 * esc, 60 * esc, 6 * esc); x.roundRect(px - 22 * esc, y0 - 40 * esc, 9 * esc, 24 * esc, 4 * esc); x.roundRect(px + 13 * esc, y0 - 46 * esc, 9 * esc, 26 * esc, 4 * esc); x.fill(); x.fillRect(px - 22 * esc, y0 - 22 * esc, 20 * esc, 7 * esc); x.fillRect(px + 2 * esc, y0 - 26 * esc, 20 * esc, 7 * esc); }
      else { x.beginPath(); x.moveTo(px - 26 * esc, y0 + 6); x.lineTo(px - 8 * esc, y0 - 36 * esc); x.lineTo(px + 10 * esc, y0 - 22 * esc); x.lineTo(px + 28 * esc, y0 + 6); x.fill(); if (ambiente === 'lava' && r() < 0.5) { x.fillStyle = c3([24, 1, 0.58], 0, 0.9); x.beginPath(); x.arc(px - 6 * esc, y0 - 38 * esc, 5 * esc, 0, 6.283); x.fill(); } }
    }
    return cv;
  });
  // ---- losetas: [suelo con borde, relleno, plataforma izquierda, centro, derecha]
  const [losas, lx] = lienzo(LOSA * 5, LOSA), cs = col('suelo'), cp = col('plataforma');
  const borde = { noche: [150, 0.5, 0.42], bosque: [110, 0.6, 0.45], cielo: [100, 0.6, 0.55], desierto: [40, 0.7, 0.72], nieve: [200, 0.3, 0.96], cueva: [270, 0.15, 0.42], ciudad: [0, 0, 0.6], lava: [20, 0.95, 0.52] }[ambiente];
  const motas = (ox, c, n) => { for (let i = 0; i < n; i++) { lx.fillStyle = c3(c, (r() - 0.5) * 0.12); const w = 4 + r() * 9; lx.beginPath(); lx.roundRect(ox + r() * (LOSA - w), 16 + r() * (LOSA - 22), w, w * 0.7, 2); lx.fill(); } };
  for (const ox of [0, LOSA]) { lx.fillStyle = c3(cs); lx.fillRect(ox, 0, LOSA, LOSA); motas(ox, cs, 9); }
  lx.fillStyle = c3(borde); lx.fillRect(0, 0, LOSA, 13); lx.fillStyle = c3(borde, -0.1);
  for (let px = 0; px < LOSA; px += 8) { lx.beginPath(); lx.moveTo(px, 12); lx.lineTo(px + 4, 12 + 5 + r() * 5); lx.lineTo(px + 8, 12); lx.fill(); }
  lx.fillStyle = c3(borde, 0.14); lx.fillRect(0, 0, LOSA, 3);
  for (const [i, forma] of [['izq', 2], ['cen', 3], ['der', 4]].map(([f, k]) => [k, f])) {
    const ox = i * LOSA; lx.fillStyle = c3(cp); lx.beginPath(); lx.roundRect(ox, 0, LOSA, 30, forma === 'izq' ? [14, 0, 0, 14] : forma === 'der' ? [0, 14, 14, 0] : 0); lx.fill();
    lx.fillStyle = c3(borde); lx.beginPath(); lx.roundRect(ox, 0, LOSA, 10, forma === 'izq' ? [14, 0, 0, 0] : forma === 'der' ? [0, 14, 0, 0] : 0); lx.fill();
    lx.fillStyle = c3(cp, -0.14); lx.fillRect(ox + (forma === 'izq' ? 12 : 0), 26, LOSA - (forma === 'cen' ? 0 : 12), 4);
  }
  return { cielo, capas, losas, losa: LOSA, ancho: ANCHO, alto: ALTO, ambiente, hora };
}

// recorta una loseta a su propio lienzo (para exportarla como PNG suelto)
export function recorte(esc, indice, alto = esc.losa) { const [c, x] = lienzo(esc.losa, alto); x.drawImage(esc.losas, indice * esc.losa, 0, esc.losa, alto, 0, 0, esc.losa, alto); return c; }
