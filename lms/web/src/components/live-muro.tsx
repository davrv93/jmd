import {
  $,
  component$,
  useContext,
  useSignal,
  useStore,
  useVisibleTask$,
} from "@builder.io/qwik";
import { api, errMsg, type EntradaMuro } from "~/lib/api";
import { SessionContext, toast } from "~/lib/session";
import { Icon } from "~/components/icon";

// LiveMuro: el muro del grupo de la escena que estás viendo, con «me gusta». Lo pinta el LIVE (no la
// escena), así que funciona en TODAS las escenas que usan el muro sin tocarlas: la escena sigue
// mostrando su propia lista y aquí se ve la misma, ordenada por «me gusta», con el botón ♥.
// El botón aparece solo cuando la escena tiene entradas. Se refresca al cambiar de escena y con el
// evento «muro» del stream (props.senal cambia); las ráfagas de eventos se juntan en una lectura.
export const LiveMuro = component$(
  (props: {
    lesson: string;
    escena: string;
    senal?: string;
    compacto?: boolean;
  }) => {
    const session = useContext(SessionContext);
    const st = useStore<{
      entradas: EntradaMuro[];
      orden: "" | "likes";
      ocupado: string;
    }>({ entradas: [], orden: "likes", ocupado: "" });
    const abierto = useSignal(false);
    const titulo = useSignal<HTMLElement>();
    const boton = useSignal<HTMLButtonElement>();
    const vista = useStore({ escena: "", senal: "", lectura: 0 }); // lo último que se leyó, para saber qué cambió

    const leer = $(async (escena: string) => {
      if (!escena) {
        st.entradas = [];
        return;
      }
      const n = ++vista.lectura;
      try {
        const r = await api.liveMuro(props.lesson, escena, st.orden);
        // Solo vale la lectura más reciente y si nadie tocó un «me gusta» mientras viajaba.
        if (n === vista.lectura && escena === props.escena && !st.ocupado)
          st.entradas = r.entradas ?? [];
      } catch {
        /* sin muro en esta escena (o sin conexión): el botón no aparece */
      }
    });

    // Al cambiar de escena o de orden, y con cada aviso del stream para esta escena. Los avisos esperan
    // 600 ms, y uno nuevo cancela el anterior: una ráfaga de «me gusta» es una sola lectura.
    // eslint-disable-next-line qwik/no-use-visible-task
    useVisibleTask$(({ track, cleanup }) => {
      const escena = track(() => props.escena);
      const senal = track(() => props.senal ?? "");
      track(() => st.orden);
      const aviso = senal !== vista.senal;
      vista.senal = senal;
      if (escena !== vista.escena) {
        vista.escena = escena;
        st.entradas = [];
      } else if (aviso && !senal.startsWith(escena + "|")) {
        return; // aviso del muro de otra escena
      }
      const t = window.setTimeout(() => leer(escena), aviso ? 600 : 0);
      cleanup(() => window.clearTimeout(t));
    });

    // Escape cierra y devuelve el foco al botón; al abrir, el foco va al título del panel.
    // eslint-disable-next-line qwik/no-use-visible-task
    useVisibleTask$(({ track, cleanup }) => {
      if (!track(() => abierto.value)) return;
      titulo.value?.focus();
      const tecla = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          abierto.value = false;
          boton.value?.focus();
        }
      };
      document.addEventListener("keydown", tecla);
      cleanup(() => document.removeEventListener("keydown", tecla));
    });

    const meGusta = $(async (en: EntradaMuro) => {
      if (en.mia || st.ocupado) return;
      st.ocupado = en.id;
      vista.lectura++; // descarta cualquier lectura en vuelo: traería el conteo de antes
      // Eco inmediato; la respuesta trae el muro real.
      st.entradas = st.entradas.map((x) =>
        x.id === en.id
          ? {
              ...x,
              me_gusta: !x.me_gusta,
              likes: x.likes + (x.me_gusta ? -1 : 1),
            }
          : x,
      );
      try {
        const r = await api.liveMuroLike(
          props.lesson,
          props.escena,
          en.id,
          st.orden,
        );
        st.entradas = r.entradas ?? st.entradas;
      } catch (e) {
        toast(session, errMsg(e), "bad");
        st.ocupado = "";
        await leer(props.escena);
      } finally {
        st.ocupado = "";
      }
    });

    const n = st.entradas.length;
    if (n === 0 && !abierto.value) return null;
    const totalLikes = st.entradas.reduce((a, x) => a + x.likes, 0);

    return (
      <>
        <button
          ref={boton}
          type="button"
          class={["btn ghost sm muro-btn", abierto.value ? "on" : ""].join(" ")}
          aria-expanded={abierto.value}
          aria-controls="muro-panel"
          aria-label={`Muro del grupo: ${n} ${n === 1 ? "entrada" : "entradas"}`}
          title="El muro del grupo de esta escena, con «me gusta»"
          data-testid="muro-btn"
          onClick$={() => (abierto.value = !abierto.value)}
        >
          <Icon name="heart" size={14} />
          <span class={props.compacto ? "" : "lv-ocultable"}>Muro</span>
          <span class="muro-n" aria-hidden="true">
            {n}
          </span>
        </button>
        {abierto.value && (
          <section
            id="muro-panel"
            class="muro-panel"
            role="dialog"
            aria-modal="false"
            aria-labelledby="muro-panel-t"
            data-testid="muro-panel"
          >
            <header class="muro-cab">
              <h2 id="muro-panel-t" ref={titulo} tabIndex={-1}>
                Muro del grupo
              </h2>
              <span class="muro-sub">
                {n} {n === 1 ? "entrada" : "entradas"} · {totalLikes} ♥
              </span>
              <button
                type="button"
                class="lv-ico-btn"
                aria-label="Cerrar el muro"
                title="Cerrar"
                onClick$={() => (abierto.value = false)}
              >
                <Icon name="x" size={16} />
              </button>
            </header>
            <div class="muro-orden" role="group" aria-label="Ordenar el muro">
              <button
                type="button"
                class={["chip", st.orden === "likes" ? "on" : ""].join(" ")}
                aria-pressed={st.orden === "likes"}
                onClick$={() => (st.orden = "likes")}
              >
                <Icon name="heart" size={12} /> Más gustadas
              </button>
              <button
                type="button"
                class={["chip", st.orden === "" ? "on" : ""].join(" ")}
                aria-pressed={st.orden === ""}
                onClick$={() => (st.orden = "")}
              >
                <Icon name="clock" size={12} /> Recientes
              </button>
            </div>
            {n === 0 ? (
              <p class="muro-vacio">El muro de esta escena está vacío.</p>
            ) : (
              <ol class="muro-lista" aria-live="polite">
                {st.entradas.map((en) => (
                  <li
                    key={`${en.id}:${en.likes}:${en.me_gusta}`}
                    class={en.mia ? "mia" : ""}
                  >
                    <div class="muro-txt">
                      <b>{en.mia ? "Tú" : en.nombre}</b>
                      <span>{en.texto}</span>
                    </div>
                    {en.mia ? (
                      <span
                        class="muro-like propia"
                        title="Es tuya: no puedes darle «me gusta»"
                        aria-label={`Tu entrada tiene ${en.likes} «me gusta»`}
                      >
                        <Icon name="heart" size={14} />
                        <span>{en.likes}</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        class="muro-like"
                        aria-pressed={en.me_gusta}
                        aria-label={`Me gusta lo de ${en.nombre} (${en.likes})`}
                        title={en.me_gusta ? "Quitar «me gusta»" : "Me gusta"}
                        disabled={st.ocupado === en.id}
                        onClick$={() => meGusta(en)}
                      >
                        <Icon name="heart" size={14} />
                        <span>{en.likes}</span>
                      </button>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </section>
        )}
      </>
    );
  },
);
