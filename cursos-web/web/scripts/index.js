(function () {
  if (!window.gsap) return;
  var gsap = window.gsap;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (window.ScrollTrigger) gsap.registerPlugin(window.ScrollTrigger);
  if (window.Flip) gsap.registerPlugin(window.Flip);

  function visibles() {
    var vivos = document.getElementById('vivos');
    if (!vivos) return { cursos: 0, grupos: 0 };
    var cards = Array.prototype.slice.call(vivos.children)
      .filter(function (c) { return !c.hidden && !c.classList.contains('area-hidden'); });
    var grupos = cards.reduce(function (acc, el) {
      var inicios = (el.getAttribute('data-inicios') || '').split(',').filter(Boolean);
      return acc + inicios.length;
    }, 0);
    return { cursos: cards.length, grupos: grupos };
  }

  function pintarStats(animar) {
    var a = visibles();
    var c = document.getElementById('st-cursos');
    var g = document.getElementById('st-grupos');
    if (!c || !g) return;
    function set(el, v) {
      if (reduce || animar === false) { el.textContent = String(v); return; }
      var from = Number(el.textContent || 0);
      gsap.fromTo(el, { innerText: from }, { innerText: v, duration: 0.55, ease: 'power2.out', snap: { innerText: 1 } });
    }
    set(c, a.cursos);
    set(g, a.grupos);
  }

  function setupAreaFilter() {
    var vivos = document.getElementById('vivos');
    if (!vivos || !window.Flip) return;
    var chips = Array.prototype.slice.call(document.querySelectorAll('button.chip[data-area]'));
    var cards = Array.prototype.slice.call(vivos.children);
    var empty = document.getElementById('area-vacio');

     function visibleCard(el) {
       return !!el && !el.hidden && !el.classList.contains('area-hidden');
     }

     function cleanupInline(el) {
       if (!el || !el.style) return;
       // Flip (y animaciones) pueden dejar position/top/left/width/height/transform/opacity inline si algo interrumpe.
       el.style.position = '';
       el.style.top = '';
       el.style.left = '';
       el.style.width = '';
       el.style.height = '';
       el.style.transform = '';
       el.style.opacity = '';
       el.style.willChange = '';
     }

     function aplicar(area, opts) {
       opts = opts || {};
       var toHide = [], toShow = [];
       cards.forEach(function (c) {
         var a = (c.getAttribute('data-area') || '').trim();
         var ok = area === 'todas' || (a && a === area);
         var h = c.classList.contains('area-hidden');
         if (ok && h) toShow.push(c);
         if (!ok && !h) toHide.push(c);
       });

       function syncEmpty() {
         if (!empty) return;
         var any = cards.some(function (c) { return visibleCard(c); });
         empty.classList.toggle('on', !any);
       }

       function finish() {
         // Sin cambios: solo sincroniza estado y limpia cualquier residuo.
         if (!toHide.length && !toShow.length) {
           syncEmpty();
           pintarStats(false);
           cards.forEach(cleanupInline);
           return;
         }

         if (reduce || opts.sinAnim) {
           toHide.forEach(function (c) { c.classList.add('area-hidden'); cleanupInline(c); });
           toShow.forEach(function (c) { c.classList.remove('area-hidden'); cleanupInline(c); });
           syncEmpty();
           pintarStats(false);
           return;
         }

         // FLIP solo para el cambio de layout por filtro.
         var state = window.Flip.getState(cards.filter(function (c) { return !c.hidden; }));
         toHide.forEach(function (c) { c.classList.add('area-hidden'); cleanupInline(c); });
         toShow.forEach(function (c) { c.classList.remove('area-hidden'); cleanupInline(c); });

         window.Flip.from(state, {
           duration: 0.5,
           ease: 'power2.inOut',
           absolute: false,
           onComplete: function () { cards.forEach(cleanupInline); }
         });

         if (toShow.length) {
           gsap.fromTo(
             toShow,
             { opacity: 0, y: 10 },
             { opacity: 1, y: 0, duration: 0.25, stagger: 0.03, ease: 'power2.out', clearProps: 'transform,opacity' }
           );
         }

         syncEmpty();
         pintarStats(false);
       }

       if (reduce || opts.sinAnim) return finish();
       if (!toHide.length) return finish();

       // Fade-out rápido antes del FLIP (solo opacity/transform, y limpiamos al final).
       gsap.to(toHide, {
         opacity: 0,
         y: -6,
         duration: 0.16,
         ease: 'power2.in',
         onComplete: function () {
           toHide.forEach(cleanupInline);
           finish();
         }
       });
     }

    chips.forEach(function (b) {
      b.addEventListener('click', function () {
        chips.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        aplicar(b.getAttribute('data-area'));
      });
    });

     // Estado inicial: sin animaciones ni FLIP.
     aplicar('todas', { sinAnim: true });
   }

   function setupIntro() {
     if (reduce) return;
     // Animación inicial: desde un estado visible final (sin dejar props inline).
     var cards = gsap.utils.toArray('.card').filter(function (el) {
       return el && !el.hidden && !el.classList.contains('area-hidden');
     });
     if (!cards.length) return;
     gsap.from(cards, {
       opacity: 0,
       y: 12,
       duration: 0.38,
       stagger: 0.03,
       ease: 'power2.out',
       clearProps: 'transform,opacity'
     });
   }

  function setupStickyBarAnim() {
    if (reduce) return;
    var bar = document.getElementById('mc-barra');
    if (!bar) return;
    var obs = new MutationObserver(function () {
      if (bar.classList.contains('on')) {
        gsap.fromTo(bar, { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.25, ease: 'power2.out' });
      }
    });
    obs.observe(bar, { attributes: true, attributeFilter: ['class'] });
  }

  document.addEventListener('cursos:filtrado', function () { pintarStats(true); });

  setupAreaFilter();
  setupIntro();
  setupStickyBarAnim();
  pintarStats(false);
})();
