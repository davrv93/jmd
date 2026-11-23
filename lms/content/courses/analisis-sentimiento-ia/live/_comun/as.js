/* Análisis de sentimiento con IA (as-01): API del LIVE, estado, motor de análisis y gráficas en SVG.
   La IA va por POST /api/v1/live/{lección}/escenario con la clave de DeepSeek de la clase; el formato y las
   reglas salen del escenario.json de la escena. Sin IA hay una estimación local con léxico. */
(function () {
  "use strict";
  try {
    var tema = new URLSearchParams(location.search).get("tema");
    if (tema === "dark" || tema === "light") document.documentElement.setAttribute("data-tema", tema);
  } catch (e) { /* sin parámetros */ }
  var partes = location.pathname.split("/");
  var i = partes.indexOf("live");
  var LECCION = i >= 0 ? decodeURIComponent(partes[i + 1] || "") : "as-01";
  var j = partes.indexOf("escenas");
  var ESCENA = j >= 0 ? decodeURIComponent(partes[j + 1] || "") : "";
  var CLAVE = "as-" + LECCION + "-v1";
  var SVGNS = "http://www.w3.org/2000/svg";

  // ---------- utilidades ----------
  function h(tag, attrs, hijos) {
    var el = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (attrs[k] == null || attrs[k] === false) continue;
      if (k === "text") el.textContent = attrs[k];
      else if (k === "class") el.className = attrs[k];
      else if (k === "style") el.setAttribute("style", attrs[k]);
      else if (k.slice(0, 2) === "on") el.addEventListener(k.slice(2), attrs[k]);
      else el.setAttribute(k, attrs[k] === true ? "" : attrs[k]);
    }
    (hijos || []).forEach(function (x) { if (x != null) el.appendChild(typeof x === "string" ? document.createTextNode(x) : x); });
    return el;
  }
  function s(tag, attrs, hijos) {
    var el = document.createElementNS(SVGNS, tag);
    if (attrs) for (var k in attrs) if (attrs[k] != null) { if (k === "text") el.textContent = attrs[k]; else el.setAttribute(k, attrs[k]); }
    (hijos || []).forEach(function (x) { if (x) el.appendChild(x); });
    return el;
  }
  function cargar() { try { return JSON.parse(localStorage.getItem(CLAVE) || "null") || {}; } catch (e) { return {}; } }
  function guardar(o) { try { localStorage.setItem(CLAVE, JSON.stringify(o)); } catch (e) { /* sin almacenamiento */ } }
  function pct(x) { return (isFinite(x) ? Math.round(x * 100) : 0) + " %"; }
  function quieto() { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } }

  function api(ruta, cuerpo, metodo) {
    return fetch("/api/v1/live/" + encodeURIComponent(LECCION) + ruta, {
      method: metodo || (cuerpo ? "POST" : "GET"), credentials: "same-origin", cache: "no-store",
      headers: cuerpo ? { "Content-Type": "application/json" } : {}, body: cuerpo ? JSON.stringify(cuerpo) : undefined
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (b) { return { estado: r.status, b: b }; });
    }).catch(function () { return { estado: 0, b: {} }; });
  }
  function ia(pedido, muestra) {
    return api("/escenario", { escena: ESCENA, pedido: pedido, empresa: { razon: "Laboratorio de sentimiento", rubro: "análisis de textos", regimen: "Plutchik" }, muestra: muestra }).then(function (x) {
      if (x.estado === 200 && x.b && x.b.escenario) return { ok: true, tablas: x.b.escenario.tablas || {} };
      var msg = x.estado === 429 ? "Llegaste al tope de hoy de la IA de la clase." : x.estado === 503 ? "La IA de la clase no está disponible ahora." : x.estado === 0 ? "Sin conexión con el LMS." : "DeepSeek no respondió bien.";
      return { ok: false, msg: msg };
    });
  }
  function evidencia(detalle) { return api("/evidencia", { escena: ESCENA, tipo: "hallazgo", detalle: String(detalle).slice(0, 200) }); }
  function muroPublicar(texto) { return api("/muro", { escena: ESCENA, texto: String(texto).slice(0, 200) }); }
  function muroLeer() { return api("/muro?escena=" + encodeURIComponent(ESCENA)).then(function (x) { return (x.b && x.b.entradas) || []; }); }

  function copiar(texto) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(texto).then(function () { return true; }, function () { return copiarViejo(texto); });
    return Promise.resolve(copiarViejo(texto));
  }
  function copiarViejo(texto) {
    var ta = h("textarea", { style: "position:fixed;left:-9999px" }); ta.value = texto; document.body.appendChild(ta); ta.select();
    var ok = false; try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    ta.remove(); return ok;
  }
  function descargar(nombre, texto, tipo) {
    var a = h("a", { href: URL.createObjectURL(new Blob(["﻿" + texto], { type: tipo || "text/csv" })), download: nombre });
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  var toastEl = null, toastT = 0;
  function toast(msg) {
    if (!toastEl) { toastEl = h("div", { class: "toast", role: "status", "aria-live": "polite" }); document.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.classList.add("ver"); clearTimeout(toastT);
    toastT = setTimeout(function () { toastEl.classList.remove("ver"); }, 2600);
  }

  // ---------- emociones (Plutchik) ----------
  var EMO = [
    { id: "alegría", c: "#F2B705", n: ["serenidad", "alegría", "éxtasis"] },
    { id: "confianza", c: "#7CB342", n: ["aceptación", "confianza", "admiración"] },
    { id: "miedo", c: "#1B9E77", n: ["aprensión", "miedo", "terror"] },
    { id: "sorpresa", c: "#26A6D1", n: ["distracción", "sorpresa", "asombro"] },
    { id: "tristeza", c: "#3F6FD8", n: ["melancolía", "tristeza", "pena"] },
    { id: "aversión", c: "#8E5CC2", n: ["aburrimiento", "aversión", "odio"] },
    { id: "ira", c: "#E0453A", n: ["enfado", "ira", "furia"] },
    { id: "anticipación", c: "#F08A24", n: ["interés", "anticipación", "vigilancia"] }
  ];
  var COLPOL = { pos: "var(--ok)", neu: "var(--muted)", neg: "var(--bad)" };
  var NOMPOL = { pos: "positivo", neu: "neutro", neg: "negativo" };

  // ---------- CSV ----------
  function csv(texto) {
    texto = String(texto || "").replace(/^﻿/, "");
    var linea1 = texto.split(/\r?\n/)[0] || "";
    var sep = (linea1.split(";").length > linea1.split(",").length) ? ";" : (linea1.indexOf("\t") >= 0 ? "\t" : ",");
    var filas = [], f = [], c = "", q = false;
    for (var k = 0; k < texto.length; k++) {
      var ch = texto[k];
      if (q) { if (ch === '"') { if (texto[k + 1] === '"') { c += '"'; k++; } else q = false; } else c += ch; }
      else if (ch === '"') q = true;
      else if (ch === sep) { f.push(c); c = ""; }
      else if (ch === "\n" || ch === "\r") { if (ch === "\r" && texto[k + 1] === "\n") k++; f.push(c); filas.push(f); f = []; c = ""; }
      else c += ch;
    }
    if (c || f.length) { f.push(c); filas.push(f); }
    return filas.filter(function (r) { return r.some(function (x) { return String(x).trim(); }); });
  }
  function fechaISO(v) {
    v = String(v || "").trim();
    var m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); if (m) return m[1] + "-" + ("0" + m[2]).slice(-2) + "-" + ("0" + m[3]).slice(-2);
    m = v.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/); if (m) { var y = m[3].length === 2 ? "20" + m[3] : m[3]; return y + "-" + ("0" + m[2]).slice(-2) + "-" + ("0" + m[1]).slice(-2); }
    return "";
  }
  // Convierte texto pegado o un CSV en filas {t, f, n, s}. Si no hay columnas, cada línea es un texto.
  function leerTabla(texto) {
    var raw = csv(texto);
    if (!raw.length) return { filas: [], columnas: "" };
    var ancho = Math.max.apply(null, raw.map(function (r) { return r.length; }));
    if (ancho < 2) return { filas: raw.map(function (r) { return { t: String(r[0]).trim() }; }).filter(function (r) { return r.t.length > 2; }).slice(0, 400), columnas: "una columna de textos" };
    var cab = raw[0].map(function (x) { return String(x).trim(); });
    var conCab = cab.every(function (x) { return x.length < 40; }) && raw.length > 1;
    var datos = conCab ? raw.slice(1) : raw;
    var cols = [];
    for (var c = 0; c < ancho; c++) {
      var vals = datos.map(function (r) { return String(r[c] == null ? "" : r[c]).trim(); }).filter(Boolean);
      var largo = vals.reduce(function (a, v) { return a + v.length; }, 0) / Math.max(1, vals.length);
      var fechas = vals.filter(function (v) { return fechaISO(v); }).length;
      var notas = vals.filter(function (v) { return /^\d{1,2}$/.test(v) && +v <= 10; }).length;
      var unicos = {}; vals.forEach(function (v) { unicos[v] = 1; });
      cols.push({ c: c, nombre: conCab ? cab[c] : "col" + (c + 1), largo: largo, fechas: fechas / Math.max(1, vals.length), notas: notas / Math.max(1, vals.length), unicos: Object.keys(unicos).length, n: vals.length });
    }
    var txt = cols.slice().sort(function (a, b) { return b.largo - a.largo; })[0];
    var fec = cols.filter(function (x) { return x !== txt && x.fechas > 0.7; })[0];
    var nota = cols.filter(function (x) { return x !== txt && x !== fec && x.notas > 0.8; })[0];
    var seg = cols.filter(function (x) { return x !== txt && x !== fec && x !== nota && x.unicos >= 2 && x.unicos <= 15 && x.largo < 30; })[0];
    var filas = datos.map(function (r) {
      var o = { t: String(r[txt.c] || "").trim() };
      if (fec) o.f = fechaISO(r[fec.c]);
      if (nota && /^\d{1,2}$/.test(String(r[nota.c]).trim())) o.n = +String(r[nota.c]).trim();
      if (seg) o.s = String(r[seg.c] || "").trim();
      return o;
    }).filter(function (o) { return o.t.length > 2; }).slice(0, 400);
    var desc = "texto: «" + txt.nombre + "»" + (fec ? " · fecha: «" + fec.nombre + "»" : "") + (nota ? " · nota 0–10: «" + nota.nombre + "»" : "") + (seg ? " · grupo: «" + seg.nombre + "»" : "");
    return { filas: filas, columnas: desc };
  }

  // ---------- léxico local (respaldo sin IA) ----------
  function norm(t) { return String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }
  var LEX = {
    "alegría": "feliz alegr encant genial excelente buenaz bacan chever gust disfrut contento emocion maravill fantast lindo bonit divert super top ideal perfect felicit gracias agradec recomien",
    "confianza": "confi segur claro clara amable atent profesional respons cumpl puntual ayud apoy resolv recomend bien explic pacien calidad confiable orden organiz",
    "miedo": "miedo temo temor preocup ansie nervios riesgo peligr inseguro incertidumbre asust estres despid",
    "sorpresa": "sorpre inesper increible wow no esperaba asombr de repente rapidisim",
    "tristeza": "triste pena lament decepcion desanim perdi perdido lastima extran solo cansad agotad frustr lento lenta",
    "aversión": "asco horrible pesim terrible malisim sucio feo aburr fastidi cansa harto odio desagrad insoport",
    "ira": "molest indign rabia colera furia enoj harto abuso falta de respeto nunca llega demor tarde reclam estafa robo cobr de mas inaceptable grit",
    "anticipación": "espero esperando ojala proxim pronto quiero mas futuro ansioso plan expectativ ganas"
  };
  var POSW = "bueno buena buenos buenas mejor excelente genial encanta encanto gusto gusta feliz rapido rapida amable claro clara util recomiendo perfecto gracias bacan chevere bonito lindo facil ordenado limpio puntual".split(" ");
  var NEGW = "malo mala malos malas peor pesimo pesima horrible terrible lento lenta tarde nunca falta faltaba sucio caro cara problema problemas error fallo falla demora demoro cortes corta congela decepcion molesto molesta reclamo queja quejas difícil dificil confuso confusa aburrido".split(" ");
  var NEGA = ["no", "nunca", "ni", "tampoco", "sin", "jamas"];
  var ASPGEN = { "precio": "precio caro barato cobr costo pago descuento", "atención": "atencion atend amable trato personal vendedor", "entrega": "delivery entreg envio llego demor pedido", "calidad": "calidad producto funciona fallo falla", "tiempo": "espera cola tiempo tarde rapido lento", "contenido": "clase curso tema contenido ejemplo material", "personas": "jefe docente profe companer equipo lider" };
  function lexico(t) {
    var w = norm(t).replace(/[^a-z0-9ñ ]/g, " ").split(/\s+/).filter(Boolean);
    var score = 0;
    w.forEach(function (x, k) {
      var neg = NEGA.indexOf(w[k - 1]) >= 0 || NEGA.indexOf(w[k - 2]) >= 0;
      var v = POSW.indexOf(x) >= 0 ? 1 : NEGW.indexOf(x) >= 0 ? -1 : 0;
      if (v && (w[k - 1] === "muy" || w[k - 1] === "super" || w[k - 1] === "demasiado")) v *= 1.5;
      score += neg ? -v : v;
    });
    var nt = norm(t), mejor = "", mx = 0;
    EMO.forEach(function (e) {
      var k = LEX[e.id].split(" ").filter(function (r) { return r && nt.indexOf(r) >= 0; }).length;
      if (k > mx) { mx = k; mejor = e.id; }
    });
    var p = score > 0.4 ? "pos" : score < -0.4 ? "neg" : (mejor && ["alegría", "confianza"].indexOf(mejor) >= 0 ? "pos" : mejor && ["tristeza", "ira", "aversión", "miedo"].indexOf(mejor) >= 0 ? "neg" : "neu");
    if (p === "neu") mejor = "ninguna";
    else if (!mejor) mejor = p === "pos" ? "alegría" : "tristeza";
    var asp = "general", am = 0;
    Object.keys(ASPGEN).forEach(function (a) { var k = ASPGEN[a].split(" ").filter(function (r) { return nt.indexOf(r) >= 0; }).length; if (k > am) { am = k; asp = a; } });
    return { p: p, e: mejor, i: Math.min(3, 1 + Math.round(Math.abs(score))), a: asp, x: false };
  }

  // ---------- análisis con IA (lotes de 40, hasta 120) ----------
  function conIA(filas, avance) {
    var lotes = [], max = Math.min(filas.length, 120);
    for (var k = 0; k < max; k += 40) lotes.push(filas.slice(k, k + 40).map(function (f, m) { return { n: k + m + 1, texto: f.t.slice(0, 170) }; }));
    var hechos = 0, fallo = null, res = {};
    function uno(lote) {
      return ia("Clasifica estos " + lote.length + " textos: polaridad, emoción de Plutchik, intensidad, aspecto y sarcasmo.", { filas: lote }).then(function (x) {
        hechos++; if (avance) avance(hechos, lotes.length);
        if (!x.ok) { fallo = x.msg; return; }
        (x.tablas.Clasificacion || []).forEach(function (r) { if (r && r[0] != null) res[+r[0]] = r; });
      });
    }
    var cadena = Promise.resolve();
    lotes.forEach(function (l) { cadena = cadena.then(function () { return uno(l); }); });
    return cadena.then(function () {
      var conteo = 0;
      var out = filas.map(function (f, k) {
        var r = res[k + 1];
        if (!r) return Object.assign({}, f, lexico(f.t), { fuente: "léxico" });
        conteo++;
        var p = { positivo: "pos", negativo: "neg", neutro: "neu" }[String(r[1]).toLowerCase()] || "neu";
        var e = String(r[2] || "ninguna").toLowerCase(); if (!EMO.some(function (x) { return x.id === e; })) e = p === "neu" ? "ninguna" : (p === "pos" ? "alegría" : "tristeza");
        if (p === "neu") e = "ninguna";
        return Object.assign({}, f, { p: p, e: e, i: Math.max(1, Math.min(3, +r[3] || 2)), a: String(r[4] || "general").toLowerCase().slice(0, 30), x: /^s/i.test(String(r[5] || "")), fuente: "IA" });
      });
      return { filas: out, conIA: conteo, fallo: fallo };
    });
  }

  // ---------- métricas ----------
  var STOP = ("de la que el en y a los se del las un por con no una su para es al lo como mas pero sus le ya o este si porque esta entre cuando muy sin sobre tambien me hasta hay donde quien desde todo nos durante todos uno les ni contra otros ese eso ante ellos e esto mi antes algunos que unos yo otro otras otra el tanto esa estos mucho quienes nada muchos cual poco ella estar estas algunas algo nosotros mis tu te ti tus ellas nosotras vosotros os mio mia tuyo suyo era fue ha han he hemos son ser estoy esta estan estaba tengo tiene tienen tenia hace hizo hacer bien mal asi aqui alli ahora siempre vez veces cada dia dias semana mes curso clase sesion botica empresa area grupo sede dijo vuestra merced don quijote sancho senor aunque parece podia sabia quiero creo sido hubo pues igual ahi luego despues nadie toda todas cosa cosas otra solo sera seria puede pueden hacia").split(" ");
  function palabras(t) { return norm(t).replace(/[^a-z0-9ñ ]/g, " ").split(/\s+/).filter(function (w) { return w.length > 3 && STOP.indexOf(w) < 0 && !/^\d+$/.test(w); }); }
  function analizar(filas) {
    var R = { total: filas.length, pol: { pos: 0, neu: 0, neg: 0 }, emo: {}, emoInt: {}, asp: {}, seg: {}, tiempo: {}, notas: [], sarc: 0, arbol: {}, clave: {} };
    EMO.forEach(function (e) { R.emo[e.id] = 0; R.emoInt[e.id] = [0, 0, 0]; R.clave[e.id] = {}; });
    filas.forEach(function (f) {
      R.pol[f.p] = (R.pol[f.p] || 0) + 1;
      if (R.emo[f.e] != null) { R.emo[f.e]++; R.emoInt[f.e][(f.i || 2) - 1]++; palabras(f.t).forEach(function (w) { R.clave[f.e][w] = (R.clave[f.e][w] || 0) + 1; }); }
      var a = f.a || "general"; R.asp[a] = R.asp[a] || { pos: 0, neu: 0, neg: 0 }; R.asp[a][f.p]++;
      if (f.s) { R.seg[f.s] = R.seg[f.s] || { pos: 0, neu: 0, neg: 0, asp: {} }; R.seg[f.s][f.p]++; if (f.p === "neg") R.seg[f.s].asp[a] = (R.seg[f.s].asp[a] || 0) + 1; }
      var clave = f.f ? semana(f.f) : (f.o != null ? "Cap. " + (f.s || "").replace(/^Capítulo\s*/, "") : "");
      if (clave) { R.tiempo[clave] = R.tiempo[clave] || { pos: 0, neu: 0, neg: 0, orden: f.f || ("0000" + (f.o || 0)).slice(-4) }; R.tiempo[clave][f.p]++; }
      if (typeof f.n === "number") R.notas.push(f.n);
      if (f.x) R.sarc++;
      if (f.e && f.e !== "ninguna") { var A = R.arbol[f.e] = R.arbol[f.e] || {}; (A[a] = A[a] || []).push(f); }
    });
    if (R.notas.length) {
      var pro = R.notas.filter(function (n) { return n >= 9; }).length, det = R.notas.filter(function (n) { return n <= 6; }).length;
      R.nps = Math.round((pro - det) / R.notas.length * 100); R.pro = pro; R.det = det; R.pas = R.notas.length - pro - det;
    }
    var dom = EMO.slice().sort(function (a, b) { return R.emo[b.id] - R.emo[a.id]; })[0];
    R.dominante = R.emo[dom.id] ? dom.id : "ninguna";
    R.alertas = alertas(filas); R.patrones = patrones(filas);
    return R;
  }
  function semana(iso) {
    var d = new Date(iso + "T12:00:00"); if (isNaN(d)) return "";
    var dia = (d.getDay() + 6) % 7; d.setDate(d.getDate() - dia);
    return d.toISOString().slice(0, 10);
  }
  function alertas(filas) {
    var fechas = filas.map(function (f) { return f.f; }).filter(Boolean).sort();
    var out = [], q = fechas.length ? "quejas" : "textos negativos";
    if (fechas.length) {
      var fin = new Date(fechas[fechas.length - 1] + "T12:00:00"), ini = new Date(fin); ini.setDate(ini.getDate() - 6);
      var I = ini.toISOString().slice(0, 10), c = {};
      filas.forEach(function (f) { if (f.p === "neg" && f.f && f.f >= I) { var k = (f.a || "general") + (f.s ? " · " + f.s : ""); c[k] = (c[k] || 0) + 1; } });
      Object.keys(c).sort(function (a, b) { return c[b] - c[a]; }).forEach(function (k) {
        if (c[k] >= 3) out.push({ n: c[k], texto: c[k] + " " + q + " de «" + k.split(" · ")[0] + "»" + (k.indexOf(" · ") > 0 ? " en " + k.split(" · ")[1] : "") + " en la última semana (hasta el " + fechas[fechas.length - 1].split("-").reverse().join("/") + ")" });
      });
    }
    var segs = {};
    filas.forEach(function (f) { if (f.p === "neg" && f.s) { var k = f.a || "general"; segs[k] = segs[k] || {}; segs[k][f.s] = (segs[k][f.s] || 0) + 1; } });
    Object.keys(segs).forEach(function (a) {
      var tot = 0, top = "", mx = 0; Object.keys(segs[a]).forEach(function (sg) { tot += segs[a][sg]; if (segs[a][sg] > mx) { mx = segs[a][sg]; top = sg; } });
      if (tot >= 6 && mx / tot >= 0.6) out.push({ n: mx, texto: "El " + Math.round(mx / tot * 100) + " % de " + (q === "quejas" ? "las quejas" : "los textos negativos") + " de «" + a + "» viene de " + top + " (" + mx + " de " + tot + ")" });
    });
    return out.sort(function (a, b) { return b.n - a.n; }).slice(0, 5);
  }
  function patrones(filas) {
    var items = filas.map(function (f, k) { var w = {}; palabras(f.t).forEach(function (x) { w[x.slice(0, 6)] = 1; }); return { k: k, w: Object.keys(w), f: f }; }).filter(function (x) { return x.w.length >= 2; });
    var usados = {}, grupos = [];
    items.forEach(function (a) {
      if (usados[a.k]) return;
      var g = [a];
      items.forEach(function (b) {
        if (b === a || usados[b.k] || b.f.p !== a.f.p) return;
        var inter = a.w.filter(function (x) { return b.w.indexOf(x) >= 0; }).length, uni = a.w.length + b.w.length - inter;
        if (inter >= 2 && inter / uni >= 0.22) g.push(b);
      });
      if (g.length >= 3) { g.forEach(function (x) { usados[x.k] = 1; }); grupos.push(g); }
    });
    return grupos.sort(function (a, b) { return b.length - a.length; }).slice(0, 5).map(function (g) {
      var c = {}; g.forEach(function (x) { x.w.forEach(function (w) { c[w] = (c[w] || 0) + 1; }); });
      var top = Object.keys(c).sort(function (a, b) { return c[b] - c[a]; }).slice(0, 3);
      var asp = {}; g.forEach(function (x) { asp[x.f.a] = (asp[x.f.a] || 0) + 1; });
      return { n: g.length, p: g[0].f.p, claves: top, aspecto: Object.keys(asp).sort(function (a, b) { return asp[b] - asp[a]; })[0], ejemplo: g[0].f.t };
    });
  }
  function aCSV(filas) {
    var cab = ["texto", "polaridad", "emocion", "intensidad", "aspecto", "grupo", "fecha", "nota", "sarcasmo"];
    var esc = function (v) { v = v == null ? "" : String(v); return /[",;\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    return [cab.join(",")].concat(filas.map(function (f) { return [f.t, NOMPOL[f.p], f.e, f.i, f.a, f.s, f.f, f.n, f.x ? "sí" : "no"].map(esc).join(","); })).join("\n");
  }

  // ---------- animación ----------
  function contar(el, hasta, sufijo, dur) {
    if (quieto()) { el.textContent = hasta + (sufijo || ""); return; }
    var t0 = performance.now(), d = dur || 900, desde = 0;
    function paso(t) { var u = Math.min(1, (t - t0) / d), e = 1 - Math.pow(1 - u, 3); el.textContent = Math.round(desde + (hasta - desde) * e) + (sufijo || ""); if (u < 1) requestAnimationFrame(paso); }
    requestAnimationFrame(paso);
  }

  window.AS = {
    LECCION: LECCION, ESCENA: ESCENA, EMO: EMO, COLPOL: COLPOL, NOMPOL: NOMPOL,
    h: h, s: s, cargar: cargar, guardar: guardar, pct: pct, quieto: quieto, api: api, ia: ia, evidencia: evidencia,
    muroPublicar: muroPublicar, muroLeer: muroLeer, copiar: copiar, descargar: descargar, toast: toast,
    leerTabla: leerTabla, lexico: lexico, conIA: conIA, analizar: analizar, aCSV: aCSV, contar: contar, palabras: palabras
  };
})();
