#!/usr/bin/env node
// Prueba las escenas del curso Excel + IA sin levantar el LMS:
//   node _fuente/probar.mjs [carpeta-capturas] [ex-01 ex-02 …]
// Sirve el curso con las mismas rutas del LMS (/api/v1/live/<lección>/escenas/<id>/html, /comun/, /files/) y con
// Chrome headless (playwright-core de lms/web) para cada escena:
//   · captura a 1366x768 y 390x844, sin desbordes horizontales ni errores de consola;
//   · juega los minijuegos hasta el final (tocando y arrastrando como una persona) y exige el puntaje completo
//     y el POST de evidencia al LMS;
//   · en el caso práctico, elige empresa y descarga el Excel desde un iframe con el mismo sandbox del LIVE.
import http from "node:http";
import { createRequire } from "node:module";
import { readFileSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";

const aqui = dirname(fileURLToPath(import.meta.url));
const curso = dirname(aqui);
const repo = join(curso, "..", "..", "..", "..");
const require = createRequire(join(repo, "lms", "web", "package.json"));
const { chromium } = require("playwright-core");
const CHROME = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const args = process.argv.slice(2);
const salida = args[0] && !args[0].startsWith("ex-") ? args.shift() : null;
const soloLecciones = args;
if (salida) mkdirSync(salida, { recursive: true });

const TIPOS = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ".md": "text/markdown; charset=utf-8" };
const evidencias = [];
const CSP = "default-src 'none'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; img-src data: 'self'; font-src data:; connect-src 'self'; frame-src 'self'; media-src 'self'; base-uri 'none'; form-action 'none'";
const srv = http.createServer((req, res) => {
  const u = new URL(req.url, "http://x");
  let m;
  if (req.method === "POST" && (m = u.pathname.match(/^\/api\/v1\/live\/([^/]+)\/evidencia$/))) {
    let b = ""; req.on("data", (c) => (b += c)); req.on("end", () => { evidencias.push({ leccion: m[1], ...JSON.parse(b) }); res.writeHead(200, { "Content-Type": "application/json" }); res.end('{"ok":true}'); });
    return;
  }
  let f = null, csp = false;
  if ((m = u.pathname.match(/^\/api\/v1\/live\/([^/]+)\/escenas\/([^/]+)\/html$/))) { f = join(curso, "live", m[1], m[2], "escena.html"); csp = true; }
  else if ((m = u.pathname.match(/^\/api\/v1\/live\/([^/]+)\/comun\/([^/]+)$/))) f = join(curso, "live", "_comun", m[2]);
  else if ((m = u.pathname.match(/^\/files\/excel-ia-contabilidad\/(.+)$/))) f = join(curso, decodeURIComponent(m[1]));
  else if (u.pathname === "/marco") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`<!doctype html><meta charset=utf-8><body style="margin:0"><script>window.__msgs=[];addEventListener("message",function(e){window.__msgs.push(e.data)})</script><iframe id=f src="${u.searchParams.get("src")}" sandbox="allow-scripts allow-same-origin" allow="clipboard-write" style="border:0;width:100vw;height:100vh"></iframe>`);
    return;
  }
  if (!f || !existsSync(f) || statSync(f).isDirectory()) { res.writeHead(404); res.end("no"); return; }
  const h = { "Content-Type": TIPOS[extname(f)] || "application/octet-stream" };
  if (csp) h["Content-Security-Policy"] = CSP;
  res.writeHead(200, h);
  res.end(readFileSync(f));
});
await new Promise((r) => srv.listen(0, "127.0.0.1", r));
const BASE = `http://127.0.0.1:${srv.address().port}`;

const lecciones = readdirSync(join(curso, "live")).filter((d) => d.startsWith("ex-") && (!soloLecciones.length || soloLecciones.includes(d))).sort();
const browser = await chromium.launch({ executablePath: CHROME, headless: true });
let fallos = 0;
const informe = [];
const mal = (msg) => { fallos++; console.log("  ✗ " + msg); };

