---
name: s2-robo-pruebas
description: Prueba y mide a Robo, el asistente web de la sesión 2 (kit robo-local-nube): script pruebas.py que verifica salud, personalidad válida (nombre, color, avatar), módulos 3D intactos, chat, imagen en calidad máxima, que baja diga «no disponible», flyer con datos exactos, dictado y voz; tabla de tiempos esperados, plantilla de MEDICIONES.md y la prueba de uso con otra persona. Úsalo al cerrar cada tarea del plan y al final de la clase. Palabras gatillo: probar Robo, medir tiempos, pruebas.py, criterio de aceptación, MEDICIONES, cuánto tarda la imagen, dictado, prueba de uso, checklist, "¿ya está listo?".
nivel: completo
compat: [claude, codex, gpt, deepseek, glm, nemotron, ollama-pequeno]
---

# S2 · Robo: probar y medir

## Cuándo usar

Al cerrar CADA tarea del plan (el criterio es la prueba) y al final, con todo junto. Marca una tarea `hecha` solo cuando su prueba dio sí. Para la prueba con otra persona usa también `pruebas-de-uso`.

## Pasos

1. Crea `trabajo/robo/pruebas.py`. Prueba el servidor YA arrancado; no arranca nada:
   ```python
   import json, subprocess, sys, time
   from pathlib import Path
   import httpx
   from PIL import Image

   if hasattr(sys.stdout, "reconfigure"):          # consola de Windows: tildes sin errores
       sys.stdout.reconfigure(encoding="utf-8", errors="replace")
   AQUI = Path(__file__).resolve().parent
   KIT = AQUI.parent.parent
   BASE = next((a for a in sys.argv[1:] if a.startswith("http")), "http://localhost:8788")
   P = json.loads((AQUI / "personalidad.json").read_text(encoding="utf-8"))
   ANIMOS = {"feliz", "pensando", "sorprendido", "triste", "emocionado", "neutral"}
   PEDIDO = "flyer de una liquidación el sábado 18 de octubre a las 10 am a S/ 20"
   post = lambda ruta, cuerpo: httpx.post(BASE + ruta, json=cuerpo, timeout=300)

   def revisar(que):
       def f():
           r = subprocess.run([sys.executable, str(KIT / "herramientas" / "revisar.py"), que], capture_output=True,
                              text=True, encoding="utf-8", errors="replace")
           assert r.returncode == 0, (r.stdout + r.stderr).strip()[-200:]
           return r.stdout.strip().splitlines()[-1]
       return f

   def salud():
       s = httpx.get(BASE + "/api/salud", timeout=20).json()
       assert s["llm"] and s["imagen"] and s["stt"], s
       assert s["nombre"] == P["nombre"] and s["avatar"] == P["avatar"] and s["color"] == P["color"].lower(), s
       return f"{s['nombre']} · {s['avatar']} · {s['color']}"

   def chat():
       r = post("/api/chat", {"mensaje": P["faq"][0]["p"], "historial": []}); d = r.json()
       assert r.status_code == 200 and d["texto"] and d["animo"] in ANIMOS, d
       return "animo=" + d["animo"]

   def imagen():
       r = post("/api/imagen", {"prompt": "un robot amable saludando", "tipo": "imagen", "calidad": "maxima"})
       if r.status_code == 429 and "cupo" not in r.json().get("error", ""):   # «vas muy rápido»: un reintento
           time.sleep(12)
           r = post("/api/imagen", {"prompt": "un robot amable saludando", "tipo": "imagen", "calidad": "maxima"})
       d = r.json()
       if r.status_code == 429:                   # sin cupo: vale si Robo lo explica
           assert "cupo" in d.get("error", ""), d
           return "sin cupo hoy: Robo lo explicó"
       g = httpx.get(f"{BASE}/{d['url']}", timeout=10)
       assert g.status_code == 200 and g.headers["content-type"] == "image/jpeg", d
       return f"{d['motor']} {d['segundos']} s"

   def baja_no_disponible():
       r = post("/api/imagen", {"prompt": "un robot", "tipo": "imagen", "calidad": "baja"})
       assert r.status_code == 422 and "no está disponible" in r.json().get("error", ""), r.text
       return "422 «no está disponible»"

   def flyer():
       d = post("/api/imagen", {"prompt": PEDIDO, "tipo": "flyer", "calidad": "maxima"}).json()
       x = d["datos"]
       assert x["fecha"].endswith("18 de octubre") and x["hora"] == "10:00 am" and x["precio"] == "S/ 20", x
       assert Image.open(AQUI / d["url"]).size == (1080, 1350)
       return "datos exactos, 1080x1350" + (f" ({d['motor']})" if d.get("aviso") else "")

   def dictado():
       wav = (KIT / "herramientas" / "prueba-voz.wav").read_bytes()
       d = httpx.post(BASE + "/api/stt", content=wav, headers={"Content-Type": "audio/wav"}, timeout=120).json()
       assert "horario" in d.get("texto", "").lower(), d
       return f"«{d['texto']}» en {d['segundos']} s"

   def voz():
       r = post("/api/voz", {"texto": "Hola"})
       assert r.status_code == 200 and len(r.content) > 1000, r.status_code
       return f"{len(r.content)} bytes"

   def da_422(ruta, cuerpo):
       def f():
           assert post(ruta, cuerpo).status_code == 422
       return f

   pruebas = [("personalidad válida", revisar("personalidad")), ("módulos 3D intactos", revisar("modulos")),
              ("sin claves en el kit", revisar("claves")), ("salud", salud), ("chat", chat),
              ("chat vacío da 422", da_422("/api/chat", {"mensaje": ""})), ("dictado", dictado), ("voz", voz),
              ("imagen máxima", imagen), ("baja no disponible", baja_no_disponible), ("flyer máxima", flyer),
              ("calidad inválida da 422", da_422("/api/imagen", {"prompt": "x", "calidad": "ultra"}))]
   if "--sin-imagenes" in sys.argv:              # para no gastar cupo al repetir
       pruebas = [p for p in pruebas if p[0] not in ("imagen máxima", "flyer máxima")]
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
2. Córrelo: `cd trabajo/robo && python pruebas.py` (agrega `--sin-imagenes` para repetir sin gastar cupo). Sale con código 0 solo si todo pasa. En Windows y Mac, el criterio de cada tarea del plan también se corre con `python herramientas/verificar.py <ID>` (y `todo` para todas).
3. Copia la tabla a `trabajo/robo/MEDICIONES.md` y añade una columna «mi equipo» con lo que viste en pantalla.
4. A mano, en el visor: (a) el avatar elegido (robot u osito) con tu color, respira y cambia de ánimo al responder; (b) la voz arranca apagada; (c) Mic muestra el texto antes de enviar; (d) el selector solo deja elegir «máxima»; (e) el flyer muestra fecha, hora y precio legibles.
5. Prueba de uso: una persona de otro equipo hace 3 tareas sin ayuda (preguntar un dato, pedir una imagen, pedir un flyer). Anota el tiempo de cada una, dónde dudó y UNA mejora. Mide la espera real, no la que prometes.

## Tiempos esperados (servicios del curso, por internet)

| Qué | Esperado |
|---|---|
| Chat | 1-3 s |
| Dictado de una frase de 5 s | 1-3 s (el primero tras un rato sin uso, 1-2 s más) |
| Voz Piper | menos de 2 s |
| Imagen máxima (FLUX, hasta 1024 px) | ≈ 3-15 s; sin cupo, 429 explicado |
| Imagen baja o media | no disponibles en esta versión (422) |
| Flyer | la imagen de fondo + 2-4 s |

Con toda la clase pidiendo a la vez hay cola y esperas más. Anota la hora de cada medición.

## Errores típicos

- `llm`, `imagen` o `stt` en `false` en salud: abre `http://127.0.0.1:8800/nube` (dice si el token vale y qué servicios responden). Token vencido: `sh iniciar.sh --token` (Windows: `iniciar.bat --token`).
- «personalidad válida» falla: `python herramientas/revisar.py personalidad` dice qué campo corregir.
- «módulos 3D intactos» falla: alguien editó o copió un módulo; vuelve a sacar `modulos/` del zip del kit y borra la copia de `trabajo/`.
- El flyer falla por `hora` o `fecha`: el pedido no usó «10 am» o «18 de octubre».
- `Connection refused`: Robo no está arrancado (`python trabajo/robo/robo.py estado`).
- Dar por hecha una tarea sin correr su prueba: «debería funcionar» es `en curso`.

## Versión corta para modelos pequeños

1. Crea `pruebas.py`: personalidad, módulos y claves (con `herramientas/revisar.py`), salud, chat, dictado, voz, imagen máxima, baja da 422 «no disponible», flyer con datos exactos, dos casos 422.
2. Corre `python pruebas.py`. Todas deben decir PASA.
3. Pega la tabla en `MEDICIONES.md` con los segundos.
4. Revisa a mano: avatar y color, voz apagada, Mic, selector solo con máxima, flyer legible.
5. Una persona ajena hace tres tareas; anota tiempos y una mejora.
