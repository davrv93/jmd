import { component$, useContext, useSignal, useStore, useVisibleTask$, $ } from "@builder.io/qwik";
import { useLocation, type DocumentHead, type StaticGenerateHandler } from "@builder.io/qwik-city";
import { api, ApiError, errMsg, type Inscripcion, type SorteoAviso } from "~/lib/api";
import { SessionContext } from "~/lib/session";
import { getParam, pathId, setTitle } from "~/lib/url";
import { Icon } from "~/components/icon";
import { ErrorState, Loading } from "~/components/ui";

// Inscripción por enlace (/inscripcion/<grupo>/): nombre completo, correo y contraseña crean la cuenta
// ya dentro del grupo. Quien ya tiene cuenta entra y pulsa «Unirme». No pide código: el enlace es la
// invitación y el servidor solo lo acepta para los grupos con la inscripción abierta.

const FECHA = new Intl.DateTimeFormat("es-PE", { weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit", timeZone: "America/Lima" });

export default component$(() => {
  const loc = useLocation();
  const session = useContext(SessionContext);
  const st = useStore<{ info: Inscripcion | null; error: string; grupo: string }>({ info: null, error: "", grupo: "" });
  const form = useStore({ name: "", email: "", password: "" });
  const error = useSignal("");
  const yaTiene = useSignal(false);
  const busy = useSignal(false);
  // Si el curso tiene sorteo, el cupo queda jugado AHÍ MISMO con el número
  // aleatorio: primero se muestra el número y recién después se entra al curso.
  const sorteoAviso = useSignal<SorteoAviso | null>(null);
  const cursosPend = useSignal<string[]>([]);

  // Enlaces personalizados: /inscripcion/<grupo>/?nombre=Ana+Torres&correo=ana@x.com
  // (lo que reparte el instructor; el alumno solo confirma y crea su clave).
  // getParam() lee de `location`: en estas rutas loc.url devuelve la plantilla.
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(() => {
    const nombre = getParam("nombre").trim();
    const correo = getParam("correo").trim();
    if (nombre && !form.name) form.name = nombre;
    if (correo && !form.email) form.email = correo;
  });

  const load = $(async () => {
    st.error = "";
    st.grupo = pathId("inscripcion");
    try {
      st.info = await api.inscripcion(st.grupo);
      setTitle(`Inscripción · ${st.info.nombre}`);
    } catch (e) {
      st.error = e instanceof ApiError && e.status === 404 ? "Esta inscripción está cerrada o el enlace no es correcto. Pide el enlace actualizado a tu instructor." : errMsg(e);
    }
  });
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async ({ track }) => {
    track(() => loc.url.pathname);
    await load();
  });

  const irAlCurso = $((cursos: string[]) => {
    location.href = cursos.length ? `/courses/${encodeURIComponent(cursos[0])}/` : "/courses/";
  });

  const inscribirme = $(async () => {
    error.value = "";
    yaTiene.value = false;
    busy.value = true;
    try {
      const r = await api.inscribirse(st.grupo, { name: form.name, email: form.email, password: form.password });
      session.me = r.user;
      if (r.sorteo) {
        sorteoAviso.value = r.sorteo;
        cursosPend.value = r.cursos;
      } else {
        await irAlCurso(r.cursos);
      }
    } catch (e) {
      yaTiene.value = e instanceof ApiError && e.code === "ya_registrado";
      error.value = errMsg(e);
    } finally {
      busy.value = false;
    }
  });

  const unirme = $(async () => {
    error.value = "";
    busy.value = true;
    try {
      const r = await api.unirse(st.grupo);
      if (session.me) session.me = { ...session.me, cohorts: r.cohorts };
      if (r.sorteo) {
        sorteoAviso.value = r.sorteo;
        cursosPend.value = r.cursos;
      } else {
        await irAlCurso(r.cursos);
      }
    } catch (e) {
      error.value = errMsg(e);
    } finally {
      busy.value = false;
    }
  });

  if (st.error) return <ErrorState message={st.error} retry$={load} />;
  if (!st.info || !session.loaded) return <Loading lines={6} />;
  const info = st.info;
  const me = session.me;
  const dentro = !!me && me.cohorts.includes(info.grupo);
  const curso = info.cursos[0];
  const entrar = `/?next=${encodeURIComponent(`/inscripcion/${info.grupo}/`)}`;

  const titulo = curso.title.split(" · ");
  return (
    <div class="hte">
      <section class="hte-hero">
        <p class="hte-eyebrow">Inscripción · {info.nombre}</p>
        <h1 class="hte-title">{titulo[0]} {titulo.length > 1 && <span class="neon">!</span>}</h1>
        {titulo.length > 1 && <p class="hte-sub">{titulo.slice(1).join(" · ")}</p>}
        {curso.description && <p class="hte-desc">{curso.description}</p>}
        {curso.fechas.length > 0 && (
          <ul class="hte-fechas">
            {curso.fechas.map((f, i) => (
              <li key={f}>
                <Icon name="calendar" size={13} /> Clase {i + 1}: {FECHA.format(new Date(f))}
              </li>
            ))}
          </ul>
        )}
      </section>
      <div class="login">
        <div class="card" style="padding:1.1rem 1.2rem">
          {sorteoAviso.value ? (
            <div style={{ margin: 0 }}>
              <p class="sm" style={{ marginTop: 0 }}>
                {sorteoAviso.value.ganador
                  ? <>¡Ganaste el sorteo del <b>{sorteoAviso.value.titulo}</b>! Tu cupo ya está en esta cuenta.</>
                  : <>¡Listo! Te anotaste en el sorteo con tu cupo del <b>{sorteoAviso.value.titulo}</b>.</>}
              </p>
              <div style={{ border: "1.5px dashed var(--line, #dde4ec)", borderRadius: 12, padding: ".9rem 1rem", margin: ".6rem 0", textAlign: "center" }}>
                <p class="xs muted" style={{ margin: 0, letterSpacing: ".14em", textTransform: "uppercase" }}>Tu número de sorteo</p>
                <p style={{ margin: ".25rem 0 0", fontSize: "2.6rem", fontWeight: 800, lineHeight: 1 }}>{sorteoAviso.value.numero}</p>
                {sorteoAviso.value.codigo && (
                  <p style={{ margin: ".5rem 0 0" }}>Código de tu ticket: <code style="font-size:1.05rem;font-weight:700">{sorteoAviso.value.codigo}</code></p>
                )}
                <p class="xs muted" style={{ margin: ".35rem 0 0" }}>Se fijaron al anotarte y no cambian: si ganas, es tu número.</p>
              </div>
              <button type="button" class="btn" style={{ width: "100%", justifyContent: "center" }} onClick$={() => irAlCurso(cursosPend.value)}>
                Ir al curso
              </button>
            </div>
          ) : dentro ? (
            <>
              <p style="margin-top:0">
                Ya estás en el <b>{info.nombre}</b>, {me!.name.split(" ")[0]}.
              </p>
              <button type="button" class="btn" style="width:100%;justify-content:center" onClick$={() => irAlCurso(info.cursos.map((c) => c.slug || c.id))}>
                Ir al curso
              </button>
            </>
          ) : me ? (
            <>
              <p style="margin-top:0">
                Entraste como <b>{me.name}</b> ({me.email}). Súmate al <b>{info.nombre}</b> con tu misma cuenta: no pierdes lo que ya tenías.
              </p>
              {error.value && (
                <p class="sm bad row" style="flex-wrap:nowrap" role="alert"><Icon name="alert" /> {error.value}</p>
              )}
              <button type="button" class="btn" style="width:100%;justify-content:center" disabled={busy.value} onClick$={unirme}>
                {busy.value ? "Uniéndote…" : `Unirme al ${info.nombre}`}
              </button>
            </>
          ) : (
            <form preventdefault:submit onSubmit$={inscribirme}>
              <label for="name" style="margin-top:0">Nombre completo</label>
              <input id="name" required minLength={5} maxLength={80} autoComplete="name" placeholder="Nombres y apellidos" value={form.name} onInput$={(_, el) => (form.name = el.value)} />
              <div class="hint">Así saldrá en tu certificado.</div>
              <label for="email">Correo</label>
              <input id="email" type="email" required autoComplete="email" value={form.email} onInput$={(_, el) => (form.email = el.value)} />
              <label for="password">Crea una contraseña</label>
              <input id="password" type="password" required minLength={8} autoComplete="new-password" value={form.password} onInput$={(_, el) => (form.password = el.value)} />
              <div class="hint">Mínimo 8 caracteres. La usarás para entrar a las clases.</div>
              {error.value && (
                <p class="sm bad row" style="flex-wrap:nowrap" role="alert"><Icon name="alert" /> {error.value}</p>
              )}
              {yaTiene.value && (
                <a class="btn ghost" style="width:100%;justify-content:center;margin-top:.5rem" href={entrar}>
                  Entrar con mi cuenta
                </a>
              )}
              <button type="submit" class="btn" style="width:100%;justify-content:center;margin-top:.9rem" disabled={busy.value}>
                {busy.value ? "Inscribiendo…" : "Inscribirme"}
              </button>
            </form>
          )}
        </div>
        {!me && (
          <p class="xs muted" style="text-align:center;margin-top:.8rem">
            ¿Ya tienes cuenta de un curso anterior? <a href={entrar}>Entra con ella</a> y te sumas al {info.nombre}.
          </p>
        )}
      </div>
    </div>
  );
});

export const onStaticGenerate: StaticGenerateHandler = async () => ({ params: [{ grupo: "_" }] });

export const head: DocumentHead = { title: "Inscripción" };
