---
id: g2-03
title: "Grupo 2 · Clase 3 · Tu chatbot de WhatsApp: wireframe, prototipo, Lit, Bun + Elysia, PostgreSQL y pruebas"
published: true
objectives:
  - id: g2-03-o1
    title: "Diseñar antes de programar: flujos con sus errores, wireframe en gris y prototipo navegable de la bandeja"
  - id: g2-03-o2
    title: "Vincular el número de WhatsApp de pruebas a Evolution Go con el código QR y recibir sus mensajes por webhook en tu aula"
  - id: g2-03-o3
    title: "Construir la bandeja en Lit y la API en Bun + Elysia + PostgreSQL y unirlas: el modelo responde, se refleja en la bandeja y una persona puede tomar la conversación"
  - id: g2-03-o4
    title: "Entender qué es una herramienta del agente y ver un MCP en acción"
  - id: g2-03-o5
    title: "Probar con bun test, un smoke de Playwright y un teléfono real, y medir el tiempo de respuesta (p50 y p95)"
repo:
  url: https://github.com/davrv93/jmd
  ref: main
materials:
  - id: g2-03-kit
    title: "★ clase-03-kit.zip · las 10 skills s3-*, el plan, el prompt, las indicaciones, fondos y el ícono del bot"
    kind: zip
    file: materials/clase-03-kit.zip
    objective_ids: [g2-03-o1, g2-03-o2, g2-03-o3, g2-03-o5]
  - id: g2-03-plan
    title: Plan de trabajo del chatbot (15 tareas, para personalizar)
    kind: doc
    file: materials/plan-chatbot/PLAN_TRABAJO.md
    objective_ids: [g2-03-o1, g2-03-o2, g2-03-o3, g2-03-o5]
  - id: g2-03-prompt
    title: Prompt para armar tu chatbot desde cero (se pega a jmd)
    kind: doc
    file: materials/plan-chatbot/PROMPT_ARMAR_CHATBOT.md
    objective_ids: [g2-03-o3]
  - id: g2-03-indicaciones
    title: "Indicaciones: cómo entras, qué comandos usas y qué hacer si algo falla"
    kind: doc
    file: materials/plan-chatbot/INDICACIONES.md
    objective_ids: [g2-03-o2, g2-03-o3]
  - id: g2-03-temario
    title: Temario del curso (PDF)
    kind: pdf
    file: materials/temario-curso.pdf
    objective_ids: [g2-03-o1, g2-03-o2, g2-03-o3, g2-03-o4, g2-03-o5]
  - id: g2-03-capturas
    title: "Capturas de referencia: bandeja de WhatsApp y landing"
    kind: slides
    file: materials/clase-03-capturas.pdf
    slides_dir: materials/clase-03-capturas
    objective_ids: [g2-03-o1, g2-03-o3]
  - id: g2-03-maqueta
    title: "Maqueta de la bandeja (HTML, ábrela en el navegador)"
    kind: zip
    file: materials/sesion3-bandeja-maqueta.html
    objective_ids: [g2-03-o1, g2-03-o3]
  - id: g2-03-m1
    title: Lit · documentación (componentes web sin build)
    kind: doc
    url: https://lit.dev/docs/
    objective_ids: [g2-03-o3]
  - id: g2-03-m2
    title: Elysia · documentación (servidor web para Bun)
    kind: doc
    url: https://elysiajs.com/
    objective_ids: [g2-03-o3]
  - id: g2-03-m3
    title: Bun · SQL (cliente de PostgreSQL incluido)
    kind: doc
    url: https://bun.sh/docs/api/sql
    objective_ids: [g2-03-o3]
  - id: g2-03-m4
    title: Evolution Go · repositorio de la clase
    kind: repo
    url: https://github.com/davrv93/evolution-go
    objective_ids: [g2-03-o2, g2-03-o3]
  - id: g2-03-m5
    title: Playwright · documentación
    kind: doc
    url: https://playwright.dev/docs/intro
    objective_ids: [g2-03-o5]
  - id: g2-03-m6
    title: Excalidraw (bocetos a mano)
    kind: link
    url: https://excalidraw.com/
    objective_ids: [g2-03-o1]
  - id: g2-03-m7
    title: WCAG 2.2 · referencia rápida
    kind: doc
    url: https://www.w3.org/WAI/WCAG22/quickref/
    objective_ids: [g2-03-o1]
  - id: g2-03-m8
    title: Model Context Protocol (MCP)
    kind: doc
    url: https://modelcontextprotocol.io/
    objective_ids: [g2-03-o4]
  - id: g2-03-taller
    title: "Para tu casa · taller-agentico.zip (backend del asistente y maquetas de la versión con Docker)"
    kind: zip
    file: materials/taller-agentico.zip
    objective_ids: [g2-03-o3]
  - id: g2-03-m9
    title: "Para tu casa · Docker Compose · documentación"
    kind: doc
    url: https://docs.docker.com/compose/
    objective_ids: [g2-03-o3]
