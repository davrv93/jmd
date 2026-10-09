import { component$, useSignal, useStore, useVisibleTask$ } from "@builder.io/qwik";
import { api, ApiError } from "~/lib/api";

// Markdown ya convertido a HTML. Al montarse: ids en los títulos (índice y enlaces), botón de
// copiar en cada bloque, y un laboratorio en los bloques de código: el alumno puede tipear y,
// según el lenguaje, ejecutar (Python, Node, Bash, Go) o previsualizar (HTML/CSS) el resultado.

function slug(t: string): string {
  return t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// Lenguaje del bloque: la clase que deja el resaltador (language-python) o el primer renglón.
function langOf(code: HTMLElement | null): string {
  const cls = code?.className ?? "";
  const m = /language-([a-z0-9+#]+)/i.exec(cls);
  if (m) return m[1].toLowerCase();
  const first = (code?.textContent ?? "").trim().split("\n")[0];
  return /^[a-z0-9+#]+$/i.test(first) ? first.toLowerCase() : "";
}

const SERVER_RUN: Record<string, string> = { python: "python", python3: "python", py: "python", node: "node", js: "node", javascript: "node", nodejs: "node", bash: "bash", sh: "bash", shell: "bash", go: "go", golang: "go" };
const PREVIEW = new Set(["html", "css"]);

export const Prose = component$((props: { html: string; toc?: boolean }) => {
  const ref = useSignal<HTMLElement>();
  const toc = useStore<{ items: { id: string; text: string; level: number }[] }>({ items: [] });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ track }) => {
    track(() => props.html);
    const el = ref.value;
    if (!el) return;
    const items: { id: string; text: string; level: number }[] = [];
    const seen = new Set<string>();
    el.querySelectorAll("h2, h3").forEach((h) => {
      let id = slug(h.textContent ?? "") || "seccion";
      while (seen.has(id)) id += "-";
      seen.add(id);
      h.id = id;
      items.push({ id, text: h.textContent ?? "", level: h.tagName === "H2" ? 2 : 3 });
    });
    toc.items = items;
    el.querySelectorAll("pre").forEach((pre) => {
      if ((pre as HTMLElement).dataset.lab === "1") return;
      const codeEl = pre.querySelector("code");
      const raw = codeEl?.textContent ?? pre.textContent ?? "";
      const lang = langOf(codeEl);
      (pre as HTMLElement).dataset.lab = "1";
      pre.replaceWith(lab(raw, lang));
    });
    const h = location.hash.slice(1);
    if (h) document.getElementById(h)?.scrollIntoView();
  });

  if (!props.toc) return <div ref={ref} class="prose" dangerouslySetInnerHTML={props.html} />;
  return (
    <div class="split">
      <div ref={ref} class="prose" dangerouslySetInnerHTML={props.html} />
      {toc.items.length > 2 && (
        <nav class="toc" aria-label="En esta página">
          <div class="section-t" style="margin-top:0">En esta página</div>
          {toc.items
            .filter((t) => t.level === 2)
            .map((t) => (
              <a key={t.id} href={`#${t.id}`}>{t.text}</a>
            ))}
        </nav>
      )}
    </div>
  );
});

function copyTo(text: string, btn: HTMLElement) {
  const label = btn.textContent;
  navigator.clipboard?.writeText(text).then(
    () => {
      btn.textContent = "Copiado ✓";
      setTimeout(() => (btn.textContent = label), 1300);
    },
    () => { /* sin portapapeles */ },
  );
}

// Laboratorio: código visible y copiable; un botón abre el editor para tipear y ejecutar/ver.
function lab(code: string, lang: string): HTMLElement {
  const serverLang = SERVER_RUN[lang];
  const preview = PREVIEW.has(lang);

  const wrap = document.createElement("div");
  wrap.className = "lab";

  const ta = document.createElement("textarea");
  ta.className = "lab__edit";
  ta.value = code;
  ta.spellcheck = false;
  ta.hidden = true;
  ta.setAttribute("aria-label", `Editar código ${lang}`);
  ta.rows = Math.min(24, Math.max(3, code.split("\n").length + 1));

  let frame: HTMLIFrameElement | null = null;
  let out: HTMLPreElement | null = null;
  let runBtn: HTMLButtonElement | null = null;

  const show = document.createElement("pre");
  show.className = "lab__show";
  const showCode = document.createElement("code");
  showCode.className = `language-${lang}`;
  showCode.textContent = code;
  show.appendChild(showCode);

  const bar = document.createElement("div");
  bar.className = "lab__bar";
  const tag = document.createElement("span");
  tag.className = "lang";
  tag.textContent = lang;
  bar.appendChild(tag);
  bar.appendChild(document.createElement("span")).className = "grow";

  const copyBtn = document.createElement("button");
  copyBtn.type = "button";
  copyBtn.className = "lab__reset";
  copyBtn.textContent = "Copiar";
  copyBtn.onclick = () => copyTo(ta.value, copyBtn);
  bar.appendChild(copyBtn);

  let main: HTMLButtonElement | null = null;
  if (serverLang || preview) {
    main = document.createElement("button");
    main.type = "button";
    main.className = "lab__run";
    main.textContent = serverLang ? "Probar" : "Ver";
    bar.appendChild(main);
  }
  wrap.appendChild(bar);

  const reset = document.createElement("button");
  reset.type = "button";
  reset.className = "lab__reset";
  reset.textContent = "Reiniciar";
  reset.hidden = true;
  reset.onclick = () => {
    ta.value = code;
    if (frame) render();
  };
  bar.insertBefore(reset, main);
  wrap.appendChild(show);

  if (preview) {
    frame = document.createElement("iframe");
    frame.className = "lab__prev";
    frame.hidden = true;
    frame.setAttribute("sandbox", "allow-scripts allow-modals");
    frame.setAttribute("title", "Vista previa");
    frame.setAttribute("loading", "lazy");
    wrap.appendChild(frame);
  } else if (serverLang) {
    out = document.createElement("pre");
    out.className = "lab__out";
    out.hidden = true;
    out.textContent = "";
    wrap.appendChild(out);
  }
  wrap.appendChild(ta);
  const hint = document.createElement("div");
  hint.className = "lab__hint";
  hint.hidden = true;
  hint.style.padding = ".4rem .8rem";
  hint.textContent = preview
    ? "La vista se actualiza al escribir. El código corre aislado en un iframe."
    : serverLang
      ? "El código corre aislado en el servidor (sin red). Puedes editarlo antes de ejecutar."
      : "";
  wrap.appendChild(hint);

  function render() {
    if (!frame) return;
    frame.srcdoc = lang === "css"
      ? `<!doctype html><meta charset="utf-8"><style>body{font:16px system-ui;padding:1rem}${ta.value}</style><h1>Hola</h1><p>Un párrafo de ejemplo con <a href="#">un enlace</a>.</p><button>Botón</button>`
      : ta.value;
  }

  async function ejecutar() {
    if (!runBtn) return;
    runBtn.disabled = true;
    out!.className = "lab__out";
    out!.textContent = "Ejecutando…";
    try {
      const r = await api.run(serverLang!, ta.value);
      const meta = `salida ${r.exit_code} · ${r.duration_ms} ms${r.timed_out ? " · tiempo agotado" : ""}`;
      const body = [r.stdout, r.stderr && "—— stderr ——\n" + r.stderr].filter(Boolean).join("\n");
      out!.textContent = `${meta}\n\n${body || "(sin salida)"}`;
      if (r.exit_code !== 0 || r.timed_out) out!.className = "lab__out err";
    } catch (e) {
      out!.className = "lab__out err";
      out!.textContent = e instanceof ApiError && e.status === 503
        ? "El runner de código no está activo en este servidor."
        : e instanceof Error ? e.message : String(e);
    } finally {
      runBtn.disabled = false;
    }
  }
  if (serverLang) {
    runBtn = document.createElement("button");
    runBtn.type = "button";
    runBtn.className = "lab__run";
    runBtn.textContent = "Ejecutar";
    runBtn.hidden = true;
    runBtn.onclick = ejecutar;
    bar.appendChild(runBtn);
  }

  if (main) {
    main.onclick = () => {
      show.hidden = true;
      ta.hidden = false;
      reset.hidden = false;
      hint.hidden = false;
      main!.hidden = true;
      if (preview) {
        frame!.hidden = false;
        render();
      } else if (runBtn && out) {
        runBtn.hidden = false;
        out.hidden = false;
        void ejecutar();
      }
    };
  }

  return wrap;
}
