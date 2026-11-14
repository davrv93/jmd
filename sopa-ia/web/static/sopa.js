// Sopa de letras IA: dibuja el tablero que arma el servidor, maneja la
// selección (arrastrar, o tocar la primera y la última letra) y pinta lo que
// responde el servidor. Dónde está cada palabra y el tiempo que vale los sabe
// SOLO el servidor; el reloj de aquí es para mirar.
import { api, $, esc, luz, celebrar } from "./comun.js";
luz();

const LLAVE = "sopa_t";
const LADO = 12;
const QUIETO = matchMedia("(prefers-reduced-motion: reduce)").matches;
const COLORES = ["#f5c518", "#7cc4fa", "#7ddc9f", "#fb9fb1", "#b9a8fb", "#fdba74", "#5ad6c4", "#f39bd6"];
const NS = "http://www.w3.org/2000/svg";

let token = null;
let estado = {};
let yo = null;
let tablero = null;   // vista del intento en curso (letras, palabras, encontradas)
let jugando = false;
let ocupado = false;
let t0 = 0;           // performance.now() del inicio, según el servidor
let rafReloj = 0;

try { token = localStorage.getItem(LLAVE); } catch (e) { token = null; }

const ver = (s, si) => { $(s).hidden = !si; };

// mm:ss.d
export function tiempo(ms) {
  ms = Math.max(0, Math.floor(ms));
  const m = Math.floor(ms / 60000), s = Math.floor((ms % 60000) / 1000), d = Math.floor((ms % 1000) / 100);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${d}`;
}

const fechaCierre = (iso) => new Date(iso).toLocaleString("es-PE", {
  weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit", timeZone: "America/Lima",
});

// ---------------------------------------------------------------------------
// Estado público: reglas, contadores, ranking y ganadores.
async function cargarEstado() {
  try { estado = await api("api/estado"); pintarEstado(); } catch (e) { /* se reintenta luego */ }
}

function pintarEstado() {
  const e = estado;
  $("#cJug").textContent = e.jugaron ?? 0;
  $("#cPar").textContent = e.partidas ?? 0;
  $("#cMejor").textContent = e.ranking && e.ranking.length ? tiempo(e.ranking[0].ms) : "–";
  $("#chipInt").textContent = `${e.intentos_por_persona || 3} intentos por persona`;
  $("#intTxt").textContent = e.intentos_por_persona || 3;
  $("#minTxt").textContent = Math.round((e.minimo_ms ?? 15000) / 1000);
  const p1 = (e.premios && e.premios[0]) || 100;
  const premioTxt = p1 === 100 ? "una vacante 100 %" : `un código de ${p1} %`;
  if (e.cerrado) {
    const g = (e.ganadores || [])[0];
    $("#reglaTxt").textContent = "Concurso cerrado";
    $("#reglaSub").textContent = g ? `Ganó ${g.nombre} con ${tiempo(g.ms)}. ¡Gracias por jugar!` : "¡Gracias por jugar!";
  } else {
    $("#reglaTxt").textContent = `El mejor tiempo gana ${premioTxt} en Claude Code PRO`;
    let sub = e.cierre ? `Cierra el ${fechaCierre(e.cierre)} (hora de Lima).` : "Abierto hasta que el organizador lo cierre.";
    if ((e.premios || []).length > 1) sub += ` Premios: ${e.premios.map((d, k) => `${k + 1}.º ${d} %`).join(" · ")}.`;
    $("#reglaSub").textContent = sub;
  }

  const rk = e.ranking || [];
  $("#rankTxt").textContent = rk.length
    ? `Top ${rk.length} de ${e.en_ranking} con tiempo. Vale el mejor intento de cada persona.`
    : "Nadie ha terminado todavía. ¿Serás la primera persona?";
  $("#ranking").innerHTML = rk.map((f) => `<li class="${f.fuera ? "fuera-c" : ""}"><span class="p">${f.puesto}</span>` +
    `<span class="n">${esc(f.nombre)}${f.fuera ? '<span class="fuera">fuera de concurso</span>' : ""}</span>` +
    `<span class="t">${tiempo(f.ms)}</span></li>`).join("");

  const gs = e.ganadores || [];
  ver("#ganadores", gs.length > 0);
  $("#ganadores h2").textContent = gs.length > 1 ? "Ganadores" : "Ganador";
  $("#ganLista").innerHTML = gs.map((g) => `<li><b>${g.puesto}.º ${esc(g.nombre)}</b><span>${tiempo(g.ms)} · ${g.descuento} %</span></li>`).join("");
  pintarYo();
}

// ---------------------------------------------------------------------------
// La persona: intentos, mejor tiempo, puesto y premio.
function pintarYo() {
  if (!yo) { ver("#inscripcion", true); ver("#juego", false); ver("#premio", false); ver("#mipuesto", false); return; }
  ver("#inscripcion", false); ver("#juego", true);
  $("#nom").textContent = yo.nombre;
  const total = estado.intentos_por_persona || (yo.intentos_usados + yo.intentos_restantes);
  let puntos = "";
  for (let k = 0; k < total; k++) puntos += `<i class="${k < yo.intentos_usados ? "gastado" : ""}"></i>`;
  $("#intentos").innerHTML = `<span>INTENTOS</span>${puntos}`;
  const aviso = $("#aviso");
  aviso.hidden = !yo.aviso; aviso.textContent = yo.aviso || "";

  const mp = $("#mipuesto");
  if (yo.puesto > 0) {
    mp.hidden = false;
    mp.innerHTML = `Tu puesto: <b>#${yo.puesto}</b> · tu mejor tiempo: <b>${tiempo(yo.mejor_ms)}</b>${yo.excluido ? " (fuera de concurso)" : ""}`;
  } else mp.hidden = true;

  if (!jugando) pintarVelo();

  const pr = $("#premio");
  if (yo.gane) {
    pr.hidden = false;
    const d = yo.descuento || 100;
    $("#premioK").textContent = `¡GANASTE! · PUESTO ${yo.puesto_premio || 1} · CÓDIGO ${d} % · UN SOLO USO`;
    $("#premioBig").innerHTML = d === 100 ? "100 %<small>GRATIS</small>" : `${d} %<small>DE DESCUENTO</small>`;
    const cod = $("#cod");
    if (yo.codigo_pendiente || !yo.codigo) {
      cod.className = "cod pend";
      cod.textContent = "Tu premio está guardado. El código llega en unos minutos: vuelve a abrir esta página desde este mismo navegador.";
      ver("#usar", false);
    } else {
      cod.className = "cod"; cod.textContent = yo.codigo;
      $("#usar").href = yo.matricula; ver("#usar", true);
    }
    $("#premioTxt").textContent = d === 100
      ? "Toca «Usar mi código»: va puesto en la matrícula. Elige «Individual» y el total queda en S/ 0."
      : `Toca «Usar mi código»: va puesto en la matrícula con ${d} % de descuento.`;
  } else pr.hidden = true;
}

