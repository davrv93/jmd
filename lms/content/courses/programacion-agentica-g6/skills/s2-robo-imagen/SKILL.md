---
name: s2-robo-imagen
description: Hace que Robo dibuje imágenes con el servicio de imagen local de la clase (sd-turbo en CPU, calidades baja y media) o con FLUX en Cloudflare (calidad máxima, con cupo diario). Traduce el pedido a inglés con el modelo de texto, guarda el JPEG y lo muestra en el chat; si el servicio falla usa el respaldo del gateway. Palabras gatillo: dibujar, imagen, pintor, calidad baja media máxima, /api/imagen, sd-turbo, FLUX, 429, cupo, prompt en inglés, "la imagen sale rara".
nivel: completo
compat: [claude, codex, gpt, deepseek, glm, nemotron, ollama-pequeno]
---

# S2 · Robo: dibujar imágenes

## Cuándo usar

Cuando el chat ya responde. El servicio de imagen ya está encendido en la clase: no se descarga nada ni se configura ninguna clave más que `$OSITO_TOKEN`.

## Servicio

`POST http://imagen:8000/generar` con `{"prompt": "<en INGLÉS>", "orientacion": "cuadrado|vertical|horizontal", "calidad": "baja|media|maxima"}` y `Authorization: Bearer $OSITO_TOKEN`. Devuelve JPEG.

- `baja` ≈ 6 s (1 paso, 384 px) y `media` ≈ 13 s (2 pasos, 512 px): sd-turbo local en CPU, hay cola.
- `maxima` ≈ 3-10 s: FLUX en Cloudflare con cupo diario. Si se agota responde `429`: Robo baja solo a `media`.
- `GET http://imagen:8000/salud` dice si `maxima` está disponible (`"maxima": true`).
- El modelo de imagen casi no entiende español: el pedido se traduce con el modelo de texto (`s2-robo-chat`).

## Pasos

1. Crea `/trabajo/robo/pintor.py`:
   ```python
   import base64, io, os
   import httpx
   from PIL import Image
   import cerebro

   IMAGEN_URL = os.environ.get("IMAGEN_URL", "http://imagen:8000").rstrip("/")
   CABECERA = {"Authorization": f"Bearer {cerebro.TOKEN}"}

   def en_ingles(texto):
       try:
           return cerebro.pedir([
               {"role": "system", "content": "Translate the user's request into ONE short, concrete English description of an image: "
                "main subject first, then setting (max 25 words). No style words. No text or letters. Reply with the description only."},
               {"role": "user", "content": texto}], max_tokens=120, temperatura=0.2).strip('"')
       except Exception:
           return texto

   def _servicio(prompt, orientacion, calidad):
       r = httpx.post(f"{IMAGEN_URL}/generar", headers=CABECERA, timeout=300,
                      json={"prompt": prompt, "orientacion": orientacion, "calidad": calidad})
       r.raise_for_status()
       return Image.open(io.BytesIO(r.content)).convert("RGB")

   def _respaldo(prompt, orientacion):
       forma = {"vertical": "vertical 4:5", "horizontal": "horizontal 16:9"}.get(orientacion, "cuadrado 1:1")
       r = httpx.post(f"{cerebro.GATEWAY}/v1/chat/completions", headers=CABECERA, timeout=120, json={
           "model": "imagen-flash", "modalities": ["image", "text"],
           "messages": [{"role": "user", "content": f"{prompt}. Formato {forma}. Sin ningún texto ni letras."}]})
       r.raise_for_status()
       url = r.json()["choices"][0]["message"]["images"][0]["image_url"]["url"]
       return Image.open(io.BytesIO(base64.b64decode(url.split(",", 1)[1]))).convert("RGB")

   def pintar(prompt_en, orientacion="cuadrado", calidad="baja"):
       """(imagen PIL, motor). «maxima» sin cupo (429) baja a «media»; si el servicio cae, usa el respaldo."""
       prompt = f"{prompt_en}. No text, no letters."
       try:
           try:
               return _servicio(prompt, orientacion, calidad), f"local-{calidad}"
           except httpx.HTTPStatusError as e:
               if calidad == "maxima" and e.response.status_code == 429:
                   return _servicio(prompt, orientacion, "media"), "local-media (sin cupo de maxima)"
               raise
       except Exception:
           return _respaldo(prompt, orientacion), "respaldo-imagen-flash"
   ```
