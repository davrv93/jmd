/* Movimiento común de las landings (GSAP + ScrollTrigger, archivos locales).
   Los elementos dicen qué quieren con data-mov; el estilo decide los valores en estilo.json → "mov".
   Sin JavaScript o con «reducir movimiento», todo se ve en su estado final.

   Efectos al entrar en pantalla: subir · aparecer · mascara · escala · letras · palabras · lado
   Efectos con scroll (scrub):     zoom · parallax · hero-zoom · hero-fijo
   Contenedores:                   grupo (escalona a sus hijos) · pasos (escena fija con pasos) · horizontal
   Números:                        [data-contar] cuenta hasta su valor al aparecer
   Intro de página:                body.con-intro → cortina (estilo.json "intro")
   API para estilo.js:             window.Mov = { gsap, ScrollTrigger, reducido, efectos, registrar(nombre, fn) } */
(function () {
  'use strict';
  var g = window.gsap, ST = window.ScrollTrigger;
  var reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var efectos = {};
  window.Mov = { gsap: g, ScrollTrigger: ST, reducido: reducido, efectos: efectos, registrar: function (n, f) { efectos[n] = f; }, partir: function (el, modo) { return partir(el, modo || 'palabras'); } };
  if (!g || !ST) return;
  g.registerPlugin(ST);
  document.documentElement.classList.add('mov-listo');

  var alEntrar = function (el, desde, extra) {
    return g.from(el, Object.assign({ duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } }, desde, extra || {}));
  };

  function partir(el, modo) {
    if (el.dataset.partido) return el.querySelectorAll('.mov-pieza');
    el.dataset.partido = '1';
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    var piezas = [];
    var recorrer = function (nodo) {
      Array.prototype.slice.call(nodo.childNodes).forEach(function (h) {
        if (h.nodeType === 3) {
          var frag = document.createDocumentFragment();
          var partes = modo === 'letras' ? Array.from(h.textContent) : h.textContent.split(/(\s+)/);
          partes.forEach(function (p) {
            if (/^\s+$/.test(p) || p === '') { frag.appendChild(document.createTextNode(p)); return; }
            var previa = piezas[piezas.length - 1];
            if (modo !== 'letras' && previa && frag.childNodes.length === 0 && /^[,.;:!?…»)\]]+$/.test(p)) { previa.textContent += p; return; }
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
    };
    recorrer(el);
    return piezas;
  }

  Object.assign(efectos, {
    subir: function (el) { alEntrar(el, { y: 48, opacity: 0 }); },
    aparecer: function (el) { alEntrar(el, { opacity: 0 }, { duration: 1.2 }); },
    lado: function (el) { alEntrar(el, { x: -60, opacity: 0 }); },
    escala: function (el) { alEntrar(el, { scale: 0.92, opacity: 0 }, { duration: 1.1 }); },
    mascara: function (el) { alEntrar(el, { clipPath: 'inset(100% 0% 0% 0%)' }, { duration: 1.2, ease: 'power4.out' }); },
    letras: function (el) { alEntrar(partir(el, 'letras'), { yPercent: 110, opacity: 0 }, { stagger: 0.025, duration: 0.8, scrollTrigger: { trigger: el, start: 'top 90%', once: true } }); },
    palabras: function (el) { alEntrar(partir(el, 'palabras'), { y: 30, opacity: 0 }, { stagger: 0.06, duration: 0.8, scrollTrigger: { trigger: el, start: 'top 90%', once: true } }); },
    grupo: function (el) {
      var hijos = Array.prototype.slice.call(el.children);
      g.from(hijos, { y: 50, opacity: 0, duration: 0.85, ease: 'power3.out', stagger: 0.1, scrollTrigger: { trigger: el, start: 'top 85%', once: true } });
    },
    zoom: function (el) {
      var img = el.querySelector('img') || el;
      g.fromTo(img, { scale: 1.18 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
    },
    parallax: function (el) {
      var v = parseFloat(el.dataset.vel || '0.2');
      g.fromTo(el, { yPercent: -20 * v * 5 }, { yPercent: 20 * v * 5, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
    },
    'hero-zoom': function (el) {
      var img = el.querySelector('img') || el;
      g.fromTo(img, { scale: 1 }, { scale: 1.12, ease: 'none', scrollTrigger: { trigger: el.closest('.hero') || el, start: 'top top', end: 'bottom top', scrub: true } });
    },
    'hero-fijo': function (el) {
      var hero = el.closest('.hero') || el;
      g.to(hero.querySelector('.hero-contenido'), { yPercent: -30, opacity: 0, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
      efectos['hero-zoom'](el);
    },
    pasos: function (el) {
      var medios = el.querySelectorAll('.paso-media');
      var pasos = el.querySelectorAll('.paso');
      var mm = g.matchMedia();
      mm.add('(min-width: 900px)', function () {
        if (!medios.length) return;
        el.classList.add('pasos-fijos');
        g.set(medios, { opacity: 0 });
        g.set(medios[0], { opacity: 1 });
        pasos.forEach(function (p, i) {
          ST.create({
            trigger: p, start: 'top 60%', end: 'bottom 40%',
            onToggle: function (st) {
              if (!st.isActive) return;
              g.to(medios, { opacity: 0, duration: 0.5, overwrite: true });
              g.to(medios[i], { opacity: 1, duration: 0.5, overwrite: true });
              pasos.forEach(function (q, j) { q.classList.toggle('paso-activo', j === i); });
            },
          });
        });
        return function () { el.classList.remove('pasos-fijos'); g.set(medios, { clearProps: 'opacity' }); };
      });
      mm.add('(max-width: 899px)', function () { pasos.forEach(function (p) { alEntrar(p, { y: 40, opacity: 0 }); }); });
    },
    horizontal: function (el) {
      var pista = el.querySelector('.galeria-pista');
      var mm = g.matchMedia();
      mm.add('(min-width: 900px)', function () {
        el.classList.add('galeria-fija');
        var dist = function () { return Math.max(0, pista.scrollWidth - el.clientWidth); };
        g.to(pista, { x: function () { return -dist(); }, ease: 'none', scrollTrigger: { trigger: el, start: 'center center', end: function () { return '+=' + dist(); }, pin: el.closest('.s') || el, scrub: 0.6, invalidateOnRefresh: true } });
        return function () { el.classList.remove('galeria-fija'); };
      });
    },
  });

  function contar(el) {
    var txt = el.textContent.trim();
    var m = txt.match(/^([^\d]*)([\d.,]+)(.*)$/);
    if (!m) return;
    var limpio = m[2].replace(/[.,](?=\d{3}\b)/g, '');
    var fin = parseFloat(limpio.replace(',', '.'));
    if (!isFinite(fin)) return;
    var decimales = (limpio.split(/[.,]/)[1] || '').length;
    var sep = /\d[.,]\d{3}\b/.test(m[2]) ? m[2].match(/\d([.,])\d{3}\b/)[1] : '';
    var o = { v: 0 };
    var poner = function () {
      var s = o.v.toFixed(decimales);
      if (sep) s = s.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
      el.textContent = m[1] + s + m[3];
    };
    g.to(o, { v: fin, duration: 1.6, ease: 'power2.out', onUpdate: poner, scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
    el.textContent = m[1] + '0' + m[3];
  }

  function intro() {
    if (!document.body.classList.contains('con-intro')) return;
    var c = document.createElement('div');
    c.className = 'intro-cortina';
    c.setAttribute('aria-hidden', 'true');
    document.body.appendChild(c);
    g.to(c, { yPercent: -100, duration: 0.9, ease: 'power4.inOut', delay: 0.15, onComplete: function () { c.remove(); } });
  }

  function iniciar() {
    if (reducido) return; // estado final, sin animar
    intro();
    document.querySelectorAll('[data-mov]').forEach(function (el) {
      el.dataset.mov.split(/\s+/).forEach(function (n) { if (efectos[n]) efectos[n](el); });
    });
    document.querySelectorAll('[data-contar]').forEach(contar);
    window.addEventListener('load', function () { ST.refresh(); });
  }
  // estilo.js (si existe) se carga después y puede registrar efectos: se inicia en DOMContentLoaded.
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else setTimeout(iniciar, 0);
})();
