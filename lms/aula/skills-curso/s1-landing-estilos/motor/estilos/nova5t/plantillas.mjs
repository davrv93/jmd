// Estilo «nova 5T»: hero propio tipo vitrina.
// Texto a la izquierda con un selector de color (3 muestras) y, a la derecha, una tarjeta de vidrio
// con degradado —como la espalda de un teléfono— que lleva la imagen, la «cámara perforada» en la
// esquina, un brillo y dos orbes. Mismo marcado estable que el hero común.
// El selector nace oculto (hidden): estilo.js lo muestra solo si puede hacerlo funcionar.
import { acciones } from '../../secciones.mjs';

const TEMAS = [
  ['aurora', 'Aurora: violeta, azul y rosa'],
  ['ocaso', 'Ocaso: rosa, naranja y violeta'],
  ['laguna', 'Laguna: turquesa, azul y violeta'],
];

function selector() {
  return `<div class="temas" hidden>
        <span class="temas-etiqueta" id="temas-etiqueta">Elige tu color</span>
        <div class="temas-botones" role="group" aria-labelledby="temas-etiqueta">${TEMAS.map(([id, nombre], i) =>
          `<button type="button" class="tema tema-${id}" data-tema="${id}" aria-pressed="${i === 0}" aria-label="${nombre}"><span aria-hidden="true"></span></button>`).join('')}</div>
      </div>`;
}

export default {
  hero(c) {
    const h = c.n.hero;
    const tarjeta = h.imagen && c.img(h.imagen)
      ? `<div class="hero-tarjeta">
        <figure class="hero-media"${c.mov('hero')}>${c.imagen(h.imagen, { prioridad: true })}</figure>
        <span class="hero-camara" aria-hidden="true"></span>
        <span class="hero-brillo" aria-hidden="true"></span>
        <span class="hero-orbe hero-orbe-1" aria-hidden="true"></span>
        <span class="hero-orbe hero-orbe-2" aria-hidden="true"></span>
      </div>`
      : '<div class="hero-tarjeta hero-tarjeta-vacia" aria-hidden="true"><span class="hero-camara"></span><span class="hero-brillo"></span></div>';
    return `<section class="hero hero-vitrina" id="inicio">
    <div class="contenedor hero-rejilla">
      <div class="hero-contenido">
        ${h.antetitulo ? `<p class="antetitulo">${c.fmt(h.antetitulo)}</p>` : ''}
        <h1 class="hero-titulo"${c.mov('titulo')}>${c.fmt(h.titulo)}</h1>
        ${h.subtitulo ? `<p class="hero-sub"${c.mov('texto')}>${c.fmt(h.subtitulo)}</p>` : ''}
        ${acciones(c)}
        ${selector()}
      </div>
      ${tarjeta}
    </div>
  </section>`;
  },
};
