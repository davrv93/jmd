import { component$, useContext, useStore, useStyles$, useVisibleTask$, $ } from "@builder.io/qwik";
import { Link, type DocumentHead } from "@builder.io/qwik-city";
import { api, crucesPendientes, errMsg, proximaClase, requireLogin, type Certificate, type Course, type Horario, type LessonSummary } from "~/lib/api";
import { SessionContext, isStaff } from "~/lib/session";
import { setTitle } from "~/lib/url";
import { avanceCurso, fDia, fHora, identidadDe, nombreDe } from "~/lib/marca";
import { Icon } from "~/components/icon";
import { Empty, ErrorState, Loading } from "~/components/ui";
import { Ahora, pasoActual, type PasoActual } from "~/components/ahora";
import { Portada } from "~/components/portada";
import CSS from "./mis-cursos.css?inline";

// Mis cursos: arriba «Ahora» (el siguiente paso de verdad, con su comprobación); debajo, los cursos
// con su portada, en curso primero y luego los terminados; y a mano lo que antes estaba en la barra:
// horario, proyectos, recursos y estudio. La próxima clase, lo pendiente y lo que viene viven en Inicio.

interface AhoraCurso {
  curso: Course;
  leccion: LessonSummary;
  paso: PasoActual | null;
}

/** La clase en la que va el alumno: la primera publicada sin terminar (o la última publicada). */
function claseActual(c: Course, certs: Certificate[] = []): LessonSummary | null {
  const ls = c.modules.flatMap((m) => m.lessons).filter((l) => l.published);
  const ganada = (id: string) => certs.some((x) => x.ambito === "clase" && x.lesson_id === id && x.estado === "valido");
  return ls.find((l) => !ganada(l.id) && l.steps > 0 && l.steps_done < l.steps) ?? ls.find((l) => !ganada(l.id)) ?? ls[ls.length - 1] ?? null;
}

/** Porcentaje de pasos hechos sobre las clases publicadas. */
function pctPasos(c: Course): number {
  let d = 0, t = 0;
  for (const m of c.modules) for (const l of m.lessons) if (l.published) {
    d += Math.min(l.steps_done, l.steps);
    t += l.steps;
  }
  return t ? (100 * d) / t : 0;
}

const ATAJOS = [
  { href: "/horario/", icon: "calendar", t: "Mi horario" },
  { href: "/projects/", icon: "task", t: "Proyectos y tareas" },
  { href: "/links/", icon: "link", t: "Recursos" },
  { href: "/studio/", icon: "wand", t: "Estudio" },
];

