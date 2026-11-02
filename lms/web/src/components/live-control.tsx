import { $, component$, type QRL, useContext, useSignal, useVisibleTask$ } from "@builder.io/qwik";
import { api, errMsg, requireLogin, type CompuertaLive, type LiveEstado, type PresenteLive } from "~/lib/api";
import { SessionContext, toast } from "~/lib/session";
import { Icon } from "~/components/icon";
import { LiveCompuerta } from "~/components/live-compuerta";
import { avisarEscena, temaActual, urlEscena } from "~/lib/live";
import { PHASE_BY_ID } from "~/lib/kolb";

const etiquetaSemaforo = (c: string) =>
  c === "verde" ? "Ya cumplió" : c === "ambar" ? "Trabajando" : c === "rojo" ? "Necesita ayuda" : "Sin conexión";

// LiveControl: la mesa del instructor del LIVE. Lista de escenas, anterior/siguiente,
// mostrar/ocultar, iniciar/cerrar, conectados y cronómetro de la escena.
export const LiveControl = component$((props: { lesson: string; estado: LiveEstado; escenas: { id: string; titulo: string; fase: string; duracion_min: number; compuerta?: string }[]; conectados: number; presentes: PresenteLive[]; onVista$?: QRL<(alumno: boolean) => void> }) => {
  const session = useContext(SessionContext);
  const escenaActual = useSignal(props.estado.escena);
  const visible = useSignal(props.estado.visible);
  const enVivo = useSignal(props.estado.estado === "en_vivo");
  const segundos = useSignal(0);
  const tema = useSignal("");
  const marco = useSignal<HTMLIFrameElement>();
  const pendienteCerrar = useSignal(false);
  const texto = useSignal("");
  const cerrojo = useSignal<{ c: CompuertaLive; destino: string } | null>(null);

  // Cronómetro de la escena actual.
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ track }) => {
    track(() => escenaActual.value);
    segundos.value = 0;
    const t = setInterval(() => segundos.value++, 1000);
    return () => clearInterval(t);
  });

  const cambiar = $(async (id: string) => {
    try {
      const estado = await api.liveEscena(props.lesson, id, visible.value);
      if (estado.escena) escenaActual.value = estado.escena;
    } catch (e) {
      if (!requireLogin(e)) toast(session, errMsg(e), "bad");
    }
  });

  const conmover = $(async (dir: 1 | -1) => {
    const lista = props.escenas;
    if (lista.length === 0) return;
    const i = lista.findIndex((x) => x.id === escenaActual.value);
    const j = i < 0 ? (dir > 0 ? 0 : lista.length - 1) : (i + dir + lista.length) % lista.length;
    const destino = lista[j].id;
    // Hacia adelante, con el LIVE en marcha y una escena con compuerta: primero se mira quién cumplió.
    if (dir > 0 && enVivo.value && i >= 0 && lista[i].compuerta && lista[i].compuerta !== "ninguna") {
      try {
        const c = await api.liveCompuerta(props.lesson);
        if (!c.pasa) {
          cerrojo.value = { c, destino };
          return;
        }
      } catch (e) {
        if (!requireLogin(e)) toast(session, errMsg(e), "bad");
        return;
      }
    }
    cambiar(destino);
  });

  const pasarIgual = $(async () => {
    const k = cerrojo.value;
    if (!k) return;
    cerrojo.value = null;
    try {
      await api.livePasarIgual(props.lesson, k.c.escena);
    } catch (e) {
      if (!requireLogin(e)) toast(session, errMsg(e), "bad");
    }
    cambiar(k.destino);
  });

  const conmutarVisible = $(async () => {
    const nuevo = !visible.value;
    try {
      const estado = await api.liveEscena(props.lesson, escenaActual.value, nuevo);
      visible.value = estado.visible;
    } catch (e) {
      if (!requireLogin(e)) toast(session, errMsg(e), "bad");
    }
  });

  const mandarMensaje = $(async () => {
    const t = texto.value.trim();
    if (!t) return;
    try {
      await api.liveMensaje(props.lesson, t, "todos");
      texto.value = "";
      toast(session, "Mensaje enviado a todos", "ok");
    } catch (e) {
      if (!requireLogin(e)) toast(session, errMsg(e), "bad");
    }
  });

  const emparejar = $(async () => {
    try {
      const r = await api.liveEmparejar(props.lesson);
      toast(session, `${r.grupos.length} grupos formados`, "ok");
    } catch (e) {
      if (!requireLogin(e)) toast(session, errMsg(e), "bad");
    }
  });

  const iniciar = $(async () => {
    try {
      await api.liveIniciar(props.lesson);
      enVivo.value = true;
    } catch (e) {
      if (!requireLogin(e)) toast(session, errMsg(e), "bad");
    }
  });

  const cerrar = $(async () => {
    if (!pendienteCerrar.value) {
      pendienteCerrar.value = true; // confirmación en línea, no confirm() nativo
      return;
    }
    pendienteCerrar.value = false;
    try {
      await api.liveCerrar(props.lesson);
      enVivo.value = false;
    } catch (e) {
      if (!requireLogin(e)) toast(session, errMsg(e), "bad");
    }
  });

  // Atajos: flechas y espacio cambian, h muestra u oculta.
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(() => {
    const enCampo = () => {
      const el = document.activeElement as HTMLElement | null;
      return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || ("isContentEditable" in el && el.isContentEditable));
    };
    const mover = (e: KeyboardEvent) => {
      if (enCampo()) return;
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        conmover(1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        conmover(-1);
      } else if (e.key === "h") {
        conmutarVisible();
      }
    };
    document.addEventListener("keydown", mover);
    return () => document.removeEventListener("keydown", mover);
  });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ track }) => {
    track(() => props.estado.parametro);
    tema.value = temaActual();
    avisarEscena(marco.value, props.estado);
  });

  const mmss = (n: number) => `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
  const actual = props.escenas.find((x) => x.id === escenaActual.value);
  const idx = props.escenas.findIndex((x) => x.id === escenaActual.value);
  const totalMin = props.escenas.reduce((a, e) => a + (e.duracion_min || 0), 0);
  const fase = (f: string) => PHASE_BY_ID[f]?.token ?? "ec";
  const limite = actual ? actual.duracion_min * 60 : 0;
  const avanceReloj = limite ? Math.min(100, (segundos.value / limite) * 100) : 0;
  const pasado = !!limite && segundos.value > limite;
  const extras = !!actual && (actual.id === "11-probar-medir" || actual.id === "08-avatar");

  return (
    <div class="live-control mesa">
      {cerrojo.value && <LiveCompuerta c={cerrojo.value.c} onEsperar$={() => (cerrojo.value = null)} onPasar$={pasarIgual} />}
      <div class="live-main">
        <aside class="live-escenas mesa-rail" aria-label="Escenas">
          <header class="mesa-rail-cab">
            <b>{props.lesson}</b>
            <span>{props.escenas.length} escenas · {totalMin} min</span>
            <i class="mesa-rail-av" aria-hidden="true"><i style={`width:${props.escenas.length ? ((idx + 1) / props.escenas.length) * 100 : 0}%`} /></i>
          </header>
          <ol class="mesa-lista">
            {props.escenas.length === 0 && <li class="live-vacio">Esta lección no tiene escenas LIVE todavía.</li>}
            {props.escenas.map((e, i) => (
              <li key={e.id} class={i < idx ? "vista" : i === idx ? "actual" : ""}>
                <button type="button" class="mesa-escena" style={`--ph:var(--ph-${fase(e.fase)})`} aria-current={i === idx ? "true" : undefined} title={`${e.titulo} · ${PHASE_BY_ID[e.fase]?.short ?? e.fase}`} onClick$={() => cambiar(e.id)}>
                  <span class="mesa-escena-num">{i < idx ? <Icon name="check" size={12} /> : i + 1}</span>
                  <span class="mesa-escena-titulo">{e.titulo}</span>
                  <span class="mesa-escena-min">{e.duracion_min}′</span>
                </button>
              </li>
            ))}
          </ol>
          {props.presentes.length > 0 && (
            <ul class="live-alumnos" aria-label="Alumnos conectados">
              {props.presentes.map((a) => (
                <li key={a.sub}>
                  <span class={`semaforo ${a.semaforo}`} role="img" aria-label={etiquetaSemaforo(a.semaforo)} title={etiquetaSemaforo(a.semaforo)} />
                  <span class="live-alumno-nombre">{a.nombre}</span>
                </li>
              ))}
            </ul>
          )}
        </aside>
        <section class="live-previa mesa-escenario" aria-label="Vista previa de la escena">
          {escenaActual.value ? (
            <iframe
              key={escenaActual.value + tema.value}
              ref={marco}
              class="live-frame"
              onLoad$={() => avisarEscena(marco.value, props.estado)}
              sandbox={props.lesson === "qa-01" && escenaActual.value === "01-descarga" ? "allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox" : props.lesson === "de-02" && ["05-escucha-y-descarga", "09-musica-con-lyria"].includes(escenaActual.value) ? "allow-scripts allow-same-origin allow-downloads" : "allow-scripts allow-same-origin"}
              allow="microphone; clipboard-write"
              title="Vista previa"
              src={urlEscena(props.lesson, escenaActual.value, tema.value, !visible.value)}
            />
          ) : (
            <p class="live-vacio">Elige una escena de la lista para verla aquí.</p>
          )}
          {!visible.value && <span class="mesa-oculta"><Icon name="eye" size={13} /> Oculta para los alumnos</span>}
        </section>
      </div>
      <footer class="live-barra mesa-barra">
        <div class="mesa-grupo" role="group" aria-label="Navegación">
          <button type="button" class="btn ghost sm" aria-label="Escena anterior" title="Anterior (←)" onClick$={() => conmover(-1)}>
            <Icon name="chevronLeft" size={14} />
          </button>
          <button type="button" class="btn sm" aria-label="Escena siguiente" title="Siguiente (→ o espacio)" onClick$={() => conmover(1)}>
            Siguiente <Icon name="chevronRight" size={14} />
          </button>
          <span class="mesa-pos" title={actual?.titulo}>
            <b>{idx >= 0 ? idx + 1 : "–"}</b>/{props.escenas.length}
            {actual && <span class="mesa-pos-fase" style={`--ph:var(--ph-${fase(actual.fase)})`}>{PHASE_BY_ID[actual.fase]?.short ?? actual.fase}</span>}
          </span>
        </div>
        <div class="mesa-grupo" role="group" aria-label="Qué ven los alumnos">
          <button type="button" class="btn ghost sm" aria-pressed={visible.value} aria-label={visible.value ? "Ocultar a todos" : "Mostrar a todos"} title="Mostrar u ocultar (h)" onClick$={conmutarVisible}>
            <Icon name="eye" size={14} /> {visible.value ? "Visible" : "Oculta"}
          </button>
          <span class="live-modo mesa-seg" role="group" aria-label="Modo de la clase" title="Guiado: tu escena arrastra a todos. Libre: cada uno avanza a su ritmo.">
            {(["guiado", "libre"] as const).map((m) => (
              <button
                key={m}
                type="button"
                class="btn ghost sm"
                aria-pressed={props.estado.modo === m}
                onClick$={async () => {
                  try {
                    await api.liveModo(props.lesson, m);
                  } catch (e) {
                    if (!requireLogin(e)) toast(session, errMsg(e), "bad");
                  }
                }}
              >
                {m === "guiado" ? "Guiado" : "Libre"}
              </button>
            ))}
          </span>
        </div>
        <form class="live-msg mesa-grupo" preventdefault:submit onSubmit$={mandarMensaje} aria-label="Mensaje a todos">
          <input type="text" maxLength={200} placeholder="Mensaje a todos…" aria-label="Mensaje a todos" value={texto.value} onInput$={(_, el) => (texto.value = el.value)} />
          <button type="submit" class="btn ghost sm" aria-label="Enviar mensaje" disabled={!texto.value.trim()}>
            <Icon name="send" size={14} />
          </button>
        </form>
        {actual && (
          <details class="mesa-mas">
            <summary class="btn ghost sm" aria-label="Más acciones de esta escena">
              <Icon name="menu" size={14} /> Más
            </summary>
            <div class="mesa-mas-menu">
              <button
                type="button"
                title="Borra los votos de esta escena (empieza en cero)"
                onClick$={async () => {
                  try {
                    await api.liveVotosReiniciar(props.lesson, actual.id);
                    toast(session, "Votos de la escena en cero", "ok");
                  } catch (e) {
                    if (!requireLogin(e)) toast(session, errMsg(e), "bad");
                  }
                }}
              >
                <Icon name="refresh" size={14} /> Reiniciar votos
              </button>
              <button
                type="button"
                title="Vacía el muro del grupo de esta escena"
                onClick$={async () => {
                  try {
                    await api.liveMuroVaciar(props.lesson, actual.id);
                    toast(session, "Muro de la escena vacío", "ok");
                  } catch (e) {
                    if (!requireLogin(e)) toast(session, errMsg(e), "bad");
                  }
                }}
              >
                <Icon name="trash" size={14} /> Vaciar muro
              </button>
              {actual.id === "11-probar-medir" && (
                <button type="button" onClick$={emparejar}>
                  <Icon name="users" size={14} /> Emparejar
                </button>
              )}
              {actual.id === "08-avatar" && (
                <span class="live-animos" role="group" aria-label="Ánimo de los avatares">
                  {(["feliz", "pensando", "sorprendido"] as const).map((a) => (
                    <button
                      key={a}
                      type="button"
                      aria-pressed={props.estado.parametro === a}
                      onClick$={async () => {
                        try {
                          await api.liveEscena(props.lesson, "08-avatar", visible.value, { parametro: a });
                        } catch (e) {
                          if (!requireLogin(e)) toast(session, errMsg(e), "bad");
                        }
                      }}
                    >
                      {a}
                    </button>
                  ))}
                </span>
              )}
              {!extras && <span class="mesa-mas-nota">Atajos: ← → espacio cambian · h oculta</span>}
            </div>
          </details>
        )}
        <span class="mesa-espacio" />
        <span class="chip" title="Alumnos conectados al stream">
          <Icon name="users" size={13} /> {props.conectados}
        </span>
        <span class={`mesa-reloj${pasado ? " pasado" : ""}`} title={actual ? `Cronómetro de la escena · prevista ${actual.duracion_min} min` : "Cronómetro de la escena"}>
          <span class="mesa-reloj-t"><Icon name="clock" size={13} /> {mmss(segundos.value)}{actual ? <small> / {actual.duracion_min}′</small> : null}</span>
          <i aria-hidden="true"><i style={`width:${avanceReloj}%`} /></i>
        </span>
        {props.onVista$ && (
          <button type="button" class="btn ghost sm" aria-label="Ver la clase como la ve un alumno" title="Terminal, visor y agente con tu cuenta" onClick$={() => props.onVista$?.(true)}>
            <Icon name="monitor" size={14} /> Como alumno
          </button>
        )}
        {enVivo.value ? (
          <button type="button" class={`btn sm ${pendienteCerrar.value ? "bad" : "ghost"}`} aria-label="Cerrar el LIVE" onClick$={cerrar} onBlur$={() => (pendienteCerrar.value = false)}>
            {pendienteCerrar.value ? "¿Cerrar de verdad?" : "Cerrar LIVE"}
          </button>
        ) : (
          <button type="button" class="btn sm ok" aria-label="Iniciar el LIVE" onClick$={iniciar}>
            <Icon name="play" size={14} /> Iniciar LIVE
          </button>
        )}
      </footer>
    </div>
  );
});
