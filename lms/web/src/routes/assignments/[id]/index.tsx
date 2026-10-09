import { component$, useContext, useSignal, useStore, useVisibleTask$, $ } from "@builder.io/qwik";
import { Link, useLocation, type DocumentHead, type StaticGenerateHandler } from "@builder.io/qwik-city";
import { api, errMsg, fmtDate, rel, requireLogin, STATUS, type Assignment, type Submission } from "~/lib/api";
import { SessionContext, isStaff, toast } from "~/lib/session";
import { getParam, pathId, setParams, setTitle } from "~/lib/url";
import { Icon } from "~/components/icon";
import { Copy, Crumbs, Empty, ErrorState, Loading, Status, Tabs } from "~/components/ui";
import { Prose } from "~/components/prose";

export default component$(() => {
  const loc = useLocation();
  const session = useContext(SessionContext);
  const st = useStore<{ a: Assignment | null; all: Submission[]; error: string; sending: boolean }>({ a: null, all: [], error: "", sending: false });
  const form = useStore({ repo_url: "", commit_sha: "", notes: "" });
  const tab = useSignal("enunciado");
  const grading = useStore<Record<string, { score: string; feedback: string }>>({});

  const load = $(async () => {
    st.error = "";
    const id = pathId("assignments");
    try {
      st.a = await api.assignment(id);
      setTitle(st.a.title);
      const last = st.a.my_submissions[0];
      if (last && !form.repo_url) form.repo_url = last.repo_url;
      if (isStaff(session.me)) st.all = await api.submissions(id);
    } catch (e) {
      if (!requireLogin(e)) st.error = errMsg(e);
    }
  });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async ({ track }) => {
    track(() => loc.url.pathname);
    track(() => session.loaded);
    session.help = "tarea";
    if (!session.loaded) return;
    tab.value = getParam("tab") || (location.hash === "#calificar" ? "calificar" : "enunciado");
    await load();
  });

  const select = $((id: string) => {
    tab.value = id;
    setParams({ tab: id === "enunciado" ? "" : id });
  });

  const submit = $(async () => {
    if (!st.a) return;
    st.sending = true;
    try {
      await api.submit(st.a.id, { repo_url: form.repo_url.trim(), commit_sha: form.commit_sha.trim(), notes: form.notes });
      form.notes = "";
      form.commit_sha = "";
      await load();
      toast(session, "Entrega enviada");
      select("entregas");
    } catch (e) {
      if (!requireLogin(e)) toast(session, errMsg(e), "bad");
    } finally {
      st.sending = false;
    }
  });

  const grade = $(async (sid: string, fallback: { score: string; feedback: string }) => {
    const g = grading[sid] ?? fallback;
    if (!st.a || g.score === "") return;
    try {
      await api.grade(sid, parseFloat(g.score), g.feedback);
      await load();
      toast(session, "Nota guardada");
    } catch (e) {
      if (!requireLogin(e)) toast(session, errMsg(e), "bad");
    }
  });

  if (st.error) return <ErrorState message={st.error} retry$={load} />;
  const a = st.a;
  if (!a) return <Loading lines={6} />;
  const status = STATUS[a.status] ?? STATUS.pending;
  const staff = isStaff(session.me);
  const delivered = a.my_submissions.length > 0;
  const graded = a.my_submissions.some((s) => s.status === "graded");
  const best = a.my_submissions.find((s) => s.score != null);

  return (
    <>
      <Crumbs items={[{ href: "/courses/", label: "Inicio" }, { href: `/courses/${a.course_id}/?tab=tareas`, label: "Tareas" }, { label: a.title }]} />
      <div class="head">
        <span class="lead-ico gold" style="width:46px;height:46px"><Icon name="task" size={22} /></span>
        <div class="grow">
          <h1>{a.title}</h1>
          <div class="row sm muted" style="margin-top:.35rem;gap:.8rem">
            <Status s={status} />
            {a.due_at && <span title={fmtDate(a.due_at)}><Icon name="calendar" size={13} /> Entrega {rel(a.due_at)} · {fmtDate(a.due_at)}</span>}
            <span><Icon name="award" size={13} /> {a.max_score} puntos</span>
            {a.lesson_id && <Link href={`/lessons/${a.lesson_id}/`}><Icon name="book" size={13} /> {a.lesson_title || a.lesson_id}</Link>}
            {a.autograde && <span class="badge accent"><Icon name="zap" size={11} /> pruebas automáticas</span>}
          </div>
        </div>
        {best && (
          <div class="fact" style="text-align:center;min-width:6rem">
            <div class="k">Nota</div>
            <div class="v" style="font-size:1.3rem">{best.score}<span class="sm muted">/{best.max_score}</span></div>
          </div>
        )}
      </div>

      <div class="stepper" style="margin:-.3rem 0 1rem">
        <span class="done"><Icon name="checkCircle" size={14} /> Publicada</span><i />
        <span class={delivered ? "done" : "on"}><Icon name={delivered ? "checkCircle" : "circle"} size={14} /> Entregada</span><i />
        <span class={graded ? "done" : delivered ? "on" : ""}><Icon name={graded ? "checkCircle" : "circle"} size={14} /> Calificada</span>
      </div>

      <Tabs
        active={tab.value}
        onSelect$={select}
        tabs={[
          { id: "enunciado", label: "Enunciado", icon: "file" },
          ...(a.rubric.length ? [{ id: "rubrica", label: "Rúbrica", icon: "award" }] : []),
          { id: "entregar", label: "Entregar", icon: "send" },
          { id: "entregas", label: "Mis entregas", icon: "clock", count: a.my_submissions.length },
          ...(staff ? [{ id: "calificar", label: "Calificar", icon: "users", count: st.all.filter((s) => s.status !== "graded").length }] : []),
        ]}
      />

      {tab.value === "enunciado" && <Prose html={a.description_html} />}

      {tab.value === "rubrica" && (
        <div class="list">
          {a.rubric.map((c) => {
            const max = Math.max(...c.levels.map((l) => l.points));
            return (
              <div class="item" key={c.criterion} style="align-items:flex-start">
                <span class="lead-ico"><Icon name="target" /></span>
                <span class="grow">
                  <div class="t">{c.criterion}</div>
                  <div class="row" style="margin-top:.35rem">
                    {c.levels.map((lv) => (
                      <span key={lv.title} class={`badge ${lv.points === max ? "ok" : ""}`}>{lv.title} · {lv.points}</span>
                    ))}
                  </div>
                </span>
                <span class="badge gold">{max} pts</span>
              </div>
            );
          })}
        </div>
      )}

      {tab.value === "entregar" && (
        <div class="split">
          <form class="card" preventdefault:submit onSubmit$={submit}>
            <label for="repo" style="margin-top:0">URL del repositorio</label>
            <input id="repo" required type="url" placeholder="https://github.com/usuario/clase-01" value={form.repo_url} onInput$={(_, el) => (form.repo_url = el.value)} />
            <label for="sha">Commit (SHA)</label>
            <input id="sha" required pattern="[0-9a-fA-F]{7,40}" placeholder="a1b2c3d" value={form.commit_sha} onInput$={(_, el) => (form.commit_sha = el.value)} />
            <div class="hint">En el repo: <code>git rev-parse HEAD</code> (7 a 40 caracteres hexadecimales).</div>
            <label for="notes">Notas para el instructor (opcional)</label>
            <textarea id="notes" value={form.notes} onInput$={(_, el) => (form.notes = el.value)} />
            <div class="row" style="margin-top:.8rem">
              <button type="submit" class="btn" disabled={st.sending}><Icon name="send" size={14} /> {delivered ? "Entregar de nuevo" : "Entregar"}</button>
              {delivered && <span class="hint">Cuenta la última entrega.</span>}
            </div>
          </form>
          <aside class="card">
            <div class="section-t" style="margin-top:0"><Icon name="terminal" /> Desde la terminal</div>
            <p class="sm muted">Dentro del repositorio, envía el <code>origin</code> y el <code>HEAD</code> de una vez:</p>
            <Copy text={a.submit_command} />
            <div class="section-t"><Icon name="info" /> Antes de entregar</div>
            <ul class="sm muted" style="padding-left:1.1rem;margin:.3rem 0">
              <li>Haz push del commit: el instructor debe poder verlo.</li>
              <li>Si el repo es privado, dale acceso al instructor.</li>
              <li>Revisa la rúbrica.</li>
            </ul>
          </aside>
        </div>
      )}

      {tab.value === "entregas" &&
        (a.my_submissions.length === 0 ? (
          <Empty icon="send" title="Aún no entregaste" text="Cuando entregues, verás aquí el estado, la nota y los comentarios.">
            <button type="button" class="btn sm" onClick$={() => select("entregar")}>Entregar ahora</button>
          </Empty>
        ) : (
          <div class="list">
            {a.my_submissions.map((s, i) => (
              <div key={s.id} class="item" style="align-items:flex-start">
                <span class="lead-ico"><Icon name={i === 0 ? "star" : "clock"} /></span>
                <span class="grow">
                  <div class="row">
                    <a class="t sm" href={s.repo_url} target="_blank" rel="noopener">{s.repo_url.replace(/^https?:\/\//, "")}</a>
                    <code>{s.commit_sha.slice(0, 7)}</code>
                    {i === 0 && <span class="badge accent">la que cuenta</span>}
                  </div>
                  <div class="d" title={fmtDate(s.created_at)}>{rel(s.created_at)}</div>
                  {s.feedback_md && <div class="sm" style="white-space:pre-wrap;margin-top:.35rem;padding:.5rem .65rem;background:var(--s2);border-radius:6px">{s.feedback_md}</div>}
                </span>
                {s.score != null && <span class="badge ok">{s.score}/{s.max_score}</span>}
                <Status s={STATUS[s.status] ?? STATUS.pending} />
              </div>
            ))}
          </div>
        ))}

      {tab.value === "calificar" &&
        staff &&
        (st.all.length === 0 ? (
          <Empty icon="users" title="Nadie ha entregado todavía" />
        ) : (
          <div class="stack">
            {st.all.map((s) => {
              const g = grading[s.id] ?? { score: s.score != null ? String(s.score) : "", feedback: s.feedback_md };
              return (
                <div class="card" key={s.id}>
                  <div class="row">
                    <b class="grow">{s.user ?? s.user_id}</b>
                    <Status s={STATUS[s.status] ?? STATUS.pending} />
                    <span class="xs muted" title={fmtDate(s.created_at)}>{rel(s.created_at)}</span>
                  </div>
                  <div class="sm" style="margin-top:.3rem">
                    <a href={s.repo_url} target="_blank" rel="noopener">{s.repo_url}</a> @ <code>{s.commit_sha.slice(0, 7)}</code>
                    {s.notes && <div class="muted" style="white-space:pre-wrap">{s.notes}</div>}
                  </div>
                  <div class="row" style="margin-top:.6rem;align-items:flex-end">
                    <span style="width:7rem">
                      <label style="margin-top:0">Nota / {s.max_score}</label>
                      <input type="number" min="0" max={s.max_score} step="0.5" value={g.score} onInput$={(_, el) => (grading[s.id] = { ...g, score: el.value })} />
                    </span>
                    <span class="grow" style="min-width:14rem">
                      <label style="margin-top:0">Comentarios</label>
                      <input value={g.feedback} onInput$={(_, el) => (grading[s.id] = { ...g, feedback: el.value })} />
                    </span>
                    <button type="button" class="btn" onClick$={() => grade(s.id, g)}><Icon name="check" size={14} /> Guardar</button>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
    </>
  );
});

export const onStaticGenerate: StaticGenerateHandler = async () => ({ params: [{ id: "_" }] });

export const head: DocumentHead = { title: "Tarea" };
