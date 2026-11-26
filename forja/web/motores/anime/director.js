// Forja · Anime Battle Engine · Cinematic Director (§12), con timelines de Anime.js 4.5.0.
// La cinemática se declara en datos (personajes.js → CINEMATICAS): pistas de cámara (zoom, foco, ease), tramos en
// cámara lenta, retrato, fondo, texto y eventos con tiempo. Reglas de sincronía:
//   · El timeline de Anime.js se crea con autoplay: false y NUNCA corre solo: el bucle del juego llama avanzar(dt) con
//     el tiempo de SIMULACIÓN y el director hace timeline.seek(t). Pausar = no avanzar; cámara lenta = avanzar menos.
//   · Anime.js mueve solo la cámara y la presentación (objeto `cam`). Los eventos de juego ('impacto', 'fin') van en
//     una lista propia con id, en orden, y se despachan una sola vez: medido en Node, timeline.call() vuelve a disparar
//     sus callbacks al retroceder con seek(), así que no sirve como fuente de verdad del daño.
//   · omitir() despacha lo pendiente en orden y salta al final: el combate recibe exactamente los mismos impactos.
import { createTimeline } from '../../vendor/anime.esm.min.js';

export function crearDirector(combate, { cinematicas = {}, acc = null, alEvento = () => {} } = {}) {
  const cam = { zoom: 1, foco: 0, alto: 0, oscuro: 0, retrato: 0, fondo: 0, texto: 0, sacudida: 0 };
  let actual = null;
  const d = {
    cam, get activa() { return !!actual; }, get actual() { return actual; },
    // id de la cinemática; ctx: { atacante, objetivo } (luchadores) — o null para escenas sin combate (despertar del jefe)
    iniciar(id, ctx = {}, alTerminar = null) {
      const def = cinematicas[id]; if (!def) { alTerminar?.(); return false; }
      const xA = ctx.atacante?.x ?? 0, xO = ctx.objetivo?.x ?? 0, focos = { atacante: xA, objetivo: xO, medio: (xA + xO) / 2 };
      const reducir = acc?.reducirMovimiento;
      cam.zoom = 1; cam.foco = focos.medio; cam.oscuro = 0; cam.retrato = 0; cam.fondo = 0; cam.texto = 0; cam.sacudida = 0;
      const tl = createTimeline({ autoplay: false, defaults: { ease: 'outQuad' } });
      for (const p of def.camara || []) tl.add(cam, { zoom: reducir ? 1 + (p.zoom - 1) * 0.3 : p.zoom, foco: focos[p.foco] ?? focos.medio, duration: p.dur, ease: p.ease || 'inOutQuad' }, p.t);
      tl.add(cam, { oscuro: [0, 0.75], fondo: [0, 1], duration: 260 }, 0).add(cam, { oscuro: 0, fondo: 0, duration: 300 }, Math.max(0, def.duracion - 320));
      if (def.retrato) tl.add(cam, { retrato: [{ to: 1, duration: 160 }, { to: 1, duration: def.retrato.dur - 320 }, { to: 0, duration: 160 }] }, def.retrato.t);
      tl.add(cam, { texto: [{ to: 1, duration: 200 }, { to: 1, duration: 700 }, { to: 0, duration: 200 }] }, 120);
      tl.seek(0);
      actual = { id, def, tl, t: 0, hechos: new Set(), ctx, alTerminar, eventos: [...def.eventos].map((e, i) => ({ ...e, n: i })).sort((a, b) => a.t - b.t || a.n - b.n) };
      alEvento({ tipo: 'cineInicio', id, texto: def.texto, color: def.color, fondo: def.fondo });
      return true;
    },
    // factor de cámara lenta del tramo actual (los tramos alargan el tiempo real, no cambian el tiempo de simulación)
    get lento() { if (!actual) return 1; for (const l of actual.def.lento || []) if (actual.t >= l.t && actual.t < l.t + l.dur) return l.escala; return 1; },
    // dtMs: milisegundos de simulación que pasan. Devuelve los eventos despachados en este avance.
    avanzar(dtMs) {
      if (!actual || dtMs <= 0) return [];
      const a = actual; a.t = Math.min(a.def.duracion, a.t + dtMs * d.lento);
      a.tl.seek(a.t);
      return despachar(a.t);
    },
    omitir() { if (!actual) return []; const a = actual; const r = despachar(Infinity); a.tl?.seek(a.def.duracion); return r; },
    get progreso() { return actual ? actual.t / actual.def.duracion : 0; },
  };
  function despachar(hasta) {
    const a = actual, out = [];
    for (const e of a.eventos) {
      if (e.t > hasta || a.hechos.has(e.n)) continue;
      a.hechos.add(e.n); out.push(e);
      if (e.tipo === 'impacto') { if (a.ctx.atacante) combate.impactoCinematica(e.golpe); }
      else if (e.tipo === 'sacudida') cam.sacudida = acc?.reducirMovimiento ? 0 : e.fuerza;
      if (e.tipo === 'fin') { if (a.ctx.atacante) combate.finCinematica(); actual = null; cam.zoom = 1; cam.oscuro = 0; cam.retrato = 0; cam.fondo = 0; cam.texto = 0; alEvento({ tipo: 'cineFin', id: a.id }); a.alTerminar?.(); }
      alEvento({ tipo: 'cine:' + e.tipo, ...e });
      if (!actual) break;
    }
    return out;
  }
  return d;
}
