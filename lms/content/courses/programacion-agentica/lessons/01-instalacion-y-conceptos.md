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
    description: Asiste en vivo o mira la grabación. Ten a mano la terminal de VS Code para ir haciendo lo mismo.
    check: Has visto la clase completa (o la grabación)
  - id: vscode
    title: Instalar VS Code
    tool: vscode
    description: Instala Visual Studio Code y abre una terminal dentro (Ctrl+ñ / Ctrl+`). En Windows, instala también la extensión WSL si vas a trabajar en Ubuntu.
    check: code --version
  - id: docker
    title: Instalar Docker
    tool: docker
    description: Docker Desktop (Windows y macOS) o Docker Engine (Linux). Reinicia la sesión y comprueba que el demonio responde.
    check: docker run --rm hello-world
  - id: opencode
    title: Instalar OpenCode y conectarlo al gateway
    tool: opencode
    description: Instala OpenCode, configúralo como proveedor propio apuntando al gateway de la clase y elige un modelo.
    check: opencode (arranca) y responde una pregunta
  - id: practicar
    title: Practicar con el agente
    tool: terminal
    description: En una carpeta vacía, pide a OpenCode «crea un script que imprima la fecha y la hora en español» y mira qué archivos crea y qué comandos ejecuta antes de aceptar.
    check: El script existe y corre
  - id: skill
    title: Escribir tu primera skill
    tool: opencode
    description: Crea `.opencode/skills/saludo/SKILL.md` con `name` y `description` en el front matter y una instrucción corta. Pídele al agente que la use.
    check: El agente responde usando tu skill
  - id: preguntar
    title: Preguntar o responder
    tool: lms
    description: Publica al menos una pregunta sobre la clase en este LMS (abajo) o responde una de un compañero.
    check: Tu pregunta aparece en el hilo de la sesión
  - id: entregar
    title: Entregar la tarea 1
    tool: git
    description: Sube tu evidencia a un repositorio y entrégalo desde el LMS (URL + commit).
    check: La entrega aparece en «Mis notas» con estado en cola
---

## Avance de la clase

Hoy dejamos el entorno listo y ponemos nombre a las piezas con las que vamos a trabajar todo el
curso. Al terminar deberías poder abrir VS Code, tener Docker corriendo, tener **OpenCode**
hablando con el gateway de la clase y deberías poder explicar, con tus palabras, qué es un
agente, un proveedor, un modelo, un parámetro, qué son las reglas y las skills, cómo se ahorra
contexto y qué es MCP.

Orden de la sesión:

1. Instalar VS Code · 2. Instalar Docker · 3. Instalar OpenCode y conectarlo al gateway ·
4. Conceptos: agente, proveedor, modelo, parámetros · 5. Ahorrar contexto: reglas y estilos ·
6. MCP · 7. Skills y tu primera skill · 8. Tarea 1.

> Si algo no te funciona en clase, no te quedes atrás: sigue mirando y publica la pregunta en el
> hilo de abajo con el mensaje de error completo. Lo resolvemos al final o en la siguiente.

---

## 1. VS Code

### Qué es VS Code

**Visual Studio Code** es un editor de código gratuito y de código abierto, de Microsoft. No es
un «IDE» pesado: arranca rápido, y lo que le falta se instala como **extensiones** (lenguajes,
Docker, WSL, Git, temas). Para nosotros importan tres cosas:

- **La terminal integrada.** Casi todo lo que haremos (instalar, lanzar OpenCode, git) pasa en
  una terminal. Abrirla dentro de VS Code evita cambiar de ventana: `Ctrl+ñ` en teclado
  español, `` Ctrl+` `` en teclado inglés, o *Terminal → New Terminal*.
- **La paleta de comandos** (`Ctrl+Shift+P` / `Cmd+Shift+P`): escribe lo que quieras hacer.
- **El explorador y el control de versiones** (Git) integrados: verás en vivo los archivos que el
  agente crea o cambia, con su diff, antes de aceptarlos. Esa revisión es parte del oficio.

### Instalar VS Code

| Sistema | Cómo |
|---|---|
| Windows | Descarga el instalador (*User Installer*, 64-bit) desde code.visualstudio.com y acepta «Agregar al PATH». Si trabajarás en WSL, instala la extensión **WSL** y abre la carpeta con «WSL: Ubuntu» abajo a la izquierda |
| macOS | Descarga el `.zip`, arrastra *Visual Studio Code* a *Aplicaciones*. Para tener `code` en la terminal: paleta → *Shell Command: Install 'code' command in PATH* |
| Linux | `.deb` / `.rpm` desde la web, o `snap install code --classic` |

Comprobación:

```bash
code --version
```

Extensiones recomendadas para el curso: **WSL** (solo Windows), **Docker** y **GitLens**
(optativa). OpenCode se usa desde la terminal, no necesita extensión.

---

## 2. Docker

### Qué es Docker

**Docker** empaqueta una aplicación con todo lo que necesita (sistema base, librerías, binarios,
configuración) en una **imagen**, y la ejecuta como un **contenedor**: un proceso aislado que
cree estar en su propia máquina pero comparte el núcleo con tu sistema. Es más ligero que una
máquina virtual y, sobre todo, **reproducible**: la misma imagen corre igual en tu portátil, en
el de un compañero y en el servidor.

Vocabulario mínimo:

| Palabra | Qué es |
|---|---|
| **Imagen** | La «receta» ya cocinada, de solo lectura. Se construye con un `Dockerfile` |
| **Contenedor** | Una imagen en ejecución. Puedes tener varios de la misma imagen |
| **Volumen** | Carpeta persistente: lo que el contenedor escribe ahí sobrevive cuando lo borras |
| **Puerto publicado** | `-p 4000:4000`: lo que escucha dentro, visible desde fuera |
| **Compose** | `compose.yaml`: varios contenedores descritos en un archivo; `docker compose up` los levanta todos |
| **Registro** | Donde viven las imágenes (Docker Hub, GHCR). `docker pull` las baja |

En este curso Docker sirve para dos cosas: levantar el **gateway de IA** de la clase con un solo
comando, y más adelante ejecutar código de los alumnos en contenedores aislados (es justo lo que
hace el botón «Ejecutar» de los ejemplos de este LMS).

**Podman** es una alternativa compatible (mismos comandos, sin demonio como root). Todo lo del
curso funciona igual con `podman` y `podman compose`.

### Instalar Docker

| Sistema | Cómo |
|---|---|
| Windows 10/11 | **Docker Desktop**. Requiere WSL 2: si no lo tienes, `wsl --install` en PowerShell como administrador, reinicia, y luego instala Docker Desktop con «Use WSL 2 based engine». En *Settings → Resources → WSL integration*, activa tu Ubuntu |
| macOS | **Docker Desktop** (elige Apple Silicon o Intel). Alternativas más ligeras: OrbStack o Colima |
| Linux | **Docker Engine** siguiendo docs.docker.com/engine/install. Después: `sudo usermod -aG docker $USER` y vuelve a entrar en la sesión para no usar `sudo` |

Comprobación:

```bash
docker --version
docker run --rm hello-world
```

Si `hello-world` imprime «Hello from Docker!», el demonio está arriba y puedes bajar imágenes.

Prueba real (opcional): levanta el gateway tú mismo.

```bash
git clone https://github.com/davrv93/jmd && cd jmd
cp .env.example .env            # pon ADMIN_TOKEN y las claves que tengas
docker compose up -d --build    # o: podman compose up -d --build
# UI en http://localhost:4000/ui/
```

---

## 3. OpenCode: instalar y conectar al gateway

### Qué es OpenCode

**OpenCode** es un **agente de programación de terminal**, de código abierto. Lee y escribe
archivos, ejecuta comandos, busca en tu repositorio y habla con el modelo que le configures. Es
el agente que usaremos todo el curso.

No trae un proveedor «propio»: se conecta a cualquiera. En clase lo apuntamos al **gateway de
IA** (el servidor compatible con la API de OpenAI que levanta el repo del curso). El gateway
elige el modelo por ti, hace *fallback* cuando un proveedor gratuito devuelve 429, lleva las
cuotas y la telemetría. Todos usamos la misma cuenta y las mismas cuotas; tú solo pones tu clave.

### Instalar

Cualquiera de estas deja `opencode` en tu PATH:

```bash
npm i -g opencode-ai     # si tienes Node.js 18+
```

Si prefieres otro método (Homebrew, instalador), mira https://opencode.ai/docs/. Comprueba:

```bash
opencode --version
```

### Conectar al gateway de la clase

El gateway habla el **formato de OpenAI**, así que se configura como un **proveedor propio**
(OpenAI-compatible). El profesor te da dos datos: la **URL del gateway** y tu **clave**.

Crea `opencode.json` en la carpeta de trabajo (o `~/.config/opencode/opencode.json` para todos
tus proyectos):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "clase": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "Gateway de la clase",
      "options": {
        "baseURL": "https://gateway.tu-dominio/v1",
        "apiKey": "{env:GATEWAY_API_KEY}"
      },
      "models": {
        "auto": { "name": "auto (lo elige el gateway)" }
      }
    }
  },
  "model": "clase/auto"
}
```

Pon tu clave en una variable de entorno para no dejarla escrita en el archivo:

```bash
export GATEWAY_API_KEY="pon-aquí-tu-clave"   # la da el instructor
```

- `npm: "@ai-sdk/openai-compatible"` dice «habla el formato de OpenAI».
- `options.baseURL` es la URL del gateway terminada en `/v1`.
- `models.auto` expone el modelo `auto`: el gateway decide qué modelo real usar.

Alternativa sin editar el archivo: dentro de OpenCode, `/connect`, busca tu proveedor y pega la
clave (queda en `~/.local/share/opencode/auth.json`).

### Verificar

```bash
opencode
```

Dentro, con `/models` comprueba que aparece `clase/auto` (o tu modelo). Pregúntale algo y, si
responde, el gateway está bien conectado. `Ctrl+C` o `/exit` para salir.

Comandos útiles de la sesión: `/models` (elegir modelo), `/init` (crear el `AGENTS.md` del
proyecto), `/help` (ver todo). La configuración vive en `opencode.json`; las reglas del proyecto,
en `AGENTS.md` (lo vemos en la Clase 2).

---

## 4. Conceptos: agente, proveedor, modelo, parámetros

### Qué es un agente de IA

Un **modelo de lenguaje** solo hace una cosa: recibe texto y devuelve texto. Un **agente** es un
programa que pone ese modelo en un **bucle con herramientas**:

```
   objetivo ──► el modelo decide ──► llama a una herramienta ──► ve el resultado ──► decide otra vez
                     ▲                 (leer archivo, ejecutar                              │
                     └──────────────── comando, editar, buscar) ◄───────────────────────────┘
                                                   … hasta que considera que terminó
