/*
 * 35-auditoria.js · Bitácora de auditoría (objeto global Aud)
 * ----------------------------------------------------------------------------
 * Cada acción relevante deja una entrada: quién, cuándo, qué hizo, sobre qué
 * entidad y registro, y cómo estaba antes y después. Si cadenaBitacora está
 * activa, cada entrada incluye el hash de la anterior (como una cadena de
 * bloques sencilla): editar, borrar o reordenar una entrada rompe la cadena y
 * Aud.verificar() lo detecta. Con cadenaBitacora = false (modo débil) no hay
 * hashes y la verificación avisa que no puede comprobar nada.
 *   Aud.registrar(accion, entidad, id, antes, despues, detalle[, actor])
 *   Aud.verificar() → { ok, total, encadenada, mensaje, fallaEn }
 *   Aud.listar()    → entradas, la más reciente primero
 */
(function (global) {
  'use strict';

  var Aud = {};

  function genesis() { return Sha.hex('génesis:' + global.SISTEMA.id); }

  /* Quita sal y hash de usuarios y recorta textos enormes antes de guardar. */
  function limpio(obj) {
    var c, k;
    if (obj === null || obj === undefined) { return null; }
    c = U.clonar(obj);
    if (c && typeof c === 'object') {
      delete c.hash; delete c.sal;
      for (k in c) {
        if (Object.prototype.hasOwnProperty.call(c, k) && typeof c[k] === 'string' && c[k].length > 500) { c[k] = c[k].slice(0, 500) + '…'; }
      }
    }
    return c;
  }

  /* Contenido que entra en el hash de una entrada (todo menos el propio hash). */
  function contenido(e) {
    return Almacen.canonico({
      n: e.n, fecha: e.fecha, usuario: e.usuario, rol: e.rol, accion: e.accion, entidad: e.entidad,
      id: e.id, antes: e.antes, despues: e.despues, detalle: e.detalle, prev: e.prev
    });
  }

  /**
   * Agrega una entrada a la bitácora. El actor es el usuario con sesión; para
   * eventos sin sesión (intento de ingreso) se pasa 'anónimo' o 'sistema'.
   */
  Aud.registrar = function (accion, entidad, id, antes, despues, detalle, actor) {
    var est = Almacen.estado, meta = est.bitacoraMeta, u = Seg.usuarioActual(), e;
    e = {
      n: meta.n + 1, fecha: U.ahoraISO(), usuario: actor || (u ? u.usuario : 'sistema'), rol: u && !actor ? u.rol : '',
      accion: accion, entidad: entidad || '', id: id === undefined || id === null ? '' : String(id),
      antes: limpio(antes), despues: limpio(despues), detalle: detalle || '', prev: '', hash: ''
    };
    if (Seg.cfg('cadenaBitacora')) {
      e.prev = meta.ultimo || genesis();
      e.hash = Sha.hex(contenido(e));
      meta.ultimo = e.hash;
    }
    meta.n = e.n;
    est.bitacora.push(e);
    Almacen.guardar();
    return e;
  };

  /** Todas las entradas, la más reciente primero (copia del arreglo, mismos objetos). */
  Aud.listar = function () {
    var r = Almacen.estado.bitacora.slice(0);
    r.reverse();
    return r;
  };

  /**
   * Recorre la cadena y recalcula cada hash. Detecta entradas editadas, borradas,
   * insertadas o reordenadas, y el truncamiento del final (con la marca bitacoraMeta).
   */
  Aud.verificar = function () {
    var est = Almacen.estado, lista = est.bitacora, prev = genesis(), i, e, hay = 0;
    for (i = 0; i < lista.length; i++) { if (lista[i].hash) { hay++; } }
    if (lista.length === 0) { return { ok: true, total: 0, encadenada: false, mensaje: 'La bitácora está vacía.' }; }
    if (hay === 0) {
      return { ok: true, total: lista.length, encadenada: false, mensaje: 'La bitácora no está encadenada (cadenaBitacora desactivada): no se puede comprobar si alguien la alteró.' };
    }
    for (i = 0; i < lista.length; i++) {
      e = lista[i];
      if (!e.hash) { return { ok: false, total: lista.length, encadenada: true, fallaEn: e.n, mensaje: 'La entrada ' + e.n + ' no tiene hash: la cadena está rota.' }; }
      if (e.prev !== prev) { return { ok: false, total: lista.length, encadenada: true, fallaEn: e.n, mensaje: 'La entrada ' + e.n + ' no enlaza con la anterior: se borró o se movió algo.' }; }
      if (!Sha.igual(Sha.hex(contenido(e)), e.hash)) { return { ok: false, total: lista.length, encadenada: true, fallaEn: e.n, mensaje: 'La entrada ' + e.n + ' fue modificada después de registrarse.' }; }
      prev = e.hash;
    }
    if (est.bitacoraMeta && (est.bitacoraMeta.n !== lista[lista.length - 1].n || est.bitacoraMeta.ultimo !== prev)) {
      return { ok: false, total: lista.length, encadenada: true, fallaEn: lista[lista.length - 1].n, mensaje: 'Faltan entradas al final de la bitácora: el último registro no coincide con la marca guardada.' };
    }
    return { ok: true, total: lista.length, encadenada: true, mensaje: 'Integridad verificada: ' + lista.length + ' entradas, la cadena de hashes está completa y sin alteraciones.' };
  };

  global.Aud = Aud;
})(window);
