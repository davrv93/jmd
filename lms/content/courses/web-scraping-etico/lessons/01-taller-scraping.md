---
id: ws-01
title: "Taller · Scraping ético en el navegador y en el servidor"
published: true
starts_at: 2026-11-08T15:00:00-05:00
objectives:
  - id: ws-01-o1
    title: Decidir qué se puede extraer y cómo, leyendo robots.txt, los términos de uso y los límites del sitio
  - id: ws-01-o2
    title: Extraer datos mientras navegas con un script de Tampermonkey
  - id: ws-01-o3
    title: Extraer con Python en un servidor EC2 usando sesión (cookie y token) y exportar a CSV y JSON
recording:
  url: ""
  passcode: ""
materials:
  - id: ws-01-m1
    title: Tampermonkey · extensión para scripts en el navegador
    kind: link
    url: https://www.tampermonkey.net/
    objective_ids: [ws-01-o2]
  - id: ws-01-m2
    title: robots.txt · cómo funciona (Google Search Central)
    kind: doc
    url: https://developers.google.com/search/docs/crawling-indexing/robots/intro
    objective_ids: [ws-01-o1]
  - id: ws-01-m3
    title: Requests · la librería HTTP de Python
    kind: doc
    url: https://requests.readthedocs.io/
    objective_ids: [ws-01-o3]
cycle:
  - id: ver
    title: Ver el taller
    tool: zoom
    phase: experiencia
    description: Asiste en vivo o mira la grabación.
    check: Has visto el taller completo (o la grabación)
  - id: reglas
    title: Revisar las reglas del sitio
    tool: lms
    phase: reflexion
    description: Antes de extraer, lee el robots.txt y los términos del sitio que elegiste y anota qué está permitido.
    check: Tienes anotado qué se puede extraer y a qué ritmo
  - id: extraer
    title: Extraer y exportar
    tool: terminal
    phase: experimentacion
    description: Extrae una lista con paginación, pausas y reintentos, y expórtala a CSV y JSON.
    check: Tu CSV y tu JSON abren limpios y sin filas repetidas
---

# Agenda del taller (hora de Lima)

- **3:00** · Scraping ético: robots.txt, términos de uso y límites
- **3:30** · Tampermonkey y scripts en el navegador
- **4:15** · Python en EC2: sesión, cookies y token en la cabecera
- **5:00** · Limpiar y exportar: CSV y JSON; casos reales
- **5:40** · Cierre, certificado e insignia
