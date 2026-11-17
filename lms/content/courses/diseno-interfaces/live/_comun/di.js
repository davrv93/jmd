// di.js · kit de las escenas LIVE de «Diseño de interfaces» (di-01 en adelante). Script clásico, sin módulos:
//   <link rel="stylesheet" href="../../comun/escena.css">
//   <link rel="stylesheet" href="../../comun/di.css">
//   <script src="../../comun/di.js"></script>            (al final del body)
//
// Viene de gq.js (GoldenQuerys) y se monta solo sobre el mismo marcado:
//   <div class="k-caja k-voto" data-voto="di01-algo" [data-correcta="b"] [data-explica="…"]>
//      <p class="k-q">Pregunta</p><div class="k-ops"><button data-op="a">…</button>…</div></div>
//   <div class="k-caja k-muro" data-muro="di01-algo" data-pregunta="…" [data-placeholder="…"]></div>
//   <ul class="k-check" data-check="di01-algo"><li><label><input type="checkbox"><span></span><em>…</em></label></li>…</ul>
//   <button class="k-btn" data-copiar-texto="…">Copiar</button>         → portapapeles
//   <button class="k-btn" data-dsh>Abrir DeepSeek Harness</button>      → lo abre el LIVE, al lado de la escena
//
// Lo propio del curso, en window.DI:
//   contraste(a, b)  → razón WCAG 2.2 sin redondear; DI.ratio(r) la escribe «4,48:1» (trunca, nunca redondea hacia arriba)
//   escala(base, razon) → los 7 escalones de la clase (−2…+4) con su valor exacto y el de trabajo
//   tokens()/guardarTokens(parcial) → las decisiones del alumno (escala, acento, paleta) que viajan entre escenas
//   dtcg(t) → el tokens.json en formato Design Tokens 2025.10 (lo importan Figma y Penpot)
//   fotito(d), mostrarFoto(…), descargar(…) → el PNG de cierre
//
// Votos y muro viven en la memoria del LIVE. Si la API no responde, la escena sigue en local.
(function () {
  "use strict";
  var M = location.pathname.match(/\/live\/([^/]+)\/escenas\/([^/]+)\//) || [];
  var LECCION = M[1] || "di-01";
  var ESCENA = M[2] || "";
  var BASE = "/api/v1/live/" + encodeURIComponent(LECCION);
  var CURSO = "Diseño de interfaces · Pantallas que se entienden solas";
  var CLASE = "Sesión 1 · Fundamentos que se ven";
  var FECHA = "Martes 17 de noviembre de 2026";
  var PFX = "di01-";

  // ---------- tema del LMS (?tema=dark|light) ----------
  try {
    var tema = new URLSearchParams(location.search).get("tema");
    if (tema === "dark" || tema === "light") document.documentElement.setAttribute("data-tema", tema);
  } catch (e) {}
  var QUIETO = false;
  try { QUIETO = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  // ---------- utilidades ----------
  function $(sel, raiz) { return (raiz || document).querySelector(sel); }
  function $$(sel, raiz) { return Array.prototype.slice.call((raiz || document).querySelectorAll(sel)); }
  function leer(k, def) { try { var v = localStorage.getItem(PFX + k); return v === null ? def : JSON.parse(v); } catch (e) { return def; } }
  function guardar(k, v) { try { localStorage.setItem(PFX + k, JSON.stringify(v)); } catch (e) {} }

  // pedir: nunca lanza. {ok, status, datos}
  function pedir(ruta, cuerpo, metodo) {
    var url = /^\/api\//.test(ruta) ? ruta : BASE + ruta;
    var op = { method: metodo || (cuerpo ? "POST" : "GET"), credentials: "same-origin", cache: "no-store", headers: {} };
    if (cuerpo !== undefined && cuerpo !== null) { op.headers["Content-Type"] = "application/json"; op.body = JSON.stringify(cuerpo); }
    try {
      return fetch(url, op).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok, status: r.status, datos: d || {} }; });
      }).catch(function () { return { ok: false, status: 0, datos: {} }; });
    } catch (e) { return Promise.resolve({ ok: false, status: 0, datos: {} }); }
  }

  var toastEl = null, toastT = 0;
  function toast(texto, ms) {
    if (!toastEl) { toastEl = document.createElement("div"); toastEl.className = "k-toast"; toastEl.setAttribute("role", "status"); document.body.appendChild(toastEl); }
    toastEl.textContent = texto;
    toastEl.classList.add("ve");
    clearTimeout(toastT);
    toastT = setTimeout(function () { toastEl.classList.remove("ve"); }, ms || 2600);
  }

  function copiar(texto) {
    if (window.copiarTexto) return window.copiarTexto(texto);
    texto = String(texto == null ? "" : texto);
    var p = Promise.reject();
    try { p = navigator.clipboard.writeText(texto); } catch (e) {}
    return p.then(function () { return true; }).catch(function () {
      try {
        var a = document.createElement("textarea"); a.value = texto; a.setAttribute("readonly", "");
        a.style.cssText = "position:fixed;top:0;left:0;opacity:0"; document.body.appendChild(a); a.select();
        var ok = document.execCommand("copy"); a.remove(); return !!ok;
      } catch (e) { return false; }
    });
  }

  // La página del LMS (mismo origen) crea el elemento: así el sandbox del iframe no bloquea la acción.
  function docAnfitrion() {
    try { if (window.parent && window.parent !== window && window.parent.document && window.parent.document.body) return window.parent.document; } catch (e) {}
    return null;
  }

  // abrirDsh: el LIVE abre DeepSeek Harness en su panel, al lado de la escena (docs/BOTON_DEEPSEEK_HARNESS.md).
  function abrirDsh() {
    try {
      if (window.parent && window.parent !== window) { window.parent.postMessage({ tipo: "abrir-dsh" }, location.origin); toast("DeepSeek Harness se abre al lado. Pega tu pedido con Ctrl+V (Cmd+V en Mac)."); return; }
    } catch (e) {}
    toast("Abre DeepSeek Harness con el botón de arriba de la escena y pega tu pedido.");
  }

  function evidencia(tipo, detalle) { return pedir("/evidencia", { escena: ESCENA, tipo: tipo, detalle: String(detalle || "").slice(0, 200) }); }

  // ---------- quién soy ----------
  var yoP = null;
  function yo() {
    if (!yoP) yoP = pedir("/api/v1/me").then(function (r) {
      var n = (r.ok && r.datos && (r.datos.name || (r.datos.email || "").split("@")[0])) || leer("nombre", "") || "Alumno";
      n = String(n).trim() || "Alumno";
      guardar("nombre", n);
      return { id: (r.datos && r.datos.id) || "", nombre: n };
    });
    return yoP;
  }
  function hash(s) { var h = 2166136261; s = String(s || ""); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function slug(t) { return String(t || "alumno").toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "alumno"; }

  // ---------- contraste (WCAG 2.2, definición de luminancia relativa con 0,04045) ----------
  function hexRgb(h) {
    h = String(h || "").trim().replace(/^#/, "");
    if (h.length === 3) h = h.replace(/(.)/g, "$1$1");
    if (!/^[0-9a-f]{6}$/i.test(h)) return null;
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  function rgbHex(c) { return "#" + c.map(function (v) { v = Math.max(0, Math.min(255, Math.round(v))); return (v < 16 ? "0" : "") + v.toString(16); }).join(""); }
  function lin(v) { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
  function luminancia(hex) { var c = hexRgb(hex); if (!c) return 0; return 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]); }
  function contraste(a, b) { var x = luminancia(a), y = luminancia(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  // WCAG pide no redondear: 4,499 no pasa. Mostramos con dos decimales truncados.
  function ratio(r) { return (Math.floor(r * 100) / 100).toFixed(2).replace(".", ",") + ":1"; }
  // Aleja un color del otro (lo oscurece si ya es el más oscuro, lo aclara si es el más claro), sin cambiar su
  // tono, hasta llegar a la meta. Si no llega (p. ej. blanco que ya no puede aclararse), devuelve el último intento.
  function ajustar(hex, fondo, meta) {
    var c = hexRgb(hex); if (!c) return hex;
    var oscuro = luminancia(hex) <= luminancia(fondo), k = 0, h = hex;
    while (contraste(h, fondo) < meta && k < 100) {
      k++;
      h = rgbHex(c.map(function (v) { return oscuro ? v * (1 - k / 100) : v + (255 - v) * k / 100; }));
    }
    return h;
  }

  // ---------- escala tipográfica ----------
  // escala(16, 1.25) → [{paso:-2, exacto:10.24, px:12}, … {paso:4, exacto:39.06, px:39}]
  // Hacia arriba se multiplica y se redondea el valor exacto (20 · 25 · 31 · 39). Hacia abajo la escala pura da
  // 12,8 y 10,2, demasiado chico para una pantalla: ahí se baja de 2 en 2 px y nunca de 12 (la de la clase:
  // 12 · 14 · 16 · 20 · 25 · 31 · 39). La escena de la escala lo explica con estas mismas palabras.
  function escala(base, razon) {
    base = +base || 16; razon = +razon || 1.25;
    var out = [];
    for (var p = -2; p <= 4; p++) {
      var exacto = base * Math.pow(razon, p), px = Math.round(exacto);
      if (p === -1) px = Math.max(12, base - 2);
      if (p === -2) px = Math.max(12, base - 4);
      out.push({ paso: p, exacto: exacto, px: px });
    }
    // sin escalones repetidos: si dos quedan iguales, el de arriba sube un punto
    for (var i = 1; i < out.length; i++) if (out[i].px <= out[i - 1].px) out[i].px = out[i - 1].px + 1;
    return out;
  }
  var RAZONES = [
    { r: 1.125, n: "Segunda mayor" }, { r: 1.2, n: "Tercera menor" }, { r: 1.25, n: "Tercera mayor" },
    { r: 1.333, n: "Cuarta justa" }, { r: 1.5, n: "Quinta justa" },
  ];

  // ---------- los tokens del alumno (viajan entre escenas en este navegador) ----------
  var TOKENS_BASE = {
    base: 16, razon: 1.25, fuente: "Inter",
    acento: "#0b63ce", texto: "#1a1d23", suave: "#5b6270", borde: "#8a919e", linea: "#d5d9e0",
    fondo: "#ffffff", superficie: "#f5f6f8", exito: "#1f7a3e", aviso: "#a15c00", error: "#b3261e",
  };
  function tokens() { var t = leer("tokens", {}) || {}, o = {}; Object.keys(TOKENS_BASE).forEach(function (k) { o[k] = t[k] != null ? t[k] : TOKENS_BASE[k]; }); return o; }
  function guardarTokens(p) { var t = tokens(); Object.keys(p || {}).forEach(function (k) { if (k in TOKENS_BASE) t[k] = p[k]; }); guardar("tokens", t); return t; }

  // dtcg(t): Design Tokens Format Module 2025.10. Colores como objeto sRGB con hex (lo que exige Figma al importar),
  // medidas en px, y $description en cada token (Penpot lo pide). Figma salta solo los tipos que no importa
  // (tipografía compuesta y sombra), así que el mismo archivo sirve para los dos.
  function dtcg(t) {
    t = t || tokens();
    function col(hex, d) { var c = hexRgb(hex) || [0, 0, 0]; return { $type: "color", $value: { colorSpace: "srgb", components: c.map(function (v) { return Math.round(v / 255 * 10000) / 10000; }), alpha: 1, hex: String(hex).toLowerCase() }, $description: d }; }
    function dim(v, d) { return { $type: "dimension", $value: { value: v, unit: "px" }, $description: d }; }
    var e = escala(t.base, t.razon), nombres = ["xs", "sm", "base", "md", "lg", "xl", "2xl"], tam = {};
    e.forEach(function (s, i) { tam[nombres[i]] = dim(s.px, "Escalón " + (s.paso > 0 ? "+" : "") + s.paso + " de la escala " + t.razon + " (exacto " + s.exacto.toFixed(2) + ")"); });
    var sombra = function (y, b, a, d) { return { $type: "shadow", $value: { color: { colorSpace: "srgb", components: [0.1, 0.11, 0.14], alpha: a, hex: "#1a1d23" }, offsetX: { value: 0, unit: "px" }, offsetY: { value: y, unit: "px" }, blur: { value: b, unit: "px" }, spread: { value: 0, unit: "px" } }, $description: d }; };
    return {
      color: {
        acento: col(t.acento, "Un solo acento: acción principal y enlaces"),
        texto: col(t.texto, "Texto principal"),
        "texto-suave": col(t.suave, "Texto secundario; debe pasar 4,5:1 sobre el fondo"),
        borde: col(t.borde, "Bordes de campos e íconos; debe pasar 3:1"),
        linea: col(t.linea, "Separadores decorativos (no llevan información)"),
        fondo: col(t.fondo, "Fondo de la página"),
        superficie: col(t.superficie, "Fondo de tarjetas y filas alternas"),
        exito: col(t.exito, "Semántico: todo bien (stock OK, guardado)"),
        aviso: col(t.aviso, "Semántico: atención (stock bajo)"),
        error: col(t.error, "Semántico: error o agotado"),
      },
      fuente: { familia: { $type: "fontFamily", $value: t.fuente, $description: "Familia tipográfica de toda la interfaz" } },
      tamano: tam,
      espacio: { "1": dim(4, "Medio paso"), "2": dim(8, "Paso base de la retícula"), "3": dim(12, "1,5 pasos"), "4": dim(16, "Dentro de un grupo"), "6": dim(24, "Entre grupos"), "8": dim(32, "Entre secciones"), "12": dim(48, "Márgenes amplios"), "16": dim(64, "Separación mayor") },
      radio: { sm: dim(4, "Etiquetas y chips"), md: dim(8, "Botones y campos"), lg: dim(12, "Tarjetas") },
      sombra: { suave: sombra(1, 3, 0.12, "Tarjetas en reposo"), alta: sombra(8, 24, 0.18, "Menús y diálogos") },
      tipografia: {
        titulo: { $type: "typography", $value: { fontFamily: t.fuente, fontSize: { value: e[5].px, unit: "px" }, fontWeight: 600, lineHeight: 1.2, letterSpacing: { value: 0, unit: "px" } }, $description: "Título de la pantalla (+3)" },
        cuerpo: { $type: "typography", $value: { fontFamily: t.fuente, fontSize: { value: e[2].px, unit: "px" }, fontWeight: 400, lineHeight: 1.5, letterSpacing: { value: 0, unit: "px" } }, $description: "Texto de lectura (base)" },
      },
    };
  }

  // ---------- votación ----------
  function montarVoto(el) {
    if (el.getAttribute("data-k") === "1") return; el.setAttribute("data-k", "1");
    var clave = el.getAttribute("data-voto"), correcta = el.getAttribute("data-correcta") || "";
    var botones = $$("button[data-op]", el);
    botones.forEach(function (b) {
      var t = b.textContent.trim(); b.textContent = "";
      var s1 = document.createElement("span"); s1.className = "b";
      var s2 = document.createElement("span"); s2.className = "t"; s2.textContent = t;
      var s3 = document.createElement("span"); s3.className = "n";
      b.appendChild(s1); b.appendChild(s2); b.appendChild(s3); b.type = "button";
      b.setAttribute("aria-pressed", "false");
      if (correcta && b.getAttribute("data-op") === correcta) b.classList.add("bien");
    });
    var pie = $(".k-pie", el); if (!pie) { pie = document.createElement("p"); pie.className = "k-pie"; el.appendChild(pie); }
    var explica = null;
    if (el.getAttribute("data-explica")) { explica = document.createElement("p"); explica.className = "k-explica"; explica.textContent = el.getAttribute("data-explica"); explica.hidden = true; el.insertBefore(explica, pie); }
    var local = { total: 0, opciones: {}, mia: leer("voto-" + clave, "") };
    function pintar(c) {
      c = c || local; var total = c.total || 0;
      botones.forEach(function (b) {
        var op = b.getAttribute("data-op"), n = (c.opciones && c.opciones[op]) || 0, pct = total ? Math.round(n * 100 / total) : 0;
        $(".b", b).style.width = (c.mia ? pct : 0) + "%";
        $(".n", b).textContent = c.mia && total ? pct + " %" : "";
        b.setAttribute("aria-pressed", String(c.mia === op));
      });
      if (c.mia) { if (correcta) el.classList.add("revela"); if (explica) explica.hidden = false; }
      pie.textContent = !c.mia ? (total ? "Vota para ver lo que eligió el grupo · " + total + (total === 1 ? " voto" : " votos") : "Toca una opción: el grupo ve el resultado al instante")
        : (total ? total + (total === 1 ? " voto del grupo" : " votos del grupo") + " · puedes cambiar el tuyo" : "Tu voto quedó guardado en esta pantalla");
      el.dispatchEvent(new CustomEvent("k-pintado", { detail: { clave: clave, datos: c }, bubbles: false }));
    }
    botones.forEach(function (b) {
      b.addEventListener("click", function () {
        var op = b.getAttribute("data-op");
        local.mia = op; guardar("voto-" + clave, op);
        if (!local.total) { local.total = 1; local.opciones = {}; local.opciones[op] = 1; }
        pintar(local);
        pedir("/voto", { escena: clave, opcion: op }).then(function (r) { if (r.ok && r.datos && typeof r.datos.total === "number") { local = r.datos; pintar(local); } });
        el.dispatchEvent(new CustomEvent("k-voto", { detail: { clave: clave, opcion: op }, bubbles: true }));
      });
    });
    function refrescar() {
      if (document.visibilityState === "hidden") return;
      pedir("/votos?escena=" + encodeURIComponent(clave)).then(function (r) {
        if (r.ok && r.datos && typeof r.datos.total === "number") { if (!r.datos.mia && local.mia) r.datos.mia = local.mia; local = r.datos; }
        pintar(local);
      });
    }
    pintar(local); refrescar(); setInterval(refrescar, 5000);
  }

  // votar(clave, opcion): un voto suelto (el mapa de calor de la escena 3 lo usa con la celda tocada).
  function votar(clave, opcion) { return pedir("/voto", { escena: clave, opcion: opcion }); }
  function votos(clave) { return pedir("/votos?escena=" + encodeURIComponent(clave)); }

  // ---------- muro ----------
  function montarMuro(el) {
    if (el.getAttribute("data-k") === "1") return; el.setAttribute("data-k", "1");
    var clave = el.getAttribute("data-muro"), uid = "m-" + clave;
    var q = document.createElement("label"); q.className = "k-q"; q.setAttribute("for", uid); q.textContent = el.getAttribute("data-pregunta") || "Escribe una línea";
    if (el.getAttribute("data-color")) q.style.setProperty("--c", el.getAttribute("data-color"));
    var fila = document.createElement("div"); fila.className = "k-fila";
    var inp = document.createElement("input"); inp.id = uid; inp.type = "text"; inp.maxLength = +(el.getAttribute("data-max-largo") || 160); inp.autocomplete = "off"; inp.enterKeyHint = "send";
    inp.placeholder = el.getAttribute("data-placeholder") || "Una línea, con tus palabras";
    var btn = document.createElement("button"); btn.type = "button"; btn.className = "k-btn"; btn.textContent = "Publicar";
    fila.appendChild(inp); fila.appendChild(btn);
    var lista = document.createElement("ul"); lista.className = "k-lista"; lista.setAttribute("aria-live", "polite");
    var pie = document.createElement("p"); pie.className = "k-pie";
    el.appendChild(q); el.appendChild(fila); el.appendChild(lista); el.appendChild(pie);
    inp.value = leer("muro-" + clave, "");
    var ultimas = [], clavePintada = null;
    function pintar(entradas) {
      if (entradas) ultimas = entradas;
      var k = JSON.stringify(ultimas.map(function (e) { return [e.nombre, e.texto, e.mia]; }));
      if (k === clavePintada) return;
      clavePintada = k;
      lista.textContent = "";
      var max = +(el.getAttribute("data-max") || 6);
      ultimas.slice(0, max).forEach(function (e) {
        var li = document.createElement("li"); if (e.mia) li.className = "mia";
        var b = document.createElement("b"); b.textContent = e.mia ? "Tú" : (e.nombre || "alguien");
        li.appendChild(b); li.appendChild(document.createTextNode(e.texto)); lista.appendChild(li);
      });
      if (!ultimas.length) { var v = document.createElement("li"); v.className = "k-vacio"; v.style.background = "none"; v.textContent = "Aún nadie escribe. Abre tú el muro."; lista.appendChild(v); }
      pie.textContent = ultimas.length > max ? "y " + (ultimas.length - max) + " más en el muro de la clase" : (ultimas.length ? ultimas.length + (ultimas.length === 1 ? " respuesta" : " respuestas") + " del grupo" : "");
    }
    function publicar() {
      var t = inp.value.replace(/\s+/g, " ").trim();
      if (!t) { inp.focus(); toast("Escribe una línea antes de publicar."); return; }
      guardar("muro-" + clave, t); btn.disabled = true;
      pedir("/muro", { escena: clave, texto: t }).then(function (r) {
        btn.disabled = false;
        if (r.ok && r.datos && r.datos.entradas) { pintar(r.datos.entradas); btn.textContent = "✓ Publicado"; setTimeout(function () { btn.textContent = "Publicar"; }, 2200); }
        else { pintar([{ nombre: "Tú", texto: t, mia: true }].concat(ultimas.filter(function (e) { return !e.mia; }))); toast("Lo guardé en tu pantalla; el muro de la clase no respondió."); }
        el.dispatchEvent(new CustomEvent("k-muro", { detail: { clave: clave, texto: t }, bubbles: true }));
      });
    }
    btn.addEventListener("click", publicar);
    inp.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); publicar(); } });
    function refrescar() {
      if (document.visibilityState === "hidden") return;
      pedir("/muro?escena=" + encodeURIComponent(clave)).then(function (r) { if (r.ok && r.datos && r.datos.entradas) pintar(r.datos.entradas); else if (!ultimas.length) pintar([]); });
    }
    pintar([]); refrescar(); setInterval(refrescar, 6000);
  }

  // ---------- lista de comprobación ----------
  function montarCheck(ul) {
    if (ul.getAttribute("data-k") === "1") return; ul.setAttribute("data-k", "1");
    var clave = ul.getAttribute("data-check"), cajas = $$("input[type=checkbox]", ul);
    var est = leer("check-" + clave, []);
    var av = document.createElement("div"); av.className = "k-avance";
    var barra = document.createElement("i"); var txt = document.createElement("span");
    av.appendChild(barra); av.appendChild(txt);
    var listo = document.createElement("p"); listo.className = "k-listo"; listo.hidden = true;
    listo.textContent = ul.getAttribute("data-listo") || "Listo. Pulsa «Lo logré» en el panel de la clase.";
    ul.parentNode.insertBefore(av, ul.nextSibling); ul.parentNode.insertBefore(listo, av.nextSibling);
    function pintar() {
      var n = cajas.filter(function (c) { return c.checked; }).length;
      barra.style.setProperty("--p", Math.round(n * 100 / cajas.length) + "%");
      txt.textContent = n + " de " + cajas.length;
      listo.hidden = n !== cajas.length;
    }
    cajas.forEach(function (c, i) {
      c.checked = !!est[i];
      c.addEventListener("change", function () { est[i] = c.checked; guardar("check-" + clave, est); pintar(); });
    });
    pintar();
  }

  // ---------- botones segmentados e interruptores ----------
  // <div class="k-seg" data-seg="nombre"><button data-v="a" aria-pressed="true">…</button>…</div> → evento «k-seg» {nombre, v}
  // <button class="k-tog" data-tog="nombre" aria-pressed="false">…</button> → evento «k-tog» {nombre, on}
  function montarControles(raiz) {
    $$("[data-seg]", raiz).forEach(function (g) {
      if (g.getAttribute("data-k") === "1") return; g.setAttribute("data-k", "1");
      $$("button", g).forEach(function (b) {
        b.type = "button";
        b.addEventListener("click", function () {
          $$("button", g).forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
          g.dispatchEvent(new CustomEvent("k-seg", { detail: { nombre: g.getAttribute("data-seg"), v: b.getAttribute("data-v") }, bubbles: true }));
        });
      });
    });
    $$("[data-tog]", raiz).forEach(function (b) {
      if (b.getAttribute("data-k") === "1") return; b.setAttribute("data-k", "1"); b.type = "button";
      if (!b.hasAttribute("aria-pressed")) b.setAttribute("aria-pressed", "false");
      b.addEventListener("click", function () {
        var on = b.getAttribute("aria-pressed") !== "true"; b.setAttribute("aria-pressed", String(on));
        b.dispatchEvent(new CustomEvent("k-tog", { detail: { nombre: b.getAttribute("data-tog"), on: on }, bubbles: true }));
      });
    });
  }

  // ---------- la fotito: un afiche suizo con TU sistema (acento, escala y paleta) ----------
  var FUENTE = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
  var SERIF = "'Iowan Old Style', Charter, 'Palatino Linotype', Palatino, Georgia, serif";
  function envolver(ctx, texto, ancho, maxLineas) {
    var palabras = String(texto || "").split(/\s+/).filter(Boolean), lineas = [], l = "";
    for (var i = 0; i < palabras.length; i++) {
      var prueba = l ? l + " " + palabras[i] : palabras[i];
      if (ctx.measureText(prueba).width > ancho && l) { lineas.push(l); l = palabras[i]; } else l = prueba;
    }
    if (l) lineas.push(l);
    if (lineas.length > maxLineas) { lineas = lineas.slice(0, maxLineas); var u = lineas[maxLineas - 1]; while (ctx.measureText(u + "…").width > ancho && u.length) u = u.slice(0, -1); lineas[maxLineas - 1] = u.replace(/\s+$/, "") + "…"; }
    return lineas;
  }
  function ajustarFuente(ctx, texto, ancho, px, peso, min, familia) {
    var f = px;
    do { ctx.font = peso + " " + f + "px " + (familia || FUENTE); if (ctx.measureText(texto).width <= ancho) break; f -= 2; } while (f > (min || 22));
    return f;
  }
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  // fotito({nombre, etiqueta, resultado, detalle, titulo, reflexion}) → canvas 1080 × 1350 (4:5)
  function fotito(d) {
    var W = 1080, H = 1350, c = document.createElement("canvas"); c.width = W; c.height = H;
    var ctx = c.getContext("2d"), t = tokens(), esc = escala(t.base, t.razon);
    var tinta = "#16181d", papel = "#f4f1ea", acento = t.acento;
    ctx.fillStyle = papel; ctx.fillRect(0, 0, W, H);
    // retícula de 8 pt (cada 8 px a escala 2: 16 px), con la línea fuerte cada 64
    for (var x = 0; x <= W; x += 16) { ctx.fillStyle = x % 128 === 0 ? "rgba(22,24,29,.07)" : "rgba(22,24,29,.035)"; ctx.fillRect(x, 0, 1, H); }
    for (var y = 0; y <= H; y += 16) { ctx.fillStyle = y % 128 === 0 ? "rgba(22,24,29,.07)" : "rgba(22,24,29,.035)"; ctx.fillRect(0, y, W, 1); }
    var M = 80; // margen: 5 pasos de 16
    ctx.textBaseline = "alphabetic"; ctx.textAlign = "left";
    ctx.fillStyle = tinta; ctx.font = "800 28px " + FUENTE; ctx.fillText("JMD Learning", M, 112);
    ctx.fillStyle = "#4a4f5a"; ctx.font = "600 26px " + FUENTE; ctx.fillText("Diseño de interfaces · " + CLASE.replace("Sesión 1 · ", "Sesión 1: "), M, 152);
    ctx.fillStyle = tinta; ctx.fillRect(M, 184, W - 2 * M, 4);
    // el espécimen: «Aa» al tamaño +4 de SU escala, multiplicado para el afiche
    ctx.fillStyle = acento; ctx.font = "600 " + Math.round(esc[6].px * 7.2) + "px " + SERIF; ctx.fillText("Aa", M - 10, 520);
    // la escala como barras (cada escalón, su px)
    var bx = 600, by = 268;
    ctx.fillStyle = "#4a4f5a"; ctx.font = "700 22px " + FUENTE; ctx.fillText("Mi escala · razón " + String(t.razon).replace(".", ","), bx, by);
    esc.slice().reverse().forEach(function (s, i) {
      var yy = by + 40 + i * 38;
      ctx.fillStyle = s.paso === 0 ? acento : tinta; ctx.font = "700 " + Math.min(34, Math.round(s.px * 0.95)) + "px " + FUENTE; ctx.fillText(String(s.px), bx, yy + 8);
      ctx.fillStyle = s.paso === 0 ? acento : "rgba(22,24,29,.75)"; ctx.fillRect(bx + 70, yy - 8, s.px * 7, 12);
    });
    // paleta: acento + texto + 3 semánticos, cada uno con su contraste sobre blanco
    var pal = [["Acento", t.acento], ["Texto", t.texto], ["Éxito", t.exito], ["Aviso", t.aviso], ["Error", t.error]], sw = (W - 2 * M - 4 * 16) / 5;
    pal.forEach(function (p, i) {
      var px = M + i * (sw + 16), py = 600;
      ctx.fillStyle = p[1]; rr(ctx, px, py, sw, 150, 12); ctx.fill();
      ctx.fillStyle = "#ffffff"; ctx.font = "700 22px " + FUENTE; ctx.fillText(p[0], px + 16, py + 40);
      ctx.font = "800 30px " + FUENTE; ctx.fillText(ratio(contraste(p[1], "#ffffff")), px + 16, py + 126);
      ctx.fillStyle = tinta; ctx.font = "600 20px ui-monospace, Menlo, monospace"; ctx.fillText(String(p[1]).toUpperCase(), px, py + 182);
    });
    // nombre y resultado
    ctx.fillStyle = tinta; var nom = String(d.nombre || "Alumno").slice(0, 48); ajustarFuente(ctx, nom, W - 2 * M, 72, "800", 34); ctx.fillText(nom, M, 900);
    ctx.fillStyle = acento; ctx.font = "800 24px " + FUENTE; ctx.fillText(String(d.etiqueta || "Mi resultado"), M, 952);
    ctx.fillStyle = tinta; var res = String(d.resultado || ""); ajustarFuente(ctx, res, W - 2 * M, 44, "800", 26); ctx.fillText(res, M, 1004);
    if (d.detalle) { ctx.fillStyle = "#4a4f5a"; ajustarFuente(ctx, d.detalle, W - 2 * M, 26, "600", 18); ctx.fillText(d.detalle, M, 1044); }
    // reflexión
    ctx.fillStyle = tinta; ctx.fillRect(M, 1080, 64, 4);
    ctx.font = "italic 500 36px " + SERIF;
    var refl = String(d.reflexion || "").trim();
    var ls = envolver(ctx, refl ? "«" + refl + "»" : "«Una pantalla, un protagonista; y si no se lee, no existe.»", W - 2 * M, 3);
    ls.forEach(function (l, j) { ctx.fillText(l, M, 1136 + j * 46); });
    ctx.fillStyle = "#4a4f5a"; ctx.font = "600 24px " + FUENTE; ctx.fillText(FECHA + "  ·  jmd-learn.online  ·  #DiseñoUI", M, 1296);
    return c;
  }

  // descargar: la crea la página del LMS (el iframe no tiene allow-popups). true si se pudo intentar.
  function descargarBlob(blob, archivo) {
    var d = docAnfitrion() || document, win = d.defaultView || window;
    try {
      var url = win.URL.createObjectURL(blob);
      var a = d.createElement("a"); a.href = url; a.download = archivo; a.rel = "noopener"; a.style.display = "none";
      d.body.appendChild(a); a.click();
      setTimeout(function () { a.remove(); try { win.URL.revokeObjectURL(url); } catch (e) {} }, 4000);
      return true;
    } catch (e) { return false; }
  }
  function descargar(canvas, archivo) {
    return new Promise(function (ok) {
      try { canvas.toBlob(function (b) { ok(b ? descargarBlob(b, archivo) : false); }, "image/png"); } catch (e) { ok(false); }
    });
  }
  function descargarTexto(texto, archivo, tipo) { return descargarBlob(new Blob([texto], { type: tipo || "application/json" }), archivo); }

  function mostrarFoto(cont, canvas, archivo) {
    cont.textContent = ""; cont.classList.add("k-foto");
    var img = document.createElement("img"); img.alt = "Tu fotito de la sesión: tu escala, tu paleta, tu resultado y lo que te llevas";
    img.src = canvas.toDataURL("image/png"); img.width = 1080; img.height = 1350;
    var botones = document.createElement("div"); botones.className = "k-links";
    var b1 = document.createElement("button"); b1.type = "button"; b1.className = "k-btn di"; b1.textContent = "Descargar PNG";
    b1.addEventListener("click", function () {
      descargar(canvas, archivo).then(function (s) { toast(s ? "Listo: revisa tus descargas (" + archivo + "). Si no aparece, mantén pulsada la imagen." : "Tu navegador no dejó descargar: mantén pulsada la imagen o clic derecho → «Guardar imagen como…»", 4200); });
    });
    botones.appendChild(b1);
    var nota = document.createElement("p");
    nota.textContent = "¿No se descargó? En el celular, mantén pulsada la imagen → «Guardar imagen». En la compu, clic derecho → «Guardar imagen como…».";
    cont.appendChild(img); cont.appendChild(botones); cont.appendChild(nota);
    return img;
  }

  // ---------- montaje automático ----------
  function montar(raiz) {
    $$("[data-voto]", raiz).forEach(montarVoto);
    $$("[data-muro]", raiz).forEach(montarMuro);
    $$("[data-check]", raiz).forEach(montarCheck);
    montarControles(raiz);
  }
  document.addEventListener("click", function (e) {
    var t = e.target && e.target.closest ? e.target.closest("[data-copiar-texto],[data-dsh]") : null;
    if (!t) return;
    if (t.hasAttribute("data-dsh") && !t.hasAttribute("data-copiar-texto")) { e.preventDefault(); abrirDsh(); return; }
    var dsh = t.hasAttribute("data-dsh");
    copiar(t.getAttribute("data-copiar-texto")).then(function (ok) {
      var antes = t.getAttribute("data-txt") || t.textContent; t.setAttribute("data-txt", antes);
      t.textContent = ok ? "✓ Copiado" : "No pude copiar"; t.classList.toggle("ok", !!ok);
      if (ok && dsh) abrirDsh();
      setTimeout(function () { t.textContent = antes; t.classList.remove("ok"); }, 2200);
    });
  });
  function arrancar() { montar(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", arrancar);
  else arrancar();

  window.DI = {
    leccion: LECCION, escena: ESCENA, curso: CURSO, clase: CLASE, fecha: FECHA, quieto: QUIETO,
    pedir: pedir, toast: toast, copiar: copiar, abrirDsh: abrirDsh, evidencia: evidencia, yo: yo, leer: leer, guardar: guardar, hash: hash, slug: slug,
    votar: votar, votos: votos, montar: montar,
    hexRgb: hexRgb, rgbHex: rgbHex, luminancia: luminancia, contraste: contraste, ratio: ratio, ajustar: ajustar,
    escala: escala, razones: RAZONES, tokens: tokens, guardarTokens: guardarTokens, tokensBase: TOKENS_BASE, dtcg: dtcg,
    fotito: fotito, descargar: descargar, descargarTexto: descargarTexto, mostrarFoto: mostrarFoto,
  };
})();