cycle:
  - id: ver
    title: Ver la clase
    tool: zoom
    phase: experiencia
    description: Asiste en vivo o mira la grabación. Ten tu aula abierta en el LMS y los dos teléfonos a mano (el de pruebas y otro que le escribe).
    check: Has visto la clase completa (o la grabación)
  - id: plan
    title: Plan personalizado
    tool: jmd
    phase: experiencia
    description: En la terminal del aula, `aula nuevo plan-chatbot`; abre `jmd`, pega el prompt de PROMPT_ARMAR_CHATBOT.md y responde sus 5 preguntas.
    check: "`grep -c '<<[A-Z0-9_]*>>' /trabajo/plan-chatbot/PLAN_TRABAJO.md` imprime 0"
  - id: wireframe
    title: Wireframe y prototipo
    tool: jmd
    phase: conceptualizacion
    description: Con s3-wireframe y s3-prototipo, FLUJOS.md con el flujo feliz y tres errores, el wireframe en gris de 3 pantallas y el prototipo navegable con tu color.
    check: chatbot/prototipo se recorre en el visor a 393 px sin barra horizontal
  - id: afiliar
    title: Vincular WhatsApp
    tool: terminal
    phase: experiencia
    description: "`aula whatsapp`, abre qr.png en el visor y escanéalo desde WhatsApp › Dispositivos vinculados en el teléfono de pruebas."
    check: "`/instance/status` dice \"LoggedIn\": true"
  - id: webhook
    title: Datos y API
    tool: jmd
    phase: experiencia
    description: Con s3-postgres y s3-back-elysia, la base y la API en el puerto 8766. Escribe «hola» desde el otro teléfono.
    check: El «hola» aparece en /api/conversaciones
  - id: bandeja
    title: Bandeja en Lit
    tool: jmd
    phase: experiencia
    description: Con s3-front-lit y s3-whatsapp-qr, la bandeja, el chat y el estado del número. Ábrela en el visor y pulsa «Móvil».
    check: La bandeja muestra tu conversación a 393 px sin desborde
  - id: bot
    title: Bot respondiendo
    tool: jmd
    phase: experiencia
    description: Con s3-integracion, el bot responde con el modelo «clase» y una persona puede tomar la conversación desde la bandeja.
    check: 3 mensajes reales respondidos y una conversación tomada por una persona
  - id: pruebas
    title: Probar
    tool: terminal
    phase: reflexion
    description: "`bun test pruebas/` en el aula y la prueba de uso con una persona de otro equipo (s3-pruebas-uso): tres tareas, diez tiempos, p50 y p95."
    check: 6 pass en bun test y PRUEBAS_DE_USO.md con p50 y p95
  - id: preguntar
    title: Preguntar o responder
    tool: lms
    phase: reflexion
    description: Publica al menos una pregunta sobre la clase en este LMS (abajo) o responde una de un compañero.
    check: Tu pregunta aparece en el hilo de la sesión
  - id: entregar
    title: Entregar la tarea 3
    tool: git
    phase: experimentacion
    description: Sube el repositorio clase-03 con el enlace al video, las capturas y REFLEXION.md, y entrégalo desde el LMS (URL + commit).
    check: La entrega aparece en «Mis notas» con estado en cola
