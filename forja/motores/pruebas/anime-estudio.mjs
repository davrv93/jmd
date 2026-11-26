// Prueba de integración: las plantillas anime (Duelo anime, Jefe titán) DENTRO de Forja (diálogo «Juegos», iframe srcdoc) y el ZIP descargado
// servido aparte con su index.html (como haría `npx serve`). El personaje del estudio entra como luchador.
//   node motores/pruebas/anime-estudio.mjs [carpetaCapturas]
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
const s1 = servir(WEB, 18713);
const fallos = []; const ok = (c, m) => { console.log(c ? '  ✓' : '  ✗', m); if (!c) fallos.push(m); };
const b = await chromium.launch({ channel: 'chrome' }), ctx = await b.newContext({ viewport: { width: 1360, height: 860 }, acceptDownloads: true });
const p = await ctx.newPage(); const errores = []; p.on('pageerror', (e) => errores.push(e.message));
await p.goto('http://localhost:18713/');
await p.waitForTimeout(2500);
// la bienvenida «Diseña tu videojuego» se abre sola la primera vez: se cierra para ir directo a Juegos
await p.keyboard.press('Escape'); await p.waitForTimeout(300);
await p.evaluate(() => document.querySelectorAll('.disena').forEach((e) => { e.style.display = 'none'; }));
for (const [id, nombre] of [['duelo-anime', 'Duelo anime'], ['jefe-titan', 'Jefe titán']]) {
  console.log(`== ${id} en el estudio`);
  if (!(await p.locator('#dPista').evaluate((d) => d.open))) await p.click('#bProbar');
  await p.locator('#plantillas button', { hasText: nombre }).click();
  const marco = p.frameLocator('#marcoJuego');
  const listo = await p.waitForFunction(() => { const w = document.getElementById('marcoJuego').contentWindow; return w && w.__juego && w.document.querySelector('.fx-menu button'); }, null, { timeout: 30000 }).then(() => true, () => false);
  ok(listo, `${id}: arranca dentro del iframe del estudio (menú visible)`);
  if (!listo) continue;
  const conForja = await p.evaluate(() => /Tu personaje|Forja/.test(document.getElementById('marcoJuego').contentWindow.document.querySelector('.fx-menu').textContent) || true);
  await marco.locator('.fx-menu button').first().click(); await p.waitForTimeout(300);
  const botones = await marco.locator('.fx-menu button').allTextContents();
  ok(!botones.length || botones.some((t) => /Ren|Mako|Forja|personaje/i.test(t)), `${id}: selección de luchador (${botones.slice(0, 3).join(' / ')})`);
  if (botones.length) await marco.locator('.fx-menu button').first().click();
  await p.waitForTimeout(id === 'jefe-titan' ? 900 : 600);
  const info = await p.evaluate(() => { const w = document.getElementById('marcoJuego').contentWindow, j = w.__juego; return { partida: !!j.partida, forja: !!w.FORJA_ASSETS?.['heroe.png'], luchador: j.partida?.combate.luchadores[0].def.id, reglas: Object.keys(w.DATOS.reglas).length }; });
  ok(info.partida, `${id}: combate en marcha`);
  ok(info.reglas >= 100, `${id}: DATOS.reglas llega con ${info.reglas} claves`);
  ok(info.forja && info.luchador === 'forja', `${id}: tu personaje del estudio es el luchador (${info.luchador})`);
  await marco.locator('canvas').first().press('KeyD'); await p.keyboard.down('KeyD'); await p.waitForTimeout(500); await p.keyboard.up('KeyD');
  for (let k = 0; k < 4; k++) { await p.keyboard.press('KeyJ'); await p.waitForTimeout(120); await p.keyboard.press('KeyL'); await p.waitForTimeout(220); }
  await p.screenshot({ path: `${SALIDA}/estudio-${id}.png` });
  await marco.locator('canvas').first().screenshot({ path: `${SALIDA}/estudio-${id}-juego.png` });
  void conForja;
  const tabEd = p.locator('#pExplica [data-v="editor"]');
  ok(await tabEd.isVisible(), `${id}: pestaña «Editor» visible`);
  await tabEd.click(); await p.waitForTimeout(900);
  ok(await p.locator('#explica details summary', { hasText: 'Hitboxes y animación' }).count() > 0, `${id}: paneles del editor anime montados`);
  await p.locator('#explica details summary', { hasText: 'Hitboxes y animación' }).click(); await p.waitForTimeout(400);
  await p.locator('#explica').screenshot({ path: `${SALIDA}/estudio-${id}-editor.png` });
  await p.locator('#pExplica [data-v="algoritmos"]').click();
}
// ZIP descargado → servido aparte
console.log('== ZIP');
const [descarga] = await Promise.all([p.waitForEvent('download', { timeout: 60000 }), p.click('#bZipJuego')]);
const zipRuta = path.join(SALIDA, 'jefe-titan.zip'); await descarga.saveAs(zipRuta);
const dir = path.join(SALIDA, 'zip'); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir);
execFileSync('unzip', ['-q', zipRuta, '-d', dir]);
const carpeta = path.join(dir, fs.readdirSync(dir)[0]), archivos = execFileSync('find', [carpeta, '-type', 'f']).toString().trim().split('\n');
ok(archivos.length <= 150 && archivos.some((a) => a.endsWith('anime.esm.min.js')) && !archivos.some((a) => a.endsWith('phaser.min.js')), `ZIP: ${archivos.length} archivos (≤ 150), con Anime.js y sin Phaser`);
const tam = archivos.reduce((s, a) => s + fs.statSync(a).size, 0); ok(tam < 12e6, `ZIP: ${(tam / 1048576).toFixed(1)} MB (≤ 12 MB)`);
const s2 = servir(carpeta, 18714);
const p2 = await ctx.newPage(); const err2 = []; p2.on('pageerror', (e) => err2.push(e.message));
await p2.goto('http://localhost:18714/index.html');
const zipOk = await p2.waitForFunction(() => window.__juego && document.querySelector('.fx-menu button'), null, { timeout: 30000 }).then(() => true, () => false);
ok(zipOk, `ZIP: el juego corre servido desde su carpeta (sin el estudio)${err2.length ? ' · ' + err2[0] : ''}`);
await p2.screenshot({ path: `${SALIDA}/zip-jefe-titan.png` });
ok(!errores.length, `estudio sin errores de página ${errores.slice(0, 2).join(' | ')}`);
await b.close(); s1.close(); s2.close();
console.log(fallos.length ? `${fallos.length} FALLOS` : 'TODO OK'); process.exit(fallos.length ? 1 : 0);
