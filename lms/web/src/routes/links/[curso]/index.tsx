import { component$, useContext, useSignal, useStore, useVisibleTask$, $ } from "@builder.io/qwik";
import { Link, type DocumentHead, type StaticGenerateHandler } from "@builder.io/qwik-city";
import { api, errMsg, fmtDate, requireLogin, type LinkItem } from "~/lib/api";
import { SessionContext } from "~/lib/session";
import { modToken } from "~/lib/kolb";
import { getParam, pathId, setParams, setTitle } from "~/lib/url";
import { Icon } from "~/components/icon";
import { Chip, Crumbs, Empty, ErrorState, Loading } from "~/components/ui";
import { ADJUNTO, origen, TIPOS, tipoDe } from "~/lib/recursos";

// Recursos de un curso (/links/<curso>/): un panel colapsable por sesión y, dentro, por tipo. Cada
// tipo lleva su color (--k-*) e icono; el panel toma el color del módulo de la sesión (data-ph).
// La URL guarda dónde estás: ?sesion=<id> abre esa sesión, ?tipo= y ?q= filtran.

/** Primeras palabras de un objetivo para el chip, sin la coma o el punto con que corte. */
const corto = (t: string) => t.split(" ").slice(0, 5).join(" ").replace(/[,.;:]+$/, "");

interface Clase {
  id: string;
  title: string;
  num: number;
  starts_at: string | null;
  modulo: string;
  ph: string;
  objetivos: Record<string, string>;
}

const ABIERTOS_KEY = "lms.recursos.abiertos";


