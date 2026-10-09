// Cliente del API del LMS (/api/v1). Solo corre en el navegador; en el build estático no se llama.

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
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
    throw new ApiError(res.status, e.code ?? "error", e.message ?? `HTTP ${res.status}`);
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
}
export interface LessonSummary {
  id: string;
  title: string;
  starts_at: string | null;
  published: boolean;
  objectives: number;
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
}
export interface Material {
  id: string;
  title: string;
  kind: string;
  url: string;
  objective_ids: string[];
}
export interface CycleStep {
  id: string;
  title: string;
  tool: string;
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
export interface CourseProgress {
  course_id: string;
  lessons: { id: string; title: string; steps: number }[];
  students: { id: string; name: string; email: string; cohorts: string[]; lessons: Record<string, number> | null }[];
}

export const api = {
  config: () => req<AuthConfig>("GET", "/api/v1/auth/config"),
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
  grade: (id: string, score: number, feedback_md: string) => req<Submission>("POST", `/api/v1/submissions/${encodeURIComponent(id)}/grade`, { score, feedback_md }),
  grades: (course?: string) => req<Grade[]>("GET", `/api/v1/grades${course ? `?course=${encodeURIComponent(course)}` : ""}`),
  questions: (lesson: string) => req<Question[]>("GET", `/api/v1/lessons/${encodeURIComponent(lesson)}/questions`),
  ask: (lesson: string, b: { body_md: string; objective_id?: string; video_ts?: number }) =>
    req<{ id: string; url: string }>("POST", `/api/v1/lessons/${encodeURIComponent(lesson)}/questions`, b),
  answer: (q: string, body_md: string) => req<Question>("POST", `/api/v1/questions/${encodeURIComponent(q)}/answers`, { body_md }),
  resolve: (q: string, resolved: boolean) => req<Question>("POST", `/api/v1/questions/${encodeURIComponent(q)}/resolve`, { resolved }),
  courseProgress: (id: string) => req<CourseProgress>("GET", `/api/v1/courses/${encodeURIComponent(id)}/progress`),
};

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

export const TOOLS: Record<string, { icon: string; label: string }> = {
  zoom: { icon: "🎥", label: "Zoom" },
  lectura: { icon: "📖", label: "Lectura" },
  vscode: { icon: "🧩", label: "VS Code" },
  docker: { icon: "🐳", label: "Docker" },
  terminal: { icon: "⌨️", label: "Terminal" },
  jmd: { icon: "🛰️", label: "jmd" },
  "claude-code": { icon: "🤖", label: "Claude Code" },
  opencode: { icon: "🤖", label: "OpenCode" },
  git: { icon: "🌿", label: "git" },
  lms: { icon: "🎓", label: "LMS" },
};

export const KINDS: Record<string, string> = {
  link: "enlace", doc: "documentación", repo: "repositorio", video: "vídeo", slides: "diapositivas", pdf: "PDF", note: "nota",
};

export const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "pendiente", cls: "" },
  overdue: { label: "vencida", cls: "bad" },
  queued: { label: "entregada · en cola", cls: "warn" },
  running: { label: "revisando", cls: "warn" },
  graded: { label: "calificada", cls: "ok" },
  failed: { label: "falló", cls: "bad" },
};
