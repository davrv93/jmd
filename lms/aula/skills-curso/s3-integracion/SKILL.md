---
name: s3-integracion
description: Une las piezas del chatbot de WhatsApp. El webhook de Evolution Go guarda el mensaje, el modelo "clase" del gateway responde con los datos del negocio, la respuesta sale por POST /send/text y se ve en la bandeja. Incluye el aviso de que es un bot, la disculpa si el modelo no responde en 15 s y la toma humana que apaga el bot por conversación. Reemplaza bot.ts. Palabras gatillo: integración, bot responde, webhook a chat, modelo clase, gateway, OSITO_TOKEN, send/text, toma humana, modo humano, pasar a una persona, nunca silencio.
nivel: completo
compat: [claude, codex, gpt, deepseek, glm, nemotron, ollama-pequeno]
---

# S3 · Integración: del webhook a la respuesta

## Cuándo usar

Cuando ya funcionan: el número vinculado (`s3-whatsapp-qr`), la base (`s3-postgres`), el backend que guarda (`s3-back-elysia`) y la bandeja (`s3-front-lit`). Aquí el bot empieza a hablar. `servidor.ts` no cambia: solo reemplazas `bot.ts`.

## El camino de un mensaje

1. El cliente escribe al número de pruebas. Evolution Go hace `POST http://<tu aula>:8766/api/webhook`.
2. `servidor.ts` responde `{ok:true}` al instante y llama a `atender()` en segundo plano.
3. `atender()` guarda (o descarta si es un reintento), mira el modo y, si es «bot», pregunta al modelo con los últimos 8 mensajes.
4. La respuesta sale por `POST $EVO_URL/send/text` y se guarda; la bandeja la muestra en el siguiente sondeo (2 a 3 s).
5. Si el cliente pide una persona, la conversación pasa a modo «humano»: el bot calla hasta que alguien pulse «Devolver al bot».

## Pasos

1. Reemplaza entero `/trabajo/chatbot/bot.ts`:
   ```ts
   import negocio from "./negocio.json";
   import * as db from "./db";
   import * as evo from "./evo";

   const GATEWAY = (process.env.JMD_URL ?? "http://ai-orchestrator:4000").replace(/\/$/, "");
   const DISCULPA = "Perdona, ahora no puedo responder. Una persona del equipo te escribirá pronto.";
   const PASO_A_HUMANO = "Te paso con una persona del equipo. Te escribe en unos minutos.";
   const SISTEMA = `Eres ${negocio.bot}, asistente de ${negocio.negocio}. Tono: ${negocio.tono}. ` +
     "Responde en español, en máximo tres frases, sin emojis. Usa SOLO estos datos; si la respuesta no está aquí, " +
     "di que no lo sabes y ofrece pasar con una persona. No cobras, no reservas ni cancelas.\nDatos:\n" +
     negocio.faq.map((f) => `- ${f.p} ${f.r}`).join("\n");

   export function leerWebhook(cuerpo: any) {
     if (cuerpo?.event !== "Message") return null;
     const info = cuerpo.data?.Info ?? {};
     const chat: string = info.Chat ?? "";
     if (info.IsFromMe || chat.endsWith("@g.us") || chat.endsWith("@broadcast")) return null; // eco, grupos, estados
     const m = cuerpo.data?.Message ?? {};
     const texto: string = (m.conversation ?? m.extendedTextMessage?.text ?? "").trim();
     if (!texto || !info.ID) return null;                                                    // audio, imagen, sticker
     return { jid: chat, nombre: String(info.PushName ?? ""), waId: String(info.ID), texto: texto.slice(0, 2000) };
   }

   export async function preguntarAlModelo(conversacion: number) {
     const turnos = (await db.historial(conversacion)).map((t: any) =>
       ({ role: t.autor === "cliente" ? "user" : "assistant", content: t.texto }));
     const r = await fetch(`${GATEWAY}/v1/chat/completions`, {
       method: "POST",
       headers: { Authorization: `Bearer ${process.env.OSITO_TOKEN ?? ""}`, "Content-Type": "application/json" },
       body: JSON.stringify({ model: "clase", temperature: 0.4, max_tokens: 250, reasoning: { enabled: false },
         messages: [{ role: "system", content: SISTEMA }, ...turnos] }),
       signal: AbortSignal.timeout(15000),                                                     // 15 s y se rinde
     });
     if (!r.ok) throw new Error(`modelo ${r.status}`);
     const texto = ((await r.json()).choices?.[0]?.message?.content ?? "").replace(/<think>[\s\S]*?<\/think>/g, "").trim();
     if (!texto) throw new Error("modelo sin texto");
     return texto;
   }

   export async function responder(conversacion: number, jid: string, autor: "bot" | "humano", texto: string) {
     try { await evo.enviarTexto(jid, texto); return await db.guardarSaliente(conversacion, autor, texto, "ok"); }
     catch (e) { console.error("no se pudo enviar:", (e as Error).message); return await db.guardarSaliente(conversacion, autor, texto, "error"); }
   }

   const pideHumano = (t: string) => negocio.palabras_humano.some((p) => t.toLowerCase().includes(p));

   export async function atender(m: { jid: string; nombre: string; waId: string; texto: string }) {
     const g = await db.guardarEntrante(m.jid, m.nombre, m.waId, m.texto);
     if (!g) return "duplicado";
     if (g.modo === "humano") return "humano";                       // responde la persona desde la bandeja
     if (pideHumano(m.texto)) {
       await db.cambiarModo(g.conversacion, "humano");
       await responder(g.conversacion, m.jid, "bot", PASO_A_HUMANO);
       return "paso-a-humano";
     }
     let texto: string;
     try { texto = await preguntarAlModelo(g.conversacion); }
     catch (e) { console.error("el modelo no respondió:", (e as Error).message); texto = DISCULPA; }   // nunca silencio
     if (!(await db.botYaHablo(g.conversacion))) texto = `${negocio.saludo}\n\n${texto}`;              // avisa que es un bot
     await responder(g.conversacion, m.jid, "bot", texto);
     return "respondido";
   }
   ```
