// Las muestras de lo que se construye en el curso. Cada una devuelve
// { pausar, reanudar } para que solo corra la que está a la vista.
import { $, esc } from "./comun.js";

const reducido = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const fmt = (n, d = 0) => Number(n).toLocaleString("es-PE", { minimumFractionDigits: d, maximumFractionDigits: d });

// Bucle de animación que se puede pausar.
function bucle(paso) {
  let id = 0, activo = false;
  const marco = (t) => { if (!activo) return; paso(t); id = requestAnimationFrame(marco); };
  return {
    reanudar() { if (!activo) { activo = true; id = requestAnimationFrame(marco); } },
    pausar() { activo = false; cancelAnimationFrame(id); },
  };
}

// Audio compartido: se crea en el primer toque (política de autoplay).
let ac = null, salida = null;
function audio() {
  if (!ac) {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    const comp = ac.createDynamicsCompressor();
    const vol = ac.createGain();
    vol.gain.value = .8;
    // Reverb: respuesta al impulso de ruido con caída exponencial.
    const largo = ac.sampleRate * 2.2, ir = ac.createBuffer(2, largo, ac.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < largo; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / largo, 3);
    }
    const rev = ac.createConvolver(); rev.buffer = ir;
    const humedo = ac.createGain(); humedo.gain.value = .28;
    salida = ac.createGain();
    salida.connect(comp); salida.connect(rev); rev.connect(humedo); humedo.connect(comp);
    comp.connect(vol); vol.connect(ac.destination);
  }
  if (ac.state === "suspended") ac.resume();
  return ac;
}

