---
id: py-02
title: "Clase 2 · Estructuras de datos y tu API con FastAPI"
starts_at: 2026-11-19T19:30:00-05:00
published: true
objectives:
  - {id: py-02-o1, title: "Elegir entre list, tuple, dict y set según el problema"}
  - {id: py-02-o2, title: "Escribir la misma tarea con for y con list comprehension, y medirlas con timeit"}
  - {id: py-02-o3, title: "Crear una API con FastAPI y modelos Pydantic"}
  - {id: py-02-o4, title: "Probar y documentar la API en Swagger (/docs)"}
materials:
  - id: py-02-m1
    title: "Estructuras de datos: listas, tuplas, conjuntos y diccionarios (tutorial oficial de Python)"
    kind: doc
    url: https://docs.python.org/es/3/tutorial/datastructures.html
    objective_ids: [py-02-o1, py-02-o2]
  - id: py-02-m2
    title: timeit · medir el tiempo de fragmentos pequeños de código (documentación oficial)
    kind: doc
    url: https://docs.python.org/es/3/library/timeit.html
    objective_ids: [py-02-o2]
  - id: py-02-m3
    title: FastAPI · documentación oficial en español
    kind: doc
    url: https://fastapi.tiangolo.com/es/
    objective_ids: [py-02-o3, py-02-o4]
  - id: py-02-m4
    title: "FastAPI · Primeros pasos: tu primera API y la documentación en /docs"
    kind: doc
    url: https://fastapi.tiangolo.com/es/tutorial/first-steps/
    objective_ids: [py-02-o3, py-02-o4]
  - id: py-02-m5
    title: FastAPI · Manejo de errores (HTTPException y el 404)
    kind: doc
    url: https://fastapi.tiangolo.com/es/tutorial/handling-errors/
    objective_ids: [py-02-o3]
  - id: py-02-m6
    title: Pydantic · modelos (BaseModel y validación de datos)
    kind: doc
    url: https://docs.pydantic.dev/latest/concepts/models/
    objective_ids: [py-02-o3]
cycle:
  - id: ver
    title: Ver la clase
    tool: zoom
    phase: experiencia
    description: Asiste en vivo o mira la grabación con el editor y la terminal abiertos para ir haciendo lo mismo.
    check: Has visto la clase completa (o la grabación)
  - id: estructuras
    title: ¿Qué estructura uso?
    tool: lms
    phase: experiencia
    description: Elige entre list, tuple, dict y set para situaciones reales de un inventario y lee por qué conviene cada una.
    check: Votaste en las preguntas «¿Qué estructura usas?» del LIVE
  - id: comprehension
    title: Laboratorio de comprehension y timeit
    tool: lms
    phase: conceptualizacion
    description: En el laboratorio del navegador arma tu inventario como lista de dicts, pasa un for a list comprehension, filtra con if, crea un dict comprehension y mide con timeit.
    check: Resolviste al menos 6 de los 8 ejercicios del laboratorio
  - id: fastapi
    title: Tu API con FastAPI
    tool: terminal
    phase: experimentacion
    description: En un venv nuevo instala fastapi[standard], escribe main.py con el modelo Producto y las rutas GET, POST, PUT y DELETE, y levántala con fastapi dev.
    check: fastapi dev main.py corre y http://127.0.0.1:8000/docs muestra tus 5 rutas
  - id: swagger
    title: CRUD en /docs
    tool: navegador
    phase: experimentacion
    description: En Swagger, con «Try it out», crea dos productos, lístalos, edita uno, borra otro y manda un dato malo para leer el 422.
    check: Viste el 201, el 204 y el 422 con su detail
  - id: reto
    title: "Reto: bajo stock y categorías"
    tool: terminal
    phase: experimentacion
    description: Agrega GET /productos/bajo-stock?limite=5 con una list comprehension y GET /categorias con un set ordenado.
    check: /productos/bajo-stock y /categorias responden 200 en /docs
  - id: preguntar
    title: Preguntar o responder
    tool: lms
    phase: reflexion
    description: Publica una duda sobre la clase en el muro del LIVE o en el hilo de la sesión, o responde la de un compañero.
    check: Tu pregunta aparece en el muro o en el hilo
---
## Clase 2 · Estructuras de datos y tu API con FastAPI

**Jueves 19 de noviembre, 7:30 – 9:30 pm.**

- **Estructuras de datos:** `list`, `tuple`, `dict` y `set`, y cuándo conviene cada una.
- **for vs list comprehension:** la misma tarea de las dos formas, medida con `timeit`; cuándo volver al `for` por legibilidad.
- **FastAPI:** rutas `GET`, `POST`, `PUT` y `DELETE`, parámetros y validación con Pydantic.
- **Swagger:** la API se documenta sola en `/docs`.

Te llevas tu API de inventario en FastAPI.
