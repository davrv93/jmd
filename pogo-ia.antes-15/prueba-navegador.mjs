// Prueba de punta a punta en Chrome (Playwright), contra el servidor local.
//   node prueba-navegador.mjs [http://127.0.0.1:18600/]
// Usa los ganchos de ?prueba=1 para poner un chip donde cae el robot y acabar
// la ronda, y lee la respuesta correcta del estado local (datos/estado.json),
// que el navegador nunca recibe.
import pw from "/Users/david.roncal/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.js";
const { chromium } = pw;
import { readFileSync, mkdirSync } from "node:fs";

const URL_BASE = process.argv[2] || "http://127.0.0.1:18600/";
const DIR = new URL("./capturas/", import.meta.url).pathname;
const ESTADO = new URL(process.argv[2] && process.argv[2].includes("/clase/") ? "./datos/estado-clase.json" : "./datos/estado.json", import.meta.url).pathname;
mkdirSync(DIR, { recursive: true });

let fallos = 0;
const ok = (cond, msg) => { console.log(`${cond ? "PASS" : "FAIL"} · ${msg}`); if (!cond) fallos++; };

function correcta(nombre) {
  const e = JSON.parse(readFileSync(ESTADO, "utf8"));
  const j = e.jugadores.find((x) => x.nombre === nombre);
  const p = j.partidas[j.partidas.length - 1];
  return p.preguntas[p.preguntas.length - 1].correcta;
}

const esperarRonda = (page) => page.waitForFunction(() => window.__pogo.J && window.__pogo.J.corriendo && !window.__pogo.J.pausa, null, { timeout: 8000 });

async function chipYResponder(page, nombre, bien, foto) {
  await page.evaluate(() => { window.__pogo.forzar("pregunta"); window.__pogo.poderDondeCaes("chip"); });
  await page.waitForSelector("#pregunta:not([hidden])", { timeout: 5000 });
  const txt = await page.textContent("#pTexto");
  const ops = await page.$$eval("#pOps button", (bs) => bs.length);
  ok(txt.length > 5 && ops === 3, `salta al chip → pregunta con 3 opciones: «${txt}»`);
  ok(await page.evaluate(() => window.__pogo.J.pausa), "el juego queda en pausa durante la pregunta");
  if (foto) await page.screenshot({ path: DIR + foto });
  const k = correcta(nombre);
  await page.click(`#pOps button[data-k="${bien ? k : (k + 1) % 3}"]`);
  await page.waitForSelector("#pExp:not([hidden])");
  const exp = await page.textContent("#pExp");
  ok(bien ? exp.includes("¡Correcto!") : exp.includes("No era esa"), `respuesta ${bien ? "correcta" : "incorrecta"} → «${exp.slice(0, 60)}…»`);
  const leer = () => page.evaluate(() => { const m = window.__pogo.J.m; let v = 0; m.dueno.forEach((d, k) => { if (d === 0) v += m.valor[k]; }); return { pintadas: v, banco: m.banco[0] }; });
  const antes = await leer();
  await page.click("#pSeguir");
  const despues = await leer();
  const mareado = await page.evaluate(() => window.__pogo.J.m.robots[0].mareo > 0);
  ok(bien ? despues.pintadas === 0 && despues.banco === antes.banco + antes.pintadas && antes.pintadas > 0 : mareado,
    bien ? `cobrar: ${antes.pintadas} casillas pasan al banco (${antes.banco} → ${despues.banco}) y el tablero queda sin tu color` : "fallar marea al robot");
  if (foto) { await page.waitForTimeout(250); await page.screenshot({ path: DIR + foto.replace(".png", "-despues.png") }); }
}

