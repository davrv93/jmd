---
id: bwb-02
title: "Sesión 2 · Motor de decisiones: el código decide"
published: true
starts_at: 2026-11-22T19:30:00-05:00
objectives:
  - id: bwb-02-o1
    title: Explicar por qué el código decide y el modelo solo redacta, y leer una tabla de decisión con hechos y acciones
recording:
  url: ""
  passcode: ""
repo:
  url: https://github.com/davrv93/jmd
  ref: main
materials:
  - id: bwb-02-m5
    title: LettuceDetect · detector de alucinaciones (verifica si una frase se apoya en el contexto)
    kind: repo
    url: https://github.com/KRLabsOrg/LettuceDetect
    objective_ids: [bwb-02-o1]
cycle:
  - id: ver
    title: Ver la clase
    tool: zoom
    phase: experiencia
    description: Asiste en vivo o mira la grabación. Abre el modo LIVE de esta sesión para tocar las escenas.
    check: Has visto la clase completa (o la grabación)
  - id: motor
    title: Leer la tabla de decisión
    tool: lms
    phase: conceptualizacion
    description: En la escena 3 resuelve al menos 8 casos aleatorios y marca si el motor decidió bien. Compara «sin motor» y «con motor».
    check: Acuerdo con el criterio del instructor de 80 % o más
---

## Avance de la sesión

Hoy, en 45 minutos, ves la regla que manda en un bot serio: **los modelos proponen, el código decide.**

## 3. El motor de decisiones · Conceptos

El motor no es una cadena de `if`. Son tres pasos, en este orden:

1. **Hechos.** El mensaje se lee **una sola vez** y sale un diccionario de hechos con nombre:
   `pregunta_precio`, `habla_envio`, `pide_talla`, `pide_humano`, `groseria`, `despide`,
   `fuera_de_giro`… Cada hecho sale de una expresión regular, de la intención del clasificador
   o de la comprensión entrenada (bloque 5).
2. **Tabla.** Una lista de reglas por grupo: `encabezado` (qué se dice primero), `datos` (lo que
   preguntó) y `acuse`. Cada regla dice *cuándo dispara* y *qué acción produce*. Hay reglas que
   **excluyen** a otras: «¿cuánto cuesta el envío?» dispara `envio` y tapa a `precio`.
3. **Acción.** Responder con plantilla, recomendar, preguntar, derivar a una persona o callar. Los
   datos (precio, stock, horario) salen **solo del catálogo**; el modelo, si entra, solo cambia la
   forma de decirlo y pasa por una **compuerta factual** que rechaza cualquier dato nuevo.

En la escena 3 pulsa «Otro caso» al menos 8 veces, mira hechos → fila → acción, compara «sin motor»
(fíjate en lo rojo: hechos inventados) y marca si el motor decidió bien. Dos de los casos están ahí
porque el motor **se equivoca**: descubre cuáles y por qué.

**Si falla:** tu acuerdo queda por debajo de 80 % → vuelve a leer el «por qué» de cada fila antes de marcar.
