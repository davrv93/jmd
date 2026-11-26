// Prueba visual y de rendimiento del Infinite Voxel Engine con Playwright (Chrome real).
//   node motores/pruebas/voxel.mjs [carpetaCapturas]
// Levanta su propio servidor estático en :18711 (web/), abre motores/probar.html con las 4 plantillas voxel,
// juega (camina, rompe, pone, guarda, recarga y recupera), saca capturas y MIDE: FPS, ms por chunk (generación y
// malla), triángulos, draw calls, memoria JS (si Chrome la da) y crecimiento de memoria en exploración larga.
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.HOME, 'Documents/qa-taller-kit/pruebas/node_modules/playwright'));
const WEB = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../web');
const SALIDA = process.argv[2] || path.join(path.dirname(fileURLToPath(import.meta.url)), 'capturas');
fs.mkdirSync(SALIDA, { recursive: true });
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.txt': 'text/plain' };
const srv = http.createServer((q, r) => {
  const ruta = path.normalize(decodeURIComponent(new URL(q.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
  let f = path.join(WEB, ruta); if (f.endsWith('/')) f += 'index.html';
  if (!f.startsWith(WEB) || !fs.existsSync(f)) { r.writeHead(404); return r.end('no'); }
  r.writeHead(200, { 'Content-Type': TIPOS[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(f).pipe(r);
}).listen(18711);

const resultados = {}, fallos = [];
const ok = (c, m) => { if (!c) { fallos.push(m); console.log('  ✗', m); } else console.log('  ✓', m); };
const b = await chromium.launch({ channel: 'chrome' });
let ctx = null;
async function pagina(id, extra = '') {
  const p = await ctx.newPage({ viewport: { width: 1280, height: 720 } });
  const errores = []; p.on('pageerror', (e) => errores.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
  // si el motor anime todavía no publicó su config.js/agente.js, se simulan (solo para abrir probar.html)
  for (const f of ['config', 'agente']) await p.route(`**/motores/anime/${f}.js`, async (r) => { if (fs.existsSync(path.join(WEB, `motores/anime/${f}.js`))) return r.continue(); r.fulfill({ contentType: 'text/javascript', body: f === 'config' ? 'export const ESQUEMA = { tipo: "objeto" }; export function defecto() { return {}; }' : 'export function traducir(t, c) { return { config: c, entendido: [] }; }' }); });
  await p.goto(`http://localhost:18711/motores/probar.html?plantilla=${id}${extra}`);
  await p.waitForFunction(() => window.__voxel && window.__voxel.mundo.pendientes === 0 && window.__voxel.render.est.chunksVisibles > 10, null, { timeout: 60000 });
  await p.evaluate(() => { window.__vxSinBloqueo = true; });
  return { p, errores };
}
const medirFPS = (p, ms = 4000) => p.evaluate(async (ms) => { const t0 = performance.now(); let n = 0, peor = 0, prev = t0; await new Promise((ok) => { const f = (t) => { n++; peor = Math.max(peor, t - prev); prev = t; if (t - t0 < ms) requestAnimationFrame(f); else ok(); }; requestAnimationFrame(f); }); return { fps: +(n / ((performance.now() - t0) / 1000)).toFixed(1), peorCuadroMs: +peor.toFixed(1), ...window.__voxel.monitor.resumen(), memoriaMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null }; }, ms);

for (const id of ['mundo-voxel', 'aventura-voxel', 'supervivencia-voxel', 'creativo-voxel']) {
  console.log(`\n== ${id}`);
  ctx = await b.newContext({ viewport: { width: 1280, height: 720 } });   // un contexto por plantilla: su IndexedDB sobrevive a la recarga
  const { p, errores } = await pagina(id, '&nueva');
  await p.evaluate(async () => { const v = window.__voxel; await v.almacen.borrar(v.claveGuardado); });
  const r = resultados[id] = {};
  r.gpu = await p.evaluate(() => window.__voxel.cap.gpu);
  r.reposo = await medirFPS(p);
  await p.screenshot({ path: `${SALIDA}/${id}-1-inicio.png` });
  // caminar 2 s hacia adelante corriendo
  const antes = await p.evaluate(() => ({ x: window.__voxel.jug.c.x, z: window.__voxel.jug.c.z }));
  await p.click('canvas', { position: { x: 640, y: 360 }, button: 'middle' }).catch(() => {});
  await p.keyboard.down('ShiftLeft'); await p.keyboard.down('KeyW'); await p.keyboard.down('Space'); await p.waitForTimeout(2000); await p.keyboard.up('Space'); await p.keyboard.up('KeyW'); await p.keyboard.up('ShiftLeft');
  const despues = await p.evaluate(() => ({ x: window.__voxel.jug.c.x, z: window.__voxel.jug.c.z, y: window.__voxel.jug.c.y }));
  ok(Math.hypot(despues.x - antes.x, despues.z - antes.z) > 2, `${id}: camina (${Math.hypot(despues.x - antes.x, despues.z - antes.z).toFixed(1)} bloques en 2 s)`);
  // romper el bloque de abajo (mirando al suelo) y poner uno
  await p.waitForTimeout(700);   // que se detenga
  await p.evaluate(() => { const v = window.__voxel; v.jug.pitch = -0.75; });
  await p.waitForTimeout(200);
  const blanco = await p.evaluate(() => { const t = window.__voxel.apuntar(); return t.b ? { x: t.b.x, y: t.b.y, z: t.b.z, id: t.b.id } : null; });
  ok(!!blanco, `${id}: apunta a un bloque (${JSON.stringify(blanco)})`);
  if (blanco) {
    await p.mouse.move(640, 360); await p.mouse.down(); await p.waitForFunction((t) => window.__voxel.mundo.bloque(t.x, t.y, t.z) !== t.id, blanco, { timeout: 6000 }).catch(() => {}); await p.mouse.up();
    const roto = await p.evaluate((t) => window.__voxel.mundo.bloque(t.x, t.y, t.z), blanco);
    ok(roto === 0 || roto === 5, `${id}: rompe el bloque (ahora ${roto})`);
    await p.evaluate(() => { const v = window.__voxel; v.sup.inv[v.sup.mano] = { it: 'ladrillos', n: 10 }; v.jug.pitch = -0.75; });
    await p.waitForTimeout(150);
    const objetivo = await p.evaluate(() => { const t = window.__voxel.apuntar(); return t.b ? [t.b.x + t.b.nx, t.b.y + t.b.ny, t.b.z + t.b.nz] : null; });
    await p.mouse.click(640, 360, { button: 'right' }); await p.waitForTimeout(400);
    const puesto = objetivo ? await p.evaluate((o) => window.__voxel.mundo.bloque(...o), objetivo) : null;
    ok(puesto === 15, `${id}: pone un ladrillo en la cara apuntada (${JSON.stringify(objetivo)} → ${puesto})`);
    r.deltas = await p.evaluate(() => Object.values(window.__voxel.mundo.exportarDeltas()).reduce((s, l) => s + l.length, 0));
  }
  // tercera persona y noche
  await p.evaluate(() => { const v = window.__voxel; v.jug.pitch = -0.25; }); await p.keyboard.press('KeyF'); await p.waitForTimeout(500);
  await p.screenshot({ path: `${SALIDA}/${id}-2-tercera.png` });
  await p.evaluate(() => { window.__voxel.hora = 0.93; }); await p.waitForTimeout(400); await p.screenshot({ path: `${SALIDA}/${id}-3-noche.png` });
  await p.evaluate(() => { window.__voxel.hora = 0.42; }); await p.keyboard.press('KeyF');
  // guardar, recargar y recuperar
  const pos = await p.evaluate(async () => { const v = window.__voxel; await v.guardar(true); return { x: v.jug.c.x, y: v.jug.c.y, z: v.jug.c.z, d: Object.values(v.mundo.exportarDeltas()).reduce((s, l) => s + l.length, 0) }; });
  await p.close();
  const { p: p2 } = await pagina(id);
  const rec = await p2.evaluate(() => { const v = window.__voxel; return { x: v.jug.c.x, y: v.jug.c.y, z: v.jug.c.z, d: Object.values(v.mundo.exportarDeltas()).reduce((s, l) => s + l.length, 0) }; });
  ok(Math.abs(rec.x - pos.x) < 0.01 && Math.abs(rec.z - pos.z) < 0.01 && rec.d === pos.d, `${id}: recupera la partida (pos y ${rec.d} bloques cambiados)`);
  // una estructura cercana: teletransporte y captura
  const e = await p2.evaluate(() => { const v = window.__voxel, tipos = v.cfg.modo === 'aventura' ? ['ruina', 'torre', 'templo', 'mazmorra'] : ['aldea', 'torre', 'ruina']; const l = v.gen.estructuras.cerca(v.jug.c.x, v.jug.c.z, 900).filter((x) => tipos.includes(x.tipo)); return l[0] || null; });
  if (e) {
    await p2.evaluate((e) => { const v = window.__voxel, c = v.gen.columna(e.x - 12, e.z - 12); Object.assign(v.jug.c, { x: e.x - 12, y: c.h + 8, z: e.z - 12, vx: 0, vy: 0, vz: 0 }); v.jug.c.volando = true; v.jug.yaw = Math.atan2(12, -12); v.jug.pitch = -0.35; }, e);
    await p2.waitForFunction(() => window.__voxel.mundo.pendientes === 0, null, { timeout: 30000 }).catch(() => {});
    await p2.waitForTimeout(1200); await p2.screenshot({ path: `${SALIDA}/${id}-4-${e.tipo}.png` }); r.estructura = e.tipo;
  }
  // exploración larga: 60 saltos de 48 bloques en línea; memoria y chunks no crecen sin límite
  if (id === 'mundo-voxel') {
    r.exploracion = await p2.evaluate(async () => {
      const v = window.__voxel, m = v.mundo, mem = [], chunks = [], t0 = performance.now(); v.jug.c.volando = true;
      for (let i = 0; i < 60; i++) { v.jug.c.x += 48; v.jug.c.y = v.gen.columna(Math.floor(v.jug.c.x), Math.floor(v.jug.c.z)).h + 6; m.actualizar(v.jug.c.x, v.jug.c.z, 1, 0); await new Promise((ok) => { const f = () => (m.pendientes === 0 ? ok() : setTimeout(f, 20)); f(); }); chunks.push(m.chunks.size); if (performance.memory) mem.push(performance.memory.usedJSHeapSize / 1048576); }
      return { segundos: +((performance.now() - t0) / 1000).toFixed(1), bloquesRecorridos: 60 * 48, chunksMax: Math.max(...chunks), chunksFin: chunks.at(-1), cache: m.cache.size, generados: m.stats.generados, msGenPorChunk: +(m.stats.msGen / m.stats.generados).toFixed(2), msMallaPorChunk: +(m.stats.msMalla / m.stats.mallados).toFixed(2), memoriaInicioMB: mem[0] && +mem[0].toFixed(1), memoriaMaxMB: mem.length ? +Math.max(...mem).toFixed(1) : null, memoriaFinMB: mem.length ? +mem.at(-1).toFixed(1) : null, geometriaMB: +(v.render.est.bytes / 1048576).toFixed(1), geometrias: v.render.est.geometrias };
    });
    ok(r.exploracion.chunksMax <= 300, `exploración de ${r.exploracion.bloquesRecorridos} bloques: chunks cargados acotados (${r.exploracion.chunksMax})`);
    // distancia de visión 10: carga y FPS
    await p2.evaluate(() => { window.__voxel.mundo.radio = 10; window.__voxel.cfg.render.distancia = 10; window.__voxel.mundo.actualizar(window.__voxel.jug.c.x, window.__voxel.jug.c.z); });
    await p2.waitForFunction(() => window.__voxel.mundo.pendientes === 0, null, { timeout: 60000 }).catch(() => {});
    r.distancia10 = await medirFPS(p2);
    await p2.screenshot({ path: `${SALIDA}/${id}-5-distancia10.png` });
  }
  r.errores = [...errores];
  ok(!errores.length, `${id}: sin errores en consola (${errores.slice(0, 2).join(' | ')})`);
  await p2.close(); await ctx.close();
}
await b.close(); srv.close();
fs.writeFileSync(path.join(SALIDA, 'medidas.json'), JSON.stringify(resultados, null, 1));
console.log('\nMEDIDAS'); for (const [id, r] of Object.entries(resultados)) console.log(id, JSON.stringify({ gpu: r.gpu, reposo: r.reposo && { fps: r.reposo.fps, peor: r.reposo.peorCuadroMs, tris: r.reposo['triángulos'], draw: r.reposo['draw calls'], chunks: r.reposo.chunks, gen: r.reposo['ms/chunk gen'], malla: r.reposo['ms/chunk malla'], mem: r.reposo.memoriaMB, geo: r.reposo['geometría'] }, exploracion: r.exploracion, distancia10: r.distancia10 && { fps: r.distancia10.fps, tris: r.distancia10['triángulos'], draw: r.distancia10['draw calls'], chunks: r.distancia10.chunks, geo: r.distancia10['geometría'] } }));
console.log(fallos.length ? `\n${fallos.length} FALLOS` : '\nTODO OK'); process.exit(fallos.length ? 1 : 0);
