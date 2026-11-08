// gq.js · kit de las escenas LIVE de GoldenQuerys (gq-02 en adelante). Script clásico, sin módulos:
//   <link rel="stylesheet" href="../../comun/escena.css">
//   <link rel="stylesheet" href="../../comun/gq.css">
//   <script src="../../comun/gq.js"></script>            (al final del body)
//
// Se monta solo sobre el marcado:
//   <div class="k-caja k-voto" data-voto="gq02-algo" [data-correcta="b"] [data-explica="…"]>
//      <p class="k-q">Pregunta</p><div class="k-ops"><button data-op="a">…</button>…</div></div>
//   <div class="k-caja k-muro" data-muro="gq02-algo" data-pregunta="…" [data-placeholder="…"]></div>
//   <ul class="k-check" data-check="gq02-algo"><li><label><input type="checkbox"><span></span><em>…</em></label></li>…</ul>
//   <button class="k-link" data-abrir="https://…">Texto</button>        → pestaña nueva (o copia el enlace)
//   <button class="k-btn" data-copiar-texto="…">Copiar</button>         → portapapeles
//   <button class="k-btn" data-dsh>Abrir DeepSeek Harness</button>      → lo abre el LIVE, al lado de la escena
//
// Y expone window.GQ: pedir, toast, copiar, abrir, abrirDsh, yo, avatares, dibujarAvatar, avatarCanvas,
// fotito (PNG con canvas) y mostrarFoto (vista previa + descarga + «mantén pulsada»).
//
// Todo va contra la API del LIVE (votos y muro viven en la memoria del servidor). Si la API no responde,
// la escena sigue en local: nadie se queda con un botón muerto.
(function () {
  "use strict";
  var M = location.pathname.match(/\/live\/([^/]+)\/escenas\/([^/]+)\//) || [];
  var LECCION = M[1] || "gq-02";
  var ESCENA = M[2] || "";
  var BASE = "/api/v1/live/" + encodeURIComponent(LECCION);
  var CURSO = "GoldenQuerys con IA · reportes dinámicos";
  var CLASE = "Sesión 1 · Tus tres preguntas de oro";
  var FECHA = "Martes 10 de noviembre de 2026";
  var PFX = "gq02-";

  // ---------- tema del LMS (?tema=dark|light) ----------
  try {
    var tema = new URLSearchParams(location.search).get("tema");
    if (tema === "dark" || tema === "light") document.documentElement.setAttribute("data-tema", tema);
  } catch (e) {}

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

  // abrirDsh: el LIVE abre DeepSeek Harness en su panel, al lado de la escena (ver live-alumno.tsx).
  function abrirDsh() {
    try {
      if (window.parent && window.parent !== window) { window.parent.postMessage({ tipo: "abrir-dsh" }, location.origin); toast("DeepSeek Harness se abre en el panel de la derecha. Pega tu pedido con Ctrl+V."); return; }
    } catch (e) {}
    toast("Abre DeepSeek Harness con el botón de arriba de la escena y pega tu pedido.");
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

  // ---------- avatares: ensayadores (robots con nombre de mineral), dibujados con canvas ----------
  var AVATARES = [
    { id: "cobre", nombre: "Cobre", c: "#b8642e", c2: "#ffdcc4", ojos: "redondos", ant: "casco" },
    { id: "plata", nombre: "Plata", c: "#6f7c8b", c2: "#e4eaf1", ojos: "visor", ant: "bola" },
    { id: "ambar", nombre: "Ámbar", c: "#c48709", c2: "#ffe7a6", ojos: "felices", ant: "casco" },
    { id: "jade", nombre: "Jade", c: "#1d8a64", c2: "#c4f1df", ojos: "redondos", ant: "doble" },
    { id: "onix", nombre: "Ónix", c: "#2e3150", c2: "#c9cbe8", ojos: "visor", ant: "casco" },
    { id: "cuarzo", nombre: "Cuarzo", c: "#a85b92", c2: "#f7d5ee", ojos: "felices", ant: "bola" },
    { id: "rubi", nombre: "Rubí", c: "#c2304a", c2: "#ffd2da", ojos: "redondos", ant: "rayo" },
    { id: "turquesa", nombre: "Turquesa", c: "#14869a", c2: "#c3f0f6", ojos: "felices", ant: "casco" },
  ];
  function avatarDe(id) { for (var i = 0; i < AVATARES.length; i++) if (AVATARES[i].id === id) return AVATARES[i]; return null; }
  function hash(s) { var h = 2166136261; s = String(s || ""); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function avatarPorNombre(n) { return AVATARES[hash(n) % AVATARES.length].id; }

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  // dibujarAvatar(ctx, id, cx, cy, s, animo): ensayador centrado en (cx, cy) dentro de un cuadrado de lado s.
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
    // hombros
    ctx.fillStyle = a.c; rr(ctx, 26 * u, 80 * u, 48 * u, 22 * u, 10 * u); ctx.fill();
    ctx.fillStyle = a.c2; rr(ctx, 42 * u, 84 * u, 16 * u, 8 * u, 4 * u); ctx.fill();
    // cabeza
    ctx.fillStyle = a.c; rr(ctx, 20 * u, 21 * u, 60 * u, 58 * u, 16 * u); ctx.fill();
    ctx.fillStyle = a.c2; rr(ctx, 26 * u, 29 * u, 48 * u, 40 * u, 11 * u); ctx.fill();
    // casco de minero con lámpara
    if (a.ant === "casco") {
      ctx.fillStyle = "#f2c14e"; ctx.beginPath(); ctx.moveTo(16 * u, 30 * u); ctx.quadraticCurveTo(50 * u, -6 * u, 84 * u, 30 * u); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#d9a21b"; rr(ctx, 12 * u, 27 * u, 76 * u, 7 * u, 3.5 * u); ctx.fill();
      ctx.fillStyle = "#fff6d6"; ctx.beginPath(); ctx.arc(50 * u, 17 * u, 5.5 * u, 0, 7); ctx.fill();
      ctx.strokeStyle = "#b07a00"; ctx.lineWidth = 1.6 * u; ctx.stroke();
    }
    // ojos
    ctx.fillStyle = "#14122b"; ctx.strokeStyle = "#14122b"; ctx.lineWidth = 3.4 * u;
    if (animo === "feliz" || a.ojos === "felices") {
      ctx.beginPath(); ctx.arc(39 * u, 49 * u, 5 * u, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
      ctx.beginPath(); ctx.arc(61 * u, 49 * u, 5 * u, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    } else if (a.ojos === "visor") {
      rr(ctx, 31 * u, 41 * u, 38 * u, 11 * u, 5.5 * u); ctx.fill();
      ctx.fillStyle = a.c2; ctx.beginPath(); ctx.arc((animo === "piensa" ? 58 : 42) * u, 46.5 * u, 2.6 * u, 0, 7); ctx.arc((animo === "piensa" ? 66 : 50) * u, 46.5 * u, 2.6 * u, 0, 7); ctx.fill();
    } else {
      var dx = animo === "piensa" ? 2 : 0;
      ctx.beginPath(); ctx.arc((39 + dx) * u, 47 * u, 5 * u, 0, 7); ctx.arc((61 + dx) * u, 47 * u, 5 * u, 0, 7); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc((40.5 + dx) * u, 45.5 * u, 1.6 * u, 0, 7); ctx.arc((62.5 + dx) * u, 45.5 * u, 1.6 * u, 0, 7); ctx.fill();
    }
    // boca
    ctx.strokeStyle = "#14122b"; ctx.lineWidth = 3 * u; ctx.beginPath();
    if (animo === "piensa") { ctx.moveTo(44 * u, 62 * u); ctx.lineTo(56 * u, 60 * u); }
    else { ctx.arc(50 * u, 57 * u, (animo === "feliz" ? 8 : 6) * u, Math.PI * 0.18, Math.PI * 0.82); }
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
      if (k === clavePintada) return; // sin cambios: no se rehace la lista (cada línea entra animada)
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
  var FUENTE = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
  function ajustar(ctx, texto, ancho, px, peso, min) {
    var f = px;
    do { ctx.font = peso + " " + f + "px " + FUENTE; if (ctx.measureText(texto).width <= ancho) break; f -= 2; } while (f > (min || 24));
    return f;
  }
  // lingote: trapecio dorado con brillo, centrado en (cx, cy), ancho w
  function lingote(ctx, cx, cy, w) {
    var h = w * .42, t = w * .2;
    ctx.save();
    var g = ctx.createLinearGradient(cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2);
    g.addColorStop(0, "#ffe9a3"); g.addColorStop(.45, "#f2c14e"); g.addColorStop(1, "#b07a00");
    ctx.fillStyle = g; ctx.beginPath();
    ctx.moveTo(cx - w / 2 + t, cy - h / 2); ctx.lineTo(cx + w / 2 - t, cy - h / 2); ctx.lineTo(cx + w / 2, cy + h / 2); ctx.lineTo(cx - w / 2, cy + h / 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.45)"; ctx.beginPath();
    ctx.moveTo(cx - w / 2 + t + 6, cy - h / 2 + 5); ctx.lineTo(cx - w / 2 + t + w * .22, cy - h / 2 + 5); ctx.lineTo(cx - w / 2 + w * .18, cy + h / 2 - 6); ctx.lineTo(cx - w / 2 + 8, cy + h / 2 - 6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgba(120,80,0,.55)"; ctx.font = "800 " + Math.round(h * .32) + "px " + FUENTE; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("24K", cx + w * .06, cy + 2);
    ctx.restore();
  }
  // fotito({nombre, avatar, etiqueta, resultado, detalle, titulo, reflexion}) → canvas 1080 x 1350 (4:5)
  function fotito(d) {
    var W = 1080, H = 1350, c = document.createElement("canvas"); c.width = W; c.height = H;
    var ctx = c.getContext("2d");
    var g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, "#14122b"); g.addColorStop(.6, "#231a3f"); g.addColorStop(1, "#3a2a12");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    var r1 = ctx.createRadialGradient(880, 170, 10, 880, 170, 540); r1.addColorStop(0, "rgba(242,193,78,.38)"); r1.addColorStop(1, "rgba(242,193,78,0)");
    ctx.fillStyle = r1; ctx.fillRect(0, 0, W, H);
    var r2 = ctx.createRadialGradient(150, 1240, 10, 150, 1240, 560); r2.addColorStop(0, "rgba(157,140,255,.28)"); r2.addColorStop(1, "rgba(157,140,255,0)");
    ctx.fillStyle = r2; ctx.fillRect(0, 0, W, H);
    // polvo de oro propio: sale del nombre, así cada foto es distinta
    var s = hash(d.nombre + "|" + d.resultado) || 7, rnd = function () { s = Math.imul(s ^ (s >>> 15), 2246822507) ^ Math.imul(s ^ (s >>> 13), 3266489909); s >>>= 0; return (s % 10000) / 10000; };
    for (var i = 0; i < 90; i++) {
      var px = rnd() * W, py = rnd() * H, al = i % 4 === 0 ? 0.45 + rnd() * .5 : 0.2 + rnd() * .5, ra = 1 + rnd() * 2.6;
      if (px > 56 && px < W - 56 && py > 196 && py < 1236) al *= .3; // dentro de la tarjeta, casi invisible: no ensucia el texto
      ctx.fillStyle = (i % 4 === 0 ? "rgba(242,193,78," : "rgba(233,228,255,") + al.toFixed(2) + ")"; ctx.beginPath(); ctx.arc(px, py, ra, 0, 7); ctx.fill();
    }
    // cabecera
    ctx.textBaseline = "alphabetic"; ctx.textAlign = "left";
    ctx.fillStyle = "#f2c14e"; ctx.font = "800 30px " + FUENTE; ctx.fillText("JMD LEARNING", 72, 104);
    ctx.fillStyle = "rgba(243,238,220,.85)"; ajustar(ctx, CURSO, W - 144, 30, "600", 22); ctx.fillText(CURSO, 72, 148);
    // tarjeta
    ctx.fillStyle = "rgba(255,255,255,.06)"; rr(ctx, 56, 196, W - 112, 1040, 44); ctx.fill();
    ctx.strokeStyle = "rgba(242,193,78,.32)"; ctx.lineWidth = 2; rr(ctx, 56, 196, W - 112, 1040, 44); ctx.stroke();
    // avatar en un halo de oro
    var hal = ctx.createRadialGradient(W / 2, 384, 20, W / 2, 384, 190); hal.addColorStop(0, "rgba(242,193,78,.5)"); hal.addColorStop(1, "rgba(242,193,78,0)");
    ctx.fillStyle = hal; ctx.beginPath(); ctx.arc(W / 2, 384, 190, 0, 7); ctx.fill();
    ctx.fillStyle = "#fff8e6"; ctx.beginPath(); ctx.arc(W / 2, 384, 138, 0, 7); ctx.fill();
    ctx.strokeStyle = "#f2c14e"; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(W / 2, 384, 138, 0, 7); ctx.stroke();
    dibujarAvatar(ctx, d.avatar || avatarPorNombre(d.nombre), W / 2, 390, 226, "feliz");
    // nombre, sesión y fecha
    ctx.textAlign = "center"; ctx.fillStyle = "#ffffff";
    var nom = String(d.nombre || "Alumno").slice(0, 48); ajustar(ctx, nom, W - 200, 70, "800", 34); ctx.fillText(nom, W / 2, 608);
    ctx.fillStyle = "rgba(243,238,220,.9)"; ajustar(ctx, CLASE, W - 200, 32, "600", 22); ctx.fillText(CLASE, W / 2, 656);
    ctx.fillStyle = "#e9bd52"; ctx.font = "600 27px " + FUENTE; ctx.fillText(FECHA, W / 2, 698);
    // resultado con su lingote
    ctx.fillStyle = "rgba(10,8,24,.55)"; rr(ctx, 110, 734, W - 220, 236, 30); ctx.fill();
    ctx.strokeStyle = "rgba(242,193,78,.4)"; ctx.lineWidth = 2; rr(ctx, 110, 734, W - 220, 236, 30); ctx.stroke();
    lingote(ctx, 214, 852, 150);
    ctx.textAlign = "left";
    ctx.fillStyle = "#f2c14e"; ctx.font = "800 23px " + FUENTE; ctx.fillText(String(d.etiqueta || "Mi resultado").toUpperCase(), 318, 790);
    ctx.fillStyle = "#ffffff"; var res = String(d.resultado || ""); ajustar(ctx, res, W - 460, 58, "800", 28); ctx.fillText(res, 318, 852);
    if (d.titulo) { ctx.fillStyle = "#ffe9a3"; ajustar(ctx, String(d.titulo), W - 460, 32, "700", 20); ctx.fillText(String(d.titulo), 318, 898); }
    if (d.detalle) { ctx.fillStyle = "rgba(243,238,220,.82)"; ajustar(ctx, d.detalle, W - 460, 25, "600", 18); ctx.fillText(d.detalle, 318, 940); }
    // reflexión
    ctx.textAlign = "center";
    var refl = String(d.reflexion || "").trim();
    ctx.font = "italic 500 37px " + FUENTE;
    var ls = envolver(ctx, refl ? "«" + refl + "»" : "«Antes de creerle a un número, reviso su SQL.»", W - 250, 4);
    var y0 = 1112 - (ls.length - 1) * 24;
    ctx.fillStyle = "#f6f2e4"; ls.forEach(function (l, j) { ctx.fillText(l, W / 2, y0 + j * 48); });
    // pie
    ctx.fillStyle = "rgba(243,238,220,.72)"; ctx.font = "600 26px " + FUENTE; ctx.fillText("jmd-learn.online  ·  #GoldenQuerys", W / 2, 1296);
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
          n.share({ files: [new File([b], archivo, { type: "image/png" })], title: "Mi sesión de GoldenQuerys" }).then(function () { ok(true); }).catch(function () { ok(false); });
        } catch (e) { ok(false); }
      }, "image/png");
    });
  }

  function slug(t) { return String(t || "alumno").toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "alumno"; }

  // mostrarFoto(contenedor, canvas, archivo): vista previa que se puede mantener pulsada + botones.
  function mostrarFoto(cont, canvas, archivo) {
    cont.textContent = ""; cont.classList.add("k-foto");
    var img = document.createElement("img"); img.alt = "Tu fotito de la sesión: nombre, avatar, resultado y reflexión";
    img.src = canvas.toDataURL("image/png"); img.width = 1080; img.height = 1350;
    var botones = document.createElement("div"); botones.className = "k-links";
    var b1 = document.createElement("button"); b1.type = "button"; b1.className = "k-btn oro"; b1.textContent = "⬇ Descargar PNG";
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

  // ---------- cielo de fondo (decorativo): el mismo de gq-01 ----------
  function cielo() {
    if ($(".esc-cielo")) return;
    var NS = "http://www.w3.org/2000/svg", svg = document.createElementNS(NS, "svg");
    svg.setAttribute("class", "esc-cielo"); svg.setAttribute("viewBox", "0 0 1600 900"); svg.setAttribute("preserveAspectRatio", "xMidYMid slice");
    svg.setAttribute("aria-hidden", "true"); svg.setAttribute("focusable", "false");
    var trazos = [["t", "M1180 92 L1252 130 L1318 104 L1384 168 L1440 146"], ["t", "M92 612 L168 560 L236 598 L296 524"], ["tb", "M1010 760 L1086 708 L1162 744 L1230 690 L1300 722"]];
    trazos.forEach(function (t) { var p = document.createElementNS(NS, "path"); p.setAttribute("class", t[0]); p.setAttribute("pathLength", "1"); p.setAttribute("d", t[1]); svg.appendChild(p); });
    var est = [[1180, 92, 4, "e"], [1252, 130, 5, "eo"], [1318, 104, 3.5, "e"], [1384, 168, 4, "eg"], [1440, 146, 3, "e"], [92, 612, 3.5, "e"], [168, 560, 4.5, "eg"], [236, 598, 3, "e"], [296, 524, 5, "eo"],
      [1010, 760, 3.5, "e"], [1086, 708, 4, "eg"], [1162, 744, 3, "e"], [1230, 690, 4.5, "eo"], [1300, 722, 3.5, "e"]];
    est.forEach(function (e) { var c = document.createElementNS(NS, "circle"); c.setAttribute("cx", e[0]); c.setAttribute("cy", e[1]); c.setAttribute("r", e[2]); c.setAttribute("class", e[3]); svg.appendChild(c); });
    for (var i = 0; i < 16; i++) {
      var c = document.createElementNS(NS, "circle"), h = hash("p" + i);
      c.setAttribute("cx", 40 + h % 1520); c.setAttribute("cy", 40 + (h >>> 11) % 820); c.setAttribute("r", 1.5 + (h % 4) / 10);
      c.setAttribute("class", ["e", "eg", "eo"][i % 3] + " p"); c.style.setProperty("--p", ((h >>> 5) % 40) / 10 + "s"); svg.appendChild(c);
    }
    document.body.insertBefore(svg, document.body.firstChild);
  }

  // ---------- montaje automático ----------
  function montar(raiz) {
    $$("[data-voto]", raiz).forEach(montarVoto);
    $$("[data-muro]", raiz).forEach(montarMuro);
    $$("[data-check]", raiz).forEach(montarCheck);
  }
  document.addEventListener("click", function (e) {
    var t = e.target && e.target.closest ? e.target.closest("[data-abrir],[data-copiar-texto],[data-dsh]") : null;
    if (!t) return;
    if (t.hasAttribute("data-abrir")) { e.preventDefault(); abrir(t.getAttribute("data-abrir")); return; }
    if (t.hasAttribute("data-dsh") && !t.hasAttribute("data-copiar-texto")) { e.preventDefault(); abrirDsh(); return; }
    var dsh = t.hasAttribute("data-dsh");
    copiar(t.getAttribute("data-copiar-texto")).then(function (ok) {
      var antes = t.getAttribute("data-txt") || t.textContent; t.setAttribute("data-txt", antes);
      t.textContent = ok ? "✓ Copiado" : "No pude copiar"; t.classList.toggle("ok", !!ok);
      if (ok && dsh) abrirDsh();
      setTimeout(function () { t.textContent = antes; t.classList.remove("ok"); }, 2200);
    });
  });
  function arrancar() { cielo(); montar(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", arrancar);
  else arrancar();

  window.GQ = {
    leccion: LECCION, escena: ESCENA, curso: CURSO, clase: CLASE, fecha: FECHA,
    pedir: pedir, toast: toast, copiar: copiar, abrir: abrir, abrirDsh: abrirDsh, yo: yo, leer: leer, guardar: guardar, hash: hash, slug: slug,
    avatares: AVATARES, avatarPorNombre: avatarPorNombre, dibujarAvatar: dibujarAvatar, avatarCanvas: avatarCanvas,
    fotito: fotito, descargar: descargar, mostrarFoto: mostrarFoto, montar: montar,
  };
})();
