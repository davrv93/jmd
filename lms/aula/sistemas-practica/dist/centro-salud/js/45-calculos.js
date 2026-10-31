/*
 * 45-calculos.js · Contexto para las fórmulas del config (objeto global Calc)
 * ----------------------------------------------------------------------------
 * Las fórmulas del config (calculados, calcular, reportes, indicadores,
 * reglas, alEmitir…) reciben un `ctx` con herramientas seguras:
 *   ctx.datos.listar/obtener/crear/actualizar/eliminar/contar
 *   ctx.param(id)       valor del parámetro del negocio (p. ej. 'igv' → 18)
 *   ctx.hoy(), ctx.usuario(), ctx.redondear(n), ctx.suma(arr, fn), ctx.agrupar(arr, fn)
 *   ctx.fmt.moneda/fecha/num/pct, ctx.fechaMas(s, dias), ctx.mes(s), ctx.diasEntre(a, b)
 * Importante: ctx.datos.crear/actualizar/eliminar LANZAN un Error si algo no
 * es válido (así alEmitir puede abortar la emisión), y trabajan "como el
 * sistema": no dependen de los permisos del usuario que emite.
 */
(function (global) {
  'use strict';

  var Calc = {};
  var ctxUnico = null;

  function lanzar(res, textoPorDefecto) {
    var msgs = [], k;
    if (res.ok) { return res; }
    for (k in res.errores) { if (Object.prototype.hasOwnProperty.call(res.errores, k)) { msgs.push(k + ': ' + res.errores[k]); } }
    msgs = msgs.concat(res.general || []);
    throw new Error(msgs.length ? msgs[0] : textoPorDefecto);
  }

  /** Construye (una sola vez) el contexto de cálculo. */
  Calc.ctx = function () {
    if (ctxUnico) { return ctxUnico; }
    ctxUnico = {
      datos: {
        listar: function (ent, fn) { return Datos.listar(ent, fn); },
        obtener: function (ent, id) { return Datos.obtener(ent, id); },
        contar: function (ent) { return Datos.contar(ent); },
        crear: function (ent, obj) { return lanzar(Datos.crear(ent, obj, { interno: true }), 'No se pudo crear el registro.').registro; },
        actualizar: function (ent, id, parche) { return lanzar(Datos.actualizar(ent, id, parche, { interno: true }), 'No se pudo actualizar el registro.').registro; },
        eliminar: function (ent, id) { lanzar(Datos.eliminar(ent, id, { interno: true }), 'No se pudo eliminar el registro.'); return true; }
      },
      param: function (id) {
        var v = Almacen.estado ? Almacen.estado.parametros[id] : undefined;
        return v === undefined ? 0 : v;
      },
      hoy: function () { return U.hoy(); },
      usuario: function () { return Seg.usuarioActual(); },
      redondear: function (n) { return U.redondear(n); },
      suma: function (arr, fn) { return U.suma(arr, fn); },
      agrupar: function (arr, fn) { return U.agrupar(arr, fn); },
      fmt: { moneda: U.fmt.moneda, fecha: U.fmt.fecha, num: U.fmt.num, pct: U.fmt.pct },
      fechaMas: function (s, dias) { return U.fechaMas(s, dias); },
      mes: function (s) { return U.mes(s); },
      diasEntre: function (a, b) { return U.diasEntre(a, b); }
    };
    return ctxUnico;
  };

  /**
   * Totales de un documento con op.calcular. Redondea cada total a 2 decimales y
   * reemplaza lo que no sea número por 0, para que un error del config no deje NaN en pantalla.
   */
  Calc.totales = function (op, doc) {
    var t, r = {}, k;
    if (!op.calcular) { return {}; }
    try { t = op.calcular(doc, Calc.ctx()) || {}; } catch (e) { t = {}; }
    for (k in t) {
      if (Object.prototype.hasOwnProperty.call(t, k)) { r[k] = typeof t[k] === 'number' && isFinite(t[k]) ? U.redondear(t[k]) : 0; }
    }
    return r;
  };

  global.Calc = Calc;
})(window);