// El velo sobre el tablero: botón de empezar. Si ya no se puede jugar
// (concurso cerrado o intentos usados), el tablero se oculta y queda un aviso.
function pintarVelo() {
  const velo = $("#velo"), btn = $("#empezar"), txt = $("#veloTxt"), nota = $("#notaJuego"), juego = $("#juego");
  ver("#rendirse", false);
  const resuelto = tablero && !$("#fin").hidden; // recién terminado: el tablero queda a la vista
  let msg = "";
  if (estado.cerrado || yo.cerrado) {
    msg = yo.gane ? "El concurso cerró y ganaste. Tu código está abajo." : "El concurso cerró. ¡Gracias por jugar!";
    if (yo.mejor_ms > 0 && !yo.gane) msg += ` Tu mejor tiempo: <b>${tiempo(yo.mejor_ms)}</b>.`;
  } else if (yo.intentos_restantes <= 0) {
    msg = yo.mejor_ms > 0
      ? `Usaste tus intentos. Tu mejor tiempo, <b>${tiempo(yo.mejor_ms)}</b>, es el que cuenta.`
      : "Usaste tus intentos. ¡Gracias por jugar!";
  }
  nota.hidden = !msg || resuelto; nota.innerHTML = msg;
  juego.classList.toggle("quieto", !!msg && !resuelto);
  if (resuelto) { velo.hidden = true; return; }
  velo.hidden = false;
  if (!tablero) pintarTablero(tableroDeMuestra(), true);
  if (msg) return;
  const n = yo.intentos_usados + 1;
  txt.textContent = n === 1
    ? "Cada intento trae letras nuevas. El reloj empieza al tocar el botón."
    : `Te ${yo.intentos_restantes === 1 ? "queda 1 intento" : `quedan ${yo.intentos_restantes} intentos`}. Letras nuevas, y vale tu mejor tiempo.`;
  btn.textContent = `▶ Empezar intento ${n}`;
}

