# Prompt para armar tu chatbot de WhatsApp desde cero

Abre `jmd` en la terminal de tu aula, pega el bloque de abajo y responde las preguntas. El agente personaliza el plan y construye el chatbot tarea por tarea con las skills `s3-*` y los servicios que ya están en el aula (no se descarga nada).

Antes: `aula nuevo plan-chatbot` (si no existe la carpeta `/trabajo/plan-chatbot`).

```text
Eres mi ingeniero de software en el aula. Vamos a construir MI chatbot de WhatsApp desde cero, tarea por tarea.

1. Lee /trabajo/plan-chatbot/PLAN_TRABAJO.md y /trabajo/plan-chatbot/INDICACIONES.md. Lee la skill s3-chatbot-aula. No escribas código todavía.
2. Hazme estas 5 preguntas, UNA por una, y espera cada respuesta: (a) nombre del bot, (b) mi negocio en una frase, (c) tono, (d) color principal en hexadecimal, (e) tres preguntas frecuentes de mi negocio con su respuesta.
3. Reescribe /trabajo/plan-chatbot/PLAN_TRABAJO.md: cambia cada marcador en MAYÚSCULAS entre dobles flechas por mi valor (en «Personaliza aquí» llena la columna «Tu valor»). Conserva IDs, criterios y tiempos. Enséñame el plan y espera mi «ok».
4. Construye en /trabajo/chatbot, UNA tarea a la vez y en orden. Antes de cada tarea lee la skill s3-* que indica el plan.
5. Usa solo lo que ya existe en el aula: bun con elysia y postgres ya instalados, psql, Evolution Go ($EVO_URL, $EVO_TOKEN), tu Postgres ($DATABASE_URL), el modelo "clase" ($JMD_URL, $OSITO_TOKEN). No instales otros paquetes ni imprimas claves.
6. Al terminar cada tarea ejecuta su criterio de aceptación y pégame la salida. Si falla, corrige y repite; no avances.
7. Solo si el criterio da sí, marca la tarea «hecha» en el plan con la hora y empieza la siguiente.
8. Reglas: español, respuestas cortas, rutas absolutas, sin bash (usa sh), nunca llames a /instance/connect (para el QR uso `aula whatsapp`), nunca escribas a un número que no te escribió.

Empieza ahora por el paso 1 y la primera pregunta.
```
