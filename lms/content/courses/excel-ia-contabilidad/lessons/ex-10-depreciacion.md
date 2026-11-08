---
id: ex-10
title: "Clase 10 · Depreciación"
published: true
duration: 40
objectives:
  - id: ex-10-o1
    title: "Traer la tasa de depreciación de cada activo con BUSCARX"
  - id: ex-10-o2
    title: "Calcular depreciación anual, mensual y meses de uso"
  - id: ex-10-o3
    title: "Obtener depreciación acumulada (con tope en el costo) y valor en libros"
recording:
  url: ""
  passcode: ""
materials:
  - id: ex-10-plan
    title: "Plan del curso: 6 módulos con el ciclo de Kolb"
    kind: doc
    file: materials/plan-modulos-kolb.md
    objective_ids: [ex-10-o1]
  - id: ex-10-empresas
    title: "Las 10 empresas ficticias del curso (fichas)"
    kind: doc
    file: materials/empresas-ficticias.md
    objective_ids: [ex-10-o1]
  - id: ex-10-guia-visual
    title: "Guía visual del módulo (la idea y la demo de cada clase)"
    kind: slides
    slides_dir: materials/guia-visual-m3
    objective_ids: [ex-10-o1, ex-10-o2, ex-10-o3]
  - id: ex-10-e01
    title: "Caso · E01 Comercial Andina (Excel)"
    kind: file
    file: materials/casos/ex-10/ex-10-E01-comercial-andina.xlsx
    objective_ids: [ex-10-o1, ex-10-o2, ex-10-o3]
  - id: ex-10-e02
    title: "Caso · E02 Distribuidora Rímac (Excel)"
    kind: file
    file: materials/casos/ex-10/ex-10-E02-distribuidora-rimac.xlsx
    objective_ids: [ex-10-o1, ex-10-o2, ex-10-o3]
  - id: ex-10-e03
    title: "Caso · E03 Contables Pacífico (Excel)"
    kind: file
    file: materials/casos/ex-10/ex-10-E03-contables-pacifico.xlsx
    objective_ids: [ex-10-o1, ex-10-o2, ex-10-o3]
  - id: ex-10-e04
    title: "Caso · E04 Sabores del Puerto (Excel)"
    kind: file
    file: materials/casos/ex-10/ex-10-E04-sabores-del-puerto.xlsx
    objective_ids: [ex-10-o1, ex-10-o2, ex-10-o3]
  - id: ex-10-e05
    title: "Caso · E05 Transportes Sol Andino (Excel)"
    kind: file
    file: materials/casos/ex-10/ex-10-E05-transportes-sol-andino.xlsx
    objective_ids: [ex-10-o1, ex-10-o2, ex-10-o3]
  - id: ex-10-e06
    title: "Caso · E06 Constructora Los Pinos (Excel)"
    kind: file
    file: materials/casos/ex-10/ex-10-E06-constructora-los-pinos.xlsx
    objective_ids: [ex-10-o1, ex-10-o2, ex-10-o3]
  - id: ex-10-e07
    title: "Caso · E07 Clínica Santa Lucía (Excel)"
    kind: file
    file: materials/casos/ex-10/ex-10-E07-clinica-santa-lucia.xlsx
    objective_ids: [ex-10-o1, ex-10-o2, ex-10-o3]
  - id: ex-10-e08
    title: "Caso · E08 Colegio Amauta (Excel)"
    kind: file
    file: materials/casos/ex-10/ex-10-E08-colegio-amauta.xlsx
    objective_ids: [ex-10-o1, ex-10-o2, ex-10-o3]
  - id: ex-10-e09
    title: "Caso · E09 Taller Motor Rápido (Excel)"
    kind: file
    file: materials/casos/ex-10/ex-10-E09-taller-motor-rapido.xlsx
    objective_ids: [ex-10-o1, ex-10-o2, ex-10-o3]
  - id: ex-10-e10
    title: "Caso · E10 Agro Valle Verde (Excel)"
    kind: file
    file: materials/casos/ex-10/ex-10-E10-agro-valle-verde.xlsx
    objective_ids: [ex-10-o1, ex-10-o2, ex-10-o3]
