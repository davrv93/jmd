# PLAN DE TRABAJO: <<NOMBRE_DEL_BOT>>, el chatbot de WhatsApp de <<NEGOCIO>>

Estados válidos: pendiente · en curso · hecha · bloqueada (motivo)
Avance: 0 de 15 tareas hechas (0 %)
Tiempo: construcción F0 a F5 ≈ 78 min · pruebas F6 ≈ 12 min · total ≈ 90 min · una sola tarea «en curso» a la vez

## Prompt para tu agente

Abre `jmd` en la terminal de tu aula y pega esto tal cual (también está en `PROMPT_ARMAR_CHATBOT.md`):

```text
Eres mi ingeniero de software en el aula. Vamos a construir MI chatbot de WhatsApp desde cero, tarea por tarea.

1. Lee /trabajo/plan-chatbot/PLAN_TRABAJO.md y /trabajo/plan-chatbot/INDICACIONES.md. Lee la skill s3-chatbot-aula. No escribas código todavía.
2. Hazme estas 5 preguntas, UNA por una, y espera cada respuesta: (a) nombre del bot, (b) mi negocio en una frase, (c) tono, (d) color principal en hexadecimal, (e) tres preguntas frecuentes de mi negocio con su respuesta.
3. Reescribe /trabajo/plan-chatbot/PLAN_TRABAJO.md: cambia cada marcador en MAYÚSCULAS entre dobles flechas por mi valor (en «Personaliza aquí» llena la columna «Tu valor»). Conserva IDs, criterios y tiempos. Enséñame el plan y espera mi «ok».
4. Construye en /trabajo/chatbot, UNA tarea a la vez y en orden. Antes de cada tarea lee la skill s3-* que indica el plan.
5. Usa solo lo que ya existe en el aula: bun con elysia y postgres ya instalados, psql, Evolution Go ($EVO_URL, $EVO_TOKEN), tu Postgres ($DATABASE_URL), el modelo "clase" ($JMD_URL, $OSITO_TOKEN). No instales otros paquetes ni imprimas claves.
6. Al terminar cada tarea ejecuta su criterio de aceptación y pégame la salida. Si falla, corrige y repite; no avances.
7. Solo si el criterio da sí, marca la tarea «hecha» en el plan con la hora y empieza la siguiente.
8. Reglas: español, respuestas cortas, rutas absolutas, sin bash (usa sh), nunca llames a /instance/connect (para el QR uso `aula whatsapp`), nunca escribas a un número que no te escribió.

Empieza ahora por el paso 1 y la primera pregunta.
```

## Personaliza aquí

El agente te pregunta estos datos y los escribe en la columna «Tu valor».

| Dato | Qué poner | Ejemplo (bórralo) | Tu valor |
|---|---|---|---|
| `NOMBRE_DEL_BOT` | Nombre corto | Lía | |
| `NEGOCIO` | A qué te dedicas, en una frase | Panadería La Espiga, en Lima | |
| `TONO` | Cómo habla, en tres palabras | cercano y breve | |
| `COLOR` | Color principal en hexadecimal | #0f766e | |
| `TRES_PREGUNTAS` | Tres preguntas que siempre te hacen (PREGUNTA_1, 2 y 3), cada una con su respuesta | ¿Hacen delivery? Sí, en Miraflores y San Isidro. | |

## Alcance

**Hecho significa:** alguien de otro equipo escribe al número de pruebas una de tus tres preguntas y en menos de 10 s recibe tu dato, con el aviso de que habla con un bot. La conversación aparece en tu bandeja (Lit, en el visor). Si escribe «quiero hablar con una persona», la etiqueta pasa a «Persona», el bot calla y tú respondes desde la bandeja. Si el modelo no responde, el cliente recibe una disculpa, nunca silencio.

**No entra:** audios, imágenes, grupos, envíos masivos, mensajes a quien no te escribió, cobrar, reservar, cuentas de usuario, desplegar fuera del aula.

## Contrato (se cierra antes de construir)

