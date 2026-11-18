// Cinemáticas y fichas de concepto de la arena del monito (Laboratorio de caos, lc-01).
// escena.html le pasa cada estado nuevo con Cine.alEstado(previo, actual, eventosNuevos). De ahí salen:
//   · cae la noche (turno de ataque): el Ozaru crece con la luna
//   · cada ataque: ficha «problema frecuente» con lo que pasa en la vida real
//   · amanece (turno de defensa): entra Ema, el Rey Mono
//   · cada falla que un defensor logra quitar: Ema la contiene y la ficha muestra el concepto y el prompt
//   · un botón que no curó, y los servidores que quedan caídos al cierre: Ema falla y la ficha da la pista
// Nada de esto cambia las reglas ni el puntaje: solo mira el estado que ya manda la API. Las cinemáticas
// van encendidas para todos; no hay nada que instalar ni que activar. La coreografía 3D la hace arena3d.js.
(function () {
  "use strict";
  var REDUCIDO = false;
  try { REDUCIDO = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}
  var $ = function (id) { return document.getElementById(id); };

  // Ataque → [icono, problema frecuente, qué pasa en la vida real]
  var PROBLEMA = {
    apagar: ["🔌", "Proceso caído", "Una app se cierra sola por un error o por falta de memoria. Si nadie la vigila, nadie se entera."],
    disco: ["💾", "Disco lleno", "Los registros y los temporales crecen sin que nadie los mire, hasta que no entra ni un byte más."],
    base: ["🗑️", "Base de datos perdida", "Un borrado por error o un disco dañado, y el negocio se queda sin memoria."],
    atascar: ["🐢", "App lenta", "No está caída: responde tan lento que, para el cliente, es lo mismo."],
    fuga: ["🏃", "Fuga de datos", "Un archivo con datos de clientes quedó en una carpeta que cualquiera puede descargar."],
    clones: ["👥", "Procesos fuera de control", "Tareas que se multiplican solas y se comen la máquina."],
    pesados: ["📦", "Subidas sin límite", "Nadie puso tope al tamaño de los archivos: unas cuantas fotos gigantes llenan el disco."],
    formulario: ["✍️", "Datos sin validar", "El formulario aceptó nombres vacíos, precios negativos y stock imposible."],
    sesion: ["🔓", "Sesión que nunca vence", "El admin entró una vez y su sesión quedó abierta para siempre."],
    clave: ["🔑", "Clave débil", "admin / 123456: la primera que prueba cualquiera."]
  };
  // Falla curada → [icono, logro, concepto, prompt que la cura]. Los prompts coinciden con lo que revisa /salud.
  var CURA = {
    app: ["🩹", "App de nuevo en pie", "Un proceso que muere no revive solo: alguien, o algo, tiene que vigilarlo y volver a arrancarlo.", "Mi tienda está apagada: arráncala con sh /trabajo/monito/arrancar.sh y dime el código de /salud."],
    disco: ["🧹", "Disco liberado", "Antes de borrar, mide: mira qué archivos pesan más. Se borra la basura, no lo primero que aparece.", "Mi /tmp está lleno: lista los archivos por tamaño con ls -laS (también en /tmp/subidas) y borra solo el relleno y las subidas gigantes."],
    base: ["💽", "Base restaurada", "Un respaldo solo vale si se puede restaurar. Hoy se probó.", "Me borraron la base de la tienda: restáurala desde el respaldo con la skill monito-server y comprueba que /salud dé 200."],
    lenta: ["⚡", "App otra vez rápida", "Lenta no es caída: reiniciar no quita la causa. Hay que encontrar qué la atasca.", "Mi tienda responde lentísimo: busca qué la atasca en /trabajo/monito y quítalo sin reiniciar nada. Comprueba /salud."],
    fuga: ["🙈", "Fuga cerrada", "Lo que está en una carpeta pública lo ve cualquiera. Se publica lo mínimo.", "En /salud sale «fuga»: revisa /trabajo/monito/publico y saca todo lo que no debería poder descargarse."],
    clones: ["✂️", "Clones detenidos", "Antes de culpar a la app, mira quién corre en la máquina. Lo que no reconoces, se investiga.", "En /salud sale «clones»: lista los procesos con ps, encuentra los «monito-clon» y deténlos sin tocar la tienda."],
    datos: ["🧼", "Datos limpios", "Nunca confíes en lo que llega de un formulario: se valida en el servidor.", "En /salud sale «datos»: borra de la tabla productos los que tengan nombre vacío, precio menor o igual a 0 o stock negativo."],
    sesion: ["🔒", "Sesión cerrada", "Toda sesión debe vencer. Una que dura «nunca» es una llave perdida.", "En /salud sale «sesion»: revisa /trabajo/monito/config/sesiones y borra las que nunca expiran."],
    clave: ["🛡️", "Clave fuerte", "Una clave corta o típica es una puerta abierta: larga, única y fuera de las listas de siempre.", "En /salud sale «clave»: cambia la clave de /trabajo/monito/config/admin.json por una de 10 caracteres o más que no sea común."]
  };
  // Falla que no se logró quitar → pista (sin regalar el prompt)
  var PISTA = {
    app: "La app sigue apagada. Si no arranca, mira /trabajo/monito/servidor.log.",
    disco: "/tmp sigue lleno: algo más lo ocupa. Mide antes de borrar: ¿qué archivos pesan más?",
    base: "La base no volvió. Hay un respaldo esperando en /trabajo/monito/respaldo.",
    lenta: "Sigue atascada, y reiniciar no ayuda: busca un archivo raro en config/.",
    fuga: "Sigue habiendo algo a la vista de todos. ¿Qué se puede descargar de /publico/?",
    clones: "Los clones siguen ahí. ¿Quién corre en tu aula?",
    datos: "Siguen los productos imposibles. Revisa la tabla productos.",
    sesion: "Hay una sesión que no vence. Mira config/sesiones.",
    clave: "La clave del admin no aguanta. Mira config/admin.json.",
    sin_lab: "Tu servidor se está reponiendo solo: dale unos segundos.",
    aula: "Tu aula no respondió: se repone sola en unos segundos."
  };
  var NOMBRE = { app: "app apagada", disco: "disco lleno", base: "base borrada", lenta: "app atascada", fuga: "fuga de datos", clones: "clones", datos: "datos sin validar", sesion: "sesión abierta", clave: "clave débil", sin_lab: "servidor reponiéndose", aula: "aula dormida" };
  var ICO_FALLA = { app: "🔌", disco: "💾", base: "🗑️", lenta: "🐢", fuga: "🏃", clones: "👥", datos: "✍️", sesion: "🔓", clave: "🔑", sin_lab: "⚙️", aula: "💤" };
  // Con la app apagada o atascada, /salud no contesta y estas fallas dejan de verse: que desaparezcan no es una cura.
  var SOLO_SALUD = { datos: 1, clave: 1, sesion: 1, fuga: 1 };
  var BOTON = { reiniciar: ["Reiniciar app", "app"], limpiar: ["Limpiar disco", "disco"] };

  var cola = [], actual = null, reloj = null, antes = {}, ultimo = null, yoN = -1, staff = false;
  var vistoP = {}, vistoC = {}, bitacora = [], enBitacora = {}, revisiones = {};

  function corto(nombre) { var p = String(nombre || "").trim().split(/\s+/); return p[0] + (p[1] ? " " + p[1][0] + "." : ""); }
  function jug(est, n) { for (var i = 0; i < est.jugadores.length; i++) if (est.jugadores[i].n === n) return est.jugadores[i]; return null; }
  function tiene(lista, x) { return (lista || []).indexOf(x) >= 0; }

  /* ---- Ficha ---- */
  function pintar(c) {
    var f = $("ficha");
    if (!f) return;
    f.className = "ficha " + c.clase + (c.mini ? " mini" : "");
    $("ficha-ic").textContent = c.ic;
    $("ficha-k").textContent = c.k;
    $("ficha-t").textContent = c.t;
    $("ficha-q").textContent = c.q || ""; $("ficha-q").hidden = !c.q;
    $("ficha-c").textContent = c.c || ""; $("ficha-c").hidden = !c.c || !!c.mini;
    $("ficha-p").textContent = c.p || ""; $("ficha-pw").hidden = !c.p || !!c.mini;
    var b = $("ficha-barra");
    b.style.animation = "none"; void b.offsetWidth;
    b.style.animation = "ficha-barra " + c.ms + "ms linear forwards";
    f.hidden = false;
    if (window.gsap && !REDUCIDO) window.gsap.fromTo(f, { y: 26, opacity: 0, scale: 0.94 }, { y: 0, opacity: 1, scale: 1, duration: 0.3, ease: "back.out(1.8)", overwrite: true });
  }
  function ocultar() {
    var f = $("ficha");
    if (f) f.hidden = true;
    if (window.Arena3D && window.Arena3D.cineFin) window.Arena3D.cineFin();
  }
  function anotar(clave, c) {
    if (enBitacora[clave] || c.mini) return;
    enBitacora[clave] = true;
    bitacora.push(c);
    var d = $("conceptos"), ul = $("conceptos-ul");
    if (!d || !ul) return;
    d.hidden = false;
    $("conceptos-n").textContent = bitacora.length;
    var li = document.createElement("li"), b = document.createElement("b"), s = document.createElement("span");
    b.textContent = c.ic + " " + c.t;
    s.textContent = c.c || "";
    li.appendChild(b); li.appendChild(s);
    if (c.p) { var k = document.createElement("code"); k.textContent = c.p; li.appendChild(k); }
    ul.insertBefore(li, ul.firstChild);
  }

  /* ---- Cola: una cinemática a la vez; si se acumulan, van más rápido y las repetidas se resumen ---- */
  function encolar(c) {
    if (cola.length >= 6) {                      // primero se van las resumidas; si no hay, la más vieja
      var i = -1;
      for (var k = 0; k < cola.length; k++) if (cola[k].mini) { i = k; break; }
      cola.splice(i < 0 ? 0 : i, 1);
    }
    cola.push(c);
    if (!actual) siguiente();
  }
  function siguiente() {
    clearTimeout(reloj);
    actual = cola.shift() || null;
    if (!actual) { ocultar(); return; }
    var rapido = cola.length >= 2;
    actual.ms = Math.round(actual.dur * 1000 * (rapido ? 0.6 : 1));
    pintar(actual);
    if (actual.clave) anotar(actual.clave, actual);
    try { if (window.Arena3D && window.Arena3D.cine && window.__arena && window.__arena.en3d()) window.Arena3D.cine(actual, rapido); } catch (e) {}
    reloj = setTimeout(siguiente, actual.ms);
  }
  function vaciar() { cola = []; }

  /* ---- De eventos y estados a cinemáticas ---- */
  function deAtaque(est, e) {
    if (e.accion === "super") {
      var d0 = jug(est, e.de), a0 = jug(est, e.a);
      encolar({ tipo: "super", clase: "problema", ic: "🌕", k: "Superpoder del equipo Tumba", t: "¡Golpe Ozaru!", a: e.a, icono: "🌕",
        c: "Dos fallas a la vez, y el escudo no alcanza. En la vida real los problemas llegan juntos: cura primero lo que te deja a ciegas (la app apagada) y después lo demás.",
        q: (d0 ? corto(d0.nombre) : "Un monito") + " → servidor de " + (a0 ? corto(a0.nombre) : "…"), dur: 4.6, clave: "p:super" });
      return;
    }
    var p = PROBLEMA[e.accion];
    if (!p) return;
    var de = jug(est, e.de), a = jug(est, e.a), mio = e.a === yoN || e.de === yoN, lleno = !vistoP[e.accion] || mio;
    vistoP[e.accion] = true;
    encolar({ tipo: "golpe", clase: "problema", ic: p[0], k: "Problema frecuente", t: p[1], c: p[2], a: e.a, icono: p[0],
      q: (de ? corto(de.nombre) : "Un monito") + " → servidor de " + (a ? corto(a.nombre) : "…"), mini: !lleno, dur: lleno ? 4.2 : 1.4, clave: "p:" + e.accion });
  }
  function deCura(j, f) {
    var c = CURA[f];
    if (!c) return;
    var mio = j.n === yoN, lleno = !vistoC[f] || mio;
    vistoC[f] = true;
    encolar({ tipo: "cura", clase: "cura", ic: c[0], k: "Ema lo contuvo", t: c[1], c: c[2], p: c[3], a: j.n, icono: ICO_FALLA[f],
      q: (mio ? "Tu servidor" : "Servidor de " + corto(j.nombre)) + " · " + NOMBRE[f], mini: !lleno, dur: lleno ? 6 : 1.6, clave: "c:" + f });
  }
  // Unos segundos después de un botón de defensa: si el servidor sigue caído, Ema falla el golpe y se dice por qué.
  function revisarBoton(e) {
    if (!(e.a === yoN || staff) || revisiones[e.a]) return;
    revisiones[e.a] = setTimeout(function () {
      delete revisiones[e.a];
      var j = ultimo && jug(ultimo, e.a), b = BOTON[e.accion];
      if (!j || !b || ultimo.fase !== "defensa" || j.lab !== "listo" || j.salud !== "caido") return;
      var fallas = j.fallas || [], f = tiene(fallas, b[1]) ? b[1] : fallas[0];
      if (!f) return;
      var t = f === b[1] ? "«" + b[0] + "» no bastó" : "«" + b[0] + "» no cura " + (NOMBRE[f] || f);
      encolar({ tipo: "fallo", clase: "fallo", ic: "💫", k: "Ema falló el golpe", t: t, c: PISTA[f] || "", a: j.n, icono: ICO_FALLA[f],
        q: (j.n === yoN ? "Tu servidor" : "Servidor de " + corto(j.nombre)) + " sigue caído", dur: 4.5 });
    }, 7000);
  }
  function deCierre(est) {
    var listos = est.jugadores.filter(function (j) { return j.equipo === "server" && j.lab === "listo"; });
    if (!listos.length) return;
    var caidos = listos.filter(function (j) { return j.salud !== "ok"; });
    if (!caidos.length) {
      encolar({ tipo: "final", clase: "cura", ic: "🏆", k: "Ronda contenida", t: "Ema no dejó pasar ni una", c: "Todos los servidores quedaron en pie. Diagnosticar primero y curar después funciona.", dur: 5 });
      return;
    }
    var cuenta = {}, mas = "", mio = null;
    caidos.forEach(function (j) {
      if (j.n === yoN) mio = j;
      (j.fallas || []).forEach(function (f) { cuenta[f] = (cuenta[f] || 0) + 1; if (!mas || cuenta[f] > cuenta[mas]) mas = f; });
    });
    var foco = mio || caidos[0];
    if (mio && (mio.fallas || []).length) mas = mio.fallas[0];
    var nombres = caidos.slice(0, 3).map(function (j) { return corto(j.nombre); }).join(", ") + (caidos.length > 3 ? " y " + (caidos.length - 3) + " más" : "");
    encolar({ tipo: "final", clase: "fallo", ic: "💫", k: "No se contuvo", t: caidos.length === 1 ? "Quedó 1 servidor caído" : "Quedaron " + caidos.length + " servidores caídos",
      q: nombres + (mas ? " · " + (mio ? "a ti te faltó: " : "lo que más faltó: ") + (NOMBRE[mas] || mas) : ""), c: PISTA[mas] || "", a: foco.n, icono: ICO_FALLA[mas], dur: 6.5 });
  }

  function recordar(est) {
    antes = {};
    est.jugadores.forEach(function (j) { if (j.equipo === "server") antes[j.n] = { lab: j.lab, salud: j.salud, fallas: (j.fallas || []).slice() }; });
    ultimo = est;
  }
  function alEstado(prev, est, nuevos) {
    yoN = est.yo ? est.yo.n : -1; staff = !!est.staff;
    if (!prev) { recordar(est); return; }
    if (est.ronda < prev.ronda || (est.fase === "lobby" && prev.fase !== "lobby")) { vaciar(); siguiente(); recordar(est); return; }   // reiniciaron la arena
    if (est.fase !== prev.fase) {
      if (est.fase === "ataque") {
        vaciar();
        encolar({ tipo: "luna", clase: "fase", ic: "🌕", k: "Cae la noche", t: "El Ozaru crece con la luna", c: "Un problema chiquito que nadie mira se vuelve gigante. Hoy lo soltamos a propósito, para aprender a contenerlo.", dur: 3.6 });
      } else if (est.fase === "defensa") {
        vaciar();
        if (est.sin_cura) encolar({ tipo: "luna", clase: "fase", ic: "🚫", k: "Amanece", t: "Ema está sellado: nadie cura", c: "Lo que cayó, queda caído. En producción también pasa: hay fallas que no se arreglan a tiempo. Lo que te salva es prevenir, no curar.", dur: 3.6 });
        else encolar({ tipo: "ema", clase: "fase", ic: "🌅", k: "Amanece", t: "Ema, el Rey Mono, entra a curar", c: "Primero diagnostica, después cura: pídele a la IA que mire /salud antes de tocar nada.", dur: 3.4 });
      }
    }
    (nuevos || []).forEach(function (e) {
      if (e.tipo === "ataque") deAtaque(est, e);
      else if (e.tipo === "defensa") revisarBoton(e);
      else if (e.tipo === "puntos") deCierre(est);
    });
    est.jugadores.forEach(function (j) {
      var a = antes[j.n];
      if (est.sin_cura || j.equipo !== "server" || !a || a.lab !== "listo" || j.lab !== "listo" || a.salud !== "caido") return;
      var ahora = j.fallas || [];
      if (tiene(ahora, "aula") || tiene(ahora, "sin_lab")) return;
      var ciega = tiene(ahora, "app") || tiene(ahora, "lenta");
      a.fallas.forEach(function (f) { if (!tiene(ahora, f) && !(ciega && SOLO_SALUD[f])) deCura(j, f); });
    });
    recordar(est);
  }

  document.addEventListener("click", function (ev) {
    if (ev.target && ev.target.closest && ev.target.closest("#ficha-x")) siguiente();
  });

  window.Cine = { alEstado: alEstado };
})();
