---
name: aula-apis-puertos
description: "Cómo leer, levantar y comprobar APIs y backends dentro del aula con DeepSeek Harness. Puertos, Visor, 0.0.0.0 para el webhook, procesos en segundo plano, Postgres, Evolution Go y salida a internet. Úsalo ANTES de arrancar un servidor, llamar una API o decir que algo no responde. Palabras gatillo: API, backend, puerto, 8766, localhost, curl, fetch, Visor, webhook, docker, «no responde», «modo local», 503, asistente_apagado, connection refused."
nivel: completo
compat: [claude, codex, gpt, deepseek, glm, nemotron, ollama-pequeno]
---

# Aula · Leer y levantar APIs

## Cuándo usar

Siempre que vayas a arrancar un backend, llamar una API o diagnosticar por qué una página no llega a su servidor. Las recetas de computadora personal (`docker compose`, abrir `127.0.0.1:<puerto>` en el navegador, `?api=`) aquí no aplican.

## Hechos del aula (no los contradigas)

- Cada alumno tiene su propio contenedor. Tú corres dentro de él. **No hay Docker aquí dentro**: nunca propongas `docker` ni `docker compose`.
- El navegador del alumno **no** está en el aula. Solo ve lo que pasa por el Visor.
- El Visor sirve `/trabajo` en `/vista/<tú>/...` y reenvía `/vista/<tú>/api/...` a `http://localhost:8766/api/...`. **Solo el puerto 8766 se ve desde el navegador.**
- Todo lo que la página llame debe colgar de `/api/...` en el 8766. Otro puerto (8767, 9000…) sirve para `curl` dentro del aula, no para el Visor. Si necesitas dos servicios, el del 8766 reenvía al otro.
- El puerto 3080 es de DeepSeek Harness: no lo uses ni lo mates.
- `aula parar` libera el 8766 si lo ocupa el asistente. Antes de arrancar, mira quién lo usa: `netstat -ltnp`.
- Escucha en `0.0.0.0`, no en `127.0.0.1`: Evolution Go entrega el webhook por la red del aula, no por localhost. En Elysia: `.listen({ port: 8766, hostname: "0.0.0.0" })`.
- Servicios de la clase, ya listos: tu Postgres en `DATABASE_URL` y Evolution Go en `EVO_URL` con `EVO_TOKEN`. No instales ni levantes otro.
- Internet sale solo por el proxy de la clase, puertos 80 y 443. `curl`, `bun` y `fetch` ya lo usan solos. Otros puertos externos no salen.
- Escribe en `/trabajo`: persiste. `/tmp` tiene 64 MB y el home 32 MB; ambos se borran al reiniciar.
- Nunca imprimas ni guardes `DATABASE_URL`, `EVO_TOKEN`, `OSITO_TOKEN` ni `JMD_API_KEY`. Compruébalos así: `[ -n "$EVO_TOKEN" ] && echo presente`.
- WhatsApp: usa `aula whatsapp`. Nunca llames a `/instance/connect` a mano: borra el webhook.

## Pasos para leer una API

1. Mira qué escucha: `netstat -ltnp`.
2. Pide la salud con el código visible: `curl -s -m 5 -w '\n%{http_code}\n' localhost:8766/api/salud`.
3. Lee cada ruta que vas a usar con `curl -i` y copia la forma real del JSON. No la supongas.
4. Si hay documento de rutas (`openapi.json`, `README`, el código del servidor), léelo antes de escribir el cliente.
5. Comprueba desde el camino del navegador: la página debe llamar a `/vista/<tú>/api/...` con la ayuda `pedir()` de `api.js` o una ruta relativa.

## Pasos para levantar un backend

1. Libera el puerto si hace falta: `aula parar`.
2. Arranca en segundo plano, con registro en `/trabajo`:
   `cd /trabajo/<app> && nohup bun servidor.ts > /trabajo/<app>.log 2>&1 &`
   En el chatbot de la clase usa `sh /trabajo/chatbot/chatbot.sh reiniciar`.
3. Espera a que conteste: `for i in 1 2 3 4 5 6; do curl -s -m 2 localhost:8766/api/salud && break; sleep 1; done`.
4. Si no contesta, lee `tail -30 /trabajo/<app>.log` antes de cambiar código.

## Errores comunes

| Lo que ves | Qué significa | Qué hacer |
| --- | --- | --- |
| Visor: `asistente_apagado` o 503 | Nada escucha en el 8766 | Arranca tu backend en el 8766 |
| Página en «modo local» o sin datos | Tu API corre en otro puerto | Muévela al 8766 |
| `EADDRINUSE` en 8766 | Ya hay otro proceso | `aula parar` o `chatbot.sh parar` |
| El webhook no llega y `curl localhost` sí | Escuchas en `127.0.0.1` | Escucha en `0.0.0.0` |
| `fetch` falla en el Visor con ruta `/api/x` en otro origen | La CSP solo deja el mismo origen | Usa ruta relativa o `pedir()` |
| `docker: not found` | Aquí no hay Docker | Corre el proceso directo |

## Verificación

- `netstat -ltnp` muestra tu proceso en `0.0.0.0:8766`.
- `curl localhost:8766/api/salud` devuelve 200.
- La página abierta en el Visor muestra datos reales de la API.
