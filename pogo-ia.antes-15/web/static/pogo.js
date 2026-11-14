// Pogo IA · la aplicación: inicio, inscripción, rondas, chips con pregunta,
// puntaje y ranking. El tablero vive en tablero.js y el dibujo 3D en
// escena3d.js; las preguntas y su corrección las tiene SOLO el servidor.
import { api, $, esc, BASE } from "./comun.js";
import * as T from "./tablero.js";
import { crearEscena } from "./escena3d.js";
import * as S from "./sonido.js";

// La sala de clase (/clase/, la del modo LIVE) guarda su propio token: es otro juego, con otro ranking.
const CLASE = /\/clase\/$/.test(BASE);
const LLAVE = "pogo_t" + (CLASE ? "_clase" : "");
const PRUEBA = new URLSearchParams(location.search).has("prueba");
const NIVELES = [0.55, 0.68, 0.8];  // los robots de la máquina juegan mejor en cada ronda
const PASO = 1 / 60;
const RONDAS = 3, CHIPS = 3, SEG_PREGUNTA = 8;

let token = null, yo = null, estado = {};
// En la mesa en vivo el robot propio no es el 0 y los nombres son los de la clase.
const YO = () => (J && J.yo) || 0;
const nombreDe = (i) => (J && J.multi && J.nombres[i]) || T.ROBOTS[i].nombre;
try { token = localStorage.getItem(LLAVE); } catch (e) { token = null; }

const ver = (s, si) => { $(s).hidden = !si; };
const cache = new Map();
const poner = (s, html) => { if (cache.get(s) !== html) { cache.set(s, html); $(s).innerHTML = html; } };
const tactil = () => document.body.classList.add("tactil");
if (matchMedia("(pointer: coarse)").matches) tactil();
addEventListener("touchstart", tactil, { once: true, passive: true });

// ---------------------------------------------------------------------------
// Demostración del inicio: los cuatro robots juegan solos.
// Va a 30 cuadros por segundo y solo mientras se ve: en el LIVE la portada queda abierta toda la clase.
const demo = crearEscena($("#demo"), { nombres: false });
let demoM = T.nuevaRonda(Math.random, 0.7, { todosCpu: true });
let demoVisible = true;
try { new IntersectionObserver(([e]) => { demoVisible = e.isIntersecting; }).observe($("#demo")); } catch (e) { /* navegador viejo: siempre */ }
addEventListener("resize", () => { demo.medir(); if (escena) escena.medir(); });

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
  // Sala de clase: lo principal es la mesa en vivo con los compañeros; contra la máquina queda como práctica.
  ver("#vivo", CLASE && !yo.cerrado);
  if (CLASE && !yo.cerrado) { $("#jugar").textContent = "Practicar contra la máquina"; $("#jugar").classList.add("ghost"); }
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
// La escena del juego nace con la primera partida: así la portada tiene un solo contexto WebGL.
let escena = null;
let J = null;           // partida en curso
const teclas = [];      // direcciones apretadas, la última manda
let pedida = null;      // toque corto: se guarda hasta el siguiente rebote
let tocada = null;      // dirección de la cruz táctil

async function jugar() {
  S.despertar();
  $("#err2").textContent = "";
  $("#jugar").disabled = true; $("#otra").disabled = true;
  try {
    const p = await api("api/partida", { method: "POST", body: JSON.stringify({ t: token }) });
    J = { partida: p.partida, ronda: 0, ganadas: 0, casillas: 0, aciertos: 0, m: null, corriendo: false, pausa: false,
      chips: 0, acum: 0, resultados: [] };
    ver("#resultado", false);
    document.body.classList.add("jugando");
    ver("#juego", true);
    if (!escena) escena = crearEscena($("#escena")); else escena.medir();
    escena.etiquetas(T.ROBOTS.map((r) => r.nombre), 0);
    S.ambiente(true);
    empezarRonda(1);
  } catch (e) {
    $("#err2").textContent = e.message;
    ver("#listo", true);
    await cargarYo(); pintarYo();
  }
}

