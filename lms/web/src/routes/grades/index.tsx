import { component$, useContext, useSignal, useStore, useStyles$, useVisibleTask$, $ } from "@builder.io/qwik";
import { Link, type DocumentHead } from "@builder.io/qwik-city";
import { api, errMsg, fmtDate, linkedinAddUrl, rel, requireLogin, STATUS, type Certificate, type Course, type Grade } from "~/lib/api";
import { SessionContext, isStaff, toast } from "~/lib/session";
import { getParam, setParams, setTitle } from "~/lib/url";
import { Icon } from "~/components/icon";
import { Empty, ErrorState, Loading, Status, Tabs } from "~/components/ui";
import { DatosCertificado } from "~/components/datos-certificado";
import { ESTADO_TXT, Hex, limpiarClase, rutaDe, type Habilidad } from "~/components/habilidad";

// Logros (/grades/): lo que el alumno va ganando, curso por curso. Cada curso es una ruta: una
// habilidad por clase (con su insignia) y, al final, el certificado. Cada fila dice qué aprendiste
// (los objetivos de la clase), si ya es tuya y, si no, qué te falta. Las acciones de compartir van
// plegadas en «Compartir» para que la lista se lea de un vistazo. Las notas de tareas van aparte.

const CSS = `
.lg-resumen { margin: -.4rem 0 1.1rem; color: var(--muted); font-size: .95rem; }
.lg-resumen b { color: var(--fg); font-variant-numeric: tabular-nums; }
.lg-curso { margin: 0 0 1.4rem; border: 1px solid var(--line); border-radius: var(--r2); background: var(--s1); box-shadow: var(--shadow-xs); }
.lg-cab { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: .5rem 1rem; padding: 1rem 1.1rem .85rem; border-bottom: 1px solid var(--line); }
.lg-cab h2 { margin: 0; font-size: 1.12rem; line-height: 1.3; text-wrap: balance; }
.lg-cab p { margin: .2rem 0 0; font-size: .86rem; color: var(--muted); font-variant-numeric: tabular-nums; }
.lg-tramos { display: flex; gap: 4px; flex: 0 1 12rem; min-width: 7rem; }
.lg-tramos i { flex: 1; height: 6px; border-radius: 3px; background: var(--s3); }
.lg-tramos i[data-e="ganada"] { background: var(--gold); }
.lg-tramos i[data-e="camino"] { background: var(--accent); opacity: .55; }
.lg-lista { list-style: none; margin: 0; padding: 0; }
.lg-fila { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: .35rem 1rem; align-items: start; padding: .95rem 1.1rem; }
.lg-fila + .lg-fila { border-top: 1px solid var(--line); }
.lg-fila .hex { margin-top: .1rem; --hx: 2.75rem; }
.lg-img { width: 2.75rem; height: 3rem; object-fit: contain; margin-top: .05rem; }
.lg-t { margin: 0; font-size: .98rem; font-weight: 650; line-height: 1.35; }
.lg-num { display: block; font-size: .8rem; font-weight: 600; color: var(--muted); margin-bottom: .1rem; font-variant-numeric: tabular-nums; }
.lg-sab { list-style: none; margin: .45rem 0 0; padding: 0; display: grid; gap: .3rem; font-size: .88rem; color: var(--muted); max-width: 62ch; }
.lg-sab li { display: grid; grid-template-columns: 1rem minmax(0, 1fr); gap: .45rem; line-height: 1.45; }
.lg-sab .ico { margin-top: .2rem; color: var(--faint); }
.lg-fila[data-e="ganada"] .lg-sab { color: var(--fg); }
.lg-fila[data-e="ganada"] .lg-sab .ico { color: var(--gold); }
.lg-mas { font-size: .84rem; color: var(--accent); cursor: pointer; margin-top: .3rem; }
.lg-est { display: flex; flex-direction: column; align-items: flex-end; gap: .45rem; text-align: right; font-size: .84rem; color: var(--muted); font-variant-numeric: tabular-nums; }
.lg-est .badge { white-space: nowrap; }
.lg-comp { grid-column: 2 / -1; }
.lg-comp > summary { list-style: none; display: inline-flex; }
.lg-comp > summary::-webkit-details-marker { display: none; }
.lg-acc { display: flex; flex-wrap: wrap; gap: .4rem; margin-top: .55rem; padding: .7rem; border-radius: var(--r); background: var(--s2); }
.lg-acc .cod { flex-basis: 100%; display: flex; align-items: center; gap: .4rem; font: 600 .82rem var(--mono); color: var(--muted); }
.lg-fila[data-cert] { background: var(--s2); border-radius: 0 0 var(--r2) var(--r2); }
.lg-fila[data-cert][data-e="ganada"] { background: var(--gold-bg); }
.lg-datos { margin-top: 1.6rem; }
@media (max-width: 640px) {
  .lg-fila { grid-template-columns: auto minmax(0, 1fr); padding: .85rem .8rem; }
  .lg-est { grid-column: 2; align-items: flex-start; text-align: left; flex-direction: row; flex-wrap: wrap; align-items: center; }
  .lg-comp { grid-column: 1 / -1; }
  .lg-est .btn, .lg-comp > summary .btn { min-height: 44px; }
  .lg-tramos { flex-basis: 100%; }
}
`;

