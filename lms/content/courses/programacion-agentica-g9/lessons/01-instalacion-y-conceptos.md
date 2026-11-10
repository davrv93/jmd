---
id: g9-01
starts_at: 2026-12-05T19:00:00-05:00
title: "Grupo 9 · Clase 1 · Tu asistente virtual: herramientas, tipos y primer prototipo"
published: true
objectives:
  - id: g9-01-o1
    title: Instalar y comprobar VS Code, Docker y OpenCode en tu máquina
  - id: g9-01-o2
    title: Distinguir los tipos de asistente virtual y explicar sus piezas (modelo, instrucciones, memoria, herramientas, canal y bucle)
  - id: g9-01-o3
    title: Elegir un camino de integración gratuito y diseñar tu asistente con un primer prototipo en OpenCode
recording:
  url: ""
  passcode: ""
repo:
  url: https://github.com/davrv93/jmd
  ref: main
materials:
  - id: g9-01-instalador
    title: "Instalador de todo el curso (Windows, macOS, Linux)"
    kind: repo
    url: https://github.com/davrv93/jmd/tree/main/instalador
    objective_ids: [g9-01-o1]
  - id: g9-01-ppt
    title: Diapositivas de la clase 1 (PowerPoint)
    kind: slides
    file: materials/clase-01-diapositivas.pptx
    slides_dir: materials/clase-01-diapositivas
    objective_ids: [g9-01-o1, g9-01-o2, g9-01-o3]
  - id: g9-01-ppt-pdf
    title: Diapositivas de la clase 1 (PDF)
    kind: pdf
    file: materials/clase-01-diapositivas.pdf
    objective_ids: [g9-01-o1, g9-01-o2, g9-01-o3]
  - id: g9-01-repo
    title: Repositorio del curso · davrv93/jmd (gateway de IA y este LMS)
    kind: repo
    url: https://github.com/davrv93/jmd
    objective_ids: [g9-01-o1]
  - id: g9-01-skills
    title: skills.zip · skills del instructor (landing-editorial) para tus skills
    kind: zip
    file: materials/skills.zip
    objective_ids: [g9-01-o3]
  - id: g9-01-video
    title: "Video: agente, MCP y skills en 40 segundos"
    kind: file
    file: materials/video-g9-01.mp4
    objective_ids: [g9-01-o2, g9-01-o3]
  - id: g9-01-pdf
    title: Clase 1 en PDF (objetivos, ciclo, enlaces, contenido y tarea)
    kind: pdf
    file: materials/clase-01-instalacion-y-conceptos.pdf
    objective_ids: [g9-01-o1, g9-01-o2, g9-01-o3]
  - id: g9-01-m1
    title: OpenCode · documentación e instalación
    kind: doc
    url: https://opencode.ai/docs/
    objective_ids: [g9-01-o1, g9-01-o2, g9-01-o3]
  - id: g9-01-m2
    title: OpenCode · configurar un proveedor propio (OpenAI-compatible)
    kind: doc
    url: https://opencode.ai/docs/providers/
    objective_ids: [g9-01-o1, g9-01-o2]
  - id: g9-01-m3
    title: Descargar Visual Studio Code
    kind: link
    url: https://code.visualstudio.com/download
    objective_ids: [g9-01-o1]
  - id: g9-01-m4
    title: Descargar Docker Desktop
    kind: link
    url: https://www.docker.com/products/docker-desktop/
    objective_ids: [g9-01-o1]
  - id: g9-01-m5
    title: Docker Engine en Linux (sin Desktop)
    kind: doc
    url: https://docs.docker.com/engine/install/
    objective_ids: [g9-01-o1]
  - id: g9-01-m6
    title: WSL en Windows (instalar Ubuntu)
    kind: doc
    url: https://learn.microsoft.com/windows/wsl/install
    objective_ids: [g9-01-o1]
  - id: g9-01-m8
    title: OpenCode · Agent Skills (dónde van y cómo se cargan)
    kind: doc
    url: https://opencode.ai/docs/skills/
    objective_ids: [g9-01-o3]
  - id: g9-01-m9
    title: RTK (Rust Token Killer)
    kind: repo
    url: https://github.com/rtk-ai/rtk
    objective_ids: [g9-01-o3]
  - id: g9-01-m10
    title: caveman (skill de respuestas cortas)
    kind: repo
    url: https://github.com/JuliusBrussee/caveman
    objective_ids: [g9-01-o3]
  - id: g9-01-m11
    title: Model Context Protocol (MCP) · especificación e introducción
    kind: doc
    url: https://modelcontextprotocol.io/
    objective_ids: [g9-01-o3]
  - id: g9-01-m12
    title: Agent Skills · especificación
    kind: doc
    url: https://agentskills.io/
    objective_ids: [g9-01-o3]
  - id: g9-01-m13
    title: Skills de ejemplo de Anthropic (repositorio)
    kind: repo
    url: https://github.com/anthropics/skills
    objective_ids: [g9-01-o3]
  - id: g9-01-m14
    title: OpenRouter · modelos y capa gratuita
    kind: link
    url: https://openrouter.ai/models
    objective_ids: [g9-01-o2]
  - id: g9-01-m15
    title: Google AI Studio (clave de Gemini)
    kind: link
    url: https://aistudio.google.com/
    objective_ids: [g9-01-o2]
