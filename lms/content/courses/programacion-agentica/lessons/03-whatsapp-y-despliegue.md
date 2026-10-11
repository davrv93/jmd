---
id: pa-03
title: "Clase 3 · Llevar el asistente a WhatsApp: wireframe, UI, desarrollo, pruebas y despliegue"
starts_at: 2026-10-22T19:00:00-05:00
published: true
objectives:
  - id: pa-03-o1
    title: "Diseñar antes de programar: wireframe en gris, flujo feliz y flujos de error, y pasarlo a UI con los skills de diseño"
  - id: pa-03-o2
    title: "Afiliar un número de WhatsApp de pruebas a Evolution API por código QR y recibir sus mensajes por webhook en tu laptop"
  - id: pa-03-o3
    title: "Sincronizar el bot con el asistente: el mensaje entra por el webhook, lo responde el modelo local y se refleja en la bandeja; un humano puede tomar la conversación"
  - id: pa-03-o4
    title: "Entender qué es una herramienta del agente y ver un MCP en acción"
  - id: pa-03-o5
    title: "Probar con un teléfono real y pruebas automáticas, y desplegar con Docker Compose con comprobación de salud"
repo:
  url: https://github.com/davrv93/jmd
  ref: main
materials:
  - id: pa-03-temario
    title: Temario del curso (PDF)
    kind: pdf
    file: materials/temario-curso.pdf
    objective_ids: [pa-03-o1, pa-03-o2, pa-03-o3, pa-03-o4, pa-03-o5]
  - id: pa-03-capturas
    title: "Capturas de referencia: bandeja de WhatsApp y landing"
    kind: slides
    file: materials/clase-03-capturas.pdf
    slides_dir: materials/clase-03-capturas
    objective_ids: [pa-03-o1, pa-03-o3]
  - id: pa-03-maqueta
    title: "Maqueta de la bandeja (HTML, ábrela en el navegador)"
    kind: zip
    file: materials/sesion3-bandeja-maqueta.html
    objective_ids: [pa-03-o1, pa-03-o3]
  - id: pa-03-taller
    title: taller-agentico.zip · skills, backend del asistente y maquetas
    kind: zip
    file: materials/taller-agentico.zip
    objective_ids: [pa-03-o1, pa-03-o3, pa-03-o5]
  - id: pa-03-m1
    title: Evolution API · documentación oficial
    kind: doc
    url: https://doc.evolution-api.com/
    objective_ids: [pa-03-o2, pa-03-o3]
  - id: pa-03-m2
    title: Evolution API · repositorio (docker-compose.yaml y .env.example)
    kind: repo
    url: https://github.com/EvolutionAPI/evolution-api
    objective_ids: [pa-03-o2, pa-03-o5]
  - id: pa-03-m3
    title: Docker Compose · documentación
    kind: doc
    url: https://docs.docker.com/compose/
    objective_ids: [pa-03-o5]
  - id: pa-03-m4
    title: host.docker.internal · redes en Docker Desktop
    kind: doc
    url: https://docs.docker.com/desktop/features/networking/
    objective_ids: [pa-03-o2]
  - id: pa-03-m5
    title: Excalidraw (bocetos a mano)
    kind: link
    url: https://excalidraw.com/
    objective_ids: [pa-03-o1]
  - id: pa-03-m6
    title: WCAG 2.2 · referencia rápida
    kind: doc
    url: https://www.w3.org/WAI/WCAG22/quickref/
    objective_ids: [pa-03-o1]
  - id: pa-03-m7
    title: Model Context Protocol (MCP)
    kind: doc
    url: https://modelcontextprotocol.io/
    objective_ids: [pa-03-o4]
