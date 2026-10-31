/*
 * 20-almacen.js · Persistencia de datos (objeto global Almacen)
 * ----------------------------------------------------------------------------
 * Guarda TODO el estado del sistema como un solo JSON bajo la clave sis_<id>_v1.
 * Cadena de respaldo: localStorage → window.name → memoria. Si el navegador
 * bloquea el primero (pasa en algunos file://), el sistema sigue funcionando y
 * Almacen.aviso explica la limitación.
 * También exporta/importa respaldos con checksum SHA-256 y valida su estructura.
 *   Almacen.iniciar(id)        → { nuevo, danado } carga el estado guardado
 *   Almacen.estado             → el objeto de estado (siempre léelo desde aquí)
 *   Almacen.guardar()          → persiste el estado actual
 *   Almacen.vacio()            → estado en blanco (lo llena Datos.sembrar)
 *   Almacen.exportar()         → texto JSON del respaldo
 *   Almacen.importar(texto)    → { ok, error } (no toca nada si algo falla)
 *   Almacen.instantanea() / Almacen.restaurarInstantanea(s)  → deshacer en bloque
 *   Almacen.sesionLeer/sesionGuardar/sesionBorrar            → sesión de la pestaña
 */
(function (global) {
  'use strict';

  var ESQUEMA = 1;
  var Almacen = { ESQUEMA: ESQUEMA, estado: null, modo: 'localStorage', aviso: '', clave: '', id: '' };
  var memoria = null;       // último texto guardado cuando no hay otro medio
  var memoriaSesion = null; // sesión cuando sessionStorage no sirve

  /* ---------- Medios de almacenamiento ---------- */

  function probarLocalStorage() {
    try {
      var k = '__sis_prueba__';
      global.localStorage.setItem(k, '1');
      global.localStorage.removeItem(k);
      return true;
    } catch (e) {
      return false;
    }
  }

  function prefijoNombre() { return 'SIS|' + Almacen.clave + '|'; }

  function leerCrudo() {
    var n;
    if (Almacen.modo === 'localStorage') {
      try { return global.localStorage.getItem(Almacen.clave); } catch (e) { Almacen.modo = 'window.name'; }
    }
    if (Almacen.modo === 'window.name') {
      try {
        n = String(global.name || '');
        if (n.indexOf(prefijoNombre()) === 0) { return n.slice(prefijoNombre().length); }
        return null;
      } catch (e2) { Almacen.modo = 'memoria'; }
    }
    return memoria;
  }

  function avisoDeModo() {
    if (Almacen.modo === 'window.name') {
      Almacen.aviso = 'Tu navegador bloquea el almacenamiento local. Los datos se guardan solo en esta pestaña (window.name) y se perderán al cerrarla. Usa Respaldo para exportarlos.';
    } else if (Almacen.modo === 'memoria') {
      Almacen.aviso = 'No hay dónde guardar los datos en este navegador. Todo se perderá al recargar la página. Usa Respaldo para exportarlos.';
    } else {
      Almacen.aviso = '';
    }
  }

  function escribirCrudo(texto) {
    if (Almacen.modo === 'localStorage') {
      try { global.localStorage.setItem(Almacen.clave, texto); return; } catch (e) { Almacen.modo = 'window.name'; avisoDeModo(); }
    }
    if (Almacen.modo === 'window.name') {
      try { global.name = prefijoNombre() + texto; return; } catch (e2) { Almacen.modo = 'memoria'; avisoDeModo(); }
    }
    memoria = texto;
  }

  /* ---------- Estado ---------- */

  /** Estado en blanco con todas las colecciones del config. */
  Almacen.vacio = function () {
    var C = global.SISTEMA, est, i;
    est = {
      esquema: ESQUEMA, sistema: C.id, version: C.version, creado: U.ahoraISO(),
      usuarios: [], parametros: {}, contadores: {}, entidades: {}, operaciones: {},
      bitacora: [], bitacoraMeta: { n: 0, ultimo: '' }, intentos: {}
    };
    for (i = 0; i < (C.entidades || []).length; i++) { est.entidades[C.entidades[i].id] = []; }
    for (i = 0; i < (C.operaciones || []).length; i++) { est.operaciones[C.operaciones[i].id] = []; }
    return est;
  };

  /** Completa colecciones que falten (por ejemplo si el config ganó una entidad). */
  function completar(est) {
    var C = global.SISTEMA, i, base = Almacen.vacio(), k;
    for (k in base) {
      if (Object.prototype.hasOwnProperty.call(base, k) && est[k] === undefined) { est[k] = base[k]; }
    }
    for (i = 0; i < (C.entidades || []).length; i++) {
      if (!Array.isArray(est.entidades[C.entidades[i].id])) { est.entidades[C.entidades[i].id] = []; }
    }
    for (i = 0; i < (C.operaciones || []).length; i++) {
      if (!Array.isArray(est.operaciones[C.operaciones[i].id])) { est.operaciones[C.operaciones[i].id] = []; }
    }
    return est;
  }

  /**
   * Revisa que un estado (guardado o importado) tenga forma válida.
   * Devuelve '' si todo bien o un mensaje en español con el primer problema.
   */
  function validarEstado(est) {
    var C = global.SISTEMA, i, u, rolesOk = {}, admins = 0, k, lista, j;
    if (!est || typeof est !== 'object' || Array.isArray(est)) { return 'El contenido no es un estado válido.'; }
    if (typeof est.esquema !== 'number' || est.esquema > ESQUEMA) { return 'El respaldo viene de una versión más nueva del sistema (esquema ' + est.esquema + ').'; }
    if (!Array.isArray(est.usuarios) || est.usuarios.length === 0) { return 'El respaldo no trae usuarios.'; }
    for (i = 0; i < C.roles.length; i++) { rolesOk[C.roles[i].id] = true; }
    for (i = 0; i < est.usuarios.length; i++) {
      u = est.usuarios[i];
      if (!u || typeof u.usuario !== 'string' || typeof u.hash !== 'string' || typeof u.sal !== 'string' || !/^[0-9a-f]{64}$/.test(u.hash)) { return 'Un usuario del respaldo está incompleto o dañado.'; }
      if (!rolesOk[u.rol]) { return 'El usuario «' + u.usuario + '» tiene un rol que este sistema no conoce.'; }
      if (u.rol === 'admin' && u.activo !== false) { admins++; }
    }
    if (admins === 0) { return 'El respaldo no trae ningún administrador activo.'; }
    if (!est.entidades || typeof est.entidades !== 'object' || !est.operaciones || typeof est.operaciones !== 'object') { return 'Faltan las colecciones de datos.'; }
    for (i = 0; i < (C.entidades || []).length; i++) {
      lista = est.entidades[C.entidades[i].id];
      if (lista === undefined) { continue; }
      if (!Array.isArray(lista)) { return 'La colección «' + C.entidades[i].id + '» está dañada.'; }
      for (j = 0; j < lista.length; j++) { if (!lista[j] || typeof lista[j] !== 'object' || typeof lista[j].id !== 'string') { return 'Hay un registro sin identificador en «' + C.entidades[i].id + '».'; } }
    }
    for (i = 0; i < (C.operaciones || []).length; i++) {
      lista = est.operaciones[C.operaciones[i].id];
      if (lista === undefined) { continue; }
      if (!Array.isArray(lista)) { return 'La colección «' + C.operaciones[i].id + '» está dañada.'; }
      for (j = 0; j < lista.length; j++) {
        if (!lista[j] || typeof lista[j] !== 'object' || typeof lista[j].id !== 'string') { return 'Hay un documento sin identificador en «' + C.operaciones[i].id + '».'; }
        if (lista[j].lineas !== undefined && !Array.isArray(lista[j].lineas)) { return 'Un documento de «' + C.operaciones[i].id + '» tiene líneas dañadas.'; }
      }
    }
    if (!Array.isArray(est.bitacora)) { return 'La bitácora del respaldo está dañada.'; }
    for (k in { parametros: 1, contadores: 1 }) {
      if (est[k] !== undefined && (typeof est[k] !== 'object' || Array.isArray(est[k]) || est[k] === null)) { return 'La sección «' + k + '» está dañada.'; }
    }
    return '';
  }

  /** Orden canónico de claves para que el checksum no dependa del orden de escritura. */
  Almacen.canonico = function (obj) {
    var partes = [], i, k, claves;
    if (obj === null || typeof obj !== 'object') { return JSON.stringify(obj === undefined ? null : obj); }
    if (Array.isArray(obj)) {
      for (i = 0; i < obj.length; i++) { partes.push(Almacen.canonico(obj[i])); }
      return '[' + partes.join(',') + ']';
    }
    claves = U.claves(obj);
    for (i = 0; i < claves.length; i++) {
      k = claves[i];
      if (obj[k] !== undefined) { partes.push(JSON.stringify(k) + ':' + Almacen.canonico(obj[k])); }
    }
    return '{' + partes.join(',') + '}';
  };

  /**
   * Carga el estado guardado. Devuelve { nuevo: true } si no había nada (o estaba
   * dañado: entonces danado: true y el texto viejo se conserva en otra clave).
   */
  Almacen.iniciar = function (id) {
    var crudo, est, problema;
    Almacen.id = id;
    Almacen.clave = 'sis_' + id + '_v1';
    Almacen.modo = probarLocalStorage() ? 'localStorage' : 'window.name';
    avisoDeModo();
    crudo = leerCrudo();
    if (crudo === null || crudo === undefined) { Almacen.estado = null; return { nuevo: true, danado: false }; }
    try {
      est = JSON.parse(crudo);
      problema = validarEstado(est);
    } catch (e) {
      problema = 'El texto guardado no es JSON.';
    }
    if (problema) {
      try { if (Almacen.modo === 'localStorage') { global.localStorage.setItem(Almacen.clave + '_danado', crudo); } } catch (e3) { /* sin espacio: se pierde la copia */ }
      Almacen.estado = null;
      return { nuevo: true, danado: true, motivo: problema };
    }
    Almacen.estado = completar(est);
    return { nuevo: false, danado: false };
  };

  /** Persiste el estado actual. */
  Almacen.guardar = function () {
    if (!Almacen.estado) { return; }
    Almacen.estado.actualizado = U.ahoraISO();
    escribirCrudo(JSON.stringify(Almacen.estado));
  };

  /** Foto del estado (texto) para poder volver atrás si una operación falla a medias. */
  Almacen.instantanea = function () { return JSON.stringify(Almacen.estado); };

  /** Vuelve a una foto tomada con instantanea() y la guarda. */
  Almacen.restaurarInstantanea = function (texto) {
    Almacen.estado = JSON.parse(texto);
    Almacen.guardar();
  };

  /* ---------- Respaldo ---------- */

  /** Respaldo completo (usuarios con sus hashes incluidos) con checksum de integridad. */
  Almacen.exportar = function () {
    var C = global.SISTEMA;
    var sobre = {
      formato: 'sistema-practica-respaldo', sistema: C.id, version: C.version, esquema: ESQUEMA,
      fecha: U.ahoraISO(), checksum: Sha.hex(Almacen.canonico(Almacen.estado)), datos: Almacen.estado
    };
    return JSON.stringify(sobre, null, 1);
  };

  /** Restaura un respaldo. Verifica formato, sistema, checksum y estructura antes de tocar nada. */
  Almacen.importar = function (texto) {
    var sobre, problema, nuevo;
    try { sobre = JSON.parse(texto); } catch (e) { return { ok: false, error: 'El archivo no es un respaldo válido (no se pudo leer como JSON).' }; }
    if (!sobre || sobre.formato !== 'sistema-practica-respaldo' || typeof sobre.checksum !== 'string' || !sobre.datos) {
      return { ok: false, error: 'El archivo no tiene el formato de un respaldo de este sistema.' };
    }
    if (sobre.sistema !== global.SISTEMA.id) {
      return { ok: false, error: 'El respaldo pertenece a otro sistema («' + String(sobre.sistema).slice(0, 40) + '»).' };
    }
    if (!Sha.igual(Sha.hex(Almacen.canonico(sobre.datos)), sobre.checksum)) {
      return { ok: false, error: 'El checksum no coincide: el archivo fue modificado o está dañado. No se restauró nada.' };
    }
    problema = validarEstado(sobre.datos);
    if (problema) { return { ok: false, error: problema }; }
    nuevo = completar(sobre.datos);
    Almacen.estado = nuevo;
    Almacen.guardar();
    return { ok: true };
  };

  /** Borra lo guardado y deja un estado en blanco (la demostración se vuelve a sembrar). */
  Almacen.reiniciar = function () {
    Almacen.estado = Almacen.vacio();
    Almacen.guardar();
  };

  /* ---------- Sesión de la pestaña ---------- */

  /** Lee la sesión guardada en sessionStorage (o memoria). */
  Almacen.sesionLeer = function () {
    var t;
    try { t = global.sessionStorage.getItem(Almacen.clave + '_ses'); } catch (e) { t = memoriaSesion; }
    if (!t) { return null; }
    try { return JSON.parse(t); } catch (e2) { return null; }
  };

  /** Guarda la sesión de la pestaña. */
  Almacen.sesionGuardar = function (ses) {
    var t = JSON.stringify(ses);
    memoriaSesion = t;
    try { global.sessionStorage.setItem(Almacen.clave + '_ses', t); } catch (e) { /* queda en memoria */ }
  };

  /** Borra la sesión. */
  Almacen.sesionBorrar = function () {
    memoriaSesion = null;
    try { global.sessionStorage.removeItem(Almacen.clave + '_ses'); } catch (e) { /* nada */ }
  };

  global.Almacen = Almacen;
})(window);
