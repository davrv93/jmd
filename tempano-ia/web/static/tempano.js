// Témpano IA · la aplicación: inicio, inscripción, rondas, rescates con
// pregunta, puntaje y ranking. La física vive en fisica.js y el dibujo en
// dibujo.js; las preguntas y su corrección las tiene SOLO el servidor.
import { api, $, esc, BASE } from "./comun.js";
import * as F from "./fisica.js";
import { crearEscena } from "./dibujo.js";
import * as S from "./sonido.js";

// La sala de clase (/clase/, la del modo LIVE) guarda su propio token: es otro juego, con otro ranking.
const CLASE = /\/clase\/$/.test(BASE);
const LLAVE = "tempano_t" + (CLASE ? "_clase" : "");
const PRUEBA = new URLSearchParams(location.search).has("prueba");
const NIVELES = [0.6, 0.7, 0.8];  // la IA se pone más brava en cada ronda
const PASO = 1 / 120;
const RONDAS = 3, RESCATES = 2, SEG_PREGUNTA = 12;

let token = null, yo = null, estado = {};
try { token = localStorage.getItem(LLAVE); } catch (e) { token = null; }
const ver = (s, si) => { $(s).hidden = !si; };
const cache = new Map();
const poner = (s, html) => { if (cache.get(s) !== html) { cache.set(s, html); $(s).innerHTML = html; } };
const tactil = () => document.body.classList.add("tactil");
if (matchMedia("(pointer: coarse)").matches) tactil();
addEventListener("touchstart", tactil, { once: true, passive: true });

// ---------------------------------------------------------------------------
// Copos de nieve del fondo y la demostración del inicio.
(function copos() {
  const cv = $("#copos");
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const cx = cv.getContext("2d");
  let W, H, cs;
  const medir = () => {
    W = cv.width = innerWidth * devicePixelRatio; H = cv.height = innerHeight * devicePixelRatio;
    cs = Array.from({ length: 46 }, () => ({ x: Math.random() * W, y: Math.random() * H, r: (1 + Math.random() * 2.4) * devicePixelRatio, v: 0.3 + Math.random() * 0.8, f: Math.random() * 6 }));
  };
  medir(); addEventListener("resize", medir);
  (function cuadro(t) {
    if (!document.body.classList.contains("jugando")) {
      cx.clearRect(0, 0, W, H);
      cx.fillStyle = "rgba(120, 180, 225, .45)";
      for (const c of cs) {
        c.y += c.v * devicePixelRatio; c.x += Math.sin(t / 1400 + c.f) * 0.4;
        if (c.y > H + 5) { c.y = -5; c.x = Math.random() * W; }
        cx.beginPath(); cx.arc(c.x, c.y, c.r, 0, 6.28); cx.fill();
      }
    }
    requestAnimationFrame(cuadro);
  })(0);
})();

const demo = crearEscena($("#demo"), { hud: 0 });
let demoM = nuevaDemo(), demoFin = 0;
function nuevaDemo() { const m = F.nuevaRonda(Math.random, 0.7); m.osos[0].cpu = true; return m; }
addEventListener("resize", () => { demo.medir(); escena.medir(); });

// ---------------------------------------------------------------------------
// Estado público y de la persona.
async function cargarEstado() {
  try { estado = await api("api/estado"); pintarEstado(); } catch (e) { /* se reintenta luego */ }
}

function pintarEstado() {
  const e = estado;
  $("#pdTxt").textContent = e.partidas_dia || 5;
  const rk = e.ranking || [];
  $("#rankTxt").textContent = rk.length
    ? `Top ${rk.length} de ${e.en_ranking}. Vale la mejor partida de cada persona.`
    : "Nadie ha jugado todavía. ¿Serás la primera persona?";
  const miIni = yo ? iniciales(yo.nombre) : "";
  $("#ranking").innerHTML = rk.map((f) => `<li class="${yo && f.puesto === yo.puesto && f.nombre === miIni ? "yo" : ""}"><span class="p">${f.puesto}</span>` +
    `<span class="n">${esc(f.nombre)}<small>${f.rondas} ${f.rondas === 1 ? "ronda" : "rondas"}</small></span><span class="t">${f.puntos.toLocaleString("es-PE")}</span></li>`).join("");
  pintarYo();
}

