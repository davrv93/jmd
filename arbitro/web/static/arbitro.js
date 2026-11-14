// Árbitro: la escena del estadio (SVG animado a mano), el sonido sintetizado
// con WebAudio y el flujo del juego. El resultado SIEMPRE lo decide el
// servidor; aquí solo se dibuja lo que respondió.
import { api, $, esc, luz } from "./comun.js";
luz();

const NS = "http://www.w3.org/2000/svg";
const QUIETO = matchMedia("(prefers-reduced-motion: reduce)").matches;
const LLAVE = "arb_t";
const LLAVE_MUDO = "arb_mudo";
const R = Math.PI / 180;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const suave = (k) => k * k * (3 - 2 * k);
const sale = (k) => 1 - (1 - k) * (1 - k);
const entra = (k) => k * k;
const tramo = (T, a, b) => clamp((T - a) / (b - a));

function el(tag, attrs = {}, padre) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (padre) padre.append(e);
  return e;
}

// ---------------------------------------------------------------------------
// Decorado: tribuna con público y franjas del césped (al azar, una vez).
function tribuna(g, alto, filas) {
  const colores = ["#e9e2d6", "#c9b9a3", "#8b7a68", "#5d4f44", "#b34a3a", "#3a5a9c", "#d8b04a", "#6b8f6a", "#9a6fa0", "#2f2a26"];
  for (let f = 0; f < filas; f++) {
    const y = 6 + f * ((alto - 10) / filas);
    el("rect", { x: 0, y: y + 4, width: 360, height: 1.2, fill: "#000", opacity: .35 }, g);
    for (let x = 2 + (f % 2) * 3; x < 360; x += 5.2 + Math.random() * 2) {
      el("circle", { cx: x, cy: y + Math.random() * 1.6, r: 1.6 + Math.random() * .5, fill: colores[Math.floor(Math.random() * colores.length)], opacity: .45 + Math.random() * .3 }, g);
    }
  }
  // Flashes de cámaras: parpadean en CSS (fuera si hay movimiento reducido).
  for (let i = 0; i < 9; i++) {
    const c = el("circle", { cx: Math.random() * 360, cy: 8 + Math.random() * (alto - 18), r: 1.6, fill: "#fff", class: "flash" }, g);
    c.style.cssText = `opacity:0;animation:${QUIETO ? "none" : `flash ${3 + Math.random() * 5}s ${Math.random() * 4}s infinite`}`;
  }
}
function franjas(g, y0, y1) {
  for (let i = -2; i < 12; i += 2) {
    const a = i * 36, b = a + 36;
    const d = (x) => 180 + (x - 180) * 1.35; // abre hacia abajo: perspectiva
    el("path", { d: `M${a} ${y0} L${b} ${y0} L${d(b)} ${y1} L${d(a)} ${y1} Z`, fill: "#fff", opacity: .045 }, g);
  }
}
const css = document.createElement("style");
css.textContent = "@keyframes flash{0%,92%,100%{opacity:0}94%{opacity:.95}96%{opacity:.2}}";
document.head.append(css);
tribuna($("#tribuna1"), 88, 7);
tribuna($("#tribuna2"), 44, 4);
franjas($("#franjas1"), 104, 240);
franjas($("#franjas2"), 56, 240);

// ---------------------------------------------------------------------------
// Jugadores de perfil. Coordenadas locales: pies en (0,0), mira hacia +x.
// Colores de referencia solamente: ni escudos, ni nombres, ni números.
const KITS = {
  blanco: { camisa: "#f7f6f2", manga: "#f7f6f2", borde: "#cfcabd", ribete: "#5b3d91", oro: "#c9a23a", short: "#f1efe9", media: "#f3f1ec", bota: "#1d1d1d", piel: "#c58c5c", pelo: "#2a1a10" },
  rayas: { camisa: "url(#rayas)", manga: "#a3123f", borde: "#16306b", ribete: "#1d4fa8", oro: "#a3123f", short: "#1a2e78", media: "#8f1035", bota: "#111", piel: "#e3b48d", pelo: "#6a4322" },
  arbitro: { camisa: "#161616", manga: "#161616", borde: "#000", ribete: "#3a3a3a", oro: "#3a3a3a", short: "#161616", media: "#161616", bota: "#000", piel: "#8a5a3c", pelo: "#141414" },
};
const L_MUSLO = 13, L_PIERNA = 13, L_BRAZO = 9.5, L_ANTEB = 9;
const CADERA = [0, -27], HOMBRO = [1, -45];

function figura(padre, kit, conTarjeta = false) {
  const sombra = el("ellipse", { rx: 13, ry: 2.6, fill: "#000", opacity: .3 }, padre);
  const raiz = el("g", {}, padre);
  const cuerpo = el("g", {}, raiz);
  const k = KITS[kit];
  const pierna = () => ({
    muslo: el("path", { stroke: k.piel, "stroke-width": 5.6, "stroke-linecap": "round", fill: "none" }, cuerpo),
    short: el("path", { stroke: k.short, "stroke-width": 7.6, "stroke-linecap": "round", fill: "none" }, cuerpo),
    media: el("path", { stroke: k.media, "stroke-width": 5.2, "stroke-linecap": "round", fill: "none" }, cuerpo),
    banda: el("path", { stroke: k.ribete, "stroke-width": 5.4, fill: "none" }, cuerpo),
    bota: el("path", { stroke: k.bota, "stroke-width": 4.4, "stroke-linecap": "round", fill: "none" }, cuerpo),
  });
  const brazo = (g) => ({
    sup: el("path", { stroke: k.piel, "stroke-width": 4.2, "stroke-linecap": "round", fill: "none" }, g),
    manga: el("path", { stroke: k.manga, "stroke-width": 5.6, "stroke-linecap": "round", fill: "none" }, g),
    puno: el("path", { stroke: k.oro, "stroke-width": 5.8, fill: "none" }, g),
    ant: el("path", { stroke: k.piel, "stroke-width": 3.8, "stroke-linecap": "round", fill: "none" }, g),
    mano: el("circle", { r: 2.4, fill: k.piel }, g),
  });
  const f = { raiz, sombra, k };
  f.p2 = pierna();
  const torso = el("g", {}, cuerpo);
  f.torso = torso;
  f.b2 = brazo(torso);
  el("rect", { x: -7.6, y: -47.5, width: 15.2, height: 23, rx: 5.5, fill: k.camisa, stroke: k.borde, "stroke-width": .6 }, torso);
  el("path", { d: "M-7 -38 V-27", stroke: k.ribete, "stroke-width": 1.2, opacity: .9 }, torso);
  el("rect", { x: -8, y: -29.5, width: 16, height: 7, rx: 3, fill: k.short }, torso);
  el("rect", { x: -2.4, y: -51.5, width: 5, height: 5, fill: k.piel }, torso);
  el("path", { d: "M-3.6 -47.6 Q1 -44.6 5.4 -47.6", stroke: k.ribete, "stroke-width": 1.6, fill: "none" }, torso);
  el("circle", { cx: 1.6, cy: -55.5, r: 7, fill: k.piel }, torso);
  el("path", { d: "M-5.4 -55 Q-5.6 -63.8 2 -63.4 Q8.6 -63 8.6 -57.4 Q4 -60.6 -1 -58.4 Z", fill: k.pelo }, torso);
  el("circle", { cx: 5.6, cy: -56.4, r: .9, fill: "#1a1a1a" }, torso);
  f.p1 = pierna();
  f.b1 = brazo(torso);
  if (conTarjeta) {
    f.tarjeta = el("rect", { x: -3.6, y: -12, width: 7.2, height: 10.4, rx: 1, fill: "#f5c518", stroke: "#000", "stroke-opacity": .35, "stroke-width": .4 }, torso);
    f.silbato = el("rect", { x: 6, y: -52, width: 3, height: 1.6, rx: .6, fill: "#c9c9c9" }, torso);
  }
  return f;
}

