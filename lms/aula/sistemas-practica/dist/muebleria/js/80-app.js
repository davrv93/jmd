/*
 * 80-app.js · Arranque, rutas, menú y guardia (objeto global App)
 * ----------------------------------------------------------------------------
 * Orden de arranque: validar el config → cargar o sembrar los datos → recuperar
 * la sesión → aplicar el tema → armar el marco (cabecera, menú, pie) → escuchar
 * el hash de la URL y pintar la pantalla.
 * TODA ruta pasa por App.guardia(ruta): comprueba sesión, expiración, cambio de
 * clave obligatorio y permisos del rol. El menú solo oculta; la guardia decide.
 */
(function (global) {
  'use strict';

  var App = {
    editando: false,        // la ficha de una entidad está en modo edición
    mensajeLogin: '',       // texto que muestra la pantalla de ingreso (sesión expirada, etc.)
    ultimoDenegado: '',     // ruta que la guardia rechazó por última vez
    hashActual: ''
  };
  var marco = null;          // referencias a los nodos fijos del marco
  var modalSesion = null;    // aviso de expiración abierto
  var cuentaAtras = null;

  function C() { return global.SISTEMA; }

  /* ---------- Tema (colores del sistema, calculados en JS: IE11 no tiene variables CSS) ---------- */

  function hexARgb(h) {
    var m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(h || ''));
    var t;
    if (!m) { return null; }
    t = m[1];
    if (t.length === 3) { t = t.charAt(0) + t.charAt(0) + t.charAt(1) + t.charAt(1) + t.charAt(2) + t.charAt(2); }
    return [parseInt(t.substr(0, 2), 16), parseInt(t.substr(2, 2), 16), parseInt(t.substr(4, 2), 16)];
  }

  function rgbAHex(c) {
    var s = '#', i, t;
    for (i = 0; i < 3; i++) { t = Math.max(0, Math.min(255, Math.round(c[i]))).toString(16); s += t.length === 1 ? '0' + t : t; }
    return s;
  }

  function luminancia(c) {
    var v = [], i, x;
    for (i = 0; i < 3; i++) { x = c[i] / 255; v.push(x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)); }
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
  }

  /** Relación de contraste WCAG entre dos colores [r,g,b]. AA para texto normal pide 4,5. */
  App.contraste = function (a, b) {
    var la = luminancia(a), lb = luminancia(b), mayor = Math.max(la, lb), menor = Math.min(la, lb);
    return (mayor + 0.05) / (menor + 0.05);
  };

  function mezclar(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }

  var BLANCO = [255, 255, 255];
  var NEGRO_TEXTO = [31, 41, 51];

  /** Calcula la paleta a partir de tema.primario y tema.acento, garantizando contraste AA. */
  App.paleta = function (tema) {
    var p = hexARgb(tema && tema.primario) || [31, 78, 121], a = hexARgb(tema && tema.acento) || [217, 139, 43], textoSobre, pTexto, pOscuro, i, textoAcento;
    /* El color primario se usa de fondo con texto encima: se elige blanco u oscuro; si ninguno llega a 4,5, se oscurece el primario. */
    for (i = 0; i < 30 && App.contraste(p, BLANCO) < 4.5 && App.contraste(p, NEGRO_TEXTO) < 4.5; i++) { p = mezclar(p, [0, 0, 0], 0.08); }
    textoSobre = App.contraste(p, BLANCO) >= 4.5 ? BLANCO : NEGRO_TEXTO;
    /* Para enlaces y texto sobre fondo claro se necesita un tono que contraste 4,5 con blanco. */
    pTexto = p;
    for (i = 0; i < 40 && App.contraste(pTexto, BLANCO) < 4.5; i++) { pTexto = mezclar(pTexto, [0, 0, 0], 0.1); }
    pOscuro = mezclar(p, [0, 0, 0], 0.22);
    textoAcento = App.contraste(a, BLANCO) >= 4.5 ? BLANCO : NEGRO_TEXTO;
    return {
      primario: rgbAHex(p), textoSobre: rgbAHex(textoSobre), texto: rgbAHex(pTexto), oscuro: rgbAHex(pOscuro),
      claro: rgbAHex(mezclar(p, BLANCO, 0.9)), medio: rgbAHex(mezclar(p, BLANCO, 0.75)), acento: rgbAHex(a), textoAcento: rgbAHex(textoAcento)
    };
  };

  /** Siglas para la insignia redonda (tema.siglas o las 2 primeras letras del nombre). */
  App.siglas = function () {
    var t = C().tema, s = t && t.siglas ? String(t.siglas) : String(C().nombre).replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g, '');
    return s.slice(0, 2).toUpperCase();
  };

  /** Inserta las reglas de color en una hoja creada por JS (insertRule no choca con la CSP) y el favicon de texto. */
  App.aplicarTema = function () {
    var p = App.paleta(C().tema), estilo, hoja, reglas, i, svg, link, previos;
    estilo = document.createElement('style');
    estilo.setAttribute('id', 'tema-dinamico');
    document.getElementsByTagName('head')[0].appendChild(estilo);
    hoja = estilo.sheet;
    reglas = [
      '.cabecera{background-color:' + p.primario + ';color:' + p.textoSobre + '}',
      '.cabecera a,.cabecera .btn-cab{color:' + p.textoSobre + '}',
      '.cabecera :focus{outline-color:' + p.textoSobre + '}',
      '.btn-primario{background-color:' + p.primario + ';border-color:' + p.primario + ';color:' + p.textoSobre + '}',
      '.btn-primario:hover{background-color:' + p.oscuro + ';border-color:' + p.oscuro + '}',
      'a{color:' + p.texto + '}',
      '.menu a.activo{background-color:' + p.claro + ';color:' + p.texto + ';border-left-color:' + p.primario + '}',
      '.menu a:hover{background-color:' + p.claro + '}',
      '.g-barra,.c-barra{background-color:' + p.primario + '}',
      '.g-trazo{stroke:' + p.primario + '}',
      '.g-punto{fill:' + p.primario + '}',
      '.siglas{background-color:' + p.acento + ';color:' + p.textoAcento + '}',
      '.indicador{border-top-color:' + p.acento + '}',
      '.btn-enlace{color:' + p.texto + '}',
      '.login-caja{border-top-color:' + p.primario + '}',
      '.th-orden:hover{color:' + p.texto + '}',
      '.tarjeta-titulo{border-left-color:' + p.acento + '}'
    ];
    for (i = 0; i < reglas.length; i++) {
      try { hoja.insertRule(reglas[i], hoja.cssRules.length); } catch (e) { /* un navegador que no acepte la regla sigue con los colores base */ }
    }
    svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><circle cx='32' cy='32' r='32' fill='" + p.acento + "'/><text x='32' y='42' font-size='28' font-family='Arial' font-weight='bold' text-anchor='middle' fill='" + p.textoAcento + "'>" + App.siglas() + '</text></svg>';
    previos = document.querySelectorAll('link[rel="icon"]');
    for (i = 0; i < previos.length; i++) { U.quitar(previos[i]); }
    link = U.el('link', { rel: 'icon', type: 'image/svg+xml', href: 'data:image/svg+xml,' + encodeURIComponent(svg) });
    document.getElementsByTagName('head')[0].appendChild(link);
  };

  /* ---------- Rutas ---------- */

  /**
   * Convierte un hash en una ruta: { tipo, ent, op, rep, id, hash }.
   * tipos: login, tablero, lista, nuevo, ficha, oplista, opnuevo, opficha, reporte,
   *        usuarios, bitacora, respaldo, configuracion, perfil, sin-permiso, noencontrado
   */
  App.parsear = function (hash) {
    var h = String(hash || '').replace(/^#\/?/, ''), partes = h === '' ? [] : h.split('/'), i, r = { hash: '#/' + h, tipo: 'noencontrado' };
    for (i = 0; i < partes.length; i++) { try { partes[i] = decodeURIComponent(partes[i]); } catch (e) { partes[i] = ''; } }
    if (!partes.length) { r.tipo = 'tablero'; r.hash = '#/tablero'; return r; }
    switch (partes[0]) {
      case 'login': case 'tablero': case 'usuarios': case 'bitacora': case 'respaldo': case 'configuracion': case 'perfil': case 'sin-permiso':
        if (partes.length === 1) { r.tipo = partes[0]; }
        break;
      case 'e':
        if (partes.length >= 2 && partes.length <= 3 && Datos.entidad(partes[1])) {
          r.ent = partes[1];
          if (partes.length === 2) { r.tipo = 'lista'; }
          else if (partes[2] === 'nuevo') { r.tipo = 'nuevo'; }
          else { r.tipo = 'ficha'; r.id = partes[2]; }
        }
        break;
      case 'o':
        if (partes.length >= 2 && partes.length <= 3 && Datos.operacion(partes[1])) {
          r.op = partes[1];
          if (partes.length === 2) { r.tipo = 'oplista'; }
          else if (partes[2] === 'nuevo') { r.tipo = 'opnuevo'; }
          else { r.tipo = 'opficha'; r.id = partes[2]; }
        }
        break;
      case 'r':
        if (partes.length === 2 && U.buscar(C().reportes || [], function (x) { return x.id === partes[1]; })) { r.tipo = 'reporte'; r.rep = partes[1]; }
        break;
      default:
        break;
    }
    return r;
  };

  /**
   * LA guardia: única puerta de entrada a cualquier pantalla.
   * Devuelve { ok:true } o { ok:false, destino:'#/…' } (y registra los accesos denegados).
   */
  App.guardia = function (ruta) {
    var u, permiso = true, t = ruta.tipo;
    if (t === 'login') {
      if (Seg.sesion && Seg.vigencia() !== 'expirada') { return { ok: false, destino: '#/tablero' }; }
      return { ok: true };
    }
    if (!Seg.sesion) { return { ok: false, destino: '#/login' }; }
    if (Seg.vigencia() === 'expirada') { App.cerrarPorInactividad(); return { ok: false, destino: '#/login' }; }
    u = Seg.usuarioActual();
    if (!u || !u.activo) { Seg.salir('salida'); return { ok: false, destino: '#/login' }; }
    if (u.cambiar && t !== 'perfil') { return { ok: false, destino: '#/perfil' }; }
    if (t === 'tablero' || t === 'perfil' || t === 'sin-permiso' || t === 'noencontrado') { return { ok: true }; }
    if (t === 'lista' || t === 'ficha') { permiso = Seg.puede('e', ruta.ent, 'ver'); }
    else if (t === 'nuevo') { permiso = Seg.puede('e', ruta.ent, 'crear'); }
    else if (t === 'oplista' || t === 'opficha') { permiso = Seg.puede('o', ruta.op, 'ver'); }
    else if (t === 'opnuevo') { permiso = Seg.puede('o', ruta.op, 'crear'); }
    else if (t === 'reporte') { permiso = Seg.puede('r', ruta.rep, 'ver'); }
    else if (t === 'usuarios' || t === 'bitacora' || t === 'respaldo' || t === 'configuracion') { permiso = Seg.puede('s', t, 'ver'); }
    if (!permiso) {
      App.ultimoDenegado = ruta.hash;
      Aud.registrar('acceso-denegado', 'ruta', ruta.hash, null, null, 'Ruta bloqueada por la guardia para el rol ' + u.rol);
      return { ok: false, destino: '#/sin-permiso' };
    }
    return { ok: true };
  };

  /* ---------- Sesión: ingreso, salida, expiración ---------- */

  /** Lo llama la pantalla de ingreso tras un ingreso correcto. */
  App.alIngresar = function (r) {
    App.mensajeLogin = '';
    if (global.location.hash === (r.cambiar ? '#/perfil' : '#/tablero')) { App.render(); }
    else { global.location.hash = r.cambiar ? '#/perfil' : '#/tablero'; }
  };

  /** Cierra la sesión por decisión del usuario. */
  App.salir = function () {
    UI.cerrarModales();
    Seg.salir('salida');
    App.mensajeLogin = 'Cerraste la sesión.';
    if (global.location.hash === '#/login') { App.render(); } else { global.location.hash = '#/login'; }
  };

  /** Cierra la sesión por inactividad y vuelve al ingreso. */
  App.cerrarPorInactividad = function () {
    UI.cerrarModales();
    modalSesion = null;
    Seg.salir('expiración');
    App.mensajeLogin = 'Tu sesión expiró por inactividad. Ingresa de nuevo.';
    if (global.location.hash === '#/login') { App.render(); } else { global.location.hash = '#/login'; }
  };

  function avisoSesion(segundos) {
    var texto;
    if (!modalSesion) {
      texto = U.el('p', { clase: 'modal-texto' });
      cuentaAtras = texto;
      modalSesion = UI.modal({
        titulo: 'Tu sesión está por expirar', alerta: true, sinCerrar: true, contenido: texto,
        botones: [
          { texto: 'Cerrar sesión', onClick: function () { modalSesion = null; App.salir(); return false; }, cerrar: false },
          { texto: 'Seguir conectado', clase: 'primario', onClick: function () { Seg.extender(); modalSesion = null; } }
        ]
      });
    }
    U.vaciar(cuentaAtras);
    cuentaAtras.appendChild(document.createTextNode('Por seguridad, la sesión se cerrará por inactividad en ' + segundos + ' segundos. ¿Quieres seguir conectado?'));
  }

  function sesionNormal() {
    if (modalSesion) { modalSesion.cerrar(); modalSesion = null; }
  }

  /* ---------- Marco de la aplicación ---------- */

  function construirMarco() {
    var raiz = document.getElementById('app'), skip, cab, btnMenu, usuarioBox, nav, main, pie, aviso;
    U.vaciar(raiz);
    skip = U.el('a', { href: '#principal', clase: 'saltar', texto: 'Saltar al contenido', on: { click: function (ev) {
      ev.preventDefault();
      marco.main.focus();
    } } });
    btnMenu = U.el('button', { type: 'button', clase: 'btn-cab btn-menu', 'aria-expanded': 'false', 'aria-controls': 'menu', texto: 'Menú', on: { click: function () {
      var abierto = U.tieneClase(document.body, 'menu-abierto');
      if (abierto) { U.quitarClase(document.body, 'menu-abierto'); } else { U.agregarClase(document.body, 'menu-abierto'); }
      btnMenu.setAttribute('aria-expanded', abierto ? 'false' : 'true');
    } } });
    usuarioBox = U.el('div', { clase: 'cab-usuario' });
    cab = U.el('header', { clase: 'cabecera', role: 'banner' }, [
      btnMenu,
      U.el('a', { href: '#/tablero', clase: 'marca', 'aria-label': C().nombre + ': ir al tablero' }, [U.el('span', { clase: 'siglas', 'aria-hidden': 'true', texto: App.siglas() }), U.el('span', { clase: 'marca-texto' }, [U.el('span', { clase: 'marca-nombre', texto: C().nombre }), U.el('span', { clase: 'marca-rubro', texto: C().rubro })])]),
      usuarioBox
    ]);
    nav = U.el('nav', { id: 'menu', clase: 'menu', 'aria-label': 'Menú principal' });
    aviso = U.el('div', { clase: 'banda-aviso', role: 'alert' });
    main = U.el('main', { id: 'principal', clase: 'principal', tabindex: '-1' });
    pie = U.el('footer', { clase: 'pie', role: 'contentinfo' }, [
      U.el('p', { clase: 'pie-aviso', texto: 'Sistema de práctica · no uses datos reales.' }),
      U.el('p', { clase: 'pie-detalle', texto: 'La seguridad de este sistema es de demostración: corre en tu navegador y no reemplaza la seguridad de un servidor. ' + C().nombre + ' · versión ' + C().version + '.' })
    ]);
    raiz.appendChild(skip);
    raiz.appendChild(cab);
    raiz.appendChild(aviso);
    raiz.appendChild(U.el('div', { clase: 'cuerpo' }, [nav, main]));
    raiz.appendChild(pie);
    marco = { raiz: raiz, cab: cab, usuario: usuarioBox, nav: nav, main: main, pie: pie, aviso: aviso, btnMenu: btnMenu };
  }

  function enlaceMenu(texto, hash, actual) {
    var activo = actual === hash || (hash !== '#/tablero' && U.empiezaCon(actual + '/', hash + '/'));
    return U.el('li', null, U.el('a', { href: hash, clase: activo ? 'activo' : null, 'aria-current': activo ? 'page' : null, texto: texto }));
  }

  function construirMenu(actual) {
    var cfg = C(), nav = marco.nav, ul, i, items;
    U.vaciar(nav);
    function grupo(titulo, lis) {
      if (!lis.length) { return; }
      nav.appendChild(U.el('p', { clase: 'menu-titulo', texto: titulo }));
      nav.appendChild(U.el('ul', null, lis));
    }
    ul = [enlaceMenu('Tablero', '#/tablero', actual)];
    grupo('Inicio', ul);
    items = [];
    for (i = 0; i < (cfg.entidades || []).length; i++) { if (Seg.puede('e', cfg.entidades[i].id, 'ver')) { items.push(enlaceMenu(cfg.entidades[i].plural, '#/e/' + cfg.entidades[i].id, actual)); } }
    grupo('Mantenimientos', items);
    items = [];
    for (i = 0; i < (cfg.operaciones || []).length; i++) { if (Seg.puede('o', cfg.operaciones[i].id, 'ver')) { items.push(enlaceMenu(cfg.operaciones[i].plural, '#/o/' + cfg.operaciones[i].id, actual)); } }
    grupo('Operaciones', items);
    items = [];
    for (i = 0; i < (cfg.reportes || []).length; i++) { if (Seg.puede('r', cfg.reportes[i].id, 'ver')) { items.push(enlaceMenu(cfg.reportes[i].titulo, '#/r/' + cfg.reportes[i].id, actual)); } }
    grupo('Reportes', items);
    items = [];
    if (Seg.puede('s', 'usuarios', 'ver')) { items.push(enlaceMenu('Usuarios y roles', '#/usuarios', actual)); }
    if (Seg.puede('s', 'bitacora', 'ver')) { items.push(enlaceMenu('Bitácora', '#/bitacora', actual)); }
    if (Seg.puede('s', 'respaldo', 'ver')) { items.push(enlaceMenu('Respaldo', '#/respaldo', actual)); }
    if (Seg.puede('s', 'configuracion', 'ver')) { items.push(enlaceMenu('Configuración', '#/configuracion', actual)); }
    grupo('Administración', items);
  }

  function pintarCabecera() {
    var u = Seg.usuarioActual(), rol = u ? Seg.rol(u.rol) : null;
    U.vaciar(marco.usuario);
    if (!u) { return; }
    marco.usuario.appendChild(U.el('a', { href: '#/perfil', clase: 'cab-nombre' }, [U.el('span', { clase: 'cab-quien', texto: u.nombre }), U.el('span', { clase: 'cab-rol', texto: rol ? rol.nombre : u.rol })]));
    marco.usuario.appendChild(UI.boton('Salir', App.salir, 'secundario', { 'aria-label': 'Cerrar sesión de ' + u.usuario }));
  }

  function pintarAviso() {
    U.vaciar(marco.aviso);
    if (Almacen.aviso) { marco.aviso.appendChild(document.createTextNode(Almacen.aviso)); marco.aviso.style.display = ''; } else { marco.aviso.style.display = 'none'; }
  }

  /* ---------- Pintado de la pantalla ---------- */

  function vistaDe(ruta) {
    switch (ruta.tipo) {
      case 'login': return Vistas.login(App.mensajeLogin);
      case 'tablero': return Vistas.tablero();
      case 'lista': return Vistas.entidadLista(ruta.ent);
      case 'nuevo': return Vistas.entidadNueva(ruta.ent);
      case 'ficha': return Vistas.entidadFicha(ruta.ent, ruta.id, App.editando);
      case 'oplista': return Vistas.opLista(ruta.op);
      case 'opnuevo': return Vistas.opNueva(ruta.op);
      case 'opficha': return Vistas.opFicha(ruta.op, ruta.id);
      case 'reporte': return Reportes.vista(ruta.rep);
      case 'usuarios': return Vistas.usuarios();
      case 'bitacora': return Vistas.bitacora();
      case 'respaldo': return Vistas.respaldo();
      case 'configuracion': return Vistas.configuracion();
      case 'perfil': return Vistas.perfil();
      case 'sin-permiso': return Vistas.sinPermiso();
      default: return Vistas.noEncontrado();
    }
  }

  /** Pinta la ruta actual (pasando por la guardia). */
  App.render = function () {
    var ruta = App.parsear(global.location.hash), g = App.guardia(ruta), vista, cabPagina, h1, cambioRuta;
    if (!g.ok) {
      if (global.location.hash === g.destino) { ruta = App.parsear(g.destino); } else { global.location.hash = g.destino; return; }
    }
    cambioRuta = App.hashActual !== ruta.hash;
    if (cambioRuta) { App.editando = false; }
    App.hashActual = ruta.hash;
    try {
      vista = vistaDe(ruta);
    } catch (e) {
      if (global.console && global.console.error) { global.console.error(e); }
      vista = { titulo: 'Error', migas: [{ texto: 'Tablero', href: '#/tablero' }, { texto: 'Error' }], nodo: UI.seccion(null, UI.vacio({ titulo: 'No se pudo mostrar esta pantalla', texto: 'Ocurrió un error inesperado: ' + (e && e.message ? e.message : e) + '. Prueba volver al tablero.', accion: U.el('a', { href: '#/tablero', clase: 'btn btn-primario', texto: 'Volver al tablero' }) })) };
    }
    document.title = vista.titulo + ' · ' + C().nombre;
    U.quitarClase(document.body, 'menu-abierto');
    if (ruta.tipo === 'login') {
      U.agregarClase(document.body, 'solo-login');
      U.vaciar(document.getElementById('app'));
      document.getElementById('app').appendChild(U.el('main', { id: 'principal', clase: 'login-pagina', tabindex: '-1' }, [vista.nodo, U.el('p', { clase: 'pie-aviso login-pie', texto: 'Sistema de práctica · no uses datos reales.' })]));
      marco = null;
      if (Almacen.aviso) { document.getElementById('app').insertBefore(U.el('div', { clase: 'banda-aviso', role: 'alert', texto: Almacen.aviso }), document.getElementById('app').firstChild); }
      if (vista.enfocar) { vista.enfocar.focus(); }
      return;
    }
    U.quitarClase(document.body, 'solo-login');
    if (!marco) { construirMarco(); }
    pintarCabecera();
    pintarAviso();
    construirMenu(ruta.hash);
    h1 = U.el('h1', { clase: 'pagina-titulo', tabindex: '-1', texto: vista.titulo });
    cabPagina = U.el('div', { clase: 'pagina-cab' }, [h1, vista.acciones && vista.acciones.length ? U.el('div', { clase: 'acciones' }, vista.acciones) : null]);
    U.vaciar(marco.main);
    if (vista.migas) { marco.main.appendChild(UI.migas(vista.migas)); }
    marco.main.appendChild(cabPagina);
    marco.main.appendChild(vista.nodo);
    if (cambioRuta) {
      global.scrollTo(0, 0);
      if (vista.formulario) { vista.formulario.enfocar(); } else { h1.focus(); }
    }
  };

  /* ---------- Arranque ---------- */

  /* Comprobaciones mínimas del config: si falta algo esencial, se muestra un mensaje claro en vez de una pantalla en blanco. */
  function configValido() {
    var c = global.SISTEMA;
    return !!(c && c.id && c.nombre && c.roles && c.usuarios && c.entidades);
  }

  /** Arranca el sistema. Se llama al final de la carga de la página. */
  App.iniciar = function () {
    var r, raiz = document.getElementById('app');
    if (!configValido()) {
      raiz.appendChild(U.el('p', { clase: 'error-arranque', texto: 'No se pudo iniciar: falta js/config.js o está incompleto (window.SISTEMA).' }));
      return;
    }
    r = Almacen.iniciar(C().id);
    if (r.nuevo) {
      Almacen.estado = Almacen.vacio();
      Datos.sembrar();
      if (r.danado) {
        App.mensajeLogin = 'Los datos guardados estaban dañados (' + r.motivo + ') y se cargó la demostración. Se conservó una copia del texto dañado.';
      }
    }
    Seg.restaurarSesion();
    App.aplicarTema();
    Seg.vigilar({ onAviso: avisoSesion, onExpira: App.cerrarPorInactividad, onNormal: sesionNormal });
    global.addEventListener('hashchange', App.render);
    if (!global.location.hash) { global.location.hash = Seg.sesion ? '#/tablero' : '#/login'; }
    App.render();
  };

  global.App = App;

  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', App.iniciar); } else { App.iniciar(); }
})(window);
