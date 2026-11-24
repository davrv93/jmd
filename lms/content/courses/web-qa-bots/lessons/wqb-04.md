---
id: wqb-04
title: "Proyecto final · Tu WhatsApp de QA con Evolution Go y la IA inyectada"
published: true
duration: 45
objectives:
  - {id: wqb-04-o1, title: "Levantar Evolution Go en Docker y vincular tu número por QR"}
  - {id: wqb-04-o2, title: "Entender la inyección de dependencias: el bot recibe la IA y el WhatsApp desde afuera"}
  - {id: wqb-04-o3, title: "Recibir en WhatsApp el archivo, el parche y la prueba sugeridos por la IA que elijas"}
  - {id: wqb-04-o4, title: "Probar el bot con dobles inyectados, sin llave ni teléfono"}
materials:
  - {id: wqb-04-repo, title: "Repo en GitHub · carpetas evolution-go/ y bot-qa/", kind: link, url: https://github.com/davrv93/qa-bots-ejemplos}
  - {id: wqb-04a-video, title: "Video · Tu WhatsApp con Evolution Go (y el error 405)", kind: video, file: materials/grabaciones/wqb-04a-evolution-go.mp4, objective_ids: [wqb-04-o1]}
  - {id: wqb-04b-video, title: "Video · La IA inyectada: del fallo al código sugerido", kind: video, file: materials/grabaciones/wqb-04b-ia-inyectada.mp4, objective_ids: [wqb-04-o2, wqb-04-o3, wqb-04-o4]}
  - {id: wqb-04-prompts, title: "Prompts del paso 6: entender y extender el bot", kind: link, url: https://github.com/davrv93/qa-bots-ejemplos/blob/main/prompts/README.md, objective_ids: [wqb-04-o2]}
  - {id: wqb-04-deepseek, title: "DeepSeek API: primeros pasos (modelo deepseek-flash)", kind: doc, url: https://api-docs.deepseek.com/, objective_ids: [wqb-04-o3]}
cycle:
  - id: ver
    title: Mira los dos videos
    tool: lms
    phase: experiencia
    description: "Primero Evolution Go y el QR; después la IA inyectada, con una sugerencia real de un modelo local."
    check: Viste los dos videos
  - id: levantar
    title: Levanta Evolution Go y vincula tu número
    tool: terminal
    phase: experiencia
    description: "Cambia las cinco claves de `.env`, pon tu número en `NUMEROS_PERMITIDOS` y corre `docker compose --profile whatsapp up -d --build`. Abre http://127.0.0.1:8090 (usuario `admin`) y escanea el QR desde Dispositivos vinculados. El número vinculado es el del bot: escríbele desde otro número que esté en la lista."
    check: El panel dice «conectado» y el bot te contesta «ayuda»
  - id: inyeccion
    title: Qué es la inyección de dependencias
    tool: lms
    phase: conceptualizacion
    description: "Lee `bot-qa/src/app.js` y `bot-qa/src/servidor.js` (o usa el primer prompt del paso 6). `crearApp` recibe la IA y el WhatsApp; solo `servidor.js` lee `.env` y decide cuáles son."
    check: Puedes explicar por qué las pruebas no necesitan llave ni teléfono
  - id: sugerencia
    title: Pídele código por WhatsApp
    tool: whatsapp
    phase: experimentacion
    description: "Con `LLM_PROVEEDOR=falso` primero y luego con `deepseek` (tu llave en `.env`) u `ollama`, escríbele un fallo de la tienda con tus palabras. Revisa la sugerencia antes de aplicarla."
    check: Te llegó la causa, el archivo, el parche y la prueba
  - id: extender
    title: Extiende el bot
    tool: claude-code
    phase: experimentacion
    description: "Con los prompts del paso 6, agrega un proveedor de IA o una regla nueva a `conocimiento.json`, con su prueba. Corre `docker compose --profile whatsapp run --rm --no-deps bot-qa npm test`."
    check: Todas las pruebas pasan, incluida la tuya
  - id: reflexion
    title: ¿Cuánto le crees a la IA?
    tool: lms
    phase: reflexion
    description: "Compara dos sugerencias para el mismo fallo (o con dos IA distintas). Escribe en el hilo qué acertó cada una y qué tuviste que corregir."
    check: Tu comparación aparece en el hilo
---

## Proyecto final · Tu WhatsApp de QA

Le escribes un fallo, o se lo manda un bot que lo encontró solo, y te responde con el **código sugerido**: el
archivo que hay que cambiar, el parche y una prueba de Playwright.

**Tres piezas en Docker:**

- **Postgres** guarda la sesión de WhatsApp.
- **Evolution Go** es la API de WhatsApp, en Go. Se compila desde su fuente con un parche de una línea para el
  error `Client outdated (405)`.
- **bot-qa** recibe los mensajes, busca la regla en `conocimiento.json`, le pasa a la IA solo el trozo de código
  que importa y responde.

**La IA va inyectada:** `LLM_PROVEEDOR=falso | deepseek | ollama | openai | openrouter`, o cualquier API
compatible con OpenAI. Se cambia en `.env`, sin tocar el código. La llave vive solo en `.env` y en el
contenedor: nunca llega al navegador ni a los registros.

**Seguridad:**

- El bot solo responde a los números de `NUMEROS_PERMITIDOS`.
- Ignora los grupos y los mensajes repetidos, y atiende un pedido cada 20 segundos por número.
- El panel pide clave.
- Todos los puertos se abren solo en `127.0.0.1`.

**Entregable final:** la captura de tu WhatsApp con una sugerencia del bot, el nombre de la IA que usaste y
la salida de `npm test` con tu prueba nueva en verde.

## Prompts de esta parte

Pégalos en tu asistente de código (Claude Code, OpenCode, Cursor…) abierto en la carpeta del repositorio. Cada uno dice qué archivo tocar y cómo comprobarlo.

```prompt
# Paso 6 · Proyecto final: el bot QA con la IA inyectada (1 de 3)
Lee bot-qa/src/app.js y bot-qa/src/servidor.js. Explícame en 5 líneas qué es la inyección de
dependencias en este bot: qué recibe crearApp, dónde se decide qué IA y qué WhatsApp se usan,
y por qué las pruebas de bot-qa/test/ no necesitan llave ni teléfono.
```

```prompt
# Paso 6 · Proyecto final: el bot QA con la IA inyectada (2 de 3)
Agrega a bot-qa un proveedor de IA nuevo sin tocar app.js: <nombre> con su URL base compatible
con OpenAI. Solo cambia bot-qa/src/llm/index.js y .env.example. Agrega una prueba en
bot-qa/test/ que compruebe que la fábrica lo elige con LLM_PROVEEDOR=<nombre>. Corre
docker compose run --rm bot-qa npm test y muéstrame que todo pasa.
```

```prompt
# Paso 6 · Proyecto final: el bot QA con la IA inyectada (3 de 3)
Agrega a bot-qa/conocimiento.json la regla <id> de la tienda: qué dice la regla, qué archivo la
implementa y qué función buscar. Luego escribe una prueba en bot-qa/test/ que mande ese fallo por
WhatsApp (con el LLM falso) y compruebe que a la IA le llegó el trozo correcto del archivo.
```