cycle:
  - id: ver
    title: Ver la clase
    tool: zoom
    phase: experiencia
    description: Asiste en vivo o mira la grabación. Ten a mano la terminal de VS Code para ir haciendo lo mismo.
    check: Has visto la clase completa (o la grabación)
  - id: pedir
    title: ¿Qué le pedirías a tu asistente?
    tool: lms
    phase: experiencia
    description: "Piensa en un negocio real y escribe en el muro del LIVE una tarea que le pedirías a su asistente; vota por qué canal te gustaría hablarle."
    check: Tu tarea aparece en el muro de la escena E02
  - id: vscode
    title: Instalar VS Code
    tool: vscode
    phase: experiencia
    description: Instala Visual Studio Code y abre una terminal dentro (Ctrl+ñ / Ctrl+`). En Windows, instala también la extensión WSL si vas a trabajar en Ubuntu.
    check: code --version
  - id: docker
    title: Instalar Docker
    tool: docker
    phase: experiencia
    description: Docker Desktop (Windows y macOS) o Docker Engine (Linux). Reinicia la sesión y comprueba que el demonio responde.
    check: docker run --rm hello-world
  - id: opencode
    title: Instalar OpenCode y conectarlo al gateway
    tool: opencode
    phase: experiencia
    description: Instala OpenCode, configúralo como proveedor propio apuntando al gateway de la clase y elige un modelo.
    check: opencode (arranca) y responde una pregunta
  - id: practicar
    title: Practicar con el agente
    tool: terminal
    phase: reflexion
    description: En una carpeta vacía, pide a OpenCode «crea un script que imprima la fecha y la hora en español» y mira qué archivos crea y qué comandos ejecuta antes de aceptar.
    check: El script existe y corre
  - id: clasificar
    title: Clasificar las tareas por tipo de asistente
    tool: lms
    phase: reflexion
    description: "En el LIVE, asigna a cada tarea su tipo de asistente (reglas, LLM, agente con herramientas, RAG, voz o copiloto) y ubica la tarea que escribiste en el muro."
    check: Clasificaste las tareas de la escena E07 y votaste el tipo de la tuya
  - id: tipos
    title: Tipos, piezas y caminos gratis
    tool: lms
    phase: conceptualizacion
    description: "Conoce los tipos de asistente, sus piezas (modelo, instrucciones de sistema, memoria y contexto, herramientas, canal y bucle) y compara los caminos de integración gratuitos por costo, dificultad y canal."
    check: Elegiste en la escena E11 el camino con el que empiezas tu prototipo
  - id: conceptos
    title: Poner nombre a las piezas
    tool: lms
    phase: conceptualizacion
    description: "Juega la Arena de conceptos en el LIVE: atrapa cada concepto y clasifícalo en su contenedor (tipos de asistente, cómo funciona, integración gratis y herramientas)."
    check: Clasificaste conceptos en la Arena y pulsaste «Lo logré»
  - id: skill
    title: Escribir tu primera skill
    tool: opencode
    phase: experimentacion
    description: Crea `.opencode/skills/saludo/SKILL.md` con `name` y `description` en el front matter y una instrucción corta. Pídele al agente que la use.
    check: El agente responde usando tu skill
  - id: disenar
    title: Diseñar tu asistente y su primer prototipo
    tool: opencode
    phase: experimentacion
    description: "Llena el lienzo del LIVE (negocio, tres tareas, tipo, canal y camino gratis), publícalo y pega en OpenCode el prompt que arma: un asistente.mjs que conversa en la terminal con el gateway de la clase u Ollama."
    check: Tu diseño está en el muro de la escena E15 y el prototipo responde una pregunta de tu negocio
  - id: preguntar
    title: Preguntar o responder
    tool: lms
    phase: reflexion
    description: Publica al menos una pregunta sobre la clase en este LMS (abajo) o responde una de un compañero.
    check: Tu pregunta aparece en el hilo de la sesión
  - id: entregar
    title: Entregar la tarea 1
    tool: git
    phase: experimentacion
    description: Sube tu evidencia a un repositorio y entrégalo desde el LMS (URL + commit).
    check: La entrega aparece en «Mis notas» con estado en cola
---

## Avance de la clase

Hoy empiezas a construir **tu asistente virtual**, el que en la clase 3 atenderá por WhatsApp a un
negocio tuyo. Primero piensas qué le pedirías; luego dejas lista tu máquina (VS Code, Docker y
OpenCode conectado al gateway de la clase); después clasificas las tareas, conoces los tipos de
asistente, cómo funcionan por dentro y por dónde conectarlos gratis; y terminas con tu asistente
diseñado y un primer prototipo que conversa en tu terminal.

Clase en vivo: sábado 05-12-2026, de 7:00 a 9:00 p. m. (hora de Lima). Si algo falla, no te quedes atrás: pega el
error completo en el hilo de la sesión y sigue con el siguiente paso.

| Bloque | Fase | Qué haces | Comprobación |
|---|---|---|---|
| 0 · Tu asistente | Experiencia | Escribir una tarea que le pedirías | Tu tarea en el muro (E02) |
| 1 · VS Code | Experiencia | Instalar y abrir la terminal | `code --version` |
| 2 · Docker | Experiencia | Instalar y correr un contenedor | `docker run --rm hello-world` |
| 3 · OpenCode | Experiencia | Instalar y conectar al gateway | `/models` muestra `clase/auto` |
| 4 · Práctica | Reflexión | Pedir un script y revisarlo antes de aceptar | `python3 fecha.py` imprime la fecha |
| 5 · Clasificar | Reflexión | Ubicar cada tarea en su tipo de asistente | Tareas clasificadas (E07) |
| 6 · Tipos y piezas | Conceptualización | Tipos de asistente, cómo funcionan y caminos gratis | Camino elegido (E11) |
| 7 · Arena | Conceptualización | Poner nombre a las piezas jugando | Conceptos clasificados (E13) |
| 8 · Skill | Experimentación | Escribir `saludo` | El agente responde con tu skill |
| 9 · Tu asistente | Experimentación | Diseñarlo y armar el primer prototipo | Diseño publicado y `node asistente.mjs` responde |

## 0. ¿Qué le pedirías a tu asistente? · Experiencia

Piensa en un negocio real: tuyo, de tu familia o de un cliente. ¿Qué mensajes se repiten? ¿Qué te
quita tiempo? En el LIVE, escena **E02**, escribe en el muro **una tarea** que le pedirías a su
asistente, empezando con un verbo («Responder el precio del pollo y tomar el pedido»), y vota por
qué canal te gustaría hablarle. No hace falta saber programarlo todavía: esa tarea la vas a
clasificar y, al final de la clase, será parte de tu diseño.

## 1. VS Code · Experiencia

El editor del curso: terminal integrada, paleta de comandos y panel de Git, donde ves cada cambio del agente antes de aceptarlo.

1. Instala desde el enlace de Materiales. Windows: *User Installer* 64 bits, marca «Agregar al PATH» e instala la extensión **WSL**. Mac: arrastra la app a *Aplicaciones* y ejecuta en la paleta (`Cmd+Shift+P`) *Shell Command: Install 'code' command in PATH*.
2. Abre la terminal integrada: `Ctrl+ñ` (teclado español) o `` Ctrl+` ``.
3. Comprueba:
   ```bash
   code --version
   ```

**Si falla:** «comando no encontrado» → cierra la terminal y ábrela de nuevo; en Mac repite el paso 1.

## 2. Docker · Experiencia

Docker corre programas empaquetados con todo lo que necesitan, igual en cualquier máquina. En el curso levanta el gateway y, más adelante, el aula de tu chatbot.

1. Windows: en PowerShell como administrador, `wsl --install`, reinicia e instala **Docker Desktop** con «Use WSL 2 based engine»; en *Settings → Resources → WSL integration* activa tu Ubuntu. Mac: **Docker Desktop** de tu procesador. Linux: **Docker Engine** y `sudo usermod -aG docker $USER`, luego cierra y abre sesión.
2. Comprueba:
   ```bash
   docker run --rm hello-world
   ```

**Si falla:** «Cannot connect to the Docker daemon» → abre Docker Desktop y espera a que arranque.

## 3. OpenCode y el gateway de la clase · Experiencia

OpenCode es el agente: lee y escribe archivos, ejecuta comandos y habla con el modelo. No trae modelo propio: lo apuntas al gateway de la clase, que elige el modelo y lleva las cuotas. El instructor te da la URL y tu clave en el hilo de la sesión.

1. Instala (necesitas Node.js 18 o superior):
   ```bash
   npm i -g opencode-ai
   opencode --version
   ```
2. Guarda la clave en una variable, nunca en un archivo:
   ```bash
   export GATEWAY_API_KEY="la-clave-que-te-dio-el-instructor"
   ```
3. Crea `opencode.json` en tu carpeta de trabajo (cambia `baseURL` por la URL de clase):
   ```json
   {
     "$schema": "https://opencode.ai/config.json",
     "provider": {
       "clase": {
         "npm": "@ai-sdk/openai-compatible",
         "name": "Gateway de la clase",
         "options": { "baseURL": "https://URL-DEL-GATEWAY/v1", "apiKey": "{env:GATEWAY_API_KEY}" },
         "models": { "auto": { "name": "auto (lo elige el gateway)" } }
       }
     },
     "model": "clase/auto"
   }
   ```
4. Arranca `opencode` en esa carpeta, escribe `/models` y busca `clase/auto`. Pregúntale «¿qué archivos hay en esta carpeta?» y sal con `/exit`.

**Si falla:** `401` → la clave está mal copiada o la variable no existe en esa terminal. `ECONNREFUSED` → la URL está mal: cópiala del hilo.

## 4. Practica: el agente propone, tú decides · Reflexión

Trabaja siempre en git: si el agente rompe algo, vuelves atrás con un comando. Lee el diff antes de aceptar.

1. Carpeta nueva con git y el agente dentro:
   ```bash
   mkdir practica-01 && cd practica-01 && git init
   opencode
   ```
2. Pídele: «Crea un script que imprima la fecha y la hora en español.»
3. Antes de aceptar, mira qué archivos crea y qué comandos quiere ejecutar. Luego córrelo tú:
   ```bash
   python3 fecha.py
   ```
4. Publica una pregunta en la pestaña **Preguntas** de esta sesión, o responde la de un compañero.

**Si falla:** el script da error → pégale el error completo al agente; arreglarlo es parte del ejercicio.

## 4 bis. Clasifica las tareas · Reflexión

En la escena **E07** eliges qué tipo de asistente resuelve cada tarea: decir el horario (reglas),
entender «¿tienen algo pa' la gripe?» (modelo de lenguaje), consultar el stock y reservar (agente
con herramientas), responder con la carta en PDF (RAG), contestar una llamada (voz) o sugerirte
código (copiloto). Luego ubicas la tarea que escribiste en el muro. Fíjate en esto: el **canal**
(WhatsApp, Telegram, web) no es el tipo, es por dónde llega el mensaje.

