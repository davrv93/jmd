/* Laboratorio de ideas · Design Thinking con Claude (dtc-01, dtc-02, dtc-03).

   Una sola idea que madura en tres movimientos (Entender, Imaginar, Probar) y 13 estaciones.
   - Todo lo que el alumno escribe se guarda en localStorage («dt-claude-v1»), el mismo en las tres sesiones (mismo
     origen). Si el navegador no guarda, lo dice con un aviso fijo; la idea se descarga en .md con sus datos dentro
     y se recupera desde ese mismo archivo («Recuperar desde archivo» en la ficha).
   - Regla del laboratorio: primero tú, después Claude. En cada estación el campo del alumno va antes del pedido, y
     el pedido se rellena con lo que el alumno ya escribió. Claude va en otra pestaña (claude.ai): el LMS no tiene su API.
   - Color = quién hizo qué: lo del alumno en tinta; lo de Claude (sello, botón de copiar, su respuesta) en terracota.
   - La ficha muestra solo lo que la sesión ya alcanzó y celebra la madurez ganada.
   - Galería del grupo: /api/v1/live/{lección}/muro (200 caracteres, «me gusta», vive durante la clase).

   Principios: simplicidad como claridad de propósito y cuidado del detalle (Jony Ive); divulgación progresiva
   (Nielsen, 2006); la idea como nota viva que madura (notas evergreen, Matuschak); bloques en una página donde el
   contenido manda (Notion); buenos valores por defecto (Evergreen UI). Revisado con impeccable el 27-11-2026.

   <body data-estacion="reto"> pinta el laboratorio en esa estación; «ficha» abre la ficha. Las láminas solo usan los
   enlaces genéricos: data-campo, data-ver, data-revelar, data-reloj, data-quiz, data-muro y data-bitacora. */
