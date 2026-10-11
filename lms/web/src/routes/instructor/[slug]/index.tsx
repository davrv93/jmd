import { component$, useContext, useSignal, useStore, useVisibleTask$, $ } from "@builder.io/qwik";
import { Link, useLocation, type DocumentHead, type StaticGenerateHandler } from "@builder.io/qwik-city";
import { api, errMsg, fmtDate, rel, requireLogin, STATUS, type Certificate, type Course, type CourseProgress } from "~/lib/api";
import { SessionContext, toast } from "~/lib/session";
import { getParam, pathId, setParams, setTitle } from "~/lib/url";
import { Icon } from "~/components/icon";
import { Bar, Crumbs, Empty, ErrorState, Loading, Status, Tabs } from "~/components/ui";

// Formulario en línea para emitir un certificado a un alumno (se abre en su fila).
interface EmitForm {
  user: string; // id del alumno con el formulario abierto; "" = cerrado
  tipo: "participacion" | "aprobacion";
  horas: number;
  nota: string;
  busy: boolean;
  error: string;
  confirmAnular: string; // código pendiente de confirmar
  anulando: boolean;
}

export default component$(() => {
  const loc = useLocation();
  const session = useContext(SessionContext);
  const st = useStore<{ c: Course | null; p: CourseProgress | null; error: string; certs: Record<string, Certificate> }>({ c: null, p: null, error: "", certs: {} });
  const em = useStore<EmitForm>({ user: "", tipo: "participacion", horas: 6, nota: "", busy: false, error: "", confirmAnular: "", anulando: false });
  const tab = useSignal("avance");
  const q = useSignal("");
  const load = $(async () => {
    st.error = "";
    const slug = pathId("instructor");
    try {
      const [c, p, certs] = await Promise.all([api.course(slug), api.courseProgress(slug), api.certificados(slug).catch(() => [] as Certificate[])]);
      st.c = c;
      st.p = p;
      const map: Record<string, Certificate> = {};
      for (const x of certs) if (x.estado === "valido" && x.user_id) map[x.user_id] = x;
      st.certs = map;
      setTitle(`Avance · ${c.title}`);
    } catch (e) {
      if (!requireLogin(e)) st.error = errMsg(e);
    }
  });
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async ({ track }) => {
    track(() => loc.url.pathname);
    session.help = "instructor";
    tab.value = getParam("tab") || "avance";
    await load();
  });
  const select = $((id: string) => {
    tab.value = id;
    setParams({ tab: id === "avance" ? "" : id });
  });

  const abrir = $((userId: string) => {
    em.user = em.user === userId ? "" : userId;
    em.tipo = "participacion";
    em.horas = 6;
    em.nota = "";
    em.error = "";
  });
  const emitir = $(async () => {
    if (!st.c || !em.user) return;
    em.busy = true;
    em.error = "";
    try {
      const c = await api.emitirCertificado({ user_id: em.user, course_id: st.c.id, tipo: em.tipo, horas: em.horas, nota: em.nota.trim() || undefined });
      st.certs = { ...st.certs, [em.user]: c };
      em.user = "";
      toast(session, `Certificado ${c.codigo} emitido`);
    } catch (e) {
      if (!requireLogin(e)) em.error = errMsg(e);
    } finally {
      em.busy = false;
    }
  });
  const anular = $(async (userId: string, codigo: string) => {
    em.anulando = true;
    try {
      await api.anularCertificado(codigo);
      const next = { ...st.certs };
      delete next[userId];
      st.certs = next;
      em.confirmAnular = "";
      toast(session, `Certificado ${codigo} anulado`, "info");
    } catch (e) {
      if (!requireLogin(e)) toast(session, `No se pudo anular: ${errMsg(e)}`, "bad");
    } finally {
      em.anulando = false;
    }
  });

  if (st.error) return <ErrorState message={st.error} retry$={load} />;
  if (!st.c || !st.p) return <Loading lines={6} />;
  const { c, p } = st;
  const isAdmin = !!session.me?.roles.includes("admin");
  const total = p.lessons.reduce((s, l) => s + l.steps, 0);
  const term = q.value.trim().toLowerCase();
  const students = p.students
    .map((s) => ({ ...s, done: p.lessons.reduce((acc, l) => acc + Math.min(s.lessons?.[l.id] ?? 0, l.steps), 0) }))
    .filter((s) => !term || `${s.name} ${s.email}`.toLowerCase().includes(term))
    .sort((a, b) => b.done - a.done || a.name.localeCompare(b.name));
  const avg = p.students.length && total ? students.reduce((s, x) => s + x.done, 0) / (students.length * total) : 0;
  const emitidos = Object.keys(st.certs).length;

  return (
    <>
      <Crumbs items={[{ href: "/instructor/", label: "Instructor" }, { label: c.title }]} />
      <div class="head">
        <div class="grow">
          <h1>{c.title}</h1>
          <p>Pasos del ciclo hechos por alumno y sesión. Desde aquí también se emiten los certificados.</p>
        </div>
        <Link class="btn ghost sm" href={`/courses/${c.slug}/`}><Icon name="user" size={14} /> Ver como alumno</Link>
      </div>
      <div class="facts" style="margin-bottom:1rem">
        <div class="fact"><div class="k">Alumnos</div><div class="v">{p.students.length}</div></div>
        <div class="fact"><div class="k">Sesiones</div><div class="v">{p.lessons.length}</div></div>
        <div class="fact"><div class="k">Avance medio</div><div class="v gold">{Math.round(avg * 100)}%</div></div>
        <div class="fact"><div class="k">Tareas</div><div class="v">{c.assignments.length}</div></div>
        <div class="fact"><div class="k">Certificados</div><div class="v">{emitidos}</div></div>
      </div>
      <Tabs active={tab.value} onSelect$={select} tabs={[{ id: "avance", label: "Avance", icon: "cycle", count: p.students.length }, { id: "tareas", label: "Tareas", icon: "task", count: c.assignments.length }]} />

      {tab.value === "avance" &&
        (p.students.length === 0 ? (
          <Empty icon="users" title="Todavía no hay alumnos en la cohorte" />
        ) : (
          <>
            <span class="field-ico" style="display:block;max-width:22rem;margin-bottom:.7rem">
              <Icon name="search" />
              <input type="search" placeholder="Buscar alumno" value={q.value} onInput$={(_, el) => (q.value = el.value)} />
            </span>
            <div class="card scroll-x" style="padding:.2rem .4rem">
              <table class="t">
                <thead>
                  <tr>
                    <th>Alumno</th>
                    <th>Total</th>
                    {p.lessons.map((l) => (
                      <th key={l.id}><Link href={`/lessons/${l.id}/`} style="color:inherit">{l.title.split("·")[0]}</Link></th>
                    ))}
                    <th>Certificado</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => {
                    const cert = st.certs[s.id];
                    return (
                      <tr key={s.id}>
                        <td>
                          <b class="sm">{s.name}</b>
                          <div class="xs muted">{s.email}</div>
                        </td>
                        <td style="min-width:8rem">
                          <div class="xs">{total ? Math.round((100 * s.done) / total) : 0}%</div>
                          <Bar pct={total ? (100 * s.done) / total : 0} />
                        </td>
                        {p.lessons.map((l) => {
                          const d = s.lessons?.[l.id] ?? 0;
                          return (
                            <td key={l.id} class="sm" style="min-width:6rem">
                              <span class={d >= l.steps && l.steps ? "ok" : d ? "accent" : "faint"}>
                                <Icon name={d >= l.steps && l.steps ? "checkCircle" : d ? "half" : "circle"} size={14} /> {d}/{l.steps}
                              </span>
                            </td>
                          );
                        })}
                        <td style="min-width:14rem">
                          {cert ? (
                            <div class="cert-links" data-cert={cert.codigo}>
                              <span class="cert-code"><Icon name="award" size={13} class="gold" /> {cert.codigo}</span>
                              <a href={cert.url_verificar} target="_blank" rel="noopener"><Icon name="shieldCheck" size={13} /> ver</a>
                              <a href={cert.url_pdf} target="_blank" rel="noopener"><Icon name="download" size={13} /> PDF</a>
                              {isAdmin &&
                                (em.confirmAnular === cert.codigo ? (
                                  <span class="row" style="gap:.3rem">
                                    <span class="xs muted">¿Anular?</span>
                                    <button type="button" class="bad" disabled={em.anulando} onClick$={() => anular(s.id, cert.codigo)}>
                                      <Icon name="ban" size={13} /> Sí, anular
                                    </button>
                                    <button type="button" onClick$={() => (em.confirmAnular = "")}>No</button>
                                  </span>
                                ) : (
                                  <button type="button" class="bad" onClick$={() => (em.confirmAnular = cert.codigo)}>
                                    <Icon name="ban" size={13} /> anular
                                  </button>
                                ))}
                            </div>
                          ) : em.user === s.id ? (
                            <form class="cert-inline" preventdefault:submit onSubmit$={emitir} aria-busy={em.busy} aria-label={`Emitir certificado a ${s.name}`}>
                              <div class="row" style="flex-wrap:nowrap">
                                <div class="grow">
                                  <label for={`ct-${s.id}`}>Tipo</label>
                                  <select id={`ct-${s.id}`} value={em.tipo} onChange$={(_, el) => (em.tipo = el.value as EmitForm["tipo"])}>
                                    <option value="participacion">Participación</option>
                                    <option value="aprobacion">Aprobación</option>
                                  </select>
                                </div>
                                <div style="width:5.5rem">
                                  <label for={`ch-${s.id}`}>Horas</label>
                                  <input id={`ch-${s.id}`} type="number" min={1} max={2000} value={em.horas} onInput$={(_, el) => (em.horas = Number(el.value) || 0)} />
                                </div>
                              </div>
                              <div>
                                <label for={`cn-${s.id}`}>Nota (opcional, interna)</label>
                                <input id={`cn-${s.id}`} type="text" maxLength={200} value={em.nota} onInput$={(_, el) => (em.nota = el.value)} />
                              </div>
                              {em.error && <div class="xs bad" role="alert">{em.error}</div>}
                              <div class="row">
                                <button type="submit" class="btn sm" disabled={em.busy || em.horas < 1}>
                                  {em.busy ? <Icon name="loader" size={13} class="studio-spin" /> : <Icon name="award" size={13} />} Emitir
                                </button>
                                <button type="button" class="btn ghost sm" onClick$={() => (em.user = "")}>Cancelar</button>
                              </div>
                            </form>
                          ) : (
                            <button type="button" class="btn ghost sm" onClick$={() => abrir(s.id)}>
                              <Icon name="award" size={13} /> Emitir certificado
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ))}

      {tab.value === "tareas" && (
        <div class="list">
          {c.assignments.map((a) => (
            <Link key={a.id} class="item" href={`/assignments/${a.id}/?tab=calificar`}>
              <span class="lead-ico"><Icon name="task" /></span>
              <span class="grow">
                <div class="t">{a.title}</div>
                <div class="d" title={fmtDate(a.due_at)}>{a.due_at ? `Entrega ${rel(a.due_at)}` : "Sin fecha"} · abrir para calificar</div>
              </span>
              <Status s={STATUS[a.status] ?? STATUS.pending} />
            </Link>
          ))}
          {c.assignments.length === 0 && <div class="item muted sm">Sin tareas.</div>}
        </div>
      )}
    </>
  );
});

export const onStaticGenerate: StaticGenerateHandler = async () => ({ params: [{ slug: "_" }] });

export const head: DocumentHead = { title: "Avance del curso" };
