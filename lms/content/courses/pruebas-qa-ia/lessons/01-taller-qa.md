---
id: qa-01
title: "Taller · Pruebas E2E con IA, Page Object Model y monitoreo"
published: true
starts_at: 2026-11-01T09:00:00-05:00
objectives:
  - id: qa-01-o1
    title: Escribir pruebas E2E con Playwright siguiendo el patrón Page Object Model, con ayuda de la IA
  - id: qa-01-o2
    title: Correr las pruebas en navegadores sin interfaz (Chromium, Lightpanda y Obscura)
  - id: qa-01-o3
    title: Publicar un portal de resultados y monitorear la disponibilidad con alertas en Grafana
recording:
  url: ""
  passcode: ""
materials:
  - id: qa-01-m1
    title: Playwright · documentación oficial
    kind: doc
    url: https://playwright.dev/docs/intro
    objective_ids: [qa-01-o1]
  - id: qa-01-m2
    title: Page Object Model en Playwright
    kind: doc
    url: https://playwright.dev/docs/pom
    objective_ids: [qa-01-o1]
  - id: qa-01-m3
    title: Lightpanda · navegador sin interfaz
    kind: repo
    url: https://github.com/lightpanda-io/browser
    objective_ids: [qa-01-o2]
  - id: qa-01-m4
    title: Grafana · documentación
    kind: doc
    url: https://grafana.com/docs/grafana/latest/
    objective_ids: [qa-01-o3]
cycle:
  - id: ver
    title: Ver el taller
    tool: zoom
    phase: experiencia
    description: Asiste en vivo o mira la grabación.
    check: Has visto el taller completo (o la grabación)
  - id: pruebas
    title: Tus primeras pruebas E2E
    tool: terminal
    phase: experimentacion
    description: Escribe con la IA una prueba de login y otra de un formulario usando Page Object Model, y córrelas sin interfaz.
    check: Las dos pruebas pasan en verde
  - id: monitoreo
    title: Monitoreo y alertas
    tool: lms
    phase: reflexion
    description: Conecta tus resultados al dashboard y define qué caída debe disparar una alerta.
    check: Tu dashboard muestra el estado y tienes una alerta configurada
---

# Agenda del taller (hora de Lima)

- **9:00** · QA con IA y el patrón Page Object Model
- **9:45** · Tus primeras pruebas E2E con Playwright
- **10:30** · Navegadores sin interfaz: Chromium, Lightpanda y Obscura
- **11:15** · Portal de resultados y reproducción paso a paso
- **12:00** · Monitoreo: dashboard de estado, disponibilidad y alertas
- **12:45** · Cierre, certificado e insignia