function iniciales(n) {
  const part = new Set(["de", "del", "la", "las", "los", "y"]);
  return n.trim().split(/\s+/).filter((p) => !part.has(p.toLowerCase())).map((p) => p[0].toUpperCase() + ".").join(" ");
}

function pintarYo() {
  if (!yo) { ver("#inscripcion", true); ver("#listo", false); ver("#mipuesto", false); return; }
  ver("#inscripcion", false); ver("#listo", true);
  $("#nom").textContent = yo.nombre;
  $("#quedan").textContent = yo.cerrado ? "Juego cerrado" : CLASE ? "Modo clase · ranking del grupo" : `${yo.partidas_quedan} de ${estado.partidas_dia || 5} partidas hoy`;
  ver("#mejor", yo.mejor > 0 || yo.puesto > 0);
  $("#mejor").innerHTML = `Tu mejor partida: <b>${(yo.mejor || 0).toLocaleString("es-PE")}</b> puntos${yo.puesto ? ` · puesto <b>${yo.puesto}</b>` : ""}`;
  $("#jugar").disabled = yo.cerrado || yo.partidas_quedan <= 0;
  $("#otra").disabled = $("#jugar").disabled;
  $("#jugar").textContent = yo.cerrado ? "El juego está cerrado" : yo.partidas_quedan <= 0 ? "Ya jugaste tus partidas de hoy" : "▶ Jugar";
  $("#otra").textContent = yo.partidas_quedan <= 0 ? "Ya jugaste tus partidas de hoy" : `▶ Jugar otra vez (te quedan ${yo.partidas_quedan})`;
  ver("#mipuesto", yo.puesto > 0);
  $("#mipuesto").textContent = yo.puesto ? `Vas en el puesto ${yo.puesto} de ${estado.en_ranking || yo.puesto}.` : "";
}

async function cargarYo() {
  if (!token) return;
  try { yo = await api("api/yo?t=" + encodeURIComponent(token)); }
  catch (e) { yo = null; token = null; try { localStorage.removeItem(LLAVE); } catch (x) { /* nada */ } }
}

// Desde la escena del modo LIVE llegan el nombre (?n=) y la cuenta del LMS (?u=): se inscribe sola y
// queda lista con «Jugar»; si algo falla, cae al formulario de siempre con el nombre ya escrito.
const QS = new URLSearchParams(location.search);
const LIVE = { n: (QS.get("n") || "").slice(0, 60), u: (QS.get("u") || "").slice(0, 64) };
if (QS.has("lms")) document.body.classList.add("embebido");
if (LIVE.n && !$("#nombre").value) $("#nombre").value = LIVE.n;
async function entrarDesdeLive() {
  if (!LIVE.n || !LIVE.u) return;
  try {
    yo = await api("api/inscribir", { method: "POST", body: JSON.stringify({ nombre: LIVE.n, t: "", cuenta: LIVE.u }) });
    token = yo.t;
    try { localStorage.setItem(LLAVE, token); } catch (e) { /* sin almacenamiento: solo esta pestaña */ }
    pintarEstado();
  } catch (e) { $("#err1").textContent = e.message; }
}

$("#form").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  S.despertar();
  const b = $("#quiero"); b.disabled = true; $("#err1").textContent = "";
  try {
    yo = await api("api/inscribir", { method: "POST", body: JSON.stringify({ nombre: $("#nombre").value, t: token }) });
    token = yo.t;
    try { localStorage.setItem(LLAVE, token); } catch (e) { /* sin almacenamiento: solo esta pestaña */ }
    pintarEstado();
    await jugar();
  } catch (e) { $("#err1").textContent = e.message; }
  b.disabled = false;
});
$("#jugar").addEventListener("click", () => jugar());
$("#otra").addEventListener("click", () => jugar());

