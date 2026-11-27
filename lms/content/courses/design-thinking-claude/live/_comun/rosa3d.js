/* Rosa 3D · avatar de práctica de la entrevista de empatía (Design Thinking con Claude, sesión 1).
 * Personaje FICTICIO. Avatar Microsoft Rocketbox Female_Adult_11 (licencia MIT, © 2020 Microsoft), adaptado: piel,
 * texturas y formas de cara; sin aretes ni joyas. Motor: Three.js r170 (MIT). Movimiento procedural (sin Mixamo).
 *
 * ── INTEGRACIÓN (para bloqueRosa en lab.js) ─────────────────────────────────────────────────────────────────────────
 *  1. En la escena (o desde lab.js, antes de usarlo): <script src="../../comun/rosa3d.js"></script>
 *     Este archivo pesa ~7 KB y no carga nada más. El motor (rosa3d-motor.js, 740 KB; ~190 KB con gzip; trae Three.js)
 *     y el modelo (/files/design-thinking-claude/materials/rosa3d/rosa.glb, 3,4 MB) se piden recién en montar().
 *     El .glb tiene que estar declarado como material de una lección publicada (si no, /files/ da 404 y queda el SVG).
 *  2. Contenedor: un bloque con tamaño propio, posición relative y bordes redondeados a gusto. Pensado para un plano
 *     medio corto de unos 320 × 360 px CSS (proporción ≈ 8:9); se adapta solo a otros tamaños (ResizeObserver).
 *     Puede llevar dentro el SVG de siempre: el lienzo 3D se monta ENCIMA (position:absolute; inset:0) y aparece con
 *     un fundido cuando el primer cuadro está listo. Si algo falla, no se monta nada y el SVG sigue ahí.
 *  3. Código sugerido dentro de bloqueRosa (después de crear `cara`, `gesto` y `abrir`):
 *
 *       var r3d = null;
 *       if (window.Rosa3D && Rosa3D.disponible()) {
 *         var caja3d = h("div", { class: "rosa-3d" });            // 320×360, position:relative, border-radius
 *         // … insertarla en la cabecera en lugar de (o junto a) `cara` …
 *         Rosa3D.montar(caja3d, { alPerder: function () { r3d = null; caja3d.remove(); } }).then(function (r) {
 *           r3d = r; r3d.gesto(svg.getAttribute("data-gesto") || "tranquila");
 *           if (cara.classList.contains("descubierto")) r3d.descubierto({ inmediato: true });
 *         }, function () { caja3d.remove(); });                  // sin WebGL, sin red o sin modelo: queda el SVG
 *       }
 *       // y en los puntos que ya existen:
 *       //   gesto(g)  → además: if (r3d) r3d.gesto(g);
 *       //   abrir(n)  → además: if (r3d) r3d.boca(n);             (n de 0 a 1, 10–60 veces por segundo)
 *       //   al descubrir el insight (cara.classList.add("descubierto")) → if (r3d) r3d.descubierto();
 *       //   «Empezar de nuevo» rearma la estación: antes, if (r3d) r3d.destruir();
 *
 *     hablando(bool) es opcional: Rosa 3D ya sabe que habla mientras le llegan valores de boca(). Úsalo si quieres
 *     forzarlo (true al empezar la voz, false al terminar).
 *
 * ── API ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
 *  Rosa3D.disponible() → boolean   WebGL2 con aceleración y equipo no tan débil; false → quédate con el SVG.
 *  Rosa3D.montar(contenedor, opciones) → Promise<{ gesto, boca, hablando, descubierto, destruir }>
 *     opciones: modelo (URL del .glb), motor (URL de rosa3d-motor.js), fondo ('auto' | 'claro' | 'oscuro' |
 *     'transparente'; 'auto' sigue a html[data-tema] y a prefers-color-scheme), calidad ('auto' | 'alta' | 'baja'),
 *     sinMovimiento (true = sin balanceo; también con prefers-reduced-motion), alPerder (función si se pierde WebGL).
 *  gesto('tranquila'|'dudosa'|'incomoda'|'emocionada'|'seria')  cara + postura, fundido de ~300 ms
 *  boca(n)         apertura 0..1 → mandíbula y visemas
 *  hablando(bool)  cuerpo en modo habla (cabeceos, manos) o escucha
 *  descubierto(o)  una sola vez: se abre (toma aire, suelta los hombros, cierra los ojos, sonríe, mano al pecho);
 *                  o = { inmediato: true } la deja en ese estado sin la escena (al recargar)
 *  destruir()      libera WebGL, geometrías, texturas, observadores y el bucle
 */
