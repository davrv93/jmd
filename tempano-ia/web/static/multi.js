// Témpano IA · sala de 20 (/clase/multi). La física corre en el servidor (multi.go): aquí solo se manda la
// palanca y se dibuja el estado que llega por SSE, interpolado entre instantes para que se vea fluido.
import { api, $, esc, BASE } from "./comun.js";
import { crearEscena } from "./dibujo.js";
import * as S from "./sonido.js";

const COLORES = [
  ["#ff7a3d", "#c4501b"], ["#3db7ff", "#1f7fbd"], ["#7be08f", "#3b9c52"], ["#ff6fb5", "#c23d81"],
  ["#ffd23d", "#c49a1b"], ["#a66bff", "#6f3fc4"], ["#3dffd8", "#1fbda0"], ["#ff4d4d", "#bd1f1f"],
  ["#9ad13d", "#6a9c1f"], ["#ff9e3d", "#c46f1b"], ["#4d7dff", "#1f45bd"], ["#e07bd8", "#9c3b94"],
  ["#3dd1ff", "#1f93bd"], ["#c8a06b", "#8c6a3b"], ["#ff3d9e", "#bd1f6a"], ["#6bffa6", "#3bc46f"],
  ["#b0b8c8", "#6f7889"], ["#ffe66b", "#c4ad3b"], ["#6b8cff", "#3b55c4"], ["#ff8a8a", "#c45555"],
].map(([b, o]) => ({ bufanda: b, oscura: o }));
const LLAVE = "tempano_t_clase";
const QS = new URLSearchParams(location.search);
const LIVE = { n: (QS.get("n") || "").slice(0, 60), u: (QS.get("u") || "").slice(0, 64) };
const ver = (s, si) => { $(s).hidden = !si; };
const tactil = () => document.body.classList.add("tactil");
if (matchMedia("(pointer: coarse)").matches) tactil();
addEventListener("touchstart", tactil, { once: true, passive: true });

let token = null, yo = { id: 0, clave: "" };
try { token = localStorage.getItem(LLAVE); } catch (e) { token = null; }
if (LIVE.n) $("#nombre").value = LIVE.n;

const escena = crearEscena($("#escena"), { hud: 60 });
addEventListener("resize", () => escena.medir());

// ---------------------------------------------------------------------------
// Entrar: el mismo token de la sala de clase (inscribir) y luego un osito en la sala de 20.
async function inscribir(nombre, cuenta) {
  const r = await api("api/inscribir", { method: "POST", body: JSON.stringify({ nombre, t: token || "", cuenta: cuenta || undefined }) });
  token = r.t;
  try { localStorage.setItem(LLAVE, token); } catch (e) { /* solo esta pestaña */ }
}
async function unir() {
  const r = await api("api/multi/unir", { method: "POST", body: JSON.stringify({ t: token }) });
  yo = { id: r.id, clave: r.clave };
  ver("#cEntrar", false);
  escena.medir();
}
async function arrancar() {
  try {
    if (LIVE.n && LIVE.u) await inscribir(LIVE.n, LIVE.u);
    if (!token) { ver("#cEntrar", true); return; }
    await unir();
  } catch (e) {
    if (/encontramos/.test(e.message)) { token = null; try { localStorage.removeItem(LLAVE); } catch (x) { /* nada */ } }
    $("#eEntrar").textContent = e.message;
    ver("#cEntrar", true);
  }
}
$("#fEntrar").addEventListener("submit", async (ev) => {
  ev.preventDefault(); S.despertar();
  const b = $("#bEntrar"); b.disabled = true; $("#eEntrar").textContent = "";
  try { await inscribir($("#nombre").value); await unir(); } catch (e) { $("#eEntrar").textContent = e.message; }
  b.disabled = false;
});

// ---------------------------------------------------------------------------
// Estado del servidor (SSE) e interpolación.
let prev = null, curr = null, tCurr = 0, ultimoMsg = 0;
const pasos = new Map(); // animación de las patas, local
function conectar() {
  const es = new EventSource(BASE + "api/multi/stream");
  es.onmessage = (ev) => {
    let d; try { d = JSON.parse(ev.data); } catch (e) { return; }
    prev = curr; curr = d; tCurr = performance.now(); ultimoMsg = Date.now();
    for (const e of d.eventos || []) efecto(e, d);
    pintarHud(d);
  };
  es.onerror = () => { $("#hFase").textContent = "Reconectando…"; };
}

