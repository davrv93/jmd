// ccp.js · ayudantes de las escenas de Claude Code PRO desde la sesión 2 (script clásico, sin módulos).
//
//   <script src="../../comun/ccp.js"></script>     (al final del body)
//
// Todo pasa por endpoints que el LIVE ya tiene (votos, muro, evidencia, carrera, /me). Si uno no responde
// (escena abierta suelta, sin sesión), la escena sigue funcionando sola: nada lanza errores.
//
//   CC.leccion, CC.escena          lección y escena sacadas de la URL del iframe
//   CC.pedir(ruta, cuerpo, metodo) → Promise<{ok, status, datos}>; ruta relativa a /api/v1/live/<lección>
//   CC.leer(k, def) / CC.guardar(k, v)   localStorage con prefijo de la lección y try/catch
//   CC.yo()                        → Promise<{id, name} | null> (de /api/v1/me, una sola vez)
//   CC.evidencia(tipo, detalle)    evidencia de la escena actual (tipo: hallazgo | captura)
//   CC.votos(raiz, escena, pregunta, opciones[{id,t}], {correcta, alVotar})
//   CC.muro(raiz, escena, pregunta, {placeholder, max, alPintar, alPublicar})
//   CC.checklist(raiz, clave, alCambiar)   <li data-id> que se marcan y se recuerdan
//   CC.pestanas(raiz, clave)       botones .cc-tab[data-tab] muestran [data-panel]
//   CC.copiar(texto)               → Promise<bool>; además monta «Copiar» en cada pre.esc-cmd y [data-copiar]
//   CC.num(n)                      12 345 (espacio como separador de miles)
//   CC.AVATARES                    los avatares del curso (id corto → emoji y color)
//   CC.tema()                      aplica ?tema=dark|light (se llama solo)
(function () {
  var CC = {};
  var m = location.pathname.match(/\/live\/([^/]+)\/escenas\/([^/]+)\//);
  CC.leccion = (m && m[1]) || (location.pathname.match(/\/live\/([^/]+)\//) || [])[1] || "ccp-02";
  CC.escena = (m && m[2]) || (location.pathname.match(/\/(\d\d[a-z]?-[a-z0-9-]+)\//) || [])[1] || "";
  if (!/^[a-z0-9-]+$/.test(CC.leccion)) CC.leccion = "ccp-02";
  CC.base = "/api/v1/live/" + CC.leccion;

  CC.pedir = function (ruta, cuerpo, metodo) {
    var url = ruta.indexOf("/api/") === 0 ? ruta : CC.base + ruta;
    var op = { method: metodo || (cuerpo ? "POST" : "GET"), credentials: "same-origin", cache: "no-store", headers: {} };
    if (cuerpo) { op.headers["Content-Type"] = "application/json"; op.body = JSON.stringify(cuerpo); }
    try {
      return fetch(url, op).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok, status: r.status, datos: d || {} }; });
      }).catch(function () { return { ok: false, status: 0, datos: {} }; });
    } catch (e) { return Promise.resolve({ ok: false, status: 0, datos: {} }); }
  };

  CC.leer = function (k, def) {
    try { var v = localStorage.getItem(CC.leccion + "-" + k); return v == null ? def : JSON.parse(v); } catch (e) { return def; }
  };
  CC.guardar = function (k, v) { try { localStorage.setItem(CC.leccion + "-" + k, JSON.stringify(v)); } catch (e) {} };

  var yoP = null;
  CC.yo = function () {
    if (!yoP) yoP = CC.pedir("/api/v1/me").then(function (r) { return r.ok && r.datos && r.datos.id ? r.datos : null; });
    return yoP;
  };

  CC.evidencia = function (tipo, detalle, escena) {
    return CC.pedir("/evidencia", { escena: escena || CC.escena, tipo: tipo, detalle: String(detalle || "").slice(0, 200) });
  };

  CC.num = function (n) {
    n = Math.round(+n || 0);
    var s = String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    return (n < 0 ? "−" : "") + s;
  };

  // Avatares del curso: el id viaja a /carrera/unir (máx. 20 caracteres) y lo leen el juego y la fotito.
  CC.AVATARES = [
    { id: "zorro", e: "🦊", c: "#f08a24" }, { id: "buho", e: "🦉", c: "#a77b4f" },
    { id: "pulpo", e: "🐙", c: "#e2508c" }, { id: "llama", e: "🦙", c: "#d9b26b" },
    { id: "colibri", e: "🐦", c: "#2bb3a3" }, { id: "robot", e: "🤖", c: "#7b6cf0" },
    { id: "gato", e: "🐱", c: "#f2b705" }, { id: "dino", e: "🦖", c: "#3fae4a" },
    { id: "abeja", e: "🐝", c: "#e9bd52" }, { id: "tortuga", e: "🐢", c: "#2f9e6e" }
  ];
  CC.avatar = function (id) {
    for (var i = 0; i < CC.AVATARES.length; i++) if (CC.AVATARES[i].id === id) return CC.AVATARES[i];
    return CC.AVATARES[0];
  };

  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  CC.el = el;

  /* ---- Votación: barras con el % del grupo; tocar otra opción cambia el voto ---- */
  CC.votos = function (raiz, escena, pregunta, opciones, cfg) {
    cfg = cfg || {};
    raiz.classList.add("cc-votos");
    raiz.textContent = "";
    if (pregunta) raiz.appendChild(el("p", "cc-votos-q", pregunta));
    var botones = {};
    var local = CC.leer("voto-" + escena, "");
    opciones.forEach(function (o) {
      var b = el("button", "cc-op"); b.type = "button"; b.setAttribute("data-opcion", o.id);
      b.appendChild(el("i"));
      b.appendChild(el("span", "t", o.t));
      b.appendChild(el("span", "n", ""));
      b.addEventListener("click", function () { votar(o.id); });
      raiz.appendChild(b); botones[o.id] = b;
    });
    var pie = el("div", "cc-votos-pie", "Toca una opción. Puedes cambiar tu voto.");
    raiz.appendChild(pie);
    function pintar(c) {
      var tot = c && +c.total > 0 ? +c.total : 0;
      var mia = (c && c.mia) || local;
      opciones.forEach(function (o) {
        var b = botones[o.id], n = tot ? (+(c.opciones || {})[o.id] || 0) : 0;
        var p = tot ? Math.round(n / tot * 100) : 0;
        b.style.setProperty("--p", p + "%");
        b.querySelector(".n").textContent = tot ? p + " %" : "";
        b.classList.toggle("mia", mia === o.id);
        b.setAttribute("aria-pressed", mia === o.id ? "true" : "false");
      });
      pie.textContent = tot ? "Votaron " + tot + (tot === 1 ? " persona" : " personas") + "." : (mia ? "Tu voto quedó. Esperando al grupo…" : "Toca una opción. Puedes cambiar tu voto.");
    }
    function traer() { CC.pedir("/votos?escena=" + escena).then(function (r) { if (r.ok) pintar(r.datos); }); }
    function votar(id) {
      local = id; CC.guardar("voto-" + escena, id); pintar(null);
      CC.pedir("/voto", { escena: escena, opcion: id }).then(function (r) { if (r.ok) pintar(r.datos); });
      if (cfg.alVotar) cfg.alVotar(id);
    }
    pintar(null); traer();
    var t = setInterval(traer, 4000);
    return {
      revelar: function () { if (cfg.correcta && botones[cfg.correcta]) botones[cfg.correcta].classList.add("correcta"); },
      detener: function () { clearInterval(t); },
      mio: function () { return local; }
    };
  };

  /* ---- Muro del grupo: una entrada por persona y escena; publicar otra vez la reemplaza ---- */
  CC.muro = function (raiz, escena, pregunta, cfg) {
    cfg = cfg || {};
    var max = cfg.max || 160;
    raiz.classList.add("cc-muro");
    raiz.textContent = "";
    if (pregunta) raiz.appendChild(el("p", "cc-muro-q", pregunta));
    var fila = el("div", "cc-fila");
    var inp = el("input", "cc-in"); inp.maxLength = max; inp.autocomplete = "off";
    inp.placeholder = cfg.placeholder || "Escribe una línea…"; inp.setAttribute("aria-label", pregunta || "Tu línea para el muro");
    inp.value = CC.leer("muro-" + escena, "") || "";
    var btn = el("button", "cc-btn", "Publicar"); btn.type = "button";
    fila.appendChild(inp); fila.appendChild(btn); raiz.appendChild(fila);
    var cab = el("div", "cc-muro-cab", ""); raiz.appendChild(cab);
    var lista = el("ul", "cc-muro-lista"); lista.setAttribute("aria-live", "polite"); raiz.appendChild(lista);
    var ultimas = [], firma = "";
    function pintar(j) {
      var en = j && Array.isArray(j.entradas) ? j.entradas : null;
      if (!en) { cab.textContent = "El muro se ve cuando la clase está en vivo."; return; }
      ultimas = en;
      if (cfg.alPintar) cfg.alPintar(en);
      var f = JSON.stringify(en.map(function (e) { return [e.nombre, e.texto, e.mia]; }));
      if (f === firma) return;
      firma = f;
      lista.textContent = "";
      cab.textContent = en.length ? en.length + (en.length === 1 ? " persona escribió" : " personas escribieron") : "";
      if (!en.length) lista.appendChild(el("li", "vacio", "Aún nadie publicó. Sé el primero."));
      en.forEach(function (e) {
        var li = el("li", e.mia ? "mia" : "");
        li.appendChild(el("b", "", e.mia ? "Tú" : (e.nombre || "alguien")));
        li.appendChild(el("span", "", e.texto || ""));
        lista.appendChild(li);
      });
    }
    function traer() { CC.pedir("/muro?escena=" + escena).then(function (r) { pintar(r.ok ? r.datos : null); }); }
    function aviso(t) { btn.textContent = t; btn.disabled = true; setTimeout(function () { btn.textContent = "Publicar"; btn.disabled = false; }, 1400); }
    function publicar(texto) {
      texto = String(texto == null ? inp.value : texto).replace(/\s+/g, " ").trim().slice(0, max);
      inp.value = texto;
      CC.guardar("muro-" + escena, texto);
      btn.disabled = true;
      return CC.pedir("/muro", { escena: escena, texto: texto }).then(function (r) {
        if (r.ok) { pintar(r.datos); aviso(texto ? "✓ Publicado" : "Borrado"); } else aviso("Guardado aquí");
        if (cfg.alPublicar) cfg.alPublicar(texto, r.ok);
        return r.ok;
      });
    }
    btn.addEventListener("click", function () { publicar(); });
    inp.addEventListener("keydown", function (ev) { if (ev.key === "Enter") { ev.preventDefault(); publicar(); } });
    traer();
    var t = setInterval(traer, 5000);
    return { publicar: publicar, input: inp, entradas: function () { return ultimas; }, detener: function () { clearInterval(t); } };
  };

  /* ---- Checklist: cada <li data-id> se marca con un toque y se recuerda en este navegador ---- */
  CC.checklist = function (raiz, clave, alCambiar) {
    var est = CC.leer("check-" + clave, {}) || {};
    var items = raiz.querySelectorAll("li[data-id]");
    function pintar() {
      var n = 0;
      Array.prototype.forEach.call(items, function (li) {
        var h = !!est[li.getAttribute("data-id")];
        li.classList.toggle("hecho", h); li.setAttribute("aria-checked", h ? "true" : "false");
        if (h) n++;
      });
      if (alCambiar) alCambiar(n, items.length);
    }
    Array.prototype.forEach.call(items, function (li) {
      li.setAttribute("role", "checkbox"); li.tabIndex = 0;
      if (!li.querySelector(".c")) {
        var tx = el("span", "tx"); while (li.firstChild) tx.appendChild(li.firstChild); // el texto con <b> o <code> va junto, no como piezas sueltas del flex
        li.appendChild(el("span", "c")); li.appendChild(tx);
      }
      function t() { var id = li.getAttribute("data-id"); est[id] = !est[id]; CC.guardar("check-" + clave, est); pintar(); }
      li.addEventListener("click", function (ev) { if (ev.target.closest("button, a, pre")) return; t(); });
      li.addEventListener("keydown", function (ev) { if (ev.key === " " || ev.key === "Enter") { ev.preventDefault(); t(); } });
    });
    pintar();
    return { estado: function () { return est; } };
  };

  /* ---- Pestañas: .cc-tab[data-tab] muestran el [data-panel] del mismo id ---- */
  CC.pestanas = function (raiz, clave, alCambiar) {
    var tabs = raiz.querySelectorAll(".cc-tab"), panes = raiz.querySelectorAll("[data-panel]");
    function ir(id) {
      Array.prototype.forEach.call(tabs, function (t) { t.setAttribute("aria-selected", t.getAttribute("data-tab") === id ? "true" : "false"); });
      Array.prototype.forEach.call(panes, function (p) { p.hidden = p.getAttribute("data-panel") !== id; });
      CC.guardar("tab-" + clave, id);
      if (alCambiar) alCambiar(id);
    }
    Array.prototype.forEach.call(tabs, function (t) { t.setAttribute("role", "tab"); t.addEventListener("click", function () { ir(t.getAttribute("data-tab")); }); });
    var def = CC.leer("tab-" + clave, "");
    if (!def || !raiz.querySelector('[data-tab="' + def + '"]')) def = tabs[0] && tabs[0].getAttribute("data-tab");
    ir(def);
    return { ir: ir };
  };

  /* ---- Copiar: el iframe va con sandbox; se intenta clipboard propio, el del padre y execCommand ---- */
  CC.copiar = function (texto) {
    texto = String(texto == null ? "" : texto);
    function viejo() {
      try {
        var a = document.createElement("textarea");
        a.value = texto; a.setAttribute("readonly", "");
        a.style.cssText = "position:fixed;top:0;left:0;opacity:0;pointer-events:none";
        document.body.appendChild(a); a.select();
        var ok = document.execCommand("copy"); a.remove(); return !!ok;
      } catch (e) { return false; }
    }
    function padre() {
      try { return window.parent.navigator.clipboard.writeText(texto).then(function () { return true; }, viejo); }
      catch (e) { return Promise.resolve(viejo()); }
    }
    try { return navigator.clipboard.writeText(texto).then(function () { return true; }, padre); }
    catch (e) { return padre(); }
  };
  window.copiarTexto = CC.copiar;

  var CSS_CP =
    ".cp-env{position:relative;min-width:0}" +
    ".cp-env>pre.esc-cmd{padding-right:5.8em}" +
    ".cp-btn{position:absolute;top:.45em;right:.5em;z-index:2;font:700 .6em/1 system-ui,-apple-system,sans-serif;" +
    "padding:.55em .9em;min-height:32px;border-radius:999px;border:1px solid rgba(190,185,255,.35);background:rgba(20,18,43,.9);" +
    "color:#e9e6ff;cursor:pointer;opacity:.9;user-select:none;touch-action:manipulation}" +
    ".cp-btn:hover,.cp-btn:focus-visible{opacity:1;border-color:#a99cff;outline:none}" +
    ".cp-btn.ok{background:#136a33;border-color:#4fd37a;color:#fff;opacity:1}" +
    ".cp-btn.mal{background:#b11f1f;border-color:#ff7b7b;color:#fff;opacity:1}";

  function textoDe(pre) {
    if (pre.hasAttribute("data-copiar")) return pre.getAttribute("data-copiar");
    var clon = pre.cloneNode(true);
    var fuera = clon.querySelectorAll(".p, .c, .cp-btn");
    for (var i = 0; i < fuera.length; i++) fuera[i].remove();
    var lineas = clon.textContent.replace(/\r/g, "").split("\n").map(function (l) { return l.replace(/\s+$/, ""); });
    while (lineas.length && !lineas[0].trim()) lineas.shift();
    while (lineas.length && !lineas[lineas.length - 1].trim()) lineas.pop();
    return lineas.join("\n");
  }
  function avisoBoton(btn, ok, txt0) {
    btn.classList.remove("ok", "mal"); btn.classList.add(ok ? "ok" : "mal");
    btn.textContent = ok ? "✓ Copiado" : "No pude copiar";
    clearTimeout(btn._t);
    btn._t = setTimeout(function () { btn.classList.remove("ok", "mal"); btn.textContent = txt0; }, 2200);
  }
  CC.montarCopiar = function (raiz) {
    if (!document.getElementById("cp-css")) { var s = document.createElement("style"); s.id = "cp-css"; s.textContent = CSS_CP; document.head.appendChild(s); }
    Array.prototype.forEach.call((raiz || document).querySelectorAll("pre.esc-cmd:not([data-cp])"), function (pre) {
      pre.setAttribute("data-cp", "1");
      var env = el("div", "cp-env"); pre.parentNode.insertBefore(env, pre); env.appendChild(pre);
      var btn = el("button", "cp-btn", "Copiar"); btn.type = "button"; btn.setAttribute("aria-label", "Copiar");
      btn.addEventListener("click", function () { CC.copiar(textoDe(pre)).then(function (ok) { avisoBoton(btn, ok, "Copiar"); }); });
      env.appendChild(btn);
    });
    Array.prototype.forEach.call((raiz || document).querySelectorAll("button[data-copiar]:not([data-cp])"), function (b) {
      b.setAttribute("data-cp", "1");
      var t0 = b.textContent;
      b.addEventListener("click", function () {
        CC.copiar(b.getAttribute("data-copiar")).then(function (ok) {
          b.textContent = ok ? "✓ Copiado" : "No pude copiar"; clearTimeout(b._t);
          b._t = setTimeout(function () { b.textContent = t0; }, 2000);
        });
      });
    });
  };

  CC.tema = function () {
    try {
      var t = new URLSearchParams(location.search).get("tema");
      if (t === "dark" || t === "light") document.documentElement.setAttribute("data-tema", t);
    } catch (e) {}
  };
  CC.tema();

  window.CC = CC;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { CC.montarCopiar(); });
  else CC.montarCopiar();
})();
