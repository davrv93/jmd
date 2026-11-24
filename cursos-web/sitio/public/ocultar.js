/* Regla del usuario: en /cursos solo lo que aún no comienza, siempre.
   La página es estática, así que al abrirla (y cada minuto) se ocultan los grupos cuya primera sesión ya pasó:
   tarjetas, casillas «Marcar» y grupos de cada curso. */
(function () {
  var D = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"], M = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "set", "oct", "nov", "dic"];
  var DL = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"], ML = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "setiembre", "octubre", "noviembre", "diciembre"];
  function lima(t) { return new Date(t - 5 * 3600e3); }
  function filtrar() {
    var ahora = Date.now();
    var paso = function (v) { var t = Date.parse(v); return !isNaN(t) && t <= ahora; };
    document.querySelectorAll("[data-inicio]").forEach(function (e) {
      var fue = paso(e.getAttribute("data-inicio"));
      e.hidden = fue;
      e.querySelectorAll("input[data-cohorte]").forEach(function (i) { i.disabled = fue; if (fue) i.checked = false; });
    });
    document.querySelectorAll("[data-inicios]").forEach(function (c) {
      var quedan = c.getAttribute("data-inicios").split(",").filter(function (v) { return v && !paso(v); });
      c.hidden = quedan.length === 0;
      if (!quedan.length) return;
      var d = lima(Math.min.apply(null, quedan.map(Date.parse)));
      var cu = c.querySelector(".cuando"); if (cu) cu.textContent = D[d.getUTCDay()] + " " + d.getUTCDate() + " " + M[d.getUTCMonth()];
      var pie = c.querySelector(".pie[data-precio]"); if (pie) pie.textContent = pie.getAttribute("data-precio") + " · " + quedan.length + (quedan.length === 1 ? " grupo" : " grupos");
    });
    var vivos = document.getElementById("vivos");
    if (vivos) {
      var vis = Array.prototype.some.call(vivos.children, function (c) { return !c.hidden; });
      var v = document.getElementById("vivos-vacio"); if (v) v.hidden = vis;
    }
    var grupos = document.querySelectorAll(".grupos > .grupo[data-inicio]");
    if (grupos.length) {
      var abiertos = Array.prototype.filter.call(grupos, function (g) { return !g.hidden; });
      var vac = document.querySelector(".grupos + .vacio"); if (vac) vac.hidden = abiertos.length > 0;
      var ng = document.querySelector("[data-ngrupos]");
      if (ng) ng.textContent = abiertos.length + (abiertos.length === 1 ? " grupo" : " grupos") + " por empezar";
      var chip = document.querySelector("[data-chip]");
      if (chip) {
        if (abiertos.length) {
          var p = lima(Math.min.apply(null, abiertos.map(function (g) { return Date.parse(g.getAttribute("data-inicio")); })));
          chip.textContent = "Próximo inicio: " + DL[p.getUTCDay()] + " " + p.getUTCDate() + " de " + ML[p.getUTCMonth()];
        } else chip.textContent = "Grupos de este curso ya iniciados";
      }
    }
    document.dispatchEvent(new CustomEvent("cursos:filtrado"));
  }
  filtrar();
  setInterval(filtrar, 60000);
})();
