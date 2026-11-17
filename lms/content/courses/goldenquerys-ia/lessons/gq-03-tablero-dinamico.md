---
id: gq-03
starts_at: 2026-11-17T18:30:00-05:00
duration: 60
title: "Curso · Sesión 2: el tablero dinámico y la decisión"
published: true
objectives:
  - id: gq-03-o1
    title: Elegir el gráfico que responde cada pregunta de oro (tarjeta, barras, línea o tabla) por la forma de su resultado
  - id: gq-03-o2
    title: Construir con IA un tablero cuyos filtros vuelven a consultar la API y comprobar que cada número cuadra con su SQL verificada
  - id: gq-03-o3
    title: Convertir cada número en una decisión con la forma «si pasa X, entonces haré Y»
recording:
  url: ""
  passcode: ""
materials:
  - id: gq-03-kit
    title: goldenquerys-kit.zip · las 5 bases, la API de solo lectura, el skill del dashboard y el plan de trabajo
    kind: zip
    file: materials/goldenquerys-kit.zip
    objective_ids: [gq-03-o1, gq-03-o2]
  - id: gq-03-repaso
    title: "Repaso en video: la sesión 1 en 37 segundos"
    kind: file
    file: materials/video-gq-02.mp4
    objective_ids: [gq-03-o2]
  - id: gq-03-chartjs
    title: Chart.js 4.4 · la librería de gráficos que usa el skill del tablero
    kind: doc
    url: https://www.chartjs.org/docs/4.4.1/
    objective_ids: [gq-03-o1, gq-03-o2]
  - id: gq-03-sqlite-fechas
    title: SQLite · funciones de fecha (date, strftime) para filtros que no cortan el día
    kind: doc
    url: https://www.sqlite.org/lang_datefunc.html
    objective_ids: [gq-03-o2]
  - id: gq-03-cleveland
    title: "Cleveland y McGill (1984) · Graphical perception, JASA 79(387): 531–554"
    kind: doc
    url: https://doi.org/10.1080/01621459.1984.10478080
    objective_ids: [gq-03-o1]
  - id: gq-03-challenger
    title: "Informe de la comisión del Challenger (1986), cap. VI · figuras 6 y 7"
    kind: doc
    url: https://www.nasa.gov/history/rogersrep/v1ch6.htm
    objective_ids: [gq-03-o1]
  - id: gq-03-gollwitzer
    title: "Gollwitzer y Sheeran (2006) · metaanálisis de los planes «si…, entonces…»"
    kind: doc
    url: https://doi.org/10.1016/S0065-2601(06)38002-1
    objective_ids: [gq-03-o3]
cycle:
  - id: ver
    title: Ver la clase
    tool: zoom
    phase: experiencia
    description: Asiste en vivo al LIVE o mira la grabación.
    check: Has visto la clase completa (o la grabación)
  - id: retomar
    title: Tu negocio y tus tres consultas
    tool: lms
    phase: experiencia
    description: Retomas tu negocio y tus tres consultas de la sesión 1, o las armas con un pedido si te la perdiste.
    check: 'curl -s localhost:8766/api/salud responde "ok": true y hay tres archivos en goldenquerys/consultas/'
  - id: graficos
    title: Cada pregunta, su gráfico
    tool: lms
    phase: conceptualizacion
    description: Tarjeta, barras, línea o tabla según la forma del resultado de tu SQL; las barras, desde cero.
    check: Sabes qué gráfico le toca a cada una de tus tres preguntas
  - id: construir
    title: Tu tablero dinámico
    tool: lms
    phase: experimentacion
    description: La IA construye goldenquerys/dashboard/index.html siguiendo el skill (T3, T4 y T4b) y tú lo pruebas en el visor.
    check: Abre en el visor, tiene 3 tarjetas y 2 gráficos con datos reales, cambia con las fechas y la caja muestra su SQL
  - id: juego
    title: ¿Qué gráfico va?
    tool: lms
    phase: conceptualizacion
    description: Juego de la clase. Cada pregunta de oro trae lo que devuelve su SQL y la llevas al gráfico que la responde.
    check: Jugaste una ronda y publicaste tu reflexión
  - id: dinamico
    title: Dinámico es volver a preguntar
    tool: lms
    phase: conceptualizacion
    description: Cada filtro arma un SQL nuevo y la API consulta tus datos en ese momento; el filtro también puede meter una impureza.
    check: Cambias las fechas y sabes explicar por qué cambian los números
  - id: cuadrar
    title: Cada número cuadra
    tool: lms
    phase: experimentacion
    description: El número del visor, el de curl con el mismo SQL y el de «-- Verificado:» son el mismo (T5).
    check: Registraste tu hallazgo y T5 está hecha en el plan
  - id: decidir
    title: Tus tres decisiones
    tool: lms
    phase: experimentacion
    description: Escribes una regla «si…, entonces…» por pregunta y la IA la pone bajo su gráfico con un semáforo.
    check: Tres reglas en el tablero, cada una con número, umbral, acción y cuándo
  - id: entregar
    title: Insignia y proyecto final
    tool: lms
    phase: experimentacion
    description: Enciendes tu insignia, descargas tu fotito, dices en el muro qué te llevas y anotas el proyecto final.
    check: Tu fotito descargada y tu línea en el muro de cierre
