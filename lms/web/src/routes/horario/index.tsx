import { component$, useContext, useSignal, useStore, useVisibleTask$, $ } from "@builder.io/qwik";
import { Link, type DocumentHead } from "@builder.io/qwik-city";
import { api, errMsg, proximaClase, requireLogin, crucesPendientes, type Horario, type HorarioClase } from "~/lib/api";
import { SessionContext, isStaff } from "~/lib/session";
import { setTitle } from "~/lib/url";
import { Icon } from "~/components/icon";
import { Empty, ErrorState, Loading } from "~/components/ui";

// Mi horario: responde dos preguntas del alumno sin que tenga que abrir curso por curso:
// en qué estoy matriculado y cuándo son mis clases. Si dos clases se pisan, lo dice arriba.

const LIMA = "America/Lima";
const fHora = new Intl.DateTimeFormat("es-PE", { timeZone: LIMA, hour: "numeric", minute: "2-digit", hour12: true });
const fDia = new Intl.DateTimeFormat("es-PE", { timeZone: LIMA, weekday: "long", day: "numeric", month: "long" });
const fCorto = new Intl.DateTimeFormat("es-PE", { timeZone: LIMA, weekday: "short", day: "numeric", month: "short" });
const fClave = new Intl.DateTimeFormat("en-CA", { timeZone: LIMA, year: "numeric", month: "2-digit", day: "2-digit" });

const hora = (iso: string) => fHora.format(new Date(iso)).replace(/\s+/g, " ");
const corto = (iso: string) => fCorto.format(new Date(iso)).replace(/\./g, "");
const clave = (t: number) => fClave.format(new Date(t));
const mayus = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** «Hoy», «Mañana» o «Domingo 8 de noviembre», según el día de Lima. */
function tituloDia(iso: string, ahora: number): string {
  const d = clave(Date.parse(iso));
  if (d === clave(ahora)) return "Hoy";
  if (d === clave(ahora + 864e5)) return "Mañana";
  return mayus(fDia.format(new Date(iso)));
}

/** El nombre sin el grupo repetido: algunos cursos ya lo llevan en el título. */
const sinGrupo = (nombre: string, grupo: string) => nombre.replace(new RegExp(` · ${grupo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`), "");
const sesion = (c: HorarioClase) => (c.numero && c.total ? `Sesión ${c.numero} de ${c.total}` : c.titulo);

function porDia(clases: HorarioClase[]): { dia: string; clases: HorarioClase[] }[] {
  const out: { dia: string; clases: HorarioClase[] }[] = [];
  for (const c of clases) {
    const d = clave(Date.parse(c.inicio));
    const g = out.find((x) => x.dia === d);
    if (g) g.clases.push(c);
    else out.push({ dia: d, clases: [c] });
  }
  return out;
}

