import { $, component$, useContext, useSignal, useVisibleTask$ } from "@builder.io/qwik";
import { api, type LiveEstado, type ParejaLive } from "~/lib/api";
import { SessionContext, toast } from "~/lib/session";
import { Icon } from "~/components/icon";
import { avisarEscena, temaActual, urlEscena } from "~/lib/live";

// LiveAlumno: la pantalla del alumno del LIVE. La escena actual a pantalla completa,
// cortina cuando el instructor la oculta, aviso en modo libre y panel de ayuda mínima.
export const LiveAlumno = component$((props: { lesson: string; estado: LiveEstado; aviso?: string; pareja?: ParejaLive | null }) => {
  const session = useContext(SessionContext);
  const escena = useSignal(props.estado.escena);
  const visible = useSignal(props.estado.visible);
  const modo = useSignal(props.estado.modo);
  const mensaje = useSignal(props.estado.mensaje);
  const local = useSignal(""); // escena local en modo libre
  const completa = useSignal(false);
  const tema = useSignal("");
  const marco = useSignal<HTMLIFrameElement>();

  // Sigue el stream: cada evento estado actualiza escena/cortina/modo/aviso.
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ track }) => {
    track(() => props.estado.escena);
    escena.value = props.estado.escena;
    visible.value = props.estado.visible;
    modo.value = props.estado.modo;
    mensaje.value = props.estado.mensaje;
    local.value = "";
  });

  // Un mensaje dirigido al alumno se muestra igual que el de todos y se apaga solo a los 30 s.
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ track, cleanup }) => {
    const a = track(() => props.aviso);
    if (!a) return;
    mensaje.value = a;
    const t = setTimeout(() => (mensaje.value = ""), 30000);
    cleanup(() => clearTimeout(t));
  });

  // Tema del LMS para la escena, y estado hacia el iframe en cada cambio.
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ track }) => {
    track(() => props.estado.escena);
    track(() => props.estado.parametro);
    tema.value = temaActual();
    avisarEscena(marco.value, props.estado);
  });

  // Latido: cada 15 s dice al instructor que sigo aquí y en qué escena (el servidor olvida a los de 40 s).
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ track, cleanup }) => {
    const esc = track(() => (modo.value === "libre" && local.value ? local.value : escena.value));
    const enviar = () => {
      api.liveLatido(props.lesson, esc).catch(() => undefined);
    };
    enviar();
    const t = setInterval(enviar, 15000);
    cleanup(() => clearInterval(t));
  });

  const mostrar = $((on: boolean) => {
    if (!session.me) return;
    toast(session, on ? "Pantalla completa activada" : "", "info");
  });

  const alternar = $(async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      completa.value = false;
      mostrar(false);
      return;
    }
    await document.documentElement.requestFullscreen();
    completa.value = true;
    mostrar(true);
  });

  // Escucha fullscreenchange para el icono del botón.
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(() => {
    const on = () => (completa.value = !!document.fullscreenElement);
    document.addEventListener("fullscreenchange", on);
    return () => document.removeEventListener("fullscreenchange", on);
  });

  const efectiva = modo.value === "libre" && local.value ? local.value : escena.value;

  return (
    <div class="live-alumno">
      {mensaje.value && (
        <div class="live-aviso" role="status">
          {mensaje.value}
          <button type="button" class="live-aviso-x" aria-label="Cerrar el aviso" onClick$={() => (mensaje.value = "")}>
            <Icon name="x" size={14} />
          </button>
        </div>
      )}
      {props.pareja && props.pareja.con.length > 0 && (
        <p class="live-pareja" role="status">
          Te toca con {props.pareja.con.map((c) => c.nombre).join(" y ")}
          {props.pareja.vista && (
            <>
              {" · "}
              <a href={props.pareja.vista} target="_blank" rel="noopener">
                abrir su visor
              </a>
            </>
          )}
        </p>
      )}
      {modo.value === "libre" && <p class="live-libre">Modo libre: avanza a tu ritmo con las flechas de abajo.</p>}
      <div class="live-escena">
        {efectiva ? (
          <iframe
            key={efectiva + tema.value}
            ref={marco}
            class="live-frame"
            onLoad$={() => avisarEscena(marco.value, props.estado)}
            sandbox="allow-scripts allow-same-origin"
            title="Escena"
            src={urlEscena(props.lesson, efectiva, tema.value)}
          />
        ) : (
          <p class="live-vacio">Esperando la primera escena…</p>
        )}
      </div>
      {!visible.value && <div class="live-cortina">El instructor está preparando la siguiente escena</div>}
      {modo.value === "libre" && (
        <div class="live-nav-local">
          <button type="button" class="btn ghost sm" aria-label="Escena anterior" onClick$={() => (local.value = escena.value)}>
            <Icon name="chevronLeft" size={14} />
          </button>
          <button type="button" class="btn ghost sm" aria-label="Escena siguiente" onClick$={() => (local.value = escena.value)}>
            <Icon name="chevronRight" size={14} />
          </button>
        </div>
      )}
      <footer class="live-paneles" aria-label="Paneles del alumno">
        <button type="button" class="btn ghost sm" aria-label="Terminal" aria-expanded="false">
          Terminal
        </button>
        <button type="button" class="btn ghost sm" aria-label="Visor" aria-expanded="false">
          Visor
        </button>
        <button type="button" class="btn ghost sm" aria-label="Agente" aria-expanded="false">
          Agente
        </button>
        <button type="button" class="btn ghost sm" aria-label="Ayuda" aria-expanded="false">
          Ayuda
        </button>
        <span class="grow" />
        <button type="button" class="btn sm" aria-label={completa.value ? "Salir de pantalla completa" : "Pantalla completa"} onClick$={alternar}>
          <Icon name="expand" size={14} /> {completa.value ? "Salir" : "Pantalla completa"}
        </button>
      </footer>
    </div>
  );
});
