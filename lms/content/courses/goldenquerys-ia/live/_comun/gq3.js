// gq3.js · los pedidos de la sesión 2 de GoldenQuerys (gq-03) para DeepSeek Harness. Script clásico, sin módulos:
//   <script src="../../comun/gq3.js"></script>     (antes de gq.js, al final del body)
//
// Es la ÚNICA fuente de los pedidos: la escena los pinta desde aquí y el panel de comandos de la clase
// (escena.yaml) y la lección (lessons/gq-03-tablero-dinamico.md) llevan el mismo texto. live/gq-03/_verificar.mjs
// comprueba que los tres digan lo mismo. Viven en un .js y no en escena.html porque el pedido del kit lleva su
// dirección completa y en una escena no puede haber «http».
//
// Marcado:
//   <pre class="k-pedido" data-pedido="retoma"></pre>                    → el texto del pedido
//   <button class="k-btn oro" data-pedido-copiar="retoma" data-dsh>…</button>  → copia y abre DeepSeek Harness
// Y expone window.GQ3: { KIT, NEGOCIOS, PEDIDOS, nuevo(db), decisiones([[si, entonces]…]) }.
(function () {
  "use strict";
  var KIT = "https://raw.githubusercontent.com/davrv93/jmd/main/lms/content/courses/goldenquerys-ia/materials/goldenquerys-kit.zip";

  var NEGOCIOS = [
    { db: "botica", nom: "Botica", c: "#0b8a5f", txt: "4 sedes · ventas y recetas" },
    { db: "polleria", nom: "Pollería", c: "#c2410c", txt: "salón, delivery y app" },
    { db: "ferreteria", nom: "Ferretería", c: "#475569", txt: "crédito y cobranzas" },
    { db: "academia", nom: "Academia", c: "#5a49d6", txt: "matrículas y pensiones" },
    { db: "courier", nom: "Courier", c: "#a4185c", txt: "envíos y plazos" },
  ];

  var PEDIDOS = {
    retoma:
      "Retoma GoldenQuerys, sesión 2. Si no existe /trabajo/goldenquerys (tu aula puede ser nueva), no lo busques más: pregúntame cuál era mi negocio (botica, polleria, ferreteria, academia o courier) y, cuando te responda con BASE, ejecuta curl -fsSL -o /tmp/gq.zip " + KIT +
      " && unzip -oq /tmp/gq.zip -d /trabajo && echo BASE > /trabajo/goldenquerys/MI_NEGOCIO.txt (cambiando BASE por mi respuesta). Cuando exista: corre sh /trabajo/goldenquerys/arrancar.sh, comprueba curl -s localhost:8766/api/salud, lee goldenquerys/MI_NEGOCIO.txt y goldenquerys/PLAN_TRABAJO.md y lista goldenquerys/consultas/*.sql. Dime en una tabla corta cada consulta con su «-- Pregunta:», su número y si ya tiene «-- Verificado:». Si tengo menos de 3 consultas, dímelo y no escribas nada todavía.",
    completa:
      "Tengo menos de 3 consultas en goldenquerys/consultas/. Propón las que faltan para llegar a 3 preguntas de oro de mi negocio, cada una con la decisión que permite tomar. Escribe su SQL, pruébala con curl contra /api/consulta, contrástala con una consulta independiente más simple (filas base, otra ruta, bordes: anuladas, fechas con hora, JOIN que duplica) y guárdala en goldenquerys/consultas/<negocio>-<tema>.sql con «-- Pregunta:», «-- Decisión:» y «-- Contrastado:» arriba. NO escribas «-- Verificado:»: lo escribo yo cuando revise tus números.",
    encarga:
      "Tareas T3, T4 y T4b del plan. Lee goldenquerys/skill-dashboard/SKILL.md y síguelo al pie de la letra. Construye goldenquerys/dashboard/index.html con mis 3 consultas de goldenquerys/consultas/ como centro: 1) usa el SQL de cada una tal cual y solo agrégale los filtros (fecha desde y hasta, y sede o local si mi base lo tiene); 2) elige el widget por la forma del resultado: un solo número → tarjeta KPI; pocas categorías para comparar → barras ordenadas que empiezan en cero; fechas en orden → línea; una lista para actuar (nombres, teléfonos, montos) → tabla; 3) completa lo que pide el skill (3 KPI, 2 gráficos, la tabla y la caja de pregunta con /api/pregunta); 4) encima de cada widget, su pregunta en una línea; 5) por defecto, las fechas del periodo de mis consultas (si no tienen fechas, del 2025-01-01 al 2026-10-31). Prueba cada consulta con curl antes de usarla y marca T3 y T4 solo si cumplen su criterio. Al terminar dime en 4 líneas qué widget responde cada pregunta y por qué, y qué escribir en el visor.",
    arregla:
      "Revisa goldenquerys/dashboard/index.html contra el criterio de T3, T4 y T4b del plan: 1) que todas las llamadas usen la ruta absoluta /api/…; 2) que al cambiar cualquier filtro se vuelvan a consultar TODOS los widgets (destruye cada gráfico antes de volver a crearlo); 3) que el filtro de fechas use date(fecha) para que el último día entre completo; 4) que la caja de pregunta muestre su SQL. Corrige lo que falle y dime en 3 líneas qué cambiaste.",
    cambia:
      "En mi tablero, el widget de la pregunta «__» debe ser __ (tarjeta, barras, línea o tabla), porque su consulta devuelve __. Cámbialo sin tocar su SQL y dime qué cambiaste.",
    cuadra:
      "Tarea T5 con mis tres preguntas. Para cada widget de goldenquerys/dashboard/index.html: 1) dime qué consulta de goldenquerys/consultas/ usa y qué fechas pone el filtro; 2) con las fechas de su «-- Verificado:» (o de su «-- Contrastado:» si aún no lo firmé), ejecuta con curl el MISMO SQL que manda el tablero; 3) muéstrame una tabla: widget | número por curl | número verificado | ¿cuadra?; 4) si alguno no cuadra, explícame en una línea por qué (filtro de fecha que corta el día, JOIN que duplica, anuladas u otra pregunta) y corrígelo en el tablero. NO marques T5: lo marco yo cuando vea el mismo número en el visor.",
    marcaT5:
      "Ya vi en el visor los mismos números que tus curl y que mis «-- Verificado:». Marca T5 hecha en goldenquerys/PLAN_TRABAJO.md y muéstrame el plan completo.",
    referencias:
      "Para cada una de mis 3 preguntas de oro de goldenquerys/consultas/, dame en una tabla el número que muestra hoy mi tablero y una referencia para compararlo (el mes anterior, el promedio de los meses anteriores o el mismo mes del año pasado: la que tenga sentido), sacada con curl. NO escribas decisiones: te las dicto yo en el siguiente mensaje.",
    decisiones:
      "Mis decisiones: 1) Si __, entonces __. 2) Si __, entonces __. 3) Si __, entonces __. Agrégalas a goldenquerys/dashboard/index.html: debajo del widget de cada pregunta, un recuadro «Decisión» con la frase y un semáforo que se recalcula con los filtros: ámbar si con los datos filtrados se cumple el «si» (toca actuar) y verde si no. Guárdalas también como «-- Decisión:» en su consulta. No cambies ningún SQL; si una condición no se puede calcular con los datos, pregúntame antes de inventar. Al terminar dime qué semáforo está en ámbar hoy.",
  };

  // Me perdí la sesión 1: baja el kit, explora y deja tres consultas contrastadas (el «verificado» lo firma el alumno).
  function nuevo(db) {
    var n = NEGOCIOS.filter(function (x) { return x.db === db; })[0] || NEGOCIOS[0];
    return "Me perdí la sesión 1. Mi negocio es: " + n.nom + " (base " + n.db + "). 1) Ejecuta este comando y dime qué imprimió: curl -fsSL -o /tmp/gq.zip " + KIT +
      " && unzip -oq /tmp/gq.zip -d /trabajo && echo " + n.db + " > /trabajo/goldenquerys/MI_NEGOCIO.txt && sh /trabajo/goldenquerys/arrancar.sh . 2) Lee goldenquerys/AGENTS.md y goldenquerys/skill-dashboard/SKILL.md, reemplaza <<NEGOCIO>> en goldenquerys/PLAN_TRABAJO.md y haz T1 con curl -s \"localhost:8766/api/esquema?db=" + n.db +
      "\". 3) Propón 3 preguntas de oro para el dueño, cada una con su decisión; escribe su SQL, pruébala con curl contra /api/consulta y contrástala con una consulta más simple (filas base, otra ruta y bordes: anuladas, fechas con hora, JOIN que duplica). 4) Guárdalas en goldenquerys/consultas/<negocio>-<tema>.sql con «-- Pregunta:», «-- Decisión:» y «-- Contrastado:» arriba. NO escribas «-- Verificado:» ni marques T2: eso lo hago yo. Termina con una tabla: pregunta, número y prueba.";
  }
  NEGOCIOS.forEach(function (n) { PEDIDOS["nuevo-" + n.db] = nuevo(n.db); });

  // decisiones([["las ventas de octubre bajan de S/ 8 000", "reviso precios…"], …]) → el pedido con las frases del alumno.
  function decisiones(filas) {
    var t = PEDIDOS.decisiones, k = 0;
    (filas || []).forEach(function (f, i) {
      var si = String(f[0] || "").trim().replace(/[.;]+$/, ""), ent = String(f[1] || "").trim().replace(/[.;]+$/, "");
      if (!si && !ent) return;
      t = t.replace(String(i + 1) + ") Si __, entonces __.", String(i + 1) + ") Si " + (si || "__") + ", entonces " + (ent || "__") + ".");
      k++;
    });
    return { texto: t, completas: k };
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

  window.GQ3 = { KIT: KIT, NEGOCIOS: NEGOCIOS, PEDIDOS: PEDIDOS, nuevo: nuevo, decisiones: decisiones, pintar: pintar };
})();
