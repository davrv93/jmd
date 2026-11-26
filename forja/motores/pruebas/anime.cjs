// Prueba visual del Anime Battle Engine con Playwright (Chrome del sistema).
//   node forja/motores/pruebas/anime.cjs [puerto]   (con un servidor estático sirviendo forja/web)
// Abre las dos plantillas en motores/probar.html, juega con teclas, toma capturas y MIDE FPS y tiempos.
const { chromium } = require(require('os').homedir() + '/Documents/qa-taller-kit/pruebas/node_modules/playwright');
const PUERTO = process.argv[2] || 18710, BASE = `http://localhost:${PUERTO}/motores/probar.html`;
const OUT = process.env.CAPTURAS || '/tmp';
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const nav = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
  const pag = await nav.newPage({ viewport: { width: 1280, height: 720 } });
  const errores = []; pag.on('pageerror', (e) => errores.push(e.message)); pag.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
  const resultados = {};
  for (const [id, modo] of [['duelo-anime', 'cpu'], ['jefe-titan', 'jefe']]) {
    await pag.goto(`${BASE}?plantilla=${id}`); await pag.waitForFunction(() => globalThis.__juego, null, { timeout: 15000 });
    await espera(600); await pag.screenshot({ path: `${OUT}/anime-${id}-menu.png` });
    await pag.keyboard.press('Enter'); await espera(300);              // primer botón del menú (modo)
    await pag.keyboard.press('Enter'); await espera(500);              // luchador
    const enCombate = await pag.evaluate(() => !!globalThis.__juego.partida);
    if (id === 'jefe-titan') { await espera(400); await pag.keyboard.press('Enter'); }   // omitir la cinemática del despertar
    // jugar: avanzar, golpear, combo, especial ↓↘→ + I, bloquear, esquivar, saltar
    const tecla = async (k, ms = 60) => { await pag.keyboard.down(k); await espera(ms); await pag.keyboard.up(k); };
    await pag.keyboard.down('KeyD'); await espera(id === 'jefe-titan' ? 900 : 450); await pag.keyboard.up('KeyD');
    for (let i = 0; i < 6; i++) { await tecla('KeyJ'); await espera(90); await tecla('KeyJ'); await espera(90); await tecla('KeyL'); await espera(250); }
    await pag.keyboard.down('KeyS'); await espera(40); await pag.keyboard.down('KeyD'); await espera(40); await pag.keyboard.up('KeyS'); await tecla('KeyI'); await pag.keyboard.up('KeyD');
    await espera(300); await pag.screenshot({ path: `${OUT}/anime-${id}-combate.png` });
    await tecla('KeyO'); await espera(200); await tecla('Space'); await espera(500); await tecla('KeyH', 900);
    // medir 4 s de juego
    const m = await pag.evaluate(async () => {
      const j = globalThis.__juego, c0 = j.partida.combate.cuadro, t0 = performance.now(); let cuadros = 0, peor = 0, prev = t0;
      await new Promise((ok) => { const f = (t) => { cuadros++; peor = Math.max(peor, t - prev); prev = t; if (t - t0 < 4000) requestAnimationFrame(f); else ok(); }; requestAnimationFrame(f); });
      const s = (performance.now() - t0) / 1000, c = j.partida.combate;
      return { fps: +(cuadros / s).toFixed(1), peorCuadroMs: +peor.toFixed(1), pasosSimPorSeg: +((c.cuadro - c0) / s).toFixed(1), monitor: j.monitor.resumen(), golpes: c.golpesAplicados, rechazos: c.transicionesRechazadas, vida: [...c.luchadores, ...c.extras].map((l) => `${l.nombre}: ${Math.round(l.vida)}/${l.vidaMax}`), particulas: j.fx.particulas };
    });
    await pag.keyboard.press('F3'); await espera(400); await pag.screenshot({ path: `${OUT}/anime-${id}-monitor.png` }); await pag.keyboard.press('F3');
    // definitivo con cinemática: se llena la energía por la API de prueba y se pulsa Y estando cerca
    const cine = await pag.evaluate(async () => {
      const j = globalThis.__juego, c = j.partida.combate, yo = c.luchadores[0], op = c.rival(yo); if (!op) return null;
      j.partida.ias.delete(op.id); for (const L of [yo, op]) { if (L.tipo !== 'jefe') { L.estado = 'reposo'; L.mov = null; L.y = 0; L.vy = 0; L.suelo = true; L.ko = false; L.vida = Math.max(L.vida, 300); } }
      if (op.tipo === 'jefe') { op.ataque = null; op.avisos = []; op.espera = 400; }
      yo.energia = 100; yo.x = op.x - (op.tipo === 'jefe' ? 220 : 70); yo.px = yo.x; yo.dir = 1; return true;
    });
    await tecla('KeyY'); await espera(900); await pag.screenshot({ path: `${OUT}/anime-${id}-definitivo.png` });
    const dir = await pag.evaluate(() => ({ activa: globalThis.__juego.partida.director.activa, zoom: +globalThis.__juego.partida.director.cam.zoom.toFixed(2) }));
    await espera(2600);
    resultados[id] = { enCombate, ...m, cinematica: cine ? dir : 'sin rival' };
  }
  // GPU usada por el navegador sin interfaz
  resultados.gpu = await pag.evaluate(() => { const g = document.createElement('canvas').getContext('webgl'); const d = g?.getExtension('WEBGL_debug_renderer_info'); return d ? g.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'desconocida'; });
  resultados.errores = errores.slice(0, 10);
  console.log(JSON.stringify(resultados, null, 1));
  await nav.close();
})();
