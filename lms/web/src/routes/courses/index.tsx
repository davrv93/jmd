import { component$, useContext, useStore, useVisibleTask$, $ } from "@builder.io/qwik";
import { Link, type DocumentHead } from "@builder.io/qwik-city";
import { api, errMsg, fmtDate, rel, requireLogin, STATUS, type AssignmentSummary, type Course } from "~/lib/api";
import { SessionContext } from "~/lib/session";
import { loadLast, setTitle, type LastSeen } from "~/lib/url";
import { modToken, PHASES } from "~/lib/kolb";
import { Icon } from "~/components/icon";
import { Empty, ErrorState, Loading, Ring, Status } from "~/components/ui";

// Inicio: cómo aprendes, continuar, cursos con su avance y próximas entregas.
export default component$(() => {
  const session = useContext(SessionContext);
  const st = useStore<{ courses: Course[] | null; error: string; last: LastSeen | null }>({ courses: null, error: "", last: null });

  const load = $(async () => {
    st.error = "";
    try {
      const list = await api.courses();
      st.courses = await Promise.all(list.map((c) => api.course(c.slug)));
    } catch (e) {
      if (!requireLogin(e)) st.error = errMsg(e);
    }
  });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async ({ track }) => {
    session.help = "inicio";
    setTitle("Aprender");
    track(() => session.loaded);
    if (!session.loaded) return;
    if (session.me) st.last = loadLast(session.me.id);
    await load();
  });

  const pct = (c: Course) => {
    let d = 0,
      t = 0;
    for (const m of c.modules) for (const l of m.lessons) if (l.published) {
      d += Math.min(l.steps_done, l.steps);
      t += l.steps;
    }
    return t ? (100 * d) / t : 0;
  };
  // Siguiente sesión sin completar de cada curso (para «Continuar» si no hay historial).
  const nextLesson = (c: Course) => {
    for (const m of c.modules) for (const l of m.lessons) if (l.published && l.steps_done < l.steps) return l;
    return c.modules[0]?.lessons[0];
  };
  const pending: (AssignmentSummary & { course: string })[] = [];
  for (const c of st.courses ?? [])
    for (const a of c.assignments) if (a.status === "pending" || a.status === "overdue") pending.push({ ...a, course: c.title });
  pending.sort((a, b) => (a.due_at ?? "9").localeCompare(b.due_at ?? "9"));

  const first = session.me?.name.split(" ")[0] ?? "";
  const cont = st.last ?? (st.courses?.[0] ? (() => {
    const l = nextLesson(st.courses![0]);
    return l ? { lesson: l.id, title: l.title, course: st.courses![0].slug, courseTitle: st.courses![0].title, at: 0 } : null;
  })() : null);

  return (
    <>
      <section class="welcome" aria-labelledby="hola">
        <span class="welcome-ico" aria-hidden="true"><Icon name="grad" size={26} /></span>
        <div class="welcome-txt">
          <h1 id="hola">{first ? `Hola, ${first}` : "Aprender"}</h1>
          <p>Aprendes con el ciclo de Kolb: vives la clase, reflexionas, entiendes el porqué y lo aplicas.</p>
        </div>
        {st.courses && cont && (
          <Link class="welcome-next" href={`/lessons/${cont.lesson}/`}>
            <span class="lead-ico"><Icon name="play" size={18} /></span>
            <span class="grow">
              <span class="xs">{st.last ? "Continuar donde lo dejaste" : "Empieza por aquí"} · {cont.courseTitle}</span>
              <b>{cont.title}</b>
            </span>
            <span class="btn sm">Continuar <Icon name="chevronRight" size={14} /></span>
          </Link>
        )}
      </section>

      {st.error && <ErrorState message={st.error} retry$={load} />}
      {!st.error && st.courses === null && <Loading lines={3} />}

      {st.courses && (
        <>
          <div class="section-t"><Icon name="cycle" /> Así aprendes</div>
          <div class="ph-track" style="margin-bottom:1.2rem">
            {PHASES.map((p) => (
              <div class="ph-card" data-ph={p.token} key={p.id}>
                <div class="ph-card__h">
                  <span class="ph-ico"><Icon name={p.icon} size={16} /></span>
                  <span class="ph-n">Fase {p.n}</span>
                </div>
                <div class="ph-t">{p.short}</div>
                <div class="ph-sub">{p.description}</div>
              </div>
            ))}
          </div>

          <div class="split">
            <section>
              <div class="section-t"><Icon name="book" /> Mis cursos</div>
              {st.courses.length === 0 && (
                <Empty icon="book" title="Todavía no estás en ningún curso" text="Pide al instructor que te añada a la cohorte; aparecerá aquí." />
              )}
              <div class="stack">
                {st.courses.map((c) => {
                  const lessons = c.modules.flatMap((m) => m.lessons).filter((l) => l.published);
                  const done = lessons.filter((l) => l.steps > 0 && l.steps_done >= l.steps).length;
                  return (
                    <Link key={c.id} class="card" href={`/courses/${c.slug}/`} data-ph={modToken(0)} style="border-left:5px solid var(--ph)">
                      <div class="row" style="gap:.9rem;align-items:flex-start">
                        <Ring pct={pct(c)} size={50} />
                        <div class="grow">
                          <div style="font-weight:700;font-size:1.02rem">{c.title}</div>
                          <p class="sm muted" style="margin:.2rem 0 .5rem">{c.description}</p>
                          <div class="row xs muted" style="gap:.9rem">
                            <span><Icon name="layers" size={13} /> {c.modules.length} {c.modules.length === 1 ? "módulo" : "módulos"}</span>
                            <span><Icon name="checkCircle" size={13} /> {done}/{lessons.length} sesiones completadas</span>
                            <span><Icon name="task" size={13} /> {c.assignments.length} tareas</span>
                            {!!c.examples_total && <span><Icon name="sparkles" size={13} /> {c.examples_total} ejemplos</span>}
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>

            <aside>
              <div class="section-t"><Icon name="calendar" /> Próximas entregas</div>
              {pending.length === 0 ? (
                <Empty icon="checkCircle" title="Nada pendiente" text="Cuando haya una tarea por entregar, aparecerá aquí." />
              ) : (
                <div class="list">
                  {pending.slice(0, 6).map((a) => (
                    <Link key={a.id} class="item" href={`/assignments/${a.id}/`}>
                      <span class="lead-ico" data-k="zip"><Icon name="task" /></span>
                      <span class="grow">
                        <div class="t sm">{a.title}</div>
                        <div class="d" title={fmtDate(a.due_at)}>{a.due_at ? `Vence ${rel(a.due_at)}` : "Sin fecha límite"}</div>
                      </span>
                      <Status s={STATUS[a.status] ?? STATUS.pending} />
                    </Link>
                  ))}
                </div>
              )}
              <div class="section-t"><Icon name="zap" /> Atajos</div>
              <div class="list">
                <Link class="item" href="/examples/"><span class="lead-ico" data-ph="ea"><Icon name="sparkles" /></span><span class="grow t sm">Prácticas con código</span><Icon name="chevronRight" class="faint" /></Link>
                <Link class="item" href="/links/"><span class="lead-ico" data-ph="or"><Icon name="link" /></span><span class="grow t sm">Recursos publicados</span><Icon name="chevronRight" class="faint" /></Link>
                <Link class="item" href="/grades/"><span class="lead-ico" data-ph="ca"><Icon name="award" /></span><span class="grow t sm">Mis notas</span><Icon name="chevronRight" class="faint" /></Link>
              </div>
            </aside>
          </div>
        </>
      )}
    </>
  );
});

export const head: DocumentHead = { title: "Aprender" };
