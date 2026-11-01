---
id: qa-01
title: "Taller · Pruebas E2E con IA, Page Object Model y monitoreo"
published: true
starts_at: 2026-11-01T09:00:00-05:00
objectives:
  - id: qa-01-o1
    title: "Convertir casos de uso en casos de prueba con semilla, pasos y resultado esperado, y ubicarlos en la pirámide de pruebas"
  - id: qa-01-o2
    title: "Escribir pruebas E2E con Playwright siguiendo el patrón Page Object Model, con ayuda de la IA, y encontrar un bug real con ellas"
  - id: qa-01-o3
    title: "Correr las mismas pruebas en navegadores sin interfaz (Chromium, Lightpanda y Obscura) y medir tiempo y memoria"
  - id: qa-01-o4
    title: "Publicar un portal de resultados con reproducción paso a paso y monitorear la disponibilidad con alertas en Grafana"
recording:
  url: ""
  passcode: ""
materials:
  - id: qa-01-m0
    title: "qa-taller-kit.zip · Tienda Sol, pruebas con POM, motores, portal y monitoreo"
    kind: zip
    file: materials/qa-taller-kit.zip
    objective_ids: [qa-01-o1, qa-01-o2, qa-01-o3, qa-01-o4]
  - id: qa-01-m1
    title: "Playwright · documentación oficial"
    kind: doc
    url: https://playwright.dev/docs/intro
    objective_ids: [qa-01-o2]
  - id: qa-01-m2
    title: "Page Object Model en Playwright"
    kind: doc
    url: https://playwright.dev/docs/pom
    objective_ids: [qa-01-o2]
  - id: qa-01-m3
    title: "Lightpanda · navegador sin interfaz escrito en Zig"
    kind: repo
    url: https://github.com/lightpanda-io/browser
    objective_ids: [qa-01-o3]
  - id: qa-01-m5
    title: "Obscura · navegador sin interfaz en Rust con protocolo CDP"
    kind: repo
    url: https://github.com/h4ckf0r0day/obscura
    objective_ids: [qa-01-o3]
  - id: qa-01-m6
    title: "Trace Viewer · reproducir una prueba paso a paso"
    kind: doc
    url: https://playwright.dev/docs/trace-viewer
    objective_ids: [qa-01-o4]
  - id: qa-01-m4
    title: "Grafana · documentación"
    kind: doc
    url: https://grafana.com/docs/grafana/latest/
    objective_ids: [qa-01-o4]
  - id: qa-01-m7
    title: "Playwright MCP · la IA maneja el navegador"
    kind: repo
    url: https://github.com/microsoft/playwright-mcp
    objective_ids: [qa-01-o2]