## 5. Tipos de asistente, cómo funcionan y caminos gratis · Conceptualización

**Tipos (escena E10).**

| Tipo | Qué hace | Ejemplo | Ojo con |
|---|---|---|---|
| Chatbot con reglas | Menús y palabras clave: si dice X, responde Y | «Marca 1 para horarios» | No entiende lo que no previste |
| Asistente con LLM | Un modelo de lenguaje entiende y redacta | Responde preguntas libres | Puede inventar si no le das datos |
| Agente con herramientas | El modelo decide usar herramientas y repite el bucle | Consulta stock y reserva | Limita qué puede tocar |
| Asistente de voz | Voz a texto, modelo y texto a voz | Contesta el teléfono | La latencia se nota |
| RAG / base de conocimiento | Busca en tus documentos y se los pasa al modelo | Responde con tu carta en PDF | Depende de lo bien que busque |
| Bots de WhatsApp, Telegram o web | El mismo asistente, conectado a un canal | Tu bot en Telegram | El canal pone reglas y, a veces, costos |
| Copiloto | Trabaja a tu lado dentro de otra herramienta | OpenCode en tu terminal | Él propone; tú decides |

En la práctica se mezclan: reglas para lo fijo, modelo para entender y herramientas para actuar.
Así será el chatbot del proyecto final.

