---
id: g8-01
starts_at: 2026-11-08T19:30:00-05:00
title: "Grupo 8 · Clase 1 · Instalar las herramientas y entender qué hay detrás"
published: true
objectives:
  - id: g8-01-o1
    title: Instalar y comprobar VS Code, Docker y OpenCode en tu máquina
  - id: g8-01-o2
    title: Explicar qué es un agente de IA y qué son un proveedor, un modelo y sus parámetros
  - id: g8-01-o3
    title: Conocer reglas, ahorro de contexto, MCP y las skills, y escribir tu primera skill
recording:
  url: ""
  passcode: ""
repo:
  url: https://github.com/davrv93/jmd
  ref: main
materials:
  - id: g8-01-instalador
    title: "Instalador de todo el curso (Windows, macOS, Linux)"
    kind: repo
    url: https://github.com/davrv93/jmd/tree/main/instalador
    objective_ids: [g8-01-o1]
  - id: g8-01-ppt
    title: Diapositivas de la clase 1 (PowerPoint)
    kind: slides
    file: materials/clase-01-diapositivas.pptx
    slides_dir: materials/clase-01-diapositivas
    objective_ids: [g8-01-o1, g8-01-o2, g8-01-o3]
  - id: g8-01-ppt-pdf
    title: Diapositivas de la clase 1 (PDF)
    kind: pdf
    file: materials/clase-01-diapositivas.pdf
    objective_ids: [g8-01-o1, g8-01-o2, g8-01-o3]
  - id: g8-01-repo
    title: Repositorio del curso · davrv93/jmd (gateway de IA y este LMS)
    kind: repo
    url: https://github.com/davrv93/jmd
    objective_ids: [g8-01-o1]
  - id: g8-01-skills
    title: skills.zip · skills del instructor (landing-editorial) para tus skills
    kind: zip
    file: materials/skills.zip
    objective_ids: [g8-01-o3]
  - id: g8-01-pdf
    title: Clase 1 en PDF (objetivos, ciclo, enlaces, contenido y tarea)
    kind: pdf
    file: materials/clase-01-instalacion-y-conceptos.pdf
    objective_ids: [g8-01-o1, g8-01-o2, g8-01-o3]
  - id: g8-01-m1
    title: OpenCode · documentación e instalación
    kind: doc
    url: https://opencode.ai/docs/
    objective_ids: [g8-01-o1, g8-01-o2, g8-01-o3]
  - id: g8-01-m2
    title: OpenCode · configurar un proveedor propio (OpenAI-compatible)
    kind: doc
    url: https://opencode.ai/docs/providers/
    objective_ids: [g8-01-o1, g8-01-o2]
  - id: g8-01-m3
    title: Descargar Visual Studio Code
    kind: link
    url: https://code.visualstudio.com/download
    objective_ids: [g8-01-o1]
  - id: g8-01-m4
    title: Descargar Docker Desktop
    kind: link
    url: https://www.docker.com/products/docker-desktop/
    objective_ids: [g8-01-o1]
  - id: g8-01-m5
    title: Docker Engine en Linux (sin Desktop)
    kind: doc
    url: https://docs.docker.com/engine/install/
    objective_ids: [g8-01-o1]
  - id: g8-01-m6
    title: WSL en Windows (instalar Ubuntu)
    kind: doc
    url: https://learn.microsoft.com/windows/wsl/install
    objective_ids: [g8-01-o1]
  - id: g8-01-m8
    title: OpenCode · Agent Skills (dónde van y cómo se cargan)
    kind: doc
    url: https://opencode.ai/docs/skills/
    objective_ids: [g8-01-o3]
  - id: g8-01-m9
    title: RTK (Rust Token Killer)
    kind: repo
    url: https://github.com/rtk-ai/rtk
    objective_ids: [g8-01-o3]
  - id: g8-01-m10
    title: caveman (skill de respuestas cortas)
    kind: repo
    url: https://github.com/JuliusBrussee/caveman
    objective_ids: [g8-01-o3]
  - id: g8-01-m11
    title: Model Context Protocol (MCP) · especificación e introducción
    kind: doc
    url: https://modelcontextprotocol.io/
    objective_ids: [g8-01-o3]
  - id: g8-01-m12
    title: Agent Skills · especificación
    kind: doc
    url: https://agentskills.io/
    objective_ids: [g8-01-o3]
  - id: g8-01-m13
    title: Skills de ejemplo de Anthropic (repositorio)
    kind: repo
    url: https://github.com/anthropics/skills
    objective_ids: [g8-01-o3]
  - id: g8-01-m14
    title: OpenRouter · modelos y capa gratuita
    kind: link
    url: https://openrouter.ai/models
    objective_ids: [g8-01-o2]
  - id: g8-01-m15
    title: Google AI Studio (clave de Gemini)
    kind: link
    url: https://aistudio.google.com/
    objective_ids: [g8-01-o2]
