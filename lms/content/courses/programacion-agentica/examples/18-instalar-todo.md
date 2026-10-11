---
id: ej-instalar-todo
title: "Instala todo con un comando"
summary: Un solo comando instala Git, Node, Python, Docker, VS Code, OpenCode, RTK, caveman, OpenPencil y jmd; luego se verifica con --verificar.
tags: [instalación, prerrequisitos, opencode, docker]
level: básico
lesson: pa-01
phase: experiencia
order: 0
---
En la primera clase se perdió mucho tiempo instalando herramienta por herramienta. Este
instalador lo hace todo de una vez, salta lo que ya tengas y al final te enseña una tabla con
cada herramienta, su estado y su versión. Se puede repetir las veces que quieras.

## 1. El comando

**macOS, Linux o WSL** (terminal):

```bash
curl -fsSL https://raw.githubusercontent.com/davrv93/jmd/main/instalador/instalar.sh | bash
```

**Windows** (PowerShell, no cmd):

```powershell
irm https://raw.githubusercontent.com/davrv93/jmd/main/instalador/instalar.ps1 | iex
```

Si Windows dice que «la ejecución de scripts está deshabilitada», ejecuta antes, en esa misma
ventana, `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` y repite el comando.

El instalador te muestra la lista de lo que va a hacer y pide confirmación. En Linux pide la
contraseña de `sudo` una sola vez; en macOS la pide Homebrew; en Windows aparecen las ventanas
de permisos (UAC) de algunos instaladores.

## 2. Qué instala

1. **Git**
2. **Node.js LTS 22** (y npm)
3. **Python 3.11 o superior**
4. **Docker** (Docker Desktop en macOS y Windows; el motor en Linux)
5. **VS Code** (en Windows, también la extensión WSL)
6. **ripgrep** (`rg`, el buscador que usan los agentes)
7. **OpenCode**, el agente de terminal del curso
8. **RTK**, que recorta la salida de los comandos para ahorrar tokens (`rtk init -g --opencode --auto-patch`)
9. **caveman**: la CLI, su skill global y su servidor MCP registrado en OpenCode (y en Claude Code si lo tienes)
10. **OpenPencil** (diseño con agentes) y su CLI `op`; opcional
11. **jmd**, la CLI del curso (sin el gateway: el gateway lo da el instructor)
12. La carpeta **`~/curso-agentico`** con un `AGENTS.md` de arranque y un `opencode.json` de plantilla

Si no quieres algo: `--sin-docker`, `--sin-openpencil`. Para no responder preguntas: `--si`.
En bash los argumentos se pasan así: `curl -fsSL … | bash -s -- --sin-docker`.

## 3. Cuánto tarda

Entre 5 y 15 minutos, según la conexión. Lo pesado es Docker Desktop y VS Code. Si tu Mac
no tiene Homebrew, suma otros 5 a 10 minutos. Si ya tienes la mitad instalada, termina en
uno o dos minutos: lo detecta y lo salta.

## 4. Qué hacer después

1. **Cierra la terminal y abre una nueva.** El PATH nuevo solo lo ven las sesiones nuevas.
2. **Docker**:
   - macOS y Windows: abre **Docker Desktop** una vez y acepta los permisos.
   - Linux: **cierra sesión y vuelve a entrar** para usar `docker` sin `sudo`.
   - Windows sin WSL: el instalador lo instala; **reinicia** antes de abrir Docker Desktop.
3. **Pega la URL y la clave del gateway** que te da el instructor. Abre
   `~/curso-agentico/opencode.json` y cambia `PON_AQUI_LA_URL_DEL_GATEWAY` por la URL real
   (termina en `/v1`). La clave va en el entorno, nunca en el archivo:

   ```bash
   export GATEWAY_API_KEY="la-clave"      # añádelo a ~/.zshrc o ~/.bashrc
   ```

   ```powershell
   [Environment]::SetEnvironmentVariable("GATEWAY_API_KEY", "la-clave", "User")
   ```

   Sin esos dos datos OpenCode arranca pero no tiene modelo con el que hablar.
4. **OpenPencil** (si lo instalaste): su MCP se activa desde la propia app (ajustes del agente,
   pestaña MCP, activar OpenCode). El instalador no lo hace porque el puerto lo elige la app.

## 5. Cómo verificar

```bash
curl -fsSL https://raw.githubusercontent.com/davrv93/jmd/main/instalador/instalar.sh | bash -s -- --verificar
```

```powershell
& ([scriptblock]::Create((irm https://raw.githubusercontent.com/davrv93/jmd/main/instalador/instalar.ps1))) --verificar
```

No instala nada: solo revisa y muestra la tabla. Así se ve en una máquina ya lista:

```text
Resumen
  Herramienta              Estado             Versión
  -----------              ------             -------
  git                      ok                 2.39.5
  node                     ok                 v22.14.0
  python                   ok                 3.12.3
  docker                   ok                 28.3.0
  code                     ok                 1.141.0
  ripgrep                  ok                 15.2.0
  opencode                 ok                 1.18.35
  rtk                      ok                 0.49.0
  caveman                  ok                 1.3.4
  caveman-mcp (opcional)   ok                 npx -y caveman-mcp
  openpencil (opcional)    falta
  op (opcional)            falta
  jmd                      ok                 0.4.1

Todo lo obligatorio está instalado.
```

`falta` en rojo quiere decir que hay que volver a ejecutar el instalador sin `--verificar`;
`requiere reinicio` quiere decir que está instalado pero falta abrir la app o cerrar sesión.
Lo marcado como opcional no bloquea el curso. El detalle de cada paso queda en
`~/curso-agentico/instalador.log`: si algo falla, es lo primero que hay que mirar y traer a clase.

Código y documentación del instalador: <https://github.com/davrv93/jmd/tree/main/instalador>.
