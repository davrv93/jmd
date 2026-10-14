import { component$, useContext, useStore, useVisibleTask$, $ } from "@builder.io/qwik";
import { Link, type DocumentHead } from "@builder.io/qwik-city";
import { api, errMsg, fmtDate, LEVEL, rel, requireLogin, STATUS, type AssignmentSummary, type Course, type ExampleSummary } from "~/lib/api";
import { SessionContext } from "~/lib/session";
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

  const filas: Fila[] = [];
  for (const c of st.cursos) {
    const clases = Object.fromEntries(c.modules.flatMap((m) => m.lessons).map((l) => [l.id, l.title]));
    for (const a of c.assignments) filas.push({ ...a, curso: c.title, clase: clases[a.lesson_id] ?? "" });
  }
  const porEntregar = filas
    .filter((f) => f.status === "pending" || f.status === "overdue")
    .sort((a, b) => (a.due_at ?? "9").localeCompare(b.due_at ?? "9"));
  const siguiente = porEntregar[0];

  // Prácticas agrupadas por clase, en el orden del temario.
  const ordenClase = new Map<string, number>();
  for (const c of st.cursos) c.modules.flatMap((m) => m.lessons).forEach((l, i) => ordenClase.set(l.id, i));
  const grupos = new Map<string, { titulo: string; items: ExampleSummary[] }>();
  for (const e of st.ej) {
    const k = e.lesson_id || "_";
    if (!grupos.has(k)) grupos.set(k, { titulo: e.lesson_title || "Sin clase", items: [] });
    grupos.get(k)!.items.push(e);
  }
  const clasesPracticas = [...grupos.entries()].sort((a, b) => (ordenClase.get(a[0]) ?? 99) - (ordenClase.get(b[0]) ?? 99));

  return (
    <>
      <div class="head">
        <span class="lead-ico" style="width:46px;height:46px"><Icon name="task" size={22} /></span>
        <div class="grow">
          <h1>Proyectos</h1>
          <p>Lo que construyes en cada clase: los proyectos que se califican con su rúbrica y las prácticas guiadas que te preparan para ellos.</p>
        </div>
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

      <section aria-labelledby="eval-t" style="margin-bottom:1.6rem">
        <h2 id="eval-t" class="h2-sec">Proyectos evaluados</h2>
        {filas.length === 0 ? (
          <Empty icon="task" title="Sin proyectos todavía" text="Cuando el instructor publique uno, aparecerá aquí con su fecha y su rúbrica." />
        ) : (
          <div class="semana" data-testid="proyectos-evaluados">
            {filas.map((f) => (
              <Link key={f.id} class="it" href={`/assignments/${f.id}/`}>
                <span class="lead-ico"><Icon name="task" /></span>
                <span class="grow" style="min-width:0">
                  <b>{f.title}</b>
                  <div class="sm muted">
                    {f.clase || f.curso}
                    {f.due_at && <span title={fmtDate(f.due_at)}> · vence {rel(f.due_at)}</span>}
                    {` · ${f.max_score} puntos`}
                  </div>
                </span>
                {f.score != null && (
                  <span class="badge gold">
                    {f.score}/{f.max_score}
                  </span>
                )}
                <Status s={STATUS[f.status] ?? STATUS.pending} />
              </Link>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="prac-t">
        <div class="row" style="justify-content:space-between;align-items:baseline">
          <h2 id="prac-t" class="h2-sec">Prácticas guiadas</h2>
          {st.ej.length > 0 && <Link href="/examples/" class="sm">Buscar entre las {st.ej.length} prácticas</Link>}
        </div>
        {st.ej.length === 0 ? (
          <Empty icon="sparkles" title="Sin prácticas todavía" />
        ) : (
          <div class="stack" data-testid="practicas-por-clase">
            {clasesPracticas.map(([k, g]) => (
              <div key={k}>
                <div class="section-t" style="margin-top:.4rem">{g.titulo}</div>
                <div class="practicas-grid">
                  {g.items.map((e) => (
                    <Link key={e.id} class="card practica" href={`/examples/${e.id}/`}>
                      <b style="display:block">{e.title}</b>
                      <span class="sm muted" style="display:block">{e.summary}</span>
                      {e.level && <span class={`badge ${LEVEL[e.level] ?? ""}`}>{e.level}</span>}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
});

export const head: DocumentHead = { title: "Proyectos" };
