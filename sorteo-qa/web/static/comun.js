// Utilidades compartidas: API, formato, la ruleta de premios y la comprobación
// del sorteo, que rehace en el navegador exactamente lo que calculó el servidor.
export const BASE = new URL(".", location.href).pathname.replace(/(admin|pantalla)\/?$/, "");

export async function api(ruta, opciones = {}) {
  const r = await fetch(BASE + ruta, {
    ...opciones,
    headers: { "Content-Type": "application/json", ...(opciones.headers || {}) },
  });
  const datos = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(datos.error || `Error ${r.status}`);
  return datos;
}

export const $ = (s, raiz = document) => raiz.querySelector(s);
export const $$ = (s, raiz = document) => [...raiz.querySelectorAll(s)];
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const dos = (n) => String(n).padStart(2, "0");
export const soles = (n) => "S/ " + (Math.round(n * 100) / 100).toFixed(n % 1 ? 2 : 0);
export const hora = (iso) => new Date(iso).toLocaleTimeString("es-PE", { timeZone: "America/Lima", hour: "2-digit", minute: "2-digit" });

export function tokenLeer() { try { return localStorage.getItem("sorteo-qa-t") || ""; } catch { return ""; } }
export function tokenGuardar(t) { try { localStorage.setItem("sorteo-qa-t", t); } catch { /* sin almacenamiento */ } }

// Los premios (mismo orden, colores y precios que el servidor). El orden es el
// orden en que se baja de banda cuando una se agota.
export const PREMIOS = {
  req100: { color: "#ffd166", nombre: "Requerimientos gratis", texto: "100 %", curso: "Ingeniería de Requerimientos", precio: 40, corto: "Req. 100 %" },
  80: { color: "#8fd3c7", nombre: "Premio mayor", texto: "80 %", curso: "taller QA", precio: 100, corto: "80 %" },
  70: { color: "#a9c9f5", nombre: "70 %", texto: "70 %", curso: "taller QA", precio: 100, corto: "70 %" },
  60: { color: "#e8e3f8", nombre: "60 %", texto: "60 %", curso: "taller QA", precio: 100, corto: "60 %" },
};
export const ORDEN = ["req100", "80", "70", "60"];
export const pct = (id) => (id === "req100" ? 100 : Number(id));

// La casilla i (0..49): la 0 es Requerimientos; las 8k+4, el 80 %; de las 43
// restantes, la k-ésima es 70 % cuando floor((k+1)·18/43) > floor(k·18/43).
// Igual que franjaDe en el servidor.
export function franjaDe(i) {
  if (i === 0) return "req100";
  if (i % 8 === 4) return "80";
  const k = i - 1 - Math.floor((i + 3) / 8);
  return Math.floor(((k + 1) * 18) / 43) > Math.floor((k * 18) / 43) ? "70" : "60";
}
export const FRANJAS = Array.from({ length: 50 }, (_, i) => franjaDe(i));

// Gajos de la ruleta de premios (50 casillas).
export const gajosPremios = () => FRANJAS.map((f) => ({ texto: PREMIOS[f].corto, color: PREMIOS[f].color }));

// Con tope: si la banda ya se agotó, baja a la siguiente de la lista.
export function conTope(banda, entregados, topes = { req100: 1, 80: 6 }) {
  for (let j = ORDEN.indexOf(banda); j < ORDEN.length; j++) {
    const b = ORDEN[j];
    if (!topes[b] || (entregados[b] || 0) < topes[b]) return b;
  }
  return "60";
}

export const precioCon = (id) => PREMIOS[id].precio * (100 - pct(id)) / 100;

// ---------- comprobación ----------
async function sha256Bytes(texto) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto)));
}
export async function sha256Hex(texto) {
  return [...await sha256Bytes(texto)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
export async function azar(semilla, etiqueta, ronda, intento, n) {
  const h = await sha256Bytes(`${semilla}:${etiqueta}:${ronda}:${intento}`);
  let x = 0n;
  for (let i = 0; i < 8; i++) x = (x << 8n) | BigInt(h[i]);
  return Number(x % BigInt(n));
}

// Rehace el sorteo con la semilla revelada, en el orden en que la gente
// eligió: debe salir idéntico a lo publicado.
export async function comprobar(estado) {
  const fallos = [];
  if (await sha256Hex(estado.semilla) !== estado.compromiso) fallos.push("La semilla no corresponde a la huella publicada desde el inicio.");
  const topes = Object.fromEntries(estado.premios.filter((p) => p.tope).map((p) => [p.id, p.tope]));
  const entregados = {};
  let malos = 0;
  for (const g of estado.resultado) {
    const casilla = await azar(estado.semilla, "premio", g.numero, 0, 50);
    const banda = franjaDe(casilla);
    const premio = conTope(banda, entregados, topes);
    entregados[premio] = (entregados[premio] || 0) + 1;
    if (casilla !== g.casilla || banda !== g.banda || premio !== g.premio) malos++;
  }
  if (malos) fallos.push(`${malos} premio(s) no coinciden con lo que da la semilla.`);
  return { ok: fallos.length === 0, fallos, pasos: estado.resultado.length };
}

// Cuadrícula de los 50 números. o: ocupados (número → premio), mio, elegido, alElegir(n).
export function tablero(el, o) {
  const premioDe = o.ocupados || {};
  let html = "";
  for (let n = 1; n <= 50; n++) {
    const p = premioDe[n];
    const cl = ["celda"];
    if (p) cl.push("ocupado", "p" + p);
    if (o.mio === n) cl.push("mio");
    if (o.elegido === n) cl.push("elegido");
    const libre = o.alElegir && !p;
    html += `<button type="button" class="${cl.join(" ")}" data-n="${n}" ${libre ? "" : "tabindex=-1"} aria-label="Número ${n}${p ? ` (${p} %)` : ""}">${dos(n)}${p ? `<small>${PREMIOS[p].corto}</small>` : ""}</button>`;
  }
  el.innerHTML = html;
  if (o.alElegir) {
    el.onclick = (e) => {
      const b = e.target.closest(".celda");
      if (b && !b.classList.contains("ocupado")) o.alElegir(+b.dataset.n);
    };
  }
}

// Mapa número → premio a partir del resultado público.
export const mapaPremios = (estado) => Object.fromEntries(estado.resultado.map((g) => [g.numero, g.premio]));
