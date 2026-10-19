// Cliente SSE del modo LIVE: abre el stream de una lección y reparte los eventos.
// En error cierra y reabre con espera creciente (1, 2, 4, 8 s; tope 8 s). `alCambiar`, si se pasa,
// recibe el estado de la conexión para mostrarlo (barra de estado del alumno).

const EVENTOS = ["estado", "presencia", "logre", "mensaje", "pareja", "cierre", "skill_nueva"] as const;

export type EventoLive = (typeof EVENTOS)[number];

export type ConexionLive = "conectando" | "conectado" | "reconectando";

export function abrirStream(lesson: string, on: (evento: string, data: any) => void, alCambiar?: (c: ConexionLive) => void): () => void {
  let fuente: EventSource | null = null;
  let cerrado = false;
  let reintento = 0;
  let temporizador: ReturnType<typeof setTimeout> | null = null;

  const conectar = () => {
    if (cerrado) return;
    fuente = new EventSource(`/api/v1/live/${encodeURIComponent(lesson)}/stream`);
    fuente.onopen = () => alCambiar?.("conectado");
    for (const nombre of EVENTOS) {
      fuente.addEventListener(nombre, (e: MessageEvent) => {
        reintento = 0; // un evento en limpio borra la espera acumulada
        alCambiar?.("conectado");
        let data: any = null;
        try {
          data = e.data ? JSON.parse(e.data) : null;
        } catch {
          data = e.data;
        }
        on(nombre, data);
      });
    }
    fuente.onerror = () => {
      fuente?.close();
      fuente = null;
      if (cerrado) return;
      alCambiar?.("reconectando");
      const espera = [1000, 2000, 4000, 8000][Math.min(reintento, 3)];
      reintento++;
      temporizador = setTimeout(conectar, espera);
    };
  };

  conectar();

  return () => {
    cerrado = true;
    if (temporizador) clearTimeout(temporizador);
    fuente?.close();
    fuente = null;
  };
}

// Tema que el LMS tiene puesto ("dark", "light" o "" si manda el sistema). Las escenas lo reciben
// por ?tema= para verse igual que el resto de la plataforma.
export function temaActual(): string {
  const t = document.documentElement.getAttribute("data-theme");
  return t === "dark" || t === "light" ? t : "";
}

// URL del HTML de una escena, con tema y, si se pide, la cortina.
export function urlEscena(lesson: string, escena: string, tema: string, cortina = false): string {
  const q: string[] = [];
  if (tema) q.push(`tema=${tema}`);
  if (cortina) q.push("cortina=1");
  return `/api/v1/live/${encodeURIComponent(lesson)}/escenas/${encodeURIComponent(escena)}/html${q.length ? "?" + q.join("&") : ""}`;
}

// Entrega el estado a la escena (ámbito: mismo origen). La escena decide qué hacer con `parametro`.
export function avisarEscena(marco: HTMLIFrameElement | undefined | null, estado: unknown): void {
  try {
    marco?.contentWindow?.postMessage({ tipo: "estado", estado }, location.origin);
  } catch {
    /* el marco aún no cargó */
  }
}
