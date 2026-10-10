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
    description: Asiste en vivo o mira la grabación. Ten la terminal de VS Code abierta y el teléfono de pruebas del equipo a mano.
    check: Has visto la clase completa (o la grabación)
  - id: wireframe
    title: Wireframe de 3 pantallas
    tool: opencode
    description: Con los skills ux-flujos y ui-componentes, pide al agente un wireframe en gris de tres pantallas (bandeja, conversación, estado del número) y un FLUJOS.md con el flujo feliz y dos de error.
    check: Existen WIREFRAME.html y FLUJOS.md
  - id: bandeja
    title: Panel Bandeja
    tool: opencode
    description: Pasa el wireframe a UI con diseno-visual y accesibilidad. Abre el panel en el navegador y estrecha la ventana hasta 393 px.
    check: El panel se ve a 393 px sin desborde horizontal
  - id: evolution
    title: Levantar Evolution API
    tool: docker
    description: En la carpeta de Evolution, `docker compose up -d`. Tarda un minuto la primera vez porque crea la base de datos.
    check: docker compose ps muestra evolution en verde
  - id: afiliar
    title: Afiliar el número
    tool: terminal
    description: Crea la instancia del equipo, pide el QR y escanéalo con el teléfono de pruebas desde «Dispositivos vinculados».
    check: QR escaneado, instancia conectada (connectionState responde open)
  - id: webhook
    title: Webhook recibido
    tool: terminal
    description: Registra el webhook hacia http://host.docker.internal:8766/api/whatsapp/webhook y escribe «hola» desde el segundo teléfono.
    check: El log del backend muestra el JSON del primer mensaje
  - id: bot
    title: Bot respondiendo
    tool: opencode
    description: Con plan-de-trabajo y obra, pide al agente las dos rutas nuevas (webhook y eventos SSE) y el interruptor humano/bot. Prueba con mensajes reales.
    check: 3 mensajes reales respondidos y visibles en la bandeja
  - id: pruebas
    title: Probar
    tool: terminal
    description: Guion de 3 mensajes con un teléfono real, curl con el JSON grabado contra el webhook y medición de latencia de mensaje a respuesta.
    check: Hoja de hallazgos y latencia p50/p95 anotadas
  - id: desplegar
    title: Desplegar
    tool: docker
    description: docker compose con el backend y Evolution API, secretos en .env fuera de git, `docker compose config` antes de `up -d`.
    check: curl a /api/salud en verde y un mensaje real respondido
  - id: preguntar
    title: Preguntar o responder
    tool: lms
    description: Publica al menos una pregunta sobre la clase en este LMS (abajo) o responde una de un compañero.
    check: Tu pregunta aparece en el hilo de la sesión
  - id: entregar
    title: Entregar la tarea 3
    tool: git
    description: Sube el repositorio clase-03 con el enlace al video, las capturas y REFLEXION.md, y entrégalo desde el LMS (URL + commit).
    check: La entrega aparece en «Mis notas» con estado en cola
---

## Avance de la clase

Hoy el asistente que construiste en la clase 2 sale de tu laptop y empieza a atender por
WhatsApp. El tema es genérico: una tienda que recibe preguntas sobre pedidos, precios y stock.
Al terminar, un cliente escribe al número de pruebas del equipo, el modelo local responde, la
conversación aparece en un panel llamado **Bandeja** y una persona puede tomar el control cuando
quiera. Todo queda levantado con Docker Compose y con una comprobación de salud.

Siete bloques, dos horas:

| Tiempo | Bloque | Qué pasa | Qué sale |
|---|---|---|---|
| 0:00–0:10 | Apertura | La arquitectura en una frase y la demostración del instructor | Nada que entregar |
| 0:10–0:25 | Wireframe | Tres pantallas en gris, flujo feliz y dos de error, con `ux-flujos` y `ui-componentes` | `WIREFRAME.html` y `FLUJOS.md` |
| 0:25–0:40 | UI y UX | Del gris al color con `diseno-visual` y `accesibilidad`; revisión a 393 px | Panel Bandeja visible, sin datos |
| 0:40–1:05 | Afiliación | Evolution API en Docker, instancia, QR, webhook; primer mensaje en el log | Número conectado y webhook recibido |
| 1:05–1:30 | Desarrollo | El webhook llama a `/api/chat` y responde por `sendText`; SSE a la bandeja; interruptor humano/bot | Bot respondiendo y bandeja sincronizada |
| 1:30–1:45 | Pruebas | Tres mensajes reales, `curl` con JSON grabado, latencia; demostración de un MCP | Hoja de hallazgos y p50/p95 |
| 1:45–2:00 | Despliegue | `docker compose` con backend y Evolution, `.env` fuera de git, `/api/salud` | Stack arriba y tarea 3 |

