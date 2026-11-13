import { AhoraClase } from "~/components/ahora";
import { LiveEntrada } from "~/components/live-entrada";
import { component$, useContext, useSignal, useStore, useStyles$, useVisibleTask$, $ } from "@builder.io/qwik";
import { Link, useLocation, type DocumentHead, type StaticGenerateHandler } from "@builder.io/qwik-city";
import { api, errMsg, fmtDate, KINDS, rel, requireLogin, TOOLS, type Certificate, type Course, type Lesson, type Material, type Question } from "~/lib/api";
import { SessionContext, isStaff, toast } from "~/lib/session";
import { getParam, pathId, saveLast, setParams, setTitle } from "~/lib/url";
import { modToken } from "~/lib/kolb";
import { Icon, KIND_ICON, TOOL_ICON } from "~/components/icon";
import { Chip, Copy, Crumbs, Empty, ErrorState, lessonState, Loading, Tabs } from "~/components/ui";
import { Hex } from "~/components/habilidad";
import { Slides } from "~/components/slides";
import { Prose } from "~/components/prose";

const ADJUNTO = new Set(["zip", "file", "pptx"]);
// La clase: la habilidad que da (con su insignia) arriba de los pasos, y los pasos en una sola lista
// numerada. Las fases del ciclo ya no parten la lista en secciones de color: el número y el título
// bastan para saber qué sigue.
const CSS = `
.hab-clase { display: grid; gap: .75rem; }
.hab-cab { display: flex; align-items: flex-start; gap: .9rem; }
.hab-cab .hex { --hx: 3rem; }
.hab-img { width: 3rem; height: 3.3rem; object-fit: contain; flex: none; }
.hab-t { margin: 0; font-size: 1.05rem; line-height: 1.3; }
.hab-sub { margin: .2rem 0 0; font-size: .87rem; color: var(--muted); font-variant-numeric: tabular-nums; }
.hab-sab { list-style: none; margin: 0; padding: 0; display: grid; gap: .4rem; font-size: .92rem; }
.hab-sab li { display: grid; grid-template-columns: 1rem minmax(0, 1fr); gap: .5rem; line-height: 1.45; }
.hab-sab .ico { margin-top: .2rem; color: var(--faint); }
.hab-clase[data-e="ganada"] .hab-sab .ico { color: var(--gold); }
.hab-pie { display: flex; flex-wrap: wrap; align-items: center; gap: .4rem 1rem; padding-top: .7rem; border-top: 1px solid var(--line); font-size: .86rem; color: var(--muted); }
.pasos-cab { display: flex; align-items: baseline; justify-content: space-between; gap: 1rem; margin: 0 0 .6rem; }
.pasos-cab h2 { margin: 0; font-size: 1.05rem; }
.pasos-cab span { font-size: .86rem; color: var(--muted); font-variant-numeric: tabular-nums; }
.pasos { list-style: none; margin: 0; padding: 0; display: grid; gap: .5rem; counter-reset: paso; }
.pasos .step { border-left-width: 1px; border-left-color: var(--line); }
.pasos .step.done { background: var(--s2); border-color: var(--line); }
.pasos .check.on { background: var(--ok); border-color: var(--ok); }
.pasos .paso-n { font-size: .78rem; font-weight: 700; color: var(--muted); font-variant-numeric: tabular-nums; }
`;

const GRUPOS: { title: string; icon: string; k: string; kinds: string[] }[] = [
  { title: "Vídeos", icon: "video", k: "video", kinds: ["video"] }, // primero: es lo que más se busca al volver a una clase
  { title: "Diapositivas y documentos", icon: "file", k: "slides", kinds: ["slides", "pdf", "doc", "note", "pptx"] },
  { title: "Adjuntos para descargar", icon: "box", k: "zip", kinds: ["zip", "file"] },
  { title: "Repositorios", icon: "git", k: "repo", kinds: ["repo"] },
  { title: "Enlaces", icon: "globe", k: "link", kinds: ["link"] },
];

