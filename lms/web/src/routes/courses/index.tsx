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
      <h1>Mis cursos</h1>
      {st.error && <p class="error">{st.error}</p>}
      {st.list === null && !st.error && <p class="muted">Cargando…</p>}
      {st.list && st.list.length === 0 && <p class="muted">Todavía no estás en ningún curso. Pide al instructor que te añada a la cohorte.</p>}
      <div class="grid">
        {st.list?.map((c) => (
          <Link key={c.id} class="card" href={`/courses/${c.slug}/`}>
            <h2 style="margin-top:0">{c.title}</h2>
            <p class="muted small">{c.description}</p>
            <span class="badge">{c.role === "instructor" ? "instructor" : "alumno"}</span>{" "}
            <span class="badge">
              {c.lessons_published} {c.lessons_published === 1 ? "sesión" : "sesiones"}
            </span>
          </Link>
        ))}
      </div>
    </>
  );
});

export const head: DocumentHead = { title: "Cursos" };
