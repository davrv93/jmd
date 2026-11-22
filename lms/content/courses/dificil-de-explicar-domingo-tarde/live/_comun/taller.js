// taller.js · utilidades comunes del Taller de diseño (dt-02).
// 1) Carga las fuentes con fetch + FontFace: la CSP de las escenas solo admite font-src data:, así que
//    @font-face con url() no funciona. Mientras cargan se ve con Georgia y la sans del sistema.
// 2) Botón de tema claro/oscuro en el folio (recuerda la elección en este navegador).
// Uso: <script src="../../comun/taller.js"></script> y, si hace falta, await Taller.fuentes.
(() => {
  const BASE = '../../comun/';
  const FUENTES = [
    ['Fraunces', 'fuente-fraunces-300_600.woff2', { weight: '300 600', style: 'normal' }],
    ['Fraunces', 'fuente-fraunces-300_600-italica.woff2', { weight: '300 600', style: 'italic' }],
    ['Inter', 'fuente-inter-400.woff2', { weight: '100 900', style: 'normal' }],
    ['IBM Plex Mono', 'fuente-ibm-plex-mono-500.woff2', { weight: '500', style: 'normal' }],
  ];
  const cache = new Map();
  async function cargarFuente(familia, archivo, desc = {}) {
    const clave = familia + '|' + archivo;
    if (!cache.has(clave)) {
      cache.set(clave, (async () => {
        try {
          const r = await fetch(BASE + archivo, { credentials: 'same-origin' });
          if (!r.ok) return false;
          const f = new FontFace(familia, await r.arrayBuffer(), desc);
          await f.load(); document.fonts.add(f); return true;
        } catch (e) { return false; }
      })());
    }
    return cache.get(clave);
  }
  const fuentes = Promise.all(FUENTES.map(([f, a, d]) => cargarFuente(f, a, d)))
    .then(() => document.documentElement.classList.add('tl-fuentes'));

  // tema: respeta el del sistema salvo que el instructor lo cambie aquí
  const raiz = document.documentElement;
  try { const t = localStorage.getItem('taller-tema'); if (t === 'light' || t === 'dark') raiz.dataset.tema = t; } catch (e) {}
  const oscuro = () => raiz.dataset.tema ? raiz.dataset.tema === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  const SOL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/></svg>';
  const LUNA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/></svg>';
  function botonTema() {
    document.querySelectorAll('[data-tl-tema]').forEach((b) => {
      const pintar = () => { const o = oscuro(); b.innerHTML = o ? SOL : LUNA; b.setAttribute('aria-label', o ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'); b.title = b.getAttribute('aria-label'); };
      pintar();
      b.addEventListener('click', () => {
        raiz.dataset.tema = oscuro() ? 'light' : 'dark';
        try { localStorage.setItem('taller-tema', raiz.dataset.tema); } catch (e) {}
        document.querySelectorAll('[data-tl-tema]').forEach((x) => x.dispatchEvent(new Event('tl-pintar')));
        window.dispatchEvent(new Event('tl-tema'));
      });
      b.addEventListener('tl-pintar', pintar);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', botonTema); else botonTema();

  // pasos 1-2-3: marca hecho / ahora / pendiente
  function pasos(lista, actual) {
    const el = typeof lista === 'string' ? document.getElementById(lista) : lista; if (!el) return;
    [...el.children].forEach((li, i) => {
      li.dataset.estado = i < actual ? 'hecho' : i === actual ? 'ahora' : 'pendiente';
      if (i === actual) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
    });
  }

  window.Taller = { fuentes, cargarFuente, oscuro, pasos, BASE };
})();
