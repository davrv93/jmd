// Estilo «Huawei»: hero propio tipo escenario.
// El producto (la imagen del hero) flota en la oscuridad con un halo de luz detrás,
// una línea de suelo iluminada y su reflejo debajo. Mismo marcado estable que el hero común:
// section.hero#inicio > .hero-contenido (antetitulo, h1.hero-titulo, hero-sub, acciones) + figure.hero-media > img.
import { acciones } from '../../secciones.mjs';

function textoHero(c) {
  const h = c.n.hero;
  return `${h.antetitulo ? `<p class="antetitulo">${c.fmt(h.antetitulo)}</p>` : ''}
      <h1 class="hero-titulo"${c.mov('titulo')}>${c.fmt(h.titulo)}</h1>
      ${h.subtitulo ? `<p class="hero-sub"${c.mov('texto')}>${c.fmt(h.subtitulo)}</p>` : ''}
      ${acciones(c)}`;
}

export default {
  hero(c) {
    const clave = c.n.hero.imagen;
    const im = clave ? c.img(clave) : null;
    // El reflejo reutiliza el mismo archivo (sin descarga extra) y es decorativo: alt vacío y aria-hidden.
    const escena = im
      ? `<div class="hero-escena">
      <div class="hero-luz" aria-hidden="true"></div>
      <figure class="hero-media"${c.mov('hero')}>${c.imagen(clave, { prioridad: true })}</figure>
      <div class="hero-suelo" aria-hidden="true"></div>
      <div class="hero-reflejo" aria-hidden="true"><img src="${c.esc(im.src)}" alt="" width="1200" height="800" loading="eager" decoding="async"></div>
    </div>`
      : '<div class="hero-escena hero-escena-vacia"><div class="hero-luz" aria-hidden="true"></div></div>';
    return `<section class="hero hero-escenario" id="inicio">
    <div class="hero-contenido contenedor">${textoHero(c)}</div>
    ${escena}
  </section>`;
  },
};