**Cómo funciona por dentro.** Todo asistente tiene las mismas piezas: el **modelo** (el cerebro,
en la nube o en tu laptop), las **instrucciones de sistema** (quién es, qué puede y qué no, cómo
habla), la **memoria y el contexto** (la conversación y los datos que le pasas, con un límite), las
**herramientas, MCP y skills** (consultar, guardar, enviar; saber cómo hacer una tarea), el
**canal** (WhatsApp, Telegram, web, voz o terminal) y el **bucle**: recibe, piensa, actúa, mira el
resultado y responde.

**Caminos gratis para integrarlo (escena E11).** Son dos decisiones: qué modelo piensa y qué canal
usa la gente. Los costos y límites cambian: revisa las condiciones vigentes antes de abrir tu
asistente al público.

| Camino | Pone | Costo | Dificultad | Ojo con |
|---|---|---|---|---|
| Gateway de la clase (`clase/auto`) | Modelo | Gratis durante el curso | Baja | Cuota por alumno |
| Ollama (modelo local) | Modelo, sin internet | Gratis | Media | Usa tu RAM; en 8 GB, modelos pequeños. API compatible con OpenAI en `localhost:11434/v1` |
| Capa gratuita de un proveedor (Google AI Studio, modelos `:free` de OpenRouter, Groq…) | Modelo | Gratis con límites | Baja | Topes por minuto y por día; en varias capas gratuitas tus mensajes pueden usarse para mejorar el servicio |
| Chat web propio | Canal web | Gratis | Media | La clave va en el servidor, nunca en el navegador |
| Telegram Bot API | Canal Telegram | Gratis | Baja | El token de @BotFather es un secreto |
| WhatsApp con Evolution API (clase 3) | Canal WhatsApp | Software gratis | Alta | No es la vía oficial: vincula tu número como dispositivo de WhatsApp Web; usa un número de pruebas y no envíes mensajes masivos |
| WhatsApp Cloud API (Meta) | Canal WhatsApp | Con costos y condiciones | Alta | Cuenta de Meta Business y número verificado; responder cuando el cliente escribió primero no se cobra hoy, las plantillas se cobran por mensaje y por país |