function ruido(seg) {
  const b = ac.createBuffer(1, Math.max(1, ac.sampleRate * seg), ac.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const s = ac.createBufferSource(); s.buffer = b;
  return s;
}

// ================= 1. Tablero del colegio =================
const DIM = {
  grado: ["1°", "2°", "3°", "4°", "5°"],
  seccion: ["A", "B"],
  curso: ["Matemática", "Comunicación", "Ciencia", "Inglés"],
  bimestre: ["I", "II", "III"],
};
const NOMBRE = { grado: "Grado", seccion: "Sección", curso: "Curso", bimestre: "Bimestre" };
const MEDIDA = { promedio: "Promedio", asistencia: "Asistencia", aprobados: "Aprobados" };

// Datos sintéticos, deterministas: todos ven lo mismo. 30 alumnos por aula.
const REG = [];
{
  let s = 11;
  const azar = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const dif = { Matemática: -1.4, Comunicación: .6, Ciencia: -.3, Inglés: .2 };
  DIM.grado.forEach((grado, gi) => DIM.seccion.forEach((seccion, si) => DIM.curso.forEach((curso) => DIM.bimestre.forEach((bimestre, bi) => {
    const promedio = Math.min(19, Math.max(9, 13 + dif[curso] + bi * .45 - gi * .2 + si * .3 + (azar() - .5) * 2.2));
    const asistencia = Math.min(99, 86 + bi * 1.5 + (azar() - .5) * 8);
    const aprobados = Math.round(30 * Math.min(.98, Math.max(.4, (promedio - 7) / 9.5)));
    REG.push({ grado, seccion, curso, bimestre, n: 30, promedio, asistencia, aprobados });
  }))));
}

// Paleta categórica validada (skill dataviz, orden fijo): un color por curso.
const SERIE = { Matemática: "#2a78d6", Comunicación: "#eb6834", Ciencia: "#1baf7a", Inglés: "#eda100" };
const ESCALA = { promedio: [0, 20], asistencia: [0, 100], aprobados: null };

const valor = (r, medida) => medida === "aprobados" ? r.aprobados / r.n * 100 : r[medida];
// Promedio ponderado por alumnos; «aprobados» se muestra como % del aula.
function medir(filas, medida) {
  if (!filas.length) return 0;
  const n = filas.reduce((a, r) => a + r.n, 0);
  return filas.reduce((a, r) => a + valor(r, medida) * r.n, 0) / n;
}
const verMedida = (v, medida) => medida === "promedio" ? fmt(v, 1) : fmt(v, 1) + " %";

function chispa(vals, ancho = 84, alto = 26) {
  const min = Math.min(...vals), max = Math.max(...vals), r = max - min || 1;
  const pts = vals.map((v, i) => [i / (vals.length - 1) * (ancho - 4) + 2, alto - 3 - (v - min) / r * (alto - 8)]);
  const d = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const u = pts[pts.length - 1];
  return `<svg viewBox="0 0 ${ancho} ${alto}" width="${ancho}" height="${alto}" aria-hidden="true"><path d="${d}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${u[0]}" cy="${u[1]}" r="3" fill="currentColor"/></svg>`;
}

export function tablero(el) {
  const f = { bimestre: "todos", seccion: "todas", medida: "promedio", filas: "grado", cols: "curso" };
  el.innerHTML = `
    <div class="bi">
      <div class="bi-filtros">
        <div class="seg" data-f="bimestre" role="group" aria-label="Bimestre">
          <button data-v="todos" class="on">Año</button>${DIM.bimestre.map((b) => `<button data-v="${b}">Bim. ${b}</button>`).join("")}
        </div>
        <div class="seg" data-f="seccion" role="group" aria-label="Sección">
          <button data-v="todas" class="on">Todas</button>${DIM.seccion.map((s) => `<button data-v="${s}">Secc. ${s}</button>`).join("")}
        </div>
        <div class="seg" data-f="medida" role="group" aria-label="Medida">
          ${Object.keys(MEDIDA).map((m, i) => `<button data-v="${m}" class="${i ? "" : "on"}">${MEDIDA[m]}</button>`).join("")}
        </div>
      </div>
      <div class="bi-kpis"></div>
      <div class="bi-cuerpo">
        <section class="panel bi-graf">
          <header><h4>Por grado y curso</h4><div class="ley">${DIM.curso.map((c) => `<span><i style="background:${SERIE[c]}"></i>${c}</span>`).join("")}<span class="umb"><i class="raya"></i>Aprobación (11)</span></div></header>
          <div class="graf"></div>
          <div class="tip" hidden></div>
        </section>
        <section class="panel bi-pivote">
          <header><h4>Tabla dinámica</h4>
            <div class="pv-ctl">
              <label>Filas <select data-k="filas"></select></label>
              <label>Columnas <select data-k="cols"></select></label>
            </div>
          </header>
          <div class="pv-tabla"></div>
          <div class="pv-det"><p>Toca una celda para ver el detalle.</p></div>
        </section>
      </div>
    </div>`;

  const filtrar = (extra = () => true) => REG.filter((r) =>
    (f.bimestre === "todos" || r.bimestre === f.bimestre) && (f.seccion === "todas" || r.seccion === f.seccion) && extra(r));

  function kpis() {
    const base = REG.filter((r) => f.seccion === "todas" || r.seccion === f.seccion);
    const porBim = (m) => DIM.bimestre.map((b) => medir(base.filter((r) => r.bimestre === b), m));
    const sel = filtrar();
    const riesgo = sel.filter((r) => r.promedio < 11).length;
    const alumnos = (f.seccion === "todas" ? 10 : 5) * 30;
    const tarjetas = [
      { t: "Promedio general", v: fmt(medir(sel, "promedio"), 1), s: "sobre 20", c: porBim("promedio") },
      { t: "Asistencia", v: fmt(medir(sel, "asistencia"), 1) + " %", s: "de las clases", c: porBim("asistencia") },
      { t: "Aprobados", v: fmt(medir(sel, "aprobados"), 0) + " %", s: "nota ≥ 11", c: porBim("aprobados") },
      { t: "Alumnos", v: fmt(alumnos), s: riesgo ? `${riesgo} aulas-curso en riesgo` : "sin aulas en riesgo", c: null },
    ];
    $(".bi-kpis", el).innerHTML = tarjetas.map((k) => `<div class="kpi"><span>${k.t}</span>
      <div class="kpi-v"><b>${k.v}</b>${k.c ? `<em title="Bimestres I a III">${chispa(k.c, 64, 24)}</em>` : ""}</div><small>${k.s}</small></div>`).join("");
  }

  // Barras agrupadas: grado en el eje, un color por curso, una sola escala.
  // El gráfico se dibuja al tamaño real de su caja: el texto no se encoge.
  function grafico(animar) {
    const caja = $(".graf", el).getBoundingClientRect();
    const W = Math.max(300, Math.round(caja.width)), H = Math.max(220, Math.round(caja.height)), m = { l: 34, r: 8, t: 14, b: 30 };
    const esc = ESCALA[f.medida] || [0, 100];
    const iw = W - m.l - m.r, ih = H - m.t - m.b;
    const gw = iw / DIM.grado.length, bw = Math.min(30, (gw - 18) / DIM.curso.length - 2);
    const y = (v) => m.t + ih - (v - esc[0]) / (esc[1] - esc[0]) * ih;
    const marcas = f.medida === "promedio" ? [0, 5, 10, 15, 20] : [0, 25, 50, 75, 100];
    let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" class="${animar ? "crece" : ""}" role="img" aria-label="Barras por grado y curso">`;
    s += marcas.map((t) => `<line x1="${m.l}" x2="${W - m.r}" y1="${y(t)}" y2="${y(t)}" class="rej"/><text x="${m.l - 8}" y="${y(t) + 4}" text-anchor="end">${t}</text>`).join("");
    if (f.medida === "promedio") s += `<line x1="${m.l}" x2="${W - m.r}" y1="${y(11)}" y2="${y(11)}" class="umbral"/>`;
    $(".umb", el).hidden = f.medida !== "promedio";
    DIM.grado.forEach((g, gi) => {
      const x0 = m.l + gi * gw + (gw - DIM.curso.length * (bw + 2)) / 2;
      DIM.curso.forEach((c, ci) => {
        const v = medir(filtrar((r) => r.grado === g && r.curso === c), f.medida);
        const x = x0 + ci * (bw + 2), yy = y(v), h = m.t + ih - yy;
        s += `<path d="M${x} ${m.t + ih}V${yy + 4}q0 -4 4 -4h${bw - 8}q4 0 4 4V${m.t + ih}z" fill="${SERIE[c]}" style="--d:${(gi * 4 + ci) * 22}ms"
          data-tip="${g} · ${c}|${verMedida(v, f.medida)}" tabindex="0"/>`;
        void h;
      });
      s += `<text x="${m.l + gi * gw + gw / 2}" y="${H - 8}" text-anchor="middle" class="eje-x">${g} grado</text>`;
    });
    $(".graf", el).innerHTML = s + "</svg>";
  }

  function pivote() {
    if (f.filas === f.cols) f.cols = Object.keys(DIM).find((k) => k !== f.filas && (f.bimestre === "todos" || k !== "bimestre"));
    const opciones = (val) => Object.keys(NOMBRE).map((k) => `<option value="${k}" ${k === val ? "selected" : ""}>${NOMBRE[k]}</option>`).join("");
    $("[data-k=filas]", el).innerHTML = opciones(f.filas);
    $("[data-k=cols]", el).innerHTML = opciones(f.cols);
    const vals = [];
    const celdas = DIM[f.filas].map((a) => DIM[f.cols].map((b) => {
      const v = medir(filtrar((r) => r[f.filas] === a && r[f.cols] === b), f.medida);
      vals.push(v);
      return v;
    }));
    const lo = Math.min(...vals.filter((v) => v > 0)), hi = Math.max(...vals);
    const corto = (v) => ({ Matemática: "Mat.", Comunicación: "Com.", Ciencia: "Cien.", Inglés: "Ingl." })[v] || v;
    let h = `<table><thead><tr><th></th>${DIM[f.cols].map((v) => `<th title="${esc(v)}">${esc(corto(v))}</th>`).join("")}</tr></thead><tbody>`;
    DIM[f.filas].forEach((a, i) => {
      h += `<tr><th title="${esc(a)}">${esc(corto(a))}</th>` + DIM[f.cols].map((b, j) => {
        const v = celdas[i][j], k = hi > lo ? (v - lo) / (hi - lo) : .5;
        return `<td data-a="${esc(a)}" data-b="${esc(b)}" style="--k:${k.toFixed(2)}" class="${k > .62 ? "osc" : ""}" tabindex="0">${v ? verMedida(v, f.medida) : "–"}</td>`;
      }).join("") + "</tr>";
    });
    $(".pv-tabla", el).innerHTML = h + "</tbody></table>";
  }

  function detalle(a, b) {
    const sel = filtrar((r) => r[f.filas] === a && r[f.cols] === b);
    const porSec = DIM.seccion.map((s) => [s, medir(sel.filter((r) => r.seccion === s), f.medida)]).filter((x) => x[1]);
    const riesgo = sel.filter((r) => r.promedio < 11).length;
    $(".pv-det", el).innerHTML = `<p><b>${NOMBRE[f.filas]} ${esc(a)} · ${NOMBRE[f.cols]} ${esc(b)}</b></p>
      <div class="det-fila">${porSec.map(([s, v]) => `<span>Sección ${s}<b>${verMedida(v, f.medida)}</b></span>`).join("")}
      <span>Registros<b>${sel.length}</b></span><span>En riesgo<b class="${riesgo ? "mal" : "bien"}">${riesgo ? riesgo : "ninguno"}</b></span></div>`;
  }

  function todo(animar) { kpis(); grafico(animar); pivote(); }

  el.addEventListener("click", (e) => {
    const b = e.target.closest(".seg button");
    if (b) {
      const g = b.parentElement;
      g.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b));
      f[g.dataset.f] = b.dataset.v;
      if (g.dataset.f === "bimestre" && f.bimestre !== "todos" && (f.filas === "bimestre" || f.cols === "bimestre")) {
        if (f.filas === "bimestre") f.filas = "seccion"; else f.cols = "seccion";
      }
      todo(true);
      return;
    }
    const td = e.target.closest("td[data-a]");
    if (td) {
      el.querySelectorAll("td.sel").forEach((x) => x.classList.remove("sel"));
      td.classList.add("sel");
      detalle(td.dataset.a, td.dataset.b);
    }
  });
  el.addEventListener("change", (e) => { const k = e.target.dataset.k; if (k) { f[k] = e.target.value; pivote(); } });

  // Tooltip por barra (ratón, dedo o teclado).
  const tip = $(".tip", el), caja = $(".bi-graf", el);
  const mostrarTip = (t) => {
    const d = t.dataset.tip;
    if (!d) { tip.hidden = true; return; }
    const [a, v] = d.split("|");
    tip.innerHTML = `${esc(a)}<b>${esc(v)}</b>`;
    const r = t.getBoundingClientRect(), c = caja.getBoundingClientRect();
    tip.style.left = Math.min(c.width - 150, Math.max(4, r.left - c.left + r.width / 2 - 70)) + "px";
    tip.style.top = (r.top - c.top - 52) + "px";
    tip.hidden = false;
  };
  caja.addEventListener("pointerover", (e) => mostrarTip(e.target));
  caja.addEventListener("pointerleave", () => { tip.hidden = true; });
  caja.addEventListener("focusin", (e) => mostrarTip(e.target));

  todo(true);
  let previo = 0;
  new ResizeObserver(([x]) => { const w = Math.round(x.contentRect.width + x.contentRect.height); if (w !== previo) { previo = w; grafico(false); } }).observe($(".graf", el));
  return { pausar() {}, reanudar() {} };
}