// ---------------------------------------------------------------------------
// Mesa en vivo (sala de clase): hasta 3 alumnos y 1 robot de la máquina. El servidor corre el tablero y manda
// unas 15 fotos por segundo; aquí solo se dibuja, se mandan las teclas y se responden las preguntas.
let fuente = null;
async function jugarVivo() {
  S.despertar();
  $("#err2").textContent = "";
  $("#vivo").disabled = true;
  try {
    const r = await api("api/mesa/unirse", { method: "POST", body: JSON.stringify({ t: token }) });
    J = { multi: { mesa: r.mesa }, yo: r.asiento, nombres: [], estado: "", ronda: 0, chips: 0, m: null, corriendo: false, pausa: false, durRonda: 45 };
    ver("#resultado", false);
    document.body.classList.add("jugando");
    ver("#juego", true);
    if (!escena) escena = crearEscena($("#escena")); else escena.medir();
    if (fuente) fuente.close();
    fuente = new EventSource(BASE + "api/mesa/fotos?t=" + encodeURIComponent(token) + "&mesa=" + encodeURIComponent(r.mesa));
    fuente.onmessage = (ev) => { try { foto(JSON.parse(ev.data)); } catch (x) { /* foto rota: la siguiente llega enseguida */ } };
    cartel({ k: "MESA EN VIVO", t: "Conectando…", p: "" });
  } catch (e) {
    $("#err2").textContent = e.message;
  }
  $("#vivo").disabled = false;
}

function foto(f) {
  if (!J || !J.multi || f.mesa !== J.multi.mesa) return;
  J.nombres = (f.asientos || []).map((a) => (a ? a.nombre : ""));
  J.durRonda = f.segundos_ronda || 45;
  if (f.m) {
    if (!J.m || f.ronda !== J.ronda) {
      J.ronda = f.ronda; J.chips = 0;
      J.m = { ...f.m, eventos: [] };
      escena.etiquetas(J.nombres, J.yo);
    } else {
      f.m.robots.forEach((r, i) => Object.assign(J.m.robots[i], r));
      Object.assign(J.m, { t: f.m.t, dueno: f.m.dueno, valor: f.m.valor, banco: f.m.banco, poderes: f.m.poderes, vuelos: f.m.vuelos, fin: f.m.fin });
    }
  }
  if (f.estado !== J.estado) { J.estado = f.estado; cambioEstado(f); }
  if (f.estado === "esperando") esperando(f);
  if (J.m && f.ev && f.ev.length) eventos(J.m, f.ev);
}

function esperando(f) {
  const sentados = (f.asientos || []).filter((a) => a && a.alumno).map((a) => esc(a.nombre));
  const falta = Math.max(0, Math.ceil((sentados.length >= 2 ? 15 : 25) - (f.espera || 0)));
  cartel({ k: "MESA EN VIVO", t: `${sentados.length} de 3`, p: `${sentados.join(" · ")}<br>${sentados.length >= 3 ? "¡Mesa llena!" : `Esperando compañeros… empieza en ${falta} s`}<br><small>Más un robot de la máquina.</small>` });
}

function cambioEstado(f) {
  if (f.estado === "cuenta") {
    J.corriendo = false;
    $("#cartel").classList.add("comic");
    const gritos = ["FIGHT!", "GO!", "LET'S GO!"];
    gritos.forEach((g, c) => setTimeout(() => {
      if (!J || !J.multi || J.estado !== "cuenta") return;
      cartel({ k: `RONDA ${f.ronda + 1} DE ${f.rondas}`, t: g, p: c === 0 ? "¡Pinta más que tus compañeros!" : "", solo: true });
      S.cuenta(c === gritos.length - 1);
    }, c * 900));
  } else if (f.estado === "jugando") {
    $("#cartel").classList.remove("comic");
    ver("#cartel", false);
    J.corriendo = true;
    S.ambiente(true);
  } else if (f.estado === "pausa") {
    J.corriendo = false;
  } else if (f.estado === "fin") {
    J.corriendo = false;
    S.ambiente(false);
    if (fuente) { fuente.close(); fuente = null; }
    if (f.final) setTimeout(() => terminarVivo(f.final), 1500);
  }
}

