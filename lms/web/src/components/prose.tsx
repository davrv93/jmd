import { component$, useSignal, useStore, useVisibleTask$ } from "@builder.io/qwik";

// Markdown ya convertido a HTML. Al montarse: ids en los títulos (para el índice y para
// enlazar secciones) y un botón de copiar en cada bloque de código.
const COPY_SVG =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';

function slug(t: string): string {
  return t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export const Prose = component$((props: { html: string; toc?: boolean }) => {
  const ref = useSignal<HTMLElement>();
  const toc = useStore<{ items: { id: string; text: string; level: number }[] }>({ items: [] });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ track }) => {
    track(() => props.html);
    const el = ref.value;
    if (!el) return;
    const items: { id: string; text: string; level: number }[] = [];
    const seen = new Set<string>();
    el.querySelectorAll("h2, h3").forEach((h) => {
      let id = slug(h.textContent ?? "") || "seccion";
      while (seen.has(id)) id += "-";
      seen.add(id);
      h.id = id;
      items.push({ id, text: h.textContent ?? "", level: h.tagName === "H2" ? 2 : 3 });
    });
    toc.items = items;
    el.querySelectorAll("pre").forEach((pre) => {
      if (pre.querySelector(".pre-copy")) return;
      const b = document.createElement("button");
      b.type = "button";
      b.className = "icon-btn pre-copy";
      b.title = "Copiar";
      b.setAttribute("aria-label", "Copiar código");
      b.innerHTML = COPY_SVG;
      b.onclick = async () => {
        try {
          await navigator.clipboard.writeText(pre.querySelector("code")?.textContent ?? pre.textContent ?? "");
          b.textContent = "✓";
          setTimeout(() => (b.innerHTML = COPY_SVG), 1300);
        } catch {
          /* sin portapapeles */
        }
      };
      pre.appendChild(b);
    });
    const h = location.hash.slice(1);
    if (h) document.getElementById(h)?.scrollIntoView();
  });

  if (!props.toc) return <div ref={ref} class="prose" dangerouslySetInnerHTML={props.html} />;
  return (
    <div class="split">
      <div ref={ref} class="prose" dangerouslySetInnerHTML={props.html} />
      {toc.items.length > 2 && (
        <nav class="toc" aria-label="Índice">
          <div class="section-t" style="margin-top:0">En esta página</div>
          {toc.items
            .filter((t) => t.level === 2)
            .map((t) => (
              <a key={t.id} href={`#${t.id}`}>{t.text}</a>
            ))}
        </nav>
      )}
    </div>
  );
});
