import { component$, useContext, useSignal, useStore, useVisibleTask$, $ } from "@builder.io/qwik";
import { Link, useLocation, type DocumentHead, type StaticGenerateHandler } from "@builder.io/qwik-city";
import { api, errMsg, fmtDate, KINDS, requireLogin, TOOLS, type Lesson, type Question } from "~/lib/api";
import { SessionContext, isStaff } from "~/lib/session";
import { Copy } from "~/components/copy";

export default component$(() => {
  const loc = useLocation();
  const session = useContext(SessionContext);
  const st = useStore<{ l: Lesson | null; qs: Question[]; error: string; busy: string }>({ l: null, qs: [], error: "", busy: "" });
  const ask = useStore({ body: "", objective: "", minute: "" });
  const answerText = useStore<Record<string, string>>({});
  const askError = useSignal("");

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async ({ track }) => {
    const id = track(() => loc.params.id);
    try {
      const [l, qs] = await Promise.all([api.lesson(id), api.questions(id)]);
      st.l = l;
      st.qs = qs;
    } catch (e) {
      if (!requireLogin(e)) st.error = errMsg(e);
    }
  });

  const toggle = $(async (step: string, done: boolean) => {
    if (!st.l) return;
    st.busy = step;
    try {
      st.l.progress = await api.setProgress(st.l.id, step, done);
    } catch (e) {
      if (!requireLogin(e)) alert(errMsg(e));
    } finally {
      st.busy = "";
    }
  });

  const sendQuestion = $(async () => {
    if (!st.l) return;
    askError.value = "";
    try {
      const body: { body_md: string; objective_id?: string; video_ts?: number } = { body_md: ask.body };
      if (ask.objective) body.objective_id = ask.objective;
      if (ask.minute) body.video_ts = Math.max(0, Math.round(parseFloat(ask.minute) * 60));
      await api.ask(st.l.id, body);
      ask.body = "";
      ask.minute = "";
      st.qs = await api.questions(st.l.id);
    } catch (e) {
      if (!requireLogin(e)) askError.value = errMsg(e);
    }
  });

  const sendAnswer = $(async (qid: string) => {
    const text = (answerText[qid] ?? "").trim();
    if (!text || !st.l) return;
    try {
      await api.answer(qid, text);
      answerText[qid] = "";
      st.qs = await api.questions(st.l.id);
    } catch (e) {
      if (!requireLogin(e)) alert(errMsg(e));
    }
  });

  const resolve = $(async (qid: string, resolved: boolean) => {
    if (!st.l) return;
    try {
      await api.resolve(qid, resolved);
      st.qs = await api.questions(st.l.id);
    } catch (e) {
      if (!requireLogin(e)) alert(errMsg(e));
    }
  });

  const l = st.l;
  if (st.error) return <p class="error">{st.error}</p>;
  if (!l) return <p class="muted">Cargando…</p>;
  const pct = l.progress.total ? Math.round((100 * l.progress.done) / l.progress.total) : 0;
  const byObjective = (oid: string) => l.materials.filter((m) => m.objective_ids.includes(oid));
  const orphan = l.materials.filter((m) => m.objective_ids.length === 0 || !m.objective_ids.some((o) => l.objectives.some((x) => x.id === o)));
  const me = session.me;

  return (
    <div class="two">
      <article>
        <p class="small">
          <Link href={`/courses/${l.course.slug}/`}>← {l.course.title}</Link> · {l.module.title}
        </p>
        <h1>{l.title}</h1>
        <p class="muted small">
          {l.starts_at && <>{fmtDate(l.starts_at)} · </>}
          {!l.published && <span class="badge warn">borrador: solo lo ve el instructor</span>}
        </p>

        <section class="card" id="objetivos">
          <h2 style="margin-top:0">Objetivos de la sesión</h2>
          <ol>
            {l.objectives.map((o) => (
              <li key={o.id}>{o.title}</li>
            ))}
          </ol>
          <div class="row">
            {l.recording && (
              <span>
                <a class="btn" href={l.recording.url} target="_blank" rel="noopener">▶ Ver grabación</a>
                {l.recording.passcode && (
                  <span class="small muted"> código: <code>{l.recording.passcode}</code></span>
                )}
              </span>
            )}
            {l.repo && (
              <a class="btn ghost" href={l.repo.url} target="_blank" rel="noopener">
                Código de la sesión ({l.repo.ref})
              </a>
            )}
          </div>
          {l.repo && (
            <p class="small muted" style="margin-bottom:0">
              Abrir en terminal: <Copy text={l.open_command} />
            </p>
          )}
        </section>

        <section id="ciclo">
          <h2>Ciclo de aprendizaje</h2>
          <p class="muted small">
            Cada paso tiene su herramienta y una comprobación. Marca lo que ya hiciste: el instructor ve tu avance.
          </p>
          <div class="row" style="margin-bottom:.6rem">
            <span class="progress" style="flex:1"><i style={`width:${pct}%`} /></span>
            <span class="small muted">
              {l.progress.done}/{l.progress.total}
            </span>
          </div>
          <div class="cycle">
            {l.cycle.map((s) => {
              const done = !!l.progress.steps[s.id];
              const tool = TOOLS[s.tool] ?? { icon: "🔧", label: s.tool };
              return (
                <div class={`step ${done ? "done" : ""}`} key={s.id}>
                  <span class="n" />
                  <div>
                    <span class="title">{s.title}</span>
                    <span class="badge tool">
                      {tool.icon} {tool.label}
                    </span>
                    <div class="small">{s.description}</div>
                    {s.check && (
                      <div class="check muted">
                        Comprobación: <code>{s.check}</code>
                      </div>
                    )}
                  </div>
                  <input
                    type="checkbox"
                    aria-label={`Hecho: ${s.title}`}
                    checked={done}
                    disabled={st.busy === s.id}
                    onChange$={(_, el) => toggle(s.id, el.checked)}
                  />
                </div>
              );
            })}
          </div>
        </section>

        <section id="enlaces">
          <h2>Enlaces y materiales</h2>
          {l.objectives.map((o) =>
            byObjective(o.id).length ? (
              <div key={o.id}>
                <h3>{o.title}</h3>
                <ul class="links">
                  {byObjective(o.id).map((m) => (
                    <li key={m.id}>
                      <a href={m.url} target="_blank" rel="noopener">{m.title}</a> <span class="badge">{KINDS[m.kind] ?? m.kind}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null,
          )}
          {orphan.length > 0 && (
            <ul class="links">
              {orphan.map((m) => (
                <li key={m.id}>
                  <a href={m.url} target="_blank" rel="noopener">{m.title}</a> <span class="badge">{KINDS[m.kind] ?? m.kind}</span>
                </li>
              ))}
            </ul>
          )}
          {l.materials.length === 0 && <p class="muted small">Sin materiales todavía.</p>}
        </section>

        <section id="contenido" class="prose" dangerouslySetInnerHTML={l.content_html} />

        {l.assignments.length > 0 && (
          <section id="tareas">
            <h2>Tareas de esta sesión</h2>
            {l.assignments.map((a) => (
              <Link key={a.id} class="card" href={`/assignments/${a.id}/`} style="display:block">
                <b>{a.title}</b>
                {a.due_at && <div class="small muted">Entrega hasta {fmtDate(a.due_at)}</div>}
              </Link>
            ))}
          </section>
        )}

        <section id="preguntas">
          <h2>Preguntas</h2>
          <form class="card" preventdefault:submit onSubmit$={sendQuestion}>
            <label for="q">Tu pregunta (Markdown; pega el error completo en un bloque ```)</label>
            <textarea id="q" required value={ask.body} onInput$={(_, el) => (ask.body = el.value)} />
            <div class="row">
              <span style="flex:1">
                <label for="qo">Objetivo (opcional)</label>
                <select id="qo" value={ask.objective} onChange$={(_, el) => (ask.objective = el.value)}>
                  <option value="">—</option>
                  {l.objectives.map((o) => (
                    <option key={o.id} value={o.id}>{o.title}</option>
                  ))}
                </select>
              </span>
              <span style="width:9rem">
                <label for="qm">Minuto del vídeo</label>
                <input id="qm" type="number" min="0" step="0.5" value={ask.minute} onInput$={(_, el) => (ask.minute = el.value)} />
              </span>
            </div>
            {askError.value && <p class="error small">{askError.value}</p>}
            <p style="margin-bottom:0"><button type="submit">Publicar pregunta</button> <span class="small muted">o desde la terminal: <code>jmd ask {l.id} "…"</code></span></p>
          </form>
          {st.qs.length === 0 && <p class="muted small">Nadie ha preguntado todavía. Sé el primero.</p>}
          {st.qs.map((q) => (
            <div class="q" id={`q-${q.id}`} key={q.id}>
              <div class="meta">
                <b>{q.user_name}</b> · {fmtDate(q.created_at)}
                {q.objective_id && <> · <span class="badge">{l.objectives.find((o) => o.id === q.objective_id)?.title ?? q.objective_id}</span></>}
                {q.video_ts > 0 && <> · <span class="badge">min {Math.floor(q.video_ts / 60)}:{String(q.video_ts % 60).padStart(2, "0")}</span></>}
                {q.code_ref && <> · <code>{q.code_ref.path}:{q.code_ref.line}</code></>}
                {q.resolved && <> · <span class="badge ok">resuelta</span></>}
              </div>
              <pre style="white-space:pre-wrap;background:none;padding:.3rem 0">{q.body_md}</pre>
              {q.answers.map((a) => (
                <div class="answer" key={a.id}>
                  <div class="meta"><b>{a.user_name}</b> · {fmtDate(a.created_at)}</div>
                  <div style="white-space:pre-wrap">{a.body_md}</div>
                </div>
              ))}
              <div class="row" style="margin-top:.4rem">
                <input placeholder="Responder…" value={answerText[q.id] ?? ""} onInput$={(_, el) => (answerText[q.id] = el.value)} style="flex:1;min-width:12rem" />
                <button type="button" class="small" onClick$={() => sendAnswer(q.id)}>Responder</button>
                {me && (isStaff(me) || me.id === q.user_id) && (
                  <button type="button" class="ghost small" onClick$={() => resolve(q.id, !q.resolved)}>
                    {q.resolved ? "Reabrir" : "Marcar resuelta"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </section>

        <p class="row" style="margin-top:2rem">
          {l.prev && <Link class="btn ghost" href={`/lessons/${l.prev}/`}>← Sesión anterior</Link>}
          <span class="spacer" style="flex:1" />
          {l.next && <Link class="btn ghost" href={`/lessons/${l.next}/`}>Siguiente sesión →</Link>}
        </p>
      </article>
      <aside>
        <nav class="toc card">
          <b>En esta sesión</b>
          <a href="#objetivos">Objetivos</a>
          <a href="#ciclo">Ciclo de aprendizaje</a>
          <a href="#enlaces">Enlaces y materiales</a>
          <a href="#contenido">Contenido</a>
          {l.assignments.length > 0 && <a href="#tareas">Tareas</a>}
          <a href="#preguntas">Preguntas</a>
        </nav>
      </aside>
    </div>
  );
});

export const onStaticGenerate: StaticGenerateHandler = async () => {
  const { lessonIds } = await import("~/lib/content-routes");
  return { params: (await lessonIds()).map((id) => ({ id })) };
};

export const head: DocumentHead = { title: "Sesión" };
