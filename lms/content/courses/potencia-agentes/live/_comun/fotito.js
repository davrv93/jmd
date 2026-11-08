// fotito.js · «Guardar la fotito»: arma en un <canvas> una tarjeta de 1080x1350 (formato vertical de
// redes) con el nombre, el avatar, el curso, la fecha, el resultado y la reflexión del alumno, y la deja
// lista para guardar como PNG.
//
//   <script src="../../comun/fotito.js"></script>
//   PTFoto.montar(contenedor, function () { return {nombre, avatar, etiqueta, resultado, detalle, reflexion, clase?, fecha?, leccion?}; })
//
// Cómo se guarda (comprobado el 08-11-2026 en live-alumno.tsx y en la CSP de las escenas):
//   · El iframe del LIVE lleva sandbox="allow-scripts allow-same-origin" SIN allow-downloads (salvo las
//     escenas de ESCENAS_CON_DESCARGA), así que un <a download> se ignora en silencio dentro de la clase.
//   · La CSP sí deja img-src data:, así que la tarjeta se muestra como <img> con un data: URL: en el
//     celular se mantiene presionada → «Guardar imagen»; en la PC, clic derecho → «Guardar imagen como…».
//   · El botón «Descargar PNG» se intenta igual: funciona si la escena se abre suelta o si algún día se
//     le agrega allow-downloads; si no, el texto de ayuda ya dice qué hacer.
//   · «Compartir» (Web Share con archivo) aparece solo si el navegador lo permite.
(function () {
  var W = 1080, H = 1350;
  var EMOJI = "'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif";
  var SANS = "system-ui,-apple-system,'Segoe UI',Roboto,sans-serif";
  var CURSO = "⚡ Menos tokens. Más poder";
  var CURSO2 = "Potencia tus agentes · Grupo 1";
  var CLASE = "Clase 1 · Menos tokens: RTK y el ahorro de contexto";
  var FECHA = "Domingo 8 de noviembre de 2026";

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

  function dibujar(canvas, d) {
    canvas.width = W; canvas.height = H;
    var ctx = canvas.getContext("2d");
    // Fondo: noche morada del LMS con un rayo dorado.
    var g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#12112a"); g.addColorStop(.55, "#211b4a"); g.addColorStop(1, "#3a1f4f");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    var s = 7; function rnd() { s = (s * 48271) % 2147483647; return s / 2147483647; }
    for (var i = 0; i < 90; i++) {
      ctx.globalAlpha = .25 + rnd() * .6; ctx.fillStyle = rnd() > .8 ? "#e9bd52" : "#c3b9ff";
      ctx.beginPath(); ctx.arc(rnd() * W, rnd() * H, .8 + rnd() * 2.2, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = .1; ctx.fillStyle = "#e9bd52";
    ctx.beginPath(); ctx.moveTo(760, 40); ctx.lineTo(600, 420); ctx.lineTo(720, 420); ctx.lineTo(560, 840); ctx.lineTo(900, 330); ctx.lineTo(770, 330); ctx.lineTo(900, 40); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;

    // Cabecera
    ctx.textBaseline = "alphabetic"; ctx.textAlign = "left";
    ctx.fillStyle = "#a99cff"; ctx.font = "700 30px " + SANS;
    ctx.fillText("JMD LEARNING · CLASE EN VIVO", 80, 110);
    ctx.fillStyle = "#ffffff"; ctx.font = "800 70px " + SANS;
    ctx.fillText(CURSO, 80, 196);
    ctx.fillStyle = "#d9d4ff"; ctx.font = "600 36px " + SANS;
    ctx.fillText(CURSO2, 80, 248);

    // Avatar y nombre
    ctx.fillStyle = "rgba(255,255,255,.08)"; ctx.strokeStyle = "#e9bd52"; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.arc(220, 430, 130, 0, 7); ctx.fill(); ctx.stroke();
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = "150px " + EMOJI; ctx.fillStyle = "#ffffff"; ctx.globalAlpha = 1;
    ctx.fillText(d.avatar || "🦙", 220, 440);
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#ffffff"; ctx.font = "800 64px " + SANS;
    var nom = envolver(ctx, d.nombre || "Alumno", 600, 2);
    nom.forEach(function (l, k) { ctx.fillText(l, 400, 410 + k * 72 - (nom.length - 1) * 30); });
    ctx.fillStyle = "#b7b4cc"; ctx.font = "600 32px " + SANS;
    ctx.fillText(d.fecha || FECHA, 400, 410 + nom.length * 72 - (nom.length - 1) * 30 - 10);

    // Resultado
    redondo(ctx, 80, 610, W - 160, 300, 36);
    ctx.fillStyle = "rgba(20,18,43,.78)"; ctx.fill();
    ctx.strokeStyle = "rgba(233,189,82,.65)"; ctx.lineWidth = 4; ctx.stroke();
    ctx.fillStyle = "#e9bd52"; ctx.font = "700 30px " + SANS;
    ctx.fillText((d.etiqueta || "MI RESULTADO").toUpperCase(), 130, 672);
    ctx.fillStyle = "#ffffff"; ctx.font = "800 104px " + SANS;
    var grande = envolver(ctx, d.resultado || "—", W - 260, 1)[0];
    ctx.fillText(grande, 126, 790);
    ctx.fillStyle = "#d9d4ff"; ctx.font = "600 34px " + SANS;
    envolver(ctx, d.detalle || "", W - 260, 2).forEach(function (l, k) { ctx.fillText(l, 130, 846 + k * 44); });

    // Reflexión
    ctx.fillStyle = "#a99cff"; ctx.font = "700 30px " + SANS;
    ctx.fillText("MI REFLEXIÓN", 80, 990);
    ctx.fillStyle = "#ffffff"; ctx.font = "italic 600 44px " + SANS;
    var refl = d.reflexion ? "«" + d.reflexion + "»" : "«Mido antes de pedir y dejo fuera lo que no decide.»";
    envolver(ctx, refl, W - 160, 4).forEach(function (l, k) { ctx.fillText(l, 80, 1050 + k * 56); });

    // Pie
    ctx.fillStyle = "rgba(255,255,255,.18)"; ctx.fillRect(80, 1248, W - 160, 2);
    ctx.fillStyle = "#d9d4ff"; ctx.font = "600 28px " + SANS;
    ctx.fillText(d.clase || CLASE, 80, 1292);
    ctx.textAlign = "right"; ctx.fillStyle = "#e9bd52"; ctx.font = "700 28px " + SANS;
    ctx.fillText("jmd-learn.online", W - 80, 1292);
    return canvas.toDataURL("image/png");
  }

  function nombreArchivo(d) {
    var n = String(d.nombre || "alumno").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return "fotito-" + (d.leccion || "pt-01") + "-" + (n || "alumno") + ".png";
  }

  var CSS =
    ".ft{display:grid;gap:.6em;justify-items:start}" +
    ".ft-img{display:block;width:100%;max-width:22em;height:auto;border-radius:.8em;box-shadow:0 12px 34px -14px rgba(0,0,0,.6);border:1px solid var(--line2);-webkit-touch-callout:default;user-select:auto}" +
    ".ft-acc{display:flex;gap:.5em;flex-wrap:wrap}" +
    ".ft-ayuda{font-size:.66em;color:var(--muted);margin:0;max-width:32em}" +
    ".ft-ayuda b{color:var(--fg)}" +
    "@media (max-width:860px){.ft-ayuda{font-size:.85em}.ft-img{max-width:100%}}";

  function montar(raiz, datosFn, cfg) {
    cfg = cfg || {};
    if (!document.getElementById("ft-css")) { var st = document.createElement("style"); st.id = "ft-css"; st.textContent = CSS; document.head.appendChild(st); }
    raiz.classList.add("ft");
    raiz.textContent = "";
    var acc = document.createElement("div"); acc.className = "ft-acc";
    var gen = document.createElement("button"); gen.type = "button"; gen.className = "pt-btn"; gen.textContent = cfg.texto || "📸 Generar mi fotito";
    acc.appendChild(gen);
    var desc = document.createElement("button"); desc.type = "button"; desc.className = "pt-btn sec"; desc.textContent = "⬇ Descargar PNG"; desc.hidden = true;
    acc.appendChild(desc);
    var comp = document.createElement("button"); comp.type = "button"; comp.className = "pt-btn sec"; comp.textContent = "Compartir"; comp.hidden = true;
    acc.appendChild(comp);
    raiz.appendChild(acc);
    var img = document.createElement("img"); img.className = "ft-img"; img.alt = "Tu fotito de la clase"; img.hidden = true; img.draggable = true;
    raiz.appendChild(img);
    var ayuda = document.createElement("p"); ayuda.className = "ft-ayuda"; ayuda.hidden = true;
    ayuda.innerHTML = "<b>En el celular:</b> mantén presionada la imagen y elige «Guardar imagen». <b>En la PC:</b> clic derecho sobre la imagen → «Guardar imagen como…». Si «Descargar PNG» no hace nada dentro de la clase, es por la seguridad del LMS: usa la imagen.";
    raiz.appendChild(ayuda);
    var canvas = document.createElement("canvas");
    var url = "", datos = null, archivo = null;

    function generar() {
      datos = datosFn() || {};
      url = dibujar(canvas, datos);
      img.src = url; img.hidden = false; ayuda.hidden = false; desc.hidden = false;
      gen.textContent = "↻ Volver a generar";
      archivo = null;
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
      ayuda.classList.add("a-pop");
    });
    comp.addEventListener("click", function () {
      if (!archivo) return;
      try { navigator.share({ files: [archivo], title: "Mi fotito · Potencia tus agentes" }).catch(function () {}); } catch (e) {}
    });
    return { generar: generar, url: function () { return url; } };
  }

  window.PTFoto = { dibujar: dibujar, montar: montar, FECHA: FECHA, CLASE: CLASE };
})();
