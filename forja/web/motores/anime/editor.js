// Forja · Anime Battle Engine · paneles del Editor (pestaña «Editor» del diálogo de juegos de Forja).
// Personajes, combos y frame data, hitboxes y animación (vista previa con línea de tiempo de Anime.js que se puede
// arrastrar, y la caja de golpe se mueve con createDraggable), escenario, física, efectos, cámara, audio, IA y jefe.
// Todo produce JSON que valida el esquema (config.js); nada se ejecuta.
import { PERSONAJES } from './personajes.js';
import { JEFES } from './jefe.js';
import { TEMAS } from './render.js';
import { poseDe, dibujarLuchador } from './esqueleto.js';
import { SONIDOS } from '../nucleo/audio.js';
import { sintetizar, sonar } from '../../motor/sonido.js';
import { createTimeline, createDraggable } from '../../vendor/anime.esm.min.js';

const clon = (o) => JSON.parse(JSON.stringify(o));
export function paneles({ id, config, cambiar, el }) {
  const c = clon(config), out = [];
  const guardar = (reiniciar = false) => cambiar(clon(c), { reiniciar });
  const fila = (etq, input) => { const f = el('label', { style: 'display:grid;grid-template-columns:minmax(120px,1fr) 2fr;gap:8px;align-items:center;margin:4px 0;font-size:13px' }, el('span', {}, etq), input); return f; };
  const rango = (v, min, max, paso, alCambiar, fmt = (x) => x) => { const s = el('input', { type: 'range', min, max, step: paso, value: v }); const o = el('output', {}, fmt(v)); s.oninput = () => { o.textContent = fmt(+s.value); }; s.onchange = () => alCambiar(+s.value); return el('span', { style: 'display:flex;gap:8px;align-items:center' }, s, o); };
  const sel = (v, opciones, alCambiar) => { const s = el('select', {}); for (const [k, t] of opciones) s.append(el('option', { value: k, selected: k === v }, t)); s.onchange = () => alCambiar(s.value); return s; };
  const chk = (v, alCambiar) => { const i = el('input', { type: 'checkbox', checked: !!v }); i.onchange = () => alCambiar(i.checked); return i; };
  const colorIn = (v, alCambiar) => { const i = el('input', { type: 'color', value: v || '#888888' }); i.onchange = () => alCambiar(i.value); return i; };
  const quienes = Object.keys(PERSONAJES);
  let quien = c.jugador && PERSONAJES[c.jugador] ? c.jugador : 'ren';
  const per = (k) => (c.personajes ||= {})[k] ||= {};

  // ---- personajes
  { const caja = el('div'); const pintar = () => {
      const p = { ...PERSONAJES[quien], ...per(quien) }, cu = { ...PERSONAJES[quien].cuerpo, ...(per(quien).cuerpo || {}) };
      caja.replaceChildren(
        fila('Personaje', sel(quien, quienes.map((k) => [k, PERSONAJES[k].nombre]), (v) => { quien = v; pintar(); pintarFD(); pintarAnim(); })),
        fila('Nombre', Object.assign(el('input', { value: p.nombre, maxlength: 40 }), { onchange(e) { per(quien).nombre = e.target.value.replace(/[<>{}]/g, '').slice(0, 40) || PERSONAJES[quien].nombre; guardar(true); } })),
        ...[['salud', 'Vida', 300, 3000, 10], ['velocidad', 'Velocidad', 1, 9, 0.1], ['fuerza', 'Fuerza', 0.3, 3, 0.05], ['defensa', 'Defensa', 0.3, 3, 0.05], ['masa', 'Masa', 0.4, 3, 0.05], ['salto', 'Salto', 6, 26, 0.5], ['saltosAereos', 'Saltos en el aire', 0, 3, 1], ['resistencia', 'Aguante', 10, 400, 5]]
          .map(([k, t, a, b, s]) => fila(t, rango(p[k], a, b, s, (v) => { per(quien)[k] = s === 1 ? Math.round(v) : v; guardar(true); }))),
        ...['piel', 'pelo', 'ropa', 'ropa2', 'acento', 'cinta'].map((k) => fila(`Color: ${k}`, colorIn(cu[k], (v) => { (per(quien).cuerpo ||= {})[k] = v; guardar(false); }))),
        fila('Peinado', sel(cu.peinado || 'corto', [['puntas', 'Puntas'], ['moño', 'Moño'], ['corto', 'Corto']], (v) => { (per(quien).cuerpo ||= {}).peinado = v; guardar(false); })),
        fila('Hombrera', sel(cu.hombrera || '', [['', 'Ninguna'], ['izq', 'Hombro izquierdo'], ['der', 'Hombro derecho']], (v) => { const cc = (per(quien).cuerpo ||= {}); if (v) cc.hombrera = v; else delete cc.hombrera; guardar(false); })),
        fila('Emblema (1–2 letras, nunca se espeja)', Object.assign(el('input', { value: cu.emblema || '', maxlength: 2 }), { onchange(e) { const cc = (per(quien).cuerpo ||= {}); if (e.target.value) cc.emblema = e.target.value.replace(/[<>]/g, ''); else delete cc.emblema; guardar(false); } })),
        fila('Aura', colorIn(per(quien).efectos?.aura || PERSONAJES[quien].efectos?.aura, (v) => { (per(quien).efectos ||= {}).aura = v; guardar(true); })),
        fila('Transformación: costo', rango(per(quien).transformacion?.costo ?? PERSONAJES[quien].transformaciones[0]?.costo ?? 50, 0, 100, 5, (v) => { (per(quien).transformacion ||= {}).costo = v; guardar(true); })),
      );
    }; pintar(); out.push({ titulo: 'Personajes', nodo: caja }); var pintarP = pintar; void pintarP; }

  // ---- combos, habilidades y frame data
  const fd = el('div', { style: 'overflow:auto' });
  function pintarFD() {
    const movs = PERSONAJES[quien].movimientos, t = el('table', { style: 'border-collapse:collapse;font:12px ui-monospace,Menlo,monospace;width:100%' });
    const cols = [['arranque', 1, 60], ['activo', 0, 60], ['recuperacion', 0, 90], ['dano', 0, 400], ['aturd', 0, 120], ['aturdB', 0, 90], ['pausa', 0, 30], ['energia', 0, 100]];
    t.append(el('tr', {}, el('th', { style: 'text-align:left' }, 'Movimiento'), el('th', {}, 'Entrada'), ...cols.map(([k]) => el('th', {}, k)), el('th', {}, 'Ventaja')));
    for (const [k, m] of Object.entries(movs)) {
      const ov = per(quien).movimientos?.[k] || {}, v = { ...m, ...ov };
      const ventaja = el('td', { style: 'text-align:center' }, String((v.aturd || 0) - (v.activo + v.recuperacion)));
      t.append(el('tr', { style: 'border-top:1px solid #3b3354' }, el('td', {}, k), el('td', {}, v.entrada || ''), ...cols.map(([c2, a, b]) => {
        const i = el('input', { type: 'number', min: a, max: b, value: v[c2] ?? 0, style: 'width:52px' });
        i.onchange = () => { const n = Math.max(a, Math.min(b, +i.value || 0)); ((per(quien).movimientos ||= {})[k] ||= {})[c2] = c2 === 'dano' || c2 === 'energia' ? n : Math.round(n); guardar(true); };
        return el('td', {}, i);
      }), ventaja));
    }
    fd.replaceChildren(el('p', { class: 'nota' }, 'Frame data en cuadros de 60 Hz. Ventaja al golpear = aturdimiento − (activo + recuperación): positiva, sigues tú. Las entradas usan notación numérica: 236 = ↓↘→.'), t);
  }
  pintarFD(); out.push({ titulo: 'Combos, habilidades y frame data', nodo: fd });

  // ---- hitboxes y animación (línea de tiempo de Anime.js + caja arrastrable)
  const anim = el('div');
  function pintarAnim() {
    const movs = Object.keys(PERSONAJES[quien].movimientos).filter((k) => !PERSONAJES[quien].movimientos[k].proyectil && !PERSONAJES[quien].movimientos[k].teleporta);
    let mov = movs.includes('fuerte') ? 'fuerte' : movs[0];
    const W = 360, H = 260, esc = 1.4, piso = 230, ox = 120;
    const lienzo = el('canvas', { width: W, height: H, style: 'background:#14111c;border-radius:10px;display:block' });
    const zona = el('div', { style: `position:relative;width:${W}px;height:${H}px;margin:6px 0` }, lienzo);
    const caja = el('div', { title: 'Arrastra la caja de golpe', style: 'position:absolute;border:2px solid #ff4646;background:rgba(255,70,70,.18);cursor:grab;border-radius:3px' });
    zona.append(caja);
    const barra = el('input', { type: 'range', min: 0, max: 100, value: 0, style: 'width:100%', 'aria-label': 'Cuadro de la animación' });
    const info = el('p', { class: 'nota' });
    const reloj = { f: 0 }; let tl = null, drag = null;
    const def = () => { const m = { ...PERSONAJES[quien].movimientos[mov], ...(per(quien).movimientos?.[mov] || {}) }; m.caja = { ...PERSONAJES[quien].movimientos[mov].caja, ...(per(quien).movimientos?.[mov]?.caja || {}) }; return m; };
    const dibujar = () => {
      const m = def(), total = m.arranque + m.activo + m.recuperacion, f = Math.round(reloj.f);
      const L = { estado: m.aire ? 'ataqueAereo' : 'ataqueFuerte', mov: { ...m, id: mov }, movF: f, durEstado: total, vy: 0, suelo: !m.aire };
      const x = lienzo.getContext('2d'); x.clearRect(0, 0, W, H);
      x.fillStyle = '#2a2238'; x.fillRect(0, piso, W, H - piso);
      const cuerpo = { ...PERSONAJES[quien].cuerpo, ...(per(quien).cuerpo || {}) };
      dibujarLuchador(x, poseDe(L, 0), { x: ox, y: piso - (m.aire ? 60 : 0), alto: PERSONAJES[quien].alto * esc, dir: 1, cuerpo, t: 0 });
      const activa = f >= m.arranque && f < m.arranque + m.activo;
      Object.assign(caja.style, { left: ox + m.caja.x * esc + 'px', top: piso - (m.aire ? 60 : 0) - (m.caja.y + m.caja.h) * esc + 'px', width: m.caja.w * esc + 'px', height: m.caja.h * esc + 'px', opacity: activa ? 1 : 0.35 });
      const fase = f < m.arranque ? 'arranque' : activa ? 'ACTIVO (golpea)' : 'recuperación';
      info.textContent = `${mov} · cuadro ${f}/${total} · ${fase} · caja x ${Math.round(m.caja.x)} y ${Math.round(m.caja.y)} w ${Math.round(m.caja.w)} h ${Math.round(m.caja.h)}`;
    };
    const rehacer = () => {
      const m = def(), total = m.arranque + m.activo + m.recuperacion; barra.max = total; reloj.f = Math.min(reloj.f, total);
      tl?.pause(); tl = createTimeline({ autoplay: false, loop: true, onUpdate: () => { barra.value = Math.round(reloj.f); dibujar(); } }).add(reloj, { f: [0, total], duration: total * (1000 / 60) * 3, ease: 'linear' });
      dibujar();
    };
    barra.oninput = () => { reloj.f = +barra.value; tl?.pause(); dibujar(); };
    const bPlay = el('button', { type: 'button', class: 'btn mini' }, '▶ Reproducir (a 1/3)'); bPlay.onclick = () => { if (tl.paused) { tl.play(); bPlay.textContent = '❚❚ Pausa'; } else { tl.pause(); bPlay.textContent = '▶ Reproducir (a 1/3)'; } };
    try {
      drag = createDraggable(caja, { container: zona, onRelease: () => {
        const m = def(), r = caja.getBoundingClientRect(), z = zona.getBoundingClientRect();
        const nx = (r.left - z.left - ox) / esc, ny = (piso - (m.aire ? 60 : 0) - (r.bottom - z.top)) / esc;
        ((per(quien).movimientos ||= {})[mov] ||= {}).caja = { x: Math.round(Math.max(-200, Math.min(300, nx))), y: Math.round(Math.max(-60, Math.min(260, ny))), w: m.caja.w, h: m.caja.h };
        drag?.setX?.(0); drag?.setY?.(0); caja.style.transform = ''; dibujar(); guardar(true);
      } });
    } catch { /* sin draggable: se edita con los números de la tabla */ }
    const ancho = rango(def().caja.w, 4, 300, 2, (v) => { (((per(quien).movimientos ||= {})[mov] ||= {}).caja ||= { ...def().caja }).w = v; dibujar(); guardar(true); });
    const alto = rango(def().caja.h, 4, 300, 2, (v) => { (((per(quien).movimientos ||= {})[mov] ||= {}).caja ||= { ...def().caja }).h = v; dibujar(); guardar(true); });
    anim.replaceChildren(fila('Movimiento', sel(mov, movs.map((k) => [k, k]), (v) => { mov = v; reloj.f = 0; rehacer(); })), zona, barra, el('div', { class: 'chips' }, bPlay), info, fila('Ancho de la caja', ancho), fila('Alto de la caja', alto),
      el('p', { class: 'nota' }, 'La pose sale del mismo contador de cuadros que el combate: preparación durante el arranque, golpe extendido en los cuadros activos y vuelta a guardia en la recuperación. La caja roja es la hitbox; arrástrala para moverla.'));
    rehacer();
  }
  pintarAnim(); out.push({ titulo: 'Hitboxes y animación', nodo: anim });

  // ---- escenario, física, cámara, efectos, accesibilidad, audio, IA
  const esc = el('div'); esc.append(
    fila('Escenario', sel(c.escenario?.tema || '', [['', 'El de tus reglas'], ...Object.entries(TEMAS).map(([k, v]) => [k, v.nombre]), ['hora', 'Según la hora de tu escenario'], ['rotar', 'Uno distinto en cada pelea'], ['elemento', 'El de tu elemento']], (v) => { c.escenario ||= {}; if (v) c.escenario.tema = v; else delete c.escenario.tema; guardar(true); })),
    fila('Pilares que se rompen', rango((c.escenario?.obstaculos || []).length, 0, 6, 1, (v) => { (c.escenario ||= {}).obstaculos = Array.from({ length: v }, (_, i) => ({ x: -600 + i * (1150 / Math.max(1, v - 1 || 1)), y: 0, w: 48, h: 120, vida: 160, color: '#5a5068' })); guardar(true); })));
  out.push({ titulo: 'Escenario', nodo: esc });
  const fis = el('div'); const F = (k, t, a, b, s, d) => fila(t, rango(c.fisica?.[k] ?? d, a, b, s, (v) => { (c.fisica ||= {})[k] = v; guardar(true); }));
  fis.append(F('gravedad', 'Gravedad', 0.2, 2.5, 0.02, 0.82), F('friccionSuelo', 'Fricción del suelo', 0.3, 0.99, 0.01, 0.78), F('rebotePared', 'Rebote en pared', 0, 1, 0.05, 0.55), F('reboteSuelo', 'Rebote en suelo', 0, 1, 0.05, 0.5),
    fila('Velocidad del juego', rango(c.velocidad ?? 1, 0.4, 1.8, 0.05, (v) => { c.velocidad = v; guardar(false); })));
  out.push({ titulo: 'Física', nodo: fis });
  const vis = el('div'); vis.append(
    fila('Intensidad de efectos', rango(c.efectos?.intensidad ?? 1, 0, 2, 0.1, (v) => { (c.efectos ||= {}).intensidad = v; guardar(false); })),
    fila('Densidad de partículas', rango(c.efectos?.densidad ?? 1, 0, 2, 0.1, (v) => { (c.efectos ||= {}).densidad = v; guardar(false); })),
    fila('Ver cajas de golpe', chk(c.camara?.cajas, (v) => { (c.camara ||= {}).cajas = v; guardar(false); })),
    fila('Reducir movimiento', chk(c.accesibilidad?.reducirMovimiento, (v) => { (c.accesibilidad ||= {}).reducirMovimiento = v; guardar(false); })),
    fila('Reducir destellos', chk(c.accesibilidad?.reducirDestellos, (v) => { (c.accesibilidad ||= {}).reducirDestellos = v; guardar(false); })),
    fila('Calidad gráfica', sel(c.perfil || 'auto', [['auto', 'Automática'], ['bajo', 'Baja'], ['medio', 'Media'], ['alto', 'Alta'], ['ultra', 'Ultra']], (v) => { c.perfil = v; guardar(true); })));
  out.push({ titulo: 'Cámara, partículas y accesibilidad', nodo: vis });
  const au = el('div'); au.append(fila('Volumen', rango(c.audio?.volumen ?? 0.5, 0, 1, 0.05, (v) => { (c.audio ||= {}).volumen = v; guardar(false); })), fila('Silencio', chk(c.audio?.silencio, (v) => { (c.audio ||= {}).silencio = v; guardar(false); })));
  const son = el('div', { class: 'chips' }); for (const k of Object.keys(SONIDOS).slice(0, 18)) { const b = el('button', { type: 'button', class: 'chip' }, '♪ ' + k); b.onclick = () => sonar(sintetizar(k, SONIDOS[k], 1), (c.audio?.volumen ?? 0.5)); son.append(b); }
  au.append(el('p', { class: 'nota' }, 'Sonidos calculados con ondas (los mismos del estudio):'), son); out.push({ titulo: 'Audio', nodo: au });
  if (id === 'duelo-anime') {
    const ia = el('div'); const I = (k, t, a, b, s, d) => fila(t, rango(c.ia?.[k] ?? d, a, b, s, (v) => { (c.ia ||= {})[k] = v; guardar(true); }));
    ia.append(I('reaccionMs', 'Reacción (ms)', 80, 900, 10, 320), I('agresion', 'Agresión', 0, 1, 0.05, 0.5), I('bloqueo', 'Bloqueo', 0, 1, 0.05, 0.45), I('error', 'Errores', 0, 1, 0.05, 0.2));
    out.push({ titulo: 'CPU (inteligencia artificial)', nodo: ia });
  } else {
    const j = el('div'); const Jf = (k, t, a, b, s, d) => fila(t, rango(c.jefe?.[k] ?? d, a, b, s, (v) => { (c.jefe ||= {})[k] = v; guardar(true); }));
    j.append(Jf('salud', 'Vida del titán', 500, 30000, 100, JEFES.gaiaron.salud), Jf('danoMul', 'Daño', 0.2, 3, 0.05, 1), Jf('avisoMul', 'Duración de avisos', 0.4, 2.5, 0.05, 1), Jf('agotadoMul', 'Tiempo agotado', 0.3, 3, 0.05, 1));
    out.push({ titulo: 'El titán', nodo: j });
  }
  return out;
}