cycle:
  - id: ver
    title: Ver la clase
    tool: zoom
    phase: experiencia
    description: Asiste en vivo o mira la grabación. Ten la terminal de VS Code abierta y el teléfono de pruebas del equipo a mano.
    check: Has visto la clase completa (o la grabación)
  - id: wireframe
    title: Wireframe de 3 pantallas
    tool: opencode
    phase: conceptualizacion
    description: Con los skills ux-flujos y ui-componentes, pide al agente un wireframe en gris de tres pantallas (bandeja, conversación, estado del número) y un FLUJOS.md con el flujo feliz y dos de error.
    check: Existen WIREFRAME.html y FLUJOS.md
  - id: bandeja
    title: Panel Bandeja
    tool: opencode
    phase: experiencia
    description: Pasa el wireframe a UI con diseno-visual y accesibilidad. Abre el panel en el navegador y estrecha la ventana hasta 393 px.
    check: El panel se ve a 393 px sin desborde horizontal
  - id: evolution
    title: Levantar Evolution API
    tool: docker
    phase: experiencia
    description: En la carpeta de Evolution, `docker compose up -d`. Tarda un minuto la primera vez porque crea la base de datos.
    check: docker compose ps muestra evolution en verde
  - id: afiliar
    title: Afiliar el número
    tool: terminal
    phase: experiencia
    description: Crea la instancia del equipo, pide el QR y escanéalo con el teléfono de pruebas desde «Dispositivos vinculados».
    check: QR escaneado, instancia conectada (connectionState responde open)
  - id: webhook
    title: Webhook recibido
    tool: terminal
    phase: experiencia
    description: Registra el webhook hacia http://host.docker.internal:8766/api/whatsapp/webhook y escribe «hola» desde el segundo teléfono.
    check: El log del backend muestra el JSON del primer mensaje
  - id: bot
    title: Bot respondiendo
    tool: opencode
    phase: experiencia
    description: Con plan-de-trabajo y obra, pide al agente las dos rutas nuevas (webhook y eventos SSE) y el interruptor humano/bot. Prueba con mensajes reales.
    check: 3 mensajes reales respondidos y visibles en la bandeja
  - id: pruebas
    title: Probar
    tool: terminal
    phase: reflexion
    description: Guion de 3 mensajes con un teléfono real, curl con el JSON grabado contra el webhook y medición de latencia de mensaje a respuesta.
    check: Hoja de hallazgos y latencia p50/p95 anotadas
  - id: desplegar
    title: Desplegar
    tool: docker
    phase: experimentacion
    description: docker compose con el backend y Evolution API, secretos en .env fuera de git, `docker compose config` antes de `up -d`.
    check: curl a /api/salud en verde y un mensaje real respondido
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

Hoy el asistente de la clase 2 sale de tu laptop y empieza a atender por WhatsApp.
Un cliente escribe al número de pruebas del equipo y el modelo local le responde.
La conversación aparece en un panel llamado Bandeja, y una persona puede tomar el control.
Antes de programar, dibujas las pantallas en gris y las vistes con los skills de diseño.
Al final, todo queda levantado con Docker Compose y con una comprobación de salud.

### El ciclo de esta clase

Esta sesión se recorre con el **ciclo de aprendizaje**. Las secciones no van en el orden de las
fases; el título de cada una lleva su fase al final.

| Fase | En esta clase |
|---|---|
| **1 · Experiencia** | Secciones 0, 3, 4 y 5: levantas Evolution API, pasas el wireframe a UI, afilias el número y conectas el webhook al chat. |
| **2 · Reflexión** | Sección 6: pruebas tres mensajes reales y mides cuánto tarda la respuesta. |
| **3 · Conceptos** | Secciones 1, 2 y 7: la arquitectura, las reglas de WhatsApp, el wireframe y MCP. |
| **4 · Aplicación** | Sección 8 y «Tareas»: despliegas y entregas. |

### Bloques de la clase (2 horas)

- Antes de clase, en casa · Evolution API en tu laptop (sección 0).
- 0:00 a 0:10 · Apertura: la arquitectura y las reglas (sección 1).
- 0:10 a 0:25 · Wireframe en gris (sección 2).
- 0:25 a 0:40 · De wireframe a UI (sección 3).
- 0:40 a 1:05 · Afiliar el número y recibir el primer mensaje (sección 4).
- 1:05 a 1:30 · Del webhook al chat (sección 5).
- 1:30 a 1:45 · Probar, y demostración de MCP (secciones 6 y 7).
- 1:45 a 2:00 · Desplegar y tareas (sección 8).

