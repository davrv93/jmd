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

Hoy construyes un asistente de ventas que corre entero en tu laptop, sin nube.
Conversa con un modelo local, te escucha por el micrófono y genera un flyer de oferta.
Tu agente escribe el código. Tú le das skills, un plan de trabajo y verificas cada paso.
Al final tendrás el asistente respondiendo preguntas de tu tienda, con voz y con flyer.
Y una hoja de pruebas hecha con otro equipo, con tiempos medidos.

### El ciclo de esta clase

Esta sesión se recorre con el **ciclo de aprendizaje**. Las secciones no van en el orden de las
fases: la clase alterna construir y entender. El título de cada sección lleva su fase al final.

| Fase | En esta clase |
|---|---|
| **1 · Experiencia** | Secciones 0, 2, 4 y 5: preparas la máquina, instalas los skills, levantas la obra y construyes el asistente. |
| **2 · Reflexión** | Secciones 6 y 7: pruebas voz e imagen, y mides con otro equipo. |
| **3 · Conceptos** | Secciones 1 y 3: qué es Edge AI y qué es un plan de trabajo. |
| **4 · Aplicación** | Sección 8 y «Tareas»: preparas la clase 3 y entregas el repositorio `clase-02`. |

### Bloques de la clase (2 horas)

- Antes de clase, en casa · Preparar tu laptop (sección 0).
- 0:00 a 0:10 · Apertura: qué es Edge AI (sección 1).
- 0:10 a 0:25 · Instalar los skills y el modo piedra (sección 2).
- 0:25 a 0:40 · Plan de trabajo y obra (secciones 3 y 4).
- 0:40 a 1:10 · Construir el asistente (sección 5).
- 1:10 a 1:30 · Voz y flyer (sección 6).
- 1:30 a 1:50 · Probar y medir (sección 7).
- 1:50 a 2:00 · Cierre y tareas (sección 8).

## 0. Antes de la clase: preparar tu laptop · Experiencia

En una frase: bajas en casa todo lo pesado, porque la red del aula no lo aguanta.

Son unos 40 minutos y son obligatorios. Lo que descargas pesa varios GB.

**Qué vas a hacer**
1. Descarga `taller-agentico.zip` (lo tienes en Materiales) y descomprímelo en una carpeta sin espacios.
2. Abre esa carpeta en VS Code, abre la terminal y crea el entorno de Python:
   ```bash
   cd taller-agentico
   python3 -m venv .venv && source .venv/bin/activate   # en Windows: .venv\Scripts\activate
   pip install -r osito/backend/requirements.txt
   ```
3. Corre el diagnóstico y anota el nivel de imagen que te toca:
   ```bash
   python osito/backend/diagnostico.py
   ```
4. Instala Ollama (enlace en Materiales) y baja el modelo de chat:
   ```bash
   ollama pull qwen3:1.7b
   ollama list
   ```
5. Baja el modelo de imagen. Copia solo la línea cuyo nombre coincide con tu diagnóstico:
   ```bash
   # sd-turbo (2,4 GB)
   HF_HUB_DISABLE_XET=1 python -c "from huggingface_hub import snapshot_download as s; s('stabilityai/sd-turbo', allow_patterns=['*.json','*.txt','tokenizer/*','scheduler/*','*/*.fp16.safetensors'])"
   # sdxl-turbo (7 GB)
   HF_HUB_DISABLE_XET=1 python -c "from huggingface_hub import snapshot_download as s; s('stabilityai/sdxl-turbo', allow_patterns=['*.json','*.txt','tokenizer*/*','scheduler/*','*/*.fp16.safetensors'])"
   # flux2-klein (4,6 GB), solo Mac con 16 GB; antes corre: pip install mflux
   HF_HUB_DISABLE_XET=1 python -c "from huggingface_hub import snapshot_download as s; s('mflux-community/flux2-klein-4b-mflux-q4')"
   ```
