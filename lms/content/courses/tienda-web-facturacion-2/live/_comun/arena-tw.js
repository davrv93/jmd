// arena-tw.js · ayudas de los juegos Arena JMD de «Tienda web con facturación electrónica» (script clásico).
//
//   <script src="../../comun/tw.js"></script>
//   <script src="../../comun/arena-tw.js"></script>
//   <script src="../../arena/arena-jmd.js"></script>
//
// El curso, el grupo, la sesión y la fecha salen de tw.js (TW.CURSO, TW.FECHAS, TW.TITULOS): por eso el mismo
// escena.html sirve para el Grupo 1 y el Grupo 2. Aquí solo hay dibujo en canvas y la tarjeta de lo que llevas.
(function () {
  "use strict";
  var TW = window.TW || {};
  var X = (window.TWA = {});

  X.REDUCIDO = (function () { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } })();
  X.FUENTE = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
  X.EMOJI = "'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif";

  // La etiqueta de marca de la escena: curso y grupo, sesión, fecha de la fotito y escena (para el muro).
  X.marca = function () {
    var c = TW.CURSO || {}, s = TW.sesion || {};
    return {
      curso: (c.nombre || "Tienda web con facturación electrónica") + (c.grupo ? " · " + c.grupo : ""),
      sesion: "Sesión " + (s.n || 1) + (s.titulo ? " · " + s.titulo : ""),
      fecha: s.fecha ? s.fecha + " de 2026" : "",
      hashtag: "#TiendaWebJMD",
      escena: TW.escena || "",
    };
  };

  // pl(3, "pieza") → «3 piezas»; pl(1, "nota de crédito", "notas de crédito") → «1 nota de crédito».
  X.pl = function (n, uno, varios) { return n + " " + (n === 1 ? uno : varios || uno + "s"); };

  X.soles = function (n) {
    var v = Math.round((+n || 0) * 100) / 100, p = v.toFixed(2).split(".");
    return "S/ " + p[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ") + "." + p[1];
  };

  // El resultado del juego queda guardado como lo guardaba el juego anterior (TW.guardar("juego")): la escena de
  // la insignia lo lee para su tarjeta («En el juego: …») y para la reflexión.
  X.guardar = function (res, puntos) {
    if (!TW.leer || !TW.guardar) return res;
    var prev = TW.leer("juego", {}) || {}, mejor = Math.max(+prev.mejor || 0, puntos || 0);
    TW.guardar("juego", { puntos: puntos || 0, mejor: mejor, resultado: res.resultado + (res.titulo ? " · " + res.titulo : ""), detalle: res.detalle || "", reflexion: prev.reflexion || "" });
    return res;
  };
  X.guardarReflexion = function (t) {
    if (!TW.leer || !TW.guardar) return;
    var g = TW.leer("juego", {}) || {}; g.reflexion = t; TW.guardar("juego", g);
  };

  // ---------- canvas ----------
  X.rr = function (g, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  };
  // fit: pone la fuente más grande (de px hacia abajo) con la que el texto cabe en ancho.
  var medidas = {};
  X.fit = function (g, txt, ancho, px, peso, min) {
    var clave = txt + "|" + ancho + "|" + px + "|" + peso, f = medidas[clave];
    if (f == null) {
      f = px;
      do { g.font = (peso || "700") + " " + f + "px " + X.FUENTE; if (g.measureText(txt).width <= ancho) break; f -= 1; } while (f > (min || 10));
      medidas[clave] = f;
    }
    g.font = (peso || "700") + " " + f + "px " + X.FUENTE;
    return f;
  };
  // lineas: parte el texto en renglones que caben (con la fuente ya puesta).
  X.lineas = function (g, txt, ancho, max) {
    var ps = String(txt || "").split(/\s+/).filter(Boolean), ls = [], l = "";
    ps.forEach(function (p) { var pr = l ? l + " " + p : p; if (g.measureText(pr).width > ancho && l) { ls.push(l); l = p; } else l = pr; });
    if (l) ls.push(l);
    if (ls.length > max) { ls = ls.slice(0, max); ls[max - 1] = ls[max - 1].replace(/\s*\S*$/, "") + "…"; }
    return ls;
  };
  // bloque: la fuente más grande (de px a min) con la que el texto entra entero en max renglones.
  var bloques = {};
  X.bloque = function (g, txt, ancho, max, px, min, peso) {
    var clave = txt + "|" + ancho + "|" + max + "|" + px + "|" + peso, r = bloques[clave];
    if (!r) {
      for (var f = px; f >= (min || 12); f--) {
        g.font = (peso || "700") + " " + f + "px " + X.FUENTE;
        var ls = X.lineas(g, txt, ancho, 99);
        if (ls.length <= max && ls.every(function (l) { return g.measureText(l).width <= ancho; })) { r = { px: f, ls: ls }; break; }
      }
      if (!r) { g.font = (peso || "700") + " " + (min || 12) + "px " + X.FUENTE; r = { px: min || 12, ls: X.lineas(g, txt, ancho, max) }; }
      bloques[clave] = r;
    }
    g.font = (peso || "700") + " " + r.px + "px " + X.FUENTE;
    return r;
  };
  X.texto = function (g, txt, x, y, px, peso, color, alinear) {
    g.font = (peso || "700") + " " + px + "px " + X.FUENTE; g.fillStyle = color || "#1b2350";
    g.textAlign = alinear || "left"; g.textBaseline = "middle"; g.fillText(txt, x, y);
  };
  X.emoji = function (g, e, x, y, px, alfa) {
    g.save(); if (alfa != null) g.globalAlpha = alfa;
    g.font = px + "px " + X.EMOJI; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(e, x, y);
    g.restore();
  };
  // pastilla: una etiqueta redondeada con texto centrado.
  X.pastilla = function (g, txt, cx, cy, px, fondo, color, peso) {
    g.font = (peso || "800") + " " + px + "px " + X.FUENTE;
    var w = g.measureText(txt).width + px * 1.2, h = px * 1.7;
    g.fillStyle = fondo; X.rr(g, cx - w / 2, cy - h / 2, w, h, h / 2); g.fill();
    g.fillStyle = color; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(txt, cx, cy + .5);
    return w;
  };
  // sello: «¡VENDIDO!», «¡EMITIDA!»… girado, con borde, como un sello de tinta.
  X.sello = function (g, txt, cx, cy, px, color, k) {
    g.save(); g.translate(cx, cy); g.rotate(-.16); var s = X.REDUCIDO ? 1 : .8 + .2 * Math.min(1, k * 4); g.scale(s, s);
    g.font = "900 " + px + "px " + X.FUENTE; var w = g.measureText(txt).width + px;
    g.globalAlpha = Math.min(1, (1 - k) * 3);
    g.fillStyle = "rgba(255,255,255,.88)"; X.rr(g, -w / 2, -px * .85, w, px * 1.7, 12); g.fill();
    g.strokeStyle = color; g.lineWidth = 5; X.rr(g, -w / 2, -px * .85, w, px * 1.7, 12); g.stroke();
    g.fillStyle = color; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(txt, 0, 2);
    g.restore();
  };
  X.pulso = function (t, vel) { return X.REDUCIDO ? .5 : (Math.sin(t * (vel || 5)) + 1) / 2; };

  // ---------- la tarjeta de lo que llevas ----------
  // El motor la arma al recoger (opción «tarjeta»). Cuando el juego cambia de estado mientras la llevas (por
  // ejemplo, el pedido pasa a «Pagado»), X.carta la vuelve a pintar con la misma estructura del motor.
  function el(tag, cls, padre, txt) { var n = document.createElement(tag); if (cls) n.className = cls; if (txt != null) n.textContent = txt; if (padre) padre.appendChild(n); return n; }
  X.carta = function (t) {
    var c = document.querySelector(".aj-carta");
    if (!c || c.hidden || !t) return;
    c.textContent = "";
    var cab = el("div", "aj-carta-cab", c);
    if (t.etiqueta) { var et = el("span", "aj-chip", cab, t.etiqueta); if (t.color) et.style.setProperty("--c", t.color); }
    el("span", "aj-carta-lleva", cab, "Llevas");
    if (t.titulo) el("p", "aj-carta-tit", c, t.titulo);
    if (t.destacado) { var dd = el("p", "aj-carta-dato", c); if (t.destacadoEtiqueta) el("small", "", dd, t.destacadoEtiqueta); el("b", "", dd, t.destacado); }
    if (t.pie) el("p", "aj-carta-pie", c, t.pie);
  };

  // ---------- red: contadores de la sala (solo lectura) ----------
  // El motor solo muestra el contador de la meta. Para un tablero con varios contadores (la caja del grupo),
  // X.contadores lee el instante cada pocos segundos con GET /patio (no te une a la sala) y X.sumar los suma.
  function rutaLive() {
    var m = location.pathname.match(/\/api\/v1\/live\/([^/]+)\/escenas\/([^/]+)\//);
    return m ? { leccion: decodeURIComponent(m[1]), escena: decodeURIComponent(m[2]) } : null;
  }
  X.ruta = rutaLive();
  X.sumar = function (contador, valor) {
    if (!X.ruta || !valor) return;
    var v = Math.round(valor);
    while (v !== 0) {
      var paso = Math.max(-100, Math.min(100, v)); v -= paso;
      try {
        fetch("/api/v1/live/" + encodeURIComponent(X.ruta.leccion) + "/patio", { method: "POST", credentials: "same-origin", cache: "no-store",
          headers: { "Content-Type": "application/json" }, body: JSON.stringify({ escena: X.ruta.escena, accion: "sumar", contador: contador, valor: paso }) }).catch(function () {});
      } catch (e) {}
    }
  };
  X.contadores = function (cada, alLeer) {
    if (!X.ruta) return;
    var url = "/api/v1/live/" + encodeURIComponent(X.ruta.leccion) + "/patio?escena=" + encodeURIComponent(X.ruta.escena), fallos = 0;
    function leer() {
      if (document.hidden) { setTimeout(leer, cada); return; }
      fetch(url, { credentials: "same-origin", cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
        if (d && d.instante) { fallos = 0; alLeer(d.instante.c || {}, d.instante.r || {}); } else fallos++;
      }).catch(function () { fallos++; }).then(function () { if (fallos < 6) setTimeout(leer, cada); });
    }
    leer();
  };
})();