```

OpenCode es un agente **de programación**: sus herramientas son leer y escribir archivos,
ejecutar comandos en tu terminal, buscar en el repo, y las que tú le añadas (MCP y skills). Lo
que distingue a un agente de un chat es que **actúa** sobre tu proyecto y comprueba el resultado
de cada acción. Por eso tu trabajo cambia: pasas de escribir cada línea a **definir el objetivo,
dar contexto, revisar lo que hace y decidir**. A eso le llamamos *vibecoding* cuando se hace
bien; cuando se hace mal, es aceptar sin leer.

Reglas que sostendremos todo el curso:

1. **Lee el diff antes de aceptar.** El agente propone; tú decides.
2. **Contexto claro y corto**: qué quieres, dónde está el código, cómo se prueba.
3. **Trabaja en git**: cada paso en un commit; si el agente rompe algo, vuelves atrás.
4. **Dale una forma de comprobar** (una prueba, un comando): un agente que puede verificar
   se equivoca menos.

### Qué es un proveedor (provider)

Un **proveedor** es quien aloja el modelo y expone una **API** por la que lo llamas: OpenAI,
Anthropic, Google (AI Studio / Gemini), OpenRouter, OpenCode Zen, DeepSeek, Groq… o tu propia
máquina con **Ollama**. Cada proveedor tiene su URL base, su clave (`API key`), sus límites de
uso (cuota, peticiones por minuto) y su precio. Casi todos hablan el **formato de OpenAI**
(`POST /v1/chat/completions`), que se ha convertido en el estándar de hecho; Anthropic tiene el
suyo (`/v1/messages`).

En OpenCode, el gateway de la clase es un proveedor más (el que configuramos arriba). Y
**OpenRouter** merece mención: es un *agregador*, un proveedor que da acceso a cientos de modelos
de muchos laboratorios con una sola clave, con una capa gratuita (`:free`) que usaremos mucho.

### Qué es un modelo

Un **modelo** es la red neuronal entrenada que produce el texto: `gemini-2.5-flash`,
`claude-sonnet`, `nvidia/nemotron-3-super`… Lo que importa de un modelo para elegirlo:

| Rasgo | Qué significa |
|---|---|
| **Capacidades** | texto, código, razonamiento, *tools* (puede pedir llamar a una función), JSON, imagen, audio, vídeo, PDF |
| **Ventana de contexto** | Cuántos tokens caben entre lo que le mandas y lo que responde (p. ej. 128 k o 1 M) |
| **Costo** | Por millón de tokens de entrada y de salida; los `:free` cuestan 0 pero tienen cuota |
| **Velocidad** | Tokens por segundo y latencia hasta el primer token |
| **Calidad** | En qué tareas acierta. Se mide con *benchmarks*, pero sobre todo con tu propia telemetría |

Un **token** es la unidad en la que el modelo lee y escribe: trozos de palabra, más o menos
¾ de palabra en inglés y algo menos en español. Todo se cobra y se limita en tokens.

El mismo modelo puede estar en varios proveedores: en el gateway, un agente (`coding`,
`reasoning`, `cheap`…) es una **cadena de modelos** ordenada: si el primero devuelve 429, va al
siguiente. Cuando pides el modelo `auto`, el *router* decide la cadena por ti.

### Qué son los parámetros

Los **parámetros de generación** van en cada petición y cambian cómo responde el mismo modelo:

| Parámetro | Qué hace | Cuándo tocarlo |
|---|---|---|
| `temperature` | Aleatoriedad al elegir cada token. 0 = casi determinista; 1 = creativo | Código: bajo (0.1–0.3). Ideas: alto |
| `top_p` | Muestreo por núcleo: solo los tokens que suman esa probabilidad | Alternativa a temperature; no subas los dos |
| `max_tokens` | Tope de tokens de salida | Evita respuestas interminables y cuida la cuota |
| `stop` | Secuencias que cortan la respuesta | Salidas con formato fijo |
| `system` / mensaje de sistema | Instrucciones de rol y estilo que valen para toda la conversación | Siempre: es donde va «responde corto», «usa español»… |
| `tools` | Funciones que el modelo puede pedir llamar (con su esquema JSON) | Lo que hace agente a un chat |
| `response_format` | Forzar JSON (o un esquema) | Cuando otro programa va a leer la respuesta |
| `seed` | Reproducibilidad (si el proveedor lo soporta) | Pruebas |

No confundas estos **parámetros de generación** con los **parámetros del modelo** (los miles de
millones de «pesos» que se ajustaron al entrenarlo; «un modelo de 70 B» tiene 70 000 millones).
Cuando alguien dice «el modelo tiene más parámetros», habla de tamaño; cuando dice «baja la
temperatura», habla de la petición.

En OpenCode, la temperatura y compañía se configuran por modelo en `opencode.json` y varios
proveedores se pueden probar en el **Ejemplo 4** de esta sesión, que llama al gateway a mano con
`curl`.

---

## 5. Ahorrar contexto: reglas y estilos

Un agente gasta tokens en dos direcciones: lo que **le entra** (tu prompt, los archivos que lee,
la salida de cada comando) y lo que **sale** (sus respuestas). Con cuotas gratuitas, eso es lo
que marca cuánto puedes trabajar al día. Tres ideas, de más a menos automática:

### Reglas del proyecto (`AGENTS.md`)

OpenCode lee siempre, al empezar, un archivo de **reglas** del proyecto: `AGENTS.md` (o
`CLAUDE.md`). Es lo más barato y lo más importante: ahí dices cómo se arranca el proyecto, cómo
se prueba, qué no tocar. Un buen `AGENTS.md` evita que el agente vuelva a descubrir lo mismo en
cada sesión.

```bash
# dentro de un proyecto
/init        # crea un AGENTS.md de partida a partir del repo
```

### Comprimir lo que entra: hooks de terminal

**RTK** (*Rust Token Killer*, `rtk-ai/rtk`) comprime la **salida de los comandos** antes de que
llegue al modelo: quita códigos de color, líneas repetidas y recorta por el medio conservando el
final, donde suele estar el error. El gateway tiene la misma idea del lado del servidor, así que
funciona para cualquier cliente.

```bash
brew install rtk                                   # macOS
cargo install --git https://github.com/rtk-ai/rtk  # cualquier sistema con Rust
rtk gain                                           # cuánto ha ahorrado
```

### Responder corto: estilos

**caveman** es una **skill** que instruye al modelo para responder **como un cavernícola**:
frases cortas, sin cortesías ni repeticiones, solo lo esencial. Ahorra tokens de salida y da
respuestas más rápidas. Como es una skill, funciona igual en OpenCode y en Claude Code.

```bash
unzip skills.zip -d ~/.config/opencode/skills/   # o ~/.claude/skills/
```

El gateway ofrece lo mismo para cualquier cliente con un estilo configurable; si tienes la skill
**y** el estilo, el recorte se aplica dos veces: deja uno de los dos.

---

## 6. Qué es MCP

**MCP** (*Model Context Protocol*) es un **protocolo abierto** para conectar un agente con
**herramientas y datos externos** de forma estándar. Antes, cada agente integraba cada servicio a
su manera; con MCP, un **servidor MCP** expone sus capacidades una vez y cualquier **cliente
MCP** (OpenCode, Claude Code, Cursor…) las usa.

Un servidor MCP expone tres cosas:

| | Qué es | Ejemplo |
|---|---|---|
| **Tools** | Funciones que el agente puede llamar, con esquema JSON | `list_courses`, `submit_assignment`, `query_database` |
| **Resources** | Datos que el agente puede leer, identificados por URI | `lms://lesson/pa-01`, un archivo, una fila |
| **Prompts** | Plantillas de instrucciones reutilizables | «revisa este PR con nuestra guía» |

