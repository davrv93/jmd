---
name: s3-pruebas-playwright
description: Pruebas automáticas ligeras del chatbot de WhatsApp. Dentro del aula, pruebas de API con bun test contra la app de Elysia en memoria, con un Evolution Go y un gateway falsos (sin enviar nada a WhatsApp). Fuera del aula, un smoke de la bandeja con Playwright (pruebas/smoke-ui.mjs) que corre el instructor en su laptop. Palabras gatillo: pruebas, tests, bun test, Playwright, smoke, e2e, prueba de API, regresión, falso, mock, webhook duplicado, 393 px.
nivel: completo
compat: [claude, codex, gpt, deepseek, glm, nemotron, ollama-pequeno]
---

# S3 · Pruebas ligeras: bun test dentro, Playwright fuera

## Cuándo usar

Al cerrar el chatbot (después de `s3-integracion`) y cada vez que cambies `bot.ts` o `servidor.ts`. Ser honestos con lo que corre dónde:

| Prueba | Dónde corre | Qué cubre |
|---|---|---|
| `bun test pruebas/` | En el aula | Webhook, filtros, duplicados, modo humano, disculpa si el modelo cae, validación |
| `node pruebas/smoke-ui.mjs` | Fuera del aula (laptop con Chrome) | La bandeja carga, abre un chat, el interruptor cambia, 393 px sin desborde |
| Teléfono real | Con personas | Ver `s3-pruebas-uso` |

En el aula NO hay navegador ni Node: Playwright no corre ahí. No intentes instalarlo.

## Pasos

