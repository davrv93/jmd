---
id: qa-01
title: "Taller · Pruebas E2E con IA, Page Object Model y monitoreo"
published: true
starts_at: 2026-11-01T09:00:00-05:00
objectives:
  - id: qa-01-o1
    title: Convertir casos de uso en casos de prueba con semilla, pasos y resultado esperado, y ubicarlos en la pirámide de pruebas
  - id: qa-01-o2
    title: Escribir pruebas E2E con Playwright siguiendo el patrón Page Object Model, con ayuda de la IA, y encontrar un bug real con ellas
  - id: qa-01-o3
    title: Correr las mismas pruebas en navegadores sin interfaz (Chromium, Lightpanda y Obscura) y medir tiempo y memoria
  - id: qa-01-o4
    title: Publicar un portal de resultados con reproducción paso a paso y monitorear la disponibilidad con alertas en Grafana
recording:
  url: ""
  passcode: ""
materials:
  - id: qa-01-m0
    title: qa-taller-kit.zip · Tienda Sol, pruebas con POM, motores, portal y monitoreo
    kind: zip
    file: materials/qa-taller-kit.zip
    objective_ids: [qa-01-o1, qa-01-o2, qa-01-o3, qa-01-o4]
  - id: qa-01-m1
    title: Playwright · documentación oficial
    kind: doc
    url: https://playwright.dev/docs/intro
    objective_ids: [qa-01-o2]
  - id: qa-01-m2
    title: Page Object Model en Playwright
    kind: doc
    url: https://playwright.dev/docs/pom
    objective_ids: [qa-01-o2]
  - id: qa-01-m3
    title: Lightpanda · navegador sin interfaz escrito en Zig
    kind: repo
    url: https://github.com/lightpanda-io/browser
    objective_ids: [qa-01-o3]
  - id: qa-01-m5
    title: Obscura · navegador sin interfaz en Rust con protocolo CDP
    kind: repo
    url: https://github.com/h4ckf0r0day/obscura
    objective_ids: [qa-01-o3]
  - id: qa-01-m6
    title: Trace Viewer · reproducir una prueba paso a paso
    kind: doc
    url: https://playwright.dev/docs/trace-viewer
    objective_ids: [qa-01-o4]
  - id: qa-01-m4
    title: Grafana · documentación
    kind: doc
    url: https://grafana.com/docs/grafana/latest/
    objective_ids: [qa-01-o4]
  - id: qa-01-m7
    title: Playwright MCP · la IA maneja el navegador
    kind: repo
    url: https://github.com/microsoft/playwright-mcp
    objective_ids: [qa-01-o2]
cycle:
  - id: ver
    title: Ver el taller
    tool: zoom
    phase: experiencia
    description: Asiste en vivo o mira la grabación. Abre el modo LIVE para tocar las ocho escenas.
    check: Has visto el taller completo (o la grabación)
  - id: casos
    title: De caso de uso a caso de prueba
    tool: lms
    phase: conceptualizacion
    description: En la escena 2 convierte al menos 6 casos de uso en casos de prueba y ubícalos en la pirámide.
    check: Acuerdo con el criterio del instructor de 80 % o más
  - id: pom
    title: Page Object Model
    tool: lms
    phase: conceptualizacion
    description: En la escena 3 cambia el diseño y cuenta cuántas líneas hay que tocar con y sin POM; ordena los localizadores del peor al mejor.
    check: Explicas con tus palabras por qué POM cambia 1 archivo y no 8
  - id: pruebas
    title: Tus primeras pruebas E2E
    tool: terminal
    phase: experimentacion
    description: Con el kit, levanta Tienda Sol, siembra datos y corre las pruebas de login y venta con POM. Encuentra el bug del pago insuficiente.
    check: Login en verde y el caso del pago insuficiente en rojo con su mensaje
  - id: motores
    title: Navegadores sin interfaz
    tool: terminal
    phase: experimentacion
    description: Corre la misma suite en Chromium, Lightpanda y Obscura y anota tiempo y memoria de cada uno.
    check: Tienes tu tabla de tres motores con cifras medidas
  - id: portal
    title: Portal y reproducción paso a paso
    tool: terminal
    phase: reflexion
    description: Genera el portal con la matriz de pruebas y abre la traza del caso en rojo para ver en qué paso falló.
    check: Tu portal muestra la matriz y abriste una traza
  - id: monitoreo
    title: Monitoreo y alertas
    tool: terminal
    phase: experimentacion
    description: Levanta Prometheus y Grafana (o el vigía sin Docker), tumba Tienda Sol y mira cómo cae la disponibilidad y dispara la alerta.
    check: Tu dashboard muestra la caída y la alerta se disparó
  - id: preguntar
    title: Preguntar o responder
    tool: lms
    phase: reflexion
    description: Publica una pregunta sobre el taller en el hilo de la sesión o responde la de un compañero.
    check: Tu pregunta aparece en el hilo de la sesión
  - id: entregar
    title: Entregar el proyecto
    tool: git
    phase: experimentacion
    description: Sube tu carpeta de pruebas a tu repo con EVIDENCIA.md y entrégalo desde el LMS (URL + commit).
    check: La entrega aparece en «Mis notas» con estado en cola