// ---------------------------------------------------------------------------
// La partida.
const escena = crearEscena($("#escena"));
let J = null;           // partida en curso
const teclas = new Set();
const palanca = { activa: false, id: null, ox: 0, oy: 0, x: 0, y: 0 };
let quiereDash = false;

async function jugar() {
  S.despertar();
  $("#err2").textContent = "";
  $("#jugar").disabled = true; $("#otra").disabled = true;
  try {
    const p = await api("api/partida", { method: "POST", body: JSON.stringify({ t: token }) });
    J = { partida: p.partida, ronda: 0, ganadas: 0, segundos: 0, aciertos: 0, m: null, corriendo: false, pausa: false,
      esperaRescate: false, rescates: 0, vivoRonda: 0, motivo: "", acum: 0, resultados: [] };
    ver("#resultado", false);
    document.body.classList.add("jugando");
    ver("#juego", true);
    escena.medir();
    S.ambiente(true);
    empezarRonda(1);
  } catch (e) {
    $("#err2").textContent = e.message;
    ver("#listo", true);
    await cargarYo(); pintarYo();
  }
}

function cartel({ k = "", t = "", p = "", boton = "", solo = false }) {
  $("#cK").textContent = k; $("#cT").textContent = t; $("#cP").innerHTML = p;
  $("#cBtn").textContent = boton; ver("#cBtn", !!boton);
  $("#cartel").classList.toggle("solo-t", solo);
  ver("#cartel", true);
  if (boton) setTimeout(() => $("#cBtn").focus(), 50);
}
let alBoton = null;
$("#cBtn").addEventListener("click", () => { const f = alBoton; alBoton = null; ver("#cartel", false); if (f) f(); });

function empezarRonda(n) {
  J.ronda = n; J.rescates = 0; J.vivoRonda = 0; J.esperaRescate = false; J.motivo = ""; J.acum = 0;
  J.m = F.nuevaRonda(Math.random, NIVELES[n - 1]);
  J.corriendo = false; J.pausa = false;
  pintarHud();
  // Cuenta de salida en grito de cómic: FIGHT! · GO! · LET'S GO!
  const gritos = ["FIGHT!", "GO!", "LET'S GO!"];
  let c = 0;
  $("#cartel").classList.add("comic");
  const tic = () => {
    if (!J) return;
    const ultimo = c === gritos.length - 1;
    cartel({ k: `RONDA ${n} DE ${RONDAS}`, t: gritos[c], p: n === 1 && c === 0 ? "¡Empuja a los demás fuera del hielo!" : "", solo: true });
    const g = $("#cT"); g.style.setProperty("--giro", (c % 2 ? 4 : -5) + "deg");
    g.style.animation = "none"; void g.offsetWidth; g.style.animation = "";  // reinicia el golpe en cada grito
    S.cuenta(ultimo);
    if (!ultimo) { c++; setTimeout(tic, 700); return; }
    J.corriendo = true;
    setTimeout(() => {
      $("#cartel").classList.remove("comic");
      if (J && J.corriendo && !$("#cBtn").offsetParent) ver("#cartel", false);
    }, 600);
  };
  tic();
}

function control() {
  let x = 0, y = 0;
  if (palanca.activa) { x = palanca.x; y = palanca.y; }
  else {
    if (teclas.has("ArrowLeft") || teclas.has("KeyA")) x -= 1;
    if (teclas.has("ArrowRight") || teclas.has("KeyD")) x += 1;
    if (teclas.has("ArrowUp") || teclas.has("KeyW")) y -= 1;
    if (teclas.has("ArrowDown") || teclas.has("KeyS")) y += 1;
  }
  const d = quiereDash; quiereDash = false;
  return { x, y, dash: d };
}

