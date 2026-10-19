/* Estilo «Difícil de explicar»: movimiento propio.
   · Encendido CRT: una línea que se abre (solo al cargar, nunca con «reducir movimiento»).
   · collage: las losetas del titular caen letra a letra y el sticker cae al final.
   · corte: los hijos entran escalonados a 0,25 s (una corchea a 120 ppm).
   · ventana / sello: entradas con rebote corto.
   · Cinta fija: código de tiempo que avanza con el scroll y nombre de la sección actual.
   Todo lo que anima parte del estado final visible: sin JS, la página se ve completa. */
(function () {
  'use strict';
  var M = window.Mov;
  if (!M) return;
  var g = M.gsap;
  var CORCHEA = 0.25;

  function azar(semilla) {
    var s = semilla >>> 0 || 1;
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }

  /* ---------- Cinta: código de tiempo + escena ---------- */
  var NOMBRES = { cifras: 'Cifras', caracteristicas: 'Destacados', pasos: 'Pasos', galeria: 'Galería', precios: 'Precios', testimonios: 'Testimonios', preguntas: 'Preguntas', contacto: 'Contacto', oferta: 'Oferta' };
  function limpiar(t) { return (t || '').replace(/\s+/g, ' ').trim().replace(/[.:]$/, ''); }
  function cinta() {
    var main = document.getElementById('contenido');
    if (!main) return;
    var escenas = Array.prototype.slice.call(main.querySelectorAll(':scope > section')).map(function (s, i) {
      var nombre = '';
      if (s.id === 'inicio') nombre = 'Inicio';
      if (!nombre && s.id) {
        var enlace = document.querySelector('.nav-enlaces a[href="#' + s.id + '"]');
        if (enlace) nombre = limpiar(enlace.textContent);
      }
      if (!nombre) { var ante = s.querySelector('.s-ante'); if (ante) nombre = limpiar(ante.textContent); }
      if (!nombre) { var tit = s.querySelector('.s-titulo'); var t = tit && limpiar(tit.textContent); if (t && t.length <= 24) nombre = t; }
      if (!nombre) { var m = s.className.match(/\bs-(\w+)/); nombre = (m && NOMBRES[m[1]]) || 'Escena'; }
      return { el: s, nombre: (i + 1 < 10 ? '0' : '') + (i + 1) + ' · ' + nombre };
    });
    if (!escenas.length) return;
    var c = document.createElement('div');
    c.className = 'cinta';
    c.setAttribute('aria-hidden', 'true');
    c.innerHTML = '<span class="cinta-rec"></span><span class="cinta-tc">00:00:00:00</span><span class="cinta-sep"></span><span class="cinta-esc"></span>';
    document.body.appendChild(c);
    var tc = c.querySelector('.cinta-tc'), esc = c.querySelector('.cinta-esc');
    var dos = function (n) { return (n < 10 ? '0' : '') + n; };
    var pendiente = false, ultima = '';
    function poner() {
      pendiente = false;
      var y = window.scrollY || window.pageYOffset || 0;
      var seg = y / 60; // un segundo de cinta cada 60 px
      var cc = Math.floor((seg % 1) * 100), s = Math.floor(seg);
      tc.textContent = dos(Math.floor(s / 3600)) + ':' + dos(Math.floor(s / 60) % 60) + ':' + dos(s % 60) + ':' + dos(cc);
      var medio = window.innerHeight * 0.45, actual = escenas[0];
      for (var i = 0; i < escenas.length; i++) if (escenas[i].el.getBoundingClientRect().top <= medio) actual = escenas[i];
      if (actual.nombre !== ultima) { esc.textContent = actual.nombre; ultima = actual.nombre; }
    }
    window.addEventListener('scroll', function () { if (!pendiente) { pendiente = true; requestAnimationFrame(poner); } }, { passive: true });
    window.addEventListener('resize', poner);
    poner();
  }
  cinta(); // la cinta es información, no movimiento: también va con «reducir movimiento»

  if (!g || M.reducido) return;

  /* ---------- Encendido CRT ---------- */
  (function encendido() {
    var crt = document.createElement('div');
    crt.className = 'crt';
    crt.setAttribute('aria-hidden', 'true');
    crt.innerHTML = '<div class="crt-arriba"></div><div class="crt-abajo"></div><div class="crt-linea"></div>';
    document.body.appendChild(crt);
    var tl = g.timeline({ onComplete: function () { crt.remove(); } });
    tl.to(crt.querySelector('.crt-linea'), { scaleX: 1, duration: 0.26, ease: 'expo.out' }, 0.05)
      .to(crt.querySelector('.crt-arriba'), { yPercent: -100, duration: 0.5, ease: 'expo.inOut' }, 0.3)
      .to(crt.querySelector('.crt-abajo'), { yPercent: 100, duration: 0.5, ease: 'expo.inOut' }, 0.3)
      .to(crt.querySelector('.crt-linea'), { scaleY: 0, opacity: 0, duration: 0.22, ease: 'power2.in' }, 0.34);
  })();

  /* ---------- Efectos ---------- */
  M.registrar('collage', function (el) {
    var losetas = el.querySelectorAll('.loseta');
    var sticker = el.querySelector('.sticker');
    var r = azar(23);
    var paso = Math.min(0.0625, 1.0 / Math.max(1, losetas.length)); // semicorcheas, sin pasar de 1 s
    var inicio = 0.5;
    g.from(losetas, {
      y: function () { return -(220 + r() * 260); },
      rotation: function () { return (r() - 0.5) * 60; },
      opacity: 0, duration: 0.5, ease: 'back.out(1.5)', stagger: paso, delay: inicio,
    });
    if (sticker) {
      g.from(sticker, { scale: 0, rotation: -35, opacity: 0, duration: 0.45, ease: 'back.out(2.2)', delay: inicio + losetas.length * paso + 0.1 });
    }
  });

  M.registrar('ventana', function (el) {
    g.from(el, { y: 40, rotation: 2.5, opacity: 0, duration: 0.7, ease: 'back.out(1.4)', delay: 0.9 });
    var mini = document.querySelectorAll('.hero-losetas .loseta-mini');
    if (mini.length) g.from(mini, { y: 26, opacity: 0, duration: 0.4, ease: 'back.out(2)', stagger: CORCHEA / 2, delay: 1.0 });
  });

  M.registrar('corte', function (el) {
    var hijos = Array.prototype.slice.call(el.children);
    g.from(hijos, {
      y: 40, opacity: 0, rotation: function (i) { return i % 2 ? 2.5 : -2.5; },
      duration: 0.45, ease: 'back.out(1.6)', stagger: CORCHEA,
      scrollTrigger: { trigger: el, start: 'top 86%', once: true },
    });
  });

  M.registrar('sello', function (el) {
    g.from(el, { y: 36, rotation: -2, opacity: 0, duration: 0.6, ease: 'back.out(1.5)', scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
    var s = el.querySelector('.oferta-etiqueta');
    if (s) g.from(s, { scale: 1.6, opacity: 0, rotation: -40, duration: 0.4, ease: 'power3.in', delay: CORCHEA * 2, scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
  });

  // El desfile de siluetas salta al pulso cuando entra en pantalla.
  document.querySelectorAll('.desfile').forEach(function (d) {
    var p = d.children;
    g.from(p, { y: 30, opacity: 0, duration: 0.35, ease: 'back.out(2.4)', stagger: CORCHEA, scrollTrigger: { trigger: d, start: 'top 90%', once: true } });
  });
})();