// ================= 2. Laboratorio de rendimiento =================
// Tamaños MEDIDOS (no inventados): la misma respuesta JSON de 300 alumnos,
// comprimida con Node v24.2.0, zlib.gzipSync nivel 9 y
// zlib.brotliCompressSync calidad 11. Script: scratchpad/medir/medir.mjs.
const PESOS = [
  { k: "Sin compresión", enc: "identity", b: 277329, c: "#9a8f86" },
  { k: "gzip", enc: "gzip", b: 16595, c: "#2a78d6" },
  { k: "Brotli", enc: "br", b: 12331, c: "#d97757" },
];
// Redes simuladas: ancho de banda y latencia de ida y vuelta fijos.
const REDES = [
  { k: "3G", kbps: 750, rtt: 300 },
  { k: "4G", kbps: 9000, rtt: 70 },
  { k: "Wi-Fi", kbps: 40000, rtt: 20 },
];

export function compresion(el) {
  let red = 0, corriendo = false, inicio = 0;
  const kb = (b) => fmt(b / 1024, 1) + " KB";
  // Tiempo total = TTFB (2 RTT: conexión + petición) + bytes / ancho de banda.
  const tiempos = (r) => PESOS.map((p) => { const ttfb = REDES[r].rtt * 2; return { ttfb, total: ttfb + (p.b * 8) / REDES[r].kbps }; });
  const ms = (t) => t >= 1000 ? fmt(t / 1000, 2) + " s" : fmt(t) + " ms";

  el.innerHTML = `
    <div class="lab">
      <div class="lab-barra">
        <div class="seg" data-k="red" role="group" aria-label="Red simulada">${REDES.map((r, i) => `<button data-v="${i}" class="${i ? "" : "on"}">${r.k}</button>`).join("")}</div>
        <span class="lab-nota"></span>
        <button class="btn-acc" data-k="go">Ejecutar prueba</button>
      </div>
      <div class="lab-cuerpo">
        <section class="panel lab-red">
          <header><h4>Red</h4><span class="sutil">GET /api/alumnos · 300 registros</span></header>
          <table class="cascada">
            <thead><tr><th>Codificación</th><th class="num">Tamaño</th><th class="num">Tiempo</th></tr></thead>
            <tbody>${PESOS.map((p, i) => `<tr data-i="${i}"><td><i style="background:${p.c}"></i>${p.k}<small>${p.enc}</small></td>
              <td class="num">${kb(p.b)}</td><td class="num t">–</td></tr>`).join("")}</tbody>
          </table>
          <div class="linea" aria-label="Cascada de la descarga">
            ${PESOS.map((p) => `<div class="l-fila"><span>${p.k}</span><div class="pista"><span class="ttfb"></span><span class="baja" style="background:${p.c}"></span></div></div>`).join("")}
            <div class="eje"></div>
            <p class="sutil"><i class="clave-ttfb"></i>Espera del servidor <i class="clave-baja"></i>Descarga</p>
          </div>
          <div class="mosaico" aria-label="Cada cuadro equivale a 4 KB">${PESOS.map((p) => `<div><span>${p.k}</span><p>${"<i></i>".repeat(Math.max(1, Math.round(p.b / 4096)))}</p></div>`).join("")}</div>
        </section>
        <section class="panel lab-res">
          <header><h4>Resultado</h4></header>
          <div class="grande"><b>${fmt((1 - PESOS[2].b / PESOS[0].b) * 100, 1)} %</b><span>menos bytes con Brotli</span></div>
          <dl>
            <div><dt>Sin compresión</dt><dd>${kb(PESOS[0].b)}</dd></div>
            <div><dt>gzip</dt><dd>${kb(PESOS[1].b)} <em>−${fmt((1 - PESOS[1].b / PESOS[0].b) * 100, 1)} %</em></dd></div>
            <div><dt>Brotli</dt><dd>${kb(PESOS[2].b)} <em>−${fmt((1 - PESOS[2].b / PESOS[0].b) * 100, 1)} %</em></dd></div>
          </dl>
          <div class="ganancia"><span>Tiempo ahorrado en esta red</span><b class="ahorro">–</b></div>
          <p class="sutil">Tamaños medidos con zlib. Tiempos simulados con la red elegida.</p>
        </section>
      </div>
    </div>`;

  const filas = [...el.querySelectorAll(".cascada tbody tr")], pistas = [...el.querySelectorAll(".l-fila .pista")];
  function preparar() {
    const t = tiempos(red), max = Math.max(...t.map((x) => x.total));
    $(".lab-nota", el).textContent = `${fmt(REDES[red].kbps / 1000, REDES[red].kbps < 1000 ? 2 : 0)} Mbps · RTT ${REDES[red].rtt} ms (simulado)`;
    filas.forEach((f, i) => {
      $(".ttfb", pistas[i]).style.width = (t[i].ttfb / max * 100) + "%";
      $(".baja", pistas[i]).style.left = (t[i].ttfb / max * 100) + "%";
      $(".baja", pistas[i]).style.width = "0%";
      $(".t", f).textContent = "–";
      f.classList.remove("lista");
    });
    // Eje de tiempo con 5 marcas redondas.
    const paso = [50, 100, 200, 250, 500, 1000][[50, 100, 200, 250, 500, 1000].findIndex((x) => max / x <= 5)] || 1000;
    let marcas = "";
    for (let v = 0; v <= max; v += paso) marcas += `<span style="left:${v / max * 100}%">${ms(v)}</span>`;
    $(".eje", el).innerHTML = marcas;
    $(".ahorro", el).textContent = ms(t[0].total - t[2].total);
    return { t, max };
  }
  let plan = preparar();
  const anim = bucle((ahora) => {
    if (!corriendo) return;
    if (!inicio) inicio = ahora;
    // Con 3G la prueba real dura ~3 s; se reproduce en tiempo real hasta 3,2 s.
    const escala = Math.max(1, plan.max / 3200);
    const t = (ahora - inicio) * escala;
    let listas = 0;
    filas.forEach((f, i) => {
      const x = plan.t[i], p = Math.min(1, Math.max(0, (t - x.ttfb) / (x.total - x.ttfb)));
      $(".baja", pistas[i]).style.width = (p * (x.total - x.ttfb) / plan.max * 100) + "%";
      $(".t", f).textContent = t >= x.total ? ms(x.total) : ms(Math.min(t, x.total));
      if (t >= x.total) { f.classList.add("lista"); listas++; }
    });
    if (listas === filas.length) { corriendo = false; $("[data-k=go]", el).disabled = false; }
  });
  function correr() {
    plan = preparar();
    inicio = 0; corriendo = true;
    $("[data-k=go]", el).disabled = true;
    if (reducido()) { inicio = -1e9; }
    anim.reanudar();
  }
  el.addEventListener("click", (e) => {
    const b = e.target.closest("[data-k=red] button");
    if (b) {
      el.querySelectorAll("[data-k=red] button").forEach((x) => x.classList.toggle("on", x === b));
      red = +b.dataset.v; correr(); return;
    }
    if (e.target.closest("[data-k=go]")) correr();
  });
  let primera = true;
  return {
    pausar: anim.pausar,
    reanudar() { if (primera) { primera = false; setTimeout(correr, 300); } else anim.reanudar(); },
  };
}

