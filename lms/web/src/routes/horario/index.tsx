import { component$, useContext, useSignal, useStore, useVisibleTask$, $ } from "@builder.io/qwik";
import { Link, type DocumentHead } from "@builder.io/qwik-city";
import { api, errMsg, requireLogin, type Horario } from "~/lib/api";
import { SessionContext, isStaff } from "~/lib/session";
import { setTitle } from "~/lib/url";
import { Icon } from "~/components/icon";
import { ErrorState, Loading } from "~/components/ui";
import { VistaHorario } from "~/components/horario-vista";

// Mi horario: la portada del alumno al entrar. Responde tres preguntas sin abrir curso por curso:
// cuándo son mis clases (calendario del mes), en qué estoy matriculado (lista al lado) y qué más
// puedo llevar sin que se me cruce (ofertas de grupos abiertos que caben en su horario).

export default component$(() => {
  const session = useContext(SessionContext);
  const st = useStore<{ h: Horario | null; error: string }>({ h: null, error: "" });
  const ahora = useSignal(Date.now());

  const load = $(async () => {
    st.error = "";
    try {
      const h = await api.horario();
      ahora.value = Date.now();
      st.h = h;
    } catch (e) {
      if (!requireLogin(e)) st.error = errMsg(e);
    }
  });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async ({ track }) => {
    setTitle("Mi horario");
    track(() => session.loaded);
    if (session.loaded) await load();
  });

  const staff = isStaff(session.me);
  return (
    <div class="ag-pagina hr-pagina">
      <div class="head">
        <div class="grow">
          <h1>Mi horario</h1>
          <p class="ag-sub">Hora de Lima</p>
        </div>
        {staff && (
          <Link class="btn ghost sm" href="/instructor/simulador/">
            <Icon name="eye" size={14} /> Ver como alumno
          </Link>
        )}
      </div>

      {st.error && <ErrorState message={st.error} retry$={load} />}
      {!st.error && !st.h && <Loading lines={4} />}
      {st.h && <VistaHorario h={st.h} ahora={ahora.value} staff={staff} />}
    </div>
  );
});

export const head: DocumentHead = { title: "Mi horario" };
