function sha256(texto) {
  // implementación mínima de prueba (no es SHA-256 real, solo para el fixture)
  var h = 5381;
  for (var i = 0; i < texto.length; i++) { h = ((h << 5) + h + texto.charCodeAt(i)) | 0; }
  return ('00000000' + (h >>> 0).toString(16)).slice(-8);
}
var Seg = (function () {
  var ITERACIONES = 1000;
  var sesion = null;
  var fallos = {};
  function derivar(clave, sal) {
    var h = clave + sal;
    for (var i = 0; i < ITERACIONES; i++) { h = sha256(h + sal); }
    return h;
  }
  function nuevaSal() { return Math.random().toString(36).slice(2, 10); }
  function ingresar(usuario, clave, db) {
    var u = db.usuarios.filter(function (x) { return x.usuario === usuario; })[0];
    var f = fallos[usuario] || { intentos: 0, bloqueoHasta: 0 };
    if (f.bloqueoHasta > Date.now()) { return { ok: false, motivo: 'bloqueado' }; }
    if (!u || derivar(clave, u.sal) !== u.hash) {
      f.intentos++;
      if (f.intentos >= SISTEMA.seguridad.intentosMax) { f.bloqueoHasta = Date.now() + SISTEMA.seguridad.bloqueoMin * 60000; f.intentos = 0; }
      fallos[usuario] = f;
      return { ok: false, motivo: 'credenciales' };
    }
    sesion = { usuario: u.usuario, rol: u.rol, ultimo: Date.now() };
    return { ok: true };
  }
  function vigente() {
    if (!sesion) { return false; }
    var max = SISTEMA.seguridad.sesionMin;
    if (max && Date.now() - sesion.ultimo > max * 60000) { sesion = null; return false; }
    sesion.ultimo = Date.now();
    return true;
  }
  function puede(rol, entidad, accion) {
    var e = SISTEMA.entidades.filter(function (x) { return x.id === entidad; })[0];
    return !!(e && e.permisos && U.incluye(e.permisos[accion] || [], rol));
  }
  function claveValida(clave) {
    return clave.length >= SISTEMA.seguridad.minClave && /[A-Z]/.test(clave) && /[0-9]/.test(clave);
  }
  return { ingresar: ingresar, vigente: vigente, puede: puede, claveValida: claveValida, nuevaSal: nuevaSal, derivar: derivar, sesion: function () { return sesion; } };
})();