// ================= 3a. Corazón anatómico =================
// Estudio de luz para reflejos: una esfera con degradado y tres paneles
// luminosos, prefiltrada con PMREM (no hace falta HDR externo en r128).
function estudio(THREE, rend) {
  const s = new THREE.Scene();
  const geo = new THREE.SphereGeometry(20, 32, 16);
  const col = [], c = new THREE.Color();
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / 20;
    c.setRGB(.28 + y * .22, .26 + y * .2, .25 + y * .19);
    col.push(c.r, c.g, c.b);
  }
  geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  s.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  const panel = (w, h, x, y, z, i) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(i, i * .97, i * .93) }));
    m.position.set(x, y, z); m.lookAt(0, 0, 0); s.add(m);
  };
  panel(14, 6, 0, 14, 4, 2.2); panel(6, 10, -14, 2, 6, 1.1); panel(5, 8, 13, 0, -8, .8);
  const pm = new THREE.PMREMGenerator(rend);
  const env = pm.fromScene(s, .04).texture;
  pm.dispose();
  return env;
}

// Forma del corazón: se deforma una esfera (base ancha arriba, ápice abajo a
// la izquierda, surco entre aurículas) y se usa la misma función para pegar
// las arterias coronarias sobre la superficie.
function deformar(v) {
  let { x, y, z } = v;
  if (y < 0) { const k = 1 + y * .58; x *= k; z *= k; x += y * y * .28; y *= 1.25; }
  else { x *= 1 + y * .18; y *= .92; y -= .2 * Math.exp(-(x * x) / .05) * y; }
  z *= .78;
  return v.set(x, y, z);
}

export function corazon(el) {
  const THREE = window.THREE;
  if (!THREE) { el.innerHTML = '<p class="sutil">No se pudo cargar el motor 3D.</p>'; return { pausar() {}, reanudar() {} }; }
  el.innerHTML = `<div class="vis-lienzo"></div>
    <div class="vis-hud">
      <div class="vis-dato"><span>Frecuencia</span><b><i class="lat"></i><em class="bpm">72</em> lpm</b></div>
      <div class="vis-ctl">
        <button data-k="latir" class="on" aria-pressed="true">Latido</button>
        <button data-k="malla" aria-pressed="false">Malla</button>
        <button data-k="vista">Restablecer vista</button>
      </div>
    </div>
    <ul class="vis-etq" aria-label="Partes">
      <li data-p="aorta">Aorta</li><li data-p="pulmonar">Tronco pulmonar</li><li data-p="cava">Vena cava superior</li><li data-p="vi">Ventrículo izquierdo</li>
    </ul>`;
  const caja = $(".vis-lienzo", el);
  const rend = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  rend.setPixelRatio(Math.min(devicePixelRatio, 2));
  rend.outputEncoding = THREE.sRGBEncoding;
  rend.toneMapping = THREE.ACESFilmicToneMapping;
  rend.toneMappingExposure = .95;
  caja.append(rend.domElement);
  const escena = new THREE.Scene();
  escena.environment = estudio(THREE, rend);
  const cam = new THREE.PerspectiveCamera(32, 1, .1, 100);

  const grupo = new THREE.Group();
  const geo = new THREE.SphereGeometry(1, 96, 64);
  const v = new THREE.Vector3(), p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { deformar(v.fromBufferAttribute(p, i)); p.setXYZ(i, v.x, v.y, v.z); }
  geo.computeVertexNormals();
  const lin = (h) => new THREE.Color(h).convertSRGBToLinear();
  const musculo = new THREE.MeshPhysicalMaterial({ color: lin(0x9a2c1f), roughness: .48, metalness: 0, clearcoat: .6, clearcoatRoughness: .3, envMapIntensity: .7 });
  const cuerpo = new THREE.Mesh(geo, musculo);
  grupo.add(cuerpo);

  const tubo = (pts, r, color) => {
    const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((q) => new THREE.Vector3(...q))), 64, r, 20, false),
      new THREE.MeshPhysicalMaterial({ color: lin(color), roughness: .4, clearcoat: .6, clearcoatRoughness: .3, envMapIntensity: .7 }));
    grupo.add(m);
    return m;
  };
  const aorta = tubo([[.08, .55, 0], [.12, 1.15, 0], [-.05, 1.55, -.1], [-.55, 1.5, -.3], [-.75, 1.05, -.45], [-.78, .4, -.5]], .2, 0xa33a28);
  const pulmonar = tubo([[.3, .45, .32], [.38, 1.0, .3], [.62, 1.25, .1], [.95, 1.2, -.12]], .17, 0x5b3f86);
  const cava = tubo([[-.42, .45, -.15], [-.45, 1.0, -.15], [-.46, 1.45, -.15]], .14, 0x2f4a8a);
  // Coronarias: curvas sobre la superficie deformada.
  const surco = (desde, hasta, n, r, color) => {
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, th = desde[0] + (hasta[0] - desde[0]) * t, ph = desde[1] + (hasta[1] - desde[1]) * t;
      const q = new THREE.Vector3(Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th));
      pts.push(deformar(q).multiplyScalar(1.012).toArray());
    }
    tubo(pts, r, color);
  };
  surco([1.7, .9], [1.3, 2.7], 30, .025, 0xc9563f);
  surco([1.2, 1.1], [.4, 2.3], 30, .022, 0xc9563f);
  surco([2.2, 1.0], [2.6, 2.5], 30, .02, 0x4a5aa0);
  grupo.rotation.z = -.32;
  escena.add(grupo);
  // Sombra de contacto: un degradado radial suave bajo el modelo.
  const sombra = document.createElement("canvas"); sombra.width = sombra.height = 128;
  const sc = sombra.getContext("2d"), sg = sc.createRadialGradient(64, 64, 0, 64, 64, 64);
  sg.addColorStop(0, "rgba(40,20,10,.35)"); sg.addColorStop(1, "rgba(40,20,10,0)");
  sc.fillStyle = sg; sc.fillRect(0, 0, 128, 128);
  const piso = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sombra), transparent: true, depthWrite: false }));
  piso.rotation.x = -Math.PI / 2; piso.position.y = -1.8;
  escena.add(piso);
  const luz = new THREE.DirectionalLight(0xfff4ea, 1.6); luz.position.set(3, 5, 4); escena.add(luz);
  const contra = new THREE.DirectionalLight(0xffd9c4, .8); contra.position.set(-4, 2, -5); escena.add(contra);
  escena.add(new THREE.AmbientLight(0xffffff, .15));

  // Órbita con inercia (arrastre) y rueda o pellizco para el zoom.
  const orb = { az: .5, el: .12, dist: 7.6, vaz: 0, vel: 0 };
  let arr = null;
  const lienzo = rend.domElement;
  lienzo.style.touchAction = "pan-y";
  lienzo.addEventListener("pointerdown", (e) => { arr = { x: e.clientX, y: e.clientY }; lienzo.setPointerCapture(e.pointerId); caja.classList.add("arrastra"); });
  lienzo.addEventListener("pointermove", (e) => {
    if (!arr) return;
    orb.vaz = (e.clientX - arr.x) * .008; orb.vel = (e.clientY - arr.y) * .006;
    orb.az -= orb.vaz; orb.el = Math.max(-.6, Math.min(.9, orb.el + orb.vel));
    arr = { x: e.clientX, y: e.clientY };
  });
  const soltar = () => { arr = null; caja.classList.remove("arrastra"); };
  lienzo.addEventListener("pointerup", soltar); lienzo.addEventListener("pointercancel", soltar);
  lienzo.addEventListener("wheel", (e) => { e.preventDefault(); orb.dist = Math.max(4.2, Math.min(11, orb.dist + e.deltaY * .004)); }, { passive: false });

  let latir = true;
  el.addEventListener("click", (e) => {
    const b = e.target.closest("[data-k]");
    if (!b) return;
    if (b.dataset.k === "latir") { latir = !latir; b.classList.toggle("on", latir); b.setAttribute("aria-pressed", latir); }
    if (b.dataset.k === "malla") {
      const on = !musculo.wireframe;
      grupo.traverse((o) => { if (o.material) o.material.wireframe = on; });
      b.classList.toggle("on", on); b.setAttribute("aria-pressed", on);
    }
    if (b.dataset.k === "vista") Object.assign(orb, { az: .5, el: .12, dist: 7.6, vaz: 0, vel: 0 });
  });
  // Resaltar una parte al pasar por su etiqueta.
  const partes = { aorta, pulmonar, cava, vi: cuerpo };
  el.querySelector(".vis-etq").addEventListener("pointerover", (e) => {
    const li = e.target.closest("li");
    Object.values(partes).forEach((m) => { m.material.emissive?.setHex(0x000000); });
    if (li) partes[li.dataset.p].material.emissive.setHex(0x4a1a0c);
  });
  el.querySelector(".vis-etq").addEventListener("pointerleave", () => Object.values(partes).forEach((m) => m.material.emissive.setHex(0)));

  function medir() {
    const r = caja.getBoundingClientRect();
    if (!r.width) return;
    rend.setSize(r.width, r.height, false);
    cam.aspect = r.width / r.height; cam.updateProjectionMatrix();
  }
  const bpm = $(".bpm", el), lat = $(".lat", el);
  let ultimo = 0;
  const anim = bucle((t) => {
    if (!arr && !reducido()) { orb.az -= .0025 + orb.vaz * .9; orb.vaz *= .93; }
    cam.position.set(Math.sin(orb.az) * Math.cos(orb.el) * orb.dist, Math.sin(orb.el) * orb.dist + .2, Math.cos(orb.az) * Math.cos(orb.el) * orb.dist);
    cam.lookAt(0, .15, 0);
    // Latido «lub-dub» a 72 por minuto.
    const fase = (t / 833) % 1;
    const pulso = latir && !reducido() ? Math.exp(-Math.pow((fase - .05) / .045, 2)) * .07 + Math.exp(-Math.pow((fase - .24) / .05, 2)) * .045 : 0;
    grupo.scale.setScalar(1 + pulso);
    if (latir && fase < ultimo) { lat.classList.remove("on"); void lat.offsetWidth; lat.classList.add("on"); bpm.textContent = 70 + Math.round(Math.random() * 4); }
    ultimo = fase;
    rend.render(escena, cam);
  });
  addEventListener("resize", medir);
  return { pausar: anim.pausar, reanudar() { medir(); anim.reanudar(); } };
}