function finRondaVivo(e) {
  const yoId = YO(), gane = e.lider === yoId;
  const titulo = gane ? "¡Ganaste la ronda!" : e.lider < 0 ? "¡Empate!" : `Ronda para ${nombreDe(e.lider)}`;
  const marcador = `<div class="marco-final">${(e.resultados || []).map((r) => `<span style="--c:${T.ROBOTS[r.id].color}">${esc(r.id === yoId ? "Tú" : r.nombre)} ${r.casillas}</span>`).join("")}</div>`;
  if (gane) S.victoria(); else S.derrota();
  $("#cartel").classList.remove("comic");
  cartel({ k: `RONDA ${e.ronda} DE ${RONDAS}`, t: titulo, p: (e.ronda < RONDAS ? "La siguiente ronda empieza en unos segundos." : "¡Última ronda!") + marcador });
}

async function terminarVivo(final) {
  const mio = (final || []).find((r) => r.id === YO());
  J = null;
  ver("#cartel", false);
  ver("#juego", false);
  document.body.classList.remove("jugando");
  ver("#resultado", true);
  if (mio && mio.puntos !== undefined) {
    $("#rTotal").textContent = Number(mio.puntos).toLocaleString("es-PE");
    $("#rDesglose").innerHTML =
      `<li><span>Rondas ganadas: ${mio.rondas} × 1000</span><b>${(mio.rondas * 1000).toLocaleString("es-PE")}</b></li>` +
      `<li><span>Casillas: ${mio.casillas} × 10</span><b>${(mio.casillas * 10).toLocaleString("es-PE")}</b></li>` +
      `<li><span>Preguntas acertadas: ${mio.aciertos} × 300</span><b>${(mio.aciertos * 300).toLocaleString("es-PE")}</b></li>`;
    $("#rNota").textContent = "Mesa en vivo: " + final.map((r) => `${r.nombre} ${Number(r.puntos || 0).toLocaleString("es-PE")}`).join(" · ");
  } else {
    $("#rTotal").textContent = "–"; $("#rDesglose").innerHTML = ""; $("#rNota").textContent = "La mesa terminó.";
  }
  await cargarYo(); await cargarEstado();
  $("#resultado").scrollIntoView({ behavior: "smooth", block: "start" });
}
$("#vivo").addEventListener("click", () => jugarVivo());

function cartel({ k = "", t = "", p = "", boton = "", solo = false }) {
  $("#cK").textContent = k; $("#cT").textContent = t; $("#cP").innerHTML = p;
  $("#cBtn").textContent = boton; ver("#cBtn", !!boton);
  $("#cartel").classList.toggle("solo-t", solo);
  ver("#cartel", true);
  if (boton) setTimeout(() => $("#cBtn").focus(), 50);
}
let alBoton = null;
$("#cBtn").addEventListener("click", () => { const f = alBoton; alBoton = null; ver("#cartel", false); if (f) f(); });

const ICONO = { chip: "🤖", cohete: "🚀", turbo: "⚡", triple: "×3", balde: "🪣" };

// Bolsa de la ronda: de los 6 primeros poderes que tome la persona, 3 traen pregunta y 3 no, barajados y sin
// tres iguales seguidos. Así la pregunta sale a veces, pero repartida. Del séptimo en adelante, sin pregunta.
function nuevaBolsa() {
  for (;;) {
    const b = ["p", "p", "p", "l", "l", "l"];
    for (let i = b.length - 1; i > 0; i--) { const k = Math.floor(Math.random() * (i + 1)); [b[i], b[k]] = [b[k], b[i]]; }
    if (!b.some((x, i) => i >= 2 && x === b[i - 1] && x === b[i - 2])) return b;
  }
}

