---
name: s2-robo-chat
description: Construye el cerebro y el servidor de Robo, el asistente web de la sesión 2: personalidad.json (nombre, negocio, tono, tres preguntas), cerebro.py que habla con el modelo "clase" del gateway y devuelve texto más ánimo, y servidor.py con /api/chat y /api/salud. Úsalo cuando haya que hacer que Robo converse. Palabras gatillo: Robo chat, cerebro, responder preguntas, ánimo, personalidad, gateway, modelo clase, /api/chat, /api/salud.
nivel: completo
compat: [claude, codex, gpt, deepseek, glm, nemotron, ollama-pequeno]
---

# S2 · Robo: el chat

## Cuándo usar

Después de leer `s2-robo-aula`. Es la primera pieza: sin chat no hay avatar que reaccione. Usa el gateway de la clase (formato OpenAI), sin Ollama y sin descargas.

## Pasos

1. Crea `/trabajo/robo/personalidad.json` con los valores del alumno (los marcadores del plan). Ejemplo:
   ```json
   {"nombre": "Robo", "negocio": "una tienda de ropa en Lima", "tono": "cercano y breve",
    "color": "#2f6bff", "estilo_imagen": "flat pastel illustration, soft light",
    "faq": [{"p": "¿Cuál es el horario?", "r": "Lunes a sábado, de 9 am a 7 pm."}]}
   ```
   `estilo_imagen` va en INGLÉS. `faq` lleva las tres preguntas del negocio con su respuesta.
2. Crea `/trabajo/robo/cerebro.py`:
   ```python
   import json, os, re
   from pathlib import Path
   import httpx
   GATEWAY = os.environ.get("JMD_URL", "http://ai-orchestrator:4000").rstrip("/")
   TOKEN = os.environ.get("OSITO_TOKEN", "")
   P = json.loads((Path(__file__).parent / "personalidad.json").read_text(encoding="utf-8"))
   ANIMOS = ("feliz", "pensando", "sorprendido", "triste", "emocionado", "neutral")
   DATOS = "\n".join(f"- {f['p']} {f['r']}" for f in P.get("faq", []))
   SISTEMA = (f"Eres {P['nombre']}, un robot asistente de {P['negocio']}. Tono: {P['tono']}. "
              "Responde en español, máximo tres frases, sin emojis. Si no sabes algo, dilo.\n"
              f"Datos del negocio:\n{DATOS}\n"
              "Termina SIEMPRE con una última línea exacta: ANIMO: <feliz|pensando|sorprendido|triste|emocionado|neutral>")

   def pedir(mensajes, max_tokens=300, temperatura=0.7, como_json=False):
       if not TOKEN:
           raise RuntimeError("falta OSITO_TOKEN")
       cuerpo = {"model": "clase", "messages": mensajes, "temperature": temperatura,
                 "max_tokens": max_tokens, "reasoning": {"enabled": False}}
       if como_json:
           cuerpo["response_format"] = {"type": "json_object"}
       r = httpx.post(f"{GATEWAY}/v1/chat/completions", json=cuerpo, timeout=45,
                      headers={"Authorization": f"Bearer {TOKEN}"})
       r.raise_for_status()
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
3. Prueba el cerebro solo: `cd /trabajo/robo && python3 -c "import cerebro; print(cerebro.chat('hola', []))"` imprime una tupla `(texto, animo)`.
4. Crea `/trabajo/robo/servidor.py` (las demás skills le añaden rutas):
   ```python
   from pathlib import Path
   import httpx
   from fastapi import FastAPI
   from fastapi.responses import JSONResponse
   from fastapi.staticfiles import StaticFiles
   from pydantic import BaseModel, Field
   import cerebro

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

   @app.get("/api/salud")
   def salud():
       try:
           llm = bool(cerebro.TOKEN) and httpx.get(f"{cerebro.GATEWAY}/health", timeout=2).status_code == 200
       except Exception:
           llm = False
       return {"nombre": cerebro.P["nombre"], "llm": llm}

   @app.post("/api/chat")
   def api_chat(p: PeticionChat):
       try:
           texto, animo = cerebro.chat(p.mensaje, [t.model_dump() for t in p.historial])
           return {"texto": texto, "animo": animo, "fuente": "nube"}
       except Exception as e:
           return JSONResponse({"error": f"el modelo no respondió: {e}"}, status_code=502)

   # SIEMPRE al final: sirven imágenes y la página
   app.mount("/imagenes", StaticFiles(directory=DIR_IMG), name="imagenes")
   app.mount("/", StaticFiles(directory=AQUI, html=True), name="web")
   ```
5. Arranca (`sh /trabajo/robo/robo.sh reiniciar`) y prueba:
   ```sh
   curl -s localhost:8766/api/salud
   curl -s -X POST localhost:8766/api/chat -H 'Content-Type: application/json' -d '{"mensaje":"¿Cuál es el horario?","historial":[]}'
   ```

## Errores típicos

- `502 falta OSITO_TOKEN`: el servidor arrancó sin la variable. Reinicia desde la terminal del aula, no desde un proceso viejo.
- El texto termina con `ANIMO: feliz` a la vista: el modelo la pegó en la misma línea; `separar_animo` ya la busca en cualquier parte. Si persiste, baja `temperatura` a 0.4.
- Respuestas de 10 frases: sube la regla («máximo tres frases») y baja `max_tokens` a 200.
- El modelo inventa un horario: la respuesta debe salir de `faq`; añade al sistema «Si el dato no está arriba, di que no lo sabes».
- `422` al enviar un mensaje: falta el campo `mensaje` o el JSON no llevó `Content-Type: application/json`.
- No montes `StaticFiles("/")` antes de las rutas `/api/...`: las tapa.

## Versión corta para modelos pequeños

1. Crea `personalidad.json`, `cerebro.py` y `servidor.py` en `/trabajo/robo/`.
2. `cerebro.pedir` llama a `{JMD_URL}/v1/chat/completions` con `model: "clase"`, `reasoning: {"enabled": false}` y `Authorization: Bearer $OSITO_TOKEN`.
3. El sistema exige tres frases y una última línea `ANIMO: <uno de seis>`; `separar_animo` la quita.
4. `servidor.py`: `GET /api/salud` y `POST /api/chat` (`{mensaje, historial}` devuelve `{texto, animo}`).
5. Reinicia con `sh robo.sh reiniciar` y prueba con `curl`.