export default component$(() => {
  useStyles$(CSS);
  const session = useContext(SessionContext);
  const st = useStore<{ list: Grade[] | null; certs: Certificate[]; cursos: Course[]; error: string }>({ list: null, certs: [], cursos: [], error: "" });
  const tab = useSignal("habilidades");

  const load = $(async () => {
    st.error = "";
    try {
      const [list, certs, resumen] = await Promise.all([api.grades(), api.misCertificados().catch(() => [] as Certificate[]), api.courses()]);
      // El personal ve todos los cursos: para él, solo los cursos donde tiene algo.
      const conCert = new Set(certs.map((c) => c.course_id));
      const elegidos = isStaff(session.me) ? resumen.filter((c) => conCert.has(c.id)) : resumen;
      const cursos = await Promise.all(elegidos.map((c) => api.course(c.slug).catch(() => null)));
      st.certs = certs;
      st.cursos = cursos.filter((c): c is Course => !!c);
      st.list = list;
    } catch (e) {
      if (!requireLogin(e)) st.error = errMsg(e);
    }
  });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async () => {
    session.help = "notas";
    setTitle("Logros");
    tab.value = getParam("ver") === "notas" ? "notas" : "habilidades";
    await load();
  });

  const copiar = $(async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast(session, "Enlace de verificación copiado");
    } catch {
      toast(session, "No se pudo copiar; abre «Ver en línea» y copia la dirección", "bad");
    }
  });

  if (st.error) return <ErrorState message={st.error} retry$={load} />;
  if (st.list === null) return <Loading lines={5} />;

  const list = st.list;
  const graded = list.filter((g) => g.score != null);
  const avg = graded.length ? graded.reduce((s, g) => s + (20 * (g.score ?? 0)) / (g.max_score || 20), 0) / graded.length : null;
  const rutas = st.cursos
    .map((c) => ({ c, r: rutaDe(c, st.certs) }))
    .filter((x) => x.r.clases.length > 0)
    // Primero donde ya ganaste algo, luego el resto; dentro, por título.
    .sort((a, b) => Number(b.r.ganadas > 0) - Number(a.r.ganadas > 0) || a.c.title.localeCompare(b.c.title));
  const vigentes = st.certs.filter((c) => c.estado === "valido");
  const habilidades = vigentes.filter((c) => c.ambito === "clase").length;
  const certificados = vigentes.filter((c) => c.ambito !== "clase").length;
  // Logros de cursos que ya no se ven (grupos cerrados): se listan igual, sin ruta.
  const visibles = new Set(st.cursos.map((c) => c.id));
  const sueltos = st.certs.filter((c) => !visibles.has(c.course_id ?? ""));

  const compartir = (c: Certificate, nombre: string) => (
    <details class="lg-comp">
      <summary>
        <span class="btn ghost sm"><Icon name="share" size={14} /> Compartir</span>
      </summary>
      <div class="lg-acc">
        <a class="btn sm" href={linkedinAddUrl(c)} target="_blank" rel="noopener"><Icon name="share" size={14} /> Añadir a LinkedIn</a>
        <a class="btn ghost sm" href={c.url_verificar} target="_blank" rel="noopener"><Icon name="shieldCheck" size={14} /> Ver en línea</a>
        <a class="btn ghost sm" href={c.url_pdf} target="_blank" rel="noopener"><Icon name="download" size={14} /> PDF</a>
        {c.url_insignia_png && <a class="btn ghost sm" href={c.url_insignia_png} download={`insignia-${c.codigo}.png`}><Icon name="badge" size={14} /> Imagen</a>}
        <a class="btn ghost sm" href={c.url_badge} download={`insignia-${c.codigo}.json`} title="Insignia Open Badges 3.0 para subir a otras plataformas">Open Badges (JSON)</a>
        <a class="btn ghost sm" href={c.url_badge_jwt} download={`insignia-${c.codigo}.jwt`} title="Credencial firmada">Firmada (JWT)</a>
        <span class="cod">
          Código {c.codigo}
          <button type="button" class="icon-btn" title={`Copiar el enlace de verificación de ${nombre}`} aria-label={`Copiar el enlace de verificación de ${nombre}`} onClick$={() => copiar(c.url_verificar ?? "")}>
            <Icon name="copy" size={14} />
          </button>
        </span>
      </div>
    </details>
  );

  const fila = (h: Habilidad) => {
    const extra = h.objetivos.length - 3;
    return (
      <li key={h.l.id} class="lg-fila" data-e={h.estado}>
        {h.cert?.url_insignia_png ? <img class="lg-img" src={h.cert.url_insignia_png} alt={`Insignia de la clase ${h.num}`} width={44} height={48} loading="lazy" /> : <Hex estado={h.estado} n={h.num} />}
        <div style="min-width:0">
          <h3 class="lg-t"><span class="lg-num">Clase {h.num}</span>{h.titulo}</h3>
          {h.objetivos.length > 0 && (
            <>
              <ul class="lg-sab" aria-label={h.estado === "ganada" ? "Lo que ya sabes hacer" : "Lo que vas a poder hacer"}>
                {h.objetivos.slice(0, 3).map((o) => (
                  <li key={o}><Icon name={h.estado === "ganada" ? "check" : "target"} size={13} /><span>{o}</span></li>
                ))}
              </ul>
              {extra > 0 && (
                <details>
                  <summary class="lg-mas">y {extra} {extra === 1 ? "más" : "más"}</summary>
                  <ul class="lg-sab">
                    {h.objetivos.slice(3).map((o) => (
                      <li key={o}><Icon name={h.estado === "ganada" ? "check" : "target"} size={13} /><span>{o}</span></li>
                    ))}
                  </ul>
                </details>
              )}
            </>
          )}
        </div>
        <div class="lg-est">
          {h.cert ? (
            <span class="badge gold"><Icon name="check" size={12} /> Ganada · {fmtDate(h.cert.emitido_en, false)}</span>
          ) : (
            <>
              <span class={`badge ${h.estado === "camino" ? "accent" : ""}`}>{ESTADO_TXT[h.estado]}</span>
              <span>{h.l.steps_done} de {h.l.steps} pasos</span>
              <Link class="btn ghost sm" href={`/lessons/${h.l.id}/`}>Ir a la clase <Icon name="chevronRight" size={13} /></Link>
            </>
          )}
        </div>
        {h.cert && compartir(h.cert, `la clase ${h.num}`)}
      </li>
    );
  };

  return (
    <>
      <div class="head">
        <span class="lead-ico gold" style="width:46px;height:46px"><Icon name="award" size={22} /></span>
        <div class="grow">
          <h1>Logros</h1>
          <p>Cada clase te da una habilidad con su insignia. Al completar todas las clases de un curso, recibes el certificado.</p>
        </div>
      </div>

      <Tabs
        active={tab.value}
        onSelect$={$((id: string) => ((tab.value = id), setParams({ ver: id === "notas" ? "notas" : "" })))}
        tabs={[
          { id: "habilidades", label: "Habilidades y certificados", icon: "award", count: habilidades + certificados },
          { id: "notas", label: "Notas de tareas", icon: "task", count: list.length },
        ]}
      />

      {tab.value === "habilidades" && (
        <>
          <p class="lg-resumen" aria-live="polite">
            Tienes <b>{habilidades}</b> {habilidades === 1 ? "habilidad" : "habilidades"} y <b>{certificados}</b> {certificados === 1 ? "certificado" : "certificados"}.
          </p>

          {rutas.length === 0 && sueltos.length === 0 && (
            <Empty icon="award" title="Todavía no tienes cursos" text="Cuando te inscribas en un curso, aquí verás las habilidades que ganas en cada clase y tu certificado." />
          )}

          {rutas.map(({ c, r }) => {
            const partes = c.title.split(" · ");
            const grupo = partes.length > 1 && /^grupo\b/i.test(partes[partes.length - 1]) ? partes.pop() : "";
            const titulo = partes.join(" · ");
            const n = r.clases.length;
            const certEstado = r.certCurso ? "ganada" : r.ganadas === n ? "camino" : "pendiente";
            return (
              <section key={c.id} class="lg-curso" aria-labelledby={`lg-${c.id}`} data-testid="ruta-logros">
                <header class="lg-cab">
                  <div style="min-width:0">
                    <h2 id={`lg-${c.id}`}>
                      <Link href={`/courses/${c.slug}/`} style="color:inherit">{titulo}</Link>
                    </h2>
                    <p>
                      {grupo && `${grupo} · `}
                      {r.ganadas} de {n} {n === 1 ? "habilidad" : "habilidades"}
                      {r.certCurso ? " · certificado obtenido" : ""}
                    </p>
                  </div>
                  <span class="lg-tramos" aria-hidden="true">
                    {r.clases.map((h) => <i key={h.l.id} data-e={h.estado} />)}
                    <i data-e={certEstado === "ganada" ? "ganada" : "pendiente"} />
                  </span>
                </header>
                <ol class="lg-lista">
                  {r.clases.map(fila)}
                  <li class="lg-fila" data-cert data-e={certEstado}>
                    <Hex estado={certEstado} cert />
                    <div style="min-width:0">
                      <h3 class="lg-t"><span class="lg-num">Certificado del curso</span>{titulo}</h3>
                      <p class="sm muted" style="margin:.3rem 0 0">
                        {r.certCurso
                          ? `${r.certCurso.tipo_texto ? r.certCurso.tipo_texto[0].toUpperCase() + r.certCurso.tipo_texto.slice(1) : "Certificado"} · ${r.certCurso.horas} horas · verificable con su código.`
                          : `Se entrega al completar las ${n} clases. ${n - r.ganadas > 0 ? `Te ${n - r.ganadas === 1 ? "falta 1" : `faltan ${n - r.ganadas}`}.` : "Ya completaste todas: está en camino."}`}
                      </p>
                    </div>
                    <div class="lg-est">
                      {r.certCurso ? (
                        <span class="badge gold"><Icon name="check" size={12} /> Obtenido · {fmtDate(r.certCurso.emitido_en, false)}</span>
                      ) : (
                        <span class={`badge ${certEstado === "camino" ? "accent" : ""}`}>{certEstado === "camino" ? "En camino" : "Por ganar"}</span>
                      )}
                    </div>
                    {r.certCurso && compartir(r.certCurso, "el certificado")}
                  </li>
                </ol>
              </section>
            );
          })}

          {sueltos.length > 0 && (
            <section class="lg-curso" aria-labelledby="lg-otros">
              <header class="lg-cab">
                <div>
                  <h2 id="lg-otros">De cursos anteriores</h2>
                  <p>{sueltos.length} {sueltos.length === 1 ? "logro" : "logros"}</p>
                </div>
              </header>
              <ol class="lg-lista">
                {sueltos.map((c) => (
                  <li key={c.codigo} class="lg-fila" data-e={c.estado === "valido" ? "ganada" : "pendiente"}>
                    {c.url_insignia_png && c.estado === "valido" ? <img class="lg-img" src={c.url_insignia_png} alt="" width={44} height={48} loading="lazy" /> : <Hex estado="pendiente" cert={c.ambito !== "clase"} n={c.clase_num} />}
                    <div style="min-width:0">
                      <h3 class="lg-t">
                        <span class="lg-num">{c.ambito === "clase" ? `Clase ${c.clase_num ?? ""}` : "Certificado del curso"}</span>
                        {c.ambito === "clase" ? limpiarClase(c.clase ?? "") : c.curso}
                      </h3>
                      <p class="sm muted" style="margin:.3rem 0 0">{c.curso}</p>
                    </div>
                    <div class="lg-est">{c.estado === "valido" ? <span class="badge gold">{fmtDate(c.emitido_en, false)}</span> : <span class="badge bad">Anulado</span>}</div>
                    {c.estado === "valido" && compartir(c, c.ambito === "clase" ? `la clase ${c.clase_num ?? ""}` : "el certificado")}
                  </li>
                ))}
              </ol>
            </section>
          )}

          <div class="lg-datos">
            <DatosCertificado />
          </div>
        </>
      )}

      {tab.value === "notas" && (
        <>
          <p class="lg-resumen">
            <b>{list.length}</b> {list.length === 1 ? "tarea" : "tareas"} · <b>{graded.length}</b> {graded.length === 1 ? "calificada" : "calificadas"}
            {avg != null && <> · promedio <b>{avg.toFixed(1)}</b> sobre 20</>}
          </p>
          {list.length === 0 ? (
            <Empty icon="task" title="Todavía no hay tareas" text="Cuando el instructor publique tareas, verás aquí tus entregas y notas." />
          ) : (
            <div class="card scroll-x" style="padding:.2rem .4rem">
              <table class="t">
                <thead>
                  <tr><th>Tarea</th><th>Estado</th><th>Nota</th><th>Calificada</th></tr>
                </thead>
                <tbody>
                  {list.map((g) => (
                    <tr key={g.assignment_id}>
                      <td>
                        <Link href={`/assignments/${g.assignment_id}/`}>{g.title}</Link>
                        {g.feedback_md && <div class="xs muted" style="max-width:32rem">{g.feedback_md}</div>}
                      </td>
                      <td><Status s={STATUS[g.status] ?? STATUS.pending} /></td>
                      <td>{g.score != null ? <b>{g.score}<span class="muted sm"> / {g.max_score}</span></b> : <span class="faint">—</span>}</td>
                      <td class="sm muted" title={fmtDate(g.graded_at)}>{rel(g.graded_at) || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  );
});

export const head: DocumentHead = { title: "Logros" };