---

## Avance de la clase

Hoy construyes, dentro de tu aula, un chatbot que atiende por WhatsApp.
Un cliente escribe al número de pruebas del equipo, el modelo «clase» le responde con los datos de tu negocio
y la conversación aparece en una bandeja donde una persona puede tomar el control.
Antes de programar, dibujas las pantallas en gris y las pruebas en un prototipo.
Lo construye tu agente, tarea por tarea, con un plan de trabajo y diez skills `s3-*`.

Stack de hoy: front en **Lit** (sin build), backend en **Bun + Elysia**, base **PostgreSQL** y WhatsApp con **Evolution Go**. Todo está ya instalado en tu aula: no descargas nada.

Todo lo de hoy está en **clase-03-kit.zip** (Materiales): las skills, el plan, el prompt, las indicaciones, los fondos y el ícono del bot. En el aula no lo necesitas: `aula nuevo plan-chatbot` te trae lo mismo.

### El ciclo de esta clase

Esta sesión se recorre con el **ciclo de aprendizaje**. Las secciones no van en el orden de las
fases; el título de cada una lleva su fase al final.

| Fase | En esta clase |
|---|---|
| **1 · Experiencia** | Secciones 0, 2, 4, 5, 6 y 7: entras al aula, vinculas el número, levantas la API y la bandeja y haces que el bot responda. |
| **2 · Reflexión** | Sección 8: pruebas automáticas y una prueba de uso con un teléfono real, con tiempos. |
| **3 · Conceptos** | Secciones 1, 3 y 9: la arquitectura y las reglas, el diseño antes del código y MCP. |
| **4 · Aplicación** | Sección 10 y «Tareas»: llevarlo a tu casa y entregar. |

### Bloques de la clase (2 horas)

- 0:00 a 0:10 · Apertura: la arquitectura y las reglas (sección 1).
- 0:10 a 0:20 · Entrar al aula y personalizar el plan (sección 2).
- 0:20 a 0:35 · Wireframe y prototipo (sección 3).
- 0:35 a 0:45 · Vincular WhatsApp por QR (sección 4).
- 0:45 a 1:05 · Datos y API (sección 5).
- 1:05 a 1:20 · La bandeja en Lit (sección 6).
- 1:20 a 1:35 · El bot responde y una persona toma la conversación (sección 7).
- 1:35 a 1:47 · Probar (sección 8).
- 1:47 a 2:00 · Demostración de MCP y tareas (secciones 9 y 10).

## 0. Antes de la clase · Experiencia

En una frase: hoy no instalas nada; solo preparas los dos teléfonos.

**Qué vas a hacer**
1. Elige el teléfono de **pruebas** del equipo y actualiza su WhatsApp. Nunca uses tu número personal.
2. Consigue un segundo teléfono que le escriba (o haz pareja con otro equipo).
3. Piensa en tu negocio: nombre del bot, tono, color y tres preguntas frecuentes con su respuesta.
4. Si quieres leer antes, descarga **clase-03-kit.zip** y abre `plan-chatbot/INDICACIONES.md`.

**Qué vas a ver:** En el teléfono de pruebas, WhatsApp › Configuración › Dispositivos vinculados tiene sitio para uno más (máximo 4).

**Si falla:** Si no tienes número de pruebas, avisa en el hilo de la clase antes de la sesión.

## 1. Apertura: la arquitectura y las reglas · Conceptos

En una frase: Evolution Go recibe los mensajes de WhatsApp y toca el timbre de tu aula; tu API responde con el modelo y la bandeja lo muestra.

Analogía: el webhook es el timbre. WhatsApp lo toca y tu programa abre la puerta.

El camino de un mensaje:

- El cliente escribe «hola» al número de pruebas.
- Evolution Go (de la clase) hace `POST http://<tu aula>:8766/api/webhook`. Ese timbre ya viene configurado.
- Tu API en Elysia responde `{ok:true}` al instante, guarda el mensaje en tu PostgreSQL y le pregunta al modelo «clase».
- La respuesta sale por `POST /send/text` de Evolution Go y se guarda.
- La bandeja (Lit, en el visor) pregunta cada 2 a 3 segundos y muestra lo nuevo.

WhatsApp no es un entorno de pruebas. Un número bloqueado no se recupera en clase. Cuatro reglas:

- Solo números de pruebas del equipo. Nadie vincula su número personal.
- El primer mensaje del bot dice que es un bot.
- Nada de envíos masivos ni mensajes a gente fuera del aula. El bot solo responde a quien le escribe.
- El bot no cobra, reserva ni cancela. Si el cliente lo pide, pasa a una persona.

**Qué vas a hacer**
1. Mira la demostración del instructor: un mensaje real, la respuesta y la bandeja.
2. Ubica en el kit la tabla de skills: cada fase del plan dice qué skill leer.

**Qué vas a ver:** En la demo, el mensaje aparece en la bandeja unos segundos después de llegar al teléfono.

**Si falla:** Nada que arreglar: es una demostración.

## 2. Entrar al aula y personalizar el plan · Experiencia

En una frase: copias el plan del chatbot a tu aula y tu agente lo adapta a tu negocio.

El plan tiene 15 tareas en 7 fases (≈ 90 minutos). Cada tarea trae su criterio de aceptación con un `curl`, un `psql` o algo que ves en el visor.

**Qué vas a hacer**
1. En el LMS, abre tu aula. En la terminal:
   ```sh
   aula nuevo plan-chatbot
   ```
2. En el visor elige `plan-chatbot`: verás «Plan», «Prompt» e «Indicaciones».
3. Abre `jmd`, pega el prompt (está en `PROMPT_ARMAR_CHATBOT.md`) y responde sus 5 preguntas.
4. Lee el plan que te muestra y responde «ok». El agente hace la tarea F0-T2 con la skill `s3-chatbot-aula`.

**Qué vas a ver:** `grep -c '<<[A-Z0-9_]*>>' /trabajo/plan-chatbot/PLAN_TRABAJO.md` imprime `0` y `bun --version` responde.

**Si falla:** Si `aula nuevo plan-chatbot` dice «no existe la plantilla», tu aula es anterior a esta clase: pide al instructor que la reinicie. Si `jmd` no encuentra las skills, escribe `/skill s3-chatbot-aula`.

## 3. Diseñar antes de programar · Conceptos

En una frase: un wireframe es el dibujo de la pantalla con cajas grises; el prototipo es ese dibujo con color y enlaces, todavía sin código.

Analogía: es el plano de la tienda antes de poner los muebles. Mover una caja cuesta segundos; mover código, una hora. Va en gris a propósito: con color, la conversación se va al color.

Tres pantallas, no más: **bandeja** (nombre, último mensaje, etiqueta Bot o Persona, sin leer), **conversación** (mensajes, interruptor bot/persona, caja para responder) y **estado del número** (conectado, QR o caído).

Antes del camino feliz, escribes los caminos de error. Son lo que va a pasar en clase:

- El número se desconectó. ¿Qué ve el operador y qué puede hacer?
- El modelo no responde en 15 segundos. ¿Qué recibe el cliente? Siempre algo: nunca silencio.
- El envío falló. ¿Cómo se ve el mensaje en la bandeja?

**Qué vas a hacer**
1. Pide la tarea F1-T1: «/skill s3-wireframe. Escribe FLUJOS.md y wireframe/index.html para mi negocio».
2. Ábrelo en el visor (`chatbot/wireframe`). Si el flujo feliz pasa de cinco pasos, pide que lo recorte.
3. Pide la tarea F1-T2: «/skill s3-prototipo. Pasa el wireframe a prototipo con mi color».
4. En el visor (`chatbot/prototipo`) recórrelo con el ratón y luego solo con Tab y Enter. Pulsa «Móvil».

