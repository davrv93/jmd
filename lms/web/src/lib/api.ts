// Cliente del API del LMS (/api/v1). Solo corre en el navegador; en el build estático no se llama.

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    // cuerpo completo de la respuesta (p. ej. {numero} del sorteo en un 409)
    public extra: unknown = null,
  ) {
    super(message);
  }
}

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    credentials: "same-origin",
    headers: body !== undefined ? { "Content-Type": "application/json" } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    const e = data?.error ?? {};
    throw new ApiError(res.status, e.code ?? "error", e.message ?? `HTTP ${res.status}`, data);
  }
  return data as T;
}

export interface Me {
  id: string;
  email: string;
  name: string;
  roles: string[];
  cohorts: string[];
  provider: string;
}
export interface AuthConfig {
  local: boolean;
  register: boolean;
  oidc: boolean;
  issuer?: string;
}
export interface CourseSummary {
  id: string;
  slug: string;
  title: string;
  role: string;
  description: string;
  lessons_total: number;
  lessons_published: number;
  examples_total?: number;
}
export interface LessonSummary {
  id: string;
  title: string;
  starts_at: string | null;
  published: boolean;
  objectives: number;
  /** Títulos de los objetivos («Al terminar podrás…»). */
  objetivos?: string[];
  steps: number;
  steps_done: number;
}
export interface AssignmentSummary {
  id: string;
  title: string;
  due_at: string | null;
  status: string;
  lesson_id: string;
  max_score: number;
  score?: number | null;
  submission_id?: string;
}
export interface Course {
  id: string;
  slug: string;
  title: string;
  description: string;
  role: string;
  modules: { id: string; title: string; lessons: LessonSummary[] }[];
  assignments: AssignmentSummary[];
  examples_total?: number;
  /** Ficha del curso (opcionales en el contenido). */
  proyecto_final?: string;
  requisitos?: string[];
  dedicacion?: string;
}
export interface ExampleSummary {
  id: string;
  title: string;
  summary: string;
  tags: string[];
  level: string;
  /** Fase del ciclo de Kolb a la que pertenece el ejemplo (opcional). */
  phase?: string;
  lesson_id: string;
  lesson_title: string;
  repo: { url: string; ref: string } | null;
  published: boolean;
}
export interface Example extends ExampleSummary {
  content_html: string;
  course: { id: string; slug: string; title: string };
  prev: string;
  next: string;
}
export interface Material {
  id: string;
  title: string;
  kind: string;
  url: string;
  objective_ids: string[];
  slides?: string[] | null;
}
export interface CycleStep {
  id: string;
  title: string;
  tool: string;
  /** Fase del ciclo de Kolb: experiencia · reflexion · conceptualizacion · experimentacion.
   *  Opcional en el contenido; si falta, se deduce con kolb.ts. */
  phase?: string;
  description: string;
  check: string;
}
export interface Progress {
  steps: Record<string, string | null>;
  done: number;
  total: number;
}
export interface Lesson {
  id: string;
  title: string;
  starts_at: string | null;
  published: boolean;
  course: { id: string; slug: string; title: string };
  module: { id: string; title: string };
  objectives: { id: string; title: string }[];
  recording: { url: string; passcode?: string } | null;
  repo: { url: string; ref: string } | null;
  materials: Material[];
  cycle: CycleStep[];
  content_html: string;
  progress: Progress;
  assignments: { id: string; title: string; due_at: string | null }[];
  open_command: string;
  prev: string;
  next: string;
}
export interface Submission {
  id: string;
  assignment_id: string;
  user_id: string;
  user?: string;
  status: string;
  repo_url: string;
  commit_sha: string;
  notes: string;
  score: number | null;
  max_score: number;
  feedback_md: string;
  created_at: string;
  graded_at: string | null;
  /** Calificación por criterio de la rúbrica (vacía = solo nota global). */
  rubrica?: CriterioCalificado[];
}
export interface CriterioCalificado {
  criterio: string;
  nivel: number;
  titulo: string;
  puntos: number;
  max: number;
  /** Título del nivel más alto: lo que falta para lograr el criterio. */
  mejor: string;
  nota?: string;
}
export interface Assignment {
  id: string;
  title: string;
  description_md: string;
  description_html: string;
  due_at: string | null;
  rubric: { criterion: string; levels: { title: string; points: number }[] }[];
  autograde: boolean;
  max_score: number;
  lesson_id: string;
  lesson_title: string;
  course_id: string;
  status: string;
  my_submissions: Submission[];
  submit_command: string;
}
export interface Grade {
  assignment_id: string;
  title: string;
  course_id: string;
  status: string;
  score: number | null;
  max_score: number;
  graded_at: string | null;
  feedback_md: string;
  rubrica?: CriterioCalificado[];
}
export interface RunResult {
  stdout: string;
  stderr: string;
  exit_code: number;
  duration_ms: number;
  timed_out: boolean;
}
export interface LinkItem extends Material {
  lesson_id: string;
  lesson_title: string;
  course_id: string;
  course_title: string;
}
export interface Answer {
  id: string;
  user_id: string;
  user_name: string;
  body_md: string;
  created_at: string;
}
export interface Question {
  id: string;
  lesson_id: string;
  objective_id: string;
  user_id: string;
  user_name: string;
  body_md: string;
  code_ref: { path: string; line: number } | null;
  video_ts: number;
  resolved: boolean;
  created_at: string;
  answers: Answer[];
}
export interface LlmStatus {
  enabled: boolean;
  model: string;
}
export interface LlmConfig {
  url: string;
  model: string;
  enabled: boolean;
  key_set: boolean;
  key_hint: string;
}
export interface LlmTest {
  ok: boolean;
  status: number;
  ms: number;
  model: string;
  detail: string;
}
export interface CertConfig {
  emisor: string;
  ruc: string;
  instructor: string;
  cargo: string;
  url: string;
}
/** Ficha de un certificado. La verificación pública (estado no_existe) solo trae codigo y estado. */
export interface Certificate {
  codigo: string;
  estado: "valido" | "anulado" | "no_existe";
  alumno?: string;
  curso?: string;
  course_id?: string;
  tipo?: "participacion" | "aprobacion";
  tipo_texto?: string;
  horas?: number;
  emisor?: string;
  ruc?: string;
  instructor?: string;
  cargo?: string;
  emitido_en?: string;
  anulado_en?: string | null;
  url_verificar?: string;
  url_pdf?: string;
  url_badge?: string;
  url_badge_jwt?: string;
  url_insignia?: string;
  url_insignia_png?: string;
  // Ámbito: «curso» (certificado del curso completo) o «clase» (insignia de clase).
  ambito?: "curso" | "clase";
  lesson_id?: string;
  clase?: string; // «Clase 1 · …»
  clase_num?: number;
  // Solo personal o el propio alumno.
  user_id?: string;
  nota?: string;
  emitido_por?: string;
}
/** Resultado de una emisión en lote. */
export interface LoteResult {
  course_id: string;
  lesson_id: string;
  emitidos: { codigo: string; alumno: string; user_id: string; email: string }[];
  omitidos: { alumno: string; user_id: string; email: string; motivo: string; codigo?: string }[];
}
export interface CourseProgress {
  course_id: string;
  lessons: { id: string; title: string; steps: number }[];
  students: { id: string; name: string; email: string; cohorts: string[]; lessons: Record<string, number> | null }[];
}

