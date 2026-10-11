import { component$, useContext, useSignal, useStore, useVisibleTask$, $ } from "@builder.io/qwik";
import { Link, useLocation, type DocumentHead, type StaticGenerateHandler } from "@builder.io/qwik-city";
import { api, errMsg, fmtDate, LEVEL, rel, requireLogin, STATUS, type Course, type ExampleSummary } from "~/lib/api";
import { SessionContext, isStaff } from "~/lib/session";
import { getParam, pathId, setParams, setTitle } from "~/lib/url";
import { modToken, PHASE_BY_ID, PHASES } from "~/lib/kolb";
import { Icon } from "~/components/icon";
import { Crumbs, Empty, ErrorState, lessonState, Loading, Ring, Status, Tabs } from "~/components/ui";

export default component$(() => {
  const loc = useLocation();
  const session = useContext(SessionContext);
  const st = useStore<{ c: Course | null; ex: ExampleSummary[] | null; error: string }>({ c: null, ex: null, error: "" });
  const tab = useSignal("temario");

  const load = $(async () => {
    st.error = "";
    const slug = pathId("courses");
    try {
      st.c = await api.course(slug);
      setTitle(st.c.title);
      st.ex = await api.examples(st.c.id).catch(() => []);
    } catch (e) {
      if (!requireLogin(e)) st.error = errMsg(e);
    }
  });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async ({ track }) => {
    track(() => loc.url.pathname);
    session.help = "curso";
    tab.value = getParam("tab") || "temario";
    await load();
  });

  const select = $((id: string) => {
    tab.value = id;
    setParams({ tab: id === "temario" ? "" : id });
  });

  if (st.error) return <ErrorState message={st.error} retry$={load} />;
  const c = st.c;
  if (!c) return <Loading lines={6} />;

  const lessons = c.modules.flatMap((m) => m.lessons).filter((l) => l.published || isStaff(session.me));
  let d = 0,
    t = 0;
  for (const l of lessons) if (l.published) {
      d += Math.min(l.steps_done, l.steps);
      t += l.steps;
    }
  const next = lessons.find((l) => l.published && l.steps_done < l.steps) ?? lessons[0];
  const staff = isStaff(session.me);

  return (
    <>
      <Crumbs items={[{ href: "/courses/", label: "Aprender" }, { label: c.title }]} />
      <div class="head">
        <Ring pct={t ? (100 * d) / t : 0} size={58} />
        <div class="grow">
          <h1>{c.title}</h1>
          <p>{c.description}</p>
        </div>
        <div class="row">
          {staff && (
            <Link class="btn ghost sm" href={`/instructor/${c.slug}/`}>
              <Icon name="users" size={14} /> Avance de alumnos
            </Link>
          )}
          {next && (
            <Link class="btn" href={`/lessons/${next.id}/`}>
              <Icon name="play" size={15} /> {d > 0 ? "Continuar" : "Empezar"}
            </Link>
          )}
        </div>
      </div>

      <Tabs
        active={tab.value}
        onSelect$={select}
        tabs={[
          { id: "temario", label: "Temario", icon: "layers", count: lessons.length },
          { id: "tareas", label: "Tareas", icon: "task", count: c.assignments.length },
          { id: "ejemplos", label: "Prácticas", icon: "sparkles", count: st.ex?.length ?? 0 },
        ]}
      />

      {tab.value === "temario" &&
        (c.modules.length === 0 ? (
          <Empty icon="layers" title="Sin sesiones todavía" text="El instructor publicará aquí las sesiones del curso." />
        ) : (
          <div class="stack">
            <div class="section-t" style="margin-top:.2rem"><Icon name="cycle" /> Cada sesión sigue estas fases</div>
            <div class="ph-track" style="margin-bottom:.4rem">
              {PHASES.map((p) => (
                <div class="ph-card" data-ph={p.token} key={p.id}>
                  <div class="ph-card__h">
                    <span class="ph-ico"><Icon name={p.icon} size={15} /></span>
                    <span class="ph-n">Fase {p.n}</span>
                  </div>
                  <div class="ph-t">{p.short}</div>
                  <div class="ph-sub">{p.verb} · {p.description}</div>
                </div>
              ))}
            </div>

            {c.modules.map((m, mi) => {
              const ls = m.lessons.filter((l) => l.published || staff);
              return (
                <section key={m.id} data-ph={modToken(mi)}>
                  <div class="section-t"><Icon name="layers" /> {m.title}</div>
                  {ls.length === 0 ? (
                    <p class="sm faint">Sin sesiones publicadas todavía.</p>
                  ) : (
                    <div class="list">
                      {ls.map((l, i) => {
                        const s = lessonState(l.steps_done, l.steps, l.published);
                        return (
                          <Link key={l.id} class="item franja" href={`/lessons/${l.id}/`}>
                            <span class={s.cls} data-tip={s.label}><Icon name={s.icon} size={20} /></span>
                            <span class="grow">
                              <div class="t">{l.title}</div>
                              <div class="d row" style="gap:.8rem">
                                <span>Sesión {i + 1}</span>
                                {l.starts_at && <span title={fmtDate(l.starts_at)}><Icon name="calendar" size={12} /> {fmtDate(l.starts_at, false)}</span>}
                                <span><Icon name="target" size={12} /> {l.objectives} objetivos</span>
                                <span><Icon name="cycle" size={12} /> {l.steps_done}/{l.steps} pasos</span>
                              </div>
                            </span>
                            {!l.published && <span class="badge warn"><Icon name="lock" size={12} /> borrador</span>}
                            <Icon name="chevronRight" class="faint" />
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        ))}

      {tab.value === "tareas" &&
        (c.assignments.length === 0 ? (
          <Empty icon="task" title="Sin tareas todavía" text="Cuando el instructor publique una tarea, la verás aquí con su fecha de entrega." />
        ) : (
          <div class="list">
            {c.assignments.map((a) => (
              <Link key={a.id} class="item" href={`/assignments/${a.id}/`}>
                <span class="lead-ico"><Icon name="task" /></span>
                <span class="grow">
                  <div class="t">{a.title}</div>
                  <div class="d" title={fmtDate(a.due_at)}>
                    {a.due_at ? `Entrega ${rel(a.due_at)} · ${fmtDate(a.due_at)}` : "Sin fecha límite"} · {a.max_score} puntos
                  </div>
                </span>
                {a.score != null && <span class="badge ok">{a.score}/{a.max_score}</span>}
                <Status s={STATUS[a.status] ?? STATUS.pending} />
              </Link>
            ))}
          </div>
        ))}

      {tab.value === "ejemplos" &&
        (st.ex === null ? (
          <Loading lines={3} />
        ) : st.ex.length === 0 ? (
          <Empty icon="sparkles" title="Sin prácticas todavía" text="Aquí aparecerán casos prácticos con código para copiar." />
        ) : (
          <div class="grid">
            {st.ex.map((e) => (
              <Link key={e.id} class="card" href={`/examples/${e.id}/`}>
                <div class="row" style="margin-bottom:.35rem">
                  <span class="lead-ico"><Icon name="sparkles" /></span>
                  <b class="grow">{e.title}</b>
                </div>
                <p class="sm muted" style="margin:0 0 .5rem">{e.summary}</p>
                <div class="row">
                  {e.phase && PHASE_BY_ID[e.phase] && (
                    <span class="badge ph" data-ph={PHASE_BY_ID[e.phase].token}>
                      <Icon name={PHASE_BY_ID[e.phase].icon} size={11} /> {PHASE_BY_ID[e.phase].short}
                    </span>
                  )}
                  <span class={`badge ${LEVEL[e.level] ?? ""}`}>{e.level}</span>
                  {e.tags.map((tg) => (
                    <span key={tg} class="badge"><Icon name="tag" size={11} /> {tg}</span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        ))}
    </>
  );
});

// Se genera una sola página (/courses/_/); el servidor la sirve para cualquier curso.
export const onStaticGenerate: StaticGenerateHandler = async () => ({ params: [{ slug: "_" }] });

export const head: DocumentHead = { title: "Curso" };
