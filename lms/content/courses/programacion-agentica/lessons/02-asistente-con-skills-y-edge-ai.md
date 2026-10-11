---
id: pa-02
title: "Clase 2 · Construir un asistente con skills, plan de trabajo y Edge AI"
starts_at: 2026-10-15T19:00:00-05:00
published: true
objectives:
  - id: pa-02-o1
    title: Instalar y usar los 14 skills del taller con tu modelo (OpenCode con el gateway, Claude Code u Ollama)
  - id: pa-02-o2
    title: Convertir un pedido vago en un plan de trabajo con tareas verificables y seguirlo en vivo con la pantalla de obra
  - id: pa-02-o3
    title: Correr un modelo de lenguaje, voz a texto y generación de imágenes en tu laptop y elegir el nivel que cabe en tu máquina
  - id: pa-02-o4
    title: Probar el asistente con usuarios reales y medir tiempos
recording:
  url: ""
  passcode: ""
repo:
  url: https://github.com/davrv93/jmd
  ref: main
materials:
  - id: pa-02-temario
    title: Temario del curso (3 sesiones, PDF)
    kind: pdf
    file: materials/temario-curso.pdf
    objective_ids: [pa-02-o1, pa-02-o2, pa-02-o3, pa-02-o4]
  - id: pa-02-taller
    title: taller-agentico.zip · skills, herramienta obra y el asistente Tecnosito (backend + frontend)
    kind: zip
    file: materials/taller-agentico.zip
    objective_ids: [pa-02-o1, pa-02-o2, pa-02-o3]
  - id: pa-02-skills
    title: skills-taller.zip · los 14 skills, instalar.sh, AGENTS.md y prompts para Ollama
    kind: zip
    file: materials/skills-taller.zip
    objective_ids: [pa-02-o1]
  - id: pa-02-capturas
    title: "Capturas de referencia: chatbot, robot, flyers, obra en vivo"
    kind: slides
    file: materials/clase-02-capturas.pdf
    slides_dir: materials/clase-02-capturas
    objective_ids: [pa-02-o2, pa-02-o3, pa-02-o4]
  - id: pa-02-m1
    title: Descargar Ollama
    kind: link
    url: https://ollama.com/download
    objective_ids: [pa-02-o3]
  - id: pa-02-m2
    title: Modelo qwen3 en Ollama
    kind: link
    url: https://ollama.com/library/qwen3
    objective_ids: [pa-02-o3]
  - id: pa-02-m3
    title: faster-whisper (voz a texto en tu máquina)
    kind: doc
    url: https://github.com/SYSTRAN/faster-whisper
    objective_ids: [pa-02-o3]
  - id: pa-02-m4
    title: sd-turbo en Hugging Face (nivel rápida)
    kind: link
    url: https://huggingface.co/stabilityai/sd-turbo
    objective_ids: [pa-02-o3]
  - id: pa-02-m5
    title: sdxl-turbo en Hugging Face (nivel buena)
    kind: link
    url: https://huggingface.co/stabilityai/sdxl-turbo
    objective_ids: [pa-02-o3]
  - id: pa-02-m6
    title: FLUX.2 Klein 4B para mflux (nivel máxima, solo Apple Silicon)
    kind: link
    url: https://huggingface.co/mflux-community/flux2-klein-4b-mflux-q4
    objective_ids: [pa-02-o3]
  - id: pa-02-m7
    title: mflux (difusión con MLX en Mac)
    kind: doc
    url: https://github.com/filipstrand/mflux
    objective_ids: [pa-02-o3]
  - id: pa-02-m8
    title: Three.js · documentación (el avatar 3D)
    kind: doc
    url: https://threejs.org/docs/
    objective_ids: [pa-02-o2]
  - id: pa-02-m9
    title: FastAPI · documentación (el backend del asistente)
    kind: doc
    url: https://fastapi.tiangolo.com/
    objective_ids: [pa-02-o2]
  - id: pa-02-m10
    title: Playwright · introducción (capturas y pruebas del navegador)
    kind: doc
    url: https://playwright.dev/docs/intro
    objective_ids: [pa-02-o4]
cycle:
  - id: ver
    title: Ver la clase
    tool: zoom
    phase: experiencia
    description: Asiste en vivo o mira la grabación. Ten abierta la carpeta del taller en VS Code y una terminal lista.
    check: Has visto la clase completa (o la grabación)
  - id: relevar
    title: Relevar tu máquina
    tool: terminal
    phase: experiencia
    description: Descomprime taller-agentico.zip, crea el entorno virtual, instala los requisitos y corre el diagnóstico. Anota el nivel de imagen que te toca.
    check: "python osito/backend/diagnostico.py imprime tu nivel máximo de imagen"
  - id: ollama
    title: Instalar Ollama y bajar qwen3:1.7b
    tool: terminal
    phase: experiencia
    description: Instala Ollama desde ollama.com y descarga el modelo de chat la noche anterior, nunca en el aula.
    check: "ollama list muestra qwen3:1.7b"
  - id: skills
    title: Instalar los skills
    tool: terminal
    phase: experiencia
    description: Dentro de la carpeta del taller, corre el instalador. Copia los 14 skills y genera AGENTS.md y prompts/ para tu herramienta.
    check: "bash instalar.sh termina con «Skills encontrados : 14»"
  - id: plan
    title: Escribir el plan de trabajo
    tool: opencode
    phase: conceptualizacion
    description: Activa el modo piedra y pide a tu agente, con el skill plan-de-trabajo, un PLAN_TRABAJO.md con seis tareas y criterio de aceptación sí o no.
    check: Existe PLAN_TRABAJO.md con 6 tareas
  - id: construir
    title: Construir con la obra en vivo
    tool: opencode
    phase: experiencia
    description: Inicia la obra con las seis tareas, abre obra.html y deja que el agente ejecute el plan marcando cada paso cuando esté verificado.
    check: Obra al 100 %
  - id: voz-imagen
    title: Probar voz e imagen
    tool: terminal
    phase: reflexion
    description: Dicta una pregunta por micrófono y pide un flyer con fecha, hora y precio. Revisa los datos extraídos y corrige uno a propósito.
    check: Captura del flyer con los datos correctos
  - id: preguntar
    title: Preguntar o responder
    tool: lms
    phase: reflexion
    description: Publica al menos una pregunta sobre la clase en este LMS o responde una de un compañero.
    check: Tu pregunta aparece en el hilo de la sesión
  - id: entregar
    title: Entregar la tarea 2
    tool: git
    phase: experimentacion
    description: Sube el repositorio clase-02 con faq.json, capturas/ y REFLEXION.md y entrégalo desde el LMS (URL + commit).
    check: La entrega aparece en «Mis notas» con estado en cola
