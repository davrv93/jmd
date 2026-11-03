import { component$, useSignal, useStore, useVisibleTask$, $ } from "@builder.io/qwik";
import { api, ApiError, errMsg, requireLogin, type DshEstado } from "~/lib/api";
import { Icon } from "./icon";

// Pestaña «DeepSeek Harness» del panel del LIVE: la interfaz web de dsh embebida al lado de la escena, sin abrir otra
// pestaña. Enciende el aula, arranca dsh (clave propia o la de la clase; ver dsh_boton.go) y lo muestra en un iframe
// del mismo origen (/dsh/<sub>/…; el LMS lo sirve con X-Frame-Options SAMEORIGIN). Se monta la primera vez que se
// abre la pestaña y se queda montado: cambiar a la terminal o al visor no corta la conversación con el agente.

type Fase = "cargando" | "abriendo" | "clave" | "listo" | "error";

export const LiveDsh = component$(() => {
  const st = useStore<{ fase: Fase; url: string; modo: string; error: string; estado: DshEstado | null; vuelta: number }>({
    fase: "cargando",
    url: "",
    modo: "",
    error: "",
    estado: null,
    vuelta: 0,
  });
  const clave = useSignal("");
  const errClave = useSignal("");
  const ocupado = useSignal(false);

  const abrir = $(async () => {
    st.fase = "abriendo";
    st.error = "";
    try {
      const r = await api.dshAbrir();
      st.url = r.url;
      st.modo = r.modo;
      st.vuelta++;
      st.fase = "listo";
    } catch (e) {
      if (requireLogin(e)) return;
      if (e instanceof ApiError && e.code === "sin_clave") {
        st.fase = "clave";
        return;
      }
      st.fase = "error";
      st.error = errMsg(e);
    }
  });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async () => {
    try {
      st.estado = await api.dshEstado();
    } catch (e) {
      if (requireLogin(e)) return;
      st.fase = "error";
      st.error = errMsg(e);
      return;
    }
    if (st.estado.clave === "ninguna") st.fase = "clave";
    else await abrir();
  });

  const guardar = $(async () => {
    errClave.value = "";
    const k = clave.value.trim();
    if (!k) {
      errClave.value = "Pega tu clave en el recuadro.";
      return;
    }
    ocupado.value = true;
    try {
      await api.dshClave(k);
      clave.value = "";
      await abrir();
    } catch (e) {
      if (!requireLogin(e)) errClave.value = errMsg(e);
    } finally {
      ocupado.value = false;
    }
  });

  if (st.fase === "listo") {
    return (
      <div class="lv-dsh">
        <div class="lv-dsh-barra">
          <span class="lv-dsh-modo">
            <i class="lv-punto verde" aria-hidden="true" />
            {st.modo === "clase" ? "Con la clave de la clase" : "Con tu clave"}
          </span>
          <button type="button" class="lv-ico-btn" aria-label="Recargar DeepSeek Harness" title="Recargar DeepSeek Harness" onClick$={abrir}>
            <Icon name="refresh" size={15} />
          </button>
          <a class="lv-ico-btn" href="/deepseek/" target="_blank" rel="noopener" aria-label="Abrir DeepSeek Harness en otra pestaña" title="Abrir en otra pestaña">
            <Icon name="external" size={15} />
          </a>
        </div>
        <iframe
          key={st.vuelta}
          class="lv-dsh-marco"
          src={st.url}
          title="DeepSeek Harness"
          allow="clipboard-read; clipboard-write; microphone"
          data-testid="dsh-embebido"
        />
      </div>
    );
  }

  return (
    <div class="lv-dsh-estado">
      <span class="lv-agente-ico">
        <Icon name="sparkles" size={22} />
      </span>
      {(st.fase === "cargando" || st.fase === "abriendo") && (
        <div role="status" aria-live="polite">
          <p>
            <b>Preparando tu DeepSeek Harness…</b>
          </p>
          <p class="sm">Encendemos tu aula y abrimos el agente aquí al lado. La primera vez tarda unos segundos.</p>
        </div>
      )}
      {st.fase === "error" && (
        <div role="alert">
          <p class="bad">{st.error || "No se pudo abrir DeepSeek Harness."}</p>
          <button type="button" class="btn sm" onClick$={abrir}>
            <Icon name="refresh" size={14} /> Intentar de nuevo
          </button>
        </div>
      )}
      {st.fase === "clave" && (
        <form class="lv-dsh-clave" preventdefault:submit onSubmit$={guardar}>
          <p>
            <b>Tu grupo no tiene la clave de la clase.</b> Pídele al instructor que la active o pega aquí tu clave de DeepSeek.
          </p>
          <label for="lv-dsh-clave" class="sm">
            Tu clave de DeepSeek
          </label>
          <input id="lv-dsh-clave" type="password" autoComplete="off" spellcheck={false} placeholder="sk-…" bind:value={clave} disabled={ocupado.value} />
          <p class="xs">Está en platform.deepseek.com, en «API keys». Solo vive en tu aula y se borra cuando se apaga.</p>
          {errClave.value && (
            <p class="sm bad" role="alert">
              {errClave.value}
            </p>
          )}
          <div class="row" style="gap:.5rem;justify-content:center">
            <button type="submit" class="btn sm" disabled={ocupado.value}>
              {ocupado.value ? "Guardando…" : "Guardar y abrir"}
            </button>
            <button type="button" class="btn ghost sm" disabled={ocupado.value} onClick$={abrir}>
              <Icon name="refresh" size={14} /> Ya la activó
            </button>
          </div>
        </form>
      )}
    </div>
  );
});