| Ruta | Entra | Sale |
|---|---|---|
| `GET /api/salud` | nada | `{ok, db, llm, whatsapp}` |
| `GET /api/conversaciones` | nada | `[{id, nombre, jid, modo, no_leidos, ultimo}]` |
| `GET /api/mensajes` | `?conversacion=ID&desde=ID` | `[{id, autor, texto, estado, creado}]` |
| `POST /api/conversaciones/:id/modo` | `{modo: "bot" o "humano"}` | `{id, modo}` |
| `POST /api/enviar` | `{conversacion, texto}` | el mensaje guardado (502 si WhatsApp no lo aceptó) |
| `POST /api/webhook` | JSON de Evolution Go (`event: "Message"`) | `{ok: true}` al instante |
| `GET /api/whatsapp/estado` | nada | `{conectado, sesion, nombre}` |
| `GET /api/whatsapp/qr` | nada | `{conectado, qr, mensaje}` |

Servicios del aula (ver `s3-chatbot-aula`): Postgres en `$DATABASE_URL`; Evolution Go en `$EVO_URL` con la cabecera `apikey: $EVO_TOKEN`; modelo `clase` en `$JMD_URL` con `Bearer $OSITO_TOKEN`. El visor reenvía `/vista/<tú>/api/...` a tu puerto 8766.

## Fase 0: Preparación

Hito: el plan es tuyo y el aula responde (8 min).

| ID | Tarea | Criterio de aceptación | Min | Depende de | Estado | Cerrada |
|---|---|---|---|---|---|---|
| F0-T1 | Personalizar este plan con tus datos | `grep -c '<<[A-Z0-9_]*>>' /trabajo/plan-chatbot/PLAN_TRABAJO.md` imprime `0` | 4 | — | pendiente | |
| F0-T2 | Comprobar el aula y crear la carpeta del chatbot | Los 4 comandos de abajo dan lo esperado | 4 | F0-T1 | pendiente | |

**F0-T1** · Pega el prompt de arriba y responde las 5 preguntas.

**F0-T2** · Pídele: «/skill s3-chatbot-aula. Crea /trabajo/chatbot con package.json, chatbot.sh, api.js, index.html con mi color y copia recursos y pruebas».
```sh
test -n "$DATABASE_URL" && test -n "$EVO_TOKEN" && test -n "$OSITO_TOKEN" && echo variables-ok   # variables-ok
psql "$DATABASE_URL" -tAc 'select 1'                                                               # 1
bun --version                                                                                      # 1.x
ls /trabajo/chatbot/recursos /trabajo/chatbot/pruebas                                              # logo-bot.svg … webhook-hola.json
```

## Fase 1: Diseñar antes de programar

Hito: mostrar a un compañero, en 1 minuto, el flujo feliz y un error en el prototipo (14 min).

| ID | Tarea | Criterio de aceptación | Min | Depende de | Estado | Cerrada |
|---|---|---|---|---|---|---|
| F1-T1 | Flujos y wireframe en gris de 3 pantallas | `grep -c 'data-pantalla' /trabajo/chatbot/wireframe/index.html` da `3` y `FLUJOS.md` tiene 3 errores | 7 | F0-T2 | pendiente | |
| F1-T2 | Prototipo navegable con tu color | En el visor, `chatbot/prototipo` recorre bandeja → conversación → persona → número sin JavaScript y sin barra horizontal en «Móvil» | 7 | F1-T1 | pendiente | |

**F1-T1** · Pídele: «/skill s3-wireframe. Escribe FLUJOS.md y wireframe/index.html para <<NEGOCIO>>».
```sh
grep -c 'data-pantalla' /trabajo/chatbot/wireframe/index.html     # 3
grep -c '^## Error' /trabajo/chatbot/FLUJOS.md                    # 3
```
Ábrelo en el visor: `chatbot/wireframe`. Solo gris, solo cajas.

**F1-T2** · Pídele: «/skill s3-prototipo. Pasa el wireframe a prototipo con <<COLOR>> y mis tres preguntas como ejemplos».
```sh
grep -o 'href="#' /trabajo/chatbot/prototipo/index.html | wc -l   # 10 o más
```

## Fase 2: Vincular WhatsApp