**Qué vas a ver:** Tres pantallas grises y un prototipo que va de la bandeja a la conversación, a «Persona», al QR y a «Caído», sin una línea de JavaScript.

**Si falla:** Si el agente pone color en el wireframe, dile: «Solo gris, solo cajas, sin datos». Si el prototipo abre en blanco, falta la regla `section:target` (está en la skill).

## 4. Vincular WhatsApp por QR · Experiencia

En una frase: vinculas el número de pruebas a tu instancia de Evolution Go escaneando un QR, como un dispositivo más.

Cada alumno tiene su instancia en el Evolution Go de la clase. Su clave está en la variable `EVO_TOKEN` y el webhook ya apunta a tu aula. No la imprimas ni la copies a un archivo.

**Qué vas a hacer**
1. En la terminal:
   ```sh
   aula whatsapp
   ```
   Si no hay sesión, renueva el QR en `/trabajo/qr.png` durante unos 2,5 minutos.
2. En el visor escribe `qr.png` en la barra. En el teléfono de pruebas: WhatsApp › Dispositivos vinculados › Vincular un dispositivo › escanea.
3. Comprueba:
   ```sh
   curl -s -H "apikey: $EVO_TOKEN" "$EVO_URL/instance/status"
   ```
4. Pide la tarea F2-T2: «/skill s3-whatsapp-qr. Crea evo.ts y bot-qr.js».

**Qué vas a ver:** `"LoggedIn":true` en la respuesta y, en el teléfono, un dispositivo vinculado nuevo.

**Si falla:** Si el QR caducó, vuelve a correr `aula whatsapp` y recarga `qr.png`. Si el número se desconecta más tarde o dejan de llegar mensajes, `aula whatsapp` restaura tu instancia y su webhook. Nunca llames a `/instance/connect` a mano: sin el webhook, borra tu timbre.

## 5. Datos y API: PostgreSQL + Bun + Elysia · Experiencia

En una frase: tu agente crea las tablas y la API que recibe el timbre y alimenta la bandeja.

Tres tablas: `contactos`, `conversaciones` (con su modo: bot o humano) y `mensajes` (autor: cliente, bot o humano). El `ID` de cada mensaje de WhatsApp es único en la base: si Evolution reintenta el webhook, el mensaje no se duplica.
La API escucha en el puerto 8766. El visor reenvía `/vista/<tú>/api/...` a ese puerto.

**Qué vas a hacer**
1. Tarea F3-T1: «/skill s3-postgres. Crea db.ts y corre la migración».
2. Tarea F3-T2: «/skill s3-back-elysia. Crea negocio.json con mis datos, bot.ts mínimo y servidor.ts; arranca con chatbot.sh».
3. Comprueba:
   ```sh
   curl -s localhost:8766/api/salud
   curl -s -X POST localhost:8766/api/webhook -H 'Content-Type: application/json' -d @/trabajo/chatbot/pruebas/webhook-hola.json
   curl -s localhost:8766/api/conversaciones
   ```
4. Tarea F3-T3: desde el segundo teléfono, escribe «hola» al número de pruebas y repite el último `curl`.

**Qué vas a ver:** `/api/salud` con `"db":true,"llm":true`; tu contacto en `/api/conversaciones` con `no_leidos` en 1.

**Si falla:** Si el servidor no arranca, `sh /trabajo/chatbot/chatbot.sh log` y pega el error al agente. Si `Address already in use`, `sh /trabajo/chatbot/chatbot.sh parar` y `aula parar`. Si el «hola» no llega, revisa la sección 4.

## 6. La bandeja en Lit · Experiencia

En una frase: tu agente arma la bandeja con componentes web de Lit, sin compilar nada.

Lit se carga desde `https://esm.sh/lit@3`. Cada pieza es una etiqueta: `<bot-bandeja>`, `<bot-chat>` y `<bot-qr>`. Todas llaman a la API con `pedir()` de `api.js`, que arma la ruta `/vista/<tú>/api/...`.
La bandeja se va a mirar desde un celular en el mostrador: 393 píxeles es el ancho de un teléfono común. Lo mínimo: el interruptor se opera con teclado, nada se indica solo con color y el foco se ve.

