// Común a las tres páginas: API, tanda de penales animada y verificación.

const BASE = new URL(".", location.href).pathname.replace(/(pantalla|admin)$/, "");

export async function api(ruta, opciones = {}) {
  const r = await fetch(BASE + ruta, {
    ...opciones,
    headers: { "Content-Type": "application/json", ...(opciones.headers || {}) },
    cache: "no-store",
  });
  const datos = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(datos.error || `Error ${r.status}`);
  return datos;
}

export const pad = (n) => String(n).padStart(2, "0");
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const lento = !matchMedia("(prefers-reduced-motion: reduce)").matches;
const T = (ms) => (lento ? ms : Math.round(ms / 3));
const suave = (t) => 1 - Math.pow(1 - t, 3);

function tween(dur, paso) {
  return new Promise((fin) => {
    const t0 = performance.now();
    const cuadro = (ahora) => {
      const t = Math.min(1, (ahora - t0) / dur);
      paso(suave(t), t);
      if (t < 1) requestAnimationFrame(cuadro);
      else fin();
    };
    requestAnimationFrame(cuadro);
  });
}

const NS = "http://www.w3.org/2000/svg";
function el(tag, attrs = {}, padre) {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (padre) padre.appendChild(n);
  return n;
}

/** Dibuja la cancha con arquero, jugador (con su número) y balón. */
export function crearCancha(contenedor, numero, camiseta = "#2563eb") {
  contenedor.innerHTML = "";
  const svg = el("svg", { viewBox: "0 0 360 260", class: "cancha", role: "img", "aria-label": `Penales del número ${numero}` }, contenedor);
  for (let i = 0; i < 6; i++) el("rect", { x: 0, y: i * 44, width: 360, height: 44, fill: i % 2 ? "#14532d" : "#166534" }, svg);
  el("rect", { x: 40, y: 120, width: 280, height: 52, fill: "none", stroke: "rgba(255,255,255,.55)", "stroke-width": 2 }, svg);
  el("circle", { cx: 180, cy: 200, r: 2.5, fill: "#fff" }, svg);
  const red = el("g", { class: "red" }, svg);
  for (let x = 84; x <= 276; x += 12) el("line", { x1: x, y1: 36, x2: x, y2: 120, stroke: "rgba(255,255,255,.22)" }, red);
  for (let y = 44; y <= 120; y += 10) el("line", { x1: 82, y1: y, x2: 278, y2: y, stroke: "rgba(255,255,255,.22)" }, red);
  el("path", { d: "M80 121 V34 H280 V121", fill: "none", stroke: "#fff", "stroke-width": 5, "stroke-linejoin": "round" }, svg);

  // Arquero (de frente, con guantes).
  const arquero = el("g", { class: "arquero", style: "transform-origin: 180px 104px" }, svg);
  el("rect", { x: 170, y: 104, width: 8, height: 16, rx: 3, fill: "#111827" }, arquero);
  el("rect", { x: 182, y: 104, width: 8, height: 16, rx: 3, fill: "#111827" }, arquero);
  el("rect", { x: 166, y: 80, width: 28, height: 28, rx: 7, fill: "#f97316" }, arquero);
  el("rect", { x: 150, y: 80, width: 18, height: 7, rx: 3.5, fill: "#f97316", transform: "rotate(-35 166 83)" }, arquero);
  el("rect", { x: 192, y: 80, width: 18, height: 7, rx: 3.5, fill: "#f97316", transform: "rotate(35 194 83)" }, arquero);
  el("circle", { cx: 153, cy: 73, r: 5, fill: "#fde047" }, arquero);
  el("circle", { cx: 207, cy: 73, r: 5, fill: "#fde047" }, arquero);
  el("circle", { cx: 180, cy: 71, r: 9, fill: "#e0ac69" }, arquero);

  // Jugador (de espaldas) con su número.
  const jugador = el("g", {}, svg);
  el("rect", { x: 141, y: 236, width: 8, height: 20, rx: 3, fill: "#0f172a" }, jugador);
  const pierna = el("rect", { x: 153, y: 236, width: 8, height: 20, rx: 3, fill: "#0f172a", class: "pierna" }, jugador);
  el("rect", { x: 134, y: 200, width: 34, height: 40, rx: 8, fill: camiseta }, jugador);
  const dorsal = el("text", { x: 151, y: 228, "text-anchor": "middle", "font-size": 18, "font-weight": 800, fill: "#fff", "font-family": "Inter, system-ui, sans-serif" }, jugador);
  dorsal.textContent = pad(numero);
  el("circle", { cx: 151, cy: 192, r: 10, fill: "#3b2a1a" }, jugador);

  const balon = el("circle", { cx: 180, cy: 200, r: 7, fill: "#fff", stroke: "#111", "stroke-width": 1.5 }, svg);
  return { svg, arquero, jugador, pierna, balon, red };
}

