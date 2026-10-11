import { $, component$, useSignal, useStore, useVisibleTask$, type Signal } from "@builder.io/qwik";
import { api } from "~/lib/api";
import { Icon } from "~/components/icon";

export interface EstadoProyectos {
  lista: { ruta: string; nombre: string; mod: number }[];
  conocidas: string[]; // rutas vistas antes: lo que no esté aquí es un proyecto nuevo
  cargada: boolean; // ya se leyó la lista al menos una vez
  manual: boolean; // el alumno eligió o escribió una ruta: no se le cambia sola
}

interface Consola {
  nivel: string;
  mensaje: string;
  archivo?: string;
  linea?: number;
}

// LiveVisor: el visor del alumno. Muestra lo que guarda en /trabajo (servido por el LMS, sin instalar
// nada), se recarga solo cuando el contenido cambia y enseña los errores de la página con archivo y línea.
export const LiveVisor = component$((props: { lesson: string; escena: string; sub: string; ruta: Signal<string>; proy: EstadoProyectos }) => {
  const ruta = props.ruta; // vive en el panel: sobrevive al cambiar de pestaña
  const tam = useSignal<"movil" | "tablet" | "escritorio">("escritorio");
  const recarga = useSignal(0);
  const marco = useSignal<HTMLIFrameElement>();
  const consola = useStore<{ items: Consola[]; abierta: boolean }>({ items: [], abierta: false });
  const proy = props.proy; // vive en el panel: sobrevive al cambiar de pestaña
  const escenaRef = useSignal(props.escena);
  escenaRef.value = props.escena;

  const recargar = $(() => {
    recarga.value++;
    consola.items = [];
    api.liveEvento(props.lesson, "visor", ruta.value.slice(0, 80)).catch(() => undefined);
  });

  // Sondeo de la versión cada 2 s: si cambia, recarga. Se detiene con la pestaña oculta o al cerrar el panel.
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ cleanup }) => {
    let ultima = "";
    let alMontar = true; // al abrir el panel siempre se relee la lista de proyectos
    const sondear = async () => {
      if (document.hidden) return;
      try {
        const v = (await api.vistaVersion()).version;
        const cambio = !!ultima && !!v && v !== ultima;
        if (cambio) {
          recarga.value++;
          consola.items = [];
        }
        if (v) ultima = v;
        // Proyectos: al entrar y cada vez que algo cambia. Un proyecto nuevo se abre solo si no elegiste otro a mano.
        if (alMontar || cambio) {
          const lista = (await api.vistaProyectos()) ?? [];
          const nuevos = lista.filter((x) => !proy.conocidas.includes(x.ruta));
          proy.lista = lista;
          if (proy.cargada && nuevos.length > 0 && !proy.manual) {
            ruta.value = nuevos[0].ruta;
            recarga.value++;
          }
          proy.conocidas = lista.map((x) => x.ruta);
          proy.cargada = true;
          alMontar = false;
        }
      } catch {
        /* sin conexión: se reintenta */
      }
    };
    sondear();
    const t = setInterval(sondear, 2000);
    cleanup(() => clearInterval(t));
  });

  // Mensajes de la página del alumno: errores de consola y evidencias.
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ cleanup }) => {
    const alRecibir = (e: MessageEvent) => {
      if (e.origin !== location.origin || e.source !== marco.value?.contentWindow) return;
      const d = e.data;
      if (!d || typeof d !== "object") return;
      if (d.tipo === "consola") {
        consola.items = [...consola.items.slice(-49), { nivel: String(d.nivel || "error"), mensaje: String(d.mensaje || "").slice(0, 300), archivo: d.archivo, linea: d.linea }];
        consola.abierta = true;
        api.liveEvento(props.lesson, "error", String(d.mensaje || "").slice(0, 80)).catch(() => undefined);
      } else if (d.tipo === "evidencia" && ["microfono", "flyer", "hallazgo"].includes(d.tipo_evidencia)) {
        api.liveEvidencia(props.lesson, escenaRef.value, d.tipo_evidencia).catch(() => undefined);
      }
    };
    window.addEventListener("message", alRecibir);
    cleanup(() => window.removeEventListener("message", alRecibir));
  });

  const base = `/vista/${encodeURIComponent(props.sub)}/`;
  const url = `${base}${ruta.value}`;

  return (
    <div class="visor">
      <div class="visor-barra">
        {proy.lista.length > 0 && (
          <select
            class="visor-proy"
            aria-label="Proyecto a mostrar"
            onChange$={(_, el) => {
              if (el.value) {
                proy.manual = true;
                ruta.value = el.value;
                recarga.value++;
              }
            }}
          >
            <option value="">Proyectos…</option>
            {proy.lista.map((x) => (
              <option key={x.ruta} value={x.ruta} selected={ruta.value === x.ruta}>
                {x.nombre}
              </option>
            ))}
          </select>
        )}
        <input
          type="text"
          class="visor-ruta"
          aria-label="Ruta dentro de tu carpeta de trabajo"
          placeholder="index.html"
          value={ruta.value}
          onChange$={(_, el) => {
            proy.manual = true;
            ruta.value = el.value.replace(/^\/+/, "");
            recarga.value++;
          }}
        />
        <button type="button" class="btn ghost sm" aria-label="Recargar" onClick$={recargar}>
          <Icon name="refresh" size={14} />
        </button>
        <a class="btn ghost sm" href={url} target="_blank" rel="noopener" aria-label="Abrir en una pestaña nueva">
          <Icon name="external" size={14} />
        </a>
        <span class="visor-tam" role="radiogroup" aria-label="Tamaño de pantalla">
          {(
            [
              ["movil", "Móvil"],
              ["tablet", "Tablet"],
              ["escritorio", "Escritorio"],
            ] as const
          ).map(([id, nombre]) => (
            <button key={id} type="button" class="btn ghost sm" role="radio" aria-checked={tam.value === id} aria-pressed={tam.value === id} onClick$={() => (tam.value = id)}>
              {nombre}
            </button>
          ))}
        </span>
        <button type="button" class="btn ghost sm" aria-expanded={consola.abierta} onClick$={() => (consola.abierta = !consola.abierta)}>
          Consola{consola.items.length > 0 ? ` (${consola.items.length})` : ""}
        </button>
      </div>
      <div class="visor-lienzo">
        <iframe
          key={`${url}#${recarga.value}`}
          ref={marco}
          class={`visor-frame visor-${tam.value}`}
          allow="microphone; clipboard-write"
          sandbox="allow-scripts allow-same-origin allow-forms"
          title="Visor"
          src={`${url}${url.includes("?") ? "&" : "?"}r=${recarga.value}`}
        />
      </div>
      {consola.abierta && (
        <div class="visor-consola" aria-label="Consola de la página">
          {consola.items.length === 0 ? (
            <p class="live-vacio">Sin errores. Si algo falla en tu página, aparece aquí con el archivo y la línea.</p>
          ) : (
            <>
              <button type="button" class="btn ghost sm" onClick$={() => (consola.items = [])}>
                Limpiar
              </button>
              <ul>
                {consola.items.map((c, i) => (
                  <li key={i} class={c.nivel}>
                    <b>{c.mensaje}</b>
                    {c.archivo && (
                      <span>
                        {" "}
                        {c.archivo.split("/").pop()}
                        {c.linea ? `:${c.linea}` : ""}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
});
