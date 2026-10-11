import { component$, useSignal, useVisibleTask$, $ } from "@builder.io/qwik";
import { useNavigate, type DocumentHead } from "@builder.io/qwik-city";
import { setTitle } from "~/lib/url";
import { Icon } from "~/components/icon";

// Verificación pública: se escribe el código y se abre su ficha. No pide sesión.
const RE = /^CD-\d{4}-[A-HJ-NP-Z2-9]{6}$/;

export default component$(() => {
  const nav = useNavigate();
  const code = useSignal("");
  const err = useSignal("");
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(() => {
    setTitle("Verificar certificado");
  });
  const go = $(async () => {
    const c = code.value.trim().toUpperCase().replace(/\s+/g, "");
    if (!RE.test(c)) {
      err.value = "El código tiene la forma CD-2026-XXXXXX (seis letras o dígitos, sin O, I, 0 ni 1).";
      return;
    }
    err.value = "";
    await nav(`/verificar/${encodeURIComponent(c)}/`);
  });
  return (
    <div class="verify">
      <div class="head">
        <div class="grow">
          <h1>Verificar un certificado</h1>
          <p>Escribe el código impreso en el certificado (también está en su QR) para comprobar que es auténtico y sigue vigente.</p>
        </div>
      </div>
      <form class="card" preventdefault:submit onSubmit$={go}>
        <label for="ver-code">Código del certificado</label>
        <div class="verify-code-field">
          <input
            id="ver-code"
            type="text"
            autoComplete="off"
            spellcheck={false}
            placeholder="CD-2026-7K4MQ2"
            maxLength={14}
            value={code.value}
            aria-invalid={!!err.value}
            aria-describedby="ver-code-h"
            onInput$={(_, el) => {
              code.value = el.value;
              err.value = "";
            }}
          />
          <button type="submit" class="btn">
            <Icon name="shieldCheck" size={14} /> Verificar
          </button>
        </div>
        <div class="hint" id="ver-code-h">
          {err.value ? <span class="bad">{err.value}</span> : "Mayúsculas o minúsculas, da igual."}
        </div>
      </form>
      <p class="verify-note">La ficha muestra el nombre del alumno, el curso, las horas y el emisor; nunca datos de contacto.</p>
    </div>
  );
});

export const head: DocumentHead = { title: "Verificar certificado" };
