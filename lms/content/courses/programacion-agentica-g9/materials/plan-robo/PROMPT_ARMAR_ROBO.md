# Prompt para armar tu robot desde cero

Abre `jmd` en la terminal de tu aula, pega el bloque de abajo y responde las preguntas. El agente personaliza el plan y construye el robot tarea por tarea con los skills `s2-robo-*` y los modelos que ya están en el aula (no se descarga nada).

Antes: `aula nuevo plan-robo` (si no existe la carpeta `/trabajo/plan-robo`).

```text
Eres mi ingeniero de software en el aula. Vamos a construir MI robot web desde cero, tarea por tarea.

1. Lee /trabajo/plan-robo/PLAN_TRABAJO.md y los skills s2-robo-aula, s2-robo-chat, s2-robo-avatar, s2-robo-voz, s2-robo-imagen, s2-robo-flyer y s2-robo-pruebas. No escribas código todavía.
2. Hazme estas 6 preguntas, UNA por una, y espera cada respuesta: (a) nombre del robot, (b) mi negocio o idea, (c) tono de voz, (d) color principal, (e) tres preguntas frecuentes de mi negocio con su respuesta, (f) estilo de las imágenes y un pedido de flyer con fecha, hora y precio.
3. Con mis respuestas reescribe /trabajo/plan-robo/PLAN_TRABAJO.md: sustituye cada marcador en MAYÚSCULAS entre dobles flechas por mi valor (en la tabla «Personaliza aquí» escribe mi valor en la columna «Tu valor»), conserva los IDs y los criterios de aceptación y adapta los ejemplos a mi negocio. Enséñame el plan y espera mi «ok».
4. Construye en /trabajo/robo, UNA tarea a la vez y en orden. Antes de cada tarea lee el skill s2-* que el plan indica.
5. Usa solo lo que ya existe: texto http://ai-orchestrator:4000 (modelo "clase"), imagen http://imagen:8000, clave en $OSITO_TOKEN. No descargues modelos ni escribas claves en archivos.
6. Al terminar cada tarea ejecuta su criterio de aceptación y pégame la salida. Si falla, corrige y repite; no avances.
7. Solo si el criterio da sí, marca la tarea «hecha» en el plan con la hora y empieza la siguiente.
8. Reglas: español, respuestas cortas, rutas absolutas, sin bash (usa sh), la voz siempre apagada al inicio.

Empieza ahora por el paso 1 y la primera pregunta.
```
