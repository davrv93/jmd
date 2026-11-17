---
id: dh-01
title: "Sesión 1 · Los manuales se hacen solos: documenta un sistema con tu agente"
published: true
starts_at: 2026-11-17T19:30:00-05:00
objectives:
  - id: dh-01-o1
    title: Abrir DeepSeek Harness (dsh) en tu aula del LIVE, con la clave de la clase o con tu API key, sin pegar la clave en ningún chat ni archivo
  - id: dh-01-o2
    title: Describir un caso (quién, qué quiere lograr y qué puede salir mal) y darle al agente la dirección y una cuenta de prueba de un sistema propio o con permiso
  - id: dh-01-o3
    title: Hacer que el agente inicie sesión, recorra el sistema según el caso y entregue el proceso en BPMN, el diagrama de clases, la matriz de roles y acciones, los flujos y el manual en PDF
  - id: dh-01-o4
    title: Revisar la documentación con criterio, separar lo comprobado de lo «por verificar», corregir el modelo y volver a generar
recording:
  url: ""
  passcode: ""
repo:
  url: https://github.com/davrv93/jmd
  ref: main
materials:
  - id: dh-01-kit-documenta
    title: "Kit «documenta-sistema» (el skill de la clase: navegador de texto con sesión, generador de BPMN, clases, matriz, flujos y manual en PDF)"
    kind: zip
    file: materials/kit-documenta-sistema.zip
    objective_ids: [dh-01-o3, dh-01-o4]
  - id: dh-01-m-tienda
    title: "Tienda Sol · el sistema de práctica (te da una tienda propia; cuentas de prueba cajero / cajero123 y admin / admin123)"
    kind: link
    url: https://jmd-learn.online/tienda-sol/
    objective_ids: [dh-01-o2, dh-01-o3]
  - id: dh-01-m-bpmn
    title: "bpmn.io · modelador libre para abrir y editar tu archivo .bpmn"
    kind: link
    url: https://demo.bpmn.io/
    objective_ids: [dh-01-o4]
  - id: dh-01-guia-visual
    title: "Guía visual: cuenta, clave y primer uso de dsh (12 diapositivas; por si usas tu propia API key)"
    kind: slides
    slides_dir: materials/guia-visual-s1
    objective_ids: [dh-01-o1]
  - id: dh-01-guia-texto
    title: "Guía en texto: cuenta, recarga, clave y primer uso de dsh (verificada el 31-10-2026)"
    kind: doc
    file: materials/guia-deepseek-cuenta-recarga-api.md
    objective_ids: [dh-01-o1]
  - id: dh-01-kit
    title: "Para las sesiones 2 y 3: kit «Foto del sistema» (skill, AGENTS.sistema.md y foto.mjs)"
    kind: zip
    file: materials/kit-foto-del-sistema.zip
    objective_ids: []
  - id: dh-01-sis-muebleria
    title: "Sistema de práctica «muebleria» · Maderas del Sur · Ventas (zip para la Ruta A)"
    kind: zip
    file: materials/sistemas/muebleria.zip
    objective_ids: []
  - id: dh-01-sis-papeleria
    title: "Sistema de práctica «papeleria» · Papelería Útil (zip para la Ruta A)"
    kind: zip
    file: materials/sistemas/papeleria.zip
    objective_ids: []
  - id: dh-01-sis-abogados
    title: "Sistema de práctica «abogados» · Estudio Jurídico Paredes & Asociados (zip para la Ruta A)"
    kind: zip
    file: materials/sistemas/abogados.zip
    objective_ids: []
  - id: dh-01-sis-centro-salud
    title: "Sistema de práctica «centro-salud» · Centro de Salud Santa Rosa (zip para la Ruta A)"
    kind: zip
    file: materials/sistemas/centro-salud.zip
    objective_ids: []
  - id: dh-01-sis-consultora-software
    title: "Sistema de práctica «consultora-software» · Nexa Soluciones TI (zip para la Ruta A)"
    kind: zip
    file: materials/sistemas/consultora-software.zip
    objective_ids: []
  - id: dh-01-sis-fabrica-bi
    title: "Sistema de práctica «fabrica-bi» · DataFactory (zip para la Ruta A)"
    kind: zip
    file: materials/sistemas/fabrica-bi.zip
    objective_ids: []
  - id: dh-01-sis-lab-redes
    title: "Sistema de práctica «lab-redes» · Laboratorio de Redes Andino (zip para la Ruta A)"
    kind: zip
    file: materials/sistemas/lab-redes.zip
    objective_ids: []
  - id: dh-01-sis-linea-produccion
    title: "Sistema de práctica «linea-produccion» · Manufacturas Altiplano (zip para la Ruta A)"
    kind: zip
    file: materials/sistemas/linea-produccion.zip
    objective_ids: []
  - id: dh-01-sis-botica
    title: "Sistema de práctica «botica» · Botica Salud Total (zip para la Ruta A)"
    kind: zip
    file: materials/sistemas/botica.zip
    objective_ids: []
  - id: dh-01-sis-restaurante
    title: "Sistema de práctica «restaurante» · Sabores del Colca (zip para la Ruta A)"
    kind: zip
    file: materials/sistemas/restaurante.zip
    objective_ids: []
  - id: dh-01-sis-taller-mecanico
    title: "Sistema de práctica «taller-mecanico» · Taller Automotriz Los Andes (zip para la Ruta A)"
    kind: zip
    file: materials/sistemas/taller-mecanico.zip
    objective_ids: []
  - id: dh-01-sis-colegio
    title: "Sistema de práctica «colegio» · I.E. San Martín (zip para la Ruta A)"
    kind: zip
    file: materials/sistemas/colegio.zip
    objective_ids: []
  - id: dh-01-sis-transportes
    title: "Sistema de práctica «transportes» · Transportes Andes Cargo (zip para la Ruta A)"
    kind: zip
    file: materials/sistemas/transportes.zip
    objective_ids: []
  - id: dh-01-sis-hotel
    title: "Sistema de práctica «hotel» · Hostal Plaza Mayor (zip para la Ruta A)"
    kind: zip
    file: materials/sistemas/hotel.zip
    objective_ids: []
  - id: dh-01-sis-constructora
    title: "Sistema de práctica «constructora» · Constructora Ingeniería Sur (zip para la Ruta A)"
    kind: zip
    file: materials/sistemas/constructora.zip
    objective_ids: []
  - id: dh-01-m-repo
    title: DeepSeek Harness · repositorio oficial (código, README, licencia MIT)
    kind: repo
    url: https://github.com/deepseek-ai/deepseek-harness
    objective_ids: [dh-01-o1]
  - id: dh-01-m-plat
    title: Plataforma de DeepSeek · cuenta, recarga y API keys (escríbela tú mismo)
    kind: link
    url: https://platform.deepseek.com
    objective_ids: [dh-01-o1]
