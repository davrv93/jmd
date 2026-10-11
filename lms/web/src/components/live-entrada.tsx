import { component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";
import { api } from "~/lib/api";
import { Icon } from "~/components/icon";

// Aviso global «Clase en vivo»: cuando el instructor inicia el LIVE de una clase que el usuario puede ver,
// aparece en cualquier pantalla del LMS con el botón para entrar. Se consulta cada 10 s.
export const LiveAviso = component$(() => {
  const activas = useSignal<{ lesson_id: string; titulo: string }[]>([]);
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ cleanup }) => {
    const mirar = async () => {
      if (document.hidden) return;
      try {
        activas.value = (await api.liveActivas()) ?? [];
      } catch {
        /* sin sesión o sin red: no se muestra nada */
      }
    };
    mirar();
    const t = setInterval(mirar, 10000);
    cleanup(() => clearInterval(t));
  });
  if (activas.value.length === 0) return null;
  return (
    <div class="live-aviso-global" role="status">
      {activas.value.map((a) => (
        <a key={a.lesson_id} class="btn sm ok" href={`/live/${encodeURIComponent(a.lesson_id)}/`}>
          <span class="live-punto" aria-hidden="true" /> Clase en vivo: {a.titulo} · Entrar
        </a>
      ))}
    </div>
  );
});

// Acceso al modo LIVE dentro de la página de la clase.
export const LiveEntrada = component$((props: { lesson: string; staff: boolean }) => {
  const hay = useSignal(false); // la clase tiene escenas LIVE
  const enVivo = useSignal(false);
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ cleanup }) => {
    const mirar = async () => {
      if (document.hidden) return;
      try {
        const [esc, est] = await Promise.all([api.liveEscenas(props.lesson), api.liveEstado(props.lesson)]);
        hay.value = (esc ?? []).length > 0;
        enVivo.value = est.estado === "en_vivo";
      } catch {
        /* sin LIVE para esta clase */
      }
    };
    mirar();
    const t = setInterval(mirar, 10000);
    cleanup(() => clearInterval(t));
  });
  if (!hay.value) return null;
  const href = `/live/${encodeURIComponent(props.lesson)}/`;
  return (
    <div class={`live-entrada card${enVivo.value ? " en-vivo" : ""}`}>
      <div class="grow">
        <b>{enVivo.value ? "La clase está en vivo ahora" : "Modo LIVE de esta clase"}</b>
        <div class="muted sm">
          {enVivo.value
            ? "Entra para seguir las escenas, abrir tu terminal y tu visor."
            : props.staff
              ? "Abre el control para iniciar la clase y llevar a todos de escena en escena."
              : "Se abre aquí cuando el instructor inicie la clase. Tendrás un aviso en cualquier pantalla."}
        </div>
      </div>
      {(enVivo.value || props.staff) && (
        <a class="btn ok" href={href}>
          <Icon name="play" size={14} /> {props.staff ? (enVivo.value ? "Abrir el control" : "Abrir el control del LIVE") : "Entrar al LIVE"}
        </a>
      )}
    </div>
  );
});