export interface Sorteo {
  id: string;
  titulo: string;
  subtitulo: string;
  descripcion: string;
  flyer: string;
  max_ganadores: number;
  inicia: string;
  termina: string;
  abierto: boolean;
  participantes: number;
  ganadores: { nombre: string; correo: string; posicion: number; numero: number; codigo?: string }[];
  quedan: number;
  /** Enlace de registro que ofrece la página («¡Inscríbete ya!»); "" si no hay. */
  inscripcion?: string;
  /** Vía de inscripción por WhatsApp: número (solo dígitos), el mismo en bonito y el enlace wa.me. */
  whatsapp?: string;
  whatsapp_bonito?: string;
  whatsapp_url?: string;
  /** El horario del taller, ya redactado (p. ej. «Clases 8, 10 y 11 de noviembre · 9:30 a 10:45 pm»). */
  fechas_texto?: string;
}

// Aviso de sorteo que la inscripción devuelve cuando el cupo queda jugado ahí mismo.
export interface SorteoAviso {
  id: string;
  titulo: string;
  numero: number;
  /** Código de varios caracteres del ticket (MT-XXXXXX), estable desde que se anotó. */
  codigo?: string;
  ganador?: boolean;
}
export interface Inscripcion {
  grupo: string;
  nombre: string;
  cursos: { id: string; slug: string; title: string; description: string; requisitos?: string[]; proyecto_final?: string; fechas: string[] }[];
  /** Vacantes gratuitas del grupo (si el grupo las tiene). Agotadas, la inscripción queda pendiente de pago. */
  cupos?: { total: number; ocupados: number; quedan: number };
  whatsapp?: string;
}
/** Respuesta de inscribirse/unirse cuando ya no quedaban vacantes gratuitas. */
export interface PendientePago { pendiente_pago?: boolean; mensaje?: string; whatsapp?: string }

