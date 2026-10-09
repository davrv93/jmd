---
id: ej-mcp-config
title: Registrar un servidor MCP en OpenCode
summary: Un servidor MCP local (stdio) y uno remoto (HTTP) en opencode.json, y cómo comprobarlos.
tags: [mcp, opencode]
level: intermedio
lesson: pa-01
order: 3
---
Un servidor MCP se escribe una vez y lo usa cualquier cliente. Aquí registras dos en OpenCode:
uno local (**stdio**: el agente arranca el proceso) y uno remoto por **HTTP**.

## El archivo de configuración

OpenCode lee `opencode.json` del proyecto, o `~/.config/opencode/opencode.json` para todos tus
proyectos. La sección `mcp` va al lado de `provider`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "github": {
      "type": "local",
      "command": ["npx", "-y", "@modelcontextprotocol/server-github"],
      "environment": { "GITHUB_PERSONAL_ACCESS_TOKEN": "{env:GITHUB_TOKEN}" },
      "enabled": true
    },
    "lms": {
      "type": "remote",
      "url": "https://lms.tu-dominio/mcp",
      "enabled": true
    }
  }
}
```

- `"type": "local"` = stdio: OpenCode lanza el comando y habla con él por su entrada/salida.
- `"type": "remote"` = streamable HTTP: el servidor vive en una URL (aquí, el MCP del LMS).
- Los secretos van por variables de entorno (`"environment"` o `{env:VAR}`), no escritos a mano.

## Comprobar

Abre OpenCode y pide: «lista los repositorios con la herramienta de GitHub». Debe llamar a la
herramienta del servidor MCP (te pedirá permiso la primera vez) y responder con lo que ves en la
web. Si algo falla, revisa que el comando exista en el PATH y que la variable de entorno esté
definida en la misma terminal desde la que lanzas OpenCode.

## Y con Claude Code

El mismo servidor, con su CLI:

```bash
claude mcp add github -e GITHUB_PERSONAL_ACCESS_TOKEN="$GITHUB_TOKEN" \
  -- npx -y @modelcontextprotocol/server-github
claude mcp add --transport http lms-remoto https://lms.tu-dominio/mcp
claude mcp list        # registrados y si responden
```

## Errores típicos

| Síntoma | Causa |
|---|---|
| El servidor no aparece o sale «failed» | El comando no está en el PATH de donde corre el agente (WSL ≠ Windows) |
| Se conecta pero sin *tools* | Falta la variable de entorno (la clave) o es inválida |
| Te funciona y al compañero no | Lo tienes en tu config personal: muévelo a `opencode.json` del repo para compartirlo |