// Letras de adorno detrás del velo (no son un tablero real).
function tableroDeMuestra() {
  const ab = "ABCDEFGHIJLMNOPRSTUV";
  const letras = [];
  for (let f = 0; f < LADO; f++) {
    let s = "";
    for (let c = 0; c < LADO; c++) s += ab[Math.floor(Math.random() * ab.length)];
    letras.push(s);
  }
  return { letras, palabras: [], encontradas: [], total: 8 };
}

// ---------------------------------------------------------------------------
// El tablero.
function pintarTablero(t, muestra = false) {
  const cont = $("#letras");
  cont.innerHTML = "";
  for (let f = 0; f < LADO; f++) {
    for (let c = 0; c < LADO; c++) {
      const s = document.createElement("span");
      s.textContent = t.letras[f][c];
      cont.append(s);
    }
  }
  $("#trazos").innerHTML = "";
  $("#nTot").textContent = t.total || 8;
  if (muestra) {
    $("#lista").innerHTML = ""; $("#glosario").innerHTML = ""; $("#nEnc").textContent = "0";
    return;
  }
  $("#lista").innerHTML = t.palabras.map((p) => `<li data-p="${p.palabra}"><i></i><b>${p.palabra}</b></li>`).join("");
  $("#glosario").innerHTML = "";
  t.encontradas.forEach((e, k) => marcarHallada(e, k, false));
  $("#nEnc").textContent = t.encontradas.length;
}

function linea(f1, c1, f2, c2, cls, color) {
  const l = document.createElementNS(NS, "line");
  l.setAttribute("x1", c1 + .5); l.setAttribute("y1", f1 + .5);
  l.setAttribute("x2", c2 + .5); l.setAttribute("y2", f2 + .5);
  if (cls) l.setAttribute("class", cls);
  if (color) { l.setAttribute("stroke", color); l.setAttribute("stroke-opacity", ".62"); }
  return l;
}

// Pinta una palabra hallada: trazo de color, tachada en la lista y su
// significado en el glosario.
function marcarHallada(e, k, nueva) {
  const color = COLORES[k % COLORES.length];
  $("#trazos").prepend(linea(e.f1, e.c1, e.f2, e.c2, "", color));
  const li = $(`#lista li[data-p="${e.palabra}"]`);
  if (li) {
    li.classList.add("ok"); li.querySelector("i").style.background = color;
    if (nueva && !QUIETO) li.classList.add("nuevo");
  }
  const p = tablero.palabras.find((x) => x.palabra === e.palabra);
  const g = document.createElement("li");
  g.innerHTML = `<b style="background:${color};color:#1b1310">${e.palabra}</b><span>${esc(p ? p.significado : "")}</span>`;
  $("#glosario").prepend(g);
}

// --- Selección: arrastrar, o tocar la primera y luego la última letra. ---
let abajo = null;        // celda donde se apoyó el dedo (o el mouse)
let pendiente = null;    // primera letra tocada (modo tocar)
let arrastrando = false;
let movio = false;       // el dedo salió de la celda: es un arrastre

function celdaDe(ev) {
  const r = $("#letras").getBoundingClientRect();
  const c = Math.floor(((ev.clientX - r.left) / r.width) * LADO);
  const f = Math.floor(((ev.clientY - r.top) / r.height) * LADO);
  if (f < 0 || f >= LADO || c < 0 || c >= LADO) return null;
  return { f, c };
}

// Lleva el extremo a la recta más cercana (horizontal, vertical o diagonal)
// desde el inicio, sin salir del tablero.
function ajustar(a, b) {
  const df = b.f - a.f, dc = b.c - a.c;
  if (!df && !dc) return { f: a.f, c: a.c };
  const ang = Math.round(Math.atan2(df, dc) / (Math.PI / 4)) * (Math.PI / 4);
  const sf = Math.round(Math.sin(ang)), sc = Math.round(Math.cos(ang));
  let n = sf && sc ? Math.round((Math.abs(df) + Math.abs(dc)) / 2) : Math.abs(sf ? df : dc);
  while (n > 0 && (a.f + sf * n < 0 || a.f + sf * n >= LADO || a.c + sc * n < 0 || a.c + sc * n >= LADO)) n--;
  return { f: a.f + sf * n, c: a.c + sc * n };
}

