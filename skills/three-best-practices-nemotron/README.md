# three-best-practices-nemotron

Fork de la skill [`three-best-practices`](https://github.com/emalorenzo/three-agent-skills)
(MIT, emalorenzo) reescrita para correr sobre **NVIDIA Nemotron 3** (Nano, Super y Ultra) a
través del gateway `jmd` o de cualquier endpoint compatible con OpenAI. Mismas reglas y mismos
identificadores de regla que la original; cambia el empaquetado.

## Qué cambia respecto a la original

| Original (pensada para Claude) | Esta versión (Nemotron) | Por qué |
|---|---|---|
| Índice de 120 reglas y «lee `rules/*.md` para el detalle» | Las ~40 reglas críticas van **inline** con su código mínimo; `rules/` es opcional (§9) | En OpenRouter gratis cada lectura de archivo es una petición de la cuota diaria (~50/día) y el contexto útil es 128K–256K |
| Reglas descritas en prosa | Reglas **imperativas** (MUST / NEVER) y numeradas, con una lista de comprobación previa (§6) | Los modelos abiertos siguen mejor instrucciones explícitas que implícitas |
| Sin formato de salida fijo | **Contrato de salida** obligatorio para revisar (puntuación, tabla de hallazgos, rúbrica) y para escribir código | Hace las respuestas cortas y comparables, y evita que el modelo divague |
| Asume que el modelo conoce r182 | Tabla **API obsoleta → API actual** (§2) que el modelo tiene prohibido emitir | Los datos de entrenamiento de los modelos abiertos arrastran `THREE.Geometry`, `outputEncoding`, `examples/js`, etc. |
| Lo importante repartido por el archivo | Reglas de operación y reglas críticas **al principio**, índice largo al final | Los híbridos Mamba-Transformer recuerdan peor lo que queda en medio de un contexto largo |
| — | Notas de runtime (§8): muestreo, `/think` · `/no_think`, cuota, tools | Para configurar el agente en `jmd` sin adivinar |

## Instalación

```bash
# Claude Code (o cualquier agente que siga la especificación Agent Skills)
cp -r skills/three-best-practices-nemotron ~/.claude/skills/

# Opcional: el detalle de cada regla, para los casos de la sección 9 del SKILL.md
git clone --depth 1 https://github.com/emalorenzo/three-agent-skills /tmp/tas
cp -r /tmp/tas/skills/three-best-practices/rules ~/.claude/skills/three-best-practices-nemotron/
```

Si ya tienes instalada la skill original, desinstálala o déjala solo una: las dos se activan
con las mismas frases y el agente cargaría ambas.

## Agente recomendado en `jmd`

Añade un agente en **Agentes** (UI) o en `data/config.yaml`. Los parámetros son los que
recomiendan los model cards de NVIDIA; no reutilices la `temperature: 0.2` del agente
`coding`, que a Nemotron lo vuelve repetitivo.

```yaml
agents:
  three:
    description: "Three.js / WebGL / WebGPU con Nemotron 3"
    chain: [nemotron-super, nemotron-ultra, inkling, gemini-flash]
    priority: quality
    timeout: 240
    params: {temperature: 1.0, top_p: 0.95}
    # Solo se inyecta si el cliente no manda su propio mensaje system (Claude Code sí lo manda).
    system_prompt: "/think"
```

Y para que Claude Code lo use, un alias en `compat.model_aliases` o pedirlo con la cabecera
`X-Orchestrator-Agent: three`.

- **Razonamiento.** Nemotron 3 razona por defecto. `/think` o `/no_think` van en el mensaje
  `system`; por OpenRouter también vale `"reasoning": {"enabled": false}`. Activado para
  revisiones y arquitectura, desactivado para arreglos de una línea.
- **Nano en modo razonamiento:** `temperature: 0.6`, `top_p: 0.95`.
- **Tools.** Formato OpenAI (`tools`, `tool_choice`); en vLLM/SGLang con el parser `qwen3_coder`.

## Licencia

MIT, como la skill original. Créditos a emalorenzo (three-agent-skills), a las guías de la
rama `llms` de Three.js (mrdoob) y a «100 Three.js Tips» de Utsubo.
