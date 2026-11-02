import { component$, useContext, useStore, useVisibleTask$, $ } from "@builder.io/qwik";
import { Link, type DocumentHead } from "@builder.io/qwik-city";
import { api, errMsg, fmtDate, rel, requireLogin, STATUS, type AssignmentSummary, type Course, type LessonSummary } from "~/lib/api";
import { SessionContext } from "~/lib/session";
import { setTitle } from "~/lib/url";
import { Icon } from "~/components/icon";
import { Empty, ErrorState, Loading, Status } from "~/components/ui";
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


/** Familia y grupo de un curso: «Programación agéntica · Grupo 2» → familia + «Grupo 2». */
function familiaDe(c: Course): { familia: string; grupo: string } {
  const seg = c.title.split(" · ").map((x) => x.trim());
  const g = seg.length > 1 && /^Grupo\b/i.test(seg[seg.length - 1]) ? seg.pop()! : "";
  return { familia: seg.join(" · "), grupo: g };
}
const VACIAS = new Set(["de", "del", "la", "el", "los", "las", "y", "e", "con", "a", "en", "tu", "un", "una", "para", "por", "no", "que", "lo", "más", "mas", "cero"]);
/** Monograma de la familia: dos iniciales de palabras con peso (o su emoji inicial). */
function monograma(familia: string): string {
  const emoji = familia.match(/^\p{Extended_Pictographic}/u);
  if (emoji) return emoji[0];
  const pal = familia.replace(/\(.*?\)/g, " ").split(/[^\p{L}\p{N}+]+/u).filter((w) => w && !VACIAS.has(w.toLowerCase()));
  const ini = pal.slice(0, 2).map((w) => w[0].toUpperCase()).join("");
  return ini || familia.slice(0, 2).toUpperCase();
}
/** Paleta de lomos (matices oklch que se ven bien a la misma luminosidad; sin amarillos turbios). */
const MATICES = [285, 335, 20, 50, 150, 190, 230, 260, 310, 120];
/** Matiz preferido por familia (FNV-1a), estable entre sesiones y cuentas. */
function tonoBase(familia: string): number {
  let h = 0x811c9dc5;
  for (const ch of familia) { h ^= ch.codePointAt(0)!; h = Math.imul(h, 0x01000193) >>> 0; }
  return h % MATICES.length;
}
/** Asigna a cada familia un matiz distinto: el preferido o, si ya está tomado, el siguiente libre. */
function tonos(familias: string[]): Map<string, number> {
  const usados = new Set<number>(), out = new Map<string, number>();
  for (const f of familias) {
    let i = tonoBase(f);
    for (let k = 0; k < MATICES.length && usados.has(i); k++) i = (i + 1) % MATICES.length;
    usados.add(i);
    out.set(f, MATICES[i]);
  }
  return out;
}
/** Porcentaje de pasos hechos sobre las clases publicadas. */
function avance(c: Course): { pct: number; clases: number; hechas: number } {
  let d = 0, t = 0, clases = 0, hechas = 0;
  for (const m of c.modules) for (const l of m.lessons) if (l.published) {
    clases++;
    d += Math.min(l.steps_done, l.steps);
    t += l.steps;
    if (l.steps > 0 && l.steps_done >= l.steps) hechas++;
  }
  return { pct: t ? (100 * d) / t : 0, clases, hechas };
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
      // El curso «de ahora»: el que tiene avance sin terminar; si no hay, el primero.
      const abiertos = st.courses.filter((x) => { const a = avance(x); return a.pct > 0 && a.pct < 100; }).sort((x, y) => avance(y).pct - avance(x).pct);
      const c = abiertos[0] ?? st.courses[0];
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
  // Cursos agrupados por familia (el instructor ve «Programación agéntica» una vez, con sus grupos
  // dentro); el curso de ahora va primero y, luego, los empezados.
  const familias: { familia: string; cursos: Course[] }[] = [];
  for (const c of st.courses ?? []) {
    const { familia } = familiaDe(c);
    const f = familias.find((x) => x.familia === familia);
    if (f) f.cursos.push(c);
    else familias.push({ familia, cursos: [c] });
  }
  const peso = (f: { cursos: Course[] }) => (f.cursos.some((c) => c.id === rutaCurso?.id) ? 2 : f.cursos.some((c) => avance(c).pct > 0) ? 1 : 0);
  familias.sort((x, y) => peso(y) - peso(x));
  const matiz = tonos(familias.map((f) => f.familia));

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
          {(semana.length > 0 || ruta.length > 0) && (
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

              {ruta.length > 0 && rutaCurso && (
                <section aria-labelledby="ruta-t">
                  <h2 id="ruta-t" class="h2-sec">
                    Tu ruta <span class="h2-sub">{familiaDe(rutaCurso).grupo ? `${familiaDe(rutaCurso).familia} · ${familiaDe(rutaCurso).grupo}` : rutaCurso.title}</span>
                  </h2>
                  <ol class="ruta" data-testid="tu-ruta">
                    {ruta.map((l, i) => {
                      const hecha = l.steps > 0 && l.steps_done >= l.steps;
                      const actual = ah?.leccion.id === l.id && !hecha;
                      const f = l.starts_at ? new Date(l.starts_at) : null;
                      const { num, resto } = partes(l.title);
                      return (
                        <li key={l.id} class={hecha ? "ok" : actual ? "on" : ""}>
                          <Link href={`/lessons/${l.id}/`} class={actual ? "actual" : ""} aria-current={actual ? "step" : undefined}>
                            <span class="ruta-pto" aria-hidden="true">{hecha ? <Icon name="check" size={13} /> : i + 1}</span>
                            <span class="grow" style="min-width:0">
                              <span class="ruta-num">{num}{f ? ` · ${DIA.format(f)} ${MES.format(f).replace(".", "")}` : ""}</span>
                              <b>{resto || l.title}</b>
                              <span class="ruta-est">{hecha ? "Hecha" : actual ? `En curso · ${l.steps_done} de ${l.steps} pasos` : l.steps_done > 0 ? `${l.steps_done} de ${l.steps} pasos` : "Próxima"}</span>
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ol>
                </section>
              )}
            </div>
          )}

          <section aria-labelledby="cursos-t" class="cursos">
            <h2 id="cursos-t" class="h2-sec">
              Mis cursos {st.courses.length > 1 && <span class="h2-sub">{st.courses.length}</span>}
            </h2>
            {st.courses.length === 0 && <Empty icon="book" title="Todavía no estás en ningún curso" text="Pide al instructor que te añada a tu grupo; aparecerá aquí." />}
            <div class="cursos-grid">
              {familias.map(({ familia, cursos }) => {
                const uno = cursos.length === 1 ? cursos[0] : null;
                const h = matiz.get(familia) ?? 285;
                const cab = (
                  <>
                    <span class="curso-lomo" aria-hidden="true">{monograma(familia)}</span>
                    <span class="curso-cuerpo">
                      <b class="curso-tit">{familia}</b>
                      {uno ? (
                        <span class="curso-meta">
                          {uno && familiaDe(uno).grupo && <span class="curso-grupo">{familiaDe(uno).grupo}</span>}
                          {avance(uno).clases} {avance(uno).clases === 1 ? "clase" : "clases"} · {uno.assignments.length} {uno.assignments.length === 1 ? "proyecto" : "proyectos"}
                        </span>
                      ) : (
                        <span class="curso-meta">{cursos.length} grupos</span>
                      )}
                    </span>
                  </>
                );
                return uno ? (
                  <Link key={uno.id} class={`curso-card${avance(uno).pct > 0 ? " empezado" : ""}`} style={`--h:${h}`} href={`/courses/${uno.slug}/`} data-testid="curso">
                    {cab}
                    <span class="curso-av" title={`${Math.round(avance(uno).pct)}% de los pasos`}>
                      <i style={`width:${Math.round(avance(uno).pct)}%`} />
                    </span>
                    <span class="curso-pie">
                      {avance(uno).pct >= 100 ? "Completo" : avance(uno).pct > 0 ? `${Math.round(avance(uno).pct)} % · ${avance(uno).hechas} de ${avance(uno).clases} clases` : "Sin empezar"}
                      <Icon name="chevronRight" size={14} class="faint" />
                    </span>
                  </Link>
                ) : (
                  <div key={familia} class="curso-card varios" style={`--h:${h}`} data-testid="curso-familia">
                    {cab}
                    <ul class="curso-grupos">
                      {cursos.map((c) => {
                        const { grupo } = familiaDe(c);
                        const a = avance(c);
                        return (
                          <li key={c.id}>
                            <Link href={`/courses/${c.slug}/`}>
                              <span class="grow">{grupo || "Grupo 1"}</span>
                              <span class="xs muted">{a.clases} {a.clases === 1 ? "clase" : "clases"}</span>
                              {a.pct > 0 && <span class="xs gold">{Math.round(a.pct)} %</span>}
                              <Icon name="chevronRight" size={14} class="faint" />
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </>
  );
});

export const head: DocumentHead = { title: "Aprender" };
