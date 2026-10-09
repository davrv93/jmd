// Prueba de punta a punta del LMS con Chromium (playwright-core), contra un servidor recién
// arrancado con base de datos vacía y estas variables:
//   LMS_ADMIN_EMAIL=profe@upeu.edu.pe LMS_ADMIN_PASSWORD=profe-2026-x LMS_INVITE_CODE=vibecoding LMS_COHORT=cohorte-2026-2
// Uso (desde lms/web, que tiene playwright-core):
//   PLAYWRIGHT_CHROMIUM=/ruta/a/chrome node ../scripts/e2e.mjs http://localhost:8080
import { chromium } from "playwright-core";
const base = process.argv[2] || "http://127.0.0.1:8080";
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM || undefined, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
// el 401 de /api/v1/me sin sesión es esperado (la página redirige al login)
page.on("console", (m) => { if (m.type() === "error" && !m.text().includes("401")) errors.push("console: " + m.text()); });

// 1. registro de un alumno
await page.goto(base + "/");
await page.waitForSelector("text=Regístrate", { timeout: 10000 });
await page.click("text=Regístrate con el código de tu cohorte");
await page.fill("#name", "Ana Alumna");
await page.fill("#email", "ana@upeu.edu.pe");
await page.fill("#password", "ana-2026-xyz");
await page.fill("#invite", "vibecoding");
await page.click("button[type=submit]");
await page.waitForURL(base + "/courses/", { timeout: 10000 });
await page.waitForSelector("text=Programación agéntica", { timeout: 10000 });
console.log("✓ registro y lista de cursos");

// 2. curso → sesión
await page.click("a.card");
await page.waitForURL(/\/courses\/programacion-agentica\//);
await page.waitForSelector("text=Clase 1");
await page.click("text=Clase 1");
await page.waitForURL(/\/lessons\/pa-01\//);
await page.waitForSelector(".cycle .step", { timeout: 10000 });
const steps = await page.locator(".cycle .step").count();
console.log("✓ sesión cargada con", steps, "pasos del ciclo");
const h2s = await page.locator(".prose h2").allTextContents();
console.log("  secciones:", h2s.join(" | "));

// 3. marcar dos pasos y comprobar que persisten
await page.locator(".cycle .step input[type=checkbox]").nth(1).check();
await page.locator(".cycle .step input[type=checkbox]").nth(2).check();
await page.waitForFunction(() => document.querySelectorAll(".cycle .step.done").length === 2, null, { timeout: 5000 });
await page.reload();
await page.waitForSelector(".cycle .step.done", { timeout: 10000 });
const done = await page.locator(".cycle .step.done").count();
if (done !== 2) throw new Error("progreso no persistió: " + done);
console.log("✓ progreso del ciclo persistido:", done, "pasos");

// 4. pregunta
await page.fill("#q", "¿Qué hago si `jmd status` dice 401?");
await page.click("text=Publicar pregunta");
await page.waitForSelector(".q", { timeout: 5000 });
console.log("✓ pregunta publicada");

// 5. enlaces
await page.goto(base + "/links/");
await page.waitForSelector(".links li", { timeout: 10000 });
console.log("✓ enlaces publicados:", await page.locator(".links li").count());

// 6. tarea y entrega
await page.goto(base + "/assignments/tarea-01/");
await page.waitForSelector("#repo", { timeout: 10000 });
await page.fill("#repo", "https://github.com/ana/clase-01");
await page.fill("#sha", "0123abc");
await page.click("form button[type=submit]");
await page.waitForSelector("text=entregada · en cola", { timeout: 5000 });
console.log("✓ entrega creada");

// 7. notas
await page.goto(base + "/grades/");
await page.waitForSelector("table.plain", { timeout: 10000 });
console.log("✓ notas visibles");

// 8. salir e instructor
await page.click("text=salir");
await page.waitForURL(base + "/");
await page.fill("#email", "profe@upeu.edu.pe");
await page.fill("#password", "profe-2026-x");
await page.click("button[type=submit]");
await page.waitForURL(base + "/courses/");
await page.goto(base + "/instructor/programacion-agentica/");
await page.waitForSelector("table.plain td", { timeout: 10000 });
const cell = await page.locator("table.plain tbody tr").first().innerText();
console.log("✓ instructor ve el avance:", cell.replace(/\s+/g, " "));
await page.goto(base + "/assignments/tarea-01/");
await page.waitForSelector("#calificar .card", { timeout: 10000 });
await page.fill("#calificar input[type=number]", "17");
await page.fill("#calificar input:not([type=number])", "Buen trabajo");
await page.click("#calificar button");
await page.locator("#calificar").getByText("calificada", { exact: true }).first().waitFor({ timeout: 5000 });
console.log("✓ calificada por el instructor");

// 9. sin sesión → login con next
const ctx2 = await browser.newContext();
const p2 = await ctx2.newPage();
await p2.goto(base + "/lessons/pa-01/");
await p2.waitForURL(/\/\?next=/, { timeout: 10000 });
console.log("✓ sin sesión redirige al login:", p2.url());

await browser.close();
if (errors.length) { console.log("ERRORES DE NAVEGADOR:\n" + errors.join("\n")); process.exit(1); }
console.log("E2E OK");
