import { component$, useContext, useSignal, useStore, useVisibleTask$, $ } from "@builder.io/qwik";
import { Link, useLocation, type DocumentHead, type StaticGenerateHandler } from "@builder.io/qwik-city";
import { api, errMsg, fmtDate, rel, requireLogin, STATUS, type Course, type CourseProgress } from "~/lib/api";
import { SessionContext } from "~/lib/session";
import { getParam, pathId, setParams, setTitle } from "~/lib/url";
import { Icon } from "~/components/icon";
import { Bar, Crumbs, Empty, ErrorState, Loading, Status, Tabs } from "~/components/ui";

export default component$(() => {
  const loc = useLocation();
  const session = useContext(SessionContext);
  const st = useStore<{ c: Course | null; p: CourseProgress | null; error: string }>({ c: null, p: null, error: "" });
  const tab = useSignal("avance");
  const q = useSignal("");
  const load = $(async () => {
    st.error = "";
    const slug = pathId("instructor");
    try {
      const [c, p] = await Promise.all([api.course(slug), api.courseProgress(slug)]);
      st.c = c;
      st.p = p;
      setTitle(`Avance · ${c.title}`);
    } catch (e) {
      if (!requireLogin(e)) st.error = errMsg(e);
    }
  });
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async ({ track }) => {
    track(() => loc.url.pathname);
    session.help = "instructor";
    tab.value = getParam("tab") || "avance";
    await load();
  });
  const select = $((id: string) => {
    tab.value = id;
    setParams({ tab: id === "avance" ? "" : id });
  });

  if (st.error) return <ErrorState message={st.error} retry$={load} />;
  if (!st.c || !st.p) return <Loading lines={6} />;
  const { c, p } = st;
  const total = p.lessons.reduce((s, l) => s + l.steps, 0);
  const term = q.value.trim().toLowerCase();
  const students = p.students
    .map((s) => ({ ...s, done: p.lessons.reduce((acc, l) => acc + Math.min(s.lessons?.[l.id] ?? 0, l.steps), 0) }))
    .filter((s) => !term || `${s.name} ${s.email}`.toLowerCase().includes(term))
    .sort((a, b) => b.done - a.done || a.name.localeCompare(b.name));
  const avg = p.students.length && total ? students.reduce((s, x) => s + x.done, 0) / (students.length * total) : 0;

  return (
    <>
      <Crumbs items={[{ href: "/instructor/", label: "Instructor" }, { label: c.title }]} />
      <div class="head">
        <div class="grow">
          <h1>{c.title}</h1>
          <p>Pasos del ciclo hechos por alumno y sesión.</p>
        </div>
        <Link class="btn ghost sm" href={`/courses/${c.slug}/`}><Icon name="user" size={14} /> Ver como alumno</Link>
      </div>
      <div class="facts" style="margin-bottom:1rem">
        <div class="fact"><div class="k">Alumnos</div><div class="v">{p.students.length}</div></div>
        <div class="fact"><div class="k">Sesiones</div><div class="v">{p.lessons.length}</div></div>
        <div class="fact"><div class="k">Avance medio</div><div class="v gold">{Math.round(avg * 100)}%</div></div>
        <div class="fact"><div class="k">Tareas</div><div class="v">{c.assignments.length}</div></div>
      </div>
      <Tabs active={tab.value} onSelect$={select} tabs={[{ id: "avance", label: "Avance", icon: "cycle", count: p.students.length }, { id: "tareas", label: "Tareas", icon: "task", count: c.assignments.length }]} />

      {tab.value === "avance" &&
        (p.students.length === 0 ? (
          <Empty icon="users" title="Todavía no hay alumnos en la cohorte" />
        ) : (
          <>
            <span class="field-ico" style="display:block;max-width:22rem;margin-bottom:.7rem">
              <Icon name="search" />
              <input type="search" placeholder="Buscar alumno" value={q.value} onInput$={(_, el) => (q.value = el.value)} />
            </span>
            <div class="card scroll-x" style="padding:.2rem .4rem">
              <table class="t">
                <thead>
                  <tr>
                    <th>Alumno</th>
                    <th>Total</th>
                    {p.lessons.map((l) => (
                      <th key={l.id}><Link href={`/lessons/${l.id}/`} style="color:inherit">{l.title.split("·")[0]}</Link></th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <b class="sm">{s.name}</b>
                        <div class="xs muted">{s.email}</div>
                      </td>
                      <td style="min-width:8rem">
                        <div class="xs">{total ? Math.round((100 * s.done) / total) : 0}%</div>
                        <Bar pct={total ? (100 * s.done) / total : 0} />
                      </td>
                      {p.lessons.map((l) => {
                        const d = s.lessons?.[l.id] ?? 0;
                        return (
                          <td key={l.id} class="sm" style="min-width:6rem">
                            <span class={d >= l.steps && l.steps ? "ok" : d ? "accent" : "faint"}>
                              <Icon name={d >= l.steps && l.steps ? "checkCircle" : d ? "half" : "circle"} size={14} /> {d}/{l.steps}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ))}

      {tab.value === "tareas" && (
        <div class="list">
          {c.assignments.map((a) => (
            <Link key={a.id} class="item" href={`/assignments/${a.id}/?tab=calificar`}>
              <span class="lead-ico"><Icon name="task" /></span>
              <span class="grow">
                <div class="t">{a.title}</div>
                <div class="d" title={fmtDate(a.due_at)}>{a.due_at ? `Entrega ${rel(a.due_at)}` : "Sin fecha"} · abrir para calificar</div>
              </span>
              <Status s={STATUS[a.status] ?? STATUS.pending} />
            </Link>
          ))}
          {c.assignments.length === 0 && <div class="item muted sm">Sin tareas.</div>}
        </div>
      )}
    </>
  );
});

export const onStaticGenerate: StaticGenerateHandler = async () => ({ params: [{ slug: "_" }] });

export const head: DocumentHead = { title: "Avance del curso" };
