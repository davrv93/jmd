# Estado del modo LIVE (11-10-2026)

Resumen de lo hecho frente al plan `PLAN_MODO_LIVE_SESION2_EJECUCION.md`. Todo está en la rama `main` del repo local; nada se ha desplegado.

## Hecho y probado

| Área | Qué hay | Tickets |
|---|---|---|
| Tiempo real | Stream SSE, presencia con semáforo, modo guiado y libre, latido del alumno | T-1.1 a T-1.10, T-1.13 |
| Control del instructor | Lista de escenas, siguiente y anterior, cronómetro, mensaje a todos, ánimo del robot, emparejado | T-1.11, T-1.12, T-1.14, T-1.15 |
| Compuerta | Umbral por escena, quién falta, esperar o pasar igual, «Lo logré» con deshacer, evidencias | T-1.11, T-1.12, T-2.12 (parámetro), T-6.2 |
| Escenas | 12 de la clase 2 y 12 de la clase 1, con plantilla, capturas y robot como avatar | T-2.1 a T-2.16 y `GUION_LIVE_SESION1.md` |
| Aula por alumno | Imagen `jmd/aula` (76 MB, sin Node), contenedor de 192 MB, terminal dentro del aula, apagado a los 15 min | T-3.1 a T-3.6 (parte), T-3.5 |
| Visor | `/vista/{alumno}/…` desde el servidor, relé al asistente, sondeo de 2 s, tamaños, consola con archivo y línea, plantillas html, react, vue, preact, php, python | T-4.1 a T-4.4, T-4.6 |
| IA en la nube | Gateway con Qwen, DeepSeek y GLM baratos; chat; extracción de datos; fondo del flyer con modelo de imagen | T-5.12 (parte) |
| Despliegue | Guía `DEPLOY_MODO_LIVE.md` y variables en `compose.yaml` | T-7 (parte) |

## En curso

- Skills por alumno aisladas, con variantes por modelo y panel «Mis skills» (T-5b.1 a T-5b.7).

## Pendiente

- Tokens por alumno, cuotas y vista de consumo (T-5.1 a T-5.9). Hoy todos comparten una clave del gateway.
- Transcripción por servidor (T-5.11). La voz usa el reconocimiento del navegador.
- Captura de evidencia del visor para el instructor (T-4.5) y su panel de evidencias.
- `jmd` embebido mejorado: contexto, tokens, lista de tareas y reintentos (T-3b).
- Interruptores de piedra y RTK (T-3.11, T-3.12), precrear aulas y medir diez (T-3.13).
- Motor de evidencias automáticas por escena (T-2.4): hoy cuenta «Lo logré» y las evidencias que el alumno declara.
- Ensayo cronometrado con alumnos reales y despliegue (T-2.17, fase 7).

## Decisiones tomadas en el camino

- El avatar es el robot, nunca el osito.
- El LMS llega al asistente del alumno con `docker exec` y `nc` dentro del contenedor, no por la red: funciona igual si el LMS corre en el host o en un contenedor.
- El código del asistente se copia a `/trabajo/osito` solo la primera vez, para no pisar lo que el alumno edite. Un cambio en la imagen no llega a volúmenes ya creados.
- Las pruebas Go del contenido se corren con `-count=1`.
