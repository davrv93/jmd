/* Estilo «iPad»: despliegue del dispositivo con el scroll, títulos que entran a foco y un destello
   en el borde de las tarjetas que sigue al puntero. Sin JavaScript o con «reducir movimiento» el
   dispositivo ya está abierto, con las teclas encendidas, y todo el texto visible.

   Efecto reutilizable «despliegue» (para el marcado de dispositivo.mjs):
     <div data-mov="despliegue" [data-desp-largo="140%"]>      ← se ancla mientras dura la escena
       … <div class="disp">…</div> …                             ← el dispositivo
       [data-desp="pista"]   se desvanece al empezar a bajar
       [data-desp="titulo"]  aparece (de borroso a nítido) cuando el teclado ya va abriendo
       [data-desp="pie"]     aparece al final de la escena (subtítulo, botones)
   Anima en el .disp las variables --abre (0→1), --luz (0→1, teclas en secuencia), --gira, --escala y --alza. */
(function () {
  'use strict';
  var M = window.Mov;
  if (!M || !M.gsap) return;
  var g = M.gsap;

  M.registrar('despliegue', function (el) {
    var disp = el.querySelector('.disp');
    if (!disp) return;
    // fromTo con valores explícitos: el estado cerrado no depende de lo que haya en pantalla al refrescar.
    var tl = g.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: el, start: 'top top', end: '+=' + (el.dataset.despLargo || '140%'), scrub: 0.7, pin: true, anticipatePin: 1 },
    });
    tl.fromTo(disp, { '--abre': 0, '--gira': '-18deg', '--escala': 0.9, '--alza': '-14em' }, { '--abre': 1, '--gira': '0deg', '--escala': 1, '--alza': '0em', duration: 0.62, ease: 'power2.inOut' }, 0)
      .fromTo(disp, { '--luz': 0 }, { '--luz': 1, duration: 0.42 }, 0.5)
      .to({}, { duration: 0.08 });
    el.querySelectorAll('[data-desp="pista"]').forEach(function (p) { tl.fromTo(p, { opacity: 1, y: 0 }, { opacity: 0, y: 12, duration: 0.08 }, 0); });
    el.querySelectorAll('[data-desp="titulo"]').forEach(function (t) {
      tl.fromTo(t, { opacity: 0, y: 34, filter: 'blur(12px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.3, ease: 'power2.out' }, 0.34);
    });
    // El pie (subtítulo, botones) llega al final: con un titular corto ya está en pantalla y no debe
    // adelantarse al titular ni cruzarse con la pista.
    el.querySelectorAll('[data-desp="pie"]').forEach(function (p, i) {
      tl.fromTo(p, { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.2, ease: 'power2.out' }, 0.62 + i * 0.05);
    });
  });

  M.registrar('enfoque', function (el) {
    g.from(el, { opacity: 0, y: 26, filter: 'blur(12px)', duration: 1.1, ease: 'power3.out', clearProps: 'filter', scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
  });

  // Tamaño del dispositivo: ocupa la pantalla que dejan libre el antetítulo y el titular (sea cual sea
  // su largo). Se mide aquí y se publica como --cabeza; sin JavaScript vale el respaldo del CSS.
  function medirHero() {
    var cambio = false;
    document.querySelectorAll('.hero-escena').forEach(function (esc) {
      var prod = esc.querySelector('.hero-producto');
      if (!prod) return;
      var alto = Math.round(prod.getBoundingClientRect().top - esc.getBoundingClientRect().top);
      if (String(alto) + 'px' !== esc.style.getPropertyValue('--cabeza')) { esc.style.setProperty('--cabeza', alto + 'px'); cambio = true; }
    });
    return cambio;
  }
  medirHero();
  var refrescar = function () { if (medirHero() && M.ScrollTrigger && !M.reducido) M.ScrollTrigger.refresh(); };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refrescar);
  window.addEventListener('load', refrescar);
  var espera;
  window.addEventListener('resize', function () { clearTimeout(espera); espera = setTimeout(refrescar, 200); });

  // Destello en el borde de las tarjetas: solo con puntero fino y movimiento permitido.
  function brillo() {
    if (M.reducido || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    document.documentElement.classList.add('con-brillo');
    var SEL = '.tarjeta, .plan, .testimonio, .oferta, .galeria-item figure, .contacto-datos > div';
    document.addEventListener('pointermove', function (e) {
      var t = e.target.closest && e.target.closest(SEL);
      if (!t) return;
      var r = t.getBoundingClientRect();
      t.style.setProperty('--mx', (e.clientX - r.left).toFixed(0) + 'px');
      t.style.setProperty('--my', (e.clientY - r.top).toFixed(0) + 'px');
    }, { passive: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', brillo);
  else setTimeout(brillo, 0);
})();