> Si algo no te funciona en clase, no te quedes atrás. Sigue mirando y publica la pregunta en
> el hilo de abajo con el mensaje de error completo. La sección 10 tiene los fallos más comunes.

---

## 1. La arquitectura en una frase

**Un contenedor recibe los mensajes de WhatsApp y los reenvía a tu backend; tu backend pregunta al
modelo local, responde al cliente y avisa a la bandeja.** No hay nada fuera de tu laptop: ni
servidores, ni túneles.

```
 Teléfono        WhatsApp        Evolution API            Tu laptop
 del cliente     (la red)        (Docker, puerto 8080)    (backend en el puerto 8766)
 ┌─────────┐                     ┌──────────────────┐     ┌──────────────────────────────┐
 │ "hola"  │ ──────────────────► │ instancia        │     │                              │
 │         │                     │ "tienda"         │     │ POST /api/whatsapp/webhook   │
 │         │                     │                  │ ──► │   filtra, guarda, y llama a  │
 │         │                     │  webhook hacia   │     │   POST /api/chat (Ollama)    │
 │         │                     │  host.docker.    │     │                              │
 │         │                     │  internal:8766   │ ◄── │ POST /message/sendText/...   │
 │ "Hola,  │ ◄────────────────── │                  │     │                              │
 │ soy el  │                     └──────────────────┘     │ GET /api/whatsapp/eventos    │
 │ bot…"   │                                              │   (SSE) ───► Bandeja         │
 └─────────┘                                              └──────────────────────────────┘
```

Las piezas, una por una:

| Pieza | Qué es | Dónde corre |
|---|---|---|
| **Evolution API** | Un servidor de código abierto que se conecta a WhatsApp como si fuera un «dispositivo vinculado» y expone una API REST: crear instancia, QR, enviar texto, avisar por webhook | Docker, en tu laptop, puerto 8080 |
| **Instancia** | Un número de WhatsApp afiliado. Tiene nombre (`tienda`) y estado (`connecting`, `open`, `close`) | Dentro de Evolution |
| **Webhook** | Una URL tuya a la que Evolution hace `POST` cada vez que pasa algo (llega un mensaje, cambia la conexión) | Tu backend, ruta `/api/whatsapp/webhook` |
| **`/api/chat`** | La ruta que ya tienes desde la clase 2: recibe texto, responde con el modelo local o con la FAQ | Tu backend |
| **`sendText`** | La ruta de Evolution para enviar un mensaje de texto a un número | Evolution |
| **Bandeja** | El panel del frontend que muestra las conversaciones en vivo y el interruptor humano/bot | Tu navegador |
| **SSE** | *Server-Sent Events*: el navegador abre una conexión y el servidor le va empujando eventos. Más simple que WebSockets para «solo recibir» | `/api/whatsapp/eventos` |

### Por qué `host.docker.internal` y no `localhost`

Evolution corre **dentro de un contenedor**. Un contenedor es una pequeña máquina aislada con su
propia red. Cuando algo dentro de él dice `localhost`, se refiere **a sí mismo**, al contenedor,
no a tu laptop. Si registras el webhook como `http://localhost:8766/...`, Evolution intentará
hablar con el puerto 8766 de su propio contenedor, donde no hay nada, y el mensaje nunca llegará.

`host.docker.internal` es el nombre que Docker da a **la máquina que aloja el contenedor**: tu
laptop. Por eso el webhook se registra así:

```
http://host.docker.internal:8766/api/whatsapp/webhook
```

En Docker Desktop (Windows y macOS) ese nombre existe siempre. En Linux hay que declararlo en el
compose del contenedor que lo usa:

```yaml
    extra_hosts:
      - "host.docker.internal:host-gateway"
```

El puerto 8766 es el del backend del asistente (`OSITO_PUERTO=8766 ./arrancar.sh`, como en la
clase 2). Si lo arrancas en otro puerto, cambia la URL.

---

## 2. Reglas de uso de WhatsApp en clase

WhatsApp no es un entorno de pruebas. Un número bloqueado no se recupera en clase. Cuatro reglas:

1. **Solo números de pruebas del equipo.** Nadie afilia su número personal.
2. **Quien escribe al bot sabe que habla con un bot.** El primer mensaje lo dice: «Hola, soy el
   asistente de la tienda. Soy un bot. Puedo…».
3. **Nada de envíos masivos**, listas de contactos ni mensajes a terceros que no estén en el
   aula. El bot solo responde a quien le escribe.
