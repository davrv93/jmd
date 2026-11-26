// Forja · voxel · ambiente: ciclo de día y noche, sol, luna, estrellas, nubes, colores del cielo, niebla por bioma y
// clima, gradación de color por hora y bioma (lluvia y nieve opcionales, dibujadas en una capa 2D encima del lienzo con
// un presupuesto fijo de gotas). hora: 0 = medianoche, 0,25 = amanecer, 0,5 = mediodía, 0,75 = atardecer.
// Los colores se piensan en sRGB (0..255, como en un selector de color) y se entregan LINEALES al shader (al cuadrado):
// la luz se suma en lineal y render.js aplica al final tono ACES, gamma y la gradación.
const mezcla = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const s01 = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lin = (c, k = 1) => [(c[0] / 255) ** 2 * k, (c[1] / 255) ** 2 * k, (c[2] / 255) ** 2 * k];
const por = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
// paleta de la jornada (sRGB). Original: cenit azul profundo, horizonte lechoso; atardecer naranja-rosado con cenit
// violeta; noche azul tinta con luna fría (no negra: se lee el paisaje).
const DIA = { cenit: [52, 112, 212], horizonte: [172, 206, 240], sol: [255, 240, 214], amb: [150, 184, 232], suelo: [150, 132, 104] };
const OCASO = { cenit: [66, 84, 152], horizonte: [255, 166, 92], sol: [255, 176, 100], amb: [150, 136, 168], suelo: [130, 96, 76], halo: [255, 142, 64] };
const ALBA = { cenit: [80, 104, 170], horizonte: [255, 186, 160], sol: [255, 196, 150], amb: [160, 150, 186], suelo: [130, 104, 100], halo: [255, 160, 120] };
const NOCHE = { cenit: [8, 13, 32], horizonte: [26, 38, 66], luna: [170, 196, 255], amb: [64, 84, 140], suelo: [18, 22, 34] };
// gradación (en pantalla, 0..1): lift = color de las sombras, gain = de las luces
const GRADO = {
  dia: { lift: [0.012, 0.02, 0.034], gain: [1.02, 1.0, 0.975], sat: 1.05 },
  ocaso: { lift: [0.03, 0.012, 0.04], gain: [1.07, 0.99, 0.88], sat: 1.12 },
  noche: { lift: [0.008, 0.014, 0.04], gain: [0.95, 0.97, 1.05], sat: 0.58 },
};
// color del agua por bioma (lineal): azul profundo de base, turquesa en la selva y las islas, verde turbio en el pantano
const AGUA = { base: [0.008, 0.06, 0.17], selva: [0.006, 0.13, 0.16], archipielago: [0.006, 0.12, 0.17], playa: [0.008, 0.09, 0.17], pantano: [0.04, 0.07, 0.035], tundra: [0.016, 0.06, 0.12], bosque_nevado: [0.016, 0.06, 0.12], taiga: [0.012, 0.06, 0.13], desierto: [0.01, 0.1, 0.15] };
const CALIDO = new Set(['desierto', 'sabana', 'canon', 'meseta']), FRIO = new Set(['tundra', 'bosque_nevado', 'taiga', 'montana']);
// opciones: { bajoAgua, clima ('lluvia' | 'nieve' | null), bajoTierra (0..1) }
export function cielo(hora, bioma, cfg, bajoAgua = false, { clima = null, bajoTierra = 0, distancia = cfg.render.distancia } = {}) {
  const ang = (hora - 0.25) * Math.PI * 2, d = [Math.cos(ang), Math.sin(ang), 0.36], l = Math.hypot(...d), solDir = d.map((v) => v / l);
  const alto = solDir[1], dia = s01(-0.1, 0.2, alto), maniana = hora < 0.5;
  const ocaso = s01(-0.16, 0.0, alto) * (1 - s01(0.06, 0.32, alto));   // amanecer o atardecer
  const O = maniana ? ALBA : OCASO, lluvia = clima ? 1 : 0;
  // cielo del bioma (más saturado de día)
  const bc = bioma?.cielo || [120, 180, 245], bn = bioma?.niebla || [190, 215, 245];
  let cenit = mezcla(mezcla(DIA.cenit, bc, 0.35), O.cenit, ocaso * 0.85), horizonte = mezcla(mezcla(DIA.horizonte, bn, 0.45), O.horizonte, ocaso);
  cenit = mezcla(NOCHE.cenit, cenit, dia); horizonte = mezcla(NOCHE.horizonte, horizonte, s01(-0.16, 0.12, alto));
  if (lluvia) { const g = mezcla([120, 128, 138], [36, 40, 50], 1 - dia); cenit = mezcla(cenit, g, 0.7); horizonte = mezcla(horizonte, mezcla(g, [160, 166, 172], dia), 0.65); }
  const suelo = mezcla(horizonte, mezcla(NOCHE.suelo, DIA.suelo, dia), 0.35);
  // sol (de día) o luna (de noche): la luz principal; en el cambio las dos valen casi cero (sin salto)
  const solI = 1.7 * s01(-0.04, 0.26, alto) * (1 - 0.6 * lluvia), lunaI = 0.42 * s01(0.0, 0.22, -alto) * (1 - 0.5 * lluvia);
  const colorSol = mezcla(DIA.sol, O.sol, ocaso);
  const usaSol = alto > -0.02, luzDir = usaSol ? solDir : solDir.map((v) => -v);
  const luzColor = usaSol ? lin(colorSol, solI) : lin(NOCHE.luna, lunaI);
  // cielo hemisférico: el color de arriba es el del cielo (frío), el de abajo el rebote del suelo (cálido)
  const ambDia = mezcla(DIA.amb, O.amb, ocaso);
  const ambArriba = mezcla(lin(NOCHE.amb, 0.16), lin(ambDia, 0.55), dia), ambAbajo = mezcla(lin(NOCHE.suelo, 0.25), lin(mezcla(DIA.suelo, bn, 0.2), 0.3), dia);
  if (lluvia) { for (let i = 0; i < 3; i++) { ambArriba[i] *= 1.15; } }
  const halo = lin(O.halo || [255, 180, 120], 0.8 * ocaso + 0.12 * dia * (1 - ocaso)).map((v, i) => v * (1 - 0.8 * lluvia) + (i === 2 ? 0 : 0));
  const haloLuna = lin([120, 150, 220], 0.18 * (1 - dia));
  // niebla: densidad por distancia de vista, bioma y clima; bruma baja en los valles
  const fin = distancia * 16, densB = (bioma?.densidadNiebla ?? 1) ** 0.5 * cfg.render.niebla * (1 + 1.4 * lluvia);
  let nieblaDens = (0.55 / fin) * densB, nieblaFin = fin;
  const aguaNiebla = lin([20, 74, 98], 0.55 + 0.45 * dia);
  if (bajoAgua) { nieblaDens = 0.085; nieblaFin = 30; }
  // gradación por hora, bioma, clima y lugar (bajo tierra, bajo el agua)
  const gd = GRADO.dia, go = GRADO.ocaso, gn = GRADO.noche;
  let lift = mezcla(gn.lift, mezcla(gd.lift, go.lift, ocaso), dia), gain = mezcla(gn.gain, mezcla(gd.gain, go.gain, ocaso), dia), sat = gn.sat + (gd.sat + (go.sat - gd.sat) * ocaso - gn.sat) * dia;
  if (CALIDO.has(bioma?.id)) gain = mezcla(gain, [gain[0] * 1.04, gain[1] * 1.0, gain[2] * 0.93], dia);
  if (FRIO.has(bioma?.id)) gain = mezcla(gain, [gain[0] * 0.97, gain[1], gain[2] * 1.04], dia);
  if (bioma?.id === 'pantano') { lift = mezcla(lift, [0.02, 0.035, 0.01], 0.6); sat *= 0.86; }
  if (bioma?.id === 'selva') sat *= 1.06;
  if (lluvia) sat *= 0.78;
  if (bajoTierra > 0) { lift = mezcla(lift, [0.02, 0.016, 0.03], bajoTierra); sat = sat + (0.92 - sat) * bajoTierra; }
  if (bajoAgua) { lift = [0.0, 0.03, 0.05]; gain = [0.84, 1.0, 1.04]; sat = 0.95; }
  // exposición objetivo: de noche y bajo tierra el ojo se adapta (se lee el paisaje sin dejar de ser de noche)
  const afuera = 0.92 + 1.15 * (1 - dia) + 0.25 * lluvia * dia, exposicion = afuera + (1.3 - afuera) * bajoTierra;
  return {
    solDir, luzDir, luzColor, ambArriba, ambAbajo, minLuz: lin([60, 72, 100], 0.11),
    cenit: lin(cenit), horizonte: lin(horizonte), suelo: lin(suelo), halo, haloLuna,
    disco: lin([255, 248, 226], 26 * s01(-0.06, 0.02, alto) * (1 - 0.85 * lluvia)), lunaColor: lin([226, 232, 246], 0.85 * (1 - dia * 0.85) * (1 - 0.7 * lluvia)),
    noche: cfg.ambiente.estrellas ? (1 - s01(-0.22, 0.02, alto)) * (1 - 0.85 * lluvia) : 0, rotEstrellas: hora * Math.PI * 2,
    nubes: Math.min(0.92, (0.3 + 0.32 * (bioma?.lluvias ?? 0.3)) * (1 - 0.6 * (bioma?.precipitacion === 'ninguna' ? 1 : 0)) + 0.55 * lluvia),
    nubeLuz: mezcla(lin([30, 36, 52]), mezcla(lin([255, 255, 255], 1.15), lin([255, 196, 160], 1.1), ocaso), dia).map((v) => v * (1 - 0.45 * lluvia)),
    nubeSombra: mezcla(lin([14, 18, 28]), mezcla(lin([168, 180, 200], 0.9), lin([150, 110, 130], 0.8), ocaso), dia).map((v) => v * (1 - 0.4 * lluvia)),
    nieblaDens, nieblaFin, nieblaAlt: 0.035, aguaNiebla, aguaColor: AGUA[bioma?.id] || AGUA.base,
    colorBloque: lin([255, 190, 124], 0.75),
    lift, gain, sat, vineta: bajoAgua ? 0.55 : 0.32 + 0.12 * (1 - dia),
    rayos: 0.55 * s01(0.0, 0.12, alto) * (1 - lluvia) * (0.6 + 0.6 * ocaso), rayosColor: lin(colorSol, 0.6),
    exposicion, dia, ocaso,
    // compatibilidad: lo que leían el HUD y versiones anteriores
    sol: Math.max(0.12, dia), colorSol: lin(colorSol), niebla: lin(horizonte), nieblaRango: [nieblaFin * 0.62, nieblaFin],
  };
}
// clima por bioma, determinista por (día, semilla): cambia cada 1/3 de día
export function climaDe(cfg, bioma, dias, semilla) {
  if (cfg.ambiente.clima !== 'auto') return cfg.ambiente.clima === 'despejado' ? null : cfg.ambiente.clima;
  const tramo = Math.floor(dias * 3), h = (Math.imul(tramo ^ semilla, 2654435761) >>> 0) / 4294967296;
  if (!bioma || bioma.precipitacion === 'ninguna' || h > (bioma.lluvias || 0) * 0.6) return null;
  return bioma.precipitacion;
}
export function crearClima(padre, { presupuesto = 600 } = {}) {
  const c = document.createElement('canvas'); c.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:2'; padre.appendChild(c);
  const x = c.getContext('2d'), N = presupuesto, px = new Float32Array(N), py = new Float32Array(N), pv = new Float32Array(N); let semilla = 1;
  const r = () => { semilla = (semilla * 16807) % 2147483647; return semilla / 2147483647; };
  for (let i = 0; i < N; i++) { px[i] = r(); py[i] = r(); pv[i] = 0.6 + r() * 0.8; }
  return {
    dibujar(tipo, intensidad, dt, giro) {
      const w = (c.width = c.clientWidth), h = (c.height = c.clientHeight); x.clearRect(0, 0, w, h);
      if (!tipo || intensidad <= 0) return 0;
      const n = Math.min(N, Math.round(N * Math.min(1, intensidad * 0.5))), nieve = tipo === 'nieve';
      x.strokeStyle = nieve ? 'rgba(255,255,255,.85)' : 'rgba(170,200,255,.45)'; x.fillStyle = 'rgba(255,255,255,.9)'; x.lineWidth = 1.2; x.beginPath();
      for (let i = 0; i < n; i++) {
        py[i] += dt * pv[i] * (nieve ? 0.12 : 1.1); px[i] += dt * (nieve ? Math.sin(py[i] * 6 + i) * 0.02 : 0.05) - giro * 0.15;
        if (py[i] > 1) { py[i] -= 1; px[i] = r(); } px[i] = ((px[i] % 1) + 1) % 1;
        const X = px[i] * w, Y = py[i] * h;
        if (nieve) x.rect(X, Y, 2.2, 2.2); else { x.moveTo(X, Y); x.lineTo(X - 2, Y + 14 * pv[i]); }
      }
      nieve ? x.fill() : x.stroke(); return n;
    },
  };
}