function eventos(m) {
  for (const e of m.eventos) {
    if (e.tipo === "golpe") { if (e.fuerza > 60) { S.golpe(e.fuerza); escena.efecto("golpe", e.x, e.y, e.fuerza); } }
    else if (e.tipo === "embestida") { S.embestida(); const o = m.osos[e.id]; escena.efecto("embestida", o.x, o.y); }
    else if (e.tipo === "grieta") { S.grieta(); escena.efecto("grieta", e.x, e.y); }
    else if (e.tipo === "aviso") S.aviso();
    else if (e.tipo === "caida") {
      S.chapuzon(); escena.efecto("chapuzon", e.x, e.y);
      if (e.id === 0) { J.esperaRescate = true; try { navigator.vibrate && navigator.vibrate(120); } catch (x) { /* nada */ } }
    } else if (e.tipo === "hundido" && e.id === 0) rescate();
  }
  m.eventos.length = 0;
}

function pintarHud() {
  if (!J || !J.m) return;
  const m = J.m;
  $("#hRonda").textContent = `${J.ronda}/${RONDAS}`;
  const quedan = Math.max(0, Math.ceil(F.DURACION - m.t));
  $("#hReloj").textContent = quedan;
  $("#hReloj").classList.toggle("alerta", quedan <= 10);
  let b = "";
  for (let k = 0; k < RESCATES; k++) b += `<i class="${k < J.rescates ? "gastada" : ""}"></i>`;
  poner("#hResc", b);
  poner("#hOsos", m.osos.map((o) => `<i class="${o.fuera || (!F.enPie(o) && o.cpu) ? "fuera" : ""}" style="background:${o.color.bufanda}" title="${esc(o.nombre)}"></i>`).join(""));
  const o = m.osos[0];
  const listo = 1 - o.cd / F.ENFRIA;
  $("#embestir").style.setProperty("--listo", listo.toFixed(3));
  $("#embestir").classList.toggle("espera", o.cd > 0);
}

let tPrev = 0;
function cuadro(ms) {
  const t = ms / 1000;
  const dt = Math.min(0.1, tPrev ? t - tPrev : 0); tPrev = t;
  if (J && J.m) {
    if (J.corriendo && !J.pausa) {
      J.acum += dt;
      while (J.acum >= PASO) {
        J.acum -= PASO;
        F.paso(J.m, PASO, { 0: control() });
        if (F.enPie(J.m.osos[0])) J.vivoRonda += PASO;
        eventos(J.m);
        const r = F.resultado(J.m, J.esperaRescate);
        if (r) { finRonda(r); break; }
        if (J.pausa) break;
      }
      pintarHud();
    }
    escena.dibujar(J.m, t);
  } else if (!$("#inicio").hidden && !document.hidden) {
    // Demostración: los cuatro ositos juegan solos.
    F.paso(demoM, Math.min(dt, 1 / 30), {});
    demoM.eventos.length = 0;
    if (F.resultado(demoM) || demoM.osos.filter(F.enPie).length <= 1) {
      demoFin += dt;
      if (demoFin > 1.6) { demoM = nuevaDemo(); demoFin = 0; }
    }
    demo.dibujar(demoM, t);
  }
  requestAnimationFrame(cuadro);
}
requestAnimationFrame(cuadro);