## 0. Antes de la clase: Evolution API en tu laptop · Experiencia

En una frase: dejas descargado en casa el programa que conecta tu laptop con WhatsApp.

Evolution API corre en Docker, en tu laptop, con dos ayudantes: una base de datos y una caché. El repositorio oficial (enlace en Materiales) trae el `docker-compose.yaml` con los tres.

**Qué vas a hacer**
1. Clona el repositorio y entra a la carpeta:
   ```bash
   git clone https://github.com/EvolutionAPI/evolution-api evolution
   cd evolution
   cp .env.example .env
   ```
2. Abre `.env` en VS Code y cambia `AUTHENTICATION_API_KEY` por una clave larga que solo tú conozcas.
   En `DATABASE_CONNECTION_URI`, pon como host el nombre del servicio de Postgres del compose.
3. Baja las imágenes. Pesan y la red del aula no lo aguanta:
   ```bash
   docker compose pull
   ```
**Qué vas a ver:** `docker compose pull` termina sin errores y `docker images` muestra `evolution-api`, `postgres` y `redis`.

**Si falla:** Si `pull` se corta, repítelo: continúa donde quedó. Si dudas con el `.env`, pregunta en el hilo sin pegar la clave.

## 1. Apertura: la arquitectura y las reglas · Conceptos

En una frase: un contenedor recibe los mensajes de WhatsApp y los pasa a tu asistente, que responde.

Analogía: el webhook es el timbre. WhatsApp lo toca y tu programa abre la puerta.

El camino de un mensaje, en cuatro pasos:

- El cliente escribe «hola» al número de pruebas.
- Evolution API (en Docker, puerto 8080) lo recibe y toca el timbre: hace un `POST` a tu backend.
- Tu backend (puerto 8766) pregunta a `/api/chat`, el de la clase 2, y manda la respuesta por Evolution.
- La Bandeja, en tu navegador, muestra la conversación en vivo.

Dentro de un contenedor, `localhost` es el propio contenedor, no tu laptop.
Por eso el timbre se registra en `http://host.docker.internal:8766/api/whatsapp/webhook`: ese nombre es tu laptop.

WhatsApp no es un entorno de pruebas. Un número bloqueado no se recupera en clase. Cuatro reglas:

- Solo números de pruebas del equipo. Nadie afilia su número personal.
- El primer mensaje del bot dice que es un bot.
- Nada de envíos masivos ni mensajes a gente fuera del aula. El bot solo responde a quien le escribe.
- El bot no cobra, reserva ni cancela. Si el cliente lo pide, pasa a una persona.

**Qué vas a hacer**
1. Mira la demostración del instructor: un mensaje real, la respuesta y la Bandeja.
2. Ten a mano dos teléfonos: el de pruebas, que se afilia, y otro que le escribe.

**Qué vas a ver:** En la demo, el mensaje tarda unos segundos y aparece en la Bandeja antes de llegar al teléfono.

**Si falla:** Si no tienes el segundo teléfono, haz pareja con otro equipo: ellos escriben a tu número y tú al suyo.

## 2. Wireframe en gris · Conceptos

En una frase: un wireframe es el dibujo de la pantalla con cajas grises, antes de programarla.

Analogía: es el plano de la tienda antes de poner los muebles. Mover una caja cuesta segundos; mover código, una hora. Va en gris a propósito: con color, la conversación se va al color.

Tres pantallas, no más:

- Bandeja: lista de conversaciones con nombre, último mensaje, hora y estado (bot, humano, sin responder).
- Conversación: los mensajes, el interruptor humano/bot y un campo para escribir cuando una persona toma el control.
- Estado del número: el QR si no está conectado; «Conectado» si sí; «Caído, reintentando» si no.

Antes del camino feliz, escribes dos caminos de error. Son lo que va a pasar en clase:

