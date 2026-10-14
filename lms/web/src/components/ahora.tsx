import { component$, type QRL } from "@builder.io/qwik";
import { Link } from "@builder.io/qwik-city";
import type { CycleStep, Lesson } from "~/lib/api";
import { phaseOf } from "~/lib/kolb";
import { Icon } from "./icon";

// Bloque «Ahora»: la única acción principal de la pantalla, siempre arriba y con la misma forma en
// el inicio, el curso y la clase. Responde las tres preguntas del patrón: qué toca (título), qué
// es (descripción) y cómo sabrás que lo lograste (la comprobación del paso).

export interface PasoActual {
  step: CycleStep;
  /** Posición del paso en la clase (1 = primero). */
  n: number;
  total: number;
  hechos: number;
  fase: { token: string; short: string };
}

/** El primer paso sin hacer de la clase, o null si la clase está completa. */
export function pasoActual(l: Pick<Lesson, "cycle" | "progress">): PasoActual | null {
  const i = l.cycle.findIndex((s) => !l.progress.steps[s.id]);
  if (i < 0) return null;
  const step = l.cycle[i];
  const f = phaseOf(step, i, l.cycle.length);
  return { step, n: i + 1, total: l.cycle.length, hechos: l.progress.done, fase: { token: f.token, short: f.short } };
}

interface Props {
  etiqueta: string;
  titulo: string;
  descripcion?: string;
  /** Comprobación del paso: «Sabrás que lo lograste cuando…». */
  check?: string;
  fase?: string;
  /** Acción principal: un enlace (href) o un botón (onAccion$). */
  accion: string;
  href?: string;
  onAccion$?: QRL<() => void>;
  ocupado?: boolean;
  secundaria?: { label: string; href: string };
  /** Texto de avance bajo el botón («2 de 9 pasos»). */
  avance?: string;
  pct?: number;
  compacto?: boolean;
}

export const Ahora = component$<Props>((p) => {
  const boton = p.href ? (
    <Link class="btn" href={p.href}>
      {p.accion} <Icon name="chevronRight" size={16} />
    </Link>
  ) : (
    <button type="button" class="btn" onClick$={p.onAccion$} disabled={p.ocupado} aria-busy={p.ocupado}>
      <Icon name={p.ocupado ? "loader" : "check"} size={16} /> {p.accion}
    </button>
  );
  return (
    <section class={`ahora${p.compacto ? " compacto" : ""}`} aria-labelledby="ahora-t" data-testid="ahora">
      <div class="ahora-main">
        <span class="ahora-lbl">
          {p.fase && <i data-ph={p.fase} aria-hidden="true" />}
          {p.etiqueta}
        </span>
        <h2 id="ahora-t">{p.titulo}</h2>
        {!p.compacto && p.descripcion && <p>{p.descripcion}</p>}
        {!p.compacto && p.check && (
          <div class="ahora-check">
            <Icon name="check" size={16} />
            <span>
              Sabrás que lo lograste cuando: <code>{p.check}</code>
            </span>
          </div>
        )}
      </div>
      <div class="ahora-side">
        {boton}
        {p.secundaria && (
          <Link class="ahora-sec" href={p.secundaria.href}>
            {p.secundaria.label}
          </Link>
        )}
        {p.avance && (
          <div class="ahora-av">
            <span>{p.avance}</span>
            {p.pct != null && (
              <span class="ahora-bar" aria-hidden="true">
                <i style={`width:${Math.max(0, Math.min(100, p.pct))}%`} />
              </span>
            )}
          </div>
        )}
      </div>
    </section>
  );
});

/** «Ahora» de una clase: lee el progreso de la lección (un store) dentro de su propio render, así
 *  se repinta al marcar un paso aunque la página no vuelva a ejecutarse. */
export const AhoraClase = component$<{
  l: Pick<Lesson, "cycle" | "progress" | "next" | "assignments">;
  ocupado: string;
  onLogre$: QRL<(step: string) => void>;
}>(({ l, ocupado, onLogre$ }) => {
  const a = pasoActual(l);
  const done = l.progress.done;
  const total = l.progress.total;
  if (a)
    return (
      <Ahora
        key={a.step.id}
        etiqueta={`Ahora · paso ${a.n} de ${a.total} · ${a.fase.short}`}
        fase={a.fase.token}
        titulo={a.step.title}
        descripcion={a.step.description}
        check={a.step.check}
        accion="Lo logré"
        onAccion$={() => onLogre$(a.step.id)}
        ocupado={ocupado === a.step.id}
        avance={`${done} de ${total} pasos`}
        pct={total ? (100 * done) / total : 0}
      />
    );
  if (!total) return null;
  const proy = l.assignments[0];
  return (
    <Ahora
      key="completa"
      etiqueta="Clase completa"
      titulo={l.next ? "Hiciste todos los pasos de esta clase" : "Terminaste todas las clases publicadas"}
      descripcion={proy ? "Si aún no entregas el proyecto de la clase, ese es el siguiente paso." : undefined}
      accion={proy ? "Ir al proyecto" : l.next ? "Siguiente clase" : "Ver mis logros"}
      href={proy ? `/assignments/${proy.id}/` : l.next ? `/lessons/${l.next}/` : "/grades/"}
      avance={`${done} de ${total} pasos`}
      pct={100}
    />
  );
});