Hito: mostrar a un compañero, en 1 minuto, el número de pruebas «Conectado» (8 min).

| ID | Tarea | Criterio de aceptación | Min | Depende de | Estado | Cerrada |
|---|---|---|---|---|---|---|
| F2-T1 | Escanear el QR con el teléfono de pruebas | `curl` a `/instance/status` dice `"LoggedIn":true` | 5 | F0-T2 | pendiente | |
| F2-T2 | Cliente de Evolution Go (`evo.ts`) | `bun -e` con `estado()` imprime `sesion: true` | 3 | F2-T1 | pendiente | |

**F2-T1** · Pídele: «/skill s3-whatsapp-qr. Guíame para vincular el número». Tú: `aula whatsapp`, abre `qr.png` en el visor, escanea desde Dispositivos vinculados.
```sh
curl -s -H "apikey: $EVO_TOKEN" "$EVO_URL/instance/status"        # "LoggedIn":true
```

**F2-T2** · Pídele: «/skill s3-whatsapp-qr. Crea evo.ts y bot-qr.js».
```sh
cd /trabajo/chatbot && bun -e 'import {estado} from "./evo"; console.log(await estado())'   # sesion: true
```

## Fase 3: Datos y API

Hito: mostrar a un compañero, en 1 minuto, el primer «hola» real guardado en tu base (20 min).

| ID | Tarea | Criterio de aceptación | Min | Depende de | Estado | Cerrada |
|---|---|---|---|---|---|---|
| F3-T1 | Esquema en Postgres con migración idempotente | La migración corre dos veces y la consulta de tablas da `3` | 6 | F0-T2 | pendiente | |
| F3-T2 | Backend Bun + Elysia en el 8766 | `salud` da `"db":true,"llm":true` y un cuerpo vacío en `/api/enviar` da `422` | 10 | F3-T1, F2-T2 | pendiente | |
| F3-T3 | Recibir el primer mensaje real | Escribes «hola» desde OTRO teléfono y aparece en `/api/conversaciones` | 4 | F3-T2 | pendiente | |

**F3-T1** · Pídele: «/skill s3-postgres. Crea db.ts y corre la migración».
```sh
cd /trabajo/chatbot && bun -e 'import {migrar,sql} from "./db"; await migrar(); await migrar(); await sql.close(); console.log("ok")'
psql "$DATABASE_URL" -tAc "select count(*) from information_schema.tables where table_name in ('contactos','conversaciones','mensajes')"   # 3
```

**F3-T2** · Pídele: «/skill s3-back-elysia. Crea negocio.json con mis datos, bot.ts mínimo y servidor.ts; arranca con chatbot.sh».
```sh
sh /trabajo/chatbot/chatbot.sh arrancar                                  # arrancado en 8766
curl -s localhost:8766/api/salud                                         # "db":true,"llm":true
curl -s -o /dev/null -w '%{http_code}\n' -X POST localhost:8766/api/enviar -H 'Content-Type: application/json' -d '{"conversacion":1,"texto":""}'   # 422
```

**F3-T3** · Desde el segundo teléfono, escribe «hola» al número de pruebas.
```sh
curl -s localhost:8766/api/conversaciones          # aparece tu contacto con no_leidos 1
```
Si no llega en 10 s: `sh /trabajo/chatbot/chatbot.sh log` y revisa `s3-whatsapp-qr`.

## Fase 4: La bandeja en Lit

Hito: mostrar a un compañero, en 1 minuto, la bandeja en «Móvil» con tu conversación (14 min).

| ID | Tarea | Criterio de aceptación | Min | Depende de | Estado | Cerrada |
|---|---|---|---|---|---|---|
| F4-T1 | Bandeja y chat (Lit desde esm.sh) | En el visor `chatbot` lista tu conversación; al abrirla se ven los mensajes; a 393 px una columna sin barra horizontal | 10 | F3-T3 | pendiente | |
| F4-T2 | Estado del número en la cabecera | La cabecera dice «Conectado · …»; sin sesión aparece «Mostrar QR» | 4 | F4-T1 | pendiente | |

