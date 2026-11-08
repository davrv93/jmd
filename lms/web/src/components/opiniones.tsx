import {
  $,
  component$,
  useContext,
  useSignal,
  useStore,
  useVisibleTask$,
} from "@builder.io/qwik";
import {
  api,
  errMsg,
  fmtDate,
  rel,
  requireLogin,
  type Opinion,
  type OpinionesCurso,
} from "~/lib/api";
import { SessionContext, isStaff, toast } from "~/lib/session";
import { Icon } from "~/components/icon";
import { Empty, ErrorState, Loading } from "~/components/ui";

// Opiniones de las clases: el formulario del LIVE («Dejar mi opinión») y la sección «Opiniones» del
// curso. El texto de cada opinión se pinta como texto (JSX lo escapa): nunca como HTML.

const MAX = 400;
const ETIQUETA = ["", "Mala", "Floja", "Buena", "Muy buena", "Excelente"];

// Estrellas de solo lectura: n de 5, con la cifra para lectores de pantalla.
export const Estrellas = component$((props: { n: number; size?: number }) => (
  <span
    class="estrellas"
    role="img"
    aria-label={`${props.n.toLocaleString("es-PE")} de 5 estrellas`}
  >
    {[1, 2, 3, 4, 5].map((i) => (
      <span
        key={i}
        class={i <= Math.round(props.n) ? "on" : ""}
        aria-hidden="true"
      >
        <Icon name="star" size={props.size ?? 14} />
      </span>
    ))}
  </span>
));