async function partidaCompleta(page, nombre, sufijo, movil) {
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errores.push(m.text()); });
  await page.goto(URL_BASE + "?prueba=1");
  await page.waitForTimeout(1500);
  await page.screenshot({ path: DIR + `01-inicio-${sufijo}.png`, fullPage: true });
  const ancho = await page.evaluate(() => document.documentElement.scrollWidth);
  ok(ancho <= page.viewportSize().width, `sin barra horizontal en el inicio (${ancho})`);
  await page.fill("#nombre", nombre);
  await page.click("#quiero");
  await page.waitForSelector("#juego:not([hidden])");
  await page.waitForTimeout(300);
  await page.screenshot({ path: DIR + `02-fight-${sufijo}.png` });
  await esperarRonda(page);

  const c0 = await page.evaluate(() => window.__pogo.J.m.robots[0].c);
  if (movil) {
    ok(await page.isVisible("#cruz"), "cruz visible en el celular");
    const b = await page.$('#cruz [data-dir="derecha"]');
    const bb = await b.boundingBox();
    await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await page.mouse.down();
    await page.waitForTimeout(900);
    await page.screenshot({ path: DIR + `03-juego-${sufijo}.png` });
    await page.mouse.up();
  } else {
    await page.keyboard.down("ArrowRight"); await page.waitForTimeout(900);
    await page.screenshot({ path: DIR + `03-juego-${sufijo}.png` });
    await page.keyboard.up("ArrowRight");
  }
  const c1 = await page.evaluate(() => window.__pogo.J.m.robots[0].c);
  ok(c1 > c0, `el robot rebota a la derecha (columna ${c0} → ${c1})`);
  const mias = await page.evaluate(() => window.__pogo.J.m.dueno.filter((d) => d === 0).length);
  ok(mias >= 2, `pinta casillas al caer (${mias})`);

  // Rendimiento: 4 s de juego. Intervalo entre cuadros dibujados y tiempo de JS por cuadro (simulación + dibujo).
  const rend = await page.evaluate(() => new Promise((listo) => {
    const t0 = performance.now(), cuadros = [];
    let previo = 0;
    (function mirar(t) {
      if (previo) cuadros.push(t - previo);
      previo = t;
      if (t - t0 < 4000) requestAnimationFrame(mirar);
      else {
        cuadros.sort((a, b) => a - b);
        listo({ n: cuadros.length, p50: cuadros[cuadros.length >> 1].toFixed(1), p95: cuadros[Math.floor(cuadros.length * 0.95)].toFixed(1), js: window.__pogo.msPorCuadro().toFixed(2) });
      }
    })(t0);
  }));
  console.log(`  rendimiento ${sufijo}: ${rend.n} refrescos en 4 s, intervalo p50 ${rend.p50} ms, p95 ${rend.p95} ms, JS ${rend.js} ms por cuadro dibujado`);
  ok(+rend.js < 8, `JS por cuadro bajo (${rend.js} ms)`);

  await chipYResponder(page, nombre, true, `04-chip-${sufijo}.png`);
  await esperarRonda(page);
  await chipYResponder(page, nombre, false, null);
  await esperarRonda(page);

  // Poderes sin pregunta.
  const tomar = async (tipo) => {
    await page.evaluate((t) => { window.__pogo.forzar("libre"); window.__pogo.poderDondeCaes(t); }, tipo);
    await page.waitForFunction(() => window.__pogo.J.m.poderes.length === 0, null, { timeout: 4000 });
    ok(await page.evaluate(() => document.querySelector("#pregunta").hidden), `${tipo} sin pregunta: no abre la pregunta`);
  };
  await page.evaluate(() => { window.__pogo.J.m.robots[0].mareo = 0; });
  await tomar("turbo");
  const turbo = await page.evaluate(() => window.__pogo.J.m.robots[0].turbo);
  ok(turbo > 4, `turbo activo (${turbo.toFixed(1)} s) y en el marcador: «${await page.textContent("#hPoder")}»`);
  await tomar("triple");
  await page.waitForTimeout(700);
  const triples = await page.evaluate(() => { const m = window.__pogo.J.m; return m.dueno.filter((d, k) => d === 0 && m.valor[k] === 3).length; });
  ok(triples >= 1 && (await page.evaluate(() => window.__pogo.J.m.robots[0].turbo === 0)), `triple: ${triples} casilla(s) valen ×3 y quita el turbo`);
  if (movil) await page.screenshot({ path: DIR + `08-triple-${sufijo}.png` });
  await tomar("cohete");
  ok(await page.evaluate(() => window.__pogo.J.m.robots[0].cohetes === 1), "cohete guardado");
  if (movil) {
    ok(await page.isVisible("#disparar"), "botón del cohete visible en el celular");
    await page.tap("#disparar", { force: true });
  } else await page.keyboard.press("Space");
  await page.waitForTimeout(250);
  if (!movil) await page.screenshot({ path: DIR + `08-cohete-${sufijo}.png` });
  await page.waitForTimeout(800);
  const aturdidos = await page.evaluate(() => window.__pogo.J.m.robots.slice(1).filter((r) => r.mareo > 0).length);
  ok(aturdidos >= 1 && (await page.evaluate(() => window.__pogo.J.m.robots[0].cohetes === 0)), `el cohete aturde a un rival (${aturdidos})`);
  await tomar("balde");
  const mesa = await page.evaluate(() => window.__pogo.J.m.dueno.filter((d) => d === 0).length);
  ok(mesa >= 78, `balde: la mesa queda de tu color (${mesa}/81)`);
  await page.waitForTimeout(200);
  await page.screenshot({ path: DIR + `09-balde-${sufijo}.png` });

  for (let r = 1; r <= 3; r++) {
    if (r > 1) { await esperarRonda(page); }
    if (r === 1) await page.evaluate(() => window.__pogo.pintarTodo());
    await page.evaluate(() => window.__pogo.acabar());
    await page.waitForSelector("#cBtn:not([hidden])", { timeout: 5000 });
    const t = await page.textContent("#cT");
    if (r === 1) { ok(t.includes("Ganaste"), `ronda 1 con todo pintado: «${t}»`); await page.screenshot({ path: DIR + `05-fin-ronda-${sufijo}.png` }); }
    await page.click("#cBtn");
  }
  await page.waitForSelector("#resultado:not([hidden])", { timeout: 5000 });
  await page.waitForTimeout(400);
  const total = await page.textContent("#rTotal");
  const desg = await page.textContent("#rDesglose");
  ok(/\d/.test(total), `puntaje guardado: ${total} · ${desg.replace(/\s+/g, " ").slice(0, 120)}`);
  await page.screenshot({ path: DIR + `06-resultado-${sufijo}.png`, fullPage: true });
  ok(errores.length === 0, `sin errores en la consola${errores.length ? ": " + errores.join(" | ") : ""}`);
}

const navegador = await chromium.launch({ channel: "chrome" });
const esc = await navegador.newContext({ viewport: { width: 1280, height: 800 } });
await partidaCompleta(await esc.newPage(), "Ana Pérez", "escritorio", false);
const cel = await navegador.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await partidaCompleta(await cel.newPage(), "Luis Ramos", "celular", true);
// Embebido desde el LIVE: entra inscrito con ?n= y ?u=.
const live = await navegador.newContext({ viewport: { width: 900, height: 700 } });
const pl = await live.newPage();
await pl.goto(URL_BASE + "?lms=1&n=" + encodeURIComponent("Rosa Díaz") + "&u=cuenta-77");
await pl.waitForSelector("#listo:not([hidden])", { timeout: 5000 });
ok((await pl.textContent("#nom")) === "Rosa Díaz", "desde el LIVE entra inscrita con su nombre");
await pl.screenshot({ path: DIR + "07-embebido.png" });
const rk = await (await live.newPage()).goto(URL_BASE + "ranking");
ok(rk.ok(), "ranking en pantalla grande responde");
await navegador.close();
console.log(fallos ? `\n${fallos} FALLO(S)` : "\nTODO PASA");
process.exit(fallos ? 1 : 0);