Se habla por **JSON-RPC**, y el transporte es **stdio** (el cliente arranca el servidor como
proceso local) o **HTTP** (*streamable HTTP*, para servidores remotos con autenticación).

En OpenCode, los servidores se registran en `opencode.json`:

```json
{
  "mcp": {
    "github": {
      "type": "local",
      "command": ["npx", "-y", "@modelcontextprotocol/server-github"],
      "environment": { "GITHUB_PERSONAL_ACCESS_TOKEN": "{env:GITHUB_TOKEN}" },
      "enabled": true
    },
    "lms": { "type": "remote", "url": "https://lms.tu-dominio/mcp", "enabled": true }
  }
}
```

`local` es stdio y `remote` es HTTP. Con Claude Code, el equivalente es `claude mcp add`.
En este curso, el propio LMS tendrá un servidor MCP: tu agente podrá listar tus cursos, leer los
materiales de una sesión, entregar una tarea y publicar una pregunta sin salir de la terminal.

---

## 7. Qué es una skill

Una **skill** es una **carpeta con un `SKILL.md`** que enseña al agente a hacer algo concreto:
cómo trabaja tu equipo, cómo se despliega este proyecto, cómo se escribe un informe en tu
formato. El archivo lleva un front matter YAML con `name` y `description` y, debajo,
instrucciones en Markdown; puede llevar también scripts y archivos de referencia.

