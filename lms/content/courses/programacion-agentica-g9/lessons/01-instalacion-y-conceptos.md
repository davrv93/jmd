---
id: g9-01
starts_at: 2026-12-05T19:00:00-05:00
title: "Grupo 9 · Clase 1 · Tu landing con IA"
published: true
objectives:
  - id: g9-01-o1
    title: Instalar y comprobar VS Code, Docker y OpenCode en tu máquina
  - id: g9-01-o2
    title: Explicar qué hace un agente de programación y trabajar con él en git, revisando cada cambio antes de aceptarlo
  - id: g9-01-o3
    title: Construir con el agente la landing de tu negocio (oferta, prueba, llamado a la acción por WhatsApp) y verla bien en el celular
recording:
  url: ""
  passcode: ""
repo:
  url: https://github.com/davrv93/jmd
  ref: main
materials:
  - id: g9-01-instalador
    title: "Instalador de todo el curso (Windows, macOS, Linux)"
    kind: repo
    url: https://github.com/davrv93/jmd/tree/main/instalador
    objective_ids: [g9-01-o1]
  - id: g9-01-skills
    title: skills.zip · skill del instructor para landings (landing-editorial)
    kind: zip
    file: materials/skills.zip
    objective_ids: [g9-01-o3]
  - id: g9-01-video
    title: "Video: agente, MCP y skills en 40 segundos"
    kind: video
    file: materials/video-g9-01.mp4
    objective_ids: [g9-01-o2]
  - id: g9-01-m1
    title: OpenCode · documentación e instalación
    kind: doc
    url: https://opencode.ai/docs/
    objective_ids: [g9-01-o1, g9-01-o2]
  - id: g9-01-m2
    title: OpenCode · configurar un proveedor propio (OpenAI-compatible)
    kind: doc
    url: https://opencode.ai/docs/providers/
    objective_ids: [g9-01-o1]
  - id: g9-01-m3
    title: Descargar Visual Studio Code
    kind: link
    url: https://code.visualstudio.com/download
    objective_ids: [g9-01-o1]
  - id: g9-01-m4
    title: Descargar Docker Desktop
    kind: link
    url: https://www.docker.com/products/docker-desktop/
    objective_ids: [g9-01-o1]
  - id: g9-01-m5
    title: Docker Engine en Linux (sin Desktop)
    kind: doc
    url: https://docs.docker.com/engine/install/
    objective_ids: [g9-01-o1]
  - id: g9-01-m6
    title: "PageSpeed Insights · mide tu landing en celular"
    kind: link
    url: https://pagespeed.web.dev/
    objective_ids: [g9-01-o3]
cycle:
  - id: ver
    title: Ver la clase
    tool: zoom
    phase: experiencia
    description: Asiste en vivo o mira la grabación. Ten a mano la terminal de VS Code para ir haciendo lo mismo.
    check: Has visto la clase completa (o la grabación)
  - id: instalar
    title: "Instalar las herramientas y probar el agente"
    tool: opencode
    phase: experiencia
    description: "Instala VS Code, Docker y OpenCode, conecta OpenCode al gateway de la clase y pídele un script pequeño. Revisa qué archivos crea y qué comandos ejecuta antes de aceptar."
    check: "code --version, docker run --rm hello-world y el script del agente corre"
  - id: anatomia
    title: "Qué hace que una landing funcione"
    tool: lms
    phase: conceptualizacion
    description: "Lee la sección 5: una promesa clara arriba, prueba (fotos, precios, opiniones), una sola acción principal y que cargue rápido en el celular."
    check: "Escribiste la promesa, las tres pruebas y la acción de tu negocio"
  - id: construir
    title: "Tu landing con el agente"
    tool: opencode
    phase: experimentacion
    description: "Pega el prompt de la sección 6 con los datos de tu negocio, revisa el diff y ábrela en el navegador en modo celular."
    check: "Tu landing abre en el celular y el botón de WhatsApp lleva a tu número con un mensaje listo"
  - id: revisar
    title: "Revisar y mejorar"
    tool: lms
    phase: reflexion
    description: "Mide la landing con PageSpeed (o Lighthouse) en modo celular y pídele al agente que corrija lo que salga en rojo. Publica en Preguntas qué cambiaste y por qué."
    check: "Rendimiento y accesibilidad en verde o con una explicación de lo que falta"
  - id: entregar
    title: Entregar la tarea 1
    tool: git
    phase: experimentacion
    description: Sube tu landing a un repositorio y entrégala desde el LMS (URL + commit).
    check: La entrega aparece en «Mis notas» con estado en cola