function letrasEntre(a, b) {
  const n = Math.max(Math.abs(b.f - a.f), Math.abs(b.c - a.c));
  const sf = Math.sign(b.f - a.f), sc = Math.sign(b.c - a.c);
  let s = "";
  for (let k = 0; k <= n; k++) s += tablero.letras[a.f + sf * k][a.c + sc * k];
  return s;
}

function previa(a, b) {
  const tz = $("#trazos");
  tz.querySelectorAll(".prev, .ini").forEach((x) => x.remove());
  if (!a) { $("#sel").textContent = ""; return; }
  if (!b || (a.f === b.f && a.c === b.c)) {
    const ci = document.createElementNS(NS, "circle");
    ci.setAttribute("cx", a.c + .5); ci.setAttribute("cy", a.f + .5); ci.setAttribute("r", .42); ci.setAttribute("class", "ini");
    tz.append(ci);
    tz.append(linea(a.f, a.c, a.f, a.c, "prev"));
    $("#sel").className = "sel"; $("#sel").textContent = tablero.letras[a.f][a.c];
    return;
  }
  tz.append(linea(a.f, a.c, b.f, b.c, "prev"));
  $("#sel").className = "sel"; $("#sel").textContent = letrasEntre(a, b);
}

const letrasEl = $("#letras");
const igual = (x, y) => x.f === y.f && x.c === y.c;
letrasEl.addEventListener("pointerdown", (ev) => {
  if (!jugando || ocupado) return;
  const c = celdaDe(ev);
  if (!c) return;
  ev.preventDefault();
  letrasEl.setPointerCapture(ev.pointerId);
  arrastrando = true; movio = false; abajo = c;
  if (pendiente) previa(pendiente, ajustar(pendiente, c)); else previa(c, null);
});
// Arrastrar: la selección va desde donde se apoyó el dedo (si había una
// primera letra tocada, se olvida).
letrasEl.addEventListener("pointermove", (ev) => {
  if (!arrastrando) return;
  const c = celdaDe(ev);
  if (!c) return;
  if (!movio && igual(c, abajo)) return;
  movio = true; pendiente = null;
  previa(abajo, ajustar(abajo, c));
});
const soltar = (ev) => {
  if (!arrastrando) return;
  arrastrando = false;
  if (movio) {
    const b = ajustar(abajo, celdaDe(ev) || abajo);
    if (igual(b, abajo)) { previa(null); return; }
    enviar(abajo, b);
    return;
  }
  // Un toque: primera letra; el segundo toque cierra la palabra (o suelta la
  // primera si es la misma letra).
  if (!pendiente) { pendiente = abajo; previa(abajo, null); return; }
  const a = pendiente;
  pendiente = null;
  const b = ajustar(a, abajo);
  if (igual(a, b)) { previa(null); return; }
  enviar(a, b);
};
letrasEl.addEventListener("pointerup", soltar);
letrasEl.addEventListener("pointercancel", () => { arrastrando = false; pendiente = null; previa(null); });

async function enviar(a, b) {
  if (ocupado) return;
  ocupado = true;
  const texto = letrasEntre(a, b);
  $("#err2").textContent = "";
  try {
    const r = await api("api/marcar", { method: "POST", body: JSON.stringify({ t: token, f1: a.f, c1: a.c, f2: b.f, c2: b.c }) });
    previa(null);
    const sel = $("#sel");
    if (r.encontrada) {
      const e = { palabra: r.palabra, f1: r.f1, c1: r.c1, f2: r.f2, c2: r.c2 };
      tablero.encontradas.push(e);
      marcarHallada(e, tablero.encontradas.length - 1, true);
      $("#nEnc").textContent = r.encontradas;
      sel.className = "sel ok"; sel.textContent = `✓ ${r.palabra}`;
    } else {
      sel.className = "sel mal"; sel.textContent = r.ya ? `${texto}: ya la tienes` : `${texto} ✗`;
      const l = linea(a.f, a.c, b.f, b.c, "mal");
      $("#trazos").append(l);
      setTimeout(() => l.remove(), 450);
    }
    if (r.terminado || r.anulado) await terminar(r);
  } catch (e) {
    previa(null);
    $("#err2").textContent = e.message;
    await refrescarYo();
    if (!yo || !yo.actual) { pararReloj(); jugando = false; tablero = null; pintarYo(); }
  } finally { ocupado = false; }
}

