// Estilo «Inmersivo»: cada sección es un capítulo a pantalla completa.
// Esta plantilla solo añade escenografía (fondo a sangre, numeración, índice de capítulos);
// el contenido sigue saliendo de las piezas comunes y del JSON del negocio.
import { piezas, acciones, iconos, idDe } from '../../secciones.mjs';

// Textos genéricos de interfaz para el índice cuando la sección no trae nombre propio.
const ETIQUETA = {
  cifras: 'En cifras', caracteristicas: 'Lo esencial', pasos: 'El proceso', galeria: 'Galería',
  precios: 'Precios', testimonios: 'Testimonios', preguntas: 'Preguntas', contacto: 'Contacto',
};
// Secciones que ya muestran sus propias imágenes: su fondo es la misma foto, difuminada (ambiente).
const AMBIENTE = ['caracteristicas', 'galeria', 'pasos'];
const MEDIDAS = { cuadrado: [1200, 1200], horizontal: [1200, 800], vertical: [800, 1200] };

const dos = (n) => String(n).padStart(2, '0');
const llano = (s) => String(s ?? '').replace(/\*/g, '').replace(/\s+/g, ' ').trim();
const cache = new WeakMap();

function seccionesVisibles(c) {
  const permitidas = c.e.secciones_permitidas;
  return (c.n.secciones || []).filter((s) => !permitidas || permitidas.includes(s.tipo)).slice(0, c.e.max_secciones || 99);
}

function imagenesPropias(c, s) {
  return [...(s.items || []).map((it) => it.imagen), ...(s.imagenes || [])].filter((k) => k && c.img(k) && !c.img(k).pendiente);
}

// Reparte los capítulos y elige un fondo para cada uno (sin repetir el del capítulo anterior).
function plan(c) {
  if (cache.has(c.n)) return cache.get(c.n);
  // Las imágenes aún pendientes (marcadores) no sirven de fondo a sangre: su rótulo se vería gigante.
  const todas = Object.keys(c.n.imagenes || {}).filter((k) => c.img(k) && !c.img(k).pendiente);
  const delHero = c.n.hero?.imagen && c.img(c.n.hero.imagen) && !c.img(c.n.hero.imagen).pendiente ? c.n.hero.imagen : null;
  const reserva = todas.filter((k) => k !== delHero);
  const caps = [{ id: 'inicio', tipo: 'hero', etiqueta: 'Inicio', fondo: delHero }];
  if (c.n.oferta && c.e.oferta_tras_hero !== false) {
    caps.push({ id: 'oferta', tipo: 'oferta', etiqueta: llano(c.n.oferta.etiqueta) || 'Oferta' });
  }
  for (const s of seccionesVisibles(c)) {
    caps.push({ id: idDe(s), tipo: s.tipo, s, etiqueta: llano(s.menu || s.antetitulo) || ETIQUETA[s.tipo] || 'Capítulo' });
  }
  // Las fotos de tarjetas suelen ser detalles de producto: a sangre se ven raras. Para los fondos
  // nítidos se prefieren escenas (pasos, galería, sueltas) que no salgan en el capítulo vecino.
  const enTarjetas = new Set(seccionesVisibles(c).filter((s) => s.tipo === 'caracteristicas').flatMap((s) => imagenesPropias(c, s)));
  const propiasDe = (k) => (k && k.s ? imagenesPropias(c, k.s) : []);
  const usos = new Map();
  let anterior = delHero;
  caps.forEach((k, i) => {
    k.num = dos(i + 1);
    if (k.tipo === 'hero') return;
    const propias = propiasDe(k);
    if (propias.length && AMBIENTE.includes(k.tipo)) {
      k.fondo = propias[0];
      k.difuso = true;
    } else if (k.tipo === 'contacto' && delHero) {
      k.fondo = delHero; // cierre: vuelve la imagen de apertura
    } else {
      const base = reserva.length ? reserva : todas;
      const vecinas = new Set([...propiasDe(caps[i - 1]), ...propiasDe(caps[i + 1])]);
      const costo = (x) => (usos.get(x) || 0) * 10 + (x === anterior ? 8 : 0) + (enTarjetas.has(x) ? 4 : 0) + (vecinas.has(x) ? 3 : 0);
      const opciones = [...base].sort((a, b) => costo(a) - costo(b));
      k.fondo = opciones[0] || null;
      if (k.fondo) usos.set(k.fondo, (usos.get(k.fondo) || 0) + 1);
    }
    anterior = k.fondo;
  });
  const p = { caps, total: dos(caps.length) };
  cache.set(c.n, p);
  return p;
}