async function jugar(page, cfg, modo, foto) {
  await page.click("[data-jugar]");
  await page.waitForTimeout(250);
  if (foto) await page.screenshot({ path: foto, fullPage: true });
  const tipo = cfg.tipo === "clasificar" ? cfg.modo || "mazo" : cfg.tipo;
  const fin = () => page.$("[data-fin]");
  if (tipo === "mazo" || tipo === "semaforo") {
    let primera = true;
    while (!(await fin())) {
      const k = await page.getAttribute("[data-carta]", "data-item");
      const g = cfg.items[+k].g;
      if (primera && modo === "arrastrar") {
        const a = await page.locator("[data-carta]").boundingBox();
        const b = await page.locator(`[data-grupo="${g}"]`).boundingBox();
        await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
        await page.mouse.down();
        await page.mouse.move(a.x + a.width / 2 + 20, a.y + a.height / 2 + 20, { steps: 4 });
        await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });
        await page.mouse.up();
        primera = false;
      } else await page.click(`[data-grupo="${g}"]`);
    }
  } else if (tipo === "tablero" || tipo === "balanza") {
    for (let k = 0; k < cfg.items.length; k++) {
      if (k === 0 && modo === "arrastrar") {
        const a = await page.locator(`.jj-pool [data-item="${k}"]`).boundingBox();
        const b = await page.locator(`.jj-grupos [data-grupo="${cfg.items[k].g}"] > b`).boundingBox();
        await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
        await page.mouse.down();
        await page.mouse.move(a.x + 30, a.y + 30, { steps: 4 });
        await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });
        await page.mouse.up();
        continue;
      }
      await page.click(`.jj-pool [data-item="${k}"]`);
      await page.click(`.jj-grupos [data-grupo="${cfg.items[k].g}"] > b`);
    }
    await page.click("[data-comprobar]");
  } else if (tipo === "emparejar") {
    for (let k = 0; k < cfg.pares.length; k++) { await page.click(`[data-par="${k}"][data-lado="a"]`); await page.click(`[data-par="${k}"][data-lado="b"]`); }
  } else if (tipo === "ordenar") {
    for (let p = 0; p < cfg.items.length; p++) {
      for (;;) {
        const orden = await page.$$eval(".jj-ord li", (ls) => ls.map((l) => +l.dataset.orig));
        const pos = orden.indexOf(p);
        if (pos === p) break;
        await page.locator(".jj-ord li").nth(pos).locator("[data-sube]").click();
      }
    }
    await page.click("[data-comprobar]");
  } else if (tipo === "contrarreloj") {
    while (!(await fin())) {
      const k = await page.getAttribute("[data-preg]", "data-preg");
      await page.click(`[data-op="${cfg.preguntas[+k].ok}"]`);
    }
  } else if (tipo === "cazar") {
    for (const e of cfg.errores) await page.click(`tr[data-fila="${e.f}"]`);
  } else if (tipo === "formula") {
    const rondas = cfg.rondas || [cfg];
    for (const R of rondas) {
      await page.waitForSelector("[data-comprobar]:not([disabled]), [data-comprobar]");
      for (const t of R.tokens) {
        const ok = await page.evaluate((tok) => { const b = [...document.querySelectorAll(".jj-tile")].find((x) => x.dataset.tok === tok && !x.disabled); if (b) b.click(); return !!b; }, t);
        if (!ok) throw new Error("ficha no encontrada: " + t);
      }
      await page.click("[data-comprobar]");
      await page.waitForTimeout(1300);
    }
  } else if (tipo === "calcular") {
    for (const q of cfg.preguntas) { await page.fill("[data-respuesta]", String(q.r)); await page.click("[data-comprobar]"); await page.waitForTimeout(1650); }
  } else if (tipo === "memoria") {
    for (let k = 0; k < cfg.pares.length; k++) { const bs = page.locator(`.jj-mem [data-par="${k}"]`); await bs.nth(0).click(); await bs.nth(1).click(); await page.waitForTimeout(80); }
  }
  await page.waitForSelector("[data-fin]", { timeout: 8000 });
  return page.getAttribute(".jj[data-fin]", "data-fin");
}

