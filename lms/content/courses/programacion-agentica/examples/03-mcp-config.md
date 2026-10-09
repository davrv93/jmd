---
id: ej-mcp-config
title: Registrar un servidor MCP en Claude Code y OpenCode
summary: El mismo servidor MCP, local (stdio) y remoto (HTTP), en los dos agentes.
tags: [mcp]
level: intermedio
lesson: pa-01
order: 3
---
Un servidor MCP se escribe una vez y lo usa cualquier cliente. Aquí registras dos: el del LMS que
trae `jmd` (**stdio**: el agente arranca el proceso) y uno remoto por **HTTP**.

## Claude Code

```bash
# stdio: el agente lanza «jmd mcp serve» con tu sesión de jmd
claude mcp add lms -- jmd mcp serve

# stdio con variables de entorno (la clave no va en el comando, va en -e)
claude mcp add github -e GITHUB_PERSONAL_ACCESS_TOKEN="$GITHUB_TOKEN" \
  -- npx -y @modelcontextprotocol/server-github

# HTTP: un servidor remoto
claude mcp add --transport http lms-remoto https://lms.tu-dominio/mcp

claude mcp list            # registrados y si responden
claude mcp remove github   # quitar uno
```

Por defecto el registro es **local** (solo tú, solo este proyecto). Con `--scope project` se
guarda en `.mcp.json` en la raíz del repo y lo comparte el equipo; con `--scope user`, vale para
todos tus proyectos.

Dentro de la sesión, `/mcp` muestra cada servidor y sus *tools*.

## OpenCode

En `opencode.json` (en el proyecto) o `~/.config/opencode/opencode.json` (global):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "lms": {
      "type": "local",
      "command": ["jmd", "mcp", "serve"],
      "enabled": true
    },
    "github": {
      "type": "local",
      "command": ["npx", "-y", "@modelcontextprotocol/server-github"],
      "environment": { "GITHUB_PERSONAL_ACCESS_TOKEN": "{env:GITHUB_TOKEN}" },
      "enabled": true
    },
    "lms-remoto": {
      "type": "remote",
      "url": "https://lms.tu-dominio/mcp",
      "enabled": true
    }
  }
}
```

`local` es stdio y `remote` es HTTP: los mismos dos transportes con otros nombres.

## Atajo

`jmd setup claude` y `jmd setup opencode` registran el servidor `lms` por ti. Hazlo a mano una
vez para saber qué escriben y dónde.

## Comprobación

Abre el agente y pide: «lista mis cursos con la herramienta del LMS». Debe llamar a
`lms_courses` (te pedirá permiso la primera vez) y responder con lo que ves en la web.

## Errores típicos

| Síntoma | Causa |
|---|---|
| El servidor sale «failed» en `claude mcp list` | El comando no está en el PATH de donde corre el agente (WSL ≠ Windows) |
| Se conecta pero sin *tools* | Falta la variable de entorno (la clave) o es inválida |
| Te funciona y al compañero no | Lo registraste en alcance local: usa `--scope project` |
