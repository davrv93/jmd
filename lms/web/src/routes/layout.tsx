import { component$, Fragment, Slot, useContextProvider, useSignal, useStore, useVisibleTask$, $ } from "@builder.io/qwik";
import { Link, useLocation, useNavigate } from "@builder.io/qwik-city";
import { api, ApiError } from "~/lib/api";
import { SessionContext, initials, isStaff, type Session } from "~/lib/session";
import { HELP, SHORTCUTS } from "~/lib/help";
import { PHASES } from "~/lib/kolb";
import { cielo } from "~/lib/constelacion";
import { Icon } from "~/components/icon";

// El cielo se calcula una vez (determinista) y va como SVG en línea: sin peticiones ni JS.
// Polvo de estrellas en la paleta, constelaciones sueltas, dos libros abiertos y las letras JMD
// grandes pero tenues en la esquina inferior derecha. Menos de 400 nodos en total.
const CIELO = cielo({
  semilla: 41,
  estrellas: 190,
  constelaciones: 7,
  libros: [
    { x: 250, y: 800, escala: 1.35, rot: -8 },
    { x: 1250, y: 120, escala: 0.95, rot: 5 },
  ],
  letras: [{ x: 800, y: 680, escala: 1.2, clase: "jmd-fondo" }],
});

type Tema = "auto" | "light" | "dark";
const TEMAS: { id: Tema; label: string; icon: string }[] = [
  { id: "light", label: "Claro", icon: "sun" },
  { id: "dark", label: "Oscuro", icon: "moon" },
  { id: "auto", label: "Auto", icon: "monitor" },
];
const MARCA = `<svg class="mark" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 1.5 14.1 9.9 22.5 12 14.1 14.1 12 22.5 9.9 14.1 1.5 12 9.9 9.9z"/></svg>`;

// Navegación principal: aprender primero, después las herramientas y el cierre.
const NAV = [
  { href: "/courses/", label: "Aprender", icon: "home", match: ["/courses/", "/lessons/"] },
  { href: "/examples/", label: "Prácticas", icon: "sparkles", match: ["/examples/"] },
  { href: "/links/", label: "Recursos", icon: "link", match: ["/links/"] },
  { href: "/studio/", label: "Estudio", icon: "wand", match: ["/studio/"] },
  { href: "/grades/", label: "Notas", icon: "award", match: ["/grades/", "/assignments/"] },
];

