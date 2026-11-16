---
id: ipt-01
title: "Sesión 1 · Tu clave y tus primeros usos útiles"
published: true
starts_at: 2026-11-15T19:30:00-05:00
objectives:
  - id: ipt-01-o1
    title: Crear tu cuenta de DeepSeek, recargar un monto pequeño y guardar tu clave (API key) de forma segura
  - id: ipt-01-o2
    title: Abrir DeepSeek Harness en el LIVE con tu clave y elegir tu carpeta de trabajo
  - id: ipt-01-o3
    title: Pedirle ayuda para tareas del día a día (mensajes, resúmenes, explicaciones e ideas) y adaptar el pedido a tu caso
  - id: ipt-01-o4
    title: Crear una herramienta útil (lista, calculadora, planificador o control de gastos) y verla funcionar en el Visor
recording:
  url: ""
  passcode: ""
repo:
  url: https://github.com/davrv93/jmd
  ref: main
materials:
  - id: ipt-01-guia-visual
    title: Guía visual de la sesión (12 diapositivas, capturas reales y esquemas rotulados)
    kind: slides
    slides_dir: materials/guia-visual-s1
    objective_ids: [ipt-01-o1, ipt-01-o2]
  - id: ipt-01-guia-texto
    title: "Guía en texto: cuenta, recarga, clave y primer uso de dsh (verificada el 31-10-2026)"
    kind: doc
    file: materials/guia-deepseek-cuenta-recarga-api.md
    objective_ids: [ipt-01-o1, ipt-01-o2]
  - id: ipt-01-m-plat
    title: Plataforma de DeepSeek · cuenta, recarga y API keys (escríbela tú mismo)
    kind: link
    url: https://platform.deepseek.com
    objective_ids: [ipt-01-o1]
  - id: ipt-01-m-api
    title: Documentación de la API de DeepSeek · precios, errores y límites
    kind: doc
    url: https://api-docs.deepseek.com
    objective_ids: [ipt-01-o1]
cycle:
  - id: ver
    title: Ver la clase y el plan del día
    tool: zoom
    phase: experiencia
    description: Asiste en vivo (domingo 15 de noviembre, 7:30 pm) o mira la grabación. La escena 1 resume el día en tres pasos.
    check: Sabes cuáles son los tres pasos de hoy
  - id: cuenta
    title: Crear tu cuenta y tu clave
    tool: lms
    phase: experiencia
    description: "En la escena 2: entra a platform.deepseek.com, recarga un monto pequeño (lee el mínimo y las comisiones antes de pagar), crea tu clave en «API keys» y guárdala con el botón «Guardar mi clave»."
    check: Tu clave quedó guardada y no la pegaste en ningún chat
  - id: dsh
    title: Abrir DeepSeek Harness
    tool: lms
    phase: experiencia
    description: En la escena 3 toca «Abrir DeepSeek Harness», elige la carpeta «trabajo» en «Choose workspace» y salúdalo.
    check: DeepSeek Harness te responde al saludo
  - id: ayuda
    title: Pedir ayuda del día a día
    tool: lms
    phase: experimentacion
    description: En la escena 4 toca un ejemplo (mensaje, corrección, resumen, ideas, receta…), pégalo con Ctrl+V y cámbialo por tu caso real.
    check: Usaste al menos dos ejemplos y adaptaste uno a tu vida
  - id: crear
    title: Crear algo que puedas usar
    tool: lms
    phase: experimentacion
    description: En la escena 5 pide una herramienta (lista de compras, calculadora de precios, semana, gastos, tarjeta o carta) y ábrela con «Ver el resultado».
    check: Tu herramienta funciona en el Visor
  - id: preguntar
    title: Preguntar o responder
    tool: lms
    phase: reflexion
    description: Publica una pregunta sobre la clase en el hilo de la sesión o responde la de un compañero.
    check: Tu pregunta aparece en el hilo de la sesión
  - id: entregar
    title: Entregar tu tarea
    tool: lms
    phase: experimentacion
    description: Sube tus dos capturas (una ayuda real y tu herramienta con tus datos) desde la entrega de la sesión 1 del LMS.
    check: La entrega aparece en «Mis notas»

---

## Avance de la clase

Hoy aprendes a pedirle cosas útiles a un asistente de IA. **No necesitas saber programar:** tú pides en español y
DeepSeek Harness lee, escribe y hace el trabajo por ti.

| Escena | Qué haces | Lo logras cuando |
|---|---|---|
| 1 · Hoy, en tres pasos | Ves el plan del día | Sabes qué viene |
| 2 · Tu cuenta y tu clave | Creas tu cuenta, recargas un poco y guardas tu clave | Tu clave quedó guardada |
| 3 · Abre DeepSeek Harness | Lo abres al lado y eliges la carpeta «trabajo» | Te responde el saludo |
| 4 · Pídele ayuda al instante | Mensajes, correcciones, resúmenes, ideas | Adaptaste un ejemplo a tu caso |
| 5 · Crea algo que puedas usar | Una lista, una calculadora, tu semana o tus gastos | Funciona en el Visor |
| 6 · Tu tarea | Lo haces tuyo | Sabes qué entregar |

Cada ejemplo tiene un botón que **copia el pedido y abre DeepSeek Harness**: solo pegas (Ctrl+V, o ⌘V en Mac) y
presionas Enter. Si algo no sale a la primera, es normal: lo vemos juntos.

## Antes de la clase

- [ ] Sabes entrar al LIVE de la clase en jmd-learn.online.
- [ ] Tienes con qué recargar un monto pequeño en DeepSeek (tarjeta u otro medio de pago).
- [ ] Opcional: un gestor de contraseñas para guardar tu clave.

## Tu cuenta y tu clave

1. Escribe tú mismo `platform.deepseek.com` (es la plataforma para desarrolladores, distinta del chat de DeepSeek).
2. En **Top Up** recarga un monto pequeño. Antes de pagar, mira en pantalla el mínimo y las comisiones. El saldo
   recargado no caduca.
3. En **API keys** crea una clave y cópiala: solo se muestra una vez.
4. En el LIVE, toca **«Guardar mi clave»** y pégala ahí.

Tu clave es como una contraseña: no la pegues en el chat de Zoom ni en WhatsApp. Si se filtró, bórrala en
**API keys** y crea otra.

## Ejemplos para el día a día

- **Ayuda al instante:** un mensaje difícil por WhatsApp, corregir un texto, explicar algo fácil, resumir un texto
  largo, ideas para vender más, publicaciones para redes, prepararte para una entrevista, una receta con lo que tienes.
- **Algo que puedes usar:** una lista de compras con casillas, una calculadora de precios con IGV, tu semana
  organizada, un control de gastos, una tarjeta de presentación y la carta de un restaurante.

**Si falla:** «401» = la clave está mal escrita · «402» = no hay saldo · «429» = muchas peticiones seguidas,
espera un minuto. Si DeepSeek Harness no responde, recarga su pestaña.

## Tarea

1. **Una ayuda real:** usa un ejemplo de «Pídele ayuda» con tu caso de verdad y toma una captura del resultado.
2. **Una herramienta tuya:** pide una de «Crea algo» con tus datos (tu lista, tus precios o tus gastos) y toma una
   captura en el Visor.
3. Sube las dos capturas en la entrega de la sesión 1 y cuéntanos en el hilo para qué te sirvió.

En la sesión 2 aprenderás a pedir mejor y a medir cuánto gasta el asistente, para gastar menos saldo.