---

**Martes 17 de noviembre, 6:30 – 7:30 pm (hora de Lima).** Última sesión del curso.

Conviertes tus tres preguntas de oro en un tablero con filtros, tarjetas y gráficos que vuelve a consultar
tus datos cada vez que mueves un filtro, compruebas que cada número cuadra con su SQL verificada y escribes
la decisión que tomarías con cada uno.

## Avance de la clase

Un número no decide nada: tú sí. Hoy cada pregunta de oro se vuelve un gráfico vivo y termina en una frase:
«si pasa esto, entonces haré aquello».

### Bloques (60 minutos)

- 0:00 a 0:02 · Bienvenida: un número no decide nada (voto).
- 0:02 a 0:04 · Repaso: la sesión 1 en 37 segundos (video y voto).
- 0:04 a 0:09 · Tu negocio y tus tres consultas: tres caminos, un pedido para cada uno.
- 0:09 a 0:14 · Teoría: cada pregunta pide su gráfico (Cleveland y McGill; el Challenger).
- 0:14 a 0:18 · Encarga tu tablero: la IA construye mientras jugamos (voto de predicción).
- 0:18 a 0:25 · Juego: ¿qué gráfico va?
- 0:25 a 0:29 · Teoría: dinámico es volver a preguntar (Shneiderman; el filtro que corta el día).
- 0:29 a 0:35 · Pruébalo en el visor: los criterios de T3, T4 y T4b (voto).
- 0:35 a 0:40 · Cada número cuadra con su SQL: T5 con tus tres preguntas (hallazgo y muro).
- 0:40 a 0:44 · Reto: el tablero que miente (voto y muro).
- 0:44 a 0:48 · Teoría: un número sin decisión es adorno (Gollwitzer).
- 0:48 a 0:53 · Tus tres decisiones «si…, entonces…», al tablero con su semáforo (muro).
- 0:53 a 0:56 · Muestra tu tablero: tu postal y tu línea en el muro.
- 0:56 a 1:00 · Ticket de salida, tu insignia, tu fotito y el proyecto final.

## 1. Tu negocio y tus tres consultas · Experiencia

**¿Viniste a la sesión 1?** Pega en DeepSeek Harness:

```text
Retoma GoldenQuerys, sesión 2. Si no existe /trabajo/goldenquerys (tu aula puede ser nueva), no lo busques más: pregúntame cuál era mi negocio (botica, polleria, ferreteria, academia o courier) y, cuando te responda con BASE, ejecuta curl -fsSL -o /tmp/gq.zip https://raw.githubusercontent.com/davrv93/jmd/main/lms/content/courses/goldenquerys-ia/materials/goldenquerys-kit.zip && unzip -oq /tmp/gq.zip -d /trabajo && echo BASE > /trabajo/goldenquerys/MI_NEGOCIO.txt (cambiando BASE por mi respuesta). Cuando exista: corre sh /trabajo/goldenquerys/arrancar.sh, comprueba curl -s localhost:8766/api/salud, lee goldenquerys/MI_NEGOCIO.txt y goldenquerys/PLAN_TRABAJO.md y lista goldenquerys/consultas/*.sql. Dime en una tabla corta cada consulta con su «-- Pregunta:», su número y si ya tiene «-- Verificado:». Si tengo menos de 3 consultas, dímelo y no escribas nada todavía.
```

**¿Tienes una o dos consultas?** La IA propone las que faltan, las prueba y las contrasta:

```text
Tengo menos de 3 consultas en goldenquerys/consultas/. Propón las que faltan para llegar a 3 preguntas de oro de mi negocio, cada una con la decisión que permite tomar. Escribe su SQL, pruébala con curl contra /api/consulta, contrástala con una consulta independiente más simple (filas base, otra ruta, bordes: anuladas, fechas con hora, JOIN que duplica) y guárdala en goldenquerys/consultas/<negocio>-<tema>.sql con «-- Pregunta:», «-- Decisión:» y «-- Contrastado:» arriba. NO escribas «-- Verificado:»: lo escribo yo cuando revise tus números.
```

