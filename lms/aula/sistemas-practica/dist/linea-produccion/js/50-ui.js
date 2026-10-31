/*
 * 50-ui.js · Componentes de interfaz (objeto global UI)
 * ----------------------------------------------------------------------------
 * Piezas reutilizables que arman las pantallas. Todo se construye con nodos DOM
 * (U.el), nunca con innerHTML, y cada componente cuida el teclado y los
 * lectores de pantalla (etiquetas, aria-*, foco).
 *   UI.boton, UI.insignia, UI.vacio, UI.migas, UI.seccion, UI.pares
 *   UI.toast(texto, tipo)
 *   UI.modal(opts) · UI.confirmar(opts, cb) · UI.aviso(opts) · UI.pedirTexto(opts, cb)
 *   UI.formulario(opts)   formulario con validación en línea
 *   UI.tabla(opts)        tabla con búsqueda, orden y paginación
 *   UI.grafico(g, opts)   barras HTML, columnas HTML o línea SVG
 * No se usan los diálogos nativos del navegador (alert, confirm, prompt).
 */
(function (global) {
  'use strict';

  var UI = {};
  var contadorId = 0;

  function nuevoId(prefijo) { contadorId += 1; return (prefijo || 'u') + contadorId; }
  UI.nuevoId = nuevoId;

  /* ---------- Elementos simples ---------- */

  /** Botón. clase: 'primario' | 'peligro' | 'secundario' (por defecto). */
  UI.boton = function (texto, onClick, clase, extra) {
    var attrs = { type: 'button', clase: 'btn' + (clase ? ' btn-' + clase : ' btn-secundario'), texto: texto, on: {} };
    if (onClick) { attrs.on.click = onClick; }
    if (extra) { U.asignar(attrs, extra); }
    return U.el('button', attrs);
  };

  /** Insignia de estado. tono: ok | aviso | error | info | neutro. */
  UI.insignia = function (texto, tono) {
    return U.el('span', { clase: 'insignia insignia-' + (tono || 'neutro'), texto: texto });
  };

  /** Estado vacío con texto útil y, si se da, una acción. */
  UI.vacio = function (opts) {
    return U.el('div', { clase: 'vacio' }, [
      U.el('p', { clase: 'vacio-titulo', texto: opts.titulo }),
      opts.texto ? U.el('p', { clase: 'vacio-texto', texto: opts.texto }) : null,
      opts.accion || null
    ]);
  };

  /** Migas de pan. items: [{ texto, href }]; el último es la página actual. */
  UI.migas = function (items) {
    var lis = [], i, it;
    for (i = 0; i < items.length; i++) {
      it = items[i];
      if (i === items.length - 1) { lis.push(U.el('li', { 'aria-current': 'page', texto: it.texto })); }
      else { lis.push(U.el('li', null, U.el('a', { href: it.href, texto: it.texto }))); }
    }
    return U.el('nav', { clase: 'migas', 'aria-label': 'Ruta de navegación' }, U.el('ol', null, lis));
  };

  /** Tarjeta con título y acciones opcionales. */
  UI.seccion = function (titulo, contenido, acciones, nivel) {
    var h = 'h' + (nivel || 2);
    return U.el('section', { clase: 'tarjeta' }, [
      titulo || acciones ? U.el('div', { clase: 'tarjeta-cab' }, [U.el(h, { clase: 'tarjeta-titulo', texto: titulo || '' }), acciones ? U.el('div', { clase: 'acciones' }, acciones) : null]) : null,
      contenido
    ]);
  };

  /** Lista de definición (etiqueta / valor). pares: [[etiqueta, valor(texto o nodo)]]. */
  UI.pares = function (pares) {
    var dl = U.el('dl', { clase: 'pares' }), i;
    for (i = 0; i < pares.length; i++) {
      dl.appendChild(U.el('dt', { texto: pares[i][0] }));
      dl.appendChild(U.el('dd', null, pares[i][1] === null || pares[i][1] === undefined || pares[i][1] === '' ? U.el('span', { clase: 'tenue', texto: '—' }) : pares[i][1]));
    }
    return dl;
  };

  /* ---------- Avisos breves ---------- */

  /** Mensaje flotante que se apaga solo. tipo: ok | error | aviso | info. */
  UI.toast = function (texto, tipo) {
    var zona = document.getElementById('toasts'), t;
    if (!zona) {
      zona = U.el('div', { id: 'toasts', clase: 'toasts', role: 'status', 'aria-live': 'polite' });
      document.body.appendChild(zona);
    }
    t = U.el('div', { clase: 'toast toast-' + (tipo || 'info'), texto: texto });
    while (zona.childNodes.length >= 3) { zona.removeChild(zona.firstChild); } // máximo 3 avisos a la vez
    zona.appendChild(t);
    setTimeout(function () { U.quitar(t); }, tipo === 'error' ? 7000 : 4500);
  };

  /* ---------- Modal ---------- */

  var pila = []; // modales abiertos, el último es el de arriba
  var escuchaEsc = false;

  var FOCALIZABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

  function focalizables(raiz) {
    var lista = raiz.querySelectorAll(FOCALIZABLE), r = [], i;
    for (i = 0; i < lista.length; i++) { if (lista[i].offsetWidth || lista[i].offsetHeight) { r.push(lista[i]); } }
    return r;
  }

  function alTeclado(ev) {
    var m = pila[pila.length - 1], f, primero, ultimo;
    if (!m) { return; }
    if (ev.key === 'Escape' || ev.key === 'Esc' || ev.keyCode === 27) {
      if (m.opts.sinCerrar) { return; }
      ev.preventDefault();
      m.cerrar();
      return;
    }
    if (ev.key === 'Tab' || ev.keyCode === 9) {
      f = focalizables(m.dialogo);
      if (!f.length) { ev.preventDefault(); m.dialogo.focus(); return; }
      primero = f[0]; ultimo = f[f.length - 1];
      if (ev.shiftKey && (document.activeElement === primero || document.activeElement === m.dialogo)) { ev.preventDefault(); ultimo.focus(); }
      else if (!ev.shiftKey && document.activeElement === ultimo) { ev.preventDefault(); primero.focus(); }
      else if (!U.ancestro(document.activeElement, function (n) { return n === m.dialogo; })) { ev.preventDefault(); primero.focus(); }
    }
  }

  /**
   * Abre una ventana modal accesible (foco atrapado, Esc cierra, devuelve el foco).
   * opts: { titulo, contenido (nodo), botones:[{texto, clase, onClick(cerrar) → false para no cerrar}],
   *         ancho:'ancho', sinCerrar, onCerrar, focoInicial: nodo }
   */
  UI.modal = function (opts) {
    var idTitulo = nuevoId('mt'), previo = document.activeElement, fondo, dialogo, pie = null, i, m, app, abierto = true;
    function cerrar() {
      var k;
      if (!abierto) { return; }
      abierto = false;
      k = pila.indexOf(m);
      if (k >= 0) { pila.splice(k, 1); }
      U.quitar(fondo);
      if (!pila.length) {
        app = document.getElementById('app');
        if (app) { app.removeAttribute('aria-hidden'); }
        U.quitarClase(document.body, 'modal-abierto');
      }
      if (previo && previo.focus && document.body.contains(previo)) { try { previo.focus(); } catch (e) { /* sin foco */ } }
      if (opts.onCerrar) { opts.onCerrar(); }
    }
    if (opts.botones && opts.botones.length) {
      pie = U.el('div', { clase: 'modal-pie' });
      for (i = 0; i < opts.botones.length; i++) {
        (function (b) {
          pie.appendChild(UI.boton(b.texto, function () {
            var r = b.onClick ? b.onClick(cerrar) : undefined;
            if (r !== false && b.cerrar !== false) { cerrar(); }
          }, b.clase || 'secundario'));
        })(opts.botones[i]);
      }
    }
    dialogo = U.el('div', { clase: 'modal ' + (opts.ancho || ''), role: opts.alerta ? 'alertdialog' : 'dialog', 'aria-modal': 'true', 'aria-labelledby': idTitulo, tabindex: '-1' }, [
      U.el('div', { clase: 'modal-cab' }, [
        U.el('h2', { id: idTitulo, clase: 'modal-titulo', texto: opts.titulo }),
        opts.sinCerrar ? null : U.el('button', { type: 'button', clase: 'modal-x', 'aria-label': 'Cerrar', texto: '×', on: { click: cerrar } })
      ]),
      U.el('div', { clase: 'modal-cuerpo' }, opts.contenido),
      pie
    ]);
    fondo = U.el('div', { clase: 'modal-fondo' }, dialogo);
    fondo.addEventListener('mousedown', function (ev) { if (ev.target === fondo && !opts.sinCerrar) { cerrar(); } });
    m = { opts: opts, cerrar: cerrar, dialogo: dialogo };
    pila.push(m);
    document.body.appendChild(fondo);
    U.agregarClase(document.body, 'modal-abierto');
    app = document.getElementById('app');
    if (app) { app.setAttribute('aria-hidden', 'true'); }
    if (!escuchaEsc) { document.addEventListener('keydown', alTeclado, true); escuchaEsc = true; }
    (opts.focoInicial || focalizables(dialogo)[0] || dialogo).focus();
    return { cerrar: cerrar, nodo: dialogo };
  };

  /** Cierra todos los modales abiertos (al cerrar sesión). */
  UI.cerrarModales = function () {
    while (pila.length) { pila[pila.length - 1].cerrar(); }
  };

  /** Confirmación propia (reemplaza a confirm). cb(true|false). El foco inicial va a «Cancelar» si es peligrosa. */
  UI.confirmar = function (opts, cb) {
    var cancelar, m;
    m = UI.modal({
      titulo: opts.titulo, alerta: !!opts.peligro,
      contenido: U.el('p', { clase: 'modal-texto', texto: opts.texto || '' }),
      botones: [
        { texto: opts.textoNo || 'Cancelar', onClick: function () { cb(false); } },
        { texto: opts.textoSi || 'Aceptar', clase: opts.peligro ? 'peligro' : 'primario', onClick: function () { cb(true); } }
      ]
    });
    cancelar = m.nodo.querySelectorAll('.modal-pie button')[0];
    if (opts.peligro && cancelar) { cancelar.focus(); }
    return m;
  };

  /** Aviso con un solo botón (reemplaza a alert). */
  UI.aviso = function (opts) {
    return UI.modal({
      titulo: opts.titulo, alerta: opts.tipo === 'error',
      contenido: U.el('p', { clase: 'modal-texto', texto: opts.texto || '' }),
      botones: [{ texto: opts.textoOk || 'Entendido', clase: 'primario' }]
    });
  };

  /**
   * Pide un texto (reemplaza a prompt). opts: { titulo, etiqueta, texto, minimo, maximo, multilinea, textoOk }.
   * cb(texto) solo si se confirma con un valor válido.
   */
  UI.pedirTexto = function (opts, cb) {
    var id = nuevoId('pt'), entrada, error, caja, min = opts.minimo || 1, max = opts.maximo || 200;
    entrada = opts.multilinea ? U.el('textarea', { id: id, rows: '3', maxlength: String(max), clase: 'ctl' }) : U.el('input', { id: id, type: 'text', maxlength: String(max), clase: 'ctl' });
    error = U.el('p', { clase: 'error-campo', role: 'alert' });
    caja = U.el('div', { clase: 'campo' }, [
      opts.texto ? U.el('p', { clase: 'modal-texto', texto: opts.texto }) : null,
      U.el('label', { 'for': id, texto: opts.etiqueta }), entrada, error
    ]);
    UI.modal({
      titulo: opts.titulo, contenido: caja, focoInicial: entrada,
      botones: [
        { texto: 'Cancelar' },
        {
          texto: opts.textoOk || 'Aceptar', clase: opts.peligro ? 'peligro' : 'primario', cerrar: false,
          onClick: function (cerrar) {
            var v = entrada.value.replace(/^\s+|\s+$/g, '');
            if (v.length < min) {
              U.vaciar(error); error.appendChild(document.createTextNode('Escribe al menos ' + min + ' caracteres.'));
              entrada.setAttribute('aria-invalid', 'true'); entrada.focus(); return false;
            }
            cerrar(); cb(v);
          }
        }
      ]
    });
  };

  /* ---------- Formulario ---------- */

  function etiquetaDe(campo) { return campo.etiqueta || campo.id; }

  /* Opciones de un select de referencia: [{valor, texto}] ordenadas por texto, desambiguando repetidos. */
  function opcionesRef(campo) {
    var filas = Datos.listar(campo.entidad), mostrar = campo.mostrar || 'nombre', r = [], vistos = {}, i, t;
    for (i = 0; i < filas.length; i++) {
      t = String(filas[i][mostrar] !== undefined ? filas[i][mostrar] : filas[i].id);
      vistos[t] = (vistos[t] || 0) + 1;
      r.push({ valor: filas[i].id, texto: t });
    }
    for (i = 0; i < r.length; i++) { if (vistos[r[i].texto] > 1) { r[i].texto += ' (' + r[i].valor + ')'; } }
    return U.ordenar(r, function (a, b) { return U.comparar(a.texto, b.texto); });
  }
  UI.opcionesRef = opcionesRef;

  /** Crea el control de un campo (sin etiqueta). Devuelve { control, leer() }. */
  UI.control = function (campo, valor, id, opts) {
    var tipo = campo.tipo || 'texto', c, ops, i, o, sel, ayudaId = opts && opts.ayudaId, base;
    base = { id: id, name: campo.id, clase: 'ctl', 'aria-describedby': ayudaId };
    if (opts && opts.soloLectura) { base.disabled = true; }
    if (tipo === 'textarea') {
      c = U.el('textarea', U.asignar(base, { rows: '3', maxlength: String(campo.max || 2000) }));
      c.value = valor === undefined || valor === null ? '' : String(valor);
      return { control: c, leer: function () { return c.value; } };
    }
    if (tipo === 'booleano') {
      c = U.el('input', U.asignar(base, { type: 'checkbox', clase: 'chk' }));
      c.checked = !!valor;
      return { control: c, leer: function () { return c.checked; } };
    }
    if (tipo === 'lista' || tipo === 'ref') {
      c = U.el('select', base);
      ops = tipo === 'lista' ? (function () {
        var r = [], k;
        for (k = 0; k < (campo.opciones || []).length; k++) { r.push({ valor: campo.opciones[k], texto: (campo.etiquetasOpc && campo.etiquetasOpc[campo.opciones[k]]) || campo.opciones[k] }); }
        return r;
      })() : opcionesRef(campo);
      c.appendChild(U.el('option', { value: '', texto: '— Elige una opción —' }));
      for (i = 0; i < ops.length; i++) {
        o = U.el('option', { value: ops[i].valor, texto: ops[i].texto });
        c.appendChild(o);
      }
      sel = valor === undefined || valor === null ? '' : String(valor);
      c.value = sel;
      if (c.value !== sel) { c.value = ''; }
      return { control: c, leer: function () { return c.value; } };
    }
    if (tipo === 'numero' || tipo === 'moneda' || tipo === 'entero' || tipo === 'porcentaje') {
      c = U.el('input', U.asignar(base, {
        type: 'number', step: tipo === 'entero' ? '1' : (tipo === 'numero' ? 'any' : '0.01'),
        min: campo.min !== undefined ? String(campo.min) : (tipo === 'porcentaje' ? '0' : null),
        max: campo.max !== undefined ? String(campo.max) : (tipo === 'porcentaje' ? '100' : null),
        inputmode: 'decimal', clase: 'ctl ctl-num'
      }));
      c.value = valor === undefined || valor === null ? '' : String(valor);
      return { control: c, leer: function () { return c.value; } };
    }
    if (tipo === 'fecha') {
      c = U.el('input', U.asignar(base, { type: 'date', placeholder: 'AAAA-MM-DD', maxlength: '10' }));
      c.value = valor === undefined || valor === null ? '' : String(valor);
      return { control: c, leer: function () { return c.value; } };
    }
    c = U.el('input', U.asignar(base, {
      type: tipo === 'email' ? 'email' : (tipo === 'telefono' ? 'tel' : (tipo === 'clave' ? 'password' : 'text')), maxlength: String(campo.max || 200),
      placeholder: campo.placeholder || null, autocomplete: tipo === 'clave' ? (campo.autocompletar || 'new-password') : 'off'
    }));
    c.value = valor === undefined || valor === null ? '' : String(valor);
    return { control: c, leer: function () { return c.value; } };
  };

  /**
   * Formulario con etiquetas visibles, ayuda y errores en línea.
   * opts: { campos, valores, onGuardar(valores) → {ok, errores, general}, onCancelar, textoGuardar,
   *         soloLectura, prefijo, ocultarBotones }
   * Devuelve { nodo, leer(), mostrarErrores(errores, general), enfocar() }.
   */
  UI.formulario = function (opts) {
    var prefijo = opts.prefijo || nuevoId('f'), form, filas, campos = [], mapa = {}, general, i, c, id, cont, etq, ayuda, err, ctl, botones;
    general = U.el('div', { clase: 'aviso-form', role: 'alert', hidden: true });
    filas = U.el('div', { clase: 'fila-campos' });
    for (i = 0; i < opts.campos.length; i++) {
      c = opts.campos[i];
      if (!Seg.veCampo(c)) { continue; }
      id = prefijo + '-' + c.id;
      ayuda = c.ayuda ? U.el('p', { id: id + '-ayuda', clase: 'ayuda-campo', texto: c.ayuda }) : null;
      err = U.el('p', { id: id + '-error', clase: 'error-campo', role: 'alert' });
      ctl = UI.control(c, opts.valores ? opts.valores[c.id] : undefined, id, { ayudaId: (ayuda ? id + '-ayuda ' : '') + id + '-error', soloLectura: opts.soloLectura });
      etq = U.el('label', { 'for': id }, [etiquetaDe(c), c.requerido && !opts.soloLectura ? U.el('span', { clase: 'req', 'aria-hidden': 'true', texto: ' *' }) : null, c.requerido && !opts.soloLectura ? U.el('span', { clase: 'solo-lector', texto: ' (obligatorio)' }) : null]);
      cont = U.el('div', { clase: 'campo' + ((c.tipo === 'textarea') ? ' campo-ancho' : '') + (c.tipo === 'booleano' ? ' campo-chk' : '') }, c.tipo === 'booleano' ? [ctl.control, etq, ayuda, err] : [etq, ctl.control, ayuda, err]);
      filas.appendChild(cont);
      mapa[c.id] = { campo: c, ctl: ctl, error: err, contenedor: cont };
      campos.push(mapa[c.id]);
      (function (m) {
        m.ctl.control.addEventListener('blur', function () { revisar(m); });
      })(mapa[c.id]);
    }
    function marcar(m, mensaje) {
      U.vaciar(m.error);
      if (mensaje) { m.error.appendChild(document.createTextNode(mensaje)); m.ctl.control.setAttribute('aria-invalid', 'true'); U.agregarClase(m.contenedor, 'campo-error'); }
      else { m.ctl.control.removeAttribute('aria-invalid'); U.quitarClase(m.contenedor, 'campo-error'); }
    }
    function revisar(m) {
      var v = Datos.normalizar(m.campo, m.ctl.leer());
      var msg = (m.campo.tipo === 'ref') ? '' : Seg.validarCampo(m.campo, v === null ? undefined : v);
      marcar(m, msg);
    }
    function leer() {
      var v = {}, k;
      for (k = 0; k < campos.length; k++) { v[campos[k].campo.id] = campos[k].ctl.leer(); }
      return v;
    }
    function mostrarErrores(errores, gen) {
      var k, primero = null, m, tieneAlgo = false;
      errores = errores || {};
      for (k = 0; k < campos.length; k++) {
        m = campos[k];
        marcar(m, errores[m.campo.id] || '');
        if (errores[m.campo.id] && !primero) { primero = m; }
      }
      U.vaciar(general);
      if (gen && gen.length) {
        tieneAlgo = true;
        for (k = 0; k < gen.length; k++) { general.appendChild(U.el('p', { texto: gen[k] })); }
      }
      if (tieneAlgo) { general.removeAttribute('hidden'); general.hidden = false; } else { general.setAttribute('hidden', 'hidden'); general.hidden = true; }
      if (primero) { primero.ctl.control.focus(); }
      else if (tieneAlgo) { general.setAttribute('tabindex', '-1'); general.focus(); }
    }
    botones = opts.ocultarBotones || opts.soloLectura ? null : U.el('div', { clase: 'form-botones' }, [
      U.el('button', { type: 'submit', clase: 'btn btn-primario', texto: opts.textoGuardar || 'Guardar' }),
      opts.onCancelar ? UI.boton('Cancelar', opts.onCancelar, 'secundario') : null
    ]);
    /* Al pulsar un botón del formulario, el campo en edición pierde el foco y su error en línea puede mover el botón
       entre mousedown y mouseup, con lo que se pierde el clic. Evitamos ese cambio de foco: el envío valida todo igual. */
    if (botones) { botones.addEventListener('mousedown', function (ev) { ev.preventDefault(); }, false); }
    form = U.el('form', { clase: 'formulario', novalidate: true, autocomplete: 'off' }, [general, filas, botones]);
    form.addEventListener('submit', function (ev) {
      var res;
      ev.preventDefault();
      if (!opts.onGuardar) { return; }
      res = opts.onGuardar(leer());
      if (res && res.ok === false) { mostrarErrores(res.errores, res.general); }
    });
    return {
      nodo: form, leer: leer, mostrarErrores: mostrarErrores,
      enfocar: function () { if (campos.length) { campos[0].ctl.control.focus(); } }
    };
  };

  /* ---------- Tabla ---------- */

  /**
   * Tabla con búsqueda, orden por columna y paginación.
   * opts: { titulo (para lectores), columnas:[{id, etiqueta, valor(fila), texto(fila), nodo(fila), alinear:'der', ordenable}],
   *         filas, buscar(fila) → texto donde buscar, enlace(fila) → '#/...' para la 1.ª columna,
   *         tam (10), orden:{col, desc}, vacio:{titulo, texto, accion}, barra:[nodos extra], placeholder }
   * Devuelve { nodo, actualizar(filas), filtrar(fn|null), total() }.
   */
  UI.tabla = function (opts) {
    var estado = { pagina: 1, tam: opts.tam || 10, q: '', orden: opts.orden || null, filtro: null };
    var filas = opts.filas || [], vista = [], hay = [];
    var raiz, buscador, cuenta, cuerpo, cabeza, pie, anterior, siguiente, info, tamSel, envoltura, vacioBox, idBuscar = nuevoId('bq');

    function indexar() {
      var i;
      hay = [];
      for (i = 0; i < filas.length; i++) { hay.push(opts.buscar ? U.sinTildes(opts.buscar(filas[i])) : ''); }
    }

    function calcular() {
      var q = U.sinTildes(estado.q.replace(/^\s+|\s+$/g, '')), i, col, f, dir;
      vista = [];
      for (i = 0; i < filas.length; i++) {
        if (estado.filtro && !estado.filtro(filas[i])) { continue; }
        if (q && hay[i].indexOf(q) === -1) { continue; }
        vista.push(filas[i]);
      }
      if (estado.orden) {
        col = U.buscar(opts.columnas, function (c) { return c.id === estado.orden.col; });
        if (col) {
          f = col.valor || function (fila) { return fila[col.id]; };
          dir = estado.orden.desc ? -1 : 1;
          vista = U.ordenar(vista, function (a, b) { return dir * U.comparar(f(a), f(b)); });
        }
      }
    }

    function celda(col, fila) {
      var td = U.el('td', { clase: col.alinear === 'der' ? 'der' : null, 'data-etq': col.etiqueta });
      var contenido = col.nodo ? col.nodo(fila) : document.createTextNode(col.texto ? col.texto(fila) : String(col.valor ? col.valor(fila) : (fila[col.id] === undefined ? '' : fila[col.id])));
      if (col.enlazar && opts.enlace) { td.appendChild(U.el('a', { href: opts.enlace(fila) }, contenido)); } else { td.appendChild(contenido); }
      return td;
    }

    function pintarCabeza() {
      var tr = U.el('tr'), i, c, th, sentido;
      for (i = 0; i < opts.columnas.length; i++) {
        c = opts.columnas[i];
        th = U.el('th', { scope: 'col', clase: c.alinear === 'der' ? 'der' : null });
        if (c.ordenable === false) { th.appendChild(document.createTextNode(c.etiqueta)); }
        else {
          sentido = estado.orden && estado.orden.col === c.id ? (estado.orden.desc ? 'descending' : 'ascending') : 'none';
          th.setAttribute('aria-sort', sentido);
          (function (col) {
            th.appendChild(U.el('button', {
              type: 'button', clase: 'th-orden', 'aria-label': 'Ordenar por ' + col.etiqueta,
              on: { click: function () {
                estado.orden = (estado.orden && estado.orden.col === col.id) ? { col: col.id, desc: !estado.orden.desc } : { col: col.id, desc: false };
                estado.pagina = 1; pintar(true);
              } }
            }, [col.etiqueta, U.el('span', { clase: 'flecha', 'aria-hidden': 'true', texto: sentido === 'ascending' ? ' ▲' : (sentido === 'descending' ? ' ▼' : '') })]));
          })(c);
        }
        tr.appendChild(th);
      }
      U.vaciar(cabeza);
      cabeza.appendChild(tr);
    }

    function pintar(conCabeza) {
      var total, paginas, desde, hasta, i, tr, j;
      calcular();
      total = vista.length;
      paginas = Math.max(1, Math.ceil(total / estado.tam));
      if (estado.pagina > paginas) { estado.pagina = paginas; }
      desde = (estado.pagina - 1) * estado.tam;
      hasta = Math.min(total, desde + estado.tam);
      if (conCabeza) { pintarCabeza(); }
      U.vaciar(cuerpo);
      for (i = desde; i < hasta; i++) {
        tr = U.el('tr');
        for (j = 0; j < opts.columnas.length; j++) { tr.appendChild(celda(opts.columnas[j], vista[i])); }
        cuerpo.appendChild(tr);
      }
      U.vaciar(vacioBox);
      if (total === 0) {
        if (filas.length === 0 && opts.vacio) { vacioBox.appendChild(UI.vacio(opts.vacio)); }
        else { vacioBox.appendChild(UI.vacio({ titulo: 'No hay resultados', texto: estado.q ? 'Nada coincide con «' + estado.q + '». Prueba con otra palabra o borra la búsqueda.' : 'No hay registros con los filtros elegidos.' })); }
      }
      envoltura.style.display = total === 0 ? 'none' : '';
      U.vaciar(info);
      info.appendChild(document.createTextNode(total === 0 ? '0 resultados' : 'Mostrando ' + (desde + 1) + '–' + hasta + ' de ' + total));
      U.vaciar(cuenta);
      cuenta.appendChild(document.createTextNode('Página ' + estado.pagina + ' de ' + paginas));
      anterior.disabled = estado.pagina <= 1;
      siguiente.disabled = estado.pagina >= paginas;
      pie.style.display = total === 0 ? 'none' : '';
    }

    buscador = U.el('input', {
      id: idBuscar, type: 'search', clase: 'ctl buscar', placeholder: opts.placeholder || 'Buscar…', 'aria-label': 'Buscar en la tabla ' + (opts.titulo || ''), autocomplete: 'off',
      on: { input: function () { estado.q = buscador.value; estado.pagina = 1; pintar(false); } }
    });
    info = U.el('span', { clase: 'tabla-info', 'aria-live': 'polite' });
    cuenta = U.el('span', { clase: 'tabla-pag' });
    anterior = UI.boton('‹ Anterior', function () { estado.pagina -= 1; pintar(false); }, 'secundario');
    siguiente = UI.boton('Siguiente ›', function () { estado.pagina += 1; pintar(false); }, 'secundario');
    tamSel = U.el('select', { clase: 'ctl ctl-corto', 'aria-label': 'Filas por página', on: { change: function () { estado.tam = parseInt(tamSel.value, 10); estado.pagina = 1; pintar(false); } } }, [
      U.el('option', { value: '10', texto: '10 por página' }), U.el('option', { value: '25', texto: '25 por página' }), U.el('option', { value: '50', texto: '50 por página' })
    ]);
    tamSel.value = String(estado.tam);
    if (tamSel.value !== String(estado.tam)) { tamSel.value = '10'; estado.tam = 10; }
    cabeza = U.el('thead');
    cuerpo = U.el('tbody');
    vacioBox = U.el('div');
    envoltura = U.el('div', { clase: 'tabla-scroll', tabindex: '0', role: 'region', 'aria-label': 'Tabla ' + (opts.titulo || '') }, U.el('table', { clase: 'tabla' }, [
      opts.titulo ? U.el('caption', { clase: 'solo-lector', texto: opts.titulo }) : null, cabeza, cuerpo
    ]));
    pie = U.el('div', { clase: 'tabla-pie' }, [info, U.el('span', { clase: 'tabla-nav' }, [anterior, cuenta, siguiente]), tamSel]);
    raiz = U.el('div', { clase: 'tabla-caja' }, [
      U.el('div', { clase: 'tabla-barra' }, [U.el('label', { 'for': idBuscar, clase: 'solo-lector', texto: 'Buscar' }), buscador, opts.barra || null]),
      envoltura, vacioBox, pie
    ]);
    indexar();
    pintar(true);
    return {
      nodo: raiz,
      actualizar: function (nuevas) { filas = nuevas; indexar(); estado.pagina = 1; pintar(false); },
      filtrar: function (fn) { estado.filtro = fn; estado.pagina = 1; pintar(false); },
      total: function () { return vista.length; },
      vista: function () { return vista; }
    };
  };

  /* ---------- Gráficos ---------- */

  /** Valor abreviado para ejes: 12500 → 12.5 k */
  function abreviar(n) {
    var a = Math.abs(n);
    if (a >= 1000000) { return U.fmt.num(n / 1000000, 1) + ' M'; }
    if (a >= 10000) { return U.fmt.num(n / 1000, 1) + ' k'; }
    return U.fmt.num(n, a < 100 && Math.floor(a) !== a ? 1 : 0);
  }

  function formatoValor(v, formato) {
    if (formato === 'moneda') { return U.fmt.moneda(v); }
    if (formato === 'entero') { return U.fmt.num(v, 0); }
    if (formato === 'porcentaje') { return U.fmt.pct(v); }
    return U.fmt.num(v, Math.floor(v) === v ? 0 : 2);
  }

  /**
   * Gráfico sencillo. g: { tipo:'barras'|'columnas'|'linea', etiquetas:[], valores:[], formato:'moneda'|'entero'|'numero'|'porcentaje', titulo }.
   * Las barras son <div> con ancho en %; la línea es SVG. Siempre incluye el texto para lectores de pantalla.
   */
  UI.grafico = function (g, opts) {
    var tipo = g.tipo || 'barras', etq = g.etiquetas || [], val = g.valores || [], max = 0, i, caja, lista, fila, pct, formato = g.formato || 'numero';
    var svg, ancho = 640, alto = 220, mi = 48, md = 16, ms = 16, mb = 36, x, y, puntos = [], pasoX, linea, col, resumen = [];
    for (i = 0; i < val.length; i++) { if (val[i] > max) { max = val[i]; } resumen.push(etq[i] + ': ' + formatoValor(val[i], formato)); }
    if (!val.length) { return UI.vacio({ titulo: 'Sin datos para graficar', texto: 'Cuando haya registros en el periodo, el gráfico aparecerá aquí.' }); }
    caja = U.el('div', { clase: 'grafico grafico-' + tipo, role: 'group', 'aria-label': (g.titulo || 'Gráfico') + '. ' + resumen.join('; ') });
    if (tipo === 'barras') {
      lista = U.el('ul', { clase: 'g-lista' });
      for (i = 0; i < val.length; i++) {
        pct = max > 0 ? Math.max(0, val[i] / max * 100) : 0;
        fila = U.el('li', { clase: 'g-fila' }, [
          U.el('span', { clase: 'g-etq', texto: String(etq[i]), title: String(etq[i]) }),
          U.el('span', { clase: 'g-pista', 'aria-hidden': 'true' }, U.el('span', { clase: 'g-barra', estilo: { width: (pct < 1 && val[i] > 0 ? 1 : pct) + '%' } })),
          U.el('span', { clase: 'g-val', texto: formatoValor(val[i], formato) })
        ]);
        lista.appendChild(fila);
      }
      caja.appendChild(lista);
    } else if (tipo === 'columnas') {
      col = U.el('div', { clase: 'c-cols', 'aria-hidden': 'true' });
      for (i = 0; i < val.length; i++) {
        pct = max > 0 ? Math.max(0, val[i] / max * 100) : 0;
        col.appendChild(U.el('div', { clase: 'c-col', title: etq[i] + ': ' + formatoValor(val[i], formato) }, [
          U.el('span', { clase: 'c-val', texto: abreviar(val[i]) }),
          U.el('span', { clase: 'c-pista' }, U.el('span', { clase: 'c-barra', estilo: { height: (pct < 1 && val[i] > 0 ? 1 : pct) + '%' } })),
          U.el('span', { clase: 'c-etq', texto: String(etq[i]) })
        ]));
      }
      caja.appendChild(col);
    } else {
      svg = U.svg('svg', { viewBox: '0 0 ' + ancho + ' ' + alto, clase: 'g-svg', role: 'img', 'aria-hidden': 'true', preserveAspectRatio: 'xMidYMid meet' });
      pasoX = val.length > 1 ? (ancho - mi - md) / (val.length - 1) : 0;
      for (i = 0; i <= 4; i++) {
        y = alto - mb - (alto - mb - ms) * i / 4;
        svg.appendChild(U.svg('line', { x1: mi, x2: ancho - md, y1: y, y2: y, 'class': 'g-rejilla' }));
        svg.appendChild(U.svg('text', { x: mi - 6, y: y + 4, 'text-anchor': 'end', 'class': 'g-eje' }, abreviar(max * i / 4)));
      }
      for (i = 0; i < val.length; i++) {
        x = mi + pasoX * i;
        y = alto - mb - (max > 0 ? (alto - mb - ms) * val[i] / max : 0);
        puntos.push(x + ',' + y);
        if (val.length <= 14 || i % 2 === 0) { svg.appendChild(U.svg('text', { x: x, y: alto - 14, 'text-anchor': 'middle', 'class': 'g-eje' }, String(etq[i]))); }
      }
      linea = U.svg('polyline', { points: puntos.join(' '), fill: 'none', 'stroke-width': 3, 'class': 'g-trazo' });
      svg.appendChild(linea);
      for (i = 0; i < val.length; i++) {
        x = mi + pasoX * i;
        y = alto - mb - (max > 0 ? (alto - mb - ms) * val[i] / max : 0);
        svg.appendChild(U.svg('circle', { cx: x, cy: y, r: 4.5, 'class': 'g-punto' }, U.svg('title', null, etq[i] + ': ' + formatoValor(val[i], formato))));
      }
      caja.appendChild(svg);
    }
    return caja;
  };

  global.UI = UI;
})(window);