2. `sh /trabajo/chatbot/chatbot.sh reiniciar` y prueba sin teléfono (el número 000000000001 no existe: el envío queda en «error», pero el modelo responde y no se molesta a nadie):
   ```sh
   curl -s -X POST localhost:8766/api/webhook -H 'Content-Type: application/json' -d @pruebas/webhook-hola.json
   sleep 5; psql "$DATABASE_URL" -tAc "select autor, estado, left(texto, 60) from mensajes order by id desc limit 2"
   ```
3. Prueba real: desde el SEGUNDO teléfono escribe una de tus tres preguntas al número vinculado. En menos de 10 s llega la respuesta con tu dato y el aviso «soy un bot»; la bandeja muestra los dos mensajes.
4. Escribe «quiero hablar con una persona». La etiqueta pasa a «Persona». Responde desde la bandeja: llega al teléfono. Pulsa «Devolver al bot».

## Ejemplo real

Cliente: «¿Hacen delivery?». Bot (primer mensaje): «Hola, soy Lía, el asistente virtual (un bot) de Panadería La Espiga. Sí, hacemos delivery en Miraflores y San Isidro; el pedido mínimo es S/ 30.» Tiempo esperado con el modelo `clase` y el razonamiento apagado: 1 a 4 s, más 1 a 2 s de WhatsApp.

## Errores típicos

- El bot se responde a sí mismo sin parar: falta el filtro `IsFromMe`. Corta ya con `sh chatbot.sh parar`.
- Responde dos veces: pusiste `await` en la ruta del webhook o falta `wa_id UNIQUE`.
- Siempre llega la disculpa: `sh chatbot.sh log` dice `modelo 401` (falta `OSITO_TOKEN`) o `TimeoutError` (gateway saturado; reintenta).
- Inventa precios: refuerza «Usa SOLO estos datos» y baja `temperature` a 0.2. Severidad 4 en pruebas.
- En modo humano el bot sigue hablando: `atender()` debe mirar `g.modo` ANTES de llamar al modelo.
- El mensaje sale en la bandeja con «no se envió»: mira `/api/whatsapp/estado`; si `sesion` es `false`, vuelve a `s3-whatsapp-qr`.

## Versión corta para modelos pequeños

1. Reemplaza `bot.ts`: `leerWebhook`, `preguntarAlModelo`, `responder`, `atender`.
2. Modelo: `POST {JMD_URL}/v1/chat/completions`, `model: "clase"`, `reasoning: {enabled: false}`, `Bearer $OSITO_TOKEN`, 15 s.
3. Orden en `atender`: guardar → si duplicado, salir → si humano, salir → si pide persona, pasar a humano → modelo → enviar.
4. Si el modelo falla, envía la disculpa. El primer mensaje lleva el saludo de `negocio.json`.
5. `sh chatbot.sh reiniciar` y prueba con el teléfono.
