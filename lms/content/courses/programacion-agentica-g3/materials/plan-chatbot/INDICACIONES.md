# Indicaciones · Clase 3: tu chatbot de WhatsApp

Hoy construyes, dentro de tu aula, un chatbot que atiende por WhatsApp: el cliente escribe, el modelo «clase» responde con los datos de tu negocio y la conversación aparece en una bandeja donde una persona puede tomar el control.

Stack: front en **Lit** (sin build), backend en **Bun + Elysia**, base **PostgreSQL**, WhatsApp con **Evolution Go**. Todo ya está instalado en tu aula.

## 1. Cómo entras

1. Entra al LMS, abre la clase 3 y pulsa «Abrir mi aula». Tienes una terminal y el panel «Visor».
2. En la terminal crea tu plan: `aula nuevo plan-chatbot`.
3. En el visor elige `plan-chatbot`: ves el plan, el prompt y estas indicaciones.
4. Abre el agente con `jmd`, pega el prompt de `PROMPT_ARMAR_CHATBOT.md` y responde sus 5 preguntas.

Necesitas **dos teléfonos**: el de pruebas del equipo (se vincula) y otro que le escribe. Si no tienes el segundo, haz pareja con otro equipo.

## 2. Comandos que vas a usar

| Comando | Para qué |
|---|---|
| `aula nuevo plan-chatbot` | Copia el plan, el prompt, los recursos y las pruebas a `/trabajo/plan-chatbot` |
| `jmd` | Abre tu agente. Dentro: `/skill s3-chatbot-aula` y las demás `s3-*` |
| `aula whatsapp` | Estado del número. Si no hay sesión, renueva el QR en `/trabajo/qr.png` (unos 2,5 min). Ábrelo en el visor: `qr.png` |
| `aula db` | Abre `psql` en tu base. Sal con `\q` |
| `sh /trabajo/chatbot/chatbot.sh arrancar` | Arranca tu backend en el puerto 8766 (también `parar`, `reiniciar`, `estado`, `log`) |
| `curl -s localhost:8766/api/salud` | ¿Está vivo? Debe decir `"db":true,"llm":true` |
| `cd /trabajo/chatbot && bun test pruebas/` | Pruebas automáticas (sin enviar nada a WhatsApp) |

En el visor: `chatbot` es tu bandeja; `chatbot/wireframe` y `chatbot/prototipo`, el diseño. El botón «Móvil» la muestra a 393 px y «Consola» te enseña los errores de la página.

## 3. Las skills de hoy (en orden)

| Fase | Skill | Qué construye |
|---|---|---|
| Siempre primero | `s3-chatbot-aula` | Carpeta, `chatbot.sh`, `api.js`, `index.html`, reglas del aula |
| Diseño | `s3-wireframe`, `s3-prototipo` | `FLUJOS.md`, wireframe en gris y prototipo navegable |
| WhatsApp | `s3-whatsapp-qr` | Vincular por QR, `evo.ts`, panel `<bot-qr>` |
| Datos y API | `s3-postgres`, `s3-back-elysia` | `db.ts`, `servidor.ts`, `negocio.json` |
| Front | `s3-front-lit` | Bandeja y chat en Lit |
| Integración | `s3-integracion` | El bot responde con el modelo; toma humana |
| Pruebas | `s3-pruebas-playwright`, `s3-pruebas-uso` | `bun test` y prueba con un teléfono real |

## 4. Reglas de WhatsApp (no se negocian)

- Solo el número de **pruebas** del equipo. Nadie vincula su número personal.
- El primer mensaje del bot dice que es un bot.
- El bot solo responde a quien le escribe. Nada de envíos masivos.
- El bot no cobra, no reserva ni cancela. Si el cliente lo pide, pasa a una persona.
- Nunca imprimas ni guardes claves (`EVO_TOKEN`, `OSITO_TOKEN`, `DATABASE_URL`). Para saber si existen: `test -n "$EVO_TOKEN" && echo definida`.

## 5. Si algo falla

| Síntoma | Qué hacer |
|---|---|
| El visor dice `asistente_apagado` | `sh /trabajo/chatbot/chatbot.sh arrancar`. Si dice «no arrancó», `sh chatbot.sh log` y pega el error al agente |
| `Address already in use` | `sh /trabajo/chatbot/chatbot.sh parar`, `aula parar` y vuelve a arrancar |
| El QR caducó o no se lee | Corre otra vez `aula whatsapp` y recarga `qr.png`. Escanea desde WhatsApp › Dispositivos vinculados, con brillo al máximo |
| El número se desconectó o no llegan mensajes | `aula whatsapp`: restaura tu instancia y su webhook y, si hace falta, te da un QR nuevo |
| «hola» no aparece en la bandeja | `curl -s localhost:8766/api/conversaciones`. Si sale vacío, `sh chatbot.sh log`: ¿llega el `POST /api/webhook`? |
| El bot se responde a sí mismo sin parar | `sh /trabajo/chatbot/chatbot.sh parar` YA. Falta el filtro `IsFromMe` (`s3-integracion`) |
| Siempre llega la disculpa | El modelo no respondió. `sh chatbot.sh log`: `401` es falta de `OSITO_TOKEN`; `TimeoutError`, gateway saturado: reintenta |
| La bandeja dice «Sin conexión con tu backend» | El backend está parado o el front no usa `pedir()` de `api.js` |
| `too many connections` | Falta `{ max: 3 }` en `db.ts` o quedaron procesos viejos: `sh chatbot.sh parar` |
| Te perdiste | Pídele al agente: «lee PLAN_TRABAJO.md, dime qué tarea sigue y su criterio» |

Si después de dos intentos sigue fallando, copia el error completo en el hilo de la clase en el LMS (sin claves).

## 6. Al terminar

- `bun test pruebas/` en verde y `PRUEBAS_DE_USO.md` con tus tiempos.
- Graba el video de la tarea 3 (1 minuto, sin cortes): pregunta de tu negocio, pregunta fuera del negocio y «quiero hablar con una persona».
- Para tu casa (opcional): llevar el mismo chatbot a tu laptop con Docker Compose está en el ejemplo «Docker Compose del asistente».