**¿Te perdiste la sesión 1?** En la escena toca tu negocio y el pedido queda copiado. Este es el de la botica;
los otros cambian solo el nombre y la base:

```text
Me perdí la sesión 1. Mi negocio es: Botica (base botica). 1) Ejecuta este comando y dime qué imprimió: curl -fsSL -o /tmp/gq.zip https://raw.githubusercontent.com/davrv93/jmd/main/lms/content/courses/goldenquerys-ia/materials/goldenquerys-kit.zip && unzip -oq /tmp/gq.zip -d /trabajo && echo botica > /trabajo/goldenquerys/MI_NEGOCIO.txt && sh /trabajo/goldenquerys/arrancar.sh . 2) Lee goldenquerys/AGENTS.md y goldenquerys/skill-dashboard/SKILL.md, reemplaza <<NEGOCIO>> en goldenquerys/PLAN_TRABAJO.md y haz T1 con curl -s "localhost:8766/api/esquema?db=botica". 3) Propón 3 preguntas de oro para el dueño, cada una con su decisión; escribe su SQL, pruébala con curl contra /api/consulta y contrástala con una consulta más simple (filas base, otra ruta y bordes: anuladas, fechas con hora, JOIN que duplica). 4) Guárdalas en goldenquerys/consultas/<negocio>-<tema>.sql con «-- Pregunta:», «-- Decisión:» y «-- Contrastado:» arriba. NO escribas «-- Verificado:» ni marques T2: eso lo hago yo. Termina con una tabla: pregunta, número y prueba.
```

**Si falla:** `curl -s localhost:8766/api/salud` debe responder `"ok": true`; si no, `sh /trabajo/goldenquerys/arrancar.sh`.

## 2. Cada pregunta pide su gráfico · Conceptos

| La pregunta | Lo que devuelve tu SQL | El gráfico |
|---|---|---|
| ¿Cuánto? | una fila con un número | tarjeta |
| ¿Quién más, quién menos? | pocas filas con nombre y número | barras ordenadas que empiezan en cero |
| ¿Sube o baja? | fechas en orden | línea |
| ¿A quién llamo? | una lista con nombres, teléfonos y montos | tabla |

Cleveland y McGill (1984) midieron que comparamos mejor posiciones sobre una misma escala que ángulos o áreas:
barras antes que torta. Y el Challenger (1986): la noche antes del lanzamiento se compararon solo los vuelos que
habían tenido daño en las juntas; con los 24 vuelos se veía que los 4 más fríos lo habían tenido. Un gráfico
necesita la forma correcta y todas las filas, también las que dan cero.

## 3. Encarga tu tablero · Aplicación

```text
Tareas T3, T4 y T4b del plan. Lee goldenquerys/skill-dashboard/SKILL.md y síguelo al pie de la letra. Construye goldenquerys/dashboard/index.html con mis 3 consultas de goldenquerys/consultas/ como centro: 1) usa el SQL de cada una tal cual y solo agrégale los filtros (fecha desde y hasta, y sede o local si mi base lo tiene); 2) elige el widget por la forma del resultado: un solo número → tarjeta KPI; pocas categorías para comparar → barras ordenadas que empiezan en cero; fechas en orden → línea; una lista para actuar (nombres, teléfonos, montos) → tabla; 3) completa lo que pide el skill (3 KPI, 2 gráficos, la tabla y la caja de pregunta con /api/pregunta); 4) encima de cada widget, su pregunta en una línea; 5) por defecto, las fechas del periodo de mis consultas (si no tienen fechas, del 2025-01-01 al 2026-10-31). Prueba cada consulta con curl antes de usarla y marca T3 y T4 solo si cumplen su criterio. Al terminar dime en 4 líneas qué widget responde cada pregunta y por qué, y qué escribir en el visor.
```

La IA tarda de 3 a 6 minutos. Mientras trabaja, la clase juega.

## 4. Juego: ¿qué gráfico va? · Conceptos

Cada carta trae una pregunta de oro y lo que devuelve su SQL (cuántas filas y qué columnas). La llevas a la
tarjeta, las barras, la línea o la tabla; al acertar, eliges la decisión que permite (+5). Errar no resta: la
lupa explica por qué. Quien llega tarde practica solo y su reflexión cuenta igual.

## 5. Dinámico es volver a preguntar · Conceptos

Filtro → SQL con el filtro → `/api/consulta` → gráfico. En la botica, septiembre de 2026 lo ganó Los Olivos
(S/ 2 375,52) y octubre, SJL (S/ 2 558,80): una foto de septiembre te habría mandado a la sede equivocada. El
filtro también es SQL: con `fecha <= '2026-10-31'` el 31 queda fuera porque la fecha trae hora (385 ventas en vez
de 400). El filtro va con `date(fecha)`.

