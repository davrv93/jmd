---
id: gq-02
starts_at: 2026-11-10T18:30:00-05:00
duration: 60
title: "Curso · Sesión 1: tus tres preguntas de oro y su SQL verificada"
published: true
objectives:
  - id: gq-02-o1
    title: Escribir tres preguntas de oro de un negocio, cada una atada a una decisión del dueño
  - id: gq-02-o2
    title: Reconocer las seis impurezas que hacen mentir a un SQL (anuladas, JOIN que duplica, fecha con hora, filas en vez de personas, top sin orden y la pregunta cambiada)
  - id: gq-02-o3
    title: Verificar con tres pruebas el SQL que escribe la IA antes de confiar en el número
recording:
  url: ""
  passcode: ""
materials:
  - id: gq-02-video-a
    title: "Video corto: las tres preguntas de oro"
    kind: file
    file: materials/video-gq-02-preguntas-de-oro.mp4
  - id: gq-02-video-b
    title: "Video corto: SQL verificada o pirita"
    kind: file
    file: materials/video-gq-02-sql-verificada.mp4
  - id: gq-02-video
    title: "Video: tus tres preguntas de oro, de la pregunta al número verificado"
    kind: file
    file: materials/video-gq-02.mp4
    objective_ids: [gq-02-o1, gq-02-o3]
  - id: gq-02-kit
    title: goldenquerys-kit.zip · las 5 bases, la API de solo lectura, el skill del dashboard y el plan de trabajo
    kind: zip
    file: materials/goldenquerys-kit.zip
    objective_ids: [gq-02-o1, gq-02-o3]
  - id: gq-02-sqlite-fechas
    title: SQLite · funciones de fecha (date, strftime)
    kind: doc
    url: https://www.sqlite.org/lang_datefunc.html
    objective_ids: [gq-02-o2]
  - id: gq-02-sqlite-select
    title: SQLite · SELECT, JOIN, GROUP BY y DISTINCT
    kind: doc
    url: https://www.sqlite.org/lang_select.html
    objective_ids: [gq-02-o2, gq-02-o3]
cycle:
  - id: ver
    title: Ver la clase
    tool: zoom
    phase: experiencia
    description: Asiste en vivo al LIVE o mira la grabación.
    check: Has visto la clase completa (o la grabación)
  - id: retomar
    title: Tu negocio en marcha
    tool: lms
    phase: experiencia
    description: Retoma tu negocio de la charla o elige uno nuevo; la IA arranca la API de datos.
    check: 'curl -s localhost:8766/api/salud responde "ok": true'
  - id: preguntas
    title: Cinco preguntas, eliges tres
    tool: lms
    phase: experiencia
    description: La IA propone 5 preguntas de oro, cada una con su decisión; tú eliges 3 y pides su SQL.
    check: Tres archivos en goldenquerys/consultas/ con «-- Pregunta:» arriba
  - id: dudar
    title: Dos números, una pregunta
    tool: lms
    phase: reflexion
    description: Comparas dos respuestas de la IA a la misma pregunta y dices por qué una miente.
    check: Votaste y escribiste en el muro qué te hizo dudar
  - id: impurezas
    title: Las seis impurezas
    tool: lms
    phase: conceptualizacion
    description: Las seis formas en que un SQL da un número falso y las tres pruebas que lo delatan.
    check: Sabes nombrar las tres pruebas sin mirar
  - id: juego
    title: ¿Oro o pirita?
    tool: lms
    phase: conceptualizacion
    description: Juego de la clase. Cada número de la IA es oro o pirita; si es pirita, tocas la línea con la impureza.
    check: Jugaste una ronda y publicaste tu reflexión
  - id: verificar
    title: Tus tres, verificadas
    tool: lms
    phase: experimentacion
    description: Aplicas las tres pruebas a tus tres consultas, corriges la que falle y anotas qué la verificó.
    check: Cada consulta lleva «-- Contrastado:» (la IA) y «-- Verificado:» (tú, después de revisar); T2 hecha en el plan
  - id: entregar
    title: Insignia y tarea
    tool: lms
    phase: experimentacion
    description: Enciendes tu insignia, descargas tu fotito, dices en el muro qué te llevas y anotas la tarea.
    check: Tu fotito descargada y tu línea en el muro de cierre
---

**Martes 10 de noviembre, 6:30 – 7:30 pm (hora de Lima).**

Primera sesión del curso con IA. Eliges tu negocio, escribes tus tres preguntas de oro y verificas
el SQL que propone el agente antes de confiar en el número.

## Avance de la clase

Un número sin verificar es pirita: brilla igual que el oro.
Hoy la IA escribe el SQL de tus tres preguntas de oro y tú lo pruebas antes de creerle.

### Bloques (60 minutos)

- 0:00 a 0:02 · Bienvenida: un número sin verificar es pirita (voto).
- 0:02 a 0:05 · Pulso: 10 000 ventas, ¿qué preguntas primero? (muro) y ¿vaga, de cobre o de oro? (voto).
- 0:05 a 0:10 · Tu negocio en marcha (retomas el de la charla o eliges uno).
- 0:10 a 0:18 · Cinco preguntas de oro: la IA propone, tú eliges tres (muro).
- 0:18 a 0:21 · Video: de la pregunta al número verificado (voto).
- 0:21 a 0:25 · Dos números para la misma pregunta (voto y muro).
- 0:25 a 0:29 · Juego: Detective del SQL, tres casos que corren y mienten.
- 0:29 a 0:33 · Las seis impurezas y las tres pruebas (voto).
- 0:33 a 0:36 · La escalera: generado → revisado → ejecutado → contrastado → verificado (voto).
- 0:36 a 0:43 · Juego: ¿oro o pirita?
- 0:43 a 0:45 · De memoria: las tres pruebas, sin mirar (muro y voto).
- 0:45 a 0:53 · Verifica tus tres consultas.
- 0:53 a 0:57 · Reto final: la consulta impostora (voto y muro).
- 0:57 a 1:00 · Ticket de salida, tu insignia, tu fotito y la tarea.

