// menu.js · el MENÚ fijo de todos los juegos de Forja (JMD Learning): Descripción, Controles, Ayuda y Salir.
// Lee window.DATOS.menu (lo arma el estudio: motor/ayuda.js). Al abrirse PAUSA el juego:
//   - Phaser: pausa las escenas activas y el sonido.
//   - Motores anime y voxel: window.FORJA_PAUSA = true detiene el bucle (motores/nucleo/bucle.js).
// Se abre con el botón «☰ Menú» o con la tecla M (si tus controles no la usan). Esc lo cierra.
// Dentro del estudio, Reiniciar, Pantalla completa y Salir se los pide al estudio (postMessage); en tu computadora
// los hace la propia página.
(function () {
  const D = window.DATOS || {}, M = D.menu || {}, enEstudio = window.parent !== window;
  const usaM = Object.values(D.controles || {}).some((ts) => Array.isArray(ts) && ts.includes('KeyM'));
  const css = `
  .fm-boton { position: fixed; top: 8px; z-index: 50; display: flex; align-items: center; gap: 6px; height: 32px; padding: 0 12px 0 10px; border-radius: 10px; border: 1px solid rgba(255,255,255,.28); background: rgba(15,12,24,.62); color: #fff; font: 700 13px/1 system-ui, -apple-system, "Segoe UI", sans-serif; cursor: pointer; backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); opacity: .7; transition: opacity .2s, background .2s; }
  .fm-boton:hover, .fm-boton:focus-visible { opacity: 1; background: rgba(15,12,24,.85); outline: none; }
  .fm-boton:focus-visible { box-shadow: 0 0 0 3px #c8ff3d; }
  .fm-boton.der { right: 8px; } .fm-boton.izq { left: 8px; }
  .fm-boton svg { width: 16px; height: 16px; }
  .fm-capa { position: fixed; inset: 0; z-index: 60; display: grid; place-items: center; padding: 16px; background: rgba(6,4,12,.62); backdrop-filter: blur(3px); -webkit-backdrop-filter: blur(3px); font: 15px/1.45 system-ui, -apple-system, "Segoe UI", sans-serif; color: #f5f0ff; }
  .fm-capa[hidden] { display: none; }
  .fm-panel { width: min(600px, 100%); max-height: calc(100dvh - 32px); display: grid; grid-template-rows: auto auto 1fr auto; border-radius: 18px; background: #17131f; border: 1px solid rgba(255,255,255,.12); box-shadow: 0 30px 80px rgba(0,0,0,.55); overflow: hidden; }
  .fm-cab { padding: 18px 20px 8px; }
  .fm-cab small { display: block; font: 800 11px/1 ui-monospace, "SF Mono", Menlo, monospace; letter-spacing: .16em; text-transform: uppercase; color: #c8ff3d; }
  .fm-cab h2 { margin: 6px 0 0; font: 800 24px/1.1 system-ui, -apple-system, "Segoe UI", sans-serif; letter-spacing: -.01em; }
  .fm-pest { display: flex; gap: 4px; padding: 6px 16px 0; border-bottom: 1px solid rgba(255,255,255,.1); }
  .fm-pest button { flex: 1; border: 0; background: none; color: rgba(245,240,255,.6); font: 700 14px system-ui, sans-serif; padding: 10px 6px 11px; border-bottom: 2px solid transparent; cursor: pointer; }
  .fm-pest button[aria-selected="true"] { color: #fff; border-color: #c8ff3d; }
  .fm-pest button:focus-visible { outline: 2px solid #c8ff3d; outline-offset: -2px; }
  .fm-cuerpo { padding: 14px 20px; overflow: auto; }
  .fm-cuerpo p { margin: 0 0 10px; }
  .fm-cuerpo dl { margin: 0; display: grid; grid-template-columns: max-content 1fr; gap: 6px 14px; }
  .fm-cuerpo dt { font-weight: 700; color: rgba(245,240,255,.62); }
  .fm-cuerpo dd { margin: 0; }
  .fm-cuerpo h3 { margin: 16px 0 6px; font: 800 12px/1 ui-monospace, "SF Mono", Menlo, monospace; letter-spacing: .14em; text-transform: uppercase; color: #c8ff3d; }
  .fm-cuerpo ul { margin: 0; padding-left: 18px; } .fm-cuerpo li { margin: 4px 0; }
  .fm-chips { display: flex; flex-wrap: wrap; gap: 6px; } .fm-chips span { padding: 4px 10px; border-radius: 99px; background: rgba(255,255,255,.07); font-size: 13px; } .fm-chips b { color: rgba(245,240,255,.6); font-weight: 600; }
  .fm-tecla { display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 10px; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,.06); }
  .fm-tecla kbd { display: inline-block; min-width: 1.8em; margin-left: 4px; padding: 2px 7px; border-radius: 6px; border: 1px solid rgba(255,255,255,.3); border-bottom-width: 3px; background: rgba(255,255,255,.07); font: 700 12px/1.4 ui-monospace, "SF Mono", Menlo, monospace; text-align: center; }
  .fm-nota { color: rgba(245,240,255,.6); font-size: 13px; }
  .fm-pie { display: flex; flex-wrap: wrap; gap: 8px; padding: 14px 20px 18px; border-top: 1px solid rgba(255,255,255,.1); }
  .fm-pie button { border-radius: 99px; border: 1px solid rgba(255,255,255,.22); background: rgba(255,255,255,.05); color: #fff; font: 700 14px system-ui, sans-serif; padding: 9px 16px; cursor: pointer; }
  .fm-pie button:hover { border-color: rgba(255,255,255,.5); }
  .fm-pie button:focus-visible { outline: 3px solid #c8ff3d; outline-offset: 2px; }
  .fm-pie .fm-seguir { background: #c8ff3d; color: #14111c; border-color: transparent; }
  .fm-pie .fm-salir { margin-left: auto; }
  @media (max-width: 520px) { .fm-pie .fm-salir { margin-left: 0; } .fm-cab h2 { font-size: 20px; } }`;
  const estilo = document.createElement('style'); estilo.textContent = css; document.head.append(estilo);

  const el = (tag, attrs = {}, txt) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); if (txt != null) e.textContent = txt; return e; };
  const boton = el('button', { type: 'button', class: 'fm-boton ' + (M.lado === 'izq' ? 'izq' : 'der'), 'aria-haspopup': 'dialog', title: usaM ? 'Menú' : 'Menú (M)' });
  boton.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
  boton.append('Menú');
  const capa = el('div', { class: 'fm-capa', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'fmTitulo', hidden: '' });
  const panel = el('div', { class: 'fm-panel' });
  const cab = el('div', { class: 'fm-cab' }); cab.append(el('small', {}, 'Juego en pausa'), el('h2', { id: 'fmTitulo' }, (D.juego || 'Tu juego') + (D.nombre ? ' · ' + D.nombre : '')));
  const pest = el('div', { class: 'fm-pest', role: 'tablist', 'aria-label': 'Secciones del menú' });
  const cuerpo = el('div', { class: 'fm-cuerpo', role: 'tabpanel', tabindex: '0' });
  const pie = el('div', { class: 'fm-pie' });
  panel.append(cab, pest, cuerpo, pie); capa.append(panel);

  // --- secciones
  const F = M.ficha || {};
  const SECCIONES = {
    descripcion: ['Descripción', () => {
      const out = [];
      if (F.objetivo) out.push(el('p', {}, F.objetivo));
      const dl = el('dl');
      for (const [t, v] of [['Tipo', F.tipo], ['Recursos', (F.recursos || []).join(' · ')], ['Reto', F.conflicto], ['Dónde', F.limites], ['Ganas', F.gana], ['Pierdes', F.pierde]]) if (v) dl.append(el('dt', {}, t), el('dd', {}, v));
      if (dl.children.length) out.push(dl);
      if (M.tusReglas && M.tusReglas.length) {
        out.push(el('h3', {}, 'Tus reglas'));
        const c = el('div', { class: 'fm-chips' });
        for (const r of M.tusReglas) { const s = el('span'); s.append(el('b', {}, r.ajuste + ': '), r.nombre); c.append(s); }
        out.push(c);
        if (M.masReglas) out.push(el('p', { class: 'fm-nota' }, `…y ${M.masReglas} más.`));
      } else if (M.total) out.push(el('p', { class: 'fm-nota' }, `Juegas con las reglas de fábrica (${M.total} opciones para cambiar en «Diseña tu videojuego»).`));
      if (!out.length) out.push(el('p', {}, 'Un juego hecho con Forja.'));
      return out;
    }],
    controles: ['Controles', () => {
      const out = [], todos = M.controles || [];
      const fila = (x) => {
        if (!x.teclas.length) return el('p', { class: 'fm-nota' }, x.nombre);
        const f = el('div', { class: 'fm-tecla' }), t = el('span');
        for (const k of x.teclas) t.append(el('kbd', {}, k));
        f.append(el('span', {}, x.nombre), t); return f;
      };
      const basicas = todos.filter((x) => x.basica !== false), mas = todos.filter((x) => x.basica === false);
      if (mas.length) out.push(el('h3', { style: 'margin-top:0' }, 'Para jugar'));
      out.push(...basicas.map(fila));
      if (mas.length) out.push(el('h3', {}, 'Más controles'), ...mas.map(fila));
      if (!out.length) out.push(el('p', {}, 'Flechas para moverte y espacio para saltar.'));
      out.push(el('p', { class: 'fm-nota' }, `${usaM ? '' : 'M abre este menú. '}En pantallas táctiles usa los botones de abajo.`));
      return out;
    }],
    ayuda: ['Ayuda', () => {
      const ul = el('ul'); for (const t of (M.ayuda && M.ayuda.length ? M.ayuda : ['Prueba, pierde y vuelve a intentarlo: así se aprende un juego.'])) ul.append(el('li', {}, t));
      return [ul, el('p', { class: 'fm-nota', style: 'margin-top:12px' }, 'Lo que juegas es código que te llevas: ábrelo, léelo y cámbialo.')];
    }],
  };
  let seccion = 'descripcion';
  function pintar() {
    pest.replaceChildren(...Object.entries(SECCIONES).map(([id, [nombre]]) => {
      const b = el('button', { type: 'button', role: 'tab', 'aria-selected': String(id === seccion) }, nombre);
      b.onclick = () => { seccion = id; pintar(); b.focus(); }; return b;
    }));
    cuerpo.replaceChildren(...SECCIONES[seccion][1]()); cuerpo.scrollTop = 0;
  }

  // --- acciones
  const pedir = (que) => { try { window.parent.postMessage({ forja: que }, '*'); } catch (e) { /* sin estudio */ } };
  const pantallaCompleta = () => {
    if (enEstudio) return pedir('pantalla');
    const d = document, r = d.documentElement;
    if (d.fullscreenElement || d.webkitFullscreenElement) (d.exitFullscreen || d.webkitExitFullscreen).call(d);
    else (r.requestFullscreen || r.webkitRequestFullscreen)?.call(r);
  };
  const acciones = [
    ['Seguir jugando', 'fm-seguir', () => cerrar()],
    ['Reiniciar', '', () => { cerrar(); if (enEstudio) pedir('reiniciar'); else location.reload(); }],
    ['Pantalla completa', '', () => { cerrar(); pantallaCompleta(); }],
    ['Salir', 'fm-salir', () => {
      cerrar();
      if (enEstudio) return pedir('salir');
      if (document.fullscreenElement) document.exitFullscreen();
      try { window.close(); } catch (e) { /* solo se cierran las pestañas abiertas por un script */ }
    }],
  ];
  pie.replaceChildren(...acciones.map(([t, c, f]) => { const b = el('button', { type: 'button', class: c }, t); b.onclick = f; return b; }));

  // --- pausa
  let pausadas = [], foco = null;
  function pausar(v) {
    window.FORJA_PAUSA = v;
    window.dispatchEvent(new Event('blur'));   // suelta las teclas apretadas: al volver nadie queda caminando solo
    const j = window.juego;
    if (j && j.scene) {
      if (v) { pausadas = j.scene.getScenes(true); pausadas.forEach((s) => s.scene.pause()); j.sound && j.sound.pauseAll && j.sound.pauseAll(); }
      else { pausadas.forEach((s) => s.scene.resume()); pausadas = []; j.sound && j.sound.resumeAll && j.sound.resumeAll(); }
    }
    if (v && document.pointerLockElement) document.exitPointerLock();
  }
  const abierto = () => !capa.hidden;
  function abrir(sec) { if (sec) seccion = sec; foco = document.activeElement; pintar(); capa.hidden = false; pausar(true); if (enEstudio) pedir('menuAbierto');   // el estudio esconde su leyenda para no tapar el menú
    (pest.querySelector('[aria-selected="true"]') || capa).focus(); }
  function cerrar() { if (!abierto()) return; capa.hidden = true; pausar(false); (foco && foco !== document.body && foco.focus ? foco : window).focus(); window.focus(); }
  boton.onclick = () => (abierto() ? cerrar() : abrir());
  capa.addEventListener('click', (e) => { if (e.target === capa) cerrar(); });
  // Con el menú abierto las teclas no llegan al juego: se cortan en document, antes de window (donde escuchan los juegos).
  for (const tipo of ['keydown', 'keyup']) document.addEventListener(tipo, (e) => {
    if (tipo === 'keydown' && !e.repeat) {
      if (abierto() && e.code === 'Escape') { e.preventDefault(); cerrar(); e.stopPropagation(); return; }
      if (e.code === 'KeyM' && !usaM && !/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName || '')) { e.preventDefault(); abierto() ? cerrar() : abrir(); e.stopPropagation(); return; }
      if (abierto() && (e.code === 'ArrowLeft' || e.code === 'ArrowRight') && e.target.getAttribute && e.target.getAttribute('role') === 'tab') {
        const ids = Object.keys(SECCIONES), i = ids.indexOf(seccion); seccion = ids[(i + (e.code === 'ArrowRight' ? 1 : ids.length - 1)) % ids.length]; pintar(); pest.querySelector('[aria-selected="true"]').focus();
      }
    }
    if (abierto()) e.stopPropagation();
  });
  window.addEventListener('message', (e) => { if (e.source === window.parent && e.data && e.data.forja === 'menu') abrir(e.data.seccion); });
  window.FORJA_MENU = { abrir, cerrar, abierto };
  const montar = () => document.body.append(boton, capa);
  if (document.body) montar(); else document.addEventListener('DOMContentLoaded', montar);
})();