export interface TicketSorteo {
  estado: "ganador" | "no_ganador";
  numero: number;
  /** Código de varios caracteres del ticket (MT-XXXXXX). */
  codigo?: string;
  nombre?: string;
}

export const api = {
  config: () => req<AuthConfig>("GET", "/api/v1/auth/config"),
  inscripcion: (grupo: string) => req<Inscripcion>("GET", `/api/v1/inscripcion/${encodeURIComponent(grupo)}`),
  inscribirse: (grupo: string, b: { name: string; email: string; password: string }) =>
    req<{ token: string; user: Me; cursos: string[]; sorteo?: SorteoAviso } & PendientePago>("POST", `/api/v1/inscripcion/${encodeURIComponent(grupo)}`, b),
  unirse: (grupo: string) => req<{ grupo: string; cohorts: string[]; cursos: string[]; sorteo?: SorteoAviso } & PendientePago>("POST", `/api/v1/inscripcion/${encodeURIComponent(grupo)}/unirme`, {}),
  sorteo: (id: string) => req<Sorteo>("GET", `/api/v1/sorteo/${encodeURIComponent(id)}`),
  /** Qué fue de un ticket: número (4964) o código de varios caracteres (MT-7Q4XZP).
   *  Responde ganador / no_ganador; 404 si ese ticket no participó. */
  ticketSorteo: (id: string, valor: string | number) =>
    req<TicketSorteo>("GET", `/api/v1/sorteo/${encodeURIComponent(id)}/ticket/${encodeURIComponent(String(valor))}`),
  participarSorteo: (id: string, email: string) =>
    req<{ ok: boolean; participantes: number; numero?: number; codigo?: string }>("POST", `/api/v1/sorteo/${encodeURIComponent(id)}/participar`, { email }),
  sortear: (id: string, cantidad?: number) =>
    req<{ ganadores: { nombre: string; correo: string; posicion: number; numero: number; codigo?: string }[]; quedan: number }>("POST", `/api/v1/sorteo/${encodeURIComponent(id)}/sortear`, { cantidad: cantidad || 0 }),
  login: (email: string, password: string) => req<{ token: string; user: Me }>("POST", "/api/v1/auth/login", { email, password, label: "web" }),
  register: (b: { email: string; name: string; password: string; invite_code: string }) => req<{ token: string; user: Me }>("POST", "/api/v1/auth/register", b),
  logout: () => req<{ ok: boolean; end_session_url?: string }>("POST", "/api/v1/auth/logout", {}),
  me: () => req<Me>("GET", "/api/v1/me"),
  courses: () => req<CourseSummary[]>("GET", "/api/v1/courses"),
  course: (id: string) => req<Course>("GET", `/api/v1/courses/${encodeURIComponent(id)}`),
  lesson: (id: string) => req<Lesson>("GET", `/api/v1/lessons/${encodeURIComponent(id)}`),
  setProgress: (lesson: string, step: string, done: boolean) =>
    req<Progress>("PUT", `/api/v1/lessons/${encodeURIComponent(lesson)}/progress/${encodeURIComponent(step)}`, { done }),
  links: (course?: string) => req<LinkItem[]>("GET", `/api/v1/links${course ? `?course=${encodeURIComponent(course)}` : ""}`),
  assignment: (id: string) => req<Assignment>("GET", `/api/v1/assignments/${encodeURIComponent(id)}`),
  submit: (id: string, b: { repo_url: string; commit_sha: string; notes?: string }) =>
    req<{ id: string; status: string }>("POST", `/api/v1/assignments/${encodeURIComponent(id)}/submissions`, b),
  submissions: (id: string) => req<Submission[]>("GET", `/api/v1/assignments/${encodeURIComponent(id)}/submissions`),
  grade: (id: string, score: number, feedback_md: string, criterios?: { nivel: number; nota?: string }[]) =>
    req<Submission>("POST", `/api/v1/submissions/${encodeURIComponent(id)}/grade`, { score, feedback_md, ...(criterios ? { criterios } : {}) }),
  grades: (course?: string) => req<Grade[]>("GET", `/api/v1/grades${course ? `?course=${encodeURIComponent(course)}` : ""}`),
  questions: (lesson: string) => req<Question[]>("GET", `/api/v1/lessons/${encodeURIComponent(lesson)}/questions`),
  ask: (lesson: string, b: { body_md: string; objective_id?: string; video_ts?: number }) =>
    req<{ id: string; url: string }>("POST", `/api/v1/lessons/${encodeURIComponent(lesson)}/questions`, b),
  answer: (q: string, body_md: string) => req<Question>("POST", `/api/v1/questions/${encodeURIComponent(q)}/answers`, { body_md }),
  resolve: (q: string, resolved: boolean) => req<Question>("POST", `/api/v1/questions/${encodeURIComponent(q)}/resolve`, { resolved }),
  examples: (course: string) => req<ExampleSummary[]>("GET", `/api/v1/courses/${encodeURIComponent(course)}/examples`),
  example: (id: string) => req<Example>("GET", `/api/v1/examples/${encodeURIComponent(id)}`),
  run: (language: string, code: string) => req<RunResult>("POST", "/api/v1/run", { language, code }),
  generate: (prompt: string) => req<{ html: string }>("POST", "/api/v1/generate", { prompt }),
  courseProgress: (id: string) => req<CourseProgress>("GET", `/api/v1/courses/${encodeURIComponent(id)}/progress`),
  // IA del Estudio: estado para cualquier usuario; configuración y prueba solo para el admin.
  llmStatus: () => req<LlmStatus>("GET", "/api/v1/llm/status"),
  llmConfig: () => req<LlmConfig>("GET", "/api/v1/admin/llm"),
  saveLlm: (b: { url: string; model: string; enabled: boolean; key?: string }) => req<LlmConfig>("PUT", "/api/v1/admin/llm", b),
  testLlm: (b: { url?: string; model?: string; key?: string }) => req<LlmTest>("POST", "/api/v1/admin/llm/test", b),
  // Certificados: ajustes del emisor (admin), emisión y lista (personal), los míos (alumno) y
  // verificación pública sin sesión.
  certConfig: () => req<CertConfig>("GET", "/api/v1/admin/certificados/config"),
  saveCertConfig: (b: CertConfig) => req<CertConfig>("PUT", "/api/v1/admin/certificados/config", b),
  certificados: (course: string) => req<Certificate[]>("GET", `/api/v1/admin/certificados?course=${encodeURIComponent(course)}`),
  emitirCertificado: (b: { user_id: string; course_id: string; lesson_id?: string; tipo: string; horas: number; nota?: string }) =>
    req<Certificate>("POST", "/api/v1/admin/certificados", b),
  emitirLote: (b: { course_id: string; lesson_id?: string; tipo: string; horas: number; nota?: string; solo_con_progreso: boolean }) =>
    req<LoteResult>("POST", "/api/v1/admin/certificados/lote", b),
  anularCertificado: (codigo: string) => req<Certificate>("POST", `/api/v1/admin/certificados/${encodeURIComponent(codigo)}/anular`, {}),
  misCertificados: () => req<Certificate[]>("GET", "/api/v1/certificados"),
  // Nombre completo y correo que el alumno confirma para su certificado.
  misDatosCert: () => req<DatosCert>("GET", "/api/v1/mis-datos-certificado"),
  guardarDatosCert: (b: { nombre: string; correo: string }) => req<DatosCert>("PUT", "/api/v1/mis-datos-certificado", b),
  verificar: (codigo: string) => req<Certificate>("GET", `/api/v1/verificar/${encodeURIComponent(codigo)}`),
  // Modo LIVE de una clase: estado, control del instructor y lectura del alumno.
  liveActivas: () => req<{ lesson_id: string; titulo: string }[]>("GET", "/api/v1/live"),
  liveEstado: (lesson: string) => req<LiveEstado>("GET", `/api/v1/live/${encodeURIComponent(lesson)}`),
  liveIniciar: (lesson: string) => req<LiveEstado>("POST", `/api/v1/live/${encodeURIComponent(lesson)}/iniciar`, {}),
  liveCerrar: (lesson: string) => req<LiveEstado>("POST", `/api/v1/live/${encodeURIComponent(lesson)}/cerrar`, {}),
  liveEscenas: (lesson: string) => req<EscenaLive[]>("GET", `/api/v1/live/${encodeURIComponent(lesson)}/escenas`),
  liveEscena: (lesson: string, escena: string, visible: boolean, extra?: { parametro?: string }) =>
    req<LiveEstado>("PUT", `/api/v1/live/${encodeURIComponent(lesson)}/escena`, { escena, visible, ...extra }),
  liveCompuerta: (lesson: string) => req<CompuertaLive>("GET", `/api/v1/live/${encodeURIComponent(lesson)}/compuerta`),
  livePasarIgual: (lesson: string, escena: string) =>
    req<{ ok: boolean }>("POST", `/api/v1/live/${encodeURIComponent(lesson)}/pasar-igual`, { escena }),
  liveMensaje: (lesson: string, texto: string, para = "todos") =>
    req<{ ok: boolean }>("POST", `/api/v1/live/${encodeURIComponent(lesson)}/mensaje`, { texto, para }),
  liveEmparejar: (lesson: string) =>
    req<{ grupos: { Sub: string; Nombre: string }[][] }>("POST", `/api/v1/live/${encodeURIComponent(lesson)}/emparejar`, {}),
  livePareja: (lesson: string) => req<ParejaLive>("GET", `/api/v1/live/${encodeURIComponent(lesson)}/pareja`),
  liveLatido: (lesson: string, escena: string) =>
    req<{ ok: boolean }>("POST", `/api/v1/live/${encodeURIComponent(lesson)}/latido`, { escena }),
  liveEvento: (lesson: string, tipo: "terminal" | "agente" | "visor" | "error", detalle = "") =>
    req<{ ok: boolean }>("POST", `/api/v1/live/${encodeURIComponent(lesson)}/evento`, { tipo, detalle }),
  vistaProyectos: () => req<{ ruta: string; nombre: string; mod: number }[]>("GET", "/api/v1/vista/proyectos"),
  // dir: carpeta (un segmento) del proyecto que se mira; vacío = todo /trabajo.
  vistaVersion: (dir = "") => req<{ version: string; t: string }>("GET", "/api/v1/vista/version" + (dir ? `?dir=${encodeURIComponent(dir)}` : "")),
  liveEvidencia: (lesson: string, escena: string, tipo: "microfono" | "flyer" | "hallazgo" | "captura", detalle = "") =>
    req<{ ok: boolean }>("POST", `/api/v1/live/${encodeURIComponent(lesson)}/evidencia`, { escena, tipo, detalle }),
  liveLogre: (lesson: string, escena: string, hecho: boolean) =>
    req<{ ok: boolean; puntos?: number; suma?: number }>("POST", `/api/v1/live/${encodeURIComponent(lesson)}/logre`, { escena, hecho }),
  liveLogres: (lesson: string) => req<{ escenas: string[]; puntos?: number; suma?: number }>("GET", `/api/v1/live/${encodeURIComponent(lesson)}/logre`),
  liveModo: (lesson: string, modo: "guiado" | "libre") =>
    req<LiveEstado>("PUT", `/api/v1/live/${encodeURIComponent(lesson)}/modo`, { modo }),
  // Votos y muro de una escena del LIVE (en memoria en el servidor; el instructor los puede vaciar).
  liveVotosReiniciar: (lesson: string, escena: string) =>
    req<{ total: number }>("DELETE", `/api/v1/live/${encodeURIComponent(lesson)}/votos?escena=${encodeURIComponent(escena)}`),
  liveMuroVaciar: (lesson: string, escena: string) =>
    req<{ entradas: unknown[] }>("DELETE", `/api/v1/live/${encodeURIComponent(lesson)}/muro?escena=${encodeURIComponent(escena)}`),
  // Skills del alumno: cada cuenta guarda las suyas; las del curso son de solo lectura.
  misSkills: () => req<SkillResumen[]>("GET", "/api/v1/mis-skills"),
  miSkill: (nombre: string) => req<Skill>("GET", `/api/v1/mis-skills/${encodeURIComponent(nombre)}`),
  crearSkill: (cuerpo: string, modelo_destino: string) => req<Skill>("POST", "/api/v1/mis-skills", { cuerpo, modelo_destino }),
  saveSkill: (nombre: string, cuerpo: string, modelo_destino: string) =>
    req<Skill>("PUT", `/api/v1/mis-skills/${encodeURIComponent(nombre)}`, { cuerpo, modelo_destino }),
  deleteSkill: (nombre: string) => req<null>("DELETE", `/api/v1/mis-skills/${encodeURIComponent(nombre)}`, {}), // con cookie, las escrituras exigen JSON
  skillsCurso: () => req<SkillCurso[]>("GET", "/api/v1/skills-curso"),
  copiarSkill: (nombre: string, nuevo_nombre?: string) =>
    req<Skill>("POST", `/api/v1/mis-skills/${encodeURIComponent(nombre)}/copiar`, nuevo_nombre ? { nuevo_nombre } : {}),
  skillsDetectadas: () => req<{ nombres: string[] }>("GET", "/api/v1/mis-skills/detectadas"),
  importarSkill: (nombre: string) => req<Skill>("POST", "/api/v1/mis-skills/importar", { nombre }),
};

