import { component$, useContext, useSignal, useStore, useStyles$, useVisibleTask$, $ } from "@builder.io/qwik";
import { Link, type DocumentHead } from "@builder.io/qwik-city";
import { api, errMsg, proximaClase, requireLogin, STATUS, type Catalogo, type Certificate, type Course, type Horario, type HorarioClase } from "~/lib/api";
import { SessionContext } from "~/lib/session";
import { setTitle } from "~/lib/url";
import { avanceCurso, faltan, fDia, fHora, fLarga, identidadDe, nombreDe } from "~/lib/marca";
import { Icon } from "~/components/icon";
import { ErrorState, Loading, Status } from "~/components/ui";
import { Portada } from "~/components/portada";
import { AnillosCurso } from "~/components/graficos";
import { CaminoBloque, pasosCamino } from "~/components/camino-bloque";
import { TarjetaCurso } from "~/components/tarjeta-curso";
import CSS from "./inicio.css?inline";

// Inicio del alumno: la próxima clase con su botón para entrar, lo pendiente (tres como mucho), el
// avance de cada curso activo, lo que le conviene llevar después y su camino hasta hoy. Responde a
// «no sé qué tengo, no veo qué viene, siento que no avanzo».

interface St {
  horario: Horario | null;
  cursos: Course[] | null;
  certs: Certificate[];
  catalogo: Catalogo | null;
  error: string;
}

