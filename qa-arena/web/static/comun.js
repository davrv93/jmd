// Comunes de QA Arena: avatar de cómic determinista por nombre, SSE con respaldo de sondeo, onomatopeyas.
(function () {
  const PIEL = ['#f6c8a0', '#e0a070', '#b57a4b', '#8d5a33', '#f9dcc4', '#6b4226'];
  const COLOR = ['#f7b500', '#ff4b3e', '#2f6df6', '#19b36b', '#9b59b6', '#ff8c00', '#00b8d9', '#e91e63'];
  const PELO = ['#15120f', '#5a3b1e', '#f0d060', '#c0392b', '#ffffff', '#2c7be5'];

  function hash(s) { let h = 2166136261; for (const c of String(s)) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619) >>> 0; } return h; }

  // avatarSVG: cabeza, antifaz con ojos, pelo (3 estilos), boca y un fondo de ráfaga. Mismo nombre → mismo héroe.
  function avatarSVG(nombre) {
    const h = hash(nombre.toLowerCase());
    const piel = PIEL[h % PIEL.length], fondo = COLOR[(h >> 3) % COLOR.length], mask = COLOR[(h >> 7) % COLOR.length], pelo = PELO[(h >> 11) % PELO.length];
    const estilo = (h >> 15) % 3, boca = (h >> 18) % 3;
    const pelos = [
      `<path d="M18 30 Q32 6 46 30 L44 24 Q32 14 20 24 Z" fill="${pelo}" stroke="#15120f" stroke-width="2.5"/>`,
      `<path d="M16 32 L22 12 L30 26 L36 8 L42 26 L50 14 L48 32 Z" fill="${pelo}" stroke="#15120f" stroke-width="2.5" stroke-linejoin="round"/>`,
      `<path d="M14 34 Q20 10 32 12 Q46 8 50 34 L46 30 Q40 20 32 22 Q22 20 18 32 Z" fill="${pelo}" stroke="#15120f" stroke-width="2.5"/>`,
    ][estilo];
    const bocas = [
      '<path d="M26 46 Q32 52 38 46" fill="none" stroke="#15120f" stroke-width="2.5" stroke-linecap="round"/>',
      '<path d="M25 45 Q32 55 39 45 Z" fill="#fff" stroke="#15120f" stroke-width="2.5"/>',
      '<path d="M27 48 L37 48" stroke="#15120f" stroke-width="3" stroke-linecap="round"/>',
    ][boca];
    return `<svg viewBox="0 0 64 64" role="img" aria-label="Héroe de ${nombre}">
      <polygon points="32,2 38,14 51,8 46,21 62,24 50,33 60,45 46,43 46,58 35,50 32,62 29,50 18,58 18,43 4,45 14,33 2,24 18,21 13,8 26,14" fill="${fondo}" stroke="#15120f" stroke-width="2"/>
      <circle cx="32" cy="36" r="17" fill="${piel}" stroke="#15120f" stroke-width="2.5"/>
      ${pelos}
      <path d="M15 34 Q32 28 49 34 L48 41 Q32 36 16 41 Z" fill="${mask}" stroke="#15120f" stroke-width="2.5"/>
      <ellipse cx="25" cy="37" rx="3.4" ry="2.6" fill="#fff" stroke="#15120f" stroke-width="1.5"/><circle cx="25.6" cy="37.3" r="1.3" fill="#15120f"/>
      <ellipse cx="39" cy="37" rx="3.4" ry="2.6" fill="#fff" stroke="#15120f" stroke-width="1.5"/><circle cx="39.6" cy="37.3" r="1.3" fill="#15120f"/>
      ${bocas}
    </svg>`;
  }

  // vivo: escucha api/eventos (SSE); si no llega nada en 25 s, sondea api/estado cada 3 s.
  function vivo(alEstado) {
    let ultimo = Date.now(), es = null, sondeo = null;
    const sondear = async () => { try { const r = await fetch('api/estado', { cache: 'no-store' }); if (r.ok) alEstado(await r.json()); } catch { } };
    const abrir = () => {
      try { es = new EventSource('api/eventos'); } catch { return; }
      es.addEventListener('estado', (e) => { ultimo = Date.now(); try { alEstado(JSON.parse(e.data)); } catch { } });
      es.onerror = () => { es.close(); setTimeout(abrir, 3000); };
    };
    abrir();
    sondeo = setInterval(() => { if (Date.now() - ultimo > 25000) sondear(); }, 3000);
    sondear();
    return () => { es && es.close(); clearInterval(sondeo); };
  }

  function onoma(texto, clase, x, y) {
    const d = document.createElement('div');
    d.className = 'onoma ' + (clase || '');
    d.innerHTML = '<span class="burst"></span>' + texto;
    d.style.left = (x ?? 20 + Math.random() * 50) + '%';
    d.style.top = (y ?? 15 + Math.random() * 50) + '%';
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 1400);
  }

  function hora(iso) { try { return new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Lima' }); } catch { return ''; } }
  const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  window.Arena = { avatarSVG, vivo, onoma, hora, esc };
})();
