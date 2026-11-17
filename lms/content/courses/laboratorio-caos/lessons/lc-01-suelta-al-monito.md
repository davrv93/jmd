---
id: lc-01
starts_at: 2026-11-17T19:30:00-05:00
duration: 90
title: "Suelta al monito: ataca, cae y recupérate"
published: true
objectives:
  - id: lc-01-o1
    title: Explicar qué es la ingeniería del caos y por qué Netflix soltaba un mono en sus servidores
  - id: lc-01-o2
    title: Diagnosticar un servidor caído con un health check y curar cuatro fallas típicas (app apagada, disco lleno, base borrada y app atascada)
  - id: lc-01-o3
    title: Restaurar una base desde un respaldo y comprobar que el sistema volvió a estar sano
recording:
  url: ""
  passcode: ""
materials: []
cycle:
  - id: ver
    tool: zoom
    phase: experiencia
    description: Asiste al LIVE o mira la grabación.
    check: Viste la arena completa
  - id: arena
    tool: lms
    phase: experimentacion
    description: Elige tu equipo en la arena; si eres Monito Server, cura tu servidor con botones y con DeepSeek Harness.
    check: Tu equipo jugó al menos dos rondas
---

# Suelta al monito

Un laboratorio por turnos. El equipo **Monito Tumba Server** ataca y el equipo **Monito Server** defiende un servidor real que vive en su aula.

1. Entra al LIVE y elige tu equipo en la arena.
2. **Tumba Server:** en tu turno, toca un servidor de la granja y lánzale hasta dos ataques. Tu monito salta la valla.
3. **Server:** en tu turno, cura tu servidor. La app apagada y el disco lleno tienen botón. La base borrada y la app atascada se curan con prompts en DeepSeek Harness, que usa la skill `monito-server`.
4. Al final de cada defensa el LMS revisa la salud de cada servidor (`/salud`): cada uno en pie suma 100 al equipo Server y cada uno caído suma 100 al equipo Tumba.

Tu servidor queda en `/trabajo/monito`: puedes abrirlo con `curl -s http://127.0.0.1:7070/salud` desde la terminal del aula.
