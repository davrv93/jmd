---
name: s2-robo-chat
description: Construye el cerebro y el servidor de Robo, el asistente web de la sesión 2 (kit robo-local-nube): personalidad.json validada (nombre saneado, avatar robot u osito, color hexadecimal, negocio, tono, tres preguntas), cerebro.py que habla con el modelo "clase" del gateway del curso por el aula local y devuelve texto más ánimo, y servidor.py con /api/chat y /api/salud. Úsalo cuando haya que hacer que Robo converse. Palabras gatillo: Robo chat, cerebro, responder preguntas, ánimo, personalidad, gateway, modelo clase, /api/chat, /api/salud, cuota, 429.
nivel: completo
compat: [claude, codex, gpt, deepseek, glm, nemotron, ollama-pequeno]
---

# S2 · Robo: el chat

## Cuándo usar

Después de leer `s2-robo-aula`. Es la primera pieza: sin chat no hay avatar que reaccione. El texto va por el gateway del curso (formato OpenAI) a través del aula local: sin Ollama, sin descargas y sin claves de proveedor.

## Pasos

1. Crea `trabajo/robo/personalidad.json` con los valores del alumno (los del plan). Ejemplo:
   ```json
   {"nombre": "Robo", "avatar": "robot", "color": "#2f6bff",
    "negocio": "una tienda de ropa en Lima", "tono": "cercano y breve",
    "estilo_imagen": "flat pastel illustration, soft light",
    "faq": [{"p": "¿Cuál es el horario?", "r": "Lunes a sábado, de 9 am a 7 pm."},
            {"p": "¿Hacen envíos?", "r": "Sí, a todo Lima en 48 horas."},
            {"p": "¿Aceptan Yape?", "r": "Sí, Yape y Plin."}]}
   ```
   Reglas (las de `s2-robo-aula`): `nombre` saneado de 1 a 24 caracteres; `avatar` `robot` u `osito`; `color` `#rrggbb`; `tono` hasta 60 caracteres; `estilo_imagen` en INGLÉS; `faq` con exactamente tres `{p, r}`. Comprueba con `python herramientas/revisar.py personalidad`.
