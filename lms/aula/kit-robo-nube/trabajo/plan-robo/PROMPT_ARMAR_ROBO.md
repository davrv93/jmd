# Prompt para armar tu robot desde cero

Antes: deja corriendo el aula local (`sh iniciar.sh`, en Windows `iniciar.bat`) y, en otra terminal, prepara la del agente con `. ./entorno.sh` (Windows: `. .\entorno.ps1`). Abre tu agente (`jmd`, OpenCode o Claude Code) en la carpeta del kit, pega el bloque de abajo y responde las preguntas. El agente personaliza el plan y construye el robot tarea por tarea con los skills `s2-robo-*` y los servicios del curso (no se instala ni se descarga nada).

```text
Eres mi ingeniero de software. Vamos a construir MI robot web desde cero, tarea por tarea, en este kit.

1. Lee trabajo/plan-robo/PLAN_TRABAJO.md y los skills s2-robo-aula, s2-robo-chat, s2-robo-avatar, s2-robo-voz, s2-robo-imagen, s2-robo-flyer y s2-robo-pruebas (carpeta skills/). No escribas código todavía.
2. Hazme estas 6 preguntas, UNA por una, y espera cada respuesta: (a) nombre del robot, (b) mi negocio o idea, (c) tono de voz, (d) color principal y avatar (robot u osito), (e) tres preguntas frecuentes de mi negocio con su respuesta, (f) estilo de las imágenes y un pedido de flyer con fecha, hora y precio.
3. Valida mis respuestas: el nombre, saneado a 1-24 letras, números, espacio, punto o guion; el color, en hexadecimal #rrggbb (si digo un nombre de color, conviértelo y enséñamelo); el avatar, robot u osito. Si algo no cuadra, pregúntamelo otra vez.
4. Con mis respuestas reescribe trabajo/plan-robo/PLAN_TRABAJO.md: sustituye cada marcador en MAYÚSCULAS entre dobles flechas por mi valor (en la tabla «Personaliza aquí» escribe mi valor en la columna «Tu valor»), conserva los IDs y los criterios de aceptación y adapta los ejemplos a mi negocio. Enséñame el plan y espera mi «ok».
5. Construye en trabajo/robo, UNA tarea a la vez y en orden. Antes de cada tarea lee el skill s2-* que el plan indica.
6. Usa solo lo que ya existe: texto http://127.0.0.1:8800 (modelo "clase"), imagen y voz http://127.0.0.1:8800/imagen, dictado http://127.0.0.1:8800/stt, clave en $OSITO_TOKEN. Solo existe la calidad de imagen "maxima": "baja" y "media" no están disponibles en esta versión. No descargues modelos, no instales paquetes y no escribas claves en archivos.
7. Al terminar cada tarea ejecuta su criterio de aceptación y pégame la salida. Si falla, corrige y repite; no avances.
8. Solo si el criterio da sí, marca la tarea «hecha» en el plan con la hora y empieza la siguiente.
9. Reglas: español, respuestas cortas, comandos que funcionen en Windows y en Mac (con python; nada de bash, fork ni rutas con \), arranca y reinicia Robo con python trabajo/robo/robo.py, comprueba cada criterio también con python herramientas/verificar.py <ID>, la voz siempre apagada al inicio. El avatar se elige y se tiñe con los parámetros de montarAvatar (modulos/avatar.js): nunca copies ni reescribas los módulos 3D.

Empieza ahora por el paso 1 y la primera pregunta.
```
