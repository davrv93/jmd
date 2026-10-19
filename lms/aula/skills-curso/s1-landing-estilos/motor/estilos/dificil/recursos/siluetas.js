/* Siluetas del video «Difícil de explicar» (copia para el estilo de landing; sin el bloque de logos de marca).
 * Personajes en pixel art: se rasterizan desde formas simples (elipses, polígonos,
 * rectángulos) a una rejilla y se dibujan como cuadrados SVG. Objetos en vector.
 * Todo es determinista: mismas entradas, mismo SVG. Expone window.Siluetas.
 */
(function () {
  'use strict';

  /* ---------- rasterizador de pixel art ---------- */
  function dentro(f, x, y) {
    switch (f.t) {
      case 'e': { // elipse: cx, cy, rx, ry, rot (grados)
        const a = ((f.rot || 0) * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
        const dx = x - f.cx, dy = y - f.cy;
        const u = (dx * c + dy * s) / f.rx, v = (-dx * s + dy * c) / f.ry;
        return u * u + v * v <= 1;
      }
      case 'r': return x >= f.x && x <= f.x + f.w && y >= f.y && y <= f.y + f.h;
      case 'p': { // polígono: puntos [[x,y],…]
        let d = false; const p = f.p;
        for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
          if ((p[i][1] > y) !== (p[j][1] > y) && x < ((p[j][0] - p[i][0]) * (y - p[i][1])) / (p[j][1] - p[i][1]) + p[i][0]) d = !d;
        }
        return d;
      }
      default: return false;
    }
  }

  function rejilla(ancho, alto, formas, restar) {
    const g = [];
    for (let y = 0; y < alto; y++) {
      let fila = '';
      for (let x = 0; x < ancho; x++) {
        const px = x + 0.5, py = y + 0.5;
        const si = formas.some((f) => dentro(f, px, py)) && !(restar || []).some((f) => dentro(f, px, py));
        fila += si ? '#' : '.';
      }
      g.push(fila);
    }
    return g;
  }

  // Convierte filas de '#' en un único <path> por tramos: un solo relleno, sin costuras
  // entre filas aunque la silueta gire o se escale.
  function pixeles(filas, color, extra) {
    const alto = filas.length, ancho = filas[0].length;
    let d = '';
    filas.forEach((fila, y) => {
      let x = 0;
      while (x < ancho) {
        if (fila[x] === '#') {
          let x2 = x; while (x2 < ancho && fila[x2] === '#') x2++;
          d += `M${x} ${y}h${x2 - x}v1h${x - x2}z`;
          x = x2;
        } else x++;
      }
    });
    return `<svg viewBox="0 0 ${ancho} ${alto}" shape-rendering="crispEdges" ${extra || ''}><path fill="${color}" d="${d}"/></svg>`;
  }

  /* ---------- personajes (silueta, mirando a la derecha) ---------- */
  // Fontanero de 8 bits: el sprite clásico de 12×16, solo su contorno.
  const FONTANERO = [
    '...#####....',
    '..#########.',
    '..#######...',
    '.##########.',
    '.###########',
    '.##########.',
    '...#######..',
    '..######....',
    '.##########.',
    '############',
    '############',
    '############',
    '############',
    '..###..###..',
    '.###....###.',
    '####....####',
  ];

  const ERIZO = rejilla(28, 30, [
    { t: 'e', cx: 15, cy: 10, rx: 7.2, ry: 7 },              // cabeza
    { t: 'p', p: [[10, 5.5], [14.5, 3.2], [1, 0.5]] },          // púa alta (base ancha)
    { t: 'p', p: [[8.4, 7.5], [8.6, 13], [-0.5, 9]] },          // púa media
    { t: 'p', p: [[9, 11.5], [12.5, 16], [1, 18.5]] },          // púa baja
    { t: 'p', p: [[11.5, 16], [14.5, 19], [5, 23]] },           // púa de la espalda
    { t: 'p', p: [[14.5, 4], [19.5, 3.6], [17.5, -0.8]] },      // oreja
    { t: 'e', cx: 22.5, cy: 12, rx: 3.9, ry: 2.9 },             // hocico
    { t: 'e', cx: 26, cy: 11, rx: 1.5, ry: 1.4 },               // nariz
    { t: 'e', cx: 14.5, cy: 19.5, rx: 4.1, ry: 4.3 },           // cuerpo
    { t: 'p', p: [[16, 17], [23, 19.5], [22.5, 21.2], [16, 19.8]] }, // brazo
    { t: 'e', cx: 23.4, cy: 20.4, rx: 1.7, ry: 1.7 },           // guante
    { t: 'r', x: 12, y: 22, w: 2.2, h: 4.5 },                   // piernas
    { t: 'r', x: 16.2, y: 22, w: 2.2, h: 4.5 },
    { t: 'e', cx: 11, cy: 27.6, rx: 4.8, ry: 2.1 },             // zapatillas grandes
    { t: 'e', cx: 20, cy: 27.6, rx: 5.2, ry: 2.1 },
  ]);

  const DINO = rejilla(28, 32, [
    { t: 'e', cx: 19.5, cy: 9.5, rx: 7.2, ry: 4.6 },            // hocico grande
    { t: 'e', cx: 12.2, cy: 4.8, rx: 2.6, ry: 3.8 },            // ojos
    { t: 'e', cx: 15.4, cy: 4.2, rx: 2.6, ry: 3.8 },
    { t: 'e', cx: 11.5, cy: 9.5, rx: 4.6, ry: 4.4 },            // nuca
    { t: 'p', p: [[8, 10], [13, 12], [14, 17], [7, 17]] },      // cuello
    { t: 'e', cx: 11.5, cy: 20.5, rx: 6.2, ry: 6.4 },           // cuerpo
    { t: 'p', p: [[7, 9], [8, 13], [4, 11]] },                  // crestas
    { t: 'p', p: [[6, 12.5], [7, 16], [3, 14.5]] },
    { t: 'e', cx: 6.2, cy: 18.5, rx: 3.6, ry: 2.8 },            // silla
    { t: 'e', cx: 17.6, cy: 18.6, rx: 2.8, ry: 1.6 },           // brazo
    { t: 'p', p: [[6, 22], [7, 26], [0.5, 28.5]] },             // cola
    { t: 'r', x: 8, y: 25, w: 2.5, h: 4 },                      // piernas
    { t: 'r', x: 13, y: 25, w: 2.5, h: 4 },
    { t: 'e', cx: 10.5, cy: 29.8, rx: 4.4, ry: 2 },             // botas
    { t: 'e', cx: 16.5, cy: 29.8, rx: 4.4, ry: 2 },
  ]);

  const GATO = rejilla(24, 24, [
    { t: 'e', cx: 10, cy: 16.5, rx: 6.2, ry: 6.6 },             // cuerpo sentado
    { t: 'e', cx: 10, cy: 7.5, rx: 5, ry: 4.4 },                // cabeza
    { t: 'p', p: [[5.2, 6], [5.6, 0.6], [9, 4]] },              // orejas
    { t: 'p', p: [[11, 4], [14.4, 0.6], [14.8, 6]] },
    { t: 'e', cx: 17.5, cy: 21.5, rx: 4.6, ry: 1.7 },           // cola en curva
    { t: 'e', cx: 21.2, cy: 18.5, rx: 1.6, ry: 3.6 },
    { t: 'e', cx: 21.5, cy: 14.6, rx: 1.7, ry: 1.7 },
  ]);

  const MONEDA = rejilla(12, 16, [{ t: 'e', cx: 6, cy: 8, rx: 5.6, ry: 7.6 }], [{ t: 'r', x: 5, y: 3.5, w: 2, h: 9 }]);

  /* ---------- objetos en vector ---------- */
  function arpa(tinta, cuerda) {
    let cuerdas = '';
    for (let i = 0; i < 9; i++) {
      const x = 92 + i * 17;
      const yTop = 70 + i * 9 - Math.pow(i - 4, 2) * 1.2;
      const yBot = 300 - i * 19;
      cuerdas += `<line class="cuerda" data-i="${i}" x1="${x}" y1="${yTop}" x2="${x}" y2="${yBot}" stroke="${cuerda}" stroke-width="3" stroke-linecap="round"/>`;
    }
    return `<svg viewBox="0 0 300 360">
      <path fill="${tinta}" d="M58 40 C 120 6, 170 70, 248 96 C 262 100, 272 112, 266 124 L 260 132 C 210 112, 150 70, 92 62 Z"/>
      <path fill="${tinta}" d="M246 118 L 266 128 L 104 318 L 86 304 Z"/>
      <path fill="${tinta}" d="M50 34 C 64 30, 74 36, 74 48 L 82 314 C 82 326, 62 330, 56 318 L 48 52 C 46 42, 46 38, 50 34 Z"/>
      <path fill="${tinta}" d="M40 316 L 120 316 C 128 316, 132 330, 124 336 L 36 336 C 28 330, 32 316, 40 316 Z"/>
      <circle cx="60" cy="30" r="12" fill="${tinta}"/>
      <g>${cuerdas}</g>
    </svg>`;
  }

  function raton(tinta, luz) {
    return `<svg viewBox="0 0 240 360">
      <path class="cable" fill="none" stroke="${tinta}" stroke-width="7" stroke-linecap="round" d="M120 40 C 120 10, 170 0, 190 -30"/>
      <path fill="${tinta}" d="M120 38 C 186 38, 214 92, 214 176 L 214 250 C 214 318, 176 352, 120 352 C 64 352, 26 318, 26 250 L 26 176 C 26 92, 54 38, 120 38 Z"/>
      <path class="boton-izq" fill="${luz}" opacity="0.32" d="M114 52 C 70 56, 44 96, 40 160 L 114 160 Z"/>
      <line x1="120" y1="44" x2="120" y2="160" stroke="${luz}" stroke-width="4" opacity="0.55"/>
      <line x1="34" y1="166" x2="206" y2="166" stroke="${luz}" stroke-width="4" opacity="0.55"/>
    </svg>`;
  }

  // Mando de consola de 2005 (blanco, aro de luz de cuatro cuadrantes).
  function mando360(cuerpo, detalle, colores) {
    const [verde, rojo, azul, amarillo] = colores;
    let aro = '';
    for (let q = 0; q < 4; q++) {
      const a0 = (q * 90 - 135 + 6) * Math.PI / 180, a1 = ((q + 1) * 90 - 135 - 6) * Math.PI / 180;
      const r = 26;
      aro += `<path class="aro" data-q="${q}" d="M ${300 + r * Math.cos(a0)} ${118 + r * Math.sin(a0)} A ${r} ${r} 0 0 1 ${300 + r * Math.cos(a1)} ${118 + r * Math.sin(a1)}" fill="none" stroke="${detalle}" stroke-width="9" stroke-linecap="round"/>`;
    }
    return `<svg viewBox="0 0 600 420">
      <path fill="${cuerpo}" d="M150 70 C 220 52, 380 52, 450 70 C 520 86, 560 150, 572 250 C 584 340, 556 392, 508 392 C 470 392, 452 360, 432 318 C 412 280, 380 268, 300 268 C 220 268, 188 280, 168 318 C 148 360, 130 392, 92 392 C 44 392, 16 340, 28 250 C 40 150, 80 86, 150 70 Z"/>
      <path fill="${cuerpo}" opacity="0.92" d="M140 74 C 160 44, 210 40, 236 54 L 230 70 Z M460 74 C 440 44, 390 40, 364 54 L 370 70 Z"/>
      <circle cx="300" cy="118" r="38" fill="${detalle}" opacity="0.18"/>
      <circle cx="300" cy="118" r="16" fill="${detalle}" opacity="0.55"/>
      <g class="aro-luz">${aro}</g>
      <circle class="stick-izq" cx="168" cy="150" r="40" fill="${detalle}" opacity="0.85"/>
      <circle cx="168" cy="150" r="26" fill="${cuerpo}" opacity="0.35"/>
      <circle class="stick-der" cx="372" cy="232" r="36" fill="${detalle}" opacity="0.85"/>
      <circle cx="372" cy="232" r="23" fill="${cuerpo}" opacity="0.35"/>
      <path fill="${detalle}" opacity="0.85" d="M210 212 h24 v-24 h24 v24 h24 v24 h-24 v24 h-24 v-24 h-24 Z"/>
      <circle class="btn" data-b="A" cx="440" cy="186" r="20" fill="${verde}"/>
      <circle class="btn" data-b="B" cx="480" cy="148" r="20" fill="${rojo}"/>
      <circle class="btn" data-b="X" cx="400" cy="148" r="20" fill="${azul}"/>
      <circle class="btn" data-b="Y" cx="440" cy="110" r="20" fill="${amarillo}"/>
    </svg>`;
  }

  // Mando rectangular de 8 bits.
  function mandoNes(cuerpo, cara, boton) {
    return `<svg viewBox="0 0 520 220">
      <rect x="10" y="10" width="500" height="200" rx="14" fill="${cuerpo}"/>
      <rect x="36" y="44" width="448" height="132" rx="8" fill="${cara}"/>
      <path fill="${cuerpo}" d="M76 98 h30 v-30 h30 v30 h30 v30 h-30 v30 h-30 v-30 h-30 Z"/>
      <rect class="sel" x="216" y="118" width="38" height="14" rx="7" fill="${cuerpo}" opacity="0.8"/>
      <rect class="sta" x="270" y="118" width="38" height="14" rx="7" fill="${cuerpo}" opacity="0.8"/>
      <circle class="btn" data-b="B" cx="372" cy="126" r="26" fill="${boton}"/>
      <circle class="btn" data-b="A" cx="440" cy="126" r="26" fill="${boton}"/>
    </svg>`;
  }

  // Mando de 16 bits en forma de hueso, cuatro botones de color.
  function mandoSnes(cuerpo, detalle, colores) {
    const [rojo, amarillo, azul, verde] = colores;
    return `<svg viewBox="0 0 560 260">
      <path fill="${cuerpo}" d="M140 20 L 420 20 C 500 20, 550 70, 550 130 C 550 190, 500 240, 420 240 C 380 240, 360 226, 340 210 L 220 210 C 200 226, 180 240, 140 240 C 60 240, 10 190, 10 130 C 10 70, 60 20, 140 20 Z"/>
      <circle cx="140" cy="130" r="74" fill="${detalle}" opacity="0.14"/>
      <path fill="${detalle}" d="M100 112 h26 v-26 h28 v26 h26 v36 h-26 v26 h-28 v-26 h-26 Z" opacity="0.85"/>
      <rect x="232" y="138" width="36" height="13" rx="6" fill="${detalle}" opacity="0.5" transform="rotate(-24 250 144)"/>
      <rect x="282" y="138" width="36" height="13" rx="6" fill="${detalle}" opacity="0.5" transform="rotate(-24 300 144)"/>
      <circle cx="430" cy="130" r="86" fill="${detalle}" opacity="0.14"/>
      <circle class="btn" data-b="X" cx="430" cy="78" r="24" fill="${azul}"/>
      <circle class="btn" data-b="A" cx="482" cy="130" r="24" fill="${rojo}"/>
      <circle class="btn" data-b="B" cx="430" cy="182" r="24" fill="${amarillo}"/>
      <circle class="btn" data-b="Y" cx="378" cy="130" r="24" fill="${verde}"/>
    </svg>`;
  }

  // Consola gris de 8 bits con cartucho.
  function consola(cuerpo, detalle) {
    return `<svg viewBox="0 0 560 300">
      <rect class="cartucho" x="170" y="0" width="220" height="150" rx="6" fill="${detalle}"/>
      <g class="ranuras-cartucho" fill="${cuerpo}" opacity="0.45">${[0, 1, 2, 3, 4, 5].map((k) => `<rect x="${190 + k * 32}" y="14" width="18" height="40" rx="3"/>`).join('')}</g>
      <rect x="10" y="110" width="540" height="180" rx="10" fill="${cuerpo}"/>
      <rect x="10" y="110" width="540" height="58" rx="10" fill="${detalle}" opacity="0.18"/>
      <rect x="150" y="122" width="260" height="30" rx="4" fill="${detalle}" opacity="0.7"/>
      <g fill="${detalle}" opacity="0.5">${Array.from({ length: 14 }, (_, k) => `<rect x="${40 + k * 34}" y="200" width="20" height="5" rx="2"/>`).join('')}</g>
      <rect class="led" x="64" y="246" width="16" height="10" rx="3" fill="${detalle}"/>
      <rect x="100" y="240" width="64" height="22" rx="4" fill="${detalle}" opacity="0.6"/>
      <rect x="176" y="240" width="64" height="22" rx="4" fill="${detalle}" opacity="0.6"/>
    </svg>`;
  }

  window.Siluetas = {
    fontanero: (c) => pixeles(FONTANERO, c),
    erizo: (c) => pixeles(ERIZO, c),
    dino: (c) => pixeles(DINO, c),
    gato: (c) => pixeles(GATO, c),
    moneda: (c) => pixeles(MONEDA, c),
    arpa, raton, mando360, mandoNes, mandoSnes, consola,
    _rejillas: { FONTANERO, ERIZO, DINO, GATO, MONEDA },
    _rejilla: rejilla,
    pixelesDe: pixeles,
  };
})();

