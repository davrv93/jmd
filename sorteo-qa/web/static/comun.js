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

// Los tres premios (mismo orden y colores que el servidor).
export const PREMIOS = {
  100: { color: "#ffc857", nombre: "Oro", texto: "100 %" },
  90: { color: "#d9dde6", nombre: "Plata", texto: "90 %" },
  70: { color: "#d2905a", nombre: "Bronce", texto: "70 %" },
};

// La casilla i (0..49) de la ruleta: oro en 0, 17 y 34; plata en las 3k+1
// (menos 34 y 49); el resto, bronce. Igual que franjaDe en el servidor.
export function franjaDe(i) {
  if (i % 17 === 0) return "100";
  if (i % 3 === 1 && i !== 34 && i !== 49) return "90";
  return "70";
}
export const FRANJAS = Array.from({ length: 50 }, (_, i) => franjaDe(i));

// Gajos de la ruleta de premios (50 casillas).
export const gajosPremios = () => FRANJAS.map((f) => ({ texto: PREMIOS[f].texto, color: PREMIOS[f].color }));

// Con tope: si la banda ya se agotó, baja a la siguiente (100 → 90 → 70).
export function conTope(banda, entregados, topes = { 100: 3, 90: 15 }) {
  const orden = ["100", "90", "70"];
  for (let j = orden.indexOf(banda); j < orden.length; j++) {
    const b = orden[j];
    if (!topes[b] || (entregados[b] || 0) < topes[b]) return b;
  }
  return "70";
}

export const precioCon = (precio, premio) => precio * (100 - Number(premio)) / 100;

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
    html += `<button type="button" class="${cl.join(" ")}" data-n="${n}" ${libre ? "" : "tabindex=-1"} aria-label="Número ${n}${p ? ` (${p} %)` : ""}">${dos(n)}${p ? `<small>${p}%</small>` : ""}</button>`;
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
