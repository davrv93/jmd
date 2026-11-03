/* Botón «Abrir DeepSeek Harness» · componente ÚNICO del curso Excel + IA.
   Cada escena de caso práctico pone solo el marcador:   <div data-jmd-dsh data-prompt="Revisa mi registro…"></div>
   y este archivo lo convierte en la tarjeta del ayudante IA. Contrato de la plataforma: docs/BOTON_DEEPSEEK_HARNESS.md §1.
   - «Abrir DeepSeek Harness» → parent.postMessage({tipo:"abrir-dsh"}) y el LIVE abre /deepseek/ en una pestaña nueva
     (arranca dsh en el aula del alumno y elige la clave: la propia si la guardó, si no la de la clase).
   - «Mi clave» → parent.postMessage({tipo:"dsh-clave"}) y el LIVE abre /deepseek/?clave=1.
   - Antes de abrir, copia el prompt sugerido al portapapeles para pegarlo en dsh con Ctrl+V.
   La escena NUNCA pide ni guarda una API key. Fuera del LIVE (escena abierta suelta) abre /deepseek/ directamente.
   Además, el escena.yaml de cada caso práctico lleva «dsh: true»: el mismo botón y el candado salen en la cabecera. */
(function () {
  "use strict";
  var enLive = window.parent && window.parent !== window;
  function pedir(tipo) {
    if (enLive) {
      try { window.parent.postMessage({ tipo: tipo }, location.origin); return true; } catch (e) { /* sigue abajo */ }
    }
    var w = window.open(tipo === "dsh-clave" ? "/deepseek/?clave=1" : "/deepseek/", "_blank");
    if (w) w.opener = null;
    return !!w;
  }

  function copiar(texto) {
    var cb = null;
    try { cb = (window.parent && window.parent.navigator.clipboard) || navigator.clipboard; } catch (e) { cb = navigator.clipboard; }
    if (cb && cb.writeText) return cb.writeText(texto).then(function () { return true; }, function () { return copiarViejo(texto); });
    return Promise.resolve(copiarViejo(texto));
  }
  function copiarViejo(texto) {
    var t = document.createElement("textarea");
    t.value = texto;
    t.setAttribute("readonly", "");
    t.style.position = "fixed";
    t.style.opacity = "0";
    document.body.appendChild(t);
    t.select();
    var ok = false;
    try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    t.remove();
    return ok;
  }

  function montar(el) {
    if (el.dataset.montado) return;
    el.dataset.montado = "1";
    var prompt = el.getAttribute("data-prompt") || "";
    el.classList.add("jmd-dsh");
    el.innerHTML = "";
    var cab = document.createElement("div");
    cab.className = "dsh-cab";
    cab.innerHTML = '<span class="dsh-ico" aria-hidden="true">IA</span><span><b>Ayudante: DeepSeek Harness</b><small>Tú haces el Excel. La IA revisa y explica.</small></span>';
    var caja = document.createElement("div");
    caja.className = "dsh-prompt";
    caja.textContent = prompt;
    caja.setAttribute("aria-label", "Prompt sugerido");
    var acc = document.createElement("div");
    acc.className = "dsh-acc";
    var abrir = document.createElement("button");
    abrir.type = "button";
    abrir.className = "x-btn pri";
    abrir.setAttribute("data-dsh-abrir", "");
    abrir.textContent = "Abrir DeepSeek Harness";
    var cop = document.createElement("button");
    cop.type = "button";
    cop.className = "x-btn";
    cop.setAttribute("data-dsh-copiar", "");
    cop.textContent = "Copiar prompt";
    var clave = document.createElement("button");
    clave.type = "button";
    clave.className = "x-btn";
    clave.setAttribute("data-dsh-clave", "");
    clave.textContent = "🔒 Mi clave";
    acc.appendChild(abrir);
    acc.appendChild(cop);
    acc.appendChild(clave);
    var msg = document.createElement("div");
    msg.className = "dsh-msg";
    msg.setAttribute("aria-live", "polite");
    var regla = document.createElement("div");
    regla.className = "dsh-regla";
    regla.textContent = "Adjunta tu archivo o pega solo las filas que quieres revisar. No pegues datos reales de clientes: estos son ficticios.";
    el.appendChild(cab);
    el.appendChild(caja);
    el.appendChild(acc);
    el.appendChild(msg);
    el.appendChild(regla);

    cop.addEventListener("click", function () {
      copiar(prompt).then(function (ok) {
        msg.className = "dsh-msg" + (ok ? " ok" : "");
        msg.textContent = ok ? "Prompt copiado. Pégalo en DeepSeek Harness con Ctrl+V." : "Selecciona el texto del recuadro y cópialo.";
      });
    });
    abrir.addEventListener("click", function () {
      // postMessage primero y sin esperar: el LIVE abre la pestaña con la activación de este clic.
      pedir("abrir-dsh");
      copiar(prompt).then(function (ok) {
        msg.className = "dsh-msg ok";
        msg.textContent = (ok ? "Prompt copiado. " : "") + "DeepSeek Harness se abre en una pestaña nueva (la primera vez tarda unos segundos). " +
          (ok ? "Pégalo con Ctrl+V." : "Copia el texto del recuadro y pégalo allí.");
      });
    });
    clave.addEventListener("click", function () {
      pedir("dsh-clave");
      msg.className = "dsh-msg";
      msg.textContent = "Se abre la página de tu clave. Si tu grupo tiene la clave de la clase, no necesitas poner la tuya.";
    });
  }

  function todos() { Array.prototype.forEach.call(document.querySelectorAll("[data-jmd-dsh]"), montar); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", todos); else todos();
  window.JMDDsh = { montar: montar, copiar: copiar };
})();