const LADO_X = [112, 180, 248];

/** Un penal: carrera, disparo, estirada del arquero y desenlace. */
async function tirar(c, tiro) {
  const { arquero, jugador, pierna, balon, red } = c;
  arquero.style.transform = "";
  jugador.setAttribute("transform", "");
  balon.setAttribute("cx", 180);
  balon.setAttribute("cy", 200);
  balon.setAttribute("r", 7);
  await esperar(T(500));
  await tween(T(380), (k) => jugador.setAttribute("transform", `translate(${k * 14} ${-k * 8})`));
  pierna.style.transform = "rotate(-55deg)";
  await esperar(T(90));
  pierna.style.transform = "";

  const tx = tiro.resultado === "poste" ? (tiro.lado === 0 ? 82 : 278) : LADO_X[tiro.lado];
  const ty = tiro.alto ? 56 : 100;
  const dx = [-62, 0, 62][tiro.arquero];
  const dy = tiro.arquero === 1 ? -8 : tiro.alto && tiro.arquero === tiro.lado ? -6 : 10;
  const giro = [-72, 0, 72][tiro.arquero];
  arquero.style.transform = `translate(${dx}px, ${dy}px) rotate(${giro}deg)`;

  const vuelo = tiro.resultado === "atajada" ? 0.86 : 1;
  await tween(T(520), (k) => {
    const t = k * vuelo;
    balon.setAttribute("cx", 180 + (tx - 180) * t);
    balon.setAttribute("cy", 200 + (ty - 200) * t - Math.sin(t * Math.PI) * 18);
    balon.setAttribute("r", 7 - 2 * t);
  });
  if (tiro.resultado === "gol") {
    red.classList.remove("sacude");
    void red.getBoundingClientRect();
    red.classList.add("sacude");
  } else {
    // Rebote: del guante o del palo, hacia afuera.
    const x0 = Number(balon.getAttribute("cx"));
    const y0 = Number(balon.getAttribute("cy"));
    const x1 = tiro.resultado === "poste" ? (tiro.lado === 0 ? 30 : 330) : x0 + (tiro.lado === 2 ? 40 : -40);
    const y1 = tiro.resultado === "poste" ? 150 : 165;
    await tween(T(420), (k) => {
      balon.setAttribute("cx", x0 + (x1 - x0) * k);
      balon.setAttribute("cy", y0 + (y1 - y0) * k);
    });
  }
}

/**
 * Juega la tanda completa en `contenedor` y devuelve cuántos goles hubo.
 * `alTirar(i, tiro)` se llama tras cada penal (para el marcador y el grito).
 */
export async function jugarTanda(c, penales, alTirar) {
  let goles = 0;
  for (let i = 0; i < penales.length; i++) {
    await tirar(c, penales[i]);
    if (penales[i].resultado === "gol") goles++;
    alTirar?.(i, penales[i]);
    await esperar(T(900));
  }
  return goles;
}

export const GRITO = { gol: "¡GOOOL!", atajada: "¡Atajada del arquero!", poste: "¡Al palo!" };

export function marcador(nodo) {
  nodo.innerHTML = "<span>1</span><span>2</span><span>3</span>";
  return (i, tiro) => {
    const s = nodo.children[i];
    s.className = tiro.resultado === "gol" ? "gol" : "fallo";
    s.textContent = tiro.resultado === "gol" ? "✓" : "✕";
  };
}

export function confeti(cantidad = 120) {
  if (!lento) return;
  const capa = document.createElement("div");
  capa.className = "confeti";
  const colores = ["#facc15", "#22c55e", "#38bdf8", "#f43f5e", "#a78bfa", "#fff"];
  for (let i = 0; i < cantidad; i++) {
    const p = document.createElement("i");
    p.style.left = `${Math.random() * 100}%`;
    p.style.background = colores[i % colores.length];
    p.style.animationDuration = `${2.5 + Math.random() * 2.5}s`;
    p.style.animationDelay = `${Math.random() * 0.8}s`;
    capa.appendChild(p);
  }
  document.body.appendChild(capa);
  setTimeout(() => capa.remove(), 6000);
}

