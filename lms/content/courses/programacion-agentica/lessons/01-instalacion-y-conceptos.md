---
id: pa-01
title: Clase 1 · Instalar las herramientas y entender qué hay detrás
starts_at: 2026-10-08T19:00:00-05:00
published: true
objectives:
  - id: pa-01-o1
    title: Instalar y comprobar VS Code, Docker y OpenCode en tu máquina
  - id: pa-01-o2
    title: Explicar qué es un agente de IA y qué son un proveedor, un modelo y sus parámetros
  - id: pa-01-o3
    title: Conocer reglas, ahorro de contexto, MCP y las skills, y escribir tu primera skill
recording:
  url: ""
  passcode: ""
repo:
  url: https://github.com/davrv93/jmd
  ref: main
materials:
  - id: pa-01-ppt
    title: Diapositivas de la clase 1 (PowerPoint)
    kind: slides
    file: materials/clase-01-diapositivas.pptx
    slides_dir: materials/clase-01-diapositivas
    objective_ids: [pa-01-o1, pa-01-o2, pa-01-o3]
  - id: pa-01-ppt-pdf
    title: Diapositivas de la clase 1 (PDF)
    kind: pdf
    file: materials/clase-01-diapositivas.pdf
    objective_ids: [pa-01-o1, pa-01-o2, pa-01-o3]
  - id: pa-01-repo
    title: Repositorio del curso · davrv93/jmd (gateway de IA y este LMS)
    kind: repo
    url: https://github.com/davrv93/jmd
    objective_ids: [pa-01-o1]
  - id: pa-01-skills
    title: skills.zip · skills del instructor (landing-editorial) para tus skills
    kind: zip
    file: materials/skills.zip
    objective_ids: [pa-01-o3]
  - id: pa-01-pdf
    title: Clase 1 en PDF (objetivos, ciclo, enlaces, contenido y tarea)
    kind: pdf
    file: materials/clase-01-instalacion-y-conceptos.pdf
    objective_ids: [pa-01-o1, pa-01-o2, pa-01-o3]
  - id: pa-01-m1
    title: OpenCode · documentación e instalación
    kind: doc
    url: https://opencode.ai/docs/
    objective_ids: [pa-01-o1, pa-01-o2, pa-01-o3]
  - id: pa-01-m2
    title: OpenCode · configurar un proveedor propio (OpenAI-compatible)
    kind: doc
    url: https://opencode.ai/docs/providers/
    objective_ids: [pa-01-o1, pa-01-o2]
  - id: pa-01-m3
    title: Descargar Visual Studio Code
    kind: link
    url: https://code.visualstudio.com/download
    objective_ids: [pa-01-o1]
  - id: pa-01-m4
    title: Descargar Docker Desktop
    kind: link
    url: https://www.docker.com/products/docker-desktop/
    objective_ids: [pa-01-o1]
  - id: pa-01-m5
    title: Docker Engine en Linux (sin Desktop)
    kind: doc
    url: https://docs.docker.com/engine/install/
    objective_ids: [pa-01-o1]
  - id: pa-01-m6
    title: WSL en Windows (instalar Ubuntu)
    kind: doc
    url: https://learn.microsoft.com/windows/wsl/install
    objective_ids: [pa-01-o1]
  - id: pa-01-m8
    title: OpenCode · Agent Skills (dónde van y cómo se cargan)
    kind: doc
    url: https://opencode.ai/docs/skills/
    objective_ids: [pa-01-o3]
  - id: pa-01-m9
    title: RTK (Rust Token Killer)
    kind: repo
    url: https://github.com/rtk-ai/rtk
    objective_ids: [pa-01-o3]
  - id: pa-01-m10
    title: caveman (skill de respuestas cortas)
    kind: repo
    url: https://github.com/JuliusBrussee/caveman
    objective_ids: [pa-01-o3]
  - id: pa-01-m11
    title: Model Context Protocol (MCP) · especificación e introducción
    kind: doc
    url: https://modelcontextprotocol.io/
    objective_ids: [pa-01-o3]
  - id: pa-01-m12
    title: Agent Skills · especificación
    kind: doc
    url: https://agentskills.io/
    objective_ids: [pa-01-o3]
  - id: pa-01-m13
    title: Skills de ejemplo de Anthropic (repositorio)
    kind: repo
    url: https://github.com/anthropics/skills
    objective_ids: [pa-01-o3]
  - id: pa-01-m14
    title: OpenRouter · modelos y capa gratuita
    kind: link
    url: https://openrouter.ai/models
    objective_ids: [pa-01-o2]
  - id: pa-01-m15
    title: Google AI Studio (clave de Gemini)
    kind: link
    url: https://aistudio.google.com/
    objective_ids: [pa-01-o2]
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

