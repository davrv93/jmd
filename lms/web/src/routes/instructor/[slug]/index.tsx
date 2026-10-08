import { component$, useStore, useVisibleTask$ } from "@builder.io/qwik";
import { Link, useLocation, type DocumentHead, type StaticGenerateHandler } from "@builder.io/qwik-city";
import { api, errMsg, fmtDate, requireLogin, STATUS, type Course, type CourseProgress } from "~/lib/api";

export default component$(() => {
  const loc = useLocation();
  const st = useStore<{ c: Course | null; p: CourseProgress | null; error: string }>({ c: null, p: null, error: "" });
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async ({ track }) => {
    const slug = track(() => loc.params.slug);
    try {
      const [c, p] = await Promise.all([api.course(slug), api.courseProgress(slug)]);
      st.c = c;
      st.p = p;
    } catch (e) {
      if (!requireLogin(e)) st.error = errMsg(e);
    }
  });
  if (st.error) return <p class="error">{st.error}</p>;
  if (!st.c || !st.p) return <p class="muted">Cargando…</p>;
  const { c, p } = st;
  return (
    <>
      <p class="small"><Link href="/instructor/">← Instructor</Link> · <Link href={`/courses/${c.slug}/`}>ver como alumno</Link></p>
      <h1>{c.title}</h1>
      <h2>Avance por alumno (pasos del ciclo hechos)</h2>
      {p.students.length === 0 && <p class="muted">Todavía no hay alumnos en la cohorte de este curso.</p>}
      {p.students.length > 0 && (
        <div style="overflow-x:auto">
          <table class="plain">
            <thead>
              <tr>
                <th>Alumno</th>
                {p.lessons.map((l) => (
                  <th key={l.id} class="small"><Link href={`/lessons/${l.id}/`}>{l.title}</Link></th>
                ))}
              </tr>
            </thead>
            <tbody>
              {p.students.map((s) => (
                <tr key={s.id}>
                  <td>
                    {s.name}
                    <div class="small muted">{s.email} · {s.cohorts.join(", ")}</div>
                  </td>
                  {p.lessons.map((l) => {
                    const done = s.lessons?.[l.id] ?? 0;
                    const pct = l.steps ? Math.round((100 * done) / l.steps) : 0;
                    return (
                      <td key={l.id}>
                        <div class="small">{done}/{l.steps}</div>
                        <div class="progress" style="width:6rem"><i style={`width:${pct}%`} /></div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <h2>Tareas</h2>
      {c.assignments.map((a) => (
        <Link key={a.id} class="card" href={`/assignments/${a.id}/#calificar`} style="display:block">
          <div class="row">
            <b style="flex:1">{a.title}</b>
            <span class={`badge ${STATUS[a.status]?.cls ?? ""}`}>{STATUS[a.status]?.label ?? a.status}</span>
            {a.due_at && <span class="small muted">hasta {fmtDate(a.due_at)}</span>}
          </div>
          <div class="small muted">Abrir para ver y calificar las entregas</div>
        </Link>
      ))}
    </>
  );
});

export const onStaticGenerate: StaticGenerateHandler = async () => {
  const { courseSlugs } = await import("~/lib/content-routes");
  return { params: (await courseSlugs()).map((slug) => ({ slug })) };
};

export const head: DocumentHead = { title: "Avance del curso" };