2. En `servidor.py` añade `import time, uuid` e `import pintor`. Cambia el `return` de `/api/salud` por `{"nombre": ..., "llm": llm, "imagen": vivo(f"{pintor.IMAGEN_URL}/salud")}`, con este ayudante:
   ```python
   def vivo(url):
       try:
           return httpx.get(url, timeout=2).status_code == 200
       except Exception:
           return False
   ```
   Añade esta ruta antes de los `app.mount`:
   ```python
   class PeticionImagen(BaseModel):
       prompt: str = Field(min_length=1, max_length=500)
       tipo: str = "auto"                # auto | imagen | flyer
       calidad: str = "baja"             # baja | media | maxima
       orientacion: str = "cuadrado"     # cuadrado | vertical | horizontal

   @app.post("/api/imagen")
   def api_imagen(p: PeticionImagen):
       if p.calidad not in ("baja", "media", "maxima") or p.orientacion not in ("cuadrado", "vertical", "horizontal"):
           return JSONResponse({"error": "calidad: baja|media|maxima; orientacion: cuadrado|vertical|horizontal"}, status_code=422)
       es_flyer = p.tipo == "flyer" or (p.tipo == "auto" and any(k in p.prompt.lower() for k in ("flyer", "afiche", "volante", "poster", "cartel")))
       ident = uuid.uuid4().hex[:10]
       ruta = DIR_IMG / f"{ident}.jpg"
       t0 = time.time()
       try:
           if es_flyer:
               import flyer                       # lo escribes en s2-robo-flyer
               datos, motor = flyer.generar(p.prompt, ruta, p.calidad, acento=cerebro.P.get("color", "#9ad5ff"))
               extra = {"datos": datos}
           else:
               en = pintor.en_ingles(p.prompt)
               img, motor = pintor.pintar(f"{en}, {cerebro.P.get('estilo_imagen', '')}", p.orientacion, p.calidad)
               img.save(ruta, "JPEG", quality=90)
               extra = {"prompt_en": en}
       except Exception as e:
           return JSONResponse({"error": f"no pude generar la imagen: {e}"}, status_code=502)
       return {"url": f"imagenes/{ident}.jpg", "tipo": "flyer" if es_flyer else "imagen", "motor": motor,
               "segundos": round(time.time() - t0, 1), **extra}
   ```
3. En la página: dentro de `#barra` añade `<select id="calidad"><option value="baja">baja (6 s)</option><option value="media">media (13 s)</option><option value="maxima">máxima (3-10 s)</option></select> <button type="button" id="dibujar">Dibujar / flyer</button>` y en `app.js`:
   ```js
   $("dibujar").addEventListener("click", async () => {
     const pedido = $("texto").value.trim();
     if (!pedido) return burbuja("Escribe qué quieres dibujar (o un flyer con fecha, hora y precio).");
     $("texto").value = ""; burbuja(pedido, "yo");
     const espera = burbuja("Dibujando..."); robot.setAnimo("pensando");
     try {
       const r = await api("/api/imagen", { prompt: pedido, calidad: $("calidad").value, orientacion: "cuadrado" });
       espera.textContent = `${r.tipo} · ${r.motor} · ${r.segundos} s`;
       const img = document.createElement("img");
       img.src = new URL(r.url, location.href).href;   // relativa a la página: sirve en el visor
       img.alt = pedido;
       espera.append(img); robot.setAnimo("feliz");
     } catch (e) { espera.textContent = "No pude dibujar: " + e.message; robot.setAnimo("triste"); }
   });
   ```
4. Reinicia y prueba (`/api/imagen` con `tipo: "imagen"`):
   ```sh
   curl -s -X POST localhost:8766/api/imagen -H 'Content-Type: application/json' -d '{"prompt":"un robot amable saludando","tipo":"imagen","calidad":"baja"}'
   curl -s -o /dev/null -w '%{http_code} %{content_type}\n' localhost:8766/imagenes/<id>.jpg
   ```
   La primera imprime `url`, `motor` `local-baja` y `segundos` cerca de 6; la segunda, `200 image/jpeg`.

## Errores típicos

- Imagen sin relación con el pedido: llegó en español. Revisa `prompt_en` en la respuesta.
- `502 ... 429`: cola llena (hay 14 lugares para toda la clase). Reintenta en unos segundos.
- Texto garabateado dentro de la imagen: ningún modelo de imagen escribe bien; el texto va con Pillow (`s2-robo-flyer`).
- La primera imagen tarda más: el modelo estaba dormido; las siguientes salen en tiempo normal.
- `maxima` responde `local-media (sin cupo de maxima)`: se agotó el cupo diario; es lo esperado.
- `404` al mostrar la imagen en el visor: la URL debe ser relativa (`imagenes/<id>.jpg`) y el archivo existir en `/trabajo/robo/imagenes/`.

## Versión corta para modelos pequeños

1. Traduce el pedido a inglés con `cerebro.pedir` (máximo 25 palabras, sin texto en la imagen).
2. `POST http://imagen:8000/generar` con `{prompt, orientacion, calidad}` y Bearer `$OSITO_TOKEN`; la respuesta es JPEG.
3. Calidades: `baja` ≈ 6 s, `media` ≈ 13 s, `maxima` ≈ 3-10 s (si da 429, repite con `media`).
4. Guarda en `/trabajo/robo/imagenes/<id>.jpg` y devuelve `{url: "imagenes/<id>.jpg", motor, segundos}`.
5. Respaldo: gateway con `model: "imagen-flash"` y `modalities: ["image","text"]`.