- El número se desconectó. ¿Qué ve el operador y qué puede hacer?
- El modelo no responde en 15 segundos. ¿Qué recibe el cliente? Siempre algo: nunca silencio.

**Qué vas a hacer**
1. Abre la maqueta de la Bandeja (lo tienes en Materiales) en el navegador. Mírala un minuto y ciérrala.
2. En OpenCode, dentro de `taller-agentico`, escribe:
   ```text
   Usa los skills ux-flujos y ui-componentes. Diseña el panel «Bandeja» de un asistente de WhatsApp para una tienda (pedidos, precios, stock). Primero escribe FLUJOS.md con: la tarea en una frase, el camino feliz y dos caminos de error (número desconectado; el modelo no responde). Luego genera WIREFRAME.html con tres pantallas en gris (bandeja, conversación con interruptor humano/bot, estado del número): solo cajas y etiquetas, sin color ni datos reales. No programes nada más.
   ```
3. Lee `FLUJOS.md`; si el camino feliz pasa de cinco pasos, pide que lo recorte. Abre `WIREFRAME.html` y compara con la maqueta.

**Qué vas a ver:** Tres pantallas grises con cajas y etiquetas. Cada error dice qué pasó y qué hacer, con la acción al lado.

**Si falla:** Si el agente pone colores o datos inventados, dile: «Solo gris, solo cajas, sin datos».

## 3. De wireframe a UI · Experiencia

En una frase: el agente viste el wireframe con color, tipografía y textos, y lo revisas en tamaño de teléfono.

La Bandeja se va a mirar desde un celular en el mostrador. 393 píxeles es el ancho de un teléfono común.
Lo mínimo que se entrega: el interruptor se opera con teclado, nada se indica solo con color y el foco se ve. Los textos van de «tú», con verbo y objeto: «Tomar conversación», no «OK».

**Qué vas a hacer**
1. En OpenCode, escribe:
   ```text
   Usa diseno-visual y accesibilidad. Convierte WIREFRAME.html en el panel Bandeja real dentro del frontend del asistente, con los tokens que ya existen. Debe verse bien a 393 px sin desborde, el interruptor humano/bot debe operarse con teclado y la lista de mensajes lleva role="log". Aún sin datos: deja cada estado vacío con una frase y una acción. Textos en español, de «tú», con verbo y objeto.
   ```
2. Lee el diff antes de aceptar.
3. Arranca el asistente en el puerto 8766 y abre el panel:
   ```bash
   OSITO_PUERTO=8766 bash osito/arrancar.sh
   ```
4. En Chrome, abre `http://localhost:8766`, pulsa F12, activa el modo dispositivo y pon ancho 393.
5. Recorre el panel solo con la tecla Tab y pulsa Espacio sobre el interruptor.

**Qué vas a ver:** El panel vacío, con una frase y una acción por estado. Sin barra de desplazamiento horizontal. El foco se ve al pasar con Tab.

**Si falla:** Si hay desborde a 393 px, pídele al agente que apile la lista y la conversación en una sola columna.

## 4. Afiliar el número y recibir el primer mensaje · Experiencia

En una frase: levantas Evolution API, vinculas el número de pruebas con un QR y haces sonar el timbre.

Una instancia es un número de WhatsApp afiliado; la llamamos `tienda`. Todas las llamadas a Evolution llevan la cabecera `apikey` con tu clave del `.env`.

**Qué vas a hacer**
1. Levanta Evolution API en una segunda terminal y guarda tu clave en dos variables:
   ```bash
   cd evolution
   docker compose up -d
   docker compose ps
   export EVOLUTION_URL="http://localhost:8080"
   export EVOLUTION_APIKEY="la-clave-de-tu-.env"
   ```
2. Crea la instancia:
   ```bash
   curl -s -X POST "$EVOLUTION_URL/instance/create" \
     -H "apikey: $EVOLUTION_APIKEY" -H "Content-Type: application/json" \
     -d '{"instanceName": "tienda", "qrcode": true, "integration": "WHATSAPP-BAILEYS"}'
   ```
