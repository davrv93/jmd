// Sorteo de cápsulas de JMD Learning. El resultado lo decide y lo guarda el
// servidor (api/jugar); aquí solo se anima la máquina y se muestra el papelito.
(() => {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const calma = matchMedia('(prefers-reduced-motion: reduce)');
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));
  const crear = (tag, clase, texto) => {
    const e = document.createElement(tag);
    if (clase) e.className = clase;
    if (texto != null) e.textContent = texto;
    return e;
  };
  const memoria = {
    leer(k) { try { return localStorage.getItem('gachapon:' + k); } catch { return null; } },
    poner(k, v) { try { localStorage.setItem('gachapon:' + k, v); } catch { /* sin almacenamiento: no pasa nada */ } },
  };

  const COLORES = [
    { nombre: 'dorada', c: '#f4b63a' },
    { nombre: 'coral', c: '#ff6f61' },
    { nombre: 'verde menta', c: '#35d0a0' },
    { nombre: 'lila', c: '#a98bff' },
    { nombre: 'celeste', c: '#58c4ff' },
    { nombre: 'rosada', c: '#ff8dbd' },
  ];

  // ------------------------------------------------------------------ sonido
  const sonido = (() => {
    let ctx = null;
    let activo = memoria.leer('silencio') !== '1';
    const boton = $('#sonido');
    const pintar = () => {
      boton.setAttribute('aria-pressed', String(activo));
      boton.setAttribute('aria-label', activo ? 'Sonido activado. Tocar para silenciar' : 'Sonido en silencio. Tocar para activar');
    };
    const iniciar = () => {
      if (!activo) return null;
      try {
        ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
        if (ctx.state === 'suspended') ctx.resume();
      } catch { ctx = null; }
      return ctx;
    };
    // una nota: oscilador con caída exponencial
    const nota = (frec, { tipo = 'sine', dur = 0.2, vol = 0.12, cuando = 0, hasta = 0 } = {}) => {
      const a = iniciar();
      if (!a) return;
      const t = a.currentTime + cuando;
      const o = a.createOscillator();
      const g = a.createGain();
      o.type = tipo;
      o.frequency.setValueAtTime(frec, t);
      if (hasta) o.frequency.exponentialRampToValueAtTime(hasta, t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(a.destination);
      o.start(t);
      o.stop(t + dur + 0.03);
    };
    const cuerda = (frec, cuando, vol = 0.13) => { // punteo de arpa
      nota(frec, { tipo: 'triangle', dur: 1.1, vol, cuando });
      nota(frec * 2, { tipo: 'sine', dur: 0.5, vol: vol * 0.35, cuando });
    };
    boton.addEventListener('click', () => {
      activo = !activo;
      memoria.poner('silencio', activo ? '0' : '1');
      pintar();
      if (activo) nota(880, { dur: 0.12, vol: 0.08 });
      else if (ctx) ctx.suspend();
    });
    pintar();
    return {
      iniciar,
      tic: () => nota(190 + Math.random() * 40, { tipo: 'square', dur: 0.035, vol: 0.05 }),
      choque: () => nota(900 + Math.random() * 900, { tipo: 'triangle', dur: 0.04, vol: 0.035 }),
      caida: () => { nota(170, { dur: 0.16, vol: 0.2, hasta: 70 }); nota(1250, { tipo: 'triangle', dur: 0.05, vol: 0.05, cuando: 0.01 }); },
      tocar: () => nota(660, { dur: 0.09, vol: 0.09, hasta: 990 }),
      abrir: () => { nota(320, { tipo: 'triangle', dur: 0.09, vol: 0.14, hasta: 900 }); nota(1500, { dur: 0.05, vol: 0.05, cuando: 0.05 }); },
      papel: () => { for (let i = 0; i < 7; i++) nota(2400 + Math.random() * 1600, { tipo: 'triangle', dur: 0.03, vol: 0.012, cuando: i * 0.11 }); },
      premio: (pct) => {
        const escala = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98, 2093];
        const n = pct >= 100 ? 7 : pct >= 90 ? 6 : pct >= 80 ? 5 : 4;
        for (let i = 0; i < n; i++) cuerda(escala[i], i * 0.11);
        if (pct >= 100) [523.25, 783.99, 1046.5, 1567.98].forEach((f) => cuerda(f, n * 0.11 + 0.18, 0.1));
      },
      consuelo: () => { cuerda(659.25, 0, 0.1); cuerda(523.25, 0.2, 0.1); },
      trabada: () => nota(140, { tipo: 'square', dur: 0.07, vol: 0.05 }),
    };
  })();

  // ------------------------------------------------- cápsulas dentro del domo
  // Unidades del dibujo SVG; el origen es el centro del domo.
  const domo = (() => {
    const lienzo = $('#capsulas');
    const ctx = lienzo.getContext('2d');
    const R = 122, r = 21, LADO = 252, G = 1500, TOTAL = 15;
    let caps = [];
    let porSoltar = 0, relojSuelta = 0;
    let agitando = false, sentido = 1, relojPatada = 0;
    let quietos = 0, corriendo = false, ultimo = 0, escala = 1;
    let alSalir = null;

    const nueva = (i) => ({
      x: (Math.random() - 0.5) * 30, y: -R + r + 8, vx: (Math.random() - 0.5) * 160, vy: 120,
      a: Math.random() * 6.28, w: (Math.random() - 0.5) * 6, color: COLORES[i % COLORES.length], e: 1, sale: null,
    });

    function paso(dt) {
      if (porSoltar > 0) {
        relojSuelta -= dt;
        if (relojSuelta <= 0) { caps.push(nueva(TOTAL - porSoltar)); porSoltar--; relojSuelta = 0.1; }
      }
      if (agitando) {
        relojPatada -= dt;
        if (relojPatada <= 0) {
          relojPatada = 0.11;
          for (let k = 0; k < 4; k++) {
            const c = caps[(Math.random() * caps.length) | 0];
            if (!c || c.sale) continue;
            c.vy -= 500 + Math.random() * 520;
            c.vx += (Math.random() - 0.5) * 620;
            c.w += (Math.random() - 0.5) * 14;
          }
          if (Math.random() < 0.6) sonido.choque();
        }
      }
      let rapido = 0;
      for (const c of caps) {
        if (c.sale) {
          c.sale.t += dt / 0.3;
          const t = Math.min(1, c.sale.t), k = t * t;
          c.x = c.sale.x + (0 - c.sale.x) * k;
          c.y = c.sale.y + (R + r - c.sale.y) * k;
          c.e = 1 - 0.3 * k;
          continue;
        }
        c.vy += G * dt;
        if (agitando) {
          const d = Math.hypot(c.x, c.y) || 1;
          c.vx += (-c.y / d) * 2300 * dt * sentido;
          c.vy += (c.x / d) * 2300 * dt * sentido - G * 0.5 * dt;
        }
        c.vx *= 0.996; c.vy *= 0.996;
        c.x += c.vx * dt; c.y += c.vy * dt;
        c.a += c.w * dt; c.w *= 0.985;
      }
      for (let it = 0; it < 4; it++) {
        for (let i = 0; i < caps.length; i++) {
          const a = caps[i];
          if (a.sale) continue;
          for (let j = i + 1; j < caps.length; j++) {
            const b = caps[j];
            if (b.sale) continue;
            const dx = b.x - a.x, dy = b.y - a.y;
            const d2 = dx * dx + dy * dy;
            if (d2 >= 4 * r * r) continue;
            const d = Math.sqrt(d2) || 0.01;
            const nx = dx / d, ny = dy / d, mete = (2 * r - d) / 2;
            a.x -= nx * mete; a.y -= ny * mete; b.x += nx * mete; b.y += ny * mete;
            const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
            if (vn < 0) {
              const j2 = -(1 + 0.3) * vn / 2;
              a.vx -= j2 * nx; a.vy -= j2 * ny; b.vx += j2 * nx; b.vy += j2 * ny;
              const vt = (b.vx - a.vx) * -ny + (b.vy - a.vy) * nx;
              a.w += vt * 0.004; b.w += vt * 0.004;
            }
          }
          const d = Math.hypot(a.x, a.y);
          if (d > R - r) {
            const nx = a.x / d, ny = a.y / d;
            a.x = nx * (R - r); a.y = ny * (R - r);
            const vn = a.vx * nx + a.vy * ny;
            if (vn > 0) { a.vx -= 1.35 * vn * nx; a.vy -= 1.35 * vn * ny; }
            const vt = a.vx * -ny + a.vy * nx;
            a.vx -= vt * 0.02 * -ny; a.vy -= vt * 0.02 * nx;
            a.w += (vt / r - a.w) * 0.25; // rueda contra el vidrio
          }
        }
      }
      for (const c of caps) if (!c.sale) rapido = Math.max(rapido, Math.hypot(c.vx, c.vy));
      const fuera = caps.filter((c) => c.sale && c.sale.t >= 1);
      if (fuera.length) {
        caps = caps.filter((c) => !(c.sale && c.sale.t >= 1));
        if (alSalir) fuera.forEach((c) => alSalir(c));
      }
      return rapido;
    }

    function pintar() {
      ctx.setTransform(escala, 0, 0, escala, 0, 0);
      ctx.clearRect(0, 0, LADO, LADO);
      ctx.save();
      ctx.translate(LADO / 2, LADO / 2);
      ctx.beginPath(); ctx.arc(0, 0, R + 1.5, 0, 7); ctx.clip();
      for (const c of caps) {
        ctx.save();
        ctx.translate(c.x, c.y); ctx.scale(c.e, c.e);
        ctx.save();
        ctx.rotate(c.a);
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI); ctx.closePath(); ctx.fillStyle = '#f6f3ff'; ctx.fill();
        ctx.beginPath(); ctx.arc(0, 0, r, Math.PI, 0); ctx.closePath(); ctx.fillStyle = c.color.c; ctx.fill();
        ctx.fillStyle = '#cfcbe8'; ctx.fillRect(-r, -1, 2 * r, 2);
        ctx.restore();
        const g = ctx.createRadialGradient(-r * 0.4, -r * 0.5, r * 0.05, 0, 0, r);
        g.addColorStop(0, 'rgba(255,255,255,.5)'); g.addColorStop(0.4, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(8,10,36,.36)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.85)';
        ctx.beginPath(); ctx.ellipse(-r * 0.42, -r * 0.5, r * 0.17, r * 0.1, -0.7, 0, 7); ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }

    function medir() {
      const ancho = lienzo.getBoundingClientRect().width || LADO;
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      lienzo.width = lienzo.height = Math.round(ancho * dpr);
      escala = lienzo.width / LADO;
      pintar();
    }

    function cuadro(t) {
      const dt = Math.min(0.033, (t - ultimo) / 1000 || 0.016);
      ultimo = t;
      let rapido = 0;
      for (let k = 0; k < 2; k++) rapido = paso(dt / 2);
      pintar();
      const ocupado = agitando || porSoltar > 0 || caps.some((c) => c.sale);
      quietos = !ocupado && rapido < 14 ? quietos + 1 : 0;
      if (quietos > 45) { corriendo = false; return; } // todo quieto: no se gasta batería
      requestAnimationFrame(cuadro);
    }
    function despertar() {
      quietos = 0;
      if (corriendo) return;
      corriendo = true; ultimo = performance.now();
      requestAnimationFrame(cuadro);
    }
    // deja las cápsulas ya asentadas, sin animar
    function asentar(segundos) {
      for (let i = 0; i < segundos * 120; i++) paso(1 / 120);
      for (const c of caps) { c.vx = c.vy = c.w = 0; }
      pintar();
    }

    return {
      llenar() {
        caps = []; porSoltar = TOTAL; relojSuelta = 0;
        medir();
        if (calma.matches) asentar(5); else despertar();
        new ResizeObserver(medir).observe(lienzo);
      },
      agitar(si) { agitando = si; sentido = 1; relojPatada = 0; if (si) despertar(); },
      invertir() { sentido = -sentido; },
      // saca las tres cápsulas de más abajo, de colores distintos; avisa cuando cada una sale
      soltar(cuantas, aviso) {
        const orden = caps.filter((c) => !c.sale).sort((a, b) => b.y - a.y);
        const elegidas = [];
        for (const c of orden) {
          if (elegidas.length === cuantas) break;
          if (!elegidas.some((e) => e.color === c.color)) elegidas.push(c);
        }
        alSalir = (c) => aviso(c.color);
        if (calma.matches) {
          caps = caps.filter((c) => !elegidas.includes(c));
          asentar(2);
          elegidas.forEach((c) => aviso(c.color));
          return;
        }
        elegidas.forEach((c, i) => setTimeout(() => { c.sale = { t: 0, x: c.x, y: c.y }; despertar(); }, i * 420));
      },
    };
  })();

  // ------------------------------------------------------------------ estado
  const juego = $('#juego');
  const form = $('#form');
  const campoNombre = $('#nombre');
  const campoTel = $('#whatsapp');
  const botonGirar = $('#girar');
  const manivela = $('#manivela');
  const boca = $('#boca');
  const aviso = $('#aviso');
  let config = { abierto: true, descuentos: [20, 30, 40, 50], cursos: [], whatsapp: '51986149476' };
  let ocupado = false;
  let yo = null; // { nombre, ...resultado del servidor }

  function etapa(nombre) {
    juego.dataset.etapa = nombre;
    $('#v-inicio').hidden = nombre !== 'inicio';
    $('#v-girando').hidden = nombre !== 'girando';
    $('#v-elegir').hidden = nombre !== 'elegir';
    const fin = nombre === 'resultado';
    $('#titular').hidden = fin; $('#escena').hidden = fin; $('#panel').hidden = fin;
    $('#v-resultado').hidden = !fin;
  }

  const soloNumero = (v) => {
    let d = v.replace(/\D/g, '');
    if (d.length === 11 && d.startsWith('51')) d = d.slice(2);
    return d;
  };
  const bonito = (n) => n.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3');
  const lista = (ns) => ns.length < 2 ? ns.join('') : ns.slice(0, -1).join(', ') + ' y ' + ns[ns.length - 1];

  function error(id, texto, campo) {
    $(id).textContent = texto || '';
    if (campo) campo.setAttribute('aria-invalid', texto ? 'true' : 'false');
  }
  function validar() {
    const nombre = campoNombre.value.trim().replace(/\s+/g, ' ');
    const numero = soloNumero(campoTel.value);
    const malNombre = nombre.length < 2 || nombre.length > 40 || !/^[\p{L}\p{M} .'-]+$/u.test(nombre);
    const malNumero = !/^9\d{8}$/.test(numero) || !/^[0-9 +().-]+$/.test(campoTel.value.trim());
    error('#e-nombre', malNombre ? 'Escribe tu nombre, solo con letras.' : '', campoNombre);
    error('#e-whatsapp', malNumero ? 'Escribe tu WhatsApp: 9 dígitos y empieza con 9.' : '', campoTel);
    error('#e-general', '');
    if (malNombre) campoNombre.focus(); else if (malNumero) campoTel.focus();
    return malNombre || malNumero ? null : { nombre, whatsapp: numero };
  }

  async function participar(e) {
    e.preventDefault();
    if (ocupado) return;
    const datos = validar();
    if (!datos) {
      sonido.trabada();
      if (!calma.matches) manivela.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(-14deg)' }, { transform: 'rotate(9deg)' }, { transform: 'rotate(0)' }], { duration: 320 });
      return;
    }
    ocupado = true;
    botonGirar.disabled = true; manivela.disabled = true;
    sonido.iniciar();
    let res, cuerpo = {};
    try {
      res = await fetch('api/jugar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos) });
      cuerpo = await res.json().catch(() => ({}));
    } catch { res = null; }
    if (!res || !res.ok) {
      ocupado = false;
      botonGirar.disabled = false; manivela.disabled = false;
      const msg = !res ? 'No hay conexión con el servidor. Revisa tu internet y vuelve a intentarlo.' : (cuerpo.error || 'No pudimos registrar tu participación. Vuelve a intentarlo en un momento.');
      if (cuerpo.motivo === 'nombre') { error('#e-nombre', msg, campoNombre); campoNombre.focus(); }
      else if (cuerpo.motivo === 'whatsapp') { error('#e-whatsapp', msg, campoTel); campoTel.focus(); }
      else error('#e-general', msg);
      return;
    }
    memoria.poner('yo', JSON.stringify(datos));
    yo = { nombre: datos.nombre, ...cuerpo };
    if (cuerpo.repetido) { revelar(COLORES[0], true); return; }
    etapa('girando');
    $('#escena').scrollIntoView({ block: 'start', behavior: calma.matches ? 'auto' : 'smooth' });
    aviso.textContent = 'Agitando las cápsulas.';
    await girar();
    await soltar();
    etapa('elegir');
    aviso.textContent = 'Cayeron tres cápsulas. Elige una.';
    const primera = boca.querySelector('.capsula');
    if (primera) primera.focus({ preventScroll: true });
  }

  async function girar() {
    if (calma.matches) { await espera(250); return; }
    const dur = 2300;
    manivela.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(1080deg)' }], { duration: dur, easing: 'cubic-bezier(.35,0,.25,1)' });
    domo.agitar(true);
    const tics = setInterval(() => sonido.tic(), 105);
    setTimeout(() => domo.invertir(), dur * 0.5);
    await espera(dur);
    clearInterval(tics);
    domo.agitar(false);
    await espera(650);
  }

  function soltar() {
    return new Promise((listo) => {
      let n = 0;
      domo.soltar(3, (color) => {
        const b = crear('button', 'capsula' + (calma.matches ? '' : ' cae'));
        b.type = 'button';
        b.style.setProperty('--c', color.c);
        b.style.setProperty('--giro', (-28 + Math.random() * 56).toFixed(0) + 'deg');
        b.setAttribute('aria-label', 'Abrir la cápsula ' + color.nombre);
        b.addEventListener('click', () => elegir(b, color));
        boca.append(b);
        if (!calma.matches) setTimeout(() => sonido.caida(), 330);
        if (++n === 3) setTimeout(listo, calma.matches ? 0 : 700);
      });
    });
  }

  let elegido = false;
  async function elegir(boton, color) {
    if (elegido) return;
    elegido = true;
    sonido.tocar();
    for (const b of boca.querySelectorAll('.capsula')) {
      b.disabled = true;
      b.classList.remove('cae');
      b.classList.add(b === boton ? 'elegida' : 'apagada');
    }
    await espera(calma.matches ? 0 : 520);
    revelar(color, false);
  }

  // --------------------------------------------------------------- resultado
  const CERTIFICADO = 15; // el curso gratis cobra solo el certificado, en soles
  let elegidoSlug = '';

  const soles = (n) => 'S/ ' + (Number.isInteger(n) ? String(n) : n.toFixed(2));
  const cursoElegido = () => config.cursos.find((c) => c.slug === elegidoSlug) || null;

  // precio de un curso para quien mira: con su cupón si ganó, normal si no
  function precio(c) {
    const d = yo && yo.gano ? yo.descuento : 0;
    if (c.soles == null) return { tipo: 'consulta', d };
    const base = c.soles === 0 ? CERTIFICADO : c.soles;
    return { tipo: c.soles === 0 ? 'certificado' : 'pago', d, base, final: Math.round(base * (100 - d)) / 100 };
  }

  // lo que va entre paréntesis en el mensaje de WhatsApp
  function precioEnMensaje(c) {
    const p = precio(c);
    if (!yo.gano) return c.precio_texto;
    if (p.tipo === 'consulta') return `precio por confirmar; aplica mi cupón de ${p.d} %`;
    const fin = p.final === 0 ? 'gratis' : soles(p.final);
    if (p.tipo === 'certificado') return `curso gratis; certificado ${p.final === 0 ? 'gratis' : 'a ' + fin} con el cupón, normal ${soles(p.base)}`;
    return `${fin} con el cupón; precio normal ${soles(p.base)}`;
  }

  // resumen corto del precio para la barra y el papelito
  function precioCorto(c) {
    const p = precio(c);
    if (!yo.gano) return c.precio_texto;
    if (p.tipo === 'consulta') return `precio por WhatsApp, con tu ${p.d} %`;
    if (p.tipo === 'certificado') return p.final === 0 ? 'curso y certificado gratis' : `curso gratis, certificado a ${soles(p.final)}`;
    return p.final === 0 ? 'gratis con tu cupón' : `${soles(p.final)} con tu cupón`;
  }

  function mensaje() {
    const c = cursoElegido();
    const curso = c ? `${c.titulo} (${precioEnMensaje(c)})` : '';
    if (yo.gano) {
      return `Hola, David. Soy ${yo.nombre} y participé en el sorteo de cápsulas de JMD Learning.\n\n` +
        `Mi cupón: ${yo.codigo}\nDescuento: ${yo.descuento} %\nVale hasta: ${yo.vence_texto}\nCurso que quiero: ${curso}`;
    }
    return `Hola, David. Soy ${yo.nombre} y participé en el sorteo de cápsulas de JMD Learning. Esta vez no gané, pero quiero información del curso.\n\nMe interesa: ${c ? c.titulo + '\nPrecio que vi: ' + c.precio_texto : ''}`;
  }

  // pone al día todo lo que depende del curso elegido: tarjetas, papelito, barra y enlace
  function alDia() {
    const c = cursoElegido();
    for (const li of document.querySelectorAll('#cursos .curso')) {
      const si = li.dataset.slug === elegidoSlug;
      li.classList.toggle('elegido', si);
      const b = li.querySelector('.boton-elegir');
      b.setAttribute('aria-pressed', String(si));
      b.lastChild.textContent = si ? 'Elegido' : 'Quiero este';
    }
    const linea = $('#r-elegido');
    if (linea) {
      linea.replaceChildren();
      if (c) linea.append(yo.gano ? 'Curso elegido' : 'Te interesa', crear('strong', '', c.titulo), precioCorto(c));
      else linea.append(config.cursos.length ? (yo.gano ? 'Elige tu curso en la lista: cada uno muestra su precio con tu cupón.' : 'Mira la lista de cursos con sus precios y elige el que te interese.') : 'Cuéntanos por WhatsApp qué curso te interesa.');
    }
    const texto = $('#barra-texto');
    texto.replaceChildren();
    if (yo.gano) texto.append(crear('b', '', yo.codigo), c ? ` · ${c.titulo}: ${precioCorto(c)}` : ' · aún sin curso elegido');
    else texto.append(c ? `${c.titulo}: ${c.precio_texto}` : 'Elige un curso de la lista o escríbenos igual.');
    const wa = $('#barra-wa');
    wa.textContent = yo.gano ? 'Reclamar por WhatsApp' : 'Pedir información por WhatsApp';
    wa.href = `https://wa.me/${config.whatsapp}?text=${encodeURIComponent(mensaje())}`;
  }

  function elegirCurso(slug, anunciar) {
    elegidoSlug = elegidoSlug === slug ? '' : slug;
    alDia();
    const c = cursoElegido();
    if (anunciar) aviso.textContent = c ? `Elegiste ${c.titulo}: ${precioCorto(c)}. Ya va en tu mensaje de WhatsApp.` : 'Quitaste el curso elegido.';
    if (c) sonido.tocar();
  }

  function bloquePrecio(c) {
    const p = precio(c);
    const caja = crear('div', 'precio');
    const oculto = (t) => crear('span', 'solo-lector', t);
    if (!yo.gano) {
      caja.append(crear('p', 'precio-texto sola', c.precio_texto));
      return caja;
    }
    if (p.tipo === 'consulta') {
      caja.append(crear('p', 'precio-texto sola', `Precio por WhatsApp · tu cupón de ${p.d} % aplica`));
      return caja;
    }
    if (p.tipo === 'certificado') caja.append(crear('p', 'precio-texto', `Curso gratis · tu cupón vale para el certificado (${soles(CERTIFICADO)})`));
    else if (c.antes != null) caja.append(crear('span', 'precio-antes', `antes ${soles(c.antes)}`));
    const normal = crear('s', 'precio-normal', soles(p.base));
    const final = crear('strong', 'precio-final', p.final === 0 ? 'Gratis' : soles(p.final));
    const nota = p.tipo !== 'certificado' ? 'con tu cupón' : p.final === 0 ? 'también el certificado, con tu cupón' : 'el certificado con tu cupón';
    caja.append(oculto(p.tipo === 'certificado' ? 'Certificado, precio normal: ' : 'Precio normal: '), normal, oculto('. Con tu cupón: '), final, crear('span', 'precio-nota', nota));
    return caja;
  }

  const ICONO_FECHA = 'M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z';
  function icono(d, lado) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('width', lado); svg.setAttribute('height', lado);
    svg.setAttribute('fill', 'none'); svg.setAttribute('stroke', 'currentColor'); svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round'); svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    svg.append(path);
    return svg;
  }

  function tarjeta(c) {
    const li = crear('li', 'curso');
    li.dataset.slug = c.slug;
    const titulo = crear('h3', 'curso-titulo', c.titulo);
    li.append(crear('p', 'curso-cat', c.categoria), titulo, crear('p', 'curso-bajada', c.bajada));
    const aprende = crear('ul', 'curso-aprende');
    aprende.setAttribute('aria-label', 'Aprenderás a');
    for (const a of (c.aprenderas || []).slice(0, 3)) aprende.append(crear('li', '', a));
    li.append(aprende);
    const fechas = c.fechas || [];
    if (fechas.length) {
      const f = crear('p', 'curso-fecha');
      const texto = crear('span');
      const mas = fechas.length - 1;
      texto.append(crear('span', 'solo-lector', 'Fechas: '), crear('b', '', fechas[0]), mas > 0 ? ` y ${mas} ${mas === 1 ? 'grupo' : 'grupos'} más` : '');
      if (c.formato) texto.append(crear('span', 'curso-formato', c.formato));
      f.append(icono(ICONO_FECHA, 18), texto);
      li.append(f);
    }
    const zona = crear('div', 'curso-precio');
    zona.append(bloquePrecio(c));
    const botones = crear('div', 'curso-botones');
    const ver = crear('button', 'boton-linea', 'Ver brochure');
    ver.type = 'button';
    ver.setAttribute('aria-label', `Ver brochure de ${c.titulo}`);
    ver.addEventListener('click', () => visor.abrir(c));
    const quiero = crear('button', 'boton-elegir');
    quiero.type = 'button';
    quiero.setAttribute('aria-pressed', 'false');
    quiero.setAttribute('aria-describedby', 'c-' + c.slug);
    titulo.id = 'c-' + c.slug;
    quiero.append(icono('M5 12.5l4.5 4.5L19 7.5', 18), 'Quiero este');
    quiero.addEventListener('click', () => elegirCurso(c.slug, true));
    botones.append(ver, quiero);
    zona.append(botones);
    li.append(zona);
    return li;
  }

  function armarCursos() {
    const zona = $('#r-cursos');
    const ul = $('#cursos');
    ul.replaceChildren();
    zona.hidden = !config.cursos.length;
    if (!config.cursos.length) return;
    $('#t-cursos').textContent = 'Seguridad en codificación con IA';
    $('#b-cursos').textContent = yo.gano
      ? (yo.descuento >= 100 ? 'Tu cupón de 100 % cubre todo el curso.' : `Con tu cupón de ${yo.descuento} %, este es tu precio.`)
      : 'Este es el curso y su precio. Escríbenos y te contamos cómo inscribirte.';
    for (const c of config.cursos) ul.append(tarjeta(c));
    if (config.cursos.length === 1) elegirCurso(config.cursos[0].slug, false);
  }

  // visor del brochure: un <dialog> con estilo propio (atrapa el foco y cierra con Escape)
  const visor = (() => {
    const caja = $('#visor');
    const img = $('#visor-img');
    const carga = $('#visor-carga');
    const elegir = $('#visor-elegir');
    const ampliar = $('#visor-ampliar');
    let curso = null;
    const zoom = (si) => {
      img.classList.toggle('grande', si);
      ampliar.setAttribute('aria-pressed', String(si));
      ampliar.textContent = si ? 'Reducir' : 'Ampliar';
    };
    ampliar.addEventListener('click', () => zoom(!img.classList.contains('grande')));
    img.addEventListener('click', () => zoom(!img.classList.contains('grande')));
    const cerrar = () => { if (caja.open) caja.close(); };
    $('#visor-cerrar').addEventListener('click', cerrar);
    caja.addEventListener('click', (e) => { if (e.target === caja) cerrar(); }); // toque fuera de la hoja
    caja.addEventListener('close', () => {
      document.documentElement.classList.remove('con-visor');
      img.removeAttribute('src');
    });
    img.addEventListener('load', () => { carga.hidden = true; img.hidden = false; });
    img.addEventListener('error', () => { carga.textContent = 'No se pudo cargar el brochure. Revisa tu conexión y vuelve a abrirlo.'; });
    elegir.addEventListener('click', () => {
      if (curso && elegidoSlug !== curso.slug) elegirCurso(curso.slug, true);
      cerrar();
    });
    return {
      abrir(c) {
        curso = c;
        $('#visor-titulo').textContent = c.titulo;
        carga.textContent = 'Cargando el brochure…';
        carga.hidden = false; img.hidden = true;
        img.alt = `Brochure de ${c.titulo}: ${c.bajada}`;
        img.src = `brochures/${encodeURIComponent(c.brochure)}.webp`;
        elegir.textContent = elegidoSlug === c.slug ? 'Ya lo elegiste. Cerrar' : 'Quiero este';
        zoom(false);
        document.documentElement.classList.add('con-visor');
        caja.showModal();
        $('#visor-cuerpo').scrollTop = 0;
      },
    };
  })();

  function armarPapelito(repetido) {
    const hoja = $('#hoja');
    hoja.replaceChildren();
    const primerNombre = yo.nombre.split(' ')[0];
    if (repetido) hoja.append(crear('p', 'r-ya', 'Ya participaste con este número. Este es tu resultado.'));
    const titulo = crear('h2', 'r-titulo', yo.gano ? `¡Ganaste, ${primerNombre}!` : `Esta vez no salió premio, ${primerNombre}`);
    titulo.id = 'r-titulo'; titulo.tabIndex = -1;
    hoja.append(titulo);

    if (yo.gano) {
      const pct = crear('p', 'r-pct', String(yo.descuento));
      pct.append(crear('small', '', '%'));
      pct.setAttribute('aria-label', `${yo.descuento} por ciento`);
      hoja.append(pct, crear('p', 'r-que', 'de descuento en el curso que elijas'));
      const cupon = crear('div', 'cupon');
      const copiar = crear('button', 'copiar', 'Copiar código');
      copiar.type = 'button';
      copiar.addEventListener('click', async () => {
        let ok = false;
        try { await navigator.clipboard.writeText(yo.codigo); ok = true; } catch { /* sin permiso: el código se puede seleccionar a mano */ }
        copiar.textContent = ok ? 'Código copiado' : 'Mantén presionado el código para copiarlo';
        aviso.textContent = copiar.textContent;
        setTimeout(() => { copiar.textContent = 'Copiar código'; }, 2600);
      });
      cupon.append(crear('span', 'cupon-rotulo', 'Tu cupón'), crear('strong', 'cupon-codigo', yo.codigo), copiar);
      const vence = crear('p', 'r-vence', 'Vale hasta el ');
      vence.append(crear('strong', '', yo.vence_texto + '.'));
      hoja.append(cupon, vence);
    } else {
      hoja.append(crear('p', 'r-texto', 'Gracias por participar. Si quieres saber cómo inscribirte en algún curso, escríbenos y te contamos.'));
    }

    const linea = crear('p', 'r-elegido');
    linea.id = 'r-elegido';
    hoja.append(linea);
    hoja.append(crear('p', 'r-nota', yo.gano
      ? `Escríbenos desde el ${bonito(yo.whatsapp)}, el número con el que participaste. Guarda tu código: con una captura de pantalla basta.`
      : 'Cada número participa una sola vez en este sorteo. Igual puedes escribirnos cuando quieras.'));
    return titulo;
  }

  function chispas() {
    const zona = $('#v-resultado .r-cupon');
    for (let i = 0; i < 12; i++) {
      const s = crear('span', 'chispa');
      zona.append(s);
      const ang = (i / 12) * 6.283 + Math.random() * 0.4, lejos = 70 + Math.random() * 70;
      s.animate([
        { transform: 'translate(0,0) scale(.2) rotate(0)', opacity: 1 },
        { transform: `translate(${Math.cos(ang) * lejos}px,${Math.sin(ang) * lejos - 20}px) scale(${0.6 + Math.random() * 0.8}) rotate(90deg)`, opacity: 0 },
      ], { duration: 900 + Math.random() * 500, easing: 'cubic-bezier(.1,.7,.3,1)' }).onfinish = () => s.remove();
    }
  }

  async function revelar(color, repetido) {
    const abierta = $('#abierta');
    const papelito = $('#papelito');
    const cursos = $('#r-cursos');
    abierta.style.setProperty('--c', color.c);
    elegidoSlug = '';
    const titulo = armarPapelito(repetido);
    armarCursos();
    alDia();
    etapa('resultado');
    window.scrollTo({ top: 0, behavior: 'auto' });
    aviso.textContent = '';
    if (calma.matches) {
      abierta.classList.add('lista');
      $('#barra').hidden = false;
      titulo.focus({ preventScroll: true });
      return;
    }
    // primero el papelito, solo; la lista y la barra entran cuando ya se leyó el resultado
    const habiaCursos = !cursos.hidden;
    cursos.hidden = true;
    const alto = papelito.scrollHeight;
    papelito.style.height = '0px';
    abierta.classList.add('vibra');
    await espera(repetido ? 450 : 720);
    abierta.classList.add('lista');
    sonido.abrir();
    await espera(260);
    sonido.papel();
    const anim = papelito.animate([{ height: '0px' }, { height: alto + 'px' }], { duration: 950, easing: 'cubic-bezier(.3,0,.2,1)' });
    await anim.finished.catch(() => {});
    papelito.style.height = '';
    if (yo.gano) { sonido.premio(yo.descuento); chispas(); } else sonido.consuelo();
    cursos.hidden = !habiaCursos;
    if (habiaCursos) cursos.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 350 });
    $('#barra').hidden = false;
    titulo.focus({ preventScroll: true });
  }

  // ------------------------------------------------------------------ inicio
  form.addEventListener('submit', participar);
  manivela.addEventListener('click', () => form.requestSubmit());
  campoNombre.addEventListener('input', () => error('#e-nombre', '', campoNombre));
  campoTel.addEventListener('input', () => error('#e-whatsapp', '', campoTel));

  try {
    const previo = JSON.parse(memoria.leer('yo') || 'null');
    if (previo && typeof previo.nombre === 'string' && typeof previo.whatsapp === 'string') {
      campoNombre.value = previo.nombre.slice(0, 40);
      campoTel.value = soloNumero(previo.whatsapp).slice(0, 9);
    }
  } catch { /* dato viejo ilegible: se ignora */ }

  domo.llenar();

  fetch('api/estado').then((r) => (r.ok ? r.json() : null)).then((e) => {
    if (!e) return;
    config = { ...config, ...e };
    if (!Array.isArray(config.cursos)) config.cursos = [];
    const ds = [...config.descuentos].sort((a, b) => a - b);
    if (ds.length) {
      $('#bajada').textContent = `Todas las cápsulas tienen premio: ${lista(ds.map((d) => d + ' %'))} de descuento en el curso Seguridad en codificación con IA, de S/ 100.`;
      $('#placa-a').textContent = ds.length > 1 ? `${ds[0]} a ${ds[ds.length - 1]} %` : `${ds[0]} %`;
    }
    if (!config.abierto) {
      $('#cerrado').hidden = false;
      $('#cerrado-wa').href = `https://wa.me/${config.whatsapp}?text=${encodeURIComponent('Hola, David. Quiero información de los cursos de JMD Learning.')}`;
      $('#bajada').hidden = true;
      botonGirar.textContent = 'Ver mi resultado';
    }
  }).catch(() => { /* sin estado se usa lo que ya dice la página */ });
})();
