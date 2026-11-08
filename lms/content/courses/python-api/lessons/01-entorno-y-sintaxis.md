---
id: py-01
title: "Clase 1 · Entorno profesional y sintaxis esencial"
starts_at: 2026-11-12T19:30:00-05:00
published: true
objectives:
  - {id: py-01-o1, title: "Instalar y cambiar entre varias versiones de Python"}
  - {id: py-01-o2, title: "Crear un entorno virtual (venv) y fijar dependencias en requirements.txt"}
  - {id: py-01-o3, title: "Escribir programas con variables, condicionales, bucles y funciones"}
  - {id: py-01-o4, title: "Correr el mismo script en python:3.11 y python:3.13 con Docker"}
materials:
  - id: py-01-video
    title: "Video: tu entorno de Python en un minuto"
    kind: file
    file: materials/video-py-01.mp4
    objective_ids: [py-01-o1, py-01-o2, py-01-o4]
  - id: py-01-m1
    title: Descargar Python (python.org)
    kind: link
    url: https://www.python.org/downloads/
    objective_ids: [py-01-o1]
  - id: py-01-m2
    title: pyenv · varias versiones en macOS y Linux
    kind: repo
    url: https://github.com/pyenv/pyenv
    objective_ids: [py-01-o1]
  - id: py-01-m3
    title: El lanzador py de Windows (documentación oficial)
    kind: doc
    url: https://docs.python.org/es/3/using/windows.html
    objective_ids: [py-01-o1]
  - id: py-01-m4
    title: venv · entornos virtuales (documentación oficial)
    kind: doc
    url: https://docs.python.org/es/3/library/venv.html
    objective_ids: [py-01-o2]
  - id: py-01-m5
    title: El tutorial oficial de Python en español
    kind: doc
    url: https://docs.python.org/es/3/tutorial/
    objective_ids: [py-01-o3]
  - id: py-01-m6
    title: Descargar Docker Desktop
    kind: link
    url: https://www.docker.com/products/docker-desktop/
    objective_ids: [py-01-o4]
  - id: py-01-m7
    title: Imagen oficial de Python en Docker Hub
    kind: link
    url: https://hub.docker.com/_/python
    objective_ids: [py-01-o4]
cycle:
  - id: ver
    title: Ver la clase
    tool: zoom
    phase: experiencia
    description: Asiste en vivo o mira la grabación con la terminal abierta para ir haciendo lo mismo.
    check: Has visto la clase completa (o la grabación)
  - id: instalar
    title: Instalar Python 3
    tool: terminal
    phase: experiencia
    description: Instala Python 3 para tu sistema (Windows, macOS o Linux) y pega en el LIVE lo que imprime la versión.
    check: python --version (en Windows, py --version) imprime Python 3.x
  - id: hola
    title: Tu primer script
    tool: terminal
    phase: experiencia
    description: Prueba la consola interactiva (>>>), crea hola.py con un f-string y córrelo.
    check: python hola.py imprime tu saludo y la versión
  - id: versiones
    title: Varias versiones de Python
    tool: terminal
    phase: conceptualizacion
    description: Instala Python 3.11 junto a tu 3.13 y elige una por carpeta (pyenv en macOS y Linux, el lanzador py en Windows).
    check: pyenv versions (o py -0p) muestra las dos versiones
  - id: venv
    title: Entorno virtual y requirements.txt
    tool: terminal
    phase: conceptualizacion
    description: Crea .venv en tu proyecto, actívalo, instala requests y fija las dependencias en requirements.txt.
    check: Ves (.venv) en el prompt y requirements.txt tiene la línea requests==…
  - id: sintaxis
    title: Sintaxis esencial
    tool: lms
    phase: conceptualizacion
    description: Tipos, f-strings, if, bucles, funciones y try / except. Predice qué imprime cada bloque antes de ver la respuesta.
    check: Votaste en los «¿Qué imprime?» del LIVE
  - id: juego
    title: Jugar «Fábrica Python»
    tool: lms
    phase: conceptualizacion
    description: Con tu robot, lleva bloques de código a los talleres y arma con la clase programas, comandos de venv y Dockerfiles que corren, línea por línea. Al final publica en el muro qué bug te cazó y cómo lo reconoces ahora.
    check: Tu reflexión aparece en el muro del juego
  - id: docker
    title: El mismo script en 3.11 y 3.13 con Docker
    tool: docker
    phase: experimentacion
    description: Corre hola.py en las imágenes python:3.11 y python:3.13 sin instalar nada más, y arma un Dockerfile mínimo.
    check: Ves «Soy Python 3.11…» y «Soy Python 3.13…»
  - id: reto
    title: "Reto: tu recibo"
    tool: terminal
    phase: experimentacion
    description: Escribe recibo.py con una función, un bucle y try / except, y córrelo dentro de tu venv.
    check: python recibo.py imprime el total y no se cae con un dato malo
  - id: preguntar
    title: Preguntar o responder
    tool: lms
    phase: reflexion
    description: Publica una duda sobre la clase en el muro del LIVE o en el hilo de la sesión, o responde la de un compañero.
    check: Tu pregunta aparece en el muro o en el hilo
---
## Clase 1 · Entorno profesional y sintaxis esencial

**Jueves 12 de noviembre, 7:30 – 9:30 pm.**

- **Varias versiones de Python:** por qué un proyecto pide 3.11 y otro 3.13; `pyenv` (macOS y Linux) o el lanzador `py` (Windows).
- **Entornos virtuales:** `python -m venv .venv`, `pip` y `requirements.txt`.
- **Sintaxis esencial:** tipos, `f-strings`, `if`, bucles, funciones y `try / except`.
- **Docker:** imagen, contenedor y un `Dockerfile` mínimo para tu primer script.

**Antes de la clase:** instala Python 3 y Docker Desktop.
