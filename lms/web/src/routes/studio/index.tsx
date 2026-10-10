import { component$, Slot, useSignal, $, useVisibleTask$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import { Link } from "@builder.io/qwik-city";
import { api, ApiError, errMsg, requireLogin } from "~/lib/api";
import { Terminal } from "~/components/terminal";
import { Icon } from "~/components/icon";

const PROMPT_DEFAULT = `Hazme una landing editorial (skill landing-editorial) para una juguetería de
barrio llamada PoohToys.

- Rubro: juguetería / niños. Color de marca: miel (#b45309) con su degradado.
- Fondo: confeti que cae y se ordena en espiral.
- Titular de portada de 4 palabras con remate en degradado; tuteo; lenguaje llano.
- Secciones: portada, del problema a la solución, catálogo en bento (peluches, juegos de mesa,
  madera, primera infancia), cifras, cómo comprar y cierre con «Pedir por WhatsApp».
- Devuelve un único index.html completo, sin librerías externas.`;

// Estado del gateway de IA. Se comprueba al cargar con una sonda sin efectos: un POST a /generate
// con prompt vacío contesta 503 si el gateway no está configurado y 400 (prompt corto) si lo está,
// sin llegar a llamar al modelo ni gastar el límite de generaciones. Luego lo actualiza cada Generar.
type IaState = "idle" | "busy" | "ok" | "warn";
const IA_LABEL: Record<IaState, string> = {
  idle: "IA: por comprobar",
  busy: "Comprobando IA",
  ok: "IA conectada",
  warn: "IA no conectada",
};
const IA_ICON: Record<IaState, string> = { idle: "plug", busy: "loader", ok: "checkCircle", warn: "plugOff" };

/** Botón de ayuda con popover corto: abre al pasar, al enfocar o al pulsar. */
const Help = component$((props: { title: string; left?: boolean }) => {
  const open = useSignal(false);
  return (
    <span class={`studio-help ${open.value ? "open" : ""} ${props.left ? "left" : ""}`}>
      <button
        type="button"
        class="studio-help__btn"
        aria-label={props.title}
        title={props.title}
        aria-expanded={open.value}
        onClick$={() => (open.value = !open.value)}
        onBlur$={() => (open.value = false)}
      >
        <Icon name="help" size={16} />
      </button>
      <div class="studio-tip" role="tooltip">
        <Slot />
      </div>
    </span>
  );
});

export default component$(() => {
  const prompt = useSignal(PROMPT_DEFAULT);
  const html = useSignal("");
  const draft = useSignal("");
  const err = useSignal("");
  const errBad = useSignal(false);
  const busy = useSignal(false);
  const vista = useSignal<"ver" | "html">("ver");
  const copiado = useSignal(false);
  const ia = useSignal<IaState>("idle");
  const termOpen = useSignal(false);

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async () => {
    document.title = "Estudio de landing · JMD";
    ia.value = "busy";
    try {
      await api.generate("");
      ia.value = "ok";
    } catch (e) {
      if (requireLogin(e)) return;
      const st = e instanceof ApiError ? e.status : 0;
      ia.value = st === 503 ? "warn" : st === 400 ? "ok" : "idle";
    }
  });

  const generar = $(async () => {
    err.value = "";
    errBad.value = false;
    busy.value = true;
    try {
      const r = await api.generate(prompt.value);
      html.value = r.html;
      draft.value = r.html;
      vista.value = "ver";
      ia.value = "ok";
    } catch (e) {
      if (requireLogin(e)) return;
      if (e instanceof ApiError && e.status === 503) {
        ia.value = "warn";
        err.value = "IA no conectada: copia el prompt y pega el HTML generado en la pestaña HTML.";
      } else {
        errBad.value = true;
        err.value = errMsg(e);
      }
    } finally {
      busy.value = false;
    }
  });

  const copiarPrompt = $(async () => {
    try {
      await navigator.clipboard.writeText(prompt.value);
      copiado.value = true;
      setTimeout(() => (copiado.value = false), 1500);
    } catch {
      /* sin portapapeles */
    }
  });

  const verHtml = $(() => {
    draft.value = html.value;
    vista.value = "html";
  });

  const aplicar = $(() => {
    html.value = draft.value.trim();
    err.value = "";
    vista.value = "ver";
  });

  const descargar = $(() => {
    const blob = new Blob([html.value], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "index.html";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  const hayHtml = html.value.length > 0;
  const kb = (html.value.length / 1024).toFixed(1);

  return (
    <>
      <div class="studio-head">
        <span class="lead-ico gold">
          <Icon name="sparkles" size={18} />
        </span>
        <h1>Estudio de landing</h1>
        <p class="studio-sub">Edita el prompt, genera y mira el resultado en el visor.</p>
        <div class="studio-right">
          <span class={`studio-state ${ia.value}`} role="status" aria-live="polite">
            <Icon name={IA_ICON[ia.value]} size={13} />
            {IA_LABEL[ia.value]}
          </span>
          <Help title="Qué es el estudio">
            <p>
              <b>El estudio</b> manda tu prompt al gateway de IA de la clase y muestra el <b>index.html</b> que devuelve en el visor, sin instalar nada.
            </p>
            <p>
              <b>Si la IA no está conectada:</b> copia el prompt, genéralo con OpenCode y la skill <b>landing-editorial</b>, y pega el HTML en la pestaña <b>HTML</b>.
            </p>
          </Help>
        </div>
      </div>

      <div class="studio-grid">
        <div class="studio-col">
          <section class="studio-card" aria-labelledby="studio-prompt-t">
            <div class="studio-card__bar">
              <Icon name="wand" size={14} />
              <span id="studio-prompt-t">Prompt</span>
              <span class="studio-right xs faint">negocio, color, secciones, tono</span>
            </div>
            <textarea
              id="prompt"
              class="studio-prompt"
              rows={10}
              aria-label="Prompt de la landing"
              value={prompt.value}
              onInput$={(_, el) => (prompt.value = el.value)}
              spellcheck={false}
            />
            <div class="studio-actions">
              <button type="button" class="btn" disabled={busy.value} onClick$={generar} aria-busy={busy.value}>
                {busy.value ? <Icon name="loader" size={15} class="studio-spin" /> : <Icon name="sparkles" size={15} />}
                {busy.value ? "Generando" : "Generar landing"}
              </button>
              <button type="button" class="btn ghost" onClick$={copiarPrompt} aria-label="Copiar prompt">
                <Icon name={copiado.value ? "check" : "copy"} size={14} class={copiado.value ? "ok" : ""} />
                {copiado.value ? "Copiado" : "Copiar prompt"}
              </button>
            </div>
            {err.value && (
              <div class={`studio-strip ${errBad.value ? "bad" : ""}`} role="alert">
                <Icon name="alert" size={15} />
                <span>{err.value}</span>
              </div>
            )}
          </section>

          <section class={`studio-panel ${termOpen.value ? "open" : ""}`}>
            <div class="studio-panel__sum">
              <button
                type="button"
                class="studio-panel__tgl"
                aria-expanded={termOpen.value}
                aria-controls="studio-term"
                onClick$={() => (termOpen.value = !termOpen.value)}
              >
                <Icon name="terminal" size={15} />
                Terminal aislada
                <Icon name="chevronDown" size={15} class="studio-chev" />
              </button>
              <Help title="Sobre la terminal aislada" left>
                <p>
                  Shell real en un <b>contenedor efímero</b>: sin red, no toca tu máquina y se cierra sola al salir de la página.
                </p>
              </Help>
            </div>
            {termOpen.value && (
              <div class="studio-panel__body" id="studio-term">
                <Terminal />
              </div>
            )}
          </section>

          <section class="studio-card studio-note">
            <span class="lead-ico gold">
              <Icon name="box" size={15} />
            </span>
            <p>
              <b>El skill.</b> Descarga <b>skills.zip</b> de los materiales y descomprímelo en tu carpeta de skills de OpenCode. Pídele lo mismo a tu agente y pega aquí lo que produzca.{" "}
              <Link href="/lessons/pa-01/">
                Ver materiales <Icon name="chevronRight" size={12} />
              </Link>
            </p>
          </section>
        </div>

        <section class="studio-card" aria-label="Visor">
          <div class="studio-card__bar">
            <div class="studio-seg" role="tablist" aria-label="Modo del visor">
              <button type="button" role="tab" aria-selected={vista.value === "ver"} onClick$={() => (vista.value = "ver")}>
                <Icon name="eye" size={14} /> Vista
              </button>
              <button type="button" role="tab" aria-selected={vista.value === "html"} onClick$={verHtml}>
                <Icon name="code" size={14} /> HTML
              </button>
            </div>
            <div class="studio-right">
              {hayHtml && <span class="xs faint">{kb} KB</span>}
              <span class="studio-icons">
                <button type="button" class="icon-btn" disabled={!hayHtml} onClick$={descargar} aria-label="Descargar index.html" title="Descargar index.html">
                  <Icon name="download" size={15} />
                </button>
              </span>
            </div>
          </div>

          <div class="studio-view">
            {busy.value ? (
              <div class="studio-skel" aria-busy="true" aria-label="Generando la landing">
                <i class="h" />
                <i style="width:80%" />
                <i style="width:62%" />
                <i class="b" />
                <i style="width:70%" />
                <i style="width:45%" />
              </div>
            ) : vista.value === "html" ? (
              <textarea
                class="studio-html"
                aria-label="HTML de la landing"
                placeholder="Pega aquí el index.html que generaste con el skill y pulsa Aplicar."
                value={draft.value}
                onInput$={(_, el) => (draft.value = el.value)}
                spellcheck={false}
              />
            ) : hayHtml ? (
              <iframe class="studio-frame" sandbox="allow-scripts allow-modals" title="Vista de la landing" srcdoc={html.value} />
            ) : (
              <div class="studio-empty">
                <span class="studio-empty__ico">
                  <Icon name="globe" size={30} />
                </span>
                <span>Pulsa <b>Generar</b> o pega tu HTML en la pestaña HTML.</span>
              </div>
            )}
          </div>

          {vista.value === "html" && !busy.value && (
            <div class="studio-actions">
              <button type="button" class="btn sm" onClick$={aplicar} disabled={draft.value.trim() === ""}>
                <Icon name="check" size={14} /> Aplicar
              </button>
              <button type="button" class="btn ghost sm" onClick$={descargar} disabled={!hayHtml}>
                <Icon name="download" size={14} /> Descargar index.html
              </button>
              <span class="xs faint">{draft.value.length ? `${(draft.value.length / 1024).toFixed(1)} KB en el editor` : "Editor vacío"}</span>
            </div>
          )}
        </section>
      </div>
    </>
  );
});

export const head: DocumentHead = { title: "Estudio de landing" };
