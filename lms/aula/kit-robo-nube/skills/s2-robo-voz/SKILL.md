---
name: s2-robo-voz
description: Añade a Robo (kit robo-local-nube) la voz (apagada por defecto, botón de parlante; voz Piper del servidor del curso con la del navegador de respaldo) y el micrófono (dictado por el servidor del curso con Whisper; SpeechRecognition de Chrome como alternativa). El texto dictado aparece en la caja y el alumno decide si lo envía. Úsalo cuando Robo deba hablar o escuchar. Palabras gatillo: voz, hablar, parlante, silenciar, micrófono, dictar, dictado, Whisper, STT, /api/stt, MediaRecorder, SpeechRecognition, speechSynthesis, Piper, /api/voz, "Robo no habla", "no me entiende".
nivel: completo
compat: [claude, codex, gpt, deepseek, glm, nemotron, ollama-pequeno]
---

# S2 · Robo: voz opcional y micrófono

## Cuándo usar

Cuando la pantalla de Robo ya funciona (`s2-robo-avatar`). Regla de la clase: la voz arranca APAGADA. En un aula con muchos equipos, un robot que habla solo es un incidente. El alumno la enciende con un botón de parlante.

## Servicios

- Dictado (voz a texto): `POST http://127.0.0.1:8800/stt` (variable `STT_URL`) con el audio en el cuerpo (`webm`, `ogg`, `wav`, `mp4`...) y `Authorization: Bearer $OSITO_TOKEN`. Devuelve `{texto, segundos_audio, segundos, recortado}`. Corre faster-whisper en el servidor del curso: tope de 30 s de audio (lo que pase se corta), una frase de 5 s tarda 1 a 3 s.
- Voz de salida Piper (es_MX): `POST http://127.0.0.1:8800/imagen/voz` con `{"texto": "..."}` y el mismo Bearer; devuelve WAV.
- Respaldo en el navegador: `speechSynthesis` (voz) y `SpeechRecognition` (dictado, solo Chrome y Edge).
- El navegador deja usar el micrófono en `http://127.0.0.1` y pide permiso la primera vez.

## Pasos

1. En `servidor.py` añade (antes de los `app.mount`) las dos rutas que reenvían al aula local (`os`, `Request` y `Response` ya están importados):
   ```python
   STT_URL = os.environ.get("STT_URL", "http://127.0.0.1:8800/stt")
   VOZ_URL = os.environ.get("IMAGEN_URL", "http://127.0.0.1:8800/imagen").rstrip("/") + "/voz"

   @app.post("/api/stt")
   async def api_stt(request: Request):
       audio = await request.body()
       if not audio:
           return JSONResponse({"error": "no llegó audio"}, status_code=400)
       try:
           async with httpx.AsyncClient(timeout=90) as c:
               r = await c.post(STT_URL, content=audio, headers={"Authorization": f"Bearer {cerebro.TOKEN}",
                                "Content-Type": request.headers.get("content-type", "application/octet-stream")})
       except httpx.HTTPError as e:
           return JSONResponse({"error": f"el dictado no responde ({type(e).__name__})"}, status_code=503)
       if r.status_code != 200:
           return fallo(cerebro.ErrorNube(r.status_code, cerebro.mensaje_de(r)))
       return r.json()

   class PeticionVoz(BaseModel):
       texto: str = Field(min_length=1, max_length=700)

   @app.post("/api/voz")
   def api_voz(p: PeticionVoz):
       try:
           r = httpx.post(VOZ_URL, json={"texto": p.texto}, timeout=30, headers={"Authorization": f"Bearer {cerebro.TOKEN}"})
       except httpx.HTTPError as e:
           return JSONResponse({"error": f"sin voz del servidor ({type(e).__name__})"}, status_code=503)
       if r.status_code != 200:
           return fallo(cerebro.ErrorNube(r.status_code, cerebro.mensaje_de(r)))
       return Response(r.content, media_type="audio/wav")
   ```
   `/api/salud` ya dice `stt` y `voz` (los lee del aula local en `s2-robo-chat`).
