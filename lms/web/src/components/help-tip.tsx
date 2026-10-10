import { component$, Slot, useSignal } from "@builder.io/qwik";
import { Icon } from "./icon";

/** Botón de ayuda con popover corto: abre al pasar, al enfocar o al pulsar. Usa las clases
 *  .studio-help / .studio-tip del Estudio; con `left` el globo se alinea a la izquierda. */
export const Help = component$((props: { title: string; left?: boolean }) => {
  const open = useSignal(false);
  return (
    <span class={`studio-help ${open.value ? "open" : ""} ${props.left ? "left" : ""}`}>
      <button
        type="button"
        class="studio-help__btn"
        aria-label={props.title}
        title={props.title}
        aria-expanded={open.value}
        onClick$={() => (open.value = !open.value)}
        onBlur$={() => (open.value = false)}
      >
        <Icon name="help" size={16} />
      </button>
      <div class="studio-tip" role="tooltip">
        <Slot />
      </div>
    </span>
  );
});
