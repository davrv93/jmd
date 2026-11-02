---
id: di-01
title: "Sesión 1 · Fundamentos que se ven: jerarquía, tipografía, espacio y color"
starts_at: 2026-11-17T21:15:00-05:00
published: true
objectives:
  - {id: di-01-o1, title: "Diagnosticar una pantalla real con la prueba de los 5 segundos y la prueba de entrecerrar los ojos, y nombrar sus tres problemas principales"}
  - {id: di-01-o2, title: "Construir una escala tipográfica (1.25) y una retícula de 8 pt, y aplicarlas a la pantalla"}
  - {id: di-01-o3, title: "Elegir una paleta de 1 acento + 1 neutro + 3 semánticos que pase contraste AA (4.5:1) y comprobarla"}
  - {id: di-01-o4, title: "Escribir los tokens del sistema (color, tipografía, espacio, radio, sombra) en un archivo que el agente pueda leer"}
recording:
  url: ""
  passcode: ""
repo:
  url: https://github.com/davrv93/jmd
  ref: main
cycle:
  - id: ver
    title: Ver la sesión en vivo
    tool: zoom
    phase: experiencia
    description: Rediseñamos juntos una pantalla fea de verdad, paso a paso, delante de todos.
    check: "Asistencia a la sesión (Zoom)"
  - id: diagnostico
    title: Diagnóstico de tu pantalla
    tool: lms
    phase: reflexion
    description: Sube la captura de tu pantalla y escribe sus tres problemas con la prueba de los 5 segundos.
    check: "Captura + tres problemas en la entrega de la sesión"
  - id: tokens
    title: Tus tokens
    tool: jmd
    phase: conceptualizacion
    description: Pide al agente la escala tipográfica, la retícula y la paleta; corrige lo que no pase AA.
    check: "tokens.json con color, tipografía, espacio, radio y sombra"
  - id: rediseno
    title: Primera versión rediseñada
    tool: jmd
    phase: experimentacion
    description: Aplica los tokens a tu pantalla en Figma (o Penpot) y compárala con la original lado a lado.
    check: "Antes / después en la entrega"
---
## Sesión 1 · Fundamentos que se ven

**Martes 17 de noviembre, 9:15 – 10:45 p. m. (Lima).**

### Idea de la sesión

Una interfaz no se explica: se entiende de un vistazo o no sirve. Esta sesión da el criterio para que
cada pantalla tenga **un** protagonista, un orden de lectura y un color que signifique algo.

### Bloques (90 minutos)

1. **La pantalla fea (15 min) · Experiencia.** Prueba de los 5 segundos y prueba de entrecerrar los ojos sobre una pantalla real. ¿Qué viste primero? ¿Qué no viste nunca?
2. **Jerarquía (20 min) · Conceptos.** Tamaño, peso, contraste y posición. Una sola cosa grande. Escala tipográfica 1.25 (12 · 14 · 16 · 20 · 25 · 31 · 39) y por qué no se inventan tamaños.
3. **Espacio (15 min) · Conceptos.** Retícula de 8 pt; agrupar por proximidad; márgenes que respiran; alineación a una sola línea vertical.
4. **Color (20 min) · Conceptos.** Un acento, una familia de neutros, tres semánticos (éxito, aviso, error). Contraste AA 4.5:1 en texto y 3:1 en bordes e iconos; cómo comprobarlo.
5. **Tokens con el agente (15 min) · Aplicación.** Le pedimos al agente los tokens en JSON y las variables de Figma; corregimos lo que no pase contraste.
6. **Cierre (5 min).** Antes / después y la tarea.

### Herramientas

Figma (plan gratis) o Penpot · aula LIVE con el agente JMD · comprobador de contraste (en el aula).

## Tareas

- **Tarea 1 · Antes / después.** Tu pantalla original y la rediseñada con tus tokens, lado a lado, más el `tokens.json`. Se revisa con la misma prueba de los 5 segundos.