export default component$(() => {
  const session = useContext(SessionContext);
  const st = useStore<{ list: LinkItem[] | null; clases: Record<string, Clase>; error: string; curso: string; titulo: string }>({ list: null, clases: {}, error: "", curso: "", titulo: "" });
  const abiertos = useStore<Record<string, boolean>>({});
  const q = useSignal("");
  const kind = useSignal("");

  const guardar = $(() => {
    try {
      localStorage.setItem(`${ABIERTOS_KEY}.${st.curso}`, JSON.stringify(abiertos));
    } catch {
      /* sin almacenamiento: el estado dura la visita */
    }
  });

  const load = $(async () => {
    st.error = "";
    try {
      st.curso = pathId("links");
      const [links, todos] = await Promise.all([api.links(st.curso), api.courses().catch(() => [])]);
      const cursos = todos.filter((c) => c.slug === st.curso || c.id === st.curso);
      st.titulo = cursos[0]?.title ?? links[0]?.course_title ?? "Recursos";
      setTitle(`Recursos · ${st.titulo}`);
      st.list = links;
      // Fecha, número de clase y módulo salen del curso; los títulos de objetivo, de la sesión.
      const clases: Record<string, Clase> = {};
      const detalle = await Promise.all(cursos.map((c) => api.course(c.slug).catch(() => null)));
      for (const c of detalle) {
        if (!c) continue;
        let n = 0;
        c.modules.forEach((m, mi) => {
          for (const l of m.lessons) {
            n++;
            clases[l.id] = { id: l.id, title: l.title, num: n, starts_at: l.starts_at, modulo: m.title.replace(/^Módulo \d+ · /, ""), ph: modToken(mi), objetivos: {} };
          }
        });
      }
      const ids = [...new Set(links.map((l) => l.lesson_id))];
      const lecciones = await Promise.all(ids.map((id) => api.lesson(id).catch(() => null)));
      lecciones.forEach((l, i) => {
        if (!l) return;
        const c = (clases[l.id] ??= { id: l.id, title: l.title, num: i + 1, starts_at: l.starts_at, modulo: l.module.title, ph: modToken(i), objetivos: {} });
        for (const o of l.objectives) c.objetivos[o.id] = o.title;
      });
      st.clases = clases;
      // Estado de los paneles: el guardado o, si no hay, solo el primero abierto.
      let guardado: Record<string, boolean> | null = null;
      try {
        const raw = localStorage.getItem(`${ABIERTOS_KEY}.${st.curso}`);
        guardado = raw ? (JSON.parse(raw) as Record<string, boolean>) : null;
      } catch {
        guardado = null;
      }
      const orden = [...ids].sort((a, b) => (clases[a]?.num ?? 99) - (clases[b]?.num ?? 99));
      const pedida = getParam("sesion");
      if (pedida && ids.includes(pedida)) {
        // ?sesion=<id>: esa sesión abierta y a la vista.
        orden.forEach((id) => (abiertos[id] = id === pedida));
        setTimeout(() => document.getElementById(`rec-t-${pedida}`)?.scrollIntoView({ block: "start", behavior: "smooth" }), 50);
      } else orden.forEach((id, i) => (abiertos[id] = guardado && typeof guardado[id] === "boolean" ? guardado[id] : i === 0));
    } catch (e) {
      if (!requireLogin(e)) st.error = errMsg(e);
    }
  });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async ({ cleanup }) => {
    session.help = "enlaces";
    q.value = getParam("q");
    kind.value = getParam("tipo");
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

  const toggle = $((id: string) => {
    abiertos[id] = !abiertos[id];
    // La URL apunta a la sesión que acabas de abrir (se puede compartir o volver a ella).
    setParams({ sesion: abiertos[id] ? id : getParam("sesion") === id ? "" : getParam("sesion") });
    guardar();
  });
  const todos = $((v: boolean) => {
    for (const id of Object.keys(abiertos)) abiertos[id] = v;
    guardar();
  });

  const all = st.list ?? [];
  const tiposPresentes = TIPOS.filter((t) => all.some((l) => tipoDe(l.kind).id === t.id));
  const term = q.value.trim().toLowerCase();
  const filtrando = !!term || !!kind.value;
  const shown = all.filter((l) => (!kind.value || tipoDe(l.kind).id === kind.value) && (!term || `${l.title} ${l.url} ${l.lesson_title}`.toLowerCase().includes(term)));
  const grupos: Record<string, LinkItem[]> = {};
  for (const l of shown) (grupos[l.lesson_id] ??= []).push(l);
  const ordenGrupos = Object.keys(grupos).sort((a, b) => (st.clases[a]?.num ?? 99) - (st.clases[b]?.num ?? 99));
  const nAbiertos = Object.values(abiertos).filter(Boolean).length;
  // Primero por grupo (cada grupo es su propio curso) y, dentro, por sesión.
  const cursosMap = new Map<string, { id: string; titulo: string; sesiones: string[]; n: number }>();
  for (const id of ordenGrupos) {
    const it = grupos[id][0];
    const k = it.course_id || "_";
    if (!cursosMap.has(k)) cursosMap.set(k, { id: k, titulo: it.course_title || "Curso", sesiones: [], n: 0 });
    const g = cursosMap.get(k)!;
    g.sesiones.push(id);
    g.n += grupos[id].length;
  }
  const porCurso = [...cursosMap.values()].sort((a, b) => a.titulo.localeCompare(b.titulo, "es"));

  return (
    <>
      <Crumbs items={[{ href: "/links/", label: "Recursos" }, { label: st.titulo || "Curso" }]} />
      <div class="head">
        <span class="lead-ico" data-ph="or"><Icon name="link" size={22} /></span>
        <div class="grow">
          <h1>{st.titulo || "Recursos"}</h1>
          <p>Recursos del curso por sesión: enlaces, documentación, repositorios, PDF, descargas, diapositivas y grabaciones.</p>
        </div>
      </div>
      {st.error && <ErrorState message={st.error} retry$={load} />}
      {!st.error && st.list === null && <Loading lines={5} />}
      {st.list && (
        <>
          <div class="toolbar" role="search">
            <span class="field-ico grow" style="min-width:14rem;max-width:24rem">
              <Icon name="search" />
              <input id="buscar" type="search" placeholder="Buscar en todas las clases  ( / )" aria-label="Buscar recursos" value={q.value} onInput$={(_, el) => ((q.value = el.value), setParams({ q: el.value }))} />
            </span>
            <Chip on={!kind.value} onClick$={() => ((kind.value = ""), setParams({ tipo: "" }))}>Todos · {all.length}</Chip>
            {tiposPresentes.map((t) => (
              <span key={t.id} data-k={t.id} style="display:contents">
                <Chip on={kind.value === t.id} onClick$={() => ((kind.value = kind.value === t.id ? "" : t.id), setParams({ tipo: kind.value }))}>
                  <Icon name={t.icon} size={13} /> {t.label}
                </Chip>
              </span>
            ))}
            <span class="rec-acciones">
              <button type="button" class="btn ghost sm" onClick$={() => todos(true)} disabled={filtrando || nAbiertos === ordenGrupos.length} title={filtrando ? "Con un filtro activo todas las clases se muestran abiertas" : undefined}>
                <Icon name="chevronDown" size={14} /> Expandir todo
              </button>
              <button type="button" class="btn ghost sm" onClick$={() => todos(false)} disabled={filtrando || nAbiertos === 0} title={filtrando ? "Con un filtro activo todas las clases se muestran abiertas" : undefined}>
                <Icon name="chevronUp" size={14} /> Contraer todo
              </button>
            </span>
          </div>
          {filtrando && shown.length > 0 && (
            <p class="rec-resumen" aria-live="polite">
              {shown.length} {shown.length === 1 ? "recurso" : "recursos"} en {ordenGrupos.length} {ordenGrupos.length === 1 ? "clase" : "clases"}
              {kind.value ? ` · ${TIPOS.find((t) => t.id === kind.value)?.label ?? kind.value}` : ""}
              {term ? ` · «${q.value.trim()}»` : ""}
            </p>
          )}
          {shown.length === 0 ? (
            <Empty icon="search" title="Nada coincide" text="Prueba con otra palabra o quita el filtro de tipo." />
          ) : (
            porCurso.map((cur) => (
              <section key={cur.id} class="rec-curso" aria-labelledby={`rec-curso-${cur.id}`} data-testid="recursos-grupo">
                {porCurso.length > 1 && (
                  <h2 class="rec-curso__t" id={`rec-curso-${cur.id}`}>
                    {cur.titulo} <span class="sm muted">· {cur.sesiones.length} {cur.sesiones.length === 1 ? "sesión" : "sesiones"} · {cur.n} recursos</span>
                  </h2>
                )}
            {cur.sesiones.map((lessonId) => {
              const items = grupos[lessonId];
              const clase = st.clases[lessonId];
              const open = filtrando || !!abiertos[lessonId];
              const porTipo = TIPOS.map((t) => ({ t, items: items.filter((l) => tipoDe(l.kind).id === t.id) })).filter((g) => g.items.length);
              const num = clase?.num ? String(clase.num).padStart(2, "0") : "";
              return (
                <section key={lessonId} class="rec-grupo" data-ph={clase?.ph ?? "ec"} aria-labelledby={`rec-t-${lessonId}`}>
                  <button type="button" class="rec-cab" aria-expanded={open} aria-controls={`rec-c-${lessonId}`} onClick$={() => toggle(lessonId)}>
                    <span class="rec-num" aria-hidden="true">{num || <Icon name="book" size={16} />}</span>
                    <span class="grow">
                      <span class="rec-tit" id={`rec-t-${lessonId}`}>{items[0].lesson_title}</span>
                      <span class="rec-meta">
                        {clase?.starts_at && <span><Icon name="calendar" size={12} /> {fmtDate(clase.starts_at, false)}</span>}
                        {clase?.modulo && <span><Icon name="layers" size={12} /> {clase.modulo}</span>}
                      </span>
                    </span>
                    <span class="badge ph">{items.length} {items.length === 1 ? "recurso" : "recursos"}</span>
                    <span class="rec-barra" aria-hidden="true">
                      {porTipo.map((g) => (
                        <i key={g.t.id} data-k={g.t.id} style={`flex:${g.items.length}`} title={`${g.t.label}: ${g.items.length}`} />
                      ))}
                    </span>
                    <Icon name="chevronDown" class="rec-chev" size={18} />
                  </button>
                  <div class="rec-cuerpo" id={`rec-c-${lessonId}`} hidden={!open}>
                    {porTipo.map((g) => (
                      <div key={g.t.id} class="rec-tipo" data-k={g.t.id}>
                        <div class="rec-tipo__h">
                          <Icon name={g.t.icon} size={14} /> {g.t.label} <span class="count">{g.items.length}</span>
                        </div>
                        <div class="list">
                          {g.items.map((l) => {
                            const descarga = ADJUNTO.has(l.kind);
                            const objetivos = (l.objective_ids ?? []).map((id) => clase?.objetivos[id] ?? "").filter(Boolean);
                            return (
                              <a
                                key={l.id}
                                class="rec-fila"
                                data-k={g.t.id}
                                href={l.url}
                                target={descarga ? undefined : "_blank"}
                                rel="noopener"
                                download={descarga || undefined}
                                title={descarga ? `Descargar ${l.title}` : `Abrir ${l.title} en una pestaña nueva`}
                              >
                                <span class="lead-ico"><Icon name={g.t.icon} size={15} /></span>
                                <span class="grow">
                                  <div class="rec-t">{l.title}</div>
                                  <div class="rec-d">
                                    <span class="dom">{origen(l.url)}</span>
                                    {objetivos.slice(0, 2).map((o) => (
                                      <span key={o} class="rec-obj" title={o}><Icon name="target" size={10} /> {corto(o)}</span>
                                    ))}
                                    {objetivos.length > 2 && <span class="rec-obj" title={objetivos.slice(2).join(" · ")}>+{objetivos.length - 2}</span>}
                                  </div>
                                </span>
                                <span class="rec-accion" aria-hidden="true"><Icon name={descarga ? "download" : "external"} size={16} /></span>
                                <span class="sr">{descarga ? "(descargar)" : "(abre en pestaña nueva)"}</span>
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    <div class="row xs" style="justify-content:flex-end">
                      <Link href={`/lessons/${lessonId}/?tab=materiales`} class="row" style="gap:.25rem">
                        Ver la sesión <Icon name="chevronRight" size={12} />
                      </Link>
                    </div>
                  </div>
                </section>
              );
            })}
              </section>
            ))
          )}
        </>
      )}
    </>
  );
});

// Se genera una sola página (/links/_/); el servidor la sirve para cualquier curso.
export const onStaticGenerate: StaticGenerateHandler = async () => ({ params: [{ curso: "_" }] });

export const head: DocumentHead = { title: "Recursos" };
