// Verifica en el navegador que el contenido reacondicionado al ciclo de Kolb
// se ve en local y en producción. Uso: node scripts/verify-cycle.mjs <base> <email> <password>
import { chromium } from "playwright-core";

const [base, email, password] = process.argv.slice(2);
if (!base || !email || !password) {
  console.error("uso: node scripts/verify-cycle.mjs <base> <email> <password>");
  process.exit(2);
}

const browser = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await browser.newContext();
const page = await ctx.newPage();
const fails = [];
const ok = (cond, label, extra = "") => {
  console.log(`${cond ? "  ok  " : " FALLO"} ${label}${extra ? " · " + extra : ""}`);
  if (!cond) fails.push(label);
};
const tab = async (label) => {
  await page.locator(".tabs button, .tabs a, [role=tab]", { hasText: label }).first().click();
  await page.waitForTimeout(700);
};

try {
  const r = await ctx.request.post(`${base}/api/v1/auth/login`, { data: { email, password } });
  ok(r.ok(), "login de instructor", `HTTP ${r.status()}`);
  if (!r.ok()) throw new Error("sin sesión");
  console.log(`\n== ${base} ==`);

  // Clase: la ruta por fases del ciclo.
  await page.goto(`${base}/lessons/pa-01/`, { waitUntil: "networkidle" });
  await page.waitForSelector(".ph-sec", { timeout: 20000 });
  const secs = await page.locator(".ph-sec").count();
  const tokens = await page.locator(".ph-sec").evaluateAll((els) => [...new Set(els.map((e) => e.getAttribute("data-ph")))].sort());
  ok(secs >= 4 && tokens.length === 4, "clase: ruta con las 4 fases del ciclo", tokens.join(","));

  // Clase · Contenido: el mapa «Fase | En esta clase» dentro de la sesión.
  await tab("Contenido");
  const heads = await page.locator("table th").evaluateAll((els) => els.map((e) => e.innerText.trim()).filter(Boolean));
  ok(heads.includes("Fase") && heads.includes("En esta clase"), "clase: tabla «Fase | En esta clase»", heads.slice(0, 4).join("/"));

  // Tarea: el marco de aplicación del ciclo.
  await page.goto(`${base}/assignments/tarea-01/`, { waitUntil: "networkidle" });
  const atxt = await page.locator("body").innerText();
  ok(/Fase del ciclo · Aplicaci/i.test(atxt), "tarea: «Fase del ciclo · Aplicación»");

  // Curso: las cuatro fases y las prácticas etiquetadas.
  await page.goto(`${base}/courses/programacion-agentica/`, { waitUntil: "networkidle" });
  await page.waitForSelector(".ph-card", { timeout: 20000 });
  const cards = await page.locator(".ph-card").count();
  ok(cards === 4, "curso: 4 tarjetas de fase", `${cards}`);
  await tab("Prácticas");
  const badges = await page.locator("span.badge.ph").count();
  const tokens2 = await page.locator("span.badge.ph").evaluateAll((els) => [...new Set(els.map((e) => e.getAttribute("data-ph")))].sort());
  ok(badges === 17, "curso: 17 prácticas con badge de fase", `${badges}`);
  ok(tokens2.length >= 3, "curso: fases distintas en las prácticas", tokens2.join(","));

  // Catálogo de prácticas.
  await page.goto(`${base}/examples/`, { waitUntil: "networkidle" });
  await page.waitForSelector("span.badge.ph", { timeout: 20000 });
  const cat = await page.locator("span.badge.ph").count();
  ok(cat >= 17, "catálogo de prácticas: badges de fase", `${cat}`);
} catch (e) {
  ok(false, "excepción", String(e).split("\n")[0]);
} finally {
  await browser.close();
}

console.log(fails.length ? `\nRESULTADO ${base}: FALLO (${fails.length})` : `\nRESULTADO ${base}: OK`);
process.exit(fails.length ? 1 : 0);
