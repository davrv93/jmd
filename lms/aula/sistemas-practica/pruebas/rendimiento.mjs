#!/usr/bin/env node
/*
 * rendimiento.mjs · Mide el arranque y las listas con una semilla grande (500 clientes, 500 ventas)
 * ----------------------------------------------------------------------------
 *   node pruebas/rendimiento.mjs [--solo muebleria] [--chrome <ruta>]
 * Copia dist/<id>/ a una carpeta temporal (NO toca dist/), le agrega al config una semilla grande y
 * mide en Chrome: arranque con semillas, ingreso, apertura de listas de 500, búsqueda, orden,
 * paginación, reporte y guardado en almacenamiento. Sale con código 1 si algo supera su presupuesto.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { chromium } = await import('/Users/david.roncal/Documents/jmd/lms/web/node_modules/playwright-core/index.mjs');
const argv = process.argv.slice(2);
const opcion = (n) => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : null);
const id = opcion('--solo') || 'muebleria';
const candidatos = [opcion('--chrome')].filter(Boolean);
const baseCache = path.join(os.homedir(), '.cache/hyperframes/chrome');
if (fs.existsSync(baseCache)) {
  (function buscar(d, prof) {
    if (prof > 5) { return; }
    fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { buscar(p, prof + 1); } else if (e.name === 'chrome-headless-shell') { candidatos.push(p); }
    });
  })(baseCache, 0);
}
candidatos.push('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
const exe = candidatos.find((p) => fs.existsSync(p));
if (!exe) { console.error('No encuentro Chrome. Usa --chrome <ruta>.'); process.exit(2); }

/* copia temporal con semilla grande */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sis-rendimiento-'));
fs.cpSync(path.join(RAIZ, 'dist', id), path.join(tmp, id), { recursive: true });
const cfg = path.join(tmp, id, 'js', 'config.js');
fs.appendFileSync(cfg, `
/* --- semilla grande agregada por rendimiento.mjs --- */
(function () {
  var S = window.SISTEMA.semillas, i, j, seed = 12345;
  function az() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
  var prods = S.productos, cli = S.clientes, ven = S.vendedores;
  for (i = 16; i <= 515; i++) {
    cli.push({ id: 'CLI-' + (i < 1000 ? ('0000' + i).slice(-4) : i), documento: String(10000000 + i), nombre: 'Cliente de carga ' + i + ' Pérez Gómez', tipo: 'Persona', distrito: 'Cayma', limiteCredito: 0 });
  }
  for (i = 37; i <= 536; i++) {
    var n = 1 + Math.floor(az() * 3), ls = [], usados = {};
    for (j = 0; j < n; j++) {
      var p = prods[Math.floor(az() * prods.length)];
      if (usados[p.id]) { continue; }
      usados[p.id] = 1;
      ls.push({ item: p.id, cantidad: 1 + Math.floor(az() * 3), precio: p.precio, descuentoPct: 0 });
    }
    S.ventas.push({ id: 'VTA-' + ('0000' + i).slice(-4), fecha: '@-' + Math.floor(az() * 175), cliente: 'CLI-' + ('0000' + (1 + Math.floor(az() * 515))).slice(-4), vendedor: ven[Math.floor(az() * ven.length)].id, formaPago: 'Contado', flete: 0, estado: 'Emitida', lineas: ls });
  }
})();
`);

const browser = await chromium.launch({ executablePath: exe, headless: true });
const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
ctx.setDefaultTimeout(15000);
const page = await ctx.newPage();
const consola = [];
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) { consola.push(m.text()); } });
page.on('pageerror', (e) => consola.push(e.message));

let fallos = 0;
const filas = [];
function medir(nombre, ms, tope) {
  const bien = ms <= tope;
  if (!bien) { fallos++; }
  filas.push(`${bien ? '✓' : '✗'} ${nombre.padEnd(52)} ${ms.toFixed(0).padStart(6)} ms  (tope ${tope})`);
}

const t0 = Date.now();
await page.goto(pathToFileURL(path.join(tmp, id, 'index.html')).href);
await page.waitForSelector('input[name="usuario"]');
medir('arranque con semilla grande (primer arranque, siembra)', Date.now() - t0, 1500);
const t1 = Date.now();
await page.reload();
await page.waitForSelector('input[name="usuario"]');
medir('arranque siguiente (datos ya guardados, 1000+ registros)', Date.now() - t1, 1000);
const tam = await page.evaluate((k) => localStorage.getItem(k).length, `sis_${id}_v1`);
filas.push(`  tamaño del estado en localStorage: ${(tam / 1024).toFixed(0)} KB`);