function finRonda(r) {
  J.corriendo = false;
  J.segundos += Math.min(F.DURACION, J.vivoRonda);
  if (r === "gano") J.ganadas++;
  J.resultados.push(r);
  pintarHud();
  const seg = Math.floor(Math.min(F.DURACION, J.vivoRonda));
  const ultima = J.ronda >= RONDAS;
  const datos = { gano: ["¡Ganaste la ronda!", "Fuiste el último osito en el hielo. +1000"],
    perdio: ["Al agua", J.motivo || "Esta vez te sacaron del témpano."],
    tiempo: ["¡Tiempo!", "Nadie quedó solo en el hielo: la ronda no se gana, pero tus segundos cuentan."] }[r];
  if (r === "gano") S.victoria(); else S.derrota();
  alBoton = ultima ? terminarPartida : () => empezarRonda(J.ronda + 1);
  setTimeout(() => cartel({ k: `RONDA ${J.ronda} DE ${RONDAS}`, t: datos[0], p: `${esc(datos[1])}<br>Aguantaste <b>${seg} s</b> en el hielo.`,
    boton: ultima ? "Ver mi puntaje" : "Siguiente ronda ▶" }), r === "gano" ? 500 : 250);
}

// ---------------------------------------------------------------------------
// Rescate con pregunta.
let reloj = null;
async function rescate() {
  J.pausa = true;
  if (J.rescates >= RESCATES) { quedarFuera("Ya usaste tus 2 rescates de esta ronda."); return; }
  let q;
  try {
    q = await api("api/pregunta", { method: "POST", body: JSON.stringify({ t: token, partida: J.partida, ronda: J.ronda }) });
  } catch (e) { quedarFuera(e.message); return; }
  J.rescates++; pintarHud();
  $("#pTema").textContent = q.tema;
  $("#pTexto").textContent = q.texto;
  $("#pOps").innerHTML = q.opciones.map((o, k) => `<button type="button" data-k="${k}"><b>${"ABC"[k]}</b><span>${esc(o)}</span></button>`).join("");
  ver("#pExp", false); ver("#pSeguir", false);
  ver("#pregunta", true);
  const ini = performance.now();
  let ultimo = SEG_PREGUNTA, listo = false;
  const barra = $("#pBarra");
  barra.classList.remove("poco");
  const responderCon = async (k) => {
    if (listo) return;
    listo = true; clearInterval(reloj);
    $("#pOps").querySelectorAll("button").forEach((b) => (b.disabled = true));
    let r;
    try {
      r = await api("api/responder", { method: "POST", body: JSON.stringify({ t: token, partida: J.partida, qid: q.qid, opcion: k }) });
    } catch (e) { r = { correcta: false, explicacion: e.message, respuesta: -1 }; }
    const bs = $("#pOps").querySelectorAll("button");
    if (r.respuesta >= 0 && bs[r.respuesta]) bs[r.respuesta].classList.add("bien");
    if (k >= 0 && k !== r.respuesta && bs[k]) bs[k].classList.add("mal");
    const exp = $("#pExp");
    exp.className = "explica " + (r.correcta ? "si" : "no");
    exp.innerHTML = r.correcta
      ? `<b>¡Correcto! Vuelves al hielo.</b>${esc(r.explicacion)}`
      : `<b>${k < 0 || r.tarde ? "Se acabó el tiempo." : "No era esa."}</b>La respuesta: <i>${esc(r.texto_respuesta || "")}</i>. ${esc(r.explicacion)}`;
    ver("#pExp", true);
    if (r.correcta) { S.bien(); J.aciertos = r.aciertos; } else S.mal();
    $("#pSeguir").textContent = r.correcta ? "Volver al hielo ▶" : "Seguir";
    ver("#pSeguir", true); $("#pSeguir").focus();
    const seguir = () => {
      $("#pSeguir").onclick = null;
      ver("#pregunta", false);
      if (r.correcta) {
        F.rescatar(J.m, 0); escena.efecto("rescate", 0, 0);
        J.esperaRescate = false; J.pausa = false;
      } else quedarFuera(k < 0 || r.tarde ? "Se acabó el tiempo de la pregunta." : "Fallaste la pregunta de rescate.");
    };
    $("#pSeguir").onclick = seguir;
  };
  $("#pOps").onclick = (ev) => { const b = ev.target.closest("button[data-k]"); if (b) responderCon(+b.dataset.k); };
  clearInterval(reloj);
  reloj = setInterval(() => {
    const pasado = (performance.now() - ini) / 1000, resta = SEG_PREGUNTA - pasado;
    barra.style.transform = `scaleX(${Math.max(0, resta / SEG_PREGUNTA)})`;
    barra.classList.toggle("poco", resta < 4);
    if (Math.ceil(resta) < ultimo && resta < 5 && resta > 0) S.tic();
    ultimo = Math.ceil(resta);
    if (resta <= 0) responderCon(-1);
  }, 100);
  setTimeout(() => { const b = $("#pOps button"); if (b && !document.body.classList.contains("tactil")) b.focus(); }, 60);
}

