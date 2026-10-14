import { component$, useContext, useSignal, useStore, useVisibleTask$, $ } from "@builder.io/qwik";
import { Link, type DocumentHead } from "@builder.io/qwik-city";
import { api, errMsg, requireLogin, type CourseSummary, type LinkItem } from "~/lib/api";
import { SessionContext } from "~/lib/session";
import { getParam, setParams, setTitle } from "~/lib/url";
import { ADJUNTO, origen, TIPOS, tipoDe } from "~/lib/recursos";
import { Icon } from "~/components/icon";
import { Empty, ErrorState, Loading } from "~/components/ui";

// Recursos (/links/): primero eliges el curso o grupo y entras a su detalle (/links/<curso>/, con
// sus sesiones). El buscador recorre todos los cursos y lleva a la sesión de cada resultado
// (/links/<curso>/?sesion=<id>). Con un solo curso se entra directo a su detalle.

interface Resumen {
  c: CourseSummary;
  recursos: number;
  sesiones: number;
  porTipo: { id: string; label: string; n: number }[];
}

export default component$(() => {
  const session = useContext(SessionContext);
  const st = useStore<{ cursos: CourseSummary[] | null; list: LinkItem[]; error: string }>({ cursos: null, list: [], error: "" });
  const q = useSignal("");

  const load = $(async () => {
    st.error = "";
    try {
      const [cursos, list] = await Promise.all([api.courses(), api.links()]);
      st.list = list;
      st.cursos = cursos.filter((c) => list.some((l) => l.course_id === c.id));
      // Un solo curso: directo a su detalle (conserva la búsqueda).
      if (st.cursos.length === 1 && !q.value) location.replace(`/links/${encodeURIComponent(st.cursos[0].slug)}/${location.search}`);
    } catch (e) {
      if (!requireLogin(e)) st.error = errMsg(e);
    }
  });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async ({ cleanup }) => {
    session.help = "enlaces";
    setTitle("Recursos");
    q.value = getParam("q");
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && !(e.target as HTMLElement).closest("input, textarea")) {
        e.preventDefault();
        document.getElementById("buscar")?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    cleanup(() => document.removeEventListener("keydown", onKey));
    await load();
  });

  if (st.error) return <ErrorState message={st.error} retry$={load} />;
  if (!st.cursos) return <Loading lines={4} />;

  const resumen: Resumen[] = st.cursos.map((c) => {
    const ls = st.list.filter((l) => l.course_id === c.id);
    return {
      c,
      recursos: ls.length,
      sesiones: new Set(ls.map((l) => l.lesson_id)).size,
      porTipo: TIPOS.map((t) => ({ id: t.id, label: t.label, n: ls.filter((l) => tipoDe(l.kind).id === t.id).length })).filter((x) => x.n),
    };
  });
  const slugDe = Object.fromEntries(st.cursos.map((c) => [c.id, c.slug]));
  const term = q.value.trim().toLowerCase();
  const hallados = term ? st.list.filter((l) => `${l.title} ${l.url} ${l.lesson_title} ${l.course_title}`.toLowerCase().includes(term)) : [];

  return (
    <>
      <div class="head">
        <span class="lead-ico" data-ph="or"><Icon name="link" size={22} /></span>
        <div class="grow">
          <h1>Recursos</h1>
          <p>Elige el curso o grupo para ver sus recursos por sesión, o busca en todos a la vez.</p>
        </div>
      </div>

      <div class="toolbar" role="search">
        <span class="field-ico grow" style="min-width:14rem;max-width:30rem">
          <Icon name="search" />
          <input id="buscar" type="search" placeholder="Buscar en todos los cursos  ( / )" aria-label="Buscar recursos" value={q.value} onInput$={(_, el) => ((q.value = el.value), setParams({ q: el.value }))} />
        </span>
      </div>

      {term ? (
        hallados.length === 0 ? (
          <Empty icon="search" title="Nada coincide" text="Prueba con otra palabra." />
        ) : (
          <section aria-label="Resultados" data-testid="recursos-resultados">
            <p class="rec-resumen" aria-live="polite">
              {hallados.length} {hallados.length === 1 ? "recurso" : "recursos"} · «{q.value.trim()}»
            </p>
            <div class="list">
              {hallados.slice(0, 80).map((l) => {
                const t = tipoDe(l.kind);
                const descarga = ADJUNTO.has(l.kind);
                const curso = slugDe[l.course_id] ?? l.course_id;
                return (
                  <div key={l.course_id + l.lesson_id + l.id} class="rec-fila" data-k={t.id}>
                    <span class="lead-ico"><Icon name={t.icon} size={15} /></span>
                    <span class="grow" style="min-width:0">
                      <a class="rec-t" href={l.url} target={descarga ? undefined : "_blank"} rel="noopener" download={descarga || undefined}>{l.title}</a>
                      <div class="rec-d">
                        <span class="dom">{origen(l.url)}</span>
                        {/* <a> y no <Link>: la navegación interna de Qwik a una ruta con parámetro pierde ?sesion= */}
                        <a href={`/links/${encodeURIComponent(curso)}/?sesion=${encodeURIComponent(l.lesson_id)}`} class="rec-obj">
                          {l.course_title} · {l.lesson_title}
                        </a>
                      </div>
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )
      ) : resumen.length === 0 ? (
        <Empty icon="link" title="Sin recursos todavía" text="Cuando el instructor publique enlaces o archivos, aparecerán aquí por curso." />
      ) : (
        <div class="rec-cursos" data-testid="recursos-cursos">
          {resumen.map((r) => (
            <Link key={r.c.id} class="card rec-curso-card" href={`/links/${encodeURIComponent(r.c.slug)}/`}>
              <b>{r.c.title}</b>
              <span class="sm muted">
                {r.sesiones} {r.sesiones === 1 ? "sesión" : "sesiones"} · {r.recursos} recursos
              </span>
              <span class="rec-barra" aria-hidden="true">
                {r.porTipo.map((x) => (
                  <i key={x.id} data-k={x.id} style={`flex:${x.n}`} title={`${x.label}: ${x.n}`} />
                ))}
              </span>
              <span class="row xs muted" style="gap:.3rem .7rem">
                {r.porTipo.map((x) => (
                  <span key={x.id}>
                    {x.label} {x.n}
                  </span>
                ))}
              </span>
              <span class="sm" style="color:var(--accent);font-weight:650">
                Ver recursos por sesión <Icon name="chevronRight" size={13} />
              </span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
});

export const head: DocumentHead = { title: "Recursos" };
