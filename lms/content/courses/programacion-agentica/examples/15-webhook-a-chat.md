---
id: ej-webhook-a-chat
title: "Del webhook de WhatsApp al chat del asistente"
summary: El JSON que manda Evolution, una ruta FastAPI mínima que lo filtra, llama a /api/chat y responde por sendText, y el curl para probarla sin teléfono.
tags: [whatsapp, fastapi, webhook, evolution-api]
level: intermedio
lesson: pa-03
order: 15
---
La ruta `/api/whatsapp/webhook` es el puente: recibe lo que Evolution API le manda, decide si hay
que responder, pregunta a `/api/chat` (que ya existe en el backend del asistente) y devuelve la
respuesta por `sendText`. Todo en un archivo, para entenderlo entero.

## El JSON que llega

Guardado de un mensaje real, recortado a lo que importa (`pruebas/webhook-hola.json`):

```json
{
  "event": "messages.upsert",
  "instance": "tienda",
  "data": {
    "key": { "remoteJid": "51999888777@s.whatsapp.net", "fromMe": false, "id": "3EB0A1B2C3" },
    "pushName": "Cliente",
    "message": { "conversation": "hola, tienen stock del producto A-102?" },
    "messageType": "conversation",
    "messageTimestamp": 1761180000
  },
  "sender": "51999888777@s.whatsapp.net",
  "server_url": "http://localhost:8080"
}
```

`remoteJid` termina en `@s.whatsapp.net` si es una persona y en `@g.us` si es un grupo.
`fromMe` es `true` cuando el mensaje lo mandó tu propio número (incluido el bot).

## La ruta mínima

Añádela al backend FastAPI (`osito/backend/app.py`) o en un archivo aparte importado desde ahí.
Necesita `httpx` (`pip install httpx`).

```python
import os
import httpx
from fastapi import BackgroundTasks, Request

EVOLUTION_URL = os.environ.get("EVOLUTION_URL", "http://localhost:8080")
EVOLUTION_APIKEY = os.environ.get("EVOLUTION_APIKEY", "")
EVOLUTION_INSTANCIA = os.environ.get("EVOLUTION_INSTANCIA", "tienda")
CHAT_URL = os.environ.get("CHAT_URL", "http://127.0.0.1:8766/api/chat")

conversaciones: dict[str, list[dict]] = {}   # jid -> [{"de": "cliente"|"bot"|"tu", "texto": ...}]
modo_humano: set[str] = set()                 # jids que una persona tomó

DISCULPA = "No estoy seguro de eso todavía, te paso con una persona."


def enviar_texto(jid: str, texto: str) -> None:
    numero = jid.split("@")[0]
    httpx.post(
        f"{EVOLUTION_URL}/message/sendText/{EVOLUTION_INSTANCIA}",
        headers={"apikey": EVOLUTION_APIKEY},
        json={"number": numero, "text": texto},
        timeout=20,
    )


def atender(jid: str, texto: str) -> None:
    historial = conversaciones.setdefault(jid, [])
    historial.append({"de": "cliente", "texto": texto})
    if jid in modo_humano:
        return                                   # una persona está al mando: el bot calla
    try:
        r = httpx.post(CHAT_URL, json={"mensaje": texto, "historial": []}, timeout=30)
        respuesta = r.json().get("texto") or DISCULPA
    except Exception:
        respuesta = DISCULPA
    historial.append({"de": "bot", "texto": respuesta})
    enviar_texto(jid, respuesta)


@app.post("/api/whatsapp/webhook")
async def whatsapp_webhook(request: Request, tareas: BackgroundTasks):
    cuerpo = await request.json()
    if cuerpo.get("event") != "messages.upsert":
        return {"ok": True, "ignorado": "evento"}
    data = cuerpo.get("data") or {}
    key = data.get("key") or {}
    jid = key.get("remoteJid", "")
    if key.get("fromMe"):
        return {"ok": True, "ignorado": "propio"}
    if jid.endswith("@g.us"):
        return {"ok": True, "ignorado": "grupo"}
    mensaje = data.get("message") or {}
    texto = mensaje.get("conversation") or (mensaje.get("extendedTextMessage") or {}).get("text")
    if not texto:
        tareas.add_task(enviar_texto, jid, "Por ahora solo entiendo texto.")
        return {"ok": True, "ignorado": "sin-texto"}
    tareas.add_task(atender, jid, texto)        # respondemos 200 ya; el modelo tarda segundos
    return {"ok": True}
```

Cuatro decisiones que importan:

- **Siempre `200`.** Si devuelves error, Evolution reintenta y el cliente recibe dos respuestas.
- **`fromMe` se ignora** o el bot se responde a sí mismo para siempre.
- **Trabajo en segundo plano.** El modelo tarda de 3 a 8 s; Evolution no debe esperar.
- **Respuesta de respaldo.** Si `/api/chat` falla, el cliente recibe la disculpa, no silencio.

El evento de SSE hacia la bandeja (`/api/whatsapp/eventos`) y el interruptor
(`POST /api/whatsapp/conversaciones/{jid}/modo`) se añaden sobre `conversaciones` y
`modo_humano`: es lo que le pides al agente en el bloque 6 de la clase.

## Probar sin teléfono

```bash
export EVOLUTION_APIKEY="tu-clave"
OSITO_PUERTO=8766 ./arrancar.sh      # en otra terminal

curl -s -X POST http://127.0.0.1:8766/api/whatsapp/webhook \
  -H "Content-Type: application/json" -d @pruebas/webhook-hola.json
# {"ok":true}  y, unos segundos después, el mensaje llega al teléfono del cliente
```

Y la prueba negativa: copia el JSON a `pruebas/webhook-propio.json`, cambia `"fromMe": true` y
repite el `curl`. Debe devolver `{"ok":true,"ignorado":"propio"}` sin enviar nada.

Si `sendText` responde 400 por el campo `text`, prueba `{"number": "...", "textMessage":
{"text": "..."}}`, que es la forma que muestra una de las páginas de la documentación. Revisa la
ruta y el cuerpo exactos en la documentación de tu versión.
