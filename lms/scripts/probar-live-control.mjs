// Prueba del control del LIVE con alumnos reales en el navegador: presencia con semáforo, compuerta
// que frena «Siguiente», «Pasar igual» y mensaje a todos. Requiere el LMS en BASE_URL (8095 por defecto)
// con LMS_ADMIN_EMAIL=instructor@local.test, LMS_ADMIN_PASSWORD=local-1234 y LMS_INVITE_CODE=local.
import { chromium, CHROME } from "./_pw.mjs";

const BASE = process.env.BASE_URL || "http://localhost:8095";
const LESSON = "pa-02";
const SALIDA = process.env.SALIDA || "/tmp";
let fallos = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? "OK " : "MAL"} ${msg}`);
  if (!cond) fallos++;
};

// Los tokens se guardan para no tropezar con el límite de 10 inicios de sesión por minuto.
import { readFileSync, writeFileSync } from "node:fs";
const CACHE = "/tmp/live-tokens.json";
let tokens = {};
try {
  tokens = JSON.parse(readFileSync(CACHE, "utf8"));
} catch {
  /* primera vez */
}

async function sesionPorApi(ctx, email, name, password) {
  const page = await ctx.newPage();
  await page.goto(BASE + "/api/v1/auth/config");
  if (tokens[email]) {
    await ctx.addCookies([{ name: "lms_session", value: tokens[email], url: BASE }]);
    const vive = await page.evaluate(() => fetch("/api/v1/me").then((r) => r.status));
    if (vive === 200) {
      await page.close();
      return tokens[email];
    }
  }
  const r = await page.evaluate(
    async ({ email, name, password }) => {
      const post = (ruta, cuerpo) => fetch(ruta, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) });
      let r = await post("/api/v1/auth/login", { email, password });
      if (r.status === 401) r = await post("/api/v1/auth/register", { email, name, password, invite_code: "local" });
      return r.json().catch(() => ({}));
    },
    { email, name, password },
  );
  if (r.token) {
    await ctx.addCookies([{ name: "lms_session", value: r.token, url: BASE }]);
    tokens[email] = r.token;
    writeFileSync(CACHE, JSON.stringify(tokens));
  }
  await page.close();
  return r.token;
}

const nav = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] });
const ctxP = await nav.newContext({ viewport: { width: 1280, height: 800 } });
const ctxA = await nav.newContext({ viewport: { width: 1280, height: 800 } });
const ctxB = await nav.newContext({ viewport: { width: 1280, height: 800 } });
await sesionPorApi(ctxP, "instructor@local.test", "Instructor", "local-1234");
await sesionPorApi(ctxA, "ana-live@local.test", "Ana", "ana-1234");
await sesionPorApi(ctxB, "elisa-live@local.test", "Elisa", "elisa-1234");

const profe = await ctxP.newPage();
const ana = await ctxA.newPage();
const carla = await ctxB.newPage();
const api = (page, method, ruta, cuerpo) =>
  page.evaluate(async ({ method, ruta, cuerpo }) => {
    const r = await fetch(ruta, { method, headers: { "Content-Type": "application/json" }, body: cuerpo ? JSON.stringify(cuerpo) : undefined });
    return { code: r.status, body: await r.json().catch(() => null) };
  }, { method, ruta, cuerpo });

await profe.goto(BASE + "/api/v1/auth/config");
await api(profe, "POST", `/api/v1/live/${LESSON}/iniciar`, {});
await api(profe, "PUT", `/api/v1/live/${LESSON}/escena`, { escena: "03-tu-laptop", visible: true });

await Promise.all([profe, ana, carla].map((p) => p.goto(BASE + `/live/${LESSON}/`).then(() => p.waitForLoadState("domcontentloaded"))));
await profe.waitForTimeout(7500); // un barrido de presencia (5 s)

console.log("alumnos en lista:", await profe.locator(".live-alumnos li").allInnerTexts());
ok((await profe.locator(".live-alumnos li").count()) === 2, "el control lista a los dos alumnos conectados");
ok((await profe.locator(".live-alumnos .semaforo.ambar").count()) === 2, "ambos en ámbar (conectados, sin cumplir)");

// Compuerta: nadie cumplió 03-tu-laptop (evidencia), así que «Siguiente» no avanza.
await profe.click('button[aria-label="Escena siguiente"]');
await profe.waitForSelector(".live-compuerta", { timeout: 4000 });
ok((await profe.locator(".live-faltan li").count()) === 2, "la compuerta muestra a los 2 que faltan");
await profe.screenshot({ path: `${SALIDA}/T-1.12-compuerta-1280x800.png` });
const antes = (await api(profe, "GET", `/api/v1/live/${LESSON}`)).body.escena;
ok(antes === "03-tu-laptop", "la escena no cambió mientras la compuerta está abierta");

// Esperar cierra; luego Pasar igual avanza.
await profe.click('.live-compuerta button:has-text("Esperar")');
await profe.waitForTimeout(400);
ok((await profe.locator(".live-compuerta").count()) === 0, "«Esperar» cierra el cuadro");
await profe.click('button[aria-label="Escena siguiente"]');
await profe.waitForSelector(".live-compuerta");
await profe.click('.live-compuerta button:has-text("Pasar igual")');
await profe.waitForTimeout(800);
const despues = (await api(profe, "GET", `/api/v1/live/${LESSON}`)).body.escena;
ok(despues !== "03-tu-laptop", `«Pasar igual» avanzó a ${despues}`);

// Mensaje a todos: llega a la pantalla del alumno.
await profe.fill('input[aria-label="Mensaje a todos"]', "cambien a modelo remoto");
await profe.click('button[aria-label="Enviar mensaje"]');
await ana.waitForSelector(".live-aviso", { timeout: 3000 }).catch(() => undefined);
ok((await ana.locator(".live-aviso").innerText().catch(() => "")).includes("modelo remoto"), "el alumno ve el mensaje");

// Escena de ánimo: el parámetro llega a la escena del alumno.
await api(profe, "PUT", `/api/v1/live/${LESSON}/escena`, { escena: "08-avatar", visible: true, parametro: "pensando" });
await ana.waitForTimeout(1500);
const param = await ana.evaluate(() => fetch("/api/v1/live/pa-02").then((r) => r.json()).then((j) => j.parametro));
ok(param === "pensando", "el estado lleva el parámetro «pensando»");

await profe.screenshot({ path: `${SALIDA}/T-1.13-control-1280x800.png` });
await nav.close();
console.log(fallos ? `${fallos} fallos` : "todo bien");
process.exit(fallos ? 1 : 0);
