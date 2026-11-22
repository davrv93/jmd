// Identidad de los cursos en el portal del alumno: nombres de área, fechas en hora de Lima, el enlace de
// WhatsApp para pedir inscripción y el avance de un curso. Lo comparten Inicio, Mis cursos, Catálogo y
// la página del curso.
import type { Course, CursoMarca, Identidad } from "~/lib/api";

export const LIMA = "America/Lima";

/** Áreas de curso (agenda.area) en palabras del alumno. El orden es el del filtro del catálogo. */
export const AREAS: { id: string; nombre: string }[] = [
  { id: "agentica", nombre: "Agentes e IA" },
  { id: "diseno", nombre: "Diseño y video" },
  { id: "datos", nombre: "Datos y código" },
  { id: "requerimientos", nombre: "Requerimientos" },
  { id: "qa", nombre: "Pruebas y QA" },
  { id: "seguridad", nombre: "Seguridad" },
  { id: "infra", nombre: "Infraestructura" },
];
export const nombreArea = (a?: string) => AREAS.find((x) => x.id === a)?.nombre ?? "Otros";

/** Identidad por defecto en el navegador (la del servidor manda; esto cubre un API antiguo). */
const POR_AREA: Record<string, { color: string; icono: string }> = {
  agentica: { color: "violeta", icono: "bot" },
  diseno: { color: "magenta", icono: "palette" },
  datos: { color: "azul", icono: "chart" },
  seguridad: { color: "teal", icono: "shieldCheck" },
  qa: { color: "oliva", icono: "bug" },
  requerimientos: { color: "petroleo", icono: "target" },
  infra: { color: "pizarra", icono: "box" },
};
export function identidadDe(c: CursoMarca & { description?: string }): Identidad {
  const d = POR_AREA[c.area ?? ""] ?? { color: "indigo", icono: "sparkles" };
  return c.identidad ?? { color: d.color, icono: d.icono, frase: c.description ?? "", resultado: [] };
}

/** «Claude Code PRO» de «🎮 Claude Code PRO · Grupo 2» cuando el API no trae nombre. */
export function nombreDe(c: CursoMarca & { title?: string }): string {
  if (c.nombre) return c.nombre;
  const seg = (c.title ?? "").split(" · ").filter((x) => !/^(grupo|clase|sesi[oó]n)\s+\S+$/i.test(x.trim()));
  return seg.join(" · ").replace(/\p{Extended_Pictographic}️?/gu, "").trim();
}

/** Semilla estable para la portada generada (FNV-1a). */
export function semilla(s: string): number {
  let h = 0x811c9dc5;
  for (const ch of s) {
    h ^= ch.codePointAt(0)!;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

const F_DIA = new Intl.DateTimeFormat("es-PE", { timeZone: LIMA, weekday: "short", day: "numeric", month: "short" });
const F_CORTA = new Intl.DateTimeFormat("es-PE", { timeZone: LIMA, day: "numeric", month: "short" });
const F_HORA = new Intl.DateTimeFormat("es-PE", { timeZone: LIMA, hour: "numeric", minute: "2-digit" });
const F_MES = new Intl.DateTimeFormat("es-PE", { timeZone: LIMA, month: "short" });
const F_LARGA = new Intl.DateTimeFormat("es-PE", { timeZone: LIMA, weekday: "long", day: "numeric", month: "long" });
const sinPunto = (s: string) => s.replace(/\./g, "");
/** «dom 30 nov» */
export const fDia = (iso: string | number | Date) => sinPunto(F_DIA.format(new Date(iso)));
/** «30 nov» */
export const fCorta = (iso: string | number | Date) => sinPunto(F_CORTA.format(new Date(iso)));
/** «7:30 p. m.» */
export const fHora = (iso: string | number | Date) => F_HORA.format(new Date(iso));
/** «nov» */
export const fMes = (iso: string | number | Date) => sinPunto(F_MES.format(new Date(iso)));
/** «domingo 30 de noviembre» */
export const fLarga = (iso: string | number | Date) => F_LARGA.format(new Date(iso));

/** «30 nov – 14 dic» (o una sola fecha). */
export function rangoFechas(inicio: string, fin: string): string {
  const a = fCorta(inicio), b = fCorta(fin);
  return a === b ? a : `${a} – ${b}`;
}

/** Cuenta regresiva en palabras: «en 2 h 15 min», «en 3 días», «mañana». */
export function faltan(ms: number): string {
  if (ms <= 0) return "ahora";
  const min = Math.round(ms / 60e3);
  if (min < 60) return `en ${Math.max(1, min)} min`;
  const h = Math.floor(min / 60), m = min % 60;
  if (h < 24) return m ? `en ${h} h ${m} min` : `en ${h} h`;
  const d = Math.round(ms / 86400e3);
  return d === 1 ? "mañana" : `en ${d} días`;
}

/** WhatsApp de JMD Learning para inscribirse cuando el grupo no tiene inscripción abierta. */
export const WHATSAPP = "51986149476";
export function whatsappInscripcion(nombre: string, grupo: string, inicio?: string): string {
  const cuando = inicio ? `, que empieza el ${fLarga(inicio)}` : "";
  const texto = inicio
    ? `Hola, quiero inscribirme en «${nombre}${grupo ? ` · ${grupo}` : ""}»${cuando}.`
    : `Hola, me interesa «${nombre}». ¿Cuándo empieza el próximo grupo?`;
  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(texto)}`;
}

/** Estados de una tarea que cuentan como entregada. */
export const ENTREGADA = new Set(["queued", "running", "graded", "failed"]);

/** Sesiones hechas (todos los pasos marcados) y tareas entregadas de un curso. */
export function avanceCurso(c: Course, totalSesiones?: number) {
  const ls = c.modules.flatMap((m) => m.lessons).filter((l) => l.published);
  const hechas = ls.filter((l) => l.steps > 0 && l.steps_done >= l.steps).length;
  const tareas = c.assignments.length;
  const entregadas = c.assignments.filter((a) => ENTREGADA.has(a.status)).length;
  return { sesiones: Math.max(totalSesiones ?? 0, ls.length), hechas, tareas, entregadas };
}
