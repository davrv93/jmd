---
id: g3-ej-plan-robo
title: "Plan de trabajo de Robo para personalizar"
summary: Un plan de 15 tareas para construir tu robot desde cero en el aula, y el prompt que tu agente usa para adaptarlo a tu negocio.
tags: [plan-de-trabajo, robo, skills, aula]
level: intermedio
lesson: g3-02
phase: experiencia
order: 19
---
Robo es el asistente web de la clase 2: un robot 3D que conversa, escucha por el micrófono, dibuja
imágenes y hace flyers. Aquí no lo copias: lo construyes desde cero con tu agente, a partir de un plan
de trabajo que tú personalizas. Todo usa modelos que el aula ya tiene encendidos: no se descarga nada.

## 1. Trae el plan a tu aula

```sh
aula nuevo plan-robo
```

Crea `/trabajo/plan-robo` con `PLAN_TRABAJO.md`, `PROMPT_ARMAR_ROBO.md` y una página para leerlo en el
visor (elige `plan-robo`). El plan tiene 15 tareas en 7 fases; cada una trae su criterio de aceptación con
un `curl` o una acción visible, y su tiempo.

| Fase | Qué queda hecho | Minutos |
|---|---|---|
| F0 | Plan personalizado y entorno comprobado | 5 |
| F1 | Chat con tu personalidad y ánimo | 10 |
| F2 | Robot 3D con tu nombre y color | 8 |
| F3 | Voz apagada por defecto y micrófono | 6 |
| F4 | Imágenes en calidad baja, media y máxima | 8 |
| F5 | Flyer con fecha, hora y precio exactos | 9 |
| F6 | Pruebas y mediciones con otra persona | 8 |

## 2. Pega el prompt a tu agente

Abre `jmd` y pega esto. Es breve a propósito, para que lo siga hasta un modelo pequeño:

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

El agente te hace 6 preguntas (nombre, negocio, tono, color, tres preguntas frecuentes, estilo de imagen y
un flyer de prueba), reescribe `PLAN_TRABAJO.md` con tus datos y te lo muestra antes de construir.

## 3. Qué debe pasar

- `grep -c '<<[A-Z0-9_]*>>' /trabajo/plan-robo/PLAN_TRABAJO.md` imprime `0`: no quedó ningún marcador sin llenar.
- Cada tarea la marca `hecha` el agente solo después de pegarte la salida de su criterio.
- Al final abres `robo` en el visor y todo responde con tu negocio.

Los skills que usa el agente son `s2-robo-aula`, `s2-robo-chat`, `s2-robo-avatar`, `s2-robo-voz`,
`s2-robo-imagen`, `s2-robo-flyer` y `s2-robo-pruebas` (están en «Mis skills» y en el aula).

## 4. Modifícalo a tu manera

Puedes pedirle al agente que cambie cualquier cosa del plan antes de construir:

```text
Agrega una tarea F4-T3 que genere una portada vertical para mi negocio y cámbiale el criterio a «la imagen mide más alto que ancho».
```

Regla del plan: los IDs no se renumeran y cada tarea nueva lleva su criterio sí o no.

## 5. Errores típicos

| Qué pasa | Por qué | Qué hacer |
|---|---|---|
| `aula nuevo plan-robo` dice que no existe | Tu aula es anterior a esta clase | Pide al instructor que la reinicie |
| El visor dice `asistente_apagado` | Robo no está arrancado | `sh /trabajo/robo/robo.sh arrancar` (nunca `aula iniciar`) |
| La imagen sale sin relación con el pedido | El pedido llegó en español al modelo de imagen | Revisa `prompt_en` en la respuesta de `/api/imagen` |
| El flyer cambia la fecha o el precio | El pedido no los escribió como «18 de octubre», «10 am», «S/ 20» | Reescribe el pedido con ese formato |
| El agente marca `hecha` sin probar | No ejecutó el criterio | Pídele la salida del comando antes de aceptar |

## Comprobaciones

- `python3 /trabajo/robo/pruebas.py` sale con código 0 y todas las filas dicen PASA.
- `/trabajo/robo/MEDICIONES.md` tiene los tiempos de baja, media y máxima de tu equipo.
