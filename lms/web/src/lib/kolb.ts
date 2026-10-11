// Ciclo de aprendizaje experiencial de Kolb: las cuatro fases con las que el LMS organiza cada
// sesión. Es la metodología formal del curso (ver content/README.md).
//
//  1. Experiencia concreta      → vivir la clase (ver, instalar, ejecutar, construir)
//  2. Observación reflexiva     → mirar qué pasó (revisar, probar, preguntar)
//  3. Conceptualización abstracta → entender el porqué (leer, escribir el plan o la skill)
//  4. Experimentación activa    → aplicarlo en real (entregar, desplegar)
//
// La fase de cada paso viene de `cycle[].phase` en el contenido; si falta, se deduce del tool y
// del id con `phaseOf`. El orden de las fases es siempre el de Kolb, no el del archivo.

import type { CycleStep } from "./api";

export type PhaseId = "experiencia" | "reflexion" | "conceptualizacion" | "experimentacion";

export interface KolbPhase {
  id: PhaseId;
  n: number;
  /** Nombre completo de la fase en Kolb. */
  name: string;
  /** Etiqueta corta para la UI. */
  short: string;
  /** Verbo en imperativo que ve el alumno. */
  verb: string;
  description: string;
  icon: string;
  /** Sufijo de token CSS de color (--ph-<token>). */
  token: string;
}

export const PHASES: KolbPhase[] = [
  {
    id: "experiencia",
    n: 1,
    name: "Experiencia concreta",
    short: "Experiencia",
    verb: "Vívelo",
    description: "Asiste, instala y ejecuta: entra en contacto con la clase.",
    icon: "play",
    token: "ec",
  },
  {
    id: "reflexion",
    n: 2,
    name: "Observación reflexiva",
    short: "Reflexión",
    verb: "Reflexiona",
    description: "Mira qué pasó, prueba, anota y pregunta.",
    icon: "eye",
    token: "or",
  },
  {
    id: "conceptualizacion",
    n: 3,
    name: "Conceptualización abstracta",
    short: "Conceptos",
    verb: "Entiende el porqué",
    description: "Lee la documentación y da forma a la idea: el plan, la skill.",
    icon: "book",
    token: "ca",
  },
  {
    id: "experimentacion",
    n: 4,
    name: "Experimentación activa",
    short: "Aplicación",
    verb: "Aplícalo",
    description: "Llévalo a un caso real: entrega y despliega.",
    icon: "zap",
    token: "ea",
  },
];

export const PHASE_BY_ID: Record<string, KolbPhase> = Object.fromEntries(PHASES.map((p) => [p.id, p]));

// Pistas por herramienta y por id para deducir la fase cuando el contenido no la trae.
const TOOL_PHASE: Record<string, PhaseId> = {
  zoom: "experiencia",
  video: "experiencia",
  vscode: "experiencia",
  docker: "experiencia",
  terminal: "experiencia",
  opencode: "experiencia",
  "claude-code": "experiencia",
  jmd: "experiencia",
  lectura: "conceptualizacion",
  lms: "reflexion",
  git: "experimentacion",
};

const ID_PHASE: [RegExp, PhaseId][] = [
  [/^(ver|asistir|instalar|ejecutar|construir|practicar|relevar|afiliar|webhook|bot|evolution|bandeja|ollama|skills|opencode|docker|vscode)/, "experiencia"],
  [/^(reflex|revis|probar|pruebas|anotar|preguntar|responder|voz|imagen)/, "reflexion"],
  [/^(plan|skill|wireframe|leer|documenta|concepto|disena|diseñar)/, "conceptualizacion"],
  [/^(entregar|desplegar|publicar|aplicar|subir)/, "experimentacion"],
];

/** Fase de un paso: la explícita si es válida; si no, deducida del tool, del id y de la posición. */
export function phaseOf(step: Pick<CycleStep, "id" | "tool" | "phase">, index: number, total: number): KolbPhase {
  if (step.phase && PHASE_BY_ID[step.phase]) return PHASE_BY_ID[step.phase];

  const tool = (step.tool || "").toLowerCase();
  const id = (step.id || "").toLowerCase();
  for (const [re, phase] of ID_PHASE) if (re.test(id)) return PHASE_BY_ID[phase];
  if (TOOL_PHASE[tool]) return PHASE_BY_ID[TOOL_PHASE[tool]];

  // Sin pistas: reparto por posición en el recorrido (arranque = experiencia, cierre = aplicación).
  const r = total > 1 ? index / (total - 1) : 0;
  if (r < 0.25) return PHASE_BY_ID.experiencia;
  if (r < 0.6) return PHASE_BY_ID.reflexion;
  if (r < 0.85) return PHASE_BY_ID.conceptualizacion;
  return PHASE_BY_ID.experimentacion;
}

export interface PhaseGroup {
  phase: KolbPhase;
  steps: { step: CycleStep; index: number }[];
  done: number;
  total: number;
}

/** Agrupa los pasos por fase, en el orden de Kolb. Cada grupo conserva el orden original. */
export function groupByPhase(steps: CycleStep[], doneMap?: Record<string, string | null>): PhaseGroup[] {
  const total = steps.length;
  return PHASES.map((phase) => ({ phase, steps: [] as { step: CycleStep; index: number }[], done: 0, total: 0 }))
    .map((g) => {
      steps.forEach((step, index) => {
        if (phaseOf(step, index, total).id === g.phase.id) {
          g.steps.push({ step, index });
          g.total++;
          if (doneMap && doneMap[step.id]) g.done++;
        }
      });
      return g;
    });
}

/** Porcentaje global de un ciclo (pasos hechos / totales). */
export function cyclePct(done: number, total: number): number {
  return total > 0 ? Math.round((100 * done) / total) : 0;
}
