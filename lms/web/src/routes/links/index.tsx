import { component$, useContext, useSignal, useStore, useStyles$, useVisibleTask$, $ } from "@builder.io/qwik";
import { type DocumentHead } from "@builder.io/qwik-city";
import { api, errMsg, requireLogin, type AgendaClase, type CourseSummary, type LinkItem } from "~/lib/api";
import { SessionContext } from "~/lib/session";
import { getParam, setParams, setTitle } from "~/lib/url";
import { ADJUNTO, origen, TIPOS, tipoDe } from "~/lib/recursos";
import { Icon } from "~/components/icon";
import { Chip, Empty, ErrorState, Loading, Tabs } from "~/components/ui";

// Recursos (/links/): los cursos del alumno ordenados por lo que toca ahora. Arriba, la próxima
// clase con sus recursos a un toque; debajo, los cursos en pestañas (en curso, próximos,
// terminados) como filas: cada tipo de recurso es un atajo al detalle ya filtrado
// (/links/<curso>/?tipo=). El buscador recorre todos los cursos. Con un solo curso se entra
// directo a su detalle.
//
// Las fechas salen de Mi horario (alumno) o del calendario del instructor (personal). Un curso
// sin clases con fecha no tiene estado y solo aparece en «Todos».

type Estado = "curso" | "proximo" | "terminado" | "sinfecha";

interface Fila {
  c: CourseSummary;
  base: string; // título sin «· Grupo N»
  grupo: string;
  estado: Estado;
  cuando: string; // «Próxima clase: jue 19 nov» · «Empieza el dom 5 dic» · «Terminó el mié 11 nov»
  orden: number;
  recursos: number;
  sesiones: number;
  porTipo: { id: string; label: string; icon: string; n: number }[];
}

const ESTADOS: Record<Estado, { label: string; cls: string }> = {
  curso: { label: "En curso", cls: "ok" },
  proximo: { label: "Próximo", cls: "gold" },
  terminado: { label: "Terminado", cls: "" },
  sinfecha: { label: "", cls: "" },
};

const dia = (iso: string) =>
  new Intl.DateTimeFormat("es-PE", { weekday: "short", day: "numeric", month: "short", timeZone: "America/Lima" }).format(new Date(iso)).replace(/\./g, "");
const hora = (iso: string) => new Intl.DateTimeFormat("es-PE", { hour: "numeric", minute: "2-digit", timeZone: "America/Lima" }).format(new Date(iso));

const CSS = `
.rc-ahora { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: .6rem 1.25rem; align-items: center; padding: 1rem 1.1rem; margin-bottom: 1rem; border: 1px solid var(--line); border-radius: var(--r2); background: var(--s1); box-shadow: var(--card-shadow); }
.rc-ahora h2 { margin: 0; font-size: 1.08rem; line-height: 1.3; text-wrap: balance; }
.rc-ahora p { margin: .2rem 0 0; font-size: .86rem; color: var(--muted); }
.rc-ahora p b { color: var(--gold); font-weight: 650; }
.rc-atajos { display: flex; flex-wrap: wrap; gap: .4rem; grid-column: 1 / -1; }
.rc-atajo { display: inline-flex; align-items: center; gap: .4rem; max-width: 100%; padding: .38rem .7rem; border-radius: 999px; background: var(--k-bg); color: var(--k); font-size: .84rem; font-weight: 600; }
.rc-atajo span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 22rem; }
.rc-atajo:hover { text-decoration: none; box-shadow: inset 0 0 0 1px var(--k); }
.rc-fila { position: relative; display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: .35rem 1rem; align-items: center; padding: .75rem .95rem; }
.rc-fila:hover { background: var(--s2); }
.rc-tit { display: flex; flex-wrap: wrap; align-items: center; gap: .3rem .5rem; }
.rc-t { font-weight: 650; color: var(--fg); line-height: 1.3; }
.rc-t::after { content: ""; position: absolute; inset: 0; }
.rc-t:hover { text-decoration: none; color: var(--accent); }
.rc-t:focus-visible { outline: none; }
.rc-t:focus-visible::after { outline: 2px solid var(--accent); outline-offset: -2px; border-radius: inherit; }
.rc-d { grid-column: 1; font-size: .82rem; color: var(--muted); font-variant-numeric: tabular-nums; }
.rc-cohorte { font-family: var(--mono); font-size: .74rem; color: var(--faint); }
.rc-tipos { position: relative; z-index: 1; grid-row: 1 / span 2; grid-column: 2; display: flex; flex-wrap: wrap; justify-content: flex-end; gap: .3rem; max-width: 19rem; }
.rc-tipo { display: inline-flex; align-items: center; gap: .3rem; padding: .22rem .5rem; border-radius: 999px; background: var(--k-bg); color: var(--k); font-size: .78rem; font-weight: 650; font-variant-numeric: tabular-nums; }
.rc-tipo:hover { text-decoration: none; box-shadow: inset 0 0 0 1px var(--k); }
.rc-filtros { display: flex; flex-wrap: wrap; gap: .35rem; margin: 0 0 .7rem; }
@media (max-width: 720px) {
  .rc-ahora { grid-template-columns: 1fr; }
  .rc-fila { grid-template-columns: 1fr; padding: .7rem .75rem; }
  .rc-tipos { grid-row: auto; grid-column: 1; justify-content: flex-start; max-width: none; }
}
`;

