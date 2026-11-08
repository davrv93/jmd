// juego.js · armazón multijugador de los juegos del curso, montado SOLO sobre endpoints que ya existen:
//
//   sala compartida y tablero → /carrera (unir {avatar}, paso {dist, golpes}, iniciar/reiniciar de staff, GET estado)
//   reflexión final           → /muro (escena = id de la escena del juego)
//
// Toda la lógica del juego corre en el navegador; el servidor solo guarda y reparte el avance de cada uno.
// Cómo se usa la carrera aquí (leído en lms/api/internal/httpapi/live_carrera.go):
//   · dist = puntos del juego (el servidor guarda el mayor valor, así que solo sube); golpes = aprendizajes (errores).
//   · NO se llama a /carrera/fin: ese endpoint sube dist hasta el largo de la pista (840) y rompería los puntos.
//     La ronda dura menos de 60 s, que es cuando el servidor cierra la manga solo.
//   · /carrera/unir solo vale en vestíbulo o al terminar; en «fin» vuelve a crear al jugador en cero, por eso
//     no se llama si ya estás en la lista.
//   · Una sala por lección: cada sesión tiene un solo juego, así que no hay choque.
// Nadie queda fuera: si la ronda ya salió o el instructor no la lanza, se juega «a mi ritmo» con el mismo
// juego, el mismo resultado y la misma fotito. Los errores no restan: muestran por qué y suman a «aprendizajes».
//
//   TWJuego.montar({raiz, segundos, unidad:["ficha","fichas"], meta, tituloGrupo, reglas:[…], pregunta, placeholder,
//                   resultado(puntos, errores) → {resultado, detalle}, crear(zona, api) → {empezar(rng), parar()}})
//   api: punto(n), error(tip), puntos(), errores()
(function () {
  var TW = window.TW;
  var AVATARES = [
    ["llama", "🦙"], ["zorro", "🦊"], ["panda", "🐼"], ["gato", "🐱"], ["buho", "🦉"], ["tortuga", "🐢"],
    ["abeja", "🐝"], ["loro", "🦜"], ["conejo", "🐰"], ["pulpo", "🐙"], ["leon", "🦁"], ["rana", "🐸"],
    ["colibri", "🐦"], ["perro", "🐶"], ["koala", "🐨"], ["pinguino", "🐧"]
  ];
  var EMO = {}; AVATARES.forEach(function (a) { EMO[a[0]] = a[1]; });
  function emoji(id) { return EMO[id] || "🙂"; }

  function rngDe(seed) { // mulberry32: mismo mazo para todos en la misma ronda
    var a = (seed >>> 0) || 1;
    return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  function leerG(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function guardarG(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  function montar(op) {
    var el = TW.el, raiz = op.raiz, seg = op.segundos || 45;
    var uni = op.unidad || ["punto", "puntos"];
    function u(n) { return n === 1 ? uni[0] : uni[1]; }

    // ---------- Estructura ----------
    raiz.classList.add("tj");
    var main = el("div", "tj-main"), lado = el("aside", "tj-grupo");
    raiz.appendChild(main); raiz.appendChild(lado);

    var hud = el("div", "tj-hud");
    var hAv = el("span", "av", "🙂"), hNom = el("span", "nom", "Tú"), hModo = el("span", "modo", "");
    var reloj = el("div", "tj-reloj"); reloj.appendChild(el("i"));
    var hPts = el("span", "pts", "0");
    hud.appendChild(hAv); hud.appendChild(hNom); hud.appendChild(hModo); hud.appendChild(reloj); hud.appendChild(hPts);
    main.appendChild(hud);

    // vestíbulo
    var lobby = el("section", "tj-panel");
    lobby.appendChild(el("h3", "", "1. Elige tu avatar"));
    var avs = el("div", "tj-avs"); avs.setAttribute("role", "group"); avs.setAttribute("aria-label", "Avatares");
    var avatar = leerG("tw-avatar", "") || AVATARES[Math.floor(Math.random() * AVATARES.length)][0];
    AVATARES.forEach(function (a) {
      var b = el("button", "tj-av", a[1]); b.type = "button"; b.setAttribute("aria-label", a[0]); b.setAttribute("aria-pressed", a[0] === avatar ? "true" : "false");
      b.addEventListener("click", function () { avatar = a[0]; guardarG("tw-avatar", avatar); TW.$$(".tj-av", avs).forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); }); pintarHud(); });
      avs.appendChild(b);
    });
    lobby.appendChild(avs);
    lobby.appendChild(el("h3", "", "2. Cómo se juega"));
    var reglas = el("ul", "tj-reglas"); (op.reglas || []).forEach(function (r) { var li = el("li"); li.innerHTML = r; reglas.appendChild(li); }); lobby.appendChild(reglas);
    var fila = el("div", "tw-btns");
    var bUnir = el("button", "tw-btn", "Entrar a la sala del grupo"); bUnir.type = "button";
    var bSolo = el("button", "tw-btn sec", "Jugar ahora a mi ritmo"); bSolo.type = "button";
    fila.appendChild(bUnir); fila.appendChild(bSolo); lobby.appendChild(fila);
    var msg = el("p", "tj-msg", "Entra a la sala y espera la salida del instructor, o juega a tu ritmo cuando quieras.");
    lobby.appendChild(msg);
    var staff = el("div", "tj-staff"); staff.hidden = true;
    staff.appendChild(el("p", "tw-nota", "Solo lo ves tú (instructor): la salida es para todos a la vez."));
    var sf = el("div", "tw-btns");
    var bIni = el("button", "tw-btn", "▶ Dar la salida a todos"); bIni.type = "button";
    var bRei = el("button", "tw-btn sec peq", "Vaciar la sala"); bRei.type = "button";
    sf.appendChild(bIni); sf.appendChild(bRei); staff.appendChild(sf); lobby.appendChild(staff);
    main.appendChild(lobby);

    // juego
    var juego = el("section", "tj-panel"); juego.hidden = true;
    var zona = el("div", "tj-zona"); juego.appendChild(zona);
    var cuenta = el("div", "tj-cuenta"); cuenta.hidden = true; juego.appendChild(cuenta);
    main.appendChild(juego);

    // resultado
    var fin = el("section", "tj-panel"); fin.hidden = true;
    var finCols = el("div", "tj-fin-cols");
    var fIzq = el("div", "tw-pila"), fDer = el("div", "tw-pila");
    var fGrande = el("div", "tj-grande", "0");
    var fMejor = el("p", "tw-nota", "");
    var fAprT = el("h3", "", "Lo que aprendiste en esta ronda");
    var fApr = el("ul", "tj-apr");
    var bOtra = el("button", "tw-btn sec peq", "↻ Jugar otra vez a mi ritmo"); bOtra.type = "button";
    var bVolver = el("button", "tw-btn sec peq", "← Volver a la sala"); bVolver.type = "button";
    var fBtns = el("div", "tw-btns"); fBtns.appendChild(bOtra); fBtns.appendChild(bVolver);
    fIzq.appendChild(fGrande); fIzq.appendChild(fMejor); fIzq.appendChild(fAprT); fIzq.appendChild(fApr); fIzq.appendChild(fBtns);
    fDer.appendChild(el("h3", "", op.pregunta || "¿Qué te llevas?"));
    var muroCaja = el("div"); fDer.appendChild(muroCaja);
    fDer.appendChild(el("h3", "", "Guarda la fotito"));
    var nomFoto = el("input", "tw-in"); nomFoto.placeholder = "Tu nombre en la fotito"; nomFoto.maxLength = 40; nomFoto.setAttribute("aria-label", "Tu nombre en la fotito");
    fDer.appendChild(nomFoto);
    var fotoCaja = el("div"); fDer.appendChild(fotoCaja);
    finCols.appendChild(fIzq); finCols.appendChild(fDer); fin.appendChild(finCols);
    main.appendChild(fin);

    // tablero del grupo
    lado.appendChild(el("h3", "", op.tituloGrupo || "Entre todos"));
    var gTot = el("p", "tj-total", "0");
    var gMeta = el("div", "tj-meta"); gMeta.appendChild(el("i"));
    var gMetaTxt = el("p", "tj-meta-txt", "");
    var gLista = el("ul", "tj-lista");
    lado.appendChild(gTot); lado.appendChild(gMeta); lado.appendChild(gMetaTxt); lado.appendChild(gLista);

    // ---------- Estado ----------
    var yo = null, enSala = false, ronda = null, salidaJugada = 0, ultimo = null, off = 0;
    var puntos = 0, errores = 0, tips = [], sucio = false, mejor = TW.leer("juego-mejor", 0);
    var api = {
      punto: function (n) { puntos += (n == null ? 1 : n); sucio = true; pintarHud(); pintarGrupo(); },
      error: function (tip) { errores++; sucio = true; if (tip && tips.indexOf(tip) < 0) tips.push(tip); },
      puntos: function () { return puntos; }, errores: function () { return errores; }
    };
    var motor = op.crear(zona, api);

    function pintarHud() {
      hAv.textContent = emoji(avatar);
      hNom.textContent = yo && yo.corto ? yo.corto : "Tú";
      hModo.textContent = ronda ? (ronda.sala ? "sala del grupo" : "a mi ritmo") : (enSala ? "en la sala" : "");
      hPts.innerHTML = puntos + " <small>" + u(puntos) + "</small>";
    }
    function lista() {
      var cs = (ultimo && ultimo.corredores) || [];
      var out = cs.map(function (c) { return { id: c.id, nombre: TW.corto(c.nombre) || "Alumno", avatar: c.avatar, p: Math.round(+c.dist || 0) }; });
      if (yo && ronda && ronda.sala) out.forEach(function (c) { if (c.id === yo.id) c.p = Math.max(c.p, puntos); });
      out.sort(function (a, b) { return b.p - a.p || a.nombre.localeCompare(b.nombre); });
      return out;
    }
    function pintarGrupo() {
      var l = lista(), tot = 0;
      l.forEach(function (c) { tot += c.p; });
      var meta = Math.max(1, l.length) * (op.meta || 10);
      gTot.innerHTML = tot + " <small>" + u(tot) + "</small>";
      gMeta.firstChild.style.width = Math.min(100, Math.round(tot / meta * 100)) + "%";
      gMetaTxt.textContent = l.length ? l.length + (l.length === 1 ? " persona" : " personas") + " · meta: " + meta + " " + u(meta) + " (" + (op.meta || 10) + " por persona)" + (tot >= meta ? " ✓ ¡lo logramos!" : ".") : "Cuando entren a la sala, aquí aparece cada uno con su avance.";
      gLista.textContent = "";
      if (!l.length) { gLista.appendChild(el("li", "vacio", "Aún no hay nadie en la sala.")); return; }
      l.forEach(function (c) {
        var li = el("li", yo && c.id === yo.id ? "yo" : "");
        li.appendChild(el("span", "a", emoji(c.avatar))); li.appendChild(el("span", "n", yo && c.id === yo.id ? "Tú" : c.nombre)); li.appendChild(el("span", "p", String(c.p)));
        gLista.appendChild(li);
      });
    }
    function ver(cual) { lobby.hidden = cual !== "lobby"; juego.hidden = cual !== "juego"; fin.hidden = cual !== "fin"; }

    // ---------- Ronda ----------
    function empezar(sala, salidaLocal, seed) {
      if (ronda && ronda.vivo) { ronda.vivo = false; clearInterval(ronda.t); motor.parar(); }
      puntos = 0; errores = 0; tips = []; sucio = false;
      ronda = { sala: sala, ini: salidaLocal, fin: salidaLocal + seg * 1000, vivo: true, empezo: false };
      ver("juego"); pintarHud();
      var rng = rngDe(seed || Date.now());
      ronda.t = setInterval(function () {
        var ahora = Date.now();
        if (!ronda.empezo) {
          var falta = ronda.ini - ahora;
          if (falta > 0) { cuenta.hidden = false; cuenta.innerHTML = Math.ceil(falta / 1000) + "<small>" + (sala ? "salimos todos juntos" : "¡prepárate!") + "</small>"; reloj.firstChild.style.width = "100%"; return; }
          ronda.empezo = true; cuenta.hidden = true; motor.empezar(rng);
        }
        var resto = Math.max(0, ronda.fin - ahora);
        reloj.firstChild.style.width = (resto / (seg * 1000) * 100) + "%";
        if (resto <= 0) terminar();
      }, 200);
    }
    function terminar() {
      if (!ronda || !ronda.vivo) return;
      ronda.vivo = false; clearInterval(ronda.t); motor.parar();
      if (ronda.sala) enviar(true);
      if (puntos > mejor) { mejor = puntos; TW.guardar("juego-mejor", mejor); }
      var r = op.resultado ? op.resultado(puntos, errores) : { resultado: puntos + " " + u(puntos), detalle: "" };
      fGrande.innerHTML = puntos + " <small>" + u(puntos) + "</small>";
      fMejor.textContent = "Tu mejor marca: " + mejor + " " + u(mejor) + (errores ? " · " + errores + (errores === 1 ? " aprendizaje" : " aprendizajes") : " · sin errores") + (ronda.sala ? " · ronda del grupo" : " · a tu ritmo") + ".";
      fApr.textContent = "";
      if (!tips.length) fApr.appendChild(el("li", "", "No te equivocaste en esta ronda. Prueba otra vez para batir tu marca."));
      tips.slice(0, 5).forEach(function (t) { var li = el("li"); li.innerHTML = t; fApr.appendChild(li); });
      var prev = TW.leer("juego", {});
      TW.guardar("juego", { puntos: puntos, errores: errores, mejor: mejor, avatar: avatar, resultado: r.resultado, detalle: r.detalle, reflexion: prev.reflexion || "" });
      ver("fin");
      pintarHud();
    }
    function enviar(forzar) {
      if (!ronda || !ronda.sala || (!sucio && !forzar)) return;
      sucio = false;
      TW.pedir("/carrera/paso", { dist: puntos, golpes: errores });
    }
    setInterval(function () { if (ronda && ronda.vivo && ronda.empezo) enviar(false); }, 1200);

    // ---------- Sala ----------
    function sondear() {
      TW.pedir("/carrera").then(function (r) {
        if (!r.ok) { if (r.status && r.status !== 0) msg.textContent = "La sala del grupo no está disponible ahora: juega a tu ritmo."; return; }
        var d = r.datos; ultimo = d;
        if (d.ahora_ms) off = d.ahora_ms - Date.now();
        var esStaff = !!d.staff || (yo && yo.staff);
        staff.hidden = !esStaff;
        var dentro = !!(yo && (d.corredores || []).some(function (c) { return c.id === yo.id; }));
        if (dentro && !enSala) { enSala = true; bUnir.textContent = "Ya estás en la sala ✓"; bUnir.disabled = true; }
        if (!dentro && enSala && d.estado === "lobby") { enSala = false; bUnir.textContent = "Entrar a la sala del grupo"; bUnir.disabled = false; }
        var activa = d.estado === "cuenta" || d.estado === "corre";
        if (activa && dentro && d.salida_ms && d.salida_ms !== salidaJugada) {
          var local = d.salida_ms - off;
          if (Date.now() < local + seg * 1000 - 3000) { salidaJugada = d.salida_ms; empezar(true, local, d.seed); }
        }
        if (esStaff && activa) {
          var quedan = Math.max(0, Math.ceil((d.salida_ms + seg * 1000 - d.ahora_ms) / 1000));
          msg.innerHTML = d.estado === "cuenta" ? "<b>Salida en " + Math.ceil(d.faltan_ms / 1000) + " s…</b>" : (quedan ? "<b>Ronda en curso:</b> quedan " + quedan + " s. Mira el tablero del grupo." : "<b>Ronda terminada.</b> Puedes dar otra salida (los puntos vuelven a cero) o pasar a la siguiente escena.");
        } else if (!ronda || !ronda.vivo) {
          if (activa && !dentro) msg.innerHTML = "<b>La ronda del grupo ya salió.</b> Juega a tu ritmo y entra a la sala para la siguiente.";
          else if (enSala && !activa) msg.innerHTML = "<b>Estás en la sala.</b> Cuando el instructor dé la salida, empiezas con todos. Mientras, puedes practicar a tu ritmo.";
        }
        pintarGrupo();
      });
    }
    bUnir.addEventListener("click", function () {
      bUnir.disabled = true;
      TW.pedir("/carrera/unir", { avatar: avatar }).then(function (r) {
        if (r.ok) { enSala = true; bUnir.textContent = "Ya estás en la sala ✓"; msg.innerHTML = "<b>Estás en la sala.</b> Cuando el instructor dé la salida, empiezas con todos."; sondear(); return; }
        bUnir.disabled = false;
        msg.innerHTML = r.status === 409 ? "<b>La ronda ya salió.</b> Juega a tu ritmo; entras en la siguiente." : "No pude entrar a la sala (¿la clase está en vivo?). Puedes jugar a tu ritmo.";
      });
    });
    bSolo.addEventListener("click", function () { empezar(false, Date.now() + 3000, Date.now()); });
    bOtra.addEventListener("click", function () { empezar(false, Date.now() + 3000, Date.now()); });
    bVolver.addEventListener("click", function () { ver("lobby"); });
    bIni.addEventListener("click", function () {
      bIni.disabled = true;
      TW.pedir("/carrera/iniciar", {}).then(function (r) { bIni.disabled = false; msg.textContent = r.ok ? "Salida en 4 segundos para " + (r.datos.anotados || 0) + " personas." : "No se pudo dar la salida."; sondear(); });
    });
    var seguro = 0;
    bRei.addEventListener("click", function () {
      if (Date.now() - seguro > 3000) { seguro = Date.now(); bRei.textContent = "¿Seguro? Toca otra vez"; setTimeout(function () { bRei.textContent = "Vaciar la sala"; }, 3000); return; }
      seguro = 0; bRei.textContent = "Vaciar la sala";
      TW.pedir("/carrera/reiniciar", {}).then(function () { enSala = false; bUnir.disabled = false; bUnir.textContent = "Entrar a la sala del grupo"; sondear(); });
    });

    // ---------- Reflexión y fotito ----------
    var muro = TW.muro(muroCaja, { escena: TW.escena, placeholder: op.placeholder || "Una línea, con tus palabras", alPublicar: function (t) { var g = TW.leer("juego", {}); g.reflexion = t; TW.guardar("juego", g); } });
    TWFoto.montar(fotoCaja, function () {
      var g = TW.leer("juego", {});
      return { nombre: nomFoto.value.trim() || (yo && yo.name) || "Mi nombre", avatar: emoji(avatar), resultado: g.resultado || (puntos + " " + u(puntos)), detalle: g.detalle || "", reflexion: muro.texto() || g.reflexion || "" };
    });

    TW.yo().then(function (y) { yo = y; if (y && !nomFoto.value) nomFoto.value = y.name || ""; if (y && y.staff) staff.hidden = false; pintarHud(); sondear(); });
    pintarHud(); pintarGrupo(); ver("lobby");
    setInterval(sondear, 1500);
    return { api: api, terminar: terminar };
  }

  window.TWJuego = { montar: montar, emoji: emoji, AVATARES: AVATARES };
})();