// Skill del alumno (GET /api/v1/mis-skills): la lista trae el resumen; el detalle, cuerpo y variantes.
export interface SkillResumen {
  nombre: string;
  descripcion: string;
  modelo_destino: string;
  version: number;
  origen: "propia" | "copiada" | "importada";
  compartida: boolean;
  actualizada_en: string;
}
export interface Skill extends SkillResumen {
  cuerpo: string;
  variantes: Record<string, string>;
}
export interface SkillCurso {
  nombre: string;
  descripcion: string;
  cuerpo: string;
}

// Alumno conectado, tal como lo ve el instructor en el evento `presencia`.
export interface PresenteLive {
  sub: string;
  nombre: string;
  escena: string;
  visto: string;
  semaforo: "verde" | "ambar" | "rojo" | "gris";
}

// Con quién le toca al alumno (evento `pareja` y GET /pareja).
export interface ParejaLive {
  con: { sub: string; nombre: string }[];
  vista: string;
}

// Compuerta de avance (GET /api/v1/live/{lesson}/compuerta): quién cumplió la escena actual.
export interface CompuertaLive {
  escena: string;
  umbral_pct: number;
  pct: number;
  pasa: boolean;
  cumplieron: { sub: string; nombre: string; motivo: "lo_logre" | "evidencia" }[];
  faltan: { sub: string; nombre: string; ultimo_evento: string; hace_s: number }[];
}

