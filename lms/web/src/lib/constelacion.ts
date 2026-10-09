// Constelaciones de flores arayashiki que forman las letras J M D.
// Genera SVG como texto: lo usa el front (fondo y portada) y el script de las diapositivas,
// así el LMS y la PPT llevan el mismo dibujo. Determinista: mismas estrellas en cada carga.

type P = [number, number];

// Vértices de cada letra en una caja de 600 × 260. Cada letra es una lista de trazos.
const LETRAS: Record<string, P[][]> = {
  J: [
    [[40, 40], [100, 34], [160, 40]],
    [[100, 34], [104, 120], [100, 178], [82, 212], [50, 218], [30, 192]],
  ],
  M: [[[200, 220], [196, 40], [258, 132], [320, 40], [316, 220]]],
  D: [[[380, 40], [384, 220], [458, 206], [512, 150], [514, 100], [470, 52], [380, 40]]],
};

// Vértices donde florece una arayashiki en vez de una estrella.
const FLORES = new Set(["100,34", "30,192", "258,132", "196,40", "320,40", "380,40", "512,150"]);

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// Pétalo en punta (de loto), con la base en (0,0) y la punta hacia arriba.
const PETALO = (l: number, w: number) => `M0 0 Q${w} ${(-l * 0.45).toFixed(1)} 0 ${-l} Q${-w} ${(-l * 0.45).toFixed(1)} 0 0Z`;

// Loto de Shaka visto desde arriba: ocho pétalos en punta, otra corona de ocho por dentro
// y el centro dorado con sus semillas. Es la flor de cada vértice de las letras.
export function flor(x: number, y: number, r: number, rot = 0, cls = "flor"): string {
  const g0 = (rot * 180) / Math.PI;
  const capa = (n: number, l: number, w: number, giro: number, c: string) =>
    Array.from({ length: n }, (_, i) => `<path class="${c}" d="${PETALO(l, w)}" transform="rotate(${(g0 + giro + (i * 360) / n).toFixed(1)})"/>`).join("");
  const semillas = Array.from({ length: 6 }, (_, i) => {
    const a = (i * Math.PI) / 3;
    return `<circle class="semilla" cx="${(Math.cos(a) * r * 0.12).toFixed(1)}" cy="${(Math.sin(a) * r * 0.12).toFixed(1)}" r="${(r * 0.045).toFixed(2)}"/>`;
  }).join("");
  return `<g class="${cls}" transform="translate(${x} ${y})">${capa(8, r, r * 0.34, 0, "p1")}${capa(8, r * 0.72, r * 0.28, 22.5, "p2")}<circle class="nucleo" r="${(r * 0.22).toFixed(1)}"/>${semillas}</g>`;
}

// Loto de perfil, como el trono de Shaka: pétalos que se abren hacia arriba desde la base.
export function lotoTrono(x: number, y: number, r: number): string {
  const p: string[] = [];
  const capas: [number, number, number, number][] = [
    [7, r * 0.55, r * 0.26, 78], // atrás: más pétalos, más abiertos
    [5, r * 0.75, r * 0.32, 58],
    [3, r * 0.95, r * 0.36, 30], // delante: los más altos
  ];
  capas.forEach(([n, l, w, abre], k) => {
    for (let i = 0; i < n; i++) {
      const ang = n === 1 ? 0 : -abre + (2 * abre * i) / (n - 1);
      p.push(`<path class="t${k}" d="${PETALO(l, w)}" transform="rotate(${ang.toFixed(1)})"/>`);
    }
  });
  return `<g class="trono" transform="translate(${x} ${y})">${p.join("")}<ellipse class="base" cx="0" cy="${(r * 0.06).toFixed(1)}" rx="${(r * 0.9).toFixed(1)}" ry="${(r * 0.12).toFixed(1)}"/></g>`;
}

// Pétalo suelto de sala que cae (el jardín de los sala gemelos).
function petaloCae(x: number, y: number, t: number, rot: number, d: number): string {
  return `<g class="cae" style="--d:${d.toFixed(1)}s"><path d="${PETALO(t, t * 0.45)}" transform="translate(${x} ${y}) rotate(${rot.toFixed(0)})"/></g>`;
}