// ---------------------------------------------------------------------------
// Reloj (solo para mirar: el tiempo que vale lo mide el servidor).
function arrancarReloj(transcurrido) {
  t0 = performance.now() - transcurrido;
  cancelAnimationFrame(rafReloj);
  const paso = () => { $("#reloj").textContent = tiempo(performance.now() - t0); rafReloj = requestAnimationFrame(paso); };
  paso();
}
function pararReloj(ms) {
  cancelAnimationFrame(rafReloj);
  if (ms != null) $("#reloj").textContent = tiempo(ms);
}

function jugar(vista) {
  tablero = vista;
  jugando = true; pendiente = null;
  pintarTablero(vista);
  ver("#velo", false); ver("#fin", false); ver("#rendirse", true); ver("#notaJuego", false);
  $("#juego").classList.remove("quieto");
  $("#sel").textContent = "";
  arrancarReloj(vista.transcurrido_ms || 0);
}

async function empezar() {
  if (ocupado) return;
  ocupado = true;
  const btn = $("#empezar"); btn.disabled = true;
  $("#err2").textContent = "";
  try {
    const v = await api("api/empezar", { method: "POST", body: JSON.stringify({ t: token }) });
    await refrescarYo();
    pintarYo();
    jugar(v);
    $("#juego").scrollIntoView({ behavior: QUIETO ? "auto" : "smooth", block: "start" });
  } catch (e) {
    $("#err2").textContent = e.message;
    await refrescarYo(); pintarYo();
  } finally { ocupado = false; btn.disabled = false; }
}

async function terminar(r) {
  jugando = false;
  pararReloj(r.ms);
  ver("#rendirse", false);
  const fin = $("#fin");
  const quedan = r.intentos_restantes ?? 0;
  const otro = quedan > 0 && !estado.cerrado
    ? `<button class="btn" type="button" id="otro">Otro intento (te ${quedan === 1 ? "queda 1" : `quedan ${quedan}`})</button>` : "";
  if (r.valido) {
    fin.className = "fin";
    fin.innerHTML = `<div class="k">${r.record ? "¡LAS 8! · TU MEJOR TIEMPO" : "¡LAS 8!"}</div><div class="t">${tiempo(r.ms)}</div>` +
      `<p>Tu mejor tiempo: <b>${tiempo(r.mejor_ms)}</b> · puesto <b>#${r.puesto}</b></p>${otro}`;
    if (r.record && !QUIETO) celebrar();
  } else {
    fin.className = "fin mal";
    fin.innerHTML = `<div class="k">ESTE INTENTO NO CUENTA</div><div class="t">${esc(r.mensaje || "")}</div>${otro}`;
  }
  fin.hidden = false;
  const b = $("#otro");
  if (b) b.addEventListener("click", () => { fin.hidden = true; tablero = null; empezar(); });
  await refrescarYo();
  pintarYo();
  ver("#velo", false); // el tablero resuelto queda a la vista
  cargarEstado();
  fin.scrollIntoView({ behavior: QUIETO ? "auto" : "smooth", block: "center" });
}

async function refrescarYo() {
  try { yo = await api("api/yo?t=" + encodeURIComponent(token)); } catch (e) { /* se queda con lo local */ }
}

$("#empezar").addEventListener("click", empezar);
$("#rendirse").addEventListener("click", async () => {
  if (ocupado) return;
  ocupado = true;
  try {
    yo = await api("api/rendirse", { method: "POST", body: JSON.stringify({ t: token }) });
    jugando = false; tablero = null; pararReloj(0); ver("#fin", false);
    pintarYo();
  } catch (e) { $("#err2").textContent = e.message; } finally { ocupado = false; }
});

$("#form").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const btn = $("#quiero"); btn.disabled = true; $("#err1").textContent = "";
  try {
    yo = await api("api/inscribir", { method: "POST", body: JSON.stringify({ nombre: $("#nombre").value }) });
    token = yo.t;
    try { localStorage.setItem(LLAVE, token); } catch (e) { /* sin memoria: igual juega */ }
    pintarYo();
    $("#juego").scrollIntoView({ behavior: QUIETO ? "auto" : "smooth", block: "start" });
  } catch (e) {
    $("#err1").textContent = e.message;
  } finally { btn.disabled = false; }
});

(async () => {
  await cargarEstado();
  if (token) {
    try {
      yo = await api("api/yo?t=" + encodeURIComponent(token));
      if (yo.actual) jugar(yo.actual); // vuelve al intento en curso, con su reloj
      pintarYo();
    } catch (e) { token = null; try { localStorage.removeItem(LLAVE); } catch (e2) { /* nada */ } }
  }
  pintarYo();
  setInterval(cargarEstado, 20000);
})();
