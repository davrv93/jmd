---
name: s3-chatbot-aula
description: Hechos del aula para construir el chatbot de WhatsApp de la sesión 3 (Lit + Bun + Elysia + PostgreSQL + Evolution Go). Carpeta /trabajo/chatbot, puerto 8766, chatbot.sh para arrancar sin bash, variables DATABASE_URL, EVO_URL, EVO_TOKEN y OSITO_TOKEN, cómo llama el front a la API dentro del visor. Úsalo ANTES de crear o arrancar cualquier archivo del chatbot. Palabras gatillo: chatbot, sesión 3, aula, visor, puerto 8766, chatbot.sh, bun, elysia, DATABASE_URL, EVO_TOKEN, "no abre en el visor", ruta de la API.
nivel: completo
compat: [claude, codex, gpt, deepseek, glm, nemotron, ollama-pequeno]
---

# S3 · El chatbot en el aula: el terreno

## Cuándo usar

Siempre primero. Esta skill no construye la app: dice dónde se escribe, cómo se arranca y cómo habla el front con la API. Las piezas están en `s3-wireframe`, `s3-prototipo`, `s3-whatsapp-qr`, `s3-postgres`, `s3-back-elysia`, `s3-front-lit`, `s3-integracion`, `s3-pruebas-playwright` y `s3-pruebas-uso`.

## Hechos del aula (no los contradigas)

- Alpine: hay `sh`, no `bash`. Hay `bun`, `psql`, `curl` y `jmd`. No hay Node ni Docker. Memoria: 384 MB; un solo proceso `bun`, sin `--watch` ni compilaciones.
- `elysia`, `@elysiajs/cors` y `postgres` ya están instalados en `/node_modules`: `import { Elysia } from "elysia"` funciona sin red. `bun install` solo llega a registry.npmjs.org (por `HTTPS_PROXY`).
- El chatbot vive en `/trabajo/chatbot/` (plano): `package.json`, `chatbot.sh`, `negocio.json`, `db.ts`, `evo.ts`, `bot.ts`, `servidor.ts`, `index.html`, `api.js`, `app.js`, `bot-*.js`, `recursos/`, `pruebas/`. El diseño va en `wireframe/` y `prototipo/`. `/trabajo` persiste; `/tmp` no.
- Variables ya definidas (léelas con `process.env`, nunca las imprimas ni las guardes en archivos):
  `DATABASE_URL` (tu Postgres, máximo 15 conexiones), `EVO_URL` (Evolution Go de la clase), `EVO_TOKEN` (clave de TU instancia), `EVO_INSTANCE`, `EVO_WEBHOOK` (URL del webhook ya fijada), `OSITO_TOKEN` (gateway de IA), `JMD_URL` (`http://ai-orchestrator:4000`).
- El webhook de tu instancia YA apunta a tu aula, puerto 8766, ruta `/api/webhook`. No lo cambies.
- Ayudas: `aula whatsapp` (estado del número; si no hay sesión, renueva el QR en `/trabajo/qr.png` durante unos 2,5 min hasta que vinculas), `aula db` (abre `psql` en tu base).
- El visor sirve `/trabajo` en `/vista/<tú>/...` y reenvía cualquier `/vista/<tú>/api/...` a `http://localhost:8766/api/...` (todos los métodos). Sirve html, css, js, json, svg, png, md; `.ts` no.
- La página corre con CSP: scripts propios y de `https://esm.sh`; `fetch` solo al mismo origen. Lit se importa de `https://esm.sh/lit@3`.

## Pasos

1. `mkdir -p /trabajo/chatbot/pruebas && cd /trabajo/chatbot`.
2. Archivo `/trabajo/chatbot/package.json`:
   ```json
   { "name": "chatbot", "private": true, "type": "module", "dependencies": { "elysia": "^1.4" } }
   ```
3. Archivo `/trabajo/chatbot/chatbot.sh` (arrancar, parar, reiniciar, estado, log):
   ```sh
   #!/bin/sh
   cd "$(dirname "$0")" || exit 1
   PID=/tmp/chatbot.pid; LOG=/trabajo/chatbot.log; PUERTO="${CHATBOT_PUERTO:-8766}"
   vivo() { [ -f "$PID" ] && kill -0 "$(cat "$PID")" 2>/dev/null; }
   parar() { vivo && kill "$(cat "$PID")"; rm -f "$PID"; echo parado; }
   arrancar() {
     vivo && { echo "ya arrancado"; return; }
     aula parar >/dev/null 2>&1                              # el asistente de ejemplo usa el 8766
     [ -f /trabajo/robo/robo.sh ] && sh /trabajo/robo/robo.sh parar >/dev/null 2>&1
     if [ ! -d node_modules/elysia ] && [ ! -d /node_modules/elysia ]; then   # en el aula ya viene en /node_modules
       bun install >> "$LOG" 2>&1 || { echo "bun install falló:"; tail -n 15 "$LOG"; return 1; }
     fi
     nohup bun servidor.ts >> "$LOG" 2>&1 &
     echo $! > "$PID"; i=0
     while [ "$i" -lt 15 ] && vivo && ! curl -s -o /dev/null "http://localhost:$PUERTO/api/salud"; do sleep 1; i=$((i + 1)); done
     if vivo; then echo "arrancado en $PUERTO"; else echo "no arrancó:"; tail -n 15 "$LOG"; return 1; fi
   }
   case "${1:-estado}" in
     arrancar) arrancar ;; parar) parar ;; reiniciar) parar; sleep 1; arrancar ;;
     estado) if vivo; then echo "arrancado en $PUERTO"; else echo parado; fi ;;
     log) tail -n 30 "$LOG" ;;
     *) echo "uso: sh chatbot.sh arrancar|parar|reiniciar|estado|log" >&2; exit 2 ;;
   esac
   ```