---

## Avance de la clase

Hoy dejas de instalar y empiezas a construir. Al terminar la sesión vas a tener un asistente que
corre entero en tu laptop: conversa con un modelo de lenguaje local, te escucha por el micrófono,
genera imágenes y flyers, y responde preguntas sobre un tema que tú eliges (el catálogo de una
tienda, las políticas de una empresa, las preguntas frecuentes de un servicio). Nada sale a la
nube. Nada cuesta por uso.

Lo construye tu **agente**, no tú línea por línea. Tu trabajo es el de la clase pasada, pero con
más herramientas: darle contexto con **skills**, convertir el pedido en un **plan de trabajo con
tareas que se pueden probar**, mirar cómo avanza en la **pantalla de obra**, y al final **probar
con una persona real y medir** cuánto tarda cada cosa.

El proyecto se llama **Tecnosito**: un asistente con avatar 3D. En clase todos construyen el
mismo, pero cada equipo lo adapta con su propio corpus (10 a 20 párrafos de su dominio).

Orden de la sesión (2 horas):

| Tiempo | Bloque | Qué pasa | Entregable |
|---|---|---|---|
| 0:00 a 0:10 | Apertura | Repaso de 2 minutos de la clase 1. Qué es Edge AI. Demo: pregunta por voz, respuesta hablada, flyer generado | Ninguno |
| 0:10 a 0:25 | Skills | `bash instalar.sh` copia los 14 skills. Activar modo piedra. Pedir un plan sin skill y luego con `planificacion-proyecto`; comparar | Skills instalados y plan de media página |
| 0:25 a 0:40 | Plan y obra | Con `plan-de-trabajo`, escribir `PLAN_TRABAJO.md` con 6 tareas y criterio verificable. `obra.py servir` y la pantalla visible | Plan con 6 tareas, obra al 0 % |
| 0:40 a 1:10 | Construcción | El agente ejecuta el plan. Cargar el corpus en `faq.json`, cambiar nombre y saludo. Cada tarea cerrada se marca con `obra.py paso` | Asistente respondiendo preguntas del dominio con voz |
| 1:10 a 1:30 | Edge AI | Micrófono a texto con whisper. Flyer del equipo: revisar los datos extraídos, cambiar uno a propósito, regenerar. Comparar niveles rápida, buena y máxima | Flyer con datos correctos |
| 1:30 a 1:50 | Pruebas | Pruebas cruzadas con `pruebas-de-uso`: 5 minutos con el asistente de otro equipo y un guion de 3 tareas. Medir chat, voz e imagen | Hoja de hallazgos y tabla de tiempos |
| 1:50 a 2:00 | Cierre | Un minuto por equipo. Lecciones. Tarea 2 y preparación de la clase 3 | Obra al 100 % |

> **Antes de la clase (40 minutos en casa, obligatorio).** La red del aula no aguanta cinco
> descargas de 2,4 GB. Todo lo pesado se baja la noche anterior: Ollama con `qwen3:1.7b`, el
> modelo de imagen de tu nivel y los requisitos de Python. La sección 2 tiene los comandos
> exactos. Quien llegue sin modelo de imagen trabaja igual: el sistema cae a un modo demo.

---

## 1. Qué es Edge AI y por qué nos importa

**Edge AI** es correr los modelos de inteligencia artificial **en el propio equipo**, no en un
servidor ajeno. El texto que escribes, el audio que grabas y la imagen que generas no salen de
tu laptop.

Tres razones para hacerlo en este curso:

| Razón | Qué significa para ti |
|---|---|
| **Sin nube** | Funciona sin internet. En el aula, con el wifi saturado, tu asistente sigue respondiendo |
| **Sin costo por uso** | No hay cuota, no hay clave, no hay 429. Puedes probar cien veces |
| **Datos en tu máquina** | Un catálogo de precios, una lista de clientes o un reglamento interno no se mandan a nadie |

El precio que se paga es otro: los modelos son más pequeños y tu máquina marca el límite. Por
eso una parte de la clase es **saber qué cabe en tu laptop**.

### Qué corre dónde

| Tarea | Herramienta | Modelo que usamos | Dónde corre |
|---|---|---|---|
| Texto (chat, extraer datos) | **Ollama** | `qwen3:1.7b` | CPU, en cualquier máquina. ~1,5 GB de RAM |
| Voz a texto | **faster-whisper** | `small` | CPU. ~0,5 GB. Transcribe una frase de 4 s en 1,7 s |
| Imagen | **diffusers** o **mflux** | `sd-turbo`, `sdxl-turbo` o `FLUX.2 Klein` | GPU si hay; CPU si no. De 5 a 12 GB |

Ollama es un programa que descarga y ejecuta modelos de lenguaje y los expone por HTTP en el
puerto `11434`. Para OpenCode es un **proveedor** más (lo viste en la clase 1): puedes apuntar tu
agente a Ollama en vez de al gateway. En este curso, Ollama es sobre todo el **cerebro del
asistente** que construimos.

