// py01.js · kit de las escenas de «Python: de cero a tu API» (clase 1, py-01). Script clásico, sin módulos:
//   <link rel="stylesheet" href="../../comun/py01.css">
//   <script src="../../comun/py01.js"></script>            (al final del body)
//
// Nace de g801.js (Grupo 8) con lo propio del curso de Python. Se monta solo sobre el marcado:
//   <div class="k-caja k-voto" data-voto="py01-sistema" [data-correcta="b"] [data-explica="…"]>
//      <p class="k-q">Pregunta</p><div class="k-ops"><button data-op="win">Windows</button>…</div></div>
//   <div class="k-caja k-muro" data-muro="py01-algo" data-pregunta="…" [data-placeholder="…"] [data-max="6"]></div>
//   <ul class="k-check" data-check="py01-instalar"><li><label><input type="checkbox"><span></span><em>…</em></label></li>…</ul>
//   <div class="k-so" data-so-tabs></div>  +  <div data-so="win">…</div><div data-so="mac">…</div><div data-so="linux">…</div>
//        → pestañas Windows · macOS · Linux; la elección se recuerda en todas las escenas de la clase.
//   <pre class="k-py">código</pre>                          → resaltado de Python (sin librerías)
//   <button class="k-link" data-abrir="https://…">Texto</button>        → pestaña nueva (o copia el enlace)
//   <button class="k-btn" data-copiar-texto="…">Copiar</button>         → portapapeles
//
// Y expone window.PY: pedir, toast, copiar, abrir, yo, so, evidencia, resaltar, avatares, dibujarAvatar,
// avatarCanvas, fotito (PNG con canvas) y mostrarFoto (vista previa + descarga + «mantén pulsada»).
//
// Todo va contra la API del LIVE (votos y muro en memoria del servidor). Si la API no responde, la
// escena sigue funcionando en local: nadie se queda con un botón muerto.
(function () {
  "use strict";
  var M = location.pathname.match(/\/live\/([^/]+)\/escenas\/([^/]+)\//) || [];
  var LECCION = M[1] || "py-01";
  var ESCENA = M[2] || "";
  var BASE = "/api/v1/live/" + encodeURIComponent(LECCION);
  var CURSO = "Python: de cero a tu API";
  var CLASE = "Clase 1 · Entorno profesional y sintaxis esencial";
  var FECHA = "Jueves 12 de noviembre de 2026";

  // ---------- utilidades ----------
  function $(sel, raiz) { return (raiz || document).querySelector(sel); }
  function $$(sel, raiz) { return Array.prototype.slice.call((raiz || document).querySelectorAll(sel)); }
  function leer(k, def) { try { var v = localStorage.getItem("py01-" + k); return v === null ? def : JSON.parse(v); } catch (e) { return def; } }
  function guardar(k, v) { try { localStorage.setItem("py01-" + k, JSON.stringify(v)); } catch (e) {} }

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
      try { return window.parent.navigator.clipboard.writeText(texto).then(function () { return true; }); } catch (e) { return Promise.reject(); }
    }).catch(function () {
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

  // abrir: pestaña nueva desde la página del LMS; si no se puede, copia el enlace y lo dice.
  function abrir(url) {
    var ok = false, d = docAnfitrion();
    if (d) {
      try {
        var a = d.createElement("a"); a.href = url; a.target = "_blank"; a.rel = "noopener noreferrer";
        a.style.display = "none"; d.body.appendChild(a); a.click(); a.remove(); ok = true;
      } catch (e) { ok = false; }
    }
    if (!ok) { try { ok = !!window.open(url, "_blank", "noopener"); } catch (e) { ok = false; } }
    if (ok) toast("Se abrió en una pestaña nueva. Si no la ves, revisa el bloqueo de ventanas.");
    else copiar(url).then(function (c) { toast(c ? "Copié el enlace: pégalo en tu navegador · " + url : "Abre este enlace en tu navegador: " + url, 4500); });
  }

  // evidencia: lo que el alumno demostró en esta escena (cuenta para la compuerta del instructor).
  function evidencia(tipo, detalle, escena) {
    return pedir("/evidencia", { escena: escena || ESCENA, tipo: tipo || "hallazgo", detalle: String(detalle || "").slice(0, 200) });
  }

  // ---------- quién soy ----------
  var yoP = null;
  function yo() {
    if (!yoP) yoP = pedir("/api/v1/me").then(function (r) {
      var n = (r.ok && r.datos && (r.datos.name || (r.datos.email || "").split("@")[0])) || leer("nombre", "") || "Alumno";
      n = String(n).trim() || "Alumno";
      guardar("nombre", n);
      return { id: (r.datos && r.datos.id) || "", nombre: n, staff: !!(r.datos && r.datos.roles && r.datos.roles.some(function (x) { return x === "instructor" || x === "admin" || x === "staff"; })) };
    });
    return yoP;
  }

  // ---------- tu sistema: Windows · macOS · Linux ----------
  var SISTEMAS = [
    { id: "win", n: "Windows", ic: "M2 4.5l8-1.1V11H2zM11 3.3L22 2v9H11zM2 12h8v7.6l-8-1.1zM11 12h11v10l-11-1.5z" },
    { id: "mac", n: "macOS", ic: "M16.4 12.6c0-2.4 2-3.6 2.1-3.6-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.7.9-.8 0-1.9-.9-3.2-.8-1.6 0-3.1 1-4 2.4-1.7 3-.4 7.4 1.2 9.8.8 1.2 1.8 2.5 3 2.4 1.2 0 1.7-.8 3.1-.8 1.5 0 1.9.8 3.2.8 1.3 0 2.2-1.2 3-2.4.9-1.4 1.3-2.7 1.3-2.8-.1 0-2.5-1-2.5-4zM14 5.6c.7-.8 1.1-1.9 1-3-1 0-2.1.7-2.8 1.5-.6.7-1.2 1.8-1 2.9 1.1.1 2.1-.6 2.8-1.4z" },
    { id: "linux", n: "Linux", ic: "M12 2c-2.2 0-3.6 1.9-3.6 4.6 0 1.6.4 2.6-.6 4.3C6.6 13 5 15.2 5 17.6c0 .7.2 1.2.5 1.6-.7.4-1.5.6-1.5 1.3 0 .9 1.3 1 3 1.3 1.2.2 2.3.7 3 .7.9 0 1.4-.6 2-.6s1.1.6 2 .6c.7 0 1.8-.5 3-.7 1.7-.3 3-.4 3-1.3 0-.7-.8-.9-1.5-1.3.3-.4.5-.9.5-1.6 0-2.4-1.6-4.6-2.8-6.7-1-1.7-.6-2.7-.6-4.3C15.6 3.9 14.2 2 12 2zm-1.6 4.2c.4 0 .7.5.7 1.1s-.3 1.1-.7 1.1-.7-.5-.7-1.1.3-1.1.7-1.1zm3.2 0c.4 0 .7.5.7 1.1s-.3 1.1-.7 1.1-.7-.5-.7-1.1.3-1.1.7-1.1zM12 9.2c.9 0 2 .6 2 1s-1.1 1.1-2 1.1-2-.7-2-1.1 1.1-1 2-1z" },
  ];
  function soDetectado() {
    var p = "";
    try { p = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || navigator.userAgent || ""; } catch (e) {}
    if (/win/i.test(p)) return "win";
    if (/mac|iphone|ipad/i.test(p)) return "mac";
    if (/linux|x11|cros/i.test(p) && !/android/i.test(navigator.userAgent || "")) return "linux";
    return "win";
  }
  var soActual = leer("so", "") || soDetectado();
  function so() { return soActual; }
  function ponerSO(id, avisar) {
    if (!SISTEMAS.some(function (s) { return s.id === id; })) return;
    soActual = id; guardar("so", id);
    $$("[data-so-tabs] button").forEach(function (b) { b.setAttribute("aria-selected", String(b.getAttribute("data-s") === id)); });
    $$("[data-so]").forEach(function (el) {
      var oculto = el.getAttribute("data-so").split(/\s+/).indexOf(id) < 0;
      el.hidden = oculto;
      // copiar.js envuelve cada pre.esc-cmd en .cp-env con su botón: se oculta el envoltorio entero.
      if (el.parentNode && el.parentNode.classList && el.parentNode.classList.contains("cp-env")) el.parentNode.hidden = oculto;
    });
    if (avisar !== false) document.dispatchEvent(new CustomEvent("k-so", { detail: { so: id } }));
  }
  function montarSO(caja) {
    if (caja.getAttribute("data-k") === "1") return; caja.setAttribute("data-k", "1");
    caja.setAttribute("role", "tablist"); caja.setAttribute("aria-label", "Tu sistema operativo");
    SISTEMAS.forEach(function (s) {
      var b = document.createElement("button"); b.type = "button"; b.setAttribute("role", "tab"); b.setAttribute("data-s", s.id);
      b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + s.ic + '"/></svg>';
      b.appendChild(document.createTextNode(s.n));
      b.addEventListener("click", function () { ponerSO(s.id); });
      caja.appendChild(b);
    });
  }

  // ---------- resaltado de Python (pre.k-py, code.k-py) ----------
  var KW = "def|return|if|elif|else|for|while|in|not|and|or|try|except|finally|import|from|as|class|with|pass|break|continue|True|False|None|lambda";
  var BI = "print|range|len|int|str|float|bool|list|dict|set|tuple|sum|input|type|round|sorted|open";
  var RX = new RegExp("(#[^\\n]*)|([fFrRbB]?\"(?:[^\"\\\\\\n]|\\\\.)*\"|[fFrRbB]?'(?:[^'\\\\\\n]|\\\\.)*')|\\b(" + KW + ")\\b|\\b(" + BI + ")(?=\\()|\\b(\\d+(?:\\.\\d+)?)\\b", "g");
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function resaltarTexto(src) {
    var out = "", i = 0, m;
    RX.lastIndex = 0;
    while ((m = RX.exec(src))) {
      out += esc(src.slice(i, m.index));
      var cls = m[1] ? "co" : m[2] ? "st" : m[3] ? "kw" : m[4] ? "bi" : "nu";
      out += '<span class="' + cls + '">' + esc(m[0]) + "</span>";
      i = m.index + m[0].length;
    }
    return out + esc(src.slice(i));
  }
  function resaltar(el) {
    if (el.getAttribute("data-k") === "1") return; el.setAttribute("data-k", "1");
    el.innerHTML = resaltarTexto(el.textContent.replace(/^\n/, ""));
  }

  // ---------- avatares: robots dibujados con canvas (sin imágenes) ----------
  var AVATARES = [
    { id: "lila", nombre: "Lila", c: "#6d5ce8", c2: "#d9d3ff", ojos: "redondos", ant: "bola" },
    { id: "menta", nombre: "Menta", c: "#12907d", c2: "#b9f3e6", ojos: "visor", ant: "doble" },
    { id: "sol", nombre: "Sol", c: "#d38d0c", c2: "#ffe7a6", ojos: "felices", ant: "bola" },
    { id: "coral", nombre: "Coral", c: "#d6455c", c2: "#ffd0d6", ojos: "redondos", ant: "rayo" },
    { id: "cielo", nombre: "Cielo", c: "#2a6fd6", c2: "#c7dcff", ojos: "felices", ant: "doble" },
    { id: "noche", nombre: "Noche", c: "#35307a", c2: "#b9afff", ojos: "visor", ant: "rayo" },
    { id: "lima", nombre: "Lima", c: "#4d9a1f", c2: "#dcf7b3", ojos: "redondos", ant: "orejas" },
    { id: "rosa", nombre: "Rosa", c: "#b2449f", c2: "#f9cdf1", ojos: "felices", ant: "orejas" },
  ];
  function avatarDe(id) { for (var i = 0; i < AVATARES.length; i++) if (AVATARES[i].id === id) return AVATARES[i]; return null; }
  function hash(s) { var h = 2166136261; s = String(s || ""); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function avatarPorNombre(n) { return AVATARES[hash(n) % AVATARES.length].id; }

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  // dibujarAvatar(ctx, id, cx, cy, s, animo): robot centrado en (cx, cy) dentro de un cuadrado de lado s.
  // animo: "" | "feliz" | "piensa"
  function dibujarAvatar(ctx, id, cx, cy, s, animo) {
    var a = avatarDe(id) || AVATARES[0];
    var u = s / 100;
    ctx.save();
    ctx.translate(cx - 50 * u, cy - 50 * u);
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.strokeStyle = a.c; ctx.fillStyle = a.c; ctx.lineWidth = 3.2 * u;
    if (a.ant === "bola") { ctx.beginPath(); ctx.moveTo(50 * u, 22 * u); ctx.lineTo(50 * u, 10 * u); ctx.stroke(); ctx.beginPath(); ctx.arc(50 * u, 8 * u, 5 * u, 0, 7); ctx.fillStyle = a.c2; ctx.fill(); ctx.stroke(); }
    else if (a.ant === "doble") { ctx.beginPath(); ctx.moveTo(38 * u, 22 * u); ctx.lineTo(32 * u, 9 * u); ctx.moveTo(62 * u, 22 * u); ctx.lineTo(68 * u, 9 * u); ctx.stroke(); ctx.beginPath(); ctx.arc(32 * u, 8 * u, 3.6 * u, 0, 7); ctx.arc(68 * u, 8 * u, 3.6 * u, 0, 7); ctx.fill(); }
    else if (a.ant === "rayo") { ctx.beginPath(); ctx.moveTo(50 * u, 22 * u); ctx.lineTo(45 * u, 14 * u); ctx.lineTo(55 * u, 12 * u); ctx.lineTo(49 * u, 3 * u); ctx.stroke(); }
    else { rr(ctx, 14 * u, 34 * u, 10 * u, 22 * u, 4 * u); ctx.fill(); rr(ctx, 76 * u, 34 * u, 10 * u, 22 * u, 4 * u); ctx.fill(); }
    ctx.fillStyle = a.c; rr(ctx, 26 * u, 80 * u, 48 * u, 22 * u, 10 * u); ctx.fill();
    ctx.fillStyle = a.c2; rr(ctx, 42 * u, 84 * u, 16 * u, 8 * u, 4 * u); ctx.fill();
    ctx.fillStyle = a.c; rr(ctx, 20 * u, 21 * u, 60 * u, 58 * u, 16 * u); ctx.fill();
    ctx.fillStyle = a.c2; rr(ctx, 26 * u, 29 * u, 48 * u, 40 * u, 11 * u); ctx.fill();
    ctx.fillStyle = "#14122b"; ctx.strokeStyle = "#14122b"; ctx.lineWidth = 3.4 * u;
    if (animo === "feliz" || a.ojos === "felices") {
      ctx.beginPath(); ctx.arc(39 * u, 47 * u, 5 * u, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
      ctx.beginPath(); ctx.arc(61 * u, 47 * u, 5 * u, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    } else if (a.ojos === "visor") {
      rr(ctx, 31 * u, 39 * u, 38 * u, 11 * u, 5.5 * u); ctx.fill();
      ctx.fillStyle = a.c2; ctx.beginPath(); ctx.arc((animo === "piensa" ? 58 : 42) * u, 44.5 * u, 2.6 * u, 0, 7); ctx.arc((animo === "piensa" ? 66 : 50) * u, 44.5 * u, 2.6 * u, 0, 7); ctx.fill();
    } else {
      var dx = animo === "piensa" ? 2 : 0;
      ctx.beginPath(); ctx.arc((39 + dx) * u, 45 * u, 5 * u, 0, 7); ctx.arc((61 + dx) * u, 45 * u, 5 * u, 0, 7); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc((40.5 + dx) * u, 43.5 * u, 1.6 * u, 0, 7); ctx.arc((62.5 + dx) * u, 43.5 * u, 1.6 * u, 0, 7); ctx.fill();
    }
    ctx.strokeStyle = "#14122b"; ctx.lineWidth = 3 * u; ctx.beginPath();
    if (animo === "piensa") { ctx.moveTo(44 * u, 61 * u); ctx.lineTo(56 * u, 59 * u); }
    else { ctx.arc(50 * u, 56 * u, (animo === "feliz" ? 8 : 6) * u, Math.PI * 0.18, Math.PI * 0.82); }
    ctx.stroke();
    ctx.restore();
  }
  function avatarCanvas(id, px, animo) {
    var c = document.createElement("canvas"), dpr = Math.min(3, window.devicePixelRatio || 1);
    c.width = Math.round(px * dpr); c.height = Math.round(px * dpr);
    c.style.width = px + "px"; c.style.height = px + "px";
    c.setAttribute("aria-hidden", "true");
    var ctx = c.getContext("2d"); ctx.scale(dpr, dpr); dibujarAvatar(ctx, id, px / 2, px / 2, px, animo);
    return c;
  }

  // ---------- votación ----------
  function montarVoto(el) {
    if (el.getAttribute("data-k") === "1") return; el.setAttribute("data-k", "1");
    var clave = el.getAttribute("data-voto"), correcta = el.getAttribute("data-correcta") || "";
    var botones = $$("button[data-op]", el);
    botones.forEach(function (b) {
      var t = b.innerHTML.trim(); b.textContent = "";
      var s1 = document.createElement("span"); s1.className = "b";
      var s2 = document.createElement("span"); s2.className = "t"; s2.innerHTML = t;
      var s3 = document.createElement("span"); s3.className = "n";
      b.appendChild(s1); b.appendChild(s2); b.appendChild(s3); b.type = "button";
      b.setAttribute("aria-pressed", "false");
      if (correcta && b.getAttribute("data-op") === correcta) b.classList.add("bien");
    });
    var pie = $(".k-pie", el); if (!pie) { pie = document.createElement("p"); pie.className = "k-pie"; el.appendChild(pie); }
    var explica = null;
    if (correcta && el.getAttribute("data-explica")) { explica = document.createElement("p"); explica.className = "k-explica"; explica.textContent = el.getAttribute("data-explica"); explica.hidden = true; el.insertBefore(explica, pie); }
    var local = { total: 0, opciones: {}, mia: leer("voto-" + clave, "") };
    function pintar(c) {
      c = c || local; var total = c.total || 0;
      botones.forEach(function (b) {
        var op = b.getAttribute("data-op"), n = (c.opciones && c.opciones[op]) || 0, pct = total ? Math.round(n * 100 / total) : 0;
        $(".b", b).style.width = (c.mia ? pct : 0) + "%";
        $(".n", b).textContent = c.mia && total ? pct + " %" : "";
        b.setAttribute("aria-pressed", String(c.mia === op));
      });
      if (correcta && c.mia) { el.classList.add("revela"); if (explica) explica.hidden = false; }
      pie.textContent = !c.mia ? (total ? "Vota para ver lo que eligió el grupo · " + total + (total === 1 ? " voto" : " votos") : "Toca una opción: el grupo ve el resultado al instante")
        : (total ? total + (total === 1 ? " voto del grupo" : " votos del grupo") + " · puedes cambiar el tuyo" : "Tu voto quedó guardado en esta pantalla");
    }
    function votar(op) {
      local.mia = op; guardar("voto-" + clave, op);
      if (!local.total) { local.total = 1; local.opciones = {}; local.opciones[op] = 1; }
      pintar(local);
      pedir("/voto", { escena: clave, opcion: op }).then(function (r) { if (r.ok && r.datos && typeof r.datos.total === "number") { local = r.datos; pintar(local); } });
      el.dispatchEvent(new CustomEvent("k-voto", { detail: { clave: clave, opcion: op }, bubbles: true }));
    }
    botones.forEach(function (b) { b.addEventListener("click", function () { votar(b.getAttribute("data-op")); }); });
    el.kVotar = votar;
    function refrescar() {
      if (document.visibilityState === "hidden") return;
      pedir("/votos?escena=" + encodeURIComponent(clave)).then(function (r) {
        if (r.ok && r.datos && typeof r.datos.total === "number") { if (!r.datos.mia && local.mia) r.datos.mia = local.mia; local = r.datos; }
        pintar(local);
      });
    }
    pintar(local); refrescar(); setInterval(refrescar, 5000);
  }

  // ---------- muro ----------
  function montarMuro(el) {
    if (el.getAttribute("data-k") === "1") return; el.setAttribute("data-k", "1");
    var clave = el.getAttribute("data-muro"), uid = "m-" + clave;
    var q = document.createElement("label"); q.className = "k-q"; q.setAttribute("for", uid); q.textContent = el.getAttribute("data-pregunta") || "Escribe una línea";
    if (el.getAttribute("data-color")) q.style.setProperty("--c", el.getAttribute("data-color"));
    var fila = document.createElement("div"); fila.className = "k-fila";
    var inp = document.createElement("input"); inp.id = uid; inp.type = "text"; inp.maxLength = 140; inp.autocomplete = "off"; inp.enterKeyHint = "send";
    inp.placeholder = el.getAttribute("data-placeholder") || "Una línea, con tus palabras";
    var btn = document.createElement("button"); btn.type = "button"; btn.className = "k-btn"; btn.textContent = "Publicar";
    fila.appendChild(inp); fila.appendChild(btn);
    var lista = document.createElement("ul"); lista.className = "k-lista"; lista.setAttribute("aria-live", "polite");
    var pie = document.createElement("p"); pie.className = "k-pie";
    el.appendChild(q); el.appendChild(fila); el.appendChild(lista); el.appendChild(pie);
    inp.value = leer("muro-" + clave, "");
    var ultimas = [];
    function pintar(entradas) {
      if (entradas) ultimas = entradas;
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
    el.kPublicar = function (t) { inp.value = t; publicar(); };
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

  // ---------- la fotito ----------
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
  function ajustar(ctx, texto, ancho, px, peso, min) {
    var f = px;
    do { ctx.font = peso + " " + f + "px system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"; if (ctx.measureText(texto).width <= ancho) break; f -= 2; } while (f > (min || 24));
    return f;
  }
  // fotito({nombre, avatar, etiqueta, resultado, detalle, reflexion}) → canvas 1080 x 1350 (4:5)
  function fotito(d) {
    var W = 1080, H = 1350, c = document.createElement("canvas"); c.width = W; c.height = H;
    var ctx = c.getContext("2d"), FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", MONO = "ui-monospace, Menlo, Consolas, monospace";
    var g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, "#0b1a2e"); g.addColorStop(.55, "#123a66"); g.addColorStop(1, "#1f5f99");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    var r1 = ctx.createRadialGradient(900, 150, 10, 900, 150, 520); r1.addColorStop(0, "rgba(255,212,59,.30)"); r1.addColorStop(1, "rgba(255,212,59,0)");
    ctx.fillStyle = r1; ctx.fillRect(0, 0, W, H);
    var r2 = ctx.createRadialGradient(140, 1250, 10, 140, 1250, 560); r2.addColorStop(0, "rgba(132,185,238,.30)"); r2.addColorStop(1, "rgba(132,185,238,0)");
    ctx.fillStyle = r2; ctx.fillRect(0, 0, W, H);
    // constelación propia: sale del nombre, así cada foto es distinta
    var s = hash(d.nombre + "|" + d.resultado) || 7, rnd = function () { s = Math.imul(s ^ (s >>> 15), 2246822507) ^ Math.imul(s ^ (s >>> 13), 3266489909); s >>>= 0; return (s % 10000) / 10000; };
    for (var i = 0; i < 70; i++) { ctx.fillStyle = i % 6 === 0 ? "rgba(255,212,59,.85)" : "rgba(214,232,255," + (0.25 + rnd() * .6).toFixed(2) + ")"; ctx.beginPath(); ctx.arc(rnd() * W, rnd() * H, 1 + rnd() * 2.6, 0, 7); ctx.fill(); }
    // una serpiente de estrellas (curva suave) que cambia con cada nombre
    ctx.strokeStyle = "rgba(255,212,59,.45)"; ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.beginPath();
    var sx = 700 + rnd() * 60, sy = 90 + rnd() * 30; ctx.moveTo(sx, sy);
    for (var k = 0; k < 3; k++) { ctx.quadraticCurveTo(sx + 45, sy + (k % 2 ? -50 : 50), sx + 90, sy); sx += 90; }
    ctx.stroke();
    // cabecera
    ctx.textBaseline = "alphabetic"; ctx.fillStyle = "#ffd43b"; ctx.font = "800 30px " + FONT; ctx.fillText("JMD LEARNING", 72, 104);
    ctx.fillStyle = "rgba(230,240,255,.85)"; ajustar(ctx, CURSO, W - 144, 30, "600", 22); ctx.fillText(CURSO, 72, 148);
    // tarjeta
    ctx.fillStyle = "rgba(255,255,255,.07)"; rr(ctx, 56, 196, W - 112, 1040, 44); ctx.fill();
    ctx.strokeStyle = "rgba(169,208,245,.30)"; ctx.lineWidth = 2; rr(ctx, 56, 196, W - 112, 1040, 44); ctx.stroke();
    // prompt de Python en la esquina de la tarjeta
    ctx.fillStyle = "rgba(255,212,59,.9)"; ctx.font = "800 34px " + MONO; ctx.fillText(">>>", 96, 262);
    // avatar en un halo
    var hal = ctx.createRadialGradient(W / 2, 390, 20, W / 2, 390, 190); hal.addColorStop(0, "rgba(255,212,59,.45)"); hal.addColorStop(1, "rgba(255,212,59,0)");
    ctx.fillStyle = hal; ctx.beginPath(); ctx.arc(W / 2, 390, 190, 0, 7); ctx.fill();
    ctx.fillStyle = "#f3f8ff"; ctx.beginPath(); ctx.arc(W / 2, 390, 140, 0, 7); ctx.fill();
    dibujarAvatar(ctx, d.avatar || avatarPorNombre(d.nombre), W / 2, 396, 230, "feliz");
    // nombre
    ctx.textAlign = "center"; ctx.fillStyle = "#ffffff";
    var nom = String(d.nombre || "Alumno").slice(0, 48); ajustar(ctx, nom, W - 200, 72, "800", 34); ctx.fillText(nom, W / 2, 618);
    ctx.fillStyle = "rgba(230,240,255,.88)"; ajustar(ctx, CLASE, W - 200, 32, "600", 22); ctx.fillText(CLASE, W / 2, 668);
    ctx.fillStyle = "#a9d0f5"; ctx.font = "600 28px " + FONT; ctx.fillText(FECHA, W / 2, 712);
    // resultado
    ctx.fillStyle = "rgba(8,20,36,.55)"; rr(ctx, 120, 752, W - 240, 210, 30); ctx.fill();
    ctx.fillStyle = "#ffd43b"; ctx.font = "800 24px " + FONT; ctx.fillText(String(d.etiqueta || "Mi resultado").toUpperCase(), W / 2, 800);
    ctx.fillStyle = "#ffffff"; var res = String(d.resultado || ""); ajustar(ctx, res, W - 300, 60, "800", 30); ctx.fillText(res, W / 2, 872);
    if (d.detalle) { ctx.fillStyle = "rgba(230,240,255,.85)"; ajustar(ctx, d.detalle, W - 300, 30, "600", 20); ctx.fillText(d.detalle, W / 2, 922); }
    // reflexión
    var refl = String(d.reflexion || "").trim();
    ctx.font = "italic 500 38px " + FONT;
    var ls = envolver(ctx, refl ? "«" + refl + "»" : "«Hoy dejé listo mi entorno de Python: versiones, venv y Docker.»", W - 260, 4);
    var y0 = 1112 - (ls.length - 1) * 25;
    ctx.fillStyle = "#f2f7ff"; ls.forEach(function (l, j) { ctx.fillText(l, W / 2, y0 + j * 50); });
    // pie
    ctx.fillStyle = "rgba(230,240,255,.72)"; ctx.font = "600 26px " + FONT; ctx.fillText("jmd-learn.online  ·  #PythonDeCero", W / 2, 1296);
    ctx.textAlign = "left";
    return c;
  }

  // descargar: la crea la página del LMS (el iframe no tiene allow-downloads). true si se pudo intentar.
  function descargar(canvas, archivo) {
    var d = docAnfitrion() || document, win = d.defaultView || window;
    return new Promise(function (ok) {
      function conUrl(url, liberar) {
        try {
          var a = d.createElement("a"); a.href = url; a.download = archivo; a.rel = "noopener"; a.style.display = "none";
          d.body.appendChild(a); a.click();
          setTimeout(function () { a.remove(); if (liberar) try { win.URL.revokeObjectURL(url); } catch (e) {} }, 4000);
          ok(true);
        } catch (e) { ok(false); }
      }
      try {
        canvas.toBlob(function (b) {
          if (!b) return conUrl(canvas.toDataURL("image/png"), false);
          try { conUrl(win.URL.createObjectURL(b), true); } catch (e) { conUrl(canvas.toDataURL("image/png"), false); }
        }, "image/png");
      } catch (e) { ok(false); }
    });
  }

  // compartir: la hoja de compartir del celular («Guardar imagen» en iPhone). Solo si el navegador puede.
  function puedeCompartir() {
    try { var n = (docAnfitrion() ? window.parent : window).navigator; return !!(n.share && n.canShare && window.File && n.canShare({ files: [new File([new Blob(["x"])], "x.png", { type: "image/png" })] })); } catch (e) { return false; }
  }
  function compartir(canvas, archivo) {
    return new Promise(function (ok) {
      canvas.toBlob(function (b) {
        try {
          var n = (docAnfitrion() ? window.parent : window).navigator;
          n.share({ files: [new File([b], archivo, { type: "image/png" })], title: "Mi clase 1 de Python" }).then(function () { ok(true); }).catch(function () { ok(false); });
        } catch (e) { ok(false); }
      }, "image/png");
    });
  }

  function slug(t) { return String(t || "alumno").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "alumno"; }

  // mostrarFoto(contenedor, canvas, archivo): vista previa que se puede mantener pulsada + botones.
  function mostrarFoto(cont, canvas, archivo) {
    cont.textContent = ""; cont.classList.add("k-foto");
    var img = document.createElement("img"); img.alt = "Tu fotito de la clase: nombre, avatar, resultado y reflexión";
    img.src = canvas.toDataURL("image/png"); img.width = 1080; img.height = 1350;
    var botones = document.createElement("div"); botones.className = "k-links";
    var b1 = document.createElement("button"); b1.type = "button"; b1.className = "k-btn"; b1.textContent = "⬇ Descargar PNG";
    b1.addEventListener("click", function () {
      descargar(canvas, archivo).then(function (s) { toast(s ? "Listo: revisa tus descargas (" + archivo + "). Si no aparece, mantén pulsada la imagen." : "Tu navegador no dejó descargar: mantén pulsada la imagen o haz clic derecho → «Guardar imagen como…»", 4200); });
    });
    botones.appendChild(b1);
    if (puedeCompartir()) {
      var b2 = document.createElement("button"); b2.type = "button"; b2.className = "k-btn sec"; b2.textContent = "Compartir o guardar en el celular";
      b2.addEventListener("click", function () { compartir(canvas, archivo).then(function (s) { if (!s) toast("No se abrió la hoja de compartir: mantén pulsada la imagen."); }); });
      botones.appendChild(b2);
    }
    var nota = document.createElement("p");
    nota.textContent = "¿No se descargó? En el celular, mantén pulsada la imagen → «Guardar imagen». En la compu, clic derecho → «Guardar imagen como…».";
    cont.appendChild(img); cont.appendChild(botones); cont.appendChild(nota);
    return img;
  }

  // ---------- montaje automático ----------
  function montar(raiz) {
    $$("[data-so-tabs]", raiz).forEach(montarSO);
    if ($$("[data-so-tabs],[data-so]", raiz).length) ponerSO(soActual, false);
    $$("pre.k-py, code.k-py", raiz).forEach(resaltar);
    $$("[data-voto]", raiz).forEach(montarVoto);
    $$("[data-muro]", raiz).forEach(montarMuro);
    $$("[data-check]", raiz).forEach(montarCheck);
  }
  document.addEventListener("click", function (e) {
    var t = e.target && e.target.closest ? e.target.closest("[data-abrir],[data-copiar-texto]") : null;
    if (!t) return;
    if (t.hasAttribute("data-abrir")) { e.preventDefault(); abrir(t.getAttribute("data-abrir")); return; }
    copiar(t.getAttribute("data-copiar-texto")).then(function (ok) {
      var antes = t.getAttribute("data-txt") || t.textContent; t.setAttribute("data-txt", antes);
      t.textContent = ok ? "✓ Copiado" : "No pude copiar"; t.classList.toggle("ok", !!ok);
      setTimeout(function () { t.textContent = antes; t.classList.remove("ok"); }, 2200);
    });
  });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { montar(); });
  else montar();

  window.PY = {
    leccion: LECCION, escena: ESCENA, curso: CURSO, clase: CLASE, fecha: FECHA,
    pedir: pedir, toast: toast, copiar: copiar, abrir: abrir, yo: yo, leer: leer, guardar: guardar, hash: hash, slug: slug,
    so: so, ponerSO: ponerSO, sistemas: SISTEMAS, evidencia: evidencia, resaltar: resaltarTexto,
    avatares: AVATARES, avatarPorNombre: avatarPorNombre, dibujarAvatar: dibujarAvatar, avatarCanvas: avatarCanvas,
    fotito: fotito, descargar: descargar, mostrarFoto: mostrarFoto, montar: montar,
  };
})();