cycle:
  - id: ver
    title: "Ver el taller"
    tool: zoom
    phase: experiencia
    description: "Asiste en vivo o mira la grabación. Recorre las 17 escenas LIVE en orden, empezando por «Abre tu Tienda Sol en la nube»."
    check: "Has visto el taller completo (o la grabación)"
  - id: casos
    title: "De caso de uso a caso de prueba"
    tool: lms
    phase: conceptualizacion
    description: "En la escena 05 completa un caso con semilla, pasos y resultado esperado. Amplía a seis casos en docs/matriz.csv."
    check: "Tu caso define semilla, pasos y un rechazo comprobable"
  - id: pom
    title: "Page Object Model"
    tool: lms
    phase: conceptualizacion
    description: "En las escenas 03 y 04 compara el cambio de un localizador con y sin POM, graba acciones y revisa getByRole."
    check: "Explicas con tus palabras por qué POM cambia 1 archivo y no 8"
  - id: pruebas
    title: "Tus primeras pruebas E2E"
    tool: terminal
    phase: experimentacion
    description: "En las escenas 04 y 05 graba una intención y corre la suite del kit: tres rojos con bugs; todo verde con BUGS=0."
    check: "Suite con bugs: 20 pasan y 3 fallan; corregida: 23 pasan, con referencia visual creada"
  - id: motores
    title: "Navegadores sin interfaz"
    tool: terminal
    phase: experimentacion
    description: "En las escenas 06 y 07 compara la misma suite en Chromium, Lightpanda y Obscura. Anota resultado, tiempo y memoria sin confundir un fallo del motor con uno de negocio."
    check: "Tienes tu tabla de tres motores con cifras medidas"
  - id: portal
    title: "Portal y reproducción paso a paso"
    tool: terminal
    phase: reflexion
    description: "En las escenas 08 a 10 filtra el reporte, abre el DOM antes y después del cobro, revisa el POST y genera el portal."
    check: "Tu portal muestra la matriz y abriste una traza"
  - id: monitoreo
    title: "Monitoreo y alertas"
    tool: terminal
    phase: experimentacion
    description: "En las escenas 11 y 12 observa estado, latencia y disponibilidad; provoca la caída de tu propia tienda y verifica la alerta y su resolución."
    check: "Tu dashboard muestra la caída y la alerta se disparó"
  - id: preguntar
    title: "Preguntar o responder"
    tool: lms
    phase: reflexion
    description: "En la escena 17 prepara una pregunta con ID, esperado y recibido; publícala en el hilo de la sesión o responde a un compañero."
    check: "Tu pregunta aparece en el hilo de la sesión"
  - id: entregar
    title: "Entregar el proyecto"
    tool: git
    phase: experimentacion
    description: "Genera informe-de-pruebas.docx con npm run informe (escena 16); en la escena 17 revisa EVIDENCIA.md, sube tu carpeta de pruebas con el informe y entrega URL + commit desde la tarea del LMS."
    check: "La entrega aparece en «Mis notas» con estado en cola"
---

## Taller · domingo 1 de noviembre de 2026

**9:00–13:00 · hora de Lima.** Practicas con Tienda Sol: login, catálogo, venta y reporte.
La pantalla incluye dos bugs intencionales: manda el total como efectivo y vuelve a descontar la promo al cambiar la cantidad.
Cada bloque recorre **experiencia → reflexión → conceptualización → experimentación**. La barra LIVE muestra tu bloque y la secuencia completa, sin saltos.

| Bloque | Hora | Escenas | Lo logré |
|---|---|---|---|
| 1 · Tu tienda en la nube, casos y POM | 9:00 | 01–05 | Caso con semilla, pasos y resultado |
| 2 · Semillas y primeras pruebas | 9:45 | 06–07 | Tres rojos; luego todo verde |
| 3 · Navegadores sin interfaz | 10:30 | 08–09 | Comparé resultado y causa |
| 4 · Evidencia: traza, portal y el error exacto del usuario | 11:15 | 10–12 | Seguí el POST del cobro |
| 5 · Monitoreo, alertas y robot 24/7 | 12:00 | 13–15 | Disparé y resolví una alerta |
| 6 · Informe de pruebas y entrega | 12:45 | 16–17 | Informe Word + URL y commit en Mis notas |

## Antes de empezar

1. **Abre tu Tienda Sol en la nube:** [jmd-learn.online/tienda-sol/](/tienda-sol/) te da una tienda propia con un código en la URL. Cópiala: es tu `BASE_URL`. Usuario: **cajero / cajero123**. No hay nada que descargar para usar la app.
2. Instala **Node 20 LTS** y **Chrome**. Descarga **qa-taller-kit.zip** desde Materiales y extráelo. Solo se instala la carpeta de pruebas: en `pruebas/`, `npm install` y `npx playwright install chromium`.
3. Guarda tu URL: `export BASE_URL=https://jmd-learn.online/tienda-sol/TU_CODIGO` (Windows: `$env:BASE_URL="…"`). Con esa variable todas las pruebas apuntan a tu tienda de la nube.
4. **Escanea tu tienda:** `npm run escanear` recorre login, catálogo, venta y reporte y escribe `docs/mapa-tienda.md` (cada botón con su localizador) y esqueletos de Page Object en `pages/generado/`. LIVE 01 lo muestra paso a paso.
5. Opcional: Docker Desktop para Lightpanda, Obscura y Grafana. Sin internet, la app local (`cd app` y `npm start`) es el plan B.

