---
id: ex-03
title: "Clase 3 · IGV: liquidación mensual"
published: true
duration: 30
objectives:
  - id: ex-03-o1
    title: "Calcular débito y crédito fiscal por mes con SUMAR.SI.CONJUNTO de dos condiciones"
  - id: ex-03-o2
    title: "Arrastrar el saldo a favor de un mes al siguiente con MAX"
  - id: ex-03-o3
    title: "Explicar con palabras simples por qué un mes sale a pagar y otro no"
recording:
  url: ""
  passcode: ""
materials:
  - id: ex-03-plan
    title: "Plan del curso: 6 módulos con el ciclo de Kolb"
    kind: doc
    file: materials/plan-modulos-kolb.md
    objective_ids: [ex-03-o1]
  - id: ex-03-empresas
    title: "Las 10 empresas ficticias del curso (fichas)"
    kind: doc
    file: materials/empresas-ficticias.md
    objective_ids: [ex-03-o1]
  - id: ex-03-guia-visual
    title: "Guía visual del módulo (la idea y la demo de cada clase)"
    kind: slides
    slides_dir: materials/guia-visual-m1
    objective_ids: [ex-03-o1, ex-03-o2, ex-03-o3]
  - id: ex-03-e01
    title: "Caso · E01 Comercial Andina (Excel)"
    kind: file
    file: materials/casos/ex-03/ex-03-E01-comercial-andina.xlsx
    objective_ids: [ex-03-o1, ex-03-o2, ex-03-o3]
  - id: ex-03-e02
    title: "Caso · E02 Distribuidora Rímac (Excel)"
    kind: file
    file: materials/casos/ex-03/ex-03-E02-distribuidora-rimac.xlsx
    objective_ids: [ex-03-o1, ex-03-o2, ex-03-o3]
  - id: ex-03-e03
    title: "Caso · E03 Contables Pacífico (Excel)"
    kind: file
    file: materials/casos/ex-03/ex-03-E03-contables-pacifico.xlsx
    objective_ids: [ex-03-o1, ex-03-o2, ex-03-o3]
  - id: ex-03-e04
    title: "Caso · E04 Sabores del Puerto (Excel)"
    kind: file
    file: materials/casos/ex-03/ex-03-E04-sabores-del-puerto.xlsx
    objective_ids: [ex-03-o1, ex-03-o2, ex-03-o3]
  - id: ex-03-e05
    title: "Caso · E05 Transportes Sol Andino (Excel)"
    kind: file
    file: materials/casos/ex-03/ex-03-E05-transportes-sol-andino.xlsx
    objective_ids: [ex-03-o1, ex-03-o2, ex-03-o3]
  - id: ex-03-e06
    title: "Caso · E06 Constructora Los Pinos (Excel)"
    kind: file
    file: materials/casos/ex-03/ex-03-E06-constructora-los-pinos.xlsx
    objective_ids: [ex-03-o1, ex-03-o2, ex-03-o3]
  - id: ex-03-e07
    title: "Caso · E07 Clínica Santa Lucía (Excel)"
    kind: file
    file: materials/casos/ex-03/ex-03-E07-clinica-santa-lucia.xlsx
    objective_ids: [ex-03-o1, ex-03-o2, ex-03-o3]
  - id: ex-03-e08
    title: "Caso · E08 Colegio Amauta (Excel)"
    kind: file
    file: materials/casos/ex-03/ex-03-E08-colegio-amauta.xlsx
    objective_ids: [ex-03-o1, ex-03-o2, ex-03-o3]
  - id: ex-03-e09
    title: "Caso · E09 Taller Motor Rápido (Excel)"
    kind: file
    file: materials/casos/ex-03/ex-03-E09-taller-motor-rapido.xlsx
    objective_ids: [ex-03-o1, ex-03-o2, ex-03-o3]
  - id: ex-03-e10
    title: "Caso · E10 Agro Valle Verde (Excel)"
    kind: file
    file: materials/casos/ex-03/ex-03-E10-agro-valle-verde.xlsx
    objective_ids: [ex-03-o1, ex-03-o2, ex-03-o3]
