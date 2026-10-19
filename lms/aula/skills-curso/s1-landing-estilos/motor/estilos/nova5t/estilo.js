/* Estilo «nova 5T»: color y rebote.
   - Selector de tema (3 muestras en el hero): cambia las variables de color de toda la página.
     Se recuerda solo en este navegador (localStorage, si está disponible); nada va al servidor.
   - Inclinación 3D de tarjetas al mover el mouse: solo con puntero fino y sin «reducir movimiento».
   - Efectos: n-saltar (palabras que rebotan), n-grupo (hijos que entran con rebote),
     n-vitrina (la tarjeta del hero entra girando y luego flota).
   Con «reducir movimiento» movimiento.js no ejecuta efectos: todo queda en su estado final. */
(function () {
  'use strict';
  var raiz = document.documentElement;
  var CLAVE = 'nova5t-tema';
  var COLOR_BARRA = { aurora: '#f6f3ff', ocaso: '#fff4f6', laguna: '#f1fbff' };

  /* ---------- Temas ---------- */
  function ponerTema(id, animar) {
    if (!COLOR_BARRA[id]) id = 'aurora';
    if (!animar) raiz.classList.add('tema-sin-transicion');
    if (id === 'aurora') raiz.removeAttribute('data-tema'); else raiz.setAttribute('data-tema', id);
    if (!animar) { void raiz.offsetWidth; raiz.classList.remove('tema-sin-transicion'); }
    document.querySelectorAll('.tema').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.tema === id)); });
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', COLOR_BARRA[id]);
  }
  var guardado = null;
  try { guardado = window.localStorage.getItem(CLAVE); } catch (e) { /* almacenamiento bloqueado: se usa el tema por defecto */ }
  if (guardado) ponerTema(guardado, false);
  var temas = document.querySelector('.temas');
  if (temas) {
    temas.hidden = false;
    temas.addEventListener('click', function (ev) {
      var b = ev.target.closest('.tema');
      if (!b) return;
      ponerTema(b.dataset.tema, true);
      try { window.localStorage.setItem(CLAVE, b.dataset.tema); } catch (e) { /* sin almacenamiento: el tema dura esta visita */ }
    });
  }

  var M = window.Mov;
  var reducido = M ? M.reducido : window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fino = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- Brillo bajo el puntero (luz, no movimiento) ---------- */
  if (fino) {
    document.querySelectorAll('.tarjeta, .plan, .cifra, .hero-tarjeta').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty('--mx', Math.round(e.clientX - r.left) + 'px');
        el.style.setProperty('--my', Math.round(e.clientY - r.top) + 'px');
      }, { passive: true });
    });
  }

  if (!M || !M.gsap) return;
  var g = M.gsap;

  /* ---------- Inclinación 3D ---------- */
  if (fino && !reducido) {
    document.querySelectorAll('.tarjeta, .plan, .cifra, .hero-tarjeta, .oferta, .testimonio').forEach(function (el) {
      var fuerza = el.classList.contains('hero-tarjeta') ? 14 : el.classList.contains('oferta') ? 4 : 8;
      g.set(el, { transformPerspective: 900 });
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5;
        var y = (e.clientY - r.top) / r.height - 0.5;
        g.to(el, { rotationY: x * fuerza * 2, rotationX: -y * fuerza * 2, duration: 0.5, ease: 'power2.out', overwrite: 'auto' });
      }, { passive: true });
      el.addEventListener('pointerleave', function () {
        g.to(el, { rotationY: 0, rotationX: 0, duration: 0.9, ease: 'elastic.out(1, 0.5)', overwrite: 'auto' });
      });
    });
  }

  /* ---------- Efectos ---------- */
  function partir(el) {
    if (el.dataset.partido) return el.querySelectorAll('.mov-pieza');
    el.dataset.partido = '1';
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    var piezas = [];
    (function recorrer(nodo) {
      Array.prototype.slice.call(nodo.childNodes).forEach(function (h) {
        if (h.nodeType === 3) {
          var frag = document.createDocumentFragment();
          h.textContent.split(/(\s+)/).forEach(function (p) {
            if (p === '' || /^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
            var s = document.createElement('span');
            s.className = 'mov-pieza';
            s.setAttribute('aria-hidden', 'true');
            s.style.display = 'inline-block';
            s.textContent = p;
            frag.appendChild(s);
            piezas.push(s);
          });
          nodo.replaceChild(frag, h);
        } else if (h.nodeType === 1) recorrer(h);
      });
    })(el);
    return piezas;
  }

  M.registrar('n-saltar', function (el) {
    g.from(partir(el), {
      yPercent: 80, rotation: 6, scale: 0.85, opacity: 0, transformOrigin: '0% 100%',
      duration: 0.9, ease: 'back.out(1.9)', stagger: 0.06,
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
    });
  });

  M.registrar('n-grupo', function (el) {
    g.from(el.children, {
      y: 70, scale: 0.92, rotation: -1.5, opacity: 0, duration: 0.95, ease: 'back.out(1.5)', stagger: 0.1,
      scrollTrigger: { trigger: el, start: 'top 86%', once: true },
    });
  });

  M.registrar('n-vitrina', function (fig) {
    var tarjeta = fig.closest('.hero-tarjeta') || fig;
    var hero = fig.closest('.hero') || tarjeta;
    var img = fig.querySelector('img');
    var orbes = hero.querySelectorAll('.hero-orbe');
    var tl = g.timeline({ delay: 0.15 });
    tl.from(tarjeta, { y: 90, rotation: -8, rotationY: -28, rotationX: 8, scale: 0.9, opacity: 0, transformPerspective: 900, duration: 1.5, ease: 'expo.out' }, 0);
    if (orbes.length) tl.from(orbes, { scale: 0, opacity: 0, duration: 1.1, ease: 'back.out(2.2)', stagger: 0.15 }, 0.5);
    var selector = hero.querySelector('.temas');
    if (selector) tl.from(selector, { y: 16, opacity: 0, duration: 0.8, ease: 'power3.out' }, 0.7);
    // Al bajar, la imagen se acerca dentro de su pantalla y la tarjeta se ladea un poco
    var st = function () { return { trigger: hero, start: 'top top', end: 'bottom top', scrub: true }; };
    if (img) g.fromTo(img, { scale: 1 }, { scale: 1.14, ease: 'none', scrollTrigger: st() });
    g.to(tarjeta, { rotation: 5, yPercent: 6, ease: 'none', scrollTrigger: st() });
  });
})();
