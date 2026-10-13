---
name: s3-back-elysia
description: Levanta el backend del chatbot de WhatsApp con Bun y Elysia en el puerto 8766 del aula. Rutas /api/salud, /api/conversaciones, /api/mensajes, /api/conversaciones/:id/modo, /api/enviar, /api/webhook, /api/whatsapp/qr y /api/whatsapp/estado, con validación, errores en JSON y arranque con chatbot.sh. Incluye negocio.json y un bot.ts mínimo que solo guarda. Palabras gatillo: backend, Elysia, Bun, API, rutas, servidor.ts, webhook, puerto 8766, /api/salud, validación, 422, chatbot.sh.
nivel: completo
compat: [claude, codex, gpt, deepseek, glm, nemotron, ollama-pequeno]
---

# S3 · Backend con Bun + Elysia

## Cuándo usar

Después de `s3-postgres` (usa `db.ts`) y de `s3-whatsapp-qr` (usa `evo.ts`). Lee `s3-chatbot-aula` para `package.json` y `chatbot.sh`. Aquí el webhook solo GUARDA; responder con el modelo es `s3-integracion`.

## Pasos

1. Archivo `/trabajo/chatbot/negocio.json` (con los datos del plan del alumno):
   ```json
   { "bot": "Lía", "negocio": "Panadería La Espiga, en Lima", "tono": "cercano y breve",
     "saludo": "Hola, soy Lía, el asistente virtual (un bot) de Panadería La Espiga.",
     "faq": [ { "p": "¿Cuál es el horario?", "r": "Lunes a sábado, de 7 am a 9 pm." },
              { "p": "¿Hacen delivery?", "r": "Sí, en Miraflores y San Isidro. Pedido mínimo S/ 30." },
              { "p": "¿Cuánto cuesta la torta de chocolate?", "r": "S/ 65 la entera; se pide con un día de anticipación." } ],
     "palabras_humano": ["persona", "humano", "asesor", "agente"] }
   ```
2. Archivo `/trabajo/chatbot/bot.ts` mínimo (`s3-integracion` lo reemplaza entero):
   ```ts
   import * as db from "./db";
   import * as evo from "./evo";
   // Lo que importa del JSON de Evolution Go. null = ignorar (y responder 200 igual).
   export function leerWebhook(cuerpo: any) {
     if (cuerpo?.event !== "Message") return null;
     const info = cuerpo.data?.Info ?? {};
     const chat: string = info.Chat ?? "";
     if (info.IsFromMe || chat.endsWith("@g.us") || chat.endsWith("@broadcast")) return null;
     const m = cuerpo.data?.Message ?? {};
     const texto: string = (m.conversation ?? m.extendedTextMessage?.text ?? "").trim();
     if (!texto || !info.ID) return null;
     return { jid: chat, nombre: String(info.PushName ?? ""), waId: String(info.ID), texto: texto.slice(0, 2000) };
   }
   export async function responder(conversacion: number, jid: string, autor: "bot" | "humano", texto: string) {
     try { await evo.enviarTexto(jid, texto); return await db.guardarSaliente(conversacion, autor, texto, "ok"); }
     catch (e) { console.error("no se pudo enviar:", (e as Error).message); return await db.guardarSaliente(conversacion, autor, texto, "error"); }
   }
   export async function atender(m: { jid: string; nombre: string; waId: string; texto: string }) {
     return (await db.guardarEntrante(m.jid, m.nombre, m.waId, m.texto)) ? "guardado" : "duplicado";
   }
   ```
