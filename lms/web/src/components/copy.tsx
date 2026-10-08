import { component$, useSignal, $ } from "@builder.io/qwik";

/** Un comando con botón de copiar. */
export const Copy = component$<{ text: string }>(({ text }) => {
  const done = useSignal(false);
  const copy = $(async () => {
    try {
      await navigator.clipboard.writeText(text);
      done.value = true;
      setTimeout(() => (done.value = false), 1500);
    } catch {
      /* sin portapapeles (http sin TLS): el usuario copia a mano */
    }
  });
  return (
    <span class="row" style="display:inline-flex;gap:.4rem">
      <code>{text}</code>
      <button type="button" class="ghost small" onClick$={copy}>{done.value ? "copiado ✓" : "copiar"}</button>
    </span>
  );
});
