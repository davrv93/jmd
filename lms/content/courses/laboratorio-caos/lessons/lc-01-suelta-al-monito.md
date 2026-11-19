---
id: lc-01
starts_at: 2026-11-17T19:30:00-05:00
duration: 90
title: "Suelta al monito: ataca, cae y recupérate"
published: true
objectives:
  - id: lc-01-o1
    title: Explicar qué es la ingeniería del caos y por qué Netflix soltaba un mono en sus servidores
  - id: lc-01-o4
    title: Contar cómo llegó Netflix a Chaos Monkey (la caída de 2008, la mudanza a AWS y el Ejército Simio) y qué principios de diseño lo sostienen
  - id: lc-01-o5
    title: Distinguir lo que está documentado sobre sus resultados (las caídas de 2011, 2012 y 2015, evacuar una región en 8 minutos) de lo que nadie publica, como una «tasa de éxito»
  - id: lc-01-o2
    title: Diagnosticar un servidor caído con un health check y curar cuatro fallas típicas (app apagada, disco lleno, base borrada y app atascada)
  - id: lc-01-o3
    title: Restaurar una base desde un respaldo y comprobar que el sistema volvió a estar sano
recording:
  url: "https://us06web.zoom.us/rec/share/iGUxTDF4kiJertcErnmdEw3Du9FpGW5hcp7ByeVSfAS7yilHMOC_pp9BMmu3QsFh.Gg9u9gOojWuAZrE6"
  passcode: "DD9QINC1sqjbDvLSBgAAIAAAAHfLdH8QpA7d9-1MpzohK2IHZDffiHlNnNyLFsLH8MdmyvsDhFl8PUhYS9h5jvuhojAwMDAwNA"
materials:
  - id: lc-01-video-monito
    title: "Video: Suelta al monito, en 15 segundos"
    kind: file
    file: materials/video-lc-01-suelta-al-monito.mp4
  - id: lc-01-video-equipos
    title: "Video: los dos equipos, Tumba Server contra Server"
    kind: file
    file: materials/video-lc-01-equipos.mp4
  - id: lc-01-video-mecanismo
    title: "Video: cómo funciona la arena, turno por turno"
    kind: file
    file: materials/video-lc-01-mecanismo.mp4
  - id: lc-01-video-netflix
    title: "Video: por qué Netflix soltó un mono en sus servidores"
    kind: file
    file: materials/video-lc-01-netflix.mp4
  - id: lc-01-video-jefes
    title: "Video: los jefes de la arena"
    kind: file
    file: materials/video-lc-01-jefes.mp4
  - id: lc-01-video-ema
    title: "Video: Ema, el Rey Mono, y el Ozaru"
    kind: file
    file: materials/video-lc-01-ema-y-el-ozaru.mp4
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

## Antes de jugar: la teoría (16 minutos)

Cinco láminas animadas cuentan de dónde sale el juego. Cada una trae sus fuentes al pie.

- **Fallar seguido.** El ciclo romper, observar, curar y anotar.
- **Cómo lo hizo Netflix.** De los tres días sin enviar DVD en 2008 a la mudanza a AWS, Chaos Monkey y el Ejército Simio.
- **Un experimento con reglas.** Diseñar para fallar (sin estado, redundancia, degradar con gracia, cortacircuitos) y probarlo contra un «estado estable».
- **Antes y después.** Las caídas de AWS de 2011, 2012 y 2015, cómo le fue a Netflix en cada una y los números que sí están publicados.
- **Lo que dejó el mono.** Una disciplina, una industria y sus límites.

En la arena, Tumba Server hace de mono, Monito Server es el ingeniero de guardia y `/salud` es el estado estable.

## La arena

1. Entra al LIVE y elige tu equipo en la arena.
2. **Tumba Server:** en tu turno, toca un servidor de la granja y lánzale hasta dos de los 10 ataques (app, disco, base, fuga de datos, clones, archivos pesados, formularios basura, sesión abierta, clave débil…). Tu monito salta la valla.
3. **Server:** en tu turno, cura tu servidor. La app apagada y el disco lleno tienen botón; la base borrada y la app atascada, prompt. Los otros ataques no tienen receta: investiga con DeepSeek Harness y la skill `monito-server`.
4. Al final de cada defensa el LMS revisa la salud de cada servidor (`/salud`): cada uno en pie suma 100 al equipo Server y cada uno caído suma 100 al equipo Tumba.

Tu servidor queda en `/trabajo/monito`: puedes abrirlo con `curl -s http://127.0.0.1:7070/salud` desde la terminal del aula.
