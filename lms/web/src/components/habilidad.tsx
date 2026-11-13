import { component$, useStyles$ } from "@builder.io/qwik";
import type { Certificate, Course, LessonSummary } from "~/lib/api";
import { Icon } from "./icon";

// Habilidades: el idioma común de lo que el alumno va ganando. Cada clase da una habilidad con su
// insignia (Open Badges) y el curso da el certificado. Una sola pieza visual, el hexágono, con tres
// estados que se leen igual en el inicio, en la clase y en Logros:
//   ganada   → oro lleno (la insignia ya es tuya)
//   camino   → violeta (la clase en la que estás)
//   pendiente→ contorno punteado (lo que te falta)

export type EstadoHab = "ganada" | "camino" | "pendiente";

export interface Habilidad {
  l: LessonSummary;
  num: number;
  titulo: string;
  objetivos: string[];
  cert?: Certificate;
  estado: EstadoHab;
}

export interface RutaHab {
  clases: Habilidad[];
  certCurso?: Certificate;
  ganadas: number;
}

/** «Grupo 8 · Clase 1 · Tu asistente…» → «Tu asistente…»: el grupo y el número ya se ven aparte. */
export function limpiarClase(t: string): string {
  const partes = t.split(" · ").filter((p) => !/^(grupo|clase|sesi[oó]n)\b\s*[\w-]*$/i.test(p.trim()));
  return (partes.length ? partes : [t]).join(" · ");
}

/** Las clases publicadas de un curso como habilidades, con su insignia si ya la tiene. */
export function rutaDe(c: Course, certs: Certificate[]): RutaHab {
  const vigentes = certs.filter((x) => x.course_id === c.id && x.estado === "valido");
  const lecciones = c.modules.flatMap((m) => m.lessons).filter((l) => l.published);
  let camino = false;
  const clases = lecciones.map((l, i): Habilidad => {
    const cert = vigentes.find((x) => x.ambito === "clase" && x.lesson_id === l.id);
    let estado: EstadoHab = "pendiente";
    if (cert) estado = "ganada";
    else if (!camino) [estado, camino] = ["camino", true];
    return { l, num: i + 1, titulo: limpiarClase(l.title), objetivos: l.objetivos ?? [], cert, estado };
  });
  return { clases, certCurso: vigentes.find((x) => x.ambito !== "clase"), ganadas: clases.filter((h) => h.cert).length };
}

export const HAB_CSS = `
.hex { position: relative; display: inline-grid; place-items: center; flex: none; width: var(--hx, 2.6rem); height: calc(var(--hx, 2.6rem) * 1.1); color: var(--faint); font-weight: 750; font-size: calc(var(--hx, 2.6rem) * .36); font-variant-numeric: tabular-nums; }
.hex > svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.hex polygon { fill: none; stroke: var(--line2); stroke-width: 2; stroke-dasharray: 3.5 3; stroke-linejoin: round; }
.hex > span { position: relative; display: grid; place-items: center; line-height: 1; }
.hex[data-e="camino"] { color: var(--accent); }
.hex[data-e="camino"] polygon { fill: var(--accent-bg); stroke: var(--accent); stroke-dasharray: none; }
.hex[data-e="ganada"] { color: var(--on-gold); }
.hex[data-e="ganada"] polygon { fill: var(--gold); stroke: var(--gold); stroke-dasharray: none; }
`;

/** El hexágono de una habilidad (o del certificado, con cert). */
export const Hex = component$((p: { estado: EstadoHab; n?: number; cert?: boolean; size?: string; titulo?: string }) => {
  useStyles$(HAB_CSS);
  const dentro = p.cert ? <Icon name="award" size={15} /> : p.estado === "ganada" ? <Icon name="check" size={15} /> : p.n;
  return (
    <span class="hex" data-e={p.estado} style={p.size ? `--hx:${p.size}` : undefined} role={p.titulo ? "img" : undefined} aria-label={p.titulo} aria-hidden={p.titulo ? undefined : "true"}>
      <svg viewBox="0 0 40 44" aria-hidden="true">
        <polygon points="20,2 37,11.5 37,32.5 20,42 3,32.5 3,11.5" />
      </svg>
      <span>{dentro}</span>
    </span>
  );
});

export const ESTADO_TXT: Record<EstadoHab, string> = { ganada: "Ganada", camino: "En camino", pendiente: "Por ganar" };