4. **El bot no toma decisiones con efecto** (cobrar, reservar, cancelar). Si el cliente lo pide,
   pasa a una persona. Es la regla 7 de `ux-flujos`: confirmar antes de actuar.

Trae dos teléfonos: el de pruebas, que se afilia, y otro que le escribe.

---

## 3. Wireframe en gris

### Qué es

Un **wireframe** es un dibujo de la pantalla **sin color, sin tipografía final y sin datos
reales**. Cajas grises con etiquetas. Sirve para decidir **qué hay en cada pantalla y en qué
orden**, no cómo se ve. Se hace antes de programar porque mover una caja en un boceto cuesta
diez segundos; moverla en el código, una hora.

Se llama «en gris» a propósito: si le pones color, la conversación se va al color. Primero la
estructura, después la piel.

### Las tres pantallas

Tres como máximo. Las de hoy:

| Pantalla | Qué muestra | Decisión que toma el usuario |
|---|---|---|
| **Bandeja** | Lista de conversaciones: número o nombre, último mensaje, hora, estado (bot / humano / sin responder) | Cuál abrir |
| **Conversación** | Los mensajes de una conversación, el interruptor **humano/bot**, y un campo para escribir cuando el humano toma el control | Dejar al bot o intervenir |
| **Estado del número** | El QR cuando no está conectado; «Conectado como +51…» cuando sí; «Caído, reintentando» cuando no | Volver a vincular |

Mira la **maqueta de la bandeja** en los adjuntos (ábrela en el navegador). Es el resultado al que
apuntamos, pero no la copies: dibuja primero en gris y compara después.

### Flujo feliz y dos de error

El **flujo feliz** es la secuencia mínima cuando todo sale bien. Los **flujos de error** se
escriben **antes** que el feliz, porque son lo que va a pasar en clase. Los dos obligatorios:

1. **Número desconectado.** El teléfono de pruebas se quedó sin batería o se desvinculó. ¿Qué
   ve el operador? ¿Qué puede hacer? ¿Qué pasa con los mensajes que llegan mientras tanto?
2. **El modelo no responde.** Ollama está caído o tarda más de 15 segundos. ¿Qué recibe el
   cliente? ¿Qué ve la bandeja? Regla de la clase 2: **responder siempre**, aunque sea «No estoy
   seguro de eso todavía, te paso con una persona».

Cada error dice qué pasó, por qué y qué hacer, con la acción al lado. Es el principio 6 de
`ux-flujos`.

### Cómo pedírselo al agente

Con los skills `ux-flujos` y `ui-componentes` instalados (vienen en `taller-agentico.zip`), en
OpenCode:

```
Usa los skills ux-flujos y ui-componentes. Diseña el panel «Bandeja» de un asistente de
WhatsApp para una tienda (pedidos, precios, stock). Primero escribe FLUJOS.md con:
la tarea en una frase, el mapa de tareas, el flujo feliz y dos flujos de error
(número desconectado; el modelo no responde). Luego genera WIREFRAME.html: tres
pantallas en gris (bandeja, conversación con interruptor humano/bot, estado del
número), solo cajas y etiquetas, sin color ni datos reales. No programes nada más.
```

Lee `FLUJOS.md` antes de abrir el wireframe. Si el flujo feliz tiene más de cinco pasos, pide
que lo recorte. El **Ejemplo 13** trae la plantilla de `FLUJOS.md` y una lista de comprobación.

---

## 4. De wireframe a UI

Con la estructura decidida, el agente la viste. Tres skills, en este orden:

### `diseno-visual`: tokens primero

Nada de colores sueltos en los componentes. El agente define **tokens** en `:root` (color,
tipografía, espaciado, radios, sombras, movimiento) y los reutiliza. Un color primario, un
acento y los cuatro semánticos (éxito, aviso, error, info). Si tu asistente de la clase 2 ya
tiene tokens, la bandeja usa **los mismos**: es la misma aplicación.

### Responsividad: revisar a 393 px

393 px es el ancho de un teléfono común. La bandeja se va a mirar desde un celular en el
mostrador de la tienda. Pide al agente que la lista y la conversación se apilen en columna y
que el pie de acciones quede siempre visible. Comprobación en Chrome: DevTools, modo
dispositivo, ancho 393. **Sin scroll horizontal.**

### `accesibilidad`: lo mínimo que se entrega

- El interruptor humano/bot es un `<button>` (o un `<input type="checkbox">` con etiqueta), no
  un `div` con `onclick`. Se opera con Tab y Espacio.
- Foco visible: anillo de 2 px, contraste 3:1.
- La lista de mensajes es `role="log"` con `aria-live="polite"`: el lector de pantalla anuncia
  los mensajes nuevos sin robar el foco.