const punto = (o, ang, l) => [o[0] + l * Math.sin(ang * R), o[1] + l * Math.cos(ang * R)];
const linea = (...ps) => "M" + ps.map((p) => p[0].toFixed(2) + " " + p[1].toFixed(2)).join(" L");

// Pose: x, y (suelo), dir (1 mira a la derecha, -1 a la izquierda), rot
// (giro del cuerpo entero, grados horario) alrededor de piv ("pies" o
// "cadera"), dy (desplazamiento vertical), incl (inclinación del torso),
// piernas [[muslo, rodilla], …] y brazos [[hombro, codo], …] en grados desde la
// vertical hacia adelante.
function poner(f, p) {
  const piv = p.piv === "cadera" ? CADERA : [0, 0];
  f.raiz.setAttribute("transform", `translate(${p.x.toFixed(2)} ${(p.y + (p.dy || 0)).toFixed(2)}) scale(${(p.dir || 1) * (p.s || 1)} ${p.s || 1}) rotate(${(p.rot || 0).toFixed(2)} ${piv[0]} ${piv[1]})`);
  f.sombra.setAttribute("cx", p.x + (p.sombraDx || 0) * (p.dir || 1) * (p.s || 1));
  f.sombra.setAttribute("cy", p.y + 1);
  f.sombra.setAttribute("rx", (p.sombraRx || 13) * (p.s || 1));
  f.torso.setAttribute("transform", `rotate(${(p.incl || 0).toFixed(2)} ${CADERA[0]} ${CADERA[1]})`);
  [[f.p1, p.piernas[0]], [f.p2, p.piernas[1]]].forEach(([pi, [a, b]]) => {
    const rod = punto(CADERA, a, L_MUSLO), tob = punto(rod, a - b, L_PIERNA);
    const medio = punto(CADERA, a, L_MUSLO * .55);
    const tope = punto(rod, a - b, 3.2);
    const s = (a - b) * R;
    const punta = [tob[0] + 4.6 * Math.cos(s), tob[1] - 4.6 * Math.sin(s)];
    pi.muslo.setAttribute("d", linea(CADERA, rod));
    pi.short.setAttribute("d", linea([CADERA[0], CADERA[1] - 1], medio));
    pi.media.setAttribute("d", linea(rod, tob));
    pi.banda.setAttribute("d", linea(punto(rod, a - b, 2), tope));
    pi.bota.setAttribute("d", linea(tob, punta));
  });
  [[f.b1, p.brazos[0]], [f.b2, p.brazos[1]]].forEach(([br, [c, e]], i) => {
    const codo = punto(HOMBRO, c, L_BRAZO), mano = punto(codo, c + e, L_ANTEB);
    br.sup.setAttribute("d", linea(HOMBRO, codo));
    br.manga.setAttribute("d", linea(HOMBRO, punto(HOMBRO, c, L_BRAZO * .52)));
    br.puno.setAttribute("d", linea(punto(HOMBRO, c, L_BRAZO * .46), punto(HOMBRO, c, L_BRAZO * .56)));
    br.ant.setAttribute("d", linea(codo, mano));
    br.mano.setAttribute("cx", mano[0]); br.mano.setAttribute("cy", mano[1]);
    if (i === 0 && f.tarjeta) {
      const t = p.tarjeta;
      f.tarjeta.setAttribute("display", t && t.k > 0 ? "inline" : "none");
      if (t && t.k > 0) {
        f.tarjeta.setAttribute("fill", t.color);
        f.tarjeta.setAttribute("transform", `translate(${mano[0]} ${mano[1]}) rotate(${180 - (c + e)}) scale(${t.k})`);
      }
    }
  });
}

// Ciclo de carrera: fase en radianes.
function carrera(fase, amp = 1) {
  const s = Math.sin(fase), c = Math.cos(fase);
  return {
    piernas: [[34 * s * amp, 18 + 42 * clamp(-c) * amp], [-34 * s * amp, 18 + 42 * clamp(c) * amp]],
    brazos: [[-38 * s * amp, 78], [38 * s * amp, 78]],
    dy: -2.2 * Math.abs(Math.sin(fase)) * amp,
    incl: 10 * amp,
  };
}
const quieto = { piernas: [[4, 6], [-4, 6]], brazos: [[6, 14], [-6, 14]], incl: 0, dy: 0 };

function balon(padre, r) {
  const g = el("g", {}, padre);
  const sombra = el("ellipse", { rx: r, ry: r * .3, fill: "#000", opacity: .35 }, padre);
  padre.insertBefore(sombra, g);
  const giro = el("g", {}, g);
  el("circle", { r, fill: "#fbfbf8", stroke: "#2a2a2a", "stroke-width": r * .12 }, giro);
  el("path", { d: `M0 ${-r * .42} L${r * .4} ${-r * .13} L${r * .25} ${r * .34} L${-r * .25} ${r * .34} L${-r * .4} ${-r * .13} Z`, fill: "#2a2a2a" }, giro);
  for (let i = 0; i < 5; i++) {
    const a = (i * 72 - 90) * R;
    el("path", { d: `M${Math.cos(a) * r * .5} ${Math.sin(a) * r * .5} L${Math.cos(a) * r} ${Math.sin(a) * r}`, stroke: "#2a2a2a", "stroke-width": r * .1 }, giro);
  }
  return {
    poner(x, y, rot = 0, s = 1, suelo = y) {
      g.setAttribute("transform", `translate(${x.toFixed(2)} ${(y - r * s).toFixed(2)}) scale(${s})`);
      giro.setAttribute("transform", `rotate(${rot.toFixed(1)})`);
      sombra.setAttribute("cx", x); sombra.setAttribute("cy", suelo + .5);
      sombra.setAttribute("rx", r * s); sombra.setAttribute("opacity", clamp(.4 - (suelo - y) / 120, .05, .4));
    },
  };
}

