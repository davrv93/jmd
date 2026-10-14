// Tipos de recurso de la página Recursos (/links/ y /links/<curso>/), en el orden en que se
// muestran, con su etiqueta e icono. Los `kinds` del API se funden en estas familias (zip + file →
// Descargas, slides + pptx → Diapositivas…). Cada familia lleva su color con data-k.

export const ADJUNTO = new Set(["zip", "file", "pptx"]);

export const TIPOS: { id: string; label: string; icon: string; kinds: string[] }[] = [
  { id: "link", label: "Enlaces", icon: "globe", kinds: ["link"] },
  { id: "doc", label: "Documentación", icon: "book", kinds: ["doc", "note"] },
  { id: "repo", label: "Repositorios", icon: "git", kinds: ["repo"] },
  { id: "pdf", label: "PDF", icon: "file", kinds: ["pdf"] },
  { id: "zip", label: "Descargas", icon: "box", kinds: ["zip", "file"] },
  { id: "slides", label: "Diapositivas", icon: "slides", kinds: ["slides", "pptx"] },
  { id: "video", label: "Vídeo", icon: "video", kinds: ["video"] },
];
const TIPO_DE: Record<string, (typeof TIPOS)[number]> = {};
for (const t of TIPOS) for (const k of t.kinds) TIPO_DE[k] = t;
export const tipoDe = (kind: string) => TIPO_DE[kind] ?? TIPOS[0];

/** Dominio de un enlace o nombre del archivo del curso, para la línea gris de la fila. */
export function origen(url: string): string {
  if (url.startsWith("/")) return decodeURIComponent(url.split("/").pop() || "archivo del curso");
  return url.replace(/^https?:\/\//, "").split("/")[0];
}
