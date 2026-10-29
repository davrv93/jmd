# LIVE de-02 · E03–E05 · Música con Flash Lite

Tres fichas breves para el taller de diseño (29-10-2026):

1. **E03 · Tu música empieza con una intención.** Emoción, pulso y sonido;
   compara la misma melodía a 80 y 128 BPM con dos ejemplos locales.
2. **E04 · Pide tu música a Flash Lite.** Escribe qué muestra el video, elige
   emoción/estilo/tempo y copia un pedido de seis partes. Selecciona Gemini
   3.1 Flash-Lite en tu agente o AI Studio antes de pegarlo.
3. **E05 · Escucha, ajusta y descarga.** Pega la partitura JSON de la respuesta,
   escucha su síntesis, cambia sólo el tempo y descarga `mi-musica.wav`.

El paso `musica` se añade al ciclo de `02-web-y-landing.md`. Las carpetas tienen
`escena.html` y `escena.yaml`; el motor compartido está en `live/_comun/musica.js`.
No cambia E01, E02, el motor de juego ni `lms/render`.

## Qué genera cada parte

Flash Lite entrega **texto y código**, no audio musical directamente. La ficha
pide una partitura de datos y el navegador la convierte en audio mediante Web
Audio. Es música instrumental sintetizada, no una grabación de instrumentos
ni una canción cantada.

Referencia verificada: [Gemini 3.1 Flash-Lite, Google](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite).
La ficha oficial indica salida de texto y ausencia de generación de audio.

Estas escenas no llaman automáticamente a Gemini, no recogen claves y no
consumen cuota de IA desde el LMS. El alumno copia el pedido al modelo que haya
seleccionado en su agente o en AI Studio, y pega su respuesta. La ficha no puede
comprobar qué proveedor produjo un JSON pegado, por eso lo etiqueta «Tu partitura».
El botón de ejemplo siempre dice «Ejemplo local · no generado por IA».

Se copia el enlace de AI Studio para abrirlo manualmente en otra pestaña: el
sandbox del LIVE no permite ventanas emergentes y no se amplían esos permisos.
El pedido explicita MIDI, cuatro compases, ausencia de voz y respuesta JSON.
No hace falta que el alumno edite los números para seguir la actividad.

## Partitura y síntesis

El formato contiene `titulo`, `bpm`, `estilo`, `acordes`, `melodia`, `bajo`,
`bombo`, `caja` y `charles`. El validador acepta un bloque JSON cercado con
Markdown, comprueba tipos, longitudes y rangos y sólo conserva los campos de
la partitura. Nunca evalúa JavaScript ni carga enlaces de la respuesta.

- Cuatro compases de 4/4, entre 80 y 140 BPM.
- Cuatro acordes de tres notas, 32 corcheas de melodía (o silencios), cuatro
  raíces de bajo y patrones 0/1 para la percusión.
- Estilos: pop, ska con acordes a contratiempo y ambient de notas sostenidas.
- Síntesis con osciladores y ruido reproducible; la partitura define las notas
  y el sintetizador aporta los timbres. Las notas no se vuelven a generar al
  mover el tempo.
- `OfflineAudioContext`, mono a 22050 Hz, normalización a un pico de 0,85,
  entrada/salida suave y exportación PCM16 RIFF/WAV.
- La duración musical es `16*60/bpm`; se añade una cola de 0,15 s para el cierre.
  No hay bucles infinitos ni notas fuera de los rangos admitidos.

La reproducción empieza sólo por un clic y se detiene al ocultar o salir de la
ficha. Las solicitudes de reproducción pendientes se cancelan al pulsar detener
o elegir otro ejemplo. El trabajo musical se conserva en `sessionStorage` de
la pestaña, no en la base de datos del LMS.

## Permiso del visor

Los iframes de instructor y alumno conservan su sandbox habitual. **Sólo para
`de-02` / `05-escucha-y-descarga`** se añade `allow-downloads`, necesario para que
el WAV se guarde realmente desde el LIVE. No se añaden popups, formularios,
CDN, conexiones externas ni permisos a otras escenas/cursos.

Al publicar esta versión hay que recargar el LIVE para cargar el visor nuevo.
Si E05 se abrió con el visor anterior, el botón explica que se debe recargar en
vez de fallar en silencio. La partitura permanece en la pestaña al recargar.
Este ajuste de front requiere reconstruir el LMS con el procedimiento existente.

## Comprobaciones

```sh
cd lms/api && go test ./internal/content/ ./internal/httpapi/
cd ../web && npm run build
cd ../..
node lms/scripts/probar-musica.mjs "$PWD" /tmp/jmd-musica-qa
```

La prueba usa Chrome/Playwright mediante `_pw.mjs`, copia las fichas y aplica
la CSP y el sandbox del LIVE en un iframe. No llama a Gemini ni usa claves o
cuentas de producción. Comprueba:

- Nueve capturas a 1440×810 y 390×844, incluida E05 en oscuro.
- Audio PCM no vacío y sin saturación; ausencia de reproducción automática.
- Pedido con la idea y tempo elegidos, y copia real al portapapeles.
- Rechazo del JSON inválido y aceptación de una partitura de prueba cercada.
- Reproducción real, cambio de tempo conservando notas y persistencia al volver.
- Descarga real desde el iframe: cabecera RIFF/WAVE, PCM16 mono a 22050 Hz.
- Aviso de recarga si el visor no tiene permiso de descarga.
- Ausencia de errores JavaScript, violaciones CSP y recursos externos.

Evidencia: [`qa/de-02-musica/`](qa/de-02-musica/). El WAV de esa carpeta es una
partitura de prueba sintetizada, **no una respuesta de Gemini**. Las pruebas
acreditan el funcionamiento del reproductor, no la calidad compositiva de una
respuesta futura del modelo. Escuchar y decidir qué acompaña el mensaje es
parte del ejercicio del alumno.


## E09 · Música con Lyria

`09-musica-con-lyria` añade un pedido editable y una práctica de generación de audio en Gemini. El alumno copia el enlace y el pedido, abre otra pestaña, activa **Subidas y herramientas → Crear música**, escucha y descarga **solo audio (MP3)**. No usa el sintetizador local ni llama APIs de pago desde el LMS. El enlace se copia porque el iframe no permite ventanas emergentes. No requiere cambios de servidor ni permisos nuevos.

El pedido solicita un clip instrumental con instrumentos naturales para acompañar el video. La evidencia es una captura de la pista y una frase que justifique la elección. La cuenta debe ser compatible, mayor de 18 años y tener Conservar la actividad activado; hay límites de generación. Si la herramienta no está disponible, revisar esos requisitos en Gemini.

Ruta y formatos verificados el 29-10-2026 en la [ayuda oficial de Google](https://support.google.com/gemini/answer/16901237?hl=es). No se promete que un pedido garantice un timbre o una composición exactos.