**Qué vas a ver:** `ollama list` muestra `qwen3:1.7b`. El diagnóstico termina con «Nivel maximo de imagen para esta
maquina:» y un nombre.

**Si falla:** Si la descarga se queda quieta, cancela y repítela. El `HF_HUB_DISABLE_XET=1` de delante es obligatorio.
Si no tienes GPU, es normal: cada imagen tardará de 20 a 60 segundos. Sigues igual.

## 1. Apertura: qué es Edge AI · Conceptos

En una frase: Edge AI es correr la inteligencia artificial en tu propia laptop, sin mandar nada a internet.

Analogía: es cocinar en casa en vez de pedir delivery. Más lento, pero nadie ve tu receta.

Tres ventajas para una tienda: funciona sin internet, no cuesta por uso y tus precios no salen de tu máquina.
El precio es otro: los modelos son más pequeños y tu laptop marca el límite.

Hoy corren tres modelos en tu máquina: Ollama para el texto, whisper para la voz y uno de difusión para la imagen.
Ollama no genera imágenes. Un modelo de lenguaje produce texto; las imágenes las hace otro tipo de modelo.

**Qué vas a hacer**
1. Mira la demo del instructor: pregunta por voz, respuesta hablada, flyer generado.
2. Comprueba que tu modelo de chat responde:
   ```bash
   ollama run qwen3:1.7b "Di hola en una frase"
   ```
3. Apaga el wifi diez segundos y repite el comando.

**Qué vas a ver:** Ollama responde igual con el wifi apagado. Eso es Edge AI.

**Si falla:** Si dice que no encuentra el modelo, vuelve a correr `ollama pull qwen3:1.7b`.

## 2. Instalar los skills y el modo piedra · Experiencia

En una frase: instalas 14 skills que le enseñan a tu agente cómo trabajar en este taller.

Analogía: un skill es una ficha de instrucciones que el agente lee solo cuando la necesita.
Los 14 vienen dentro de `taller-agentico.zip` y también sueltos en `skills-taller.zip` (lo tienes en Materiales).
Hoy usas `planificacion-proyecto`, `plan-de-trabajo`, `obra-en-vivo`, `imagenes-locales`, `pruebas-de-uso`,
`pruebas-de-rendimiento` y `piedra`. Los de diseño quedan para la clase 3.

El modo piedra es un skill que hace al agente responder corto: sin saludos ni relleno.
Deja cifras, rutas y comandos exactos. Ahorra los tokens de salida, que son los más caros.
No toca el código ni los commits. Para volver a lo normal escribes `modo normal`.

**Qué vas a hacer**
1. Instala los skills. El comando genera el `AGENTS.md` que OpenCode lee al arrancar:
   ```bash
   cd taller-agentico
   bash instalar.sh .
   ```
2. Abre OpenCode en esa misma carpeta:
   ```bash
   opencode
   ```
3. Activa el modo piedra. Escribe en el chat:
   ```text
   modo piedra
   ```
4. Pide un plan sin skill. Escribe:
   ```text
   Quiero un asistente para mi tienda que responda preguntas sobre productos y horarios. Hazme un plan.
   ```
5. Pide lo mismo con skill:
   ```text
   Usa el skill planificacion-proyecto y hazme el plan para ese mismo asistente.
   ```
**Qué vas a ver:** `instalar.sh` termina con «Skills encontrados : 14». El agente contesta «Modo piedra activo.» y responde corto.
El segundo plan tiene usuario, «hecho significa», riesgos y «no entra». El primero es una lista suelta.

**Si falla:** Si no dice 14, revisa que estás dentro de `taller-agentico`. Repite el comando: no rompe nada.

## 3. El plan de trabajo · Conceptos

En una frase: un plan de trabajo convierte un pedido vago en tareas cortas que se pueden probar.

Analogía: es la lista de pedidos del día. Cada pedido tiene un «entregado: sí o no».
La regla que manda: ninguna tarea sin forma de probarla. «Funciona» no es una prueba. «El `curl` devuelve `fuente: faq`» sí lo es.

