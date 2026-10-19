/* Estilo «Atardecer Neón» (carpeta gta6): movimiento propio.
   · mascara-hero (efecto estrella, solo escritorio ≥ 900 px y sin «reducir movimiento»):
     el hero queda anclado; el nombre gigante recorta el cielo y deja ver la imagen por sus letras;
     con el scroll las letras crecen hasta abrir la imagen entera, el cielo se disuelve y el hero
     queda resuelto (imagen con el nombre encima). En móvil y sin JS se ve ya resuelto.
   · postales: las tarjetas caen girando hasta su inclinación.
   · fichas: las fichas de personaje entran como cartas repartidas. */
(function () {
  'use strict';
  var M = window.Mov;
  if (!M || !M.gsap || M.reducido) return;
  var g = M.gsap;

  function fuenteLista(cb) {
    var hecho = false;
    var ir = function () { if (!hecho) { hecho = true; cb(); } };
    try {
      if (document.fonts && document.fonts.load) document.fonts.load('400 100px Anton').then(ir, ir);
      else ir();
    } catch (e) { ir(); }
    setTimeout(ir, 2500); // sin red de fuentes: sigue con la de respaldo
  }

  // Elige un punto dentro de un trazo vertical de una letra cercana al centro: al ampliar, ahí se abre la imagen.
  function origen(texto) {
    var n = texto.getNumberOfChars(), cuerpo = texto.textContent.replace(/\s+/g, ''), mejor = null;
    var cont = texto.getBBox(), cx = cont.x + cont.width / 2, cy = cont.y + cont.height / 2;
    var todo = Array.prototype.map.call(texto.querySelectorAll('tspan'), function (t) { return t.textContent; }).join('');
    for (var i = 0; i < n; i++) {
      var ch = todo.charAt(i);
      if (!/[A-ZÁÉÍÓÚÑÜ0-9]/.test(ch)) continue;
      var e;
      try { e = texto.getExtentOfChar(i); } catch (err) { continue; }
      var asta = /[IT1]/.test(ch) ? 0.5 : /[LEFHNMKPRBDÉÑÍ]/.test(ch) ? 0.24 : null;
      if (asta === null) continue;
      var p = { x: e.x + e.width * asta, y: e.y + e.height * 0.56 };
      var d = Math.hypot(p.x - cx, (p.y - cy) * 1.4);
      if (!mejor || d < mejor.d) mejor = { x: p.x, y: p.y, d: d };
    }
    return mejor || { x: cx, y: cy };
  }

  M.registrar('mascara-hero', function (fig) {
    var hero = fig.closest('.hero');
    var svg = hero && hero.querySelector('.hero-velo-svg');
    if (!svg) return;
    var mm = g.matchMedia();
    mm.add('(min-width: 900px)', function () {
      var img = fig.querySelector('img');
      var marca = hero.querySelector('.hero-marca');
      var cont = hero.querySelector('.hero-contenido');
      var desliza = hero.querySelector('.hero-desliza');
      var zooms = svg.querySelectorAll('.hv-zoom');
      var ajustes = svg.querySelectorAll('.hv-ajuste');
      var textos = svg.querySelectorAll('.hv-ajuste text');
      var borde = svg.querySelector('.hv-borde');
      var tl = null, vivo = true, escala = { s: 1 }, o = { x: 0, y: 0 };

      hero.classList.add('mascara-activa');
      g.set([marca, cont], { autoAlpha: 0 });

      function encajar() {
        var W = hero.clientWidth, H = window.innerHeight;
        svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
        var fondo = svg.querySelector('.hv-fondo');
        fondo.setAttribute('width', W); fondo.setAttribute('height', H);
        // palmeras en las esquinas inferiores
        var pi = svg.querySelector('.hv-palma-izq svg'), pd = svg.querySelector('.hv-palma-der svg');
        var ph = H * 0.6, pw = ph * 300 / 462;
        [[pi, -pw * 0.18, ph], [pd, W - pw * 0.82, ph * 0.86]].forEach(function (a) {
          if (!a[0]) return;
          a[0].setAttribute('x', a[1]); a[0].setAttribute('y', H - a[2]);
          a[0].setAttribute('width', a[2] * 300 / 462); a[0].setAttribute('height', a[2]);
        });
        // el nombre: 86 % del ancho como máximo y 62 % del alto
        textos.forEach(function (t) { t.setAttribute('font-size', 100); });
        var b = borde.getBBox();
        var k = Math.min((W * 0.86) / b.width, (H * 0.62) / b.height);
        textos.forEach(function (t) { t.setAttribute('font-size', (100 * k).toFixed(2)); });
        b = borde.getBBox();
        var tx = W / 2 - (b.x + b.width / 2), ty = H / 2 - (b.y + b.height / 2);
        ajustes.forEach(function (a) { a.setAttribute('transform', 'translate(' + tx.toFixed(1) + ' ' + ty.toFixed(1) + ')'); });
        var p = origen(borde);
        o.x = p.x + tx; o.y = p.y + ty;
        poner();
      }
      function poner() {
        var t = 'translate(' + o.x + ' ' + o.y + ') scale(' + escala.s + ') translate(' + (-o.x) + ' ' + (-o.y) + ')';
        zooms.forEach(function (z) { z.setAttribute('transform', t); });
      }

      // El ancla se crea ya (en orden de página) para que las demás escenas midan bien su posición;
      // el nombre se vuelve a encajar cuando llega la fuente Anton.
      encajar();
      g.set(ajustes, { opacity: 0 });
      tl = g.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: hero, start: 'top top', end: '+=150%', pin: true, scrub: 0.7, anticipatePin: 1, onRefresh: encajar },
      });
      tl.to(escala, { s: 34, duration: 0.62, ease: 'power3.in', onUpdate: poner }, 0)
        .to(svg, { opacity: 0, duration: 0.22 }, 0.46)
        .fromTo(img, { scale: 1.32 }, { scale: 1, duration: 0.8, ease: 'power1.out' }, 0)
        .to(desliza, { autoAlpha: 0, duration: 0.08 }, 0)
        .fromTo(marca, { autoAlpha: 0, scale: 1.35 }, { autoAlpha: 1, scale: 1, duration: 0.24, ease: 'power2.out' }, 0.66)
        .fromTo(cont, { autoAlpha: 0, y: 60 }, { autoAlpha: 1, y: 0, duration: 0.22, ease: 'power2.out' }, 0.78)
        .to({}, { duration: 0.08 }, 1);
      fuenteLista(function () {
        if (!vivo) return;
        encajar();
        g.to(ajustes, { opacity: 1, duration: 0.8, ease: 'power2.out' });
      });

      return function () {
        vivo = false;
        if (tl) { tl.scrollTrigger && tl.scrollTrigger.kill(); tl.kill(); }
        hero.classList.remove('mascara-activa');
        g.set([marca, cont, svg, img, desliza], { clearProps: 'all' });
      };
    });
    // En móvil el hero ya está resuelto: solo una entrada breve del nombre.
    mm.add('(max-width: 899px)', function () {
      g.from(hero.querySelector('.hero-marca'), { autoAlpha: 0, scale: 1.12, duration: 1.1, ease: 'power3.out', delay: 0.1 });
      g.from(hero.querySelector('.hero-contenido'), { autoAlpha: 0, y: 30, duration: 0.9, ease: 'power3.out', delay: 0.35 });
    });
  });

  M.registrar('postales', function (el) {
    var hijos = Array.prototype.slice.call(el.children);
    var esPostal = hijos.length && hijos[0].classList.contains('tarjeta');
    g.from(hijos, {
      y: esPostal ? 140 : 50, rotation: function (i) { return esPostal ? (i % 2 ? 14 : -12) : 0; }, autoAlpha: 0,
      duration: esPostal ? 1 : 0.8, ease: esPostal ? 'back.out(1.2)' : 'power3.out', stagger: 0.12,
      scrollTrigger: { trigger: el, start: 'top 85%', once: true },
    });
  });

  M.registrar('fichas', function (el) {
    var fichas = el.querySelectorAll('.paso');
    g.from(fichas, {
      x: 80, y: 40, rotation: 6, autoAlpha: 0, duration: 0.9, ease: 'power3.out', stagger: 0.12,
      scrollTrigger: { trigger: el, start: 'top 82%', once: true },
    });
    fichas.forEach(function (f) {
      var n = f.querySelector('.paso-num');
      if (n) g.from(n, { yPercent: 40, autoAlpha: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: f, start: 'top 85%', once: true } });
    });
  });
})();
