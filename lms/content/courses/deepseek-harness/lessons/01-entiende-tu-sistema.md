---
id: dh-01
title: "Sesión 1 · Entiende tu sistema con DeepSeek Harness"
published: true
starts_at: 2026-11-17T19:30:00-05:00
objectives:
  - id: dh-01-o1
    title: Diferenciar modelo, harness, herramientas y contexto, y decir qué deja de funcionar cuando falta cada pieza
  - id: dh-01-o2
    title: Configurar DeepSeek Harness (dsh), el proveedor y el espacio de trabajo, y pedirle el primer resumen de un repositorio
  - id: dh-01-o3
    title: Recorrer un repositorio por etapas y escribir un mapa inicial que separe lo observado en archivos de lo que falta verificar
  - id: dh-01-o4
    title: Preparar instrucciones del proyecto (AGENTS.md) para que el agente no relea todo en cada tarea
recording:
  url: ""
  passcode: ""
repo:
  url: https://github.com/davrv93/jmd
  ref: main
materials:
  - id: dh-01-m1
    title: DeepSeek Harness · repositorio oficial (código, README, licencia MIT)
    kind: repo
    url: https://github.com/deepseek-ai/deepseek-harness
    objective_ids: [dh-01-o1, dh-01-o2]
  - id: dh-01-m2
    title: DeepSeek Harness · documentación (guía de uso, proveedores, plugins)
    kind: doc
    url: https://deepseek-harness.github.io/deepseek-harness/
    objective_ids: [dh-01-o2]
  - id: dh-01-m3
    title: Guía de uso y espacios de trabajo (docs/user/guide)
    kind: doc
    url: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/guide/index.md
    objective_ids: [dh-01-o2]
  - id: dh-01-m4
    title: Node.js · descarga (versión LTS; dsh se arranca con npx)
    kind: link
    url: https://nodejs.org/
    objective_ids: [dh-01-o2]
  - id: dh-01-m5
    title: AGENTS.md · el formato abierto de instrucciones para agentes
    kind: doc
    url: https://agents.md/
    objective_ids: [dh-01-o4]
  - id: dh-01-m6
    title: Mermaid · diagramas en texto (para el mapa del sistema)
    kind: doc
    url: https://mermaid.js.org/
    objective_ids: [dh-01-o3]
  - id: dh-01-m7
    title: Repo de práctica · RealWorld en Node + Express (si no tienes uno propio)
    kind: repo
    url: https://github.com/gothinkster/node-express-realworld-example-app
    objective_ids: [dh-01-o3, dh-01-o4]
cycle:
  - id: ver
    title: Ver la clase
    tool: zoom
    phase: experiencia
    description: Asiste en vivo (martes 17 de noviembre, 7:30 pm) o mira la grabación. Abre el modo LIVE para tocar las seis escenas.
    check: Has visto la clase completa (o la grabación)
  - id: piezas
    title: Separar las cuatro piezas
    tool: lms
    phase: conceptualizacion
    description: En las escenas 1 y 2 apaga cada pieza y recorre el bucle completo del agente. Mira cómo crece el contexto con cada herramienta.
    check: Nombras las cuatro piezas y dices qué se rompe si falta cada una
  - id: configurar
    title: Configurar DeepSeek Harness
    tool: terminal
    phase: experiencia
    description: "Primero ordena los pasos en la escena 3; luego de verdad en tu laptop: npx @deepseek-ai/dsh web, clave en Settings → Models y Choose workspace."
    check: dsh responde a «Summarize this repository and identify its main packages» en tu repo
  - id: recorrer
    title: Recorrer el repo por etapas
    tool: lms
    phase: conceptualizacion
    description: En la escena 4 elige los puntos de entrada de «tienda-sol», revela componentes y dependencias y marca cada afirmación como observada o por verificar.
    check: Acuerdo con el criterio del instructor de 80 % o más
  - id: plan
    title: Pedir un plan y partirlo en dos
    tool: terminal
    phase: reflexion
    description: Pide a dsh un plan para entender tu repo. Separa cada frase en «observado en archivo» (con ruta) y «por verificar» (con cómo verificarlo).
    check: Tu MAPA.md tiene referencias a archivos y tu DUDAS.md tiene cómo verificar cada duda
  - id: instrucciones
    title: Escribir las instrucciones del proyecto
    tool: terminal
    phase: reflexion
    description: "Arma tu AGENTS.md con las casillas de la escena 5 y luego escríbelo en tu repo: cómo arrancar, mapa de carpetas, qué no tocar, cómo verificar."
    check: AGENTS.md existe en la raíz de tu repo y cabe en una pantalla
  - id: preguntar
    title: Preguntar o responder
    tool: lms
    phase: reflexion
    description: Publica una pregunta sobre la clase en el hilo de la sesión o responde la de un compañero.
    check: Tu pregunta aparece en el hilo de la sesión
  - id: entregar
    title: Entregar el mapa inicial
    tool: git
    phase: experimentacion
    description: Sube MAPA.md, DUDAS.md y AGENTS.md a tu repo y entrégalo desde el LMS (URL + commit).
    check: La entrega aparece en «Mis notas» con estado en cola
