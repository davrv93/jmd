/* Estilo «Huawei»: movimiento sobrio.
   - h-escena: el producto del hero sube desde la oscuridad, se enciende el halo, el suelo y el reflejo;
     con el scroll la escena se acerca y el texto se retira.
   - h-subir: texto que aparece despacio, con poco recorrido.
   - Brillo bajo el puntero en tarjetas (luz, no movimiento: solo con mouse).
   Con «reducir movimiento» movimiento.js no ejecuta ningún efecto: todo queda en su estado final. */
(function () {
  'use strict';

  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.querySelectorAll('.tarjeta, .plan, .oferta, .testimonio').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty('--mx', Math.round(e.clientX - r.left) + 'px');
        el.style.setProperty('--my', Math.round(e.clientY - r.top) + 'px');
      }, { passive: true });
    });
  }

  var M = window.Mov;
  if (!M || !M.gsap) return;
  var g = M.gsap;

  // Revelado con máscara que sube; los recortes negativos dejan respirar el brillo del <em>
  M.registrar('h-mascara', function (el) {
    g.fromTo(el, { clipPath: 'inset(100% -12% -30% -12%)', y: 30 }, {
      clipPath: 'inset(-30% -12% -30% -12%)', y: 0, duration: 1.4, ease: 'power4.out', clearProps: 'clipPath',
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
    });
  });

  M.registrar('h-subir', function (el) {
    g.from(el, { y: 26, opacity: 0, duration: 1.3, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
  });

  M.registrar('h-escena', function (fig) {
    var hero = fig.closest('.hero') || fig.parentNode;
    var escena = hero.querySelector('.hero-escena') || fig;
    var luz = hero.querySelector('.hero-luz');
    var suelo = hero.querySelector('.hero-suelo');
    var reflejo = hero.querySelector('.hero-reflejo');
    var contenido = hero.querySelector('.hero-contenido');
    var sueltos = hero.querySelectorAll('.antetitulo, .acciones');

    // Entrada: cada pieza anima propiedades propias para no pisar el scroll de la escena
    var tl = g.timeline({ delay: 0.1 });
    if (sueltos.length) tl.from(sueltos, { opacity: 0, y: 14, duration: 1.1, ease: 'power2.out', stagger: 0.25 }, 0.1);
    if (luz) tl.from(luz, { opacity: 0, scale: 0.55, duration: 2.2, ease: 'power2.out' }, 0);
    tl.from(fig, { opacity: 0, y: 70, scale: 0.94, duration: 1.7, ease: 'power3.out' }, 0.25);
    if (suelo) tl.from(suelo, { opacity: 0, scaleX: 0, duration: 1.5, ease: 'power3.inOut' }, 0.55);
    if (reflejo) tl.from(reflejo, { opacity: 0, duration: 1.8, ease: 'power1.out' }, 0.9);

    // Scroll: la escena se acerca y el texto se retira hacia arriba
    var st = function () { return { trigger: hero, start: 'top top', end: 'bottom top', scrub: true }; };
    g.to(escena, { scale: 1.08, ease: 'none', scrollTrigger: st() });
    if (contenido) g.to(contenido, { yPercent: -16, opacity: 0.15, ease: 'none', scrollTrigger: st() });
  });
})();
