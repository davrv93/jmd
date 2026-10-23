import { component$, useContext, useSignal, useStore, useVisibleTask$, $ } from "@builder.io/qwik";
import { useLocation, type DocumentHead, type StaticGenerateHandler } from "@builder.io/qwik-city";
import { api, ApiError, errMsg, type Sorteo } from "~/lib/api";
import { SessionContext } from "~/lib/session";
import { pathId, setTitle } from "~/lib/url";
import { Icon } from "~/components/icon";
import { ErrorState, Loading } from "~/components/ui";

// Sorteo de cupos (/sorteo/<id>/): flyer del taller nuevo + formulario con el
// correo de registro. Ganan 6 personas como máximo en la ventana; al sortear,
// cada ganador entra solo a la cohorte del premio.

export default component$(() => {
  const loc = useLocation();
  const session = useContext(SessionContext);
  const st = useStore<{ info: Sorteo | null; error: string }>({ info: null, error: "" });
  const email = useSignal("");
  const msg = useSignal("");
  const mal = useSignal(false);
  const busy = useSignal(false);
  const ya = useSignal(false);

  const load = $(async () => {
    st.error = "";
    msg.value = "";
    try {
      st.info = await api.sorteo(pathId("sorteo"));
      setTitle(`Sorteo · ${st.info.titulo}`);
    } catch (e) {
      st.error = e instanceof ApiError && e.status === 404 ? "Este sorteo no existe." : errMsg(e);
    }
  });
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async ({ track }) => {
    track(() => loc.url.pathname);
    await load();
  });

  const participar = $(async () => {
    msg.value = "";
    mal.value = false;
    ya.value = false;
    busy.value = true;
    try {
      const r = await api.participarSorteo(pathId("sorteo"), email.value.trim());
      ya.value = true;
      if (st.info) st.info = { ...st.info, participantes: r.participantes };
      msg.value = "¡Listo! Ya estás participando con ese correo. Guarda esta página para ver a los ganadores.";
    } catch (e) {
      mal.value = true;
      msg.value = errMsg(e);
    } finally {
      busy.value = false;
    }
  });

  const sortear = $(async () => {
    msg.value = "";
    mal.value = false;
    busy.value = true;
    try {
      const r = await api.sortear(pathId("sorteo"));
      await load();
      msg.value = r.ganadores.length ? `Salieron ${r.ganadores.length} ganador(es) y ya entraron al curso.` : "Sin candidatos nuevos.";
    } catch (e) {
      mal.value = true;
      msg.value = errMsg(e);
    } finally {
      busy.value = false;
    }
  });

  if (st.error) return <ErrorState message={st.error} retry$={load} />;
  if (!st.info || !session.loaded) return <Loading lines={6} />;
  const info = st.info;
  const soyStaff = !!session.me && session.me.roles.some((x) => x === "admin" || x === "instructor");

  return (
    <div class="hte">
      <section class="hte-hero">
        <p class="hte-eyebrow">Sorteo · {info.quedan > 0 ? `quedan ${info.quedan} de ${info.max_ganadores}` : "completo"}</p>
        <h1 class="hte-title">{info.titulo}</h1>
        <p class="hte-sub">{info.subtitulo}</p>
        <p class="hte-desc">{info.descripcion}</p>
        <p class="hte-fechas">Del {info.inicia} al {info.termina} · {info.participantes} participando</p>
      </section>
      <div class="login">
        <div class="card" style="padding:1.1rem 1.2rem">
          <img src={info.flyer} alt={`Flyer: ${info.titulo}`} style="width:100%;border-radius:12px;display:block;margin-bottom:1rem" loading="lazy" />
          {ya.value ? (
            <p class="sm" role="status" style="margin-top:0">
              ¡Ya estás dentro! Comparte el sorteo; los ganadores salen aquí mismo.
            </p>
          ) : info.abierto ? (
            <form preventdefault:submit onSubmit$={participar}>
              <label for="sorteo-email">Correo con el que te registraste al curso</label>
              <input
                id="sorteo-email"
                type="email"
                required
                autoComplete="email"
                placeholder="tucorreo@ejemplo.com"
                value={email.value}
                onInput$={(_, el) => (email.value = el.value)}
              />
              <div class="hint">Uno por correo: si ya participas, te lo decimos.</div>
              {msg.value && (
                <p class={`sm row ${mal.value ? "bad" : ""}`} style="flex-wrap:nowrap" role={mal.value ? "alert" : "status"}>
                  {!mal.value && <Icon name="checkCircle" size={13} />} {msg.value}
                </p>
              )}
              <button type="submit" class="btn" style="width:100%;justify-content:center;margin-top:.9rem" disabled={busy.value}>
                {busy.value ? "Anotando…" : "Quiero participar"}
              </button>
            </form>
          ) : (
            <p class="sm" style="margin-top:0">
              {info.quedan > 0 ? "El sorteo ya cerró." : "Ya salieron los 6 ganadores. ¡Gracias por participar!"}
            </p>
          )}
          {soyStaff && (
            <button type="button" class="btn ghost" style="width:100%;justify-content:center;margin-top:.6rem" disabled={busy.value} onClick$={sortear}>
              Sortear ahora (staff)
            </button>
          )}
          {ya.value && msg.value && (
            <p class={`sm row ${mal.value ? "bad" : ""}`} style="flex-wrap:nowrap;margin-top:.6rem" role="status">{msg.value}</p>
          )}
        </div>
        {info.ganadores.length > 0 && (
          <div class="card" style="margin-top:.9rem;padding:1rem 1.2rem">
            <p style="margin:0 0 .5rem;font-weight:700">Ganadores</p>
            <ul class="sm" style="list-style:none;padding:0;margin:0;display:grid;gap:.3rem">
              {info.ganadores.map((g) => (
                <li key={g.posicion}>
                  <b>{g.posicion}.</b> {g.nombre} <span class="muted">{g.correo}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
});

export const onStaticGenerate: StaticGenerateHandler = async () => ({ params: [{ id: "_" }] });

export const head: DocumentHead = { title: "Sorteo" };
