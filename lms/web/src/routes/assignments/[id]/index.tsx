import { component$, useContext, useSignal, useStore, useVisibleTask$, $ } from "@builder.io/qwik";
import { Link, useLocation, type DocumentHead, type StaticGenerateHandler } from "@builder.io/qwik-city";
import { api, errMsg, fmtDate, requireLogin, STATUS, type Assignment, type Submission } from "~/lib/api";
import { SessionContext, isStaff } from "~/lib/session";
import { Copy } from "~/components/copy";

export default component$(() => {
  const loc = useLocation();
  const session = useContext(SessionContext);
  const st = useStore<{ a: Assignment | null; all: Submission[]; error: string }>({ a: null, all: [], error: "" });
  const form = useStore({ repo_url: "", commit_sha: "", notes: "" });
  const formError = useSignal("");
  const grading = useStore<Record<string, { score: string; feedback: string }>>({});

  const load = $(async (id: string) => {
    st.a = await api.assignment(id);
    if (isStaff(session.me)) st.all = await api.submissions(id);
  });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async ({ track }) => {
    const id = track(() => loc.params.id);
    track(() => session.loaded);
    if (!session.loaded) return;
    try {
      await load(id);
    } catch (e) {
      if (!requireLogin(e)) st.error = errMsg(e);
    }
  });

  const submit = $(async () => {
    if (!st.a) return;
    formError.value = "";
    try {
      await api.submit(st.a.id, { repo_url: form.repo_url.trim(), commit_sha: form.commit_sha.trim(), notes: form.notes });
      form.notes = "";
      await load(st.a.id);
    } catch (e) {
      if (!requireLogin(e)) formError.value = errMsg(e);
    }
  });

  const grade = $(async (sid: string) => {
    const g = grading[sid];
    if (!g || !st.a) return;
    try {
      await api.grade(sid, parseFloat(g.score), g.feedback);
      await load(st.a.id);
    } catch (e) {
      if (!requireLogin(e)) alert(errMsg(e));
    }
  });

  const a = st.a;
  if (st.error) return <p class="error">{st.error}</p>;
  if (!a) return <p class="muted">Cargando…</p>;
  const status = STATUS[a.status] ?? { label: a.status, cls: "" };
  const staff = isStaff(session.me);

  return (
    <>
      <p class="small">
        <Link href={`/courses/${a.course_id}/`}>← Curso</Link>
        {a.lesson_id && <> · <Link href={`/lessons/${a.lesson_id}/`}>{a.lesson_title || a.lesson_id}</Link></>}
      </p>
      <h1>{a.title}</h1>
      <p class="row">
        <span class={`badge ${status.cls}`}>{status.label}</span>
        {a.due_at && <span class="small muted">Entrega hasta {fmtDate(a.due_at)}</span>}
        <span class="small muted">· {a.max_score} puntos</span>
        {a.autograde && <span class="badge accent">con pruebas automáticas</span>}
      </p>

      <section class="prose" dangerouslySetInnerHTML={a.description_html} />

      {a.rubric.length > 0 && (
        <section>
          <h2>Rúbrica</h2>
          <table class="plain rubric">
            <tbody>
              {a.rubric.map((c) => (
                <tr key={c.criterion}>
                  <td>{c.criterion}</td>
                  <td>
                    {c.levels.map((lv) => (
                      <span key={lv.title} class="badge" style="margin:.1rem .2rem .1rem 0">
                        {lv.title}: {lv.points}
                      </span>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section id="entregar">
        <h2>Entregar</h2>
        <p class="small muted">
          Desde el repositorio, en la terminal: <Copy text={a.submit_command} /> (envía el <code>origin</code> y el <code>HEAD</code>). O aquí:
        </p>
        <form class="card" preventdefault:submit onSubmit$={submit}>
          <label for="repo">URL del repositorio</label>
          <input id="repo" required placeholder="https://github.com/usuario/clase-01" value={form.repo_url} onInput$={(_, el) => (form.repo_url = el.value)} />
          <label for="sha">Commit (SHA) — <code>git rev-parse HEAD</code></label>
          <input id="sha" required pattern="[0-9a-fA-F]{7,40}" value={form.commit_sha} onInput$={(_, el) => (form.commit_sha = el.value)} />
          <label for="notes">Notas para el instructor (opcional)</label>
          <textarea id="notes" value={form.notes} onInput$={(_, el) => (form.notes = el.value)} />
          {formError.value && <p class="error small">{formError.value}</p>}
          <p style="margin-bottom:0"><button type="submit">Entregar</button></p>
        </form>
        {a.my_submissions.length > 0 && (
          <>
            <h3>Mis entregas</h3>
            <table class="plain">
              <thead><tr><th>Fecha</th><th>Repositorio</th><th>Commit</th><th>Estado</th><th>Nota</th></tr></thead>
              <tbody>
                {a.my_submissions.map((s) => (
                  <tr key={s.id}>
                    <td class="small">{fmtDate(s.created_at)}</td>
                    <td class="small"><a href={s.repo_url} target="_blank" rel="noopener">{s.repo_url.replace(/^https?:\/\//, "")}</a></td>
                    <td><code>{s.commit_sha.slice(0, 7)}</code></td>
                    <td><span class={`badge ${STATUS[s.status]?.cls ?? ""}`}>{STATUS[s.status]?.label ?? s.status}</span></td>
                    <td>
                      {s.score != null ? `${s.score} / ${s.max_score}` : "—"}
                      {s.feedback_md && <div class="small muted" style="white-space:pre-wrap">{s.feedback_md}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </section>

      {staff && (
        <section id="calificar">
          <h2>Entregas de los alumnos</h2>
          {st.all.length === 0 && <p class="muted small">Nadie ha entregado todavía.</p>}
          {st.all.map((s) => {
            const g = grading[s.id] ?? { score: s.score != null ? String(s.score) : "", feedback: s.feedback_md };
            return (
              <div class="card" key={s.id}>
                <div class="row">
                  <b style="flex:1">{s.user ?? s.user_id}</b>
                  <span class={`badge ${STATUS[s.status]?.cls ?? ""}`}>{STATUS[s.status]?.label ?? s.status}</span>
                  <span class="small muted">{fmtDate(s.created_at)}</span>
                </div>
                <div class="small">
                  <a href={s.repo_url} target="_blank" rel="noopener">{s.repo_url}</a> @ <code>{s.commit_sha.slice(0, 7)}</code>
                  {s.notes && <div class="muted" style="white-space:pre-wrap">{s.notes}</div>}
                </div>
                <div class="row" style="margin-top:.5rem;align-items:flex-end">
                  <span style="width:7rem">
                    <label>Nota / {s.max_score}</label>
                    <input type="number" min="0" max={s.max_score} step="0.5" value={g.score} onInput$={(_, el) => (grading[s.id] = { ...g, score: el.value })} />
                  </span>
                  <span style="flex:1;min-width:14rem">
                    <label>Comentarios (Markdown)</label>
                    <input value={g.feedback} onInput$={(_, el) => (grading[s.id] = { ...g, feedback: el.value })} />
                  </span>
                  <button type="button" onClick$={() => grade(s.id)}>Calificar</button>
                </div>
              </div>
            );
          })}
        </section>
      )}
    </>
  );
});

export const onStaticGenerate: StaticGenerateHandler = async () => {
  const { assignmentIds } = await import("~/lib/content-routes");
  return { params: (await assignmentIds()).map((id) => ({ id })) };
};

export const head: DocumentHead = { title: "Tarea" };
