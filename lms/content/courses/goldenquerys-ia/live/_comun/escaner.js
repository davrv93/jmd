// escaner.js · el escáner de archivos de la sesión 2 de GoldenQuerys (gq-03): «pregúntale a tus propios archivos».
// Script clásico, sin módulos. Va después de gq.js:
//   <link rel="stylesheet" href="../../comun/escaner.css">
//   <script src="../../comun/gq.js"></script>
//   <script src="../../comun/escaner.js"></script>
//
// Primero reglas, luego IA. Todo se lee en el navegador del alumno con FileReader: nada se sube. Lo único que sale es
// el texto ya enmascarado (sin DNI, teléfonos, correos, cuentas ni RUC de personas) que se manda a /entender.
//
// Librerías del mismo origen (live/_comun): pdf.js 6.4.299, compilación legacy de pdfjs-dist (pdf.min.mjs y su
// worker pdf.worker.min.mjs), y SheetJS 0.18.5 (xlsx.full.min.js). La CSP de las escenas no tiene worker-src ni
// blob:, así que el worker de pdf.js se pide por su URL del mismo origen.
//
// Expone window.ESC: MUESTRAS, MI_RUC_MUESTRA, leer(File), muestra(nombre), reglasTexto, escanearTabla, enmascarar,
// entender, verificar, categoria, mesa (sessionStorage: se borra al cerrar la pestaña), csv, json, bajar, y las piezas
// de pantalla: zona, pintarFicha, resaltar, miniatura.
(function () {
  "use strict";
  var COMUN = new URL("../../comun/", location.href).href;
  var URL_ENTENDER = new URL("../../entender", location.href).href;
  var RUTA_MUESTRAS = "/files/goldenquerys-ia/materials/archivos-muestra/";
  var LIMITE_IA = 12000;   // caracteres que acepta /entender
  var LIMITE_TEXTO = 40000; // lo que se guarda por archivo en la mesa

  var MUESTRAS = [
    { archivo: "factura-compra.pdf", titulo: "Factura de un proveedor", tipo: "pdf" },
    { archivo: "boleta-venta.pdf", titulo: "Boleta de una venta", tipo: "pdf" },
    { archivo: "recibo-honorarios.pdf", titulo: "Recibo por honorarios", tipo: "pdf" },
    { archivo: "extracto-banco.pdf", titulo: "Estado de cuenta del banco", tipo: "pdf" },
    { archivo: "nota-credito-escaneada.pdf", titulo: "Nota de crédito escaneada", tipo: "pdf" },
    { archivo: "ventas.xlsx", titulo: "Ventas de octubre (Excel)", tipo: "xlsx" },
    { archivo: "gastos.csv", titulo: "Gastos de octubre (CSV)", tipo: "csv" },
    { archivo: "correo-proveedor.txt", titulo: "Correo de un proveedor", tipo: "txt" },
  ];
  var MI_RUC_MUESTRA = "20981473052"; // Botica Santa Kantuta E.I.R.L., la botica ficticia de las muestras
  var CATEGORIAS = ["venta", "compra", "gasto", "bancario", "planilla", "otro"];

  // ---------------------------------------------------------------- utilidades
  function sinTildes(s) { return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, ""); }
  function plano(s) { return sinTildes(s).toLowerCase(); }
  function soles(n) {
    if (typeof n !== "number" || !isFinite(n)) return "";
    var s = Math.abs(n).toFixed(2).split("."), e = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    return (n < 0 ? "−" : "") + "S/ " + e + "," + s[1];
  }
  function kb(b) { return b < 1024 ? b + " B" : b < 1048576 ? (b / 1024).toFixed(0) + " KB" : (b / 1048576).toFixed(1) + " MB"; }
  function miles(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " "); }
  function id() { return "f" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function el(tag, attrs, hijos) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === "text") e.textContent = attrs[k];
      else if (k === "class") e.className = attrs[k];
      else if (attrs[k] !== null && attrs[k] !== undefined && attrs[k] !== false) e.setAttribute(k, attrs[k] === true ? "" : attrs[k]);
    });
    [].concat(hijos || []).forEach(function (h) { if (h === null || h === undefined || h === false) return; e.appendChild(typeof h === "string" ? document.createTextNode(h) : h); });
    return e;
  }
  function tipoDe(nombre) {
    var ext = (String(nombre).toLowerCase().match(/\.([a-z0-9]+)$/) || [])[1] || "";
    if (ext === "pdf") return "pdf";
    if (ext === "xlsx" || ext === "xlsm" || ext === "xls" || ext === "ods") return ext === "xls" ? "xls" : "xlsx";
    if (ext === "csv" || ext === "tsv") return "csv";
    if (ext === "txt" || ext === "md") return "txt";
    if (/^(png|jpe?g|webp|heic|gif)$/.test(ext)) return "imagen";
    return "";
  }

  // número peruano o gringo: «1,077.10», «1.077,10», «S/ 42.90», «12,50», «1 800.00»
  function numero(s) {
    if (typeof s === "number") return s;
    s = String(s == null ? "" : s).trim();
    var neg = /^\(.*\)$/.test(s) || /^-|−/.test(s);
    s = s.replace(/[^\d.,]/g, "");
    if (!/\d/.test(s)) return NaN;
    var c = s.lastIndexOf(","), p = s.lastIndexOf("."), dec = -1;
    if (c > -1 && p > -1) dec = Math.max(c, p);
    else if (c > -1 || p > -1) {
      var k = c > -1 ? c : p, ch = s.charAt(k), veces = s.split(ch).length - 1, tras = s.length - k - 1;
      if (veces === 1 && tras !== 3) dec = k;
      else if (veces === 1 && tras === 3 && s.length - tras - 1 === 0) dec = k;
    }
    var ent = dec > -1 ? s.slice(0, dec) : s, fr = dec > -1 ? s.slice(dec + 1) : "";
    var v = parseFloat(ent.replace(/[.,]/g, "") + (fr ? "." + fr : ""));
    return neg ? -v : v;
  }

  // ---------------------------------------------------------------- RUC, fechas y demás patrones
  var PESOS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  function rucCuenta(r) { // el cálculo paso a paso, para enseñarlo
    var s = 0, filas = [];
    for (var i = 0; i < 10; i++) { var p = +r.charAt(i) * PESOS[i]; s += p; filas.push(p); }
    var d = 11 - (s % 11); if (d === 10) d = 0; if (d === 11) d = 1;
    return { productos: filas, suma: s, resto: s % 11, digito: d, ok: d === +r.charAt(10) };
  }
  function rucValido(r) { return /^(10|15|16|17|20)\d{9}$/.test(r) && rucCuenta(r).ok; }

  var MESES = { ene: 1, enero: 1, feb: 2, febrero: 2, mar: 3, marzo: 3, abr: 4, abril: 4, may: 5, mayo: 5, jun: 6, junio: 6, jul: 7, julio: 7, ago: 8, agosto: 8,
    set: 9, sep: 9, sept: 9, setiembre: 9, septiembre: 9, oct: 10, octubre: 10, nov: 11, noviembre: 11, dic: 12, diciembre: 12 };
  function iso(y, m, d) {
    y = +y; m = +m; d = +d; if (y < 100) y += 2000;
    if (!(m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 1990 && y <= 2100)) return "";
    var f = new Date(Date.UTC(y, m - 1, d)); if (f.getUTCMonth() !== m - 1) return "";
    return y + "-" + String(m).padStart(2, "0") + "-" + String(d).padStart(2, "0");
  }
  var RE_FECHAS = [
    { re: /(^|[^\d])(\d{1,2})([\/.-])(\d{1,2})\3(\d{4})(?!\d)/g, f: function (m) { return { iso: iso(m[5], m[4], m[2]) || iso(m[5], m[2], m[4]), formato: +m[2] <= 12 && +m[4] > 12 ? "mm/dd/aaaa (de EE. UU.)" : "dd/mm/aaaa" }; } },
    { re: /(^|[^\d])(\d{4})-(\d{2})-(\d{2})(?!\d)/g, f: function (m) { return { iso: iso(m[2], m[3], m[4]), formato: "aaaa-mm-dd" }; } },
    { re: /(^|[^\wáéíóú])(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|setiembre|septiembre|octubre|noviembre|diciembre)\s+(?:de|del)\s+(\d{4})/gi, f: function (m) { return { iso: iso(m[4], MESES[m[3].toLowerCase()], m[2]), formato: "«d de mes de aaaa»" }; } },
    { re: /(^|[^\w])(\d{1,2})[\s\/-]?(ene|feb|mar|abr|may|jun|jul|ago|set|sept|sep|oct|nov|dic)[a-z]*\.?[\s\/-](\d{4})(?!\d)/gi, f: function (m) { return { iso: iso(m[4], MESES[m[3].toLowerCase()], m[2]), formato: "d-mmm-aaaa" }; } },
  ];
  function fechaDe(s) { // la celda ENTERA es una fecha
    s = String(s || "").trim(); if (!s || s.length > 30) return null;
    for (var i = 0; i < RE_FECHAS.length; i++) {
      var re = new RegExp("^" + RE_FECHAS[i].re.source.replace(/^\(\^\|[^)]*\)/, "()") + "(?:\\s+\\d{1,2}:\\d{2}(?::\\d{2})?)?$", "i");
      var m = re.exec(s); if (m) { var r = RE_FECHAS[i].f(m); if (r.iso) return r; }
    }
    return null;
  }

  // Busca todas las coincidencias de un patrón cuyo grupo 1 es el «borde» (sin lookbehind, para Safari viejo).
  function todas(re, texto, fn) {
    re.lastIndex = 0; var out = [], m;
    while ((m = re.exec(texto))) {
      var ini = m.index + (m[1] || "").length, r = fn(m, ini);
      if (r) out.push(r);
      if (m[0].length === 0) re.lastIndex++;
    }
    return out;
  }

  var RE = {
    ruc: /(^|\D)((?:10|15|16|17|20)\d{9})(?!\d)/g,
    dni: /(^|[^\d\-\/.,])(\d{8})(?![\d\/]|[.,]\d)/g,
    movil: /(^|[^\d])((?:\+?51[\s-]?)?9\d{2}[\s-]?\d{3}[\s-]?\d{3})(?!\d)/g,
    fijo: /(^|[^\d])(\(0?\d{1,2}\)\s?\d{3}[\s-]?\d{3,4})(?!\d)/g,
    correo: /(^|[^\w.+-])([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g,
    cuenta: /(^|[^\d-])(\d[\d-]{12,30}\d)(?![\d-])/g,
    serie: /(^|[^A-Za-z0-9])([FBES][A-Z0-9]{3})\s?-\s?(\d{1,8})(?!\d)/g,
    dinero: /(^|[^\w])(S\/\.?|PEN|US\$)\s?(\d{1,3}(?:[,.\s]\d{3})+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)/g,
  };

  // ---------------------------------------------------------------- tipo de documento por palabras clave
  var TIPOS = [
    { id: "factura", nombre: "Factura", claves: [["factura electronica", 3], ["factura", 1]], serie: /^F(?![CD])/ },
    { id: "boleta", nombre: "Boleta de venta", claves: [["boleta de venta", 3], ["boleta", 1]], serie: /^B(?![CD])/ },
    { id: "nota-credito", nombre: "Nota de crédito", claves: [["nota de credito", 4]], serie: /^[FB]C/ },
    { id: "nota-debito", nombre: "Nota de débito", claves: [["nota de debito", 4]], serie: /^[FB]D/ },
    { id: "honorarios", nombre: "Recibo por honorarios", claves: [["recibo por honorarios", 4], ["honorarios", 1], ["retencion", 1], ["cuarta categoria", 2]], serie: /^E0/ },
    { id: "extracto", nombre: "Extracto bancario", claves: [["estado de cuenta", 3], ["extracto", 2], ["saldo anterior", 2], ["saldo inicial", 2], ["saldo final", 2], ["abono", 1], ["cargo", 1], ["itf", 1], ["cci", 1]] },
    { id: "planilla", nombre: "Planilla o boleta de pago", claves: [["boleta de pago", 4], ["planilla", 2], ["remuneracion", 2], ["essalud", 2], ["afp", 1], ["onp", 1], ["sueldo", 1]] },
    { id: "servicio", nombre: "Recibo de luz, agua o teléfono", claves: [["recibo de servicio", 3], ["suministro", 2], ["kwh", 2], ["consumo", 1]], serie: /^S0/ },
    { id: "guia", nombre: "Guía de remisión", claves: [["guia de remision", 4], ["punto de partida", 2], ["punto de llegada", 2]] },
    { id: "ventas", nombre: "Registro de ventas", claves: [["reporte de ventas", 3], ["registro de ventas", 3], ["ventas", 1], ["cliente", 1]] },
    { id: "gastos", nombre: "Registro de gastos", claves: [["registro de gastos", 3], ["gasto", 2], ["proveedor", 1], ["caja chica", 2]] },
  ];
  TIPOS.forEach(function (t) { t.claves.forEach(function (c) { c[2] = new RegExp("\\b" + c[0].replace(/ /g, "\\s+") + "(?:s|es)?\\b"); }); });

  function tipoDocumento(texto, nombre, series, tabla) {
    var t = plano(texto + "\n" + (nombre || "").replace(/[_.-]+/g, " "));
    var res = TIPOS.map(function (tp) {
      var puntos = 0, claves = [];
      tp.claves.forEach(function (c) { if (c[2].test(t)) { puntos += c[1]; claves.push(c[0]); } });
      if (!tabla && tp.serie && series.length && tp.serie.test(series[0].serie)) { puntos += 2; claves.push("serie " + series[0].serie); }
      return { id: tp.id, nombre: tp.nombre, puntos: puntos, claves: claves };
    }).sort(function (a, b) { return b.puntos - a.puntos; });
    var g = res[0], s = res[1];
    if (!g.puntos) return { id: "", nombre: "Sin palabras clave", puntos: 0, claves: [], seguro: false, segundo: null };
    return { id: g.id, nombre: g.nombre, puntos: g.puntos, claves: g.claves, seguro: g.puntos >= 3 && g.puntos >= s.puntos * 2, segundo: s.puntos ? s : null };
  }

  // ---------------------------------------------------------------- reglas sobre texto
  function contexto(texto, i, n) { return texto.slice(Math.max(0, i - (n || 28)), i); }
  function reglasTexto(texto, nombre, opciones) {
    opciones = opciones || {};
    var t0 = performance.now(), R = {};
    R.ruc = todas(RE.ruc, texto, function (m, i) {
      var v = m[2], c = rucCuenta(v);
      return { valor: v, ini: i, fin: i + v.length, valido: c.ok, persona: v.charAt(0) === "1" };
    });
    var enRuc = R.ruc.map(function (r) { return [r.ini, r.fin]; });
    var dentro = function (i) { return enRuc.some(function (r) { return i >= r[0] && i < r[1]; }); };
    R.dni = todas(RE.dni, texto, function (m, i) {
      if (dentro(i)) return null;
      var ctx = plano(contexto(texto, i, 26));
      return { valor: m[2], ini: i, fin: i + 8, seguro: /d\.?\s?n\.?\s?i|documento|doc\.\s/.test(ctx) };
    });
    R.telefonos = todas(RE.movil, texto, function (m, i) { return { valor: m[2], ini: i, fin: i + m[2].length }; })
      .concat(todas(RE.fijo, texto, function (m, i) { return { valor: m[2], ini: i, fin: i + m[2].length }; }));
    R.correos = todas(RE.correo, texto, function (m, i) { return { valor: m[2], ini: i, fin: i + m[2].length }; });
    R.cuentas = todas(RE.cuenta, texto, function (m, i) {
      var dig = m[2].replace(/\D/g, "");
      if (dig.length < 13 || dentro(i)) return null;
      return { valor: m[2], ini: i, fin: i + m[2].length };
    });
    R.series = todas(RE.serie, texto, function (m, i) { var v = m[0].slice(m[1].length); return { valor: v.replace(/\s/g, ""), serie: m[2], numero: m[3], ini: i, fin: i + v.length }; });
    R.fechas = [];
    RE_FECHAS.forEach(function (F) {
      todas(F.re, texto, function (m, i) {
        var r = F.f(m), v = m[0].slice(m[1].length);
        if (r.iso) R.fechas.push({ valor: v, iso: r.iso, formato: r.formato, ini: i, fin: i + v.length });
      });
    });
    R.fechas.sort(function (a, b) { return a.ini - b.ini; });
    R.fechas = R.fechas.filter(function (f, k, a) { return !a.some(function (g, j) { return j < k && g.ini <= f.ini && g.fin >= f.fin; }); });
    R.montos = todas(RE.dinero, texto, function (m, i) { var v = m[0].slice(m[1].length); return { valor: v, n: numero(m[3]), moneda: m[2], ini: i, fin: i + v.length }; });
    // el total: la línea con la palabra más fuerte manda; su monto es el último número con dos decimales
    var PRIOR = [/importe\s+total/, /total\s+a\s+pagar/, /total\s+por\s+honorarios/, /saldo\s+final/, /\btotal\b(?!\s+(abonos|cargos|neto))/, /total\s+neto/];
    var lineas = texto.split("\n"), pos = 0, cand = [];
    lineas.forEach(function (l) {
      var p = plano(l);
      PRIOR.forEach(function (re, k) {
        if (!re.test(p)) return;
        var nums = todas(/(^|[^\d,.])(\d{1,3}(?:[,. ]\d{3})*[.,]\d{2})(?!\d)/g, l, function (m, i) { return { valor: m[2], n: numero(m[2]), ini: pos + i, fin: pos + i + m[2].length }; });
        if (nums.length) cand.push({ k: k, linea: l.trim(), m: nums[nums.length - 1] });
      });
      pos += l.length + 1;
    });
    cand.sort(function (a, b) { return a.k - b.k; });
    R.total = cand.length ? { n: cand[0].m.n, linea: cand[0].linea, ini: cand[0].m.ini, fin: cand[0].m.fin } : null;
    if (!opciones.tabla) R.tipo = tipoDocumento(texto, nombre, R.series, false);
    R.ms = Math.max(1, Math.round(performance.now() - t0));
    return R;
  }

  // ---------------------------------------------------------------- tablas (Excel y CSV)
  // celda → { t: texto que se ve, n: número o null, f: fecha iso o "", fmt: formato de fecha, k: clase }
  function clase(c, cab) {
    if (!c || c.t === "") return "vacio";
    if (c.f) return "fecha";
    var s = c.t.trim();
    if (/^(10|15|16|17|20)\d{9}$/.test(s)) return "ruc";
    if (/^\d{8}$/.test(s)) return "dni";
    if (/^[FBES][A-Z0-9]{3}-\d{1,8}$/i.test(s)) return "comprobante";
    if (c.esNum) return Number.isInteger(c.n) && !/[.,]\d/.test(s) && !/total|monto|precio|importe|soles|s\//.test(cab || "") ? "entero" : "monto";
    if (/^(S\/\.?\s?)?-?\d{1,3}([.,\s]\d{3})*([.,]\d{1,2})$/.test(s) || /^S\/\.?\s?\d/.test(s)) return "monto";
    if (/^-?\d+$/.test(s)) return "entero";
    return "texto";
  }
  var NOMBRE_TIPO = { fecha: "fecha", ruc: "RUC", dni: "DNI", doc: "DNI o RUC", comprobante: "serie-número", monto: "monto", entero: "número", categoria: "categoría", texto: "texto libre", vacia: "vacía", mixto: "mixta" };

  function escanearTabla(filas, opciones) {
    opciones = opciones || {};
    var t0 = performance.now();
    var n = filas.length, ancho = 0;
    filas.forEach(function (f) { if (f.length > ancho) ancho = f.length; });
    var noVacias = function (f) { return f.filter(function (c) { return c && c.t !== ""; }); };
    // 1) el encabezado: la primera fila con 3 o más celdas, casi todas de texto, seguida de una fila con datos
    var enc = -1, titulos = 0;
    for (var r = 0; r < Math.min(n, 25); r++) {
      var nv = noVacias(filas[r] || []);
      if (nv.length < 3) { if (nv.length) titulos++; continue; }
      var txt = nv.filter(function (c) { return !c.esNum && !c.f && !/^\d+([.,]\d+)?$/.test(c.t.trim()); }).length;
      var sig = noVacias(filas[r + 1] || []).length;
      if (txt / nv.length >= 0.7 && sig >= Math.min(2, nv.length)) { enc = r; break; }
      titulos++;
    }
    var motivoEnc;
    if (enc < 0) { enc = 0; motivoEnc = "Ninguna fila parece encabezado: tomo la fila 1."; }
    else motivoEnc = "Es la primera con " + noVacias(filas[enc]).length + " celdas de texto seguidas" + (enc ? "; arriba hay " + (titulos === 1 ? "1 fila de título" : titulos + " filas de título o vacías") : "") + ".";
    var cab = (filas[enc] || []).map(function (c, k) { return c && c.t ? c.t.trim() : "Columna " + (k + 1); });
    while (cab.length < ancho) cab.push("Columna " + (cab.length + 1));
    // 2) las filas de datos, la fila de totales y lo que va al pie
    var datos = [], vacias = 0, totales = null, pie = [];
    for (r = enc + 1; r < n; r++) {
      var f = filas[r] || [], nv2 = noVacias(f);
      if (!nv2.length) { vacias++; continue; }
      if (totales) { pie.push(r); continue; }
      var esTotal = nv2.some(function (c) { return /^(total|totales|suma|total general)\b/.test(plano(c.t).trim()); });
      if (esTotal) { totales = { fila: r, celdas: f }; continue; }
      datos.push({ r: r, celdas: f });
    }
    // 3) cada columna: su tipo, sus vacíos y sus formatos
    var columnas = cab.map(function (nombre, k) {
      var cuenta = {}, vac = 0, distintos = {}, formatos = {}, comoTexto = 0, largo = 0, ejemplos = [];
      var nomPlano = plano(nombre);
      datos.forEach(function (d) {
        var c = d.celdas[k], kk = clase(c, nomPlano);
        if (kk === "vacio") { vac++; return; }
        cuenta[kk] = (cuenta[kk] || 0) + 1;
        distintos[plano(c.t).trim()] = 1; largo += c.t.length;
        if (kk === "fecha") formatos[c.fmt] = (formatos[c.fmt] || 0) + 1;
        if (kk === "monto" && !c.esNum) comoTexto++;
        if (ejemplos.length < 2 && ejemplos.indexOf(c.t) < 0) ejemplos.push(c.t);
      });
      var llenas = datos.length - vac, tipo = "vacia", mayor = 0, mk = "";
      Object.keys(cuenta).forEach(function (x) { if (cuenta[x] > mayor) { mayor = cuenta[x]; mk = x; } });
      if (llenas) {
        if ((cuenta.ruc || 0) && (cuenta.dni || 0) && (cuenta.ruc + cuenta.dni) / llenas >= 0.6) tipo = "doc";
        else if ((cuenta.monto || 0) + (cuenta.entero || 0) >= 0.6 * llenas && (cuenta.monto || /total|monto|precio|importe|p\.?\s?unit/.test(nomPlano))) tipo = "monto";
        else if (mayor / llenas >= 0.6) tipo = mk;
        else tipo = "mixto";
        if (tipo === "texto") {
          var nd = Object.keys(distintos).length;
          tipo = nd <= Math.max(6, llenas * 0.3) && largo / llenas < 22 ? "categoria" : "texto";
        }
      }
      return { nombre: nombre, k: k, tipo: tipo, nombreTipo: NOMBRE_TIPO[tipo] || tipo, vacios: vac, llenas: llenas, formatos: formatos, comoTexto: comoTexto, ejemplos: ejemplos, cuenta: cuenta };
    });
    // 4) duplicados
    var vistos = {}, duplicados = [];
    datos.forEach(function (d) {
      var clave = d.celdas.map(function (c) { return c ? plano(c.t).trim() : ""; }).join("\u0001");
      if (vistos[clave] !== undefined) duplicados.push({ fila: d.r + 1, igualA: vistos[clave] + 1 });
      else vistos[clave] = d.r;
    });
    // 5) RUC con el dígito verificador mal
    var rucMalos = [];
    columnas.forEach(function (col) {
      if (col.tipo !== "ruc" && col.tipo !== "doc") return;
      datos.forEach(function (d) { var c = d.celdas[col.k]; if (c && /^(10|15|16|17|20)\d{9}$/.test(c.t.trim()) && !rucValido(c.t.trim())) rucMalos.push({ fila: d.r + 1, valor: c.t.trim(), columna: col.nombre }); });
    });
    // 6) ¿la fila de totales cuadra con la suma?
    var cuadre = null;
    if (totales) {
      columnas.forEach(function (col) {
        if (cuadre || col.tipo !== "monto") return;
        var c = totales.celdas[col.k], v = c ? (c.esNum ? c.n : numero(c.t)) : NaN;
        if (!isFinite(v)) return;
        var suma = 0;
        datos.forEach(function (d) { var x = d.celdas[col.k]; if (x && x.t !== "") { var y = x.esNum ? x.n : numero(x.t); if (isFinite(y)) suma += y; } });
        suma = Math.round(suma * 100) / 100;
        var dif = Math.round((suma - v) * 100) / 100, explica = "";
        if (Math.abs(dif) >= 0.01) {
          duplicados.forEach(function (dp) {
            var x = (filas[dp.fila - 1] || [])[col.k], y = x ? (x.esNum ? x.n : numero(x.t)) : NaN;
            if (!explica && Math.abs(y - dif) < 0.005) explica = "la diferencia es justo la fila duplicada " + dp.fila;
          });
        }
        cuadre = { columna: col.nombre, fila: totales.fila + 1, total: v, suma: suma, diferencia: dif, cuadra: Math.abs(dif) < 0.01, explica: explica };
      });
    }
    // 7) formatos de fecha en todo el archivo
    var formatos = {};
    columnas.forEach(function (c) { Object.keys(c.formatos).forEach(function (f) { formatos[f] = (formatos[f] || 0) + c.formatos[f]; }); });
    var montosTexto = columnas.reduce(function (a, c) { return a + (c.tipo === "monto" ? c.comoTexto : 0); }, 0);
    return {
      encabezado: { fila: enc + 1, motivo: motivoEnc, titulos: titulos }, columnas: columnas, filasDatos: datos.length, filasVacias: vacias,
      duplicados: duplicados, rucMalos: rucMalos, totales: totales ? { fila: totales.fila + 1 } : null, cuadre: cuadre, pie: pie.map(function (r) { return r + 1; }),
      formatosFecha: formatos, montosTexto: montosTexto, ms: Math.max(1, Math.round(performance.now() - t0)),
    };
  }

  // ---------------------------------------------------------------- lectores
  function leerBuffer(file) {
    return new Promise(function (ok, mal) {
      var fr = new FileReader();
      fr.onload = function () { ok(fr.result); };
      fr.onerror = function () { mal(fr.error || new Error("No se pudo leer el archivo")); };
      fr.readAsArrayBuffer(file);
    });
  }
  function decodificar(buf) {
    var u = new Uint8Array(buf), txt, cod = "UTF-8";
    try { txt = new TextDecoder("utf-8", { fatal: true }).decode(u); }
    catch (e) { txt = new TextDecoder("windows-1252").decode(u); cod = "Windows-1252 (ANSI)"; }
    return { texto: txt.replace(/^﻿/, ""), codificacion: cod };
  }

  var pdfP = null;
  function pdfjs() {
    if (!pdfP) pdfP = import(COMUN + "pdf.min.mjs").then(function (lib) { lib.GlobalWorkerOptions.workerSrc = COMUN + "pdf.worker.min.mjs"; return lib; });
    return pdfP;
  }
  var xlsxP = null;
  function sheetjs() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    if (!xlsxP) xlsxP = new Promise(function (ok, mal) {
      var s = document.createElement("script"); s.src = COMUN + "xlsx.full.min.js";
      s.onload = function () { window.XLSX ? ok(window.XLSX) : mal(new Error("SheetJS no cargó")); };
      s.onerror = function () { xlsxP = null; mal(new Error("SheetJS no cargó")); };
      document.head.appendChild(s);
    });
    return xlsxP;
  }

  var DOCS = {}; // documentos PDF abiertos (para la miniatura); no se guardan en la mesa
  function lineasPdf(items) {
    var filas = [];
    items.forEach(function (it) {
      if (!it.str) return;
      var x = it.transform[4], y = it.transform[5], h = Math.abs(it.transform[3]) || it.height || 10, fila = null;
      for (var i = filas.length - 1; i >= 0; i--) if (Math.abs(filas[i].y - y) < Math.max(2, h * 0.45)) { fila = filas[i]; break; }
      if (!fila) { fila = { y: y, h: h, partes: [] }; filas.push(fila); }
      fila.partes.push({ x: x, w: it.width || 0, s: it.str });
    });
    filas.sort(function (a, b) { return b.y - a.y; });
    return filas.map(function (f) {
      f.partes.sort(function (a, b) { return a.x - b.x; });
      var t = "", fin = null;
      f.partes.forEach(function (p) {
        if (fin !== null) {
          var gap = p.x - fin;
          if (gap > f.h * 1.6) t = t.replace(/\s+$/, "") + "   ";
          else if (gap > f.h * 0.12 && !/\s$/.test(t) && !/^\s/.test(p.s)) t += " ";
        }
        t += p.s; fin = p.x + p.w;
      });
      return t.replace(/\s+$/, "").replace(/^\s+/, "");
    }).filter(Boolean).join("\n");
  }
  function leerPdf(buf, ficha) {
    return pdfjs().then(function (lib) {
      return lib.getDocument({ data: new Uint8Array(buf), isEvalSupported: false, disableFontFace: true, verbosity: 0 }).promise.then(function (doc) {
        DOCS[ficha.id] = doc;
        ficha.paginas = doc.numPages;
        var n = Math.min(doc.numPages, 30), textos = [], imagenes = 0, i = 1;
        function siguiente() {
          if (i > n) return Promise.resolve();
          var k = i++;
          return doc.getPage(k).then(function (pg) {
            return pg.getTextContent().then(function (tc) {
              var t = lineasPdf(tc.items); textos.push(t);
              if (t.trim()) return null;
              return pg.getOperatorList().then(function (ops) {
                var O = lib.OPS;
                if (ops.fnArray.some(function (f) { return f === O.paintImageXObject || f === O.paintInlineImageXObject || f === O.paintImageXObjectRepeat; })) imagenes++;
              }).catch(function () {});
            });
          }).then(siguiente);
        }
        return siguiente().then(function () {
          ficha.texto = textos.join("\n\n").trim();
          ficha.paginasImagen = imagenes;
          ficha.paginasLeidas = n;
        });
      });
    });
  }
  function celdaDe(v, cell, XLSX) {
    if (v === null || v === undefined || v === "") return null;
    if (cell && cell.t === "n" && cell.z && XLSX.SSF.is_date(cell.z)) {
      var d = XLSX.SSF.parse_date_code(cell.v);
      var f = iso(d.y, d.m, d.d);
      if (f) return { t: cell.w || f, f: f, fmt: (d.H || d.M) ? "fecha y hora de Excel" : "fecha de Excel", esNum: false, n: null };
    }
    if (typeof v === "number") return { t: cell && cell.w ? cell.w : String(v), n: v, esNum: true, f: "" };
    var s = String(v), fe = fechaDe(s);
    if (fe) return { t: s, f: fe.iso, fmt: fe.formato + " (texto)", esNum: false, n: null };
    return { t: s, n: null, esNum: false, f: "" };
  }
  function hojaAFilas(ws, XLSX) {
    if (!ws || !ws["!ref"]) return [];
    var rg = XLSX.utils.decode_range(ws["!ref"]), filas = [];
    var maxR = Math.min(rg.e.r, rg.s.r + 2000), maxC = Math.min(rg.e.c, rg.s.c + 40);
    for (var r = rg.s.r; r <= maxR; r++) {
      var f = [];
      for (var c = rg.s.c; c <= maxC; c++) {
        var cell = ws[XLSX.utils.encode_cell({ r: r, c: c })];
        f.push(cell ? celdaDe(cell.v, cell, XLSX) : null);
      }
      while (f.length && !f[f.length - 1]) f.pop();
      filas.push(f);
    }
    return filas;
  }
  function separador(linea) {
    var c = { ";": 0, ",": 0, "\t": 0, "|": 0 }, dentro = false;
    for (var i = 0; i < linea.length; i++) { var ch = linea.charAt(i); if (ch === '"') dentro = !dentro; else if (!dentro && ch in c) c[ch]++; }
    var mejor = ",", n = -1; Object.keys(c).forEach(function (k) { if (c[k] > n) { n = c[k]; mejor = k; } });
    return mejor;
  }
  var NOMBRE_SEP = { ";": "punto y coma (;)", ",": "coma (,)", "\t": "tabulación", "|": "barra (|)" };
  function leerTabla(buf, ficha) {
    return sheetjs().then(function (XLSX) {
      var wb;
      if (ficha.tipo === "csv") {
        var d = decodificar(buf); ficha.codificacion = d.codificacion;
        var sep = separador(d.texto.split(/\r?\n/)[0] || ""); ficha.separador = NOMBRE_SEP[sep];
        wb = XLSX.read(d.texto, { type: "string", raw: true, FS: sep });
      } else {
        wb = XLSX.read(new Uint8Array(buf), { type: "array", cellNF: true, cellDates: false, cellFormula: false, cellHTML: false });
      }
      ficha.hojas = wb.SheetNames.slice(0, 12);
      var hoja = wb.SheetNames[0], filas = hojaAFilas(wb.Sheets[hoja], XLSX);
      ficha.hoja = hoja;
      ficha.tabla = escanearTabla(filas);
      ficha.muestraFilas = filas.slice(0, 60).map(function (f) { return f.map(function (c) { return c ? { t: c.t, f: c.f || "" } : null; }); });
      ficha.totalFilas = filas.length;
      ficha.texto = filas.slice(0, 400).map(function (f) { return f.map(function (c) { return c ? c.t : ""; }).join(" | ").replace(/(\s\|\s)+$/, ""); }).filter(function (l) { return l.replace(/[|\s]/g, ""); }).join("\n");
    });
  }

  // leer(File | {nombre, buffer}) → la ficha completa (texto + reglas)
  function leer(entrada) {
    var nombre = entrada.name || entrada.nombre, tipo = tipoDe(nombre);
    var ficha = { id: id(), nombre: nombre, tipo: tipo, bytes: entrada.size || (entrada.buffer ? entrada.buffer.byteLength : 0), muestra: !!entrada.muestra, texto: "", leidoEn: Date.now() };
    if (!tipo) return Promise.reject(new Error("«" + nombre + "» no es PDF, Excel, CSV ni texto. Prueba con uno de esos."));
    var t0 = performance.now();
    var bufP = entrada.buffer ? Promise.resolve(entrada.buffer) : leerBuffer(entrada);
    return bufP.then(function (buf) {
      ficha.bytes = buf.byteLength;
      if (tipo === "imagen") { ficha.texto = ""; return; }
      if (tipo === "pdf") return leerPdf(buf, ficha);
      if (tipo === "txt") { var d = decodificar(buf); ficha.texto = d.texto; ficha.codificacion = d.codificacion; return; }
      return leerTabla(buf, ficha);
    }).then(function () {
      ficha.texto = (ficha.texto || "").replace(/\r\n?/g, "\n");
      ficha.caracteres = ficha.texto.length;
      if (ficha.texto.length > LIMITE_TEXTO) { ficha.texto = ficha.texto.slice(0, LIMITE_TEXTO); ficha.recortado = true; }
      ficha.sinTexto = !ficha.texto.trim();
      ficha.reglas = reglasTexto(ficha.texto, ficha.nombre, { tabla: !!ficha.tabla });
      if (ficha.tabla) ficha.reglas.tipo = tipoDocumento(ficha.tabla.columnas.map(function (c) { return c.nombre; }).join(" ") + "\n" + ficha.texto.split("\n").slice(0, 3).join("\n"), ficha.nombre, [], true);
      ficha.ms = Math.max(1, Math.round(performance.now() - t0));
      return ficha;
    });
  }
  function muestra(archivo) {
    return fetch(RUTA_MUESTRAS + encodeURIComponent(archivo), { credentials: "same-origin", cache: "default" }).then(function (r) {
      if (!r.ok) throw new Error("No pude traer el archivo de muestra (" + r.status + ").");
      return r.arrayBuffer();
    }).then(function (buf) { return leer({ nombre: archivo, buffer: buf, muestra: true }); });
  }

  // ---------------------------------------------------------------- categoría por reglas
  function categoria(f, miRuc) {
    miRuc = String(miRuc || "").replace(/\D/g, "");
    var t = (f.reglas && f.reglas.tipo && f.reglas.tipo.id) || "";
    if (f.sinTexto) return { cat: "", origen: "sin-texto", motivo: f.tipo === "imagen" ? "Es una foto: las reglas no leen imágenes (haría falta OCR)." : "0 caracteres: es una imagen escaneada. Las reglas no tienen qué leer." };
    var seg = f.reglas.tipo.seguro;
    if (t && f.reglas.tipo.puntos < 3) return { cat: "", origen: "por-decidir", motivo: "Solo encontré «" + f.reglas.tipo.claves.join("», «") + "»: muy poco para decidir. Aquí la regla se detiene." };
    if (t === "extracto") return { cat: "bancario", origen: "regla", seguro: seg, motivo: "Palabras de banco: " + f.reglas.tipo.claves.slice(0, 3).join(", ") + "." };
    if (t === "planilla") return { cat: "planilla", origen: "regla", seguro: seg, motivo: "Palabras de planilla: " + f.reglas.tipo.claves.slice(0, 3).join(", ") + "." };
    if (t === "honorarios") return { cat: "gasto", origen: "regla", seguro: seg, motivo: "Un recibo por honorarios es un servicio que pagaste." };
    if (t === "servicio") return { cat: "gasto", origen: "regla", seguro: seg, motivo: "Luz, agua o teléfono: un gasto del local." };
    var ojo = f.tabla && f.tabla.cuadre && !f.tabla.cuadre.cuadra ? " Ojo: su fila TOTAL no cuadra con la suma." : f.tabla && f.tabla.duplicados.length ? " Ojo: tiene filas duplicadas." : "";
    if (t === "gastos") return { cat: "gasto", origen: "regla", seguro: seg, motivo: "La tabla habla de gastos y proveedores." + ojo };
    if (t === "ventas") return { cat: "venta", origen: "regla", seguro: seg, motivo: "La tabla habla de ventas y clientes." + ojo };
    if (/^(factura|boleta|nota-credito|nota-debito)$/.test(t)) {
      var validos = f.reglas.ruc.filter(function (r) { return r.valido; }), emisor = validos.length ? validos[0].valor : "";
      if (!miRuc) return { cat: "", origen: "falta-ruc", motivo: "¿La emitiste tú o te la dieron? Escribe tu RUC y la regla lo decide." };
      if (emisor === miRuc) return { cat: "venta", origen: "regla", seguro: true, motivo: "El RUC de arriba (el del emisor) es el tuyo: la emitiste tú." };
      if (f.texto.indexOf(miRuc) >= 0) return { cat: "compra", origen: "regla", seguro: true, motivo: "Tu RUC aparece como cliente; te la emitió el RUC " + emisor + "." };
      return { cat: "", origen: "por-decidir", motivo: "Tu RUC no aparece en el comprobante." };
    }
    return { cat: "", origen: "por-decidir", motivo: "Ninguna palabra clave dice qué es: aquí la regla se detiene." };
  }

  // ---------------------------------------------------------------- enmascarar antes de mandar
  function enmascarar(texto, extras) {
    var R = reglasTexto(texto, "", { tabla: true }), marcas = [];
    R.correos.forEach(function (x) { marcas.push([x.ini, x.fin, "[CORREO]", "correo"]); });
    R.cuentas.forEach(function (x) { marcas.push([x.ini, x.fin, "[CUENTA]", "cuenta"]); });
    R.ruc.forEach(function (x) { if (x.persona) marcas.push([x.ini, x.fin, "[RUC DE PERSONA]", "ruc10"]); });
    R.telefonos.forEach(function (x) { marcas.push([x.ini, x.fin, "[TELÉFONO]", "tel"]); });
    R.dni.forEach(function (x) { marcas.push([x.ini, x.fin, "[DNI]", "dni"]); });
    (extras || []).forEach(function (p) {
      p = String(p || "").trim(); if (p.length < 2) return;
      var re = new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+"), "gi"), m;
      while ((m = re.exec(texto))) marcas.push([m.index, m.index + m[0].length, "[OCULTO]", "extra"]);
    });
    marcas.sort(function (a, b) { return a[0] - b[0] || b[1] - a[1]; });
    var out = "", pos = 0, cuenta = { correo: 0, cuenta: 0, ruc10: 0, tel: 0, dni: 0, extra: 0 }, tramos = [];
    marcas.forEach(function (m) {
      if (m[0] < pos) return; // se pisa con otra marca: gana la primera
      out += texto.slice(pos, m[0]);
      tramos.push({ ini: out.length, fin: out.length + m[2].length, clase: m[3] });
      out += m[2]; pos = m[1]; cuenta[m[3]]++;
    });
    out += texto.slice(pos);
    var total = Object.keys(cuenta).reduce(function (a, k) { return a + cuenta[k]; }, 0);
    return { texto: out, cuenta: cuenta, total: total, tramos: tramos };
  }

  // ---------------------------------------------------------------- la IA: POST ../../entender
  function mensajeError(j) { return j && (typeof j.error === "string" ? j.error : (j.error && j.error.message)) || ""; }
  function entender(datos, msMax) {
    var ctl = window.AbortController ? new AbortController() : null, t0 = Date.now();
    var reloj = setTimeout(function () { if (ctl) ctl.abort(); }, msMax || 90000);
    var cuerpo = {
      nombre: String(datos.nombre || "archivo").slice(0, 120), tipo: datos.tipo === "xlsx" || datos.tipo === "xls" ? "xlsx" : (datos.tipo === "csv" || datos.tipo === "pdf" ? datos.tipo : "txt"),
      texto: String(datos.texto || "").slice(0, LIMITE_IA),
    };
    if (datos.campos_reglas) cuerpo.campos_reglas = datos.campos_reglas;
    cuerpo.categorias = datos.categorias || CATEGORIAS;
    if (datos.pregunta) cuerpo.pregunta = String(datos.pregunta).slice(0, 600);
    return fetch(URL_ENTENDER, {
      method: "POST", credentials: "same-origin", cache: "no-store", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo), signal: ctl ? ctl.signal : undefined,
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) { return { status: r.status, ok: r.ok, j: j || {}, retry: r.headers.get("Retry-After") }; });
    }).catch(function (e) { return { status: e && e.name === "AbortError" ? -1 : 0, ok: false, j: {} }; }).then(function (x) {
      clearTimeout(reloj);
      var ms = Date.now() - t0, msg = mensajeError(x.j);
      if (x.ok && x.j && Array.isArray(x.j.campos)) return { estado: "ok", r: x.j, ms: ms, enviado: cuerpo };
      if (x.ok) return { estado: "error", msg: "La IA respondió algo que no entiendo. Vuelve a intentar.", ms: ms };
      var E = {
        404: ["pronto", "El paso con IA se activa muy pronto. Tus reglas ya trabajaron y tu texto ya está tapado: cuando se active, este mismo botón responde."],
        429: ["cupo", msg || "Llegaste al tope de consultas de IA de hoy. Se renueva a la medianoche de Lima; las reglas siguen funcionando."],
        401: ["sesion", "Tu sesión venció. Recarga la página del LIVE e inicia sesión otra vez."],
        403: ["sesion", msg || "El LMS no dejó pasar el pedido. Recarga la página del LIVE."],
        413: ["largo", msg || "El texto es muy largo para la IA: manda una parte (máximo 12 000 caracteres)."],
        400: ["error", msg || "Al pedido le falta algo (¿el texto está vacío?)."],
        503: ["ocupada", msg || "Los modelos están ocupados ahora mismo. Espera un minuto y vuelve a intentar."],
        "-1": ["red", "La IA tardó demasiado. Vuelve a intentar en un momento."],
        0: ["red", "No hubo respuesta: revisa tu conexión y vuelve a intentar."],
      }[x.status] || ["error", msg || "La IA no pudo responder (" + x.status + ")."];
      return { estado: E[0], msg: E[1], ms: ms, retry: x.retry, status: x.status };
    });
  }

  // ---------------------------------------------------------------- verificar: cada campo con su cita literal
  function mapaNormal(texto) { // texto sin espacios repetidos y en minúsculas, con el puente a las posiciones originales
    var n = "", idx = [], esp = false;
    for (var i = 0; i < texto.length; i++) {
      var ch = texto.charAt(i);
      if (/\s/.test(ch)) { if (!esp && n.length) { n += " "; idx.push(i); } esp = true; continue; }
      esp = false; n += ch.toLowerCase(); idx.push(i);
    }
    return { n: n, idx: idx };
  }
  function normal(s) { return String(s == null ? "" : s).replace(/\s+/g, " ").trim().toLowerCase(); }
  function verificar(campos, texto) {
    var M = mapaNormal(texto);
    return (campos || []).map(function (c) {
      var ev = normal(c.evidencia), val = normal(c.valor), out = { nombre: c.nombre, valor: c.valor, evidencia: c.evidencia, estado: "inventado", ini: -1, fin: -1 };
      if (ev) {
        var k = M.n.indexOf(ev);
        if (k >= 0) {
          out.ini = M.idx[k]; out.fin = M.idx[k + ev.length - 1] + 1;
          var digV = val.replace(/\D/g, ""), digE = ev.replace(/\D/g, "");
          var dice = !val || ev.indexOf(val) >= 0 || (digV.length >= 2 && digE.indexOf(digV) >= 0);
          out.estado = dice ? "literal" : "revisa";
        }
      }
      return out;
    });
  }

  // ---------------------------------------------------------------- la mesa: los archivos de esta pestaña
  var CLAVE_MESA = "gq03-mesa", memoria = [];
  function mesaLeer() { try { var v = sessionStorage.getItem(CLAVE_MESA); return v ? JSON.parse(v) : memoria.slice(); } catch (e) { return memoria.slice(); } }
  function mesaEscribir(lista) {
    memoria = lista.slice();
    try { sessionStorage.setItem(CLAVE_MESA, JSON.stringify(lista)); return true; }
    catch (e) { // cuota llena: se guardan sin el texto largo
      try { sessionStorage.setItem(CLAVE_MESA, JSON.stringify(lista.map(function (f) { var g = Object.assign({}, f); g.texto = String(g.texto || "").slice(0, 8000); return g; }))); } catch (e2) {}
      return false;
    }
  }
  var mesa = {
    lista: mesaLeer,
    guardar: function (f) {
      var l = mesaLeer().filter(function (x) { return x.nombre !== f.nombre; });
      l.push(f); if (l.length > 12) l = l.slice(-12);
      mesaEscribir(l); avisar(); return f;
    },
    quitar: function (idf) { mesaEscribir(mesaLeer().filter(function (x) { return x.id !== idf; })); avisar(); },
    vaciar: function () { mesaEscribir([]); try { sessionStorage.removeItem("gq03-ia-ultima"); } catch (e) {} avisar(); },
    buscar: function (idf) { return mesaLeer().filter(function (x) { return x.id === idf; })[0] || null; },
  };
  function avisar() { document.dispatchEvent(new CustomEvent("esc-mesa", { detail: mesaLeer() })); }
  function miRuc(v) {
    try { if (v !== undefined) sessionStorage.setItem("gq03-miruc", String(v || "").replace(/\D/g, "").slice(0, 11)); return sessionStorage.getItem("gq03-miruc") || ""; }
    catch (e) { return v || ""; }
  }

  // ---------------------------------------------------------------- exportar
  function filaLote(f) {
    var c = f.categoria || {}, R = f.reglas || {}, ia = c.origen === "ia" ? f.ia || null : null;
    var tabla = !!f.tabla, comprobante = /^(factura|boleta|nota-credito|nota-debito|honorarios|servicio)$/.test((R.tipo && R.tipo.id) || "");
    var emisor = tabla ? null : (R.ruc || []).filter(function (r) { return r.valido; })[0];
    var fecha = tabla ? null : (R.fechas || [])[0];
    var total = tabla ? (f.tabla.cuadre ? f.tabla.cuadre.total : null) : R.total ? R.total.n : null;
    return {
      archivo: f.nombre, tipo_archivo: f.tipo, tipo_documento: ia ? ia.tipo_documento : (R.tipo && R.tipo.id ? R.tipo.nombre : ""),
      categoria: c.cat || "", origen: c.origen === "regla" ? "regla" : c.origen === "ia" ? "ia" : c.origen === "sin-texto" ? "sin texto" : "por decidir",
      confianza: c.origen === "ia" && ia ? Math.round((ia.confianza || 0) * 100) / 100 : c.origen === "regla" ? (c.seguro ? 1 : 0.6) : "",
      fecha: fecha ? fecha.iso : "", ruc_emisor: emisor && !emisor.persona ? emisor.valor : emisor ? "[RUC DE PERSONA]" : "",
      serie_numero: comprobante && (R.series || [])[0] ? R.series[0].valor : "", total_soles: typeof total === "number" && isFinite(total) ? total.toFixed(2) : "", motivo: c.motivo || "",
    };
  }
  function csv(lista) {
    var filas = lista.map(filaLote), cols = ["archivo", "tipo_archivo", "tipo_documento", "categoria", "origen", "confianza", "fecha", "ruc_emisor", "serie_numero", "total_soles", "motivo"];
    var q = function (v) { v = String(v == null ? "" : v); return /[",\n;]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    return [cols.join(",")].concat(filas.map(function (f) { return cols.map(function (c) { return q(f[c]); }).join(","); })).join("\n") + "\n";
  }
  function json(lista) { return JSON.stringify(lista.map(filaLote), null, 2) + "\n"; }
  function bajar(texto, archivo, mime) {
    var d = document, w = window;
    try { if (window.parent && window.parent !== window && window.parent.document.body) { d = window.parent.document; w = window.parent; } } catch (e) {}
    try {
      var url = w.URL.createObjectURL(new w.Blob(["﻿" + texto], { type: (mime || "text/plain") + ";charset=utf-8" }));
      var a = d.createElement("a"); a.href = url; a.download = archivo; a.rel = "noopener"; a.style.display = "none";
      d.body.appendChild(a); a.click();
      setTimeout(function () { a.remove(); try { w.URL.revokeObjectURL(url); } catch (e) {} }, 4000);
      return true;
    } catch (e) { return false; }
  }

  // ---------------------------------------------------------------- piezas de pantalla
  var ICONO = { pdf: "PDF", xlsx: "XLS", xls: "XLS", csv: "CSV", txt: "TXT", imagen: "IMG" };
  function chipTipo(tipo) { return el("span", { class: "x-ico x-" + (tipo || "txt"), "aria-hidden": "true", text: ICONO[tipo] || "?" }); }

  // zona(contenedor, {multiple, aceptar, muestras:[archivo…], alLeer(ficha), alEmpezar(nombre), alError(msg)})
  function zona(cont, op) {
    op = op || {};
    var uid = "x-in-" + Math.random().toString(36).slice(2, 7);
    var input = el("input", { type: "file", id: uid, class: "x-input", accept: op.aceptar || ".pdf,.xlsx,.xls,.ods,.csv,.txt", multiple: op.multiple ? true : null });
    var caja = el("label", { class: "x-zona", for: uid }, [
      el("span", { class: "x-zona-ico", "aria-hidden": "true" }),
      el("span", { class: "x-zona-t" }, [el("b", { text: op.titulo || "Suelta aquí tu archivo" }), el("span", { text: op.sub || "o toca para elegirlo · PDF, Excel o CSV" })]),
    ]);
    var estado = el("p", { class: "x-estado", role: "status", "aria-live": "polite" });
    cont.appendChild(input); cont.appendChild(caja);
    if (op.muestras && op.muestras.length) {
      var fila = el("div", { class: "x-muestras" }, [el("span", { class: "x-muestras-t", text: op.textoMuestras || "¿No trajiste? Usa una muestra:" })]);
      op.muestras.forEach(function (a) {
        var m = MUESTRAS.filter(function (x) { return x.archivo === a; })[0]; if (!m) return;
        var b = el("button", { type: "button", class: "x-muestra", "data-archivo": a, title: m.titulo }, [chipTipo(m.tipo), el("span", { text: m.titulo })]);
        b.addEventListener("click", function () { cargar([{ muestra: a }]); });
        fila.appendChild(b);
      });
      cont.appendChild(fila);
    }
    cont.appendChild(estado);
    function cargar(lista) {
      var cola = Array.prototype.slice.call(lista).slice(0, op.multiple ? 12 : 1), hechos = 0;
      function una() {
        if (!cola.length) { if (op.alTerminar) op.alTerminar(hechos); return; }
        var x = cola.shift(), nombre = x.muestra || x.name;
        estado.className = "x-estado leyendo"; estado.textContent = "Leyendo «" + nombre + "» en tu navegador…";
        if (op.alEmpezar) op.alEmpezar(nombre);
        (x.muestra ? muestra(x.muestra) : leer(x)).then(function (f) {
          hechos++;
          f.categoria = categoria(f, miRuc());
          if (op.guardar !== false) mesa.guardar(f);
          estado.className = "x-estado ok";
          estado.textContent = "✓ «" + f.nombre + "» leído en " + miles(f.ms) + " ms, sin IA y sin subir nada.";
          if (op.alLeer) op.alLeer(f);
        }).catch(function (e) {
          estado.className = "x-estado mal";
          estado.textContent = (e && e.message) || "No pude leer ese archivo.";
          if (op.alError) op.alError(estado.textContent);
        }).then(una);
      }
      una();
    }
    input.addEventListener("change", function () { if (input.files && input.files.length) cargar(input.files); input.value = ""; });
    ["dragenter", "dragover"].forEach(function (ev) { caja.addEventListener(ev, function (e) { e.preventDefault(); caja.classList.add("encima"); }); });
    ["dragleave", "drop"].forEach(function (ev) { caja.addEventListener(ev, function (e) { e.preventDefault(); caja.classList.remove("encima"); }); });
    caja.addEventListener("drop", function (e) { if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) cargar(e.dataTransfer.files); });
    return { cargar: cargar, estado: estado, input: input };
  }

  // resaltar(pre, texto, marcas [{ini, fin, clase, titulo}]) → <pre> con <mark>; devuelve las marcas creadas
  function resaltar(pre, texto, marcas, max) {
    pre.textContent = "";
    max = max || 6000;
    var corte = texto.length > max ? max : texto.length;
    var ms = (marcas || []).filter(function (m) { return m.ini >= 0 && m.ini < corte; }).sort(function (a, b) { return a.ini - b.ini || b.fin - a.fin; });
    var pos = 0, hechas = [];
    ms.forEach(function (m) {
      if (m.ini < pos) return;
      pre.appendChild(document.createTextNode(texto.slice(pos, m.ini)));
      var mk = el("mark", { class: "x-m " + (m.clase || ""), title: m.titulo || null, "data-k": m.k !== undefined ? String(m.k) : null, text: texto.slice(m.ini, Math.min(m.fin, corte)) });
      pre.appendChild(mk); hechas.push(mk); pos = Math.min(m.fin, corte);
    });
    pre.appendChild(document.createTextNode(texto.slice(pos, corte)));
    if (corte < texto.length) pre.appendChild(el("span", { class: "x-corte", text: "\n… (" + miles(texto.length - corte) + " caracteres más)" }));
    return hechas;
  }
  function marcasReglas(R) {
    var m = [];
    R.ruc.forEach(function (x) { m.push({ ini: x.ini, fin: x.fin, clase: x.valido ? "ruc" : "ruc mal", titulo: x.valido ? (x.persona ? "RUC de persona: lleva su DNI" : "RUC válido") : "RUC con el dígito verificador mal" }); });
    R.dni.forEach(function (x) { m.push({ ini: x.ini, fin: x.fin, clase: "dni", titulo: x.seguro ? "DNI" : "8 dígitos: ¿un DNI?" }); });
    R.fechas.forEach(function (x) { m.push({ ini: x.ini, fin: x.fin, clase: "fecha", titulo: "Fecha · " + x.iso }); });
    R.montos.forEach(function (x) { m.push({ ini: x.ini, fin: x.fin, clase: "monto", titulo: "Monto · " + soles(x.n) }); });
    if (R.total && !R.montos.some(function (x) { return x.ini <= R.total.ini && x.fin >= R.total.fin; })) m.push({ ini: R.total.ini, fin: R.total.fin, clase: "monto", titulo: "Total · " + soles(R.total.n) });
    R.series.forEach(function (x) { m.push({ ini: x.ini, fin: x.fin, clase: "serie", titulo: "Serie y número" }); });
    R.correos.forEach(function (x) { m.push({ ini: x.ini, fin: x.fin, clase: "correo", titulo: "Correo" }); });
    R.telefonos.forEach(function (x) { m.push({ ini: x.ini, fin: x.fin, clase: "tel", titulo: "Teléfono" }); });
    return m;
  }

  function unicos(lista, f) { var v = {}, o = []; lista.forEach(function (x) { var k = f(x); if (!v[k]) { v[k] = 1; o.push(x); } }); return o; }
  function filaFicha(et, clase, hijos, vacio) {
    var vals = el("div", { class: "x-vals" }, hijos && hijos.length ? hijos : [el("span", { class: "x-nada", text: vacio || "ninguno" })]);
    return el("div", { class: "x-fila" + (clase ? " " + clase : "") }, [el("span", { class: "x-et", text: et }), vals]);
  }
  function chip(texto, clase, titulo) { return el("span", { class: "x-chip " + (clase || ""), title: titulo || null, text: texto }); }

  // pintarFicha(contenedor, ficha, {miRuc}) → la ficha que hacen las reglas, sin IA
  function pintarFicha(cont, f, op) {
    op = op || {};
    cont.textContent = "";
    var R = f.reglas, tipoDoc = R.tipo || {};
    var cab = el("div", { class: "x-fcab" }, [chipTipo(f.tipo), el("div", null, [
      el("b", { text: f.nombre }),
      el("span", { text: [kb(f.bytes), f.paginas ? f.paginas + (f.paginas === 1 ? " página" : " páginas") : "", f.tabla ? miles(f.tabla.filasDatos) + " filas de datos" : miles(f.caracteres || 0) + " caracteres", "reglas en " + miles(f.ms) + " ms"].filter(Boolean).join(" · ") }),
    ])]);
    cont.appendChild(cab);
    if (f.sinTexto) {
      cont.appendChild(el("div", { class: "x-alto" }, [el("b", { text: f.tipo === "imagen" ? "Es una foto: aquí las reglas se detienen" : "0 caracteres de texto: es una imagen" }),
        el("span", { text: (f.paginasImagen ? "El PDF solo trae una imagen (un escaneo o una foto). " : "") + "Tus ojos leen la nota; las reglas no tienen ni una letra que revisar. Haría falta OCR (reconocer letras en la imagen) antes de cualquier regla." })]));
      return;
    }
    var cat = f.categoria || categoria(f, op.miRuc);
    var tipoTxt = tipoDoc.id && tipoDoc.puntos >= 3 ? tipoDoc.nombre : "Sin un tipo claro";
    cont.appendChild(el("div", { class: "x-resumen" }, [
      el("div", null, [el("small", { text: "Qué es (por palabras clave)" }), el("b", { text: tipoTxt }),
        el("span", { text: tipoDoc.claves && tipoDoc.claves.length ? "encontré: «" + tipoDoc.claves.slice(0, 4).join("», «") + "»" : "ninguna palabra clave conocida" })]),
      el("div", { class: cat.cat ? "" : "duda" }, [el("small", { text: "Categoría por regla" }), el("b", { text: cat.cat || "por decidir" }), el("span", { text: cat.motivo })]),
    ]));
    var filas = el("div", { class: "x-filas" });
    if (f.tabla) {
      var T = f.tabla;
      filas.appendChild(filaFicha("Encabezado", "", [chip("fila " + T.encabezado.fila, "ok"), el("span", { class: "x-mot", text: T.encabezado.motivo })]));
      if (f.separador) filas.appendChild(filaFicha("Separador", "", [chip(f.separador), el("span", { class: "x-mot", text: (f.codificacion || "") })]));
      filas.appendChild(filaFicha("Columnas", "x-cols", T.columnas.filter(function (c) { return c.llenas || c.vacios; }).slice(0, 14).map(function (c) {
        return el("span", { class: "x-col" }, [el("b", { text: c.nombre }), chip(c.nombreTipo, "t-" + c.tipo), c.vacios ? el("i", { text: c.vacios + (c.vacios === 1 ? " vacía" : " vacías") }) : null]);
      })));
      var fmts = Object.keys(T.formatosFecha);
      filas.appendChild(filaFicha("Fechas", fmts.length > 1 ? "aviso" : "", fmts.map(function (k) { return chip(k + " · " + T.formatosFecha[k], "fecha"); }), "sin columna de fecha"));
      if (T.montosTexto && f.tipo !== "csv") filas.appendChild(filaFicha("Montos", "aviso", [chip(T.montosTexto + (T.montosTexto === 1 ? " escrito como texto" : " escritos como texto"), "monto"), el("span", { class: "x-mot", text: "la regla igual los convierte a número" })]));
      filas.appendChild(filaFicha("Duplicados", T.duplicados.length ? "aviso" : "", T.duplicados.slice(0, 4).map(function (d) { return chip("fila " + d.fila + " = fila " + d.igualA, "mal"); }), "ninguno"));
      if (T.rucMalos.length) filas.appendChild(filaFicha("RUC con error", "aviso", T.rucMalos.slice(0, 3).map(function (r) { return chip("fila " + r.fila + " · " + r.valor, "mal", "El dígito verificador no cuadra"); })));
      if (T.totales) {
        var C = T.cuadre;
        filas.appendChild(filaFicha("Fila TOTAL", C && !C.cuadra ? "aviso" : "", C ? [chip("fila " + C.fila + " · " + soles(C.total), C.cuadra ? "ok" : "mal"),
          el("span", { class: "x-mot", text: C.cuadra ? "cuadra con la suma de las filas (" + soles(C.suma) + ")" + (T.duplicados.length ? ", pero esa suma incluye el duplicado: ¿se pagó dos veces?" : "") : "la suma de las filas da " + soles(C.suma) + ": no cuadra por " + soles(C.diferencia) + (C.explica ? "; " + C.explica : "") })]
          : [chip("fila " + T.totales.fila), el("span", { class: "x-mot", text: "no encontré una columna de montos para comparar" })]));
      } else filas.appendChild(filaFicha("Fila TOTAL", "", [], "no tiene"));
      if (T.filasVacias || T.pie.length) filas.appendChild(filaFicha("Otras filas", "", [T.filasVacias ? chip(T.filasVacias + " vacías") : null, T.pie.length ? chip(T.pie.length + " de nota al pie") : null].filter(Boolean)));
    } else {
      var rucs = unicos(R.ruc, function (x) { return x.valor; });
      filas.appendChild(filaFicha("RUC", rucs.some(function (r) { return !r.valido; }) ? "aviso" : "", rucs.slice(0, 5).map(function (r) {
        return chip(r.valor + (r.valido ? " ✓" : " ✗"), r.valido ? (r.persona ? "ruc persona" : "ruc") : "mal", r.valido ? (r.persona ? "Válido · RUC de persona: lleva su DNI adentro" : "Válido: el dígito verificador cuadra") : "El dígito verificador no cuadra");
      })));
      filas.appendChild(filaFicha("Serie-número", "", unicos(R.series, function (x) { return x.valor; }).slice(0, 4).map(function (x) { return chip(x.valor, "serie"); })));
      filas.appendChild(filaFicha("Fechas", "", unicos(R.fechas, function (x) { return x.iso; }).slice(0, 5).map(function (x) { return chip(x.iso.split("-").reverse().join("/"), "fecha", "Formato: " + x.formato + " · " + x.valor); })));
      filas.appendChild(filaFicha("Total", "", R.total ? [chip(soles(R.total.n), "monto"), el("span", { class: "x-mot", text: "de la línea «" + R.total.linea.replace(/\s{2,}/g, " ").slice(0, 60) + "»" })] : [], "sin línea de total"));
      var dnis = unicos(R.dni, function (x) { return x.valor; }), tels = unicos(R.telefonos, function (x) { return x.valor; }), cors = unicos(R.correos, function (x) { return x.valor; });
      filas.appendChild(filaFicha("Datos personales", dnis.length + tels.length + cors.length ? "personal" : "", []
        .concat(dnis.slice(0, 3).map(function (x) { return chip("DNI " + x.valor, "dni"); }))
        .concat(tels.slice(0, 3).map(function (x) { return chip(x.valor, "tel"); }))
        .concat(cors.slice(0, 2).map(function (x) { return chip(x.valor, "correo"); })), "ninguno a la vista"));
    }
    cont.appendChild(filas);
  }

  // miniatura(canvas, ficha, anchoCss): la página 1 del PDF (solo si se abrió en esta escena)
  function miniatura(canvas, f, ancho) {
    var doc = DOCS[f.id];
    if (!doc) return Promise.resolve(false);
    return doc.getPage(1).then(function (pg) {
      var v1 = pg.getViewport({ scale: 1 }), dpr = Math.min(2, window.devicePixelRatio || 1), esc = (ancho || 220) / v1.width;
      var vp = pg.getViewport({ scale: esc * dpr });
      canvas.width = Math.round(vp.width); canvas.height = Math.round(vp.height);
      canvas.style.width = Math.round(vp.width / dpr) + "px"; canvas.style.height = Math.round(vp.height / dpr) + "px";
      return pg.render({ canvas: canvas, viewport: vp }).promise.then(function () { return true; });
    }).catch(function () { return false; });
  }

  // listaMesa(ul, {filtro(f), alElegir(f), sel: id, quitar: true}) → la mesa como lista que se puede tocar
  function listaMesa(ul, op) {
    op = op || {};
    function pintar() {
      ul.textContent = "";
      var l = mesaLeer().filter(op.filtro || function () { return true; });
      if (!l.length) { ul.appendChild(el("li", { class: "x-mesa-vacia", text: op.vacia || "Tu mesa está vacía: carga un archivo." })); return; }
      l.forEach(function (f) {
        var info = f.sinTexto ? "sin texto" : f.tabla ? miles(f.tabla.filasDatos) + " filas" : miles(f.caracteres || 0) + " caract.";
        var li = el("li", { class: op.sel === f.id ? "sel" : "", "data-id": f.id }, [chipTipo(f.tipo), el("b", { text: f.nombre }), el("span", { text: info })]);
        if (op.alElegir) {
          li.setAttribute("role", "button"); li.setAttribute("tabindex", "0"); li.setAttribute("aria-label", "Ver " + f.nombre);
          var elegir = function () { op.sel = f.id; pintar(); op.alElegir(f); };
          li.addEventListener("click", function (e) { if (!e.target.closest("button")) elegir(); });
          li.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); elegir(); } });
        }
        if (op.quitar !== false) {
          var b = el("button", { type: "button", "aria-label": "Quitar " + f.nombre + " de la mesa", title: "Quitar de la mesa", text: "×" });
          b.addEventListener("click", function () { mesa.quitar(f.id); });
          li.appendChild(b);
        }
        ul.appendChild(li);
      });
    }
    document.addEventListener("esc-mesa", pintar);
    pintar();
    return { pintar: pintar, elegir: function (idf) { op.sel = idf; pintar(); } };
  }

  // pintarTabla(contenedor, ficha, maxFilas) → vista previa con el encabezado, los títulos, la fila TOTAL y los duplicados
  function pintarTabla(cont, f, max) {
    cont.textContent = "";
    if (!f.tabla || !f.muestraFilas) return;
    var T = f.tabla, filas = f.muestraFilas.slice(0, max || 45), ancho = 0;
    filas.forEach(function (r) { if (r.length > ancho) ancho = r.length; });
    ancho = Math.min(ancho, 12);
    var dup = {}; T.duplicados.forEach(function (d) { dup[d.fila] = 1; });
    var colFecha = {}; T.columnas.forEach(function (c) { if (c.tipo === "fecha") colFecha[c.k] = 1; });
    var tabla = el("table", { class: "x-tabla" }), cab = el("tr");
    cab.appendChild(el("th", { text: "#" }));
    for (var c = 0; c < ancho; c++) cab.appendChild(el("th", { text: String.fromCharCode(65 + c) }));
    tabla.appendChild(el("thead", null, cab));
    var tb = el("tbody");
    filas.forEach(function (r, i) {
      var n = i + 1, cls = n === T.encabezado.fila ? "enc" : n < T.encabezado.fila ? "tit" : T.totales && n === T.totales.fila ? "tot" : dup[n] ? "dup" : "";
      var tr = el("tr", { class: cls || null });
      tr.appendChild(el("td", { class: "rn", text: String(n) }));
      for (var k = 0; k < ancho; k++) {
        var x = r[k], datos = n > T.encabezado.fila && cls !== "tot" && !(T.pie.indexOf(n) >= 0);
        var vacia = datos && (!x || x.t === "") && r.some(function (y) { return y && y.t !== ""; });
        tr.appendChild(el("td", { class: vacia ? "vac" : x && x.f && colFecha[k] ? "fec" : null, title: x && x.f ? "→ " + x.f : null, text: x ? x.t : "" }));
      }
      tb.appendChild(tr);
    });
    tabla.appendChild(tb);
    cont.appendChild(el("div", { class: "x-tabla-env", tabindex: "0", role: "region", "aria-label": "Vista previa de " + f.nombre }, tabla));
  }

  window.ESC = {
    listaMesa: listaMesa, pintarTabla: pintarTabla,
    MUESTRAS: MUESTRAS, MI_RUC_MUESTRA: MI_RUC_MUESTRA, CATEGORIAS: CATEGORIAS, LIMITE_IA: LIMITE_IA,
    leer: leer, muestra: muestra, reglasTexto: reglasTexto, escanearTabla: escanearTabla, tipoDocumento: tipoDocumento,
    rucValido: rucValido, rucCuenta: rucCuenta, numero: numero, fechaDe: fechaDe, soles: soles, miles: miles, plano: plano,
    categoria: categoria, enmascarar: enmascarar, entender: entender, verificar: verificar, mesa: mesa, miRuc: miRuc,
    filaLote: filaLote, csv: csv, json: json, bajar: bajar,
    el: el, chip: chip, chipTipo: chipTipo, zona: zona, resaltar: resaltar, marcasReglas: marcasReglas, pintarFicha: pintarFicha, miniatura: miniatura,
    sheetjs: sheetjs, pdfjs: pdfjs,
  };
})();
