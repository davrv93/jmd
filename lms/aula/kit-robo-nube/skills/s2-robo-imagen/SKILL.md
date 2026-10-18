---
name: s2-robo-imagen
description: Hace que Robo dibuje imágenes con el servicio de imagen del curso (kit robo-local-nube). En esta versión solo existe la calidad «maxima» (FLUX en Cloudflare, con cupo diario de toda la clase); «baja» y «media» NO están disponibles y el servicio lo dice con un 422 claro. Traduce el pedido a inglés con el modelo de texto, guarda el JPEG y lo muestra en el chat; si se acaba el cupo (429), Robo lo explica. Palabras gatillo: dibujar, imagen, pintor, calidad máxima, baja, media, no disponible, /api/imagen, FLUX, Cloudflare, 429, cupo, prompt en inglés, "la imagen sale rara".
nivel: completo
compat: [claude, codex, gpt, deepseek, glm, nemotron, ollama-pequeno]
---

# S2 · Robo: dibujar imágenes

## Cuándo usar

Cuando el chat ya responde. El servicio de imagen del curso ya está encendido: no se descarga nada ni se configura ninguna clave más que `$OSITO_TOKEN`.

## Servicio

`POST http://127.0.0.1:8800/imagen/generar` (variable `IMAGEN_URL` + `/generar`) con `{"prompt": "<en INGLÉS>", "orientacion": "cuadrado|vertical|horizontal", "calidad": "maxima"}` y `Authorization: Bearer $OSITO_TOKEN`. Devuelve JPEG (hasta 1024 px).

- **Solo existe `maxima`** ≈ 3 a 15 s: FLUX.1 schnell en Cloudflare, pagado por el curso.
- `baja` y `media` responden `422` con `{"error": {"code": "calidad_no_disponible", "message": "La calidad «baja» no está disponible en esta versión..."}}`. No las ofrezcas como opción elegible.
- Cupo: `429` con `code` `cupo_diario` (se acabó el de toda la clase; vuelve a las 00:00 UTC, 19:00 en Lima) o `cupo_alumno` (tu tope de hoy). Robo lo explica; NO cae a otra calidad ni a otro servicio de pago.
- `GET http://127.0.0.1:8800/imagen/salud` dice qué hay: `"calidades": {"baja": false, "media": false, "maxima": true}`.
- El modelo de imagen casi no entiende español: el pedido se traduce con el modelo de texto (`s2-robo-chat`).

## Pasos

1. Crea `trabajo/robo/pintor.py`:
   ```python
   import io, os
   import httpx
   from PIL import Image
   import cerebro

   IMAGEN_URL = os.environ.get("IMAGEN_URL", "http://127.0.0.1:8800/imagen").rstrip("/")
   CABECERA = {"Authorization": f"Bearer {cerebro.TOKEN}"}
   CALIDADES = ("baja", "media", "maxima")      # en esta versión solo responde «maxima»

   def en_ingles(texto):
       try:
           return cerebro.pedir([
               {"role": "system", "content": "Translate the user's request into ONE short, concrete English description of an image: "
                "main subject first, then setting (max 25 words). No style words. No text or letters. Reply with the description only."},
               {"role": "user", "content": texto}], max_tokens=120, temperatura=0.2).strip('"')
       except cerebro.ErrorNube:
           return texto

   def pintar(prompt_en, orientacion="cuadrado", calidad="maxima"):
       """(imagen PIL, motor). Sin respaldos: si no se puede, ErrorNube con el estado y el motivo (422, 429, 503)."""
       try:
           r = httpx.post(f"{IMAGEN_URL}/generar", headers=CABECERA, timeout=150,
                          json={"prompt": f"{prompt_en}. No text, no letters.", "orientacion": orientacion, "calidad": calidad})
       except httpx.HTTPError as e:
           raise cerebro.ErrorNube(503, f"el servicio de imagen no responde ({type(e).__name__})")
       if r.status_code != 200:
           raise cerebro.ErrorNube(r.status_code, cerebro.mensaje_de(r))
       return Image.open(io.BytesIO(r.content)).convert("RGB"), f"nube-{calidad}"
   ```