// ================= 3b. Estructura que se arma =================
// Edificio de 4 pisos y 3×2 vanos en isométrico, estilo plano de ingeniería.
export function estructura(el) {
  el.innerHTML = `<canvas></canvas><div class="es-cap"><span class="es-fase">Plano listo</span><span class="es-cnt"></span></div>
    <button class="ent-btn claro" data-k="go">▶ Construir con sonido</button>`;
  const cv = $("canvas", el), cx = cv.getContext("2d");
  let W = 0, H = 0, u = 0, ox = 0, oy = 0;
  const NX = 3, NY = 2, PISOS = 4, VX = 1, VY = 1, AL = .8;
  function medir() {
    const r = cv.getBoundingClientRect();
    W = cv.width = Math.round(r.width * devicePixelRatio);
    H = cv.height = Math.round(r.height * devicePixelRatio);
    u = Math.min(W / ((NX + NY) * .866 + .6), H / ((NX + NY) * .5 + PISOS * AL + .9));
    ox = W / 2 + (NY - NX) * .866 * u / 2;
    oy = H - .35 * u - (NX + NY) * .5 * u;
  }
  const P = (x, y, z) => [ox + (x - y) * .866 * u, oy + (x + y) * .5 * u - z * AL * u];

  // Líneas: columnas, vigas por piso y arriostres en las caras visibles.
  const lineas = [];
  for (let i = 0; i <= NX; i++) for (let j = 0; j <= NY; j++) for (let k = 0; k < PISOS; k++) lineas.push({ t: "col", a: [i, j, k], b: [i, j, k + 1], z: k });
  for (let k = 1; k <= PISOS; k++) {
    for (let j = 0; j <= NY; j++) for (let i = 0; i < NX; i++) lineas.push({ t: "viga", a: [i, j, k], b: [i + 1, j, k], z: k - .5 });
    for (let i = 0; i <= NX; i++) for (let j = 0; j < NY; j++) lineas.push({ t: "viga", a: [i, j, k], b: [i, j + 1, k], z: k - .5 });
  }
  for (let k = 0; k < PISOS; k++) {
    for (let i = 0; i < NX; i++) lineas.push({ t: "arr", a: [i, NY, k], b: [i + 1, NY, k + 1], z: k + .2 }, { t: "arr", a: [i + 1, NY, k], b: [i, NY, k + 1], z: k + .2 });
    for (let j = 0; j < NY; j++) lineas.push({ t: "arr", a: [NX, j, k], b: [NX, j + 1, k + 1], z: k + .2 }, { t: "arr", a: [NX, j + 1, k], b: [NX, j, k + 1], z: k + .2 });
  }
  // Avalancha: de abajo hacia arriba, con un poco de desorden.
  lineas.forEach((l, i) => { l.ord = l.z + ((i * 37) % 11) / 22; });
  lineas.sort((a, b) => a.ord - b.ord);
  const PASO = 26, DIBUJO = 220;
  lineas.forEach((l, i) => { l.ini = i * PASO; });
  const FIN_LINEAS = lineas.length * PASO + DIBUJO;
  const PISO_MS = 520, FIN = FIN_LINEAS + 300 + PISOS * PISO_MS + 600;

  function poligono(pts, relleno, trazo) {
    cx.beginPath();
    pts.forEach(([x, y, z], i) => { const [a, b] = P(x, y, z); i ? cx.lineTo(a, b) : cx.moveTo(a, b); });
    cx.closePath();
    cx.fillStyle = relleno; cx.fill();
    if (trazo) { cx.strokeStyle = trazo; cx.lineWidth = devicePixelRatio; cx.stroke(); }
  }

  function dibujar(ms) {
    cx.clearRect(0, 0, W, H);
    // Cuadrícula de plano.
    cx.strokeStyle = "rgba(160, 205, 255, .09)"; cx.lineWidth = 1;
    const g = 18 * devicePixelRatio;
    for (let x = 0; x < W; x += g) { cx.beginPath(); cx.moveTo(x, 0); cx.lineTo(x, H); cx.stroke(); }
    for (let y = 0; y < H; y += g) { cx.beginPath(); cx.moveTo(0, y); cx.lineTo(W, y); cx.stroke(); }
    // Huella en el suelo.
    poligono([[0, 0, 0], [NX * VX, 0, 0], [NX * VX, NY * VY, 0], [0, NY * VY, 0]], "rgba(160, 205, 255, .08)", "rgba(160, 205, 255, .35)");

    // Materiales: losa de concreto y vidrio, piso por piso.
    const mt = ms - FIN_LINEAS - 300;
    for (let k = 0; k < PISOS; k++) {
      const p = Math.max(0, Math.min(1, (mt - k * PISO_MS) / PISO_MS));
      if (p <= 0) continue;
      poligono([[0, 0, k + 1], [NX, 0, k + 1], [NX, NY, k + 1], [0, NY, k + 1]], `rgba(205, 200, 192, ${.85 * p})`, `rgba(255,255,255,${.5 * p})`);
      const alto = k + p;
      for (let i = 0; i < NX; i++) poligono([[i, NY, k], [i + 1, NY, k], [i + 1, NY, alto], [i, NY, alto]], `rgba(120, 200, 235, ${.32 * p})`);
      for (let j = 0; j < NY; j++) poligono([[NX, j, k], [NX, j + 1, k], [NX, j + 1, alto], [NX, j, alto]], `rgba(95, 175, 220, ${.38 * p})`);
    }
    // Líneas que crecen.
    let hechas = 0;
    for (const l of lineas) {
      const p = Math.max(0, Math.min(1, (ms - l.ini) / DIBUJO));
      if (p <= 0) continue;
      if (p >= 1) hechas++;
      const [x1, y1] = P(...l.a), [x2, y2] = P(...l.b);
      cx.strokeStyle = l.t === "arr" ? "rgba(242, 165, 127, .95)" : "rgba(235, 245, 255, .95)";
      cx.lineWidth = (l.t === "col" ? 2.2 : l.t === "viga" ? 1.6 : 1.1) * devicePixelRatio;
      cx.beginPath(); cx.moveTo(x1, y1); cx.lineTo(x1 + (x2 - x1) * p, y1 + (y2 - y1) * p); cx.stroke();
      if (p < 1) {
        cx.fillStyle = "#fff";
        cx.beginPath(); cx.arc(x1 + (x2 - x1) * p, y1 + (y2 - y1) * p, 2.4 * devicePixelRatio, 0, 6.28); cx.fill();
      }
    }
    const fase = ms <= 0 ? "Plano listo" : hechas < lineas.length ? (lineas[Math.min(hechas, lineas.length - 1)].t === "arr" ? "Arriostres" : lineas[Math.min(hechas, lineas.length - 1)].t === "viga" ? "Vigas" : "Columnas")
      : mt < PISOS * PISO_MS ? `Losa y vidrio · piso ${Math.min(PISOS, Math.floor(mt / PISO_MS) + 1)}` : "Estructura terminada";
    $(".es-fase", el).textContent = fase;
    $(".es-cnt", el).textContent = `${hechas}/${lineas.length} elementos`;
  }

  function sonar() {
    const a = audio(), t = a.currentTime + .05;
    // Un clic por elemento, agudo para arriostres, grave para columnas.
    lineas.forEach((l) => {
      const o = a.createOscillator(), g = a.createGain();
      o.type = "square";
      o.frequency.value = l.t === "col" ? 180 + l.z * 30 : l.t === "viga" ? 420 + l.z * 40 : 900 + l.z * 60;
      const s = t + l.ini / 1000;
      g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(.05, s + .004); g.gain.exponentialRampToValueAtTime(.0005, s + .06);
      o.connect(g); g.connect(salida); o.start(s); o.stop(s + .08);
    });
    // Retumbo y barrido al vaciar cada losa.
    for (let k = 0; k < PISOS; k++) {
      const s = t + (FIN_LINEAS + 300 + k * PISO_MS) / 1000;
      const n = ruido(.7), f = a.createBiquadFilter(), g = a.createGain();
      f.type = "lowpass"; f.frequency.setValueAtTime(140, s); f.frequency.exponentialRampToValueAtTime(1800 + k * 600, s + .5);
      g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(.35, s + .12); g.gain.exponentialRampToValueAtTime(.001, s + .7);
      n.connect(f); f.connect(g); g.connect(salida); n.start(s); n.stop(s + .72);
      const o = a.createOscillator(), go = a.createGain();
      o.type = "sine"; o.frequency.setValueAtTime(55, s); o.frequency.exponentialRampToValueAtTime(38, s + .5);
      go.gain.setValueAtTime(.3, s); go.gain.exponentialRampToValueAtTime(.001, s + .55);
      o.connect(go); go.connect(salida); o.start(s); o.stop(s + .6);
    }
    // Campanada final.
    const s = t + (FIN_LINEAS + 300 + PISOS * PISO_MS) / 1000;
    [523.25, 659.25, 783.99, 1046.5].forEach((fr, i) => {
      const o = a.createOscillator(), g = a.createGain();
      o.type = "triangle"; o.frequency.value = fr;
      g.gain.setValueAtTime(0, s + i * .04); g.gain.linearRampToValueAtTime(.12, s + i * .04 + .01); g.gain.exponentialRampToValueAtTime(.001, s + 1.6);
      o.connect(g); g.connect(salida); o.start(s + i * .04); o.stop(s + 1.7);
    });
  }

  let t0 = 0, corriendo = false;
  const anim = bucle((t) => {
    if (!t0) t0 = t;
    const ms = t - t0;
    dibujar(ms);
    if (ms > FIN) { corriendo = false; anim.pausar(); $("[data-k=go]", el).disabled = false; $("[data-k=go]", el).textContent = "↻ Construir otra vez"; }
  });
  medir();
  dibujar(0);
  addEventListener("resize", () => { medir(); if (!corriendo) dibujar(t0 ? FIN : 0); });
  $("[data-k=go]", el).onclick = () => {
    if (reducido()) { dibujar(FIN); return; }
    try { sonar(); } catch { /* sin audio, igual se arma */ }
    t0 = 0; corriendo = true;
    $("[data-k=go]", el).disabled = true;
    anim.reanudar();
  };
  return { pausar: anim.pausar, reanudar() { medir(); if (corriendo) anim.reanudar(); else dibujar(t0 ? FIN : 0); } };
}

