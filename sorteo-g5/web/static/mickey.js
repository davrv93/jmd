// Mickey de 1928 (Steamboat Willie, dominio público) en pixel art 32×32.
// Orejas redondas negras, cara de «pastel» con picos entre los ojos, ojos
// ovalados de pupila negra con el corte de pastel, nariz negra y sonrisa.
// Se dibuja muestreando figuras en el centro de cada celda: sin imágenes.

const COL = {
  K: "#1e2230", // tinta
  F: "#f6dcc0", // cara (pastel)
  W: "#fffaf0", // brillo
  M: "#6b1f2a", // boca
  T: "#f2a0a8", // lengua
  S: "#e9b9a0", // sombra de la cara
};

const dentro = (x, y, cx, cy, rx, ry) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;

/**
 * mirada: -1 izquierda, 0 centro, 1 derecha. ojos: "abiertos" | "cerrados".
 * boca: "sonrisa" | "abierta". Devuelve la cuadrícula como array de filas.
 */
export function cuadricula({ mirada = 0, ojos = "abiertos", boca = "sonrisa" } = {}) {
  const N = 32, oy = 0.6;
  const g = Array.from({ length: N }, () => Array(N).fill("."));
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const px = x + 0.5, py = y + 0.5 - oy;
      let c = ".";
      if (dentro(px, py, 6.9, 7.0, 6.2, 6.2) || dentro(px, py, 25.1, 7.0, 6.2, 6.2) || dentro(px, py, 16, 17.4, 10.2, 10.0)) c = "K";
      const cara = dentro(px, py, 16, 22.4, 9.4, 6.4) || dentro(px, py, 12.5, 15.4, 3.8, 5.4) || dentro(px, py, 19.5, 15.4, 3.8, 5.4);
      if (cara) c = py > 26.4 && !dentro(px, py, 16, 22.4, 8.6, 5.6) ? "S" : "F";
      g[y][x] = c;
    }
  }
  // Contorno de tinta alrededor de la cara (el hocico sobresale de la cabeza).
  const borde = g.map((f, y) => f.map((c, x) => {
    if (c !== "F" && c !== "S") return c;
    const fuera = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => (g[y + b]?.[x + a] ?? ".") === ".");
    return fuera ? "K" : c;
  }));
  for (let y = 0; y < N; y++) g[y] = borde[y];
  const pon = (x, y, c) => { if (x >= 0 && y >= 0 && x < N && y < N) g[y][x] = c; };
  const patron = (x0, y0, filas) => filas.forEach((f, j) => [...f].forEach((c, i) => { if (c !== ".") pon(x0 + i, y0 + j, c); }));
  // Ojos ovalados con el corte de pastel; miran a izquierda, centro o derecha.
  const dx = mirada < 0 ? -1 : mirada > 0 ? 1 : 0;
  for (const ex of [12 + dx, 18 + dx]) {
    if (ojos === "cerrados") patron(ex - 1, 15, [".KK.", "K..K"]);
    else patron(ex, 13, ["KK", dx < 0 ? "WK" : "KW", "KK", "KK", "KK"]);
  }
  // Nariz: óvalo negro con brillo.
  patron(14, 19, [".KK.", "KWKK", "KKKK", ".KK."]);
  if (boca === "abierta") {
    patron(9, 23, ["K............K", ".KKKKKKKKKKKK.", "..KMMMMMMMMK..", "...KMMTTMMK...", "....KTTTTK....", ".....KKKK....."]);
  } else {
    patron(9, 23, ["K............K", ".KK........KK.", "...KKKKKKKK...", "....KMTTMK....", ".....KKKK....."]);
  }
  return g.map((f) => f.join(""));
}

const cache = new Map();

/** Imagen (data URL) de la variante pedida, dibujada en un lienzo de 32×32. */
export function mickey(opc = {}) {
  const k = JSON.stringify(opc);
  if (cache.has(k)) return cache.get(k);
  const g = cuadricula(opc);
  const lienzo = document.createElement("canvas");
  lienzo.width = lienzo.height = 32;
  const ctx = lienzo.getContext("2d");
  g.forEach((fila, y) => [...fila].forEach((c, x) => {
    if (c === ".") return;
    ctx.fillStyle = COL[c];
    ctx.fillRect(x, y, 1, 1);
  }));
  const url = lienzo.toDataURL("image/png");
  cache.set(k, url);
  return url;
}
