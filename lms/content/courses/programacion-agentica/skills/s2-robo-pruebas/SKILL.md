---
name: s2-robo-pruebas
description: Prueba y mide a Robo, el asistente web de la sesión 2: script pruebas.py que verifica salud, chat, imágenes por calidad y flyer con datos exactos, tabla de tiempos esperados y plantilla de MEDICIONES.md, más la prueba de uso con otra persona. Úsalo al cerrar cada tarea del plan y al final de la clase. Palabras gatillo: probar Robo, medir tiempos, pruebas.py, criterio de aceptación, MEDICIONES, cuánto tarda la imagen, prueba de uso, checklist, "¿ya está listo?".
nivel: completo
compat: [claude, codex, gpt, deepseek, glm, nemotron, ollama-pequeno]
---

# S2 · Robo: probar y medir

## Cuándo usar

Al cerrar CADA tarea del plan (el criterio es la prueba) y al final, con todo junto. Marca una tarea `hecha` solo cuando su prueba dio sí. Para la prueba con otra persona usa también `pruebas-de-uso`.

## Pasos

1. Crea `/trabajo/robo/pruebas.py`. Prueba el servidor YA arrancado; no arranca nada:
   ```python
   import sys, time
   from pathlib import Path
   import httpx
   from PIL import Image

   BASE = next((a for a in sys.argv[1:] if a.startswith("http")), "http://localhost:8766")
   ANIMOS = {"feliz", "pensando", "sorprendido", "triste", "emocionado", "neutral"}
   PEDIDO = "flyer de una liquidación el sábado 18 de octubre a las 10 am a S/ 20"
   post = lambda ruta, cuerpo: httpx.post(BASE + ruta, json=cuerpo, timeout=300)

   def salud():
       s = httpx.get(BASE + "/api/salud", timeout=10).json()
       assert s["llm"] and s["imagen"], s
       return s["nombre"]

   def chat():
       r = post("/api/chat", {"mensaje": "¿Hacen envíos?", "historial": []}); d = r.json()
       assert r.status_code == 200 and d["texto"] and d["animo"] in ANIMOS, d
       return "animo=" + d["animo"]

   def imagen(calidad):
       def f():
           d = post("/api/imagen", {"prompt": "un robot amable saludando", "tipo": "imagen", "calidad": calidad}).json()
           r = httpx.get(f"{BASE}/{d['url']}", timeout=10)
           assert r.status_code == 200 and r.headers["content-type"] == "image/jpeg", d
           return d["motor"]
       return f

   def flyer():
       d = post("/api/imagen", {"prompt": PEDIDO, "tipo": "flyer", "calidad": "baja"}).json()
       x = d["datos"]
       assert x["fecha"].endswith("18 de octubre") and x["hora"] == "10:00 am" and x["precio"] == "S/ 20", x
       assert Image.open(Path(__file__).parent / d["url"]).size == (1080, 1350)
       return "datos exactos, 1080x1350"

   def da_422(ruta, cuerpo):
       def f():
           assert post(ruta, cuerpo).status_code == 422
       return f

   pruebas = [("salud", salud), ("chat", chat), ("chat vacío da 422", da_422("/api/chat", {"mensaje": ""})),
              ("imagen baja", imagen("baja")), ("imagen media", imagen("media")), ("flyer baja", flyer),
              ("calidad inválida da 422", da_422("/api/imagen", {"prompt": "x", "calidad": "ultra"}))]
   if "--maxima" in sys.argv:
       pruebas.insert(5, ("imagen máxima", imagen("maxima")))
   filas = []
   for nombre, f in pruebas:
       t0 = time.time()
       try:
           ok, detalle = True, f()
       except Exception as e:
           ok, detalle = False, str(e)[:90]
       filas.append((nombre, "PASA" if ok else "FALLA", round(time.time() - t0, 1), detalle or ""))
   print("| prueba | resultado | segundos | detalle |\n|---|---|---|---|")
   for fila in filas:
       print("| " + " | ".join(str(c) for c in fila) + " |")
   sys.exit(0 if all(f[1] == "PASA" for f in filas) else 1)
   ```
2. Córrelo: `cd /trabajo/robo && python3 pruebas.py` (agrega `--maxima` si quieres medirla). Sale con código 0 solo si todo pasa.
3. Copia la tabla a `/trabajo/robo/MEDICIONES.md` y añade una columna «mi equipo» con lo que viste en pantalla.
4. A mano, en el visor: (a) el robot respira y cambia de ánimo al responder; (b) la voz arranca apagada; (c) Mic muestra el texto antes de enviar; (d) el flyer muestra fecha, hora y precio legibles.
5. Prueba de uso: una persona de otro equipo hace 3 tareas sin ayuda (preguntar un dato, pedir una imagen, pedir un flyer). Anota el tiempo de cada una, dónde dudó y UNA mejora. Mide la espera real, no la que prometes.

## Tiempos esperados (clase compartida, CPU)

| Qué | Esperado |
|---|---|
| Chat | 1-3 s |
| Imagen baja (384 px) | ≈ 6 s |
| Imagen media (512 px) | ≈ 13 s |
| Imagen máxima (FLUX) | ≈ 3-10 s; con cupo agotado cae a media |
| Flyer | la imagen de fondo + 2-4 s |

Con toda la clase pidiendo imágenes a la vez, hay cola y esperas más; el primer pedido tras un rato sin uso también tarda más. Anota la hora de cada medición.

## Errores típicos

- `llm` o `imagen` en `false` en salud: revisa `$OSITO_TOKEN` (`test -n "$OSITO_TOKEN"`) y los servicios con `curl -s http://imagen:8000/salud`.
- El flyer falla por `hora` o `fecha`: el pedido no usó «10 am» o «18 de octubre».
- `Connection refused`: Robo no está arrancado (`sh robo.sh estado`).
- Midiendo imágenes con otra cosa pesada en marcha: los tiempos salen peores; repite en silencio.
- Dar por hecha una tarea sin correr su prueba: «debería funcionar» es `en curso`.

## Versión corta para modelos pequeños

1. Crea `pruebas.py`: salud, chat, imagen baja y media, flyer con datos exactos, dos casos 422.
2. Corre `python3 pruebas.py`. Todas deben decir PASA.
3. Pega la tabla en `MEDICIONES.md` con los segundos.
4. Revisa a mano: robot, voz apagada, Mic, flyer legible.
5. Una persona ajena hace tres tareas; anota tiempos y una mejora.
