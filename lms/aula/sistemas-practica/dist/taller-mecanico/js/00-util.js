/*
 * 00-util.js · Utilidades generales (objeto global U)
 * ----------------------------------------------------------------------------
 * Funciones pequeñas y sin dependencias que usan todos los demás módulos:
 * escape de texto, creación de nodos DOM, formato de números y fechas, orden
 * estable, agrupación, CSV, descarga y lectura de archivos.
 * Todo es ES5. Lo que IE11 no trae (includes, padStart, Object.assign…) está
 * aquí con otro nombre: U.incluye, U.relleno, U.asignar…
 */
(function (global) {
  'use strict';

  var U = {};
  var tieneProp = Object.prototype.hasOwnProperty;

  /* ---------- Texto ---------- */

  /** Escapa &, <, >, comillas y apóstrofo. Toda salida de datos pasa por aquí o por textContent. */
  U.esc = function (valor) {
    if (valor === null || valor === undefined) { return ''; }
    return String(valor)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  /** Quita tildes y pasa a minúsculas (búsquedas y orden). */
  U.sinTildes = function (texto) {
    return String(texto === null || texto === undefined ? '' : texto).toLowerCase()
      .replace(/[áàäâ]/g, 'a').replace(/[éèëê]/g, 'e').replace(/[íìïî]/g, 'i')
      .replace(/[óòöô]/g, 'o').replace(/[úùüû]/g, 'u').replace(/ñ/g, 'n');
  };

  /** ¿El texto o arreglo contiene el elemento? (reemplaza a includes) */
  U.incluye = function (contenedor, x) {
    if (contenedor === null || contenedor === undefined) { return false; }
    return contenedor.indexOf(x) !== -1;
  };

  /** Rellena a la izquierda hasta n caracteres (reemplaza a padStart). */
  U.relleno = function (texto, n, car) {
    var s = String(texto);
    car = car === undefined ? '0' : car;
    while (s.length < n) { s = car + s; }
    return s;
  };

  /** ¿Empieza con…? (reemplaza a startsWith) */
  U.empiezaCon = function (texto, prefijo) {
    return String(texto).slice(0, prefijo.length) === prefijo;
  };

  /** ¿Termina con…? (reemplaza a endsWith) */
  U.terminaCon = function (texto, sufijo) {
    var s = String(texto);
    return sufijo.length <= s.length && s.slice(s.length - sufijo.length) === sufijo;
  };

  /** Repite un texto n veces (reemplaza a repeat). */
  U.repetir = function (texto, n) {
    var s = '', i;
    for (i = 0; i < n; i++) { s += texto; }
    return s;
  };

  /* ---------- Objetos y arreglos ---------- */

  /** Copia profunda por JSON (solo datos, sin funciones ni fechas). */
  U.clonar = function (obj) {
    if (obj === undefined) { return undefined; }
    return JSON.parse(JSON.stringify(obj));
  };

  /** Copia las propiedades de las fuentes al destino (reemplaza a Object.assign). */
  U.asignar = function (destino) {
    var i, k, fuente;
    for (i = 1; i < arguments.length; i++) {
      fuente = arguments[i];
      if (!fuente) { continue; }
      for (k in fuente) {
        if (tieneProp.call(fuente, k)) { destino[k] = fuente[k]; }
      }
    }
    return destino;
  };

  /** Primer elemento que cumple la condición, o null (reemplaza a find). */
  U.buscar = function (arreglo, fn) {
    var i;
    for (i = 0; i < arreglo.length; i++) {
      if (fn(arreglo[i], i)) { return arreglo[i]; }
    }
    return null;
  };

  /** Posición del primer elemento que cumple la condición, o -1 (reemplaza a findIndex). */
  U.posicion = function (arreglo, fn) {
    var i;
    for (i = 0; i < arreglo.length; i++) {
      if (fn(arreglo[i], i)) { return i; }
    }
    return -1;
  };

  /** Suma los valores que devuelve fn(elemento). Sin fn suma los elementos. */
  U.suma = function (arreglo, fn) {
    var total = 0, i, v;
    for (i = 0; i < (arreglo || []).length; i++) {
      v = fn ? fn(arreglo[i], i) : arreglo[i];
      if (typeof v === 'number' && isFinite(v)) { total += v; }
    }
    return total;
  };

  /** Agrupa por la clave que devuelve fn: { clave: [elementos] }. */
  U.agrupar = function (arreglo, fn) {
    var grupos = {}, i, clave;
    for (i = 0; i < (arreglo || []).length; i++) {
      clave = String(fn(arreglo[i], i));
      if (!tieneProp.call(grupos, clave)) { grupos[clave] = []; }
      grupos[clave].push(arreglo[i]);
    }
    return grupos;
  };

  /** Claves de un objeto, ordenadas alfabéticamente. */
  U.claves = function (obj) {
    var r = [], k;
    for (k in obj) { if (tieneProp.call(obj, k)) { r.push(k); } }
    r.sort();
    return r;
  };

  /** Compara dos valores: números por valor, texto sin tildes ni mayúsculas, vacíos al final. */
  U.comparar = function (a, b) {
    var va = (a === null || a === undefined || a === '');
    var vb = (b === null || b === undefined || b === '');
    if (va && vb) { return 0; }
    if (va) { return 1; }
    if (vb) { return -1; }
    if (typeof a === 'number' && typeof b === 'number') { return a - b; }
    a = U.sinTildes(a); b = U.sinTildes(b);
    return a < b ? -1 : (a > b ? 1 : 0);
  };

  /** Orden ESTABLE (Array.sort no lo garantiza en navegadores viejos). Devuelve una copia. */
  U.ordenar = function (arreglo, cmp) {
    var tmp = [], i;
    for (i = 0; i < arreglo.length; i++) { tmp.push({ v: arreglo[i], i: i }); }
    tmp.sort(function (x, y) {
      var r = cmp(x.v, y.v);
      return r !== 0 ? r : x.i - y.i;
    });
    for (i = 0; i < tmp.length; i++) { tmp[i] = tmp[i].v; }
    return tmp;
  };

  /** Identificador corto aleatorio con prefijo. */
  U.uid = function (prefijo) {
    return (prefijo || 'id') + '-' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
  };

  /* ---------- Números ---------- */

  /** Redondea a 2 decimales (mitad hacia afuera, tolerante al error binario). */
  U.redondear = function (n) {
    var signo = n < 0 ? -1 : 1;
    if (typeof n !== 'number' || !isFinite(n)) { return 0; }
    return signo * Math.round(Math.abs(n) * 100 + 1e-7) / 100;
  };

  /** Convierte a número o devuelve null. Acepta "12,5" y "1 200.50". */
  U.numero = function (v) {
    var s;
    if (typeof v === 'number') { return isFinite(v) ? v : null; }
    if (typeof v !== 'string') { return null; }
    s = v.replace(/\s/g, '');
    if (s === '') { return null; }
    if (s.indexOf(',') !== -1 && s.indexOf('.') === -1) { s = s.replace(',', '.'); }
    if (!/^-?\d+(\.\d+)?$/.test(s)) { return null; }
    return parseFloat(s);
  };

  /* ---------- Fechas (ISO AAAA-MM-DD, hora local) ---------- */

  /** Convierte 'AAAA-MM-DD' a Date (mediodía local) o null si no es una fecha real. */
  U.parseFecha = function (s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s));
    var d;
    if (!m) { return null; }
    d = new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10), 12, 0, 0);
    if (d.getFullYear() !== parseInt(m[1], 10) || d.getMonth() !== parseInt(m[2], 10) - 1 || d.getDate() !== parseInt(m[3], 10)) { return null; }
    return d;
  };

  /** ¿Es una fecha ISO válida? */
  U.esFecha = function (s) { return U.parseFecha(s) !== null; };

  /** Date → 'AAAA-MM-DD'. */
  U.fechaISO = function (d) {
    return d.getFullYear() + '-' + U.relleno(d.getMonth() + 1, 2) + '-' + U.relleno(d.getDate(), 2);
  };

  /** Fecha de hoy. */
  U.hoy = function () { return U.fechaISO(new Date()); };

  /** Marca de tiempo completa en ISO (para la bitácora). */
  U.ahoraISO = function () { return new Date().toISOString(); };

  /** Suma días a una fecha ISO. */
  U.fechaMas = function (s, dias) {
    var d = U.parseFecha(s);
    if (!d) { return s; }
    d.setDate(d.getDate() + dias);
    return U.fechaISO(d);
  };

  /** 'AAAA-MM' de una fecha ISO. */
  U.mes = function (s) { return String(s || '').slice(0, 7); };

  /** Días entre dos fechas ISO (b - a). */
  U.diasEntre = function (a, b) {
    var da = U.parseFecha(a), db = U.parseFecha(b);
    if (!da || !db) { return 0; }
    return Math.round((db.getTime() - da.getTime()) / 86400000);
  };

  /** Resuelve 'hoy' y '@-45' (hoy menos 45 días). Cualquier otro valor se devuelve igual. */
  U.resolverFecha = function (v) {
    var m;
    if (v === 'hoy') { return U.hoy(); }
    m = /^@(-?\d+)$/.exec(String(v));
    if (m) { return U.fechaMas(U.hoy(), parseInt(m[1], 10)); }
    return v;
  };

  /** Recorre un dato (objeto/arreglo) y resuelve 'hoy' / '@-n' en todas sus cadenas. */
  U.resolverFechas = function (dato) {
    var i, k;
    if (typeof dato === 'string') { return U.resolverFecha(dato); }
    if (Array.isArray(dato)) {
      for (i = 0; i < dato.length; i++) { dato[i] = U.resolverFechas(dato[i]); }
      return dato;
    }
    if (dato && typeof dato === 'object') {
      for (k in dato) { if (tieneProp.call(dato, k)) { dato[k] = U.resolverFechas(dato[k]); } }
    }
    return dato;
  };

  /* ---------- Formato ---------- */

  function formatearNumero(n, dec) {
    var neg, s, partes, ent;
    if (typeof n !== 'number' || !isFinite(n)) { return ''; }
    dec = dec === undefined ? 0 : dec;
    neg = n < 0;
    s = Math.abs(n).toFixed(dec);
    if (parseFloat(s) === 0) { neg = false; }
    partes = s.split('.');
    ent = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (neg ? '-' : '') + ent + (partes[1] ? '.' + partes[1] : '');
  }

  U.fmt = {
    /** 1234.5 → "S/ 1,234.50" (símbolo de SISTEMA.moneda). */
    moneda: function (n, simbolo) {
      var sim = simbolo || (global.SISTEMA && global.SISTEMA.moneda) || 'S/';
      var t = formatearNumero(Number(n) || 0, 2);
      return t.charAt(0) === '-' ? '-' + sim + ' ' + t.slice(1) : sim + ' ' + t;
    },
    /** '2026-10-31' → '31/10/2026'. */
    fecha: function (s) {
      var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || ''));
      return m ? m[3] + '/' + m[2] + '/' + m[1] : '';
    },
    /** ISO completo → '31/10/2026 14:05:09' (hora local). */
    fechaHora: function (iso) {
      var d = new Date(iso);
      if (isNaN(d.getTime())) { return ''; }
      return U.relleno(d.getDate(), 2) + '/' + U.relleno(d.getMonth() + 1, 2) + '/' + d.getFullYear() + ' ' +
        U.relleno(d.getHours(), 2) + ':' + U.relleno(d.getMinutes(), 2) + ':' + U.relleno(d.getSeconds(), 2);
    },
    /** Número con separador de miles. */
    num: function (n, dec) { return formatearNumero(Number(n) || 0, dec); },
    /** 18 → "18 %". */
    pct: function (n, dec) {
      var t = formatearNumero(Number(n) || 0, dec === undefined ? 2 : dec);
      if (t.indexOf('.') !== -1) { t = t.replace(/0+$/, '').replace(/\.$/, ''); }
      return t + ' %';
    }
  };

  /** Formatea según el tipo de dato (moneda, numero, entero, porcentaje, fecha, texto…). */
  U.formatear = function (valor, tipo) {
    if (valor === null || valor === undefined || valor === '') { return ''; }
    if (tipo === 'moneda') { return U.fmt.moneda(valor); }
    if (tipo === 'numero') { return U.fmt.num(valor, 2); }
    if (tipo === 'entero') { return U.fmt.num(valor, 0); }
    if (tipo === 'porcentaje') { return U.fmt.pct(valor); }
    if (tipo === 'fecha') { return U.fmt.fecha(valor); }
    if (tipo === 'booleano') { return valor ? 'Sí' : 'No'; }
    return String(valor);
  };

  /* ---------- DOM ---------- */

  /** Agrega hijos (texto, nodo o arreglo anidado) a un nodo. */
  U.anexar = function (nodo, hijos) {
    var i;
    if (hijos === null || hijos === undefined || hijos === false) { return nodo; }
    if (Array.isArray(hijos)) {
      for (i = 0; i < hijos.length; i++) { U.anexar(nodo, hijos[i]); }
    } else if (typeof hijos === 'object' && hijos.nodeType) {
      nodo.appendChild(hijos);
    } else {
      nodo.appendChild(document.createTextNode(String(hijos)));
    }
    return nodo;
  };

  /**
   * Crea un elemento. attrs especiales: clase, texto, on:{evento:fn}, estilo:{prop:valor},
   * props:{propiedadDOM:valor}. El resto se pone con setAttribute (null/false se omiten).
   * Nunca usa innerHTML: el texto entra siempre como nodo de texto.
   */
  U.el = function (etiqueta, attrs, hijos) {
    var n = document.createElement(etiqueta), k, e, v;
    if (attrs) {
      for (k in attrs) {
        if (!tieneProp.call(attrs, k)) { continue; }
        v = attrs[k];
        if (v === null || v === undefined || v === false) { continue; }
        if (k === 'clase') { n.className = v; }
        else if (k === 'texto') { n.appendChild(document.createTextNode(String(v))); }
        else if (k === 'on') { for (e in v) { if (tieneProp.call(v, e)) { n.addEventListener(e, v[e], false); } } }
        else if (k === 'estilo') { for (e in v) { if (tieneProp.call(v, e)) { n.style[e] = v[e]; } } }
        else if (k === 'props') { for (e in v) { if (tieneProp.call(v, e)) { n[e] = v[e]; } } }
        else { n.setAttribute(k, v === true ? k : String(v)); }
      }
    }
    U.anexar(n, hijos);
    return n;
  };

  /** Vacía un nodo. */
  U.vaciar = function (nodo) {
    while (nodo.firstChild) { nodo.removeChild(nodo.firstChild); }
    return nodo;
  };

  /** Quita un nodo de su padre (reemplaza a Element.remove). */
  U.quitar = function (nodo) {
    if (nodo && nodo.parentNode) { nodo.parentNode.removeChild(nodo); }
  };

  /** ¿El nodo tiene la clase? (no usamos classList: no existe en SVG de IE11) */
  U.tieneClase = function (nodo, clase) {
    return (' ' + (nodo.getAttribute('class') || '') + ' ').indexOf(' ' + clase + ' ') !== -1;
  };

  /** Agrega una clase. */
  U.agregarClase = function (nodo, clase) {
    if (!U.tieneClase(nodo, clase)) { nodo.setAttribute('class', ((nodo.getAttribute('class') || '') + ' ' + clase).replace(/^\s+/, '')); }
  };

  /** Quita una clase. */
  U.quitarClase = function (nodo, clase) {
    var c = (' ' + (nodo.getAttribute('class') || '') + ' ').replace(' ' + clase + ' ', ' ');
    nodo.setAttribute('class', c.replace(/^\s+|\s+$/g, ''));
  };

  /** Primer ancestro (o el propio nodo) que cumple fn (reemplaza a closest). */
  U.ancestro = function (nodo, fn) {
    while (nodo && nodo.nodeType === 1) {
      if (fn(nodo)) { return nodo; }
      nodo = nodo.parentNode;
    }
    return null;
  };

  /** Crea un nodo SVG. attrs se ponen con setAttribute. */
  U.svg = function (etiqueta, attrs, hijos) {
    var n = document.createElementNS('http://www.w3.org/2000/svg', etiqueta), k;
    if (attrs) { for (k in attrs) { if (tieneProp.call(attrs, k) && attrs[k] !== null && attrs[k] !== undefined) { n.setAttribute(k, String(attrs[k])); } } }
    U.anexar(n, hijos);
    return n;
  };

  /* ---------- CSV, descarga y lectura de archivos ---------- */

  /** Celda CSV: comillas si hace falta y neutraliza fórmulas (=, +, -, @) en textos. */
  U.celdaCsv = function (v) {
    var s;
    if (v === null || v === undefined) { return ''; }
    if (typeof v === 'number') { return isFinite(v) ? String(v) : ''; }
    if (typeof v === 'boolean') { return v ? 'Sí' : 'No'; }
    s = String(v);
    if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) { s = "'" + s; }
    if (/[",;\r\n]/.test(s)) { s = '"' + s.replace(/"/g, '""') + '"'; }
    return s;
  };

  /** Filas (arreglo de arreglos) → texto CSV con saltos de línea \r\n. */
  U.csv = function (filas) {
    var out = [], i, j, linea;
    for (i = 0; i < filas.length; i++) {
      linea = [];
      for (j = 0; j < filas[i].length; j++) { linea.push(U.celdaCsv(filas[i][j])); }
      out.push(linea.join(','));
    }
    return out.join('\r\n');
  };

  /** Descarga un texto como archivo. Devuelve false si el navegador no puede. */
  U.descargar = function (nombre, texto, mime) {
    var blob, url, a, URLapi;
    try {
      blob = new Blob([texto], { type: mime || 'text/plain;charset=utf-8' });
      if (navigator.msSaveBlob) { navigator.msSaveBlob(blob, nombre); return true; }
      URLapi = global.URL || global.webkitURL;
      url = URLapi.createObjectURL(blob);
      a = U.el('a', { href: url, download: nombre, 'aria-hidden': 'true' });
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { U.quitar(a); URLapi.revokeObjectURL(url); }, 1500);
      return true;
    } catch (e) {
      return false;
    }
  };

  /** Lee un archivo de texto (máx. 5 MB). cb(error, texto). */
  U.leerArchivo = function (archivo, cb) {
    var lector;
    if (!archivo) { cb('No se eligió ningún archivo.'); return; }
    if (archivo.size > 5 * 1024 * 1024) { cb('El archivo supera los 5 MB.'); return; }
    lector = new FileReader();
    lector.onload = function () { cb(null, String(lector.result)); };
    lector.onerror = function () { cb('No se pudo leer el archivo.'); };
    lector.readAsText(archivo, 'UTF-8');
  };

  global.U = U;
})(window);