3. Pide el QR y guárdalo en un archivo:
   ```bash
   curl -s "$EVOLUTION_URL/instance/connect/tienda" -H "apikey: $EVOLUTION_APIKEY" \
     | python3 -c "import sys,json; print(json.load(sys.stdin)['base64'])" > qr.txt
   ```
4. Abre `qr.txt`, copia todo su contenido y pégalo en la barra de direcciones de Chrome. Aparece el QR.
5. En el teléfono de pruebas: WhatsApp, Dispositivos vinculados, Vincular un dispositivo, escanear. Tienes un minuto.
6. Registra el timbre hacia tu backend:
   ```bash
   curl -s -X POST "$EVOLUTION_URL/webhook/set/tienda" \
     -H "apikey: $EVOLUTION_APIKEY" -H "Content-Type: application/json" \
     -d '{"webhook": {"enabled": true, "url": "http://host.docker.internal:8766/api/whatsapp/webhook", "byEvents": false, "base64": false, "events": ["MESSAGES_UPSERT", "CONNECTION_UPDATE"]}}'
   ```
**Qué vas a ver:** Con el backend de la sección 3 aún corriendo, escribe «hola» desde el segundo teléfono.
En la terminal del backend aparece `POST /api/whatsapp/webhook` con 404: la ruta no existe aún, pero el timbre sonó.
Guarda el JSON de ese primer mensaje en `pruebas/webhook-hola.json`. Comprueba la conexión:

```bash
curl -s "$EVOLUTION_URL/instance/connectionState/tienda" -H "apikey: $EVOLUTION_APIKEY"
```

Debe decir `"state":"open"`.

**Si falla:** Si el QR caduca, repite el paso 3. Si el timbre no suena, revisa que la URL diga `host.docker.internal` y no `localhost`.
En Linux, añade al servicio `api` del compose: `extra_hosts: ["host.docker.internal:host-gateway"]`.

## 5. Del webhook al chat · Experiencia

En una frase: tu agente escribe la ruta que atiende el timbre, responde al cliente y avisa a la Bandeja.

Cuando llega un mensaje, Evolution manda un JSON. Lo que importa de él:

- `data.key.remoteJid`: quién escribe. Termina en `@s.whatsapp.net` si es una persona y en `@g.us` si es un grupo.
- `data.key.fromMe`: `true` si lo mandó el bot. Hay que ignorarlo o el bot se responde solo para siempre.
- `data.message.conversation`: el texto. Si no está, llegó un audio o una imagen.

El backend responde `200` enseguida y trabaja en segundo plano: el modelo tarda de 3 a 8 segundos.
La Bandeja se entera por SSE: el navegador deja una conexión abierta y el servidor le empuja cada evento.
El modo humano es un interruptor por conversación. Mientras está activo, el bot no responde; la persona escribe desde la Bandeja.

**Qué vas a hacer**
1. Activa el modo piedra en OpenCode y pide el plan con las rutas nuevas:
   ```text
   Usa plan-de-trabajo y obra-en-vivo. Añade al backend FastAPI dos rutas y un interruptor, sin tocar las rutas existentes:
   1. POST /api/whatsapp/webhook. Recibe el JSON de Evolution API. Ignora con 200 si event no es messages.upsert, si data.key.fromMe es true o si remoteJid termina en @g.us. Si hay data.message.conversation, guarda el mensaje; si la conversación no está en modo humano, llama a POST /api/chat y envía la respuesta con POST {EVOLUTION_URL}/message/sendText/{EVOLUTION_INSTANCIA} con cabecera apikey y cuerpo {"number", "text"}. Responde 200 de inmediato y procesa en segundo plano. Nunca devuelvas 500 a Evolution.
   2. GET /api/whatsapp/eventos. text/event-stream. Emite {"tipo":"mensaje",...} por cada mensaje entrante o saliente y {"tipo":"conexion",...} con connection.update.
   3. POST /api/whatsapp/conversaciones/{jid}/modo con {"modo":"humano"|"bot"}.
   Configuración por variables de entorno: EVOLUTION_URL, EVOLUTION_APIKEY, EVOLUTION_INSTANCIA. Pruebas: una con pruebas/webhook-hola.json y otra con fromMe=true que compruebe que no se envía nada. Conecta la Bandeja a /api/whatsapp/eventos. Marca cada paso en la obra al terminar.
   ```
