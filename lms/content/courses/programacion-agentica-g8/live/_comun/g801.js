// g801.js · kit de las escenas de la clase 1 del Grupo 8 (g8-01). Script clásico, sin módulos:
//   <link rel="stylesheet" href="../../comun/g801.css">
//   <script src="../../comun/g801.js"></script>            (al final del body)
//
// Se monta solo sobre el marcado:
//   <div class="k-caja k-voto" data-voto="g801-sistema" [data-correcta="rtk"] [data-explica="…"]>
//      <p class="k-q">Pregunta</p><div class="k-ops"><button data-op="windows">Windows</button>…</div></div>
//   <div class="k-caja k-muro" data-muro="g801-practicar" data-pregunta="…" [data-placeholder="…"]></div>
//   <ul class="k-check" data-check="g801-vscode"><li><label><input type="checkbox"><span></span><em>…</em></label></li>…</ul>
//   <button class="k-link" data-abrir="https://…">Texto</button>        → pestaña nueva (o copia el enlace)
//   <button class="k-btn" data-copiar-texto="…">Copiar</button>         → portapapeles
//
// Y expone window.G8: pedir, toast, copiar, abrir, yo, avatares, dibujarAvatar, avatarCanvas,
// fotito (PNG con canvas) y mostrarFoto (vista previa + descarga + «mantén pulsada»).
//
// Todo va contra la API del LIVE (votos y muro en memoria del servidor). Si la API no responde, la
// escena sigue funcionando en local: nadie se queda con un botón muerto.
(function () {
  "use strict";
  var M = location.pathname.match(/\/live\/([^/]+)\/escenas\/([^/]+)\//) || [];
  var LECCION = M[1] || "g8-01";
  var ESCENA = M[2] || "";
  var BASE = "/api/v1/live/" + encodeURIComponent(LECCION);
  var CURSO = "Programación agéntica (vibecoding) · Grupo 8";
  var CLASE = "Clase 1 · Tu asistente virtual: herramientas, tipos y primer prototipo";
  var FECHA = "Domingo 8 de noviembre de 2026";

  // ---------- utilidades ----------
  function $(sel, raiz) { return (raiz || document).querySelector(sel); }
  function $$(sel, raiz) { return Array.prototype.slice.call((raiz || document).querySelectorAll(sel)); }
  function leer(k, def) { try { var v = localStorage.getItem("g801-" + k); return v === null ? def : JSON.parse(v); } catch (e) { return def; } }
  function guardar(k, v) { try { localStorage.setItem("g801-" + k, JSON.stringify(v)); } catch (e) {} }

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
    // antena u orejas
    ctx.strokeStyle = a.c; ctx.fillStyle = a.c; ctx.lineWidth = 3.2 * u;
    if (a.ant === "bola") { ctx.beginPath(); ctx.moveTo(50 * u, 22 * u); ctx.lineTo(50 * u, 10 * u); ctx.stroke(); ctx.beginPath(); ctx.arc(50 * u, 8 * u, 5 * u, 0, 7); ctx.fillStyle = a.c2; ctx.fill(); ctx.stroke(); }
    else if (a.ant === "doble") { ctx.beginPath(); ctx.moveTo(38 * u, 22 * u); ctx.lineTo(32 * u, 9 * u); ctx.moveTo(62 * u, 22 * u); ctx.lineTo(68 * u, 9 * u); ctx.stroke(); ctx.beginPath(); ctx.arc(32 * u, 8 * u, 3.6 * u, 0, 7); ctx.arc(68 * u, 8 * u, 3.6 * u, 0, 7); ctx.fill(); }
    else if (a.ant === "rayo") { ctx.beginPath(); ctx.moveTo(50 * u, 22 * u); ctx.lineTo(45 * u, 14 * u); ctx.lineTo(55 * u, 12 * u); ctx.lineTo(49 * u, 3 * u); ctx.stroke(); }
    else { rr(ctx, 14 * u, 34 * u, 10 * u, 22 * u, 4 * u); ctx.fill(); rr(ctx, 76 * u, 34 * u, 10 * u, 22 * u, 4 * u); ctx.fill(); }
    // hombros
    ctx.fillStyle = a.c; rr(ctx, 26 * u, 80 * u, 48 * u, 22 * u, 10 * u); ctx.fill();
    ctx.fillStyle = a.c2; rr(ctx, 42 * u, 84 * u, 16 * u, 8 * u, 4 * u); ctx.fill();
    // cabeza
    ctx.fillStyle = a.c; rr(ctx, 20 * u, 21 * u, 60 * u, 58 * u, 16 * u); ctx.fill();
    ctx.fillStyle = a.c2; rr(ctx, 26 * u, 29 * u, 48 * u, 40 * u, 11 * u); ctx.fill();
    // ojos
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
    // boca
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
    var completa = null; // null = primer pintado: no se celebra lo que ya venía marcado
    function pintar() {
      var n = cajas.filter(function (c) { return c.checked; }).length;
      barra.style.setProperty("--p", Math.round(n * 100 / cajas.length) + "%");
      txt.textContent = n + " de " + cajas.length;
      listo.hidden = n !== cajas.length;
      var ahora = n === cajas.length;
      av.classList.toggle("fx-completo", ahora);
      if (ahora && completa === false) celebrar(listo);
      completa = ahora;
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
    var ctx = c.getContext("2d"), FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
    var g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, "#14122b"); g.addColorStop(.55, "#251d5c"); g.addColorStop(1, "#3c2a86");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    var r1 = ctx.createRadialGradient(880, 160, 10, 880, 160, 520); r1.addColorStop(0, "rgba(157,140,255,.45)"); r1.addColorStop(1, "rgba(157,140,255,0)");
    ctx.fillStyle = r1; ctx.fillRect(0, 0, W, H);
    var r2 = ctx.createRadialGradient(140, 1250, 10, 140, 1250, 560); r2.addColorStop(0, "rgba(233,189,82,.22)"); r2.addColorStop(1, "rgba(233,189,82,0)");
    ctx.fillStyle = r2; ctx.fillRect(0, 0, W, H);
    // constelación propia: sale del nombre, así cada foto es distinta
    var s = hash(d.nombre + "|" + d.resultado) || 7, rnd = function () { s = Math.imul(s ^ (s >>> 15), 2246822507) ^ Math.imul(s ^ (s >>> 13), 3266489909); s >>>= 0; return (s % 10000) / 10000; };
    for (var i = 0; i < 70; i++) { ctx.fillStyle = i % 7 === 0 ? "rgba(233,189,82,.8)" : "rgba(220,214,255," + (0.25 + rnd() * .6).toFixed(2) + ")"; ctx.beginPath(); ctx.arc(rnd() * W, rnd() * H, 1 + rnd() * 2.6, 0, 7); ctx.fill(); }
    ctx.strokeStyle = "rgba(195,185,255,.35)"; ctx.lineWidth = 2; ctx.beginPath();
    var px = 770 + rnd() * 60, py = 70 + rnd() * 40; ctx.moveTo(px, py);
    for (var k = 0; k < 4; k++) { px += 50 + rnd() * 40; py += (rnd() - .4) * 70; ctx.lineTo(px, py); }
    ctx.stroke();
    // cabecera
    ctx.textBaseline = "alphabetic"; ctx.fillStyle = "#e9bd52"; ctx.font = "800 30px " + FONT; ctx.fillText("JMD LEARNING", 72, 104);
    ctx.fillStyle = "rgba(233,230,255,.82)"; ajustar(ctx, CURSO, W - 144, 30, "600", 22); ctx.fillText(CURSO, 72, 148);
    // tarjeta
    ctx.fillStyle = "rgba(255,255,255,.07)"; rr(ctx, 56, 196, W - 112, 1040, 44); ctx.fill();
    ctx.strokeStyle = "rgba(195,185,255,.28)"; ctx.lineWidth = 2; rr(ctx, 56, 196, W - 112, 1040, 44); ctx.stroke();
    // avatar en un halo
    var hal = ctx.createRadialGradient(W / 2, 390, 20, W / 2, 390, 190); hal.addColorStop(0, "rgba(195,185,255,.5)"); hal.addColorStop(1, "rgba(195,185,255,0)");
    ctx.fillStyle = hal; ctx.beginPath(); ctx.arc(W / 2, 390, 190, 0, 7); ctx.fill();
    ctx.fillStyle = "#f6f4ff"; ctx.beginPath(); ctx.arc(W / 2, 390, 140, 0, 7); ctx.fill();
    dibujarAvatar(ctx, d.avatar || avatarPorNombre(d.nombre), W / 2, 396, 230, "feliz");
    // nombre
    ctx.textAlign = "center"; ctx.fillStyle = "#ffffff";
    var nom = String(d.nombre || "Alumno").slice(0, 48); ajustar(ctx, nom, W - 200, 72, "800", 34); ctx.fillText(nom, W / 2, 618);
    ctx.fillStyle = "rgba(233,230,255,.85)"; ajustar(ctx, CLASE, W - 200, 32, "600", 22); ctx.fillText(CLASE, W / 2, 668);
    ctx.fillStyle = "#c3b9ff"; ctx.font = "600 28px " + FONT; ctx.fillText(FECHA, W / 2, 712);
    // resultado
    ctx.fillStyle = "rgba(20,18,43,.55)"; rr(ctx, 120, 752, W - 240, 210, 30); ctx.fill();
    ctx.fillStyle = "#e9bd52"; ctx.font = "800 24px " + FONT; ctx.fillText(String(d.etiqueta || "Mi resultado").toUpperCase(), W / 2, 800);
    ctx.fillStyle = "#ffffff"; var res = String(d.resultado || ""); ajustar(ctx, res, W - 300, 60, "800", 30); ctx.fillText(res, W / 2, 872);
    if (d.detalle) { ctx.fillStyle = "rgba(233,230,255,.85)"; ajustar(ctx, d.detalle, W - 300, 30, "600", 20); ctx.fillText(d.detalle, W / 2, 922); }
    // reflexión
    var refl = String(d.reflexion || "").trim();
    ctx.font = "italic 500 38px " + FONT;
    var ls = envolver(ctx, refl ? "«" + refl + "»" : "«Hoy dejé mi máquina lista para trabajar con un agente.»", W - 260, 4);
    var y0 = 1112 - (ls.length - 1) * 25;
    ctx.fillStyle = "#f3f1ff"; ls.forEach(function (l, j) { ctx.fillText(l, W / 2, y0 + j * 50); });
    // pie
    ctx.fillStyle = "rgba(233,230,255,.7)"; ctx.font = "600 26px " + FONT; ctx.fillText("jmd-learn.online  ·  #vibecoding", W / 2, 1296);
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
          n.share({ files: [new File([b], archivo, { type: "image/png" })], title: "Mi clase 1 de vibecoding" }).then(function () { ok(true); }).catch(function () { ok(false); });
        } catch (e) { ok(false); }
      }, "image/png");
    });
  }

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

  // ---------- efectos (solo presentación: clases, variables CSS y adornos aria-hidden) ----------
  function sinMovimiento() { try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } }

  // celebrar(el): ráfaga de chispas sobre el elemento. Se borra sola; sin movimiento reducido no hace nada.
  function celebrar(el) {
    if (sinMovimiento() || !el || !el.getBoundingClientRect) return;
    var r = el.getBoundingClientRect(); if (!r.width && !r.height) r = { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 };
    var caja = document.createElement("div"); caja.className = "fx-chispas"; caja.setAttribute("aria-hidden", "true");
    caja.style.left = (r.left + Math.min(r.width, 260) / 2) + "px"; caja.style.top = (r.top + r.height / 2) + "px";
    var colores = ["var(--ok)", "var(--accent)", "var(--gold)", "var(--ph-ea)", "var(--ph-or)"];
    for (var i = 0; i < 22; i++) {
      var s = document.createElement("i"), ang = (i / 22) * Math.PI * 2 + Math.random() * .4, dist = 50 + Math.random() * 70;
      s.style.setProperty("--x", Math.round(Math.cos(ang) * dist) + "px");
      s.style.setProperty("--y", Math.round(Math.sin(ang) * dist * .75 - 24) + "px");
      s.style.setProperty("--r", Math.round(Math.random() * 540 - 270) + "deg");
      s.style.setProperty("--c", colores[i % colores.length]);
      s.style.animationDelay = Math.round(Math.random() * 60) + "ms";
      if (i % 3 === 0) s.className = "o";
      caja.appendChild(s);
    }
    document.body.appendChild(caja);
    setTimeout(function () { caja.remove(); }, 1400);
  }

  // Fase de Kolb de la escena → <html data-ph>, para teñir acentos con --fase.
  function marcarFase() {
    var f = $(".esc-fase[data-ph]"), ph = f && f.getAttribute("data-ph");
    if (ph) document.documentElement.setAttribute("data-ph", ph);
    if (!$(".fx-fase")) { var b = document.createElement("div"); b.className = "fx-fase"; b.setAttribute("aria-hidden", "true"); document.body.insertBefore(b, document.body.firstChild); }
  }

  // Entrada escalonada para las piezas que la escena no anima ya por su cuenta.
  function animada(el, tope) {
    for (var n = el; n && n !== tope; n = n.parentElement) {
      var cs = getComputedStyle(n);
      if (cs.animationName && cs.animationName !== "none") return n;
    }
    return null;
  }
  function escalonar() {
    var cuerpo = $(".esc-cuerpo"); if (!cuerpo) return;
    var i = 0;
    $$(".esc-card, .k-caja, .k-links, .esc-grid-2 > *, .esc-grid-3 > *, .as-cols > *, .as-tipo, .as-pieza, .as-fila, .as-campo, .as-tabla-env", cuerpo).forEach(function (el) {
      if (el.classList.contains("fx-in") || animada(el, cuerpo)) return;
      el.style.setProperty("--fx-d", Math.min(.12 + i * .06, .9).toFixed(2) + "s"); el.classList.add("fx-in"); i++;
    });
    // los hijos de listas y votaciones entran detrás de su caja
    $$(".k-check, .k-ops", cuerpo).forEach(function (lista) {
      var padre = animada(lista, cuerpo), base = 0;
      if (padre) { base = parseFloat(getComputedStyle(padre).animationDelay) || 0; base = Math.max(base, parseFloat(padre.style.getPropertyValue("--fx-d")) || 0); }
      $$(":scope > li, :scope > button", lista).forEach(function (h, j) {
        h.style.setProperty("--fx-d", (base + .22 + j * .06).toFixed(2) + "s"); h.classList.add("fx-hijo");
      });
    });
  }

  // Marca JMD discreta en el pie: la Osa Mayor con su última estrella y las cuerdas del arpa.
  var MARCA = '<svg class="fx-marca" viewBox="14 44 186 144" aria-hidden="true" focusable="false">' +
    '<path class="cu" d="M95 66.6V177M112 64V181M127 61.2V182M142 58V181M160 68.3V176"/>' +
    '<path class="ar" d="M92 176Q138 190 186 160"/>' +
    '<path class="os" pathLength="1" d="M22 52L28 88L68 98L78 69ZM78 69L112 64L142 58L177 78"/>' +
    '<g class="es"><circle cx="22" cy="52" r="5"/><circle cx="28" cy="88" r="5"/><circle cx="68" cy="98" r="5"/><circle cx="78" cy="69" r="5"/><circle cx="112" cy="64" r="5"/><circle cx="142" cy="58" r="5"/></g>' +
    '<path class="ul" d="M177 60Q177 78 195 78Q177 78 177 96Q177 78 159 78Q177 78 177 60Z"/></svg>';
  function ponerMarca() {
    var pie = $(".esc-pie"); if (!pie || $(".fx-marca", pie)) return;
    pie.insertAdjacentHTML("beforeend", MARCA);
  }

  function efectos() {
    try { marcarFase(); ponerMarca(); escalonar(); } catch (e) {}
  }

  // ---------- montaje automático ----------
  function montar(raiz) {
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
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { montar(); efectos(); });
  else { montar(); efectos(); }

  window.G8 = {
    leccion: LECCION, escena: ESCENA, curso: CURSO, clase: CLASE, fecha: FECHA,
    pedir: pedir, toast: toast, copiar: copiar, abrir: abrir, yo: yo, leer: leer, guardar: guardar, hash: hash,
    avatares: AVATARES, avatarPorNombre: avatarPorNombre, dibujarAvatar: dibujarAvatar, avatarCanvas: avatarCanvas,
    fotito: fotito, descargar: descargar, mostrarFoto: mostrarFoto, montar: montar, celebrar: celebrar,
  };
})();