// ---------------------------------------------------------------------------
// Escena 1: la falta. Todo es función del tiempo T (ms) y de la tarjeta que
// dijo el servidor: así la pausa y el movimiento reducido salen gratis.
// Profundidad: el defensor va un poco más atrás que el delantero.
const SUELO = 214, SUELO_DEF = 200, SUELO_ARB = 206, ESC1 = 1.3;
const actores1 = $("#actores1");
const def = figura(actores1, "rayas");
const arb = figura(actores1, "arbitro", true);
const del = figura(actores1, "blanco");
const bal1 = balon(actores1, 4.2);
const T_FALTA = 1650, T_PAUSA = 1820, T_LLEGA = 2950, T_TARJETA = 3050, T_FIN1 = 4000;
const COLOR = { amarilla: "#f5c518", roja: "#d6283c" };

function escena1(T, tarjeta) {
  // Delantero de blanco: corre con el balón y cae al recibir la falta.
  let dx, pd;
  if (T < T_FALTA) {
    dx = lerp(22, 150, T / T_FALTA);
    pd = { x: dx, y: SUELO, ...carrera(T / 1000 * 2 * Math.PI * 2.4) };
  } else {
    const k = tramo(T, T_FALTA, T_FALTA + 560), kk = entra(k);
    const rebote = T > T_FALTA + 560 ? Math.sin(tramo(T, T_FALTA + 560, T_FALTA + 820) * Math.PI) * 3 : 0;
    dx = 150 + 28 * sale(k);
    pd = {
      x: dx, y: SUELO, dy: -kk * 4 - rebote, rot: 86 * kk, piv: "pies", incl: 6,
      piernas: [[lerp(20, -18, k), lerp(30, 12, k)], [lerp(-30, -50, k), lerp(50, 20, k)]],
      brazos: [[lerp(-30, 160, k), lerp(70, 10, k)], [lerp(30, 140, k), lerp(70, 20, k)]],
      sombraDx: 30 * kk, sombraRx: 13 + 18 * kk,
    };
  }
  poner(del, { ...pd, s: ESC1 });

  // Defensor de rayas: llega de la derecha y se barre.
  let px, pf;
  if (T < 1300) {
    px = lerp(400, 232, T / 1300);
    pf = { x: px, y: SUELO_DEF, dir: -1, ...carrera(T / 1000 * 2 * Math.PI * 2.6 + 1) };
  } else if (T > 2500) {
    // Se levanta y protesta con los brazos abiertos: «¡fue limpia!».
    const k = suave(tramo(T, 2500, 3100)), q = 1 - k;
    const gesto = Math.sin(tramo(T, 3100, T_FIN1) * Math.PI * 3) * 10 * k;
    px = lerp(200, 262, k);
    pf = {
      x: px, y: SUELO_DEF, dir: -1, rot: -62 * q, piv: "cadera", dy: 17 * q, incl: 14 * q - 4 * k,
      piernas: [[lerp(12, 4, k), lerp(0, 6, k)], [lerp(-10, -4, k), lerp(95, 6, k)]],
      brazos: [[lerp(-70, 120, k) + gesto, lerp(30, 10, k)], [lerp(-110, 130, k) - gesto, lerp(20, 10, k)]],
      sombraDx: -18 * q, sombraRx: 13 + 14 * q,
    };
  } else {
    const k = sale(tramo(T, 1300, T_FALTA + 200));
    px = lerp(232, 200, k);
    pf = {
      x: px, y: SUELO_DEF, dir: -1, rot: -62 * k, piv: "cadera", dy: 17 * k, incl: 14 * k,
      piernas: [[lerp(20, 12, k), lerp(30, 0, k)], [lerp(-20, -10, k), lerp(40, 95, k)]],
      brazos: [[lerp(-30, -70, k), 30], [lerp(30, -110, k), 20]],
      sombraDx: -18 * k, sombraRx: 13 + 14 * k,
    };
  }
  poner(def, { ...pf, s: ESC1 });

  // Balón: delante del delantero; tras la falta sigue rodando.
  let bx;
  if (T < T_FALTA) bx = dx + 17 + 6 * Math.sin(T / 140);
  else bx = 150 + 17 + 6 * Math.sin(T_FALTA / 140) + 120 * sale(tramo(T, T_FALTA, T_FALTA + 1500));
  const salto = T < T_FALTA ? Math.abs(Math.sin(T / 140)) * 2 : 0;
  bal1.poner(bx, SUELO - salto, bx * 9, 1, SUELO);

  // Árbitro de negro: entra corriendo tras el silbatazo y saca la tarjeta.
  let ax, pa;
  if (T < T_PAUSA) { ax = -40; pa = { x: ax, y: SUELO_ARB, ...quieto }; }
  else if (T < T_LLEGA) {
    const k = tramo(T, T_PAUSA, T_LLEGA);
    ax = lerp(-40, 96, sale(k));
    pa = { x: ax, y: SUELO_ARB, ...carrera(T / 1000 * 2 * Math.PI * 2.5, lerp(1, .5, k)) };
  } else {
    const k = suave(tramo(T, T_TARJETA, T_TARJETA + 380));
    ax = 96;
    if (tarjeta === "nada") {
      // «¡Siga!»: los dos brazos al frente, palmas abiertas, y un vaivén.
      const vai = Math.sin(tramo(T, T_TARJETA + 380, T_FIN1) * Math.PI * 4) * 8 * k;
      pa = { x: ax, y: SUELO_ARB, piernas: quieto.piernas, incl: 0, brazos: [[lerp(6, 92, k) + vai, lerp(14, 0, k)], [lerp(-6, 80, k) - vai, lerp(14, 0, k)]] };
    } else {
      pa = {
        x: ax, y: SUELO_ARB, piernas: quieto.piernas, incl: -4 * k,
        brazos: [[lerp(6, 172, k), lerp(14, 0, k)], [lerp(-6, 20, k), lerp(14, 40, k)]],
        tarjeta: tarjeta ? { k: k, color: COLOR[tarjeta] } : null,
      };
    }
  }
  poner(arb, { ...pa, s: ESC1 });
}

