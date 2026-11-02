---
id: di-02
title: "Sesión 2 · Componentes, estados y flujos: el prototipo que se recorre"
starts_at: 2026-11-24T21:15:00-05:00
published: true
objectives:
  - {id: di-02-o1, title: "Construir una biblioteca mínima de componentes (botón, campo, selector, tabla, modal, aviso) con variantes y tamaños"}
  - {id: di-02-o2, title: "Diseñar los cinco estados de cada pantalla: vacío, cargando, error, éxito y sin permiso"}
  - {id: di-02-o3, title: "Dibujar el flujo lista → detalle → formulario y conectarlo en un prototipo navegable"}
  - {id: di-02-o4, title: "Probar el prototipo con tres personas, con una tarea y un cronómetro, y anotar dónde dudan"}
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
    description: Armamos la biblioteca de componentes y el flujo de tres pantallas en directo.
    check: "Asistencia a la sesión (Zoom)"
  - id: estados
    title: Los cinco estados
    tool: lms
    phase: reflexion
    description: Revisa tu prototipo y marca qué pantalla no tiene estado vacío, de error o de carga.
    check: "Lista de estados faltantes en la entrega"
  - id: variantes
    title: Variantes con el agente
    tool: jmd
    phase: conceptualizacion
    description: Pide al agente tres variantes del formulario y el texto de cada mensaje de error; elige y justifica.
    check: "Variantes elegidas con el porqué"
  - id: prueba
    title: Prueba con tres personas
    tool: lms
    phase: experimentacion
    description: Una tarea, un cronómetro, tres personas. Anota el tiempo y la primera duda de cada una.
    check: "Tabla con tres tiempos y tres dudas"
---
## Sesión 2 · Componentes, estados y flujos

**Martes 24 de noviembre, 9:15 – 10:45 p. m. (Lima).**

### Idea de la sesión

La pantalla bonita es la del caso feliz. La interfaz de verdad es la que sabe qué mostrar cuando no hay
datos, cuando tarda, cuando falla y cuando el usuario no puede. Esta sesión construye esa interfaz
completa y la pone en manos de tres personas antes de escribir una línea de código.

### Bloques (90 minutos)

1. **Anatomía de un componente (15 min) · Conceptos.** Variante, tamaño, estado (normal, hover, foco, activo, deshabilitado). Botón primario, secundario y peligroso; campo con etiqueta, ayuda y error.
2. **Biblioteca mínima (20 min) · Aplicación.** Seis componentes con los tokens de la sesión 1: botón, campo, selector, tabla, modal, aviso. Autolayout y propiedades en Figma.
3. **Los cinco estados (15 min) · Conceptos.** Vacío (con acción), cargando (esqueleto, no spinner), error (qué pasó y qué hacer), éxito (confirmación que no estorba), sin permiso.
4. **El flujo (20 min) · Aplicación.** Lista → detalle → formulario. Qué va en cada pantalla, qué se repite (encabezado, navegación) y cómo se vuelve atrás. Prototipo navegable.
5. **Copy UX y variantes con el agente (10 min) · Aplicación.** Textos de botones, mensajes de error en primera persona, títulos que son acciones. El agente propone tres; nosotros elegimos.
6. **Prueba de pasillo (10 min) · Experiencia.** Una tarea, un cronómetro, una persona del grupo. Dónde dudó.

### Herramientas

Figma (prototipo y variables) · aula LIVE con el agente JMD · cronómetro del teléfono.

## Tareas

- **Tarea 2 · Prototipo probado.** Enlace al prototipo navegable (tres pantallas, cinco estados) y la tabla de la prueba con tres personas: tiempo por tarea y primera duda.
