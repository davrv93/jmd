var Aud = (function () {
  var bitacora = [];
  function registrar(quien, que, entidad, id) {
    var previo = bitacora.length ? bitacora[bitacora.length - 1].hash : '0';
    var reg = { quien: quien, que: que, entidad: entidad, id: id, fecha: U.hoy(), previo: previo };
    reg.hash = sha256(previo + JSON.stringify(reg));
    bitacora.push(reg);
    return reg;
  }
  function verificar() {
    for (var i = 0; i < bitacora.length; i++) {
      var r = bitacora[i];
      var esperado = i === 0 ? '0' : bitacora[i - 1].hash;
      if (r.previo !== esperado) { return false; }
    }
    return true;
  }
  return { registrar: registrar, verificar: verificar, lista: function () { return bitacora; } };
})();
