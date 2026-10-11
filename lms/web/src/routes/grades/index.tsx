import { component$, useContext, useSignal, useStore, useVisibleTask$, $ } from "@builder.io/qwik";
import { Link, type DocumentHead } from "@builder.io/qwik-city";
import { api, CERT_TIPO, errMsg, fmtDate, rel, requireLogin, STATUS, type Certificate, type Grade } from "~/lib/api";
import { SessionContext, toast } from "~/lib/session";
import { setTitle } from "~/lib/url";
import { Icon } from "~/components/icon";
import { Empty, ErrorState, Loading, Status, Tabs } from "~/components/ui";
import { BadgeActions } from "~/components/cert-badge";

export default component$(() => {
  const session = useContext(SessionContext);
  const st = useStore<{ list: Grade[] | null; certs: Certificate[]; error: string }>({ list: null, certs: [], error: "" });
  const tab = useSignal("notas");
  const load = $(async () => {
    st.error = "";
    try {
      const [list, certs] = await Promise.all([api.grades(), api.misCertificados().catch(() => [] as Certificate[])]);
      st.list = list;
      st.certs = certs;
    } catch (e) {
      if (!requireLogin(e)) st.error = errMsg(e);
    }
  });
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async () => {
    session.help = "notas";
    setTitle("Mis notas");
    await load();
  });
  const copiar = $(async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast(session, "Enlace copiado");
    } catch {
      toast(session, "No se pudo copiar; usa el enlace «Ver en línea»", "bad");
    }
  });

  const list = st.list ?? [];
  const graded = list.filter((g) => g.score != null);
  const avg = graded.length ? graded.reduce((s, g) => s + (20 * (g.score ?? 0)) / (g.max_score || 20), 0) / graded.length : null;

  return (
    <>
      <div class="head">
        <span class="lead-ico gold" style="width:46px;height:46px"><Icon name="award" size={22} /></span>
        <div class="grow">
          <h1>Mis notas</h1>
          <p>Tus entregas con su estado, nota y comentarios, y tus certificados. En la terminal: <code>jmd grades</code>.</p>
        </div>
      </div>
      {st.error && <ErrorState message={st.error} retry$={load} />}
      {!st.error && st.list === null && <Loading lines={4} />}
      {st.list && (
        <>
          <Tabs
            active={tab.value}
            onSelect$={$((id) => (tab.value = id))}
            tabs={[
              { id: "notas", label: "Notas", icon: "task", count: list.length },
              { id: "certificados", label: "Certificados", icon: "award", count: st.certs.length },
            ]}
          />

          {tab.value === "notas" && (
            <>
              <div class="facts" style="margin-bottom:1rem">
                <div class="fact"><div class="k">Tareas</div><div class="v">{list.length}</div></div>
                <div class="fact"><div class="k">Entregadas</div><div class="v">{list.filter((g) => g.status !== "pending" && g.status !== "overdue").length}</div></div>
                <div class="fact"><div class="k">Calificadas</div><div class="v">{graded.length}</div></div>
                <div class="fact"><div class="k">Promedio (sobre 20)</div><div class="v gold">{avg == null ? "—" : avg.toFixed(1)}</div></div>
              </div>
              {list.length === 0 ? (
                <Empty icon="award" title="Todavía no hay tareas" text="Cuando el instructor publique tareas, verás aquí tus entregas y notas." />
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

          {tab.value === "certificados" &&
            (st.certs.length === 0 ? (
              <Empty icon="award" title="Sin certificados todavía" text="Cuando el instructor te emita un certificado aparecerá aquí, con su código público para verificarlo y su insignia digital." />
            ) : (
              <div class="cert-grid">
                {st.certs.map((c) => (
                  <div key={c.codigo} class={`card cert-item${c.estado === "anulado" ? " muted" : ""}`} data-cert={c.codigo}>
                    <div class="cert-head">
                      <span class="lead-ico gold"><Icon name={c.estado === "anulado" ? "ban" : "award"} /></span>
                      <span class="grow">
                        <b>{c.curso}</b>
                        <div class="xs muted">
                          {CERT_TIPO[c.tipo ?? ""] ?? c.tipo} · {c.horas} h · {fmtDate(c.emitido_en, false)}
                        </div>
                      </span>
                      {c.estado === "anulado" ? <span class="badge bad">Anulado</span> : <span class="badge ok">Válido</span>}
                    </div>
                    <div class="row" style="gap:.4rem">
                      <span class="cert-code">{c.codigo}</span>
                      <button type="button" class="icon-btn" title="Copiar enlace de verificación" aria-label="Copiar enlace" onClick$={() => copiar(c.url_verificar ?? "")}>
                        <Icon name="copy" size={14} />
                      </button>
                    </div>
                    <div class="cert-actions">
                      <a class="btn ghost" href={c.url_verificar} target="_blank" rel="noopener"><Icon name="shieldCheck" size={13} /> Ver en línea</a>
                      <a class="btn ghost" href={c.url_pdf} target="_blank" rel="noopener"><Icon name="download" size={13} /> Descargar PDF</a>
                    </div>
                    {c.estado === "valido" && (
                      <div class="cert-badge-row">
                        <img src={c.url_insignia} alt="" width={46} height={46} loading="lazy" />
                        <span class="grow">Insignia digital Open Badges 3.0</span>
                      </div>
                    )}
                    {c.estado === "valido" && (
                      <div class="cert-actions">
                        <BadgeActions c={c} small />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
        </>
      )}
    </>
  );
});

export const head: DocumentHead = { title: "Mis notas" };