2. Crea `trabajo/robo/cerebro.py`:
   ```python
   import json, os, re
   from pathlib import Path
   import httpx

   GATEWAY = os.environ.get("JMD_URL", "http://127.0.0.1:8800").rstrip("/")
   TOKEN = os.environ.get("OSITO_TOKEN", "")
   ANIMOS = ("feliz", "pensando", "sorprendido", "triste", "emocionado", "neutral")
   NOMBRE_OK = re.compile(r"^[0-9A-Za-zÁÉÍÓÚÜÑáéíóúüñ][0-9A-Za-zÁÉÍÓÚÜÑáéíóúüñ ._-]{0,23}$")

   def _validar(p):
       """personalidad.json mal escrita = error claro al arrancar, no un robot raro."""
       if not NOMBRE_OK.match(str(p.get("nombre", ""))):
           raise ValueError("personalidad.json: nombre de 1 a 24 letras, números, espacio, . _ -")
       if not re.fullmatch(r"#[0-9a-fA-F]{6}", str(p.get("color", ""))):
           raise ValueError("personalidad.json: color en hexadecimal #rrggbb")
       if p.get("avatar", "robot") not in ("robot", "osito"):
           raise ValueError("personalidad.json: avatar robot u osito")
       if len(str(p.get("tono", ""))) > 60:
           raise ValueError("personalidad.json: tono de hasta 60 caracteres")
       p["color"] = p["color"].lower()
       p.setdefault("avatar", "robot")
       return p

   P = _validar(json.loads((Path(__file__).parent / "personalidad.json").read_text(encoding="utf-8")))
   DATOS = "\n".join(f"- {f['p']} {f['r']}" for f in P.get("faq", []))
   SISTEMA = (f"Eres {P['nombre']}, un asistente de {P['negocio']}. Tono: {P['tono']}. "
              "Responde en español, máximo tres frases, sin emojis. Si el dato no está abajo, di que no lo sabes.\n"
              f"Datos del negocio:\n{DATOS}\n"
              "Termina SIEMPRE con una última línea exacta: ANIMO: <feliz|pensando|sorprendido|triste|emocionado|neutral>")

   class ErrorNube(Exception):
       """La nube del curso respondió con error: trae el estado HTTP y un mensaje para mostrar."""
       def __init__(self, estado, mensaje):
           super().__init__(mensaje)
           self.estado, self.mensaje = estado, mensaje

   def mensaje_de(r):
       try:
           e = r.json().get("error")
           return e.get("message") if isinstance(e, dict) else str(e or f"HTTP {r.status_code}")
       except ValueError:
           return f"HTTP {r.status_code}"

   def pedir(mensajes, max_tokens=300, temperatura=0.7, como_json=False):
       if not TOKEN:
           raise ErrorNube(503, "falta OSITO_TOKEN: arranca Robo con python trabajo/robo/robo.py")
       cuerpo = {"model": "clase", "messages": mensajes, "temperature": temperatura,
                 "max_tokens": max_tokens, "reasoning": {"enabled": False}}
       if como_json:
           cuerpo["response_format"] = {"type": "json_object"}
       try:
           r = httpx.post(f"{GATEWAY}/v1/chat/completions", json=cuerpo, timeout=60,
                          headers={"Authorization": f"Bearer {TOKEN}"})
       except httpx.HTTPError as e:
           raise ErrorNube(503, f"el aula local no responde ({type(e).__name__}): ¿corre sh iniciar.sh?")
       if r.status_code != 200:
           raise ErrorNube(r.status_code, mensaje_de(r))
       texto = r.json()["choices"][0]["message"].get("content") or ""
       return re.sub(r"<think>.*?</think>", "", texto, flags=re.S).strip()

   def separar_animo(texto):
       animo, m = "neutral", None
       for m in re.finditer(r"[\s*(\[]*ANIMO\s*:\s*\**\s*([a-záéíóú]+)[\s*)\].]*", texto, re.I):
           pass
       if m:
           animo = m.group(1).lower() if m.group(1).lower() in ANIMOS else "neutral"
           texto = texto[:m.start()] + texto[m.end():]
       return texto.strip(), animo

   def chat(mensaje, historial):
       msgs = [{"role": "system", "content": SISTEMA}]
       for t in historial[-8:]:
           msgs.append({"role": "user" if t.get("rol") == "usuario" else "assistant", "content": t.get("texto", "")})
       msgs.append({"role": "user", "content": mensaje})
       return separar_animo(pedir(msgs))
   ```