cycle:
  - id: ver
    title: Ver la clase y el mapa del día
    tool: zoom
    phase: experiencia
    description: Asiste en vivo (martes 17 de noviembre, 7:30 pm) o mira la grabación. La escena 1 muestra el camino del caso al manual.
    check: Sabes qué cinco documentos vas a obtener y las tres reglas del día
  - id: dsh
    title: Abrir DeepSeek Harness y dejar el aula lista
    tool: lms
    phase: experiencia
    description: "En la escena 2 abre DeepSeek Harness y pega el primer pedido: instala el skill documenta-sistema si falta y corre su autoprueba."
    check: El agente respondió «LISTO»
  - id: caso
    title: Describir tu caso
    tool: lms
    phase: reflexion
    description: En la escena 3 abre tu Tienda Sol en otra pestaña, copia su dirección con código y escribe tu caso (quién, qué quiere lograr y qué puede salir mal).
    check: Tienes la dirección de tu tienda y un caso de dos o tres líneas
  - id: recorrer
    title: El agente entra y recorre
    tool: terminal
    phase: experiencia
    description: En la escena 4 copia el pedido. El agente inicia sesión con las cuentas de prueba, recorre según tu caso y deja la bitácora. Solo navega y lee.
    check: Existe documentacion/evidencia/bitacora.md y el agente listó pantallas y rutas
  - id: documentar
    title: Generar la documentación
    tool: terminal
    phase: conceptualizacion
    description: En la escena 5 el agente escribe modelo.json y genera el BPMN, las clases, la matriz, los flujos y el manual en PDF. Míralo en el Visor.
    check: La comprobación dice «todo en orden» y abre documentacion/index.html
  - id: revisar
    title: Revisar con criterio y corregir
    tool: lms
    phase: experimentacion
    description: En la escena 6 pasa las cinco revisiones, pide una corrección y vuelve a generar. Lo que no se comprobó debe decir «por verificar».
    check: Pediste al menos una corrección y el manual cambió
  - id: preguntar
    title: Preguntar o responder
    tool: lms
    phase: reflexion
    description: Publica una pregunta sobre la clase en el hilo de la sesión o responde la de un compañero.
    check: Tu pregunta aparece en el hilo de la sesión
  - id: entregar
    title: Entregar el manual de tu caso
    tool: lms
    phase: experimentacion
    description: Entrega manual.pdf, 01-proceso.bpmn y 03-roles-y-acciones.md de tu caso con una nota de tres líneas. Si puedes, repítelo con un sistema tuyo en ambiente de prueba.
    check: La entrega aparece en «Mis notas» con estado en cola
