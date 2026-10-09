import { component$, useStore, useVisibleTask$ } from "@builder.io/qwik";
import { Link, type DocumentHead } from "@builder.io/qwik-city";
import { api, errMsg, fmtDate, requireLogin, STATUS, type Grade } from "~/lib/api";

export default component$(() => {
  const st = useStore<{ list: Grade[] | null; error: string }>({ list: null, error: "" });
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async () => {
    try {
      st.list = await api.grades();
    } catch (e) {
      if (!requireLogin(e)) st.error = errMsg(e);
    }
  });
  return (
    <>
      <h1>Mis notas</h1>
      {st.error && <p class="error">{st.error}</p>}
      {st.list === null && !st.error && <p class="muted">Cargando…</p>}
      {st.list && st.list.length === 0 && <p class="muted">Aún no has entregado ninguna tarea. También puedes verlas con <code>jmd grades</code>.</p>}
      {st.list && st.list.length > 0 && (
        <table class="plain">
          <thead>
            <tr><th>Tarea</th><th>Estado</th><th>Nota</th><th>Calificada</th></tr>
          </thead>
          <tbody>
            {st.list.map((g) => (
              <tr key={g.assignment_id}>
                <td><Link href={`/assignments/${g.assignment_id}/`}>{g.title}</Link></td>
                <td><span class={`badge ${STATUS[g.status]?.cls ?? ""}`}>{STATUS[g.status]?.label ?? g.status}</span></td>
                <td>{g.score != null ? `${g.score} / ${g.max_score}` : "—"}</td>
                <td class="small muted">{fmtDate(g.graded_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
});

export const head: DocumentHead = { title: "Mis notas" };
