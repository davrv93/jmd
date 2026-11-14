// ==UserScript==
// @name         Tienda JMD · recolector del laboratorio
// @namespace    https://jmd-learn.online/scraping-lab/
// @version      1.0
// @description  Junta los productos de la Tienda JMD de práctica mientras navegas y los exporta a CSV o JSON.
// @author       Taller «Web scraping ético con IA» · JMD Learning
// @match        https://jmd-learn.online/scraping-lab/tienda*
// @match        http://127.0.0.1:18685/scraping-lab/tienda*
// @match        http://localhost:18685/scraping-lab/tienda*
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-idle
// ==/UserScript==
(function () {
  "use strict";
  var CLAVE = "tiendaJMD.productos";
  var PAUSA_MS = 2500; // al recorrer solo: una página cada 2,5 s, como una persona que mira

  function leer() { try { return JSON.parse(GM_getValue(CLAVE, "{}")); } catch (e) { return {}; } }
  function guardar(o) { GM_setValue(CLAVE, JSON.stringify(o)); }

  // 1. Extraer lo que se ve en esta página (solo las tarjetas visibles: el enlace oculto «trampa» ni se toca)
  var guardados = leer();
  var nuevos = 0;
  document.querySelectorAll("li.producto").forEach(function (li) {
    var id = li.dataset.id;
    var p = {
      id: Number(id),
      sku: li.dataset.sku,
      nombre: li.querySelector(".nombre").textContent.trim(),
      categoria: li.querySelector(".categoria").textContent.trim(),
      precio: Number(li.querySelector(".precio").dataset.precio),
      stock: Number(li.querySelector(".stock").dataset.stock),
      valoracion: Number(li.querySelector(".valoracion").dataset.valor),
      url: new URL(li.querySelector("a.producto-enlace").getAttribute("href"), location.href).href,
      visto: new Date().toISOString()
    };
    if (!guardados[id]) nuevos++;
    guardados[id] = p;
    li.style.outline = "2px solid #4fd37a"; // marca lo que ya juntaste
  });
  guardar(guardados);

  // 2. Panel flotante
  var caja = document.createElement("div");
  caja.style.cssText = "position:fixed;right:16px;bottom:16px;z-index:99999;background:#15132a;color:#e9e6ff;" +
    "font:13px/1.4 system-ui,sans-serif;padding:12px 14px;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.35);max-width:260px";
  caja.innerHTML = '<b>Recolector Tienda JMD</b><div id="tj-n"></div>' +
    '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">' +
    '<button id="tj-csv">CSV</button><button id="tj-json">JSON</button>' +
    '<button id="tj-auto"></button><button id="tj-borrar">Vaciar</button></div>';
  document.body.appendChild(caja);
  caja.querySelectorAll("button").forEach(function (b) {
    b.style.cssText = "font:600 12px system-ui;border:0;border-radius:999px;padding:6px 10px;cursor:pointer;background:#a99cff;color:#14122a";
  });
  function total() { return Object.keys(leer()).length; }
  function pintar() {
    document.getElementById("tj-n").textContent = total() + " productos juntados (" + nuevos + " nuevos en esta página)";
    document.getElementById("tj-auto").textContent = GM_getValue("tiendaJMD.auto", false) ? "Detener" : "Recorrer solo";
  }
  pintar();

  function bajar(nombre, tipo, texto) {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([texto], { type: tipo }));
    a.download = nombre;
    document.body.appendChild(a); a.click(); a.remove();
  }
  function filas() { return Object.values(leer()).sort(function (a, b) { return a.id - b.id; }); }
  document.getElementById("tj-json").onclick = function () {
    bajar("tienda_jmd.json", "application/json", JSON.stringify(filas(), null, 2));
  };
  document.getElementById("tj-csv").onclick = function () {
    var f = filas();
    if (!f.length) return;
    var cols = Object.keys(f[0]);
    var esc = function (v) { v = String(v); return /[",\n;]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    var csv = "﻿" + cols.join(",") + "\n" + f.map(function (p) { return cols.map(function (c) { return esc(p[c]); }).join(","); }).join("\n");
    bajar("tienda_jmd.csv", "text/csv", csv);
  };
  document.getElementById("tj-borrar").onclick = function () { guardar({}); nuevos = 0; pintar(); };
  document.getElementById("tj-auto").onclick = function () {
    GM_setValue("tiendaJMD.auto", !GM_getValue("tiendaJMD.auto", false));
    pintar();
    if (GM_getValue("tiendaJMD.auto", false)) seguir();
  };

  // 3. Recorrer solo: sigue rel="next" con pausa; se detiene en la última página o si el sitio dice 429.
  function seguir() {
    if (!GM_getValue("tiendaJMD.auto", false)) return;
    var sig = document.querySelector('a[rel="next"]');
    if (!sig) { GM_setValue("tiendaJMD.auto", false); pintar(); document.getElementById("tj-n").textContent += " · ¡Última página!"; return; }
    setTimeout(function () { if (GM_getValue("tiendaJMD.auto", false)) location.href = sig.href; }, PAUSA_MS);
  }
  if (!document.querySelector("li.producto")) GM_setValue("tiendaJMD.auto", false); // página de 429/403: paramos
  seguir();
})();
