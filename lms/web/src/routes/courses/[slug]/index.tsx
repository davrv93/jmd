import { component$, useContext, useSignal, useStore, useStyles$, useVisibleTask$, $ } from "@builder.io/qwik";
import { Link, useLocation, type DocumentHead, type StaticGenerateHandler } from "@builder.io/qwik-city";
import { api, errMsg, fmtDate, LEVEL, rel, requireLogin, STATUS, type Course, type ExampleSummary } from "~/lib/api";
import { SessionContext, isStaff } from "~/lib/session";
import { getParam, pathId, setParams, setTitle } from "~/lib/url";
import { modToken, PHASE_BY_ID } from "~/lib/kolb";
import { Icon } from "~/components/icon";
import { Crumbs, Empty, ErrorState, lessonState, Loading, Ring, Status, Tabs } from "~/components/ui";
import { pasoActual, type PasoActual } from "~/components/ahora";
import { OpinionesCursoSeccion } from "~/components/opiniones";
import { temaActual } from "~/lib/live";
import { identidadDe, nombreArea, nombreDe } from "~/lib/marca";
import { Portada } from "~/components/portada";
import CSS from "./curso.css?inline";

export default component$(() => {
  useStyles$(CSS);
  const loc = useLocation();
  const session = useContext(SessionContext);
  const st = useStore<{ c: Course | null; ex: ExampleSummary[] | null; error: string; paso: PasoActual | null; opiniones: number }>({ c: null, ex: null, error: "", paso: null, opiniones: 0 });
  const tab = useSignal("temario");

  const load = $(async () => {
    st.error = "";
    const slug = pathId("courses");
    try {
      st.c = await api.course(slug);
      setTitle(st.c.title);
      st.ex = await api.examples(st.c.id).catch(() => []);
      // Solo el número, para la pestaña; la lista la carga la sección al abrirla.
      api.opinionesCurso(st.c.id).then((o) => (st.opiniones = o.total)).catch(() => {});
      // «Ahora»: el primer paso sin hacer de la clase en curso.
      const cur = st.c.modules.flatMap((m) => m.lessons).find((l) => l.published && l.steps_done < l.steps);
      st.paso = cur ? await api.lesson(cur.id).then(pasoActual).catch(() => null) : null;
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
  const id = identidadDe(c);
  const nombre = nombreDe(c);
  let nSesion = 0;

  return (
    <>
      <Crumbs items={[{ href: "/courses/", label: "Mis cursos" }, { label: nombre }]} />
      <header class="cp-cab" data-idc={id.color}>
        <Portada class="cp-portada" nombre={nombre} area={c.area} identidad={id} aspecto={5.2} />
        <div class="cp-cab-in">
          <p class="cp-meta">
            {nombreArea(c.area)}
            {c.grupo && ` · ${c.grupo}`}
            {id.nivel && ` · ${id.nivel}`}
          </p>
          <h1>{nombre}</h1>
          {id.frase && <p class="cp-frase">{id.frase}</p>}
        </div>
      </header>
      <div class="cp-resumen" data-idc={id.color}>
        {id.resultado.length > 0 && (
          <section class="cp-resultado" aria-labelledby="cp-res-t">
            <h2 id="cp-res-t">Qué vas a poder hacer</h2>
            <ul>
              {id.resultado.map((r) => (
                <li key={r}><Icon name="check" size={15} /> {r}</li>
              ))}
            </ul>
          </section>
        )}
        <div class="cp-acciones">
          <Ring pct={t ? (100 * d) / t : 0} size={58} label={`${Math.round(t ? (100 * d) / t : 0)}% de los pasos hechos`} />
          {st.paso && next ? (
            <span class="cp-av">
              <span>Ahora · {next.title.split(" · ")[0]} · paso {st.paso.n} de {st.paso.total}</span>
              <b class="cp-paso">{st.paso.step.title}</b>
            </span>
          ) : (
            <span class="cp-av">
              <b>{d} de {t} pasos</b>
              <span>{lessons.filter((l) => l.published).length} {lessons.filter((l) => l.published).length === 1 ? "sesión publicada" : "sesiones publicadas"}</span>
            </span>
          )}
          {(staff || next) && <span class="row cp-botones">
            {staff && (
              <Link class="btn ghost sm" href={`/instructor/${c.slug}/`}>
                <Icon name="users" size={14} /> Avance de alumnos
              </Link>
            )}
            {next && (
              <Link class="btn" href={`/lessons/${next.id}/`}>
                <Icon name="play" size={15} /> {st.paso ? (d > 0 ? "Continuar" : "Empezar") : d > 0 ? "Repasar" : "Empezar"}
              </Link>
            )}
          </span>}
        </div>
      </div>

      {c.portada && (
        <iframe
          class="portada-curso"
          data-testid="portada-curso"
          src={`/api/v1/courses/${encodeURIComponent(c.id)}/portada${temaActual() ? `?tema=${temaActual()}` : ""}`}
          title={`Portada de ${c.title}`}
          sandbox="allow-scripts allow-same-origin"
        />
      )}

      <Tabs
        active={tab.value}
        onSelect$={select}
        tabs={[
          { id: "temario", label: "Temario", icon: "layers", count: lessons.length },
          { id: "tareas", label: "Tareas", icon: "task", count: c.assignments.length },
          { id: "ejemplos", label: "Prácticas", icon: "sparkles", count: st.ex?.length ?? 0 },
          { id: "opiniones", label: "Opiniones", icon: "star", count: st.opiniones },
        ]}
      />

      {tab.value === "temario" &&
        (c.modules.length === 0 ? (
          <Empty icon="layers" title="Sin sesiones todavía" text="El instructor publicará aquí las sesiones del curso." />
        ) : (
          <div class="stack">
            {c.description && (
              <details class="cp-sobre">
                <summary>Sobre este curso</summary>
                <p>{c.description}</p>
              </details>
            )}
            {((c.proyecto_final && !id.resultado.includes(c.proyecto_final.replace(/\s+/g, " ").trim())) || c.requisitos?.length || c.dedicacion) && (
              <div class="ficha" data-testid="ficha-curso">
                {c.proyecto_final && !id.resultado.includes(c.proyecto_final.replace(/\s+/g, " ").trim()) && (
                  <section class="ficha-proy" aria-labelledby="proy-t">
                    <span class="lead-ico"><Icon name="target" /></span>
                    <div>
                      <h2 id="proy-t" class="h2-sec" style="margin:0 0 .25rem">El proyecto que serás capaz de construir</h2>
                      <p style="margin:0">{c.proyecto_final}</p>
                    </div>
                  </section>
                )}
                {(c.requisitos?.length || c.dedicacion) && (
                  <section class="ficha-req" aria-labelledby="req-t">
                    <h2 id="req-t" class="h2-sec" style="margin:0 0 .3rem">Antes de empezar</h2>
                    {c.requisitos && c.requisitos.length > 0 && (
                      <ul>
                        {c.requisitos.map((r) => (
                          <li key={r}>{r}</li>
                        ))}
                      </ul>
                    )}
                    {c.dedicacion && (
                      <p class="sm" style="margin:.4rem 0 0">
                        <b>Dedicación:</b> {c.dedicacion}
                      </p>
                    )}
                  </section>
                )}
              </div>
            )}
            {c.modules.map((m, mi) => {
              const ls = m.lessons.filter((l) => l.published || staff);
              return (
                <section key={m.id} data-ph={modToken(mi)}>
                  {ls.length !== 1 && <div class="section-t"><Icon name="layers" /> {m.title}</div>}
                  {ls.length === 0 ? (
                    <p class="sm faint">Sin sesiones publicadas todavía.</p>
                  ) : (
                    <div class="list">
                      {ls.map((l) => {
                        const s = lessonState(l.steps_done, l.steps, l.published);
                        const n = ++nSesion;
                        return (
                          <Link key={l.id} class="item cp-ses" href={`/lessons/${l.id}/`}>
                            <span class="cp-mini" data-idc={id.color}>
                              {l.miniatura ? (
                                <img src={l.miniatura} alt="" loading="lazy" decoding="async" width={160} height={90} />
                              ) : (
                                <Portada nombre={nombre} area={c.area} identidad={id} aspecto={16 / 9} n={n} />
                              )}
                              {l.miniatura && <span class="cp-mini-n" aria-hidden="true">{n}</span>}
                            </span>
                            <span class="grow">
                              <div class="t">{l.title}</div>
                              <div class="d row" style="gap:.3rem .8rem">
                                <span class={`cp-estado ${s.cls}`}><Icon name={s.icon} size={13} /> {s.label}</span>
                                {!/^(sesi[oó]n|clase)\s/i.test(l.title) && <span>Sesión {n}</span>}
                                {l.starts_at && <span title={fmtDate(l.starts_at)}><Icon name="calendar" size={12} /> {fmtDate(l.starts_at, false)}</span>}
                                <span><Icon name="cycle" size={12} /> {l.steps_done}/{l.steps} pasos</span>
                              </div>
                              {l.objetivos && l.objetivos.length > 0 && (
                                <ul class="obj-lista" aria-label="Al terminar podrás">
                                  {l.objetivos.map((o) => (
                                    <li key={o}>{o}</li>
                                  ))}
                                </ul>
                              )}
                            </span>
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

      {tab.value === "opiniones" && <OpinionesCursoSeccion course={c.id} />}
    </>
  );
});

// Se genera una sola página (/courses/_/); el servidor la sirve para cualquier curso.
export const onStaticGenerate: StaticGenerateHandler = async () => ({ params: [{ slug: "_" }] });

export const head: DocumentHead = { title: "Curso" };
