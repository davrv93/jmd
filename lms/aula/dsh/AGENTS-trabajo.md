# Reglas del aula para el agente

Corres dentro del contenedor del alumno, no en su computadora. Antes de arrancar un backend o llamar una API, lee la skill `aula-apis-puertos`.

- Solo el puerto **8766** se ve desde el navegador, por el Visor: `/vista/<tú>/api/...` llega a `localhost:8766/api/...`.
- Escucha en `0.0.0.0:8766`. No hay Docker aquí dentro.
- El puerto 3080 es de DeepSeek Harness: no lo toques.
- Postgres está en `DATABASE_URL`. Evolution Go está en `EVO_URL` con `EVO_TOKEN`. Nunca imprimas esas variables.
- WhatsApp: usa `aula whatsapp`. Nunca llames a `/instance/connect` a mano.
- Chatbot de la clase 3: empieza por la skill `s3-chatbot-aula`, y arranca con `sh /trabajo/chatbot/chatbot.sh reiniciar`.
