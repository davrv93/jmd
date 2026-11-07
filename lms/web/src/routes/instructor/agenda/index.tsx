import {
  component$,
  useComputed$,
  useContext,
  useSignal,
  useStore,
  useVisibleTask$,
  $,
} from "@builder.io/qwik";
import { Link, type DocumentHead } from "@builder.io/qwik-city";
import { api, errMsg, requireLogin, type AgendaClase } from "~/lib/api";
import { SessionContext, toast } from "~/lib/session";
import { setTitle } from "~/lib/url";
import { Icon } from "~/components/icon";
import { Empty, ErrorState, Loading } from "~/components/ui";

// Calendario del instructor organizado por grupo: arriba la clase de hoy (o la próxima) con su botón
// para entrar; debajo cada grupo activo con su próxima sesión, su avance y sus acciones.

const LIMA = "America/Lima";
const fHora = new Intl.DateTimeFormat("es-PE", {
  timeZone: LIMA,
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});
const fDia = new Intl.DateTimeFormat("es-PE", {
  timeZone: LIMA,
  weekday: "short",
  day: "numeric",
});
const fDiaLargo = new Intl.DateTimeFormat("es-PE", {
  timeZone: LIMA,
  weekday: "long",
  day: "numeric",
  month: "long",
});
const fClave = new Intl.DateTimeFormat("en-CA", {
  timeZone: LIMA,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const hora = (iso: string) =>
  fHora.format(new Date(iso)).replace(/\s+/g, "\u00a0");
const diaCorto = (iso: string) => fDia.format(new Date(iso)).replace(".", "");
const diaDe = (t: number) => fClave.format(new Date(t));

/** «Hoy», «Mañana» o «sábado 7 de noviembre», según el día de Lima. */
function cuando(iso: string, ahora: number): string {
  const d = diaDe(Date.parse(iso));
  if (d === diaDe(ahora)) return "Hoy";
  if (d === diaDe(ahora + 864e5)) return "Mañana";
  return fDiaLargo.format(new Date(iso));
}

function falta(ms: number): string {
  const min = Math.max(1, Math.round(ms / 6e4));
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60),
    m = min % 60;
  if (h < 24) return m ? `${h} h ${m} min` : `${h} h`;
  const d = Math.floor(h / 24);
  return d === 1 ? "1 día" : `${d} días`;
}

const duracion = (min: number) =>
  min % 60
    ? min >= 60
      ? `${Math.floor(min / 60)}\u00a0h\u00a0${min % 60}\u00a0min`
      : `${min}\u00a0min`
    : `${min / 60}\u00a0h`;

const sesionTxt = (c: AgendaClase) =>
  c.numero && c.total ? `Sesión ${c.numero} de ${c.total}` : c.titulo;

type Grupo = {
  clave: string;
  nombre: string;
  grupo: string;
  area: string;
  clases: AgendaClase[];
  dictadas: number;
  proxima: AgendaClase | null;
};

function agrupar(clases: AgendaClase[], ahora: number): Grupo[] {
  const mapa = new Map<string, Grupo>();
  for (const c of clases) {
    const clave = c.curso_slug ?? `${c.nombre}|${c.grupo}`;
    let g = mapa.get(clave);
    if (!g)
      mapa.set(
        clave,
        (g = {
          clave,
          nombre: c.nombre,
          grupo: c.grupo,
          area: c.area ?? "",
          clases: [],
          dictadas: 0,
          proxima: null,
        }),
      );
    g.clases.push(c);
    if (Date.parse(c.fin) <= ahora) g.dictadas++;
    else if (!g.proxima) g.proxima = c;
  }
  return [...mapa.values()];
}

export default component$(() => {
  const session = useContext(SessionContext);
  const st = useStore<{ clases: AgendaClase[] | null; error: string }>({
    clases: null,
    error: "",
  });
  const ahora = useSignal(Date.now());

  const load = $(async () => {
    st.error = "";
    try {
      st.clases = (await api.agenda()).clases;
    } catch (e) {
      if (!requireLogin(e)) st.error = errMsg(e);
    }
  });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async ({ cleanup }) => {
    // La página es estática: la hora del build no sirve, se toma la del navegador.
    ahora.value = Date.now();
    session.help = "instructor";
    setTitle("Agenda");
    await load();
    const t = setInterval(() => (ahora.value = Date.now()), 30000);
    cleanup(() => clearInterval(t));
  });

  const vista = useComputed$(() => {
    const clases = st.clases ?? [];
    const t = ahora.value;
    const grupos = agrupar(clases, t);
    const activos = grupos
      .filter((g) => g.proxima)
      .sort(
        (a, b) => Date.parse(a.proxima!.inicio) - Date.parse(b.proxima!.inicio),
      );
    const terminados = grupos.filter(
      (g) =>
        !g.proxima &&
        Date.parse(g.clases[g.clases.length - 1].fin) > t - 30 * 864e5,
    );
    const vivo =
      clases.find((c) => Date.parse(c.inicio) <= t && Date.parse(c.fin) > t) ??
      null;
    const siguiente = clases.find((c) => Date.parse(c.inicio) > t) ?? null;
    const foco = vivo ?? siguiente;
    const mismoDia = foco
      ? clases.filter(
          (c) =>
            c !== foco &&
            diaDe(Date.parse(c.inicio)) === diaDe(Date.parse(foco.inicio)) &&
            Date.parse(c.inicio) > Date.parse(foco.inicio),
        )
      : [];
    const hoy = clases.filter(
      (c) => diaDe(Date.parse(c.inicio)) === diaDe(t) && Date.parse(c.fin) > t,
    ).length;
    return { activos, terminados, vivo, foco, mismoDia, hoy };
  });

  const copiar = $(async (grupo: string) => {
    const url = `${location.origin}/inscripcion/${grupo}/`;
    try {
      await navigator.clipboard.writeText(url);
      toast(session, "Enlace de inscripción copiado");
    } catch {
      toast(session, `No se pudo copiar. El enlace es ${url}`, "bad");
    }
  });

  const v = vista.value;
  const f = v.foco;
  return (
    <>
      <div class="ag-pagina">
        <div class="head">
          <div class="grow">
            <h1>Agenda</h1>
            <p class="ag-sub">Hora de Lima</p>
          </div>
          <Link class="btn ghost sm" href="/instructor/simulador/">
            <Icon name="eye" size={14} /> Ver como alumno
          </Link>
          <Link class="btn ghost sm" href="/instructor/">
            <Icon name="chevronLeft" size={14} /> Instructor
          </Link>
        </div>

        {st.error && <ErrorState message={st.error} retry$={load} />}
        {!st.error && st.clases === null && <Loading lines={4} />}

        {st.clases && !f && (
          <Empty
            icon="calendar"
            title="No tienes clases por delante"
            text="Cuando una sesión de tus cursos tenga fecha y hora, aparece aquí con su grupo."
          />
        )}

        {f && (
          <section
            class={`ag-foco${v.vivo ? " vivo" : ""}`}
            aria-labelledby="ag-foco-t"
          >
            <div class="ag-foco-hora">
              <span class="ag-reloj">{hora(f.inicio)}</span>
              <span class="ag-hasta">
                {v.vivo ? (
                  <span class="ag-envivo">
                    <i aria-hidden="true" /> En vivo
                  </span>
                ) : (
                  cuando(f.inicio, ahora.value)
                )}{" "}
                · hasta {hora(f.fin)} · {duracion(f.minutos)}
              </span>
            </div>
            <div class="ag-foco-que">
              <h2 id="ag-foco-t">{f.nombre}</h2>
              <p class="ag-foco-det">
                {f.grupo} · {sesionTxt(f)}
                {f.numero && f.numero === f.total ? " (última)" : ""}
              </p>
              <p class="ag-cuenta" aria-live="polite">
                <Icon name="clock" size={15} />
                {v.vivo
                  ? `Termina en ${falta(Date.parse(f.fin) - ahora.value)}`
                  : `Empieza en ${falta(Date.parse(f.inicio) - ahora.value)}`}
              </p>
              {f.estado !== "confirmado" && (
                <p class="ag-foco-nota">
                  {f.estado === "propuesto"
                    ? "Curso propuesto"
                    : "Por confirmar"}
                  {f.nota ? ` · ${f.nota}` : ""}
                </p>
              )}
              <div class="ag-foco-acc">
                {f.tipo === "sesion" &&
                  (f.live ? (
                    <a class="btn ag-entrar" href={`/live/${f.id}/`}>
                      <Icon name="play" size={16} /> Entrar a la mesa
                    </a>
                  ) : (
                    <Link class="btn ag-entrar" href={`/lessons/${f.id}/`}>
                      <Icon name="book" size={16} /> Abrir sesión
                    </Link>
                  ))}
                {f.live && (
                  <Link class="btn ghost" href={`/lessons/${f.id}/`}>
                    <Icon name="book" size={15} /> Sesión
                  </Link>
                )}
                {f.inscripcion && (
                  <button
                    type="button"
                    class="btn ghost"
                    onClick$={() => copiar(f.inscripcion!)}
                  >
                    <Icon name="copy" size={15} /> Enlace
                  </button>
                )}
              </div>
              {v.mismoDia.length > 0 && (
                <p class="ag-despues">
                  Después:{" "}
                  {v.mismoDia
                    .map((c) => `${c.nombre} · ${hora(c.inicio)}`)
                    .join(" · ")}
                </p>
              )}
            </div>
          </section>
        )}

        {v.activos.length > 0 && (
          <>
            <h2 class="ag-t">
              Grupos activos <span class="muted">· {v.activos.length}</span>
              {v.hoy > 0 && (
                <span class="badge gold">
                  {v.hoy === 1 ? "1 clase hoy" : `${v.hoy} clases hoy`}
                </span>
              )}
            </h2>
            <ol class="ag-lista">
              {v.activos.map((g) => {
                const p = g.proxima!;
                const esHoy =
                  diaDe(Date.parse(p.inicio)) === diaDe(ahora.value);
                return (
                  <li
                    key={g.clave}
                    class={`ag-fila${esHoy ? " hoy" : ""}${p === f ? " es-foco" : ""}`}
                    data-area={g.area || undefined}
                  >
                    <span class="ag-cuandoc">
                      <b>{esHoy ? "hoy" : diaCorto(p.inicio)}</b>
                      <span>{hora(p.inicio)}</span>
                    </span>
                    <span class="ag-grupo">
                      <span class="ag-nombre">
                        <i class="ag-punto" aria-hidden="true" />
                        <b>{g.nombre}</b>
                      </span>
                      <span class="ag-sig muted">
                        {p.estado === "propuesto" && (
                          <span class="badge accent">propuesto</span>
                        )}
                        {p.estado === "por-confirmar" && (
                          <span class="badge warn">por confirmar</span>
                        )}
                        {[
                          g.grupo,
                          p.total === 1
                            ? ""
                            : p.numero && p.total
                              ? `Sesión ${p.numero} de ${p.total}${p.numero === p.total ? " · última" : ""}`
                              : p.titulo,
                          duracion(p.minutos),
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                      <span
                        class="ag-avance"
                        role="img"
                        aria-label={`${g.dictadas} de ${g.clases.length} sesiones dictadas`}
                      >
                        {g.clases.map((c, i) => (
                          <i
                            key={c.id}
                            class={
                              i < g.dictadas ? "hecha" : c === p ? "sig" : ""
                            }
                          />
                        ))}
                      </span>
                    </span>
                    <span class="ag-acc">
                      {p.tipo === "sesion" && p.live && (
                        <a
                          class="btn ghost sm"
                          href={`/live/${p.id}/`}
                          aria-label={`Entrar a la mesa de ${g.nombre} ${g.grupo}`}
                        >
                          <Icon name="play" size={14} /> Mesa
                        </a>
                      )}
                      {p.tipo === "sesion" && (
                        <Link
                          class="btn ghost sm"
                          href={`/lessons/${p.id}/`}
                          aria-label={`Abrir la sesión de ${g.nombre} ${g.grupo}`}
                        >
                          <Icon name="book" size={14} /> Sesión
                        </Link>
                      )}
                      {p.inscripcion && (
                        <button
                          type="button"
                          class="btn ghost sm"
                          onClick$={() => copiar(p.inscripcion!)}
                          aria-label={`Copiar el enlace de inscripción de ${g.nombre} ${g.grupo}`}
                        >
                          <Icon name="copy" size={14} /> Enlace
                        </button>
                      )}
                    </span>
                  </li>
                );
              })}
            </ol>
          </>
        )}

        {v.terminados.length > 0 && (
          <details class="ag-terminados">
            <summary>
              Terminados en los últimos 30 días · {v.terminados.length}
            </summary>
            <ul>
              {v.terminados.map((g) => (
                <li key={g.clave} data-area={g.area || undefined}>
                  <i class="ag-punto" aria-hidden="true" />
                  <b>{g.nombre}</b>{" "}
                  <span class="muted">
                    · {g.grupo} · última clase{" "}
                    {diaCorto(g.clases[g.clases.length - 1].inicio)}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </>
  );
});

export const head: DocumentHead = { title: "Agenda" };
