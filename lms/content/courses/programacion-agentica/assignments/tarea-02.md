---
id: tarea-02
title: "Tarea 2 · Amplía el corpus de tu asistente y pruébalo por voz"
lesson: pa-02
due_at: 2026-10-22T23:59:00-05:00
max_score: 20
autograde: false
objective_ids: [pa-02-o3, pa-02-o4]
rubric:
  - criterion: 10 pares nuevos en `faq.json` bien escritos (JSON válido, 3 o 4 formas por pregunta, respuesta de 2 o 3 frases, ánimo válido)
    levels:
      - {title: No entregado o el JSON no carga, points: 0}
      - {title: Parcial (menos de 10 pares, una sola forma por pregunta o respuestas vagas), points: 4}
      - {title: Completo (10 pares, variantes reales de cada pregunta y respuestas concretas del dominio), points: 8}
  - criterion: 3 pruebas por voz con captura (micrófono, texto transcrito visible y respuesta del asistente)
    levels:
      - {title: Sin capturas, points: 0}
      - {title: Parcial (menos de 3, o no se ve la transcripción, o se escribió por teclado), points: 4}
      - {title: Completo (3 capturas con transcripción y respuesta, y se indica si la transcripción fue exacta), points: 8}
  - criterion: Reflexión de 5 líneas (qué entendió el asistente, qué no, y por qué)
    levels:
      - {title: No hay, points: 0}
      - {title: Superficial («funcionó bien»), points: 2}
      - {title: Concreta, con ejemplos de lo que pasó, points: 4}
---

## Qué entregar

Un repositorio git (GitHub, GitLab o Forgejo, público o con acceso para el instructor) llamado
`clase-02`, con:

1. **`faq.json`**: el corpus de tu asistente con **10 pares nuevos** de pregunta y respuesta de
   tu dominio (una tienda, un servicio, una oficina de atención al cliente, lo que elegiste en
   clase). Cada entrada sigue el formato del taller:

   ```json
   {
     "preguntas": ["cuál es el horario", "a qué hora abren", "hasta qué hora atienden"],
     "respuesta": "Atendemos de lunes a sábado de 9 de la mañana a 8 de la noche.",
     "animo": "feliz"
   }
   ```

   Reglas: tres o cuatro formas de cada pregunta (con palabras distintas, con y sin tilde);
   respuesta de dos o tres frases, concreta; `animo` entre `feliz`, `pensando`, `sorprendido`,
   `triste`, `emocionado` y `neutral`. El archivo debe cargar sin error:

   ```bash
   python3 -c "import json; d=json.load(open('faq.json')); print(len(d), 'entradas')"
   ```

2. **`capturas/`** con **3 capturas de pantalla**, una por cada pregunta nueva que probaste
   **por voz** (botón del micrófono, no teclado). En cada captura debe verse el texto que
   transcribió whisper y la respuesta del asistente. Nómbralas `01.png`, `02.png`, `03.png`.
   Para que el modelo no responda por su cuenta y la prueba sea de tu corpus, arranca con la
   FAQ forzada:

   ```bash
   OSITO_OLLAMA_URL=http://localhost:1 bash osito/arrancar.sh
   ```

3. **`REFLEXION.md`** (5 líneas): qué entendió bien el asistente, qué no, si whisper transcribió
   exactamente lo que dijiste o cambió alguna palabra, y qué cambiarías en tus preguntas del
   corpus para que acierte más.

## Cómo entregar

- Desde el LMS: en esta tarea, pega la URL del repositorio y el SHA del commit.

Se califica el commit exacto que entregues; si subes cambios después, vuelve a entregar.
