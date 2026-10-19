// Express: todo en una pantalla. El hero absorbe la oferta, las tres primeras razones y el contacto.
import { acciones, iconos } from '../../secciones.mjs';

export default {
  nav(c) {
    const n = c.n.negocio;
    return `<header class="nav"><div class="nav-dentro contenedor">
      <a class="nav-logo" href="#inicio">${c.esc(c.n.marca?.logo_texto || n.nombre)}</a>
      ${n.telefono ? `<a class="nav-tel" href="tel:+${c.esc(n.whatsapp || '')}">${c.esc(n.telefono)}</a>` : ''}
    </div></header>`;
  },

  hero(c) {
    const h = c.n.hero, o = c.n.oferta, n = c.n.negocio;
    const razones = (c.n.secciones || []).find((s) => s.tipo === 'caracteristicas')?.items?.slice(0, 3) || [];
    const datos = [n.horario, n.direccion].filter(Boolean);
    const cta = { ...(h.cta || {}), texto: (o && o.cta) || h.cta?.texto || 'Escríbenos', mensaje: (o && o.mensaje) || h.cta?.mensaje };
    return `<section class="hero hero-express" id="inicio"><div class="contenedor ex-rejilla">
      <div class="ex-texto">
        ${h.antetitulo || n.rubro ? `<p class="antetitulo">${c.fmt(h.antetitulo || n.rubro)}</p>` : ''}
        <h1 class="hero-titulo">${c.fmt(h.titulo)}</h1>
        ${h.subtitulo ? `<p class="hero-sub">${c.fmt(h.subtitulo)}</p>` : ''}
        ${o ? `<div class="ex-oferta">
          ${o.etiqueta ? `<p class="oferta-etiqueta">${c.esc(o.etiqueta)}</p>` : ''}
          <p class="oferta-titulo">${c.fmt(o.titulo)}</p>
          <p class="oferta-precio"><b>${c.esc(o.precio)}</b>${o.antes ? `<s>${c.esc(o.antes)}</s>` : ''}</p>
          ${o.detalle ? `<p class="oferta-detalle">${c.fmt(o.detalle)}</p>` : ''}
          ${o.vigencia ? `<p class="oferta-vigencia">${c.esc(o.vigencia)}</p>` : ''}
        </div>` : ''}
        ${acciones(c, { cta, cta2: null })}
        ${razones.length ? `<ul class="ex-razones">${razones.map((r) => `<li>${c.fmt(r.titulo)}</li>`).join('')}</ul>` : ''}
        ${datos.length ? `<p class="ex-datos">${datos.map((d) => c.esc(d)).join(' · ')}</p>` : ''}
      </div>
      ${h.imagen ? `<figure class="hero-media">${c.imagen(h.imagen, { prioridad: true })}</figure>` : ''}
    </div></section>
    ${n.whatsapp ? `<a class="ex-barra" href="${c.esc(c.wa(cta.mensaje))}">${iconos.chat}<span>${c.esc(cta.texto)}</span></a>` : ''}`;
  },

  pie(c) {
    return `<footer class="pie"><div class="contenedor pie-dentro"><p class="pie-nombre">${c.esc(c.n.negocio.nombre)}</p><p class="pie-credito">Hecho con JMD · estilo Express</p></div></footer>`;
  },

  flotante() { return ''; },
};
