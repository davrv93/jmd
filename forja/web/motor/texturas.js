// Forja · texturas de patrón con p5.js (modo instancia, sin lienzo visible). Deterministas por semilla.
import { hsl } from './resolver.js';
// p5 no entiende la sintaxis moderna de hsl() con espacios: se le pasa con comas
const css = (c) => `hsl(${Math.round(c.h)}, ${Math.round(c.s * 100)}%, ${Math.round(c.l * 100)}%)`;

let listo = null, S = null;
export function iniciarP5() {
  listo ??= new Promise((ok) => { new window.p5((s) => { s.setup = () => { s.noCanvas(); s.noLoop(); S = s; ok(s); }; }); });
  return listo;
}

const N = 256;
export function texturaPatron(spec) {
  const { patron, colores, semilla } = spec;
  if (!S || patron.tipo === 'liso') return null;
  const g = S.createGraphics(N, N);
  g.pixelDensity(1);
  S.randomSeed(semilla * 7 + 3); S.noiseSeed(semilla * 13 + 1);
  const base = colores.cuerpo, k = patron.contraste;
  const osc = css(hsl(base.h + 8, base.s, base.l - k)), cla = css(hsl(base.h - 8, base.s * 0.9, base.l + k * 0.8)), det = css(colores.detalle);
  g.background(css(base)); g.noStroke();
  const n = Math.round(6 + patron.densidad * 22), e = patron.escala;
  const rep = (fn) => { for (let dx = -N; dx <= N; dx += N) for (let dy = -N; dy <= N; dy += N) fn(dx, dy); }; // repite para que no se note la costura
  switch (patron.tipo) {
    case 'manchas':
      g.fill(osc);
      for (let i = 0; i < n; i++) { const x = S.random(N), y = S.random(N), r = S.random(14, 40) * e; rep((dx, dy) => { g.beginShape(); for (let a = 0; a < 6.283; a += 0.5) { const rr = r * (0.7 + 0.5 * S.noise(i, a)); g.curveVertex(x + dx + Math.cos(a) * rr, y + dy + Math.sin(a) * rr * 0.8); } g.endShape(S.CLOSE); }); }
      break;
    case 'rayas':
      g.fill(osc);
      for (let i = 0; i < 7; i++) { const y = (i + 0.5) * N / 7; g.beginShape(); for (let x = 0; x <= N; x += 16) g.vertex(x, y - 7 * e + 5 * Math.sin(x / N * 12.566 + i)); for (let x = N; x >= 0; x -= 16) g.vertex(x, y + 7 * e + 5 * Math.sin(x / N * 12.566 + i + 1)); g.endShape(S.CLOSE); }
      break;
    case 'lunares':
      g.fill(cla);
      for (let i = 0; i < n * 1.4; i++) { const x = S.random(N), y = S.random(N), r = S.random(7, 15) * e; rep((dx, dy) => g.circle(x + dx, y + dy, r * 2)); }
      break;
    case 'escamas':
      g.noFill(); g.stroke(osc); g.strokeWeight(3);
      for (let j = 0; j < 9; j++) for (let i = -1; i < 9; i++) g.arc(i * 32 + (j % 2) * 16, j * 32 - 4, 32, 32, 0, Math.PI);
      break;
    case 'estrellas':
      g.fill(cla);
      for (let i = 0; i < n; i++) { const x = S.random(N), y = S.random(N), r = S.random(5, 13) * e, a0 = S.random(6.283); rep((dx, dy) => { g.beginShape(); for (let q = 0; q < 10; q++) { const rr = q % 2 ? r * 0.45 : r, a = a0 + q * 0.6283; g.vertex(x + dx + Math.cos(a) * rr, y + dy + Math.sin(a) * rr); } g.endShape(S.CLOSE); }); }
      break;
    case 'llamas':
      for (const [col, alto] of [[css(hsl(base.h + 22, 1, 0.6)), 0.5], [css(hsl(base.h + 38, 1, 0.7)), 0.3]]) {
        g.fill(col); g.beginShape(); g.vertex(0, N);
        for (let x = 0; x <= N; x += 8) g.vertex(x, N - N * alto * (0.55 + 0.45 * Math.abs(Math.sin(x / N * 12.566 * 1.5))) );
        g.vertex(N, N); g.endShape(S.CLOSE);
      }
      break;
    case 'cristales':
      for (let i = 0; i < n; i++) { const x = S.random(N), y = S.random(N), r = S.random(10, 28) * e; g.fill(i % 2 ? cla : 'rgba(255,255,255,.75)'); rep((dx, dy) => g.quad(x + dx, y + dy - r, x + dx + r * 0.5, y + dy, x + dx, y + dy + r, x + dx - r * 0.5, y + dy)); }
      break;
    case 'placas':
      g.stroke(osc); g.strokeWeight(3); g.noFill();
      for (let i = 0; i <= 4; i++) { g.line(i * 64, 0, i * 64, N); g.line(0, i * 64, N, i * 64); }
      g.noStroke(); g.fill(cla);
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) for (const [a, b] of [[10, 10], [54, 10], [10, 54], [54, 54]]) g.circle(i * 64 + a, j * 64 + b, 6);
      break;
    case 'rayos':
      g.stroke(css(hsl(base.h + 8, 1, 0.8))); g.strokeWeight(5); g.noFill();
      for (let i = 0; i < 5; i++) { let x = (i + 0.5) * N / 5, y = 0; g.beginShape(); g.vertex(x, y); while (y < N) { y += S.random(22, 44); x += (S.random() < 0.5 ? -1 : 1) * S.random(10, 24); g.vertex(x, y); } g.endShape(); }
      break;
    case 'arcoiris':
      for (let i = 0; i < 12; i++) { g.fill(css(hsl(base.h + i * 30, Math.max(0.6, base.s), base.l))); g.rect(0, i * N / 12, N, N / 12 + 1); }
      break;
    default: g.fill(det);
  }
  return g; // g.elt es el <canvas>; quien lo use debe llamar g.remove() al desechar
}
