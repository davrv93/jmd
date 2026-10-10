---
id: ej-corpus-faq
title: "Tu corpus en faq.json"
summary: El formato exacto del corpus del asistente, cómo probarlo con curl y qué pasa cuando la pregunta no se parece a nada.
tags: [faq, embeddings, edge-ai, curl]
level: básico
lesson: pa-02
order: 10
---
`osito/backend/faq.json` es la memoria de tu dominio y el respaldo del asistente cuando Ollama no
está. Es una lista JSON: cada entrada tiene varias formas de la misma pregunta, una respuesta y
un ánimo.

## 1. El formato exacto

```json
[
  {
    "preguntas": [
      "cuál es el horario",
      "a qué hora abren",
      "hasta qué hora atienden",
      "atienden los domingos"
    ],
    "respuesta": "Atendemos de lunes a sábado de 9 de la mañana a 8 de la noche. Los domingos abrimos de 10 a 2.",
    "animo": "feliz"
  },
  {
    "preguntas": [
      "hacen envíos",
      "entregan a domicilio",
      "cuánto cuesta el envío",
      "cuánto demora el delivery"
    ],
    "respuesta": "Sí. El envío dentro de la ciudad cuesta 8 soles y llega el mismo día si pides antes de las 4 de la tarde. Fuera de la ciudad demora de 2 a 3 días.",
    "animo": "emocionado"
  }
]
```

| Campo | Qué va | Reglas |
|---|---|---|
| `preguntas` | Lista de 3 o 4 formas de preguntar lo mismo | Con palabras distintas. Con y sin tilde. Como habla la gente, no como escribe un manual |
| `respuesta` | Lo que dice el asistente, en voz y en subtítulo | Dos o tres frases. Concreta: cifras, horarios, condiciones |
| `animo` | Cómo se pone el avatar al responder | Uno de `feliz`, `pensando`, `sorprendido`, `triste`, `emocionado`, `neutral` |

Comprueba que el archivo carga antes de arrancar nada:

```bash
python3 -c "import json; d=json.load(open('osito/backend/faq.json')); print(len(d), 'entradas')"
```

Si imprime un error de JSON, casi siempre es una coma de más después del último elemento o una
comilla sin cerrar.

## 2. Arranca con la FAQ forzada

El backend intenta primero Ollama y solo cae a la FAQ si no responde. Para probar **tu corpus**
sin que el modelo responda por su cuenta, apunta Ollama a un puerto que no existe:

```bash
cd taller-agentico
OSITO_OLLAMA_URL=http://localhost:1 bash osito/arrancar.sh
```

El corpus se carga una sola vez, al primer uso. **Si cambias `faq.json`, reinicia el servidor.**

## 3. Prueba con curl

```bash
curl -s -X POST http://localhost:8765/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"mensaje": "oye, ¿hasta qué hora están abiertos?", "historial": []}'
```

Respuesta esperada:

```json
{"texto": "Atendemos de lunes a sábado de 9 de la mañana a 8 de la noche. Los domingos abrimos de 10 a 2.", "animo": "feliz", "fuente": "faq"}
```

Fíjate en dos cosas. La pregunta no es ninguna de las cuatro que escribiste, pero **se parece**:
eso es lo que hacen los embeddings (convierten cada frase en una lista de números y comparan la
distancia). Y `fuente: "faq"` confirma que respondió el corpus, no Ollama.

En el log del backend verás la comparación con su puntaje:

```text
INFO osito.motores: faq: 'oye, ¿hasta qué hora están abiertos?' -> 'hasta qué hora atienden' (0.741)
INFO osito: POST /api/chat -> 200 en 38 ms
```

## 4. Qué pasa bajo el umbral

Pregunta algo que no está en el corpus:

```bash
curl -s -X POST http://localhost:8765/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"mensaje": "¿venden repuestos de bicicleta?", "historial": []}'
```

```json
{"texto": "No estoy seguro de eso todavia. Me lo explicas de otra forma?", "animo": "pensando", "fuente": "faq"}
```

La similitud con la mejor entrada quedó por debajo del **umbral** (0,55 por defecto, variable
`OSITO_FAQ_UMBRAL`). Esto **no es un error**: es el asistente negándose a inventar. Con el modelo
de embeddings que usamos, los aciertos reales dan entre 0,60 y 0,82; por eso el umbral es 0,55.

| Si ves | Significa | Qué hacer |
|---|---|---|
| Acierto con puntaje 0,70 o más | La pregunta se parece mucho a una de tus formas | Nada. Así debe ser |
| Acierto con puntaje entre 0,55 y 0,60 | Acertó por poco | Añade esa forma de preguntar a la entrada |
| «No estoy seguro» en una pregunta que sí está | Tus formas no se parecen a cómo pregunta la gente | Añade formas más coloquiales. No bajes el umbral: empezará a acertar mal |
| Respuesta de otra entrada | Dos entradas tienen preguntas demasiado parecidas | Separa los temas o une las dos entradas |

## 5. Vuelve a encender Ollama

Cuando el corpus responde bien, arranca normal (`bash osito/arrancar.sh`). Ahora `/api/chat`
responde con Ollama (`fuente: "ollama"`) y el corpus queda de respaldo. Si Ollama inventa cosas
fuera de tu dominio, es tema del system prompt del modelo, no del corpus.

## Comprobaciones

- Con la FAQ forzada, tus 10 preguntas nuevas responden con `fuente: "faq"` y la respuesta
  correcta.
- Una pregunta ajena al dominio devuelve «No estoy seguro de eso todavia».
- `python3 -c "import json; json.load(open('osito/backend/faq.json'))"` no imprime nada (sin
  errores).
