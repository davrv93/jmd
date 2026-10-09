import { component$, useStore, useVisibleTask$ } from "@builder.io/qwik";
import { Link, type DocumentHead } from "@builder.io/qwik-city";
import { api, errMsg, KINDS, requireLogin, type LinkItem } from "~/lib/api";

export default component$(() => {
  const st = useStore<{ list: LinkItem[] | null; error: string }>({ list: null, error: "" });
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async () => {
    try {
      st.list = await api.links();
    } catch (e) {
      if (!requireLogin(e)) st.error = errMsg(e);
    }
  });
  const groups: Record<string, LinkItem[]> = {};
  for (const l of st.list ?? []) (groups[l.lesson_title] ??= []).push(l);
  return (
    <>
      <h1>Enlaces publicados</h1>
      <p class="muted">Todo lo que el instructor ha publicado, por sesión: documentación, descargas, repositorios y grabaciones.</p>
      {st.error && <p class="error">{st.error}</p>}
      {st.list === null && !st.error && <p class="muted">Cargando…</p>}
      {Object.entries(groups).map(([title, items]) => (
        <section class="card" key={title}>
          <h2 style="margin-top:0">
            <Link href={`/lessons/${items[0].lesson_id}/`}>{title}</Link>
          </h2>
          <ul class="links">
            {items.map((l) => (
              <li key={l.id}>
                <a href={l.url} target="_blank" rel="noopener">{l.title}</a> <span class="badge">{KINDS[l.kind] ?? l.kind}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
});

export const head: DocumentHead = { title: "Enlaces" };