Un dato que conviene fijar desde ahora: **Ollama no genera imágenes**. Un modelo de lenguaje
produce texto. Las imágenes las produce un **modelo de difusión**, que es otra cosa y la vemos
en la sección 8.

---

## 2. Preparar tu laptop

### Descomprimir y crear el entorno

Descarga **taller-agentico.zip** (adjuntos) y descomprímelo en una carpeta sin espacios en el
nombre. Dentro, en la terminal de VS Code:

```bash
cd taller-agentico
python3 -m venv .venv && source .venv/bin/activate   # en Windows: .venv\Scripts\activate
pip install -r osito/backend/requirements.txt
python osito/backend/diagnostico.py
```

`diagnostico.py` imprime tu sistema, el acelerador que ve `torch`, la memoria útil y **el nivel
máximo de imagen para esta máquina**. Guarda esa salida: la vas a necesitar.

### Ollama y el modelo de chat

Instala Ollama desde la página de descargas (Windows, macOS y Linux). Después:

```bash
ollama pull qwen3:1.7b
ollama list                      # debe aparecer qwen3:1.7b
ollama run qwen3:1.7b "Di hola en una frase"
```

`qwen3:1.7b` pesa alrededor de 1,5 GB y responde en unos 2 segundos en CPU. Es pequeño a
propósito: cabe en todas las máquinas del aula.

### Los tres niveles de imagen

El asistente genera imágenes con uno de tres modelos. **Tú no eliges el nivel: lo decide tu
máquina** (y lo imprime el diagnóstico). Pedir `maxima` en una laptop que solo aguanta `rapida`
devuelve `rapida`, sin error.

| Nivel | Modelo | Peso en disco | Tiempo medido (Mac Apple Silicon, 24 GB) | Memoria | Requisito |
|---|---|---|---|---|---|
| rápida | sd-turbo fp16 | 2,4 GB | 1,4 a 2,3 s por imagen de 512 px; la primera ~20 s con carga | 5 GB | cualquier GPU o CPU |
| buena | sdxl-turbo fp16 | 7 GB | 7 s el flyer en caliente, 27 s la primera | 12 GB | 16 GB de RAM o 6 GB de VRAM |
| máxima | FLUX.2 Klein 4B, 4 bits | 4,6 GB | 32 a 55 s por imagen; flyer completo 45 s | 8 GB | solo Apple Silicon con 16 GB y `pip install mflux` |

Dos observaciones que valen más que la tabla: **sdxl-turbo en caliente es más rápido que
sd-turbo y se ve mucho mejor**, así que si tu máquina lo aguanta es el nivel por defecto. Y la
**primera imagen y las siguientes son dos cifras distintas**: la primera incluye cargar el
modelo.

### Descargar solo tu nivel

Descarga **una sola vez** y **un solo modelo a la vez**, con `HF_HUB_DISABLE_XET=1` delante. El
protocolo xet de Hugging Face se quedó dos horas atascado en 1,1 GB durante la demo; sin xet
baja a 11 MB/s sostenidos.

```bash
# rápida (sd-turbo, 2,4 GB): todos
HF_HUB_DISABLE_XET=1 .venv/bin/python -c "from huggingface_hub import snapshot_download as s; s('stabilityai/sd-turbo', allow_patterns=['*.json','*.txt','tokenizer/*','scheduler/*','*/*.fp16.safetensors'])"

# buena (sdxl-turbo, 7 GB): solo si el diagnóstico dice sdxl-turbo
HF_HUB_DISABLE_XET=1 .venv/bin/python -c "from huggingface_hub import snapshot_download as s; s('stabilityai/sdxl-turbo', allow_patterns=['*.json','*.txt','tokenizer*/*','scheduler/*','*/*.fp16.safetensors'])"

# máxima (FLUX.2 Klein, 4,6 GB): solo Mac con 16 GB o más, tras `pip install mflux`
HF_HUB_DISABLE_XET=1 .venv/bin/python -c "from huggingface_hub import snapshot_download as s; s('mflux-community/flux2-klein-4b-mflux-q4')"
```

Si tienes una **NVIDIA RTX serie 50**, instala antes `torch` con CUDA 12.8, porque el `torch`
normal no la ve:

```bash
pip install torch --index-url https://download.pytorch.org/whl/cu128
```

Para otras NVIDIA (series 20, 30, 40) el índice es `cu126`.

### Si no tienes GPU

Es el caso más común y **es normal**. `torch` no usa las gráficas AMD en Windows ni las
integradas de Intel o AMD; todo va por CPU.

- sd-turbo en CPU tarda **de 20 a 60 segundos por imagen**. Suficiente para la clase.
- No instales drivers, ROCm ni DirectML el día del taller. No hay nada que ganar ahí.
- Con 8 GB de RAM, cierra el navegador mientras genera.
- Si la imagen sale negra, el backend reintenta solo en fp32. No es culpa de tu máquina.
- Si de todos modos no llega, el **modo demo** (una lámina con formas y colores) te deja seguir
  la clase sin modelo.

El ejemplo **«Qué nivel de imagen le toca a tu laptop»** tiene la tabla de decisión completa.

---

## 3. Los 14 skills del taller

En la clase 1 escribiste una skill de dos líneas. Hoy instalas catorce que escribió el
instructor para este taller. Cada una es una carpeta con su `SKILL.md`, con una **versión
completa** (para Claude Code y GPT) y una **versión corta para modelos pequeños** (menos de 25
líneas, órdenes literales).