export default component$(() => {
  const session = useStore<Session>({ me: null, loaded: false, help: "", helpOpen: false, toasts: [] });
  useContextProvider(SessionContext, session);
  const loc = useLocation();
  const nav = useNavigate();
  const menu = useSignal(false);
  const tema = useSignal<Tema>("auto");

  // Tema guardado por el usuario (root.tsx ya lo aplicó antes de pintar; aquí solo se lee).
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(() => {
    try {
      const t = localStorage.getItem("lms.tema");
      if (t === "dark" || t === "light") tema.value = t;
    } catch {
      /* sin almacenamiento: queda en auto */
    }
  });

  const setTema = $((t: Tema) => {
    tema.value = t;
    if (t === "auto") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", t);
    try {
      if (t === "auto") localStorage.removeItem("lms.tema");
      else localStorage.setItem("lms.tema", t);
    } catch {
      /* sin almacenamiento: el tema dura la sesión */
    }
  });

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

  // Atajos de teclado globales: ? ayuda, g i / g e / g n navegar, Esc cierra.
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ cleanup }) => {
    let g = 0;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select, [contenteditable]") || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Escape") {
        session.helpOpen = false;
        menu.value = false;
        return;
      }
      if (e.key === "?") {
        session.helpOpen = !session.helpOpen;
        e.preventDefault();
        return;
      }
      if (e.key === "g") {
        g = Date.now();
        return;
      }
      if (Date.now() - g < 1200) {
        const to = { i: "/courses/", e: "/examples/", n: "/grades/", l: "/links/" }[e.key];
        if (to) nav(to);
        g = 0;
      }
    };
    document.addEventListener("keydown", onKey);
    cleanup(() => document.removeEventListener("keydown", onKey));
  });

  // En móvil la navegación se desplaza en horizontal: la pestaña activa queda a la vista.
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ track }) => {
    track(() => loc.url.pathname);
    track(() => session.me);
    const nav = document.querySelector<HTMLElement>(".nav");
    const on = nav?.querySelector<HTMLElement>("a.on");
    if (nav && on && nav.scrollWidth > nav.clientWidth) nav.scrollLeft = Math.max(0, on.offsetLeft - (nav.clientWidth - on.offsetWidth) / 2);
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

  const path = loc.url.pathname;
  const isLogin = path === "/";
  const help = HELP[session.help];
  const me = session.me;

  return (
    <>
      <div class={`cielo${isLogin ? "" : " tenue"}`} dangerouslySetInnerHTML={CIELO} />
      <header class="top">
        <div class="in">
          <Link class="brand" href={me ? "/courses/" : "/"}>
            <span style="display:inline-flex" dangerouslySetInnerHTML={MARCA} />
            <span>
              JMD <small>Programación agéntica</small>
            </span>
          </Link>
          {me && (
            <nav class="nav" aria-label="Principal">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} class={n.match.some((m) => path.startsWith(m)) ? "on" : ""}>
                  <Icon name={n.icon} size={15} />
                  {n.label}
                </Link>
              ))}
              {isStaff(me) && (
                <Link href="/instructor/" class={path.startsWith("/instructor/") ? "on" : ""}>
                  <Icon name="users" size={15} />
                  Instructor
                </Link>
              )}
            </nav>
          )}
          <span class="grow" />
          {me && (
            <button type="button" class="icon-btn" title="Ayuda (?)" aria-label="Ayuda" onClick$={() => (session.helpOpen = !session.helpOpen)}>
              <Icon name="help" size={18} />
            </button>
          )}
          {me ? (
            <span style="position:relative">
              <button type="button" class="avatar" aria-label="Mi cuenta" aria-expanded={menu.value} onClick$={() => (menu.value = !menu.value)}>
                {initials(me.name)}
              </button>
              {menu.value && (
                <div class="menu-pop">
                  <div class="who">
                    <b>{me.name}</b>
                    <div class="xs muted">{me.email}</div>
                    <div class="row" style="margin-top:.35rem">
                      {me.roles.map((r) => (
                        <span key={r} class="badge accent">{r === "student" ? "alumno" : r}</span>
                      ))}
                      {me.cohorts.map((c) => (
                        <span key={c} class="badge">{c}</span>
                      ))}
                    </div>
                  </div>
                  <Link href="/grades/" onClick$={() => (menu.value = false)}><Icon name="award" /> Mis notas</Link>
                  <button type="button" onClick$={() => ((session.helpOpen = true), (menu.value = false))}><Icon name="keyboard" /> Ayuda y atajos</button>
                  <button type="button" onClick$={() => ((menu.value = false), logout())}><Icon name="logout" /> Salir</button>
                  <div class="tema" role="group" aria-label="Tema de la interfaz">
                    <span class="lbl" id="tema-lbl">Tema</span>
                    <div class="tema-seg" aria-labelledby="tema-lbl">
                      {TEMAS.map((t) => (
                        <button key={t.id} type="button" aria-pressed={tema.value === t.id} onClick$={() => setTema(t.id)}>
                          <Icon name={t.icon} size={14} /> {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </span>
          ) : (
            session.loaded && !isLogin && <Link class="btn sm" href="/">Entrar</Link>
          )}
        </div>
      </header>
      <main class="page">
        <Slot />
      </main>

      {session.helpOpen && (
        <>
          <div class="drawer-bg" onClick$={() => (session.helpOpen = false)} />
          <aside class="drawer" role="dialog" aria-label="Ayuda">
            <div class="row">
              <h2 class="grow" style="margin:0"><Icon name="help" size={18} /> Ayuda{help ? ` · ${help.title}` : ""}</h2>
              <button type="button" class="icon-btn" aria-label="Cerrar" onClick$={() => (session.helpOpen = false)}><Icon name="x" /></button>
            </div>
            {help && (
              <ul>
                {help.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            )}
            <div class="section-t"><Icon name="cycle" /> Ciclo de aprendizaje (Kolb)</div>
            <p class="sm muted" style="margin:.2rem 0 .5rem">
              Cada sesión se recorre en cuatro fases. Marca cada paso al terminarlo y tu avance queda guardado.
            </p>
            <div class="cycle-legend" style="padding-left:.1rem">
              {PHASES.map((p) => (
                <span key={p.id} data-ph={p.token}>
                  <i />
                  <span class="ct"><b>{p.n}. {p.short}</b> · {p.verb}</span>
                </span>
              ))}
            </div>
            <div class="section-t"><Icon name="keyboard" /> Atajos</div>
            <div class="keys">
              {SHORTCUTS.map(([k, d]) => (
                <Fragment key={k}>
                  <span>{k.split(" ").map((x) => <kbd key={x} style="margin-right:.2rem">{x}</kbd>)}</span>
                  <span class="muted">{d}</span>
                </Fragment>
              ))}
            </div>
            <div class="section-t"><Icon name="terminal" /> Desde la terminal</div>
            <p class="sm muted">
              Todo el curso funciona también con <code>jmd</code>: <code>jmd login --sso --lms https://jmd-learn.online</code>, luego{" "}
              <code>jmd lesson pa-01</code>, <code>jmd ask</code>, <code>jmd submit</code> y <code>jmd grades</code>.
            </p>
            <div class="section-t"><Icon name="chat" /> ¿Sigues con dudas?</div>
            <p class="sm muted">Publica tu pregunta en la pestaña «Preguntas» de la sesión, con el error completo.</p>
          </aside>
        </>
      )}

      <div class="toasts" aria-live="polite">
        {session.toasts.map((t) => (
          <div key={t.id} class={`toast ${t.kind}`}>
            <Icon name={t.kind === "ok" ? "checkCircle" : t.kind === "bad" ? "alert" : "info"} size={17} />
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </>
  );
});