// OpinionClase: botón siempre visible en el LIVE y un formulario corto (estrellas + texto). Se abre
// solo una vez cuando el instructor cierra la clase, si aún no opinaste y no lo cerraste antes.
export const OpinionClase = component$(
  (props: { lesson: string; cerrada: boolean }) => {
    const session = useContext(SessionContext);
    const st = useStore({
      cargada: false,
      puede: false,
      tiene: false,
      abierto: false,
      estrellas: 0,
      texto: "",
      guardando: false,
      error: "",
    });
    const boton = useSignal<HTMLButtonElement>();
    const caja = useSignal<HTMLElement>();
    const clave = `lms.opinion.vista.${props.lesson}`;

    // eslint-disable-next-line qwik/no-use-visible-task
    useVisibleTask$(async () => {
      try {
        const r = await api.miOpinion(props.lesson);
        st.puede = r.puede;
        if (r.opinion) {
          st.tiene = true;
          st.estrellas = r.opinion.estrellas;
          st.texto = r.opinion.texto;
        }
      } catch {
        st.puede = false;
      }
      st.cargada = true;
    });

    // Al cerrarse la clase, el formulario aparece una vez (si no opinaste ni lo descartaste en esta pestaña).
    // eslint-disable-next-line qwik/no-use-visible-task
    useVisibleTask$(({ track }) => {
      const cerrada = track(() => props.cerrada);
      const lista = track(() => st.cargada);
      if (!cerrada || !lista || !st.puede || st.tiene) return;
      try {
        if (sessionStorage.getItem(clave)) return;
        sessionStorage.setItem(clave, "1");
      } catch {
        /* sin almacenamiento: se abre igual */
      }
      st.abierto = true;
    });

    // Foco al abrir; Escape cierra y devuelve el foco al botón.
    // eslint-disable-next-line qwik/no-use-visible-task
    useVisibleTask$(({ track, cleanup }) => {
      if (!track(() => st.abierto)) return;
      caja.value
        ?.querySelector<HTMLInputElement>("input:checked, input[type=radio]")
        ?.focus();
      const tecla = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          st.abierto = false;
          boton.value?.focus();
        }
      };
      document.addEventListener("keydown", tecla);
      cleanup(() => document.removeEventListener("keydown", tecla));
    });

    const enviar = $(async () => {
      if (st.estrellas < 1) {
        st.error = "Elige de 1 a 5 estrellas.";
        return;
      }
      st.guardando = true;
      st.error = "";
      try {
        const o = await api.guardarOpinion(
          props.lesson,
          st.estrellas,
          st.texto,
        );
        st.texto = o.texto;
        st.tiene = true;
        st.abierto = false;
        toast(session, "¡Gracias! Tu opinión quedó guardada.");
        boton.value?.focus();
      } catch (e) {
        if (!requireLogin(e)) st.error = errMsg(e);
      } finally {
        st.guardando = false;
      }
    });

    if (!st.cargada || !st.puede) return null;
    const quedan = MAX - [...st.texto].length;

    return (
      <>
        <button
          ref={boton}
          type="button"
          class="btn ghost sm op-btn"
          aria-haspopup="dialog"
          aria-label={
            st.tiene
              ? "Editar mi opinión de la clase"
              : "Dejar mi opinión de la clase"
          }
          title={
            st.tiene
              ? "Editar mi opinión de la clase"
              : "Dejar mi opinión de la clase"
          }
          data-testid="opinion-btn"
          onClick$={() => {
            st.error = "";
            st.abierto = true;
          }}
        >
          <Icon name="star" size={14} />
          <span class="lv-ocultable">
            {st.tiene ? "Mi opinión" : "Dejar mi opinión"}
          </span>
        </button>
        {st.abierto && (
          <div
            class="live-compuerta-fondo op-fondo"
            onClick$={(e, el) => {
              if (e.target === el) st.abierto = false;
            }}
          >
            <form
              ref={caja}
              class="live-compuerta op-form"
              role="dialog"
              aria-modal="true"
              aria-labelledby="op-form-t"
              preventdefault:submit
              onSubmit$={enviar}
              data-testid="opinion-form"
            >
              <h2 id="op-form-t">¿Qué te pareció la clase?</h2>
              <p class="live-compuerta-sub">
                Tu opinión la verán tus compañeros con tu primer nombre. Puedes
                editarla cuando quieras.
              </p>
              <fieldset class="op-estrellas-in">
                <legend>Tu calificación</legend>
                <div class="op-estrellas-fila">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <label
                      key={i}
                      class={i <= st.estrellas ? "on" : ""}
                      title={ETIQUETA[i]}
                    >
                      <input
                        type="radio"
                        name="estrellas"
                        value={i}
                        checked={st.estrellas === i}
                        onChange$={() => (st.estrellas = i)}
                      />
                      <Icon name="star" size={28} />
                      <span class="sr">
                        {i} {i === 1 ? "estrella" : "estrellas"}: {ETIQUETA[i]}
                      </span>
                    </label>
                  ))}
                  <span class="op-etiqueta" aria-hidden="true">
                    {ETIQUETA[st.estrellas] ?? ""}
                  </span>
                </div>
              </fieldset>
              <label class="op-texto">
                <span>Cuéntanos más (opcional)</span>
                <textarea
                  maxLength={MAX}
                  rows={4}
                  placeholder="Qué te sirvió, qué mejorarías…"
                  value={st.texto}
                  onInput$={(_, el) => (st.texto = el.value)}
                  aria-describedby="op-quedan"
                />
                <small
                  id="op-quedan"
                  class={quedan < 40 ? "op-quedan poco" : "op-quedan"}
                >
                  {quedan} caracteres disponibles
                </small>
              </label>
              {st.error && (
                <p class="op-error" role="alert">
                  {st.error}
                </p>
              )}
              <div class="live-compuerta-acc">
                <button
                  type="button"
                  class="btn ghost sm"
                  onClick$={() => (st.abierto = false)}
                >
                  Ahora no
                </button>
                <button type="submit" class="btn sm" disabled={st.guardando}>
                  {st.guardando
                    ? "Guardando…"
                    : st.tiene
                      ? "Guardar cambios"
                      : "Enviar opinión"}
                </button>
              </div>
            </form>
          </div>
        )}
      </>
    );
  },
);

