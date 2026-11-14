// Tablero BI del colegio: pregunta en castellano, tabla dinámica con arrastre
// y gráfico accesible. Todo corre en el navegador, sin red ni librerías.
// Contrato: tablero(el) → { pausar, reanudar }.
import { $, esc } from "./comun.js";

const fmt = (n, d = 0) => Number(n).toLocaleString("es-PE", { minimumFractionDigits: d, maximumFractionDigits: d });

// ---------- Modelo de datos ----------
const DIM = {
  grado: ["1°", "2°", "3°", "4°", "5°"],
  seccion: ["A", "B"],
  curso: ["Matemática", "Comunicación", "Ciencia", "Inglés"],
  bimestre: ["I", "II", "III"],
};
const DIMS = Object.keys(DIM);
const NOMBRE = { grado: "Grado", seccion: "Sección", curso: "Curso", bimestre: "Bimestre" };
const CORTO = { Matemática: "Mat.", Comunicación: "Com.", Ciencia: "Cien.", Inglés: "Ingl.", I: "Bim. I", II: "Bim. II", III: "Bim. III" };
// Cada medida: nombre, escala del eje, formato y si subir es bueno (+1) o malo (−1).
const MEDIDAS = {
  promedio: { n: "Promedio", esc: [0, 20], marcas: [0, 5, 10, 15, 20], f: (v) => fmt(v, 1), bueno: 1, unidad: "sobre 20" },
  asistencia: { n: "Asistencia", esc: [0, 100], marcas: [0, 25, 50, 75, 100], f: (v) => fmt(v, 1) + "\u00a0%", bueno: 1, unidad: "de las clases" },
  aprobados: { n: "Aprobados", esc: [0, 100], marcas: [0, 25, 50, 75, 100], f: (v) => fmt(v, 0) + "\u00a0%", bueno: 1, unidad: "del aula, nota ≥ 11" },
  desaprobados: { n: "Desaprobados", esc: [0, 100], marcas: [0, 25, 50, 75, 100], f: (v) => fmt(v, 0) + "\u00a0%", bueno: -1, unidad: "del aula, nota < 11" },
};
const NOTA_MIN = 11;

// Datos sintéticos y deterministas (misma semilla que la demo anterior):
// 30 alumnos por aula, un registro por aula × curso × bimestre.
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

// Paleta categórica validada (skill dataviz): orden fijo, nunca cíclica.
const PALETA = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"];
const SERIE = { Matemática: "#2a78d6", Comunicación: "#eb6834", Ciencia: "#1baf7a", Inglés: "#eda100" };
const colorDe = (dim, v, i) => dim === "curso" ? SERIE[v] : dim ? PALETA[DIM[dim].indexOf(v)] : PALETA[i % PALETA.length];

const valor = (r, m) => m === "aprobados" ? r.aprobados / r.n * 100 : m === "desaprobados" ? (r.n - r.aprobados) / r.n * 100 : r[m];
function medir(filas, m) {
  if (!filas.length) return 0;
  const n = filas.reduce((a, r) => a + r.n, 0);
  return filas.reduce((a, r) => a + valor(r, m) * r.n, 0) / n;
}

function chispa(vals, ancho = 60, alto = 22) {
  const min = Math.min(...vals), max = Math.max(...vals), r = max - min || 1;
  const pts = vals.map((v, i) => [i / (vals.length - 1) * (ancho - 6) + 3, alto - 4 - (v - min) / r * (alto - 9)]);
  const d = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const u = pts[pts.length - 1];
  return `<svg viewBox="0 0 ${ancho} ${alto}" width="${ancho}" height="${alto}" aria-hidden="true"><path d="${d}" fill="none" stroke="currentColor" stroke-opacity=".45" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${u[0]}" cy="${u[1]}" r="3" fill="currentColor"/></svg>`;
}

