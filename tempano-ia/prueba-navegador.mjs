// Prueba de punta a punta en Chrome (Playwright), contra el servidor local.
//   node prueba-navegador.mjs [http://127.0.0.1:18590/]
// Usa los ganchos de ?prueba=1 para tirar al osito al agua a propósito y lee
// la respuesta correcta del estado local (datos/estado.json), que el
// navegador nunca recibe.
import pw from "/Users/david.roncal/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.js";
const { chromium } = pw;
import { readFileSync, mkdirSync } from "node:fs";

const URL_BASE = process.argv[2] || "http://127.0.0.1:18590/";
const DIR = new URL("./capturas/", import.meta.url).pathname;
const ESTADO = new URL("./datos/estado.json", import.meta.url).pathname;
mkdirSync(DIR, { recursive: true });

let fallos = 0;
const ok = (cond, msg) => { console.log(`${cond ? "PASS" : "FAIL"} · ${msg}`); if (!cond) fallos++; };

function correcta(nombre) {
  const e = JSON.parse(readFileSync(ESTADO, "utf8"));
  const j = e.jugadores.find((x) => x.nombre === nombre);
  const p = j.partidas[j.partidas.length - 1];
  return p.preguntas[p.preguntas.length - 1].correcta;
}

async function esperarRonda(page) {
  await page.waitForFunction(() => window.__tempano.J && window.__tempano.J.corriendo, null, { timeout: 8000 });
}

async function caerYResponder(page, nombre, bien, foto) {
  await page.evaluate(() => window.__tempano.alAgua());
  await page.waitForSelector("#pregunta:not([hidden])", { timeout: 5000 });
  const txt = await page.textContent("#pTexto");
  const ops = await page.$$eval("#pOps button", (bs) => bs.length);
  ok(txt.length > 5 && ops === 3, `cae al agua → pregunta con 3 opciones: «${txt}»`);
  const enPausa = await page.evaluate(() => window.__tempano.J.pausa);
  ok(enPausa, "el juego queda en pausa durante la pregunta");
  if (foto) await page.screenshot({ path: DIR + foto });
  const k = correcta(nombre);
  const elegir = bien ? k : (k + 1) % 3;
  await page.click(`#pOps button[data-k="${elegir}"]`);
  await page.waitForSelector("#pExp:not([hidden])");
  const exp = await page.textContent("#pExp");
  ok(bien ? exp.includes("¡Correcto!") : exp.includes("No era esa"), `respuesta ${bien ? "correcta" : "incorrecta"} → «${exp.slice(0, 60)}…»`);
  if (foto) await page.screenshot({ path: DIR + foto.replace(".png", "-respuesta.png") });
  await page.click("#pSeguir");
}