---

## Avance del taller

Hoy pruebas una aplicación de verdad: **Tienda Sol**, un pequeño punto de venta con login,
catálogo, venta y reporte del día. Viene en el kit con **dos bugs escondidos** que solo una prueba de
extremo a extremo encuentra. Al final tendrás pruebas E2E con Page Object Model, corriendo en tres
navegadores sin interfaz, un portal con la matriz de pruebas y un dashboard que avisa cuando la
tienda se cae.

Todo el taller sigue el modo LIVE: ocho escenas para tocar. Si algo falla, pega el error completo en
el hilo de la sesión y sigue con el siguiente bloque. El kit trae todo lo necesario.

| Hora | Bloque | Comprobación |
|---|---|---|
| 9:00 | 1 · QA con IA, casos de uso y POM | Acuerdo ≥ 80 % en la escena 2 |
| 9:45 | 2 · Primeras pruebas E2E | Login en verde, pago insuficiente en rojo |
| 10:30 | 3 · Navegadores sin interfaz | Tabla de tres motores con cifras |
| 11:15 | 4 · Portal y reproducción paso a paso | Portal generado y una traza abierta |
| 12:00 | 5 · Monitoreo, disponibilidad y alertas | La alerta se dispara al tumbar la tienda |
| 12:45 | 6 · Cierre, certificado e insignia | Entrega en «Mis notas» |

## Antes de empezar · Preparación

1. Instala **Node.js 20 o más nuevo** (nodejs.org, versión LTS) y comprueba: `node -v`.
2. Descarga `qa-taller-kit.zip` desde Materiales y descomprímelo.
3. Opcional, para los bloques 3 y 5: **Docker Desktop**. Sin Docker también puedes hacer el taller:
   el kit trae una alternativa sin Docker para cada parte.

## 1. Por qué una prueba E2E encontró lo que nadie vio · Experiencia

Una historia real, sin nombres. En un punto de venta de una botica, la cajera escribió «efectivo
recibido S/ 0,80» para una venta de S/ 1,60. Pulsó confirmar y **la venta se registró**. El
frontend calculaba el vuelto con lo tecleado, pero al backend le mandaba un pago **igual al total**.
El backend sí tenía un control de pagos incompletos, pero nunca se activaba, porque el pago que le
llegaba ya cuadraba. Las pruebas unitarias del frontend y del backend pasaban en verde. La encontró
una prueba de extremo a extremo que hizo lo mismo que la cajera.

Tienda Sol tiene ese mismo bug a propósito, y uno más. Hoy los encuentras tú.

## 2. Casos de uso, casos de prueba y la pirámide · Conceptos

Un **caso de uso** cuenta lo que quiere hacer alguien («la cajera registra una venta»). Un **caso de
prueba** lo vuelve comprobable con cuatro partes:

| Parte | Ejemplo |
|---|---|
| ID | `E2E-VEN-002` |
| Precondición (semilla) | Producto «Paracetamol 500 mg» con stock 10 y precio S/ 1,60 |
| Pasos | Entrar como cajero, agregar 1 unidad, escribir efectivo S/ 0,80, confirmar |
| Resultado esperado | La venta **no** se registra y aparece «Efectivo insuficiente» |

La **pirámide** dice cuántas pruebas poner en cada nivel. Abajo van muchas **unitarias**, rápidas y
baratas. En medio, las de **integración** y de API. Arriba, pocas **E2E**, lentas pero las únicas
que ven lo que ve el usuario. Encima de todo está el **monitoreo**, que prueba producción cada
minuto.

En el kit, `docs/casos-de-uso.md` trae los casos de Tienda Sol y `docs/matriz.csv` los une con sus
pruebas. En la escena 2 convierte al menos 6 casos y ubícalos en la pirámide.

## 3. Page Object Model · Conceptos

Sin POM, cada prueba repite los localizadores: si el botón «Ingresar» pasa a llamarse «Entrar», hay
que tocar ocho archivos. Con POM, cada pantalla es una clase (`LoginPage`, `VentaPage`…) que guarda
sus localizadores y sus acciones. Las pruebas solo dicen **qué** hacer, y el cambio se hace en un
solo lugar.

