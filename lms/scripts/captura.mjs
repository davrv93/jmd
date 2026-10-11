// Captura una página a PNG. Uso:
//   node lms/scripts/captura.mjs <url> <ancho>x<alto> <salida.png> [light|dark] [--reducido] [--espera=1500]
//     [--login=correo:clave] [--base=http://localhost:8095]
// Con --login entra con esa cuenta (cookie de sesión) antes de abrir la URL. Ejemplo:
//   node lms/scripts/captura.mjs /api/v1/live/pa-02/escenas/00-prueba/html?tema=dark 1920x1080 /tmp/a.png dark \
//     --login=instructor@local.test:local-1234
import { chromium, CHROME } from "./_pw.mjs";

const [url, tam, salida, tema = "light", ...resto] = process.argv.slice(2);
if (!url || !tam || !salida) {
  console.error("uso: captura.mjs <url> <ancho>x<alto> <salida.png> [light|dark] [--reducido] [--espera=ms] [--login=correo:clave] [--base=url]");
  process.exit(2);
}
const opt = Object.fromEntries(resto.map((a) => a.replace(/^--/, "").split("=")).map(([k, v]) => [k, v ?? true]));
const [ancho, alto] = tam.split("x").map(Number);
const base = opt.base || "http://localhost:8095";

const b = await chromium.launch({ executablePath: CHROME });
const ctx = await b.newContext({
  viewport: { width: ancho, height: alto },
  colorScheme: tema === "dark" ? "dark" : "light",
  reducedMotion: opt.reducido ? "reduce" : "no-preference",
});
if (opt.login) {
  const [email, ...p] = String(opt.login).split(":");
  const r = await ctx.request.post(base + "/api/v1/auth/login", { data: { email, password: p.join(":") } });
  if (!r.ok()) { console.error("login falló:", r.status()); process.exit(1); }
}
const page = await ctx.newPage();
const errores = [];
page.on("console", (m) => { if (m.type() === "error") errores.push(m.text().slice(0, 160)); });
page.on("pageerror", (e) => errores.push("pageerror: " + e.message.slice(0, 160)));
await page.goto(url.startsWith("http") ? url : base + url, { waitUntil: "load" });
await page.waitForTimeout(Number(opt.espera) || 1500);
await page.screenshot({ path: salida });
const desborde = await page.evaluate(() => ({
  x: document.documentElement.scrollWidth > innerWidth + 1,
  y: document.documentElement.scrollHeight > innerHeight + 1,
}));
console.log(`${salida} ${ancho}x${alto} ${tema}${opt.reducido ? " reducido" : ""} | desborde: x=${desborde.x} y=${desborde.y} | errores de consola: ${errores.length}`);
errores.forEach((e) => console.log("  !", e));
await b.close();
