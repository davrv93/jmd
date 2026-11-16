---
id: om-01
title: "Sesión 1 · Instala y entiende el flujo"
published: true
starts_at: 2026-11-15T21:00:00-05:00
objectives:
  - id: om-01-o1
    title: Instalar OpenMontage y conectar tu asistente de IA
recording:
  url: ""
  passcode: ""
repo:
  url: https://github.com/calesthio/OpenMontage
  ref: main
materials:
  - id: om-01-resumen
    title: "Video resumen de la sesión (1:53): de una idea a un video con OpenMontage y Backlot"
    kind: video
    file: materials/grabaciones/om-01-resumen.mp4
    objective_ids: [om-01-o1]
  - id: om-01-m1
    title: Repositorio de OpenMontage
    kind: repo
    url: https://github.com/calesthio/OpenMontage
    objective_ids: [om-01-o1]
  - id: om-01-estudio-ver-1
    title: "Estudio · colibrí, referencia 1: apertura"
    kind: file
    file: materials/estudio-ver/colibri-con-veo__assets__video__1-apertura.mp4
    objective_ids: [om-01-o3]
  - id: om-01-estudio-ver-2
    title: "Estudio · colibrí, referencia 2: de lado"
    kind: file
    file: materials/estudio-ver/colibri-con-veo__assets__video__2-de-lado.mp4
    objective_ids: [om-01-o3]
  - id: om-01-estudio-ver-3
    title: "Estudio · colibrí, referencia 3: de frente"
    kind: file
    file: materials/estudio-ver/colibri-con-veo__assets__video__3-de-frente.mp4
    objective_ids: [om-01-o3]
  - id: om-01-estudio-ver-4
    title: "Estudio · colibrí, referencia 4: de noche"
    kind: file
    file: materials/estudio-ver/colibri-con-veo__assets__video__4-de-noche.mp4
    objective_ids: [om-01-o3]
  - id: om-01-estudio-ver-5
    title: "Estudio · colibrí, referencia 5: el ojo"
    kind: file
    file: materials/estudio-ver/colibri-con-veo__assets__video__5-ojo.mp4
    objective_ids: [om-01-o3]
  - id: om-01-estudio-ver-6
    title: "Estudio · colibrí, referencia 6: aleteo 3D"
    kind: file
    file: materials/estudio-ver/colibri-con-veo__assets__video__6-aleteo-3d-procedural.mp4
    objective_ids: [om-01-o3]
  - id: om-01-estudio-ver-7
    title: "Estudio · «Mi cafetería de barrio»: música de fondo"
    kind: file
    file: materials/estudio-ver/video-20261105-150809__assets__music__cafe-barrio-bed.mp3
    objective_ids: [om-01-o3]
  - id: om-01-estudio-ver-8
    title: "Estudio · «Mi cafetería de barrio»: música completa"
    kind: file
    file: materials/estudio-ver/video-20261105-150809__assets__music__cafe-barrio.mp3
    objective_ids: [om-01-o3]
  - id: om-01-estudio-ver-9
    title: "Estudio · «Mi cafetería de barrio»: video final (15 s)"
    kind: file
    file: materials/estudio-ver/video-20261105-150809__renders__final.mp4
    objective_ids: [om-01-o3]
  - id: om-01-manual-backlot
    title: "Manual de Backlot: modelos, consumo, skills, tutorial p5 + GSAP y personaje corriendo (PDF)"
    kind: pdf
    file: materials/manual-backlot.pdf
    objective_ids: [om-01-o3]
  - id: om-01-estudio-ver-10
    title: "Estudio · tutorial «¿Qué es un agente?» hecho con p5 + GSAP (27 s, horizontal)"
    kind: file
    file: materials/estudio-ver/tutorial-p5-demo__renders__que-es-un-agente.mp4
    objective_ids: [om-01-o3]
  - id: om-01-estudio-ver-11
    title: "Estudio · tutorial «¿Qué es un agente?» (27 s, vertical para estados)"
    kind: file
    file: materials/estudio-ver/tutorial-p5-demo__renders__que-es-un-agente-vertical.mp4
    objective_ids: [om-01-o3]
  - id: om-01-estudio-ver-12
    title: "Estudio · colibrí, música del tema"
    kind: file
    file: materials/estudio-ver/colibri-con-veo__assets__music__colibri-tema.mp3
    objective_ids: [om-01-o3]
  - id: om-01-estudio-ver-13
    title: "Estudio · colibrí, clip Veo: de lado"
    kind: file
    file: materials/estudio-ver/colibri-con-veo__assets__video__veo__e2-lado.mp4
    objective_ids: [om-01-o3]
  - id: om-01-estudio-ver-14
    title: "Estudio · colibrí, clip Veo: de frente"
    kind: file
    file: materials/estudio-ver/colibri-con-veo__assets__video__veo__e5-frente.mp4
    objective_ids: [om-01-o3]
cycle:
  - id: ver
    title: Ver la clase
    tool: zoom
    phase: experiencia
    description: Asiste en vivo o mira la grabación.
    check: Has visto la clase completa (o la grabación)
  - id: instalar
    title: Instalar OpenMontage
    tool: terminal
    phase: experimentacion
    description: En la escena 3 copia el comando de instalación y pégalo en la terminal de tu carpeta del proyecto.
    check: make setup (o los pasos de la alternativa) terminan sin error
  - id: flujo
    title: Entender el flujo
    tool: lms
    phase: conceptualizacion
    description: En las escenas 2 y 5 revisa las etapas y el tablero Backlot.
    check: Puedes nombrar las cinco etapas de producción
  - id: prompt
    title: Hacer tu primer video
    tool: terminal
    phase: experimentacion
    description: En la escena 4 copia un prompt de ejemplo y pídelo a tu asistente.
    check: Tienes un video de 60 segundos generado
  - id: preguntar
    title: Preguntar o responder
    tool: lms
    phase: reflexion
    description: Publica una pregunta sobre la clase en el hilo de la sesión o responde la de un compañero.
    check: Tu pregunta aparece en el hilo de la sesión
---

## Avance de la sesión

Hoy instalas OpenMontage, conoces sus pipelines y entiendes qué hace el orquestador y qué haces tú.

## Instalación y primer proyecto

El detalle de esta sesión se publica antes de la clase.