**Qué vas a hacer**
1. Tarea F4-T1: «/skill s3-front-lit. Crea app.js, bot-bandeja.js y bot-chat.js con mi color».
2. Tarea F4-T2: «/skill s3-whatsapp-qr. Pon bot-qr en la cabecera».
3. En el visor elige `chatbot`. Pulsa «Móvil» y recorre con Tab. Abre «Consola» para ver errores.

**Qué vas a ver:** Tu conversación del «hola» en la lista; al abrirla, sus mensajes. Arriba, «Conectado · …». A 393 px, una sola columna con «← Volver a la bandeja».

**Si falla:** Pantalla en blanco con «Failed to resolve module specifier»: el import debe ser `https://esm.sh/lit@3`. «Sin conexión con tu backend»: arranca la API o revisa que el front use `pedir()`.

## 7. El bot responde y una persona toma la conversación · Experiencia

En una frase: el mensaje entra por el timbre, lo responde el modelo y una persona puede apagar el bot en esa conversación.

El webhook responde `200` enseguida y trabaja en segundo plano: el modelo tarda de 1 a 4 segundos.
El modo humano es un interruptor por conversación. Mientras está activo, el bot calla; la persona escribe desde la bandeja.
Si el modelo no responde en 15 segundos, el cliente recibe una disculpa: nunca silencio.

**Qué vas a hacer**
1. Tarea F5-T1: «/skill s3-integracion. Reemplaza bot.ts y reinicia».
2. Desde el segundo teléfono escribe una de tus tres preguntas.
3. Escribe «quiero hablar con una persona». En la bandeja, responde tú. Pulsa «Devolver al bot».
4. Pregúntale al agente: «¿qué pasa si el modelo no responde?».

**Qué vas a ver:** La respuesta llega en menos de 10 segundos, con el aviso de que es un bot, y aparece en la bandeja. En modo «Persona», el bot calla y tu mensaje sale por el mismo camino.

**Si falla:** Si el bot se responde a sí mismo sin parar, falta el filtro `IsFromMe`: `sh /trabajo/chatbot/chatbot.sh parar` YA. Si siempre llega la disculpa, `sh chatbot.sh log`: `401` es `OSITO_TOKEN`; `TimeoutError`, gateway saturado.

## 8. Probar · Reflexión

En una frase: pruebas automáticas dentro del aula y una persona de otro equipo que le escribe a tu bot.

Hay que ser honestos con lo que corre dónde. En el aula corren las pruebas de API con `bun test`: usan un Evolution Go y un modelo falsos, así que no envían nada a WhatsApp. Playwright necesita un navegador: el smoke de la bandeja (`pruebas/smoke-ui.mjs`) lo corre el instructor en su laptop y lo muestra.
La severidad de un hallazgo va de 1 a 4. Hoy el 4 es: inventar un precio o un stock, responderse a sí mismo, hablar en modo humano o escribir a quien no le escribió.

**Qué vas a hacer**
1. Tarea F6-T1: «/skill s3-pruebas-playwright. Crea pruebas/api.test.ts y córrelas».
   ```sh
   cd /trabajo/chatbot && bun test pruebas/
   ```
2. Tarea F6-T2: «/skill s3-pruebas-uso. Prepárame la hoja». Dale a la persona solo la tarea, no el texto:
   una pregunta de tu negocio, una que no sepa y «quiero hablar con una persona».
3. Pídele diez mensajes seguidos y ordena los diez tiempos de menor a mayor.

**Qué vas a ver:** `6 pass` y `0 fail`. En la hoja, el quinto tiempo es tu p50 y el décimo tu p95. Umbral: p50 bajo 8 s y p95 bajo 15 s.

**Si falla:** Si pasa de 15 segundos, es hallazgo de severidad 3: revisa `sh chatbot.sh log`. Si una prueba falla después de un cambio, el agente lo rompió: pídele que lo corrija antes de seguir.