// Escena del modo LIVE (GET /api/v1/live/{lesson}/escenas): lo que declara su escena.yaml.
export interface EscenaLive {
  id: string;
  titulo: string;
  fase: string;
  paso: string;
  duracion_min: number;
  lo_logre: boolean;
  evidencia: string;
  umbral_pct: number;
  compuerta: string;
  comandos: { titulo: string; cmd: string }[] | null;
  tareas: { id: string; titulo: string }[] | null;
  orden: number;
}

// Estado del modo LIVE de una lección (GET /api/v1/live/{lesson} y evento «estado» del stream).
export interface LiveEstado {
  lesson_id: string;
  estado: "preparando" | "en_vivo" | "cerrada";
  escena: string;
  paso: string;
  visible: boolean;
  modo: "guiado" | "libre";
  mensaje: string;
  parametro?: string; // parámetro libre que el instructor manda a la escena (p. ej. el ánimo del avatar)
  iniciada_en: string | null;
  conectados: number;
  t: string;
}

export interface DatosCert {
  nombre: string;
  correo: string;
  completo: boolean;
  actualizado_en?: string;
  sugerido_nombre: string;
  sugerido_correo: string;
}

/** URL del CSV con el nombre completo y el correo de cada alumno para su certificado (personal). */
export function datosCertCsvUrl(cohort = ""): string {
  return "/api/v1/admin/certificados/datos.csv" + (cohort ? `?cohort=${encodeURIComponent(cohort)}` : "");
}

