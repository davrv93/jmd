---
id: bwb-03
title: "Sesión 3 · Embeddings: entender lo que pide el cliente"
published: true
starts_at: 2026-11-29T19:30:00-05:00
objectives:
  - id: bwb-03-o1
    title: Entender qué son los embeddings y para qué sirven en un bot
recording:
  url: ""
  passcode: ""
repo:
  url: https://github.com/davrv93/jmd
  ref: main
materials:
  - id: bwb-03-m4
    title: multilingual-e5-small · el modelo de embeddings del bot de referencia
    kind: doc
    url: https://huggingface.co/intfloat/multilingual-e5-small
    objective_ids: [bwb-03-o1]
  - id: bwb-03-m6
    title: scikit-learn · regresión logística (la que clasifica sobre los embeddings)
    kind: doc
    url: https://scikit-learn.org/stable/modules/generated/sklearn.linear_model.LogisticRegression.html
    objective_ids: [bwb-03-o1]
cycle:
  - id: ver
    title: Ver la clase
    tool: zoom
    phase: experiencia
    description: Asiste en vivo o mira la grabación. Abre el modo LIVE de esta sesión para tocar las escenas.
    check: Has visto la clase completa (o la grabación)
  - id: embeddings
    title: Jugar con los embeddings
    tool: lms
    phase: conceptualizacion
    description: En la escena 5 escribe tres frases de clientes y mira cuáles quedan cerca. Explica con tus palabras por qué.
    check: Tus tres frases marcaron vecinas con sentido
  - id: preguntar
    title: Preguntar o responder
    tool: lms
    phase: reflexion
    description: Publica una pregunta sobre la clase en el hilo de la sesión o responde la de un compañero.
    check: Tu pregunta aparece en el hilo de la sesión
  - id: entregar
    title: Entregar la tarea extra
    tool: git
    phase: experimentacion
    description: Sube medicion.txt y EVIDENCIA.md a tu repo y entrégalo desde el LMS (URL + commit).
    check: La entrega aparece en «Mis notas» con estado en cola
---

## Avance de la sesión

Hoy, en 45 minutos, ves cómo tu bot entiende lo que pide el cliente aunque lo diga con otras palabras, y cierras con la tarea.

## 5. Embeddings, qué son · Conceptos

Un embedding convierte una frase en una lista de números (un vector) de modo que frases con el
mismo sentido quedan **cerca** aunque no compartan palabras: «cuánto está» y «qué precio tiene»
caen juntas. La distancia se mide con el **coseno** entre vectores (1 = iguales, 0 = nada que ver).

El bot de referencia usa **multilingual-e5-small** (≈ 500 MB cuantizado, ≈ 2 ms por mensaje) y
encima una **regresión logística por etiqueta** (precio, talla, envío, pago, despedida…). Las reglas
solas detectaban el 66 % de lo que pedía la clienta; con e5 más la regresión subió a 78 % sobre
frases que ninguna regla había visto. Las reglas se escriben frase a frase; esto generaliza por el
sentido.

La escena 5 usa un embedding **de juguete** (bolsa de palabras y una proyección fija a 2D) para que
veas la intuición: pasa el ratón para ver el coseno, escribe una frase en el buscador y mira las 3
más cercanas. El e5 real tiene 384 dimensiones y aprendió de millones de pares de frases; la idea es
la misma.

**Si falla:** tu frase cae lejos de todo → usa palabras de cliente («cuánto», «envío», «talla»); el juguete no conoce el idioma, solo el vocabulario de la tienda.

## Palabras de hoy · Conceptos

Modelo local · GGUF · Cuantización (Q4_K_M, Q8_0) · Contexto y caché KV · Tokens por segundo ·
Hecho con nombre · Tabla de decisión · Compuerta factual · Delexicalización (`§PRODUCTO_x§`) ·
Embedding · Coseno · Regresión logística · NLI.

## Tareas · Aplicación

- Tarea extra: instala de verdad Qwen3-0.6B con Ollama en tu laptop, mide tokens/s con
  `ollama run qwen3:0.6b --verbose` y anota la RAM de `ollama ps`.
- Publica en el hilo de la sesión una pregunta o una respuesta: ¿qué parte de **tu** bot debería
  decidir el código y cuál el modelo?
- Entrega el repositorio `clase-extra` con `medicion.txt` (la salida de `--verbose`) y
  `EVIDENCIA.md` (tu cifra de tokens/s, tu RAM, el procesador de tu laptop y en qué caso de la
  escena 3 el motor se equivocó). Entrégala desde la tarea extra del LMS (URL + commit).
