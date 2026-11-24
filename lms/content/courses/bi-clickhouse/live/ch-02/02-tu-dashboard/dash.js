/* Tu dashboard de ventas (escena 02-tu-dashboard de ch-02).
   1) Lee el archivo en el navegador: CSV propio, Excel con SheetJS, PDF con pdf.js, Word con mammoth
      (las tres librerías están fijadas en live/_comun y se cargan solo si hacen falta).
   2) Arma un perfil (< 8 KB) y lo manda a POST /api/v1/live/<lección>/escenario: DeepSeek, con la
      clave de la clase, propone el rol de cada columna y reglas de limpieza (formato en escenario.json).
      Sin IA hay reglas automáticas con la misma forma.
   3) Aplica solo las reglas que el alumno acepta, muestra el cuadre de filas y venta antes y después,
      y pinta el dashboard con SVG propio.
   4) Exporta un .html autosuficiente y un .sql para ClickHouse. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var COMUN = "../../comun/";
  var ESCENA = "02-tu-dashboard";
  var ROLES = ["fecha", "sede", "categoria", "producto", "cantidad", "venta", "costo", "margen", "ticket", "ignorar"];
  var ROL_TXT = { fecha: "Fecha", sede: "Sede", categoria: "Categoría", producto: "Producto", cantidad: "Cantidad", venta: "Venta (S/)", costo: "Costo (S/)", margen: "Margen (%)", ticket: "N.º de ticket", ignorar: "Ignorar" };
  var TIPOS = ["recortar_espacios", "unificar", "convertir_fecha", "convertir_numero", "quitar_duplicados", "descartar_vacios"];
  var MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  var MESES_L = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

  var T = null;          // {archivo, cab, filas}
  var roles = {};        // nombre de columna → rol
  var reglas = [];       // {tipo, columna, de, a, motivo, gravedad, on, afecta, origen}
  var limpio = null;     // filas tras aplicar
  var registros = [];    // filas del dashboard
  var filtro = { sede: "", cat: "", desde: "", hasta: "" };

  /* ---------- utilidades ---------- */
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function soles(n, dec) {
    if (n == null || !isFinite(n)) return "—";
    var s = Math.abs(n).toFixed(dec || 0).split(".");
    s[0] = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    return (n < 0 ? "−" : "") + "S/ " + s.join(",");
  }
  function entero(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " "); }
  function corto(n) {
    var a = Math.abs(n);
    if (a >= 1e6) return (n / 1e6).toFixed(a >= 1e7 ? 1 : 2).replace(".", ",") + " M";
    if (a >= 1e3) return Math.round(n / 1e3) + " k";
    return String(Math.round(n));
  }
  function pct(x, dec) { return x == null || !isFinite(x) ? "—" : (x * 100).toFixed(dec == null ? 1 : dec).replace(".", ",") + " %"; }
  function limpiarTxt(v) { return String(v == null ? "" : v).replace(/\s+/g, " ").trim(); }
  function sinTildes(s) { return s.normalize("NFD").replace(/[̀-ͯ]/g, ""); }
  function clave(v) { return sinTildes(limpiarTxt(v).toLowerCase()); }
  function vacio(v) { return v == null || limpiarTxt(v) === ""; }
  function estado(id, txt, tipo) { var e = $(id); e.textContent = txt || ""; e.className = "estado" + (tipo ? " " + tipo : ""); }
  function mesTxt(m) { var p = m.split("-"); return MESES[+p[1] - 1] + " " + p[0].slice(2); }

  var cargas = {};
  function cargar(nombre) {
    if (!cargas[nombre]) cargas[nombre] = new Promise(function (ok, mal) {
      var s = document.createElement("script");
      s.src = COMUN + nombre;
      s.onload = ok;
      s.onerror = function () { delete cargas[nombre]; mal(new Error("No se pudo cargar " + nombre + ".")); };
      document.head.appendChild(s);
    });
    return cargas[nombre];
  }

  /* ---------- números y fechas ---------- */
  function num(v) {
    if (typeof v === "number") return isFinite(v) ? v : null;
    var s = String(v == null ? "" : v).trim();
    if (!s) return null;
    s = s.replace(/^(S\/\.?|US\$|\$|PEN|USD)\s*/i, "").replace(/\s/g, "");
    var esPct = /%$/.test(s);
    s = s.replace(/%$/, "");
    var p = s.indexOf(".") >= 0, c = s.indexOf(",") >= 0;
    if (p && c) s = s.lastIndexOf(",") > s.lastIndexOf(".") ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
    else if (c) {
      var partes = s.split(",");
      if (partes.length > 2) s = s.replace(/,/g, "");                                   // 1,234,567
      else if (partes[1].length === 3 && !/^-?0$/.test(partes[0])) s = s.replace(",", ""); // 1,234
      else s = s.replace(",", ".");                                                      // 12,50 · 0,258
    } else if (p && s.split(".").length > 2) s = s.replace(/\./g, "");                  // 1.234.567
    if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
    var n = parseFloat(s);
    return esPct ? n / 100 : n;
  }
  function dos(n) { return (n < 10 ? "0" : "") + n; }
  function isoDe(y, m, d) {
    y = +y; m = +m; d = +d;
    if (y < 100) y += 2000;
    if (!(m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 1990 && y <= 2100)) return null;
    var f = new Date(Date.UTC(y, m - 1, d));
    if (f.getUTCMonth() !== m - 1) return null;
    return y + "-" + dos(m) + "-" + dos(d);
  }
  function isoDeDate(dt) { var x = new Date(dt.getTime() + 12 * 3600e3); return isoDe(x.getFullYear(), x.getMonth() + 1, x.getDate()); }
  function fecha(v, formato) {
    if (v instanceof Date) return isNaN(v) ? null : isoDeDate(v);
    if (typeof v === "number") return null;
    var s = String(v == null ? "" : v).trim(), m;
    if ((m = s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})(?:[ T].*)?$/))) return isoDe(m[1], m[2], m[3]);
    if ((m = s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2}|\d{4})(?:[ T].*)?$/))) {
      var us = /^mm/i.test(formato || "");
      var a = +m[1], b = +m[2];
      if (!us && b > 12 && a <= 12) us = true;  // 03/25/2026 solo puede ser mes/día
      if (us && a > 12 && b <= 12) us = false;
      return us ? isoDe(m[3], a, b) : isoDe(m[3], b, a);
    }
    return null;
  }
  function formatoFecha(v) {
    if (v instanceof Date) return "fecha de Excel";
    var s = String(v == null ? "" : v).trim();
    if (/^\d{4}-\d{1,2}-\d{1,2}/.test(s)) return "aaaa-mm-dd";
    if (/^\d{4}\/\d{1,2}\/\d{1,2}/.test(s)) return "aaaa/mm/dd";
    if (/^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(s)) return "dd/mm/aaaa";
    if (/^\d{1,2}-\d{1,2}-\d{2,4}/.test(s)) return "dd-mm-aaaa";
    if (/^\d{1,2}\.\d{1,2}\.\d{2,4}/.test(s)) return "dd.mm.aaaa";
    return "otro";
  }

  /* ---------- lectura de archivos ---------- */
  function separarCabecera(filas) {
    filas = filas.filter(function (f) { return f && f.some(function (v) { return !vacio(v); }); });
    if (filas.length < 2) throw new Error("No encontré una tabla con al menos una fila de datos.");
    var ini = 0;
    for (var i = 0; i < Math.min(filas.length, 15); i++) {
      var llenas = filas[i].filter(function (v) { return !vacio(v); });
      var textos = llenas.filter(function (v) { return typeof v === "string" && num(v) === null && fecha(v) === null; });
      if (llenas.length >= 2 && textos.length >= llenas.length * 0.7) { ini = i; break; }
    }
    var cab = filas[ini].map(function (v, j) { return limpiarTxt(v) || "columna_" + (j + 1); });
    var vistos = {};
    cab = cab.map(function (c) { var k = c.toLowerCase(); if (vistos[k]) { vistos[k]++; return c + "_" + vistos[k]; } vistos[k] = 1; return c; });
    var n = cab.length, cabK = cab.map(clave).join("|");
    var datos = filas.slice(ini + 1).filter(function (f) {
      return f.length >= Math.ceil(n * 0.6) && f.map(clave).slice(0, n).join("|") !== cabK; // cabeceras repetidas por página
    }).map(function (f) { var r = f.slice(0, n); while (r.length < n) r.push(""); return r; });
    if (!datos.length) throw new Error("Encontré la cabecera, pero no filas de datos debajo.");
    return { cab: cab, filas: datos };
  }

  function tablaDeCSV(t) {
    t = t.replace(/^﻿/, "");
    var primera = t.split(/\r?\n/, 1)[0];
    var sep = [",", ";", "\t", "|"].map(function (s) { return [s, primera.split(s).length]; }).sort(function (a, b) { return b[1] - a[1]; })[0][0];
    var filas = [], fila = [], campo = "", q = false;
    for (var i = 0; i < t.length; i++) {
      var c = t[i];
      if (q) {
        if (c === '"') { if (t[i + 1] === '"') { campo += '"'; i++; } else q = false; }
        else campo += c;
      } else if (c === '"' && campo === "") q = true;
      else if (c === sep) { fila.push(campo); campo = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && t[i + 1] === "\n") i++;
        fila.push(campo); filas.push(fila); fila = []; campo = "";
      } else campo += c;
    }
    if (campo !== "" || fila.length) { fila.push(campo); filas.push(fila); }
    return separarCabecera(filas);
  }

  function tablaDeExcel(buf) {
    var wb = window.XLSX.read(buf, { type: "array", cellDates: true });
    var mejor = null;
    wb.SheetNames.forEach(function (n) {
      var a = window.XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: true, defval: "" });
      if (!mejor || a.length > mejor.length) mejor = a;
    });
    if (!mejor) throw new Error("El Excel no tiene hojas con datos.");
    return separarCabecera(mejor.map(function (f) { return f.map(function (v) { return v instanceof Date ? (isoDeDate(v) || "") : v; }); }));
  }

  function tablaDePDF(buf) {
    var pdfjs = window.pdfjsLib;
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(COMUN + "pdf.worker.min.js", location.href).href;
    return pdfjs.getDocument({ data: new Uint8Array(buf), isEvalSupported: false }).promise.then(function (doc) {
      var lineas = [], paginas = Math.min(doc.numPages, 80), p = 0;
      function siguiente() {
        p++;
        if (p > paginas) return Promise.resolve();
        return doc.getPage(p).then(function (pg) { return pg.getTextContent(); }).then(function (tc) {
          var items = tc.items.filter(function (it) { return it.str && it.str.trim(); })
            .map(function (it) { return { x: it.transform[4], y: it.transform[5], w: it.width || 0, s: it.str.trim() }; });
          var grupos = [];
          items.forEach(function (it) {
            var g = null;
            for (var k = 0; k < grupos.length; k++) if (Math.abs(grupos[k].y - it.y) < 3) { g = grupos[k]; break; }
            if (!g) { g = { y: it.y, items: [] }; grupos.push(g); }
            g.items.push(it);
          });
          grupos.sort(function (a, b) { return b.y - a.y; }).forEach(function (g) {
            g.items.sort(function (a, b) { return a.x - b.x; });
            var celdas = [], ult = null;
            g.items.forEach(function (it) {
              if (ult && it.x - (ult.x + ult.w) < 4) { var c = celdas[celdas.length - 1]; c.s += (it.x - (ult.x + ult.w) < 0.8 ? "" : " ") + it.s; c.x2 = it.x + it.w; } // < 0,8 pt: misma palabra partida (ligaduras «fl», «fi»)
              else celdas.push({ s: it.s, x: it.x, x2: it.x + it.w });
              ult = it;
            });
            lineas.push(celdas);
          });
          return siguiente();
        });
      }
      return siguiente().then(function () {
        // La cabecera: la línea más frecuente en número de celdas, la primera de ellas.
        var veces = {};
        lineas.forEach(function (l) { if (l.length >= 2) veces[l.length] = (veces[l.length] || 0) + 1; });
        var moda = 0, max = 0;
        Object.keys(veces).forEach(function (k) { if (veces[k] > max || (veces[k] === max && +k > moda)) { max = veces[k]; moda = +k; } });
        if (!moda || max < 2) throw new Error("No encontré una tabla en el PDF. Si es un PDF escaneado (una foto), no tiene texto que leer.");
        var completas = lineas.filter(function (l) { return l.length === moda; });
        // Centro de cada columna, medido en las filas completas; luego cada celda va a la columna más cercana,
        // así una fila con una celda vacía (sin texto en el PDF) no se pierde ni se corre de columna.
        var centros = [];
        for (var c = 0; c < moda; c++) {
          var xs = completas.map(function (l) { return (l[c].x + l[c].x2) / 2; }).sort(function (a, b) { return a - b; });
          centros.push(xs[Math.floor(xs.length / 2)]);
        }
        var filas = lineas.filter(function (l) { return l.length >= Math.max(2, Math.ceil(moda * 0.6)) && l.length <= moda; }).map(function (l) {
          if (l.length === moda) return l.map(function (x) { return x.s; });
          var fila = []; for (var k = 0; k < moda; k++) fila.push("");
          l.forEach(function (x) {
            var m = (x.x + x.x2) / 2, mejor = 0;
            centros.forEach(function (cx, k) { if (Math.abs(cx - m) < Math.abs(centros[mejor] - m)) mejor = k; });
            fila[mejor] = fila[mejor] ? fila[mejor] + " " + x.s : x.s;
          });
          return fila;
        });
        return separarCabecera(filas);
      });
    });
  }

  function tablaDeWord(buf) {
    return window.mammoth.convertToHtml({ arrayBuffer: buf }).then(function (r) {
      var d = new DOMParser().parseFromString(r.value, "text/html");
      var tablas = Array.prototype.slice.call(d.querySelectorAll("table"));
      if (!tablas.length) throw new Error("El Word no tiene ninguna tabla. Pon tus ventas en una tabla de Word o usa Excel.");
      var t = tablas.sort(function (a, b) { return b.rows.length - a.rows.length; })[0];
      var filas = Array.prototype.map.call(t.rows, function (tr) { return Array.prototype.map.call(tr.cells, function (td) { return td.textContent.replace(/\s+/g, " ").trim(); }); });
      return separarCabecera(filas);
    });
  }

  function leerArchivo(f) {
    var ext = (f.name.split(".").pop() || "").toLowerCase();
    if (f.size > 25 * 1024 * 1024) return Promise.reject(new Error("El archivo pasa de 25 MB. Guarda solo la hoja de ventas o divídelo por año."));
    if (ext === "accdb" || ext === "mdb") return Promise.reject(new Error("Access no se lee en el navegador: exporta la tabla a Excel o CSV (Datos externos › Exportar) y adjunta ese archivo."));
    if (ext === "doc") return Promise.reject(new Error("Es un Word antiguo (.doc). Ábrelo y guárdalo como .docx."));
    if (["csv", "txt", "tsv"].indexOf(ext) >= 0) return f.text().then(tablaDeCSV);
    if (["xlsx", "xls", "xlsm", "ods"].indexOf(ext) >= 0) return cargar("xlsx.full.min.js").then(function () { return f.arrayBuffer(); }).then(tablaDeExcel);
    if (ext === "pdf") return cargar("pdf.min.js").then(function () { return f.arrayBuffer(); }).then(tablaDePDF);
    if (ext === "docx") return cargar("mammoth.browser.min.js").then(function () { return f.arrayBuffer(); }).then(tablaDeWord);
    return Promise.reject(new Error("No reconozco la extensión ." + ext + ". Usa .xlsx, .csv, .pdf o .docx."));
  }

  /* ---------- perfil del archivo ---------- */
  function tipoColumna(vals) {
    var llenos = vals.filter(function (v) { return !vacio(v); });
    if (!llenos.length) return "vacía";
    var f = llenos.filter(function (v) { return typeof v !== "number" && fecha(v) !== null; }).length;
    var n = llenos.filter(function (v) { return num(v) !== null; }).length;
    if (f >= llenos.length * 0.8) return "fecha";
    if (n >= llenos.length * 0.8) return "número";
    return "texto";
  }
  function columnaIdx(nombre) {
    if (!T) return -1;
    var i = T.cab.indexOf(nombre);
    if (i >= 0) return i;
    var k = clave(nombre);
    for (var j = 0; j < T.cab.length; j++) if (clave(T.cab[j]) === k) return j;
    return -1;
  }
  function duplicados(filas) {
    var vistos = new Set(), n = 0;
    filas.forEach(function (f) { var k = JSON.stringify(f); if (vistos.has(k)) n++; else vistos.add(k); });
    return n;
  }
  function perfil(t) {
    function armar(topN, ejemplos) {
      return {
        archivo: t.archivo, filas: t.filas.length, duplicados: duplicados(t.filas),
        columnas: t.cab.map(function (nombre, j) {
          var vals = t.filas.map(function (f) { return f[j]; });
          var tipo = tipoColumna(vals), llenos = vals.filter(function (v) { return !vacio(v); });
          var c = { nombre: nombre, tipo: tipo, vacios: vals.length - llenos.length, distintos: new Set(llenos.map(String)).size };
          if (tipo === "texto") {
            var cuenta = {};
            llenos.forEach(function (v) { var s = String(v).slice(0, 40); cuenta[s] = (cuenta[s] || 0) + 1; });
            c.valores = {};
            Object.keys(cuenta).sort(function (a, b) { return cuenta[b] - cuenta[a]; }).slice(0, topN).forEach(function (k) { c.valores[k] = cuenta[k]; });
          } else if (tipo === "fecha") {
            c.formatos = {};
            llenos.forEach(function (v) { var k = formatoFecha(v); c.formatos[k] = (c.formatos[k] || 0) + 1; });
          } else if (tipo === "número") {
            var ns = llenos.map(num).filter(function (x) { return x !== null; });
            c.min = Math.round(Math.min.apply(null, ns) * 100) / 100;
            c.max = Math.round(Math.max.apply(null, ns) * 100) / 100;
            var comoTexto = llenos.filter(function (v) { return typeof v === "string" && !/^-?\d+(\.\d+)?$/.test(v.trim()); }).length;
            if (comoTexto) c.formatos = { "texto con comas, S/ o %": comoTexto };
          }
          return c;
        }),
        ejemplo: t.filas.slice(0, ejemplos).map(function (f) { return f.map(function (v) { return String(v).slice(0, 30); }); })
      };
    }
    var intentos = [[20, 4], [12, 4], [8, 3], [5, 2], [3, 0]];
    for (var i = 0; i < intentos.length; i++) {
      var p = armar(intentos[i][0], intentos[i][1]);
      if (JSON.stringify(p).length < 7600) return p;
    }
    p = armar(2, 0);
    p.columnas = p.columnas.slice(0, 25);
    return p;
  }

  /* ---------- roles y reglas automáticas ---------- */
  var PATRONES = [
    ["fecha", /fecha|date|d[ií]a\b|periodo/i], ["margen", /margen|margin|rentab/i], ["costo", /costo|cost/i],
    ["ticket", /ticket|boleta|comprobante|factura|transacc|n[uú]mero de doc|serie/i],
    ["sede", /sede|tienda|local|sucursal|botica|farmacia|branch|store|punto de venta/i],
    ["categoria", /categor|l[ií]nea|familia|rubro|grupo|clase/i],
    ["producto", /producto|art[ií]culo|item|descrip|sku|c[oó]digo/i],
    ["cantidad", /unidad|cantidad|cant\b|qty|und\b|piezas/i],
    ["venta", /venta|importe|total|monto|ingreso|sales|valor|facturado/i]
  ];
  function rolesLocales() {
    var r = {}, usados = {};
    var tipos = T.cab.map(function (c, j) { return tipoColumna(T.filas.map(function (f) { return f[j]; })); });
    T.cab.forEach(function (c, j) {
      var rol = "ignorar";
      for (var k = 0; k < PATRONES.length; k++) if (PATRONES[k][1].test(c) && !usados[PATRONES[k][0]]) { rol = PATRONES[k][0]; break; }
      if (rol === "fecha" && tipos[j] !== "fecha") rol = "ignorar";
      if (["cantidad", "venta", "costo", "margen"].indexOf(rol) >= 0 && tipos[j] !== "número") rol = "ignorar";
      if (rol !== "ignorar") usados[rol] = true;
      r[c] = rol;
    });
    T.cab.forEach(function (c, j) { if (r[c] === "ignorar" && tipos[j] === "fecha" && !usados.fecha) { r[c] = "fecha"; usados.fecha = true; } });
    return r;
  }
  function reglasLocales() {
    var out = [];
    T.cab.forEach(function (c, j) {
      var vals = T.filas.map(function (f) { return f[j]; }), tipo = tipoColumna(vals);
      if (tipo === "texto") {
        if (vals.some(function (v) { return typeof v === "string" && v !== limpiarTxt(v); }))
          out.push({ tipo: "recortar_espacios", columna: c, motivo: "Hay valores con espacios al inicio o al final", gravedad: "media" });
        var grupos = {};
        vals.forEach(function (v) { if (vacio(v)) return; var k = clave(v), s = limpiarTxt(v); grupos[k] = grupos[k] || {}; grupos[k][s] = (grupos[k][s] || 0) + 1; });
        if (Object.keys(grupos).length <= 500) Object.keys(grupos).forEach(function (k) {
          var formas = Object.keys(grupos[k]);
          if (formas.length < 2) return;
          formas.sort(function (a, b) { return grupos[k][b] - grupos[k][a]; });
          formas.slice(1).forEach(function (f) { out.push({ tipo: "unificar", columna: c, de: f, a: formas[0], motivo: "Es la misma " + (ROL_TXT[roles[c]] || c).toLowerCase() + " escrita distinto; partiría los totales", gravedad: "alta" }); });
        });
      } else if (tipo === "fecha") {
        var fs = {};
        vals.forEach(function (v) { if (!vacio(v)) fs[formatoFecha(v)] = 1; });
        var otros = Object.keys(fs).filter(function (k) { return k !== "aaaa-mm-dd"; });
        if (otros.length) out.push({ tipo: "convertir_fecha", columna: c, de: otros[0] === "fecha de Excel" ? "dd/mm/aaaa" : otros[0], a: "aaaa-mm-dd", motivo: "Fechas en " + (Object.keys(fs).length) + " formatos; los meses saldrían incompletos", gravedad: "alta" });
      } else if (tipo === "número") {
        if (vals.some(function (v) { return typeof v === "string" && v.trim() && !/^-?\d+(\.\d+)?$/.test(v.trim()); }))
          out.push({ tipo: "convertir_numero", columna: c, motivo: "Montos escritos como texto (comas, S/ o %)", gravedad: "alta" });
      }
    });
    var d = duplicados(T.filas);
    if (d) out.push({ tipo: "quitar_duplicados", columna: "*", motivo: d + " filas repetidas inflarían la venta", gravedad: "alta" });
    var iv = T.cab.filter(function (c) { return roles[c] === "venta"; })[0];
    if (iv) {
      var j = columnaIdx(iv), nv = T.filas.filter(function (f) { return vacio(f[j]); }).length;
      if (nv) out.push({ tipo: "descartar_vacios", columna: iv, motivo: nv + " filas sin venta no aportan al dashboard", gravedad: "media" });
    }
    return out;
  }
  function ordenar(lista) {
    return lista.sort(function (a, b) { return TIPOS.indexOf(a.tipo) - TIPOS.indexOf(b.tipo); });
  }

  /* ---------- aplicar reglas ---------- */
  function aplicar(soloMedir) {
    var filas = T.filas.map(function (f) { return f.slice(); });
    reglas.forEach(function (r) {
      var n = 0, j = r.columna === "*" ? -1 : columnaIdx(r.columna);
      r.valida = r.columna === "*" ? r.tipo === "quitar_duplicados" || r.tipo === "recortar_espacios" : j >= 0;
      if (r.tipo === "unificar" && (vacio(r.de) || vacio(r.a))) r.valida = false;
      if (!r.valida) { r.afecta = 0; return; }
      if (!r.on) {
        r.afecta = null; return;
      }
      if (r.tipo === "recortar_espacios") {
        var cols = j >= 0 ? [j] : T.cab.map(function (c, k) { return k; });
        filas.forEach(function (f) { cols.forEach(function (k) { if (typeof f[k] === "string") { var v = limpiarTxt(f[k]); if (v !== f[k]) { f[k] = v; n++; } } }); });
      } else if (r.tipo === "unificar") {
        var de = limpiarTxt(r.de), a = limpiarTxt(r.a);
        filas.forEach(function (f) { if (typeof f[j] === "string" && limpiarTxt(f[j]) === de && f[j] !== a) { f[j] = a; n++; } });
      } else if (r.tipo === "convertir_fecha") {
        filas.forEach(function (f) { var v = fecha(f[j], r.de); if (v && v !== f[j]) { f[j] = v; n++; } });
      } else if (r.tipo === "convertir_numero") {
        filas.forEach(function (f) { var v = num(f[j]); if (v !== null && v !== f[j]) { f[j] = v; n++; } });
      } else if (r.tipo === "quitar_duplicados") {
        var vistos = new Set();
        filas = filas.filter(function (f) { var k = JSON.stringify(f); if (vistos.has(k)) { n++; return false; } vistos.add(k); return true; });
      } else if (r.tipo === "descartar_vacios") {
        filas = filas.filter(function (f) { if (vacio(f[j])) { n++; return false; } return true; });
      }
      r.afecta = n;
    });
    if (!soloMedir) limpio = filas;
    return filas;
  }
  function ventaTotal(filas) {
    var iv = Object.keys(roles).filter(function (c) { return roles[c] === "venta"; })[0];
    if (!iv) return null;
    var j = columnaIdx(iv), s = 0;
    filas.forEach(function (f) { var v = num(f[j]); if (v !== null) s += v; });
    return s;
  }

  /* ---------- pintar paso 1 ---------- */
  function pintarVista() {
    var tb = $("vista");
    tb.textContent = "";
    var tr = el("tr");
    T.cab.forEach(function (c) { tr.appendChild(el("th", "", c)); });
    tb.appendChild(tr);
    T.filas.slice(0, 6).forEach(function (f) {
      var r = el("tr");
      f.forEach(function (v) {
        var s = v == null ? "" : String(v);
        var td = el("td", s !== s.trim() ? "esp" : "", s);
        if (s !== s.trim()) td.title = "Tiene espacios al inicio o al final";
        r.appendChild(td);
      });
      tb.appendChild(r);
    });
    $("vistaWrap").hidden = false;
  }
  function cargarTabla(t, archivo) {
    T = { archivo: archivo, cab: t.cab, filas: t.filas };
    roles = rolesLocales();
    reglas = []; limpio = null;
    pintarVista();
    estado("estado1", "Leí " + entero(T.filas.length) + " filas y " + T.cab.length + " columnas de «" + archivo + "». Mira las primeras filas y sigue al paso 2.", "bien");
    $("p2").classList.remove("bloqueado");
    ["p3", "p4"].forEach(function (id) { $(id).classList.add("bloqueado"); });
    $("propuesta").hidden = true;
    estado("estado2", "");
  }
  function abrir(f) {
    if (!f) return;
    estado("estado1", "Leyendo «" + f.name + "»…");
    $("estado1").classList.add("cargando");
    leerArchivo(f).then(function (t) { $("estado1").classList.remove("cargando"); cargarTabla(t, f.name); })
      .catch(function (e) { $("estado1").classList.remove("cargando"); estado("estado1", e.message || "No pude leer el archivo.", "mal"); });
  }

  /* ---------- paso 2: roles y reglas ---------- */
  function pintarPropuesta() {
    var cont = $("roles");
    cont.textContent = "";
    T.cab.forEach(function (c) {
      var fila = el("label", "rol");
      var nom = el("code", "", c); nom.title = c;
      var sel = el("select");
      sel.setAttribute("aria-label", "Rol de la columna " + c);
      ROLES.forEach(function (r) { var o = el("option", "", ROL_TXT[r]); o.value = r; sel.appendChild(o); });
      sel.value = roles[c] || "ignorar";
      sel.addEventListener("change", function () {
        if (sel.value !== "ignorar") Object.keys(roles).forEach(function (k) { if (k !== c && roles[k] === sel.value) roles[k] = "ignorar"; });
        roles[c] = sel.value;
        pintarPropuesta();
      });
      fila.appendChild(nom); fila.appendChild(sel);
      cont.appendChild(fila);
    });
    aplicar(true);
    var lista = $("reglas");
    lista.textContent = "";
    if (!reglas.length) lista.appendChild(el("p", "vacio", "No hay nada que limpiar: tu archivo ya viene ordenado."));
    reglas.forEach(function (r, i) {
      var caja = el("label", "regla" + (r.on && r.valida ? "" : " off"));
      var cb = el("input"); cb.type = "checkbox"; cb.checked = !!r.on && r.valida; cb.disabled = !r.valida;
      cb.setAttribute("aria-label", "Aceptar regla " + (i + 1));
      cb.addEventListener("change", function () { r.on = cb.checked; pintarPropuesta(); });
      var cuerpo = el("div");
      var q = el("div", "q");
      q.appendChild(el("span", "chip " + (r.gravedad || "media"), r.gravedad || "media"));
      q.appendChild(document.createTextNode(describir(r)));
      cuerpo.appendChild(q);
      cuerpo.appendChild(el("div", "m", (r.valida ? "" : "No se puede aplicar: la columna no existe o falta el valor. ") + (r.motivo || "") + (r.origen === "ia" ? " · propuesta por la IA" : "")));
      var af = el("span", "af", r.afecta == null ? "—" : entero(r.afecta) + (r.tipo === "quitar_duplicados" || r.tipo === "descartar_vacios" ? " filas" : " cambios"));
      caja.appendChild(cb); caja.appendChild(cuerpo); caja.appendChild(af);
      lista.appendChild(caja);
    });
    var acept = reglas.filter(function (r) { return r.on && r.valida; }).length;
    $("cuentaReglas").textContent = "· " + acept + " de " + reglas.length + " aceptadas";
    var despues = aplicar(true), v0 = ventaTotal(T.filas), v1 = ventaTotal(despues);
    var cu = $("cuadre");
    cu.textContent = "";
    [["Filas antes", entero(T.filas.length)], ["Filas después", entero(despues.length)], ["Venta antes", soles(v0, 2)], ["Venta después", soles(v1, 2)]].forEach(function (p) {
      var d = el("div"); d.appendChild(el("small", "", p[0])); d.appendChild(el("b", "", p[1])); cu.appendChild(d);
    });
    $("propuesta").hidden = false;
    $("aplicar").disabled = !Object.keys(roles).some(function (k) { return roles[k] === "venta"; });
    if ($("aplicar").disabled) estado("estado2", "Marca qué columna es la venta (en soles) para poder armar el dashboard.", "mal");
  }
  function describir(r) {
    var col = r.columna === "*" ? "todas las columnas" : "«" + r.columna + "»";
    switch (r.tipo) {
      case "recortar_espacios": return "Quitar espacios sobrantes en " + col;
      case "unificar": return "En " + col + ": «" + limpiarTxt(r.de) + "» → «" + limpiarTxt(r.a) + "»";
      case "convertir_fecha": return "Fechas de " + col + " de " + (r.de || "dd/mm/aaaa") + " a aaaa-mm-dd";
      case "convertir_numero": return "Convertir " + col + " a número";
      case "quitar_duplicados": return "Quitar filas repetidas";
      case "descartar_vacios": return "Descartar filas sin valor en " + col;
    }
    return r.tipo;
  }
  function usarLocales(msg) {
    reglas = ordenar(reglasLocales().map(function (r) { r.on = true; r.origen = "auto"; return r; }));
    pintarPropuesta();
    estado("estado2", msg || ("Reglas automáticas: " + reglas.length + ". Revísalas una por una."), msg ? "mal" : "bien");
  }
  function pedirIA() {
    var btn = $("pedirIA");
    btn.disabled = true;
    estado("estado2", "DeepSeek está leyendo el perfil de tu archivo…");
    $("estado2").classList.add("cargando");
    var muestra = perfil(T);
    CC.pedir("/escenario", {
      escena: ESCENA,
      pedido: ("Propón el rol de cada columna y las reglas de limpieza para el dashboard de ventas del archivo " + T.archivo).slice(0, 290),
      empresa: { razon: "Laboratorio de dashboards", rubro: "ventas minoristas", regimen: "limpieza de datos" },
      muestra: muestra
    }).then(function (r) {
      btn.disabled = false;
      $("estado2").classList.remove("cargando");
      var esc = r.ok && r.datos && r.datos.escenario;
      if (!esc || !esc.tablas) {
        var msg = r.status === 429 ? "Llegaste al tope de hoy de la IA de la clase." : r.status === 503 ? "La IA de la clase no está disponible para tu grupo." : r.status === 0 ? "Sin conexión con el LMS." : "La IA no respondió bien.";
        usarLocales(msg + " Te muestro las reglas automáticas; revísalas igual.");
        return;
      }
      var cols = esc.tablas.Columnas || [], rs = esc.tablas.Reglas || [];
      var nuevos = {};
      cols.forEach(function (f) {
        if (!Array.isArray(f)) return;
        var j = columnaIdx(String(f[0] || "")), rol = String(f[1] || "").toLowerCase();
        if (j >= 0 && ROLES.indexOf(rol) >= 0) nuevos[T.cab[j]] = rol;
      });
      var usados = {};
      T.cab.forEach(function (c) {
        var rol = nuevos[c] || roles[c] || "ignorar";
        if (rol !== "ignorar" && usados[rol]) rol = "ignorar";
        if (rol !== "ignorar") usados[rol] = true;
        roles[c] = rol;
      });
      if (!T.cab.some(function (c) { return roles[c] === "venta"; })) {
        // La IA no reconoció la venta: se completa con lo que detectan los nombres de columna.
        var loc = rolesLocales(), usados2 = {};
        T.cab.forEach(function (c) { if (roles[c] !== "ignorar") usados2[roles[c]] = true; });
        T.cab.forEach(function (c) { if (roles[c] === "ignorar" && loc[c] !== "ignorar" && !usados2[loc[c]]) { roles[c] = loc[c]; usados2[loc[c]] = true; } });
      }
      reglas = ordenar(rs.filter(Array.isArray).map(function (f) {
        return { tipo: String(f[0] || ""), columna: String(f[1] || ""), de: f[2] == null ? "" : String(f[2]), a: f[3] == null ? "" : String(f[3]), motivo: String(f[4] || "").slice(0, 160), gravedad: ["alta", "media", "baja"].indexOf(f[5]) >= 0 ? f[5] : "media", on: true, origen: "ia" };
      }).filter(function (r) { return TIPOS.indexOf(r.tipo) >= 0; }));
      if (esc.titulo) estado("estado2", "IA: " + esc.titulo + (esc.nota ? " — " + esc.nota : ""), "bien");
      else estado("estado2", "La IA propuso " + reglas.length + " reglas. Acepta solo las que tengan sentido.", "bien");
      pintarPropuesta();
    });
  }

  /* ---------- paso 3: dashboard ---------- */
  function armarRegistros() {
    var j = {};
    Object.keys(roles).forEach(function (c) { if (roles[c] !== "ignorar") j[roles[c]] = columnaIdx(c); });
    var sinFecha = 0;
    registros = limpio.map(function (f) {
      var r = { f: j.fecha != null ? fecha(f[j.fecha]) : null };
      if (j.fecha != null && !r.f) sinFecha++;
      r.mes = r.f ? r.f.slice(0, 7) : "";
      r.sede = j.sede != null ? (limpiarTxt(f[j.sede]) || "(sin sede)") : "Todas";
      r.cat = j.categoria != null ? (limpiarTxt(f[j.categoria]) || "(sin categoría)") : "Todas";
      r.prod = j.producto != null ? limpiarTxt(f[j.producto]) : "";
      r.cant = j.cantidad != null ? num(f[j.cantidad]) : null;
      r.venta = num(f[j.venta]);
      r.costo = j.costo != null ? num(f[j.costo]) : null;
      var m = j.margen != null ? num(f[j.margen]) : null;
      if (m !== null && Math.abs(m) > 1.5) m = m / 100;
      if (m === null && r.costo !== null && r.venta) m = (r.venta - r.costo) / r.venta;
      r.m = m;
      r.ticket = j.ticket != null ? limpiarTxt(f[j.ticket]) : "";
      return r;
    }).filter(function (r) { return r.venta !== null; });
    registros.sinFecha = sinFecha;
    registros.hay = j;
  }
  function opciones(sel, valores, todas) {
    var actual = sel.value;
    sel.textContent = "";
    if (todas) { var o = el("option", "", todas); o.value = ""; sel.appendChild(o); }
    valores.forEach(function (v) { var o = el("option", "", v[1]); o.value = v[0]; sel.appendChild(o); });
    if (valores.some(function (v) { return v[0] === actual; }) || actual === "") sel.value = actual;
  }
  function unicos(campo) {
    var s = {};
    registros.forEach(function (r) { s[r[campo]] = (s[r[campo]] || 0) + r.venta; });
    return Object.keys(s).sort(function (a, b) { return s[b] - s[a]; });
  }
  function meses() { var s = {}; registros.forEach(function (r) { if (r.mes) s[r.mes] = 1; }); return Object.keys(s).sort(); }
  function prepararFiltros() {
    opciones($("fSede"), unicos("sede").map(function (v) { return [v, v]; }), "Todas");
    opciones($("fCat"), unicos("cat").map(function (v) { return [v, v]; }), "Todas");
    var ms = meses().map(function (m) { return [m, mesTxt(m)]; });
    opciones($("fDesde"), ms, ms.length ? null : "—");
    opciones($("fHasta"), ms, ms.length ? null : "—");
    if (ms.length) { $("fDesde").value = filtro.desde || ms[0][0]; $("fHasta").value = filtro.hasta || ms[ms.length - 1][0]; }
    $("fSede").disabled = !registros.hay.sede; $("fCat").disabled = registros.hay.categoria == null;
    $("fDesde").disabled = $("fHasta").disabled = !ms.length;
  }
  function filtrados(ignorarMes, sinSede, sinCat) {
    return registros.filter(function (r) {
      if (!sinSede && filtro.sede && r.sede !== filtro.sede) return false;
      if (!sinCat && filtro.cat && r.cat !== filtro.cat) return false;
      if (!ignorarMes && r.mes) {
        if (filtro.desde && r.mes < filtro.desde) return false;
        if (filtro.hasta && r.mes > filtro.hasta) return false;
      }
      return true;
    });
  }
  function sumaPor(rs, campo) {
    var s = {};
    rs.forEach(function (r) {
      var k = r[campo];
      if (!s[k]) s[k] = { k: k, v: 0, vm: 0, mm: 0 };
      s[k].v += r.venta;
      if (r.m !== null) { s[k].vm += r.venta; s[k].mm += r.venta * r.m; }
    });
    return Object.keys(s).map(function (k) { return s[k]; });
  }
  function kpi(titulo, valor, detalle, clase) {
    var d = el("div", "kpi");
    d.appendChild(el("small", "", titulo));
    d.appendChild(el("span", "v", valor));
    d.appendChild(el("span", "d" + (clase ? " " + clase : ""), detalle));
    return d;
  }
  function caidas(rs) {
    var ms = meses().filter(function (m) { return (!filtro.desde || m >= filtro.desde) && (!filtro.hasta || m <= filtro.hasta); });
    if (ms.length < 2) return null;
    var ult = ms[ms.length - 1], ant = ms[ms.length - 2];
    function porMes(campo) {
      var s = {};
      rs.forEach(function (r) {
        if (r.mes !== ult && r.mes !== ant) return;
        var k = campo ? r[campo] : "total";
        s[k] = s[k] || { a: 0, u: 0 };
        if (r.mes === ult) s[k].u += r.venta; else s[k].a += r.venta;
      });
      return s;
    }
    var lista = [];
    [["", "Venta total"], ["sede", "sede"], ["cat", "categoría"]].forEach(function (p) {
      if (p[0] === "sede" && !registros.hay.sede) return;
      if (p[0] === "cat" && registros.hay.categoria == null) return;
      var s = porMes(p[0]);
      Object.keys(s).forEach(function (k) {
        var x = s[k];
        if (x.a > 0 && (x.u - x.a) / x.a <= -0.10) lista.push({ quien: p[0] ? p[1] + " " + k : p[1], cambio: (x.u - x.a) / x.a, a: x.a, u: x.u });
      });
    });
    lista.sort(function (a, b) { return a.cambio - b.cambio; });
    return { ult: ult, ant: ant, lista: lista };
  }

  /* SVG propio: barras con base en cero y etiquetas directas, sin leyenda */
  var NS = "http://www.w3.org/2000/svg";
  function svg(w, h) { var s = document.createElementNS(NS, "svg"); s.setAttribute("viewBox", "0 0 " + w + " " + h); s.setAttribute("role", "img"); return s; }
  function sv(tag, attrs, txt) { var e = document.createElementNS(NS, tag); Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); }); if (txt != null) e.textContent = txt; return e; }
  function barrasMes(datos, resaltar, ancho0) {
    var W = Math.max(300, ancho0 || 900), H = W < 600 ? 200 : 230, top = 22, base = H - 26, n = datos.length;
    var s = svg(W, H), max = Math.max.apply(null, datos.map(function (d) { return d.v; }).concat([1]));
    s.setAttribute("aria-label", "Ventas por mes: " + datos.map(function (d) { return mesTxt(d.k) + " " + soles(d.v); }).join(", "));
    s.appendChild(sv("line", { x1: 0, x2: W, y1: base, y2: base, class: "linea" }));
    var paso = W / Math.max(n, 1), ancho = Math.min(64, paso * 0.62), chico = paso < 44;
    datos.forEach(function (d, i) {
      var h = Math.max(1, (d.v / max) * (base - top)), x = i * paso + (paso - ancho) / 2;
      var b = sv("rect", { x: x, y: base - h, width: ancho, height: h, rx: 5, class: "b" + (d.k === resaltar.ult ? (resaltar.cayo ? " mal" : " hi") : "") });
      b.appendChild(sv("title", {}, mesTxt(d.k) + ": " + soles(d.v)));
      s.appendChild(b);
      if (!chico || d.k === resaltar.ult || i === 0) s.appendChild(sv("text", { x: x + ancho / 2, y: base - h - 6, "text-anchor": "middle", class: "val" }, corto(d.v)));
      s.appendChild(sv("text", { x: x + ancho / 2, y: H - 8, "text-anchor": "middle", class: "eje" }, chico ? MESES[+d.k.slice(5) - 1].charAt(0).toUpperCase() : mesTxt(d.k)));
    });
    return s;
  }
  function barrasH(datos, opc) {
    opc = opc || {};
    var W = Math.max(280, opc.ancho || 520), fila = 30, H = Math.max(1, datos.length) * fila + 6, izq = Math.min(150, Math.round(W * 0.3)), der = opc.margen ? Math.min(150, Math.round(W * 0.36)) : 64;
    var s = svg(W, H), max = Math.max.apply(null, datos.map(function (d) { return d.v; }).concat([1]));
    s.setAttribute("aria-label", datos.map(function (d) { return d.k + " " + soles(d.v); }).join(", "));
    datos.forEach(function (d, i) {
      var y = i * fila + 4, w = Math.max(2, (d.v / max) * (W - izq - der));
      var g = sv("g", { class: opc.clic ? "cl" : "" });
      g.appendChild(sv("text", { x: izq - 10, y: y + 16, "text-anchor": "end", class: "eje" }, d.k.length > Math.floor(izq / 7) ? d.k.slice(0, Math.floor(izq / 7) - 1) + "…" : d.k));
      var b = sv("rect", { x: izq, y: y + 3, width: w, height: fila - 12, rx: 4, class: "b" + (opc.activo && opc.activo === d.k ? " hi" : (!opc.activo && i === 0 ? " hi" : "")) });
      b.appendChild(sv("title", {}, d.k + ": " + soles(d.v)));
      g.appendChild(b);
      var txt = corto(d.v) + (opc.margen && d.vm ? (W < 420 ? " · " : " · margen ") + pct(d.mm / d.vm, 1) : "");
      g.appendChild(sv("text", { x: izq + w + 8, y: y + 16, class: "val" }, txt));
      if (opc.clic) {
        g.setAttribute("tabindex", "0");
        g.setAttribute("role", "button");
        g.setAttribute("aria-label", "Filtrar por " + d.k);
        g.addEventListener("click", function () { opc.clic(d.k); });
        g.addEventListener("keydown", function (ev) { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); opc.clic(d.k); } });
      }
      s.appendChild(g);
    });
    return s;
  }
  function pintarDashboard() {
    var rs = filtrados(false), rsTodo = filtrados(true);
    var venta = 0, vm = 0, mm = 0, cant = 0, tickets = new Set(), sinM = 0;
    rs.forEach(function (r) {
      venta += r.venta;
      if (r.m !== null) { vm += r.venta; mm += r.venta * r.m; } else sinM++;
      if (r.cant !== null) cant += r.cant;
      if (r.ticket) tickets.add(r.ticket);
    });
    var hay = registros.hay, k = $("kpis");
    k.textContent = "";
    var cd = caidas(rsTodo);
    var porMes = sumaPor(rs.filter(function (r) { return r.mes; }), "mes").sort(function (a, b) { return a.k < b.k ? -1 : 1; });
    var det = rs.length + " registros";
    if (porMes.length >= 2) {
      var u = porMes[porMes.length - 1], a = porMes[porMes.length - 2], c = a.v ? (u.v - a.v) / a.v : 0;
      det = (c >= 0 ? "▲ " : "▼ ") + pct(Math.abs(c), 1) + " " + mesTxt(u.k) + " vs " + mesTxt(a.k);
      k.appendChild(kpi("Venta total", soles(venta), det, c <= -0.1 ? "baja" : c > 0 ? "sube" : ""));
    } else k.appendChild(kpi("Venta total", soles(venta), det));
    if (hay.ticket != null && tickets.size) k.appendChild(kpi("Ticket promedio", soles(venta / tickets.size, 2), "venta ÷ " + entero(tickets.size) + " tickets"));
    else k.appendChild(kpi("Ticket promedio", soles(rs.length ? venta / rs.length : 0, 2), "venta ÷ " + entero(rs.length) + " filas (sin columna de ticket)"));
    k.appendChild(kpi("Margen", vm ? pct(mm / vm, 1) : "—", vm ? soles(mm) + " de ganancia" + (sinM ? " · " + entero(sinM) + " filas sin margen" : "") : "Tu archivo no trae margen ni costo"));
    k.appendChild(kpi(hay.cantidad != null ? "Unidades" : "Registros", entero(hay.cantidad != null ? cant : rs.length), hay.cantidad != null && cant ? soles(venta / cant, 2) + " por unidad" : "filas en el periodo"));

    var al = $("alerta");
    al.textContent = "";
    if (cd) {
      var caja = el("div", "alerta " + (cd.lista.length ? "mal" : "bien"));
      if (cd.lista.length) {
        caja.appendChild(el("b", "", "Alerta de caída: " + cd.lista.length + (cd.lista.length === 1 ? " baja" : " bajas") + " de 10 % o más en " + MESES_L[+cd.ult.slice(5) - 1] + " frente a " + MESES_L[+cd.ant.slice(5) - 1]));
        cd.lista.slice(0, 4).forEach(function (x) { caja.appendChild(el("span", "", x.quien + ": " + soles(x.a) + " → " + soles(x.u) + " (" + pct(x.cambio, 1) + ")")); });
      } else caja.appendChild(el("b", "", "Sin caídas de 10 % o más en " + MESES_L[+cd.ult.slice(5) - 1] + " frente a " + MESES_L[+cd.ant.slice(5) - 1] + "."));
      al.appendChild(caja);
    }
    var gm = $("gMes"); gm.textContent = "";
    if (porMes.length) gm.appendChild(barrasMes(porMes, { ult: porMes[porMes.length - 1].k, cayo: !!(cd && cd.lista.some(function (x) { return x.quien === "Venta total"; })) }, gm.clientWidth));
    else gm.appendChild(el("p", "vacio", "Tu archivo no trae una columna de fecha válida."));
    $("gMesSub").textContent = registros.sinFecha ? "S/ por mes · " + entero(registros.sinFecha) + " filas sin fecha válida no entran aquí" : "S/ por mes · el último mes, resaltado";

    var gs = $("gSede"); gs.textContent = "";
    if (hay.sede != null) gs.appendChild(barrasH(sumaPor(filtrados(false, true, false), "sede").sort(function (a, b) { return b.v - a.v; }), { ancho: gs.clientWidth, margen: true, activo: filtro.sede, clic: function (v) { filtro.sede = filtro.sede === v ? "" : v; $("fSede").value = filtro.sede; pintarDashboard(); } }));
    else gs.appendChild(el("p", "vacio", "Tu archivo no trae sede."));
    var gc = $("gCat"); gc.textContent = "";
    if (hay.categoria != null) gc.appendChild(barrasH(sumaPor(filtrados(false, false, true), "cat").sort(function (a, b) { return b.v - a.v; }), { ancho: gc.clientWidth, margen: false, activo: filtro.cat, clic: function (v) { filtro.cat = filtro.cat === v ? "" : v; $("fCat").value = filtro.cat; pintarDashboard(); } }));
    else gc.appendChild(el("p", "vacio", "Tu archivo no trae categoría."));
    var gt = $("gTop"); gt.textContent = "";
    if (hay.producto != null) {
      $("gTopT").textContent = "Productos más vendidos"; $("gTopSub").textContent = "Los 10 de mayor venta en el periodo";
      gt.appendChild(barrasH(sumaPor(rs.filter(function (r) { return r.prod; }), "prod").sort(function (a, b) { return b.v - a.v; }).slice(0, 10), { ancho: gt.clientWidth, margen: true }));
    } else {
      $("gTopT").textContent = "Productos más vendidos"; $("gTopSub").textContent = "Tu archivo no trae una columna de producto. Si la tuviera, aquí verías los 10 de mayor venta.";
    }
  }
  function verDashboard() {
    aplicar(false);
    armarRegistros();
    if (!registros.length) { estado("estado2", "Ninguna fila tiene una venta numérica. Revisa qué columna marcaste como venta.", "mal"); return; }
    filtro = { sede: "", cat: "", desde: "", hasta: "" };
    prepararFiltros();
    pintarDashboard();
    $("p3").classList.remove("bloqueado");
    $("p4").classList.remove("bloqueado");
    $("createSQL").textContent = sqlCreate();
    $("createSQL").hidden = false;
    var acept = reglas.filter(function (r) { return r.on && r.valida; }).length;
    CC.evidencia("hallazgo", "Dashboard de «" + T.archivo + "»: " + limpio.length + " filas, " + soles(ventaTotal(limpio), 2) + ", " + acept + " de " + reglas.length + " reglas aceptadas", ESCENA);
    $("p3").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  }

  /* ---------- paso 4: exportar ---------- */
  function bajar(nombre, texto, tipo) {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([texto], { type: tipo }));
    a.download = nombre;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  function escHTML(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function exportarHTML() {
    var css = "body{margin:0;background:#f5f5f7;color:#1d1d1f;font:15px/1.47 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}" +
      ".pag{max-width:1100px;margin:0 auto;padding:28px 24px 40px}h1{font-size:34px;letter-spacing:-.02em;margin:0 0 4px}p.s{color:#6e6e73;margin:0 0 18px}" +
      ".kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.kpi{background:#fff;border-radius:14px;padding:14px 16px}.kpi small{display:block;color:#6e6e73;font-size:12.5px}" +
      ".kpi .v{display:block;font-size:28px;font-weight:700;letter-spacing:-.02em;font-variant-numeric:tabular-nums}.kpi .d{font-size:12.5px;color:#6e6e73}.kpi .d.baja{color:#c4001a}.kpi .d.sube{color:#1d7d36}" +
      ".alerta{margin:14px 0 0;border-radius:14px;padding:12px 16px;display:grid;gap:4px}.alerta.mal{background:rgba(215,0,21,.08);border-left:4px solid #c4001a}.alerta.bien{background:rgba(36,138,61,.1);border-left:4px solid #1d7d36}" +
      ".graficos{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:14px}.graf{background:#fff;border-radius:14px;padding:14px 16px}.graf.ancho{grid-column:1/-1}.graf h3{margin:0 0 2px;font-size:15px}.graf p{margin:0 0 8px;color:#6e6e73;font-size:12.5px}" +
      "svg{display:block;width:100%;height:auto;overflow:visible}svg text{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;fill:#1d1d1f}.eje{font-size:11px;fill:#6e6e73}.val{font-size:11px;font-weight:600}" +
      ".b{fill:#9cc3f0}.b.hi{fill:#0071e3}.b.mal{fill:#c4001a}.linea{stroke:rgba(0,0,0,.14)}table{border-collapse:collapse;width:100%;font-size:13px;background:#fff;border-radius:14px;overflow:hidden;margin-top:14px}" +
      "td,th{padding:7px 12px;border-bottom:1px solid rgba(0,0,0,.08);text-align:left}th{color:#6e6e73;font-weight:600}.pie{color:#6e6e73;font-size:12px;margin-top:18px}" +
      "@media(max-width:800px){.kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.graficos{grid-template-columns:1fr}}";
    var f = [];
    if (filtro.sede) f.push("sede " + filtro.sede);
    if (filtro.cat) f.push("categoría " + filtro.cat);
    if (filtro.desde) f.push("de " + mesTxt(filtro.desde) + " a " + mesTxt(filtro.hasta));
    var acept = reglas.filter(function (r) { return r.on && r.valida; });
    var filasReglas = acept.map(function (r) { return "<tr><td>" + escHTML(describir(r)) + "</td><td>" + escHTML(entero(r.afecta || 0)) + "</td></tr>"; }).join("");
    function bloque(id) { var g = $(id).querySelector("svg"); return g ? g.outerHTML : "<p>" + escHTML($(id).textContent) + "</p>"; }
    var hoy = new Date();
    var html = "<!doctype html><html lang=\"es\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">" +
      "<title>Dashboard de ventas · " + escHTML(T.archivo) + "</title><style>" + css + "</style></head><body><div class=\"pag\">" +
      "<h1>Dashboard de ventas</h1><p class=\"s\">" + escHTML(T.archivo) + " · " + escHTML(f.length ? f.join(" · ") : "todos los datos") + " · generado el " + hoy.getDate() + " de " + MESES_L[hoy.getMonth()] + " de " + hoy.getFullYear() + "</p>" +
      "<div class=\"kpis\">" + $("kpis").innerHTML + "</div>" + $("alerta").innerHTML +
      "<div class=\"graficos\"><div class=\"graf ancho\"><h3>Ventas por mes</h3><p>" + escHTML($("gMesSub").textContent) + "</p>" + bloque("gMes") + "</div>" +
      "<div class=\"graf\"><h3>Venta por sede</h3><p>S/ y margen de cada sede</p>" + bloque("gSede") + "</div>" +
      "<div class=\"graf\"><h3>Venta por categoría</h3><p>S/ de cada categoría</p>" + bloque("gCat") + "</div>" +
      (registros.hay.producto != null ? "<div class=\"graf ancho\"><h3>Productos más vendidos</h3><p>Los 10 de mayor venta</p>" + bloque("gTop") + "</div>" : "") + "</div>" +
      "<table><tr><th>Regla de limpieza aplicada</th><th>Cambios</th></tr>" + (filasReglas || "<tr><td>Ninguna</td><td>0</td></tr>") +
      "<tr><th>Cuadre</th><th></th></tr><tr><td>Filas: " + entero(T.filas.length) + " antes → " + entero(limpio.length) + " después</td><td></td></tr>" +
      "<tr><td>Venta: " + escHTML(soles(ventaTotal(T.filas), 2)) + " antes → " + escHTML(soles(ventaTotal(limpio), 2)) + " después</td><td></td></tr></table>" +
      "<p class=\"pie\">Hecho en JMD Learning · Dashboards y BI con IA. Este archivo no necesita internet.</p></div></body></html>";
    bajar("dashboard-ventas.html", html, "text/html;charset=utf-8");
  }
  function sqlStr(s) { return "'" + String(s).replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'"; }
  function columnasSQL() {
    var h = registros.hay, cols = [];
    var fechaNula = registros.some(function (r) { return !r.f; });
    if (h.fecha != null) cols.push(["fecha", fechaNula ? "Nullable(Date)" : "Date", function (r) { return r.f ? sqlStr(r.f) : "NULL"; }]);
    if (h.sede != null) cols.push(["sede", "LowCardinality(String)", function (r) { return sqlStr(r.sede); }]);
    if (h.categoria != null) cols.push(["categoria", "LowCardinality(String)", function (r) { return sqlStr(r.cat); }]);
    if (h.producto != null) cols.push(["producto", "String", function (r) { return sqlStr(r.prod); }]);
    if (h.ticket != null) cols.push(["ticket", "String", function (r) { return sqlStr(r.ticket); }]);
    if (h.cantidad != null) cols.push(["cantidad", "Nullable(Float64)", function (r) { return r.cant === null ? "NULL" : String(r.cant); }]);
    cols.push(["venta", "Decimal(14, 2)", function (r) { return r.venta.toFixed(2); }]);
    if (h.margen != null || h.costo != null) cols.push(["margen", "Nullable(Float64)", function (r) { return r.m === null ? "NULL" : String(Math.round(r.m * 1e6) / 1e6); }]);
    return { cols: cols, orden: h.fecha != null && !fechaNula ? (h.sede != null ? "(fecha, sede)" : "fecha") : "tuple()" };
  }
  function sqlCreate() {
    var c = columnasSQL();
    return "CREATE TABLE ventas_dashboard\n(\n" + c.cols.map(function (x) { return "    " + x[0] + " " + x[1]; }).join(",\n") + "\n)\nENGINE = MergeTree\nORDER BY " + c.orden + ";";
  }
  function exportarSQL() {
    var c = columnasSQL(), partes = [];
    var total = registros.reduce(function (s, r) { return s + Math.round(r.venta * 100); }, 0) / 100;
    partes.push("-- Dashboard de ventas · " + T.archivo.replace(/[\r\n]/g, " "));
    partes.push("-- " + registros.length + " filas limpias · venta total " + total.toFixed(2));
    partes.push("-- Cárgalo en tu ClickHouse de Docker (Windows, Mac o Linux):");
    partes.push("--   docker cp ventas-dashboard.sql ch-taller:/tmp/");
    partes.push("--   docker exec ch-taller clickhouse-client --user taller --password taller123 --queries-file /tmp/ventas-dashboard.sql");
    partes.push("-- Ojo: vuelve a crear la tabla ventas_dashboard y la vista ventas_mes_mv (no toca tu tabla ventas de la sesión 1).");
    partes.push("");
    partes.push("DROP VIEW IF EXISTS ventas_mes_mv;");
    partes.push("DROP TABLE IF EXISTS ventas_mes;");
    partes.push("DROP TABLE IF EXISTS ventas_dashboard;");
    partes.push(sqlCreate());
    for (var i = 0; i < registros.length; i += 1000) {
      partes.push("INSERT INTO ventas_dashboard (" + c.cols.map(function (x) { return x[0]; }).join(", ") + ") VALUES\n" +
        registros.slice(i, i + 1000).map(function (r) { return "(" + c.cols.map(function (x) { return x[2](r); }).join(", ") + ")"; }).join(",\n") + ";");
    }
    partes.push("");
    partes.push("-- Comprobación: debe dar " + registros.length + " filas y " + total.toFixed(2) + " de venta, igual que tu dashboard.");
    partes.push("SELECT count() AS filas, sum(venta) AS venta_total FROM ventas_dashboard;");
    if (registros.hay.fecha != null) {
      var porSede = registros.hay.sede != null;
      partes.push("");
      partes.push("-- Resumen por mes" + (porSede ? " y sede" : "") + " que se recalcula solo cada hora (vista materializada refrescable).");
      partes.push("CREATE TABLE ventas_mes\n(\n    mes Date,\n" + (porSede ? "    sede LowCardinality(String),\n" : "") + "    venta Decimal(18, 2)\n)\nENGINE = MergeTree\nORDER BY " + (porSede ? "(mes, sede)" : "mes") + ";");
      partes.push("CREATE MATERIALIZED VIEW ventas_mes_mv\nREFRESH EVERY 1 HOUR TO ventas_mes AS\nSELECT toStartOfMonth(fecha) AS mes," + (porSede ? " sede," : "") + " sum(venta) AS venta\nFROM ventas_dashboard\n" + (c.orden === "tuple()" ? "WHERE fecha IS NOT NULL\n" : "") + "GROUP BY mes" + (porSede ? ", sede" : "") + ";");
      partes.push("SYSTEM REFRESH VIEW ventas_mes_mv;");
    }
    bajar("ventas-dashboard.sql", partes.join("\n") + "\n", "application/sql;charset=utf-8");
  }

  /* ---------- eventos ---------- */
  var tRes = 0, anchoPrevio = window.innerWidth;
  window.addEventListener("resize", function () {
    clearTimeout(tRes);
    tRes = setTimeout(function () { if (registros.length && limpio && window.innerWidth !== anchoPrevio) { anchoPrevio = window.innerWidth; pintarDashboard(); } }, 200);
  });
  var zona = $("zona"), inp = $("archivo");
  zona.addEventListener("click", function () { inp.click(); });
  zona.addEventListener("keydown", function (ev) { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); inp.click(); } });
  zona.addEventListener("dragover", function (ev) { ev.preventDefault(); zona.classList.add("encima"); });
  zona.addEventListener("dragleave", function () { zona.classList.remove("encima"); });
  zona.addEventListener("drop", function (ev) { ev.preventDefault(); zona.classList.remove("encima"); abrir(ev.dataTransfer.files[0]); });
  inp.addEventListener("change", function () { abrir(inp.files[0]); inp.value = ""; });
  $("ejemplo").addEventListener("click", function () {
    estado("estado1", "Cargando el ejemplo…");
    fetch(COMUN + "ventas-ejemplo.json", { credentials: "same-origin" }).then(function (r) { if (!r.ok) throw new Error(); return r.json(); })
      .then(function (d) { cargarTabla({ cab: d.cabecera, filas: d.filas }, d.archivo); })
      .catch(function () { estado("estado1", "No pude cargar el ejemplo.", "mal"); });
  });
  $("pedirIA").addEventListener("click", pedirIA);
  $("pedirLocal").addEventListener("click", function () { roles = rolesLocales(); usarLocales(); });
  $("aplicar").addEventListener("click", verDashboard);
  ["fSede", "fCat", "fDesde", "fHasta"].forEach(function (id) {
    $(id).addEventListener("change", function () {
      filtro = { sede: $("fSede").value, cat: $("fCat").value, desde: $("fDesde").value, hasta: $("fHasta").value };
      if (filtro.desde && filtro.hasta && filtro.desde > filtro.hasta) { filtro.hasta = filtro.desde; $("fHasta").value = filtro.desde; }
      pintarDashboard();
    });
  });
  $("fLimpiar").addEventListener("click", function () { filtro = { sede: "", cat: "", desde: "", hasta: "" }; prepararFiltros(); filtro.desde = $("fDesde").value; filtro.hasta = $("fHasta").value; pintarDashboard(); });
  $("bajarHTML").addEventListener("click", exportarHTML);
  $("bajarSQL").addEventListener("click", exportarSQL);
  $("copiarCreate").addEventListener("click", function () {
    CC.copiar(sqlCreate()).then(function (ok) { var b = $("copiarCreate"); b.textContent = ok ? "✓ Copiado" : "No se pudo copiar"; setTimeout(function () { b.textContent = "Copiar CREATE TABLE"; }, 1500); });
  });

  // Para las pruebas automáticas (no se usa en clase).
  window.__dash = { tabla: function () { return T; }, perfil: function () { return T && perfil(T); }, estado: function () { return { meses: meses().join(" "), filas: T && T.filas.length, limpio: limpio && limpio.length, venta: limpio && ventaTotal(limpio), reglas: reglas.length, roles: roles }; } };
})();
