import { component$, useContext, useSignal, useStore, useStyles$, useVisibleTask$, $ } from "@builder.io/qwik";
import { Link, type DocumentHead } from "@builder.io/qwik-city";
import { api, ApiError, errMsg, requireLogin, type PaseCurso, type PaseGrupo } from "~/lib/api";
import { SessionContext, toast } from "~/lib/session";
import { Icon } from "~/components/icon";
import { Copy, Empty, ErrorState, Loading } from "~/components/ui";

// Pase libre (/pase/): quien tiene la cohorte «pase-libre» ve todo el catálogo, un curso por fila.
// Al abrir un curso elige uno de sus grupos. En un grupo que viene se inscribe; en uno ya dictado lo
// elige para ver sus clases y grabaciones. Todo es gratis: el servidor solo suma el grupo a su cuenta.

const LIMA = "America/Lima";
const fFecha = new Intl.DateTimeFormat("es-PE", { timeZone: LIMA, weekday: "short", day: "numeric", month: "short" });
const fCorta = new Intl.DateTimeFormat("es-PE", { timeZone: LIMA, day: "numeric", month: "short" });
const fHora = new Intl.DateTimeFormat("es-PE", { timeZone: LIMA, hour: "numeric", minute: "2-digit" });
const fecha = (iso?: string) => (iso ? fFecha.format(new Date(iso)) : "");
const corta = (iso?: string) => (iso ? fCorta.format(new Date(iso)) : "");
const hora = (iso?: string) => (iso ? fHora.format(new Date(iso)) : "");

const ESTADO: Record<PaseGrupo["estado"], string> = { proximo: "Por empezar", en_curso: "En curso", dictado: "Ya dictado" };

function rango(g: PaseGrupo): string {
  if (!g.inicio) return "Sin fecha registrada";
  const a = corta(g.inicio);
  const b = g.sesiones.length > 1 ? corta(g.sesiones[g.sesiones.length - 1].inicio) : "";
  return b && b !== a ? `${a} – ${b}` : a;
}

/** El grupo que se muestra al abrir un curso: aquel donde ya está, el que viene, o el último dictado. */
function grupoInicial(c: PaseCurso): string {
  const dentro = c.grupos.find((g) => g.inscrito);
  if (dentro) return dentro.id;
  const viene = c.grupos.filter((g) => g.estado !== "dictado").sort((a, b) => (a.inicio ?? "").localeCompare(b.inicio ?? ""))[0];
  return (viene ?? c.grupos[c.grupos.length - 1]).id;
}

function resumen(c: PaseCurso): string {
  const vienen = c.grupos.filter((g) => g.estado !== "dictado");
  const n = c.grupos.length;
  const grupos = `${n} ${n === 1 ? "grupo" : "grupos"}`;
  if (vienen.length === 0) {
    const grab = c.grupos.reduce((s, g) => s + g.grabaciones, 0);
    return grab ? `${grupos} · ${grab} ${grab === 1 ? "clase grabada" : "clases grabadas"}` : grupos;
  }
  const enCurso = vienen.filter((g) => g.estado === "en_curso").length;
  if (enCurso) return `${grupos} · ${n === 1 ? "en curso" : `${enCurso} en curso`}`;
  return `${grupos} · el próximo empieza el ${fecha(vienen.map((g) => g.inicio ?? "").sort()[0])}`;
}

