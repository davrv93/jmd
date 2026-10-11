---
id: ej-opencode-guia
title: "OpenCode: guía de uso para el curso"
summary: Instalar, conectar al gateway, elegir modelo, reglas, skills, MCP y los comandos del día a día.
tags: [opencode, guía]
level: básico
lesson: pa-01
phase: conceptualizacion
order: 6
---
**OpenCode** es el agente de programación de terminal que usamos todo el curso. Esta guía reúne
lo que necesitas para trabajar con él sin pelear con la configuración.

## 1. Instalar

```bash
npm i -g opencode-ai          # con Node.js 18+
opencode --version            # comprobar
```

Otros métodos (Homebrew, instalador) están en https://opencode.ai/docs/.

## 2. Conectarlo al gateway de la clase

El gateway habla el **formato de OpenAI**. Se configura como proveedor propio en
`opencode.json` (del proyecto) o `~/.config/opencode/opencode.json` (global):

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
      "models": { "auto": { "name": "auto" } }
    }
  },
  "model": "clase/auto"
}
```

```bash
export GATEWAY_API_KEY="tu-clave"    # añádelo a tu ~/.zshrc o ~/.bashrc para no repetirlo
```

También puedes usar `/connect` dentro de OpenCode para guardar la clave (queda fuera del repo).
Cambia de modelo con `/models`.

## 3. Reglas del proyecto (`AGENTS.md`)

OpenCode lee siempre un archivo de reglas al arrancar: `AGENTS.md` (o `CLAUDE.md`). Pon ahí cómo
se instala, cómo se prueba y qué no tocar. Es lo más barato y lo que más ahorra.

```bash
/init        # genera un AGENTS.md de partida a partir del repo
```

Ejemplo mínimo:

```markdown
# AGENTS.md
## Comandos
- `npm test` para las pruebas; `npm run lint` antes de entregar.
## Reglas
- Nada de `window.alert`: usa los diálogos del proyecto.
- No hagas commit sin que yo lo pida.
```

## 4. Skills

Enseñan al agente tareas concretas. Van en `.opencode/skills/<nombre>/SKILL.md` (proyecto) o
`~/.config/opencode/skills/<nombre>/SKILL.md` (usuario). El agente las carga solo cuando tu
pedido encaja con su `description`. Detalle en los ejemplos «Tu primera skill en OpenCode» y
«Skills: cómo funcionan y cómo aprovecharlas».

## 5. MCP (herramientas externas)

Registra servidores MCP en `opencode.json` (local por stdio, remoto por HTTP). Ver el ejemplo
«Registrar un servidor MCP en OpenCode».

## 6. El día a día

| Quiero… | Cómo |
|---|---|
| Entrar al proyecto | `opencode` en la carpeta del repo |
| Ver/elegir modelo | `/models` |
| Guardar una credencial | `/connect` |
| Crear reglas | `/init` |
| Una respuesta suelta sin abrir la sesión | `opencode run "…"` |
| Ver la ayuda | `/help` |
| Salir | `/exit` o `Ctrl+C` |

Antes de aceptar, **mira siempre el diff**: el agente propone y tú decides. Trabaja en git y haz
un commit por paso; si algo se rompe, vuelves atrás.

## 7. Si algo falla

| Síntoma | Causa habitual |
|---|---|
| `command not found: opencode` | El PATH: cierra y abre la terminal, o revisa la instalación |
| No aparece tu modelo | `baseURL` mal (falta `/v1`) o la clave no está en el entorno |
| `401` | Clave incorrecta o caducada |
| `429` | Cuota agotada: el gateway rota de modelo, espera o pide más cuota |
| Una skill no se carga | Revisa `SKILL.md`, `name` y `description` (ver guía de skills) |
