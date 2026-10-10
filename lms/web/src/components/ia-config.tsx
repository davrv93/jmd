import { component$, useStore, useVisibleTask$, $ } from "@builder.io/qwik";
import { api, errMsg, requireLogin, type LlmTest } from "~/lib/api";
import { Icon } from "./icon";
import { Help } from "./help-tip";

// Tarjeta «Inteligencia artificial del Estudio» del panel del instructor: interruptor, URL,
// modelo y clave del gateway OpenAI-compatible, con prueba de conexión en línea. Todo se guarda
// en la base del LMS; no hace falta SSH ni variables de entorno.

interface St {
  loaded: boolean;
  loadError: string;
  enabled: boolean;
  url: string;
  model: string;
  key: string; // lo que el instructor escribe; vacío = conservar la guardada
  keySet: boolean;
  keyHint: string;
  dirty: boolean;
  saving: boolean;
  testing: boolean;
  test: LlmTest | null;
  testError: string;
  saved: string; // aviso tras guardar
  error: string;
}

const URL_EJEMPLO = "https://openrouter.ai/api/v1/chat/completions";

export const IaConfig = component$(() => {
  const st = useStore<St>({
    loaded: false,
    loadError: "",
    enabled: false,
    url: "",
    model: "",
    key: "",
    keySet: false,
    keyHint: "",
    dirty: false,
    saving: false,
    testing: false,
    test: null,
    testError: "",
    saved: "",
    error: "",
  });

  const load = $(async () => {
    st.loadError = "";
    try {
      const c = await api.llmConfig();
      st.enabled = c.enabled;
      st.url = c.url;
      st.model = c.model;
      st.keySet = c.key_set;
      st.keyHint = c.key_hint;
      st.key = "";
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

  const probar = $(async () => {
    st.testing = true;
    st.test = null;
    st.testError = "";
    try {
      st.test = await api.testLlm({ url: st.url.trim(), model: st.model.trim(), key: st.key.trim() });
    } catch (e) {
      if (!requireLogin(e)) st.testError = errMsg(e);
    } finally {
      st.testing = false;
    }
  });

  const guardar = $(async () => {
    st.saving = true;
    st.error = "";
    st.saved = "";
    try {
      const c = await api.saveLlm({ url: st.url.trim(), model: st.model.trim(), enabled: st.enabled, key: st.key.trim() || undefined });
      st.enabled = c.enabled;
      st.url = c.url;
      st.model = c.model;
      st.keySet = c.key_set;
      st.keyHint = c.key_hint;
      st.key = "";
      st.dirty = false;
      st.saved = c.enabled ? "Guardado. El Estudio ya usa esta configuración." : "Guardado. La IA queda desactivada en el Estudio.";
      setTimeout(() => (st.saved = ""), 4000);
    } catch (e) {
      if (!requireLogin(e)) st.error = errMsg(e);
    } finally {
      st.saving = false;
    }
  });

  const r = st.test;
  // Verde: contestó. Ámbar: contestó pero no como chat/completions (200 sin choices o cuerpo raro).
  // Rojo: no hubo respuesta o fue de error.
  const tono = !r ? "" : r.ok ? "ok" : r.status === 200 ? "warn" : "bad";
  const icono = !r ? "" : r.ok ? "checkCircle" : r.status === 200 ? "alert" : "plugOff";

  return (
    <section class="studio-card ia-card" aria-labelledby="ia-t">
      <div class="studio-card__bar">
        <Icon name="sparkles" size={14} />
        <span id="ia-t">Inteligencia artificial del Estudio</span>
        <span class="studio-right">
          <span class={`studio-state ${st.loaded ? (st.enabled ? "ok" : "warn") : ""}`} role="status">
            <Icon name={st.loaded ? (st.enabled ? "plug" : "plugOff") : "loader"} size={13} />
            {st.loaded ? (st.enabled ? "Activada" : "Desactivada") : "Cargando"}
          </span>
          <Help title="Qué proveedores sirven">
            <p>
              Sirve <b>cualquier API compatible con OpenAI</b>: OpenRouter, Gemini en modo OpenAI, OpenCode Zen o un Ollama propio.
            </p>
            <p>
              Pon la URL <b>completa</b> del endpoint de chat (termina en <b>/v1/chat/completions</b>) y el nombre del modelo tal como lo llama el proveedor.
            </p>
            <p>
              La clave se guarda en la <b>base del LMS</b> y nunca vuelve al navegador; los alumnos solo ven si la IA está conectada.
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
        <form
          class="ia-form"
          preventdefault:submit
          onSubmit$={guardar}
          aria-busy={st.saving}
        >
          <div class="ia-switch-row">
            <button
              type="button"
              id="ia-enabled"
              class={`ia-switch ${st.enabled ? "on" : ""}`}
              role="switch"
              aria-checked={st.enabled}
              aria-labelledby="ia-enabled-l"
              onClick$={() => {
                st.enabled = !st.enabled;
                st.dirty = true;
              }}
            >
              <i />
            </button>
            <label id="ia-enabled-l" for="ia-enabled" class="ia-switch-label">
              Activada
              <span class="hint">Si está apagada, el Estudio muestra «IA no conectada» y los alumnos pegan el HTML a mano.</span>
            </label>
          </div>

          <div class="ia-fields">
            <div>
              <label for="ia-url">URL del endpoint</label>
              <input
                id="ia-url"
                type="url"
                inputMode="url"
                autoComplete="off"
                spellcheck={false}
                placeholder={URL_EJEMPLO}
                value={st.url}
                onInput$={(_, el) => {
                  st.url = el.value;
                  st.dirty = true;
                }}
              />
              <div class="hint">Endpoint completo de chat/completions. Para Ollama: http://host:11434/v1/chat/completions</div>
            </div>
            <div>
              <label for="ia-model">Modelo</label>
              <input
                id="ia-model"
                type="text"
                autoComplete="off"
                spellcheck={false}
                placeholder="openrouter/auto"
                value={st.model}
                onInput$={(_, el) => {
                  st.model = el.value;
                  st.dirty = true;
                }}
              />
              <div class="hint">Nombre tal como lo llama el proveedor (p. ej. openrouter/auto, gemini-2.0-flash, qwen2.5-coder:latest).</div>
            </div>
            <div>
              <label for="ia-key">Clave</label>
              <input
                id="ia-key"
                type="password"
                autoComplete="new-password"
                spellcheck={false}
                placeholder={st.keySet ? `Guardada ${st.keyHint}` : "sk-…"}
                value={st.key}
                aria-describedby="ia-key-h"
                onInput$={(_, el) => {
                  st.key = el.value;
                  st.dirty = true;
                }}
              />
              <div class="hint" id="ia-key-h">
                Se guarda en el servidor y nunca se muestra; vacío = conservar la actual.
                {st.keySet && (
                  <>
                    {" "}
                    Hay una clave guardada: <code>{st.keyHint}</code>.
                  </>
                )}
              </div>
            </div>
          </div>

          <div class="studio-actions">
            <button type="button" class="btn ghost" disabled={st.testing || st.url.trim() === ""} onClick$={probar} aria-busy={st.testing}>
              {st.testing ? <Icon name="loader" size={14} class="studio-spin" /> : <Icon name="plug" size={14} />}
              {st.testing ? "Probando" : "Probar conexión"}
            </button>
            <button type="submit" class="btn" disabled={st.saving || (!st.dirty && !st.key)} aria-busy={st.saving}>
              {st.saving ? <Icon name="loader" size={14} class="studio-spin" /> : <Icon name="check" size={14} />}
              {st.saving ? "Guardando" : "Guardar"}
            </button>
            {st.dirty && !st.saving && <span class="xs faint">Cambios sin guardar</span>}
          </div>

          {r && (
            <div class={`studio-strip ia-result ${tono}`} role="status" aria-live="polite" data-ok={r.ok}>
              <Icon name={icono} size={15} />
              <span>
                <b>{r.ok ? "Conectada" : r.status === 200 ? "Respondió, pero no como chat" : "Sin conexión"}</b>
                {" · "}
                {r.ms} ms{r.status ? ` · HTTP ${r.status}` : ""}
                {r.model ? ` · ${r.model}` : ""}
                {r.detail && <span class="ia-detail"> · {r.detail}</span>}
              </span>
            </div>
          )}
          {st.testError && (
            <div class="studio-strip bad" role="alert">
              <Icon name="alert" size={15} />
              <span>No se pudo probar: {st.testError}</span>
            </div>
          )}
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