2. En `servidor.py` añade `import time, uuid` e `import pintor`, y esta ruta antes de los `app.mount`:
   ```python
   class PeticionImagen(BaseModel):
       prompt: str = Field(min_length=1, max_length=500)
       tipo: str = "auto"                # auto | imagen | flyer
       calidad: str = "maxima"           # solo «maxima» está disponible
       orientacion: str = "cuadrado"     # cuadrado | vertical | horizontal

   @app.post("/api/imagen")
   def api_imagen(p: PeticionImagen):
       if p.calidad not in pintor.CALIDADES or p.orientacion not in ("cuadrado", "vertical", "horizontal"):
           return JSONResponse({"error": "calidad: maxima (baja y media no están disponibles); orientacion: cuadrado|vertical|horizontal"}, status_code=422)
       es_flyer = p.tipo == "flyer" or (p.tipo == "auto" and any(k in p.prompt.lower() for k in ("flyer", "afiche", "volante", "poster", "cartel")))
       ident = uuid.uuid4().hex[:10]
       ruta = DIR_IMG / f"{ident}.jpg"
       t0 = time.time()
       try:
           if es_flyer:
               import flyer                       # lo escribes en s2-robo-flyer
               datos, motor, aviso = flyer.generar(p.prompt, ruta, p.calidad, acento=cerebro.P["color"])
               extra = {"datos": datos, **({"aviso": aviso} if aviso else {})}
           else:
               en = pintor.en_ingles(p.prompt)
               img, motor = pintor.pintar(f"{en}, {cerebro.P.get('estilo_imagen', '')}", p.orientacion, p.calidad)
               img.save(ruta, "JPEG", quality=90)
               extra = {"prompt_en": en}
       except Exception as e:
           return fallo(e)                        # 422 no disponible, 429 sin cupo, 503 caído: con su mensaje
       return {"url": f"imagenes/{ident}.jpg", "tipo": "flyer" if es_flyer else "imagen", "motor": motor,
               "segundos": round(time.time() - t0, 1), **extra}
   ```
3. En la página: dentro de `#barra` añade
   ```html
   <select id="calidad" title="En esta versión solo hay calidad máxima">
     <option value="maxima" selected>máxima (3-15 s)</option>
     <option value="media" disabled>media (no disponible)</option>
     <option value="baja" disabled>baja (no disponible)</option>
   </select>
   <button type="button" id="dibujar">Dibujar / flyer</button>
   ```
   y al final de `app.js`:
   ```js
   $("dibujar").addEventListener("click", async () => {
     const pedido = $("texto").value.trim();
     if (!pedido) return burbuja("Escribe qué quieres dibujar (o un flyer con fecha, hora y precio).");
     $("texto").value = ""; burbuja(pedido, "yo");
     const espera = burbuja("Dibujando..."); robot.setAnimo("pensando");
     try {
       const r = await api("/api/imagen", { prompt: pedido, calidad: $("calidad").value, orientacion: "cuadrado" });
       espera.textContent = `${r.tipo} · ${r.motor} · ${r.segundos} s${r.aviso ? " · " + r.aviso : ""}`;
       const img = document.createElement("img");
       img.src = new URL(r.url, location.href).href;   // relativa a la página: sirve en el visor
       img.alt = pedido;
       espera.append(img); robot.setAnimo("feliz");
     } catch (e) { espera.textContent = "No pude dibujar: " + e.message; robot.setAnimo("triste"); }
   });
   ```
4. Reinicia y prueba:
   ```sh
   curl -s -X POST localhost:8788/api/imagen -H 'Content-Type: application/json' -d '{"prompt":"un robot amable saludando","tipo":"imagen","calidad":"maxima"}'
   curl -s -o /dev/null -w '%{http_code} %{content_type}\n' localhost:8788/imagenes/<id>.jpg
   curl -s -w ' %{http_code}\n' -X POST localhost:8788/api/imagen -H 'Content-Type: application/json' -d '{"prompt":"un robot","tipo":"imagen","calidad":"baja"}'
   ```
   La primera imprime `url`, `motor` `nube-maxima` y `segundos` entre 3 y 15; la segunda, `200 image/jpeg`; la tercera, un `error` que dice «no está disponible» y `422`.

## Errores típicos

- Imagen sin relación con el pedido: llegó en español. Revisa `prompt_en` en la respuesta.
- `422 ... no está disponible`: pediste `baja` o `media`. Es lo esperado en esta versión: usa `maxima`.
- `429 cupo_diario`: se acabó el cupo de imágenes de la clase por hoy; Robo lo dice en el chat. No reintentes en bucle.
- `429 cupo_alumno`: llegaste a tu tope de imágenes de hoy (lo fija el instructor).
- `429 muy_rapido`: más de 10 imágenes por minuto con tu token; espera unos segundos.
- `503`: el servicio del curso no responde o tu internet se cortó; prueba en un minuto.
- Texto garabateado dentro de la imagen: ningún modelo de imagen escribe bien; el texto va con Pillow (`s2-robo-flyer`).
- `404` al mostrar la imagen en el visor: la URL debe ser relativa (`imagenes/<id>.jpg`) y el archivo existir en `trabajo/robo/imagenes/`.

## Versión corta para modelos pequeños

1. Traduce el pedido a inglés con `cerebro.pedir` (máximo 25 palabras, sin texto en la imagen).
2. `POST http://127.0.0.1:8800/imagen/generar` con `{prompt, orientacion, calidad: "maxima"}` y Bearer `$OSITO_TOKEN`; la respuesta es JPEG.
3. Solo existe `maxima` (3-15 s). `baja` y `media` dan 422 «no disponible»: en el selector van deshabilitadas.
4. Si da 429 (sin cupo), devuelve el mensaje tal cual: no hay respaldo.
5. Guarda en `trabajo/robo/imagenes/<id>.jpg` y devuelve `{url: "imagenes/<id>.jpg", motor, segundos}`.