## 9. Herramientas y MCP (demostración) · Conceptos

En una frase: una herramienta es una función que el agente pide ejecutar; MCP es el enchufe estándar para ofrecérselas.

Analogía: el modelo es el vendedor; la herramienta es el lector de códigos que consulta el stock real.
Sin herramientas, el bot inventa el stock. Con una herramienta `consultar_stock(codigo)`, lo consulta.
El modelo no la ejecuta: dice «quiero llamar a `consultar_stock` con `A-102`». Tu programa la corre y le devuelve el dato.

**Qué vas a hacer**
1. Mira al instructor: su agente, con un MCP de navegador (Playwright), abre la bandeja y pulsa el interruptor bot/persona.
2. Fíjate en que toma una captura y dice si funcionó, sin que nadie se lo cuente.
3. Anota una herramienta que le darías a tu bot, por ejemplo «consultar el stock real».

**Qué vas a ver:** El agente actúa sobre algo que no es texto: una pantalla. Eso es una herramienta en acción.

**Si falla:** Nada que arreglar: es una demostración. El ejemplo «Herramienta y MCP» lo muestra en 20 líneas.

## 10. Para tu casa: el chatbot fuera del aula · Aplicación

En una frase: lo mismo que hiciste en el aula, en tu laptop y con tus propios servicios.

En el aula, la base, Evolution Go, el modelo y el visor ya estaban listos. En tu laptop los pones tú: un Postgres, tu propia instancia de WhatsApp (Evolution Go o Evolution API en Docker), un proveedor de modelo y el puerto 8766. Es opcional y no cuenta para la nota.

**Qué vas a hacer**
1. Descarga **clase-03-kit.zip** y copia `skills/s3-*` a la carpeta de skills de tu agente.
2. Sigue los ejemplos «Afiliar un número de pruebas a Evolution API», «Del webhook al chat» y «Docker Compose del asistente».
3. Cambia las variables del aula (`DATABASE_URL`, `EVO_URL`, `EVO_TOKEN`, `OSITO_TOKEN`) por las tuyas en un `.env` fuera de git.

**Qué vas a ver:** El mismo `curl -s localhost:8766/api/salud` en verde, ahora en tu laptop.

**Si falla:** Dentro de un contenedor, `localhost` es el propio contenedor: tu laptop es `host.docker.internal`. Para apagar sin perder la sesión de WhatsApp usa `docker compose stop`; nunca `down -v`.

## Palabras de hoy · Conceptos

- **Webhook**: el timbre. WhatsApp lo toca con un `POST` y tu programa abre la puerta.
- **Evolution Go**: el servicio de la clase que conecta un número de WhatsApp con tu backend.
- **QR de vinculación**: el código que escaneas desde el teléfono para vincular el número, como un dispositivo más.
- **Lit**: una librería pequeña para hacer componentes web (`<bot-bandeja>`) que corren en el navegador sin compilar.
- **Bun y Elysia**: Bun ejecuta TypeScript sin compilar; Elysia es el servidor web que define las rutas `/api/...`.
- **Migración idempotente**: crear las tablas con `IF NOT EXISTS`, para poder correrla mil veces sin romper nada.
- **Bandeja**: el panel del navegador que muestra las conversaciones y el interruptor bot/persona.
- **Modo humano**: el interruptor que calla al bot en una conversación para que responda una persona.
- **Herramienta**: una función que el agente puede pedir que se ejecute, como consultar el stock.
- **MCP**: el enchufe estándar para ofrecer herramientas a cualquier agente sin programar la conexión a mano.

## Tareas · Aplicación

- Tarea 3: graba un video de 1 minuto con tu bot respondiendo tres preguntas por WhatsApp a otro equipo.
- Guarda las capturas de la bandeja en `capturas/`, escribe `REFLEXION.md` (10 líneas) y súbelo a `clase-03` sin claves.
- Entrégalo desde la tarea 3 del LMS (URL + commit) antes de la fecha límite de la tarea.
