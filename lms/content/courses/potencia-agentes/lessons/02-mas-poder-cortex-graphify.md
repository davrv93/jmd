---
id: pt-02
title: "Clase 2 · Más poder: Cortex y Graphify"
starts_at: 2026-11-10T21:30:00-05:00
published: true
objectives:
  - {id: pt-02-o1, title: "Darle memoria compartida al proyecto con Cortex"}
  - {id: pt-02-o2, title: "Construir el grafo del código con Graphify y consultarlo"}
  - {id: pt-02-o3, title: "Que el agente entienda el proyecto sin releerlo entero"}
recording:
  url: ""
  passcode: ""
materials:
  - id: pt-02-video
    title: "Video: memoria y mapa para tu agente"
    kind: file
    file: materials/video-pt-02.mp4
    objective_ids: [pt-02-o1, pt-02-o2]
  - id: pt-02-cortex
    title: "Cortex (cortexboard) · repositorio oficial"
    kind: repo
    url: https://github.com/alibuyukkilinc/cortexboard
    objective_ids: [pt-02-o1]
cycle:
  - id: ver
    title: Ver la clase
    tool: zoom
    phase: experiencia
    description: "Asiste en vivo el martes 10 de noviembre de 9:30 a 10:45 p. m. (hora de Lima) o mira la grabación."
    check: "Viste la clase completa o la grabación"
  - id: medir
    title: Medir el proyecto entero
    tool: terminal
    phase: experiencia
    description: "Mide cuántos caracteres pesa leer tu proyecto completo y publícalo en la escena 3."
    check: "Tu número «proyecto entero» quedó publicado"
  - id: observar
    title: Ver lo que tu agente olvida
    tool: lms
    phase: reflexion
    description: "Escribe en el muro qué le vuelves a explicar a tu agente en cada sesión."
    check: "Tu línea aparece en el muro de la escena 4"
  - id: memoria
    title: Entender e instalar Cortex
    tool: terminal
    phase: conceptualizacion
    description: "Crea la memoria del proyecto con npx cortexboard init y conéctala a tu agente por MCP."
    check: "Tu agente responde a cortex_brief"
  - id: mapa
    title: Construir el grafo con Graphify
    tool: terminal
    phase: experimentacion
    description: "Instala graphify, construye el grafo de tu proyecto y juega «Sigue el hilo»."
    check: "Existe graphify-out/graph.json y terminaste una ronda"
  - id: entregar
    title: Consultar en vez de leer
    tool: lms
    phase: experimentacion
    description: "Responde una pregunta de tu proyecto con graphify affected y publica proyecto entero → consulta."
    check: "Tu antes → después aparece en el muro de la escena 9"
---

## Clase 2 · Más poder: Cortex y Graphify

**Martes 10 de noviembre, 9:30 – 10:45 p. m. (hora de Lima).**

Si el agente no recuerda, te lo pregunta otra vez: y cada pregunta se paga en tokens.
La salida no es un modelo más grande, es darle **memoria** y un **mapa**.

- **Cortex:** el conocimiento del proyecto (decisiones, reglas, pendientes) que el agente consulta en vez de deducir.
- **Graphify:** el grafo del código: quién llama a quién, qué se rompe si tocas eso.
- **Consulta dirigida:** preguntar al grafo en vez de leer el árbol de archivos.

## 1 · ¿Cuánto pesa tu proyecto? (Experiencia)

Lo que el agente leería si «revisa todo»:

```bash
git ls-files | xargs cat 2>/dev/null | wc -c
```

Divide entre 4: son los tokens aproximados de una vuelta sin mapa.

## 2 · Lo que olvida (Observación)

Cada sesión empieza en blanco. Le vuelves a contar cómo se corre, qué se decidió y dónde está cada cosa.
Eso se paga de nuevo en cada sesión.

## 3 · Cortex: la memoria (Conceptos)

**Cortex** (paquete `cortexboard`) guarda la memoria del proyecto en una carpeta `.cortex/` de tu repositorio.
Su documentación lo resume así: una memoria compartida que los agentes leen barato y que las personas controlan.

- El agente empieza con `cortex_brief`: un resumen de **unos 600 tokens**. Después baja solo por la rama que necesita.
- Las páginas se enlazan al código y se marcan **desactualizadas** cuando ese código cambia.
- Lo que escribe una IA queda como **borrador** hasta que una persona lo aprueba.
- La búsqueda es local: buscar no gasta tokens.

Lo que miden sus autores (`docs/BENCHMARKS.md`, 24-09-2026): con preguntas de «por qué» y «quién decidió»,
los agentes con Cortex acertaron **el doble** con casi los mismos tokens. En un proyecto grande, el contexto
recuperado bajó de **55,5 K a 3,9 K tokens**. Y cuando la respuesta ya está en el código, leer el código fue igual de bueno.

```bash
npx cortexboard init                                          # crea .cortex/ (Node 22.16 o más)
npx cortexboard start                                         # tablero en http://localhost:4747
claude mcp add cortex -- npx cortexboard mcp --actor ai-agent # conecta Claude Code
```

## 4 · Graphify: el mapa (Conceptos)

**Graphify** convierte una carpeta en un grafo: funciones, archivos y quién llama a quién.
El código se extrae por su estructura (AST), **sin LLM y sin clave de API**.

| Pregunta | Comando |
|---|---|
| ¿Qué se rompe si toco X? | `graphify affected "X"` |
| ¿Cómo llego de A a B? | `graphify path "A" "B"` |
| ¿Qué es X y con quién habla? | `graphify explain "X"` |
| Pregunta libre, con tope | `graphify query "…" --budget 1500` |
| ¿Cuáles son los centros del proyecto? | `graphify god-nodes` |

### Lo que medimos (08-11-2026, copia del backend del LMS)

- 89 archivos Go, 790 053 caracteres (≈ 197 500 tokens si el agente los lee todos).
- `graphify update .` armó el grafo en **10 segundos**: 1 143 nodos y 4 600 relaciones, sin LLM.
- `graphify affected "salaDe"` respondió qué se rompe en **563 caracteres** (≈ 141 tokens): seis funciones, con archivo y línea.

## 5 · Instala y construye tu grafo (Experimentación)

```bash
uv tool install graphifyy        # o: pipx install graphifyy
graphify install                 # deja el skill /graphify en tu agente
graphify update .                # grafo del código, sin LLM
graphify affected "<una función tuya>"
```

En Claude Code también puedes escribir `/graphify .`

## 6 · Consulta en vez de leer (Experimentación)

Elige una función de tu proyecto y mide:

```bash
git ls-files | xargs cat 2>/dev/null | wc -c     # leer todo
graphify affected "<función>" | wc -c             # preguntar al grafo
```

Publica tu **proyecto entero → consulta** en la escena 9.

## Para la clase 3

Deja Cortex y el grafo en tu proyecto. El lunes 16 sumamos Caveman y medimos el flujo completo.
