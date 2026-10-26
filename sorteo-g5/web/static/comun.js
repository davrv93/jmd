// Común a la pantalla y al admin: API, verificación, sonido suave y utilidades.

export async function api(ruta, opciones = {}) {
  const r = await fetch(ruta, { ...opciones, headers: { "Content-Type": "application/json", ...(opciones.headers || {}) }, cache: "no-store" });
  const datos = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(datos.error || `Error ${r.status}`);
  return datos;
}

export const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
export const pad = (n) => String(n).padStart(2, "0");
export const escapar = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
export const corta = (h) => (h ? `${h.slice(0, 12)}…${h.slice(-6)}` : "");

// ------------------------------------------------------------ verificación
async function sha256(texto) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto)));
}
const hex = (b) => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");

/** Mismo cálculo que el servidor: SHA-256(semilla:k), 8 bytes, módulo de lo que queda. */
export async function elegir(semilla, numeros, n) {
  const quedan = [...numeros].sort((a, b) => a - b);
  const out = [];
  for (let k = 0; k < n && quedan.length; k++) {
    const h = await sha256(`${semilla}:${k}`);
    let x = 0n;
    for (let i = 0; i < 8; i++) x = (x << 8n) | BigInt(h[i]);
    const i = Number(x % BigInt(quedan.length));
    out.push(quedan[i]);
    quedan.splice(i, 1);
  }
  return out;
}

/** Comprueba en este navegador las huellas publicadas al cerrar y cada ronda revelada. */
export async function verificar(e) {
  const res = [];
  if (!e.huellaLista) return res;
  const lista = [...e.lista].sort((a, b) => a.numero - b.numero);
  const canon = lista.map((p) => `${p.numero}|${p.nombre}`).join("\n");
  res.push([hex(await sha256(canon)) === e.huellaLista, `La lista de ${lista.length} participantes es la misma que se cerró.`]);
  if (e.semilla1) {
    res.push([hex(await sha256(e.semilla1)) === e.compromiso1, "La semilla de la ronda 1 coincide con la huella publicada al cerrar."]);
    const f = await elegir(e.semilla1, lista.map((p) => p.numero), e.nFinalistas || 3);
    const ok = f.length === e.finalistas.length && f.every((n, i) => n === e.finalistas[i].numero);
    res.push([ok, `Los finalistas salen de esa semilla: ${f.map(pad).join(", ")}.`]);
  }
  if (e.semilla2) {
    res.push([hex(await sha256(e.semilla2)) === e.compromiso2, "La semilla de la ronda 2 coincide con la huella publicada al cerrar."]);
    const [g] = await elegir(e.semilla2, e.finalistas.map((p) => p.numero), 1);
    res.push([g === e.ganador.numero, `El ganador sale de esa semilla: ${pad(g)}.`]);
  }
  return res;
}

// ------------------------------------------------------------ sonido (apagado por defecto, bajito)
let ctx = null;
let activo = false;
try { activo = localStorage.getItem("sorteo-g5-sonido") === "1"; } catch {}
export const sonidoActivo = () => activo;
export function alternarSonido() {
  activo = !activo;
  try { localStorage.setItem("sorteo-g5-sonido", activo ? "1" : "0"); } catch {}
  if (activo) asegurar();
  return activo;
}
function asegurar() {
  if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { ctx = null; } }
  if (ctx && ctx.state === "suspended") ctx.resume();
  return ctx;
}
export function tono(freq, dur = 0.08, vol = 0.035, tipo = "triangle", retraso = 0) {
  if (!activo || !asegurar()) return;
  const t = ctx.currentTime + retraso;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = tipo;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}
export function fanfarria() {
  [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5].forEach((f, i) => tono(f, i === 5 ? 0.6 : 0.16, 0.04, "triangle", i * 0.13));
}
