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

export function tokenLeer() { try { return localStorage.getItem("sorteo-req-t") || ""; } catch { return ""; } }
export function tokenGuardar(t) { try { localStorage.setItem("sorteo-req-t", t); } catch { /* sin almacenamiento */ } }

// Los premios (mismo orden y colores que el servidor). Todas las bandas son
// descuentos para cualquier curso; si una banda con tope se agota, se baja a la
// siguiente (100 → 80 → 70).
export const CURSO = "tu próximo curso en JMD Learning, el que elijas";
export const CATALOGO = "Programación agéntica, DeepSeek Harness, Difícil de explicar (diseño), Bot de WhatsApp avanzado, QA con IA, Seguridad en codificación, ClickHouse, Claude Code PRO, Ingeniería de Requerimientos";
export const PREMIOS = {
  d100: { color: "#ffd166", nombre: "Curso gratis (100 %)", corto: "100 %", pct: 100, curso: CURSO, cadena: "jmd" },
  d80: { color: "#8fd3c7", nombre: "80 % de descuento", corto: "80 %", pct: 80, curso: CURSO, cadena: "jmd" },
  d70: { color: "#a9c9f5", nombre: "70 % de descuento", corto: "70 %", pct: 70, curso: CURSO, cadena: "jmd" },
  d60: { color: "#e8e3f8", nombre: "60 % de descuento", corto: "60 %", pct: 60, curso: CURSO, cadena: "jmd" },
  d50: { color: "#f6e7a9", nombre: "50 % de descuento", corto: "50 %", pct: 50, curso: CURSO, cadena: "jmd" },
};
export const ORDEN = ["d100", "d80", "d70", "d60", "d50"];
export const pct = (id) => PR(id).pct;

// Las 50 casillas, fijas e intercaladas (A = 100 %, B = 80 %, C = 70 %,
// D = 60 %, E = 50 %). Igual que «patron» en el servidor.
const PATRON = "EECDEDEEBCDDCEDEEDCEDECDEABDCEDECDEEDECDEEBCDDEECD";
const LETRA = { A: "d100", B: "d80", C: "d70", D: "d60", E: "d50" };
export function franjaDe(i) { return LETRA[PATRON[i]]; }
export const FRANJAS = Array.from({ length: 50 }, (_, i) => franjaDe(i));

// Gajos de la ruleta de premios (50 casillas). Un id desconocido no rompe la página.
export const PR = (id) => PREMIOS[id] || { color: "#ddd", nombre: String(id), corto: String(id), pct: 0, curso: "", cadena: "" };
export const gajosPremios = () => FRANJAS.map((f) => ({ texto: PR(f).corto, color: PR(f).color }));

// Con tope: si la banda ya se agotó, baja a la siguiente de su cadena.
export function conTope(banda, entregados, topes = { d100: 1, d80: 3 }) {
  const cadena = PR(banda).cadena;
  for (let j = ORDEN.indexOf(banda); j < ORDEN.length; j++) {
    const b = ORDEN[j];
    if (PR(b).cadena === cadena && (!topes[b] || (entregados[b] || 0) < topes[b])) return b;
  }
  return banda;
}


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
    html += `<button type="button" class="${cl.join(" ")}" data-n="${n}" ${libre ? "" : "tabindex=-1"} aria-label="Número ${n}${p ? ` (${pct(p)} %)` : ""}">${dos(n)}${p ? `<small>${PR(p).corto}</small>` : ""}</button>`;
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
