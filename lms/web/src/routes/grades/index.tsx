import { component$, useContext, useStore, useVisibleTask$, $ } from "@builder.io/qwik";
import { Link, type DocumentHead } from "@builder.io/qwik-city";
import { api, errMsg, fmtDate, rel, requireLogin, STATUS, type Grade } from "~/lib/api";
import { SessionContext } from "~/lib/session";
import { setTitle } from "~/lib/url";
import { Empty, ErrorState, Loading, Status } from "~/components/ui";

export default component$(() => {
  const session = useContext(SessionContext);
  const st = useStore<{ list: Grade[] | null; error: string }>({ list: null, error: "" });
  const load = $(async () => {
    st.error = "";
    try {
      st.list = await api.grades();
    } catch (e) {
      if (!requireLogin(e)) st.error = errMsg(e);
    }
  });
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async () => {
    session.help = "notas";
    setTitle("Mis notas");
    await load();
  });

  const list = st.list ?? [];
  const graded = list.filter((g) => g.score != null);
  const avg = graded.length ? graded.reduce((s, g) => s + (20 * (g.score ?? 0)) / (g.max_score || 20), 0) / graded.length : null;

  return (
    <>
      <div class="head">
        <div class="grow">
          <h1>Mis notas</h1>
          <p>Tus entregas con su estado, nota y comentarios. En la terminal: <code>jmd grades</code>.</p>
        </div>
      </div>
      {st.error && <ErrorState message={st.error} retry$={load} />}
      {!st.error && st.list === null && <Loading lines={4} />}
      {st.list && (
        <>
          <div class="facts" style="margin-bottom:1rem">
            <div class="fact"><div class="k">Tareas</div><div class="v">{list.length}</div></div>
            <div class="fact"><div class="k">Entregadas</div><div class="v">{list.filter((g) => g.status !== "pending" && g.status !== "overdue").length}</div></div>
            <div class="fact"><div class="k">Calificadas</div><div class="v">{graded.length}</div></div>
            <div class="fact"><div class="k">Promedio (sobre 20)</div><div class="v gold">{avg == null ? "—" : avg.toFixed(1)}</div></div>
          </div>
          {list.length === 0 ? (
            <Empty icon="award" title="Todavía no hay tareas" text="Cuando el instructor publique tareas, verás aquí tus entregas y notas." />
          ) : (
            <div class="card scroll-x" style="padding:.2rem .4rem">
              <table class="t">
                <thead>
                  <tr><th>Tarea</th><th>Estado</th><th>Nota</th><th>Calificada</th></tr>
                </thead>
                <tbody>
                  {list.map((g) => (
                    <tr key={g.assignment_id}>
                      <td>
                        <Link href={`/assignments/${g.assignment_id}/`}>{g.title}</Link>
                        {g.feedback_md && <div class="xs muted" style="max-width:32rem">{g.feedback_md}</div>}
                      </td>
                      <td><Status s={STATUS[g.status] ?? STATUS.pending} /></td>
                      <td>{g.score != null ? <b>{g.score}<span class="muted sm"> / {g.max_score}</span></b> : <span class="faint">—</span>}</td>
                      <td class="sm muted" title={fmtDate(g.graded_at)}>{rel(g.graded_at) || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  );
});

export const head: DocumentHead = { title: "Mis notas" };
