import { component$, useSignal, $, useVisibleTask$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
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

export default component$(() => {
  const prompt = useSignal(PROMPT_DEFAULT);
  const html = useSignal("");
  const err = useSignal("");
  const busy = useSignal(false);
  const vista = useSignal<"ver" | "html">("ver");
  const copiado = useSignal(false);

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(() => {
    document.title = "Estudio de landing · JMD";
  });

  const generar = $(async () => {
    err.value = "";
    busy.value = true;
    try {
      const r = await api.generate(prompt.value);
      html.value = r.html;
      vista.value = "ver";
    } catch (e) {
      if (requireLogin(e)) return;
      err.value =
        e instanceof ApiError && e.status === 503
          ? "El gateway de IA todavía no está conectado. Copia el prompt, genéralo con tu OpenCode + la skill «landing-editorial» y pega el HTML en la pestaña «HTML»."
          : errMsg(e);
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

  return (
    <>
      <div class="head">
        <span class="lead-ico gold" style="width:46px;height:46px">
          <Icon name="sparkles" size={22} />
        </span>
        <div class="grow">
          <h1>Estudio de landing</h1>
          <p>
            Escribe el <b>prompt</b>, pulsa <b>Generar</b> y mira el resultado en el <b>visor</b>. Abajo
            tienes una <b>terminal</b> real (en un contenedor aislado) para inspeccionar y experimentar.
          </p>
        </div>
      </div>

      <div class="studio">
        <section class="stack">
          <label for="prompt" style="margin-top:0">
            Prompt (edítalo como quieras: negocio, color, secciones, tono…)
          </label>
          <textarea
            id="prompt"
            class="studio__prompt"
            value={prompt.value}
            onInput$={(_, el) => (prompt.value = el.value)}
            spellcheck={false}
          />
          <div class="row">
            <button type="button" class="btn" disabled={busy.value} onClick$={generar}>
              <Icon name="sparkles" size={15} /> {busy.value ? "Generando…" : "Generar landing"}
            </button>
            <button type="button" class="btn ghost sm" onClick$={copiarPrompt}>
              <Icon name="copy" size={14} /> {copiado.value ? "Copiado ✓" : "Copiar prompt"}
            </button>
          </div>
          {err.value && (
            <p class="sm warn row" style="flex-wrap:nowrap" role="alert">
              <Icon name="alert" size={15} /> {err.value}
            </p>
          )}

          <div class="section-t" style="margin-bottom:.2rem">
            <Icon name="terminal" /> Terminal (contenedor aislado: sin red, no toca tu máquina)
          </div>
          <Terminal />
        </section>

        <section class="stack">
          <div class="row" style="justify-content:space-between">
            <div class="row" style="gap:.1rem">
              <button type="button" class={`tab ${vista.value === "ver" ? "on" : ""}`} onClick$={() => (vista.value = "ver")}>
                <Icon name="globe" size={14} /> Vista
              </button>
              <button type="button" class={`tab ${vista.value === "html" ? "on" : ""}`} onClick$={() => (vista.value = "html")}>
                <Icon name="book" size={14} /> HTML
              </button>
            </div>
            {html.value && <span class="xs faint">{html.value.length} bytes</span>}
          </div>

          {vista.value === "ver" ? (
            html.value ? (
              <iframe class="studio__frame" sandbox="allow-scripts allow-modals" title="Vista de la landing" srcdoc={html.value} />
            ) : (
              <div class="empty" style="min-height:22rem">
                <span class="empty-ico"><Icon name="globe" size={22} /></span>
                <b>Aquí verás tu landing</b>
                <p>
                  Pulsa <b>Generar</b>. Si el gateway no está conectado, genera el HTML con tu OpenCode + la
                  skill y pégalo en la pestaña «HTML».
                </p>
              </div>
            )
          ) : (
            <textarea
              class="studio__html"
              placeholder="Pega aquí el index.html que generaste con el skill…"
              value={html.value}
              onInput$={(_, el) => (html.value = el.value)}
              spellcheck={false}
            />
          )}
        </section>
      </div>

      <section class="card" style="margin-top:1.2rem">
        <div class="section-t" style="margin-top:0"><Icon name="box" /> El skill</div>
        <p class="sm muted" style="margin:0">
          Descarga <b>skills.zip</b> desde los materiales de la sesión, descomprímelo en tu carpeta de
          skills de OpenCode y pídele lo mismo a tu agente. El visor de arriba renderiza lo que produzca,
          sin instalar nada.
        </p>
      </section>
    </>
  );
});

export const head: DocumentHead = { title: "Estudio de landing" };