/** URL del CSV de exportación (personal): formato «generico» o «badgr» (Canvas Credentials). */
export function exportCsvUrl(course: string, lesson: string, formato: "generico" | "badgr" = "generico"): string {
  const f = formato === "badgr" ? "export-badgr.csv" : "export.csv";
  return `/api/v1/admin/certificados/${f}?course=${encodeURIComponent(course)}&lesson=${encodeURIComponent(lesson)}`;
}

/** PNG 600x600 de la insignia del curso o, con lesson, de la clase. */
export function insigniaPngUrl(course: string, lesson?: string): string {
  return `/api/v1/insignias/${encodeURIComponent(course)}${lesson ? `/${encodeURIComponent(lesson)}` : ""}.png`;
}

/** Enlace «Añadir a LinkedIn» (sección Licencias y certificaciones) con los datos del certificado. */
export function linkedinAddUrl(c: Certificate): string {
  const d = c.emitido_en ? new Date(c.emitido_en) : new Date();
  const p = new URLSearchParams({
    startTask: "CERTIFICATION_NAME",
    name: c.ambito === "clase" && c.clase ? `${c.clase} · ${c.curso ?? ""}` : (c.curso ?? ""),
    organizationName: c.emisor ?? "",
    issueYear: String(d.getFullYear()),
    issueMonth: String(d.getMonth() + 1),
    certUrl: c.url_verificar ?? "",
    certId: c.codigo,
  });
  return `https://www.linkedin.com/profile/add?${p.toString()}`;
}

