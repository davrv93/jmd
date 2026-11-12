// Forja · nivel de prueba por semilla. Lo usan la pista del estudio y el proyecto Phaser que se exporta:
// mismo nivel en los dos lados. Todo en píxeles sobre una vista de 960x540 con losetas de 64.
import { azar, clamp } from './resolver.js';

export const LOSA = 64, VISTA = { w: 960, h: 540 }, SUELO_Y = 476, NIVELES_Y = [360, 244];

export function nivel(semilla = 1) {
  const r = azar(semilla * 17 + 5), N = 60;
  const huecos = [13, 26, 40].map((x) => x + Math.floor(r() * 3));
  const suelo = Array.from({ length: N }, (_, i) => !huecos.some((h) => i === h || i === h + 1));
  const plataformas = [[7, 0, 3], [17, 0, 3], [21, 1, 3], [31, 0, 4], [35, 1, 3], [45, 0, 3], [49, 1, 3]].map(([x, t, w]) => ({ x: (x + Math.floor(r() * 2)) * LOSA, y: NIVELES_Y[t], w }));
  const monedas = [];
  for (const p of plataformas) for (let i = 0; i < p.w; i++) monedas.push({ x: p.x + i * LOSA + LOSA / 2, y: p.y - 40 });
  for (const h of huecos) for (let i = 0; i < 3; i++) monedas.push({ x: (h + 0.25 + i * 0.75) * LOSA, y: SUELO_Y - 110 - Math.sin((i / 2) * Math.PI) * 40 });
  for (const x of [3, 4, 5, 10, 11]) monedas.push({ x: x * LOSA + LOSA / 2, y: SUELO_Y - 40 });
  const alta = plataformas.filter((p) => p.y === NIVELES_Y[1]);
  return {
    semilla, ancho: N * LOSA, suelo, plataformas, monedas,
    gema: { x: alta[1].x + LOSA * 1.5, y: alta[1].y - 100 }, corazon: { x: alta[2].x + LOSA * 1.5, y: alta[2].y - 96 },
    meta: { x: 56 * LOSA, y: SUELO_Y },
    enemigos: [{ x: (huecos[0] + 6) * LOSA, min: (huecos[0] + 3) * LOSA, max: (huecos[1] - 1.5) * LOSA }, { x: (huecos[2] + 7) * LOSA, min: (huecos[2] + 3) * LOSA, max: 54 * LOSA }],
    inicio: { x: 2 * LOSA, y: SUELO_Y },
  };
}

// Física jugable a partir de la ficha: se acota para que cualquier personaje pueda completar el nivel.
export function fisicaJugable(f) {
  return { velocidad: Math.round(clamp(f.velocidad * 1.15, 190, 340)), salto: Math.round(clamp(f.salto * 1.9, 700, 980)), gravedad: 1700 };
}