2. Lee el diff de cada paso antes de aceptar. Pregunta al agente: «¿qué pasa si Ollama no responde?».
3. Reinicia el backend con las variables de Evolution:
   ```bash
   EVOLUTION_URL=http://localhost:8080 EVOLUTION_APIKEY="$EVOLUTION_APIKEY" EVOLUTION_INSTANCIA=tienda OSITO_PUERTO=8766 bash osito/arrancar.sh
   ```
4. Desde el segundo teléfono escribe «¿tienen stock del producto A-102?».
5. En la Bandeja, pulsa el interruptor a humano y escribe una respuesta tú. Vuelve a bot.

**Qué vas a ver:** El teléfono recibe la respuesta en menos de 10 segundos y la Bandeja la muestra a la vez. En modo humano, el bot calla y tu mensaje sale por el mismo camino.
La respuesta correcta a «¿y si Ollama no responde?» es un texto de disculpa al cliente, nunca silencio.

**Si falla:** Si el bot se responde a sí mismo sin parar, falta el filtro de `fromMe`. Para cortar ya: `docker compose stop api`.
Si `sendText` devuelve 400, revisa la ruta y el cuerpo en la documentación de la versión que instalaste.

## 6. Probar · Reflexión

En una frase: alguien de otro equipo le escribe tres mensajes a tu bot y tú anotas lo que pasa.

No le explicas nada. Observas, anotas literal y mides el tiempo desde su mensaje hasta la respuesta.
La severidad de un hallazgo va de 1 a 4, como en la clase 2. Hoy el 4 es: inventar un stock, responderse a sí mismo o hablar en modo humano.

**Qué vas a hacer**
1. Pídele que escriba una pregunta del corpus, por ejemplo «¿cuánto cuesta el envío?».
2. Pídele una pregunta fuera del corpus, por ejemplo «¿me recomiendas una película?».
3. Pídele que escriba «quiero hablar con una persona». Tú tomas la conversación desde la Bandeja y respondes.
4. Anota por cada mensaje: qué escribió, qué respondió el bot, cuántos segundos tardó y qué dijo en voz alta.
5. Corre la prueba automática con el JSON que guardaste:
   ```bash
   curl -s -X POST http://127.0.0.1:8766/api/whatsapp/webhook \
     -H "Content-Type: application/json" -d @pruebas/webhook-hola.json
   ```
6. Manda diez mensajes seguidos desde el teléfono y ordena los diez tiempos de menor a mayor.

**Qué vas a ver:** Las tres respuestas en menos de 10 segundos; el bot no inventa películas. El `curl` devuelve `{"ok": true}`.
El quinto tiempo ordenado es tu p50 y el noveno tu p95. Umbral: p50 bajo 8 s, p95 bajo 15 s. Anótalos en `MEDICIONES.md`.

**Si falla:** Si pasa de 15 segundos, es hallazgo de severidad 3. Cierra lo que no uses: dos modelos a la vez saturan la CPU.

## 7. Herramientas y MCP (demostración) · Conceptos

En una frase: una herramienta es una función que el agente pide ejecutar; MCP es el enchufe estándar para ofrecérselas.

Analogía: el modelo es el vendedor; la herramienta es el lector de códigos que consulta el stock real.
Sin herramientas, el bot inventa el stock. Con una herramienta `consultar_stock(codigo)`, lo consulta.
El modelo no la ejecuta: dice «quiero llamar a `consultar_stock` con `A-102`». Tu programa la corre y le devuelve el dato.
Un servidor MCP publica su lista de herramientas y OpenCode las descubre solo. Hoy no instalas ninguno: lo ves funcionar.

