/*
 * 70-reportes.js · Reportes (objeto global Reportes)
 * ----------------------------------------------------------------------------
 * Ejecuta los reportes del config: arma el formulario de filtros a partir de
 * `parametros`, llama a `ejecutar(p, ctx)` y muestra resumen, gráfico y tabla.
 * Permite exportar a CSV e imprimir. El permiso por rol lo decide Seg.puede('r', …):
 * un reporte SIN `roles` en el config queda abierto a cualquier usuario con sesión.
 *   Reportes.vista(id) → { titulo, migas, acciones, nodo }
 */
(function (global) {
  'use strict';

  var Reportes = {};

  function capital(t) { return t.charAt(0).toUpperCase() + t.slice(1); }

  /* Convierte los parámetros del reporte en campos de formulario. */
  function camposDe(rep) {
    var r = [], i, p;
    for (i = 0; i < (rep.parametros || []).length; i++) {
      p = rep.parametros[i];
      r.push(U.asignar({ etiqueta: capital(p.id) }, p, { tipo: p.tipo || 'texto' }));
    }
    return r;
  }

  function esNumerico(t) { return t === 'moneda' || t === 'numero' || t === 'entero' || t === 'porcentaje'; }

  function textoCelda(v, tipo) {
    if (v === null || v === undefined) { return ''; }
    return U.formatear(v, tipo || (typeof v === 'number' ? 'numero' : 'texto'));
  }

  /* Tabla estática (todas las filas, para que imprima completa). */
  function tablaResultado(res) {
    var cab = U.el('tr'), cuerpo = U.el('tbody'), i, j, tr, tipos = res.tipos || [], v;
    for (j = 0; j < res.columnas.length; j++) { cab.appendChild(U.el('th', { scope: 'col', clase: esNumerico(tipos[j]) ? 'der' : null, texto: res.columnas[j] })); }
    for (i = 0; i < res.filas.length; i++) {
      tr = U.el('tr');
      for (j = 0; j < res.columnas.length; j++) {
        v = res.filas[i][j];
        tr.appendChild(U.el('td', { 'data-etq': res.columnas[j], clase: esNumerico(tipos[j]) || (!tipos[j] && typeof v === 'number') ? 'der' : null, texto: textoCelda(v, tipos[j]) }));
      }
      cuerpo.appendChild(tr);
    }
    return U.el('div', { clase: 'tabla-scroll', tabindex: '0', role: 'region', 'aria-label': 'Resultado del reporte' }, U.el('table', { clase: 'tabla' }, [U.el('thead', null, cab), cuerpo]));
  }

  /** Pantalla de un reporte con filtros, resultado, exportar e imprimir. */
  Reportes.vista = function (repId) {
    var rep = U.buscar(global.SISTEMA.reportes || [], function (r) { return r.id === repId; });
    var campos = camposDe(rep), valores = {}, i, f, salida = U.el('div', { 'aria-live': 'polite' }), ultimo = null, acciones = [], cont = U.el('div'), btnCsv, btnImp;
    for (i = 0; i < campos.length; i++) {
      if (campos[i].defecto !== undefined) { valores[campos[i].id] = U.resolverFecha(campos[i].defecto); }
    }

    function ejecutar(p) {
      var res, ctx = Calc.ctx();
      try { res = rep.ejecutar(p, ctx); } catch (e) { return { error: 'El reporte falló: ' + (e && e.message ? e.message : e) }; }
      if (!res || !res.columnas || !res.filas) { return { error: 'El reporte no devolvió columnas y filas.' }; }
      return { res: res };
    }

    function parametros(v) {
      var p = {}, j, c, n, errores = {};
      for (j = 0; j < campos.length; j++) {
        c = campos[j];
        n = Datos.normalizar(c, v[c.id]);
        if (n === null) { n = undefined; }
        if (c.tipo !== 'ref' && c.tipo !== 'lista') { errores[c.id] = Seg.validarCampo(c, n); if (!errores[c.id]) { delete errores[c.id]; } }
        if (n !== undefined) { p[c.id] = n; }
      }
      if (!errores.desde && !errores.hasta && p.desde && p.hasta && p.desde > p.hasta) { errores.hasta = 'La fecha final no puede ser anterior a la inicial.'; }
      return { p: p, errores: errores };
    }

    function pintar(r) {
      var j, tarjetas, g, fmt, k;
      U.vaciar(salida);
      if (r.error) { salida.appendChild(U.el('p', { clase: 'aviso-form', role: 'alert', texto: r.error })); ultimo = null; btnCsv.disabled = true; return; }
      ultimo = r.res;
      btnCsv.disabled = false;
      if (r.res.resumen && r.res.resumen.length) {
        tarjetas = U.el('div', { clase: 'indicadores' });
        for (j = 0; j < r.res.resumen.length; j++) {
          tarjetas.appendChild(U.el('div', { clase: 'indicador' }, [
            U.el('p', { clase: 'indicador-titulo', texto: r.res.resumen[j].etiqueta }),
            U.el('p', { clase: 'indicador-valor', texto: textoCelda(r.res.resumen[j].valor, r.res.resumen[j].tipo) })
          ]));
        }
        salida.appendChild(tarjetas);
      }
      if (r.res.grafico && r.res.filas.length) {
        g = U.asignar({ titulo: rep.titulo }, r.res.grafico);
        if (!g.formato) {
          fmt = 'numero';
          for (k = 0; k < (r.res.tipos || []).length; k++) { if (esNumerico(r.res.tipos[k])) { fmt = r.res.tipos[k]; } }
          g.formato = fmt;
        }
        salida.appendChild(UI.seccion('Gráfico', UI.grafico(g)));
      }
      if (!r.res.filas.length) {
        salida.appendChild(UI.seccion(null, UI.vacio({ titulo: 'Sin datos en este periodo', texto: 'No hay registros que cumplan los filtros. Amplía el rango de fechas o cambia los criterios.' })));
      } else {
        salida.appendChild(UI.seccion('Detalle (' + r.res.filas.length + (r.res.filas.length === 1 ? ' fila)' : ' filas)'), tablaResultado(r.res)));
      }
    }

    function generar(v) {
      var q = parametros(v);
      if (U.claves(q.errores).length) { return { ok: false, errores: q.errores, general: [] }; }
      pintar(ejecutar(q.p));
      return { ok: true };
    }

    f = UI.formulario({ campos: campos, valores: valores, prefijo: 'rp', textoGuardar: 'Generar reporte', onGuardar: generar });
    btnCsv = UI.boton('Exportar CSV', function () {
      var filas, j, k, nombre = rep.id + '-' + U.hoy() + '.csv';
      if (!ultimo) { return; }
      filas = [ultimo.columnas.slice(0)];
      for (j = 0; j < ultimo.filas.length; j++) { filas.push(ultimo.filas[j].slice(0)); }
      k = U.descargar(nombre, '﻿' + U.csv(filas), 'text/csv;charset=utf-8');
      if (k) { Aud.registrar('exportar', 'reportes', rep.id, null, null, nombre + ' · ' + ultimo.filas.length + ' filas'); UI.toast('Se descargó ' + nombre + '.', 'ok'); }
      else { UI.aviso({ titulo: 'No se pudo descargar', texto: 'Tu navegador bloqueó la descarga.', tipo: 'error' }); }
    });
    btnImp = UI.boton('Imprimir', function () { global.print(); });
    acciones.push(btnCsv, btnImp);
    if (rep.descripcion) { cont.appendChild(U.el('p', { clase: 'tenue descripcion-rep', texto: rep.descripcion })); }
    if (campos.length) { cont.appendChild(UI.seccion('Filtros', f.nodo)); }
    cont.appendChild(salida);
    Aud.registrar('reporte', 'reportes', rep.id, null, null, 'Reporte consultado');
    (function () { var q = parametros(valores); pintar(U.claves(q.errores).length ? { error: 'Los valores por defecto no son válidos.' } : ejecutar(q.p)); })();
    return { titulo: rep.titulo, migas: [{ texto: 'Tablero', href: '#/tablero' }, { texto: 'Reportes' }, { texto: rep.titulo }], acciones: acciones, nodo: cont };
  };

  global.Reportes = Reportes;
})(window);