| Skill | Para qué sirve |
|---|---|
| `planificacion-proyecto` | Convertir un pedido vago en un `PLAN_PROYECTO.md` de dos páginas: usuario, «hecho significa», entregables, riesgos y «no entra» |
| `plan-de-trabajo` | Pasar de entregables a tareas de 45 minutos con criterio verificable, hitos y registro de avance en `PLAN_TRABAJO.md` |
| `obra-en-vivo` | Mantener la pantalla de «proyecto en construcción» con `obra/obra.py`: pasos, barra de avance y franja incrustable |
| `relevar-maquinas` | Antes de un taller con modelos locales, pedir SO, RAM, GPU y VRAM, asignar nivel y repartir las descargas |
| `imagenes-locales` | Generar imágenes y flyers con difusión local: tope por máquina, descargas y la tubería LLM + difusión + Pillow |
| `comandos-optimizados` | Comandos de terminal baratos en tokens, con salida recortada y ensayo antes de destruir |
| `piedra` | Modo de respuesta ultracompacto cuando el contexto se agota o pides ir al grano |
| `diseno-visual` | Tokens, paletas, profundidad, jerarquía y movimiento con duraciones permitidas |
| `ui-componentes` | Botón, campo, tarjeta, modal, toast, chat y panel lateral con todos sus estados |
| `ux-flujos` | Mapa de tareas, camino feliz y de error, textos en español claro, estados vacíos |
| `responsividad` | Móvil primero: puntos de corte, zonas táctiles de 44 px y prueba a 393 px |
| `accesibilidad` | WCAG 2.2 AA en la práctica: contraste, foco, subtítulos de todo lo que dice el avatar |
| `pruebas-de-uso` | Cinco personas, pensar en voz alta, hallazgos con severidad de 1 a 4 |
| `pruebas-de-rendimiento` | Medir con comandos exactos y umbrales fijados antes: tokens/s de Ollama, RTF de Whisper, fps |

### Instalar según tu herramienta

Un solo comando hace las tres cosas:

```bash
cd taller-agentico
bash instalar.sh .
```

| Herramienta | Qué usa | Cómo llega al modelo |
|---|---|---|
| **Claude Code** | `~/.claude/skills/<nombre>/SKILL.md` | `instalar.sh` los copia. El agente carga cada skill solo cuando tu pedido encaja con su `description` |
| **OpenCode** (con el gateway) | `AGENTS.md` en la raíz del proyecto, o los mismos skills en `.opencode/skills/` | `instalar.sh` genera `AGENTS.md` con la versión corta de cada skill. OpenCode también lee `~/.claude/skills/`, así que las dos rutas funcionan |
| **Ollama** (o cualquier chat que acepte un system prompt) | `prompts/<skill>.txt` | Pegas el archivo como system prompt, o lo pasas con `ollama run` desde un `Modelfile` con `SYSTEM` |

La salida esperada termina así:

```text
Skills encontrados : 14 (accesibilidad comandos-optimizados diseno-visual ...)
Claude Code        : /Users/tu-usuario/.claude/skills (14 copiados, 0 sin cambios)
AGENTS.md          : /ruta/taller-agentico/AGENTS.md (412 lineas)
Prompts            : /ruta/taller-agentico/prompts (14 archivos)
```

`instalar.sh` es idempotente: puedes repetirlo sin miedo. Con `--solo-prompts` no toca
`~/.claude` y solo regenera `AGENTS.md` y `prompts/`.

Para Ollama, así se arma un modelo con un skill incorporado:

```bash
cat > Modelfile <<'EOF'
FROM qwen3:1.7b
SYSTEM """
EOF
cat prompts/plan-de-trabajo.txt >> Modelfile
printf '"""\n' >> Modelfile
ollama create planificador -f Modelfile
ollama run planificador "Tengo tres entregables: catálogo, carrito y pago. Haz el plan de trabajo."
```

### El ejercicio de los dos planes

En clase pides lo mismo dos veces: «quiero un asistente para la tienda que responda preguntas
sobre productos y horarios». Primero **sin skill**; después pides «usa `planificacion-proyecto`».
Compara: el segundo plan tiene usuario, «hecho significa», qué no entra y riesgos. El primero
suele ser una lista de funcionalidades sin forma de saber cuándo está terminado. Esa diferencia
es lo que vale una skill.

---

## 4. Modo piedra

**Piedra** es una skill que cambia **cómo responde** el agente, no cómo piensa ni cómo escribe
código. Quita saludos, conectores, repeticiones y artículos; deja cifras, rutas, comandos y
negaciones **exactas**. Frases de 20 palabras como máximo.

Se activa y se apaga con dos frases:

```text
/piedra            (o «modo piedra»)   → el agente responde: «Modo piedra activo.»
modo normal                             → el agente responde: «Modo normal activo.»
```

Antes y después:

| Sin piedra | Con piedra |
|---|---|
| «Claro, con gusto. He revisado el contenedor y parece que está corriendo correctamente desde hace unas 3 horas, así que no debería haber problema» | «Sí. `docker ps` muestra `Up 3 hours`.» |
| «Podrías considerar ejecutar `npm ci` para reinstalar las dependencias, lo cual probablemente resuelva el error que estás viendo» | «Ejecuta `npm ci`. Reinstala dependencias. Resuelve el error de módulo faltante.» |

¿Por qué ahorra? Un agente gasta tokens de **salida** en cada turno, y los tokens de salida son
los más caros y los más lentos. En una sesión de dos horas con cuotas gratuitas, piedra puede
ser la diferencia entre terminar y quedarte sin cuota a la mitad. Tres niveles: `piedra lite`
(solo quita cortesías), `piedra` (el normal) y `piedra dura` (12 palabras por frase, una sola
alternativa por decisión).

Lo que piedra **no** toca: código, mensajes de commit, documentación, correos. Y se apaga sola
cuando la claridad vale más que la brevedad: borrar, sobrescribir, desplegar o cuando dices «no
entendí». Si en la clase 1 usaste `caveman`, es la misma idea; piedra está escrita en español y
para este taller. No uses las dos a la vez.

