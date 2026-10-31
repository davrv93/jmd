---
id: dh-02
title: "Sesión 2 · Mide y reduce el consumo"
published: true
starts_at: 2026-11-24T19:30:00-05:00
objectives:
  - id: dh-02-o1
    title: Registrar una tarea de referencia con tiempo, llamadas, contexto por paso y tokens cuando el proveedor los informe
  - id: dh-02-o2
    title: Separar lo que cobra la API (tokens) de lo que gasta tu máquina (CPU, RAM, tiempo) y medir cada cosa con su herramienta
  - id: dh-02-o3
    title: Acotar archivos, búsquedas y salidas de terminal, reutilizar resúmenes revisados y dividir tareas por responsabilidad
  - id: dh-02-o4
    title: Comparar la misma tarea antes y después con criterios de calidad equivalentes y dejar una rutina reproducible
recording:
  url: ""
  passcode: ""
repo:
  url: https://github.com/pallets/flask
  ref: main
materials:
  - id: dh-02-m1
    title: DeepSeek Harness · documentación oficial
    kind: link
    url: https://deepseek-harness.github.io/deepseek-harness/
    objective_ids: [dh-02-o1, dh-02-o3]
  - id: dh-02-m2
    title: DeepSeek Harness · repositorio (README, instalación, SAFETY.md)
    kind: repo
    url: https://github.com/deepseek-ai/deepseek-harness
    objective_ids: [dh-02-o1]
  - id: dh-02-m3
    title: Guía de la Web UI y los espacios de trabajo de dsh
    kind: doc
    url: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/guide/index.md
    objective_ids: [dh-02-o1, dh-02-o3]
  - id: dh-02-m4
    title: DeepSeek API · qué es un token y cómo se informa el uso
    kind: doc
    url: https://api-docs.deepseek.com/quick_start/token_usage
    objective_ids: [dh-02-o1, dh-02-o2]
  - id: dh-02-m5
    title: DeepSeek API · precios por millón de tokens, caché de contexto y horario
    kind: doc
    url: https://api-docs.deepseek.com/quick_start/pricing
    objective_ids: [dh-02-o2, dh-02-o3]
  - id: dh-02-m6
    title: Plataforma de DeepSeek · claves y uso de la cuenta
    kind: link
    url: https://platform.deepseek.com/
    objective_ids: [dh-02-o1, dh-02-o4]
  - id: dh-02-m7
    title: htop · monitor interactivo de CPU y RAM
    kind: link
    url: https://htop.dev/
    objective_ids: [dh-02-o2]
  - id: dh-02-m8
    title: GNU time · tiempo, CPU y memoria de un proceso
    kind: doc
    url: https://www.gnu.org/software/time/
    objective_ids: [dh-02-o2]
  - id: dh-02-m9
    title: Tokenizers · capítulo del curso de LLM de Hugging Face
    kind: doc
    url: https://huggingface.co/learn/llm-course/en/chapter2/4
    objective_ids: [dh-02-o2, dh-02-o3]
  - id: dh-02-m10
    title: Repo de práctica · flaskr, el tutorial de Flask (pequeño y con pruebas)
    kind: repo
    url: https://github.com/pallets/flask/tree/main/examples/tutorial
    objective_ids: [dh-02-o1, dh-02-o4]
cycle:
  - id: ver
    title: Ver la clase
    tool: zoom
    phase: experiencia
    description: Asiste en vivo o mira la grabación. Abre el modo LIVE de esta sesión para tocar las seis escenas.
    check: Has visto la clase completa (o la grabación)
  - id: referencia
    title: Registrar la tarea de referencia
    tool: terminal
    phase: experiencia
    description: Primero en el simulador de la escena 2; luego de verdad con `time dsh --profile headless "…"` sobre tu repo y el uso de tu clave antes y después.
    check: Tu ficha tiene tiempo, llamadas, contexto máximo, tokens (si el proveedor los informa) y un criterio de calidad
  - id: separar
    title: Separar API de máquina local
    tool: lms
    phase: reflexion
    description: "En la escena 3 clasifica los 12 casos: lo que cobra la API, lo que gasta tu máquina o las dos cosas."
    check: Acuerdo con el criterio del instructor de 80 % o más
  - id: acotar
    title: Acotar el contexto
    tool: lms
    phase: conceptualizacion
    description: En la escena 4 mueve archivos, líneas de salida, alcance de la búsqueda y resumen reutilizado hasta bajar el contexto sin dejar fuera lo que la tarea necesita.
    check: Llegaste a la mitad del contexto de referencia con los archivos necesarios dentro
  - id: comparar
    title: Comparar antes y después
    tool: terminal
    phase: conceptualizacion
    description: Repite la tarea de referencia con tu rutina y vuelca las dos corridas en el comparador de la escena 5 con los mismos criterios de calidad.
    check: El comparador marca el ahorro como válido (misma calidad o mejor)
  - id: preguntar
    title: Preguntar o responder
    tool: lms
    phase: reflexion
    description: Publica en el hilo de la sesión qué paso de tu tarea gastó más y por qué, o responde la pregunta de un compañero.
    check: Tu mensaje aparece en el hilo de la sesión
  - id: entregar
    title: Entregar el informe y la rutina
    tool: git
    phase: experimentacion
    description: Sube INFORME.md (antes/después), RUTINA.md y las dos salidas (antes.md, despues.md) a tu repo y entrégalo desde el LMS (URL + commit).
    check: La entrega aparece en «Mis notas» con estado en cola
