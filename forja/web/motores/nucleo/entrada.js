// Forja · motores · Input Manager. Teclado, mando (Gamepad API), botones táctiles (window.TACTO, como en las
// plantillas Phaser) y Pointer Lock. Las teclas se leen por ACCIÓN («golpe», «salto»), no por tecla, y por PASO de
// simulación: muestrear() se llama una vez por paso fijo y devuelve qué está apretado y qué se apretó desde el paso
// anterior. Un toque más corto que un paso no se pierde. También mide la latencia de entrada (evento → paso que la usa).
//   const e = crearEntrada({ mapa: { izq: ['KeyA','ArrowLeft'], golpe: ['KeyJ'] } }); … const s = e.muestrear();
//   s.abajo.has('izq'), s.recien.has('golpe')
export const MAPA_BASE = {
  izq: ['ArrowLeft', 'KeyA'], der: ['ArrowRight', 'KeyD'], arriba: ['ArrowUp', 'KeyW'], abajo: ['ArrowDown', 'KeyS'],
  salto: ['Space'], ligero: ['KeyJ', 'KeyZ'], medio: ['KeyK', 'KeyX'], fuerte: ['KeyL', 'KeyC'], especial: ['KeyI', 'KeyV'],
  bloqueo: ['KeyU', 'ShiftLeft'], esquiva: ['KeyO'], carga: ['KeyH'], definitivo: ['KeyY'], transformar: ['KeyT'],
  pausa: ['Escape', 'KeyP'], monitor: ['F3', 'Backquote'],
};
const BOTONES_MANDO = { 0: 'salto', 1: 'fuerte', 2: 'ligero', 3: 'medio', 4: 'bloqueo', 5: 'especial', 6: 'carga', 7: 'definitivo', 9: 'pausa', 12: 'arriba', 13: 'abajo', 14: 'izq', 15: 'der' };

