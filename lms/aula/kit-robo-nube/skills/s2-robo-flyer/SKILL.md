---
name: s2-robo-flyer
description: Construye el flyer de Robo (kit robo-local-nube) en tres piezas: el modelo de texto extrae los datos en JSON, el modelo de imagen pinta SOLO el fondo (sin texto) y Pillow escribe el texto real encima. Fecha, hora y precio escritos en el pedido mandan sobre lo que invente el modelo. Pinta en calidad «maxima» (la única de esta versión); si se acabó el cupo de imágenes, el flyer sale igual con un fondo liso de tu color y un aviso. Úsalo cuando Robo deba hacer flyers, afiches o volantes con datos exactos. Palabras gatillo: flyer, afiche, volante, póster, fecha hora precio, "las letras salen mal", texto inventado, Pillow, flyer.py, sin cupo, fondo liso.
nivel: completo
compat: [claude, codex, gpt, deepseek, glm, nemotron, ollama-pequeno]
---

# S2 · Robo: flyer con texto real

## Cuándo usar

Cuando `s2-robo-imagen` ya funciona. Un modelo de imagen no sabe escribir: dibuja garabatos con forma de letras. Por eso el flyer son tres piezas: (1) el modelo `clase` extrae título, fecha, hora, precio y lugar; (2) el servicio de imagen pinta un fondo sin texto en calidad `maxima`; (3) Pillow escribe los datos. Si no hay cupo de imágenes (429) o el servicio no responde, el fondo es un degradado de tu color y la respuesta trae un `aviso`: los datos, que son lo importante, salen igual. La ruta ya delega aquí (`tipo: "flyer"` en `/api/imagen`).

## Pasos

