// capturar.mjs · captura del muestrario con Chrome headless por CDP (WebSocket nativo de Node 22+)
//   /opt/homebrew/bin/node live/_comun/estilos/capturar.mjs [salida.png] [ancho]
// Sirve live/_comun por HTTP en un puerto libre (los módulos ES no cargan desde file://).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const COMUN = path.dirname(AQUI);
const SALIDA = process.argv[2] || path.resolve(COMUN, '..', '..', 'materials', 'estilos-muestrario.png');
const ANCHO = Number(process.argv[3] || 1440);
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };

const srv = http.createServer((q, r) => {
  const ruta = path.normalize(path.join(COMUN, decodeURIComponent(new URL(q.url, 'http://x').pathname)));
  if (!ruta.startsWith(COMUN) || !fs.existsSync(ruta) || fs.statSync(ruta).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'Content-Type': TIPOS[path.extname(ruta)] || 'application/octet-stream' });
  fs.createReadStream(ruta).pipe(r);
}).listen(0, '127.0.0.1');
await new Promise((ok) => srv.once('listening', ok));
const url = `http://127.0.0.1:${srv.address().port}/estilos/muestrario.html`;

const exe = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const perfil = fs.mkdtempSync(path.join(os.tmpdir(), 'muestrario-'));
const ch = spawn(exe, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${perfil}`, '--no-first-run', '--hide-scrollbars', '--force-color-profile=srgb', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
const wsUrl = await new Promise((ok, mal) => { let b = ''; const t = setTimeout(() => mal(new Error('Chrome no respondió')), 20000); ch.stderr.on('data', (d) => { b += d; const m = b.match(/ws:\/\/\S+/); if (m) { clearTimeout(t); ok(m[0]); } }); });
const ws = new WebSocket(wsUrl); let n = 0; const pend = new Map();
await new Promise((ok) => { ws.onopen = ok; });
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { const p = pend.get(d.id); pend.delete(d.id); d.error ? p.mal(new Error(d.error.message)) : p.ok(d.result); } };
const cdp = (method, params = {}, sessionId) => { const id = ++n; ws.send(JSON.stringify({ id, method, params, sessionId })); return new Promise((ok, mal) => pend.set(id, { ok, mal })); };
try {
  const { targetId } = await cdp('Target.createTarget', { url: 'about:blank' });
  const { sessionId: s } = await cdp('Target.attachToTarget', { targetId, flatten: true });
  await cdp('Page.enable', {}, s);
  await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: process.env.TEMA || 'light' }] }, s);
  await cdp('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 900, deviceScaleFactor: 1, mobile: false }, s);
  await cdp('Page.navigate', { url }, s);
  const espera = `new Promise(ok=>{const t=Date.now();(function f(){if(document.documentElement.dataset.listo||Date.now()-t>20000)ok(document.documentElement.scrollHeight);else setTimeout(f,100)})()})`;
  const { result } = await cdp('Runtime.evaluate', { expression: espera, awaitPromise: true, returnByValue: true }, s);
  const alto = Math.ceil(result.value);
  await cdp('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: alto, deviceScaleFactor: 1, mobile: false }, s);
  await new Promise((ok) => setTimeout(ok, 400));
  const shot = await cdp('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: ANCHO, height: alto, scale: 1 }, captureBeyondViewport: true }, s);
  fs.writeFileSync(SALIDA, Buffer.from(shot.data, 'base64'));
  console.log(`${SALIDA} · ${ANCHO}×${alto} · ${(fs.statSync(SALIDA).size / 1048576).toFixed(1)} MB`);
} finally {
  ws.close(); ch.kill(); srv.close();
  setTimeout(() => { try { fs.rmSync(perfil, { recursive: true, force: true }); } catch {} }, 500);
}
