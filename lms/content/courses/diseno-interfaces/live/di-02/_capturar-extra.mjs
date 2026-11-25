#!/usr/bin/env node
// Captura escenas NO teoría de di-02 como las serviría el LMS (misma CSP y ruta /comun -> _comun).
// Uso:
//   node lms/content/courses/diseno-interfaces/live/di-02/_capturar-extra.mjs \
//     --live lms/content/courses/diseno-interfaces/live --leccion di-02 --salida <dir>
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const CSP = "default-src 'none'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; " +
  "img-src data: 'self'; font-src data:; connect-src 'self'; frame-src 'self'; media-src 'self'; base-uri 'none'; form-action 'none'";
const TIPOS = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".woff2": "font/woff2",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
};

function leerArgs() {
  const a = { salida: path.join(os.tmpdir(), "di02-extra-capturas"), escenas: [] };
  const v = process.argv.slice(2);
  for (let i = 0; i < v.length; i++) {
    if (v[i] === "--live") a.live = path.resolve(v[++i]);
    else if (v[i] === "--leccion") a.leccion = v[++i];
    else if (v[i] === "--salida") a.salida = path.resolve(v[++i]);
    else if (v[i].startsWith("--")) throw new Error("opción desconocida: " + v[i]);
    else a.escenas.push(v[i].replace(/\/$/, ""));
  }
  if (!a.live || !a.leccion) throw new Error("uso: --live <carpeta live> --leccion <id> [escena ...] [--salida DIR]");
  return a;
}

function cargarPlaywright() {
  const cands = [process.env.PLAYWRIGHT_CORE, "playwright-core", "playwright",
    path.join(os.homedir(), "Documents/qa-taller-kit/pruebas/node_modules/playwright-core")];
  for (const c of cands) {
    if (!c) continue;
    try { return require(c); } catch { /* siguiente */ }
  }
  throw new Error("No encuentro playwright(-core). Instálalo o define PLAYWRIGHT_CORE=<ruta>.");
}

function lanzar(chromium) {
  const cands = [process.env.CHROME, "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"];
  const exe = cands.find(c => c && fs.existsSync(c));
  return chromium.launch(exe ? { executablePath: exe, headless: true } : { headless: true });
}

function resolverFactory(raiz) {
  return ruta => {
    const m = ruta.match(/^\/api\/v1\/live\/([^/]+)\/(escenas\/([^/]+)\/(.+)|comun\/(.+))$/);
    if (!m) return null;
    if (m[5]) return path.join(raiz, "_comun", m[5]);
    return path.join(raiz, m[1], m[3], m[4] === "html" ? "escena.html" : m[4]);
  };
}

function servidor(raiz) {
  const resolver = resolverFactory(raiz);
  return http.createServer((req, res) => {
    const p = decodeURIComponent(new URL(req.url, "http://x").pathname);
    const f = resolver(p);
    if (!f || !path.resolve(f).startsWith(raiz) || !fs.existsSync(f) || !fs.statSync(f).isFile()) {
      res.writeHead(404);
      return res.end("no");
    }
    const tipo = TIPOS[path.extname(f)] || "application/octet-stream";
    const h = { "Content-Type": tipo, "Cache-Control": "no-store" };
    if (tipo.startsWith("text/html")) h["Content-Security-Policy"] = CSP;
    res.writeHead(200, h);
    fs.createReadStream(f).pipe(res);
  });
}

function escuchar(pg, lista, prefijo) {
  pg.on("pageerror", e => lista.push(`${prefijo}: error de JS: ${e.message}`));
  pg.on("console", m => {
    if (m.type() === "error" && !/favicon|Failed to load resource/.test(m.text())) lista.push(`${prefijo}: consola: ${m.text()}`);
  });
}

async function estadoMaquetacion(pg) {
  return await pg.evaluate(() => {
    const E = [];
    const de = document.documentElement;
    if (de.scrollWidth > innerWidth + 1) E.push(`scroll horizontal (${de.scrollWidth}px en ${innerWidth}px)`);
    if (de.scrollHeight > innerHeight + 4) E.push(`no cabe a lo alto: sobran ${de.scrollHeight - innerHeight}px`);
    return E;
  });
}

async function capturar(browser, base, leccion, escena, outDir) {
  const errores = [];
  const url = `${base}/api/v1/live/${leccion}/escenas/${escena}/html`;
  const corto = escena.replace(/[^a-z0-9-]/gi, "").slice(0, 60);
  const foto = async (pg, suf) => {
    const f = path.join(outDir, `${corto}-${suf}.png`);
    await pg.screenshot({ path: f });
    return f;
  };
  const capturas = [];

  for (const tema of ["light", "dark"]) {
    const etiqueta = tema === "light" ? "claro" : "oscuro";
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, colorScheme: tema });
    const pg = await ctx.newPage();
    escuchar(pg, errores, etiqueta);
    await pg.goto(url + "?tema=" + tema, { waitUntil: "load" });
    await pg.waitForTimeout(250);
    (await estadoMaquetacion(pg)).forEach(e => errores.push(`${etiqueta}: ${e}`));
    capturas.push(await foto(pg, etiqueta));
    await ctx.close();
  }

  { // móvil
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const pg = await ctx.newPage();
    escuchar(pg, errores, "móvil");
    await pg.goto(url + "?tema=light", { waitUntil: "load" });
    await pg.waitForTimeout(250);
    (await estadoMaquetacion(pg)).forEach(e => errores.push(`móvil: ${e}`));
    capturas.push(await foto(pg, "movil"));
    await ctx.close();
  }

  return { escena, errores, capturas };
}

(async () => {
  const a = leerArgs();
  const raiz = path.join(a.live, a.leccion);
  if (!fs.existsSync(raiz)) throw new Error("no existe: " + raiz);
  const outDir = a.salida;
  fs.mkdirSync(outDir, { recursive: true });
  const escenas = a.escenas.length ? a.escenas : [
    "01-bienvenida",
    "02-biblioteca-minima",
    "03-que-estado-falta",
    "04-prototipo-navegable",
    "05-copy-con-el-agente",
    "06-prueba-de-pasillo",
    "07-cierre",
  ];
  for (const id of escenas) {
    const f = path.join(raiz, id, "escena.html");
    if (!fs.existsSync(f)) throw new Error("no existe: " + f);
  }
  const srv = servidor(raiz);
  await new Promise(ok => srv.listen(0, "127.0.0.1", ok));
  const base = `http://127.0.0.1:${srv.address().port}`;

  const { chromium } = cargarPlaywright();
  const browser = await lanzar(chromium);

  let errores = 0;
  for (const id of escenas) {
    const r = await capturar(browser, base, a.leccion, id, outDir);
    errores += r.errores.length;
    console.log(`\n== ${id} · ${r.errores.length ? "✗ " + r.errores.length + " errores" : "✓ sin errores"}`);
    r.errores.forEach(e => console.log("  ERROR  " + e));
    r.capturas.forEach(f => console.log("  captura: " + f));
  }
  await browser.close();
  srv.close();
  process.exit(errores ? 1 : 0);
})().catch(e => { console.error(e.message || e); process.exit(2); });