// ================= 3c. Piano con estrellas =================
export function piano(el) {
  const BLANCAS = ["C", "D", "E", "F", "G", "A", "B"];
  const NEGRAS = { C: "C#", D: "D#", F: "F#", G: "G#", A: "A#" };
  const SEMI = { C: 0, "C#": 1, D: 2, "D#": 3, E: 4, F: 5, "F#": 6, G: 7, "G#": 8, A: 9, "A#": 10, B: 11 };
  const teclas = [];
  for (let o = 3; o <= 4; o++) for (const n of BLANCAS) teclas.push({ n, o, negra: false });
  teclas.push({ n: "C", o: 5, negra: false });
  const nb = teclas.length;
  const negras = [];
  teclas.forEach((t, i) => { if (NEGRAS[t.n] && i < nb - 1) negras.push({ n: NEGRAS[t.n], o: t.o, negra: true, junto: i }); });
  const freq = (n, o) => 440 * Math.pow(2, (SEMI[n] + (o + 1) * 12 - 69) / 12);

  el.innerHTML = `<div class="pi-cielo"><canvas></canvas>
      <svg class="pi-mano" viewBox="0 0 60 90" aria-hidden="true">
        <path d="M22 4c0-3 6-3 6 0v38l3-2c0-3 6-3 6 0v4l3-1c0-3 6-3 6 0v4l2-1c0-3 6-3 6 0v22c0 12-8 20-19 20h-6C19 88 12 81 9 72L3 56c-2-4 3-7 6-4l7 9h6z"
          fill="#fff7f0" stroke="#d97757" stroke-width="2.5" stroke-linejoin="round"/></svg>
      <div class="pi-teclado">${teclas.map((t, i) => `<div class="pi-b" data-i="${i}" style="left:${(i / nb * 100).toFixed(3)}%;width:${(100 / nb).toFixed(3)}%"><span>${t.n === "C" ? "C" + t.o : ""}</span></div>`).join("")}
        ${negras.map((t, j) => `<div class="pi-n" data-j="${j}" style="left:${((t.junto + .68) / nb * 100).toFixed(3)}%;width:${(64 / nb).toFixed(3)}%"></div>`).join("")}</div>
    </div>
    <button class="ent-btn claro" data-k="go">▶ Tocar la escala</button>`;
  const cielo = $(".pi-cielo", el), cv = $("canvas", el), cx = cv.getContext("2d"), mano = $(".pi-mano", el);
  let W = 0, H = 0, tecladoTop = 0;
  const parts = [], rayos = [];
  const fondo = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random() * .6, r: Math.random() * 1.4 + .3, f: Math.random() * 6 }));
  function medir() {
    const r = cielo.getBoundingClientRect();
    W = cv.width = Math.round(r.width * devicePixelRatio);
    H = cv.height = Math.round(r.height * devicePixelRatio);
    tecladoTop = $(".pi-teclado", el).offsetTop * devicePixelRatio;
  }

  function nota(fr, t, dur = .5, vol = .16) {
    const a = audio();
    const f = a.createBiquadFilter(), g = a.createGain();
    f.type = "lowpass"; f.Q.value = 4;
    f.frequency.setValueAtTime(fr * 10, t); f.frequency.exponentialRampToValueAtTime(fr * 2, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(.0008, t + dur + .4);
    f.connect(g); g.connect(salida);
    [-12, -5, 0, 6, 13].forEach((d) => {
      const o = a.createOscillator(); o.type = "sawtooth"; o.frequency.value = fr; o.detune.value = d;
      o.connect(f); o.start(t); o.stop(t + dur + .5);
    });
  }

  function estallar(el2, fuerte) {
    const rc = el2.getBoundingClientRect(), rr = cielo.getBoundingClientRect();
    const x = (rc.left - rr.left + rc.width / 2) * devicePixelRatio, y = tecladoTop;
    if (reducido()) return;
    rayos.push({ x, w: rc.width * devicePixelRatio, v: 1 });
    const n = fuerte ? 90 : 28;
    for (let i = 0; i < n; i++) {
      const ang = -Math.PI / 2 + (Math.random() - .5) * (fuerte ? 2.6 : 1.1), sp = (2 + Math.random() * (fuerte ? 9 : 6)) * devicePixelRatio;
      parts.push({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, v: 1, r: (1 + Math.random() * 2.4) * devicePixelRatio,
        c: ["#ffffff", "#ffe2b8", "#f2a57f", "#9fe6ff", "#d97757"][Math.floor(Math.random() * 5)], estrella: Math.random() < .35 });
    }
  }

  function tocar(tecla, el2, t, dur, fuerte) {
    nota(freq(tecla.n, tecla.o), t, dur, fuerte ? .1 : .16);
    const ms = Math.max(0, (t - audio().currentTime) * 1000);
    setTimeout(() => {
      el2.classList.add("on");
      estallar(el2, fuerte);
      setTimeout(() => el2.classList.remove("on"), Math.min(400, dur * 1000));
    }, ms);
  }

  function estrella(x, y, r) {
    cx.beginPath();
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rr = i % 2 ? r * .35 : r * 1.8; cx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    cx.closePath(); cx.fill();
  }

  const anim = bucle((t) => {
    cx.clearRect(0, 0, W, H);
    for (const s of fondo) {
      cx.globalAlpha = .35 + .35 * Math.sin(t / 700 + s.f);
      cx.fillStyle = "#fff"; cx.beginPath(); cx.arc(s.x * W, s.y * H, s.r * devicePixelRatio, 0, 6.28); cx.fill();
    }
    for (let i = rayos.length - 1; i >= 0; i--) {
      const r = rayos[i];
      const g = cx.createLinearGradient(0, tecladoTop, 0, 0);
      g.addColorStop(0, `rgba(255, 210, 170, ${.55 * r.v})`); g.addColorStop(1, "rgba(255, 210, 170, 0)");
      cx.globalAlpha = 1; cx.fillStyle = g;
      cx.beginPath(); cx.moveTo(r.x - r.w * .45, tecladoTop); cx.lineTo(r.x + r.w * .45, tecladoTop); cx.lineTo(r.x + r.w * 1.6, 0); cx.lineTo(r.x - r.w * 1.6, 0); cx.fill();
      r.v -= .03; if (r.v <= 0) rayos.splice(i, 1);
    }
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.x += p.vx; p.y += p.vy; p.vy += .06 * devicePixelRatio; p.vx *= .985; p.v -= .012;
      cx.globalAlpha = Math.max(0, p.v); cx.fillStyle = p.c;
      if (p.estrella) estrella(p.x, p.y, p.r); else { cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, 6.28); cx.fill(); }
      if (p.v <= 0) parts.splice(i, 1);
    }
    cx.globalAlpha = 1;
  });

  // La mano virtual se mueve sobre la tecla y la presiona.
  function moverMano(el2, ms) {
    setTimeout(() => {
      const rc = el2.getBoundingClientRect(), rr = cielo.getBoundingClientRect();
      mano.style.opacity = 1;
      mano.style.transform = `translate(${rc.left - rr.left + rc.width / 2 - 12}px, ${$(".pi-teclado", el).offsetTop - 44}px)`;
      mano.classList.remove("pulsa"); void mano.offsetWidth; mano.classList.add("pulsa");
    }, ms);
  }

  $("[data-k=go]", el).onclick = () => {
    const a = audio(), t = a.currentTime + .08, PASO = .17;
    const blancas = [...el.querySelectorAll(".pi-b")];
    blancas.forEach((b, i) => { tocar(teclas[i], b, t + i * PASO, .35, false); moverMano(b, (i * PASO + .06) * 1000); });
    const tf = t + nb * PASO + .12;
    [7, 9, 11, 14].forEach((i) => tocar(teclas[i], blancas[i], tf, 1.8, true));
    setTimeout(() => { mano.style.opacity = 0; }, (nb * PASO + 1.4) * 1000);
  };
  el.querySelectorAll(".pi-b").forEach((b) => b.addEventListener("pointerdown", () => tocar(teclas[+b.dataset.i], b, audio().currentTime + .01, .45, false)));
  el.querySelectorAll(".pi-n").forEach((b) => b.addEventListener("pointerdown", () => tocar(negras[+b.dataset.j], b, audio().currentTime + .01, .45, false)));
  medir();
  addEventListener("resize", medir);
  return { pausar: anim.pausar, reanudar() { medir(); anim.reanudar(); } };
}

