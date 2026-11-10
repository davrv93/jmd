// ws.js · utilidades de las escenas LIVE de «Web scraping ético con IA» (ws2-01). Script clásico: expone window.WS.
//
//   <script src="../../comun/ws.js"></script>   (al final del body)
//
// Monta solo, al cargar, lo que encuentre en la página:
//   [data-voto="clave"]   botones .w-op[data-opcion] → POST /voto; el % del grupo sale después de votar
//   [data-muro="clave"]   formulario + lista del muro del grupo (POST/GET /muro)
//   [data-check="clave"]  botones .w-chk con avance; se guarda en el navegador del alumno
//   [data-avatar]         el selector de la arañita (color, ojos y accesorio)
//   [data-tabs]           pestañas: botones .w-tab[data-tab] y paneles [data-panel]
// Y deja a mano: WS.api, WS.yo, WS.evidencia, WS.publicarMuro, WS.dibujarArana, WS.avatar, WS.montarFotito, WS.aviso.
// Todo falla en silencio si el endpoint no responde: la escena se sigue viendo y usando.
(function () {
  "use strict";
  var leccion = (location.pathname.match(/\/live\/([^/]+)\//) || [])[1] || "ws2-01";
  var escena = (location.pathname.match(/\/escenas\/([^/]+)\//) || [])[1] || document.body.getAttribute("data-escena") || "ws";
  var PREF = leccion + ":";

  /* Tema: ?tema=dark|light fuerza el tema del LMS; si no, manda el del sistema. */
  try {
    var t = new URLSearchParams(location.search).get("tema");
    if (t === "dark" || t === "light") document.documentElement.setAttribute("data-tema", t);
  } catch (e) {}

  function leer(k, def) { try { var v = localStorage.getItem(PREF + k); return v == null ? def : JSON.parse(v); } catch (e) { return def; } }
  function guardar(k, v) { try { localStorage.setItem(PREF + k, JSON.stringify(v)); } catch (e) {} }

  function api(ruta, opts) {
    opts = opts || {};
    var init = { credentials: "same-origin", cache: "no-store", headers: {} };
    if (opts.body !== undefined) {
      init.method = opts.method || "POST";
      init.headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(opts.body);
    } else if (opts.method) init.method = opts.method;
    var url = ruta.charAt(0) === "/" && ruta.indexOf("/api/") === 0 ? ruta : "/api/v1/live/" + encodeURIComponent(leccion) + ruta;
    return fetch(url, init).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) {
          var e = new Error((j && j.error && j.error.message) || "HTTP " + r.status);
          e.status = r.status; e.code = j && j.error && j.error.code;
          throw e;
        }
        return j;
      });
    });
  }

  /* Repite fn cada ms mientras la pestaña se vea. */
  function cada(ms, fn) {
    fn();
    return setInterval(function () { if (!document.hidden) fn(); }, ms);
  }

  var yoP = null;
  function yo() {
    if (!yoP) yoP = api("/api/v1/me").then(function (j) { return j || {}; }).catch(function () { return {}; });
    return yoP;
  }
  function nombreCorto(n) {
    n = String(n || "").trim();
    if (!n) return "";
    var p = n.split(/\s+/);
    return p.length >= 2 ? p[0] + " " + p[1] : p[0];
  }

  function evidencia(tipo, detalle, esc) {
    return api("/evidencia", { body: { escena: esc || escena, tipo: tipo, detalle: String(detalle || "").slice(0, 200) } });
  }

  var tt = 0;
  function aviso(texto, ms) {
    var el = document.querySelector(".w-toast");
    if (!el) { el = document.createElement("div"); el.className = "w-toast"; el.setAttribute("role", "status"); document.body.appendChild(el); }
    el.textContent = texto; el.hidden = false;
    clearTimeout(tt); tt = setTimeout(function () { el.hidden = true; }, ms || 3200);
  }

  /* ---------- Votación ---------- */
  function montarVoto(cont) {
    var clave = cont.getAttribute("data-voto");
    var ops = cont.querySelectorAll(".w-op[data-opcion]");
    var tot = cont.querySelector(".w-voto-tot");
    var mia = leer("voto:" + clave, "");
    var intervalo = 0;
    ops.forEach(function (b) {
      if (!b.querySelector("b")) b.appendChild(document.createElement("b"));
      b.type = "button";
      b.addEventListener("click", function () {
        var op = b.getAttribute("data-opcion");
        mia = op; guardar("voto:" + clave, op);
        marcar(); revelar();
        api("/voto", { body: { escena: clave, opcion: op } }).then(pintar).catch(function () {
          if (tot) tot.textContent = "Tu voto quedó en tu navegador (el conteo del grupo no respondió).";
        });
        if (!intervalo) intervalo = setInterval(function () { if (!document.hidden) consultar(); }, 6000);
      });
    });
    function marcar() { ops.forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-opcion") === mia ? "true" : "false"); }); }
    function revelar() { cont.querySelectorAll("[data-tras-votar]").forEach(function (x) { x.hidden = false; }); cont.classList.add("votado"); }
    function pintar(j) {
      if (!j || !j.opciones) return;
      var n = +j.total || 0;
      ops.forEach(function (b) {
        var k = +j.opciones[b.getAttribute("data-opcion")] || 0, pct = n ? Math.round(k / n * 100) : 0;
        b.style.setProperty("--pct", pct + "%");
        b.querySelector("b").textContent = pct + " %";
      });
      if (j.mia) { mia = j.mia; marcar(); }
      if (tot) tot.textContent = n === 1 ? "1 voto del grupo" : n + " votos del grupo";
    }
    function consultar() { api("/votos?escena=" + encodeURIComponent(clave)).then(pintar).catch(function () {}); }
    marcar();
    if (mia) { revelar(); consultar(); intervalo = setInterval(function () { if (!document.hidden) consultar(); }, 6000); }
    else if (tot) tot.textContent = "Vota para ver cómo va el grupo.";
  }

  /* ---------- Muro ---------- */
  function publicarMuro(clave, texto) {
    return api("/muro", { body: { escena: clave, texto: String(texto || "").slice(0, 200) } });
  }
  function montarMuro(cont) {
    var clave = cont.getAttribute("data-muro");
    var max = +cont.getAttribute("data-max") || 160;
    cont.classList.add("w-muro");
    cont.insertAdjacentHTML("beforeend",
      '<div class="w-muro-form"><input class="w-in" maxlength="' + max + '" autocomplete="off"><button type="button" class="w-btn">Publicar</button></div>' +
      '<p class="w-muro-est" aria-live="polite"></p><ul class="w-muro-lista" aria-live="polite"></ul>');
    var inp = cont.querySelector("input"), btn = cont.querySelector(".w-muro-form button");
    var est = cont.querySelector(".w-muro-est"), lista = cont.querySelector(".w-muro-lista");
    inp.placeholder = cont.getAttribute("data-placeholder") || "Escribe aquí…";
    inp.setAttribute("aria-label", cont.getAttribute("data-pregunta") || inp.placeholder);
    var borrador = leer("muro:" + clave, "");
    if (borrador) inp.value = borrador;
    inp.addEventListener("input", function () { guardar("muro:" + clave, inp.value); });
    function pintar(j) {
      if (!j || !j.entradas) return;
      lista.textContent = "";
      if (!j.entradas.length) {
        var v = document.createElement("li"); v.className = "vacio"; v.textContent = "Aún nadie publicó. Sé la primera persona."; lista.appendChild(v);
      }
      j.entradas.slice(0, 40).forEach(function (e) {
        var li = document.createElement("li"); if (e.mia) li.className = "mia";
        var b = document.createElement("b"); b.textContent = e.nombre || "alguien";
        li.appendChild(b); li.appendChild(document.createTextNode(e.texto));
        lista.appendChild(li);
      });
      est.textContent = j.entradas.length === 1 ? "1 respuesta" : j.entradas.length + " respuestas";
    }
    function enviar() {
      var t = inp.value.trim();
      if (!t) { inp.focus(); return; }
      btn.disabled = true;
      publicarMuro(clave, t).then(function (j) { pintar(j); est.textContent = "Publicado. Puedes cambiarlo cuando quieras."; cont.dispatchEvent(new CustomEvent("ws-muro", { detail: t, bubbles: true })); })
        .catch(function () { est.textContent = "No se pudo publicar. Revisa tu conexión e intenta otra vez."; })
        .then(function () { btn.disabled = false; });
    }
    btn.addEventListener("click", enviar);
    inp.addEventListener("keydown", function (e) { if (e.key === "Enter") enviar(); });
    cada(6000, function () { api("/muro?escena=" + encodeURIComponent(clave)).then(pintar).catch(function () { est.textContent = "El muro se verá cuando la clase esté en vivo."; }); });
  }

  /* ---------- Checklist ---------- */
  function montarCheck(cont) {
    var clave = cont.getAttribute("data-check");
    var bs = cont.querySelectorAll(".w-chk");
    var hechos = leer("chk:" + clave, []);
    var est = cont.querySelector(".w-check-est");
    if (!est) { est = document.createElement("p"); est.className = "w-check-est"; est.setAttribute("aria-live", "polite"); cont.appendChild(est); }
    bs.forEach(function (b, i) {
      b.type = "button";
      if (!b.querySelector("i")) b.insertBefore(document.createElement("i"), b.firstChild);
      b.setAttribute("aria-pressed", hechos.indexOf(i) >= 0 ? "true" : "false");
      b.addEventListener("click", function () {
        var on = b.getAttribute("aria-pressed") !== "true";
        b.setAttribute("aria-pressed", on ? "true" : "false");
        hechos = []; bs.forEach(function (x, k) { if (x.getAttribute("aria-pressed") === "true") hechos.push(k); });
        guardar("chk:" + clave, hechos); upd();
      });
    });
    function upd() {
      var n = hechos.length, total = bs.length, listo = n === total;
      est.classList.toggle("listo", listo);
      est.textContent = n + " de " + total + (listo ? (cont.getAttribute("data-fin") || " · ¡Listo! Pulsa «Lo logré» en el panel.") : "");
      cont.dispatchEvent(new CustomEvent("ws-check", { detail: { n: n, total: total }, bubbles: true }));
    }
    upd();
  }

  /* ---------- Pestañas ---------- */
  function montarTabs(cont) {
    var tabs = cont.querySelectorAll(".w-tab[data-tab]");
    var raiz = cont.closest("[data-tabs-raiz]") || document;
    function ir(id) {
      tabs.forEach(function (t) { t.setAttribute("aria-selected", t.getAttribute("data-tab") === id ? "true" : "false"); });
      raiz.querySelectorAll("[data-panel]").forEach(function (p) { if (p.closest("[data-tabs-raiz]") === cont.closest("[data-tabs-raiz]")) p.hidden = p.getAttribute("data-panel") !== id; });
    }
    tabs.forEach(function (t) { t.type = "button"; t.setAttribute("role", "tab"); t.addEventListener("click", function () { ir(t.getAttribute("data-tab")); }); });
    if (tabs[0]) ir(tabs[0].getAttribute("data-tab"));
  }

  /* ---------- Arañita (avatar) ---------- */
  var COLORES = ["#7b6cf0", "#f27cb8", "#2fb8a8", "#e2a72e", "#ff7a4d", "#4b9dff", "#58b86b", "#a46cff"];
  var OJOS = ["redondos", "felices", "lentes", "guiño"];
  var ACCES = ["nada", "chullo", "gorro", "moño", "audífonos", "casco"];
  function parseAva(code) {
    var m = /^c(\d)-o(\d)-x(\d)$/.exec(String(code || ""));
    if (!m) return null;
    return { c: Math.min(+m[1], COLORES.length - 1), o: Math.min(+m[2], OJOS.length - 1), x: Math.min(+m[3], ACCES.length - 1) };
  }
  function codeAva(a) { return "c" + a.c + "-o" + a.o + "-x" + a.x; }
  function azarAva() { return { c: Math.floor(Math.random() * COLORES.length), o: Math.floor(Math.random() * OJOS.length), x: Math.floor(Math.random() * ACCES.length) }; }
  function avatar(nuevo) {
    if (nuevo) { guardar("avatar", nuevo); document.dispatchEvent(new CustomEvent("ws-avatar", { detail: nuevo })); return nuevo; }
    var a = leer("avatar", "");
    if (!parseAva(a)) { a = codeAva(azarAva()); guardar("avatar", a); }
    return a;
  }
  function oscuro(hex, f) {
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    return "rgb(" + Math.round(r * f) + "," + Math.round(g * f) + "," + Math.round(b * f) + ")";
  }
  function claro(hex, f) {
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    return "rgb(" + Math.round(r + (255 - r) * f) + "," + Math.round(g + (255 - g) * f) + "," + Math.round(b + (255 - b) * f) + ")";
  }
  // Dibuja la arañita centrada en (x, y) con radio r. t (segundos) mueve las patas; hilo=true cuelga de un hilo.
  function dibujarArana(ctx, x, y, r, code, t, hilo) {
    var a = parseAva(code) || { c: 0, o: 0, x: 0 };
    var col = COLORES[a.c], borde = oscuro(col, .55);
    t = t || 0;
    ctx.save();
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    if (hilo) { ctx.strokeStyle = "rgba(200,195,255,.75)"; ctx.lineWidth = Math.max(1, r * .04); ctx.beginPath(); ctx.moveTo(x, y - r * 6); ctx.lineTo(x, y - r * .6); ctx.stroke(); }
    // patas: 4 por lado, dos tramos
    ctx.strokeStyle = borde; ctx.lineWidth = Math.max(1.5, r * .11);
    for (var lado = -1; lado <= 1; lado += 2) {
      for (var i = 0; i < 4; i++) {
        var ang = (-0.75 + i * 0.5) + Math.sin(t * 9 + i * 1.7 + (lado > 0 ? 1 : 0)) * 0.12;
        var x1 = x + lado * r * .5, y1 = y + (i - 1.5) * r * .18;
        var x2 = x + lado * r * (1.05 + .05 * Math.cos(ang)), y2 = y1 - r * (.38 - i * .12) + Math.sin(ang) * r * .2;
        var x3 = x + lado * r * (1.45 - Math.abs(i - 1.5) * .06), y3 = y1 + r * (.25 + i * .13);
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.stroke();
      }
    }
    // cuerpo
    var g = ctx.createRadialGradient(x - r * .2, y - r * .25, r * .1, x, y, r * .75);
    g.addColorStop(0, claro(col, .35)); g.addColorStop(1, oscuro(col, .78));
    ctx.fillStyle = g; ctx.strokeStyle = borde; ctx.lineWidth = Math.max(1.2, r * .06);
    ctx.beginPath(); ctx.arc(x, y, r * .62, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,.22)"; ctx.beginPath(); ctx.ellipse(x - r * .2, y - r * .28, r * .2, r * .12, -.5, 0, Math.PI * 2); ctx.fill();
    // cachetes
    ctx.fillStyle = "rgba(255,120,150,.45)";
    ctx.beginPath(); ctx.arc(x - r * .36, y + r * .16, r * .09, 0, Math.PI * 2); ctx.arc(x + r * .36, y + r * .16, r * .09, 0, Math.PI * 2); ctx.fill();
    // ojos
    var ex = r * .2, ey = y - r * .05, er = r * .15;
    function ojoRedondo(cx) {
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(cx, ey, er, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#1a1530"; ctx.beginPath(); ctx.arc(cx + er * .15, ey + er * .1, er * .55, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(cx + er * .3, ey - er * .15, er * .18, 0, Math.PI * 2); ctx.fill();
    }
    function ojoFeliz(cx) { ctx.strokeStyle = "#1a1530"; ctx.lineWidth = Math.max(1.4, r * .06); ctx.beginPath(); ctx.arc(cx, ey + er * .3, er * .7, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
    if (a.o === 1) { ojoFeliz(x - ex); ojoFeliz(x + ex); }
    else if (a.o === 3) { ojoRedondo(x - ex); ojoFeliz(x + ex); }
    else { ojoRedondo(x - ex); ojoRedondo(x + ex); }
    if (a.o === 2) {
      ctx.strokeStyle = "#1a1530"; ctx.lineWidth = Math.max(1.3, r * .05);
      ctx.beginPath(); ctx.arc(x - ex, ey, er * 1.35, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(x + ex, ey, er * 1.35, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - ex + er * 1.35, ey); ctx.lineTo(x + ex - er * 1.35, ey); ctx.stroke();
    }
    // sonrisa
    ctx.strokeStyle = "#1a1530"; ctx.lineWidth = Math.max(1.2, r * .05);
    ctx.beginPath(); ctx.arc(x, y + r * .17, r * .12, Math.PI * .15, Math.PI * .85); ctx.stroke();
    // accesorio
    var top = y - r * .62;
    if (a.x === 1) { // chullo
      ctx.fillStyle = "#d8324a"; ctx.beginPath(); ctx.moveTo(x - r * .6, top + r * .32); ctx.quadraticCurveTo(x, top - r * .55, x + r * .6, top + r * .32); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#f3d36b"; for (var k = -2; k <= 2; k++) { ctx.beginPath(); ctx.arc(x + k * r * .2, top + r * .1, r * .055, 0, Math.PI * 2); ctx.fill(); }
      ctx.strokeStyle = "#d8324a"; ctx.lineWidth = r * .1;
      ctx.beginPath(); ctx.moveTo(x - r * .55, top + r * .3); ctx.lineTo(x - r * .62, top + r * .7); ctx.moveTo(x + r * .55, top + r * .3); ctx.lineTo(x + r * .62, top + r * .7); ctx.stroke();
      ctx.fillStyle = "#2fb8a8"; ctx.beginPath(); ctx.arc(x, top - r * .2, r * .1, 0, Math.PI * 2); ctx.fill();
    } else if (a.x === 2) { // gorro con pompón
      ctx.fillStyle = "#4b9dff"; ctx.beginPath(); ctx.arc(x, top + r * .28, r * .5, Math.PI, 0); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.fillRect(x - r * .55, top + r * .2, r * 1.1, r * .14);
      ctx.beginPath(); ctx.arc(x, top - r * .26, r * .12, 0, Math.PI * 2); ctx.fill();
    } else if (a.x === 3) { // moño
      ctx.fillStyle = "#ff5c8a"; var bx = x + r * .35, by = top + r * .08;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx - r * .26, by - r * .16); ctx.lineTo(bx - r * .26, by + r * .16); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + r * .26, by - r * .16); ctx.lineTo(bx + r * .26, by + r * .16); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.arc(bx, by, r * .07, 0, Math.PI * 2); ctx.fill();
    } else if (a.x === 4) { // audífonos
      ctx.strokeStyle = "#2a2540"; ctx.lineWidth = r * .09;
      ctx.beginPath(); ctx.arc(x, y - r * .05, r * .68, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
      ctx.fillStyle = "#2a2540"; ctx.beginPath(); ctx.ellipse(x - r * .64, y - r * .02, r * .1, r * .17, 0, 0, Math.PI * 2); ctx.ellipse(x + r * .64, y - r * .02, r * .1, r * .17, 0, 0, Math.PI * 2); ctx.fill();
    } else if (a.x === 5) { // casco con linterna
      ctx.fillStyle = "#f2c230"; ctx.beginPath(); ctx.arc(x, top + r * .3, r * .52, Math.PI, 0); ctx.fill();
      ctx.fillRect(x - r * .64, top + r * .24, r * 1.28, r * .1);
      ctx.fillStyle = "#fff8c8"; ctx.beginPath(); ctx.arc(x, top + r * .02, r * .1, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function montarAvatar(cont) {
    cont.classList.add("w-ava");
    cont.innerHTML = '<canvas width="208" height="208" aria-label="Tu arañita"></canvas><div class="w-ava-op">' +
      '<div class="w-ava-fila" data-k="c"><span>Color</span></div><div class="w-ava-fila" data-k="o"><span>Ojos</span></div>' +
      '<div class="w-ava-fila" data-k="x"><span>Accesorio</span></div><div class="w-fila"><button type="button" class="w-btn sec peq" data-azar>Al azar</button></div></div>';
    var cv = cont.querySelector("canvas"), ctx = cv.getContext("2d");
    var a = parseAva(avatar());
    function fila(k, n, etiqueta) {
      var f = cont.querySelector('[data-k="' + k + '"]');
      for (var i = 0; i < n; i++) {
        var b = document.createElement("button"); b.type = "button"; b.className = "w-sw"; b.setAttribute("data-v", i);
        if (k === "c") { b.style.background = COLORES[i]; b.setAttribute("aria-label", "Color " + (i + 1)); }
        else { b.textContent = String(i + 1); b.title = etiqueta[i]; b.setAttribute("aria-label", etiqueta[i]); }
        (function (v) { b.addEventListener("click", function () { a[k] = v; aplicar(); }); })(i);
        f.appendChild(b);
      }
    }
    fila("c", COLORES.length); fila("o", OJOS.length, OJOS); fila("x", ACCES.length, ACCES);
    cont.querySelector("[data-azar]").addEventListener("click", function () { a = azarAva(); aplicar(); });
    function aplicar() {
      avatar(codeAva(a));
      cont.querySelectorAll(".w-ava-fila").forEach(function (f) {
        var k = f.getAttribute("data-k");
        f.querySelectorAll(".w-sw").forEach(function (b) { b.setAttribute("aria-pressed", +b.getAttribute("data-v") === a[k] ? "true" : "false"); });
      });
    }
    var t0 = performance.now(), quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;
    function cuadro(ahora) {
      ctx.clearRect(0, 0, 208, 208);
      dibujarArana(ctx, 104, 118, 58, codeAva(a), quieto ? 0 : (ahora - t0) / 1000 * .5, false);
      if (!quieto) requestAnimationFrame(cuadro);
    }
    aplicar(); requestAnimationFrame(cuadro);
  }

  /* ---------- La fotito ---------- */
  var CURSO = "Web scraping ético con IA";
  var FECHA = "Domingo 15 de noviembre de 2026 · Lima";
  function envolver(ctx, texto, ancho, maxLineas) {
    var palabras = String(texto || "").split(/\s+/), lineas = [], l = "";
    for (var i = 0; i < palabras.length; i++) {
      var p = l ? l + " " + palabras[i] : palabras[i];
      if (ctx.measureText(p).width > ancho && l) { lineas.push(l); l = palabras[i]; } else l = p;
    }
    if (l) lineas.push(l);
    if (lineas.length > maxLineas) { lineas = lineas.slice(0, maxLineas); lineas[maxLineas - 1] = lineas[maxLineas - 1].replace(/\s*\S*$/, "") + "…"; }
    return lineas;
  }
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  // datos: {nombre, avatar, etiqueta, resultado, reflexion}. Devuelve un canvas de 1080 x 1350.
  function dibujarFotito(datos) {
    var W = 1080, H = 1350, cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    var c = cv.getContext("2d"), F = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
    var g = c.createLinearGradient(0, 0, W, H); g.addColorStop(0, "#14122b"); g.addColorStop(.6, "#251c55"); g.addColorStop(1, "#3a1d4f");
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    // telaraña de fondo desde la esquina superior derecha
    c.save(); c.strokeStyle = "rgba(195,185,255,.14)"; c.lineWidth = 2;
    var cx = W + 40, cy = -40, rayos = 9;
    for (var i = 0; i <= rayos; i++) { var an = Math.PI / 2 + i * (Math.PI / 2) / rayos; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(an) * 1500, cy + Math.sin(an) * 1500); c.stroke(); }
    for (var rr2 = 160; rr2 < 1500; rr2 += 150) {
      c.beginPath();
      for (var j = 0; j <= rayos; j++) { var a2 = Math.PI / 2 + j * (Math.PI / 2) / rayos, px = cx + Math.cos(a2) * rr2, py = cy + Math.sin(a2) * rr2; if (j) c.lineTo(px, py); else c.moveTo(px, py); }
      c.stroke();
    }
    c.restore();
    // estrellas
    c.fillStyle = "rgba(233,189,82,.8)";
    [[990, 240, 3], [640, 700, 2], [1030, 700, 2.5], [40, 650, 2], [1000, 1250, 2], [760, 1245, 2.5]].forEach(function (s) { c.beginPath(); c.arc(s[0], s[1], s[2], 0, Math.PI * 2); c.fill(); });
    c.textAlign = "left"; c.textBaseline = "alphabetic";
    c.fillStyle = "#c3b9ff"; c.font = "800 30px " + F;
    c.fillText("JMD LEARNING · TALLER EN VIVO", 80, 120);
    c.fillStyle = "#ffffff"; c.font = "900 76px " + F; c.fillText("Web scraping", 80, 215); c.fillText("ético con IA", 80, 300);
    c.fillStyle = "#b7b4cc"; c.font = "500 32px " + F; c.fillText(FECHA, 80, 356);
    // arañita colgando
    dibujarArana(c, W - 270, 560, 128, datos.avatar, 0.3, true);
    // nombre
    c.fillStyle = "#ffffff"; c.font = "900 66px " + F;
    var ln = envolver(c, datos.nombre || "Alumno", 560, 2);
    ln.forEach(function (l, k) { c.fillText(l, 80, 520 + k * 74); });
    c.fillStyle = "#e9bd52"; c.font = "800 30px " + F;
    c.fillText((datos.etiqueta || "Telaraña cortés").toUpperCase(), 80, 520 + ln.length * 74 + 10);
    // resultado
    c.font = "800 40px " + F;
    var res = envolver(c, datos.resultado || "Taller completado", 860, 2), yR = 820;
    rr(c, 60, yR - 64, 960, 40 + res.length * 54, 30); c.fillStyle = "rgba(233,189,82,.16)"; c.fill();
    c.strokeStyle = "rgba(233,189,82,.6)"; c.lineWidth = 3; c.stroke();
    c.fillStyle = "#ffd77a"; res.forEach(function (l, k) { c.fillText(l, 100, yR + k * 54); });
    // reflexión
    var yQ = yR + res.length * 54 + 70;
    c.font = "italic 500 40px " + F;
    var q = envolver(c, datos.reflexion || "Primero las reglas, después los datos.", 840, 4);
    rr(c, 60, yQ - 20, 960, 70 + q.length * 54, 30); c.fillStyle = "rgba(255,255,255,.07)"; c.fill();
    c.fillStyle = "#a99cff"; c.font = "900 110px Georgia, serif"; c.fillText("“", 80, yQ + 70);
    c.fillStyle = "#ecebf7"; c.font = "italic 500 40px " + F;
    q.forEach(function (l, k) { c.fillText(l, 160, yQ + 50 + k * 54); });
    c.fillStyle = "#8f8aad"; c.font = "600 26px " + F;
    c.fillText("ws2-01 · Scraping ético en el navegador y en el servidor", 80, H - 70);
    return cv;
  }

  function puedeDescargar() {
    try {
      var f = window.frameElement;
      if (!f) return window.top === window;
      if (!f.hasAttribute("sandbox")) return true;
      return f.sandbox.contains("allow-downloads");
    } catch (e) { return false; }
  }

  // Panel «Guarda tu fotito»: nombre, reflexión, imagen y cómo guardarla. opts: {etiqueta, resultado(): texto, reflexion(): texto, archivo}
  function montarFotito(cont, opts) {
    opts = opts || {};
    cont.classList.add("w-foto");
    cont.innerHTML =
      '<div class="w-g2" style="gap:.6em"><label class="w-lab">Tu nombre<input class="w-in" data-f="nombre" maxlength="40" autocomplete="name"></label>' +
      '<label class="w-lab">Tu reflexión en una línea<input class="w-in" data-f="refl" maxlength="140" placeholder="Lo que me llevo hoy…"></label></div>' +
      '<div class="w-fila"><button type="button" class="w-btn" data-f="gen">Generar mi fotito</button>' +
      '<button type="button" class="w-btn sec" data-f="bajar" hidden>Descargar PNG</button>' +
      '<button type="button" class="w-btn sec" data-f="copiar" hidden>Copiar imagen</button></div>' +
      '<img class="w-foto-img" data-f="img" alt="Tu fotito del taller" hidden>' +
      '<p class="w-foto-ayuda" data-f="ayuda" aria-live="polite"></p>';
    var $ = function (k) { return cont.querySelector('[data-f="' + k + '"]'); };
    var nom = $("nombre"), refl = $("refl"), img = $("img"), ayuda = $("ayuda"), canvas = null;
    nom.value = leer("nombre", "");
    refl.value = (opts.reflexion && opts.reflexion()) || leer("reflexion", "");
    if (!nom.value) yo().then(function (j) {
      if (nom.value) return;
      nom.value = nombreCorto(j.name || (j.email || "").split("@")[0]);
      if (nom.value && !img.hidden) generar();
    });
    nom.addEventListener("input", function () { guardar("nombre", nom.value); });
    refl.addEventListener("input", function () { guardar("reflexion", refl.value); });
    var descarga = puedeDescargar();
    function generar() {
      canvas = dibujarFotito({
        nombre: nom.value.trim() || "Alumno", avatar: avatar(), etiqueta: opts.etiqueta,
        resultado: (opts.resultado && opts.resultado()) || "Taller completado", reflexion: refl.value.trim(),
      });
      img.src = canvas.toDataURL("image/png"); img.hidden = false;
      $("copiar").hidden = !(navigator.clipboard && window.ClipboardItem);
      $("bajar").hidden = !descarga;
      ayuda.innerHTML = descarga
        ? "Pulsa <b>Descargar PNG</b> y queda en tu carpeta de descargas."
        : "<b>Celular:</b> mantén presionada la imagen y elige «Guardar imagen» o «Descargar imagen». " +
          "<b>PC:</b> clic derecho sobre la imagen → «Guardar imagen como…», o <b>Copiar imagen</b> y pégala en WhatsApp o LinkedIn.";
      cont.dispatchEvent(new CustomEvent("ws-fotito", { bubbles: true }));
    }
    $("gen").addEventListener("click", generar);
    $("bajar").addEventListener("click", function () {
      if (!canvas) return;
      var a = document.createElement("a"); a.href = canvas.toDataURL("image/png"); a.download = (opts.archivo || "fotito-scraping-etico") + ".png";
      document.body.appendChild(a); a.click(); a.remove();
    });
    $("copiar").addEventListener("click", function () {
      if (!canvas) return;
      var b = $("copiar");
      try {
        var p = new Promise(function (res) { canvas.toBlob(res, "image/png"); });
        navigator.clipboard.write([new ClipboardItem({ "image/png": p })]).then(function () {
          b.textContent = "✓ Copiada"; setTimeout(function () { b.textContent = "Copiar imagen"; }, 2200);
        }, function () { b.textContent = "No se pudo copiar: guárdala con clic derecho"; });
      } catch (e) { b.textContent = "No se pudo copiar: guárdala con clic derecho"; }
    });
    return { generar: generar, canvas: function () { return canvas; }, reflexion: function (t) { if (t != null) { refl.value = t; guardar("reflexion", t); } return refl.value; } };
  }

  function montarTodo(raiz) {
    raiz = raiz || document;
    raiz.querySelectorAll("[data-voto]").forEach(montarVoto);
    raiz.querySelectorAll("[data-muro]").forEach(montarMuro);
    raiz.querySelectorAll("[data-check]").forEach(montarCheck);
    raiz.querySelectorAll("[data-avatar]").forEach(montarAvatar);
    raiz.querySelectorAll("[data-tabs]").forEach(montarTabs);
  }

  window.WS = {
    leccion: leccion, escena: escena, api: api, cada: cada, yo: yo, nombreCorto: nombreCorto,
    leer: leer, guardar: guardar, evidencia: evidencia, publicarMuro: publicarMuro, aviso: aviso,
    avatar: avatar, dibujarArana: dibujarArana, parseAva: parseAva, dibujarFotito: dibujarFotito,
    montarFotito: montarFotito, puedeDescargar: puedeDescargar, montarTodo: montarTodo,
    CURSO: CURSO, FECHA: FECHA,
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { montarTodo(); });
  else montarTodo();
})();
