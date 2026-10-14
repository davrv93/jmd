import { component$, useContext, useStore, useVisibleTask$, $ } from "@builder.io/qwik";
import { Link, type DocumentHead } from "@builder.io/qwik-city";
import { api, errMsg, fmtDate, LEVEL, rel, requireLogin, STATUS, type AssignmentSummary, type Course, type ExampleSummary } from "~/lib/api";
import { SessionContext, isStaff } from "~/lib/session";
import { setTitle } from "~/lib/url";
import { Icon } from "~/components/icon";
import { Empty, ErrorState, Loading, Status } from "~/components/ui";
import { Ahora } from "~/components/ahora";

// Proyectos: en un solo lugar, los proyectos evaluados de cada clase (las tareas, con su rúbrica y su
// revisión) y las prácticas guiadas que los preparan, ordenadas por clase. Arriba, «Ahora»: el
// proyecto que vence primero y aún no entregaste.

interface Fila extends AssignmentSummary {
  curso: string;
  clase: string;
}

export default component$(() => {
  const session = useContext(SessionContext);
  const st = useStore<{ cursos: Course[] | null; ej: ExampleSummary[]; error: string }>({ cursos: null, ej: [], error: "" });

  const load = $(async () => {
    st.error = "";
    try {
      const list = await api.courses();
      st.cursos = await Promise.all(list.map((c) => api.course(c.slug)));
      const ejs = await Promise.all(st.cursos.map((c) => api.examples(c.id).catch(() => [] as ExampleSummary[])));
      st.ej = ejs.flat();
    } catch (e) {
      if (!requireLogin(e)) st.error = errMsg(e);
    }
  });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async ({ track }) => {
    session.help = "tarea";
    setTitle("Proyectos");
    track(() => session.loaded);
    if (!session.loaded) return;
    await load();
  });

  if (st.error) return <ErrorState message={st.error} retry$={load} />;
  if (!st.cursos) return <Loading lines={5} />;

  const staff = isStaff(session.me);
  const filas: Fila[] = [];
  for (const c of st.cursos) {
    const clases = Object.fromEntries(c.modules.flatMap((m) => m.lessons).map((l) => [l.id, l.title]));
    for (const a of c.assignments) filas.push({ ...a, curso: c.title, clase: clases[a.lesson_id] ?? "" });
  }
  const porEntregar = filas
    .filter((f) => f.status === "pending" || f.status === "overdue")
    .sort((a, b) => (a.due_at ?? "9").localeCompare(b.due_at ?? "9"));
  const siguiente = staff ? undefined : porEntregar[0];

  // Agrupado por curso (cada grupo es su propio curso) y, dentro, por proyecto: cada clase con su
  // proyecto evaluado y las prácticas guiadas que lo preparan, en el orden del temario.
  const cursos = st.cursos.map((c) => {
    const clases = c.modules.flatMap((m) => m.lessons).filter((l) => l.published || staff);
    const proyectos = clases
      .map((l) => ({
        clase: l,
        tareas: filas.filter((f) => f.lesson_id === l.id && c.assignments.some((a) => a.id === f.id)),
        practicas: st.ej.filter((e) => e.lesson_id === l.id),
      }))
      .filter((g) => g.tareas.length || g.practicas.length);
    return { c, proyectos, nTareas: c.assignments.length, nPract: proyectos.reduce((n, g) => n + g.practicas.length, 0) };
  });

  return (
    <>
      <div class="head">
        <span class="lead-ico" style="width:46px;height:46px"><Icon name="task" size={22} /></span>
        <div class="grow">
          <h1>Proyectos</h1>
          <p>Lo que construyes en cada clase: su proyecto, que se califica con rúbrica, y las prácticas guiadas que te preparan para él.</p>
        </div>
        {st.ej.length > 0 && (
          <Link href="/examples/" class="btn ghost sm">
            <Icon name="search" size={14} /> Buscar prácticas
          </Link>
        )}
      </div>

      {siguiente && (
        <Ahora
          etiqueta={`Ahora · ${siguiente.clase.split(" · ")[0] || "proyecto"}${siguiente.due_at ? ` · vence ${rel(siguiente.due_at)}` : ""}`}
          titulo={siguiente.title}
          descripcion="Lee el enunciado y la rúbrica; entrega la URL de tu repositorio y el commit."
          accion="Ver y entregar"
          href={`/assignments/${siguiente.id}/`}
          avance={`${filas.length - porEntregar.length} de ${filas.length} proyectos entregados`}
          pct={filas.length ? (100 * (filas.length - porEntregar.length)) / filas.length : 0}
        />
      )}

      {cursos.every((x) => x.proyectos.length === 0) && (
        <Empty icon="task" title="Sin proyectos todavía" text="Cuando el instructor publique uno, aparecerá aquí con su fecha y su rúbrica." />
      )}

      <div class="stack" data-testid="proyectos-por-curso">
        {cursos
          .filter((x) => x.proyectos.length)
          .map((x, ci) => (
            <details key={x.c.id} class="curso-proy" open={ci === 0 || cursos.length === 1}>
              <summary>
                <span class="grow">
                  <b>{x.c.title}</b>
                  <span class="sm muted"> · {x.nTareas} {x.nTareas === 1 ? "proyecto" : "proyectos"} · {x.nPract} prácticas</span>
                </span>
                <Icon name="chevronDown" class="faint" />
              </summary>
              <div class="proy-lista">
                {x.proyectos.map((g) => (
                  <section key={g.clase.id} class="proy" aria-label={g.clase.title} data-testid="proyecto">
                    <div class="proy-clase">{g.clase.title}</div>
                    {g.tareas.map((f) => (
                      <Link key={f.id} class="proy-tarea" href={`/assignments/${f.id}/`}>
                        <span class="lead-ico"><Icon name="task" /></span>
                        <span class="grow" style="min-width:0">
                          <b>{f.title}</b>
                          <div class="sm muted">
                            {f.due_at ? <span title={fmtDate(f.due_at)}>Vence {rel(f.due_at)}</span> : "Sin fecha límite"}
                            {` · ${f.max_score} puntos`}
                          </div>
                        </span>
                        {f.score != null && (
                          <span class="badge gold">
                            {f.score}/{f.max_score}
                          </span>
                        )}
                        {staff ? <span class="btn ghost sm">Ver y calificar</span> : <Status s={STATUS[f.status] ?? STATUS.pending} />}
                      </Link>
                    ))}
                    {g.practicas.length > 0 && (
                      <div class="proy-pract">
                        <div class="xs faint" style="font-weight:700;text-transform:uppercase;letter-spacing:.06em">Prácticas que te preparan · {g.practicas.length}</div>
                        <div class="practicas-grid">
                          {g.practicas.map((e) => (
                            <Link key={e.id} class="card practica" href={`/examples/${e.id}/`}>
                              <b style="display:block">{e.title}</b>
                              <span class="sm muted" style="display:block">{e.summary}</span>
                              {e.level && <span class={`badge ${LEVEL[e.level] ?? ""}`}>{e.level}</span>}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </section>
                ))}
              </div>
            </details>
          ))}
      </div>
    </>
  );
});

export const head: DocumentHead = { title: "Proyectos" };
