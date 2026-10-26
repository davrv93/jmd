---
id: bwa-01
title: "Clase 1 · El bot avanzado: modelo local, motor de decisiones y embeddings"
published: true
starts_at: 2026-10-25T21:30:00-05:00
objectives:
  - id: bwa-01-o1
    title: Instalar un modelo de lenguaje local, elegir cuantización y contexto, y calcular la RAM que necesita
  - id: bwa-01-o2
    title: Explicar por qué el código decide y el modelo solo redacta, y leer una tabla de decisión con hechos y acciones
  - id: bwa-01-o3
    title: Medir tokens por segundo en CPU y GPU y entender qué son los embeddings y para qué sirven en un bot
recording:
  url: ""
  passcode: ""
repo:
  url: https://github.com/davrv93/jmd
  ref: main
materials:
  - id: bwa-01-m1
    title: Ollama · descargar e instalar (Windows, macOS, Linux)
    kind: link
    url: https://ollama.com/download
    objective_ids: [bwa-01-o1, bwa-01-o3]
  - id: bwa-01-m2
    title: Qwen3 en Ollama (0.6B, 1.7B, 4B y sus cuantizaciones)
    kind: link
    url: https://ollama.com/library/qwen3
    objective_ids: [bwa-01-o1]
  - id: bwa-01-m3
    title: llama.cpp · el motor que corre los GGUF en CPU y GPU
    kind: repo
    url: https://github.com/ggml-org/llama.cpp
    objective_ids: [bwa-01-o1, bwa-01-o3]
  - id: bwa-01-m4
    title: multilingual-e5-small · el modelo de embeddings del bot de referencia
    kind: doc
    url: https://huggingface.co/intfloat/multilingual-e5-small
    objective_ids: [bwa-01-o3]
  - id: bwa-01-m5
    title: LettuceDetect · detector de alucinaciones (verifica si una frase se apoya en el contexto)
    kind: repo
    url: https://github.com/KRLabsOrg/LettuceDetect
    objective_ids: [bwa-01-o2]
  - id: bwa-01-m6
    title: scikit-learn · regresión logística (la que clasifica sobre los embeddings)
    kind: doc
    url: https://scikit-learn.org/stable/modules/generated/sklearn.linear_model.LogisticRegression.html
    objective_ids: [bwa-01-o3]
cycle:
  - id: ver
    title: Ver la clase
    tool: zoom
    phase: experiencia
    description: Asiste en vivo o mira la grabación. Abre el modo LIVE de esta sesión para tocar las seis escenas.
    check: Has visto la clase completa (o la grabación)
  - id: instalar
    title: Instalar un modelo local
    tool: terminal
    phase: experiencia
    description: Primero en el simulador de la escena 2 (modelo, cuantización, contexto, RAM); luego de verdad con Ollama en tu laptop.
    check: ollama run qwen3:0.6b "hola" responde
  - id: motor
    title: Leer la tabla de decisión
    tool: lms
    phase: conceptualizacion
    description: En la escena 3 resuelve al menos 8 casos aleatorios y marca si el motor decidió bien. Compara «sin motor» y «con motor».
    check: Acuerdo con el criterio del instructor de 80 % o más
  - id: medir
    title: Medir tokens por segundo
    tool: terminal
    phase: reflexion
    description: Corre el modelo con --verbose, anota eval rate y la RAM de ollama ps, y compáralo con las curvas de la escena 4.
    check: Tienes tu cifra de tokens/s y de RAM anotada
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

## Avance de la clase

Tu chatbot de la clase 3 responde con un modelo. Hoy ves por qué un bot «avanzado» no es un modelo
más grande, sino tres piezas que trabajan juntas: un **modelo local** que corre en tu máquina, un
**motor de decisiones** que decide qué se hace con cada mensaje (el código, no el modelo), y una
**comprensión entrenada** con embeddings que entiende lo que pide el cliente aunque lo diga con otras
palabras. Casi todo es en el modo LIVE: seis escenas para tocar, con casos aleatorios.

Esta clase es extra: el instructor la publica cuando el grupo ya tiene su bot funcionando. Si algo
falla, pega el error completo en el hilo de la sesión y sigue con el siguiente bloque.

