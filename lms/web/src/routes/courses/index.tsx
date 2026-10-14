import { component$, useContext, useStore, useVisibleTask$, $ } from "@builder.io/qwik";
import { Link, type DocumentHead } from "@builder.io/qwik-city";
import { api, errMsg, fmtDate, rel, requireLogin, STATUS, type AssignmentSummary, type Course, type LessonSummary } from "~/lib/api";
import { SessionContext } from "~/lib/session";
import { setTitle } from "~/lib/url";
import { Icon } from "~/components/icon";
import { Empty, ErrorState, Loading, Ring, Status } from "~/components/ui";
import { Ahora, pasoActual, type PasoActual } from "~/components/ahora";

// Mi aprendizaje (inicio). Sigue el patrón del LMS: arriba «Ahora» (el siguiente paso de verdad, con
// su comprobación), luego lo que viene esta semana y tu ruta. El método (las fases) se explica en
// Ayuda; aquí solo se ve como el punto de color de cada paso.

interface AhoraInicio {
  curso: Course;
  leccion: LessonSummary;
  paso: PasoActual | null;
}

interface Semana {
  tipo: "clase" | "tarea";
  fecha: string;
  titulo: string;
  detalle: string;
  href: string;
  estado?: string;
}

const DIA = new Intl.DateTimeFormat("es-PE", { day: "numeric", timeZone: "America/Lima" });
const MES = new Intl.DateTimeFormat("es-PE", { month: "short", timeZone: "America/Lima" });
const HORA = new Intl.DateTimeFormat("es-PE", { hour: "numeric", minute: "2-digit", timeZone: "America/Lima" });

/** La clase en la que va el alumno: la primera publicada sin terminar (o la última publicada). */
function claseActual(c: Course): LessonSummary | null {
  const ls = c.modules.flatMap((m) => m.lessons).filter((l) => l.published);
  return ls.find((l) => l.steps > 0 && l.steps_done < l.steps) ?? ls[ls.length - 1] ?? null;
}

