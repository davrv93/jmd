// Forja · motores · HUD e interfaz en DOM, animados con Anime.js 4.5.0 (vendor/anime.esm.min.js, MIT).
// Anime.js aquí SOLO anima presentación (barras, números, textos, menús, transiciones). Nunca es dueño del estado de
// juego: la vida real vive en la simulación; la barra solo la persigue con un resorte.
// Se importa por ruta relativa (no por «animejs») para que también cargue en Node y en Workers sin importmap.
// El motor de Anime.js no usa su propio requestAnimationFrame: tomarRelojAnime() pone engine.useDefaultMainLoop = false
// y el bucle del juego llama a hud.tick() en cada cuadro. Así pausar el juego congela también la interfaz si se quiere.
import { engine, animate, spring, splitText, createTimeline, stagger, createDrawable } from '../../vendor/anime.esm.min.js';   // mismo módulo que el importmap «animejs» (misma URL)

let reloj = false;
export function tomarRelojAnime() { if (!reloj) { engine.useDefaultMainLoop = false; reloj = true; } return engine; }

const CSS = `
.fx-hud{position:absolute;inset:0;pointer-events:none;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color:#f5f0ff;overflow:hidden;z-index:5}
.fx-barra{position:absolute;height:14px;background:rgba(8,6,16,.72);border:2px solid rgba(255,255,255,.75);border-radius:8px;overflow:hidden}
.fx-barra i{position:absolute;inset:0;transform-origin:left center;border-radius:5px}
.fx-barra i.atras{background:#fff;opacity:.55}
.fx-barra.der i{transform-origin:right center}
.fx-barra b{position:absolute;top:-19px;font:700 12px/1 system-ui;letter-spacing:.04em;text-shadow:0 1px 2px #000;white-space:nowrap}
.fx-barra.der b{right:0}
.fx-num{position:absolute;font:900 22px/1 system-ui;text-shadow:0 2px 0 #000,0 0 6px rgba(0,0,0,.6);white-space:nowrap;will-change:transform,opacity}
.fx-combo{position:absolute;font:900 34px/1 system-ui;font-style:italic;text-shadow:0 3px 0 #000;opacity:0}
.fx-combo small{display:block;font-size:13px;letter-spacing:.12em;font-style:normal}
.fx-texto{position:absolute;left:0;right:0;text-align:center;font:900 clamp(22px,5vw,46px)/1.1 system-ui;letter-spacing:.06em;text-shadow:0 4px 0 #000;white-space:nowrap}
.fx-texto span{display:inline-block}
.fx-velo{position:absolute;inset:0;background:#0b0912;opacity:0}
.fx-menu{position:absolute;inset:0;display:grid;place-items:center;pointer-events:auto;background:rgba(10,8,18,.72)}
.fx-menu>div{min-width:min(420px,90vw);padding:22px 24px;border-radius:16px;background:#1b1628;border:1px solid #3b3354;box-shadow:0 20px 60px rgba(0,0,0,.5)}
.fx-menu h2{margin:0 0 6px;font:900 26px/1.1 system-ui;letter-spacing:.02em}
.fx-menu p{margin:0 0 14px;color:#cfc6e6;font-size:14px;line-height:1.45}
.fx-menu button{display:block;width:100%;margin:6px 0;padding:11px 14px;border-radius:10px;border:1px solid #4a4068;background:#2a2240;color:#fff;font:600 15px system-ui;text-align:left;cursor:pointer}
.fx-menu button:focus-visible,.fx-menu button:hover{outline:2px solid #c6ff4a;background:#352b52}
.fx-svg{position:absolute;inset:0;width:100%;height:100%}
`;