// Los controles que el alumno eligió al crear su juego (paso «Procedimientos» de «Diseña tu videojuego») llegan en
// DATOS.controles = { accion: ['KeyJ', …] } y reemplazan las teclas de esa acción. propios: false los ignora (jugador 2).
export function conPropios(mapa, propios = globalThis.window?.DATOS?.controles) {
  if (!propios || typeof propios !== 'object') return mapa;
  const m = { ...mapa };
  for (const [acc, cods] of Object.entries(propios)) if (acc in m && Array.isArray(cods)) m[acc] = cods.filter((c) => typeof c === 'string');   // [] = sin tecla
  return m;
}
export function crearEntrada({ mapa = MAPA_BASE, objetivo = globalThis.window, mando = 0, tacto = globalThis.window?.TACTO, propios = true } = {}) {
  if (propios) mapa = conPropios(mapa);
  const porCodigo = new Map();
  for (const [acc, cods] of Object.entries(mapa)) for (const c of cods) { if (!porCodigo.has(c)) porCodigo.set(c, []); porCodigo.get(c).push(acc); }
  const abajo = new Set(), recien = new Set(), soltadas = new Set(), stamp = new Map();
  let latencias = [], activo = true;
  const bajar = (acc, t) => { if (!abajo.has(acc)) { recien.add(acc); stamp.set(acc, t); } abajo.add(acc); };
  const interactivo = (ev) => /^(BUTTON|INPUT|SELECT|TEXTAREA|A)$/.test(ev.target?.tagName || '');   // los menús reciben su Enter/Espacio
  const alBajar = (ev) => {
    if (interactivo(ev)) return;
    if (!activo || ev.repeat) { if (porCodigo.has(ev.code)) ev.preventDefault(); return; }
    const accs = porCodigo.get(ev.code); if (!accs) return;
    ev.preventDefault(); for (const a of accs) bajar(a, ev.timeStamp || performance.now());
  };
  const alSubir = (ev) => { const accs = porCodigo.get(ev.code); if (!accs) return; for (const a of accs) { abajo.delete(a); soltadas.add(a); } };
  const alPerder = () => { abajo.clear(); };
  objetivo?.addEventListener?.('keydown', alBajar); objetivo?.addEventListener?.('keyup', alSubir); objetivo?.addEventListener?.('blur', alPerder);
  let mandoAntes = new Set();
  const e = {
    mapa,
    // inyección directa (pruebas, IA, repeticiones, botones de la interfaz)
    apretar(acc) { bajar(acc, performance.now()); }, soltar(acc) { abajo.delete(acc); soltadas.add(acc); },
    muestrear() {
      const ahora = performance.now();
      // mando: se consulta aquí, una vez por paso
      const pads = globalThis.navigator?.getGamepads?.() || [], p = pads[mando], ya = new Set();
      if (p) {
        for (const [i, acc] of Object.entries(BOTONES_MANDO)) if (p.buttons[i]?.pressed) ya.add(acc);
        const [ax = 0, ay = 0] = p.axes; if (ax < -0.5) ya.add('izq'); if (ax > 0.5) ya.add('der'); if (ay < -0.5) ya.add('arriba'); if (ay > 0.5) ya.add('abajo');
        for (const a of ya) if (!mandoAntes.has(a)) recien.add(a);
      }
      const t = tacto || globalThis.window?.TACTO; const tac = new Set();
      if (t) for (const [k, v] of Object.entries(t)) if (v) tac.add(k === 'golpe' ? 'ligero' : k);
      for (const a of tac) if (!abajo.has(a) && !mandoAntes.has(a)) recien.add(a);
      const s = { abajo: new Set([...abajo, ...ya, ...tac]), recien: new Set(recien), soltadas: new Set(soltadas), t: ahora };
      for (const a of recien) { const t0 = stamp.get(a); if (t0) latencias.push(ahora - t0); }
      if (latencias.length > 60) latencias = latencias.slice(-60);
      recien.clear(); soltadas.clear(); stamp.clear(); mandoAntes = new Set([...ya, ...tac]);
      return s;
    },
    get latencia() { return latencias.length ? latencias.reduce((a, b) => a + b, 0) / latencias.length : 0; },
    pausar(v) { activo = !v; if (v) abajo.clear(); },
    destruir() { objetivo?.removeEventListener?.('keydown', alBajar); objetivo?.removeEventListener?.('keyup', alSubir); objetivo?.removeEventListener?.('blur', alPerder); },
  };
  return e;
}

// Pointer Lock con manejo de errores (Safari, iframes sin permiso): devuelve una función para soltarlo.
export function bloquearPuntero(lienzo, alMover) {
  const mover = (ev) => { if (document.pointerLockElement === lienzo) alMover(ev.movementX || 0, ev.movementY || 0); };
  const pedir = () => { try { const r = lienzo.requestPointerLock?.(); r?.catch?.(() => {}); } catch { /* sin pointer lock: se arrastra con el ratón */ } };
  let arrastre = null;
  const bajar = (ev) => { if (document.pointerLockElement !== lienzo) { pedir(); arrastre = [ev.clientX, ev.clientY]; } };
  const moverSinLock = (ev) => { if (arrastre && document.pointerLockElement !== lienzo && ev.buttons) { alMover(ev.clientX - arrastre[0], ev.clientY - arrastre[1]); arrastre = [ev.clientX, ev.clientY]; } };
  lienzo.addEventListener('mousedown', bajar); document.addEventListener('mousemove', mover); lienzo.addEventListener('mousemove', moverSinLock);
  return { pedir, bloqueado: () => document.pointerLockElement === lienzo, soltar() { lienzo.removeEventListener('mousedown', bajar); document.removeEventListener('mousemove', mover); lienzo.removeEventListener('mousemove', moverSinLock); if (document.pointerLockElement === lienzo) document.exitPointerLock(); } };
}