for (const lec of lecciones) {
  console.log(lec);
  const escenas = readdirSync(join(curso, "live", lec)).filter((d) => !d.startsWith("_")).sort();
  for (const esc of escenas) {
    const url = `${BASE}/api/v1/live/${lec}/escenas/${esc}/html`;
    const datos = JSON.parse(readFileSync(join(curso, "live", lec, esc, "escena.html"), "utf8").match(/<script type="application\/json" id="ex-datos">([\s\S]*?)<\/script>/)[1].replace(/<\\\//g, "</"));
    for (const [w, hgt, nombre] of [[1366, 768, "escritorio"], [390, 844, "celular"]]) {
      const ctx = await browser.newContext({ viewport: { width: w, height: hgt }, deviceScaleFactor: 1, hasTouch: nombre === "celular" });
      const page = await ctx.newPage();
      const errores = [];
      page.on("pageerror", (e) => errores.push(e.message));
      page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errores.push(m.text()); });
      page.on("response", (r) => { if (r.status() >= 400 && !/favicon/.test(r.url())) errores.push(r.status() + " " + r.url()); });
      await page.goto(url);
      await page.waitForTimeout(700);
      const med = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, sh: document.documentElement.scrollHeight, ch: innerHeight }));
      if (med.sw > med.cw + 1) mal(`${esc} ${nombre}: desborde horizontal ${med.sw} > ${med.cw}`);
      const altoMal = nombre === "escritorio" && med.sh > med.ch + 4;
      if (salida) await page.screenshot({ path: join(salida, `${lec}-${esc}-${nombre}.png`), fullPage: nombre === "celular" });
      if (datos.juego) {
        const ev0 = evidencias.length;
        try {
          const r = await jugar(page, datos.juego, nombre === "escritorio" ? "arrastrar" : "tocar", salida ? join(salida, `${lec}-${esc}-${nombre}-jugando.png`) : null);
          const [a, t] = r.split("/").map(Number);
          if (a !== t) mal(`${esc} ${nombre}: juego ${datos.juego.id} terminó ${r} jugando perfecto`);
          informe.push(`${lec} ${esc} ${nombre} ${datos.juego.id} (${datos.juego.tipo}${datos.juego.modo ? "/" + datos.juego.modo : ""}): ${r}`);
          if (salida && nombre === "escritorio") await page.screenshot({ path: join(salida, `${lec}-${esc}-${nombre}-fin.png`) });
        } catch (e) { mal(`${esc} ${nombre}: el juego falló: ${e.message.split("\n")[0]}`); }
        // Las evidencias solo se envían dentro del LMS (ruta /api/v1/live/): aquí la escena sí corre en esa ruta.
        if (evidencias.length === ev0) mal(`${esc} ${nombre}: no envió evidencia al LMS`);
        else if (evidencias.at(-1).escena !== esc || evidencias.at(-1).tipo !== "hallazgo") mal(`${esc}: evidencia rara ${JSON.stringify(evidencias.at(-1))}`);
      }
      if (errores.length) mal(`${esc} ${nombre}: errores de consola: ${errores.join(" | ")}`);
      console.log(`  ${errores.length ? "✗" : "✓"} ${esc} ${nombre} ${med.sw}x${med.sh}${altoMal ? " (alto " + med.sh + " > " + med.ch + ": pide scroll)" : ""}`);
      await ctx.close();
    }
    if (datos.tipo === "caso") {
      const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true });
      const page = await ctx.newPage();
      await page.goto(`${BASE}/marco?src=${encodeURIComponent(`/api/v1/live/${lec}/escenas/${esc}/html`)}`);
      const fr = page.frameLocator("#f");
      await fr.locator("#ex-empresa").selectOption("E07");
      const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 5000 }).catch(() => null), fr.locator("#ex-descargar").click()]);
      if (!dl) mal(`${esc}: la descarga no arrancó desde el iframe con sandbox`);
      else {
        const esperado = `${lec}-E07-clinica-santa-lucia.xlsx`;
        if (dl.suggestedFilename() !== esperado) mal(`${esc}: descargó ${dl.suggestedFilename()}`);
        const p = await dl.path();
        if (!p || statSync(p).size < 4000) mal(`${esc}: el Excel descargado está vacío`);
        else console.log(`  ✓ ${esc} descarga ${esperado} (${statSync(p).size} B)`);
      }
      const n = await fr.locator("[data-dsh-abrir]").count();
      if (n !== 1) mal(`${esc}: falta el botón «Abrir DeepSeek Harness»`);
      await fr.locator("[data-dsh-abrir]").click();
      await page.waitForTimeout(2300);
      const msg = await fr.locator(".dsh-msg").textContent();
      if (!/pestaña nueva/i.test(msg)) mal(`${esc}: el botón dsh no dejó mensaje (${msg})`);
      await fr.locator("[data-dsh-clave]").click();
      await page.waitForTimeout(300);
      const msgs = await page.evaluate(() => window.__msgs.map((m) => m && m.tipo));
      if (!msgs.includes("abrir-dsh") || !msgs.includes("dsh-clave")) mal(`${esc}: el LIVE no recibió abrir-dsh / dsh-clave (${msgs})`);
      await ctx.close();
    }
  }
}
await browser.close();
srv.close();
console.log("\n" + informe.join("\n"));
console.log(fallos ? `\n${fallos} fallo(s)` : `\nTodo en verde: ${lecciones.length} sesiones`);
process.exit(fallos ? 1 : 0);
