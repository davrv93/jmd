/*
 * 60-vistas.js · Pantallas del sistema (objeto global Vistas)
 * ----------------------------------------------------------------------------
 * Cada función Vistas.xxx(...) devuelve { titulo, migas, acciones, nodo }.
 * El armazón (menú, cabecera, migas, título) lo pone App; aquí solo está el
 * contenido de cada ruta:
 *   login · tablero · entidadLista · entidadNueva · entidadFicha
 *   opLista · opNueva · opFicha · usuarios · bitacora · respaldo
 *   configuracion · perfil · sinPermiso · noEncontrado
 * Los permisos se vuelven a comprobar en Datos/Seg al actuar; aquí solo se
 * decide qué botones mostrar.
 */
(function (global) {
  'use strict';

  var Vistas = {};

  /* ---------- Utilidades compartidas ---------- */

  function C() { return global.SISTEMA; }

  /** Navega a una ruta hash. */
  Vistas.ir = function (hash) { global.location.hash = hash; };

  function enlaceBtn(texto, href, clase) {
    return U.el('a', { href: href, clase: 'btn btn-' + (clase || 'secundario'), texto: texto });
  }

  /* Mapas id → etiqueta de cada campo ref de una definición (para no buscar celda por celda). */
  function mapasRef(campos) {
    var mapas = {}, i, c, filas, j, m;
    for (i = 0; i < campos.length; i++) {
      c = campos[i];
      if (c.tipo !== 'ref') { continue; }
      m = {};
      filas = Datos.listar(c.entidad);
      for (j = 0; j < filas.length; j++) { m[filas[j].id] = String(filas[j][c.mostrar || 'nombre'] !== undefined ? filas[j][c.mostrar || 'nombre'] : filas[j].id); }
      mapas[c.id] = m;
    }
    return mapas;
  }

  /* Texto con el que se muestra el valor de un campo. */
  function textoCampo(campo, valor, mapas) {
    if (valor === undefined || valor === null || valor === '') { return ''; }
    if (campo.tipo === 'ref') { return (mapas[campo.id] && mapas[campo.id][valor]) || String(valor); }
    return U.formatear(valor, campo.tipo);
  }

  function campoPorId(def, id) {
    return U.buscar(def.campos, function (c) { return c.id === id; });
  }

  function descargarCsv(nombre, filas, entidad, cantidad) {
    var ok = U.descargar(nombre, '﻿' + U.csv(filas), 'text/csv;charset=utf-8');
    if (ok) {
      Aud.registrar('exportar', entidad || '', '', null, null, nombre + ' · ' + cantidad + ' filas');
      UI.toast('Se descargó ' + nombre + '.', 'ok');
    } else {
      UI.aviso({ titulo: 'No se pudo descargar', texto: 'Tu navegador bloqueó la descarga. Prueba con otro navegador.', tipo: 'error' });
    }
  }

  function tonoEstado(op, estado) {
    var k = op.estados.indexOf(estado);
    if (k === 0) { return 'aviso'; }
    if (k === op.estados.length - 1) { return 'error'; }
    return 'ok';
  }

  /* ---------- Ingreso ---------- */

  /** Pantalla de ingreso. mensaje: texto previo (p. ej. «Tu sesión expiró»). */
  Vistas.login = function (mensaje) {
    var cfg = C(), caja, aviso, usuarioIn, claveIn, error, form, demo = null, i, u, idU = UI.nuevoId('lu'), idC = UI.nuevoId('lc');
    error = U.el('div', { clase: 'aviso-form', role: 'alert', hidden: true });
    aviso = mensaje ? U.el('div', { clase: 'aviso-info', role: 'status', texto: mensaje }) : null;
    usuarioIn = U.el('input', { id: idU, name: 'usuario', type: 'text', clase: 'ctl', autocomplete: 'username', autocapitalize: 'none', spellcheck: 'false' });
    claveIn = U.el('input', { id: idC, name: 'clave', type: 'password', clase: 'ctl', autocomplete: 'current-password' });
    form = U.el('form', { clase: 'formulario', novalidate: true }, [
      error,
      U.el('div', { clase: 'campo' }, [U.el('label', { 'for': idU, texto: 'Usuario' }), usuarioIn]),
      U.el('div', { clase: 'campo' }, [U.el('label', { 'for': idC, texto: 'Contraseña' }), claveIn]),
      U.el('div', { clase: 'form-botones' }, U.el('button', { type: 'submit', clase: 'btn btn-primario btn-bloque', texto: 'Ingresar' }))
    ]);
    form.addEventListener('submit', function (ev) {
      var r;
      ev.preventDefault();
      r = Seg.ingresar(usuarioIn.value, claveIn.value);
      if (!r.ok) {
        U.vaciar(error);
        error.appendChild(U.el('p', { texto: r.error }));
        error.removeAttribute('hidden'); error.hidden = false;
        claveIn.value = '';
        claveIn.focus();
        return;
      }
      App.alIngresar(r);
    });
    if (Seg.cfg('ayudaLogin') === true) {
      demo = U.el('div', { clase: 'ayuda-login' }, [
        U.el('p', { clase: 'ayuda-login-titulo', texto: 'Usuarios de demostración' }),
        U.el('ul', null, (function () {
          var r = [], k;
          for (k = 0; k < (cfg.usuarios || []).length; k++) {
            (function (d) {
              r.push(U.el('li', null, [
                U.el('button', { type: 'button', clase: 'btn-enlace', texto: d.usuario + ' / ' + d.clave, on: { click: function () { usuarioIn.value = d.usuario; claveIn.value = d.clave; claveIn.focus(); } } }),
                U.el('span', { clase: 'tenue', texto: ' · ' + ((Seg.rol(d.rol) || {}).nombre || d.rol) })
              ]));
            })(cfg.usuarios[k]);
          }
          return r;
        })())
      ]);
    } else {
      demo = U.el('p', { clase: 'ayuda-login tenue', texto: 'Los usuarios de demostración están en el archivo LEEME.txt.' });
    }
    caja = U.el('div', { clase: 'login-caja' }, [
      U.el('div', { clase: 'login-marca' }, [
        U.el('span', { clase: 'siglas', 'aria-hidden': 'true', texto: App.siglas() }),
        U.el('div', null, [U.el('h1', { clase: 'login-titulo', texto: cfg.nombre }), U.el('p', { clase: 'tenue', texto: cfg.rubro + ' · versión ' + cfg.version })])
      ]),
      aviso, form, demo,
      U.el('p', { clase: 'login-aviso', texto: 'Sistema de práctica: no uses datos reales. La seguridad de este sistema es de demostración porque corre en tu navegador.' })
    ]);
    return { titulo: 'Ingreso', sinMarco: true, nodo: caja, enfocar: usuarioIn };
  };

  /* ---------- Tablero ---------- */

  /** Tablero: indicadores, gráfico y accesos rápidos. */
  Vistas.tablero = function () {
    var cfg = C(), ctx = Calc.ctx(), rol = Seg.rolActual(), cuadro = U.el('div', { clase: 'indicadores' }), nodo, i, it, valor, g, graf, rapidos = [], recientes, lista, k, e;
    for (i = 0; i < (cfg.tablero || []).length; i++) {
      it = cfg.tablero[i];
      if (it.roles && it.roles.indexOf(rol) === -1) { continue; }
      try { valor = it.calcular(ctx); } catch (err) { valor = null; }
      cuadro.appendChild(U.el('div', { clase: 'indicador' }, [
        U.el('p', { clase: 'indicador-titulo', texto: it.titulo }),
        U.el('p', { clase: 'indicador-valor', texto: valor === null || valor === undefined ? '—' : U.formatear(valor, it.tipo || 'numero') }),
        it.nota ? U.el('p', { clase: 'indicador-nota', texto: it.nota }) : null
      ]));
    }
    nodo = U.el('div');
    nodo.appendChild(cuadro);
    if (cfg.tableroGrafico) {
      try { g = cfg.tableroGrafico.calcular(ctx); } catch (err2) { g = null; }
      if (g) {
        graf = U.asignar({ tipo: cfg.tableroGrafico.tipo || 'columnas', formato: cfg.tableroGrafico.formato || 'moneda', titulo: cfg.tableroGrafico.titulo }, g);
        nodo.appendChild(UI.seccion(cfg.tableroGrafico.titulo, UI.grafico(graf)));
      }
    }
    for (i = 0; i < (cfg.operaciones || []).length; i++) {
      if (Seg.puede('o', cfg.operaciones[i].id, 'crear')) { rapidos.push(enlaceBtn('Registrar ' + cfg.operaciones[i].nombre.toLowerCase(), '#/o/' + cfg.operaciones[i].id + '/nuevo', i === 0 ? 'primario' : 'secundario')); }
    }
    for (i = 0; i < (cfg.entidades || []).length; i++) {
      if (Seg.puede('e', cfg.entidades[i].id, 'crear') && rapidos.length < 5) { rapidos.push(enlaceBtn('Agregar ' + cfg.entidades[i].nombre.toLowerCase(), '#/e/' + cfg.entidades[i].id + '/nuevo')); }
    }
    if (rapidos.length) { nodo.appendChild(UI.seccion('Accesos rápidos', U.el('div', { clase: 'acciones' }, rapidos))); }
    if (Seg.puede('s', 'bitacora', 'ver')) {
      lista = Aud.listar().slice(0, 6);
      recientes = U.el('ul', { clase: 'lista-simple' });
      for (k = 0; k < lista.length; k++) {
        e = lista[k];
        recientes.appendChild(U.el('li', null, [U.el('span', { clase: 'tenue', texto: U.fmt.fechaHora(e.fecha) + ' · ' }), U.el('strong', { texto: e.usuario }), ' ' + e.accion + (e.entidad ? ' en ' + e.entidad : '') + (e.id ? ' ' + e.id : '')]));
      }
      nodo.appendChild(UI.seccion('Actividad reciente', recientes, [enlaceBtn('Ver bitácora', '#/bitacora')]));
    }
    return { titulo: 'Tablero', migas: [{ texto: 'Tablero' }], nodo: nodo };
  };

  /* ---------- Entidades ---------- */

  /* Columnas de la lista de una entidad: campos visibles para el rol, calculados e id. */
  function columnasEntidad(def, mapas) {
    var cols = [], ids = def.lista || [def.campos[0].id], i, id, campo, calc, primera = true;
    for (i = 0; i < ids.length; i++) {
      id = ids[i];
      campo = campoPorId(def, id);
      calc = U.buscar(def.calculados || [], function (x) { return x.id === id; });
      if (campo) {
        if (!Seg.veCampo(campo)) { continue; }
        cols.push((function (cp, esPrimera) {
          return { id: cp.id, etiqueta: cp.etiqueta, enlazar: esPrimera, alinear: (cp.tipo === 'moneda' || cp.tipo === 'numero' || cp.tipo === 'entero' || cp.tipo === 'porcentaje') ? 'der' : null,
            valor: function (f) { return cp.tipo === 'ref' ? textoCampo(cp, f[cp.id], mapas) : f[cp.id]; },
            texto: function (f) { return textoCampo(cp, f[cp.id], mapas); } };
        })(campo, primera));
        primera = false;
      } else if (calc) {
        if (!Seg.veCampo(calc)) { continue; }
        cols.push((function (cc) {
          return { id: cc.id, etiqueta: cc.etiqueta, alinear: (cc.tipo === 'texto') ? null : 'der', valor: function (f) { return f[cc.id]; }, texto: function (f) { return U.formatear(f[cc.id], cc.tipo); } };
        })(calc));
      } else if (id === 'id') {
        cols.push({ id: 'id', etiqueta: 'Código', enlazar: primera, valor: function (f) { return f.id; }, texto: function (f) { return f.id; } });
        primera = false;
      }
    }
    if (cols.length && U.posicion(cols, function (c) { return c.enlazar; }) < 0) { cols[0].enlazar = true; }
    return cols;
  }

  /* Filas de una entidad con calculados y el texto de búsqueda. */
  function filasEntidad(def) {
    var filas = Datos.listar(def.id), ctx = Calc.ctx(), i, j, k;
    if (def.calculados && def.calculados.length) {
      for (i = 0; i < filas.length; i++) {
        for (j = 0; j < def.calculados.length; j++) {
          k = def.calculados[j];
          try { filas[i][k.id] = k.formula(filas[i], ctx); } catch (e) { filas[i][k.id] = null; }
        }
      }
    }
    return filas;
  }

  /* CSV de una entidad. Con exportaRespetaPermisos = false (débil) incluye también los campos que el rol no ve. */
  function exportarEntidad(def, filas, mapas) {
    var respeta = Seg.cfg('exportaRespetaPermisos') !== false, campos = [], cab = ['Código'], datos = [], i, j, f, fila;
    for (i = 0; i < def.campos.length; i++) { if (!respeta || Seg.veCampo(def.campos[i])) { campos.push(def.campos[i]); } }
    for (i = 0; i < campos.length; i++) { cab.push(campos[i].etiqueta); }
    for (i = 0; i < (def.calculados || []).length; i++) { if (!respeta || Seg.veCampo(def.calculados[i])) { cab.push(def.calculados[i].etiqueta); } }
    datos.push(cab);
    for (i = 0; i < filas.length; i++) {
      f = filas[i];
      fila = [f.id];
      for (j = 0; j < campos.length; j++) {
        fila.push(campos[j].tipo === 'ref' ? textoCampo(campos[j], f[campos[j].id], mapas) : (f[campos[j].id] === undefined ? '' : f[campos[j].id]));
      }
      for (j = 0; j < (def.calculados || []).length; j++) {
        if (respeta && !Seg.veCampo(def.calculados[j])) { continue; }
        fila.push(f[def.calculados[j].id] === undefined || f[def.calculados[j].id] === null ? '' : f[def.calculados[j].id]);
      }
      datos.push(fila);
    }
    descargarCsv(def.id + '-' + U.hoy() + '.csv', datos, def.id, filas.length);
  }

  /** Lista de una entidad. */
  Vistas.entidadLista = function (entId) {
    var def = Datos.entidad(entId), mapas = mapasRef(def.campos), filas = filasEntidad(def), cols = columnasEntidad(def, mapas), acciones = [], tabla, buscarIds = def.buscar || [], nodo;
    tabla = UI.tabla({
      titulo: def.plural, columnas: cols, filas: filas, enlace: function (f) { return '#/e/' + entId + '/' + f.id; },
      placeholder: 'Buscar en ' + def.plural.toLowerCase() + '…',
      buscar: function (f) {
        var t = [f.id], i, c;
        for (i = 0; i < buscarIds.length; i++) {
          c = campoPorId(def, buscarIds[i]);
          if (c && Seg.veCampo(c)) { t.push(textoCampo(c, f[c.id], mapas)); }
        }
        return t.join(' ');
      },
      vacio: { titulo: 'Aún no hay ' + def.plural.toLowerCase(), texto: Seg.puede('e', entId, 'crear') ? 'Agrega el primer registro con el botón «Agregar ' + def.nombre.toLowerCase() + '».' : 'Cuando se registren, aparecerán aquí.' }
    });
    if (Seg.puede('e', entId, 'crear')) { acciones.push(enlaceBtn('Agregar ' + def.nombre.toLowerCase(), '#/e/' + entId + '/nuevo', 'primario')); }
    acciones.push(UI.boton('Exportar CSV', function () { exportarEntidad(def, tabla.vista(), mapas); }));
    nodo = U.el('div', null, tabla.nodo);
    return { titulo: def.plural, migas: [{ texto: 'Tablero', href: '#/tablero' }, { texto: def.plural }], acciones: acciones, nodo: nodo };
  };

  /** Formulario de alta de una entidad. */
  Vistas.entidadNueva = function (entId) {
    var def = Datos.entidad(entId), f;
    f = UI.formulario({
      campos: def.campos, valores: Datos.valoresIniciales(def.campos), textoGuardar: 'Guardar ' + def.nombre.toLowerCase(), prefijo: 'nuevo-' + entId,
      onGuardar: function (v) {
        var r = Datos.crear(entId, v);
        if (r.ok) { UI.toast('Registro creado: ' + r.registro.id, 'ok'); Vistas.ir('#/e/' + entId + '/' + r.registro.id); }
        return r;
      },
      onCancelar: function () { Vistas.ir('#/e/' + entId); }
    });
    return { titulo: 'Agregar ' + def.nombre.toLowerCase(), migas: [{ texto: 'Tablero', href: '#/tablero' }, { texto: def.plural, href: '#/e/' + entId }, { texto: 'Nuevo' }], nodo: UI.seccion(null, f.nodo), enfocar: true, formulario: f };
  };

  /* Historial reciente de un registro (solo si el rol ve la bitácora). */
  function historial(clave, id) {
    var lista = Aud.listar(), r = [], i, e, ul;
    for (i = 0; i < lista.length && r.length < 6; i++) { if (lista[i].entidad === clave && lista[i].id === id) { r.push(lista[i]); } }
    if (!r.length) { return null; }
    ul = U.el('ul', { clase: 'lista-simple' });
    for (i = 0; i < r.length; i++) {
      e = r[i];
      ul.appendChild(U.el('li', null, [U.el('span', { clase: 'tenue', texto: U.fmt.fechaHora(e.fecha) + ' · ' }), U.el('strong', { texto: e.usuario }), ' ' + e.accion + (e.detalle ? ' · ' + e.detalle : '')]));
    }
    return UI.seccion('Historial del registro', ul);
  }

  /** Ficha de un registro: lectura, edición y eliminación. */
  Vistas.entidadFicha = function (entId, id, editando) {
    var def = Datos.entidad(entId), reg = Datos.obtener(entId, id), mapas = mapasRef(def.campos), cont = U.el('div'), acciones = [], pares = [], i, c, usos, nodoUsos, f, h;
    if (!reg) { return Vistas.noEncontrado('El registro «' + id + '» ya no existe.'); }
    reg = Datos.conCalculados(entId, reg);
    if (editando && Seg.puede('e', entId, 'editar')) {
      f = UI.formulario({
        campos: def.campos, valores: reg, prefijo: 'ed-' + entId, textoGuardar: 'Guardar cambios',
        onGuardar: function (v) {
          var r = Datos.actualizar(entId, id, v);
          if (r.ok) { UI.toast('Cambios guardados.', 'ok'); App.editando = false; App.render(); }
          return r;
        },
        onCancelar: function () { App.editando = false; App.render(); }
      });
      cont.appendChild(UI.seccion('Editar ' + def.nombre.toLowerCase(), f.nodo));
      return { titulo: String(reg[def.campos[0].id] !== undefined ? reg[def.campos[0].id] : id), migas: [{ texto: 'Tablero', href: '#/tablero' }, { texto: def.plural, href: '#/e/' + entId }, { texto: id }], nodo: cont, formulario: f };
    }
    pares.push(['Código', id]);
    for (i = 0; i < def.campos.length; i++) {
      c = def.campos[i];
      if (!Seg.veCampo(c)) { continue; }
      pares.push([c.etiqueta, textoCampo(c, reg[c.id], mapas)]);
    }
    for (i = 0; i < (def.calculados || []).length; i++) { if (Seg.veCampo(def.calculados[i])) { pares.push([def.calculados[i].etiqueta, U.formatear(reg[def.calculados[i].id], def.calculados[i].tipo)]); } }
    pares.push(['Registrado', U.fmt.fechaHora(reg.creado)]);
    cont.appendChild(UI.seccion('Datos de ' + def.nombre.toLowerCase(), UI.pares(pares)));
    usos = Datos.usos(entId, id);
    if (usos.length) {
      nodoUsos = [];
      for (i = 0; i < usos.length; i++) { nodoUsos.push(usos[i].nombre + ' (' + usos[i].n + ')'); }
      cont.appendChild(U.el('p', { clase: 'aviso-info', texto: 'Este registro se usa en: ' + nodoUsos.join(', ') + '. Por eso no se puede eliminar.' }));
    }
    if (Seg.puede('s', 'bitacora', 'ver')) { h = historial(entId, id); if (h) { cont.appendChild(h); } }
    if (Seg.puede('e', entId, 'editar')) { acciones.push(UI.boton('Editar', function () { App.editando = true; App.render(); }, 'primario')); }
    if (Seg.puede('e', entId, 'eliminar')) {
      acciones.push(UI.boton('Eliminar', function () {
        function borrar() {
          var r = Datos.eliminar(entId, id);
          if (r.ok) { UI.toast('Registro eliminado.', 'ok'); Vistas.ir('#/e/' + entId); }
          else { UI.aviso({ titulo: 'No se pudo eliminar', texto: r.general.join(' '), tipo: 'error' }); }
        }
        if (Seg.cfg('confirmarEliminar') === false) { borrar(); return; }
        UI.confirmar({ titulo: '¿Eliminar ' + def.nombre.toLowerCase() + '?', texto: 'Se eliminará «' + id + '» de forma permanente. Esta acción queda registrada en la bitácora y no se puede deshacer.', textoSi: 'Eliminar', peligro: true }, function (si) { if (si) { borrar(); } });
      }, 'peligro'));
    }
    acciones.push(enlaceBtn('Volver a la lista', '#/e/' + entId));
    return { titulo: String(reg[def.campos[0].id] !== undefined ? reg[def.campos[0].id] : id), migas: [{ texto: 'Tablero', href: '#/tablero' }, { texto: def.plural, href: '#/e/' + entId }, { texto: id }], acciones: acciones, nodo: cont };
  };

  /* ---------- Operaciones ---------- */

  /* Nombre del total principal de una operación: el marcado `fuerte` o el último. */
  function totalPrincipal(op) {
    var t = op.totales || [], i;
    for (i = 0; i < t.length; i++) { if (t[i].fuerte) { return t[i]; } }
    return t.length ? t[t.length - 1] : null;
  }

  function numeroDoc(d) { return d.numero || (d.id + ' (sin número)'); }

  /* Columnas de la lista de documentos: número, campos de cabecera, estado y total. */
  function columnasOp(op, mapas) {
    var cols = [], ids = op.lista, i, c, tp = totalPrincipal(op);
    if (!ids) {
      ids = [];
      for (i = 0; i < op.campos.length && ids.length < 3; i++) { if (op.campos[i].tipo !== 'textarea' && Seg.veCampo(op.campos[i])) { ids.push(op.campos[i].id); } }
    }
    cols.push({ id: 'numero', etiqueta: 'Número', enlazar: true, valor: function (d) { return d.numero || d.id; }, texto: numeroDoc });
    for (i = 0; i < ids.length; i++) {
      c = campoPorId(op, ids[i]);
      if (!c) { continue; }
      cols.push((function (cp) {
        return { id: cp.id, etiqueta: cp.etiqueta, valor: function (d) { return cp.tipo === 'ref' ? textoCampo(cp, d[cp.id], mapas) : d[cp.id]; }, texto: function (d) { return textoCampo(cp, d[cp.id], mapas); },
          alinear: (cp.tipo === 'moneda' || cp.tipo === 'numero' || cp.tipo === 'entero') ? 'der' : null };
      })(c));
    }
    cols.push({ id: 'estado', etiqueta: 'Estado', valor: function (d) { return d.estado; }, nodo: function (d) { return UI.insignia(d.estado, tonoEstado(op, d.estado)); } });
    if (tp) {
      cols.push({ id: 'total', etiqueta: tp.etiqueta, alinear: 'der', valor: function (d) { return d.totales ? d.totales[tp.id] : null; }, texto: function (d) { return d.totales && d.totales[tp.id] !== undefined ? U.formatear(d.totales[tp.id], tp.tipo || 'moneda') : ''; } });
    }
    return cols;
  }

  /** Lista de documentos de una operación. */
  Vistas.opLista = function (opId) {
    var op = Datos.operacion(opId), mapas = mapasRef(op.campos), filas = Datos.listar(opId), cols = columnasOp(op, mapas), tabla, selEstado, acciones = [], idSel = UI.nuevoId('fe'), i, tp = totalPrincipal(op);
    selEstado = U.el('select', { id: idSel, clase: 'ctl ctl-corto', 'aria-label': 'Filtrar por estado', on: { change: function () {
      var v = selEstado.value;
      tabla.filtrar(v ? function (d) { return d.estado === v; } : null);
    } } }, [U.el('option', { value: '', texto: 'Todos los estados' })]);
    for (i = 0; i < op.estados.length; i++) { selEstado.appendChild(U.el('option', { value: op.estados[i], texto: op.estados[i] })); }
    tabla = UI.tabla({
      titulo: op.plural, columnas: cols, filas: filas, orden: { col: 'fecha', desc: true }, barra: selEstado, placeholder: 'Buscar por número, fecha o ' + 'datos del documento…',
      enlace: function (d) { return '#/o/' + opId + '/' + d.id; },
      buscar: function (d) {
        var t = [d.id, d.numero || '', d.estado], k, c;
        for (k = 0; k < op.campos.length; k++) { c = op.campos[k]; if (Seg.veCampo(c)) { t.push(textoCampo(c, d[c.id], mapas)); } }
        return t.join(' ');
      },
      vacio: { titulo: 'Aún no hay ' + op.plural.toLowerCase(), texto: Seg.puede('o', opId, 'crear') ? 'Registra el primero con el botón «Registrar ' + op.nombre.toLowerCase() + '».' : 'Cuando se registren, aparecerán aquí.' }
    });
    if (Seg.puede('o', opId, 'crear')) { acciones.push(enlaceBtn('Registrar ' + op.nombre.toLowerCase(), '#/o/' + opId + '/nuevo', 'primario')); }
    acciones.push(UI.boton('Exportar CSV', function () {
      var vista = tabla.vista(), datos = [['Número', 'Estado']], k, j, d, fila, c;
      for (k = 0; k < op.campos.length; k++) { datos[0].push(op.campos[k].etiqueta); }
      for (k = 0; k < (op.totales || []).length; k++) { datos[0].push(op.totales[k].etiqueta); }
      for (k = 0; k < vista.length; k++) {
        d = vista[k];
        fila = [d.numero || d.id, d.estado];
        for (j = 0; j < op.campos.length; j++) { c = op.campos[j]; fila.push(c.tipo === 'ref' ? textoCampo(c, d[c.id], mapas) : (d[c.id] === undefined ? '' : d[c.id])); }
        for (j = 0; j < (op.totales || []).length; j++) { fila.push(d.totales && d.totales[op.totales[j].id] !== undefined ? d.totales[op.totales[j].id] : ''); }
        datos.push(fila);
      }
      descargarCsv(opId + '-' + U.hoy() + '.csv', datos, opId, vista.length);
    }));
    return { titulo: op.plural, migas: [{ texto: 'Tablero', href: '#/tablero' }, { texto: op.plural }], acciones: acciones, nodo: U.el('div', null, tabla.nodo) };
  };

  /* Editor de líneas: tabla con selector de ítem, precio, campos propios, importe y quitar. */
  function editorLineas(op, lineas, alCambiar) {
    var def = op.lineas, ctx = Calc.ctx(), items = Datos.listar(def.entidad), mostrar = def.mostrar || 'nombre', campoPrecio = def.precio || 'precio';
    var opciones = [], cuerpo = U.el('tbody'), selAgregar, nodo, errores = [], celdasImporte = [], k, vistos = {}, tabla, idAdd = UI.nuevoId('add');
    var porId = {}, cab = U.el('tr');
    for (k = 0; k < items.length; k++) {
      porId[items[k].id] = items[k];
      vistos[String(items[k][mostrar])] = (vistos[String(items[k][mostrar])] || 0) + 1;
    }
    for (k = 0; k < items.length; k++) {
      opciones.push({ valor: items[k].id, texto: String(items[k][mostrar] !== undefined ? items[k][mostrar] : items[k].id) + (vistos[String(items[k][mostrar])] > 1 ? ' (' + items[k].id + ')' : '') });
    }
    opciones = U.ordenar(opciones, function (a, b) { return U.comparar(a.texto, b.texto); });

    function numLinea(l) {
      var r = { item: l.item, precio: U.numero(l.precio) || 0 }, j, lc, v;
      for (j = 0; j < (def.campos || []).length; j++) { lc = def.campos[j]; v = Datos.normalizar(lc, l[lc.id]); if (v !== null && v !== undefined) { r[lc.id] = v; } }
      return r;
    }
    function leer() {
      var r = [], j;
      for (j = 0; j < lineas.length; j++) { r.push(U.clonar(lineas[j])); }
      return r;
    }
    function numericas() {
      var r = [], j;
      for (j = 0; j < lineas.length; j++) { r.push(numLinea(lineas[j])); }
      return r;
    }
    function refrescarImportes() {
      var j;
      for (j = 0; j < lineas.length; j++) {
        if (celdasImporte[j]) { U.vaciar(celdasImporte[j]); celdasImporte[j].appendChild(document.createTextNode(U.fmt.moneda(Datos.importeLinea(op, numLinea(lineas[j]))))); }
      }
      alCambiar();
    }
    function pintar(enfocarFila) {
      var j, l, tr, tdItem, sel, info, c, tdp, lc, ctl, tdc, quitar, errp;
      U.vaciar(cuerpo);
      celdasImporte = [];
      if (!lineas.length) {
        cuerpo.appendChild(U.el('tr', null, U.el('td', { colspan: String(4 + (def.campos || []).length), clase: 'sin-lineas', texto: 'Todavía no hay líneas. Elige un ítem en «Agregar» para empezar.' })));
      }
      for (j = 0; j < lineas.length; j++) {
        (function (idx) {
          l = lineas[idx];
          tr = U.el('tr');
          sel = U.el('select', { clase: 'ctl', 'aria-label': 'Ítem de la línea ' + (idx + 1), name: 'item-' + idx }, U.el('option', { value: '', texto: '— Elige —' }));
          for (c = 0; c < opciones.length; c++) { sel.appendChild(U.el('option', { value: opciones[c].valor, texto: opciones[c].texto })); }
          sel.value = l.item || '';
          sel.addEventListener('change', function () {
            var it = porId[sel.value];
            l.item = sel.value || undefined;
            if (it && it[campoPrecio] !== undefined) { l.precio = it[campoPrecio]; }
            pintar(idx);
            alCambiar();
          });
          info = def.info && l.item && porId[l.item] ? (function () { try { return def.info(porId[l.item], ctx); } catch (e) { return ''; } })() : '';
          errp = U.el('p', { clase: 'error-campo', role: 'alert', texto: errores[idx] ? errores[idx] : '' });
          tdItem = U.el('td', { 'data-etq': 'Ítem' }, [sel, info ? U.el('p', { clase: 'ayuda-campo', texto: info }) : null, errp]);
          tr.appendChild(tdItem);
          if (def.precioEditable) {
            ctl = UI.control({ id: 'precio', tipo: 'moneda', min: 0 }, l.precio, UI.nuevoId('pr'), {});
            ctl.control.setAttribute('aria-label', 'Precio de la línea ' + (idx + 1));
            ctl.control.addEventListener('input', function () { l.precio = ctl.leer(); refrescarImportes(); });
            tdp = U.el('td', { 'data-etq': 'Precio', clase: 'der' }, ctl.control);
          } else {
            tdp = U.el('td', { 'data-etq': 'Precio', clase: 'der', texto: l.precio === undefined || l.precio === '' ? '' : U.fmt.moneda(U.numero(l.precio) || 0) });
          }
          tr.appendChild(tdp);
          for (c = 0; c < (def.campos || []).length; c++) {
            (function (lcd) {
              var control = UI.control(lcd, l[lcd.id], UI.nuevoId('lc'), {});
              control.control.setAttribute('aria-label', lcd.etiqueta + ' de la línea ' + (idx + 1));
              control.control.addEventListener('input', function () { l[lcd.id] = control.leer(); refrescarImportes(); });
              control.control.addEventListener('change', function () { l[lcd.id] = control.leer(); refrescarImportes(); });
              tr.appendChild(U.el('td', { 'data-etq': lcd.etiqueta, clase: 'der' }, control.control));
            })(def.campos[c]);
          }
          tdc = U.el('td', { 'data-etq': 'Importe', clase: 'der importe', texto: U.fmt.moneda(Datos.importeLinea(op, numLinea(l))) });
          celdasImporte[idx] = tdc;
          tr.appendChild(tdc);
          quitar = UI.boton('Quitar', function () { lineas.splice(idx, 1); errores = []; pintar(); alCambiar(); selAgregar.focus(); }, 'secundario', { 'aria-label': 'Quitar la línea ' + (idx + 1) });
          tr.appendChild(U.el('td', { clase: 'der' }, quitar));
          cuerpo.appendChild(tr);
        })(j);
      }
      if (enfocarFila !== undefined && cuerpo.getElementsByTagName('select')[enfocarFila]) { cuerpo.getElementsByTagName('select')[enfocarFila].focus(); }
    }
    selAgregar = U.el('select', { id: idAdd, clase: 'ctl' }, U.el('option', { value: '', texto: 'Agregar un ítem…' }));
    for (k = 0; k < opciones.length; k++) { selAgregar.appendChild(U.el('option', { value: opciones[k].valor, texto: opciones[k].texto })); }
    selAgregar.addEventListener('change', function () {
      var it = porId[selAgregar.value], existente, ln, ocupada = U.posicion(lineas, function (x) { return x.item === selAgregar.value; });
      if (!it) { return; }
      if (ocupada >= 0) { UI.toast('«' + it[mostrar] + '» ya está en la lista: cambia su cantidad.', 'aviso'); selAgregar.value = ''; return; }
      ln = { item: it.id, precio: it[campoPrecio] === undefined ? 0 : it[campoPrecio] };
      existente = Datos.valoresIniciales(def.campos || []);
      U.asignar(ln, existente);
      if ((def.campos || []).length && ln.cantidad === undefined && U.buscar(def.campos, function (x) { return x.id === 'cantidad'; })) { ln.cantidad = 1; }
      lineas.push(ln);
      errores = [];
      selAgregar.value = '';
      pintar();
      alCambiar();
    });
    cab.appendChild(U.el('th', { scope: 'col', texto: 'Ítem' }));
    cab.appendChild(U.el('th', { scope: 'col', clase: 'der', texto: 'Precio' }));
    for (k = 0; k < (def.campos || []).length; k++) { cab.appendChild(U.el('th', { scope: 'col', clase: 'der', texto: def.campos[k].etiqueta })); }
    cab.appendChild(U.el('th', { scope: 'col', clase: 'der', texto: 'Importe' }));
    cab.appendChild(U.el('th', { scope: 'col', clase: 'der' }, U.el('span', { clase: 'solo-lector', texto: 'Acciones' })));
    tabla = U.el('div', { clase: 'tabla-scroll', role: 'region', tabindex: '0', 'aria-label': 'Líneas del documento' }, U.el('table', { clase: 'tabla tabla-lineas' }, [U.el('thead', null, cab), cuerpo]));
    nodo = U.el('div', null, [U.el('div', { clase: 'campo agregar-linea' }, [U.el('label', { 'for': idAdd, texto: 'Agregar' }), selAgregar]), tabla]);
    pintar();
    return {
      nodo: nodo, leer: leer, numericas: numericas,
      mostrarErrores: function (lista) {
        var j, msg;
        errores = [];
        for (j = 0; j < (lista || []).length; j++) { msg = lista[j] ? lista[j][U.claves(lista[j])[0]] : ''; errores[j] = msg || ''; }
        pintar();
      }
    };
  }

  /* Tabla de solo lectura de las líneas de un documento. */
  function lineasLectura(op, doc) {
    var def = op.lineas, mostrar = def.mostrar || 'nombre', filas = U.el('tbody'), i, j, l, tr, cab = U.el('tr'), ctx = Calc.ctx();
    cab.appendChild(U.el('th', { scope: 'col', texto: 'Ítem' }));
    cab.appendChild(U.el('th', { scope: 'col', clase: 'der', texto: 'Precio' }));
    for (j = 0; j < (def.campos || []).length; j++) { cab.appendChild(U.el('th', { scope: 'col', clase: 'der', texto: def.campos[j].etiqueta })); }
    cab.appendChild(U.el('th', { scope: 'col', clase: 'der', texto: 'Importe' }));
    for (i = 0; i < (doc.lineas || []).length; i++) {
      l = doc.lineas[i];
      tr = U.el('tr');
      tr.appendChild(U.el('td', { 'data-etq': 'Ítem', texto: Datos.etiqueta(def.entidad, l.item, mostrar) }));
      tr.appendChild(U.el('td', { 'data-etq': 'Precio', clase: 'der', texto: U.fmt.moneda(l.precio) }));
      for (j = 0; j < (def.campos || []).length; j++) { tr.appendChild(U.el('td', { 'data-etq': def.campos[j].etiqueta, clase: 'der', texto: U.formatear(l[def.campos[j].id], def.campos[j].tipo) })); }
      tr.appendChild(U.el('td', { 'data-etq': 'Importe', clase: 'der', texto: U.fmt.moneda(ctx.redondear(Datos.importeLinea(op, l))) }));
      filas.appendChild(tr);
    }
    if (!(doc.lineas || []).length) { filas.appendChild(U.el('tr', null, U.el('td', { colspan: String(3 + (def.campos || []).length), clase: 'sin-lineas', texto: 'Este documento no tiene líneas.' }))); }
    return U.el('div', { clase: 'tabla-scroll', role: 'region', tabindex: '0', 'aria-label': 'Líneas del documento' }, U.el('table', { clase: 'tabla tabla-lineas' }, [U.el('thead', null, cab), filas]));
  }

  /* Caja de totales; valores(obj) la actualiza. */
  function cajaTotales(op) {
    var caja = U.el('div', { clase: 'totales', 'aria-live': 'polite' }), celdas = {}, i, t, fila, v;
    for (i = 0; i < (op.totales || []).length; i++) {
      t = op.totales[i];
      v = U.el('span', { clase: 'total-valor', texto: '' });
      fila = U.el('div', { clase: 'total-fila' + (t.fuerte ? ' total-fuerte' : '') }, [U.el('span', { texto: t.etiqueta }), v]);
      celdas[t.id] = v;
      caja.appendChild(fila);
    }
    return {
      nodo: caja,
      poner: function (tot) {
        var k, x;
        for (k = 0; k < op.totales.length; k++) {
          x = op.totales[k];
          U.vaciar(celdas[x.id]);
          celdas[x.id].appendChild(document.createTextNode(U.formatear(tot && tot[x.id] !== undefined ? tot[x.id] : 0, x.tipo || 'moneda')));
        }
      }
    };
  }

  /** Alta de un documento (borrador nuevo). */
  Vistas.opNueva = function (opId) { return Vistas.opFicha(opId, null); };

  /** Documento: alta, edición del borrador o lectura (emitida/anulada), con sus acciones. */
  Vistas.opFicha = function (opId, id) {
    var op = Datos.operacion(opId), esNuevo = id === null, doc, editable, cont = U.el('div'), cab, editor = null, totales = null, acciones = [], mapas, pares = [], i, c;
    var estadoInicial = op.estados[0], k, titulo;
    if (esNuevo) {
      doc = U.asignar(Datos.valoresIniciales(op.campos), { estado: estadoInicial, lineas: [] });
    } else {
      doc = Datos.obtener(opId, id);
      if (!doc) { return Vistas.noEncontrado('El documento «' + id + '» ya no existe.'); }
    }
    editable = esNuevo ? Seg.puede('o', opId, 'crear') : (doc.estado === estadoInicial && Seg.puede('o', opId, 'editar'));
    mapas = mapasRef(op.campos);
    titulo = esNuevo ? 'Registrar ' + op.nombre.toLowerCase() : op.nombre + ' ' + numeroDoc(doc);

    function trabajo() {
      var d = {}, v = cab ? cab.leer() : doc, j, cp, n;
      for (j = 0; j < op.campos.length; j++) {
        cp = op.campos[j];
        n = Datos.normalizar(cp, v[cp.id]);
        if (n !== null && n !== undefined) { d[cp.id] = n; }
      }
      d.lineas = editor ? editor.numericas() : (doc.lineas || []);
      return d;
    }
    function recalcular() {
      if (totales && editable && op.calcular) { totales.poner(Datos.opTotales(op, trabajo())); }
    }
    function accionGuardar() {
      var d = guardar();
      if (!d) { return; }
      UI.toast('Borrador guardado.', 'ok');
      if (esNuevo) { Vistas.ir('#/o/' + opId + '/' + d.id); } else { App.render(); }
    }
    function guardar() {
      var valores, res;
      if (!editable) { return doc; }
      valores = cab.leer();
      if (editor) { valores.lineas = editor.leer(); }
      res = esNuevo ? Datos.opCrear(opId, valores) : Datos.opActualizar(opId, id, valores);
      if (!res.ok) {
        cab.mostrarErrores(res.errores, res.general);
        if (editor) { editor.mostrarErrores(res.erroresLinea || []); }
        return null;
      }
      return res.doc;
    }

    /* Cabecera */
    if (editable) {
      cab = UI.formulario({ campos: op.campos, valores: doc, ocultarBotones: true, prefijo: 'doc-' + opId, onGuardar: function () { accionGuardar(); return { ok: true }; } });
      cab.nodo.addEventListener('input', recalcular, false);
      cab.nodo.addEventListener('change', recalcular, false);
      cont.appendChild(UI.seccion(esNuevo ? 'Datos del documento' : 'Datos del documento (borrador)', cab.nodo));
    } else {
      pares.push(['Número', numeroDoc(doc)]);
      pares.push(['Estado', UI.insignia(doc.estado, tonoEstado(op, doc.estado))]);
      for (i = 0; i < op.campos.length; i++) { c = op.campos[i]; if (Seg.veCampo(c)) { pares.push([c.etiqueta, textoCampo(c, doc[c.id], mapas)]); } }
      pares.push(['Creado por', doc.creadoPor]);
      if (doc.motivoAnulacion) { pares.push(['Motivo de anulación', doc.motivoAnulacion]); }
      cont.appendChild(UI.seccion('Datos del documento', UI.pares(pares)));
    }

    /* Líneas y totales */
    if (op.lineas) {
      if (editable) {
        editor = editorLineas(op, doc.lineas || [], recalcular);
        cont.appendChild(UI.seccion('Líneas', editor.nodo));
      } else {
        cont.appendChild(UI.seccion('Líneas', lineasLectura(op, doc)));
      }
    }
    if (op.calcular && (op.totales || []).length) {
      totales = cajaTotales(op);
      cont.appendChild(U.el('div', { clase: 'totales-caja' }, totales.nodo));
      totales.poner(editable ? Datos.opTotales(op, trabajo()) : doc.totales);
    }

    /* Acciones */
    if (editable) {
      acciones.push(UI.boton(esNuevo ? 'Guardar borrador' : 'Guardar cambios', accionGuardar, 'primario'));
    }
    if ((esNuevo && Seg.puede('o', opId, 'crear') && Seg.puede('o', opId, 'emitir')) || (!esNuevo && doc.estado === estadoInicial && Seg.puede('o', opId, 'emitir'))) {
      acciones.push(UI.boton('Emitir', function () {
        var d = guardar();
        if (!d) { return; }
        UI.confirmar({ titulo: '¿Emitir ' + op.nombre.toLowerCase() + '?', texto: 'Al emitir se asigna el número oficial y se aplican sus efectos (por ejemplo, el stock). Después ya no se puede editar: solo anular con un motivo.', textoSi: 'Emitir' }, function (si) {
          var r;
          if (!si) { if (esNuevo) { Vistas.ir('#/o/' + opId + '/' + d.id); } else { App.render(); } return; }
          r = Datos.opEmitir(opId, d.id);
          if (!r.ok) {
            UI.aviso({ titulo: 'No se pudo emitir', texto: (r.general || []).join(' ') || 'Revisa los datos del documento.', tipo: 'error' });
            if (esNuevo) { Vistas.ir('#/o/' + opId + '/' + d.id); } else { App.render(); }
            return;
          }
          UI.toast(op.nombre + ' emitida: ' + r.doc.numero, 'ok');
          if (esNuevo) { Vistas.ir('#/o/' + opId + '/' + d.id); } else { App.render(); }
        });
      }, editable ? 'secundario' : 'primario'));
    }
    k = op.estados.indexOf(doc.estado);
    if (!esNuevo && k >= 1 && k < op.estados.length - 1 && Seg.puede('o', opId, 'anular')) {
      acciones.push(UI.boton('Anular', function () {
        UI.pedirTexto({ titulo: 'Anular ' + op.nombre.toLowerCase(), texto: 'La anulación revierte los efectos del documento y queda en la bitácora.', etiqueta: 'Motivo de la anulación', minimo: 5, maximo: 200, textoOk: 'Anular', peligro: true }, function (motivo) {
          var r = Datos.opAnular(opId, id, motivo);
          if (!r.ok) { UI.aviso({ titulo: 'No se pudo anular', texto: (r.general || []).join(' ') || (r.errores && r.errores.motivo) || 'Error al anular.', tipo: 'error' }); return; }
          UI.toast('Documento anulado.', 'ok');
          App.render();
        });
      }, 'peligro'));
    }
    if (!esNuevo && k >= 1 && k < op.estados.length - 1 && op.estados.length > 3 && Seg.puede('o', opId, 'emitir')) {
      (function () {
        var sel = U.el('select', { clase: 'ctl ctl-corto', 'aria-label': 'Nuevo estado' }), j;
        for (j = 1; j < op.estados.length - 1; j++) { if (op.estados[j] !== doc.estado) { sel.appendChild(U.el('option', { value: op.estados[j], texto: op.estados[j] })); } }
        acciones.push(sel);
        acciones.push(UI.boton('Cambiar estado', function () {
          var r = Datos.opCambiarEstado(opId, id, sel.value);
          if (!r.ok) { UI.aviso({ titulo: 'No se pudo cambiar', texto: (r.general || []).join(' '), tipo: 'error' }); return; }
          UI.toast('Estado actualizado.', 'ok'); App.render();
        }));
      })();
    }
    if (!esNuevo && doc.estado === estadoInicial && Seg.puede('o', opId, 'eliminar')) {
      acciones.push(UI.boton('Eliminar borrador', function () {
        function borrar() {
          var r = Datos.opEliminar(opId, id);
          if (r.ok) { UI.toast('Borrador eliminado.', 'ok'); Vistas.ir('#/o/' + opId); } else { UI.aviso({ titulo: 'No se pudo eliminar', texto: r.general.join(' '), tipo: 'error' }); }
        }
        if (Seg.cfg('confirmarEliminar') === false) { borrar(); return; }
        UI.confirmar({ titulo: '¿Eliminar el borrador?', texto: 'Se eliminará «' + doc.id + '» de forma permanente.', textoSi: 'Eliminar', peligro: true }, function (si) { if (si) { borrar(); } });
      }, 'peligro'));
    }
    if (!esNuevo) { acciones.push(UI.boton('Imprimir', function () { global.print(); })); }
    acciones.push(enlaceBtn(editable ? 'Cancelar' : 'Volver a la lista', '#/o/' + opId));
    if (!esNuevo && Seg.puede('s', 'bitacora', 'ver')) { c = historial(opId, doc.id); if (c) { cont.appendChild(c); } }
    return { titulo: titulo, migas: [{ texto: 'Tablero', href: '#/tablero' }, { texto: op.plural, href: '#/o/' + opId }, { texto: esNuevo ? 'Nueva' : numeroDoc(doc) }], acciones: acciones, nodo: cont, formulario: esNuevo ? cab : null };
  };

  /* ---------- Usuarios y roles ---------- */

  function camposUsuario(nuevo) {
    var roles = [], etiquetas = {}, i, r = C().roles, campos;
    for (i = 0; i < r.length; i++) { roles.push(r[i].id); etiquetas[r[i].id] = r[i].nombre; }
    campos = [];
    if (nuevo) { campos.push({ id: 'usuario', etiqueta: 'Usuario', tipo: 'texto', requerido: true, max: 30, ayuda: 'De 3 a 30 caracteres: minúsculas, números, punto, guion.' }); }
    campos.push({ id: 'nombre', etiqueta: 'Nombre completo', tipo: 'texto', requerido: true, max: 80 });
    campos.push({ id: 'rol', etiqueta: 'Rol', tipo: 'lista', requerido: true, opciones: roles, etiquetasOpc: etiquetas });
    if (nuevo) { campos.push({ id: 'clave', etiqueta: 'Clave inicial', tipo: 'clave', requerido: true, max: 100, ayuda: Seg.politicaTexto() + ' El usuario deberá cambiarla al entrar.' }); }
    else { campos.push({ id: 'activo', etiqueta: 'Cuenta activa', tipo: 'booleano' }); }
    return campos;
  }

  /** Administración de usuarios y roles. */
  Vistas.usuarios = function () {
    var cfg = C(), tabla, acciones = [], nodoRoles, i, filas;
    function filasUsuarios() {
      var us = Seg.listarUsuarios(), j;
      for (j = 0; j < us.length; j++) { us[j].rolNombre = (Seg.rol(us[j].rol) || {}).nombre || us[j].rol; }
      return us;
    }
    function abrirNuevo() {
      var m, f, gen;
      f = UI.formulario({
        campos: camposUsuario(true), valores: {}, prefijo: 'nu', textoGuardar: 'Crear usuario',
        onGuardar: function (v) {
          var r = Seg.crearUsuario(v);
          if (r.ok) { m.cerrar(); UI.toast('Usuario creado. Deberá cambiar su clave al entrar.', 'ok'); tabla.actualizar(filasUsuarios()); }
          return r;
        },
        onCancelar: function () { m.cerrar(); }
      });
      gen = UI.boton('Generar clave segura', function () {
        var inp = f.nodo.querySelector('[name="clave"]'), t = Seg.claveTemporal();
        inp.type = 'text'; inp.value = t; inp.focus();
      }, 'secundario');
      m = UI.modal({ titulo: 'Nuevo usuario', contenido: [f.nodo, U.el('div', { clase: 'form-extra' }, gen)] });
    }
    function abrirEditar(u) {
      var m, f;
      f = UI.formulario({
        campos: camposUsuario(false), valores: { nombre: u.nombre, rol: u.rol, activo: u.activo }, prefijo: 'eu', textoGuardar: 'Guardar cambios',
        onGuardar: function (v) {
          var r = Seg.editarUsuario(u.usuario, { nombre: v.nombre, rol: v.rol, activo: v.activo });
          if (r.ok) { m.cerrar(); UI.toast('Usuario actualizado.', 'ok'); tabla.actualizar(filasUsuarios()); }
          return r;
        },
        onCancelar: function () { m.cerrar(); }
      });
      m = UI.modal({ titulo: 'Editar ' + u.usuario, contenido: f.nodo });
    }
    function restablecer(u) {
      UI.confirmar({ titulo: '¿Restablecer la clave de ' + u.usuario + '?', texto: 'Se generará una clave temporal y el usuario deberá cambiarla al ingresar.', textoSi: 'Restablecer' }, function (si) {
        var r;
        if (!si) { return; }
        r = Seg.restablecerClave(u.usuario);
        if (!r.ok) { UI.aviso({ titulo: 'No se pudo restablecer', texto: r.general, tipo: 'error' }); return; }
        UI.modal({ titulo: 'Clave temporal', contenido: [U.el('p', { clase: 'modal-texto', texto: 'Entrégasela a ' + u.usuario + ' por un canal seguro. No se volverá a mostrar:' }), U.el('p', { clase: 'clave-temporal', texto: r.temporal })], botones: [{ texto: 'Listo', clase: 'primario' }] });
        tabla.actualizar(filasUsuarios());
      });
    }
    function eliminar(u) {
      function hacer() {
        var r = Seg.eliminarUsuario(u.usuario);
        if (!r.ok) { UI.aviso({ titulo: 'No se pudo eliminar', texto: r.general, tipo: 'error' }); return; }
        UI.toast('Usuario eliminado.', 'ok'); tabla.actualizar(filasUsuarios());
      }
      if (Seg.cfg('confirmarEliminar') === false) { hacer(); return; }
      UI.confirmar({ titulo: '¿Eliminar a ' + u.usuario + '?', texto: 'La cuenta se elimina de forma permanente. Sus acciones pasadas siguen en la bitácora.', textoSi: 'Eliminar', peligro: true }, function (si) { if (si) { hacer(); } });
    }
    filas = filasUsuarios();
    tabla = UI.tabla({
      titulo: 'Usuarios', filas: filas, tam: 25, buscar: function (u) { return u.usuario + ' ' + u.nombre + ' ' + u.rolNombre; }, placeholder: 'Buscar usuario…',
      columnas: [
        { id: 'usuario', etiqueta: 'Usuario', valor: function (u) { return u.usuario; }, nodo: function (u) { return U.el('strong', { texto: u.usuario }); } },
        { id: 'nombre', etiqueta: 'Nombre', valor: function (u) { return u.nombre; } },
        { id: 'rol', etiqueta: 'Rol', valor: function (u) { return u.rolNombre; } },
        { id: 'activo', etiqueta: 'Estado', valor: function (u) { return u.activo ? 'Activo' : 'Inactivo'; }, nodo: function (u) {
          var s = U.el('span'); s.appendChild(UI.insignia(u.activo ? 'Activo' : 'Inactivo', u.activo ? 'ok' : 'error'));
          if (u.cambiar) { s.appendChild(document.createTextNode(' ')); s.appendChild(UI.insignia('Debe cambiar la clave', 'aviso')); }
          return s;
        } },
        { id: 'ultimoAcceso', etiqueta: 'Último ingreso', valor: function (u) { return u.ultimoAcceso || ''; }, texto: function (u) { return u.ultimoAcceso ? U.fmt.fechaHora(u.ultimoAcceso) : 'Nunca'; } },
        { id: 'acc', etiqueta: 'Acciones', ordenable: false, nodo: function (u) {
          return U.el('span', { clase: 'acciones-fila' }, [
            UI.boton('Editar', function () { abrirEditar(u); }, 'secundario', { 'aria-label': 'Editar ' + u.usuario }),
            UI.boton('Restablecer clave', function () { restablecer(u); }, 'secundario', { 'aria-label': 'Restablecer la clave de ' + u.usuario }),
            UI.boton('Eliminar', function () { eliminar(u); }, 'peligro', { 'aria-label': 'Eliminar a ' + u.usuario })
          ]);
        } }
      ]
    });
    acciones.push(UI.boton('Nuevo usuario', abrirNuevo, 'primario'));
    nodoRoles = U.el('dl', { clase: 'pares' });
    for (i = 0; i < cfg.roles.length; i++) {
      nodoRoles.appendChild(U.el('dt', { texto: cfg.roles[i].nombre }));
      nodoRoles.appendChild(U.el('dd', { texto: cfg.roles[i].descripcion || '' }));
    }
    return { titulo: 'Usuarios y roles', migas: [{ texto: 'Tablero', href: '#/tablero' }, { texto: 'Usuarios' }], acciones: acciones, nodo: U.el('div', null, [UI.seccion('Usuarios', tabla.nodo), UI.seccion('Roles del sistema', nodoRoles)]) };
  };

  /* ---------- Bitácora ---------- */

  function tonoAccion(a) {
    if (a === 'eliminar' || a === 'anular' || a === 'bloqueo' || a === 'acceso-denegado' || a === 'ingreso-fallido' || a === 'ingreso-bloqueado' || a === 'usuario-eliminar') { return 'error'; }
    if (a === 'crear' || a === 'emitir' || a === 'ingreso' || a === 'usuario-crear') { return 'ok'; }
    if (a === 'restauración' || a === 'expiración' || a === 'cambio-clave' || a === 'usuario-clave') { return 'aviso'; }
    return 'neutro';
  }

  function jsonBonito(v) { return v === null || v === undefined ? '—' : JSON.stringify(v, null, 2); }

  /** Bitácora de auditoría con verificación de la cadena de hashes. */
  Vistas.bitacora = function () {
    var datos = Aud.listar(), tabla, resultado = U.el('div', { clase: 'resultado-verif', role: 'status', 'aria-live': 'polite' }), selU, selA, acciones = [], usuarios = {}, accs = {}, i, idU = UI.nuevoId('bu'), idA = UI.nuevoId('ba'), barra;
    for (i = 0; i < datos.length; i++) { usuarios[datos[i].usuario] = true; accs[datos[i].accion] = true; }
    function filtrar() {
      var u = selU.value, a = selA.value;
      tabla.filtrar(u || a ? function (e) { return (!u || e.usuario === u) && (!a || e.accion === a); } : null);
    }
    function opcionesSel(sel, mapa, etiqueta) {
      var ks = U.claves(mapa), k;
      sel.appendChild(U.el('option', { value: '', texto: etiqueta }));
      for (k = 0; k < ks.length; k++) { sel.appendChild(U.el('option', { value: ks[k], texto: ks[k] })); }
    }
    selU = U.el('select', { id: idU, clase: 'ctl ctl-corto', 'aria-label': 'Filtrar por usuario', on: { change: function () { filtrar(); } } });
    selA = U.el('select', { id: idA, clase: 'ctl ctl-corto', 'aria-label': 'Filtrar por acción', on: { change: function () { filtrar(); } } });
    opcionesSel(selU, usuarios, 'Todos los usuarios');
    opcionesSel(selA, accs, 'Todas las acciones');
    barra = U.el('span', { clase: 'barra-filtros' }, [selU, selA]);
    function detalle(e) {
      var pares = [['N.º', String(e.n)], ['Fecha', U.fmt.fechaHora(e.fecha)], ['Usuario', e.usuario], ['Rol', e.rol], ['Acción', e.accion], ['Entidad', e.entidad], ['Registro', e.id], ['Detalle', e.detalle], ['Hash anterior', e.prev ? U.el('code', { clase: 'hash', texto: e.prev }) : ''], ['Hash de la entrada', e.hash ? U.el('code', { clase: 'hash', texto: e.hash }) : '']];
      UI.modal({
        titulo: 'Entrada ' + e.n + ' de la bitácora', ancho: 'modal-ancho',
        contenido: [UI.pares(pares), U.el('h3', { clase: 'sub', texto: 'Antes' }), U.el('pre', { clase: 'json', texto: jsonBonito(e.antes) }), U.el('h3', { clase: 'sub', texto: 'Después' }), U.el('pre', { clase: 'json', texto: jsonBonito(e.despues) })],
        botones: [{ texto: 'Cerrar', clase: 'primario' }]
      });
    }
    tabla = UI.tabla({
      titulo: 'Bitácora', filas: datos, tam: 25, barra: barra, placeholder: 'Buscar en la bitácora…', orden: { col: 'n', desc: true },
      buscar: function (e) { return [e.usuario, e.accion, e.entidad, e.id, e.detalle].join(' '); },
      columnas: [
        { id: 'n', etiqueta: 'N.º', valor: function (e) { return e.n; }, texto: function (e) { return String(e.n); } },
        { id: 'fecha', etiqueta: 'Fecha y hora', valor: function (e) { return e.fecha; }, texto: function (e) { return U.fmt.fechaHora(e.fecha); } },
        { id: 'usuario', etiqueta: 'Usuario', valor: function (e) { return e.usuario; } },
        { id: 'accion', etiqueta: 'Acción', valor: function (e) { return e.accion; }, nodo: function (e) { return UI.insignia(e.accion, tonoAccion(e.accion)); } },
        { id: 'entidad', etiqueta: 'Entidad', valor: function (e) { return e.entidad; } },
        { id: 'id', etiqueta: 'Registro', valor: function (e) { return e.id; } },
        { id: 'detalle', etiqueta: 'Detalle', valor: function (e) { return e.detalle; } },
        { id: 'ver', etiqueta: 'Ver', ordenable: false, nodo: function (e) { return UI.boton('Ver', function () { detalle(e); }, 'secundario', { 'aria-label': 'Ver la entrada ' + e.n }); } }
      ]
    });
    acciones.push(UI.boton('Verificar integridad', function () {
      var r = Aud.verificar();
      U.vaciar(resultado);
      resultado.appendChild(U.el('div', { clase: r.ok ? (r.encadenada ? 'aviso-ok' : 'aviso-info') : 'aviso-form' }, [
        U.el('strong', { texto: r.ok ? (r.encadenada ? 'Bitácora íntegra. ' : 'No verificable. ') : 'Se detectó una alteración. ' }), r.mensaje
      ]));
      Aud.registrar('verificar', 'bitacora', '', null, null, r.ok ? 'Verificación correcta (' + r.total + ' entradas)' : 'Verificación FALLIDA: ' + r.mensaje);
    }, 'primario'));
    acciones.push(UI.boton('Exportar CSV', function () {
      var v = tabla.vista(), filas = [['N.º', 'Fecha', 'Usuario', 'Rol', 'Acción', 'Entidad', 'Registro', 'Detalle', 'Hash']], k;
      for (k = 0; k < v.length; k++) { filas.push([v[k].n, v[k].fecha, v[k].usuario, v[k].rol, v[k].accion, v[k].entidad, v[k].id, v[k].detalle, v[k].hash]); }
      descargarCsv('bitacora-' + U.hoy() + '.csv', filas, 'bitacora', v.length);
    }));
    return { titulo: 'Bitácora de auditoría', migas: [{ texto: 'Tablero', href: '#/tablero' }, { texto: 'Bitácora' }], acciones: acciones, nodo: U.el('div', null, [resultado, UI.seccion(null, U.el('div', null, [U.el('p', { clase: 'tenue', texto: Seg.cfg('cadenaBitacora') ? 'Cada entrada incluye el hash de la anterior: si alguien edita o borra una, «Verificar integridad» lo detecta.' : 'Esta bitácora no está encadenada: no hay forma de comprobar si alguien la alteró.' }), tabla.nodo]))]) };
  };

  /* ---------- Respaldo ---------- */

  /** Respaldo, restauración y reinicio de la demostración. */
  Vistas.respaldo = function () {
    var cont = U.el('div'), archivo = null, boton, entrada, estadoArchivo, idF = UI.nuevoId('rf'), pares;
    estadoArchivo = U.el('p', { clase: 'tenue', 'aria-live': 'polite', texto: 'Ningún archivo elegido.' });
    boton = UI.boton('Restaurar desde el archivo', function () {
      if (!archivo) { return; }
      UI.confirmar({ titulo: '¿Restaurar este respaldo?', texto: 'Se reemplazarán TODOS los datos actuales (registros, documentos, usuarios y bitácora) por los del archivo. Antes de hacerlo, exporta un respaldo del estado actual si lo necesitas.', textoSi: 'Restaurar', peligro: true }, function (si) {
        var r;
        if (!si) { return; }
        r = Almacen.importar(archivo);
        if (!r.ok) { UI.aviso({ titulo: 'No se pudo restaurar', texto: r.error, tipo: 'error' }); return; }
        if (!Seg.usuarioActual()) {
          Seg.sesion = null; Almacen.sesionBorrar();
          App.mensajeLogin = 'Respaldo restaurado. Tu usuario ya no existe en esos datos: ingresa de nuevo.';
          Vistas.ir('#/login'); App.render();
          return;
        }
        Aud.registrar('restauración', 'respaldo', '', null, null, 'Respaldo restaurado');
        UI.toast('Respaldo restaurado correctamente.', 'ok');
        App.render();
      });
    }, 'peligro', { disabled: true });
    entrada = U.el('input', { id: idF, type: 'file', accept: '.json,application/json', clase: 'ctl', on: { change: function () {
      var f = entrada.files && entrada.files[0];
      archivo = null; boton.disabled = true;
      if (!f) { return; }
      U.leerArchivo(f, function (err, texto) {
        U.vaciar(estadoArchivo);
        if (err) { estadoArchivo.appendChild(document.createTextNode(err)); return; }
        archivo = texto;
        boton.disabled = false;
        estadoArchivo.appendChild(document.createTextNode('Archivo listo: ' + f.name + ' (' + Math.round(f.size / 1024) + ' KB).'));
      });
    } } });
    pares = [['Dónde se guardan los datos', Almacen.modo === 'localStorage' ? 'En este navegador (localStorage), clave ' + Almacen.clave : (Almacen.modo === 'window.name' ? 'Solo en esta pestaña (window.name)' : 'Solo en memoria')]];
    pares.push(['Registros', String(Almacen.estado.bitacora.length) + ' entradas de bitácora · ' + String(Almacen.estado.usuarios.length) + ' usuarios']);
    cont.appendChild(UI.seccion('Dónde están tus datos', UI.pares(pares)));
    if (Almacen.aviso) { cont.appendChild(U.el('p', { clase: 'aviso-form', role: 'alert', texto: Almacen.aviso })); }
    cont.appendChild(UI.seccion('Exportar respaldo', U.el('div', null, [
      U.el('p', { texto: 'Descarga todo el sistema en un archivo JSON con un checksum SHA-256 para detectar si alguien lo modifica. Incluye usuarios (con sus hashes, no las claves) y la bitácora.' }),
      UI.boton('Descargar respaldo', function () {
        var nombre = 'respaldo-' + C().id + '-' + U.hoy() + '.json';
        if (U.descargar(nombre, Almacen.exportar(), 'application/json;charset=utf-8')) {
          Aud.registrar('respaldo', 'respaldo', '', null, null, nombre);
          UI.toast('Respaldo descargado: ' + nombre, 'ok');
        } else { UI.aviso({ titulo: 'No se pudo descargar', texto: 'Tu navegador bloqueó la descarga.', tipo: 'error' }); }
      }, 'primario')
    ])));
    cont.appendChild(UI.seccion('Restaurar respaldo', U.el('div', null, [
      U.el('p', { texto: 'Elige un archivo exportado desde este mismo sistema. Se comprueban el formato, el checksum y la estructura antes de tocar nada.' }),
      U.el('div', { clase: 'campo' }, [U.el('label', { 'for': idF, texto: 'Archivo de respaldo (.json)' }), entrada]),
      estadoArchivo, boton
    ])));
    cont.appendChild(UI.seccion('Volver a los datos de demostración', U.el('div', null, [
      U.el('p', { texto: 'Borra todo lo que hayas hecho y vuelve al estado inicial, con los usuarios y claves del archivo LEEME.txt.' }),
      UI.boton('Restablecer demostración', function () {
        UI.confirmar({ titulo: '¿Restablecer la demostración?', texto: 'Se perderán todos los cambios, usuarios nuevos y la bitácora actual. Tendrás que ingresar de nuevo.', textoSi: 'Restablecer', peligro: true }, function (si) {
          if (!si) { return; }
          Seg.sesion = null; Almacen.sesionBorrar();
          Almacen.reiniciar();
          Datos.sembrar();
          App.mensajeLogin = 'Se restablecieron los datos de demostración. Ingresa de nuevo.';
          Vistas.ir('#/login'); App.render();
        });
      }, 'peligro')
    ])));
    return { titulo: 'Respaldo y restauración', migas: [{ texto: 'Tablero', href: '#/tablero' }, { texto: 'Respaldo' }], nodo: cont };
  };

  /* ---------- Configuración ---------- */

  var SEG_TEXTOS = {
    minClave: 'Largo mínimo de la contraseña', intentosMax: 'Intentos fallidos antes de bloquear (0 = sin bloqueo)', bloqueoMin: 'Minutos de bloqueo',
    sesionMin: 'Minutos de inactividad antes de cerrar la sesión (0 = nunca)', cadenaBitacora: 'Bitácora encadenada con hashes', confirmarEliminar: 'Pedir confirmación al eliminar',
    exigirCambioClave: 'Exigir cambio de la clave inicial', ayudaLogin: 'Mostrar usuarios de demostración en el ingreso', exportaRespetaPermisos: 'El CSV respeta los permisos de columnas', cspMeta: 'Content-Security-Policy por <meta>'
  };

  /** Parámetros del negocio y estado de la seguridad. */
  Vistas.configuracion = function () {
    var cfg = C(), campos = [], valores = {}, i, p, f, filas = [], k, claves = U.claves(Seg.DEFECTOS), v, cont = U.el('div'), pares;
    for (i = 0; i < (cfg.parametros || []).length; i++) {
      p = cfg.parametros[i];
      campos.push({ id: p.id, etiqueta: p.etiqueta, tipo: p.tipo === 'texto' ? 'texto' : p.tipo, requerido: true, min: p.min, max: p.max, ayuda: p.ayuda });
      valores[p.id] = Almacen.estado.parametros[p.id];
    }
    f = UI.formulario({
      campos: campos, valores: valores, prefijo: 'cfg', textoGuardar: 'Guardar parámetros',
      onGuardar: function (nuevos) {
        var errores = {}, ok = {}, j, c, n, antes = U.clonar(Almacen.estado.parametros);
        for (j = 0; j < campos.length; j++) {
          c = campos[j];
          n = Datos.normalizar(c, nuevos[c.id]);
          errores[c.id] = Seg.validarCampo(c, n === null ? undefined : n);
          if (!errores[c.id]) { delete errores[c.id]; ok[c.id] = n; }
        }
        if (U.claves(errores).length) { return { ok: false, errores: errores, general: [] }; }
        if (!Seg.puede('s', 'configuracion', 'ver')) { return { ok: false, errores: {}, general: ['No tienes permiso para cambiar parámetros.'] }; }
        U.asignar(Almacen.estado.parametros, ok);
        Almacen.guardar();
        Aud.registrar('parametros', 'configuracion', '', antes, Almacen.estado.parametros, 'Parámetros del negocio actualizados');
        UI.toast('Parámetros guardados.', 'ok');
        return { ok: true };
      }
    });
    cont.appendChild(UI.seccion('Parámetros del negocio', (cfg.parametros || []).length ? f.nodo : UI.vacio({ titulo: 'Este sistema no tiene parámetros editables' })));
    for (k = 0; k < claves.length; k++) {
      v = Seg.cfg(claves[k]);
      filas.push([SEG_TEXTOS[claves[k]] || claves[k], typeof v === 'boolean' ? (v ? 'Activado' : 'Desactivado') : String(v)]);
    }
    cont.appendChild(UI.seccion('Seguridad vigente', UI.pares(filas)));
    pares = [['Sistema', cfg.nombre], ['Rubro', cfg.rubro], ['Versión', cfg.version], ['Esquema de datos', String(Almacen.ESQUEMA)], ['Almacenamiento', Almacen.modo], ['Content-Security-Policy activa', Seg.cspActivo() ? 'Sí' : 'No'], ['Iteraciones del hash de claves', String(Seg.ITERACIONES)]];
    cont.appendChild(UI.seccion('Información del sistema', UI.pares(pares)));
    return { titulo: 'Configuración', migas: [{ texto: 'Tablero', href: '#/tablero' }, { texto: 'Configuración' }], nodo: cont };
  };

  /* ---------- Perfil ---------- */

  /** Perfil del usuario: datos, cambio de clave y resumen de permisos. */
  Vistas.perfil = function () {
    var u = Seg.usuarioActual(), cfg = C(), cont = U.el('div'), f, rol = Seg.rol(u.rol), perms = [], i, d, acc, txt, j;
    var acciones = { ver: 'ver', crear: 'crear', editar: 'editar', eliminar: 'eliminar', emitir: 'emitir', anular: 'anular' };
    f = UI.formulario({
      campos: [
        { id: 'actual', etiqueta: 'Clave actual', tipo: 'clave', requerido: true, max: 100, autocompletar: 'current-password' },
        { id: 'nueva', etiqueta: 'Clave nueva', tipo: 'clave', requerido: true, max: 100, ayuda: Seg.politicaTexto() },
        { id: 'repetida', etiqueta: 'Repite la clave nueva', tipo: 'clave', requerido: true, max: 100 }
      ],
      valores: {}, prefijo: 'pf', textoGuardar: 'Cambiar clave',
      onGuardar: function (v) {
        var forzado = u.cambiar, r = Seg.cambiarClave(v.actual, v.nueva, v.repetida);
        if (r.ok) {
          UI.toast('Clave cambiada correctamente.', 'ok');
          if (forzado) { Vistas.ir('#/tablero'); } else { App.render(); }
        }
        return r;
      }
    });
    if (u.cambiar) { cont.appendChild(U.el('p', { clase: 'aviso-form', role: 'alert', texto: 'Debes cambiar la clave de demostración antes de usar el sistema.' })); }
    cont.appendChild(UI.seccion('Mis datos', UI.pares([['Usuario', u.usuario], ['Nombre', u.nombre], ['Rol', rol ? rol.nombre : u.rol], ['Descripción del rol', rol ? rol.descripcion : ''], ['Último ingreso', u.ultimoAcceso ? U.fmt.fechaHora(u.ultimoAcceso) : '']])));
    cont.appendChild(UI.seccion('Cambiar mi clave', f.nodo));
    for (i = 0; i < (cfg.entidades || []).length; i++) {
      d = cfg.entidades[i]; txt = [];
      for (acc in acciones) { if (Object.prototype.hasOwnProperty.call(acciones, acc) && Seg.puede('e', d.id, acc)) { txt.push(acc); } }
      if (txt.length) { perms.push([d.plural, txt.join(', ')]); }
    }
    for (i = 0; i < (cfg.operaciones || []).length; i++) {
      d = cfg.operaciones[i]; txt = [];
      for (acc in acciones) { if (Object.prototype.hasOwnProperty.call(acciones, acc) && Seg.puede('o', d.id, acc) && (d.permisos[acc] || acc === 'eliminar')) { txt.push(acc); } }
      if (txt.length) { perms.push([d.plural, txt.join(', ')]); }
    }
    txt = [];
    for (j = 0; j < (cfg.reportes || []).length; j++) { if (Seg.puede('r', cfg.reportes[j].id, 'ver')) { txt.push(cfg.reportes[j].titulo); } }
    if (txt.length) { perms.push(['Reportes', txt.join(', ')]); }
    txt = [];
    ['usuarios', 'bitacora', 'respaldo', 'configuracion'].forEach(function (x) { if (Seg.puede('s', x, 'ver')) { txt.push(x); } });
    if (txt.length) { perms.push(['Administración', txt.join(', ')]); }
    cont.appendChild(UI.seccion('Lo que puedo hacer', UI.pares(perms)));
    return { titulo: 'Mi perfil', migas: [{ texto: 'Tablero', href: '#/tablero' }, { texto: 'Perfil' }], nodo: cont, formulario: u.cambiar ? f : null };
  };

  /* ---------- Errores de navegación ---------- */

  /** Pantalla «sin permiso» (la guardia redirige aquí). */
  Vistas.sinPermiso = function () {
    var ruta = App.ultimoDenegado || '';
    return { titulo: 'Sin permiso', migas: [{ texto: 'Tablero', href: '#/tablero' }, { texto: 'Sin permiso' }], nodo: UI.seccion(null, UI.vacio({
      titulo: 'No tienes permiso para ver esta pantalla',
      texto: 'Tu rol («' + ((Seg.rol(Seg.rolActual()) || {}).nombre || Seg.rolActual()) + '») no incluye ' + (ruta ? 'la ruta ' + ruta : 'esta acción') + '. El intento quedó registrado en la bitácora. Si lo necesitas, pídeselo a un administrador.',
      accion: enlaceBtn('Volver al tablero', '#/tablero', 'primario')
    })) };
  };

  /** Pantalla «no encontrado». */
  Vistas.noEncontrado = function (texto) {
    return { titulo: 'No encontrado', migas: [{ texto: 'Tablero', href: '#/tablero' }, { texto: 'No encontrado' }], nodo: UI.seccion(null, UI.vacio({
      titulo: 'No encontramos lo que buscas', texto: texto || 'La dirección no corresponde a ninguna pantalla de este sistema.', accion: enlaceBtn('Volver al tablero', '#/tablero', 'primario')
    })) };
  };

  global.Vistas = Vistas;
})(window);
