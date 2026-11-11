// pt.js · ayudantes de las escenas de «Potencia tus agentes» (script clásico, sin módulos).
//
//   <script src="../../comun/pt.js"></script>
//
// Todo pasa por los endpoints que ya tiene el LIVE (votos, muro, evidencia, carrera, /me). Si un endpoint no
// responde (escena abierta suelta, sin sesión), la escena sigue funcionando sola: nada lanza errores.
//
//   PT.leccion, PT.escena          lección y escena sacadas de la URL del iframe
//   PT.pedir(ruta, cuerpo)         → Promise<{ok, status, datos}>; ruta relativa a /api/v1/live/<lección>
//   PT.leer(k, def) / PT.guardar(k, v)   localStorage con prefijo de la lección y try/catch
//   PT.yo()                        → Promise<{id, name} | null> (de /api/v1/me, una sola vez)
//   PT.evidencia(tipo, detalle)    evidencia de la escena actual (tipo: hallazgo | captura)
//   PT.votos(raiz, escena, pregunta, opciones[{id,t}], {correcta})   votación con barras en vivo
//   PT.muro(raiz, escena, pregunta, {placeholder, alPintar})         muro del grupo
//   PT.checklist(raiz, clave)      <li data-id> que se marcan y se recuerdan
//   PT.num(n)                      12 345 (espacio fino como separador)
//   PT.tema()                      aplica ?tema=dark|light
(function () {
  var PT = {};
  var m = location.pathname.match(/\/live\/([^/]+)\/escenas\/([^/]+)\//);
  PT.leccion = (m && m[1]) || (location.pathname.match(/\/live\/([^/]+)\//) || [])[1] || "pt2-01";
  PT.escena = (m && m[2]) || (location.pathname.match(/\/(\d\d-[a-z0-9-]+)\//) || [])[1] || "";
  if (!/^[a-z0-9-]+$/.test(PT.leccion)) PT.leccion = "pt2-01";
  PT.base = "/api/v1/live/" + PT.leccion;

  PT.pedir = function (ruta, cuerpo, metodo) {
    var url = /^\//.test(ruta) && ruta.indexOf("/api/") === 0 ? ruta : PT.base + ruta;
    var op = { method: metodo || (cuerpo ? "POST" : "GET"), credentials: "same-origin", cache: "no-store", headers: {} };
    if (cuerpo) { op.headers["Content-Type"] = "application/json"; op.body = JSON.stringify(cuerpo); }
    try {
      return fetch(url, op).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok, status: r.status, datos: d || {} }; });
      }).catch(function () { return { ok: false, status: 0, datos: {} }; });
    } catch (e) { return Promise.resolve({ ok: false, status: 0, datos: {} }); }
  };

  PT.leer = function (k, def) {
    try { var v = localStorage.getItem(PT.leccion + "-" + k); return v == null ? def : JSON.parse(v); } catch (e) { return def; }
  };
  PT.guardar = function (k, v) { try { localStorage.setItem(PT.leccion + "-" + k, JSON.stringify(v)); } catch (e) {} };

  var yoP = null;
  PT.yo = function () {
    if (!yoP) yoP = PT.pedir("/api/v1/me").then(function (r) { return r.ok && r.datos && r.datos.id ? r.datos : null; });
    return yoP;
  };

  PT.evidencia = function (tipo, detalle, escena) {
    return PT.pedir("/evidencia", { escena: escena || PT.escena, tipo: tipo, detalle: String(detalle || "").slice(0, 200) });
  };

  PT.num = function (n) {
    n = Math.round(+n || 0);
    var s = String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    return (n < 0 ? "−" : "") + s;
  };

  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  PT.el = el;

  /* ---- Votación: barras con el % del grupo; volver a tocar otra opción cambia el voto ---- */
  PT.votos = function (raiz, escena, pregunta, opciones, cfg) {
    cfg = cfg || {};
    raiz.classList.add("pt-votos");
    raiz.textContent = "";
    if (pregunta) raiz.appendChild(el("p", "pt-votos-q", pregunta));
    var botones = {};
    var local = PT.leer("voto-" + escena, "");
    opciones.forEach(function (o) {
      var b = el("button", "pt-op"); b.type = "button"; b.setAttribute("data-opcion", o.id);
      b.appendChild(el("i"));
      b.appendChild(el("span", "t", o.t));
      b.appendChild(el("span", "n", ""));
      b.addEventListener("click", function () { votar(o.id); });
      raiz.appendChild(b); botones[o.id] = b;
    });
    var pie = el("div", "pt-votos-pie", "Toca una opción. Puedes cambiar tu voto.");
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
    function traer() { PT.pedir("/votos?escena=" + escena).then(function (r) { if (r.ok) pintar(r.datos); }); }
    function votar(id) {
      local = id; PT.guardar("voto-" + escena, id); pintar(null);
      PT.pedir("/voto", { escena: escena, opcion: id }).then(function (r) { if (r.ok) pintar(r.datos); });
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
  PT.muro = function (raiz, escena, pregunta, cfg) {
    cfg = cfg || {};
    raiz.classList.add("pt-muro");
    raiz.textContent = "";
    if (pregunta) raiz.appendChild(el("p", "pt-muro-q", pregunta));
    var fila = el("div", "pt-fila");
    var inp = el("input", "pt-in"); inp.maxLength = cfg.max || 160; inp.autocomplete = "off";
    inp.placeholder = cfg.placeholder || "Escribe una línea…"; inp.setAttribute("aria-label", pregunta || "Tu línea para el muro");
    inp.value = PT.leer("muro-" + escena, "") || "";
    var btn = el("button", "pt-btn", "Publicar"); btn.type = "button";
    fila.appendChild(inp); fila.appendChild(btn); raiz.appendChild(fila);
    var cab = el("div", "pt-muro-cab", ""); raiz.appendChild(cab);
    var lista = el("ul", "pt-muro-lista"); lista.setAttribute("aria-live", "polite"); raiz.appendChild(lista);
    var ultimas = [];
    function pintar(j) {
      var en = j && Array.isArray(j.entradas) ? j.entradas : null;
      if (!en) { cab.textContent = "El muro se ve cuando la clase está en vivo."; return; }
      ultimas = en;
      lista.textContent = "";
      cab.textContent = en.length ? en.length + (en.length === 1 ? " persona escribió" : " personas escribieron") : "";
      if (!en.length) lista.appendChild(el("li", "vacio", "Aún nadie publicó. Sé el primero."));
      en.forEach(function (e) {
        var li = el("li", e.mia ? "mia" : "");
        li.appendChild(el("b", "", e.mia ? "Tú" : (e.nombre || "alguien")));
        li.appendChild(el("span", "", e.texto || ""));
        lista.appendChild(li);
      });
      if (cfg.alPintar) cfg.alPintar(en);
    }
    function traer() { PT.pedir("/muro?escena=" + escena).then(function (r) { pintar(r.ok ? r.datos : null); }); }
    function aviso(t) { var o = "Publicar"; btn.textContent = t; btn.disabled = true; setTimeout(function () { btn.textContent = o; btn.disabled = false; }, 1400); }
    function publicar(texto) {
      texto = String(texto == null ? inp.value : texto).replace(/\s+/g, " ").trim().slice(0, cfg.max || 160);
      inp.value = texto;
      PT.guardar("muro-" + escena, texto);
      btn.disabled = true;
      return PT.pedir("/muro", { escena: escena, texto: texto }).then(function (r) {
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
  PT.checklist = function (raiz, clave, alCambiar) {
    var est = PT.leer("check-" + clave, {}) || {};
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
      if (!li.querySelector(".c")) li.insertBefore(el("span", "c"), li.firstChild);
      function t() { var id = li.getAttribute("data-id"); est[id] = !est[id]; PT.guardar("check-" + clave, est); pintar(); }
      li.addEventListener("click", function (ev) { if (ev.target.closest("button, a, pre")) return; t(); });
      li.addEventListener("keydown", function (ev) { if (ev.key === " " || ev.key === "Enter") { ev.preventDefault(); t(); } });
    });
    pintar();
    return { estado: function () { return est; } };
  };

  /* ---- Pestañas (Mac / Linux / Windows): botones .pt-tab[data-tab] muestran [data-panel] ---- */
  PT.pestanas = function (raiz, clave) {
    var tabs = raiz.querySelectorAll(".pt-tab"), panes = raiz.querySelectorAll("[data-panel]");
    function ir(id) {
      Array.prototype.forEach.call(tabs, function (t) { t.setAttribute("aria-selected", t.getAttribute("data-tab") === id ? "true" : "false"); });
      Array.prototype.forEach.call(panes, function (p) { p.hidden = p.getAttribute("data-panel") !== id; });
      PT.guardar("tab-" + clave, id);
    }
    Array.prototype.forEach.call(tabs, function (t) { t.setAttribute("role", "tab"); t.addEventListener("click", function () { ir(t.getAttribute("data-tab")); }); });
    var def = PT.leer("tab-" + clave, "");
    if (!def) { var ua = navigator.userAgent || ""; def = /Windows/.test(ua) ? "win" : /Mac/.test(ua) && !/iPhone|iPad/.test(ua) ? "mac" : "linux"; }
    if (!raiz.querySelector('[data-tab="' + def + '"]')) def = tabs[0] && tabs[0].getAttribute("data-tab");
    ir(def);
  };

  PT.tema = function () {
    try {
      var t = new URLSearchParams(location.search).get("tema");
      if (t === "dark" || t === "light") document.documentElement.setAttribute("data-tema", t);
    } catch (e) {}
  };
  PT.tema();

  window.PT = PT;
})();