- Ningún estado solo con color: «bot» y «humano» llevan texto, no solo un punto verde o rosa.
- Contraste de texto 4.5:1, medido, no supuesto.

### Microcopy

Textos cortos, con verbo y objeto, siempre de «tú»:

| Mal | Bien |
|---|---|
| «OK» | «Tomar conversación» |
| «Error» | «No se pudo enviar. Revisa la conexión del número y vuelve a intentar.» |
| «Desconectado» | «Número desconectado. Escanea el QR para volver a conectarlo.» |
| «Loading…» | «Esperando al modelo… hasta 10 s» |

Prompt para el agente:

```
Usa diseno-visual y accesibilidad. Convierte WIREFRAME.html en el panel Bandeja real
dentro del frontend del asistente, con los tokens que ya existen. Debe verse bien a
393 px sin desborde, el interruptor humano/bot debe operarse con teclado, la lista de
mensajes lleva role="log". Aún sin datos: deja los estados vacíos con una frase y una
acción. Microcopy en español, de «tú», con verbo y objeto.
```

Resultado del bloque: el panel visible en el navegador, vacío, a 393 px. Los datos llegan en
el bloque 6.

---

## 5. Afiliar el número

### Levantar Evolution API

Evolution API v2 necesita **PostgreSQL** (guarda instancias y mensajes) y **Redis** (caché).
El repositorio oficial trae un `docker-compose.yaml` con los tres servicios (`api`, `redis`,
`evolution-postgres`) más un panel web, y un `.env.example` con todas las variables:
https://github.com/EvolutionAPI/evolution-api. Úsalo como base; no lo escribas de memoria.

Las variables que necesitas tocar (nombres tomados del `.env.example` oficial):

| Variable | Para qué |
|---|---|
| `AUTHENTICATION_API_KEY` | La clave que mandarás en la cabecera `apikey` de cada llamada. Cámbiala |
| `SERVER_URL` | Cómo se ve a sí misma la API: `http://localhost:8080` |
| `DATABASE_PROVIDER` | `postgresql` |
| `DATABASE_CONNECTION_URI` | Cadena de conexión a Postgres, con el **nombre del servicio** como host |
| `CACHE_REDIS_ENABLED` / `CACHE_REDIS_URI` | `true` y `redis://redis:6379/6`, otra vez con el nombre del servicio |

Antes de clase (la red del aula no lo aguanta): `docker compose pull`. En clase:

```bash
cd evolution
docker compose up -d
docker compose ps          # los tres servicios en «running» o «healthy»
docker compose logs -f api # Ctrl+C para salir
```

Si abres http://localhost:8080 y responde un JSON con la versión, está arriba.

### Crear la instancia

Todas las llamadas llevan la cabecera `apikey` con el valor de `AUTHENTICATION_API_KEY`.
Guárdala en una variable de la terminal para no pegarla en cada comando:

```bash
export EVOLUTION_APIKEY="la-clave-de-tu-.env"
export EVOLUTION_URL="http://localhost:8080"
```

```bash
curl -s -X POST "$EVOLUTION_URL/instance/create" \
  -H "apikey: $EVOLUTION_APIKEY" -H "Content-Type: application/json" \
  -d '{"instanceName": "tienda", "qrcode": true, "integration": "WHATSAPP-BAILEYS"}'
```

`instanceName` es el nombre que usarás en todas las demás rutas. `qrcode: true` pide que la
respuesta ya traiga un QR.

### Obtener el QR y escanearlo

```bash
curl -s "$EVOLUTION_URL/instance/connect/tienda" -H "apikey: $EVOLUTION_APIKEY"
```

La respuesta trae `base64`: una imagen PNG codificada (`data:image/png;base64,...`). Pégala en
la barra de direcciones del navegador y aparece el QR. En el teléfono de pruebas: WhatsApp →
Dispositivos vinculados → Vincular un dispositivo → escanear. El QR caduca en menos de un
minuto; si tarda, vuelve a pedirlo.

Comprobación:

```bash
curl -s "$EVOLUTION_URL/instance/connectionState/tienda" -H "apikey: $EVOLUTION_APIKEY"
# {"instance":{"instanceName":"tienda","state":"open"}}
```

`open` es conectado. `connecting` es que aún no escaneaste. `close` es desvinculado.

### Registrar el webhook

Aquí va la URL con `host.docker.internal`, nunca `localhost`:

```bash
curl -s -X POST "$EVOLUTION_URL/webhook/set/tienda" \
  -H "apikey: $EVOLUTION_APIKEY" -H "Content-Type: application/json" \
  -d '{
    "webhook": {
      "enabled": true,
      "url": "http://host.docker.internal:8766/api/whatsapp/webhook",
      "byEvents": false,
      "base64": false,
      "events": ["MESSAGES_UPSERT", "CONNECTION_UPDATE"]
    }
  }'
```

- `MESSAGES_UPSERT` es «llegó o se envió un mensaje». `CONNECTION_UPDATE` es «cambió el estado
  del número». Con dos eventos basta.
- `byEvents: false` manda todo a la misma URL. Con `true`, Evolution añade el evento a la ruta
  (`/messages-upsert`), y tendrías que crear una ruta por evento.
- Si tu versión devuelve 400, prueba el cuerpo sin la envoltura `webhook` (la documentación lo
  muestra así en algunas páginas); revisa la ruta exacta y el cuerpo en la documentación de la
  versión que instalaste.

### El primer mensaje en el log

Arranca el backend del asistente en el puerto 8766 **en tu laptop, no en Docker** (en clase el
backend corre fuera; en el bloque 9 lo meteremos al compose):

```bash
OSITO_PUERTO=8766 ./arrancar.sh
```

Aún no existe la ruta `/api/whatsapp/webhook`, así que el backend responderá 404. No importa:
lo que quieres ver es **que la petición llega**. Desde el segundo teléfono escribe «hola» al
número de pruebas y mira la terminal del backend: debe aparecer una línea con
`POST /api/whatsapp/webhook`. Si no aparece, ve a la sección 10.

### RTK para que el agente no se coma los logs

Los logs de Evolution y del backend son largos. Si en el bloque siguiente le pides al agente
«mira el log y dime qué llegó», se gastará miles de tokens leyendo basura. Con **RTK** encendido
(clase 1), la salida de cada comando se comprime antes de llegar al modelo. Compruébalo con
`rtk gain` al final de la clase.

El **Ejemplo 14** repite este bloque como receta copiable.

---

## 6. Del webhook al chat

### Qué trae el JSON

Cada vez que llega un mensaje, Evolution hace `POST` a tu URL con algo así (recortado):

```json
{
  "event": "messages.upsert",
  "instance": "tienda",
  "data": {
    "key": { "remoteJid": "51999888777@s.whatsapp.net", "fromMe": false, "id": "3EB0..." },
    "pushName": "Cliente",
    "message": { "conversation": "hola, tienen stock del producto A-102?" },
    "messageType": "conversation",
    "messageTimestamp": 1761180000
  },
  "date_time": "2026-10-22T19:40:00.000Z",
  "sender": "51999888777@s.whatsapp.net",
  "server_url": "http://localhost:8080"
}
```

Lo que importa:

| Campo | Qué es |
|---|---|
| `event` | `messages.upsert` cuando es un mensaje; `connection.update` cuando cambia el estado |
| `data.key.remoteJid` | Quién escribe. Termina en `@s.whatsapp.net` si es una persona y en `@g.us` si es un grupo |
| `data.key.fromMe` | `true` si lo mandaste tú (o el bot). **Hay que ignorarlos** o el bot se responde a sí mismo para siempre |
| `data.message.conversation` | El texto. Si no está, el mensaje no es texto (audio, imagen, sticker) |
| `data.pushName` | El nombre que el cliente tiene en WhatsApp. Sirve para la bandeja |

Guarda el primer JSON que recibas en `pruebas/webhook-hola.json`: será tu prueba automática.

### Filtrar antes de responder

Tres filtros, en este orden, y cada uno devuelve `200` con `{"ok": true, "ignorado": "..."}`.
Siempre `200`: si devuelves error, Evolution reintenta y duplicas el trabajo.

1. `event` distinto de `messages.upsert`: ignorar (pero si es `connection.update`, actualiza el
   chip de estado de la bandeja).
2. `fromMe` en `true`: ignorar.
3. `remoteJid` termina en `@g.us`: ignorar. El bot no habla en grupos.
4. Sin `message.conversation`: responder «Por ahora solo entiendo texto» y salir.

### Llamar a `/api/chat` y responder con `sendText`

Lo que queda es texto de una persona. El backend:

1. Guarda el mensaje en la conversación (un diccionario en memoria o un JSON en disco; no hace
   falta base de datos).
2. Si la conversación está en **modo humano**, no responde: solo avisa a la bandeja.
3. Si no, llama a `POST /api/chat` con `{"mensaje": texto, "historial": [...]}` y recibe
   `{"texto", "animo", "fuente"}`.
4. Envía la respuesta con Evolution:

