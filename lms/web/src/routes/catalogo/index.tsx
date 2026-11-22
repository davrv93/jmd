import { component$, useContext, useSignal, useStore, useStyles$, useVisibleTask$, $ } from "@builder.io/qwik";
import { Link, type DocumentHead } from "@builder.io/qwik-city";
import { api, errMsg, requireLogin, type Catalogo } from "~/lib/api";
import { SessionContext } from "~/lib/session";
import { getParam, setParams, setTitle } from "~/lib/url";
import { AREAS, nombreArea } from "~/lib/marca";
import { Icon } from "~/components/icon";
import { Empty, ErrorState, Loading } from "~/components/ui";
import { TarjetaCurso } from "~/components/tarjeta-curso";
import { LineaTiempo } from "~/components/graficos";
import CSS from "./catalogo.css?inline";

// Catálogo (/catalogo/): todo lo que viene y lo que está en curso, para cualquier alumno con sesión.
// Dos vistas del mismo filtro: tarjetas agrupadas por área, y la línea de tiempo de las próximas 8
// semanas, para que «qué viene después» se vea de un golpe.

type Vista = "tarjetas" | "tiempo";

export default component$(() => {
  useStyles$(CSS);
  const session = useContext(SessionContext);
  const st = useStore<{ cat: Catalogo | null; error: string }>({ cat: null, error: "" });
  const vista = useSignal<Vista>("tarjetas");
  const area = useSignal("");

  const load = $(async () => {
    st.error = "";
    try {
      st.cat = await api.catalogo();
    } catch (e) {
      if (!requireLogin(e)) st.error = errMsg(e);
    }
  });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async () => {
    session.help = "catalogo";
    setTitle("Catálogo");
    vista.value = getParam("vista") === "tiempo" ? "tiempo" : "tarjetas";
    area.value = getParam("area");
    await load();
  });

  const elegirVista = $((v: Vista) => {
    vista.value = v;
    setParams({ vista: v === "tarjetas" ? "" : v });
  });
  const elegirArea = $((a: string) => {
    area.value = a;
    setParams({ area: a });
  });

  // Desde la línea de tiempo, el nombre de un curso lleva a su tarjeta (donde está la inscripción).
  const irATarjeta = $((id: string) => {
    vista.value = "tarjetas";
    setParams({ vista: "" });
    setTimeout(() => {
      const el = document.getElementById(`curso-${id}`);
      const pliegue = el?.closest("details");
      if (pliegue) pliegue.open = true;
      el?.scrollIntoView({ block: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      el?.querySelector<HTMLElement>(".btn")?.focus({ preventScroll: true });
    }, 60);
  });

  const cat = st.cat;
  const ahora = cat ? Date.parse(cat.ahora) : Date.now();
  const todos = cat?.cursos ?? [];
  const visibles = todos.filter((c) => !area.value || c.area === area.value);
  const areas = AREAS.filter((a) => todos.some((c) => c.area === a.id));
  const otros = todos.some((c) => !AREAS.some((a) => a.id === c.area));
  // Tarjetas: arriba «Para ti» (lo recomendado), luego lo que empieza, por área y por fecha. Lo que ya
  // está en curso queda plegado al final: sirve para preguntar por el próximo grupo, no para elegir hoy.
  const paraTi = area.value ? [] : visibles.filter((c) => c.recomendado).sort((a, b) => a.recomendado!.orden - b.recomendado!.orden);
  const vienen = visibles.filter((c) => c.estado === "proximo" && !paraTi.includes(c));
  const enCurso = visibles.filter((c) => c.estado === "en_curso");
  const grupos = [...areas.map((a) => a.id), ...(otros ? [""] : [])]
    .filter((a) => !area.value || a === area.value)
    .map((a) => ({ area: a, cursos: vienen.filter((c) => (a ? c.area === a : !AREAS.some((x) => x.id === c.area))) }))
    .filter((g) => g.cursos.length > 0);
  const proximos = todos.filter((c) => c.estado === "proximo").length;
  const pase = session.me?.cohorts.includes("pase-libre");

  return (
    <div class="cat">
      <div class="cat-cab">
        <div class="grow">
          <h1>Catálogo</h1>
          <p>
            {cat ? `${proximos} ${proximos === 1 ? "curso empieza" : "cursos empiezan"} pronto y ${todos.length - proximos} están en curso.` : "Lo que empieza en las próximas semanas."} Elige por área o mira todo en la línea de tiempo.
          </p>
        </div>
        {pase && (
          <Link class="btn ghost sm" href="/pase/"><Icon name="grad" size={14} /> Tu pase libre</Link>
        )}
      </div>

      {st.error && <ErrorState message={st.error} retry$={load} />}
      {!st.error && !cat && <Loading lines={6} />}

      {cat && (
        <>
          <div class="cat-barra" role="group" aria-label="Filtros del catálogo">
            <div class="cat-vista" role="radiogroup" aria-label="Vista">
              <button type="button" role="radio" aria-checked={vista.value === "tarjetas"} onClick$={() => elegirVista("tarjetas")}>
                <Icon name="layout" size={15} /> Tarjetas
              </button>
              <button type="button" role="radio" aria-checked={vista.value === "tiempo"} onClick$={() => elegirVista("tiempo")}>
                <Icon name="calendar" size={15} /> Línea de tiempo
              </button>
            </div>
            <div class="cat-areas" role="group" aria-label="Área">
              <button type="button" class={`chip ${area.value === "" ? "on" : ""}`} aria-pressed={area.value === ""} onClick$={() => elegirArea("")}>
                Todas <span class="cat-n">{todos.length}</span>
              </button>
              {areas.map((a) => {
                const n = todos.filter((c) => c.area === a.id).length;
                return (
                  <button key={a.id} type="button" data-area={a.id} class={`chip ${area.value === a.id ? "on" : ""}`} aria-pressed={area.value === a.id} onClick$={() => elegirArea(area.value === a.id ? "" : a.id)}>
                    <i class="cat-pto" aria-hidden="true" /> {a.nombre} <span class="cat-n">{n}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {visibles.length === 0 && <Empty icon="compass" title="No hay cursos en esta área por ahora" text="Prueba con otra área o mira todas." />}

          {vista.value === "tiempo" && visibles.length > 0 && (
            <section class="cat-tiempo" aria-label="Línea de tiempo de las próximas 8 semanas">
              <LineaTiempo cursos={visibles} ahora={ahora} onCurso$={irATarjeta} />
            </section>
          )}

          {vista.value === "tarjetas" && paraTi.length > 0 && (
            <section class="cat-grupo cat-parati" aria-labelledby="para-ti">
              <h2 id="para-ti" class="cat-h2">Para ti</h2>
              <p class="cat-sub">Según lo que ya llevaste y lo que empieza pronto.</p>
              <div class="cat-grid">
                {paraTi.map((c) => (
                  <TarjetaCurso key={c.id} c={c} ahora={ahora} razon />
                ))}
              </div>
            </section>
          )}

          {vista.value === "tarjetas" &&
            grupos.map((g) => (
              <section key={g.area || "otros"} class="cat-grupo" aria-labelledby={`area-${g.area || "otros"}`} data-area={g.area || undefined}>
                <h2 id={`area-${g.area || "otros"}`} class="cat-h2">
                  <i class="cat-pto" aria-hidden="true" /> {nombreArea(g.area)} <span class="cat-n">{g.cursos.length}</span>
                </h2>
                <div class="cat-grid" data-testid="catalogo-tarjetas">
                  {g.cursos.map((c) => (
                    <TarjetaCurso key={c.id} c={c} ahora={ahora} />
                  ))}
                </div>
              </section>
            ))}

          {vista.value === "tarjetas" && enCurso.length > 0 && (
            <details class="cat-grupo cat-encurso">
              <summary>
                <span class="cat-h2">Ya empezaron <span class="cat-n">{enCurso.length}</span></span>
                <span class="cat-sub">Grupos en curso. Pregunta por el próximo grupo de cualquiera de ellos.</span>
              </summary>
              <div class="cat-grid">
                {enCurso.map((c) => (
                  <TarjetaCurso key={c.id} c={c} ahora={ahora} />
                ))}
              </div>
            </details>
          )}

          {vista.value === "tiempo" && visibles.length > 0 && (
            <p class="cat-nota sm muted">
              Toca un punto para ver la fecha y la hora de esa sesión. Toca el nombre de un curso para ver su tarjeta e inscribirte.
            </p>
          )}
        </>
      )}
    </div>
  );
});

export const head: DocumentHead = { title: "Catálogo" };