function efecto(e, d) {
  const o = (d.osos || []).find((x) => x.id === e.id);
  if (e.tipo === "golpe") { S.golpe(e.fuerza); escena.efecto("golpe", e.x, e.y, e.fuerza); }
  else if (e.tipo === "embestida") { if (e.id === yo.id) S.embestida(); escena.efecto("embestida", e.x, e.y); }
  else if (e.tipo === "grieta") { S.grieta(); escena.efecto("grieta", e.x, e.y); }
  else if (e.tipo === "rayo_aviso") S.aviso();
  else if (e.tipo === "rayo") { S.golpe(900); S.grieta(); escena.efecto("rayo", e.x, e.y); try { navigator.vibrate && navigator.vibrate(80); } catch (x) { /* nada */ } }
  else if (e.tipo === "caida") { S.chapuzon(); escena.efecto("chapuzon", e.x, e.y); if (e.id === yo.id) { try { navigator.vibrate && navigator.vibrate(150); } catch (x) { /* nada */ } } }
  else if (e.tipo === "inicio") { S.cuenta(true); S.ambiente(true); }
  else if (e.tipo === "fin") { const g = (d.osos || []).find((x) => x.j && x.v && x.ca < 0); if (g && g.id === yo.id) S.victoria(); }
  void o;
}

// Modelo para dibujo.js con las posiciones interpoladas.
function modelo(ahora) {
  if (!curr) return null;
  const k = prev ? Math.min(1.2, (ahora - tCurr) / 66) : 1;
  const antes = new Map((prev?.osos || []).map((o) => [o.id, o]));
  const enRonda = curr.fase === "jugando" || curr.fase === "fin";
  let lista = curr.osos.filter((o) => (enRonda ? o.j : true));
  const R = curr.r.reduce((a, b) => a + b, 0) / curr.r.length;
  const osos = lista.map((o, i) => {
    const a = antes.get(o.id);
    let x = o.x, y = o.y;
    if (a && enRonda) { x = a.x + (o.x - a.x) * k; y = a.y + (o.y - a.y) * k; }
    if (!enRonda) { const ang = (i / lista.length) * Math.PI * 2; x = Math.cos(ang) * R * 0.6; y = Math.sin(ang) * R * 0.6; }
    const p = (pasos.get(o.id) || 0) + Math.hypot(o.vx, o.vy) * 0.016 * 0.05; pasos.set(o.id, p);
    return { id: o.id, x, y, vx: o.vx, vy: o.vy, fx: enRonda ? o.fx : -Math.cos((i / lista.length) * Math.PI * 2), fy: enRonda ? o.fy : -Math.sin((i / lista.length) * Math.PI * 2),
      vivo: o.v || !enRonda, cayendo: enRonda ? o.ca : -1, dash: o.d, golpe: o.g, inv: 0, paso: p,
      color: COLORES[o.c % COLORES.length], cpu: o.id !== yo.id, etiqueta: o.n };
  });
  const tInterp = curr.t + (curr.fase === "jugando" ? Math.min(0.1, (ahora - tCurr) / 1000) : 0);
  return { t: tInterp, hielo: { r: Float32Array.from(curr.r), grietas: curr.grietas || [], trozos: curr.trozos || [] },
    osos, rayos: curr.rayos || [], etiquetas: true, eventos: [] };
}

function pintarHud(d) {
  const mio = d.osos.find((o) => o.id === yo.id);
  const fases = { espera: "⏳ Esperando ositos", cuenta: "🔔 ¡Ya empieza!", jugando: "🐻‍❄️ ¡A empujar!", fin: "🏁 Fin de ronda" };
  $("#hFase").textContent = fases[d.fase] || d.fase;
  $("#hGente").innerHTML = `<b>${d.conectados}</b> / ${d.max} ositos`;
  $("#hReloj").textContent = d.fase === "jugando" ? `⏱ ${Math.max(0, Math.ceil(d.dur - d.t))} s` : "";
  const enPie = d.osos.filter((o) => o.j && o.v && o.ca < 0).length;
  if (d.fase === "jugando") $("#hReloj").textContent += ` · en pie ${enPie}`;
  // tabla
  const filas = [...d.osos].sort((a, b) => b.w - a.w || a.n.localeCompare(b.n));
  $("#lista").innerHTML = filas.map((o) => `<li class="${o.id === yo.id ? "yo" : ""} ${d.fase === "jugando" && o.j && !(o.v && o.ca < 0) ? "fuera" : ""}">${esc(o.n)}${o.w ? ` · 🏆${o.w}` : ""}</li>`).join("");
  ver("#tabla", filas.length > 0);
  // cartel central
  if (!yo.clave) return;
  if (d.fase === "espera") msg("Sala de 20", d.conectados < 2 ? "1/2" : "", d.conectados < 2 ? "Esperando al menos a otro osito… Comparte el enlace: jmd-learn.online/tempano-ia/clase/multi" : "");
  else if (d.fase === "cuenta") msg("Empieza en", String(Math.max(1, Math.ceil(d.reloj))), `${d.conectados} ositos en la sala. Rayos ⚡ activados.`);
  else if (d.fase === "jugando") {
    if (mio && mio.j && !(mio.v && mio.ca < 0)) msg("💦 Caíste al agua", "", "Mira la ronda: entras en la siguiente.");
    else if (mio && !mio.j) msg("Llegaste a mitad de ronda", "👀", "Entras en la siguiente ronda.");
    else ver("#cMsg", false);
  } else if (d.fase === "fin") msg("Ganador", "🏆", esc(d.ganador || "") + ` · Nueva ronda en ${Math.max(0, Math.ceil(d.reloj))} s`);
}
function msg(k, t, p) {
  $("#mK").textContent = k; $("#mT").textContent = t; ver("#mT", !!t); $("#mP").innerHTML = p; ver("#cMsg", true);
}

