// Estilo «iPad»: el hero monta un dispositivo genérico en CSS 3D (dispositivo.mjs) cuya pantalla
// muestra la imagen del hero. El efecto «despliegue» (estilo.js) lo abre con el scroll.
import { acciones } from '../../secciones.mjs';
import { dispositivo } from './dispositivo.mjs';

export { dispositivo };

export default {
  hero(c) {
    const h = c.n.hero;
    const pantalla = h.imagen && c.img(h.imagen)
      ? `<figure class="hero-media">${c.imagen(h.imagen, { prioridad: true })}</figure>`
      : '';
    // .hero-contenido usa display: contents en CSS: sus hijos se ordenan alrededor del dispositivo.
    return `<section class="hero hero-dispositivo" id="inicio">
    <div class="hero-escena"${c.mov('hero')}>
      <div class="hero-contenido contenedor">
        ${h.antetitulo ? `<p class="antetitulo">${c.fmt(h.antetitulo)}</p>` : ''}
        <h1 class="hero-titulo" data-desp="titulo">${c.fmt(h.titulo)}</h1>
        ${h.subtitulo ? `<p class="hero-sub" data-desp="pie">${c.fmt(h.subtitulo)}</p>` : ''}
        ${acciones(c).replace('<div class="acciones">', '<div class="acciones" data-desp="pie">')}
      </div>
      <div class="hero-producto">${dispositivo({ pantalla, flotante: c.e.flotante !== false })}</div>
      <p class="hero-pista" data-desp="pista" aria-hidden="true">Desliza para abrir</p>
    </div>
  </section>`;
  },
};
