// Comportamiento común de las escenas de pn-01: rellena la URL de la demo, dibuja los QR y abre los enlaces.
(function () {
  var url = window.DEMO_URL || "";
  var host = url.replace(/^https?:\/\//, "").replace(/\/+$/, "");

  document.querySelectorAll("[data-demo]").forEach(function (a) { a.href = url; });
  document.querySelectorAll("[data-demo-texto]").forEach(function (e) { e.textContent = host; });

  if (window.qrcode) {
    document.querySelectorAll("[data-qr]").forEach(function (e) {
      var q = window.qrcode(0, "M");
      q.addData(e.getAttribute("data-qr") || url);
      q.make();
      e.innerHTML = q.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
    });
  }

  // Dentro del LIVE el iframe no puede abrir pestañas (sandbox sin allow-popups): window.open devuelve null y
  // el enlace con target no hace nada. Entonces copiamos la dirección y lo decimos. Fuera del iframe, abre.
  function avisar(a, texto) {
    var caja = a.closest("[data-enlace]");
    var aviso = caja && caja.querySelector(".aviso");
    if (!aviso) return;
    aviso.textContent = texto;
    aviso.hidden = false;
  }
  document.querySelectorAll("[data-abrir]").forEach(function (a) {
    a.addEventListener("click", function (ev) {
      ev.preventDefault();
      var w = null;
      try { w = window.open(a.href, "_blank"); } catch (e) { w = null; }
      if (w) {
        try { w.opener = null; } catch (e) { /* otra pestaña, nada que limpiar */ }
        return;
      }
      var fallo = function () { avisar(a, "Escribe esta dirección en tu navegador: " + a.href); };
      if (!navigator.clipboard) { fallo(); return; }
      navigator.clipboard.writeText(a.href).then(function () {
        avisar(a, "Enlace copiado. Pégalo en una pestaña nueva.");
      }, fallo);
    });
  });
})();
