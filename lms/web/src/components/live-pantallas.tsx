import { $, component$, type QRL, useSignal, useStore, useVisibleTask$ } from "@builder.io/qwik";
import { api, errMsg, requireLogin, type AccesoAlumno } from "~/lib/api";
import { Icon } from "~/components/icon";
import { LiveVisor, type EstadoProyectos } from "~/components/live-visor";

// Herramientas del instructor en la mesa del LIVE:
// · PantallaAlumno: lo que tiene delante un alumno, en grande: su DeepSeek Harness (la misma sesión: puedes escribirle
//   para ayudarlo) y su Visor (lo que va construyendo). Esc o la × la cierran.
// · AccesosAlumnos: un enlace por alumno que inicia su sesión y lo deja en este LIVE (12 h), para el chat de la clase.

const conEsc = (cerrar: () => void) => {
  const k = (e: KeyboardEvent) => e.key === "Escape" && cerrar();
  window.addEventListener("keydown", k);
  return () => window.removeEventListener("keydown", k);
};

export const PantallaAlumno = component$((props: { lesson: string; escena: string; sub: string; nombre: string; onCerrar$: QRL<() => void> }) => {
  const dsh = useStore({ url: "", error: "", cargando: true, vuelta: 0 });
  const ruta = useSignal("");
  const proy = useStore<EstadoProyectos>({ lista: [], conocidas: [], cargada: false, manual: false });

  const cargar = $(async () => {
    dsh.cargando = true;
    dsh.error = "";
    try {
      dsh.url = (await api.dshVer(props.sub)).url;
      dsh.vuelta++;
    } catch (e) {
      if (!requireLogin(e)) dsh.error = errMsg(e);
    } finally {
      dsh.cargando = false;
    }
  });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async ({ cleanup }) => {
    cleanup(conEsc(() => props.onCerrar$()));
    await cargar();
  });

  return (
    <div class="mesa-capa" role="dialog" aria-modal="true" aria-label={`Pantalla de ${props.nombre}`}>
      <div class="mesa-capa-caja mesa-pantalla">
        <header class="mesa-capa-cab">
          <Icon name="monitor" size={16} />
          <b>{props.nombre}</b>
          <span class="xs muted">Su DeepSeek Harness y su visor, en vivo. Lo que escribas aquí lo ve en su pantalla.</span>
          <button type="button" class="lv-ico-btn" aria-label="Recargar" title="Recargar" onClick$={cargar}>
            <Icon name="refresh" size={15} />
          </button>
          <button type="button" class="lv-ico-btn" aria-label="Cerrar (Esc)" title="Cerrar (Esc)" onClick$={props.onCerrar$}>
            <Icon name="x" size={16} />
          </button>
        </header>
        <div class="mesa-pantalla-cuerpo">
          <section class="mesa-pantalla-dsh" aria-label="Su DeepSeek Harness">
            {dsh.url ? (
              <iframe key={dsh.vuelta} src={dsh.url} title={`DeepSeek Harness de ${props.nombre}`} allow="clipboard-read; clipboard-write" />
            ) : (
              <p class="live-vacio">{dsh.cargando ? "Abriendo su DeepSeek Harness…" : dsh.error || "Todavía no abrió DeepSeek Harness."}</p>
            )}
          </section>
          <section class="mesa-pantalla-visor" aria-label="Su visor">
            <LiveVisor lesson={props.lesson} escena={props.escena} sub={props.sub} ruta={ruta} proy={proy} />
          </section>
        </div>
      </div>
    </div>
  );
});

export const AccesosAlumnos = component$((props: { lesson: string; onCerrar$: QRL<() => void> }) => {
  const st = useStore<{ lista: AccesoAlumno[]; vence: string; error: string; cargando: boolean; copiado: string }>({
    lista: [],
    vence: "",
    error: "",
    cargando: true,
    copiado: "",
  });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async ({ cleanup }) => {
    cleanup(conEsc(() => props.onCerrar$()));
    try {
      const r = await api.liveAccesos(props.lesson);
      st.lista = r.alumnos;
      st.vence = r.vence;
    } catch (e) {
      if (!requireLogin(e)) st.error = errMsg(e);
    } finally {
      st.cargando = false;
    }
  });

  const copiar = $(async (texto: string, id: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      st.copiado = id;
      setTimeout(() => (st.copiado = ""), 2000);
    } catch {
      /* sin portapapeles */
    }
  });

  const vence = st.vence ? new Date(st.vence).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" }) : "";
  const todos = st.lista.map((a) => `${a.nombre}: ${a.url}`).join("\n\n");

  return (
    <div class="mesa-capa" role="dialog" aria-modal="true" aria-label="Enlaces de acceso">
      <div class="mesa-capa-caja mesa-accesos">
        <header class="mesa-capa-cab">
          <Icon name="link" size={16} />
          <b>Enlaces de acceso directo</b>
          <button type="button" class="lv-ico-btn" aria-label="Cerrar (Esc)" title="Cerrar (Esc)" onClick$={props.onCerrar$}>
            <Icon name="x" size={16} />
          </button>
        </header>
        <p class="sm muted mesa-accesos-nota">
          Cada enlace inicia la sesión de <b>ese</b> alumno y lo deja en este LIVE, sin contraseña. Mándaselo solo a él (por privado o en el chat del
          grupo){vence && <> · valen hasta las {vence}</>}.
        </p>
        {st.cargando && <p class="live-vacio">Generando…</p>}
        {st.error && <p class="sm bad">{st.error}</p>}
        {!st.cargando && !st.error && st.lista.length === 0 && <p class="live-vacio">Este curso no tiene alumnos todavía.</p>}
        {st.lista.length > 0 && (
          <>
            <button type="button" class="btn sm" onClick$={() => copiar(todos, "*")}>
              <Icon name={st.copiado === "*" ? "check" : "copy"} size={14} />
              {st.copiado === "*" ? "Copiados" : `Copiar los ${st.lista.length} (nombre: enlace)`}
            </button>
            <ul class="mesa-accesos-lista">
              {st.lista.map((a) => (
                <li key={a.sub}>
                  <span>
                    <b>{a.nombre || a.email}</b>
                    <small>{a.email}</small>
                  </span>
                  <button type="button" class="btn ghost sm" onClick$={() => copiar(a.url, a.sub)}>
                    <Icon name={st.copiado === a.sub ? "check" : "copy"} size={13} />
                    {st.copiado === a.sub ? "Copiado" : "Copiar enlace"}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
});
