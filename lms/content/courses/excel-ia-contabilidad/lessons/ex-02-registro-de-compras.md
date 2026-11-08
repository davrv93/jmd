---
id: ex-02
title: "Clase 2 · Registro de compras"
published: true
duration: 30
objectives:
  - id: ex-02-o1
    title: "Clasificar compras con una lista desplegable (validación de datos)"
  - id: ex-02-o2
    title: "Separar base imponible e IGV a partir del importe total"
  - id: ex-02-o3
    title: "Resumir compras por clasificación y calcular el crédito fiscal del mes"
recording:
  url: ""
  passcode: ""
materials:
  - id: ex-02-plan
    title: "Plan del curso: 6 módulos con el ciclo de Kolb"
    kind: doc
    file: materials/plan-modulos-kolb.md
    objective_ids: [ex-02-o1]
  - id: ex-02-empresas
    title: "Las 10 empresas ficticias del curso (fichas)"
    kind: doc
    file: materials/empresas-ficticias.md
    objective_ids: [ex-02-o1]
  - id: ex-02-guia-visual
    title: "Guía visual del módulo (la idea y la demo de cada clase)"
    kind: slides
    slides_dir: materials/guia-visual-m1
    objective_ids: [ex-02-o1, ex-02-o2, ex-02-o3]
  - id: ex-02-e01
    title: "Caso · E01 Comercial Andina (Excel)"
    kind: file
    file: materials/casos/ex-02/ex-02-E01-comercial-andina.xlsx
    objective_ids: [ex-02-o1, ex-02-o2, ex-02-o3]
  - id: ex-02-e02
    title: "Caso · E02 Distribuidora Rímac (Excel)"
    kind: file
    file: materials/casos/ex-02/ex-02-E02-distribuidora-rimac.xlsx
    objective_ids: [ex-02-o1, ex-02-o2, ex-02-o3]
  - id: ex-02-e03
    title: "Caso · E03 Contables Pacífico (Excel)"
    kind: file
    file: materials/casos/ex-02/ex-02-E03-contables-pacifico.xlsx
    objective_ids: [ex-02-o1, ex-02-o2, ex-02-o3]
  - id: ex-02-e04
    title: "Caso · E04 Sabores del Puerto (Excel)"
    kind: file
    file: materials/casos/ex-02/ex-02-E04-sabores-del-puerto.xlsx
    objective_ids: [ex-02-o1, ex-02-o2, ex-02-o3]
  - id: ex-02-e05
    title: "Caso · E05 Transportes Sol Andino (Excel)"
    kind: file
    file: materials/casos/ex-02/ex-02-E05-transportes-sol-andino.xlsx
    objective_ids: [ex-02-o1, ex-02-o2, ex-02-o3]
  - id: ex-02-e06
    title: "Caso · E06 Constructora Los Pinos (Excel)"
    kind: file
    file: materials/casos/ex-02/ex-02-E06-constructora-los-pinos.xlsx
    objective_ids: [ex-02-o1, ex-02-o2, ex-02-o3]
  - id: ex-02-e07
    title: "Caso · E07 Clínica Santa Lucía (Excel)"
    kind: file
    file: materials/casos/ex-02/ex-02-E07-clinica-santa-lucia.xlsx
    objective_ids: [ex-02-o1, ex-02-o2, ex-02-o3]
  - id: ex-02-e08
    title: "Caso · E08 Colegio Amauta (Excel)"
    kind: file
    file: materials/casos/ex-02/ex-02-E08-colegio-amauta.xlsx
    objective_ids: [ex-02-o1, ex-02-o2, ex-02-o3]
  - id: ex-02-e09
    title: "Caso · E09 Taller Motor Rápido (Excel)"
    kind: file
    file: materials/casos/ex-02/ex-02-E09-taller-motor-rapido.xlsx
    objective_ids: [ex-02-o1, ex-02-o2, ex-02-o3]
  - id: ex-02-e10
    title: "Caso · E10 Agro Valle Verde (Excel)"
    kind: file
    file: materials/casos/ex-02/ex-02-E10-agro-valle-verde.xlsx
    objective_ids: [ex-02-o1, ex-02-o2, ex-02-o3]
