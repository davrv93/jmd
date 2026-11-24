---
id: g9-tarea-02
title: "Tarea 2 · Tu chatbot web responde con tu FAQ"
lesson: g9-02
due_at: 2026-12-11T23:59:00-05:00
max_score: 20
autograde: false
objective_ids: [g9-02-o1, g9-02-o3]
rubric:
  - criterion: "`faq.json` bien escrito (JSON válido, 10+ entradas, 3–4 variantes por pregunta, respuestas cortas y concretas)"
    levels:
      - {title: No entregado o el JSON no carga, points: 0}
      - {title: Parcial (pocas entradas/variantes o respuestas vagas), points: 4}
      - {title: Completo (10+ entradas, variantes reales y respuestas verificables), points: 8}
  - criterion: 3 pruebas en la web con captura (FAQ, fuera del FAQ y con faltas de ortografía)
    levels:
      - {title: Sin capturas, points: 0}
      - {title: Parcial (faltan capturas o no se ve el comportamiento esperado), points: 4}
      - {title: "Completo (3 capturas: una del FAQ, una fuera del FAQ con «no sé» + WhatsApp y una con faltas)", points: 8}
  - criterion: Medición y reflexión (tiempos + 3 hallazgos)
    levels:
      - {title: No hay, points: 0}
      - {title: Superficial, points: 2}
      - {title: Concreta (3 tiempos y 3 hallazgos o ajustes propuestos), points: 4}
---

## Fase del ciclo · Aplicación

Esta tarea cierra el ciclo de la clase 2: es la **aplicación** (dejar tu chatbot web funcionando) y la **reflexión** (probarlo con gente real y medir).

## Qué entregar

Un repositorio git (GitHub, GitLab o Forgejo, público o con acceso para el instructor) llamado
`clase-02`, con:

1. **`faq.json`**: la FAQ de tu negocio con **10+ entradas**. Reglas: tres o cuatro variantes por pregunta (palabras distintas, con y sin tilde) y respuestas cortas (1–2 frases), concretas y sin inventar. El archivo debe cargar sin error:

   ```bash
   python3 -c "import json; d=json.load(open('faq.json')); print(len(d), 'entradas')"
   ```

2. **`capturas/`** con **3 capturas de pantalla** del chatbot web:

   - (1) una pregunta del FAQ → responde con el texto del FAQ;
   - (2) una pregunta fuera del FAQ → debe decir que no sabe y ofrecer WhatsApp;
   - (3) una pregunta con faltas de ortografía → responde bien (o explica que no entiende) sin inventar.

   Nómbralas `01.png`, `02.png`, `03.png`.

3. **`REFLEXION.md`** (5–10 líneas): 3 tiempos medidos (desde “Enviar” hasta respuesta) y 3 hallazgos o ajustes que harás en tu FAQ/widget/backend.

## Cómo entregar

- Desde el LMS: en esta tarea, pega la URL del repositorio y el SHA del commit.

Se califica el commit exacto que entregues; si subes cambios después, vuelve a entregar.
