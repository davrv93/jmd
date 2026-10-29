// copiar.js · botón «Copiar» para cada <pre class="esc-cmd"> de una escena LIVE.
//
//   <script src="../../comun/copiar.js"></script>   (al final del body; script clásico, sin módulos)
//
// Al cargar envuelve cada pre.esc-cmd en un contenedor relativo y le pone un botón flotante arriba a la
// derecha. Copia el texto del pre SIN los prompts (<span class="p">$ </span>) para que se pueda pegar tal
// cual en la terminal. Si el pre trae data-copiar="...", se copia ese texto en vez del contenido.
// La escena corre en un iframe con sandbox: el portapapeles se intenta en este orden
//   navigator.clipboard → window.parent.navigator.clipboard → execCommand("copy").
//
// Expone:
//   window.copiarTexto(texto)  → Promise<boolean>   (para que otras escenas copien lo que quieran)
//   window.copiarMontar(raiz)  → vuelve a recorrer el DOM y monta botones en los pre nuevos
(function () {
  var CSS =
    ".cp-env{position:relative;min-width:0}" +
    ".cp-env>pre.esc-cmd{padding-right:5.6em}" +
    ".cp-btn{position:absolute;top:.5em;right:.6em;z-index:2;font:700 .6em/1 system-ui,-apple-system,sans-serif;" +
    "padding:.5em .85em;border-radius:999px;border:1px solid rgba(190,185,255,.35);background:rgba(20,18,43,.9);" +
    "color:#e9e6ff;cursor:pointer;opacity:.85;transition:opacity .2s ease-out,background .2s ease-out,border-color .2s ease-out;user-select:none}" +
    ".cp-btn:hover,.cp-btn:focus-visible{opacity:1;border-color:#a99cff;outline:none}" +
    ".cp-btn.ok{background:#136a33;border-color:#4fd37a;color:#fff;opacity:1}" +
    ".cp-btn.mal{background:#b11f1f;border-color:#ff7b7b;color:#fff;opacity:1}" +
    "@media (prefers-reduced-motion: reduce){.cp-btn{transition:none}}";

  function inyectarCss() {
    if (document.getElementById("cp-css")) return;
    var s = document.createElement("style");
    s.id = "cp-css";
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  async function copiarTexto(texto) {
    texto = String(texto == null ? "" : texto);
    try { await navigator.clipboard.writeText(texto); return true; } catch (e) {}
    try { await window.parent.navigator.clipboard.writeText(texto); return true; } catch (e) {}
    try {
      var a = document.createElement("textarea");
      a.value = texto;
      a.setAttribute("readonly", "");
      a.style.cssText = "position:fixed;top:0;left:0;opacity:0;pointer-events:none";
      document.body.appendChild(a);
      a.select();
      var ok = document.execCommand("copy");
      a.remove();
      return !!ok;
    } catch (e) { return false; }
  }

  /* Texto del pre sin prompts ni el propio botón; quita espacios al final de cada línea y líneas vacías en los bordes. */
  function textoDe(pre) {
    if (pre.hasAttribute("data-copiar")) return pre.getAttribute("data-copiar");
    var clon = pre.cloneNode(true);
    var fuera = clon.querySelectorAll(".p, .cp-btn");
    for (var i = 0; i < fuera.length; i++) fuera[i].remove();
    var lineas = clon.textContent.replace(/\r/g, "").split("\n").map(function (l) { return l.replace(/\s+$/, ""); });
    while (lineas.length && !lineas[0].trim()) lineas.shift();
    while (lineas.length && !lineas[lineas.length - 1].trim()) lineas.pop();
    return lineas.join("\n");
  }

  function montar(pre) {
    if (pre.getAttribute("data-cp") === "1") return;
    pre.setAttribute("data-cp", "1");
    var env = document.createElement("div");
    env.className = "cp-env";
    pre.parentNode.insertBefore(env, pre);
    env.appendChild(pre);
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "cp-btn";
    btn.textContent = "Copiar";
    btn.setAttribute("aria-label", "Copiar el comando");
    if (pre.classList.contains("a-in")) { /* el pre entra animado: el botón entra con él */
      btn.classList.add("a-in");
      var d = pre.style.getPropertyValue("--d");
      if (d) btn.style.setProperty("--d", d);
    }
    var temporizador = 0;
    btn.addEventListener("click", async function () {
      var ok = await copiarTexto(textoDe(pre));
      clearTimeout(temporizador);
      btn.classList.remove("ok", "mal");
      btn.classList.add(ok ? "ok" : "mal");
      btn.textContent = ok ? "✓ Copiado" : "No pude copiar";
      temporizador = setTimeout(function () { btn.classList.remove("ok", "mal"); btn.textContent = "Copiar"; }, 2500);
    });
    env.appendChild(btn);
  }

  function copiarMontar(raiz) {
    inyectarCss();
    var pres = (raiz || document).querySelectorAll("pre.esc-cmd");
    for (var i = 0; i < pres.length; i++) montar(pres[i]);
  }

  window.copiarTexto = copiarTexto;
  window.copiarMontar = copiarMontar;

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { copiarMontar(); });
  else copiarMontar();
})();