---
## Avance de la clase

Hoy dejas lista tu máquina y construyes, con un agente de IA al lado, **la landing de tu negocio**:
la página a la que llegará tu cliente. En la clase 2 le pondrás un **chatbot web** y en la clase 3
ese mismo chatbot atenderá por **WhatsApp** con Evolution Go.

Clase en vivo: sábado 05-12-2026, de 7:00 a 9:00 p. m. (hora de Lima). Si algo falla, no te quedes
atrás: pega el error completo en el hilo de la sesión y sigue con el siguiente paso.

| Bloque | Fase | Qué haces | Comprobación |
|---|---|---|---|
| 1 · VS Code | Experiencia | Instalar y abrir la terminal | `code --version` |
| 2 · Docker | Experiencia | Instalar y correr un contenedor | `docker run --rm hello-world` |
| 3 · OpenCode | Experiencia | Instalar y conectar al gateway | `/models` muestra `clase/auto` |
| 4 · Práctica | Reflexión | Pedir un script y revisarlo antes de aceptar | `python3 fecha.py` imprime la fecha |
| 5 · Anatomía | Conceptualización | Promesa, prueba, acción y velocidad | Tu guion de landing escrito |
| 6 · Tu landing | Experimentación | El agente la construye con tus datos | Abre bien en el celular |
| 7 · Revisar | Reflexión | Medir y corregir | PageSpeed en verde o explicado |

## 1. VS Code · Experiencia

El editor del curso: terminal integrada, paleta de comandos y panel de Git, donde ves cada cambio del agente antes de aceptarlo.