export const CERT_TIPO: Record<string, string> = { participacion: "Participación", aprobacion: "Aprobación" };

/** Si el API dice 401, manda al login conservando a dónde iba. */
export function requireLogin(e: unknown): boolean {
  if (e instanceof ApiError && e.status === 401) {
    const next = location.pathname + location.search;
    location.href = `/?next=${encodeURIComponent(next)}`;
    return true;
  }
  return false;
}

export function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export function fmtDate(iso: string | null | undefined, withTime = true): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("es-PE", withTime ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" });
}

export const TOOLS: Record<string, string> = {
  zoom: "Zoom", lectura: "Lectura", vscode: "VS Code", docker: "Docker", terminal: "Terminal", jmd: "jmd",
  "claude-code": "Claude Code", opencode: "OpenCode", git: "git", lms: "LMS",
};

export const KINDS: Record<string, string> = {
  link: "enlace", doc: "documentación", repo: "repositorio", video: "vídeo", slides: "diapositivas", pdf: "PDF", note: "nota", file: "adjunto", zip: "adjunto .zip", pptx: "PowerPoint",
};

export const STATUS: Record<string, { label: string; cls: string; icon: string }> = {
  pending: { label: "Pendiente", cls: "", icon: "circle" },
  overdue: { label: "Vencida", cls: "bad", icon: "alert" },
  queued: { label: "Entregada", cls: "warn", icon: "send" },
  running: { label: "Revisando", cls: "warn", icon: "clock" },
  graded: { label: "Calificada", cls: "ok", icon: "checkCircle" },
  failed: { label: "Falló", cls: "bad", icon: "alert" },
};

export const LEVEL: Record<string, string> = { básico: "", intermedio: "accent", avanzado: "gold" };

/** Fecha relativa corta: «en 3 días», «hace 2 h». */
export function rel(iso: string | null | undefined): string {
  if (!iso) return "";
  const diff = new Date(iso).getTime() - Date.now();
  const abs = Math.abs(diff);
  const f = (n: number, u: string) => (diff >= 0 ? `en ${n} ${u}` : `hace ${n} ${u}`);
  if (abs < 3600e3) return f(Math.max(1, Math.round(abs / 60e3)), "min");
  if (abs < 86400e3) return f(Math.round(abs / 3600e3), "h");
  const d = Math.round(abs / 86400e3);
  return f(d, d === 1 ? "día" : "días");
}
