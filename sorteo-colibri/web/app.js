// Sorteo del colibrí. El resultado lo decide y lo guarda el servidor (api/jugar);
// aquí solo se muestra el aleteo, se frena y se revela lo que ya salió.
(() => {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const calma = matchMedia('(prefers-reduced-motion: reduce)');
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));
  const memoria = {
    leer(k) { try { return localStorage.getItem('colibri:' + k); } catch { return null; } },
    poner(k, v) { try { localStorage.setItem('colibri:' + k, v); } catch { /* sin almacenamiento: no pasa nada */ } },
  };
  const CURSO = 'Crea contenido con OpenMontage';
  let config = { abierto: true, soles: 50, whatsapp: '51986149476' };
  let yo = null;
  let resultado = null;

  // ------------------------------------------------------------------ sonido
  // Piano de fondo y un zumbido de alas: ruido filtrado que late a la frecuencia del aleteo.
  // La música pasa por Web Audio porque iOS ignora el volumen de un <audio>.
  const sonido = (() => {
    let ctx = null, zumbido = null, salidaMusica = null, cargando = null;
    let activo = memoria.leer('silencio') !== '1';
    const guardado = parseInt(memoria.leer('volumen'), 10);
    let volumen = Number.isNaN(guardado) ? 35 : Math.min(100, Math.max(0, guardado));
    const boton = $('#sonido'), barra = $('#volumen');
    const archivo = fetch('audio/piano2.mp3').then((r) => (r.ok ? r.arrayBuffer() : null)).catch(() => null);
    const pintar = () => {
      const texto = activo ? 'Apagar música' : 'Encender música';
      boton.setAttribute('aria-pressed', String(activo));
      boton.setAttribute('aria-label', texto);
      boton.title = texto;
      boton.parentElement.classList.toggle('apagada', !activo);
      barra.value = volumen;
      barra.style.setProperty('--v', `${volumen}%`);
    };
    const iniciar = () => {
      if (!activo) return null;
      try {
        ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
        if (ctx.state === 'suspended') ctx.resume();
      } catch { ctx = null; }
      return ctx;
    };
    const nota = (frec, { tipo = 'sine', dur = 0.3, vol = 0.1, cuando = 0 } = {}) => {
      const a = iniciar();
      if (!a) return;
      const t = a.currentTime + cuando;
      const o = a.createOscillator(), g = a.createGain();
      o.type = tipo;
      o.frequency.setValueAtTime(frec, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(a.destination);
      o.start(t);
      o.stop(t + dur + 0.03);
    };
    const alas = () => {
      const a = iniciar();
      if (!a || zumbido) return;
      const largo = a.sampleRate * 2, buf = a.createBuffer(1, largo, a.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < largo; i++) d[i] = Math.random() * 2 - 1;
      const ruido = a.createBufferSource();
      ruido.buffer = buf;
      ruido.loop = true;
      const filtro = a.createBiquadFilter();
      filtro.type = 'bandpass';
      filtro.frequency.value = 240;
      filtro.Q.value = 1.1;
      const latido = a.createGain();
      latido.gain.value = 0.5;
      const lfo = a.createOscillator();
      lfo.frequency.value = 38; // 38 batidas por segundo
      const fuerza = a.createGain();
      fuerza.gain.value = 0.5;
      const salida = a.createGain();
      salida.gain.setValueAtTime(0.0001, a.currentTime);
      salida.gain.exponentialRampToValueAtTime(0.16, a.currentTime + 0.25);
      lfo.connect(fuerza).connect(latido.gain);
      ruido.connect(filtro).connect(latido).connect(salida).connect(a.destination);
      ruido.start();
      lfo.start();
      zumbido = { ruido, lfo, salida };
    };
    const frenar = () => {
      if (!zumbido || !ctx) return;
      const { ruido, lfo, salida } = zumbido;
      zumbido = null;
      const t = ctx.currentTime;
      lfo.frequency.exponentialRampToValueAtTime(5, t + 0.9);
      salida.gain.setValueAtTime(Math.max(salida.gain.value, 0.0002), t);
      salida.gain.exponentialRampToValueAtTime(0.0001, t + 1);
      ruido.stop(t + 1.05);
      lfo.stop(t + 1.05);
    };
    // El navegador no deja sonar nada hasta el primer toque: la música entra ahí, en suave.
    const musica = () => {
      const a = iniciar();
      if (!a || salidaMusica || cargando) return;
      cargando = archivo.then(async (datos) => {
        if (!datos) return;
        const pista = await a.decodeAudioData(datos.slice(0));
        const fuente = a.createBufferSource();
        fuente.buffer = pista;
        fuente.loop = true;
        salidaMusica = a.createGain();
        salidaMusica.gain.setValueAtTime(0, a.currentTime);
        salidaMusica.gain.linearRampToValueAtTime(volumen / 100, a.currentTime + 2.5);
        fuente.connect(salidaMusica).connect(a.destination);
        fuente.start();
      }).catch(() => { /* sin música la página sigue igual */ }).finally(() => { cargando = null; });
    };
    const encender = (si) => {
      activo = si;
      memoria.poner('silencio', activo ? '0' : '1');
      pintar();
      if (!activo) { frenar(); if (ctx) ctx.suspend(); return; }
      musica();
      if (document.body.dataset.etapa === 'juego') alas();
    };
    boton.addEventListener('click', () => encender(!activo));
    barra.addEventListener('input', () => {
      volumen = Number(barra.value);
      memoria.poner('volumen', String(volumen));
      if (!activo && volumen > 0) encender(true);
      pintar();
      if (salidaMusica) {
        salidaMusica.gain.cancelScheduledValues(ctx.currentTime);
        salidaMusica.gain.setTargetAtTime(volumen / 100, ctx.currentTime, 0.04);
      }
    });
    for (const gesto of ['pointerdown', 'touchend', 'keydown']) addEventListener(gesto, musica, { passive: true });
    document.addEventListener('visibilitychange', () => {
      if (!ctx) return;
      if (document.hidden) ctx.suspend(); else if (activo) ctx.resume();
    });
    pintar();
    return {
      iniciar, alas, frenar,
      premio: () => [523.25, 783.99, 1046.5, 1567.98].forEach((f, i) => nota(f, { tipo: 'triangle', dur: 0.9, vol: 0.1, cuando: i * 0.1 })),
      consuelo: () => { nota(392, { dur: 0.5 }); nota(329.63, { dur: 0.7, cuando: 0.18 }); },
    };
  })();

  // ------------------------------------------------------------------ etapas
  const paneles = { inicio: $('#p-inicio'), juego: $('#p-juego'), premio: $('#p-premio'), escapo: $('#p-escapo') };
  const video = $('#v');
  function etapa(nombre) {
    document.body.dataset.etapa = nombre;
    for (const [k, e] of Object.entries(paneles)) e.hidden = k !== nombre;
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  const reproducir = () => { const p = video.play(); if (p) p.catch(() => { /* sin autoplay: se queda el cuadro quieto */ }); };

  // La cabeza del colibrí no se mueve: la mira se calcula una vez por tamaño de ventana.
  const OJO = { x: 0.562, y: 0.312 };
  function apuntar() {
    const caja = video.getBoundingClientRect();
    const s = Math.max(caja.width / 1280, caja.height / 720);
    const [px, py] = getComputedStyle(video).objectPosition.split(' ').map((v) => parseFloat(v) / 100);
    const mira = $('#mira');
    mira.style.setProperty('--x', `${(caja.width - 1280 * s) * px + 1280 * OJO.x * s}px`);
    mira.style.setProperty('--y', `${(caja.height - 720 * s) * py + 720 * OJO.y * s}px`);
  }

  // ---------------------------------------------------------------- formulario
  const soloNumero = (t) => t.replace(/\D/g, '');
  const bonito = (n) => n.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3');
  const campoNombre = $('#nombre'), campoTel = $('#whatsapp'), boton = $('#entrar');

  function error(id, texto, campo) {
    $(id).textContent = texto;
    if (campo) campo.setAttribute('aria-invalid', texto ? 'true' : 'false');
  }
  function validar() {
    const nombre = campoNombre.value.trim().replace(/\s+/g, ' ');
    let numero = soloNumero(campoTel.value);
    if (numero.length === 11 && numero.startsWith('51')) numero = numero.slice(2);
    const malNombre = nombre.length < 2, malNumero = !/^9\d{8}$/.test(numero);
    error('#e-nombre', malNombre ? 'Escribe tu nombre.' : '', campoNombre);
    error('#e-whatsapp', malNumero ? 'Escribe tu WhatsApp: 9 dígitos y empieza con 9.' : '', campoTel);
    if (malNombre) campoNombre.focus(); else if (malNumero) campoTel.focus();
    return malNombre || malNumero ? null : { nombre, whatsapp: numero };
  }

  async function participar(e) {
    e.preventDefault();
    error('#e-general', '');
    const datos = validar();
    if (!datos) return;
    sonido.iniciar();
    boton.disabled = true;
    boton.textContent = 'Un momento…';
    let res, cuerpo;
    try {
      res = await fetch('api/jugar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos) });
      cuerpo = await res.json();
    } catch {
      error('#e-general', 'No hay conexión. Revisa tu internet y vuelve a intentarlo.');
      soltar();
      return;
    }
    if (!res.ok) {
      const msg = cuerpo.error || 'No pudimos registrar tu participación. Vuelve a intentarlo.';
      if (cuerpo.motivo === 'nombre') { error('#e-nombre', msg, campoNombre); campoNombre.focus(); }
      else if (cuerpo.motivo === 'whatsapp') { error('#e-whatsapp', msg, campoTel); campoTel.focus(); }
      else if (cuerpo.motivo === 'cerrado') cerrar();
      else error('#e-general', msg);
      soltar();
      return;
    }
    yo = datos;
    resultado = cuerpo;
    memoria.poner('datos', JSON.stringify(datos));
    soltar();
    if (resultado.repetido || calma.matches) { revelar(); return; }
    jugar();
  }
  function soltar() { boton.disabled = false; boton.textContent = 'Jugar por mi descuento'; }

  // ---------------------------------------------------------------- el aleteo
  // El plano ya es cámara lenta: acelerado se vuelve mancha, y al frenar se ven las plumas.
  const RAPIDO = 4;
  const cuenta = $('#cuenta'), detener = $('#detener');
  let batidas = 0, reloj = 0, ultimo = 0;

  function contar(t) {
    if (ultimo) batidas += ((t - ultimo) / 1000) * 38 * (video.playbackRate / RAPIDO);
    ultimo = t;
    cuenta.textContent = String(Math.floor(batidas) % 100).padStart(2, '0');
    reloj = requestAnimationFrame(contar);
  }
  function jugar() {
    etapa('juego');
    apuntar();
    $('#j-titulo').innerHTML = 'Solo ves <em>una mancha.</em>';
    $('#j-texto').textContent = '38 batidas por segundo. Detén el aleteo y mira tu descuento.';
    detener.hidden = false;
    detener.disabled = false;
    video.playbackRate = RAPIDO;
    reproducir();
    batidas = 0;
    ultimo = 0;
    reloj = requestAnimationFrame(contar);
    sonido.alas();
    detener.focus({ preventScroll: true });
  }
  function frenar() {
    detener.disabled = true;
    sonido.frenar();
    $('#j-titulo').innerHTML = 'Ahora sí <em>se ven.</em>';
    $('#j-texto').textContent = 'Cuéntalas.';
    detener.hidden = true;
    const inicio = performance.now(), DURA = 1700;
    const paso = (t) => {
      const k = Math.min(1, (t - inicio) / DURA);
      video.playbackRate = Math.max(0.0625, RAPIDO * (1 - k) * (1 - k));
      if (k < 1) { requestAnimationFrame(paso); return; }
      cancelAnimationFrame(reloj);
      revelar();
    };
    requestAnimationFrame(paso);
  }

  // ------------------------------------------------------------------ resultado
  const soles = (n) => 'S/ ' + (Number.isInteger(n) ? n : n.toFixed(2));
  const conDescuento = (pct) => Math.round(config.soles * (100 - pct)) / 100;
  const wa = (texto) => `https://wa.me/${config.whatsapp}?text=${encodeURIComponent(texto)}`;

  function revelar() {
    const r = resultado;
    video.playbackRate = 0.5; // sigue en cámara lenta detrás del resultado
    if (calma.matches) video.pause(); else reproducir();
    if (r.gano) {
      const precio = conDescuento(r.descuento);
      $('#f-pct').textContent = r.descuento;
      $('#f-antes').textContent = soles(config.soles);
      $('#f-precio').textContent = soles(precio);
      $('#f-codigo').textContent = r.codigo;
      $('#f-vence').textContent = r.vence_texto;
      $('#f-numero').textContent = bonito(r.whatsapp);
      $('#f-repetido').hidden = !r.repetido;
      $('#f-wa').href = wa(`Hola, David. Soy ${yo.nombre}. Gané el cupón ${r.codigo} (${r.descuento} %) en el sorteo del colibrí. Quiero inscribirme en ${CURSO} por ${soles(precio)}.`);
      etapa('premio');
      $('#f-cifra').focus({ preventScroll: true });
      if (!r.repetido) sonido.premio();
    } else {
      $('#s-titulo').innerHTML = r.repetido ? 'Ya <em>participaste.</em>' : 'Se te <em>escapó.</em>';
      $('#s-texto').textContent = `${r.repetido ? 'Ese número no sacó cupón.' : 'Esta vez no hubo cupón.'} El curso sigue disponible a ${soles(config.soles)}.`;
      $('#s-wa').href = wa(`Hola, David. Soy ${yo.nombre}. Participé en el sorteo del colibrí y quiero información de ${CURSO}.`);
      etapa('escapo');
      $('#s-titulo').focus({ preventScroll: true });
      if (!r.repetido) sonido.consuelo();
    }
  }

  $('#copiar').addEventListener('click', async (e) => {
    const b = e.currentTarget;
    try {
      await navigator.clipboard.writeText($('#f-codigo').textContent);
      b.textContent = 'Copiado';
    } catch {
      b.textContent = 'Anótalo';
    }
    await espera(1600);
    b.textContent = 'Copiar';
  });

  function cerrar() {
    $('#participa').hidden = true;
    $('#cerrado').hidden = false;
    $('#cerrado-wa').href = wa(`Hola, David. Quiero información de ${CURSO}.`);
  }

  // ------------------------------------------------------------------ arranque
  $('#participa').addEventListener('submit', participar);
  detener.addEventListener('click', frenar);
  campoNombre.addEventListener('input', () => error('#e-nombre', '', campoNombre));
  campoTel.addEventListener('input', () => error('#e-whatsapp', '', campoTel));
  if (calma.matches) video.pause();
  addEventListener('resize', apuntar);
  apuntar();
  try {
    const previo = JSON.parse(memoria.leer('datos') || 'null');
    if (previo && typeof previo.nombre === 'string' && typeof previo.whatsapp === 'string') {
      campoNombre.value = previo.nombre.slice(0, 40);
      campoTel.value = soloNumero(previo.whatsapp).slice(0, 9);
    }
  } catch { /* datos viejos: se ignoran */ }
  fetch('api/estado').then((r) => (r.ok ? r.json() : null)).then((e) => {
    if (!e) return;
    config = { ...config, ...e };
    if (!e.abierto) cerrar();
  }).catch(() => { /* sin estado: el formulario avisa al enviar */ });
})();