async function partidaCompleta(page, nombre, sufijo, movil) {
  await page.goto(URL_BASE + "?prueba=1");
  await page.waitForTimeout(900);
  await page.screenshot({ path: DIR + `01-inicio-${sufijo}.png`, fullPage: true });
  const ancho = await page.evaluate(() => document.documentElement.scrollWidth);
  const vw = page.viewportSize().width;
  ok(ancho <= vw, `sin barra horizontal en el inicio (${ancho} ≤ ${vw})`);
  // Nombre obligatorio.
  await page.click("#quiero");
  const valido = await page.$eval("#nombre", (i) => i.checkValidity());
  ok(!valido, "sin nombre no deja jugar");
  await page.fill("#nombre", nombre);
  await page.click("#quiero");
  await page.waitForSelector("#juego:not([hidden])");
  await esperarRonda(page);

  // Movimiento: teclado o palanca.
  const x0 = await page.evaluate(() => window.__tempano.J.m.osos[0].x);
  if (movil) {
    const zona = await page.$("#zonaPalanca");
    ok(await zona.isVisible(), "palanca visible en el celular");
    const b = await zona.boundingBox();
    const cx = b.x + 90, cy = b.y + b.height - 90;
    await page.mouse.move(cx, cy); await page.mouse.down();
    await page.mouse.move(cx + 25, cy, { steps: 3 }); await page.mouse.move(cx + 50, cy, { steps: 3 });
    await page.waitForTimeout(450);
    await page.screenshot({ path: DIR + `02-juego-${sufijo}.png` });
    await page.mouse.up();
  } else {
    await page.keyboard.down("ArrowRight"); await page.waitForTimeout(450);
    await page.screenshot({ path: DIR + `02-juego-${sufijo}.png` });
    await page.keyboard.up("ArrowRight");
  }
  const x1 = await page.evaluate(() => window.__tempano.J.m.osos[0].x);
  ok(x1 > x0 + 10, `el osito se mueve a la derecha (${x0.toFixed(0)} → ${x1.toFixed(0)})`);

  // Desde aquí los rivales se quedan quietos: lo que se prueba es la mecánica.
  await page.evaluate(() => window.__tempano.calmar());
  // Embestida y su espera.
  await page.waitForTimeout(300);
  if (movil) await page.tap("#embestir"); else await page.keyboard.press("Space");
  await page.waitForTimeout(80);
  const cd = await page.evaluate(() => window.__tempano.J.m.osos[0].cd);
  ok(cd > 0.8 && cd <= 1.2, `embestida con espera de 1,2 s (queda ${cd.toFixed(2)} s)`);
  const espera = await page.$eval("#embestir", (b) => b.classList.contains("espera"));
  ok(espera, "el botón de embestir muestra la espera");

  // Choque: dos ositos se encuentran y el golpeado sale disparado.
  await page.evaluate(() => window.__tempano.juntar());
  await page.waitForTimeout(120);
  const v1 = await page.evaluate(() => window.__tempano.J.m.osos[1].vx);
  ok(v1 > 40, `choque: el otro osito sale empujado (vx = ${v1.toFixed(0)})`);

  // Ronda 1: cae, acierta (vuelve al centro), cae otra vez y falla (fuera).
  await caerYResponder(page, nombre, true, `03-pregunta-${sufijo}.png`);
  const o = await page.evaluate(() => { const o = window.__tempano.J.m.osos[0]; return { x: o.x, y: o.y, inv: o.inv, vivo: o.vivo, cayendo: o.cayendo }; });
  ok(o.vivo && o.cayendo < 0 && Math.hypot(o.x, o.y) < 60 && o.inv > 0.8, `acierto → vuelve al centro con escudo (${Math.hypot(o.x, o.y).toFixed(0)} px, ${o.inv.toFixed(2)} s)`);
  await page.waitForTimeout(400);
  await page.screenshot({ path: DIR + `04-rescatado-${sufijo}.png` });
  await page.waitForTimeout(1300); // que se acabe el escudo
  await caerYResponder(page, nombre, false, null);
  await page.waitForSelector("#cBtn:not([hidden])", { timeout: 4000 });
  ok((await page.textContent("#cT")).includes("Al agua"), "fallo → fuera de la ronda («Al agua»)");
  await page.screenshot({ path: DIR + `05-fin-ronda-${sufijo}.png` });
  await page.click("#cBtn");

  // Ronda 2: gana (los tres rivales al agua).
  await esperarRonda(page);
  await page.waitForTimeout(800);
  await page.evaluate(() => { window.__tempano.calmar(); window.__tempano.ganar(); });
  await page.waitForSelector("#cBtn:not([hidden])", { timeout: 5000 });
  ok((await page.textContent("#cT")).includes("Ganaste"), "rivales al agua → «¡Ganaste la ronda!»");
  await page.click("#cBtn");

  // Ronda 3: cae y deja que se acabe el tiempo de la pregunta (12 s).
  await esperarRonda(page);
  await page.evaluate(() => { window.__tempano.calmar(); window.__tempano.alAgua(); });
  await page.waitForSelector("#pregunta:not([hidden])");
  await page.waitForSelector("#pExp:not([hidden])", { timeout: 15000 });
  ok((await page.textContent("#pExp")).includes("Se acabó el tiempo"), "sin responder en 12 s → tiempo agotado");
  await page.click("#pSeguir");
  await page.waitForSelector("#cBtn:not([hidden])", { timeout: 4000 });
  ok((await page.textContent("#cBtn")).includes("puntaje"), "tras la ronda 3 ofrece ver el puntaje");
  await page.click("#cBtn");
  await page.waitForSelector("#resultado:not([hidden])", { timeout: 5000 });
  await page.waitForTimeout(900);
  const total = Number((await page.textContent("#rTotal")).replace(/\D/g, ""));
  const des = await page.textContent("#rDesglose");
  ok(total >= 1000 + 300 && des.includes("Rondas ganadas: 1") && des.includes("Rescates acertados: 1"), `puntaje: ${total} (${des.replace(/\s+/g, " ").slice(0, 120)})`);
  const rk = await page.textContent("#ranking");
  const part = ["de", "del", "la", "las", "los", "y"];
  const pal = nombre.split(" ").filter((p) => !part.includes(p.toLowerCase()));
  const ini = pal.map((p) => p[0].toUpperCase() + ".").join(" ");
  ok(rk.includes(ini) && !rk.includes(pal[pal.length - 1]), `el ranking muestra «${ini}» y no el apellido`);
  await page.screenshot({ path: DIR + `06-resultado-${sufijo}.png`, fullPage: true });
}

const browser = await chromium.launch({ channel: "chrome" });
const errores = [];
for (const [sufijo, opts, nombre, movil] of [
  ["escritorio", { viewport: { width: 1280, height: 800 } }, "Ana Prueba", false],
  ["celular", { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, "Beto de la Nieve", true],
]) {
  console.log(`\n== ${sufijo} ==`);
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  page.on("console", (m) => { if (m.type() === "error") errores.push(`${sufijo}: ${m.text()}`); });
  page.on("pageerror", (e) => errores.push(`${sufijo}: ${e.message}`));
  try { await partidaCompleta(page, nombre, sufijo, movil); }
  catch (e) { ok(false, `excepción: ${e.message}`); await page.screenshot({ path: DIR + `error-${sufijo}.png` }); }
  await ctx.close();
}

// Ranking en pantalla grande.
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errores.push(`ranking: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error") errores.push(`ranking: ${m.text()}`); });
  await page.goto(URL_BASE + "ranking");
  await page.waitForSelector("#tabla li", { timeout: 6000 });
  await page.waitForTimeout(700);
  const filas = await page.$$eval("#tabla li", (l) => l.map((x) => x.textContent));
  ok(filas.length >= 2 && filas.every((f) => !/Prueba|Nieve/.test(f)), `ranking grande: ${filas.length} filas, solo iniciales`);
  await page.screenshot({ path: DIR + "07-ranking-pantalla.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: DIR + "08-ranking-celular.png", fullPage: true });
  await ctx.close();
}
await browser.close();
const errs = errores.filter((e) => !/fonts\.g/.test(e));
ok(errs.length === 0, `sin errores de JS en la consola${errs.length ? ": " + errs.join(" | ") : ""}`);
console.log(`\n${fallos ? "FALLARON " + fallos : "TODO EN VERDE"}`);
process.exit(fallos ? 1 : 0);