Lo importante es **cómo se carga**: el agente solo lee al inicio el nombre y la descripción de
cada skill (unas líneas). Cuando tu pedido encaja con una descripción, carga el `SKILL.md`
completo, y solo entonces los archivos que este referencie. Es **contexto bajo demanda**: puedes
tener cien skills instaladas sin gastar tokens hasta que una hace falta.

Dónde viven (OpenCode las busca en todas estas rutas):

| Alcance | Ruta |
|---|---|
| Proyecto (OpenCode) | `.opencode/skills/<nombre>/SKILL.md` (se versiona con el repo) |
| Usuario (OpenCode) | `~/.config/opencode/skills/<nombre>/SKILL.md` |
| Compatibilidad | `.claude/skills/…`, `.agents/skills/…` (y sus versiones en tu carpeta personal) |

Reglas del front matter: `name` en minúsculas, con guiones simples, igual que la carpeta; y
`description` que diga **cuándo** usarla (es lo único que el agente lee siempre). El cuerpo dice
**cómo**, en pasos cortos y verificables. El agente las carga con la herramienta `skill`; tú
también puedes pedir una a mano.

### Ejemplos de skills

**1. Saludo (la de la tarea):**

```markdown
---
name: saludo
description: Saluda al alumno por su nombre y le dice qué clase toca. Úsala cuando pidan «salúdame» o «qué toca hoy».
---
Pregunta el nombre si no lo sabes. Responde en español, en dos líneas:
1. Un saludo con el nombre.
2. La clase de hoy, leída de `clases.md` si existe; si no, di que no hay archivo.
```

