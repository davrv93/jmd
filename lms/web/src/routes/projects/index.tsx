import { component$, useContext, useSignal, useStore, useVisibleTask$, $ } from "@builder.io/qwik";
import { Link, type DocumentHead } from "@builder.io/qwik-city";
import { api, errMsg, requireLogin, type Course, type ExampleSummary } from "~/lib/api";
import { SessionContext, isStaff } from "~/lib/session";
import { getParam, setParams, setTitle } from "~/lib/url";
import { Icon } from "~/components/icon";
import { Empty, ErrorState, Loading } from "~/components/ui";

// Proyectos (/projects/): primero eliges el curso o grupo y entras a su detalle
// (/projects/<curso>/, cada clase con su proyecto y sus prácticas). El buscador recorre los
// proyectos y las prácticas de todos los cursos y lleva a la clase de cada resultado
// (/projects/<curso>/?sesion=<id>). Con un solo curso se entra directo a su detalle.

interface Hallazgo {
  tipo: "proyecto" | "práctica";
  titulo: string;
  curso: Course;
  clase: string;
  claseId: string;
}

export default component$(() => {
  const session = useContext(SessionContext);
  const st = useStore<{ cursos: Course[] | null; ej: Record<string, ExampleSummary[]>; error: string }>({ cursos: null, ej: {}, error: "" });
  const q = useSignal("");

  const load = $(async () => {
    st.error = "";
    try {
      const list = await api.courses();
      // Un solo curso: directo a su detalle (conserva la búsqueda).
      if (list.length === 1 && !q.value) {
        location.replace(`/projects/${encodeURIComponent(list[0].slug)}/${location.search}`);
        return;
      }
      const cursos = await Promise.all(list.map((c) => api.course(c.slug)));
      const ejs = await Promise.all(cursos.map((c) => api.examples(c.id).catch(() => [] as ExampleSummary[])));
      st.ej = Object.fromEntries(cursos.map((c, i) => [c.id, ejs[i]]));
      st.cursos = cursos;
    } catch (e) {
      if (!requireLogin(e)) st.error = errMsg(e);
    }
  });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async ({ track, cleanup }) => {
    session.help = "tarea";
    setTitle("Proyectos");
    q.value = getParam("q");
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && !(e.target as HTMLElement).closest("input, textarea")) {
        e.preventDefault();
        document.getElementById("buscar")?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    cleanup(() => document.removeEventListener("keydown", onKey));
    track(() => session.loaded);
    if (!session.loaded) return;
    await load();
  });

  if (st.error) return <ErrorState message={st.error} retry$={load} />;
  if (!st.cursos) return <Loading lines={4} />;

  const staff = isStaff(session.me);
  const term = q.value.trim().toLowerCase();
  const hallados: Hallazgo[] = [];
  if (term)
    for (const c of st.cursos) {
      const clases = Object.fromEntries(c.modules.flatMap((m) => m.lessons).map((l) => [l.id, l.title]));
      for (const a of c.assignments)
        if (`${a.title} ${clases[a.lesson_id] ?? ""}`.toLowerCase().includes(term))
          hallados.push({ tipo: "proyecto", titulo: a.title, curso: c, clase: clases[a.lesson_id] ?? "", claseId: a.lesson_id });
      for (const e of st.ej[c.id] ?? [])
        if (`${e.title} ${e.summary} ${e.tags.join(" ")}`.toLowerCase().includes(term))
          hallados.push({ tipo: "práctica", titulo: e.title, curso: c, clase: e.lesson_title, claseId: e.lesson_id });
    }

  return (
    <>
      <div class="head">
        <span class="lead-ico" style="width:46px;height:46px"><Icon name="task" size={22} /></span>
        <div class="grow">
          <h1>Proyectos</h1>
          <p>Elige el curso o grupo para ver cada clase con su proyecto y sus prácticas, o busca en todos a la vez.</p>
        </div>
      </div>

      <div class="toolbar" role="search">
        <span class="field-ico grow" style="min-width:14rem;max-width:30rem">
          <Icon name="search" />
          <input id="buscar" type="search" placeholder="Buscar proyectos y prácticas  ( / )" aria-label="Buscar proyectos y prácticas" value={q.value} onInput$={(_, el) => ((q.value = el.value), setParams({ q: el.value }))} />
        </span>
      </div>

      {term ? (
        hallados.length === 0 ? (
          <Empty icon="search" title="Nada coincide" text="Prueba con otra palabra." />
        ) : (
          <section aria-label="Resultados" data-testid="proyectos-resultados">
            <p class="rec-resumen" aria-live="polite">
              {hallados.length} {hallados.length === 1 ? "resultado" : "resultados"} · «{q.value.trim()}»
            </p>
            <div class="semana">
              {hallados.slice(0, 80).map((h, i) => (
                // <a> y no <Link>: la navegación interna de Qwik a una ruta con parámetro pierde ?sesion=
                <a key={i} class="it" href={`/projects/${encodeURIComponent(h.curso.slug)}/?sesion=${encodeURIComponent(h.claseId)}`}>
                  <span class="lead-ico"><Icon name={h.tipo === "proyecto" ? "task" : "sparkles"} /></span>
                  <span class="grow" style="min-width:0">
                    <b>{h.titulo}</b>
                    <div class="sm muted">
                      {h.curso.title} · {h.clase}
                    </div>
                  </span>
                  <span class={`badge ${h.tipo === "proyecto" ? "accent" : ""}`}>{h.tipo}</span>
                </a>
              ))}
            </div>
          </section>
        )
      ) : st.cursos.length === 0 ? (
        <Empty icon="task" title="Sin proyectos todavía" text="Cuando el instructor publique uno, aparecerá aquí por curso." />
      ) : (
        <div class="rec-cursos" data-testid="proyectos-cursos">
          {st.cursos.map((c) => {
            const entregados = c.assignments.filter((a) => a.status !== "pending" && a.status !== "overdue").length;
            const calificados = c.assignments.filter((a) => a.status === "graded").length;
            const clases = c.modules.flatMap((m) => m.lessons).filter((l) => l.published || staff).length;
            return (
              <Link key={c.id} class="card rec-curso-card" href={`/projects/${encodeURIComponent(c.slug)}/`}>
                <b style="display:block">{c.title}</b>
                <span class="sm muted" style="display:block">
                  {clases} clases · {c.assignments.length} proyectos · {(st.ej[c.id] ?? []).length} prácticas
                </span>
                {!staff && c.assignments.length > 0 && (
                  <span style="display:block;margin:.5rem 0 .2rem">
                    <span class="ahora-bar" style="display:block;background:var(--s3)" aria-hidden="true">
                      <i style={`width:${(100 * entregados) / c.assignments.length}%;background:var(--accent)`} />
                    </span>
                    <span class="xs muted">
                      {entregados} de {c.assignments.length} entregados{calificados ? ` · ${calificados} calificados` : ""}
                    </span>
                  </span>
                )}
                <span class="sm" style="display:block;margin-top:.4rem;color:var(--accent);font-weight:650">
                  Ver proyectos por clase <Icon name="chevronRight" size={13} />
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
});

export const head: DocumentHead = { title: "Proyectos" };
