/* terminal.js — la «terminal de juguete» de la Arena del monito (lc-01, escena 02-arena).
   No ejecuta ningún comando: lee lo que el jugador escribe (comandos tipo shell o español llano), detecta
   la intención y hace LO MISMO que los botones, con las mismas funciones de la escena (window.__arena.enviar,
   .elegir y .copiar) y las mismas reglas (turno, 2 ataques por ronda, blanco elegido).
   Detección en dos capas:
     1. Reglas locales (al instante, sin red): palabras clave por acción + servidor por número o por nombre.
     2. Solo si las reglas no deciden: POST ../../entender (IA del LMS, con tope diario). Lo que la IA entiende
        NUNCA se ejecuta solo: se muestra y el jugador confirma con Enter o «s».
   Si este archivo no carga, la escena sigue igual: el botón «Terminal» nace oculto y solo lo enciende este script. */
(function () {
  "use strict";
  var A = window.__arena;
  var $ = function (id) { return document.getElementById(id); };
  var caja = $("term"), sal = $("term-sal"), inp = $("term-in"), btn = $("term-btn"), ps = $("term-ps");
  var abrir2 = $("term-abrir");
  if (!A || !A.enviar || !caja || !sal || !inp || !btn) return;

  var MAX_LINEAS = 50, MAX_IA = 10, ESPERA_IA = 30000;
  var hist = [], hi = 0, pend = null, iaCtl = null, iaReloj = 0, iaUsos = 0, faseVista = "", abierta = false;
  var REDUCIDO = false;
  try { REDUCIDO = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}
  function guarda(v) { try { if (v === undefined) return localStorage.getItem("monito-term") || ""; localStorage.setItem("monito-term", v); } catch (e) { return ""; } }

  /* ---------- salida ---------- */
  function linea(t, cls) {
    var p = document.createElement("p");
    if (cls) p.className = cls;
    p.textContent = t;
    sal.appendChild(p);
    while (sal.childNodes.length > MAX_LINEAS) sal.removeChild(sal.firstChild);
    sal.scrollTop = sal.scrollHeight;
    return p;
  }
  function lineas(arr, cls) { arr.forEach(function (t) { linea(t, cls); }); }

  /* ---------- estado de la escena ---------- */
  function est() { return A.estado(); }
  function yo() { var e = est(); return e && e.yo && e.yo.equipo ? e.yo : null; }
  function equipo() { var y = yo(); return y ? y.equipo : ""; }
  function jug(n) { var e = est(); if (!e) return null; for (var i = 0; i < e.jugadores.length; i++) if (e.jugadores[i].n === n) return e.jugadores[i]; return null; }
  function servidores() { var e = est(); return e ? e.jugadores.filter(function (j) { return j.equipo === "server"; }) : []; }
  function num(j) { return j.n + 1; } // el número que ve el jugador (n empieza en 0)
  function ataque(k) { for (var i = 0; i < A.ATAQUES.length; i++) if (A.ATAQUES[i].k === k) return A.ATAQUES[i]; return null; }
  function falla(f) { return A.FALLA[f] || ["❓", f, ""]; }
  function etiqueta(j) { return num(j) + " " + j.nombre; }
  function saludDe(j) {
    if (j.lab !== "listo") return "⚙️ arrancando";
    if (j.salud === "ok") return "✅ en pie";
    if (j.salud === "caido") return "❌ caído: " + (j.fallas || []).map(function (f) { return falla(f)[0] + " " + f; }).join(", ");
    return "… sin revisar todavía";
  }
  function pintarPs() {
    var eq = equipo() || "arena";
    ps.textContent = "";
    var u = document.createElement("span"); u.className = "term-u"; u.textContent = "monito@";
    ps.appendChild(u); ps.appendChild(document.createTextNode(eq + ":~$"));
    $("term-tit").textContent = "monito@" + eq;
  }
  function promptTxt() { return "monito@" + (equipo() || "arena") + ":~$ "; }

  /* ---------- texto ---------- */
  function norm(s) {
    s = String(s || "").toLowerCase();
    try { s = s.normalize("NFD").replace(/[̀-ͯ]/g, ""); } catch (e) {}
    return s.replace(/[¿?¡!"«»“”',;()]+/g, " ").replace(/\s+/g, " ").trim();
  }
  function lev(a, b) {
    if (a === b) return 0;
    if (Math.abs(a.length - b.length) > 1) return 2;
    var prev = [], i, j;
    for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) {
      var cur = [i];
      for (j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1));
      prev = cur;
    }
    return prev[b.length];
  }
  // Palabras del juego que no cuentan como nombre de nadie (por si alguien se llama «Monito»).
  var NO_NOMBRE = " monito server servidor servidores app base disco clave datos sesion admin tumba del los las con por para que una uno the todo todos calle azar ";
  var ANTES_DE_NOMBRE = " de del a al contra para sobre server servidor srv ";
  // ¿La palabra es del vocabulario de órdenes (mata, llena, base…)? Entonces no se toma como nombre de nadie, salvo tras «de», «a»…
  function esOrden(w) { return R_TUMBA.concat(R_SERVER).some(function (r) { return r.slice(1).some(function (x) { return x[0].test(w); }); }); }

  // ¿A qué servidor se refiere? → {n} | {varios:[jugadores]} | {noHay:numero} | null
  function objetivo(t) {
    var srv = servidores(), s = " " + t + " ", nums = [], m, i;
    s = s.replace(/\d+\.\d+\.\d+\.\d+(:\d+)?/g, " ").replace(/:\d+/g, " ").replace(/\s-\w+/g, " ").replace(/\bsleep \d+/g, " ").replace(/\/\S*/g, " ");
    var re = /(?:servidor|server|srv|numero|num|nro|maquina|#|\bdel|\bal|\bel|\ba)\s*#?\s*(\d{1,2})(?!\d)/g;
    while ((m = re.exec(s))) nums.push(Number(m[1]));
    if ((m = /^\s*#?(\d{1,2})\s*$/.exec(s)) || (m = /\s#?(\d{1,2})\s*$/.exec(s))) nums.push(Number(m[1]));
    nums = nums.filter(function (x, k) { return nums.indexOf(x) === k; });
    var porNum = [], noHay = null;
    nums.forEach(function (x) { var j = null; srv.forEach(function (q) { if (num(q) === x) j = q; }); if (j) porNum.push(j); else noHay = x; });

    var palabras = s.split(/[^a-z0-9]+/).filter(Boolean), mejor = 0, porNombre = [], tras = {};
    palabras.forEach(function (w, k) { if (k && ANTES_DE_NOMBRE.indexOf(" " + palabras[k - 1] + " ") >= 0) tras[w] = 1; });
    srv.forEach(function (j) {
      var nombre = norm(j.nombre), fichas = nombre.split(" ").filter(function (x) { return x.length >= 3 && NO_NOMBRE.indexOf(" " + x + " ") < 0; }), p = 0;
      if (fichas.length && nombre.length >= 3 && s.indexOf(" " + nombre + " ") >= 0) p = 100;
      else fichas.forEach(function (f) {
        // Nombre exacto tras «de», «a», «al»… pesa más; suelto, solo si no es una palabra de órdenes; parecido (Luiz por Luis), solo tras «de», «a»…
        if (palabras.indexOf(f) >= 0) p += tras[f] ? 20 : esOrden(f) ? 0 : 10;
        else if (f.length >= 4) for (i = 0; i < palabras.length; i++) { var w = palabras[i]; if (tras[w] && w.length >= 4 && NO_NOMBRE.indexOf(" " + w + " ") < 0 && !esOrden(w) && lev(f, w) <= 1) { p += 5; break; } }
      });
      if (p > mejor) { mejor = p; porNombre = [j]; } else if (p && p === mejor) porNombre.push(j);
    });
    var todos = porNum.slice();
    porNombre.forEach(function (j) { if (todos.indexOf(j) < 0) todos.push(j); });
    if (todos.length === 1) return { n: todos[0].n };
    if (todos.length > 1) return { varios: todos };
    if (noHay !== null) return { noHay: noHay };
    return null;
  }

  /* ---------- reglas: [acción, [expresión, peso]…] ---------- */
  var R_TUMBA = [
    ["apagar", [/\bapagon|\bp?kill(all)?\b|\bapag|\bmata|\bmato\b/, 3], [/shutdown|poweroff|\bhalt\b|\bstop\b|\bdeten|desenchuf|desconect/, 3], [/\btumba|\bbota\b|\bbaja(r)? (la |el )?(app|servidor)|\bcae|\bcaig/, 2]],
    ["disco", [/llenadisco|tragadisco|\bdisco\b|\bdisk\b/, 3], [/\bllena|\brellen|sin espacio|\bespacio\b|\bdd\b|fallocate/, 1.5]],
    ["base", [/borrabase|adiosbase|\bbase\b|\bbd\b|\bdb\b|tienda\.db|sqlite|\bdrop\b|\btabla/, 3], [/\brm\b|\bborra|\belimin/, 1]],
    ["atascar", [/\bmelaza|atasc|\blent|tortuga|\bsleep\b|cuelg|colga|congel|freez|\blag\b|\btraba|ralenti|\bslow/, 3]],
    ["fuga", [/chismoso|\bfuga|filtr|\bleak|exfiltr|\bscp\b|\bpublic|\bexpon|\brob(a|ar|o) /, 3], [/sac(a|ar) (los |sus )?datos|datos a la calle/, 3]],
    ["clones", [/multimono|clonador|\bclon|\bfork|\bbomb|jutsu|multiplic|\bprocesos|naruto|kage|:\|:/, 3]],
    ["pesados", [/\bmudanza|pesad|gigante|enorme|\bupload|\bfotos?\b/, 3], [/sub(e|ir|o) (unos |muchos |los )?archivos|archivos grandes/, 3]],
    ["formulario", [/basurero|formulario|\bform\b|basura|\bspam|\binsert\b|inyec/, 3], [/datos (malos|raros|falsos|basura)/, 3]],
    ["sesion", [/puertaabierta|puerta\.sh|\bsesion|\bsession|\bcookie|\btoken|puerta abierta/, 3]],
    ["clave", [/clave123|\bclave|contrasena|password|passwd|123456|credencial/, 3]]
  ];
  var R_SERVER = [
    ["reiniciar", [/\brestart|reinici|\breboot/, 3], [/\barranc|\blevant|\bstart\b|\bprend|\benciend|\brevive|resucit|\bup\b/, 3], [/bun .*servidor|arrancar\.sh/, 3]],
    ["limpiar", [/\blimpi|\bliber|\bvaci/, 3], [/\brm\b.*(tmp|relleno)|borra\w* .*(relleno|tmp|basura|pesad)/, 3], [/\bdisco\b/, 1]],
    ["df", [/^(df|du)\b/, 4], [/cuanto (espacio|disco)|espacio libre|\bespacio\b/, 2.5]],
    ["salud", [/\bcurl\b|\bwget\b|\bping\b/, 3], [/\bsalud|health|\b7070\b/, 3], [/como (esta|anda|va)\b|esta (viv|san|bien|caid)/, 2]],
    ["reinstalar", [/reinstal|\binstal|\bprepara(r)?\b|\bsetup\b/, 4]],
    ["pr_base", [/\bbase\b|\bbd\b|\bdb\b|tienda\.db|sqlite/, 2], [/restaur|recuper|respaldo|backup|restore/, 3]],
    ["pr_lenta", [/\blent|atasc|tortuga|destrab|demora|timeout|\blag\b|cuelg|colgad|congel/, 3]],
    ["pr_diag", [/diagnos|\bcura|arregl|\brepar|\bfix|\bsana|deepseek|harness|\bskill|defiend|defend|proteg|ayudame/, 2]],
    ["nr_fuga", [/\bfuga|filtr|\bpublico|\bleak/, 3]],
    ["nr_clones", [/\bclon|\bfork|\bp?kill\b|\bprocesos/, 2]],
    ["nr_datos", [/formulario|productos|datos (raros|basura|malos|falsos)/, 3]],
    ["nr_sesion", [/\bsesion|\bsession/, 3]],
    ["nr_clave", [/\bclave|contrasena|password|passwd/, 3]]
  ];
  var NOMBRE_DEF = {
    reiniciar: "🩹 Reiniciar la app de tu servidor", limpiar: "🧹 Limpiar el disco de tu servidor", reinstalar: "↻ Arrancar de nuevo tu servidor (reinstalar el laboratorio)",
    salud: "ver la salud de tu servidor (/salud)", df: "ver el disco de tu servidor", estado: "ver el estado de la arena", ayuda: "ver la ayuda"
  };
  // Devuelve las acciones con más puntos (una = decidido; varias = empate; ninguna = las reglas no saben).
  function puntuar(reglas, t) {
    var mejor = 0, quienes = [];
    reglas.forEach(function (r) {
      var p = 0;
      for (var i = 1; i < r.length; i++) if (r[i][0].test(t)) p += r[i][1];
      if (p > mejor) { mejor = p; quienes = [r[0]]; } else if (p && p === mejor) quienes.push(r[0]);
    });
    return quienes;
  }

  /* ---------- lo que la terminal muestra ---------- */
  function ayuda() {
    var eq = equipo();
    linea("Soy una terminal de juguete: no ejecuto comandos de verdad. Leo lo que quieres y aprieto el botón del juego por ti.", "dim");
    if (!eq) { lineas(["Primero elige equipo. Escribe:", "  tumba     para atacar con el equipo Monito Tumba Server", "  server    para cuidar un servidor con el equipo Monito Server", "También: status · clear · salir"]); return; }
    if (eq === "tumba") {
      lineas(["ATACAR (en tu turno, " + (est().ataques_max || 2) + " por ronda): di el ataque y a quién.",
        "  apagar      kill app en el server de Ana",
        "  disco       llena el disco del servidor 2",
        "  base        rm -rf la base de datos de Luis",
        "  atascar     pon lenta la app del 3",
        "  fuga        filtra los datos de Ana",
        "  clones      fork bomb · ataca a Carlos con clones",
        "  pesados     sube archivos pesados al 3",
        "  formulario  llena de basura el formulario de Luis",
        "  sesion      deja la sesión abierta en el 2",
        "  clave       ponle clave débil a Ana",
        "KERNEL PANIC (2 por partida, 1 por ronda, pide tus 2 ataques): kernel panic · tumba a todos",
        "SCRIPTS DEL MONO (de juguete, hacen lo mismo que los ataques): sh <script> al <número o nombre>",
        "  apagon.sh · llenadisco.sh · borrabase.sh · melaza.sh · chismoso.sh",
        "  multimono.sh · mudanza.sh · basurero.sh · puertaabierta.sh · clave123.sh",
        "  ejemplo:  sh multimono.sh al 3   ·   bash borrabase.sh a Luis   ·   sh apagon.sh al azar",
        "¿A quién? Su número (míralo con ls), su nombre o «al azar». Si no dices, uso tu blanco elegido.",
        "VER: status o ls · ayuda · clear · salir"]);
    } else {
      lineas(["CUIDAR TU SERVIDOR (en tu turno de defensa):",
        "  reiniciar   systemctl restart app · reinicia mi app",
        "  limpiar     limpia el disco · rm /tmp/relleno",
        "ESCUDO (mientras te atacan, 1 vez por ronda, dura poco): cierra conexiones · ufw deny · firewall",
        "VER (cuando quieras):",
        "  curl /salud · df -h · status o ls",
        "CON DEEPSEEK HARNESS (te copio el prompt, se cura en tu aula):",
        "  restaura la base · desatasca la app · diagnostica mi servidor",
        "  reinstalar  solo si tu servidor no arrancó",
        "Y también: ayuda · clear · salir"]);
    }
  }
  function estado() {
    var e = est(); if (!e) { linea("Todavía no llega el estado de la arena. Prueba en un segundo.", "mal"); return; }
    var fases = { lobby: "eligiendo equipos", ataque: "ATAQUE (ataca Tumba Server)", defensa: "DEFENSA (cura Server)", marcador: "marcador" };
    var seg = (e.fase === "ataque" || e.fase === "defensa") ? " · quedan ~" + Math.ceil((e.faltan_ms || 0) / 1000) + " s" : "";
    linea((e.ronda ? "Ronda " + e.ronda + " · " : "") + "turno: " + (fases[e.fase] || e.fase) + seg + " · Tumba " + e.tumba + " – Server " + e.server, "ent");
    var srv = servidores(), monos = e.jugadores.filter(function (j) { return j.equipo === "tumba"; });
    linea("SERVIDORES" + (srv.length ? "" : ": nadie defiende todavía."));
    srv.forEach(function (j) { linea("  " + (num(j) < 10 ? " " : "") + num(j) + "  " + j.nombre + (e.yo && e.yo.n === j.n ? " (tú)" : "") + " · " + saludDe(j) + " · " + j.puntos + " pts"); });
    linea("MONITOS: " + (monos.map(function (j) { return etiqueta(j) + (e.yo && e.yo.n === j.n ? " (tú)" : ""); }).join(", ") || "nadie todavía."));
    var y = yo();
    if (y && y.equipo === "tumba") { var b = A.blanco(), jb = b !== null ? jug(b) : null; linea("Tú: ataques usados " + (y.ataques || 0) + "/" + e.ataques_max + " · blanco: " + (jb ? etiqueta(jb) : "ninguno"), "dim"); }
    else if (!y) linea("Tú: todavía sin equipo (escribe tumba o server).", "dim");
  }
  function salud() {
    var y = yo(); if (!y || y.equipo !== "server") { estado(); return; }
    if (y.lab !== "listo") { linea("Tu servidor todavía está arrancando: /salud aún no contesta.", "dim"); return; }
    var f = y.fallas || [];
    if (y.salud !== "ok" && y.salud !== "caido") { linea("El vigía todavía no revisa tu servidor. Prueba en unos segundos.", "dim"); return; }
    if (f.indexOf("app") >= 0) linea("curl: (7) no pude conectar con 127.0.0.1:7070 — la app está apagada", "mal");
    else linea("HTTP " + (y.salud === "ok" ? "200" : "503") + "  " + JSON.stringify({ ok: y.salud === "ok", fallas: f }), y.salud === "ok" ? "ok" : "mal");
    var pista = { app: "escribe: reinicia la app", disco: "escribe: limpia el disco", base: "escribe: restaura la base (te copio el prompt)", lenta: "escribe: desatasca la app (te copio el prompt)" };
    f.forEach(function (x) { var d = falla(x); linea("  " + d[0] + " " + d[1] + " → " + (pista[x] || d[2])); });
    if (y.salud === "ok") linea("  ✅ Tu servidor está en pie.", "ok");
    linea("(es lo último que vio el vigía de la arena en tu aula, hace unos segundos)", "dim");
  }
  function disco() {
    var y = yo(); if (!y || y.equipo !== "server") { estado(); return; }
    var lleno = (y.fallas || []).indexOf("disco") >= 0;
    lineas(["Disco de la tienda   Cupo    Estado", "/tmp                 64 MB   " + (lleno ? "LLENO (quedan menos de 8 MB)" : "con espacio")], lleno ? "mal" : "ok");
    linea(lleno ? "Escribe: limpia el disco. Si no basta, pídele a DeepSeek Harness que mire qué archivos pesan más." : "Ojo: el df de verdad no muestra este cupo; lo dice /salud en libre_mb.", "dim");
  }

  /* ---------- acciones: las mismas llamadas que los botones ---------- */
  function ocupadoTxt() { linea("Espera un segundo: todavía estoy enviando lo anterior. Vuelve a escribirlo.", "mal"); }
  function unir(eq) {
    if (yo()) { linea("Ya estás en el equipo " + (equipo() === "tumba" ? "Tumba Server" : "Server") + ". El cambio de equipo lo hace el profe.", "mal"); return; }
    linea("→ entendí: unirte al equipo " + (eq === "tumba" ? "🐒 Monito Tumba Server" : "🛡️ Monito Server"), "ent");
    var okTxt = eq === "server" ? "¡Bienvenido al equipo Server! Tu servidor ya está arrancando." : "¡Bienvenido al equipo Tumba Server!";
    if (!A.enviar({ accion: "unir", equipo: eq }, okTxt, function (ok, msg) { linea(ok ? msg : "✋ " + msg, ok ? "ok" : "mal"); pintarPs(); if (ok) linea("Escribe ayuda para ver lo que entiendo.", "dim"); })) ocupadoTxt();
  }
  function listaServidores() { return servidores().filter(function (j) { return j.lab === "listo"; }).map(etiqueta).join(" · "); }
  // sinDueno: el jugador nombró a alguien que no es un servidor («a Carlos»): se pregunta en vez de usar el blanco.
  function atacar(k, n, sinDueno) {
    var e = est(), y = yo(), a = ataque(k);
    if (!a) return;
    if (!y || y.equipo !== "tumba") { linea("✋ Solo el equipo Tumba Server ataca.", "mal"); return; }
    var listos = servidores().filter(function (j) { return j.lab === "listo"; });
    if ((n === undefined || n === null) && !sinDueno) {
      if (A.blanco() !== null && jug(A.blanco())) n = A.blanco();
      else if (listos.length === 1) n = listos[0].n;
    }
    var j = (n === undefined || n === null) ? null : jug(n);
    linea("→ entendí: " + a.ic + " " + a.t + (j ? " → servidor " + etiqueta(j) : ""), "ent");
    if (e.fase !== "ataque") { linea("✋ No es tu turno: " + (e.fase === "defensa" ? "ahora defiende el equipo Server." : "espera a que el profe abra la ronda.") + " No envié nada.", "mal"); return; }
    var quedan = e.ataques_max - (y.ataques || 0);
    if (quedan <= 0) { linea("✋ Ya usaste tus " + e.ataques_max + " ataques de esta ronda. No envié nada.", "mal"); return; }
    if (!j) {
      if (!listos.length) { linea("✋ Todavía no hay servidores listos para atacar.", "mal"); return; }
      pend = { tipo: "objetivo", k: k };
      linea((sinDueno ? "No encontré ningún servidor de «" + sinDueno + "». " : "") + "¿A qué servidor? Escribe su número o su nombre: " + listaServidores(), "ia");
      return;
    }
    if (j.equipo !== "server") { linea("✋ " + j.nombre + " no tiene servidor: es de tu equipo. Servidores: " + (listaServidores() || "ninguno listo"), "mal"); return; }
    if (j.lab !== "listo") { linea("✋ El servidor de " + j.nombre + " todavía está arrancando. No envié nada.", "mal"); return; }
    A.elegir(j.n); // el mismo blanco que marcan los botones
    if (!A.enviar({ accion: "atacar", objetivo: j.n, ataque: k }, "¡Ataque lanzado!", function (ok, msg, d) {
      if (!ok) { linea("✋ " + msg, "mal"); return; }
      var q = d && d.yo ? d.ataques_max - (d.yo.ataques || 0) : null;
      linea("💥 ¡Ataque lanzado contra " + j.nombre + "!" + (q === null ? "" : q > 0 ? " Te queda" + (q === 1 ? " 1 ataque" : "n " + q + " ataques") + " esta ronda." : " Ya no te quedan ataques esta ronda."), "ok");
    })) ocupadoTxt();
  }
  function defender(k) {
    var e = est(), y = yo();
    if (!y || y.equipo !== "server") { linea("✋ Solo el equipo Server cuida servidores.", "mal"); return; }
    linea("→ entendí: " + NOMBRE_DEF[k], "ent");
    if (e.fase !== "defensa") { linea("✋ No es tu turno: " + (e.fase === "ataque" ? "te están atacando; los cuidados se encienden en la defensa." : "los cuidados se encienden en tu turno de defensa.") + " No envié nada.", "mal"); return; }
    if (y.lab !== "listo") { linea("✋ Tu servidor todavía está arrancando. No envié nada.", "mal"); return; }
    if (!A.enviar({ accion: "defender", defensa: k }, "", function (ok, msg, d) {
      if (!ok) { linea("✋ " + msg, "mal"); return; }
      var yy = d && d.yo;
      linea((yy && yy.mensaje) || "Listo.", yy && /^Listo/.test(yy.mensaje || "") ? "ok" : "mal");
      if (yy) linea("Salud ahora: " + saludDe(yy) + (yy.salud === "caido" ? " · escribe curl /salud para ver qué falta" : ""), yy.salud === "ok" ? "ok" : "dim");
    })) ocupadoTxt(); else linea("… trabajando en tu aula (unos segundos)", "dim");
  }
  function reinstalar() {
    var e = est(), y = yo();
    if (!y || y.equipo !== "server") { linea("✋ Solo el equipo Server tiene servidor que reinstalar.", "mal"); return; }
    linea("→ entendí: " + NOMBRE_DEF.reinstalar, "ent");
    var f = y.fallas || [], roto = y.lab === "error" || (y.lab === "listo" && (f.indexOf("sin_lab") >= 0 || f.indexOf("aula") >= 0));
    if (y.lab === "preparando") { linea("Tu servidor ya está arrancando solo. Dale unos segundos.", "dim"); return; }
    if (!roto && !e.staff) { linea("✋ Tu laboratorio está instalado: reinstalar no cura ataques (y el juego solo lo permite si tu servidor no arrancó). Prueba: reinicia la app, limpia el disco o diagnostica.", "mal"); return; }
    if (e.fase === "ataque") { linea("✋ No puedes reinstalar mientras te atacan. No envié nada.", "mal"); return; }
    if (!A.enviar({ accion: "preparar" }, "Arrancando tu servidor…", function (ok, msg) { linea(ok ? msg : "✋ " + msg, ok ? "ok" : "mal"); })) ocupadoTxt();
  }
  function ofrecerPrompt(i, antes) {
    var p = A.PROMPTS[i];
    if (antes) linea(antes, "dim");
    linea("Eso no tiene botón: se cura de verdad en tu aula, con DeepSeek Harness (panel de la derecha). El prompt:", "dim");
    linea("  «" + p[1] + "»");
    pend = { tipo: "confirmar", acc: { t: "copiar", i: i } };
    linea("¿Te lo copio? Enter o s = sí · n = no", "ia");
  }
  var SIN_RECETA = { nr_fuga: "fuga", nr_clones: "clones", nr_datos: "datos", nr_sesion: "sesion", nr_clave: "clave" };
  function hacer(acc) {
    switch (acc.t) {
      case "atacar": atacar(acc.k, acc.n); break;
      case "defender": defender(acc.k); break;
      case "reinstalar": reinstalar(); break;
      case "unir": unir(acc.eq); break;
      case "salud": salud(); break;
      case "df": disco(); break;
      case "estado": estado(); break;
      case "ayuda": ayuda(); break;
      case "prompt": ofrecerPrompt(acc.i, acc.antes); break;
      case "copiar":
        A.copiar(A.PROMPTS[acc.i][1]);
        linea("📋 Listo: pégalo en DeepSeek Harness. Si tu navegador no dejó copiar, selecciónalo aquí arriba.", "ok");
        break;
    }
  }
  // De un id de acción (regla o categoría de la IA) a algo que hacer().
  function accionDe(id, n) {
    if (ataque(id)) return { t: "atacar", k: id, n: n };
    if (id === "reiniciar" || id === "limpiar") return { t: "defender", k: id };
    if (id === "reinstalar") return { t: "reinstalar" };
    if (id === "salud" || id === "df" || id === "estado" || id === "ayuda") return { t: id };
    if (id === "pr_diag" || id === "diagnostico") return { t: "prompt", i: 0 };
    if (id === "pr_base" || id === "restaurar_base") return { t: "prompt", i: 1 };
    if (id === "pr_lenta" || id === "desatascar") return { t: "prompt", i: 2 };
    if (SIN_RECETA[id]) { var d = falla(SIN_RECETA[id]); return { t: "prompt", i: 0, antes: d[0] + " Para eso no hay receta: toca investigar. Pista: " + d[2] }; }
    return null;
  }
  function describe(acc) {
    if (acc.t === "atacar") { var a = ataque(acc.k), j = acc.n === undefined || acc.n === null ? null : jug(acc.n); return a.ic + " " + a.t + (j ? " → servidor " + etiqueta(j) : " (te pregunto a qué servidor)"); }
    if (acc.t === "defender") return NOMBRE_DEF[acc.k];
    if (acc.t === "reinstalar") return NOMBRE_DEF.reinstalar;
    if (acc.t === "prompt") return "darte el prompt «" + A.PROMPTS[acc.i][0] + "» para DeepSeek Harness";
    return NOMBRE_DEF[acc.t] || acc.t;
  }

  /* ---------- capa 2: IA (solo si las reglas no deciden) ---------- */
  function errorDe(d, estado) {
    var m = d && d.error;
    if (m && typeof m === "object") m = m.message;
    return typeof m === "string" && m ? m : "respondió " + estado;
  }
  function cancelarIA() {
    if (iaCtl) { try { iaCtl.abort(); } catch (e) {} }
    iaCtl = null; clearInterval(iaReloj);
  }
  function noEntendi(porque) {
    if (porque) linea("🤖 " + porque, "mal");
    linea("No entendí lo que quieres. Escribe ayuda para ver lo que sí entiendo.", "mal");
  }
  function preguntarIA(crudo, t) {
    var eq = equipo();
    if (t.split(" ").length < 2 || t.length < 6) { noEntendi(""); return; }
    if (iaUsos >= MAX_IA || typeof fetch !== "function") { noEntendi(iaUsos >= MAX_IA ? "Ya le pregunté muchas veces a la IA en esta partida." : ""); return; }
    iaUsos++;
    var ids = eq === "tumba" ? A.ATAQUES.map(function (a) { return a.k; }).concat(["estado"]) : ["reiniciar", "limpiar", "salud", "reinstalar", "restaurar_base", "desatascar", "diagnostico", "estado"];
    var glosa = eq === "tumba"
      ? A.ATAQUES.map(function (a) { return a.k + " = " + a.t.toLowerCase() + " (" + a.d + ")"; }).join("; ") + "; estado = ver la lista de servidores"
      : "reiniciar = reiniciar la app apagada; limpiar = limpiar el disco lleno; salud = ver el health check; reinstalar = reinstalar el laboratorio; restaurar_base = recuperar la base de datos borrada; desatascar = arreglar la app lenta; diagnostico = revisar y curar todo; estado = ver la lista de servidores";
    var contexto = "Contexto: es un juego de clase, todo simulado. Lo de arriba lo escribió un jugador en una terminal de juguete. Equipo del jugador: " +
      (eq === "tumba" ? "Monito Tumba Server (ataca los servidores de práctica del otro equipo)" : "Monito Server (cuida su propio servidor de práctica)") +
      ". Categorías: " + glosa + "; ayuda = no sabe qué escribir; otro = nada de lo anterior. Si nombra un servidor (un número o el nombre de su dueño), ponlo en campos.";
    var espera = linea("🤖 No me lo sé de memoria: le pregunto a la IA… (puede tardar; escribe otra cosa para cancelar)", "ia"), t0 = Date.now();
    var ctl = null; try { ctl = new AbortController(); } catch (e) {}
    iaCtl = ctl || {};
    var mio = iaCtl, fuera = false;
    if (!REDUCIDO) iaReloj = setInterval(function () { if (iaCtl === mio) espera.textContent = "🤖 No me lo sé de memoria: le pregunto a la IA… " + Math.round((Date.now() - t0) / 1000) + " s (escribe otra cosa para cancelar)"; }, 1000);
    var tope = setTimeout(function () { fuera = true; if (ctl) ctl.abort(); }, ESPERA_IA);
    var fin = function () {
      clearTimeout(tope);
      var sigue = iaCtl === mio;
      if (sigue) { iaCtl = null; clearInterval(iaReloj); }
      espera.textContent = sigue ? "🤖 No me lo sé de memoria: le pregunté a la IA (" + Math.max(1, Math.round((Date.now() - t0) / 1000)) + " s)." : "🤖 Consulta a la IA cancelada.";
      return sigue;
    };
    fetch("../../entender", {
      method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, signal: ctl ? ctl.signal : undefined,
      body: JSON.stringify({ nombre: "terminal.txt", tipo: "txt", texto: crudo + "\n" + contexto, categorias: ids.concat(["ayuda", "otro"]), pregunta: "¿Qué acción del juego quiere el jugador y sobre qué servidor?" })
    }).then(function (r) {
      return r.text().then(function (txt) { var d = null; try { d = JSON.parse(txt); } catch (e) {} return { ok: r.ok, estado: r.status, d: d }; });
    }).then(function (x) {
      if (!fin()) return; // el jugador ya escribió otra cosa
      if (!x.ok || !x.d) { noEntendi(x.estado === 429 ? errorDe(x.d, 429) : "La IA no está disponible ahora (" + errorDe(x.d, x.estado) + ")."); return; }
      var cat = norm(x.d.categoria).replace(/ /g, "_"), n;
      if (ids.indexOf(cat) < 0 && cat !== "ayuda") { noEntendi(""); return; }
      if (ataque(cat)) {
        var r = objetivo(t), extra = (x.d.campos || []).map(function (c) { return (c && c.valor || "") + " " + (c && c.evidencia || ""); }).join(" ");
        if (!r || r.n === undefined) r = objetivo(norm(extra)) || r;
        if (!r || r.n === undefined) r = objetivo(norm(x.d.resumen)) || r;
        if (r && r.n !== undefined) n = r.n;
      }
      var acc = accionDe(cat, n);
      if (!acc) { noEntendi(""); return; }
      var cuantas = typeof x.d.restantes === "number" ? " (te quedan " + x.d.restantes + " consultas a la IA hoy)" : "";
      if (acc.t === "ayuda" || acc.t === "estado" || acc.t === "salud" || acc.t === "prompt") { linea("🤖 entendí: " + describe(acc) + cuantas, "ia"); hacer(acc); return; }
      pend = { tipo: "confirmar", acc: acc };
      linea("🤖 entendí: " + describe(acc) + cuantas, "ia");
      linea("¿Lo hago? Enter o s = sí · n = no", "ia");
    }).catch(function () {
      if (!fin()) return;
      noEntendi(fuera ? "La IA tardó demasiado." : "No pude hablar con la IA.");
    });
  }

  /* ---------- el intérprete ---------- */
  function procesar(crudo) {
    cancelarIA();
    var t = norm(crudo), p = pend;
    pend = null;
    linea(promptTxt() + crudo, "yo");
    if (!est()) { linea("Todavía no llega el estado de la arena. Prueba en un segundo.", "mal"); return; }
    t = t.replace(/^(sudo|por favor|porfa|please|oye|monito)\s+/, "").replace(/\s+(por favor|porfa|please)$/, "");

    if (p && p.tipo === "confirmar") {
      if (t === "" || /^(s|si|y|yes|ok|okay|dale|hazlo|claro|va)$/.test(t)) { hacer(p.acc); return; }
      if (/^(n|no|nop|nel|cancela|cancelar|mejor no)$/.test(t)) { linea("Cancelado: no hice nada.", "dim"); return; }
    } else if (p && p.tipo === "elegir") {
      var m = /^([1-9])$/.exec(t), cual = m ? p.ops[Number(m[1]) - 1] : (p.ops.indexOf(t) >= 0 ? t : null);
      if (cual) { var ac = accionDe(cual, p.n); if (ac) { hacer(ac); return; } }
    } else if (p && p.tipo === "objetivo" && t) {
      var o = /\bazar\b|cualquiera|random/.test(t) ? alAzar() : objetivo(t);
      if (o && o.n !== undefined) { atacar(p.k, o.n); return; }
      if (o && o.varios) { pend = p; linea("Hay varios que calzan: " + o.varios.map(etiqueta).join(" · ") + ". Escribe el número.", "ia"); return; }
    } else if (p && p.tipo === "ataque" && t) {
      var qs = puntuar(R_TUMBA, t);
      if (qs.length === 1) { atacar(qs[0], p.n); return; }
    }
    if (t === "") return;

    // Comandos de la propia terminal.
    if (/^(ayuda|help|man( .*)?|comandos|h|-h|--help)$/.test(t) || /^que (puedo|se puede|entiendes|sabes)/.test(t) || /^\?+$/.test(crudo.trim())) { ayuda(); return; }
    if (/^(status|estado|ls( .*)?|ll|dir|who|w|ps( .*)?|top|htop|servidores|jugadores|marcador|lista)$/.test(t)) { estado(); return; }
    if (/^(clear|cls|reset)$/.test(t) || /^limpia\w* (la )?(pantalla|terminal)$/.test(t)) { sal.textContent = ""; return; }
    if (/^(exit|salir|quit|cerrar|logout|bye|chau|adios)$/.test(t)) { abrir(false); btn.focus(); return; }
    if (/^(history|historial)$/.test(t)) { lineas(hist.map(function (h, i) { return "  " + (i + 1) + "  " + h; })); return; }
    if (t === "whoami" || t === "id") { var y0 = yo(), yj = y0 ? jug(y0.n) : null; linea(y0 ? "monito " + (yj ? etiqueta(yj) : "") + " · equipo " + (y0.equipo === "tumba" ? "Tumba Server" : "Server") : "monito sin equipo todavía"); return; }
    if (/^(hola|buenas|hey|hi|gracias|thanks)\b/.test(t) && t.split(" ").length <= 3) { linea("🐒 ¡Uh uh ah ah! Escribe ayuda para ver lo que entiendo."); return; }

    var eq = equipo();
    if (!eq) {
      if (/\btumba|\batac/.test(t)) { unir("tumba"); return; }
      if (/\bserver|\bdefen|\bcuid|\bproteg|\bcura/.test(t)) { unir("server"); return; }
      linea("Primero elige equipo: escribe tumba (atacar) o server (cuidar un servidor). También puedes usar los botones.", "mal");
      return;
    }
    // Reglas nuevas del juego (solo si el servidor ya las trae): kernel panic y escudo temporal.
    if (eq === "tumba" && /kernel|\bpanic|tumba\w* a todos|apaga\w* (a )?todos?|todos los serv/.test(t)) {
      if (est().kernel_restan === undefined) { linea("✋ El kernel panic todavía no está activado en este servidor.", "mal"); return; }
      linea("→ entendí: 💥 KERNEL PANIC, apagar a todos los servidores (quedan " + est().kernel_restan + " en la partida)", "ent");
      if (!A.enviar({ accion: "kernel_panic" }, "¡Kernel panic lanzado!", function (ok, msg) { linea(ok ? "💥 " + msg : "✋ " + msg + " No envié nada más.", ok ? "ok" : "mal"); })) ocupadoTxt();
      return;
    }
    if (eq === "server" && /cierr\w* .*(conexi|puert)|\bfirewall|iptables|\bufw\b|\bescudo|bloque\w* .*(trafico|puert|conexi|entrada)|desconect\w* .*(internet|red)|modo avion/.test(t)) {
      if ((est().yo || {}).escudo_libre === undefined) { linea("✋ El escudo todavía no está activado en este servidor.", "mal"); return; }
      linea("→ entendí: 🛡️ cerrar las conexiones externas de tu servidor por " + (est().escudo_s || 10) + " s (una vez por ronda, mientras te atacan)", "ent");
      if (!A.enviar({ accion: "escudo" }, "Conexiones cerradas", function (ok, msg) { linea(ok ? "🛡️ " + msg + ": los ataques rebotan mientras dure." : "✋ " + msg, ok ? "ok" : "mal"); })) ocupadoTxt();
      return;
    }
    if (eq === "tumba") {
      var q = puntuar(R_TUMBA, t), obj = /\bazar\b|cualquiera|random/.test(t) ? alAzar() : objetivo(t);
      if (obj && obj.noHay !== undefined && q.length) { linea("✋ No hay ningún servidor con el número " + obj.noHay + ". Servidores: " + (listaServidores() || "ninguno listo") + ".", "mal"); return; }
      if (obj && obj.varios && q.length) { pend = { tipo: "objetivo", k: q[0] }; linea("Hay varios que calzan: " + obj.varios.map(etiqueta).join(" · ") + ". Escribe el número.", "ia"); if (q.length > 1) pend = null; return; }
      var n = obj && obj.n !== undefined ? obj.n : undefined;
      if (q.length === 1) {
        var md = n === undefined && (/\b(?:a|al|contra) ([a-z]{3,})/.exec(t) || /\b(?:server|servidor|app|tienda|maquina|base|disco) del? ([a-z]{3,})/.exec(t));
        atacar(q[0], n, md && NO_NOMBRE.indexOf(" " + md[1] + " ") < 0 && !esOrden(md[1]) ? md[1] : "");
        return;
      }
      if (q.length > 1) { pend = { tipo: "elegir", ops: q, n: n }; linea("No estoy seguro de cuál ataque. Escribe el número: " + q.map(function (k, i) { return (i + 1) + ") " + ataque(k).t; }).join(" · "), "ia"); return; }
      if (/\batac|\bhack|destru|\bromp|\bgolpe|\bdale\b|\bpega|\bmolesta|\bcaos/.test(t)) {
        pend = { tipo: "ataque", n: n };
        linea("¿Con qué ataque" + (n !== undefined && jug(n) ? " a " + jug(n).nombre : "") + "? Escribe uno: " + A.ATAQUES.map(function (a) { return a.k; }).join(" · "), "ia");
        return;
      }
      if (puntuar(R_SERVER.slice(0, 2), t).length) { linea("✋ Eso es cuidar un servidor: lo hace el equipo Server. Tú atacas; escribe ayuda para ver cómo.", "mal"); return; }
      if (p && p.tipo === "objetivo") { linea("No encontré ese servidor. Servidores: " + (listaServidores() || "ninguno listo") + ".", "mal"); return; }
      preguntarIA(crudo, t);
      return;
    }
    // Equipo Server
    var qd = puntuar(R_SERVER, t);
    if (qd.length === 1) { hacer(accionDe(qd[0])); return; }
    if (qd.length > 1) {
      pend = { tipo: "elegir", ops: qd };
      linea("No estoy seguro de qué quieres. Escribe el número: " + qd.map(function (k, i) { return (i + 1) + ") " + describe(accionDe(k)); }).join(" · "), "ia");
      return;
    }
    if (puntuar(R_TUMBA, t).length) { linea("✋ Eso es un ataque: lo hace el equipo Tumba Server. Tú cuidas tu servidor; escribe ayuda para ver cómo.", "mal"); return; }
    preguntarIA(crudo, t);
  }
  function alAzar() {
    var l = servidores().filter(function (j) { return j.lab === "listo"; });
    return l.length ? { n: l[Math.floor(Math.random() * l.length)].n } : null;
  }

  /* ---------- teclado y ventana ---------- */
  function abrir(si, sinFoco) {
    abierta = !!si;
    caja.hidden = !abierta;
    if (abrir2) abrir2.hidden = abierta;   // el acceso grande sobre los paneles solo se ve con la terminal cerrada
    btn.setAttribute("aria-expanded", abierta ? "true" : "false");
    guarda(abierta ? "1" : "0");
    if (!abierta) { cancelarIA(); pend = null; return; }
    pintarPs();
    if (!sal.childNodes.length) {
      linea("Terminal de juguete del monito 🐒 — no ejecuta nada de verdad: entiende lo que escribes y juega por ti.", "dim");
      linea("Escribe ayuda para ver lo que entiendo. Los botones siguen funcionando igual.", "dim");
    }
    if (!sinFoco) { try { inp.focus(); } catch (e) {} aLaVista(); }
  }
  function aLaVista() {
    setTimeout(function () { try { if (abierta && document.activeElement === inp) inp.parentNode.scrollIntoView({ block: "nearest" }); } catch (e) {} }, 250);
  }
  function enviarLinea() {
    var v = inp.value;
    inp.value = "";
    if (v.trim()) { if (hist[hist.length - 1] !== v) hist.push(v); if (hist.length > 30) hist.shift(); }
    hi = hist.length;
    try { procesar(v); } catch (e) { linea("Algo falló en la terminal; los botones siguen funcionando.", "mal"); }
    pintarPs();
  }
  btn.addEventListener("click", function () { abrir(!abierta); });
  $("term-x").addEventListener("click", function () { abrir(false); btn.focus(); });
  $("term-ok").addEventListener("click", function () { enviarLinea(); try { inp.focus(); } catch (e) {} });
  inp.addEventListener("keydown", function (ev) {
    // Lo que se escribe aquí se queda aquí: ni la arena ni otros atajos de la escena lo ven.
    if (!ev.ctrlKey && !ev.metaKey && !ev.altKey) ev.stopPropagation();
    if (ev.isComposing) return;
    if (ev.key === "Enter") { ev.preventDefault(); enviarLinea(); }
    else if (ev.key === "ArrowUp") { ev.preventDefault(); if (hi > 0) { hi--; inp.value = hist[hi]; } }
    else if (ev.key === "ArrowDown") { ev.preventDefault(); if (hi < hist.length) { hi++; inp.value = hi < hist.length ? hist[hi] : ""; } }
    else if (ev.key === "Escape") {
      ev.preventDefault();
      if (iaCtl) { cancelarIA(); linea("Cancelado.", "dim"); }
      else if (pend) { pend = null; linea("Cancelado: no hice nada.", "dim"); }
      else if (inp.value) inp.value = "";
      else { abrir(false); btn.focus(); }
    }
  });
  ["keyup", "keypress"].forEach(function (tipo) { inp.addEventListener(tipo, function (ev) { if (!ev.ctrlKey && !ev.metaKey && !ev.altKey) ev.stopPropagation(); }); });
  inp.addEventListener("focus", aLaVista);
  try { if (window.visualViewport) window.visualViewport.addEventListener("resize", aLaVista); } catch (e) {}
  sal.addEventListener("click", function () { var s = ""; try { s = String(window.getSelection()); } catch (e) {} if (!s) { try { inp.focus({ preventScroll: true }); } catch (e) {} } });

  // Avisa el cambio de turno a quien está escribiendo (solo con la terminal abierta).
  setInterval(function () {
    var e = est(); if (!e) return;
    if (e.fase !== faseVista) {
      var antes = faseVista; faseVista = e.fase;
      if (abierta && antes) {
        var eq = equipo(), txt = { ataque: "⏱️ Ronda " + e.ronda + ": turno de ATAQUE." + (eq === "tumba" ? " ¡Te toca!" : eq === "server" ? " Te están atacando." : ""), defensa: "⏱️ Turno de DEFENSA." + (eq === "server" ? " ¡Te toca curar!" : eq === "tumba" ? " A ver si se curan." : ""), marcador: "⏱️ ¡Tiempo! Revisando los servidores…", lobby: "La arena volvió al inicio." }[e.fase];
        if (txt) linea(txt, "ent");
      }
    }
    if (abierta) pintarPs();
  }, 500);

  btn.hidden = false;
  if (abrir2) { abrir2.hidden = false; abrir2.addEventListener("click", function () { abrir(true); }); }
  if (guarda() === "1") abrir(true, true);
})();
