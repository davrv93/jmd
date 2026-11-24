var App = (function () {
  function guardia(ruta) {
    if (ruta === '#/login') { return true; }
    if (!Seg.vigente()) { location.hash = '#/login'; return false; }
    var s = Seg.sesion();
    if (ruta.indexOf('#/usuarios') === 0 && s.rol !== 'admin') { return false; }
    return true;
  }
  function ir() {
    var ruta = location.hash || '#/login';
    if (!guardia(ruta)) { return; }
    var partes = ruta.replace('#/', '').split('/');
    switch (partes[0]) {
      case 'login': Vistas.login(document.getElementById('app')); break;
      case 'tablero': break;
      case 'e': Vistas.lista(document.getElementById('app'), partes[1], []); break;
      case 'o': break;
      case 'r': break;
      case 'usuarios': break;
      case 'bitacora': break;
      default: location.hash = '#/tablero';
    }
  }
  window.addEventListener('hashchange', ir);
  function arrancar() { ir(); }
  return { arrancar: arrancar, guardia: guardia };
})();
App.arrancar();