Detalle en el ejemplo **«Modo piedra: respuestas cortas que ahorran tokens»**.

---

## 5. Plan de trabajo con tareas verificables

Un pedido vago («hazme un asistente para la tienda») no se le da a un agente tal cual. Se
convierte en un **plan de trabajo**: una tabla de tareas cortas donde cada una tiene un
**criterio de aceptación que devuelve sí o no**.

La regla que manda es una sola:

> **Ninguna tarea sin forma de probarla.** Si no sabes cómo comprobar que quedó hecha, no la
> escribas todavía.

Formas válidas de criterio: un comando con su salida esperada, una acción en pantalla con un
resultado visible, un archivo que existe con cierto contenido. Formas inválidas: «funciona»,
«está listo», «se ve bien».

### Las seis tareas de hoy

Cada equipo escribe su propio plan con el skill `plan-de-trabajo`, pero estas son las seis
tareas sugeridas, de 15 minutos cada una:

| ID | Tarea (imperativo + objeto) | Criterio de aceptación (sí/no) |
|---|---|---|
| T1 | Cargar el corpus del equipo en `faq.json` | `/api/chat` con Ollama apagado responde una pregunta del corpus con `fuente: "faq"` |
| T2 | Cambiar nombre y saludo del asistente | La pantalla saluda con el nombre nuevo al abrir `http://localhost:8765` |
| T3 | Responder tres preguntas del dominio | Las tres preguntas devuelven la respuesta esperada o «No estoy seguro de eso todavía» cuando no está en el corpus |
| T4 | Transcribir el micrófono a texto | Grabar 3 s en Chrome muestra el texto antes de enviarlo |
| T5 | Generar el flyer del equipo con datos correctos | Título, fecha, hora y precio salen exactos al pedido en la imagen y en `datos` |
| T6 | Pasar pruebas de uso con otro equipo | Hoja con 3 tareas, severidad de cada hallazgo y una mejora propuesta |

### Plantilla corta

Esto es lo mínimo que debe tener tu `PLAN_TRABAJO.md`. El skill trae la versión completa con
fases, hitos y registro de avance.

```markdown
# PLAN DE TRABAJO: Asistente de la tienda

Estados válidos: pendiente · en curso · hecha · bloqueada (motivo)
Avance: 0 de 6 tareas hechas (0 %)
Comando de avance: `python3 obra/obra.py paso "<texto>" --pct <pct>`

| ID | Tarea | Criterio de aceptación | Depende de | Estado | Cerrada |
|----|-------|------------------------|------------|--------|---------|
| T1 | Cargar el corpus en faq.json | curl a /api/chat devuelve fuente faq | — | pendiente | |
| T2 | Cambiar nombre y saludo | la pantalla saluda con el nombre nuevo | T1 | pendiente | |
| ... | | | | | |

## Registro de avance
| Fecha y hora | Qué se cerró | Quién lo vio | Observación |

## Fuera de alcance (apareció durante la ejecución)
- ...
```

Reglas duras que el agente debe respetar (y tú vigilar): una sola tarea `en curso` a la vez;
no marcar `hecha` sin ejecutar el criterio («debería funcionar» es `en curso`); no borrar
tareas ni renumerar identificadores; lo que aparece durante la ejecución se anota, nunca se
hace en silencio.

---

## 6. Obra en vivo

Mientras el agente trabaja, tú no deberías tener que leer su terminal para saber cómo va. La
**obra** es una pantalla que muestra el proyecto «en construcción»: nombre, fase, barra de
avance y una línea de tiempo con cada paso. Se refresca sola cada 2 segundos leyendo
`obra/estado.json`. El agente la mantiene al día con `obra/obra.py`; **nunca edita el JSON a
mano**.

`obra.py` usa solo la biblioteca estándar de Python. No hay nada que instalar.

### Los subcomandos

| Comando | Qué hace |
|---|---|
| `obra.py iniciar "<proyecto>" --pasos "a" "b" "c"` | Crea `estado.json` con todos los pasos pendientes y la barra en 0 % |
| `obra.py servir [--puerto 8787]` | Sirve `obra.html` y `estado.json` por HTTP, sin caché y con CORS abierto |
| `obra.py paso "<texto>" [--fase X] [--pct N]` | Cierra como hecho el paso en curso y abre el que coincide por texto (parcial, sin mayúsculas). Si no existe, lo añade |
| `obra.py hecho` | Cierra el paso en curso sin abrir otro (el último) |
| `obra.py error "<motivo>"` | Marca el paso en curso en error; la línea de tiempo lo muestra con una cruz |
| `obra.py ver` | Muestra la barra y los pasos en la terminal |

Un flujo completo con las seis tareas de hoy:

```bash
python3 obra/obra.py iniciar "Asistente de la tienda" --pasos \
  "Cargar el corpus" "Nombre y saludo" "Tres preguntas del dominio" \
  "Micrófono a texto" "Flyer del equipo" "Pruebas de uso"
python3 obra/obra.py servir &            # http://localhost:8787/obra.html
python3 obra/obra.py paso "corpus" --fase Backend
# ... el agente trabaja y verifica T1 ...
python3 obra/obra.py paso "saludo" --fase Frontend
# ... y así hasta la última ...
python3 obra/obra.py hecho               # barra al 100 %
```

Si el puerto 8787 está ocupado (`lsof -i :8787` lo dice), usa `--puerto 8797`.

### La pantalla

Abre `http://localhost:8787/obra.html` en Chrome y déjala visible: media pantalla, o una
pestaña aparte. Vas a ver el nombre del proyecto, la fase (`Plan`, `Backend`, `Frontend`,
`Pruebas`, `Entrega`), la barra y la línea de tiempo con la hora en que se cerró cada paso. Las
**horas reales** importan: en la evaluación se mira que los pasos se marcaron durante la sesión,
no todos al final.

