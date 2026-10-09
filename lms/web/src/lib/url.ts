// Estado de la página en la URL (pestaña, diapositiva, filtros): sobrevive a F5 y se puede
// compartir. Se escribe con replaceState para no llenar el historial.

export function getParam(name: string): string {
  if (typeof location === "undefined") return "";
  return new URLSearchParams(location.search).get(name) ?? "";
}

export function setParams(values: Record<string, string | number | null | undefined>) {
  if (typeof location === "undefined") return;
  const u = new URL(location.href);
  for (const [k, v] of Object.entries(values)) {
    if (v === null || v === undefined || v === "") u.searchParams.delete(k);
    else u.searchParams.set(k, String(v));
  }
  history.replaceState(history.state, "", u.pathname + u.search + u.hash);
}

/** Id de una ruta dinámica leído de la URL real: /lessons/pa-01/ → "pa-01". Las páginas
 * dinámicas se generan una vez (como /<sección>/_/) y el servidor las sirve para cualquier id. */
export function pathId(section: string): string {
  if (typeof location === "undefined") return "";
  const parts = location.pathname.split("/").filter(Boolean);
  const i = parts.indexOf(section);
  return i >= 0 && parts[i + 1] ? decodeURIComponent(parts[i + 1]) : "";
}

export function setTitle(t: string) {
  if (typeof document !== "undefined") document.title = t ? `${t} · JMD` : "JMD · Programación agéntica";
}

// Última sesión abierta (por usuario y navegador): alimenta «Continuar donde lo dejaste».
export interface LastSeen {
  lesson: string;
  title: string;
  course: string;
  courseTitle: string;
  at: number;
}
export function saveLast(user: string, v: LastSeen) {
  try {
    localStorage.setItem(`lms.last.${user}`, JSON.stringify(v));
  } catch {
    /* sin almacenamiento: no pasa nada */
  }
}
export function loadLast(user: string): LastSeen | null {
  try {
    const raw = localStorage.getItem(`lms.last.${user}`);
    return raw ? (JSON.parse(raw) as LastSeen) : null;
  } catch {
    return null;
  }
}
