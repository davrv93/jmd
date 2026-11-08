---
id: ex-08
title: "Clase 8 · Control de inventarios"
published: true
duration: 40
objectives:
  - id: ex-08-o1
    title: "Sumar entradas y salidas por producto con SUMAR.SI.CONJUNTO"
  - id: ex-08-o2
    title: "Calcular stock final y valor del inventario"
  - id: ex-08-o3
    title: "Crear una alerta de reposición con SI y formato condicional"
recording:
  url: ""
  passcode: ""
materials:
  - id: ex-08-plan
    title: "Plan del curso: 6 módulos con el ciclo de Kolb"
    kind: doc
    file: materials/plan-modulos-kolb.md
    objective_ids: [ex-08-o1]
  - id: ex-08-empresas
    title: "Las 10 empresas ficticias del curso (fichas)"
    kind: doc
    file: materials/empresas-ficticias.md
    objective_ids: [ex-08-o1]
  - id: ex-08-guia-visual
    title: "Guía visual del módulo (la idea y la demo de cada clase)"
    kind: slides
    slides_dir: materials/guia-visual-m3
    objective_ids: [ex-08-o1, ex-08-o2, ex-08-o3]
  - id: ex-08-e01
    title: "Caso · E01 Comercial Andina (Excel)"
    kind: file
    file: materials/casos/ex-08/ex-08-E01-comercial-andina.xlsx
    objective_ids: [ex-08-o1, ex-08-o2, ex-08-o3]
  - id: ex-08-e02
    title: "Caso · E02 Distribuidora Rímac (Excel)"
    kind: file
    file: materials/casos/ex-08/ex-08-E02-distribuidora-rimac.xlsx
    objective_ids: [ex-08-o1, ex-08-o2, ex-08-o3]
  - id: ex-08-e03
    title: "Caso · E03 Contables Pacífico (Excel)"
    kind: file
    file: materials/casos/ex-08/ex-08-E03-contables-pacifico.xlsx
    objective_ids: [ex-08-o1, ex-08-o2, ex-08-o3]
  - id: ex-08-e04
    title: "Caso · E04 Sabores del Puerto (Excel)"
    kind: file
    file: materials/casos/ex-08/ex-08-E04-sabores-del-puerto.xlsx
    objective_ids: [ex-08-o1, ex-08-o2, ex-08-o3]
  - id: ex-08-e05
    title: "Caso · E05 Transportes Sol Andino (Excel)"
    kind: file
    file: materials/casos/ex-08/ex-08-E05-transportes-sol-andino.xlsx
    objective_ids: [ex-08-o1, ex-08-o2, ex-08-o3]
  - id: ex-08-e06
    title: "Caso · E06 Constructora Los Pinos (Excel)"
    kind: file
    file: materials/casos/ex-08/ex-08-E06-constructora-los-pinos.xlsx
    objective_ids: [ex-08-o1, ex-08-o2, ex-08-o3]
  - id: ex-08-e07
    title: "Caso · E07 Clínica Santa Lucía (Excel)"
    kind: file
    file: materials/casos/ex-08/ex-08-E07-clinica-santa-lucia.xlsx
    objective_ids: [ex-08-o1, ex-08-o2, ex-08-o3]
  - id: ex-08-e08
    title: "Caso · E08 Colegio Amauta (Excel)"
    kind: file
    file: materials/casos/ex-08/ex-08-E08-colegio-amauta.xlsx
    objective_ids: [ex-08-o1, ex-08-o2, ex-08-o3]
  - id: ex-08-e09
    title: "Caso · E09 Taller Motor Rápido (Excel)"
    kind: file
    file: materials/casos/ex-08/ex-08-E09-taller-motor-rapido.xlsx
    objective_ids: [ex-08-o1, ex-08-o2, ex-08-o3]
  - id: ex-08-e10
    title: "Caso · E10 Agro Valle Verde (Excel)"
    kind: file
    file: materials/casos/ex-08/ex-08-E10-agro-valle-verde.xlsx
    objective_ids: [ex-08-o1, ex-08-o2, ex-08-o3]
