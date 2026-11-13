// Sorteo de penales · lógica (archivo aparte: el servidor no admite scripts incrustados).
// El premio lo decide el servidor (POST api/jugar, con pesos y topes); aquí el penal solo lo revela.
(async function () {
  const $ = (id) => document.getElementById(id), cv = $('cancha'), x = cv.getContext('2d');
  const W = 360, H = 300; x.scale(2, 2);
  const lento = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ARCO = { x1: 62, x2: 298, y1: 62, y2: 176 }, PUNTO = { x: 180, y: 268 };
  const ZONAS = [[100, 92], [180, 88], [260, 92], [100, 150], [180, 152], [260, 150]];
  let zona = 2, etapa = 'inicio', t0 = 0, premio = 50, confeti = [], luces = [];
  for (let i = 0; i < 70; i++) luces.push([Math.random() * W, 8 + Math.random() * 40, Math.random()]);

  // ---------------------------------------------------------------- sonido (Web Audio, sin archivos)
  let audio = null, conSonido = true;
  const ctxAudio = () => { if (!conSonido) return null; try { audio ??= new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === 'suspended') audio.resume(); return audio; } catch { return null; } };
  function tono(f, dur, tipo = 'sine', vol = 0.12, cuando = 0) { const a = ctxAudio(); if (!a) return; const o = a.createOscillator(), g = a.createGain(); o.type = tipo; o.frequency.value = f; g.gain.setValueAtTime(vol, a.currentTime + cuando); g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + cuando + dur); o.connect(g).connect(a.destination); o.start(a.currentTime + cuando); o.stop(a.currentTime + cuando + dur); }
  function ruido(dur, vol, frec, cuando = 0) { const a = ctxAudio(); if (!a) return; const n = Math.floor(a.sampleRate * dur), b = a.createBuffer(1, n, a.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * i / n); const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(); f.type = 'bandpass'; f.frequency.value = frec; g.gain.value = vol; s.buffer = b; s.connect(f).connect(g).connect(a.destination); s.start(a.currentTime + cuando); }
  const silbato = () => { tono(2100, 0.28, 'square', 0.05); tono(2300, 0.28, 'square', 0.04, 0.02); };
  const patada = () => ruido(0.12, 0.5, 180);
  const hinchada = (fuerza) => { ruido(1.8, 0.22 * fuerza, 900); ruido(1.6, 0.16 * fuerza, 1700, 0.1); };
  const fanfarria = () => [523, 659, 784, 1047].forEach((f, i) => tono(f, 0.3, 'triangle', 0.1, i * 0.11));
  $('sonido').onclick = () => { conSonido = !conSonido; $('sonido').setAttribute('aria-pressed', String(conSonido)); $('sonido').textContent = 'Sonido: ' + (conSonido ? 'sí' : 'no'); };

  // ---------------------------------------------------------------- dibujo
  const mezcla = (a, b, t) => a + (b - a) * t, suave = (t) => t * t * (3 - 2 * t), fuera = (t) => 1 - Math.pow(1 - t, 3);
  function fondo(sacude = 0) {
    x.save(); x.translate((Math.random() - 0.5) * sacude, (Math.random() - 0.5) * sacude);
    const g = x.createLinearGradient(0, 0, 0, 120); g.addColorStop(0, '#060d28'); g.addColorStop(1, '#18245c'); x.fillStyle = g; x.fillRect(-4, -4, W + 8, 130);
    x.fillStyle = '#0d1640'; x.beginPath(); x.moveTo(0, 60); x.quadraticCurveTo(180, 26, 360, 60); x.lineTo(360, 124); x.lineTo(0, 124); x.fill();              // tribuna
    for (const [lx, ly, f] of luces) { x.globalAlpha = 0.35 + 0.65 * Math.abs(Math.sin(performance.now() / 500 + f * 9)); x.fillStyle = f > 0.5 ? '#ffe9a8' : '#bfd0ff'; x.fillRect(lx, 30 + ly, 1.6, 1.6); } x.globalAlpha = 1;
    for (const fx of [36, 324]) { const r = x.createRadialGradient(fx, 14, 2, fx, 14, 90); r.addColorStop(0, 'rgba(255,244,210,.55)'); r.addColorStop(1, 'rgba(255,244,210,0)'); x.fillStyle = r; x.fillRect(fx - 90, -40, 180, 180); }
    for (let i = 0; i < 7; i++) { x.fillStyle = i % 2 ? '#1f8a4c' : '#23974f'; x.fillRect(-4, 120 + i * 27, W + 8, 27); }                                         // pasto
    x.strokeStyle = 'rgba(255,255,255,.75)'; x.lineWidth = 2; x.beginPath(); x.moveTo(-4, 178); x.lineTo(W + 4, 178); x.moveTo(28, 178); x.lineTo(8, 300); x.moveTo(332, 178); x.lineTo(352, 300); x.stroke();
    x.fillStyle = '#fff'; x.beginPath(); x.ellipse(PUNTO.x, PUNTO.y + 8, 5, 2, 0, 0, 6.283); x.fill();
  }
  function arco(bulto = null) {
    x.strokeStyle = 'rgba(255,255,255,.28)'; x.lineWidth = 0.8;
    for (let gx = ARCO.x1; gx <= ARCO.x2; gx += 11.8) { x.beginPath(); x.moveTo(gx, ARCO.y1); let fx = gx; if (bulto) fx += (bulto.x - gx) * bulto.f * Math.exp(-Math.abs(gx - bulto.x) / 40) * 0.2; x.quadraticCurveTo(fx, (ARCO.y1 + ARCO.y2) / 2, gx, ARCO.y2); x.stroke(); }
    for (let gy = ARCO.y1; gy <= ARCO.y2; gy += 11.4) { x.beginPath(); x.moveTo(ARCO.x1, gy); x.lineTo(ARCO.x2, gy); x.stroke(); }
    x.strokeStyle = '#fff'; x.lineWidth = 5; x.lineJoin = 'round'; x.beginPath(); x.moveTo(ARCO.x1, ARCO.y2 + 2); x.lineTo(ARCO.x1, ARCO.y1); x.lineTo(ARCO.x2, ARCO.y1); x.lineTo(ARCO.x2, ARCO.y2 + 2); x.stroke();
  }
  function arquero(dx, giro, alto) {
    x.save(); x.translate(180 + dx, 172 - alto); x.rotate(giro);
    x.fillStyle = 'rgba(0,0,0,.25)'; x.beginPath(); x.ellipse(0, 6 + alto, 22, 5, 0, 0, 6.283); x.fill();
    x.fillStyle = '#f0b740'; x.beginPath(); x.roundRect(-15, -52, 30, 40, 11); x.fill();                                    // cuerpo
    x.fillStyle = '#1b2a6b'; x.beginPath(); x.roundRect(-14, -16, 12, 20, 5); x.roundRect(2, -16, 12, 20, 5); x.fill();     // piernas
    x.strokeStyle = '#f0b740'; x.lineWidth = 9; x.lineCap = 'round'; x.beginPath(); x.moveTo(-13, -44); x.lineTo(-31, -62); x.moveTo(13, -44); x.lineTo(31, -62); x.stroke();
    x.fillStyle = '#fff'; x.beginPath(); x.arc(-33, -65, 6.5, 0, 6.283); x.arc(33, -65, 6.5, 0, 6.283); x.fill();           // guantes
    x.fillStyle = '#f3c9a0'; x.beginPath(); x.arc(0, -63, 11, 0, 6.283); x.fill();
    x.fillStyle = '#16151d'; x.beginPath(); x.arc(-4, -64, 1.6, 0, 6.283); x.arc(4, -64, 1.6, 0, 6.283); x.fill();
    x.restore();
  }
  function balon(bx, by, r, giro) {
    x.fillStyle = 'rgba(0,0,0,.28)'; x.beginPath(); x.ellipse(bx, Math.max(by + r, 182) + 2, r * 1.1, r * 0.35, 0, 0, 6.283); x.fill();
    x.save(); x.translate(bx, by); x.rotate(giro); x.fillStyle = '#fff'; x.beginPath(); x.arc(0, 0, r, 0, 6.283); x.fill(); x.fillStyle = '#16151d';
    for (let i = 0; i < 5; i++) { const a = i * 1.2566; x.beginPath(); x.arc(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55, r * 0.2, 0, 6.283); x.fill(); } x.beginPath(); x.arc(0, 0, r * 0.22, 0, 6.283); x.fill(); x.restore();
  }
  function mira() { const [zx, zy] = ZONAS[zona]; x.strokeStyle = '#f0b740'; x.lineWidth = 2; x.setLineDash([5, 5]); x.beginPath(); x.arc(zx, zy, 17 + Math.sin(performance.now() / 260) * 2, 0, 6.283); x.stroke(); x.setLineDash([]); x.beginPath(); x.moveTo(zx - 6, zy); x.lineTo(zx + 6, zy); x.moveTo(zx, zy - 6); x.lineTo(zx, zy + 6); x.stroke(); }

  // Trayectoria según el premio. El premio ya lo decidió el servidor: aquí solo se muestra.
  function tiro(t) {
    const [zx, zy] = ZONAS[zona], lado = zx < 170 ? -1 : zx > 190 ? 1 : (Math.random() < 0.5 ? -1 : 1);
    let destino = [zx, zy], curva = 0, poste = null;
    if (premio === 85) { poste = [lado < 0 ? ARCO.x1 + 3 : ARCO.x2 - 3, 120]; destino = [180 + lado * 70, 130]; }
    if (premio === 90) { destino = [lado < 0 ? ARCO.x1 + 13 : ARCO.x2 - 13, ARCO.y1 + 13]; curva = -lado * 70; }
    if (premio === 100) destino = [180 + lado * 40, 96];
    return { destino, curva, poste, lado };
  }
  let T = null;
  function cuadro(ahora) {
    requestAnimationFrame(cuadro);
    const t = etapa === 'tiro' ? (ahora - t0) / 1000 : 0;
    let sacude = 0, bulto = null, bx = PUNTO.x, by = PUNTO.y, r = 11, giro = 0, kx = Math.sin(ahora / 420) * 14, kg = 0, ka = 0;
    if (etapa === 'tiro' && T) {
      const vuelo = premio === 85 ? 0.95 : 0.62, ini = 0.55, u = Math.min(1, Math.max(0, (t - ini) / vuelo));
      if (t > ini) {
        let p = fuera(u), ox = PUNTO.x, oy = PUNTO.y, [dx, dy] = T.destino;
        if (T.poste) { const corte = 0.6; if (u < corte) { p = fuera(u / corte); dx = T.poste[0]; dy = T.poste[1]; } else { ox = T.poste[0]; oy = T.poste[1]; p = suave((u - corte) / (1 - corte)); } }
        bx = mezcla(ox, dx, p) + Math.sin(p * Math.PI) * T.curva; by = mezcla(oy, dy, p) - Math.sin(p * Math.PI) * (T.poste && u >= 0.6 ? 6 : 26);
        r = T.poste && u >= 0.6 ? 6.5 : mezcla(11, 6.5, p); giro = t * 14;
        const k = fuera(Math.min(1, (t - ini) / 0.5)), haciaDonde = premio === 90 ? T.lado : -T.lado; // con 90 el arquero adivina el lado y aun así no llega
        kx = haciaDonde * 74 * k * (premio === 90 ? 0.72 : 1); kg = haciaDonde * 1.05 * k; ka = Math.sin(k * Math.PI) * 26;
        if (u >= 1) { bulto = { x: T.destino[0], f: Math.max(0, 1 - (t - ini - vuelo) * 2.2) * (premio === 100 ? 4 : 1.6) }; if (premio === 100 && t - ini - vuelo < 0.5) sacude = 7 * (1 - (t - ini - vuelo) * 2); }
      }
    } else if (etapa === 'fin' && T) { bx = T.destino[0]; by = Math.min(170, T.destino[1] + 60); r = 6.5; kx = (premio === 90 ? T.lado : -T.lado) * 74 * (premio === 90 ? 0.72 : 1); kg = (premio === 90 ? T.lado : -T.lado) * 1.35; ka = 0; }
    x.clearRect(0, 0, W, H); fondo(sacude); arco(bulto);
    if (etapa === 'inicio') mira();
    const detras = etapa !== 'inicio' && by < 172;
    if (detras) balon(bx, by, r, giro);
    arquero(kx, kg, ka);
    if (!detras) balon(bx, by, r, giro);
    if (premio === 100 && etapa !== 'inicio' && sacude > 0) { x.fillStyle = 'rgba(255,255,255,' + sacude / 14 + ')'; x.fillRect(0, 0, W, H); }
    for (let i = confeti.length - 1; i >= 0; i--) { const c = confeti[i]; c.vy += 0.12; c.x += c.vx; c.y += c.vy; c.g += c.vg; x.save(); x.translate(c.x, c.y); x.rotate(c.g); x.fillStyle = c.c; x.fillRect(-3, -2, 6, 4); x.restore(); if (c.y > H + 10) confeti.splice(i, 1); }
    x.restore();
  }
  requestAnimationFrame(cuadro);
  cv.addEventListener('pointerdown', (e) => {
    if (etapa !== 'inicio') return; const r = cv.getBoundingClientRect(), px = (e.clientX - r.left) / r.width * W, py = (e.clientY - r.top) / r.height * H;
    let mejor = 0, dm = 1e9; ZONAS.forEach(([zx, zy], i) => { const d = Math.hypot(zx - px, zy - py); if (d < dm) { dm = d; mejor = i; } }); zona = mejor; $('apunta').textContent = 'Apuntas ' + ['arriba a la izquierda', 'arriba al centro', 'arriba a la derecha', 'abajo a la izquierda', 'abajo al centro', 'abajo a la derecha'][zona]; tono(880, 0.06, 'square', 0.04);
  });

  // ---------------------------------------------------------------- flujo
  const FRASES = { 50: ['¡GOL!', '¡Gol! El arquero se tiró al otro lado.'], 85: ['¡PALO Y ADENTRO!', '¡Pegó en el palo y entró! Premio de los que casi no hay.'], 90: ['¡AL ÁNGULO!', '¡Súper difícil: la clavaste en el ángulo!'], 100: ['¡GOLAZO!', '¡Rompiste la red! El único 100 % es tuyo.'] };
  const rotulo = (txt) => { const r = $('rotulo'); r.textContent = txt; r.classList.toggle('ver', !!txt); };
  function mostrar(d, conTiro) {
    premio = FRASES[d.descuento] ? d.descuento : 50;
    $('r-pct').textContent = d.descuento; $('r-frase').textContent = d.repetido ? 'Ya pateaste tu penal: este fue tu resultado.' : (FRASES[d.descuento] || FRASES[50])[1];
    $('r-nombre').textContent = $('nombre').value.trim().split(/\s+/)[0] || ''; $('r-codigo').textContent = d.codigo || ''; $('r-vence').textContent = d.vence_texto ? 'Úsalo hasta el ' + d.vence_texto + '.' : '';
    $('r-canje').href = 'canje?c=' + encodeURIComponent(d.codigo || '');
    const fin = () => { etapa = 'fin'; $('v-inicio').hidden = true; $('v-resultado').hidden = false; $('apunta').hidden = true; if (!lento) $('v-resultado').scrollIntoView({ behavior: 'smooth', block: 'nearest' }); };
    if (!conTiro || lento) { T = tiro(1); rotulo((FRASES[premio] || FRASES[50])[0]); return fin(); }
    T = tiro(0); etapa = 'tiro'; t0 = performance.now(); $('apunta').hidden = true; rotulo(''); silbato();
    setTimeout(patada, 550);
    setTimeout(() => { rotulo(FRASES[premio][0]); hinchada(premio === 50 ? 0.8 : 1.3); if (premio > 50) fanfarria(); if (premio >= 90) for (let i = 0; i < (premio === 100 ? 130 : 60); i++) confeti.push({ x: 180 + (Math.random() - 0.5) * 260, y: -10 - Math.random() * 60, vx: (Math.random() - 0.5) * 2.4, vy: 1 + Math.random() * 2, g: Math.random() * 6, vg: (Math.random() - 0.5) * 0.3, c: ['#f0b740', '#ffffff', '#ff6b5e', '#8fa8ff'][i % 4] }); }, premio === 85 ? 1500 : 1170);
    setTimeout(fin, premio === 85 ? 2700 : 2400);
  }
  async function patear() {
    const b = $('patear'), err = $('error'); err.textContent = ''; ctxAudio();
    const nombre = $('nombre').value.trim(), whatsapp = $('whatsapp').value.replace(/\D/g, '');
    if (nombre.length < 2) { err.textContent = 'Escribe tu nombre.'; $('nombre').focus(); return; }
    if (!/^9\d{8}$/.test(whatsapp.replace(/^51/, ''))) { err.textContent = 'Escribe tu WhatsApp: 9 dígitos y empieza con 9.'; $('whatsapp').focus(); return; }
    b.disabled = true; b.textContent = 'El árbitro pita…';
    try {
      const r = await fetch('api/jugar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre, whatsapp }) }), d = await r.json().catch(() => ({}));
      if (!r.ok) { err.textContent = d.error || 'No pudimos registrar tu penal. Inténtalo de nuevo.'; if (d.motivo === 'nombre') $('nombre').focus(); if (d.motivo === 'whatsapp') $('whatsapp').focus(); }
      else { try { localStorage.setItem('penal.datos', JSON.stringify({ nombre, whatsapp })); } catch { /* sin almacenamiento */ } mostrar(d, !d.repetido); return; }
    } catch { err.textContent = 'Sin conexión. Revisa tu internet e inténtalo de nuevo.'; }
    b.disabled = false; b.textContent = '¡Patear!';
  }
  if (location.hostname === 'localhost') window.__demo = (pct) => { etapa = 'inicio'; $('v-inicio').hidden = false; $('v-resultado').hidden = true; mostrar({ descuento: pct, codigo: 'DEMO-' + pct, vence_texto: 'jueves 19 de noviembre' }, true); }; // solo para probar las animaciones en local
  $('patear').onclick = patear;
  $('nombre').onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); $('whatsapp').focus(); } };
  $('whatsapp').onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); patear(); } };
  try { const g = JSON.parse(localStorage.getItem('penal.datos')); if (g) { $('nombre').value = g.nombre || ''; $('whatsapp').value = g.whatsapp || ''; } } catch { /* nada guardado */ }

  try {
    const e = await (await fetch('api/estado', { cache: 'no-store' })).json();
    $('cerrado').hidden = !!e.abierto; if (!e.abierto) { $('patear').textContent = 'Ver mi resultado'; $('bajada').textContent = 'El sorteo ya cerró. Gracias por participar.'; }
    $('cursos').replaceChildren(...(e.cursos || []).map((c) => { const d = document.createElement('div'); d.className = 'curso'; const b = document.createElement('b'); b.textContent = c.titulo + ' '; const s = document.createElement('span'); s.textContent = c.precio_texto || ''; b.append(s); const f = document.createElement('small'); f.textContent = (c.fechas || []).join(' · '); const j = document.createElement('small'); j.textContent = c.bajada || ''; d.append(b, f, j); return d; }));
  } catch { /* sin estado: el formulario igual funciona */ }
})();
