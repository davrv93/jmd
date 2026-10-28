// laboratorio.js · piezas comunes de la clase 3 del G5 («Tu Robo en 3D, con tu prompt»).
//
//   <link rel="stylesheet" href="../../comun/laboratorio.css">
//   <script src="../../comun/laboratorio.js"></script>        (script clásico, sin módulos)
//
// Todo va al LMS del mismo origen (la CSP de la escena no deja salir): /api/v1/live/<lección>/…
//   mi-robo · prompt · agente (NDJSON) · transcribir · voz · imagen · muro
// Ojo con la CSP: media-src e img-src no aceptan blob:, así que el audio se toca con Web Audio
// (decodeAudioData) y las imágenes se pintan como data: (FileReader).
//
// Expone window.Lab:
//   Lab.leccion, Lab.esc(s), Lab.leer(k), Lab.guardar(k, v)
//   Lab.pedir(ruta, {method, body}) → Response (lanza Error con .status y .code)
//   Lab.pedirJSON(ruta, opt) → objeto
//   Lab.mensaje(err, que) → texto amable en español
//   Lab.miRobo() → GET mi-robo (una sola vez por página)
//   Lab.dictado({boton, campo, estado}) → 🎤 Web Speech (es-PE); respaldo: grabar → WAV 16 kHz → transcribir
//   Lab.botonVoz(boton, () => texto, estado) → 🔊 voz del servidor; respaldo: speechSynthesis
//   Lab.calificar(texto, tipo) → POST prompt
//   Lab.pintarNota(caja, nota)
//   Lab.laboratorio(raiz, cfg) → laboratorio completo (pista, ideas, editor, nota y agente)
//   Lab.abrirVisor(ruta) → pide al panel que abra el Visor en esa ruta
//   Lab.copiar(texto) → Promise<boolean>
//   Lab.muro.leer(escena) / Lab.muro.publicar(escena, texto)
(function () {
  "use strict";

  var leccion = (location.pathname.match(/\/live\/([^/]+)\//) || [])[1] || "g5-03";
  var BASE = "/api/v1/live/" + encodeURIComponent(leccion);

  /* Tema: ?tema=dark|light fuerza el del LMS; si no, manda el del sistema. */
  try {
    var t = new URLSearchParams(location.search).get("tema");
    if (t === "dark" || t === "light") document.documentElement.setAttribute("data-tema", t);
  } catch (e) { /* sin tema */ }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function leer(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function guardar(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* modo privado */ } }
  function palabras(s) { var m = String(s || "").trim().match(/\S+/g); return m ? m.length : 0; }
  function duracion(seg) {
    seg = Math.max(0, Math.round(seg || 0));
    var m = Math.floor(seg / 60), s = seg % 60;
    return m ? m + " min " + (s ? s + " s" : "") : s + " s";
  }

  /* ---------------- Red ---------------- */
  function errorDe(r) {
    return r.text().then(function (txt) {
      var d = null;
      try { d = JSON.parse(txt); } catch (e) { /* no es JSON */ }
      var e = new Error((d && d.error && d.error.message) || "");
      e.status = r.status;
      e.code = (d && d.error && d.error.code) || "";
      return e;
    }, function () { var e = new Error(""); e.status = r.status; e.code = ""; return e; });
  }
  async function pedir(ruta, opt) {
    opt = opt || {};
    var init = { method: opt.method || "GET", credentials: "same-origin", cache: "no-store", headers: {} };
    if (opt.body !== undefined) {
      init.headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(opt.body);
    }
    var r;
    try { r = await fetch(BASE + ruta, init); } catch (e) {
      var x = new Error(""); x.status = 0; x.code = "red"; throw x;
    }
    if (!r.ok) throw await errorDe(r);
    return r;
  }
  async function pedirJSON(ruta, opt) { var r = await pedir(ruta, opt); return r.json(); }

  function mensaje(e, que) {
    var s = e && e.status, m = (e && e.message) || "";
    if (s === 0) return "Sin conexión con el LMS. Revisa tu internet y vuelve a intentar.";
    if (s === 401) return "Tu sesión se cerró: recarga la página e ingresa de nuevo.";
    if (s === 403) return m || "Esta acción no está habilitada para tu cuenta.";
    if (s === 404) return "Esta función aún no está activa en el servidor de la clase. Avísale al instructor.";
    if (s === 409) return "Tu agente ya está trabajando en un encargo. Espera a que termine: abajo ves su avance.";
    if (s === 413) return "Es demasiado largo: recórtalo un poco.";
    if (s === 422) return (m ? m + " " : "") + "Revisa los consejos de la lista, ajusta tu prompt y califícalo otra vez.";
    if (s === 429) return m || "Llegaste al tope por ahora. Espera un momento y vuelve a intentar.";
    if (s >= 500) return "El servidor de la clase no respondió (" + s + "). Intenta en un minuto; si sigue, avísale al instructor.";
    if (m) return m;
    if (s) return "No se pudo " + (que || "completar") + " (código " + s + ").";
    return "No se pudo " + (que || "completar") + ". Vuelve a intentar.";
  }

  var miRoboP = null;
  function miRobo() {
    if (!miRoboP) miRoboP = pedirJSON("/mi-robo").catch(function (e) { miRoboP = null; throw e; });
    return miRoboP;
  }

  function copiar(texto) {
    if (window.copiarTexto) return window.copiarTexto(texto);
    var intentos = [navigator.clipboard];
    try { intentos.push(window.parent.navigator.clipboard); } catch (e) { /* otro origen */ }
    var p = Promise.reject();
    intentos.forEach(function (c) { if (c && c.writeText) p = p.catch(function () { return c.writeText(texto); }); });
    return p.then(function () { return true; }, function () {
      try {
        var ta = document.createElement("textarea");
        ta.value = texto; ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.select();
        var ok = document.execCommand("copy"); ta.remove(); return ok;
      } catch (e) { return false; }
    });
  }

  /* El panel del LIVE decide qué hacer con el pedido; si no lo atiende, el texto de la escena explica cómo. */
  function abrirVisor(ruta) {
    try { window.parent.postMessage({ tipo: "abrir-visor", ruta: ruta }, location.origin); return true; } catch (e) { return false; }
  }

  /* ---------------- Audio: texto → voz ---------------- */
  var ctxAudio = null, fuenteAudio = null;
  function contexto() {
    var C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    if (!ctxAudio) { try { ctxAudio = new C(); } catch (e) { return null; } }
    if (ctxAudio.state === "suspended") ctxAudio.resume().catch(function () {});
    return ctxAudio;
  }
  function callar() {
    try { if (fuenteAudio) fuenteAudio.stop(); } catch (e) { /* ya paró */ }
    fuenteAudio = null;
    try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) { /* sin voz */ }
  }
  function vozNavegador(texto) {
    return new Promise(function (ok) {
      if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) { ok(false); return; }
      var u = new SpeechSynthesisUtterance(texto);
      u.lang = "es-PE";
      var voces = window.speechSynthesis.getVoices().filter(function (v) { return /^es/i.test(v.lang); });
      var pref = voces.filter(function (v) { return /PE|419|MX|US/i.test(v.lang); })[0] || voces[0];
      if (pref) u.voice = pref;
      u.onend = function () { ok(true); };
      u.onerror = function () { ok(false); };
      window.speechSynthesis.speak(u);
    });
  }
  /* Llamar dentro del clic (el contexto de audio se abre con el gesto). Resuelve al terminar de hablar. */
  async function hablar(texto, alEmpezar) {
    texto = String(texto || "").replace(/\s+/g, " ").trim().slice(0, 700);
    if (!texto) return { motor: null };
    callar();
    var ctx = contexto();
    try {
      if (!ctx) throw new Error("sin Web Audio");
      var r = await pedir("/voz", { method: "POST", body: { texto: texto } });
      var buf = await r.arrayBuffer();
      var ab = await new Promise(function (ok, mal) { ctx.decodeAudioData(buf, ok, mal); });
      if (alEmpezar) alEmpezar("servidor");
      await new Promise(function (ok) {
        var src = ctx.createBufferSource();
        src.buffer = ab; src.connect(ctx.destination);
        src.onended = function () { if (fuenteAudio === src) fuenteAudio = null; ok(); };
        fuenteAudio = src; src.start();
      });
      return { motor: "servidor" };
    } catch (e) {
      if (alEmpezar) alEmpezar("navegador");
      var bien = await vozNavegador(texto);
      return { motor: bien ? "navegador" : null, error: e };
    }
  }
  function botonVoz(boton, obtener, estado) {
    var hablando = false;
    function decir(t, mal) { if (estado) { estado.textContent = t; estado.classList.toggle("mal", !!mal); } }
    function pintar() {
      boton.setAttribute("aria-pressed", hablando ? "true" : "false");
      var s = boton.querySelector("span"); if (s) s.textContent = hablando ? "Detener" : (boton.dataset.etiqueta || "Escuchar");
    }
    boton.addEventListener("click", function () {
      if (hablando) { callar(); return; }
      var texto = obtener();
      if (!String(texto || "").trim()) { decir("No hay nada que leer todavía: escribe o dicta algo primero.", true); return; }
      hablando = true; pintar(); decir("Generando la voz en el servidor de la clase…");
      hablar(texto, function (motor) {
        decir(motor === "servidor" ? "Hablando con la voz del servidor (Piper)…" : "El servidor de voz no respondió: uso la voz de tu navegador…");
      }).then(function (r) {
        hablando = false; pintar();
        if (r.motor === "servidor") decir("Listo: era la voz del servidor de la clase (Piper).");
        else if (r.motor === "navegador") decir("Listo: era la voz de tu navegador (el servidor de voz no respondió).");
        else decir("No hay voz disponible: ni el servidor ni este navegador pudieron leerlo.", true);
      });
    });
    return { callar: callar };
  }

  /* ---------------- Audio: voz → texto ---------------- */
  /* Audio grabado → WAV mono de 16 kHz en base64. */
  function aWav(blob) {
    return blob.arrayBuffer().then(function (buf) {
      var C = window.AudioContext || window.webkitAudioContext, ctx = new C();
      return new Promise(function (ok, mal) { ctx.decodeAudioData(buf, ok, mal); }).then(function (ab) {
        ctx.close();
        var n = Math.max(1, Math.ceil(ab.duration * 16000)), off = new OfflineAudioContext(1, n, 16000), src = off.createBufferSource();
        src.buffer = ab; src.connect(off.destination); src.start();
        return off.startRendering();
      });
    }).then(function (ab) {
      var d = ab.getChannelData(0), out = new DataView(new ArrayBuffer(44 + d.length * 2));
      function txt(o, s) { for (var k = 0; k < s.length; k++) out.setUint8(o + k, s.charCodeAt(k)); }
      txt(0, "RIFF"); out.setUint32(4, 36 + d.length * 2, true); txt(8, "WAVEfmt "); out.setUint32(16, 16, true);
      out.setUint16(20, 1, true); out.setUint16(22, 1, true); out.setUint32(24, 16000, true); out.setUint32(28, 32000, true);
      out.setUint16(32, 2, true); out.setUint16(34, 16, true); txt(36, "data"); out.setUint32(40, d.length * 2, true);
      for (var k = 0; k < d.length; k++) { var v = Math.max(-1, Math.min(1, d[k])); out.setInt16(44 + k * 2, v < 0 ? v * 0x8000 : v * 0x7fff, true); }
      var bytes = new Uint8Array(out.buffer), bin = "";
      for (var k2 = 0; k2 < bytes.length; k2 += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(k2, k2 + 0x8000));
      return btoa(bin);
    });
  }

  function dictado(o) {
    var Reco = window.SpeechRecognition || window.webkitSpeechRecognition;
    var grabar = !Reco, reco = null, oyendo = false, base = "", grab = null, flujo = null, trozos = [], tope = null, huboTexto = false;
    function decir(t, mal) { if (o.estado) { o.estado.textContent = t; o.estado.classList.toggle("mal", !!mal); } }
    function pintar() {
      o.boton.setAttribute("aria-pressed", oyendo ? "true" : "false");
      var s = o.boton.querySelector("span"); if (s) s.textContent = oyendo ? "Detener" : "Dictar";
    }
    function poner(t) { o.campo.value = t; o.campo.dispatchEvent(new Event("input", { bubbles: true })); }
    function detener() {
      clearTimeout(tope);
      if (reco) { try { reco.stop(); } catch (e) { /* ya paró */ } }
      if (grab && grab.state !== "inactive") grab.stop();
      oyendo = false; pintar();
    }
    function conReco() {
      reco = new Reco();
      reco.lang = "es-PE"; reco.interimResults = true; reco.continuous = true;
      base = o.campo.value.replace(/\s+$/, ""); base = base ? base + " " : "";
      huboTexto = false;
      reco.onresult = function (e) {
        var fin = "", parcial = "";
        for (var i = e.resultIndex; i < e.results.length; i++) {
          var tx = e.results[i][0].transcript;
          if (e.results[i].isFinal) fin += tx; else parcial += tx;
        }
        if (fin) base += fin.trim() + " ";
        huboTexto = true;
        poner((base + parcial).replace(/\s+$/, ""));
      };
      reco.onerror = function (e) {
        if (e.error === "not-allowed") { decir("Permiso de micrófono denegado: actívalo en el candado de la barra de direcciones y vuelve a pulsar «Dictar».", true); }
        else if (e.error === "network" || e.error === "service-not-allowed" || e.error === "audio-capture" || e.error === "language-not-supported") {
          grabar = true;
          decir("El dictado de este navegador no está disponible aquí. Pulsa «Dictar» otra vez: grabaré tu voz y la transcribirá el servidor.", true);
        } else if (e.error !== "no-speech" && e.error !== "aborted") decir("El dictado falló (" + e.error + "). Vuelve a intentar.", true);
      };
      reco.onend = function () {
        reco = null; clearTimeout(tope);
        var estaba = oyendo; oyendo = false; pintar();
        if (estaba && huboTexto) decir("Listo. Lee lo que quedó y corrígelo: el dictado a veces entiende otra cosa.");
        else if (estaba && !grabar) decir("No te escuché. Acércate al micrófono y vuelve a pulsar «Dictar».");
      };
      try {
        reco.start(); oyendo = true; pintar();
        decir("Te escucho… habla con calma. Pulsa «Detener» al terminar.");
        tope = setTimeout(detener, 90000);
      } catch (e) {
        reco = null; grabar = true;
        decir("El dictado del navegador no arrancó. Pulsa «Dictar» otra vez: grabaré tu voz.", true);
      }
    }
    async function conGrabadora() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) {
        decir("Este navegador no da el micrófono: escribe con el teclado.", true); return;
      }
      decir("Pidiendo permiso del micrófono…");
      try { flujo = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch (e) {
        decir("Permiso de micrófono denegado: actívalo en el candado de la barra de direcciones y vuelve a pulsar «Dictar».", true); return;
      }
      trozos = [];
      grab = new MediaRecorder(flujo);
      grab.ondataavailable = function (e) { if (e.data && e.data.size) trozos.push(e.data); };
      grab.onstop = async function () {
        flujo.getTracks().forEach(function (tr) { tr.stop(); });
        if (!trozos.length) { decir("No se grabó nada. Vuelve a intentar.", true); return; }
        decir("Transcribiendo tu voz en el servidor…");
        o.boton.disabled = true;
        try {
          var b64 = await aWav(new Blob(trozos, { type: grab.mimeType || "audio/webm" }));
          var d = await pedirJSON("/transcribir", { method: "POST", body: { audio: b64 } });
          var tx = String((d && d.texto) || "").trim();
          if (tx) {
            var v = o.campo.value.replace(/\s+$/, "");
            poner((v ? v + " " : "") + tx);
            decir("Listo" + (d.motor ? " (" + d.motor + ")" : "") + ". Lee lo que quedó y corrígelo si entendió otra cosa.");
          } else decir("No se entendió nada. Habla más cerca del micrófono y vuelve a intentar.", true);
        } catch (e) { decir(mensaje(e, "transcribir"), true); }
        finally { o.boton.disabled = false; }
      };
      grab.start(); oyendo = true; pintar();
      decir("Grabando… (máx. 25 s). Pulsa «Detener» al terminar.");
      tope = setTimeout(detener, 25000);
    }
    o.boton.addEventListener("click", function () {
      if (oyendo) { detener(); return; }
      callar();
      if (grabar) conGrabadora(); else conReco();
    });
    return { detener: detener };
  }

  /* ---------------- Calificación ---------------- */
  /* sinIA: solo las reglas, al instante. Sin él, también el comentario de la IA (5 a 20 s). */
  function calificar(texto, tipo, sinIA) {
    var body = { texto: texto, tipo: tipo };
    if (sinIA) body.sin_ia = true;
    return pedirJSON("/prompt", { method: "POST", body: body });
  }

  var NIVEL = { flojo: "Flojo", casi: "Casi", listo: "¡Listo!" };
  function pintarNota(caja, d, op) {
    op = op || {};
    var nivel = NIVEL[d.nivel] ? d.nivel : (d.listo ? "listo" : "flojo");
    var pct = Math.max(0, Math.min(100, Math.round(+d.puntaje || 0)));
    var h = '<div class="lb-medidor" data-nivel="' + nivel + '">' +
      '<div class="lb-num"><b>' + pct + '</b><small>/100</small></div>' +
      '<div class="lb-barra" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '" aria-label="Puntaje de tu prompt"><i style="width:0%"></i><span class="lb-marca"></span></div>' +
      '<span class="lb-nivel">' + NIVEL[nivel] + '</span></div>';
    var reglas = Array.isArray(d.reglas) ? d.reglas : [];
    if (reglas.length) {
      h += '<ul class="lb-reglas" aria-label="Lo que revisan las reglas">';
      reglas.forEach(function (r) {
        var cls = r.ok ? "si" : (r.bloquea ? "no bloq" : "no");
        h += '<li class="' + cls + '"><i aria-hidden="true">' + (r.ok ? "✓" : "!") + '</i><span><b>' + esc(r.titulo) + '</b>' +
          (!r.ok && r.bloquea ? '<span class="lb-bloq">obligatorio</span>' : '') +
          (!r.ok && r.consejo ? '<small>' + esc(r.consejo) + '</small>' : '') + '</span></li>';
      });
      h += '</ul>';
    }
    if (op.esperandoIA) {
      h += '<div class="lb-ia lb-ia-espera"><p><span class="lb-giro" aria-hidden="true"></span> La IA está leyendo tu prompt… <small>(unos segundos; las reglas ya cuentan)</small></p></div>';
    } else if (d.ia) {
      var ia = d.ia, lista = function (xs) { return (Array.isArray(xs) && xs.length) ? '<ul>' + xs.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join("") + '</ul>' : '<p><small>—</small></p>'; };
      h += '<div class="lb-ia">' +
        (ia.comentario ? '<p>' + esc(ia.comentario) + '</p>' : '') +
        '<div class="lb-g2"><div><h4>Lo que ya tiene</h4>' + lista(ia.fortalezas) + '</div><div><h4>Lo que le falta</h4>' + lista(ia.falta) + '</div></div>' +
        (ia.pregunta ? '<p class="lb-preg">Piénsalo: ' + esc(ia.pregunta) + '</p>' : '') +
        '<small>Comentario de la IA' + (ia.motor ? ' · ' + esc(ia.motor) : '') + '. La IA no te escribe el prompt: te da criterio.</small></div>';
    } else {
      h += '<div class="lb-ia"><p><small>La IA no respondió esta vez' + (d.ia_error ? ' (' + esc(String(d.ia_error).slice(0, 120)) + ')' : '') +
        '. Las reglas de arriba sí cuentan: guíate por ellas.</small></p></div>';
    }
    var antes = caja.querySelector(".lb-barra > i");
    var desde = antes ? antes.style.width : "0%";
    caja.innerHTML = h;
    var barra = caja.querySelector(".lb-barra > i");
    barra.style.width = desde;
    requestAnimationFrame(function () { requestAnimationFrame(function () { barra.style.width = pct + "%"; }); });
  }

  /* ---------------- Laboratorio completo ---------------- */
  /* En pantallas angostas el resultado queda abajo: se lleva a la vista. */
  function aLaVista(el) {
    if (!el || window.innerWidth > 900) return;
    try { el.scrollIntoView({ behavior: "smooth", block: "start" }); } catch (e) { el.scrollIntoView(); }
  }
  var cuentaLab = 0;
  function laboratorio(raiz, cfg) {
    cuentaLab++;
    var id = "lb" + cuentaLab, tipo = cfg.tipo || "robot", clave = cfg.clave || ("g5-03-prompt-" + tipo);
    var ideas = (cfg.ideas || []).map(function (x) {
      return '<li' + (x.rec ? ' class="rec"' : '') + '><b>' + esc(x.nombre) + (x.rec ? ' <span class="lb-tag">recomendado</span>' : '') + '</b><span>' + esc(x.pro) + '</span></li>';
    }).join("");
    raiz.innerHTML =
      '<div class="lb">' +
      '<div class="lb-col">' +
      '<section class="lb-caja lb-pista"><h2>La forma <small>completa los huecos con TUS palabras</small></h2>' +
      (cfg.contexto ? '<div class="lb-contexto" id="' + id + '-ctx">Leyendo tu asistente.json…</div>' : '') +
      '<p class="lb-patron">' + cfg.patron + '</p>' +
      (cfg.ojo ? '<p class="lb-ojo">' + cfg.ojo + '</p>' : '') + '</section>' +
      (ideas ? '<section class="lb-caja"><h2>' + esc(cfg.ideasTitulo || "Opciones") + (cfg.ideasNota ? ' <small>' + esc(cfg.ideasNota) + '</small>' : '') + '</h2><ul class="lb-ideas">' + ideas + '</ul></section>' : '') +
      '<section class="lb-caja lb-editor">' +
      '<label class="lb-lab" for="' + id + '-txt">' + esc(cfg.etiqueta || "Tu prompt") + '</label>' +
      '<textarea id="' + id + '-txt" rows="7" spellcheck="true" placeholder="' + esc(cfg.placeholder || "Escribe aquí con tus palabras…") + '"></textarea>' +
      '<div class="lb-herr">' +
      '<button type="button" class="lb-btn sec lb-mic" id="' + id + '-mic" aria-pressed="false">🎤 <span>Dictar</span></button>' +
      '<button type="button" class="lb-btn sec lb-oir" id="' + id + '-oir" aria-pressed="false">🔊 <span>Escuchar</span></button>' +
      '<span class="lb-cuenta" id="' + id + '-cuenta">0 palabras</span>' +
      '<button type="button" class="lb-btn lb-derecha" id="' + id + '-cal">Calificar</button>' +
      '</div><p class="lb-estado" id="' + id + '-est" aria-live="polite"></p></section>' +
      '</div>' +
      '<div class="lb-col">' +
      '<section class="lb-caja"><h2>Tu nota <small>reglas fijas + comentario de la IA</small></h2><div id="' + id + '-nota" aria-live="polite"><p class="lb-vacio">Escribe tu prompt y pulsa <b>Calificar</b>. Verás qué tiene, qué le falta y una pregunta para pensarlo mejor.</p></div></section>' +
      (cfg.agente ? (
        '<section class="lb-caja"><h2>Tu agente <small>' + esc(cfg.agenteNota || "trabaja solo dentro de tu aula") + '</small></h2>' +
        '<div class="lb-agente-cab"><button type="button" class="lb-btn grande" id="' + id + '-env" disabled>🚀 Enviar a mi agente</button>' +
        '<span class="lb-reloj" id="' + id + '-reloj" hidden>⏱ 0:00</span></div>' +
        '<p class="lb-por" id="' + id + '-por"></p>' +
        '<div id="' + id + '-aviso"></div>' +
        '<pre class="lb-log" id="' + id + '-log" hidden aria-label="Registro de tu agente" tabindex="0"></pre>' +
        '<div id="' + id + '-res"></div>' +
        '<div id="' + id + '-ult"></div></section>'
      ) : '') +
      '</div></div>';

    var $ = function (s) { return document.getElementById(id + "-" + s); };
    var txt = $("txt"), est = $("est"), nota = $("nota"), cal = $("cal");
    var st = { turno: 0, calif: null, textoCalif: null, corriendo: false, vioFin: false, sondeo: null, reloj: null, desde: 0, lineas: [] };

    function decir(t, mal) { est.textContent = t || ""; est.classList.toggle("mal", !!mal); }
    var borrador = leer(clave);
    if (borrador) txt.value = borrador;
    function alEscribir() {
      var n = palabras(txt.value);
      $("cuenta").textContent = n + (n === 1 ? " palabra" : " palabras");
      guardar(clave, txt.value || null);
      actualizar();
    }
    txt.addEventListener("input", alEscribir);

    dictado({ boton: $("mic"), campo: txt, estado: est });
    botonVoz($("oir"), function () { return txt.value; }, est);

    if (cfg.contexto) {
      miRobo().then(function (d) {
        var c = $("ctx"), a = (d && d.asistente) || {};
        if (d && d.existe) {
          var m = a.marca || {};
          c.innerHTML = 'Tu agente puede leer tu <code>asistente.json</code>: ' +
            '<span class="lb-pastilla">🤖 ' + esc(a.nombre || "tu Robo") + '</span>' +
            (a.negocio && a.negocio.nombre ? '<span class="lb-pastilla">' + esc(a.negocio.nombre) + '</span>' : '') +
            '<span class="lb-pastilla"><i style="background:' + esc(m.primario || "#5a49d6") + '"></i><i style="background:' + esc(m.acento || "#9d8cff") + '"></i> tus colores</span>' +
            '<span class="lb-pastilla">' + (a.total_preguntas || (a.preguntas || []).length || 0) + ' preguntas</span>';
        } else {
          c.innerHTML = 'No encontré tu <code>asistente.json</code>: el agente partirá del ejemplo de la cafetería. <b>Describe tu negocio en el prompt</b> (nombre, cómo habla, qué le preguntan).';
        }
      }, function () { $("ctx").textContent = "No pude leer tu asistente.json ahora; igual puedes escribir tu prompt."; });
    }

    cal.addEventListener("click", function () {
      var t = txt.value.trim();
      if (palabras(t) < 6) { decir("Escribe un poco más: un buen prompt dice qué, con qué, dónde y cómo comprobarlo.", true); txt.focus(); return; }
      var turno = ++st.turno;
      cal.disabled = true; decir("Calificando tu prompt…");
      nota.setAttribute("aria-busy", "true");
      function listoDe(d) {
        decir(d.listo ? "¡Listo para tu agente!" + (cfg.agente ? " Ya puedes enviarlo." : "") : "Todavía no: mejora lo que marca la lista y vuelve a calificar.");
      }
      /* 1) reglas al instante; 2) la misma nota con el comentario de la IA. */
      calificar(t, tipo, true).then(function (d) {
        if (turno !== st.turno) return;
        st.calif = d; st.textoCalif = t;
        pintarNota(nota, d, { esperandoIA: true });
        listoDe(d); actualizar(); aLaVista(nota.parentNode);
        if (cfg.alCalificar) cfg.alCalificar(d, t);
      }, function () { /* sin reglas rápidas: queda la llamada completa */ })
        .then(function () { if (turno === st.turno) cal.disabled = false; return calificar(t, tipo, false); })
        .then(function (d) {
          if (turno !== st.turno) return;
          st.calif = d; st.textoCalif = t;
          pintarNota(nota, d);
          listoDe(d);
          if (cfg.alCalificar) cfg.alCalificar(d, t);
        }, function (e) {
          if (turno !== st.turno) return;
          if (st.calif && st.textoCalif === t) {
            var p = nota.querySelector(".lb-ia-espera");
            if (p) p.innerHTML = "<p><small>La IA no respondió esta vez (" + esc(mensaje(e, "pedir el comentario")) + "). Las reglas de arriba sí cuentan.</small></p>";
          } else decir(mensaje(e, "calificar"), true);
        })
        .then(function () { if (turno !== st.turno) return; cal.disabled = false; nota.removeAttribute("aria-busy"); actualizar(); });
    });

    function actualizar() {
      if (!cfg.agente) return;
      var env = $("env"), por = $("por"), t = txt.value.trim(), razon;
      var puede = false;
      if (st.corriendo) razon = "Tu agente está trabajando. Mira su avance abajo (puede tardar de 2 a 6 minutos).";
      else if (!st.calif) razon = "Primero califica tu prompt: este botón se activa con nivel «listo» (60 o más y sin reglas obligatorias pendientes).";
      else if (t !== st.textoCalif) razon = "Cambiaste el prompt después de calificarlo: vuelve a pulsar «Calificar».";
      else if (!st.calif.listo) razon = "Todavía no está listo: mejora lo que marca la lista y califícalo otra vez.";
      else { puede = true; razon = "Tu prompt está listo. Al enviarlo, tu agente trabajará solo en tu aula; tú miras y aprendes de lo que hace."; }
      env.disabled = !puede;
      por.textContent = razon;
    }

    if (!cfg.agente) { alEscribir(); return { campo: txt }; }

    var log = $("log"), res = $("res"), aviso = $("aviso"), reloj = $("reloj");
    var pendiente = false;
    function pintarLog() {
      pendiente = false;
      var abajo = log.scrollHeight - log.scrollTop - log.clientHeight < 48;
      log.innerHTML = st.lineas.map(function (l) { return l.c ? '<span class="' + l.c + '">' + esc(l.x) + '</span>' : esc(l.x); }).join("\n");
      if (abajo) log.scrollTop = log.scrollHeight;
    }
    function agregar(x, c) {
      String(x == null ? "" : x).split("\n").forEach(function (l) { st.lineas.push({ x: l, c: c || "" }); });
      if (st.lineas.length > 200) st.lineas = st.lineas.slice(-200);
      log.hidden = false;
      if (!pendiente) { pendiente = true; requestAnimationFrame(pintarLog); }
    }
    function ponerAviso(t, info) { aviso.innerHTML = t ? '<p class="lb-aviso' + (info ? ' info' : '') + '">' + esc(t) + '</p>' : ""; }
    function relojEmpieza(desde) {
      st.desde = desde; reloj.hidden = false; reloj.classList.add("vivo");
      clearInterval(st.reloj);
      var tick = function () { var s = Math.max(0, Math.floor((Date.now() - st.desde) / 1000)); reloj.textContent = "⏱ " + Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0") + " · tope 8:00"; };
      tick(); st.reloj = setInterval(tick, 1000);
    }
    function relojPara(seg) {
      clearInterval(st.reloj); reloj.classList.remove("vivo");
      if (seg != null) reloj.textContent = "⏱ " + duracion(seg);
    }
    function ultimo(texto) {
      $("ult").innerHTML = texto ? '<details class="lb-ultimo"><summary>El prompt que le enviaste</summary><p>' + esc(texto) + '</p></details>' : "";
    }

    function terminar(ev) {
      st.corriendo = false; st.vioFin = true;
      clearInterval(st.sondeo); st.sondeo = null;
      var seg = ev.segundos != null ? ev.segundos : (st.desde ? (Date.now() - st.desde) / 1000 : null);
      relojPara(seg);
      ponerAviso("");
      var ruta = ev.ruta || cfg.ruta || "robo3d/index.html";
      /* Al retomar, la corrida puede ser de otra escena (el estado del agente es uno por alumno):
         manda su ruta. «ruta» vacía = no hay página que abrir (p. ej. WhatsApp). */
      var sinVisor = ev.retomado ? !ev.ruta : !!cfg.sinVisor;
      var notaPropia = !ev.retomado || sinVisor === !!cfg.sinVisor;
      if (ev.ok && sinVisor) {
        /* Corridas sin página que abrir (p. ej. WhatsApp: el agente toca el backend, ruta ""). */
        var lista = Array.isArray(ev.archivos) && ev.archivos.length ? ' · archivos: ' + ev.archivos.slice(0, 6).map(esc).join(", ") : "";
        res.innerHTML = '<div class="lb-exito" role="status">' +
          '<h3>' + esc(ev.retomado ? "Tu última corrida terminó bien" : (cfg.exitoTitulo || "¡Listo!")) + '</h3>' +
          (cfg.exitoNota && notaPropia ? '<p>' + cfg.exitoNota + '</p>' : '') +
          '<small>' + (seg != null ? 'Tu agente tardó ' + duracion(seg) + lista + '.' : lista) + '</small></div>';
        if (!ev.retomado) aLaVista(res);
      } else if (ev.ok) {
        var archivos = Array.isArray(ev.archivos) && ev.archivos.length ? ' · archivos: ' + ev.archivos.slice(0, 6).map(esc).join(", ") : "";
        res.innerHTML = '<div class="lb-exito" role="status">' +
          '<h3>' + esc(ev.retomado ? "Tu última corrida terminó bien" : (cfg.exitoTitulo || "¡Tu Robo cobró vida!")) + '</h3>' +
          '<p>Abre el <b>Visor</b> → <code>' + esc(ruta) + '</code></p>' +
          '<div class="lb-acciones"><button type="button" class="lb-btn ok grande" data-acc="visor">👀 Abrir en el Visor</button>' +
          '<button type="button" class="lb-btn sec" data-acc="copiar">Copiar la ruta</button></div>' +
          '<small>Si no se abre solo: pestaña <b>Visor</b> del panel → elige <b>robo3d</b> en «Proyectos…» o escribe la ruta. ' +
          (seg != null ? 'Tu agente tardó ' + duracion(seg) + archivos + '.' : '') + '</small>' +
          (cfg.exitoNota && notaPropia ? '<small>' + cfg.exitoNota + '</small>' : '') + '</div>';
        res.querySelector('[data-acc="visor"]').addEventListener("click", function () { abrirVisor(ruta); });
        var bc = res.querySelector('[data-acc="copiar"]');
        bc.addEventListener("click", function () { copiar(ruta).then(function (ok) { bc.textContent = ok ? "¡Copiada!" : "Copia: " + ruta; }); });
        if (!ev.retomado) { abrirVisor(ruta); aLaVista(res); }
      } else {
        res.innerHTML = '<div class="lb-exito mal" role="status"><h3>Tu agente terminó sin dejar el robot listo</h3>' +
          '<p>Lee las últimas líneas del registro: ¿qué le faltó saber o qué no pudo hacer?</p>' +
          '<small>Agrégalo a tu prompt con tus palabras, califícalo y envíalo otra vez. Eso también es criterio.</small></div>';
      }
      if (cfg.alTerminar) cfg.alTerminar(ev);
      actualizar();
    }

    function procesar(linea) {
      linea = String(linea || "").trim();
      if (!linea) return;
      var ev;
      try { ev = JSON.parse(linea); } catch (e) { agregar(linea); return; }
      if (ev.t === "inicio") agregar("▶ Tu agente empezó" + (ev.motor ? " (" + ev.motor + ")" : "") + ".", "s");
      else if (ev.t === "log") agregar(ev.x);
      else if (ev.t === "error") agregar("✖ " + (ev.x || "error"), "x");
      else if (ev.t === "latido") { if (ev.segundos != null && st.corriendo) relojEmpieza(Date.now() - ev.segundos * 1000); }
      else if (ev.t === "fin") { agregar(ev.ok ? "■ Terminó bien." : "■ Terminó con problemas.", ev.ok ? "s" : "x"); terminar(ev); }
    }

    /* Sin el flujo (recarga, corte de red o 409): se consulta el estado cada 3 s. */
    function sondear() {
      clearInterval(st.sondeo);
      var fallos = 0;
      var una = function () {
        pedirJSON("/agente").then(function (d) {
          fallos = 0;
          if (Array.isArray(d.log) && d.log.length) { st.lineas = d.log.map(function (x) { return { x: String(x), c: "" }; }); log.hidden = false; pintarLog(); }
          if (d.inicio && !st.desde) relojEmpieza(Date.parse(d.inicio) || Date.now());
          if (d.fin) { ultimo(d.texto); terminar({ ok: d.ok, ruta: d.ruta, segundos: d.segundos, archivos: d.archivos, retomado: !st.corriendo }); }
          else if (!d.corriendo) { st.corriendo = false; clearInterval(st.sondeo); relojPara(null); ponerAviso("Tu agente ya no está corriendo y no dejó un resultado. Vuelve a enviar tu prompt."); actualizar(); }
        }, function (e) {
          if (++fallos >= 5) { clearInterval(st.sondeo); st.corriendo = false; relojPara(null); ponerAviso(mensaje(e, "consultar a tu agente")); actualizar(); }
        });
      };
      una(); st.sondeo = setInterval(una, 3000);
    }

    async function leerFlujo(r) {
      if (!r.body || !r.body.getReader) { (await r.text()).split("\n").forEach(procesar); return; }
      var rd = r.body.getReader(), dec = new TextDecoder(), buf = "";
      for (;;) {
        var x = await rd.read();
        if (x.done) break;
        buf += dec.decode(x.value, { stream: true });
        var partes = buf.split("\n"); buf = partes.pop();
        partes.forEach(procesar);
      }
      buf += dec.decode();
      if (buf.trim()) procesar(buf);
    }

    /* Retoma una corrida en curso: GET agente?seguir=1 repite el flujo desde el principio. Si falla, sondeo. */
    async function seguir() {
      st.corriendo = true; st.vioFin = false; actualizar();
      try {
        var r = await pedir("/agente?seguir=1");
        var tipoR = (r.headers.get("Content-Type") || "").toLowerCase();
        if (tipoR.indexOf("ndjson") < 0) { sondear(); return; }
        st.lineas = [];
        await leerFlujo(r);
      } catch (e) { if (st.vioFin) return; }
      if (!st.vioFin) sondear();
    }

    async function enviar() {
      var t = txt.value.trim();
      if (st.corriendo || !st.calif || !st.calif.listo || t !== st.textoCalif) return;
      st.corriendo = true; st.vioFin = false; st.lineas = []; res.innerHTML = ""; ponerAviso("");
      ultimo(t); actualizar();
      relojEmpieza(Date.now());
      agregar("▶ Enviando tu prompt a tu agente…", "s");
      aLaVista($("env"));
      var conectado = false;
      try {
        var r = await pedir("/agente", { method: "POST", body: { texto: t, tipo: tipo } });
        conectado = true;
        await leerFlujo(r);
      } catch (e) {
        if (e.status === 409) { ponerAviso(mensaje(e), true); seguir(); return; }
        if (!conectado || e.status) {
          st.corriendo = false; relojPara(null); st.lineas = []; log.hidden = true;
          ponerAviso(mensaje(e, "enviar tu prompt"));
          if (e.status === 422) { st.calif = null; }
          actualizar(); return;
        }
        agregar("… se cortó la conexión; sigo el avance de tu agente desde el servidor.", "s");
        sondear(); return;
      }
      if (!st.vioFin) { agregar("… el registro terminó antes del final; le pregunto al servidor.", "s"); sondear(); }
    }
    $("env").addEventListener("click", enviar);

    /* Al cargar: ¿hay una corrida en curso o terminada? Se retoma. */
    pedirJSON("/agente").then(function (d) {
      if (!d || st.corriendo) return;
      if (d.corriendo) {
        st.corriendo = true; actualizar();
        ultimo(d.texto);
        ponerAviso("Tu agente sigue trabajando en tu último encargo: lo retomé aquí.", true);
        relojEmpieza(Date.parse(d.inicio) || (Date.now() - (d.segundos || 0) * 1000));
        if (Array.isArray(d.log) && d.log.length) { st.lineas = d.log.map(function (x) { return { x: String(x), c: "" }; }); log.hidden = false; pintarLog(); }
        seguir();
      } else if (d.fin) {
        if (Array.isArray(d.log) && d.log.length) { st.lineas = d.log.map(function (x) { return { x: String(x), c: "" }; }); log.hidden = false; pintarLog(); }
        ultimo(d.texto);
        terminar({ ok: d.ok, ruta: d.ruta, segundos: d.segundos, archivos: d.archivos, retomado: true });
      }
    }, function () { /* sin estado previo */ });

    alEscribir();
    return { campo: txt };
  }

  /* ---------------- Muro del grupo ---------------- */
  var muro = {
    leer: function (escena) { return pedirJSON("/muro?escena=" + encodeURIComponent(escena)).then(function (d) { return (d && d.entradas) || []; }); },
    publicar: function (escena, texto) { return pedirJSON("/muro", { method: "POST", body: { escena: escena, texto: texto } }).then(function (d) { return (d && d.entradas) || []; }); }
  };

  window.Lab = {
    leccion: leccion, esc: esc, leer: leer, guardar: guardar, palabras: palabras, duracion: duracion,
    pedir: pedir, pedirJSON: pedirJSON, mensaje: mensaje, miRobo: miRobo, copiar: copiar, abrirVisor: abrirVisor,
    dictado: dictado, botonVoz: botonVoz, hablar: hablar, callar: callar, aWav: aWav,
    calificar: calificar, pintarNota: pintarNota, aLaVista: aLaVista, laboratorio: laboratorio, muro: muro
  };
})();
