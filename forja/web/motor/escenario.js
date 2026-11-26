// Forja · escenarios por reglas. Para un ambiente y una hora genera: cielo, tres capas de fondo que se repiten
// horizontalmente (para el desplazamiento con paralaje) y las losetas de suelo y plataforma. Lienzo 2D, con semilla.
// Los colores salen de la tabla «escenario» (ambiente|hora|capa) y de la forma del relieve (tabla «relieve»).
// Sobre esos colores se aplica un poco de dirección de arte: perspectiva aérea (lo lejano se funde con el cielo),
// luz del sol o de la luna en las crestas, nubes con volumen y losetas con bisel, brillo y sombra.
import { azar } from './resolver.js';

const ANCHO = 960, ALTO = 540, LOSA = 64;
const lienzo = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };

// ---- color en RGB: se mezcla mejor que en HSL (no da vueltas por el círculo de tonos)
function rgb([h, s, l]) {
  h = ((h % 360) + 360) % 360 / 360; const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = (t) => { t = (t + 1) % 1; return 255 * (t < 1 / 6 ? p + (q - p) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p); };
  return [f(h + 1 / 3), f(h), f(h - 1 / 3)];
}
const mezcla = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const claro = (c, k) => mezcla(c, [255, 255, 255], k), oscuro = (c, k) => mezcla(c, [0, 0, 0], k);
const satura = (c, k) => { const y = c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11; return c.map((v) => Math.max(0, Math.min(255, y + (v - y) * k))); };   // más (k > 1) o menos color
const css = (c, a = 1) => `rgba(${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])}, ${a})`;

// Cielos de referencia por hora (cenit, medio, horizonte). El color de la regla se mezcla encima: el ambiente manda el tono.
const CIELOS = {
  dia: [[62, 118, 214], [118, 176, 238], [214, 234, 250]],
  tarde: [[58, 62, 138], [214, 120, 104], [255, 196, 128]],
  noche: [[8, 10, 30], [22, 26, 62], [52, 56, 104]],
  amanecer: [[66, 86, 164], [220, 146, 172], [255, 214, 178]],
};

// perfil periódico: suma de senos cuyas frecuencias son enteras sobre el ancho, así el borde izquierdo y el derecho coinciden
function perfil(r, rug) { const k = Array.from({ length: 5 }, (_, i) => [i + 1 + Math.floor(r() * 2), r() * 6.283, (0.5 + r() * 0.5) / (i + 1) ** (1.6 - rug)]); const tot = k.reduce((s, x) => s + x[2], 0); return (x) => k.reduce((s, [f, p, a]) => s + a * Math.sin(x / ANCHO * 6.283 * f + p), 0) / tot * 0.5 + 0.5; }
// dibuja algo cerca del borde también del otro lado: la capa se repite sin costura
const envolver = (px, margen, fn) => { fn(px); if (px < margen) fn(px + ANCHO); if (px > ANCHO - margen) fn(px - ANCHO); };

// nube: óvalos que se solapan, iluminados arriba y en sombra abajo
function nube(x, cx, cy, w, h, luz, sombra, alfa, r) {
  const g = x.createLinearGradient(0, cy - h, 0, cy + h * 0.6); g.addColorStop(0, css(luz, alfa)); g.addColorStop(0.55, css(mezcla(luz, sombra, 0.45), alfa)); g.addColorStop(1, css(sombra, alfa * 0.85));
  x.fillStyle = g; x.beginPath();
  const n = 5 + Math.floor(r() * 4);
  for (let i = 0; i < n; i++) { const u = i / (n - 1), bx = cx - w / 2 + u * w, bh = h * (0.45 + Math.sin(u * Math.PI) * (0.55 + r() * 0.35)); x.moveTo(bx + bh, cy); x.ellipse(bx, cy - bh * 0.35, bh * (1.1 + r() * 0.4), bh, 0, 0, 6.283); }
  x.rect(cx - w / 2, cy - h * 0.2, w, h * 0.45); x.fill();
}

