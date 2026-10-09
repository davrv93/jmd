import { component$, useContext, useStore, useVisibleTask$ } from "@builder.io/qwik";
import { Link, useLocation, type DocumentHead, type StaticGenerateHandler } from "@builder.io/qwik-city";
import { api, errMsg, fmtDate, requireLogin, STATUS, type Course } from "~/lib/api";
import { SessionContext, isStaff } from "~/lib/session";

export default component$(() => {
  const loc = useLocation();
  const session = useContext(SessionContext);
  const st = useStore<{ c: Course | null; error: string }>({ c: null, error: "" });
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async ({ track }) => {
    track(() => loc.params.slug);
    try {
      st.c = await api.course(loc.params.slug);
    } catch (e) {
      if (!requireLogin(e)) st.error = errMsg(e);
    }
  });
  const c = st.c;
  return (
    <>
      <p class="small"><Link href="/courses/">← Cursos</Link></p>
      {st.error && <p class="error">{st.error}</p>}
      {!c && !st.error && <p class="muted">Cargando…</p>}
      {c && (
        <>
          <h1>{c.title}</h1>
          <p class="muted">{c.description}</p>
          {isStaff(session.me) && (
            <p class="small"><Link href={`/instructor/${c.slug}/`}>Ver avance de los alumnos →</Link></p>
          )}
          {c.modules.map((m) => (
            <section key={m.id}>
              <h2>{m.title}</h2>
              {m.lessons.length === 0 && <p class="muted small">Sin sesiones publicadas todavía.</p>}
              {m.lessons.map((l) => (
                <Link key={l.id} class="card" href={`/lessons/${l.id}/`} style="display:block">
                  <div class="row">
                    <b style="flex:1">{l.title}</b>
                    {!l.published && <span class="badge warn">borrador</span>}
                    {l.starts_at && <span class="muted small">{fmtDate(l.starts_at)}</span>}
                  </div>
                  <div class="row small muted" style="margin-top:.3rem">
                    <span>{l.objectives} objetivos</span>
                    <span>·</span>
                    <span>
                      {l.steps_done}/{l.steps} pasos del ciclo
                    </span>
                    <span class="progress" style="flex:1;min-width:6rem">
                      <i style={`width:${l.steps ? Math.round((100 * l.steps_done) / l.steps) : 0}%`} />
                    </span>
                  </div>
                </Link>
              ))}
            </section>
          ))}
          <h2>Tareas</h2>
          {c.assignments.length === 0 && <p class="muted small">Sin tareas todavía.</p>}
          {c.assignments.map((a) => (
            <Link key={a.id} class="card" href={`/assignments/${a.id}/`} style="display:block">
              <div class="row">
                <b style="flex:1">{a.title}</b>
                <span class={`badge ${STATUS[a.status]?.cls ?? ""}`}>{STATUS[a.status]?.label ?? a.status}</span>
                {a.score != null && (
                  <span class="badge ok">
                    {a.score}/{a.max_score}
                  </span>
                )}
              </div>
              {a.due_at && <div class="small muted">Entrega hasta {fmtDate(a.due_at)}</div>}
            </Link>
          ))}
        </>
      )}
    </>
  );
});

export const onStaticGenerate: StaticGenerateHandler = async () => {
  const { courseSlugs } = await import("~/lib/content-routes");
  return { params: (await courseSlugs()).map((slug) => ({ slug })) };
};

export const head: DocumentHead = { title: "Curso" };
