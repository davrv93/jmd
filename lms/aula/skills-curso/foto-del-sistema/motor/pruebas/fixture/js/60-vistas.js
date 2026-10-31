var Vistas = (function () {
  function login(cont) {
    cont.innerHTML = '';
    var f = document.createElement('form');
    var b = document.createElement('button');
    b.textContent = 'Ingresar';
    f.appendChild(b);
    cont.appendChild(f);
    if (SISTEMA.seguridad.ayudaLogin) {
      var ayuda = document.createElement('p');
      ayuda.textContent = SISTEMA.usuarios.map(function (u) { return u.usuario + ' / ' + u.clave; }).join(', ');
      cont.appendChild(ayuda);
    }
  }
  function lista(cont, entidad, filas) {
    var html = '';
    filas.forEach(function (r) { html += '<tr><td>' + r.nombre + '</td></tr>'; });
    cont.innerHTML = '<table>' + html + '</table>';
  }
  function ficha(cont, r) {
    var nombres = [r.nombre].map((n) => U.esc(n));
    cont.textContent = nombres.join('');
    if (nombres.includes('x')) { cont.className = 'x'; }
  }
  function eliminar(entidad, id, cb) {
    if (window.confirm('¿Eliminar ' + id + '?')) { cb(); }
  }
  return { login: login, lista: lista, ficha: ficha, eliminar: eliminar };
})();