1. Archivo `/trabajo/chatbot/pruebas/api.test.ts` (Evolution y el modelo son falsos: no sale nada a WhatsApp):
   ```ts
   import { beforeAll, afterAll, expect, test } from "bun:test";
   const enviados: { number: string; text: string }[] = [];
   let modeloFalla = false;
   const falso = Bun.serve({ port: 0, async fetch(req) {
     const ruta = new URL(req.url).pathname;
     if (ruta === "/send/text") { enviados.push(await req.json()); return Response.json({ message: "success" }); }
     if (ruta === "/instance/status") return Response.json({ data: { Connected: true, LoggedIn: true } });
     if (ruta === "/health") return new Response("ok");
     if (ruta === "/v1/chat/completions") return modeloFalla ? new Response("caído", { status: 503 })
       : Response.json({ choices: [{ message: { content: "Abrimos de 7 am a 9 pm." } }] });
     return new Response("no", { status: 404 });
   } });
   process.env.EVO_URL = process.env.JMD_URL = `http://localhost:${falso.port}`;   // ANTES de importar el servidor
   const { app } = await import("../servidor");
   const db = await import("../db");

   const JID = "000000000001@s.whatsapp.net";                                       // número que no existe
   const llamar = (ruta: string, cuerpo?: unknown) => app.handle(new Request(`http://local/api${ruta}`, cuerpo === undefined ? {}
     : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) }));
   const webhook = (id: string, texto: string, info: object = {}) => llamar("/webhook",
     { event: "Message", data: { Info: { Chat: JID, IsFromMe: false, ID: id, PushName: "Prueba", ...info }, Message: { conversation: texto } } });
   const esperar = async (cond: () => boolean) => { for (let i = 0; i < 60 && !cond(); i++) await Bun.sleep(50); return cond(); };
   const mia = async () => (await (await llamar("/conversaciones")).json()).find((c: any) => c.jid === JID);
   const limpiar = () => db.sql`DELETE FROM contactos WHERE jid LIKE '0000000000%'`;
   beforeAll(async () => { await db.migrar(); await limpiar(); });
   afterAll(async () => { await limpiar(); falso.stop(true); });

   test("salud ve la base y el modelo", async () => {
     const r = await (await llamar("/salud")).json();
     expect(r.db && r.llm).toBe(true);
   });
   test("webhook responde al instante y el bot avisa que es un bot", async () => {
     const t0 = performance.now();
     expect((await webhook("T-1", "¿horario?")).status).toBe(200);
     expect(performance.now() - t0).toBeLessThan(500);
     expect(await esperar(() => enviados.length === 1)).toBe(true);
     expect(enviados[0].number).toBe("000000000001");
     expect(enviados[0].text).toContain("bot");
   });
   test("ignora eco, grupos, estados y reintentos", async () => {
     await webhook("T-2", "eco", { IsFromMe: true });
     await webhook("T-3", "grupo", { Chat: "123@g.us" });
     await webhook("T-4", "estado", { Chat: "status@broadcast" });
     await webhook("T-1", "¿horario?");                                              // mismo ID: reintento
     await Bun.sleep(300);
     expect(enviados.length).toBe(1);
   });
   test("pedir una persona apaga el bot y la persona responde", async () => {
     await webhook("T-5", "quiero hablar con una persona");
     expect(await esperar(() => enviados.length === 2)).toBe(true);
     const c = await mia();
     expect(c.modo).toBe("humano");
     await webhook("T-6", "¿siguen ahí?");
     await Bun.sleep(300);
     expect(enviados.length).toBe(2);                                                // el bot calla
     expect((await llamar("/enviar", { conversacion: c.id, texto: "Soy Ana, ¿en qué te ayudo?" })).status).toBe(200);
     expect(enviados.at(-1)?.text).toContain("Ana");
     await llamar(`/conversaciones/${c.id}/modo`, { modo: "bot" });
   });
   test("si el modelo cae, llega la disculpa (nunca silencio)", async () => {
     modeloFalla = true;
     await webhook("T-7", "¿tienen pan sin gluten?");
     expect(await esperar(() => enviados.length === 4)).toBe(true);
     expect(enviados.at(-1)?.text).toContain("Perdona");
     modeloFalla = false;
   });
   test("valida datos", async () => {
     const c = await mia();
     expect((await llamar("/enviar", { conversacion: c.id, texto: "" })).status).toBe(422);
     expect((await llamar("/conversaciones/999999/modo", { modo: "bot" })).status).toBe(404);
   });
   ```
2. Córrelas: `cd /trabajo/chatbot && bun test pruebas/`. Esperado: `6 pass`, `0 fail`. Usa tu base real pero borra solo los contactos `0000000000…`.
3. Smoke de la bandeja (lo corre el instructor FUERA del aula): copia la carpeta `chatbot` a una laptop con Chrome y
   ```sh
   npm i -D playwright && npx playwright install chromium
   node pruebas/smoke-ui.mjs                                   # con datos falsos, sin backend
   BACKEND=http://localhost:8766 node pruebas/smoke-ui.mjs     # contra un backend real
   ```
   Imita al visor (`/vista/demo/chatbot/`) y revisa 7 cosas; deja `pruebas/captura-393.png`. Sale con código 0 si todo PASA.

## Ejemplo real

Primera corrida en un aula de prueba (Alpine, 192 MB): `6 pass, 0 fail` en 1,1 s. Después se quitó a propósito el filtro `IsFromMe` y la prueba «ignora eco…» falló con `expected 1, received 2`: así se ve un bucle antes de que llegue a WhatsApp.

## Errores típicos

- Las pruebas mandan WhatsApp de verdad: importaste `servidor` ANTES de cambiar `EVO_URL`. El `import` debe ir después (dinámico, con `await import`).
- `Cannot find module "../servidor"`: corre desde `/trabajo/chatbot`.
- Falla «salud»: `DATABASE_URL` vacía o la base no responde (`aula db`).
- No pruebes con números reales ni con `51 9...`: usa `000000000001`, que no existe.
- Playwright «executable doesn't exist»: `npx playwright install chromium` o `CHROME=/ruta/a/chrome` con `playwright-core`.

## Versión corta para modelos pequeños

1. En el aula: `bun test pruebas/` con Evolution y modelo FALSOS (`Bun.serve` en el puerto 0).
2. Cambia `EVO_URL` y `JMD_URL` antes de `await import("../servidor")` y llama con `app.handle(new Request(...))`.
3. Casos: salud, respuesta con aviso de bot, filtros y duplicados, modo humano, disculpa, 422/404.
4. Playwright solo fuera del aula: `node pruebas/smoke-ui.mjs`.
