import { component$, type QRL, Slot, useSignal, useStore, useVisibleTask$, $ } from "@builder.io/qwik";
import { api, ApiError, errMsg, requireLogin, type DshEstado } from "~/lib/api";
import { Icon } from "./icon";

// Pestaña «DeepSeek Harness» del panel del LIVE: la interfaz web de dsh embebida al lado de la escena, sin abrir otra
// pestaña. Enciende el aula, arranca dsh (clave propia o la de la clase; ver dsh_boton.go) y lo muestra en un iframe
// del mismo origen (/dsh/<sub>/…; el LMS lo sirve con X-Frame-Options SAMEORIGIN). Se monta la primera vez que se
// abre la pestaña y se queda montado: cambiar a la terminal o al visor no corta la conversación con el agente.
//
// Junto al agente va el Visor (lo que llega por <Slot/>): el alumno pide un cambio y ve el resultado sin cambiar de
// pestaña. Con el panel ancho van lado a lado; angosto, uno encima del otro. El divisor se arrastra o se mueve con
// las flechas; el reparto y si el visor se ve se recuerdan en este navegador.

type Fase = "cargando" | "abriendo" | "clave" | "listo" | "error";

const CLAVE_REPARTO = "lms.live.dsh";
const ANCHO_LADO = 900; // px del panel desde los que agente y visor van lado a lado
const MIN = 0.3;
const MAX = 0.78;