(function () {
  "use strict";
  try { var tema = new URLSearchParams(location.search).get("tema"); if (tema === "dark" || tema === "light") document.documentElement.setAttribute("data-tema", tema); } catch (e) { /* sin parámetros */ }

  var partes = location.pathname.split("/"), i = partes.indexOf("live"), j = partes.indexOf("escenas");
  var LECCION = i >= 0 ? decodeURIComponent(partes[i + 1] || "") : "";
  var ESCENA = j >= 0 ? decodeURIComponent(partes[j + 1] || "") : (document.body.getAttribute("data-escena") || "");
  var CLAVE = "dt-claude-v1";
  var ALCANCE = { "dtc-01": 1, "dtc-02": 2, "dtc-03": 3 }[LECCION] || 3; // movimientos que la sesión ya abrió

  var S = (function () { try { var s = JSON.parse(localStorage.getItem(CLAVE) || "null"); if (s && typeof s === "object") return s; } catch (e) { /* bloqueado */ } return {}; })();
  var GUARDA = (function () { try { localStorage.setItem(CLAVE + "-prueba", "1"); localStorage.removeItem(CLAVE + "-prueba"); return true; } catch (e) { return false; } })();
  function guardar() { try { localStorage.setItem(CLAVE, JSON.stringify(S)); GUARDA = true; } catch (e) { GUARDA = false; } return GUARDA; }
  function val(k) { return String(S[k] == null ? "" : S[k]).trim(); }

  function $(sel, r) { return (r || document).querySelector(sel); }
  function $$(sel, r) { return Array.prototype.slice.call((r || document).querySelectorAll(sel)); }
  function h(tag, a, hijos) {
    var el = document.createElement(tag);
    if (a) for (var k in a) {
      if (a[k] == null || a[k] === false) continue;
      if (k === "text") el.textContent = a[k];
      else if (k === "html") el.innerHTML = a[k];
      else if (k === "class") el.className = a[k];
      else if (k.slice(0, 2) === "on") el.addEventListener(k.slice(2), a[k]);
      else el.setAttribute(k, a[k] === true ? "" : a[k]);
    }
    (hijos || []).forEach(function (x) { if (x != null) el.appendChild(typeof x === "string" ? document.createTextNode(x) : x); });
    return el;
  }
  var ICO = {
    copia: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M5 15V6.5A2.5 2.5 0 0 1 7.5 4H15"/></svg>',
    flecha: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6"/></svg>',
    atras: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H6M11 6l-6 6 6 6"/></svg>',
    baja: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>',
    sube: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V4M7 9l5-5 5 5M5 20h14"/></svg>',
    hoja: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-10A.5.5 0 0 1 7 20z"/><path d="M14 3.5V8h4M9.5 12.5h5M9.5 16h5"/></svg>',
    marca: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.2"/></svg>'
  };

  var toastEl = null, toastT = 0;
  function avisar(msg) {
    if (!toastEl) { toastEl = h("div", { class: "dt-toast", role: "status", "aria-live": "polite" }); document.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.classList.add("ver"); clearTimeout(toastT);
    toastT = setTimeout(function () { toastEl.classList.remove("ver"); }, 4200);
  }
  function copiar(txt) {
    function viejo() { var a = h("textarea", { style: "position:fixed;left:-9999px" }); a.value = txt; document.body.appendChild(a); a.select(); var ok = false; try { ok = document.execCommand("copy"); } catch (e) { ok = false; } a.remove(); return ok; }
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(txt).then(function () { return true; }, function () { return viejo(); });
    return Promise.resolve(viejo());
  }
  function api(ruta, cuerpo) {
    return fetch("/api/v1/live/" + encodeURIComponent(LECCION || "dtc-01") + ruta, {
      method: cuerpo ? "POST" : "GET", credentials: "same-origin", cache: "no-store",
      headers: cuerpo ? { "Content-Type": "application/json" } : {}, body: cuerpo ? JSON.stringify(cuerpo) : undefined
    }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (b) { return { estado: r.status, b: b }; }); })
      .catch(function () { return { estado: 0, b: {} }; });
  }
  function evidencia(detalle) { return api("/evidencia", { escena: ESCENA, tipo: "hallazgo", detalle: String(detalle).slice(0, 200) }); }

  // ================================================================ las 13 estaciones
  var MOV = [
    { id: "entender", n: "I", t: "Entender", ses: "Sesión 1", fecha: "27 nov" },
    { id: "imaginar", n: "II", t: "Imaginar", ses: "Sesión 2", fecha: "4 dic" },
    { id: "probar", n: "III", t: "Probar", ses: "Sesión 3", fecha: "11 dic" }
  ];
  function alcanzado(movId) { for (var k = 0; k < MOV.length; k++) if (MOV[k].id === movId) return k < ALCANCE; return true; }
  var FASE = { emp: "Empatizar", def: "Definir", ide: "Idear", pro: "Prototipar", eva: "Evaluar" };

  var EST = [
    { id: "reto", mov: "entender", fase: "emp", escena: "04-tu-reto", t: "Tu reto",
      h: "Empieza por el problema, no por la solución",
      d: "Un negocio, un servicio, un trámite o algo de tu casa. Escribe lo que duele, y para quién.",
      ia: { h: "Elegir el problema que te importa y a quién le duele.", m: "Te hace las preguntas que no te hiciste y avisa si tu reto ya trae una solución adentro." },
      clave: ["reto", "usuario"],
      b: [
        { k: "tema", reto: "Los pacientes faltan a sus citas médicas sin avisar", usuario: "Pacientes adultos que trabajan y sacan cita por teléfono" },
        { k: "campo", id: "reto", t: "Mi reto", max: 200, ph: "Los pacientes de mi consultorio faltan a sus citas sin avisar" },
        { k: "campo", id: "usuario", t: "Para quién", linea: true, max: 120, ph: "Pacientes adultos que trabajan y sacan cita por WhatsApp" },
        { k: "claude", id: "p-coach", t: "Arranca a tu coach", d: "Pégalo en un chat nuevo de claude.ai y sigue en ese mismo chat las tres sesiones.", req: ["reto", "usuario"],
          x: "Vas a ser mi coach de Design Thinking durante un taller de 3 sesiones (modelo de la d.school de Stanford: Empatizar, Definir, Idear, Prototipar y Evaluar).\n\nMi reto: {{reto}}\nPara quién: {{usuario}}\n\nReglas para todo este chat:\n1. No hagas el trabajo por mí. Primero pregúntame; después sugiere.\n2. Separa siempre lo que una persona real DIJO o HIZO de lo que yo SUPONGO.\n3. Si me enamoro de una solución antes de entender el problema, avísame.\n4. Respuestas cortas, numeradas y en español neutro.\n\nPara empezar, hazme 3 preguntas que me ayuden a ver a quién debo entrevistar primero y qué no sé todavía de su vida." },
        { k: "consejo", t: "La trampa más común", x: "«Quiero hacer una app de citas» ya es una solución. El reto es el problema: «los pacientes faltan sin avisar». Si tu frase trae un producto adentro, quítaselo." }
      ] },
    { id: "entrevista", mov: "entender", fase: "emp", escena: "05-tu-entrevista", t: "Entrevista",
      h: "Pide historias, no opiniones",
      d: "Escribe tus preguntas, deja que Claude las afine y entrevista a Rosa, una paciente que falta a sus citas. Rosa guarda un secreto: solo lo cuenta si le preguntas bien.",
      ia: { h: "Escuchar y repreguntar. Rosa es un simulador para practicar; esta semana entrevistas a dos personas reales, porque ninguna IA reemplaza a una persona.", m: "Revisa tus preguntas en un minuto, y hoy además hace de Rosa para que practiques sin miedo a equivocarte." },
      clave: ["notas"],
      b: [
        { k: "campo", id: "preguntas", t: "Mis preguntas", ayuda: "Escribe 3 o más, a tu manera. Empieza por «Cuéntame la última vez que…».", filas: 4, ph: "1. Cuéntame la última vez que…" },
        { k: "claude", id: "p-guion", t: "Afina tu guion", d: "Claude revisa tus preguntas; tú decides cuáles usas.", req: ["reto", "usuario", "preguntas"],
          x: "Voy a hacer una entrevista de empatía de 8 minutos con {{usuario}}, sobre este reto: {{reto}}.\n\nMis preguntas:\n{{preguntas}}\n\n1. Marca las que se responden con sí o no, las que sugieren la respuesta y las que mencionan una solución, y reescríbelas como historias («Cuéntame la última vez que…»).\n2. Completa hasta 6 preguntas, sin repetir las mías.\n3. Dame 3 repreguntas para profundizar («¿Por qué?», «¿Qué sentiste?», «¿Qué hiciste después?»)." },
        { k: "consejos", t: "Cómo entrevistar bien", items: [
          ["Pide historias", "«Cuéntame la última vez que…» trae hechos; «¿Te gustaría…?» trae cortesía."],
          ["Pregunta «¿por qué?» aunque parezca obvio", "La emoción suele aparecer en la segunda o tercera respuesta."],
          ["Mira lo que hace, no solo lo que dice", "Como Bill en el gimnasio: los gestos y las manos también son datos."],
          ["Calla", "Tres segundos de silencio hacen que la persona siga hablando."]] },
        { k: "avatar" },
        { k: "campo", id: "entrevistado", t: "A quién entrevisté", linea: true, max: 100, ph: "Rosa (personaje de práctica), o una persona real sin datos personales" },
        { k: "campo", id: "notas", t: "Lo que dijo, tal cual", ayuda: "Frases textuales entre comillas. Anota también lo que hizo y cómo lo dijo.", filas: 6, ph: "«Siempre se me olvida porque…»" }
      ] },
    { id: "mapa", mov: "entender", fase: "emp", escena: "06-mapa-de-empatia", t: "Mapa de empatía",
      h: "Lo que dice, piensa, hace y siente",
      d: "Ordena tu entrevista en cuatro cuadrantes. Después Claude revisa qué es suposición tuya; la sorpresa la encuentras tú.",
      ia: { h: "La sorpresa. El insight nace de quien estuvo ahí, como Doug Dietz frente a la niña que lloraba.", m: "Contrasta tu mapa con tus notas en segundos y marca lo que es suposición tuya, no algo que la persona dijo." },
      caso: { t: "Caso · GE Adventure Series", x: "Doug Dietz, diseñador de GE, vio a una niña llorar camino al resonador que él había diseñado. Con niños y personal del hospital lo convirtió en una aventura: un barco pirata, un submarino. En el hospital infantil de UPMC la satisfacción subió 90 % y la sedación para resonancia bajó de casi todos los menores de 9 años a menos del 27 %. Utley lo menciona en el webinar.",
        f: "All.Can (2019), «GE Healthcare Adventure Series»; Milwaukee Journal Sentinel (21-01-2016)." },
      clave: ["sorpresa", "necesidad"],
      b: [
        { k: "consejos", t: "Cómo llenarlo", abierto: true, items: [
          ["Relee tus notas de la entrevista", "Cada frase o dato va a uno de los cuatro cuadrantes. Una idea por línea."],
          ["Separa lo que oíste de lo que interpretas", "Dice y Hace son hechos: lo que dijo y lo que hizo. Piensa y Siente son tu lectura: márcalos con (S) si no los dijo."],
          ["Busca dónde no cuadra", "Cuando dice una cosa y hace otra, ahí suele estar el insight. Bill vio a gente que decía estar bien y se agarraba de la pantalla."]] },
        { k: "traerCitas" },
        { k: "mapa", campos: [
          { id: "dice", t: "Dice", q: "¿Qué frases dijo, tal cual? Entre comillas.", ph: "Ej. Cybex: «Elegí esta máquina porque se siente más segura»" },
          { id: "piensa", t: "Piensa", q: "¿Qué crees que pasa por su cabeza, aunque no lo diga?", ph: "Ej. Cybex: «Me puedo caer» (S)" },
          { id: "hace", t: "Hace", q: "¿Qué hizo o hace? Acciones concretas, no opiniones.", ph: "Ej. Cybex: se agarra de la pantalla con las dos manos" },
          { id: "siente", t: "Siente", q: "¿Qué emociones mostró o nombró?", ph: "Ej. Cybex: miedo, inseguridad" }] },
        { k: "claude", id: "p-mapa", t: "Revisa tu mapa", d: "Claude compara tu mapa con tus notas; no inventa datos.", req: ["notas"],
          x: "Te paso mis notas de una entrevista con {{entrevistado}}, sobre este reto: {{reto}}\n\n{{notas}}\n\nY el mapa de empatía que armé:\nDICE: {{dice}}\nPIENSA: {{piensa}}\nHACE: {{hace}}\nSIENTE: {{siente}}\n\n1. Marca con (S) lo que en mi mapa es suposición mía y no algo que la persona dijo o hizo.\n2. Dime qué de mis notas falta en el mapa.\n3. Señala 2 tensiones o contradicciones (dice una cosa y hace otra).\n4. Propón 3 posibles insights, cada uno con la cita que lo respalda.\nNo inventes nada que no esté en mis notas." },
        { k: "campo", id: "sorpresa", t: "Lo que me sorprendió", ayuda: "El insight: algo que no sabías antes de la entrevista.", max: 200 },
        { k: "campo", id: "necesidad", t: "La necesidad de fondo", ayuda: "Un verbo, no un producto: «sentirse seguro», «no quedar mal», «ahorrar tiempo».", linea: true, max: 120 }
      ] },
    { id: "pregunta", mov: "entender", fase: "def", escena: "07-tu-pregunta", t: "Tu pregunta",
      h: "De lo que oíste, a «¿Cómo podríamos…?»",
      d: "El punto de vista junta persona, necesidad e insight. La pregunta abre la puerta a muchas ideas sin traer la respuesta puesta.",
      ia: { h: "Decidir qué pregunta refleja lo que viste.", m: "Te da encuadres amplios, estrechos y justos para comparar: más maneras de plantear el problema." },
      caso: { t: "Caso · Embrace (d.school, 2007)", x: "El reto era una incubadora al 1 % del costo de una de USD 20 000. En Katmandú, el equipo vio incubadoras vacías: los bebés morían en aldeas sin electricidad. Cambiaron la pregunta y crearon una bolsa térmica reutilizable que no necesita electricidad constante. Embrace Global informa más de 1,3 millones de bebés abrigados desde 2011.",
        f: "EDUCAUSE Review (2015), «Using Design Thinking in Higher Education»; The Case Centre (2019); embraceglobal.org (consultado en noviembre de 2026)." },
      clave: ["pov", "hmw"],
      b: [
        { k: "formula", x: "<i>Persona</i> necesita <i>necesidad</i> porque <i>insight</i>." },
        { k: "ejemplo", t: "Ver el ejemplo con el caso Cybex", x: "<b>Punto de vista:</b> quien entra al gimnasio de un hotel necesita sentirse seguro en la caminadora, porque teme caerse y se agarra de lo que encuentra.<br><b>¿Cómo podríamos</b> hacer que alguien se sienta seguro desde el primer paso?" },
        { k: "campo", id: "pov", t: "Mi punto de vista", max: 240 },
        { k: "campo", id: "hmw", t: "Mi pregunta «¿Cómo podríamos…?»", ayuda: "Ni tan amplia que no diga nada, ni tan estrecha que ya traiga la solución.", max: 200, ph: "¿Cómo podríamos…?" },
        { k: "claude", id: "p-hmw", t: "Afina tu pregunta", d: "Claude te muestra preguntas demasiado amplias, demasiado estrechas y justas.", req: ["pov", "hmw"],
          x: "Mi punto de vista: {{pov}}\nMi pregunta: {{hmw}}\n\n1. ¿Mi pregunta es demasiado amplia, demasiado estrecha o justa? Explícalo en una línea.\n2. Escríbeme 6 variantes: 2 demasiado amplias, 2 demasiado estrechas (que ya traen la solución) y 2 justas, rotuladas.\nTodavía no propongas soluciones." },
        { k: "muro", campo: "hmw", boton: "Publicar mi pregunta", d: "Dale ♥ a las preguntas que te den ganas de idear." }
      ] },
    { id: "ideas", mov: "imaginar", fase: "ide", escena: "02-lluvia-de-ideas", t: "Ideas",
      h: "Primero tú, después Claude",
      d: "Cinco minutos de ideas tuyas en el tablero, una por nota y sin juzgar. Cuando tengas al menos cinco, Claude suma las que no se te ocurrieron.",
      ia: { h: "Ir primero tú. Las ideas de la IA se parecen entre sí, y verlas antes de pensar puede fijarte en ellas: menos ideas, menos variadas.",
        m: "Volumen y variedad. En un estudio de Wharton, la IA generativa (GPT-4) dio ideas más rápido y más barato que estudiantes de MBA, con mayor intención de compra promedio, y la mayoría de las mejores fueron suyas.",
        ev: "Girotra, Meincke, Terwiesch y Ulrich (2023), «Ideas are dimes a dozen», Wharton · Doshi y Hauser (2024), Science Advances 10(28) · Wadinambiarachchi et al. (2024), CHI." },
      caso: { t: "Caso · El carrito de IDEO (1999)", x: "Nightline, de ABC, le dio a IDEO cinco días para rediseñar el carrito de supermercado. Un equipo de ingeniería, psicología, lingüística y biología observó tiendas, hizo lluvias de ideas, construyó prototipos y los probó con compradores y empleados.",
        f: "IDEO (2000), «Reimagining the Shopping Cart»; Kelley, T. (2001), The Art of Innovation." },
      clave: ["ideas"],
      b: [
        { k: "reloj", s: 300, t: "5 minutos, solo tú", d: "Antes de abrir Claude. La meta: 15 ideas." },
        { k: "tablero", modo: "idear" },
        { k: "claude", id: "p-ideas", t: "Suma ideas y aplica SCAMPER", d: "Se activa con 5 ideas tuyas. Claude no evalúa todavía: agrega variedad y deforma tu favorita.", req: ["hmw", "ideas"], min: { ideas: 5 },
          x: "Mi pregunta: {{hmw}}\n\nMis ideas (la que tiene * es mi favorita):\n{{ideas}}\n\n1. No las evalúes todavía.\n2. Agrega 10 ideas distintas a las mías y rotúlalas: 3 SEGURAS, 4 RARAS y 3 que ROMPAN UNA REGLA de mi rubro.\n3. Aplica SCAMPER a mi idea favorita: una variante por letra (Sustituir, Combinar, Adaptar, Modificar, Poner otro uso, Eliminar, Reordenar)." },
        { k: "consejos", t: "Las reglas de la lluvia de ideas", items: [
          ["Cantidad antes que calidad", "«Para tener una buena idea necesitas muchas» (Linus Pauling, citado por Utley)."],
          ["Nada de «sí, pero…»", "Hoy no se evalúa: se elige en la estación Elegir."],
          ["Construye sobre otras", "«Y si además…» vale más que una idea suelta."]] }
      ] },
    { id: "crazy8", mov: "imaginar", fase: "ide", escena: "03-crazy-8", t: "Crazy 8",
      h: "Ocho ideas, ocho minutos, una hoja",
      d: "Dobla una hoja en ocho. Dibuja una idea por minuto: dibujar obliga a pensar cómo se vería, no solo cómo se llama.",
      ia: { h: "Dibujar te obliga a imaginar cómo se ve la idea. Ocho minutos sin pantalla.", m: "Nada, a propósito. Esta estación es a mano." },
      clave: ["idea_rara"],
      b: [
        { k: "reloj", s: 480, t: "8 minutos", d: "Cada minuto, al siguiente recuadro. Monitos y flechas bastan." },
        { k: "consejos", t: "Cómo se hace", abierto: true, items: [
          ["Dobla la hoja tres veces", "Quedan 8 recuadros."],
          ["Una idea por recuadro", "De tu lista o nueva. Una variante también vale."],
          ["Muéstralas a la cámara", "El grupo ve tus 8 ideas en 10 segundos."]] },
        { k: "campo", id: "idea_rara", t: "Mi idea más rara", linea: true, max: 160 },
        { k: "muro", campo: "idea_rara", boton: "Publicar mi idea rara", d: "Las ideas raras de hoy son los prototipos sorprendentes de mañana." }
      ] },
    { id: "elegir", mov: "imaginar", fase: "ide", escena: "04-elige", t: "Elegir",
      h: "Elige con tres criterios, no con uno",
      d: "Si eliges solo por presupuesto, siempre gana lo de siempre. Marca tus ideas con tres criterios distintos, como los puntos de colores de Klebahn.",
      video: ["v5-elegir-y-prototipar.mp4", "Video · Elegir y prototipar rápido (40 s)"],
      ia: { h: "La decisión. En un experimento con 758 consultores, en una tarea de juicio fuera del alcance de la IA, quienes usaron GPT-4 acertaron 19 puntos menos.",
        m: "Compara cada idea con cada criterio por separado y te dice qué aprenderías al probarla.",
        ev: "Dell'Acqua, McFowland, Mollick et al. (2023), «Navigating the Jagged Technological Frontier», Harvard Business School; Organization Science (2026)." },
      clave: ["top3", "idea"],
      b: [
        { k: "criterios", items: [["c1", "La que más encantaría", "a la persona de tu entrevista, no a ti"], ["c2", "La más rápida de probar", "esta semana y con menos de S/ 50"], ["c3", "La más audaz", "la que nadie de tu rubro se atrevería"]] },
        { k: "tablero", modo: "votar" },
        { k: "campo", id: "top3", t: "Mis 3 finalistas", ayuda: "Se llenan con las notas que más puntos tienen; puedes editarlos.", filas: 3, lineas: true },
        { k: "claude", id: "p-elegir", t: "Compara sin decidir por ti", d: "Claude evalúa cada criterio por separado; decides tú.", req: ["hmw", "top3"],
          x: "Estoy resolviendo: {{hmw}}\nPara: {{usuario}}\n\nMis 3 finalistas:\n{{top3}}\n\nEvalúalas con 3 criterios POR SEPARADO, sin un ranking único: 1) cuánto le encantaría a la persona, 2) qué tan rápido la pruebo esta semana con menos de S/ 50, 3) qué tan audaz es. Dame una tabla y, para cada idea, qué aprendería si la pruebo primero. No elijas por mí." },
        { k: "campo", id: "idea", t: "La idea que pruebo primero", ayuda: "Si dudas entre dos, prototipa las dos: es un portafolio.", max: 200 }
      ] },
    { id: "mvp", mov: "imaginar", fase: "pro", escena: "05-tu-mvp", t: "MVP",
      h: "Feo, rápido y que se pueda usar",
      d: "Bill soldó barras a una caminadora. Tu MVP (la versión mínima de tu idea) no tiene que ser software: tiene que dejar que alguien lo use cinco minutos.",
      ia: { h: "Que sea lo bastante feo y barato para tirarlo sin pena.",
        m: "Lo que antes pedía saber programar o diseñar, una pantalla que se puede tocar, Claude lo arma en minutos. En tareas creativas, los consultores con GPT-4 hicieron 12,2 % más tareas, 25,1 % más rápido y con más de 40 % de mejor calidad.",
        ev: "Dell'Acqua et al. (2023), Harvard Business School y BCG." },
      clave: ["mvp_tipo", "mvp"],
      b: [
        { k: "select", id: "mvp_tipo", t: "Tipo de MVP", ayuda: "El más barato que deje a alguien usarlo.", ops: ["Maqueta de papel", "Servicio actuado: tú haces de servicio", "Una pantalla que Claude arma", "Lo hago yo a mano, como si fuera automático", "Video o historieta"] },
        { k: "campo", id: "mvp", t: "Mi MVP", ayuda: "Qué es, qué hace la persona con él y qué NO incluye todavía.", filas: 5, max: 400 },
        { k: "claude", id: "p-mvp", t: "Constrúyelo con Claude", d: "Si eliges «Una pantalla que Claude arma», Claude te devuelve una página lista para mostrar.", req: ["idea", "mvp_tipo", "mvp"],
          x: "Ayúdame a construir en 15 minutos un prototipo de baja fidelidad.\nIdea: {{idea}}\nTipo de prototipo: {{mvp_tipo}}\nPara: {{usuario}}\nLo que ya pensé: {{mvp}}\n\nDame:\n1. Qué construyo exactamente (materiales, pantallas o escenas).\n2. El paso a paso para 15 minutos.\n3. Qué NO construir todavía.\nSi el tipo es «Una pantalla que Claude arma», hazme además un artifact HTML de una o dos pantallas, sencillo, con textos reales en español y solo lo necesario para que una persona lo pruebe." }
      ] },
    { id: "incognita", mov: "imaginar", fase: "pro", escena: "06-tu-incognita", t: "Incógnita",
      h: "¿Qué tiene que ser cierto para que funcione?",
      d: "Todo MVP prueba un supuesto. Escribe tu sospecha; Claude busca otros y tú eliges el que más miedo te da.",
      ia: { h: "Elegir el supuesto que más miedo te da.", m: "Saca a la luz supuestos ocultos que no veías." },
      clave: ["supuesto", "aprender"],
      b: [
        { k: "campo", id: "supuesto", t: "Mi gran incógnita", ayuda: "Lo que, si es falso, hunde tu idea.", max: 200, ph: "La gente reprograma sola si el botón está en el mismo mensaje" },
        { k: "claude", id: "p-supuestos", t: "Busca supuestos ocultos", d: "Claude lista otros; tú decides cuál pruebas.", req: ["idea", "mvp", "supuesto"],
          x: "Mi idea: {{idea}}\nMi MVP: {{mvp}}\nMi sospecha del supuesto más riesgoso: {{supuesto}}\n\n1. ¿Qué otros 3 supuestos riesgosos tiene esta idea? (Lo que, si es falso, la hunde.)\n2. ¿Cuál de todos, incluido el mío, probarías primero y por qué?\n3. Propón una prueba de 6 minutos con una persona real que mida lo que HACE, no lo que dice que haría." },
        { k: "campo", id: "aprender", t: "Cómo sabré si funciona", ayuda: "Algo que se vea o se cuente: «4 de 5 personas lo logran sin ayuda».", max: 200 }
      ] },
    { id: "guion", mov: "probar", fase: "eva", escena: "03-guion-de-prueba", t: "Guion de prueba",
      h: "Prueba sin vender: observa",
      d: "Seis minutos: la persona usa tu MVP sola, tú observas y al final preguntas. Escribe tu borrador; Claude lo limpia.",
      ia: { h: "Observar sin intervenir.", m: "Quita lo que explica de más y cambia las preguntas que buscan un «me gusta»." },
      clave: ["guion_prueba"],
      b: [
        { k: "campo", id: "guion_prueba", t: "Mi guion", ayuda: "Cómo lo presentas, 2 tareas que la persona hace sola y 4 preguntas para después.", filas: 6 },
        { k: "claude", id: "p-guion-prueba", t: "Limpia tu guion", d: "Un guion corto que no explica de más.", req: ["mvp", "guion_prueba"],
          x: "Voy a probar mi MVP con {{usuario}}.\nMVP: {{mvp}}\nLo que quiero aprender: {{aprender}}\nMi gran incógnita: {{supuesto}}\n\nMi borrador de guion:\n{{guion_prueba}}\n\nMejóralo para 6 minutos:\n1. La presentación en 2 frases, sin vender ni explicar cómo funciona.\n2. 2 tareas que la persona hace sola mientras yo observo.\n3. 4 preguntas para después, como «¿Qué esperabas que pasara?». Nada que se responda con «me gusta».\n4. Qué anoto mientras observo." }
      ] },
    { id: "prueba", mov: "probar", fase: "eva", escena: "04-prueba-en-vivo", t: "La prueba",
      h: "Tu MVP en manos de otro",
      d: "En parejas, 6 minutos cada uno. Tú callas y anotas. Si pregunta «¿y esto qué hace?», devuélvele: «¿Qué crees que hace?».",
      ia: { h: "Lo que una persona hace con tu prototipo no se simula. Westfield preguntó; Bill observó.", m: "Nada durante la prueba." },
      clave: ["gusto", "mejora"],
      b: [
        { k: "reloj", s: 360, t: "6 minutos por persona", d: "Luego cambian de rol." },
        { k: "mapa", campos: [
          { id: "gusto", t: "Le gustó", q: "¿Qué usó sin ayuda o le sacó una sonrisa?", ph: "Lo que funcionó y cómo lo notaste" },
          { id: "mejora", t: "Mejoraría", q: "¿Dónde se trabó, dudó o se quejó?", ph: "Dónde se trabó o qué criticó" },
          { id: "dudas", t: "Preguntó", q: "¿Qué preguntó? Cópialo tal cual.", ph: "Cada pregunta es un hueco del prototipo" },
          { id: "ideas_nuevas", t: "Ideas nuevas", q: "¿Qué se te ocurrió al verlo usarlo?", ph: "Lo que se te ocurrió al verlo usarlo" }] }
      ] },
    { id: "iterar", mov: "probar", fase: "eva", escena: "05-iterar", t: "Iterar",
      h: "No sabemos la respuesta hasta actuar",
      d: "Escribe tu lectura de la prueba. Volver a una fase anterior no es fracasar: es el método.",
      video: ["v8-somos-del-enfoque.mp4", "Video · Somos los del enfoque (24 s)"],
      ia: { h: "Decidir a qué fase volver.", m: "Separa lo que la persona hizo de lo que esperabas y propone la siguiente prueba más barata." },
      clave: ["iterar"],
      b: [
        { k: "campo", id: "iterar", t: "Vuelvo a la fase… porque…", max: 240 },
        { k: "claude", id: "p-iterar", t: "Contrasta tu lectura", d: "Claude separa lo que la persona hizo de lo que esperabas.", req: ["gusto", "mejora", "iterar"],
          x: "Resultados de la prueba de mi MVP ({{mvp}}):\nLe gustó: {{gusto}}\nMejoraría: {{mejora}}\nPreguntas que hizo: {{dudas}}\nIdeas nuevas: {{ideas_nuevas}}\nMi gran incógnita era: {{supuesto}}\nMi lectura: {{iterar}}\n\n1. ¿Se confirmó, se cayó o todavía no lo sé? Justifícalo con lo que la persona HIZO.\n2. ¿Estás de acuerdo con la fase a la que quiero volver? Si no, ¿a cuál y por qué?\n3. Propón la siguiente prueba más barata." }
      ] },
    { id: "pitch", mov: "probar", fase: "eva", escena: "07-tu-pitch", t: "Tu proyecto",
      h: "Las cinco fases en una nota",
      d: "Para quién, qué necesita, qué probaste y qué aprendiste. Escríbelo tú, pule con Claude y preséntalo en un minuto.",
      ia: { h: "Que suene a ti.", m: "Condensa tu versión en 200 caracteres y los cuenta por ti." },
      clave: ["pitch"],
      b: [
        { k: "formula", x: "Para <i>persona</i> que <i>necesidad</i>, probamos <i>MVP</i> y aprendimos <i>aprendizaje</i>." },
        { k: "campo", id: "pitch", t: "Mi proyecto en 200 caracteres", max: 200 },
        { k: "claude", id: "p-pitch", t: "Púlelo con Claude", d: "Claude lo pule; tú lo dejas con tus palabras.", req: ["pitch"],
          x: "Este es mi proyecto de Design Thinking en una nota: {{pitch}}\nReto: {{reto}}\nPunto de vista: {{pov}}\nLo que aprendí al probar: {{iterar}}\n\nDame 3 versiones de máximo 200 caracteres con la forma «Para [persona] que [necesidad], probamos [MVP] y aprendimos [aprendizaje]», cuenta los caracteres de cada una y no cambies lo que aprendí." },
        { k: "muro", campo: "pitch", boton: "Publicar mi proyecto", d: "Dale ♥ a los proyectos que quieras ver lanzados." }
      ] }
  ];
  var POR_ID = {}; EST.forEach(function (e, n) { e.n = n + 1; POR_ID[e.id] = e; });
  var ROTULO = { titulo: "El nombre de mi idea", adivina: "Mi apuesta", apuesta_cybex: "Mi apuesta" };
  EST.forEach(function (e) { e.b.forEach(function (b) { if (b.id && b.t && b.k !== "claude") ROTULO[b.id] = b.t; (b.campos || []).forEach(function (c) { ROTULO[c.id] = c.t; }); }); });
  EST.forEach(function (e) { ROTULO["claude_" + e.id] = "Lo que respondió Claude · " + e.t; });
  ROTULO.ideas = "Mis ideas (en el tablero)"; ROTULO.ideas_claude = "Las ideas de Claude";

  // Madurez: la idea pasa de semilla a concreta según lo que ya tiene escrito.
  var CLAVES_MADUREZ = ["reto", "usuario", "notas", "sorpresa", "pov", "hmw", "ideas", "idea", "mvp", "supuesto", "gusto", "iterar", "pitch"];
  function madurez() {
    var n = CLAVES_MADUREZ.filter(function (k) { return val(k); }).length, p = n / CLAVES_MADUREZ.length;
    return { p: p, n: n, total: CLAVES_MADUREZ.length, etapa: p < 0.25 ? "Semilla" : p < 0.5 ? "Brote" : p < 0.85 ? "Toma forma" : "Concreta" };
  }
  function estado(e) { var c = e.clave.filter(function (k) { return val(k); }).length; return c === 0 ? "vacia" : c === e.clave.length ? "lista" : "a-medias"; }
  function lineas(k) { return val(k).split("\n").filter(function (x) { return x.trim(); }).length; }

  // ================================================================ enlaces genéricos (láminas y laboratorio)
  function autoalto(el) { if (el.tagName === "TEXTAREA") { el.style.height = "auto"; el.style.height = (el.scrollHeight + 2) + "px"; } }
  function contar(el) {
    var c = el.parentNode && el.parentNode.querySelector(".cuenta"); if (!c) return;
    if (el.hasAttribute("data-lineas")) { var l = el.value.split("\n").filter(function (x) { return x.trim(); }).length; c.textContent = l + (l === 1 ? " idea" : " ideas"); return; }
    var max = +el.getAttribute("maxlength") || 0, n = el.value.length; c.textContent = max ? n + " / " + max : ""; c.classList.toggle("pasa", !!max && n > max * 0.92);
  }
  var marcaT = 0;
  function alCambiar() {
    S._t = Date.now();
    var ok = guardar();
    nubeGuardar();
    document.body.classList.toggle("sin-guardar", !ok);
    if (ok) { $$("[data-guardado]").forEach(function (g) { g.classList.add("ver"); }); clearTimeout(marcaT); marcaT = setTimeout(function () { $$("[data-guardado]").forEach(function (g) { g.classList.remove("ver"); }); }, 1600); }
    pintarEspejos(); if (window.LAB && LAB.refrescar) LAB.refrescar();
  }
  function pintarEspejos() {
    $$("[data-ver]").forEach(function (el) { var v = val(el.getAttribute("data-ver")); el.textContent = v || el.getAttribute("data-vacio") || "—"; el.classList.toggle("vacio", !v); });
    $$("[data-vista]").forEach(pintarPedido);
  }
  function buscarPedido(id) { var r = null; EST.forEach(function (e) { e.b.forEach(function (b) { if (b.k === "claude" && b.id === id) r = b; }); }); return r; }
  function rellenar(txt) { return txt.replace(/\{\{(\w+)\}\}/g, function (_, k) { return val(k) || "[" + (ROTULO[k] || k) + ": escríbelo aquí]"; }); }
  function pintarPedido(pre) {
    var b = buscarPedido(pre.getAttribute("data-vista")); if (!b) return;
    var txt = b.x; pre.textContent = "";
    var re = /\{\{(\w+)\}\}/g, ult = 0, m;
    while ((m = re.exec(txt))) {
      pre.appendChild(document.createTextNode(txt.slice(ult, m.index)));
      var v = val(m[1]); pre.appendChild(h("mark", { class: v ? "" : "falta", text: v || "[" + (ROTULO[m[1]] || m[1]) + "]" }));
      ult = re.lastIndex;
    }
    pre.appendChild(document.createTextNode(txt.slice(ult)));
  }
  function enlazar(raiz) {
    $$("[data-campo]", raiz).forEach(function (el) {
      if (el._lab) return; el._lab = 1;
      var k = el.getAttribute("data-campo");
      if (S[k] != null) el.value = S[k];
      contar(el); setTimeout(function () { autoalto(el); }, 0);
      el.addEventListener("input", function () { S[k] = el.value; contar(el); autoalto(el); alCambiar(); });
      if (el.tagName === "SELECT") el.addEventListener("change", function () { S[k] = el.value; alCambiar(); });
    });
    $$("[data-reloj]", raiz).forEach(enlazarReloj);
    $$("[data-quiz]", raiz).forEach(enlazarQuiz);
    $$("[data-muro]", raiz).forEach(enlazarMuro);
    $$(".revela[data-oculto] .dentro", raiz).forEach(function (d) { d.setAttribute("inert", ""); d.setAttribute("aria-hidden", "true"); });
    pintarEspejos();
  }
  document.addEventListener("click", function (ev) {
    var b = ev.target.closest("[data-claude]");
    if (b) {
      var pb = buscarPedido(b.getAttribute("data-claude"));
      var falta = (pb.req || []).filter(function (k) { return !val(k); });
      if (falta.length) { avisar("Primero escribe: " + falta.map(function (k) { return ROTULO[k] || k; }).join(", ") + "."); var c = $('[data-campo="' + falta[0] + '"]'); if (c) c.focus(); return; }
      for (var k in (pb.min || {})) if (lineas(k) < pb.min[k]) {
        avisar("Primero tú: llevas " + lineas(k) + " de " + pb.min[k] + " ideas. Claude entra después."); var c2 = $('[data-campo="' + k + '"]'); if (c2) c2.focus(); return;
      }
      copiar(rellenar(pb.x)).then(function (ok) {
        avisar(ok ? "Copiado. Pégalo en tu chat de Claude (claude.ai) y presiona Enter." : "No pude copiar: abre el pedido completo, selecciónalo y cópialo a mano.");
        if (ok) { b.classList.add("hecho"); setTimeout(function () { b.classList.remove("hecho"); }, 2200); }
      });
      return;
    }
    var vt = ev.target.closest("[data-ver-todo]");
    if (vt) {
      var pre = document.getElementById(vt.getAttribute("data-ver-todo")); if (!pre) return;
      var abierto = pre.classList.toggle("abierto"); vt.setAttribute("aria-expanded", String(abierto)); vt.textContent = abierto ? "Ver menos" : "Ver todo el pedido"; return;
    }
    var r = ev.target.closest("[data-revelar]");
    if (r) {
      var caja = document.getElementById(r.getAttribute("data-revelar"));
      if (caja) { caja.removeAttribute("data-oculto"); var d = $(".dentro", caja); if (d) { d.removeAttribute("inert"); d.removeAttribute("aria-hidden"); } }
      r.remove(); return;
    }
    var bi = ev.target.closest("[data-bitacora]");
    if (bi) { var md = bitacoraMd(); if (bi.getAttribute("data-bitacora") === "copiar") copiar(md).then(function (ok) { avisar(ok ? "Copiada: pégala en Claude para ponerlo al día." : "No pude copiar."); }); else descargar(md); }
  });

  function bitacoraMd() {
    var t = val("titulo") || "Mi idea", m = madurez();
    var out = ["# " + t, "", "Laboratorio de ideas · Design Thinking con Claude · madurez: " + m.etapa + " (" + m.n + " de " + m.total + ")", ""];
    MOV.forEach(function (mv) {
      var bloque = [];
      EST.filter(function (e) { return e.mov === mv.id; }).forEach(function (e) {
        var campos = [];
        e.b.forEach(function (b) { if (b.id && b.k !== "claude" && val(b.id)) campos.push("**" + b.t + ":** " + val(b.id)); (b.campos || []).forEach(function (c) { if (val(c.id)) campos.push("**" + c.t + ":** " + val(c.id)); }); });
        if (e.b.some(function (b) { return b.k === "tablero" && b.modo === "idear"; }) && Array.isArray(S.tablero) && S.tablero.length)
          campos.push("**Tablero de ideas:**\n" + S.tablero.map(function (n) { return "- " + (n.fav ? "★ " : "") + n.t + (n.de === "claude" ? " (Claude)" : "") + (puntos(n) ? " · " + CRIT.filter(function (c) { return n.v[c[0]]; }).map(function (c) { return c[1]; }).join(", ") : ""); }).join("\n"));
        if (val("claude_" + e.id)) campos.push("**Lo que respondió Claude:**\n\n" + val("claude_" + e.id));
        if (campos.length) bloque.push("### " + e.t, "", campos.join("\n\n"), "");
      });
      if (bloque.length) out.push("## " + mv.n + " · " + mv.t + " (" + mv.ses + ")", "");
      out = out.concat(bloque);
    });
    if (S.quiz) out.push("## Práctica DTPC®", "", "Puntaje: " + S.quiz, "");
    (S.practicas || []).forEach(function (pr, n) { out.push("## Idea de práctica " + (n + 1) + ": " + (pr.reto || "tema de la clase"), ""); ["pov", "hmw", "sorpresa"].forEach(function (k) { if (pr[k]) out.push("**" + ROTULO[k] + ":** " + pr[k], ""); }); });
    out.push("<!-- laboratorio-de-ideas:v1 " + encodeURIComponent(JSON.stringify(S)) + " -->", "");
    return out.join("\n");
  }
  function descargar(md) {
    var nombre = (val("titulo") || "mi-idea").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) + ".md";
    var a = h("a", { href: URL.createObjectURL(new Blob([md], { type: "text/markdown;charset=utf-8" })), download: nombre });
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 800);
    avisar("Descargué tu idea (" + nombre + "). Con ese archivo la recuperas en otro equipo.");
  }
  function recuperar(archivo, listo) {
    var lector = new FileReader();
    lector.onload = function () {
      var txt = String(lector.result || ""), datos = null;
      var m = /laboratorio-de-ideas:v1 (\S+) -->/.exec(txt);
      try { datos = m ? JSON.parse(decodeURIComponent(m[1])) : JSON.parse(txt); } catch (e) { datos = null; }
      if (!datos || typeof datos !== "object") { avisar("Ese archivo no trae una idea del laboratorio. Usa el .md que descargaste aquí."); return; }
      var n = 0; for (var k in datos) if (String(datos[k] == null ? "" : datos[k]).trim()) { S[k] = datos[k]; n++; }
      var ok = guardar(); document.body.classList.toggle("sin-guardar", !ok);
      avisar("Recuperé " + n + " piezas de tu idea."); if (listo) listo();
    };
    lector.readAsText(archivo);
  }

  function enlazarReloj(caja) {
    if (caja._lab) return; caja._lab = 1;
    var total = +caja.getAttribute("data-reloj") || 300, quedan = total, t = 0;
    var pantalla = $(".reloj", caja), b = $("[data-reloj-ir]", caja), r = $("[data-reloj-cero]", caja);
    function pinta() { var m = Math.floor(quedan / 60), s = quedan % 60; pantalla.textContent = m + ":" + (s < 10 ? "0" : "") + s; pantalla.classList.toggle("fin", quedan === 0); caja.style.setProperty("--avance", (1 - quedan / total).toFixed(4)); }
    function parar() { clearInterval(t); t = 0; b.textContent = quedan === total ? "Empezar" : "Seguir"; }
    b.addEventListener("click", function () {
      if (t) { parar(); return; }
      if (quedan === 0) quedan = total;
      b.textContent = "Pausa";
      t = setInterval(function () { quedan = Math.max(0, quedan - 1); pinta(); if (!quedan) { parar(); avisar("Tiempo."); } }, 1000);
    });
    if (r) r.addEventListener("click", function () { parar(); quedan = total; pinta(); b.textContent = "Empezar"; });
    pinta();
  }
  function enlazarQuiz(form) {
    if (form._lab) return; form._lab = 1;
    var examen = form.getAttribute("data-quiz") === "examen";
    var corregir = $("[data-corregir]", form); if (!corregir) return;
    corregir.addEventListener("click", function () {
      var bien = 0, total = 0, mal = [];
      $$(".preg fieldset", form).forEach(function (fs, n) {
        total++; var ok = fs.getAttribute("data-ok"), marcada = $("input:checked", fs);
        $$("label", fs).forEach(function (l) { l.classList.remove("bien", "mal"); var inp = $("input", l); if (inp.value === ok) l.classList.add("bien"); else if (inp.checked) l.classList.add("mal"); });
        if (marcada && marcada.value === ok) bien++; else mal.push(n + 1);
        fs.parentNode.classList.add("corregida");
      });
      var pct = Math.round(100 * bien / Math.max(1, total)), res = $("[data-quiz-res]", form), txt;
      if (examen) txt = pct >= 80 ? "Aprobarías: el examen pide 80 %." : "El examen pide 80 %. Repasa la explicación de las marcadas.";
      else txt = !mal.length ? "Todas bien." : "Lee la explicación de la " + (mal.length === 1 ? "pregunta " : "preguntas ") + mal.join(" y ") + ".";
      if (res) { res.textContent = ""; res.appendChild(h("span", { class: "puntaje", text: bien + " de " + total })); res.appendChild(document.createTextNode(txt)); }
      if (examen) { S.quiz = bien + " de " + total + " (" + pct + " %)"; guardar(); evidencia("Simulador DTPC: " + S.quiz); }
    });
  }
  function enlazarMuro(caja) {
    if (caja._lab) return; caja._lab = 1;
    var lista = h("div", { class: "muro" }); caja.appendChild(lista);
    var campo = caja.getAttribute("data-muro"), boton = $("[data-publicar]", caja), ult = "", likes = caja.hasAttribute("data-orden-likes");
    function pintar(entradas) {
      var firma = JSON.stringify(entradas); if (firma === ult) return; ult = firma; lista.textContent = "";
      if (!entradas.length) { lista.appendChild(h("p", { class: "vacio", text: "Todavía nadie publicó." })); return; }
      entradas.forEach(function (e) {
        lista.appendChild(h("article", { class: "entrada" + (e.mia ? " mia" : "") }, [
          h("span", { class: "quien", text: e.mia ? "Tú" : (e.nombre || "Alguien") }), h("p", { text: e.texto }),
          h("button", { type: "button", class: "like", "aria-pressed": String(!!e.me_gusta), disabled: e.mia ? true : null, "aria-label": "Me gusta, " + (e.likes || 0),
            onclick: function () { api("/muro/like" + (likes ? "?orden=likes" : ""), { escena: ESCENA, id: e.id }).then(function (x) { if (x.b && x.b.entradas) pintar(x.b.entradas); }); } }, ["♥ " + (e.likes || 0)])
        ]));
      });
    }
    function leer() {
      api("/muro?escena=" + encodeURIComponent(ESCENA) + (likes ? "&orden=likes" : "")).then(function (x) {
        if (x.estado === 200 && x.b) pintar(x.b.entradas || []);
        else if (!ult) { ult = "x"; lista.appendChild(h("p", { class: "vacio", text: "La galería del grupo aparece dentro del LIVE." })); }
      });
    }
    if (boton) boton.addEventListener("click", function () {
      var t = val(campo);
      if (!t) { avisar("Primero escribe: " + (ROTULO[campo] || campo) + "."); var c = $('[data-campo="' + campo + '"]'); if (c) c.focus(); return; }
      if (t.length > 200) { avisar("Son " + t.length + " caracteres: la galería acepta 200."); return; }
      boton.disabled = true;
      api("/muro" + (likes ? "?orden=likes" : ""), { escena: ESCENA, texto: t }).then(function (x) {
        boton.disabled = false;
        if (x.estado === 200) { pintar((x.b && x.b.entradas) || []); evidencia(t); avisar("Publicado en la galería del grupo."); }
        else avisar(x.estado === 0 ? "Sin conexión con el LMS. Revisa tu internet e intenta otra vez." : "No se pudo publicar. Intenta otra vez en unos segundos.");
      });
    });
    leer(); setInterval(function () { if (!document.hidden && document.body.contains(caja)) leer(); }, 6000);
  }

  // ================================================================ Rosa: el avatar de práctica (sesión 1)
  // Personaje FICTICIO para practicar la entrevista de empatía, en tiempo real: el alumno escribe o dicta, Rosa responde
  // con texto y voz. El cerebro es la IA de la clase del LMS (/escenario, DeepSeek): su historia y su secreto viven en
  // live/dtc-01/05-tu-entrevista/escenario.json, no en esta página. Rosa solo cuenta el secreto si le preguntan bien
  // (historias y repreguntas); a las preguntas cerradas responde con cortesía, como la gente real.
  var ROSA_ESCENA = "05-tu-entrevista";
  var RE_REPREGUNTA = /(por\s*qu[eé]|c[oó]mo te sentiste|qu[eé] sentiste|c[oó]mo te hizo sentir|qu[eé] hiciste despu[eé]s|y despu[eé]s|qu[eé] pensaste|qu[eé] pas[oó] despu[eé]s)/i;
  var RE_CERRADA = /^\s*¿?\s*(y\s+)?(te\s+(gustar|servir|ayudar|parece|conviene)|usar[ií]as|ser[ií]a|es\s+porque|verdad|no\s+crees|crees\s+que|tienes|has\s+pensado|quisieras|podr[ií]as|estar[ií]as|pagar[ií]as|preferir[ií]as|se\s+te\s+olvida)/i;
  var RE_HISTORIA = /(cu[eé]ntame|c[oó]mo fue|qu[eé] pas[oó]|la [uú]ltima vez|descr[ií]beme|h[aá]blame de|c[oó]mo es un d[ií]a)/i;
  var RE_SOLUCION = /(app|aplicaci[oó]n|recordatorio|whatsapp|bot\b|sistema|notificaci|alarma)/i;

  function rosaHistorial() { return Array.isArray(S.rosa) ? S.rosa : (S.rosa = []); }
  function rosaRepreguntas() { return rosaHistorial().filter(function (t) { return RE_REPREGUNTA.test(t.p); }).length; }
  function rosaCoach(q) {
    if (RE_CERRADA.test(q) && RE_SOLUCION.test(q)) return "Ofreciste una solución: Rosa dirá que sí por cortesía, como en Westfield.";
    if (RE_CERRADA.test(q)) return "Pregunta cerrada: invita a una historia («Cuéntame la última vez que…»).";
    if (RE_REPREGUNTA.test(q)) return "Bien: repreguntaste. Sigue tirando del hilo.";
    if (RE_HISTORIA.test(q)) return "Bien: pediste una historia. Ahora pregunta «¿por qué?».";
    return "Escucha y repregunta lo que te sorprenda.";
  }

  // Voz de Rosa: una voz femenina en español del navegador; si no hay, la del servidor (Piper); si no, solo texto.
  var VOZ_FEM = /(paulina|m[oó]nica|sabina|helena|laura|dalia|elvira|paloma|luciana|francisca|marisol|soledad|ximena|camila|valeria|renata|google espa[nñ]ol)/i;
  function vozRosa() {
    if (!window.speechSynthesis) return null;
    var vs = window.speechSynthesis.getVoices().filter(function (v) { return /^es/i.test(v.lang); });
    return vs.filter(function (v) { return VOZ_FEM.test(v.name) && /(MX|US|419|PE|CO|AR|CL)/i.test(v.lang); })[0] || vs.filter(function (v) { return VOZ_FEM.test(v.name); })[0] || null;
  }
  try { if (window.speechSynthesis) { window.speechSynthesis.getVoices(); window.speechSynthesis.onvoiceschanged = function () { }; } } catch (e) { /* sin voz */ }
  var audioCtx = null, fuente = null;
  function callarRosa() {
    try { if (fuente) fuente.stop(); } catch (e) { /* ya paró */ } fuente = null;
    try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) { /* sin voz */ }
  }
  function hablarRosa(texto, boca) {
    callarRosa();
    var v = vozRosa();
    if (v) return new Promise(function (ok) {
      var u = new SpeechSynthesisUtterance(texto); u.voice = v; u.lang = v.lang; u.rate = 1.02; u.pitch = 1.05;
      var t = setInterval(function () { boca(0.25 + Math.random() * 0.75); }, 110);
      u.onend = u.onerror = function () { clearInterval(t); boca(0); ok(); };
      window.speechSynthesis.speak(u);
    });
    var C = window.AudioContext || window.webkitAudioContext; if (!C) return Promise.resolve();
    if (!audioCtx) audioCtx = new C();
    return fetch("/api/v1/live/" + encodeURIComponent(LECCION || "dtc-01") + "/voz", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ texto: texto.slice(0, 700) }) })
      .then(function (r) { if (!r.ok) throw new Error("voz"); return r.arrayBuffer(); })
      .then(function (buf) { return new Promise(function (ok, mal) { audioCtx.decodeAudioData(buf, ok, mal); }); })
      .then(function (ab) {
        return new Promise(function (ok) {
          var src = audioCtx.createBufferSource(), an = audioCtx.createAnalyser(); an.fftSize = 256;
          src.buffer = ab; src.connect(an); an.connect(audioCtx.destination);
          var datos = new Uint8Array(an.frequencyBinCount), vivo = true;
          (function paso() { if (!vivo) return; an.getByteTimeDomainData(datos); var m = 0; for (var k = 0; k < datos.length; k++) m = Math.max(m, Math.abs(datos[k] - 128)); boca(Math.min(1, m / 50)); requestAnimationFrame(paso); })();
          src.onended = function () { vivo = false; boca(0); fuente = null; ok(); };
          fuente = src; src.start();
        });
      }).catch(function () { boca(0); });
  }

  // Dictado: Web Speech (es-PE); si el navegador no lo da, se graba y transcribe el servidor (/transcribir).
  function aWav(blob) {
    return blob.arrayBuffer().then(function (buf) {
      var C = window.AudioContext || window.webkitAudioContext, ctx = new C();
      return new Promise(function (ok, mal) { ctx.decodeAudioData(buf, ok, mal); }).then(function (ab) {
        ctx.close();
        var n = Math.max(1, Math.ceil(ab.duration * 16000)), off = new OfflineAudioContext(1, n, 16000), src = off.createBufferSource();
        src.buffer = ab; src.connect(off.destination); src.start(); return off.startRendering();
      });
    }).then(function (ab) {
      var d = ab.getChannelData(0), out = new DataView(new ArrayBuffer(44 + d.length * 2));
      function txt(o, s) { for (var k = 0; k < s.length; k++) out.setUint8(o + k, s.charCodeAt(k)); }
      txt(0, "RIFF"); out.setUint32(4, 36 + d.length * 2, true); txt(8, "WAVEfmt "); out.setUint32(16, 16, true);
      out.setUint16(20, 1, true); out.setUint16(22, 1, true); out.setUint32(24, 16000, true); out.setUint32(28, 32000, true);
      out.setUint16(32, 2, true); out.setUint16(34, 16, true); txt(36, "data"); out.setUint32(40, d.length * 2, true);
      for (var k = 0; k < d.length; k++) { var v = Math.max(-1, Math.min(1, d[k])); out.setInt16(44 + k * 2, v < 0 ? v * 0x8000 : v * 0x7fff, true); }
      var bytes = new Uint8Array(out.buffer), bin = "";
      for (var k2 = 0; k2 < bytes.length; k2 += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(k2, k2 + 0x8000));
      return btoa(bin);
    });
  }
  function dictado(boton, campo, decir, alTerminar) {
    var Reco = window.SpeechRecognition || window.webkitSpeechRecognition, grabar = !Reco, reco = null, oyendo = false, grab = null, flujo = null, trozos = [], tope = null;
    function pintar() { boton.setAttribute("aria-pressed", String(oyendo)); boton.querySelector("span").textContent = oyendo ? "Detener" : "Hablar"; boton.classList.toggle("oyendo", oyendo); }
    function poner(t) { campo.value = t; campo.dispatchEvent(new Event("input", { bubbles: true })); }
    function detener() { clearTimeout(tope); if (reco) { try { reco.stop(); } catch (e) { /* ya */ } } if (grab && grab.state !== "inactive") grab.stop(); oyendo = false; pintar(); }
    function conReco() {
      var base = ""; reco = new Reco(); reco.lang = "es-PE"; reco.interimResults = true; reco.continuous = false;
      reco.onresult = function (e) { var fin = "", par = ""; for (var i = e.resultIndex; i < e.results.length; i++) { if (e.results[i].isFinal) fin += e.results[i][0].transcript; else par += e.results[i][0].transcript; } if (fin) base += fin; poner((base + par).trim()); };
      reco.onerror = function (e) {
        if (e.error === "not-allowed") decir("Permiso de micrófono denegado: actívalo en el candado de la barra de direcciones.");
        else if (/network|service-not-allowed|audio-capture|language-not-supported/.test(e.error)) { grabar = true; decir("El dictado del navegador no está disponible: pulsa «Hablar» otra vez y grabaré tu voz."); }
      };
      reco.onend = function () { reco = null; var estaba = oyendo; oyendo = false; pintar(); if (estaba && campo.value.trim() && alTerminar) alTerminar(); };
      try { reco.start(); oyendo = true; pintar(); decir("Te escucho… pregunta con calma."); tope = setTimeout(detener, 30000); } catch (e) { reco = null; grabar = true; decir("Pulsa «Hablar» otra vez: grabaré tu voz."); }
    }
    function conGrabadora() {
      if (!navigator.mediaDevices || !window.MediaRecorder) { decir("Este navegador no da el micrófono: escribe tu pregunta."); return; }
      navigator.mediaDevices.getUserMedia({ audio: true }).then(function (f) {
        flujo = f; trozos = []; grab = new MediaRecorder(f);
        grab.ondataavailable = function (e) { if (e.data && e.data.size) trozos.push(e.data); };
        grab.onstop = function () {
          flujo.getTracks().forEach(function (t) { t.stop(); });
          if (!trozos.length) return; decir("Transcribiendo tu voz…"); boton.disabled = true;
          aWav(new Blob(trozos, { type: grab.mimeType || "audio/webm" })).then(function (b64) { return api("/transcribir", { audio: b64 }); })
            .then(function (x) { var t = String((x.b && x.b.texto) || "").trim(); if (t) { poner(t); if (alTerminar) alTerminar(); } else decir("No se entendió. Habla más cerca del micrófono."); })
            .finally(function () { boton.disabled = false; });
        };
        grab.start(); oyendo = true; pintar(); decir("Grabando (máximo 20 s)… pulsa «Detener» al terminar."); tope = setTimeout(detener, 20000);
      }, function () { decir("Permiso de micrófono denegado: escribe tu pregunta."); });
    }
    boton.addEventListener("click", function () { if (oyendo) { detener(); return; } callarRosa(); if (grabar) conGrabadora(); else conReco(); });
  }

  var CARA = '<svg class="rosa-cara" viewBox="0 0 120 120" role="img" aria-label="Rosa, personaje de práctica">' +
    '<circle cx="60" cy="60" r="58" class="fondo"/>' +
    '<path class="ropa" d="M22 118c4-20 20-30 38-30s34 10 38 30z"/>' +
    '<path class="cuello" d="M52 80h16v12c-5 4-11 4-16 0z"/>' +
    '<path class="pelo" d="M31 62c-2-24 12-38 29-38s31 14 29 38c-2-6-4-14-10-20-6 4-22 6-38 0-6 6-8 14-10 20z"/>' +
    '<circle class="pelo" cx="60" cy="22" r="9"/>' +
    '<ellipse class="piel" cx="60" cy="58" rx="24" ry="29"/>' +
    '<path class="pelo" d="M36 52c2-14 12-22 24-22s22 8 24 22c-8-8-16-11-24-11s-16 3-24 11z"/>' +
    '<g class="cejas"><path class="ceja ci" d="M45 50q5-3 10 0"/><path class="ceja cd" d="M65 50q5-3 10 0"/></g>' +
    '<g class="ojos"><ellipse cx="50" cy="58" rx="2.4" ry="3"/><ellipse cx="70" cy="58" rx="2.4" ry="3"/></g>' +
    '<path class="nariz" d="M60 61q-2 6 1 7"/>' +
    '<path class="boca" d="M52 74q8 4 16 0"/>' +
    '<ellipse class="boca-abierta" cx="60" cy="75" rx="5" ry="0"/></svg>';
  var BOCAS = { tranquila: "M52 74q8 4 16 0", dudosa: "M52 75q8 0 16-1", incomoda: "M52 76q8-3 16 0", emocionada: "M51 73q9 7 18 0", seria: "M52 75q8 0 16 0" };

  function bloqueRosa(e) {
    var hist = rosaHistorial();
    var log = h("div", { class: "rosa-log", "aria-live": "polite" });
    var cara = h("div", { class: "rosa-retrato", html: CARA });
    var svg = $("svg", cara), boca = $(".boca", cara), bocaA = $(".boca-abierta", cara);
    var r3d = null, caja3d = null;
    function gesto(g) { g = BOCAS[g] ? g : "tranquila"; svg.setAttribute("data-gesto", g); boca.setAttribute("d", BOCAS[g]); if (r3d) r3d.gesto(g); }
    function abrir(n) { bocaA.setAttribute("ry", (n * 4.5).toFixed(2)); if (r3d) r3d.boca(n); }
    // Rosa 3D (rosa3d.js: Rocketbox Female_Adult_11, Three.js). Sin WebGL2 o en un equipo débil queda el dibujo SVG.
    function volverAlSvg() { r3d = null; if (caja3d && caja3d.parentNode) caja3d.replaceWith(cara); }
    if (window.Rosa3D && window.Rosa3D.disponible()) {
      caja3d = h("div", { class: "rosa-3d" }); caja3d.appendChild(cara);
      window.Rosa3D.montar(caja3d, { alPerder: volverAlSvg }).then(function (r) {
        r3d = r; r3d.gesto(svg.getAttribute("data-gesto") || "tranquila");
        if (cara.classList.contains("descubierto")) r3d.descubierto({ inmediato: true });
      }, volverAlSvg);
    }
    var campo = h("textarea", { class: "rosa-campo", rows: 2, placeholder: "Escribe o dicta tu pregunta a Rosa…", "aria-label": "Tu pregunta a Rosa", maxlength: 300 });
    var estado = h("p", { class: "rosa-estado quieto", role: "status" });
    var chipR = h("span", { class: "rosa-chip" }), chipI = h("span", { class: "rosa-chip" });
    var voz = h("input", { type: "checkbox", id: "rosa-voz", checked: S.rosaMuda ? null : true });
    var bHablar = h("button", { type: "button", class: "boton sec", html: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg><span>Hablar</span>' });
    var bPreguntar = h("button", { type: "button", class: "boton", html: "Preguntar " + ICO.flecha });
    function pintarEstado() {
      var rev = hist.some(function (t) { return t.rev === "si"; }) ? "si" : hist.some(function (t) { return t.rev === "pista"; }) ? "pista" : "no";
      chipR.textContent = "Repreguntas: " + rosaRepreguntas();
      chipI.textContent = rev === "si" ? "Insight: descubierto" : rev === "pista" ? "Insight: asomó" : "Insight: oculto";
      chipI.className = "rosa-chip" + (rev === "si" ? " si" : rev === "pista" ? " pista" : "");
      return rev;
    }
    function burbuja(quien, texto, g) { log.appendChild(h("div", { class: "rosa-b " + quien }, [h("span", { class: "quien", text: quien === "tu" ? "Tú" : "Rosa" }), h("p", { text: texto })])); log.scrollTop = log.scrollHeight; }
    hist.forEach(function (t) { burbuja("tu", t.p); burbuja("rosa", t.r); });
    if (!hist.length) log.appendChild(h("p", { class: "rosa-vacio", text: "Rosa espera tu primera pregunta. Empieza por una historia: «Cuéntame la última vez que…»." }));
    if (hist.length) gesto(hist[hist.length - 1].g);
    function preguntar() {
      var q = campo.value.replace(/\s+/g, " ").trim();
      if (q.length < 4) { avisar("Escribe o dicta una pregunta."); campo.focus(); return; }
      var vacio = $(".rosa-vacio", log); if (vacio) vacio.remove();
      burbuja("tu", q); campo.value = ""; bPreguntar.disabled = true; estado.textContent = rosaCoach(q) + " · Rosa está pensando…";
      var muestra = { conversacion: hist.slice(-6).map(function (t) { return { p: t.p.slice(0, 300), r: t.r.slice(0, 400) }; }), repreguntas: rosaRepreguntas() + (RE_REPREGUNTA.test(q) ? 1 : 0) };
      api("/escenario", { escena: ROSA_ESCENA, pedido: q.slice(0, 300), empresa: { razon: "Rosa (personaje de práctica)", rubro: "entrevista de empatía", regimen: "Design Thinking" }, muestra: muestra }).then(function (x) {
        bPreguntar.disabled = false;
        var fila = x.estado === 200 && x.b && x.b.escenario && x.b.escenario.tablas && (x.b.escenario.tablas.Respuesta || [])[0];
        if (!fila || !fila[0]) {
          var msg = x.estado === 429 ? "Llegaste al tope de preguntas de hoy." : x.estado === 503 ? "Rosa no está disponible: el profe debe activar la IA de la clase para este grupo." : x.estado === 404 ? "Rosa atiende en la sesión 1." : x.estado === 0 ? "Sin conexión con el LMS." : "Rosa no respondió. Pregunta otra vez.";
          estado.textContent = msg; burbuja("rosa", "…"); return;
        }
        var t = { p: q, r: String(fila[0]), g: String(fila[1] || "tranquila"), rev: String(fila[2] || "no") };
        hist.push(t); S.rosa = hist; guardar();
        burbuja("rosa", t.r); gesto(t.g);
        var antes = cara.classList.contains("descubierto"), rev = pintarEstado();
        estado.textContent = rosaCoach(q);
        if (rev === "si" && !antes) { cara.classList.add("descubierto"); if (r3d) r3d.descubierto(); avisar("Descubriste lo que Rosa no decía. Anótalo en «Lo que me sorprendió»."); evidencia("Rosa: insight descubierto con " + rosaRepreguntas() + " repreguntas"); }
        if (voz.checked) hablarRosa(t.r, abrir);
      });
    }
    bPreguntar.addEventListener("click", preguntar);
    campo.addEventListener("keydown", function (ev) { if (ev.key === "Enter" && !ev.shiftKey) { ev.preventDefault(); preguntar(); } });
    voz.addEventListener("change", function () { S.rosaMuda = !voz.checked; guardar(); if (!voz.checked) callarRosa(); });
    dictado(bHablar, campo, function (t) { estado.textContent = t; }, preguntar);
    var bNotas = h("button", { type: "button", class: "boton sec", text: "Pasar la entrevista a mis notas", onclick: function () {
      if (!hist.length) { avisar("Primero entrevista a Rosa."); return; }
      var notas = hist.map(function (t) { return "P: " + t.p + "\nRosa: «" + t.r + "»"; }).join("\n\n");
      S.notas = (val("notas") ? val("notas") + "\n\n" : "") + notas; S.entrevistado = val("entrevistado") || "Rosa Huamán, 38, asistente contable (personaje de práctica)";
      guardar(); alCambiar(); var n = $('[data-campo="notas"]'); if (n) { n.value = S.notas; autoalto(n); n.focus(); }
      avisar("Pasé la entrevista a «Lo que dijo, tal cual». Sigue con el mapa de empatía.");
    } });
    var armado = 0;
    var bNueva = h("button", { type: "button", class: "boton texto", text: "Empezar de nuevo", onclick: function () {
      if (Date.now() - armado > 3000) { armado = Date.now(); bNueva.textContent = "¿Seguro? Toca otra vez"; setTimeout(function () { bNueva.textContent = "Empezar de nuevo"; }, 3000); return; }
      S.rosa = []; guardar(); callarRosa(); if (r3d) r3d.destruir(); ir_(e.id);
    } });
    pintarEstado(); gesto(hist.length ? hist[hist.length - 1].g : "tranquila");
    if (hist.some(function (t) { return t.rev === "si"; })) cara.classList.add("descubierto");
    return h("section", { class: "rosa", "aria-label": "Entrevista a Rosa, personaje de práctica" }, [
      h("div", { class: "rosa-cab" + (caja3d ? " con-3d" : "") }, [caja3d || cara, h("div", null, [h("h2", { class: "h3", text: "Rosa Huamán, 38" }), h("p", { class: "quieto", text: "Asistente contable en Surquillo. Falta a sus citas médicas." }), h("p", { class: "rosa-ficticia", text: "Personaje ficticio de práctica · responde la IA de la clase" }),
        h("div", { class: "fila rosa-chips" }, [chipR, chipI])])]),
      log,
      h("div", { class: "rosa-entrada" }, [campo, h("div", { class: "fila" }, [bHablar, bPreguntar, h("label", { class: "rosa-voz", for: "rosa-voz" }, [voz, " Rosa responde en voz alta"])])]),
      estado,
      h("div", { class: "fila" }, [bNotas, bNueva])]);
  }
  var ir_ = function () { };

  // ================================================================ tablero de la lluvia de ideas
  // Notas tipo post-it: las tuyas (amarillas) y las que trae Claude (color Claude). En «Idear» se escriben,
  // se marca la favorita y se borran; en «Elegir» cada nota recibe puntos de tres criterios (verde, azul,
  // morado) y las que más tienen pasan a finalistas. Vive en S.tablero; S.ideas y S.ideas_claude salen de él
  // para que los pedidos a Claude, la madurez y la ficha sigan funcionando.
  var CRIT = [["c1", "Encanta"], ["c2", "Rápida"], ["c3", "Audaz"]];
  function tablero() {
    if (!Array.isArray(S.tablero)) {
      S.tablero = [];
      val("ideas").split("\n").forEach(function (l) { var t = l.replace(/^\s*\*\s*/, "").trim(); if (t) S.tablero.push({ id: nuevoId(), t: t, de: "yo", fav: /^\s*\*/.test(l), v: {} }); });
      val("ideas_claude").split("\n").forEach(function (l) { var t = l.trim(); if (t) S.tablero.push({ id: nuevoId(), t: t, de: "claude", fav: false, v: {} }); });
    }
    return S.tablero;
  }
  function nuevoId() { return "n" + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36); }
  function derivarIdeas() {
    var tb = tablero();
    S.ideas = tb.filter(function (n) { return n.de === "yo"; }).map(function (n) { return (n.fav ? "* " : "") + n.t; }).join("\n");
    S.ideas_claude = tb.filter(function (n) { return n.de === "claude"; }).map(function (n) { return n.t; }).join("\n");
  }
  function puntos(n) { return CRIT.filter(function (c) { return n.v && n.v[c[0]]; }).length; }
  function bloqueTablero(b) {
    var votar = b.modo === "votar";
    var caja = h("div", { class: "tablero-notas" + (votar ? " votar" : ""), role: "list" });
    var conteo = h("span", { class: "quieto tablero-n", "aria-live": "polite" });
    function cambio() { derivarIdeas(); alCambiar(); pintar(); }
    function nota(n) {
      var texto = h("textarea", { class: "nota-t", rows: 3, "aria-label": "Idea", maxlength: 160 });
      texto.value = n.t;
      texto.addEventListener("input", function () { n.t = texto.value; autoalto(texto); derivarIdeas(); alCambiar(); });
      texto.addEventListener("blur", function () { if (!texto.value.trim()) { S.tablero = tablero().filter(function (x) { return x !== n; }); cambio(); } });
      var hijos = [h("span", { class: "nota-de", text: n.de === "claude" ? "Claude" : "Tú" }), texto];
      if (votar) {
        hijos.push(h("div", { class: "nota-puntos" }, CRIT.map(function (c) {
          return h("button", { type: "button", class: "punto-voto " + c[0], "aria-pressed": String(!!(n.v && n.v[c[0]])), "aria-label": c[1] + ": " + n.t.slice(0, 40), title: c[1],
            onclick: function () { n.v = n.v || {}; n.v[c[0]] = !n.v[c[0]]; cambio(); } });
        }).concat([h("button", { type: "button", class: "enlace nota-elegir", text: val("idea") === n.t ? "La pruebo primero" : "Probar esta", onclick: function () { S.idea = n.t; alCambiar(); var el = $('[data-campo="idea"]'); if (el) { el.value = n.t; autoalto(el); contar(el); } pintar(); avisar("Elegida para probar primero."); } })])));
      } else {
        hijos.push(h("div", { class: "nota-acc" }, [
          h("button", { type: "button", class: "nota-fav", "aria-pressed": String(!!n.fav), "aria-label": "Favorita", title: "Favorita", text: n.fav ? "★" : "☆",
            onclick: function () { tablero().forEach(function (x) { if (x !== n) x.fav = false; }); n.fav = !n.fav; cambio(); } }),
          h("button", { type: "button", class: "nota-borrar", "aria-label": "Borrar idea", title: "Borrar", text: "×",
            onclick: function () { S.tablero = tablero().filter(function (x) { return x !== n; }); cambio(); } })]));
      }
      var el = h("article", { class: "nota-post de-" + n.de + (n.fav ? " fav" : "") + (val("idea") === n.t ? " elegida" : ""), role: "listitem" }, hijos);
      setTimeout(function () { autoalto(texto); }, 0);
      return el;
    }
    function pintar() {
      var tb = tablero().slice();
      if (votar) tb.sort(function (a, z) { return puntos(z) - puntos(a); });
      caja.textContent = "";
      if (!tb.length) caja.appendChild(h("p", { class: "quieto", text: votar ? "Tu tablero está vacío: vuelve a «Ideas» y escribe algunas." : "Todavía no hay ideas. Escribe la primera arriba." }));
      tb.forEach(function (n) { caja.appendChild(nota(n)); });
      var yo = tb.filter(function (n) { return n.de === "yo"; }).length, cl = tb.length - yo;
      conteo.textContent = votar ? tb.filter(function (n) { return puntos(n); }).length + " con puntos" : yo + (yo === 1 ? " idea tuya" : " ideas tuyas") + (cl ? " · " + cl + " de Claude" : "");
    }
    var hijos = [h("div", { class: "tablero-cab" }, [h("h2", { class: "h3", text: votar ? "Vota en tu tablero" : "Tablero de ideas" }), conteo])];
    if (!votar) {
      var entrada = h("input", { type: "text", class: "tablero-in", maxlength: 160, placeholder: "Escribe una idea y pulsa Enter", "aria-label": "Nueva idea" });
      function agregar() { var t = entrada.value.trim(); if (!t) { entrada.focus(); return; } tablero().unshift({ id: nuevoId(), t: t, de: "yo", fav: false, v: {} }); entrada.value = ""; cambio(); entrada.focus(); }
      entrada.addEventListener("keydown", function (ev) { if (ev.key === "Enter") { ev.preventDefault(); agregar(); } });
      hijos.push(h("div", { class: "fila tablero-fila" }, [entrada, h("button", { type: "button", class: "boton", text: "Agregar", onclick: agregar })]));
      var pega = h("textarea", { rows: 4, placeholder: "Pega aquí las ideas de Claude que te sirvan, una por línea.", "aria-label": "Ideas de Claude" });
      hijos.push(caja);
      hijos.push(h("details", { class: "respuesta" }, [h("summary", { text: "Agregar ideas de Claude al tablero" }), pega,
        h("div", { class: "fila", style: "margin-top:10px" }, [h("button", { type: "button", class: "boton claude-b", text: "Agregar al tablero", onclick: function () {
          var n = 0; pega.value.split("\n").forEach(function (l) { var t = l.replace(/^\s*([-*•]|\d+[.)])\s*/, "").trim(); if (t) { tablero().push({ id: nuevoId(), t: t.slice(0, 160), de: "claude", fav: false, v: {} }); n++; } });
          if (!n) { avisar("Pega al menos una idea."); return; } pega.value = ""; cambio(); avisar("Agregué " + n + " ideas de Claude al tablero.");
        } })])]));
    } else {
      hijos.push(h("p", { class: "quieto", text: "Toca los puntos de cada nota: verde si encantaría, azul si es rápida de probar, morado si es audaz. Las que más puntos juntan suben." }));
      hijos.push(caja);
      hijos.push(h("div", { class: "fila" }, [h("button", { type: "button", class: "boton sec", text: "Usar las 3 con más puntos como finalistas", onclick: function () {
        var top = tablero().slice().filter(puntos).sort(function (a, z) { return puntos(z) - puntos(a); }).slice(0, 3);
        if (!top.length) { avisar("Primero dale puntos a algunas notas."); return; }
        S.top3 = top.map(function (n) { return n.t + " (" + CRIT.filter(function (c) { return n.v[c[0]]; }).map(function (c) { return c[1].toLowerCase(); }).join(", ") + ")"; }).join("\n");
        alCambiar(); var el = $('[data-campo="top3"]'); if (el) { el.value = S.top3; autoalto(el); contar(el); }
        avisar("Listo: tus 3 finalistas salieron del tablero.");
      } })]));
    }
    pintar();
    return h("section", { class: "tablero", "aria-label": votar ? "Votación del tablero" : "Tablero de ideas" }, hijos);
  }

  // ================================================================ tu idea en tu cuenta (base de datos del LMS)
  // GET/PUT /api/v1/laboratorio/design-thinking-claude: la misma idea en cualquier equipo y en las tres
  // sesiones, y el instructor la ve. Gana la copia con la marca de tiempo (_t) más nueva. Si el endpoint no
  // responde (sin conexión o antes de desplegarlo), todo sigue en este navegador.
  var CURSO_ID = "design-thinking-claude";
  var nube = { ok: null, timer: 0 };
  function marcaGuardado(txt) { $$("[data-guardado]").forEach(function (g) { g.textContent = txt; }); }
  function nubeGuardar() {
    clearTimeout(nube.timer);
    nube.timer = setTimeout(function () {
      fetch("/api/v1/laboratorio/" + CURSO_ID, { method: "PUT", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ datos: S }) })
        .then(function (r) { nube.ok = r.ok; marcaGuardado(r.ok ? "Guardado en tu cuenta" : "Guardado en este navegador"); })
        .catch(function () { nube.ok = false; marcaGuardado("Guardado en este navegador"); });
    }, 1200);
  }
  function nubeCargar(listo) {
    fetch("/api/v1/laboratorio/" + CURSO_ID, { credentials: "same-origin", cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error("http " + r.status); return r.json(); })
      .then(function (x) {
        nube.ok = true;
        var remoto = x && x.datos && typeof x.datos === "object" ? x.datos : null;
        var tl = +S._t || 0, tr = remoto ? +remoto._t || 0 : 0;
        if (remoto && tr > tl) {
          Object.keys(S).forEach(function (k) { delete S[k]; });
          Object.keys(remoto).forEach(function (k) { S[k] = remoto[k]; });
          guardar(); marcaGuardado("Guardado en tu cuenta"); if (listo) listo(true); return;
        }
        if (Object.keys(S).length && tl > tr) nubeGuardar();
        if (listo) listo(false);
      })
      .catch(function () { nube.ok = false; if (listo) listo(false); });
  }

  // ================================================================ el laboratorio
  var pedidoN = 0;
  function bloque(b, e) {
    var ctrl;
    switch (b.k) {
      case "campo":
        ctrl = b.linea ? h("input", { type: "text", "data-campo": b.id, maxlength: b.max || null, placeholder: b.ph || "", id: "c-" + b.id })
          : h("textarea", { "data-campo": b.id, maxlength: b.max || null, rows: b.filas || 2, placeholder: b.ph || "", id: "c-" + b.id, "data-lineas": b.lineas || null });
        return h("div", { class: "campo" }, [h("label", { for: "c-" + b.id, text: b.t }), b.ayuda ? h("small", { text: b.ayuda }) : null, ctrl, (b.max || b.lineas) ? h("span", { class: "cuenta", "aria-hidden": "true" }) : null]);
      case "select":
        ctrl = h("select", { "data-campo": b.id, id: "c-" + b.id }, [h("option", { value: "", text: "Elige…" })].concat(b.ops.map(function (o) { return h("option", { text: o }); })));
        return h("div", { class: "campo" }, [h("label", { for: "c-" + b.id, text: b.t }), b.ayuda ? h("small", { text: b.ayuda }) : null, ctrl]);
      case "claude":
        var pid = "pedido-" + (++pedidoN);
        return h("section", { class: "claude", "aria-label": "Con Claude: " + b.t }, [
          h("div", { class: "claude-cab" }, [h("span", { class: "sello", text: "Con Claude" }), h("h2", { class: "h3", text: b.t })]),
          h("p", { class: "quieto", text: b.d }),
          h("pre", { class: "pedido", "data-vista": b.id, id: pid }),
          h("button", { type: "button", class: "enlace ver-todo", "data-ver-todo": pid, "aria-expanded": "false", "aria-controls": pid, text: "Ver todo el pedido" }),
          h("div", { class: "fila" }, [h("button", { type: "button", class: "boton claude-b", "data-claude": b.id, html: "Copiar para Claude " + ICO.copia })]),
          h("details", { class: "respuesta" }, [h("summary", { text: "Guardar lo que respondió Claude" }),
            h("textarea", { "data-campo": "claude_" + e.id, rows: 4, "aria-label": "Lo que respondió Claude", placeholder: "Pega aquí la respuesta, o solo lo que te sirvió." })])]);
      case "consejo":
        return h("aside", { class: "consejo" }, [h("b", { text: b.t }), h("p", { text: b.x })]);
      case "consejos":
        return h("details", { class: "consejos", open: b.abierto || null }, [h("summary", { text: b.t }),
          h("ol", null, b.items.map(function (it) { return h("li", null, [h("b", { text: it[0] }), h("span", { text: it[1] })]); }))]);
      case "reloj":
        return h("section", { class: "reloj-caja", "data-reloj": String(b.s) }, [
          h("div", null, [h("h2", { class: "h3", text: b.t }), h("p", { class: "quieto", text: b.d })]),
          h("div", { class: "reloj", role: "timer", "aria-live": "off", text: "0:00" }),
          h("div", { class: "fila" }, [h("button", { type: "button", class: "boton", "data-reloj-ir": true, text: "Empezar" }), h("button", { type: "button", class: "boton texto", "data-reloj-cero": true, text: "Reiniciar" })])]);
      case "mapa":
        return h("div", { class: "cuadrantes" }, b.campos.map(function (c) {
          return h("div", { class: "campo cuadrante" }, [h("label", { for: "c-" + c.id, text: c.t }), c.q ? h("p", { class: "cuadrante-q", id: "q-" + c.id, text: c.q }) : null,
            h("textarea", { "data-campo": c.id, rows: 4, placeholder: c.ph || "", id: "c-" + c.id, "aria-describedby": c.q ? "q-" + c.id : null })]);
        }));
      case "traerCitas":
        return h("div", { class: "fila" }, [h("button", { type: "button", class: "boton sec", text: "Traer las frases de mis notas a «Dice»", onclick: function () {
          var citas = (val("notas").match(/«[^»]{3,}»|"[^"]{3,}"/g) || []).map(function (x) { return "«" + x.slice(1, -1).trim() + "»"; });
          if (!citas.length) { avisar("No encontré frases entre comillas en tus notas. Escríbelas en «Lo que dijo, tal cual» o directo en «Dice»."); return; }
          var ya = val("dice"), nuevas = citas.filter(function (c) { return ya.indexOf(c) < 0; });
          S.dice = (ya ? ya + "\n" : "") + nuevas.join("\n"); guardar(); alCambiar();
          var el = $('[data-campo="dice"]'); if (el) { el.value = S.dice; autoalto(el); el.focus(); }
          avisar(nuevas.length ? "Traje " + nuevas.length + " frases a «Dice». Ahora reparte lo demás." : "Esas frases ya estaban en «Dice».");
        } }), h("span", { class: "quieto", text: "Toma las frases entre comillas de tu entrevista." })]);
      case "formula": return h("p", { class: "formula", html: b.x });
      case "ejemplo": return h("details", { class: "consejos ejemplo" }, [h("summary", { text: b.t }), h("p", { html: b.x })]);
      case "criterios":
        return h("div", { class: "criterios" }, b.items.map(function (c) { return h("div", { class: "criterio " + c[0] }, [h("i", { "aria-hidden": "true" }), h("b", { text: c[1] }), h("span", { text: c[2] })]); }));
      case "tablero":
        return bloqueTablero(b);
      case "avatar":
        if (LECCION && LECCION !== "dtc-01") return h("aside", { class: "consejo" }, [h("b", { text: "Rosa fue la práctica de la sesión 1" }), h("p", { text: "Ahora tus notas salen de personas reales: anótalas en «Lo que dijo, tal cual»." })]);
        return bloqueRosa(e);
      case "tema":
        return h("section", { class: "tema" }, [h("p", { class: "ia-t", text: "El tema de hoy lo pone el profe" }), h("h2", { class: "h3", text: b.reto }), h("p", { class: "quieto", text: "Para: " + b.usuario }),
          h("div", { class: "fila" }, [h("button", { type: "button", class: "boton", text: "Usar este tema", onclick: function () {
            S.reto = b.reto; S.usuario = b.usuario; guardar(); alCambiar();
            $$('[data-campo="reto"],[data-campo="usuario"]').forEach(function (el) { el.value = S[el.getAttribute("data-campo")]; autoalto(el); contar(el); });
            avisar("Listo. Ahora arranca a tu coach en Claude.");
          } })]), h("p", { class: "quieto", text: "En la sesión 2 puedes seguir con este tema o empezar tu propia idea." })]);
      case "muro":
        if (ESCENA !== e.escena) return h("aside", { class: "consejo" }, [h("b", { text: "Galería del grupo" }), h("p", { text: "Se abre en clase, cuando el profe llega a esta estación." })]);
        return h("section", { class: "galeria", "data-muro": b.campo, "data-orden-likes": true }, [
          h("div", { class: "galeria-cab" }, [h("h2", { class: "h3", text: "Galería del grupo" }), h("p", { class: "quieto", text: b.d })]),
          h("div", { class: "fila" }, [h("button", { type: "button", class: "boton", "data-publicar": true, html: b.boton + " " + ICO.flecha })])]);
    }
    return null;
  }

  function anillo(p, r, clase) {
    var c = 2 * Math.PI * r, t = r * 2 + 6;
    return '<svg class="' + (clase || "anillo") + '" viewBox="0 0 ' + t + " " + t + '" aria-hidden="true"><circle cx="' + t / 2 + '" cy="' + t / 2 + '" r="' + r + '" class="pista"/><circle cx="' + t / 2 + '" cy="' + t / 2 + '" r="' + r + '" class="avance" stroke-dasharray="' + (c * p).toFixed(2) + " " + c.toFixed(2) + '" transform="rotate(-90 ' + t / 2 + " " + t / 2 + ')"/></svg>';
  }

  function montar(raiz, inicial) {
    var actual = inicial, anterior = null;
    var titulo = h("input", { class: "titulo-idea", type: "text", "data-campo": "titulo", maxlength: 60, placeholder: "Ponle nombre a tu idea", "aria-label": "Nombre de tu idea" });
    var mad = h("div", { class: "madurez", role: "status" });
    var bFicha = h("button", { type: "button", class: "boton texto icono", "aria-label": "Ficha de la idea", html: ICO.hoja + "<span>Ficha</span>", onclick: function () { ir(actual === "ficha" ? (anterior || inicialEst()) : "ficha"); } });
    var top = h("header", { class: "lab-top" }, [h("div", { class: "marca", html: ICO.marca + "<span>Laboratorio de ideas</span>" }), titulo,
      h("span", { class: "guardado", "data-guardado": true, text: "Guardado" }), h("span", { class: "top-hueco" }), mad, bFicha]);
    var rail = h("nav", { class: "lab-rail", "aria-label": "Estaciones del laboratorio" });
    var hoja = h("main", { class: "lab-hoja", tabindex: "-1" });
    raiz.appendChild(h("div", { class: "lab" }, [top, h("div", { class: "lab-cuerpo" }, [rail, hoja])]));
    if (!GUARDA) document.body.classList.add("sin-guardar");
    function inicialEst() { var x = EST.filter(function (e) { return alcanzado(e.mov); }); return x.length ? x[x.length - 1].id : "reto"; }

    function pintarRail() {
      rail.textContent = "";
      MOV.forEach(function (mv) {
        var ul = h("ul");
        EST.filter(function (e) { return e.mov === mv.id; }).forEach(function (e) {
          var est = estado(e), nombre = e.t + (est === "lista" ? ", completa" : est === "a-medias" ? ", a medias" : "");
          ul.appendChild(h("li", null, [h("button", { type: "button", class: "est " + est + (e.id === actual ? " actual" : ""), "aria-current": e.id === actual ? "step" : null, "aria-label": nombre, onclick: function () { ir(e.id); } },
            [h("i", { class: "punto f-" + e.fase, "aria-hidden": "true" }), h("span", { text: e.t })])]));
        });
        if (alcanzado(mv.id)) rail.appendChild(h("div", { class: "mov" }, [h("p", { class: "mov-t" }, [h("b", { text: mv.n + " · " + mv.t }), h("span", { text: mv.ses })]), ul]));
        else {
          var abre = EST.some(function (e) { return e.mov === mv.id && e.id === actual; });
          rail.appendChild(h("details", { class: "mov futuro", open: abre || null }, [h("summary", null, [h("b", { text: mv.n + " · " + mv.t }), h("span", { text: "Se abre el " + mv.fecha })]), ul]));
        }
      });
      rail.appendChild(h("button", { type: "button", class: "est ficha" + (actual === "ficha" ? " actual" : ""), "aria-current": actual === "ficha" ? "page" : null, onclick: function () { ir("ficha"); }, html: ICO.hoja + "<span>Ficha de la idea</span>" }));
      var act = $(".est.actual", rail);
      if (act && rail.scrollWidth > rail.clientWidth + 4) rail.scrollLeft = Math.max(0, act.offsetLeft - (rail.clientWidth - act.offsetWidth) / 2);
    }
    function pintarMadurez() {
      var m = madurez();
      mad.innerHTML = anillo(m.p, 9) + "<span><b>" + m.etapa + "</b><small>" + m.n + " de " + m.total + "</small></span>";
      mad.setAttribute("aria-label", "Madurez de tu idea: " + m.etapa + ", " + m.n + " de " + m.total + " piezas");
    }
    function pintarEstacion(e) {
      var kids = [h("header", { class: "cab" }, [h("h1", { text: e.h }), h("p", { class: "lead", text: e.d })]),
        h("p", { class: "aviso-guardado", role: "alert", text: "Este navegador no está guardando lo que escribes. Al terminar, ve a la ficha y descarga tu idea." })];
      if (e.video) kids.push(h("figure", { class: "video" }, [h("video", { controls: true, preload: "metadata", playsinline: true, src: "/files/" + CURSO_ID + "/materials/videos/" + e.video[0] }),
        h("figcaption", null, [h("b", { text: e.video[1] }), " Basado en Klebahn y Utley (2021), Stanford Online."])]));
      if (e.ia) kids.push(h("section", { class: "ia", "aria-label": "Quién hace qué en esta estación" }, [
        h("div", { class: "humano" }, [h("p", { class: "ia-t", text: "Sigue siendo tuyo" }), h("p", { text: e.ia.h })]),
        h("div", { class: "mejora" }, [h("p", { class: "ia-t", text: "Claude mejora aquí" }), h("p", { text: e.ia.m })]),
        e.ia.ev ? h("p", { class: "ev", text: "Evidencia: " + e.ia.ev }) : null]));
      if (e.caso) kids.push(h("details", { class: "consejos caso" }, [h("summary", { text: e.caso.t }), h("p", { class: "caso-x", text: e.caso.x }), h("p", { class: "caso-f", text: "Fuente: " + e.caso.f })]));
      e.b.forEach(function (b) { var x = bloque(b, e); if (x) kids.push(x); });
      var prev = EST[e.n - 2], next = EST[e.n];
      var alFicha = !next || (next.mov !== e.mov && !alcanzado(next.mov));
      kids.push(h("nav", { class: "pie-est", "aria-label": "Estación anterior y siguiente" }, [
        prev ? h("button", { type: "button", class: "boton texto", onclick: function () { ir(prev.id); }, html: ICO.atras + "<span>" + prev.t + "</span>" }) : h("span"),
        alFicha ? h("button", { type: "button", class: "boton sec", onclick: function () { ir("ficha"); }, html: "<span>Ver la ficha de tu idea</span>" + ICO.flecha })
          : h("button", { type: "button", class: "boton sec", onclick: function () { ir(next.id); }, html: "<span>" + next.t + "</span>" + ICO.flecha })]));
      return kids;
    }
    var SECCIONES = [
      ["entender", "El problema", [["reto", "Reto"], ["usuario", "Para quién"]]],
      ["entender", "Lo que descubrí", [["sorpresa", "Insight"], ["necesidad", "Necesidad de fondo"]]],
      ["entender", "La pregunta", [["pov", "Punto de vista"], ["hmw", "¿Cómo podríamos…?"]]],
      ["imaginar", "La idea", [["idea", "La que pruebo primero"], ["mvp_tipo", "Tipo de MVP"], ["mvp", "MVP"]]],
      ["imaginar", "La apuesta", [["supuesto", "Gran incógnita"], ["aprender", "Cómo sabré si funciona"]]],
      ["probar", "Lo que pasó", [["gusto", "Le gustó"], ["mejora", "Mejoraría"], ["iterar", "Siguiente paso"]]],
      ["probar", "En 200 caracteres", [["pitch", ""]]]
    ];
    var etapaVista = null;
    var FRASE = { Semilla: "empieza por entender a una persona", Brote: "ya entiendes a una persona real", "Toma forma": "tienes una pregunta y una idea elegida", Concreta: "la probaste con gente" };
    function pintarFicha() {
      var m = madurez();
      var nueva = etapaVista !== m.etapa; etapaVista = m.etapa;
      var kids = [h("header", { class: "cab" }, [h("h1", { text: val("titulo") || "Tu idea, en una página" }),
        h("p", { class: "lead", text: "Todo lo que el laboratorio sabe de tu idea. Se completa sola a medida que avanzas." })]),
        h("p", { class: "aviso-guardado", role: "alert", text: "Este navegador no está guardando lo que escribes. Descarga tu idea antes de cerrar." })];
      kids.push(h("div", { class: "logro" + (nueva ? " anima" : ""), role: "status" }, [h("span", { html: anillo(m.p, 28, "anillo-g") }),
        h("div", null, [h("b", { text: "Tu idea es " + m.etapa.toLowerCase() }), h("span", { text: m.n + " de " + m.total + " piezas · " + FRASE[m.etapa] })])]));
      var doc = h("article", { class: "ficha", "aria-label": "Ficha de la idea" });
      SECCIONES.filter(function (s) { return alcanzado(s[0]); }).forEach(function (s) {
        var filas = s[2].map(function (c) {
          var v = val(c[0]), duena = EST.filter(function (e) { return e.b.some(function (b) { return b.id === c[0] || (b.campos || []).some(function (x) { return x.id === c[0]; }); }); })[0];
          return h("div", { class: "fila-ficha" + (v ? "" : " vacia") }, [c[1] ? h("dt", { text: c[1] }) : null,
            h("dd", null, [v ? v : (duena ? h("button", { type: "button", class: "enlace", onclick: function () { ir(duena.id); }, text: "Completar en «" + duena.t + "»" }) : "—")])]);
        });
        doc.appendChild(h("section", null, [h("h2", { text: s[1] }), h("dl", null, filas)]));
      });
      kids.push(doc);
      var futuras = MOV.filter(function (mv) { return !alcanzado(mv.id); });
      if (futuras.length) kids.push(h("p", { class: "luego", text: "Lo demás se completa el " + futuras.map(function (mv) { return mv.fecha; }).join(" y el ") + "." }));
      var entrada = h("input", { type: "file", accept: ".md,.json,text/markdown,application/json", "aria-label": "Recuperar desde archivo",
        onchange: function () { if (entrada.files && entrada.files[0]) recuperar(entrada.files[0], function () { ir("ficha", true); }); } });
      kids.push(h("div", { class: "fila" }, [
        h("button", { type: "button", class: "boton", "data-bitacora": "descargar", html: "Descargar mi idea " + ICO.baja }),
        h("button", { type: "button", class: "boton sec", "data-bitacora": "copiar", text: "Copiarla para Claude" }),
        h("label", { class: "boton texto recuperar", html: ICO.sube + "<span>Recuperar desde archivo</span>" }, [entrada])]));
      if (ALCANCE >= 2 && !S.idea_propia) {
        var armado = 0;
        var bPropia = h("button", { type: "button", class: "boton texto", text: "Empezar mi propia idea", onclick: function () {
          if (Date.now() - armado > 4000) { armado = Date.now(); bPropia.textContent = "Guardo el tema de práctica y empiezo de cero. Toca otra vez"; return; }
          var copia = {}; Object.keys(S).forEach(function (k) { if (k !== "practicas") copia[k] = S[k]; });
          var practicas = (S.practicas || []).concat([copia]), quiz = S.quiz;
          Object.keys(S).forEach(function (k) { S[k] = undefined; });
          S.practicas = practicas; if (quiz) S.quiz = quiz; S.idea_propia = true;
          guardar(); avisar("Tu práctica quedó guardada. Empieza tu idea en «Tu reto»."); ir("reto");
        } });
        kids.push(h("div", { class: "consejo" }, [h("b", { text: "¿Seguir con el tema de la clase o empezar la tuya?" }), h("p", { text: "Puedes seguir con «pacientes que faltan a sus citas» o empezar tu propia idea. La práctica no se pierde: queda guardada y se descarga con tu idea." }), bPropia]));
      }
      $$("[data-anexo]").forEach(function (a) { a.hidden = false; kids.push(a); });
      return kids;
    }
    function ir(id, sinFoco) {
      if (id !== "ficha" && !POR_ID[id]) id = inicialEst();
      if (actual !== "ficha") anterior = actual;
      actual = id; pedidoN = 0;
      hoja.classList.remove("entra"); void hoja.offsetWidth;
      hoja.textContent = "";
      (id === "ficha" ? pintarFicha() : pintarEstacion(POR_ID[id])).forEach(function (k) { hoja.appendChild(k); });
      hoja.classList.add("entra");
      bFicha.classList.toggle("activo", id === "ficha");
      enlazar(hoja); pintarRail(); pintarMadurez();
      try { history.replaceState(null, "", "#" + id); } catch (e) { /* sandbox */ }
      if (!sinFoco) { window.scrollTo(0, 0); hoja.focus({ preventScroll: true }); }
    }
    enlazar(top);
    ir_ = ir;
    nubeCargar(function (cambio) { if (cambio) { $$('[data-campo]', top).forEach(function (el) { var k = el.getAttribute("data-campo"); el.value = S[k] == null ? "" : S[k]; }); ir(actual, true); avisar("Traje tu idea desde tu cuenta."); } });
    window.LAB = { refrescar: function () { pintarRail(); pintarMadurez(); }, ir: ir };
    ir(inicial, true);
  }

  // ================================================================ arranque
  var inicial = document.body.getAttribute("data-estacion");
  var raiz = document.getElementById("lab");
  if (raiz && inicial) {
    var hash = (location.hash || "").slice(1);
    montar(raiz, (hash && (POR_ID[hash] || hash === "ficha")) ? hash : inicial);
  } else { enlazar(document); if (!GUARDA) document.body.classList.add("sin-guardar"); }
  window.DT = { S: S, val: val, avisar: avisar, api: api, bitacoraMd: bitacoraMd, EST: EST, LECCION: LECCION, ESCENA: ESCENA };
})();
