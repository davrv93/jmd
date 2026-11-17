// gq3.js · los pedidos de la sesión 2 de GoldenQuerys (gq-03, «pregúntale a tus propios archivos») para DeepSeek
// Harness. Script clásico, sin módulos:
//   <script src="../../comun/gq3.js"></script>     (antes de gq.js, al final del body)
//
// Es la ÚNICA fuente de los pedidos: la escena los pinta desde aquí y el panel de comandos de la clase (escena.yaml)
// y la lección (lessons/gq-03-tablero-dinamico.md) llevan el mismo texto. live/gq-03/_verificar.mjs comprueba que
// los tres digan lo mismo.
//
// Marcado:
//   <pre class="k-pedido" data-pedido="tablero"></pre>                    → el texto del pedido
//   <button class="k-btn oro" data-pedido-copiar="tablero" data-dsh>…</button>  → copia y abre DeepSeek Harness
// Y expone window.GQ3: { PEDIDOS, conLote(csv) }.
(function () {
  "use strict";
  var PEDIDOS = {
    lote:
      "Guarda tal cual, sin cambiar nada, este lote de mis archivos (lo exporté en la clase de GoldenQuerys) en goldenquerys/archivos/lote.csv: <<LOTE>> Luego, con python3 y sqlite3 (sin instalar nada), crea goldenquerys/bases/misarchivos.sqlite con una tabla archivos que tenga esas mismas columnas (total_soles y confianza como números). Comprueba con curl -s \"localhost:8766/api/consulta?db=misarchivos\" --get --data-urlencode \"sql=SELECT categoria, origen, COUNT(*) AS archivos, SUM(total_soles) AS soles FROM archivos GROUP BY categoria, origen\" y muéstrame el resultado en una tabla. Si curl no responde, corre antes sh /trabajo/goldenquerys/arrancar.sh; si no existe /trabajo/goldenquerys, crea solo la carpeta goldenquerys/archivos y dame la tabla con python3. NO inventes filas ni completes celdas vacías.",
    tablero:
      "Con la base misarchivos (tabla archivos), agrega a mi tablero goldenquerys/dashboard/index.html una tarjeta «Mis archivos» que responda: ¿cuánto fue venta, compra y gasto según mis archivos?, con barras que empiezan en cero y debajo cuántos archivos salieron por regla y cuántos necesitaron IA. Usa el SQL tal cual con /api/consulta y muestra ese SQL en la caja. No toques mis tres preguntas de oro. Si mi tablero no existe todavía, crea solo esa tarjeta en goldenquerys/dashboard/archivos.html. Al terminar dime qué escribir en el visor.",
  };

  // conLote(csv) → el pedido «lote» con el CSV del alumno adentro.
  function conLote(csv) {
    return PEDIDOS.lote.replace("<<LOTE>>", "\n\n" + String(csv || "").trim() + "\n\n");
  }

  function pintar() {
    Array.prototype.forEach.call(document.querySelectorAll("[data-pedido]"), function (el) {
      var k = el.getAttribute("data-pedido"); if (PEDIDOS[k]) el.textContent = PEDIDOS[k];
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-pedido-copiar]"), function (el) {
      var k = el.getAttribute("data-pedido-copiar"); if (PEDIDOS[k]) el.setAttribute("data-copiar-texto", PEDIDOS[k]);
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", pintar); else pintar();

  window.GQ3 = { PEDIDOS: PEDIDOS, conLote: conLote, pintar: pintar };
})();
