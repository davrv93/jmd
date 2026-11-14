// Sorteo de las cuerdas. El servidor decide el descuento de cada cuerda; aquí
// solo se elige la cuerda, se anima el salto del cubito y suena la selva
// (todo el sonido se genera con Web Audio, sin archivos).
(() => {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const NS = 'http://www.w3.org/2000/svg';
  const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

  let estado = { abierto: true, cuerdas: 25, tomadas: [], soles: 40, whatsapp: '51986149476' };
  let datos = { nombre: '', whatsapp: '', palabra: '' };
  let elegida = 0;
  let sondeo = 0;
  const geo = []; // geo[n] = { ax, ay, L, g }

  // ------------------------------------------------------------ sonido
  const Selva = (() => {
    let ctx = null, master = null, encendido = false, timers = [];
    const vol = () => Number($('#volumen').value) / 100;

    function ruido(seg, tipo) {
      const n = Math.floor(ctx.sampleRate * seg);
      const buf = ctx.createBuffer(1, n, ctx.sampleRate);
      const d = buf.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, ult = 0;
      for (let i = 0; i < n; i++) {
        const w = Math.random() * 2 - 1;
        if (tipo === 'rosa') {
          b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
          b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
          d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926;
        } else if (tipo === 'cafe') {
          ult = (ult + 0.02 * w) / 1.02; d[i] = ult * 3.5;
        } else d[i] = w;
      }
      return buf;
    }

    function catarata() {
      const fuente = ctx.createBufferSource(); fuente.buffer = ruido(4, 'rosa'); fuente.loop = true;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1700; lp.Q.value = 0.3;
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 140;
      const g = ctx.createGain(); g.gain.value = 0.55;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.11;
      const lfoG = ctx.createGain(); lfoG.gain.value = 260; lfo.connect(lfoG).connect(lp.frequency);
      fuente.connect(lp).connect(hp).connect(g).connect(master);
      const grave = ctx.createBufferSource(); grave.buffer = ruido(5, 'cafe'); grave.loop = true;
      const lp2 = ctx.createBiquadFilter(); lp2.type = 'lowpass'; lp2.frequency.value = 320;
      const g2 = ctx.createGain(); g2.gain.value = 0.5;
      grave.connect(lp2).connect(g2).connect(master);
      fuente.start(); grave.start(); lfo.start();
    }

    function mosquito() {
      const t = ctx.currentTime, dur = 2.4 + Math.random() * 3.2, cerca = Math.random() < 0.22;
      const f = 520 + Math.random() * 230;
      const osc = ctx.createOscillator(); osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, t); osc.frequency.linearRampToValueAtTime(f * (0.92 + Math.random() * 0.16), t + dur);
      const vib = ctx.createOscillator(); vib.frequency.value = 8 + Math.random() * 7;
      const vibG = ctx.createGain(); vibG.gain.value = 10 + Math.random() * 10; vib.connect(vibG).connect(osc.frequency);
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f * 2; bp.Q.value = 1.1;
      const g = ctx.createGain(); const pico = cerca ? 0.05 : 0.016;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(pico, t + dur * 0.45); g.gain.linearRampToValueAtTime(0.0001, t + dur);
      const pan = ctx.createStereoPanner(); const p0 = Math.random() * 1.6 - 0.8;
      pan.pan.setValueAtTime(p0, t); pan.pan.linearRampToValueAtTime(-p0, t + dur);
      osc.connect(bp).connect(g).connect(pan).connect(master);
      osc.start(t); vib.start(t); osc.stop(t + dur + 0.05); vib.stop(t + dur + 0.05);
    }

    function pajaro() {
      const notas = 2 + Math.floor(Math.random() * 3), base = 2300 + Math.random() * 1200, p = Math.random() * 1.6 - 0.8;
      for (let i = 0; i < notas; i++) {
        const t = ctx.currentTime + i * (0.12 + Math.random() * 0.05);
        const o = ctx.createOscillator(); o.type = 'sine';
        o.frequency.setValueAtTime(base, t); o.frequency.exponentialRampToValueAtTime(base * 1.35, t + 0.07);
        const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.03, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
        const pan = ctx.createStereoPanner(); pan.pan.value = p;
        o.connect(g).connect(pan).connect(master); o.start(t); o.stop(t + 0.12);
      }
    }

    function cada(fn, min, max) {
      const vuelta = () => { if (encendido) fn(); timers.push(setTimeout(vuelta, min + Math.random() * (max - min))); };
      timers.push(setTimeout(vuelta, 600 + Math.random() * 1500));
    }

    function iniciar() {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      const comp = ctx.createDynamicsCompressor();
      master = ctx.createGain(); master.gain.value = 0;
      master.connect(comp).connect(ctx.destination);
      catarata();
      cada(mosquito, 2200, 6500);
      cada(pajaro, 5000, 13000);
      return true;
    }

    function poner(on) {
      if (on && !ctx && !iniciar()) return;
      encendido = on;
      if (ctx) {
        if (on) ctx.resume();
        master.gain.setTargetAtTime(on ? vol() : 0, ctx.currentTime, 0.25);
      }
      const b = $('#sonido');
      b.setAttribute('aria-pressed', String(on));
      b.setAttribute('aria-label', on ? 'Apagar sonido de la selva' : 'Encender sonido de la selva');
      try { localStorage.setItem('selva:sonido', on ? '1' : '0'); } catch { /* sin almacenamiento */ }
    }

    function efecto(fn) { if (ctx && encendido) fn(ctx.currentTime); }
    const zumbidoAire = (dur, f0, f1, nivel) => efecto((t) => {
      const s = ctx.createBufferSource(); s.buffer = ruido(dur + 0.1, 'blanco');
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.4;
      bp.frequency.setValueAtTime(f0, t); bp.frequency.exponentialRampToValueAtTime(f1, t + dur);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(nivel, t + dur * 0.4); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(bp).connect(g).connect(master); s.start(t); s.stop(t + dur + 0.1);
    });

    return {
      poner, encendido: () => encendido, tocado: () => ctx !== null,
      volumen() { if (ctx && encendido) master.gain.setTargetAtTime(vol(), ctx.currentTime, 0.05); },
      salto: () => zumbidoAire(0.35, 500, 1600, 0.35),
      vaiven: (seg) => zumbidoAire(seg, 300, 1200, 0.28),
      golpe: () => efecto((t) => {
        const o = ctx.createOscillator(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.18);
        const g = ctx.createGain(); g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
        o.connect(g).connect(master); o.start(t); o.stop(t + 0.25);
      }),
      premio: (grande) => efecto((t) => {
        const notas = grande ? [523.25, 659.25, 783.99, 1046.5, 1318.5] : [523.25, 659.25, 783.99];
        notas.forEach((f, i) => {
          const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = f;
          const g = ctx.createGain(); const ti = t + i * 0.11;
          g.gain.setValueAtTime(0.0001, ti); g.gain.exponentialRampToValueAtTime(0.22, ti + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, ti + 0.6);
          o.connect(g).connect(master); o.start(ti); o.stop(ti + 0.65);
        });
      }),
    };
  })();

  let quiereSonido = true;
  try { quiereSonido = localStorage.getItem('selva:sonido') !== '0'; } catch { /* sin almacenamiento */ }
  $('#sonido').addEventListener('click', () => { quiereSonido = !Selva.encendido(); Selva.poner(quiereSonido); });
  $('#volumen').addEventListener('input', Selva.volumen);
  // El navegador solo deja sonar después de un toque: la selva arranca con el primero.
  const primerToque = (e) => {
    if (e.target.closest && e.target.closest('#sonido')) return;
    if (quiereSonido && !Selva.tocado()) Selva.poner(true);
  };
  addEventListener('pointerdown', primerToque, { once: true, capture: true });
  addEventListener('keydown', primerToque, { once: true, capture: true });

  // ------------------------------------------------------------ escena
  const svg = $('#escena');
  const cubo = $('#cubo');
  const cuerpo = cubo.querySelector('.cubo-cuerpo');
  const activa = $('#activa');
  const SUELO = 190, X_INICIO = 58, X_LLEGADA = 326;
  let posCubo = { x: X_INICIO, y: SUELO };
  const moverCubo = (x, y) => { posCubo = { x, y }; cubo.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)})`); };

  function ramaY() {
    const p = $('#rama'), largo = p.getTotalLength(), tabla = [];
    for (let i = 0; i <= 300; i++) { const q = p.getPointAtLength((largo * i) / 300); tabla.push(q); }
    return (x) => { let mejor = tabla[0]; for (const q of tabla) if (Math.abs(q.x - x) < Math.abs(mejor.x - x)) mejor = q; return mejor.y + 1; };
  }

  function el(tag, attrs, padre) {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    if (padre) padre.append(e);
    return e;
  }

  function dibujarCuerdas() {
    const cont = $('#cuerdas');
    cont.replaceChildren();
    const yDe = ramaY(), n = estado.cuerdas;
    for (let i = 0; i < n; i++) {
      const num = i + 1;
      const ax = 102 + (i * 196) / (n - 1), ay = yDe(ax), L = 118 + ((i * 37) % 11) * 5.4;
      const g = el('g', { class: 'cuerda', 'data-n': num }, cont);
      g.style.setProperty('--d', `${3.2 + ((i * 7) % 5) * 0.45}s`);
      g.style.setProperty('--r', `${-((i * 13) % 9) * 0.37}s`);
      g.style.transformOrigin = `${ax}px ${ay}px`;
      el('path', { class: 'soga', d: `M${ax} ${ay} Q${ax + 2.5} ${ay + L / 2} ${ax} ${ay + L}` }, g);
      for (let k = 1; k <= 2; k++) {
        const hy = ay + (L * (k + ((i + k) % 3) * 0.3)) / 3.6;
        el('ellipse', { class: 'hoja', cx: ax + (k % 2 ? 2.6 : -2.6), cy: hy, rx: 2.6, ry: 1.2, transform: `rotate(${k % 2 ? 30 : -30} ${ax} ${hy})` }, g);
      }
      el('circle', { class: 'nudo', cx: ax, cy: ay + L, r: 2 }, g);
      const t = el('text', { class: 'num', x: ax, y: ay + L + 9 }, g); t.textContent = num;
      el('rect', { class: 'zona', x: ax - 4, y: ay, width: 8, height: L + 12 }, g);
      g.addEventListener('click', () => { if (document.body.dataset.etapa === 'elegir') elegir(num); });
      geo[num] = { ax, ay, L, g };
    }
    pintarTomadas();
  }

  function pintarTomadas() {
    const t = new Set(estado.tomadas.map((x) => x.cuerda));
    for (let n = 1; n < geo.length; n++) geo[n].g.classList.toggle('tomada', t.has(n));
  }

  // ------------------------------------------------------------ salto
  const ease = (t) => 0.5 - Math.cos(Math.PI * t) / 2;
  const easeOut = (t) => Math.sin((t * Math.PI) / 2);
  function tramo(ms, fn) {
    return new Promise((fin) => {
      const t0 = performance.now();
      const paso = (ahora) => { const t = Math.min(1, (ahora - t0) / ms); fn(t); if (t < 1) requestAnimationFrame(paso); else fin(); };
      requestAnimationFrame(paso);
    });
  }
  const sogaA = (x, y, a) => { activa.setAttribute('x1', a.ax); activa.setAttribute('y1', a.ay); activa.setAttribute('x2', x); activa.setAttribute('y2', y); };

  async function saltar(n) {
    const a = geo[n];
    cuerpo.classList.remove('respira');
    if (quieto) { moverCubo(X_LLEGADA, SUELO); return; }
    // 1. camina al borde
    await tramo(320, (t) => moverCubo(X_INICIO + (84 - X_INICIO) * ease(t), SUELO));
    // 2. salta y agarra la punta de la cuerda
    const gx = a.ax, gy = a.ay + a.L, dist = Math.hypot(gx - 84, gy - SUELO);
    Selva.salto();
    await tramo(330 + dist * 1.6, (t) => {
      const x = 84 + (gx - 84) * t, y = SUELO + (gy - SUELO) * t - Math.sin(Math.PI * t) * (24 + dist * 0.12);
      moverCubo(x, y);
    });
    a.g.classList.add('oculta');
    activa.setAttribute('visibility', 'visible');
    // 3. se balancea hacia la otra orilla
    const phiMax = Math.min(0.8, Math.asin(Math.min(1, Math.max(0.05, (318 - a.ax) / a.L))));
    Selva.vaiven(0.8);
    await tramo(820, (t) => {
      const phi = phiMax * easeOut(t);
      const x = a.ax + a.L * Math.sin(phi), y = a.ay + a.L * Math.cos(phi);
      moverCubo(x, y); sogaA(x, y, a);
    });
    // 4. se suelta y vuela hasta aterrizar
    activa.setAttribute('visibility', 'hidden');
    a.g.classList.remove('oculta');
    const x0 = posCubo.x, y0 = posCubo.y;
    await tramo(560, (t) => {
      const x = x0 + (X_LLEGADA - x0) * t, y = y0 + (SUELO - y0) * t - Math.sin(Math.PI * t) * 34;
      moverCubo(x, y);
    });
    Selva.golpe();
    cuerpo.classList.add('aterriza');
    await esperar(340);
    cuerpo.classList.remove('aterriza');
    cuerpo.classList.add('respira');
  }

  // ------------------------------------------------------------ interfaz
  const bonito = (n) => n.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3');
  const soles = (v) => (Number.isInteger(v) ? `S/ ${v}` : `S/ ${v.toFixed(2)}`);
  const waLink = (texto) => `https://wa.me/${estado.whatsapp}?text=${encodeURIComponent(texto)}`;

  function etapa(nombre) {
    document.body.dataset.etapa = nombre;
    $('#p-inicio').hidden = nombre !== 'inicio';
    $('#p-elegir').hidden = !(nombre === 'elegir' || nombre === 'saltando');
    $('#p-premio').hidden = nombre !== 'premio';
  }

  let avisoT = 0;
  function aviso(txt) {
    const a = $('#aviso-cuerda');
    a.textContent = txt; a.classList.add('visible');
    clearTimeout(avisoT); avisoT = setTimeout(() => a.classList.remove('visible'), 2200);
  }

  function pintarRejilla() {
    const r = $('#rejilla');
    const quien = new Map(estado.tomadas.map((x) => [x.cuerda, x.nombre]));
    if (quien.has(elegida)) elegida = 0;
    r.replaceChildren();
    for (let n = 1; n <= estado.cuerdas; n++) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'cuerda-btn';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(n === elegida));
      const sN = document.createElement('span'); sN.className = 'n'; sN.textContent = n;
      b.append(sN);
      if (quien.has(n)) {
        b.disabled = true;
        const q = document.createElement('span'); q.className = 'q'; q.textContent = quien.get(n);
        b.append(q);
        b.setAttribute('aria-label', `Cuerda ${n}, la tomó ${quien.get(n)}`);
      } else b.setAttribute('aria-label', `Cuerda ${n}, libre`);
      b.addEventListener('click', () => elegir(n));
      r.append(b);
    }
    const libres = estado.cuerdas - estado.tomadas.length;
    $('#libres').textContent = `${libres} de ${estado.cuerdas} libres`;
    for (let n = 1; n < geo.length; n++) geo[n].g.classList.toggle('elegida', n === elegida);
    const s = $('#saltar');
    s.disabled = !elegida;
    s.textContent = elegida ? `Saltar con la cuerda ${elegida}` : 'Elige una cuerda';
    pintarTomadas();
  }

  function elegir(n) {
    if (estado.tomadas.some((x) => x.cuerda === n)) { aviso(`La cuerda ${n} ya está tomada`); return; }
    elegida = n;
    $('#e-saltar').textContent = '';
    pintarRejilla();
    aviso(`Cuerda ${n}`);
  }

  async function traerEstado() {
    try {
      const r = await fetch('api/estado', { cache: 'no-store' });
      if (r.ok) estado = await r.json();
    } catch { /* sin conexión: se queda lo último */ }
  }

  function vigilar(on) {
    clearInterval(sondeo);
    if (on) sondeo = setInterval(async () => { await traerEstado(); if (document.body.dataset.etapa === 'elegir') pintarRejilla(); }, 4000);
  }

  async function jugar(cuerda) {
    const r = await fetch('api/jugar', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: datos.nombre, whatsapp: datos.whatsapp, palabra: datos.palabra, cuerda }),
    });
    const j = await r.json().catch(() => ({}));
    return { ok: r.ok, j };
  }

  function mostrarPremio(res) {
    const pct = res.descuento, precio = (estado.soles * (100 - pct)) / 100;
    $('#f-cuerda').textContent = `Cruzaste con la cuerda ${res.cuerda}`;
    $('#f-pct').textContent = pct;
    $('#f-antes').textContent = soles(estado.soles);
    $('#f-precio').textContent = pct === 100 ? 'Gratis' : soles(precio);
    $('#f-codigo').textContent = res.codigo;
    $('#f-vence').textContent = res.vence_texto;
    $('#f-numero').textContent = bonito(res.whatsapp);
    $('#f-repetido').hidden = !res.repetido;
    $('#f-wa').href = waLink(`Hola, soy ${datos.nombre}. Tomé la cuerda ${res.cuerda} del sorteo de la selva (grupo Claude Code PRO). Mi cupón es ${res.codigo}: ${pct} % en DeepSeek Harness.`);
    etapa('premio');
    $('#f-cifra').focus({ preventScroll: true });
    $('#p-premio').scrollIntoView({ behavior: quieto ? 'auto' : 'smooth', block: 'start' });
    Selva.premio(pct >= 90);
  }

  function errorCampo(motivo, msg) {
    const campos = { nombre: '#nombre', whatsapp: '#whatsapp', palabra: '#palabra' };
    for (const [k, sel] of Object.entries(campos)) {
      const bien = k !== motivo;
      $(sel).setAttribute('aria-invalid', String(!bien));
      $(`#e-${k}`).textContent = bien ? '' : msg;
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
      // cuerda 0: el servidor revisa los datos y la palabra; si el número ya jugó, devuelve su cupón.
      const { ok, j } = await jugar(0);
      if (ok) { moverCubo(X_LLEGADA, SUELO); cuerpo.classList.add('respira'); mostrarPremio(j); return; }
      if (j.motivo === 'cuerda') {
        await traerEstado();
        etapa('elegir'); pintarRejilla(); vigilar(true);
        $('#el-titulo').focus({ preventScroll: true });
        $('#escena').scrollIntoView({ behavior: quieto ? 'auto' : 'smooth', block: 'start' });
        return;
      }
      if (j.motivo === 'cerrado') { $('#participa').hidden = true; $('#cerrado').hidden = false; return; }
      errorCampo(j.motivo, j.error || 'No pudimos revisar tus datos. Vuelve a intentarlo.');
    } catch {
      errorCampo('', 'No hay conexión. Revisa tu internet y vuelve a intentarlo.');
    } finally { b.disabled = false; b.textContent = 'Ir a las cuerdas'; }
  });

  $('#saltar').addEventListener('click', async () => {
    if (!elegida) return;
    const n = elegida, b = $('#saltar');
    b.disabled = true; b.textContent = 'Agarrando la cuerda…';
    $('#e-saltar').textContent = '';
    try {
      const { ok, j } = await jugar(n);
      if (!ok) {
        await traerEstado(); pintarRejilla();
        $('#e-saltar').textContent = j.error || 'No se pudo. Vuelve a intentarlo.';
        if (j.motivo === 'cerrado') { etapa('inicio'); $('#participa').hidden = true; $('#cerrado').hidden = false; }
        return;
      }
      vigilar(false);
      etapa('saltando');
      $('#escena').scrollIntoView({ behavior: quieto ? 'auto' : 'smooth', block: 'start' });
      await esperar(quieto ? 0 : 350);
      await saltar(j.cuerda);
      estado.tomadas.push({ cuerda: j.cuerda, nombre: datos.nombre.split(/\s+/)[0] });
      pintarTomadas();
      mostrarPremio(j);
    } catch {
      $('#e-saltar').textContent = 'No hay conexión. Revisa tu internet y vuelve a intentarlo.';
      b.disabled = false; b.textContent = `Saltar con la cuerda ${n}`;
    }
  });

  $('#copiar').addEventListener('click', async () => {
    const b = $('#copiar');
    try { await navigator.clipboard.writeText($('#f-codigo').textContent); b.textContent = 'Copiado'; }
    catch { b.textContent = 'Mantén presionado'; }
    setTimeout(() => { b.textContent = 'Copiar'; }, 1800);
  });

  // ------------------------------------------------------------ arranque
  (async () => {
    await traerEstado();
    dibujarCuerdas();
    cuerpo.classList.add('respira');
    $('#cerrado-wa').href = waLink('Hola, quiero información del curso DeepSeek Harness.');
    if (!estado.abierto) { $('#participa').hidden = true; $('#cerrado').hidden = false; }
    etapa('inicio');
  })();
})();