Las seis tareas de hoy, de 15 minutos cada una:

- T1 · Cargar las preguntas de tu tienda en `faq.json`. Prueba: el chat responde una con `fuente: "faq"`.
- T2 · Cambiar el nombre y el saludo del asistente. Prueba: la pantalla saluda con el nombre nuevo.
- T3 · Responder tres preguntas de la tienda. Prueba: las tres salen bien o dice «No estoy seguro de eso todavía».
- T4 · Transcribir el micrófono a texto. Prueba: grabas 3 segundos y ves el texto antes de enviarlo.
- T5 · Generar el flyer de una oferta. Prueba: fecha, hora y precio salen exactos en la imagen.
- T6 · Pasar pruebas de uso con otro equipo. Prueba: hoja con 3 tareas y severidad de cada hallazgo.

**Qué vas a hacer**
1. En OpenCode, con el modo piedra activo, escribe:
   ```text
   Usa el skill plan-de-trabajo. Escribe PLAN_TRABAJO.md con seis tareas: cargar faq.json, nombre y saludo, tres preguntas de la tienda, micrófono a texto, flyer de una oferta, pruebas de uso. Cada tarea con un criterio de aceptación que devuelva sí o no.
   ```
2. Abre `PLAN_TRABAJO.md` y lee cada criterio.
3. Si un criterio dice «funciona» o «se ve bien», pide que lo cambie por un comando o una acción concreta.

**Qué vas a ver:** Un archivo con una tabla de seis filas: ID, tarea, criterio y estado. Todas en `pendiente`.

**Si falla:** Si el agente escribe más de seis tareas, pídele que las junte. Si borra una, pídele que la devuelva: nunca se renumeran.

## 4. La obra: ver el avance en pantalla · Experiencia

En una frase: la obra es una página que muestra cuánto del plan está hecho, paso por paso.

Analogía: es el tablero de pedidos de la cocina. Cada pedido pasa de pendiente a listo a la vista de todos.
La maneja `obra/obra.py` (viene en `taller-agentico.zip`). El agente la actualiza con comandos; nunca edita el archivo a mano.

**Qué vas a hacer**
1. Crea la obra con las seis tareas:
   ```bash
   python3 obra/obra.py iniciar "Asistente de la tienda" --pasos \
     "Cargar el corpus" "Nombre y saludo" "Tres preguntas de la tienda" \
     "Micrófono a texto" "Flyer de la oferta" "Pruebas de uso"
   ```
2. Sirve la pantalla en una segunda terminal:
   ```bash
   python3 obra/obra.py servir
   ```
3. Abre `http://localhost:8787/obra.html` en Chrome y déjala visible en media pantalla.
4. Dile al agente cómo marcar el avance. Pégale esto en OpenCode:
   ```text
   Usa el skill obra-en-vivo. Al terminar y verificar cada tarea del plan, corre python3 obra/obra.py paso "<texto del paso>". No marques nada sin ejecutar su criterio.
   ```
**Qué vas a ver:** La barra en 0 % y seis pasos pendientes. Cada paso cerrado muestra la hora real en que se marcó.

**Si falla:** Si el puerto 8787 está ocupado, agrega `--puerto 8797` al comando `servir` y cambia la URL.
Si la barra avanza más rápido de lo que tú comprobaste, frena al agente: «reabre el paso, no está verificado».

## 5. Construir el asistente · Experiencia

En una frase: arrancas el asistente y tu agente ejecuta el plan, una tarea a la vez.

El asistente vive en la carpeta `osito/`: un avatar 3D que conversa, escucha, habla y genera imágenes.
El backend es Python (FastAPI) y sirve también la pantalla. Su memoria de tu tienda es `osito/backend/faq.json`.
Cada entrada de ese archivo tiene varias formas de la pregunta, una respuesta y un ánimo:

```json
{
  "preguntas": ["cuál es el horario", "a qué hora abren", "hasta qué hora atienden"],
  "respuesta": "Atendemos de lunes a sábado de 9 de la mañana a 8 de la noche.",
  "animo": "feliz"
}
```

Los ánimos válidos son `feliz`, `pensando`, `sorprendido`, `triste`, `emocionado` y `neutral`.
Si Ollama no responde, el asistente busca la pregunta más parecida en `faq.json`.
Si no la encuentra, dice «No estoy seguro de eso todavía». No es un error: es negarse a inventar.

**Qué vas a hacer**
1. Arranca el asistente en una tercera terminal:
   ```bash
   bash osito/arrancar.sh
   ```
2. Abre `http://localhost:8765` en Chrome. Entra siempre por `localhost`: el micrófono solo funciona ahí.
3. Pide al agente la tarea T1 con las preguntas de tu tienda:
   ```text
   Tarea T1 del plan. Reemplaza osito/backend/faq.json con 10 preguntas de mi tienda: horario, envíos, pagos, cambios y stock. Cada entrada con tres formas de la pregunta, una respuesta de dos frases y un ánimo válido. Ejecuta el criterio y marca el paso en la obra.
   ```
4. Reinicia el asistente con Ctrl+C y otra vez `bash osito/arrancar.sh`: el corpus se carga una sola vez.
5. Pide T2 y T3, una por una. Para T2:
   ```text
   Tarea T2. Cambia el nombre del asistente a «Tienda Bot» (variable OSITO_NOMBRE y constante NOMBRE_OSITO en osito/frontend/app.js) y el saludo a «Hola, ¿qué producto buscas hoy?». Ejecuta el criterio y marca el paso.
   ```
6. Lee el diff de cada cambio antes de aceptar. Verifica tú el criterio: abre la pantalla y pregunta.

**Qué vas a ver:** La pantalla saluda con el nombre nuevo. Al preguntar el horario, responde con tu texto. La obra marca 3 de 6.

**Si falla:** Si el puerto 8765 está ocupado, arranca con `OSITO_PUERTO=8766 bash osito/arrancar.sh`.
Si el asistente inventa respuestas, es Ollama hablando solo. Para probar solo tu corpus: `OSITO_OLLAMA_URL=http://localhost:1 bash osito/arrancar.sh`.

## 6. Voz y flyer · Reflexión

En una frase: dictas una pregunta por micrófono y pides un flyer de oferta con datos exactos.

Un modelo de difusión aprende a pintar, no a escribir. Si le pides «Oferta 20 %», dibuja garabatos que parecen letras.
Por eso el flyer se hace en tres pasos: el modelo de texto saca fecha, hora y precio; el de difusión pinta solo el fondo; Python escribe el texto encima.
Analogía: uno toma el pedido, otro pinta el cartel y un tercero pega las letras.

**Qué vas a hacer**
1. Pulsa el botón del micrófono, di «¿hacen envíos a domicilio?» y espera.
2. Lee el texto que aparece en el campo antes de enviarlo. Corrígelo si entendió otra cosa. Envía. Esa es la T4.
3. Pide el flyer escribiendo en el chat del asistente:
   ```text
   Flyer para la liquidación de verano, sábado 18 de octubre a las 10 am, todo a S/ 20
   ```
4. Mira el bloque «Datos del flyer» junto a la imagen. Comprueba fecha, hora y precio. Esa es la T5.
5. Cambia un dato a propósito (la hora) y regenera. Pásale ese flyer a alguien de otro equipo sin decirle nada.

**Qué vas a ver:** El texto dictado aparece antes de enviarse. El flyer trae título, fecha, hora y precio legibles, iguales al pedido.
El bloque de datos dice quién los puso: `regex` u `ollama`.
Si tu compañero no nota la hora cambiada, anótalo: es un hallazgo de severidad 4.

**Si falla:** Si el micrófono no responde, entra por `http://localhost:8765`, no por la IP.
Si la imagen tarda más de un minuto, es normal sin GPU. Si sale negra, espera: el sistema reintenta solo.

