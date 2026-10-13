# Kit de la clase 3 · Chatbot de WhatsApp

Todo lo necesario para construir, en la clase 3, un chatbot de WhatsApp con agentes: front en **Lit** (sin build), backend en **Bun + Elysia**, base **PostgreSQL** y WhatsApp con **Evolution Go**.

## Qué trae

| Carpeta o archivo | Para qué |
|---|---|
| `LEEME.md` | Este archivo |
| `plan-chatbot/PLAN_TRABAJO.md` | Plan de 15 tareas (≈ 90 min) con criterio de aceptación por `curl`, `psql` o el visor; marcadores `<<...>>` para tu negocio |
| `plan-chatbot/PROMPT_ARMAR_CHATBOT.md` | Prompt corto para pegar en `jmd` (u otro agente) |
| `plan-chatbot/INDICACIONES.md` | Cómo entras al aula, qué comandos usas y qué hacer si algo falla |
| `plan-chatbot/index.html` | Muestra el plan, el prompt y las indicaciones en el visor |
| `plan-chatbot/pruebas/webhook-hola.json` | Un mensaje de Evolution Go para probar el webhook con `curl` (número que no existe) |
| `plan-chatbot/pruebas/smoke-ui.mjs` | Smoke de la bandeja con Playwright; se corre FUERA del aula |
| `skills/s3-*/SKILL.md` | Las 10 skills de la clase (ver tabla abajo) |
| `recursos/` | Fondos SVG (chat claro y oscuro, diapositiva y portada 16:9) y el ícono del bot |

## Las skills, en el orden del plan

| Skill | Qué hace |
|---|---|
| `s3-chatbot-aula` | Hechos del aula: carpeta, puerto 8766, `chatbot.sh`, `api.js` para el visor, variables |
| `s3-wireframe` | `FLUJOS.md` y wireframe en gris de 3 pantallas |
| `s3-prototipo` | Prototipo navegable en HTML estático, sin JavaScript |
| `s3-whatsapp-qr` | Vincular por QR, estados, `evo.ts` y panel `<bot-qr>` |
| `s3-postgres` | Esquema contactos/conversaciones/mensajes con `Bun.sql`, migración idempotente |
| `s3-back-elysia` | API en Elysia: salud, conversaciones, mensajes, modo, enviar, webhook, QR y estado |
| `s3-front-lit` | Bandeja y chat en Lit desde esm.sh |
| `s3-integracion` | Webhook → modelo «clase» → WhatsApp → bandeja; toma humana |
| `s3-pruebas-playwright` | `bun test` dentro del aula; Playwright fuera |
| `s3-pruebas-uso` | Guion con teléfono real, severidades y p50/p95 |

## Cómo usarlo

**En el aula del LMS (lo normal):** no necesitas el zip. Las skills ya están en tu agente y `aula nuevo plan-chatbot` copia el plan, las pruebas y los recursos a `/trabajo/plan-chatbot`. Sigue `INDICACIONES.md`.

**Fuera del aula (para leer o para tu casa):** copia `skills/s3-*` a la carpeta de skills de tu agente (`~/.config/jmd/skills`, `~/.claude/skills` o `.opencode/skills`). Las skills asumen el aula: variables `DATABASE_URL`, `EVO_URL`, `EVO_TOKEN`, `OSITO_TOKEN` y el visor en `/vista/<tú>/`. En tu laptop tendrás que darlas tú (Postgres propio, tu Evolution Go y tu proveedor de modelo).

**Recursos para el instructor:** `fondo-portada.svg` y `fondo-diapositiva.svg` son 1920×1080 para las diapositivas; `fondo-chat.svg` y `fondo-chat-oscuro.svg` son mosaicos de 120 px para la app; `logo-bot.svg` es el ícono (cambia `#0f766e` por el color del negocio).

## Reglas de WhatsApp

Solo el número de pruebas del equipo. El primer mensaje dice que es un bot. El bot solo responde a quien le escribe. Nunca se imprimen ni guardan claves.