```ts
// pages/LoginPage.ts
export class LoginPage {
  constructor(private page: Page) {}
  async entrar(usuario: string, clave: string) {
    await this.page.goto('/login');
    await this.page.getByLabel('Usuario').fill(usuario);
    await this.page.getByLabel('Clave').fill(clave);
    await this.page.getByRole('button', { name: 'Ingresar' }).click();
  }
}
```

Localizadores, del mejor al peor: `getByRole` con nombre, después `getByLabel`, después
`getByTestId`, después una clase CSS y, al final, un `#id-23` generado. Un buen localizador se lee
como lo vería una persona y sobrevive a un rediseño. En la escena 3 provoca el rediseño y ordena los
localizadores.

## 4. Tus primeras pruebas E2E · Experimentación

El `README.md` del kit trae cada paso para Windows, Mac y Linux. Lo esencial:

1. Instala Playwright y su Chromium (hazlo antes de la clase, son unos 150 MB):
   ```bash
   cd pruebas
   npm install
   npx playwright install chromium
   ```
2. Levanta la tienda en otra terminal (`cd app` y `npm start`), abre <http://localhost:3000> y
   entra con **cajero / cajero123**. Vende algo y mira el reporte.
3. Tu primera prueba en verde, desde `pruebas/`:
   ```bash
   npx playwright test specs/login.spec.ts --project=chromium
   npx playwright show-report
   ```
   Playwright levanta su propia tienda en el puerto 3100 y la siembra antes de cada prueba.
4. Toda la suite con `npm test`. Salen **3 en rojo**: E2E-VEN-001, E2E-VEN-002 (el pago
   insuficiente) y E2E-VEN-003 (la promo aplicada dos veces). Las pruebas de API salen en verde:
   los dos bugs viven en la pantalla, no en el servidor.
5. La tienda corregida: `npm run test:corregido`, todo en verde.

Fíjate en tres cosas:

- **Semilla antes de cada prueba.** Cada prueba empieza con los mismos datos y no depende de otra.
- **Nada de esperas fijas.** No hay `waitForTimeout(3000)`: Playwright espera solo a que el elemento
  esté listo. Las esperas fijas son la primera causa de pruebas intermitentes (escena 4).
- **El caso del pago insuficiente sale en rojo.** No lo «arregles» tocando la prueba: la prueba
  tiene razón y el bug es de la tienda. Después córrelo con la tienda corregida (`BUGS=0`) y mira el
  verde.

**Con IA.** Pídele a tu asistente (Claude Code, DeepSeek, el que uses) que escriba el page object a
partir del HTML de la pantalla, o que convierta una fila de `matriz.csv` en un spec. En `ia/` tienes
los prompts listos y un `AGENTS.md` con las reglas del proyecto. La regla que manda: **la IA
propone, el runner decide.** No aceptes una prueba que nunca viste fallar.

**Si falla:** `browserType.launch: Executable doesn't exist` → corre `npx playwright install chromium` dentro de `pruebas/`.

## 5. Navegadores sin interfaz · Experimentación

Chromium sin interfaz es el de siempre: lo dibuja todo y sirve para pruebas visuales, pero pesa
cientos de MB por instancia. Hay dos motores nuevos hechos para automatizar:

| Motor | Qué es | Bueno para | Ojo con |
|---|---|---|---|
| **Chromium headless** | El Chrome real sin ventana | Pruebas visuales, capturas, todo | Memoria y arranque |
| **Lightpanda** | Navegador escrito desde cero en Zig, sin motor de dibujo | Recorrer muchas páginas, agentes, scraping | No hace capturas ni pruebas de diseño |
| **Obscura** | Navegador en Rust con V8 y protocolo CDP | Agentes y scraping, modo `--stealth` | Su servidor CDP no tiene contraseña: nunca lo expongas a internet |

Lightpanda y Obscura hablan **CDP**, el protocolo de Chrome. Playwright no los lanza, se conecta a
ellos:

```ts
const browser = await chromium.connectOverCDP('ws://127.0.0.1:9222');
```

Las cifras de memoria y velocidad que publica cada proyecto son **suyas**. En la escena 5 escribimos
las que medimos hoy en clase. Levanta los motores con Docker (`cd motores` y `docker compose up -d`:
Lightpanda queda en el puerto 9222 y Obscura en el 9223), corre `npm run test:lightpanda` y
`npm run test:obscura` desde `pruebas/` y anota el tiempo total y la memoria (`docker stats
--no-stream`).

Lo medido al preparar el kit, en una Mac con chip M (en tu laptop saldrá distinto):

