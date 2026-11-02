---
id: di-03
title: "Sesión 3 · Del diseño al código: tokens, responsive y accesibilidad"
starts_at: 2026-12-01T21:15:00-05:00
published: true
objectives:
  - {id: di-03-o1, title: "Convertir tokens.json en variables CSS y en un tema claro / oscuro sin tocar los componentes"}
  - {id: di-03-o2, title: "Pedir al agente los componentes en HTML + CSS (o React) a partir del diseño y corregir lo que no coincide con el prototipo"}
  - {id: di-03-o3, title: "Hacer que las tres pantallas quepan en 393 px, 768 px y 1280 px sin desborde horizontal"}
  - {id: di-03-o4, title: "Pasar la revisión de accesibilidad: contraste AA, foco visible, orden de tabulación, etiquetas y nombres accesibles"}
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
    description: Del prototipo al código publicado, en directo, con el agente escribiendo el CSS.
    check: "Asistencia a la sesión (Zoom)"
  - id: comparar
    title: Diseño vs. código
    tool: lms
    phase: reflexion
    description: Pon el prototipo y la página en código lado a lado; anota cada diferencia de espacio, tamaño o color.
    check: "Lista de diferencias corregidas"
  - id: tokens-css
    title: Tokens a CSS
    tool: jmd
    phase: conceptualizacion
    description: Pide al agente las variables CSS desde tu tokens.json y el tema oscuro con prefers-color-scheme.
    check: "tokens.css con tema claro y oscuro"
  - id: publicar
    title: Publicar y auditar
    tool: jmd
    phase: experimentacion
    description: Publica las tres pantallas en una URL y pasa la auditoría de accesibilidad del aula.
    check: "URL pública + auditoría sin errores"
---
## Sesión 3 · Del diseño al código

**Martes 1 de diciembre, 9:15 – 10:45 p. m. (Lima).**

### Idea de la sesión

El diseño que no llega al código no existe. Esta sesión cierra el ciclo: los tokens se vuelven variables,
los componentes se vuelven HTML, las tres pantallas se publican y pasan una auditoría de accesibilidad.
El agente escribe; tú decides y verificas contra el prototipo.

### Bloques (90 minutos)

1. **Tokens → CSS (15 min) · Aplicación.** Variables en `:root`, tema oscuro con `prefers-color-scheme` y `data-theme`, radios y sombras. Nada de colores sueltos en los componentes.
2. **Componentes con el agente (25 min) · Aplicación.** Captura del diseño (o Figma) al agente; pedido de seis partes; comparar píxel a píxel; corregir con un segundo pedido preciso.
3. **Responsive (15 min) · Conceptos.** 393 px primero; `clamp()` para tipografía; grid con `auto-fit`; la tabla que se vuelve tarjetas; sin scroll horizontal.
4. **Accesibilidad (20 min) · Conceptos.** Contraste AA, foco visible, orden de tabulación, `label` en cada campo, nombres accesibles en botones con icono, mensajes de error anunciados. Auditoría automática y recorrido con teclado.
5. **Publicar (10 min) · Experimentación.** URL pública de las tres pantallas; revisión cruzada con la persona de al lado.
6. **Cierre (5 min).** Qué entregar para la insignia y el certificado.

### Herramientas

Aula LIVE con el agente JMD · navegador (DevTools, emulación móvil y auditoría) · hosting gratuito.

## Tareas

- **Tarea 3 · Módulo publicado.** URL con las tres pantallas, `tokens.css`, auditoría de accesibilidad sin errores y una captura en 393 px, 768 px y 1280 px. Con las tres tareas, certificado del curso.
