---
id: avz-00
title: "Empieza aquí · Un agente que escucha, piensa y habla"
published: true
objectives:
  - {id: avz-00-o1, title: "Levantar el agente con Docker en Windows o Mac"}
  - {id: avz-00-o2, title: "Crear tu llave de Gemini y guardarla en .env sin exponerla"}
materials:
  - {id: avz-00-video, title: "Video · Resumen del curso (2 min)", kind: video, file: materials/grabaciones/00-resumen-agente-de-voz.mp4, objective_ids: [avz-00-o1]}
  - {id: avz-00-repo, title: "Repositorio en GitHub · agente-voz-gemini (Windows y Mac con Docker)", kind: repo, url: https://github.com/davrv93/agente-voz-gemini}
  - {id: avz-00-llave, title: "Google AI Studio · crea tu llave de Gemini", kind: link, url: https://aistudio.google.com/apikey, objective_ids: [avz-00-o2]}
  - {id: avz-00-docker, title: "Docker Desktop · descarga para Windows y Mac", kind: link, url: https://www.docker.com/products/docker-desktop/, objective_ids: [avz-00-o1]}
cycle:
  - id: ver
    title: Ver el resumen
    tool: lms
    phase: experiencia
    description: "Mira el video de 2 minutos: el agente escucha una pregunta, la entiende, decide y responde con voz."
    check: Viste el video completo y escuchaste la respuesta del agente
  - id: levantar
    title: Levantar el agente
    tool: terminal
    phase: experimentacion
    description: "Instala Docker Desktop, descarga el repositorio, copia .env.example como .env, pega tu llave y corre docker compose up -d --build."
    check: "http://127.0.0.1:8090 abre y arriba dice qué modelos usa"
  - id: llave
    title: Pensar dónde vive la llave
    tool: lms
    phase: reflexion
    description: "Responde para ti: ¿qué pasaría si la llave estuviera en el JavaScript de la página?"
    check: Sabes explicar por qué la llave solo vive en el servidor
---

## Qué vas a construir

Un agente de voz en tres etapas:

1. **Escucha** con Gemini Flash-Lite (`gemini-3.5-flash-lite`): transcribe y devuelve un JSON con intención y emoción.
2. **Piensa** con Flash-Lite: decide qué contestar usando **solo** los datos de tu negocio.
3. **Habla** con Gemini Flash TTS (`gemini-3.8-flash-tts`): convierte la respuesta en voz natural.

Modelos verificados el 24-11-2026 en [ai.google.dev](https://ai.google.dev/gemini-api/docs/models).

## Levántalo (Windows y Mac)

| Paso | Windows (PowerShell) | Mac (Terminal) |
|---|---|---|
| 1 | `wsl --install` (solo la primera vez, como administrador; reinicia) | — |
| 2 | `git clone https://github.com/davrv93/agente-voz-gemini.git` | `git clone https://github.com/davrv93/agente-voz-gemini.git` |
| 3 | `cd agente-voz-gemini` | `cd agente-voz-gemini` |
| 4 | `Copy-Item .env.example .env` | `cp .env.example .env` |
| 5 | `notepad .env` y pega tu llave | `open -e .env` y pega tu llave |
| 6 | `docker compose up -d --build` | `docker compose up -d --build` |

Abre **http://127.0.0.1:8090**. Si arriba dice «Falta GEMINI_API_KEY», revisa el archivo `.env`.

> **Tu llave es tuya.** No la pegues en el código, en un chat ni en una captura. El archivo `.env` no se sube a Git.
