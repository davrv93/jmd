/* Hoja JMD · la hoja de cálculo editable del reto (escena 04-caso). Necesita hoja-motor.js y hoja-xlsx.js.
   HojaJMD.montar(contenedor, opciones) dibuja la rejilla, la barra de fórmulas, las pestañas y la barra de estado;
   edita como Excel (clic, doble clic o escribir; Enter, Tab, flechas, F2, Esc, Supr, Ctrl+Z/C/V/D, controlador de
   relleno), revisa las celdas amarillas contra la referencia y exporta .xlsx. Sin librerías. */
(function () {
  "use strict";
  var M = window.HojaMotor, X = window.HojaXlsx;

  function h(tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      var v = attrs[k];
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k === "text") el.textContent = v;
      else if (k === "html") el.innerHTML = v;
      else if (k.slice(0, 2) === "on") el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? "" : v);
    }
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (c == null || c === false) continue;
      (Array.isArray(c) ? c : [c]).forEach(function (x) { if (x != null) el.appendChild(typeof x === "string" ? document.createTextNode(x) : x); });
    }
    return el;
  }
  function leer(k) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function guardar(k, v) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } }
  function b64(s) { try { return JSON.parse(decodeURIComponent(escape(atob(s)))); } catch (e) { return null; } }
  var tactil = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
  var COLORES_REF = ["#1f6feb", "#d1242f", "#8250df", "#1a7f37", "#bf8700", "#cf222e"];

  // ---------------------------------------------------------------- descarga desde el iframe del LIVE
  function descargarBytes(bytes, nombre) {
    var tipo = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    var w = window;
    try { if (window.parent && window.parent !== window && window.parent.document) w = window.parent; } catch (e) { w = window; }
    var blob = new w.Blob([bytes], { type: tipo }), url = w.URL.createObjectURL(blob);
    var a = w.document.createElement("a");
    a.href = url; a.download = nombre; a.rel = "noopener";
    w.document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { try { w.URL.revokeObjectURL(url); } catch (e) { /* */ } }, 30000);
  }

  // ---------------------------------------------------------------- montar
  function montar(raiz, op) {
    op = op || {};
    var libro = null, base = null, revision = [], hojaI = 0, ac = { c: 1, f: 1 }, ancla = { c: 1, f: 1 };
    var editando = null, deshacer = [], rehacer = [], portapapeles = null, resultado = null, intentos = 0, clave = op.clave || "hoja-jmd";
    var tdPorRef = {}, tabla = null, filasVis = 0, colsVis = 0;
    var cambios = {};
    var evento = op.alCambiar || function () {};

    var estiloCss = h("style");
    var refEl = h("input", { class: "hj-ref", "aria-label": "Celda activa (escribe una dirección y pulsa Enter)", spellcheck: "false", autocomplete: "off" });
    var fx = h("input", { class: "hj-fx-in", "aria-label": "Barra de fórmulas", spellcheck: "false", autocomplete: "off", autocapitalize: "off", placeholder: "Escribe un valor o una fórmula que empiece con =" });
    var btnOk = h("button", { type: "button", class: "hj-fx-b", title: "Aceptar (Enter)", "aria-label": "Aceptar", text: "✓" });
    var btnNo = h("button", { type: "button", class: "hj-fx-b", title: "Cancelar (Esc)", "aria-label": "Cancelar", text: "✕" });
    var editor = h("input", { class: "hj-editor", "aria-label": "Editar celda", spellcheck: "false", autocomplete: "off", autocapitalize: "off", hidden: true });
    var rejilla = h("div", { class: "hj-rejilla", tabindex: "0", role: "grid", "aria-label": "Hoja de cálculo editable" });
    var marco = h("div", { class: "hj-sel", "aria-hidden": "true" }, h("i", { class: "hj-asa", title: "Arrastra para copiar la fórmula (controlador de relleno)" }));
    var capaRefs = h("div", { class: "hj-capa-refs", "aria-hidden": "true" });
    var pestanas = h("div", { class: "hj-pestanas", role: "tablist", "aria-label": "Hojas del libro" });
    var estado = h("div", { class: "hj-estado", "aria-live": "polite" });
    var selFmt = h("select", { class: "hj-formato", "aria-label": "Formato de número" },
      [["", "Formato…"], ["General", "General"], ["0.00", "Número 0.00"], ["#,##0.00", "Miles 1,234.50"], ["#,##0", "Entero 1,234"], ["0.0%", "Porcentaje 18.0%"], ["dd/mm/yyyy", "Fecha dd/mm/aaaa"]].map(function (o) { return h("option", { value: o[0], text: o[1] }); }));
    function boton(txt, titulo, fn, cl) { return h("button", { type: "button", class: "hj-b" + (cl ? " " + cl : ""), title: titulo, onclick: fn }, txt); }
    var bRevisar = boton("✔ Revisar", "Compara tus celdas amarillas con las respuestas del caso", function () { revisarHoja(); }, "pri");
    var bExportar = boton("⬇ Excel (.xlsx)", "Descarga esta hoja como archivo de Excel, con tus fórmulas", function () { exportar(); }, "hoja");
    var herramientas = h("div", { class: "hj-herr", role: "toolbar", "aria-label": "Herramientas de la hoja" },
      boton("↶", "Deshacer (Ctrl+Z)", function () { volver(deshacer, rehacer); }), boton("↷", "Rehacer (Ctrl+Y)", function () { volver(rehacer, deshacer); }),
      h("span", { class: "hj-sep" }),
      boton("Copiar", "Copiar (Ctrl+C)", function () { copiar(); }), boton("Pegar", "Pegar con referencias relativas (Ctrl+V)", function () { pegar(); }),
      boton("Rellenar ↓", "Copia la primera fila de la selección hacia abajo (Ctrl+D)", function () { rellenarAbajo(); }),
      h("span", { class: "hj-sep" }), selFmt, h("span", { class: "hj-sep" }), bRevisar, bExportar,
      boton("↺", "Reiniciar la hoja (borra lo que escribiste)", function () { reiniciar(); }, "chico"));
    var fxBar = h("div", { class: "hj-fx" }, refEl, h("span", { class: "hj-fxi", text: "fx" }), fx, btnOk, btnNo);
    var cont = h("div", { class: "hj", "data-hoja-jmd": "" }, estiloCss, herramientas, fxBar, rejilla, pestanas, estado);
    rejilla.appendChild(marco);
    rejilla.appendChild(capaRefs);
    rejilla.appendChild(editor);
    raiz.appendChild(cont);

    function H() { return libro.hojas[hojaI]; }
    function ref(c, f) { return M.dir(c, f); }
    function rect() { return { c1: Math.min(ac.c, ancla.c), f1: Math.min(ac.f, ancla.f), c2: Math.max(ac.c, ancla.c), f2: Math.max(ac.f, ancla.f) }; }
    function estiloDe(hoja, r) { var c = hoja.celdas[r]; return libro.estilo(c ? c.s : 0); }

    // ------------------------------------------------------------ estilos de celda → CSS
    function pintarEstilos() {
      estiloCss.textContent = libro.estilos.map(function (e, i) {
        var r = [];
        if (e.bg) r.push("background:#" + e.bg);
        if (e.c && e.c !== "000000") r.push("color:#" + e.c);
        if (e.b) r.push("font-weight:700");
        if (e.i) r.push("font-style:italic");
        if (e.sz && e.sz !== 11) r.push("font-size:" + (e.sz / 11).toFixed(2) + "em");
        if (e.h) r.push("text-align:" + (e.h === "centerContinuous" ? "center" : e.h));
        if (e.wr) r.push("white-space:normal;vertical-align:top");
        return ".hj td.s" + i + "{" + r.join(";") + "}";
      }).join("\n");
    }

    // ------------------------------------------------------------ dibujar la hoja activa
    function dibujar() {
      var hoja = H();
      if (tabla) tabla.remove();
      tdPorRef = {};
      colsVis = Math.max(hoja.dim[0] + 3, 10);
      filasVis = Math.max(hoja.dim[1] + 15, 40);
      tabla = h("table", { class: "hj-t" });
      var cg = h("colgroup", null, h("col", { class: "hj-cn" }));
      for (var c = 1; c <= colsVis; c++) {
        var w = hoja.w[M.colLetras(c)] || 8.43;
        cg.appendChild(h("col", { style: "width:calc(" + w.toFixed(2) + " * .56em + 6px)" }));
      }
      tabla.appendChild(cg);
      var cab = h("tr", null, h("th", { class: "hj-esq", "aria-hidden": "true" }));
      for (c = 1; c <= colsVis; c++) cab.appendChild(h("th", { class: "hj-col", "data-c": c, text: M.colLetras(c) }));
      tabla.appendChild(h("thead", null, cab));
      var cuerpo = h("tbody");
      for (var f = 1; f <= filasVis; f++) {
        var tr = h("tr", null, h("th", { class: "hj-fil", "data-f": f, text: String(f) }));
        for (c = 1; c <= colsVis; c++) {
          var r = ref(c, f), td = h("td", { "data-r": r, "data-c": c, "data-f": f });
          tdPorRef[r] = td;
          tr.appendChild(td);
        }
        cuerpo.appendChild(tr);
      }
      tabla.appendChild(cuerpo);
      rejilla.insertBefore(tabla, marco);
      congelar();
      pestanas.innerHTML = "";
      libro.hojas.forEach(function (x, i) {
        pestanas.appendChild(h("button", { type: "button", role: "tab", "aria-selected": i === hojaI ? "true" : "false", class: i === hojaI ? "on" : "",
          onclick: function () { irHoja(i); } }, x.n));
      });
      refrescar();
    }

    // Paneles inmovilizados: los del Excel (fz) o, en hojas largas, hasta la fila de títulos de la primera tabla.
    var alto0 = 0, ancho0 = 0;
    function congelar() {
      // Solo filas: las columnas inmovilizadas tapan las demás al desplazar a lo ancho (la cabecera A, B, C… no las sigue).
      var hoja = H(), fz = hoja.fz || [0, 0], filasF = fz[1] || 0, colsF = 0;
      if (!filasF && hoja.dim[1] > 18 && hoja.t && hoja.t.length) { var r0 = M.leerRef(hoja.t[0].ref); if (r0 && r0.f1 <= 8) filasF = r0.f1; }
      var top = tabla.tHead.offsetHeight, izq = tabla.querySelector("th.hj-fil").offsetWidth, tops = {}, lefts = {};
      for (var f = 1; f <= filasF; f++) { tops[f] = top; top += tdPorRef[ref(1, f)].offsetHeight; }
      for (var c = 1; c <= colsF; c++) { lefts[c] = izq; izq += tdPorRef[ref(c, 1)].offsetWidth; }
      alto0 = top; ancho0 = izq;
      if (!filasF && !colsF) return;
      for (var r in tdPorRef) {
        var td = tdPorRef[r], cf = +td.dataset.c, ff = +td.dataset.f;
        if (ff > filasF && cf > colsF) continue;
        td.classList.add("fz");
        td.dataset.fz = "1";
        if (ff <= filasF) td.style.top = tops[ff] + "px";
        if (cf <= colsF) td.style.left = lefts[cf] + "px";
        td.style.zIndex = ff <= filasF && cf <= colsF ? 4 : 3;
      }
      for (f = 1; f <= filasF; f++) { var th = tabla.querySelector('.hj-fil[data-f="' + f + '"]'); th.style.top = tops[f] + "px"; th.style.zIndex = 6; }
    }

    function textoCelda(hoja, r) {
      var c = hoja.celdas[r];
      if (!c || c.e === null || c.e === undefined) return { t: "", tipo: "" };
      var v = libro.valor(hoja, r), e = libro.estilo(c.s);
      if (M.esErr(v)) return { t: v.err, tipo: "err" };
      if (typeof v === "number") return { t: M.formatear(v, e.f), tipo: "num" };
      if (typeof v === "boolean") return { t: v ? "VERDADERO" : "FALSO", tipo: "bool" };
      return { t: String(v), tipo: "txt" };
    }

    var marcasRev = {};
    function refrescar() {
      libro.recalcular();
      var hoja = H();
      for (var r in tdPorRef) {
        var td = tdPorRef[r], c = hoja.celdas[r], x = textoCelda(hoja, r);
        var cl = (td.dataset.fz ? "fz " : "") + (c ? "s" + c.s : "");
        if (x.tipo) cl += " t-" + x.tipo;
        if (c && typeof c.e === "string" && c.e.charAt(0) === "=") cl += " fx";
        var m = marcasRev[hoja.n + "!" + r];
        if (m) cl += " rv-" + m;
        if (x.tipo === "txt" && !(c && libro.estilo(c.s).wr)) {
          // el texto largo se ve sobre las celdas vacías de la derecha, como en Excel
          var sig = hoja.celdas[M.dir(+td.dataset.c + 1, +td.dataset.f)];
          if (!sig || sig.e === null || sig.e === "") cl += " desborda";
        }
        if (td.className !== cl) td.className = cl;
        if (td.textContent !== x.t) td.textContent = x.t;
      }
      ubicarSeleccion();
      mostrarEstado();
    }

    // ------------------------------------------------------------ selección
    function ubicarSeleccion() {
      var R = rect(), a = tdPorRef[ref(R.c1, R.f1)], b = tdPorRef[ref(R.c2, R.f2)];
      if (!a || !b) { marco.hidden = true; return; }
      marco.hidden = false;
      marco.style.left = a.offsetLeft - 1 + "px";
      marco.style.top = a.offsetTop - 1 + "px";
      marco.style.width = b.offsetLeft + b.offsetWidth - a.offsetLeft + 1 + "px";
      marco.style.height = b.offsetTop + b.offsetHeight - a.offsetTop + 1 + "px";
      marco.classList.toggle("multi", R.c1 !== R.c2 || R.f1 !== R.f2);
      tabla.querySelectorAll(".hj-col.on,.hj-fil.on,td.act").forEach(function (x) { x.classList.remove("on"); x.classList.remove("act"); });
      for (var c = R.c1; c <= R.c2; c++) { var th = tabla.querySelector('.hj-col[data-c="' + c + '"]'); if (th) th.classList.add("on"); }
      for (var f = R.f1; f <= R.f2; f++) { var tf = tabla.querySelector('.hj-fil[data-f="' + f + '"]'); if (tf) tf.classList.add("on"); }
      var act = tdPorRef[ref(ac.c, ac.f)];
      if (act) act.classList.add("act");
      if (!editando) {
        refEl.value = ref(ac.c, ac.f);
        var c0 = H().celdas[ref(ac.c, ac.f)];
        fx.value = entradaTexto(c0);
        var e = libro.estilo(c0 ? c0.s : 0);
        selFmt.value = "";
        selFmt.title = "Formato de " + ref(ac.c, ac.f) + ": " + (e.f || "General");
      }
    }
    function entradaTexto(c) {
      if (!c || c.e === null || c.e === undefined) return "";
      if (typeof c.e === "number") {
        var e = libro.estilo(c.s);
        if (M.esFormatoFecha(e.f)) return M.formatear(c.e, "dd/mm/yyyy");
        if (/%/.test(e.f || "")) return M.formatear(c.e * 100, "General") + "%";
        return M.formatear(c.e, "General");
      }
      if (typeof c.e === "boolean") return c.e ? "VERDADERO" : "FALSO";
      return String(c.e);
    }
    function seleccionar(c, f, extender) {
      c = Math.max(1, Math.min(colsVis, c)); f = Math.max(1, Math.min(filasVis, f));
      ac = { c: c, f: f };
      if (!extender) ancla = { c: c, f: f };
      ubicarSeleccion();
      mostrarEstado();
      var td = tdPorRef[ref(c, f)];
      if (td) {
        var r0 = rejilla.getBoundingClientRect(), r1 = td.getBoundingClientRect(), cabAlto = td.dataset.fz ? 0 : alto0, cabAncho = td.dataset.fz ? 0 : ancho0;
        if (r1.top < r0.top + cabAlto) rejilla.scrollTop -= r0.top + cabAlto - r1.top;
        else if (r1.bottom > r0.bottom) rejilla.scrollTop += r1.bottom - r0.bottom + 2;
        if (r1.left < r0.left + cabAncho) rejilla.scrollLeft -= r0.left + cabAncho - r1.left;
        else if (r1.right > r0.right) rejilla.scrollLeft += r1.right - r0.right + 2;
      }
    }
    function irHoja(i) {
      if (editando) confirmar();
      hojaI = i; ac = { c: 1, f: 1 }; ancla = { c: 1, f: 1 };
      var hoja = H();
      var primera = revision.filter(function (x) { return x.hoja === hoja.n; })[0];
      if (primera) { var p = M.partir(primera.ref); ac = { c: p.c, f: p.f }; ancla = { c: p.c, f: p.f }; }
      dibujar();
      rejilla.scrollTop = 0; rejilla.scrollLeft = 0;
      seleccionar(ac.c, ac.f);
    }

    // ------------------------------------------------------------ estado y explicaciones
    function mostrarEstado() {
      var hoja = H(), r = ref(ac.c, ac.f), c = hoja.celdas[r];
      estado.innerHTML = "";
      var v = c ? libro.valor(hoja, r) : null;
      if (c && c.errSint) {
        estado.appendChild(h("span", { class: "hj-mal", text: "⚠ No se pudo leer la fórmula de " + r + ": " + c.errSint }));
        return;
      }
      if (M.esErr(v)) {
        estado.appendChild(h("span", { class: "hj-mal" }, h("b", { text: "⚠ " + v.err + " en " + r + ": " }), v.msg || M.EXPLICA[v.err] || ""));
        if (v.msg && M.EXPLICA[v.err] && v.msg !== M.EXPLICA[v.err]) estado.appendChild(h("small", { text: " " + M.EXPLICA[v.err] }));
        return;
      }
      var m = marcasRev[hoja.n + "!" + r];
      if (m && resultado) {
        var it = resultado.filter(function (x) { return x.hoja === hoja.n && x.ref === r; })[0];
        if (it) {
          var msg = it.ok ? "✓ " + r + " está bien." : it.motivo === "vacía" ? "• " + r + " está vacía: complétala." : it.motivo === "a_mano" ? "• " + r + ": el número está bien, pero escrito a mano. Usa una fórmula para que se recalcule." : "✗ " + r + " no coincide con lo esperado. Revisa la fórmula y los datos que usa.";
          estado.appendChild(h("span", { class: it.ok ? "hj-bien" : "hj-mal", text: msg }));
          return;
        }
      }
      var R = rect();
      if (R.c1 !== R.c2 || R.f1 !== R.f2) {
        var s = 0, n = 0, k = 0;
        for (var f = R.f1; f <= R.f2; f++) for (var cc = R.c1; cc <= R.c2; cc++) {
          var x = libro.valor(hoja, ref(cc, f));
          if (x !== null && x !== "") k++;
          if (typeof x === "number") { s += x; n++; }
        }
        estado.appendChild(h("span", { text: (n ? "Suma: " + M.formatear(s, "#,##0.00") + " · Promedio: " + M.formatear(s / n, "#,##0.00") + " · " : "") + "Recuento: " + k }));
        return;
      }
      var amar = estiloDe(hoja, r).bg === "FFF4C2";
      estado.appendChild(h("span", { class: "hj-ayuda", text: amar ? "Celda amarilla: aquí va tu fórmula. Empieza con = (por ejemplo =SUMA(…))." : tactil ? "Toca una celda y escribe en la barra de fórmulas." : "Doble clic o empieza a escribir para editar. Enter baja, Tab va a la derecha, Esc cancela." }));
    }

    // ------------------------------------------------------------ edición
    function empezar(texto, enCelda) {
      var r = ref(ac.c, ac.f), c = H().celdas[r];
      editando = { r: r, hoja: hojaI, original: entradaTexto(c), enCelda: enCelda !== false };
      var valor = texto !== undefined ? texto : editando.original;
      fx.value = valor;
      if (editando.enCelda) {
        var td = tdPorRef[r];
        editor.hidden = false;
        editor.style.left = td.offsetLeft + "px";
        editor.style.top = td.offsetTop + "px";
        editor.style.minWidth = td.offsetWidth + "px";
        editor.style.height = td.offsetHeight + "px";
        editor.value = valor;
        editor.focus();
        var fin = valor.length;
        try { editor.setSelectionRange(fin, fin); } catch (e) { /* */ }
      }
      resaltarRefs(valor);
    }
    function textoEditado() { return editando && editando.enCelda ? editor.value : fx.value; }
    function confirmar(mover) {
      if (!editando) return;
      var e = editando, txt = textoEditado();
      editando = null;
      editor.hidden = true;
      capaRefs.innerHTML = "";
      if (txt !== e.original) {
        var hoja = libro.hojas[e.hoja], c = hoja.celdas[e.r];
        var nuevo = libro.interpretar(txt, c ? c.s : 0);
        if (typeof nuevo === "string" && nuevo.charAt(0) === "=") nuevo = autocompletarParentesis(nuevo);
        aplicar([{ hoja: hoja.n, ref: e.r, e: nuevo }]);
      }
      if (mover) seleccionar(ac.c + (mover[0] || 0), ac.f + (mover[1] || 0));
      else ubicarSeleccion();
      if (!tactil) rejilla.focus({ preventScroll: true });
    }
    function cancelar() {
      if (!editando) return;
      editando = null;
      editor.hidden = true;
      capaRefs.innerHTML = "";
      ubicarSeleccion();
      rejilla.focus({ preventScroll: true });
    }
    // Excel cierra los paréntesis que faltan al final: =SUMA(A1:A3 → =SUMA(A1:A3)
    function autocompletarParentesis(f) {
      var n = 0, enTexto = false;
      for (var i = 0; i < f.length; i++) { var ch = f.charAt(i); if (ch === '"') enTexto = !enTexto; else if (!enTexto) { if (ch === "(") n++; else if (ch === ")") n--; } }
      return n > 0 && !enTexto ? f + new Array(n + 1).join(")") : f;
    }

    // cambios: [{hoja, ref, e, s?}] — quedan en deshacer y en el almacenamiento.
    function aplicar(lista, sinHistoria) {
      var hist = [];
      lista.forEach(function (x) {
        var hoja = libro.hoja(x.hoja), c = hoja.celdas[x.ref];
        var antes = c ? { e: c.e, s: c.s } : null;
        libro.poner(x.hoja, x.ref, x.e, x.s);
        var d = hoja.celdas[x.ref];
        hist.push({ hoja: x.hoja, ref: x.ref, antes: antes, despues: d ? { e: d.e, s: d.s } : null });
        cambios[x.hoja + "!" + x.ref] = d ? { e: d.e, s: d.s } : null;
      });
      if (!sinHistoria) { deshacer.push(hist); if (deshacer.length > 200) deshacer.shift(); rehacer = []; }
      persistir();
      refrescar();
      evento({ tipo: "cambio", celdas: lista.length });
    }
    function volver(de, a) {
      var hist = de.pop();
      if (!hist) return;
      var inversa = [];
      hist.slice().reverse().forEach(function (x) {
        var hoja = libro.hoja(x.hoja), c = hoja.celdas[x.ref];
        inversa.push({ hoja: x.hoja, ref: x.ref, antes: c ? { e: c.e, s: c.s } : null, despues: x.antes });
        if (x.antes) libro.poner(x.hoja, x.ref, x.antes.e, x.antes.s); else { libro.poner(x.hoja, x.ref, null, 0); delete hoja.celdas[x.ref]; }
        cambios[x.hoja + "!" + x.ref] = x.antes;
      });
      a.push(inversa);
      persistir();
      refrescar();
    }

    function persistir() {
      guardar(clave, { v: 1, cambios: cambios });
    }

    // ------------------------------------------------------------ copiar, pegar y rellenar (referencias relativas)
    function copiar() {
      var R = rect(), hoja = H(), filas = [];
      for (var f = R.f1; f <= R.f2; f++) {
        var fila = [];
        for (var c = R.c1; c <= R.c2; c++) { var x = hoja.celdas[ref(c, f)]; fila.push(x ? { e: x.e, s: x.s } : null); }
        filas.push(fila);
      }
      var tsv = filas.map(function (fl, i) { return fl.map(function (x, j) { var t = textoCelda(hoja, ref(R.c1 + j, R.f1 + i)); return t.t; }).join("\t"); }).join("\n");
      portapapeles = { c: R.c1, f: R.f1, filas: filas, tsv: tsv };
      try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(tsv).catch(function () {}); } catch (e) { /* */ }
      decir("Copiado " + (R.c1 === R.c2 && R.f1 === R.f2 ? ref(R.c1, R.f1) : ref(R.c1, R.f1) + ":" + ref(R.c2, R.f2)) + ". Pega con Ctrl+V: las referencias se ajustan como en Excel.");
    }
    function pegar(textoExterno) {
      var R = rect(), hoja = H(), lista = [];
      if (textoExterno !== undefined && (!portapapeles || textoExterno.replace(/\r/g, "").trim() !== portapapeles.tsv.trim())) {
        textoExterno.replace(/\r/g, "").replace(/\n$/, "").split("\n").forEach(function (linea, i) {
          linea.split("\t").forEach(function (v, j) {
            var r = ref(R.c1 + j, R.f1 + i), c = hoja.celdas[r];
            lista.push({ hoja: hoja.n, ref: r, e: libro.interpretar(v, c ? c.s : 0) });
          });
        });
      } else if (portapapeles) {
        var P = portapapeles, alto = P.filas.length, ancho = P.filas[0].length;
        // Si se seleccionó un área mayor, se repite el bloque (como Excel)
        var vf = Math.max(1, Math.floor((R.f2 - R.f1 + 1) / alto)), vc = Math.max(1, Math.floor((R.c2 - R.c1 + 1) / ancho));
        for (var a = 0; a < vf; a++) for (var b = 0; b < vc; b++)
          P.filas.forEach(function (fila, i) {
            fila.forEach(function (x, j) {
              var c0 = R.c1 + b * ancho + j, f0 = R.f1 + a * alto + i, r = ref(c0, f0);
              var e = x ? x.e : null;
              if (typeof e === "string" && e.charAt(0) === "=") e = M.moverFormula(e, c0 - (P.c + j), f0 - (P.f + i));
              lista.push({ hoja: hoja.n, ref: r, e: e, s: x ? x.s : (hoja.celdas[r] ? hoja.celdas[r].s : 0) });
            });
          });
      } else { decir("Primero copia algo (Ctrl+C)."); return; }
      aplicar(lista);
      decir("Pegado. Revisa que las referencias apunten a la fila correcta.");
    }
    function rellenarAbajo() {
      var R = rect(), hoja = H(), lista = [];
      var desde = R.f1, hasta = R.f2;
      if (R.f1 === R.f2) { desde = R.f1 - 1; if (desde < 1) return; }
      for (var c = R.c1; c <= R.c2; c++) {
        var o = hoja.celdas[ref(c, desde)];
        for (var f = desde + 1; f <= hasta; f++) {
          var e = o ? o.e : null;
          if (typeof e === "string" && e.charAt(0) === "=") e = M.moverFormula(e, 0, f - desde);
          var d = hoja.celdas[ref(c, f)];
          lista.push({ hoja: hoja.n, ref: ref(c, f), e: e, s: d ? d.s : (o ? o.s : 0) });
        }
      }
      if (lista.length) { aplicar(lista); decir("Rellenado hacia abajo: " + lista.length + " celda" + (lista.length > 1 ? "s" : "") + "."); }
    }
    // Controlador de relleno: arrastrar la esquina copia el bloque seleccionado en la dirección del arrastre.
    function rellenarHasta(R, destino) {
      var hoja = H(), lista = [], alto = R.f2 - R.f1 + 1, ancho = R.c2 - R.c1 + 1;
      if (destino.f > R.f2) {
        for (var f = R.f2 + 1; f <= destino.f; f++) for (var c = R.c1; c <= R.c2; c++) {
          var fo = R.f1 + ((f - R.f1) % alto), o = hoja.celdas[ref(c, fo)], e = o ? o.e : null;
          if (typeof e === "string" && e.charAt(0) === "=") e = M.moverFormula(e, 0, f - fo);
          var d = hoja.celdas[ref(c, f)];
          lista.push({ hoja: hoja.n, ref: ref(c, f), e: e, s: d ? d.s : (o ? o.s : 0) });
        }
        ancla = { c: R.c1, f: R.f1 }; ac = { c: R.c2, f: destino.f };
      } else if (destino.c > R.c2) {
        for (var c2 = R.c2 + 1; c2 <= destino.c; c2++) for (var f2 = R.f1; f2 <= R.f2; f2++) {
          var co = R.c1 + ((c2 - R.c1) % ancho), o2 = hoja.celdas[ref(co, f2)], e2 = o2 ? o2.e : null;
          if (typeof e2 === "string" && e2.charAt(0) === "=") e2 = M.moverFormula(e2, c2 - co, 0);
          var d2 = hoja.celdas[ref(c2, f2)];
          lista.push({ hoja: hoja.n, ref: ref(c2, f2), e: e2, s: d2 ? d2.s : (o2 ? o2.s : 0) });
        }
        ancla = { c: R.c1, f: R.f1 }; ac = { c: destino.c, f: R.f2 };
      }
      if (lista.length) aplicar(lista);
    }

    function borrarSeleccion() {
      var R = rect(), hoja = H(), lista = [];
      for (var f = R.f1; f <= R.f2; f++) for (var c = R.c1; c <= R.c2; c++) { var x = hoja.celdas[ref(c, f)]; if (x && x.e !== null) lista.push({ hoja: hoja.n, ref: ref(c, f), e: null }); }
      if (lista.length) aplicar(lista);
    }
    function ponerFormato(fmt) {
      var R = rect(), hoja = H(), lista = [];
      for (var f = R.f1; f <= R.f2; f++) for (var c = R.c1; c <= R.c2; c++) {
        var x = hoja.celdas[ref(c, f)], e = Object.assign({}, libro.estilo(x ? x.s : 0));
        if (fmt === "General") delete e.f; else e.f = fmt;
        var k = JSON.stringify(e), i = libro.estilos.findIndex(function (z) { return JSON.stringify(z) === k; });
        if (i < 0) { i = libro.estilos.length; libro.estilos.push(e); pintarEstilos(); }
        lista.push({ hoja: hoja.n, ref: ref(c, f), e: x ? x.e : null, s: i });
      }
      aplicar(lista);
    }

    // ------------------------------------------------------------ resaltar las referencias de la fórmula que se edita
    function resaltarRefs(txt) {
      capaRefs.innerHTML = "";
      if (!txt || txt.charAt(0) !== "=") return;
      var hoja = H(), k = 0;
      M.referencias(txt).forEach(function (x) {
        if (!x.r || (x.r.hoja && x.r.hoja.toLowerCase() !== hoja.n.toLowerCase())) return;
        var a = tdPorRef[ref(x.r.c1, x.r.f1)], b = tdPorRef[ref(Math.min(x.r.c2, colsVis), Math.min(x.r.f2, filasVis))];
        if (!a || !b) return;
        var col = COLORES_REF[k++ % COLORES_REF.length];
        capaRefs.appendChild(h("div", { class: "hj-rref", style: "left:" + (a.offsetLeft - 1) + "px;top:" + (a.offsetTop - 1) + "px;width:" + (b.offsetLeft + b.offsetWidth - a.offsetLeft + 1) +
          "px;height:" + (b.offsetTop + b.offsetHeight - a.offsetTop + 1) + "px;border-color:" + col + ";background:" + col + "14" }));
      });
    }
    // ¿El cursor está donde Excel deja apuntar con el mouse? (después de =, (, coma u operador)
    function modoPuntero() {
      if (!editando) return false;
      var el = editando.enCelda ? editor : fx, t = el.value, p = el.selectionStart == null ? t.length : el.selectionStart;
      if (t.charAt(0) !== "=") return false;
      var antes = t.slice(0, p).replace(/\s+$/, "");
      return /[=(,;+\-*/^&<>:]$/.test(antes) || /(\$?[A-Z]{1,3}\$?\d+)$/i.test(antes) && editando.puntero;
    }
    function insertarRef(texto) {
      var el = editando.enCelda ? editor : fx, t = el.value, p = el.selectionStart == null ? t.length : el.selectionStart;
      var antes = t.slice(0, p), despues = t.slice(el.selectionEnd == null ? p : el.selectionEnd);
      if (editando.puntero && editando.ultimaRef && antes.slice(-editando.ultimaRef.length) === editando.ultimaRef) antes = antes.slice(0, -editando.ultimaRef.length);
      el.value = antes + texto + despues;
      var q = (antes + texto).length;
      try { el.setSelectionRange(q, q); } catch (e) { /* */ }
      editando.ultimaRef = texto; editando.puntero = true;
      if (el === editor) fx.value = el.value; else editor.value = el.value;
      resaltarRefs(el.value);
    }
    function textoRef(c1, f1, c2, f2) {
      var hojaEd = libro.hojas[editando.hoja], hoja = H();
      var pre = hoja === hojaEd ? "" : (/^[A-Za-z_][A-Za-z0-9_]*$/.test(hoja.n) ? hoja.n : "'" + hoja.n.replace(/'/g, "''") + "'") + "!";
      var a = ref(Math.min(c1, c2), Math.min(f1, f2)), b = ref(Math.max(c1, c2), Math.max(f1, f2));
      return pre + (a === b ? a : a + ":" + b);
    }

    // ------------------------------------------------------------ eventos del mouse y del tacto
    var arrastre = null;
    function celdaDe(ev) {
      var t = ev.target.closest ? ev.target.closest("td[data-r]") : null;
      if (!t) {
        var p = ev.touches ? ev.touches[0] : ev;
        var el = document.elementFromPoint(p.clientX, p.clientY);
        t = el && el.closest ? el.closest("td[data-r]") : null;
      }
      return t ? { c: +t.dataset.c, f: +t.dataset.f } : null;
    }
    rejilla.addEventListener("pointerdown", function (ev) {
      if (ev.target === editor) return;
      if (ev.target.classList.contains("hj-asa")) {
        ev.preventDefault();
        arrastre = { tipo: "relleno", R: rect(), dest: null };
        rejilla.setPointerCapture && rejilla.setPointerCapture(ev.pointerId);
        return;
      }
      var th = ev.target.closest && ev.target.closest("th");
      if (th && th.dataset.c) { if (editando) confirmar(); ancla = { c: +th.dataset.c, f: 1 }; ac = { c: +th.dataset.c, f: filasVis }; ubicarSeleccion(); mostrarEstado(); return; }
      if (th && th.dataset.f) { if (editando) confirmar(); ancla = { c: 1, f: +th.dataset.f }; ac = { c: colsVis, f: +th.dataset.f }; ubicarSeleccion(); mostrarEstado(); return; }
      var p = celdaDe(ev);
      if (!p) return;
      if (editando && modoPuntero()) {
        ev.preventDefault();
        arrastre = { tipo: "puntero", a: p };
        insertarRef(textoRef(p.c, p.f, p.c, p.f));
        return;
      }
      if (ev.pointerType === "touch") { toque = { x: ev.clientX, y: ev.clientY, p: p }; return; } // se decide al soltar: así se puede desplazar la hoja
      if (editando) confirmar();
      ev.preventDefault();
      rejilla.focus({ preventScroll: true });
      seleccionar(p.c, p.f, ev.shiftKey);
      arrastre = { tipo: "sel" };
    });
    rejilla.addEventListener("pointermove", function (ev) {
      if (!arrastre || ev.pointerType === "touch" && arrastre.tipo === "sel") return;
      var p = celdaDe(ev);
      if (!p) return;
      if (arrastre.tipo === "sel") { if (p.c !== ac.c || p.f !== ac.f) seleccionar(p.c, p.f, true); }
      else if (arrastre.tipo === "puntero") { insertarRef(textoRef(arrastre.a.c, arrastre.a.f, p.c, p.f)); }
      else if (arrastre.tipo === "relleno") {
        var R = arrastre.R, dest = { c: R.c2, f: R.f2 };
        if (p.f > R.f2 && p.f - R.f2 >= p.c - R.c2) dest = { c: R.c2, f: p.f };
        else if (p.c > R.c2) dest = { c: p.c, f: R.f2 };
        arrastre.dest = dest;
        var a = tdPorRef[ref(R.c1, R.f1)], b = tdPorRef[ref(dest.c, dest.f)];
        if (a && b) { marco.style.width = b.offsetLeft + b.offsetWidth - a.offsetLeft + 1 + "px"; marco.style.height = b.offsetTop + b.offsetHeight - a.offsetTop + 1 + "px"; marco.classList.add("rellenando"); }
      }
    });
    var toque = null;
    // Con el dedo la acción va en «click» (llega al final, después de que el navegador mueve el foco).
    rejilla.addEventListener("click", function () {
      var t = toque;
      toque = null;
      if (!t || !t.ok) return;
      var p = t.p, yaActiva = ac.c === p.c && ac.f === p.f && ancla.c === p.c && ancla.f === p.f;
      if (editando && modoPuntero()) { insertarRef(textoRef(p.c, p.f, p.c, p.f)); (editando.enCelda ? editor : fx).focus(); return; }
      if (editando) confirmar();
      seleccionar(p.c, p.f);
      if (yaActiva || t.editar) { empezar(undefined, false); fx.focus(); }
    });
    function soltar(ev) {
      if (toque && ev && ev.type === "pointerup") toque.ok = Math.abs(ev.clientX - toque.x) < 10 && Math.abs(ev.clientY - toque.y) < 10;
      else toque = null;
      if (arrastre && arrastre.tipo === "relleno") { marco.classList.remove("rellenando"); if (arrastre.dest) rellenarHasta(arrastre.R, arrastre.dest); else ubicarSeleccion(); }
      arrastre = null;
    }
    rejilla.addEventListener("pointerup", soltar);
    rejilla.addEventListener("pointercancel", soltar);
    rejilla.addEventListener("dblclick", function (ev) {
      var p = celdaDe(ev);
      if (!p || editando) return;
      seleccionar(p.c, p.f);
      empezar();
    });

    // ------------------------------------------------------------ teclado
    function teclaEdicion(ev, el) {
      if (ev.key === "Enter") { ev.preventDefault(); confirmar([0, ev.shiftKey ? -1 : 1]); return true; }
      if (ev.key === "Tab") { ev.preventDefault(); confirmar([ev.shiftKey ? -1 : 1, 0]); return true; }
      if (ev.key === "Escape") { ev.preventDefault(); cancelar(); return true; }
      if (el === editor && editando && !editando.f2 && /^Arrow/.test(ev.key) && !(editor.value.charAt(0) === "=" && modoPuntero())) {
        // Como en Excel: si empezaste escribiendo, las flechas confirman y mueven.
        ev.preventDefault();
        var d = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[ev.key];
        confirmar(d);
        return true;
      }
      if (el === editor && editando && editor.value.charAt(0) === "=" && /^Arrow/.test(ev.key) && modoPuntero()) {
        ev.preventDefault();
        var dd = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[ev.key];
        var base0 = editando.cursor || { c: ac.c, f: ac.f };
        var nc = Math.max(1, base0.c + dd[0]), nf = Math.max(1, base0.f + dd[1]);
        editando.cursor = { c: nc, f: nf };
        insertarRef(textoRef(nc, nf, nc, nf));
        return true;
      }
      return false;
    }
    editor.addEventListener("keydown", function (ev) { teclaEdicion(ev, editor); });
    editor.addEventListener("input", function () { fx.value = editor.value; if (editando) { editando.puntero = false; editando.cursor = null; } resaltarRefs(editor.value); });
    fx.addEventListener("focus", function () { if (!editando) empezar(undefined, false); });
    fx.addEventListener("input", function () { if (!editando) empezar(fx.value, false); else if (editando.enCelda) editor.value = fx.value; if (editando) editando.puntero = false; resaltarRefs(fx.value); });
    fx.addEventListener("keydown", function (ev) { teclaEdicion(ev, fx); });
    btnOk.addEventListener("click", function () { if (editando) confirmar([0, 0]); });
    btnNo.addEventListener("click", function () { cancelar(); });
    btnOk.addEventListener("pointerdown", function (ev) { ev.preventDefault(); });
    refEl.addEventListener("keydown", function (ev) {
      if (ev.key !== "Enter") return;
      ev.preventDefault();
      var v = refEl.value.trim().toUpperCase(), k = v.lastIndexOf("!");
      if (k > 0) { var n = v.slice(0, k).replace(/^'|'$/g, ""), i = libro.hojas.findIndex(function (x) { return x.n.toUpperCase() === n; }); if (i >= 0 && i !== hojaI) irHoja(i); v = v.slice(k + 1); }
      var p = M.partir(v.split(":")[0]);
      if (p) { seleccionar(p.c, p.f); rejilla.focus({ preventScroll: true }); } else refEl.value = ref(ac.c, ac.f);
    });
    selFmt.addEventListener("change", function () { if (selFmt.value) ponerFormato(selFmt.value); selFmt.value = ""; });
    rejilla.addEventListener("keydown", function (ev) {
      if (editando || ev.target !== rejilla) return;
      var ctrl = ev.ctrlKey || ev.metaKey, k = ev.key;
      var mov = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[k];
      if (mov) { ev.preventDefault(); if (ctrl) { saltar(mov, ev.shiftKey); } else seleccionar(ac.c + mov[0], ac.f + mov[1], ev.shiftKey); return; }
      if (k === "Enter") { ev.preventDefault(); seleccionar(ac.c, ac.f + (ev.shiftKey ? -1 : 1)); return; }
      if (k === "Tab") { ev.preventDefault(); seleccionar(ac.c + (ev.shiftKey ? -1 : 1), ac.f); return; }
      if (k === "F2") { ev.preventDefault(); empezar(); editando.f2 = true; return; }
      if (k === "Delete" || k === "Backspace") { ev.preventDefault(); borrarSeleccion(); return; }
      if (k === "Home") { ev.preventDefault(); seleccionar(1, ctrl ? 1 : ac.f, ev.shiftKey); return; }
      if (ctrl && (k === "z" || k === "Z")) { ev.preventDefault(); volver(deshacer, rehacer); return; }
      if (ctrl && (k === "y" || k === "Y")) { ev.preventDefault(); volver(rehacer, deshacer); return; }
      if (ctrl && (k === "c" || k === "C")) { ev.preventDefault(); copiar(); return; }
      if (ctrl && (k === "x" || k === "X")) { ev.preventDefault(); copiar(); borrarSeleccion(); return; }
      if (ctrl && (k === "v" || k === "V")) { if (portapapeles) { ev.preventDefault(); pegar(); } return; }
      if (ctrl && (k === "d" || k === "D")) { ev.preventDefault(); rellenarAbajo(); return; }
      if (ctrl && (k === "a" || k === "A")) { ev.preventDefault(); ancla = { c: 1, f: 1 }; ac = { c: H().dim[0], f: H().dim[1] }; ubicarSeleccion(); mostrarEstado(); return; }
      if (!ctrl && !ev.altKey && k.length === 1) { ev.preventDefault(); empezar(k); return; }
    });
    rejilla.addEventListener("paste", function (ev) {
      if (editando) return;
      var t = ev.clipboardData && ev.clipboardData.getData("text/plain");
      if (t) { ev.preventDefault(); pegar(t); }
    });
    // Ctrl+flecha: salta al borde del bloque de datos, como en Excel.
    function saltar(d, ext) {
      var hoja = H(), c = ac.c, f = ac.f;
      function lleno(c1, f1) { var x = hoja.celdas[ref(c1, f1)]; return x && x.e !== null && x.e !== ""; }
      var empieza = lleno(c, f), sig = lleno(c + d[0], f + d[1]);
      for (var i = 0; i < 500; i++) {
        var nc = c + d[0], nf = f + d[1];
        if (nc < 1 || nf < 1 || nc > colsVis || nf > filasVis) break;
        if (empieza && sig) { if (!lleno(nc, nf)) break; c = nc; f = nf; }
        else { c = nc; f = nf; if (lleno(c, f)) break; }
      }
      seleccionar(c, f, ext);
    }

    // ------------------------------------------------------------ revisión
    function etiquetaColumna(hoja, refCelda) {
      var p = M.partir(refCelda);
      var t = (hoja.t || []).filter(function (x) { var r = M.leerRef(x.ref); return r && p.c >= r.c1 && p.c <= r.c2 && p.f > r.f1 && p.f <= r.f2; })[0];
      if (t) { var r0 = M.leerRef(t.ref); return t.cols[p.c - r0.c1] || M.colLetras(p.c); }
      for (var c = p.c - 1; c >= 1; c--) { var x = hoja.celdas[ref(c, p.f)]; if (x && typeof x.e === "string" && x.e.charAt(0) !== "=") return x.e; }
      return refCelda;
    }
    function revisarHoja() {
      if (editando) confirmar();
      if (!revision.length) { decir("Esta hoja no tiene celdas para revisar."); return; }
      intentos++;
      resultado = M.revisar(libro, revision);
      marcasRev = {};
      resultado.forEach(function (x) { marcasRev[x.hoja + "!" + x.ref] = x.ok ? "ok" : x.motivo === "vacía" ? "vacia" : "mal"; });
      refrescar();
      var ok = resultado.filter(function (x) { return x.ok; }).length;
      evento({ tipo: "revision", ok: ok, total: resultado.length, intentos: intentos, resultado: resultado, grupos: grupos() });
    }
    function grupos() {
      var g = {}, orden = [];
      resultado.forEach(function (x) {
        var hoja = libro.hoja(x.hoja), p = M.partir(x.ref);
        var t = (hoja.t || []).filter(function (tt) { var r = M.leerRef(tt.ref); return r && p.c >= r.c1 && p.c <= r.c2 && p.f > r.f1 && p.f <= r.f2; })[0];
        var k = t ? x.hoja + "!" + M.colLetras(p.c) : x.hoja + "!" + x.ref;
        if (!g[k]) { g[k] = { clave: k, hoja: x.hoja, nombre: etiquetaColumna(hoja, x.ref), ok: 0, total: 0, malas: [], ref: x.ref }; orden.push(k); }
        g[k].total++;
        if (x.ok) g[k].ok++; else g[k].malas.push(x);
      });
      return orden.map(function (k) { return g[k]; });
    }
    function referenciaDe(hoja, r) {
      var x = revision.filter(function (e) { return e.hoja === hoja && e.ref === r; })[0];
      return x ? x.r : null;
    }

    // ------------------------------------------------------------ cargar, reiniciar y exportar
    function cargar(datos, opc) {
      opc = opc || {};
      base = datos;
      clave = opc.clave || clave;
      libro = new M.Libro(JSON.parse(JSON.stringify(datos)));
      revision = (opc.revision || (datos.revisar || []).map(function (x) { return { hoja: x[0], ref: x[1], r: b64(x[2]) }; })).filter(function (x) { return x.r !== null && x.r !== undefined && x.r !== ""; });
      cambios = {};
      var guardado = opc.sinGuardado ? null : leer(clave);
      if (guardado && guardado.cambios) {
        Object.keys(guardado.cambios).forEach(function (k) {
          var i = k.lastIndexOf("!"), x = guardado.cambios[k], hn = k.slice(0, i), r = k.slice(i + 1);
          if (!libro.hoja(hn)) return;
          libro.poner(hn, r, x ? x.e : null, x ? x.s : 0);
          cambios[k] = x;
        });
      }
      deshacer = []; rehacer = []; resultado = null; marcasRev = {}; intentos = 0;
      pintarEstilos();
      hojaI = Math.min(datos.activa || 0, libro.hojas.length - 1);
      irHoja(hojaI);
      evento({ tipo: "carga" });
    }
    function reiniciar() {
      if (!base) return;
      if (Object.keys(cambios).length && !window.__hjSinConfirmar) {
        decir("¿Borrar lo que escribiste? Pulsa ↺ otra vez en 4 segundos para confirmar.");
        if (!reiniciar.armado) { reiniciar.armado = true; setTimeout(function () { reiniciar.armado = false; }, 4000); return; }
      }
      reiniciar.armado = false;
      guardar(clave, null);
      cargar(base, { clave: clave, revision: revision, sinGuardado: true });
      decir("Hoja reiniciada con los datos del caso.");
    }
    function exportar(nombre) {
      if (editando) confirmar();
      var bytes = X.exportar(libro, { activa: hojaI, titulo: op.tituloArchivo || "Hoja JMD" });
      var n = nombre || (typeof op.nombreArchivo === "function" ? op.nombreArchivo() : op.nombreArchivo) || "hoja-jmd.xlsx";
      try { descargarBytes(bytes, n); decir("Descargando " + n + " (" + Math.round(bytes.length / 1024) + " KB). Ábrelo en Excel: tus fórmulas se recalculan."); }
      catch (e) { decir("No se pudo descargar: " + e.message); }
      evento({ tipo: "exportar", nombre: n, bytes: bytes.length });
      return bytes;
    }
    var avisoT = null;
    function decir(t) {
      estado.innerHTML = "";
      estado.appendChild(h("span", { class: "hj-ayuda", text: t }));
      clearTimeout(avisoT);
      avisoT = setTimeout(mostrarEstado, 6000);
    }
    window.addEventListener("resize", function () { if (tabla) ubicarSeleccion(); });

    return {
      cargar: cargar, revisar: revisarHoja, exportar: exportar, reiniciar: reiniciar, irHoja: irHoja, decir: decir,
      libro: function () { return libro; }, base: function () { return base; }, revision: function () { return revision; },
      resultado: function () { return resultado; }, grupos: function () { return resultado ? grupos() : []; }, referenciaDe: referenciaDe,
      irA: function (hoja, r) { var i = libro.hojas.findIndex(function (x) { return x.n === hoja; }); if (i >= 0 && i !== hojaI) irHoja(i); var p = M.partir(r); if (p) seleccionar(p.c, p.f); rejilla.focus({ preventScroll: true }); },
      escribir: function (hoja, r, texto) { var c = libro.celda(hoja, r); aplicar([{ hoja: hoja, ref: r, e: libro.interpretar(texto, c ? c.s : 0) }]); },
      escribirVarios: function (lista) { aplicar(lista.map(function (x) { var c = libro.celda(x.hoja, x.ref); return { hoja: x.hoja, ref: x.ref, e: typeof x.texto === "string" ? libro.interpretar(x.texto, c ? c.s : 0) : x.texto }; })); },
      seleccionado: function () { return { hoja: H().n, ref: ref(ac.c, ac.f) }; },
      elemento: cont
    };
  }

  window.HojaJMD = { montar: montar, descargarBytes: descargarBytes };
})();