function quedarFuera(motivo) {
  J.motivo = motivo;
  J.m.osos[0].fuera = true;
  J.esperaRescate = false; J.pausa = false;
}

async function terminarPartida() {
  const j = J;
  S.ambiente(false);
  let out = null, err = "";
  try {
    out = await api("api/terminar", { method: "POST", body: JSON.stringify({ t: token, partida: j.partida, rondas: j.ganadas, segundos: Math.floor(j.segundos) }) });
  } catch (e) { err = e.message; }
  J = null;
  ver("#juego", false);
  document.body.classList.remove("jugando");
  ver("#resultado", true);
  if (out) {
    const p = out.partida;
    yo = out;
    $("#rTotal").textContent = p.puntos.toLocaleString("es-PE");
    $("#rDesglose").innerHTML =
      `<li><span>Rondas ganadas: ${p.rondas} × 1000</span><b>${(p.rondas * 1000).toLocaleString("es-PE")}</b></li>` +
      `<li><span>Segundos en el hielo: ${p.segundos} × 10</span><b>${(p.segundos * 10).toLocaleString("es-PE")}</b></li>` +
      `<li><span>Rescates acertados: ${p.aciertos} × 300</span><b>${(p.aciertos * 300).toLocaleString("es-PE")}</b></li>`;
    $("#rNota").textContent = (out.record ? "¡Tu mejor partida! " : `Tu mejor partida sigue siendo ${out.mejor.toLocaleString("es-PE")}. `) +
      (out.puesto ? `Vas en el puesto ${out.puesto}.` : "");
  } else {
    $("#rTotal").textContent = "–";
    $("#rDesglose").innerHTML = "";
    $("#rNota").textContent = "No se pudo guardar el puntaje: " + err;
  }
  await cargarEstado();
  $("#resultado").scrollIntoView({ behavior: "smooth", block: "start" });
}

// ---------------------------------------------------------------------------
// Controles.
const JUEGO_TECLAS = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "KeyA", "KeyD", "KeyW", "KeyS", "Space"]);
addEventListener("keydown", (e) => {
  if (!J) return;
  if (!$("#pregunta").hidden) {
    if (["KeyA", "KeyB", "KeyC", "Digit1", "Digit2", "Digit3"].includes(e.code)) {
      const k = { KeyA: 0, KeyB: 1, KeyC: 2, Digit1: 0, Digit2: 1, Digit3: 2 }[e.code];
      const b = $(`#pOps button[data-k="${k}"]`); if (b && !b.disabled) b.click();
    }
    return;
  }
  if (JUEGO_TECLAS.has(e.code)) {
    e.preventDefault();
    if (e.code === "Space") { if (!e.repeat) quiereDash = J.corriendo; }
    else teclas.add(e.code);
  }
  if ((e.code === "Enter" || e.code === "Space") && !$("#cartel").hidden && !$("#cBtn").hidden) $("#cBtn").click();
});
addEventListener("keyup", (e) => teclas.delete(e.code));
addEventListener("blur", () => teclas.clear());

