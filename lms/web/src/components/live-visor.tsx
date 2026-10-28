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
  n: number; // marco que lo envió: al cambiar de marco solo quedan los del nuevo
}

// Un marco del visor. Hay uno visible (listo) y, mientras carga la versión nueva, otro encima oculto.
interface Marco {
  n: number;
  src: string;
  listo: boolean;
  conservar: boolean; // al mostrarse copia el scroll y lo escrito del marco anterior
}

const QUIETO_MS = 2500; // el agente terminó una ráfaga: la versión no cambia en este tiempo
const ENTRE_MS = 4000; // como mucho un refresco cada 4 s
const DIR_OK = /^[A-Za-z0-9._-]{1,128}$/;

// Carpeta del proyecto que se mira: el primer segmento de la ruta (vacío si es un archivo suelto).
const dirDe = (ruta: string) => {
  const i = ruta.indexOf("/");
  const d = i > 0 ? ruta.slice(0, i) : "";
  return DIR_OK.test(d) && d !== "." && d !== ".." ? d : "";
};
// Versión «base.css.proy»: base+css dicen si hay que refrescar; proy, si apareció un proyecto.
const partes = (v: string) => {
  const [b = "", c = "", p] = v.split(".");
  return { contenido: `${b}.${c}`, base: b, css: c, proy: p };
};
const conR = (u: string, n: number) => `${u}${u.includes("?") ? "&" : "?"}r=${n}`;

