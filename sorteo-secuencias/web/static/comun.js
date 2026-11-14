// Utilidades compartidas: API, formato y la comprobación del sorteo, que
// rehace en el navegador exactamente lo que calculó el servidor.
export const BASE = new URL(".", location.href).pathname.replace(/(admin|pantalla|referidos)\/?$/, "");

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

export function tokenLeer() { try { return localStorage.getItem("sorteo-sec-t") || ""; } catch { return ""; } }
export function tokenGuardar(t) { try { localStorage.setItem("sorteo-sec-t", t); } catch { /* sin almacenamiento */ } }

// Colores y símbolo de cada secuencia (iguales en todas las vistas).
export const SEC = {
  fibonacci: { color: "#ffc857", simbolo: "φ" },
  euler: { color: "#4dd8c8", simbolo: "e" },
  pares: { color: "#7b8cff", simbolo: "2n" },
  impares: { color: "#ff7eb3", simbolo: "2n+1" },
  primos: { color: "#b98cff", simbolo: "p" },
  todos: { color: "#ffffff", simbolo: "∀" },
};

// Nombre corto del curso para la ruleta de premios.
export function corto(curso) {
  if (curso.startsWith("DeepSeek Harness +")) return "DeepSeek + Req.";
  if (curso.startsWith("Ingeniería")) return "Ing. Requerimientos";
  if (curso.startsWith("Diseño")) return "Hard to Explain";
  if (curso.startsWith("Seguridad")) return "Seguridad con IA";
  if (curso.startsWith("Programación")) return "Prog. agéntica";
  if (curso.startsWith("Bots")) return "Bots avanzados";
  return curso;
}

export const conPremio = (p) => p.precio * (100 - p.descuento) / 100;

// ---------- comprobación ----------
async function sha256Bytes(texto) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto)));
}
export async function sha256Hex(texto) {
  return [...await sha256Bytes(texto)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function azar(semilla, etiqueta, ronda, intento, n) {
  const h = await sha256Bytes(`${semilla}:${etiqueta}:${ronda}:${intento}`);
  let x = 0n;
  for (let i = 0; i < 8; i++) x = (x << 8n) | BigInt(h[i]);
  return Number(x % BigInt(n));
}

// Las secuencias se recalculan aquí, sin fiarse de las del servidor.
export function numerosDe(id, total = 50) {
  const set = new Set();
  if (id === "fibonacci") for (let a = 1, b = 2; a <= total; [a, b] = [b, a + b]) set.add(a);
  if (id === "euler") {
    const e = "2718281828459045235360287471352662497757";
    for (let i = 0; i + 1 < e.length; i++) { const n = +e.slice(i, i + 2); if (n >= 1 && n <= total) set.add(n); }
  }
  const primo = (n) => { if (n < 2) return false; for (let d = 2; d * d <= n; d++) if (n % d === 0) return false; return true; };
  for (let n = 1; n <= total; n++) {
    if ((id === "pares" && n % 2 === 0) || (id === "impares" && n % 2 === 1) || (id === "primos" && primo(n))) set.add(n);
  }
  return [...set].sort((a, b) => a - b);
}

// Rehace el sorteo con la semilla revelada: debe salir idéntico a lo publicado.
export async function comprobar(estado) {
  const fallos = [];
  if (await sha256Hex(estado.semilla) !== estado.compromiso) fallos.push("La semilla no corresponde a la huella publicada al cerrar.");
  const canon = [...estado.lista].sort((a, b) => a.numero - b.numero).map((t) => `${t.numero}|${t.persona}|${t.nombre}`).join("\n");
  if (await sha256Hex(canon) !== estado.huellaLista) fallos.push("La lista de tickets no corresponde a la huella publicada.");
  const ids = estado.secuencias.map((s) => s.id);
  const nums = Object.fromEntries(ids.map((id) => [id, numerosDe(id, estado.total)]));
  const dueno = new Map(estado.lista.map((t) => [t.numero, t.nombre]));
  const persona = new Map(estado.lista.map((t) => [t.numero, t.persona]));
  const personas = new Set(estado.lista.map((t) => t.persona));
  const gano = new Set(); // por persona: cada una gana una sola vez
  const vale = (n) => persona.has(n) && !gano.has(persona.get(n));
  let quedan = estado.premios.map((p) => p.id);
  const pasos = [];
  for (let r = 0; r < estado.ganadores && quedan.length && gano.size < personas.size; r++) {
    let cands = [];
    for (let k = 0; ; k++) {
      if (k === 40) {
        cands = [...dueno.keys()].filter(vale).sort((a, b) => a - b);
        pasos.push({ ronda: r, tipo: "secuencia", secuencia: "todos", candidatos: cands, vacio: !cands.length });
        break;
      }
      const sec = ids[await azar(estado.semilla, "secuencia", r, k, ids.length)];
      cands = nums[sec].filter(vale);
      pasos.push({ ronda: r, tipo: "secuencia", secuencia: sec, candidatos: cands, vacio: !cands.length });
      if (cands.length) break;
    }
    if (!cands.length) break;
    const t = cands[await azar(estado.semilla, "ticket", r, 0, cands.length)];
    gano.add(persona.get(t));
    pasos.push({ ronda: r, tipo: "ticket", ticket: t, nombre: dueno.get(t) });
    const i = await azar(estado.semilla, "premio", r, 0, quedan.length);
    pasos.push({ ronda: r, tipo: "premio", ticket: t, premio: quedan[i] });
    quedan = quedan.filter((_, j) => j !== i);
  }
  const clave = (p) => [p.ronda, p.tipo, p.secuencia || "", (p.candidatos || []).join(","), p.ticket || "", p.premio || ""].join("|");
  if (pasos.length !== estado.pasos.length || pasos.some((p, i) => clave(p) !== clave(estado.pasos[i]))) {
    fallos.push("Los giros recalculados no coinciden con los publicados.");
  }
  return { ok: fallos.length === 0, fallos, pasos: pasos.length };
}