3. Archivo `/trabajo/chatbot/servidor.ts`:
   ```ts
   import { Elysia, t } from "elysia";
   import * as db from "./db";
   import * as evo from "./evo";
   import { leerWebhook, atender, responder } from "./bot";

   const GATEWAY = (process.env.JMD_URL ?? "http://ai-orchestrator:4000").replace(/\/$/, "");
   const PUERTO = Number(process.env.CHATBOT_PUERTO ?? 8766);
   const vivo = (p: Promise<unknown>) => p.then(() => true).catch(() => false);

   export const app = new Elysia({ prefix: "/api" })
     .onError(({ code, error, set }) => {
       if (code === "VALIDATION") { set.status = 422; return { error: "datos inválidos" }; }
       if (code === "NOT_FOUND") { set.status = 404; return { error: "no existe" }; }
       console.error(error); set.status = 500; return { error: "error interno" };
     })
     .get("/salud", async () => {
       const [base, llm, whatsapp] = await Promise.all([
         vivo(db.sql`SELECT 1`),
         fetch(`${GATEWAY}/health`, { signal: AbortSignal.timeout(2000) }).then((r) => r.ok).catch(() => false),
         evo.estado().then((e) => e.sesion).catch(() => false)]);
       return { ok: base, db: base, llm, whatsapp };
     })
     .get("/conversaciones", () => db.listarConversaciones())
     .get("/mensajes", ({ query }) => db.listarMensajes(query.conversacion, query.desde ?? 0),
       { query: t.Object({ conversacion: t.Numeric(), desde: t.Optional(t.Numeric()) }) })
     .post("/conversaciones/:id/modo", async ({ params, body, set }) => {
       const v = await db.cambiarModo(params.id, body.modo);
       if (!v) { set.status = 404; return { error: "no existe la conversación" }; }
       return v;
     }, { params: t.Object({ id: t.Numeric() }), body: t.Object({ modo: t.Union([t.Literal("bot"), t.Literal("humano")]) }) })
     .post("/enviar", async ({ body, set }) => {
       const v = await db.conversacion(body.conversacion);
       if (!v) { set.status = 404; return { error: "no existe la conversación" }; }
       if (v.modo !== "humano") await db.cambiarModo(v.id, "humano");   // quien escribe, toma la conversación
       const m = await responder(v.id, v.jid, "humano", body.texto);
       if (m.estado === "error") set.status = 502;
       return m;
     }, { body: t.Object({ conversacion: t.Numeric(), texto: t.String({ minLength: 1, maxLength: 2000 }) }) })
     // Evolution Go toca este timbre: responde 200 YA y trabaja después. Si tardas, reintenta.
     .post("/webhook", ({ body }) => {
       const m = leerWebhook(body);
       if (m) atender(m).catch((e) => console.error("webhook:", e));
       return { ok: true };
     })
     .get("/whatsapp/estado", ({ set }) => evo.estado().catch((e) => { set.status = 502; return { error: `Evolution no responde: ${e.message}` }; }))
     .get("/whatsapp/qr", ({ set }) => evo.qr().catch((e) => { set.status = 502; return { error: `Evolution no responde: ${e.message}` }; }));

   if (import.meta.main) {
     await db.migrar();
     app.listen({ port: PUERTO, hostname: "0.0.0.0" });
     console.log(`chatbot escuchando en ${PUERTO}`);
   }
   ```
4. Arranca y prueba:
   ```sh
   sh /trabajo/chatbot/chatbot.sh arrancar                     # arrancado en 8766
   curl -s localhost:8766/api/salud                            # {"ok":true,"db":true,"llm":true,"whatsapp":...}
   curl -s localhost:8766/api/conversaciones                   # []
   curl -s -X POST localhost:8766/api/webhook -H 'Content-Type: application/json' -d @pruebas/webhook-hola.json   # {"ok":true}
   curl -s -o /dev/null -w '%{http_code}\n' -X POST localhost:8766/api/enviar -H 'Content-Type: application/json' -d '{"conversacion":1,"texto":""}'   # 422
   ```

## Ejemplo real

`pruebas/webhook-hola.json` es un mensaje como los que manda Evolution Go: `{"event":"Message","data":{"Info":{"Chat":"000000000001@s.whatsapp.net","IsFromMe":false,"ID":"PRUEBA-HOLA-1","PushName":"Cliente de prueba"},"Message":{"conversation":"hola, ¿cuál es el horario?"}}}`. Tras el `curl`, `/api/conversaciones` muestra a «Cliente de prueba» con 1 sin leer.

## Errores típicos

- `Cannot find package "elysia"`: falta `package.json` o `bun install`; `chatbot.sh` lo instala solo.
- El servidor arranca y muere: `sh chatbot.sh log`. Casi siempre es `DATABASE_URL` o un error de sintaxis en un `.ts`.
- 422 en todo: el cliente no mandó `Content-Type: application/json`.
- El webhook tarda y llega duplicado: NO pongas `await atender(...)` en la ruta; responde `{ok:true}` al instante.
- Nunca devuelvas 500 a Evolution: ignora con 200 lo que no entiendes (grupos, audios, `IsFromMe`).

## Versión corta para modelos pequeños

1. Crea `negocio.json`, `bot.ts` mínimo y `servidor.ts` en `/trabajo/chatbot/`.
2. Elysia con `prefix: "/api"`; valida con `t.Object`; errores siempre `{error}` en JSON.
3. `/api/webhook` responde `{ok:true}` al instante y llama a `atender()` sin `await`.
4. Exporta `app`; escucha en 8766 solo si `import.meta.main`.
5. `sh chatbot.sh reiniciar` y prueba con los `curl` de arriba.
