import { component$, useContext, useSignal, useStore, useVisibleTask$, $ } from "@builder.io/qwik";
import { Link, type DocumentHead } from "@builder.io/qwik-city";
import { api, errMsg, KINDS, requireLogin, type LinkItem } from "~/lib/api";
import { SessionContext } from "~/lib/session";
import { getParam, setParams, setTitle } from "~/lib/url";
import { Icon, KIND_ICON } from "~/components/icon";
import { Chip, Empty, ErrorState, Loading } from "~/components/ui";

const ADJUNTO = new Set(["zip", "file", "pptx"]);

export default component$(() => {
  const session = useContext(SessionContext);
  const st = useStore<{ list: LinkItem[] | null; error: string }>({ list: null, error: "" });
  const q = useSignal("");
  const kind = useSignal("");

  const load = $(async () => {
    st.error = "";
    try {
      st.list = await api.links();
    } catch (e) {
      if (!requireLogin(e)) st.error = errMsg(e);
    }
  });
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async ({ cleanup }) => {
    session.help = "enlaces";
    setTitle("Enlaces");
    q.value = getParam("q");
    kind.value = getParam("tipo");
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
  const kinds = [...new Set(all.map((l) => l.kind))];
  const term = q.value.trim().toLowerCase();
  const shown = all.filter((l) => (!kind.value || l.kind === kind.value) && (!term || `${l.title} ${l.url} ${l.lesson_title}`.toLowerCase().includes(term)));
  const groups: Record<string, LinkItem[]> = {};
  for (const l of shown) (groups[l.lesson_id] ??= []).push(l);

  return (
    <>
      <div class="head">
        <div class="grow">
          <h1>Enlaces</h1>
          <p>Todo lo que el instructor publicó en las sesiones: documentación, descargas, repositorios y grabaciones.</p>
        </div>
      </div>
      {st.error && <ErrorState message={st.error} retry$={load} />}
      {!st.error && st.list === null && <Loading lines={5} />}
      {st.list && (
        <>
          <div class="row" style="margin-bottom:.9rem">
            <span class="field-ico grow" style="min-width:14rem;max-width:26rem">
              <Icon name="search" />
              <input id="buscar" type="search" placeholder="Buscar enlaces  ( / )" value={q.value} onInput$={(_, el) => ((q.value = el.value), setParams({ q: el.value }))} />
            </span>
            <Chip on={!kind.value} onClick$={() => ((kind.value = ""), setParams({ tipo: "" }))}>Todos · {all.length}</Chip>
            {kinds.map((k) => (
              <Chip key={k} on={kind.value === k} onClick$={() => ((kind.value = k), setParams({ tipo: k }))}>
                <Icon name={KIND_ICON[k] ?? "link"} size={13} /> {KINDS[k] ?? k}
              </Chip>
            ))}
          </div>
          {shown.length === 0 ? (
            <Empty icon="search" title="Nada coincide" text="Prueba con otra palabra o quita el filtro de tipo." />
          ) : (
            Object.values(groups).map((items) => (
              <section key={items[0].lesson_id}>
                <div class="section-t">
                  <Icon name="book" /> <Link href={`/lessons/${items[0].lesson_id}/?tab=materiales`} style="color:inherit">{items[0].lesson_title}</Link>
                </div>
                <div class="list">
                  {items.map((l) => (
                    <a key={l.id} class="item" href={l.url} target={ADJUNTO.has(l.kind) ? undefined : "_blank"} rel="noopener" download={ADJUNTO.has(l.kind) || undefined}>
                      <span class="lead-ico"><Icon name={KIND_ICON[l.kind] ?? "link"} /></span>
                      <span class="grow">
                        <div class="t sm">{l.title}</div>
                        <div class="d">{KINDS[l.kind] ?? l.kind} · {l.url.startsWith("/") ? "archivo del curso" : l.url.replace(/^https?:\/\//, "").split("/")[0]}</div>
                      </span>
                      <Icon name={ADJUNTO.has(l.kind) ? "download" : "external"} class="faint" />
                    </a>
                  ))}
                </div>
              </section>
            ))
          )}
        </>
      )}
    </>
  );
});

export const head: DocumentHead = { title: "Enlaces" };
