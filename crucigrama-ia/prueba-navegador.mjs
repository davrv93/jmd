// Recorrido completo en Chromium: inscripción → resolver con la solución → resultado → historial.
// Uso: node crucigrama-ia/prueba-navegador.mjs  (requiere playwright instalado globalmente)
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), 'web');
const tipos = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const servidor = http.createServer((req, res) => {
  const ruta = path.join(raiz, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/\/$/, '/index.html'));
  fs.readFile(ruta, (err, datos) => {
    if (err) { res.writeHead(404); res.end('no'); return; }
    res.writeHead(200, { 'content-type': tipos[path.extname(ruta)] || 'application/octet-stream' });
    res.end(datos);
  });
});
await new Promise((r) => servidor.listen(0, r));
const base = `http://127.0.0.1:${servidor.address().port}`;

const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: 420, height: 900 }, deviceScaleFactor: 1 });
const errores = [];
pagina.on('pageerror', (e) => errores.push('pageerror: ' + e.message));
pagina.on('console', (m) => { if (m.type() === 'error') errores.push('console: ' + m.text()); });
pagina.on('requestfailed', (r) => { if (!r.url().includes('fonts.g')) errores.push('request: ' + r.url()); });

const capturas = process.env.CAPTURAS || '/tmp/claude-0/-home-user-jmd/7131f20c-ba8b-5218-a241-eecacf834d52/scratchpad';
fs.mkdirSync(capturas, { recursive: true });

await pagina.goto(`${base}/index.html?semilla=PRUEBA1`);
await pagina.fill('#nombre', 'Ana Pérez');
await pagina.screenshot({ path: `${capturas}/01-inscripcion.png` });
await pagina.click('#empezar');
await pagina.waitForSelector('#juego:not([hidden])');
const semilla = await pagina.textContent('#semillaActual');
if (semilla.trim() !== 'PRUEBA1') throw new Error('semilla no respetada: ' + semilla);

// Determinismo: el tablero por semilla debe coincidir con el generado en Node.
const { generarCrucigrama } = await import('./web/static/generador.js');
const esperado = generarCrucigrama('PRUEBA1');
const letrasDom = await pagina.$$eval('.celda:not(.negra)', (els) => els.length);
const letrasEsp = esperado.celdas.flat().filter(Boolean).length;
if (letrasDom !== letrasEsp) throw new Error(`celdas blancas DOM=${letrasDom} esperado=${letrasEsp}`);

// Escribir una letra mal y revisar.
await pagina.click('.celda:not(.negra) input');
await pagina.keyboard.type('Z');
await pagina.click('#revisar');
await pagina.waitForSelector('.celda.mal, .celda.ok');
await pagina.screenshot({ path: `${capturas}/02-juego-revision.png` });

// Pausar y reanudar
await pagina.click('#pausar');
await pagina.waitForFunction(() => document.getElementById('aviso').textContent.includes('pausa'));
await pagina.click('#pausar');

// Rellenar la solución completa celda por celda a través del DOM.
await pagina.evaluate((celdas) => {
  const inputs = document.querySelectorAll('.celda:not(.negra) input');
  let i = 0;
  for (let f = 0; f < celdas.length; f++) for (let c = 0; c < celdas[f].length; c++) {
    if (!celdas[f][c]) continue;
    const inp = inputs[i++];
    inp.focus(); inp.value = celdas[f][c];
    inp.dispatchEvent(new Event('input', { bubbles: true }));
  }
}, esperado.celdas);
await pagina.waitForSelector('#resultado:not([hidden])', { timeout: 5000 });
await pagina.screenshot({ path: `${capturas}/03-resultado.png`, fullPage: true });

const anuncio = await pagina.textContent('#anuncio');
if (!anuncio.includes('Ana Pérez') || !anuncio.includes('PRUEBA1')) throw new Error('anuncio incompleto: ' + anuncio);

// localStorage guardó la partida
const guardadas = await pagina.evaluate(() => JSON.parse(localStorage.getItem('crucigrama-ia:partidas') || '[]'));
if (guardadas.length !== 1 || !guardadas[0].completada) throw new Error('partida no guardada: ' + JSON.stringify(guardadas).slice(0, 200));

// Descargas: TXT y PNG
const [d1] = await Promise.all([pagina.waitForEvent('download'), pagina.click('#txtAnuncio')]);
const [d2] = await Promise.all([pagina.waitForEvent('download'), pagina.click('#pngAnuncio')]);
console.log('descargas:', d1.suggestedFilename(), d2.suggestedFilename());
await d2.saveAs(`${capturas}/anuncio.png`);

// Historial tras recargar
await pagina.goto(`${base}/index.html`);
const filas = await pagina.$$eval('#tablaPartidas tbody tr', (els) => els.length);
if (filas !== 1) throw new Error('historial no persiste: ' + filas);
await pagina.screenshot({ path: `${capturas}/04-historial.png`, fullPage: true });

await navegador.close();
servidor.close();
if (errores.length) { console.error(errores.join('\n')); process.exit(1); }
console.log('OK: recorrido completo sin errores. Capturas en', capturas);