Hoy dejas tu máquina lista para trabajar con un agente de programación durante todo el curso.
Instalas VS Code, Docker y OpenCode, y conectas OpenCode al gateway de la clase.
Después pones nombre a las piezas: agente, proveedor, modelo, parámetros, contexto, MCP y skills.
Al final tendrás el agente respondiendo en tu terminal y tu primera skill escrita por ti.
La clase se dictó el 08-10-2026: sirve de repaso si la viste y de guía si la ves grabada.

### El ciclo de esta clase

Esta sesión se recorre con el **ciclo de aprendizaje**. El título de cada sección lleva su fase al final.

| Fase | En esta clase |
|---|---|
| **1 · Experiencia** | Secciones 1 a 3: instalas VS Code, Docker y OpenCode, y conectas el agente al gateway. |
| **2 · Reflexión** | Sección 8: miras trabajar al agente y publicas tu pregunta. |
| **3 · Conceptos** | Secciones 4 a 7: agente, proveedor, modelo, parámetros, contexto, MCP y skills. |
| **4 · Aplicación** | «Tareas»: dejas la evidencia en tu repositorio y la entregas. |

### Bloques de la clase

- 1 · Instalar VS Code.
- 2 · Instalar Docker.
- 3 · Instalar OpenCode y conectarlo al gateway.
- 4 · Conceptos: agente, proveedor, modelo y parámetros.
- 5 · Ahorrar contexto: `AGENTS.md`, RTK y caveman.
- 6 · MCP.
- 7 · Skills y tu primera skill.
- 8 · Practica y reflexiona, y tareas.

Si algo no te funciona, no te quedes atrás. Publica el error completo en el hilo de la sesión.

## 1. VS Code · Experiencia

En una frase: VS Code es el editor donde escribes, abres la terminal y revisas lo que el agente cambia.

Es gratuito y arranca rápido. Lo que le falta se añade con extensiones.
Para el curso importan tres cosas: la terminal integrada, la paleta de comandos y el panel de Git.
En ese panel verás cada archivo que el agente crea o cambia, con su diff, antes de aceptarlo.

**Qué vas a hacer**
1. Descarga el instalador (enlace en Materiales) y ejecútalo.
   - Windows: elige *User Installer* de 64 bits y marca «Agregar al PATH». Instala también la extensión **WSL**.
   - Mac: descomprime el `.zip` y arrastra la aplicación a *Aplicaciones*.
   - Linux: instala el `.deb` o el `.rpm`, o corre `snap install code --classic`.
2. Abre VS Code y abre la terminal integrada: `Ctrl+ñ` (teclado español), `` Ctrl+` `` (inglés) o *Terminal → New Terminal*.
3. Mac: abre la paleta con `Cmd+Shift+P` y ejecuta *Shell Command: Install 'code' command in PATH*.
4. Comprueba desde la terminal:
   ```bash
   code --version
   ```
5. Windows con WSL: abre tu carpeta de trabajo con el botón verde «WSL: Ubuntu», abajo a la izquierda.

**Qué vas a ver:** `code --version` imprime tres líneas: la versión, un código largo y la arquitectura.

**Si falla:** Si dice «comando no encontrado», cierra la terminal y ábrela de nuevo. En Mac, repite el paso 3.

## 2. Docker · Experiencia

En una frase: Docker empaqueta un programa con todo lo que necesita y lo corre igual en cualquier máquina.

Analogía: una imagen es la receta ya cocinada; un contenedor es esa receta servida en un plato.
Puedes servir varios platos de la misma receta y tirarlos sin ensuciar tu sistema.
En el curso sirve para levantar el gateway con un comando y, más adelante, para ejecutar código aislado.

**Qué vas a hacer**
1. Instala Docker (enlaces en Materiales).
   - Windows: en PowerShell como administrador corre `wsl --install`, reinicia e instala **Docker Desktop** con «Use WSL 2 based engine».
   - Mac: instala **Docker Desktop** con la versión que corresponde a tu procesador.
   - Linux: instala **Docker Engine** con la guía oficial y corre `sudo usermod -aG docker $USER`.
2. Windows: en *Settings → Resources → WSL integration* activa tu Ubuntu. Linux: cierra la sesión y vuelve a entrar.
3. Comprueba desde la terminal:
   ```bash
   docker --version
   docker run --rm hello-world
   ```
4. Opcional: levanta el gateway tú mismo con el repositorio del curso (lo tienes en Materiales):
   ```bash
   git clone https://github.com/davrv93/jmd && cd jmd
   cp .env.example .env
   docker compose up -d --build
   ```

**Qué vas a ver:** `hello-world` imprime «Hello from Docker!». Si levantaste el gateway, su panel responde en `http://localhost:4000/ui/`.