let avisoT = 0;
function aviso(txt) {
  $("#aviso").textContent = txt; ver("#aviso", true);
  clearTimeout(avisoT); avisoT = setTimeout(() => ver("#aviso", false), 1800);
}

function empezarRonda(n) {
  J.ronda = n; J.chips = 0; J.acum = 0; J.bolsa = PRUEBA && forzar ? [] : nuevaBolsa();
  J.m = T.nuevaRonda(Math.random, NIVELES[n - 1]);
  J.corriendo = false; J.pausa = false;
  pedida = null;
  pintarHud();
  // Cuenta de salida en grito de cómic: FIGHT! · GO! · LET'S GO!
  const gritos = ["FIGHT!", "GO!", "LET'S GO!"];
  let c = 0;
  $("#cartel").classList.add("comic");
  const tic = () => {
    if (!J) return;
    const ultimo = c === gritos.length - 1;
    cartel({ k: `RONDA ${n} DE ${RONDAS}`, t: gritos[c], p: n === 1 && c === 0 ? "¡Pinta más casillas que los demás!" : "", solo: true });
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

// Dirección que la persona quiere al tocar el suelo: tecla apretada, cruz táctil o el último toque corto.
function mando() {
  const d = teclas.length ? teclas[teclas.length - 1] : tocada || pedida;
  pedida = null;
  return d ? T.DIRS[d] : null;
}

function eventos(m, lista = m.eventos) {
  const yoId = YO();
  for (const e of lista) {
    if (e.tipo === "salto") S.rebote(e.id === yoId);
    else if (e.tipo === "pintar" && e.id === yoId) S.pintar();
    else if (e.tipo === "choque") { if (e.id === yoId) S.choque(); escena.efecto(e); }
    else if (e.tipo === "cobro") {
      S.rafaga(); escena.efecto(e);
      aviso(e.id === yoId ? `¡Cobraste ${e.n} casillas!` : `${nombreDe(e.id)} cobró ${e.n} casillas`);
    }
    else if (e.tipo === "mareo") S.mareo();
    else if (e.tipo === "tomar") { S.chip(); escena.efecto(e); if (e.id === yoId && !J.multi) poderTomado(e.poder); }
    else if (e.tipo === "pregunta") { if (e.id === yoId && J.multi) preguntaVivo(e); }
    else if (e.tipo === "finRonda") { if (J.multi) finRondaVivo(e); }
    else if (e.tipo === "poder") {
      escena.efecto(e);
      if (e.poder === "turbo") S.turbo(); else if (e.poder === "triple") S.triple(); else if (e.poder === "balde") S.balde();
      if (e.id === yoId) aviso(`${ICONO[e.poder]} ${T.PODERES[e.poder].nombre}: ${T.PODERES[e.poder].texto}${e.poder === "cohete" ? (document.body.classList.contains("tactil") ? " · toca 🚀" : " · Espacio") : ""}`);
      else if (e.poder === "balde") aviso(`🪣 ${nombreDe(e.id)} pintó toda la mesa`);
    }
    else if (e.tipo === "lanzar") S.lanzar();
    else if (e.tipo === "impacto") {
      S.impacto(); escena.efecto(e);
      if (e.id === yoId) { aviso(`💥 ${nombreDe(e.de)} te aturdió`); try { navigator.vibrate && navigator.vibrate(120); } catch (x) { /* nada */ } }
      else if (e.de === yoId) aviso(`💥 ¡Aturdiste a ${nombreDe(e.id)}!`);
    }
  }
  if (lista === m.eventos) m.eventos.length = 0;
}

function pintarHud() {
  if (!J || !J.m) return;
  const m = J.m;
  // Solo se toca el DOM cuando el texto cambia (poner): reescribirlo cada cuadro obliga a recalcular la página.
  poner("#hRonda", `${J.ronda}/${RONDAS}`);
  const quedan = Math.max(0, Math.ceil((J.durRonda || T.DURACION) - m.t));
  poner("#hReloj", String(quedan));
  $("#hReloj").classList.toggle("alerta", quedan <= 10);
  let b = "";
  for (let k = 0; k < CHIPS; k++) b += `<i class="${k < J.chips ? "gastado" : ""}"></i>`;
  poner("#hChips", b);
  // Poder activo de la persona.
  const yo = m.robots[YO()];
  const poder = yo.cohetes > 0 ? `🚀 <small>${document.body.classList.contains("tactil") ? "toca 🚀" : "Espacio"}</small>`
    : yo.turbo > 0 ? `⚡ ${Math.ceil(yo.turbo)}s` : yo.triple > 0 ? `×3 ${Math.ceil(yo.triple)}s` : "";
  poner("#hPoder", poder);
  $("#hPoderCaja").hidden = !poder;
  $("#disparar").hidden = !(yo.cohetes > 0);
  const n = T.conteo(m), total = T.N * T.N;
  poner("#hMarcador", n.map((x, i) => m.robots[i].ausente ? "" : `<span class="${i === YO() ? "yo" : ""}" title="${esc(nombreDe(i))}"><i style="--c:${T.ROBOTS[i].color};--p:${Math.min(1, x / total).toFixed(3)}"></i>${x}</span>`).join(""));
}

// Un cuadro por refresco de pantalla, pero como mucho ~60 por segundo (en pantallas de 120 Hz se dibuja uno
// de cada dos) y 30 para la demostración. La simulación avanza a paso fijo, así que no cambia nada del juego.
let tPrev = 0, tDibujo = 0;
const medida = { ms: 0, n: 0 };  // solo con ?prueba=1: tiempo de JS por cuadro dibujado
function cuadro(ms) {
  requestAnimationFrame(cuadro);
  const jugando = J && J.m;
  if (ms - tDibujo < (jugando ? 12 : 30)) return;
  tDibujo = ms;
  const t = ms / 1000;
  const dt = Math.min(0.1, tPrev ? t - tPrev : 0); tPrev = t;
  const t0 = PRUEBA ? performance.now() : 0;
  if (jugando && J.multi) {
    if (J.corriendo) {
      for (const r of J.m.robots) if (!r.ausente) r.fase = Math.min(0.97, r.fase + dt / T.salto(r));
      pintarHud();
    }
    escena.dibujar(J.m, t);
  } else if (jugando) {
    if (J.corriendo && !J.pausa) {
      J.acum += dt;
      while (J.acum >= PASO) {
        J.acum -= PASO;
        T.paso(J.m, PASO, mando);
        eventos(J.m);
        if (J.m.fin) { finRonda(); break; }
        if (J.pausa) break;
      }
      pintarHud();
    }
    escena.dibujar(J.m, t);
    if (PRUEBA) { medida.ms += performance.now() - t0; medida.n++; }
  } else if (demoVisible && !document.hidden) {
    T.paso(demoM, Math.min(dt, 1 / 20), null);
    demoM.eventos.length = 0;
    if (demoM.fin) demoM = T.nuevaRonda(Math.random, 0.7, { todosCpu: true });
    demo.dibujar(demoM, t);
  }
}
requestAnimationFrame(cuadro);

function finRonda() {
  J.corriendo = false;
  const r = T.resultado(J.m);
  J.casillas += r.conteo[0];
  if (r.gano) J.ganadas++;
  J.resultados.push(r);
  pintarHud();
  const ultima = J.ronda >= RONDAS;
  const titulo = r.gano ? "¡Ganaste la ronda!" : r.lider < 0 ? "¡Empate!" : `Ronda para ${T.ROBOTS[r.lider].nombre}`;
  const texto = r.gano ? "Tuviste más casillas que nadie. +1000" : r.lider < 0 ? "Nadie quedó solo arriba: la ronda no se gana, pero tus casillas cuentan." : "Esta vez te ganaron el tablero.";
  const marcador = `<div class="marco-final">${r.conteo.map((x, i) => `<span style="--c:${T.ROBOTS[i].color}">${esc(T.ROBOTS[i].nombre)} ${x}</span>`).join("")}</div>`;
  if (r.gano) S.victoria(); else S.derrota();
  alBoton = ultima ? terminarPartida : () => empezarRonda(J.ronda + 1);
  setTimeout(() => cartel({ k: `RONDA ${J.ronda} DE ${RONDAS}`, t: titulo, p: `${esc(texto)}<br>Pintaste <b>${r.conteo[0]}</b> casillas.${marcador}`,
    boton: ultima ? "Ver mi puntaje" : "Siguiente ronda ▶" }), r.gano ? 500 : 250);
}

// ---------------------------------------------------------------------------
// Chip IA con pregunta.
let reloj = null;
// La persona tomó un poder. Según la bolsa de la ronda va directo o con pregunta: acierto = poder (+300),
// fallo o tiempo = mareo y sin poder.
async function poderTomado(tipo) {
  const conPregunta = (J.bolsa.length ? J.bolsa.shift() === "p" : false) || (PRUEBA && forzar === "pregunta");
  if (!conPregunta || J.chips >= CHIPS) { T.aplicar(J.m, 0, tipo); return; }
  J.pausa = true;
  teclas.length = 0; tocada = null; pedida = null;
  let q;
  try {
    q = await api("api/pregunta", { method: "POST", body: JSON.stringify({ t: token, partida: J.partida, ronda: J.ronda }) });
  } catch (e) { T.aplicar(J.m, 0, tipo); eventos(J.m); J.pausa = false; tPrev = 0; return; }
  J.chips++; pintarHud();
  const r = await preguntar(q, tipo, J.partida);
  if (r.correcta) T.aplicar(J.m, 0, tipo); else T.marear(J.m, 0);
  eventos(J.m);
  J.pausa = false; tPrev = 0;
}

// Mesa en vivo: el servidor congeló mi robot hasta que responda; los demás siguen jugando.
async function preguntaVivo(e) {
  const mesa = J.multi.mesa;
  teclas.length = 0; tocada = null; pedida = null; enviar({ dir: "" });
  let q = null;
  try { q = await api("api/pregunta", { method: "POST", body: JSON.stringify({ t: token, partida: e.partida, ronda: e.ronda }) }); }
  catch (x) { aviso(x.message); }
  if (q) { J.chips++; await preguntar(q, e.poder, e.partida); }
  try { await api("api/mesa/resolver", { method: "POST", body: JSON.stringify({ t: token, mesa }) }); } catch (x) { /* la mesa terminó */ }
}

// Muestra la pregunta y resuelve con la respuesta del servidor cuando la persona pulsa «Seguir».
function preguntar(q, tipo, partida) {
  return new Promise((listoFin) => {
  $("#pPoder").textContent = `${ICONO[tipo]} ${T.PODERES[tipo].nombre.toUpperCase()}`;
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
      r = await api("api/responder", { method: "POST", body: JSON.stringify({ t: token, partida, qid: q.qid, opcion: k }) });
    } catch (e) { r = { correcta: false, explicacion: e.message, respuesta: -1 }; }
    const bs = $("#pOps").querySelectorAll("button");
    if (r.respuesta >= 0 && bs[r.respuesta]) bs[r.respuesta].classList.add("bien");
    if (k >= 0 && k !== r.respuesta && bs[k]) bs[k].classList.add("mal");
    const exp = $("#pExp");
    exp.className = "explica " + (r.correcta ? "si" : "no");
    exp.innerHTML = r.correcta
      ? `<b>¡Correcto! ${esc(T.PODERES[tipo].nombre)}: ${esc(T.PODERES[tipo].texto)}.</b>${esc(r.explicacion)}`
      : `<b>${k < 0 || r.tarde ? "Se acabó el tiempo." : "No era esa."}</b>La respuesta: <i>${esc(r.texto_respuesta || "")}</i>. ${esc(r.explicacion)}`;
    ver("#pExp", true);
    if (r.correcta) { S.bien(); if (J) J.aciertos = r.aciertos; } else S.mal();
    $("#pSeguir").textContent = r.correcta ? `${ICONO[tipo]} ¡${T.PODERES[tipo].nombre}! ▶` : "Seguir";
    ver("#pSeguir", true); $("#pSeguir").focus();
    $("#pSeguir").onclick = () => {
      $("#pSeguir").onclick = null;
      ver("#pregunta", false);
      listoFin(r);
    };
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
  });
}

async function terminarPartida() {
  const j = J;
  S.ambiente(false);
  let out = null, err = "";
  try {
    out = await api("api/terminar", { method: "POST", body: JSON.stringify({ t: token, partida: j.partida, rondas: j.ganadas, casillas: j.casillas }) });
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
      `<li><span>Casillas pintadas: ${p.casillas} × 10</span><b>${(p.casillas * 10).toLocaleString("es-PE")}</b></li>` +
      `<li><span>Chips acertados: ${p.aciertos} × 300</span><b>${(p.aciertos * 300).toLocaleString("es-PE")}</b></li>`;
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
// Controles: teclado, cruz táctil y deslizar el dedo sobre el tablero.
const TECLA_DIR = { ArrowUp: "arriba", KeyW: "arriba", ArrowDown: "abajo", KeyS: "abajo", ArrowLeft: "izquierda", KeyA: "izquierda", ArrowRight: "derecha", KeyD: "derecha" };
addEventListener("keydown", (e) => {
  if (!J) return;
  if (!$("#pregunta").hidden) {
    if (["KeyA", "KeyB", "KeyC", "Digit1", "Digit2", "Digit3"].includes(e.code)) {
      const k = { KeyA: 0, KeyB: 1, KeyC: 2, Digit1: 0, Digit2: 1, Digit3: 2 }[e.code];
      const b = $(`#pOps button[data-k="${k}"]`); if (b && !b.disabled) b.click();
    }
    return;
  }
  if (e.code === "Space" && J.corriendo && !J.pausa && $("#cartel").hidden) { e.preventDefault(); if (!e.repeat) disparar(); return; }
  const d = TECLA_DIR[e.code];
  if (d) {
    e.preventDefault();
    if (!e.repeat) { const i = teclas.indexOf(d); if (i >= 0) teclas.splice(i, 1); teclas.push(d); pedida = d; enviar({ dir: d, pulso: d }); }
  }
  if ((e.code === "Enter" || e.code === "Space") && !$("#cartel").hidden && !$("#cBtn").hidden) { e.preventDefault(); $("#cBtn").click(); }
});
addEventListener("keyup", (e) => { const d = TECLA_DIR[e.code]; if (d) { const i = teclas.indexOf(d); if (i >= 0) teclas.splice(i, 1); enviar({ dir: teclas[teclas.length - 1] || "" }); } });

// Mesa en vivo: el mando va al servidor (dirección apretada, toque corto o cohete). Fuera de la mesa no hace nada.
function enviar(o) {
  if (!J || !J.multi) return;
  fetch(BASE + "api/mesa/mando", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ t: token, mesa: J.multi.mesa, ...o }) }).catch(() => {});
}
function disparar() { if (J && J.multi) enviar({ disparar: true }); else if (J) T.disparar(J.m, 0); }
addEventListener("blur", () => { teclas.length = 0; tocada = null; });

