---
name: s2-robo-voz
description: Añade a Robo la voz (apagada por defecto, se enciende con un botón de parlante) y el micrófono (dictado a texto con el navegador). La voz usa speechSynthesis del navegador; la voz Piper del servidor de la clase es opcional (el backend de Robo la expone en `/api/voz`). Úsalo cuando Robo deba hablar o escuchar. Palabras gatillo: voz, hablar, parlante, silenciar, micrófono, dictar, SpeechRecognition, speechSynthesis, Piper, es-PE, "Robo no habla".
nivel: completo
compat: [claude, codex, gpt, deepseek, glm, nemotron, ollama-pequeno]
---

# S2 · Robo: voz opcional y micrófono

## Cuándo usar

Cuando la pantalla de Robo ya funciona (`s2-robo-avatar`). Regla de la clase: la voz arranca APAGADA. En un aula con muchos equipos, un robot que habla solo es un incidente. El alumno la enciende con un botón de parlante.

## Servicios

- Voz de salida: `speechSynthesis` del navegador (sin servidor). Es la que funciona en el visor.
- Voz Piper del servidor: `POST http://imagen:8000/voz` con `{"texto": "..."}` y `Authorization: Bearer $OSITO_TOKEN`; devuelve WAV (voz es_MX). El visor reenvía `/api/voz` (y su política de seguridad deja reproducir audio `blob:`): el backend de Robo la pide al servicio y el navegador reproduce el WAV; si falla, cae a `speechSynthesis`.
- Micrófono a texto: `SpeechRecognition` del navegador (Chrome). Sin servidor, sin whisper. El panel del visor ya concede el permiso de micrófono.

## Pasos

1. En `index.html`, dentro de `<form id="form">`, antes del botón Enviar, añade `<button type="button" id="mic" aria-pressed="false">Mic</button>`. Dentro de `<div class="barra" id="barra">` añade `<button type="button" id="voz" aria-pressed="false">Voz: apagada</button>`. Estilo del botón apagado: `button[aria-pressed="false"] { background: #3a3f63; }`.
2. Añade al final de `app.js`:
   ```js
   // ---- Voz: arranca APAGADA ----
   let vozActiva = false;
   window.alResponder = (texto) => {            // la llama enviar() en s2-robo-avatar
     if (!vozActiva || !("speechSynthesis" in window)) return;
     speechSynthesis.cancel();
     const u = new SpeechSynthesisUtterance(texto);
     u.lang = "es-PE";
     robot.avatar?.hablar?.(Math.max(1500, texto.length * 70));   // mueve la boca del robot
     speechSynthesis.speak(u);
   };
   $("voz").addEventListener("click", () => {
     vozActiva = !vozActiva;
     $("voz").setAttribute("aria-pressed", vozActiva);
     $("voz").textContent = vozActiva ? "Voz: encendida" : "Voz: apagada";
     if (!vozActiva) speechSynthesis.cancel();
   });

   // ---- Micrófono: dicta, muestra el texto y el alumno decide si envía ----
   const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
   if (!SR) $("mic").hidden = true;             // Firefox y otros: sin micrófono, el chat escrito sigue
   else $("mic").addEventListener("click", () => {
     const rec = new SR();
     rec.lang = "es-PE";
     rec.onstart = () => { $("mic").setAttribute("aria-pressed", true); robot.setAnimo("escuchando"); };
     rec.onresult = (e) => { $("texto").value = e.results[0][0].transcript; };
     rec.onend = () => { $("mic").setAttribute("aria-pressed", false); robot.setAnimo("neutral"); };
     rec.onerror = (e) => burbuja("Micrófono: " + e.error);
     rec.start();
   });
   ```
3. (Opcional) Voz Piper del servidor. En `servidor.py` importa `Response` (`from fastapi.responses import JSONResponse, Response`) y añade:
   ```python
   class PeticionVoz(BaseModel):
       texto: str = Field(min_length=1, max_length=700)

   @app.post("/api/voz")
   def api_voz(p: PeticionVoz):
       try:
           r = httpx.post("http://imagen:8000/voz", json={"texto": p.texto}, timeout=30,
                          headers={"Authorization": f"Bearer {cerebro.TOKEN}"})
           r.raise_for_status()
       except Exception as e:
           return JSONResponse({"error": f"sin voz del servidor: {e}"}, status_code=503)
       return Response(r.content, media_type="audio/wav")
   ```
4. Pruebas:
   - Recarga el visor: el botón dice «Voz: apagada» y Robo responde sin sonido. Pulsa el botón, escribe una pregunta: Robo habla y mueve la boca.
   - Pulsa Mic, di la pregunta: el texto aparece en la caja ANTES de enviar.
   - Piper (opcional): `curl -s -o /tmp/voz.wav -w '%{http_code} %{size_download}\n' -X POST http://imagen:8000/voz -H "Authorization: Bearer $OSITO_TOKEN" -H 'Content-Type: application/json' -d '{"texto":"Hola"}'` imprime `200` y un tamaño mayor de 1000.

## Errores típicos

- Robo no habla con la voz encendida: Chrome exige un clic previo (el del botón ya cuenta) y que haya voz en español instalada; revisa `speechSynthesis.getVoices().filter(v => v.lang.startsWith("es")).length` en la consola.
- El micrófono dice `not-allowed`: el navegador bloqueó el permiso; actívalo en el candado de la barra de direcciones.
- `no-speech`: no oyó nada en unos segundos; vuelve a pulsar Mic.
- `network`: el reconocimiento de Chrome necesita internet en el equipo del alumno.
- No hay Mic en Firefox o Safari: es normal, el botón se oculta.
- `/api/voz` da 503 si el servicio de la clase no responde: cae a la voz del navegador (`speechSynthesis`).
- No pongas la voz encendida por defecto ni la guardes en `localStorage` como encendida.

## Versión corta para modelos pequeños

1. La voz arranca APAGADA: `let vozActiva = false` y un botón «Voz: apagada» que alterna.
2. Hablar: `speechSynthesis.speak(new SpeechSynthesisUtterance(texto))` con `lang = "es-PE"`, solo si `vozActiva`.
3. Micrófono: `new (window.SpeechRecognition || window.webkitSpeechRecognition)()`, `lang = "es-PE"`; el resultado va a la caja de texto, no se envía solo.
4. Piper es opcional: `POST http://imagen:8000/voz` con Bearer `$OSITO_TOKEN`; solo se prueba con `curl`.
