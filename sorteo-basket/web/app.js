// Sorteo basket: cliente. El servidor decide todo; aquí solo se dibuja la cancha, se mueve la barra con la fase
// que manda el servidor y se le dice en qué milisegundo se tocó.
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const reducido = window.matchMedia('(prefers-reduced-motion: reduce)');
  const chico = () => window.innerWidth < 600;
  const guardado = {
    leer(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    poner(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* sin almacenamiento */ } },
  };

  // ---------- estado ----------
  let ws = null, intentos = 0, cfg = null;
  let muestra = 0;
  let yo = null; // {id, token, corto, s, num, a, n, gano}
  let fase = null, faseEn = 0, listoEn = 0, tirando = false, tiroTimer = 0;
  let abierto = false, cerrado = false, restantes = {};
  const jugadores = new Map(); // id -> {id, corto, s, num, a, n, gano, on, lugar}
  let ganadores = []; // [orden, id, corto, s, num, premio, grupo]
  let verTodo = false;
  let cerBase = null;
  let especiales = [], conConsuelo = 0; // [id, corto, s, num]

  // ---------- conexión ----------
  function conectar() {
    const u = new URL('ws', location.href);
    u.protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(u);
    ws.onopen = () => {
      intentos = 0;
      $('conexion').hidden = true;
      ws.send(JSON.stringify({ t: 'hola', token: guardado.leer('basket-token') || '' }));
    };
    ws.onmessage = (ev) => {
      let m;
      try { m = JSON.parse(ev.data); } catch (e) { return; }
      recibir(m);
    };
    ws.onclose = () => {
      fase = null;
      actualizarBoton();
      $('conexion').hidden = false;
      const espera = Math.min(5000, 400 * Math.pow(1.6, intentos++)) + Math.random() * 300;
      setTimeout(conectar, espera);
    };
  }
  function enviar(o) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); }

  function recibir(m) {
    switch (m.t) {
      case 'cfg': cfg = m; pintarPremios(); break;
      case 'muestra': muestra = m.s; pintarVista(); break;
      case 'yo':
        if (yo && yo.id === m.id) { Object.assign(yo, m); pintarMensaje(); if (cerrado) pasoCeremonia(); }
        else entrarAlJuego(m);
        break;
      case 'fase':
        fase = m; faseEn = performance.now(); listoEn = faseEn + (m.w || 0); tirando = false;
        clearTimeout(tiroTimer);
        pintarZona(); actualizarBoton();
        break;
      case 'tiro': tiroMio(m.l); break;
      case 'tiros': for (const l of m.l) tiroAjeno(l); programarTabla(); break;
      case 'gana': gana(m); break;
      case 'est': estado(m); break;
      case 'error':
        if (m.de === 'entrar') { mostrarError(m.m); $('entrar').disabled = false; }
        else { toast(m.m); tirando = false; actualizarBoton(); }
        break;
    }
  }

  // ---------- entrada ----------
  function pintarVista() {
    const c = $('vista');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = c.getBoundingClientRect();
    c.width = Math.round(r.width * dpr); c.height = Math.round(r.height * dpr);
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    if (!muestra) return;
    const sp = Muneco.sprite(muestra, 'quieto', c.height * 0.8, 7, true);
    ctx.drawImage(sp, c.width / 2 - sp.pieX, c.height - sp.pieY - 2);
  }
  $('otro').addEventListener('click', () => enviar({ t: 'otro' }));
  $('form').addEventListener('submit', (e) => {
    e.preventDefault();
    const nombre = $('nombre').value.trim(), tel = $('tel').value.trim();
    if (nombre.split(/\s+/).length < 2) return mostrarError('Escribe tu nombre y tu apellido.');
    const d = tel.replace(/\D/g, '').replace(/^51(?=9\d{8}$)/, '');
    if (!/^9\d{8}$/.test(d)) return mostrarError('Escribe tu WhatsApp de 9 dígitos, empezando por 9.');
    $('error').hidden = true;
    $('entrar').disabled = true;
    enviar({ t: 'entrar', nombre, tel: d, s: muestra });
    setTimeout(() => { $('entrar').disabled = false; }, 2500);
  });
  function mostrarError(t) { const e = $('error'); e.textContent = t; e.hidden = false; }

  function entrarAlJuego(m) {
    yo = m;
    guardado.poner('basket-token', m.token);
    document.body.classList.remove('en-entrada');
    $('entrada').hidden = true;
    $('juego').hidden = false;
    window.scrollTo(0, 0);
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    redimensionar();
    pintarBolas();
    pintarMensaje();
    programarTabla();
    revisarMiPremio();
  }

  // ---------- premios ----------
  function premioDe(id) { return cfg && cfg.premios.find((p) => p.id === id); }
  function grupoDe(p, g) { return p && p.grupos && p.grupos.find((x) => x.id === g); }
  function el(tag, cls, txt) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }
  function tarjetaPremio(p) {
    const d = el('article', 'premio p-' + p.id);
    d.appendChild(el('span', 'premio-gratis', p.etiqueta));
    d.appendChild(el('h3', 'premio-nombre', p.nombre));
    if (p.grupos) {
      const gs = el('div', 'premio-grupos');
      for (const g of p.grupos) {
        const f = el('div', 'grupo');
        f.appendChild(el('b', null, g.id));
        const s = el('span');
        s.appendChild(el('strong', null, g.dias));
        s.appendChild(document.createTextNode(g.hora + ' · hora de Lima'));
        f.appendChild(s);
        gs.appendChild(f);
      }
      d.appendChild(gs);
    }
    if (p.dias) d.appendChild(el('p', 'premio-dias', p.dias));
    const q = restantes[p.id] != null ? restantes[p.id] : p.cupos;
    const c = el('div', 'cupos');
    c.setAttribute('aria-label', 'Quedan ' + q + ' de ' + p.cupos + ' cupos');
    for (let i = 0; i < p.cupos; i++) c.appendChild(el('i', 'cupo' + (i < q ? ' lleno' : '')));
    c.appendChild(el('em', null, q === 0 ? 'Agotado' : q === 1 ? 'Queda 1 cupo' : 'Quedan ' + q + ' cupos'));
    d.appendChild(c);
    if (q === 0) d.classList.add('agotado');
    return d;
  }
  function pintarPremios() {
    if (!cfg) return;
    for (const id of ['premios-entrada', 'premios-juego']) {
      const box = $(id);
      box.replaceChildren(...cfg.premios.map(tarjetaPremio));
    }
    for (const id of ['cupos-barra', 'cupos-tira']) {
      $(id).replaceChildren(...cfg.premios.map((p) => {
        const q = restantes[p.id] != null ? restantes[p.id] : p.cupos;
        const s = el('span', p.id === 'videos' ? 'v' : '', (p.id === 'qwen' ? 'Qwen ' : 'Videos ') + q + '/' + p.cupos);
        s.title = p.nombre + ': quedan ' + q + ' cupos';
        return s;
      }));
    }
  }
  function quedanCupos() { return Object.values(restantes).reduce((a, b) => a + b, 0); }

  // ---------- estado del servidor ----------
  function estado(m) {
    abierto = m.ab; restantes = m.r || {};
    const antes = jugadores;
    const nuevos = new Map();
    m.j.forEach((f, i) => {
      const v = antes.get(f[0]);
      nuevos.set(f[0], { id: f[0], corto: f[1], s: f[2], num: f[3], a: f[4], n: f[5], gano: f[6], on: f[7], lugar: i, pose: v ? v.pose : null, poseHasta: v ? v.poseHasta : 0 });
    });
    jugadores.clear();
    for (const [k, v] of nuevos) jugadores.set(k, v);
    ganadores = m.g || [];
    especiales = m.esp || [];
    conConsuelo = m.nc || 0;
    if (yo) {
      const p = jugadores.get(yo.id);
      if (p) { yo.a = Math.max(yo.a, p.a); yo.n = Math.max(yo.n, p.n); yo.gano = p.gano; }
    }
    if (m.ce && !cerrado) { cerBase = performance.now() - (m.ceT || 0); abrirCeremonia(); }
    if (!m.ce && cerrado) cerrarCeremonia();
    cerrado = m.ce;
    pintarPremios();
    ubicar();
    pintarBolas();
    pintarMensaje();
    actualizarBoton();
    programarTabla();
    revisarMiPremio();
  }

  // ---------- cancha ----------
  const cv = $('cancha');
  const ctx = cv.getContext('2d');
  let W = 0, H = 0, DPR = 1, fondo = null;
  const G = {}; // geometría
  let puestos = []; // [{id, x, y, h}]
  const pelotas = [];
  const flotantes = [];
  let redAgita = 0;
  let miPose = 'quieto', miPoseHasta = 0;

  function redimensionar() {
    const r = cv.parentElement.getBoundingClientRect();
    if (!r.width || !r.height) return;
    DPR = Math.min(window.devicePixelRatio || 1, chico() ? 2 : 2.5);
    W = r.width; H = r.height;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    G.piso = H * 0.47;
    G.bw = Math.min(W * 0.36, 190, H * 0.3);
    G.bh = G.bw * 0.62;
    G.bx = W / 2; G.by = Math.max(14, H * 0.06);
    G.ry = G.by + G.bh * 0.8;
    G.rr = G.bw * 0.25;
    G.yoH = Math.min(H * 0.4, 250, W * 0.62);
    G.yoX = W / 2; G.yoY = H - 6;
    pintarFondo();
    ubicar();
    pintarZona();
  }
  window.addEventListener('resize', () => { redimensionar(); if (!$('entrada').hidden) pintarVista(); });

  function pintarFondo() {
    fondo = document.createElement('canvas');
    fondo.width = cv.width; fondo.height = cv.height;
    const c = fondo.getContext('2d');
    c.scale(DPR, DPR);
    // piso
    c.fillStyle = '#e3d8bf';
    c.fillRect(0, G.piso, W, H - G.piso);
    c.fillStyle = '#151410';
    c.fillRect(0, G.piso - 3, W, 4);
    // tablas del piso
    c.strokeStyle = 'rgba(21,20,16,.08)';
    c.lineWidth = 1;
    for (let y = G.piso + 14, k = 0; y < H; y += 14 + k * 2, k++) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
    // zona pintada (trapecio rojo) y línea de tres
    const kx = G.bw * 0.42;
    c.fillStyle = '#ff473e';
    c.beginPath();
    c.moveTo(G.bx - kx, G.piso + 1);
    c.lineTo(G.bx + kx, G.piso + 1);
    c.lineTo(G.bx + kx * 1.5, G.piso + (H - G.piso) * 0.42);
    c.lineTo(G.bx - kx * 1.5, G.piso + (H - G.piso) * 0.42);
    c.closePath();
    c.fill();
    c.lineWidth = 4;
    c.strokeStyle = '#151410';
    c.stroke();
    c.beginPath();
    c.ellipse(G.bx, G.piso + (H - G.piso) * 0.42, kx * 1.5, (H - G.piso) * 0.12, 0, 0, Math.PI);
    c.stroke();
    c.beginPath();
    c.ellipse(G.bx, G.piso, W * 0.47, (H - G.piso) * 0.78, 0, 0.02, Math.PI - 0.02);
    c.lineWidth = 5;
    c.stroke();
    // trama sobre la pared
    c.fillStyle = 'rgba(21,20,16,.18)';
    for (let y = 6; y < G.piso - 6; y += 11) for (let x = 6 + ((y / 11) % 2) * 5; x < W * 0.4 - y * 0.3; x += 11) { c.beginPath(); c.arc(x, y, 1.5, 0, 7); c.fill(); }
    // soporte y tablero
    c.fillStyle = '#151410';
    c.fillRect(G.bx - 5, G.by + G.bh - 4, 10, G.piso - G.by - G.bh + 4);
    c.fillStyle = 'rgba(21,20,16,.85)';
    c.fillRect(G.bx - G.bw / 2 + 6, G.by + 7, G.bw, G.bh);
    c.fillStyle = '#fbf8f0';
    c.fillRect(G.bx - G.bw / 2, G.by, G.bw, G.bh);
    c.lineWidth = 4;
    c.strokeStyle = '#151410';
    c.strokeRect(G.bx - G.bw / 2, G.by, G.bw, G.bh);
    c.lineWidth = 3.5;
    c.strokeStyle = '#ff473e';
    c.strokeRect(G.bx - G.bw * 0.19, G.by + G.bh * 0.38, G.bw * 0.38, G.bh * 0.42);
    // aro de atrás
    c.lineWidth = 3;
    c.strokeStyle = '#151410';
    c.beginPath();
    c.ellipse(G.bx, G.ry, G.rr, G.rr * 0.28, 0, Math.PI, Math.PI * 2);
    c.stroke();
  }

  function dibujarAroDelante(t) {
    const sway = redAgita > t ? Math.sin((redAgita - t) / 40) * 3 : 0;
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#151410';
    const nh = G.rr * 1.05;
    for (let i = 0; i <= 6; i++) {
      const a = Math.PI - (i / 6) * Math.PI;
      const x0 = G.bx + Math.cos(a) * G.rr, y0 = G.ry + Math.sin(a) * G.rr * 0.28;
      const x1 = G.bx + Math.cos(a) * G.rr * 0.55 + sway, y1 = G.ry + nh;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    }
    for (let k = 1; k <= 2; k++) {
      const f = 1 - k * 0.2;
      ctx.beginPath();
      ctx.ellipse(G.bx + sway * k / 2, G.ry + nh * k / 2.6, G.rr * f, G.rr * 0.2 * f, 0, 0, Math.PI);
      ctx.stroke();
    }
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#151410';
    ctx.beginPath();
    ctx.ellipse(G.bx, G.ry, G.rr, G.rr * 0.28, 0, 0, Math.PI);
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ff473e';
    ctx.beginPath();
    ctx.ellipse(G.bx, G.ry, G.rr, G.rr * 0.28, 0, 0, Math.PI);
    ctx.stroke();
  }

  // Ubica a los demás en arcos alrededor del aro, como una tribuna de tiradores. En teléfono, como mucho 24.
  function ubicar() {
    if (!W || !yo) { puestos = []; return; }
    const tope = chico() ? 24 : 60;
    let otros = [...jugadores.values()].filter((p) => p.on && p.id !== yo.id);
    if (otros.length > tope) {
      otros.sort((a, b) => b.a - a.a || b.n - a.n || a.lugar - b.lugar);
      otros = otros.slice(0, tope);
    }
    otros.sort((a, b) => a.lugar - b.lugar);
    const n = otros.length;
    if (!n) { puestos = []; return; }
    const hondo = H - G.piso;
    const base = Math.max(30, Math.min(H * 0.17, 84) * (n <= 6 ? 1 : n <= 14 ? 0.82 : n <= 30 ? 0.66 : 0.54));
    const filas = [];
    const yoRect = { x0: G.yoX - G.yoH * 0.42, x1: G.yoX + G.yoH * 0.42, y0: H - G.yoH * 1.05 };
    for (let k = 0; k < 4; k++) {
      const h = base * (0.78 + 0.16 * k);
      const rx = W * (0.2 + 0.1 * k) + G.bw * 0.2;
      const ry = hondo * (0.2 + 0.2 * k);
      const largo = Math.PI * (rx + ry) / 2;
      const cap = Math.max(1, Math.floor(largo / (h * 0.62)));
      const ps = [];
      for (let i = 0; i < cap; i++) {
        const th = 0.06 * Math.PI + (i + 0.5) / cap * 0.88 * Math.PI;
        const x = G.bx + Math.cos(th) * rx;
        const y = G.piso + 8 + Math.sin(th) * ry;
        if (x < h * 0.3 || x > W - h * 0.3 || y > H - 4) continue;
        if (x > yoRect.x0 && x < yoRect.x1 && y > yoRect.y0) continue;
        ps.push({ x, y, h });
      }
      filas.push(ps);
    }
    const capTotal = filas.reduce((a, f) => a + f.length, 0);
    puestos = [];
    let resto = n, idx = 0;
    // pocos jugadores: una sola fila a media cancha, bien repartida
    const sola = filas.findIndex((f, k) => k >= 1 && f.length >= n);
    if (n <= 8 && sola >= 0) {
      const f = filas[sola];
      for (let i = 0; i < n; i++) {
        const p = f[Math.round((i + 0.5) * f.length / n - 0.5)];
        puestos.push({ id: otros[idx++].id, x: p.x, y: p.y, h: p.h });
      }
      resto = 0;
    }
    for (let k = 0; k < filas.length && resto > 0; k++) {
      const f = filas[k];
      const cuantos = k === filas.length - 1 ? Math.min(resto, f.length) : Math.min(f.length, Math.max(1, Math.round(n * f.length / Math.max(capTotal, n))), resto);
      for (let i = 0; i < cuantos; i++) {
        const p = f[Math.round((i + 0.5) * f.length / cuantos - 0.5)];
        puestos.push({ id: otros[idx++].id, x: p.x, y: p.y, h: p.h });
      }
      resto -= cuantos;
    }
    // si sobran (pantalla muy chica), se apilan atrás
    while (idx < n && filas[0].length) {
      const p = filas[0][idx % filas[0].length];
      puestos.push({ id: otros[idx++].id, x: p.x + 6, y: p.y - 6, h: p.h * 0.9 });
    }
    puestos.sort((a, b) => a.y - b.y);
  }

  // ---------- tiros ----------
  const DUR = { yo: 900, otro: 760 };
  function segmentos(x0, y0, r0, tipo, d, dur) {
    const lado = d >= 0 ? 1 : -1;
    const rb = G.rr * 0.4;
    const pt = {
      centro: [G.bx + d / 100 * G.rr * 0.15, G.ry - 2],
      borde: [G.bx + lado * G.rr * 0.9, G.ry - rb * 0.6],
      tablero: [G.bx + d / 100 * G.rr * 0.5, G.ry - G.bh * 0.5],
      corto: [G.bx + d / 100 * G.rr * 0.4, G.ry + G.rr * 0.25],
    };
    const destino = { limpia: 'centro', aro: 'borde', rebota: 'borde', larga: 'tablero', corta: 'corto' }[tipo];
    const [x1, y1] = pt[destino];
    const pico = Math.max(50, (y0 - y1) * 0.72 + 26);
    const s = [{ x0, y0, x1, y1, pico, dur, r0, r1: rb }];
    const sig = (x, y, pico2, dur2, alfa) => { const a = s[s.length - 1]; s.push({ x0: a.x1, y0: a.y1, x1: x, y1: y, pico: pico2, dur: dur2, r0: rb, r1: rb, alfa }); };
    switch (tipo) {
      case 'limpia':
        sig(G.bx, G.ry + G.rr * 1.3, 0, 200, 0, 'red');
        sig(G.bx, G.piso + 10, 0, 260, 1);
        break;
      case 'aro':
        sig(G.bx, G.ry - 2, G.rr * 0.5, 260);
        sig(G.bx, G.ry + G.rr * 1.3, 0, 200, 0, 'red');
        sig(G.bx, G.piso + 10, 0, 260, 1);
        break;
      case 'rebota':
        sig(G.bx + lado * G.rr * 3, G.ry + G.rr * 1.6, G.rr * 1.1, 480);
        sig(G.bx + lado * G.rr * 3.8, G.piso + 30, G.rr * 0.4, 360, 1);
        break;
      case 'larga':
        sig(G.bx + lado * G.rr * 2.4, G.ry + G.rr * 0.8, G.rr * 0.7, 420);
        sig(G.bx + lado * G.rr * 3.2, G.piso + 40, G.rr * 0.3, 360, 1);
        break;
      case 'corta':
        sig(x1 + lado * G.rr * 0.6, G.piso + 30, G.rr * 0.25, 420, 1);
        break;
    }
    for (const g of s) g.red = false;
    if (tipo === 'limpia') s[1].red = true;
    if (tipo === 'aro') s[2].red = true;
    return s;
  }

  function lanzarPelota(x0, y0, r0, tipo, ok, d, esYo, alTerminar) {
    if (!G.rr) return;
    const tope = chico() ? 6 : 16;
    if (!esYo && pelotas.filter((p) => !p.yo).length >= tope) { if (alTerminar) alTerminar(); return; }
    const segs = segmentos(x0, y0, r0, tipo, d, esYo ? DUR.yo : DUR.otro);
    const p = { segs, i: 0, t0: performance.now(), yo: esYo, ok, tipo, fin: alTerminar };
    if (reducido.matches) { p.reducido = true; }
    pelotas.push(p);
  }

  function tiroMio(l) {
    const [, tipo, ok, d, m, c, a, n] = l;
    tirando = false;
    clearTimeout(tiroTimer);
    miPose = 'tiro'; miPoseHasta = performance.now() + 550;
    marcaServidor = { m: m / 1000, hasta: performance.now() + 900 };
    const x0 = G.yoX, y0 = G.yoY - G.yoH * 1.12;
    lanzarPelota(x0, y0, G.yoH * 0.09, tipo, !!ok, d, true, () => {
      yo.a = Math.max(yo.a, a); yo.n = Math.max(yo.n, n);
      const p = jugadores.get(yo.id); if (p) { p.a = Math.max(p.a, a); p.n = Math.max(p.n, n); }
      popMio(tipo, !!ok);
      pintarBolas();
      pintarMensaje();
      programarTabla();
      if (ok) { miPose = 'festeja'; miPoseHasta = performance.now() + 700; }
    });
    actualizarBoton();
  }

  function tiroAjeno(l) {
    const [id, tipo, ok, d, , , a, n] = l;
    const p = jugadores.get(id);
    if (!p) return;
    if (yo && id === yo.id) return;
    const pu = puestos.find((q) => q.id === id);
    const aplicar = () => { p.a = Math.max(p.a, a); p.n = Math.max(p.n, n); };
    if (!pu) { aplicar(); return; }
    const ahora = performance.now();
    p.pose = 'carga'; p.poseHasta = ahora + 180;
    setTimeout(() => {
      p.pose = 'tiro'; p.poseHasta = performance.now() + 450;
      lanzarPelota(pu.x, pu.y - pu.h * 1.1, Math.max(2.5, pu.h * 0.09), tipo, !!ok, d, false, () => {
        aplicar();
        if (ok) {
          flotantes.push({ x: pu.x, y: pu.y - pu.h * 1.2, t0: performance.now(), txt: '+1' });
          p.pose = 'festeja'; p.poseHasta = performance.now() + 600;
        }
      });
    }, reducido.matches ? 0 : 180);
  }

  let marcaServidor = null;
  const TEXTO_FALLO = { rebota: 'Se salió', corta: 'Corto', larga: 'Largo' };
  function popMio(tipo, ok) {
    const box = $('pops');
    if (ok) {
      redAgita = performance.now() + 350;
      if (!reducido.matches) {
        const sp = el('img', 'pop-mancha');
        sp.src = Math.random() < 0.5 ? 'img/splat-yellow.svg' : 'img/splat-red.svg';
        sp.alt = '';
        box.appendChild(sp);
        setTimeout(() => sp.remove(), 1000);
      }
      const t = el('div', 'pop si', tipo === 'limpia' ? 'Limpia' : 'Adentro');
      box.appendChild(t);
      setTimeout(() => t.remove(), 1150);
    } else {
      const t = el('div', 'pop no', TEXTO_FALLO[tipo] || 'Fuera');
      box.appendChild(t);
      setTimeout(() => t.remove(), 1150);
    }
  }

  function posEn(g, u) {
    const x = g.x0 + (g.x1 - g.x0) * u;
    const y = g.y0 + (g.y1 - g.y0) * u - g.pico * 4 * u * (1 - u);
    return [x, y, g.r0 + (g.r1 - g.r0) * u];
  }

  // ---------- bucle de dibujo ----------
  function cuadro(t) {
    requestAnimationFrame(cuadro);
    moverAguja(t);
    if ($('juego').hidden || !fondo) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.drawImage(fondo, 0, 0);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    // los demás
    for (const pu of puestos) {
      const p = jugadores.get(pu.id);
      if (!p) continue;
      const pose = p.pose && p.poseHasta > t ? p.pose : 'quieto';
      const sp = Muneco.sprite(p.s, pose, pu.h * DPR, p.num, pose === 'quieto' || pose === 'carga');
      ctx.drawImage(sp, pu.x - sp.pieX / DPR, pu.y - sp.pieY / DPR, sp.width / DPR, sp.height / DPR);
      if (p.gano) {
        ctx.fillStyle = '#f0ff00';
        ctx.strokeStyle = '#151410';
        ctx.lineWidth = 2;
        const r = Math.max(5, pu.h * 0.1);
        ctx.beginPath(); ctx.arc(pu.x + pu.h * 0.26, pu.y - pu.h * 1.08, r, 0, 7); ctx.fill(); ctx.stroke();
      }
    }

    // pelotas (atrás del aro de adelante)
    for (let i = pelotas.length - 1; i >= 0; i--) {
      const p = pelotas[i];
      let g = p.segs[p.i];
      let u = (t - p.t0) / g.dur;
      if (p.reducido) { // sin vuelo: la pelota aparece en el punto de contacto y se va
        g = p.segs[0];
        u = 1;
        if (t - p.t0 > 500) { pelotas.splice(i, 1); if (p.fin) p.fin(); continue; }
      } else {
        while (u >= 1 && p.i < p.segs.length - 1) {
          p.t0 += g.dur; p.i++; g = p.segs[p.i]; u = (t - p.t0) / g.dur;
          if (g.red) redAgita = t + 300;
        }
        if (u >= 1) { pelotas.splice(i, 1); if (p.fin) p.fin(); continue; }
      }
      const [x, y, r] = posEn(g, Math.max(0, u));
      ctx.globalAlpha = g.alfa ? Math.max(0, 1 - u) : 1;
      Muneco.pelota(ctx, x, y, r);
      ctx.globalAlpha = 1;
    }
    dibujarAroDelante(t);

    // +1 flotantes
    ctx.font = '22px Anton, Impact, sans-serif';
    ctx.textAlign = 'center';
    for (let i = flotantes.length - 1; i >= 0; i--) {
      const f = flotantes[i];
      const u = (t - f.t0) / 900;
      if (u >= 1) { flotantes.splice(i, 1); continue; }
      ctx.globalAlpha = 1 - u * u;
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#151410';
      ctx.strokeText(f.txt, f.x, f.y - u * 26);
      ctx.fillStyle = '#f0ff00';
      ctx.fillText(f.txt, f.x, f.y - u * 26);
      ctx.globalAlpha = 1;
    }

    // yo, grande y adelante
    if (yo) {
      const pose = miPoseHasta > t ? miPose : tirando ? 'carga' : 'quieto';
      const conPelota = (pose === 'quieto' || pose === 'carga') && !pelotas.some((p) => p.yo);
      const sp = Muneco.sprite(yo.s, pose, G.yoH * DPR, yo.num, conPelota);
      ctx.drawImage(sp, G.yoX - sp.pieX / DPR, G.yoY - sp.pieY / DPR, sp.width / DPR, sp.height / DPR);
      ctx.font = '600 13px Barlow, Arial, sans-serif';
      const etiqueta = 'Tú';
      const tw = ctx.measureText(etiqueta).width + 14;
      ctx.fillStyle = '#151410';
      ctx.fillRect(G.yoX + G.yoH * 0.2, G.yoY - G.yoH * 1.14, tw, 22);
      ctx.fillStyle = '#f3eddf';
      ctx.textAlign = 'left';
      ctx.fillText(etiqueta, G.yoX + G.yoH * 0.2 + 7, G.yoY - G.yoH * 1.14 + 15);
    }
  }

  // ---------- medidor y botón ----------
  const aguja = $('aguja'), zona = $('zona'), medidor = $('medidor');
  let anchoMedidor = 0;
  function tri(x) { const f = x - Math.floor(x); return 1 - Math.abs(2 * f - 1); }
  function pintarZona() {
    anchoMedidor = medidor.clientWidth;
    if (!fase) return;
    zona.style.left = ((fase.c - fase.h) * 100) + '%';
    zona.style.width = (fase.h * 200) + '%';
  }
  function valorMedidor(t) { return fase ? tri((t - faseEn) / fase.p + fase.x) : 0; }
  function moverAguja(t) {
    if ($('juego').hidden || !anchoMedidor) return;
    let m = valorMedidor(t);
    if (marcaServidor && marcaServidor.hasta > t) m = marcaServidor.m;
    aguja.style.transform = 'translateX(' + (m * anchoMedidor).toFixed(1) + 'px)';
    const boton = $('lanzar');
    if (fase && listoEn > t && !tirando) {
      $('carga').style.transform = 'scaleX(' + (1 - (listoEn - t) / (cfg ? cfg.espera : 2500)).toFixed(3) + ')';
      if (!boton.disabled) actualizarBoton();
    } else {
      $('carga').style.transform = 'scaleX(0)';
      if (boton.disabled && puedeTirar()) actualizarBoton();
    }
  }
  function puedeTirar() {
    return !!(yo && fase && abierto && !cerrado && !tirando && performance.now() >= listoEn && ws && ws.readyState === 1);
  }
  function actualizarBoton() {
    const b = $('lanzar'), tx = $('lanzar-texto');
    const ok = puedeTirar();
    b.disabled = !ok;
    let texto = 'Lanzar';
    if (!ws || ws.readyState !== 1) texto = 'Conectando';
    else if (cerrado) texto = 'Sorteo cerrado';
    else if (!abierto) texto = 'En pausa';
    else if (tirando) texto = 'Lanzando';
    else if (fase && performance.now() < listoEn) texto = 'Espera';
    if (tx.textContent !== texto) tx.textContent = texto;
    medidor.classList.toggle('fuera', !ok);
    const av = $('aviso-juego');
    if (yo && !abierto && !cerrado) {
      av.replaceChildren(document.createTextNode('En pausa'), el('small', null, 'El juego empieza cuando el profe lo abra. Mientras, mira la cancha.'));
      av.hidden = false;
    } else av.hidden = true;
  }
  function tirar() {
    if (!puedeTirar()) return;
    const e = Math.round(performance.now() - faseEn);
    tirando = true;
    enviar({ t: 'tiro', f: fase.f, e });
    actualizarBoton();
    clearTimeout(tiroTimer);
    tiroTimer = setTimeout(() => { tirando = false; actualizarBoton(); }, 3000);
  }
  const lanzar = $('lanzar');
  lanzar.addEventListener('pointerdown', (e) => { if (e.button === 0) { e.preventDefault(); tirar(); } });
  lanzar.addEventListener('click', (e) => { if (e.detail === 0) tirar(); });
  lanzar.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('keydown', (e) => {
    if (e.code !== 'Space' || e.repeat) return;
    const tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'BUTTON') return;
    if ($('juego').hidden || !$('revelar').hidden) return;
    e.preventDefault();
    tirar();
  });

  // ---------- marcador propio ----------
  function pintarBolas() {
    if (!yo || !cfg) return;
    const b = $('bolas');
    const hijos = [];
    for (let i = 0; i < cfg.meta; i++) hijos.push(el('span', 'bola' + (i < yo.a ? ' si' : '')));
    if (yo.a > cfg.meta) hijos.push(el('span', 'bola-extra', '+' + (yo.a - cfg.meta)));
    b.replaceChildren(...hijos);
    b.setAttribute('aria-label', 'Llevas ' + yo.a + ' encestes de ' + cfg.meta);
  }
  function pintarMensaje() {
    if (!yo || !cfg) return;
    let t = '';
    const faltan = cfg.meta - yo.a;
    if (yo.gano && (revelando || !guardado.leer('basket-visto-' + yo.id + '-' + yo.gano))) {
      t = 'Llegaste a ' + cfg.meta + '. Sorteando tu premio…';
    } else if (yo.gano) {
      const g = ganadores.find((x) => x[0] === yo.gano);
      const p = g && premioDe(g[5]);
      t = p ? 'Ganaste ' + (p.id === 'qwen' ? 'Qwen Coder' : 'Videos con IA') + (g[6] ? ', ' + g[6] : '') + '. Sigue jugando.' : 'Ganaste un cupo.';
    } else if (quedanCupos() === 0) {
      t = 'Cupos agotados. La cancha sigue abierta para jugar.';
    } else if (faltan <= 0) {
      t = 'Llegaste a ' + cfg.meta + ', pero los cupos ya tenían dueño.';
    } else {
      t = faltan === 1 ? 'Te falta 1 enceste.' : 'Te faltan ' + faltan + ' encestes.';
    }
    const m = $('mensaje');
    if (m.textContent !== t) m.textContent = t;
  }

  // ---------- tabla ----------
  let tablaPend = 0;
  function programarTabla() {
    if (tablaPend) return;
    tablaPend = setTimeout(() => { tablaPend = 0; pintarTabla(); }, 450);
  }
  function pintarTabla() {
    const lista = [...jugadores.values()];
    lista.sort((a, b) => (a.gano || 1e9) - (b.gano || 1e9) || b.a - a.a || a.n - b.n || a.lugar - b.lugar);
    const enCancha = lista.filter((p) => p.on).length;
    $('en-cancha').textContent = enCancha === 1 ? '1 en la cancha' : enCancha + ' en la cancha';
    const limite = verTodo ? lista.length : (chico() ? 8 : 25);
    let mostrar = lista.slice(0, limite);
    if (yo && !mostrar.some((p) => p.id === yo.id)) {
      const p = lista.find((q) => q.id === yo.id);
      if (p) mostrar = mostrar.concat([p]);
    }
    const meta = cfg ? cfg.meta : 3;
    const filas = mostrar.map((p) => {
      const li = el('li', 'fila' + (yo && p.id === yo.id ? ' yo' : '') + (p.gano ? ' gano' : '') + (p.on ? '' : ' off'));
      li.appendChild(el('span', 'pos', String(lista.indexOf(p) + 1)));
      const img = el('img');
      img.src = Muneco.retrato(p.s, 72);
      img.alt = '';
      li.appendChild(img);
      const nom = el('span', 'nom');
      nom.appendChild(el('b', null, p.corto + (yo && p.id === yo.id ? ' (tú)' : '')));
      if (p.gano) {
        const g = ganadores.find((x) => x[0] === p.gano);
        const pr = g && premioDe(g[5]);
        nom.appendChild(el('small', 'premio-tag', 'Ganó ' + (pr ? (pr.id === 'qwen' ? 'Qwen Coder' : 'Videos con IA') : 'un cupo') + (g && g[6] ? ' · ' + g[6] : '')));
      } else {
        nom.appendChild(el('small', null, p.n === 1 ? '1 tiro' : p.n + ' tiros'));
      }
      li.appendChild(nom);
      const mk = el('span', 'marca');
      mk.setAttribute('aria-label', p.a + ' encestes');
      for (let i = 0; i < meta; i++) mk.appendChild(el('i', i < p.a ? 'si' : ''));
      mk.appendChild(el('b', null, String(p.a)));
      li.appendChild(mk);
      return li;
    });
    $('tabla').replaceChildren(...filas);
    const vt = $('ver-todo');
    vt.hidden = lista.length <= limite && !verTodo;
    vt.textContent = verTodo ? 'Ver solo los primeros' : 'Ver toda la tabla (' + lista.length + ')';
  }
  $('ver-todo').addEventListener('click', () => { verTodo = !verTodo; pintarTabla(); });

  // ---------- ganadores ----------
  function gana(m) {
    if (yo && m.id === yo.id) {
      yo.gano = m.o;
      if (!ganadores.some((g) => g[0] === m.o)) ganadores.push([m.o, m.id, m.corto, m.s, m.num, m.p, m.g]);
      // espera a que la pelota caiga
      setTimeout(revisarMiPremio, reducido.matches ? 300 : 1500);
      return;
    }
    const p = premioDe(m.p);
    setTimeout(() => toast(m.corto + ' ganó un cupo: ' + (p ? p.nombre : 'premio') + '.'), 900);
  }

  let revelando = false;
  function revisarMiPremio() {
    if (!yo || !yo.gano || revelando || !cfg) return;
    const clave = 'basket-visto-' + yo.id + '-' + yo.gano;
    if (guardado.leer(clave)) return;
    const g = ganadores.find((x) => x[0] === yo.gano);
    if (!g) return;
    if (pelotas.some((p) => p.yo)) { setTimeout(revisarMiPremio, 400); return; }
    revelando = true;
    revelar(g[5], g[6], () => { guardado.poner(clave, '1'); });
    pintarMensaje();
  }

  function revelar(premioID, grupoID, alFinal) {
    const capa = $('revelar');
    const cartas = $('rev-cartas'), grupos = $('rev-grupos'), fin = $('rev-final'), ok = $('rev-ok');
    grupos.hidden = true; fin.hidden = true; ok.hidden = true;
    $('rev-sub').textContent = 'Sorteando tu premio entre los cupos que quedan…';
    const els = cfg.premios.map((p) => {
      const c = el('div', 'carta');
      c.appendChild(el('b', null, p.nombre));
      c.appendChild(el('span', null, p.etiqueta));
      c.dataset.id = p.id;
      const q = (restantes[p.id] || 0) + (p.id === premioID ? 1 : 0);
      if (q <= 0) c.classList.add('vacia');
      return c;
    });
    cartas.replaceChildren(...els);
    capa.hidden = false;
    const candidatas = els.filter((c) => !c.classList.contains('vacia'));
    const meta = els.find((c) => c.dataset.id === premioID) || els[0];
    barajar(candidatas, meta, () => {
      els.forEach((c) => c.classList.toggle('pierde', c !== meta));
      meta.classList.add('gana');
      const p = premioDe(premioID);
      const g = grupoDe(p, grupoID);
      const terminar = () => {
        const f = [el('strong', null, p.nombre + ' · ' + p.etiqueta)];
        if (g) f.push(document.createTextNode('Grupo ' + g.id + ': ' + g.dias + ', ' + g.hora + ' (hora de Lima). '));
        else if (p.dias) f.push(document.createTextNode(p.dias + '. '));
        f.push(document.createTextNode('El profe te escribirá a tu WhatsApp para inscribirte.'));
        fin.replaceChildren(...f);
        fin.hidden = false;
        ok.hidden = false;
        $('rev-sub').textContent = 'Tu premio:';
        ok.focus();
        if (alFinal) alFinal();
      };
      if (g && p.grupos.length > 1) {
        const filas = p.grupos.map((x) => {
          const r = el('div', 'grupo');
          r.appendChild(el('b', null, x.id));
          const s = el('span');
          s.appendChild(el('strong', null, x.dias));
          s.appendChild(document.createTextNode(x.hora));
          r.appendChild(s);
          r.dataset.id = x.id;
          return r;
        });
        grupos.replaceChildren(...filas);
        grupos.hidden = false;
        $('rev-sub').textContent = 'Ahora, tu grupo…';
        const metaG = filas.find((r) => r.dataset.id === g.id);
        setTimeout(() => barajar(filas, metaG, () => {
          filas.forEach((r) => r.classList.toggle('pierde', r !== metaG));
          metaG.classList.add('gana');
          terminar();
        }), reducido.matches ? 0 : 500);
      } else terminar();
    });
  }

  // barajar: la luz salta entre opciones, cada vez más lento, y cae en la que decidió el servidor.
  function barajar(opciones, meta, listo) {
    if (reducido.matches || opciones.length < 2) { listo(); return; }
    let i = 0, paso = 70;
    const ini = opciones.indexOf(meta);
    const vueltas = opciones.length * 6 + ((ini - (opciones.length * 6) % opciones.length) + opciones.length) % opciones.length;
    const tic = () => {
      opciones.forEach((o) => o.classList.remove('luz'));
      const o = opciones[i % opciones.length];
      o.classList.add('luz');
      if (i >= vueltas) { o.classList.remove('luz'); listo(); return; }
      i++;
      paso = Math.min(420, paso * 1.11);
      setTimeout(tic, paso);
    };
    tic();
  }
  $('rev-ok').addEventListener('click', () => { $('revelar').hidden = true; revelando = false; pintarMensaje(); });

  // ---------- ceremonia ----------
  // Pasos, todas las pantallas al mismo compás (desde la hora de cierre del servidor): cada ganador del 100 %,
  // luego el 80 % de descuento (público) y al final, en cada pantalla, el resultado propio.
  let cerTimer = 0, cerClave = '';
  function abrirCeremonia() {
    $('ceremonia').hidden = false;
    $('revelar').hidden = true;
    cerClave = '';
    $('cer-lista').replaceChildren();
    $('cer-escena').replaceChildren();
    $('cer-mio').replaceChildren();
    clearInterval(cerTimer);
    cerTimer = setInterval(pasoCeremonia, 200);
    pasoCeremonia();
  }
  function cerrarCeremonia() {
    clearInterval(cerTimer);
    $('ceremonia').hidden = true;
    $('cer-fiesta').replaceChildren();
  }
  // consuelo propio: «esp» (80 % de descuento en un curso en vivo) o «web» (acceso web por S/ 10)
  function miConsuelo() { return yo && yo.con && !yo.gano ? { tipo: yo.con, paga: yo.paga, esp: yo.con === 'esp' } : null; }
  function pasosCeremonia() {
    const pasos = ganadores.map((g, i) => ({ k: 'g' + g[0], tipo: 'g', g, i }));
    for (const e of especiales) pasos.push({ k: 'esp' + e[0], tipo: 'esp', e });
    if (miConsuelo()) pasos.push({ k: 'mio', tipo: 'mio' });
    return pasos;
  }
  function pasoCeremonia(forzar) {
    if ($('ceremonia').hidden || cerBase == null) return;
    const ms = cfg ? cfg.revelar : 3200;
    const pasos = pasosCeremonia();
    const lento = performance.now() - cerBase;
    const idx = Math.floor(lento / ms);
    const escena = $('cer-escena');
    const paso = idx < pasos.length ? pasos[idx] : null;
    const clave = paso ? paso.k : 'fin:' + ganadores.length + ':' + especiales.length + ':' + (miConsuelo() ? miConsuelo().tipo : '');
    if (clave === cerClave && forzar !== true) return;
    const primera = cerClave === '';
    cerClave = clave;
    const enVivo = !primera || (paso && lento < ms * (idx + 0.6));
    if (paso) {
      escena.hidden = false;
      $('cer-pie').hidden = true;
      $('cer-mio').replaceChildren();
      $('cer-t').textContent = paso.tipo === 'mio' ? 'Tu resultado' : 'Los ganadores';
      if (paso.tipo === 'g') escena.replaceChildren(tarjetaGanador(paso.g, paso.i));
      else if (paso.tipo === 'esp') escena.replaceChildren(tarjetaEspecial(paso.e));
      else escena.replaceChildren(tarjetaMia(true));
      const previos = pasos.slice(0, idx).filter((x) => x.tipo !== 'mio');
      $('cer-lista').replaceChildren(...previos.map((x) => (x.tipo === 'g' ? filaGanador(x.g) : filaEspecial(x.e))));
      if (enVivo && paso.tipo !== 'mio') fiesta();
      return;
    }
    // final: resultado propio arriba, luego la lista completa
    // la tarjeta propia del paso anterior pasa tal cual (si su rueda sigue girando, termina ahí)
    const previa = escena.querySelector('.mio');
    escena.hidden = true;
    const mio = miConsuelo();
    if (previa && mio) $('cer-mio').replaceChildren(previa);
    else $('cer-mio').replaceChildren(...(mio ? [tarjetaMia(!guardado.leer('basket-consuelo-' + yo.id))] : []));
    escena.replaceChildren();
    const filas = ganadores.map(filaGanador).concat(especiales.map(filaEspecial));
    $('cer-lista').replaceChildren(...filas);
    if (!filas.length) {
      escena.hidden = false;
      escena.replaceChildren(el('p', 'cer-vacio', 'Esta vez nadie llegó a ' + (cfg ? cfg.meta : 3) + ' encestes.'));
    }
    $('cer-t').textContent = ganadores.length === 1 ? 'El ganador' : 'Los ganadores';
    let pie = 'El profe escribirá por WhatsApp a cada ganador para inscribirlo.';
    if (conConsuelo > 0 && cfg.consuelo.premio) pie += ' Quienes tiraron al menos una vez ganaron ' + cfg.consuelo.premio.texto.charAt(0).toLowerCase() + cfg.consuelo.premio.texto.slice(1) + ' por S/ ' + cfg.consuelo.premio.precio + ': cada uno lo ve en su pantalla.';
    $('cer-pie').textContent = pie;
    $('cer-pie').hidden = false;
  }

  // Dinero: «S/ 17,50» (dos decimales con coma). Se calcula en céntimos para no redondear mal.
  function soles(precio, pct) {
    const c = Math.round(precio * pct);
    return 'S/ ' + Math.floor(c / 100) + ',' + String(c % 100).padStart(2, '0');
  }
  function nombreCorto(p) { return p.id === 'qwen' ? 'Orquestación con Qwen Coder' : p.nombre; }
  function lista(xs) { return xs.length < 2 ? xs.join('') : xs.slice(0, -1).join(', ') + ' y ' + xs[xs.length - 1]; }
  function enlace(cls, texto, href) {
    const a = el('a', cls, texto);
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener';
    return a;
  }
  // «Hola, soy Ana R.» sin doble punto (el nombre corto ya termina en punto)
  function saludo() { return 'Hola, soy ' + yo.corto + (yo.corto.endsWith('.') ? '' : '.'); }
  function tarjetaMia(animar) {
    const mio = miConsuelo();
    const web = cfg.consuelo.premio;
    const d = el('article', 'mio' + (mio.esp ? ' esp' : ' web'));
    d.appendChild(el('span', 'mio-etq', 'Tu resultado, ' + yo.corto));
    // sello: línea chica + número enorme («Acceso web» / «S/ 10» / «por 1 año»; el especial, «80 %» / «de descuento»)
    const NB = ' ';
    const num = el('p', 'mio-num');
    const caja = el('span', 'mio-caja');
    const pre = el('span', 'mio-pre');
    const grande = el('span', 'mio-grande');
    const post = el('span', 'mio-post');
    caja.append(pre, grande, post);
    num.appendChild(caja);
    const descuento = 100 - mio.paga;
    num.setAttribute('aria-label', mio.esp ? descuento + ' % de descuento' : 'Acceso web por S/ ' + web.precio);
    d.appendChild(num);
    const final = () => {
      if (mio.esp) { pre.textContent = ''; grande.textContent = descuento + NB + '%'; post.textContent = 'de descuento'; }
      else { pre.textContent = 'Acceso web'; grande.textContent = 'S/' + NB + web.precio; post.textContent = 'por ' + web.vigencia; }
    };
    const resto = el('div', 'mio-resto');
    if (mio.esp) {
      resto.appendChild(el('p', 'mio-sub', 'Te tocó el premio único del sorteo: pagas solo el ' + mio.paga + ' % del curso en vivo que elijas.'));
      const ul = el('ul', 'mio-precios');
      for (const p of cfg.premios) {
        const li = el('li');
        const n = el('span', null, nombreCorto(p));
        n.appendChild(el('s', null, 'Precio normal S/ ' + p.precio));
        li.appendChild(n);
        li.appendChild(el('b', null, soles(p.precio, mio.paga)));
        ul.appendChild(li);
      }
      resto.appendChild(ul);
      resto.appendChild(el('p', 'mio-nota', 'El descuento vale para uno de los dos cursos. Elige cuál y avísale al profe por WhatsApp.'));
      if (cfg.whatsapp) {
        const precios = cfg.premios.map((p) => nombreCorto(p) + ' ' + soles(p.precio, mio.paga)).join(' o ');
        resto.appendChild(enlace('boton-grande', 'Avisar al profe', 'https://wa.me/' + cfg.whatsapp + '?text=' + encodeURIComponent(saludo() + ' En el sorteo basket me tocó el ' + descuento + ' % de descuento (' + precios + '). Elijo el curso: ')));
      }
    } else {
      resto.appendChild(el('p', 'mio-sub', 'Acceso web por ' + web.vigencia + ' a cualquier curso del catálogo: ' + lista(web.incluye) + '.'));
      if (web.no_incluye) resto.appendChild(el('p', 'mio-aviso', 'No incluye ' + web.no_incluye + '.'));
      resto.appendChild(el('p', 'mio-nota', 'Elige tu curso en el catálogo y avísale al profe por WhatsApp.'));
      const botones = el('div', 'mio-botones');
      if (web.url_catalogo) botones.appendChild(enlace('boton-grande boton-catalogo', 'Ver el catálogo', web.url_catalogo));
      if (cfg.whatsapp) {
        botones.appendChild(enlace('boton-grande', 'Avisar al profe', 'https://wa.me/' + cfg.whatsapp + '?text=' + encodeURIComponent(saludo() + ' En el sorteo basket me tocó el acceso web por S/ ' + web.precio + ' (' + web.vigencia + ', cualquier curso del catálogo). Quiero el curso: ')));
      }
      resto.appendChild(botones);
    }
    d.appendChild(resto);
    const listo = () => {
      final();
      num.classList.remove('rueda');
      num.classList.add('sello');
      resto.hidden = false;
      guardado.poner('basket-consuelo-' + yo.id, '1');
      if (animar) fiesta();
    };
    if (!animar || reducido.matches) { listo(); return d; }
    resto.hidden = true;
    num.classList.add('rueda');
    let i = 0, paso = 45;
    if (mio.esp) {
      // el descuento sube de 0 a 80 %, cada vez más lento
      post.textContent = 'de descuento';
      const pasos = 16;
      const tic = () => {
        const v = Math.round(descuento * (1 - Math.pow(1 - i / pasos, 2.2)));
        grande.textContent = v + NB + '%';
        if (i >= pasos) { listo(); return; }
        i++;
        paso = Math.min(220, paso * 1.12);
        setTimeout(tic, paso);
      };
      setTimeout(tic, 250);
    } else {
      // tragamonedas: las cifras giran y se clavan una por una en el precio (es solo la animación)
      pre.textContent = 'Acceso web';
      post.textContent = 'por ' + web.vigencia;
      const cifras = String(web.precio).split('');
      const fijas = [];
      const tic = () => {
        const giro = cifras.map((c, k) => (k < fijas.length ? c : String(Math.floor(Math.random() * 10)))).join('');
        grande.textContent = 'S/' + NB + giro;
        i++;
        if (i % 7 === 0) fijas.push(1);
        if (fijas.length > cifras.length) { listo(); return; }
        paso = Math.min(160, paso * 1.06);
        setTimeout(tic, paso);
      };
      setTimeout(tic, 250);
    }
    return d;
  }
  function tarjetaEspecial(e) {
    const d = tarjetaGanador([0, e[0], e[1], e[2], e[3], '', ''], 1);
    const tx = d.lastChild;
    tx.querySelector('.g-orden').textContent = 'Premio único';
    const pr = tx.querySelector('.g-premio');
    const pct = cfg.consuelo.especial_paga_pct;
    pr.replaceChildren(el('b', null, cfg.consuelo.especial_texto || (100 - pct) + ' % de descuento'),
      document.createTextNode('Paga solo el ' + pct + ' % del curso que elija.'));
    return d;
  }
  function filaEspecial(e) {
    const li = el('li', 'esp');
    li.appendChild(el('b', 'o', (100 - cfg.consuelo.especial_paga_pct) + '\u00a0%'));
    const img = el('img');
    img.src = Muneco.retrato(e[2], 88);
    img.alt = '';
    li.appendChild(img);
    const s = el('span');
    s.appendChild(el('strong', null, e[1]));
    s.appendChild(document.createTextNode((cfg.consuelo.especial_texto || 'Descuento') + ' en el curso que elija'));
    li.appendChild(s);
    return li;
  }
  function textoPremio(g) {
    const p = premioDe(g[5]);
    if (!p) return ['Premio', ''];
    const gr = grupoDe(p, g[6]);
    return [p.nombre, gr ? 'Grupo ' + gr.id + ': ' + gr.dias + ', ' + gr.hora : (p.dias || '')];
  }
  function tarjetaGanador(g, i) {
    const d = el('article', 'ganador c' + (i % 3));
    const c = el('canvas');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const ancho = chico() ? 170 : 180, alto = Math.round(ancho * 1.4);
    c.width = ancho * dpr; c.height = alto * dpr;
    const sp = Muneco.sprite(g[3], 'festeja', alto * dpr * 0.72, g[4], false);
    c.getContext('2d').drawImage(sp, c.width / 2 - sp.pieX, c.height - sp.pieY - 4);
    d.appendChild(c);
    const tx = el('div');
    tx.appendChild(el('span', 'g-orden', 'Ganador ' + g[0] + ' de ' + ganadores.length));
    tx.appendChild(el('h3', 'g-nombre', g[2]));
    const [nom, det] = textoPremio(g);
    const pr = el('p', 'g-premio');
    pr.appendChild(el('b', null, nom));
    pr.appendChild(document.createTextNode(det));
    tx.appendChild(pr);
    d.appendChild(tx);
    return d;
  }
  function filaGanador(g) {
    const li = el('li');
    li.appendChild(el('b', 'o', String(g[0])));
    const img = el('img');
    img.src = Muneco.retrato(g[3], 88);
    img.alt = '';
    li.appendChild(img);
    const s = el('span');
    s.appendChild(el('strong', null, g[2]));
    const [nom, det] = textoPremio(g);
    s.appendChild(document.createTextNode(nom + (det ? '. ' + det : '')));
    li.appendChild(s);
    return li;
  }
  function fiesta() {
    if (reducido.matches) return;
    const box = $('cer-fiesta');
    const papeles = chico() ? 14 : 34, manchas = chico() ? 2 : 5;
    const colores = ['#ff473e', '#f0ff00', '#f3eddf'];
    const nuevos = [];
    for (let i = 0; i < manchas; i++) {
      const m = el('img', 'manchita');
      m.src = ['img/splat-red.svg', 'img/splat-yellow.svg'][i % 2];
      m.alt = '';
      m.style.left = (Math.random() * 90 - 10) + '%';
      m.style.top = (Math.random() * 70) + '%';
      m.style.animationDelay = (i * 0.12) + 's';
      nuevos.push(m);
    }
    for (let i = 0; i < papeles; i++) {
      const p = el('span', 'papelito');
      p.style.left = (Math.random() * 100) + '%';
      p.style.background = colores[i % 3];
      p.style.animationDuration = (1.8 + Math.random() * 1.6) + 's';
      p.style.animationDelay = (Math.random() * 0.5) + 's';
      p.style.setProperty('--dx', (Math.random() * 120 - 60) + 'px');
      p.style.setProperty('--rot', (Math.random() * 900 - 450) + 'deg');
      p.style.width = (8 + Math.random() * 10) + 'px';
      nuevos.push(p);
    }
    box.replaceChildren(...nuevos);
    setTimeout(() => { for (const n of nuevos) n.remove(); }, 4200);
  }

  // ---------- avisos ----------
  let toastTimer = 0;
  function toast(t) {
    const e = $('toast');
    e.textContent = t;
    e.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { e.hidden = true; }, 3200);
  }

  // ---------- arranque ----------
  if (window.ResizeObserver) new ResizeObserver(() => redimensionar()).observe($('cancha').parentElement);
  document.fonts && document.fonts.ready.then(() => { pintarVista(); if (fondo) redimensionar(); });
  requestAnimationFrame(cuadro);
  conectar();
})();
