import { component$, useContext, useSignal, useStore, useVisibleTask$, $ } from "@builder.io/qwik";
import { Link, type DocumentHead } from "@builder.io/qwik-city";
import { api, errMsg, requireLogin, type Horario, type Simulador } from "~/lib/api";
import { SessionContext, isStaff } from "~/lib/session";
import { setTitle } from "~/lib/url";
import { Icon } from "~/components/icon";
import { Empty, ErrorState, Loading } from "~/components/ui";
import { VistaHorario } from "~/components/horario-vista";

// Simulador de Mi horario: el instructor ve la portada exactamente como la ve un alumno (su calendario,
// sus cursos y las ofertas que le encajan), o como la vería alguien con los grupos que él marque.
// Sirve para comprobar cruces y ofertas antes de mover una fecha o abrir un grupo.

type Modo = "alumno" | "grupos";

export default component$(() => {
  const session = useContext(SessionContext);
  const st = useStore<{ datos: Simulador | null; h: Horario | null; quien: string; error: string; cargando: boolean }>({
    datos: null, h: null, quien: "", error: "", cargando: false,
  });
  const modo = useSignal<Modo>("alumno");
  const alumno = useSignal("");
  const filtro = useSignal("");
  const grupos = useSignal<string[]>([]);
  const ahora = useSignal(Date.now());

  const simular = $(async () => {
    st.error = "";
    st.cargando = true;
    try {
      const q = modo.value === "alumno" ? { alumno: alumno.value } : { grupos: grupos.value };
      if (modo.value === "alumno" && !alumno.value) {
        st.h = null;
        return;
      }
      const r = await api.simuladorHorario(q);
      ahora.value = Date.now();
      st.h = r;
      st.quien = modo.value === "alumno" ? r.simulado.alumno : "";
      const u = new URL(location.href);
      u.search = modo.value === "alumno" ? `?alumno=${encodeURIComponent(alumno.value)}` : `?grupos=${encodeURIComponent(grupos.value.join(","))}`;
      history.replaceState(null, "", u);
    } catch (e) {
      if (!requireLogin(e)) st.error = errMsg(e);
    } finally {
      st.cargando = false;
    }
  });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async ({ track }) => {
    setTitle("Simulador de horario");
    track(() => session.loaded);
    if (!session.loaded || st.datos) return;
    try {
      st.datos = await api.simulador();
      const q = new URLSearchParams(location.search);
      if (q.has("grupos")) {
        modo.value = "grupos";
        grupos.value = (q.get("grupos") ?? "").split(",").filter(Boolean);
        await simular();
      } else if (q.get("alumno")) {
        alumno.value = q.get("alumno") ?? "";
        await simular();
      }
    } catch (e) {
      if (!requireLogin(e)) st.error = errMsg(e);
    }
  });

  const d = st.datos;
  const f = filtro.value.trim().toLowerCase();
  const alumnos = d ? d.alumnos.filter((a) => !f || a.nombre.toLowerCase().includes(f) || a.email.toLowerCase().includes(f)) : [];
  const elegido = d?.alumnos.find((a) => a.id === alumno.value);

  if (session.loaded && !isStaff(session.me)) {
    return (
      <div class="ag-pagina">
        <Empty icon="lock" title="Solo para instructores" text="El simulador muestra el horario de otros alumnos." />
      </div>
    );
  }

  return (
    <div class="ag-pagina hr-pagina">
      <div class="head">
        <div class="grow">
          <h1>Simulador de horario</h1>
          <p class="ag-sub">La portada tal como la ve el alumno · hora de Lima</p>
        </div>
        <Link class="btn ghost sm" href="/instructor/agenda/">
          <Icon name="chevronLeft" size={14} /> Agenda
        </Link>
      </div>

      {!d && !st.error && <Loading lines={3} />}

      {d && (
        <section class="sim-control" aria-label="Qué simular">
          <div class="sim-modos" role="tablist" aria-label="Simular por">
            {(["alumno", "grupos"] as Modo[]).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={modo.value === m}
                class={modo.value === m ? "on" : ""}
                onClick$={async () => {
                  // Al pasar a grupos se parte de los del alumno elegido: así se prueba «¿y si además lleva…?».
                  if (m === "grupos" && modo.value === "alumno" && elegido) grupos.value = elegido.grupos.filter((g) => d.grupos.some((x) => x.id === g));
                  modo.value = m;
                  await simular();
                }}
              >
                {m === "alumno" ? "Un alumno" : "Grupos a mano"}
              </button>
            ))}
          </div>

          {modo.value === "alumno" ? (
            <div class="sim-alumno">
              <label class="sim-campo">
                <span>Buscar</span>
                <input type="search" placeholder="Nombre o correo" value={filtro.value} onInput$={(_, el) => (filtro.value = el.value)} />
              </label>
              <label class="sim-campo grow">
                <span>Alumno ({alumnos.length})</span>
                <select
                  value={alumno.value}
                  onChange$={async (_, el) => {
                    alumno.value = el.value;
                    await simular();
                  }}
                >
                  <option value="">Elige un alumno…</option>
                  {alumnos.map((a) => (
                    <option key={a.id} value={a.id} selected={a.id === alumno.value}>
                      {`${a.nombre} — ${a.email}`}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : (
            <fieldset class="sim-grupos">
              <legend>Marca los grupos ({grupos.value.length})</legend>
              <div>
                {d.grupos.map((g) => {
                  const on = grupos.value.includes(g.id);
                  return (
                    <label key={g.id} class={on ? "on" : ""}>
                      <input
                        type="checkbox"
                        checked={on}
                        onChange$={async () => {
                          grupos.value = on ? grupos.value.filter((x) => x !== g.id) : [...grupos.value, g.id];
                          await simular();
                        }}
                      />
                      <b>{g.cursos[0].replace(` · ${g.nombre}`, "")}</b> <span>{g.nombre}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          )}
        </section>
      )}

      {st.error && <ErrorState message={st.error} retry$={simular} />}

      {st.h && (
        <>
          <p class="sim-banda" aria-live="polite">
            <Icon name="eye" size={16} />
            {modo.value === "alumno" ? (
              <span>
                Viendo como <b>{st.quien}</b>
                {st.h.cursos.length > 0 && <span class="muted"> · {st.h.cursos.length === 1 ? "1 curso" : `${st.h.cursos.length} cursos`}</span>}
              </span>
            ) : (
              <span>
                Viendo como alguien con <b>{grupos.value.length === 1 ? "1 grupo" : `${grupos.value.length} grupos`}</b>
              </span>
            )}
            {st.cargando && <span class="muted">Actualizando…</span>}
          </p>
          <VistaHorario h={st.h} ahora={ahora.value} simulado />
        </>
      )}

      {d && !st.h && !st.error && modo.value === "alumno" && (
        <Empty icon="eye" title="Elige un alumno" text="Verás su calendario, sus cursos y las ofertas que le encajan, igual que él al entrar." />
      )}
    </div>
  );
});

export const head: DocumentHead = { title: "Simulador de horario" };
