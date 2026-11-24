/* Marcar cursos y canjearlos con un código (JMD Learning · /cursos/).
   Las casillas llevan data-cohorte y data-nombre. La selección se guarda en este navegador.
   Backend: /inscripcion-web/api/codigo/validar y /inscripcion-web/api/codigo/canje (mismo origen). */
(function () {
  "use strict";
  var CLAVE = "jmd-cursos-marcados";
  var API = "/inscripcion-web/api/codigo/";
  var MENSAJES = {
    codigo_invalido: "Ese código no existe. Revísalo y vuelve a intentarlo.",
    codigo_agotado: "Ese código ya se usó todas las veces que permitía.",
    codigo_vencido: "Ese código ya venció.",
    demasiados_cursos: "Marcaste más cursos de los que permite tu código.",
    curso_no_permitido: "Tu código no incluye uno de los cursos marcados.",
    datos: "Revisa tus datos: nombre, correo y celular.",
    curso_no_disponible: "Uno de los cursos marcados ya no está disponible.",
    servicio: "El aula no respondió. Inténtalo en unos minutos.",
    limite: "Hiciste muchos intentos seguidos. Espera unos minutos y vuelve a probar."
  };

  function leer() {
    try { var v = JSON.parse(localStorage.getItem(CLAVE) || "[]"); return Array.isArray(v) ? v : []; }
    catch (e) { return []; }
  }
  function guardar(v) { try { localStorage.setItem(CLAVE, JSON.stringify(v)); } catch (e) { /* sin almacenamiento: sigue en memoria */ } }

  var marcados = leer(); // [{c: cohorte, n: nombre}]
  var permitidas = null, maximo = null;

  var css = document.createElement("style");
  css.textContent =
    ".marcar{display:inline-flex;align-items:center;gap:8px;cursor:pointer;font-weight:700;font-size:14px;padding:8px 12px;border:1px solid var(--linea);border-radius:99px;user-select:none;min-height:40px}" +
    ".marcar input{width:18px;height:18px;accent-color:var(--acento);margin:0}" +
    ".marcar:has(input:checked){background:var(--acento);color:#140d08;border-color:var(--acento)}" +
    ".marcar:focus-within{outline:3px solid #fff;outline-offset:2px}" +
    ".grupo .marcar{margin-top:10px}" +
    "#mc-barra{position:fixed;left:0;right:0;bottom:0;z-index:40;display:none;justify-content:center;padding:12px 16px calc(12px + env(safe-area-inset-bottom));background:rgba(15,12,10,.94);border-top:1px solid #33291f;backdrop-filter:blur(8px)}" +
    "#mc-barra.on{display:flex}" +
    "#mc-barra .in{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;width:100%;max-width:1000px}" +
    "#mc-barra b{font-size:16px}" +
    "#mc-barra button,.mc-btn{font:inherit;font-weight:800;font-size:16px;border:0;border-radius:12px;padding:12px 18px;cursor:pointer;background:#f3c45a;color:#140d08;min-height:44px}" +
    ".mc-btn.sec{background:transparent;color:#fbf5ec;border:1px solid #33291f}" +
    "body.mc-con-barra{padding-bottom:84px}" +
    "#mc-velo{position:fixed;inset:0;z-index:50;display:none;align-items:flex-end;justify-content:center;background:rgba(0,0,0,.6)}" +
    "#mc-velo.on{display:flex}" +
    "@media (min-width:640px){#mc-velo{align-items:center}}" +
    "#mc-modal{background:#1a1512;color:#fbf5ec;border:1px solid #33291f;border-radius:20px 20px 0 0;width:100%;max-width:520px;max-height:92vh;overflow:auto;padding:20px 18px 24px}" +
    "@media (min-width:640px){#mc-modal{border-radius:20px}}" +
    "#mc-modal h2{font-family:'EB Garamond',Georgia,serif;font-size:30px;margin:0 0 6px}" +
    "#mc-modal .sub{color:#c8baa6;margin:0 0 14px;font-size:15px}" +
    "#mc-modal label.campo{display:grid;gap:6px;font-weight:700;font-size:14px;margin-bottom:12px}" +
    "#mc-modal input[type=text],#mc-modal input[type=email],#mc-modal input[type=tel]{font:inherit;font-size:16px;padding:12px 14px;border-radius:12px;border:1px solid #4a3c2d;background:#0f0c0a;color:#fbf5ec;width:100%}" +
    "#mc-modal input:focus-visible{outline:3px solid #f3c45a;outline-offset:1px}" +
    "#mc-modal .lista{list-style:none;display:grid;gap:8px;margin:4px 0 14px;padding:0}" +
    "#mc-modal .lista li{display:flex;align-items:center;gap:10px;font-size:15px;padding:10px 12px;border:1px solid #33291f;border-radius:12px}" +
    "#mc-modal .lista li::before{content:none}" +
    "#mc-modal .lista li.no{opacity:.55}" +
    "#mc-modal .lista li small{display:block;color:#ff9b8a;font-size:13px}" +
    "#mc-modal .lista input{width:20px;height:20px;accent-color:#f3c45a;flex:none}" +
    "#mc-modal .estado{font-size:14px;font-weight:700;margin:-4px 0 12px;min-height:20px}" +
    "#mc-modal .estado.bien{color:#9be37d}#mc-modal .estado.mal{color:#ff9b8a}" +
    "#mc-modal .error{background:#3a1611;border:1px solid #7a2a1e;color:#ffd5cc;border-radius:12px;padding:10px 12px;margin:0 0 12px;font-size:15px}" +
    "#mc-modal .acciones{display:flex;flex-wrap:wrap;gap:10px;margin-top:6px}" +
    "#mc-modal .trampa{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}" +
    "#mc-modal .grande{display:block;text-align:center;text-decoration:none;font-weight:800;font-size:18px;padding:16px;border-radius:14px;background:#25d366;color:#06210f;margin-top:14px}";
  document.head.appendChild(css);

  var casillas = Array.prototype.slice.call(document.querySelectorAll("input[data-cohorte]"));
  // El filtro de la página deshabilita las casillas de grupos que ya empezaron: salen de la selección guardada.
  function quitarCerradas() {
    var cerradas = casillas.filter(function (x) { return x.disabled; }).map(function (x) { return x.getAttribute("data-cohorte"); });
    var antes = marcados.length;
    marcados = marcados.filter(function (m) { return cerradas.indexOf(m.c) < 0; });
    if (marcados.length !== antes) guardar(marcados);
  }
  quitarCerradas();
  if (!casillas.length && !marcados.length) return;

  var barra = document.createElement("div");
  barra.id = "mc-barra";
  barra.setAttribute("role", "region");
  barra.setAttribute("aria-label", "Cursos marcados");
  barra.innerHTML = '<div class="in"><b id="mc-cuenta" aria-live="polite"></b><button type="button" id="mc-abrir">Tengo un código</button></div>';
  document.body.appendChild(barra);

  var velo = document.createElement("div");
  velo.id = "mc-velo";
  velo.innerHTML =
    '<div id="mc-modal" role="dialog" aria-modal="true" aria-labelledby="mc-titulo">' +
    '<div id="mc-paso1"><h2 id="mc-titulo">Canjea tu código</h2>' +
    '<p class="sub">Te inscribimos en los cursos que marcaste. Si aún no tienes cuenta, la creamos con tus datos.</p>' +
    '<form id="mc-form" novalidate>' +
    '<label class="campo">Código<input type="text" id="mc-codigo" name="codigo" autocomplete="off" autocapitalize="characters" spellcheck="false" required></label>' +
    '<p class="estado" id="mc-estado" aria-live="polite"></p>' +
    '<p style="font-weight:700;font-size:14px;margin:0 0 6px">Cursos marcados</p><ul class="lista" id="mc-lista"></ul>' +
    '<label class="campo">Nombre y apellidos<input type="text" id="mc-nombre" name="nombre" autocomplete="name" required></label>' +
    '<label class="campo">Correo<input type="email" id="mc-email" name="email" autocomplete="email" inputmode="email" required></label>' +
    '<label class="campo">Celular (WhatsApp)<input type="tel" id="mc-tel" name="telefono" autocomplete="tel" inputmode="tel" required></label>' +
    '<div class="trampa" aria-hidden="true"><label>No llenar<input type="text" id="mc-web" name="web" tabindex="-1" autocomplete="off"></label></div>' +
    '<div class="error" id="mc-error" role="alert" hidden></div>' +
    '<div class="acciones"><button type="submit" class="mc-btn" id="mc-enviar">Inscribirme</button><button type="button" class="mc-btn sec" id="mc-cerrar">Cerrar</button></div>' +
    '</form></div>' +
    '<div id="mc-paso2" hidden></div></div>';
  document.body.appendChild(velo);

  var $ = function (id) { return document.getElementById(id); };
  var ultimoFoco = null;

  function nombreDe(c) { for (var i = 0; i < marcados.length; i++) if (marcados[i].c === c) return marcados[i].n; return c; }
  function estaMarcado(c) { return marcados.some(function (m) { return m.c === c; }); }

  function sincronizar() {
    casillas.forEach(function (x) { x.checked = !x.disabled && estaMarcado(x.getAttribute("data-cohorte")); });
    var n = marcados.length;
    $("mc-cuenta").textContent = n === 1 ? "1 curso marcado" : n + " cursos marcados";
    barra.classList.toggle("on", n > 0);
    document.body.classList.toggle("mc-con-barra", n > 0);
  }

  casillas.forEach(function (x) {
    x.addEventListener("change", function () {
      var c = x.getAttribute("data-cohorte");
      marcados = marcados.filter(function (m) { return m.c !== c; });
      if (x.checked) marcados.push({ c: c, n: x.getAttribute("data-nombre") || c });
      guardar(marcados);
      sincronizar();
    });
  });

  function pintarLista() {
    var ul = $("mc-lista");
    ul.innerHTML = "";
    marcados.forEach(function (m) {
      var no = permitidas && permitidas.indexOf(m.c) < 0;
      var li = document.createElement("li");
      if (no) li.className = "no";
      var id = "mc-l-" + m.c;
      li.innerHTML = '<input type="checkbox" id="' + id + '"><label for="' + id + '"></label>';
      var cb = li.querySelector("input");
      cb.checked = !no;
      cb.disabled = !!no;
      cb.setAttribute("data-c", m.c);
      var lab = li.querySelector("label");
      lab.textContent = m.n;
      if (no) { var s = document.createElement("small"); s.textContent = "Tu código no incluye este curso"; lab.appendChild(s); }
      ul.appendChild(li);
    });
  }

  function elegidos() {
    return Array.prototype.slice.call($("mc-lista").querySelectorAll("input[data-c]"))
      .filter(function (x) { return x.checked && !x.disabled; })
      .map(function (x) { return x.getAttribute("data-c"); });
  }

  function error(msg) { var e = $("mc-error"); e.textContent = msg; e.hidden = !msg; }

  function abrir() {
    ultimoFoco = document.activeElement;
    $("mc-paso1").hidden = false; $("mc-paso2").hidden = true;
    error("");
    pintarLista();
    velo.classList.add("on");
    $("mc-codigo").focus();
  }
  function cerrar() {
    velo.classList.remove("on");
    if (ultimoFoco && ultimoFoco.focus) ultimoFoco.focus();
  }

  function post(ruta, cuerpo) {
    return fetch(API + ruta, {
      method: "POST", credentials: "same-origin",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(cuerpo)
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) { d._status = r.status; return d; });
    });
  }

  function fecha(v) {
    try { var d = new Date(v); if (isNaN(d)) return ""; return d.toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Lima" }); }
    catch (e) { return ""; }
  }

  var ultimoValidado = "";
  function validar() {
    var codigo = $("mc-codigo").value.trim();
    var est = $("mc-estado");
    if (!codigo || codigo === ultimoValidado) return;
    ultimoValidado = codigo;
    est.className = "estado"; est.textContent = "Revisando el código…";
    post("validar", { codigo: codigo }).then(function (d) {
      if (d.ok) {
        maximo = typeof d.max === "number" ? d.max : null;
        // permitidas: [{cohorte, titulo, tipo, hasta}] (también acepta una lista de cadenas); todos = sin restricción
        permitidas = (!d.todos && Array.isArray(d.permitidas) && d.permitidas.length)
          ? d.permitidas.map(function (x) { return typeof x === "string" ? x : x.cohorte; }) : null;
        var t = maximo ? "Tu código permite " + maximo + (maximo === 1 ? " curso" : " cursos") : "Código válido";
        if (typeof d.restantes === "number") t += " · quedan " + d.restantes + (d.restantes === 1 ? " uso" : " usos");
        var v = d.vence ? fecha(d.vence) : "";
        est.className = "estado bien"; est.textContent = t + (v ? " · vence el " + v : "") + ".";
      } else {
        permitidas = null; maximo = null;
        est.className = "estado mal"; est.textContent = d.mensaje || MENSAJES[d.error] || "No pudimos validar el código.";
      }
      pintarLista();
    }).catch(function () {
      ultimoValidado = "";
      est.className = "estado mal"; est.textContent = "Sin conexión. Vuelve a intentarlo.";
    });
  }

  function exito(d, cursos) {
    var p2 = $("mc-paso2");
    p2.innerHTML = "";
    var h = document.createElement("h2");
    var sub = document.createElement("p"); sub.className = "sub";
    var ul = document.createElement("ul"); ul.className = "lista";
    (d.cursos && d.cursos.length ? d.cursos : cursos.map(nombreDe)).forEach(function (c) {
      var li = document.createElement("li"); li.textContent = typeof c === "string" ? c : (c.titulo || c.nombre || c.cohorte || ""); ul.appendChild(li);
    });
    var a = document.createElement("a"); a.className = "grande";
    if (d.cuenta === "existente") {
      h.textContent = "¡Listo! Ya estás inscrito";
      sub.textContent = d.mensaje || "Ya tienes cuenta: entra con tu correo y tu contraseña de siempre. Tus cursos nuevos ya están en tu aula.";
      a.href = "https://jmd-learn.online/"; a.textContent = "Entrar a JMD Learning";
    } else {
      h.textContent = "¡Bienvenido! Ya estás inscrito";
      sub.textContent = d.mensaje || "Creamos tu cuenta. Entra con este botón; guarda el enlace, también te sirve para volver.";
      a.href = d.enlace || "https://jmd-learn.online/"; a.textContent = "Entrar a mis cursos";
    }
    h.id = "mc-titulo2";
    var cerrarB = document.createElement("button"); cerrarB.type = "button"; cerrarB.className = "mc-btn sec"; cerrarB.textContent = "Cerrar";
    cerrarB.style.marginTop = "12px"; cerrarB.addEventListener("click", cerrar);
    p2.appendChild(h); p2.appendChild(sub); p2.appendChild(ul); p2.appendChild(a); p2.appendChild(cerrarB);
    $("mc-paso1").hidden = true; p2.hidden = false;
    $("mc-modal").setAttribute("aria-labelledby", "mc-titulo2");
    a.focus();
    marcados = []; guardar(marcados); sincronizar();
  }

  $("mc-abrir").addEventListener("click", abrir);
  $("mc-cerrar").addEventListener("click", cerrar);
  velo.addEventListener("click", function (e) { if (e.target === velo) cerrar(); });
  document.addEventListener("keydown", function (e) {
    if (!velo.classList.contains("on")) return;
    if (e.key === "Escape") { cerrar(); return; }
    if (e.key === "Tab") { // foco atrapado en el modal
      var f = Array.prototype.slice.call($("mc-modal").querySelectorAll("a[href],button:not([disabled]),input:not([disabled]):not([tabindex='-1'])"))
        .filter(function (x) { return x.offsetParent !== null; });
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });
  $("mc-codigo").addEventListener("blur", validar);
  $("mc-codigo").addEventListener("input", function () { if ($("mc-codigo").value.trim() !== ultimoValidado) { $("mc-estado").textContent = ""; } });

  $("mc-form").addEventListener("submit", function (e) {
    e.preventDefault();
    error("");
    var codigo = $("mc-codigo").value.trim();
    var nombre = $("mc-nombre").value.trim();
    var email = $("mc-email").value.trim();
    var tel = $("mc-tel").value.trim();
    var cursos = elegidos();
    if (!codigo) { error("Escribe tu código."); $("mc-codigo").focus(); return; }
    if (!cursos.length) { error("Marca al menos un curso que incluya tu código."); return; }
    if (maximo && cursos.length > maximo) { error("Tu código permite " + maximo + (maximo === 1 ? " curso" : " cursos") + ". Desmarca " + (cursos.length - maximo) + "."); return; }
    if (nombre.length < 3) { error("Escribe tu nombre y apellidos."); $("mc-nombre").focus(); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { error("Revisa tu correo."); $("mc-email").focus(); return; }
    if (tel.replace(/\D/g, "").length < 9) { error("Revisa tu celular."); $("mc-tel").focus(); return; }
    var b = $("mc-enviar"); b.disabled = true; b.textContent = "Inscribiendo…";
    post("canje", { codigo: codigo, nombre: nombre, email: email, telefono: tel, cohortes: cursos, web: $("mc-web").value })
      .then(function (d) {
        if (d._status === 200 && d.ok !== false) exito(d, cursos);
        else error(d.mensaje || MENSAJES[d.error] || "No pudimos completar la inscripción. Inténtalo de nuevo.");
      })
      .catch(function () { error("Sin conexión. Vuelve a intentarlo."); })
      .then(function () { b.disabled = false; b.textContent = "Inscribirme"; });
  });

  document.addEventListener("cursos:filtrado", function () {
    quitarCerradas(); sincronizar();
    if (velo.classList.contains("on") && !$("mc-paso1").hidden) pintarLista();
  });
  sincronizar();
})();