## 1. Tu negocio en marcha · Experiencia

**¿Viniste a la charla?** Pega en DeepSeek Harness:

```text
Retoma GoldenQuerys. Si no existe /trabajo/goldenquerys, dímelo y no hagas nada más. Si existe: corre sh /trabajo/goldenquerys/arrancar.sh, comprueba curl -s localhost:8766/api/salud, lee goldenquerys/MI_NEGOCIO.txt y goldenquerys/PLAN_TRABAJO.md y dime en 3 líneas: mi negocio, sus 3 tablas clave y qué tareas ya están hechas.
```

**¿Eres nuevo?** En la escena toca tu negocio (botica, pollería, ferretería, academia o courier): el pedido
queda copiado. Sin IA, en la terminal (cambia `botica` por tu negocio):

```sh
curl -fsSL -o /tmp/gq.zip https://raw.githubusercontent.com/davrv93/jmd/main/lms/content/courses/goldenquerys-ia/materials/goldenquerys-kit.zip && unzip -oq /tmp/gq.zip -d /trabajo && echo botica > /trabajo/goldenquerys/MI_NEGOCIO.txt && sh /trabajo/goldenquerys/arrancar.sh
```

**Si falla:** `curl -s localhost:8766/api/salud` debe responder `"ok": true`; si no, `sh /trabajo/goldenquerys/arrancar.sh`.

## 2. Preguntas de oro · Experiencia

Una pregunta de oro termina en una decisión del dueño. «¿Cuánto vendimos?» es de cobre; «¿qué sede
vende menos por hora abierta, para mover su horario?» es de oro.

1. Pide a la IA cinco preguntas, cada una con su decisión. No le pidas SQL todavía.
2. Elige tres y pide su SQL, probado con curl y guardado en `goldenquerys/consultas/`.

## 3. Dos números, una pregunta · Reflexión

La misma pregunta («¿cuánto vendió la botica en septiembre?») con dos SQL: S/ 15 939,24 y S/ 7 404,90.
Uno de los dos duplica cada venta por cada producto de la boleta. ¿Cuál le darías al dueño?

## 4. Las seis impurezas y las tres pruebas · Conceptos

| Impureza | Cómo se ve | Arreglo |
|---|---|---|
| Cuenta lo anulado | falta `estado = 'emitida'` | filtra el estado |
| El JOIN duplica | `SUM(v.total)` con `JOIN venta_detalle` | suma en la tabla que tiene el total |
| La fecha corta el día | `fecha BETWEEN '…-01' AND '…-31'` con hora | `date(fecha)` o `< '…-01'` del mes siguiente |
| Filas, no personas | `COUNT(cliente_id)` | `COUNT(DISTINCT cliente_id)` |
| Top sin orden | `LIMIT 5` sin `ORDER BY` | ordena antes de cortar |
| La pregunta cambiada | responde algo parecido, no lo pedido | relee la pregunta y el filtro |

**Las tres pruebas:** 1) cuenta las filas base sin agrupar; 2) compara el total con otra consulta más
simple que debería dar lo mismo; 3) mira los bordes: anuladas, último día del mes, nulos y duplicados.

**La escalera de la verificación:** generado (la IA escribió el SQL) → revisado (lees cada filtro, JOIN y
fecha contra la pregunta) → ejecutado (corre y devuelve filas) → contrastado (el número coincide por otra
ruta) → verificado (lo firmas tú). Un «está correcto» de la IA no sube ningún escalón.

## 5. Juego: ¿oro o pirita? · Conceptos

Hasta 25 jugadores a la vez. La IA te trae un número con su SQL: si es oro, lo firmas; si es pirita, tocas
la línea con la impureza. Nadie queda fuera: cada error muestra la lupa con el número real. Al final, tu
título, el tablero de la clase y tu fotito.

## 6. Verifica tus tres · Aplicación

Pega en DeepSeek Harness:

```text
Tarea T2 con verificación. Para cada una de mis 3 consultas de goldenquerys/consultas/: 1) ejecútala con curl contra /api/consulta y dime filas y total; 2) aplica las 3 pruebas: cuenta las filas base sin agrupar, compara el total con una consulta independiente más simple y revisa los bordes (anuladas, fechas con hora, JOIN que duplica, DISTINCT); 3) si una prueba falla, corrige el SQL y explícame en una línea qué impureza tenía; 4) agrega arriba de cada archivo «-- Decisión:» y «-- Contrastado:» con la prueba y su número. NO escribas «-- Verificado:» ni marques T2: eso lo hago yo después de revisar tus números. Termina diciéndome qué debo mirar en cada consulta.
```

## Tarea · Aplicación

En `goldenquerys/consultas/` deja tus tres consultas, cada una con `-- Pregunta:`, `-- Decisión:` y
`-- Verificado:` (la prueba y su número; esa línea la escribes tú, no la IA). Si la IA se equivocó en alguna, anota en una línea qué impureza
tenía. En la sesión 2 (martes 17) las conviertes en tu tablero dinámico.