cycle:
  - id: contexto
    title: "1 · Caso inicial"
    tool: lms
    phase: experiencia
    description: "Escena 1: la situación de la empresa y tu primer intento, antes de la explicación. Revisa los movimientos del almacén: elige un producto y calcula su stock final a mano. ¿Coincide con lo esperado?"
    check: "Hiciste tu primer intento y anotaste qué no cuadra"
  - id: juego
    title: "2 · Foro de reflexión"
    tool: lms
    phase: reflexion
    description: "Escena 2: juego «Semáforo del almacén» y muro con tu reflexión: ¿Qué puede causar un faltante de stock en tu almacén? Propón una causa y un control. Fuera de clase, en «Preguntas» de la sesión, comenta con un argumento la intervención de un compañero."
    check: "Publicaste tu reflexión y comentaste la de un compañero"
  - id: demo
    title: "3 · Lección y demostración"
    tool: lms
    phase: conceptualizacion
    description: "Escena 3: explicación breve y demostración paso a paso. Repásala en la guía visual del módulo."
    check: "Viste todos los pasos y puedes decir qué hace cada fórmula"
  - id: caso
    title: "4 · Reto de aplicación"
    tool: lms
    phase: experimentacion
    description: "Escena 4: un caso de tu empresa en la Hoja JMD. Escribe las fórmulas, pulsa «Revisar», simula un escenario con IA y descarga tu Excel."
    check: "La revisión de la Hoja JMD sale en verde y descargaste tu Excel"
  - id: cierre
    title: "5 · Retroalimentación y cierre"
    tool: lms
    phase: reflexion
    description: "Escena 5: lista de comprobación, juego de repaso «Caza el error del inventario» y reflexión final: lo aprendido, lo corregido y su uso en tu trabajo."
    check: "Marcaste la lista, terminaste el juego y escribiste tu reflexión final"
---

## Control de inventarios

Con los movimientos del mes calculas entradas, salidas y stock final de cada producto, su valor y una alerta de reposición pintada con formato condicional.

**Módulo 3 · Inventarios y activos empresariales (2 h)** · clase 1 de 3 · 40 minutos

| Paso de la ruta | Minutos | Qué haces |
|---|---|---|
| 1 · Caso inicial | 5 | Revisa los movimientos del almacén: elige un producto y calcula su stock final a mano. ¿Coincide con lo esperado? |
| 2 · Foro de reflexión | 3 | Juego «Semáforo del almacén» y tu reflexión en el muro |
| 3 · Lección y demostración | 9 | SUMAR.SI.CONJUNTO, stock, SI y formato condicional |
| 4 · Reto de aplicación | 20 | Inventario de octubre con alertas en la Hoja JMD con tu empresa |
| 5 · Retroalimentación y cierre | 3 | Lista de comprobación, juego «Caza el error del inventario» y reflexión final |

### El reto de aplicación (Hoja JMD)

1. Mira la hoja **Movimientos**.
2. En **Inventario**, suma **entradas** y **salidas** de cada producto.
3. Calcula **stock final** y **valor**.
4. Escribe la **alerta** y píntala con formato condicional.
5. Pide a la IA una lista de compras.

La **Hoja JMD** es una hoja de cálculo dentro del sistema, con los mismos datos del Excel de tu empresa: escribes fórmulas en español (SUMA, SUMAR.SI, SI, BUSCARX…), pulsas **✔ Revisar** y ves en verde lo que está bien. Con **✨ Simula tu escenario con IA** pides un caso nuevo con el mismo formato (por ejemplo, «una bodega con 3 trabajadores y ventas en dólares») y la hoja se recarga con esos datos. **⬇ Excel** descarga tu trabajo como .xlsx, con tus fórmulas.

### Pide ayuda a la IA (DeepSeek Harness)

> Esta es mi hoja de inventario de octubre. Revisa que el stock final cuadre con los movimientos y arma una lista de compras para los productos en «Reponer», con cuántas unidades pedir para volver al doble del mínimo.

La IA **revisa y explica**; el Excel lo haces tú. Los datos son ficticios: puedes pegarlos sin problema.

### Módulo 3 · Inventarios y activos empresariales en el ciclo de Kolb

- **Experiencia concreta:** Explorar movimientos de un almacén con diferencias de stock y una relación de activos.
- **Observación reflexiva:** Explicar en el foro las posibles causas de faltantes y errores de valorización.
- **Conceptualización abstracta:** Control de existencias, promedio ponderado móvil, vida útil, valor residual y depreciación lineal.
- **Experimentación activa:** Construir el inventario, actualizar el kardex con nuevas operaciones y elaborar el cuadro de depreciación.
- **Evidencia de aprendizaje:** Archivo Excel con inventario, kardex y depreciación.

**Proyecto integrador:** Sumas el inventario, el kardex y la depreciación de los activos de tu empresa. Usas la misma empresa en los seis módulos, hasta el dashboard final.

*Supuestos del caso:* periodo, régimen y criterios tributarios o laborales están escritos en la hoja «Instrucciones» de cada Excel. Son datos ficticios y reglas didácticas para que el ejercicio se pueda resolver y verificar.
