/* Hoja JMD · motor de cálculo (sin interfaz). Lo usa hoja.js en el navegador y _fuente/probar_motor.mjs en Node.
   Fórmulas como Excel en español de Perú: SUMA, SUMAR.SI, SI, BUSCARX…, coma como separador de argumentos (también
   acepta punto y coma) y punto decimal. Las fechas son números de serie de Excel (1 = 01/01/1900), igual que en Excel.
   Sin librerías y sin red. */
(function (raiz, fabrica) {
  if (typeof module === "object" && module.exports) module.exports = fabrica();
  else raiz.HojaMotor = fabrica();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // ---------------------------------------------------------------- errores
  var E = { DIV: "#¡DIV/0!", VALOR: "#¡VALOR!", REF: "#¡REF!", NOMBRE: "#¿NOMBRE?", ND: "#N/D", NUM: "#¡NUM!", NULO: "#¡NULO!" };
  function Err(codigo, msg) { this.err = codigo; this.msg = msg || ""; }
  Err.prototype.toString = function () { return this.err; };
  function err(c, m) { return new Err(c, m); }
  function esErr(v) { return v instanceof Err; }
  var EXPLICA = {
    "#¡DIV/0!": "Divides entre cero o entre una celda vacía.",
    "#¡VALOR!": "Operas con un texto donde va un número (¿una celda con letras o un número con espacios?).",
    "#¡REF!": "La fórmula apunta a una celda que no existe o se apunta a sí misma (referencia circular).",
    "#¿NOMBRE?": "Excel no reconoce un nombre: revisa cómo escribiste la función o pon el texto entre comillas.",
    "#N/D": "La búsqueda no encontró el valor (BUSCARX, BUSCARV o COINCIDIR).",
    "#¡NUM!": "El número no es válido para esa función.",
    "#¡NULO!": "Falta una coma o dos puntos entre las referencias."
  };

  // ---------------------------------------------------------------- nombres de funciones (español ↔ inglés)
  var ES_EN = {
    "SUMA": "SUM", "SUMAR.SI": "SUMIF", "SUMAR.SI.CONJUNTO": "SUMIFS", "CONTAR": "COUNT", "CONTARA": "COUNTA", "CONTAR.BLANCO": "COUNTBLANK",
    "CONTAR.SI": "COUNTIF", "CONTAR.SI.CONJUNTO": "COUNTIFS", "SI": "IF", "SI.CONJUNTO": "_xlfn.IFS", "Y": "AND", "O": "OR", "NO": "NOT",
    "SI.ERROR": "IFERROR", "REDONDEAR": "ROUND", "REDONDEAR.MAS": "ROUNDUP", "REDONDEAR.MENOS": "ROUNDDOWN", "ENTERO": "INT", "ABS": "ABS",
    "BUSCARX": "_xlfn.XLOOKUP", "BUSCARV": "VLOOKUP", "COINCIDIR": "MATCH", "INDICE": "INDEX", "PROMEDIO": "AVERAGE", "PROMEDIO.SI": "AVERAGEIF",
    "PROMEDIO.SI.CONJUNTO": "AVERAGEIFS", "MAX": "MAX", "MIN": "MIN", "MAX.SI.CONJUNTO": "_xlfn.MAXIFS", "MIN.SI.CONJUNTO": "_xlfn.MINIFS",
    "FECHA": "DATE", "DIAS": "_xlfn.DAYS", "AÑO": "YEAR", "MES": "MONTH", "DIA": "DAY", "FIN.MES": "EOMONTH", "FECHA.MES": "EDATE",
    "SIFECHA": "DATEDIF", "HOY": "TODAY", "LARGO": "LEN", "CONCATENAR": "CONCATENATE", "CONCAT": "_xlfn.CONCAT", "IZQUIERDA": "LEFT",
    "DERECHA": "RIGHT", "EXTRAE": "MID", "MAYUSC": "UPPER", "MINUSC": "LOWER", "ESPACIOS": "TRIM", "RESIDUO": "MOD", "POTENCIA": "POWER",
    "SUMAPRODUCTO": "SUMPRODUCT", "ESBLANCO": "ISBLANK", "ESNUMERO": "ISNUMBER", "ESERROR": "ISERROR", "VALOR": "VALUE", "TEXTO": "TEXT"
  };
  var EN_ES = {};
  Object.keys(ES_EN).forEach(function (k) { EN_ES[ES_EN[k].replace(/^_xlfn\./, "")] = k; });
  EN_ES.DAYS = "DIAS"; EN_ES.IFS = "SI.CONJUNTO"; EN_ES.XLOOKUP = "BUSCARX";
  function sinTildes(s) { return String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
  // El alumno puede escribir sin tilde (ANO por AÑO no, pero DÍAS por DIAS sí): se normaliza al buscar.
  var ALIAS = { "DÍAS": "DIAS", "DÍA": "DIA", "ÍNDICE": "INDICE", "AÑO": "AÑO", "REDONDEAR.MÁS": "REDONDEAR.MAS" };

  // ---------------------------------------------------------------- direcciones
  function colNum(l) { var n = 0; for (var i = 0; i < l.length; i++) n = n * 26 + l.charCodeAt(i) - 64; return n; }
  function colLetras(n) { var s = ""; while (n > 0) { var r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = (n - 1 - r) / 26; } return s; }
  function partir(ref) { var m = /^\$?([A-Z]{1,3})\$?(\d+)$/.exec(ref); return m ? { c: colNum(m[1]), f: +m[2] } : null; }
  function dir(c, f) { return colLetras(c) + f; }

  // ---------------------------------------------------------------- fechas
  var DIA_MS = 86400000, BASE = Date.UTC(1899, 11, 30);
  function serial(a, m, d) { return Math.round((Date.UTC(a, m - 1, d) - BASE) / DIA_MS); }
  function deSerial(n) { var t = new Date(BASE + Math.floor(n) * DIA_MS); return { a: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() }; }
  function finDeMes(a, m) { return new Date(Date.UTC(a, m, 0)).getUTCDate(); }

  // ---------------------------------------------------------------- tokenizador
  // Tipos: num, str, bool, ref, rango, col (A:A), func, op, sep, ( ), err, nombre
  var RE_HOJA = "(?:'((?:[^']|'')+)'|([A-Za-zÁÉÍÓÚÑáéíóúñ_][A-Za-z0-9ÁÉÍÓÚÑáéíóúñ_.]*))!";
  var RE_CELDA = "\\$?[A-Za-z]{1,3}\\$?\\d+";
  var RE_TOKEN = new RegExp(
    "\\s+|" +
    "(\"(?:[^\"]|\"\")*\")|" +                                              // 1 texto
    "(" + "(?:" + RE_HOJA + ")?" + RE_CELDA + "(?::" + RE_CELDA + ")?" + ")(?![A-Za-z0-9_(.])|" + // 2 ref o rango (3,4 hoja)
    "(" + "(?:" + RE_HOJA + ")?" + "\\$?[A-Za-z]{1,3}:\\$?[A-Za-z]{1,3}" + ")(?![A-Za-z0-9_(.])|" + // 5 columnas enteras (6,7 hoja)
    "(\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?|\\.\\d+)|" +                         // 8 número
    "([A-Za-zÁÉÍÓÚÑáéíóúñ_][A-Za-z0-9ÁÉÍÓÚÑáéíóúñ_.]*)(\\s*\\()?|" +          // 9 nombre, 10 «(» de función
    "(#[¡¿]?[A-Za-z/0]+[!?]?)|" +                                           // 11 error literal
    "(<>|<=|>=|[-+*/^&=<>%])|" +                                            // 12 operador
    "([,;])|" +                                                             // 13 separador
    "([()])",                                                               // 14 paréntesis
    "gy");

  function tokenizar(txt) {
    var out = [], m;
    RE_TOKEN.lastIndex = 0;
    while (RE_TOKEN.lastIndex < txt.length) {
      var ini = RE_TOKEN.lastIndex;
      m = RE_TOKEN.exec(txt);
      if (!m) throw new SyntaxError("Hay un carácter que Excel no entiende: «" + txt.charAt(ini) + "».");
      var t = m[0];
      if (m[1] !== undefined) out.push({ t: "str", v: m[1].slice(1, -1).replace(/""/g, '"'), s: t, i: ini });
      else if (m[2] !== undefined) out.push({ t: m[2].indexOf(":") >= 0 ? "rango" : "ref", s: t, i: ini });
      else if (m[5] !== undefined) out.push({ t: "col", s: t, i: ini });
      else if (m[8] !== undefined) out.push({ t: "num", v: parseFloat(m[8]), s: t, i: ini });
      else if (m[9] !== undefined) {
        if (m[10] !== undefined) out.push({ t: "func", v: m[9].toUpperCase(), s: t, i: ini });
        else {
          var u = sinTildes(m[9]).toUpperCase();
          if (u === "VERDADERO" || u === "TRUE") out.push({ t: "bool", v: true, s: t, i: ini });
          else if (u === "FALSO" || u === "FALSE") out.push({ t: "bool", v: false, s: t, i: ini });
          else out.push({ t: "nombre", v: m[9], s: t, i: ini });
        }
      } else if (m[11] !== undefined) out.push({ t: "err", v: m[11], s: t, i: ini });
      else if (m[12] !== undefined) out.push({ t: "op", v: m[12], s: t, i: ini });
      else if (m[13] !== undefined) out.push({ t: "sep", s: t, i: ini });
      else if (m[14] !== undefined) out.push({ t: m[14], s: t, i: ini });
      else out.push({ t: "esp", s: t, i: ini });
    }
    return out;
  }

  // Referencia («Ventas!$H$5:$H$28») → {hoja, c1, f1, c2, f2, abs:[c1,f1,c2,f2]}
  function leerRef(s) {
    var hoja = null, resto = s, k = s.lastIndexOf("!");
    if (k >= 0) {
      hoja = s.slice(0, k);
      if (hoja.charAt(0) === "'") hoja = hoja.slice(1, -1).replace(/''/g, "'");
      resto = s.slice(k + 1);
    }
    var partes = resto.toUpperCase().split(":");
    var a = /^(\$?)([A-Z]{1,3})(\$?)(\d*)$/.exec(partes[0]), b = /^(\$?)([A-Z]{1,3})(\$?)(\d*)$/.exec(partes[1] || partes[0]);
    if (!a || !b) return null;
    var r = { hoja: hoja, c1: colNum(a[2]), f1: a[4] ? +a[4] : 1, c2: colNum(b[2]), f2: b[4] ? +b[4] : 1048576,
      abs: [!!a[1], !!a[3], !!b[1], !!b[3]], columnas: !a[4] };
    if (r.c1 > r.c2) { var x = r.c1; r.c1 = r.c2; r.c2 = x; }
    if (r.f1 > r.f2) { var y = r.f1; r.f1 = r.f2; r.f2 = y; }
    return r;
  }

  // ---------------------------------------------------------------- analizador (precedencia de Excel)
  function analizar(formula) {
    var txt = formula.charAt(0) === "=" ? formula.slice(1) : formula;
    var toks = tokenizar(txt).filter(function (t) { return t.t !== "esp"; });
    var i = 0;
    function ver() { return toks[i]; }
    function tomar() { return toks[i++]; }
    function esOp(v) { var t = ver(); return t && t.t === "op" && v.indexOf(t.v) >= 0; }
    function comparacion() {
      var n = concatenacion();
      while (esOp(["=", "<>", "<", ">", "<=", ">="])) { var o = tomar().v; n = { k: "bin", o: o, a: n, b: concatenacion() }; }
      return n;
    }
    function concatenacion() {
      var n = suma();
      while (esOp(["&"])) { tomar(); n = { k: "bin", o: "&", a: n, b: suma() }; }
      return n;
    }
    function suma() {
      var n = producto();
      while (esOp(["+", "-"])) { var o = tomar().v; n = { k: "bin", o: o, a: n, b: producto() }; }
      return n;
    }
    function producto() {
      var n = potencia();
      while (esOp(["*", "/"])) { var o = tomar().v; n = { k: "bin", o: o, a: n, b: potencia() }; }
      return n;
    }
    function potencia() {
      var n = unario();
      while (esOp(["^"])) { tomar(); n = { k: "bin", o: "^", a: n, b: unario() }; }
      return n;
    }
    function unario() {
      if (esOp(["-", "+"])) { var o = tomar().v; var x = unario(); return o === "-" ? { k: "neg", a: x } : x; }
      return porcentaje();
    }
    function porcentaje() {
      var n = primario();
      while (esOp(["%"])) { tomar(); n = { k: "pct", a: n }; }
      return n;
    }
    function primario() {
      var t = tomar();
      if (!t) throw new SyntaxError("La fórmula está incompleta: falta un valor al final.");
      if (t.t === "num") return { k: "num", v: t.v };
      if (t.t === "str") return { k: "str", v: t.v };
      if (t.t === "bool") return { k: "bool", v: t.v };
      if (t.t === "err") return { k: "errlit", v: t.v };
      if (t.t === "ref" || t.t === "rango" || t.t === "col") {
        var r = leerRef(t.s);
        if (!r) throw new SyntaxError("La referencia «" + t.s + "» no es válida.");
        return { k: t.t === "ref" ? "ref" : "rango", r: r };
      }
      if (t.t === "(") {
        var n = comparacion();
        if (!ver() || ver().t !== ")") throw new SyntaxError("Falta cerrar un paréntesis «)».");
        tomar();
        return n;
      }
      if (t.t === "func") {
        var args = [];
        if (ver() && ver().t === ")") { tomar(); return { k: "fn", n: t.v, a: args }; }
        for (;;) {
          if (ver() && (ver().t === "sep" || ver().t === ")")) args.push({ k: "vacio" });
          else args.push(comparacion());
          var s = tomar();
          if (!s) throw new SyntaxError("Falta cerrar el paréntesis de " + t.v + "(.");
          if (s.t === ")") break;
          if (s.t !== "sep") throw new SyntaxError("Entre los argumentos de " + t.v + " va una coma.");
        }
        return { k: "fn", n: t.v, a: args };
      }
      if (t.t === "nombre") return { k: "nombre", v: t.v };
      if (t.t === ")") throw new SyntaxError("Sobra un paréntesis «)».");
      if (t.t === "sep") throw new SyntaxError("Hay una coma fuera de una función.");
      throw new SyntaxError("No se esperaba «" + t.s + "» aquí.");
    }
    if (!toks.length) throw new SyntaxError("La fórmula está vacía: escribe algo después del =.");
    var arbol = comparacion();
    if (i < toks.length) {
      var t = toks[i];
      if (t.t === ")") throw new SyntaxError("Sobra un paréntesis «)».");
      throw new SyntaxError("Sobra «" + t.s + "»: ¿falta un operador (+, -, *, /) o una coma?");
    }
    return arbol;
  }

  // ---------------------------------------------------------------- reescribir fórmulas (copiar, traducir)
  function moverRefTexto(s, dc, df, limite) {
    var k = s.lastIndexOf("!"), pre = k >= 0 ? s.slice(0, k + 1) : "", resto = k >= 0 ? s.slice(k + 1) : s;
    var malo = false;
    var nuevo = resto.replace(/(\$?)([A-Za-z]{1,3})(\$?)(\d*)/g, function (_, ac, col, af, fila) {
      var c = colNum(col.toUpperCase()), f = fila ? +fila : null;
      if (!ac) c += dc;
      if (f !== null && !af) f += df;
      if (c < 1 || (f !== null && f < 1) || (limite && c > 16384)) { malo = true; return "#¡REF!"; }
      return ac + colLetras(c) + (f === null ? "" : af + f);
    });
    return malo ? "#¡REF!" : pre + nuevo;
  }

  // Copia relativa: la fórmula de una celda llevada dc columnas y df filas (como Ctrl+C / Ctrl+V en Excel).
  function moverFormula(formula, dc, df) {
    if (!formula || formula.charAt(0) !== "=") return formula;
    var toks;
    try { toks = tokenizar(formula.slice(1)); } catch (e) { return formula; }
    return "=" + toks.map(function (t) {
      return t.t === "ref" || t.t === "rango" || t.t === "col" ? moverRefTexto(t.s, dc, df, true) : t.s;
    }).join("");
  }

  // Español → inglés (como se guarda en el .xlsx): nombres de funciones, VERDADERO/FALSO y separador coma.
  function formulaEN(formula) {
    var toks = tokenizar(formula.charAt(0) === "=" ? formula.slice(1) : formula);
    return toks.map(function (t) {
      if (t.t === "func") { var n = normalizarNombre(t.v); return (ES_EN[n] || n) + "("; }
      if (t.t === "bool") return t.v ? "TRUE" : "FALSE";
      if (t.t === "sep") return ",";
      if (t.t === "err") return ({ "#¡DIV/0!": "#DIV/0!", "#¡VALOR!": "#VALUE!", "#¡REF!": "#REF!", "#¿NOMBRE?": "#NAME?", "#N/D": "#N/A", "#¡NUM!": "#NUM!" })[t.v] || t.v;
      return t.s;
    }).join("");
  }
  function normalizarNombre(n) {
    n = n.toUpperCase();
    if (ALIAS[n]) return ALIAS[n];
    if (FN[n]) return n;
    var s = sinTildes(n);
    if (s === "ANO") return "AÑO";
    return FN[s] ? s : n;
  }

  // Referencias de una fórmula (para resaltarlas mientras se edita).
  function referencias(formula) {
    try {
      return tokenizar(formula.slice(1)).filter(function (t) { return t.t === "ref" || t.t === "rango"; }).map(function (t) { return { s: t.s, i: t.i + 1, r: leerRef(t.s) }; });
    } catch (e) { return []; }
  }

  // ---------------------------------------------------------------- números y textos
  function aNumero(v) {
    if (esErr(v)) return v;
    if (v === null || v === undefined || v === "") return 0;
    if (typeof v === "number") return v;
    if (typeof v === "boolean") return v ? 1 : 0;
    var n = leerNumero(String(v));
    return n === null ? err(E.VALOR, "«" + v + "» no es un número.") : n;
  }
  // Número escrito por una persona: 1,280.50 · 18% · S/ 1 200 · -45 · (45)
  function leerNumero(s) {
    s = String(s).trim().replace(/^S\/\s*/i, "").replace(/\u00a0/g, " ");
    if (s === "") return null;
    var neg = false;
    if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1); }
    var pct = /%$/.test(s);
    if (pct) s = s.slice(0, -1).trim();
    if (/^[-+]?\d{1,3}([, ]\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/[, ]/g, "");
    if (!/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(s)) return null;
    var n = parseFloat(s);
    if (pct) n = n / 100;
    return neg ? -n : n;
  }
  function leerFecha(s) {
    var m = /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/.exec(String(s).trim());
    if (m) { var d = +m[1], mo = +m[2], a = +m[3]; if (mo >= 1 && mo <= 12 && d >= 1 && d <= finDeMes(a, mo)) return serial(a, mo, d); }
    m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s).trim());
    if (m) { var a2 = +m[1], mo2 = +m[2], d2 = +m[3]; if (mo2 >= 1 && mo2 <= 12 && d2 >= 1 && d2 <= finDeMes(a2, mo2)) return serial(a2, mo2, d2); }
    return null;
  }
  function aTexto(v) {
    if (v === null || v === undefined) return "";
    if (typeof v === "boolean") return v ? "VERDADERO" : "FALSO";
    if (typeof v === "number") return generalNum(v);
    return String(v);
  }
  function generalNum(n) {
    if (!isFinite(n)) return E.NUM;
    if (Number.isInteger(n)) return String(n);
    var s = String(parseFloat(n.toPrecision(11)));
    return s;
  }
  function aBool(v) {
    if (esErr(v)) return v;
    if (typeof v === "boolean") return v;
    if (v === null || v === undefined || v === "") return false;
    if (typeof v === "number") return v !== 0;
    var u = sinTildes(String(v)).toUpperCase();
    if (u === "VERDADERO" || u === "TRUE") return true;
    if (u === "FALSO" || u === "FALSE") return false;
    return err(E.VALOR, "«" + v + "» no es VERDADERO ni FALSO.");
  }
  // Redondeo de Excel: mitad hacia arriba (lejos del cero), sin el error de 1.005.
  function redondear(x, d) {
    d = Math.trunc(d || 0);
    var s = x < 0 ? -1 : 1, a = Math.abs(x);
    a = Number(a.toPrecision(15));
    var r = Number(Math.round(Number(a + "e" + d)) + "e" + (-d));
    return s * r;
  }
  function limpiarFlotante(n) { return typeof n === "number" && isFinite(n) ? Number(n.toPrecision(15)) : n; }

  function igualTexto(a, b) { return sinTildes(String(a)).toLowerCase().trim() === sinTildes(String(b)).toLowerCase().trim(); }

  // Comparación de Excel: número < texto < lógico; los textos sin distinguir mayúsculas.
  function comparar(a, b) {
    function tipo(v) { return v === null || v === undefined ? 0 : typeof v === "number" ? 1 : typeof v === "string" ? 2 : 3; }
    var ta = tipo(a), tb = tipo(b);
    if (ta === 0) { a = tb === 2 ? "" : tb === 3 ? false : 0; ta = tb || 1; }
    if (tb === 0) { b = ta === 2 ? "" : ta === 3 ? false : 0; tb = ta; }
    if (ta !== tb) return ta < tb ? -1 : 1;
    if (ta === 2) { var x = a.toLowerCase(), y = b.toLowerCase(); return x < y ? -1 : x > y ? 1 : 0; }
    if (ta === 3) { return a === b ? 0 : a ? 1 : -1; }
    var d = limpiarFlotante(a) - limpiarFlotante(b);
    return Math.abs(d) < 1e-12 ? 0 : d < 0 ? -1 : 1;
  }

  // Criterio de SUMAR.SI / CONTAR.SI: ">0", "<>Pagado", "Gravada", "F001*", 5…
  function criterio(c) {
    if (esErr(c)) return function () { return false; };
    if (typeof c === "number" || typeof c === "boolean") return function (v) { return v !== null && v !== "" && comparar(v, c) === 0; };
    var s = c === null || c === undefined ? "" : String(c), op = "=";
    var m = /^(<=|>=|<>|<|>|=)/.exec(s);
    if (m) { op = m[1]; s = s.slice(op.length); }
    var n = leerNumero(s);
    if (n === null) { var f = leerFecha(s); if (f !== null) n = f; }
    if (n !== null && s !== "") {
      return function (v) {
        var x = typeof v === "number" ? v : (typeof v === "string" && leerNumero(v) !== null && op === "=" ? leerNumero(v) : null);
        if (x === null) return op === "<>";
        var k = comparar(x, n);
        return op === "=" ? k === 0 : op === "<>" ? k !== 0 : op === "<" ? k < 0 : op === ">" ? k > 0 : op === "<=" ? k <= 0 : k >= 0;
      };
    }
    if (op === "=" || op === "<>") {
      var vacio = s === "";
      var re = /[*?]/.test(s) ? new RegExp("^" + s.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/~\*/g, "\u0001").replace(/~\?/g, "\u0002").replace(/\*/g, ".*").replace(/\?/g, ".").replace(/\u0001/g, "\\*").replace(/\u0002/g, "\\?") + "$", "i") : null;
      var igual = function (v) {
        if (vacio) return v === null || v === undefined || v === "";
        if (typeof v !== "string") return false;
        return re ? re.test(v) : v.toLowerCase() === s.toLowerCase();
      };
      return op === "=" ? igual : function (v) { return !igual(v); };
    }
    return function (v) {
      if (typeof v !== "string") return false;
      var k = comparar(v, s);
      return op === "<" ? k < 0 : op === ">" ? k > 0 : op === "<=" ? k <= 0 : k >= 0;
    };
  }

  // ---------------------------------------------------------------- formatos de número
  var MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  function esFormatoFecha(f) { return !!f && /[dmy]/i.test(f.replace(/"[^"]*"/g, "").replace(/\[[^\]]*\]/g, "")) && !/0/.test(f.replace(/"[^"]*"/g, "")); }
  function agrupar(s) { return s.replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
  function formatear(v, fmt) {
    if (v === null || v === undefined) return "";
    if (esErr(v)) return v.err;
    if (typeof v === "boolean") return v ? "VERDADERO" : "FALSO";
    if (typeof v === "string") return v;
    if (!isFinite(v)) return E.NUM;
    if (!fmt || fmt === "General" || fmt === "@") return generalNum(v);
    var secciones = fmt.split(";"), f = secciones[0];
    if (v < 0 && secciones[1]) { f = secciones[1]; v = -v; }
    if (esFormatoFecha(f)) {
      if (v < 1 || v > 2958465) return "########";
      var d = deSerial(v);
      return f.replace(/"([^"]*)"/g, "$1").replace(/yyyy|yy|mmmm|mmm|mm|m|dd|d|hh|ss/gi, function (t) {
        var u = t.toLowerCase();
        if (u === "yyyy") return String(d.a);
        if (u === "yy") return String(d.a).slice(-2);
        if (u === "mmmm") return MESES[d.m - 1];
        if (u === "mmm") return MESES[d.m - 1].slice(0, 3);
        if (u === "mm") return ("0" + d.m).slice(-2);
        if (u === "m") return String(d.m);
        if (u === "dd") return ("0" + d.d).slice(-2);
        if (u === "d") return String(d.d);
        return "00";
      });
    }
    var pre = "", suf = "";
    var lit = /^((?:"[^"]*"|[^#0.,%])*)([#0.,]+)((?:"[^"]*"|[^#0.,])*)$/.exec(f.replace(/_\)|_\(|\\/g, ""));
    if (!lit) return generalNum(v);
    pre = lit[1].replace(/"/g, ""); suf = lit[3].replace(/"/g, "");
    var nucleo = lit[2], pct = /%/.test(suf);
    var dec = (nucleo.split(".")[1] || "").replace(/[^0#]/g, "").length;
    var x = pct ? v * 100 : v;
    var neg = x < 0;
    var txt = redondear(Math.abs(x), dec).toFixed(dec);
    if (/,/.test(nucleo)) { var p = txt.split("."); txt = agrupar(p[0]) + (p[1] ? "." + p[1] : ""); }
    return (neg ? "-" : "") + pre + txt + suf;
  }

  // ---------------------------------------------------------------- el libro
  function Libro(datos) {
    this.estilos = (datos.estilos || []).slice();
    this.hojas = [];
    this.porNombre = {};
    var self = this;
    (datos.hojas || []).forEach(function (h) { self.agregarHoja(h); });
    this.version = 0;
  }
  Libro.prototype.agregarHoja = function (h) {
    var hoja = { n: h.n, dim: (h.dim || [10, 20]).slice(), w: Object.assign({}, h.w || {}), fz: h.fz || null, t: h.t || [], celdas: {} };
    (h.c || []).forEach(function (c) { hoja.celdas[c[0]] = { e: c[1] === undefined ? null : c[1], s: c[2] || 0 }; });
    this.hojas.push(hoja);
    this.porNombre[h.n.toLowerCase()] = hoja;
    return hoja;
  };
  Libro.prototype.hoja = function (n) { return typeof n === "number" ? this.hojas[n] : this.porNombre[String(n).toLowerCase()]; };
  Libro.prototype.celda = function (hoja, ref) { var h = this.hoja(hoja); return h ? h.celdas[ref] : undefined; };
  Libro.prototype.estilo = function (i) { return this.estilos[i] || {}; };

  // Escribir lo que teclea la persona (o un valor de los datos). Devuelve la entrada anterior (para deshacer).
  Libro.prototype.poner = function (hoja, ref, entrada, estilo) {
    var h = this.hoja(hoja);
    var c = h.celdas[ref];
    var antes = c ? { e: c.e, s: c.s } : null;
    if ((entrada === null || entrada === "" || entrada === undefined) && !(c && c.s)) { delete h.celdas[ref]; }
    else {
      if (!c) c = h.celdas[ref] = { e: null, s: 0 };
      c.e = entrada === "" || entrada === undefined ? null : entrada;
      if (estilo !== undefined) c.s = estilo;
      delete c.ast; delete c.astDe;
    }
    var p = partir(ref);
    if (p) { h.dim[0] = Math.max(h.dim[0], p.c); h.dim[1] = Math.max(h.dim[1], p.f); }
    this.version++;
    return antes;
  };

  // Interpretar lo tecleado según el formato de la celda (como Excel: «18%» es 0,18; «05/10/2026» es una fecha).
  Libro.prototype.interpretar = function (texto, estiloIdx) {
    if (texto === null || texto === undefined) return null;
    if (typeof texto !== "string") return texto;
    var s = texto;
    if (s === "") return null;
    if (s.charAt(0) === "=" && s.length > 1) return s;
    if (s.charAt(0) === "'") return s.slice(1);
    var fmt = this.estilo(estiloIdx).f || "";
    var f = leerFecha(s);
    if (f !== null) return f;
    var n = leerNumero(s);
    if (n !== null) { if (/%/.test(fmt) && !/%/.test(s) && Math.abs(n) >= 1) n = n / 100; return n; }
    var u = sinTildes(s.trim()).toUpperCase();
    if (u === "VERDADERO") return true;
    if (u === "FALSO") return false;
    return s;
  };

  // ---------------------------------------------------------------- evaluación
  Libro.prototype.recalcular = function () {
    this.cache = {};
    this.enCurso = {};
    var self = this;
    this.hojas.forEach(function (h) {
      Object.keys(h.celdas).forEach(function (ref) { self.valor(h, ref); });
    });
  };
  Libro.prototype.valor = function (h, ref) {
    var c = h.celdas[ref];
    if (!c || c.e === null || c.e === undefined) return null;
    if (typeof c.e !== "string" || c.e.charAt(0) !== "=") return c.e;
    var k = h.n + "!" + ref;
    if (this.cache && k in this.cache) return this.cache[k];
    if (!this.cache) this.cache = {};
    if (!this.enCurso) this.enCurso = {};
    if (this.enCurso[k]) return err(E.REF, "Referencia circular: la fórmula de " + ref + " depende de sí misma.");
    this.enCurso[k] = true;
    var v;
    try {
      if (!c.ast || c.astDe !== c.e) { c.astDe = c.e; c.ast = null; c.errSint = null; c.ast = analizar(c.e); }
      var p = partir(ref);
      v = this.evaluar(c.ast, { hoja: h, c: p.c, f: p.f });
      if (v && v.k === "rango") v = this.unValor(v, { hoja: h, c: p.c, f: p.f });
      if (typeof v === "number") v = isFinite(v) ? limpiarFlotante(v) : err(E.NUM);
      if (v === null || v === undefined) v = 0;
    } catch (e) {
      if (e instanceof SyntaxError) { c.errSint = e.message; v = err(E.NOMBRE, e.message); }
      else if (e instanceof Err) v = e;
      else { v = err(E.VALOR, String(e && e.message || e)); }
    }
    delete this.enCurso[k];
    this.cache[k] = v;
    return v;
  };
  // Valor de una fórmula suelta evaluada como si estuviera en (hoja, ref): la revisión la usa con la referencia.
  Libro.prototype.evaluarEn = function (formula, hoja, ref) {
    var h = this.hoja(hoja), p = partir(ref);
    try {
      var v = this.evaluar(analizar(formula), { hoja: h, c: p.c, f: p.f });
      if (v && v.k === "rango") v = this.unValor(v, { hoja: h, c: p.c, f: p.f });
      if (typeof v === "number") v = limpiarFlotante(v);
      return v === null || v === undefined ? 0 : v;
    } catch (e) { return e instanceof Err ? e : err(E.NOMBRE, e.message); }
  };

  Libro.prototype.hojaDe = function (r, ctx) {
    if (!r.hoja) return ctx.hoja;
    var h = this.hoja(r.hoja);
    if (!h) throw err(E.REF, "No hay una hoja llamada «" + r.hoja + "».");
    return h;
  };
  Libro.prototype.rangoDe = function (r, ctx) {
    var h = this.hojaDe(r, ctx);
    var f2 = r.columnas ? Math.max(h.dim[1], 1) : r.f2;
    return { k: "rango", h: h, c1: r.c1, f1: r.f1, c2: r.c2, f2: f2 };
  };
  Libro.prototype.celdasDe = function (rg) {
    var out = [];
    for (var f = rg.f1; f <= rg.f2; f++) for (var c = rg.c1; c <= rg.c2; c++) out.push(this.valor(rg.h, dir(c, f)));
    return out;
  };
  // Un rango usado donde va un solo valor: la intersección implícita de Excel (misma fila o columna).
  Libro.prototype.unValor = function (rg, ctx) {
    if (rg.c1 === rg.c2 && rg.f1 === rg.f2) return this.valor(rg.h, dir(rg.c1, rg.f1));
    if (rg.c1 === rg.c2 && ctx.f >= rg.f1 && ctx.f <= rg.f2) return this.valor(rg.h, dir(rg.c1, ctx.f));
    if (rg.f1 === rg.f2 && ctx.c >= rg.c1 && ctx.c <= rg.c2) return this.valor(rg.h, dir(ctx.c, rg.f1));
    return err(E.VALOR, "Usas un rango donde va un solo valor.");
  };

  Libro.prototype.evaluar = function (n, ctx) {
    var self = this;
    function ev(x) { var v = self.evaluar(x, ctx); return v && v.k === "rango" ? self.unValor(v, ctx) : v; }
    switch (n.k) {
      case "num": case "str": case "bool": return n.v;
      case "vacio": return null;
      case "errlit": return err(n.v);
      case "nombre": {
        var u = sinTildes(n.v).toUpperCase();
        throw err(E.NOMBRE, "«" + n.v + "» no es una función ni una referencia" + (/^[A-Z]{1,3}\d+$/i.test(n.v) ? "" : ". Si es un texto, ponlo entre comillas: \"" + n.v + "\"") + (u === "HOY" ? ". HOY lleva paréntesis: HOY()" : "") + ".");
      }
      case "ref": {
        var h = this.hojaDe(n.r, ctx);
        return this.valor(h, dir(n.r.c1, n.r.f1));
      }
      case "rango": return this.rangoDe(n.r, ctx);
      case "neg": { var a = aNumero(ev(n.a)); return esErr(a) ? a : -a; }
      case "pct": { var p = aNumero(ev(n.a)); return esErr(p) ? p : p / 100; }
      case "bin": {
        var x = ev(n.a), y = ev(n.b);
        if (esErr(x)) return x;
        if (esErr(y)) return y;
        if (n.o === "&") return aTexto(x) + aTexto(y);
        if (["=", "<>", "<", ">", "<=", ">="].indexOf(n.o) >= 0) {
          var k = comparar(x, y);
          return n.o === "=" ? k === 0 : n.o === "<>" ? k !== 0 : n.o === "<" ? k < 0 : n.o === ">" ? k > 0 : n.o === "<=" ? k <= 0 : k >= 0;
        }
        var a2 = aNumero(x), b2 = aNumero(y);
        if (esErr(a2)) return a2;
        if (esErr(b2)) return b2;
        if (n.o === "+") return a2 + b2;
        if (n.o === "-") return a2 - b2;
        if (n.o === "*") return a2 * b2;
        if (n.o === "/") return b2 === 0 ? err(E.DIV) : a2 / b2;
        if (n.o === "^") return Math.pow(a2, b2);
        return err(E.VALOR);
      }
      case "fn": {
        var nombre = normalizarNombre(n.n);
        var f = FN[nombre];
        if (!f) {
          var en = EN_ES[nombre.replace(/^_XLFN\./, "")];
          throw err(E.NOMBRE, en ? nombre + " es el nombre en inglés: en Excel en español es " + en + "." : "Excel no conoce la función «" + n.n + "». Revisa cómo se escribe.");
        }
        if (f.perezosa) return f.fn.call(this, n.a, ctx, ev);
        var args = n.a.map(function (x) { return self.evaluar(x, ctx); });
        if (f.min !== undefined && args.length < f.min) throw err(E.VALOR, nombre + " necesita al menos " + f.min + " argumento" + (f.min > 1 ? "s" : "") + ".");
        return f.fn.call(this, args, ctx);
      }
    }
    return err(E.VALOR);
  };

  // ---------------------------------------------------------------- funciones
  function plano(libro, args, soloNumeros) {
    var out = [];
    args.forEach(function (a) {
      if (a && a.k === "rango") libro.celdasDe(a).forEach(function (v) { if (!soloNumeros || typeof v === "number" || esErr(v)) out.push(v); });
      else if (a !== null && a !== undefined) {
        if (soloNumeros) { var n = aNumero(a); out.push(n); }
        else out.push(a);
      }
    });
    return out;
  }
  function primerError(lista) { for (var i = 0; i < lista.length; i++) if (esErr(lista[i])) return lista[i]; return null; }
  function escalar(libro, v, ctx) { return v && v.k === "rango" ? libro.unValor(v, ctx) : v; }
  function num(libro, v, ctx) { return aNumero(escalar(libro, v, ctx)); }
  function exigirRango(v, nombre) { if (!v || v.k !== "rango") throw err(E.VALOR, nombre + " necesita un rango de celdas."); return v; }
  function mismoTamano(a, b) { return (a.f2 - a.f1) === (b.f2 - b.f1) && (a.c2 - a.c1) === (b.c2 - b.c1); }

  function siConjunto(libro, rangoValores, pares, nombre) {
    var base = rangoValores ? exigirRango(rangoValores, nombre) : exigirRango(pares[0], nombre);
    var filas = base.f2 - base.f1 + 1, cols = base.c2 - base.c1 + 1, ok = [];
    for (var i = 0; i < filas * cols; i++) ok.push(true);
    for (var p = 0; p < pares.length; p += 2) {
      var r = exigirRango(pares[p], nombre);
      if (!mismoTamano(r, base)) throw err(E.VALOR, nombre + ": los rangos deben tener el mismo tamaño (" + (base.f2 - base.f1 + 1) + " filas).");
      var cr = criterio(pares[p + 1] && pares[p + 1].k === "rango" ? libro.unValor(pares[p + 1], {}) : pares[p + 1]);
      var vals = libro.celdasDe(r);
      for (var j = 0; j < vals.length; j++) if (ok[j] && !cr(vals[j])) ok[j] = false;
    }
    return { base: base, ok: ok };
  }

  var FN = {};
  function def(nombre, min, fn, perezosa) { FN[nombre] = { min: min, fn: fn, perezosa: !!perezosa }; }

  def("SUMA", 1, function (a) { var l = plano(this, a, true), e = primerError(l); if (e) return e; return l.reduce(function (s, x) { return s + x; }, 0); });
  def("PROMEDIO", 1, function (a) { var l = plano(this, a, true), e = primerError(l); if (e) return e; return l.length ? l.reduce(function (s, x) { return s + x; }, 0) / l.length : err(E.DIV); });
  def("MAX", 1, function (a) { var l = plano(this, a, true), e = primerError(l); if (e) return e; return l.length ? Math.max.apply(null, l) : 0; });
  def("MIN", 1, function (a) { var l = plano(this, a, true), e = primerError(l); if (e) return e; return l.length ? Math.min.apply(null, l) : 0; });
  def("CONTAR", 1, function (a) { var n = 0; a.forEach(function (x) { if (x && x.k === "rango") this.celdasDe(x).forEach(function (v) { if (typeof v === "number") n++; }); else if (typeof aNumero(x) === "number" && x !== null) n++; }, this); return n; });
  def("CONTARA", 1, function (a) { var n = 0; a.forEach(function (x) { if (x && x.k === "rango") this.celdasDe(x).forEach(function (v) { if (v !== null && v !== undefined && v !== "") n++; }); else if (x !== null) n++; }, this); return n; });
  def("CONTAR.BLANCO", 1, function (a) { return this.celdasDe(exigirRango(a[0], "CONTAR.BLANCO")).filter(function (v) { return v === null || v === ""; }).length; });
  def("SUMAR.SI", 2, function (a, ctx) {
    var r = exigirRango(a[0], "SUMAR.SI"), sumar = a[2] && a[2].k === "rango" ? a[2] : r;
    var cr = criterio(escalar(this, a[1], ctx)), vals = this.celdasDe(r);
    var sr = { k: "rango", h: sumar.h, c1: sumar.c1, f1: sumar.f1, c2: sumar.c1 + (r.c2 - r.c1), f2: sumar.f1 + (r.f2 - r.f1) };
    var sv = this.celdasDe(sr), s = 0;
    for (var i = 0; i < vals.length; i++) if (cr(vals[i])) { if (esErr(sv[i])) return sv[i]; if (typeof sv[i] === "number") s += sv[i]; }
    return s;
  });
  def("CONTAR.SI", 2, function (a, ctx) { var cr = criterio(escalar(this, a[1], ctx)); return this.celdasDe(exigirRango(a[0], "CONTAR.SI")).filter(cr).length; });
  def("PROMEDIO.SI", 2, function (a, ctx) {
    var r = exigirRango(a[0], "PROMEDIO.SI"), pr = a[2] && a[2].k === "rango" ? a[2] : r, cr = criterio(escalar(this, a[1], ctx)), vals = this.celdasDe(r);
    var sv = this.celdasDe({ k: "rango", h: pr.h, c1: pr.c1, f1: pr.f1, c2: pr.c1 + (r.c2 - r.c1), f2: pr.f1 + (r.f2 - r.f1) }), s = 0, n = 0;
    for (var i = 0; i < vals.length; i++) if (cr(vals[i]) && typeof sv[i] === "number") { s += sv[i]; n++; }
    return n ? s / n : err(E.DIV);
  });
  function conjunto(nombre, agregar) {
    def(nombre, 3, function (a, ctx) {
      var pares = a.slice(1).map(function (x, i) { return i % 2 ? escalar(this, x, ctx) : x; }, this);
      var r = siConjunto(this, a[0], pares, nombre), vals = this.celdasDe(r.base), sel = [];
      for (var i = 0; i < vals.length; i++) if (r.ok[i]) { if (esErr(vals[i])) return vals[i]; if (typeof vals[i] === "number") sel.push(vals[i]); }
      return agregar(sel);
    });
  }
  conjunto("SUMAR.SI.CONJUNTO", function (l) { return l.reduce(function (s, x) { return s + x; }, 0); });
  conjunto("PROMEDIO.SI.CONJUNTO", function (l) { return l.length ? l.reduce(function (s, x) { return s + x; }, 0) / l.length : err(E.DIV); });
  conjunto("MAX.SI.CONJUNTO", function (l) { return l.length ? Math.max.apply(null, l) : 0; });
  conjunto("MIN.SI.CONJUNTO", function (l) { return l.length ? Math.min.apply(null, l) : 0; });
  def("CONTAR.SI.CONJUNTO", 2, function (a, ctx) {
    var pares = a.map(function (x, i) { return i % 2 ? escalar(this, x, ctx) : x; }, this);
    return siConjunto(this, null, pares, "CONTAR.SI.CONJUNTO").ok.filter(Boolean).length;
  });
  def("SI", 1, function (a, ctx, ev) {
    var c = aBool(ev(a[0]));
    if (esErr(c)) return c;
    if (c) return a.length > 1 ? (a[1].k === "vacio" ? 0 : ev(a[1])) : true;
    return a.length > 2 ? (a[2].k === "vacio" ? 0 : ev(a[2])) : false;
  }, true);
  def("SI.CONJUNTO", 2, function (a, ctx, ev) {
    for (var i = 0; i + 1 < a.length; i += 2) { var c = aBool(ev(a[i])); if (esErr(c)) return c; if (c) return ev(a[i + 1]); }
    return err(E.ND, "Ninguna condición de SI.CONJUNTO se cumplió (agrega VERDADERO al final para «en otro caso»).");
  }, true);
  def("SI.ERROR", 2, function (a, ctx, ev) { var v = ev(a[0]); return esErr(v) ? ev(a[1]) : v; }, true);
  def("Y", 1, function (a) { var r = true; for (var i = 0; i < a.length; i++) { var l = a[i] && a[i].k === "rango" ? this.celdasDe(a[i]) : [a[i]]; for (var j = 0; j < l.length; j++) { if (l[j] === null && a[i].k === "rango") continue; var b = aBool(l[j]); if (esErr(b)) return b; r = r && b; } } return r; });
  def("O", 1, function (a) { var r = false; for (var i = 0; i < a.length; i++) { var l = a[i] && a[i].k === "rango" ? this.celdasDe(a[i]) : [a[i]]; for (var j = 0; j < l.length; j++) { if (l[j] === null && a[i].k === "rango") continue; var b = aBool(l[j]); if (esErr(b)) return b; r = r || b; } } return r; });
  def("NO", 1, function (a, ctx) { var b = aBool(escalar(this, a[0], ctx)); return esErr(b) ? b : !b; });
  function numArgs(libro, a, ctx, n) { var out = []; for (var i = 0; i < n; i++) { var v = a[i] === undefined ? 0 : num(libro, a[i], ctx); if (esErr(v)) throw v; out.push(v); } return out; }
  def("REDONDEAR", 2, function (a, ctx) { var x = numArgs(this, a, ctx, 2); return redondear(x[0], x[1]); });
  def("REDONDEAR.MAS", 2, function (a, ctx) { var x = numArgs(this, a, ctx, 2), p = Math.pow(10, Math.trunc(x[1])); return (x[0] < 0 ? -1 : 1) * Math.ceil(Number((Math.abs(x[0]) * p).toPrecision(15))) / p; });
  def("REDONDEAR.MENOS", 2, function (a, ctx) { var x = numArgs(this, a, ctx, 2), p = Math.pow(10, Math.trunc(x[1])); return (x[0] < 0 ? -1 : 1) * Math.floor(Number((Math.abs(x[0]) * p).toPrecision(15))) / p; });
  def("ENTERO", 1, function (a, ctx) { return Math.floor(numArgs(this, a, ctx, 1)[0]); });
  def("ABS", 1, function (a, ctx) { return Math.abs(numArgs(this, a, ctx, 1)[0]); });
  def("RESIDUO", 2, function (a, ctx) { var x = numArgs(this, a, ctx, 2); if (x[1] === 0) return err(E.DIV); return x[0] - x[1] * Math.floor(x[0] / x[1]); });
  def("POTENCIA", 2, function (a, ctx) { var x = numArgs(this, a, ctx, 2); return Math.pow(x[0], x[1]); });
  def("SUMAPRODUCTO", 1, function (a) {
    var rs = a.map(function (x) { return exigirRango(x, "SUMAPRODUCTO"); }), l = rs.map(function (r) { return this.celdasDe(r); }, this), s = 0;
    for (var i = 0; i < l[0].length; i++) { var p = 1; for (var j = 0; j < l.length; j++) p *= typeof l[j][i] === "number" ? l[j][i] : 0; s += p; }
    return s;
  });

  function buscarIndice(lista, v, exacta) {
    for (var i = 0; i < lista.length; i++) {
      var x = lista[i];
      if (x === null || x === undefined) continue;
      if (typeof v === "string" && typeof x === "string") {
        if (/[*?]/.test(v) && exacta === 2) { if (criterio(v)(x)) return i; }
        else if (x.toLowerCase() === v.toLowerCase()) return i;
      } else if (typeof v === typeof x && comparar(x, v) === 0) return i;
    }
    return -1;
  }
  def("BUSCARX", 3, function (a, ctx) {
    var v = escalar(this, a[0], ctx);
    if (esErr(v)) return v;
    var rb = exigirRango(a[1], "BUSCARX"), rd = exigirRango(a[2], "BUSCARX");
    var lista = this.celdasDe(rb), modo = a[4] !== undefined && a[4] !== null ? num(this, a[4], ctx) : 0;
    var idx = -1;
    if (modo === 0 || modo === 2) idx = buscarIndice(lista, v, modo);
    else {
      var mejor = -1;
      for (var i = 0; i < lista.length; i++) {
        if (typeof lista[i] !== typeof v) continue;
        var k = comparar(lista[i], v);
        if (k === 0) { mejor = i; break; }
        if (modo === -1 && k < 0 && (mejor < 0 || comparar(lista[i], lista[mejor]) > 0)) mejor = i;
        if (modo === 1 && k > 0 && (mejor < 0 || comparar(lista[i], lista[mejor]) < 0)) mejor = i;
      }
      idx = mejor;
    }
    if (idx < 0) return a.length > 3 && a[3] !== null && a[3] !== undefined ? escalar(this, a[3], ctx) : err(E.ND, "BUSCARX no encontró «" + aTexto(v) + "».");
    var vertical = rb.c1 === rb.c2;
    if (vertical) return this.valor(rd.h, dir(rd.c1, rd.f1 + idx));
    return this.valor(rd.h, dir(rd.c1 + idx, rd.f1));
  });
  def("BUSCARV", 3, function (a, ctx) {
    var v = escalar(this, a[0], ctx);
    if (esErr(v)) return v;
    var r = exigirRango(a[1], "BUSCARV"), col = num(this, a[2], ctx);
    var aprox = a.length > 3 && a[3] !== null ? aBool(escalar(this, a[3], ctx)) : true;
    if (esErr(col)) return col;
    if (col < 1 || col > r.c2 - r.c1 + 1) return err(E.REF, "BUSCARV: la columna " + col + " está fuera de la tabla.");
    var lista = this.celdasDe({ k: "rango", h: r.h, c1: r.c1, f1: r.f1, c2: r.c1, f2: r.f2 }), idx = -1;
    if (!aprox) idx = buscarIndice(lista, v, 2);
    else for (var i = 0; i < lista.length; i++) { if (lista[i] === null || typeof lista[i] !== typeof v) continue; if (comparar(lista[i], v) <= 0) idx = i; else break; }
    if (idx < 0) return err(E.ND, "BUSCARV no encontró «" + aTexto(v) + "»" + (aprox ? ". ¿Te faltó FALSO al final para la coincidencia exacta?" : "."));
    return this.valor(r.h, dir(r.c1 + col - 1, r.f1 + idx));
  });
  def("COINCIDIR", 2, function (a, ctx) {
    var v = escalar(this, a[0], ctx), r = exigirRango(a[1], "COINCIDIR"), tipo = a.length > 2 && a[2] !== null ? num(this, a[2], ctx) : 1;
    var lista = this.celdasDe(r), idx = -1;
    if (tipo === 0) idx = buscarIndice(lista, v, 2);
    else for (var i = 0; i < lista.length; i++) { if (lista[i] === null) continue; var k = comparar(lista[i], v); if (tipo > 0 ? k <= 0 : k >= 0) idx = i; else break; }
    return idx < 0 ? err(E.ND, "COINCIDIR no encontró «" + aTexto(v) + "».") : idx + 1;
  });
  def("INDICE", 2, function (a, ctx) {
    var r = exigirRango(a[0], "INDICE"), f = num(this, a[1], ctx), c = a.length > 2 && a[2] !== null ? num(this, a[2], ctx) : 1;
    if (r.f1 === r.f2 && a.length === 2) { c = f; f = 1; }
    if (f < 1 || c < 1 || f > r.f2 - r.f1 + 1 || c > r.c2 - r.c1 + 1) return err(E.REF, "INDICE: la posición está fuera del rango.");
    return this.valor(r.h, dir(r.c1 + c - 1, r.f1 + f - 1));
  });
  def("FECHA", 3, function (a, ctx) {
    var x = numArgs(this, a, ctx, 3), an = Math.trunc(x[0]);
    if (an < 1900) an += 1900;
    var t = Date.UTC(an, Math.trunc(x[1]) - 1, Math.trunc(x[2]));
    return Math.round((t - BASE) / DIA_MS);
  });
  def("DIAS", 2, function (a, ctx) { var x = numArgs(this, a, ctx, 2); return Math.trunc(x[0]) - Math.trunc(x[1]); });
  def("AÑO", 1, function (a, ctx) { return deSerial(numArgs(this, a, ctx, 1)[0]).a; });
  def("MES", 1, function (a, ctx) { return deSerial(numArgs(this, a, ctx, 1)[0]).m; });
  def("DIA", 1, function (a, ctx) { return deSerial(numArgs(this, a, ctx, 1)[0]).d; });
  def("HOY", 0, function () { var t = new Date(); return serial(t.getFullYear(), t.getMonth() + 1, t.getDate()); });
  def("FIN.MES", 2, function (a, ctx) { var x = numArgs(this, a, ctx, 2), d = deSerial(x[0]), m = d.m + Math.trunc(x[1]); var an = d.a + Math.floor((m - 1) / 12); m = ((m - 1) % 12 + 12) % 12 + 1; return serial(an, m, finDeMes(an, m)); });
  def("FECHA.MES", 2, function (a, ctx) { var x = numArgs(this, a, ctx, 2), d = deSerial(x[0]), m = d.m + Math.trunc(x[1]); var an = d.a + Math.floor((m - 1) / 12); m = ((m - 1) % 12 + 12) % 12 + 1; return serial(an, m, Math.min(d.d, finDeMes(an, m))); });
  def("SIFECHA", 3, function (a, ctx) {
    var x = numArgs(this, a, ctx, 2), u = String(escalar(this, a[2], ctx)).toLowerCase();
    if (x[0] > x[1]) return err(E.NUM, "SIFECHA: la fecha inicial es posterior a la final.");
    var i = deSerial(x[0]), f = deSerial(x[1]);
    var meses = (f.a - i.a) * 12 + (f.m - i.m) - (f.d < i.d ? 1 : 0);
    if (u === "d") return Math.trunc(x[1]) - Math.trunc(x[0]);
    if (u === "m") return meses;
    if (u === "y") return Math.floor(meses / 12);
    if (u === "ym") return meses % 12;
    if (u === "md") { var dd = f.d - i.d; if (dd < 0) { var pm = f.m - 1 || 12, pa = f.m - 1 ? f.a : f.a - 1; dd += finDeMes(pa, pm); } return dd; }
    if (u === "yd") { var ini = serial(f.a, i.m, Math.min(i.d, finDeMes(f.a, i.m))); if (ini > x[1]) ini = serial(f.a - 1, i.m, Math.min(i.d, finDeMes(f.a - 1, i.m))); return Math.trunc(x[1]) - ini; }
    return err(E.NUM, "SIFECHA: la unidad va entre comillas: \"d\", \"m\" o \"y\".");
  });
  function txt(libro, v, ctx) { v = escalar(libro, v, ctx); if (esErr(v)) throw v; return aTexto(v); }
  def("LARGO", 1, function (a, ctx) { return txt(this, a[0], ctx).length; });
  def("CONCATENAR", 1, function (a, ctx) { return a.map(function (x) { return txt(this, x, ctx); }, this).join(""); });
  def("CONCAT", 1, function (a, ctx) { return a.map(function (x) { return x && x.k === "rango" ? this.celdasDe(x).map(aTexto).join("") : txt(this, x, ctx); }, this).join(""); });
  def("IZQUIERDA", 1, function (a, ctx) { return txt(this, a[0], ctx).slice(0, a.length > 1 ? num(this, a[1], ctx) : 1); });
  def("DERECHA", 1, function (a, ctx) { var s = txt(this, a[0], ctx), n = a.length > 1 ? num(this, a[1], ctx) : 1; return n ? s.slice(-n) : ""; });
  def("EXTRAE", 3, function (a, ctx) { var s = txt(this, a[0], ctx), i = num(this, a[1], ctx), n = num(this, a[2], ctx); return s.substr(i - 1, n); });
  def("MAYUSC", 1, function (a, ctx) { return txt(this, a[0], ctx).toUpperCase(); });
  def("MINUSC", 1, function (a, ctx) { return txt(this, a[0], ctx).toLowerCase(); });
  def("ESPACIOS", 1, function (a, ctx) { return txt(this, a[0], ctx).trim().replace(/ +/g, " "); });
  def("VALOR", 1, function (a, ctx) { var v = escalar(this, a[0], ctx); if (typeof v === "number") return v; var n = leerNumero(aTexto(v)); return n === null ? err(E.VALOR) : n; });
  def("TEXTO", 2, function (a, ctx) { var v = escalar(this, a[0], ctx), f = txt(this, a[1], ctx); if (esErr(v)) return v; return formatear(typeof v === "number" ? v : aNumero(v), f.replace(/a/g, "y")); });
  def("ESBLANCO", 1, function (a, ctx) { var v = escalar(this, a[0], ctx); return v === null || v === undefined; });
  def("ESNUMERO", 1, function (a, ctx) { return typeof escalar(this, a[0], ctx) === "number"; });
  def("ESERROR", 1, function (a, ctx) { return esErr(escalar(this, a[0], ctx)); });

  // ---------------------------------------------------------------- revisión
  // Compara lo que hay en la hoja con la referencia de cada celda amarilla. ref: fórmula ("=…") o valor fijo.
  function revisar(libro, entradas) {
    libro.recalcular();
    return entradas.map(function (en) {
      var h = libro.hoja(en.hoja), c = h && h.celdas[en.ref];
      var dado = h ? libro.valor(h, en.ref) : null;
      var esperado = typeof en.r === "string" && en.r.charAt(0) === "=" ? libro.evaluarEn(en.r, en.hoja, en.ref) : en.r;
      var r = { hoja: en.hoja, ref: en.ref, esperado: esperado, dado: dado, ok: false, motivo: "" };
      var entrada = c ? c.e : null;
      if (entrada === null || entrada === undefined || entrada === "") { r.motivo = "vacía"; return r; }
      if (esErr(dado)) { r.motivo = "error"; return r; }
      if (esErr(esperado)) { r.ok = esErr(dado) && dado.err === esperado.err; r.motivo = r.ok ? "" : "distinto"; return r; }
      if (typeof esperado === "number") {
        var n = typeof dado === "number" ? dado : (typeof dado === "string" ? leerNumero(dado) : (typeof dado === "boolean" ? null : null));
        r.ok = n !== null && Math.abs(n - esperado) <= Math.max(0.0051, Math.abs(esperado) * 1e-6);
      } else if (typeof esperado === "boolean") r.ok = dado === esperado;
      else r.ok = typeof dado === "string" && igualTexto(dado, esperado) || (dado === null && esperado === "");
      if (r.ok && typeof en.r === "string" && en.r.charAt(0) === "=" && !(typeof entrada === "string" && entrada.charAt(0) === "=")) {
        // El número está bien, pero escrito a mano: Excel no lo recalcula si cambian los datos.
        r.ok = false; r.motivo = "a_mano";
      } else if (!r.ok) r.motivo = "distinto";
      return r;
    });
  }

  // ---------------------------------------------------------------- escenarios (IA o pegados): validar y reparar
  function normal(s) { return sinTildes(String(s == null ? "" : s)).toLowerCase().replace(/[^a-z0-9%]+/g, " ").trim(); }

  function repararValor(col, v, avisos, donde) {
    if (v === undefined || v === null || v === "") {
      if (col.tipo === "texto" || col.tipo === "lista") return col.tipo === "lista" ? col.opciones[0] : "";
      return col.tipo === "fecha" ? null : 0;
    }
    switch (col.tipo) {
      case "fecha": {
        if (typeof v === "number" && v > 20000 && v < 80000) return Math.trunc(v);
        var f = leerFecha(String(v));
        if (f === null) { avisos.push(donde + ": «" + v + "» no es una fecha; se dejó vacía."); return null; }
        return f;
      }
      case "numero": case "entero": case "porcentaje": {
        var n = typeof v === "number" ? v : leerNumero(String(v).replace(/^US\$\s*|^\$\s*/i, ""));
        if (n === null || !isFinite(n)) { avisos.push(donde + ": «" + v + "» no es un número; se puso 0."); return 0; }
        if (col.tipo === "porcentaje" && n > 1 && n <= 100) { n = n / 100; }
        if (col.tipo === "entero" && !Number.isInteger(n)) { n = Math.round(n); }
        if (col.min !== undefined && n < col.min) { avisos.push(donde + ": " + n + " es menor que " + col.min + "; se ajustó."); n = col.min; }
        if (col.max !== undefined && n > col.max) { avisos.push(donde + ": " + n + " es mayor que " + col.max + "; se ajustó."); n = col.max; }
        return col.tipo === "entero" ? n : redondear(n, col.tipo === "porcentaje" ? 6 : 2);
      }
      case "lista": {
        var k = normal(v), hit = null;
        col.opciones.forEach(function (o) { if (normal(o) === k) hit = o; });
        if (!hit) col.opciones.forEach(function (o) { if (!hit && (normal(o).indexOf(k) === 0 || k.indexOf(normal(o)) === 0)) hit = o; });
        if (!hit) { avisos.push(donde + ": «" + v + "» no es una opción (" + col.opciones.join(", ") + "); se usó «" + col.opciones[0] + "»."); hit = col.opciones[0]; }
        return hit;
      }
      default: {
        var s = String(v).replace(/[\u0000-\u001f]/g, " ").trim();
        if (s.length > 80) { s = s.slice(0, 80); avisos.push(donde + ": texto recortado a 80 caracteres."); }
        if (s.charAt(0) === "=") s = "'" + s; // un texto nunca se vuelve fórmula
        return s;
      }
    }
  }

  // obj: lo que devolvió la IA. esquema: escenario.json. Devuelve {ok, escenario, avisos, errores}.
  function validarEscenario(esquema, obj) {
    var avisos = [], errores = [];
    if (typeof obj === "string") {
      var t = obj, i = t.indexOf("{"), j = t.lastIndexOf("}");
      try { obj = JSON.parse(i >= 0 && j > i ? t.slice(i, j + 1) : t); } catch (e) { return { ok: false, avisos: avisos, errores: ["La respuesta no es un JSON válido: " + e.message] }; }
    }
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return { ok: false, avisos: avisos, errores: ["La respuesta no es un objeto JSON."] };
    var out = { titulo: String(obj.titulo || "Escenario nuevo").slice(0, 90), supuestos: [], parametros: {}, tablas: {} };
    (Array.isArray(obj.supuestos) ? obj.supuestos : []).slice(0, 6).forEach(function (s) { out.supuestos.push(String(s).slice(0, 160)); });
    var params = obj.parametros && typeof obj.parametros === "object" ? obj.parametros : {};
    (esquema.parametros || []).forEach(function (p) {
      var v = params[p.celda];
      if (v === undefined) { var corto = p.celda.split("!")[1]; v = params[corto]; }
      if (v === undefined) return;
      if (v && typeof v === "object" && "valor" in v) v = v.valor;
      out.parametros[p.celda] = repararValor(p, v, avisos, p.etiqueta || p.celda);
    });
    Object.keys(params).forEach(function (k) { if (!(esquema.parametros || []).some(function (p) { return p.celda === k || p.celda.split("!")[1] === k; })) avisos.push("Se ignoró el parámetro «" + k + "»: no es una celda editable."); });
    var tablasIA = obj.tablas && typeof obj.tablas === "object" ? obj.tablas : {};
    var total = 0;
    (esquema.tablas || []).forEach(function (t) {
      var filas = tablasIA[t.tabla];
      if (filas === undefined) { var k = Object.keys(tablasIA).filter(function (x) { return normal(x) === normal(t.tabla) || normal(x) === normal(t.hoja); })[0]; if (k) filas = tablasIA[k]; }
      if (filas === undefined) return;
      if (!Array.isArray(filas)) { errores.push("La tabla «" + t.tabla + "» no es una lista de filas."); return; }
      var datos = t.columnas.filter(function (c) { return !c.calc && !c.fija && !c.derivar; });
      var limpias = [];
      filas.forEach(function (f, n) {
        if (limpias.length >= t.max_filas) { if (n === t.max_filas) avisos.push("«" + t.tabla + "»: se usan solo las primeras " + t.max_filas + " filas (el formato del caso no tiene más)."); return; }
        var fila = {};
        if (Array.isArray(f)) datos.forEach(function (c, k) { fila[c.nombre] = f[k]; });
        else if (f && typeof f === "object") {
          var claves = Object.keys(f);
          datos.forEach(function (c) {
            var k = claves.filter(function (x) { return x === c.nombre || normal(x) === normal(c.nombre) || x === c.col; })[0];
            if (k !== undefined) fila[c.nombre] = f[k];
          });
        } else { avisos.push("«" + t.tabla + "» fila " + (n + 1) + ": no es una fila; se descartó."); return; }
        var vacia = datos.every(function (c) { return fila[c.nombre] === undefined || fila[c.nombre] === null || fila[c.nombre] === ""; });
        if (vacia) { avisos.push("«" + t.tabla + "» fila " + (n + 1) + ": vacía; se descartó."); return; }
        var rep = {};
        datos.forEach(function (c) { rep[c.nombre] = repararValor(c, fila[c.nombre], avisos, t.tabla + " fila " + (n + 1) + " · " + c.nombre); });
        if (datos.some(function (c) { return c.tipo === "fecha" && rep[c.nombre] === null && c.obligatoria !== false; })) { avisos.push("«" + t.tabla + "» fila " + (n + 1) + ": sin fecha válida; se descartó."); return; }
        limpias.push(rep);
      });
      if (t.filas_fijas && limpias.length && limpias.length !== t.min_filas) avisos.push("«" + t.tabla + "» debe tener " + t.min_filas + " filas; se completó con las del caso.");
      if (limpias.length < (t.filas_fijas ? 1 : t.min_filas || 1)) { errores.push("«" + t.tabla + "» quedó con " + limpias.length + " filas válidas (mínimo " + (t.min_filas || 1) + ")."); return; }
      out.tablas[t.tabla] = limpias;
      total += limpias.length;
    });
    // Relaciones: «Pagos.Factura» debe existir en «Cobranzas.Factura»; las que no, se descartan.
    (esquema.relaciones || []).forEach(function (rel) {
      var de = rel.de.split("."), a = rel.a.split(".");
      var hijas = out.tablas[de[0]];
      if (!hijas) return;
      var padres = out.tablas[a[0]];
      var validos = {};
      (padres || []).forEach(function (f) { validos[normal(f[a[1]])] = f[a[1]]; });
      if (!padres) return; // la tabla madre no cambió: se valida al aplicar, contra la hoja
      out.tablas[de[0]] = hijas.filter(function (f, n) {
        var ok = validos[normal(f[de[1]])] !== undefined;
        if (ok) f[de[1]] = validos[normal(f[de[1]])];
        else avisos.push("«" + de[0] + "» fila " + (n + 1) + ": «" + f[de[1]] + "» no está en " + rel.a + "; se descartó.");
        return ok;
      });
    });
    if (!total && !Object.keys(out.parametros).length) errores.push("La respuesta no trae ni filas ni parámetros que se puedan cargar en esta hoja.");
    return { ok: !errores.length, escenario: out, avisos: avisos, errores: errores };
  }

  return {
    E: E, EXPLICA: EXPLICA, Err: Err, esErr: esErr, Libro: Libro, analizar: analizar, tokenizar: tokenizar, leerRef: leerRef,
    moverFormula: moverFormula, formulaEN: formulaEN, referencias: referencias, formatear: formatear, esFormatoFecha: esFormatoFecha,
    leerNumero: leerNumero, leerFecha: leerFecha, serial: serial, deSerial: deSerial, redondear: redondear, colNum: colNum,
    colLetras: colLetras, partir: partir, dir: dir, revisar: revisar, validarEscenario: validarEscenario, repararValor: repararValor,
    normal: normal, aTexto: aTexto, FUNCIONES: Object.keys(FN), ES_EN: ES_EN, MESES: MESES
  };
});
