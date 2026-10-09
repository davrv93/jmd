import { component$, useSignal, useVisibleTask$, $ } from "@builder.io/qwik";
import type { Material } from "~/lib/api";
import { getParam, setParams } from "~/lib/url";
import { Icon } from "./icon";

// Visor de diapositivas: una imagen por diapositiva, flechas, miniaturas, teclado (← → f) y
// pantalla completa. La diapositiva actual queda en la URL (?s=3) y sobrevive a F5.
export const Slides = component$((props: { deck: Material; downloads: Material[] }) => {
  const slides = props.deck.slides ?? [];
  const total = slides.length;
  const i = useSignal(0);

  const go = $((n: number) => {
    i.value = Math.min(total - 1, Math.max(0, n));
    setParams({ s: i.value ? i.value + 1 : "" });
    document.getElementById(`mini-${i.value}`)?.scrollIntoView({ block: "nearest", inline: "center" });
  });
  const full = $(() => {
    const el = document.getElementById("lienzo");
    if (document.fullscreenElement) document.exitFullscreen();
    else el?.requestFullscreen?.();
  });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ cleanup }) => {
    const s = parseInt(getParam("s"), 10);
    if (s > 1) i.value = Math.min(total - 1, s - 1);
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea, select") || e.metaKey || e.ctrlKey) return;
      if (e.key === "ArrowRight" || e.key === "PageDown") go(i.value + 1);
      else if (e.key === "ArrowLeft" || e.key === "PageUp") go(i.value - 1);
      else if (e.key === "f") full();
      else return;
      e.preventDefault();
    };
    document.addEventListener("keydown", onKey);
    cleanup(() => document.removeEventListener("keydown", onKey));
  });

  return (
    <div class="slides" aria-label={`${props.deck.title}: flechas para avanzar, F para pantalla completa`}>
      <div class="lienzo" id="lienzo">
        <img src={slides[i.value]} alt={`Diapositiva ${i.value + 1} de ${total}`} width={1600} height={900} />
        {i.value > 0 && (
          <button type="button" class="nav-s prev" aria-label="Anterior" onClick$={() => go(i.value - 1)}>
            <Icon name="chevronLeft" size={20} />
          </button>
        )}
        {i.value < total - 1 && (
          <button type="button" class="nav-s next" aria-label="Siguiente" onClick$={() => go(i.value + 1)}>
            <Icon name="chevronRight" size={20} />
          </button>
        )}
      </div>
      <div class="row" style="margin-top:.6rem">
        <span class="badge accent">
          {i.value + 1} / {total}
        </span>
        <button type="button" class="btn ghost sm" onClick$={full} title="Pantalla completa (F)">
          <Icon name="expand" size={14} /> Pantalla completa
        </button>
        <span class="grow" />
        {props.downloads.map((d) => (
          <a key={d.id} class="btn ghost sm" href={d.url} download>
            <Icon name="download" size={14} /> {d.kind === "pdf" ? "PDF" : "PowerPoint"}
          </a>
        ))}
      </div>
      <div class="thumbs">
        {slides.map((s, n) => (
          <img key={s} id={`mini-${n}`} src={s} alt={`Ir a la diapositiva ${n + 1}`} loading="lazy" width={160} height={90} class={n === i.value ? "on" : ""} onClick$={() => go(n)} />
        ))}
      </div>
    </div>
  );
});
