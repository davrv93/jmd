---
target: mesa del instructor /live/dl-02/ + escena 01-tu-video
total_score: 25
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 4
target_identity: "file:/Users/david.roncal/Documents/jmd/lms/web/src/components/live-control.tsx"
target_fingerprint: "sha256:c6e7730ea4e0f481fc699cf64f10805fbb9efdaeac9871e3b6ffd23dbfd573ae"
target_path: /Users/david.roncal/Documents/jmd/lms/web/src/components/live-control.tsx
timestamp: 2026-11-02T22-06-27Z
slug: lms-web-src-components-live-control-tsx
---
# Critique · Mesa del instructor (LIVE) + escena 01-tu-video

Método: dual-agent (A revisión de diseño · B detector + capturas). Overlay omitido: superficie autenticada.

## Heurísticas (25/40 · Aceptable)
1 Visibilidad 3 · 2 Mundo real 3 · 3 Control 2 · 4 Consistencia 2 · 5 Prevención 2 · 6 Reconocimiento 3 · 7 Flexibilidad 3 · 8 Minimalismo 3 · 9 Recuperación 2 · 10 Ayuda 2.

## Especificidad
Autorada a medias: carril por fase, barra agrupada, cierre en línea. Plantilla: once controles del mismo peso, hamburguesa «Más», chip sin palabra, sin reloj de clase. Escena: paso 3 con 25 opciones visibles.

## Detector
live-control.tsx: 0 (estilos en global.css, fuera de alcance). escena.html: 7 undersized-ui-text + 1 tiny-text (rótulos .66em, .paso small, .nota) — reales cuando la base clamp toca 15 px.

## Prioridades
- [P0] Blanco sobre --ph / --ok / --bad en oscuro (1,6–2,5:1). colorize/harden
- [P1] Atajos mueren en el iframe; espacio choca con botón enfocado. harden
- [P1] Sin reloj total ni desvío contra el plan. clarify
- [P1] Barra parte en dos filas a 1024; teléfono cortado en una columna; texto de la escena 9,9 px en el suelo. adapt
- [P1] «Visible/Oculta» estado en vez de acción; mismo icono ×3; foco recortado en .mesa-seg. clarify/polish
- [P2] «Más» mezcla destructivo + contextual + ayuda, sin confirmación ni Escape. distill/harden

## Personas
Alex: atajos frágiles, Guiado/Libre sin eco inmediato, carril salta compuerta. Sam: anillos recortados, summary sin aria-expanded, sin aria-live en «¿Cerrar de verdad?». Jordan: DL-02 sin nombre, jerga Muro/Votos, atajos ocultos.

## Menores
.live-alumnos sin scroll; placeholder usado como valor real; pista vacía bajo «Renderizar»; chips desalineados 3 px; botones 27 px de alto.