1. Crea `trabajo/robo/flyer.py`:
   ```python
   import json, re
   from PIL import Image, ImageColor, ImageDraw, ImageFont
   import cerebro, pintor

   ANCHO, ALTO = 1080, 1350
   CAMPOS = ("titulo", "subtitulo", "fecha", "hora", "precio", "lugar", "tema_visual")
   FUENTES = ("/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
              "C:/Windows/Fonts/arialbd.ttf", "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
              "/Library/Fonts/Arial Bold.ttf", "DejaVuSans-Bold.ttf")
   MESES = "enero|febrero|marzo|abril|mayo|junio|julio|agosto|setiembre|septiembre|octubre|noviembre|diciembre"

   def extraer(pedido):
       """Datos del flyer. Fecha, hora y precio escritos en el pedido mandan sobre lo que invente el modelo."""
       texto = cerebro.pedir([
           {"role": "system", "content": "Extrae los datos de un flyer del pedido. Responde SOLO un JSON con las claves: " + ", ".join(CAMPOS)
            + ". titulo: 2 a 5 palabras. subtitulo: máximo 36 caracteres. fecha como 'Sábado 18 de octubre'. hora como '10:00 am'. "
            "precio muy corto ('S/ 20', 'Gratis'). lugar: si no lo dicen, 'En línea'. tema_visual: frase en INGLÉS de 8 a 15 palabras "
            "para un fondo SIN personas, SIN pantallas y SIN letras. Si un dato no está, cadena vacía. No inventes."},
           {"role": "user", "content": pedido}], max_tokens=400, temperatura=0.1, como_json=True).strip("`")
       d = json.loads(texto[4:] if texto.lower().startswith("json") else texto)
       datos = {k: str(d.get(k, "") or "").strip() for k in CAMPOS}
       m = re.search(rf"((?:lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)\s+)?(\d{{1,2}})\s+de\s+({MESES})", pedido, re.I)
       if m:
           datos["fecha"] = ((m.group(1) or "").strip().capitalize() + " " + f"{m.group(2)} de {m.group(3).lower()}").strip()
       m = re.search(r"(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.?\s*m\.?|p\.?\s*m\.?)", pedido, re.I)
       if m:
           datos["hora"] = f"{m.group(1)}:{m.group(2) or '00'} {re.sub(r'[. ]', '', m.group(3)).lower()}"
       m = re.search(r"(?:s/\.?\s*|soles?\s*)(\d+)|(\d+)\s*soles", pedido, re.I)
       if m:
           datos["precio"] = f"S/ {m.group(1) or m.group(2)}"
       datos["lugar"] = datos["lugar"] or "En línea"
       return datos

   def fuente(tam):
       for ruta in FUENTES:
           try:
               return ImageFont.truetype(ruta, tam)
           except OSError:
               pass
       return ImageFont.load_default(size=tam)

   def lineas(d, texto, f, ancho):
       out, actual = [], ""
       for palabra in texto.split():
           prueba = f"{actual} {palabra}".strip()
           if d.textlength(prueba, font=f) <= ancho or not actual:
               actual = prueba
           else:
               out.append(actual); actual = palabra
       return out + ([actual] if actual else [])

   def componer(datos, fondo, acento, ruta):
       img = fondo.convert("RGB")
       esc = max(ANCHO / img.width, ALTO / img.height)
       img = img.resize((int(img.width * esc) + 1, int(img.height * esc) + 1))
       x0, y0 = (img.width - ANCHO) // 2, (img.height - ALTO) // 2
       img = img.crop((x0, y0, x0 + ANCHO, y0 + ALTO)).convert("RGBA")
       velo = Image.new("RGBA", img.size, (0, 0, 0, 0))
       for y in range(500, ALTO):                       # degradado oscuro abajo: el texto se lee
           ImageDraw.Draw(velo).line((0, y, ANCHO, y), fill=(10, 12, 28, int(235 * (y - 500) / (ALTO - 500))))
       img = Image.alpha_composite(img, velo)
       d = ImageDraw.Draw(img)
       r, g, b = ImageColor.getrgb(acento)[:3]
       tinta = (15, 18, 34) if 0.299 * r + 0.587 * g + 0.114 * b > 140 else (255, 255, 255)
       y, ft, fs = 700, fuente(96), fuente(42)
       for linea in lineas(d, datos["titulo"], ft, ANCHO - 140)[:3]:
           d.text((70, y), linea, font=ft, fill="white"); y += 108
       d.text((70, y + 6), datos["subtitulo"], font=fs, fill=(225, 232, 250)); y += 90
       x = 70
       for texto in (datos["fecha"], datos["hora"], datos["lugar"]):
           if not texto:
               continue
           w = int(d.textlength(texto, font=fs)) + 52
           if x + w > ANCHO - 70:
               x, y = 70, y + 84
           d.rounded_rectangle((x, y, x + w, y + 64), radius=32, fill=acento)
           d.text((x + 26, y + 32), texto, font=fs, fill=tinta, anchor="lm"); x += w + 16
       if datos["precio"]:
           fp = fuente(64); w = int(d.textlength(datos["precio"], font=fp)) + 70
           d.rounded_rectangle((ANCHO - 70 - w, 70, ANCHO - 70, 170), radius=50, fill=acento)
           d.text((ANCHO - 70 - w / 2, 120), datos["precio"], font=fp, fill=tinta, anchor="mm")
       img.convert("RGB").save(ruta, "JPEG", quality=92)

   def fondo_liso(acento):
       """Degradado de tu color a azul noche: el flyer sale aunque no haya cupo de imágenes."""
       r, g, b = ImageColor.getrgb(acento)[:3]
       img = Image.new("RGB", (ANCHO, ALTO))
       d = ImageDraw.Draw(img)
       for y in range(ALTO):
           k = y / ALTO
           d.line((0, y, ANCHO, y), fill=(int(r * (1 - k) + 12 * k), int(g * (1 - k) + 16 * k), int(b * (1 - k) + 40 * k)))
       return img

   def generar(pedido, ruta, calidad="maxima", acento="#9ad5ff"):
       """(datos, motor, aviso). aviso = None si el fondo lo pintó el servicio de imagen."""
       datos = extraer(pedido)
       tema = datos["tema_visual"] or pintor.en_ingles(pedido)
       aviso = None
       try:
           fondo, motor = pintor.pintar(f"{tema}, poster background, no people, calm empty space in the lower half, {cerebro.P.get('estilo_imagen', '')}", "vertical", calidad)
       except cerebro.ErrorNube as e:
           if e.estado not in (429, 503):
               raise                              # 422 (calidad no disponible) y otros: que se vea el error
           fondo, motor, aviso = fondo_liso(acento), "fondo-liso", f"sin fondo pintado: {e.mensaje}"
       componer(datos, fondo, acento, ruta)
       return datos, motor, aviso
   ```
2. Prueba los datos solos (sin pintar): `cd trabajo/robo && python -c "import flyer; print(flyer.extraer('flyer de una liquidación el sábado 18 de octubre a las 10 am a S/ 20'))"`. Fecha, hora y precio deben salir IGUAL que en el pedido.
3. Reinicia y pide el flyer completo (`tipo: "flyer"`):
   ```sh
   curl -s -X POST localhost:8788/api/imagen -H 'Content-Type: application/json' -d '{"prompt":"flyer de una liquidación el sábado 18 de octubre a las 10 am a S/ 20","tipo":"flyer","calidad":"maxima"}'
   python -c "from PIL import Image; print(Image.open('trabajo/robo/<url devuelta>').size)"
   ```
   `datos` trae `"hora": "10:00 am"` y `"precio": "S/ 20"`; la imagen mide `(1080, 1350)`. Ábrela en el visor y lee los datos en ella. Si la respuesta trae `aviso` y `motor` `fondo-liso`, no había cupo de imágenes: el flyer es válido igual.

## Errores típicos

- El título trae marcas o apodos que nadie pidió: el modelo adornó. Pide «titulo con el tema literal del pedido».
- Fecha u hora distintas del pedido: el pedido no las escribió en formato reconocible. Usa «18 de octubre», «10 am» y «S/ 20».
- Fondo con letras o personas: refuerza `tema_visual` («no people, no text»); el prompt ya añade «No text, no letters».
- Texto cortado o encima del precio: bajó el tamaño de letra; acorta título y subtítulo en el pedido.
- Letras muy finas: no encontró ninguna fuente de `FUENTES` y usó la de Pillow. En Windows añade `C:/Windows/Fonts/arialbd.ttf`; en macOS, `/System/Library/Fonts/Supplemental/Arial Bold.ttf`.
- `motor: fondo-liso` y un `aviso`: no había cupo de imágenes (429) o el servicio no respondía; el flyer sale con fondo de tu color.
- `502 No module named flyer`: aún no existe `flyer.py` o no reiniciaste el servidor.

## Versión corta para modelos pequeños

1. Pieza 1: `cerebro.pedir(..., como_json=True)` extrae `titulo, subtitulo, fecha, hora, precio, lugar, tema_visual` (tema en inglés, sin personas ni letras).
2. Los datos escritos en el pedido (regex de fecha, hora, precio) mandan sobre los del modelo.
3. Pieza 2: `pintor.pintar(tema + ", poster background", "vertical", "maxima")` pinta SOLO el fondo; con 429 o 503, `fondo_liso(color)` y un `aviso`.
4. Pieza 3: Pillow recorta a 1080x1350, oscurece abajo y escribe título, fecha, hora, lugar y precio.
5. Guarda JPEG en `trabajo/robo/imagenes/` y devuelve `datos` (y `aviso`, si lo hubo) en la respuesta.