const zona = $("#zonaPalanca"), base = $("#palanca"), perilla = $("#perilla");
const RADIO = 50;
zona.addEventListener("pointerdown", (e) => {
  if (palanca.activa) return;
  tactil();
  palanca.activa = true; palanca.id = e.pointerId;
  const r = zona.getBoundingClientRect();
  palanca.ox = e.clientX; palanca.oy = e.clientY;
  base.style.left = `${e.clientX - r.left - base.offsetWidth / 2}px`;
  base.style.top = `${e.clientY - r.top - base.offsetHeight / 2}px`;
  base.style.bottom = "auto";
  zona.setPointerCapture(e.pointerId);
  e.preventDefault();
});
zona.addEventListener("pointermove", (e) => {
  if (!palanca.activa || e.pointerId !== palanca.id) return;
  let dx = e.clientX - palanca.ox, dy = e.clientY - palanca.oy;
  const d = Math.hypot(dx, dy);
  if (d > RADIO) { dx *= RADIO / d; dy *= RADIO / d; }
  palanca.x = dx / RADIO; palanca.y = dy / RADIO;
  if (Math.hypot(palanca.x, palanca.y) < 0.12) palanca.x = palanca.y = 0;
  perilla.style.transform = `translate(${dx}px, ${dy}px)`;
});
const soltar = (e) => {
  if (e.pointerId !== palanca.id) return;
  palanca.activa = false; palanca.x = palanca.y = 0; palanca.id = null;
  perilla.style.transform = "";
  base.style.left = ""; base.style.top = ""; base.style.bottom = "";
};
zona.addEventListener("pointerup", soltar);
zona.addEventListener("pointercancel", soltar);
$("#embestir").addEventListener("pointerdown", (e) => { e.preventDefault(); S.despertar(); if (J && J.corriendo) quiereDash = true; });
$("#embestir").addEventListener("click", (e) => e.preventDefault());

function pintarMudo() { $("#mudo").textContent = S.estaMudo() ? "🔇" : "🔊"; $("#mudo").setAttribute("aria-label", S.estaMudo() ? "Activar sonido" : "Silenciar"); }
$("#mudo").addEventListener("click", () => { S.despertar(); S.silenciar(!S.estaMudo()); pintarMudo(); });
pintarMudo();

// Pausa al cambiar de pestaña (la pregunta sigue con su propio reloj).
document.addEventListener("visibilitychange", () => {
  if (document.hidden && J && J.corriendo && !J.pausa) { J.pausa = true; ver("#pausa", true); }
});
$("#seguir").addEventListener("click", () => { ver("#pausa", false); if (J) { J.pausa = false; tPrev = 0; } S.despertar(); });

// Ganchos para las pruebas automáticas (?prueba=1): empujar al agua a
// propósito y dejar el hielo con un solo rival.
if (PRUEBA) {
  window.__tempano = {
    get J() { return J; },
    calmar() { J.m.osos.slice(1).forEach((o) => { o.quieto = true; o.vx = o.vy = 0; }); },
    alAgua() { const o = J.m.osos[0]; o.x = 0; o.y = F.R_HIELO + 40; },
    soloUno() { J.m.osos.slice(2).forEach((o) => { o.x = F.R_HIELO + 60; o.y = 0; }); },
    ganar() { J.m.osos.slice(1).forEach((o, k) => { o.x = F.R_HIELO + 60; o.y = k * 80; }); },
    juntar() { const [a, b] = J.m.osos; a.x = -60; a.y = 0; b.x = 0; b.y = 0; a.vx = 300; a.vy = 0; b.vx = 0; b.vy = 0; },
  };
}

(async () => {
  // En el LIVE manda la cuenta del LMS, no el token guardado (el equipo puede ser compartido).
  if (LIVE.n && LIVE.u) await entrarDesdeLive(); else await cargarYo();
  await cargarEstado();
  setInterval(() => { if (!J) cargarEstado(); }, 15000);
})();
