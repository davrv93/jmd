# Instalación en Windows, WSL y macOS

Hay dos piezas, y no se instalan igual:

| Pieza | Quién | Dónde |
|---|---|---|
| **Gateway** (`ai-orchestrator` y su UI) | Una vez, quien administra | Un servidor para toda la clase, o tu propia máquina |
| **`jmd`** + el agente (Claude Code u OpenCode) | Cada persona | En la máquina donde abre la terminal de VS Code |

Para una clase lo práctico es **un gateway central**: un servidor con Docker y HTTPS. Así cada
alumno solo instala `jmd` y su agente, y las cuotas y la telemetría quedan en un solo sitio.

---

## 1. Instalar `jmd`

No hace falta Rust: los instaladores bajan el binario de
[GitHub Releases](https://github.com/davrv93/jmd/releases), comprueban su SHA-256 y lo dejan
en el PATH del usuario, sin pedir permisos de administrador.

### Windows (PowerShell)

En VS Code, abre una terminal **PowerShell** (`Ctrl+ñ` o *Terminal → New Terminal*):

```powershell
irm https://raw.githubusercontent.com/davrv93/jmd/main/install.ps1 | iex
```

- Queda en `%LOCALAPPDATA%\Programs\jmd\jmd.exe`, y esa carpeta se añade al PATH del usuario.
  **Cierra y abre la terminal** (o VS Code) para que lo tome.
- Funciona con PowerShell 5.1 (el que trae Windows) y con PowerShell 7.
- En Windows ARM se instala la versión x64, que corre con la emulación del sistema.
- El binario no está firmado. Si SmartScreen o Defender lo frenan, el instalador ya le quita la
  marca de «descargado de internet»; si aun así lo bloquean, «Más información → Ejecutar de todas
  formas».
- Si bajaste `install.ps1` como archivo en vez de usar `irm`, ejecútalo así:
  `powershell -ExecutionPolicy Bypass -File install.ps1`.

### WSL (Ubuntu u otra distribución)

```bash
curl -fsSL https://raw.githubusercontent.com/davrv93/jmd/main/install.sh | sh
```

**WSL y Windows son dos sistemas distintos.** Instala `jmd` y el agente **donde corre tu
terminal**:

- Con la extensión **WSL** de VS Code (*Remote - WSL*, abajo a la izquierda pone «WSL: Ubuntu»), la
  terminal está dentro de Linux: instala aquí la versión de Linux, y también Claude Code u
  OpenCode dentro de WSL. Su configuración va en el `~` de Linux, no en el de Windows.
- Si abres la terminal PowerShell de Windows, usa el instalador de Windows.

**Red entre WSL y Windows:**

- **Gateway en Docker Desktop (Windows) y `jmd` en WSL:** con la integración de WSL de Docker
  Desktop, `http://localhost:4000` funciona desde WSL. Compruébalo con
  `curl http://localhost:4000/health`.
- **Gateway dentro de WSL y el navegador en Windows:** `http://localhost:4000` funciona porque WSL
  reenvía los puertos a Windows.
- **Si `localhost` no responde:** activa el modo de red espejo de WSL (`networkingMode=mirrored` en
  `%UserProfile%\.wslconfig`, Windows 11) o usa la IP de la otra parte.

### macOS

```bash
curl -fsSL https://raw.githubusercontent.com/davrv93/jmd/main/install.sh | sh
```

- Un solo binario **universal**: Apple Silicon (M1–M4) e Intel.
- Queda en `~/.local/bin`. Si no está en el PATH, el instalador te da la línea para `~/.zshrc`.
- Bajado con `curl` no hay aviso de Gatekeeper. Si bajaste el `.tar.gz` desde el navegador:
  `xattr -d com.apple.quarantine ~/.local/bin/jmd`.

### Opciones de los instaladores

| Variable | Para qué |
|---|---|
| `JMD_VERSION=v0.2.0` | Una versión concreta (por defecto, la última) |
| `JMD_INSTALL_DIR=…` | Otra carpeta |
| `JMD_WITH_GATEWAY=1` | Instalar también el gateway como binario, sin Docker |

En PowerShell se definen antes: `$env:JMD_VERSION = "v0.2.0"`. En sh van delante:
`curl … | JMD_VERSION=v0.2.0 sh`.

Para actualizar, vuelve a ejecutar el instalador. `jmd update` te muestra el comando de tu sistema.

---

## 2. Conectar con el gateway y el agente

```bash
jmd login            # pregunta la URL del gateway y el token
jmd status           # comprueba todo: gateway, tokens, Claude Code, OpenCode, RTK, caveman
jmd setup claude     # Claude Code → gateway
jmd setup opencode   # OpenCode → gateway
```

Después, en la misma terminal de VS Code: `claude` u `opencode`, o `jmd` para el modo
interactivo propio.

### Dónde queda cada cosa

| | Windows | macOS / Linux / WSL |
|---|---|---|
| `jmd` | `%LOCALAPPDATA%\Programs\jmd\jmd.exe` | `~/.local/bin/jmd` |
| Configuración de `jmd` | `%APPDATA%\jmd\config.json` | `~/.config/jmd/config.json` |
| Claude Code (`jmd setup claude`) | `%USERPROFILE%\.claude\settings.json` | `~/.claude/settings.json` |
| OpenCode (`jmd setup opencode`) | `%USERPROFILE%\.config\opencode\opencode.json` | `~/.config/opencode/opencode.json` |
| Solo para un proyecto (`--project`) | `.claude\settings.local.json` · `opencode.json` | igual |

Variables que pisan la configuración: `JMD_URL`, `JMD_ADMIN_TOKEN` y `JMD_API_KEY`.

### Instalar los agentes

- **Claude Code:** `npm i -g @anthropic-ai/claude-code` (en Windows nativo necesita Git for Windows).
- **OpenCode:** https://opencode.ai
- **RTK** (opcional; su hook es para Claude Code): `brew install rtk` en macOS, o
  `cargo install --git https://github.com/rtk-ai/rtk`. Después, `jmd setup claude` lo conecta.

---

## 3. Levantar el gateway

### Con contenedores (recomendado)

| Sistema | Motor |
|---|---|
| Windows | Docker Desktop (con integración WSL) o Podman Desktop |
| macOS | Docker Desktop, OrbStack, Colima o Podman Desktop |
| Linux / WSL | Docker Engine o Podman |

```bash
git clone https://github.com/davrv93/jmd && cd jmd
cp .env.example .env          # ADMIN_TOKEN y las claves de los proveedores
docker compose up -d --build  # o: podman compose up -d --build
```

UI en http://localhost:4000/ui/. Si dejaste `ADMIN_TOKEN` vacío, el token se generó solo:
`docker exec ai-orchestrator cat /data/admin_token`.

### Sin contenedores (un binario)

Instala con `JMD_WITH_GATEWAY=1` y arranca. Si no encuentra `config.yaml`, usa la semilla que
lleva dentro; los datos quedan en `./data` (o en `DATA_DIR`).

```powershell
# Windows
$env:ADMIN_TOKEN = "un-token-largo"; $env:OPENROUTER_API_KEY = "sk-or-…"
ai-orchestrator
```

```bash
# macOS / Linux / WSL
ADMIN_TOKEN=un-token-largo OPENROUTER_API_KEY=sk-or-… ai-orchestrator
```

Por defecto escucha en `0.0.0.0:4000`. Para dejarlo solo en local: `HOST=127.0.0.1`.

### Para toda la clase

Ponlo en un servidor con HTTPS delante (nginx o Caddy) y define `GATEWAY_API_KEYS`. Cada alumno
hace `jmd login --url https://tu-dominio --key <su clave>`. Cuando esté listo el SSO del LMS,
entrará con su cuenta y la clave dejará de hacer falta.

---

## 4. Problemas frecuentes

| Síntoma | Causa y arreglo |
|---|---|
| `jmd: command not found` / «no se reconoce» | La terminal se abrió antes de instalar: ábrela de nuevo. En sh, añade `~/.local/bin` al PATH (el instalador te da la línea) |
| `no se pudo conectar con http://localhost:4000` | El gateway no está levantado, o está al otro lado de WSL (ver «Red entre WSL y Windows») |
| Claude Code no pasa por el gateway | Hay un `ANTHROPIC_BASE_URL` definido en la terminal que gana a settings.json; `jmd status` lo avisa. Quítalo con `unset ANTHROPIC_BASE_URL` o `Remove-Item Env:ANTHROPIC_BASE_URL` |
| `HTTP 401` | Token de administración o clave de `/v1` incorrectos: `jmd login` |
| Instalaste en Windows y no aparece en WSL (o al revés) | Son sistemas distintos: instala en los dos, o solo donde usas la terminal |

---

## 5. Publicar una versión (para quien mantiene el repo)

```bash
git tag v0.1.0 && git push origin v0.1.0
```

El workflow `release` compila para Linux x86_64/ARM64 (musl, sirve para cualquier distro y para
WSL), macOS universal y Windows x64. Después **prueba los instaladores en cada sistema**: instala,
arranca el gateway y corre `jmd status`. Solo si todo pasa, publica la release con
`SHA256SUMS`. Para probarlo sin publicar: *Actions → release → Run workflow*.
