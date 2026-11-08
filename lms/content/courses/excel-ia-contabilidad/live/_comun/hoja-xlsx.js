/* Hoja JMD · exportar a .xlsx (Office Open XML) sin librerías: ZIP sin compresión + XML.
   Las fórmulas se guardan en inglés con coma (así las guarda Excel) y Excel las muestra en el idioma del usuario.
   Se guarda también el último valor calculado y se pide recalcular al abrir. */
(function (raiz, fabrica) {
  if (typeof module === "object" && module.exports) module.exports = fabrica(require("./hoja-motor.js"));
  else raiz.HojaXlsx = fabrica(raiz.HojaMotor);
})(typeof self !== "undefined" ? self : this, function (M) {
  "use strict";

  // ---------------------------------------------------------------- ZIP (método «stored»)
  var TABLA_CRC = (function () {
    var t = new Uint32Array(256);
    for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
    return t;
  })();
  function crc32(b) { var c = 0xffffffff; for (var i = 0; i < b.length; i++) c = TABLA_CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
  function utf8(s) { return new TextEncoder().encode(s); }
  function zip(archivos) {
    var partes = [], central = [], off = 0;
    var hora = (12 << 11), fecha = ((2026 - 1980) << 9) | (11 << 5) | 1;
    archivos.forEach(function (a) {
      var nombre = utf8(a.nombre), datos = typeof a.datos === "string" ? utf8(a.datos) : a.datos, crc = crc32(datos);
      var lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true);
      lh.setUint16(10, hora, true); lh.setUint16(12, fecha, true); lh.setUint32(14, crc, true);
      lh.setUint32(18, datos.length, true); lh.setUint32(22, datos.length, true); lh.setUint16(26, nombre.length, true); lh.setUint16(28, 0, true);
      partes.push(new Uint8Array(lh.buffer), nombre, datos);
      var ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true);
      ch.setUint16(12, hora, true); ch.setUint16(14, fecha, true); ch.setUint32(16, crc, true); ch.setUint32(20, datos.length, true); ch.setUint32(24, datos.length, true);
      ch.setUint16(28, nombre.length, true); ch.setUint32(42, off, true);
      central.push(new Uint8Array(ch.buffer), nombre);
      off += 30 + nombre.length + datos.length;
    });
    var tamCentral = central.reduce(function (s, x) { return s + x.length; }, 0);
    var fin = new DataView(new ArrayBuffer(22));
    fin.setUint32(0, 0x06054b50, true); fin.setUint16(8, archivos.length, true); fin.setUint16(10, archivos.length, true);
    fin.setUint32(12, tamCentral, true); fin.setUint32(16, off, true);
    var todo = partes.concat(central, [new Uint8Array(fin.buffer)]), largo = todo.reduce(function (s, x) { return s + x.length; }, 0);
    var out = new Uint8Array(largo), p = 0;
    todo.forEach(function (x) { out.set(x, p); p += x.length; });
    return out;
  }

  // ---------------------------------------------------------------- XML
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, ""); }
  var ERR_EN = { "#¡DIV/0!": "#DIV/0!", "#¡VALOR!": "#VALUE!", "#¡REF!": "#REF!", "#¿NOMBRE?": "#NAME?", "#N/D": "#N/A", "#¡NUM!": "#NUM!", "#¡NULO!": "#NULL!" };
  var FMT_INTEGRADO = { "0": 1, "0.00": 2, "#,##0": 3, "#,##0.00": 4, "0%": 9, "0.00%": 10 };

  function estilosXml(libro) {
    var fuentes = ['<font><sz val="11"/><name val="Calibri"/><family val="2"/></font>'], fk = { "": 0 };
    var rellenos = ['<fill><patternFill patternType="none"/></fill>', '<fill><patternFill patternType="gray125"/></fill>'], rk = { "": 0 };
    var formatos = [], fmk = {};
    var xfs = ['<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'], mapa = {};
    libro.estilos.forEach(function (e, i) {
      var fuente = "<font>" + (e.b ? '<b/>' : "") + (e.i ? '<i/>' : "") + '<sz val="' + (e.sz || 11) + '"/>' + (e.c ? '<color rgb="FF' + e.c + '"/>' : "") + '<name val="Calibri"/><family val="2"/></font>';
      var kf = (e.b ? "b" : "") + (e.i ? "i" : "") + (e.sz || "") + (e.c || "");
      if (!(kf in fk)) { fk[kf] = fuentes.length; fuentes.push(fuente); }
      var kr = e.bg || "";
      if (!(kr in rk)) { rk[kr] = rellenos.length; rellenos.push('<fill><patternFill patternType="solid"><fgColor rgb="FF' + kr + '"/><bgColor indexed="64"/></patternFill></fill>'); }
      var idFmt = 0;
      if (e.f) {
        if (FMT_INTEGRADO[e.f] !== undefined) idFmt = FMT_INTEGRADO[e.f];
        else { if (!(e.f in fmk)) { fmk[e.f] = 164 + formatos.length; formatos.push('<numFmt numFmtId="' + fmk[e.f] + '" formatCode="' + esc(e.f) + '"/>'); } idFmt = fmk[e.f]; }
      }
      var al = e.h || e.wr ? '<alignment' + (e.h ? ' horizontal="' + esc(e.h) + '"' : "") + (e.wr ? ' wrapText="1" vertical="top"' : "") + '/>' : "";
      mapa[i] = xfs.length;
      xfs.push('<xf numFmtId="' + idFmt + '" fontId="' + fk[kf] + '" fillId="' + rk[kr] + '" borderId="' + (e.bd ? 1 : 0) + '" xfId="0"' +
        (idFmt ? ' applyNumberFormat="1"' : "") + (fk[kf] ? ' applyFont="1"' : "") + (rk[kr] ? ' applyFill="1"' : "") + (e.bd ? ' applyBorder="1"' : "") +
        (al ? ' applyAlignment="1">' + al + "</xf>" : "/>"));
    });
    var linea = '<color rgb="FFC9D3E0"/>';
    var xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      (formatos.length ? '<numFmts count="' + formatos.length + '">' + formatos.join("") + "</numFmts>" : "") +
      '<fonts count="' + fuentes.length + '">' + fuentes.join("") + "</fonts>" +
      '<fills count="' + rellenos.length + '">' + rellenos.join("") + "</fills>" +
      '<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin">' + linea + '</left><right style="thin">' + linea +
      '</right><top style="thin">' + linea + '</top><bottom style="thin">' + linea + "</bottom><diagonal/></border></borders>" +
      '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
      '<cellXfs count="' + xfs.length + '">' + xfs.join("") + "</cellXfs>" +
      '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
    return { xml: xml, mapa: mapa };
  }

  function hojaXml(libro, h, mapa) {
    var filas = {};
    Object.keys(h.celdas).forEach(function (ref) {
      var p = M.partir(ref);
      if (p) (filas[p.f] = filas[p.f] || []).push({ ref: ref, c: p.c, celda: h.celdas[ref] });
    });
    var cols = "";
    var letras = Object.keys(h.w || {}).sort(function (a, b) { return M.colNum(a) - M.colNum(b); });
    if (letras.length) cols = "<cols>" + letras.map(function (l) { var n = M.colNum(l); return '<col min="' + n + '" max="' + n + '" width="' + h.w[l] + '" customWidth="1"/>'; }).join("") + "</cols>";
    var vista = '<sheetView workbookViewId="0" showGridLines="1"';
    if (h.fz && (h.fz[0] || h.fz[1])) {
      var tl = M.dir((h.fz[0] || 0) + 1, (h.fz[1] || 0) + 1);
      vista += '><pane' + (h.fz[0] ? ' xSplit="' + h.fz[0] + '"' : "") + (h.fz[1] ? ' ySplit="' + h.fz[1] + '"' : "") + ' topLeftCell="' + tl + '" activePane="' +
        (h.fz[0] && h.fz[1] ? "bottomRight" : h.fz[1] ? "bottomLeft" : "topRight") + '" state="frozen"/></sheetView>';
    } else vista += "/>";
    var datos = Object.keys(filas).map(Number).sort(function (a, b) { return a - b; }).map(function (f) {
      return '<row r="' + f + '">' + filas[f].sort(function (a, b) { return a.c - b.c; }).map(function (x) {
        var c = x.celda, s = mapa[c.s] || 0, at = ' r="' + x.ref + '"' + (s ? ' s="' + s + '"' : "");
        var e = c.e;
        if (e === null || e === undefined || e === "") return "<c" + at + "/>";
        if (typeof e === "string" && e.charAt(0) === "=") {
          var v = libro.valor(h, x.ref), f;
          try { f = M.formulaEN(e); } catch (er) { f = null; }
          if (f === null) return "<c" + at + ' t="inlineStr"><is><t xml:space="preserve">' + esc("'" + e) + "</t></is></c>";
          var fx = "<f>" + esc(f) + "</f>";
          if (M.esErr(v)) return "<c" + at + ' t="e">' + fx + "<v>" + esc(ERR_EN[v.err] || "#VALUE!") + "</v></c>";
          if (typeof v === "boolean") return "<c" + at + ' t="b">' + fx + "<v>" + (v ? 1 : 0) + "</v></c>";
          if (typeof v === "string") return "<c" + at + ' t="str">' + fx + "<v>" + esc(v) + "</v></c>";
          return "<c" + at + ">" + fx + "<v>" + (typeof v === "number" && isFinite(v) ? v : 0) + "</v></c>";
        }
        if (typeof e === "number") return "<c" + at + "><v>" + e + "</v></c>";
        if (typeof e === "boolean") return "<c" + at + ' t="b"><v>' + (e ? 1 : 0) + "</v></c>";
        return "<c" + at + ' t="inlineStr"><is><t xml:space="preserve">' + esc(e) + "</t></is></c>";
      }).join("") + "</row>";
    }).join("");
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
      'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetViews>' + vista + "</sheetViews>" +
      '<sheetFormatPr defaultRowHeight="15"/>' + cols + "<sheetData>" + datos + "</sheetData>" +
      '<pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/></worksheet>';
  }

  function nombreHoja(n, usados) {
    var s = String(n).replace(/[\\\/?*\[\]:]/g, " ").slice(0, 31) || "Hoja";
    var base = s, k = 2;
    while (usados[s.toLowerCase()]) { s = base.slice(0, 28) + " " + k++; }
    usados[s.toLowerCase()] = true;
    return s;
  }

  // libro: HojaMotor.Libro. Devuelve los bytes del .xlsx.
  function exportar(libro, opciones) {
    opciones = opciones || {};
    libro.recalcular();
    var est = estilosXml(libro), usados = {};
    var hojas = libro.hojas.map(function (h, i) { return { h: h, nombre: nombreHoja(h.n, usados), n: i + 1 }; });
    var archivos = [];
    archivos.push({ nombre: "[Content_Types].xml", datos: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      hojas.map(function (x) { return '<Override PartName="/xl/worksheets/sheet' + x.n + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'; }).join("") +
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
      '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
      '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>' });
    archivos.push({ nombre: "_rels/.rels", datos: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
      '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>' +
      '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>' });
    var ahora = new Date().toISOString().replace(/\.\d+Z$/, "Z");
    archivos.push({ nombre: "docProps/core.xml", datos: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" ' +
      'xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
      "<dc:title>" + esc(opciones.titulo || "Hoja JMD") + "</dc:title><dc:creator>" + esc(opciones.autor || "Hoja JMD · JMD Learning (datos ficticios)") + "</dc:creator>" +
      '<dcterms:created xsi:type="dcterms:W3CDTF">' + ahora + '</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">' + ahora + "</dcterms:modified></cp:coreProperties>" });
    archivos.push({ nombre: "docProps/app.xml", datos: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Microsoft Excel</Application></Properties>' });
    var activa = Math.max(0, Math.min(hojas.length - 1, opciones.activa || 0));
    archivos.push({ nombre: "xl/workbook.xml", datos: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
      'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView activeTab="' + activa + '"/></bookViews><sheets>' +
      hojas.map(function (x) { return '<sheet name="' + esc(x.nombre) + '" sheetId="' + x.n + '" r:id="rId' + x.n + '"/>'; }).join("") +
      '</sheets><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>' });
    archivos.push({ nombre: "xl/_rels/workbook.xml.rels", datos: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      hojas.map(function (x) { return '<Relationship Id="rId' + x.n + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + x.n + '.xml"/>'; }).join("") +
      '<Relationship Id="rId' + (hojas.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>' });
    archivos.push({ nombre: "xl/styles.xml", datos: est.xml });
    hojas.forEach(function (x) { archivos.push({ nombre: "xl/worksheets/sheet" + x.n + ".xml", datos: hojaXml(libro, x.h, est.mapa) }); });
    return zip(archivos);
  }

  return { exportar: exportar, zip: zip, crc32: crc32 };
});
