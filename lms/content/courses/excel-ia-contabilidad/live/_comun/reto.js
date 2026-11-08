/* Excel + IA · escena «Reto de aplicación» (04-caso): Hoja JMD con el caso de la empresa del alumno, revisión de las
   celdas amarillas, exportar a .xlsx y «Simula tu escenario con IA». Necesita ex.js (deja window.EX_CASO), hoja-motor.js,
   hoja-xlsx.js y hoja.js. El esquema del escenario está junto a la escena (escenario.json) y el LMS lo lee también. */
(function () {
  "use strict";
  var C = window.EX_CASO, M = window.HojaMotor, EX = window.EX;
  if (!C || !M || !window.HojaJMD) return;
  var D = EX.datos, h = EX.h, rico = EX.rico;

  function leer(k) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function guardar(k, v) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* */ } }
  function json(url) {
    return fetch(url, { credentials: "same-origin", cache: "no-cache" }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    });
  }
  function clonar(x) { return JSON.parse(JSON.stringify(x)); }
  function azar(semilla) { var a = semilla >>> 0; return function () { a |= 0; a = a + 0x6d2b79f5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  var esquema = null, datosEmpresa = null, empresa = null, escenario = null, modo = "empresa";
  var hoja = window.HojaJMD.montar(C.zonaHoja, {
    nombreArchivo: function () {
      var e = empresa || {};
      return D.leccion + "-" + (modo === "ia" ? "escenario-ia" : (e.id || "caso") + "-" + (e.slug || "")) + "-hoja-jmd.xlsx";
    },
    tituloArchivo: "Hoja JMD · " + D.tema,
    alCambiar: function (ev) { if (ev.tipo === "revision") pintarRevision(ev); }
  });

  // ------------------------------------------------------------ revisión
  var panelRev = C.panelRev;
  function pintarRevision(ev) {
    panelRev.innerHTML = "";
    var pct = ev.total ? Math.round(ev.ok * 100 / ev.total) : 0;
    panelRev.appendChild(h("h2", null, h("span", { class: "k", text: "✔" }), "Revisión de tu hoja"));
    panelRev.appendChild(h("div", { class: "rv-total" + (ev.ok === ev.total ? " todo" : "") },
      h("b", { text: ev.ok + " de " + ev.total }), h("span", { text: " celdas bien (" + pct + " %)" + (ev.intentos > 1 ? " · intento " + ev.intentos : "") }),
      h("i", { style: "--p:" + pct + "%" })));
    if (ev.ok === ev.total) {
      panelRev.appendChild(h("p", { class: "x-tip", html: "<b>¡Todo cuadra!</b> Descarga tu Excel (<b>⬇ Excel</b>) y entrégalo como evidencia del módulo. Luego escribe en el muro qué corregiste." }));
      if (EX.enLMS && !pintarRevision.enviada) {
        pintarRevision.enviada = true;
        try {
          fetch("/api/v1/live/" + encodeURIComponent(EX.leccion) + "/evidencia", {
            method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ escena: EX.escena, tipo: "hallazgo", detalle: "hoja-jmd " + (modo === "ia" ? "escenario IA" : (empresa && empresa.id)) + ": " + ev.ok + "/" + ev.total + " al intento " + ev.intentos })
          }).catch(function () { /* sin red */ });
        } catch (e) { /* */ }
      }
    }
    var lista = h("ul", { class: "rv-lista" });
    ev.grupos.forEach(function (g) {
      var bien = g.ok === g.total;
      var li = h("li", { class: bien ? "ok" : "mal" },
        h("button", { type: "button", class: "rv-ir", onclick: function () { hoja.irA(g.hoja, (g.malas[0] || g).ref); } },
          h("span", { class: "rv-ic", text: bien ? "✓" : "✗" }), h("b", { text: g.nombre }), h("small", { text: " " + g.hoja + " · " + g.ok + "/" + g.total })));
      if (!bien) {
        var vacias = g.malas.filter(function (x) { return x.motivo === "vacía"; }).length, aMano = g.malas.filter(function (x) { return x.motivo === "a_mano"; }).length;
        var t = g.malas.slice(0, 4).map(function (x) { return x.ref; }).join(", ") + (g.malas.length > 4 ? "…" : "");
        li.appendChild(h("div", { class: "rv-det", text: (vacias === g.malas.length ? "Vacías: " : aMano ? "Revisa (" + aMano + " escritas a mano): " : "Revisa: ") + t }));
        if (ev.intentos >= 2 && vacias < g.malas.length) {
          var pista = h("button", { type: "button", class: "rv-pista", text: "💡 Ver la fórmula de referencia" });
          pista.onclick = function () {
            var r = hoja.referenciaDe(g.hoja, g.malas[0].ref);
            pista.replaceWith(h("code", { class: "x-c rv-ref", text: g.malas[0].ref + ": " + (typeof r === "string" ? r : JSON.stringify(r)) }));
          };
          li.appendChild(pista);
        }
      }
      lista.appendChild(li);
    });
    panelRev.appendChild(lista);
    if (ev.ok < ev.total) panelRev.appendChild(h("p", { class: "x-nota", text: ev.intentos < 2 ? "Corrige y vuelve a revisar. Desde el segundo intento puedes ver la fórmula de referencia de cada columna." : "Compara tu fórmula con la de referencia: ¿apuntas a la fila correcta? ¿Pusiste $ en la tasa?" }));
  }
  function panelRevInicial() {
    panelRev.innerHTML = "";
    panelRev.appendChild(h("h2", null, h("span", { class: "k", text: "✔" }), "Revisión de tu hoja"));
    var n = hoja.revision().length;
    panelRev.appendChild(h("p", { class: "x-nota", text: n ? "Completa las " + n + " celdas amarillas con fórmulas y pulsa «✔ Revisar». Marcamos en verde lo que está bien y en rojo lo que debes corregir." : "Esta hoja no tiene celdas para revisar." }));
  }

  // ------------------------------------------------------------ cargar la empresa
  function cargarEmpresa(e) {
    empresa = e;
    modo = "empresa";
    C.aviso(C.elegida() ? "" : "Mostramos " + e.icono + " " + e.corto + " de ejemplo: elige tu empresa arriba para cargar la tuya.");
    return json("hoja-" + e.id + ".json").then(function (d) {
      datosEmpresa = d;
      var esc = leer("ex-esc:" + D.leccion + ":" + e.id);
      if (esc && esquema) { try { aplicar(esc, true); return; } catch (er) { guardar("ex-esc:" + D.leccion + ":" + e.id, null); } }
      hoja.cargar(d, { clave: "hoja-jmd:" + D.leccion + ":" + e.id });
      panelRevInicial();
      pintarIA();
    }).catch(function (er) {
      C.aviso("No se pudo cargar la hoja de " + e.corto + " (" + er.message + "). Descarga el Excel y trabaja en tu computadora.");
    });
  }

  // El esquema trae el máximo de filas de las 10 empresas; aquí se ajusta a las tablas del libro cargado.
  function esquemaEmpresa() {
    var e = clonar(esquema), L = new M.Libro(clonar(datosEmpresa));
    (e.tablas || []).forEach(function (t) {
      var td = tablaDe(L, t);
      if (!td) return;
      var cap = td.r.f2 - td.r.f1 - (t.desde || 0);
      t.max_filas = cap;
      if (t.filas_fijas) t.min_filas = cap;
    });
    return e;
  }
  function capacidades() { var out = {}; (esquemaEmpresa().tablas || []).forEach(function (t) { out[t.tabla] = t.max_filas; }); return out; }

  // ------------------------------------------------------------ escenarios: aplicar uno validado
  function serializar(L, activa) {
    return {
      v: 1, estilos: L.estilos.slice(), activa: activa,
      hojas: L.hojas.map(function (x) {
        var c = Object.keys(x.celdas).map(function (r) { return [r, x.celdas[r].e, x.celdas[r].s]; });
        return { n: x.n, dim: x.dim.slice(), w: x.w, fz: x.fz, t: x.t, c: c };
      })
    };
  }
  function tablaDe(L, t) { var hj = L.hoja(t.hoja); var d = hj && (hj.t || []).filter(function (x) { return x.n === t.tabla; })[0]; return d ? { hoja: hj, r: M.leerRef(d.ref) } : null; }
  function derivar(L, t, col, fila, i) {
    var d = col.derivar;
    if (/^seq:/.test(d)) { var p = d.split(":"); return p[1] + String(i + 1).padStart(+p[2] || 2, "0"); }
    if (/^mescorto:/.test(d)) { var vc = L.valor(L.hoja(t.hoja), d.split(":")[1] + fila); if (typeof vc !== "number") return null; var mc = M.MESES[M.deSerial(vc).m - 1].slice(0, 3); return mc.charAt(0).toUpperCase() + mc.slice(1); }
    if (/^mesnombre:/.test(d)) { var v = L.valor(L.hoja(t.hoja), d.split(":")[1] + fila); if (typeof v !== "number") return null; var m = M.MESES[M.deSerial(v).m - 1]; return m.charAt(0).toUpperCase() + m.slice(1); }
    if (d.charAt(0) === "=") { L.cache = {}; var x = L.evaluarEn(d.replace(/\{f\}/g, fila), t.hoja, col.col + fila); return M.esErr(x) ? null : x; }
    return null;
  }

  // esc: escenario ya validado (HojaMotor.validarEscenario). Devuelve cuántas filas cargó.
  function aplicar(esc, silencioso) {
    var L = new M.Libro(clonar(datosEmpresa));
    var baseL = new M.Libro(clonar(datosEmpresa));
    var rev = (datosEmpresa.revisar || []).map(function (x) { return { hoja: x[0], ref: x[1], r: JSON.parse(decodeURIComponent(escape(atob(x[2])))) }; });
    var quitar = {}, filasCargadas = 0;
    Object.keys(esc.parametros || {}).forEach(function (k) { var i = k.lastIndexOf("!"); if (L.hoja(k.slice(0, i))) L.poner(k.slice(0, i), k.slice(i + 1), esc.parametros[k]); });
    (esquema.tablas || []).forEach(function (t) {
      var filas = esc.tablas && esc.tablas[t.tabla];
      if (!filas) return;
      var td = tablaDe(L, t);
      if (!td) return;
      // relación con una tabla que no cambió: la clave debe existir en la hoja
      (esquema.relaciones || []).forEach(function (rel) {
        var de = rel.de.split("."), a = rel.a.split(".");
        if (de[0] !== t.tabla || (esc.tablas && esc.tablas[a[0]])) return;
        var ta = (esquema.tablas || []).filter(function (x) { return x.tabla === a[0]; })[0], tda = ta && tablaDe(L, ta), colA = ta && ta.columnas.filter(function (c) { return c.nombre === a[1]; })[0];
        if (!tda || !colA) return;
        var validos = {};
        for (var f = tda.r.f1 + 1; f <= tda.r.f2; f++) { var v = L.valor(tda.hoja, colA.col + f); if (v !== null) validos[M.normal(v)] = v; }
        filas = filas.filter(function (fl) { var k = M.normal(fl[de[1]]); if (validos[k] === undefined) return false; fl[de[1]] = validos[k]; return true; });
      });
      var d0 = t.desde || 0, cap = td.r.f2 - td.r.f1 - d0, n = t.filas_fijas ? cap : Math.min(filas.length, cap);
      for (var i = 0; i < cap; i++) {
        var fila = td.r.f1 + 1 + d0 + i;
        if (i < n) {
          var datos = filas[i] || {};
          t.columnas.forEach(function (col) {
            if (col.calc || col.fija || col.derivar) return;
            if (datos[col.nombre] === undefined) return;
            L.poner(t.hoja, col.col + fila, datos[col.nombre]);
          });
          filasCargadas++;
        } else {
          t.columnas.forEach(function (col) { delete td.hoja.celdas[col.col + fila]; quitar[t.hoja + "!" + col.col + fila] = true; });
        }
      }
      L.recalcular();
      t.columnas.forEach(function (col) {
        if (!col.derivar) return;
        for (var j = 0; j < n; j++) { var fl = td.r.f1 + 1 + d0 + j, v = derivar(L, t, col, fl, j); if (v !== null) L.poner(t.hoja, col.col + fl, v); }
      });
    });
    // celdas amarillas con un valor fijo (p. ej. la clasificación): se deduce de otra columna de la misma fila
    Object.keys(esquema.valores_por || {}).forEach(function (k) {
      var objetivo = k.split("."), clave = esquema.valores_por[k];
      var t = (esquema.tablas || []).filter(function (x) { return x.tabla === objetivo[0]; })[0];
      if (!t) return;
      var cObj = t.columnas.filter(function (c) { return c.nombre === objetivo[1]; })[0], cKey = t.columnas.filter(function (c) { return c.nombre === clave; })[0];
      var tb = tablaDe(baseL, t);
      if (!cObj || !cKey || !tb) return;
      var mapa = {};
      rev.forEach(function (x) {
        var p = M.partir(x.ref);
        if (x.hoja === t.hoja && M.colLetras(p.c) === cObj.col && p.f > tb.r.f1 && p.f <= tb.r.f2) { var kv = baseL.valor(tb.hoja, cKey.col + p.f); if (kv !== null) mapa[M.normal(kv)] = x.r; }
      });
      rev.forEach(function (x) {
        var p = M.partir(x.ref);
        if (x.hoja === t.hoja && M.colLetras(p.c) === cObj.col && p.f > tb.r.f1 && p.f <= tb.r.f2) {
          var kv = L.valor(L.hoja(t.hoja), cKey.col + p.f), r = kv === null ? undefined : mapa[M.normal(kv)];
          if (r === undefined) quitar[x.hoja + "!" + x.ref] = true; else x.r = r;
        }
      });
    });
    if (esquema.titulo_celda && esc.titulo) { var tc = esquema.titulo_celda.split("!"); L.poner(tc[0], tc[1], esc.titulo); }
    if (esquema.nota_celda && esc.nota) { var nc = esquema.nota_celda.split("!"); L.poner(nc[0], nc[1], esc.nota); }
    rev = rev.filter(function (x) { return !quitar[x.hoja + "!" + x.ref]; });
    escenario = esc;
    modo = "ia";
    guardar("ex-esc:" + D.leccion + ":" + empresa.id, esc);
    hoja.cargar(serializar(L, datosEmpresa.activa), { clave: "hoja-jmd:" + D.leccion + ":" + empresa.id + ":ia:" + firma(esc), revision: rev });
    panelRevInicial();
    pintarIA();
    if (!silencioso) hoja.decir("Escenario cargado: " + filasCargadas + " filas nuevas. Escribe tus fórmulas y pulsa «✔ Revisar».");
    return filasCargadas;
  }
  function firma(esc) { var s = JSON.stringify(esc), k = 0; for (var i = 0; i < s.length; i++) k = (k * 31 + s.charCodeAt(i)) | 0; return (k >>> 0).toString(36); }
  function volverEmpresa() {
    guardar("ex-esc:" + D.leccion + ":" + empresa.id, null);
    escenario = null;
    cargarEmpresa(empresa);
  }

  // ------------------------------------------------------------ el pedido para la IA (el LMS arma el mismo)
  function muestra() {
    var L = new M.Libro(clonar(datosEmpresa)), out = { tablas: {}, parametros: {} };
    L.recalcular();
    (esquema.tablas || []).forEach(function (t) {
      var td = tablaDe(L, t);
      if (!td) return;
      var cols = t.columnas.filter(function (c) { return !c.calc && !c.fija && !c.derivar; }), filas = [];
      var d0 = t.desde || 0;
      for (var f = td.r.f1 + 1 + d0; f <= Math.min(td.r.f2, td.r.f1 + 3 + d0); f++) filas.push(cols.map(function (c) { var v = L.valor(td.hoja, c.col + f); return c.tipo === "fecha" && typeof v === "number" ? M.formatear(v, "dd/mm/yyyy") : v; }));
      out.tablas[t.tabla] = filas;
    });
    (esquema.parametros || []).forEach(function (p) { var i = p.celda.lastIndexOf("!"); var v = L.valor(L.hoja(p.celda.slice(0, i)), p.celda.slice(i + 1)); out.parametros[p.celda] = p.tipo === "fecha" && typeof v === "number" ? M.formatear(v, "dd/mm/yyyy") : v; });
    return out;
  }
  function describirColumna(c) {
    var t = { fecha: "fecha dd/mm/aaaa", numero: "número", entero: "número entero", porcentaje: "porcentaje en decimal (0.18 = 18 %)", texto: "texto", lista: "una de: " + (c.opciones || []).join(" | ") }[c.tipo] || c.tipo;
    return c.nombre + " (" + t + (c.min !== undefined && c.tipo !== "lista" && c.tipo !== "texto" && c.tipo !== "fecha" ? ", mínimo " + c.min : "") + (c.nota ? "; " + c.nota : "") + ")";
  }
  // Mismo texto que arma el LMS en live_escenario.go (para pegarlo en DeepSeek Harness si la IA de la clase no está).
  function armarPedido(pedido) {
    var e = empresa || {}, lineas = [], esquema = esquemaEmpresa();
    lineas.push("Eres docente de contabilidad en Perú y preparas casos de práctica para Excel. Genera datos FICTICIOS y coherentes para un ejercicio, en el MISMO formato de la hoja del alumno. Responde SOLO un objeto JSON válido: sin texto fuera del JSON, sin comentarios y sin fórmulas.");
    lineas.push("");
    lineas.push("Sesión: " + D.tema + " (" + D.leccion + "). Empresa actual del alumno: " + (e.razon || "") + " · " + (e.rubro || "") + " · " + (e.regimen || "") + ".");
    lineas.push("Pedido del alumno: «" + (pedido || "un caso parecido con otros datos") + "».");
    lineas.push("");
    lineas.push('Formato de la respuesta: {"titulo": "frase corta con la empresa y el periodo", "nota": "una línea sobre los montos (moneda, supuestos)", "supuestos": ["hasta 4 supuestos: periodo, régimen, tipo de cambio…"], "parametros": {"Hoja!Celda": valor}, "tablas": {"NombreTabla": [[valores de la fila en el orden de las columnas]]}}');
    if ((esquema.tablas || []).length) {
      lineas.push("Tablas (cada fila es una lista con las columnas en este orden; no incluyas las columnas que calcula el alumno):");
      esquema.tablas.forEach(function (t) {
        var cols = t.columnas.filter(function (c) { return !c.calc && !c.fija && !c.derivar; });
        if (!cols.length) return;
        var max = Math.min(t.max_filas, t.max_filas_ia || t.max_filas);
        lineas.push("- " + t.tabla + " (hoja " + t.hoja + "; " + (t.desde ? "las primeras " + t.desde + " filas no cambian, genera las siguientes; " : "") + (t.filas_fijas ? "exactamente " + t.min_filas + " filas, en el mismo orden" : "entre " + (t.min_filas || 1) + " y " + max + " filas") + "): " + cols.map(describirColumna).join(" | "));
      });
    }
    if ((esquema.parametros || []).length) {
      lineas.push("Parámetros (celdas sueltas; cambia solo los que el pedido necesite):");
      esquema.parametros.forEach(function (p) { lineas.push("- " + p.celda + " «" + p.etiqueta + "»: " + describirColumna({ nombre: "", tipo: p.tipo }).replace(/^ \(|\)$/g, "")); });
    }
    var reglas = (esquema.reglas || []).concat(["Montos con punto decimal y sin separador de miles ni símbolo de moneda.", "Si el pedido usa otra moneda, escribe los montos en esa moneda y dilo en «nota».", "Nombres, RUC y DNI inventados (RUC de 11 dígitos que empiece con 99)."]);
    lineas.push("Reglas:");
    reglas.forEach(function (r) { lineas.push("- " + r); });
    lineas.push("");
    lineas.push("Ejemplo del formato con los datos actuales (primeras filas): " + JSON.stringify(muestra()));
    return lineas.join("\n");
  }

  // ------------------------------------------------------------ panel «Simula tu escenario con IA»
  var panelIA = C.panelIA;
  var areaPedido = h("textarea", { class: "ia-pedido", maxlength: "300", rows: "2", "aria-label": "Describe el escenario que quieres practicar", placeholder: "Ej.: una bodega con 3 trabajadores y ventas en dólares" });
  var estadoIA = h("div", { class: "ia-estado", "aria-live": "polite" });
  var bGenerar = h("button", { type: "button", class: "x-btn pri", "data-ia-generar": "" }, "✨ Generar escenario");
  var bVariar = h("button", { type: "button", class: "x-btn", "data-ia-variar": "", title: "Cambia los montos y la cantidad de filas sin usar IA" }, "🎲 Variar sin IA");
  var pegarArea = h("textarea", { class: "ia-pegar", rows: "3", "aria-label": "Pega aquí la respuesta (JSON) de DeepSeek Harness", placeholder: "Pega aquí el JSON que te dio la IA" });
  var bCopiar = h("button", { type: "button", class: "x-btn", "data-ia-copiar": "" }, "📋 Copiar pedido");
  var bCargar = h("button", { type: "button", class: "x-btn", "data-ia-cargar": "" }, "Cargar respuesta");
  var manual = h("details", { class: "ia-manual" }, h("summary", { text: "¿Sin IA de la clase? Pídeselo a DeepSeek Harness" }),
    h("p", { class: "x-nota", text: "1) Copia el pedido. 2) Pégalo en DeepSeek Harness. 3) Pega aquí el JSON que te responda y pulsa «Cargar respuesta»." }),
    h("div", { class: "ia-fila" }, bCopiar), pegarArea, h("div", { class: "ia-fila" }, bCargar));
  var tarjeta = h("div", { class: "ia-tarjeta", hidden: true });
  var ocupado = false;

  function pintarIA() {
    panelIA.innerHTML = "";
    panelIA.appendChild(h("h2", null, h("span", { class: "k", text: "✨" }), "Simula tu escenario con IA"));
    if (!esquema) { panelIA.appendChild(h("p", { class: "x-nota", text: "Cargando…" })); return; }
    if (esquema.ia === false) { panelIA.appendChild(h("p", { class: "x-nota", text: "En esta sesión los datos están encadenados entre hojas: practica con tu empresa o con «Variar sin IA»." })); panelIA.appendChild(h("div", { class: "ia-fila" }, bVariar)); return; }
    panelIA.appendChild(h("p", { class: "x-nota", html: rico("Pide un caso **nuevo con el mismo formato**: otra empresa, otro periodo u otro régimen. La hoja se recarga con esos datos y la revisión se recalcula sola.") }));
    panelIA.appendChild(areaPedido);
    var chips = h("div", { class: "ia-chips" });
    (esquema.ejemplos || []).forEach(function (t) { chips.appendChild(h("button", { type: "button", class: "esc-chip ia-chip", onclick: function () { areaPedido.value = t; areaPedido.focus(); } }, t)); });
    panelIA.appendChild(chips);
    panelIA.appendChild(h("div", { class: "ia-fila" }, bGenerar, bVariar));
    panelIA.appendChild(estadoIA);
    tarjeta.innerHTML = "";
    if (modo === "ia" && escenario) {
      tarjeta.hidden = false;
      tarjeta.appendChild(h("b", { text: "Practicas: " + escenario.titulo }));
      if (escenario.supuestos && escenario.supuestos.length) tarjeta.appendChild(h("ul", null, escenario.supuestos.map(function (s) { return h("li", { text: s }); })));
      if (escenario.avisos && escenario.avisos.length) tarjeta.appendChild(h("details", null, h("summary", { text: "Reparamos " + escenario.avisos.length + " dato" + (escenario.avisos.length > 1 ? "s" : "") + " de la respuesta" }), h("ul", null, escenario.avisos.slice(0, 12).map(function (s) { return h("li", { text: s }); }))));
      tarjeta.appendChild(h("button", { type: "button", class: "x-btn", "data-ia-volver": "", onclick: volverEmpresa }, "↩ Volver a mi empresa"));
    } else tarjeta.hidden = true;
    panelIA.appendChild(tarjeta);
    panelIA.appendChild(manual);
  }

  function cargarRespuesta(obj, motor) {
    var r = M.validarEscenario(esquemaEmpresa(), obj);
    if (!r.ok) { estadoIA.className = "ia-estado mal"; estadoIA.textContent = "No pudimos usar la respuesta: " + r.errores.join(" ") + " Prueba otra vez o cambia el pedido."; return false; }
    r.escenario.avisos = r.avisos;
    r.escenario.motor = motor || "";
    var n = aplicar(r.escenario);
    estadoIA.className = "ia-estado ok";
    estadoIA.textContent = "Listo: " + n + " filas" + (r.avisos.length ? " · reparamos " + r.avisos.length + " dato" + (r.avisos.length > 1 ? "s" : "") : "") + (motor ? " · " + motor : "") + ".";
    return true;
  }

  bGenerar.addEventListener("click", function () {
    if (ocupado || !datosEmpresa) return;
    var pedido = areaPedido.value.trim();
    if (pedido.length < 4) { estadoIA.className = "ia-estado mal"; estadoIA.textContent = "Escribe qué escenario quieres (o toca un ejemplo)."; areaPedido.focus(); return; }
    if (!EX.enLMS) { estadoIA.className = "ia-estado mal"; estadoIA.textContent = "Fuera del LMS no hay IA de la clase: usa «Pídeselo a DeepSeek Harness» (abajo)."; manual.open = true; return; }
    ocupado = true; bGenerar.disabled = true;
    var t0 = Date.now();
    estadoIA.className = "ia-estado"; estadoIA.textContent = "Generando escenario… (unos 20 segundos)";
    var reloj = setInterval(function () { estadoIA.textContent = "Generando escenario… " + Math.round((Date.now() - t0) / 1000) + " s"; }, 1000);
    var e = empresa || {};
    fetch("/api/v1/live/" + encodeURIComponent(EX.leccion) + "/escenario", {
      method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ escena: EX.escena, pedido: pedido, empresa: { razon: e.razon, rubro: e.rubro, regimen: e.regimen }, muestra: muestra(), capacidad: capacidades() })
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (b) { return { estado: r.status, b: b }; });
    }).then(function (x) {
      if (x.estado === 200 && x.b && x.b.escenario) { cargarRespuesta(x.b.escenario, x.b.motor); return; }
      var msg = (x.b && (x.b.message || x.b.error && x.b.error.message || x.b.error)) || ("HTTP " + x.estado);
      estadoIA.className = "ia-estado mal";
      if (x.estado === 429) estadoIA.textContent = "Llegaste al tope de escenarios de hoy (" + msg + "). Usa «Variar sin IA» o DeepSeek Harness.";
      else { estadoIA.textContent = "La IA de la clase no está disponible (" + msg + "). Pídeselo a DeepSeek Harness: copia el pedido de abajo."; manual.open = true; }
    }).catch(function (er) {
      estadoIA.className = "ia-estado mal";
      estadoIA.textContent = "Sin conexión con el LMS (" + er.message + "). Prueba con DeepSeek Harness.";
      manual.open = true;
    }).then(function () { clearInterval(reloj); ocupado = false; bGenerar.disabled = false; });
  });
  bCopiar.addEventListener("click", function () {
    var t = armarPedido(areaPedido.value.trim());
    pegarArea.dataset.pedido = t;
    var hecho = function () { estadoIA.className = "ia-estado ok"; estadoIA.textContent = "Pedido copiado. Pégalo en DeepSeek Harness y trae aquí su respuesta."; };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(hecho, function () { mostrarPedido(t); });
      else mostrarPedido(t);
    } catch (e) { mostrarPedido(t); }
  });
  function mostrarPedido(t) {
    var ta = h("textarea", { class: "ia-pegar", rows: "6", readonly: true, "aria-label": "Pedido para copiar" });
    ta.value = t;
    manual.insertBefore(ta, pegarArea);
    ta.select();
    estadoIA.className = "ia-estado"; estadoIA.textContent = "Selecciona el pedido de abajo y cópialo (Ctrl+C).";
  }
  bCargar.addEventListener("click", function () {
    var t = pegarArea.value.trim();
    if (!t) { estadoIA.className = "ia-estado mal"; estadoIA.textContent = "Pega primero la respuesta de la IA."; return; }
    cargarRespuesta(t, "pegado");
  });
  bVariar.addEventListener("click", function () {
    if (!datosEmpresa) return;
    variarSinIA.k = (variarSinIA.k || 0) + 1;
    cargarRespuesta(variarSinIA(variarSinIA.k), "sin IA");
  });

  // Variación local y reproducible (misma semilla, mismos datos): montos ±30 % y algunas filas menos.
  function variarSinIA(k) {
    var rnd = azar(1000 * k + (D.sesion || 1)), L = new M.Libro(clonar(datosEmpresa)), out = { titulo: "Variación de práctica n.º " + k + " · " + (empresa ? empresa.corto : ""), supuestos: ["Mismos conceptos con montos distintos (±30 %) y menos filas."], parametros: {}, tablas: {} };
    L.recalcular();
    (esquema.tablas || []).forEach(function (t) {
      var td = tablaDe(L, t);
      if (!td) return;
      var cols = t.columnas.filter(function (c) { return !c.calc && !c.fija && !c.derivar; }), filas = [];
      var d0 = t.desde || 0, cap = td.r.f2 - td.r.f1 - d0, n = t.filas_fijas ? cap : Math.max(t.min_filas || 1, Math.round(cap * (0.6 + rnd() * 0.4)));
      var idx = []; for (var i = 0; i < cap; i++) idx.push(i);
      if (!t.filas_fijas) { while (idx.length > n) idx.splice(Math.floor(rnd() * idx.length), 1); }
      idx.forEach(function (i) {
        var f = td.r.f1 + 1 + d0 + i, fila = {};
        cols.forEach(function (c) {
          var v = L.valor(td.hoja, c.col + f);
          if ((c.tipo === "numero" || c.tipo === "entero") && typeof v === "number" && !c.no_variar) { v = v * (0.7 + rnd() * 0.6); v = c.tipo === "entero" ? Math.max(c.min || 0, Math.round(v)) : M.redondear(v, 2); }
          fila[c.nombre] = c.tipo === "fecha" && typeof v === "number" ? M.formatear(v, "dd/mm/yyyy") : v;
        });
        filas.push(fila);
      });
      out.tablas[t.tabla] = filas;
    });
    return out;
  }

  // ------------------------------------------------------------ arranque
  C.alElegir(function (e) { cargarEmpresa(e); });
  json("escenario.json").then(function (e) { esquema = e; }).catch(function () { esquema = { tablas: [], parametros: [], ia: false }; }).then(function () {
    pintarIA();
    var e = C.empresaActual();
    if (e) cargarEmpresa(e);
  });
  window.EX_RETO = { hoja: hoja, armarPedido: armarPedido, aplicar: aplicar, validar: function (o) { return M.validarEscenario(esquemaEmpresa(), o); }, esquema: function () { return esquema; } };
})();