const c = JSON.parse(JSON.stringify(await page.evaluate(() => ({ u: SISTEMA.usuarios[0] }))));
await page.locator('input[name="usuario"]').fill(c.u.usuario);
await page.locator('input[name="clave"]').fill(c.u.clave);
await page.evaluate(() => { window.__t0 = performance.now(); });
await page.locator('form button[type="submit"]').click();
await page.waitForSelector('#pf-actual');
medir('ingreso (hash + pantalla de cambio de clave)', await page.evaluate(() => performance.now() - window.__t0), 300);
await page.locator('#pf-actual').fill(c.u.clave);
await page.locator('#pf-nueva').fill('Cambio#Seguro2026');
await page.locator('#pf-repetida').fill('Cambio#Seguro2026');
await page.getByRole('button', { name: 'Cambiar clave', exact: true }).click();
await page.waitForSelector('.indicador');

async function tiempoRuta(hash, selector) {
  /* parte de una pantalla distinta para que siempre haya un render nuevo */
  await page.evaluate(() => { window.location.hash = '#/perfil'; });
  await page.waitForFunction(() => window.App.hashActual === '#/perfil');
  return page.evaluate(([h, sel]) => new Promise((res) => {
    const t = performance.now();
    window.location.hash = h;
    (function sondear() {
      if (window.App.hashActual === h && document.querySelector(sel)) { res(performance.now() - t); } else { setTimeout(sondear, 0); }
    })();
  }), [hash, selector]);
}
medir('tablero con 536 ventas (indicadores + gráfico)', await tiempoRuta('#/tablero', '.indicador'), 400);
medir('lista de 515 clientes (con columna calculada)', await tiempoRuta('#/e/clientes', 'table.tabla tbody tr'), 400);
medir('lista de 536 ventas', await tiempoRuta('#/o/ventas', 'table.tabla tbody tr'), 400);
medir('reporte ventas por mes (536 ventas)', await tiempoRuta('#/r/ventas-mes', 'table.tabla tbody tr'), 400);
medir('reporte productos más vendidos', await tiempoRuta('#/r/productos-top', 'table.tabla tbody tr'), 400);

await page.evaluate(() => { window.location.hash = '#/e/clientes'; });
await page.waitForSelector('input.buscar');
const tBuscar = await page.evaluate(() => new Promise((res) => {
  const i = document.querySelector('input.buscar'); const t = performance.now();
  i.value = 'carga 4'; i.dispatchEvent(new Event('input', { bubbles: true }));
  res(performance.now() - t);
}));
medir('búsqueda en 515 clientes', tBuscar, 200);
const filasVisibles = await page.locator('table.tabla tbody tr').count();
filas.push(`  filas visibles tras la búsqueda: ${filasVisibles}`);
const tOrden = await page.evaluate(() => { const b = document.querySelector('th button'); const t = performance.now(); b.click(); return performance.now() - t; });
medir('ordenar 515 clientes por columna', tOrden, 200);
const tPag = await page.evaluate(() => { const b = [].slice.call(document.querySelectorAll('button')).filter((x) => /Siguiente/.test(x.textContent))[0]; const t = performance.now(); b.click(); return performance.now() - t; });
medir('pasar de página', tPag, 100);
const tGuardar = await page.evaluate(() => { const t = performance.now(); Almacen.guardar(); return performance.now() - t; });
medir('guardar todo el estado (JSON → localStorage)', tGuardar, 150);
const tVerif = await page.evaluate(() => { const t = performance.now(); Aud.verificar(); return performance.now() - t; });
medir('verificar la cadena de la bitácora', tVerif, 300);
const tCrear = await page.evaluate(() => { const t = performance.now(); Datos.crear('clientes', { documento: '99999999', nombre: 'Cliente nuevo', tipo: 'Persona', limiteCredito: 0 }); return performance.now() - t; });
medir('crear un cliente (validar + guardar + auditar)', tCrear, 150);

console.log(`\nRendimiento de ${id} con semilla grande (copia temporal en ${tmp})\n`);
filas.forEach((f) => console.log('  ' + f));
if (consola.length) { fallos++; console.error('\n✗ errores de consola: ' + consola.slice(0, 3).join(' | ')); }
await browser.close();
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n${fallos ? '✗' : '✓'} rendimiento.mjs: ${fallos ? fallos + ' medida(s) fuera de presupuesto' : 'todo dentro de presupuesto'}`);
process.exit(fallos ? 1 : 0);
