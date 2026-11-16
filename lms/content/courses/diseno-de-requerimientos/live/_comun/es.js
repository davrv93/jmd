/* Event Storming en el LIVE (dr-01): estado del alumno, notas y llamadas a DeepSeek.
   La IA va por POST /api/v1/live/{lección}/escenario con la clave de DeepSeek de la clase; el formato y las
   reglas salen del escenario.json de la escena que se nombra (el navegador solo manda el pedido y el mapa).
   El mapa del alumno vive en localStorage (mismo origen en todas las escenas de la lección). */
(function () {
  "use strict";
  try { // el LMS pasa su tema por ?tema=dark|light
    var tema = new URLSearchParams(location.search).get("tema");
    if (tema === "dark" || tema === "light") document.documentElement.setAttribute("data-tema", tema);
  } catch (e) { /* sin parámetros */ }
  var partes = location.pathname.split("/");
  var i = partes.indexOf("live");
  var LECCION = i >= 0 ? decodeURIComponent(partes[i + 1] || "") : "dr-01";
  var j = partes.indexOf("escenas");
  var ESCENA = j >= 0 ? decodeURIComponent(partes[j + 1] || "") : "";
  var CLAVE = "es-" + LECCION + "-v1";

  var TIPOS = {
    evento:   { k: "EVENTO",          c: "ev",  ayuda: "Lo que pasó, en pasado: «Venta registrada»" },
    comando:  { k: "COMANDO",         c: "cmd", ayuda: "Lo que alguien pide, en infinitivo: «Registrar venta»" },
    actor:    { k: "ACTOR",           c: "act", ayuda: "Quién decide o actúa: «Cajero»" },
    politica: { k: "POLÍTICA",        c: "pol", ayuda: "«Cada vez que X, entonces Y»" },
    hotspot:  { k: "HOTSPOT",         c: "hot", ayuda: "Una duda o un conflicto sin resolver" },
    externo:  { k: "SISTEMA EXTERNO", c: "ext", ayuda: "Lo que no controlamos: SUNAT, el banco" }
  };
  var ORDEN_TIPOS = ["evento", "comando", "actor", "politica", "hotspot", "externo"];

  function vacio() {
    return { negocio: "", proceso: "", pedido: "", preguntas: [], notas: [], ia: { propuestas: 0, aceptadas: 0, descartadas: 0 }, tramo: { desde: "", hasta: "", frase: "", propios: "" }, juego: {} };
  }
  function cargar() {
    try {
      var s = JSON.parse(localStorage.getItem(CLAVE) || "null");
      if (s && typeof s === "object") { var v = vacio(); for (var k in v) if (!(k in s)) s[k] = v[k]; return s; }
    } catch (e) { /* almacenamiento bloqueado o dañado: se empieza de cero */ }
    return vacio();
  }
  function guardar(s) { try { localStorage.setItem(CLAVE, JSON.stringify(s)); } catch (e) { /* sin almacenamiento */ } }

  function h(tag, attrs, hijos) {
    var el = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (attrs[k] == null || attrs[k] === false) continue;
      if (k === "text") el.textContent = attrs[k];
      else if (k === "class") el.className = attrs[k];
      else if (k.slice(0, 2) === "on") el.addEventListener(k.slice(2), attrs[k]);
      else el.setAttribute(k, attrs[k] === true ? "" : attrs[k]);
    }
    (hijos || []).forEach(function (x) { if (x != null) el.appendChild(typeof x === "string" ? document.createTextNode(x) : x); });
    return el;
  }

  var reEventoPasado = /(ad[oa]s?|id[oa]s?|[sc]h[oa]s?|t[oa]s?|s[oa]s?|ert[oa]s?)$/i;
  var reInfinitivo = /^(?:\S+?(ar|er|ir))(\b|$)/i;
  function avisoNota(n) {
    var t = (n.texto || "").trim();
    if (n.tipo === "evento") {
      var ultima = t.split(/\s+/).filter(function (w) { return reEventoPasado.test(w.replace(/[^\wáéíóúñ]/gi, "")); });
      if (!ultima.length) return "¿en pasado?";
      if (reInfinitivo.test(t) && !/(ad[oa]|id[oa])/i.test(t)) return "¿es un comando?";
    }
    if (n.tipo === "comando" && !reInfinitivo.test(t)) return "¿en infinitivo?";
    return "";
  }
  function nota(n, opts) {
    opts = opts || {};
    var tp = TIPOS[n.tipo] || TIPOS.evento;
    var av = opts.sinAviso ? "" : avisoNota(n);
    return h("button", { type: "button", class: "nota " + tp.c + (n.origen === "ia" ? " ia" : "") + (opts.sel ? " sel" : ""), "data-id": n.id || null, "aria-pressed": opts.pressed == null ? null : String(!!opts.pressed), onclick: opts.onclick || null, title: tp.ayuda },
      [h("span", { class: "k", text: tp.k }), h("span", { class: "t", text: n.texto }), av ? h("span", { class: "aviso", text: av }) : null]);
  }

  function api(ruta, cuerpo, metodo) {
    return fetch("/api/v1/live/" + encodeURIComponent(LECCION) + ruta, {
      method: metodo || (cuerpo ? "POST" : "GET"), credentials: "same-origin", cache: "no-store",
      headers: cuerpo ? { "Content-Type": "application/json" } : {}, body: cuerpo ? JSON.stringify(cuerpo) : undefined
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (b) { return { estado: r.status, b: b }; });
    }).catch(function () { return { estado: 0, b: {} }; });
  }

  // ia(escena, pedido, empresa, muestra) → {ok, tablas, titulo, msg}
  function ia(escena, pedido, empresa, muestra) {
    return api("/escenario", { escena: escena, pedido: pedido, empresa: empresa || {}, muestra: muestra || null }).then(function (x) {
      if (x.estado === 200 && x.b && x.b.escenario) {
        return { ok: true, tablas: x.b.escenario.tablas || {}, titulo: x.b.escenario.titulo || "" };
      }
      var m = (x.b && (x.b.message || (x.b.error && x.b.error.message) || x.b.error)) || "";
      var msg = x.estado === 429 ? "Llegaste al tope de hoy de la IA de la clase."
        : x.estado === 503 ? "La IA de la clase no está disponible ahora."
        : x.estado === 0 ? "Sin conexión con el LMS."
        : "DeepSeek no respondió bien" + (m ? " (" + m + ")" : "") + ".";
      return { ok: false, msg: msg, estado: x.estado };
    });
  }

  function empresa(s) {
    return { razon: (s.negocio || "Mi negocio").slice(0, 120), rubro: (s.proceso || "proceso sin nombre").slice(0, 120), regimen: "Event Storming" };
  }

  // El mapa como JSON para la IA: número, tipo y texto (cabe de sobra en 8 KB).
  function mapaParaIA(notas) {
    return notas.slice(0, 60).map(function (n, k) { return { n: k + 1, tipo: n.tipo, texto: (n.texto || "").slice(0, 80) }; });
  }

  function aTexto(s) {
    var out = ["# Mapa de Event Storming: " + (s.proceso || "mi proceso") + (s.negocio ? " · " + s.negocio : ""), ""];
    if (s.pedido) out.push("Pedido original: «" + s.pedido + "»", "");
    out.push("## Línea de tiempo");
    s.notas.forEach(function (n, k) { out.push((k + 1) + ". [" + (TIPOS[n.tipo] || TIPOS.evento).k + "] " + n.texto + (n.origen === "ia" ? " (sugerida por la IA)" : "")); });
    var t = s.tramo || {};
    var d = s.notas.filter(function (n) { return n.id === t.desde; })[0], a = s.notas.filter(function (n) { return n.id === t.hasta; })[0];
    if (d && a) out.push("", "## Tramo elegido", d.texto + " → " + a.texto, "Frase de impacto: «" + (t.frase || "") + "»");
    var ia = s.ia || {};
    if (ia.propuestas) out.push("", "## La IA en mi dominio", "Sugerencias aceptadas: " + ia.aceptadas + " de " + ia.propuestas + " (precisión " + fmt(ia.aceptadas / ia.propuestas) + ")");
    return out.join("\n");
  }

  function fmt(x) { return (isFinite(x) ? x : 0).toFixed(2).replace(".", ","); }

  function copiar(texto) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(texto).then(function () { return true; }, function () { return copiarViejo(texto); });
    return Promise.resolve(copiarViejo(texto));
  }
  function copiarViejo(texto) {
    var ta = h("textarea", { style: "position:fixed;left:-9999px" }); ta.value = texto; document.body.appendChild(ta); ta.select();
    var ok = false; try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    ta.remove(); return ok;
  }
  function descargar(nombre, texto) {
    var a = h("a", { href: URL.createObjectURL(new Blob([texto], { type: "text/markdown" })), download: nombre });
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  var toastEl = null, toastT = 0;
  function toast(msg) {
    if (!toastEl) { toastEl = h("div", { class: "toast", role: "status", "aria-live": "polite" }); document.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.classList.add("ver"); clearTimeout(toastT);
    toastT = setTimeout(function () { toastEl.classList.remove("ver"); }, 2600);
  }

  function evidencia(detalle) { return api("/evidencia", { escena: ESCENA, tipo: "hallazgo", detalle: String(detalle).slice(0, 200) }); }
  function muroPublicar(texto) { return api("/muro", { escena: ESCENA, texto: String(texto).slice(0, 200) }); }
  function muroLeer() { return api("/muro?escena=" + encodeURIComponent(ESCENA)).then(function (x) { return (x.b && x.b.entradas) || []; }); }

  function nuevoId() { return "n" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  window.ES = {
    LECCION: LECCION, ESCENA: ESCENA, TIPOS: TIPOS, ORDEN_TIPOS: ORDEN_TIPOS,
    cargar: cargar, guardar: guardar, h: h, nota: nota, avisoNota: avisoNota, api: api, ia: ia, empresa: empresa,
    mapaParaIA: mapaParaIA, aTexto: aTexto, fmt: fmt, copiar: copiar, descargar: descargar, toast: toast,
    evidencia: evidencia, muroPublicar: muroPublicar, muroLeer: muroLeer, nuevoId: nuevoId
  };
})();
