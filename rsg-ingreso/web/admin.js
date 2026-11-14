(function () {
  "use strict";
  var B = location.pathname.replace(/admin\.html$/, ""), c = document.getElementById("c"), m = document.getElementById("m");
  function h() { return { "X-Clave": c.value, "Content-Type": "application/json" }; }
  function lima(iso) { return new Date(iso).toLocaleString("es-PE", { timeZone: "America/Lima", dateStyle: "short", timeStyle: "short" }); }
  function cargar() {
    fetch(B + "api/admin/inscritos", { headers: h() }).then(function (r) { if (!r.ok) throw r.status; return r.json(); }).then(function (d) {
      var xs = d.inscritos || [];
      m.textContent = xs.length + " registros · hoy " + d.hoy + " de " + d.tope_dia;
      var t = document.getElementById("t");
      t.textContent = "";
      xs.slice().reverse().forEach(function (x) {
        var r = t.insertRow();
        [lima(x.hora), x.nombre, x.correo, x.tipo, x.cambio ? "sí" : "no"].forEach(function (v) { r.insertCell().textContent = v; });
        var td = r.insertCell();
        if (x.tipo === "nueva") {
          var b = document.createElement("button");
          b.textContent = "Link nuevo";
          b.addEventListener("click", function () { reemitir(x); });
          td.appendChild(b);
        }
      });
    }).catch(function (s) { m.textContent = s === 429 ? "Demasiados intentos. Espera una hora." : "Clave incorrecta."; });
  }
  function reemitir(x) {
    fetch(B + "api/admin/enlace", { method: "POST", headers: h(), body: JSON.stringify({ usuario: x.usuario }) })
      .then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.error); return d; }); })
      .then(function (d) {
        document.getElementById("quien").textContent = x.nombre + " <" + x.correo + ">";
        document.getElementById("vence").textContent = d.vence;
        var l = document.getElementById("link");
        l.value = d.enlace;
        document.getElementById("nuevo").hidden = false;
        l.focus(); l.select();
        cargar();
      }).catch(function (e) { m.textContent = e.message || "No se pudo."; });
  }
  document.getElementById("f").addEventListener("submit", function (e) { e.preventDefault(); cargar(); });
  document.getElementById("csv").addEventListener("click", function () {
    fetch(B + "api/admin/csv", { headers: h() }).then(function (r) { if (!r.ok) throw 0; return r.blob(); }).then(function (b) {
      var a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "ready-set-go-inscritos.csv"; a.click();
    }).catch(function () { m.textContent = "Clave incorrecta."; });
  });
})();