**Si falla:** Si dice «Cannot connect to the Docker daemon», abre Docker Desktop y espera a que arranque. En Linux, revisa que volviste a entrar en la sesión.

## 3. OpenCode y el gateway de la clase · Experiencia

En una frase: OpenCode es el agente que usarás todo el curso; el gateway es el servidor que le presta el modelo.

OpenCode corre en la terminal. Lee y escribe archivos, ejecuta comandos y habla con el modelo que le configures.
No trae modelo propio: en clase lo apuntas al gateway, que elige el modelo por ti y lleva las cuotas.
El instructor te da dos datos en clase: la URL exacta del gateway y tu clave personal.

**Qué vas a hacer**
1. Instala OpenCode. Necesitas Node.js 18 o superior:
   ```bash
   npm i -g opencode-ai
   opencode --version
   ```
2. Guarda tu clave en una variable de entorno para no escribirla en ningún archivo:
   ```bash
   export GATEWAY_API_KEY="la-clave-que-te-dio-el-instructor"
   ```
3. Crea `opencode.json` en tu carpeta de trabajo con este contenido. Cambia `baseURL` por la URL de clase:
   ```json
   {
     "$schema": "https://opencode.ai/config.json",
     "provider": {
       "clase": {
         "npm": "@ai-sdk/openai-compatible",
         "name": "Gateway de la clase",
         "options": {
           "baseURL": "https://URL-DEL-GATEWAY/v1",
           "apiKey": "{env:GATEWAY_API_KEY}"
         },
         "models": { "auto": { "name": "auto (lo elige el gateway)" } }
       }
     },
     "model": "clase/auto"
   }
   ```
4. Arranca el agente en esa carpeta y comprueba el modelo:
   ```bash
   opencode
   ```
   Dentro escribe `/models` y busca `clase/auto`.
5. Hazle una pregunta corta: «¿qué archivos hay en esta carpeta?». Sal con `/exit`.

**Qué vas a ver:** `/models` lista `clase/auto`. El agente responde a tu pregunta y te muestra el comando que ejecutó.

**Si falla:** Si responde «401» o «unauthorized», la clave está mal copiada o la variable no existe en esa terminal.
Si dice «ECONNREFUSED», la URL del gateway está mal: cópiala del hilo de la sesión.

## 4. Conceptos: agente, proveedor, modelo y parámetros · Conceptos

En una frase: ya instalaste las piezas; ahora les pones nombre para saber de qué hablas.

**Agente.** Un programa que pone un modelo en un bucle: decide, usa una herramienta, mira el resultado y repite.
Analogía: un empleado nuevo que sigue tus instrucciones y usa las herramientas de la oficina. OpenCode es uno.

**Proveedor.** La empresa que aloja el modelo y lo expone por una API con URL, clave, cuota y precio.
Analogía: la empresa que te vende el modelo. Hoy tu proveedor es el gateway de la clase.

**Modelo.** La red neuronal entrenada que recibe texto y devuelve texto. Lee y cobra en tokens: trozos de palabra.
Analogía: el cerebro que alquilas por minutos. Cambias de cerebro sin cambiar de agente.

**Parámetros.** Perillas que viajan en cada petición y cambian cómo responde el mismo modelo.
Analogía: las perillas de una radio. `temperature` dice cuánto improvisa; `max_tokens`, cuánto puede hablar.

