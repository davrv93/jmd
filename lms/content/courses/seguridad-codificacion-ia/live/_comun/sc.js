// sc.js · kit de las escenas LIVE de «Seguridad en codificación con IA» (sc-01 en adelante). Script clásico, sin módulos:
//   <link rel="stylesheet" href="../../comun/escena.css">
//   <link rel="stylesheet" href="../../comun/sc.css">
//   <script src="../../comun/sc.js"></script>            (al final del body)
//
// Viene de di.js (Diseño de interfaces) y se monta solo sobre el mismo marcado:
//   <div class="k-caja k-voto" data-voto="sc01-algo" [data-correcta="b"] [data-explica="…"]>
//      <p class="k-q">Pregunta</p><div class="k-ops"><button type="button" data-op="a">…</button>…</div></div>
//   <div class="k-caja k-muro" data-muro="sc01-algo" data-pregunta="…" [data-placeholder="…"]></div>
//   <ul class="k-check" data-check="sc01-algo"><li><label><input type="checkbox"><span></span><em>…</em></label></li>…</ul>
//   <button type="button" class="k-btn" data-copiar-texto="…">Copiar</button>     → portapapeles
//   <button type="button" class="k-btn" data-copiar-de="#id">Copiar</button>      → copia el texto de ese elemento
//   <div class="k-seg" data-seg="nombre"><button data-v="a" aria-pressed="true">…</button>…</div> → evento «k-seg»
//
// Lo propio del curso, en window.SC:
//   OWASP        → las diez categorías del OWASP Top 10:2025 (código, nombre oficial en inglés, explicación en español)
//   cat(codigo)  → una categoría; etiqueta(codigo, cwe) → el chip «A05 Injection · CWE-89»
//   esc(texto)   → texto escapado para pintarlo con innerHTML; el(tag, clase, texto) → un elemento
//
// Curso DEFENSIVO: ninguna escena ejecuta lo que escribe el alumno ni llama a un sistema de fuera. Los «ataques» son
// simulaciones en JavaScript sobre datos inventados que viven en la propia página.
// Votos y muro viven en la memoria del LIVE. Si la API no responde, la escena sigue en local.
(function () {
  "use strict";
  var M = location.pathname.match(/\/live\/([^/]+)\/escenas\/([^/]+)\//) || [];
  var LECCION = M[1] || "sc-01";
  var ESCENA = M[2] || "";
  var BASE = "/api/v1/live/" + encodeURIComponent(LECCION);
  var PFX = "sc01-";

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
  function esc(t) { return String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;"); }
  function el(tag, clase, texto) { var e = document.createElement(tag); if (clase) e.className = clase; if (texto != null) e.textContent = texto; if (tag === "button") e.type = "button"; return e; }
  // Lleva un elemento a la vista solo si hace falta (en el celular la ficha queda debajo del código).
  function aLaVista(e) {
    try {
      var r = e.getBoundingClientRect(), alto = window.innerHeight || document.documentElement.clientHeight;
      if (r.top < 0 || r.bottom > alto) e.scrollIntoView({ block: "nearest", behavior: QUIETO ? "auto" : "smooth" });
    } catch (x) {}
  }

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
    var p; // (di.js creaba aquí un Promise.reject() suelto: sin copiar.js quedaba como rechazo sin atender)
    try { p = navigator.clipboard.writeText(texto); } catch (e) { p = Promise.reject(e); }
    return p.then(function () { return true; }).catch(function () {
      try {
        var a = document.createElement("textarea"); a.value = texto; a.setAttribute("readonly", "");
        a.style.cssText = "position:fixed;top:0;left:0;opacity:0"; document.body.appendChild(a); a.select();
        var ok = document.execCommand("copy"); a.remove(); return !!ok;
      } catch (e) { return false; }
    });
  }

  function evidencia(tipo, detalle) { return pedir("/evidencia", { escena: ESCENA, tipo: tipo, detalle: String(detalle || "").slice(0, 200) }); }

  // ---------- OWASP Top 10:2025 ----------
  // Nombre oficial en inglés y explicación en español. Los CWE de ejemplo salen de la «List of Mapped CWEs» de cada
  // página de categoría de owasp.org/Top10/2025 (comprobados el 18-11-2026). hoy: las cuatro que se ven de cerca.
  var OWASP = [
    { id: "A01", n: "Broken Access Control", es: "Control de acceso roto", corto: "Acceso", hoy: true,
      que: "El sistema no comprueba que quien pide algo tenga permiso para verlo o cambiarlo. Desde 2025 también incluye SSRF (que el servidor haga peticiones a donde le diga el usuario).",
      ia: "Una ruta que busca el pedido por su número y lo devuelve, sin mirar de quién es. O un panel de administración que solo pide haber iniciado sesión.",
      pregunta: "¿Cada ruta comprueba que esto es tuyo, y no solo que iniciaste sesión?", cwe: ["CWE-639", "CWE-862", "CWE-918"] },
    { id: "A02", n: "Security Misconfiguration", es: "Configuración insegura", corto: "Configuración",
      que: "El código puede estar bien, pero quedó mal configurado: el modo de depuración encendido, cuentas y claves por defecto, cookies sin protección, cabeceras de seguridad que faltan.",
      ia: "La cookie de sesión creada sin HttpOnly ni Secure, o el proyecto de ejemplo que se publica tal cual, con todo en modo desarrollo.",
      pregunta: "¿Qué quedó con el valor de desarrollo o con el valor por defecto?", cwe: ["CWE-1004", "CWE-614", "CWE-489"] },
    { id: "A03", n: "Software Supply Chain Failures", es: "Fallos en la cadena de suministro", corto: "Dependencias",
      que: "El fallo llega con lo que instalas o con lo que usas para construir y publicar: paquetes vulnerables o sin mantenimiento, herramientas y procesos de despliegue comprometidos. Amplía la categoría de 2021 sobre componentes desactualizados.",
      ia: "El asistente añade un paquete que no conoces, o fija una versión vieja porque así estaba en sus ejemplos. Lo vemos en la sesión 3.",
      pregunta: "¿Qué paquetes añadió la IA, quién los mantiene y en qué versión están?", cwe: ["CWE-1104", "CWE-1395"] },
    { id: "A04", n: "Cryptographic Failures", es: "Fallos criptográficos", corto: "Criptografía",
      que: "Datos sensibles sin cifrar, o protegidos con algo débil: contraseñas guardadas con MD5, llaves de cifrado escritas en el código, datos que viajan en claro.",
      ia: "md5($clave) para guardar la contraseña, porque es lo que más aparece en los tutoriales viejos.",
      pregunta: "¿Con qué se guardan las contraseñas y por dónde viajan los datos sensibles?", cwe: ["CWE-916", "CWE-327", "CWE-321"] },
    { id: "A05", n: "Injection", es: "Inyección", corto: "Inyección", hoy: true,
      que: "El texto que escribe el usuario llega a un intérprete (la base de datos, el navegador, la terminal) y este lo ejecuta como si fuera una orden. Aquí viven la inyección SQL y el XSS.",
      ia: "Una consulta armada pegando variables dentro del texto del SQL, o un comentario pintado en la página con innerHTML.",
      pregunta: "¿Algún texto del usuario se pega dentro de una consulta, de una orden o del HTML?", cwe: ["CWE-89", "CWE-79", "CWE-78"] },
    { id: "A06", n: "Insecure Design", es: "Diseño inseguro", corto: "Diseño",
      que: "El control nunca se pensó. No es un error al escribir el código: falta la defensa desde el diseño, y la mejor implementación no la reemplaza.",
      ia: "El precio o el descuento se validan solo en el navegador, y el servidor acepta lo que le llegue.",
      pregunta: "¿Qué pasa si alguien se salta la pantalla y le habla directo al servidor?", cwe: ["CWE-602", "CWE-434", "CWE-256"] },
    { id: "A07", n: "Authentication Failures", es: "Fallos de autenticación", corto: "Autenticación", hoy: true,
      que: "El sistema acepta como legítimo a quien no lo es: intentos sin límite, contraseñas débiles o por defecto, sesiones que no caducan y credenciales escritas dentro del código.",
      ia: "La clave de la API o de la base de datos en una constante del archivo, lista para subir al repositorio.",
      pregunta: "¿Hay claves, contraseñas o tokens escritos en el código? ¿Quién limita los intentos?", cwe: ["CWE-798", "CWE-307", "CWE-521"] },
    { id: "A08", n: "Software or Data Integrity Failures", es: "Fallos de integridad del software o de los datos", corto: "Integridad",
      que: "Se da por bueno un código o un dato sin verificar que nadie lo alteró: actualizaciones sin firma, módulos traídos de un origen que no controlas, datos serializados que el usuario puede modificar.",
      ia: "Guardar el estado del usuario en una cookie que el servidor luego lee y cree sin comprobarla. Lo vemos en la sesión 2.",
      pregunta: "¿Qué código o qué datos estoy creyendo sin comprobar su origen?", cwe: ["CWE-502", "CWE-494", "CWE-829"] },
    { id: "A09", n: "Security Logging and Alerting Failures", es: "Fallos de registro y alerta", corto: "Registro",
      que: "No queda registro de lo que importa (como los inicios de sesión fallidos), nadie recibe una alerta, o el registro guarda lo que no debe: contraseñas y datos personales.",
      ia: "Un console.log con el usuario y su contraseña «para depurar», que se queda para siempre.",
      pregunta: "Si alguien prueba mil contraseñas esta noche, ¿me entero? ¿Y qué quedó escrito en el registro?", cwe: ["CWE-778", "CWE-532", "CWE-117"] },
    { id: "A10", n: "Mishandling of Exceptional Conditions", es: "Mal manejo de condiciones excepcionales", corto: "Errores", hoy: true,
      que: "Categoría nueva en 2025. El programa no prevé lo inesperado: errores que muestran rutas, consultas y versiones, excepciones que nadie atrapa, o fallar «abierto» (dejar pasar cuando algo sale mal).",
      ia: "Un catch que le envía al usuario el mensaje completo del error, con la traza incluida.",
      pregunta: "¿Qué ve el usuario cuando algo falla? ¿Y qué hace el sistema: cierra o deja pasar?", cwe: ["CWE-209", "CWE-248", "CWE-636"] },
  ];
  function cat(id) { for (var i = 0; i < OWASP.length; i++) if (OWASP[i].id === id) return OWASP[i]; return null; }
  // etiqueta("A05", "CWE-89") → <span class="sc-tags"><span class="sc-tag"><b>A05</b> Injection</span><span class="sc-tag cwe">CWE-89</span></span>
  function etiqueta(id, cwe) {
    var c = cat(id), caja = el("span", "sc-tags"), t = el("span", "sc-tag");
    t.appendChild(el("b", "", id)); t.appendChild(document.createTextNode(c ? c.n : ""));
    caja.appendChild(t);
    if (cwe) caja.appendChild(el("span", "sc-tag cwe", cwe));
    return caja;
  }
  // opciones(ids, alElegir) → <div class="sc-ops"> con un botón por categoría («A05 Inyección»)
  function opciones(ids, alElegir) {
    var caja = el("div", "sc-ops");
    caja.setAttribute("role", "group"); caja.setAttribute("aria-label", "Categorías del OWASP Top 10");
    ids.forEach(function (id) {
      var c = cat(id), b = el("button");
      b.appendChild(el("b", "", id)); b.appendChild(document.createTextNode(c.corto));
      b.setAttribute("data-cat", id); b.title = c.n + " · " + c.es;
      b.addEventListener("click", function () { alElegir(id, b, caja); });
      caja.appendChild(b);
    });
    return caja;
  }

  // ---------- votación ----------
  function montarVoto(caja) {
    if (caja.getAttribute("data-k") === "1") return; caja.setAttribute("data-k", "1");
    var clave = caja.getAttribute("data-voto"), correcta = caja.getAttribute("data-correcta") || "";
    var botones = $$("button[data-op]", caja);
    botones.forEach(function (b) {
      var t = b.textContent.trim(); b.textContent = "";
      var s1 = el("span", "b"), s2 = el("span", "t", t), s3 = el("span", "n");
      b.appendChild(s1); b.appendChild(s2); b.appendChild(s3); b.type = "button";
      b.setAttribute("aria-pressed", "false");
      if (correcta && b.getAttribute("data-op") === correcta) b.classList.add("bien");
    });
    var pie = $(".k-pie", caja); if (!pie) { pie = el("p", "k-pie"); caja.appendChild(pie); }
    var explica = null;
    if (caja.getAttribute("data-explica")) { explica = el("p", "k-explica", caja.getAttribute("data-explica")); explica.hidden = true; caja.insertBefore(explica, pie); }
    var local = { total: 0, opciones: {}, mia: leer("voto-" + clave, "") };
    function pintar(c) {
      c = c || local; var total = c.total || 0;
      botones.forEach(function (b) {
        var op = b.getAttribute("data-op"), n = (c.opciones && c.opciones[op]) || 0, pct = total ? Math.round(n * 100 / total) : 0;
        $(".b", b).style.width = (c.mia ? pct : 0) + "%";
        $(".n", b).textContent = c.mia && total ? pct + " %" : "";
        b.setAttribute("aria-pressed", String(c.mia === op));
      });
      if (c.mia) { if (correcta) caja.classList.add("revela"); if (explica) explica.hidden = false; }
      pie.textContent = !c.mia ? (total ? "Vota para ver lo que eligió el grupo · " + total + (total === 1 ? " voto" : " votos") : "Toca una opción: el grupo ve el resultado al instante")
        : (total ? total + (total === 1 ? " voto del grupo" : " votos del grupo") + " · puedes cambiar el tuyo" : "Tu voto quedó guardado en esta pantalla");
      caja.dispatchEvent(new CustomEvent("k-pintado", { detail: { clave: clave, datos: c }, bubbles: false }));
    }
    botones.forEach(function (b) {
      b.addEventListener("click", function () {
        var op = b.getAttribute("data-op");
        local.mia = op; guardar("voto-" + clave, op);
        if (!local.total) { local.total = 1; local.opciones = {}; local.opciones[op] = 1; }
        pintar(local);
        pedir("/voto", { escena: clave, opcion: op }).then(function (r) { if (r.ok && r.datos && typeof r.datos.total === "number") { local = r.datos; pintar(local); } });
        caja.dispatchEvent(new CustomEvent("k-voto", { detail: { clave: clave, opcion: op }, bubbles: true }));
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
  function votar(clave, opcion) { return pedir("/voto", { escena: clave, opcion: opcion }); }

  // ---------- muro ----------
  function montarMuro(caja) {
    if (caja.getAttribute("data-k") === "1") return; caja.setAttribute("data-k", "1");
    var clave = caja.getAttribute("data-muro"), uid = "m-" + clave;
    var q = el("label", "k-q", caja.getAttribute("data-pregunta") || "Escribe una línea"); q.setAttribute("for", uid);
    if (caja.getAttribute("data-color")) q.style.setProperty("--c", caja.getAttribute("data-color"));
    var fila = el("div", "k-fila");
    var inp = el("input"); inp.id = uid; inp.type = "text"; inp.maxLength = +(caja.getAttribute("data-max-largo") || 160); inp.autocomplete = "off"; inp.enterKeyHint = "send";
    inp.placeholder = caja.getAttribute("data-placeholder") || "Una línea, con tus palabras";
    var btn = el("button", "k-btn", "Publicar");
    fila.appendChild(inp); fila.appendChild(btn);
    var lista = el("ul", "k-lista"); lista.setAttribute("aria-live", "polite");
    var pie = el("p", "k-pie");
    caja.appendChild(q); caja.appendChild(fila); caja.appendChild(lista); caja.appendChild(pie);
    inp.value = leer("muro-" + clave, "");
    var ultimas = [], clavePintada = null;
    function pintar(entradas) {
      if (entradas) ultimas = entradas;
      var k = JSON.stringify(ultimas.map(function (e) { return [e.nombre, e.texto, e.mia]; }));
      if (k === clavePintada) return;
      clavePintada = k;
      lista.textContent = "";
      var max = +(caja.getAttribute("data-max") || 6);
      ultimas.slice(0, max).forEach(function (e) {
        var li = el("li", e.mia ? "mia" : "");
        li.appendChild(el("b", "", e.mia ? "Tú" : (e.nombre || "alguien"))); li.appendChild(document.createTextNode(e.texto)); lista.appendChild(li);
      });
      if (!ultimas.length) { var v = el("li", "k-vacio", "Aún nadie escribe. Abre tú el muro."); v.style.background = "none"; lista.appendChild(v); }
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
        caja.dispatchEvent(new CustomEvent("k-muro", { detail: { clave: clave, texto: t }, bubbles: true }));
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
    var av = el("div", "k-avance"), barra = el("i"), txt = el("span");
    av.appendChild(barra); av.appendChild(txt);
    var listo = el("p", "k-listo", ul.getAttribute("data-listo") || "Listo. Pulsa «Lo logré» en el panel de la clase."); listo.hidden = true;
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

  // ---------- pestañas ----------
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
  }

  // ---------- montaje automático ----------
  function montar(raiz) {
    $$("[data-voto]", raiz).forEach(montarVoto);
    $$("[data-muro]", raiz).forEach(montarMuro);
    $$("[data-check]", raiz).forEach(montarCheck);
    montarControles(raiz);
  }
  document.addEventListener("click", function (e) {
    var t = e.target && e.target.closest ? e.target.closest("[data-copiar-texto],[data-copiar-de]") : null;
    if (!t) return;
    var texto = t.getAttribute("data-copiar-texto");
    if (texto === null) { var origen = $(t.getAttribute("data-copiar-de")); texto = origen ? (origen.value != null && origen.tagName !== "PRE" ? origen.value : origen.textContent) : ""; }
    copiar(texto).then(function (ok) {
      var antes = t.getAttribute("data-txt") || t.textContent; t.setAttribute("data-txt", antes);
      t.textContent = ok ? "✓ Copiado" : "No pude copiar"; t.classList.toggle("ok", !!ok);
      setTimeout(function () { t.textContent = antes; t.classList.remove("ok"); }, 2200);
    });
  });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { montar(); });
  else montar();

  window.SC = {
    leccion: LECCION, escena: ESCENA, quieto: QUIETO,
    $: $, $$: $$, el: el, esc: esc, aLaVista: aLaVista,
    pedir: pedir, toast: toast, copiar: copiar, evidencia: evidencia, leer: leer, guardar: guardar, votar: votar, montar: montar,
    OWASP: OWASP, cat: cat, etiqueta: etiqueta, opciones: opciones,
  };
})();
