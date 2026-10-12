import { $, component$, type QRL, useContext, useSignal, useStore, useVisibleTask$ } from "@builder.io/qwik";
import { api, type EscenaLive, type LiveEstado, type ParejaLive } from "~/lib/api";
import { SessionContext, toast } from "~/lib/session";
import { Icon } from "~/components/icon";
import { Terminal } from "~/components/terminal";
import { LiveVisor, type EstadoProyectos } from "~/components/live-visor";
import { ChipPrueba, MisSkills, type PruebaSkill } from "~/components/mis-skills";
import { Copy } from "~/components/ui";
import { avisarEscena, temaActual, urlEscena } from "~/lib/live";
import { contar, moneda } from "~/lib/mario";

// LiveAlumno: la pantalla del alumno del LIVE. La escena actual a pantalla completa,
// cortina cuando el instructor la oculta, aviso en modo libre y panel de ayuda mínima.
export const LiveAlumno = component$((props: { lesson: string; estado: LiveEstado; aviso?: string; pareja?: ParejaLive | null; escenas?: EscenaLive[]; skillNueva?: string; staff?: boolean; onVista$?: QRL<(alumno: boolean) => void> }) => {
  const session = useContext(SessionContext);
  const escena = useSignal(props.estado.escena);
  const visible = useSignal(props.estado.visible);
  const modo = useSignal(props.estado.modo);
  const mensaje = useSignal(props.estado.mensaje);
  const local = useSignal(""); // escena local en modo libre
  const completa = useSignal(false);
  const tema = useSignal("");
  const rutaVisor = useSignal("");
  const proyVisor = useStore<EstadoProyectos>({ lista: [], conocidas: [], cargada: false, manual: false });
  const logres = useStore<{ ids: string[] }>({ ids: [] }); // escenas donde ya pulsé «Lo logré»
  const puntaje = useStore({ total: 0, mostrado: 0, golpe: 0, suma: 100 }); // puntaje acumulado y el golpe de la animación
  const deshacerDe = useSignal(""); // escena que aún se puede deshacer (10 s)
  const panel = useSignal<"" | "terminal" | "visor" | "agente" | "skills" | "ayuda">("");
  const termAbierta = useSignal(false); // la terminal se queda montada al cambiar de pestaña
  const skillsAbierta = useSignal(false); // «Mis skills» también: sigue atenta a la prueba aunque cambies de pestaña
  const prueba = useStore<PruebaSkill>({ estado: "", nombre: "", desde: 0 });
  const marco = useSignal<HTMLIFrameElement>();

  // Sigue el stream: cada evento estado actualiza escena/cortina/modo/aviso.
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ track }) => {
    track(() => props.estado.escena);
    escena.value = props.estado.escena;
    visible.value = props.estado.visible;
    modo.value = props.estado.modo;
    mensaje.value = props.estado.mensaje;
    local.value = "";
  });

  // Un mensaje dirigido al alumno se muestra igual que el de todos y se apaga solo a los 30 s.
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ track, cleanup }) => {
    const a = track(() => props.aviso);
    if (!a) return;
    mensaje.value = a;
    const t = setTimeout(() => (mensaje.value = ""), 30000);
    cleanup(() => clearTimeout(t));
  });

  // Tema del LMS para la escena, y estado hacia el iframe en cada cambio.
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ track }) => {
    track(() => props.estado.escena);
    track(() => props.estado.parametro);
    tema.value = temaActual();
    avisarEscena(marco.value, props.estado);
  });

  // Latido: cada 15 s dice al instructor que sigo aquí y en qué escena (el servidor olvida a los de 40 s).
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ track, cleanup }) => {
    const esc = track(() => (modo.value === "libre" && local.value ? local.value : escena.value));
    const enviar = () => {
      api.liveLatido(props.lesson, esc).catch(() => undefined);
    };
    enviar();
    const t = setInterval(enviar, 15000);
    cleanup(() => clearInterval(t));
  });

  // Lo que ya logré, al entrar o recargar.
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async () => {
    try {
      const r = await api.liveLogres(props.lesson);
      logres.ids = r.escenas ?? [];
      puntaje.total = puntaje.mostrado = r.puntos ?? 0;
      puntaje.suma = r.suma ?? 100;
    } catch {
      /* sin lista: se ve como no hecho */
    }
  });

  const logre = $(async (id: string, hecho: boolean) => {
    try {
      const r = await api.liveLogre(props.lesson, id, hecho);
      if (r.puntos !== undefined) {
        puntaje.total = r.puntos;
        puntaje.suma = r.suma ?? puntaje.suma;
        if (hecho) {
          puntaje.golpe++; // dispara el bloque, la moneda y el conteo
          moneda();
          contar(puntaje);
        } else puntaje.mostrado = r.puntos;
      }
      logres.ids = hecho ? [...logres.ids.filter((x) => x !== id), id] : logres.ids.filter((x) => x !== id);
      deshacerDe.value = hecho ? id : "";
      if (hecho) setTimeout(() => (deshacerDe.value === id ? (deshacerDe.value = "") : null), 10000);
    } catch {
      toast(session, "No se pudo anotar. Intenta otra vez.", "bad");
    }
  });

  const abrir = $((p: "terminal" | "visor" | "agente" | "skills" | "ayuda") => {
    panel.value = panel.value === p ? "" : p;
    if (panel.value === "terminal") termAbierta.value = true;
    if (panel.value === "skills") skillsAbierta.value = true;
    // El terminal se reajusta al tamaño de su caja con el evento resize.
    setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
      if (panel.value === "terminal") window.dispatchEvent(new Event("pjg-term-foco"));
    }, 60);
  });

  // Abre un panel sin cerrarlo si ya estaba abierto (lo usa «Probar» de Mis skills para ir a la terminal).
  const irA = $((p: "terminal") => {
    if (panel.value !== p) abrir(p);
  });

  const mostrar = $((on: boolean) => {
    if (!session.me) return;
    toast(session, on ? "Pantalla completa activada" : "", "info");
  });

  const alternar = $(async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      completa.value = false;
      mostrar(false);
      return;
    }
    await document.documentElement.requestFullscreen();
    completa.value = true;
    mostrar(true);
  });

  // Escucha fullscreenchange para el icono del botón.
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(() => {
    const on = () => (completa.value = !!document.fullscreenElement);
    document.addEventListener("fullscreenchange", on);
    return () => document.removeEventListener("fullscreenchange", on);
  });

  const efectiva = modo.value === "libre" && local.value ? local.value : escena.value;

  return (
    <div class="live-alumno">
      {mensaje.value && (
        <div class="live-aviso" role="status">
          {mensaje.value}
          <button type="button" class="live-aviso-x" aria-label="Cerrar el aviso" onClick$={() => (mensaje.value = "")}>
            <Icon name="x" size={14} />
          </button>
        </div>
      )}
      {props.pareja && props.pareja.con.length > 0 && (
        <p class="live-pareja" role="status">
          Te toca con {props.pareja.con.map((c) => c.nombre).join(" y ")}
          {props.pareja.vista && (
            <>
              {" · "}
              <a href={props.pareja.vista} target="_blank" rel="noopener">
                abrir su visor
              </a>
            </>
          )}
        </p>
      )}
      {modo.value === "libre" && <p class="live-libre">Modo libre: avanza a tu ritmo con las flechas de abajo.</p>}
      <div class="live-escena">
        {efectiva ? (
          <iframe
            key={efectiva + tema.value}
            ref={marco}
            class="live-frame"
            onLoad$={() => avisarEscena(marco.value, props.estado)}
            sandbox="allow-scripts allow-same-origin"
            title="Escena"
            src={urlEscena(props.lesson, efectiva, tema.value)}
          />
        ) : (
          <p class="live-vacio">Esperando la primera escena…</p>
        )}
      </div>
      {!visible.value && <div class="live-cortina">El instructor está preparando la siguiente escena</div>}
      {modo.value === "libre" && (
        <div class="live-nav-local">
          <button type="button" class="btn ghost sm" aria-label="Escena anterior" onClick$={() => (local.value = escena.value)}>
            <Icon name="chevronLeft" size={14} />
          </button>
          <button type="button" class="btn ghost sm" aria-label="Escena siguiente" onClick$={() => (local.value = escena.value)}>
            <Icon name="chevronRight" size={14} />
          </button>
        </div>
      )}
      <div class={`live-panel${panel.value ? " abierto" : ""}`} hidden={!panel.value} aria-label="Panel de trabajo">
        {termAbierta.value && (
          <div class="live-panel-vista" hidden={panel.value !== "terminal"}>
            <Terminal />
          </div>
        )}
        {panel.value === "visor" && session.me && (
          <div class="live-panel-vista live-panel-visor">
            <LiveVisor lesson={props.lesson} escena={modo.value === "libre" && local.value ? local.value : escena.value} sub={session.me.id} ruta={rutaVisor} proy={proyVisor} />
          </div>
        )}
        {skillsAbierta.value && (
          <div class="live-panel-vista live-panel-skills" hidden={panel.value !== "skills"}>
            <MisSkills prueba={prueba} onIr$={irA} nueva={props.skillNueva} />
          </div>
        )}
        {panel.value === "agente" && (
          <div class="live-panel-vista live-panel-vacio">
            <Icon name="sparkles" size={22} />
            <p>
              <b>Tu agente de código.</b> Escríbele lo que quieres cambiar. En la terminal también puedes usar <code>jmd chat</code>.
            </p>
          </div>
        )}
        {panel.value === "ayuda" && (
          <div class="live-panel-vista live-ayuda" key={`ayuda-${modo.value === "libre" && local.value ? local.value : escena.value}`}>
            {(() => {
              const actualId = modo.value === "libre" && local.value ? local.value : escena.value; // leer las señales aquí para que el panel se repinte
              const e = props.escenas?.find((x) => x.id === actualId);
              if (!e) return <p class="live-vacio">Esta escena no tiene ayuda.</p>;
              return (
                <>
                  <h3>{e.titulo}</h3>
                  {e.comandos && e.comandos.some((c) => c.cmd) && (
                    <div class="live-ayuda-cmds">
                      <b>Comandos de esta escena</b>
                      {e.comandos
                        .filter((c) => c.cmd)
                        .map((c) => (
                          <div key={c.titulo}>
                            <span class="live-ayuda-t">{c.titulo}</span>
                            <Copy text={c.cmd} />
                          </div>
                        ))}
                    </div>
                  )}
                  {e.tareas && e.tareas.length > 0 && (
                    <div>
                      <b>Tareas</b>
                      <ul>
                        {e.tareas.map((t) => (
                          <li key={t.id}>{t.titulo}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {(!e.comandos || !e.comandos.some((c) => c.cmd)) && (!e.tareas || e.tareas.length === 0) && (
                    <p class="live-vacio">Mira la escena y sigue al instructor. No tienes nada que escribir.</p>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </div>
      <footer class="live-paneles" aria-label="Paneles del alumno">
        {(
          [
            ["terminal", "Terminal", "terminal"],
            ["visor", "Visor", "eye"],
            ["agente", "Agente", "sparkles"],
            ["skills", "Mis skills", "wand"],
            ["ayuda", "Ayuda", "help"],
          ] as const
        ).map(([id, nombre, icono]) => (
          <button
            key={id}
            type="button"
            class="btn ghost sm"
            aria-label={nombre}
            aria-expanded={panel.value === id}
            aria-pressed={panel.value === id}
            onClick$={() => abrir(id)}
          >
            <Icon name={icono} size={14} /> {nombre}
          </button>
        ))}
        {(() => {
          const id = modo.value === "libre" && local.value ? local.value : escena.value;
          const e = props.escenas?.find((x) => x.id === id);
          if (!e || !e.lo_logre) return null;
          if (logres.ids.includes(id)) {
            return (
              <span class="live-logrado" role="status">
                <Icon name="check" size={14} /> ¡Anotado!
                {deshacerDe.value === id && (
                  <button type="button" class="btn ghost sm" onClick$={() => logre(id, false)}>
                    Deshacer
                  </button>
                )}
              </span>
            );
          }
          return (
            <button type="button" class="btn sm ok" onClick$={() => logre(id, true)}>
              <Icon name="check" size={14} /> Lo logré
            </button>
          );
        })()}
        {prueba.estado && (
          <span class="live-prueba">
            <span class="live-prueba-n">{prueba.nombre}</span>
            <ChipPrueba estado={prueba.estado} />
          </span>
        )}
        {props.staff && props.onVista$ && (
          <button type="button" class="btn sm" aria-label="Volver al control del instructor" onClick$={() => props.onVista$?.(false)}>
            <Icon name="chevronLeft" size={14} /> Volver al control
          </button>
        )}
        <span class="grow" />
        {puntaje.total > 0 && (
          <span class="mario-score" role="status" aria-label={`Puntaje acumulado: ${puntaje.total}`} key={`s${puntaje.golpe}`}>
            <span class="mario-score-moneda" aria-hidden="true" />
            <span class="mario-score-x">×</span>
            <span class="mario-score-n">{String(puntaje.mostrado).padStart(6, "0")}</span>
          </span>
        )}
        <button type="button" class="btn sm" aria-label={completa.value ? "Salir de pantalla completa" : "Pantalla completa"} onClick$={alternar}>
          <Icon name="expand" size={14} /> {completa.value ? "Salir" : "Pantalla completa"}
        </button>
      </footer>
      {puntaje.golpe > 0 && (
        <div class="mario-escena" key={`g${puntaje.golpe}`} aria-hidden="true">
          <div class="mario-bloque">?</div>
          <div class="mario-moneda" />
          <div class="mario-mas">+{puntaje.suma}</div>
          <i class="mario-chispa c1" />
          <i class="mario-chispa c2" />
          <i class="mario-chispa c3" />
          <i class="mario-chispa c4" />
        </div>
      )}
    </div>
  );
});