**2. Commits convencionales:**

```markdown
---
name: commit
description: Escribe mensajes de commit con Conventional Commits (feat, fix, docs…) en español y en imperativo. Úsala al pedir «haz commit».
---
1. Corre `git diff --staged`. Si no hay nada preparado, pregunta qué incluir.
2. Tipo: feat · fix · docs · refactor · test · chore. Ámbito entre paréntesis si es claro.
3. Primera línea ≤ 72 caracteres, en imperativo («añade», no «añadido»).
4. Cuerpo: el porqué, no el qué. Enséñame el mensaje antes de ejecutar `git commit`.
```

**3. Revisión de PR con la guía del equipo** (con archivo de referencia):

```markdown
---
name: revisar-pr
description: Revisa un pull request con la guía de estilo del equipo en GUIA.md. Úsala cuando pidan revisar un PR o una rama.
---
Lee `GUIA.md` de esta carpeta. Para cada archivo del diff, comprueba la guía y
señala solo problemas reales con `archivo:línea`. Termina con un veredicto:
aprobar / cambios necesarios.
```

**4. Documentos del curso** (skill con script):

```markdown
---
name: informe
description: Genera el informe semanal del alumno en Markdown con la plantilla del curso. Úsala cuando pidan «informe de la semana».
---
Ejecuta `python scripts/plantilla.py --semana N` para obtener la plantilla y
rellénala con lo hecho (commits de la semana: `git log --since="1 week ago"`).
```