2. En `index.html`, dentro de `<form id="form">`, antes del botón Enviar, añade `<button type="button" id="mic" aria-pressed="false">Mic</button>`. Dentro de `<div class="barra" id="barra">` añade `<button type="button" id="voz" aria-pressed="false">Voz: apagada</button>`. Estilo del botón apagado: `button[aria-pressed="false"] { background: #3a3f63; }`.
3. Añade al final de `app.js`:
   ```js
   // ---- Voz: arranca APAGADA. Piper del servidor; si falla, la del navegador ----
   let vozActiva = false;
   function hablarNavegador(texto) {
     if (!("speechSynthesis" in window)) return;
     speechSynthesis.cancel();
     const u = new SpeechSynthesisUtterance(texto);
     u.lang = "es-PE";
     speechSynthesis.speak(u);
   }
   async function hablarServidor(texto) {
     const r = await fetch(BASE + "/api/voz", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ texto: texto.slice(0, 700) }) });
     if (!r.ok) throw new Error("voz " + r.status);
     const audio = new Audio(URL.createObjectURL(await r.blob()));
     audio.onended = () => URL.revokeObjectURL(audio.src);
     await audio.play();
   }
   window.alResponder = (texto) => {            // la llama enviar() en s2-robo-avatar
     if (!vozActiva) return;
     robot.avatar?.hablar?.(Math.max(1500, texto.length * 70));   // mueve la boca
     hablarServidor(texto).catch(() => hablarNavegador(texto));
   };
   $("voz").addEventListener("click", () => {
     vozActiva = !vozActiva;
     $("voz").setAttribute("aria-pressed", vozActiva);
     $("voz").textContent = vozActiva ? "Voz: encendida" : "Voz: apagada";
     if (!vozActiva && "speechSynthesis" in window) speechSynthesis.cancel();
   });

   // ---- Micrófono: dicta con el servidor del curso (Whisper); si falla, con el navegador ----
   const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
   const puedeGrabar = !!(navigator.mediaDevices?.getUserMedia && window.MediaRecorder);
   let grabadora = null, corte = null;
   if (!puedeGrabar && !SR) $("mic").hidden = true;
   function micActivo(si) {
     $("mic").setAttribute("aria-pressed", si);
     $("mic").textContent = si ? "Detener" : "Mic";
     robot.setAnimo(si ? "escuchando" : "neutral");
   }
   function dictarNavegador() {
     if (!SR) return burbuja("Este navegador no tiene dictado propio: escribe tu pregunta.");
     const rec = new SR();
     rec.lang = "es-PE";
     rec.onstart = () => micActivo(true);
     rec.onresult = (e) => { $("texto").value = e.results[0][0].transcript; };
     rec.onend = () => micActivo(false);
     rec.onerror = (e) => burbuja("Micrófono: " + e.error);
     rec.start();
   }
   async function transcribir(audio) {
     const espera = burbuja("Transcribiendo...");
     try {
       const r = await fetch(BASE + "/api/stt", { method: "POST", headers: { "Content-Type": audio.type || "audio/webm" }, body: audio });
       const d = await r.json().catch(() => ({}));
       if (!r.ok) throw new Error(mensajeDe(d, r.status));
       $("texto").value = d.texto;            // NO se envía solo: el alumno lo revisa y pulsa Enviar
       espera.textContent = `Dictado listo en ${d.segundos} s${d.recortado ? " (cortado a 30 s)" : ""}. Revísalo y pulsa Enviar.`;
       $("texto").focus();
     } catch (e) {
       espera.textContent = "El dictado del servidor falló (" + e.message + "). Pruebo con el del navegador.";
       dictarNavegador();
     }
   }
   $("mic").addEventListener("click", async () => {
     if (grabadora) return grabadora.stop();   // segundo clic: termina la grabación
     if (!puedeGrabar) return dictarNavegador();
     let flujo;
     try { flujo = await navigator.mediaDevices.getUserMedia({ audio: true }); }
     catch (e) { return burbuja("Micrófono: " + (e.name === "NotAllowedError" ? "permiso denegado; actívalo en el candado de la barra de direcciones" : e.message)); }
     const partes = [];
     grabadora = new MediaRecorder(flujo);
     grabadora.ondataavailable = (e) => e.data.size && partes.push(e.data);
     grabadora.onstop = () => {
       clearTimeout(corte);
       flujo.getTracks().forEach((t) => t.stop());
       const audio = new Blob(partes, { type: grabadora.mimeType });
       grabadora = null; micActivo(false);
       transcribir(audio);
     };
     grabadora.start(); micActivo(true);
     corte = setTimeout(() => grabadora?.stop(), 15000);   // tope de 15 s por dictado (el servidor acepta 30)
   });
   ```
4. Pruebas:
   - `curl -s -X POST localhost:8788/api/stt -H 'Content-Type: audio/wav' --data-binary @herramientas/prueba-voz.wav` imprime un JSON cuyo `texto` contiene «horario».
   - `curl -s -o trabajo/voz.wav -w '%{http_code} %{size_download}\n' -X POST localhost:8788/api/voz -H 'Content-Type: application/json' -d '{"texto":"Hola"}'` imprime `200` y un tamaño mayor de 1000.
   - Recarga el visor: el botón dice «Voz: apagada» y Robo responde sin sonido. Enciéndelo, pregunta: Robo habla y mueve la boca.
   - Pulsa Mic, di tu pregunta, pulsa Detener: el texto aparece en la caja ANTES de enviar.

## Errores típicos

- `401` en el dictado o la voz: el token del alumno venció (`sh iniciar.sh --token` (Windows: `iniciar.bat --token`)).
- `429 cola_llena`: muchos dictados a la vez en la clase; reintenta en unos segundos. `cupo_alumno`: llegó a su tope de hoy.
- El texto dictado sale vacío: no se oyó nada (micrófono equivocado o en silencio); revisa el micrófono del sistema.
- `NotAllowedError`: el navegador bloqueó el micrófono; actívalo en el candado de la barra de direcciones.
- Firefox o Safari sin `SpeechRecognition`: no pasa nada, el dictado por servidor funciona igual (graban con `MediaRecorder`).
- Robo no habla con la voz encendida: Chrome exige un clic previo (el del botón ya cuenta). Si Piper falla, cae a `speechSynthesis`; revisa que haya voz en español: `speechSynthesis.getVoices().filter(v => v.lang.startsWith("es")).length`.
- No pongas la voz encendida por defecto ni la guardes en `localStorage` como encendida.

## Versión corta para modelos pequeños

1. La voz arranca APAGADA: `let vozActiva = false` y un botón «Voz: apagada» que alterna.
2. Hablar: `POST BASE + "/api/voz"` (WAV de Piper); si falla, `speechSynthesis` con `lang = "es-PE"`. Solo si `vozActiva`.
3. Dictar: `MediaRecorder` graba hasta 15 s, `POST BASE + "/api/stt"` con el audio; el `texto` va a la caja, no se envía solo.
4. Si el dictado del servidor falla o no hay `MediaRecorder`: `SpeechRecognition` del navegador.
5. `servidor.py`: `/api/stt` reenvía el audio a `STT_URL`; `/api/voz` reenvía a `IMAGEN_URL + "/voz"`; los dos con Bearer `$OSITO_TOKEN`.
