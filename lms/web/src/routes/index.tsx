import { component$, useContext, useSignal, useStore, useVisibleTask$, $ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import { api, errMsg, type AuthConfig } from "~/lib/api";
import { SessionContext } from "~/lib/session";
import { jmd } from "~/lib/constelacion";
import { Icon } from "~/components/icon";

const LETRAS = `<svg class="jmd-svg" viewBox="0 0 560 270" role="img" aria-label="JMD en constelación">${jmd({ x: 12, y: 8, dibujar: true })}</svg>`;

export default component$(() => {
  const session = useContext(SessionContext);
  const cfg = useStore<{ v: AuthConfig | null }>({ v: null });
  const mode = useSignal<"login" | "register">("login");
  const local = useSignal(false);
  const form = useStore({ email: "", name: "", password: "", invite_code: "" });
  const error = useSignal("");
  const busy = useSignal(false);
  const next = useSignal("/courses/");

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async ({ track }) => {
    const n = new URLSearchParams(location.search).get("next");
    if (n && n.startsWith("/") && !n.startsWith("//")) next.value = n;
    track(() => session.loaded);
    if (session.loaded && session.me) {
      location.replace(next.value);
      return;
    }
    if (cfg.v) return;
    try {
      cfg.v = await api.config();
      local.value = !cfg.v.oidc;
    } catch (e) {
      error.value = "No se pudo hablar con el servidor: " + errMsg(e);
    }
  });

  const submit = $(async () => {
    error.value = "";
    busy.value = true;
    try {
      const r =
        mode.value === "login"
          ? await api.login(form.email, form.password)
          : await api.register({ email: form.email, name: form.name, password: form.password, invite_code: form.invite_code });
      session.me = r.user;
      location.href = next.value;
    } catch (e) {
      error.value = errMsg(e);
    } finally {
      busy.value = false;
    }
  });

  return (
    <>
      <section class="hero">
        <div dangerouslySetInnerHTML={LETRAS} />
        <h1>Programación <b>agéntica</b></h1>
        <p class="muted">Clases, diapositivas, ejemplos, ciclo de aprendizaje y tareas del curso.</p>
      </section>
      <div class="login">
        <div class="card" style="padding:1.1rem 1.2rem">
          {cfg.v === null && !error.value && <div class="skel" style="height:2.3rem" />}
          {cfg.v?.oidc && (
            <a class="btn" style="width:100%;justify-content:center;padding:.6rem" href={`/auth/oidc/start?next=${encodeURIComponent(next.value)}`}>
              <Icon name="user" size={16} /> Entrar con mi cuenta
            </a>
          )}
          {cfg.v?.oidc && !local.value && (
            <>
              <div class="or">o</div>
              <button type="button" class="btn ghost" style="width:100%;justify-content:center" onClick$={() => (local.value = true)}>
                Entrar con correo y contraseña
              </button>
            </>
          )}
          {local.value && (
            <form preventdefault:submit onSubmit$={submit}>
              {cfg.v?.oidc && <div class="or">o con correo</div>}
              {mode.value === "register" && (
                <>
                  <label for="name">Nombre y apellido</label>
                  <input id="name" required minLength={2} autoComplete="name" value={form.name} onInput$={(_, el) => (form.name = el.value)} />
                </>
              )}
              <label for="email" style={cfg.v?.oidc ? "" : "margin-top:0"}>Correo</label>
              <input id="email" type="email" required autoComplete="username" placeholder="nombre.apellido@jmd-learn.online" value={form.email} onInput$={(_, el) => (form.email = el.value)} />
              <label for="password">Contraseña</label>
              <input id="password" type="password" required minLength={8} autoComplete={mode.value === "login" ? "current-password" : "new-password"} value={form.password} onInput$={(_, el) => (form.password = el.value)} />
              {mode.value === "register" && (
                <>
                  <label for="invite">Código de invitación</label>
                  <input id="invite" required value={form.invite_code} onInput$={(_, el) => (form.invite_code = el.value)} />
                  <div class="hint">Te lo da el instructor.</div>
                </>
              )}
              {error.value && (
                <p class="sm bad row" style="flex-wrap:nowrap" role="alert"><Icon name="alert" /> {error.value}</p>
              )}
              <button type="submit" class="btn" style="width:100%;justify-content:center;margin-top:.9rem" disabled={busy.value}>
                {busy.value ? "Entrando…" : mode.value === "login" ? "Entrar" : "Crear mi cuenta"}
              </button>
            </form>
          )}
          {!local.value && error.value && <p class="sm bad" role="alert">{error.value}</p>}
          {local.value && cfg.v?.register && (
            <p class="xs muted" style="margin:.8rem 0 0;text-align:center">
              {mode.value === "login" ? (
                <>¿Primera vez? <a href="#" preventdefault:click onClick$={() => (mode.value = "register")}>Regístrate con el código de tu cohorte</a></>
              ) : (
                <>¿Ya tienes cuenta? <a href="#" preventdefault:click onClick$={() => (mode.value = "login")}>Entrar</a></>
              )}
            </p>
          )}
        </div>
        <p class="xs faint" style="text-align:center;margin-top:.8rem">
          <Icon name="terminal" size={12} /> Desde la terminal: <code>jmd login --sso --lms https://jmd-learn.online</code>
        </p>
      </div>
    </>
  );
});

export const head: DocumentHead = { title: "Entrar" };