(function () {
  "use strict";
  if (window.Rosa3D) return;
  var actual = document.currentScript && document.currentScript.src;
  var BASE = actual ? actual.replace(/[^\/?#]*([?#].*)?$/, "") : "../../comun/";
  var MODELO = "/files/design-thinking-claude/materials/rosa3d/rosa.glb";
  var cacheDisp = null, motorP = null;

  function disponible() {
    if (cacheDisp !== null) return cacheDisp;
    cacheDisp = false;
    try {
      var nav = window.navigator || {};
      if (nav.connection && nav.connection.saveData) return false;              // ahorro de datos: 5 MB no
      if (nav.deviceMemory && nav.deviceMemory < 2) return false;               // equipos con muy poca memoria
      if (typeof Promise === "undefined" || typeof window.WebGL2RenderingContext === "undefined") return false;
      var c = document.createElement("canvas");
      var gl = c.getContext("webgl2", { failIfMajorPerformanceCaveat: true, antialias: false, depth: true });
      if (!gl) return false;                                                    // sin aceleración (o software)
      var ok = true, info = gl.getExtension("WEBGL_debug_renderer_info");
      var rend = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL) || "") : "";
      if (/swiftshader|llvmpipe|softpipe|software|basic render|mesa offscreen/i.test(rend)) ok = false;
      if (gl.getParameter(gl.MAX_TEXTURE_SIZE) < 4096) ok = false;
      if (gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS) < 256) ok = false;
      if ((nav.hardwareConcurrency || 4) < 2) ok = false;
      var perder = gl.getExtension("WEBGL_lose_context"); if (perder) perder.loseContext();
      cacheDisp = ok;
    } catch (e) { cacheDisp = false; }
    return cacheDisp;
  }

  function cargarMotor(url) {
    if (window.__Rosa3DMotor) return Promise.resolve(window.__Rosa3DMotor);
    if (motorP) return motorP;
    motorP = new Promise(function (ok, mal) {
      var s = document.createElement("script");
      s.src = url; s.async = true;
      s.onload = function () { if (window.__Rosa3DMotor) ok(window.__Rosa3DMotor); else mal(new Error("Rosa 3D: el motor no se registró")); };
      s.onerror = function () { motorP = null; mal(new Error("Rosa 3D: no se pudo cargar el motor")); };
      (document.head || document.documentElement).appendChild(s);
    });
    return motorP;
  }

  function montar(contenedor, opciones) {
    opciones = opciones || {};
    if (!contenedor || !contenedor.appendChild) return Promise.reject(new Error("Rosa 3D: falta el contenedor"));
    if (!disponible()) return Promise.reject(new Error("Rosa 3D: este equipo no da WebGL2 acelerado"));
    var op = {}; for (var k in opciones) if (Object.prototype.hasOwnProperty.call(opciones, k)) op[k] = opciones[k];
    if (!op.modelo) op.modelo = MODELO;
    return cargarMotor(op.motor || BASE + "rosa3d-motor.js").then(function (M) { return M.montar(contenedor, op); });
  }

  window.Rosa3D = { disponible: disponible, montar: montar, version: "1.0.0" };
})();
