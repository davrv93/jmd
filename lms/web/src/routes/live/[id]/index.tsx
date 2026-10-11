import { $, component$, useContext, useStore, useVisibleTask$ } from "@builder.io/qwik";
import { type DocumentHead, type StaticGenerateHandler } from "@builder.io/qwik-city";
import { api, errMsg, requireLogin, type EscenaLive, type LiveEstado, type Me, type ParejaLive, type PresenteLive } from "~/lib/api";
import { abrirStream } from "~/lib/live";
import { SessionContext, isStaff } from "~/lib/session";
import { pathId, setTitle } from "~/lib/url";
import { ErrorState, Loading } from "~/components/ui";
import { LiveControl } from "~/components/live-control";
import { LiveAlumno } from "~/components/live-alumno";

export const onStaticGenerate: StaticGenerateHandler = async () => ({ params: [{ id: "_" }] });

interface LiveState {
  me: Me | null;
  estado: LiveEstado | null;
  escenas: EscenaLive[];
  error: string;
  conectados: number;
  presentes: PresenteLive[];
  aviso: string; // mensaje dirigido a este alumno
  pareja: ParejaLive | null;
  skillNueva: string; // skill creada desde la terminal que aún no está en la cuenta
  vistaAlumno: boolean; // el instructor mira la clase como la ve un alumno (terminal, visor, agente)
}

export default component$(() => {
  const session = useContext(SessionContext);
  const st = useStore<LiveState>({ me: null, estado: null, escenas: [], error: "", conectados: 0, presentes: [], aviso: "", pareja: null, skillNueva: "", vistaAlumno: false });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async ({ track }) => {
    track(() => session.loaded);
    if (!session.loaded) return;
    const id = pathId("live");
    setTitle(`LIVE · ${id}`);
    try {
      st.me = session.me ?? (await api.me());
    } catch (e) {
      if (!requireLogin(e)) st.error = errMsg(e);
      return;
    }
    try {
      st.estado = await api.liveEstado(id);
    } catch (e) {
      if (!requireLogin(e)) st.error = errMsg(e);
      return;
    }
    try {
      st.escenas = (await api.liveEscenas(id)) ?? [];
    } catch (e) {
      if (!requireLogin(e)) st.error = errMsg(e);
      return;
    }
    st.conectados = st.estado.conectados;
    try {
      st.vistaAlumno = sessionStorage.getItem("lms.live.alumno") === "1" || new URLSearchParams(location.search).get("vista") === "alumno";
    } catch {
      /* sin almacenamiento: vista de instructor */
    }
    try {
      const pj = await api.livePareja(id);
      st.pareja = pj.con.length ? pj : null;
    } catch {
      /* sin pareja todavía */
    }
    abrirStream(id, (evento, data) => {
      if (evento === "estado" && data) {
        st.estado = data as LiveEstado;
        st.conectados = st.estado.conectados;
      } else if (evento === "mensaje" && data && typeof data.texto === "string") {
        st.aviso = data.texto;
      } else if (evento === "skill_nueva" && data && typeof data.nombre === "string") {
        st.skillNueva = `${data.nombre}:${Date.now()}`;
      } else if (evento === "pareja" && data) {
        st.pareja = (data as ParejaLive).con?.length ? (data as ParejaLive) : null;
      } else if (evento === "presencia" && data) {
        if (Array.isArray(data.conectados)) {
          st.presentes = data.conectados as PresenteLive[];
          st.conectados = st.presentes.length;
        } else if (typeof data.conectados === "number") {
          st.conectados = data.conectados;
        }
      }
    });
  });

  const id = pathId("live");
  if (st.error) return <ErrorState message={st.error} />;
  if (!st.estado || !st.me) return <Loading />;

  const staff = isStaff(st.me);
  const cambiarVista = $((alumno: boolean) => {
    st.vistaAlumno = alumno;
    try {
      sessionStorage.setItem("lms.live.alumno", alumno ? "1" : "0");
    } catch {
      /* la elección dura solo esta pantalla */
    }
  });

  return (
    <div class="live">
      {staff && !st.vistaAlumno ? (
        <LiveControl lesson={id} estado={st.estado} escenas={st.escenas} conectados={st.conectados} presentes={st.presentes} onVista$={cambiarVista} />
      ) : (
        <LiveAlumno lesson={id} estado={st.estado} aviso={st.aviso} pareja={st.pareja} escenas={st.escenas} skillNueva={st.skillNueva} staff={staff} onVista$={cambiarVista} />
      )}
    </div>
  );
});

export const head: DocumentHead = {
  title: "LIVE",
};
