/* Motor de las escenas de teoría de dr-01. Cada escena arma UN timeline de GSAP partido en pasos: el
   profesor o el alumno avanza con «Siguiente», las flechas, la barra espaciadora o los puntos. Hacia
   atrás se rebobina rápido. Sin GSAP, o con «reducir movimiento», todo queda visible y quieto.
   Uso: TEO.escena([function (tl) {…paso 1…}, function (tl) {…paso 2…}], { alCambiar: fn(paso) }). */
(function () {
  "use strict";
  var raiz = document.documentElement;
  try {
    var tema = new URLSearchParams(location.search).get("tema");
    if (tema === "dark" || tema === "light") raiz.setAttribute("data-tema", tema);
  } catch (e) { /* sin parámetros */ }
  var quieto = false;
  try { quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { /* navegador viejo */ }

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var TEO = window.TEO = { quieto: quieto, $: $, $$: $$ };
  function lista(sel) { return typeof sel === "string" ? $$(sel) : [].concat(sel); }

  // Dibuja trazos SVG (caminos, elipses, líneas) como si se trazaran a mano.
  TEO.trazar = function (tl, sel, vars, pos) {
    var st = (vars && vars.stagger) || 0;
    lista(sel).forEach(function (el, i) {
      var L = Math.ceil(el.getTotalLength()) + 2;
      var v = Object.assign({ strokeDashoffset: 0, duration: 1, ease: "power2.inOut" }, vars || {});
      delete v.stagger;
      tl.fromTo(el, { strokeDasharray: L + " " + L, strokeDashoffset: L }, v, i === 0 ? pos : "<" + st);
    });
    return tl;
  };

  // Pega notas: caen con un giro, como papel que se aplasta contra la pared.
  TEO.pegar = function (tl, sel, pos, extra) {
    return tl.from(lista(sel), Object.assign({
      autoAlpha: 0, y: -26, scale: 1.16, duration: .6, ease: "back.out(1.8)", stagger: .14,
      rotation: function (i, el) { return (parseFloat(el.getAttribute("data-r")) || 0) + (i % 2 ? 11 : -9); }
    }, extra || {}), pos);
  };

  // Parte un texto en palabras (<span class="w">) para que entren una a una.
  TEO.palabras = function (el) {
    var ws = el.firstChild && el.firstChild.nodeType === 3 ? el.firstChild.textContent.trim().split(/\s+/) : [];
    if (!ws.length) return [];
    el.removeChild(el.firstChild);
    var resto = el.firstChild, out = [];
    ws.forEach(function (w, i) {
      var s = document.createElement("span"); s.className = "w"; s.textContent = w;
      el.insertBefore(s, resto); out.push(s);
      if (i < ws.length - 1) el.insertBefore(document.createTextNode(" "), resto);
    });
    return out;
  };

  // Punta de flecha al final de un camino (se calcula con su tangente).
  TEO.punta = function (path, clase) {
    var L = path.getTotalLength(), a = path.getPointAtLength(L), b = path.getPointAtLength(Math.max(0, L - 6));
    var ang = Math.atan2(a.y - b.y, a.x - b.x) * 180 / Math.PI;
    var p = document.createElementNS("http://www.w3.org/2000/svg", "path");
    p.setAttribute("d", "M-10 -7 L0 0 L-10 7");
    p.setAttribute("class", clase || "punta");
    p.setAttribute("transform", "translate(" + a.x + " " + a.y + ") rotate(" + ang + ")");
    path.parentNode.insertBefore(p, path.nextSibling);
    return p;
  };

  // Mueve un círculo SVG a lo largo de un camino (reversible: sirve igual hacia atrás).
  TEO.viajar = function (tl, punto, path, dur, pos) {
    var L = path.getTotalLength(), o = { t: 0 };
    return tl.to(o, {
      t: 1, duration: dur || .8, ease: "power1.inOut",
      onUpdate: function () { var p = path.getPointAtLength(o.t * L); punto.setAttribute("cx", p.x); punto.setAttribute("cy", p.y); }
    }, pos);
  };

  TEO.escena = function (pasos, opciones) {
    opciones = opciones || {};
    if (!window.gsap) return; // sin GSAP: todo visible, sin controles
    raiz.classList.add("teo-js", "teo-gsap");
    gsap.defaults({ ease: "power3.out", duration: .7 });
    $$("[data-r]").forEach(function (el) { gsap.set(el, { rotation: parseFloat(el.getAttribute("data-r")) || 0 }); });
    if (opciones.preparar) opciones.preparar();

    var n = pasos.length, tl = gsap.timeline({ paused: true });
    pasos.forEach(function (armar, i) { tl.addLabel("p" + i, i ? "+=0.05" : 0); armar(tl); });
    tl.addLabel("p" + n, "+=0.05");
    TEO.tl = tl;

    var relato = $$(".teo-relato li"), puntos = $(".teo-puntos");
    var sig = $("#sig"), ant = $("#ant"), rep = $("#rep"), todo = $("#todo");
    var actual = -1, viaje = null;

    relato.forEach(function (li, k) {
      li.addEventListener("click", function () { if (li.classList.contains("ya")) ir(k); });
      if (!puntos) return;
      var b = document.createElement("button");
      b.type = "button"; b.className = "teo-punto";
      b.setAttribute("aria-label", "Paso " + (k + 1) + ": " + ((li.querySelector("b") || li).textContent || ""));
      b.addEventListener("click", function () { ir(k); });
      puntos.appendChild(b);
    });

    function marcar() {
      relato.forEach(function (li, k) { li.classList.toggle("ya", k < actual); li.classList.toggle("ahora", k === actual); });
      $$(".teo-punto").forEach(function (b, k) {
        b.classList.toggle("ya", k < actual);
        if (k === actual) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current");
      });
      if (ant) ant.disabled = actual <= 0;
      if (sig) { sig.disabled = actual >= n - 1; sig.textContent = actual >= n - 1 ? "Fin de la teoría" : "Siguiente →"; }
      if (todo) todo.disabled = actual >= n - 1;
      if (opciones.alCambiar) opciones.alCambiar(actual);
    }
    function animarRelato() {
      var li = relato[actual];
      if (!li || quieto) return;
      gsap.fromTo(li.children, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: .5, stagger: .09, ease: "power2.out", overwrite: true });
    }
    function ir(i, repetir) {
      if (i < 0 || i >= n) return;
      var desde = actual, destino = tl.labels["p" + (i + 1)];
      actual = i;
      if (viaje) viaje.kill();
      if (quieto) tl.seek(destino);
      else if (repetir) { tl.seek(tl.labels["p" + i]); viaje = tl.tweenTo(destino); }
      else if (i === desde + 1) {
        // si el paso anterior aún no termina, se adelanta rápido y el nuevo va a su ritmo
        var inicio = tl.labels["p" + i];
        viaje = tl.time() < inicio - .05
          ? gsap.timeline()
              .add(tl.tweenTo(inicio, { duration: Math.min(.6, (inicio - tl.time()) / 4) }))
              .add(tl.tweenFromTo(inicio, destino))
          : tl.tweenTo(destino);
      }
      else viaje = tl.tweenTo(destino, { duration: Math.min(1.3, .35 + Math.abs(destino - tl.time()) / 7), ease: "power2.inOut" });
      marcar(); animarRelato();
    }
    TEO.ir = ir;

    if (sig) sig.addEventListener("click", function () { ir(actual + 1); });
    if (ant) ant.addEventListener("click", function () { ir(actual - 1); });
    if (rep) rep.addEventListener("click", function () { ir(Math.max(actual, 0), true); });
    if (todo) todo.addEventListener("click", function () { ir(n - 1); });
    document.addEventListener("keydown", function (e) {
      if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === "PageDown" || e.key === " ") { e.preventDefault(); ir(actual + 1); }
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp" || e.key === "PageUp") { e.preventDefault(); ir(actual - 1); }
    });
    setTimeout(function () { ir(0); }, 300);
  };
})();