// ================= 4. Aula virtual (LMS) =================
const KOLB = ["Experiencia concreta", "Observación reflexiva", "Conceptualización abstracta", "Experimentación activa"];
const UNIDADES = [
  { t: "Fundamentos", ses: [["Presupuesto de tokens", 4], ["Plan recursivo", 4]] },
  { t: "Datos y rendimiento", ses: [["Tablero con pivote", 4], ["Datos al instante", 3]] },
  { t: "3D en la web", ses: [["Corazón y estructuras", 2], ["Sonido e interacción", 0]] },
  { t: "Tu plataforma", ses: [["LMS con IA", 0], ["Despliegue", 0]] },
];
const NOTAS = [
  ["Valeria Q.", 18, 17, 19], ["Diego R.", 15, 16, null], ["Lucía T.", 19, 18, 18],
  ["Mateo H.", 12, 14, null], ["Camila F.", 16, 17, 17],
];
const RECURSO = `# Guía: medir tokens antes de optimizar

1. Abre /context y anota la línea base.
2. Repite la tarea con RTK activo.
3. Compara y registra el ahorro.

Reto: baja un 50 % sin perder calidad.`;

export function lms(el) {
  const actual = [2, 0];
  el.innerHTML = `
    <div class="aula">
      <aside class="aula-lado">
        <div class="aula-curso"><b>Claude Code PRO</b><span>Grupo de ejemplo · 4 sesiones</span>
          <div class="prog"><i style="width:46%"></i></div><small>46 % completado</small></div>
        <nav>${UNIDADES.map((u, i) => `<div class="uni"><p>Unidad ${i + 1}. ${u.t}</p>${u.ses.map((s, j) =>
          `<button data-s="${i}-${j}" class="${i === actual[0] && j === actual[1] ? "on" : ""}"><span class="fases">${KOLB.map((_, k) => `<i class="${k < s[1] ? "ok" : ""}"></i>`).join("")}</span>${s[0]}</button>`).join("")}</div>`).join("")}</nav>
      </aside>
      <div class="aula-main">
        <header class="aula-cab"><div><small>Unidad 3 · Sesión 5</small><h4>Corazón y estructuras</h4></div><span class="vivo-r"><i></i>En vivo</span></header>
        <div class="aula-grid">
          <section class="panel kolb">
            <header><h4>Ciclo de Kolb</h4></header>
            <svg viewBox="0 0 200 200" class="anillo" role="img" aria-label="Ciclo de aprendizaje de Kolb"></svg>
            <p class="kolb-fase"></p>
          </section>
          <section class="panel clase">
            <div class="video"><div class="caras">${["VQ", "DR", "LT", "MH", "CF", "+9"].map((x) => `<span>${x}</span>`).join("")}</div>
              <div class="video-pie"><span class="vivo-r"><i></i>En vivo</span><span>14 conectados · Jitsi</span></div></div>
            <button class="btn-acc" disabled title="Demostración">Entrar a la videoclase</button>
          </section>
          <section class="panel gen">
            <header><h4>Generador de recursos</h4><span class="sutil">demostración</span></header>
            <div class="gen-in"><span>Guía para medir tokens</span><button class="btn-acc" data-k="gen">Generar</button></div>
            <pre class="gen-out" aria-live="polite"></pre>
          </section>
          <section class="panel notas">
            <header><h4>Calificaciones</h4><span class="sutil">sobre 20</span></header>
            <table><thead><tr><th>Alumno</th><th class="num">E1</th><th class="num">E2</th><th class="num">E3</th><th class="num">Prom.</th></tr></thead><tbody>
            ${NOTAS.map(([n, ...v]) => {
              const hechas = v.filter((x) => x != null), pr = hechas.reduce((a, b) => a + b, 0) / hechas.length;
              return `<tr><td>${n}</td>${v.map((x) => `<td class="num">${x == null ? '<span class="pend" title="Pendiente">–</span>' : x}</td>`).join("")}<td class="num"><b class="${pr >= 14 ? "bien" : "medio"}">${fmt(pr, 1)}</b></td></tr>`;
            }).join("")}</tbody></table>
          </section>
        </div>
      </div>
    </div>`;

  // Anillo de Kolb: cuatro arcos; la fase activa avanza sola.
  const anillo = $(".anillo", el);
  const arco = (i) => {
    const a0 = -Math.PI / 2 + i * Math.PI / 2 + .06, a1 = a0 + Math.PI / 2 - .12, R = 78;
    const p = (a) => `${100 + Math.cos(a) * R} ${100 + Math.sin(a) * R}`;
    return `M${p(a0)} A${R} ${R} 0 0 1 ${p(a1)}`;
  };
  anillo.innerHTML = KOLB.map((k, i) => `<path d="${arco(i)}" class="arco" data-i="${i}"/>`).join("") +
    `<text x="100" y="96" text-anchor="middle" class="k-n">2 de 4</text><text x="100" y="116" text-anchor="middle" class="k-t">fases</text>`;
  let fase = 1;
  const pintarFase = () => {
    anillo.querySelectorAll(".arco").forEach((a) => { const i = +a.dataset.i; a.classList.toggle("hecha", i < fase); a.classList.toggle("activa", i === fase); });
    $(".k-n", el).textContent = `${fase + 1} de 4`;
    $(".kolb-fase", el).innerHTML = `<b>${KOLB[fase]}</b>${["Construyes el corazón en vivo.", "Comparas tu malla con la del grupo.", "Entiendes PBR y luces.", "Lo aplicas a tu propio objeto."][fase]}`;
  };
  pintarFase();
  let ultimo = 0;
  const anim = bucle((t) => { if (t - ultimo > 2600) { ultimo = t; fase = (fase + 1) % 4; pintarFase(); } });

  let escribiendo = null;
  el.addEventListener("click", (e) => {
    const s = e.target.closest("[data-s]");
    if (s) { el.querySelectorAll("[data-s]").forEach((b) => b.classList.toggle("on", b === s)); }
    if (e.target.closest("[data-k=gen]")) {
      clearInterval(escribiendo);
      const out = $(".gen-out", el);
      out.textContent = "";
      let i = 0;
      if (reducido()) { out.textContent = RECURSO; return; }
      escribiendo = setInterval(() => { out.textContent = RECURSO.slice(0, ++i); if (i >= RECURSO.length) clearInterval(escribiendo); }, 16);
    }
  });
  return { pausar: anim.pausar, reanudar: anim.reanudar };
}
