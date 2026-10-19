// Estilo «Atardecer Neón» (carpeta gta6): piezas de HTML propias.
// · hero: el nombre del negocio, gigante, es una máscara de texto sobre la imagen. El SVG de la máscara
//   sale ya armado aquí; estilo.js solo lo mide, lo encaja y lo escala con el scroll (escritorio).
//   Sin JS, en móvil o con «reducir movimiento» se ve resuelto: imagen completa con el nombre encima.
// · tarjetas como postales/polaroids con cinta adhesiva; pasos como fichas de personaje;
//   oferta como postal con sello; contacto con un atardecer de palmeras.
// Palmeras: siluetas genéricas dibujadas aquí (hojas como foliolos sobre una curva), nada de arte ajeno.
import { piezas, acciones, iconos } from '../../secciones.mjs';

/* ---------- Palmera en silueta (determinista) ---------- */
function palmera(color, { espejo = false, semilla = 1 } = {}) {
  let s = semilla;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const C = [150, 112]; // corona
  const fronda = (cx, cy, tx, ty, largo) => {
    const P = (t) => [(1 - t) ** 2 * C[0] + 2 * (1 - t) * t * (C[0] + cx) + t * t * (C[0] + tx), (1 - t) ** 2 * C[1] + 2 * (1 - t) * t * (C[1] + cy) + t * t * (C[1] + ty)];
    const D = (t) => { const a = [2 * (1 - t) * cx + 2 * t * (tx - cx), 2 * (1 - t) * cy + 2 * t * (ty - cy)]; const m = Math.hypot(a[0], a[1]) || 1; return [a[0] / m, a[1] / m]; };
    let d = '';
    // nervio central afinado
    const izq = [], der = [];
    for (let t = 0; t <= 1.0001; t += 0.1) {
      const [x, y] = P(t), [dx, dy] = D(t), w = 3.2 * (1 - t) + 0.4;
      izq.push(`${(x - dy * w).toFixed(1)} ${(y + dx * w).toFixed(1)}`);
      der.unshift(`${(x + dy * w).toFixed(1)} ${(y - dx * w).toFixed(1)}`);
    }
    d += `M${izq.join(' L')} L${der.join(' L')}Z`;
    // foliolos: cuelgan hacia la punta y un poco hacia abajo
    for (let t = 0.1; t < 0.97; t += 0.055) {
      const [x, y] = P(t), [dx, dy] = D(t);
      const L = largo * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.15)), 0.8) * (0.85 + r() * 0.3);
      for (const lado of [1, -1]) {
        let vx = -dy * lado + dx * 0.75, vy = dx * lado + dy * 0.75 + 0.55;
        const m = Math.hypot(vx, vy); vx /= m; vy /= m;
        const b = 2.6;
        d += `M${(x - dx * b).toFixed(1)} ${(y - dy * b).toFixed(1)} L${(x + vx * L).toFixed(1)} ${(y + vy * L).toFixed(1)} L${(x + dx * b).toFixed(1)} ${(y + dy * b).toFixed(1)}Z`;
      }
    }
    return d;
  };
  const frondas = [
    [-62, -64, -128, 36, 28], [-48, -82, -112, -46, 24], [-12, -92, -46, -104, 20], [26, -96, 62, -98, 20],
    [66, -74, 122, -40, 24], [72, -58, 130, 58, 28], [-34, -18, -74, 96, 24], [34, -20, 80, 98, 24],
  ].map(([a, b, c2, d2, e]) => fronda(a, b, c2, d2, e)).join('');
  const tronco = 'M128 462 C 132 360, 140 250, 145 120 L 156 121 C 154 250, 150 360, 148 462 Z';
  const cocos = '<circle cx="146" cy="124" r="6"/><circle cx="157" cy="126" r="6"/><circle cx="151" cy="133" r="6"/>';
  const g = `<g fill="${color}"${espejo ? ' transform="translate(300 0) scale(-1 1)"' : ''}><path d="${tronco}"/><path d="${frondas}"/>${cocos}</g>`;
  return `<svg class="palmera" viewBox="0 0 300 462" preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false">${g}</svg>`;
}
const PALMA = '#12081f';

