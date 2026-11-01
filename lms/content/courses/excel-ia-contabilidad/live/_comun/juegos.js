/* Excel + IA para Contabilidad · motor de minijuegos (sin librerías, celular y escritorio).
   Tipos: clasificar (modos mazo, tablero, semaforo, balanza), emparejar, ordenar, contrarreloj, cazar,
   formula, calcular y memoria. Deterministas: el orden sale de una semilla fija por juego.
   Al terminar: muestra estrellas, lanza el evento «jmd-juego-fin» y, dentro del LIVE, registra la evidencia
   «hallazgo» de la escena (POST /api/v1/live/{lección}/evidencia), que cuenta para la compuerta del instructor. */
(function () {
  "use strict";
  var EX = window.EX || {};
  var h = EX.h;
  var rico = EX.rico;

  function semilla(txt) { var x = 2166136261; for (var i = 0; i < txt.length; i++) { x ^= txt.charCodeAt(i); x = Math.imul(x, 16777619); } return x >>> 0; }
  function azar(s) { return function () { s |= 0; s = s + 0x6D2B79F5 | 0; var t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function barajar(arr, rnd) { var a = arr.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function fmt(n) { return Number(n).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

  var NOMBRE_TIPO = { mazo: "Clasifica", tablero: "Arrastra y suelta", semaforo: "Semáforo contrarreloj", balanza: "Cuadra la balanza",
    emparejar: "Empareja", ordenar: "Ordena", contrarreloj: "Contrarreloj", cazar: "Encuentra el error", formula: "Arma la fórmula",
    calcular: "Calcula", memoria: "Memoria" };

  // ---------------------------------------------------------------- arrastrar (pointer events) + tocar
  function arrastrable(el, alSoltar, alTocar) {
    var x0, y0, fantasma = null, sobre = null, id = null;
    el.addEventListener("pointerdown", function (e) {
      if (e.button > 0) return;
      x0 = e.clientX; y0 = e.clientY; id = e.pointerId;
      try { el.setPointerCapture(id); } catch (er) { /* */ }
    });
    el.addEventListener("pointermove", function (e) {
      if (id !== e.pointerId) return;
      if (!fantasma && Math.hypot(e.clientX - x0, e.clientY - y0) > 8) {
        var r = el.getBoundingClientRect();
        fantasma = el.cloneNode(true);
        fantasma.classList.add("arrastrando");
        fantasma.style.setProperty("--w", r.width + "px");
        document.body.appendChild(fantasma);
      }
      if (fantasma) {
        fantasma.style.left = (e.clientX - 40) + "px";
        fantasma.style.top = (e.clientY - 20) + "px";
        var bajo = document.elementFromPoint(e.clientX, e.clientY);
        var d = bajo && bajo.closest ? bajo.closest("[data-drop]") : null;
        if (sobre && sobre !== d) sobre.classList.remove("encima");
        sobre = d;
        if (d) d.classList.add("encima");
      }
    });
    function fin(e, cancelar) {
      if (id !== e.pointerId) return;
      id = null;
      if (fantasma) {
        fantasma.remove();
        fantasma = null;
        if (sobre) { sobre.classList.remove("encima"); if (!cancelar) alSoltar(sobre); }
        sobre = null;
      } else if (!cancelar && alTocar) alTocar();
    }
    el.addEventListener("pointerup", function (e) { fin(e, false); });
    el.addEventListener("pointercancel", function (e) { fin(e, true); });
    el.addEventListener("keydown", function (e) { if ((e.key === "Enter" || e.key === " ") && alTocar) { e.preventDefault(); alTocar(); } });
  }

  // ---------------------------------------------------------------- armazón común
  function montar(zona, cfg) {
    var tipo = cfg.tipo === "clasificar" ? (cfg.modo || "mazo") : cfg.tipo;
    var ronda = 0;
    var caja = h("div", { class: "jj", "data-juego": cfg.id, "data-tipo": tipo });
    var marc = h("span", { class: "marcador" });
    caja.appendChild(h("div", { class: "jj-cab" }, h("span", { class: "tipo", text: NOMBRE_TIPO[tipo] || "Juego" }), h("span", { class: "t", text: cfg.titulo }), marc));
    var cuerpo = h("div", { class: "jj-zona" });
    caja.appendChild(cuerpo);
    zona.innerHTML = "";
    zona.appendChild(caja);

    function inicio() {
      cuerpo.innerHTML = "";
      marc.innerHTML = "";
      cuerpo.appendChild(h("div", { class: "jj-inicio" },
        h("p", { class: "jj-ins", html: rico(cfg.ins) }),
        h("button", { type: "button", class: "x-btn pri", "data-jugar": "", onclick: jugar }, "▶ Jugar" + (cfg.tiempo ? " (" + cfg.tiempo + " s)" : ""))));
    }
    function jugar() {
      cuerpo.innerHTML = "";
      var rnd = azar(semilla(cfg.id + "#" + ronda));
      var t0 = Date.now();
      var ctx = {
        rnd: rnd, cuerpo: cuerpo,
        marcador: function (txt) { marc.innerHTML = txt; },
        fin: function (aciertos, total, extra) { terminar(aciertos, total, extra || {}, Date.now() - t0); }
      };
      (TIPOS[tipo] || TIPOS.mazo)(cfg, ctx);
    }
    function terminar(aciertos, total, extra, ms) {
      ronda++;
      marc.innerHTML = "";
      var pct = total ? aciertos / total : 0;
      var est = pct >= 0.9 ? 3 : pct >= 0.6 ? 2 : 1;
      if (extra.errores && extra.errores > Math.ceil(total / 3)) est = Math.max(1, est - 1);
      cuerpo.innerHTML = "";
      cuerpo.appendChild(h("div", { class: "jj-fin", "data-fin": aciertos + "/" + total },
        h("div", { class: "estrellas", "aria-label": est + " de 3 estrellas", text: "★★★".slice(0, est) + "☆☆☆".slice(est) }),
        h("b", { text: aciertos + " de " + total + (extra.errores ? " · " + extra.errores + " error" + (extra.errores > 1 ? "es" : "") : "") }),
        cfg.leccion ? h("p", { html: rico(cfg.leccion) }) : null,
        h("button", { type: "button", class: "x-btn", "data-otra": "", onclick: jugar }, "↻ Jugar otra vez")));
      caja.setAttribute("data-fin", aciertos + "/" + total);
      var detalle = { juego: cfg.id, aciertos: aciertos, total: total, errores: extra.errores || 0, ms: ms };
      window.dispatchEvent(new CustomEvent("jmd-juego-fin", { detail: detalle }));
      if (EX.enLMS) {
        try {
          fetch("/api/v1/live/" + encodeURIComponent(EX.leccion) + "/evidencia", {
            method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ escena: EX.escena, tipo: "hallazgo", detalle: "juego " + cfg.id + ": " + aciertos + "/" + total + " · " + Math.round(ms / 1000) + " s" })
          }).catch(function () { /* sin red: el juego sigue */ });
        } catch (e) { /* */ }
      }
    }
    inicio();
  }

  var TIPOS = {};

  // ---------------------------------------------------------------- clasificar · mazo y semáforo
  function mazo(cfg, c, semaforo) {
    var items = barajar(cfg.items, c.rnd);
    var i = 0, ok = 0, mal = 0, vivo = true, reloj = null;
    var restante = cfg.tiempo || 0;
    var barra = semaforo ? h("div", { class: "jj-barra" }, h("i")) : null;
    var carta = h("div", { class: "jj-carta", tabindex: "0", "data-carta": "" });
    var msg = h("div", { class: "jj-msg", "aria-live": "polite" });
    var grupos = h("div", { class: "jj-grupos", style: "--n:" + cfg.grupos.length });
    cfg.grupos.forEach(function (g) {
      var b = h("button", { type: "button", class: "jj-grupo", "data-drop": "", "data-grupo": g.id, "data-color": g.color || null, onclick: function () { responder(g.id); } },
        g.color ? h("span", { class: "luz" }) : null, h("b", { text: (g.ic ? g.ic + " " : "") + g.t }), h("span", { class: "cnt", text: "0" }));
      grupos.appendChild(b);
    });
    function pintar() {
      if (i >= items.length) return terminar();
      var it = items[i];
      carta.innerHTML = rico(it.t) + (it.s ? "<small>" + rico(it.s) + "</small>" : "");
      carta.setAttribute("data-item", cfg.items.indexOf(it));
      c.marcador("<span>Carta <b>" + (i + 1) + "/" + items.length + "</b></span><span>✔ <b>" + ok + "</b></span>" + (semaforo ? "<span>⏱ <b>" + restante + "</b> s</span>" : ""));
    }
    function responder(gid) {
      if (!vivo || i >= items.length) return;
      var it = items[i];
      var bien = it.g === gid;
      var g = grupos.querySelector('[data-grupo="' + gid + '"]');
      if (bien) {
        ok++;
        var cnt = g.querySelector(".cnt"); cnt.textContent = String(Number(cnt.textContent) + 1);
        msg.className = "jj-msg ok";
        msg.innerHTML = "✔ " + (it.por ? rico(it.por) : "¡Bien!");
      } else {
        mal++;
        var nom = cfg.grupos.filter(function (x) { return x.id === it.g; })[0].t;
        msg.className = "jj-msg mal";
        msg.innerHTML = "✖ Iba en «" + nom + "». " + (it.por ? rico(it.por) : "");
        carta.classList.remove("jj-sacude"); void carta.offsetWidth; carta.classList.add("jj-sacude");
      }
      i++;
      pintar();
    }
    function terminar() {
      if (!vivo) return;
      vivo = false;
      if (reloj) clearInterval(reloj);
      c.fin(ok, items.length, { errores: mal });
    }
    arrastrable(carta, function (drop) { responder(drop.getAttribute("data-grupo")); }, null);
    if (barra) c.cuerpo.appendChild(barra);
    c.cuerpo.appendChild(carta);
    c.cuerpo.appendChild(grupos);
    c.cuerpo.appendChild(msg);
    if (semaforo && restante) {
      reloj = setInterval(function () {
        restante--;
        barra.firstChild.style.transform = "scaleX(" + Math.max(0, restante / cfg.tiempo) + ")";
        pintar();
        if (restante <= 0) terminar();
      }, 1000);
    }
    pintar();
  }
  TIPOS.mazo = function (cfg, c) { mazo(cfg, c, false); };
  TIPOS.semaforo = function (cfg, c) { mazo(cfg, c, true); };

  // ---------------------------------------------------------------- clasificar · tablero y balanza
  function tablero(cfg, c, balanza) {
    var items = barajar(cfg.items.map(function (it, k) { return { it: it, k: k, en: null }; }), c.rnd);
    var elegida = null, falladas = {}, intentos = 0;
    var pool = h("div", { class: "jj-pool", "data-drop": "", "data-grupo": "" });
    var grupos = h("div", { class: "jj-grupos", style: "--n:" + cfg.grupos.length });
    var msg = h("div", { class: "jj-msg", "aria-live": "polite" });
    var comprobar = h("button", { type: "button", class: "x-btn pri", "data-comprobar": "", onclick: revisar }, "Comprobar");
    var cajas = {};
    cfg.grupos.forEach(function (g) {
      var b = h("div", { class: "jj-grupo", "data-drop": "", "data-grupo": g.id, role: "button", tabindex: "0", onclick: function (e) { if (e.target === b || e.target.tagName === "B") colocar(g.id); } },
        h("b", { text: (g.ic ? g.ic + " " : "") + g.t }), balanza ? h("span", { class: "cnt", text: "S/ 0,00" }) : null);
      cajas[g.id] = b;
      grupos.appendChild(b);
    });
    var svg = null;
    if (balanza) {
      svg = h("div", { class: "jj-balanza", html: '<svg viewBox="0 0 320 120" aria-hidden="true"><polygon points="160,40 145,110 175,110" fill="var(--muted)"/><g class="brazo"><line x1="40" y1="40" x2="280" y2="40" stroke="var(--fg)" stroke-width="5" stroke-linecap="round"/><path d="M40 40 L20 80 H60 Z" fill="var(--accent-bg)" stroke="var(--accent)" stroke-width="2"/><path d="M280 40 L260 80 H300 Z" fill="var(--hoja-bg)" stroke="var(--hoja)" stroke-width="2"/></g><circle cx="160" cy="40" r="6" fill="var(--fg)"/></svg>' });
    }
    function cartaDe(o) {
      var el = h("div", { class: "jj-carta" + (elegida === o ? " elegida" : ""), tabindex: "0", "data-item": o.k, html: rico(o.it.t) + (balanza ? "<small>S/ " + fmt(o.it.v) + "</small>" : "") });
      arrastrable(el, function (drop) { o.en = drop.getAttribute("data-grupo") || null; elegida = null; pintar(); }, function () {
        if (o.en) { o.en = null; elegida = null; } else { elegida = elegida === o ? null : o; }
        pintar();
      });
      return el;
    }
    function colocar(gid) { if (!elegida) { msg.className = "jj-msg"; msg.textContent = "Primero toca una tarjeta (o arrástrala)."; return; } elegida.en = gid; elegida = null; pintar(); }
    function suma(gid) { return items.filter(function (o) { return o.en === gid; }).reduce(function (s, o) { return s + (o.it.v || 0); }, 0); }
    function pintar() {
      pool.innerHTML = "";
      Object.keys(cajas).forEach(function (g) { Array.prototype.slice.call(cajas[g].querySelectorAll(".jj-carta")).forEach(function (x) { x.remove(); }); });
      items.forEach(function (o) { (o.en ? cajas[o.en] : pool).appendChild(cartaDe(o)); });
      var puestos = items.filter(function (o) { return o.en; }).length;
      c.marcador("<span>Colocadas <b>" + puestos + "/" + items.length + "</b></span>");
      comprobar.disabled = puestos < items.length;
      if (balanza) {
        var a = suma(cfg.grupos[0].id), b = suma(cfg.grupos[1].id);
        cajas[cfg.grupos[0].id].querySelector(".cnt").textContent = "S/ " + fmt(a);
        cajas[cfg.grupos[1].id].querySelector(".cnt").textContent = "S/ " + fmt(b);
        var ang = Math.max(-12, Math.min(12, (b - a) / Math.max(a, b, 1) * 14));
        svg.querySelector(".brazo").style.transform = "rotate(" + ang + "deg)";
      }
      if (!pool.children.length) pool.appendChild(h("span", { class: "jj-msg", text: "Todas colocadas. Pulsa «Comprobar»." }));
    }
    function revisar() {
      intentos++;
      var malas = items.filter(function (o) { return o.en !== o.it.g; });
      malas.forEach(function (o) { falladas[o.k] = true; });
      if (!malas.length) {
        var errores = Object.keys(falladas).length;
        return c.fin(items.length - errores, items.length, { errores: errores });
      }
      msg.className = "jj-msg mal";
      msg.innerHTML = "✖ " + malas.length + " en el lugar equivocado. Volvieron abajo: " + rico(malas[0].it.por || "revísalas.");
      malas.forEach(function (o) { o.en = null; });
      pintar();
    }
    if (svg) c.cuerpo.appendChild(svg);
    c.cuerpo.appendChild(grupos);
    c.cuerpo.appendChild(pool);
    c.cuerpo.appendChild(h("div", { class: "jj-btns" }, comprobar));
    c.cuerpo.appendChild(msg);
    pintar();
  }
  TIPOS.tablero = function (cfg, c) { tablero(cfg, c, false); };
  TIPOS.balanza = function (cfg, c) { tablero(cfg, c, true); };

  // ---------------------------------------------------------------- emparejar
  TIPOS.emparejar = function (cfg, c) {
    var n = cfg.pares.length, hechos = 0, mal = 0, sel = null;
    var izq = barajar(cfg.pares.map(function (p, k) { return { k: k, t: p[0], lado: "a" }; }), c.rnd);
    var der = barajar(cfg.pares.map(function (p, k) { return { k: k, t: p[1], lado: "b" }; }), c.rnd);
    var rejilla = h("div", { class: "jj-par" });
    var msg = h("div", { class: "jj-msg", "aria-live": "polite" });
    function boton(o) {
      var b = h("button", { type: "button", "data-par": o.k, "data-lado": o.lado, html: rico(o.t) });
      b.addEventListener("click", function () {
        if (b.classList.contains("hecho")) return;
        if (!sel || sel.o.lado === o.lado) {
          if (sel) sel.b.classList.remove("elegida");
          sel = { o: o, b: b }; b.classList.add("elegida"); return;
        }
        if (sel.o.k === o.k) {
          sel.b.classList.remove("elegida"); sel.b.classList.add("hecho"); b.classList.add("hecho");
          hechos++; msg.className = "jj-msg ok"; msg.textContent = "✔ Pareja correcta.";
          sel = null;
          c.marcador("<span>Parejas <b>" + hechos + "/" + n + "</b></span>");
          if (hechos === n) setTimeout(function () { c.fin(Math.max(0, n - mal), n, { errores: mal }); }, 350);
        } else {
          mal++; var otro = sel.b; otro.classList.remove("elegida");
          b.classList.add("mal"); otro.classList.add("mal");
          msg.className = "jj-msg mal"; msg.textContent = "✖ No van juntas. Prueba otra.";
          setTimeout(function () { b.classList.remove("mal"); otro.classList.remove("mal"); }, 600);
          sel = null;
        }
      });
      return b;
    }
    for (var k = 0; k < n; k++) { rejilla.appendChild(boton(izq[k])); rejilla.appendChild(boton(der[k])); }
    c.marcador("<span>Parejas <b>0/" + n + "</b></span>");
    c.cuerpo.appendChild(rejilla);
    c.cuerpo.appendChild(msg);
  };

  // ---------------------------------------------------------------- ordenar
  TIPOS.ordenar = function (cfg, c) {
    var n = cfg.items.length;
    var orden = barajar(cfg.items.map(function (t, k) { return k; }), c.rnd);
    if (orden.every(function (v, k) { return v === k; })) orden.reverse();
    var primera = null;
    var lista = h("ol", { class: "jj-ord" });
    var msg = h("div", { class: "jj-msg", "aria-live": "polite" });
    function mover(pos, d) { var p2 = pos + d; if (p2 < 0 || p2 >= n) return; var t = orden[pos]; orden[pos] = orden[p2]; orden[p2] = t; pintar(); }
    function pintar(marcar) {
      lista.innerHTML = "";
      orden.forEach(function (k, pos) {
        lista.appendChild(h("li", { "data-orig": k, class: marcar ? (k === pos ? "bien" : "mal") : "" },
          h("span", { class: "n", text: String(pos + 1) }), h("span", { html: rico(cfg.items[k]) }),
          h("button", { type: "button", "aria-label": "Subir", "data-sube": "", onclick: function () { mover(pos, -1); } }, "▲"),
          h("button", { type: "button", "aria-label": "Bajar", "data-baja": "", onclick: function () { mover(pos, 1); } }, "▼")));
      });
    }
    var comp = h("button", { type: "button", class: "x-btn pri", "data-comprobar": "", onclick: function () {
      var bien = orden.filter(function (k, pos) { return k === pos; }).length;
      if (primera === null) primera = bien;
      pintar(true);
      if (bien === n) return setTimeout(function () { c.fin(primera, n, { errores: n - primera }); }, 400);
      msg.className = "jj-msg mal"; msg.textContent = "✖ " + (n - bien) + " fuera de lugar (en rojo). Muévelas con ▲ ▼ y comprueba otra vez.";
    } }, "Comprobar");
    c.marcador("<span>" + n + " pasos</span>");
    pintar();
    c.cuerpo.appendChild(lista);
    c.cuerpo.appendChild(h("div", { class: "jj-btns" }, comp));
    c.cuerpo.appendChild(msg);
  };

  // ---------------------------------------------------------------- contrarreloj
  TIPOS.contrarreloj = function (cfg, c) {
    var preg = barajar(cfg.preguntas, c.rnd);
    var i = 0, ok = 0, restante = cfg.tiempo || 60, vivo = true;
    var barra = h("div", { class: "jj-barra" }, h("i"));
    var p = h("div", { class: "jj-preg", "aria-live": "polite" });
    var ops = h("div", { class: "jj-ops" });
    var msg = h("div", { class: "jj-msg" });
    function pintar() {
      c.marcador("<span>Pregunta <b>" + Math.min(i + 1, preg.length) + "/" + preg.length + "</b></span><span>✔ <b>" + ok + "</b></span><span>⏱ <b>" + restante + "</b> s</span>");
      if (i >= preg.length) return;
      var q = preg[i];
      p.setAttribute("data-preg", cfg.preguntas.indexOf(q));
      p.innerHTML = rico(q.p);
      ops.innerHTML = "";
      // las opciones también se barajan (con la misma semilla): la correcta no queda siempre en el mismo lugar
      barajar(q.ops.map(function (o, k) { return k; }), c.rnd).forEach(function (k) {
        ops.appendChild(h("button", { type: "button", class: "jj-op", "data-op": k, html: rico(q.ops[k]), onclick: function (e) { responder(k, e.currentTarget); } }));
      });
    }
    function responder(k, b) {
      if (!vivo) return;
      var q = preg[i];
      if (k === q.ok) { ok++; msg.className = "jj-msg ok"; msg.innerHTML = "✔ " + (q.por ? rico(q.por) : "Correcto"); }
      else { msg.className = "jj-msg mal"; msg.innerHTML = "✖ Era: " + rico(q.ops[q.ok]) + (q.por ? ". " + rico(q.por) : ""); }
      i++;
      if (i >= preg.length) return terminar();
      pintar();
    }
    function terminar() { if (!vivo) return; vivo = false; clearInterval(reloj); c.fin(ok, preg.length, { errores: i - ok }); }
    var reloj = setInterval(function () {
      restante--;
      barra.firstChild.style.transform = "scaleX(" + Math.max(0, restante / (cfg.tiempo || 60)) + ")";
      pintar();
      if (restante <= 0) terminar();
    }, 1000);
    c.cuerpo.appendChild(barra);
    c.cuerpo.appendChild(p);
    c.cuerpo.appendChild(ops);
    c.cuerpo.appendChild(msg);
    pintar();
  };

  // ---------------------------------------------------------------- cazar (encuentra el error)
  TIPOS.cazar = function (cfg, c) {
    var errores = {}; cfg.errores.forEach(function (e) { errores[e.f] = e.por; });
    var total = cfg.errores.length, halladas = 0, falsos = 0, vivo = true;
    var msg = h("div", { class: "jj-msg", "aria-live": "polite" });
    var tabla = h("table", null, h("thead", null, h("tr", null, cfg.cols.map(function (t) { return h("th", { text: t }); }))));
    var tb = h("tbody");
    cfg.filas.forEach(function (f, k) {
      var tr = h("tr", { "data-fila": k }, f.map(function (v) { return h("td", { class: typeof v === "number" || v === "—" ? "num" : "", text: typeof v === "number" ? fmt(v) : String(v) }); }));
      tr.addEventListener("click", function () {
        if (!vivo || tr.classList.contains("hallada")) return;
        if (errores[k] !== undefined) {
          tr.classList.add("hallada"); halladas++;
          msg.className = "jj-msg ok"; msg.innerHTML = "✔ " + rico(errores[k]);
          pintar();
          if (halladas === total) { vivo = false; setTimeout(function () { c.fin(halladas, total, { errores: falsos }); }, 700); }
        } else {
          falsos++; tr.classList.remove("falsa"); void tr.offsetWidth; tr.classList.add("falsa");
          msg.className = "jj-msg mal"; msg.textContent = "✖ Esa fila está bien. Mira otra vez.";
          pintar();
        }
      });
      tb.appendChild(tr);
    });
    tabla.appendChild(tb);
    function pintar() { c.marcador("<span>Errores hallados <b>" + halladas + "/" + total + "</b></span><span>Toques falsos <b>" + falsos + "</b></span>"); }
    var rendirse = h("button", { type: "button", class: "x-btn", "data-rendirse": "", onclick: function () {
      if (!vivo) return; vivo = false;
      Object.keys(errores).forEach(function (k) { var tr = tb.querySelector('[data-fila="' + k + '"]'); if (!tr.classList.contains("hallada")) tr.classList.add("revela"); });
      msg.className = "jj-msg"; msg.textContent = "En amarillo, los que faltaban.";
      setTimeout(function () { c.fin(halladas, total, { errores: falsos }); }, 1600);
    } }, "Me rindo: muéstrame");
    pintar();
    c.cuerpo.appendChild(h("div", { class: "jj-cazar jj-cazar-wrap" }, tabla));
    c.cuerpo.appendChild(h("div", { class: "jj-btns" }, rendirse, msg));
  };

  // ---------------------------------------------------------------- arma la fórmula
  TIPOS.formula = function (cfg, c) {
    var rondas = cfg.rondas || [cfg];
    var r = 0, puntos = 0, total = 0, errores = 0;
    function jugarRonda() {
      c.cuerpo.innerHTML = "";
      var R = rondas[r];
      var slots = R.tokens.map(function () { return null; });
      var tiles = barajar(R.tokens.concat(R.extra || []).map(function (t, k) { return { t: t, k: k, usada: false }; }), c.rnd);
      var primera = true;
      var obj = h("div", { class: "jj-ins", html: "<b>" + (rondas.length > 1 ? "Fórmula " + (r + 1) + " de " + rondas.length + ": " : "") + "</b>" + rico(R.objetivo) });
      var linea = h("div", { class: "jj-formula", "aria-label": "Tu fórmula" });
      var caja = h("div", { class: "jj-tiles" });
      var msg = h("div", { class: "jj-msg", "aria-live": "polite" });
      var comp = h("button", { type: "button", class: "x-btn pri", "data-comprobar": "", onclick: revisar }, "Comprobar");
      function pintar(marcar) {
        linea.innerHTML = "";
        var sig = slots.indexOf(null);
        slots.forEach(function (s, k) {
          var cl = "jj-slot" + (s ? " lleno" : "") + (k === sig ? " sig" : "") + (marcar && s ? (s.t === R.tokens[k] ? " bien" : " mal") : "");
          linea.appendChild(h("button", { type: "button", class: cl, "data-slot": k, text: s ? s.t : "  ", onclick: function () { if (s) { s.usada = false; slots[k] = null; pintar(); } } }));
        });
        caja.innerHTML = "";
        tiles.forEach(function (t) {
          caja.appendChild(h("button", { type: "button", class: "jj-tile", "data-tok": t.t, disabled: t.usada, text: t.t, onclick: function () {
            var k = slots.indexOf(null); if (k < 0) return; slots[k] = t; t.usada = true; pintar();
          } }));
        });
        comp.disabled = slots.indexOf(null) >= 0;
        c.marcador("<span>Fórmula <b>" + (r + 1) + "/" + rondas.length + "</b></span><span>Puntos <b>" + puntos + "</b></span>");
      }
      function revisar() {
        var malas = slots.filter(function (s, k) { return s.t !== R.tokens[k]; }).length;
        pintar(true);
        if (!malas) {
          var gana = primera ? R.tokens.length : Math.max(1, Math.floor(R.tokens.length / 2));
          puntos += gana; total += R.tokens.length;
          msg.className = "jj-msg ok"; msg.innerHTML = "✔ ¡Correcta! " + (R.resultado ? "Resultado: <b>" + rico(R.resultado) + "</b>" : "");
          comp.disabled = true;
          setTimeout(function () { r++; if (r < rondas.length) jugarRonda(); else c.fin(puntos, total, { errores: errores }); }, 1100);
          return;
        }
        if (primera) errores++;
        primera = false;
        msg.className = "jj-msg mal"; msg.innerHTML = "✖ " + malas + " pieza(s) en rojo. Tócalas para quitarlas y prueba otra vez." + (R.pista ? " Pista: " + rico(R.pista) : "");
      }
      c.cuerpo.appendChild(obj);
      c.cuerpo.appendChild(linea);
      c.cuerpo.appendChild(caja);
      c.cuerpo.appendChild(h("div", { class: "jj-btns" }, comp));
      c.cuerpo.appendChild(msg);
      pintar();
    }
    jugarRonda();
  };

  // ---------------------------------------------------------------- calcular
  TIPOS.calcular = function (cfg, c) {
    var i = 0, ok = 0, intento = 0;
    function pintar() {
      c.cuerpo.innerHTML = "";
      var q = cfg.preguntas[i];
      c.marcador("<span>Pregunta <b>" + (i + 1) + "/" + cfg.preguntas.length + "</b></span><span>✔ <b>" + ok + "</b></span>");
      var inp = h("input", { type: "text", inputmode: "decimal", autocomplete: "off", "data-respuesta": "", "aria-label": "Tu respuesta" });
      var msg = h("div", { class: "jj-msg", "aria-live": "polite" });
      var btn = h("button", { type: "button", class: "x-btn pri", "data-comprobar": "" }, "Comprobar");
      function revisar() {
        var v = parseFloat(String(inp.value).replace(/\s|S\/|%/g, "").replace(/,(?=\d{3}\b)/g, "").replace(",", "."));
        if (isNaN(v)) { msg.className = "jj-msg mal"; msg.textContent = "Escribe un número (por ejemplo 1234.50)."; return; }
        var bien = Math.abs(v - q.r) <= (q.tol == null ? 0.01 : q.tol);
        if (bien || intento >= 1) {
          if (bien && intento === 0) ok++;
          msg.className = "jj-msg " + (bien ? "ok" : "mal");
          msg.innerHTML = (bien ? "✔ ¡Exacto! " : "✖ La respuesta era <b>" + fmt(q.r) + "</b>. ") + (q.por ? rico(q.por) : "");
          btn.disabled = true; inp.disabled = true;
          setTimeout(function () { i++; intento = 0; if (i < cfg.preguntas.length) pintar(); else c.fin(ok, cfg.preguntas.length, { errores: cfg.preguntas.length - ok }); }, 1500);
        } else {
          intento++;
          msg.className = "jj-msg mal"; msg.innerHTML = "✖ Todavía no. Pista: " + rico(q.pista || "revisa la fórmula.");
        }
      }
      btn.addEventListener("click", revisar);
      inp.addEventListener("keydown", function (e) { if (e.key === "Enter") revisar(); });
      c.cuerpo.appendChild(h("div", { class: "jj-calc" },
        h("div", { class: "jj-preg", html: rico(q.p) }),
        q.datos ? h("div", { class: "datos", html: rico(q.datos) }) : null,
        h("label", null, (q.unidad || "S/") + " ", inp, btn), msg));
    }
    pintar();
  };

  // ---------------------------------------------------------------- memoria
  TIPOS.memoria = function (cfg, c) {
    var cartas = barajar([].concat.apply([], cfg.pares.map(function (p, k) { return [{ k: k, t: p[0] }, { k: k, t: p[1] }]; })), c.rnd);
    var abiertas = [], hechos = 0, fallos = 0, bloqueado = false;
    var rej = h("div", { class: "jj-mem" });
    cartas.forEach(function (o) {
      var b = h("button", { type: "button", "data-par": o.k, "aria-label": "Carta tapada", html: rico(o.t) });
      b.addEventListener("click", function () {
        if (bloqueado || b.classList.contains("vista") || b.classList.contains("hecho")) return;
        b.classList.add("vista"); b.setAttribute("aria-label", o.t);
        abiertas.push({ o: o, b: b });
        if (abiertas.length < 2) return;
        var a1 = abiertas[0], a2 = abiertas[1];
        abiertas = [];
        if (a1.o.k === a2.o.k) {
          a1.b.classList.replace("vista", "hecho"); a2.b.classList.replace("vista", "hecho"); hechos++;
          pintar();
          if (hechos === cfg.pares.length) setTimeout(function () { c.fin(Math.max(1, cfg.pares.length - Math.max(0, fallos - cfg.pares.length)), cfg.pares.length, { errores: fallos }); }, 400);
        } else {
          fallos++; bloqueado = true; pintar();
          setTimeout(function () { a1.b.classList.remove("vista"); a2.b.classList.remove("vista"); a1.b.setAttribute("aria-label", "Carta tapada"); a2.b.setAttribute("aria-label", "Carta tapada"); bloqueado = false; }, 800);
        }
      });
      rej.appendChild(b);
    });
    function pintar() { c.marcador("<span>Parejas <b>" + hechos + "/" + cfg.pares.length + "</b></span><span>Fallos <b>" + fallos + "</b></span>"); }
    pintar();
    c.cuerpo.appendChild(rej);
  };

  window.JMDJuegos = { montar: montar, tipos: TIPOS };
  if (window.EX_JUEGO) montar(window.EX_JUEGO.zona, window.EX_JUEGO.cfg);
})();