// ---------------------------------------------------------------- verificación

async function sha256(texto) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return new Uint8Array(b);
}
const hex = (bytes) => Array.from(bytes, (x) => x.toString(16).padStart(2, "0")).join("");

/**
 * Comprueba, en este navegador, que la semilla revelada es la que se
 * comprometió al cerrar, que la lista es la misma y que los ganadores son
 * los que dicta la semilla (mismo cálculo que el servidor).
 */
export async function verificar(e) {
  const lista = [...e.lista].sort((a, b) => a.numero - b.numero);
  const canonica = lista.map((p) => `${p.numero}|${p.nombre}`).join("\n");
  const compromiso = hex(await sha256(e.semilla)) === e.compromiso;
  const huella = hex(await sha256(canonica)) === e.huellaLista;
  const quedan = lista.map((p) => p.numero);
  const calculados = [];
  for (let k = 0; k < e.ganadores && quedan.length; k++) {
    const h = await sha256(`${e.semilla}:${k}`);
    let x = 0n;
    for (let i = 0; i < 8; i++) x = (x << 8n) | BigInt(h[i]);
    const i = Number(x % BigInt(quedan.length));
    calculados.push(quedan[i]);
    quedan.splice(i, 1);
  }
  const reales = e.resultado.map((g) => g.numero);
  const ganadores = calculados.length === reales.length && calculados.every((n, i) => n === reales[i]);
  return { compromiso, huella, ganadores, calculados };
}

export function textoVerificacion(v) {
  const s = (ok, txt) => `<li class="${ok ? "ok" : "mal"}">${ok ? "✔" : "✘"} ${txt}</li>`;
  return `<ul>${s(v.compromiso, "La semilla revelada coincide con la huella publicada al cerrar.")}${s(v.huella, "La lista de participantes es la misma que se cerró.")}${s(v.ganadores, `Los ganadores salen de la semilla: ${v.calculados.map(pad).join(", ")}.`)}</ul>`;
}

export const escapar = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/** Apellido para la espalda de la camiseta (segunda palabra; si no hay, la primera). */
export function apellido(nombre) {
  const p = String(nombre).trim().split(/\s+/);
  return (p[1] || p[0] || "").toUpperCase();
}

/** Camiseta vista de espaldas, con apellido y dorsal. Devuelve el SVG como texto. */
export function camiseta(numero, nombre, color = "#facc15", tinta = "#0b1220", ribete = "#2563eb") {
  const ap = escapar(apellido(nombre)).slice(0, 14);
  const t = ap.length > 9 ? 13 : 16;
  return `<svg class="camiseta" viewBox="0 0 200 200" role="img" aria-label="Camiseta ${pad(numero)} ${escapar(nombre)}">
  <path d="M62 18 L30 34 L6 78 L36 94 L48 74 L48 188 L152 188 L152 74 L164 94 L194 78 L170 34 L138 18 C130 30 70 30 62 18 Z" fill="${color}" stroke="rgba(0,0,0,.25)" stroke-width="2"/>
  <path d="M30 34 L6 78 L14 82 L38 38 Z M170 34 L194 78 L186 82 L162 38 Z" fill="${ribete}"/>
  <path d="M62 18 C70 30 130 30 138 18" fill="none" stroke="${ribete}" stroke-width="6"/>
  <text x="100" y="64" text-anchor="middle" font-family="Bebas Neue, Impact, sans-serif" font-size="${t}" letter-spacing="2" fill="${tinta}">${ap}</text>
  <text x="100" y="150" text-anchor="middle" font-family="Bebas Neue, Impact, sans-serif" font-size="86" fill="${tinta}">${pad(numero)}</text>
</svg>`;
}

/** Balón pequeño (SVG) para decorar. */
export const BALON = `<svg class="balon-calienta" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#fff" stroke="#111" stroke-width="1.2"/><path d="M12 7.2l4.2 3-1.6 4.9H9.4L7.8 10.2z" fill="#111"/><path d="M12 1v6.2M16.2 10.2l5.6-1.8M14.6 15.1l3.4 5M9.4 15.1l-3.4 5M7.8 10.2L2.2 8.4" stroke="#111" stroke-width="1.1"/></svg>`;
