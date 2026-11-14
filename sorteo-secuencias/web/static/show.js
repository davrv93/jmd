// El sorteo en vivo: la ruleta, el tablero de los 50 tickets y la revelación
// de cada ganador. Lo usan la página del participante y la de la pantalla.
// Cada giro nuevo que llega del servidor se anima en orden; quien entra tarde
// ve el último giro ya detenido, sin repetir los anteriores.
import { $, esc, dos, SEC, corto, soles, conPremio, numerosDe } from "./comun.js";
import { ruleta } from "./ruleta.js";

const PALETA = ["#ffc857", "#4dd8c8", "#7b8cff", "#ff7eb3", "#b98cff", "#8be38b", "#ffa26b", "#6fd3ff"];

// Tablero de los 50 tickets. opciones: ocupados, mios, elegido, secuencia,
// candidatos, ganados, puntos (círculos de secuencias), alElegir(n).
export function tablero(el, o) {
  const ocupados = new Set(o.ocupados || []), mios = new Set(o.mios || []);
  const cands = new Set(o.candidatos || []), ganados = new Set(o.ganados || []);
  const enSec = new Set(o.secuencia && o.secuencia !== "todos" ? numerosDe(o.secuencia, o.total || 50) : []);
  const ids = ["fibonacci", "euler", "pares", "impares", "primos"];
  const sets = o.puntos ? Object.fromEntries(ids.map((id) => [id, new Set(numerosDe(id))])) : null;
  let html = "";
  for (let n = 1; n <= (o.total || 50); n++) {
    const cl = ["celda"];
    if (ocupados.has(n)) cl.push("ocupado");
    if (mios.has(n)) cl.push("mio");
    if (o.elegido === n) cl.push("elegido");
    if (enSec.has(n)) cl.push("sec");
    if (cands.has(n)) cl.push("cand");
    if (ganados.has(n)) cl.push("gano");
    const puntos = sets ? `<span class="puntos">${ids.filter((id) => sets[id].has(n)).map((id) => `<i style="background:${SEC[id].color}"></i>`).join("")}</span>` : "";
    const libre = o.alElegir && !ocupados.has(n);
    html += `<button type="button" class="${cl.join(" ")}" data-n="${n}" ${libre ? "" : "tabindex=-1"} aria-label="Ticket ${n}${ocupados.has(n) ? " (ocupado)" : ""}" style="${enSec.has(n) ? `--c:${SEC[o.secuencia].color}` : ""}">${dos(n)}${puntos}</button>`;
  }
  el.innerHTML = html;
  if (o.alElegir) {
    el.onclick = (e) => {
      const b = e.target.closest(".celda");
      if (b && !b.classList.contains("ocupado")) o.alElegir(+b.dataset.n);
    };
  }
}