Dos avisos. «Parámetros del modelo» también significa su tamaño en pesos («70 B»); no son estas perillas.
Y cuando pides el modelo `auto`, el gateway elige: si uno falla por cuota, pasa al siguiente.

**Qué vas a ver:** En OpenCode, `/models` muestra `proveedor/modelo`: a la izquierda quién lo sirve, a la derecha qué cerebro responde.

**Si falla:** Si confundes proveedor y modelo, sigue el camino: tu agente llama al proveedor y el proveedor pone el modelo.

## 5. Ahorrar contexto: AGENTS.md, RTK y caveman · Conceptos

En una frase: cada token que entra o sale gasta cuota; hoy aprendes tres formas de gastar menos.

El agente gasta en dos direcciones: lo que lee (tu pedido, archivos, salida de comandos) y lo que escribe.
`AGENTS.md` evita que redescubra tu proyecto en cada sesión. RTK recorta la salida de los comandos. caveman acorta las respuestas.

**Qué vas a hacer**
1. Dentro de OpenCode, en una carpeta con código, crea las reglas del proyecto:
   ```text
   /init
   ```
2. Abre el `AGENTS.md` que creó y añade dos líneas: cómo se arranca y cómo se prueba tu proyecto.
3. Instala RTK para comprimir la salida de los comandos antes de que llegue al modelo:
   ```bash
   brew install rtk                                   # Mac
   cargo install --git https://github.com/rtk-ai/rtk  # Windows con WSL o Linux, con Rust instalado
   ```
4. Después de una sesión de trabajo, mira cuánto ahorró:
   ```bash
   rtk gain
   ```
5. Instala caveman (enlace en Materiales): copia su carpeta a `~/.config/opencode/skills/caveman/` y pídele al agente «responde como caveman».

**Qué vas a ver:** Un `AGENTS.md` nuevo en la raíz. `rtk gain` imprime los tokens ahorrados. Con caveman, el agente deja saludos y relleno.

**Si falla:** Si `cargo` no existe, instala Rust desde rustup.rs y abre otra terminal.
Si tienes caveman y el estilo corto del gateway a la vez, quita uno: se recorta dos veces.

## 6. MCP · Conceptos

En una frase: MCP es el enchufe estándar para conectar tu agente con herramientas y datos de fuera.

Analogía: antes cada aparato traía su propio cargador; MCP es el cargador universal.
Un servidor MCP expone herramientas (funciones), recursos (datos) y prompts (plantillas). Cualquier agente compatible los usa.
Hay dos transportes: `local` arranca el servidor en tu máquina; `remote` habla con uno en internet.

**Qué vas a hacer**
1. Mira la demostración: el agente lista cursos y entrega una tarea desde la terminal, sin abrir el navegador.
2. Abre tu `opencode.json`. Los servidores van en una clave `mcp`, al mismo nivel que `provider`.
3. Lee este ejemplo. No lo instales hoy; solo identifica `type`, `command` y `enabled`:
   ```json
   "mcp": {
     "archivos": {
       "type": "local",
       "command": ["npx", "-y", "@modelcontextprotocol/server-filesystem", "."],
       "enabled": true
     },
     "lms": { "type": "remote", "url": "https://URL-DEL-LMS/mcp", "enabled": true }
   }
   ```
4. Anota una herramienta que te gustaría darle a tu agente y compártela en el hilo de la sesión.

**Qué vas a ver:** En la demostración, el agente usa herramientas que no vienen de serie: `list_courses`, `submit_assignment`. Eso es MCP.

**Si falla:** Si `opencode.json` deja de cargar, revisa comas y llaves. Un JSON roto apaga toda la configuración.

## 7. Skills y tu primera skill · Conceptos

En una frase: una skill es una carpeta con un `SKILL.md` que enseña al agente a hacer algo concreto.

Analogía: una ficha de instrucciones en un cajón. El agente lee solo el título de cada ficha al arrancar.
Cuando tu pedido encaja con la descripción, abre la ficha completa. Es contexto bajo demanda.
Viven en `.opencode/skills/<nombre>/SKILL.md` (proyecto) o en `~/.config/opencode/skills/<nombre>/SKILL.md` (usuario).