export function crearHUD(padre, { acc = { duracion: (x) => x, sacudida: (x) => x }, resortes = true } = {}) {
  tomarRelojAnime();
  if (!document.getElementById('fx-hud-css')) { const s = document.createElement('style'); s.id = 'fx-hud-css'; s.textContent = CSS; document.head.appendChild(s); }
  const raiz = document.createElement('div'); raiz.className = 'fx-hud'; padre.appendChild(raiz);
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.classList.add('fx-svg'); svg.setAttribute('viewBox', '0 0 960 540'); svg.setAttribute('preserveAspectRatio', 'none'); raiz.appendChild(svg);
  const d = (ms) => acc.duracion(ms);
  const h = {
    raiz, svg,
    tick() { engine.update(); },
    // barra que persigue un valor con resorte; la capa blanca de atrás baja con retraso (se ve cuánto dolió el golpe)
    barra({ x, y, ancho = 360, alto = 14, color = '#c6ff4a', etiqueta = '', derecha = false }) {
      const b = document.createElement('div'); b.className = 'fx-barra' + (derecha ? ' der' : '');
      Object.assign(b.style, { left: x + 'px', top: y + 'px', width: ancho + 'px', height: alto + 'px' });
      const atras = document.createElement('i'); atras.className = 'atras'; const fr = document.createElement('i'); fr.style.background = color;
      const et = document.createElement('b'); et.textContent = etiqueta; b.append(atras, fr, et); raiz.appendChild(b);
      let v = 1;
      return {
        el: b, get valor() { return v; },
        poner(nuevo) {
          nuevo = Math.max(0, Math.min(1, nuevo)); if (Math.abs(nuevo - v) < 1e-4) return; const bajo = nuevo < v; v = nuevo;
          animate(fr, resortes ? { scaleX: nuevo, duration: d(380), ease: spring({ stiffness: 170, damping: 16 }) } : { scaleX: nuevo, duration: 0 });
          animate(atras, { scaleX: nuevo, duration: d(700), delay: bajo ? d(380) : 0, ease: 'outQuad' });
        },
        color(c) { fr.style.background = c; }, etiqueta(t) { et.textContent = t; },
      };
    },
    // número de daño que salta y se desvanece (x, y en píxeles del lienzo de 960×540)
    numero(x, y, texto, color = '#fff', grande = false) {
      const n = document.createElement('div'); n.className = 'fx-num'; n.textContent = texto; n.style.color = color;
      n.style.left = (x / 9.6) + '%'; n.style.top = (y / 5.4) + '%'; if (grande) n.style.fontSize = '30px'; raiz.appendChild(n);
      animate(n, { translateY: [0, -46], scale: [{ to: 1.35, duration: d(90) }, { to: 1, duration: d(200) }], opacity: [{ to: 1, duration: 0 }, { to: 0, delay: d(380), duration: d(260) }], duration: d(700), ease: 'outCubic', onComplete: () => n.remove() });
      if (!d(1)) setTimeout(() => n.remove(), 500);
    },
    // contador de combo: «7 GOLPES» + daño acumulado; se queda mientras dure el combo
    combo(lado = 'izq') {
      const c = document.createElement('div'); c.className = 'fx-combo'; c.style[lado === 'izq' ? 'left' : 'right'] = '4%'; c.style.top = '24%'; raiz.appendChild(c);
      let ultimo = 0;
      return {
        poner(golpes, dano, color = '#ffd94a') {
          if (golpes < 2) { if (ultimo >= 2) animate(c, { opacity: 0, translateX: lado === 'izq' ? -30 : 30, duration: d(300) }); ultimo = golpes; return; }
          c.innerHTML = `${golpes} <span style="font-size:.55em">GOLPES</span><small>${Math.round(dano)} de daño</small>`; c.style.color = color;
          animate(c, { opacity: 1, translateX: 0, scale: [1.4, 1], duration: d(220), ease: 'outBack' }); ultimo = golpes;
        },
      };
    },
    // texto de habilidad con letras escalonadas (módulo text de Anime.js)
    texto(t, { y = 40, color = '#fff', ms = 1400 } = {}) {
      const e = document.createElement('div'); e.className = 'fx-texto'; e.style.top = y + '%'; e.style.color = color; e.textContent = t; raiz.appendChild(e);
      let chars = [e]; try { chars = splitText(e, { chars: true }).chars; } catch { /* sin split: anima el bloque */ }
      const tl = createTimeline({ onComplete: () => e.remove() })
        .add(chars, { opacity: [0, 1], translateY: [acc.sacudida(30), 0], rotate: [acc.sacudida(-12), 0], duration: d(320), delay: stagger(d(22)), ease: 'outBack' })
        .add(e, { opacity: 0, scale: 1.08, duration: d(260) }, `+=${Math.max(200, ms - 600)}`);
      if (!d(1)) setTimeout(() => e.remove(), ms);
      return tl;
    },
    // trazo SVG que se dibuja solo (createDrawable): cortes de espada, rayos dibujados en la capa de HUD
    trazo(dPath, { color = '#fff', ancho = 6, ms = 260 } = {}) {
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', dPath); p.setAttribute('fill', 'none'); p.setAttribute('stroke', color); p.setAttribute('stroke-width', ancho); p.setAttribute('stroke-linecap', 'round'); svg.appendChild(p);
      try { const [dr] = createDrawable(p); animate(dr, { draw: ['0 0', '0 1', '1 1'], duration: d(ms) || 1, ease: 'inOutQuad', onComplete: () => p.remove() }); } catch { setTimeout(() => p.remove(), ms); }
    },
    // velo negro: transición entre pantallas. Devuelve una promesa que se cumple con la pantalla tapada.
    transicion(alCubrir) {
      const v = document.createElement('div'); v.className = 'fx-velo'; raiz.appendChild(v);
      return new Promise((ok) => {
        animate(v, { opacity: 1, duration: d(260) || 1, ease: 'inQuad', onComplete: () => { alCubrir?.(); animate(v, { opacity: 0, duration: d(320) || 1, ease: 'outQuad', onComplete: () => { v.remove(); ok(); } }); } });
      });
    },
    // menú con botones (teclado: Tab / Enter). opciones: [{ texto, accion }]
    menu(titulo, texto, opciones) {
      h.cerrarMenu();
      const m = document.createElement('div'); m.className = 'fx-menu'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-label', titulo);
      const c = document.createElement('div'); const t = document.createElement('h2'); t.textContent = titulo; const p = document.createElement('p'); p.textContent = texto || ''; c.append(t, p);
      for (const o of opciones) { const b = document.createElement('button'); b.type = 'button'; b.textContent = o.texto; b.onclick = () => { h.cerrarMenu(); o.accion(); }; c.appendChild(b); }
      m.appendChild(c); raiz.appendChild(m); h._menu = m;
      animate(c, { opacity: [0, 1], translateY: [acc.sacudida(24), 0], duration: d(260), ease: 'outQuad' });
      animate(c.querySelectorAll('button'), { opacity: [0, 1], translateX: [acc.sacudida(-14), 0], delay: stagger(d(40)), duration: d(200) });
      setTimeout(() => c.querySelector('button')?.focus(), 30);
      return m;
    },
    cerrarMenu() { h._menu?.remove(); h._menu = null; },
    get hayMenu() { return !!h._menu; },
  };
  return h;
}