/** «Hoy», «Mañana» o «dom 30 nov», en hora de Lima. */
function diaRelativo(t: number, ahora: number): string {
  const dia = (ms: number) => new Date(ms - 5 * 3600e3).toISOString().slice(0, 10);
  if (dia(t) === dia(ahora)) return "Hoy";
  if (dia(t) === dia(ahora + 86400e3)) return "Mañana";
  const s = fDia(t);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default component$(() => {
  useStyles$(CSS);
  const session = useContext(SessionContext);
  const st = useStore<St>({ horario: null, cursos: null, certs: [], catalogo: null, error: "" });
  const ahora = useSignal(Date.now());

  const load = $(async () => {
    st.error = "";
    try {
      const [horario, lista] = await Promise.all([api.horario().catch(() => null), api.courses()]);
      st.horario = horario;
      api.misCertificados().then((c) => (st.certs = c)).catch(() => undefined);
      api.catalogo().then((c) => (st.catalogo = c)).catch(() => undefined);
      st.cursos = await Promise.all(lista.map((c) => api.course(c.slug)));
    } catch (e) {
      if (!requireLogin(e)) st.error = errMsg(e);
    }
  });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async ({ track, cleanup }) => {
    session.help = "inicio";
    setTitle("Inicio");
    const t = setInterval(() => (ahora.value = Date.now()), 30e3);
    cleanup(() => clearInterval(t));
    track(() => session.loaded);
    if (session.loaded) await load();
  });

  const now = ahora.value;
  const nombre = session.me?.name.split(" ")[0] ?? "";
  const clases = st.horario?.clases ?? [];
  const prox: HorarioClase | null = proximaClase(clases, now);
  const cursoDe = (slug?: string) => st.cursos?.find((c) => c.slug === slug || c.id === slug);
  const marca = (slug?: string) => {
    const c = cursoDe(slug);
    const h = st.horario?.cursos.find((x) => x.slug === slug);
    const k = st.catalogo?.cursos.find((x) => x.slug === slug);
    const base = { nombre: c?.nombre ?? h?.nombre ?? k?.nombre ?? "", area: c?.area ?? h?.area ?? k?.area, identidad: c?.identidad ?? k?.identidad };
    return { ...base, nombre: base.nombre || nombreDe({ title: c?.title }), identidad: identidadDe({ ...base, description: c?.description }) };
  };

  // Lo pendiente: tareas por entregar con su fecha, la más cercana primero. Las vencidas (muchas veces
  // de cursos ya cerrados) van juntas en una sola línea, para que no tapen lo de esta semana.
  const porEntregar = (st.cursos ?? [])
    .flatMap((c) => c.assignments.filter((a) => a.status === "pending").map((a) => ({ a, c })))
    .sort((x, y) => (x.a.due_at ?? "9999").localeCompare(y.a.due_at ?? "9999"));
  const vencidas = (st.cursos ?? []).reduce((n, c) => n + c.assignments.filter((a) => a.status === "overdue").length, 0);

  // Cursos activos: con clases por delante (o sin fechas y a medio hacer). Los cerrados van al camino.
  const finDe = (slug: string) => Math.max(0, ...clases.filter((k) => k.curso_slug === slug).map((k) => Date.parse(k.fin)));
  const totalSes = (slug: string) => clases.filter((k) => k.curso_slug === slug).length;
  const activos = (st.cursos ?? []).filter((c) => {
    const f = finDe(c.slug);
    return f > now || (f === 0 && c.modules.some((m) => m.lessons.some((l) => l.steps_done > 0 && l.steps_done < l.steps)));
  });

  // Camino: cada curso del alumno con la fecha en que termina (o terminó).
  const pasos = pasosCamino(st.horario, (slug) => marca(slug).nombre);

  // Siguiente paso: lo que recomienda el servidor; si no hay, lo próximo con inscripción.
  const cat = st.catalogo?.cursos ?? [];
  const recomendados = cat.filter((c) => c.recomendado).sort((a, b) => a.recomendado!.orden - b.recomendado!.orden);
  const siguiente = (recomendados.length ? recomendados : cat.filter((c) => !c.inscrito && c.estado === "proximo")).slice(0, 3);

  // La próxima clase: hacia dónde lleva «Entrar».
  let entrar = "";
  let enVivo = false;
  let pm: ReturnType<typeof marca> | null = null;
  if (prox) {
    const ini = Date.parse(prox.inicio);
    enVivo = now >= ini - 10 * 60e3 && now < Date.parse(prox.fin);
    entrar = prox.live && now >= ini - 30 * 60e3 ? `/live/${encodeURIComponent(prox.id)}/` : prox.publicada ? `/lessons/${encodeURIComponent(prox.id)}/` : `/courses/${encodeURIComponent(prox.curso_slug ?? "")}/`;
    pm = marca(prox.curso_slug);
  }

  return (
    <div class="ini">
      <div class="ini-cab">
        <h1>{nombre ? `Hola, ${nombre}` : "Inicio"}</h1>
        <span class="ini-hoy">{(() => { const h = fLarga(now); return h.charAt(0).toUpperCase() + h.slice(1); })()}</span>
      </div>

      {st.error && <ErrorState message={st.error} retry$={load} />}
      {!st.error && st.cursos === null && <Loading lines={4} />}

      {st.cursos && (
        <>
          {prox && pm ? (
            <section class="ini-prox" data-idc={pm.identidad.color} aria-labelledby="prox-t" data-testid="proxima-clase">
              <Portada class="ini-prox-arte" nombre={pm.nombre} area={pm.area} identidad={pm.identidad} aspecto={4} glifo={false} />
              <div class="ini-prox-in">
                <div class="ini-prox-cuando">
                  <span class="ini-prox-dia">{diaRelativo(Date.parse(prox.inicio), now)}</span>
                  <span class="ini-prox-hora">{fHora(prox.inicio)}</span>
                  {enVivo ? (
                    <span class="ini-envivo"><i aria-hidden="true" /> En vivo ahora</span>
                  ) : (
                    <span class="ini-prox-falta">Empieza {faltan(Date.parse(prox.inicio) - now)}</span>
                  )}
                </div>
                <div class="ini-prox-que">
                  <h2 id="prox-t">{pm.nombre}</h2>
                  <p>
                    {prox.numero && prox.total ? `Sesión ${prox.numero} de ${prox.total}` : "Tu próxima clase"}
                    {prox.titulo ? ` · ${prox.titulo.replace(/^(Grupo \d+ · )?(Clase|Sesión) \d+ · /i, "")}` : ""}
                  </p>
                  <p class="ini-prox-grupo">{prox.grupo} · {prox.minutos} min por Zoom</p>
                </div>
                <div class="ini-prox-acc">
                  <a class="btn ini-entrar" href={entrar}>
                    <Icon name="play" size={16} /> Entrar
                  </a>
                  <Link class="ini-prox-sec" href="/horario/">Ver mi horario</Link>
                </div>
              </div>
            </section>
          ) : (
            <section class="ini-sin-clase">
              <span class="lead-ico"><Icon name="calendar" /></span>
              <div class="grow">
                <b>No tienes clases programadas</b>
                <p class="sm muted">Mira lo que empieza en las próximas semanas y elige tu siguiente curso.</p>
              </div>
              <Link class="btn" href="/catalogo/">Ver el catálogo</Link>
            </section>
          )}

          <div class="ini-cols">
            <section class="ini-pend" aria-labelledby="pend-t">
              <h2 id="pend-t" class="ini-h2">
                Pendiente
                {porEntregar.length > 0 && <span class="ini-h2-n">{porEntregar.length}</span>}
              </h2>
              {porEntregar.length === 0 ? (
                <p class="ini-vacio"><Icon name="checkCircle" size={18} /> Nada por entregar esta semana. Vas al día.</p>
              ) : (
                <ul class="ini-tareas" data-testid="pendientes">
                  {porEntregar.slice(0, 3).map(({ a, c }) => (
                    <li key={a.id} data-idc={identidadDe(c).color}>
                      <Link href={`/assignments/${a.id}/`}>
                        <span class="grow">
                          <b>{a.title}</b>
                          <span class="ini-tarea-meta">
                            {nombreDe(c)}
                            {a.due_at ? ` · entrega ${fDia(a.due_at)}` : " · sin fecha límite"}
                          </span>
                        </span>
                        <Status s={STATUS[a.status] ?? STATUS.pending} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              {porEntregar.length > 3 && (
                <Link class="ini-mas" href="/projects/">Ver las {porEntregar.length} tareas <Icon name="chevronRight" size={14} /></Link>
              )}
              {vencidas > 0 && (
                <Link class="ini-vencidas" href="/projects/" data-testid="vencidas">
                  <Icon name="clock" size={15} />
                  <span class="grow">
                    {vencidas === 1 ? "1 entrega pasó su fecha" : `${vencidas} entregas pasaron su fecha`}
                    <span class="muted"> · aún puedes entregarlas</span>
                  </span>
                  <Icon name="chevronRight" size={14} />
                </Link>
              )}
            </section>

            <section class="ini-avance" aria-labelledby="av-t">
              <h2 id="av-t" class="ini-h2">Tu avance</h2>
              {activos.length === 0 ? (
                <p class="ini-vacio"><Icon name="book" size={18} /> Cuando tengas un curso activo, verás aquí tus sesiones y tareas.</p>
              ) : (
                <ul class="ini-anillos" data-testid="avance">
                  {activos.map((c) => {
                    const v = avanceCurso(c, totalSes(c.slug));
                    const id = identidadDe(c);
                    return (
                      <li key={c.id} data-idc={id.color}>
                        <Link href={`/courses/${c.slug}/`} class="ini-anillo">
                          <AnillosCurso hechas={v.hechas} sesiones={v.sesiones} entregadas={v.entregadas} tareas={v.tareas} />
                          <span class="grow">
                            <b>{nombreDe(c)}</b>
                            <span class="ini-ley"><i class="ses" aria-hidden="true" />{v.hechas} de {v.sesiones} {v.sesiones === 1 ? "sesión hecha" : "sesiones hechas"}</span>
                            {v.tareas > 0 ? (
                              <span class="ini-ley"><i class="tar" aria-hidden="true" />{v.entregadas} de {v.tareas} {v.tareas === 1 ? "tarea entregada" : "tareas entregadas"}</span>
                            ) : (
                              <span class="ini-ley sin">Sin tareas</span>
                            )}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>

          {siguiente.length > 0 && (
            <section class="ini-sig" aria-labelledby="sig-t">
              <div class="ini-h2-fila">
                <h2 id="sig-t" class="ini-h2">Tu siguiente paso</h2>
                <Link class="ini-mas" href="/catalogo/">Ver todo lo que viene <Icon name="chevronRight" size={14} /></Link>
              </div>
              <div class="ini-sig-grid" data-testid="siguiente-paso">
                {siguiente.map((c) => (
                  <TarjetaCurso key={c.id} c={c} ahora={now} razon />
                ))}
              </div>
            </section>
          )}

          <section class="ini-camino" aria-labelledby="cam-t">
            <div class="ini-h2-fila">
              <h2 id="cam-t" class="ini-h2">Tu camino</h2>
              <Link class="ini-mas" href="/grades/">Ver mis logros <Icon name="chevronRight" size={14} /></Link>
            </div>
            <CaminoBloque pasos={pasos} ahora={now} certs={st.certs} />
          </section>
        </>
      )}
    </div>
  );
});

export const head: DocumentHead = { title: "Inicio" };