| Motor | Tienda corregida | Tiempo | Memoria pico |
|---|---|---|---|
| Chromium | 15 de 15 | 4,5 s | ≈ 335 MiB |
| Lightpanda 1.0.2 | 14 de 14 (sin la visual) | 2,2 s | 14 a 24 MiB |
| Obscura 0.2.6 | 13 de 14 | 9,7 s | 26 a 28 MiB |

El rojo de Obscura con la tienda corregida es un **falso rojo**: no dispara el evento `change` al
salir del campo. Un motor nuevo no se comporta igual que Chrome. Por eso las pruebas que deciden un
despliegue se corren en el navegador real. Las pruebas marcadas `@visual` se saltan en Lightpanda, porque
no dibuja.

**Si falla:** `connect ECONNREFUSED 127.0.0.1:9222` → el motor no está corriendo; levántalo primero (README del kit, sección motores).

## 6. Portal de resultados y reproducción paso a paso · Reflexión

Un reporte que nadie mira no sirve. El kit genera un **portal** con la matriz de pruebas por módulo
(verde, rojo o sin correr), su duración y un enlace a la traza de cada caso.

La **traza** de Playwright (`trace.zip`) es una grabación de la prueba: cada acción con una foto del
DOM antes y después, la red y la consola. Corre `npm test` y luego `npm run portal`. Para la traza:

```bash
npx playwright show-trace test-results/<carpeta-del-caso>/trace.zip
```

y busca el paso exacto donde falló el caso del pago insuficiente. En la escena 6 tienes un portal y
un reproductor de ejemplo. Pregúntate: ¿qué caso debería bloquear un despliegue y cuál solo avisar?

## 7. Monitoreo, disponibilidad y alertas · Experimentación

Las pruebas E2E revisan antes de desplegar. El monitoreo revisa **después**, cada 15 segundos, en
producción. La pieza mínima es un endpoint de salud (`/salud`) y alguien que lo llame:

- **blackbox_exporter** llama a `/salud` y dice si respondió y cuánto tardó.
- **Prometheus** guarda esas mediciones.
- **Grafana** las dibuja (estado, latencia, disponibilidad) y **dispara la alerta** («caído más de
  1 minuto») hacia un webhook, correo, Telegram o WhatsApp.

Con Docker: `cd monitoreo` y `docker compose up -d`, luego abre Grafana en <http://localhost:3001> (el README de
`monitoreo/` trae el puerto y el usuario). Para recibir el aviso, corre `node receptor.mjs`, que
hace de webhook. Sin Docker: `node vigia.mjs`. Luego **tumba la tienda** (modo caída del README) y
mira cómo cae la disponibilidad. Al preparar el kit, la alerta llegó al webhook unos 90 segundos
después de la caída y el aviso de «resuelta», un minuto después de recuperarla.

| Disponibilidad | Caída permitida en un mes de 30 días |
|---|---|
| 99 % | 7 h 12 min |
| 99,9 % | 43 min 12 s |
| 99,99 % | 4 min 19 s |

En la escena 7 cambia el «durante X minutos» de la regla: muy corto da falsas alarmas y muy largo
avisa tarde.

**Si falla:** Grafana dice «No data» → espera 30 s; si sigue, revisa que la tienda corra en el puerto 3000 de tu máquina.

## 8. Otras herramientas que vale la pena conocer · Conceptos

Puppeteer, Selenium (WebDriver BiDi), Cypress, WebdriverIO y Vitest en modo navegador. Para datos de
prueba, Faker. Para bases reales en las pruebas, Testcontainers. Para carga, k6. Para reportes,
Allure. Para agentes que navegan solos, Playwright MCP, Stagehand y browser-use. Para monitoreo
simple, Uptime Kuma. El kit trae `docs/herramientas.md` con cuándo usar cada una.

## Palabras de hoy · Conceptos

Caso de uso · Caso de prueba · Semilla · Pirámide de pruebas · E2E · Page Object Model ·
Localizador · Prueba intermitente (flaky) · Headless · CDP · Traza · Matriz de pruebas ·
Disponibilidad · SLA · Endpoint de salud · Alerta.

## Tareas · Aplicación

- Pruebas E2E de login y de venta con POM, en verde con la tienda corregida (`BUGS=0`).
- Un bug encontrado: el caso en rojo con su mensaje claro, contra la tienda con bugs.
- Tu tabla de tres motores (tiempo y memoria medidos en tu máquina).
- El portal generado y una alerta configurada que se disparó.
- Entrega tu carpeta `pruebas/` en tu repo, con `EVIDENCIA.md` (captura del portal, tu tabla de
  motores y la captura de la alerta), desde la tarea del LMS (URL + commit).