// LiveVisor: el visor del alumno. Muestra lo que guarda en /trabajo (servido por el LMS, sin instalar
// nada), se refresca solo cuando el contenido deja de cambiar y enseña los errores de la página.
// Refresco sin corte: la versión nueva carga en un segundo marco oculto encima del actual; al terminar
// se le copia el scroll (y lo escrito en los campos), se muestra y el viejo se quita. Sin parpadeo.
export const LiveVisor = component$((props: { lesson: string; escena: string; sub: string; ruta: Signal<string>; proy: EstadoProyectos }) => {
  const ruta = props.ruta; // vive en el panel: sobrevive al cambiar de pestaña
  const tam = useSignal<"movil" | "tablet" | "escritorio">("escritorio");
  // Fuente del marco: tu carpeta o el Image Studio. JMRV es una app viva:
  // el sondeo de /trabajo no lo toca (abajo se salta cuando fuente es jmrv).
  const fuente = useSignal<"trabajo" | "jmrv">("trabajo");
  const pila = useSignal<HTMLDivElement>();
  const auto = useSignal(true); // refrescar solo; apagado, se avisa con «Hay cambios»
  const hayCambios = useSignal(false);
  const base = `/vista/${encodeURIComponent(props.sub)}/`;
  const marcos = useStore<{ seq: number; lista: Marco[] }>({ seq: 1, lista: [{ n: 1, src: conR(`${base}${ruta.value}`, 1), listo: true, conservar: false }] });
  // aplicada: versión que se ve; vista: la última leída y desde cuándo no cambia.
  const ver = useStore({ iniciada: false, dir: "", aplicada: "", vista: "", desde: 0, ultimo: 0 });
  const consola = useStore<{ items: Consola[]; abierta: boolean }>({ items: [], abierta: false });
  const proy = props.proy; // vive en el panel: sobrevive al cambiar de pestaña
  const escenaRef = useSignal(props.escena);
  escenaRef.value = props.escena;

  // Muestra el marco n (ya cargado): copia scroll y campos del visible, y quita el viejo en el mismo pintado.
  const mostrar = $((n: number) => {
    const f = marcos.lista.find((x) => x.n === n);
    if (!f || f.listo) return;
    const visible = marcos.lista.find((x) => x.listo);
    const el = (k: number) => pila.value?.querySelector<HTMLIFrameElement>(`iframe[data-n="${k}"]`) ?? null;
    const nuevo = el(n);
    const viejo = visible ? el(visible.n) : null;
    const copiar = () => {
      if (!f.conservar || !nuevo || !viejo) return;
      try {
        const wv = viejo.contentWindow!, wn = nuevo.contentWindow!;
        const dv = viejo.contentDocument!, dn = nuevo.contentDocument!;
        wn.scrollTo(wv.scrollX, wv.scrollY);
        // Paneles con scroll propio (un chat, una lista) y lo que el alumno escribió, por id.
        dv.querySelectorAll<HTMLElement>("[id]").forEach((a) => {
          const b = dn.getElementById(a.id);
          if (!b) return;
          if (a.scrollTop > 0 || a.scrollLeft > 0) {
            b.scrollTop = a.scrollTop;
            b.scrollLeft = a.scrollLeft;
          }
          const campo = a as HTMLInputElement;
          const escribible = a.tagName === "TEXTAREA" || (a.tagName === "INPUT" && !["file", "password", "checkbox", "radio", "hidden"].includes(campo.type));
          if (escribible && b.tagName === a.tagName && campo.value !== campo.defaultValue) (b as HTMLInputElement).value = campo.value;
        });
      } catch {
        /* otro origen o página a medio cargar: se muestra sin copiar */
      }
    };
    // Si el alumno escribía dentro de su página, el foco (y el cursor) pasan al marco nuevo.
    let foco: { id: string; ini: number | null; fin: number | null } | null = null;
    try {
      const act = viejo && document.activeElement === viejo ? (viejo.contentDocument?.activeElement as HTMLInputElement | null) : null;
      if (f.conservar && act?.id) foco = { id: act.id, ini: act.selectionStart ?? null, fin: act.selectionEnd ?? null };
    } catch {
      /* sin acceso */
    }
    copiar();
    requestAnimationFrame(() => {
      copiar(); // otra vez: la página pudo crecer tras el load
      if (!marcos.lista.some((x) => x.n === n)) return;
      marcos.lista = marcos.lista.filter((x) => x.n === n).map((x) => ({ ...x, listo: true }));
      consola.items = consola.items.filter((c) => c.n === n);
      if (foco && nuevo) {
        const fo = foco;
        setTimeout(() => {
          try {
            const b = nuevo.contentDocument?.getElementById(fo.id) as HTMLInputElement | null;
            if (!b) return;
            nuevo.focus();
            b.focus({ preventScroll: true });
            if (fo.ini !== null && typeof b.setSelectionRange === "function") b.setSelectionRange(fo.ini, fo.fin ?? fo.ini);
          } catch {
            /* tipo de campo sin selección */
          }
        }, 30);
      }
    });
  });

  // Carga la ruta actual en un marco nuevo encima del visible. conservar: misma página (refresco),
  // se queda en la subpágina donde navegó el alumno y se copia el scroll; si no, abre la ruta de la barra.
  const cargar = $((conservar: boolean) => {
    const n = ++marcos.seq;
    const visible = marcos.lista.find((x) => x.listo);
    let src = `${base}${ruta.value}`;
    if (conservar && visible) {
      try {
        const loc = pila.value?.querySelector<HTMLIFrameElement>(`iframe[data-n="${visible.n}"]`)?.contentWindow?.location;
        if (loc && loc.origin === location.origin && loc.pathname.startsWith(base)) {
          const q = new URLSearchParams(loc.search);
          q.delete("r");
          src = loc.pathname + (q.toString() ? `?${q}` : "");
        }
      } catch {
        /* sin acceso: la ruta de la barra */
      }
    }
    src = conR(src, n);
    // Un marco a medio cargar se descarta: solo cuenta el último pedido.
    marcos.lista = visible ? [visible, { n, src, listo: false, conservar }] : [{ n, src, listo: true, conservar: false }];
    if (!visible) consola.items = [];
    ver.aplicada = ver.vista;
    ver.ultimo = Date.now();
    hayCambios.value = false;
    setTimeout(() => mostrar(n), 10000); // si el load no llega, se muestra igual
  });

  // Solo cambiaron hojas de estilo: se cambian en caliente (sin recargar). false si no se pudo.
  const cssEnCaliente = $(() => {
    const visible = marcos.lista.find((x) => x.listo);
    try {
      const doc = visible && pila.value?.querySelector<HTMLIFrameElement>(`iframe[data-n="${visible.n}"]`)?.contentDocument;
      if (!doc) return false;
      let hechas = 0;
      doc.querySelectorAll<HTMLLinkElement>('link[rel~="stylesheet"]').forEach((l) => {
        const u = new URL(l.href, doc.baseURI);
        if (u.origin !== location.origin) return;
        u.searchParams.set("v", String(Date.now()));
        const c = l.cloneNode() as HTMLLinkElement;
        c.href = u.href;
        c.addEventListener("load", () => l.remove(), { once: true }); // la vieja se va cuando la nueva ya pinta
        c.addEventListener("error", () => c.remove(), { once: true });
        l.after(c);
        hechas++;
      });
      return hechas > 0;
    } catch {
      return false;
    }
  });

  // Aplica la versión leída: hojas en caliente si solo cambió CSS, si no un refresco en doble marco.
  const aplicar = $(async () => {
    const a = partes(ver.aplicada), v = partes(ver.vista);
    const soloCss = !!a.base && a.base === v.base && a.css !== v.css;
    if (soloCss && (await cssEnCaliente())) {
      ver.aplicada = ver.vista;
      ver.ultimo = Date.now();
      hayCambios.value = false;
      return;
    }
    await cargar(true);
  });

  const recargar = $(() => {
    cargar(true);
    api.liveEvento(props.lesson, "visor", ruta.value.slice(0, 80)).catch(() => undefined);
  });

  // Sondeo de la versión del proyecto que se mira (cada 2 s; 1,25 s mientras hay cambios en curso).
  // Refresca cuando la versión lleva QUIETO_MS sin cambiar y pasaron ENTRE_MS desde el último refresco.
  // Se detiene con la pestaña oculta o al cerrar el panel.
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ cleanup }) => {
    let alMontar = true; // al abrir el panel siempre se relee la lista de proyectos
    let vivo = true;
    let t: ReturnType<typeof setTimeout> | undefined;
    const sondear = async () => {
      if (document.hidden) return;
      if (fuente.value === "jmrv") return; // JMRV es una app viva: no se recarga por sondeo
      try {
        const dir = dirDe(ruta.value);
        const v = (await api.vistaVersion(dir)).version || "";
        const ahora = Date.now();
        let proyCambio = false;
        if (v) {
          if (!ver.iniciada || dir !== ver.dir) {
            // Primera lectura o se cambió de proyecto: la página ya se cargó con lo último.
            ver.iniciada = true;
            ver.dir = dir;
            ver.aplicada = ver.vista = v;
            ver.desde = ahora;
          } else if (v !== ver.vista) {
            const a = partes(ver.vista), b = partes(v);
            proyCambio = b.proy === undefined ? true : a.proy !== b.proy; // API vieja: cualquier cambio
            ver.vista = v;
            ver.desde = ahora;
          }
          if (partes(ver.aplicada).contenido === partes(ver.vista).contenido) {
            ver.aplicada = ver.vista; // solo cambió la lista de proyectos: nada que refrescar
          } else if (ahora - ver.desde >= QUIETO_MS && ahora - ver.ultimo >= ENTRE_MS) {
            if (auto.value) await aplicar();
            else hayCambios.value = true;
          }
        }
        // Proyectos: al entrar y cuando aparece uno. Un proyecto nuevo se abre solo si no elegiste otro a mano.
        if (alMontar || proyCambio) {
          const lista = (await api.vistaProyectos()) ?? [];
          const nuevos = lista.filter((x) => !proy.conocidas.includes(x.ruta));
          proy.lista = lista;
          if (proy.cargada && nuevos.length > 0 && !proy.manual) {
            ruta.value = nuevos[0].ruta;
            await cargar(false);
          }
          proy.conocidas = lista.map((x) => x.ruta);
          proy.cargada = true;
          alMontar = false;
        }
      } catch {
        /* sin conexión: se reintenta */
      }
    };
    const ciclo = async () => {
      await sondear();
      if (vivo) t = setTimeout(ciclo, ver.vista !== ver.aplicada ? 1250 : 2000);
    };
    ciclo();
    cleanup(() => {
      vivo = false;
      if (t) clearTimeout(t);
    });
  });

  // Cada marco nuevo avisa al terminar de cargar (escucha nativa: «load» no burbujea). Se re-engancha
  // cuando cambia la lista o el contenedor (al volver de JMRV los marcos se crean de nuevo).
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ track }) => {
    track(() => marcos.lista);
    track(() => pila.value);
    pila.value?.querySelectorAll<HTMLIFrameElement>("iframe[data-n]").forEach((f) => {
      if (f.dataset.escucha) return;
      f.dataset.escucha = "1";
      const n = Number(f.dataset.n);
      f.addEventListener("load", () => mostrar(n));
      try {
        if (f.contentDocument?.readyState === "complete" && f.contentWindow?.location.href !== "about:blank") mostrar(n);
      } catch {
        /* aún sin documento */
      }
    });
  });

  // Mensajes de la página del alumno: errores de consola y evidencias. Valen los del marco visible y
  // los del que está cargando (sus errores quedan al cambiar de marco).
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ cleanup }) => {
    const alRecibir = (e: MessageEvent) => {
      if (e.origin !== location.origin || !e.source) return;
      let n = 0;
      pila.value?.querySelectorAll<HTMLIFrameElement>("iframe[data-n]").forEach((f) => {
        if (f.contentWindow === e.source) n = Number(f.dataset.n);
      });
      if (!n) return;
      const d = e.data;
      if (!d || typeof d !== "object") return;
      if (d.tipo === "consola") {
        consola.items = [...consola.items.slice(-49), { nivel: String(d.nivel || "error"), mensaje: String(d.mensaje || "").slice(0, 300), archivo: d.archivo, linea: d.linea, n }];
        consola.abierta = true;
        api.liveEvento(props.lesson, "error", String(d.mensaje || "").slice(0, 80)).catch(() => undefined);
      } else if (d.tipo === "evidencia" && ["microfono", "flyer", "hallazgo"].includes(d.tipo_evidencia)) {
        api.liveEvidencia(props.lesson, escenaRef.value, d.tipo_evidencia).catch(() => undefined);
      }
    };
    window.addEventListener("message", alRecibir);
    cleanup(() => window.removeEventListener("message", alRecibir));
  });

  const url = `${base}${ruta.value}`;
  const jmrvUrl = "/jmrv/";

  return (
    <div class="visor">
      <div class="visor-barra">
        <span class="visor-tam" role="radiogroup" aria-label="Fuente del visor">
          {( [["trabajo", "Mi trabajo"], ["jmrv", "Imágenes IA"]] as const ).map(([id, nombre]) => (
            <button key={id} type="button" class="btn ghost sm" role="radio" aria-checked={fuente.value === id} aria-pressed={fuente.value === id} onClick$={() => (fuente.value = id)}>
              {nombre}
            </button>
          ))}
        </span>
        {fuente.value === "trabajo" && (
          <>
            {proy.lista.length > 0 && (
          <select
            class="visor-proy"
            aria-label="Proyecto a mostrar"
            onChange$={(_, el) => {
              if (el.value) {
                proy.manual = true;
                ruta.value = el.value;
                cargar(false);
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
            cargar(false);
          }}
        />
        <button type="button" class="btn ghost sm" aria-label="Recargar" onClick$={recargar}>
          <Icon name="refresh" size={14} />
        </button>
        <span class="visor-tam">
          <button
            type="button"
            class="btn ghost sm"
            role="switch"
            aria-checked={auto.value}
            title="Refrescar solo cuando la IA o tú terminan de guardar"
            onClick$={() => {
              auto.value = !auto.value;
              if (auto.value && hayCambios.value) aplicar();
            }}
          >
            Auto
          </button>
        </span>
        {!auto.value && hayCambios.value && (
          <button type="button" class="btn sm" style={{ borderRadius: "999px", fontSize: ".75rem", padding: ".18rem .6rem" }} onClick$={recargar}>
            Hay cambios · Actualizar
          </button>
        )}
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
          </>
        )}
        {fuente.value === "jmrv" && (
          <a class="btn ghost sm" href={jmrvUrl} target="_blank" rel="noopener" aria-label="Abrir JMRV en una pestaña nueva">
            <Icon name="external" size={14} />
          </a>
        )}
      </div>
      <div class="visor-lienzo">
        {fuente.value === "jmrv" ? (
          <iframe
            class="visor-frame visor-escritorio"
            allow="microphone; clipboard-write"
            sandbox="allow-scripts allow-same-origin allow-forms"
            title="JMRV · Image Studio"
            src={jmrvUrl}
          />
        ) : (
          <div ref={pila} class={`visor-frame visor-${tam.value}`} style={{ position: "relative" }}>
            {marcos.lista.map((m) => (
              <iframe
                key={m.n}
                data-n={m.n}
                allow="microphone; clipboard-write"
                sandbox="allow-scripts allow-same-origin allow-forms"
                title="Visor"
                aria-hidden={m.listo ? undefined : "true"}
                tabIndex={m.listo ? undefined : -1}
                style={{ position: "absolute", inset: "0", width: "100%", height: "100%", border: "0", background: "#fff", opacity: m.listo ? "1" : "0", pointerEvents: m.listo ? "auto" : "none" }}
                src={m.src}
              />
            ))}
          </div>
        )}
      </div>
      {fuente.value === "trabajo" && consola.abierta && (
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