// ---------------------------------------------------------------------------
// Controles: teclado, palanca táctil y embestida. Se mandan ~15 veces por segundo.
const teclas = new Set();
const palanca = { activa: false, id: null, ox: 0, oy: 0, x: 0, y: 0 };
let quiereDash = false, ultimoEnvio = 0, ultimo = "";
const JUEGO = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "KeyA", "KeyD", "KeyW", "KeyS", "Space"]);
addEventListener("keydown", (e) => {
  if (e.target && e.target.tagName === "INPUT") return;
  if (!JUEGO.has(e.code)) return;
  e.preventDefault(); S.despertar();
  if (e.code === "Space") { if (!e.repeat) quiereDash = true; } else teclas.add(e.code);
});
addEventListener("keyup", (e) => teclas.delete(e.code));
addEventListener("blur", () => teclas.clear());
const zona = $("#zona"), base = $("#palanca"), perilla = $("#perilla"), RADIO = 50;
zona.addEventListener("pointerdown", (e) => {
  if (palanca.activa) return;
  tactil(); S.despertar();
  palanca.activa = true; palanca.id = e.pointerId; palanca.ox = e.clientX; palanca.oy = e.clientY;
  const r = zona.getBoundingClientRect();
  base.style.left = `${e.clientX - r.left - 55}px`; base.style.top = `${e.clientY - r.top - 55}px`; base.style.bottom = "auto";
  zona.setPointerCapture(e.pointerId); e.preventDefault();
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
  perilla.style.transform = ""; base.style.left = ""; base.style.top = ""; base.style.bottom = "";
};
zona.addEventListener("pointerup", soltar); zona.addEventListener("pointercancel", soltar);
$("#embestir").addEventListener("pointerdown", (e) => { e.preventDefault(); S.despertar(); quiereDash = true; });

function control() {
  let x = 0, y = 0;
  if (palanca.activa) { x = palanca.x; y = palanca.y; }
  else {
    if (teclas.has("ArrowLeft") || teclas.has("KeyA")) x -= 1;
    if (teclas.has("ArrowRight") || teclas.has("KeyD")) x += 1;
    if (teclas.has("ArrowUp") || teclas.has("KeyW")) y -= 1;
    if (teclas.has("ArrowDown") || teclas.has("KeyS")) y += 1;
  }
  return { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 };
}
async function enviar(ahora) {
  if (!yo.clave) return;
  const c = control(), firma = c.x + "," + c.y;
  const toca = quiereDash || firma !== ultimo ? ahora - ultimoEnvio > 60 : ahora - ultimoEnvio > 1500;
  if (!toca) return;
  ultimoEnvio = ahora; ultimo = firma;
  const d = quiereDash; quiereDash = false;
  try {
    const r = await fetch(BASE + "api/multi/control", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ k: yo.clave, x: c.x, y: c.y, d }) });
    if (r.status === 404) { yo.clave = ""; arrancar(); }
  } catch (e) { /* la red falló: se reintenta en el siguiente envío */ }
}

function cuadro(ms) {
  const m = modelo(performance.now());
  if (m) escena.dibujar(m, ms / 1000);
  enviar(ms);
  if (ultimoMsg && Date.now() - ultimoMsg > 5000) $("#hFase").textContent = "Reconectando…";
  requestAnimationFrame(cuadro);
}

conectar();
arrancar();
requestAnimationFrame(cuadro);