// OpinionesCursoSeccion: promedio, cuántas y la lista (más gustadas primero; a igual número, las más
// recientes). Cualquiera con acceso al curso da «me gusta» (no a la suya); el personal oculta y muestra.
export const OpinionesCursoSeccion = component$((props: { course: string }) => {
  const session = useContext(SessionContext);
  const st = useStore<{
    datos: OpinionesCurso | null;
    error: string;
    ocupado: string;
  }>({ datos: null, error: "", ocupado: "" });

  const cargar = $(async () => {
    st.error = "";
    try {
      st.datos = await api.opinionesCurso(props.course);
    } catch (e) {
      if (!requireLogin(e)) st.error = errMsg(e);
    }
  });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async ({ track }) => {
    track(() => props.course);
    await cargar();
  });

  const meGusta = $(async (o: Opinion) => {
    if (o.mia || st.ocupado) return;
    st.ocupado = o.id;
    try {
      const r = await api.opinionLike(o.id);
      if (st.datos)
        st.datos = {
          ...st.datos,
          opiniones: st.datos.opiniones.map((x) =>
            x.id === r.id ? { ...x, likes: r.likes, me_gusta: r.me_gusta } : x,
          ),
        };
    } catch (e) {
      if (!requireLogin(e)) toast(session, errMsg(e), "bad");
    } finally {
      st.ocupado = "";
    }
  });

  const ocultar = $(async (o: Opinion) => {
    st.ocupado = o.id;
    try {
      const r = await api.opinionOcultar(o.id, !o.oculta);
      toast(
        session,
        r.oculta
          ? "Opinión oculta: los alumnos ya no la ven."
          : "Opinión visible de nuevo.",
      );
      await cargar();
    } catch (e) {
      if (!requireLogin(e)) toast(session, errMsg(e), "bad");
    } finally {
      st.ocupado = "";
    }
  });

  if (st.error) return <ErrorState message={st.error} retry$={cargar} />;
  const d = st.datos;
  if (!d) return <Loading lines={3} />;
  const staff = isStaff(session.me);

  return (
    <section
      class="opiniones"
      aria-labelledby="opiniones-t"
      data-testid="opiniones-curso"
    >
      <h2 id="opiniones-t" class="sr">
        Opiniones
      </h2>
      {d.total > 0 && (
        <div class="op-resumen card">
          <span class="op-promedio">
            {d.promedio.toLocaleString("es-PE", {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })}
          </span>
          <div>
            <Estrellas n={d.promedio} size={18} />
            <p class="sm muted">
              {d.total} {d.total === 1 ? "opinión" : "opiniones"} de alumnos
            </p>
          </div>
        </div>
      )}
      {d.opiniones.length === 0 ? (
        <Empty
          icon="star"
          title="Aún no hay opiniones"
          text="Al terminar cada clase en vivo, los alumnos pueden dejar su opinión con el botón «Dejar mi opinión»."
        />
      ) : (
        <ul class="op-lista">
          {d.opiniones.map((o) => (
            <li
              key={`${o.id}:${o.likes}:${o.me_gusta}:${o.oculta}`}
              class={[
                "card op-item",
                o.oculta ? "oculta" : "",
                o.mia ? "mia" : "",
              ].join(" ")}
            >
              <div class="op-cab">
                <b>{o.mia ? `${o.nombre} (tú)` : o.nombre}</b>
                <Estrellas n={o.estrellas} />
                {o.oculta && (
                  <span class="badge warn">
                    <Icon name="eye" size={11} /> oculta
                  </span>
                )}
                <span class="op-meta" title={fmtDate(o.fecha)}>
                  {o.lesson_title ? `${o.lesson_title.split(" · ")[0]} · ` : ""}
                  {rel(o.fecha)}
                </span>
              </div>
              {o.texto && <p class="op-txt">{o.texto}</p>}
              <div class="op-acc">
                {o.mia ? (
                  <span
                    class="muro-like propia"
                    title="Es tuya: no puedes darle «me gusta»"
                    aria-label={`Tu opinión tiene ${o.likes} «me gusta»`}
                  >
                    <Icon name="heart" size={14} />
                    <span>{o.likes}</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    class="muro-like"
                    aria-pressed={o.me_gusta}
                    aria-label={`Me gusta la opinión de ${o.nombre} (${o.likes})`}
                    title={o.me_gusta ? "Quitar «me gusta»" : "Me gusta"}
                    disabled={st.ocupado === o.id || o.oculta}
                    onClick$={() => meGusta(o)}
                  >
                    <Icon name="heart" size={14} />
                    <span>{o.likes}</span>
                  </button>
                )}
                {staff && (
                  <button
                    type="button"
                    class="btn ghost sm"
                    disabled={st.ocupado === o.id}
                    onClick$={() => ocultar(o)}
                  >
                    <Icon name={o.oculta ? "eye" : "ban"} size={13} />{" "}
                    {o.oculta ? "Mostrar" : "Ocultar"}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
});