const CSS = `
.pase-buscar { max-width: 26rem; margin: 0 0 .4rem; }
.pase-curso { border-left: 4px solid var(--ar, var(--accent)); }
.pase-fila { display: flex; align-items: center; gap: .75rem; width: 100%; padding: .75rem .95rem; font: inherit; color: inherit; text-align: left; background: transparent; border: 0; cursor: pointer; }
.pase-fila:hover { background: var(--s2); }
.pase-fila:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }
.pase-fila .t { font-weight: 650; }
.pase-fila .d { font-size: .82rem; color: var(--muted); margin-top: .1rem; }
.pase-fila .flecha { color: var(--faint); transition: transform .15s ease; flex: none; }
.pase-fila[aria-expanded="true"] .flecha { transform: rotate(90deg); }
.pase-panel { padding: .2rem .95rem 1rem 1rem; }
.pase-panel > p { margin: 0 0 .7rem; color: var(--muted); font-size: .9rem; max-width: 46rem; }
.pase-grupos { display: flex; flex-wrap: wrap; gap: .35rem; margin-bottom: .8rem; }
.pase-grupos .chip .marca { width: .45rem; height: .45rem; border-radius: 50%; background: var(--faint); flex: none; }
.pase-grupos .chip .marca.proximo { background: var(--gold); }
.pase-grupos .chip .marca.en_curso { background: var(--ok); }
.pase-grupo { border: 1px solid var(--line); border-radius: var(--r2); background: var(--s1); }
.pase-grupo-cab { display: flex; flex-wrap: wrap; align-items: center; gap: .6rem; padding: .7rem .85rem; border-bottom: 1px solid var(--line); }
.pase-grupo-cab h3 { margin: 0; font-size: 1rem; }
.pase-sesiones { list-style: none; margin: 0; padding: 0; }
.pase-sesiones li { display: flex; flex-wrap: wrap; align-items: center; gap: .4rem .8rem; padding: .6rem .85rem; }
.pase-sesiones li + li { border-top: 1px solid var(--line); }
.pase-sesiones .cuando { font-size: .8rem; color: var(--muted); min-width: 9.5rem; font-variant-numeric: tabular-nums; }
.pase-sesiones .que { flex: 1; min-width: 12rem; }
.pase-sesiones .cmd { font-size: .78rem; }
@media (prefers-reduced-motion: reduce) { .pase-fila .flecha { transition: none; } }
`;

