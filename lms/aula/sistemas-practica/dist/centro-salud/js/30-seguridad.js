/*
 * 30-seguridad.js · Seguridad de demostración (objeto global Seg)
 * ----------------------------------------------------------------------------
 * Contraseñas con sal por usuario + 1.000 iteraciones de SHA-256, política de
 * clave, bloqueo temporal por intentos, expiración por inactividad con aviso,
 * sesión, permisos por rol (RBAC) y validación de datos de entrada.
 * Cada mecanismo lee su clave en SISTEMA.seguridad (ver Seg.DEFECTOS); si la
 * clave está debilitada, el mecanismo REALMENTE se comporta como débil.
 * IMPORTANTE: todo corre en el navegador, así que es una demostración: quien
 * abra las herramientas del navegador puede saltársela. Un sistema real valida
 * en el servidor.
 */
(function (global) {
  'use strict';

  var ITERACIONES = 1000;
  var CLAVES_COMUNES = ['password', 'contrasena', '1234567890', 'qwertyuiop', 'administrador', 'peru2026', 'abcdefghij'];
  var SISTEMA_POR_DEFECTO = {
    usuarios: ['admin'], bitacora: ['admin', 'auditor'], respaldo: ['admin'], configuracion: ['admin']
  };

  var Seg = {
    ITERACIONES: ITERACIONES,
    /** Valores seguros cuando el config omite una clave. */
    DEFECTOS: {
      minClave: 10, intentosMax: 5, bloqueoMin: 5, sesionMin: 15, cadenaBitacora: true,
      confirmarEliminar: true, exigirCambioClave: true, ayudaLogin: false,
      exportaRespetaPermisos: true, cspMeta: true
    },
    sesion: null // { usuario, inicio, ultimo }
  };
  var temporizador = null;
  var ultimaPersistencia = 0;

  function estado() { return Almacen.estado; }

  /** Valor efectivo de una clave de seguridad (la del config o el valor seguro por defecto). */
  Seg.cfg = function (clave) {
    var s = global.SISTEMA && global.SISTEMA.seguridad;
    if (s && s[clave] !== undefined && s[clave] !== null) { return s[clave]; }
    return Seg.DEFECTOS[clave];
  };

  /* ---------- Contraseñas ---------- */

  /** Hash de una clave con la sal del usuario. */
  Seg.hashClave = function (clave, sal) { return Sha.iterado(clave, sal, ITERACIONES); };

  /**
   * Revisa la política de clave. Devuelve una lista de mensajes (vacía = cumple).
   * Con minClave >= 10 exige mayúscula, minúscula, número y símbolo, que no sea
   * una clave común y que no contenga el usuario. Con minClave < 10 (debilitada)
   * solo se exige el largo.
   */
  Seg.politica = function (clave, usuario) {
    var errs = [], min = Number(Seg.cfg('minClave')) || 0, c = String(clave || ''), i;
    if (c.length < min) { errs.push('Debe tener al menos ' + min + ' caracteres.'); }
    if (min >= 10) {
      if (!/[a-z]/.test(c)) { errs.push('Debe incluir una letra minúscula.'); }
      if (!/[A-Z]/.test(c)) { errs.push('Debe incluir una letra mayúscula.'); }
      if (!/[0-9]/.test(c)) { errs.push('Debe incluir un número.'); }
      if (!/[^A-Za-z0-9]/.test(c)) { errs.push('Debe incluir un símbolo (por ejemplo # ! $ %).'); }
      if (usuario && c.toLowerCase().indexOf(String(usuario).toLowerCase()) !== -1) { errs.push('No debe contener tu nombre de usuario.'); }
      for (i = 0; i < CLAVES_COMUNES.length; i++) {
        if (c.toLowerCase().indexOf(CLAVES_COMUNES[i]) !== -1) { errs.push('Es una clave demasiado común.'); break; }
      }
    }
    return errs;
  };

  /** Texto corto que describe la política vigente (para los formularios). */
  Seg.politicaTexto = function () {
    var min = Number(Seg.cfg('minClave')) || 0;
    if (min >= 10) { return 'Mínimo ' + min + ' caracteres, con mayúscula, minúscula, número y símbolo.'; }
    return 'Mínimo ' + min + ' caracteres.';
  };

  /** Clave temporal aleatoria de 12 caracteres que cumple la política. */
  Seg.claveTemporal = function () {
    var May = 'ABCDEFGHJKLMNPQRSTUVWXYZ', min = 'abcdefghijkmnpqrstuvwxyz', num = '23456789', sim = '#!$%&*+?', todo = May + min + num + sim;
    var bytes = Sha.aleatorio(12), out = [], i, v;
    function tomar(set, b) { return set.charAt(parseInt(b, 16) % set.length); }
    out.push(tomar(May, bytes.substr(0, 2)), tomar(min, bytes.substr(2, 2)), tomar(num, bytes.substr(4, 2)), tomar(sim, bytes.substr(6, 2)));
    for (i = 4; i < 12; i++) {
      v = Sha.aleatorio(1);
      out.push(todo.charAt(parseInt(v, 16) % todo.length));
    }
    return out.join('');
  };

  /* ---------- Usuarios ---------- */

  /** Crea los usuarios de demostración del config con su sal y su hash (la clave en claro no se guarda). */
  Seg.sembrarUsuarios = function () {
    var C = global.SISTEMA, lista = [], i, d, sal;
    for (i = 0; i < (C.usuarios || []).length; i++) {
      d = C.usuarios[i];
      sal = Sha.aleatorio(8);
      lista.push({
        usuario: String(d.usuario).toLowerCase(), nombre: d.nombre, rol: d.rol, sal: sal,
        hash: Seg.hashClave(d.clave, sal), activo: true, cambiar: !!Seg.cfg('exigirCambioClave'),
        creado: U.ahoraISO(), ultimoAcceso: ''
      });
    }
    return lista;
  };

  /** Busca un usuario por nombre (sin distinguir mayúsculas). Devuelve el registro interno o null. */
  Seg.buscarUsuario = function (nombre) {
    var n = String(nombre || '').toLowerCase();
    return U.buscar(estado().usuarios, function (u) { return u.usuario === n; });
  };

  function publico(u) {
    return { usuario: u.usuario, nombre: u.nombre, rol: u.rol, activo: u.activo !== false, cambiar: !!u.cambiar, creado: u.creado, ultimoAcceso: u.ultimoAcceso };
  }

  /** Lista de usuarios sin sal ni hash. */
  Seg.listarUsuarios = function () {
    var r = [], i, us = estado().usuarios;
    for (i = 0; i < us.length; i++) { r.push(publico(us[i])); }
    return r;
  };

  /** Usuario con sesión (sin sal ni hash) o null. */
  Seg.usuarioActual = function () {
    var u;
    if (!Seg.sesion) { return null; }
    u = Seg.buscarUsuario(Seg.sesion.usuario);
    return u ? publico(u) : null;
  };

  /** Id del rol del usuario actual o ''. */
  Seg.rolActual = function () {
    var u = Seg.usuarioActual();
    return u ? u.rol : '';
  };

  /** Datos del rol (id, nombre, descripción). */
  Seg.rol = function (id) {
    return U.buscar(global.SISTEMA.roles, function (r) { return r.id === id; });
  };

  function contarAdmins(excepto) {
    var n = 0, i, us = estado().usuarios;
    for (i = 0; i < us.length; i++) { if (us[i].rol === 'admin' && us[i].activo !== false && us[i].usuario !== excepto) { n++; } }
    return n;
  }

  function exigirAdmin() {
    return Seg.puede('s', 'usuarios', 'ver') ? '' : 'No tienes permiso para administrar usuarios.';
  }

  /** Crea un usuario. datos: { usuario, nombre, rol, clave }. */
  Seg.crearUsuario = function (datos) {
    var err = exigirAdmin(), nombre, errs, u, sal;
    var res = { ok: false, errores: {} };
    if (err) { res.general = err; return res; }
    nombre = String(datos.usuario || '').replace(/^\s+|\s+$/g, '').toLowerCase();
    if (!/^[a-z0-9._-]{3,30}$/.test(nombre)) { res.errores.usuario = 'Usa de 3 a 30 caracteres: letras minúsculas, números, punto, guion o guion bajo.'; }
    else if (Seg.buscarUsuario(nombre)) { res.errores.usuario = 'Ya existe un usuario con ese nombre.'; }
    if (!datos.nombre || String(datos.nombre).replace(/\s/g, '').length < 3 || String(datos.nombre).length > 80) { res.errores.nombre = 'Escribe el nombre completo (de 3 a 80 caracteres).'; }
    if (!Seg.rol(datos.rol)) { res.errores.rol = 'Elige un rol de la lista.'; }
    errs = Seg.politica(datos.clave, nombre);
    if (errs.length) { res.errores.clave = errs.join(' '); }
    if (U.claves(res.errores).length) { return res; }
    sal = Sha.aleatorio(8);
    u = { usuario: nombre, nombre: String(datos.nombre).replace(/^\s+|\s+$/g, ''), rol: datos.rol, sal: sal, hash: Seg.hashClave(datos.clave, sal), activo: true, cambiar: true, creado: U.ahoraISO(), ultimoAcceso: '' };
    estado().usuarios.push(u);
    Almacen.guardar();
    Aud.registrar('usuario-crear', 'usuarios', nombre, null, publico(u), 'Rol: ' + u.rol);
    res.ok = true;
    return res;
  };

  /** Cambia nombre, rol o estado activo de un usuario. */
  Seg.editarUsuario = function (nombre, parche) {
    var err = exigirAdmin(), u = Seg.buscarUsuario(nombre), antes, res = { ok: false, errores: {} };
    if (err) { res.general = err; return res; }
    if (!u) { res.general = 'El usuario no existe.'; return res; }
    if (parche.nombre !== undefined) {
      if (String(parche.nombre).replace(/\s/g, '').length < 3 || String(parche.nombre).length > 80) { res.errores.nombre = 'Escribe el nombre completo (de 3 a 80 caracteres).'; }
    }
    if (parche.rol !== undefined && !Seg.rol(parche.rol)) { res.errores.rol = 'Elige un rol de la lista.'; }
    if (U.claves(res.errores).length) { return res; }
    if (Seg.sesion && Seg.sesion.usuario === u.usuario && ((parche.rol !== undefined && parche.rol !== u.rol) || parche.activo === false)) {
      res.general = 'No puedes quitarte el rol ni desactivar tu propia cuenta.'; return res;
    }
    if (u.rol === 'admin' && ((parche.rol !== undefined && parche.rol !== 'admin') || parche.activo === false) && contarAdmins(u.usuario) === 0) {
      res.general = 'Debe quedar al menos un administrador activo.'; return res;
    }
    antes = publico(u);
    if (parche.nombre !== undefined) { u.nombre = String(parche.nombre).replace(/^\s+|\s+$/g, ''); }
    if (parche.rol !== undefined) { u.rol = parche.rol; }
    if (parche.activo !== undefined) { u.activo = !!parche.activo; }
    Almacen.guardar();
    Aud.registrar('usuario-editar', 'usuarios', u.usuario, antes, publico(u), '');
    res.ok = true;
    return res;
  };

  /** Elimina un usuario (no a sí mismo, ni al último administrador). */
  Seg.eliminarUsuario = function (nombre) {
    var err = exigirAdmin(), u = Seg.buscarUsuario(nombre), i;
    if (err) { return { ok: false, general: err }; }
    if (!u) { return { ok: false, general: 'El usuario no existe.' }; }
    if (Seg.sesion && Seg.sesion.usuario === u.usuario) { return { ok: false, general: 'No puedes eliminar tu propia cuenta.' }; }
    if (u.rol === 'admin' && contarAdmins(u.usuario) === 0) { return { ok: false, general: 'Debe quedar al menos un administrador activo.' }; }
    i = estado().usuarios.indexOf(u);
    estado().usuarios.splice(i, 1);
    Almacen.guardar();
    Aud.registrar('usuario-eliminar', 'usuarios', u.usuario, publico(u), null, '');
    return { ok: true };
  };

  /** El administrador genera una clave temporal; el usuario deberá cambiarla al entrar. */
  Seg.restablecerClave = function (nombre) {
    var err = exigirAdmin(), u = Seg.buscarUsuario(nombre), temporal;
    if (err) { return { ok: false, general: err }; }
    if (!u) { return { ok: false, general: 'El usuario no existe.' }; }
    temporal = Seg.claveTemporal();
    u.sal = Sha.aleatorio(8);
    u.hash = Seg.hashClave(temporal, u.sal);
    u.cambiar = true;
    delete estado().intentos[u.usuario];
    Almacen.guardar();
    Aud.registrar('usuario-clave', 'usuarios', u.usuario, null, null, 'Clave temporal generada');
    return { ok: true, temporal: temporal };
  };

  /** El usuario con sesión cambia su propia clave. */
  Seg.cambiarClave = function (actual, nueva, repetida) {
    var u = Seg.sesion ? Seg.buscarUsuario(Seg.sesion.usuario) : null, errs, res = { ok: false, errores: {} };
    if (!u) { res.general = 'No hay una sesión activa.'; return res; }
    if (!Sha.igual(Seg.hashClave(String(actual || ''), u.sal), u.hash)) { res.errores.actual = 'La clave actual no es correcta.'; }
    errs = Seg.politica(nueva, u.usuario);
    if (errs.length) { res.errores.nueva = errs.join(' '); }
    else if (Sha.igual(Seg.hashClave(String(nueva), u.sal), u.hash)) { res.errores.nueva = 'La nueva clave debe ser distinta de la actual.'; }
    if (nueva !== repetida) { res.errores.repetida = 'Las dos claves no coinciden.'; }
    if (U.claves(res.errores).length) { return res; }
    u.sal = Sha.aleatorio(8);
    u.hash = Seg.hashClave(nueva, u.sal);
    u.cambiar = false;
    Almacen.guardar();
    Aud.registrar('cambio-clave', 'usuarios', u.usuario, null, null, 'El usuario cambió su clave');
    res.ok = true;
    return res;
  };

  /* ---------- Ingreso, bloqueo y sesión ---------- */

  function aviso() { return Math.min(60000, Seg.limiteMs() * 0.25); }

  /** Duración de la sesión inactiva en milisegundos (Infinity = no expira). */
  Seg.limiteMs = function () {
    var m = Number(Seg.cfg('sesionMin')) || 0;
    return m > 0 ? m * 60000 : Infinity;
  };

  function persistirSesion(forzar) {
    var ahora = Date.now();
    if (!Seg.sesion) { return; }
    if (forzar || ahora - ultimaPersistencia > 5000) { Almacen.sesionGuardar(Seg.sesion); ultimaPersistencia = ahora; }
  }

  /**
   * Intenta iniciar sesión. Devuelve { ok:true, cambiar } o { ok:false, error, bloqueado }.
   * Con intentosMax = 0 no hay contador ni bloqueo (modo débil).
   */
  Seg.ingresar = function (usuario, clave) {
    var nombre = String(usuario || '').replace(/^\s+|\s+$/g, '').toLowerCase(), max = Number(Seg.cfg('intentosMax')) || 0;
    var ahora = Date.now(), reg, u, h, correcto, restantes, minutos, est = estado();
    if (!nombre || !clave) { return { ok: false, error: 'Escribe tu usuario y tu contraseña.' }; }
    reg = est.intentos[nombre];
    if (max > 0 && reg && reg.hasta > ahora) {
      minutos = Math.ceil((reg.hasta - ahora) / 60000);
      Aud.registrar('ingreso-bloqueado', 'sesion', nombre, null, null, 'Intento durante el bloqueo', 'anónimo');
      return { ok: false, bloqueado: true, error: 'Cuenta bloqueada temporalmente por demasiados intentos. Vuelve a intentar en ' + minutos + (minutos === 1 ? ' minuto.' : ' minutos.') };
    }
    if (reg && reg.hasta && reg.hasta <= ahora) { reg.n = 0; reg.hasta = 0; }
    u = Seg.buscarUsuario(nombre);
    h = Seg.hashClave(String(clave), u ? u.sal : '0000000000000000'); // se hace el mismo trabajo exista o no el usuario
    correcto = !!u && u.activo !== false && Sha.igual(h, u.hash);
    if (correcto) {
      delete est.intentos[nombre];
      u.ultimoAcceso = U.ahoraISO();
      Seg.sesion = { usuario: u.usuario, inicio: ahora, ultimo: ahora };
      persistirSesion(true);
      Almacen.guardar();
      Aud.registrar('ingreso', 'sesion', u.usuario, null, null, 'Ingreso correcto');
      return { ok: true, cambiar: !!u.cambiar };
    }
    if (max > 0 && (reg || U.claves(est.intentos).length < 200)) {
      if (!reg) { reg = est.intentos[nombre] = { n: 0, hasta: 0 }; }
      reg.n += 1;
      if (reg.n >= max) {
        reg.hasta = ahora + (Number(Seg.cfg('bloqueoMin')) || 5) * 60000;
        Aud.registrar('bloqueo', 'sesion', nombre, null, null, 'Bloqueo por ' + reg.n + ' intentos fallidos', 'anónimo');
      }
    }
    Almacen.guardar();
    Aud.registrar('ingreso-fallido', 'sesion', nombre, null, null, 'Usuario o clave incorrectos', 'anónimo');
    if (max > 0 && reg && reg.hasta > ahora) {
      minutos = Math.ceil((reg.hasta - ahora) / 60000);
      return { ok: false, bloqueado: true, error: 'Demasiados intentos. Cuenta bloqueada temporalmente; vuelve a intentar en ' + minutos + (minutos === 1 ? ' minuto.' : ' minutos.') };
    }
    restantes = max > 0 && reg ? max - reg.n : 0;
    return { ok: false, error: 'Usuario o contraseña incorrectos.' + (max > 0 && restantes > 0 ? ' Te quedan ' + restantes + (restantes === 1 ? ' intento.' : ' intentos.') : '') };
  };

  /** Cierra la sesión. motivo: 'salida' (voluntaria) o 'expiración'. */
  Seg.salir = function (motivo) {
    if (Seg.sesion) {
      Aud.registrar(motivo === 'expiración' ? 'expiración' : 'salida', 'sesion', Seg.sesion.usuario, null, null, motivo === 'expiración' ? 'Sesión cerrada por inactividad' : 'Cierre de sesión');
    }
    Seg.sesion = null;
    Almacen.sesionBorrar();
  };

  /** Estado de vigencia: 'ok', 'aviso' (quedan pocos segundos) o 'expirada'. */
  Seg.vigencia = function () {
    var resto;
    if (!Seg.sesion) { return 'expirada'; }
    resto = Seg.restanteMs();
    if (resto <= 0) { return 'expirada'; }
    if (resto <= aviso()) { return 'aviso'; }
    return 'ok';
  };

  /** Milisegundos que le quedan a la sesión (Infinity si no expira). */
  Seg.restanteMs = function () {
    if (!Seg.sesion) { return 0; }
    return Seg.limiteMs() - (Date.now() - Seg.sesion.ultimo);
  };

  /** Registra actividad del usuario. No cuenta mientras se muestra el aviso: ahí hay que confirmar. */
  Seg.tocar = function () {
    if (!Seg.sesion || Seg.vigencia() !== 'ok') { return; }
    Seg.sesion.ultimo = Date.now();
    persistirSesion(false);
  };

  /** Confirma que el usuario sigue ahí (botón del aviso). */
  Seg.extender = function () {
    if (!Seg.sesion || Seg.vigencia() === 'expirada') { return false; }
    Seg.sesion.ultimo = Date.now();
    persistirSesion(true);
    return true;
  };

  /** Recupera la sesión de la pestaña tras recargar. Devuelve true si sigue vigente. */
  Seg.restaurarSesion = function () {
    var s = Almacen.sesionLeer(), u;
    if (!s || typeof s.usuario !== 'string') { return false; }
    u = Seg.buscarUsuario(s.usuario);
    if (!u || u.activo === false) { Almacen.sesionBorrar(); return false; }
    if (Seg.limiteMs() !== Infinity && Date.now() - s.ultimo >= Seg.limiteMs()) { Almacen.sesionBorrar(); return false; }
    Seg.sesion = { usuario: u.usuario, inicio: s.inicio || Date.now(), ultimo: s.ultimo || Date.now() };
    return true;
  };

  /**
   * Arranca la vigilancia de inactividad (una vez). callbacks:
   *   onAviso(segundos) cada segundo mientras quedan pocos segundos,
   *   onExpira() al vencer, onNormal() cuando se vuelve a la normalidad.
   * Con sesionMin = 0 no hay expiración (modo débil) y no se crea el temporizador.
   */
  Seg.vigilar = function (cb) {
    var eventos = ['click', 'keydown', 'mousemove', 'touchstart', 'scroll'], i;
    if (temporizador || Seg.limiteMs() === Infinity) { return; }
    for (i = 0; i < eventos.length; i++) { document.addEventListener(eventos[i], Seg.tocar, true); }
    temporizador = setInterval(function () {
      var v;
      if (!Seg.sesion) { return; }
      v = Seg.vigencia();
      if (v === 'expirada') { cb.onExpira(); }
      else if (v === 'aviso') { cb.onAviso(Math.ceil(Seg.restanteMs() / 1000)); }
      else if (cb.onNormal) { cb.onNormal(); }
    }, 1000);
  };

  /* ---------- Permisos (RBAC) ---------- */

  function entre(roles, rol) { return !!roles && !!rol && roles.indexOf(rol) !== -1; }

  /**
   * ¿Puede el usuario actual hacer esto?
   *   tipo 'e' (entidad): accion ver | crear | editar | eliminar
   *   tipo 'o' (operación): ver | crear | editar | emitir | anular | eliminar
   *   tipo 'r' (reporte): accion 'ver'. Un reporte SIN `roles` queda abierto a cualquier usuario con sesión.
   *   tipo 's' (sistema): id usuarios | bitacora | respaldo | configuracion
   * Lo que el config no concede, se niega.
   */
  Seg.puede = function (tipo, id, accion) {
    var rol = Seg.rolActual(), C = global.SISTEMA, def, ps;
    if (!rol) { return false; }
    if (tipo === 'e') {
      def = U.buscar(C.entidades || [], function (e) { return e.id === id; });
      return !!def && !!def.permisos && entre(def.permisos[accion], rol);
    }
    if (tipo === 'o') {
      def = U.buscar(C.operaciones || [], function (o) { return o.id === id; });
      if (!def || !def.permisos) { return false; }
      if (accion === 'eliminar' && !def.permisos.eliminar) { return entre(def.permisos.editar, rol); }
      return entre(def.permisos[accion], rol);
    }
    if (tipo === 'r') {
      def = U.buscar(C.reportes || [], function (r) { return r.id === id; });
      if (!def) { return false; }
      if (!def.roles) { return true; }
      return entre(def.roles, rol);
    }
    if (tipo === 's') {
      ps = (C.permisosSistema && C.permisosSistema[id]) || SISTEMA_POR_DEFECTO[id];
      return entre(ps, rol);
    }
    return false;
  };

  /** ¿El rol actual ve este campo? (campo.ver = lista de roles; sin lista = todos) */
  Seg.veCampo = function (campo) {
    if (!campo.ver) { return true; }
    return entre(campo.ver, Seg.rolActual());
  };

  /** ¿Está activa la Content-Security-Policy por <meta>? */
  Seg.cspActivo = function () {
    var metas = document.getElementsByTagName('meta'), i;
    for (i = 0; i < metas.length; i++) {
      if (String(metas[i].getAttribute('http-equiv') || '').toLowerCase() === 'content-security-policy') { return true; }
    }
    return false;
  };

  /* ---------- Validación de campos ---------- */

  function vacio(v) { return v === null || v === undefined || v === '' || (typeof v === 'string' && v.replace(/\s/g, '') === ''); }

  /**
   * Valida UN valor (ya convertido a su tipo) contra la definición del campo.
   * Devuelve '' si es válido o el mensaje de error en español.
   */
  Seg.validarCampo = function (campo, valor) {
    var tipo = campo.tipo || 'texto', s, n, max, min, dec;
    if (vacio(valor)) { return campo.requerido && tipo !== 'booleano' ? 'Este dato es obligatorio.' : ''; }
    if (tipo === 'texto' || tipo === 'textarea' || tipo === 'email' || tipo === 'telefono') {
      if (typeof valor !== 'string') { return 'Debe ser un texto.'; }
      s = valor.replace(/^\s+|\s+$/g, '');
      max = campo.max || (tipo === 'textarea' ? 2000 : 200);
      if (s.length > max) { return 'No puede superar ' + max + ' caracteres.'; }
      if (campo.min && s.length < campo.min) { return 'Debe tener al menos ' + campo.min + ' caracteres.'; }
      if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(s)) { return 'Contiene caracteres no permitidos.'; }
      if (tipo === 'email' && !/^[^\s@<>"']+@[^\s@<>"']+\.[A-Za-z]{2,}$/.test(s)) { return 'Escribe un correo válido, por ejemplo nombre@dominio.pe.'; }
      if (tipo === 'telefono' && !/^[0-9+()\- ]{6,20}$/.test(s)) { return 'Escribe un teléfono válido (solo números, espacios, + y guiones).'; }
      if (campo.patron && !new RegExp(campo.patron).test(s)) { return campo.mensajePatron || 'El formato no es válido.'; }
      return '';
    }
    if (tipo === 'numero' || tipo === 'moneda' || tipo === 'entero' || tipo === 'porcentaje') {
      n = valor;
      if (typeof n !== 'number' || !isFinite(n)) { return tipo === 'entero' ? 'Escribe un número entero.' : 'Escribe un número válido.'; }
      if (tipo === 'entero' && Math.floor(n) !== n) { return 'Escribe un número entero (sin decimales).'; }
      if (tipo === 'moneda') { dec = Math.round(n * 100); if (Math.abs(dec / 100 - n) > 1e-9) { return 'Usa como máximo 2 decimales.'; } }
      min = campo.min !== undefined ? campo.min : (tipo === 'porcentaje' ? 0 : undefined);
      max = campo.max !== undefined ? campo.max : (tipo === 'porcentaje' ? 100 : undefined);
      if (min !== undefined && n < min) { return 'Debe ser mayor o igual a ' + U.fmt.num(min, tipo === 'entero' ? 0 : 2).replace(/\.00$/, '') + '.'; }
      if (max !== undefined && n > max) { return 'Debe ser menor o igual a ' + U.fmt.num(max, tipo === 'entero' ? 0 : 2).replace(/\.00$/, '') + '.'; }
      return '';
    }
    if (tipo === 'fecha') {
      if (typeof valor !== 'string' || !U.esFecha(valor)) { return 'Escribe una fecha válida (AAAA-MM-DD).'; }
      if (campo.min && valor < U.resolverFecha(campo.min)) { return 'La fecha no puede ser anterior al ' + U.fmt.fecha(U.resolverFecha(campo.min)) + '.'; }
      if (campo.max && valor > U.resolverFecha(campo.max)) { return 'La fecha no puede ser posterior al ' + U.fmt.fecha(U.resolverFecha(campo.max)) + '.'; }
      return '';
    }
    if (tipo === 'lista') {
      return (campo.opciones || []).indexOf(valor) === -1 ? 'Elige una de las opciones.' : '';
    }
    if (tipo === 'ref') {
      return Datos.obtener(campo.entidad, valor, true) ? '' : 'El registro elegido ya no existe.';
    }
    if (tipo === 'booleano') { return typeof valor === 'boolean' ? '' : 'Valor no válido.'; }
    return '';
  };

  global.Seg = Seg;
})(window);
