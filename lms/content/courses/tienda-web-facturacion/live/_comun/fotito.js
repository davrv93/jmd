// fotito.js · «Guardar la fotito»: arma en un <canvas> una tarjeta vertical de 1080x1350 con el nombre y el
// avatar del alumno, el curso y la sesión, su resultado y su reflexión de una línea, y la deja lista para guardar.
//
//   <script src="../../comun/fotito.js"></script>   (después de tw.js)
//   TWFoto.montar(contenedor, function () { return {nombre, avatar, resultado, detalle, reflexion}; })
//
// Cómo se guarda (revisado el 08-11-2026 en lms/web/src/components/live-alumno.tsx y en la CSP de las escenas):
//   · El iframe del LIVE lleva sandbox="allow-scripts allow-same-origin" y SOLO tres escenas con nombre fijo
//     (ESCENAS_CON_DESCARGA) tienen allow-downloads. Un <a download> en estas escenas se ignora en silencio.
//   · La CSP deja img-src data: (no blob:), así que la tarjeta se muestra como <img src="data:image/png…">:
//     en el celular se mantiene presionada → «Guardar imagen»; en la PC, clic derecho → «Guardar imagen como…».
//   · El botón «Descargar PNG» solo aparece si el marco lo permite (escena abierta suelta o con allow-downloads):
//     se lee el atributo sandbox de window.frameElement, que con allow-same-origin es accesible.
//   · «Copiar imagen» usa el portapapeles (el iframe trae allow="clipboard-write"); sirve para pegarla en WhatsApp Web.
(function () {
  var W = 1080, H = 1350;
  var EMOJI = "'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif";
  var SANS = "system-ui,-apple-system,'Segoe UI',Roboto,'Helvetica Neue',sans-serif";
  var MONO = "ui-monospace,'SF Mono',Menlo,Consolas,monospace";

  function envolver(ctx, texto, ancho, max) {
    var pal = String(texto || "").split(/\s+/).filter(Boolean), lin = [], l = "";
    for (var i = 0; i < pal.length; i++) {
      var p = l ? l + " " + pal[i] : pal[i];
      if (ctx.measureText(p).width > ancho && l) { lin.push(l); l = pal[i]; } else l = p;
    }
    if (l) lin.push(l);
    if (lin.length > max) { lin = lin.slice(0, max); lin[max - 1] = lin[max - 1].replace(/\s*\S*$/, "") + "…"; }
    return lin;
  }
  function redondo(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  // Dibuja la tarjeta. Estilo del flyer: papel, tinta y una trama de puntos rojos.
  function dibujar(d) {
    var TW = window.TW || { CURSO: {}, sesion: {}, n: 1 };
    var c = document.createElement("canvas"); c.width = W; c.height = H;
    var x = c.getContext("2d");
    x.fillStyle = "#f7f4ec"; x.fillRect(0, 0, W, H);
    // trama de puntos (círculo grande arriba a la derecha)
    x.fillStyle = "#e0402a";
    for (var gy = 0; gy < 400; gy += 30) for (var gx = 760; gx < W + 30; gx += 30) { // arriba a la derecha, sin tocar el texto
      var dx = gx - 1000, dy = gy - 120, dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 360) { x.beginPath(); x.arc(gx, gy, 9 * (1 - dist / 470), 0, Math.PI * 2); x.fill(); }
    }
    // marco
    x.strokeStyle = "#16151d"; x.lineWidth = 10; x.strokeRect(36, 36, W - 72, H - 72);
    // cabecera
    x.fillStyle = "#16151d"; x.font = "700 34px " + MONO; x.textBaseline = "alphabetic";
    x.fillText("JMD Learning / " + (TW.CURSO.serie || ""), 86, 128);
    x.font = "800 74px " + SANS;
    var tit = envolver(x, TW.CURSO.nombre || "Tienda web con facturación electrónica", 640, 3), y = 232;
    tit.forEach(function (l) { x.fillText(l, 86, y); y += 82; });
    x.font = "600 36px " + SANS; x.fillStyle = "#c8321b";
    envolver(x, "Sesión " + (TW.n || 1) + " · " + (TW.sesion && TW.sesion.titulo || ""), W - 200, 2).forEach(function (l, i) { x.fillText(l, 86, y + 14 + i * 44); });
    // avatar
    var ay = 640;
    x.fillStyle = "#ffffff"; x.beginPath(); x.arc(220, ay + 110, 128, 0, Math.PI * 2); x.fill();
    x.lineWidth = 8; x.strokeStyle = "#16151d"; x.stroke();
    x.font = "150px " + EMOJI; x.textAlign = "center"; x.textBaseline = "middle"; x.fillStyle = "#16151d";
    x.fillText(d.avatar || "🛍️", 220, ay + 118);
    x.textAlign = "left"; x.textBaseline = "alphabetic";
    // nombre y resultado
    x.fillStyle = "#16151d"; x.font = "800 58px " + SANS;
    var nom = envolver(x, d.nombre || "Mi nombre", 560, 2), ny = ay + 70;
    nom.forEach(function (l) { x.fillText(l, 384, ny); ny += 64; });
    x.font = "800 50px " + SANS; x.fillStyle = "#c8321b";
    envolver(x, d.resultado || "", 560, 2).forEach(function (l) { x.fillText(l, 384, ny + 10); ny += 56; });
    if (d.detalle) { x.font = "500 32px " + SANS; x.fillStyle = "#4a4754"; envolver(x, d.detalle, 560, 2).forEach(function (l) { x.fillText(l, 384, ny + 22); ny += 40; }); }
    // reflexión
    var ry = 1000;
    redondo(x, 86, ry, W - 172, 200, 28); x.fillStyle = "#16151d"; x.fill();
    x.fillStyle = "#ffb199"; x.font = "700 28px " + MONO; x.fillText("MI REFLEXIÓN", 122, ry + 52);
    x.fillStyle = "#ffffff"; x.font = "600 38px " + SANS;
    var refl = d.reflexion ? "«" + d.reflexion + "»" : "«Aún no escribí mi reflexión.»";
    envolver(x, refl, W - 250, 3).forEach(function (l, i) { x.fillText(l, 122, ry + 104 + i * 46); });
    // pie
    x.fillStyle = "#16151d"; x.font = "700 30px " + MONO;
    x.fillText((TW.sesion && TW.sesion.fecha ? TW.sesion.fecha + " · " : "") + (TW.CURSO.grupo || ""), 86, H - 76);
    x.textAlign = "right"; x.fillText(TW.CURSO.sitio || "jmd-learn.online", W - 86, H - 76); x.textAlign = "left";
    return c;
  }

  function puedeDescargar() {
    try {
      var f = window.frameElement;
      if (!f) return window === window.top;
      var sb = f.getAttribute("sandbox");
      return sb === null || /(^|\s)allow-downloads(\s|$)/.test(sb);
    } catch (e) { return false; }
  }
  var tactil = (function () { try { return matchMedia("(pointer: coarse)").matches; } catch (e) { return false; } })();

  var CSS = ".twf{display:grid;gap:.6em}.twf-img{display:block;width:100%;max-width:20em;height:auto;border-radius:.6em;border:1px solid var(--line2);box-shadow:var(--card-shadow);-webkit-touch-callout:default;user-select:auto}" +
    ".twf-ayuda{font-size:.66em;color:var(--muted);margin:0}.twf-ayuda b{color:var(--fg)}.twf-fila{display:flex;flex-wrap:wrap;gap:.45em;align-items:center}" +
    "@media (max-width:860px){.twf-ayuda{font-size:.85em}.twf-img{max-width:100%}}";

  function montar(cont, datosFn, op) {
    op = op || {};
    if (!document.getElementById("twf-css")) { var s = document.createElement("style"); s.id = "twf-css"; s.textContent = CSS; document.head.appendChild(s); }
    var TW = window.TW;
    var raiz = TW.el("div", "twf");
    var fila = TW.el("div", "twf-fila");
    var armar = TW.el("button", "tw-btn", op.textoBoton || "📸 Armar mi fotito"); armar.type = "button";
    var bajar = TW.el("button", "tw-btn sec peq", "⬇ Descargar PNG"); bajar.type = "button"; bajar.hidden = true;
    var copiar = TW.el("button", "tw-btn sec peq", "Copiar imagen"); copiar.type = "button"; copiar.hidden = true;
    fila.appendChild(armar); fila.appendChild(bajar); fila.appendChild(copiar);
    var img = TW.el("img", "twf-img"); img.alt = "Tu fotito de la sesión"; img.hidden = true;
    var ayuda = TW.el("p", "twf-ayuda", "Se arma con tu nombre, tu avatar, tu resultado y tu reflexión.");
    raiz.appendChild(fila); raiz.appendChild(img); raiz.appendChild(ayuda);
    cont.appendChild(raiz);
    var canvas = null;
    function hacer() {
      Promise.resolve(datosFn()).then(function (d) {
        canvas = dibujar(d || {});
        img.src = canvas.toDataURL("image/png");
        img.hidden = false;
        var desc = puedeDescargar();
        bajar.hidden = !desc;
        copiar.hidden = !(window.ClipboardItem && canvas.toBlob);
        ayuda.innerHTML = desc
          ? "Listo. Pulsa <b>Descargar PNG</b> o guarda la imagen."
          : (tactil ? "Listo. <b>Mantén presionada la imagen</b> y elige «Guardar imagen» (o «Descargar imagen»)."
                    : "Listo. Haz <b>clic derecho sobre la imagen</b> y elige «Guardar imagen como…». También puedes copiarla y pegarla en WhatsApp.");
        armar.textContent = "↻ Volver a armarla";
        if (op.alArmar) op.alArmar();
      });
    }
    armar.addEventListener("click", hacer);
    bajar.addEventListener("click", function () {
      if (!canvas) return;
      var a = document.createElement("a");
      a.href = img.src; a.download = "fotito-" + (TW.leccion || "sesion") + ".png";
      document.body.appendChild(a); a.click(); a.remove();
    });
    copiar.addEventListener("click", function () {
      if (!canvas) return;
      canvas.toBlob(function (b) {
        var item; try { item = new ClipboardItem({ "image/png": b }); } catch (e) { item = null; }
        var cb = null; try { cb = navigator.clipboard; } catch (e) {}
        function fin(ok) { copiar.textContent = ok ? "✓ Copiada" : "No se pudo copiar"; setTimeout(function () { copiar.textContent = "Copiar imagen"; }, 2200); }
        if (!item || !cb || !cb.write) { fin(false); return; }
        cb.write([item]).then(function () { fin(true); }, function () {
          try { window.parent.navigator.clipboard.write([item]).then(function () { fin(true); }, function () { fin(false); }); } catch (e) { fin(false); }
        });
      }, "image/png");
    });
    return { armar: hacer };
  }

  window.TWFoto = { montar: montar, dibujar: dibujar, puedeDescargar: puedeDescargar };
})();
