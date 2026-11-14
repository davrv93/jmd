// Captura escenas LIVE reales de un curso (las diapositivas de la clase) para ilustrar su brochure.
// Uso: node capturar.mjs <curso> <carpeta-salida> <leccion/escena>...   (sin escenas: reparte 6 candidatas)
import { chromium, CHROME } from "../lms/scripts/_pw.mjs";
import fs from "node:fs"; import path from "node:path";
const [curso, salida, ...pedidas] = process.argv.slice(2);
const raiz = path.resolve("../lms/content/courses", curso, "live");
const tipos = { ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".webp": "image/webp", ".svg": "image/svg+xml", ".woff2": "font/woff2" };
let escenas = pedidas;
if (!escenas.length) {
  const todas = [];
  for (const l of fs.readdirSync(raiz).filter((d) => !d.startsWith("_")).sort())
    for (const e of fs.readdirSync(path.join(raiz, l)).sort()) if (fs.existsSync(path.join(raiz, l, e, "escena.html"))) todas.push(`${l}/${e}`);
  const n = Math.min(6, todas.length);
  escenas = Array.from({ length: n }, (_, i) => todas[Math.round(i * (todas.length - 1) / Math.max(1, n - 1))]);
}
fs.mkdirSync(salida, { recursive: true });
const b = await chromium.launch({ executablePath: CHROME, headless: true });
const ctx = await b.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1.25, colorScheme: "light" });
await ctx.route("**/*", (r) => {
  const u = new URL(r.request().url());
  let m = u.pathname.match(/^\/api\/v1\/live\/([^/]+)\/escenas\/([^/]+)\/(.+)$/), f = null;
  if (m) f = path.join(raiz, m[1], m[2], m[3] === "html" ? "escena.html" : m[3]);
  else if ((m = u.pathname.match(/^\/api\/v1\/live\/([^/]+)\/comun\/(.+)$/))) f = path.join(raiz, "_comun", m[2]);
  if (!f || !fs.existsSync(f)) return r.fulfill({ status: 404, contentType: "application/json", body: "{}" });
  r.fulfill({ body: fs.readFileSync(f), contentType: f.endsWith(".html") ? "text/html" : tipos[path.extname(f)] || "application/octet-stream" });
});
for (const [i, e] of escenas.entries()) {
  const p = await ctx.newPage();
  const [l, id] = e.split("/");
  await p.goto(`http://clase.local/api/v1/live/${l}/escenas/${id}/html?tema=light`, { waitUntil: "load" }).catch(() => {});
  await p.waitForTimeout(1600);
  await p.screenshot({ path: path.join(salida, pedidas.length ? `${curso}--${l}--${id}.png` : `${curso}--${String(i + 1).padStart(2, "0")}--${id}.png`) });
  await p.close();
}
await b.close();
console.log(curso, escenas.join(" "));