---

## Avance de la clase

Hoy tu agente hace el trabajo que nadie quiere hacer: **documentar un sistema**. Tú describes un caso, le das la
dirección y una cuenta de prueba, y DeepSeek Harness entra, recorre y te deja cinco documentos.

| Bloque | Qué haces | Comprobación |
|---|---|---|
| 1 · Hoy | Ves el camino del caso al manual | Conoces las tres reglas |
| 2 · Abre dsh | Abres DeepSeek Harness y preparas el aula | El agente dice «LISTO» |
| 3 · Tu caso | Abres tu Tienda Sol y escribes el caso | Dirección con código y caso listos |
| 4 · Entra y recorre | El agente inicia sesión con dos roles y recorre | `documentacion/evidencia/bitacora.md` |
| 5 · Los documentos | El agente genera todo | «COMPROBACIÓN: todo en orden» |
| 6 · Revisa con criterio | Corriges y regeneras | El manual cambió |
| 7 · Tu sistema y tarea | Lo apuntas a un sistema tuyo | Entrega enviada |

**Tres reglas del día**

1. El sistema es tuyo o tienes permiso.
2. Entras con una cuenta de prueba, nunca con tu cuenta real. Las claves no se guardan en ningún archivo.
3. El agente solo navega y lee: no crea, no cambia y no borra.

**Qué es y qué no es.** En tu aula el agente navega **en modo texto**: inicia sesión de verdad, lee cada página,
sus formularios y la API con la sesión abierta, pero no dibuja la pantalla ni saca capturas. Por eso el manual
lleva **esquemas de pantalla**, no capturas. Para capturas reales hace falta un navegador gráfico, que hoy el aula
no tiene.

## Antes de la clase

- [ ] Sabes entrar a tu aula del LIVE y abrir la pestaña «DeepSeek Harness».
- [ ] Si tu grupo no usa la clave de la clase: tienes tu API key de DeepSeek en un gestor de contraseñas (guía en
  Materiales). Nunca la pegues en un chat.

## 2 · Abre dsh y deja el aula lista

**Objetivo:** dsh abierto y el skill `documenta-sistema` instalado.

Copia el pedido de la escena 2. El agente revisa si el skill está en `/trabajo/.agents/skills/documenta-sistema`;
si falta, lo descarga del repositorio del curso y corre la autoprueba:

```bash
python3 /trabajo/.agents/skills/documenta-sistema/herramientas/generar.py --prueba
```

**Qué deberías ver:** `LISTO: el skill documenta-sistema funciona en esta aula.`
**Si falla:** copia el mensaje completo y avisa al instructor.

## 3 · Tu caso

