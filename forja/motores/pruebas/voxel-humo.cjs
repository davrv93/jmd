// prueba rápida: abre una plantilla voxel y muestra errores de consola + captura
const { chromium } = require('/Users/david.roncal/Documents/qa-taller-kit/pruebas/node_modules/playwright');
const id = process.argv[2] || 'mundo-voxel', out = process.argv[3] || '/tmp/vx.png', extra = process.argv[4] || '';
(async () => {
  const b = await chromium.launch({ channel: 'chrome', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  // mientras el motor anime no tenga config.js, se simula para poder abrir probar.html
  await p.route('**/motores/anime/config.js', async (r) => { const f = await r.fetch(); if (f.status() === 200) return r.fulfill({ response: f }); r.fulfill({ contentType: 'text/javascript', body: 'export const ESQUEMA = { tipo: "objeto" }; export function defecto() { return {}; }' }); });
  await p.route('**/motores/anime/agente.js', async (r) => { const f = await r.fetch(); if (f.status() === 200) return r.fulfill({ response: f }); r.fulfill({ contentType: 'text/javascript', body: 'export function traducir(t, c) { return { config: c, entendido: [] }; }' }); });
  const vistos = new Set(); p.on('console', (m) => { const t = m.type() + m.text().slice(0, 200); if ((m.type() === 'error' || m.type() === 'warning') && !vistos.has(t)) { vistos.add(t); console.log('consola', m.type(), m.text().slice(0, 300)); } });
  p.on('pageerror', (e) => console.log('ERROR', e.message.slice(0, 400)));
  await p.goto(`http://localhost:18711/motores/probar.html?plantilla=${id}&nueva${extra}`);
  await p.waitForFunction(() => window.__voxel && window.__voxel.render.est.chunksVisibles > 20, null, { timeout: 30000 }).catch((e) => console.log('timeout', e.message.slice(0, 80)));
  await p.waitForTimeout(2500); await p.keyboard.press('F3'); await p.waitForTimeout(600);
  console.log(await p.evaluate(() => JSON.stringify({ ...window.__voxel.monitor.resumen(), cap: window.__voxel.cap.gpu })));
  await p.screenshot({ path: out });
  await b.close();
})();