3. Prueba el cerebro solo: `cd trabajo/robo && python -c "import cerebro; print(cerebro.chat('hola', []))"` imprime una tupla `(texto, animo)` (en Windows y Mac: `python herramientas/verificar.py F1-T1`).
4. Crea `trabajo/robo/servidor.py` (las demás skills le añaden rutas):
   ```python
   import os
   from pathlib import Path
   import httpx
   from fastapi import FastAPI, Request
   from fastapi.responses import JSONResponse, Response
   from fastapi.staticfiles import StaticFiles
   from pydantic import BaseModel, Field
   import cerebro

   import mimetypes
   mimetypes.add_type("text/javascript", ".js")   # Windows: el registro a veces dice text/plain

   AQUI = Path(__file__).resolve().parent
   DIR_IMG = AQUI / "imagenes"
   DIR_IMG.mkdir(exist_ok=True)
   app = FastAPI(title=cerebro.P["nombre"])

   class Turno(BaseModel):
       rol: str = "usuario"
       texto: str = ""

   class PeticionChat(BaseModel):
       mensaje: str = Field(min_length=1, max_length=2000)
       historial: list[Turno] = []

   IMAGEN_SALUD = os.environ.get("IMAGEN_URL", "http://127.0.0.1:8800/imagen").rstrip("/") + "/salud"

   def vivo(url):
       try:
           return httpx.get(url, timeout=4).status_code == 200
       except Exception:
           return False

   def estado_nube():
       """Lo que dice el aula local de los servicios del curso ({maxima, voz, stt, ...}); {} si no responde."""
       try:
           r = httpx.get(IMAGEN_SALUD, timeout=8)
           return r.json() if r.status_code == 200 else {}
       except Exception:
           return {}

   def fallo(e):
       """ErrorNube -> respuesta con el mismo estado (401, 422, 429, 503) y un mensaje que se puede mostrar."""
       estado = e.estado if isinstance(e, cerebro.ErrorNube) and e.estado in (401, 413, 422, 429, 503) else 502
       return JSONResponse({"error": getattr(e, "mensaje", str(e))}, status_code=estado)

   @app.get("/api/salud")
   def salud():
       n = estado_nube()
       return {"nombre": cerebro.P["nombre"], "avatar": cerebro.P["avatar"], "color": cerebro.P["color"],
               "llm": bool(cerebro.TOKEN) and vivo(f"{cerebro.GATEWAY}/health"),
               "imagen": bool(n.get("maxima")), "stt": bool(n.get("stt")), "voz": bool(n.get("voz"))}

   @app.post("/api/chat")
   def api_chat(p: PeticionChat):
       try:
           texto, animo = cerebro.chat(p.mensaje, [t.model_dump() for t in p.historial])
           return {"texto": texto, "animo": animo, "fuente": "nube"}
       except Exception as e:
           return fallo(e)

   # SIEMPRE al final: sirven imágenes y la página
   app.mount("/imagenes", StaticFiles(directory=DIR_IMG), name="imagenes")
   app.mount("/", StaticFiles(directory=AQUI, html=True), name="web")
   ```
5. Arranca (`python trabajo/robo/robo.py reiniciar`) y prueba:
   ```sh
   curl -s localhost:8788/api/salud
   curl -s -X POST localhost:8788/api/chat -H 'Content-Type: application/json' -d '{"mensaje":"¿Cuál es el horario?","historial":[]}'
   ```

## Errores típicos

- `ValueError: personalidad.json: ...` al arrancar (en `trabajo/robo.log`): corrige el campo que dice y reinicia.
- `401` con «token del curso venció»: lo resuelve el alumno con `sh iniciar.sh --token` (Windows: `iniciar.bat --token`); no es tu código.
- `429` «cuota de hoy»: el alumno gastó su cuota diaria de texto; se reinicia a las 00:00 UTC (19:00 en Lima). Muéstralo tal cual.
- El texto termina con `ANIMO: feliz` a la vista: el modelo la pegó en la misma línea; `separar_animo` ya la busca en cualquier parte. Si persiste, baja `temperatura` a 0.4.
- El modelo inventa un horario: la respuesta debe salir de `faq`; el sistema ya dice «si el dato no está abajo, di que no lo sabes».
- `422` al enviar un mensaje: falta el campo `mensaje` o el JSON no llevó `Content-Type: application/json`.
- No montes `StaticFiles("/")` antes de las rutas `/api/...`: las tapa.

## Versión corta para modelos pequeños

1. Crea `personalidad.json` (nombre saneado, avatar, color `#rrggbb`, negocio, tono, estilo en inglés, 3 FAQ), `cerebro.py` y `servidor.py` en `trabajo/robo/`.
2. `cerebro.pedir` llama a `{JMD_URL}/v1/chat/completions` con `model: "clase"`, `reasoning: {"enabled": false}` y `Authorization: Bearer $OSITO_TOKEN`; un error de la nube es `ErrorNube(estado, mensaje)`.
3. El sistema exige tres frases y una última línea `ANIMO: <uno de seis>`; `separar_animo` la quita.
4. `servidor.py`: `GET /api/salud` (`{nombre, avatar, color, llm, imagen, stt, voz}`) y `POST /api/chat` (`{mensaje, historial}` devuelve `{texto, animo}`).
5. Reinicia con `python trabajo/robo/robo.py reiniciar` y prueba con `curl`.
