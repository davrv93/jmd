// tw.js · ayudantes de las escenas de «Tienda web con facturación electrónica» (script clásico, sin módulos).
//
//   <script src="../../comun/tw.js"></script>
//
// Todo pasa por los endpoints que ya tiene el LIVE (votos, muro, evidencia, carrera, /me). Si un endpoint no
// responde (escena abierta suelta o sin sesión), la escena sigue funcionando sola y no lanza errores.
//
// LO ÚNICO QUE CAMBIA ENTRE GRUPOS es TW.CURSO y TW.FECHAS (abajo). Las escenas leen de aquí el curso, el
// grupo, las fechas y la ruta de los videos: para abrir otro grupo basta copiar la carpeta y editar este bloque.
//
//   TW.leccion, TW.escena, TW.n      lección, escena y número de sesión (1, 2 o 3) sacados de la URL
//   TW.sesion                        {n, titulo, fecha} de la sesión actual
//   TW.pedir(ruta, cuerpo, metodo)   → Promise<{ok, status, datos}>; ruta relativa a /api/v1/live/<lección>
//   TW.yo()                          → Promise<{id, name, corto, staff} | null>
//   TW.leer(k, def) / TW.guardar(k, v)  localStorage con prefijo de la lección
//   TW.votos(raiz, {escena, opciones:[{id,t,e}], correcta})
//   TW.muro(raiz, {escena, placeholder, guardarEn})
//   TW.checklist(ul, clave, alCambiar)    <li data-id>; con ul.auto solo se marca desde código (TW.marcar)
//   TW.evidencia(tipo, detalle)      tipo: hallazgo | captura (cuenta para la compuerta de la escena)
//   TW.copiar(texto) → Promise<bool>
//   TW.video(raiz)                   video de la sesión con respaldo si falta
(function () {
  var TW = (window.TW = {});

  // ---------------- Configuración del grupo ----------------
  TW.CURSO = {
    id: "tienda-web-facturacion",
    nombre: "Tienda web con facturación electrónica",
    grupo: "Grupo 1",
    serie: "Curso 1 de 2",
    horario: "Lunes · 9:15 a 10:00 p. m. (hora de Lima)",
    whatsapp: "986 149 476",
    wa: "51986149476",
    sitio: "jmd-learn.online",
    // Tienda de ejemplo para abrir en el celular. Vacío = no se muestra el botón (el 08-11-2026 la demo de
    // Nodo Mayorista no respondía). Si vuelve, pon aquí su dirección completa (https://…).
    demo: ""
  };
  TW.FECHAS = { 1: "Lunes 16 de noviembre", 2: "Lunes 23 de noviembre", 3: "Lunes 30 de noviembre" };
  TW.TITULOS = { 1: "Tu tienda y tu catálogo", 2: "Pedidos y pagos por WhatsApp", 3: "Facturación, cuentas y reportes" };

  // ---------------- Lección y escena ----------------
  var m = location.pathname.match(/\/live\/([^/]+)\/escenas\/([^/]+)\//) || location.pathname.match(/\/live\/([^/]+)\/([^/]+)\/escena\.html/);
  TW.leccion = (m && m[1]) || "tw-01";
  TW.escena = (m && m[2]) || "";
  if (!/^[a-z0-9-]+$/.test(TW.leccion)) TW.leccion = "tw-01";
  TW.n = +(TW.leccion.match(/(\d)$/) || [0, 1])[1] || 1;
  TW.sesion = { n: TW.n, titulo: TW.TITULOS[TW.n] || "", fecha: TW.FECHAS[TW.n] || "" };
  TW.base = "/api/v1/live/" + TW.leccion;

  // ---------------- Red ----------------
  TW.pedir = function (ruta, cuerpo, metodo) {
    var url = ruta.indexOf("/api/") === 0 ? ruta : TW.base + ruta;
    var op = { method: metodo || (cuerpo ? "POST" : "GET"), credentials: "same-origin", cache: "no-store", headers: {} };
    if (cuerpo) { op.headers["Content-Type"] = "application/json"; op.body = JSON.stringify(cuerpo); }
    try {
      return fetch(url, op).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok, status: r.status, datos: d || {} }; });
      }).catch(function () { return { ok: false, status: 0, datos: {} }; });
    } catch (e) { return Promise.resolve({ ok: false, status: 0, datos: {} }); }
  };

  TW.corto = function (nombre) {
    var p = String(nombre || "").trim().split(/\s+/).filter(Boolean);
    if (!p.length) return "";
    return p.length > 1 ? p[0] + " " + p[1].charAt(0).toUpperCase() + "." : p[0];
  };
  var yoP = null;
  TW.yo = function () {
    if (!yoP) yoP = TW.pedir("/api/v1/me").then(function (r) {
      if (!r.ok || !r.datos || !r.datos.id) return null;
      var roles = r.datos.roles || [];
      return { id: r.datos.id, name: r.datos.name || "", corto: TW.corto(r.datos.name), staff: roles.indexOf("admin") >= 0 || roles.indexOf("instructor") >= 0 || roles.indexOf("staff") >= 0 };
    });
    return yoP;
  };

  TW.leer = function (k, def) {
    try { var v = localStorage.getItem(TW.leccion + "-" + k); return v == null ? def : JSON.parse(v); } catch (e) { return def; }
  };
  TW.guardar = function (k, v) { try { localStorage.setItem(TW.leccion + "-" + k, JSON.stringify(v)); } catch (e) {} };

  TW.evidencia = function (tipo, detalle) {
    if (!TW.escena) return Promise.resolve({ ok: false });
    return TW.pedir("/evidencia", { escena: TW.escena, tipo: tipo || "hallazgo", detalle: String(detalle || "").slice(0, 200) });
  };

  TW.copiar = function (texto) {
    if (window.copiarTexto) return window.copiarTexto(texto);
    try { return navigator.clipboard.writeText(texto).then(function () { return true; }, function () { return false; }); }
    catch (e) { return Promise.resolve(false); }
  };
  TW.botonCopiar = function (btn, textoFn) {
    var orig = btn.textContent;
    btn.addEventListener("click", function () {
      TW.copiar(textoFn()).then(function (ok) {
        btn.textContent = ok ? "✓ Copiado" : "No pude copiar";
        btn.classList.toggle("ok", !!ok);
        setTimeout(function () { btn.textContent = orig; btn.classList.remove("ok"); }, 2200);
      });
    });
  };

  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  TW.el = el;
  TW.$ = function (s, r) { return (r || document).querySelector(s); };
  TW.$$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  TW.soles = function (n) {
    var v = Math.round((+n || 0) * 100) / 100;
    var partes = v.toFixed(2).split(".");
    return "S/ " + partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ") + "." + partes[1];
  };

  // ---------------- Votación ----------------
  TW.votos = function (raiz, op) {
    var escena = op.escena || TW.escena, botones = {}, estado = el("p", "tw-estado");
    var caja = el("div", "tw-votos");
    op.opciones.forEach(function (o) {
      var b = el("button", "tw-voto"); b.type = "button"; b.setAttribute("aria-pressed", "false");
      b.appendChild(el("i", "barra")); b.appendChild(el("span", "e", o.e || "")); b.appendChild(el("span", "t", o.t)); b.appendChild(el("b", "pct", ""));
      b.addEventListener("click", function () { votar(o.id); });
      botones[o.id] = b; caja.appendChild(b);
    });
    raiz.appendChild(caja); raiz.appendChild(estado);
    var mia = TW.leer("voto-" + escena, "");
    function pintar(c) {
      var tot = c && +c.total > 0 ? +c.total : 0;
      if (c && c.mia) mia = c.mia;
      Object.keys(botones).forEach(function (id) {
        var b = botones[id], n = tot ? (+(c.opciones || {})[id] || 0) : 0, p = tot ? Math.round(n / tot * 100) : 0;
        b.style.setProperty("--p", p + "%");
        b.querySelector(".pct").textContent = tot ? p + " %" : "";
        b.classList.toggle("mia", id === mia);
        b.setAttribute("aria-pressed", id === mia ? "true" : "false");
        if (op.correcta) b.classList.toggle("bien", !!mia && id === op.correcta);
      });
      estado.textContent = tot ? "Así va el grupo: " + tot + (tot === 1 ? " voto." : " votos.") : (mia ? "Tu voto quedó anotado." : "Toca una opción para votar.");
    }
    function votar(id) {
      mia = id; TW.guardar("voto-" + escena, id); pintar(null);
      TW.pedir("/voto", { escena: escena, opcion: id }).then(function (r) { if (r.ok) pintar(r.datos); if (op.alVotar) op.alVotar(id); });
    }
    function traer() { TW.pedir("/votos?escena=" + escena).then(function (r) { if (r.ok) pintar(r.datos); }); }
    pintar(null); traer(); setInterval(traer, 4000);
    return { votar: votar };
  };

  // ---------------- Muro ----------------
  TW.muro = function (raiz, op) {
    op = op || {};
    var escena = op.escena || TW.escena;
    var form = el("div", "tw-muro-form");
    var inp = el("input", "tw-in"); inp.maxLength = 160; inp.autocomplete = "off"; inp.placeholder = op.placeholder || "Escribe aquí…";
    inp.setAttribute("aria-label", op.etiqueta || inp.placeholder);
    var btn = el("button", "tw-btn peq", "Publicar"); btn.type = "button";
    form.appendChild(inp); form.appendChild(btn);
    var lista = el("ul", "tw-muro-lista"); lista.setAttribute("aria-live", "polite");
    raiz.appendChild(form); raiz.appendChild(lista);
    inp.value = TW.leer("muro-" + escena, "");
    function pintar(j) {
      var en = j && Array.isArray(j.entradas) ? j.entradas : null;
      lista.textContent = "";
      if (!en) { var l0 = el("li", "vacio", "El muro aparece cuando la clase está en vivo."); lista.appendChild(l0); return; }
      if (!en.length) { lista.appendChild(el("li", "vacio", "Aún nadie publicó. Sé la primera persona.")); return; }
      en.forEach(function (e) {
        var li = el("li", e.mia ? "mia" : "");
        li.appendChild(el("b", "", e.mia ? "Tú" : (e.nombre || "alguien")));
        li.appendChild(el("span", "", e.texto || ""));
        lista.appendChild(li);
      });
    }
    function traer() { TW.pedir("/muro?escena=" + escena).then(function (r) { pintar(r.ok ? r.datos : null); }); }
    function publicar(texto) {
      texto = String(texto == null ? inp.value : texto).replace(/\s+/g, " ").trim().slice(0, 160);
      TW.guardar("muro-" + escena, texto);
      if (op.alPublicar) op.alPublicar(texto);
      return TW.pedir("/muro", { escena: escena, texto: texto }).then(function (r) {
        if (r.ok) pintar(r.datos);
        btn.textContent = r.ok ? (texto ? "Publicado" : "Borrado") : "Guardado aquí";
        setTimeout(function () { btn.textContent = "Publicar"; }, 1600);
        return r.ok;
      });
    }
    btn.addEventListener("click", function () { publicar(); });
    inp.addEventListener("keydown", function (ev) { if (ev.key === "Enter") { ev.preventDefault(); publicar(); } });
    traer(); setInterval(traer, 5000);
    return { publicar: publicar, input: inp, texto: function () { return inp.value.trim(); } };
  };

  // ---------------- Checklist ----------------
  TW.checklist = function (ul, clave, alCambiar) {
    var hechos = TW.leer("check-" + clave, {});
    var auto = ul.classList.contains("auto");
    function pintar() {
      var n = 0, items = TW.$$("li[data-id]", ul);
      items.forEach(function (li) { var h = !!hechos[li.getAttribute("data-id")]; li.classList.toggle("hecho", h); li.setAttribute("aria-checked", h ? "true" : "false"); if (h) n++; });
      if (alCambiar) alCambiar(n, items.length);
    }
    TW.$$("li[data-id]", ul).forEach(function (li) {
      li.setAttribute("role", "checkbox"); li.tabIndex = auto ? -1 : 0;
      if (auto) return;
      function t() { var id = li.getAttribute("data-id"); hechos[id] = !hechos[id]; TW.guardar("check-" + clave, hechos); pintar(); }
      li.addEventListener("click", t);
      li.addEventListener("keydown", function (e) { if (e.key === " " || e.key === "Enter") { e.preventDefault(); t(); } });
    });
    pintar();
    return { marcar: function (id) { if (!hechos[id]) { hechos[id] = true; TW.guardar("check-" + clave, hechos); pintar(); } }, hechos: hechos };
  };

  // ---------------- Video de la sesión ----------------
  // Lo hace otro equipo: /files/<curso>/materials/video-tw-0N.mp4. Mientras no exista, el material es un marcador
  // de 1 segundo (el LMS exige que el archivo declarado exista): un video de menos de 3 s cuenta como «aún no está».
  TW.video = function (raiz) {
    var v = raiz.querySelector("video"), resp = raiz.querySelector(".tw-respaldo"), est = document.getElementById("video-estado");
    var src = "/files/" + TW.CURSO.id + "/materials/video-tw-0" + TW.n + ".mp4";
    var listo = false;
    function respaldo() { listo = true; if (resp) resp.hidden = false; v.hidden = true; if (est) est.textContent = "El video aún no está publicado: el instructor lo cuenta en vivo con estas tres ideas."; }
    v.addEventListener("error", respaldo);
    v.addEventListener("loadedmetadata", function () {
      if (!(v.duration >= 3)) { respaldo(); return; }
      listo = true;
      if (est) est.textContent = "Dura " + Math.round(v.duration) + " s. Dale play cuando el instructor lo indique.";
    });
    v.src = src;
    setTimeout(function () { if (!listo && est) est.textContent = "Cargando el video…"; }, 4000);
    if (location.protocol === "file:") respaldo();
  };

  // ---------------- Textos del grupo (data-tw) ----------------
  TW.rellenar = function () {
    var mapa = {
      curso: TW.CURSO.nombre, grupo: TW.CURSO.grupo, serie: TW.CURSO.serie, horario: TW.CURSO.horario,
      whatsapp: TW.CURSO.whatsapp, sitio: TW.CURSO.sitio, sesion: "Sesión " + TW.n, titulo: TW.sesion.titulo, fecha: TW.sesion.fecha,
      fecha1: TW.FECHAS[1], fecha2: TW.FECHAS[2], fecha3: TW.FECHAS[3], titulo1: TW.TITULOS[1], titulo2: TW.TITULOS[2], titulo3: TW.TITULOS[3],
      siguiente: TW.FECHAS[TW.n + 1] || "", "titulo-siguiente": TW.TITULOS[TW.n + 1] || ""
    };
    TW.$$("[data-tw]").forEach(function (e) { var k = e.getAttribute("data-tw"); if (mapa[k] != null) e.textContent = mapa[k]; });
  };

  // ---------------- QR (si la escena cargó qrcode.js) ----------------
  TW.qr = function (cont, texto) {
    if (!window.qrcode || !cont) return;
    try { var q = window.qrcode(0, "M"); q.addData(texto); q.make(); cont.innerHTML = q.createSvgTag({ cellSize: 4, margin: 0, scalable: true }); } catch (e) {}
  };

  // ---------------- Cielo de fondo (el de la plantilla del LIVE) ----------------
  TW.cielo = function () {
    if (document.querySelector(".esc-cielo")) return;
    var NS = "http://www.w3.org/2000/svg";
    var s = document.createElementNS(NS, "svg");
    s.setAttribute("class", "esc-cielo"); s.setAttribute("viewBox", "0 0 1600 900"); s.setAttribute("preserveAspectRatio", "xMidYMid slice"); s.setAttribute("aria-hidden", "true");
    var trazos = [["t", "M1180 92 L1252 130 L1318 104 L1384 168 L1440 146"], ["t", "M92 612 L168 560 L236 598 L296 524"], ["tb", "M1010 760 L1086 708 L1162 744 L1230 690 L1300 722"]];
    trazos.forEach(function (t) { var p = document.createElementNS(NS, "path"); p.setAttribute("class", t[0]); p.setAttribute("pathLength", "1"); p.setAttribute("d", t[1]); s.appendChild(p); });
    var pts = [[1180, 92, "e", 4], [1252, 130, "eo", 5], [1318, 104, "e", 3.5], [1384, 168, "eg", 4], [1440, 146, "e", 3], [92, 612, "e", 3.5], [168, 560, "eg", 4.5], [236, 598, "e", 3], [296, 524, "eo", 5],
      [1010, 760, "e", 3.5], [1086, 708, "eg", 4], [1162, 744, "e", 3], [1230, 690, "eo", 4.5], [1300, 722, "e", 3.5], [320, 140, "e p", 1.8], [520, 80, "eg p", 1.6], [700, 190, "e p", 1.8], [860, 70, "eo p", 1.7],
      [1500, 300, "eg p", 1.8], [1540, 470, "e p", 1.6], [1440, 620, "eo p", 1.8], [760, 840, "eg p", 1.6], [560, 760, "e p", 1.8], [40, 380, "eo p", 1.6], [150, 260, "e p", 1.7], [1210, 400, "e p", 1.6]];
    pts.forEach(function (q, i) { var c = document.createElementNS(NS, "circle"); c.setAttribute("class", q[2]); c.setAttribute("cx", q[0]); c.setAttribute("cy", q[1]); c.setAttribute("r", q[3]); c.style.setProperty("--p", (i * 0.37 % 4).toFixed(2) + "s"); s.appendChild(c); });
    document.body.insertBefore(s, document.body.firstChild);
  };

  // Tema: ?tema=dark|light fuerza el tema del LMS; si no, manda el del sistema.
  try {
    var t = new URLSearchParams(location.search).get("tema");
    if (t === "dark" || t === "light") document.documentElement.setAttribute("data-tema", t);
  } catch (e) {}

  function alListo() { TW.cielo(); TW.rellenar(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", alListo); else alListo();
})();