Reglas para los textos de los pasos: en español, 60 caracteres o menos, sin rutas ni nombres de
funciones. «Voz del asistente», no «integrar TTS en voz.js».

### La franja compacta

`obra.html?compacto=1` muestra solo la barra y el paso actual en 56 px de alto. Sirve para
incrustarla dentro de otra pantalla (el propio asistente la muestra en su panel «Obra»):

```html
<iframe src="http://localhost:8787/obra.html?compacto=1"
        title="Obra en vivo" style="width:100%;height:56px;border:0"></iframe>
```

Y cualquier frontend puede leer el estado directo:

```js
const r = await fetch("http://localhost:8787/estado.json", { cache: "no-store" });
const { proyecto, fase, pct, pasos } = await r.json();
```

El esquema de `estado.json` no se cambia (otras herramientas lo leen): `proyecto`, `fase`,
`pct`, `actualizado` y `pasos` con `hora`, `texto` y `estado` (`hecho`, `en_curso`, `pendiente`,
`error`).

> La regla que más se rompe: **nunca marcar hecho sin verificar**. Verificar es ejecutar la
> prueba, abrir la pantalla o leer la salida real. Si ves que la barra avanza más rápido de lo
> que tú comprobaste, frena al agente.

Detalle en el ejemplo **«Plan de trabajo y obra en vivo»**.

---

## 7. Construir: el asistente Tecnosito

### Qué hace

Tecnosito es un asistente con avatar 3D (un osito, o un robot: hay dos modelos) que:

- **Conversa** con `qwen3:1.7b` por Ollama y cambia de ánimo según la respuesta (`feliz`,
  `pensando`, `sorprendido`, `triste`, `emocionado`, `neutral`).
- **Escucha** por el micrófono y transcribe con faster-whisper. Te muestra el texto antes de
  enviarlo.
- **Habla** lo que responde, con subtítulos en el chat.
- **Genera imágenes y flyers** con el modelo de difusión de tu nivel.
- **Muestra la obra** en un panel, con la franja compacta.

El backend es **FastAPI** (Python) y sirve también el frontend (HTML, JavaScript y **Three.js**
para el avatar). Todo vive en `osito/`.

### Arrancar

```bash
bash osito/arrancar.sh                   # crea .venv si falta, instala y arranca con recarga
# abre http://localhost:8765
```

Si el puerto está ocupado: `OSITO_PUERTO=8766 bash osito/arrancar.sh`. Siempre entra por
`localhost`, nunca por IP: Chrome solo permite el micrófono en `localhost`.

La primera llamada a cada motor es lenta porque carga el modelo: whisper ~1 s, sd-turbo ~6 s,
los embeddings del corpus ~3 s. Las siguientes no.

### La API: 5 rutas

| Ruta | Entrada | Salida |
|---|---|---|
| `POST /api/chat` | `{"mensaje", "historial": [{"rol": "usuario" o "osito", "texto"}]}` | `{"texto", "animo", "fuente": "ollama" o "faq"}` |
| `POST /api/stt` | multipart, campo `audio` (webm, ogg, wav, m4a) | `{"texto", "idioma", "segundos"}` |
| `POST /api/imagen` | `{"prompt", "estilo", "tipo": "auto" o "flyer", "calidad": "rapida" o "buena" o "maxima"}` | `{"url", "motor", "segundos"}` y, si es flyer, `datos` y `datos_por` |
| `GET /api/salud` | — | `{"ollama": bool, "whisper": bool, "imagen", "motores_imagen", "tope_imagen", "modelo"}` |
| `GET /api/estado` | — | el contenido de `obra/estado.json` |

Los errores son siempre JSON `{"error": "..."}`: 422 si falta un campo, 502 si el motor falló.
La documentación interactiva está en `http://localhost:8765/api/docs`. El contrato de estas
cinco rutas estuvo cerrado **antes** de construir: así cinco agentes trabajaron en paralelo sin
pisarse. Esa es la lección de arquitectura de la clase.

Prueba rápida con el servidor levantado:

```bash
curl -s http://localhost:8765/api/salud
curl -s -X POST http://localhost:8765/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"mensaje": "¿qué puedes hacer?", "historial": []}'
```

### Cambiar el nombre y el saludo

El nombre vive en dos lugares, porque backend y frontend son independientes:

| Qué | Dónde | Cómo |
|---|---|---|
| Nombre en el system prompt del modelo | variable `OSITO_NOMBRE` | `OSITO_NOMBRE="Tienda Bot" bash osito/arrancar.sh` |
| Nombre que muestra la pantalla | parámetro `?nombre=` de la URL, o la constante `NOMBRE_OSITO` en `osito/frontend/app.js` | `http://localhost:8765/?nombre=Tienda%20Bot` |
| Frase de bienvenida | `osito/frontend/app.js`, busca `Hola, soy` | Edita el texto |

Esta es una tarea para el agente, no para ti: «cambia el nombre del asistente a Tienda Bot y
que salude con "Hola, ¿qué producto buscas hoy?"». Tú verificas el criterio: abrir la página y
leer el saludo.

### El corpus: `faq.json`

El respaldo del asistente (y su memoria de tu dominio) es `osito/backend/faq.json`: una lista de
entradas, cada una con varias formas de la misma pregunta, una respuesta y un ánimo.

```json
[
  {
    "preguntas": ["cuál es el horario", "a qué hora abren", "hasta qué hora atienden"],
    "respuesta": "Atendemos de lunes a sábado de 9 de la mañana a 8 de la noche. Los domingos de 10 a 2.",
    "animo": "feliz"
  },
  {
    "preguntas": ["hacen envíos", "entregan a domicilio", "cuánto cuesta el envío"],
    "respuesta": "Sí. El envío en la ciudad cuesta 8 soles y llega el mismo día si pides antes de las 4 de la tarde.",
    "animo": "emocionado"
  }
]
```