$("#disparar").addEventListener("pointerdown", (e) => { e.preventDefault(); S.despertar(); if (J && J.corriendo && !J.pausa) disparar(); });
$("#disparar").addEventListener("click", (e) => e.preventDefault());

const cruz = $("#cruz");
const soltarCruz = () => { if (tocada) enviar({ dir: "" }); tocada = null; cruz.querySelectorAll("button").forEach((b) => b.classList.remove("activo")); };
cruz.addEventListener("pointerdown", (e) => {
  const b = e.target.closest("button[data-dir]");
  if (!b) return;
  e.preventDefault(); S.despertar(); tactil();
  soltarCruz();
  tocada = pedida = b.dataset.dir; b.classList.add("activo");
  enviar({ dir: tocada, pulso: tocada });
});
cruz.addEventListener("pointerup", soltarCruz);
cruz.addEventListener("pointercancel", soltarCruz);
cruz.addEventListener("pointerleave", soltarCruz);
cruz.addEventListener("click", (e) => e.preventDefault());

let gesto = null;
$("#escena").addEventListener("pointerdown", (e) => { S.despertar(); gesto = { x: e.clientX, y: e.clientY, id: e.pointerId }; });
$("#escena").addEventListener("pointermove", (e) => {
  if (!gesto || e.pointerId !== gesto.id) return;
  const dx = e.clientX - gesto.x, dy = e.clientY - gesto.y;
  if (Math.hypot(dx, dy) < 24) return;
  tocada = pedida = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "derecha" : "izquierda") : (dy > 0 ? "abajo" : "arriba");
  enviar({ dir: tocada, pulso: tocada });
  gesto.x = e.clientX; gesto.y = e.clientY;
});
const finGesto = (e) => { if (gesto && e.pointerId === gesto.id) { gesto = null; if (tocada) enviar({ dir: "" }); tocada = null; } };
$("#escena").addEventListener("pointerup", finGesto);
$("#escena").addEventListener("pointercancel", finGesto);