export default component$(() => {
  const loc = useLocation();
  const session = useContext(SessionContext);
  useStyles$(CSS);
  const st = useStore<{ l: Lesson | null; c: Course | null; qs: Question[]; certs: Certificate[]; error: string; busy: string }>({ l: null, c: null, qs: [], certs: [], error: "", busy: "" });
  const tab = useSignal("ruta");
  const outlineOpen = useSignal(false);
  const ask = useStore({ open: false, body: "", objective: "", minute: "", sending: false });
  const qFilter = useSignal("todas");
  const answerText = useStore<Record<string, string>>({});

  const load = $(async () => {
    st.error = "";
    const id = pathId("lessons");
    try {
      const [l, qs] = await Promise.all([api.lesson(id), api.questions(id)]);
      st.l = l;
      st.qs = qs;
      setTitle(l.title);
      if (session.me) saveLast(session.me.id, { lesson: l.id, title: l.title, course: l.course.slug, courseTitle: l.course.title, at: Date.now() });
      [st.c, st.certs] = await Promise.all([api.course(l.course.slug).catch(() => null), api.misCertificados().catch(() => [] as Certificate[])]);
    } catch (e) {
      if (!requireLogin(e)) st.error = errMsg(e);
    }
  });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async ({ track }) => {
    track(() => loc.url.pathname);
    track(() => session.loaded);
    session.help = "sesion";
    if (!session.loaded) return;
    st.l = null;
    tab.value = getParam("tab") || "ruta";
    outlineOpen.value = false;
    await load();
  });

  const select = $((id: string) => {
    tab.value = id;
    setParams({ tab: id === "ruta" ? "" : id, s: "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  const toggle = $(async (step: string, done: boolean) => {
    if (!st.l) return;
    st.busy = step;
    try {
      st.l.progress = await api.setProgress(st.l.id, step, done);
      const p = st.l.progress;
      toast(session, p.done === p.total ? "¡Ciclo completo! Sesión terminada." : done ? `Paso hecho · ${p.done}/${p.total}` : "Paso desmarcado", done ? "ok" : "info");
    } catch (e) {
      if (!requireLogin(e)) toast(session, errMsg(e), "bad");
    } finally {
      st.busy = "";
    }
  });

  const sendQuestion = $(async () => {
    if (!st.l || !ask.body.trim()) return;
    ask.sending = true;
    try {
      const body: { body_md: string; objective_id?: string; video_ts?: number } = { body_md: ask.body };
      if (ask.objective) body.objective_id = ask.objective;
      if (ask.minute) body.video_ts = Math.max(0, Math.round(parseFloat(ask.minute) * 60));
      await api.ask(st.l.id, body);
      ask.body = "";
      ask.minute = "";
      ask.open = false;
      st.qs = await api.questions(st.l.id);
      toast(session, "Pregunta publicada");
    } catch (e) {
      if (!requireLogin(e)) toast(session, errMsg(e), "bad");
    } finally {
      ask.sending = false;
    }
  });

  const sendAnswer = $(async (qid: string) => {
    const text = (answerText[qid] ?? "").trim();
    if (!text || !st.l) return;
    try {
      await api.answer(qid, text);
      answerText[qid] = "";
      st.qs = await api.questions(st.l.id);
      toast(session, "Respuesta publicada");
    } catch (e) {
      if (!requireLogin(e)) toast(session, errMsg(e), "bad");
    }
  });

  const resolve = $(async (qid: string, resolved: boolean) => {
    if (!st.l) return;
    try {
      await api.resolve(qid, resolved);
      st.qs = await api.questions(st.l.id);
      toast(session, resolved ? "Marcada como resuelta" : "Pregunta reabierta", "info");
    } catch (e) {
      if (!requireLogin(e)) toast(session, errMsg(e), "bad");
    }
  });

  if (st.error) return <ErrorState message={st.error} retry$={load} />;
  const l = st.l;
  if (!l) return <Loading lines={7} />;

  const me = session.me;
  const staff = isStaff(me);
  // Valores primitivos: al marcar un paso cambia el objeto progress entero y así todo se repinta.
  const done = l.progress.done;
  const totalSteps = l.progress.total;
  const state = lessonState(done, totalSteps, l.published);
  const deck = l.materials.find((m) => (m.slides?.length ?? 0) > 0);
  const downloads = l.materials.filter((m) => m === deck || (m.kind === "pdf" && /diapositiva/i.test(m.title)));
  const videos = l.materials.filter((m) => m.kind === "video");
  const open = st.qs.filter((q) => !q.resolved).length;
  const qs = st.qs.filter((q) => (qFilter.value === "abiertas" ? !q.resolved : qFilter.value === "mias" ? q.user_id === me?.id : true));
  const objTitle = (id: string) => l.objectives.find((o) => o.id === id)?.title ?? id;
  // La habilidad de esta clase: su número en el curso y, si ya la ganó, su insignia.
  const numClase = (st.c?.modules.flatMap((m) => m.lessons).filter((x) => x.published || staff).findIndex((x) => x.id === l.id) ?? -1) + 1;
  const insignia = st.certs.find((c) => c.ambito === "clase" && c.lesson_id === l.id && c.estado === "valido");
  const modIndex = Math.max(0, st.c?.modules.findIndex((m) => m.id === l.module.id) ?? 0);

  const tabs = [
    { id: "ruta", label: "Mi ruta", icon: "cycle", count: totalSteps - done },
    ...(deck ? [{ id: "diapositivas", label: "Diapositivas", icon: "slides", count: deck.slides?.length }] : []),
    { id: "contenido", label: "Contenido", icon: "book" },
    { id: "materiales", label: "Materiales", icon: "clip", count: l.materials.length },
    { id: "preguntas", label: "Preguntas", icon: "chat", count: open },
    ...(l.assignments.length ? [{ id: "tareas", label: "Tareas", icon: "task", count: l.assignments.length }] : []),
  ];

  const matRow = (m: Material) => {
    const dl = ADJUNTO.has(m.kind) || m.kind === "pdf";
    return (
      <a key={m.id} class="item" data-k={m.kind} href={m.url} target={dl ? undefined : "_blank"} rel="noopener" download={ADJUNTO.has(m.kind) || undefined}>
        <span class="lead-ico"><Icon name={KIND_ICON[m.kind] ?? "link"} /></span>
        <span class="grow">
          <div class="t sm">{m.title}</div>
          <div class="d">
            {KINDS[m.kind] ?? m.kind}
            {m.objective_ids.length > 0 && ` · ${m.objective_ids.map(objTitle).map((t) => t.split(" ").slice(0, 4).join(" ")).join(" · ")}`}
          </div>
        </span>
        <Icon name={ADJUNTO.has(m.kind) ? "download" : "external"} class="faint" />
      </a>
    );
  };

  const stepRow = (s: Lesson["cycle"][number], i: number) => {
    const ok = !!l.progress.steps[s.id];
    return (
      <li class={`step ${ok ? "done" : ""}`} key={s.id}>
        <button type="button" class={`check ${ok ? "on" : ""}`} aria-pressed={ok} aria-label={`${ok ? "Desmarcar" : "Marcar"}: ${s.title}`} disabled={st.busy === s.id} onClick$={() => toggle(s.id, !ok)}>
          {ok && <Icon name="check" size={14} />}
        </button>
        <div>
          <div class="row">
            <span class="paso-n">Paso {i + 1}</span>
            <span class="t" style="font-weight:650">{s.title}</span>
            <span class="badge"><Icon name={TOOL_ICON[s.tool] ?? "zap"} size={12} /> {TOOLS[s.tool] ?? s.tool}</span>
          </div>
          <div class="sm muted" style="margin-top:.2rem">{s.description}</div>
          {s.check && (
            <div class="xs" style="margin-top:.35rem">
              <span class="faint">Comprobación: </span>
              <code>{s.check}</code>
            </div>
          )}
        </div>
      </li>
    );
  };

  return (
    <div class="split left">
      <aside>
        <button type="button" class="btn ghost sm outline-toggle" style="width:100%;justify-content:center;margin-bottom:.5rem" onClick$={() => (outlineOpen.value = !outlineOpen.value)}>
          <Icon name="layers" size={14} /> Temario del curso <Icon name="chevronDown" size={14} />
        </button>
        <nav class={`outline card ${outlineOpen.value ? "open" : ""}`} style="padding:.4rem" aria-label="Temario">
          <Link href={`/courses/${l.course.slug}/`} class="row" style="font-weight:650;color:var(--fg)">
            <Icon name="book" /> {l.course.title}
          </Link>
          {st.c?.modules.map((m) => (
            <div key={m.id}>
              <div class="mod">{m.title}</div>
              {m.lessons
                .filter((x) => x.published || staff)
                .map((x) => {
                  const s = x.id === l.id ? state : lessonState(x.steps_done, x.steps, x.published);
                  return (
                    <Link key={x.id} href={`/lessons/${x.id}/`} class={x.id === l.id ? "on" : ""}>
                      <span class={s.cls}><Icon name={s.icon} size={15} /></span>
                      <span>{x.title}</span>
                    </Link>
                  );
                })}
            </div>
          ))}
          {!st.c && <Loading lines={2} />}
        </nav>
      </aside>

      <article style="min-width:0">
        <Crumbs items={[{ href: "/courses/", label: "Aprender" }, { href: `/courses/${l.course.slug}/`, label: l.course.title }, { label: l.module.title }]} />
        <div class="head card" data-ph={modToken(modIndex)}>
          <div class="grow">
            <h1>{l.title}</h1>
            <div class="row sm muted" style="margin-top:.35rem;gap:.8rem">
              <span class={`badge ${state.cls === "muted" ? "" : state.cls}`}><Icon name={state.icon} size={12} /> {state.label}</span>
              {l.starts_at && <span title={fmtDate(l.starts_at)}><Icon name="calendar" size={13} /> {fmtDate(l.starts_at)}</span>}
              <span><Icon name="cycle" size={13} /> {done}/{totalSteps} pasos</span>
              {!l.published && <span class="badge warn"><Icon name="lock" size={12} /> Borrador: solo lo ve el instructor</span>}
            </div>
          </div>
        </div>

        <AhoraClase l={l} ocupado={st.busy} onLogre$={(id: string) => toggle(id, true)} />
        <LiveEntrada lesson={l.id} staff={isStaff(session.me)} />

        <Tabs tabs={tabs} active={tab.value} onSelect$={select} />

        {tab.value === "ruta" && (
          <div class="split">
            <div class="stack">
              {/* Los videos de la clase van arriba de todo: los propios se reproducen aquí mismo, los externos abren en otra pestaña. */}
              {videos.length > 0 && (
                <section class="card" data-testid="videos-clase">
                  <div class="section-t" style="margin-top:0"><Icon name="video" /> {videos.length === 1 ? "Video de la clase" : "Videos de la clase"}</div>
                  <div style="display:grid;gap:.75rem;grid-template-columns:repeat(auto-fit,minmax(min(100%,17rem),1fr))">
                    {videos.map((m) =>
                      /\.(mp4|webm)(\?|$)/i.test(m.url) ? (
                        <figure key={m.id} style="margin:0">
                          <video controls preload="metadata" playsInline src={m.url} style="display:block;width:100%;aspect-ratio:16/9;border-radius:8px;background:#000" />
                          <figcaption class="sm" style="margin-top:.35rem">{m.title}</figcaption>
                        </figure>
                      ) : (
                        <a key={m.id} class="btn ghost" href={m.url} target="_blank" rel="noopener"><Icon name="video" size={15} /> {m.title}</a>
                      ),
                    )}
                  </div>
                </section>
              )}
              {l.objectives.length > 0 && (
                <section class="card hab-clase" data-e={insignia ? "ganada" : "camino"} aria-labelledby="hab-t" data-testid="habilidad-clase">
                  <div class="hab-cab">
                    {insignia?.url_insignia_png ? (
                      <img class="hab-img" src={insignia.url_insignia_png} alt={`Tu insignia de la clase ${numClase || ""}`} width={48} height={53} />
                    ) : (
                      <Hex estado={insignia ? "ganada" : "camino"} n={numClase || undefined} />
                    )}
                    <div style="min-width:0">
                      <h2 id="hab-t" class="hab-t">{insignia ? "Ya ganaste la habilidad de esta clase" : "La habilidad que ganas en esta clase"}</h2>
                      <p class="hab-sub">
                        {insignia
                          ? `Insignia entregada el ${fmtDate(insignia.emitido_en, false)}.`
                          : `Al completar la clase recibes su insignia. Llevas ${done} de ${totalSteps} pasos.`}
                      </p>
                    </div>
                  </div>
                  <ul class="hab-sab" aria-label={insignia ? "Lo que ya sabes hacer" : "Al terminar podrás"}>
                    {l.objectives.map((o) => (
                      <li key={o.id}><Icon name={insignia ? "check" : "target"} size={14} /><span>{o.title}</span></li>
                    ))}
                  </ul>
                  <div class="hab-pie">
                    <span>Cada insignia suma al certificado de {l.course.title.split(" · ")[0]}.</span>
                    <Link href="/grades/">Ver mis logros <Icon name="chevronRight" size={13} /></Link>
                  </div>
                </section>
              )}

              <section class="card" aria-labelledby="pasos-t">
                <div class="pasos-cab">
                  <h2 id="pasos-t">Pasos de la clase</h2>
                  <span>{done} de {totalSteps}</span>
                </div>
                <ol class="pasos">{l.cycle.map((s, i) => stepRow(s, i))}</ol>
              </section>

            </div>
            <aside class="stack">
              {l.recording && (
                <a class="btn" style="width:100%;justify-content:center" href={l.recording.url} target="_blank" rel="noopener">
                  <Icon name="video" size={15} /> Ver grabación
                </a>
              )}
              {l.recording?.passcode && <div class="hint">Código: <code>{l.recording.passcode}</code></div>}
              {l.assignments.map((a) => (
                <Link key={a.id} class="card" href={`/assignments/${a.id}/`} data-testid="proyecto-clase">
                  <div class="xs faint" style="font-weight:700;text-transform:uppercase;letter-spacing:.06em">Proyecto de esta clase</div>
                  <b style="display:block;margin:.2rem 0">{a.title}</b>
                  {a.due_at && <div class="sm muted" title={fmtDate(a.due_at)}>Vence {rel(a.due_at)}</div>}
                  <div class="sm" style="margin-top:.4rem;color:var(--accent);font-weight:650">Ver rúbrica y entregar</div>
                </Link>
              ))}
              {l.repo && (
                <section class="card">
                  <div class="section-t" style="margin-top:0"><Icon name="git" /> Código de la sesión</div>
                  <div class="row">
                    <a class="btn ghost sm" href={l.repo.url} target="_blank" rel="noopener"><Icon name="external" size={14} /> {l.repo.url.replace(/^https?:\/\//, "")} · {l.repo.ref}</a>
                  </div>
                  <div class="hint" style="margin-top:.5rem">Clonarlo con los materiales, desde la terminal:</div>
                  <Copy text={l.open_command} />
                </section>
              )}
              {deck && (
                <button type="button" class="card row" style="width:100%;text-align:left;cursor:pointer;color:inherit;font:inherit" onClick$={() => select("diapositivas")}>
                  <img src={deck.slides![0]} alt="" width={96} height={54} style="border-radius:5px;border:1px solid var(--line)" />
                  <span class="grow"><b class="sm">Diapositivas</b><div class="xs muted">{deck.slides!.length} diapositivas</div></span>
                  <Icon name="chevronRight" class="faint" />
                </button>
              )}
            </aside>
          </div>
        )}

        {tab.value === "diapositivas" && deck && <Slides deck={deck} downloads={downloads} />}

        {tab.value === "contenido" &&
          (l.content_html.trim() ? <Prose html={l.content_html} toc /> : <Empty icon="book" title="Sin contenido escrito" text="Esta sesión no tiene texto todavía; revisa las diapositivas y los materiales." />)}

        {tab.value === "materiales" &&
          (l.materials.length === 0 ? (
            <Empty icon="clip" title="Sin materiales todavía" />
          ) : (
            GRUPOS.map((g) => {
              const ms = l.materials.filter((m) => g.kinds.includes(m.kind));
              return ms.length ? (
                <section key={g.title} data-k={g.k}>
                  <div class="section-t"><Icon name={g.icon} /> {g.title}</div>
                  <div class="list">{ms.map(matRow)}</div>
                </section>
              ) : null;
            })
          ))}

        {tab.value === "preguntas" && (
          <>
            <div class="row" style="margin-bottom:.75rem">
              <Chip on={qFilter.value === "todas"} onClick$={() => (qFilter.value = "todas")}>Todas · {st.qs.length}</Chip>
              <Chip on={qFilter.value === "abiertas"} onClick$={() => (qFilter.value = "abiertas")}>Sin resolver · {open}</Chip>
              <Chip on={qFilter.value === "mias"} onClick$={() => (qFilter.value = "mias")}>Mías</Chip>
              <span class="grow" />
              <button type="button" class="btn sm" onClick$={() => (ask.open = !ask.open)}>
                <Icon name={ask.open ? "x" : "chat"} size={14} /> {ask.open ? "Cancelar" : "Nueva pregunta"}
              </button>
            </div>
            {ask.open && (
              <form class="card" style="margin-bottom:.75rem" preventdefault:submit onSubmit$={sendQuestion}>
                <label for="q" style="margin-top:0">Tu pregunta</label>
                <textarea id="q" required value={ask.body} placeholder="Qué intentabas, qué pasó y el error completo (pégalo entre ```)" onInput$={(_, el) => (ask.body = el.value)} />
                <div class="row" style="align-items:flex-end">
                  <span class="grow" style="min-width:12rem">
                    <label for="qo">Objetivo (opcional)</label>
                    <select id="qo" value={ask.objective} onChange$={(_, el) => (ask.objective = el.value)}>
                      <option value="">—</option>
                      {l.objectives.map((o) => (
                        <option key={o.id} value={o.id}>{o.title}</option>
                      ))}
                    </select>
                  </span>
                  <span style="width:8rem">
                    <label for="qm">Minuto del vídeo</label>
                    <input id="qm" type="number" min="0" step="0.5" value={ask.minute} onInput$={(_, el) => (ask.minute = el.value)} />
                  </span>
                  <button type="submit" class="btn" disabled={ask.sending || !ask.body.trim()}>
                    <Icon name="send" size={14} /> Publicar
                  </button>
                </div>
                <div class="hint">También desde la terminal: <code>jmd ask {l.id} "…"</code></div>
              </form>
            )}
            {qs.length === 0 ? (
              <Empty icon="chat" title={st.qs.length ? "Nada con este filtro" : "Nadie ha preguntado todavía"} text={st.qs.length ? undefined : "Si algo no te funciona, pregunta: a otro compañero le estará pasando lo mismo."} />
            ) : (
              <div class="list">
                {qs.map((q) => (
                  <div class="q" id={`q-${q.id}`} key={q.id}>
                    <div class="meta">
                      <b style="color:var(--fg)">{q.user_name}</b>
                      <span title={fmtDate(q.created_at)}>{rel(q.created_at)}</span>
                      {q.objective_id && <span class="badge"><Icon name="target" size={11} /> {objTitle(q.objective_id).split(" ").slice(0, 5).join(" ")}</span>}
                      {q.video_ts > 0 && <span class="badge"><Icon name="video" size={11} /> {Math.floor(q.video_ts / 60)}:{String(q.video_ts % 60).padStart(2, "0")}</span>}
                      {q.code_ref && <code>{q.code_ref.path}:{q.code_ref.line}</code>}
                      {q.resolved ? <span class="badge ok"><Icon name="checkCircle" size={11} /> resuelta</span> : <span class="badge warn">abierta</span>}
                    </div>
                    <div class="body">{q.body_md}</div>
                    {q.answers.map((a) => (
                      <div class="ans" key={a.id}>
                        <div class="meta"><b style="color:var(--fg)">{a.user_name}</b><span title={fmtDate(a.created_at)}>{rel(a.created_at)}</span></div>
                        <div class="body">{a.body_md}</div>
                      </div>
                    ))}
                    <div class="row" style="margin-top:.5rem;flex-wrap:nowrap">
                      <input placeholder="Responder…" value={answerText[q.id] ?? ""} onInput$={(_, el) => (answerText[q.id] = el.value)} onKeyDown$={(e) => e.key === "Enter" && sendAnswer(q.id)} />
                      <button type="button" class="btn ghost sm" onClick$={() => sendAnswer(q.id)} aria-label="Responder"><Icon name="send" size={14} /></button>
                      {me && (staff || me.id === q.user_id) && (
                        <button type="button" class="btn ghost sm" onClick$={() => resolve(q.id, !q.resolved)}>
                          <Icon name={q.resolved ? "refresh" : "check"} size={14} /> {q.resolved ? "Reabrir" : "Resuelta"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab.value === "tareas" && (
          <div class="list">
            {l.assignments.map((a) => (
              <Link key={a.id} class="item" href={`/assignments/${a.id}/`}>
                <span class="lead-ico"><Icon name="task" /></span>
                <span class="grow">
                  <div class="t">{a.title}</div>
                  {a.due_at && <div class="d" title={fmtDate(a.due_at)}>Entrega {rel(a.due_at)} · {fmtDate(a.due_at)}</div>}
                </span>
                <Icon name="chevronRight" class="faint" />
              </Link>
            ))}
          </div>
        )}

        <div class="row" style="margin-top:2rem;padding-top:1rem;border-top:1px solid var(--line)">
          {l.prev ? <Link class="btn ghost sm" href={`/lessons/${l.prev}/`}><Icon name="chevronLeft" size={14} /> Sesión anterior</Link> : <span />}
          <span class="grow" />
          {l.next && <Link class="btn ghost sm" href={`/lessons/${l.next}/`}>Siguiente sesión <Icon name="chevronRight" size={14} /></Link>}
        </div>
      </article>
    </div>
  );
});

// Se genera una sola página (/lessons/_/); el servidor la sirve para cualquier sesión.
export const onStaticGenerate: StaticGenerateHandler = async () => ({ params: [{ id: "_" }] });

export const head: DocumentHead = { title: "Sesión" };