**Qué vas a hacer**
1. Mira al instructor: su agente, con un MCP de navegador, abre la Bandeja y pulsa el interruptor humano/bot.
2. Fíjate en que toma una captura y dice si funcionó, sin que nadie se lo cuente.
3. Anota una herramienta que le darías a tu bot de tienda, por ejemplo «consultar el stock real».

**Qué vas a ver:** El agente actúa sobre algo que no es texto: una pantalla. Eso es una herramienta en acción.

**Si falla:** Nada que arreglar: es una demostración. Si quieres leer el código, el ejemplo «Herramienta y MCP» lo muestra en 20 líneas.

## 8. Desplegar con Docker Compose · Aplicación

En una frase: dejas el backend y Evolution levantados con un solo comando, con los secretos fuera de git.

Analogía: `docker compose` es la lista de encendido de la tienda. Un comando prende todo en el orden correcto.
Ahora el backend también vive en un contenedor. Los servicios del mismo compose se ven por nombre:
el timbre pasa a ser `http://backend:8766/api/whatsapp/webhook`. Ollama sigue en tu laptop y el backend lo alcanza por `host.docker.internal`.

**Qué vas a hacer**
1. En OpenCode, pide el compose:
   ```text
   Usa el ejemplo «Docker Compose del asistente» como base. Escribe compose.yaml con cuatro servicios: backend (build ./osito, puerto 8766, OSITO_OLLAMA_URL=http://host.docker.internal:11434, extra_hosts host.docker.internal:host-gateway), api (evoapicloud/evolution-api:latest, puerto 127.0.0.1:8080), postgres y redis. Secretos por env_file .env. Crea .env.example con los nombres y sin valores.
   ```
2. Saca `.env` de git y comprueba que no aparece:
   ```bash
   echo ".env" >> .gitignore
   git status
   ```
3. Comprueba el compose y levanta todo:
   ```bash
   docker compose config
   docker compose build backend
   docker compose up -d
   docker compose ps
   ```
4. Mira la salud:
   ```bash
   curl -s http://127.0.0.1:8766/api/salud
   ```
5. Vuelve a registrar el timbre con la URL interna `http://backend:8766/api/whatsapp/webhook` (mismo `curl` de la sección 4).
6. Manda un mensaje real desde el teléfono y toma una captura de la Bandeja con esa conversación.

**Qué vas a ver:** `/api/salud` responde con `"ollama": true`. El teléfono recibe la respuesta. La captura es tu evidencia.

**Si falla:** Si `config` dice que falta una variable, agrégala al `.env`. Si `ollama` sale `false`, revisa `OSITO_OLLAMA_URL`.
Para apagar sin perder la sesión de WhatsApp usa `docker compose stop`; nunca `down -v`.

## Palabras de hoy · Conceptos

- **Webhook**: el timbre. WhatsApp lo toca con un `POST` y tu programa abre la puerta.
- **Evolution API**: el programa, en Docker, que conecta un número de WhatsApp con tu backend.
- **QR de afiliación**: el código que escaneas desde el teléfono para vincular el número, como un dispositivo más.
- **host.docker.internal**: el nombre con el que un contenedor llama a tu laptop. `localhost` ahí es él mismo.
- **Bandeja**: el panel del navegador que muestra las conversaciones en vivo y el interruptor humano/bot.
- **Modo humano**: el interruptor que calla al bot en una conversación para que responda una persona.
- **Herramienta**: una función que el agente puede pedir que se ejecute, como consultar el stock.
- **MCP**: el enchufe estándar para ofrecer herramientas a cualquier agente sin programar la conexión a mano.
- **docker compose**: un archivo que describe varios contenedores y un comando que los levanta juntos.

## Tareas · Aplicación

- Tarea 3: graba un video de 1 minuto con tu bot respondiendo tres preguntas por WhatsApp a otro equipo.
- Guarda las capturas de la Bandeja en `capturas/`, escribe `REFLEXION.md` (10 líneas) y súbelo a `clase-03` sin `.env`.
- Entrégalo desde la tarea 3 del LMS (URL + commit) antes del 29-10-2026 a las 23:59.
