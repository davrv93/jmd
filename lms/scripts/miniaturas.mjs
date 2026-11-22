// Miniaturas de las sesiones: una captura de la primera escena LIVE de cada sesión, en WebP pequeño
// (480×270, unos 20–60 KB), guardada en content/courses/<curso>/miniaturas/<sesión>.webp. La página
// del curso la muestra en la lista de sesiones; sin miniatura, el portal dibuja la portada del curso
// con el número de la sesión.
//
// Uso (con el LMS corriendo con el contenido de este repo y una cuenta de instructor o admin):
//   cd lms/web && LMS_EMAIL=profe@local.test LMS_PASSWORD=… CHROME=/ruta/a/chrome \
//     node ../scripts/miniaturas.mjs http://127.0.0.1:8080 [curso…]
// Sin cursos, toma los que tienen alguna sesión desde hace 7 días hasta dentro de 8 semanas.
// Necesita `cwebp` (brew install webp). No pisa una miniatura existente salvo con FORZAR=1.
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// playwright-core sale de lms/web/node_modules (se corre desde lms/web).
const { chromium } = createRequire(path.join(process.cwd(), "package.json"))("playwright-core");
const base = process.argv[2] || "http://127.0.0.1:8080";
const pedidos = process.argv.slice(3);
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "content", "courses");
const chrome = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const browser = await chromium.launch({ executablePath: chrome, headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, colorScheme: "light" });
const login = await ctx.request.post(`${base}/api/v1/auth/login`, { data: { email: process.env.LMS_EMAIL, password: process.env.LMS_PASSWORD } });
if (!login.ok()) throw new Error(`login: ${login.status()}`);
const get = async (p) => {
  const r = await ctx.request.get(base + p);
  return r.ok() ? r.json() : null;
};

const ahora = Date.now();
const cursos = await get("/api/v1/courses");
const elegidos = [];
for (const c of cursos) {
  if (pedidos.length && !pedidos.includes(c.slug) && !pedidos.includes(c.id)) continue;
  const det = await get(`/api/v1/courses/${encodeURIComponent(c.slug)}`);
  if (!det) continue;
  const ls = det.modules.flatMap((m) => m.lessons);
  const fechas = ls.map((l) => Date.parse(l.starts_at ?? "")).filter((t) => !isNaN(t));
  const activo = fechas.some((t) => t > ahora - 7 * 86400e3 && t < ahora + 56 * 86400e3) || (fechas.length && Math.min(...fechas) < ahora && Math.max(...fechas) > ahora);
  if (pedidos.length || activo) elegidos.push({ c: det, ls });
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "miniaturas-"));
const page = await ctx.newPage();
let hechas = 0, saltadas = 0, sinEscena = 0;
for (const { c, ls } of elegidos) {
  for (const l of ls) {
    const destino = path.join(raiz, c.id, "miniaturas", `${l.id}.webp`);
    if (fs.existsSync(destino) && !process.env.FORZAR) {
      saltadas++;
      continue;
    }
    // La primera escena de la clase. Las «00-» son de antes de empezar (un juego de calentamiento) y se
    // saltan si hay otra; una captura casi vacía (menos de 7 KB) prueba con la siguiente escena.
    const todas = ((await get(`/api/v1/live/${encodeURIComponent(l.id)}/escenas`)) ?? []).filter((e) => !e.oculta);
    const escenas = [...todas.filter((e) => !e.id.startsWith("00-")), ...todas.filter((e) => e.id.startsWith("00-"))].slice(0, 3);
    if (!escenas.length) {
      sinEscena++;
      continue;
    }
    fs.mkdirSync(path.dirname(destino), { recursive: true });
    let elegida = "";
    for (const e of escenas) {
      await page.goto(`${base}/api/v1/live/${encodeURIComponent(l.id)}/escenas/${encodeURIComponent(e.id)}/html`, { waitUntil: "networkidle", timeout: 20000 }).catch(() => undefined);
      await page.waitForTimeout(2500); // las escenas animan su entrada
      const png = path.join(tmp, `${l.id}.png`);
      await page.screenshot({ path: png });
      execFileSync("cwebp", ["-quiet", "-q", "74", "-m", "6", "-resize", "480", "270", png, "-o", destino]);
      elegida = e.id;
      if (fs.statSync(destino).size >= 7000) break;
    }
    const kb = Math.round(fs.statSync(destino).size / 1024);
    console.log(`${c.id}/${l.id} · ${elegida} · ${kb} KB`);
    hechas++;
  }
}
await browser.close();
console.log(`${hechas} miniaturas nuevas, ${saltadas} ya estaban, ${sinEscena} sesiones sin escena LIVE (usan la portada).`);