export default component$(() => {
  useStyles$(CSS);
  const session = useContext(SessionContext);
  const st = useStore<{ cursos: PaseCurso[] | null; error: string; sinPase: boolean; abierto: Record<string, boolean>; elegido: Record<string, string>; ocupado: string }>({
    cursos: null,
    error: "",
    sinPase: false,
    abierto: {},
    elegido: {},
    ocupado: "",
  });
  const buscar = useSignal("");

  const load = $(async () => {
    st.error = "";
    try {
      st.cursos = (await api.pase()).cursos;
    } catch (e) {
      if (requireLogin(e)) return;
      if (e instanceof ApiError && e.status === 403) st.sinPase = true;
      else st.error = errMsg(e);
    }
  });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async () => {
    session.help = "pase";
    await load();
  });

  const unirme = $(async (c: PaseCurso, g: PaseGrupo) => {
    st.ocupado = g.id;
    try {
      await api.paseUnirme(g.id);
      await load();
      api.me().then((m) => (session.me = m)).catch(() => {});
      toast(session, g.estado === "dictado" ? `Listo: ya ves las clases de ${c.nombre} · ${g.grupo}.` : `Listo: te inscribiste en ${c.nombre} · ${g.grupo}.`);
    } catch (e) {
      if (!requireLogin(e)) toast(session, errMsg(e), "bad");
    } finally {
      st.ocupado = "";
    }
  });

  if (st.sinPase) return <Empty icon="lock" title="Esta página es para quien tiene pase libre" text="Si te invitaron, abre el enlace que te enviaron. Tus cursos están en Aprender." />;
  if (st.error) return <ErrorState message={st.error} retry$={load} />;
  if (!st.cursos) return <Loading lines={8} />;

  const q = buscar.value.trim().toLowerCase();
  const visibles = st.cursos.filter((c) => !q || c.nombre.toLowerCase().includes(q));
  const vienen = visibles.filter((c) => c.grupos.some((g) => g.estado !== "dictado"));
  const pasados = visibles.filter((c) => c.grupos.every((g) => g.estado === "dictado"));
  const nombre = session.me?.name.split(" ")[0] ?? "";

  const fila = (c: PaseCurso) => {
    const abierto = !!st.abierto[c.nombre];
    const elegidoId = st.elegido[c.nombre] || grupoInicial(c);
    const g = c.grupos.find((x) => x.id === elegidoId) ?? c.grupos[0];
    const dentro = c.grupos.filter((x) => x.inscrito).length;
    const panel = `pase-${c.grupos[0].id}`;
    return (
      <div key={c.nombre} class="pase-curso" data-area={c.area || undefined}>
        <button type="button" class="pase-fila" aria-expanded={abierto} aria-controls={panel} onClick$={() => (st.abierto = { ...st.abierto, [c.nombre]: !abierto })}>
          <span class="grow">
            <div class="t">{c.nombre}</div>
            <div class="d">{resumen(c)}</div>
          </span>
          {dentro > 0 && <span class="badge ok"><Icon name="check" size={12} /> {dentro === 1 ? "Estás en un grupo" : `Estás en ${dentro} grupos`}</span>}
          <Icon name="chevronRight" class="flecha" />
        </button>
        {abierto && (
          <div class="pase-panel" id={panel}>
            {c.descripcion && <p>{c.descripcion}</p>}
            {c.grupos.length > 1 && (
              <div class="pase-grupos" role="group" aria-label={`Grupos de ${c.nombre}`}>
                {c.grupos.map((x) => (
                  <button key={x.id} type="button" class={`chip ${x.id === g.id ? "on" : ""}`} aria-pressed={x.id === g.id} title={ESTADO[x.estado]} onClick$={() => (st.elegido = { ...st.elegido, [c.nombre]: x.id })}>
                    <span class={`marca ${x.estado}`} aria-hidden="true" />
                    {x.grupo || "Grupo"}
                    {x.inscrito && <Icon name="check" size={12} />}
                  </button>
                ))}
              </div>
            )}
            <section class="pase-grupo" aria-label={`${c.nombre} · ${g.grupo}`}>
              <div class="pase-grupo-cab">
                <span class="grow">
                  <h3>{g.grupo || c.nombre}</h3>
                  <div class="xs muted">
                    {ESTADO[g.estado]} · {rango(g)}
                    {g.inicio && g.estado !== "dictado" ? ` · ${hora(g.inicio)}` : ""}
                    {g.grabaciones > 0 ? ` · ${g.grabaciones} ${g.grabaciones === 1 ? "grabación" : "grabaciones"}` : ""}
                  </div>
                </span>
                {g.inscrito ? (
                  <>
                    <span class="badge ok"><Icon name="check" size={12} /> {g.estado === "dictado" ? "Elegiste este grupo" : "Inscrito"}</span>
                    <Link class="btn ghost sm" href={`/courses/${g.slug}/`}>Ir al curso</Link>
                  </>
                ) : (
                  <button type="button" class="btn sm" disabled={st.ocupado !== ""} onClick$={() => unirme(c, g)}>
                    {st.ocupado === g.id ? <Icon name="loader" size={14} /> : <Icon name={g.estado === "dictado" ? "video" : "plus"} size={14} />}
                    {g.estado === "dictado" ? "Ver las clases de este grupo" : "Inscribirme gratis"}
                  </button>
                )}
              </div>
              {g.sesiones.length === 0 ? (
                <p class="sm muted" style="margin:0;padding:.7rem .85rem">Las clases de este grupo todavía no están publicadas.</p>
              ) : (
                <ol class="pase-sesiones">
                  {g.sesiones.map((s, i) => (
                    <li key={`${g.id}-${i}`}>
                      <span class="cuando">{s.inicio ? `${fecha(s.inicio)}, ${hora(s.inicio)}` : `Clase ${i + 1}`}</span>
                      <span class="que">{s.titulo}</span>
                      {s.grabacion ? (
                        <>
                          <a class="btn sm" href={s.grabacion.url} target="_blank" rel="noopener noreferrer">
                            <Icon name="video" size={14} /> Ver grabación
                          </a>
                          {s.grabacion.passcode && <Copy text={s.grabacion.passcode} />}
                        </>
                      ) : (
                        s.tiene_grabacion && <span class="badge"><Icon name="video" size={12} /> Grabada</span>
                      )}
                      {s.id && (
                        <Link class="btn ghost sm" href={`/lessons/${s.id}/`}>Abrir clase</Link>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div class="head">
        <span class="lead-ico gold"><Icon name="grad" /></span>
        <div class="grow">
          <h1>{nombre ? `${nombre}, tienes pase libre` : "Tienes pase libre"}</h1>
          <p>Todos los cursos de JMD Learning, sin costo. Abre un curso y elige un grupo: en los que vienen te inscribes; en los que ya pasaron ves sus clases y grabaciones.</p>
        </div>
      </div>

      <div class="field-ico pase-buscar">
        <Icon name="search" size={15} />
        <input type="search" placeholder="Buscar un curso" aria-label="Buscar un curso" bind:value={buscar} />
      </div>

      {visibles.length === 0 && <Empty icon="search" title="Ningún curso con ese nombre" text="Prueba con otra palabra, por ejemplo «IA» o «web»." />}

      {vienen.length > 0 && (
        <>
          <div class="section-t"><Icon name="calendar" /> Próximos y en curso</div>
          <div class="list">{vienen.map(fila)}</div>
        </>
      )}

      {pasados.length > 0 && (
        <>
          <div class="section-t"><Icon name="video" /> Ya dictados</div>
          <div class="list">{pasados.map(fila)}</div>
        </>
      )}
    </>
  );
});

export const head: DocumentHead = { title: "Pase libre" };
