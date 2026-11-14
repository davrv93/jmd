// fotito.js · «La fotito» de Claude Code PRO: arma en un <canvas> una tarjeta vertical de 1080x1350 con el
// nombre, el avatar, el curso, la sesión, el resultado y la reflexión del alumno, y la deja lista para
// guardar como PNG. El fondo es un árbol fractal dibujado por recursión (el plan recursivo de la sesión 2).
//
//   <script src="../../comun/ccp.js"></script>
//   <script src="../../comun/fotito.js"></script>
//   CCFoto.montar(contenedor, function () { return {nombre, avatar, etiqueta, resultado, detalle, reflexion}; }, {texto, auto})
//
// Cómo se guarda (revisado el 08-11-2026 en lms/web/src/components/live-alumno.tsx y en cspEscena):
//   · El iframe del LIVE lleva sandbox="allow-scripts allow-same-origin" SIN allow-downloads (solo lo llevan
//     las escenas de ESCENAS_CON_DESCARGA), así que dentro de la clase un <a download> se ignora en silencio.
//   · La CSP deja img-src data:, así que la tarjeta se muestra como <img> con un data: URL: en el celular se
//     mantiene presionada → «Guardar imagen»; en la PC, clic derecho → «Guardar imagen como…».
//   · «Descargar PNG» se intenta igual: funciona con la escena abierta suelta o si algún día el LMS le da
//     allow-downloads a estas escenas. La ayuda bajo la imagen ya dice qué hacer si no pasa nada.
//   · «Compartir» (Web Share con archivo) solo aparece si el navegador dice que puede.
(function () {
  var W = 1080, H = 1350;
  var EMOJI = "'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif";
  var SANS = "system-ui,-apple-system,'Segoe UI',Roboto,sans-serif";
  var CURSO = "Claude Code PRO";
  var GRUPO = "Grupo 1 · Sesión 2";
  var SESION = "Sesión 2 · Reglas, plantillas y prompts: tu primer render";
  var FECHA = "Sábado 14 de noviembre de 2026";

  function envolver(ctx, texto, ancho, max) {
    var palabras = String(texto || "").split(/\s+/).filter(Boolean), lineas = [], l = "";
    for (var i = 0; i < palabras.length; i++) {
      var p = l ? l + " " + palabras[i] : palabras[i];
      if (ctx.measureText(p).width > ancho && l) { lineas.push(l); l = palabras[i]; } else l = p;
    }
    if (l) lineas.push(l);
    if (lineas.length > max) { lineas = lineas.slice(0, max); lineas[max - 1] = lineas[max - 1].replace(/\s*\S*$/, "") + "…"; }
    return lineas;
  }
  function redondo(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  // Árbol fractal: cada rama se divide en dos hasta la hoja (profundidad 0), que se pinta como estrella.
  function rama(ctx, x, y, largo, ang, prof, rnd) {
    var x2 = x + Math.cos(ang) * largo, y2 = y + Math.sin(ang) * largo;
    ctx.strokeStyle = "rgba(195,185,255," + (0.12 + prof * 0.05) + ")"; ctx.lineWidth = Math.max(1, prof * 1.6);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y2); ctx.stroke();
    if (prof === 0) {
      ctx.fillStyle = rnd() > .55 ? "rgba(233,189,82,.9)" : "rgba(79,211,122,.85)";
      ctx.beginPath(); ctx.arc(x2, y2, 3 + rnd() * 3, 0, 7); ctx.fill();
      return;
    }
    var abre = 0.32 + rnd() * 0.18;
    rama(ctx, x2, y2, largo * (0.68 + rnd() * 0.1), ang - abre, prof - 1, rnd);
    rama(ctx, x2, y2, largo * (0.68 + rnd() * 0.1), ang + abre, prof - 1, rnd);
  }

  function dibujar(canvas, d) {
    canvas.width = W; canvas.height = H;
    var ctx = canvas.getContext("2d");
    var g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#12112a"); g.addColorStop(.55, "#1d1946"); g.addColorStop(1, "#0f2a2a");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    var s = 11; function rnd() { s = (s * 48271) % 2147483647; return s / 2147483647; }
    for (var i = 0; i < 80; i++) {
      ctx.globalAlpha = .2 + rnd() * .6; ctx.fillStyle = rnd() > .8 ? "#e9bd52" : "#c3b9ff";
      ctx.beginPath(); ctx.arc(rnd() * W, rnd() * H, .8 + rnd() * 2, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = .75; ctx.lineCap = "round";
    rama(ctx, 880, 1250, 140, -Math.PI / 2 - .12, 8, rnd);
    ctx.globalAlpha = 1;

    // Cabecera
    ctx.textBaseline = "alphabetic"; ctx.textAlign = "left";
    ctx.fillStyle = "#a99cff"; ctx.font = "700 30px " + SANS;
    ctx.fillText("JMD LEARNING · CLASE EN VIVO", 80, 110);
    ctx.fillStyle = "#ffffff"; ctx.font = "800 84px " + SANS;
    ctx.fillText(CURSO, 80, 204);
    ctx.fillStyle = "#d9d4ff"; ctx.font = "600 36px " + SANS;
    ctx.fillText(GRUPO, 80, 258);

    // Avatar y nombre
    ctx.fillStyle = "rgba(255,255,255,.08)"; ctx.strokeStyle = "#e9bd52"; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.arc(210, 440, 120, 0, 7); ctx.fill(); ctx.stroke();
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = "140px " + EMOJI; ctx.fillStyle = "#ffffff";
    ctx.fillText(d.avatar || "🦊", 210, 450);
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#ffffff"; ctx.font = "800 62px " + SANS;
    var nom = envolver(ctx, d.nombre || "Alumno", 610, 2);
    var y0 = 420 - (nom.length - 1) * 34;
    nom.forEach(function (l, k) { ctx.fillText(l, 380, y0 + k * 70); });
    ctx.fillStyle = "#b7b4cc"; ctx.font = "600 31px " + SANS;
    ctx.fillText(FECHA, 380, y0 + nom.length * 70 - 8);

    // Resultado
    redondo(ctx, 80, 620, W - 160, 290, 36);
    ctx.fillStyle = "rgba(20,18,43,.9)"; ctx.fill();
    ctx.strokeStyle = "rgba(79,211,122,.6)"; ctx.lineWidth = 4; ctx.stroke();
    ctx.fillStyle = "#4fd37a"; ctx.font = "700 30px " + SANS;
    ctx.fillText((d.etiqueta || "MI RESULTADO").toUpperCase(), 130, 682);
    // El resultado va en una línea: la letra se achica hasta que entra (de 96 a 52 px).
    var tam = 96, res = String(d.resultado || "—");
    do { ctx.font = "800 " + tam + "px " + SANS; tam -= 4; } while (tam >= 52 && ctx.measureText(res).width > W - 260);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(envolver(ctx, res, W - 260, 1)[0], 126, 792);
    ctx.fillStyle = "#d9d4ff"; ctx.font = "600 33px " + SANS;
    envolver(ctx, d.detalle || "", W - 260, 2).forEach(function (l, k) { ctx.fillText(l, 130, 848 + k * 42); });

    // Reflexión
    ctx.fillStyle = "#a99cff"; ctx.font = "700 30px " + SANS;
    ctx.fillText("MI REFLEXIÓN", 80, 990);
    ctx.fillStyle = "#ffffff"; ctx.font = "italic 600 42px " + SANS;
    var refl = d.reflexion ? "«" + d.reflexion + "»" : "«Divido hasta que cada hoja tiene su prueba, y el cerebro guarda solo lo que dura.»";
    envolver(ctx, refl, W - 300, 4).forEach(function (l, k) { ctx.fillText(l, 80, 1048 + k * 54); });

    // Pie
    ctx.fillStyle = "rgba(255,255,255,.18)"; ctx.fillRect(80, 1252, W - 160, 2);
    ctx.fillStyle = "#d9d4ff"; ctx.font = "600 27px " + SANS;
    ctx.fillText(SESION, 80, 1296);
    ctx.textAlign = "right"; ctx.fillStyle = "#e9bd52"; ctx.font = "700 27px " + SANS;
    ctx.fillText("jmd-learn.online", W - 80, 1296);
    return canvas.toDataURL("image/png");
  }

  function nombreArchivo(d) {
    var n = String(d.nombre || "alumno").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return "fotito-ccp-02-" + (n || "alumno") + ".png";
  }

  var CSS =
    ".ft{display:grid;gap:.6em;justify-items:start}" +
    ".ft-img{display:block;width:100%;max-width:19em;height:auto;border-radius:.8em;box-shadow:0 12px 34px -14px rgba(0,0,0,.6);border:1px solid var(--line2);-webkit-touch-callout:default;user-select:auto}" +
    ".ft-acc{display:flex;gap:.5em;flex-wrap:wrap}" +
    ".ft-ayuda{font-size:.64em;color:var(--muted);margin:0;max-width:32em}" +
    ".ft-ayuda b{color:var(--fg)}" +
    "@media (max-width:860px){.ft-ayuda{font-size:.85em}.ft-img{max-width:100%}}";

  function montar(raiz, datosFn, cfg) {
    cfg = cfg || {};
    if (!document.getElementById("ft-css")) { var st = document.createElement("style"); st.id = "ft-css"; st.textContent = CSS; document.head.appendChild(st); }
    raiz.classList.add("ft");
    raiz.textContent = "";
    var acc = document.createElement("div"); acc.className = "ft-acc";
    var gen = document.createElement("button"); gen.type = "button"; gen.className = "cc-btn"; gen.textContent = cfg.texto || "📸 Generar mi fotito";
    var desc = document.createElement("button"); desc.type = "button"; desc.className = "cc-btn sec"; desc.textContent = "⬇ Descargar PNG"; desc.hidden = true;
    var comp = document.createElement("button"); comp.type = "button"; comp.className = "cc-btn sec"; comp.textContent = "Compartir"; comp.hidden = true;
    acc.appendChild(gen); acc.appendChild(desc); acc.appendChild(comp);
    raiz.appendChild(acc);
    var img = document.createElement("img"); img.className = "ft-img"; img.alt = "Tu fotito de la sesión 2"; img.hidden = true;
    raiz.appendChild(img);
    var ayuda = document.createElement("div"); ayuda.className = "ft-ayuda"; ayuda.hidden = true;
    ayuda.innerHTML = "<b>En el celular:</b> mantén presionada la imagen y elige «Guardar imagen». <b>En la PC:</b> clic derecho → «Guardar imagen como…». Si «Descargar PNG» no hace nada dentro de la clase, es la seguridad del LMS: usa la imagen.";
    raiz.appendChild(ayuda);
    var canvas = document.createElement("canvas");
    var url = "", datos = null, archivo = null;

    function generar() {
      datos = datosFn() || {};
      try { url = dibujar(canvas, datos); } catch (e) { url = ""; }
      if (!url) return "";
      img.src = url; img.hidden = false; ayuda.hidden = false; desc.hidden = false;
      gen.textContent = "↻ Volver a generar";
      archivo = null; comp.hidden = true;
      try {
        canvas.toBlob(function (b) {
          if (!b) return;
          try {
            var f = new File([b], nombreArchivo(datos), { type: "image/png" });
            if (navigator.canShare && navigator.canShare({ files: [f] })) { archivo = f; comp.hidden = false; }
          } catch (e) {}
        }, "image/png");
      } catch (e) {}
      if (cfg.alGenerar) cfg.alGenerar(url, datos);
      return url;
    }
    gen.addEventListener("click", generar);
    desc.addEventListener("click", function () {
      if (!url) generar();
      try {
        var a = document.createElement("a"); a.href = url; a.download = nombreArchivo(datos || {});
        a.rel = "noopener"; document.body.appendChild(a); a.click(); a.remove();
      } catch (e) {}
      ayuda.classList.remove("a-pop"); void ayuda.offsetWidth; ayuda.classList.add("a-pop");
    });
    comp.addEventListener("click", function () {
      if (!archivo) return;
      try { navigator.share({ files: [archivo], title: "Mi fotito · Claude Code PRO" }).catch(function () { comp.hidden = true; }); } catch (e) { comp.hidden = true; }
    });
    if (cfg.auto) generar();
    return { generar: generar, url: function () { return url; } };
  }

  window.CCFoto = { dibujar: dibujar, montar: montar, FECHA: FECHA, SESION: SESION };
})();
