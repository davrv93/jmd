import { component$, useContext, useSignal, useStore, useVisibleTask$, $ } from "@builder.io/qwik";
import { Link, type DocumentHead } from "@builder.io/qwik-city";
import { api, errMsg, LEVEL, requireLogin, type ExampleSummary } from "~/lib/api";
import { SessionContext } from "~/lib/session";
import { getParam, setParams, setTitle } from "~/lib/url";
import { Icon } from "~/components/icon";
import { Chip, Empty, ErrorState, Loading } from "~/components/ui";

const NIVELES = ["básico", "intermedio", "avanzado"];

export default component$(() => {
  const session = useContext(SessionContext);
  const st = useStore<{ list: (ExampleSummary & { course: string })[] | null; error: string }>({ list: null, error: "" });
  const q = useSignal("");
  const tag = useSignal("");
  const level = useSignal("");

  const load = $(async () => {
    st.error = "";
    try {
      const courses = await api.courses();
      const per = await Promise.all(courses.map(async (c) => (await api.examples(c.id)).map((e) => ({ ...e, course: c.title }))));
      st.list = per.flat();
    } catch (e) {
      if (!requireLogin(e)) st.error = errMsg(e);
    }
  });
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async ({ cleanup }) => {
    session.help = "ejemplos";
    setTitle("Prácticas");
    q.value = getParam("q");
    tag.value = getParam("tag");
    level.value = getParam("nivel");
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && !(e.target as HTMLElement).closest("input, textarea")) {
        e.preventDefault();
        document.getElementById("buscar")?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    cleanup(() => document.removeEventListener("keydown", onKey));
    await load();
  });

  const all = st.list ?? [];
  const tags = [...new Set(all.flatMap((e) => e.tags))].sort();
  const term = q.value.trim().toLowerCase();
  const shown = all.filter(
    (e) =>
      (!tag.value || e.tags.includes(tag.value)) &&
      (!level.value || e.level === level.value) &&
      (!term || `${e.title} ${e.summary} ${e.tags.join(" ")} ${e.lesson_title}`.toLowerCase().includes(term)),
  );

  return (
    <>
      <div class="head">
        <span class="lead-ico gold" style="width:46px;height:46px"><Icon name="sparkles" size={22} /></span>
        <div class="grow">
          <h1>Prácticas</h1>
          <p>Casos prácticos con código listo para copiar. Cada uno indica la sesión con la que va.</p>
        </div>
      </div>
      {st.error && <ErrorState message={st.error} retry$={load} />}
      {!st.error && st.list === null && <Loading lines={5} />}
      {st.list && (
        <>
          <div class="toolbar" role="search">
            <span class="field-ico grow" style="min-width:14rem;max-width:26rem">
              <Icon name="search" />
              <input id="buscar" type="search" placeholder="Buscar prácticas  ( / )" value={q.value} onInput$={(_, el) => ((q.value = el.value), setParams({ q: el.value }))} />
            </span>
            <Chip on={!level.value} onClick$={() => ((level.value = ""), setParams({ nivel: "" }))}>Todos los niveles</Chip>
            {NIVELES.map((n) => (
              <Chip key={n} on={level.value === n} onClick$={() => ((level.value = level.value === n ? "" : n), setParams({ nivel: level.value }))}>{n}</Chip>
            ))}
          </div>
          {tags.length > 0 && (
            <div class="toolbar" style="margin-top:-.5rem">
              <span class="lbl"><Icon name="tag" size={12} /> Etiquetas</span>
              {tags.map((t) => (
                <Chip key={t} on={tag.value === t} onClick$={() => ((tag.value = tag.value === t ? "" : t), setParams({ tag: tag.value }))}>{t}</Chip>
              ))}
            </div>
          )}
          {all.length === 0 ? (
            <Empty icon="sparkles" title="Todavía no hay prácticas" text="El instructor las irá publicando; aparecerán aquí." />
          ) : shown.length === 0 ? (
            <Empty icon="search" title="Nada coincide" text="Prueba con otra palabra o quita algún filtro." />
          ) : (
            <>
              <div class="section-t" style="margin-top:.4rem"><Icon name="sparkles" /> {shown.length} {shown.length === 1 ? "práctica" : "prácticas"}</div>
              <div class="grid">
                {shown.map((e) => (
                  <Link key={e.id} class="card" href={`/examples/${e.id}/`} style="display:flex;flex-direction:column;gap:.45rem">
                    <div class="row" style="flex-wrap:nowrap">
                      <span class="lead-ico"><Icon name="sparkles" /></span>
                      <b class="grow">{e.title}</b>
                      {!e.published && <span class="badge warn"><Icon name="lock" size={11} /></span>}
                    </div>
                    <p class="sm muted" style="margin:0;flex:1">{e.summary}</p>
                    <div class="row">
                      <span class={`badge ${LEVEL[e.level] ?? ""}`}>{e.level}</span>
                      {e.tags.map((t) => (
                        <span key={t} class="badge">{t}</span>
                      ))}
                    </div>
                    {e.lesson_title && <div class="xs faint"><Icon name="book" size={12} /> {e.lesson_title}</div>}
                  </Link>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </>
  );
});

export const head: DocumentHead = { title: "Prácticas" };