/* Tratamientos de arte para la misma rejilla de píxeles (escena «película»). */
(function () {
  'use strict';
  const S = window.Siluetas;
  // Medio tono: un círculo por píxel.
  S.puntos = function (filas, color) {
    let r = '';
    filas.forEach((f, y) => { for (let x = 0; x < f.length; x++) if (f[x] === '#') r += `<circle cx="${x + 0.5}" cy="${y + 0.5}" r="0.42"/>`; });
    return `<svg viewBox="0 0 ${filas[0].length} ${filas.length}"><g fill="${color}">${r}</g></svg>`;
  };
  // Plano técnico: solo el contorno de cada píxel.
  S.contorno = function (filas, color) {
    let r = '';
    filas.forEach((f, y) => { for (let x = 0; x < f.length; x++) if (f[x] === '#') r += `<rect x="${x + 0.08}" y="${y + 0.08}" width="0.84" height="0.84"/>`; });
    return `<svg viewBox="0 0 ${filas[0].length} ${filas.length}" shape-rendering="crispEdges"><g fill="none" stroke="${color}" stroke-width="0.12">${r}</g></svg>`;
  };
  // Un bit: tablero de ajedrez dentro de la silueta.
  S.unBit = function (filas, color) {
    let r = '';
    filas.forEach((f, y) => {
      for (let x = 0; x < f.length; x++) if (f[x] === '#') {
        r += `<rect x="${x}" y="${y}" width="0.5" height="0.5"/><rect x="${x + 0.5}" y="${y + 0.5}" width="0.5" height="0.5"/>`;
      }
    });
    return `<svg viewBox="0 0 ${filas[0].length} ${filas.length}" shape-rendering="crispEdges"><g fill="${color}">${r}</g></svg>`;
  };
  // ASCII: la misma rejilla escrita con caracteres.
  S.ascii = function (filas) { return filas.map((f) => f.replace(/#/g, '@').replace(/\./g, '·')).join('\n'); };
  S.rejilla = function (nombre) { return S._rejillas[nombre]; };
})();

