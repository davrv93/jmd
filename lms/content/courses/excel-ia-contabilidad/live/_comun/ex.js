/* Excel + IA para Contabilidad · motor de escenas.
   Cada escena.html trae sus datos en <script type="application/json" id="ex-datos"> y este archivo la dibuja:
   contexto (idea + caso inicial + diagrama), demo (pasos con hoja dibujada), reto (Hoja JMD editable: reto.js), juego + foro
   y cierre + reflexión final. La cabecera muestra la ruta del módulo: caso inicial → foro → lección → reto → cierre.
   Sin librerías. Funciona dentro del iframe del LIVE (mismo origen) y abierto suelto para revisar. */
(function () {
  "use strict";
  var D = JSON.parse(document.getElementById("ex-datos").textContent);
  var q = new URLSearchParams(location.search);
  var tema = q.get("tema");
  if (tema === "dark" || tema === "light") document.documentElement.setAttribute("data-tema", tema);
  var leccion = (location.pathname.match(/\/live\/([^/]+)\//) || [])[1] || D.leccion;
  var escena = (location.pathname.match(/\/escenas\/([^/]+)\//) || [])[1] || D.escena;
  window.EX = { leccion: leccion, escena: escena, datos: D, enLMS: /\/api\/v1\/live\//.test(location.pathname) };

  function h(tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      var v = attrs[k];
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k === "html") el.innerHTML = v;
      else if (k === "text") el.textContent = v;
      else if (k.slice(0, 2) === "on") el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? "" : v);
    }
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (c == null || c === false) continue;
      if (Array.isArray(c)) c.forEach(function (x) { if (x != null) el.appendChild(typeof x === "string" ? document.createTextNode(x) : x); });
      else el.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    }
    return el;
  }
  // Texto con **negritas** y `código` (lo único que se permite en los datos).
  function rico(s) {
    var esc = String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return esc.replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>").replace(/`([^`]+)`/g, '<code class="x-c">$1</code>');
  }
  window.EX.h = h;
  window.EX.rico = rico;

  var FASES = { ec: "Experiencia", or: "Reflexión", ca: "Conceptos", ea: "Práctica" };
  // La ruta de cada módulo (la misma en las 20 clases): caso inicial → foro → lección → reto → cierre.
  var RUTA = ["Caso inicial", "Foro", "Lección", "Reto", "Cierre"];
  var minutos = D.ruta_min || [];

  var raiz = document.getElementById("esc") || document.body.appendChild(h("div", { id: "esc" }));
  raiz.className = "esc";
  var cab = h("header", { class: "x-cab" },
    h("span", { class: "esc-fase", "data-ph": D.fase, text: FASES[D.fase] || "" }),
    h("span", { class: "esc-num", text: "Clase " + D.sesion + " · " + D.tema }),
    h("div", { class: "x-tiempo", "aria-label": "Ruta del módulo: paso " + ((D.ruta || 0) + 1) + " de 5" }, RUTA.map(function (b, i) {
      return h("span", { "aria-current": i === D.ruta ? "true" : "false", title: minutos[i] ? minutos[i] + " min" : null, text: (i + 1) + " " + b });
    })));
  var cuerpo = h("main", { class: "esc-cuerpo" });
  var pie = h("footer", { class: "esc-pie", text: D.modulo + " · Excel + IA para Contabilidad · proyecto integrador con tu empresa · datos ficticios" });
  raiz.appendChild(cab);
  raiz.appendChild(cuerpo);
  raiz.appendChild(pie);
  cuerpo.appendChild(h("h1", { class: "esc-titulo a-in", html: rico(D.titulo).replace(/__(.+?)__/g, "<em>$1</em>") }));

  // ---------------------------------------------------------------- diagramas
  function diagrama(d) {
    var caja = h("div", { class: "x-dia a-in", style: "--d:.15s" });
    if (d.titulo) caja.appendChild(h("div", { class: "x-dia-tit", text: d.titulo }));
    if (d.tipo === "flujo") {
      var f = h("div", { class: "x-flujo" });
      d.nodos.forEach(function (n, i) {
        if (i > 0) f.appendChild(h("span", { class: "x-op", text: (d.ops && d.ops[i - 1]) || "→" }));
        f.appendChild(h("div", { class: "x-nodo" + (n.dest ? " dest" : "") }, h("span", { class: "ic", text: n.ic || "" }), h("b", { text: n.t }), n.s ? h("small", { text: n.s }) : null));
      });
      caja.appendChild(f);
    } else if (d.tipo === "cols") {
      var c = h("div", { class: "x-cols", style: "--n:" + d.cols.length });
      d.cols.forEach(function (col) {
        c.appendChild(h("div", { class: "x-col" }, h("h4", null, h("span", { text: col.ic || "" }), col.t), col.items.map(function (it) { return h("span", { text: it }); })));
      });
      caja.appendChild(c);
    } else if (d.tipo === "linea") {
      caja.appendChild(h("div", { class: "x-linea", style: "--n:" + d.items.length }, d.items.map(function (it) {
        return h("div", { class: (it.on ? "on " : "") + (it.pago ? "pago" : ""), text: it.t });
      })));
    } else if (d.tipo === "barras") {
      var max = Math.max.apply(null, d.items.map(function (x) { return Math.abs(x.v); })) || 1;
      caja.appendChild(h("div", { class: "x-barras" }, d.items.map(function (it) {
        return h("div", null, h("small", { text: it.e || "" }), h("i", { class: it.v < 0 ? "neg" : "", style: "height:" + Math.max(4, Math.round(Math.abs(it.v) / max * 85)) + "%" }), h("small", { text: it.t }));
      })));
    }
    if (d.nota) caja.appendChild(h("div", { class: "x-nota", html: rico(d.nota) }));
    return caja;
  }

  // ---------------------------------------------------------------- hoja de cálculo dibujada
  function hoja(s) {
    var marcas = {};
    ["sel", "res", "err", "mar"].forEach(function (k) { (s[k] || []).forEach(function (p) { marcas[p[0] + "," + p[1]] = k; }); });
    var ent = s.ent || [];
    var w = h("div", { class: "x-hoja", role: "img", "aria-label": "Ilustración de una hoja de cálculo" });
    if (s.menu) w.appendChild(h("div", { class: "x-hoja-menu" }, "Menú:", s.menu.split("›").map(function (m) { return h("b", { text: m.trim() }); })));
    w.appendChild(h("div", { class: "x-hoja-barra" }, h("span", { class: "ref", text: s.ref || "" }), h("span", { class: "fx", text: "fx" }), h("span", { class: "f", text: s.fx || "" })));
    var t = h("table", { class: "x-tabla-h" });
    var colg = h("colgroup", null, h("col", { style: "width:2.4em" }));
    (s.anchos || []).forEach(function (a) { colg.appendChild(h("col", { style: "width:" + a })); });
    t.appendChild(colg);
    t.appendChild(h("thead", null, h("tr", null, h("th", { class: "n" }), s.cols.map(function (c) { return h("th", { text: c }); }))));
    var tb = h("tbody");
    var f0 = s.f0 || 2;
    tb.appendChild(h("tr", null, h("th", { class: "n", text: String(f0 - 1) }), s.enc.map(function (e, j) { return h("td", { class: "enc" + (ent.indexOf(j) >= 0 ? " in" : ""), text: e }); })));
    s.filas.forEach(function (fila, i) {
      tb.appendChild(h("tr", null, h("th", { class: "n", text: String(f0 + i) }), fila.map(function (v, j) {
        var cl = [];
        if (typeof v === "number" || /^-?[\d.,]+%?$/.test(String(v)) || /^S\/ /.test(String(v))) cl.push("num");
        var m = marcas[i + "," + j];
        if (m) cl.push(m); else if (ent.indexOf(j) >= 0 && (v === "" || v == null)) cl.push("in");
        return h("td", { class: cl.join(" "), text: v == null ? "" : String(v) });
      })));
    });
    t.appendChild(tb);
    w.appendChild(t);
    if (s.hojas) w.appendChild(h("div", { class: "x-hoja-pie" }, s.hojas.map(function (n, i) { return h("span", { class: i === (s.on || 0) ? "on" : "", text: n }); })));
    return w;
  }
  window.EX.hoja = hoja;

  // ---------------------------------------------------------------- descargas
  // El iframe del LIVE no permite descargas; el enlace se crea en la página del LMS (mismo origen).
  function descargar(url, nombre, msg) {
    try {
      var doc = window.parent && window.parent !== window ? window.parent.document : document;
      var a = doc.createElement("a");
      a.href = url;
      a.download = nombre;
      a.rel = "noopener";
      doc.body.appendChild(a);
      a.click();
      a.remove();
      if (msg) msg.textContent = "Descargando " + nombre + "… Si no baja, búscalo en «Materiales» de la sesión.";
    } catch (e) {
      if (msg) msg.textContent = "No se pudo descargar desde aquí: búscalo en «Materiales» de la sesión.";
    }
  }

  function empresaGuardada() { try { return localStorage.getItem("ex-empresa") || ""; } catch (e) { return ""; } }
  function guardarEmpresa(v) { try { localStorage.setItem("ex-empresa", v); } catch (e) { /* sin almacenamiento */ } }

  // ---------------------------------------------------------------- foro de reflexión (muro del LIVE)
  // Va contra /api/v1/live/{lección}/muro (vive en la memoria del LMS). Fuera del LMS queda solo en esta pantalla.
  function muro(cfg) {
    var clave = "ex-muro-" + D.leccion + "-" + cfg.id;
    var caja = h("section", { class: "x-bloque x-muro", "data-muro": cfg.id });
    var inp = h("textarea", { maxlength: "200", rows: "2", "aria-label": cfg.pregunta, placeholder: cfg.placeholder || "Escribe tu respuesta (máximo 200 caracteres)" });
    var cuenta = h("small", { class: "x-nota", text: "0/200" });
    var btn = h("button", { type: "button", class: "x-btn pri", "data-muro-enviar": "" }, "Publicar");
    var lista = h("ul", { class: "x-muro-lista", "aria-live": "polite" });
    caja.appendChild(h("h2", null, h("span", { class: "k", text: "💬" }), cfg.titulo || "Foro de reflexión"));
    caja.appendChild(h("p", { class: "x-muro-preg", html: rico(cfg.pregunta) }));
    if (cfg.guia) caja.appendChild(h("p", { class: "x-nota", html: rico(cfg.guia) }));
    caja.appendChild(inp);
    caja.appendChild(h("div", { class: "x-muro-acc" }, cuenta, btn));
    caja.appendChild(lista);
    try { inp.value = localStorage.getItem(clave) || ""; } catch (e) { /* */ }
    cuenta.textContent = inp.value.length + "/200";
    inp.addEventListener("input", function () { cuenta.textContent = inp.value.length + "/200"; });
    function pintar(entradas) {
      lista.innerHTML = "";
      if (!entradas.length) { lista.appendChild(h("li", { class: "vacio", text: "Aún nadie escribe. Abre tú el foro." })); return; }
      entradas.slice(0, 6).forEach(function (e) {
        lista.appendChild(h("li", { class: e.mia ? "mia" : "" }, h("b", { text: (e.mia ? "Tú" : e.nombre || "Compañero") + ": " }), e.texto,
          e.likes ? h("small", { text: " · ♥ " + e.likes }) : null));
      });
    }
    function api(ruta, cuerpo) {
      return fetch("/api/v1/live/" + encodeURIComponent(D.leccion) + ruta, cuerpo ? { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) } : { credentials: "same-origin" })
        .then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
    }
    btn.addEventListener("click", function () {
      var t = inp.value.trim();
      if (t.length < 3) { inp.focus(); return; }
      try { localStorage.setItem(clave, t); } catch (e) { /* */ }
      btn.disabled = true;
      if (!window.EX.enLMS) { pintar([{ mia: true, texto: t }]); btn.disabled = false; return; }
      api("/muro", { escena: cfg.id, texto: t }).then(function (r) {
        pintar(r && r.entradas ? r.entradas : [{ mia: true, texto: t }]);
        btn.disabled = false;
      });
    });
    if (window.EX.enLMS) api("/muro?escena=" + encodeURIComponent(cfg.id)).then(function (r) { if (r && r.entradas) pintar(r.entradas); });
    return caja;
  }
  window.EX.muro = muro;

  // ---------------------------------------------------------------- tipos de escena
  var T = {};

  T.contexto = function () {
    var izq = h("div", { class: "a-in", style: "display:grid;gap:1.4em" },
      h("ol", { class: "x-idea" }, D.idea.map(function (s) { return h("li", null, h("span", { html: rico(s) })); })),
      D.hoy ? h("div", { class: "x-hoy" }, h("b", { text: "Hoy construyes:" }), D.hoy.map(function (x) { return h("span", { class: "esc-chip", text: x }); })) : null);
    if (D.caso_inicial) izq.appendChild(h("div", { class: "x-inicial" }, h("b", { text: "🧭 Caso inicial · primer intento" }), h("span", { html: rico(D.caso_inicial) })));
    cuerpo.appendChild(h("div", { class: "x-ctx" }, izq, diagrama(D.diagrama)));
  };

  T.demo = function () {
    var i = 0;
    var lista = h("ol", { class: "x-pasos" });
    var vista = h("div", { class: "x-vista" });
    var botones = D.pasos.map(function (p, k) {
      var b = h("button", { type: "button", onclick: function () { ir(k); } }, h("span", { class: "n", text: String(k + 1) }), h("span", { text: p.t }));
      lista.appendChild(h("li", null, b));
      return b;
    });
    var ant = h("button", { type: "button", class: "x-btn", onclick: function () { ir(i - 1); } }, "← Anterior");
    var sig = h("button", { type: "button", class: "x-btn pri", onclick: function () { ir(i + 1); } }, "Siguiente →");
    var cuenta = h("span", { class: "x-cuenta" });
    function ir(k) {
      if (k < 0 || k >= D.pasos.length) return;
      i = k;
      var p = D.pasos[k];
      botones.forEach(function (b, j) { b.setAttribute("aria-current", j === k ? "step" : "false"); b.classList.toggle("hecho", j < k); });
      vista.innerHTML = "";
      vista.appendChild(hoja(p.hoja));
      vista.appendChild(h("div", { class: "x-explica" },
        h("h2", null, h("span", { style: "color:var(--accent)", text: "Paso " + (k + 1) + ". " }), p.t),
        p.d ? h("p", { html: rico(p.d) }) : null,
        p.fn ? h("div", null, h("span", { class: "x-fn" }, p.fn.es, h("small", { text: p.fn.en ? "en inglés: " + p.fn.en : "" }))) : null,
        p.tip ? h("div", { class: "x-tip", html: "<b>Ojo:</b> " + rico(p.tip) }) : null));
      ant.disabled = k === 0;
      sig.disabled = k === D.pasos.length - 1;
      cuenta.textContent = (k + 1) + " de " + D.pasos.length;
    }
    document.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") ir(i + 1);
      if (e.key === "ArrowLeft") ir(i - 1);
    });
    var izq = h("div", { style: "display:grid;gap:1em" }, lista, h("div", { class: "x-nav" }, ant, sig, cuenta));
    cuerpo.appendChild(h("div", { class: "x-demo a-in" }, izq, vista));
    ir(0);
  };

  T.caso = function () {
    var sel = h("select", { "aria-label": "Tu empresa", id: "ex-empresa" },
      h("option", { value: "", text: "Elige tu empresa…" }),
      D.empresas.map(function (e) { return h("option", { value: e.id, text: e.icono + " " + e.id + " · " + e.corto }); }));
    var ficha = h("div", { class: "x-ficha" });
    var msg = h("div", { class: "x-aviso-dl", "aria-live": "polite" });
    var dl = h("button", { type: "button", class: "x-btn", disabled: true, id: "ex-descargar", title: "El Excel del caso, tal como lo abres en tu computadora" }, "⬇ Excel original");
    var oyentes = [];
    function actual() { return D.empresas.filter(function (x) { return x.id === sel.value; })[0] || null; }
    function pintar(avisar) {
      var e = actual();
      ficha.innerHTML = "";
      dl.disabled = !e;
      if (!e) { msg.textContent = "Elige tu empresa: la misma en los seis módulos (proyecto integrador)."; return; }
      guardarEmpresa(e.id);
      [["Razón social", e.razon], ["RUC", e.ruc + " (ficticio)"], ["Régimen", e.regimen], ["Rubro", e.rubro]].forEach(function (p) {
        ficha.appendChild(h("span", { text: p[0] }));
        ficha.appendChild(h("b", { text: p[1] }));
      });
      var nombre = D.leccion + "-" + e.id + "-" + e.slug + ".xlsx";
      dl.onclick = function () { descargar("/files/" + D.curso + "/materials/casos/" + D.leccion + "/" + nombre, nombre, msg); };
      msg.textContent = "Archivo: " + nombre;
      if (avisar) oyentes.forEach(function (f) { f(e); });
    }
    sel.addEventListener("change", function () { pintar(true); });
    sel.value = empresaGuardada();
    var cab = h("section", { class: "x-bloque x-reto-cab" },
      h("h2", null, h("span", { class: "k", text: "1" }), "Tu empresa"),
      h("div", { class: "x-emp-sel" }, sel, dl), h("details", { class: "x-ficha-d" }, h("summary", { text: "Ficha de la empresa" }), ficha), msg);
    var angosta = typeof matchMedia === "function" && matchMedia("(max-width: 760px)").matches;
    var tareas = h("details", { class: "x-bloque x-reto-tareas", open: !angosta },
      h("summary", null, h("span", { class: "k", text: "2" }), "Reto: " + (D.reto || "resuélvelo en la Hoja JMD")),
      h("ol", { class: "x-tareas" }, D.tareas.map(function (t) { return h("li", null, h("span", { html: rico(t) })); })),
      D.integrador ? h("p", { class: "x-nota", html: "<b>Proyecto integrador:</b> " + rico(D.integrador) }) : null);
    var zonaHoja = h("div", { class: "x-reto-hoja", id: "hoja-jmd" });
    var aviso = h("div", { class: "x-aviso-dl", "aria-live": "polite" });
    var panelRev = h("section", { class: "x-bloque x-rev", id: "reto-revision" });
    var panelIA = h("section", { class: "x-bloque x-ia", id: "reto-ia" });
    var der = h("section", { class: "x-bloque" }, h("h2", null, h("span", { class: "k", text: "🤖" }), "Pregúntale a la IA"));
    var marcador = document.querySelector("[data-jmd-dsh]");
    if (marcador) der.appendChild(marcador);
    if (D.consejo) der.appendChild(h("div", { class: "x-tip", html: "<b>Recuerda:</b> " + rico(D.consejo) }));
    var principal = h("div", { class: "x-reto-main" }, h("div", { class: "x-reto-top" }, cab, tareas), zonaHoja, aviso);
    var lado = h("aside", { class: "x-reto-lado" }, panelRev, panelIA, der);
    cuerpo.appendChild(h("div", { class: "x-reto a-in" }, principal, lado));
    pintar(false);
    window.EX_CASO = {
      zonaHoja: zonaHoja, panelRev: panelRev, panelIA: panelIA,
      empresaActual: function () { return actual() || D.empresas[0]; },
      elegida: function () { return !!actual(); },
      alElegir: function (f) { oyentes.push(f); },
      aviso: function (t) { aviso.textContent = t; }
    };
  };

  T.juego = function () {
    if (D.intro) cuerpo.appendChild(h("p", { class: "esc-sub", html: rico(D.intro) }));
    var zona = h("div", { class: "a-in" });
    cuerpo.appendChild(zona);
    if (D.foro) cuerpo.appendChild(muro(D.foro));
    window.EX_JUEGO = { zona: zona, cfg: D.juego };
  };

  T.cierre = function () {
    var hechos = 0;
    var lista = h("ul", { class: "x-check" }, D.checklist.map(function (c) {
      var b = h("button", { type: "button", role: "checkbox", "aria-checked": "false", onclick: function () {
        var on = b.getAttribute("aria-checked") !== "true";
        b.setAttribute("aria-checked", on ? "true" : "false");
        hechos += on ? 1 : -1;
        cuentaCh.textContent = hechos + " de " + D.checklist.length + (hechos === D.checklist.length ? " · ¡Listo! Pulsa «Lo logré»." : "");
      } }, h("i", { text: "✓" }), h("span", { html: rico(c) }));
      return h("li", null, b);
    }));
    var cuentaCh = h("div", { class: "x-sig", "aria-live": "polite", text: "0 de " + D.checklist.length });
    var izq = h("section", { class: "x-bloque" }, h("h2", null, "✅ Antes de irte, comprueba"), lista, cuentaCh,
      D.siguiente ? h("div", { class: "x-sig", html: "<b>Próxima sesión:</b> " + rico(D.siguiente) }) : null);
    var zona = h("div");
    cuerpo.appendChild(h("div", { class: "x-cierre a-in" }, izq, zona));
    if (D.foro) cuerpo.appendChild(muro(D.foro));
    window.EX_JUEGO = { zona: zona, cfg: D.juego };
  };

  (T[D.tipo] || T.contexto)();
})();