// ---------------------------------------------------------------------------
// Escena 2: el tiro libre, de cara al arco. Barrera de rayas, arquero y el
// delantero de blanco que patea.
const actores2 = $("#actores2");
function deFrente(padre, kit, x, y, s, brazos) {
  const k = KITS[kit] || kit;
  const sombra = el("ellipse", { cx: x, cy: y + .5, rx: 10 * s, ry: 2.2 * s, fill: "#000", opacity: .3 }, padre);
  const g = el("g", {}, padre);
  const c = el("g", {}, g);
  el("rect", { x: -5.8, y: -26, width: 4.6, height: 24, rx: 2, fill: k.media }, c);
  el("rect", { x: 1.2, y: -26, width: 4.6, height: 24, rx: 2, fill: k.media }, c);
  el("rect", { x: -6.6, y: -3, width: 6, height: 3, rx: 1.4, fill: k.bota }, c);
  el("rect", { x: .6, y: -3, width: 6, height: 3, rx: 1.4, fill: k.bota }, c);
  el("rect", { x: -7.6, y: -31, width: 15.2, height: 10, rx: 2.5, fill: k.short }, c);
  el("rect", { x: -8.4, y: -50, width: 16.8, height: 21, rx: 5.5, fill: k.camisa }, c);
  el("circle", { cx: 0, cy: -56.5, r: 6.8, fill: k.piel }, c);
  el("path", { d: "M-6.8 -57 Q-6.4 -64 0 -64 Q6.4 -64 6.8 -57 Q3 -60.2 0 -60 Q-3 -60.2 -6.8 -57 Z", fill: k.pelo }, c);
  if (brazos === "barrera") {
    el("rect", { x: -9, y: -37.5, width: 18, height: 5, rx: 2.5, fill: k.piel }, c);
    el("rect", { x: -9.6, y: -45, width: 4, height: 9, rx: 2, fill: k.manga }, c);
    el("rect", { x: 5.6, y: -45, width: 4, height: 9, rx: 2, fill: k.manga }, c);
  } else {
    el("path", { d: "M-8 -46 L-16 -36 M8 -46 L16 -36", stroke: k.manga, "stroke-width": 4.6, "stroke-linecap": "round" }, c);
    el("circle", { cx: -17, cy: -34.5, r: 3.4, fill: k.guante || k.piel }, c);
    el("circle", { cx: 17, cy: -34.5, r: 3.4, fill: k.guante || k.piel }, c);
  }
  return {
    poner(dx = 0, dy = 0, rot = 0) {
      g.setAttribute("transform", `translate(${(x + dx).toFixed(2)} ${(y + dy).toFixed(2)}) scale(${s}) rotate(${rot.toFixed(1)} 0 -30)`);
      sombra.setAttribute("cx", x + dx);
      sombra.setAttribute("opacity", clamp(.3 + dy / 60, .08, .3));
    },
  };
}
const ARQ = { camisa: "#1aa37a", manga: "#1aa37a", short: "#103d33", media: "#1aa37a", bota: "#111", piel: "#b98257", pelo: "#1d140e", guante: "#f2f2ee" };
const arquero = deFrente(actores2, ARQ, 180, 118, .5);
const barrera = [150, 165, 180, 195].map((x, i) => deFrente(actores2, { ...KITS.rayas, piel: ["#e3b48d", "#9c6b45", "#d7a67c", "#7a4d31"][i] }, x, 168, .7, "barrera"));
const pateador = figura(actores2, "blanco");
const bal2 = balon(actores2, 5);
const T2_PAUSA = 900, T2_PATEA = 1060, T2_LLEGA = 2000, T2_FIN = 3000;
const B0 = [180, 216];

// Trayectoria del balón según el resultado: [control, fin, rebote?].
const TRAYECTOS = {
  gol: { c: [150, 52], f: [124, 80], s: .42 },
  palo: { c: [148, 56], f: [109, 84], s: .44, rebote: [74, 150] },
  atajada: { c: [156, 62], f: [150, 90], s: .46 },
  afuera: { c: [150, 40], f: [80, 70], s: .44 },
  barrera: { c: [178, 160], f: [176, 150], s: .72, rebote: [214, 206], hasta: .42 },
};
const bez = (a, c, b, k) => [(1 - k) ** 2 * a[0] + 2 * (1 - k) * k * c[0] + k * k * b[0], (1 - k) ** 2 * a[1] + 2 * (1 - k) * k * c[1] + k * k * b[1]];

function escena2(T, resultado) {
  // El que patea: carrera corta en diagonal, apoyo y remate.
  let p;
  if (T < T2_PAUSA) {
    const k = T / T2_PAUSA;
    p = { x: lerp(112, 164, k), y: lerp(232, 222, k), s: 1.05, ...carrera(T / 1000 * 2 * Math.PI * 2.2, lerp(1, .6, k)) };
    if (T > T2_PAUSA - 220) { // carga la pierna
      const c = tramo(T, T2_PAUSA - 220, T2_PAUSA);
      p.piernas = [[lerp(p.piernas[0][0], -48, c), lerp(p.piernas[0][1], 80, c)], [lerp(p.piernas[1][0], 6, c), lerp(p.piernas[1][1], 8, c)]];
      p.brazos = [[lerp(p.brazos[0][0], -40, c), 40], [lerp(p.brazos[1][0], 70, c), 30]];
      p.incl = lerp(p.incl, -6, c);
    }
  } else {
    const c = sale(tramo(T, T2_PAUSA, T2_PATEA));
    p = { x: 164 + 4 * c, y: 222, s: 1.05, incl: lerp(-6, 4, c), dy: 0,
      piernas: [[lerp(-48, 74, c), lerp(80, 0, c)], [6, 8]], brazos: [[lerp(-40, -70, c), 40], [lerp(70, 90, c), 30]] };
  }
  poner(pateador, p);

  const tr = resultado ? TRAYECTOS[resultado] : null;
  // Barrera: salta cuando sale el balón.
  const sb = Math.sin(tramo(T, T2_PATEA, T2_PATEA + 520) * Math.PI);
  barrera.forEach((b, i) => b.poner(0, -10 * sb * (i % 2 ? .9 : 1)));

  // Arquero: se lanza hacia donde va el balón (llega o no según el resultado).
  const kd = suave(tramo(T, T2_PATEA + 240, T2_LLEGA - 120));
  let ad = 0, ay = 0, arot = Math.sin(T / 260) * 2;
  if (tr && resultado !== "barrera") {
    const alcance = { gol: -30, palo: -34, atajada: -30, afuera: -22 }[resultado];
    const giro = { gol: -58, palo: -66, atajada: -46, afuera: -30 }[resultado];
    ad = alcance * kd; ay = -14 * Math.sin(kd * Math.PI * .8); arot = giro * kd;
  }
  arquero.poner(ad, ay, arot);

  // Balón.
  if (!tr || T < T2_PATEA) { bal2.poner(B0[0], B0[1], 0, 1, B0[1]); return; }
  const hasta = tr.hasta || 1;
  const kv = tramo(T, T2_PATEA, lerp(T2_PATEA, T2_LLEGA, hasta));
  let pos, s, suelo;
  if (kv < 1) {
    pos = bez(B0, tr.c, tr.f, sale(kv)); s = lerp(1, tr.s, sale(kv));
    suelo = lerp(B0[1], resultado === "barrera" ? 168 : 118, sale(kv));
  } else if (tr.rebote) {
    const kr = sale(tramo(T, lerp(T2_PATEA, T2_LLEGA, hasta), lerp(T2_PATEA, T2_LLEGA, hasta) + 700));
    pos = [lerp(tr.f[0], tr.rebote[0], kr), lerp(tr.f[1], tr.rebote[1], kr) - Math.sin(kr * Math.PI) * 18];
    s = lerp(tr.s, resultado === "barrera" ? .95 : .6, kr);
    suelo = lerp(resultado === "barrera" ? 168 : 118, tr.rebote[1], kr);
  } else {
    pos = tr.f; s = tr.s; suelo = 118;
    if (resultado === "gol") pos = [tr.f[0] + 2 * Math.sin(T / 40) * Math.exp(-(T - T2_LLEGA) / 300), tr.f[1] + 6 * clamp((T - T2_LLEGA) / 400)];
  }
  bal2.poner(pos[0], pos[1], kv * 900, s, suelo);
  // La red se mueve con el gol.
  const red = $("#red");
  if (resultado === "gol" && T > T2_LLEGA) {
    const kk = Math.exp(-(T - T2_LLEGA) / 260) * Math.sin((T - T2_LLEGA) / 45);
    red.setAttribute("transform", `translate(${(kk * -1.5).toFixed(2)} ${(kk * 2).toFixed(2)})`);
  } else red.removeAttribute("transform");
}

