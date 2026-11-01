import {
  $,
  component$,
  useContext,
  useSignal,
  useStore,
  useVisibleTask$,
} from "@builder.io/qwik";
import { type DocumentHead } from "@builder.io/qwik-city";
import { api, ApiError, errMsg, requireLogin, type DshEstado } from "~/lib/api";
import { SessionContext } from "~/lib/session";
import { getParam, setTitle } from "~/lib/url";
import { Icon } from "~/components/icon";

// /deepseek/: la pestaña que abre el botón «Abrir DeepSeek Harness» del LIVE. Enciende el aula del alumno, arranca
// DeepSeek Harness dentro y se convierte en él (location.replace al enlace con el token de arranque), sin terminal.
// Si no hay clave (ni propia ni de la clase), pide la clave en un formulario. Con ?clave=1 solo muestra la clave:
// guardar, cambiar u olvidar. La clave viaja una vez al LMS, que la escribe en el aula y no la guarda.

type Fase = "cargando" | "abriendo" | "clave" | "listo" | "error";

export default component$(() => {
  const session = useContext(SessionContext);
  const st = useStore<{
    fase: Fase;
    estado: DshEstado | null;
    error: string;
    aviso: string;
    soloClave: boolean;
  }>({
    fase: "cargando",
    estado: null,
    error: "",
    aviso: "",
    soloClave: false,
  });
  const clave = useSignal("");
  const ocupado = useSignal(false);
  const errClave = useSignal("");

  const abrir = $(async () => {
    st.fase = "abriendo";
    st.error = "";
    try {
      const r = await api.dshAbrir();
      st.fase = "listo";
      location.replace(r.url); // esta pestaña pasa a ser DeepSeek Harness (el token se canjea al cargar)
    } catch (e) {
      if (requireLogin(e)) return;
      if (e instanceof ApiError && e.code === "sin_clave") {
        st.fase = "clave";
        st.aviso =
          "Para empezar, pega tu clave de DeepSeek. Solo se pide una vez por clase.";
        return;
      }
      st.fase = "error";
      st.error = errMsg(e);
    }
  });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async ({ track }) => {
    track(() => session.loaded);
    if (!session.loaded) return;
    setTitle("DeepSeek Harness");
    st.soloClave = getParam("clave") === "1";
    try {
      st.estado = await api.dshEstado();
    } catch (e) {
      if (requireLogin(e)) return;
      st.fase = "error";
      st.error = errMsg(e);
      return;
    }
    if (st.soloClave) st.fase = "clave";
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
      if (st.estado) {
        st.estado.propia = true;
        st.estado.clave = "propia";
      }
      st.aviso = "";
      if (!st.soloClave) await abrir();
    } catch (e) {
      if (requireLogin(e)) return;
      errClave.value = errMsg(e);
    } finally {
      ocupado.value = false;
    }
  });

  const olvidar = $(async () => {
    ocupado.value = true;
    try {
      const r = await api.dshOlvidar();
      if (st.estado) {
        st.estado.propia = false;
        st.estado.clave = r.clave;
      }
    } catch (e) {
      if (requireLogin(e)) return;
      errClave.value = errMsg(e);
    } finally {
      ocupado.value = false;
    }
  });

  const e = st.estado;
  return (
    <div class="login dsh-lanzador">
      <div class="card" style="padding:1.1rem 1.2rem">
        <p class="xs muted dsh-marca">
          <Icon name="sparkles" size={14} /> DeepSeek Harness
        </p>

        {(st.fase === "cargando" ||
          st.fase === "abriendo" ||
          st.fase === "listo") && (
          <div class="dsh-progreso" role="status" aria-live="polite">
            <span class="dsh-giro" aria-hidden="true">
              <Icon name="loader" size={22} />
            </span>
            <div>
              <b>
                {st.fase === "listo"
                  ? "¡Listo! Abriendo…"
                  : "Preparando tu DeepSeek Harness…"}
              </b>
              <p class="sm muted">
                Encendemos tu espacio de trabajo y abrimos el programa. Tarda
                unos segundos; no cierres esta pestaña.
              </p>
            </div>
          </div>
        )}

        {st.fase === "error" && (
          <div role="alert">
            <p class="sm bad row" style="flex-wrap:nowrap">
              <Icon name="alert" />{" "}
              {st.error || "No se pudo abrir DeepSeek Harness."}
            </p>
            <button
              type="button"
              class="btn"
              style="width:100%;justify-content:center;margin-top:.6rem"
              onClick$={abrir}
            >
              <Icon name="refresh" size={14} /> Intentar de nuevo
            </button>
          </div>
        )}

        {st.fase === "clave" && (
          <div>
            {st.aviso && <p class="sm">{st.aviso}</p>}
            {e?.propia && (
              <p class="dsh-estado ok" role="status">
                <Icon name="checkCircle" size={16} /> Clave guardada ✓{" "}
                <span class="xs muted">(no se muestra)</span>
              </p>
            )}
            {!e?.propia && e?.clase && (
              <p class="dsh-estado ok" role="status">
                <Icon name="checkCircle" size={16} /> Tu grupo usa la clave de
                la clase ✓ No necesitas la tuya.
              </p>
            )}
            {!e?.propia && (
              <form preventdefault:submit onSubmit$={guardar}>
                <label for="dsh-clave">
                  {e?.clase
                    ? "Si prefieres usar tu propia clave, pégala aquí"
                    : "Pega aquí tu clave de DeepSeek"}
                </label>
                <input
                  id="dsh-clave"
                  name="clave-deepseek"
                  type="password"
                  autoComplete="off"
                  spellcheck={false}
                  placeholder="sk-…"
                  bind:value={clave}
                  disabled={ocupado.value}
                />
                <p class="xs muted" style="margin:.4rem 0 0">
                  La encuentras en platform.deepseek.com, en «API keys». Se
                  guarda solo en tu espacio de trabajo de esta clase y se borra
                  cuando se apaga. No la mostramos ni la guardamos en la
                  plataforma.
                </p>
                {errClave.value && (
                  <p class="sm bad row" style="flex-wrap:nowrap" role="alert">
                    <Icon name="alert" /> {errClave.value}
                  </p>
                )}
                <button
                  type="submit"
                  class="btn"
                  style="width:100%;justify-content:center;margin-top:.9rem"
                  disabled={ocupado.value}
                >
                  {ocupado.value
                    ? "Guardando…"
                    : st.soloClave
                      ? "Guardar mi clave"
                      : "Guardar y abrir"}
                </button>
              </form>
            )}
            {e?.propia && (
              <div class="dsh-acciones">
                <button
                  type="button"
                  class="btn"
                  style="justify-content:center"
                  disabled={ocupado.value}
                  onClick$={abrir}
                >
                  <Icon name="external" size={14} /> Abrir DeepSeek Harness
                </button>
                <button
                  type="button"
                  class="btn ghost"
                  style="justify-content:center"
                  disabled={ocupado.value}
                  onClick$={olvidar}
                >
                  <Icon name="trash" size={14} /> Olvidar mi clave
                </button>
              </div>
            )}
            {!e?.propia && e?.clase && st.soloClave && (
              <button
                type="button"
                class="btn ghost"
                style="width:100%;justify-content:center;margin-top:.6rem"
                onClick$={abrir}
              >
                <Icon name="external" size={14} /> Abrir con la clave de la
                clase
              </button>
            )}
          </div>
        )}
      </div>
      {st.fase !== "clave" && (
        <p class="xs muted" style="text-align:center;margin-top:.8rem">
          <a href="/deepseek/?clave=1">Cambiar u olvidar mi clave</a>
        </p>
      )}
    </div>
  );
});

export const head: DocumentHead = { title: "DeepSeek Harness" };
