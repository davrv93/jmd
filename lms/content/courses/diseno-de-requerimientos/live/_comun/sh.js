/* Shape Up en el LIVE (dr-02): el pitch del alumno y sus criterios, sobre ES (es.js).
   Vive en localStorage con la clave sh-<lección>-v1 y lee el tramo de la sesión 1 (es-dr-01-v1, mismo origen). */
(function () {
  "use strict";
  var CLAVE = "sh-" + ES.LECCION + "-v1";

  function vacio() {
    return { negocio: "", tramo: "", eventos: [], apetito: { cantidad: "", unidad: "semanas", talla: "" }, piezas: [],
      pitch: { problema: "", solucion: "", agujeros: "", nogos: "" }, criticas: [], criterios: [] };
  }
  function cargar() {
    var s = null;
    try { s = JSON.parse(localStorage.getItem(CLAVE) || "null"); } catch (e) { s = null; }
    if (!s || typeof s !== "object") s = vacio();
    var v = vacio();
    for (var k in v) if (!(k in s)) s[k] = v[k];
    if (!s.tramo || !s.eventos.length) importarSesion1(s);
    return s;
  }
  function guardar(s) { try { localStorage.setItem(CLAVE, JSON.stringify(s)); } catch (e) { /* sin almacenamiento */ } }

  // El tramo que eligieron en dr-01: de la nota «desde» a la nota «hasta».
  function importarSesion1(s) {
    var m = null;
    try { m = JSON.parse(localStorage.getItem("es-dr-01-v1") || "null"); } catch (e) { m = null; }
    if (!m || !m.notas || !m.notas.length) return false;
    if (!s.negocio) s.negocio = m.negocio || "";
    var ids = m.notas.map(function (n) { return n.id; });
    var a = ids.indexOf(m.tramo && m.tramo.desde), b = ids.indexOf(m.tramo && m.tramo.hasta);
    var notas = m.notas;
    if (a >= 0) { if (b < 0) b = a; notas = m.notas.slice(Math.min(a, b), Math.max(a, b) + 1); }
    var ev = notas.filter(function (n) { return n.tipo === "evento"; }).map(function (n) { return n.texto; });
    if (!s.eventos.length) s.eventos = ev.slice(0, 12);
    if (!s.tramo) s.tramo = a >= 0 ? (notas[0].texto + " → " + notas[notas.length - 1].texto) : (m.proceso || "");
    if (!s.pitch.problema && m.tramo && m.tramo.frase) s.pitch.problema = m.tramo.frase;
    return true;
  }

  var EJEMPLO = {
    negocio: "Botica San Pedro",
    tramo: "Venta registrada → Boleta aceptada por SUNAT",
    eventos: ["Venta registrada", "Boleta emitida", "Boleta enviada a SUNAT", "Boleta rechazada", "Boleta aceptada por SUNAT", "Caja cerrada"],
    pitch: {
      problema: "Cuando SUNAT no responde, la cajera cobra igual y la boleta queda sin enviar; al cierre nadie sabe cuáles faltan.",
      solucion: "Una lista de boletas pendientes que se reenvían solas cuando SUNAT vuelve, y un aviso en caja con cuántas faltan.",
      agujeros: "Qué plazo de envío acepta SUNAT (verificarlo con el contador antes de construir). Qué pasa si una boleta es rechazada dos veces.",
      nogos: "Sin notas de crédito. Sin reportes nuevos. Sin cambiar cómo se cobra."
    }
  };

  function texto(s) {
    var p = s.pitch, a = s.apetito;
    var out = ["# Pitch: " + (s.tramo || "mi módulo") + (s.negocio ? " · " + s.negocio : ""), "",
      "## 1. Problema", p.problema || "—", "",
      "## 2. Apetito", (a.cantidad ? a.cantidad + " " + a.unidad : "—") + (a.talla ? " (" + a.talla + ")" : ""), "",
      "## 3. Solución (trazo grueso)", p.solucion || "—", ""];
    var entra = s.piezas.filter(function (x) { return x.entra; }).map(function (x) { return "- " + x.texto; });
    if (entra.length) out.push("Entra en el apetito:", entra.join("\n"), "");
    out.push("## 4. Agujeros de conejo", p.agujeros || "—", "", "## 5. No-gos", p.nogos || "—");
    var fuera = s.piezas.filter(function (x) { return !x.entra; }).map(function (x) { return "- " + x.texto; });
    if (fuera.length) out.push("", "Queda fuera por el apetito:", fuera.join("\n"));
    var ok = s.criterios.filter(function (c) { return revisar(c).ok; });
    if (s.criterios.length) {
      out.push("", "## Criterios de aceptación");
      s.criterios.forEach(function (c, k) { out.push((k + 1) + ". " + c + (revisar(c).ok ? "" : "  (por revisar)")); });
      out.push("", "Criterios comprobables: " + ok.length + " de " + s.criterios.length);
    }
    return out.join("\n");
  }

  // Un criterio comprobable: Dado … cuando … entonces …, sin adjetivos vagos sin cifra.
  var VAGAS = ["rápid", "fácil", "facil", "intuitiv", "amigable", "eficient", "adecuad", "buen", "mejor", "óptim", "optim", "robust", "moderno", "bonit", "sencill", "simple", "ágil", "agil"];
  function revisar(c) {
    var t = " " + String(c || "").toLowerCase().replace(/\s+/g, " ") + " ";
    var d = t.search(/\bdado\b|\bdada\b|\bdados\b|\bdadas\b/), w = t.search(/\bcuando\b/), e = t.search(/\bentonces\b/);
    var avisos = [];
    if (d < 0) avisos.push("falta «Dado»");
    if (w < 0) avisos.push("falta «cuando»");
    if (e < 0) avisos.push("falta «entonces»");
    if (d >= 0 && w >= 0 && e >= 0 && !(d < w && w < e)) avisos.push("el orden es Dado → cuando → entonces");
    var tieneCifra = /\d/.test(t);
    var vaga = VAGAS.filter(function (v) { return t.indexOf(v) >= 0; })[0];
    if (vaga && !tieneCifra) avisos.push("«" + vaga + "…» no se puede comprobar: di cuánto o qué se ve");
    var resultado = e >= 0 ? t.slice(e + 9).trim() : "";
    if (e >= 0 && resultado.split(" ").filter(Boolean).length < 3) avisos.push("después de «entonces» di qué se observa");
    if (t.trim().split(" ").length > 60) avisos.push("muy largo: parte el criterio en dos");
    return { ok: !avisos.length, avisos: avisos };
  }

  window.SH = { cargar: cargar, guardar: guardar, importarSesion1: importarSesion1, EJEMPLO: EJEMPLO, texto: texto, revisar: revisar };
})();