// ---------- Intérprete de preguntas (reglas, sin red) ----------
const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[¿?¡!.,;:()"]/g, " ").replace(/\s+/g, " ").trim();
const ORD = { primer: "1°", primero: "1°", segundo: "2°", tercer: "3°", tercero: "3°", cuarto: "4°", quinto: "5°" };
const BIM = { i: "I", ii: "II", iii: "III", 1: "I", 2: "II", 3: "III", primer: "I", "1er": "I", segundo: "II", "2do": "II", tercer: "III", "3er": "III" };
const CUR = { matematica: "Matemática", matematicas: "Matemática", mate: "Matemática", comunicacion: "Comunicación", lenguaje: "Comunicación", ciencia: "Ciencia", ciencias: "Ciencia", cta: "Ciencia", ingles: "Inglés" };

export function interpretar(pregunta) {
  let t = " " + norm(pregunta) + " ";
  if (!t.trim()) return null;
  const filtros = {};
  const pon = (dim, v) => { if (v) (filtros[dim] ||= new Set()).add(v); return " "; };
  const toma = (re, dim, mapa) => { t = t.replace(re, (...a) => pon(dim, mapa(a))); };
  // Valores: primero el bimestre (para que «2» no se lea como grado), luego el resto.
  toma(/\b(primer|1er|segundo|2do|tercer|3er)\s+bimestre\b/g, "bimestre", (a) => BIM[a[1]]);
  toma(/\bbim(?:estre)?s?\.?\s+(iii|ii|i|1|2|3)\b/g, "bimestre", (a) => BIM[a[1]]);
  toma(/\b(primer|primero|segundo|tercer|tercero|cuarto|quinto)\s*(?:grado|ano|de secundaria)?\b/g, "grado", (a) => ORD[a[1]]);
  toma(/\b([1-5])(?:°|º|ro|do|er|to|mo)?(?:\s*(?:grado|de secundaria|ano))?(?![\d%\w])/g, "grado", (a) => a[1] + "°");
  toma(/\bsecci?on(?:es)?\s+([ab])\b(?:\s+(?:y|o|vs|contra|frente a|con)\s+(?:la\s+)?([ab])\b)?/g, "seccion", (a) => { if (a[2]) pon("seccion", a[2].toUpperCase()); return a[1].toUpperCase(); });
  toma(/\b(matematicas?|mate|comunicacion|lenguaje|ciencias?|cta|ingles)\b/g, "curso", (a) => CUR[a[1]]);

  // Medida y polaridad de las palabras de «faltas».
  let medida = null, invertir = false;
  if (/desaprob|desaprueb|jalad|riesgo|reprob|suspend/.test(t)) medida = "desaprobados";
  else if (/aprob|aprueb/.test(t)) medida = "aprobados";
  else if (/asist|falta|inasist|ausen/.test(t)) { medida = "asistencia"; invertir = /falta|inasist|ausen/.test(t); }
  else if (/promedio|nota|calific|rendimiento|puntaje|desempen/.test(t)) medida = "promedio";

  // Dimensiones nombradas sin valor → agrupar por ellas.
  const DIMRE = { grado: /\bgrados?\b/, seccion: /\bsecci?on(es)?\b/, curso: /\bcursos?\b|\bmaterias?\b|\bareas?\b/, bimestre: /\bbimestres?\b|\bevolucion|\btendencia|\ba lo largo\b|\bavanz|\bmejor[oa]\b|\bcada mes\b/ };
  const grupo = DIMS.filter((d) => DIMRE[d].test(t));
  // Dos valores de una misma dimensión = comparación → también agrupa.
  const compara = DIMS.find((d) => filtros[d] && filtros[d].size >= 2 && !grupo.includes(d));
  if (compara) grupo.push(compara);

  // Superlativos: mejor/peor miran la polaridad de la medida; mayor/menor, el número.
  let sup = null;
  if (/\bpeor(es)?\b/.test(t)) sup = "peor";
  else if (/\bmejor(es)?\b/.test(t)) sup = "mejor";
  else if (/\bmas baj[oa]s?\b|\bmenor(es)?\b|\bminim|\bmenos\b|\bmas pobre/.test(t)) sup = "min";
  else if (/\bmas alt[oa]s?\b|\bmayor(es)?\b|\bmaxim|\bmas\b|\bsupera/.test(t)) sup = "max";
  if (sup && invertir) sup = { peor: "mejor", mejor: "peor", min: "max", max: "min" }[sup];

  if (!medida && !Object.keys(filtros).length && !grupo.length && !sup) return null;
  medida = medida || "promedio";
  const agrupado = grupo.filter((d) => !filtros[d] || d === compara);
  if (sup && !agrupado.length) agrupado.push(DIMS.find((d) => !filtros[d]) || "grado");
  return { medida, filtros, grupo: agrupado, sup, compara };
}

// ---------- Componente ----------
let id = 1;
export function tablero(el) {
  estilos();
  const st = {
    medida: "promedio", filas: ["grado"], cols: ["curso"], filtros: [],
    sel: { grado: null, seccion: null, curso: null, bimestre: null },
    destacar: null, armado: null, pop: null, celda: null,
  };
  const EJEMPLOS = [
    "¿Qué grado tiene el peor promedio en Matemática?",
    "Asistencia por bimestre en 5°",
    "¿Qué curso tiene más desaprobados?",
    "Compara la sección A y la B en Comunicación",
  ];

  el.innerHTML = `
    <div class="bi-x">
      <section class="bi-ask">
        <form class="bi-ask-f" autocomplete="off">
          <label class="bi-ask-l" for="bi-q-${id}">Pregúntale al tablero</label>
          <div class="bi-ask-fila">
            <input id="bi-q-${id}" type="text" name="q" placeholder="Ej.: ¿qué sección de 3° tiene mejor asistencia?" enterkeyhint="search" />
            <button type="submit">Preguntar</button>
          </div>
        </form>
        <div class="bi-ej" role="group" aria-label="Preguntas de ejemplo">${EJEMPLOS.map((q) => `<button type="button" data-q="${esc(q)}">${esc(q)}</button>`).join("")}</div>
        <p class="bi-resp" aria-live="polite">Pregunta en castellano o arrastra las dimensiones.</p>
        <p class="bi-interp" aria-live="polite"></p>
      </section>
      <div class="bi-kpis"></div>
      <section class="panel bi-pv">
        <header><h4>Tabla dinámica</h4><div class="bi-pv-acc"><span class="bi-pista"></span><button type="button" class="bi-trans" title="Intercambia filas y columnas">⇄ Transponer</button></div></header>
        <div class="bi-zonas"></div>
        <div class="bi-med seg" role="group" aria-label="Medida">${Object.keys(MEDIDAS).map((m) => `<button type="button" data-m="${m}" class="${m === st.medida ? "on" : ""}">${MEDIDAS[m].n}</button>`).join("")}</div>
        <div class="bi-pop" hidden></div>
      </section>
      <div class="bi-cuerpo">
        <section class="panel bi-graf">
          <header><h4 class="bi-graf-t"></h4><div class="bi-ley"></div></header>
          <div class="bi-graf-caja"></div>
          <div class="bi-tip" hidden></div>
        </section>
        <section class="panel bi-tabla">
          <header><h4 class="bi-tabla-t"></h4><span class="sutil bi-tabla-n"></span></header>
          <div class="bi-tabla-caja"></div>
          <div class="bi-det"><p>Toca una celda para ver su detalle.</p></div>
        </section>
      </div>
    </div>`;
  id++;
  const raiz = $(".bi-x", el);
  const M = () => MEDIDAS[st.medida];

  // --- Datos derivados ---
  const valores = (d) => st.sel[d] ? DIM[d].filter((v) => st.sel[d].has(v)) : DIM[d];
  const activos = (sinDim) => REG.filter((r) => DIMS.every((d) => d === sinDim || !st.sel[d] || st.sel[d].has(r[d])));
  function combos(dims) {
    if (!dims.length) return [{ k: [], etq: "Total", corto: "Total" }];
    let lista = [{ k: [] }];
    dims.forEach((d) => { lista = lista.flatMap((c) => valores(d).map((v) => ({ k: [...c.k, v] }))); });
    return lista.map((c) => ({ k: c.k, etq: c.k.map((v, i) => rotulo(dims[i], v)).join(" › "), corto: c.k.map((v) => CORTO[v] || v).join(" ") }));
  }
  const rotulo = (d, v) => d === "seccion" ? "Sección " + v : d === "bimestre" ? "Bimestre " + v : v;
  let mat = null;
  function matriz() {
    const base = activos();
    const F = combos(st.filas), C = combos(st.cols);
    const cumple = (r, dims, k) => dims.every((d, i) => r[d] === k[i]);
    const v = F.map((f) => C.map((c) => medir(base.filter((r) => cumple(r, st.filas, f.k) && cumple(r, st.cols, c.k)), st.medida)));
    mat = { F, C, v };
    return mat;
  }

  // --- KPIs ---
  function kpis() {
    const sel = activos(), base = activos("bimestre");
    const porBim = (m) => DIM.bimestre.map((b) => medir(base.filter((r) => r.bimestre === b), m));
    const aulas = new Set(sel.map((r) => r.grado + r.seccion)).size;
    const riesgo = sel.filter((r) => r.promedio < NOTA_MIN).length;
    const t = [
      { t: "Promedio", v: fmt(medir(sel, "promedio"), 1), s: "sobre 20", c: porBim("promedio") },
      { t: "Asistencia", v: fmt(medir(sel, "asistencia"), 1) + " %", s: "de las clases", c: porBim("asistencia") },
      { t: "Aprobados", v: fmt(medir(sel, "aprobados"), 0) + " %", s: "nota ≥ 11", c: porBim("aprobados") },
      { t: "Alumnos", v: fmt(aulas * 30), s: riesgo ? `${riesgo} registros en riesgo` : "sin registros en riesgo", c: null },
    ];
    $(".bi-kpis", raiz).innerHTML = t.map((k) => `<div class="bi-kpi"><span>${k.t}</span><div class="bi-kpi-v"><b>${k.v}</b>${k.c ? `<em title="Bimestres I a III">${chispa(k.c)}</em>` : ""}</div><small>${k.s}</small></div>`).join("");
  }

  // --- Constructor de la tabla dinámica (zonas y fichas) ---
  const zonaDe = (d) => st.filas.includes(d) ? "filas" : st.cols.includes(d) ? "cols" : st.filtros.includes(d) ? "filtros" : "libres";
  function ficha(d) {
    const s = st.sel[d], n = DIM[d].length;
    const etq = !s ? "Todos" : s.size === 1 ? [...s][0] : `${s.size} de ${n}`;
    return `<div class="bi-chip ${st.armado === d ? "bi-chip-arm" : ""} ${s ? "bi-chip-sel" : ""}" data-d="${d}">
      <button type="button" class="bi-chip-n" aria-pressed="${st.armado === d}" aria-label="${NOMBRE[d]}: arrastra o toca y elige una zona">${NOMBRE[d]}</button>
      <button type="button" class="bi-chip-v" aria-haspopup="true" aria-expanded="${st.pop === d}" aria-label="Valores de ${NOMBRE[d]}">${esc(etq)} ▾</button></div>`;
  }
  const ZONAS = [["filas", "Filas"], ["cols", "Columnas"], ["filtros", "Filtros"], ["libres", "Sin usar"]];
  function constructor() {
    const orden = { filas: st.filas, cols: st.cols, filtros: st.filtros, libres: DIMS.filter((d) => zonaDe(d) === "libres") };
    $(".bi-zonas", raiz).innerHTML = ZONAS.map(([z, n]) => `<div class="bi-zona ${st.armado ? "bi-zona-dest" : ""}" data-z="${z}" role="button" tabindex="0" aria-label="${n}: ${st.armado ? "soltar aquí " + NOMBRE[st.armado] : "zona"}">
      <span class="bi-zona-n">${n}</span>${orden[z].map(ficha).join("") || `<span class="bi-zona-vacia">${z === "filas" || z === "cols" ? "arrastra una ficha" : z === "filtros" ? "sin filtros" : "—"}</span>`}</div>`).join("");
    raiz.querySelectorAll(".bi-med button").forEach((b) => b.classList.toggle("on", b.dataset.m === st.medida));
    $(".bi-pista", raiz).textContent = st.armado ? `Toca la zona donde va ${NOMBRE[st.armado]}` : "";
    if (st.pop) ubicarPop();
  }
  function mover(d, z) {
    ["filas", "cols", "filtros"].forEach((k) => { st[k] = st[k].filter((x) => x !== d); });
    if (z === "filas") { st.filas.push(d); if (st.filas.length > 2) st.filas.shift(); }
    if (z === "cols") { st.cols.push(d); if (st.cols.length > 1) st.cols.shift(); }
    if (z === "filtros") st.filtros.push(d);
    st.armado = null; st.destacar = null;
    todo(true);
    if (z === "filtros" && !st.sel[d]) abrirPop(d);
  }
  function transponer() {
    const f = st.filas, c = st.cols;
    st.filas = c.length ? [...c, ...f.slice(1)] : f.slice(1);
    st.cols = f.length ? [f[0]] : [];
    st.destacar = null;
    todo(true);
  }

  // Menú de valores de una ficha.
  function abrirPop(d) {
    st.pop = d;
    const pop = $(".bi-pop", raiz), s = st.sel[d];
    pop.innerHTML = `<p class="bi-pop-t">${NOMBRE[d]}</p>${DIM[d].map((v) => `<label><input type="checkbox" value="${esc(v)}" ${!s || s.has(v) ? "checked" : ""}> ${esc(rotulo(d, v))}</label>`).join("")}
      <div class="bi-pop-acc"><button type="button" data-pop="todos">Todos</button><button type="button" data-pop="listo">Listo</button></div>`;
    pop.hidden = false;
    constructor();
    pop.querySelector("input").focus();
  }
  function cerrarPop() { if (!st.pop) return; st.pop = null; $(".bi-pop", raiz).hidden = true; constructor(); }
  function ubicarPop() {
    const pop = $(".bi-pop", raiz), chip = raiz.querySelector(`.bi-chip[data-d="${st.pop}"]`), pv = $(".bi-pv", raiz);
    if (!chip) return;
    const r = chip.getBoundingClientRect(), c = pv.getBoundingClientRect();
    pop.style.top = (r.bottom - c.top + 4) + "px";
    pop.style.left = Math.max(6, Math.min(r.left - c.left, c.width - pop.offsetWidth - 6)) + "px";
  }

  // --- Gráfico SVG: barras agrupadas, o líneas cuando las columnas son bimestres ---
  function grafico(animar) {
    const caja = $(".bi-graf-caja", raiz), { F, C, v } = mat, Md = M();
    const W = Math.max(260, Math.round(caja.clientWidth)), H = Math.max(180, Math.round(caja.clientHeight));
    const m = { l: 36, r: 10, t: 14, b: 26 }, iw = W - m.l - m.r, ih = H - m.t - m.b;
    const [lo, hi] = Md.esc, y = (val) => m.t + ih - (val - lo) / (hi - lo) * ih;
    const linea = st.cols[0] === "bimestre";
    const dest = st.destacar, apag = (fi, ci) => dest && !(dest.f === fi && (dest.c == null || dest.c === ci));
    let s = "";
    s += Md.marcas.map((t) => `<line x1="${m.l}" x2="${W - m.r}" y1="${y(t)}" y2="${y(t)}" class="bi-rej"/><text x="${m.l - 8}" y="${y(t) + 4}" text-anchor="end">${t}</text>`).join("");
    if (st.medida === "promedio") s += `<line x1="${m.l}" x2="${W - m.r}" y1="${y(NOTA_MIN)}" y2="${y(NOTA_MIN)}" class="bi-umbral"/>`;
    let series, nota = "";
    if (linea) {
      const n = C.length, x = (i) => m.l + iw * (i + .5) / n;
      const MAX = 8, Fv = F.slice(0, MAX);
      if (F.length > MAX) nota = `Se dibujan ${MAX} de ${F.length} series; la tabla las tiene todas.`;
      series = Fv.map((f, fi) => ({ etq: f.etq, color: st.filas.length === 1 ? colorDe(st.filas[0], f.k[0], fi) : colorDe(null, null, fi) }));
      C.forEach((c, i) => { s += `<text x="${x(i)}" y="${H - 8}" text-anchor="middle" class="bi-eje-x">${esc(c.corto)}</text>`; });
      Fv.forEach((f, fi) => {
        const pts = C.map((c, ci) => [x(ci), y(v[fi][ci])]);
        const d = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
        const cls = apag(fi, null) ? "bi-apag" : dest && dest.f === fi ? "bi-dest" : "";
        s += `<g class="bi-serie ${cls}"><path d="${d}" pathLength="1" fill="none" stroke="${series[fi].color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" class="bi-traza"/>`;
        pts.forEach((p, ci) => { s += `<circle cx="${p[0]}" cy="${p[1]}" r="4.5" fill="${series[fi].color}" stroke="#fff" stroke-width="2" tabindex="0" data-tip="${esc(f.etq)} · ${esc(C[ci].corto)}|${Md.f(v[fi][ci])}" data-f="${fi}" data-c="${ci}" style="--d:${(ci * Fv.length + fi) * 40}ms"/>`; });
        if (dest && dest.f === fi) { const u = pts[pts.length - 1]; s += `<text x="${u[0]}" y="${u[1] - 10}" text-anchor="middle" class="bi-val">${Md.f(v[fi][C.length - 1])}</text>`; }
        s += "</g>";
      });
    } else {
      const ng = F.length, ns = C.length, gw = iw / ng;
      const bw = Math.max(2, Math.min(24, (gw - 8) / ns - 2));
      series = C.map((c, ci) => ({ etq: c.etq, color: st.cols.length ? colorDe(st.cols[0], c.k[0], ci) : PALETA[0] }));
      F.forEach((f, fi) => {
        const x0 = m.l + fi * gw + (gw - ns * (bw + 2) + 2) / 2;
        C.forEach((c, ci) => {
          const val = v[fi][ci], x = x0 + ci * (bw + 2), yy = y(val), base = m.t + ih;
          const cls = apag(fi, ci) ? "bi-apag" : dest && dest.f === fi && (dest.c == null || dest.c === ci) ? "bi-dest" : "";
          const r = Math.min(4, bw / 2);
          const d = bw >= 8 ? `M${x} ${base}V${yy + r}q0 -${r} ${r} -${r}h${bw - 2 * r}q${r} 0 ${r} ${r}V${base}z` : `M${x} ${base}V${yy}h${bw}V${base}z`;
          s += `<path d="${d}" fill="${series[ci].color}" class="bi-barra ${cls}" tabindex="0" data-tip="${esc(f.etq)}${st.cols.length ? " · " + esc(c.etq) : ""}|${Md.f(val)}" data-f="${fi}" data-c="${ci}" style="--d:${(fi * ns + ci) * 18}ms"/>`;
          if (cls === "bi-dest") s += `<text x="${x + bw / 2}" y="${yy - 6}" text-anchor="middle" class="bi-val">${Md.f(val)}</text>`;
        });
        s += `<text x="${m.l + fi * gw + gw / 2}" y="${H - 8}" text-anchor="middle" class="bi-eje-x">${esc(f.corto)}</text>`;
      });
    }
    const resumen = `${Md.n} por ${st.filas.map((d) => NOMBRE[d]).join(" y ") || "total"}${st.cols.length ? ", una serie por " + NOMBRE[st.cols[0]].toLowerCase() : ""}`;
    caja.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" class="${animar ? "bi-anima" : ""}" role="img" aria-label="${esc(resumen)}">${s}</svg>`;
    $(".bi-graf-t", raiz).textContent = resumen;
    const ley = series.length > 1 ? series.map((x) => `<span><i style="background:${x.color}"></i>${esc(x.etq)}</span>`).join("") : "";
    $(".bi-ley", raiz).innerHTML = ley + (st.medida === "promedio" ? `<span><i class="bi-raya"></i>Aprobación (${NOTA_MIN})</span>` : "") + (nota ? `<span class="bi-nota">${nota}</span>` : "");
  }

  // --- Tabla de calor + detalle ---
  function tabla() {
    const { F, C, v } = mat, Md = M(), plano = v.flat();
    const lo = Math.min(...plano), hi = Math.max(...plano);
    const dest = st.destacar;
    let h = `<table><thead><tr>${st.filas.map((d) => `<th class="bi-th-dim">${NOMBRE[d]}</th>`).join("") || "<th></th>"}${C.map((c) => `<th title="${esc(c.etq)}">${esc(c.corto)}</th>`).join("")}</tr></thead><tbody>`;
    const niv2 = st.filas.length === 2, span = niv2 ? valores(st.filas[1]).length : 1;
    F.forEach((f, fi) => {
      h += "<tr>";
      if (!niv2) h += `<th>${esc(f.etq)}</th>`;
      else { if (fi % span === 0) h += `<th rowspan="${span}">${esc(rotulo(st.filas[0], f.k[0]))}</th>`; h += `<th>${esc(f.k[1])}</th>`; }
      h += C.map((c, ci) => {
        const val = v[fi][ci], k = hi > lo ? (val - lo) / (hi - lo) : .5;
        const cls = (k > .62 ? "bi-osc " : "") + (dest && dest.f === fi && (dest.c == null || dest.c === ci) ? "bi-dest " : "") + (st.celda && st.celda[0] === fi && st.celda[1] === ci ? "bi-sel" : "");
        return `<td data-f="${fi}" data-c="${ci}" style="--k:${k.toFixed(2)}" class="${cls}" tabindex="0" aria-label="${esc(f.etq)}, ${esc(c.etq)}: ${Md.f(val)}">${Md.f(val)}</td>`;
      }).join("") + "</tr>";
    });
    $(".bi-tabla-caja", raiz).innerHTML = h + "</tbody></table>";
    $(".bi-tabla-t", raiz).textContent = `${Md.n}: ${st.filas.map((d) => NOMBRE[d]).join(" › ") || "total"} × ${st.cols.map((d) => NOMBRE[d]).join("") || "total"}`;
    $(".bi-tabla-n", raiz).textContent = `${F.length} × ${C.length}`;
  }
  function detalle(fi, ci) {
    const { F, C } = mat, Md = M();
    const sel = activos().filter((r) => st.filas.every((d, i) => r[d] === F[fi].k[i]) && st.cols.every((d, i) => r[d] === C[ci].k[i]));
    const usados = [...st.filas, ...st.cols];
    const por = ["seccion", "bimestre", "curso", "grado"].find((d) => !usados.includes(d) && valores(d).length > 1);
    const desg = por ? valores(por).map((x) => [rotulo(por, x), medir(sel.filter((r) => r[por] === x), st.medida)]) : [];
    const riesgo = sel.filter((r) => r.promedio < NOTA_MIN).length;
    const desap = sel.reduce((a, r) => a + r.n - r.aprobados, 0), alumnos = sel.reduce((a, r) => a + r.n, 0);
    $(".bi-det", raiz).innerHTML = `<p><b>${esc(F[fi].etq)}${st.cols.length ? " · " + esc(C[ci].etq) : ""}</b> <span class="sutil">${Md.n.toLowerCase()} ${Md.f(mat.v[fi][ci])}</span></p>
      <div class="bi-det-fila">${desg.map(([n, x]) => `<span>${esc(n)}<b>${Md.f(x)}</b></span>`).join("")}
      <span>Registros<b>${sel.length}</b></span><span>Alumnos desaprobados<b>${desap} de ${alumnos}</b></span><span>En riesgo<b class="${riesgo ? "bi-mal" : "bi-bien"}">${riesgo || "ninguno"}</b></span></div>`;
  }

  // --- Preguntas ---
  // Contexto de los filtros en prosa: «de 3° en la sección A en Matemática en el bimestre II».
  const ctx = (excluir, prepGrado = "en") => DIMS.filter((d) => st.sel[d] && !excluir.includes(d)).map((d) => {
    const vs = valores(d).map((v) => d === "seccion" ? "la sección " + v : d === "bimestre" ? "el bimestre " + v : v);
    return `${d === "grado" ? prepGrado : "en"} ${vs.length > 1 ? vs.slice(0, -1).join(", ") + " y " + vs[vs.length - 1] : vs[0]}`;
  }).join(" ");
  const enSujeto = (etq) => etq.replace(/^Sección/, "la sección").replace(/^Bimestre/, "el bimestre");
  const FRASE = { promedio: ["el promedio más alto", "el promedio más bajo"], asistencia: ["la asistencia más alta", "la asistencia más baja"], aprobados: ["más aprobados", "menos aprobados"], desaprobados: ["más desaprobados", "menos desaprobados"] };
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  function preguntar(q) {
    const r = interpretar(q);
    const resp = $(".bi-resp", raiz), interp = $(".bi-interp", raiz);
    raiz.classList.toggle("bi-sin", !r);
    if (!r) {
      resp.innerHTML = `No entendí <q>${esc(q.trim() || "…")}</q>. Prueba a nombrar una medida (promedio, asistencia, aprobados), un grado, una sección, un curso o un bimestre, o toca una pregunta de ejemplo.`;
      interp.textContent = "";
      return null;
    }
    // Llevar la interpretación al estado de la tabla dinámica.
    st.medida = r.medida;
    DIMS.forEach((d) => { st.sel[d] = r.filtros[d] && r.filtros[d].size < DIM[d].length ? new Set(r.filtros[d]) : null; });
    const g = r.grupo;
    if (g.includes("bimestre")) { st.cols = ["bimestre"]; st.filas = g.filter((d) => d !== "bimestre").slice(0, 2); }
    else if (g.length >= 2) { st.filas = [g[0]]; st.cols = [g[1]]; }
    else if (g.length === 1) { st.filas = [g[0]]; st.cols = r.compara && !st.sel.bimestre ? ["bimestre"] : []; }
    else { st.filas = [DIMS.find((d) => !st.sel[d] && d !== "bimestre") || "grado"]; st.cols = st.sel.bimestre ? [] : ["bimestre"]; }
    st.filtros = DIMS.filter((d) => st.sel[d] && !st.filas.includes(d) && !st.cols.includes(d));
    st.destacar = null; st.celda = null; st.armado = null; cerrarPop();
    matriz();
    const { F, C, v } = mat, Md = M();
    let texto;
    if (r.sup) {
      const max = r.sup === "max" || (r.sup === "mejor" && Md.bueno > 0) || (r.sup === "peor" && Md.bueno < 0);
      let mejor = null;
      F.forEach((f, fi) => C.forEach((c, ci) => { if (!mejor || (max ? v[fi][ci] > mejor.v : v[fi][ci] < mejor.v)) mejor = { fi, ci, v: v[fi][ci] }; }));
      st.destacar = { f: mejor.fi, c: st.cols.length ? mejor.ci : null };
      const sujeto = enSujeto(F[mejor.fi].etq) + (st.cols.length ? " en " + enSujeto(C[mejor.ci].etq) : "");
      texto = `${cap(sujeto)} tiene ${FRASE[st.medida][max ? 0 : 1]} ${ctx([...st.filas, ...st.cols])}: <b>${Md.f(mejor.v)}</b>.`;
    } else if (r.compara && F.length >= 2) {
      const tot = F.map((f, fi) => medir(activos().filter((x) => st.filas.every((d, i) => x[d] === f.k[i])), st.medida));
      const [a, b] = tot[0] >= tot[1] ? [0, 1] : [1, 0];
      st.destacar = { f: a, c: null };
      texto = `${cap(enSujeto(F[a].etq))} supera a ${enSujeto(F[b].etq)} en ${Md.n.toLowerCase()} ${ctx(st.filas)}: <b>${Md.f(tot[a])}</b> frente a ${Md.f(tot[b])}.`;
    } else if (st.cols[0] === "bimestre" && g.includes("bimestre")) {
      texto = `${Md.n} ${ctx(st.filas, "de")} por bimestre: ${v[0].map((x, i) => `<b>${Md.f(x)}</b> (${C[i].corto})`).join(" → ")}.`;
    } else if (g.length) {
      const plano = []; F.forEach((f, fi) => C.forEach((c, ci) => plano.push({ v: v[fi][ci], etq: f.etq + (st.cols.length ? " · " + C[ci].corto : "") })));
      plano.sort((x, y) => x.v - y.v);
      const a = plano[0], b = plano[plano.length - 1];
      texto = `${Md.n} ${ctx([...st.filas, ...st.cols], "de")} por ${[...st.filas, ...st.cols].map((d) => NOMBRE[d].toLowerCase()).join(" y ")}: va de <b>${Md.f(a.v)}</b> (${esc(a.etq)}) a <b>${Md.f(b.v)}</b> (${esc(b.etq)}).`;
    } else {
      const total = medir(activos(), st.medida);
      const c = ctx([], "de");
      const verbo = { promedio: "El promedio", asistencia: "La asistencia", aprobados: "Los aprobados", desaprobados: "Los desaprobados" }[st.medida];
      texto = `${verbo} ${c || "general"} ${st.medida === "promedio" || st.medida === "asistencia" ? "es" : "son"} <b>${Md.f(total)}</b>${/aprobados/.test(st.medida) ? " del aula" : ""}.`;
    }
    resp.innerHTML = texto.replace(/\s+:/g, ":").replace(/\s{2,}/g, " ");
    const fl = DIMS.filter((d) => st.sel[d]).map((d) => `${NOMBRE[d]} = ${valores(d).join(", ")}`).join(", ");
    interp.innerHTML = `interpretado como: <span>medida: ${Md.n}</span> · <span>filtros: ${esc(fl) || "ninguno"}</span> · <span>agrupado por: ${[...st.filas, ...st.cols].map((d) => NOMBRE[d]).join(" › ") || "—"}</span>`;
    kpis(); constructor(); grafico(true); tabla();
    $(".bi-det", raiz).innerHTML = "<p>Toca una celda para ver su detalle.</p>";
    return texto;
  }

  function todo(animar) { matriz(); kpis(); constructor(); grafico(animar); tabla(); if (st.celda) detalle(...st.celda); }

  // --- Eventos ---
  $(".bi-ask-f", raiz).addEventListener("submit", (e) => { e.preventDefault(); preguntar(e.target.q.value); });
  let ultimoArrastre = 0;
  raiz.addEventListener("click", (e) => {
    const ej = e.target.closest(".bi-ej button");
    if (ej) { $(".bi-ask-f input", raiz).value = ej.dataset.q; preguntar(ej.dataset.q); return; }
    const med = e.target.closest(".bi-med button");
    if (med) { st.medida = med.dataset.m; st.destacar = null; todo(true); return; }
    if (e.target.closest(".bi-trans")) { transponer(); return; }
    if (Date.now() - ultimoArrastre < 200) return;
    // Con una ficha elegida, tocar cualquier zona (aunque sea sobre otra ficha) la suelta ahí.
    const zonaTocada = e.target.closest(".bi-zona");
    if (st.armado && zonaTocada && e.target.closest(".bi-chip")?.dataset.d !== st.armado) { mover(st.armado, zonaTocada.dataset.z); return; }
    const cn = e.target.closest(".bi-chip-n");
    if (cn) { const d = cn.closest(".bi-chip").dataset.d; st.armado = st.armado === d ? null : d; cerrarPop(); constructor(); return; }
    const cv = e.target.closest(".bi-chip-v");
    if (cv) { const d = cv.closest(".bi-chip").dataset.d; st.pop === d ? cerrarPop() : abrirPop(d); return; }
    const pb = e.target.closest("[data-pop]");
    if (pb) {
      if (pb.dataset.pop === "todos") { st.sel[st.pop] = null; st.destacar = null; const d = st.pop; todo(true); abrirPop(d); }
      else cerrarPop();
      return;
    }
    const td = e.target.closest("td[data-f]");
    if (td) { st.celda = [+td.dataset.f, +td.dataset.c]; raiz.querySelectorAll("td.bi-sel").forEach((x) => x.classList.remove("bi-sel")); td.classList.add("bi-sel"); detalle(...st.celda); return; }
    if (!e.target.closest(".bi-pop") && !e.target.closest(".bi-chip-v")) cerrarPop();
  });
  raiz.addEventListener("change", (e) => {
    const cb = e.target.closest(".bi-pop input");
    if (!cb || !st.pop) return;
    const d = st.pop, marc = [...$(".bi-pop", raiz).querySelectorAll("input")].filter((i) => i.checked).map((i) => i.value);
    if (!marc.length) { cb.checked = true; return; }
    st.sel[d] = marc.length === DIM[d].length ? null : new Set(marc);
    st.destacar = null; if (st.celda) st.celda = null;
    todo(true);
  });
  raiz.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { st.armado = null; cerrarPop(); constructor(); return; }
    const z = e.target.closest(".bi-zona");
    if (z && (e.key === "Enter" || e.key === " ") && st.armado) { e.preventDefault(); mover(st.armado, z.dataset.z); return; }
    const td = e.target.closest("td[data-f]");
    if (td && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); td.click(); }
  });

  // Arrastre con Pointer Events: funciona con ratón, dedo y lápiz.
  let drag = null;
  raiz.addEventListener("pointerdown", (e) => {
    const cn = e.target.closest(".bi-chip-n");
    if (!cn || e.button) return;
    drag = { d: cn.closest(".bi-chip").dataset.d, x: e.clientX, y: e.clientY, chip: cn.closest(".bi-chip"), fantasma: null, id: e.pointerId };
    cn.setPointerCapture(e.pointerId);
  });
  raiz.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    if (!drag.fantasma) {
      if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 6) return;
      drag.fantasma = drag.chip.cloneNode(true);
      drag.fantasma.className = "bi-chip bi-fantasma";
      document.body.appendChild(drag.fantasma);
      drag.chip.classList.add("bi-chip-arrastra");
      raiz.querySelectorAll(".bi-zona").forEach((z) => z.classList.add("bi-zona-dest"));
    }
    drag.fantasma.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`;
    const sobre = document.elementFromPoint(e.clientX, e.clientY)?.closest(".bi-zona");
    raiz.querySelectorAll(".bi-zona").forEach((z) => z.classList.toggle("bi-zona-sobre", z === sobre));
  });
  const soltar = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag;
    drag = null;
    if (!d.fantasma) return;
    ultimoArrastre = Date.now();
    d.fantasma.remove();
    d.chip.classList.remove("bi-chip-arrastra");
    const sobre = e.type === "pointerup" ? document.elementFromPoint(e.clientX, e.clientY)?.closest(".bi-zona") : null;
    raiz.querySelectorAll(".bi-zona").forEach((z) => z.classList.remove("bi-zona-sobre", "bi-zona-dest"));
    if (sobre && sobre.dataset.z !== zonaDe(d.d)) mover(d.d, sobre.dataset.z);
    else if (sobre) { st.armado = null; constructor(); }
  };
  raiz.addEventListener("pointerup", soltar);
  raiz.addEventListener("pointercancel", soltar);

  // Tooltip por marca (ratón, dedo o teclado).
  const tip = $(".bi-tip", raiz), cajaG = $(".bi-graf", raiz);
  const mostrarTip = (t) => {
    const d = t.dataset?.tip;
    if (!d) { tip.hidden = true; return; }
    const [a, v] = d.split("|");
    tip.innerHTML = `${esc(a)}<b>${esc(v)}</b>`;
    const r = t.getBoundingClientRect(), c = cajaG.getBoundingClientRect();
    tip.hidden = false;
    tip.style.left = Math.min(c.width - tip.offsetWidth - 4, Math.max(4, r.left - c.left + r.width / 2 - tip.offsetWidth / 2)) + "px";
    tip.style.top = Math.max(0, r.top - c.top - tip.offsetHeight - 6) + "px";
  };
  cajaG.addEventListener("pointerover", (e) => mostrarTip(e.target));
  cajaG.addEventListener("pointerleave", () => { tip.hidden = true; });
  cajaG.addEventListener("focusin", (e) => mostrarTip(e.target));
  cajaG.addEventListener("focusout", () => { tip.hidden = true; });

  todo(true);
  let previo = 0;
  new ResizeObserver(([x]) => { const w = Math.round(x.contentRect.width); if (w && w !== previo) { previo = w; grafico(false); } }).observe($(".bi-graf-caja", raiz));
  return { pausar() {}, reanudar() {}, preguntar };
}
// ---------- Estilos (se inyectan una sola vez) ----------
function estilos() {
  if (document.getElementById("bi-css")) return;
  const s = document.createElement("style");
  s.id = "bi-css";
  s.textContent = `
