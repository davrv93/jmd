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

// Los premios (mismo orden, colores y precios que el servidor). Si una banda
// se agota, se baja a la siguiente de su misma cadena.
const GRUPOS_REQ = "Elige tu grupo al canjear: lunes 16, 23 y 30 nov 7:30 pm (grupo 1) · jueves 3, 10 y 17 dic 7:30 pm (grupo 2) · domingos 6, 13 y 20 dic 10:00 am (grupo 3)";
export const PREMIOS = {
  req100: { color: "#ffd166", nombre: "Requerimientos gratis", corto: "Req 100", pct: 100, curso: "Ingeniería de Requerimientos", cadena: "req", precio: 40 },
  req80: { color: "#8fd3c7", nombre: "Requerimientos 80 %", corto: "Req 80", pct: 80, curso: "Ingeniería de Requerimientos", cadena: "req", precio: 40 },
  req70: { color: "#a9c9f5", nombre: "Requerimientos 70 %", corto: "Req 70", pct: 70, curso: "Ingeniería de Requerimientos", cadena: "req", precio: 40 },
  req60: { color: "#e8e3f8", nombre: "Requerimientos 60 %", corto: "Req 60", pct: 60, curso: "Ingeniería de Requerimientos", cadena: "req", precio: 40 },
  qa80: { color: "#ffb4a2", nombre: "Taller QA 80 %", corto: "QA 80", pct: 80, curso: "taller QA", cadena: "qa", precio: 100 },
  qa60: { color: "#f6e7a9", nombre: "Taller QA 60 %", corto: "QA 60", pct: 60, curso: "taller QA", cadena: "qa", precio: 100 },
};
export const ORDEN = ["req100", "req80", "req70", "req60", "qa80", "qa60"];
export const pct = (id) => PR(id).pct;
export const GRUPOS = { req: GRUPOS_REQ, qa: "Taller QA · Grupo 2: domingo 6 de diciembre, 2:00 a 6:00 p. m. (Lima)." };
export const ENLACE_QA = "https://jmd-learn.online/inscripcion/qa-ia-g2/";
export const ENLACES_REQ = [1, 2, 3].map((n) => `https://jmd-learn.online/inscripcion/requerimientos-${n}/`);

// Las 50 casillas, fijas e intercaladas (A = req100, B = req80, C = req70,
// D = req60, E = qa80, F = qa60). Igual que «patron» en el servidor.
const PATRON = "ABCDEFCDBCDBFCDBECDBFCDBCDBCEFDCBDCBFDCBEDCBFDCBDC";
const LETRA = { A: "req100", B: "req80", C: "req70", D: "req60", E: "qa80", F: "qa60" };
export function franjaDe(i) { return LETRA[PATRON[i]]; }
export const FRANJAS = Array.from({ length: 50 }, (_, i) => franjaDe(i));

// Gajos de la ruleta de premios (50 casillas).
// Premios de versiones anteriores de esta misma instancia (60/70/80 del taller QA): no deben romper la página.
const VIEJOS = { "60": "qa60", "70": "qa60", "80": "qa80", "100": "req100" };
export const PR = (id) => PREMIOS[id] || PREMIOS[VIEJOS[id]] || { color: "#ddd", nombre: String(id), corto: String(id), pct: 0, curso: "", cadena: "", precio: 0 };
export const gajosPremios = () => FRANJAS.map((f) => ({ texto: PR(f).corto, color: PR(f).color }));

// Con tope: si la banda ya se agotó, baja a la siguiente de su cadena.
export function conTope(banda, entregados, topes = { req100: 1, req80: 12, qa80: 4 }) {
  const cadena = PR(banda).cadena;
  for (let j = ORDEN.indexOf(banda); j < ORDEN.length; j++) {
    const b = ORDEN[j];
    if (PR(b).cadena === cadena && (!topes[b] || (entregados[b] || 0) < topes[b])) return b;
  }
  return banda;
}

export const precioCon = (id) => PR(id).precio * (100 - pct(id)) / 100;

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
    html += `<button type="button" class="${cl.join(" ")}" data-n="${n}" ${libre ? "" : "tabindex=-1"} aria-label="Número ${n}${p ? ` (${p} %)` : ""}">${dos(n)}${p ? `<small>${PR(p).corto}</small>` : ""}</button>`;
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
