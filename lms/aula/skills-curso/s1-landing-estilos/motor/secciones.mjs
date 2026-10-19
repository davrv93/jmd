// HTML semántico común a todos los estilos. Cada estilo cambia el aspecto (CSS), el movimiento
// (data-mov + estilo.js) y, si lo necesita, reemplaza alguna pieza desde su plantillas.mjs.
// Clases estables: .nav .hero .hero-titulo .s .s-<tipo> .tarjeta .paso .plan .boton… (ver ESTILOS.md)

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
// *texto* → <em>texto</em> (cada estilo decide cómo resaltarlo)
export const fmt = (s) => esc(s).replace(/\*([^*]+)\*/g, '<em>$1</em>');

const MEDIDAS = { cuadrado: [1200, 1200], horizontal: [1200, 800], vertical: [800, 1200] };

export function crearContexto({ negocio, estilo, img }) {
  const n = negocio;
  const mov = (rol) => (estilo.mov && estilo.mov[rol] ? ` data-mov="${esc(estilo.mov[rol])}"` : '');
  const wa = (mensaje) => {
    const num = n.negocio.whatsapp;
    if (!num) return n.negocio.correo ? `mailto:${n.negocio.correo}` : '#contacto';
    const texto = mensaje || n.hero?.cta?.mensaje || `Hola, vi la página de ${n.negocio.nombre} y quiero más información.`;
    return `https://wa.me/${num}?text=${encodeURIComponent(texto)}`;
  };
  const imagen = (clave, { clase = '', prioridad = false, extra = '' } = {}) => {
    const im = img(clave);
    if (!im) return '';
    const [w, h] = MEDIDAS[im.orientacion] || MEDIDAS.horizontal;
    const carga = prioridad ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"';
    return `<img class="${esc(clase)}${im.pendiente ? ' img-pendiente' : ''}" src="${esc(im.src)}" alt="${esc(im.alt)}" width="${w}" height="${h}" ${carga} decoding="async"${extra}>`;
  };
  return { n, e: estilo, img, imagen, mov, wa, esc, fmt };
}

const icono = {
  chat: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 3C6.9 3 3 6.6 3 11c0 2 .8 3.8 2.2 5.2L4.5 21l4.4-1.6c1 .4 2 .6 3.1.6 5.1 0 9-3.6 9-8s-3.9-9-9-9Zm-3.2 9.3a1.3 1.3 0 1 1 0-2.6 1.3 1.3 0 0 1 0 2.6Zm3.2 0a1.3 1.3 0 1 1 0-2.6 1.3 1.3 0 0 1 0 2.6Zm3.2 0a1.3 1.3 0 1 1 0-2.6 1.3 1.3 0 0 1 0 2.6Z"/></svg>',
  flecha: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M5 12h14m-6-6 6 6-6 6"/></svg>',
};
export const iconos = icono;

export function acciones(c, { cta = c.n.hero?.cta, cta2 = c.n.hero?.cta2 } = {}) {
  const a = [];
  if (cta) a.push(`<a class="boton boton-primario" href="${c.esc(c.wa(cta.mensaje))}">${icono.chat}<span>${c.esc(cta.texto || 'Escríbenos')}</span></a>`);
  if (cta2) a.push(`<a class="boton boton-secundario" href="${c.esc(cta2.ancla || '#contacto')}"><span>${c.esc(cta2.texto)}</span>${icono.flecha}</a>`);
  return a.length ? `<div class="acciones">${a.join('')}</div>` : '';
}

export function textoHero(c) {
  const h = c.n.hero;
  return `${h.antetitulo ? `<p class="antetitulo">${c.fmt(h.antetitulo)}</p>` : ''}
      <h1 class="hero-titulo"${c.mov('titulo')}>${c.fmt(h.titulo)}</h1>
      ${h.subtitulo ? `<p class="hero-sub"${c.mov('texto')}>${c.fmt(h.subtitulo)}</p>` : ''}
      ${acciones(c)}`;
}

