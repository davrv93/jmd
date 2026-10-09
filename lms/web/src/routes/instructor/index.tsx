import { component$, useContext, useStore, useVisibleTask$, $ } from "@builder.io/qwik";
import { Link, type DocumentHead } from "@builder.io/qwik-city";
import { api, errMsg, requireLogin, type CourseSummary } from "~/lib/api";
import { SessionContext } from "~/lib/session";
import { setTitle } from "~/lib/url";
import { Icon } from "~/components/icon";
import { Empty, ErrorState, Loading } from "~/components/ui";

export default component$(() => {
  const session = useContext(SessionContext);
  const st = useStore<{ list: CourseSummary[] | null; error: string }>({ list: null, error: "" });
  const load = $(async () => {
    st.error = "";
    try {
      st.list = await api.courses();
    } catch (e) {
      if (!requireLogin(e)) st.error = errMsg(e);
    }
  });
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async () => {
    session.help = "instructor";
    setTitle("Instructor");
    await load();
  });
  return (
    <>
      <div class="head">
        <div class="grow">
          <h1>Instructor</h1>
          <p>Avance de los alumnos por curso. Para calificar, abre una tarea y ve a «Calificar».</p>
        </div>
      </div>
      {st.error && <ErrorState message={st.error} retry$={load} />}
      {!st.error && st.list === null && <Loading lines={3} />}
      {st.list && st.list.length === 0 && <Empty icon="book" title="Sin cursos" />}
      <div class="grid">
        {st.list?.map((c) => (
          <Link key={c.id} class="card" href={`/instructor/${c.slug}/`}>
            <div class="row" style="flex-wrap:nowrap">
              <span class="lead-ico gold"><Icon name="users" /></span>
              <b class="grow">{c.title}</b>
              <Icon name="chevronRight" class="faint" />
            </div>
            <div class="row xs muted" style="margin-top:.5rem;gap:.8rem">
              <span><Icon name="book" size={12} /> {c.lessons_published}/{c.lessons_total} sesiones publicadas</span>
              {c.examples_total !== undefined && <span><Icon name="sparkles" size={12} /> {c.examples_total} ejemplos</span>}
            </div>
          </Link>
        ))}
      </div>
      <div class="section-t"><Icon name="info" /> Cómo publicar</div>
      <div class="card sm muted">
        El temario vive en <code>lms/content/courses/&lt;curso&gt;/</code>: <code>lessons/</code>, <code>assignments/</code> y <code>examples/</code>, en Markdown con
        front matter. Haz commit, despliega, y el servidor lo recarga solo; las páginas nuevas funcionan sin reconstruir el front.
      </div>
    </>
  );
});

export const head: DocumentHead = { title: "Instructor" };