// Las letras J M D como constelación: trazos finos, estrellas y flores en los vértices.
export function jmd(opts: { x?: number; y?: number; escala?: number; dibujar?: boolean } = {}): string {
  const { x = 0, y = 0, escala = 1, dibujar = false } = opts;
  const lineas: string[] = [];
  const nodos = new Map<string, P>();
  let n = 0;
  for (const trazos of Object.values(LETRAS)) {
    for (const t of trazos) {
      const d = t.map(([a, b], i) => `${i ? "L" : "M"}${a} ${b}`).join(" ");
      lineas.push(`<path class="traza${dibujar ? " dibuja" : ""}" style="--i:${n++}" d="${d}"/>`);
      for (const p of t) nodos.set(p.join(","), p);
    }
  }
  const puntos = [...nodos.entries()].map(([k, [a, b]], i) =>
    FLORES.has(k)
      ? flor(a, b, 22, (i * 0.7) % 6.28, "flor brilla")
      : `<circle class="estrella brilla" style="--d:${(i % 7) * 0.4}s" cx="${a}" cy="${b}" r="3.2"/>`,
  );
  return `<g transform="translate(${x} ${y}) scale(${escala})">${lineas.join("")}${puntos.join("")}</g>`;
}

// Cielo completo: estrellas sueltas, flores pequeñas a la deriva y una o varias JMD.
export function cielo(opts: { ancho?: number; alto?: number; semilla?: number; estrellas?: number; flores?: number; petalos?: number; trono?: { x: number; y: number; r: number }; letras?: { x: number; y: number; escala: number; dibujar?: boolean }[] } = {}): string {
  const { ancho = 1600, alto = 1000, semilla = 40, estrellas = 140, flores = 9, petalos = 26, trono, letras = [] } = opts;
  const r = rng(semilla);
  const out: string[] = [];
  for (let i = 0; i < estrellas; i++) {
    const rad = r() < 0.12 ? 1.8 : 0.6 + r();
    out.push(`<circle class="polvo" style="--d:${(r() * 6).toFixed(1)}s" cx="${(r() * ancho).toFixed(0)}" cy="${(r() * alto).toFixed(0)}" r="${rad.toFixed(1)}"/>`);
  }
  if (trono) out.push(lotoTrono(trono.x, trono.y, trono.r));
  for (let i = 0; i < petalos; i++) {
    out.push(petaloCae(+(r() * ancho).toFixed(0), +(r() * alto).toFixed(0), 7 + r() * 9, r() * 360, r() * 14));
  }
  for (let i = 0; i < flores; i++) {
    out.push(flor(+(r() * ancho).toFixed(0), +(r() * alto).toFixed(0), 6 + r() * 10, r() * 6.28, "flor deriva"));
  }
  for (const l of letras) out.push(jmd(l));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ancho} ${alto}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${out.join("")}</svg>`;
}

// Colores del tema: morado del Real Madrid campeón, lila y oro de la Orejona.
export const PALETA = {
  noche: "#16052e",
  morado: "#2e0d5e",
  violeta: "#6a35c9",
  lila: "#c7b2ff",
  azulFlor: "#8fb8ff",
  oro: "#f2c14e",
  blanco: "#f7f2ff",
};

// Estilos del SVG para usarlo fuera del front (las diapositivas).
export const ESTILO_SVG = `
.polvo{fill:${PALETA.blanco};opacity:.55}
.traza{fill:none;stroke:${PALETA.lila};stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round;opacity:.75}
.estrella{fill:${PALETA.blanco}}
.flor .p1{fill:${PALETA.azulFlor};fill-opacity:.9;stroke:${PALETA.lila};stroke-width:.5}
.flor .p2{fill:#e4d8ff;fill-opacity:.95;stroke:${PALETA.lila};stroke-width:.4}
.flor .nucleo{fill:${PALETA.oro}}
.flor .semilla{fill:#8a5a00}
.flor.deriva{opacity:.35}
.trono path{stroke:${PALETA.lila};stroke-width:1;stroke-opacity:.5}
.trono .t0{fill:#4b2a8f;fill-opacity:.35}.trono .t1{fill:#6a49c4;fill-opacity:.32}.trono .t2{fill:${PALETA.azulFlor};fill-opacity:.22}
.trono .base{fill:${PALETA.oro};fill-opacity:.12}
.cae path{fill:#e9c8ff;fill-opacity:.45}`;