cycle:
  - id: contexto
    title: "1 · Caso inicial"
    tool: lms
    phase: experiencia
    description: "Escena 1: la situación de la empresa y tu primer intento, antes de la explicación. Con ventas y compras de tres meses, intenta decir si en octubre se paga IGV o queda saldo a favor. ¿Qué datos te faltan?"
    check: "Hiciste tu primer intento y anotaste qué no cuadra"
  - id: juego
    title: "2 · Foro de reflexión"
    tool: lms
    phase: reflexion
    description: "Escena 2: juego «Contrarreloj del IGV» y muro con tu reflexión: ¿Por qué un mes puede quedar con saldo a favor aunque la empresa haya vendido? Explícalo con un número de tu caso. Fuera de clase, en «Preguntas» de la sesión, comenta con un argumento la intervención de un compañero."
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
    description: "Escena 5: lista de comprobación, juego de repaso «Ordena la liquidación» y reflexión final: lo aprendido, lo corregido y su uso en tu trabajo."
    check: "Marcaste la lista, terminaste el juego y escribiste tu reflexión final"
---

## IGV: liquidación mensual

Juntas ventas y compras de tres meses y calculas, mes a mes, si toca pagar IGV o si queda saldo a favor para el siguiente.

**Módulo 1 · Registros contables y tributación (2 h)** · clase 3 de 4 · 30 minutos

| Paso de la ruta | Minutos | Qué haces |
|---|---|---|
| 1 · Caso inicial | 4 | Con ventas y compras de tres meses, intenta decir si en octubre se paga IGV o queda saldo a favor. ¿Qué datos te faltan? |
| 2 · Foro de reflexión | 2 | Juego «Contrarreloj del IGV» y tu reflexión en el muro |
| 3 · Lección y demostración | 7 | Débito y crédito por mes y saldo que pasa |
| 4 · Reto de aplicación | 15 | Liquidación de IGV de agosto a octubre en la Hoja JMD con tu empresa |
| 5 · Retroalimentación y cierre | 2 | Lista de comprobación, juego «Ordena la liquidación» y reflexión final |

### El reto de aplicación (Hoja JMD)

1. Mira las hojas **Ventas** y **Compras** (ya traen el IGV y el mes).
2. En **Liquidación**, calcula ventas gravadas, débito y crédito de cada mes.
3. Calcula el **resultado** de cada mes.
4. Separa **a pagar** y **saldo a favor** con MAX; pasa el saldo al mes siguiente.
5. Pide a la IA que lo explique como al gerente.

La **Hoja JMD** es una hoja de cálculo dentro del sistema, con los mismos datos del Excel de tu empresa: escribes fórmulas en español (SUMA, SUMAR.SI, SI, BUSCARX…), pulsas **✔ Revisar** y ves en verde lo que está bien. Con **✨ Simula tu escenario con IA** pides un caso nuevo con el mismo formato (por ejemplo, «una bodega con 3 trabajadores y ventas en dólares») y la hoja se recarga con esos datos. **⬇ Excel** descarga tu trabajo como .xlsx, con tus fórmulas.

### Pide ayuda a la IA (DeepSeek Harness)

> Esta es mi liquidación de IGV de agosto a octubre. Comprueba que el saldo a favor de cada mes pasa bien al mes siguiente y explícame con palabras simples por qué un mes salió a pagar y otro no.

La IA **revisa y explica**; el Excel lo haces tú. Los datos son ficticios: puedes pegarlos sin problema.

### Módulo 1 · Registros contables y tributación en el ciclo de Kolb

- **Experiencia concreta:** Revisar comprobantes y registros desordenados de la empresa e intentar determinar sus compras, ventas e impuestos.
- **Observación reflexiva:** Publicar en el foro los errores encontrados y explicar cómo afectan los resultados.
- **Conceptualización abstracta:** Lección breve y demostración sobre tablas inteligentes, comprobantes, débito y crédito fiscal y fórmulas de cálculo.
- **Experimentación activa:** Resolver un caso nuevo con un registro de compras y ventas con fórmulas y validaciones.
- **Evidencia de aprendizaje:** Archivo Excel con registros y hoja de cálculo tributario.

**Proyecto integrador:** Tu empresa abre su libro: registros de ventas y compras, IGV y renta. Usas la misma empresa en los seis módulos, hasta el dashboard final.

*Liquidación didáctica simplificada: no incluye percepciones, retenciones, detracciones ni prorrata.*

*Supuestos del caso:* periodo, régimen y criterios tributarios o laborales están escritos en la hoja «Instrucciones» de cada Excel. Son datos ficticios y reglas didácticas para que el ejercicio se pueda resolver y verificar.