export default component$(() => {
  const session = useContext(SessionContext);
  const st = useStore<{ h: Horario | null; error: string }>({ h: null, error: "" });
  const ahora = useSignal(Date.now());

  const load = $(async () => {
    st.error = "";
    try {
      st.h = await api.horario();
      ahora.value = Date.now();
    } catch (e) {
      if (!requireLogin(e)) st.error = errMsg(e);
    }
  });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async ({ track }) => {
    setTitle("Mi horario");
    track(() => session.loaded);
    if (session.loaded) await load();
  });

  const h = st.h;
  const proximas = h ? h.clases.filter((c) => Date.parse(c.fin) > ahora.value) : [];
  const cruces = h ? crucesPendientes(h.clases, ahora.value) : [];
  const nombrePorId = new Map(proximas.map((c) => [c.id, sinGrupo(c.nombre, c.grupo)]));

  return (
    <div class="ag-pagina">
      <div class="head">
        <div class="grow">
          <h1>Mi horario</h1>
          <p class="ag-sub">Hora de Lima</p>
        </div>
      </div>

      {st.error && <ErrorState message={st.error} retry$={load} />}
      {!st.error && !h && <Loading lines={4} />}

      {h && h.cursos.length === 0 && (
        <Empty
          icon="calendar"
          title="No estás matriculado en ningún curso"
          text={isStaff(session.me) ? "Tus clases como instructor están en la agenda." : "Si te inscribiste, escribe al instructor para que te añada a tu grupo."}
        >
          {isStaff(session.me) && <Link class="btn ghost sm" href="/instructor/agenda/">Abrir agenda</Link>}
        </Empty>
      )}

      {cruces.length > 0 && (
        <section class="hr-cruces" aria-labelledby="hr-cruces-t" data-testid="cruces">
          <h2 id="hr-cruces-t">
            <Icon name="alert" size={17} />
            {cruces.length === 1 ? "Tienes 1 cruce de horario" : `Tienes ${cruces.length} cruces de horario`}
          </h2>
          <ul>
            {cruces.map(([a, b]) => (
              <li key={`${a.id}-${b.id}`}>
                <b>{mayus(corto(a.inicio))}</b>: {sinGrupo(a.nombre, a.grupo)} ({hora(a.inicio)} a {hora(a.fin)}) y {sinGrupo(b.nombre, b.grupo)} ({hora(b.inicio)} a {hora(b.fin)})
              </li>
            ))}
          </ul>
          <p>Avisa al instructor para decidir a cuál entras y cómo recuperas la otra.</p>
        </section>
      )}

      {h && h.cursos.length > 0 && (
        <>
          <h2 class="ag-t">
            Estás matriculado en {h.cursos.length === 1 ? "1 curso" : `${h.cursos.length} cursos`}
          </h2>
          <ul class="ag-lista hr-cursos" data-testid="matriculas">
            {h.cursos.map((c) => {
              const suyas = h.clases.filter((k) => k.curso_slug === c.slug);
              const prox = proximaClase(suyas, ahora.value);
              return (
                <li key={c.slug} data-area={c.area || undefined}>
                  <Link href={`/courses/${c.slug}/`}>
                    <i class="ag-punto" aria-hidden="true" />
                    <span class="grow">
                      <b>{sinGrupo(c.nombre, c.grupo)}</b>
                      <span class="muted">{c.grupo}</span>
                    </span>
                    <span class="hr-prox">
                      {prox ? `Próxima: ${corto(prox.inicio)}, ${hora(prox.inicio)}` : suyas.length ? "Clases terminadas" : "Fechas por confirmar"}
                    </span>
                    <Icon name="chevronRight" size={14} class="faint" />
                  </Link>
                </li>
              );
            })}
          </ul>

          <h2 class="ag-t">Próximas clases</h2>
          {proximas.length === 0 && <p class="muted">No tienes clases con fecha por delante.</p>}
          {porDia(proximas).map((d) => (
            <section key={d.dia} class="hr-dia">
              <h3>{tituloDia(d.clases[0].inicio, ahora.value)}</h3>
              <ol class="ag-lista">
                {d.clases.map((c) => {
                  const cruzadas = (c.cruces ?? []).filter((id) => nombrePorId.has(id));
                  const cuerpo = (
                    <>
                      <span class="hr-hora">
                        <b>{hora(c.inicio)}</b>
                        <span>a {hora(c.fin)}</span>
                      </span>
                      <span class="ag-grupo">
                        <span class="ag-nombre">
                          <i class="ag-punto" aria-hidden="true" />
                          <b>{sinGrupo(c.nombre, c.grupo)}</b>
                        </span>
                        <span class="ag-sig muted">
                          {c.estado === "por-confirmar" && <span class="badge warn">por confirmar</span>}
                          {[c.grupo, sesion(c)].filter(Boolean).join(" · ")}
                        </span>
                        {cruzadas.length > 0 && (
                          <span class="hr-aviso">
                            <Icon name="alert" size={13} /> Se cruza con {cruzadas.map((id) => nombrePorId.get(id)).join(" y ")}
                          </span>
                        )}
                      </span>
                    </>
                  );
                  return (
                    <li key={c.id} data-area={c.area || undefined} class={cruzadas.length ? "cruce" : ""}>
                      {c.tipo === "sesion" && c.publicada ? (
                        <Link class="hr-clase" href={`/lessons/${c.id}/`}>{cuerpo}</Link>
                      ) : (
                        <div class="hr-clase">{cuerpo}</div>
                      )}
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </>
      )}
    </div>
  );
});

export const head: DocumentHead = { title: "Mi horario" };
