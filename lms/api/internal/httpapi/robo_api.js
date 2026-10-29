// robo-api.js · cómo una página del aula habla con el backend de su Robo (chat, voz, imagen y dictado).
// El LMS lo deja en /trabajo/negocio/robo-api.js antes de cada encargo. Cópialo junto a tu index.html e impórtalo:
//
//   <script type="module">
//     import * as Robo from "./robo-api.js";
//     const a = await Robo.asistente();                 // nombre, saludo, personalidad, preguntas, marca
//     const r = await Robo.chat("¿a qué hora abren?");  // { texto, animo, fuente }
//     await Robo.hablar(r.texto);                       // voz del servidor; si falla, la del navegador
//     const img = await Robo.imagen("un robot cubista", { calidad: "maxima" });  // FLUX: { url, motor, segundos }
//     const dicho = await Robo.escuchar();              // micrófono → texto (Chrome/Edge)
//   </script>
//
// Funciona dentro del Visor del LIVE (/vista/<alumno>/…) y fuera de él. Nunca armes estas rutas a mano.

const VISTA = (location.pathname.match(/^\/vista\/[^/]+/) || [""])[0];
const ruta = (r) => VISTA + r;

export const ANIMOS = ["feliz", "pensando", "sorprendido", "triste", "emocionado", "neutral"];

async function pedir(r, cuerpo, ms = 30000, comoBlob = false) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(ruta(r), {
      method: cuerpo === undefined ? "GET" : "POST",
      headers: cuerpo === undefined ? {} : { "Content-Type": "application/json" },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
      signal: ctrl.signal,
      cache: "no-store",
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error((j.error && (j.error.message || j.error)) || "HTTP " + res.status);
    }
    return comoBlob ? res.blob() : res.json();
  } finally {
    clearTimeout(t);
  }
}

// ---- datos del Robo (negocio/asistente.json) ----
let datos = null;
export async function asistente() {
  if (datos) return datos;
  const intentos = [ruta("/negocio/asistente.json"), new URL("../negocio/asistente.json", location.href).href];
  for (const u of intentos) {
    try {
      const r = await fetch(u, { cache: "no-store" });
      if (r.ok) { datos = await r.json(); break; }
    } catch (e) { /* siguiente */ }
  }
  datos = Object.assign({ nombre: "Robo", saludo: "¡Hola! ¿En qué te ayudo?", personalidad: "", negocio: {},
    preguntas_frecuentes: [], reglas: [], marca: {} }, datos || {});
  return datos;
}

// Preguntas frecuentes como lista simple: [{ pregunta, respuesta, animo }].
export async function preguntas() {
  const a = await asistente();
  return (a.preguntas_frecuentes || []).map((f) => ({
    pregunta: (f.preguntas && f.preguntas[0]) || f.pregunta || "",
    respuesta: f.respuesta || "",
    animo: ANIMOS.includes(f.animo) ? f.animo : "neutral",
  })).filter((f) => f.pregunta && f.respuesta);
}

const normal = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9ñ ]/g, " ").split(/\s+/).filter((w) => w.length > 2);

// Respuesta sin backend: la pregunta frecuente con más palabras en común; si no hay, el saludo.
export async function respuestaLocal(mensaje) {
  const a = await asistente();
  const dichas = new Set(normal(mensaje));
  let mejor = null, puntos = 0;
  for (const f of a.preguntas_frecuentes || []) {
    const p = [].concat(f.preguntas || f.pregunta || []).flatMap(normal);
    const n = p.filter((w) => dichas.has(w)).length;
    if (n > puntos) { puntos = n; mejor = f; }
  }
  return mejor
    ? { texto: mejor.respuesta, animo: ANIMOS.includes(mejor.animo) ? mejor.animo : "neutral", fuente: "respaldo" }
    : { texto: a.saludo, animo: "neutral", fuente: "respaldo" };
}

// ---- chat ----
const historial = [];
export async function chat(mensaje) {
  historial.push({ rol: "usuario", texto: String(mensaje) });
  let r;
  try {
    const j = await pedir("/api/chat", { mensaje: String(mensaje), historial: historial.slice(-8, -1) }, 45000);
    if (!j.texto) throw new Error("respuesta vacía");
    r = { texto: j.texto, animo: ANIMOS.includes(j.animo) ? j.animo : "neutral", fuente: j.fuente || "backend" };
  } catch (e) {
    r = await respuestaLocal(mensaje);
    r.error = e.message;
  }
  historial.push({ rol: "asistente", texto: r.texto });
  return r;
}

// ---- voz: texto → audio del servidor (Piper); si falla, la voz del navegador ----
let sonando = null;
export async function hablar(texto) {
  texto = String(texto || "").slice(0, 700);
  if (!texto) return { motor: "nada" };
  callar();
  try {
    const blob = await pedir("/api/voz", { texto }, 30000, true);
    const audio = new Audio(URL.createObjectURL(blob));
    sonando = audio;
    await audio.play();
    await new Promise((ok) => { audio.onended = ok; audio.onerror = ok; });
    return { motor: "servidor" };
  } catch (e) {
    if (!("speechSynthesis" in window)) return { motor: "nada", error: e.message };
    const u = new SpeechSynthesisUtterance(texto);
    const voz = speechSynthesis.getVoices().find((v) => /^es/i.test(v.lang));
    if (voz) u.voice = voz;
    u.lang = voz ? voz.lang : "es-PE";
    await new Promise((ok) => { u.onend = ok; u.onerror = ok; speechSynthesis.speak(u); });
    return { motor: "navegador" };
  }
}
export function callar() {
  if (sonando) { sonando.pause(); sonando = null; }
  if ("speechSynthesis" in window) speechSynthesis.cancel();
}

// ---- imagen: prompt → { url, motor, segundos }. calidad: "rapida" | "buena" | "maxima" (FLUX) ----
export async function imagen(prompt, { calidad = "buena", estilo = "profesional" } = {}) {
  const j = await pedir("/api/imagen", { prompt: String(prompt).slice(0, 500), estilo, tipo: "auto", calidad }, 180000);
  const u = String(j.url || "");
  if (!u) throw new Error("el backend no devolvió imagen");
  return { url: /^(data:|https?:)/.test(u) ? u : ruta(u.startsWith("/") ? u : "/" + u), motor: j.motor || "", segundos: j.segundos };
}

// ---- micrófono → texto (Web Speech: Chrome y Edge) ----
export const puedeEscuchar = () => !!(window.SpeechRecognition || window.webkitSpeechRecognition);
export function escuchar({ idioma = "es-PE" } = {}) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return Promise.reject(new Error("Tu navegador no dicta: usa Chrome o Edge, o escribe."));
  return new Promise((ok, mal) => {
    const rec = new SR();
    rec.lang = idioma; rec.interimResults = false; rec.maxAlternatives = 1;
    rec.onresult = (e) => ok(e.results[0][0].transcript);
    rec.onerror = (e) => mal(new Error(e.error === "not-allowed" ? "Permite el micrófono para dictar." : "No te escuché: " + e.error));
    rec.onend = () => ok("");
    rec.start();
  });
}

// ---- estado del backend ----
export async function salud() {
  try { return await pedir("/api/salud", undefined, 8000); } catch (e) { return { error: e.message }; }
}