4. Archivo `/trabajo/chatbot/api.js` (el front SIEMPRE llama a la API con esto, nunca con `../api` ni `localhost`):
   ```js
   // En el visor la página vive en /vista/<tú>/chatbot/ y la API en /vista/<tú>/api/.
   export const API = location.pathname.startsWith("/vista/")
     ? location.pathname.split("/").slice(0, 3).join("/") + "/api"
     : "/api";
   export async function pedir(ruta, cuerpo) {
     const r = await fetch(API + ruta, cuerpo === undefined ? {} : {
       method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) });
     const datos = await r.json().catch(() => ({}));
     if (!r.ok) throw new Error(datos.error ?? `error ${r.status}`);
     return datos;
   }
   ```
   Ejemplo: `/vista/ab12/chatbot/index.html` da `API = "/vista/ab12/api"`, y `pedir("/salud")` llega a `localhost:8766/api/salud`.
5. Copia los recursos y las pruebas de la plantilla: `cp -R /trabajo/plan-chatbot/recursos /trabajo/plan-chatbot/pruebas /trabajo/chatbot/` (fondos, logo, `webhook-hola.json` y `smoke-ui.mjs`).
6. Archivo `/trabajo/chatbot/index.html`, la página base del front (con ella el visor lista el proyecto `chatbot`). Cambia `--marca` por el color del negocio:
   ```html
   <!doctype html>
   <html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
   <title>Bandeja del bot</title>
   <style>
     :root { --marca: #0f766e; --fondo: #f6f7f9; --panel: #fff; --suave: #eef2f4; --borde: #d7dde2; --texto: #1c2227;
       --tenue: #5b6670; --saliente: #d9f2ec; --aviso: #ffd166; --exito: #2fbf71; --peligro: #d64545;
       --fondo-chat: var(--fondo) url(recursos/fondo-chat.svg); color-scheme: light dark; }
     @media (prefers-color-scheme: dark) { :root { --fondo: #12171b; --panel: #1b2227; --suave: #242d33; --borde: #2f3a41;
       --texto: #e6ebee; --tenue: #9aa6ae; --saliente: #134e48; --fondo-chat: var(--fondo) url(recursos/fondo-chat-oscuro.svg); } }
     body { margin: 0; font: 15px/1.45 system-ui, sans-serif; background: var(--fondo); color: var(--texto); }
   </style>
   <script type="module" src="app.js"></script></head>
   <body><bot-app></bot-app></body></html>
   ```
7. Cada vez que cambies un `.ts` o `negocio.json`: `sh /trabajo/chatbot/chatbot.sh reiniciar`. Los `.js` y `.html` del front basta con recargar el visor.

## Errores típicos

- El visor dice `asistente_apagado`: el backend no corre. `sh chatbot.sh arrancar`; si falla, `sh chatbot.sh log`.
- `Address already in use`: otro proceso tiene el 8766. `sh chatbot.sh parar`, `aula parar` y `sh /trabajo/robo/robo.sh parar`.
- `bun install falló`: no hace falta, Elysia ya está en `/node_modules`. Comprueba con `ls /node_modules/elysia`; si no está, avisa al instructor. No cambies de framework.
- La API da 404 en el visor pero con `curl` funciona: el front usó `fetch("/api/...")` o `../api`. Usa `pedir()` de `api.js`.
- ¿Existe la clave? `test -n "$EVO_TOKEN" && echo definida` (nunca `echo $EVO_TOKEN`).

## Versión corta para modelos pequeños

1. Todo en `/trabajo/chatbot/`. Puerto 8766. Sin bash: `sh`.
2. Arranca con `sh /trabajo/chatbot/chatbot.sh arrancar`; tras cambiar un `.ts`, `reiniciar`.
3. Prueba con `curl -s localhost:8766/api/salud`. Si falla, `sh chatbot.sh log`.
4. El front llama con `pedir("/ruta")` de `api.js` (base `/vista/<tú>/api`).
5. Claves en `process.env`. Nunca las imprimas.