export function crearShow(root, { fondo, alGanador } = {}) {
  root.innerHTML = `
    <div class="show">
      <div class="etapas">
        <span class="ronda" data-ronda>Ronda 1</span>
        <span class="etapa" data-etapa="secuencia"><b>1</b> Secuencia</span>
        <span class="etapa" data-etapa="ticket"><b>2</b> Ticket</span>
        <span class="etapa" data-etapa="premio"><b>3</b> Premio</span>
      </div>
      <div class="escenario">
        <div class="rueda">
          <div class="flecha" aria-hidden="true"></div>
          <canvas data-canvas aria-label="Ruleta"></canvas>
        </div>
        <div class="lado">
          <p class="titular" data-titular>Esperando el primer giro…</p>
          <p class="detalle" data-detalle>El organizador gira cada ruleta en vivo.</p>
          <div class="tablero chico" data-tablero></div>
        </div>
      </div>
      <div class="revela" data-revela hidden></div>
    </div>`;
  const r = ruleta($("[data-canvas]", root));
  let estado = null, mostrados = -1, cola = Promise.resolve();
  let audio = null;
  const sonido = { on: false };

  function tic() {
    if (!sonido.on) return;
    try {
      audio = audio || new AudioContext();
      const o = audio.createOscillator(), g = audio.createGain();
      o.frequency.value = 1400; o.type = "triangle";
      g.gain.setValueAtTime(0.06, audio.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.05);
      o.connect(g).connect(audio.destination); o.start(); o.stop(audio.currentTime + 0.06);
    } catch { /* sin audio */ }
  }

  const premioPorId = (id) => estado.premios.find((p) => p.id === id);
  const secPorId = (id) => estado.secuencias.find((s) => s.id === id) || { id: "todos", nombre: "Todos los tickets", regla: "Ninguna secuencia tenía candidatos: entran todos." };

  // Contexto del paso i: candidatos de su ronda, premios ya entregados, tickets ganadores.
  function contexto(i) {
    const ps = estado.pasos;
    let cands = [];
    const entregados = new Set(), ganados = [];
    for (let k = 0; k < i; k++) {
      if (ps[k].tipo === "secuencia") cands = ps[k].candidatos || [];
      if (ps[k].tipo === "premio") entregados.add(ps[k].premio);
      if (ps[k].tipo === "ticket") ganados.push(ps[k].ticket);
    }
    const quedan = estado.premios.filter((p) => !entregados.has(p.id));
    return { cands, quedan, ganados };
  }

  function gajosDe(p, ctx) {
    if (p.tipo === "secuencia") return estado.secuencias.map((s) => ({ texto: s.nombre, sub: SEC[s.id].simbolo, color: SEC[s.id].color }));
    if (p.tipo === "ticket") return ctx.cands.map((n, k) => ({ texto: dos(n), color: PALETA[k % PALETA.length] }));
    return ctx.quedan.map((q, k) => ({ texto: `${q.descuento}%`, sub: corto(q.curso), color: PALETA[k % PALETA.length] }));
  }
  function indiceDe(p, ctx) {
    if (p.tipo === "secuencia") return Math.max(0, estado.secuencias.findIndex((s) => s.id === p.secuencia));
    if (p.tipo === "ticket") return ctx.cands.indexOf(p.ticket);
    return ctx.quedan.findIndex((q) => q.id === p.premio);
  }

  function marcarEtapa(p) {
    $("[data-ronda]", root).textContent = `Ronda ${p.ronda + 1} de ${estado.ganadores}`;
    for (const e of root.querySelectorAll("[data-etapa]")) {
      e.classList.toggle("activa", e.dataset.etapa === p.tipo);
    }
  }

  function textos(p, ctx, final) {
    const T = $("[data-titular]", root), D = $("[data-detalle]", root);
    if (p.tipo === "secuencia") {
      const s = secPorId(p.secuencia);
      if (!final) { T.textContent = "Girando la ruleta de las secuencias…"; D.textContent = "¿Qué familia de números entra esta vez?"; return; }
      T.innerHTML = `<span style="color:${SEC[s.id].color}">${esc(s.nombre)}</span>`;
      D.textContent = p.vacio
        ? `${s.regla} Ningún ticket en juego es de esta secuencia: la ruleta vuelve a girar.`
        : `${s.regla} ${p.candidatos.length} ${p.candidatos.length === 1 ? "ticket entra" : "tickets entran"} a la ruleta: ${p.candidatos.map(dos).join(" · ")}.`;
    } else if (p.tipo === "ticket") {
      if (!final) { T.textContent = "Girando la ruleta de los tickets…"; D.textContent = `${ctx.cands.length} candidatos.`; return; }
      T.innerHTML = `Ticket <span class="oro">${dos(p.ticket)}</span>`;
      D.innerHTML = `<b>${esc(p.nombre)}</b> gana esta ronda. Ahora, ¿qué premio se lleva?`;
    } else {
      const q = premioPorId(p.premio);
      if (!final) { T.textContent = "Girando la ruleta de los premios…"; D.textContent = `${ctx.quedan.length} premios en juego.`; return; }
      T.innerHTML = `<span class="oro">${q.descuento}%</span> en ${esc(corto(q.curso))}`;
      D.textContent = q.curso;
    }
  }

  function pintarTablero(i) {
    const ps = estado.pasos;
    let sec = null, cands = [];
    const ganados = [];
    for (let k = 0; k <= i && k < ps.length; k++) {
      if (ps[k].tipo === "secuencia") { sec = ps[k].secuencia; cands = ps[k].candidatos || []; }
      if (ps[k].tipo === "ticket") { ganados.push(ps[k].ticket); cands = []; }
    }
    tablero($("[data-tablero]", root), { ocupados: estado.ocupados, mios: estado.yo ? estado.yo.tickets : [], secuencia: sec, candidatos: cands, ganados, total: estado.total });
  }

  function revelar(p, animar) {
    const q = premioPorId(p.premio);
    const nombre = (estado.lista || []).find((t) => t.numero === p.ticket)?.nombre || "";
    const el = $("[data-revela]", root);
    el.innerHTML = `
      <div class="tarjeta-gana">
        <span class="sello">GANADOR · RONDA ${p.ronda + 1}</span>
        <h3>${esc(nombre)}</h3>
        <p class="ticket-gana">Ticket ${dos(p.ticket)}</p>
        <p class="premio-gana"><b>${q.descuento}%</b> de descuento en <b>${esc(q.curso)}</b></p>
        <p class="precio-gana">${soles(q.precio)} → <b>${soles(conPremio(q))}</b> con tu premio</p>
        <button type="button" class="btn sec" data-cerrar>Seguir</button>
      </div>`;
    el.hidden = false;
    el.classList.toggle("anima", animar);
    $("[data-cerrar]", el).onclick = () => { el.hidden = true; };
    if (animar && fondo) fondo.rafaga();
    if (alGanador) alGanador(p);
  }

  async function animarPaso(i) {
    const p = estado.pasos[i], ctx = contexto(i);
    marcarEtapa(p);
    $("[data-revela]", root).hidden = true;
    if (p.tipo === "secuencia" && p.secuencia === "todos") {
      textos(p, ctx, true); pintarTablero(i); return;
    }
    const gajos = gajosDe(p, ctx);
    r.dibujar(gajos);
    textos(p, ctx, false);
    pintarTablero(i - 1);
    await new Promise((ok) => setTimeout(ok, 500));
    if (fondo) fondo.girar(true);
    await r.girarHasta(indiceDe(p, ctx), { alPasar: tic, duracion: p.tipo === "premio" ? 6500 : 5200 });
    if (fondo) fondo.girar(false);
    textos(p, ctx, true);
    pintarTablero(i);
    if (p.tipo === "premio") revelar(p, true);
    await new Promise((ok) => setTimeout(ok, 900));
  }

  function mostrarQuieto(i) {
    if (i < 0) {
      r.dibujar(estado.secuencias.map((s) => ({ texto: s.nombre, sub: SEC[s.id].simbolo, color: SEC[s.id].color })), 0);
      pintarTablero(-1);
      return;
    }
    const p = estado.pasos[i], ctx = contexto(i);
    marcarEtapa(p);
    if (!(p.tipo === "secuencia" && p.secuencia === "todos")) r.dibujar(gajosDe(p, ctx), indiceDe(p, ctx));
    textos(p, ctx, true);
    pintarTablero(i);
  }

  function actualizar(nuevo) {
    estado = nuevo;
    const n = estado.pasos.length;
    if (mostrados < 0) {
      mostrados = n;
      mostrarQuieto(n - 1);
      if (estado.fase === "cerrado") {
        $("[data-titular]", root).textContent = "Elección cerrada";
        $("[data-detalle]", root).textContent = "En unos minutos empieza el sorteo en vivo. No cierres esta página.";
      }
      return;
    }
    for (; mostrados < n; mostrados++) {
      const i = mostrados;
      cola = cola.then(() => animarPaso(i)).catch(() => {});
    }
  }

  return { actualizar, sonido, medir: () => r.medir() };
}