| Recurso | Acceso web |
|---|---|
| Tienda Sol | Sí: `/tienda-sol/`; tienda propia por código privado, es la que se prueba |
| Trace Viewer | Sí: [trace.playwright.dev](https://trace.playwright.dev) |
| Grafana | Sí: `http://localhost:3001`, después de levantar el monitoreo |
| Lightpanda y Obscura | No: se ejecutan y conectan desde terminal |

Tu código de tienda es privado: no lo compartas. La tienda se elimina tras **30 minutos sin actividad**.
El interruptor **Con bugs** cambia solo tu tienda; **Reiniciar mi tienda** no toca la de otra persona.

## 1 · 9:00 · De la experiencia al caso

1. **Experiencia:** abre tu tienda de la nube (o la réplica LIVE 02), agrega Café Altomayo (S/ 17.01) y paga S/ 5. Luego vuelve al catálogo, agrega otro café y cambia la cantidad a 2 para observar la promo doble.
2. **Reflexión:** compara lo que ingresaste con lo registrado. ¿Por qué las pruebas de API pueden pasar si el cobro en pantalla está mal?
3. **Conceptualización:** en LIVE 03 ubica cada caso en la pirámide de pruebas (unitaria, integración, E2E, monitoreo); en LIVE 04 provoca un rediseño y cuenta cuántas líneas cambian con y sin Page Object Model. En LIVE 05 distingue caso de uso y caso de prueba. Define semilla, pasos y resultado; organiza localizadores y acciones en un Page Object.
4. **Experimentación:** escribe E2E-VEN-002: el pago insuficiente debe rechazarse. Completa seis filas de `docs/matriz.csv`. Usa `getByRole` y `getByLabel`.

**Lo logré:** mi caso se puede repetir y no depende de otra prueba. **Si falla:** pulsa Reiniciar réplica y vuelve a ingresar; no necesitas instalar nada para LIVE 02.

## 2 · 9:45 · Grabar, ejecutar y corregir

1. **Experiencia:** en LIVE 05 pulsa Grabar y realiza el login y un clic. En tu equipo puedes ejecutar `npm run codegen` (la tienda local debe estar en 3000).
2. **Reflexión:** lee el código y elimina acciones accidentales. En LIVE 06 corre la suite 10 veces con y sin semilla, esperas fijas y aislamiento: mira de dónde salen las pruebas inestables. Observa el mensaje de los casos rojos en LIVE 07.
3. **Conceptualización:** los localizadores viven en `pages/`, las reglas en `specs/` y la semilla en `fixtures.ts`. Usa aserciones que esperan el resultado visible; evita esperas fijas.
4. **Experimentación:** desde `pruebas/`, ejecuta `npm test` y después `npm run test:corregido`. Crea primero tu referencia visual con `npm run test:visual:base`.

| Versión · Chromium + API | Resultado esperado |
|---|---|
| Con bugs | 20 pasan; VEN-001, VEN-002 y VEN-003 fallan |
| Corregida · BUGS=0 | 23 pasan |

Sin referencia visual, VIS-CAT-001 se omite: ese resultado **no** es una validación visual.
Las escenas del terminal reproducen salidas registradas; no ejecutan comandos en tu equipo.

Para probar la tienda web, abre `/tienda-sol/`, copia tu URL con código y pásala en `BASE_URL`. Las pruebas siembran solo esa tienda y eligen su modo según `BUGS`.

```bash
# Mac / Linux, desde pruebas/
BASE_URL=https://jmd-learn.online/tienda-sol/TU_CODIGO npm test
BASE_URL=https://jmd-learn.online/tienda-sol/TU_CODIGO BUGS=0 npm test
```

```powershell
# Windows PowerShell, desde pruebas/
$env:BASE_URL="https://jmd-learn.online/tienda-sol/TU_CODIGO"
npm test
$env:BUGS="0"
npm test
```

**Lo logré:** vi fallar los tres casos antes de comprobar la corrección. **Si falla:** falta el navegador → `npx playwright install chromium`; tienda vencida (410) → abre `/tienda-sol/` y actualiza `BASE_URL`.

## 3 · 10:30 · Medir sin confundir las causas

1. **Experiencia:** en LIVE 08 compara Chromium, Lightpanda y Obscura (qué soporta cada uno, cómo se conecta Playwright y cuál conviene para cada tarea). Luego, desde `motores/`, ejecuta `docker compose up -d`. Desde `pruebas/`, corre `npm run test:lightpanda` y `npm run test:obscura`.
2. **Reflexión:** en LIVE 09 compara el valor recibido de VEN-003. S/ 30.62 significa descuento doble; S/ 17.01 en Obscura corregida significa que no recalculó.
3. **Conceptualización:** CDP conecta Playwright con el motor. Lightpanda no dibuja y excluye la visual. Chromium es la referencia del navegador real.
4. **Experimentación:** registra resultado, tiempo y RAM con `docker stats --no-stream taller-lightpanda taller-obscura`. En LIVE 09 elige el motor según la tarea.

| Motor · medición previa del kit | Corregida | Tiempo | RAM pico |
|---|---|---|---|
| Chromium · E2E | 15/15 | 4.5 s | ≈335 MiB por suma RSS |
| Lightpanda 1.0.2 | 14/14 | 2.2 s | 14–24 MiB por docker stats |
| Obscura 0.2.6 | 13/14 | 9.7 s | 26–28 MiB por docker stats |

Son cifras de una Mac arm64 y metodologías de RAM diferentes, no una promesa de rendimiento.
Consulta `docs/motores-resultados.md` y `docs/verificacion-v2.md` para las corridas de preparación.
Obscura conserva el falso rojo por no disparar `change`; no se oculta ni se cambia la aserción para que pase.

**Lo logré:** mi tabla incluye las causas de los rojos. **Si falla:** conexión rechazada en 9222/9223 → levanta el motor; sin Docker, usa Chromium y analiza las salidas registradas en LIVE.

## 4 · 11:15 · Del reporte a la traza

1. **Experiencia:** filtra Fallaron en LIVE 10 o abre `npx playwright show-report` tras la suite.
2. **Reflexión:** en LIVE 10 recorre las acciones y alterna el DOM real Antes/Después. Revisa Red y Error: el cajero ingresó 5, pero el POST envió 17.01.
3. **Conceptualización:** une ID del caso, semilla, acción, petición, respuesta y aserción. Una traza permite reconstruir un fallo; el reporte resume la suite.
4. **Experimentación:** ejecuta `npm run portal` desde `pruebas/` y abre el archivo que indica la salida. Luego, en LIVE 11, acepta la grabación en tu tienda, haz la venta de S/ 5, ábrela en `/reproducir.html` y genera el spec que reproduce exactamente ese error; en LIVE 12 mira cómo lo hace una botica real: el modal de soporte, la reproducción paso a paso y la batería corriendo en segundo plano con topes de memoria y tiempo. Revisa la matriz en LIVE 10 y una `trace.zip` con `npx playwright show-trace RUTA_DE_LA_TRAZA`.

**Lo logré:** expliqué el bug con el caso y la petición, sin cambiar la aserción. **Si falla:** no hay traza → ejecuta `npm run test:traza`; los motores sin dibujo no generan capturas visuales.

## 5 · 12:00 · Observar, alertar y recuperar

1. **Experiencia:** en LIVE 14 tumba y recupera un servicio simulado, mira la disponibilidad contra la tabla de SLA y ajusta la regla «caído durante X min» hasta que avise la caída real sin falsas alarmas. Luego levanta la tienda local en 3000. En `monitoreo/`, corre `docker compose up -d` y `node receptor.mjs` en otra terminal. Abre Grafana en `http://localhost:3001`.
2. **Reflexión:** compara estado, latencia y disponibilidad en LIVE 13. ¿Una respuesta lenta significa caída? ¿Cuánto debería esperar la alerta?
3. **Conceptualización:** blackbox sondea `/salud` cada 15 s; Prometheus guarda las muestras; Grafana evalúa cada 10 s y espera 1 min de caída continua. La entrega al webhook añade otra espera.
4. **Experimentación:** en LIVE 15 arma tu robot: `node robot/robot.mjs` corre la suite cada 10 minutos y publica su estado en una URL (laptop, Docker con Lightpanda o GitHub Actions + Pages). Luego provoca y recupera la caída de **tu tienda** con `/api/caos` según `monitoreo/README.md`; comprueba DISPARADA y RESUELTA en el receptor. LIVE 13 acelera el tiempo manualmente para practicar la misma regla.

**Lo logré:** guardé una captura del tablero y el aviso recibido. **Si falla:** No data → espera dos sondeos y revisa el puerto 3000. Sin Docker, ejecuta `node vigia.mjs`. El taller usa el receptor local; no envía WhatsApp.

## 6 · 12:45 · Explicar y entregar

1. **Experiencia:** reúne la suite, la traza, la tabla de motores y la alerta.
2. **Reflexión:** en LIVE 17 redacta una pregunta con ID, esperado y recibido; publícala en el hilo o responde a un compañero.
3. **Conceptualización:** fija tu criterio de aceptación. **La IA propone; el runner decide.** Pídele a Claude el caso con POM y revisa sus localizadores; nunca aceptes una prueba que no viste fallar.
4. **Experimentación:** escribe tu **informe de pruebas en Word**, el documento con el que QA cierra un ciclo. La herramienta pone las tablas; el juicio lo pones tú:
   1. Desde `pruebas/`: `npm test` (deja `resultados/resultados.json`).
   2. Abre `informe/datos.json`, tu hoja de trabajo: cada campo vacío trae un `_guia` con qué escribir y un ejemplo. Redacta objetivo, alcance, fuera de alcance, criterio de salida, riesgos, conclusión, recomendación y firma. Cita IDs (`E2E-VEN-002`, `DEF-01`) y cifras (23 ejecutados, 3 fallan).
   3. `npm run informe` → `informe/informe-de-pruebas.docx`. Lo que no escribiste sale en amarillo como `[Completa: …]`.
   4. `npm run informe:revisar`: la revisión del jefe de QA. Falla si quedan marcadores, si la conclusión no dice APTO / NO APTO o no cita cifras, o si un defecto Alta no aparece en la conclusión ni en la recomendación. Corrige y repite hasta el ✓.
   5. Ábrelo y lee la sección 5 (tus 3 defectos con su traza) y la 9 (veredicto calculado NO APTO como pista; tu conclusión argumentada debajo). Repite con `npm run test:corregido` y mira cómo cambia.
   LIVE 16 tiene tres pasos: qué va en cada sección, escribe tu informe (con la misma revisión) y decide apto o no apto. Un ejemplo completo: `informe/ejemplo-datos.json`; no lo copies, tus cifras salen de tu corrida.
5. **Entrega:** revisa LIVE 17, sube tu carpeta de pruebas con `EVIDENCIA.md` y el `informe-de-pruebas.docx`, y entrega **URL + commit** desde la tarea del LMS.

**Lo logré:** la entrega aparece en Mis notas con estado En cola. **Si falla:** revisa URL y commit; la lista de LIVE no registra por sí sola una entrega.