export default component$(() => {
  useStyles$(CSS);
  const session = useContext(SessionContext);
  const st = useStore<{ courses: Course[] | null; error: string; faltaCert: boolean; ahora: AhoraCurso | null; horario: Horario | null; certs: Certificate[] }>({
    courses: null,
    certs: [],
    error: "",
    faltaCert: false,
    ahora: null,
    horario: null,
  });

  const load = $(async () => {
    st.error = "";
    try {
      const list = await api.courses();
      // Si falla el horario, la página sigue: solo faltan la próxima fecha de cada curso y los cruces.
      api.horario().then((h) => (st.horario = h)).catch(() => undefined);
      const certs = api.misCertificados().catch(() => [] as Certificate[]);
      st.courses = await Promise.all(list.map((c) => api.course(c.slug)));
      st.certs = await certs;
      // El curso «de ahora»: el que tiene avance sin terminar; si no hay, el primero.
      const abiertos = st.courses.filter((x) => { const a = pctPasos(x); return a > 0 && a < 100; }).sort((x, y) => pctPasos(y) - pctPasos(x));
      const c = abiertos[0] ?? st.courses[0];
      const l = c ? claseActual(c, st.certs) : null;
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
    session.help = "curso";
    setTitle("Mis cursos");
    track(() => session.loaded);
    if (!session.loaded) return;
    // Aviso para alumnos que aún no confirmaron su nombre y correo para el certificado.
    if (session.me?.roles.includes("student")) api.misDatosCert().then((d) => (st.faltaCert = !d.completo)).catch(() => undefined);
    await load();
  });

  const ahoraMs = Date.now();
  const clases = st.horario?.clases ?? [];
  const cruces = crucesPendientes(clases, ahoraMs).length;
  const ah = st.ahora;
  const claseN = (c: Course, id: string) => `Clase ${c.modules.flatMap((m) => m.lessons).filter((x) => x.published).findIndex((x) => x.id === id) + 1}`;
  const finDe = (slug: string) => Math.max(0, ...clases.filter((k) => k.curso_slug === slug).map((k) => Date.parse(k.fin)));
  const totalSes = (slug: string) => clases.filter((k) => k.curso_slug === slug).length;
  const proxima = (slug: string) => proximaClase(clases.filter((k) => k.curso_slug === slug), ahoraMs);
  const terminado = (c: Course) => {
    const f = finDe(c.slug);
    return f > 0 ? f < ahoraMs : pctPasos(c) >= 100;
  };
  const staff = isStaff(session.me);
  const enCurso = (st.courses ?? []).filter((c) => !terminado(c)).sort((a, b) => (proxima(a.slug)?.inicio ?? "9").localeCompare(proxima(b.slug)?.inicio ?? "9"));
  const hechos = (st.courses ?? []).filter(terminado).sort((a, b) => finDe(b.slug) - finDe(a.slug));

  const tarjeta = (c: Course) => {
    const id = identidadDe(c);
    const nombre = nombreDe(c);
    const v = avanceCurso(c, totalSes(c.slug));
    const k = proxima(c.slug);
    const pct = v.sesiones ? Math.round((100 * v.hechas) / v.sesiones) : 0;
    return (
      <li key={c.id}>
        <Link class="mc-card" href={`/courses/${c.slug}/`} data-idc={id.color} data-testid="curso">
          <Portada class="mc-portada" nombre={nombre} area={c.area} identidad={id} aspecto={2.6} />
          <span class="mc-cuerpo">
            <b class="mc-nombre">{nombre}</b>
            <span class="mc-grupo">{c.grupo || (c.title.split(" · ").slice(1).join(" · ") || " ")}</span>
            <span class="mc-prox">
              {k ? (
                <><Icon name="calendar" size={13} /> Próxima: {fDia(k.inicio)}, {fHora(k.inicio)}</>
              ) : terminado(c) ? (
                v.hechas >= v.sesiones ? <><Icon name="checkCircle" size={13} /> Terminado</> : <><Icon name="clock" size={13} /> Cerrado · puedes repasarlo</>
              ) : (
                <>{v.sesiones} {v.sesiones === 1 ? "sesión" : "sesiones"}</>
              )}
            </span>
            <span class="mc-barra" role="img" aria-label={`${v.hechas} de ${v.sesiones} sesiones hechas`}>
              <i style={`width:${pct}%`} />
            </span>
            <span class="mc-pie">
              {v.hechas} de {v.sesiones} {v.sesiones === 1 ? "sesión hecha" : "sesiones hechas"}
              {v.tareas > 0 && ` · ${v.entregadas} de ${v.tareas} ${v.tareas === 1 ? "tarea" : "tareas"}`}
            </span>
          </span>
        </Link>
      </li>
    );
  };

  return (
    <div class="mc">
      <div class="mc-cab">
        <h1>Mis cursos</h1>
        {st.courses && st.courses.length > 0 && <span class="mc-sub">{enCurso.length} en curso · {hechos.length} {hechos.length === 1 ? "terminado" : "terminados"}</span>}
      </div>

      {st.error && <ErrorState message={st.error} retry$={load} />}
      {!st.error && st.courses === null && <Loading lines={3} />}

      {ah && ah.paso && (
        <Ahora
          etiqueta={`${claseN(ah.curso, ah.leccion.id)} · paso ${ah.paso.n} de ${ah.paso.total} · ${nombreDe(ah.curso)}`}
          titulo={ah.paso.step.title}
          descripcion={ah.paso.step.description}
          check={ah.paso.step.check}
          accion="Continuar el paso"
          href={`/lessons/${ah.leccion.id}/`}
          avance={`${ah.paso.hechos} de ${ah.paso.total} pasos`}
          pct={ah.paso.total ? (100 * ah.paso.hechos) / ah.paso.total : 0}
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

      {cruces > 0 && (
        <Link class="agenda-vencidas" href="/horario/" data-testid="aviso-cruces">
          <Icon name="alert" size={14} />
          <span class="grow">{cruces === 1 ? "Tienes 1 cruce de horario" : `Tienes ${cruces} cruces de horario`}</span>
          Ver mi horario <Icon name="chevronRight" size={14} />
        </Link>
      )}

      <nav class="mc-atajos" aria-label="Tus herramientas">
        {ATAJOS.map((a) => (
          <Link key={a.href} href={a.href}>
            <Icon name={a.icon} size={15} /> {a.t}
          </Link>
        ))}
        {staff && (
          <Link href="/instructor/agenda/">
            <Icon name="users" size={15} /> Agenda del instructor
          </Link>
        )}
      </nav>

      {st.courses && st.courses.length === 0 && (
        <Empty icon="book" title="Todavía no estás en ningún curso" text="Mira lo que empieza pronto en el Catálogo y elige tu primer curso.">
          <Link class="btn sm" href="/catalogo/">Ver el catálogo</Link>
        </Empty>
      )}

      {enCurso.length > 0 && (
        <section aria-labelledby="mc-curso-t">
          <h2 id="mc-curso-t" class="mc-h2">En curso</h2>
          <ul class="mc-grid">{enCurso.map(tarjeta)}</ul>
        </section>
      )}
      {hechos.length > 0 && (
        <section aria-labelledby="mc-hechos-t">
          <h2 id="mc-hechos-t" class="mc-h2">Terminados</h2>
          <ul class="mc-grid">{hechos.map(tarjeta)}</ul>
        </section>
      )}
      {st.courses && st.courses.length > 0 && (
        <Link class="mc-mas" href="/catalogo/">
          <Icon name="compass" size={18} />
          <span class="grow">
            <b>¿Qué sigue?</b>
            <span>Mira los cursos que empiezan en las próximas semanas.</span>
          </span>
          <Icon name="chevronRight" size={16} />
        </Link>
      )}
    </div>
  );
});

export const head: DocumentHead = { title: "Mis cursos" };
