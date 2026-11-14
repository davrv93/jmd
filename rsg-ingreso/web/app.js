(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var form = $("form"), err = $("error"), btn = $("enviar");
  var horario = [];

  function mostrarError(msg, campo) {
    err.textContent = msg;
    err.hidden = false;
    ["nombre", "correo"].forEach(function (c) { $(c).removeAttribute("aria-invalid"); });
    if (campo) { $(campo).setAttribute("aria-invalid", "true"); $(campo).focus(); }
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    err.hidden = true;
    var nombre = form.nombre.value.trim().replace(/\s+/g, " ");
    var correo = form.correo.value.trim().toLowerCase();
    if (nombre.length < 3) return mostrarError("Escribe tu nombre y apellido.", "nombre");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return mostrarError("Escribe un correo válido.", "correo");
    btn.disabled = true;
    btn.textContent = "Preparando tu link…";
    fetch("api/inscribir", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: nombre, correo: correo, sitio: form.sitio.value })
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok) throw new Error(d.error || "No pudimos inscribirte. Inténtalo de nuevo en unos minutos.");
        return d;
      });
    }).then(listo).catch(function (x) {
      mostrarError(x && x.message && x.message !== "Failed to fetch" ? x.message : "No hay conexión. Revisa tu internet e inténtalo de nuevo.");
    }).then(function () {
      btn.disabled = false;
      btn.textContent = "Quiero mi link de ingreso";
    });
  });

  function primerNombre(n) { return (n || "").split(" ")[0]; }

  function listo(d) {
    horario = d.horario || [];
    var nombre = primerNombre(d.nombre);
    ["r-nueva", "r-existente", "r-ya", "r-recibido"].forEach(function (id) { $(id).hidden = true; });
    var t = $("t-listo");
    if (d.estado === "nueva") {
      $("r-ante").textContent = "TU LINK DE INGRESO";
      t.textContent = "¡Listo, " + nombre + "!";
      $("enlace").textContent = d.enlace;
      $("entrar").href = d.enlace;
      $("vence").textContent = d.vence;
      $("r-nueva").hidden = false;
    } else if (d.estado === "existente") {
      $("r-ante").textContent = "INSCRIPCIÓN LISTA";
      t.textContent = "¡Ya estás dentro, " + nombre + "!";
      $("r-existente").hidden = false;
    } else if (d.estado === "ya-inscrito") {
      $("r-ante").textContent = "INSCRIPCIÓN LISTA";
      t.textContent = "Este correo ya estaba inscrito";
      $("r-ya").hidden = false;
    } else {
      $("r-ante").textContent = "INSCRIPCIÓN";
      t.textContent = "¡Gracias!";
      $("r-recibido").hidden = false;
    }
    $("nota-clases").textContent = d.estado === "nueva"
      ? "Las clases son en vivo, en hora de Lima. Tu curso está en jmd-learn.online: entra con tu link antes de cada clase."
      : "Las clases son en vivo, en hora de Lima. Tu curso está en jmd-learn.online: entra con tu cuenta antes de cada clase.";
    pintarHorario();
    $("paso-form").hidden = true;
    $("paso-listo").hidden = false;
    form.reset();
    window.scrollTo(0, 0);
    t.focus();
  }

  function el(tag, cls, txt) {
    var x = document.createElement(tag);
    if (cls) x.className = cls;
    if (txt != null) x.textContent = txt;
    return x;
  }

  function botonCal(s, etiqueta) {
    var b = el("button", "boton claro chico", etiqueta || "Agregar al calendario");
    b.type = "button";
    b.addEventListener("click", function () { descargar([s], archivoDe(s)); });
    return b;
  }

  function pintarHorario() {
    var ol = $("clases"), hk = $("hackathon");
    ol.textContent = "";
    hk.textContent = "";
    var n = 0, clases = horario.filter(function (s) { return s.tipo === "clase"; });
    clases.forEach(function (s, i) {
      n++;
      var li = el("li", i === clases.length - 1 ? "ultima" : "");
      var fe = el("span", "fe");
      fe.appendChild(document.createTextNode(s.dia));
      fe.appendChild(el("b", "", s.num));
      fe.appendChild(document.createTextNode(s.mes));
      var ti = el("span", "ti");
      ti.appendChild(document.createTextNode("Clase " + n + " · " + s.titulo));
      var sm = el("small");
      sm.appendChild(el("em", "", s.horas));
      sm.appendChild(document.createTextNode(" · " + s.fecha));
      ti.appendChild(sm);
      li.appendChild(fe);
      li.appendChild(ti);
      li.appendChild(botonCal(s));
      ol.appendChild(li);
    });
    horario.filter(function (s) { return s.tipo === "hackathon"; }).forEach(function (s) {
      hk.appendChild(el("small", "", "HACKATHON READY SET GO!"));
      hk.appendChild(el("b", "", s.dia + " " + s.num + " " + s.mes));
      hk.appendChild(el("span", "hk-horas", s.fecha + " · " + s.horas));
      hk.appendChild(el("p", "", "Una tarde para crear, probar y presentar tu videojuego de fútbol. Requisito: haber llevado un curso con JMD Learning."));
      hk.appendChild(botonCal(s));
    });
  }

  $("todo-cal").addEventListener("click", function () { descargar(horario, "ready-set-go-horario.ics"); });

  $("copiar").addEventListener("click", function () {
    var b = this, txt = $("enlace").textContent;
    var ok = function () { b.textContent = "¡Copiado!"; setTimeout(function () { b.textContent = "Copiar link"; }, 2200); };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(txt).then(ok, function () { seleccionar(); });
    } else {
      seleccionar();
      try { if (document.execCommand("copy")) ok(); } catch (e) { /* queda seleccionado para copiar a mano */ }
    }
  });

  function seleccionar() {
    var r = document.createRange();
    r.selectNodeContents($("enlace"));
    var s = window.getSelection();
    s.removeAllRanges();
    s.addRange(r);
  }

  // ---- Calendario (.ics) armado aquí mismo: no lleva el link de ingreso ----
  function archivoDe(s) { return "ready-set-go-" + s.id + ".ics"; }
  function utc(d) { return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, ""); }
  function esc(t) { return String(t).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n"); }
  function plegar(linea) {
    var out = [], resto = linea;
    // 37 caracteres ≤ 75 bytes aunque todos lleven tilde (RFC 5545 pliega por bytes)
    while (resto.length > 37) { out.push(resto.slice(0, 37)); resto = " " + resto.slice(37); }
    out.push(resto);
    return out.join("\r\n");
  }
  function descargar(sesiones, nombre) {
    var ahora = utc(new Date()), clase = 0;
    var l = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//JMD Learning//Ready Set Go//ES", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
    horario.forEach(function (s) {
      if (s.tipo === "clase") clase++;
      if (sesiones.indexOf(s) < 0) return;
      var ini = new Date(s.inicio), fin = new Date(ini.getTime() + s.minutos * 60000);
      var titulo = s.tipo === "clase" ? "Ready Set Go! · Clase " + clase + ": " + s.titulo : s.titulo;
      l.push("BEGIN:VEVENT", "UID:" + s.id + "-2026@jmd-learn.online", "DTSTAMP:" + ahora, "DTSTART:" + utc(ini), "DTEND:" + utc(fin),
        plegar("SUMMARY:" + esc(titulo)),
        plegar("DESCRIPTION:" + esc("JMD Learning · Ready Set Go! Videojuegos con IA. Entra a tu curso en https://jmd-learn.online con tu link de ingreso.")),
        "URL:https://jmd-learn.online/",
        "BEGIN:VALARM", "TRIGGER:-PT30M", "ACTION:DISPLAY", plegar("DESCRIPTION:" + esc("En 30 minutos: " + titulo)), "END:VALARM",
        "END:VEVENT");
    });
    l.push("END:VCALENDAR");
    var blob = new Blob([l.join("\r\n") + "\r\n"], { type: "text/calendar;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
})();
