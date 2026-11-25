---
name: orquesta
description: "Usa tareas en segundo plano y un visor durable cuando el usuario pida ejecutar en paralelo, seguir subagentes, revisar estados o visualizar el flujo."
---

# Orquesta durable

DSH ya incluye `subagent`, `workflow` con `run_in_background`, `job_output`,
`job_kill` y progreso en vivo. Usa esos mecanismos nativos para una delegación
normal. Usa las herramientas de esta skill cuando haga falta un registro JSONL
portable, ejecutar un comando seguro o entregar un visor HTML independiente.

1. Lanza trabajos independientes juntos con `tarea_fondo`; elige `subagente` para
   trabajo de modelo y `comando` para argv sin shell dentro del workspace.
2. Conserva los IDs. Consulta una vez con `tarea_estado` o resume con
   `tareas_listar`; no hagas sondeo continuo.
3. Cancela solo si el usuario lo pide o el trabajo dejó de ser útil.
4. Al final usa `orquesta_visor`. El HTML contiene una instantánea y permite
   cargar `.orquesta/*.jsonl` para actualizarla.
5. Informa qué tareas terminaron, fallaron o fueron canceladas. Los tokens de
   subagentes pueden ser `null` porque DSH 0.2.1 no los publica en
   `subagent/end`; no inventes cifras ni costos.