**5. landing-editorial** (la tienes en **Adjuntos → skills.zip**): una skill grande, con
plantilla y nueve archivos de referencia (tokens, animaciones, scroll guiado, componentes,
responsive, redacción, checklist y recetas por negocio). Instálala así:

```bash
unzip skills.zip -d ~/.config/opencode/skills/   # o ~/.claude/skills/
# y en OpenCode pide: «hazme una landing editorial para una cafetería»
```

Ábrela y mira cómo el `SKILL.md` solo apunta a `references/…`: el agente lee cada referencia
cuando la necesita. Es el «contexto bajo demanda» llevado a una skill real.

Fíjate en el patrón: la **descripción dice cuándo usarla** (eso es lo que el agente lee
siempre), y el cuerpo dice **cómo**, en pasos cortos y verificables. Los ejemplos de Anthropic
(hojas de cálculo, PDF, documentos, diseño de artefactos) están en el repositorio de materiales.

> Guías completas en los ejemplos de la sesión: **«Tu primera skill en OpenCode»**,
> **«Skills: cómo funcionan y cómo aprovecharlas»** y **«OpenCode: guía de uso para el curso»**.
> Y para practicar sin instalar nada, **«Probar código aquí mismo»** (el sandbox del LMS).

---

## Tareas

**Tarea 1 · Tu entorno listo y tu primera skill** (fecha límite: ver «Tareas» del curso).
El enunciado completo y la rúbrica están en la tarea. Resumen:

1. Instala VS Code, Docker y OpenCode; conecta OpenCode al gateway.
2. Crea un repositorio `clase-01` con `EVIDENCIA.md` (salida de `code --version`,
   `docker run --rm hello-world`, `opencode --version` y una captura de OpenCode respondiendo)
   y `.opencode/skills/saludo/SKILL.md` con tu skill.
3. Entrega el repo (URL + commit) desde el LMS.

**Para la próxima clase:** ten el entorno listo. Empezaremos a construir un proyecto con el
agente desde cero, en git, y veremos cómo darle contexto (`AGENTS.md`) y usar skills.