**Qué vas a hacer**
1. En tu carpeta de trabajo crea la carpeta de la skill:
   ```bash
   mkdir -p .opencode/skills/saludo
   ```
2. Crea `.opencode/skills/saludo/SKILL.md` con este contenido:
   ```markdown
   ---
   name: saludo
   description: Saluda al alumno por su nombre y le dice qué clase toca. Úsala cuando pidan «salúdame» o «qué toca hoy».
   ---
   Pregunta el nombre si no lo sabes. Responde en español, en dos líneas:
   1. Un saludo con el nombre.
   2. La clase de hoy, leída de `clases.md` si existe; si no, di que no hay archivo.
   ```
3. Arranca `opencode` en esa carpeta y escribe: `salúdame`.
4. Instala la skill grande `landing-editorial` desde `skills.zip` (lo tienes en Materiales):
   ```bash
   unzip skills.zip -d ~/.config/opencode/skills/
   ```
5. Abre `~/.config/opencode/skills/landing-editorial/SKILL.md` y mira cómo solo apunta a `references/`.
6. Pide en OpenCode: «hazme una landing editorial para una cafetería» y observa qué referencias lee.

**Qué vas a ver:** El agente te pregunta el nombre y responde en dos líneas. Con `landing-editorial`, lee archivos de `references/` antes de escribir el `index.html`.

**Si falla:** Si no usa tu skill, revisa que `name` coincide con la carpeta y que `description` dice cuándo usarla.
Reinicia `opencode`: las skills se leen al arrancar.

## 8. Practica y reflexiona · Reflexión

En una frase: antes de cerrar, miras trabajar al agente sin aceptar nada a ciegas.

La regla del curso: el agente propone, tú decides. Lee el diff antes de aceptar.
Trabaja siempre en git: si el agente rompe algo, vuelves atrás con un comando.

**Qué vas a hacer**
1. Crea una carpeta vacía, inicia git y arranca el agente:
   ```bash
   mkdir practica-01 && cd practica-01 && git init
   opencode
   ```
2. Pídele: «Crea un script que imprima la fecha y la hora en español.»
3. Antes de aceptar, mira qué archivos crea, qué comandos quiere ejecutar y si prueba el resultado.
4. Corre el script tú mismo y anota en dos líneas qué te sorprendió y qué no.
5. Publica una pregunta en la pestaña **Preguntas** de esta sesión, o responde la de un compañero.

**Qué vas a ver:** Un archivo nuevo, el comando que lo ejecuta y la fecha de hoy en español. Tu pregunta aparece en el hilo.

**Si falla:** Si el agente ejecuta sin preguntar, pídele que te muestre cada comando antes de lanzarlo.
Si el script falla, pégale el error completo: arreglarlo también es parte del ejercicio.

## Palabras de hoy · Conceptos

- **Agente**: programa que pone un modelo en un bucle con herramientas y actúa sobre tu proyecto.
- **Proveedor**: quien aloja el modelo y te lo sirve por una API con clave y cuota.
- **Modelo**: la red entrenada que recibe texto y devuelve texto.
- **Token**: la unidad en la que el modelo lee, escribe y cobra; unos tres cuartos de palabra.
- **Parámetros de generación**: perillas de cada petición, como `temperature` y `max_tokens`.
- **Gateway**: el servidor de la clase que elige el modelo, reparte la cuota y recibe tu clave.
- **Contexto**: todo lo que el modelo tiene delante en una petición; se gasta en tokens.
- **AGENTS.md**: las reglas del proyecto que OpenCode lee al arrancar.
- **MCP**: protocolo estándar para dar al agente herramientas y datos externos.
- **Skill**: carpeta con `SKILL.md` que el agente carga cuando tu pedido encaja con su descripción.

## Tareas · Aplicación

- Tarea 1: instala VS Code, Docker y OpenCode, conecta el gateway y escribe la skill `saludo`.
- Entrega el repositorio `clase-01` con `EVIDENCIA.md` y `.opencode/skills/saludo/SKILL.md`. En `EVIDENCIA.md` pega las tres comprobaciones y una captura de OpenCode respondiendo.
- Entrégalo desde la tarea 1 del LMS (URL + commit) antes del 15-10-2026 a las 23:59.