**Objetivo:** un caso claro y la dirección de tu sistema de práctica.

1. En otra pestaña abre `jmd-learn.online/tienda-sol/`. Te da **una tienda propia** con un código en la dirección.
2. Entra con `cajero` / `cajero123`, mira el catálogo, la venta y el reporte.
3. Copia la dirección completa (con el código).
4. Escribe tu caso: **quién**, **qué quiere lograr** y **qué puede salir mal**.

Ejemplo: «Un cajero atiende a un cliente: busca productos, arma la venta, cobra en efectivo y entrega el vuelto.
Quiero saber qué pasa si el efectivo no alcanza».

## 4 · El agente entra y recorre

**Objetivo:** que el agente inicie sesión con cada rol y recorra lo que tu caso toca.

El pedido de la escena 4 le da al agente el caso, la dirección y las dos cuentas de prueba. El skill usa un
navegador de texto con sesión:

```bash
python3 H/navega.py abrir "DIRECCIÓN" --sesion cajero
DOC_USUARIO=cajero DOC_CLAVE='…' python3 H/navega.py entrar --api /api/login --sesion cajero
python3 H/navega.py matriz /api/productos /api/reporte
```

**Qué deberías ver:** `INGRESO: dentro como «cajero»`, la lista de pantallas, formularios y rutas, y la bitácora en
`documentacion/evidencia/bitacora.md`. **Si falla:** estado 410 → tu tienda venció: abre Tienda Sol otra vez y
pega la dirección nueva.

## 5 · Los documentos

**Objetivo:** los cinco entregables, generados y comprobados.

El agente escribe un solo archivo, `documentacion/modelo.json`, y `generar.py` hace el resto:

| Archivo | Qué es |
|---|---|
| `01-proceso.bpmn` (+ `.svg`) | El proceso de tu caso en BPMN 2.0; se abre en cualquier modelador |
| `02-clases.mmd` (+ `.svg`) | Diagrama de clases en Mermaid: qué datos guarda el sistema |
| `03-roles-y-acciones.md` (+ `.csv`) | Quién puede hacer qué, con evidencia |
| `04-flujos.md` | Paso a paso: pantalla, acción y resultado |
| `manual.pdf` | El manual completo |
| `index.html` | Todo junto, para verlo en el Visor |

**Qué deberías ver:** `COMPROBACIÓN: todo en orden`. **Si falla:** «El modelo tiene problemas» → pídele al agente
que corrija exactamente lo que nombra el mensaje y vuelva a generar.

## 6 · Revisa con criterio

El agente escribe rápido; tú decides si está bien.

- ¿El BPMN cuenta tu caso de inicio a fin, con la decisión de qué pasa si algo falla?
- ¿Cada «Sí» de la matriz tiene evidencia y lo no probado dice «Por verificar»?
- ¿Las clases y sus datos existen en el sistema?
- ¿El manual lo entiende alguien que nunca vio el sistema?
- ¿Ninguna clave aparece en ningún archivo?

Pide la corrección en una frase. El agente cambia `modelo.json` y regenera: nunca se editan a mano los archivos
generados.

## 7 · Tu propio sistema

Mismo pedido, otra dirección. Antes de dársela al agente:

- El sistema es tuyo o tienes permiso por escrito.
- Es un ambiente de prueba, no producción.
- La cuenta es de prueba y con pocos permisos.
- El sistema debe verse desde internet por el puerto 80 o 443 (el `localhost` de tu laptop no se ve desde el aula).
- Si pide captcha o un código por SMS, hace falta una cuenta de prueba sin ese paso.

## Tarea

- `manual.pdf`, `01-proceso.bpmn` y `03-roles-y-acciones.md` de tu caso.
- Una nota de tres líneas: qué acertó el agente, qué corregiste y qué quedó por verificar.
- Entrégalo desde el LMS (zip o enlace).

**Para la sesión 2** vas a medir cuánto consume el agente con un sistema de práctica y su «foto». Déjalo listo en
tu aula con dos comandos: `aula sistema muebleria` (o el que elijas con `aula sistema`) y `aula sistema foto`.