Reglas prácticas: tres o cuatro formas por pregunta (con y sin tilde, con palabras distintas);
respuestas de dos o tres frases; el ánimo entre los seis válidos. Al cambiar el archivo,
**reinicia el servidor**: el corpus se carga una sola vez.

### Cómo responde cuando Ollama no está

`/api/chat` intenta primero Ollama. Si no responde, cae a la **FAQ por embeddings**: convierte
tu pregunta en un vector, la compara con todas las preguntas del corpus y devuelve la respuesta
más parecida **si la similitud pasa el umbral** (0,55 por defecto). Si no lo pasa, dice:

```text
No estoy seguro de eso todavía. ¿Me lo explicas de otra forma?
```

Eso **no es un error**: es el asistente negándose a inventar. El chip de salud de la pantalla se
pone gris cuando Ollama no está, y puedes seguir trabajando. Para forzar la FAQ a propósito (y
probar tu corpus sin que el modelo responda por su cuenta):

```bash
OSITO_OLLAMA_URL=http://localhost:1 bash osito/arrancar.sh
```

Detalle en el ejemplo **«Tu corpus en faq.json»**.

---

## 8. Voz y flyers

### Micrófono a texto

El botón del micrófono graba en Chrome (`audio/webm` con opus), lo manda a `/api/stt` y
**faster-whisper** `small` lo transcribe en tu CPU. Una frase de 4 segundos tarda 1,7 s (factor
de tiempo real 0,43: transcribe más rápido de lo que hablas). El texto aparece en el campo
**antes de enviarse**, para que lo corrijas si entendió otra cosa.

Dos cosas que debes saber: Chrome solo da el micrófono en `localhost`; y si no hay voz (ruido,
silencio), whisper devuelve texto vacío, no error.

### Por qué un modelo de difusión no escribe

Un modelo de difusión aprende a **pintar**: formas, luces, colores, texturas. No sabe leer ni
escribir. Si le pides «un cartel que diga Oferta 20 %», dibuja algo que **parece** letras pero
no lo es. sd-turbo produjo garabatos; FLUX escribe letras inventadas cuando le nombras «código».
Y una cifra o un nombre propio es justo lo que un flyer no puede tener mal.

### La tubería: LLM + difusión + Pillow

La solución es repartir el trabajo en tres piezas, cada una haciendo lo que sabe hacer:

| Pieza | Quién | Qué hace |
|---|---|---|
| 1. Extraer los datos | el LLM local (`qwen3:1.7b`) y un **regex** | De «flyer para la liquidación de verano el sábado 18 de octubre a las 10 am, todo a S/ 20» saca título, fecha, hora, precio, lugar, contacto y una descripción visual en inglés. El regex manda sobre fecha, hora y precio: el modelo pequeño las altera si se le deja |
| 2. Pintar el fondo | el modelo de difusión | Solo el fondo, en vertical, con la orden explícita de **no dibujar texto, pantallas ni código** |
| 3. Componer el texto | **Pillow** (código Python) | Título con sombra, chips de fecha, hora y lugar, descripción, insignia de precio. Salida 1080x1350 |

Cuando el pedido contiene «flyer», «afiche», «volante», «póster», «banner» o «invitación» (o el
frontend manda `tipo: "flyer"`), el backend usa esta tubería. En nivel rápida tarda unos 9 s; en
máxima unos 45 s (2 s de extracción, 40 s de fondo, 1 s de composición).

### El bloque «Datos del flyer»

Junto a la imagen, la pantalla muestra **los datos que extrajo el LLM** y quién los puso
(`datos_por: regex` u `ollama`). Eso existe por una razón: en la demo, el modelo cambió la hora
y adornó el título con un apodo sin que nada avisara. Ahora puedes **corregir un campo y
regenerar** sin repetir el pedido entero.

### El ejercicio con trampa

Pide el flyer de tu equipo con fecha, hora y precio. Mira el bloque de datos. Ahora **cambia un
dato a propósito** (la hora, por ejemplo) y regenera. Después pásale el flyer a un compañero de
otro equipo **sin decirle nada** y pregúntale si está bien.

Si no detecta el dato alterado, es un hallazgo de **severidad 4**: el sistema produjo un dato
falso y el usuario no lo notó. Es la misma medida que usamos en voz: si whisper entendió otra
cosa y el usuario envió igual, severidad 4. Un flyer bonito con la hora mal es peor que ningún
flyer.

### Comparar los tres niveles

Si en tu equipo hay máquinas de distinto nivel, generen el mismo flyer en cada una y pónganlos
lado a lado. Verás que el fondo cambia mucho (sdxl-turbo y Klein son claramente mejores) y que
el **texto es idéntico**, porque lo pone Pillow. Esa es la demostración de que la tubería
funciona.

Detalle en el ejemplo **«Un flyer con texto real: LLM + difusión + Pillow»**.

---

## 9. Probar y medir

Un asistente que «a ti te funciona» no está probado. Hoy pruebas el de **otro equipo**, cinco
minutos, con un guion fijo, y ellos prueban el tuyo.

### El guion de 3 tareas

| # | Tarea para el usuario | Qué observas |
|---|---|---|
| 1 | «Pregúntale algo que esté en su corpus» (le das el tema, no la frase) | ¿Encontró cómo preguntar? ¿La respuesta fue correcta? ¿Entendió que el asistente habló? |
| 2 | «Pregúntale algo que seguro no sabe» | ¿Dijo «no estoy seguro» o inventó? ¿El usuario entendió qué pasó? |
| 3 | «Pídele un flyer con una fecha, una hora y un precio» (dictado por micrófono) | ¿La transcripción fue correcta y el usuario la revisó? ¿Detectó si un dato salió alterado? |