## 7. Probar y medir · Reflexión

En una frase: otra persona usa tu asistente cinco minutos y tú anotas, sin ayudar.

Un asistente que «a ti te funciona» no está probado. Hoy pruebas el de otro equipo y ellos el tuyo.
La severidad de un hallazgo va de 1 a 4. Uno es cosmético; dos molesta; tres frena al usuario.
Cuatro es crítico: un dato incorrecto y el usuario no lo notó.

**Qué vas a hacer**
1. Dale a tu probador tres tareas sin explicarle nada: preguntar algo del corpus, preguntar algo que no sabe, pedir un flyer por voz con fecha, hora y precio.
2. Pídele que piense en voz alta. Anota lo que hace y lo que dice, literal.
3. Escribe una línea por hallazgo: severidad, qué pasó y corrección propuesta.
4. Mide el chat en la terminal del asistente: cada petición imprime `POST /api/chat -> 200 en 1730 ms`.
5. Mide la velocidad del modelo:
   ```bash
   ollama run qwen3:1.7b --verbose "hola" 2>&1 | grep "eval rate"
   ```
6. Anota los `segundos` que devuelve el flyer: la primera imagen y la segunda por separado.

**Qué vas a ver:** Chat bajo 5 segundos; modelo sobre 15 tokens por segundo; la segunda imagen mucho más rápida que la primera.
Mide tres veces y quédate con la del medio. Marca T6 en la obra: barra al 100 %.

**Si falla:** Si el chat pasa de 15 segundos, cierra lo que no uses: dos modelos a la vez saturan la CPU.

## 8. Cierre: preparar la clase 3 en casa · Aplicación

En una frase: la próxima clase el asistente atiende por WhatsApp, y dos cosas se hacen en casa.

**Qué vas a hacer**
1. Baja la imagen de Evolution API con Docker. La red del aula no la aguanta:
   ```bash
   docker pull evoapicloud/evolution-api:latest
   docker images | grep evolution
   ```
2. Consigue un número de WhatsApp de pruebas para el equipo. Nunca el personal de nadie: un chip prepago sirve.
3. Deja `taller-agentico` con la obra al 100 % y `faq.json` con tus preguntas.

**Qué vas a ver:** `docker images` muestra `evoapicloud/evolution-api`. El instructor confirma la etiqueta exacta en el hilo.

**Si falla:** Si Docker no baja la imagen, publica el error completo en el hilo de la sesión.

## Palabras de hoy · Conceptos

- **Edge AI**: la inteligencia artificial corre en tu laptop, no en un servidor de internet.
- **Modelo**: el programa entrenado que produce texto, transcribe voz o pinta una imagen.
- **Skill**: una carpeta con instrucciones que el agente lee cuando tu pedido encaja con su descripción.
- **Plan de trabajo**: lista de tareas cortas, cada una con una prueba que dice sí o no.
- **Obra**: la pantalla de `obra.py` que muestra qué tareas del plan van hechas y a qué hora.
- **Corpus**: las preguntas y respuestas de tu tienda, guardadas en `faq.json`.
- **Whisper**: el modelo que convierte lo que dices al micrófono en texto.
- **Modelo de difusión**: el modelo que pinta imágenes a partir de una descripción. No sabe escribir.
- **Flyer**: la imagen de oferta con fondo pintado y texto exacto puesto encima por Python.
- **Nivel de imagen**: qué modelo de difusión aguanta tu laptop; lo dice `diagnostico.py`.

## Tareas · Aplicación

- Tarea 2: añade 10 preguntas nuevas a `faq.json`, prueba 3 por voz y guarda las capturas en `capturas/`.
- Escribe `REFLEXION.md` con 5 líneas y sube todo al repositorio `clase-02`.
- Entrégalo desde la tarea 2 del LMS (URL + commit) antes del 22-10-2026 a las 23:59.