// ---------------------------------------------------------------------------
// Motor de tiempo: corre la escena de T0 a T1. Con movimiento reducido salta
// directo al final del tramo.
let reloj = 0;
function correr(pintar, T0, T1, alPasar = []) {
  return new Promise((listo) => {
    if (QUIETO) {
      alPasar.forEach(([t, f]) => t >= T0 && t < T1 && f());
      pintar(T1); setTimeout(listo, 250); return;
    }
    const inicio = performance.now(), id = ++reloj;
    let previo = T0;
    const paso = (ahora) => {
      if (id !== reloj) return listo();
      const T = Math.min(T1, T0 + (ahora - inicio));
      alPasar.forEach(([t, f]) => t >= previo && t < T && f());
      previo = T;
      pintar(T);
      if (T < T1) requestAnimationFrame(paso); else listo();
    };
    requestAnimationFrame(paso);
  });
}
const espera = (ms) => new Promise((ok) => setTimeout(ok, QUIETO ? Math.min(ms, 200) : ms));

// ---------------------------------------------------------------------------
// Sonido: todo sintetizado (ruido filtrado y osciladores). Arranca solo tras
// un gesto de la persona.
const Sonido = (() => {
  let ctx = null, maestro = null, ambiente = null, ruido = null;
  let mudo = false;
  try { mudo = localStorage.getItem(LLAVE_MUDO) === "1"; } catch (e) { /* nada */ }
  function bufferRuido(seg) {
    const n = Math.floor(ctx.sampleRate * seg), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0; // ruido rosa (aprox. de Paul Kellet)
    for (let i = 0; i < n; i++) {
      const w = Math.random() * 2 - 1;
      b0 = .99765 * b0 + w * .099046; b1 = .963 * b1 + w * .2965164; b2 = .57 * b2 + w * 1.0526913;
      d[i] = (b0 + b1 + b2 + w * .1848) * .18;
    }
    return b;
  }
  function iniciar() {
    if (ctx) { if (ctx.state === "suspended") ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    maestro = ctx.createGain(); maestro.gain.value = mudo ? 0 : .9; maestro.connect(ctx.destination);
    ruido = bufferRuido(4);
    // Murmullo del estadio: ruido rosa en banda media con oleadas lentas.
    const src = ctx.createBufferSource(); src.buffer = ruido; src.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 620; bp.Q.value = .55;
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2200;
    ambiente = ctx.createGain(); ambiente.gain.value = .0001;
    const ola = ctx.createOscillator(); ola.frequency.value = .07;
    const olaG = ctx.createGain(); olaG.gain.value = .05;
    const ola2 = ctx.createOscillator(); ola2.frequency.value = .19;
    const ola2G = ctx.createGain(); ola2G.gain.value = .025;
    ola.connect(olaG).connect(ambiente.gain); ola2.connect(ola2G).connect(ambiente.gain);
    src.connect(bp).connect(lp).connect(ambiente).connect(maestro);
    src.start(); ola.start(); ola2.start();
    ambiente.gain.setTargetAtTime(.16, ctx.currentTime, 1.2);
  }
  // «Uuuh» de la tribuna: voces graves (sierras desafinadas) por un formante
  // que se cierra, más ruido que sube y baja. fuerte = grito de gol.
  function ola(fuerte = false) {
    if (!ctx) return;
    const t = ctx.currentTime, dur = fuerte ? 2.6 : 1.9;
    const g = ctx.createGain(); g.gain.value = 0; g.connect(maestro);
    g.gain.linearRampToValueAtTime(fuerte ? .3 : .2, t + .35);
    g.gain.setTargetAtTime(0, t + dur * .55, dur * .25);
    const form = ctx.createBiquadFilter(); form.type = "bandpass"; form.Q.value = 1.6;
    form.frequency.setValueAtTime(fuerte ? 700 : 420, t);
    form.frequency.linearRampToValueAtTime(fuerte ? 1100 : 680, t + .4);
    form.frequency.linearRampToValueAtTime(fuerte ? 800 : 380, t + dur);
    form.connect(g);
    for (let i = 0; i < 14; i++) {
      const o = ctx.createOscillator(); o.type = "sawtooth";
      const f0 = (fuerte ? 210 : 150) + Math.random() * 110;
      o.frequency.setValueAtTime(f0, t);
      o.frequency.linearRampToValueAtTime(f0 * (fuerte ? 1.12 : 1.06), t + .4);
      o.frequency.linearRampToValueAtTime(f0 * (fuerte ? .95 : .82), t + dur);
      const og = ctx.createGain(); og.gain.value = .018;
      o.connect(og).connect(form); o.start(t + Math.random() * .12); o.stop(t + dur + .4);
    }
    const n = ctx.createBufferSource(); n.buffer = ruido;
    const nf = ctx.createBiquadFilter(); nf.type = "bandpass"; nf.frequency.value = fuerte ? 1400 : 900; nf.Q.value = .7;
    const ng = ctx.createGain(); ng.gain.value = fuerte ? 1.1 : .7;
    n.connect(nf).connect(ng).connect(form); n.start(t); n.stop(t + dur + .4);
  }
  // Silbato: dos pitidos cortos y uno largo con trino (modulación rápida de
  // frecuencia), entre 2,5 y 3,5 kHz, con un poco de soplido.
  function silbato(soloUno = false) {
    if (!ctx) return;
    const t0 = ctx.currentTime + .02;
    const notas = soloUno ? [[0, .45]] : [[0, .11], [.17, .11], [.4, 1.05]];
    for (const [ini, dur] of notas) {
      const t = t0 + ini;
      const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = 3050;
      const trino = ctx.createOscillator(); trino.type = "sine"; trino.frequency.value = dur > .3 ? 34 : 46;
      const trinoG = ctx.createGain(); trinoG.gain.value = dur > .3 ? 330 : 180;
      trino.connect(trinoG).connect(o.frequency);
      const env = ctx.createGain(); env.gain.value = 0;
      env.gain.linearRampToValueAtTime(.16, t + .012);
      env.gain.setValueAtTime(.16, t + dur - .04);
      env.gain.linearRampToValueAtTime(0, t + dur);
      o.connect(env).connect(maestro);
      const so = ctx.createBufferSource(); so.buffer = ruido;
      const sf = ctx.createBiquadFilter(); sf.type = "bandpass"; sf.frequency.value = 3000; sf.Q.value = 6;
      const sg = ctx.createGain(); sg.gain.value = 0;
      sg.gain.linearRampToValueAtTime(.5, t + .012); sg.gain.setValueAtTime(.5, t + dur - .04); sg.gain.linearRampToValueAtTime(0, t + dur);
      so.connect(sf).connect(sg).connect(maestro);
      o.start(t); trino.start(t); so.start(t);
      o.stop(t + dur + .05); trino.stop(t + dur + .05); so.stop(t + dur + .05);
    }
  }
  function patada() {
    if (!ctx) return;
    const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(50, t + .12);
    g.gain.setValueAtTime(.5, t); g.gain.exponentialRampToValueAtTime(.001, t + .15);
    o.connect(g).connect(maestro); o.start(t); o.stop(t + .2);
  }
  function tension(nivel) { if (ambiente) ambiente.gain.setTargetAtTime(nivel, ctx.currentTime, .5); }
  function alternar() {
    mudo = !mudo;
    try { localStorage.setItem(LLAVE_MUDO, mudo ? "1" : "0"); } catch (e) { /* nada */ }
    if (maestro) maestro.gain.setTargetAtTime(mudo ? 0 : .9, ctx.currentTime, .05);
    return mudo;
  }
  return { iniciar, ola, silbato, patada, tension, alternar, get mudo() { return mudo; } };
})();

const botonMudo = $("#mudo");
const pintarMudo = () => { botonMudo.textContent = Sonido.mudo ? "🔇" : "🔊"; botonMudo.setAttribute("aria-pressed", String(Sonido.mudo)); botonMudo.title = Sonido.mudo ? "Activar sonido" : "Silenciar"; };
pintarMudo();
botonMudo.addEventListener("click", () => { Sonido.iniciar(); Sonido.alternar(); pintarMudo(); });

// ---------------------------------------------------------------------------
// Estado de la página.
let token = null;
try { token = localStorage.getItem(LLAVE); } catch (e) { token = null; }
let estado = {}, yo = null, ocupado = false;

const fecha = (iso) => {
  const d = new Date(iso);
  const dia = d.toLocaleDateString("es-PE", { day: "numeric", month: "short", timeZone: "America/Lima" }).replace(".", "");
  const h = d.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Lima" });
  return `${dia} ${h}`;
};
const NOMBRE_T = { amarilla: "amarilla", roja: "roja", nada: "sin tarjeta" };

function pintarEstado() {
  const e = estado;
  $("#reglaTxt").firstChild.textContent = `El servidor decide: aciertas 1 de cada ${e.prob_n}`;
  const cajas = [...document.querySelectorAll("#premios > div")];
  (e.premios || []).forEach((p, i) => {
    const c = cajas[i];
    if (!c) return;
    c.querySelector("b").textContent = `${p.descuento} %`;
    c.querySelector(".de").textContent = p.descuento === 100 ? "gratis" : "de descuento";
    c.querySelector("em").textContent = p.entregado ? `Ganó ${p.ganador}` : "Libre";
    c.classList.toggle("ya", !!p.entregado);
  });
  $("#chipJug").textContent = `${e.jugadas_por_persona} jugadas por persona`;
  const tl = e.tiro_libre || {};
  $("#chipTL").textContent = `¿Fallaste las ${e.jugadas_por_persona}? Tiro libre · ${tl.descuento || 85} %` + ("quedan_50" in tl ? ` · quedan ${tl.quedan_50}` : "");
  $("#tlRegla").textContent = `Tiro libre: solo si fallaste tus ${e.jugadas_por_persona} jugadas, uno por persona; aciertas 1 de cada ${tl.prob_n || 2} y ganas un código de ${tl.descuento || 85} %` + ("quedan_50" in tl ? ` (quedan ${tl.quedan_50} de ${tl.cupos_50}).` : ".");
  $("#cJug").textContent = e.jugadas_totales ?? 0;
  $("#cAc").textContent = e.aciertos ?? 0;
  $("#cTL").textContent = tl.pateados ?? 0;
  $("#c50").textContent = tl.codigos_50 ?? 0;
  const ul = $("#ganadores");
  if (!e.ganadores || !e.ganadores.length) { ul.innerHTML = ""; $("#ganTxt").hidden = false; return; }
  $("#ganTxt").hidden = true;
  ul.innerHTML = e.ganadores.map((g) => {
    const icono = g.juego === "tiro_libre" ? "⚽" : g.descuento === 100 ? '<i class="tj ro"></i>' : '<i class="tj am"></i>';
    const como = g.juego === "tiro_libre" ? "tiro libre" : `jugada ${g.jugada}`;
    return `<li><b>${icono}${esc(g.nombre)} <span class="pc">${g.descuento} %</span></b><span>${fecha(g.fecha)} · ${como}</span></li>`;
  }).join("");
}
async function cargarEstado() {
  try { estado = await api("api/estado"); pintarEstado(); } catch (e) { /* se reintenta luego */ }
}

function ver(id, si) { $(id).hidden = !si; }
function escenaActiva(n) {
  $("#esc1").setAttribute("display", n === 1 ? "inline" : "none");
  $("#esc2").setAttribute("display", n === 2 ? "inline" : "none");
}
function pregunta(txt) {
  if (txt) { $("#preguntaTxt").textContent = txt; $("#pregunta").hidden = false; $("#estadio").classList.add("pausa"); }
  else { $("#pregunta").hidden = true; $("#estadio").classList.remove("pausa"); }
}
function cartel(tarjeta) {
  const c = $("#cartel");
  if (!tarjeta) { c.hidden = true; return; }
  const cls = { amarilla: "am", roja: "ro", nada: "na" }[tarjeta];
  c.innerHTML = `<div class="c ${cls}">${tarjeta === "nada" ? "✋" : ""}</div><span>${{ amarilla: "AMARILLA", roja: "ROJA", nada: "¡SIGA!" }[tarjeta]}</span>`;
  c.hidden = false;
}

// Qué mostrar según cómo está la persona.
function pintarYo() {
  ver("#inscripcion", false); ver("#juego", true);
  $("#nom").textContent = yo.nombre;
  const total = estado.jugadas_por_persona || 3, usados = yo.jugadas || 0;
  let bolas = "";
  for (let i = 0; i < total; i++) bolas += `<i class="${i < usados ? "gastado" : ""}"></i>`;
  const r = yo.jugadas_restantes;
  const resto = r > 0 ? `${r} ${r === 1 ? "jugada" : "jugadas"}` : yo.tiro_libre_disponible ? "Tiro libre" : "Terminaste";
  $("#restan").innerHTML = `${resto}<span class="puntos">${bolas}</span>`;
  if (yo.excluido) { $("#aviso").hidden = false; $("#aviso").textContent = (yo.aviso || "Ya ganaste en Claude Code PRO: puedes jugar, pero esta vez los cupos son para otros") + ". ¡Gracias por venir a la cancha!"; }
  else $("#aviso").hidden = true;
  ver("#opciones", false); ver("#opcionesTL", false); ver("#nota", false);
  ver("#segunda", false); ver("#fin", false);
  const emp = $("#empezar");
  if (yo.gane) {
    emp.hidden = true;
    mostrarPremio();
  } else if (r > 0) {
    emp.hidden = false; emp.textContent = `▶ ${usados === 0 ? "Empezar" : "Siguiente"}: jugada ${usados + 1} de ${total}`;
  } else if (yo.tiro_libre_disponible) {
    emp.hidden = true; ver("#segunda", true);
    const tl = estado.tiro_libre || {};
    $("#segundaTxt").textContent = `Un tiro libre: dinos si entra el gol. Aciertas 1 de cada ${tl.prob_n || 2} y ganas un código de ${tl.descuento || 85} % de descuento.` +
      (yo.excluido ? " (Como ya ganaste en Claude Code PRO, juegas por el gusto: no da premio.)" : "");
  } else {
    emp.hidden = true; ver("#fin", true);
    $("#fin").innerHTML = "Gracias por jugar. Las clases de Claude Code PRO son los sábados de noviembre, de 7:30 a 9:30 p.m.: <b>te esperamos</b>.";
  }
}

function mostrarPremio() {
  const d = yo.descuento || 100;
  ver("#premio", true);
  $("#premioK").textContent = `${yo.juego === "tiro_libre" ? "¡TIRO LIBRE ACERTADO!" : "¡ACERTASTE!"} · CÓDIGO ${d} % · UN SOLO USO`;
  $("#premioBig").innerHTML = `${d} %<small>${d === 100 ? "GRATIS" : "DE DESCUENTO"}</small>`;
  $("#premioTxt").textContent = d === 100
    ? "Toca «Usar mi código»: va puesto en la matrícula. Elige «Individual» y el total queda en S/ 0."
    : `Toca «Usar mi código»: va puesto en la matrícula y el ${d} % se descuenta solo. Elige «Individual».`;
  const cod = $("#cod");
  if (yo.codigo) {
    cod.textContent = yo.codigo; cod.className = "cod";
    $("#usar").href = (estado.matricula || "https://jmd-learn.online/sorteo-claude/matricula?c=") + encodeURIComponent(yo.codigo);
    $("#usar").hidden = false;
  } else {
    cod.textContent = "Tu código está en camino: el acierto quedó registrado y te lo completamos en minutos. Vuelve a esta página desde este mismo navegador."; cod.className = "cod pend";
    $("#usar").hidden = true;
  }
}

function confeti() {
  const caja = $("#estadio"), colores = ["#f5c518", "#fff", "#d6283c", "#8cc49b"];
  for (let i = 0; i < 48; i++) {
    const e = document.createElement("i"); e.className = "conf";
    e.style.cssText = `left:${5 + Math.random() * 90}%;background:${colores[i % 4]};animation-delay:${Math.random() * .8}s`;
    caja.append(e); setTimeout(() => e.remove(), 3200);
  }
}

// Espera a que la persona toque una de las opciones.
function elegir(caja) {
  return new Promise((listo) => {
    const bs = [...document.querySelectorAll(caja + " .btn")];
    bs.forEach((b) => (b.disabled = false));
    const f = (ev) => { bs.forEach((b) => { b.disabled = true; b.removeEventListener("click", f); }); listo(ev.currentTarget.dataset.e); };
    bs.forEach((b) => b.addEventListener("click", f));
  });
}

// Lo que dice el servidor de la persona manda (p. ej. si se abrió el tiro libre).
async function refrescarYo() {
  try { yo = await api("api/yo?t=" + encodeURIComponent(token)); } catch (e) { /* se queda con lo local */ }
}

// --- Una jugada: falta, pausa, elección, árbitro, tarjeta. ---
async function jugada() {
  if (ocupado) return;
  ocupado = true;
  Sonido.iniciar();
  $("#err2").textContent = ""; $("#res").className = "res"; $("#res").textContent = "";
  ver("#empezar", false); cartel(null); escenaActiva(1);
  let tarjeta = null;
  const pintar = (T) => escena1(T, tarjeta);
  try {
    await correr(pintar, 0, T_PAUSA, [[T_FALTA - 40, () => Sonido.ola(false)]]);
    pregunta("¿Qué saca el árbitro?");
    ver("#opciones", true);
    $("#nota").textContent = `El servidor decide: aciertas 1 de cada ${estado.prob_n || 250}. Tu elección no cambia la probabilidad.`;
    ver("#nota", true);
    Sonido.tension(.1);
    const eleccion = await elegir("#opciones");
    pregunta(null);
    Sonido.tension(.16);
    const pedido = api("api/jugar", { method: "POST", body: JSON.stringify({ t: token, eleccion }) });
    Sonido.silbato();
    let r;
    try {
      await correr(pintar, T_PAUSA, T_LLEGA);
      r = await pedido;
    } catch (e) { ver("#opciones", false); ver("#nota", false); throw e; }
    tarjeta = r.tarjeta;
    await correr(pintar, T_LLEGA, T_FIN1, [[T_TARJETA + 200, () => { cartel(tarjeta); if (r.acierto) Sonido.ola(true); }]]);
    ver("#opciones", false); ver("#nota", false);
    yo.jugadas = r.jugada; yo.jugadas_restantes = r.jugadas_restantes;
    const res = $("#res");
    const quedan = r.jugadas_restantes > 0 ? `Te ${r.jugadas_restantes === 1 ? "queda 1 jugada" : `quedan ${r.jugadas_restantes} jugadas`}.` : "Era tu última jugada.";
    if (r.acierto) {
      res.className = "res bien";
      if ("codigo" in r) {
        yo.gane = true; yo.juego = ""; yo.codigo = r.codigo; yo.codigo_pendiente = r.codigo_pendiente; yo.descuento = r.descuento;
        res.innerHTML = `¡Acertaste!<small>El árbitro ${r.tarjeta === "nada" ? "no sacó tarjeta" : `sacó ${r.tarjeta}`}, como dijiste. Guarda tu código.</small>`;
      } else {
        res.innerHTML = `¡Acertaste!<small>Pero los premios ya salieron. ¡Qué ojo de árbitro! ${quedan}</small>`;
      }
      confeti();
    } else {
      const titulo = { amarilla: "¡Amarilla!", roja: "¡Roja directa!", nada: "¡Siga, siga!" }[r.tarjeta];
      res.className = "res mal";
      res.innerHTML = `${titulo}<small>Tú dijiste ${NOMBRE_T[r.eleccion]}. ${quedan}</small>`;
    }
    await refrescarYo();
    pintarYo();
    cargarEstado();
  } catch (e) {
    $("#err2").textContent = e.message;
    try { yo = await api("api/yo?t=" + encodeURIComponent(token)); pintarYo(); } catch (e2) { /* nada */ }
  } finally { ocupado = false; }
}

// --- La segunda oportunidad: tiro libre. ---
async function tiroLibre() {
  if (ocupado) return;
  ocupado = true;
  Sonido.iniciar();
  $("#err2").textContent = ""; $("#res").className = "res"; $("#res").textContent = "";
  ver("#segunda", false); cartel(null); escenaActiva(2);
  let resultado = null;
  const pintar = (T) => escena2(T, resultado);
  pintar(0);
  $("#estadio").scrollIntoView({ behavior: QUIETO ? "auto" : "smooth", block: "center" });
  try {
    Sonido.silbato(true);
    await espera(650);
    await correr(pintar, 0, T2_PAUSA);
    pregunta("¿Entra el gol?");
    ver("#opcionesTL", true);
    const tl = estado.tiro_libre || {};
    $("#nota").textContent = `El servidor decide: aciertas 1 de cada ${tl.prob_n || 2}. Decir sí o no no cambia la probabilidad.`;
    ver("#nota", true);
    Sonido.tension(.08);
    const eleccion = await elegir("#opcionesTL");
    pregunta(null);
    const r = await api("api/tiro-libre", { method: "POST", body: JSON.stringify({ t: token, eleccion }) });
    resultado = r.resultado;
    Sonido.tension(.16);
    await correr(pintar, T2_PAUSA, T2_FIN, [
      [T2_PAUSA + 120, () => Sonido.patada()],
      [T2_LLEGA - 80, () => Sonido.ola(r.gol)],
    ]);
    ver("#opcionesTL", false); ver("#nota", false);
    yo.tiro_libre_usado = true; yo.tiro_libre_disponible = false;
    const titulo = { gol: "¡GOOOL!", barrera: "¡En la barrera!", palo: "¡Al palo!", atajada: "¡La atajó!", afuera: "¡Se fue afuera!" }[r.resultado];
    const dijo = r.eleccion === "si" ? "que entraba" : "que no entraba";
    const res = $("#res");
    if (r.acierto) {
      res.className = "res bien";
      if ("codigo" in r) {
        yo.gane = true; yo.juego = "tiro_libre"; yo.codigo = r.codigo; yo.codigo_pendiente = r.codigo_pendiente; yo.descuento = r.descuento;
        res.innerHTML = `${titulo}<small>Dijiste ${dijo} y acertaste: ${r.descuento} % de descuento para Claude Code PRO.</small>`;
      } else {
        res.innerHTML = `${titulo}<small>Dijiste ${dijo} y acertaste, pero los códigos del tiro libre ya salieron.</small>`;
      }
      confeti();
    } else {
      res.className = "res mal";
      res.innerHTML = `${titulo}<small>Dijiste ${dijo}. Esta vez no se dio.</small>`;
    }
    await refrescarYo();
    pintarYo();
    cargarEstado();
  } catch (e) {
    $("#err2").textContent = e.message;
    try { yo = await api("api/yo?t=" + encodeURIComponent(token)); pintarYo(); } catch (e2) { /* nada */ }
  } finally { ocupado = false; }
}

$("#empezar").addEventListener("click", jugada);
$("#irTL").addEventListener("click", tiroLibre);

$("#form").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  Sonido.iniciar();
  const btn = $("#quiero"); btn.disabled = true; $("#err1").textContent = "";
  try {
    yo = await api("api/inscribir", { method: "POST", body: JSON.stringify({ nombre: $("#nombre").value }) });
    token = yo.t;
    try { localStorage.setItem(LLAVE, token); } catch (e) { /* sin memoria: igual juega */ }
    pintarYo();
    $("#juego").scrollIntoView({ behavior: QUIETO ? "auto" : "smooth", block: "start" });
  } catch (e) {
    $("#err1").textContent = e.message;
  } finally { btn.disabled = false; }
});

// Cuadro inicial de cada escena.
escena1(0, null);
escena2(0, null);

(async () => {
  await cargarEstado();
  if (token) {
    try {
      yo = await api("api/yo?t=" + encodeURIComponent(token));
      pintarYo();
      // Quien vuelve ya terminado ve la última escena quieta.
      if (yo.gane || yo.jugadas_restantes <= 0) { if (yo.tiro_libre_usado) { escenaActiva(2); } else escena1(T_PAUSA - 300, null); }
    } catch (e) { token = null; try { localStorage.removeItem(LLAVE); } catch (e2) { /* nada */ } }
  }
  setInterval(cargarEstado, 20000);
})();
