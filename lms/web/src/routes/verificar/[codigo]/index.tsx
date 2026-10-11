import { component$, useStore, useVisibleTask$, $ } from "@builder.io/qwik";
import { Link, useLocation, type DocumentHead, type StaticGenerateHandler } from "@builder.io/qwik-city";
import { api, CERT_TIPO, errMsg, fmtDate, type Certificate } from "~/lib/api";
import { pathId, setTitle } from "~/lib/url";
import { Icon } from "~/components/icon";
import { ErrorState, Loading } from "~/components/ui";
import { BadgeActions } from "~/components/cert-badge";

// Ficha pública de un certificado: no pide sesión. El servidor nunca manda datos privados aquí.
export default component$(() => {
  const loc = useLocation();
  const st = useStore<{ c: Certificate | null; error: string; codigo: string }>({ c: null, error: "", codigo: "" });
  const load = $(async () => {
    st.error = "";
    st.codigo = pathId("verificar").toUpperCase();
    try {
      st.c = await api.verificar(st.codigo);
      setTitle(`Verificar ${st.codigo}`);
    } catch (e) {
      st.error = errMsg(e);
    }
  });
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async ({ track }) => {
    track(() => loc.url.pathname);
    await load();
  });

  if (st.error) return <ErrorState message={st.error} retry$={load} />;
  if (!st.c) return <Loading lines={5} />;
  const c = st.c;
  const seal =
    c.estado === "valido"
      ? { cls: "ok", icon: "shieldCheck", label: "Certificado válido" }
      : c.estado === "anulado"
        ? { cls: "bad", icon: "ban", label: "Certificado anulado" }
        : { cls: "", icon: "help", label: "No encontrado" };

  return (
    <div class="verify">
      <div class="head" style="margin-bottom:.4rem">
        <div class="grow">
          <h1>Verificación de certificado</h1>
          <p>
            Código <span class="cert-code">{c.codigo}</span>
          </p>
        </div>
        <Link class="btn ghost sm" href="/verificar/">
          <Icon name="search" size={14} /> Verificar otro
        </Link>
      </div>
      <span class={`verify-seal ${seal.cls}`} role="status" data-estado={c.estado}>
        <Icon name={seal.icon} size={18} />
        {seal.label}
      </span>

      {c.estado === "no_existe" ? (
        <div class="card verify-card">
          <p style="margin:0">
            No hay ningún certificado con el código <b class="cert-code">{c.codigo}</b>. Revisa que esté bien escrito: tiene la forma
            CD-AAAA-XXXXXX, sin las letras O e I ni los dígitos 0 y 1.
          </p>
        </div>
      ) : (
        <>
          <div class="card verify-card">
            <div class="xs faint" style="text-transform:uppercase;letter-spacing:.05em">Certificado {c.tipo_texto}</div>
            <h2>{c.alumno}</h2>
            <div class="muted sm" style="margin-top:.35rem">por haber completado el curso</div>
            <div class="verify-course">{c.curso}</div>
            <dl class="verify-dl">
              <dt>Tipo</dt>
              <dd>{CERT_TIPO[c.tipo ?? ""] ?? c.tipo}</dd>
              <dt>Horas</dt>
              <dd>{c.horas} horas lectivas</dd>
              <dt>Emitido</dt>
              <dd>{fmtDate(c.emitido_en, false)}</dd>
              {c.anulado_en && (
                <>
                  <dt>Anulado</dt>
                  <dd class="bad">{fmtDate(c.anulado_en, false)}</dd>
                </>
              )}
              <dt>Emisor</dt>
              <dd>
                {c.emisor} · RUC {c.ruc}
              </dd>
              <dt>Firma</dt>
              <dd>
                {c.instructor}
                {c.cargo && <span class="muted"> · {c.cargo}</span>}
              </dd>
            </dl>
            <div class="verify-actions">
              <a class="btn" href={`/api/v1/certificados/${encodeURIComponent(c.codigo)}/pdf`} target="_blank" rel="noopener">
                <Icon name="download" size={14} /> Descargar PDF
              </a>
            </div>
            {c.estado === "anulado" && (
              <div class="studio-strip bad" role="alert">
                <Icon name="alert" size={15} />
                <span>Este certificado fue anulado por el emisor y ya no es válido. El PDF se descarga con el sello de anulado.</span>
              </div>
            )}
          </div>

          {c.estado === "valido" && (
            <>
              <div class="section-t">
                <Icon name="badge" /> Insignia digital
              </div>
              <div class="card verify-badge" id="insignia">
                <img src={c.url_insignia} alt={`Insignia del curso ${c.curso}`} width={144} height={144} loading="lazy" />
                <div>
                  <p>
                    Credencial verificable según el modelo de datos <b>Open Badges 3.0</b> (1EdTech). El JSON lleva el logro y la identidad del
                    alumno con hash; el JWT va firmado con la clave pública del emisor (<code>/.well-known/jwks.json</code>).
                  </p>
                  <div class="verify-actions" style="margin-top:.4rem">
                    <BadgeActions c={c} />
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}
      <p class="verify-note">
        Emitido por {c.emisor ?? "Consultoría Digital"}. La verificación es pública y no muestra datos de contacto del alumno.
      </p>
    </div>
  );
});

export const onStaticGenerate: StaticGenerateHandler = async () => ({ params: [{ codigo: "_" }] });

export const head: DocumentHead = { title: "Verificar certificado" };