// Reparte el nombre en 1–3 líneas lo más parejas posible (para la máscara).
function lineas(nombre) {
  const p = nombre.trim().split(/\s+/);
  const largo = Array.from(nombre).length;
  const L = largo <= 13 || p.length === 1 ? 1 : largo <= 26 || p.length === 2 ? 2 : 3;
  if (L === 1) return [p.join(' ')];
  let mejor = null;
  const medir = (ls) => Math.max(...ls.map((x) => Array.from(x).length));
  for (let i = 1; i < p.length; i++) {
    if (L === 2) { const ls = [p.slice(0, i).join(' '), p.slice(i).join(' ')]; if (!mejor || medir(ls) < medir(mejor)) mejor = ls; continue; }
    for (let j = i + 1; j < p.length; j++) {
      const ls = [p.slice(0, i).join(' '), p.slice(i, j).join(' '), p.slice(j).join(' ')];
      if (!mejor || medir(ls) < medir(mejor)) mejor = ls;
    }
  }
  return mejor || [nombre];
}

function textoMascara(c, ls, extra) {
  return `<text font-family="Anton, Impact, 'Arial Narrow', sans-serif" font-size="100" text-anchor="middle" ${extra}>${ls.map((l, i) => `<tspan x="0" ${i ? 'dy="0.92em"' : 'y="0"'}>${c.esc(l.toUpperCase())}</tspan>`).join('')}</text>`;
}

