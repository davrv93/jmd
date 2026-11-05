---
id: bwb-01
title: "Sesión 1 · Modelo local: tu bot sin API ni cuota"
published: true
starts_at: 2026-11-15T19:30:00-05:00
objectives:
  - id: bwb-01-o1
    title: Instalar un modelo de lenguaje local, elegir cuantización y contexto, y calcular la RAM que necesita
  - id: bwb-01-o2
    title: Medir tokens por segundo en CPU y GPU
recording:
  url: ""
  passcode: ""
repo:
  url: https://github.com/davrv93/jmd
  ref: main
materials:
  - id: bwb-01-m1
    title: Ollama · descargar e instalar (Windows, macOS, Linux)
    kind: link
    url: https://ollama.com/download
    objective_ids: [bwb-01-o1]
  - id: bwb-01-m2
    title: Qwen3 en Ollama (0.6B, 1.7B, 4B y sus cuantizaciones)
    kind: link
    url: https://ollama.com/library/qwen3
    objective_ids: [bwb-01-o1]
  - id: bwb-01-m3
    title: llama.cpp · el motor que corre los GGUF en CPU y GPU
    kind: repo
    url: https://github.com/ggml-org/llama.cpp
    objective_ids: [bwb-01-o1]
cycle:
  - id: ver
    title: Ver la clase
    tool: zoom
    phase: experiencia
    description: Asiste en vivo o mira la grabación. Abre el modo LIVE de esta sesión para tocar las escenas.
    check: Has visto la clase completa (o la grabación)
  - id: instalar
    title: Instalar un modelo local
    tool: terminal
    phase: experiencia
    description: Primero en el simulador de la escena 2 (modelo, cuantización, contexto, RAM); luego de verdad con Ollama en tu laptop.
    check: ollama run qwen3:0.6b "hola" responde
  - id: medir
    title: Medir tokens por segundo
    tool: terminal
    phase: reflexion
    description: Corre el modelo con --verbose, anota eval rate y la RAM de ollama ps, y compáralo con las curvas de la escena 4.
    check: Tienes tu cifra de tokens/s y de RAM anotada
---

## Avance de la sesión

Un bot «avanzado» no es un modelo más grande, sino tres piezas que trabajan juntas: un **modelo local**, un **motor de decisiones** y una **comprensión entrenada** con embeddings. Hoy, en 45 minutos, ves la primera: un modelo que corre en tu máquina.

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
