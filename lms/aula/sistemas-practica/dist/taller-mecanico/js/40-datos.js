/*
 * 40-datos.js · Datos y reglas de negocio (objeto global Datos)
 * ----------------------------------------------------------------------------
 * CRUD genérico para las entidades y el ciclo de vida de las operaciones
 * (borrador → emitida → anulada), con:
 *   · validación de cada campo, valores únicos y reglas propias del config,
 *   · permisos por rol en cada acción (el menú oculta, ESTE módulo decide),
 *   · integridad referencial: no se borra lo que otro registro usa,
 *   · numeración automática (PRD-0001, F001-00000001),
 *   · auditoría de cada cambio con valores antes/después,
 *   · emisión/anulación todo o nada: si alEmitir/alAnular falla, se deshace.
 * Las funciones de escritura devuelven { ok, registro|doc, errores:{campo:msg}, general:[msg] }
 * y no lanzan excepciones por errores de validación.
 * opts.interno = true salta los permisos (lo usa ctx.datos dentro de alEmitir/alAnular).
 */
(function (global) {
  'use strict';

  var Datos = { origen: '' }; // origen: texto que se añade a la bitácora cuando un cambio lo causa otra operación

  /* ---------- Definiciones y lectura ---------- */

  /** Definición de una entidad del config (o null). */
  Datos.entidad = function (id) {
    return U.buscar(global.SISTEMA.entidades || [], function (e) { return e.id === id; });
  };

  /** Definición de una operación del config (o null). */
  Datos.operacion = function (id) {
    return U.buscar(global.SISTEMA.operaciones || [], function (o) { return o.id === id; });
  };

  function coleccion(clave) {
    var est = Almacen.estado;
    return est.entidades[clave] || est.operaciones[clave] || [];
  }

  function posicionDe(lista, id) {
    return U.posicion(lista, function (r) { return r.id === id; });
  }

  /** Registros de una entidad u operación (copias). filtro(fn) opcional. */
  Datos.listar = function (clave, filtro) {
    var lista = coleccion(clave), r = [], i;
    for (i = 0; i < lista.length; i++) {
      if (!filtro || filtro(lista[i])) { r.push(U.clonar(lista[i])); }
    }
    return r;
  };

  /** Un registro por id (copia). Con crudo = true devuelve el objeto guardado, sin copiar. */
  Datos.obtener = function (clave, id, crudo) {
    var lista = coleccion(clave), i = posicionDe(lista, id);
    if (i < 0) { return null; }
    return crudo ? lista[i] : U.clonar(lista[i]);
  };

  /** Cantidad de registros. */
  Datos.contar = function (clave) { return coleccion(clave).length; };

  /** Texto para mostrar de un registro referenciado (campo `mostrar`, por defecto «nombre»). */
  Datos.etiqueta = function (clave, id, mostrar) {
    var r = Datos.obtener(clave, id, true);
    if (!r) { return id ? String(id) : ''; }
    return String(r[mostrar || 'nombre'] !== undefined ? r[mostrar || 'nombre'] : id);
  };

  /** Copia del registro con sus campos calculados (formula del config) agregados. */
  Datos.conCalculados = function (entId, reg) {
    var def = Datos.entidad(entId), c = U.clonar(reg), i, k, ctx;
    if (!def || !def.calculados) { return c; }
    ctx = Calc.ctx();
    for (i = 0; i < def.calculados.length; i++) {
      k = def.calculados[i];
      try { c[k.id] = k.formula(reg, ctx); } catch (e) { c[k.id] = null; }
    }
    return c;
  };

  /** Valores iniciales de un formulario nuevo (resuelve defecto: 'hoy', '@-7'…). */
  Datos.valoresIniciales = function (campos) {
    var v = {}, i, c;
    for (i = 0; i < campos.length; i++) {
      c = campos[i];
      if (c.defecto !== undefined) { v[c.id] = U.resolverFecha(c.defecto); }
      else if (c.tipo === 'booleano') { v[c.id] = false; }
    }
    return v;
  };

  /* ---------- Normalización y validación ---------- */

  var NUMERICOS = { numero: 1, moneda: 1, entero: 1, porcentaje: 1 };

  /* Convierte un valor crudo (de formulario o API) al tipo del campo; lo inválido queda como está para que la validación lo marque. */
  function normalizar(campo, v) {
    var t = campo.tipo || 'texto', n;
    if (t === 'booleano') { return v === true || v === 'true' || v === 'on' || v === 1; }
    if (v === undefined || v === null) { return null; }
    if (typeof v === 'string') {
      v = v.replace(/^\s+|\s+$/g, '');
      if (v === '') { return null; }
    }
    if (NUMERICOS[t] && typeof v === 'string') { n = U.numero(v); return n === null ? v : n; }
    return v;
  }

  /** Convierte un valor crudo de formulario al tipo del campo (lo inválido queda tal cual para que la validación lo marque). */
  Datos.normalizar = normalizar;

  function claveUnico(v) { return U.sinTildes(String(v)).replace(/\s+/g, ' '); }

  /* Valida un conjunto de campos sobre un objeto; devuelve el mapa de errores. */
  function validarCampos(campos, obj, errores) {
    var i, c, msg;
    for (i = 0; i < campos.length; i++) {
      c = campos[i];
      msg = Seg.validarCampo(c, obj[c.id]);
      if (msg) { errores[c.id] = msg; }
    }
  }

  function aplicarReglas(reglas, obj, general) {
    var ctx = Calc.ctx(), i, ok;
    for (i = 0; i < (reglas || []).length; i++) {
      try { ok = reglas[i].validar(obj, ctx); } catch (e) { ok = false; }
      if (!ok) { general.push(reglas[i].mensaje); }
    }
  }

  /** Valida un registro completo de una entidad. idActual = el propio id al editar (para `unico`). */
  Datos.validar = function (entId, reg, idActual) {
    var def = Datos.entidad(entId), errores = {}, general = [], lista = coleccion(entId), i, j, c, v, otro;
    validarCampos(def.campos, reg, errores);
    for (i = 0; i < def.campos.length; i++) {
      c = def.campos[i];
      v = reg[c.id];
      if (c.unico && !errores[c.id] && v !== undefined && v !== null && v !== '') {
        for (j = 0; j < lista.length; j++) {
          otro = lista[j];
          if (otro.id !== idActual && otro[c.id] !== undefined && claveUnico(otro[c.id]) === claveUnico(v)) {
            errores[c.id] = 'Ya existe un registro con este valor (' + c.etiqueta + ').';
            break;
          }
        }
      }
    }
    if (!U.claves(errores).length) { aplicarReglas(def.reglas, reg, general); }
    return { ok: !U.claves(errores).length && !general.length, errores: errores, general: general };
  };

  /* ---------- Numeración ---------- */

  function siguienteId(prefijo, clave) {
    var est = Almacen.estado, n = (est.contadores[clave] || 0) + 1, lista = coleccion(clave), id;
    id = prefijo + '-' + U.relleno(n, 4);
    while (posicionDe(lista, id) >= 0) { n++; id = prefijo + '-' + U.relleno(n, 4); }
    est.contadores[clave] = n;
    return id;
  }

  function denegado(accion, clave, id) {
    Aud.registrar('acceso-denegado', clave, id || '', null, null, 'Intento de «' + accion + '» sin permiso');
    return { ok: false, errores: {}, general: ['No tienes permiso para ' + accion + '.'] };
  }

  function detalleOrigen(base) { return Datos.origen ? (base ? base + ' · ' : '') + Datos.origen : (base || ''); }

  /* ---------- CRUD de entidades ---------- */

  /** Crea un registro. valores = { campoId: valor } (los textos de formulario se convierten). */
  Datos.crear = function (entId, valores, opts) {
    var def = Datos.entidad(entId), reg, i, c, v, res;
    opts = opts || {};
    if (!def) { return { ok: false, errores: {}, general: ['La entidad «' + entId + '» no existe.'] }; }
    if (!opts.interno && !Seg.puede('e', entId, 'crear')) { return denegado('crear ' + def.plural.toLowerCase(), entId); }
    reg = {};
    for (i = 0; i < def.campos.length; i++) {
      c = def.campos[i];
      if (!opts.interno && !Seg.veCampo(c)) { v = c.defecto !== undefined ? U.resolverFecha(c.defecto) : undefined; }
      else { v = valores[c.id]; }
      v = normalizar(c, v);
      if (v !== null && v !== undefined) { reg[c.id] = v; }
    }
    res = Datos.validar(entId, reg, null);
    if (!res.ok) { return res; }
    reg.id = siguienteId(def.prefijo, entId);
    reg.creado = U.ahoraISO();
    Almacen.estado.entidades[entId].push(reg);
    Almacen.guardar();
    Aud.registrar('crear', entId, reg.id, null, reg, detalleOrigen(''));
    return { ok: true, registro: U.clonar(reg), errores: {}, general: [] };
  };

  /** Actualiza un registro con un parche { campoId: valor }. Los campos que el rol no ve se conservan. */
  Datos.actualizar = function (entId, id, parche, opts) {
    var def = Datos.entidad(entId), lista, i, actual, nuevo, k, c, v, res, antes;
    opts = opts || {};
    if (!def) { return { ok: false, errores: {}, general: ['La entidad «' + entId + '» no existe.'] }; }
    if (!opts.interno && !Seg.puede('e', entId, 'editar')) { return denegado('editar ' + def.plural.toLowerCase(), entId, id); }
    lista = Almacen.estado.entidades[entId];
    i = posicionDe(lista, id);
    if (i < 0) { return { ok: false, errores: {}, general: ['El registro ya no existe.'] }; }
    actual = lista[i];
    nuevo = U.clonar(actual);
    for (k = 0; k < def.campos.length; k++) {
      c = def.campos[k];
      if (parche[c.id] === undefined) { continue; }
      if (!opts.interno && !Seg.veCampo(c)) { continue; }
      v = normalizar(c, parche[c.id]);
      if (v === null || v === undefined) { delete nuevo[c.id]; } else { nuevo[c.id] = v; }
    }
    res = Datos.validar(entId, nuevo, id);
    if (!res.ok) { return res; }
    antes = U.clonar(actual);
    nuevo.modificado = U.ahoraISO();
    lista[i] = nuevo;
    Almacen.guardar();
    Aud.registrar('editar', entId, id, antes, nuevo, detalleOrigen(''));
    return { ok: true, registro: U.clonar(nuevo), errores: {}, general: [] };
  };

  /**
   * Dónde se usa un registro: [{ nombre: 'Ventas', n: 3 }]. Cuenta campos `ref` de otras
   * entidades y operaciones, y las líneas de operaciones cuyo `lineas.entidad` es ésta.
   */
  Datos.usos = function (entId, id) {
    var C = global.SISTEMA, r = [], i, j, k, lista, n, def, c;
    for (i = 0; i < (C.entidades || []).length; i++) {
      def = C.entidades[i];
      lista = coleccion(def.id);
      n = 0;
      for (j = 0; j < lista.length; j++) {
        if (def.id === entId && lista[j].id === id) { continue; }
        for (k = 0; k < def.campos.length; k++) {
          c = def.campos[k];
          if (c.tipo === 'ref' && c.entidad === entId && lista[j][c.id] === id) { n++; break; }
        }
      }
      if (n) { r.push({ nombre: def.plural, n: n }); }
    }
    for (i = 0; i < (C.operaciones || []).length; i++) {
      def = C.operaciones[i];
      lista = coleccion(def.id);
      n = 0;
      for (j = 0; j < lista.length; j++) {
        var usado = false;
        for (k = 0; k < def.campos.length && !usado; k++) {
          c = def.campos[k];
          if (c.tipo === 'ref' && c.entidad === entId && lista[j][c.id] === id) { usado = true; }
        }
        if (!usado && def.lineas && def.lineas.entidad === entId) {
          usado = U.posicion(lista[j].lineas || [], function (l) { return l.item === id; }) >= 0;
        }
        if (usado) { n++; }
      }
      if (n) { r.push({ nombre: def.plural, n: n }); }
    }
    return r;
  };

  /** Elimina un registro si ningún otro lo usa. */
  Datos.eliminar = function (entId, id, opts) {
    var def = Datos.entidad(entId), lista, i, usos, partes = [], j, antes;
    opts = opts || {};
    if (!def) { return { ok: false, errores: {}, general: ['La entidad «' + entId + '» no existe.'] }; }
    if (!opts.interno && !Seg.puede('e', entId, 'eliminar')) { return denegado('eliminar ' + def.plural.toLowerCase(), entId, id); }
    lista = Almacen.estado.entidades[entId];
    i = posicionDe(lista, id);
    if (i < 0) { return { ok: false, errores: {}, general: ['El registro ya no existe.'] }; }
    usos = Datos.usos(entId, id);
    if (usos.length) {
      for (j = 0; j < usos.length; j++) { partes.push(usos[j].nombre + ' (' + usos[j].n + ')'); }
      return { ok: false, errores: {}, general: ['No se puede eliminar: otros registros lo usan en ' + partes.join(', ') + '. Elimina o cambia primero esos registros.'] };
    }
    antes = lista[i];
    lista.splice(i, 1);
    Almacen.guardar();
    Aud.registrar('eliminar', entId, id, antes, null, detalleOrigen(''));
    return { ok: true, errores: {}, general: [] };
  };

  /* ---------- Operaciones (documentos con cabecera y líneas) ---------- */

  /** Calcula los totales de un documento con la función `calcular` del config (o null si no hay). */
  Datos.opTotales = function (op, doc) {
    if (!op.calcular) { return null; }
    return Calc.totales(op, doc);
  };

  /** Importe de una línea: op.lineas.importe(l, ctx) o cantidad × precio. */
  Datos.importeLinea = function (op, linea) {
    var f = op.lineas && op.lineas.importe, ctx = Calc.ctx(), v;
    try { v = f ? f(linea, ctx) : (Number(linea.cantidad) || 0) * (Number(linea.precio) || 0); } catch (e) { v = 0; }
    return ctx.redondear(v);
  };

  /* Normaliza los campos de cabecera y las líneas de un documento. */
  function normalizarDoc(op, valores, base, interno) {
    var doc = base ? U.clonar(base) : {}, i, c, v, ls, l, lin, j, lc;
    for (i = 0; i < op.campos.length; i++) {
      c = op.campos[i];
      if (valores[c.id] === undefined && !base) { v = c.defecto !== undefined ? U.resolverFecha(c.defecto) : undefined; }
      else if (valores[c.id] === undefined) { continue; }
      else { v = valores[c.id]; }
      v = normalizar(c, v);
      if (v === null || v === undefined) { delete doc[c.id]; } else { doc[c.id] = v; }
    }
    if (op.lineas && valores.lineas !== undefined) {
      ls = [];
      for (i = 0; i < valores.lineas.length; i++) {
        l = valores.lineas[i];
        lin = { item: l.item, precio: normalizar({ tipo: 'moneda' }, l.precio) };
        for (j = 0; j < (op.lineas.campos || []).length; j++) {
          lc = op.lineas.campos[j];
          v = normalizar(lc, l[lc.id]);
          if (v !== null && v !== undefined) { lin[lc.id] = v; }
        }
        ls.push(lin);
      }
      doc.lineas = ls;
    }
    return doc;
  }

  /** Valida un documento. paraEmitir exige al menos una línea y revisa las reglas de la operación. */
  Datos.opValidar = function (opId, doc, paraEmitir) {
    var op = Datos.operacion(opId), errores = {}, general = [], i, j, l, lc, msg, vistos = {}, erroresLinea = [];
    validarCampos(op.campos, doc, errores);
    if (op.lineas) {
      if (paraEmitir && (!doc.lineas || doc.lineas.length === 0)) { general.push('Agrega al menos una línea antes de emitir.'); }
      for (i = 0; i < (doc.lineas || []).length; i++) {
        l = doc.lineas[i];
        erroresLinea[i] = {};
        if (!l.item || !Datos.obtener(op.lineas.entidad, l.item, true)) { erroresLinea[i].item = 'Elige un ítem.'; }
        else if (vistos[l.item]) { erroresLinea[i].item = 'Este ítem está repetido: suma las cantidades en una sola línea.'; }
        vistos[l.item] = true;
        msg = Seg.validarCampo({ tipo: 'moneda', min: 0, requerido: true }, l.precio);
        if (msg) { erroresLinea[i].precio = msg; }
        for (j = 0; j < (op.lineas.campos || []).length; j++) {
          lc = op.lineas.campos[j];
          msg = Seg.validarCampo(lc, l[lc.id]);
          if (msg) { erroresLinea[i][lc.id] = msg; }
        }
        if (U.claves(erroresLinea[i]).length) { general.push('Línea ' + (i + 1) + ': ' + erroresLinea[i][U.claves(erroresLinea[i])[0]]); }
      }
    }
    if (!U.claves(errores).length && !general.length) { aplicarReglas(op.reglas, doc, general); }
    return { ok: !U.claves(errores).length && !general.length, errores: errores, general: general, erroresLinea: erroresLinea };
  };

  /** Crea un documento en estado inicial (borrador). valores = campos de cabecera + lineas. */
  Datos.opCrear = function (opId, valores) {
    var op = Datos.operacion(opId), doc, res, u = Seg.usuarioActual();
    if (!Seg.puede('o', opId, 'crear')) { return denegado('crear ' + op.plural.toLowerCase(), opId); }
    doc = normalizarDoc(op, valores, null);
    if (op.lineas && !doc.lineas) { doc.lineas = []; }
    res = Datos.opValidar(opId, doc, false);
    if (!res.ok) { return res; }
    doc.id = siguienteId(op.prefijo, opId);
    doc.numero = '';
    doc.estado = op.estados[0];
    doc.creadoPor = u ? u.usuario : 'sistema';
    doc.creado = U.ahoraISO();
    if (op.calcular) { doc.totales = Datos.opTotales(op, doc); }
    Almacen.estado.operaciones[opId].push(doc);
    Almacen.guardar();
    Aud.registrar('crear', opId, doc.id, null, doc, 'Documento creado como ' + doc.estado);
    return { ok: true, doc: U.clonar(doc), errores: {}, general: [] };
  };

  /** Guarda cambios de un documento (solo mientras está en el estado inicial). */
  Datos.opActualizar = function (opId, id, valores) {
    var op = Datos.operacion(opId), lista = Almacen.estado.operaciones[opId], i = posicionDe(lista, id), antes, doc, res;
    if (!Seg.puede('o', opId, 'editar')) { return denegado('editar ' + op.plural.toLowerCase(), opId, id); }
    if (i < 0) { return { ok: false, errores: {}, general: ['El documento ya no existe.'] }; }
    if (lista[i].estado !== op.estados[0]) { return { ok: false, errores: {}, general: ['Solo se puede editar un documento en estado «' + op.estados[0] + '».'] }; }
    antes = lista[i];
    doc = normalizarDoc(op, valores, antes);
    res = Datos.opValidar(opId, doc, false);
    if (!res.ok) { return res; }
    if (op.calcular) { doc.totales = Datos.opTotales(op, doc); }
    doc.modificado = U.ahoraISO();
    lista[i] = doc;
    Almacen.guardar();
    Aud.registrar('editar', opId, id, antes, doc, '');
    return { ok: true, doc: U.clonar(doc), errores: {}, general: [] };
  };

  /** Elimina un borrador. */
  Datos.opEliminar = function (opId, id) {
    var op = Datos.operacion(opId), lista = Almacen.estado.operaciones[opId], i = posicionDe(lista, id), antes;
    if (!Seg.puede('o', opId, 'eliminar')) { return denegado('eliminar ' + op.plural.toLowerCase(), opId, id); }
    if (i < 0) { return { ok: false, errores: {}, general: ['El documento ya no existe.'] }; }
    if (lista[i].estado !== op.estados[0]) { return { ok: false, errores: {}, general: ['Solo se pueden eliminar documentos en estado «' + op.estados[0] + '». Los demás se anulan.'] }; }
    antes = lista[i];
    lista.splice(i, 1);
    Almacen.guardar();
    Aud.registrar('eliminar', opId, id, antes, null, 'Borrador eliminado');
    return { ok: true, errores: {}, general: [] };
  };

  /* Ejecuta paso() dentro de una "transacción": si lanza error, se vuelve al estado anterior. */
  function transaccion(paso) {
    var foto = Almacen.instantanea(), res;
    try {
      res = paso();
    } catch (e) {
      Almacen.restaurarInstantanea(foto);
      Datos.origen = '';
      return { ok: false, errores: {}, general: [String(e && e.message ? e.message : e)] };
    }
    if (!res.ok) { Almacen.restaurarInstantanea(foto); }
    Datos.origen = '';
    return res;
  }

  /** Emite un borrador: valida, numera, ejecuta alEmitir y registra. Todo o nada. */
  Datos.opEmitir = function (opId, id) {
    var op = Datos.operacion(opId);
    if (!Seg.puede('o', opId, 'emitir')) { return denegado('emitir ' + op.plural.toLowerCase(), opId, id); }
    return transaccion(function () {
      var lst = Almacen.estado.operaciones[opId], idx = posicionDe(lst, id), antes, d, r, clave;
      if (idx < 0) { return { ok: false, errores: {}, general: ['El documento ya no existe.'] }; }
      if (lst[idx].estado !== op.estados[0]) { return { ok: false, errores: {}, general: ['El documento ya fue emitido o anulado.'] }; }
      antes = U.clonar(lst[idx]);
      d = lst[idx];
      r = Datos.opValidar(opId, d, true);
      if (!r.ok) { return r; }
      clave = 'num_' + opId;
      Almacen.estado.contadores[clave] = (Almacen.estado.contadores[clave] || 0) + 1;
      d.numero = (op.serie ? op.serie + '-' : '') + U.relleno(Almacen.estado.contadores[clave], 8);
      d.estado = op.estados[1];
      d.emitido = U.ahoraISO();
      if (op.calcular) { d.totales = Datos.opTotales(op, d); }
      Datos.origen = 'Emisión de ' + d.numero;
      if (op.alEmitir) { op.alEmitir(U.clonar(d), Calc.ctx()); }
      Almacen.guardar();
      Aud.registrar('emitir', opId, id, antes, d, 'Número ' + d.numero);
      return { ok: true, doc: U.clonar(d), errores: {}, general: [] };
    });
  };

  /** Anula un documento emitido (motivo obligatorio) y revierte sus efectos con alAnular. */
  Datos.opAnular = function (opId, id, motivo) {
    var op = Datos.operacion(opId), m = String(motivo || '').replace(/^\s+|\s+$/g, '');
    if (!Seg.puede('o', opId, 'anular')) { return denegado('anular ' + op.plural.toLowerCase(), opId, id); }
    if (m.length < 5 || m.length > 200) { return { ok: false, errores: { motivo: 'Escribe el motivo (de 5 a 200 caracteres).' }, general: [] }; }
    return transaccion(function () {
      var lst = Almacen.estado.operaciones[opId], idx = posicionDe(lst, id), antes, d, k;
      if (idx < 0) { return { ok: false, errores: {}, general: ['El documento ya no existe.'] }; }
      d = lst[idx];
      k = op.estados.indexOf(d.estado);
      if (k < 1 || k >= op.estados.length - 1) { return { ok: false, errores: {}, general: ['Solo se puede anular un documento emitido.'] }; }
      antes = U.clonar(d);
      d.estado = op.estados[op.estados.length - 1];
      d.anulado = U.ahoraISO();
      d.motivoAnulacion = m;
      Datos.origen = 'Anulación de ' + (d.numero || d.id);
      if (op.alAnular) { op.alAnular(U.clonar(d), Calc.ctx()); }
      Almacen.guardar();
      Aud.registrar('anular', opId, id, antes, d, 'Motivo: ' + m);
      return { ok: true, doc: U.clonar(d), errores: {}, general: [] };
    });
  };

  /** Mueve un documento entre estados intermedios (solo si la operación define más de 3 estados). */
  Datos.opCambiarEstado = function (opId, id, nuevo) {
    var op = Datos.operacion(opId), lista = Almacen.estado.operaciones[opId], i = posicionDe(lista, id), antes, ki, kn;
    if (!Seg.puede('o', opId, 'emitir')) { return denegado('cambiar el estado de ' + op.plural.toLowerCase(), opId, id); }
    if (i < 0) { return { ok: false, errores: {}, general: ['El documento ya no existe.'] }; }
    ki = op.estados.indexOf(lista[i].estado);
    kn = op.estados.indexOf(nuevo);
    if (ki < 1 || ki >= op.estados.length - 1 || kn < 1 || kn >= op.estados.length - 1) { return { ok: false, errores: {}, general: ['Ese cambio de estado no es válido.'] }; }
    antes = U.clonar(lista[i]);
    lista[i].estado = nuevo;
    Almacen.guardar();
    Aud.registrar('estado', opId, id, antes, lista[i], 'Estado: ' + antes.estado + ' → ' + nuevo);
    return { ok: true, doc: U.clonar(lista[i]), errores: {}, general: [] };
  };

  /* ---------- Siembra inicial ---------- */

  /** Llena el estado con la demostración del config: parámetros, usuarios, registros y documentos. */
  Datos.sembrar = function () {
    var C = global.SISTEMA, est = Almacen.estado, sem = U.resolverFechas(U.clonar(C.semillas || {})), i, j, def, lista, max, m, ops, op, docs, d;
    for (i = 0; i < (C.parametros || []).length; i++) { est.parametros[C.parametros[i].id] = C.parametros[i].valor; }
    est.usuarios = Seg.sembrarUsuarios();
    for (i = 0; i < (C.entidades || []).length; i++) {
      def = C.entidades[i];
      lista = sem[def.id] || [];
      max = 0;
      for (j = 0; j < lista.length; j++) {
        lista[j].creado = lista[j].creado || U.ahoraISO();
        m = /(\d+)$/.exec(lista[j].id);
        if (m) { max = Math.max(max, parseInt(m[1], 10)); }
      }
      est.entidades[def.id] = lista;
      est.contadores[def.id] = max;
    }
    ops = C.operaciones || [];
    for (i = 0; i < ops.length; i++) {
      op = ops[i];
      docs = U.ordenar(sem[op.id] || [], function (a, b) { return a.fecha < b.fecha ? -1 : (a.fecha > b.fecha ? 1 : (a.id < b.id ? -1 : 1)); });
      max = 0;
      est.contadores['num_' + op.id] = 0;
      for (j = 0; j < docs.length; j++) {
        d = docs[j];
        d.estado = d.estado || op.estados[0];
        if (op.lineas && !d.lineas) { d.lineas = []; }
        d.creadoPor = d.creadoPor || 'sistema';
        d.creado = d.creado || (d.fecha ? d.fecha + 'T12:00:00.000Z' : U.ahoraISO());
        if (d.estado !== op.estados[0]) {
          est.contadores['num_' + op.id] += 1;
          d.numero = d.numero || ((op.serie ? op.serie + '-' : '') + U.relleno(est.contadores['num_' + op.id], 8));
        } else { d.numero = d.numero || ''; }
        if (d.estado === op.estados[op.estados.length - 1] && !d.motivoAnulacion) { d.motivoAnulacion = 'Anulación de demostración'; }
        m = /(\d+)$/.exec(d.id);
        if (m) { max = Math.max(max, parseInt(m[1], 10)); }
      }
      est.operaciones[op.id] = docs;
      est.contadores[op.id] = max;
    }
    for (i = 0; i < ops.length; i++) {
      if (!ops[i].calcular) { continue; }
      for (j = 0; j < est.operaciones[ops[i].id].length; j++) {
        est.operaciones[ops[i].id][j].totales = Calc.totales(ops[i], est.operaciones[ops[i].id][j]);
      }
    }
    Almacen.guardar();
    Aud.registrar('inicialización', '', '', null, null, 'Datos de demostración cargados (' + C.usuarios.length + ' usuarios)', 'sistema');
  };

  global.Datos = Datos;
})(window);
