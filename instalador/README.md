# Instalador de prerrequisitos · curso «Programación agéntica»

Un solo comando que instala todo lo que usa el curso. Es **idempotente**: lo que ya está
instalado se detecta y se salta, así que se puede ejecutar las veces que haga falta.
Al terminar muestra una tabla con cada herramienta, su estado y su versión.

## Un comando

**macOS, Linux y WSL**

```bash
curl -fsSL https://raw.githubusercontent.com/davrv93/jmd/main/instalador/instalar.sh | bash
```

**Windows nativo (PowerShell 5.1 o 7)**

```powershell
irm https://raw.githubusercontent.com/davrv93/jmd/main/instalador/instalar.ps1 | iex
```

Si PowerShell se niega a ejecutar scripts («la ejecución de scripts está deshabilitada»),
antes, y solo para esa ventana:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

En Windows hace falta **winget** (App Installer). Viene con Windows 10 21H2+ y Windows 11; si
no está, instálalo desde Microsoft Store: <https://apps.microsoft.com/detail/9NBLGGH4NNS1>.

## Qué instala

| # | Herramienta | macOS | Linux (Debian/Ubuntu · Fedora) | Windows |
|---|---|---|---|---|
| 1 | Git | Homebrew | apt · dnf | winget `Git.Git` |
| 2 | Node.js LTS 22 | `brew install node@22` | NodeSource 22.x · dnf | winget `OpenJS.NodeJS.LTS` |
| 3 | Python 3.11+ | `brew install python@3.12` | `python3 python3-venv python3-pip` · dnf | winget `Python.Python.3.12` |
| 4 | Docker | cask `docker` (Docker Desktop) | script oficial `get.docker.com` + grupo `docker` | winget `Docker.DockerDesktop` (+ `wsl --install` si falta WSL) |
| 5 | VS Code | cask `visual-studio-code` | repositorio oficial de Microsoft (.deb/.rpm) | winget `Microsoft.VisualStudioCode` + extensión `ms-vscode-remote.remote-wsl` |
| 6 | ripgrep (`rg`) | brew | apt · dnf | winget `BurntSushi.ripgrep.MSVC` |
| 7 | OpenCode | `curl -fsSL https://opencode.ai/install \| bash` | ídem | `npm install -g opencode-ai` |
| 8 | RTK | `brew install rtk` | `install.sh` oficial (a `~/.local/bin`) | winget `rtk-ai.rtk` |
| 9 | caveman + skill + MCP | `npm install -g @caveman-ai/cli` | ídem | ídem |
| 10 | OpenPencil + CLI `op` (opcional) | tap `zseven-w/openpencil`, cask `openpencil` | `.deb` (apt) o AppImage desde GitHub Releases | Scoop (`scoop-openpencil`) |
| 11 | `jmd` (CLI del curso) | `install.sh` del repo, sin gateway | ídem | `install.ps1` del repo, sin gateway |
| 12 | `~/curso-agentico` | `AGENTS.md` + `opencode.json` de plantilla | ídem | `%USERPROFILE%\curso-agentico` |

Tras instalar RTK se ejecuta `rtk init -g --opencode --auto-patch` (hooks para Claude Code y
plugin de OpenCode, sin preguntar; banderas comprobadas en rtk 0.49). Tras instalar caveman
se ejecuta `caveman setup --install` y `npx skills add JuliusBrussee/caveman -g -y`.

En **WSL** Docker y VS Code no se instalan dentro de Linux: se usan los de Windows (Docker
Desktop con «WSL integration» activada; `code .` abre el VS Code de Windows). El script lo
detecta y avisa.

Duración orientativa: 5 a 15 minutos según la conexión (Docker Desktop y VS Code son lo
más pesado). Homebrew en una Mac limpia añade otros 5 a 10 minutos.

## Opciones

| Opción | Efecto |
|---|---|
| `--verificar` | Solo comprueba y muestra la tabla. No instala nada ni toca `~/curso-agentico`. |
| `--sin-docker` | No instala Docker. |
| `--sin-openpencil` | No instala OpenPencil ni la CLI `op`. |
| `--si` | No pide confirmación (modo desatendido). |

Cómo pasarlas:

```bash
# Linux / macOS / WSL (los argumentos van a bash, no a curl)
curl -fsSL https://raw.githubusercontent.com/davrv93/jmd/main/instalador/instalar.sh | bash -s -- --verificar
# o descargado:
bash instalar.sh --sin-docker --si
```

```powershell
# Windows: "| iex" no admite argumentos; se usa un scriptblock o variables de entorno
& ([scriptblock]::Create((irm https://raw.githubusercontent.com/davrv93/jmd/main/instalador/instalar.ps1))) --verificar
$env:CURSO_SIN_DOCKER = "1"; irm https://raw.githubusercontent.com/davrv93/jmd/main/instalador/instalar.ps1 | iex
# o descargado:
.\instalar.ps1 --verificar
```

El código de salida es `0` solo si todo lo **obligatorio** está instalado (OpenPencil, `op`,
el MCP de caveman y Claude Code son opcionales y no cuentan).

## Qué pasa con la contraseña

- **macOS**: Homebrew pide la contraseña del usuario al instalarse y al instalar casks.
- **Linux**: los paquetes del sistema van con `sudo`. El script lo anuncia y pide la
  contraseña **una sola vez al inicio** (`sudo -v`). Como root (por ejemplo dentro de un
  contenedor) no la pide.
- **Windows**: winget muestra la ventana de UAC para los instaladores que la necesitan.

## Después de instalar