export function generarEscenario(R, ambiente, hora = 'dia', semilla = 1) {
  const T = R.T, col = (capa) => T.escenario[`${ambiente}|${hora}|${capa}`], r = azar(semilla * 53 + 11);
  const deNoche = hora === 'noche' || ambiente === 'noche' || ambiente === 'cueva', cueva = ambiente === 'cueva';
  // ---- cielo
  const [cielo, cx] = lienzo(ANCHO, ALTO), cc = rgb(col('cielo')), ref = CIELOS[deNoche ? 'noche' : hora] || CIELOS.dia;
  const peso = deNoche ? 0.5 : 0.6;                                                   // cuánto manda el color de la regla
  const cenit = satura(mezcla(ref[0], oscuro(cc, 0.3), peso), 1.3), medio = satura(mezcla(ref[1], cc, peso), 1.25), horizonte = satura(mezcla(ref[2], claro(cc, 0.3), peso * 0.85), 1.15);
  const sol = { x: ANCHO * (0.62 + r() * 0.25), y: ALTO * (hora === 'tarde' || hora === 'amanecer' ? 0.47 : 0.2), r: 40 };
  {
    const g = cx.createLinearGradient(0, 0, 0, ALTO); g.addColorStop(0, css(cenit)); g.addColorStop(0.45, css(medio)); g.addColorStop(0.78, css(horizonte)); g.addColorStop(1, css(claro(horizonte, 0.15)));
    cx.fillStyle = g; cx.fillRect(0, 0, ANCHO, ALTO);
  }
  const luzSol = deNoche ? [214, 226, 255] : hora === 'tarde' ? [255, 184, 112] : hora === 'amanecer' ? [255, 200, 190] : [255, 246, 214];
  if (cueva) { // dentro de la cueva: un resplandor que viene de lejos y polvo flotando
    const g = cx.createRadialGradient(sol.x, ALTO * 0.55, 10, sol.x, ALTO * 0.55, ALTO * 0.9); g.addColorStop(0, css(claro(cc, 0.25), 0.55)); g.addColorStop(1, css(cc, 0));
    cx.fillStyle = g; cx.fillRect(0, 0, ANCHO, ALTO);
    for (let i = 0; i < 70; i++) { cx.fillStyle = css(claro(cc, 0.6), 0.15 + r() * 0.3); const s = 0.6 + r() * 1.6; cx.fillRect(r() * ANCHO, r() * ALTO, s, s); }
  } else {
    if (deNoche) { // estrellas de tres tamaños, unas pocas con destello, y una franja tenue de la vía láctea
      cx.save(); cx.translate(ANCHO * 0.5, ALTO * 0.3); cx.rotate(-0.35);
      const v = cx.createLinearGradient(0, -70, 0, 70); v.addColorStop(0, 'rgba(255,255,255,0)'); v.addColorStop(0.5, css(claro(medio, 0.5), 0.12)); v.addColorStop(1, 'rgba(255,255,255,0)');
      cx.fillStyle = v; cx.fillRect(-700, -70, 1400, 140);
      for (let i = 0; i < 160; i++) { cx.fillStyle = `rgba(255,255,255,${0.15 + r() * 0.35})`; cx.fillRect((r() - 0.5) * 1300, (r() - 0.5) * 120, 1, 1); }
      cx.restore();
      for (let i = 0; i < 150; i++) {
        const px = r() * ANCHO, py = r() * ALTO * 0.72, s = r() < 0.85 ? 0.6 + r() * 1.1 : 1.6 + r() * 1.2;
        cx.globalAlpha = (0.3 + r() * 0.7) * (1 - py / (ALTO * 0.9)); cx.fillStyle = r() < 0.2 ? '#ffe7c4' : r() < 0.3 ? '#cfe0ff' : '#ffffff';
        cx.beginPath(); cx.arc(px, py, s, 0, 6.283); cx.fill();
        if (s > 2.2) { cx.globalAlpha *= 0.5; cx.fillRect(px - s * 3, py - 0.5, s * 6, 1); cx.fillRect(px - 0.5, py - s * 3, 1, s * 6); }
      }
      cx.globalAlpha = 1;
    }
    // resplandor del horizonte en la tarde y el amanecer
    if (!deNoche && hora !== 'dia') {
      const g = cx.createRadialGradient(sol.x, sol.y, 20, sol.x, sol.y, ANCHO * 0.75); g.addColorStop(0, css(luzSol, 0.55)); g.addColorStop(0.4, css(luzSol, 0.18)); g.addColorStop(1, css(luzSol, 0));
      cx.fillStyle = g; cx.fillRect(0, 0, ANCHO, ALTO);
    }
    // sol o luna, con halo
    const halo = cx.createRadialGradient(sol.x, sol.y, sol.r * 0.6, sol.x, sol.y, sol.r * (deNoche ? 3.4 : 4.5));
    halo.addColorStop(0, css(luzSol, deNoche ? 0.32 : 0.6)); halo.addColorStop(0.35, css(luzSol, deNoche ? 0.1 : 0.2)); halo.addColorStop(1, css(luzSol, 0));
    cx.fillStyle = halo; cx.fillRect(0, 0, ANCHO, ALTO);
    if (deNoche) {
      const [lu, l] = lienzo(sol.r * 2 + 4, sol.r * 2 + 4), m = sol.r + 2;                // la luna en su propio lienzo: el creciente se recorta
      const d = l.createRadialGradient(m - 12, m - 12, 4, m, m, sol.r); d.addColorStop(0, '#fbfcff'); d.addColorStop(1, '#d4dcf0');
      l.fillStyle = d; l.beginPath(); l.arc(m, m, sol.r, 0, 6.283); l.fill();
      l.fillStyle = 'rgba(140,150,185,.28)'; for (const [dx, dy, rr] of [[-14, 8, 8], [-4, -16, 4], [-20, -6, 3], [-8, 20, 5]]) { l.beginPath(); l.arc(m + dx, m + dy, rr, 0, 6.283); l.fill(); }
      l.globalCompositeOperation = 'destination-out'; l.fillStyle = '#000'; l.beginPath(); l.arc(m + 17, m - 9, sol.r * 0.84, 0, 6.283); l.fill();
      cx.drawImage(lu, sol.x - m, sol.y - m);
    } else {
      const d = cx.createRadialGradient(sol.x, sol.y, 0, sol.x, sol.y, sol.r); d.addColorStop(0, '#fffdf2'); d.addColorStop(0.7, css(claro(luzSol, 0.4))); d.addColorStop(1, css(luzSol, 0.9));
      cx.fillStyle = d; cx.beginPath(); cx.arc(sol.x, sol.y, sol.r, 0, 6.283); cx.fill();
    }
    // nubes con volumen: arriba les da la luz, abajo quedan en sombra
    const nNubes = deNoche ? 4 : ambiente === 'desierto' ? 3 : 7;
    for (let i = 0; i < nNubes; i++) {
      const w = 120 + r() * 200, h = 22 + r() * 26, ny = ALTO * (0.08 + r() * 0.42), lejos = ny / (ALTO * 0.5);
      const luz = deNoche ? mezcla(medio, luzSol, 0.35) : claro(luzSol, 0.5), som = deNoche ? oscuro(cenit, 0.2) : mezcla(horizonte, medio, 0.55 + 0.2 * lejos);
      nube(cx, (i + r() * 0.7) * ANCHO / nNubes, ny, w * (1.1 - lejos * 0.35), h * (1.1 - lejos * 0.3), luz, som, deNoche ? 0.4 : 0.78 - lejos * 0.2, r);
    }
  }
  // ---- capas con relieve: lo lejano se funde con el color del horizonte (perspectiva aérea)
  const bruma = [0.5, 0.26, 0.1];
  const capas = ['lejos', 'medio', 'cerca'].map((nombre, i) => {
    const [cv, x] = lienzo(ANCHO, ALTO), [forma, altura, dens, rug] = T.relieve[`${ambiente}|${nombre}`], base = ALTO * (0.52 + i * 0.16), amp = ALTO * altura;
    const c = mezcla(rgb(col(nombre)), horizonte, bruma[i] * (cueva ? 0.4 : ambiente === 'lava' ? 0.55 : 1)), arriba = mezcla(c, luzSol, deNoche ? 0.06 : 0.14), abajo = mezcla(c, horizonte, cueva ? 0.1 : 0.22 + bruma[i] * 0.4);
    const p = perfil(r, rug), alto = (px) => {
      let y = base - amp * p(px) * (forma === 3 ? 0.6 : 1);
      if (forma === 1) y -= amp * 0.5 * Math.abs(((px / ANCHO * (6 + i * 2)) % 1) - 0.5) * 2 * p(px);
      return y;
    };
    if (forma === 4) { // cueva: techo con estalactitas
      x.fillStyle = css(oscuro(c, 0.15)); x.beginPath(); x.moveTo(0, 0);
      for (let px = 0; px <= ANCHO; px += 6) x.lineTo(px, amp * 0.5 * p(px) + (Math.abs(Math.sin(px / ANCHO * 6.283 * (8 + i * 3))) ** 6) * amp * 0.7);
      x.lineTo(ANCHO, 0); x.fill();
    }
    let techo = ALTO;
    const silueta = new Path2D(), cresta = new Path2D(); silueta.moveTo(0, ALTO);
    for (let px = 0; px <= ANCHO; px += 4) { const y = alto(px); techo = Math.min(techo, y); silueta.lineTo(px, y); px ? cresta.lineTo(px, y) : cresta.moveTo(px, y); }
    silueta.lineTo(ANCHO, ALTO); silueta.closePath();
    const g = x.createLinearGradient(0, techo, 0, Math.min(ALTO, base + 60)); g.addColorStop(0, css(arriba)); g.addColorStop(1, css(abajo));
    x.fillStyle = g; x.fill(silueta);
    x.save(); x.clip(silueta);
    if (forma === 1 && ambiente === 'nieve') { // nieve en las cumbres: todo lo que queda por encima de una línea ondulada
      const linea = (px) => base - amp * (0.66 + 0.05 * Math.sin(px / ANCHO * 6.283 * 9) + 0.025 * Math.sin(px / ANCHO * 6.283 * 23));
      x.fillStyle = css(claro(c, 0.72), 0.9); x.beginPath(); x.moveTo(0, 0);
      for (let px = 0; px <= ANCHO; px += 4) x.lineTo(px, linea(px));
      x.lineTo(ANCHO, 0); x.closePath(); x.fill();
    }
    x.lineWidth = 3; x.strokeStyle = css(claro(arriba, deNoche ? 0.25 : 0.4), deNoche ? 0.35 : 0.55); x.translate(0, 1.5); x.stroke(cresta); x.restore();
    // elementos sobre la capa: árboles, edificios, cactus, pinos, rocas (cada uno con su lado iluminado)
    const n = Math.round(dens * (5 + i * 4)), paso = ANCHO / n, ladoLuz = (px) => (sol.x > px ? 1 : -1);
    for (let k = 0; k < n; k++) {
      const px0 = k * paso + paso * (0.2 + r() * 0.6), esc = (0.5 + i * 0.35) * (0.7 + r() * 0.6), tono = -0.05 - r() * 0.06, alea = r(), alea2 = r();
      const base0 = oscuro(c, -tono), luz = mezcla(base0, luzSol, deNoche ? 0.12 : 0.28), som = oscuro(base0, 0.25);
      envolver(px0, 80, (px) => {
        const y0 = alto(px), L = ladoLuz(px);
        if (forma === 2) { // edificio con azotea y ventanas encendidas
          const w = 30 * esc + alea * 30, h = 60 * esc + alea2 * 150 * esc;
          x.fillStyle = css(base0); x.fillRect(px - w / 2, y0 - h, w, h + 40);
          x.fillStyle = css(luz, 0.5); x.fillRect(L > 0 ? px + w / 2 - 4 : px - w / 2, y0 - h, 4, h + 40);
          x.fillStyle = css(oscuro(base0, 0.2)); x.fillRect(px - w / 2 - 2, y0 - h - 3, w + 4, 4);
          if (alea > 0.6) { x.fillRect(px - 1, y0 - h - 16, 2, 14); }
          const r2 = azar(Math.floor(px0 * 7) + k);
          for (let wy = y0 - h + 8; wy < y0 - 6; wy += 14) for (let wx = px - w / 2 + 5; wx < px + w / 2 - 6; wx += 11) if (r2() < 0.45) { x.fillStyle = deNoche ? `rgba(255, ${200 + Math.floor(r2() * 40)}, 120, ${0.55 + r2() * 0.4})` : css(claro(base0, 0.3), 0.35); x.fillRect(wx, wy, 5, 7); }
        } else if (ambiente === 'bosque' || ambiente === 'noche' || ambiente === 'cielo') { // árbol de copa redonda (o pino en el bosque)
          if (ambiente === 'bosque' && alea > 0.62) {
            x.fillStyle = css(som); x.fillRect(px - 2.5 * esc, y0 - 12 * esc, 5 * esc, 16 * esc);
            for (let t = 0; t < 4; t++) { const ty = y0 - (14 + t * 16) * esc, tw = (26 - t * 5) * esc; x.fillStyle = css(base0); x.beginPath(); x.moveTo(px - tw, ty); x.lineTo(px, ty - 24 * esc); x.lineTo(px + tw, ty); x.fill(); x.fillStyle = css(luz, 0.6); x.beginPath(); x.moveTo(px, ty - 24 * esc); x.lineTo(px + tw * L, ty); x.lineTo(px + tw * 0.3 * L, ty); x.fill(); }
          } else {
            x.fillStyle = css(som); x.fillRect(px - 3 * esc, y0 - 34 * esc, 6 * esc, 40 * esc);
            const copa = (dx, dy, rr) => { x.beginPath(); x.arc(px + dx * esc, y0 + dy * esc, rr * esc, 0, 6.283); x.fill(); };
            x.fillStyle = css(base0); copa(0, -50, 26); copa(-16, -36, 18); copa(16, -36, 18);
            x.fillStyle = css(luz, 0.55); copa(8 * L, -56, 15); copa(18 * L, -40, 9);
            x.fillStyle = css(som, 0.5); copa(-12 * L, -30, 12);
          }
        } else if (ambiente === 'nieve') { // pino con nieve en las ramas
          x.fillStyle = css(som); x.fillRect(px - 2.5 * esc, y0 - 14 * esc, 5 * esc, 18 * esc);
          for (let t = 0; t < 3; t++) {
            const ty = y0 - (48 - t * 22) * esc, tw = (14 + t * 9) * esc;
            x.fillStyle = css(base0); x.beginPath(); x.moveTo(px, y0 - (80 - t * 4) * esc); x.lineTo(px - tw, ty); x.lineTo(px + tw, ty); x.fill();
            x.fillStyle = 'rgba(250,252,255,.85)'; x.beginPath(); x.moveTo(px - tw, ty); x.quadraticCurveTo(px, ty - 7 * esc, px + tw, ty); x.lineTo(px + tw * 0.8, ty + 2); x.quadraticCurveTo(px, ty - 3 * esc, px - tw * 0.8, ty + 2); x.fill();
          }
        } else if (ambiente === 'desierto') { // cactus con su lado al sol
          x.fillStyle = css(base0); x.beginPath(); x.roundRect(px - 6 * esc, y0 - 56 * esc, 12 * esc, 60 * esc, 6 * esc); x.roundRect(px - 22 * esc, y0 - 40 * esc, 9 * esc, 24 * esc, 4 * esc); x.roundRect(px + 13 * esc, y0 - 46 * esc, 9 * esc, 26 * esc, 4 * esc); x.fill(); x.fillRect(px - 22 * esc, y0 - 22 * esc, 20 * esc, 7 * esc); x.fillRect(px + 2 * esc, y0 - 26 * esc, 20 * esc, 7 * esc);
          x.fillStyle = css(luz, 0.6); x.fillRect(px + (L > 0 ? 1 : -4) * esc, y0 - 52 * esc, 3 * esc, 52 * esc);
        } else { // roca con brillo arriba (y lava encendida en las grietas)
          x.fillStyle = css(base0); x.beginPath(); x.moveTo(px - 26 * esc, y0 + 6); x.lineTo(px - 8 * esc, y0 - 36 * esc); x.lineTo(px + 10 * esc, y0 - 22 * esc); x.lineTo(px + 28 * esc, y0 + 6); x.fill();
          x.fillStyle = css(luz, 0.5); x.beginPath(); x.moveTo(px - 8 * esc, y0 - 36 * esc); x.lineTo(px + (L > 0 ? 10 : -26) * esc, L > 0 ? y0 - 22 * esc : y0 + 6); x.lineTo(px - 2 * esc, y0 - 14 * esc); x.fill();
          if (ambiente === 'lava' && alea < 0.5) { const gl = x.createRadialGradient(px - 6 * esc, y0 - 38 * esc, 1, px - 6 * esc, y0 - 38 * esc, 16 * esc); gl.addColorStop(0, 'rgba(255,190,90,.95)'); gl.addColorStop(0.4, 'rgba(255,110,40,.5)'); gl.addColorStop(1, 'rgba(255,80,20,0)'); x.fillStyle = gl; x.fillRect(px - 30 * esc, y0 - 60 * esc, 50 * esc, 50 * esc); }
          if (cueva && alea2 < 0.35) { const tc = alea < 0.5 ? [120, 230, 255] : [210, 140, 255]; x.fillStyle = css(tc, 0.9); x.beginPath(); x.moveTo(px + 4 * esc, y0 - 4); x.lineTo(px + 8 * esc, y0 - 22 * esc); x.lineTo(px + 12 * esc, y0 - 4); x.fill(); const gl = x.createRadialGradient(px + 8 * esc, y0 - 12 * esc, 1, px + 8 * esc, y0 - 12 * esc, 22 * esc); gl.addColorStop(0, css(tc, 0.35)); gl.addColorStop(1, css(tc, 0)); x.fillStyle = gl; x.fillRect(px - 20 * esc, y0 - 40 * esc, 56 * esc, 50 * esc); }
        }
      });
    }
    if (ambiente === 'lava' && i === 2) { // río de lava al fondo: brilla de abajo hacia arriba
      const gl = x.createLinearGradient(0, base - 10, 0, ALTO); gl.addColorStop(0, 'rgba(255,120,40,0)'); gl.addColorStop(0.5, 'rgba(255,120,40,.35)'); gl.addColorStop(1, 'rgba(255,190,80,.6)');
      x.save(); x.clip(silueta); x.fillStyle = gl; x.fillRect(0, base - 10, ANCHO, ALTO); x.restore();
    }
    return cv;
  });
  // ---- losetas: [suelo con borde, relleno, plataforma izquierda, centro, derecha]
  const [losas, lx] = lienzo(LOSA * 5, LOSA), cs = col('suelo'), cp = col('plataforma');
  const borde = { noche: [150, 0.5, 0.42], bosque: [110, 0.6, 0.45], cielo: [100, 0.6, 0.55], desierto: [40, 0.7, 0.72], nieve: [200, 0.3, 0.96], cueva: [270, 0.15, 0.42], ciudad: [0, 0, 0.6], lava: [20, 0.95, 0.52] }[ambiente];
  const tierra = rgb(cs), filo = mezcla(rgb(borde), luzSol, 0.08), luzLosa = claro(tierra, 0.22), sombraLosa = oscuro(tierra, 0.35);
  const envuelve = (w, h, fn) => { for (const dx of [0, w, -w]) for (const dy of [0, h, -h]) fn(dx, dy); };   // repetir sin costura
  // piedrita con bisel suave: arriba a la izquierda le da la luz, abajo a la derecha queda la sombra
  const piedra = (px, py, w, h, base, k = 1) => {
    lx.fillStyle = css(oscuro(base, 0.4), 0.35 * k); lx.beginPath(); lx.ellipse(px + 1, py + 1.4, w / 2, h / 2, 0, 0, 6.283); lx.fill();
    lx.fillStyle = css(base); lx.beginPath(); lx.ellipse(px, py, w / 2, h / 2, 0, 0, 6.283); lx.fill();
    lx.fillStyle = css(claro(base, 0.25), 0.4 * k); lx.beginPath(); lx.ellipse(px - w * 0.1, py - h * 0.2, w * 0.3, h * 0.18, 0, 0, 6.283); lx.fill();
  };
  // tierra: vetas horizontales onduladas (estratos), granitos y unas pocas piedras de poco contraste. Se repite en x.
  const tierraCuerpo = (ox, oy, w, h, r2) => {
    lx.save(); lx.beginPath(); lx.rect(ox, oy, w, h); lx.clip();
    const g = lx.createLinearGradient(0, oy, 0, oy + h); g.addColorStop(0, css(claro(tierra, 0.04))); g.addColorStop(1, css(oscuro(tierra, 0.22)));
    lx.fillStyle = g; lx.fillRect(ox, oy, w, h);
    for (let k = 0; k < 4; k++) {                                                    // vetas: la onda tiene un número entero de ciclos en w
      const y0 = oy + 18 + k * 12 + r2() * 4, a = 1.5 + r2() * 2, f = 1 + Math.floor(r2() * 2), fase = r2() * 6.283, grueso = 2 + r2() * 3;
      lx.fillStyle = css(k % 2 ? oscuro(tierra, 0.18) : claro(tierra, 0.08), 0.5); lx.beginPath(); lx.moveTo(ox, y0);
      for (let px = 0; px <= w; px += 4) lx.lineTo(ox + px, y0 + a * Math.sin(px / w * 6.283 * f + fase));
      for (let px = w; px >= 0; px -= 4) lx.lineTo(ox + px, y0 + grueso + a * Math.sin(px / w * 6.283 * f + fase + 0.6));
      lx.fill();
    }
    for (let i = 0; i < 40; i++) { const s = 1 + r2() * 1.8, px = r2() * w, py = 14 + r2() * (h - 14), c = r2() < 0.5 ? luzLosa : sombraLosa, al = 0.15 + r2() * 0.25; envuelve(w, 0, (dx) => { lx.fillStyle = css(c, al); lx.fillRect(ox + px + dx, oy + py, s, s); }); }
    for (let i = 0; i < 3; i++) { const pw = 5 + r2() * 7, ph = pw * 0.6, px = r2() * w, py = 24 + r2() * (h - 30), tono = mezcla(tierra, r2() < 0.6 ? luzLosa : sombraLosa, 0.45); envuelve(w, 0, (dx) => piedra(ox + px + dx, oy + py, pw, ph, tono, 0.8)); }
    lx.restore();
  };
  // piedra de muro: adoquines irregulares (rejilla movida al azar) con su junta oscura. Se repite en los dos ejes.
  const muroCuerpo = (ox, oy, w, h, r2) => {
    lx.save(); lx.beginPath(); lx.rect(ox, oy, w, h); lx.clip();
    lx.fillStyle = css(oscuro(tierra, 0.35)); lx.fillRect(ox, oy, w, h);
    const n = 3, cw = w / n, chh = h / n;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const px = (i + 0.5 + (j % 2) * 0.5) * cw + (r2() - 0.5) * 5, py = (j + 0.5) * chh + (r2() - 0.5) * 4, sw = cw * (0.86 + r2() * 0.1), sh = chh * (0.8 + r2() * 0.12);
      const tono = mezcla(tierra, r2() < 0.5 ? luzLosa : sombraLosa, r2() * 0.5), rad = 3 + r2() * 4;
      envuelve(w, h, (dx, dy) => {
        const x0 = ox + px + dx - sw / 2, y0 = oy + py + dy - sh / 2;
        const gg = lx.createLinearGradient(x0, y0, x0 + sw * 0.4, y0 + sh); gg.addColorStop(0, css(claro(tono, 0.14))); gg.addColorStop(1, css(oscuro(tono, 0.12)));
        lx.fillStyle = gg; lx.beginPath(); lx.roundRect(x0, y0, sw, sh, rad); lx.fill();
        lx.fillStyle = css(claro(tono, 0.3), 0.35); lx.fillRect(x0 + rad, y0 + 1, sw - rad * 2, 1.5);
        lx.fillStyle = css(oscuro(tono, 0.4), 0.35); lx.fillRect(x0 + rad, y0 + sh - 2, sw - rad * 2, 1.5);
      });
    }
    for (let i = 0; i < 30; i++) { const px = r2() * w, py = r2() * h, c = r2() < 0.5 ? luzLosa : sombraLosa, al = 0.12 + r2() * 0.18; envuelve(w, h, (dx, dy) => { lx.fillStyle = css(c, al); lx.fillRect(ox + px + dx, oy + py + dy, 1.5, 1.5); }); }
    lx.restore();
  };
  // filo de arriba (pasto, arena, nieve, piedra…): banda con flecos que cuelgan, brillo arriba y sombra que proyecta debajo
  const filoArriba = (ox, w, alto, r2) => {
    const ao = lx.createLinearGradient(0, alto - 2, 0, alto + 9); ao.addColorStop(0, css(oscuro(tierra, 0.5), 0.7)); ao.addColorStop(1, css(oscuro(tierra, 0.5), 0));
    lx.fillStyle = ao; lx.fillRect(ox, alto - 2, w, 11);
    const g = lx.createLinearGradient(0, 0, 0, alto); g.addColorStop(0, css(claro(filo, 0.18))); g.addColorStop(1, css(oscuro(filo, 0.12)));
    lx.fillStyle = g; lx.fillRect(ox, 0, w, alto);
    lx.fillStyle = css(oscuro(filo, 0.12));
    for (let px = 0; px < w; px += 8) { const largo = 4 + r2() * 6; lx.beginPath(); lx.moveTo(ox + px, alto - 1); lx.quadraticCurveTo(ox + px + 4, alto + largo * 1.2, ox + px + 8, alto - 1); lx.fill(); }
    lx.fillStyle = css(claro(filo, 0.45), 0.9); lx.fillRect(ox, 0, w, 2);
    lx.fillStyle = css(claro(filo, 0.3), 0.5);
    for (let i = 0; i < w / 5; i++) { const px = ox + 1 + r2() * (w - 3); lx.fillRect(px, 2 + r2() * (alto - 6), 1.5, 2 + r2() * 3); }
    if (ambiente === 'bosque' || ambiente === 'noche' || ambiente === 'cielo') for (let i = 0; i < 2; i++) { // florecitas
      const px = ox + 6 + r2() * (w - 12); lx.fillStyle = r2() < 0.5 ? 'rgba(255,236,150,.95)' : 'rgba(255,170,210,.95)'; lx.beginPath(); lx.arc(px, 3 + r2() * 4, 1.8, 0, 6.283); lx.fill();
    }
    if (ambiente === 'lava') { lx.fillStyle = 'rgba(255,150,60,.9)'; for (let i = 0; i < 3; i++) lx.fillRect(ox + r2() * (w - 6), alto - 3, 6 + r2() * 8, 1.5); }
    if (ambiente === 'nieve') { lx.fillStyle = 'rgba(235,246,255,.95)'; for (let px = 3; px < w; px += 11 + r2() * 8) { lx.beginPath(); lx.moveTo(ox + px, alto); lx.lineTo(ox + px + 2, alto + 5 + r2() * 6); lx.lineTo(ox + px + 4, alto); lx.fill(); } }
  };
  const r2 = azar(semilla * 7 + 3);
  tierraCuerpo(0, 0, LOSA, LOSA, r2); filoArriba(0, LOSA, 13, r2);                             // 0 · suelo
  muroCuerpo(LOSA, 0, LOSA, LOSA, r2);                                                          // 1 · relleno
  // 2-4 · plataforma: losa de piedra con pasto encima, cantos redondeados y sombra en la cara de abajo
  const losaP = rgb(cp);
  for (const [i, forma] of [[2, 'izq'], [3, 'cen'], [4, 'der']]) {
    const ox = i * LOSA, radios = forma === 'izq' ? [12, 0, 0, 12] : forma === 'der' ? [0, 12, 12, 0] : 0;
    lx.save(); lx.beginPath(); lx.roundRect(ox, 0, LOSA, 30, radios); lx.clip();
    const g = lx.createLinearGradient(0, 0, 0, 30); g.addColorStop(0, css(claro(losaP, 0.1))); g.addColorStop(1, css(oscuro(losaP, 0.3)));
    lx.fillStyle = g; lx.fillRect(ox, 0, LOSA, 30);
    lx.fillStyle = css(oscuro(losaP, 0.3), 0.55); lx.fillRect(ox, 18, LOSA, 1.5);                                   // junta horizontal
    lx.fillStyle = css(claro(losaP, 0.2), 0.35); lx.fillRect(ox, 19.5, LOSA, 1);
    const junta = forma === 'cen' ? 22 + r2() * 20 : 32; lx.fillStyle = css(oscuro(losaP, 0.3), 0.5); lx.fillRect(ox + junta, 19, 1.5, 8); lx.fillRect(ox + (junta + 32) % LOSA, 9, 1.5, 9);
    for (let k = 0; k < 10; k++) { lx.fillStyle = css(r2() < 0.5 ? claro(losaP, 0.25) : oscuro(losaP, 0.3), 0.3); lx.fillRect(ox + r2() * LOSA, 10 + r2() * 16, 1.5, 1.5); }
    lx.fillStyle = css(oscuro(losaP, 0.5), 0.6); lx.fillRect(ox, 27, LOSA, 3);                                       // canto de abajo en sombra
    if (forma === 'izq') { lx.fillStyle = css(claro(losaP, 0.25), 0.45); lx.fillRect(ox, 9, 3, 18); }               // canto izquierdo: le da la luz
    if (forma === 'der') { lx.fillStyle = css(oscuro(losaP, 0.45), 0.55); lx.fillRect(ox + LOSA - 4, 9, 4, 21); }
    lx.restore();
    lx.save(); lx.beginPath(); lx.roundRect(ox, 0, LOSA, 30, radios); lx.clip();
    const gf = lx.createLinearGradient(0, 0, 0, 10); gf.addColorStop(0, css(claro(filo, 0.2))); gf.addColorStop(1, css(oscuro(filo, 0.1)));
    lx.fillStyle = gf; lx.fillRect(ox, 0, LOSA, 9);
    lx.fillStyle = css(oscuro(filo, 0.12));
    for (let px = 0; px < LOSA; px += 8) { const largo = 3 + r2() * 5; lx.beginPath(); lx.moveTo(ox + px, 8); lx.quadraticCurveTo(ox + px + 4, 8 + largo, ox + px + 8, 8); lx.fill(); }
    lx.fillStyle = css(claro(filo, 0.45), 0.9); lx.fillRect(ox, 0, LOSA, 2);
    lx.restore();
  }
  return { cielo, capas, losas, losa: LOSA, ancho: ANCHO, alto: ALTO, ambiente, hora };
}

// recorta una loseta a su propio lienzo (para exportarla como PNG suelto)
export function recorte(esc, indice, alto = esc.losa) { const [c, x] = lienzo(esc.losa, alto); x.drawImage(esc.losas, indice * esc.losa, 0, esc.losa, alto, 0, 0, esc.losa, alto); return c; }