cycle:
  - id: ver
    title: Ver la clase
    tool: zoom
    phase: experiencia
    description: Asiste en vivo o mira la grabación. Ten a mano la terminal de VS Code para ir haciendo lo mismo.
    check: Has visto la clase completa (o la grabación)
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
  - id: skill
    title: Escribir tu primera skill
    tool: opencode
    phase: conceptualizacion
    description: Crea `.opencode/skills/saludo/SKILL.md` con `name` y `description` en el front matter y una instrucción corta. Pídele al agente que la use.
    check: El agente responde usando tu skill
  - id: landing-sin-ia
    title: Landing sin IA (reglas y modelo local)
    tool: terminal
    phase: experimentacion
    description: En la terminal del aula, saca negocio.json del texto de un cliente con el extractor por reglas (y el modelo local si está) y construye el sitio con --imagenes no.
    check: El sitio abre en el Visor con los datos correctos del cliente
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

Hoy dejas tu máquina lista para trabajar con un agente de programación: instalas VS Code, Docker
y OpenCode, conectas OpenCode al gateway de la clase y escribes tu primera skill. Al final le pones
nombre a las piezas: agente, proveedor, modelo, parámetros, contexto, MCP y skills.

Clase en vivo: domingo 25-10-2026, 7:30 a 9:30 pm. Si algo falla, no te quedes atrás: pega el
error completo en el hilo de la sesión y sigue con el siguiente paso.

| Bloque | Qué haces | Comprobación |
|---|---|---|
| 1 · VS Code | Instalar y abrir la terminal | `code --version` |
| 2 · Docker | Instalar y correr un contenedor | `docker run --rm hello-world` |
| 3 · OpenCode | Instalar y conectar al gateway | `/models` muestra `clase/auto` |
| 4 · Skill | Escribir `saludo` | El agente responde con tu skill |
| 5 · Práctica | Pedir un script y revisarlo antes de aceptar | `python3 fecha.py` imprime la fecha |
| 6 · Conceptos | Poner nombre a las piezas | Las «Palabras de hoy» |

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

## 4. Tu primera skill · Conceptos

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

## 5. Practica: el agente propone, tú decides · Reflexión

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

## 6. Las piezas, con nombre · Conceptos

| Pieza | Qué es | Analogía |
|---|---|---|
| **Agente** | Pone un modelo en un bucle: decide, usa una herramienta, mira el resultado y repite | Un empleado nuevo con las herramientas de la oficina |
| **Proveedor** | Quien aloja el modelo y lo sirve por una API con clave, cuota y precio | La empresa que te alquila el cerebro |
| **Modelo** | La red entrenada que recibe texto y devuelve texto; lee y cobra en **tokens** | El cerebro; se cambia sin cambiar de agente |
| **Parámetros** | Perillas de cada petición: `temperature` (cuánto improvisa), `max_tokens` (cuánto habla) | Las perillas de una radio |
| **Gateway** | El servidor de la clase: elige el modelo y, si uno falla por cuota, pasa al siguiente | La central telefónica |
| **Contexto** | Todo lo que el modelo tiene delante en una petición; se gasta en tokens | La mesa de trabajo: lo que no cabe, no se ve |
| **MCP** | El enchufe estándar para darle al agente herramientas y datos de fuera | El cargador universal |

**Ahorrar contexto.** El agente gasta en lo que lee y en lo que escribe. Tres hábitos: `/init` dentro de OpenCode crea `AGENTS.md` para que no redescubra tu proyecto cada vez; RTK recorta la salida de los comandos (`rtk gain` muestra lo ahorrado); caveman acorta las respuestas. Hoy basta con `/init`; RTK y caveman están en Materiales.

**MCP, en demostración.** Verás al agente listar cursos y entregar una tarea sin abrir el navegador: herramientas que no vienen de serie (`list_courses`, `submit_assignment`). En `opencode.json` van bajo la clave `mcp`; hoy no lo instalas, solo identifica `type`, `command` y `enabled`.

**Cuando no hay cuota.** El gateway de la clase prueba varios modelos en orden, primero los de pago, luego los gratuitos y, si todos fallan, un modelo pequeño que corre en el propio servidor de la clase. Responde más lento y más corto, pero la clase no se detiene.

## 7. Landing sin IA · Aplicación

En el LIVE, escena **E10**, la landing de un cliente sale sin ningún proveedor externo: reglas programadas sacan los datos del texto y el motor arma el sitio.

1. Pega en el cuadro de la escena lo que te escribió el cliente (o pulsa «poner un ejemplo»).
2. Elige el estilo.
3. Pulsa **Copiar comando**, pégalo en la terminal del aula y pulsa Enter.
4. Abre `/trabajo/landing/sitio-<estilo>/index.html` en el Visor.

**Si falla:** sale `[completar]` → el cliente no dio ese dato (nombre, WhatsApp de 9 dígitos, lista de servicios): agrégalo al texto en el cuadro y vuelve a copiar.

## Palabras de hoy · Conceptos

Agente · Proveedor · Modelo · Token · Parámetros de generación · Gateway · Contexto · `AGENTS.md` · MCP · Skill. Cada una está definida en la tabla de arriba o en los bloques 4 y 6.

## Tareas · Aplicación

- Tarea 1: VS Code, Docker y OpenCode instalados, el gateway conectado y la skill `saludo` escrita.
- Entrega el repositorio `clase-01` con `EVIDENCIA.md` (las tres comprobaciones y una captura de OpenCode respondiendo) y `.opencode/skills/saludo/SKILL.md`.
- Entrégala desde la tarea 1 del LMS (URL + commit) antes de la clase 2, el martes 27-10-2026 a las 7:30 pm.