cycle:
  - id: contexto
    title: "1 · Caso inicial"
    tool: lms
    phase: experiencia
    description: "Escena 1: la situación de la empresa y tu primer intento, antes de la explicación. Mira la relación de activos: ¿cuál pierde más valor cada año y cuál vale menos hoy? Ordénalos a ojo."
    check: "Hiciste tu primer intento y anotaste qué no cuadra"
  - id: juego
    title: "2 · Foro de reflexión"
    tool: lms
    phase: reflexion
    description: "Escena 2: juego «Memoria de tasas» y muro con tu reflexión: ¿Por qué el valor en libros no es lo que vale el activo en el mercado? Fuera de clase, en «Preguntas» de la sesión, comenta con un argumento la intervención de un compañero."
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
    description: "Escena 5: lista de comprobación, juego de repaso «Calcula la depreciación» y reflexión final: lo aprendido, lo corregido y su uso en tu trabajo."
    check: "Marcaste la lista, terminaste el juego y escribiste tu reflexión final"
  - id: evidencia
    title: "Evidencia del Módulo 3"
    tool: lms
    phase: experimentacion
    description: "Entrega en «Tareas» la evidencia del módulo: Archivo Excel con inventario, kardex y depreciación. Incluye una breve explicación de tus decisiones. Puedes corregir y volver a entregar después de la retroalimentación."
    check: "Entregaste la evidencia del módulo"
---

## Depreciación

Calculas la depreciación lineal de los activos fijos de tu empresa con la tasa de su categoría, la acumulada al 31/12/2026 y su valor en libros.

**Módulo 3 · Inventarios y activos empresariales (2 h)** · clase 3 de 3 · 40 minutos

| Paso de la ruta | Minutos | Qué haces |
|---|---|---|
| 1 · Caso inicial | 5 | Mira la relación de activos: ¿cuál pierde más valor cada año y cuál vale menos hoy? Ordénalos a ojo. |
| 2 · Foro de reflexión | 3 | Juego «Memoria de tasas» y tu reflexión en el muro |
| 3 · Lección y demostración | 9 | BUSCARX de la tasa, acumulada con MIN y valor en libros |
| 4 · Reto de aplicación | 20 | Depreciación al 31/12/2026 en la Hoja JMD con tu empresa |
| 5 · Retroalimentación y cierre | 3 | Lista de comprobación, juego «Calcula la depreciación» y reflexión final |

### El reto de aplicación (Hoja JMD)

1. Mira la hoja **Tasas**.
2. En **Activos**, trae la **tasa** con BUSCARX.
3. Calcula depreciación **anual**, **mensual** y **meses de uso**.
4. Calcula **acumulada** (con MIN) y **valor en libros**.
5. Pide a la IA que explique el valor en libros.

La **Hoja JMD** es una hoja de cálculo dentro del sistema, con los mismos datos del Excel de tu empresa: escribes fórmulas en español (SUMA, SUMAR.SI, SI, BUSCARX…), pulsas **✔ Revisar** y ves en verde lo que está bien. Con **✨ Simula tu escenario con IA** pides un caso nuevo con el mismo formato (por ejemplo, «una bodega con 3 trabajadores y ventas en dólares») y la hoja se recarga con esos datos. **⬇ Excel** descarga tu trabajo como .xlsx, con tus fórmulas.

### Pide ayuda a la IA (DeepSeek Harness)

> Esta es mi hoja de depreciación al 31/12/2026. Revisa que cada tasa corresponda a su categoría, que la acumulada no pase del costo y explícame en palabras simples qué es el valor en libros.

La IA **revisa y explica**; el Excel lo haces tú. Los datos son ficticios: puedes pegarlos sin problema.

### Módulo 3 · Inventarios y activos empresariales en el ciclo de Kolb

- **Experiencia concreta:** Explorar movimientos de un almacén con diferencias de stock y una relación de activos.
- **Observación reflexiva:** Explicar en el foro las posibles causas de faltantes y errores de valorización.
- **Conceptualización abstracta:** Control de existencias, promedio ponderado móvil, vida útil, valor residual y depreciación lineal.
- **Experimentación activa:** Construir el inventario, actualizar el kardex con nuevas operaciones y elaborar el cuadro de depreciación.
- **Evidencia de aprendizaje:** Archivo Excel con inventario, kardex y depreciación.

**Proyecto integrador:** Sumas el inventario, el kardex y la depreciación de los activos de tu empresa. Usas la misma empresa en los seis módulos, hasta el dashboard final.

*Porcentajes máximos tributarios del art. 22 del Reglamento de la Ley del Impuesto a la Renta (edificaciones 5 %, vehículos 20 %, maquinaria 10 %, equipos de procesamiento de datos 25 %, otros bienes 10 %), usados como ejemplo. Didáctico: se cuenta desde el mes de adquisición.*

*Supuestos del caso:* periodo, régimen y criterios tributarios o laborales están escritos en la hoja «Instrucciones» de cada Excel. Son datos ficticios y reglas didácticas para que el ejercicio se pueda resolver y verificar.