La ruta 100 % gratis del curso: hoy, prototipo en la terminal con `clase/auto` u Ollama; en la
clase 2, skills y modelo local; en la clase 3, WhatsApp con Evolution, PostgreSQL y bandeja web.

## 5 bis. Las piezas del agente, con nombre · Conceptos

| Pieza | Qué es | Analogía |
|---|---|---|
| **Agente** | Pone un modelo en un bucle: decide, usa una herramienta, mira el resultado y repite | Un empleado nuevo con las herramientas de la oficina |
| **Proveedor** | Quien aloja el modelo y lo sirve por una API con clave, cuota y precio | La empresa que te alquila el cerebro |
| **Modelo** | La red entrenada que recibe texto y devuelve texto; lee y cobra en **tokens** | El cerebro; se cambia sin cambiar de agente |
| **Parámetros** | Perillas de cada petición: `temperature` (cuánto improvisa), `max_tokens` (cuánto habla) | Las perillas de una radio |
| **Gateway** | El servidor de la clase: elige el modelo y, si uno falla por cuota, pasa al siguiente | La central telefónica |
| **Contexto** | Todo lo que el modelo tiene delante en una petición; se gasta en tokens | La mesa de trabajo: lo que no cabe, no se ve |
| **MCP** | El enchufe estándar para darle al agente herramientas y datos de fuera | El cargador universal |

**Ahorrar contexto (lectura opcional).** El agente gasta en lo que lee y en lo que escribe. Tres hábitos: `/init` dentro de OpenCode crea `AGENTS.md` para que no redescubra tu proyecto cada vez; RTK recorta la salida de los comandos (`rtk gain` muestra lo ahorrado); caveman acorta las respuestas. Hoy basta con `/init`; RTK y caveman están en Materiales.