## 6. Pruébalo en el visor · Aplicación

En el visor, `goldenquerys/dashboard/index.html`: ¿cada pregunta tiene su gráfico?, ¿cambian todos los números al
mover las fechas?, ¿entra el último día del mes?, ¿la caja de pregunta muestra su SQL? Si algo falla:

```text
Revisa goldenquerys/dashboard/index.html contra el criterio de T3, T4 y T4b del plan: 1) que todas las llamadas usen la ruta absoluta /api/…; 2) que al cambiar cualquier filtro se vuelvan a consultar TODOS los widgets (destruye cada gráfico antes de volver a crearlo); 3) que el filtro de fechas use date(fecha) para que el último día entre completo; 4) que la caja de pregunta muestre su SQL. Corrige lo que falle y dime en 3 líneas qué cambiaste.
```

Si un gráfico no va con su pregunta, cambia los `__`:

```text
En mi tablero, el widget de la pregunta «__» debe ser __ (tarjeta, barras, línea o tabla), porque su consulta devuelve __. Cámbialo sin tocar su SQL y dime qué cambiaste.
```

## 7. Cada número cuadra con su SQL · Aplicación

El número del visor, el de curl con el mismo SQL y el de `-- Verificado:` tienen que ser el mismo.

```text
Tarea T5 con mis tres preguntas. Para cada widget de goldenquerys/dashboard/index.html: 1) dime qué consulta de goldenquerys/consultas/ usa y qué fechas pone el filtro; 2) con las fechas de su «-- Verificado:» (o de su «-- Contrastado:» si aún no lo firmé), ejecuta con curl el MISMO SQL que manda el tablero; 3) muéstrame una tabla: widget | número por curl | número verificado | ¿cuadra?; 4) si alguno no cuadra, explícame en una línea por qué (filtro de fecha que corta el día, JOIN que duplica, anuladas u otra pregunta) y corrígelo en el tablero. NO marques T5: lo marco yo cuando vea el mismo número en el visor.
```

Cuando los tres cuadren, T5 la marcas tú:

```text
Ya vi en el visor los mismos números que tus curl y que mis «-- Verificado:». Marca T5 hecha en goldenquerys/PLAN_TRABAJO.md y muéstrame el plan completo.
```

## 8. El tablero que miente · Reflexión

Tres tableros con los mismos números de la botica. En uno, el eje de las barras empieza en S/ 1 900: SJL vendió
33 % más que Lince, pero su barra se ve 24 veces más larga (el factor de mentira de Tufte, aquí unas 70 veces).
Las barras, siempre desde cero.

## 9. Tus tres decisiones · Aplicación

Pregunta → número → referencia → «si…, entonces…». Gollwitzer llamó a esos planes intenciones de implementación;
en un metaanálisis de 94 pruebas, planear así ayudó a cumplir metas con un efecto de medio a grande
(Gollwitzer y Sheeran, 2006, d = 0,65). Primero la IA trae tus números con algo para comparar:

```text
Para cada una de mis 3 preguntas de oro de goldenquerys/consultas/, dame en una tabla el número que muestra hoy mi tablero y una referencia para compararlo (el mes anterior, el promedio de los meses anteriores o el mismo mes del año pasado: la que tenga sentido), sacada con curl. NO escribas decisiones: te las dicto yo en el siguiente mensaje.
```

Después escribes tus tres reglas en la escena, que arma este pedido con tus palabras:

```text
Mis decisiones: 1) Si __, entonces __. 2) Si __, entonces __. 3) Si __, entonces __. Agrégalas a goldenquerys/dashboard/index.html: debajo del widget de cada pregunta, un recuadro «Decisión» con la frase y un semáforo que se recalcula con los filtros: ámbar si con los datos filtrados se cumple el «si» (toca actuar) y verde si no. Guárdalas también como «-- Decisión:» en su consulta. No cambies ningún SQL; si una condición no se puede calcular con los datos, pregúntame antes de inventar. Al terminar dime qué semáforo está en ámbar hoy.
```

## Proyecto final · Aplicación

Hasta el domingo 22 de noviembre, en tu aula: `goldenquerys/dashboard/index.html` con tus tres preguntas de oro,
cada una con su SQL verificada (`-- Verificado:` escrito por ti), su gráfico y su decisión «si…, entonces…» con
semáforo; y en `goldenquerys/PLAN_TRABAJO.md`, de T1 a T5 hechas. Comparte tu postal del tablero en el grupo de
la clase. El lunes, abre tu tablero con las fechas de la semana y mira qué semáforo está en ámbar.