.bi-x { display: flex; flex-direction: column; gap: 10px; flex: 1; min-height: 0; min-width: 0; font-variant-numeric: tabular-nums; color: var(--t-tinta, #17130f); }
.bi-x .panel { padding: 12px; }
.bi-x .panel > header { margin-bottom: 8px; }
.bi-x .panel h4 { font-size: 13px; }
.bi-x button { font: inherit; color: inherit; }
.bi-x label { display: flex; align-items: center; gap: 8px; margin: 0; font-size: 13px; font-weight: 500; padding: 5px 4px; border-radius: 6px; cursor: pointer; }
.bi-x label:hover { background: var(--t-niebla, #f6f4f1); }
.bi-x label input { width: 16px; height: 16px; margin: 0; accent-color: var(--t-tinta, #17130f); }

/* Pregunta */
.bi-ask { background: var(--t-niebla, #f6f4f1); border: 1px solid var(--t-linea, #e8e2db); border-radius: 16px; padding: 12px 14px 12px; }
.bi-ask-l { display: block; font-size: 13px; font-weight: 600; margin: 0 0 6px; padding: 0; }
.bi-ask-fila { display: flex; gap: 8px; }
.bi-x .bi-ask-fila input { flex: 1; min-width: 0; width: auto; font: inherit; font-size: 16px; padding: 9px 12px; border-radius: 11px; border: 1px solid var(--t-linea, #e8e2db); background: #fff; color: inherit; }
.bi-ask-fila button { border: 0; border-radius: 11px; padding: 9px 14px; font-size: 14px; font-weight: 600; background: var(--t-tinta, #17130f); color: #fff; cursor: pointer; white-space: nowrap; }
.bi-ej { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px; }
.bi-ej button { font-size: 12px; color: var(--t-grafito, #6e655d); background: #fff; border: 1px solid var(--t-linea, #e8e2db); border-radius: 99px; padding: 5px 10px; cursor: pointer; text-align: left; transition: border-color .15s, color .15s; }
.bi-ej button:hover { border-color: var(--t-tinta, #17130f); color: var(--t-tinta, #17130f); }
.bi-resp { margin-top: 10px; font-size: 16px; line-height: 1.35; letter-spacing: -.005em; }
.bi-resp b { font-size: 22px; font-weight: 600; letter-spacing: -.02em; }
.bi-resp q { quotes: "«" "»"; }
.bi-sin .bi-resp { color: var(--t-mal, #c2410c); }
.bi-interp { font-size: 12px; color: var(--t-grafito, #6e655d); margin-top: 4px; line-height: 1.4; }
.bi-interp:empty { display: none; }
.bi-interp span { white-space: nowrap; }

/* KPI */
.bi-kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
.bi-kpi { border: 1px solid var(--t-linea, #e8e2db); border-radius: 12px; padding: 9px 11px; min-width: 0; background: #fff; }
.bi-kpi > span { font-size: 12px; color: var(--t-grafito, #6e655d); }
.bi-kpi-v { display: flex; justify-content: space-between; align-items: center; gap: 6px; }
.bi-kpi-v b { font-size: 21px; font-weight: 600; letter-spacing: -.02em; line-height: 1.2; white-space: nowrap; }
.bi-kpi-v em { color: var(--t-arcilla, #d97757); line-height: 0; flex: none; }
.bi-kpi > small { display: block; font-size: 11px; color: var(--t-grafito, #6e655d); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* Constructor de la tabla dinámica */
.bi-x .bi-pv { position: relative; }
.bi-pv-acc { display: flex; align-items: center; gap: 10px; }
.bi-pista { font-size: 12px; color: var(--t-arcilla-d, #b4532f); font-weight: 600; }
.bi-trans { border: 1px solid var(--t-linea, #e8e2db); background: #fff; border-radius: 9px; padding: 5px 10px; font-size: 12px; font-weight: 600; cursor: pointer; }
.bi-trans:hover { border-color: var(--t-tinta, #17130f); }
.bi-zonas { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
.bi-zona { min-height: 40px; border: 1px dashed var(--t-linea, #e8e2db); border-radius: 10px; padding: 4px 6px; display: flex; flex-wrap: wrap; gap: 4px; align-items: center; min-width: 0; transition: background .15s, border-color .15s; }
.bi-zona-n { font-size: 11px; font-weight: 600; color: var(--t-grafito, #6e655d); min-width: 54px; }
.bi-zona-vacia { font-size: 11px; color: #a39a91; }
.bi-zona-dest { border-color: var(--t-arcilla, #d97757); background: #fdf6f2; cursor: pointer; }
.bi-zona-sobre { background: #fbe6db; border-style: solid; }
.bi-chip { display: inline-flex; align-items: stretch; background: #fff; border: 1px solid var(--t-linea, #e8e2db); border-radius: 8px; font-size: 12px; box-shadow: 0 1px 1px rgba(23, 19, 15, .05); user-select: none; -webkit-user-select: none; }
.bi-chip-n { border: 0; background: transparent; padding: 5px 8px; font-weight: 600; cursor: grab; touch-action: none; border-radius: 7px 0 0 7px; }
.bi-chip-n:active { cursor: grabbing; }
.bi-chip-v { border: 0; border-left: 1px solid var(--t-linea, #e8e2db); background: transparent; padding: 5px 7px; color: var(--t-grafito, #6e655d); cursor: pointer; white-space: nowrap; }
.bi-chip-sel .bi-chip-v { color: var(--t-arcilla-d, #b4532f); font-weight: 600; }
.bi-chip-arm { border-color: var(--t-arcilla, #d97757); box-shadow: 0 0 0 2px #f6d8c8; }
.bi-chip-arrastra { opacity: .35; }
.bi-fantasma { position: fixed; left: 0; top: 0; z-index: 60; pointer-events: none; box-shadow: 0 12px 26px -10px rgba(23, 19, 15, .5); transform-origin: center; }
.bi-med { margin-top: 8px; flex-wrap: wrap; }
.bi-x .bi-med button { padding: 5px 10px; font-size: 12px; }
.bi-pop { position: absolute; z-index: 20; background: #fff; border: 1px solid var(--t-linea, #e8e2db); border-radius: 12px; padding: 8px; min-width: 170px; box-shadow: 0 16px 32px -16px rgba(23, 19, 15, .4); }
.bi-pop-t { font-size: 12px; font-weight: 600; color: var(--t-grafito, #6e655d); padding: 2px 4px 6px; }
.bi-pop-acc { display: flex; justify-content: space-between; gap: 6px; margin-top: 6px; border-top: 1px solid var(--t-linea, #e8e2db); padding-top: 6px; }
.bi-pop-acc button { border: 0; background: transparent; font-size: 12px; font-weight: 600; cursor: pointer; padding: 4px 6px; border-radius: 6px; color: var(--t-grafito, #6e655d); }
.bi-pop-acc button:last-child { background: var(--t-tinta, #17130f); color: #fff; padding: 4px 10px; }

/* Gráfico */
.bi-cuerpo { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr); gap: 10px; }
.bi-graf { display: flex; flex-direction: column; }
.bi-graf-caja { height: 230px; position: relative; }
.bi-graf-caja svg { display: block; position: absolute; inset: 0; overflow: visible; }
.bi-graf-caja text { font-size: 11px; fill: var(--t-grafito, #6e655d); font-family: inherit; }
.bi-graf-caja .bi-val { fill: var(--t-tinta, #17130f); font-weight: 600; font-size: 12px; }
.bi-rej { stroke: var(--t-linea, #e8e2db); stroke-width: 1; }
.bi-umbral { stroke: var(--t-tinta, #17130f); stroke-dasharray: 4 4; stroke-width: 1; opacity: .5; }
.bi-barra, .bi-graf-caja circle { cursor: pointer; transition: opacity .15s; outline: none; }
.bi-graf-caja svg:hover .bi-barra:not(:hover):not(.bi-dest) { opacity: .55; }
.bi-apag { opacity: .28; }
.bi-barra:focus-visible, .bi-graf-caja circle:focus-visible { stroke: var(--t-tinta, #17130f); stroke-width: 2; }
.bi-anima .bi-barra { transform-box: fill-box; transform-origin: bottom; animation: bi-crece .55s cubic-bezier(.2, .8, .2, 1) both; animation-delay: var(--d); }
.bi-anima .bi-traza { stroke-dasharray: 1; stroke-dashoffset: 1; animation: bi-traza .7s ease-out forwards; }
.bi-anima circle { animation: bi-punto .3s ease-out both; animation-delay: calc(var(--d) + .3s); }
@keyframes bi-crece { from { transform: scaleY(0); } }
@keyframes bi-traza { to { stroke-dashoffset: 0; } }
@keyframes bi-punto { from { opacity: 0; } }
.bi-ley { display: flex; gap: 10px; flex-wrap: wrap; font-size: 12px; color: var(--t-grafito, #6e655d); }
.bi-ley i { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-right: 5px; vertical-align: -1px; }
.bi-ley i.bi-raya { width: 16px; height: 0; border-top: 1.5px dashed var(--t-tinta, #17130f); border-radius: 0; opacity: .6; vertical-align: 3px; }
.bi-nota { color: var(--t-arcilla-d, #b4532f); }
.bi-tip { position: absolute; z-index: 5; pointer-events: none; background: var(--t-tinta, #17130f); color: #fff; font-size: 12px; border-radius: 9px; padding: 6px 10px; max-width: 200px; white-space: nowrap; box-shadow: 0 8px 20px -8px rgba(0, 0, 0, .4); }
.bi-tip b { display: block; font-size: 15px; }

/* Tabla de calor */
.bi-tabla-caja { overflow-x: auto; }
.bi-tabla-caja table { width: 100%; border-collapse: separate; border-spacing: 2px; }
.bi-tabla-caja th { font-size: 12px; font-weight: 500; color: var(--t-grafito, #6e655d); text-align: left; padding: 4px 6px; white-space: nowrap; vertical-align: middle; }
.bi-tabla-caja th.bi-th-dim { font-size: 11px; }
.bi-tabla-caja tbody th { font-weight: 600; color: var(--t-tinta, #17130f); }
.bi-tabla-caja td { text-align: right; padding: 7px 8px; border-radius: 7px; cursor: pointer; font-size: 13px; white-space: nowrap; outline: none;
  background: color-mix(in oklab, #2a78d6 calc(var(--k) * 72% + 6%), #ffffff); transition: box-shadow .12s; }
.bi-tabla-caja td.bi-osc { color: #fff; }
.bi-tabla-caja td:hover, .bi-tabla-caja td:focus-visible { box-shadow: inset 0 0 0 2px rgba(23, 19, 15, .4); }
.bi-tabla-caja td.bi-sel { box-shadow: inset 0 0 0 2px var(--t-tinta, #17130f); }
.bi-tabla-caja td.bi-dest { box-shadow: 0 0 0 2px var(--t-arcilla, #d97757); font-weight: 700; }
.bi-det { margin-top: 8px; font-size: 13px; color: var(--t-grafito, #6e655d); border-top: 1px solid var(--t-linea, #e8e2db); padding-top: 8px; min-height: 46px; }
.bi-det p b { color: var(--t-tinta, #17130f); }
.bi-det-fila { display: flex; gap: 14px; flex-wrap: wrap; margin-top: 6px; }
.bi-det-fila span { font-size: 12px; }
.bi-det-fila b { display: block; font-size: 16px; color: var(--t-tinta, #17130f); font-weight: 600; }
.bi-det-fila b.bi-mal { color: var(--t-mal, #c2410c); } .bi-det-fila b.bi-bien { color: var(--t-bien, #11865a); }

@container taller (max-width: 760px) { .bi-cuerpo { grid-template-columns: minmax(0, 1fr); } }
@container taller (max-width: 560px) {
  .bi-kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .bi-zonas { grid-template-columns: minmax(0, 1fr); }
  .bi-graf-caja { height: 200px; }
  .bi-resp { font-size: 15px; } .bi-resp b { font-size: 20px; }
  .bi-kpi-v b { font-size: 19px; }
  .bi-ask-fila button { padding: 9px 11px; }
}
@media (max-width: 560px) {
  .bi-kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .bi-zonas { grid-template-columns: minmax(0, 1fr); }
  .bi-cuerpo { grid-template-columns: minmax(0, 1fr); }
}
@media (prefers-reduced-motion: reduce) {
  .bi-anima .bi-barra, .bi-anima .bi-traza, .bi-anima circle { animation: none; stroke-dashoffset: 0; }
  .bi-x * { transition: none !important; }
}`;
  document.head.appendChild(s);
}
