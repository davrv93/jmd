// Comportamiento común de las escenas de cs-02. Sin red: el LIVE solo deja conectar con el mismo origen.
(function () {
  // Revelar: primero se predice, después se ve.
  document.querySelectorAll("[data-revelar]").forEach(function (b) {
    b.addEventListener("click", function () {
      document.querySelectorAll(b.getAttribute("data-revelar")).forEach(function (e) { e.hidden = false; });
      b.disabled = true;
    });
  });

  // Etapas del gateway: un clic muestra qué frena cada una.
  var detalle = document.querySelector("[data-detalle]");
  document.querySelectorAll("[data-etapa]").forEach(function (b) {
    b.addEventListener("click", function () {
      document.querySelectorAll("[data-etapa]").forEach(function (x) { x.setAttribute("aria-pressed", "false"); });
      b.setAttribute("aria-pressed", "true");
      detalle.textContent = "";
      var t = document.createElement("b");
      t.textContent = b.textContent + ". ";
      detalle.append(t, b.getAttribute("data-etapa"));
    });
  });

  // Copiar. Si el navegador no deja, se selecciona el texto.
  document.querySelectorAll("[data-copiar]").forEach(function (b) {
    b.addEventListener("click", function () {
      var e = document.querySelector(b.getAttribute("data-copiar"));
      var seleccionar = function () {
        var r = document.createRange();
        r.selectNodeContents(e);
        var s = getSelection();
        s.removeAllRanges();
        s.addRange(r);
        b.textContent = "Selecciónalo y cópialo";
      };
      if (!navigator.clipboard) { seleccionar(); return; }
      navigator.clipboard.writeText(e.textContent).then(function () { b.textContent = "Copiado"; }, seleccionar);
    });
  });

  // Laboratorio: AES-GCM de verdad con Web Crypto, en este navegador. La clave nace y muere aquí.
  var lab = document.querySelector("[data-lab]");
  if (!lab) return;
  var entrada = lab.querySelector("input");
  var salida = lab.querySelector("pre");
  var res = lab.querySelector(".res");
  var botones = {};
  lab.querySelectorAll("button").forEach(function (b) { botones[b.getAttribute("data-accion")] = b; });
  var clave = null, iv = null, cifrado = null;
  var hex = function (u) { return Array.from(u, function (x) { return x.toString(16).padStart(2, "0"); }).join(""); };
  var decir = function (t, c) { res.textContent = t; res.className = "res " + (c || ""); };
  var pintar = function () { salida.textContent = hex(cifrado); };

  if (!window.crypto || !crypto.subtle) {
    decir("Este navegador no da Web Crypto aquí. Míralo en la demo.", "mal");
    Object.keys(botones).forEach(function (k) { botones[k].disabled = true; });
    return;
  }
  botones.cifrar.addEventListener("click", async function () {
    clave = clave || await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
    iv = crypto.getRandomValues(new Uint8Array(12));
    cifrado = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, clave, new TextEncoder().encode(entrada.value)));
    pintar();
    decir("Cifrado. Sin la clave, esto no dice nada.");
    botones.tocar.disabled = false;
    botones.abrir.disabled = false;
  });
  botones.tocar.addEventListener("click", function () {
    cifrado[0] ^= 1;
    pintar();
    decir("Cambiaste un bit. Ahora intenta abrirlo.");
  });
  botones.abrir.addEventListener("click", async function () {
    try {
      var t = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, clave, cifrado);
      decir("Se abrió: " + new TextDecoder().decode(t), "bien");
    } catch (e) {
      decir("Rechazado: el sello no coincide.", "mal");
    }
  });
  botones.base64.addEventListener("click", function () {
    var t = btoa(String.fromCharCode.apply(null, new TextEncoder().encode(entrada.value)));
    salida.textContent = t;
    decir("Base64 no cifra: cualquiera lo revierte, sin clave.", "mal");
  });
})();
