// Mesa en vivo con toda la clase: 15 alumnos entran a la sala de clase a la vez (15 contextos de Chrome),
// caen en la misma mesa, uno pulsa «Empezar ya», juegan las rondas y el ranking queda con los 15.
//   MESA_SEGUNDOS=12 ./pogo-ia  (puerto 18611)   y luego   node vivo15.mjs http://127.0.0.1:18611/clase/
// Capturas en ~/Documents/pogo-15-capturas/.
import pw from "/Users/david.roncal/Documents/qa-taller-kit/pruebas/node_modules/playwright/index.js";
const { chromium } = pw;
import { mkdirSync } from "node:fs";

const URL_BASE = process.argv[2] || "http://127.0.0.1:18611/clase/";
const N = Number(process.argv[3] || 15);
const DIR = "/Users/david.roncal/Documents/pogo-15-capturas/";
mkdirSync(DIR, { recursive: true });
let fallos = 0;
const ok = (c, m) => { console.log(`${c ? "PASS" : "FAIL"} · ${m}`); if (!c) fallos++; };
const NOMBRES = ["Ana Pérez", "Beto Ruiz", "Carla Soto", "Dilmer Mendieta", "Elena Vega", "Flor Flores", "Gustavo Lau", "Hilda Paz", "Iván Cruz", "José Nilo", "Keila Huamán", "Lisset Huamán", "Mario Quispe", "Nora Díaz", "Omar Vidal", "Piero Lanche"];

const browser = await chromium.launch({ channel: "chrome", args: ["--autoplay-policy=no-user-gesture-required"] });
const paginas = [];
const errores = [];
for (let i = 0; i < N; i++) {
  const movil = i === N - 1;
  const ctx = await browser.newContext(movil ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : { viewport: { width: 1366, height: 768 } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errores.push(`${NOMBRES[i]}: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error") errores.push(`${NOMBRES[i]} consola: ${m.text()}`); });
  await page.goto(`${URL_BASE}?lms=1&prueba=1&n=${encodeURIComponent(NOMBRES[i])}&u=u${i + 1}`);
  paginas.push(page);
}
// Todos a la vez: «Jugar en vivo con la clase».
await Promise.all(paginas.map(async (p) => { await p.waitForSelector("#vivo:not([hidden])", { timeout: 15000 }); await p.click("#vivo"); }));
await Promise.all(paginas.map((p) => p.waitForFunction(() => window.__pogo.J && window.__pogo.J.multi, null, { timeout: 15000 })));
const mesas = await Promise.all(paginas.map((p) => p.evaluate(() => window.__pogo.J.multi.mesa)));
ok(new Set(mesas).size === 1, `los ${N} cayeron en la misma mesa (${mesas[0]})`);
const asientos = await Promise.all(paginas.map((p) => p.evaluate(() => window.__pogo.J.yo)));
ok(new Set(asientos).size === N, `asientos distintos: ${asientos.join(",")}`);
await paginas[0].waitForSelector("#cBtn:not([hidden])", { timeout: 15000 });
await paginas[0].waitForTimeout(800);
await paginas[0].screenshot({ path: DIR + "01-esperando-1366.png" });
ok((await paginas[0].textContent("#cT")).includes(`${N} de`), `el cartel cuenta ${N} sentados: «${await paginas[0].textContent("#cT")}»`);
await paginas[3].click("#cBtn");   // «Empezar ya»
await Promise.all(paginas.map((p) => p.waitForFunction(() => window.__pogo.J && window.__pogo.J.corriendo && window.__pogo.J.m, null, { timeout: 30000 })));
const lado = await paginas[0].evaluate(() => window.__pogo.J.m.n);
const vivos = await paginas[0].evaluate(() => window.__pogo.J.m.robots.filter((r) => !r.ausente).length);
ok(lado === 17 && vivos === N, `ronda 1 en tablero de ${lado} × ${lado} con ${vivos} robots (sin máquina)`);
// Cada uno rebota hacia un lado distinto durante unos segundos.
const DIRS = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"];
await Promise.all(paginas.map(async (p, i) => { if (i === N - 1) return; await p.keyboard.down(DIRS[i % 4]); }));
await paginas[N - 1].tap("#cruz button[data-dir='arriba']");
await paginas[0].waitForTimeout(3500);
await paginas[0].screenshot({ path: DIR + "02-jugando-1366.png" });
await paginas[N - 1].screenshot({ path: DIR + "03-jugando-390.png" });
const pintadas = await paginas[0].evaluate(() => { const m = window.__pogo.J.m; const n = new Set(); m.dueno.forEach((d) => { if (d >= 0) n.add(d); }); return n.size; });
ok(pintadas >= N - 1, `casillas pintadas por ${pintadas} robots distintos`);
const ms = await paginas[0].evaluate(() => window.__pogo.msPorCuadro());
console.log(`JS por cuadro (1366×768, 17×17, ${N} robots): ${ms.toFixed(2)} ms`);
const msMovil = await paginas[N - 1].evaluate(() => window.__pogo.msPorCuadro());
console.log(`JS por cuadro (390×844): ${msMovil.toFixed(2)} ms`);
await Promise.all(paginas.map(async (p, i) => { if (i === N - 1) return; await p.keyboard.up(DIRS[i % 4]); }));
// Hasta el final de la mesa (3 rondas cortas con MESA_SEGUNDOS).
await paginas[0].waitForSelector("#resultado:not([hidden])", { timeout: 180000 });
await paginas[0].waitForTimeout(1500);
await paginas[0].screenshot({ path: DIR + "04-final-1366.png", fullPage: true });
const nota = await paginas[0].textContent("#rNota");
ok(nota.split("·").length >= N, `el final lista a los ${N}: «${nota.slice(0, 90)}…»`);
const r = await paginas[0].goto(URL_BASE + "ranking");
const filas = await paginas[0].evaluate(() => document.querySelectorAll("li").length);
ok(r.ok() && filas >= N, `ranking de la clase con ${filas} filas`);
await paginas[0].screenshot({ path: DIR + "05-ranking-1366.png", fullPage: true });
ok(errores.length === 0, `sin errores de JS (${errores.length})`);
if (errores.length) console.log(errores.slice(0, 5).join("\n"));
await browser.close();
console.log(fallos ? `${fallos} FALLO(S)` : "TODO EN VERDE");
process.exit(fallos ? 1 : 0);
