// Forja · voxel · interfaz (DOM encima del lienzo): mirilla, barra rápida, barras de salud/hambre/resistencia/aire/
// experiencia, brújula, misiones, inventario con fabricación y comercio, avisos.
// Anime.js (4.5.0) solo para presentación: avisos, aparición de paneles y la barra rápida que se reordena
// ARRASTRANDO las casillas (createDraggable) cuando el inventario está abierto. Nada del estado del juego vive aquí.
import { animate, createDraggable, stagger } from 'animejs';
import { nombreDe, esBloque, OBJETOS } from './supervivencia.js';
import { PORCLAVE, LOSETA } from './bloques.js';
import { iconoDe } from './atlas.js';

const CSS = `
.vx-ui [hidden]{display:none!important}
.fx-hud{z-index:7}.fx-menu>div{max-height:92%;overflow:auto;box-sizing:border-box}
@media (max-height:460px){.fx-menu h2{font-size:20px}.fx-menu p{font-size:12px;margin-bottom:8px}.fx-menu button{padding:7px 12px;margin:4px 0;font-size:13px}.vx-panel{max-height:92%}}
.vx-ui{position:absolute;inset:0;pointer-events:none;font:13px/1.35 system-ui,-apple-system,"Segoe UI",sans-serif;color:#f5f0ff;z-index:6;user-select:none}
.vx-mira{position:absolute;left:50%;top:50%;width:22px;height:22px;margin:-11px 0 0 -11px}
.vx-mira::before,.vx-mira::after{content:"";position:absolute;background:#fff;mix-blend-mode:difference}
.vx-mira::before{left:10px;top:2px;width:2px;height:18px}.vx-mira::after{left:2px;top:10px;width:18px;height:2px}
.vx-mira.punto::before{left:9px;top:9px;width:4px;height:4px;border-radius:2px}.vx-mira.punto::after{display:none}
.vx-mira.grande{transform:scale(1.6)}
.vx-anillo{position:absolute;left:50%;top:50%;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;background:conic-gradient(#c6ff4a var(--p,0%),transparent 0);-webkit-mask:radial-gradient(transparent 12px,#000 13px);mask:radial-gradient(transparent 12px,#000 13px);opacity:.85}
.vx-info{position:absolute;right:10px;top:8px;text-align:right;text-shadow:0 1px 2px #000;font-size:12px;opacity:.92}
.vx-barra{position:absolute;left:50%;bottom:10px;transform:translateX(-50%);display:flex;gap:4px;pointer-events:auto}
.vx-casilla{position:relative;width:44px;height:44px;border-radius:8px;background:rgba(10,8,18,.62);border:2px solid rgba(255,255,255,.28);display:grid;place-items:center;touch-action:none}
.vx-casilla.sel{border-color:#c6ff4a;box-shadow:0 0 0 2px rgba(198,255,74,.35)}
.vx-casilla img,.vx-casilla canvas{width:30px;height:30px;image-rendering:pixelated;pointer-events:none}
.vx-casilla b{position:absolute;right:3px;bottom:1px;font:700 11px system-ui;text-shadow:0 1px 1px #000}
.vx-casilla i{position:absolute;left:4px;right:4px;bottom:3px;height:3px;border-radius:2px;background:#6f6}
.vx-casilla small{position:absolute;left:3px;top:1px;font-size:9px;opacity:.6}
.vx-estado{position:absolute;left:50%;bottom:64px;transform:translateX(-50%);display:flex;gap:10px}
.vx-medidor{position:relative;width:120px;height:8px;border-radius:5px;background:rgba(10,8,18,.6);border:1px solid rgba(255,255,255,.25)}
.vx-medidor::before{content:attr(data-k);position:absolute;left:2px;bottom:9px;font:600 10px/1 system-ui,sans-serif;opacity:.8;text-shadow:0 1px 2px #000}
.vx-medidor i{display:block;height:100%;transform-origin:left;border-radius:5px}
.vx-avisos{position:absolute;left:50%;top:14%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:6px}
.vx-aviso{padding:7px 14px;border-radius:999px;background:rgba(14,11,22,.82);border:1px solid rgba(198,255,74,.45);font-weight:600;white-space:nowrap}
.vx-brujula{position:absolute;left:50%;top:10px;transform:translateX(-50%);display:flex;align-items:center;gap:8px;padding:4px 12px;border-radius:999px;background:rgba(10,8,18,.55);font-size:12px}
.vx-brujula span{display:inline-block;font-size:18px;line-height:1;transition:transform .1s linear}
.vx-misiones{position:absolute;right:10px;top:60px;width:min(300px,40vw);padding:10px 12px;border-radius:12px;background:rgba(14,11,22,.8);border:1px solid #3b3354}
.vx-misiones h3,.vx-panel h3{margin:0 0 6px;font:800 14px system-ui;letter-spacing:.03em}
.vx-misiones li{margin:3px 0;list-style:none}.vx-misiones ul{margin:0;padding:0}.vx-misiones li.ok{opacity:.55;text-decoration:line-through}
.vx-panel{position:absolute;left:50%;top:50%;translate:-50% -50%;width:min(640px,94vw);max-height:80vh;overflow:auto;padding:14px 16px;border-radius:16px;background:rgba(20,16,32,.96);border:1px solid #4a4068;pointer-events:auto;box-shadow:0 20px 60px rgba(0,0,0,.55)}
.vx-rejilla{display:grid;grid-template-columns:repeat(9,44px);gap:4px;margin:6px 0 10px}
.vx-recetas{display:flex;flex-wrap:wrap;gap:6px}
.vx-recetas button,.vx-panel>button{padding:6px 10px;border-radius:9px;border:1px solid #4a4068;background:#2a2240;color:#fff;font:600 12px system-ui;cursor:pointer}
.vx-recetas button[disabled]{opacity:.4;cursor:default}
.vx-recetas button:not([disabled]):hover,.vx-recetas button:focus-visible{outline:2px solid #c6ff4a}
.vx-velo{position:absolute;inset:0;background:#d23;opacity:0;pointer-events:none}
.vx-clic{position:absolute;left:50%;top:62%;transform:translateX(-50%);padding:8px 16px;border-radius:999px;background:rgba(10,8,18,.75);font-weight:700;pointer-events:none}
`;
const el = (t, cls, txt) => { const e = document.createElement(t); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
const COLOR = { baya: '#d0306a', pan: '#d9a35a', semilla: '#9bbf4a', palo: '#9a6b3d', carbon: '#2b2b30', hierro: '#d6a880', oro: '#f5cf3c', cristal: '#96f0ff' };
function iconoObjeto(it) {
  const c = document.createElement('canvas'); c.width = c.height = 16; const x = c.getContext('2d'), o = OBJETOS[it] || {};
  if (o.herramienta || o.arma) {
    const metal = it.includes('hierro') ? '#d8d8e0' : it.includes('piedra') ? '#8a8a90' : '#b88a50';
    x.fillStyle = '#7a5530'; for (let i = 0; i < 9; i++) x.fillRect(3 + i, 12 - i, 2, 2);
    x.fillStyle = metal;
    if (o.arma) for (let i = 0; i < 9; i++) x.fillRect(6 + i * 0.9, 9 - i, 2, 2); else if (o.herramienta === 'pico') { x.fillRect(5, 2, 9, 2); x.fillRect(4, 3, 2, 3); x.fillRect(13, 3, 2, 3); } else if (o.herramienta === 'hacha') x.fillRect(9, 2, 5, 6); else x.fillRect(10, 1, 4, 5);
  } else { x.fillStyle = COLOR[it] || '#ccc'; x.beginPath(); x.arc(8, 8, it === 'palo' ? 2 : 5.5, 0, 6.3); x.fill(); x.fillStyle = 'rgba(255,255,255,.5)'; x.fillRect(5, 5, 2, 2); }
  return c.toDataURL();
}

export function crearInterfaz(padre, { atlas, cfg, sup, acc, alFabricar, alComerciar, alSeleccionar }) {
  if (!document.getElementById('vx-css')) { const s = el('style'); s.id = 'vx-css'; s.textContent = CSS; document.head.appendChild(s); }
  const raiz = el('div', 'vx-ui'); padre.appendChild(raiz);
  const d = (ms) => (acc.reducirMovimiento ? 0 : ms);
  const mira = el('div', 'vx-mira' + (cfg.accesibilidad.mirilla !== 'cruz' ? ' ' + cfg.accesibilidad.mirilla : '')), anillo = el('div', 'vx-anillo'); anillo.style.display = 'none';
  const info = el('div', 'vx-info'), avisos = el('div', 'vx-avisos'), brujula = el('div', 'vx-brujula'), velo = el('div', 'vx-velo'), clic = el('div', 'vx-clic', 'Haz clic en el mundo para mirar con el ratón');
  brujula.hidden = true;
  const barra = el('div', 'vx-barra'), estado = el('div', 'vx-estado'), mis = el('div', 'vx-misiones'); mis.hidden = true;
  raiz.append(velo, mira, anillo, info, avisos, brujula, estado, barra, mis, clic);
  const iconos = new Map();
  const icono = (it) => { if (!iconos.has(it)) iconos.set(it, esBloque(it) ? iconoDe(atlas, LOSETA[PORCLAVE[it].id * 3 + 2]) : iconoObjeto(it)); return iconos.get(it); };
  const medidores = {};
  const NOMBRES = { salud: 'Salud', hambre: 'Hambre', resistencia: 'Energía', aire: 'Aire', xp: 'Nivel' };
  for (const [k, color, activo] of [['salud', '#ff5a6e', cfg.modulos.salud], ['hambre', '#e0a54a', cfg.modulos.hambre], ['resistencia', '#6fd3ff', cfg.modulos.resistencia], ['aire', '#9fe8ff', cfg.modulos.danoAmbiental], ['xp', '#c6ff4a', cfg.modulos.experiencia]]) {
    if (!activo || cfg.modo === 'creativo') continue; const m = el('div', 'vx-medidor'), i = el('i'); i.style.background = color; m.title = k; m.dataset.k = NOMBRES[k]; m.append(i); estado.append(m); medidores[k] = { i, v: -1, m };
  }
  const casilla = (x, idx) => {
    const c = el('div', 'vx-casilla'); c.dataset.i = idx;
    if (idx < 9) c.append(el('small', null, String(idx + 1)));
    if (x) { const im = el('img'); im.alt = nombreDe(x.it); im.src = icono(x.it); c.append(im); if (x.n > 1) c.append(el('b', null, String(x.n))); if (x.dur && OBJETOS[x.it]?.dur) { const b = el('i'); b.style.width = `${(x.dur / OBJETOS[x.it].dur) * 36}px`; b.style.background = x.dur / OBJETOS[x.it].dur < 0.25 ? '#f55' : '#6f6'; c.append(b); } c.title = nombreDe(x.it); }
    return c;
  };
  let panel = null, arrastres = [];
  const ui = {
    raiz, abierto: () => !!panel,
    pintarBarra() {
      if (!cfg.modulos.hotbar) { barra.replaceChildren(); return; }
      barra.replaceChildren(...sup.inv.slice(0, 9).map((x, i) => { const c = casilla(x, i); if (i === sup.mano) c.classList.add('sel'); c.onclick = () => alSeleccionar(i); return c; }));
      if (panel) ui.arrastrable();
    },
    // reordenar la barra rápida arrastrando (solo con el inventario abierto: sin pointer lock)
    arrastrable() {
      for (const a of arrastres) try { a.revert(); } catch { /* ya no existe */ }
      arrastres = [];
      for (const c of barra.children) {
        try {
          const a = createDraggable(c, { releaseStiffness: 300, onRelease: (self) => {
            const r = c.getBoundingClientRect(), cx = r.left + r.width / 2, destino = [...barra.children].find((o) => { const q = o.getBoundingClientRect(); return o !== c && cx > q.left && cx < q.right; });
            if (destino) { const i = +c.dataset.i, j = +destino.dataset.i; [sup.inv[i], sup.inv[j]] = [sup.inv[j], sup.inv[i]]; setTimeout(() => ui.pintarBarra(), 0); } else self.reset();
          } });
          arrastres.push(a);
        } catch { /* sin draggable: se puede seguir eligiendo con clic */ }
      }
    },
    medir(o) {
      for (const [k, m] of Object.entries(medidores)) { const v = Math.max(0, Math.min(1, o[k])); if (k === 'aire') m.m.hidden = v > 0.999;   // el aire solo se ve bajo el agua
        if (Math.abs(v - m.v) > 0.004) { m.v = v; animate(m.i, { scaleX: v, duration: d(260), ease: 'outQuad' }); } }
    },
    info(t) { info.innerHTML = t; },
    clic(v) { clic.hidden = !v; },
    progreso(p) { anillo.style.display = p > 0 ? 'block' : 'none'; anillo.style.setProperty('--p', `${Math.round(p * 100)}%`); },
    brujula(txt, angulo) { if (!txt) { brujula.hidden = true; return; } brujula.hidden = false; brujula.innerHTML = `<span style="transform:rotate(${angulo}rad)">⬆</span> ${txt}`; },
    aviso(t, ms = 2200) {
      const a = el('div', 'vx-aviso', t); avisos.append(a); while (avisos.children.length > 4) avisos.firstChild.remove();
      animate(a, { opacity: [0, 1], translateY: [d(-14), 0], scale: [0.92, 1], duration: d(260), ease: 'outBack' });
      setTimeout(() => animate(a, { opacity: 0, duration: d(300) || 1, onComplete: () => a.remove() }), ms);
    },
    dano() { if (acc.reducirDestellos) return; animate(velo, { opacity: [{ to: 0.28, duration: d(60) || 1 }, { to: 0, duration: d(320) || 1 }] }); },
    misiones(lista, completas, ctx) {
      mis.replaceChildren(el('h3', null, 'Misiones (Q)'), (() => { const u = el('ul'); for (const m of lista) { const [a, b] = sup.progreso(m, ctx), li = el('li', completas.has(m.id) ? 'ok' : '', `${completas.has(m.id) ? '✓' : '○'} ${m.texto}${b > 1 && !completas.has(m.id) ? ` (${Math.min(a, b)}/${b})` : ''}`); u.append(li); } return u; })());
    },
    alternarMisiones() { mis.hidden = !mis.hidden; if (!mis.hidden) animate(mis, { opacity: [0, 1], translateX: [d(20), 0], duration: d(220) }); },
    // inventario con fabricación (y comercio si hay un mercader cerca)
    abrirInventario({ estaciones = new Set(), ofertas = null } = {}) {
      ui.cerrar();
      panel = el('div', 'vx-panel'); panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Inventario');
      const pintar = () => {
        const rej = el('div', 'vx-rejilla'); sup.inv.forEach((x, i) => { const c = casilla(x, i); if (i === sup.mano) c.classList.add('sel'); c.onclick = () => { if (i < 9) alSeleccionar(i); else { const j = sup.mano; [sup.inv[i], sup.inv[j]] = [sup.inv[j], sup.inv[i]]; } pintar(); ui.pintarBarra(); }; rej.append(c); });
        const partes = [el('h3', null, 'Inventario'), el('p', null, 'Arrastra las casillas de la barra de abajo para ordenarlas. Clic en una casilla de la mochila: la cambia por la de tu mano.'), rej];
        if (cfg.modulos.crafting || cfg.modo === 'creativo') {
          const rec = el('div', 'vx-recetas');
          for (const r of sup.recetasDisponibles(estaciones)) { const b = el('button', null, `${nombreDe(r.sale[0])} ×${r.sale[1]} ← ${Object.entries(r.usa).map(([k, n]) => `${n} ${nombreDe(k)}`).join(' + ')}`); b.type = 'button'; b.disabled = !r.puede; b.onclick = () => { if (alFabricar(r, estaciones)) pintar(); }; rec.append(b); }
          partes.push(el('h3', null, `Fabricar${estaciones.size ? ' · cerca: ' + [...estaciones].join(', ') : ' (acércate a una mesa o a un horno para más recetas)'}`), rec);
        }
        if (ofertas) { const rec = el('div', 'vx-recetas'); for (const o of ofertas) { const b = el('button', null, `${o.da[1]} ${nombreDe(o.da[0])} → ${o.recibe[1]} ${nombreDe(o.recibe[0])}`); b.type = 'button'; b.disabled = sup.cuantos(o.da[0]) < o.da[1]; b.onclick = () => { if (alComerciar(o)) pintar(); }; rec.append(b); } partes.push(el('h3', null, 'Mercader'), rec); }
        const cerrar = el('button', null, 'Cerrar (E)'); cerrar.type = 'button'; cerrar.onclick = () => ui.cerrar(); partes.push(cerrar);
        panel.replaceChildren(...partes);
        animate(panel.querySelectorAll('.vx-casilla'), { opacity: [0, 1], delay: stagger(d(6)), duration: d(140) });
      };
      pintar(); raiz.append(panel); animate(panel, { opacity: [0, 1], scale: [0.96, 1], duration: d(180), ease: 'outQuad' });
      ui.pintarBarra();
    },
    cerrar() { if (panel) { panel.remove(); panel = null; for (const a of arrastres) try { a.revert(); } catch { /* nada */ } arrastres = []; } },
  };
  return ui;
}
