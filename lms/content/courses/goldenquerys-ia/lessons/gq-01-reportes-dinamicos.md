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
    title: Renderizar el mismo resultado en navegador, Excel, Python, Bun y Node y elegir la salida según quién la lee
recording:
  url: ""
  passcode: ""
materials:
  - id: gq-01-kit
    title: goldenquerys-kit.zip · las 5 bases, el servidor de reportes, el estudio y los renderers
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
    title: Preparar el estudio
    tool: lms
    phase: experiencia
    description: Desde el LIVE, pide a DeepSeek Harness que baje y arranque el kit; abre goldenquerys/index.html en el visor.
    check: El visor muestra el estudio GoldenQuerys con las 5 bases
  - id: tablero
    title: Tablero dinámico
    tool: lms
    phase: experimentacion
    description: Construye con la IA un tablero con filtros que se recalcula llamando a /api/consulta.
    check: reportes/tablero-polleria.html cambia al mover los filtros
  - id: reto
    title: Tres preguntas de oro
    tool: lms
    phase: experimentacion
    description: Elige un giro, responde tres preguntas con SQL verificada y escribe la decisión que tomarías.
    check: reportes/reto.html muestra las tres respuestas y sus decisiones
---

## Avance de la clase

Tus datos ya saben la respuesta: hoy aprendes a preguntarles.
Trabajas con cinco bases SQLite de negocios peruanos y una IA que escribe el SQL por ti.
Tú haces lo que una IA no puede: decidir qué pregunta vale oro y comprobar que el número es correcto.

### Bloques (85 minutos)

- 0:00 a 0:10 · Bienvenida y las cinco bases.
- 0:10 a 0:20 · Preparar el estudio en tu aula.
- 0:20 a 0:35 · Tu primera golden query.
- 0:35 a 0:55 · Un tablero dinámico.
- 0:55 a 1:05 · El mismo dato en cuatro tecnologías.
- 1:05 a 1:20 · Reto: tres preguntas de oro.
- 1:20 a 1:25 · Cierre.

## 1. Preparar el estudio · Experiencia

En una frase: bajas el kit a tu aula y arrancas el servidor de reportes.

**Qué vas a hacer**
1. En el LIVE, abre **DeepSeek Harness** (se abre solo en el panel). En «Choose workspace» toca **trabajo** y luego **Open**.
2. Pulsa «Copiar el pedido de esta escena» y pégalo en el chat.
3. Si prefieres la terminal:
   ```sh
   curl -fsSL -o /tmp/gq.zip https://raw.githubusercontent.com/davrv93/jmd/main/lms/content/courses/goldenquerys-ia/materials/goldenquerys-kit.zip && unzip -oq /tmp/gq.zip -d /trabajo && sh /trabajo/goldenquerys/arrancar.sh
   ```
4. En el visor escribe `goldenquerys/index.html`.

**Qué vas a ver:** el estudio GoldenQuerys con cinco bases: botica, pollería, ferretería, academia y courier.

**Si falla:** `curl -s localhost:8766/api/salud` debe responder `"ok": true`. Si no, corre otra vez `sh /trabajo/goldenquerys/arrancar.sh`.

## 2. Tu primera golden query · Experiencia

En una frase: la IA escribe la consulta y tú firmas el número.

**Qué vas a hacer**
1. En el estudio elige Botica y ejecuta una pregunta de ejemplo.
2. Pide a la IA los 10 productos que más soles dejaron en 2026.
3. Pega su SQL en el estudio y comprueba el total.

## 3. Tablero dinámico · Aplicación

En una frase: un reporte con filtros que consulta la base cada vez que lo mueves.

Pide a la IA `reportes/tablero-polleria.html` con filtros de fecha y sede, tres indicadores y dos gráficos.

## 4. Cuatro tecnologías · Reflexión

```sh
cd /trabajo/goldenquerys
python3 renderers/reporte.py botica
bun renderers/reporte.ts botica
node renderers/reporte.mjs botica
```

¿Qué salida le mandarías al gerente, al contador y a otra app?

## Tarea · Aplicación

Elige un giro y entrega `reportes/reto.html` con tres preguntas de oro, su SQL, un gráfico por pregunta y la decisión que tomarías.
