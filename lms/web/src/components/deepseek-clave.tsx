import { component$, useStore, useVisibleTask$, $ } from "@builder.io/qwik";
import { api, errMsg, requireLogin, type DeepSeekSaldo, type DeepSeekSistema } from "~/lib/api";
import { Icon } from "./icon";
import { Help } from "./help-tip";

// Tarjeta «Clave de DeepSeek del sistema» del panel del instructor (admin): la clave que usa el botón «Abrir
// DeepSeek Harness» del LIVE en los grupos marcados. Se guarda en la base del LMS y se aplica al momento; al aula
// solo entra un token propio (relé del LMS). La clave nunca vuelve al navegador: solo su pista «…abcd» y el saldo.

interface St {
  loaded: boolean;
  loadError: string;
  cfg: DeepSeekSistema | null;
  clave: string; // lo que el admin escribe; vacío = conservar la guardada
  grupos: string[];
  dirty: boolean;
  saving: boolean;
  testing: boolean;
  test: DeepSeekSaldo | null;
  error: string;
  saved: string;
  quitar: boolean; // segundo clic de «Quitar clave»
}

export const DeepseekClave = component$(() => {
  const st = useStore<St>({
    loaded: false,
    loadError: "",
    cfg: null,
    clave: "",
    grupos: [],
    dirty: false,
    saving: false,
    testing: false,
    test: null,
    error: "",
    saved: "",
    quitar: false,
  });

  const aplicar = $((c: DeepSeekSistema) => {
    st.cfg = c;
    st.grupos = [...c.grupos];
    st.clave = "";
    st.dirty = false;
    st.test = c.saldo ?? null;
    st.loaded = true;
  });

  const load = $(async () => {
    st.loadError = "";
    try {
      await aplicar(await api.deepseekSistema());
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
    st.error = "";
    try {
      st.test = await api.probarDeepseekSistema(st.clave.trim() || undefined);
    } catch (e) {
      if (!requireLogin(e)) st.error = errMsg(e);
    } finally {
      st.testing = false;
    }
  });

  const guardar = $(async () => {
    st.saving = true;
    st.error = "";
    st.saved = "";
    try {
      await aplicar(await api.guardarDeepseekSistema({ clave: st.clave.trim() || undefined, grupos: st.grupos }));
      st.saved = `Guardada. Ya la usan ${st.grupos.length === 1 ? "el grupo" : "los grupos"} ${st.grupos.join(", ")}: el alumno solo pulsa «Abrir DeepSeek Harness».`;
      setTimeout(() => (st.saved = ""), 6000);
    } catch (e) {
      if (!requireLogin(e)) st.error = errMsg(e);
    } finally {
      st.saving = false;
    }
  });

  const quitar = $(async () => {
    if (!st.quitar) {
      st.quitar = true;
      setTimeout(() => (st.quitar = false), 4000);
      return;
    }
    st.quitar = false;
    st.saving = true;
    st.error = "";
    try {
      await aplicar(await api.quitarDeepseekSistema());
      st.test = null;
      st.saved = "Clave quitada. Esos grupos vuelven a pedir la clave propia de cada alumno.";
      setTimeout(() => (st.saved = ""), 6000);
    } catch (e) {
      if (!requireLogin(e)) st.error = errMsg(e);
    } finally {
      st.saving = false;
    }
  });

  const c = st.cfg;
  const puesta = !!c?.clave_puesta;
  const r = st.test;
  const tono = !r ? "" : r.ok ? (r.disponible === false ? "warn" : "ok") : "bad";

  return (
    <section class="studio-card ia-card" aria-labelledby="ds-t" data-testid="deepseek-sistema">
      <div class="studio-card__bar">
        <Icon name="lock" size={14} />
        <span id="ds-t">Clave de DeepSeek del sistema</span>
        <span class="studio-right">
          <span class={`studio-state ${st.loaded ? (puesta ? "ok" : "warn") : ""}`} role="status">
            <Icon name={st.loaded ? (puesta ? "plug" : "plugOff") : "loader"} size={13} />
            {st.loaded ? (puesta ? `Activa en ${c!.grupos.length} ${c!.grupos.length === 1 ? "grupo" : "grupos"}` : "Sin clave") : "Cargando"}
          </span>
          <Help title="Cómo funciona">
            <p>
              Es la clave que usa el botón <b>«Abrir DeepSeek Harness»</b> del LIVE en los grupos que marques: el alumno no pega nada.
            </p>
            <p>
              Se guarda en la <b>base del LMS</b> y nunca entra al aula del alumno: el aula recibe un token propio y el LMS reenvía a DeepSeek.
            </p>
            <p>
              Tope por alumno y por día: 600 peticiones y 4 millones de tokens. Si un alumno pega su propia clave, manda la suya.
            </p>
          </Help>
        </span>
      </div>

      {st.loadError && (
        <div class="studio-strip bad" role="alert">
          <Icon name="alert" size={15} />
          <span>No se pudo cargar: {st.loadError}</span>
          <button type="button" class="btn ghost sm" onClick$={load}>
            <Icon name="refresh" size={13} /> Reintentar
          </button>
        </div>
      )}

      {st.loaded && c && !c.disponible && (
        <div class="studio-strip bad" role="alert">
          <Icon name="alert" size={15} />
          <span>Este servidor no tiene el relé de IA (falta la semilla del aula). La clave no se puede usar aquí.</span>
        </div>
      )}

      {st.loaded && c && c.disponible && (
        <form class="ia-form" preventdefault:submit onSubmit$={guardar} aria-busy={st.saving}>
          <div class="ia-fields">
            <div>
              <label for="ds-clave">Clave de DeepSeek</label>
              <input
                id="ds-clave"
                type="password"
                autoComplete="new-password"
                spellcheck={false}
                placeholder={puesta ? `Guardada ${c.clave_pista}` : "sk-…"}
                value={st.clave}
                aria-describedby="ds-clave-h"
                onInput$={(_, el) => {
                  st.clave = el.value;
                  st.dirty = true;
                }}
              />
              <div class="hint" id="ds-clave-h">
                Cópiala de platform.deepseek.com → API keys. Vacío = conservar la actual.
                {puesta && (
                  <>
                    {" "}
                    Guardada: <code>{c.clave_pista}</code>
                    {c.por && <> por {c.por}</>}
                    {c.fecha && <> el {new Date(c.fecha).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" })}</>}.
                  </>
                )}
              </div>
            </div>
            <fieldset class="ds-grupos">
              <legend>Grupos que la usan</legend>
              {c.cohortes.length === 0 && <div class="hint">No hay grupos en los cursos publicados.</div>}
              <div class="ds-grupos__lista">
                {c.cohortes.map((g) => (
                  <label key={g.id} class="ds-grupo">
                    <input
                      type="checkbox"
                      checked={st.grupos.includes(g.id)}
                      onChange$={(_, el) => {
                        st.grupos = el.checked ? [...st.grupos, g.id].sort() : st.grupos.filter((x) => x !== g.id);
                        st.dirty = true;
                      }}
                    />
                    <span>
                      <b>{g.id}</b>
                      <small>{g.cursos.join(" · ")}</small>
                    </span>
                  </label>
                ))}
              </div>
              {c.entorno.length > 0 && (
                <div class="hint">
                  Con clave puesta en el servidor (entorno): <code>{c.entorno.join(", ")}</code>. La de aquí manda en los grupos que marques.
                </div>
              )}
            </fieldset>
          </div>

          <div class="studio-actions">
            <button type="button" class="btn ghost" disabled={st.testing || (!puesta && st.clave.trim() === "")} onClick$={probar} aria-busy={st.testing}>
              {st.testing ? <Icon name="loader" size={14} class="studio-spin" /> : <Icon name="plug" size={14} />}
              {st.testing ? "Probando" : "Probar y ver saldo"}
            </button>
            <button
              type="submit"
              class="btn"
              disabled={st.saving || !st.dirty || st.grupos.length === 0 || (!puesta && st.clave.trim() === "")}
              aria-busy={st.saving}
            >
              {st.saving ? <Icon name="loader" size={14} class="studio-spin" /> : <Icon name="check" size={14} />}
              {st.saving ? "Guardando" : "Guardar"}
            </button>
            {puesta && (
              <button type="button" class={`btn ${st.quitar ? "danger" : "ghost"}`} disabled={st.saving} onClick$={quitar}>
                <Icon name="trash" size={14} /> {st.quitar ? "Pulsa otra vez para quitarla" : "Quitar clave"}
              </button>
            )}
            {st.dirty && !st.saving && <span class="xs faint">Cambios sin guardar</span>}
          </div>

          {r && (
            <div class={`studio-strip ia-result ${tono}`} role="status" aria-live="polite" data-ok={r.ok}>
              <Icon name={r.ok ? (r.disponible === false ? "alert" : "checkCircle") : "plugOff"} size={15} />
              <span>
                <b>{r.ok ? (r.disponible === false ? "Clave válida, sin saldo" : "Clave válida") : "No funciona"}</b>
                {r.saldo && <> · saldo {r.saldo}</>}
                {" · "}
                {r.ms} ms
                {r.detalle && <span class="ia-detail"> · {r.detalle}</span>}
              </span>
            </div>
          )}
          {st.error && (
            <div class="studio-strip bad" role="alert">
              <Icon name="alert" size={15} />
              <span>{st.error}</span>
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