export default component$(() => {
  const session = useContext(SessionContext);
  const st = useStore<{ courses: Course[] | null; error: string; faltaCert: boolean; ahora: AhoraInicio | null }>({
    courses: null,
    error: "",
    faltaCert: false,
    ahora: null,
  });

  const load = $(async () => {
    st.error = "";
    try {
      const list = await api.courses();
      st.courses = await Promise.all(list.map((c) => api.course(c.slug)));
      const c = st.courses[0];
      const l = c ? claseActual(c) : null;
      if (c && l) {
        const det = await api.lesson(l.id).catch(() => null);
        st.ahora = { curso: c, leccion: l, paso: det ? pasoActual(det) : null };
      }
    } catch (e) {
      if (!requireLogin(e)) st.error = errMsg(e);
    }
  });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async ({ track }) => {
    session.help = "inicio";
    setTitle("Aprender");
    track(() => session.loaded);
    if (!session.loaded) return;
    // Aviso para alumnos que aún no confirmaron su nombre y correo para el certificado.
    if (session.me?.roles.includes("student")) api.misDatosCert().then((d) => (st.faltaCert = !d.completo)).catch(() => undefined);
    await load();
  });

  const pct = (c: Course) => {
    let d = 0,
      t = 0;
    for (const m of c.modules) for (const l of m.lessons) if (l.published) {
      d += Math.min(l.steps_done, l.steps);
      t += l.steps;
    }
    return t ? (100 * d) / t : 0;
  };

  // Esta semana: clases en vivo de los próximos 7 días y tareas pendientes, por fecha.
  const ahoraMs = Date.now();
  const semana: Semana[] = [];
  // Con varios cursos (el instructor ve los tres grupos), cada fila dice de qué grupo es.
  const varios = (st.courses?.length ?? 0) > 1;
  const grupoDe = (c: Course) => (varios ? `${c.title.includes(" · ") ? c.title.split(" · ").slice(1).join(" · ") : c.title} · ` : "");
  const partes = (titulo: string) => {
    const seg = titulo.split(" · ");
    const i = seg.findIndex((s) => /^Clase \d+/.test(s));
    return i < 0 ? { num: seg[0], resto: seg.slice(1).join(" · ") } : { num: seg[i], resto: seg.slice(i + 1).join(" · ") };
  };
  const pendientes: (AssignmentSummary & { course: string })[] = [];
  for (const c of st.courses ?? []) {
    for (const m of c.modules)
      for (const l of m.lessons)
        if (l.published && l.starts_at) {
          const t = Date.parse(l.starts_at);
          if (t > ahoraMs - 3 * 3600e3 && t < ahoraMs + 7 * 86400e3) {
            const { num, resto } = partes(l.title);
            semana.push({ tipo: "clase", fecha: l.starts_at, titulo: `${num} en vivo`, detalle: `${grupoDe(c)}${resto || l.title} · ${HORA.format(new Date(t))}`, href: `/lessons/${l.id}/` });
          }
        }
    for (const a of c.assignments)
      if (a.status === "pending" || a.status === "overdue") {
        pendientes.push({ ...a, course: c.title });
        semana.push({ tipo: "tarea", fecha: a.due_at ?? "9999", titulo: a.title, detalle: `${grupoDe(c)}${a.due_at ? `Vence ${rel(a.due_at)} · ${a.max_score} puntos` : "Sin fecha límite"}`, href: `/assignments/${a.id}/`, estado: a.status });
      }
  }
  semana.sort((a, b) => a.fecha.localeCompare(b.fecha));

  const first = session.me?.name.split(" ")[0] ?? "";
  const ah = st.ahora;
  const rutaCurso = ah?.curso ?? st.courses?.[0];
  const ruta = rutaCurso ? rutaCurso.modules.flatMap((m) => m.lessons).filter((l) => l.published) : [];
  const numClase = (t: string) => t.split(" · ")[0];

  return (
    <>
      <div class="row" style="justify-content:space-between;align-items:baseline;margin-bottom:1rem">
        <h1 style="margin:0">{first ? `Hola, ${first}` : "Aprender"}</h1>
        {rutaCurso && <span class="muted">{rutaCurso.title}</span>}
      </div>

      {st.error && <ErrorState message={st.error} retry$={load} />}
      {!st.error && st.courses === null && <Loading lines={3} />}

      {ah && ah.paso && (
        <Ahora
          etiqueta={`Ahora · ${numClase(ah.leccion.title)} · paso ${ah.paso.n} de ${ah.paso.total} · ${ah.paso.fase.short}`}
          fase={ah.paso.fase.token}
          titulo={ah.paso.step.title}
          descripcion={ah.paso.step.description}
          check={ah.paso.step.check}
          accion="Continuar el paso"
          href={`/lessons/${ah.leccion.id}/`}
          avance={`${numClase(ah.leccion.title)}: ${ah.paso.hechos} de ${ah.paso.total} pasos`}
          pct={ah.paso.total ? (100 * ah.paso.hechos) / ah.paso.total : 0}
        />
      )}
      {ah && !ah.paso && (
        <Ahora
          etiqueta="Ahora"
          titulo={pendientes.length ? `Entrega: ${pendientes[0].title}` : "Vas al día: terminaste las clases publicadas"}
          descripcion={pendientes.length ? "Hiciste todos los pasos de las clases publicadas. Falta tu proyecto." : "Cuando el instructor publique la siguiente clase, aparecerá aquí."}
          accion={pendientes.length ? "Ir al proyecto" : "Ver mis logros"}
          href={pendientes.length ? `/assignments/${pendientes[0].id}/` : "/grades/"}
        />
      )}

      {st.faltaCert && (
        <Link class="card row datos-cert-aviso" href="/grades/" data-testid="aviso-datos-certificado">
          <span class="lead-ico gold"><Icon name="award" /></span>
          <span class="grow">
            <b>Confirma tus datos para el certificado</b>
            <div class="xs muted">Tu nombre completo tal como saldrá impreso y el correo donde lo recibirás. Toma un minuto.</div>
          </span>
          <span class="btn sm gold">Completar <Icon name="chevronRight" size={14} /></span>
        </Link>
      )}

      {st.courses && (
        <>
          <div class="inicio-cols">
            <section aria-labelledby="semana-t">
              <h2 id="semana-t" class="h2-sec">Esta semana</h2>
              {semana.length === 0 ? (
                <Empty icon="checkCircle" title="Nada pendiente esta semana" text="Cuando haya una clase en vivo o una entrega cerca, aparecerá aquí." />
              ) : (
                <div class="semana" data-testid="esta-semana">
                  {semana.slice(0, 6).map((s) => {
                    const d = new Date(s.fecha);
                    const valida = !isNaN(d.getTime());
                    return (
                      <Link key={s.tipo + s.href} class="it" href={s.href}>
                        <span class="dia">
                          {valida ? (
                            <>
                              <b>{DIA.format(d)}</b>
                              <span>{MES.format(d).replace(".", "")}</span>
                            </>
                          ) : (
                            <Icon name="task" />
                          )}
                        </span>
                        <span class="grow" style="min-width:0">
                          <b>{s.titulo}</b>
                          <div class="sm muted" title={valida ? fmtDate(s.fecha) : undefined}>{s.detalle}</div>
                        </span>
                        {s.estado ? <Status s={STATUS[s.estado] ?? STATUS.pending} /> : <span class="badge accent"><Icon name="video" size={12} /> En vivo</span>}
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>

            <aside aria-labelledby="cursos-t">
              <h2 id="cursos-t" class="h2-sec">Mis cursos</h2>
              {st.courses.length === 0 && <Empty icon="book" title="Todavía no estás en ningún curso" text="Pide al instructor que te añada a tu grupo; aparecerá aquí." />}
              <div class="stack">
                {st.courses.map((c) => (
                  <Link key={c.id} class="card row" href={`/courses/${c.slug}/`} style="gap:.9rem;flex-wrap:nowrap">
                    <Ring pct={pct(c)} size={46} />
                    <span class="grow" style="min-width:0">
                      <b>{c.title}</b>
                      <div class="xs muted">
                        {c.modules.flatMap((m) => m.lessons).filter((l) => l.published).length} clases · {c.assignments.length} proyectos
                      </div>
                    </span>
                    <Icon name="chevronRight" class="faint" />
                  </Link>
                ))}
              </div>
            </aside>
          </div>

          {ruta.length > 0 && (
            <section aria-labelledby="ruta-t" style="margin-top:1.6rem">
              <h2 id="ruta-t" class="h2-sec">Tu ruta</h2>
              <ol class="ruta" data-testid="tu-ruta">
                {ruta.map((l) => {
                  const hecha = l.steps > 0 && l.steps_done >= l.steps;
                  const actual = ah?.leccion.id === l.id && !hecha;
                  const f = l.starts_at ? new Date(l.starts_at) : null;
                  return (
                    <li key={l.id}>
                      <Link href={`/lessons/${l.id}/`} class={actual ? "actual" : ""} aria-current={actual ? "step" : undefined}>
                        <span class={`est${hecha ? " ok" : actual ? " on" : ""}`}>
                          {hecha ? "Hecha" : actual ? "En curso" : "Próxima"}
                          {f ? ` · ${DIA.format(f)} ${MES.format(f).replace(".", "")}` : ""}
                        </span>
                        <b>{l.title}</b>
                        <span class="sm muted">
                          {l.steps_done} de {l.steps} pasos
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </section>
          )}
        </>
      )}
    </>
  );
});

export const head: DocumentHead = { title: "Aprender" };
