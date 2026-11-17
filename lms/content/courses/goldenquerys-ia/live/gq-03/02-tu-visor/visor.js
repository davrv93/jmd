// visor.js · «Tu visor» de GoldenQuerys (gq-03): adjunta tus archivos, mira tu tablero y pregunta.
// Script clásico. Va después de escaner.js (usa window.ESC para leer archivos, tapar datos personales y llamar a la IA).
//
// Tres ideas, en este orden:
//   1. El archivo se lee en el navegador del alumno. Nada se sube.
//   2. El tablero se arma solo con reglas: totales, grupos, meses y avisos. Sin IA y al instante.
//   3. Cada pregunta se intenta primero con reglas. Si las reglas no la entienden, va a la IA, que no recibe el
//      archivo: recibe un resumen ya calculado (sumas por grupo y por mes) con los datos personales tapados.
// Además: «Mezclar» junta varios archivos en una sola tabla (Archivo, Fecha, Concepto, Monto) y «Segmentar con IA»
// le pide a la IA que reparta los conceptos en hasta 6 segmentos (solo ve la lista de conceptos, sin montos); el
// tablero se rehace agrupado por segmento.
(function () {
  "use strict";
  var $ = function (i) { return document.getElementById(i); };
  var el = ESC.el, soles = ESC.soles, miles = ESC.miles, plano = ESC.plano;
  var archivos = [], actual = null;
  // Columnas que suelen traer datos de personas: se ven en el tablero, pero no viajan a la IA.
  var PERSONAL = /cliente|proveedor|vendedor|cajero|responsable|usuario|nombre|apellido|paciente|alumno|trabajador|empleado|dni|ruc|documento|telefono|celular|correo|email|direccion|razon social|contacto/;
  var MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "set", "oct", "nov", "dic"];

  function num(c) { if (!c || c.t === "") return NaN; return c.esNum ? c.n : ESC.numero(c.t); }
  function fecha(c) { if (!c || c.t === "") return ""; if (c.f) return c.f; var x = ESC.fechaDe(c.t); return x ? x.iso : ""; }
  function texto(c) { return c ? String(c.t).trim() : ""; }
  function n2(x) { return Math.round(x * 100) / 100; }
  function fmt(x, dinero) {
    if (typeof x !== "number" || !isFinite(x)) return "—";
    if (dinero) return soles(x);
    var s = String(n2(x)).split(".");
    return miles(s[0]) + (s[1] ? "," + s[1] : "");
  }
  function crudo(x) { return isFinite(x) ? n2(x).toFixed(2) : "0.00"; }
  function etiquetaTiempo(k) { var p = k.split("-"); return p.length === 2 ? MES[+p[1] - 1] + " " + p[0] : +p[2] + " " + MES[+p[1] - 1]; }

  // ---------------------------------------------------------------- preparar: de la ficha a algo que se puede graficar
  function preparar(f) {
    f.vista = { tabla: false };
    if (!f.tabla || !f.filas) return f;
    var T = f.tabla, enc = T.encabezado.fila - 1, fuera = {};
    if (T.totales) fuera[T.totales.fila - 1] = 1;
    (T.pie || []).forEach(function (r) { fuera[r - 1] = 1; });
    var datos = [];
    for (var r = enc + 1; r < f.filas.length; r++) {
      var x = f.filas[r] || [];
      if (fuera[r] || !x.some(function (c) { return c && c.t !== ""; })) continue;
      datos.push(x);
    }
    var cols = T.columnas.filter(function (c) { return c.tipo !== "vacia"; });
    var medidas = cols.filter(function (c) { return c.tipo === "monto" || (c.tipo === "entero" && /cant|unid|stock|horas|piezas|kilos|kg|litros/.test(plano(c.nombre))); });
    var grupos = cols.filter(function (c) {
      if (c.tipo === "categoria") return true;
      if (c.tipo !== "texto") return false;
      var d = {}, n = 0;
      datos.forEach(function (x) { var t = plano(texto(x[c.k])); if (t && !d[t]) { d[t] = 1; n++; } });
      return n >= 2 && n <= Math.max(40, datos.length * 0.5);
    });
    var fechas = cols.filter(function (c) { return c.tipo === "fecha"; });
    var pref = function (lista, re) { return lista.filter(function (c) { return re.test(plano(c.nombre)); })[0] || null; };
    f.vista = {
      tabla: true, datos: datos, cols: cols, medidas: medidas, grupos: grupos, fechas: fechas,
      m: pref(medidas, /^total|importe|monto|venta/) || pref(medidas, /total|subtotal/) || medidas[medidas.length - 1] || null,
      g: pref(grupos, /producto|categor|rubro|concepto|tipo|servicio|curso|area|sucursal|medio/) || grupos.filter(function (c) { return !PERSONAL.test(plano(c.nombre)); })[0] || grupos[0] || null,
      d: fechas[0] || null,
    };
    return f;
  }
  function suma(f, m) {
    var s = 0, n = 0, mn = Infinity, mx = -Infinity;
    f.vista.datos.forEach(function (x) { var v = m ? num(x[m.k]) : 1; if (!isFinite(v)) return; s += v; n++; if (v < mn) mn = v; if (v > mx) mx = v; });
    return { s: n2(s), n: n, min: n ? mn : NaN, max: n ? mx : NaN, prom: n ? n2(s / n) : NaN };
  }
  function porGrupo(f, g, m) {
    var o = {}, lista = [];
    f.vista.datos.forEach(function (x) {
      var k = texto(x[g.k]) || "(sin dato)", key = plano(k), v = m ? num(x[m.k]) : 1;
      if (!isFinite(v)) v = 0;
      if (!o[key]) { o[key] = { k: k, s: 0, n: 0 }; lista.push(o[key]); }
      o[key].s += v; o[key].n++;
    });
    lista.forEach(function (a) { a.s = n2(a.s); });
    return lista.sort(function (a, b) { return b.s - a.s; });
  }
  function porTiempo(f, d, m) {
    var dias = {}, meses = {};
    f.vista.datos.forEach(function (x) {
      var iso = fecha(x[d.k]); if (!iso) return;
      var v = m ? num(x[m.k]) : 1; if (!isFinite(v)) v = 0;
      [[dias, iso], [meses, iso.slice(0, 7)]].forEach(function (p) { if (!p[0][p[1]]) p[0][p[1]] = { k: p[1], s: 0, n: 0 }; p[0][p[1]].s += v; p[0][p[1]].n++; });
    });
    var porMes = Object.keys(meses).length > 1, o = porMes ? meses : dias;
    var lista = Object.keys(o).sort().map(function (k) { o[k].s = n2(o[k].s); return o[k]; });
    return { unidad: porMes ? "mes" : "día", lista: lista };
  }

  function chipDe(f) { return f.mezcla ? el("span", { class: "x-ico v-mix-ico", "aria-hidden": "true", text: "MIX" }) : ESC.chipTipo(f.tipo); }

  // ---------------------------------------------------------------- 2 · el tablero
  function ficha(titulo, valor, nota, clase) {
    return el("div", { class: "v-kpi " + (clase || "") }, [el("span", { class: "v-kpi-t", text: titulo }), el("b", { class: "v-kpi-v", text: valor }), nota ? el("span", { class: "v-kpi-n", text: nota }) : null]);
  }
  function barras(lista, dinero, max) {
    var tope = Math.max.apply(null, lista.map(function (a) { return Math.abs(a.s); }).concat([0.0001]));
    return el("ol", { class: "v-barras" }, lista.slice(0, max || 8).map(function (a, i) {
      var b = el("i", { class: "v-barra" + (i === 0 ? " top" : "") });
      b.style.width = Math.max(2, Math.round(Math.abs(a.s) / tope * 100)) + "%";
      return el("li", { title: a.n + " registros" }, [el("span", { class: "v-barra-k", text: a.k }), el("span", { class: "v-barra-p" }, [b]), el("b", { class: "v-barra-v", text: fmt(a.s, dinero) })]);
    }));
  }
  function columnas(lista, dinero, corto) {
    var tope = Math.max.apply(null, lista.map(function (a) { return Math.abs(a.s); }).concat([0.0001]));
    var top = lista.reduce(function (a, b) { return b.s > a.s ? b : a; }, lista[0]);
    return el("ol", { class: "v-cols" }, lista.slice(-31).map(function (a) {
      var b = el("i", { class: "v-col" + (a === top ? " top" : "") });
      b.style.height = Math.max(3, Math.round(Math.abs(a.s) / tope * 100)) + "%";
      return el("li", { title: etiquetaTiempo(a.k) + ": " + fmt(a.s, dinero) }, [el("span", { class: "v-col-p" }, [b]), el("span", { class: "v-col-k", text: corto ? String(+a.k.slice(8)) : etiquetaTiempo(a.k) })]);
    }));
  }
  function selector(etq, lista, elegido, alCambiar, extra) {
    var s = el("select", { class: "v-sel", "aria-label": etq }, (extra ? [el("option", { value: "-1", text: extra })] : []).concat(lista.map(function (c) { return el("option", { value: String(c.k), text: c.nombre }); })));
    s.value = elegido ? String(elegido.k) : "-1";
    s.addEventListener("change", function () { var k = +s.value; alCambiar(lista.filter(function (c) { return c.k === k; })[0] || null); });
    return el("label", { class: "v-campo" }, [el("span", { text: etq }), s]);
  }
  function avisos(f) {
    var T = f.tabla, a = [];
    if (T.duplicados && T.duplicados.length) a.push(T.duplicados.length === 1 ? "1 fila repetida" : T.duplicados.length + " filas repetidas");
    if (T.cuadre && !T.cuadre.cuadra) a.push("la fila TOTAL no cuadra con la suma (diferencia " + fmt(T.cuadre.diferencia, true) + ")");
    var huecos = T.columnas.filter(function (c) { return c.tipo !== "vacia" && c.vacios > 0; });
    if (huecos.length) a.push("celdas vacías en «" + huecos.slice(0, 2).map(function (c) { return c.nombre; }).join("» y «") + "»" + (huecos.length > 2 ? " y " + (huecos.length - 2) + " más" : ""));
    if (T.rucMalos && T.rucMalos.length) a.push(T.rucMalos.length + " RUC con el dígito mal");
    return a;
  }
  function tablaPrevia(f, filtro) {
    var V = f.vista, q = plano(filtro || "").trim();
    var filas = q ? V.datos.filter(function (x) { return x.some(function (c) { return c && plano(c.t).indexOf(q) >= 0; }); }) : V.datos;
    var t = el("table", { class: "v-tabla" }, [
      el("thead", null, [el("tr", null, V.cols.map(function (c) { return el("th", { class: c.tipo === "monto" || c.tipo === "entero" ? "num" : null, text: c.nombre }); }))]),
      el("tbody", null, filas.slice(0, 25).map(function (x) { return el("tr", null, V.cols.map(function (c) { return el("td", { class: c.tipo === "monto" || c.tipo === "entero" ? "num" : null, text: texto(x[c.k]) }); })); })),
    ]);
    return { nodo: t, total: filas.length };
  }
  function pintarTablero(f) {
    var cont = $("tablero"); cont.textContent = "";
    var V = f.vista;
    cont.appendChild(el("div", { class: "v-cab" }, [chipDe(f), el("b", { text: f.nombre }), el("span", { class: "v-cab-n", text: V.tabla ? miles(V.datos.length) + " registros · " + V.cols.length + " columnas" + (f.hoja ? " · hoja «" + f.hoja + "»" : "") : miles(f.caracteres || 0) + " caracteres" })]));
    if (!V.tabla) { // PDF o texto: la ficha que arman las reglas
      if (f.sinTexto) cont.appendChild(el("p", { class: "v-nota", text: "Este archivo es una imagen escaneada: no trae texto que se pueda leer. Prueba con otro, o con una foto pasada por un lector de texto (OCR)." }));
      var caja = el("div", { class: "x-ficha" }); cont.appendChild(caja);
      ESC.pintarFicha(caja, f, { miRuc: ESC.miRuc() });
      return;
    }
    if (!V.datos.length) { cont.appendChild(el("p", { class: "v-nota", text: "No encontré filas de datos debajo del encabezado. ¿Es la hoja correcta?" })); return; }
    if (f.mezcla) cont.appendChild(el("details", { class: "v-det v-mix-det" }, [el("summary", { text: "Junté tus archivos en una sola tabla: Archivo, Fecha, Concepto y Monto. Ver qué tomé de cada uno" }), el("ul", { class: "v-mix-notas" }, f.notas.map(function (n) { return el("li", { text: n }); }))]));
    var dinero = !!(V.m && V.m.tipo === "monto"), S = suma(f, V.m);
    if (V.medidas.length > 1 || V.grupos.length > 1) {
      cont.appendChild(el("div", { class: "v-ctl" }, [
        V.medidas.length > 1 ? selector("Qué sumo", V.medidas, V.m, function (c) { V.m = c; pintarTodo(); }) : null,
        V.grupos.length > 1 ? selector("Agrupado por", V.grupos, V.g, function (c) { V.g = c; pintarTodo(); }) : null,
      ]));
    }
    cont.appendChild(cajaSegmentos(f));
    var kpis = [ficha("Registros", miles(V.datos.length), "filas con datos")];
    if (V.m) {
      kpis.push(ficha("Total de «" + V.m.nombre + "»", fmt(S.s, dinero), "la suma de todas las filas", "oro"));
      kpis.push(ficha("Promedio por registro", fmt(S.prom, dinero), "de " + fmt(S.min, dinero) + " a " + fmt(S.max, dinero)));
    }
    var G = V.g ? porGrupo(f, V.g, V.m) : null, Tm = V.d ? porTiempo(f, V.d, V.m) : null;
    if (G && G.length) kpis.push(ficha("Primero en «" + V.g.nombre + "»", G[0].k, fmt(G[0].s, dinero) + (V.m && S.s ? " · " + Math.round(G[0].s / S.s * 100) + " % del total" : "")));
    cont.appendChild(el("div", { class: "v-kpis" }, kpis));
    var graf = [];
    if (G && G.length) graf.push(el("div", { class: "v-graf" }, [el("p", { class: "v-graf-t", text: (V.m ? "«" + V.m.nombre + "»" : "Registros") + " por «" + V.g.nombre + "»" + (G.length > 8 ? " · los 8 mayores de " + G.length : "") }), barras(G, dinero, 8)]));
    if (Tm && Tm.lista.length > 1) {
      var unMes = Tm.unidad === "día" && Tm.lista[0].k.slice(0, 7) === Tm.lista[Tm.lista.length - 1].k.slice(0, 7);
      graf.push(el("div", { class: "v-graf" }, [el("p", { class: "v-graf-t", text: (V.m ? "«" + V.m.nombre + "»" : "Registros") + " por " + Tm.unidad + (unMes ? " · " + etiquetaTiempo(Tm.lista[0].k.slice(0, 7)) : "") }), columnas(Tm.lista, dinero, unMes)]));
    }
    if (graf.length) cont.appendChild(el("div", { class: "v-grafs" }, graf));
    var av = avisos(f);
    if (av.length) cont.appendChild(el("p", { class: "v-aviso" }, [el("b", { text: "Ojo con tu archivo: " }), av.join(" · ") + "."]));
    var busca = el("input", { class: "v-busca", type: "search", placeholder: "Buscar en tus filas…", "aria-label": "Buscar en tus filas" });
    var pie = el("span", { class: "v-tabla-n" }), hueco = el("div", { class: "v-tabla-w" });
    var repintar = function () { var p = tablaPrevia(f, busca.value); hueco.textContent = ""; hueco.appendChild(p.nodo); pie.textContent = p.total > 25 ? "Se ven 25 de " + miles(p.total) : miles(p.total) + (p.total === 1 ? " fila" : " filas"); };
    busca.addEventListener("input", repintar);
    cont.appendChild(el("details", { class: "v-det" }, [el("summary", { text: "Ver mis filas" }), el("div", { class: "v-busca-f" }, [busca, pie]), hueco]));
    repintar();
  }

  // ---------------------------------------------------------------- 3 · preguntas: primero reglas
  function R(t, d) { return { t: t, d: d }; }
  function mencion(cols, p) {
    var mejor = null;
    cols.forEach(function (c) { var n = plano(c.nombre).trim(); if (n.length >= 3 && p.indexOf(n) >= 0 && (!mejor || n.length > plano(mejor.nombre).length)) mejor = c; });
    return mejor;
  }
  function reglasTabla(f, q) {
    var p = plano(q), V = f.vista, m = mencion(V.medidas, p) || V.m, g = mencion(V.grupos, p) || V.g, d = V.d;
    var dinero = !!(m && m.tipo === "monto"), de = m ? "«" + m.nombre + "»" : "registros";
    if (/cuant[oa]s (registros|filas|lineas|operaciones|ventas|compras|gastos|hay)\b/.test(p) && !/total|suma/.test(p)) return R("Hay " + miles(V.datos.length) + " registros.", "Conté las filas con datos debajo del encabezado (sin la fila TOTAL).");
    var tiempo = d && /\b(mes|meses|dia|dias|fecha|cuando|semana)\b/.test(p);
    if (tiempo) {
      var T = porTiempo(f, d, m), orden = T.lista.slice().sort(function (a, b) { return b.s - a.s; });
      if (!orden.length) return null;
      var x = /\b(menos|menor|peor|baj[oa])\b/.test(p) ? orden[orden.length - 1] : orden[0];
      return R("El " + T.unidad + " " + (x === orden[0] ? "más alto" : "más bajo") + " fue " + etiquetaTiempo(x.k) + ", con " + fmt(x.s, dinero) + ".", "Sumé " + de + " por " + T.unidad + " con la columna «" + d.nombre + "» (" + T.lista.length + " " + (T.unidad === "mes" ? "meses" : "días") + ").");
    }
    if (g && /\b(mas|mayor|top|mejor|principal|menos|menor|peor)\b/.test(p)) {
      var G = porGrupo(f, g, m), abajo = /\b(menos|menor|peor)\b/.test(p), y = abajo ? G[G.length - 1] : G[0], seg = abajo ? G[G.length - 2] : G[1];
      return R("En «" + g.nombre + "», " + (abajo ? "lo más bajo" : "lo más alto") + " es «" + y.k + "» con " + fmt(y.s, dinero) + (seg ? ". Le sigue «" + seg.k + "» con " + fmt(seg.s, dinero) : "") + ".", "Sumé " + de + " agrupando por «" + g.nombre + "» (" + G.length + " grupos, " + y.n + " registros en este).");
    }
    if (m && /\b(promedio|media)\b/.test(p)) { var S = suma(f, m); return R("El promedio de " + de + " es " + fmt(S.prom, dinero) + " por registro.", "Dividí la suma (" + fmt(S.s, dinero) + ") entre " + miles(S.n) + " registros."); }
    if (m && /\b(total|suma|sumar|cuanto)\b/.test(p)) { var S2 = suma(f, m); return R("El total de " + de + " es " + fmt(S2.s, dinero) + ".", "Sumé la columna " + de + " en " + miles(S2.n) + " registros" + (f.tabla.totales ? ", sin contar la fila TOTAL del archivo." : ".")); }
    return null;
  }
  function reglasDoc(f, q) {
    var p = plano(q), X = f.reglas || {};
    if (/\b(total|cuanto|importe|monto|pagar)\b/.test(p) && X.total) return R("El total es " + fmt(X.total.n, true) + ".", "Lo dice esta línea del archivo: «" + X.total.linea + "».");
    if (/\b(fecha|cuando|dia)\b/.test(p) && X.fechas && X.fechas.length) return R("La primera fecha que aparece es " + X.fechas[0].valor + (X.fechas.length > 1 ? " (hay " + X.fechas.length + " fechas en el archivo)" : "") + ".", "La encontré con la regla de fechas (día/mes/año).");
    if (/\bruc\b/.test(p) && X.ruc && X.ruc.length) return R("RUC que aparecen: " + X.ruc.slice(0, 4).map(function (r) { return r.valor + (r.valido ? "" : " (dígito mal)"); }).join(", ") + ".", "Cada RUC se comprobó con su dígito verificador.");
    if (/\b(numero|serie|comprobante|factura|boleta)\b/.test(p) && X.series && X.series.length) return R("El comprobante es " + X.series[0].valor + ".", "Lo encontré con la regla de serie y número.");
    return null;
  }
  function sugeridas(f) {
    var V = f.vista, s = [];
    if (V.tabla) {
      if (V.m) s.push("¿Cuánto suma " + V.m.nombre + "?");
      if (V.g) s.push("¿Qué " + V.g.nombre.toLowerCase() + " tiene más?");
      if (V.d) s.push("¿En qué " + (porTiempo(f, V.d, V.m).unidad) + " hubo más?");
      if (V.m) s.push("¿Cuál es el promedio?");
      s.push("¿Qué me llama la atención de estos datos?");
    } else {
      var X = f.reglas || {};
      if (X.total) s.push("¿Cuál es el total?");
      if (X.fechas && X.fechas.length) s.push("¿De qué fecha es?");
      if (X.series && X.series.length) s.push("¿Qué número de comprobante es?");
      s.push("¿De qué trata este archivo?");
      s.push("¿Qué tengo que hacer con él?");
    }
    return s;
  }

  // Lo único que ve la IA de una tabla: un resumen ya calculado, sin columnas de personas y con lo personal tapado.
  function perfil(f) {
    var V = f.vista, L = [], seguros = V.grupos.filter(function (g) { return !PERSONAL.test(plano(g.nombre)); });
    L.push("RESUMEN CALCULADO CON REGLAS DE LA TABLA «" + f.nombre + "».");
    L.push("Los números de este resumen ya están sumados sobre TODAS las filas: úsalos tal cual y no los recalcules con las filas de ejemplo.");
    L.push("Filas de datos: " + V.datos.length + ". Columnas: " + V.cols.map(function (c) { return c.nombre + " (" + c.nombreTipo + ")"; }).join("; ") + ".");
    V.medidas.slice(0, 4).forEach(function (m) { var S = suma(f, m); L.push("Columna «" + m.nombre + "»: suma " + crudo(S.s) + "; promedio " + crudo(S.prom) + "; mínimo " + crudo(S.min) + "; máximo " + crudo(S.max) + "; " + S.n + " valores."); });
    var ms = V.m ? [V.m].concat(V.medidas.filter(function (m) { return m !== V.m; }).slice(0, 1)) : [null];
    ms.forEach(function (m) {
      seguros.slice(0, 3).forEach(function (g) {
        var G = porGrupo(f, g, m);
        L.push("\n" + (m ? "Suma de «" + m.nombre + "»" : "Cantidad de filas") + " por «" + g.nombre + "» (" + (G.length > 15 ? "los 15 mayores de " + G.length : "todos") + "):");
        G.slice(0, 15).forEach(function (a) { L.push("- " + a.k + ": " + (m ? crudo(a.s) : a.n) + " (" + a.n + " filas)"); });
      });
      if (V.d) {
        var T = porTiempo(f, V.d, m);
        L.push("\n" + (m ? "Suma de «" + m.nombre + "»" : "Cantidad de filas") + " por " + T.unidad + ":");
        T.lista.slice(-36).forEach(function (a) { L.push("- " + a.k + ": " + (m ? crudo(a.s) : a.n) + " (" + a.n + " filas)"); });
      }
    });
    var av = avisos(f); if (av.length) L.push("\nAvisos de las reglas: " + av.join("; ") + ".");
    var visibles = V.cols.filter(function (c) { return !PERSONAL.test(plano(c.nombre)); });
    L.push("\nFilas de ejemplo (" + visibles.map(function (c) { return c.nombre; }).join(" | ") + "):");
    V.datos.slice(0, 10).forEach(function (x) { L.push(visibles.map(function (c) { return texto(x[c.k]); }).join(" | ")); });
    return ESC.enmascarar(L.join("\n")).texto.slice(0, ESC.LIMITE_IA - 200);
  }

  function tarjeta(q, f) {
    var cuerpo = el("div", { class: "v-resp-c" }, [el("p", { class: "v-resp-espera", text: "Pensando…" })]);
    var t = el("article", { class: "v-resp" }, [el("p", { class: "v-resp-q" }, [el("span", { class: "v-resp-a", text: f.nombre }), q]), cuerpo]);
    var h = $("respuestas"); h.insertBefore(t, h.firstChild);
    return cuerpo;
  }
  function pintarRespuesta(cuerpo, o) {
    cuerpo.textContent = "";
    cuerpo.appendChild(el("p", { class: "v-resp-t" + (o.mal ? " mal" : ""), text: o.t }));
    if (o.d) cuerpo.appendChild(el("p", { class: "v-resp-d", text: o.d }));
    if (o.citas && o.citas.length) cuerpo.appendChild(el("ul", { class: "v-citas" }, o.citas.map(function (c) {
      return el("li", { class: c.estado }, [el("b", { text: (c.estado === "literal" ? "✓ " : c.estado === "revisa" ? "? " : "✗ ") + String(c.nombre || "dato").replace(/_/g, " ") + ": " + c.valor }), el("span", { text: c.estado === "inventado" ? "no lo encontré en lo que se envió: no te fíes de este dato" : "«" + c.evidencia + "»" })]);
    })));
    var pie = el("p", { class: "v-resp-pie" }, [el("span", { class: "v-sello " + (o.ia ? "ia" : "regla"), text: o.sello })]);
    if (o.otra) { var b = el("button", { type: "button", class: "v-link", text: "No era eso: preguntarle a la IA" }); b.addEventListener("click", o.otra); pie.appendChild(b); }
    cuerpo.appendChild(pie);
  }
  function conIA(f, q, cuerpo) {
    var V = f.vista, env = V.tabla ? perfil(f) : ESC.enmascarar(f.texto || "").texto;
    if (!env.trim()) { pintarRespuesta(cuerpo, { t: "Este archivo no trae texto que la IA pueda leer.", mal: true, sello: "Sin enviar nada" }); return; }
    cuerpo.textContent = ""; cuerpo.appendChild(el("p", { class: "v-resp-espera", text: "Preguntándole a la IA (solo ve un resumen, sin datos personales)…" }));
    ESC.entender({ nombre: f.nombre, tipo: V.tabla ? "txt" : f.tipo, texto: env, pregunta: q }).then(function (x) {
      if (x.estado !== "ok") { pintarRespuesta(cuerpo, { t: x.msg || "La IA no pudo responder.", mal: true, sello: "IA · sin respuesta" }); return; }
      var r = x.r, citas = ESC.verificar((r.campos || []).slice(0, 5), env);
      var motor = r.motor || {}, quedan = typeof r.restantes === "number" ? " · te quedan " + r.restantes + " preguntas con IA hoy" : "";
      pintarRespuesta(cuerpo, { t: r.resumen || "La IA no dio una respuesta clara. Prueba a preguntarlo de otra forma.", citas: citas, ia: true,
        d: (r.dudas && r.dudas.length ? "Dudas de la IA: " + r.dudas.slice(0, 2).join(" · ") : ""),
        sello: "IA · " + (motor.gratis ? "modelo gratuito" : "modelo de pago") + " · " + (Math.round(x.ms / 100) / 10 + " s").replace(".", ",") + quedan });
    });
  }
  function preguntar(q, forzarIA) {
    q = String(q || "").replace(/\s+/g, " ").trim();
    if (!actual) { GQ.toast("Primero adjunta un archivo."); return; }
    if (q.length < 3) { GQ.toast("Escribe tu pregunta."); return; }
    var f = actual, cuerpo = tarjeta(q, f), t0 = performance.now();
    var r = forzarIA ? null : (f.vista.tabla ? reglasTabla(f, q) : reglasDoc(f, q));
    if (r) pintarRespuesta(cuerpo, { t: r.t, d: r.d, sello: "Reglas · " + Math.max(1, Math.round(performance.now() - t0)) + " ms · sin IA", otra: function () { conIA(f, q, cuerpo); } });
    else conIA(f, q, cuerpo);
  }
  function pintarPreguntas(f) {
    var c = $("sugeridas"); c.textContent = "";
    sugeridas(f).forEach(function (q) { var b = el("button", { type: "button", class: "v-chip", text: q }); b.addEventListener("click", function () { preguntar(q); }); c.appendChild(b); });
  }

  // ---------------------------------------------------------------- mezclar varios archivos en una sola tabla
  function cel(t) { return { t: String(t), n: null, esNum: false, f: "" }; }
  function celNum(v) { return { t: fmt(v, true), n: v, esNum: true, f: "" }; }
  function celFecha(iso) { return iso ? { t: iso.slice(8) + "/" + iso.slice(5, 7) + "/" + iso.slice(0, 4), n: null, esNum: false, f: iso } : null; }
  function colConcepto(V) {
    var txt = V.cols.filter(function (c) { return (c.tipo === "texto" || c.tipo === "categoria") && c.k !== SEG_K && !PERSONAL.test(plano(c.nombre)); });
    return txt.filter(function (c) { return /producto|concepto|descrip|detalle|item|articulo|servicio|glosa|rubro|categor/.test(plano(c.nombre)); })[0] || (V.g && V.g.k !== SEG_K && !PERSONAL.test(plano(V.g.nombre)) ? V.g : null) || txt[0] || null;
  }
  // Entra a la mezcla lo que tiene un monto: las tablas con columna de montos y los PDF o textos con un total.
  function fuentesMezcla() { return archivos.filter(function (f) { return !f.mezcla && ((f.vista.tabla && f.vista.m && f.vista.datos.length) || (!f.vista.tabla && f.reglas && f.reglas.total)); }); }
  function armarMezcla() {
    var filas = [], notas = [];
    fuentesMezcla().forEach(function (f) {
      var V = f.vista;
      if (V.tabla) {
        var kc = colConcepto(V);
        V.datos.forEach(function (x) {
          var v = num(x[V.m.k]);
          filas.push([cel(f.nombre), V.d ? celFecha(fecha(x[V.d.k])) : null, cel(kc ? texto(x[kc.k]) || "(sin dato)" : "(sin concepto)"), celNum(isFinite(v) ? v : 0)]);
        });
        notas.push("«" + f.nombre + "»: " + miles(V.datos.length) + " filas · el monto sale de «" + V.m.nombre + "»" + (kc ? " · el concepto, de «" + kc.nombre + "»" : "") + (V.d ? " · la fecha, de «" + V.d.nombre + "»" : ""));
      } else {
        var X = f.reglas;
        filas.push([cel(f.nombre), celFecha(X.fechas && X.fechas[0] ? X.fechas[0].iso : ""), cel(X.tipo && X.tipo.id ? X.tipo.nombre : "Documento"), celNum(X.total.n)]);
        notas.push("«" + f.nombre + "»: 1 fila · su total, su primera fecha y su tipo de documento");
      }
    });
    var cols = [
      { nombre: "Archivo", k: 0, tipo: "categoria", nombreTipo: "categoría", vacios: 0 },
      { nombre: "Fecha", k: 1, tipo: "fecha", nombreTipo: "fecha", vacios: 0 },
      { nombre: "Concepto", k: 2, tipo: "texto", nombreTipo: "texto libre", vacios: 0 },
      { nombre: "Monto", k: 3, tipo: "monto", nombreTipo: "monto", vacios: 0 },
    ];
    var hayFecha = filas.some(function (x) { return x[1]; });
    return {
      id: "mezcla", mezcla: true, tipo: "mix", nombre: "Mezcla de " + notas.length + " archivos", notas: notas,
      tabla: { columnas: cols, duplicados: [], cuadre: null, totales: null, rucMalos: [], pie: [] },
      vista: { tabla: true, datos: filas, cols: cols, medidas: [cols[3]], grupos: [cols[0], cols[2]], fechas: hayFecha ? [cols[1]] : [], m: cols[3], g: cols[0], d: hayFecha ? cols[1] : null },
    };
  }
  // La mezcla se rehace sola cuando cambian los archivos; con menos de dos fuentes, desaparece.
  function refrescarMezcla() {
    var habia = archivos.filter(function (f) { return f.mezcla; })[0];
    if (!habia) return;
    archivos = archivos.filter(function (f) { return !f.mezcla; });
    if (fuentesMezcla().length < 2) { if (actual === habia) actual = archivos[archivos.length - 1] || null; return; }
    var M = armarMezcla(); archivos.unshift(M); if (actual === habia) actual = M;
  }
  function mezclar() {
    archivos = archivos.filter(function (f) { return !f.mezcla; });
    var M = armarMezcla(); archivos.unshift(M); actual = M; pintarTodo();
    $("paso2").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ---------------------------------------------------------------- segmentar con IA
  // La IA solo recibe la lista numerada de conceptos (sin montos ni columnas de personas) y devuelve, por segmento,
  // los números que le tocan. Lo que no alcanzó a ver hereda el segmento de un concepto con la misma primera palabra.
  var SEG_K = 900, SEG_MAX = 150;
  var PEDIDO_SEG = "No extraigas datos. Tarea: reparte TODOS los elementos numerados de la LISTA en segmentos por su significado (qué tipo de producto, servicio o gasto es), nunca por su orden. Máximo 6 segmentos, con nombres descriptivos de 1 a 3 palabras (prohibido «Segmento 1»). En campos, un objeto por segmento: nombre = el segmento; valor = los números de TODOS sus elementos separados por comas, cada número en un solo segmento; evidencia = uno de sus elementos copiado tal cual, sin el número. En resumen, el criterio en una frase.";
  function colSegmentable(V) { var g = V.g && V.g.k !== SEG_K && V.g.nombre !== "Archivo" ? V.g : null; return g || colConcepto(V); }
  function quitarSegmentos(f) {
    var V = f.vista, no = function (c) { return c.k !== SEG_K; };
    V.cols = V.cols.filter(no); V.grupos = V.grupos.filter(no);
    if (V.g && V.g.k === SEG_K) V.g = (f.seg && V.grupos.filter(function (c) { return c.nombre === f.seg.col; })[0]) || V.grupos[0] || null;
    V.datos.forEach(function (x) { delete x[SEG_K]; });
    f.seg = null; f.segMsg = "";
  }
  function aplicarSegmentos(f, c, lista, r) {
    var mapa = {}, porIA = 0, nombres = [];
    (r.campos || []).forEach(function (cp) {
      var seg = String(cp.nombre || "").replace(/_/g, " ").replace(/\s+/g, " ").trim().slice(0, 40);
      if (!seg) return;
      nombres.push(seg);
      (String(cp.valor).match(/\d+/g) || []).forEach(function (n) { var it = lista[+n - 1]; if (it && !mapa[plano(it.k)]) { mapa[plano(it.k)] = seg; porIA++; } });
    });
    var flojo = !nombres.length || nombres.filter(function (n) { return /^(segmento|grupo|categoria|bloque|parte)\s*\d+$/.test(plano(n)); }).length >= nombres.length / 2 || porIA < Math.min(lista.length, 8) * 0.5;
    if (flojo) return null;
    var porPalabra = {};
    Object.keys(mapa).forEach(function (k) { var w = k.split(/\s+/)[0]; if (w.length >= 4 && !porPalabra[w]) porPalabra[w] = mapa[k]; });
    var V = f.vista, vistos = {}, porRegla = 0, otros = 0;
    quitarSegmentos(f);
    V.datos.forEach(function (x) {
      var k = plano(texto(x[c.k]) || "(sin dato)"), seg = mapa[k];
      if (!seg) { seg = porPalabra[k.split(/\s+/)[0]] || ""; if (!vistos[k]) { vistos[k] = 1; if (seg) porRegla++; else otros++; } }
      x[SEG_K] = cel(seg || "Otros");
    });
    var col = { nombre: "Segmento", k: SEG_K, tipo: "categoria", nombreTipo: "categoría, propuesta por la IA", vacios: 0 };
    V.cols.push(col); V.grupos.unshift(col); V.g = col;
    var motor = r.motor || {};
    f.seg = { col: c.nombre, criterio: r.resumen || "", gratis: !!motor.gratis, porIA: porIA, porRegla: porRegla, otros: otros, restantes: r.restantes };
    return f.seg;
  }
  function segmentar(f, criterio) {
    var V = f.vista, c = colSegmentable(V);
    if (!c) { f.segMsg = "No encuentro una columna de texto para segmentar."; pintarTodo(); return; }
    if (PERSONAL.test(plano(c.nombre))) { f.segMsg = "«" + c.nombre + "» tiene datos de personas y no se envía a la IA. Elige otra columna en «Agrupado por»."; pintarTodo(); return; }
    var lista = porGrupo(f, c, V.m).filter(function (a) { return a.k !== "(sin dato)"; }).slice(0, SEG_MAX);
    if (lista.length < 3) { f.segMsg = "«" + c.nombre + "» tiene muy pocos valores distintos: no hace falta segmentar."; pintarTodo(); return; }
    var env = ESC.enmascarar("LISTA DE «" + c.nombre + "» A SEGMENTAR (cada línea es un elemento numerado):\n" + lista.map(function (a, i) { return (i + 1) + ". " + a.k; }).join("\n")).texto.slice(0, ESC.LIMITE_IA);
    criterio = String(criterio || "").replace(/\s+/g, " ").trim().slice(0, 100);
    f.segPidiendo = true; f.segMsg = ""; pintarTodo();
    var pedir = function (extra) { return ESC.entender({ nombre: f.nombre, tipo: "txt", texto: env, pregunta: (PEDIDO_SEG + (criterio ? " Criterio pedido: " + criterio + "." : "") + (extra || "")).slice(0, 600) }); };
    var cerrar = function (msg) { f.segPidiendo = false; f.segMsg = msg || ""; pintarTodo(); };
    pedir("").then(function (x) {
      if (x.estado !== "ok") return cerrar(x.msg || "La IA no pudo responder.");
      if (aplicarSegmentos(f, c, lista, x.r)) return cerrar("");
      return pedir(" Agrupa por significado.").then(function (y) {   // respondió con flojera («Segmento 1…»): un segundo intento
        if (y.estado !== "ok") return cerrar(y.msg || "La IA no pudo responder.");
        cerrar(aplicarSegmentos(f, c, lista, y.r) ? "" : "La IA no logró repartir bien tus conceptos. Vuelve a intentar o escríbele un criterio (por ejemplo: «por tipo de gasto»).");
      });
    });
  }
  function cajaSegmentos(f) {
    var V = f.vista, c = f.seg ? null : colSegmentable(V), caja = el("div", { class: "v-seg" });
    if (f.segPidiendo) { caja.appendChild(el("p", { class: "v-resp-espera", text: "La IA está repartiendo tus conceptos en segmentos (solo ve la lista de nombres, sin montos)…" })); return caja; }
    if (f.seg) {
      var G = porGrupo(f, V.cols.filter(function (x) { return x.k === SEG_K; })[0], V.m), dinero = !!(V.m && V.m.tipo === "monto");
      caja.appendChild(el("p", { class: "v-seg-t" }, [el("b", { text: "Segmentos que propuso la IA para «" + f.seg.col + "»" }), f.seg.criterio ? " · " + f.seg.criterio : ""]));
      caja.appendChild(el("div", { class: "v-seg-chips" }, G.map(function (a) { return el("span", { class: "v-seg-chip", text: a.k + " · " + fmt(a.s, dinero) }); })));
      var quitar = el("button", { type: "button", class: "v-link", text: "Quitar segmentos" }), otra = el("button", { type: "button", class: "v-link", text: "Volver a segmentar" });
      quitar.addEventListener("click", function () { quitarSegmentos(f); pintarTodo(); });
      otra.addEventListener("click", function () { quitarSegmentos(f); pintarTodo(); var i = $("criterio"); if (i) i.focus(); });
      caja.appendChild(el("p", { class: "v-resp-pie" }, [
        el("span", { class: "v-sello ia", text: "IA · " + (f.seg.gratis ? "modelo gratuito" : "modelo de pago") + " · " + f.seg.porIA + " conceptos repartidos" + (f.seg.porRegla ? " · " + f.seg.porRegla + " por regla (misma primera palabra)" : "") + (f.seg.otros ? " · " + f.seg.otros + " en «Otros»" : "") }), otra, quitar]));
      caja.appendChild(el("p", { class: "v-privado", text: "Es una propuesta: revísala en «Ver mis filas» (columna Segmento) antes de decidir con ella." }));
      return caja;
    }
    if (!c) return el("span");
    var inp = el("input", { class: "v-busca v-seg-in", id: "criterio", type: "text", maxlength: "100", placeholder: "Criterio (opcional): por tipo de gasto, por familia de producto…", "aria-label": "Criterio para segmentar" });
    var b = el("button", { type: "button", class: "k-btn sec", text: "Segmentar «" + c.nombre + "» con IA" });
    b.addEventListener("click", function () { segmentar(f, inp.value); });
    inp.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); segmentar(f, inp.value); } });
    caja.appendChild(el("div", { class: "v-seg-f" }, [inp, b]));
    caja.appendChild(el("p", { class: "v-privado" + (f.segMsg ? " mal" : ""), text: f.segMsg || "La IA propone hasta 6 segmentos y tu tablero se rehace por segmento. Solo ve la lista de nombres de «" + c.nombre + "», sin montos. Gasta 1 de tus preguntas con IA." }));
    return caja;
  }

  // ---------------------------------------------------------------- 1 · los archivos
  function pintarLista() {
    var c = $("lista"); c.textContent = "";
    archivos.forEach(function (f) {
      var b = el("button", { type: "button", class: "v-arch" + (f === actual ? " sel" : ""), "aria-pressed": f === actual ? "true" : "false" }, [chipDe(f), el("span", { text: f.nombre })]);
      b.addEventListener("click", function () { actual = f; pintarTodo(); });
      var x = el("button", { type: "button", class: "v-arch-x", "aria-label": "Quitar " + f.nombre, text: "×" });
      x.addEventListener("click", function () { archivos = archivos.filter(function (g) { return g !== f; }); if (actual === f) actual = archivos[archivos.length - 1] || null; refrescarMezcla(); pintarTodo(); });
      c.appendChild(el("span", { class: "v-arch-w" + (f.mezcla ? " mix" : "") }, [b, x]));
    });
    var fm = fuentesMezcla();
    if (fm.length >= 2 && !archivos.some(function (f) { return f.mezcla; })) {
      var bm = el("button", { type: "button", class: "k-btn oro v-mezclar", text: "Mezclar mis " + fm.length + " archivos" });
      bm.addEventListener("click", mezclar);
      c.appendChild(bm);
    }
  }
  function pintarTodo() {
    var hay = !!actual;
    document.body.classList.toggle("con-archivo", hay);
    $("paso2").hidden = !hay; $("paso3").hidden = !hay;
    ["p1", "p2", "p3"].forEach(function (id, i) { $(id).className = "v-paso" + (hay || i === 0 ? " on" : ""); });
    pintarLista();
    if (!hay) return;
    pintarTablero(actual);
    pintarPreguntas(actual);
    $("q").placeholder = actual.vista.tabla ? "Pregúntale a «" + actual.nombre + "»: ¿qué producto dejó más?, ¿cómo me fue en octubre?" : "Pregúntale a «" + actual.nombre + "»: ¿qué me están cobrando?, ¿cuándo vence?";
  }
  function recibir(f) {
    preparar(f);
    archivos = archivos.filter(function (g) { return g.nombre !== f.nombre; });
    archivos.push(f);
    var propios = archivos.filter(function (g) { return !g.mezcla; });
    if (propios.length > 8) archivos = archivos.filter(function (g) { return g !== propios[0]; });
    actual = f; refrescarMezcla(); pintarTodo();
  }

  ESC.zona($("zona"), {
    titulo: "Adjunta aquí tus archivos", sub: "arrástralos o toca para elegir · Excel, CSV, PDF o texto · puedes traer varios",
    aceptar: ".pdf,.xlsx,.xls,.ods,.csv,.tsv,.txt", multiple: true, guardar: false,
    muestras: ["ventas.xlsx", "gastos.csv", "factura-compra.pdf"], textoMuestras: "¿No tienes uno a la mano? Prueba con:",
    alLeer: recibir,
    alTerminar: function (n) { if (n) { $("paso2").scrollIntoView({ behavior: "smooth", block: "start" }); } },
  });
  $("form").addEventListener("submit", function (e) { e.preventDefault(); var q = $("q").value; $("q").value = ""; preguntar(q); });
  pintarTodo();
})();
