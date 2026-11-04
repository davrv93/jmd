---
id: gq-01
starts_at: 2026-11-03T21:35:00-05:00
duration: 85
title: "GoldenQuerys con IA: genera reportes dinámicamente"
published: true
objectives:
  - id: gq-01-o1
    title: Preguntar en español a cinco bases SQLite de negocios reales y verificar el SQL que escribe la IA
  - id: gq-01-o2
    title: Construir con IA un tablero dinámico con filtros, indicadores y gráficos
  - id: gq-01-o3
    title: Trabajar con un agente como un profesional, con un skill y un plan de trabajo de criterios verificables
recording:
  url: ""
  passcode: ""
materials:
  - id: gq-01-kit
    title: goldenquerys-kit.zip · las 5 bases, la API de solo lectura, el skill del dashboard y el plan de trabajo
    kind: zip
    file: materials/goldenquerys-kit.zip
    objective_ids: [gq-01-o1, gq-01-o2, gq-01-o3]
  - id: gq-01-chartjs
    title: Chart.js · documentación
    kind: doc
    url: https://www.chartjs.org/docs/latest/
    objective_ids: [gq-01-o2]
  - id: gq-01-sqlite
    title: SQLite · funciones de fecha
    kind: doc
    url: https://www.sqlite.org/lang_datefunc.html
    objective_ids: [gq-01-o1]
cycle:
  - id: ver
    title: Ver la clase
    tool: zoom
    phase: experiencia
    description: Asiste en vivo al LIVE o mira la grabación.
    check: Has visto la clase completa (o la grabación)
  - id: preparar
    title: Elegir el negocio
    tool: lms
    phase: experiencia
    description: En el LIVE toca tu negocio, pega el pedido en DeepSeek Harness y deja que baje tu base y arranque la API.
    check: La IA te explica qué datos tiene tu negocio
  - id: tablero
    title: Tablero dinámico
    tool: lms
    phase: experimentacion
    description: Construye con la IA tu dashboard con 3 KPI, 2 gráficos y filtros de fecha, siguiendo el skill y el plan.
    check: goldenquerys/dashboard/index.html cambia al mover las fechas
  - id: reto
    title: Tres preguntas de oro
    tool: lms
    phase: experimentacion
    description: Repite un KPI con curl y compáralo con el dashboard; termina las 5 tareas del plan.
    check: PLAN_TRABAJO.md con las 5 tareas hechas
---

## Avance de la clase

Tus datos ya saben la respuesta: hoy aprendes a preguntarles.
Eliges un negocio, le haces tres preguntas de oro y construyes con DeepSeek Harness el dashboard que su dueño necesita.
La IA escribe el SQL y el código; tú decides qué preguntar y compruebas cada número.

### Bloques (85 minutos)

- 0:00 a 0:05 · Bienvenida.
- 0:05 a 0:10 · Elige tu negocio: la IA baja tu base y la arranca.
- 0:10 a 0:15 · Cómo se le pregunta a una base: skill, plan y API.
- 0:15 a 0:23 · Tu plan de trabajo (T1).
- 0:23 a 0:38 · Tus tres preguntas de oro (T2).
- 0:38 a 1:03 · Tu dashboard en el visor (T3 y T4).
- 1:03 a 1:15 · Verifica y mejora (T5).
- 1:15 a 1:25 · Muéstralo.

## 1. Elige tu negocio · Experiencia

En una frase: tocas un negocio en la escena y tu primer pedido queda copiado.

**Qué vas a hacer**
1. En la escena «Elige tu negocio» toca una tarjeta: botica, pollería, ferretería, academia o courier.
2. Se abre DeepSeek Harness. Primera vez: «Choose workspace» → **trabajo** → **Open**.
3. Pega el pedido (Ctrl+V) y envíalo. La IA baja el kit, guarda tu negocio en `MI_NEGOCIO.txt` y arranca la API.

Sin IA, en la terminal (cambia `botica` por tu negocio):
```sh
curl -fsSL -o /tmp/gq.zip https://raw.githubusercontent.com/davrv93/jmd/main/lms/content/courses/goldenquerys-ia/materials/goldenquerys-kit.zip && unzip -oq /tmp/gq.zip -d /trabajo && echo botica > /trabajo/goldenquerys/MI_NEGOCIO.txt && sh /trabajo/goldenquerys/arrancar.sh
```

**Qué vas a ver:** la IA te explica en 4 líneas qué datos tiene tu negocio.

**Si falla:** `curl -s localhost:8766/api/salud` debe responder `"ok": true`; si no, `sh /trabajo/goldenquerys/arrancar.sh`.

## 2. El skill y el plan · Conceptos

- `skill-dashboard/SKILL.md`: la receta del dashboard que tu agente sigue (API, cómo probar el SQL, cómo se ve terminado).
- `PLAN_TRABAJO.md`: cinco tareas, cada una con un criterio de sí o no.

## 3. Preguntas de oro y dashboard · Aplicación

1. T1: explorar la base. 2. T2: la IA propone 5 preguntas, tú eliges 3 y compruebas su SQL.
3. T3 y T4: `dashboard/index.html` con 3 KPI, 2 gráficos y filtros de fecha. Ábrelo en el visor.
4. T5: repite un KPI con curl y compáralo con el dashboard.

## Tarea · Aplicación

Entrega tu carpeta `goldenquerys` con el plan completo, tus 3 consultas y tu dashboard, y una línea con la decisión que tomaría el dueño.
