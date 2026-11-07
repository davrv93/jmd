var Almacen = (function () {
  var CLAVE = 'sis_taller_v1';
  var memoria = {};
  function leer() {
    try { var t = window.localStorage.getItem(CLAVE); return t ? JSON.parse(t) : null; }
    catch (e) { return memoria[CLAVE] || null; }
  }
  function guardar(db) {
    try { window.localStorage.setItem(CLAVE, JSON.stringify(db)); }
    catch (e) { memoria[CLAVE] = db; window.name = JSON.stringify(db); }
  }
  function exportar(db) {
    var cuerpo = JSON.stringify(db);
    return { checksum: sha256(cuerpo), datos: db };
  }
  function importar(paquete) {
    var cuerpo = JSON.stringify(paquete.datos);
    if (sha256(cuerpo) !== paquete.checksum) { throw new Error('Respaldo alterado'); }
    return paquete.datos;
  }
  return { leer: leer, guardar: guardar, exportar: exportar, importar: importar };
})();