cycle:
  - id: contexto
    title: "1 · Caso inicial"
    tool: lms
    phase: experiencia
    description: "Escena 1: la situación de la empresa y tu primer intento, antes de la explicación. Mira las facturas de compra: el importe ya trae el IGV. Separa a mano la base de una factura y anota cómo lo hiciste."
    check: "Hiciste tu primer intento y anotaste qué no cuadra"
  - id: juego
    title: "2 · Foro de reflexión"
    tool: lms
    phase: reflexion
    description: "Escena 2: juego «¿Qué compré?» y muro con tu reflexión: ¿Qué compra te costó clasificar y qué pasa con el crédito fiscal si la clasificas mal? Fuera de clase, en «Preguntas» de la sesión, comenta con un argumento la intervención de un compañero."
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
    description: "Escena 5: lista de comprobación, juego de repaso «Del total a la base» y reflexión final: lo aprendido, lo corregido y su uso en tu trabajo."
    check: "Marcaste la lista, terminaste el juego y escribiste tu reflexión final"
---

## Registro de compras

Registras las facturas de tus proveedores: eliges su clasificación de una lista, separas base e IGV del total y sumas el crédito fiscal.

**Módulo 1 · Registros contables y tributación (2 h)** · clase 2 de 4 · 30 minutos

| Paso de la ruta | Minutos | Qué haces |
|---|---|---|
| 1 · Caso inicial | 4 | Mira las facturas de compra: el importe ya trae el IGV. Separa a mano la base de una factura y anota cómo lo hiciste. |
| 2 · Foro de reflexión | 2 | Juego «¿Qué compré?» y tu reflexión en el muro |
| 3 · Lección y demostración | 7 | Lista desplegable, base e IGV desde el total |
| 4 · Reto de aplicación | 15 | Registro de compras de octubre en la Hoja JMD con tu empresa |
| 5 · Retroalimentación y cierre | 2 | Lista de comprobación, juego «Del total a la base» y reflexión final |

### El reto de aplicación (Hoja JMD)

1. Abre la hoja **Compras**.
2. Elige la **Clasificación** de cada factura en la lista.
3. Calcula la **Base** (Total ÷ 1,18) y el **IGV** (Total − Base).
4. Completa el **resumen** y el crédito fiscal.
5. Pide a la IA que revise tu clasificación.

La **Hoja JMD** es una hoja de cálculo dentro del sistema, con los mismos datos del Excel de tu empresa: escribes fórmulas en español (SUMA, SUMAR.SI, SI, BUSCARX…), pulsas **✔ Revisar** y ves en verde lo que está bien. Con **✨ Simula tu escenario con IA** pides un caso nuevo con el mismo formato (por ejemplo, «una bodega con 3 trabajadores y ventas en dólares») y la hoja se recarga con esos datos. **⬇ Excel** descarga tu trabajo como .xlsx, con tus fórmulas.

### Pide ayuda a la IA (DeepSeek Harness)

> Este es mi registro de compras de octubre. Revisa si la clasificación de cada factura (Mercadería, Servicio, Gasto administrativo, Activo fijo) tiene sentido según el proveedor y el concepto, y si la base y el IGV están bien sacados del total.

La IA **revisa y explica**; el Excel lo haces tú. Los datos son ficticios: puedes pegarlos sin problema.

### Módulo 1 · Registros contables y tributación en el ciclo de Kolb

- **Experiencia concreta:** Revisar comprobantes y registros desordenados de la empresa e intentar determinar sus compras, ventas e impuestos.
- **Observación reflexiva:** Publicar en el foro los errores encontrados y explicar cómo afectan los resultados.
- **Conceptualización abstracta:** Lección breve y demostración sobre tablas inteligentes, comprobantes, débito y crédito fiscal y fórmulas de cálculo.
- **Experimentación activa:** Resolver un caso nuevo con un registro de compras y ventas con fórmulas y validaciones.
- **Evidencia de aprendizaje:** Archivo Excel con registros y hoja de cálculo tributario.

**Proyecto integrador:** Tu empresa abre su libro: registros de ventas y compras, IGV y renta. Usas la misma empresa en los seis módulos, hasta el dashboard final.

*Regla didáctica: solo se usa como crédito fiscal el IGV de compras con factura y relacionadas con el negocio.*

*Supuestos del caso:* periodo, régimen y criterios tributarios o laborales están escritos en la hoja «Instrucciones» de cada Excel. Son datos ficticios y reglas didácticas para que el ejercicio se pueda resolver y verificar.
