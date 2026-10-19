/* Estilo «Inmersivo»: revelado de títulos con máscara, parallax de capas por capítulo,
   luz que sigue al puntero (solo puntero fino), índice de capítulos y navegación que se vuelve
   sólida al bajar. Todas las animaciones parten de gsap.from: sin JavaScript o con «reducir
   movimiento» el contenido queda en su estado final. */
(function () {
  'use strict';
  var M = window.Mov;
  var raiz = document.documentElement;
  var reducido = M ? M.reducido : window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var g = M && M.gsap;

  // Parte un título en palabras; cada palabra va dentro de una ventana (.velo-v) que la recorta.
  // La puntuación pegada a un <em> («dolor,», «atajos.») no debe quedar sola al partir la línea:
  // la última palabra del <em> y su puntuación van juntas en un .velo-junto (sin salto).
  function unirPuntuacion(el) {
    Array.prototype.slice.call(el.querySelectorAll('*')).forEach(function (e) {
      var sig = e.nextSibling;
      if (e.children.length || !sig || sig.nodeType !== 3) return;
      var pegado = sig.textContent.match(/^\S+/);
      var ultima = e.textContent.match(/(\S+)$/);
      if (!pegado || !ultima) return;
      var cola = e.cloneNode(false);
      cola.textContent = ultima[1];
      e.textContent = e.textContent.slice(0, e.textContent.length - ultima[1].length);
      var junto = document.createElement('span');
      junto.className = 'velo-junto';
      junto.appendChild(cola);
      junto.appendChild(document.createTextNode(pegado[0]));
      sig.textContent = sig.textContent.slice(pegado[0].length);
      e.parentNode.insertBefore(junto, sig);
      if (!e.textContent) e.parentNode.removeChild(e);
    });
  }

  function enVentanas(el) {
    if (el.dataset.velo) return el.querySelectorAll('.velo-i');
    el.dataset.velo = '1';
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    unirPuntuacion(el);
    var piezas = [];
    (function recorrer(nodo) {
      Array.prototype.slice.call(nodo.childNodes).forEach(function (h) {
        if (h.nodeType === 3) {
          var frag = document.createDocumentFragment();
          h.textContent.split(/(\s+)/).forEach(function (p) {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
            var v = document.createElement('span');
            v.className = 'velo-v';
            v.setAttribute('aria-hidden', 'true');
            var i = document.createElement('span');
            i.className = 'velo-i';
            i.textContent = p;
            v.appendChild(i);
            frag.appendChild(v);
            piezas.push(i);
          });
          nodo.replaceChild(frag, h);
        } else if (h.nodeType === 1) recorrer(h);
      });
    })(el);
    return piezas;
  }

  // En el hero se espera a que suba la cortina de apertura.
  var pausa = function (el) { return el.closest('.hero') ? 0.75 : 0; };

  if (M && g) {
    M.registrar('velo', function (el) {
      g.from(enVentanas(el), {
        yPercent: 120, rotate: 4, transformOrigin: '0% 100%', duration: 1.35, ease: 'expo.out', stagger: 0.06, delay: pausa(el),
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      });
    });
    M.registrar('bruma', function (el) {
      g.from(el, {
        y: 26, opacity: 0, filter: 'blur(8px)', duration: 1.5, ease: 'power2.out', delay: 0.2 + pausa(el), clearProps: 'filter',
        scrollTrigger: { trigger: el, start: 'top 90%', once: true },
      });
    });
    M.registrar('cine-hero', function (el) {
      var hero = el.closest('.hero') || el;
      var img = el.querySelector('img');
      if (img) g.fromTo(img, { scale: 1.16 }, { scale: 1.03, duration: 3, ease: 'power3.out', delay: 0.1 });
      // Capas: la imagen baja más lento que la página y el texto se aleja antes.
      g.to(el, { yPercent: 18, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
      var cont = hero.querySelector('.hero-contenido');
      if (cont) g.to(cont, { y: -90, opacity: 0, ease: 'none', scrollTrigger: { trigger: hero, start: '18% top', end: '88% top', scrub: true } });
      var marca = hero.querySelector('.capitulo-marca');
      if (marca) g.from(marca.children, { yPercent: 120, opacity: 0, duration: 1, ease: 'power3.out', stagger: 0.08, delay: 0.9 });
      var desliza = hero.querySelector('.hero-desliza');
      if (desliza) g.from(desliza, { opacity: 0, y: 20, duration: 1.2, delay: 1.6, ease: 'power2.out' });
    });
  }

  // Parallax de capas en cada capítulo: fondo lento, cifra gigante a contramano, rótulo que entra.
  function capas() {
    document.querySelectorAll('main .s').forEach(function (s) {
      var st = { trigger: s, start: 'top bottom', end: 'bottom top', scrub: true };
      var fondo = s.querySelector('.capitulo-fondo');
      if (fondo) g.fromTo(fondo, { yPercent: -7 }, { yPercent: 7, ease: 'none', scrollTrigger: st });
      var gigante = s.querySelector('.capitulo-gigante');
      if (gigante) g.fromTo(gigante, { yPercent: 28 }, { yPercent: -28, ease: 'none', scrollTrigger: Object.assign({}, st) });
      var marca = s.querySelector('.capitulo-marca');
      if (marca) g.from(marca.children, { yPercent: 120, opacity: 0, duration: 1, ease: 'power3.out', stagger: 0.08, scrollTrigger: { trigger: s, start: 'top 72%', once: true } });
    });
  }

  // Luz cálida que sigue al puntero dentro del capítulo bajo el cursor, con un poco de inercia.
  function luz() {
    if (reducido || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    raiz.classList.add('con-luz');
    var px = -1, py = -1, lx = 0, ly = 0, activa = null, corriendo = false;
    function paso() {
      var el = px < 0 ? null : document.elementFromPoint(px, py);
      var s = el && el.closest ? el.closest('main .s, main .hero') : null;
      if (s !== activa) {
        if (activa) activa.classList.remove('luz-activa');
        activa = s;
        if (s) s.classList.add('luz-activa');
      }
      if (!s) { corriendo = false; return; }
      var r = s.getBoundingClientRect();
      var tx = px - r.left, ty = py - r.top;
      lx += (tx - lx) * 0.14;
      ly += (ty - ly) * 0.14;
      s.style.setProperty('--lx', lx.toFixed(1) + 'px');
      s.style.setProperty('--ly', ly.toFixed(1) + 'px');
      if (Math.abs(tx - lx) + Math.abs(ty - ly) > 0.5) requestAnimationFrame(paso);
      else corriendo = false;
    }
    function despertar() { if (!corriendo) { corriendo = true; requestAnimationFrame(paso); } }
    document.addEventListener('pointermove', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      if (px < 0) {
        var s = e.target.closest && e.target.closest('main .s, main .hero');
        if (s) { var r = s.getBoundingClientRect(); lx = e.clientX - r.left; ly = e.clientY - r.top; }
      }
      px = e.clientX; py = e.clientY;
      despertar();
    }, { passive: true });
    window.addEventListener('scroll', function () { if (px >= 0) despertar(); }, { passive: true });
    document.addEventListener('pointerleave', function () { px = -1; if (activa) activa.classList.remove('luz-activa'); activa = null; });
  }

  // Índice de capítulos: marca el capítulo visible y llena el riel según el avance de la página.
  function indice() {
    var nav = document.querySelector('.capitulos');
    if (!nav) return;
    var enlaces = {};
    nav.querySelectorAll('a[data-capitulo]').forEach(function (a) { enlaces[a.dataset.capitulo] = a; });
    var marcar = function (id) {
      if (!enlaces[id]) return;
      Object.keys(enlaces).forEach(function (k) {
        if (k === id) enlaces[k].setAttribute('aria-current', 'true');
        else enlaces[k].removeAttribute('aria-current');
      });
    };
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entradas) {
        entradas.forEach(function (en) { if (en.isIntersecting) marcar(en.target.id); });
      }, { rootMargin: '-45% 0px -50% 0px' });
      document.querySelectorAll('main section[id]').forEach(function (s) { io.observe(s); });
    }
    var pendiente = 0;
    var avance = function () {
      pendiente = 0;
      var max = raiz.scrollHeight - window.innerHeight;
      nav.style.setProperty('--avance', (max > 0 ? Math.min(1, window.scrollY / max) : 0).toFixed(4));
      raiz.classList.toggle('nav-solida', window.scrollY > 24);
    };
    window.addEventListener('scroll', function () { if (!pendiente) pendiente = requestAnimationFrame(avance); }, { passive: true });
    avance();
  }

  function iniciar() {
    indice();
    if (reducido || !g) return;
    capas();
    luz();
  }
  // Igual que movimiento.js: así este arranque queda en cola detrás del suyo.
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else setTimeout(iniciar, 0);
})();