1. **Abre una terminal nueva**: el PATH se actualiza para las sesiones nuevas.
2. **Docker**: en macOS y Windows abre Docker Desktop una vez y acepta los permisos. En
   Linux cierra sesión y vuelve a entrar para usar `docker` sin `sudo` (grupo `docker`).
   En Windows, si hubo que instalar WSL, reinicia el equipo antes de abrir Docker Desktop.
3. **Gateway de la clase**: edita `~/curso-agentico/opencode.json` y sustituye
   `PON_AQUI_LA_URL_DEL_GATEWAY` por la URL que da el instructor (termina en `/v1`), y pon
   la clave en el entorno:
   ```bash
   export GATEWAY_API_KEY="la-clave-del-instructor"   # añádelo a ~/.zshrc o ~/.bashrc
   ```
   ```powershell
   [Environment]::SetEnvironmentVariable("GATEWAY_API_KEY", "la-clave-del-instructor", "User")
   ```
   Las URL y claves **no** las inventa el instalador: sin ellas OpenCode no tiene modelo.
4. Comprueba: `bash instalar.sh --verificar` (o la variante de PowerShell).

Registro completo de cada ejecución: `~/curso-agentico/instalador.log`.

## MCP de caveman (registrado por el instalador)

El repositorio de caveman trae un servidor MCP (`mcp/README.md`,
<https://github.com/JuliusBrussee/caveman/tree/main/mcp>) con las herramientas
`caveman_compress`, `caveman_retrieve`, `caveman_stats`, `caveman_toon_encode` y
`caveman_toon_decode`. Se arranca con `npx -y caveman-mcp` (la primera vez descarga el
binario a `~/.caveman/bin`).

El instalador lo registra así:

- **OpenCode** (`~/.config/opencode/opencode.json`, formato de
  <https://opencode.ai/docs/mcp-servers>; ubicación global según
  <https://opencode.ai/docs/config>):
  ```json
  {
    "$schema": "https://opencode.ai/config.json",
    "mcp": {
      "caveman": {
        "type": "local",
        "command": ["npx", "-y", "caveman-mcp"],
        "enabled": true
      }
    }
  }
  ```
  Si el archivo tiene comentarios (JSONC) el script no lo toca y avisa: añade el bloque a mano.
- **Claude Code** (solo si `claude` está instalado):
  `claude mcp add --scope user caveman -- npx -y caveman-mcp`
  (equivale al `{"command": "npx", "args": ["-y", "caveman-mcp"]}` que documenta el repo).

## MCP de OpenPencil (paso manual)

OpenPencil lleva el servidor MCP dentro de la propia app. Según su README
(<https://github.com/ZSeven-W/openpencil#readme>, sección «MCP Server»):

> Built-in MCP server (`op-mcp` crate) — one-click install into Claude Code / Codex /
> OpenCode / Kiro / Copilot CLIs. No Node.js required — stdio transport via the desktop
> binary (`--mcp <path>`), plus a live HTTP endpoint (`127.0.0.1:<port>/mcp`) from the
> running app.

No publica un comando de registro, y el **puerto lo elige la app al arrancar** (lo publica
en `~/.openpencil/.op-mcp-port`), así que el instalador no lo registra a ciegas. Hazlo una
vez desde la app:

1. Abre OpenPencil.
2. Ajustes del agente → pestaña **MCP** → activa el servidor y, en la lista de CLIs, activa
   **OpenCode** y, si lo usas, **Claude Code**. La app escribe la entrada en
   `~/.config/opencode/opencode.json` (`type: remote`, `url: http://127.0.0.1:<puerto>/mcp`)
   y en `~/.claude.json` (`type: http`, misma URL).
3. Comprueba en OpenCode con `/mcp` o en Claude Code con `claude mcp list`.

Si prefieres hacerlo por terminal, lee el puerto en `~/.openpencil/.op-mcp-port` (campo
`port`) con la app abierta y registra la URL `http://127.0.0.1:<puerto>/mcp` como servidor
remoto/HTTP (`claude mcp add --transport http --scope user openpencil <url>`). Ten en cuenta
que si el puerto cambia habrá que repetirlo; por eso el camino recomendado es el de la app.

## Probar el instalador sin tocar tu máquina

```bash
docker run --rm -i ubuntu:24.04 bash -s -- --verificar < instalar.sh
```

Para una instalación real en un contenedor limpio (sin Docker ni OpenPencil, que no tienen
sentido dentro de un contenedor):

```bash
docker run --rm -it ubuntu:24.04 bash -c 'apt-get update && apt-get install -y curl sudo ca-certificates && bash -s -- --si --sin-docker --sin-openpencil' < instalar.sh
```

Validaciones: `shellcheck -s bash instalar.sh`, `bash -n instalar.sh`; en PowerShell,
`[scriptblock]::Create((Get-Content -Raw instalar.ps1)) | Out-Null`.

## Si algo falla

| Síntoma | Qué hacer |
|---|---|
| `command not found` justo después de instalar | Abre una terminal nueva (PATH). |
| `winget` no existe | Instala App Installer desde Microsoft Store (enlace arriba). |
| `docker: permission denied` en Linux | Cierra sesión y vuelve a entrar (grupo `docker`). |
| Docker no responde en macOS/Windows | Abre Docker Desktop una vez. |
| Node antiguo (< 20) que no se actualiza | Desinstala el Node viejo (o el `nvm` que lo fija) y repite. |
| `npx skills add` se queda esperando | Ejecuta a mano `npx skills add JuliusBrussee/caveman -g`. |
| OpenCode sin modelo | Falta la URL (`/v1`) o la clave del gateway en `opencode.json`. |

Lo demás está en `~/curso-agentico/instalador.log`.