---

## Avance de la clase

En la sesión 1 el agente recorrió tu repositorio y dejó un mapa con dudas verificables. Hoy le ponemos
precio a cada tarea. Un agente gasta en tres monedas distintas: **tokens** que cobra la API, **CPU y
RAM** de tu máquina cuando corre herramientas, y **tiempo** tuyo esperando. Vas a elegir una tarea de
referencia, medirla, quitarle lo que sobra y volverla a medir **con la misma vara de calidad**. El
ahorro se mide; en este curso nadie promete un porcentaje.

Casi todo pasa en el modo LIVE: seis escenas con simuladores. Los números de los simuladores son
relaciones didácticas, no cifras de DeepSeek; las cifras reales salen de tu terminal y de tu cuenta.

| Bloque | Qué haces | Comprobación |
|---|---|---|
| 1 · Tres monedas | Correr una tarea simulada y ver los tres medidores | Dices qué moneda aparece en la factura |
| 2 · Referencia | Registrar una corrida y llenar la ficha | Ficha con tiempo, llamadas, contexto y tokens |
| 3 · API o máquina | Clasificar 12 casos | Acuerdo ≥ 80 % con el criterio |
| 4 · Acotar | Mover los deslizadores de contexto | Mitad del contexto con los archivos necesarios |
| 5 · Antes/después | Comparar dos corridas con la misma lista de calidad | El comparador marca «ahorro válido» |
| 6 · Tarea | Pregunta en el hilo y entrega | La entrega aparece en «Mis notas» |

## 1. Tres monedas, no una · Experiencia

Cuando pides «agrega validación al registro de usuarios», el agente encadena pasos: lee instrucciones,
abre archivos, busca con `grep`, corre las pruebas, redacta. Cada paso gasta distinto. Leer ocho
archivos completos es **entrada** que la API cobra por token. Correr `grep` sobre `node_modules` no
cuesta un token, pero sí 14 segundos y todos los núcleos. Pasarle al modelo 500 líneas de salida de
terminal vuelve a ser entrada. Redactar es **salida**, la más cara por token.

En la escena 1 corre la misma tarea «amplia» y «acotada» y mira los tres medidores. La diferencia
entre ambas no es un porcentaje que valga para tu repo: es la forma de la curva, y el punto de la clase
es que **la factura solo ve una de las tres monedas**.

**Si falla:** no te abre el modo LIVE → recarga la sesión; las escenas se cargan al entrar.

## 2. La tarea de referencia · Experiencia

Sin una tarea fija no hay comparación posible. Elige una que puedas repetir igual: misma instrucción,
mismo repositorio en el mismo commit, mismo criterio para decir «quedó bien». Si no tienes repo, usa
`flaskr` (Materiales): quince archivos y pruebas incluidas.

Primero en el simulador de la escena 2: inicia la corrida, mira el cronómetro y el registro de cada
llamada con su contexto, y copia los totales a la ficha. Luego de verdad:

1. Anota el uso de tu clave en la plataforma de DeepSeek **antes** de correr (la Web UI de `dsh`
   la configura en Settings → Models; el uso lo informa el proveedor, no el harness).
2. Corre la tarea sin interacción y guarda la respuesta:
   ```bash
   time dsh --profile headless "Agrega validación de correo a register() y corre las pruebas" > antes.md
   ```
3. Vuelve a mirar el uso: la diferencia es tu tarea. Cuenta los pasos que el agente mostró y anota
   el paso con más contexto.
4. En Linux, `/usr/bin/time -v` delante del comando te da CPU y memoria máxima del proceso local
   (`-l` en macOS). Eso es tu máquina; los tokens son otra cuenta.

La ficha tiene cinco campos: tarea, comando, tiempo, llamadas y tokens (entrada y salida, si el
proveedor los informa), más el criterio de calidad. Sin criterio no hay ficha.

**Si falla:** `dsh: command not found` → instálalo con `npx @deepseek-ai/dsh web` una vez (Node.js) o corre desde el clon con `pnpm dsh`; es un developer preview y cambia rápido, revisa el README.

## 3. API o tu máquina · Reflexión

Confundir las dos cuentas lleva a optimizar lo que no duele. Si tu factura sube, cerrar pestañas no
sirve; si tu laptop se arrastra, recortar el prompt tampoco. Reglas rápidas:

| Pasa esto | Quién lo paga | Cómo lo mides |
|---|---|---|
| Un archivo entra al contexto | API (entrada) | Uso de la clave antes/después; tokenizador para estimar |
| El agente corre pruebas, compila o busca | Tu máquina (CPU, RAM, disco) | `top`/`htop`, `/usr/bin/time -v`, Monitor de actividad |
| La salida de ese comando se pasa al modelo | API (entrada otra vez) | Líneas de salida × tokens por línea |
| El modelo razona y redacta | API (salida, la más cara) | Columna de salida en el uso |
| Se reenvía la conversación en cada turno | API (entrada; la caché la abarata, no la anula) | Precios con caché hit / miss |
| Esperas | Tu tiempo | `time` |

La plataforma publica el precio por millón de tokens con dos columnas de entrada: **con caché** y
**sin caché**. Consultado el 30-10-2026, la entrada con caché costaba una fracción pequeña de la
entrada sin caché; los valores cambian, mira la página antes de calcular. La lección es estable:
**lo que no cambia entre turnos se paga barato; lo que cambia, caro.**

En la escena 3 clasifica los 12 casos. Dos están ahí porque engañan.

**Si falla:** tu acuerdo queda por debajo de 80 % → relee el «por qué» de cada caso; la pregunta es siempre «¿esto entra al modelo o corre afuera?».

## 4. Acota el contexto · Conceptos

Cuatro palancas, en orden de efecto:

1. **Archivos.** Incluye los que la tarea toca, no «la carpeta». Si el agente necesita entender un
   módulo grande, pídele primero un resumen, **revísalo**, guárdalo en el repo (por ejemplo
   `docs/resumen-auth.md`) y en la siguiente tarea dale el resumen, no los seis archivos.
2. **Salidas de terminal.** `npm test 2>&1 | tail -40`, `grep -rn … src/ | head -30`. Lo que no
   se imprime no entra al contexto.
3. **Alcance de la búsqueda.** `grep -r` en `src/` y no en la raíz; excluye `node_modules`,
   `vendor`, `dist`. Esto ahorra CPU **y** tokens a la vez.
4. **Una responsabilidad por tarea.** «Agrega la validación» y «actualiza la documentación» son dos
   tareas con dos contextos chicos, no una con uno grande. El historial de una conversación se
   reenvía en cada turno: una conversación larga paga su pasado una y otra vez.

Y una regla que no es palanca sino freno: **verifica cada cambio con la comprobación que
corresponde** (pruebas del módulo, linter, `php -l`, un `curl`), no con «vuelve a revisar todo».
Repetir la misma llamada para «estar seguro» es el gasto más tonto y el más común.

En la escena 4 mueve los deslizadores. La tarea necesita tres archivos: si bajas de ahí, el contexto
cae pero la respuesta sale incompleta y el simulador lo marca. El objetivo es la mitad del contexto de
referencia **con esos tres dentro**.

**Si falla:** el contexto no baja aunque recortes archivos → mira las líneas de salida y los turnos; el historial suele pesar más que los archivos.

## 5. Antes y después, con la misma vara · Conceptos

Un «ahorro» con peor resultado no es ahorro: es una tarea distinta. Por eso el comparador de la
escena 5 exige la **misma lista de criterios** para ambas corridas: las pruebas pasan, la respuesta
cita archivos reales, solo cambió lo pedido, ningún comando inventado, largo dentro de lo acordado.
Si un criterio que cumplía «antes» falla «después», el ahorro se marca inválido aunque los tokens
hayan bajado a la mitad.

Carga tus dos corridas (tiempo, llamadas, tokens de entrada y salida), marca los criterios y copia
el informe que genera. Ese texto es el esqueleto de tu `INFORME.md`. Los porcentajes que aparecen son
**los tuyos, medidos**: no los generalices a otra tarea ni a otro repo.

**Si falla:** la segunda corrida gasta más → es un dato, no un fracaso; anótalo y busca qué palanca movió el contexto hacia arriba (casi siempre, salidas sin recortar).

## Palabras de hoy · Conceptos

Tarea de referencia · Token de entrada y de salida · Caché de contexto (hit / miss) · Contexto por paso ·
Llamada · Historial reenviado · Perfil headless · Salida recortada (`head`, `tail`) · Alcance de búsqueda ·
Resumen revisado · Una responsabilidad por tarea · Criterios de calidad equivalentes · Rutina reproducible.

## Tareas · Aplicación

- Repite tu tarea de referencia aplicando las cuatro palancas y la regla de verificación. Guarda
  `antes.md` y `despues.md` (las dos respuestas) y los tiempos de `time`.
- Escribe `INFORME.md` con la tabla antes/después (tiempo, llamadas, contexto máximo, tokens de
  entrada y salida si los tienes, CPU/RAM máx. del proceso local) y la lista de criterios marcada
  para ambas. Si un criterio bajó, dilo.
- Escribe `RUTINA.md`: los pasos exactos para repetir la tarea con el consumo bajo (qué archivos se
  incluyen, qué resumen se reutiliza, qué comandos con qué recorte, qué comprobación cierra cada
  cambio). Alguien de tu equipo debe poder seguirla sin ti.
- Publica en el hilo de la sesión qué paso gastó más en tu tarea y por qué.
- Entrega el repo desde el LMS (URL + commit).