export const piezas = {
  nav(c) {
    const enlaces = (c.n.secciones || []).filter((s) => s.menu).slice(0, 4)
      .map((s) => `<a href="#${c.esc(idDe(s))}">${c.esc(s.menu)}</a>`).join('');
    const cta = c.n.hero?.cta;
    return `<header class="nav"><div class="nav-dentro contenedor">
    <a class="nav-logo" href="#inicio">${c.esc(c.n.marca?.logo_texto || c.n.negocio.nombre)}</a>
    ${enlaces ? `<nav class="nav-enlaces" aria-label="Secciones">${enlaces}</nav>` : ''}
    ${cta ? `<a class="boton boton-primario boton-chico nav-cta" href="${c.esc(c.wa(cta.mensaje))}">${c.esc(cta.corto || 'Escríbenos')}</a>` : ''}
  </div></header>`;
  },

  hero(c) {
    const v = c.e.hero || 'centro';
    const media = c.n.hero.imagen ? `<figure class="hero-media"${c.mov('hero')}>${c.imagen(c.n.hero.imagen, { prioridad: true })}</figure>` : '';
    if (v === 'pantalla') {
      return `<section class="hero hero-pantalla" id="inicio">${media}<div class="hero-contenido contenedor">${textoHero(c)}</div></section>`;
    }
    if (v === 'dividido') {
      return `<section class="hero hero-dividido" id="inicio"><div class="contenedor hero-rejilla"><div class="hero-contenido">${textoHero(c)}</div>${media}</div></section>`;
    }
    return `<section class="hero hero-centro" id="inicio"><div class="hero-contenido contenedor">${textoHero(c)}</div>${media}</section>`;
  },

  oferta(c) {
    const o = c.n.oferta;
    if (!o) return '';
    return `<section class="s s-oferta" id="oferta"><div class="contenedor"><div class="oferta"${c.mov('tarjeta')}>
      ${o.etiqueta ? `<p class="oferta-etiqueta">${c.esc(o.etiqueta)}</p>` : ''}
      <h2 class="oferta-titulo">${c.fmt(o.titulo)}</h2>
      <p class="oferta-precio"><b>${c.esc(o.precio)}</b>${o.antes ? ` <s>${c.esc(o.antes)}</s>` : ''}</p>
      ${o.detalle ? `<p class="oferta-detalle">${c.fmt(o.detalle)}</p>` : ''}
      ${o.vigencia ? `<p class="oferta-vigencia">${c.esc(o.vigencia)}</p>` : ''}
      <a class="boton boton-primario" href="${c.esc(c.wa(o.mensaje || `Hola, quiero la oferta «${o.titulo}».`))}">${icono.chat}<span>${c.esc(o.cta || 'La quiero')}</span></a>
    </div></div></section>`;
  },

  cabeza(c, s) {
    if (!s.titulo && !s.texto) return '';
    return `<header class="s-cabeza">${s.antetitulo ? `<p class="s-ante">${c.esc(s.antetitulo)}</p>` : ''}
      ${s.titulo ? `<h2 class="s-titulo"${c.mov('titulo')}>${c.fmt(s.titulo)}</h2>` : ''}
      ${s.texto ? `<p class="s-texto"${c.mov('texto')}>${c.fmt(s.texto)}</p>` : ''}</header>`;
  },

  cifras(c, s) {
    return `<ul class="cifras"${c.mov('grupo')}>${(s.items || []).map((it) => `<li class="cifra">
      <b class="cifra-valor" data-contar>${c.esc(it.valor)}</b>${it.unidad ? `<span class="cifra-unidad">${c.esc(it.unidad)}</span>` : ''}
      <p class="cifra-texto">${c.fmt(it.texto)}</p></li>`).join('')}</ul>`;
  },

  caracteristicas(c, s) {
    const items = s.items || [];
    return `<ul class="tarjetas tarjetas-${items.length}"${c.mov('grupo')}>${items.map((it, i) => `<li class="tarjeta${it.imagen ? ' tarjeta-con-imagen' : ''}${i === 0 ? ' tarjeta-primera' : ''}">
      ${it.imagen ? `<figure class="tarjeta-media"${c.mov('imagen')}>${c.imagen(it.imagen)}</figure>` : ''}
      <div class="tarjeta-texto">${it.etiqueta ? `<p class="tarjeta-etiqueta">${c.esc(it.etiqueta)}</p>` : ''}<h3>${c.fmt(it.titulo)}</h3>${it.texto ? `<p>${c.fmt(it.texto)}</p>` : ''}</div>
    </li>`).join('')}</ul>`;
  },

  pasos(c, s) {
    const items = s.items || [];
    const medios = items.some((it) => it.imagen)
      ? `<div class="pasos-medios">${items.map((it, i) => `<figure class="paso-media" data-paso="${i}">${c.imagen(it.imagen)}</figure>`).join('')}</div>` : '';
    return `<div class="pasos${medios ? ' pasos-con-medios' : ''}"${c.mov('pasos')}>${medios}
      <ol class="pasos-lista">${items.map((it, i) => `<li class="paso" data-paso="${i}"><span class="paso-num">${String(i + 1).padStart(2, '0')}</span><h3>${c.fmt(it.titulo)}</h3>${it.texto ? `<p>${c.fmt(it.texto)}</p>` : ''}</li>`).join('')}</ol></div>`;
  },

  galeria(c, s) {
    const fotos = (s.imagenes || []).map((k) => ({ k, im: c.img(k) })).filter((x) => x.im);
    return `<div class="galeria"${c.mov('galeria')}><ul class="galeria-pista">${fotos.map(({ k, im }) => `<li class="galeria-item">
      <figure>${c.imagen(k)}${im.alt ? `<figcaption>${c.esc(im.alt)}</figcaption>` : ''}</figure></li>`).join('')}</ul></div>`;
  },

  precios(c, s) {
    return `<ul class="planes"${c.mov('grupo')}>${(s.planes || []).map((p) => `<li class="plan${p.destacado ? ' plan-destacado' : ''}">
      ${p.destacado ? `<p class="plan-sello">${c.esc(p.sello || 'El más pedido')}</p>` : ''}
      <h3 class="plan-nombre">${c.esc(p.nombre)}</h3>
      <p class="plan-precio"><b>${c.esc(p.precio)}</b>${p.periodo ? `<span>${c.esc(p.periodo)}</span>` : ''}</p>
      ${p.detalle ? `<p class="plan-detalle">${c.fmt(p.detalle)}</p>` : ''}
      ${p.items?.length ? `<ul class="plan-items">${p.items.map((x) => `<li>${c.fmt(x)}</li>`).join('')}</ul>` : ''}
      <a class="boton ${p.destacado ? 'boton-primario' : 'boton-secundario'}" href="${c.esc(c.wa(`Hola, me interesa «${p.nombre}».`))}"><span>${c.esc(p.cta || 'Lo quiero')}</span></a>
    </li>`).join('')}</ul>`;
  },

  testimonios(c, s) {
    return `<ul class="testimonios"${c.mov('grupo')}>${(s.items || []).filter((t) => t.real).map((t) => `<li class="testimonio">
      <blockquote><p>${c.fmt(t.texto)}</p></blockquote><p class="testimonio-autor"><b>${c.esc(t.autor)}</b>${t.detalle ? ` · ${c.esc(t.detalle)}` : ''}</p></li>`).join('')}</ul>`;
  },

  preguntas(c, s) {
    return `<div class="preguntas">${(s.items || []).map((q) => `<details class="pregunta"><summary>${c.esc(q.pregunta)}</summary><p>${c.fmt(q.respuesta)}</p></details>`).join('')}</div>`;
  },

  contacto(c, s) {
    const n = c.n.negocio;
    const datos = [
      n.telefono && ['Teléfono', `<a href="tel:+${c.esc(n.whatsapp || '')}">${c.esc(n.telefono)}</a>`],
      n.correo && ['Correo', `<a href="mailto:${c.esc(n.correo)}">${c.esc(n.correo)}</a>`],
      n.direccion && ['Dirección', `<a href="https://maps.google.com/?q=${encodeURIComponent(n.direccion + (n.ciudad ? ', ' + n.ciudad : ''))}" rel="noopener">${c.esc(n.direccion)}</a>`],
      n.horario && ['Horario', c.esc(n.horario)],
    ].filter(Boolean);
    return `<div class="contacto"${c.mov('tarjeta')}>
      <a class="boton boton-primario boton-grande" href="${c.esc(c.wa())}">${icono.chat}<span>${c.esc(s.cta || 'Escríbenos por WhatsApp')}</span></a>
      ${datos.length ? `<dl class="contacto-datos">${datos.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>` : ''}
    </div>`;
  },

  pie(c) {
    const n = c.n.negocio;
    return `<footer class="pie"><div class="contenedor pie-dentro">
      <p class="pie-nombre">${c.esc(n.nombre)}${n.ciudad ? ` · ${c.esc(n.ciudad)}` : ''}</p>
      <p class="pie-credito">Hecho con JMD · estilo ${c.esc(c.e.nombre)}</p></div></footer>`;
  },

  flotante(c) {
    if (!c.n.negocio.whatsapp) return '';
    return `<a class="wa-flotante" href="${c.esc(c.wa())}" aria-label="Escribir por WhatsApp">${icono.chat}</a>`;
  },
};

export function idDe(s) {
  return s.id || s.tipo;
}

export function seccion(c, s, P) {
  const cuerpo = P[s.tipo] ? P[s.tipo](c, s) : '';
  return `<section class="s s-${c.esc(s.tipo)}${s.fondo ? ' s-fondo-' + c.esc(s.fondo) : ''}" id="${c.esc(idDe(s))}"><div class="contenedor">
    ${P.cabeza(c, s)}${cuerpo}</div></section>`;
}

export function pagina({ negocio, estilo, img, plantillas = {} }) {
  const c = crearContexto({ negocio, estilo, img });
  const P = { ...piezas, ...plantillas };
  const n = negocio;
  const permitidas = estilo.secciones_permitidas;
  const lista = (n.secciones || []).filter((s) => !permitidas || permitidas.includes(s.tipo)).slice(0, estilo.max_secciones || 99);
  const marca = n.marca?.primario || n.marca?.acento
    ? `<style>:root{${n.marca.primario ? `--marca:${c.esc(n.marca.primario)};` : ''}${n.marca.acento ? `--marca-acento:${c.esc(n.marca.acento)};` : ''}}</style>` : '';
  const desc = n.hero?.subtitulo || n.negocio.lema || '';
  const scripts = estilo.sin_js ? '' : `
  <script src="recursos/gsap.min.js" defer></script>
  <script src="recursos/ScrollTrigger.min.js" defer></script>
  <script src="recursos/movimiento.js" defer></script>`;
  const extra = estilo.tiene_js ? '\n  <script src="recursos/estilo.js" defer></script>' : '';
  return `<!doctype html>
<html lang="es" data-estilo="${c.esc(estilo.id)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${c.esc(n.negocio.nombre)}${n.negocio.lema ? ' · ' + c.esc(n.negocio.lema) : ''}</title>
  <meta name="description" content="${c.esc(String(desc).replace(/\*/g, ''))}">
  <meta property="og:title" content="${c.esc(n.negocio.nombre)}">
  <meta property="og:description" content="${c.esc(String(desc).replace(/\*/g, ''))}">
  ${n.hero.imagen && img(n.hero.imagen) ? `<meta property="og:image" content="${c.esc(img(n.hero.imagen).src)}">` : ''}
  ${estilo.color_tema ? `<meta name="theme-color" content="${c.esc(estilo.color_tema)}">` : ''}
  ${estilo.fuentes && /^https?:/.test(estilo.fuentes) ? `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  ` : ''}${estilo.fuentes ? `<link rel="stylesheet" href="${c.esc(estilo.fuentes)}">` : ''}
  <link rel="stylesheet" href="recursos/base.css">
  <link rel="stylesheet" href="recursos/estilo.css">
  ${marca}
</head>
<body class="e-${c.esc(estilo.id)}${estilo.intro ? ' con-intro' : ''}">
  <a class="saltar" href="#contenido">Saltar al contenido</a>
  ${P.nav(c)}
  <main id="contenido">
    ${P.hero(c)}
    ${estilo.oferta_tras_hero !== false ? P.oferta(c) : ''}
    ${lista.map((s) => (P.seccion || seccion)(c, s, P)).join('\n    ')}
  </main>
  ${P.pie(c)}
  ${P.flotante(c)}${scripts}${extra}
</body>
</html>
`;
}
