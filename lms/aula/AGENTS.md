# Tu aula

- Tu trabajo vive en `/trabajo`. Lo que guardes ahí se queda hasta que termine la clase.
- El código de tu asistente está en `/trabajo/osito`. Para arrancarlo: `aula iniciar`. Para pararlo: `aula parar`.
- El asistente corre en el puerto 8766 en modo nube. Míralo en el panel «Visor».
- No hay internet desde esta terminal, solo el gateway de IA de la clase.
- Tus skills están en `~/.config/jmd/skills`. Pídele al agente: `jmd chat "/skill plan-de-trabajo ..."`.
- Pega solo comandos que entiendas. Si algo falla, copia el error completo y pregúntale al agente.
- No guardes claves ni contraseñas en archivos.
- Si tu terminal se cierra, ábrela de nuevo: tus archivos siguen aquí.
- Para construir tu propio robot (Robo): `aula nuevo plan-robo`, abre `/trabajo/plan-robo/PROMPT_ARMAR_ROBO.md` y pega el prompt a tu agente. Los skills `s2-robo-*` le explican cada pieza.

## Clase 3: tu chatbot de WhatsApp

- Crea el plan: `aula nuevo plan-chatbot`. Abre `plan-chatbot` en el visor y pega a `jmd` el prompt de `/trabajo/plan-chatbot/PROMPT_ARMAR_CHATBOT.md`. Si algo falla, lee `/trabajo/plan-chatbot/INDICACIONES.md`.
- El chatbot se construye en `/trabajo/chatbot` con Lit (front, sin build), Bun + Elysia (API en el puerto 8766) y tu PostgreSQL. `elysia` y `postgres` ya están instalados.
- Skills de la clase, en orden: `s3-chatbot-aula` (siempre primero), `s3-wireframe`, `s3-prototipo`, `s3-whatsapp-qr`, `s3-postgres`, `s3-back-elysia`, `s3-front-lit`, `s3-integracion`, `s3-pruebas-playwright`, `s3-pruebas-uso`.
- Arranca y para tu API con `sh /trabajo/chatbot/chatbot.sh arrancar|parar|reiniciar|estado|log` (no con `aula iniciar`: usa el mismo puerto).
- `aula whatsapp`: estado del número; si no hay sesión, renueva el QR en `/trabajo/qr.png` (unos 2,5 min). También restaura la instancia si se desconectó. Nunca llames a `/instance/connect` a mano.
- `aula db`: abre `psql` en tu base (`DATABASE_URL`). Sal con `\q`.
- El front llama a la API con rutas `/vista/<tú>/api/...` (usa `pedir()` de `api.js`). Pruebas: `cd /trabajo/chatbot && bun test pruebas/`.
- WhatsApp: solo el número de pruebas del equipo; el bot avisa que es un bot y solo responde a quien le escribe. Nunca imprimas `EVO_TOKEN`, `OSITO_TOKEN` ni `DATABASE_URL`.