function fondo(c, k) {
  const im = k.fondo && c.img(k.fondo);
  if (!im) return '<div class="capitulo-fondo capitulo-sin-imagen" aria-hidden="true"></div>';
  const [w, h] = MEDIDAS[im.orientacion] || MEDIDAS.horizontal;
  return `<div class="capitulo-fondo${k.difuso ? ' capitulo-difuso' : ''}" aria-hidden="true"><img src="${c.esc(im.src)}" alt="" width="${w}" height="${h}" loading="lazy" decoding="async"></div>`;
}

function marca(k, total) {
  return `<p class="capitulo-marca" aria-hidden="true"><span class="capitulo-rotulo">Capítulo</span><span class="capitulo-cifra">${k.num}</span><span class="capitulo-total">/ ${total}</span></p>`;
}

function escena(c, k) {
  const { total } = plan(c);
  return `${fondo(c, k)}<span class="capitulo-gigante" aria-hidden="true">${k.num}</span>${marca(k, total)}`;
}

export default {
  nav(c) {
    const { caps } = plan(c);
    const indice = `<nav class="capitulos" aria-label="Capítulos"><span class="capitulos-riel" aria-hidden="true"><i></i></span><ol>${caps.map((k) => `<li><a href="#${c.esc(k.id)}" data-capitulo="${c.esc(k.id)}"><span class="capitulos-num">${k.num}</span><span class="capitulos-nombre">${c.esc(k.etiqueta)}</span></a></li>`).join('')}</ol></nav>`;
    return piezas.nav(c) + indice;
  },

  hero(c) {
    const h = c.n.hero;
    const { caps, total } = plan(c);
    const k = caps[0];
    const media = k.fondo ? `<figure class="hero-media"${c.mov('hero')}>${c.imagen(h.imagen, { prioridad: true })}</figure>` : '';
    return `<section class="hero hero-cine${k.fondo ? '' : ' hero-sin-imagen'}" id="inicio">${media}
    ${marca(k, total)}
    <div class="hero-contenido contenedor">
      ${h.antetitulo ? `<p class="antetitulo">${c.fmt(h.antetitulo)}</p>` : ''}
      <h1 class="hero-titulo"${c.mov('titulo')}>${c.fmt(h.titulo)}</h1>
      ${h.subtitulo ? `<p class="hero-sub"${c.mov('texto')}>${c.fmt(h.subtitulo)}</p>` : ''}
      ${acciones(c)}
    </div>
    <p class="hero-desliza" aria-hidden="true"><span>Desliza</span></p>
  </section>`;
  },

  oferta(c) {
    const o = c.n.oferta;
    if (!o) return '';
    const k = plan(c).caps.find((x) => x.tipo === 'oferta');
    return `<section class="s s-oferta" id="oferta"><div class="contenedor">${k ? escena(c, k) : ''}<div class="oferta"${c.mov('tarjeta')}>
      ${o.etiqueta ? `<p class="oferta-etiqueta">${c.esc(o.etiqueta)}</p>` : ''}
      <h2 class="oferta-titulo"${c.mov('titulo')}>${c.fmt(o.titulo)}</h2>
      <p class="oferta-precio"><b>${c.esc(o.precio)}</b>${o.antes ? ` <s>${c.esc(o.antes)}</s>` : ''}</p>
      ${o.detalle ? `<p class="oferta-detalle">${c.fmt(o.detalle)}</p>` : ''}
      ${o.vigencia ? `<p class="oferta-vigencia">${c.esc(o.vigencia)}</p>` : ''}
      <a class="boton boton-primario" href="${c.esc(c.wa(o.mensaje || `Hola, quiero la oferta «${o.titulo}».`))}">${iconos.chat}<span>${c.esc(o.cta || 'La quiero')}</span></a>
    </div></div></section>`;
  },

  // La cabecera de cada sección también monta su escena: fondo, número de capítulo y cifra gigante.
  cabeza(c, s) {
    const k = plan(c).caps.find((x) => x.s === s);
    return `${k ? escena(c, k) : ''}${piezas.cabeza(c, s)}`;
  },
};
