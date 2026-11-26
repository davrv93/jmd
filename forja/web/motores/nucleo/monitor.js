// Forja · motores · Performance Monitor: overlay de desarrollo (F3 o la tecla º/`). Mide de verdad: FPS y tiempo de
// cuadro con performance.now(), tiempos de simulación y render que le pasa el bucle, y los contadores que cada motor
// declara (entidades, partículas, triángulos, chunks…). La memoria solo aparece si el navegador da performance.memory.
export function crearMonitor({ padre = globalThis.document?.body, visible = false, tecla = ['F3', 'Backquote'] } = {}) {
  const N = 120, cuadros = new Float32Array(N); let i = 0, n = 0;
  const medidas = new Map(), contadores = new Map();
  let caja = null, ultimo = 0;
  if (padre) {
    caja = document.createElement('pre');
    caja.setAttribute('aria-hidden', 'true');
    caja.style.cssText = 'position:fixed;left:8px;top:8px;z-index:50;margin:0;padding:8px 10px;background:rgba(10,8,18,.78);color:#c6ff4a;font:11px/1.45 ui-monospace,Menlo,monospace;border-radius:8px;pointer-events:none;white-space:pre;max-width:46vw';
    caja.hidden = !visible; padre.appendChild(caja);
    globalThis.addEventListener?.('keydown', (e) => { if (tecla.includes(e.code)) { caja.hidden = !caja.hidden; e.preventDefault(); } });
  }
  const m = {
    cuadro(ms) { cuadros[i] = ms; i = (i + 1) % N; n = Math.min(N, n + 1); m.pintar(); },
    medir(clave, ms) { const p = medidas.get(clave) ?? ms; medidas.set(clave, p + (ms - p) * 0.1); },
    poner(clave, valor) { contadores.set(clave, valor); },
    get fps() { if (!n) return 0; let s = 0; for (let k = 0; k < n; k++) s += cuadros[k]; return 1000 / (s / n); },
    get msCuadro() { if (!n) return 0; let s = 0; for (let k = 0; k < n; k++) s += cuadros[k]; return s / n; },
    // percentil 95 del tiempo de cuadro: mejor que el promedio para notar tirones
    get p95() { const a = Array.from(cuadros.slice(0, n)).sort((x, y) => x - y); return a[Math.floor(a.length * 0.95)] || 0; },
    get visible() { return caja ? !caja.hidden : false; }, set visible(v) { if (caja) caja.hidden = !v; },
    resumen() { return { fps: +m.fps.toFixed(1), ms: +m.msCuadro.toFixed(2), p95: +m.p95.toFixed(2), ...Object.fromEntries([...medidas].map(([k, v]) => ['ms_' + k, +v.toFixed(3)])), ...Object.fromEntries(contadores) }; },
    pintar() {
      if (!caja || caja.hidden) return;
      const ahora = performance.now(); if (ahora - ultimo < 250) return; ultimo = ahora;
      const mem = performance.memory ? `\nmemoria JS  ${(performance.memory.usedJSHeapSize / 1048576).toFixed(1)} MB` : '\nmemoria JS  (el navegador no la expone)';
      const filas = [`FPS ${m.fps.toFixed(0).padStart(4)}   cuadro ${m.msCuadro.toFixed(1)} ms   p95 ${m.p95.toFixed(1)} ms`,
        ...[...medidas].map(([k, v]) => `${k.padEnd(11)} ${v.toFixed(2)} ms`), ...[...contadores].map(([k, v]) => `${k.padEnd(11)} ${typeof v === 'number' ? v.toLocaleString('es') : v}`)];
      caja.textContent = filas.join('\n') + mem + '\n[F3] ocultar';
    },
  };
  return m;
}