function pintarMudo() { $("#mudo").textContent = S.estaMudo() ? "🔇" : "🔊"; $("#mudo").setAttribute("aria-label", S.estaMudo() ? "Activar sonido" : "Silenciar"); }
$("#mudo").addEventListener("click", () => { S.despertar(); S.silenciar(!S.estaMudo()); pintarMudo(); });
pintarMudo();

// Pausa al cambiar de pestaña (la pregunta sigue con su propio reloj).
document.addEventListener("visibilitychange", () => {
  if (document.hidden && J && J.corriendo && !J.pausa) { J.pausa = true; ver("#pausa", true); }
});
$("#seguir").addEventListener("click", () => { ver("#pausa", false); if (J) { J.pausa = false; tPrev = 0; } S.despertar(); });

// Ganchos para las pruebas automáticas (?prueba=1).
var forzar = null;
if (PRUEBA) {
  window.__pogo = {
    get J() { return J; },
    // El chip en la casilla donde va a caer tu robot (ningún otro robot puede caer ahí).
    // Pone un poder en la casilla donde va a caer tu robot (ningún otro robot puede caer ahí).
    poderDondeCaes(tipo) { const r = J.m.robots[0]; J.m.poderes = [{ tipo, c: r.dc, f: r.df, vida: 9 }]; J.m.proxPoder = 99; },
    // "pregunta": todo poder trae pregunta; "libre": ninguno.
    forzar(modo) { forzar = modo; J.bolsa = modo === "libre" ? ["l", "l", "l", "l", "l", "l", "l", "l"] : []; },
    calmar() { J.m.robots.slice(1).forEach((r) => { r.mareo = 99; }); },
    pintarTodo() { J.m.dueno.fill(0); },
    acabar() { J.m.t = T.DURACION - 0.05; },
    msPorCuadro() { return medida.n ? medida.ms / medida.n : 0; },
  };
}

(async () => {
  // En el LIVE manda la cuenta del LMS, no el token guardado (el equipo puede ser compartido).
  if (LIVE.n && LIVE.u) await entrarDesdeLive(); else await cargarYo();
  await cargarEstado();
  setInterval(() => { if (!J) cargarEstado(); }, 15000);
})();
