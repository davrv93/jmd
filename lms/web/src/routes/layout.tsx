import { component$, Slot, useContextProvider, useStore, useVisibleTask$, $ } from "@builder.io/qwik";
import { Link, useLocation } from "@builder.io/qwik-city";
import { api, ApiError } from "~/lib/api";
import { SessionContext, isStaff, type Session } from "~/lib/session";
import { cielo } from "~/lib/constelacion";

// El cielo se calcula una vez (determinista) y va como SVG en línea: sin peticiones ni JS.
const CIELO = cielo({ semilla: 40, estrellas: 110, letras: [{ x: 1060, y: 680, escala: 0.75 }] });

export default component$(() => {
  const session = useStore<Session>({ me: null, loaded: false });
  useContextProvider(SessionContext, session);
  const loc = useLocation();

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async () => {
    try {
      session.me = await api.me();
    } catch (e) {
      if (!(e instanceof ApiError && e.status === 401)) console.error(e);
      session.me = null;
    }
    session.loaded = true;
  });

  const logout = $(async () => {
    try {
      const r = await api.logout();
      session.me = null;
      location.href = r.end_session_url ? r.end_session_url : "/";
    } catch (e) {
      console.error(e);
    }
  });

  const isLogin = loc.url.pathname === "/";
  return (
    <>
      <div class={`cielo${isLogin ? "" : " tenue"}`} dangerouslySetInnerHTML={CIELO} />
      <header class="top">
        <div class="wrap">
          <Link class="brand" href="/courses/"><b>✦ JMD</b> Programación agéntica</Link>
          {session.me && (
            <nav>
              <Link href="/courses/">Cursos</Link>
              <Link href="/links/">Enlaces</Link>
              <Link href="/grades/">Mis notas</Link>
              {isStaff(session.me) && <Link href="/instructor/">Instructor</Link>}
            </nav>
          )}
          <span class="spacer" />
          {session.me ? (
            <span class="user">
              {session.me.name} · <a href="#" preventdefault:click onClick$={logout}>salir</a>
            </span>
          ) : (
            session.loaded && !isLogin && <Link href="/">Entrar</Link>
          )}
        </div>
      </header>
      <main class="wrap">
        <Slot />
      </main>
    </>
  );
});