export const LiveDsh = component$((props: { pedido?: string; escenaOculta?: boolean; onEscena$?: QRL<() => void> }) => {
  const st = useStore<{ fase: Fase; url: string; modo: string; error: string; estado: DshEstado | null; vuelta: number }>({
    fase: "cargando",
    url: "",
    modo: "",
    error: "",
    estado: null,
    vuelta: 0,
  });
  const vista = useStore({ frac: 0.56, visor: true, lado: false, arrastrando: false, pista: true });
  const raiz = useSignal<HTMLElement>();
  const clave = useSignal("");
  const errClave = useSignal("");
  const ocupado = useSignal(false);
  const copiado = useSignal(false);

  const guardarVista = $(() => {
    try {
      localStorage.setItem(CLAVE_REPARTO, JSON.stringify({ frac: vista.frac, visor: vista.visor, pista: vista.pista }));
    } catch {
      /* sin almacenamiento: el reparto dura esta pantalla */
    }
  });

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
  useVisibleTask$(async ({ cleanup }) => {
    try {
      const g = JSON.parse(localStorage.getItem(CLAVE_REPARTO) || "{}");
      if (typeof g.frac === "number") vista.frac = Math.min(MAX, Math.max(MIN, g.frac));
      if (typeof g.visor === "boolean") vista.visor = g.visor;
      if (g.pista === false) vista.pista = false;
    } catch {
      /* sin almacenamiento */
    }
    const el = raiz.value;
    if (el) {
      const ro = new ResizeObserver(([e]) => (vista.lado = e.contentRect.width >= ANCHO_LADO));
      ro.observe(el);
      cleanup(() => ro.disconnect());
    }
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

  const copiarPedido = $(async () => {
    if (!props.pedido) return;
    try {
      await navigator.clipboard.writeText(props.pedido);
      copiado.value = true;
      setTimeout(() => (copiado.value = false), 2500);
    } catch {
      /* sin portapapeles: el pedido sigue en la ayuda de la escena */
    }
  });

  // Divisor: arrastre con puntero (los iframes dejan de recibir eventos mientras dura) o flechas del teclado.
  const empezar = $((e: PointerEvent, div: HTMLElement) => {
    const el = raiz.value;
    if (!el) return;
    div.setPointerCapture(e.pointerId);
    vista.arrastrando = true;
    const r = el.querySelector<HTMLElement>(".lv-dshv-cuerpo")!.getBoundingClientRect();
    const mover = (ev: PointerEvent) => {
      const f = vista.lado ? (ev.clientX - r.left) / r.width : (ev.clientY - r.top) / r.height;
      vista.frac = Math.min(MAX, Math.max(MIN, f));
    };
    const soltar = () => {
      vista.arrastrando = false;
      div.removeEventListener("pointermove", mover);
      div.removeEventListener("pointerup", soltar);
      div.removeEventListener("pointercancel", soltar);
      guardarVista();
    };
    div.addEventListener("pointermove", mover);
    div.addEventListener("pointerup", soltar);
    div.addEventListener("pointercancel", soltar);
  });

  const pct = Math.round(vista.frac * 100);

  return (
    <div ref={raiz} class={["lv-dshv", vista.lado ? "lado" : "arriba", vista.visor ? "con-visor" : "", vista.arrastrando ? "arrastrando" : ""].filter(Boolean).join(" ")} style={`--dsh-frac:${vista.frac}`}>
      <div class="lv-dsh-barra">
        <span class="lv-dsh-modo">
          {st.fase === "listo" ? (
            <>
              <i class="lv-punto verde" aria-hidden="true" />
              {st.modo === "clase" ? "Clave de la clase" : "Tu clave"}
            </>
          ) : (
            "DeepSeek Harness"
          )}
        </span>
        {props.pedido && (
          <button type="button" class={`btn sm lv-dsh-pedido ${copiado.value ? "ok" : ""}`} title={props.pedido} onClick$={copiarPedido} aria-live="polite">
            <Icon name={copiado.value ? "check" : "copy"} size={13} />
            {copiado.value ? "Copiado: pégalo en el chat (Ctrl+V)" : "Copiar el pedido de esta escena"}
          </button>
        )}
        {props.onEscena$ && (
          <button
            type="button"
            class={`btn ghost sm lv-dsh-escena ${props.escenaOculta ? "on" : ""}`}
            aria-pressed={!!props.escenaOculta}
            title={props.escenaOculta ? "Volver a mostrar la escena del instructor" : "Ocultar la escena del instructor: DeepSeek y el visor a pantalla completa"}
            onClick$={props.onEscena$}
          >
            <Icon name={props.escenaOculta ? "restaurar" : "maximizar"} size={13} />
            {props.escenaOculta ? "Ver escena" : "Ocultar escena"}
          </button>
        )}
        <button
          type="button"
          class="lv-ico-btn"
          aria-pressed={vista.visor}
          aria-label={vista.visor ? "Ocultar el visor" : "Mostrar el visor junto al agente"}
          title={vista.visor ? "Ocultar el visor" : "Mostrar el visor: lo que vas construyendo"}
          onClick$={() => {
            vista.visor = !vista.visor;
            guardarVista();
          }}
        >
          <Icon name="eye" size={15} />
        </button>
        <button type="button" class="lv-ico-btn" aria-label="Recargar DeepSeek Harness" title="Recargar DeepSeek Harness" onClick$={abrir}>
          <Icon name="refresh" size={15} />
        </button>
        <a class="lv-ico-btn" href="/deepseek/" target="_blank" rel="noopener" aria-label="Abrir DeepSeek Harness en otra pestaña" title="Abrir en otra pestaña">
          <Icon name="external" size={15} />
        </a>
      </div>

      {st.fase === "listo" && vista.pista && (
        <div class="lv-dsh-pista" role="note">
          <Icon name="info" size={14} />
          <span>
            <b>Primera vez:</b> pulsa «Choose workspace», toca la carpeta <b>trabajo</b> y luego <b>Open</b>. Después pega el pedido y mira tu bot en el visor.
          </span>
          <button
            type="button"
            class="lv-ico-btn"
            aria-label="Entendido, ocultar la pista"
            title="Entendido"
            onClick$={() => {
              vista.pista = false;
              guardarVista();
            }}
          >
            <Icon name="x" size={14} />
          </button>
        </div>
      )}
      <div class="lv-dshv-cuerpo">
        <div class="lv-dshv-agente">
          {st.fase === "listo" ? (
            <iframe key={st.vuelta} class="lv-dsh-marco" src={st.url} title="DeepSeek Harness" allow="clipboard-read; clipboard-write; microphone" data-testid="dsh-embebido" />
          ) : (
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
          )}
        </div>
        {vista.visor && (
          <div
            class="lv-dshv-div"
            role="separator"
            tabIndex={0}
            aria-orientation={vista.lado ? "vertical" : "horizontal"}
            aria-label="Reparto entre el agente y el visor"
            aria-valuemin={Math.round(MIN * 100)}
            aria-valuemax={Math.round(MAX * 100)}
            aria-valuenow={pct}
            aria-valuetext={`El agente ocupa el ${pct} %`}
            title="Arrastra o usa las flechas para repartir el espacio"
            onPointerDown$={(e, el) => empezar(e, el)}
            onKeyDown$={(e) => {
              const menos = vista.lado ? "ArrowLeft" : "ArrowUp";
              const mas = vista.lado ? "ArrowRight" : "ArrowDown";
              if (e.key !== menos && e.key !== mas) return;
              vista.frac = Math.min(MAX, Math.max(MIN, vista.frac + (e.key === mas ? 0.05 : -0.05)));
              guardarVista();
            }}
          />
        )}
        {vista.visor && (
          <section class="lv-dshv-visor" aria-label="Visor: lo que vas construyendo">
            <Slot />
          </section>
        )}
      </div>
    </div>
  );
});
