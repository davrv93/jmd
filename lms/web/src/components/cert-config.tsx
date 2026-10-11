import { component$, useStore, useVisibleTask$, $ } from "@builder.io/qwik";
import { api, errMsg, requireLogin } from "~/lib/api";
import { Icon } from "./icon";
import { Help } from "./help-tip";

// Tarjeta «Certificados» del panel del instructor (solo admin): datos del emisor que van en el
// PDF y en la insignia digital. Se congelan en cada certificado al emitirlo, así que cambiarlos
// no altera los ya entregados. «Vista previa del PDF» descarga una muestra con datos ficticios.

interface St {
  loaded: boolean;
  loadError: string;
  emisor: string;
  ruc: string;
  instructor: string;
  cargo: string;
  url: string;
  dirty: boolean;
  saving: boolean;
  saved: string;
  error: string;
}

export const CertConfig = component$(() => {
  const st = useStore<St>({ loaded: false, loadError: "", emisor: "", ruc: "", instructor: "", cargo: "", url: "", dirty: false, saving: false, saved: "", error: "" });

  const load = $(async () => {
    st.loadError = "";
    try {
      const c = await api.certConfig();
      st.emisor = c.emisor;
      st.ruc = c.ruc;
      st.instructor = c.instructor;
      st.cargo = c.cargo;
      st.url = c.url;
      st.dirty = false;
      st.loaded = true;
    } catch (e) {
      if (!requireLogin(e)) st.loadError = errMsg(e);
    }
  });
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async () => {
    await load();
  });

  const guardar = $(async () => {
    st.saving = true;
    st.error = "";
    st.saved = "";
    try {
      const c = await api.saveCertConfig({ emisor: st.emisor.trim(), ruc: st.ruc.trim(), instructor: st.instructor.trim(), cargo: st.cargo.trim(), url: st.url.trim() });
      st.emisor = c.emisor;
      st.ruc = c.ruc;
      st.instructor = c.instructor;
      st.cargo = c.cargo;
      st.url = c.url;
      st.dirty = false;
      st.saved = "Guardado. Los próximos certificados saldrán con estos datos.";
      setTimeout(() => (st.saved = ""), 4000);
    } catch (e) {
      if (!requireLogin(e)) st.error = errMsg(e);
    } finally {
      st.saving = false;
    }
  });

  const rucOk = /^[0-9]{11}$/.test(st.ruc.trim());

  return (
    <section class="studio-card cert-card" aria-labelledby="cert-t">
      <div class="studio-card__bar">
        <Icon name="award" size={14} />
        <span id="cert-t">Certificados</span>
        <span class="studio-right">
          <Help title="Qué va en cada certificado">
            <p>
              El <b>emisor</b>, su <b>RUC</b> y la <b>firma del instructor</b> aparecen en el PDF y en la insignia digital (Open Badges 3.0).
            </p>
            <p>Cada certificado guarda una copia de estos datos al emitirse: cambiarlos aquí no toca los ya entregados.</p>
            <p>
              La <b>URL pública</b> es la base de los enlaces de verificación y del QR del PDF.
            </p>
          </Help>
        </span>
      </div>

      {st.loadError && (
        <div class="studio-strip bad" role="alert">
          <Icon name="alert" size={15} />
          <span>No se pudo cargar la configuración: {st.loadError}</span>
          <button type="button" class="btn ghost sm" onClick$={load}>
            <Icon name="refresh" size={13} /> Reintentar
          </button>
        </div>
      )}

      {st.loaded && (
        <form class="cert-form" preventdefault:submit onSubmit$={guardar} aria-busy={st.saving}>
          <div class="cert-2">
            <div>
              <label for="cert-emisor">Emisor</label>
              <input
                id="cert-emisor"
                type="text"
                autoComplete="organization"
                maxLength={120}
                value={st.emisor}
                onInput$={(_, el) => {
                  st.emisor = el.value;
                  st.dirty = true;
                }}
              />
            </div>
            <div>
              <label for="cert-ruc">RUC</label>
              <input
                id="cert-ruc"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{11}"
                maxLength={11}
                autoComplete="off"
                value={st.ruc}
                aria-invalid={!rucOk}
                aria-describedby="cert-ruc-h"
                onInput$={(_, el) => {
                  st.ruc = el.value;
                  st.dirty = true;
                }}
              />
              <div class="hint" id="cert-ruc-h">
                {rucOk ? "11 dígitos." : "Debe tener exactamente 11 dígitos."}
              </div>
            </div>
          </div>
          <div class="cert-2">
            <div>
              <label for="cert-instructor">Instructor que firma</label>
              <input
                id="cert-instructor"
                type="text"
                autoComplete="name"
                maxLength={120}
                value={st.instructor}
                onInput$={(_, el) => {
                  st.instructor = el.value;
                  st.dirty = true;
                }}
              />
            </div>
            <div>
              <label for="cert-cargo">Cargo (opcional)</label>
              <input
                id="cert-cargo"
                type="text"
                maxLength={80}
                placeholder="Instructor principal"
                value={st.cargo}
                onInput$={(_, el) => {
                  st.cargo = el.value;
                  st.dirty = true;
                }}
              />
              <div class="hint">Va bajo la línea de firma.</div>
            </div>
          </div>
          <div>
            <label for="cert-url">URL pública</label>
            <input
              id="cert-url"
              type="url"
              inputMode="url"
              spellcheck={false}
              placeholder="https://jmd-learn.online"
              value={st.url}
              onInput$={(_, el) => {
                st.url = el.value;
                st.dirty = true;
              }}
            />
            <div class="hint">Base de los enlaces de verificación (…/verificar/CD-2026-XXXXXX/) y del QR. Vacía = LMS_PUBLIC_URL.</div>
          </div>

          <div class="studio-actions">
            <a class="btn ghost" href="/api/v1/admin/certificados/muestra.pdf" target="_blank" rel="noopener">
              <Icon name="eye" size={14} /> Vista previa del PDF
            </a>
            <button type="submit" class="btn" disabled={st.saving || !st.dirty || !rucOk || !st.emisor.trim() || !st.instructor.trim()} aria-busy={st.saving}>
              {st.saving ? <Icon name="loader" size={14} class="studio-spin" /> : <Icon name="check" size={14} />}
              {st.saving ? "Guardando" : "Guardar"}
            </button>
            {st.dirty && !st.saving && <span class="xs faint">Cambios sin guardar</span>}
          </div>

          {st.error && (
            <div class="studio-strip bad" role="alert">
              <Icon name="alert" size={15} />
              <span>No se pudo guardar: {st.error}</span>
            </div>
          )}
          {st.saved && (
            <div class="studio-strip ok" role="status" aria-live="polite">
              <Icon name="checkCircle" size={15} />
              <span>{st.saved}</span>
            </div>
          )}
        </form>
      )}
    </section>
  );
});
