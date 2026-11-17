// pantalla.js · la pantalla de inventario de «Ferretería Don Lucho» (pantalla.css), en dos versiones:
//   Pantalla.montar(el, "fea" | "bien", { tokens })   → la dibuja dentro de el (un .pf-caja) y la devuelve
//   Pantalla.aplicar(pf, tokens)                       → cambia los tokens de la versión «bien» en vivo
// La fea tiene a propósito 9 tamaños de letra (10, 11, 12, 13, 14, 15, 17, 21 y 27), 6 botones de colores sin
// significado, y el dato que importa («3 productos con stock por debajo del mínimo») en gris de 11 px al pie,
// con contraste 2,05:1. Las dos usan los mismos 6 productos para que el antes y después sea justo.
(function () {
  "use strict";
  var DATOS = [
    { cod: "F-0112", nom: "Cemento portland tipo I · 42,5 kg", cat: "Construcción", stock: 4, min: 20, precio: "31.50", est: "av" },
    { cod: "F-0245", nom: "Fierro corrugado 1/2\" × 9 m", cat: "Construcción", stock: 120, min: 40, precio: "38.90" },
    { cod: "E-0310", nom: "Cable vulcanizado 2×14 AWG (m)", cat: "Eléctrico", stock: 3, min: 50, precio: "2.80", est: "av" },
    { cod: "G-0057", nom: "Tubo PVC 1/2\" agua fría × 5 m", cat: "Gasfitería", stock: 64, min: 25, precio: "7.20" },
    { cod: "P-0188", nom: "Pintura látex blanco · 4 L", cat: "Pinturas", stock: 0, min: 6, precio: "54.00", est: "er" },
    { cod: "H-0421", nom: "Martillo de uña 16 oz", cat: "Herramientas", stock: 18, min: 5, precio: "24.90" },
  ];
  var esc = function (s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;"); };

  function fea() {
    var filas = DATOS.map(function (d) {
      return "<tr><td>" + d.cod + "</td><td>" + esc(d.nom).toUpperCase() + "</td><td>" + d.cat.toUpperCase() + "</td><td>" + d.stock + "</td><td>" + d.min + "</td><td>" + d.precio + "</td></tr>";
    }).join("");
    return '<div class="pf pf-fea">' +
      '<div class="pff-banner" data-zona="banner">¡¡BIENVENIDO AL SISTEMA DE INVENTARIO!!</div>' +
      '<div class="pff-cab"><b class="pff-logo">FERRETERÍA DON LUCHO</b><span class="pff-usr">Usuario: ADMIN | Cerrar sesión</span><span class="pff-fecha">17/11/2026 09:14:52 p. m.</span></div>' +
      '<div class="pff-menu"><span>INICIO</span><span>VENTAS</span><span class="on">INVENTARIO</span><span>COMPRAS</span><span>REPORTES</span><span>CONFIGURACIÓN</span></div>' +
      '<div class="pff-tools"><span class="pff-b1">NUEVO</span><span class="pff-b2">GUARDAR</span><span class="pff-b3" data-zona="eliminar">ELIMINAR</span><span class="pff-b4">EXPORTAR A EXCEL</span><span class="pff-b5">IMPRIMIR</span><span class="pff-b6">SALIR</span></div>' +
      '<div class="pff-busca"><span>Buscar:</span><span class="pff-in">escriba aquí el código o el nombre del producto...</span><span class="pff-b7">BUSCAR</span></div>' +
      '<div class="pff-res">TOTAL DE PRODUCTOS: <b>6</b> · VALOR DEL INVENTARIO: <b>S/ 5,711.40</b> · ÚLTIMA ACTUALIZACIÓN: <b>HOY 08:40</b></div>' +
      '<table class="pff-tabla" data-zona="tabla"><thead><tr><th>CÓDIGO</th><th>DESCRIPCIÓN DEL PRODUCTO</th><th>CATEGORÍA</th><th>STOCK</th><th>STOCK MÍN.</th><th>PRECIO S/</th></tr></thead><tbody>' + filas + '</tbody></table>' +
      '<p class="pff-aviso" data-zona="aviso">* Atención: hay 3 productos con stock por debajo del mínimo. Revise el reporte de reposición.</p>' +
      '<p class="pff-pie">Sistema de Inventarios v2.3 © 2019 · Todos los derechos reservados · Soporte: anexo 104</p>' +
      "</div>";
  }

  function bien() {
    var filas = DATOS.map(function (d) {
      var et = d.est === "er" ? '<span class="pfb-est er">Agotado</span>' : d.est === "av" ? '<span class="pfb-est av">Bajo</span>' : "";
      return "<tr><td>" + d.cod + "</td><td>" + esc(d.nom) + "</td><td>" + d.cat + '</td><td class="n">' + et + d.stock + '</td><td class="n">' + d.min + '</td><td class="n">S/ ' + d.precio + "</td></tr>";
    }).join("");
    return '<div class="pf pf-bien">' +
      '<div class="pfb-top"><b class="pfb-logo"><i></i>Ferretería Don Lucho</b><span class="pfb-nav"><span>Ventas</span><span class="on">Inventario</span><span>Compras</span><span>Reportes</span></span><span class="pfb-usr">Lucho Ramos</span></div>' +
      '<div class="pfb-cab"><div><h3 class="pfb-h">Inventario</h3><p class="pfb-sub">6 productos · actualizado hoy, 9:14 p. m.</p></div><span class="pfb-acc"><span class="pfb-btn sec">Exportar</span><span class="pfb-btn pri">+ Nuevo producto</span></span></div>' +
      '<div class="pfb-alerta" data-zona="aviso"><i class="pfb-ico">!</i><div><b>3 productos por reponer hoy</b><p>La pintura látex está agotada; el cemento y el cable 2×14 están bajo el mínimo.</p></div><span class="pfb-btn pri">Ver pedido sugerido</span></div>' +
      '<div class="pfb-busca"><span class="pfb-in">Buscar por código o nombre</span><span class="pfb-chip">Todas las categorías ▾</span></div>' +
      '<table class="pfb-tabla" data-zona="tabla"><thead><tr><th>Código</th><th>Producto</th><th>Categoría</th><th class="n">Stock</th><th class="n">Mínimo</th><th class="n">Precio</th></tr></thead><tbody>' + filas + "</tbody></table>" +
      "</div>";
  }

  // aplicar(pf, t): los tokens del alumno (DI.tokens()) sobre la versión «bien».
  function aplicar(pf, t) {
    if (!pf || !t) return;
    var m = { a: t.acento, tx: t.texto, sv: t.suave, bo: t.borde, li: t.linea, fo: t.fondo, su: t.superficie, ok: t.exito, av: t.aviso, er: t.error };
    Object.keys(m).forEach(function (k) { if (m[k]) pf.style.setProperty("--" + k, m[k]); });
    if (window.DI && t.base) {
      DI.escala(t.base, t.razon).forEach(function (s) { pf.style.setProperty("--f" + s.paso, s.px); });
    }
  }

  function montar(el, version, op) {
    op = op || {};
    el.classList.add("pf-caja");
    el.setAttribute("role", "img");
    el.setAttribute("aria-label", version === "fea"
      ? "Captura simulada de la pantalla de inventario de Ferretería Don Lucho, versión original: un letrero rojo enorme de bienvenida, seis botones de colores, una tabla con todo en mayúsculas y centrado, y al pie, en gris claro y letra chica, el aviso de que 3 productos están por debajo del stock mínimo."
      : "Captura simulada de la misma pantalla rediseñada: título Inventario, un aviso destacado «3 productos por reponer hoy» con su botón, un buscador y la tabla alineada, con etiquetas Agotado y Bajo en los productos que faltan.");
    el.innerHTML = version === "fea" ? fea() : bien();
    var pf = el.firstChild;
    if (version !== "fea" && op.tokens) aplicar(pf, op.tokens);
    return pf;
  }

  window.Pantalla = { datos: DATOS, montar: montar, aplicar: aplicar };
})();