1. Instala desde el enlace de Materiales. Windows: *User Installer* 64 bits, marca «Agregar al PATH» e instala la extensión **WSL**. Mac: arrastra la app a *Aplicaciones* y ejecuta en la paleta (`Cmd+Shift+P`) *Shell Command: Install 'code' command in PATH*.
2. Abre la terminal integrada: `Ctrl+ñ` (teclado español) o `` Ctrl+` ``.
3. Comprueba:
   ```bash
   code --version
   ```

**Si falla:** «comando no encontrado» → cierra la terminal y ábrela de nuevo; en Mac repite el paso 1.

## 2. Docker · Experiencia

Docker corre programas empaquetados con todo lo que necesitan, igual en cualquier máquina. En el curso levanta el gateway y, más adelante, el aula de tu chatbot.

1. Windows: en PowerShell como administrador, `wsl --install`, reinicia e instala **Docker Desktop** con «Use WSL 2 based engine»; en *Settings → Resources → WSL integration* activa tu Ubuntu. Mac: **Docker Desktop** de tu procesador. Linux: **Docker Engine** y `sudo usermod -aG docker $USER`, luego cierra y abre sesión.
2. Comprueba:
   ```bash
   docker run --rm hello-world
   ```

**Si falla:** «Cannot connect to the Docker daemon» → abre Docker Desktop y espera a que arranque.

## 3. OpenCode y el gateway de la clase · Experiencia

OpenCode es el agente: lee y escribe archivos, ejecuta comandos y habla con el modelo. No trae modelo propio: lo apuntas al gateway de la clase, que elige el modelo y lleva las cuotas. El instructor te da la URL y tu clave en el hilo de la sesión.

1. Instala (necesitas Node.js 18 o superior):
   ```bash
   npm i -g opencode-ai
   opencode --version
   ```
2. Guarda la clave en una variable, nunca en un archivo:
   ```bash
   export GATEWAY_API_KEY="la-clave-que-te-dio-el-instructor"
   ```
3. Crea `opencode.json` en tu carpeta de trabajo (cambia `baseURL` por la URL de clase):
   ```json
   {
     "$schema": "https://opencode.ai/config.json",
     "provider": {
       "clase": {
         "npm": "@ai-sdk/openai-compatible",
         "name": "Gateway de la clase",
         "options": { "baseURL": "https://URL-DEL-GATEWAY/v1", "apiKey": "{env:GATEWAY_API_KEY}" },
         "models": { "auto": { "name": "auto (lo elige el gateway)" } }
       }
     },
     "model": "clase/auto"
   }
   ```
4. Arranca `opencode` en esa carpeta, escribe `/models` y busca `clase/auto`. Pregúntale «¿qué archivos hay en esta carpeta?» y sal con `/exit`.

**Si falla:** `401` → la clave está mal copiada o la variable no existe en esa terminal. `ECONNREFUSED` → la URL está mal: cópiala del hilo.

## 4. Practica: el agente propone, tú decides · Reflexión

Trabaja siempre en git: si el agente rompe algo, vuelves atrás con un comando. Lee el diff antes de aceptar.

1. Carpeta nueva con git y el agente dentro:
   ```bash
   mkdir practica-01 && cd practica-01 && git init
   opencode
   ```
2. Pídele: «Crea un script que imprima la fecha y la hora en español.»
3. Antes de aceptar, mira qué archivos crea y qué comandos quiere ejecutar. Luego córrelo tú:
   ```bash
   python3 fecha.py
   ```

**Si falla:** el script da error → pégale el error completo al agente; arreglarlo es parte del ejercicio.

## 5. Qué hace que una landing funcione · Conceptualización

Una landing tiene **un solo trabajo**: que la persona dé el siguiente paso (escribirte por WhatsApp,
reservar, comprar). Todo lo demás estorba. Antes de pedirle nada al agente, escribe en un archivo
`GUION.md`:

1. **La promesa** (una frase, arriba de todo): qué resuelves y para quién. «Pollos a la brasa en
   Surco, listos en 30 minutos».
2. **Tres pruebas**: fotos reales, precios, horarios, opiniones de clientes, años en el rubro.
3. **Una acción principal**: el botón de WhatsApp con un mensaje ya escrito. Si hay otra acción,
   que sea secundaria.
4. **Lo que el celular necesita**: texto legible sin hacer zoom, botones grandes, imágenes livianas.

**Si te trabas:** mira tres landings de tu rubro y anota qué ves primero en cada una.

## 6. Tu landing con el agente · Experimentación

Trabaja en una carpeta nueva con git (`mkdir mi-landing && cd mi-landing && git init`), abre
`opencode` y pega este prompt, cambiando lo que está entre corchetes:

```prompt
# Landing de mi negocio
Construye una landing de una sola página para [NOMBRE DEL NEGOCIO], [QUÉ VENDE] en [CIUDAD].
Promesa (arriba, grande): [TU PROMESA].
Pruebas: [PRUEBA 1], [PRUEBA 2], [PRUEBA 3].
Acción principal: un botón «Escríbenos por WhatsApp» que abra https://wa.me/[TU NÚMERO CON 51]?text=[MENSAJE] (codificado para URL).
Requisitos: HTML, CSS y JavaScript sin frameworks, en index.html y estilos.css; primero para celular; textos en español neutro; contraste AA; imágenes con alt; nada de librerías externas.
Antes de escribir código, muéstrame la estructura de secciones y espera mi aprobación. Al terminar, dime cómo abrirla y qué revisaste.
```

Si descargaste `skills.zip`, copia la carpeta `landing-editorial` a `.opencode/skills/` y agrega
al final del prompt: «Usa la skill landing-editorial».

Ábrela en el navegador y activa el modo celular (F12 → ícono de teléfono). Prueba el botón de
WhatsApp: debe abrir el chat con tu número y el mensaje escrito.

**Si falla:** el agente escribió algo que no pediste → `git diff`, y si no te convence,
`git checkout .` y pídelo de nuevo con más detalle.

## 7. Revisar y mejorar · Reflexión

1. Mide la landing en https://pagespeed.web.dev/ (si aún no está publicada, usa **Lighthouse** en
   las herramientas del navegador, modo celular).
2. Copia al agente lo que salga en rojo y pídele que lo corrija **sin cambiar el contenido**.
3. Publica en **Preguntas** qué cambiaste y por qué, o responde la de un compañero.

## Palabras de hoy · Conceptos

**Agente**: programa que lee y escribe archivos y ejecuta comandos por ti, con un modelo de lenguaje
detrás. **Diff**: la lista de cambios antes de aceptarlos. **Landing**: página con un solo objetivo.
**Llamado a la acción**: el botón que da el siguiente paso.

## Tareas · Aplicación

**Tarea 1 · Tu landing publicada**: sube tu landing a un repositorio y entrégala desde el LMS con la
URL y el commit. Detalle y rúbrica en la pestaña Tareas.