export default {
  hero(c) {
    const h = c.n.hero;
    const nombre = c.n.marca?.logo_texto || c.n.negocio.nombre;
    const n = Math.max(...nombre.split(/\s+/).map((w) => Array.from(w).length));
    const conImagen = !!(h.imagen && c.img(h.imagen));
    const ls = lineas(nombre); // mismas líneas en la máscara y en el nombre resuelto
    const velo = conImagen ? `<svg class="hero-velo-svg" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1440 900">
      <defs>
        <linearGradient id="hv-cielo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#170a2a"/><stop offset="0.55" stop-color="#24123d"/><stop offset="0.82" stop-color="#4b1858"/><stop offset="1" stop-color="#8c2a6f"/></linearGradient>
        <mask id="hv-mascara" maskUnits="userSpaceOnUse" x="-50000" y="-50000" width="100000" height="100000">
          <rect x="-50000" y="-50000" width="100000" height="100000" fill="#fff"/>
          <g class="hv-zoom"><g class="hv-ajuste" transform="translate(-99999 0)">${textoMascara(c, ls, 'fill="#000"')}</g></g>
        </mask>
      </defs>
      <g mask="url(#hv-mascara)">
        <rect class="hv-fondo" width="1440" height="900" fill="url(#hv-cielo)"/>
        <g class="hv-palmas"><g class="hv-palma-izq">${palmera(PALMA, { semilla: 3 })}</g><g class="hv-palma-der">${palmera(PALMA, { espejo: true, semilla: 9 })}</g></g>
      </g>
      <g class="hv-zoom"><g class="hv-ajuste" transform="translate(-99999 0)">
        ${textoMascara(c, ls, 'fill="none" stroke="#23c9b8" stroke-opacity="0.28" stroke-width="7" vector-effect="non-scaling-stroke"')}
        ${textoMascara(c, ls, 'class="hv-borde" fill="none" stroke="#23c9b8" stroke-width="1.6" vector-effect="non-scaling-stroke"')}
      </g></g>
    </svg>` : '';
    return `<section class="hero hero-mascara${conImagen ? '' : ' hero-sin-imagen'}" id="inicio">
      ${conImagen ? `<figure class="hero-media"${c.mov('hero')}>${c.imagen(h.imagen, { prioridad: true })}</figure>` : ''}
      <div class="hero-velo" aria-hidden="true"></div>
      ${velo}
      <div class="hero-escena contenedor">
        <p class="hero-marca" aria-hidden="true" style="--n:${n};--max:${Math.max(...ls.map((l) => Array.from(l).length))};--lineas:${ls.length}">${ls.map((l) => `<span class="l">${c.esc(l)}</span>`).join(' ')}</p>
        <div class="hero-contenido">
          ${h.antetitulo ? `<p class="antetitulo">${c.fmt(h.antetitulo)}</p>` : ''}
          <h1 class="hero-titulo">${c.fmt(h.titulo)}</h1>
          ${h.subtitulo ? `<p class="hero-sub">${c.fmt(h.subtitulo)}</p>` : ''}
          ${acciones(c)}
        </div>
      </div>
      <p class="hero-desliza" aria-hidden="true"><span>Desliza</span></p>
    </section>`;
  },

  caracteristicas(c, s) {
    const items = s.items || [];
    return `<ul class="tarjetas tarjetas-${items.length}"${c.mov('grupo')}>${items.map((it, i) => `<li class="tarjeta${it.imagen ? ' tarjeta-con-imagen' : ''}${i === 0 ? ' tarjeta-primera' : ''}">
      <span class="cinta-adhesiva" aria-hidden="true"></span>
      ${it.imagen ? `<figure class="tarjeta-media"${c.mov('imagen')}>${c.imagen(it.imagen)}</figure>` : `<span class="postal-sello" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>`}
      <div class="tarjeta-texto">${it.etiqueta ? `<p class="tarjeta-etiqueta">${c.esc(it.etiqueta)}</p>` : ''}<h3>${c.fmt(it.titulo)}</h3>${it.texto ? `<p>${c.fmt(it.texto)}</p>` : ''}</div>
    </li>`).join('')}</ul>`;
  },

  // Fichas de personaje: imagen a sangre, número enorme y el texto abajo.
  pasos(c, s) {
    const items = s.items || [];
    return `<div class="pasos pasos-fichas"${c.mov('pasos')}><ol class="pasos-lista">${items.map((it, i) => `<li class="paso${it.imagen ? ' paso-con-imagen' : ''}" data-paso="${i}">
      ${it.imagen ? `<figure class="paso-media">${c.imagen(it.imagen)}</figure>` : `<span class="paso-fondo" aria-hidden="true">${palmera('rgba(18,8,31,.55)', { semilla: 5 + i })}</span>`}
      <span class="paso-num">${String(i + 1).padStart(2, '0')}</span>
      <div class="paso-texto"><h3>${c.fmt(it.titulo)}</h3>${it.texto ? `<p>${c.fmt(it.texto)}</p>` : ''}</div>
    </li>`).join('')}</ol></div>`;
  },

  oferta(c) {
    const o = c.n.oferta;
    if (!o) return '';
    return `<section class="s s-oferta" id="oferta"><div class="contenedor"><div class="oferta postal"${c.mov('tarjeta')}>
      <div class="postal-frente">
        ${o.etiqueta ? `<p class="oferta-etiqueta">${c.esc(o.etiqueta)}</p>` : ''}
        <h2 class="oferta-titulo">${c.fmt(o.titulo)}</h2>
        <p class="oferta-precio"><b>${c.esc(o.precio)}</b>${o.antes ? ` <s>${c.esc(o.antes)}</s>` : ''}</p>
        ${o.detalle ? `<p class="oferta-detalle">${c.fmt(o.detalle)}</p>` : ''}
        ${o.vigencia ? `<p class="oferta-vigencia">${c.esc(o.vigencia)}</p>` : ''}
        <a class="boton boton-primario" href="${c.esc(c.wa(o.mensaje || `Hola, quiero la oferta «${o.titulo}».`))}">${iconos.chat}<span>${c.esc(o.cta || 'La quiero')}</span></a>
      </div>
      <div class="postal-dorso" aria-hidden="true"><span class="sol"></span><span class="mar"></span>${palmera(PALMA, { semilla: 11 })}${palmera(PALMA, { espejo: true, semilla: 4 })}</div>
    </div></div></section>`;
  },

  contacto(c, s) {
    return `${piezas.contacto(c, s)}
      <div class="atardecer" aria-hidden="true"><span class="sol"></span><span class="mar"></span>
        <span class="palma palma-1">${palmera(PALMA, { semilla: 2 })}</span><span class="palma palma-2">${palmera(PALMA, { semilla: 8 })}</span>
        <span class="palma palma-3">${palmera(PALMA, { espejo: true, semilla: 6 })}</span><span class="palma palma-4">${palmera(PALMA, { espejo: true, semilla: 13 })}</span></div>`;
  },
};