export default component$(() => {
  useStyles$(CSS);
  const session = useContext(SessionContext);
  const st = useStore<{ cursos: CourseSummary[] | null; list: LinkItem[]; clases: AgendaClase[]; error: string }>({ cursos: null, list: [], clases: [], error: "" });
  const q = useSignal("");
  const ver = useSignal("");
  const tipo = useSignal("");

  const load = $(async () => {
    st.error = "";
    try {
      const [cursos, list] = await Promise.all([api.courses(), api.links()]);
      st.list = list;
      st.cursos = cursos.filter((c) => list.some((l) => l.course_id === c.id));
      // Un solo curso: directo a su detalle (conserva la búsqueda).
      if (st.cursos.length === 1 && !q.value) {
        location.replace(`/links/${encodeURIComponent(st.cursos[0].slug)}/${location.search}`);
        return;
      }
      // Fechas: Mi horario para el alumno, el calendario para el personal. Si una falla (el alumno
      // no puede ver el calendario), la página sigue con la otra; sin ninguna, no hay estados.
      const [mio, staff] = await Promise.all([api.horario().catch(() => null), api.agenda().catch(() => null)]);
      const vistas = new Set<string>();
      st.clases = [...(mio?.clases ?? []), ...(staff?.clases ?? [])].filter((k) => k.curso_slug && !vistas.has(k.id) && vistas.add(k.id));
    } catch (e) {
      if (!requireLogin(e)) st.error = errMsg(e);
    }
  });

  const elegir = $((id: string) => {
    ver.value = id;
    setParams({ ver: id });
  });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async ({ cleanup }) => {
    session.help = "enlaces";
    setTitle("Recursos");
    q.value = getParam("q");
    ver.value = getParam("ver");
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

  const ahora = Date.now();
  const titulos = st.cursos.map((c) => c.title);
  const filas: Fila[] = st.cursos.map((c) => {
    const ls = st.list.filter((l) => l.course_id === c.id);
    const ks = st.clases.filter((k) => k.curso_slug === c.slug).sort((a, b) => a.inicio.localeCompare(b.inicio));
    const partes = c.title.split(" · ");
    const conGrupo = partes.length > 1 && /^grupo\b/i.test(partes[partes.length - 1]);
    const sig = ks.find((k) => Date.parse(k.fin) > ahora);
    let estado: Estado = "sinfecha";
    let cuando = "";
    let orden = 0;
    if (ks.length) {
      const ult = ks[ks.length - 1];
      if (!sig) [estado, cuando, orden] = ["terminado", `Terminó el ${dia(ult.fin)}`, -Date.parse(ult.fin)];
      else if (Date.parse(ks[0].inicio) > ahora) [estado, cuando, orden] = ["proximo", `Empieza el ${dia(sig.inicio)}`, Date.parse(sig.inicio)];
      else [estado, cuando, orden] = ["curso", `Próxima clase: ${dia(sig.inicio)}`, Date.parse(sig.inicio)];
    }
    return {
      c,
      base: conGrupo ? partes.slice(0, -1).join(" · ") : c.title,
      // El grupo va como etiqueta aparte, salvo que el título ya lo diga en medio («DeepSeek Harness · Grupo 3 · …»).
      grupo: conGrupo ? partes[partes.length - 1] : ks[0]?.grupo && !c.title.includes(ks[0].grupo) ? ks[0].grupo : "",
      estado,
      cuando,
      orden,
      recursos: ls.length,
      sesiones: new Set(ls.map((l) => l.lesson_id)).size,
      porTipo: TIPOS.map((t) => ({ id: t.id, label: t.label, icon: t.icon, n: ls.filter((l) => tipoDe(l.kind).id === t.id).length })).filter((x) => x.n),
    };
  });
  const de = (e: Estado) => filas.filter((f) => f.estado === e).sort((a, b) => a.orden - b.orden);
  const grupos = { curso: de("curso"), proximos: de("proximo"), terminados: de("terminado") };
  const hayEstados = filas.some((f) => f.estado !== "sinfecha");
  const pestana = ["curso", "proximos", "terminados", "todos"].includes(ver.value) ? ver.value : grupos.curso.length ? "curso" : grupos.proximos.length ? "proximos" : "todos";
  const visibles =
    pestana === "todos" ? [...grupos.curso, ...grupos.proximos, ...grupos.terminados, ...de("sinfecha").sort((a, b) => a.c.title.localeCompare(b.c.title))] : grupos[pestana as "curso" | "proximos" | "terminados"];
  const pestanas = [
    { id: "curso", label: "En curso", icon: "cycle", count: grupos.curso.length },
    { id: "proximos", label: "Próximos", icon: "calendar", count: grupos.proximos.length },
    { id: "terminados", label: "Terminados", icon: "check", count: grupos.terminados.length },
    { id: "todos", label: "Todos", icon: "link", count: filas.length },
  ].filter((p) => p.id === "todos" || p.count > 0);

  // La próxima clase de cualquiera de sus cursos, con lo que más se abre ese día.
  const slugDe = Object.fromEntries(st.cursos.map((c) => [c.id, c.slug]));
  const proxima = st.clases.filter((k) => Date.parse(k.fin) > ahora && st.cursos!.some((c) => c.slug === k.curso_slug)).sort((a, b) => a.inicio.localeCompare(b.inicio))[0];
  const deLaClase = proxima ? st.list.filter((l) => l.lesson_id === proxima.id) : [];
  const atajos = ["slides", "video", "pdf", "zip"].map((id) => deLaClase.find((l) => tipoDe(l.kind).id === id)).filter((l): l is LinkItem => !!l).slice(0, 3);

  const term = q.value.trim().toLowerCase();
  const coinciden = term ? st.list.filter((l) => `${l.title} ${l.url} ${l.lesson_title} ${l.course_title}`.toLowerCase().includes(term)) : [];
  const tiposHallados = TIPOS.filter((t) => coinciden.some((l) => tipoDe(l.kind).id === t.id));
  const hallados = tipo.value ? coinciden.filter((l) => tipoDe(l.kind).id === tipo.value) : coinciden;

  return (
    <>
      <div class="head">
        <span class="lead-ico" data-ph="or"><Icon name="link" size={22} /></span>
        <div class="grow">
          <h1>Recursos</h1>
          <p>Diapositivas, videos, descargas y enlaces de tus cursos. Entra por curso o busca en todos a la vez.</p>
        </div>
      </div>

      <div class="toolbar" role="search">
        <span class="field-ico grow" style="min-width:14rem;max-width:30rem">
          <Icon name="search" />
          <input id="buscar" type="search" placeholder="Buscar en todos tus cursos  ( / )" aria-label="Buscar recursos" value={q.value} onInput$={(_, el) => ((q.value = el.value), (tipo.value = ""), setParams({ q: el.value }))} />
        </span>
      </div>

      {term ? (
        coinciden.length === 0 ? (
          <Empty icon="search" title="Nada coincide" text="Prueba con otra palabra." />
        ) : (
          <section aria-label="Resultados" data-testid="recursos-resultados">
            <p class="rec-resumen" aria-live="polite">
              {hallados.length} {hallados.length === 1 ? "recurso" : "recursos"} · «{q.value.trim()}»
            </p>
            {tiposHallados.length > 1 && (
              <div class="rc-filtros" role="group" aria-label="Filtrar por tipo">
                <Chip on={!tipo.value} onClick$={() => (tipo.value = "")}>Todos · {coinciden.length}</Chip>
                {tiposHallados.map((t) => (
                  <span key={t.id} data-k={t.id}>
                    <Chip on={tipo.value === t.id} onClick$={() => (tipo.value = tipo.value === t.id ? "" : t.id)}>
                      <Icon name={t.icon} size={13} /> {t.label} · {coinciden.filter((l) => tipoDe(l.kind).id === t.id).length}
                    </Chip>
                  </span>
                ))}
              </div>
            )}
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
      ) : filas.length === 0 ? (
        <Empty icon="link" title="Sin recursos todavía" text="Cuando el instructor publique enlaces o archivos, aparecerán aquí por curso." />
      ) : (
        <>
          {proxima && (
            <section class="rc-ahora" data-testid="recursos-proxima" aria-labelledby="rc-ahora-t">
              <div>
                <h2 id="rc-ahora-t">Próxima clase: {proxima.titulo}</h2>
                <p>
                  <b>{dia(proxima.inicio)}, {hora(proxima.inicio)}</b> · {proxima.nombre}
                  {proxima.grupo ? ` · ${proxima.grupo}` : ""}
                </p>
              </div>
              <a class="btn" href={`/links/${encodeURIComponent(proxima.curso_slug!)}/?sesion=${encodeURIComponent(proxima.id)}`}>
                {deLaClase.length > 1 ? `Ver sus ${deLaClase.length} recursos` : deLaClase.length === 1 ? "Ver su recurso" : "Ver la clase"} <Icon name="chevronRight" size={14} />
              </a>
              {atajos.length > 0 && (
                <div class="rc-atajos">
                  {atajos.map((l) => {
                    const t = tipoDe(l.kind);
                    const descarga = ADJUNTO.has(l.kind);
                    return (
                      <a key={l.id} class="rc-atajo" data-k={t.id} href={l.url} target={descarga ? undefined : "_blank"} rel="noopener" download={descarga || undefined}>
                        <Icon name={t.icon} size={14} /> <span>{l.title}</span>
                      </a>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {hayEstados && <Tabs tabs={pestanas} active={pestana} onSelect$={elegir} />}

          <div class="list" data-testid="recursos-cursos">
            {visibles.map((f) => {
              const url = `/links/${encodeURIComponent(f.c.slug)}/`;
              const repetido = !f.grupo && titulos.filter((t) => t === f.c.title).length > 1;
              const cohorte = repetido ? ((f.c as CourseSummary & { cohorts?: string[] }).cohorts ?? [])[0] : "";
              return (
                <div key={f.c.id} class="rc-fila" data-estado={f.estado}>
                  <div class="rc-tit">
                    <a class="rc-t" href={url}>{f.base}</a>
                    {f.grupo && <span class="badge">{f.grupo}</span>}
                    {cohorte && <span class="rc-cohorte">{cohorte}</span>}
                    {pestana === "todos" && f.estado !== "sinfecha" && <span class={`badge ${ESTADOS[f.estado].cls}`}>{ESTADOS[f.estado].label}</span>}
                  </div>
                  <div class="rc-d">
                    {f.sesiones} {f.sesiones === 1 ? "sesión" : "sesiones"} · {f.recursos} {f.recursos === 1 ? "recurso" : "recursos"}
                    {f.cuando && ` · ${f.cuando}`}
                  </div>
                  <div class="rc-tipos">
                    {f.porTipo.map((x) => (
                      <a key={x.id} class="rc-tipo" data-k={x.id} href={`${url}?tipo=${x.id}`} title={`${x.label}: ${x.n}`} aria-label={`${x.label}: ${x.n}. Ver solo ${x.label.toLowerCase()} de ${f.c.title}`}>
                        <Icon name={x.icon} size={13} /> {x.n}
                      </a>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
});

export const head: DocumentHead = { title: "Recursos" };
