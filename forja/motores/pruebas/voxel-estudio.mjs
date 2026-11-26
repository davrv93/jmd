// Prueba de integración: las plantillas voxel DENTRO de Forja (diálogo «Juegos», iframe srcdoc) y el ZIP descargado
// servido aparte con su index.html (como haría `npx serve`). Usa el personaje del estudio como avatar en 3.ª persona.
//   node motores/pruebas/voxel-estudio.mjs [carpetaCapturas]
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.HOME, 'Documents/qa-taller-kit/pruebas/node_modules/playwright'));
const AQUI = path.dirname(fileURLToPath(import.meta.url)), WEB = path.join(AQUI, '../../web');
const SALIDA = process.argv[2] || path.join(AQUI, 'capturas'); fs.mkdirSync(SALIDA, { recursive: true });
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.txt': 'text/plain', '.css': 'text/css' };
const servir = (raiz, puerto) => http.createServer((q, r) => {
  let f = path.join(raiz, path.normalize(decodeURIComponent(new URL(q.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '')); if (f.endsWith(path.sep)) f += 'index.html';
  if (!f.startsWith(raiz) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end('no'); }
  r.writeHead(200, { 'Content-Type': TIPOS[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
}).listen(puerto);
const s1 = servir(WEB, 18711);
const fallos = []; const ok = (c, m) => { console.log(c ? '  ✓' : '  ✗', m); if (!c) fallos.push(m); };
const b = await chromium.launch({ channel: 'chrome' }), ctx = await b.newContext({ viewport: { width: 1360, height: 860 }, acceptDownloads: true });
const p = await ctx.newPage(); const errores = []; p.on('pageerror', (e) => errores.push(e.message));
await p.goto('http://localhost:18711/');
await p.waitForTimeout(2500);
// la bienvenida «Diseña tu videojuego» se abre sola la primera vez: se cierra para ir directo a Juegos
await p.keyboard.press('Escape'); await p.waitForTimeout(300);
await p.evaluate(() => document.querySelectorAll('.disena').forEach((e) => { e.style.display = 'none'; }));
for (const [id, nombre] of [['mundo-voxel', 'Mundo voxel'], ['aventura-voxel', 'Aventura voxel']]) {
  console.log(`== ${id} en el estudio`);
  if (!(await p.locator('#dPista').evaluate((d) => d.open))) await p.click('#bProbar');
  await p.locator('#plantillas button', { hasText: nombre }).click();
  const marco = p.frameLocator('#marcoJuego');
  const listo = await p.waitForFunction(() => { const w = document.getElementById('marcoJuego').contentWindow; return w && w.__voxel && w.__voxel.mundo.pendientes === 0 && w.__voxel.render.est.chunksVisibles > 10; }, null, { timeout: 60000 }).then(() => true, () => false);
  ok(listo, `${id}: arranca dentro del iframe del estudio`);
  if (!listo) continue;
  const info = await p.evaluate(() => { const v = document.getElementById('marcoJuego').contentWindow.__voxel; return { heroe: !!v.render.p5 && !!document.getElementById('marcoJuego').contentWindow.FORJA_ASSETS?.['heroe.png'], workers: v.mundo && v.monitor.resumen().workers, reglas: Object.keys(document.getElementById('marcoJuego').contentWindow.DATOS.reglas).length }; });
  ok(info.workers > 0, `${id}: Workers del motor activos en srcdoc (${info.workers})`);
  ok(info.reglas >= 100, `${id}: DATOS.reglas llega con ${info.reglas} claves`);
  await p.evaluate(() => { const w = document.getElementById('marcoJuego').contentWindow, v = w.__voxel; v.jug.camara = 'tercera'; v.jug.pitch = -0.3; });
  await p.waitForTimeout(1200);
  await p.screenshot({ path: `${SALIDA}/estudio-${id}.png` });
  await marco.locator('canvas').first().screenshot({ path: `${SALIDA}/estudio-${id}-juego.png` });
  ok(info.heroe, `${id}: el personaje del estudio viaja como avatar (heroe.png en memoria)`);
  // pestaña Editor (solo plantillas de motores)
  const tabEd = p.locator('#pExplica [data-v="editor"]');
  ok(await tabEd.isVisible(), `${id}: pestaña «Editor» visible`);
  await tabEd.click(); await p.waitForTimeout(800);
  ok(await p.locator('#explica details summary', { hasText: 'Biomas' }).count() > 0, `${id}: paneles del editor voxel montados`);
  await p.locator('#pExplica [data-v="algoritmos"]').click();
}
// ZIP descargado → servido aparte
console.log('== ZIP');
const [descarga] = await Promise.all([p.waitForEvent('download', { timeout: 60000 }), p.click('#bZipJuego')]);
const zipRuta = path.join(SALIDA, 'aventura-voxel.zip'); await descarga.saveAs(zipRuta);
const dir = path.join(SALIDA, 'zip'); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir);
execFileSync('unzip', ['-q', zipRuta, '-d', dir]);
const carpeta = path.join(dir, fs.readdirSync(dir)[0]), archivos = execFileSync('find', [carpeta, '-type', 'f']).toString().trim().split('\n');
ok(archivos.length <= 150 && archivos.some((a) => a.endsWith('trabajador.js')), `ZIP: ${archivos.length} archivos (≤ 150), con el Worker aparte`);
const tam = archivos.reduce((s, a) => s + fs.statSync(a).size, 0); ok(tam < 12e6, `ZIP: ${(tam / 1048576).toFixed(1)} MB (≤ 12 MB)`);
const s2 = servir(carpeta, 18712);
const p2 = await ctx.newPage(); const err2 = []; p2.on('pageerror', (e) => err2.push(e.message));
await p2.goto('http://localhost:18712/index.html');
const zipOk = await p2.waitForFunction(() => window.__voxel && window.__voxel.mundo.pendientes === 0 && window.__voxel.render.est.chunksVisibles > 10, null, { timeout: 60000 }).then(() => true, () => false);
ok(zipOk, `ZIP: el juego corre servido desde su carpeta (sin el estudio)${err2.length ? ' · ' + err2[0] : ''}`);
await p2.screenshot({ path: `${SALIDA}/zip-aventura-voxel.png` });
ok(!errores.length, `estudio sin errores de página ${errores.slice(0, 2).join(' | ')}`);
await b.close(); s1.close(); s2.close();
console.log(fallos.length ? `${fallos.length} FALLOS` : 'TODO OK'); process.exit(fallos.length ? 1 : 0);
