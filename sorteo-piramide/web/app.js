// Sorteo de la pirámide. El servidor sabe qué hay detrás de cada puerta; aquí
// solo se elige la puerta y se anima lo que pasa. La música de aventura, la
// fanfarria, el derrumbe y el trombón triste se generan con Web Audio: no hay
// archivos de audio y la melodía es propia.
(() => {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esperar = (ms) => new Promise((r) => setTimeout(r, quieto ? 0 : ms));
  const azar = (a, b) => a + Math.random() * (b - a);

  let estado = { abierto: true, puertas: 30, tomadas: [], soles: 100, whatsapp: '51986149476' };
  let datos = { nombre: '', whatsapp: '', palabra: '' };
  let elegida = 0;
  let sondeo = 0;
  const botones = [];

  // ================================================================ sonido
  const Audio = (() => {
    let ctx = null, master = null, musica = null, encendido = false, sonando = false;
    let reloj = 0, proxCompas = 0, compas = 0, crepitar = 0;
    const vol = () => Number($('#volumen').value) / 100;
    const hz = (m) => 440 * 2 ** ((m - 69) / 12);
    const N = { C: 0, 'C#': 1, D: 2, Eb: 3, E: 4, F: 5, 'F#': 6, G: 7, Ab: 8, A: 9, Bb: 10, B: 11 };
    const nota = (s) => { const m = /^([A-G][b#]?)(\d)$/.exec(s); return 12 * (Number(m[2]) + 1) + N[m[1]]; };

    // Marcha de aventura propia: 8 compases de 4/4, [nota, tiempos].
    const TEMA = [
      [['G3', .75], ['C4', .25], ['E4', 1], ['D4', .5], ['C4', .5], ['G4', 1]],
      [['F4', .75], ['E4', .25], ['D4', 1], ['C4', .5], ['D4', .5], ['E4', 1]],
      [['A4', .75], ['G4', .25], ['F4', 1], ['E4', .5], ['F4', .5], ['G4', 1]],
      [['E4', .5], ['D4', .5], ['C4', .5], ['D4', .5], ['G3', 2]],
      [['G3', .75], ['C4', .25], ['E4', 1], ['G4', .5], ['A4', .5], ['Bb4', 1]],
      [['A4', .75], ['G4', .25], ['F4', 1], ['A4', .5], ['G4', .5], ['F4', 1]],
      [['E4', .5], ['F4', .5], ['G4', .5], ['E4', .5], ['D4', 1], ['B3', 1]],
      [['C4', 3], [null, 1]],
    ];
    const ACORDES = [['C', 0], ['G', 7], ['F', 5], ['G', 7], ['C', 0], ['F', 5], ['G', 7], ['C', 0]];
    const TERCERA = { C: 4, G: 4, F: 4 };
    const PULSO = 60 / 116;

    function ruido(seg, tipo) {
      const n = Math.floor(ctx.sampleRate * seg), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
      let ult = 0;
      for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; if (tipo === 'cafe') { ult = (ult + 0.02 * w) / 1.02; d[i] = ult * 3.5; } else d[i] = w; }
      return buf;
    }
    let blanco = null, cafe = null;

    function metal(m, t, dur, nivel, destino) { // voz de bronce: dos sierras desafinadas y un filtro que se abre
      const f = hz(m), g = ctx.createGain(), lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.Q.value = 2;
      lp.frequency.setValueAtTime(500, t); lp.frequency.linearRampToValueAtTime(2800, t + 0.04); lp.frequency.exponentialRampToValueAtTime(1300, t + Math.max(0.1, dur));
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(nivel, t + 0.025);
      g.gain.setValueAtTime(nivel * 0.8, t + Math.max(0.03, dur - 0.06)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.05);
      for (const det of [-7, 7]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det; o.connect(lp); o.start(t); o.stop(t + dur + 0.1); }
      lp.connect(g).connect(destino || musica);
    }
    function bajo(m, t, dur) {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle'; o.frequency.value = hz(m);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.32, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(musica); o.start(t); o.stop(t + dur + 0.05);
    }
    function caja(t, nivel) {
      const s = ctx.createBufferSource(); s.buffer = blanco;
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1400;
      const g = ctx.createGain(); g.gain.setValueAtTime(nivel, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      s.connect(hp).connect(g).connect(musica); s.start(t, Math.random()); s.stop(t + 0.14);
    }
    function timbal(m, t, nivel, destino) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(hz(m) * 1.5, t); o.frequency.exponentialRampToValueAtTime(hz(m), t + 0.08);
      g.gain.setValueAtTime(nivel, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      o.connect(g).connect(destino || musica); o.start(t); o.stop(t + 0.65);
    }

    function programarCompas(i, t0) {
      let t = t0;
      for (const [s, b] of TEMA[i]) { if (s) metal(nota(s), t, b * PULSO * 0.92, 0.16); t += b * PULSO; }
      const [nombre, raiz] = ACORDES[i], r = 36 + raiz; // do2 + raíz
      for (let k = 0; k < 4; k++) bajo(k % 2 ? r + 7 : r, t0 + k * PULSO, PULSO * 0.45);
      for (const k of [0, 2]) for (const iv of [12, 12 + TERCERA[nombre], 19]) metal(r + 12 + iv, t0 + k * PULSO, PULSO * 0.35, 0.035);
      timbal(r - 12 + 12, t0, 0.38);
      caja(t0 + PULSO, 0.22); caja(t0 + 3 * PULSO, 0.22);
      if (i === 3 || i === 7) for (let k = 0; k < 4; k++) caja(t0 + 3 * PULSO + k * PULSO / 4, 0.1 + k * 0.03);
    }

    function tic() {
      if (!sonando) return;
      while (proxCompas < ctx.currentTime + 0.6) { programarCompas(compas, proxCompas); proxCompas += 4 * PULSO; compas = (compas + 1) % TEMA.length; }
    }

    function chispa() { // crepitar de las antorchas
      if (!encendido) return;
      const t = ctx.currentTime, s = ctx.createBufferSource(); s.buffer = blanco;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = azar(1800, 4200); bp.Q.value = 4;
      const g = ctx.createGain(); g.gain.setValueAtTime(azar(0.02, 0.07), t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
      s.connect(bp).connect(g).connect(master); s.start(t, Math.random()); s.stop(t + 0.04);
    }

    function iniciar() {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      blanco = ruido(2, 'blanco'); cafe = ruido(3, 'cafe');
      const comp = ctx.createDynamicsCompressor();
      master = ctx.createGain(); master.gain.value = 0; master.connect(comp).connect(ctx.destination);
      musica = ctx.createGain(); musica.gain.value = 0.9; musica.connect(master);
      reloj = setInterval(tic, 120);
      const vuelta = () => { chispa(); crepitar = setTimeout(vuelta, azar(90, 420)); };
      vuelta();
      return true;
    }

    function poner(on) {
      if (on && !ctx && !iniciar()) return;
      encendido = on;
      if (ctx) { if (on) ctx.resume(); master.gain.setTargetAtTime(on ? vol() : 0, ctx.currentTime, 0.2); }
      const b = $('#sonido');
      b.setAttribute('aria-pressed', String(on));
      b.setAttribute('aria-label', on ? 'Apagar música' : 'Encender música');
      try { localStorage.setItem('piramide:sonido', on ? '1' : '0'); } catch { /* sin almacenamiento */ }
    }

    function marcha(on) {
      if (!ctx) { sonando = on; return; }
      if (on && !sonando) { sonando = true; compas = 0; proxCompas = ctx.currentTime + 0.1; musica.gain.cancelScheduledValues(ctx.currentTime); musica.gain.setValueAtTime(0.9, ctx.currentTime); tic(); }
      if (!on && sonando) { sonando = false; musica.gain.setTargetAtTime(0, ctx.currentTime, 0.08); setTimeout(() => { const viejo = musica; musica = ctx.createGain(); musica.gain.value = 0.9; musica.connect(master); viejo.disconnect(); }, 600); }
    }

    const ya = (fn) => { if (ctx && encendido) fn(ctx.currentTime); };
    return {
      poner, marcha, encendido: () => encendido, tocado: () => ctx !== null,
      volumen() { if (ctx && encendido) master.gain.setTargetAtTime(vol(), ctx.currentTime, 0.05); },
      salto: () => ya((t) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'square'; o.frequency.setValueAtTime(380, t); o.frequency.exponentialRampToValueAtTime(900, t + 0.14); g.gain.setValueAtTime(0.08, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18); o.connect(g).connect(master); o.start(t); o.stop(t + 0.2); }),
      chirrido: () => ya((t) => {
        const s = ctx.createBufferSource(); s.buffer = blanco;
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 14; bp.frequency.setValueAtTime(260, t); bp.frequency.linearRampToValueAtTime(720, t + 0.65);
        const trem = ctx.createOscillator(); trem.frequency.value = 28; const tg = ctx.createGain(); tg.gain.value = 0.25;
        const g = ctx.createGain(); g.gain.setValueAtTime(0.5, t); g.gain.linearRampToValueAtTime(0.0001, t + 0.7);
        trem.connect(tg).connect(g.gain);
        s.connect(bp).connect(g).connect(master); s.start(t); s.stop(t + 0.72); trem.start(t); trem.stop(t + 0.72);
      }),
      fanfarria: (grande) => ya((t) => {
        const arpegio = ['C4', 'E4', 'G4', 'C5'].map(nota);
        arpegio.forEach((m, i) => metal(m, t + i * 0.13, 0.14, 0.2, master));
        const fin = t + 0.55, acorde = grande ? ['C4', 'G4', 'C5', 'E5', 'G5', 'C6'] : ['C4', 'G4', 'C5', 'E5', 'G5'];
        acorde.map(nota).forEach((m) => metal(m, fin, 1.5, 0.09, master));
        for (let k = 0; k < 8; k++) timbal(nota('C3'), t + 0.25 + k * 0.04, 0.12, master);
        timbal(nota('C2'), fin, 0.5, master);
        const s = ctx.createBufferSource(); s.buffer = blanco; const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 5000;
        const g = ctx.createGain(); g.gain.setValueAtTime(0.18, fin); g.gain.exponentialRampToValueAtTime(0.0001, fin + 1.6);
        s.connect(hp).connect(g).connect(master); s.start(fin); s.stop(fin + 1.7);
      }),
      retumbo: (seg) => ya((t) => {
        const s = ctx.createBufferSource(); s.buffer = cafe; s.loop = true;
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 160;
        const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(1.2, t + 0.3); g.gain.setValueAtTime(1.2, t + seg - 0.5); g.gain.exponentialRampToValueAtTime(0.0001, t + seg);
        s.connect(lp).connect(g).connect(master); s.start(t); s.stop(t + seg + 0.1);
      }),
      golpe: () => ya((t) => {
        const s = ctx.createBufferSource(); s.buffer = blanco;
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = azar(250, 700); bp.Q.value = 1.2;
        const g = ctx.createGain(); g.gain.setValueAtTime(azar(0.25, 0.5), t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
        s.connect(bp).connect(g).connect(master); s.start(t, Math.random()); s.stop(t + 0.25);
        timbal(nota('A1') + Math.floor(azar(0, 5)), t, 0.25, master);
      }),
      plaf: () => ya((t) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(60, t + 0.25); g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3); o.connect(g).connect(master); o.start(t); o.stop(t + 0.32); }),
      trombon: () => ya((t0) => { // «wa wa wa waaa»: cuatro notas que bajan, la última con vibrato
        const o = ctx.createOscillator(); o.type = 'sawtooth';
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.Q.value = 3;
        const g = ctx.createGain(); g.gain.value = 0.0001;
        const notas = ['Bb3', 'A3', 'Ab3', 'G3'].map(nota), largo = [0.42, 0.42, 0.42, 1.7];
        let t = t0;
        notas.forEach((m, i) => {
          o.frequency.setTargetAtTime(hz(m), t, 0.02);
          g.gain.setTargetAtTime(0.32, t, 0.03); lp.frequency.setTargetAtTime(1500, t, 0.04);
          if (i < 3) { g.gain.setTargetAtTime(0.06, t + largo[i] - 0.1, 0.03); lp.frequency.setTargetAtTime(600, t + largo[i] - 0.1, 0.04); }
          t += largo[i];
        });
        const vib = ctx.createOscillator(); vib.frequency.value = 5.5; const vg = ctx.createGain(); vg.gain.value = 0;
        vg.gain.setValueAtTime(0, t - 1.6); vg.gain.linearRampToValueAtTime(7, t - 1.2);
        vib.connect(vg).connect(o.frequency);
        o.frequency.setTargetAtTime(hz(notas[3]) * 0.94, t - 0.4, 0.15);
        g.gain.setTargetAtTime(0.0001, t - 0.25, 0.08);
        o.connect(lp).connect(g).connect(master); o.start(t0); o.stop(t + 0.2); vib.start(t0); vib.stop(t + 0.2);
      }),
    };
  })();

  let quiereSonido = true;
  try { quiereSonido = localStorage.getItem('piramide:sonido') !== '0'; } catch { /* sin almacenamiento */ }
  $('#sonido').addEventListener('click', () => {
    quiereSonido = !Audio.encendido();
    Audio.poner(quiereSonido);
    if (quiereSonido && !['premio', 'trampa', 'animando'].includes(document.body.dataset.etapa)) Audio.marcha(true);
  });
  $('#volumen').addEventListener('input', Audio.volumen);
  const primerToque = (e) => {
    if (e.target.closest && e.target.closest('#sonido')) return;
    if (quiereSonido && !Audio.tocado()) { Audio.poner(true); if (!['premio', 'trampa'].includes(document.body.dataset.etapa)) Audio.marcha(true); }
  };
  addEventListener('pointerdown', primerToque, { once: true, capture: true });
  addEventListener('keydown', primerToque, { once: true, capture: true });

  // ================================================================ escena
  const camara = $('#camara'), cubo = $('#cubo'), sombrero = $('#sombrero');
  const FILAS = [2, 4, 6, 8, 10];

  function dibujarPuertas() {
    const cont = $('#filas');
    cont.replaceChildren();
    let n = 0;
    for (const cuantas of FILAS) {
      const fila = document.createElement('div'); fila.className = 'fila';
      for (let k = 0; k < cuantas; k++) {
        n++;
        const num = n, b = document.createElement('button');
        b.type = 'button'; b.className = 'puerta'; b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', 'false');
        b.innerHTML = '<span class="luz"></span><span class="hoja"></span><span class="num"></span>';
        b.querySelector('.num').textContent = num;
        b.addEventListener('click', () => {
          if (document.body.dataset.etapa === 'elegir') elegir(num);
          else if (document.body.dataset.etapa === 'inicio') aviso('Primero escribe tus datos abajo');
        });
        fila.append(b); botones[num] = b;
      }
      cont.append(fila);
    }
  }

  function pintarPuertas() {
    const quien = new Map(estado.tomadas.map((x) => [x.puerta, x.nombre]));
    const eligiendo = document.body.dataset.etapa === 'elegir';
    for (let n = 1; n < botones.length; n++) {
      const b = botones[n], tomada = quien.has(n);
      b.classList.toggle('sellada', tomada);
      b.disabled = tomada || !eligiendo;
      if (!eligiendo && document.body.dataset.etapa === 'inicio') b.disabled = false; // se puede tocar para ver el aviso
      b.setAttribute('aria-checked', String(n === elegida));
      b.setAttribute('aria-label', tomada ? `Puerta ${n}, ya la abrió ${quien.get(n)}` : `Puerta ${n}`);
    }
  }

  let avisoT = 0;
  function aviso(txt) {
    const a = $('#aviso'); a.textContent = txt; a.classList.add('visible');
    clearTimeout(avisoT); avisoT = setTimeout(() => a.classList.remove('visible'), 2200);
  }

  function relativo(el) {
    const c = camara.getBoundingClientRect(), r = el.getBoundingClientRect();
    return { x: r.left - c.left, y: r.top - c.top, w: r.width, h: r.height, cw: c.width, ch: c.height };
  }

  // Lleva el cubito de un salto hasta la puerta (su base al pie del vano).
  async function irAPuerta(n) {
    const d = relativo(botones[n]), c = relativo(cubo);
    const dx = d.x + d.w / 2 - (c.x + c.w / 2), dy = d.y + d.h - (c.y + c.h * 0.86);
    const s = Math.min(1, (d.w * 0.95) / 30);
    cubo.classList.remove('respira');
    cubo.style.transformOrigin = '50% 86%';
    Audio.salto();
    const a = cubo.animate([
      { transform: 'translate(0, 0) scale(1)' },
      { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 50}px) scale(${(1 + s) / 2})`, offset: 0.5 },
      { transform: `translate(${dx}px, ${dy}px) scale(${s})` },
    ], { duration: quieto ? 0 : 950, easing: 'ease-in-out', fill: 'forwards' });
    await a.finished;
    return { dx, dy, s };
  }

  async function escapar(n, p) {
    botones[n].classList.add('abierta', 'ganadora'); Audio.chirrido();
    await esperar(700);
    await cubo.animate([
      { transform: `translate(${p.dx}px, ${p.dy}px) scale(${p.s})`, opacity: 1 },
      { transform: `translate(${p.dx}px, ${p.dy - 6}px) scale(${p.s * 0.6})`, opacity: 0 },
    ], { duration: quieto ? 0 : 450, easing: 'ease-in', fill: 'forwards' }).finished;
    encenderSol(n);
    Audio.fanfarria(true);
    await esperar(900);
  }

  function encenderSol(n) {
    const d = relativo(botones[n]);
    camara.style.setProperty('--sx', `${((d.x + d.w / 2) / d.cw) * 100}%`);
    camara.style.setProperty('--sy', `${((d.y + d.h / 2) / d.ch) * 100}%`);
    camara.classList.add('escapo');
  }

  // Bloques de piedra que caen desde la silueta de la pirámide y se amontonan abajo.
  function derrumbar(animado) {
    const f = relativo($('.piramide-fondo')), cont = $('#escombros');
    cont.replaceChildren();
    const piezas = [];
    for (let i = 0; i < 46; i++) {
      const yf = 0.12 + Math.random() * 0.86, ancho = f.w * yf;
      const x0 = f.x + f.w / 2 + (Math.random() - 0.5) * ancho, y0 = f.y + f.h * yf;
      const el = document.createElement('div'); el.className = 'piedra';
      el.style.left = `${x0 - 10}px`; el.style.top = `${y0 - 6}px`;
      const suelo = f.ch - 44 - Math.random() * 40 * (1 - Math.abs(x0 / f.cw - 0.5) * 1.4);
      const dy = Math.max(0, suelo - y0), dx = (Math.random() - 0.5) * 70, giro = (Math.random() - 0.5) * 320;
      cont.append(el); piezas.push({ el, dx, dy, giro, retraso: (1 - yf) * 380 + Math.random() * 260 });
    }
    camara.classList.add('derrumbe');
    for (const p of piezas) {
      const fin = `translate(${p.dx}px, ${p.dy}px) rotate(${p.giro}deg)`;
      if (!animado) { p.el.style.transform = fin; continue; }
      p.el.animate([{ transform: 'translate(0, 0) rotate(0)' }, { transform: fin }], { duration: 650 + Math.random() * 450, delay: p.retraso, easing: 'cubic-bezier(.5, 0, .95, .55)', fill: 'both' });
    }
  }

  function aplastar(animado) {
    cubo.getAnimations().forEach((a) => a.cancel());
    cubo.style.opacity = '1';
    cubo.classList.remove('respira');
    cubo.classList.add('aplastado');
    sombrero.style.transformOrigin = '50% 100%';
    const fin = 'translate(24px, 14px) rotate(-28deg)';
    if (!animado) { sombrero.style.transform = fin; return Promise.resolve(); }
    return sombrero.animate([
      { transform: 'translate(0, 0) rotate(0)' },
      { transform: 'translate(8px, -70px) rotate(220deg)', offset: 0.45 },
      { transform: 'translate(20px, 4px) rotate(340deg)', offset: 0.85 },
      { transform: 'translate(24px, 14px) rotate(332deg)' },
    ], { duration: 1100, easing: 'ease-out', fill: 'forwards' }).finished;
  }

  async function caer(n) {
    botones[n].classList.add('abierta'); Audio.chirrido();
    await esperar(800);
    aviso('Uy…');
    await esperar(500);
    Audio.retumbo(2.6);
    camara.classList.add('temblor');
    await esperar(1000);
    camara.classList.remove('temblor');
    cubo.style.opacity = '0';
    derrumbar(!quieto);
    if (!quieto) { for (let k = 0; k < 7; k++) setTimeout(Audio.golpe, 150 + k * 140 + Math.random() * 80); }
    $('#polvo').animate([{ opacity: 0 }, { opacity: 1, offset: 0.35 }, { opacity: 0.25 }], { duration: quieto ? 0 : 2200, fill: 'forwards' });
    await esperar(1500);
    Audio.plaf();
    await aplastar(!quieto);
    Audio.trombon();
    aviso('¡Auch!');
    await esperar(600);
  }

  // ================================================================ interfaz
  const bonito = (n) => n.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3');
  const soles = (v) => (Number.isInteger(v) ? `S/ ${v}` : `S/ ${v.toFixed(2)}`);
  const waLink = (texto) => `https://wa.me/${estado.whatsapp}?text=${encodeURIComponent(texto)}`;

  function etapa(nombre) {
    document.body.dataset.etapa = nombre;
    $('#p-inicio').hidden = nombre !== 'inicio';
    $('#p-elegir').hidden = !(nombre === 'elegir' || nombre === 'animando');
    $('#p-premio').hidden = nombre !== 'premio';
    $('#p-trampa').hidden = nombre !== 'trampa';
    pintarPuertas();
  }

  function pintarElegir() {
    if (estado.tomadas.some((x) => x.puerta === elegida)) elegida = 0;
    const libres = estado.puertas - estado.tomadas.length;
    $('#libres').textContent = `${libres} de ${estado.puertas} sin abrir`;
    const b = $('#abrir'); b.disabled = !elegida;
    b.textContent = elegida ? `Abrir la puerta ${elegida}` : 'Elige una puerta';
    pintarPuertas();
  }

  function elegir(n) {
    if (estado.tomadas.some((x) => x.puerta === n)) { aviso(`La puerta ${n} ya la abrieron`); return; }
    elegida = n; $('#e-abrir').textContent = '';
    pintarElegir(); aviso(`Puerta ${n}`);
  }

  async function traerEstado() {
    try { const r = await fetch('api/estado', { cache: 'no-store' }); if (r.ok) estado = await r.json(); } catch { /* sin conexión */ }
  }
  function vigilar(on) {
    clearInterval(sondeo);
    if (on) sondeo = setInterval(async () => { await traerEstado(); if (document.body.dataset.etapa === 'elegir') pintarElegir(); }, 4000);
  }
  async function jugar(puerta) {
    const r = await fetch('api/jugar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...datos, puerta }) });
    return { ok: r.ok, j: await r.json().catch(() => ({})) };
  }

  function mostrarPremio(res) {
    const pct = res.descuento;
    $('#f-puerta').textContent = `¡Escapaste por la puerta ${res.puerta}!`;
    $('#f-pct').textContent = pct;
    $('#f-antes').textContent = soles(estado.soles);
    $('#f-precio').textContent = pct === 100 ? 'Gratis' : soles((estado.soles * (100 - pct)) / 100);
    $('#f-codigo').textContent = res.codigo;
    $('#f-vence').textContent = res.vence_texto;
    $('#f-numero').textContent = bonito(res.whatsapp);
    $('#f-repetido').hidden = !res.repetido;
    const base = `Hola, soy ${datos.nombre}. Escapé de la pirámide por la puerta ${res.puerta}. Mi cupón es ${res.codigo}: ${pct} % en Claude Code PRO Grupo 2`;
    $('#f-wa-mio').href = waLink(`${base}. Es para mí.`);
    $('#f-wa-regalo').href = waLink(`${base}. Es un regalo para: `);
    etapa('premio');
    $('#f-cifra').focus({ preventScroll: true });
    $('#p-premio').scrollIntoView({ behavior: quieto ? 'auto' : 'smooth', block: 'start' });
  }

  function mostrarTrampa(res) {
    $('#t-puerta').textContent = `La puerta ${res.puerta} era una trampa`;
    $('#t-repetido').hidden = !res.repetido;
    $('#t-wa').href = waLink(`Hola, soy ${datos.nombre}. En el sorteo de la pirámide me cayó la trampa, pero quiero información del Grupo 2 de Claude Code PRO.`);
    etapa('trampa');
    $('#t-titulo').focus({ preventScroll: true });
    $('#p-trampa').scrollIntoView({ behavior: quieto ? 'auto' : 'smooth', block: 'start' });
  }

  // Quien vuelve con su número ve el final de su historia, sin animación.
  function estadoFinal(res) {
    Audio.marcha(false);
    if (res.escapo) { botones[res.puerta].classList.add('abierta', 'ganadora'); cubo.style.opacity = '0'; encenderSol(res.puerta); mostrarPremio(res); }
    else { botones[res.puerta].classList.add('abierta'); derrumbar(false); aplastar(false); $('#polvo').style.opacity = '0.25'; mostrarTrampa(res); }
  }

  function errorCampo(motivo, msg) {
    const campos = { nombre: '#nombre', whatsapp: '#whatsapp', palabra: '#palabra' };
    for (const [k, sel] of Object.entries(campos)) {
      const mal = k === motivo;
      $(sel).setAttribute('aria-invalid', String(mal));
      $(`#e-${k}`).textContent = mal ? msg : '';
    }
    if (campos[motivo]) $(campos[motivo]).focus();
    else $('#e-general').textContent = msg;
  }

  $('#participa').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('#e-general').textContent = '';
    datos = { nombre: $('#nombre').value.trim(), whatsapp: $('#whatsapp').value.trim(), palabra: $('#palabra').value.trim() };
    if (datos.nombre.length < 2) return errorCampo('nombre', 'Escribe tu nombre.');
    if (!/^9\d{8}$/.test(datos.whatsapp.replace(/\D/g, '').replace(/^51(?=9\d{8}$)/, ''))) return errorCampo('whatsapp', 'Escribe tu WhatsApp: 9 dígitos y empieza con 9.');
    if (!datos.palabra) return errorCampo('palabra', 'Escribe la palabra del grupo.');
    errorCampo('', '');
    const b = $('#entrar'); b.disabled = true; b.textContent = 'Revisando…';
    try {
      const { ok, j } = await jugar(0); // puerta 0: solo revisa los datos; si el número ya jugó, devuelve su resultado
      if (ok) { estadoFinal(j); return; }
      if (j.motivo === 'puerta') {
        await traerEstado();
        etapa('elegir'); pintarElegir(); vigilar(true);
        $('#el-titulo').focus({ preventScroll: true });
        camara.scrollIntoView({ behavior: quieto ? 'auto' : 'smooth', block: 'start' });
        aviso('Toca una puerta');
        return;
      }
      if (j.motivo === 'cerrado') { $('#participa').hidden = true; $('#cerrado').hidden = false; return; }
      errorCampo(j.motivo, j.error || 'No pudimos revisar tus datos. Vuelve a intentarlo.');
    } catch {
      errorCampo('', 'No hay conexión. Revisa tu internet y vuelve a intentarlo.');
    } finally { b.disabled = false; b.textContent = 'Entrar a la pirámide'; }
  });

  $('#abrir').addEventListener('click', async () => {
    if (!elegida) return;
    const n = elegida, b = $('#abrir');
    b.disabled = true; b.textContent = 'Empujando la puerta…'; $('#e-abrir').textContent = '';
    try {
      const { ok, j } = await jugar(n);
      if (!ok) {
        await traerEstado(); pintarElegir();
        $('#e-abrir').textContent = j.error || 'No se pudo. Vuelve a intentarlo.';
        if (j.motivo === 'cerrado') { etapa('inicio'); $('#participa').hidden = true; $('#cerrado').hidden = false; }
        return;
      }
      vigilar(false);
      etapa('animando');
      camara.scrollIntoView({ behavior: quieto ? 'auto' : 'smooth', block: 'start' });
      await esperar(400);
      const p = await irAPuerta(j.puerta);
      Audio.marcha(false);
      if (j.escapo) { await escapar(j.puerta, p); mostrarPremio(j); }
      else { await caer(j.puerta); mostrarTrampa(j); }
    } catch {
      $('#e-abrir').textContent = 'No hay conexión. Revisa tu internet y vuelve a intentarlo.';
      b.disabled = false; b.textContent = `Abrir la puerta ${n}`;
    }
  });

  $('#copiar').addEventListener('click', async () => {
    const b = $('#copiar');
    try { await navigator.clipboard.writeText($('#f-codigo').textContent); b.textContent = 'Copiado'; } catch { b.textContent = 'Mantén presionado'; }
    setTimeout(() => { b.textContent = 'Copiar'; }, 1800);
  });

  (async () => {
    await traerEstado();
    dibujarPuertas();
    cubo.classList.add('respira');
    $('#cerrado-wa').href = waLink('Hola, quiero información del Grupo 2 de Claude Code PRO.');
    if (!estado.abierto) { $('#participa').hidden = true; $('#cerrado').hidden = false; }
    etapa('inicio');
  })();
})();