```bash
curl -s -X POST "$EVOLUTION_URL/message/sendText/tienda" \
  -H "apikey: $EVOLUTION_APIKEY" -H "Content-Type: application/json" \
  -d '{"number": "51999888777", "text": "Hola, soy el asistente de la tienda. Soy un bot. Sí, hay stock del A-102."}'
```

`number` es el `remoteJid` sin el `@s.whatsapp.net`. Si tu versión responde 400 con `text`,
prueba `{"number": "...", "textMessage": {"text": "..."}}`, que es la forma que muestra una de
las páginas de la documentación; revisa la ruta exacta en la documentación de tu versión.

El modelo tarda de 3 a 8 segundos. No hagas esperar a Evolution: responde `200` enseguida y
procesa en segundo plano (`BackgroundTasks` en FastAPI). El **Ejemplo 15** tiene el código
mínimo.

### SSE a la bandeja

`GET /api/whatsapp/eventos` devuelve `text/event-stream` y nunca cierra. Cada vez que entra un
mensaje, sale una respuesta o cambia la conexión, el backend escribe una línea:

```
data: {"tipo": "mensaje", "jid": "51999888777@s.whatsapp.net", "de": "cliente", "texto": "hola"}

data: {"tipo": "mensaje", "jid": "51999888777@s.whatsapp.net", "de": "bot", "texto": "Hola, soy…"}

data: {"tipo": "conexion", "estado": "open"}
```

En el navegador, tres líneas:

```js
const fuente = new EventSource('/api/whatsapp/eventos');
fuente.onmessage = (e) => pintar(JSON.parse(e.data));
fuente.onerror = () => mostrarChip('Bandeja desconectada, reintentando…');
```

### Interruptor humano/bot

Un conjunto `modo_humano` con los `remoteJid` que una persona tomó. `POST
/api/whatsapp/conversaciones/{jid}/modo` con `{"modo": "humano"}` o `{"modo": "bot"}`. Mientras
una conversación está en modo humano, el bot **no responde**; lo que escriba la persona desde la
bandeja sale por el mismo `sendText` y se registra igual. Nada sale sin quedar en la bandeja.

Si el asistente tiene estados de ánimo (clase 2), pasa a `escuchando` al recibir y a `hablando`
al responder. Es un detalle, pero hace visible lo que ocurre.

### Cómo pedírselo al agente

Con `plan-de-trabajo` y `obra` (clase 2). Primero el plan, con el **contrato** de las rutas
nuevas; después, un paso a la vez:

```
Usa plan-de-trabajo. Añade al backend FastAPI dos rutas y un interruptor, sin tocar las
rutas existentes:

1. POST /api/whatsapp/webhook. Recibe el JSON de Evolution API. Ignora con 200 si event
   no es messages.upsert, si data.key.fromMe es true o si remoteJid termina en @g.us.
   Si hay data.message.conversation, guarda el mensaje, y si la conversación no está en
   modo humano, llama a POST /api/chat y envía la respuesta con
   POST {EVOLUTION_URL}/message/sendText/{EVOLUTION_INSTANCIA} con cabecera apikey.
   Responde 200 de inmediato y procesa en segundo plano. Nunca devuelvas 500 a Evolution.
2. GET /api/whatsapp/eventos. text/event-stream. Emite {"tipo":"mensaje",...} por cada
   mensaje entrante o saliente y {"tipo":"conexion",...} con connection.update.
3. POST /api/whatsapp/conversaciones/{jid}/modo con {"modo":"humano"|"bot"}.

Configuración por variables de entorno: EVOLUTION_URL, EVOLUTION_APIKEY,
EVOLUTION_INSTANCIA. Pruebas: una con el JSON de pruebas/webhook-hola.json y otra con
fromMe=true que compruebe que no se envía nada. Marca cada paso en la obra al terminar.
```

Modo piedra (o caveman) para que trabaje barato. Lee el diff de cada paso antes de aceptar.
Pregunta que vale oro: «¿qué pasa si Ollama no responde?». La respuesta correcta es un texto de
disculpa al cliente y un evento de error a la bandeja, nunca silencio.

---

## 7. Herramientas y MCP, en 10 líneas

1. Una **herramienta** es una función que el agente puede llamar: `consultar_stock(codigo)`.
2. El modelo no la ejecuta. Dice «quiero llamar a `consultar_stock` con `A-102`».
3. Tu programa la ejecuta, le devuelve el resultado, y el modelo escribe la respuesta con el dato.
4. Sin herramientas el bot inventa el stock. Con herramientas, lo consulta.
5. **MCP** (*Model Context Protocol*) es la forma estándar de ofrecerle varias herramientas a
   cualquier agente, sin programar la integración a mano cada vez.