| Bloque | Qué haces | Comprobación |
|---|---|---|
| 1 · Tres piezas | Entender qué hace cada pieza y qué pasa si falta | Nombras las tres sin mirar |
| 2 · Modelo local | Instalar en el simulador y luego con Ollama | `ollama run qwen3:0.6b "hola"` responde |
| 3 · Motor | Resolver 8 casos de la tabla de decisión | Acuerdo ≥ 80 % con el criterio |
| 4 · CPU y GPU | Medir tokens/s y RAM, leer las curvas | `eval rate` y `ollama ps` anotados |
| 5 · Embeddings | Buscar frases parecidas en el plano | Tus 3 frases marcan vecinas con sentido |
| 6 · Tarea | Pregunta en el hilo y entrega | La entrega aparece en «Mis notas» |

## 1. Tres piezas, no un modelo más grande · Conceptos

El bot de referencia de esta clase (un agente de ventas por WhatsApp) empezó con un modelo
redactando las respuestas. Medido: inventó tallas, se equivocó de nombre y acusaba peor que una
plantilla. De ahí la regla que manda en todo lo de hoy: **los modelos proponen, el código decide.**

| Pieza | Qué hace | Qué NO hace |
|---|---|---|
| **Modelo local** | Corre en tu CPU o GPU, sin API ni cuota. Redacta o elige entre variantes | No decide precios, stock ni a quién derivar |
| **Motor de decisiones** | Lee el mensaje una vez, saca **hechos con nombre** y aplica una **tabla**: fila que dispara → acción | No improvisa: lo que no está en la tabla pasa a una persona |
| **Comprensión (embeddings)** | Convierte la frase en un vector; una regresión logística dice qué pide (precio, envío, talla…) | No redacta nada; solo etiqueta |

En la escena 1 apaga cada pieza y mira qué se rompe.

**Si falla:** no te abre el modo LIVE → recarga la sesión; las escenas se cargan al entrar.

## 2. Instala un modelo local · Experiencia

Primero en el simulador (escena 2): elige modelo, cuantización, contexto y hilos, y mira la RAM
calculada al vuelo: **pesos × bytes por parámetro + caché de contexto + unos 250 MB del motor**.
Qwen3-0.6B en Q8_0 con 4k de contexto da ≈ 1,3 GB, que es lo medido en el servidor de clase.
Luego hazlo de verdad:

1. Instala Ollama desde Materiales (Windows: instalador; macOS y Linux: el script).
2. Baja el modelo pequeño y pruébalo:
   ```bash
   ollama pull qwen3:0.6b
   ollama run qwen3:0.6b "hola, ¿qué eres?"
   ```
3. Si tu laptop tiene 8 GB o más, prueba también `qwen3:1.7b` (Q4_K_M, ≈ 1,1 GB de pesos).

Las tres variantes **JEV** del taller no son modelos distintos: son el mismo Qwen3 con un trabajo
acotado. *Decisión* clasifica la intención y propone una de cuatro acciones (no redacta).
*Realizador* elige entre variantes de plantilla o reescribe conservando los tokens `§PRODUCTO_x§`
(nunca inventa un hecho). *Verificador* es un NLI más un detector tipo LettuceDetect: dice si cada
frase se apoya en los datos.

**Si falla:** «could not connect to ollama» → abre la app de Ollama o corre `ollama serve` en otra terminal.

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

## 4. CPU y GPU, medidos · Reflexión

El servidor de la clase no tiene GPU: 2 vCPU y 2 GiB de RAM. Lo medido ahí con llama.cpp:
**Qwen3-0.6B Q8_0 ≈ 14 tokens/s generando, ≈ 120 tokens/s leyendo el prompt, 1,3 a 1,5 GB de RAM.**
Un 1.7B Q4 en esa CPU anda por 6 a 8 tokens/s; el mismo 1.7B en una RTX 3050 de 4 GB, entre 40 y
60. Son cifras aproximadas: en tu laptop cambian con la RAM, el disco y lo que tengas abierto.

1. Mide la tuya:
   ```bash
   ollama run qwen3:0.6b --verbose "Cuenta hasta veinte en palabras"
   ollama ps
   ```
   Anota `eval rate` (tokens/s generando), `prompt eval rate` y la columna SIZE de `ollama ps`.
2. En la escena 4 mueve modelo, cuantización, contexto y alumnos a la vez. Prueba los casos
   «llegan 8 alumnos» y «mensaje de 2.000 tokens»: en CPU los mensajes **hacen cola** y la latencia
   del último se multiplica. Activa «con motor de decisiones» y mira cuántas llamadas al modelo se
   ahorran: la mayoría de los turnos se resuelven con plantilla y catálogo, sin modelo.

**Si falla:** `eval rate` sale por debajo de 5 tokens/s → cierra el navegador y vuelve a medir; si sigue, usa `qwen3:0.6b` en Q4.

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
