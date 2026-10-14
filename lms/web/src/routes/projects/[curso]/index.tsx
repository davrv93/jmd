import { component$, useContext, useSignal, useStore, useVisibleTask$, $ } from "@builder.io/qwik";
import { Link, type DocumentHead, type StaticGenerateHandler } from "@builder.io/qwik-city";
import { api, errMsg, fmtDate, LEVEL, rel, requireLogin, STATUS, type Course, type ExampleSummary } from "~/lib/api";
import { SessionContext, isStaff } from "~/lib/session";
import { getParam, pathId, setParams, setTitle } from "~/lib/url";
import { Icon } from "~/components/icon";
import { Crumbs, Empty, ErrorState, Loading, Status } from "~/components/ui";
import { Ahora } from "~/components/ahora";

// Proyectos de un curso (/projects/<curso>/): cada clase con su proyecto evaluado (la tarea, con su
// rúbrica y su revisión) y las prácticas guiadas que lo preparan, en el orden del temario.
// ?sesion=<id> resalta esa clase y la lleva a la vista; al elegir una clase la URL se actualiza.

export default component$(() => {
  const session = useContext(SessionContext);
  const st = useStore<{ c: Course | null; ej: ExampleSummary[]; error: string }>({ c: null, ej: [], error: "" });
  const actual = useSignal("");

  const load = $(async () => {
    st.error = "";
    try {
      st.c = await api.course(pathId("projects"));
      setTitle(`Proyectos · ${st.c.title}`);
      st.ej = await api.examples(st.c.id).catch(() => [] as ExampleSummary[]);
      const pedida = getParam("sesion");
      if (pedida) {
        actual.value = pedida;
        setTimeout(() => document.getElementById(`proy-${pedida}`)?.scrollIntoView({ block: "start", behavior: "smooth" }), 50);
      }
    } catch (e) {
      if (!requireLogin(e)) st.error = errMsg(e);
    }
  });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async ({ track }) => {
    session.help = "tarea";
    track(() => session.loaded);
    if (!session.loaded) return;
    await load();
  });

  const elegir = $((id: string) => {
    actual.value = actual.value === id ? "" : id;
    setParams({ sesion: actual.value });
  });

  if (st.error) return <ErrorState message={st.error} retry$={load} />;
  const c = st.c;
  if (!c) return <Loading lines={5} />;

  const staff = isStaff(session.me);
  const clases = c.modules.flatMap((m) => m.lessons).filter((l) => l.published || staff);
  const proyectos = clases
    .map((l) => ({ clase: l, tareas: c.assignments.filter((a) => a.lesson_id === l.id), practicas: st.ej.filter((e) => e.lesson_id === l.id) }))
    .filter((g) => g.tareas.length || g.practicas.length);
  const porEntregar = c.assignments.filter((a) => a.status === "pending" || a.status === "overdue").sort((a, b) => (a.due_at ?? "9").localeCompare(b.due_at ?? "9"));
  const siguiente = staff ? undefined : porEntregar[0];
  const claseDe = (id: string) => clases.find((l) => l.id === id)?.title ?? "";

  return (
    <>
      <Crumbs items={[{ href: "/projects/", label: "Proyectos" }, { label: c.title }]} />
      <div class="head">
        <span class="lead-ico" style="width:46px;height:46px"><Icon name="task" size={22} /></span>
        <div class="grow">
          <h1>{c.title}</h1>
          <p>Cada clase con su proyecto, que se califica con rúbrica, y las prácticas guiadas que te preparan para él.</p>
        </div>
      </div>

      {siguiente && (
        <Ahora
          etiqueta={`Ahora · ${claseDe(siguiente.lesson_id).split(" · ").find((x) => /^Clase/.test(x)) ?? "proyecto"}${siguiente.due_at ? ` · vence ${rel(siguiente.due_at)}` : ""}`}
          titulo={siguiente.title}
          descripcion="Lee el enunciado y la rúbrica; entrega la URL de tu repositorio y el commit."
          accion="Ver y entregar"
          href={`/assignments/${siguiente.id}/`}
          avance={`${c.assignments.length - porEntregar.length} de ${c.assignments.length} proyectos entregados`}
          pct={c.assignments.length ? (100 * (c.assignments.length - porEntregar.length)) / c.assignments.length : 0}
        />
      )}

      {proyectos.length === 0 ? (
        <Empty icon="task" title="Sin proyectos todavía" text="Cuando el instructor publique uno, aparecerá aquí con su fecha y su rúbrica." />
      ) : (
        <div class="proy-lista proy-lista--sola" data-testid="proyectos-curso">
          {proyectos.map((g) => (
            <section key={g.clase.id} id={`proy-${g.clase.id}`} class={`proy${actual.value === g.clase.id ? " on" : ""}`} aria-labelledby={`proy-t-${g.clase.id}`} data-testid="proyecto">
              <button type="button" class="proy-clase" id={`proy-t-${g.clase.id}`} aria-pressed={actual.value === g.clase.id} onClick$={() => elegir(g.clase.id)}>
                {g.clase.title}
              </button>
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
      )}
    </>
  );
});

// Se genera una sola página (/projects/_/); el servidor la sirve para cualquier curso.
export const onStaticGenerate: StaticGenerateHandler = async () => ({ params: [{ curso: "_" }] });

export const head: DocumentHead = { title: "Proyectos" };