6. Un **servidor MCP** publica una lista de herramientas con su esquema; el agente las descubre.
7. OpenCode, Claude Code y otros son **clientes MCP**: hablan con cualquier servidor.
8. Hoy no instalas ninguno. Lo ves funcionar una vez.
9. **Demostración del instructor:** el agente, con un MCP de navegador, abre la bandeja, hace
   clic en el interruptor humano/bot, toma una captura y dice si funcionó. Eso es una
   herramienta en acción: el agente actúa sobre algo que no es texto.
10. Si quieres leer cómo se vería `consultar_stock` como herramienta y como MCP, el **Ejemplo
    16** lo muestra en 20 líneas, solo lectura.

---

## 8. Probar

### Con un teléfono real: guion de tres mensajes

Del skill `pruebas-de-uso`: tareas, no funciones. Quien prueba es alguien **de otro equipo**, sin
explicarle nada. Tú observas y anotas.

| # | El cliente escribe | Lo que debe pasar |
|---|---|---|
| 1 | Una pregunta **del corpus** («¿tienen stock del A-102?», «¿cuánto cuesta el envío?») | Respuesta correcta en menos de 10 s, visible en la bandeja |
| 2 | Una pregunta **fuera del corpus** («¿me recomiendas una película?») | El bot dice que no sabe y ofrece lo que sí sabe; no inventa |
| 3 | **Pedir hablar con una persona** («quiero hablar con alguien») | El bot avisa que pasa a una persona; en la bandeja la conversación queda marcada; el operador la toma y responde |

Anota en la hoja de hallazgos: qué escribió, qué respondió, cuánto tardó, y cualquier frase que
el cliente dijo en voz alta. Severidades, como en el skill:

| Severidad | Qué es | Ejemplo de hoy |
|---|---|---|
| 1 | Cosmético | Una tilde, un espacio de más |
| 2 | Menor, molesta | El nombre del cliente no aparece en la bandeja |
| 3 | Mayor, frena | Más de 15 s sin respuesta; el interruptor no se ve en el teléfono |
| 4 | Crítico | El bot responde a sus propios mensajes; inventa un stock que no existe; responde en una conversación en modo humano |

### Automáticas: `curl` con el JSON grabado

El JSON que guardaste en el bloque 6 es tu prueba repetible:

```bash
curl -s -X POST http://127.0.0.1:8766/api/whatsapp/webhook \
  -H "Content-Type: application/json" \
  -d @pruebas/webhook-hola.json
# {"ok": true}
```

Y una segunda copia con `"fromMe": true` que debe devolver `{"ok": true, "ignorado": "propio"}`
sin enviar nada. Pide al agente que las convierta en pruebas de `pytest` con el cliente de
FastAPI, y que simule `sendText` para no mandar mensajes reales en cada corrida.

### Latencia

Del skill `pruebas-de-rendimiento`: fija el umbral antes de medir, tres corridas, percentiles.
Umbral de hoy: **p50 bajo 8 s, p95 bajo 15 s**, con `qwen3:1.7b` en CPU. Lo esperado es de 3 a
8 segundos.

Medir sin herramientas: el backend ya registra cada petición; añade al log el tiempo entre
recibir el webhook y terminar `sendText`. Manda diez mensajes seguidos desde el teléfono, copia
los diez tiempos y ordénalos. El quinto es el p50; el noveno o décimo, el p95. Anótalo en
`MEDICIONES.md` con fecha, máquina y modelo. Más de 15 s es hallazgo de severidad 3.

Si quieres ver cuánto de ese tiempo es el modelo:

```bash
ollama run qwen3:1.7b --verbose "¿Tienen stock del producto A-102?" 2>&1 | grep -E "eval rate|total duration"
```

---

## 9. Desplegar

Desplegar es **sincronizar, hornear, levantar y comprobar**. Nunca solo hacer commit.

### El compose del asistente

Un solo `compose.yaml` con cuatro servicios: tu backend, Evolution, Postgres y Redis. Cuando el
backend también vive en un contenedor, Evolution ya no necesita `host.docker.internal` para
llegarle: los servicios de un mismo compose se ven por **nombre**, así que el webhook pasa a ser
`http://backend:8766/api/whatsapp/webhook`. Lo que sí sigue fuera es **Ollama**, que corre en tu
laptop: el backend lo alcanza con `OSITO_OLLAMA_URL=http://host.docker.internal:11434`.

El **Ejemplo 17** tiene el archivo completo. Lo esencial:

```yaml
services:
  backend:
    build: ./osito
    ports: ["8766:8766"]
    env_file: .env
    extra_hosts: ["host.docker.internal:host-gateway"]
  api:
    image: evoapicloud/evolution-api:latest
    ports: ["127.0.0.1:8080:8080"]
    env_file: .env
    depends_on: [postgres, redis]
  postgres:
    image: postgres:15
  redis:
    image: redis:latest
```