**F4-T1** · Pídele: «/skill s3-front-lit. Crea app.js, bot-bandeja.js y bot-chat.js con mi color». Prueba: abre `chatbot` en el visor, pulsa «Móvil», recorre con Tab.

**F4-T2** · Pídele: «/skill s3-whatsapp-qr. Pon bot-qr en la cabecera». Prueba: la consola del visor sin errores.

## Fase 5: El bot responde y una persona puede tomar la conversación

Hito: mostrar a un compañero, en 1 minuto, una respuesta real con tu dato y la toma humana (14 min).

| ID | Tarea | Criterio de aceptación | Min | Depende de | Estado | Cerrada |
|---|---|---|---|---|---|---|
| F5-T1 | Webhook → modelo `clase` → WhatsApp → bandeja | Escribes <<PREGUNTA_1>> desde el otro teléfono y en menos de 10 s llega tu dato con el aviso de bot | 8 | F4-T1 | pendiente | |
| F5-T2 | Toma humana por conversación | «quiero hablar con una persona» pasa a «Persona», el bot calla, tu respuesta desde la bandeja llega al teléfono | 6 | F5-T1 | pendiente | |

**F5-T1** · Pídele: «/skill s3-integracion. Reemplaza bot.ts y reinicia». Servicio: modelo `clase` con razonamiento apagado (1 a 4 s).
```sh
sh /trabajo/chatbot/chatbot.sh reiniciar
psql "$DATABASE_URL" -tAc "select autor, estado, left(texto, 60) from mensajes order by id desc limit 2"   # bot|ok|… y cliente|ok|…
```

**F5-T2** · Prueba en el teléfono y en la bandeja; vuelve a «Devolver al bot» al terminar.

## Fase 6: Probar

Hito: mostrar la hoja de pruebas y los tiempos de tu equipo (12 min).

| ID | Tarea | Criterio de aceptación | Min | Depende de | Estado | Cerrada |
|---|---|---|---|---|---|---|
| F6-T1 | Pruebas de API con `bun test` | `bun test pruebas/` da `6 pass` y `0 fail` | 5 | F5-T2 | pendiente | |
| F6-T2 | Prueba de uso con una persona de otro equipo | `PRUEBAS_DE_USO.md` con 3 tareas, tiempos, p50 y p95 y UNA mejora; cero hallazgos de severidad 4 | 7 | F6-T1 | pendiente | |

**F6-T1** · Pídele: «/skill s3-pruebas-playwright. Crea pruebas/api.test.ts y córrelas».
```sh
cd /trabajo/chatbot && bun test pruebas/; echo "código=$?"      # 6 pass, 0 fail, código=0
```
El smoke de Playwright (`pruebas/smoke-ui.mjs`) lo corre el instructor fuera del aula.

**F6-T2** · Pídele: «/skill s3-pruebas-uso. Prepárame la hoja y guarda los resultados en PRUEBAS_DE_USO.md».

## Tiempos esperados

| Paso | Tiempo | Tu medición |
|---|---|---|
| Webhook responde a Evolution | menos de 0,1 s | |
| Modelo `clase` (razonamiento apagado) | 1 a 4 s | |
| Envío por WhatsApp hasta el teléfono | 1 a 2 s | |
| De mensaje a respuesta (p50 / p95) | bajo 8 s / bajo 15 s | |
| La bandeja muestra el mensaje | 2 a 3 s (sondeo) | |

## Lista de verificación final

- [ ] `grep -c '<<[A-Z0-9_]*>>' /trabajo/plan-chatbot/PLAN_TRABAJO.md` imprime `0`
- [ ] `curl -s localhost:8766/api/salud` da `"db":true,"llm":true,"whatsapp":true`
- [ ] El primer mensaje del bot dice que es un bot
- [ ] «quiero hablar con una persona» apaga el bot de esa conversación
- [ ] `bun test pruebas/` en verde
- [ ] `PRUEBAS_DE_USO.md` sin hallazgos de severidad 4
- [ ] Ningún archivo contiene claves: `grep -n "TOKEN=" /trabajo/chatbot/*.ts /trabajo/chatbot/*.js /trabajo/chatbot/*.json` no imprime nada
