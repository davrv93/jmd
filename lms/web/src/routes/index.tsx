import { component$, useContext, useSignal, useStore, useVisibleTask$, $ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import { api, errMsg, type AuthConfig } from "~/lib/api";
import { SessionContext } from "~/lib/session";
import { jmd } from "~/lib/constelacion";

const LETRAS = `<svg class="jmd-svg" viewBox="0 0 560 270" role="img" aria-label="JMD en constelación">${jmd({ x: 12, y: 8, dibujar: true })}</svg>`;

export default component$(() => {
  const session = useContext(SessionContext);
  const cfg = useStore<{ v: AuthConfig | null }>({ v: null });
  const mode = useSignal<"login" | "register">("login");
  const form = useStore({ email: "", name: "", password: "", invite_code: "" });
  const error = useSignal("");
  const busy = useSignal(false);
  const next = useSignal("/courses/");

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async () => {
    const n = new URLSearchParams(location.search).get("next");
    if (n && n.startsWith("/") && !n.startsWith("//")) next.value = n;
    try {
      cfg.v = await api.config();
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

  if (session.loaded && session.me) {
    return (
      <div class="login card">
        <p>
          Ya estás dentro como <b>{session.me.name}</b>.
        </p>
        <a class="btn" href="/courses/">Ir a mis cursos</a>
      </div>
    );
  }

  return (
    <>
    <section class="hero">
      <div dangerouslySetInnerHTML={LETRAS} />
      <h1>Programación <b>agéntica</b></h1>
      <p>Clases, diapositivas, enlaces, ciclo de aprendizaje y tareas del curso. Entra con el usuario y la contraseña que te dio el instructor.</p>
    </section>
    <div class="login" style="margin-top:1rem">
      <div class="card">
        {cfg.v?.oidc && (
          <p>
            <a class="btn" href={`/auth/oidc/start?next=${encodeURIComponent(next.value)}`}>Entrar con mi cuenta (SSO)</a>
          </p>
        )}
        <form preventdefault:submit onSubmit$={submit}>
          {mode.value === "register" && (
            <>
              <label for="name">Nombre</label>
              <input id="name" required minLength={2} value={form.name} onInput$={(_, el) => (form.name = el.value)} />
            </>
          )}
          <label for="email">Usuario (tu correo del curso)</label>
          <input id="email" type="email" required autoComplete="username" value={form.email} onInput$={(_, el) => (form.email = el.value)} />
          <label for="password">Contraseña</label>
          <input id="password" type="password" required minLength={8} autoComplete={mode.value === "login" ? "current-password" : "new-password"} value={form.password} onInput$={(_, el) => (form.password = el.value)} />
          {mode.value === "register" && (
            <>
              <label for="invite">Código de invitación (lo da el instructor)</label>
              <input id="invite" required value={form.invite_code} onInput$={(_, el) => (form.invite_code = el.value)} />
            </>
          )}
          {error.value && <p class="error small">{error.value}</p>}
          <p>
            <button type="submit" disabled={busy.value}>
              {mode.value === "login" ? "Entrar" : "Crear mi cuenta"}
            </button>
          </p>
        </form>
        {cfg.v?.register && (
          <p class="small muted">
            {mode.value === "login" ? (
              <>
                ¿Primera vez? <a href="#" preventdefault:click onClick$={() => (mode.value = "register")}>Regístrate con el código de tu cohorte</a>.
              </>
            ) : (
              <>
                ¿Ya tienes cuenta? <a href="#" preventdefault:click onClick$={() => (mode.value = "login")}>Entrar</a>.
              </>
            )}
          </p>
        )}
        <p class="small muted">
          Desde la terminal: <code>jmd login --sso</code> cuando el SSO esté activo; mientras tanto, el token que devuelve
          <code>POST /api/v1/auth/login</code> sirve como <code>Bearer</code>.
        </p>
      </div>
    </div>
    </>
  );
});

export const head: DocumentHead = { title: "Entrar" };
