import { component$, useVisibleTask$, useSignal, type QRL } from "@builder.io/qwik";
import { type CompuertaLive } from "~/lib/api";

// Hace cuánto fue el último evento, en una frase corta ("hace 40 s", "hace 3 min").
export function haceTexto(s: number): string {
  if (!s) return "sin actividad";
  return s < 90 ? `hace ${s} s` : `hace ${Math.round(s / 60)} min`;
}

// LiveCompuerta: cuadro que sale cuando «Siguiente» no alcanza el umbral. Lista a quienes faltan
// y deja esperar o pasar igual. Foco inicial en «Esperar»; Escape también espera.
export const LiveCompuerta = component$(
  (props: { c: CompuertaLive; onEsperar$: QRL<() => void>; onPasar$: QRL<() => void> }) => {
    const esperar = useSignal<HTMLButtonElement>();
    // eslint-disable-next-line qwik/no-use-visible-task
    useVisibleTask$(() => {
      esperar.value?.focus();
      const tecla = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          e.preventDefault();
          props.onEsperar$();
        }
      };
      document.addEventListener("keydown", tecla);
      return () => document.removeEventListener("keydown", tecla);
    });
    const total = props.c.cumplieron.length + props.c.faltan.length;
    return (
      <div class="live-compuerta-fondo">
        <div class="live-compuerta" role="dialog" aria-modal="true" aria-labelledby="live-compuerta-t">
          <h2 id="live-compuerta-t">
            {props.c.cumplieron.length} de {total} cumplieron
          </h2>
          <p class="live-compuerta-sub">
            {props.c.pct} % ahora · el umbral es {props.c.umbral_pct} %
          </p>
          {props.c.faltan.length > 0 ? (
            <ul class="live-faltan" aria-label="Quienes faltan">
              {props.c.faltan.map((f) => (
                <li key={f.sub}>
                  <span class="live-faltan-nombre">{f.nombre}</span>
                  <span class="live-faltan-evento">
                    {f.ultimo_evento ? `${f.ultimo_evento} · ` : ""}
                    {haceTexto(f.hace_s)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p class="live-vacio">No hay alumnos conectados.</p>
          )}
          <div class="live-compuerta-acc">
            <button type="button" class="btn sm" ref={esperar} onClick$={props.onEsperar$}>
              Esperar
            </button>
            <button type="button" class="btn ghost sm" onClick$={props.onPasar$}>
              Pasar igual
            </button>
          </div>
        </div>
      </div>
    );
  },
);
