import { component$, useStore, useVisibleTask$ } from "@builder.io/qwik";
import { Link, type DocumentHead } from "@builder.io/qwik-city";
import { api, errMsg, requireLogin, type CourseSummary } from "~/lib/api";

export default component$(() => {
  const st = useStore<{ list: CourseSummary[] | null; error: string }>({ list: null, error: "" });
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async () => {
    try {
      st.list = await api.courses();
    } catch (e) {
      if (!requireLogin(e)) st.error = errMsg(e);
    }
  });
  return (
    <>
      <h1>Instructor</h1>
      <p class="muted">
        El temario vive en <code>lms/content/</code>: añade una sesión o una tarea, haz commit y el servidor lo recarga solo.
        Aquí ves el avance de cada alumno y calificas desde cada tarea.
      </p>
      {st.error && <p class="error">{st.error}</p>}
      <div class="grid">
        {st.list?.map((c) => (
          <Link key={c.id} class="card" href={`/instructor/${c.slug}/`}>
            <b>{c.title}</b>
            <div class="small muted">{c.lessons_published}/{c.lessons_total} sesiones publicadas</div>
          </Link>
        ))}
      </div>
    </>
  );
});

export const head: DocumentHead = { title: "Instructor" };