### `.env` fuera de git

Los secretos (`AUTHENTICATION_API_KEY`, la contraseña de Postgres) van en `.env`. Ese archivo
**no se sube**. Lo que se sube es `.env.example`, con los nombres y sin los valores:

```bash
echo ".env" >> .gitignore
cp .env .env.example && sed -i.bak 's/=.*/=/' .env.example && rm .env.example.bak
git status   # .env no debe aparecer
```

### Comprobar antes de levantar

```bash
docker compose config        # imprime el compose resuelto; si hay un error de YAML o una
                             # variable sin valor, lo dice aquí y no a medio arranque
docker compose build backend
docker compose up -d
docker compose ps
```

### Salud en verde

```bash
curl -s http://127.0.0.1:8766/api/salud
# {"ollama": true, "whisper": true, "imagen": "...", "modelo": "qwen3:1.7b", ...}
```

`ollama: false` significa que el backend no alcanza a Ollama: revisa `OSITO_OLLAMA_URL`. Luego
vuelve a registrar el webhook con la URL interna (`http://backend:8766/...`) y manda **un
mensaje real** desde el teléfono. Si responde, está desplegado. Captura de pantalla de la
bandeja con esa conversación: es la evidencia.

Para apagar sin perder la sesión de WhatsApp (vive en el volumen de Postgres):

```bash
docker compose stop        # nunca `down -v`: borra la sesión y tendrías que volver a escanear
```

---

## 10. Si algo falla

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| El webhook no llega al backend | La URL registrada usa `localhost`. Dentro del contenedor, `localhost` es el propio contenedor | Vuelve a registrar con `http://host.docker.internal:8766/...`. En Linux, añade `extra_hosts` al servicio `api` |
| El webhook no llega y la URL es correcta | El backend no está en 8766 o no está arrancado | `curl http://127.0.0.1:8766/api/salud` desde tu laptop |
| El QR no aparece | La instancia no existe, o el contenedor no sale a internet | `connectionState`; `docker compose logs api` |
| El QR aparece pero el teléfono dice «no se pudo vincular» | El QR caducó | Pide otro con `connect` y escanea en menos de un minuto |
| El bot responde a sus propios mensajes sin parar | No filtras `fromMe` | Filtro 2 de la sección 6. Para cortar ya: `docker compose stop api` |
| Ollama no responde | Está caído o cargando el modelo | El asistente cae a la FAQ por embeddings; el chip de salud lo muestra en gris. Se puede seguir |
| Más de 15 s sin respuesta | CPU saturada: dos modelos a la vez, o la imagen generándose | Mide con `--verbose`; cierra lo que no uses; hallazgo de severidad 3 |
| Puerto ocupado | Otro proceso en 8766 o 8080 | `OSITO_PUERTO=8767 ./arrancar.sh` y cambia la URL del webhook; o cambia el puerto publicado de `api` |
| `docker compose up` falla con variable sin valor | Falta algo en `.env` | `docker compose config` te dice cuál |
| Descarga de un modelo quieta | Protocolo xet colgado | Cancela y repite con `HF_HUB_DISABLE_XET=1` |
| El micrófono del asistente no funciona en la bandeja | Chrome solo lo permite en `localhost`, no por IP | Abre `http://localhost:8766`, no la IP |
| `docker compose down -v` y el número se desvinculó | Borraste el volumen de Postgres | Vuelve a crear la instancia y a escanear. La próxima vez, `stop` |

---

## Tareas

**Tarea 3 · Tu asistente responde por WhatsApp** (vence el 29-10-2026, 20 puntos). El
enunciado completo y la rúbrica están en la tarea. Resumen:

1. Un **video de 1 minuto** en el que tu asistente responde **tres preguntas por WhatsApp** a
   un compañero de otro equipo: una del corpus, una fuera del corpus y «quiero hablar con una
   persona».
2. **Capturas de la bandeja** con esas tres conversaciones, en `capturas/`.
3. **`REFLEXION.md`** de 10 líneas: qué hizo el agente solo, qué hubo que corregirle y qué
   aprendiste del curso.
4. Todo en un repositorio `clase-03` (sin `.env`), entregado desde el LMS con URL y SHA.

Esta es la última clase del curso. Lo que te llevas: un asistente que diseñaste antes de
programar, que atiende por un canal real, que probaste con personas y con comandos, y que corre
con un solo `docker compose up`. Y un agente que hizo buena parte del trabajo porque tú supiste
decirle qué, dónde y cómo se comprueba.