**MCP, en demostración.** Verás al agente listar cursos y entregar una tarea sin abrir el navegador: herramientas que no vienen de serie (`list_courses`, `submit_assignment`). En `opencode.json` van bajo la clave `mcp`; hoy no lo instalas, solo identifica `type`, `command` y `enabled`.

**Arena de conceptos.** En el LIVE, escena **E13**, eres un robot en la arena: atrapas los conceptos de la clase, los clasificas en su contenedor (tipos de asistente, cómo funciona, integración gratis y herramientas) y, si aciertas, disparas al arco de un compañero.

**Cuando no hay cuota.** El gateway de la clase prueba varios modelos en orden, primero los de pago, luego los gratuitos y, si todos fallan, un modelo pequeño que corre en el propio servidor de la clase. Responde más lento y más corto, pero la clase no se detiene.

## 6. Tu primera skill · Aplicación

Una skill es una carpeta con un `SKILL.md`. El agente lee solo el título de cada una al arrancar y abre la ficha completa cuando tu pedido encaja con la descripción: contexto bajo demanda. Van en `.opencode/skills/<nombre>/` (proyecto) o en `~/.config/opencode/skills/<nombre>/` (usuario).

1. Crea la carpeta:
   ```bash
   mkdir -p .opencode/skills/saludo
   ```
2. Crea `.opencode/skills/saludo/SKILL.md`:
   ```markdown
   ---
   name: saludo
   description: Saluda al alumno por su nombre y le dice qué clase toca. Úsala cuando pidan «salúdame» o «qué toca hoy».
   ---
   Pregunta el nombre si no lo sabes. Responde en español, en dos líneas:
   1. Un saludo con el nombre.
   2. La clase de hoy, leída de `clases.md` si existe; si no, di que no hay archivo.
   ```
3. Arranca `opencode` en esa carpeta y escribe `salúdame`.

**Si falla:** el agente no usa la skill → revisa que `name` coincide con la carpeta y que `description` dice cuándo usarla. Reinicia `opencode`: las skills se leen al arrancar.

## 7. Diseña tu asistente y arma el primer prototipo · Experimentación

En el LIVE, escena **E15**, llenas el lienzo de tu asistente: **negocio**, **tres tareas**,
**tipo**, **canal**, **camino gratis** para hoy, tono y lo que nunca debe hacer. Pulsa
**Publicar mi diseño**: queda en el muro del grupo y como evidencia de la escena.

La escena arma con tus datos un prompt para OpenCode. Pruébalo:

```bash
mkdir mi-asistente && cd mi-asistente && git init
opencode          # pega el prompt; pide el plan antes de crear archivos
node asistente.mjs
```

El prototipo es un `asistente.mjs` sin dependencias que conversa en la terminal, lee sus
instrucciones de sistema de `instrucciones.md` y llama a una API compatible con OpenAI: el gateway
de la clase o Ollama en `http://localhost:11434/v1`. URL, modelo y clave van en variables de
entorno, nunca en un archivo. Si eliges Ollama, descarga antes un modelo pequeño
(`ollama pull qwen2.5:3b`).

**Si falla:** `401` → la variable de la clave no existe en esa terminal. `ECONNREFUSED` con Ollama →
abre la app de Ollama o corre `ollama serve`. Responde cosas de otro negocio → revisa
`instrucciones.md`: ahí van las tareas y los límites.

## Palabras de hoy · Conceptos

Asistente virtual · Chatbot con reglas · LLM · Agente · RAG · Copiloto · Instrucciones de sistema · Memoria y contexto · Canal · Bucle · Proveedor · Modelo · Gateway · MCP · Skill. Cada una está definida en los bloques 5, 5 bis y 6.

## Tareas · Aplicación

- Tarea 1: VS Code, Docker y OpenCode instalados, el gateway conectado y la skill `saludo` escrita.
- Entrega el repositorio `clase-01` con `EVIDENCIA.md` (las tres comprobaciones y una captura de OpenCode respondiendo) y `.opencode/skills/saludo/SKILL.md`.
- Recomendado: suma al repositorio la carpeta `mi-asistente/` con `instrucciones.md` y el prototipo; es la base del chatbot de WhatsApp del proyecto final.
- Entrégala desde la tarea 1 del LMS (URL + commit) antes de la clase 2.