Reglas de la prueba: el usuario **piensa en voz alta**; tú **no ayudas** ni explicas; anotas lo
que hizo y lo que dijo, literal. Sin evidencia, un hallazgo es una impresión.

### Severidades

| Severidad | Qué significa | Ejemplo |
|---|---|---|
| 1 | Cosmético | El chip de salud tapa parte del nombre |
| 2 | Menor: molesta, se resuelve solo | El usuario no vio el botón del micrófono al principio |
| 3 | Mayor: frena, necesita ayuda o varios intentos | Tres intentos para que reconociera la pregunta del horario |
| 4 | Crítico: impide terminar o produce un dato incorrecto sin que el usuario lo note | El flyer salió con otra hora y el usuario lo dio por bueno |

La hoja de hallazgos tiene una línea por hallazgo: severidad, cuántos usuarios lo sufrieron, qué
pasó (literal) y una corrección propuesta. Para severidad 3 y 4 la corrección es obligatoria.

### Qué medir y cómo

Mide con comandos y escribe el umbral **antes** de medir. Así se decide pasa o no pasa con
números, no con sensaciones.

| Qué | Cómo | Referencia medida | Umbral sugerido |
|---|---|---|---|
| Chat | el backend imprime la duración de cada petición en su log (`POST /api/chat -> 200 en 1730 ms`) | 1,7 s con `qwen3:1.7b` | menos de 5 s |
| Velocidad del modelo | `ollama run qwen3:1.7b --verbose "hola" 2>&1 \| grep "eval rate"` | depende de la CPU | más de 15 tokens/s |
| Voz a texto | `segundos` en la respuesta de `/api/stt` dividido por la duración del audio (RTF) | 0,43 con whisper `small` | RTF menor de 1 |
| Imagen | `segundos` en la respuesta de `/api/imagen`; anota la primera y la segunda por separado | 2,2 s sd-turbo en caliente; 7 s sdxl-turbo | según tu nivel |
| Memoria del backend | macOS: `footprint -p <pid>`; Linux con NVIDIA: `nvidia-smi` | sd-turbo 5 GB, sdxl-turbo 12 GB | que no pase tu RAM |

Tres medidas de cada cosa y te quedas con la del medio. En macOS no uses `ps -o rss` para la
memoria: con modelos en la GPU dio 157 MB donde había 4,97 GB.

---

## 10. Si algo falla

- **Ollama no responde:** el asistente cae al respaldo por embeddings y el chip de salud se pone
  gris. Puedes seguir. Comprueba con `ollama list` y `curl -s http://localhost:11434/api/tags`.
- **El micrófono no funciona:** Chrome solo lo permite en `localhost`, no por IP. Entra por
  `http://localhost:8765`.
- **La imagen tarda más de un minuto:** baja a calidad rápida o deja el modo demo. En CPU, de 25
  a 60 s es normal.
- **Puerto ocupado:** `OSITO_PUERTO=8766 bash osito/arrancar.sh` y
  `python3 obra/obra.py servir --puerto 8797`. Antes, `lsof -i :8765` te dice quién lo ocupa.
- **Descarga de un modelo quieta:** cancela y repite con `HF_HUB_DISABLE_XET=1` delante. No
  juzgues el avance por el tamaño de los archivos `.incomplete`: se reservan antes de llenarse.
- **La imagen sale negra:** el backend reintenta solo en fp32 y luego en CPU. Espera.
- **El agente marca pasos que tú no verificaste:** díselo. «Vuelve a abrir el paso, no está
  verificado». La barra tiene que decir la verdad.
- **El asistente inventa respuestas fuera del corpus:** es Ollama respondiendo por su cuenta.
  Para probar solo el corpus, arranca con `OSITO_OLLAMA_URL=http://localhost:1`.
- **Dos pasos iguales en la obra:** es una versión vieja de `obra.py`. La del zip reabre el paso
  en vez de duplicarlo.
- **La página de la obra no cambia:** el navegador la sondea cada 2 s; si no, revisa que
  `servir` siga corriendo y que la URL tenga el puerto correcto.

Si no está en esta lista, publica la pregunta en el hilo de abajo con el mensaje de error
completo y la salida de `python osito/backend/diagnostico.py`.

---

## Tareas

**Tarea 2 · Amplía el corpus de tu asistente y pruébalo por voz** (fecha límite: ver «Tareas»
del curso, 20 puntos). El enunciado completo y la rúbrica están en la tarea. Resumen:

1. Añade **10 pares nuevos** de pregunta y respuesta de tu dominio a `faq.json`, con tres o
   cuatro formas de cada pregunta y un ánimo válido.
2. Prueba **3 de ellas por voz** (micrófono, no teclado) y guarda una captura de cada respuesta
   en `capturas/`.
3. Escribe `REFLEXION.md` con **5 líneas**: qué aprendiste de cómo el asistente entiende (o no)
   lo que dices.
4. Sube todo a un repositorio `clase-02` y entrégalo desde el LMS (URL + SHA del commit).

**Para la clase 3** (llevar el asistente a WhatsApp), dos cosas que no se pueden hacer en el
aula:

1. Baja la imagen de **Evolution API** con Docker. La red del aula no la aguanta; hazlo en casa.
   El instructor confirma la etiqueta exacta en el hilo de la sesión.

   ```bash
   docker pull evoapicloud/evolution-api:latest
   docker images | grep evolution
   ```

2. Consigue un **número de WhatsApp de pruebas** para el equipo que **no sea el personal de
   nadie**: un chip prepago o un número viejo. Lo vamos a afiliar por QR y va a recibir mensajes
   de prueba de otros equipos.

Evolution API corre en un contenedor **en tu propia laptop** y habla con tu backend por
`host.docker.internal`. No hace falta nada fuera de tu máquina.
