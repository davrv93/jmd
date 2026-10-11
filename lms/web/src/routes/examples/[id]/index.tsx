import { component$, useContext, useStore, useVisibleTask$, $ } from "@builder.io/qwik";
import { Link, useLocation, type DocumentHead, type StaticGenerateHandler } from "@builder.io/qwik-city";
import { api, errMsg, LEVEL, requireLogin, type Example } from "~/lib/api";
import { SessionContext } from "~/lib/session";
import { pathId, setTitle } from "~/lib/url";
import { PHASE_BY_ID } from "~/lib/kolb";
import { Icon } from "~/components/icon";
import { Crumbs, ErrorState, Loading } from "~/components/ui";
import { Prose } from "~/components/prose";

export default component$(() => {
  const loc = useLocation();
  const session = useContext(SessionContext);
  const st = useStore<{ e: Example | null; error: string }>({ e: null, error: "" });
  const load = $(async () => {
    st.error = "";
    st.e = null;
    try {
      st.e = await api.example(pathId("examples"));
      setTitle(st.e.title);
    } catch (e) {
      if (!requireLogin(e)) st.error = errMsg(e);
    }
  });
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async ({ track }) => {
    track(() => loc.url.pathname);
    session.help = "ejemplos";
    await load();
  });

  if (st.error) return <ErrorState message={st.error} retry$={load} />;
  const e = st.e;
  if (!e) return <Loading lines={6} />;
  return (
    <>
      <Crumbs items={[{ href: "/examples/", label: "Prácticas" }, { label: e.title }]} />
      <div class="head">
        <span class="lead-ico" style="width:46px;height:46px"><Icon name="sparkles" size={22} /></span>
        <div class="grow">
          <h1>{e.title}</h1>
          <p>{e.summary}</p>
          <div class="row" style="margin-top:.5rem">
            {e.phase && PHASE_BY_ID[e.phase] && (
              <span class="badge ph" data-ph={PHASE_BY_ID[e.phase].token}>
                <Icon name={PHASE_BY_ID[e.phase].icon} size={11} /> {PHASE_BY_ID[e.phase].short}
              </span>
            )}
            <span class={`badge ${LEVEL[e.level] ?? ""}`}>{e.level}</span>
            {e.tags.map((t) => (
              <Link key={t} class="badge" href={`/examples/?tag=${encodeURIComponent(t)}`}><Icon name="tag" size={11} /> {t}</Link>
            ))}
            {e.lesson_id && <Link class="badge accent" href={`/lessons/${e.lesson_id}/`}><Icon name="book" size={11} /> {e.lesson_title}</Link>}
          </div>
        </div>
        {e.repo && (
          <a class="btn ghost sm" href={e.repo.url} target="_blank" rel="noopener"><Icon name="git" size={14} /> Ver repositorio</a>
        )}
      </div>
      <Prose html={e.content_html} toc />
      <div class="row" style="margin-top:2rem;padding-top:1rem;border-top:1px solid var(--line)">
        {e.prev ? <Link class="btn ghost sm" href={`/examples/${e.prev}/`}><Icon name="chevronLeft" size={14} /> Anterior</Link> : <span />}
        <span class="grow" />
        {e.next && <Link class="btn ghost sm" href={`/examples/${e.next}/`}>Siguiente <Icon name="chevronRight" size={14} /></Link>}
      </div>
    </>
  );
});

export const onStaticGenerate: StaticGenerateHandler = async () => ({ params: [{ id: "_" }] });

export const head: DocumentHead = { title: "Práctica" };
