// pruebas/smoke-ui.mjs: prueba ligera de la bandeja en un navegador real.
// NO corre dentro del aula (no hay navegador). Córrela en una laptop con Node 18+ o Bun:
//   npm i -D playwright && npx playwright install chromium     (o CHROME=/ruta/a/chrome con playwright-core)
//   node pruebas/smoke-ui.mjs                 # con datos falsos, sin backend
//   BACKEND=http://localhost:8766 node pruebas/smoke-ui.mjs   # contra tu backend real
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

let pw;
try { pw = await import("playwright"); } catch { pw = await import("playwright-core"); }
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BACKEND = process.env.BACKEND ?? "";
const TIPOS = { ".html": "text/html", ".js": "text/javascript", ".svg": "image/svg+xml", ".css": "text/css", ".json": "application/json" };

// Datos falsos: una conversación con dos mensajes.
let modo = "bot";
const falsos = {
  "GET /conversaciones": () => [{ id: 1, nombre: "Ana", jid: "000000000001@s.whatsapp.net", modo, no_leidos: 1, ultimo: "¿Hacen delivery?" }],
  "GET /mensajes": () => [{ id: 1, autor: "cliente", texto: "¿Hacen delivery?", estado: "ok" }, { id: 2, autor: "bot", texto: "Sí, en Miraflores.", estado: "ok" }],
  "GET /whatsapp/estado": () => ({ conectado: true, sesion: true, nombre: "Tienda" }),
  "POST /conversaciones/1/modo": (b) => ({ id: 1, modo: (modo = b.modo) }),
  "POST /enviar": (b) => ({ id: 3, autor: "humano", texto: b.texto, estado: "ok" }),
};

// Imita al visor: /vista/demo/chatbot/... son archivos; /vista/demo/api/... va al backend.
const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  if (url.pathname.startsWith("/vista/demo/api/")) {
    const ruta = url.pathname.slice("/vista/demo/api".length);
    let cuerpo = ""; for await (const c of req) cuerpo += c;
    if (BACKEND) {
      const r = await fetch(BACKEND + "/api" + ruta + url.search, { method: req.method, headers: { "Content-Type": "application/json" }, body: req.method === "POST" ? cuerpo : undefined });
      res.writeHead(r.status, { "Content-Type": "application/json" }); return res.end(await r.text());
    }
    const f = falsos[`${req.method} ${ruta}`];
    res.writeHead(f ? 200 : 404, { "Content-Type": "application/json" });
    return res.end(JSON.stringify(f ? f(cuerpo ? JSON.parse(cuerpo) : {}) : { error: "no existe" }));
  }
  const archivo = path.join(RAIZ, url.pathname.replace(/^\/vista\/demo\/chatbot\/?/, "") || "index.html");
  if (!archivo.startsWith(RAIZ) || !fs.existsSync(archivo)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "Content-Type": TIPOS[path.extname(archivo)] ?? "text/plain" });
  fs.createReadStream(archivo).pipe(res);
}).listen(0);
const BASE = `http://localhost:${servidor.address().port}/vista/demo/chatbot/index.html`;

const fallos = [];
const revisar = (ok, que) => { console.log(`${ok ? "PASA " : "FALLA"}  ${que}`); if (!ok) fallos.push(que); };
const navegador = await pw.chromium.launch({ executablePath: process.env.CHROME || undefined });
try {
  const pagina = await navegador.newPage({ viewport: { width: 1280, height: 800 } });
  const errores = []; pagina.on("pageerror", (e) => errores.push(e.message));
  await pagina.goto(BASE);
  await pagina.locator("bot-bandeja li button").first().waitFor({ timeout: 15000 });
  revisar(await pagina.locator("bot-bandeja li").count() >= 1, "la bandeja lista al menos una conversación");
  await pagina.locator("bot-bandeja li button").first().click();
  await pagina.locator("bot-chat .m").first().waitFor({ timeout: 5000 });
  revisar(await pagina.locator("bot-chat [role=log] .m").count() >= 1, "al abrirla se ven sus mensajes en role=log");
  const interruptor = pagina.locator("bot-chat [role=switch]");
  const antes = await interruptor.getAttribute("aria-checked");
  await interruptor.click();
  await pagina.waitForTimeout(500);
  revisar(antes !== (await interruptor.getAttribute("aria-checked")), "el interruptor bot/persona cambia aria-checked");
  revisar(await pagina.locator("bot-qr [role=status]").count() === 1, "el estado del número se anuncia (role=status)");
  await pagina.setViewportSize({ width: 393, height: 800 });
  await pagina.goto(BASE);
  await pagina.locator("bot-bandeja li button").first().waitFor({ timeout: 15000 });
  const ancho = await pagina.evaluate(() => document.documentElement.scrollWidth);
  revisar(ancho <= 393, `a 393 px no hay desborde horizontal (scrollWidth=${ancho})`);
  await pagina.locator("bot-bandeja li button").first().click();
  revisar(await pagina.locator("bot-app .volver").isVisible(), "en el teléfono aparece «Volver a la bandeja»");
  await pagina.screenshot({ path: path.join(RAIZ, "pruebas", "captura-393.png") });
  revisar(errores.length === 0, `sin errores de JavaScript ${errores.join(" | ")}`);
} finally {
  await navegador.close(); servidor.close();
}
console.log(fallos.length ? `\n${fallos.length} fallo(s)` : "\nTodo PASA");
process.exit(fallos.length ? 1 : 0);