---

## Avance de la clase

Hoy no le pides a un agente que programe: le pides que **entienda un sistema que ya existe** y que
te lo cuente sin inventar. Para eso separas cuatro cosas que se mezclan bajo la palabra «IA»: el
**modelo**, el **harness**, las **herramientas** y el **contexto**. Luego instalas DeepSeek Harness
(`dsh`), lo apuntas a un repositorio y lo recorres por etapas. Terminas con un mapa inicial del
sistema y una lista de dudas verificables.

DeepSeek Harness está en **developer preview**: los comandos y las pantallas pueden cambiar. Todo
lo que está en esta página se leyó en su repositorio y su documentación el 30-10-2026; si algo no
coincide con lo que ves, manda la documentación oficial y avísanos en el hilo.

| Bloque | Qué haces | Comprobación |
|---|---|---|
| 1 · Cuatro piezas | Apagar modelo, harness, herramientas o contexto y ver qué se rompe | Nombras las cuatro sin mirar |
| 2 · El bucle | Recorrer prompt → modelo → herramienta → resultado → contexto | Explicas por qué el contexto solo crece |
| 3 · Configurar dsh | Ordenar los pasos; luego `npx @deepseek-ai/dsh web` en tu laptop | dsh responde en tu repo |
| 4 · Recorrer el repo | Elegir entradas, revelar componentes, marcar afirmaciones | Acuerdo ≥ 80 % con el criterio |
| 5 · AGENTS.md | Armar las instrucciones del proyecto con casillas | Tu AGENTS.md cabe en una pantalla |
| 6 · Tarea | Pregunta en el hilo y entrega MAPA.md + DUDAS.md + AGENTS.md | La entrega aparece en «Mis notas» |

## 1. Cuatro piezas, no una · Conceptos

Un agente de programación es un **harness** (arnés) que envuelve a un **modelo** de lenguaje: le
da **herramientas** (leer y editar archivos, correr comandos, delegar, llevar un plan) y administra
el **contexto**, que es todo lo que el modelo tiene delante en cada llamada: tu pedido, las
instrucciones, los archivos leídos y los resultados de los comandos.

| Pieza | Qué hace | Qué pasa si falta |
|---|---|---|
| **Modelo** | Razona y redacta a partir del contexto. Se elige en Settings → Models | Nadie razona: la pantalla espera |
| **Harness** (dsh) | Orquesta el bucle, ejecuta herramientas, pide aprobación según la política de permisos, mantiene el plan | Tienes un chat: tú copias y pegas archivos a mano |
| **Herramientas** | Leen, buscan, editan, corren comandos, delegan | El modelo opina sobre tu repo sin haberlo leído |
| **Contexto** | Acumula lo leído y lo decidido dentro de la sesión | Cada mensaje empieza de cero y el agente relee todo |

El contexto **solo crece** mientras dura la sesión: cada archivo abierto y cada salida de terminal
se suman. Es lo que cuesta dinero y tiempo, y es lo que medirás en la sesión 2. Hoy basta con verlo
crecer en la escena 2.

**Si falla:** no te abre el modo LIVE → recarga la sesión; las escenas se cargan al entrar.

## 2. Configura DeepSeek Harness · Experiencia

Primero ordena los pasos en la escena 3. Luego hazlo de verdad, con la terminal abierta **dentro de la
carpeta de tu repositorio** (importa: ese es el espacio de trabajo que dsh te va a ofrecer).

1. Comprueba que tienes Node.js: `node --version`. Si no, instálalo desde Materiales (LTS).
2. Arranca la interfaz web:
   ```bash
   npx @deepseek-ai/dsh web
   ```
   Se abre el navegador en `http://127.0.0.1:3080`. Si no quieres que lo abra solo, agrega `--no-open`.
3. En **Settings → Models** elige el proveedor DeepSeek y pega tu clave de API. Otros proveedores
   compatibles con OpenAI se configuran según `providers.md` de la documentación.
4. Con **Choose workspace** selecciona la carpeta donde arrancaste dsh.
5. Primer mensaje, el mismo de la documentación oficial:
   `Summarize this repository and identify its main packages`.

`dsh` es el ejecutable. Además de la web tiene perfiles: `dsh --profile headless "tarea"` corre una
sesión y escribe la respuesta en la terminal (sirve para scripts); `--profile acp` y `--profile sdk`
lo integran con editores y con tu código. Desde el código fuente: clonar, `pnpm install`,
`pnpm run build`, `pnpm dsh web`. Es una arquitectura de plugins (Cordis; tema `dsh-plugin`). Licencia MIT.

**Si falla:** `npx` no encuentra el paquete → actualiza Node.js a la LTS y vuelve a intentar; el modelo no responde → revisa que la clave esté pegada en Settings → Models (sin espacios) y que tu cuenta tenga saldo.

## 3. Recorre el repositorio por etapas · Conceptos

Pedir «explícame este repo» de una vez da un resumen bonito y poco confiable. Recórrelo en cuatro
etapas, y en cada una pide **rutas de archivos**, no opiniones:

1. **Puntos de entrada.** ¿Por dónde arranca? `package.json` (scripts), `Dockerfile`, `bin/`,
   `main`, `cmd/`. Prompt: «Lista los puntos de entrada y cita el archivo y la línea de cada uno».
2. **Componentes.** Qué carpetas son módulos de verdad y qué hace cada una. Prompt: «Para cada
   carpeta de primer nivel di qué contiene, con dos archivos de ejemplo».
3. **Dependencias.** Externas (del manifiesto) e internas (quién importa a quién). Prompt: «Dibuja
   en Mermaid quién importa a quién entre los componentes; solo flechas que hayas visto en un import».
4. **Flujos.** Sigue un caso de uso de punta a punta: «Sigue una venta desde la ruta HTTP hasta la
   base de datos y cita cada archivo que toca».

La regla que manda en todo el curso: **cada afirmación del agente es de uno de dos tipos**.
*Observado en archivo* (hay ruta y línea; cualquiera puede abrirla y verla) o *por verificar* (el
archivo sugiere algo, pero confirmarlo exige correr, probar o preguntar). «El IGV es 18 %» con
`servicios/igv.js:3` es observado. «Los tests cubren el IGV» es por verificar: que exista
`test/igv.test.js` no dice que pase ni qué cubre. Que exista `servicios/sunat.js` no significa que
alguien lo llame.

En la escena 4 lo practicas sobre `tienda-sol`, un repo de ejemplo: eliges las entradas, se revelan
componentes y dependencias y marcas diez afirmaciones. Se necesita 80 % de acuerdo con el criterio.

**Si falla:** el agente responde sin rutas → repite el pedido agregando «cita archivo y línea de cada afirmación; si no lo viste en un archivo, dilo».

## 4. Pide un plan y pártelo en dos · Reflexión

Ahora en tu repo real. Pide: «Propón un plan para entender este sistema en una hora. Para cada paso
di qué archivos leerías y qué esperas encontrar». Lee el plan con lápiz:

- Lo que viene con ruta y la ruta existe → va a **MAPA.md**, con la referencia (`src/server.js:12`).
- Lo que no viene con ruta, o la ruta no existe, o es una conclusión («es escalable», «está en
  producción») → va a **DUDAS.md**, y cada duda lleva **cómo verificarla**: qué comando correr, qué
  archivo abrir o a quién preguntar.

Un buen MAPA.md cabe en una pantalla: entradas, componentes, dependencias y un flujo principal (en
Mermaid si quieres), todo con rutas. Un buen DUDAS.md tiene de cinco a quince líneas «Duda · cómo se
verifica». Nada de «revisar más adelante».

**Si falla:** el plan cita archivos que no existen → el modelo alucinó rutas; pídele «lista solo archivos que hayas abierto en esta sesión» y compara con `ls`.

## 5. Instrucciones del proyecto · Reflexión

Fíjate en cuánto leyó el agente antes de empezar: README, manifiesto, árbol de carpetas, dos o tres
archivos para ubicarse. Eso se repite en **cada** tarea nueva, y es la primera fuente de consumo
que vas a atacar. La salida es un archivo de instrucciones del proyecto: **AGENTS.md** es el formato
abierto que usan varios agentes. Comprueba en la documentación de dsh qué archivo de instrucciones
lee; si no lo encuentras, empieza cada sesión con «Lee AGENTS.md antes de empezar».

Qué va dentro (escena 5): cómo arrancar y cómo correr las pruebas, el mapa de carpetas en seis
líneas, dónde vive la verdad de los datos sensibles (impuestos, pagos, comprobantes), qué no tocar,
las convenciones del equipo y cómo verificar un cambio. Qué **no** va: el README pegado entero, la
historia del proyecto ni el árbol de 240 archivos. Eso no ahorra contexto, lo infla.

**Si falla:** tu AGENTS.md pasa de una pantalla → corta todo lo que el agente puede descubrir solo con un `ls`; deja solo lo que no se ve en los archivos.

## Palabras de hoy · Conceptos

Modelo · Harness · Herramienta · Contexto · Espacio de trabajo · Perfil (web, headless, acp, sdk) ·
Política de permisos · Punto de entrada · Componente · Dependencia interna y externa · Flujo ·
Observado en archivo · Por verificar · AGENTS.md · Mermaid.

## Tareas · Aplicación

- Instala dsh de verdad y corre el primer prompt sobre tu repo (o sobre el repo de práctica de
  Materiales). Guarda la respuesta en `resumen.txt`; con el perfil headless sale directo a la terminal.
- Publica en el hilo de la sesión una pregunta o una respuesta: ¿qué afirmación del agente sobre
  **tu** sistema te sonó verdadera y resultó ser «por verificar»?
- Entrega el repositorio con `MAPA.md` (entradas, componentes, dependencias, un flujo, con rutas),
  `DUDAS.md` (cada duda con cómo verificarla) y `AGENTS.md` (una pantalla). Entrégalo desde la tarea
  del LMS (URL + commit). En la sesión 2 medirás cuánto gasta una tarea con y sin ese AGENTS.md.
