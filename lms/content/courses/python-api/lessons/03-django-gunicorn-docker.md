---
id: py-03
title: "Clase 3 · Django, Gunicorn y despliegue con Docker"
starts_at: 2026-11-26T19:30:00-05:00
published: true
objectives:
  - {id: py-03-o1, title: "Crear un proyecto Django con su modelo, migraciones y panel de administración"}
  - {id: py-03-o2, title: "Exponer la API con Django REST Framework y Swagger (drf-spectacular)"}
  - {id: py-03-o3, title: "Servir FastAPI y Django con Gunicorn"}
  - {id: py-03-o4, title: "Empaquetar las dos APIs con Dockerfile y docker compose"}
materials:
  - id: py-03-m1
    title: "Django · Tutorial, parte 1: tu primer proyecto y app (documentación oficial en español)"
    kind: doc
    url: https://docs.djangoproject.com/es/6.1/intro/tutorial01/
    objective_ids: [py-03-o1]
  - id: py-03-m2
    title: "Django · ¿Qué versión de Python necesito? (preguntas frecuentes de instalación)"
    kind: doc
    url: https://docs.djangoproject.com/es/6.1/faq/install/
    objective_ids: [py-03-o1]
  - id: py-03-m3
    title: "Django · Tutorial, parte 2: modelos, migraciones y el panel de administración"
    kind: doc
    url: https://docs.djangoproject.com/es/6.1/intro/tutorial02/
    objective_ids: [py-03-o1]
  - id: py-03-m4
    title: "Django · Migraciones (documentación oficial)"
    kind: doc
    url: https://docs.djangoproject.com/es/6.1/topics/migrations/
    objective_ids: [py-03-o1]
  - id: py-03-m5
    title: "Django REST Framework · Quickstart"
    kind: doc
    url: https://www.django-rest-framework.org/tutorial/quickstart/
    objective_ids: [py-03-o2]
  - id: py-03-m6
    title: "Django REST Framework · ViewSets y routers"
    kind: doc
    url: https://www.django-rest-framework.org/api-guide/viewsets/
    objective_ids: [py-03-o2]
  - id: py-03-m7
    title: "drf-spectacular · esquema OpenAPI y Swagger UI para DRF"
    kind: doc
    url: https://drf-spectacular.readthedocs.io/en/latest/readme.html
    objective_ids: [py-03-o2]
  - id: py-03-m8
    title: "Django · Cómo usar Django con Gunicorn"
    kind: doc
    url: https://docs.djangoproject.com/es/6.1/howto/deployment/wsgi/gunicorn/
    objective_ids: [py-03-o3]
  - id: py-03-m9
    title: "WhiteNoise · archivos estáticos de Django sin servidor aparte"
    kind: doc
    url: https://whitenoise.readthedocs.io/en/stable/django.html
    objective_ids: [py-03-o3]
  - id: py-03-m10
    title: "FastAPI · Workers del servidor (Uvicorn y Gunicorn)"
    kind: doc
    url: https://fastapi.tiangolo.com/es/deployment/server-workers/
    objective_ids: [py-03-o3]
  - id: py-03-m11
    title: "Docker · Primeros pasos con Docker Compose"
    kind: doc
    url: https://docs.docker.com/compose/gettingstarted/
    objective_ids: [py-03-o4]
cycle:
  - id: ver
    title: Ver la clase
    tool: zoom
    phase: experiencia
    description: Asiste en vivo o mira la grabación con el editor, la terminal y Docker Desktop abiertos para ir haciendo lo mismo.
    check: Has visto la clase completa (o la grabación)
  - id: django
    title: Tu proyecto Django
    tool: terminal
    phase: experimentacion
    description: En un venv nuevo instala Django, crea el proyecto y la app inventario, y levántalo con runserver.
    check: python manage.py runserver corre y http://127.0.0.1:8000/ muestra la página de bienvenida de Django
  - id: admin
    title: Modelo y panel de administración
    tool: terminal
    phase: experimentacion
    description: Escribe el modelo Producto, crea y aplica las migraciones, crea tu superusuario y registra el modelo en el admin.
    check: En /admin/ ves Productos y creaste al menos 3
  - id: drf
    title: Tu API con DRF y Swagger
    tool: terminal
    phase: experimentacion
    description: Instala djangorestframework y drf-spectacular, escribe el serializer, el ViewSet y el router, y prueba el CRUD en /api/docs/.
    check: En /api/docs/ creaste, editaste y borraste un producto (201, 200 y 204)
  - id: servir
    title: Gunicorn y Docker
    tool: terminal
    phase: experimentacion
    description: Sirve las dos APIs con Gunicorn dentro de Docker y levántalas juntas con docker compose.
    check: docker compose up muestra FastAPI en /docs y Django en /api/docs/ al mismo tiempo
  - id: preguntar
    title: Preguntar o responder
    tool: lms
    phase: reflexion
    description: Publica una duda sobre la clase en el muro del LIVE o en el hilo de la sesión, o responde la de un compañero.
    check: Tu pregunta aparece en el muro o en el hilo
---
## Clase 3 · Django, Gunicorn y despliegue con Docker

**Jueves 26 de noviembre, 7:30 – 9:30 pm.**

- **Django:** proyecto, app, modelo `Producto`, migraciones y el panel de administración.
- **API en Django + Swagger:** Django REST Framework y `drf-spectacular`.
- **Gunicorn:** por qué `runserver` no va en producción; workers y el worker de Uvicorn para FastAPI.
- **Docker final:** `Dockerfile` y `docker compose`, y la entrega del proyecto.

**Entregable:** la API de inventario en FastAPI y Django, con Swagger, corriendo en Docker.
El certificado digital (opcional, S/ 15) se entrega a quienes presenten el entregable.
