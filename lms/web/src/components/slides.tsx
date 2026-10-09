import { component$, useSignal, $ } from "@builder.io/qwik";
import type { Material } from "~/lib/api";

// Visor de diapositivas embebido: una imagen por diapositiva, flechas, miniaturas y teclado.
// Las descargas (.pptx y .pdf) salen de los materiales que se le pasan.
export const Slides = component$((props: { deck: Material; downloads: Material[] }) => {
  const i = useSignal(0);
  const slides = props.deck.slides ?? [];
  const total = slides.length;
  const go = $((n: number) => {
    i.value = Math.min(total - 1, Math.max(0, n));
    document.getElementById(`mini-${i.value}`)?.scrollIntoView({ block: "nearest", inline: "center" });
  });
  return (
    <div
      class="slides"
      tabIndex={0}
      aria-label={`${props.deck.title}: usa las flechas para avanzar`}
      onKeyDown$={(e) => {
        if (e.key === "ArrowRight" || e.key === "PageDown") go(i.value + 1);
        if (e.key === "ArrowLeft" || e.key === "PageUp") go(i.value - 1);
      }}
    >
      <div class="lienzo" id="lienzo-diapositivas">
        <img src={slides[i.value]} alt={`Diapositiva ${i.value + 1} de ${total}`} width={1600} height={900} />
        {i.value > 0 && (
          <button type="button" class="prev" aria-label="Anterior" onClick$={() => go(i.value - 1)}>‹</button>
        )}
        {i.value < total - 1 && (
          <button type="button" class="next" aria-label="Siguiente" onClick$={() => go(i.value + 1)}>›</button>
        )}
      </div>
      <div class="barra">
        <span class="badge accent">
          {i.value + 1} / {total}
        </span>
        <button
          type="button"
          class="ghost small"
          onClick$={() => {
            const el = document.getElementById("lienzo-diapositivas");
            if (document.fullscreenElement) document.exitFullscreen();
            else el?.requestFullscreen?.();
          }}
        >
          ⛶ Pantalla completa
        </button>
        <span style="flex:1" />
        {props.downloads.map((d) => (
          <a key={d.id} class="btn ghost small" href={d.url} download>
            ⬇ {d.kind === "pdf" ? "PDF" : d.kind === "pptx" || d.kind === "slides" ? "PowerPoint" : d.title}
          </a>
        ))}
      </div>
      <div class="miniaturas">
        {slides.map((s, n) => (
          <img
            key={s}
            id={`mini-${n}`}
            src={s}
            alt={`Ir a la diapositiva ${n + 1}`}
            loading="lazy"
            width={160}
            height={90}
            class={n === i.value ? "activa" : ""}
            onClick$={() => go(n)}
          />
        ))}
      </div>
    </div>
  );
});
