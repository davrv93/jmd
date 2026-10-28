import { $, component$, type QRL, useContext, useSignal, useStore, useVisibleTask$ } from "@builder.io/qwik";
import { api, type EscenaLive, type LiveEstado, type ParejaLive } from "~/lib/api";
import { SessionContext, toast } from "~/lib/session";
import { Icon } from "~/components/icon";
import { Terminal } from "~/components/terminal";
import { LiveVisor, type EstadoProyectos } from "~/components/live-visor";
import { ChipPrueba, MisSkills, type PruebaSkill } from "~/components/mis-skills";
import { Copy } from "~/components/ui";
import { avisarEscena, temaActual, urlEscena, type ConexionLive } from "~/lib/live";
import { contar, moneda } from "~/lib/mario";

// Pestañas del panel de trabajo (a la derecha o abajo de la escena, como el panel de un editor).
type Pestana = "terminal" | "visor" | "agente" | "skills";
const PESTANAS: readonly (readonly [Pestana, string, string, string])[] = [
  ["terminal", "Terminal", "Terminal", "terminal"],
  ["visor", "Visor", "Visor", "eye"],
  ["agente", "Agente", "Agente", "sparkles"],
  ["skills", "Mis skills", "Skills", "wand"],
];
const esPestana = (x: unknown): x is Pestana => PESTANAS.some(([id]) => id === x);

// Barra de actividad: la escena, las cuatro pestañas y la ayuda de la escena (barra lateral).
type Actividad = "escena" | "escenas" | Pestana | "ayuda";
const ACTIVIDAD: readonly (readonly [Actividad, string, string, string])[] = [
  ["escena", "Escena", "Escena", "escena"],
  ["escenas", "Todas las escenas", "Lista", "layers"],
  ["terminal", "Terminal", "Terminal", "terminal"],
  ["visor", "Visor", "Visor", "eye"],
  ["agente", "Agente", "Agente", "sparkles"],
  ["skills", "Mis skills", "Skills", "wand"],
  ["ayuda", "Ayuda de la escena", "Ayuda", "help"],
];

// Disposición del panel. Se guarda en localStorage (solo en este navegador) y no es nada que importe
// perder: sin almacenamiento, vuelve a la de siempre.
type Posicion = "derecha" | "abajo";
const CLAVE = "lms.live.panel";
const INICIAL: Record<Posicion, number> = { derecha: 0.42, abajo: 0.4 }; // fracción del área de trabajo
const MIN_PANEL: Record<Posicion, number> = { derecha: 340, abajo: 140 }; // px (igual que el min-width del CSS)
const MIN_ESCENA: Record<Posicion, number> = { derecha: 300, abajo: 120 }; // px
const LIMITE = { min: 0.15, max: 0.85 };

// Fracción del panel dentro de sus límites: ni el panel ni la escena bajan de su mínimo en píxeles.
function limitar(f: number, total: number, pos: Posicion): number {
  const min = Math.max(LIMITE.min, MIN_PANEL[pos] / Math.max(1, total));
  const max = Math.min(LIMITE.max, 1 - MIN_ESCENA[pos] / Math.max(1, total));
  if (!Number.isFinite(f)) f = INICIAL[pos];
  return min > max ? 0.5 : Math.min(max, Math.max(min, f));
}

// Atajos del LIVE, como en el editor: Ctrl+` la terminal (Ctrl+Ñ en teclados en español), Ctrl/Cmd+J
// el panel y Ctrl/Cmd+B la barra de actividad. En Mac, J y B van con Cmd para no quitarle a la shell
// Ctrl+B ni Ctrl+J; fuera de estos tres, la terminal recibe todas sus teclas.
type Atajo = "" | "terminal" | "panel" | "barra";
function atajo(e: KeyboardEvent, mac: boolean): Atajo {
  if (e.altKey || e.shiftKey) return "";
  const k = (e.key || "").toLowerCase();
  if ((e.ctrlKey || (mac && e.metaKey)) && (e.code === "Backquote" || k === "`" || k === "ñ")) return "terminal";
  const mod = mac ? e.metaKey && !e.ctrlKey : e.ctrlKey && !e.metaKey;
  if (!mod) return "";
  const letra = /^[a-zñ]$/.test(k);
  if (k === "j" || (!letra && e.code === "KeyJ")) return "panel";
  if (k === "b" || (!letra && e.code === "KeyB")) return "barra";
  return "";
}

// Flechas, Inicio y Fin entre los botones de un grupo (patrón «roving tabindex»). Devuelve el botón
// que recibe el foco, o null si la tecla no era de navegación.
function moverFoco(e: KeyboardEvent, caja: HTMLElement): HTMLElement | null {
  if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return null;
  const items = Array.from(caja.querySelectorAll<HTMLElement>("[data-roving]")).filter((b) => b.offsetParent !== null);
  const i = items.indexOf(document.activeElement as HTMLElement);
  if (i < 0 || items.length === 0) return null;
  e.preventDefault();
  const atras = e.key === "ArrowUp" || e.key === "ArrowLeft";
  const j = e.key === "Home" ? 0 : e.key === "End" ? items.length - 1 : (i + (atras ? -1 : 1) + items.length) % items.length;
  items.forEach((b, k) => (b.tabIndex = k === j ? 0 : -1));
  items[j].focus();
  return items[j];
}

// LiveAlumno: la pantalla del alumno del LIVE, con la forma de un editor de código. En escritorio
// (≥ 1100 px): barra de actividad a la izquierda, la escena en el centro, el panel de trabajo
// (Terminal, Visor, Agente, Mis skills) a la derecha o abajo con un divisor que se arrastra, la ayuda
// en una barra lateral y una barra de estado abajo. En tablet y móvil, cada vista a pantalla completa
// con las pestañas abajo.
export const LiveAlumno = component$(
  (props: {
    lesson: string;
    estado: LiveEstado;
    aviso?: string;
    pareja?: ParejaLive | null;
    escenas?: EscenaLive[];
    skillNueva?: string;
    staff?: boolean;
    onVista$?: QRL<(alumno: boolean) => void>;
    conexion?: ConexionLive;
    conectados?: number;
  }) => {
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
    const panel = useSignal<"" | Pestana>(""); // pestaña abierta del panel; "" = panel cerrado
    const ultima = useSignal<Pestana>("terminal"); // la que abre Ctrl/Cmd+J
    const ayuda = useSignal(false); // barra lateral (ayuda o lista de escenas)
    const ladoEscenas = useSignal(false); // la barra lateral muestra la lista de escenas en vez de la ayuda
    const termAbierta = useSignal(false); // la terminal se queda montada al cambiar de pestaña
    const skillsAbierta = useSignal(false); // «Mis skills» también: sigue atenta a la prueba aunque cambies de pestaña
    const prueba = useStore<PruebaSkill>({ estado: "", nombre: "", desde: 0 });
    const disp = useStore({ pos: "derecha" as Posicion, derecha: INICIAL.derecha, abajo: INICIAL.abajo, max: false, actividad: true });
    const movil = useSignal(false); // < 1100 px: vistas a pantalla completa
    const mac = useSignal(false);
    const arrastrando = useSignal(false);
    const marco = useSignal<HTMLIFrameElement>();
    const raiz = useSignal<HTMLDivElement>();
    const zona = useSignal<HTMLDivElement>();
    const divisor = useSignal<HTMLDivElement>();
    const barraAct = useSignal<HTMLDivElement>();
    const listaTabs = useSignal<HTMLDivElement>();
    const btnLogre = useSignal<HTMLButtonElement>();
    // Visor desacoplado: ventana flotante (centrada la primera vez) que se arrastra por su barra y se
    // redimensiona por la esquina; así la escena, la terminal y el visor se ven a la vez.
    const flot = useStore({ on: false, x: 0, y: 0, w: 0, h: 0, moviendo: false });

    // Sigue el stream: cada evento estado actualiza escena/cortina/modo/aviso.
    // eslint-disable-next-line qwik/no-use-visible-task
    useVisibleTask$(({ track }) => {
      track(() => props.estado.escena);
      escena.value = props.estado.escena;
      visible.value = props.estado.visible;
      modo.value = props.estado.modo;
      mensaje.value = props.estado.mensaje;
      // En modo guiado la escena del instructor arrastra a todos; en libre cada uno sigue donde estaba.
      if (props.estado.modo !== "libre") local.value = "";
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
      const esc = track(() => local.value || escena.value);
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

    const guardar = $(() => {
      try {
        localStorage.setItem(CLAVE, JSON.stringify({ pos: disp.pos, derecha: disp.derecha, abajo: disp.abajo, actividad: disp.actividad, ultima: ultima.value }));
      } catch {
        /* sin almacenamiento: la disposición dura esta pantalla */
      }
    });

    // Abre el panel en una pestaña. La terminal y «Mis skills» se montan la primera vez y se quedan.
    const abrirPestana = $((p: Pestana, enfocar = true) => {
      panel.value = p;
      ultima.value = p;
      if (p === "terminal") termAbierta.value = true;
      if (p === "skills") skillsAbierta.value = true;
      if (movil.value) ayuda.value = false; // en el teléfono, una vista a la vez
      guardar();
      setTimeout(() => {
        window.dispatchEvent(new Event("resize"));
        if (p === "terminal" && enfocar) window.dispatchEvent(new Event("pjg-term-foco"));
      }, 60);
    });

    // Cierra el panel. Si el foco estaba dentro, pasa al botón activo de la barra o a la escena.
    const cerrarPanel = $(() => {
      const dentro = !!(document.activeElement as HTMLElement | null)?.closest?.(".lv-panel");
      panel.value = "";
      if (dentro) {
        setTimeout(() => {
          const b = raiz.value?.querySelector<HTMLElement>(".lv-act-btn[data-act='escena']");
          (b && b.offsetParent !== null ? b : (marco.value ?? raiz.value))?.focus();
        }, 30);
      }
    });

    // Botón de la barra de actividad o pestaña móvil: abre la pestaña, o cierra el panel si ya estaba en ella.
    const alternar = $((p: Pestana) => (panel.value === p ? cerrarPanel() : abrirPestana(p)));

    // Abre un panel sin cerrarlo si ya estaba abierto (lo usa «Probar» de Mis skills para ir a la terminal).
    const irA = $((p: "terminal") => {
      if (panel.value !== p) abrirPestana(p);
    });

    // Ctrl+`: abre la terminal; si ya está a la vista y sin foco, la enfoca; si tiene el foco, cierra el panel.
    const alternarTerminal = $(() => {
      if (panel.value !== "terminal") return abrirPestana("terminal");
      const enTerminal = !!(document.activeElement as HTMLElement | null)?.closest?.(".lv-tp-terminal");
      if (enTerminal) return cerrarPanel();
      window.dispatchEvent(new Event("pjg-term-foco"));
    });

    const alternarPanel = $(() => (panel.value ? cerrarPanel() : abrirPestana(ultima.value)));

    const alternarBarra = $(() => {
      if (movil.value) return; // en el teléfono las pestañas de abajo no se esconden
      const dentro = !!(document.activeElement as HTMLElement | null)?.closest?.(".lv-act");
      disp.actividad = !disp.actividad;
      guardar();
      if (dentro && !disp.actividad) marco.value?.focus();
    });

    const alternarAyuda = $(() => {
      ayuda.value = !ayuda.value;
      if (ayuda.value && movil.value) panel.value = "";
    });

    // «Escena»: en el teléfono cierra la vista que la tapa; en escritorio, si el panel la tapa (maximizado), lo restaura.
    const verEscena = $(() => {
      if (movil.value) {
        panel.value = "";
        ayuda.value = false;
      } else if (panel.value && disp.max) {
        disp.max = false;
      } else {
        marco.value?.focus();
      }
    });

    const cambiarPosicion = $(() => {
      disp.pos = disp.pos === "derecha" ? "abajo" : "derecha";
      disp.max = false;
      guardar();
    });

    const alternarMax = $(() => {
      disp.max = !disp.max;
    });

    // Visor flotante. La primera vez se centra en la ventana; luego recuerda dónde lo dejaste.
    const ajustarFlot = $(() => {
      const W = window.innerWidth, H = window.innerHeight;
      flot.w = Math.max(320, Math.min(flot.w || Math.min(1100, Math.round(W * 0.62)), W - 16));
      flot.h = Math.max(240, Math.min(flot.h || Math.min(780, Math.round(H * 0.7)), H - 16));
      if (!flot.x && !flot.y) {
        flot.x = Math.round((W - flot.w) / 2);
        flot.y = Math.round((H - flot.h) / 2);
      }
      flot.x = Math.max(8 - flot.w + 120, Math.min(flot.x, W - 120));
      flot.y = Math.max(8, Math.min(flot.y, H - 48));
    });
    const desacoplar = $(async () => {
      await ajustarFlot();
      flot.on = true;
      if (panel.value === "visor") await abrirPestana("terminal", false);
    });
    const acoplar = $(async () => {
      flot.on = false;
      await abrirPestana("visor");
    });
    const centrarFlot = $(async () => {
      flot.x = 0; flot.y = 0;
      await ajustarFlot();
    });
    const moverFlot = $((ev: PointerEvent) => {
      if (ev.button !== 0 || (ev.target as HTMLElement).closest("button, a")) return;
      const x0 = ev.clientX - flot.x, y0 = ev.clientY - flot.y;
      flot.moviendo = true;
      const mover = (e: PointerEvent) => {
        flot.x = Math.round(e.clientX - x0);
        flot.y = Math.max(0, Math.round(e.clientY - y0));
      };
      const soltar = () => {
        flot.moviendo = false;
        window.removeEventListener("pointermove", mover);
        window.removeEventListener("pointerup", soltar);
      };
      window.addEventListener("pointermove", mover);
      window.addEventListener("pointerup", soltar);
    });
    const redimFlot = $((ev: PointerEvent) => {
      if (ev.button !== 0) return;
      const x0 = ev.clientX, y0 = ev.clientY, w0 = flot.w, h0 = flot.h;
      flot.moviendo = true;
      const mover = (e: PointerEvent) => {
        flot.w = Math.max(320, Math.round(w0 + e.clientX - x0));
        flot.h = Math.max(240, Math.round(h0 + e.clientY - y0));
      };
      const soltar = () => {
        flot.moviendo = false;
        window.removeEventListener("pointermove", mover);
        window.removeEventListener("pointerup", soltar);
      };
      window.addEventListener("pointermove", mover);
      window.addEventListener("pointerup", soltar);
    });

    // Lleva a «Lo logré»: muestra la escena y pone el foco en el botón (no lo pulsa).
    const irALogre = $(async () => {
      await verEscena();
      setTimeout(() => btnLogre.value?.focus(), 80);
    });

    const mostrar = $((on: boolean) => {
      if (!session.me) return;
      toast(session, on ? "Pantalla completa activada" : "", "info");
    });

    const alternarCompleta = $(async () => {
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

    // Disposición guardada, tamaño de pantalla y teclado virtual.
    // eslint-disable-next-line qwik/no-use-visible-task
    useVisibleTask$(({ cleanup }) => {
      try {
        const g = JSON.parse(localStorage.getItem(CLAVE) || "null");
        if (g && typeof g === "object") {
          if (g.pos === "derecha" || g.pos === "abajo") disp.pos = g.pos;
          if (typeof g.derecha === "number") disp.derecha = Math.min(LIMITE.max, Math.max(LIMITE.min, g.derecha));
          if (typeof g.abajo === "number") disp.abajo = Math.min(LIMITE.max, Math.max(LIMITE.min, g.abajo));
          if (typeof g.actividad === "boolean") disp.actividad = g.actividad;
          if (esPestana(g.ultima)) ultima.value = g.ultima;
        }
      } catch {
        /* sin almacenamiento o dato roto: la disposición de siempre */
      }
      mac.value = /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);

      const mq = matchMedia("(max-width: 1099.98px)");
      const alMedir = () => {
        movil.value = mq.matches;
        if (mq.matches && panel.value && ayuda.value) ayuda.value = false;
      };
      alMedir();
      mq.addEventListener("change", alMedir);

      // Con el teclado del teléfono abierto, la pantalla mide lo que queda visible: la terminal no se
      // esconde debajo del teclado. Solo en pantallas táctiles y sin zoom de pellizco.
      const vv = window.visualViewport;
      const tactil = matchMedia("(pointer: coarse)").matches;
      const raizDoc = document.documentElement;
      const alVer = () => {
        if (!vv || !tactil || vv.scale > 1.01) raizDoc.style.removeProperty("--lv-vh");
        else raizDoc.style.setProperty("--lv-vh", `${Math.round(vv.height)}px`);
      };
      if (vv && tactil) {
        vv.addEventListener("resize", alVer);
        alVer();
      }
      cleanup(() => {
        mq.removeEventListener("change", alMedir);
        vv?.removeEventListener("resize", alVer);
        raizDoc.style.removeProperty("--lv-vh");
      });
    });

    // Atajos de teclado. Se escuchan en captura para llegar antes que la terminal (xterm consume sus
    // teclas) y solo se detienen los tres atajos. La escena y el visor son del mismo origen: sus teclas no
    // suben hasta aquí, así que también se escuchan dentro de cada iframe al cargarse.
    // eslint-disable-next-line qwik/no-use-visible-task
    useVisibleTask$(({ cleanup }) => {
      const alTeclear = (e: KeyboardEvent) => {
        const a = atajo(e, mac.value);
        if (!a) return;
        e.preventDefault();
        e.stopPropagation();
        if (a === "terminal") alternarTerminal();
        else if (a === "panel") alternarPanel();
        else alternarBarra();
      };
      const ventanas = new Set<Window>();
      const alCargar = (e: Event) => {
        const f = e.target as HTMLIFrameElement | null;
        if (!f || f.tagName !== "IFRAME") return;
        try {
          const w = f.contentWindow;
          if (!w) return;
          w.addEventListener("keydown", alTeclear, true);
          ventanas.add(w);
        } catch {
          /* de otro origen: sus teclas se quedan dentro */
        }
      };
      window.addEventListener("keydown", alTeclear, true);
      const r = raiz.value;
      r?.addEventListener("load", alCargar, true);
      // La escena pudo cargar antes de que existiera este oyente.
      r?.querySelectorAll("iframe").forEach((f) => alCargar({ target: f } as unknown as Event));
      cleanup(() => {
        window.removeEventListener("keydown", alTeclear, true);
        r?.removeEventListener("load", alCargar, true);
        ventanas.forEach((w) => {
          try {
            w.removeEventListener("keydown", alTeclear, true);
          } catch {
            /* el marco ya no existe */
          }
        });
      });
    });

    // Flechas en la barra de actividad (mueven el foco) y en las pestañas del panel (mueven y abren).
    // eslint-disable-next-line qwik/no-use-visible-task
    useVisibleTask$(({ cleanup }) => {
      const barra = barraAct.value;
      const tabs = listaTabs.value;
      const enBarra = (e: KeyboardEvent) => {
        if (barra) moverFoco(e, barra);
      };
      const enTabs = (e: KeyboardEvent) => {
        if (!tabs) return;
        const b = moverFoco(e, tabs);
        const p = b?.dataset.pestana;
        if (esPestana(p)) abrirPestana(p, false);
      };
      barra?.addEventListener("keydown", enBarra);
      tabs?.addEventListener("keydown", enTabs);
      cleanup(() => {
        barra?.removeEventListener("keydown", enBarra);
        tabs?.removeEventListener("keydown", enTabs);
      });
    });

    // Divisor entre la escena y el panel: se arrastra con el ratón o el dedo y se mueve con las flechas
    // (Mayús: pasos grandes; Inicio y Fin: mínimo y máximo; Intro o doble clic: tamaño inicial).
    // eslint-disable-next-line qwik/no-use-visible-task
    useVisibleTask$(({ cleanup }) => {
      const d = divisor.value;
      if (!d) return;
      const medida = () => {
        const caja = zona.value?.getBoundingClientRect();
        return caja ? (disp.pos === "derecha" ? caja.width : caja.height) : 1000;
      };
      const fijar = (f: number, total = medida()) => {
        disp[disp.pos] = Math.round(limitar(f, total, disp.pos) * 1000) / 1000;
      };
      const alBajar = (e: PointerEvent) => {
        if (e.button !== 0) return;
        const caja = zona.value?.getBoundingClientRect();
        if (!caja) return;
        e.preventDefault();
        d.focus();
        try {
          d.setPointerCapture(e.pointerId);
        } catch {
          /* sin captura: el iframe sin eventos (clase arrastrando) basta */
        }
        arrastrando.value = true;
        raiz.value?.classList.add("arrastrando");
        const derecha = disp.pos === "derecha";
        const mover = (ev: PointerEvent) =>
          fijar(derecha ? (caja.right - ev.clientX) / caja.width : (caja.bottom - ev.clientY) / caja.height, derecha ? caja.width : caja.height);
        const soltar = () => {
          d.removeEventListener("pointermove", mover);
          d.removeEventListener("pointerup", soltar);
          d.removeEventListener("pointercancel", soltar);
          arrastrando.value = false;
          raiz.value?.classList.remove("arrastrando");
          guardar();
        };
        d.addEventListener("pointermove", mover);
        d.addEventListener("pointerup", soltar);
        d.addEventListener("pointercancel", soltar);
      };
      const alTeclear = (e: KeyboardEvent) => {
        const derecha = disp.pos === "derecha";
        const paso = e.shiftKey ? 0.1 : 0.02;
        const f = disp[disp.pos];
        if (e.key === (derecha ? "ArrowLeft" : "ArrowUp")) fijar(f + paso);
        else if (e.key === (derecha ? "ArrowRight" : "ArrowDown")) fijar(f - paso);
        else if (e.key === "Home") fijar(0);
        else if (e.key === "End") fijar(1);
        else if (e.key === "Enter") fijar(INICIAL[disp.pos]);
        else return;
        e.preventDefault();
        guardar();
      };
      const alDoble = () => {
        fijar(INICIAL[disp.pos]);
        guardar();
      };
      d.addEventListener("pointerdown", alBajar);
      d.addEventListener("keydown", alTeclear);
      d.addEventListener("dblclick", alDoble);
      cleanup(() => {
        d.removeEventListener("pointerdown", alBajar);
        d.removeEventListener("keydown", alTeclear);
        d.removeEventListener("dblclick", alDoble);
      });
    });

    const lista = props.escenas ?? [];
    // El alumno siempre puede adelantar o retroceder por su cuenta; «A la del instructor» lo devuelve.
    const efectiva = local.value || escena.value;
    const idx = lista.findIndex((x) => x.id === efectiva);
    const actual = idx >= 0 ? lista[idx] : undefined;
    // Lo que se pinta de la escena va en valores sueltos: un {actual.titulo} en el JSX quedaba atado al objeto
    // de la escena anterior (Qwik lo compila como señal derivada) y no cambiaba al pasar de escena.
    const aid = actual?.id ?? ""; // el id basta en los manejadores: no hace falta capturar la escena entera
    const titulo = actual?.titulo ?? "";
    const compuerta = actual?.compuerta ?? "ninguna";
    const umbral = actual?.umbral_pct ?? 80;
    const conLogre = !!actual?.lo_logre;
    const numero = actual ? `${idx + 1}/${lista.length}` : "";
    const logrado = !!actual && logres.ids.includes(aid);

    // Las flechas y los botones recorren las escenas de la clase sin mover al resto.
    const paso = (dir: 1 | -1) => {
      if (lista.length === 0) return escena.value;
      const i = idx < 0 ? 0 : Math.min(lista.length - 1, Math.max(0, idx + dir));
      return lista[i].id;
    };
    const anterior = paso(-1);
    const siguiente = paso(1);

    // Etiquetas de los atajos según el sistema.
    const tecla = {
      terminal: mac.value ? "⌃`" : "Ctrl+`",
      panel: mac.value ? "⌘J" : "Ctrl+J",
      barra: mac.value ? "⌘B" : "Ctrl+B",
    };

    // Conexión con la clase (stream SSE) y estado del LIVE, en una palabra y un color.
    const conexion = props.conexion ?? "conectado";
    const con =
      conexion === "reconectando"
        ? { cls: "ambar", txt: "Reconectando…", det: "Se perdió la conexión con la clase; se reintenta sola." }
        : conexion === "conectando"
          ? { cls: "gris", txt: "Conectando…", det: "Abriendo la conexión en tiempo real con la clase." }
          : props.estado.estado === "en_vivo"
            ? { cls: "verde", txt: "En vivo", det: "Conectado: ves la escena que muestra el instructor al instante." }
            : props.estado.estado === "cerrada"
              ? { cls: "gris", txt: "Clase cerrada", det: "El instructor cerró el LIVE." }
              : { cls: "gris", txt: "Por empezar", det: "Conectado. La clase aún no empieza." };

    // Tu semáforo, como lo ve el instructor (verde: cumpliste; ámbar: trabajando; gris: sin conexión).
    // Se calcula aquí con lo que sabe esta pantalla; el del instructor añade el rojo por errores o inactividad.
    const sinGate = !!actual && (compuerta === "ninguna" || compuerta === "presentes");
    const sem =
      conexion !== "conectado"
        ? { cls: "gris", txt: "Sin conexión" }
        : !actual
          ? { cls: "gris", txt: "Esperando" }
          : logrado
            ? { cls: "verde", txt: "Cumpliste" }
            : sinGate
              ? { cls: "verde", txt: "Al día" }
              : { cls: "ambar", txt: "Trabajando" };

    const nombrePestana = PESTANAS.find(([id]) => id === panel.value)?.[1] ?? "";
    const pct = Math.round(disp[disp.pos] * 100);
    const escenaVisible = movil.value ? !panel.value && !ayuda.value : !(panel.value && disp.max);

    const ayudaEscena = (() => {
      const e = actual;
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
    })();

    return (
      <div
        ref={raiz}
        class={[
          "live-alumno lv",
          `pos-${disp.pos}`,
          disp.max && panel.value ? "max" : "",
          panel.value ? "con-panel" : "",
          ayuda.value ? "con-lado" : "",
          disp.actividad ? "" : "sin-act",
          arrastrando.value ? "arrastrando" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        style={`--lv-derecha:${(disp.derecha * 100).toFixed(2)}%;--lv-abajo:${(disp.abajo * 100).toFixed(2)}%`}
      >
        {mensaje.value && (
          <div class="live-aviso" role="status">
            <Icon name="chat" size={16} />
            <span>{mensaje.value}</span>
            <button type="button" class="live-aviso-x" aria-label="Cerrar el aviso" onClick$={() => (mensaje.value = "")}>
              <Icon name="x" size={14} />
            </button>
          </div>
        )}

        <nav class="lv-act" aria-label="Barra de actividad">
          <div ref={barraAct} class="lv-act-barra" role="toolbar" aria-label="Vistas de la clase" aria-orientation={movil.value ? "horizontal" : "vertical"}>
            {ACTIVIDAD.map(([id, nombre, corto, icono], i) => {
              const activo = id === "escena" ? escenaVisible : id === "ayuda" ? ayuda.value && !ladoEscenas.value : id === "escenas" ? ayuda.value && ladoEscenas.value : panel.value === id;
              const tip = id === "terminal" ? `${nombre} (${tecla.terminal})` : nombre;
              return (
                <button
                  key={id}
                  type="button"
                  class="lv-act-btn"
                  data-act={id}
                  data-roving
                  data-tip={tip}
                  tabIndex={i === 0 ? 0 : -1}
                  aria-label={nombre}
                  aria-pressed={activo}
                  aria-controls={id === "escena" ? "lv-escena" : id === "ayuda" || id === "escenas" ? "lv-lado" : "lv-panel"}
                  aria-keyshortcuts={id === "terminal" ? (mac.value ? "Control+` Meta+`" : "Control+`") : undefined}
                  onClick$={() => {
                    if (id === "escena") return verEscena();
                    if (id === "ayuda" || id === "escenas") {
                      const lista = id === "escenas";
                      if (ayuda.value && ladoEscenas.value === lista) return alternarAyuda();
                      ladoEscenas.value = lista;
                      if (!ayuda.value) alternarAyuda();
                      return;
                    }
                    alternar(id);
                  }}
                >
                  <Icon name={icono} size={22} />
                  <span class="lv-act-et" aria-hidden="true">
                    {corto}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>

        <aside id="lv-lado" class="lv-lado" hidden={!ayuda.value} aria-labelledby="lv-lado-t">
          <div class="lv-lado-cab">
            <h2 id="lv-lado-t">{ladoEscenas.value ? "Todas las escenas" : "Ayuda de la escena"}</h2>
            <button type="button" class="lv-ico-btn" aria-label="Cerrar la ayuda" title="Cerrar la ayuda" onClick$={() => (ayuda.value = false)}>
              <Icon name="x" size={16} />
            </button>
          </div>
          {ladoEscenas.value ? (
            <div class="lv-lado-cuerpo lv-lista-escenas">
              <p class="lv-lista-nota">Toca una para verla; «A la del instructor» te devuelve a la de la clase.</p>
              <div class="live-escenas" role="list">
                {lista.map((e, i) => (
                  <button
                    key={e.id}
                    type="button"
                    class="live-escena"
                    role="listitem"
                    aria-current={e.id === efectiva ? "true" : undefined}
                    title={e.id === escena.value ? "La escena que muestra el instructor" : undefined}
                    onClick$={() => (local.value = e.id === escena.value ? "" : e.id)}
                  >
                    <span class="live-escena-num">{i + 1}</span>
                    <span class="live-escena-titulo">{e.titulo}</span>
                    {e.id === escena.value && <Icon name="escena" size={14} />}
                  </button>
                ))}
              </div>
              <a class="btn ghost sm lv-salir-lado" href={`/lessons/${props.lesson}/`}>
                <Icon name="logout" size={14} />
                Salir del LIVE
              </a>
            </div>
          ) : (
          <div class="lv-lado-cuerpo live-ayuda" key={`ayuda-${efectiva}`}>
            {ayudaEscena}
            <section class="lv-atajos" aria-labelledby="lv-atajos-t">
              <h3 id="lv-atajos-t">Atajos de teclado</h3>
              <dl>
                <dt>
                  <kbd>{tecla.terminal}</kbd>
                </dt>
                <dd>Abre o cierra la terminal{mac.value ? "" : " (Ctrl+Ñ en teclado español)"}</dd>
                <dt>
                  <kbd>{tecla.panel}</kbd>
                </dt>
                <dd>Muestra u oculta el panel</dd>
                <dt>
                  <kbd>{tecla.barra}</kbd>
                </dt>
                <dd>Muestra u oculta la barra de actividad</dd>
              </dl>
            </section>
          </div>
          )}
        
        </aside>

        <div ref={zona} class="lv-zona">
          <section id="lv-escena" class="lv-escena" aria-label="Escena">
            <div class="lv-escena-cab">
              {!disp.actividad && !movil.value && (
                <button type="button" class="lv-ico-btn" aria-label={`Mostrar la barra de actividad (${tecla.barra})`} title={`Mostrar la barra de actividad (${tecla.barra})`} onClick$={alternarBarra}>
                  <Icon name="panelIzquierda" size={16} />
                </button>
              )}
              <div class="lv-escena-tab" title={titulo || undefined}>
                <Icon name="escena" size={15} />
                {numero && <span class="lv-escena-n">{numero}</span>}
                <span class="lv-escena-t">{titulo || efectiva || "Esperando la primera escena"}</span>
              </div>
              {lista.length > 0 && (
                <div class="live-nav-local" role="group" aria-label="Avanza a tu ritmo">
                  {modo.value === "libre" && (
                    <span class="live-libre" title="Modo libre: avanza a tu ritmo con las flechas">
                      Libre
                    </span>
                  )}
                  <button type="button" class="lv-ico-btn" aria-label="Escena anterior" title="Escena anterior" disabled={anterior === efectiva} onClick$={() => (local.value = anterior)}>
                    <Icon name="chevronLeft" size={16} />
                  </button>
                  <button type="button" class="lv-ico-btn" aria-label="Escena siguiente" title="Escena siguiente" disabled={siguiente === efectiva} onClick$={() => (local.value = siguiente)}>
                    <Icon name="chevronRight" size={16} />
                  </button>
                  {local.value && local.value !== escena.value && (
                    <button type="button" class="btn ghost sm lv-volver" onClick$={() => (local.value = "")}>
                      A la del instructor
                    </button>
                  )}
                </div>
              )}
              <div class="lv-escena-acc">
                {conLogre &&
                  (logrado ? (
                    <span class="live-logrado" role="status">
                      <Icon name="check" size={14} /> ¡Anotado!
                      {deshacerDe.value === aid && (
                        <button type="button" class="btn ghost sm" onClick$={() => logre(aid, false)}>
                          Deshacer
                        </button>
                      )}
                    </span>
                  ) : (
                    <button type="button" ref={btnLogre} class="btn sm ok lv-logre" onClick$={() => logre(aid, true)}>
                      <Icon name="check" size={14} /> Lo logré
                    </button>
                  ))}
                <button
                  type="button"
                  class="lv-ico-btn"
                  aria-label={completa.value ? "Salir de pantalla completa" : "Pantalla completa"}
                  title={completa.value ? "Salir de pantalla completa" : "Pantalla completa"}
                  onClick$={alternarCompleta}
                >
                  <Icon name={completa.value ? "restaurar" : "expand"} size={16} />
                </button>
              </div>
            </div>
            {props.pareja && props.pareja.con.length > 0 && (
              <p class="live-pareja" role="status">
                <Icon name="users" size={14} /> Te toca con {props.pareja.con.map((c) => c.nombre).join(" y ")}
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
            <div class="lv-escena-cuerpo">
              {efectiva ? (
                <iframe
                  key={efectiva + tema.value}
                  ref={marco}
                  class="live-frame lv-marco"
                  onLoad$={() => avisarEscena(marco.value, props.estado)}
                  sandbox="allow-scripts allow-same-origin"
                  allow="microphone; clipboard-write"
                  title="Escena"
                  src={urlEscena(props.lesson, efectiva, tema.value)}
                />
              ) : (
                <div class="live-vacio" data-testid="live-vacio">
                  <b>La clase en vivo aún no empieza</b>
                  <span>Cuando el instructor la inicie, la primera escena aparecerá aquí sola; no hace falta recargar.</span>
                  <span>
                    Mientras tanto: abre la <b>Terminal</b> ({tecla.terminal}) y comprueba que tu entorno responde, o revisa los pasos de la clase.
                  </span>
                  <a class="btn ghost sm" href={`/lessons/${props.lesson}/`}>
                    Ver los pasos de la clase
                  </a>
                </div>
              )}
              {!visible.value && <div class="live-cortina">El instructor está preparando la siguiente escena</div>}
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
          </section>

          <div
            ref={divisor}
            class="lv-div"
            role="separator"
            tabIndex={0}
            hidden={!panel.value || disp.max || movil.value}
            aria-label="Tamaño del panel"
            aria-controls="lv-panel"
            aria-orientation={disp.pos === "derecha" ? "vertical" : "horizontal"}
            aria-valuemin={Math.round(LIMITE.min * 100)}
            aria-valuemax={Math.round(LIMITE.max * 100)}
            aria-valuenow={pct}
            aria-valuetext={`El panel ocupa el ${pct} %`}
            title="Arrastra o usa las flechas para cambiar el tamaño. Doble clic: tamaño inicial."
          />

          <section id="lv-panel" class="lv-panel" hidden={!panel.value} aria-label="Panel de trabajo">
            <div class="lv-panel-cab">
              <div ref={listaTabs} class="lv-tabs" role="tablist" aria-label="Paneles">
                {PESTANAS.map(([id, nombre, corto, icono]) => (
                  <button
                    key={id}
                    id={`lv-tab-${id}`}
                    type="button"
                    role="tab"
                    class="lv-tab"
                    data-roving
                    data-pestana={id}
                    aria-selected={panel.value === id}
                    aria-controls={`lv-tp-${id}`}
                    tabIndex={panel.value === id ? 0 : -1}
                    onClick$={() => abrirPestana(id)}
                  >
                    <Icon name={icono} size={14} />
                    <span class="lv-tab-largo">{nombre}</span>
                    <span class="lv-tab-corto" aria-hidden="true">
                      {corto}
                    </span>
                  </button>
                ))}
              </div>
              <h2 class="lv-panel-titulo">{nombrePestana}</h2>
              <div class="lv-panel-acc">
                {panel.value === "visor" && !flot.on && (
                  <button type="button" class="lv-ico-btn lv-solo-escritorio" aria-label="Desacoplar el visor en una ventana flotante" title="Desacoplar el visor: ventana flotante en el medio" onClick$={desacoplar}>
                    <Icon name="external" size={16} />
                  </button>
                )}
                <button
                  type="button"
                  class="lv-ico-btn lv-solo-escritorio"
                  aria-label={disp.pos === "derecha" ? "Mover el panel abajo" : "Mover el panel a la derecha"}
                  title={disp.pos === "derecha" ? "Mover el panel abajo" : "Mover el panel a la derecha"}
                  onClick$={cambiarPosicion}
                >
                  <Icon name={disp.pos === "derecha" ? "panelAbajo" : "panelDerecha"} size={16} />
                </button>
                <button
                  type="button"
                  class="lv-ico-btn lv-solo-escritorio"
                  aria-pressed={disp.max}
                  aria-label={disp.max ? "Restaurar el tamaño del panel" : "Maximizar el panel"}
                  title={disp.max ? "Restaurar el tamaño del panel" : "Maximizar el panel"}
                  onClick$={alternarMax}
                >
                  <Icon name={disp.max ? "restaurar" : "maximizar"} size={16} />
                </button>
                <button type="button" class="lv-ico-btn" aria-label={`Cerrar el panel (${tecla.panel})`} title={`Cerrar el panel (${tecla.panel})`} onClick$={cerrarPanel}>
                  <Icon name="x" size={16} />
                </button>
              </div>
            </div>
            <div id="lv-tp-terminal" role="tabpanel" aria-labelledby="lv-tab-terminal" class="lv-tp lv-tp-terminal" hidden={panel.value !== "terminal"}>
              {termAbierta.value && <Terminal />}
            </div>
            <div id="lv-tp-visor" role="tabpanel" aria-labelledby="lv-tab-visor" class="lv-tp lv-tp-visor" hidden={panel.value !== "visor"}>
              {panel.value === "visor" && session.me && !flot.on && <LiveVisor lesson={props.lesson} escena={efectiva} sub={session.me.id} ruta={rutaVisor} proy={proyVisor} />}
              {panel.value === "visor" && flot.on && (
                <div class="lv-flot-aviso">
                  <p>El visor está en una ventana flotante.</p>
                  <button type="button" class="btn ghost sm" onClick$={acoplar}>
                    <Icon name="panelDerecha" size={14} /> Acoplarlo aquí
                  </button>
                </div>
              )}
            </div>
            <div id="lv-tp-agente" role="tabpanel" aria-labelledby="lv-tab-agente" class="lv-tp lv-tp-agente" tabIndex={0} hidden={panel.value !== "agente"}>
              <span class="lv-agente-ico">
                <Icon name="sparkles" size={22} />
              </span>
              <p>
                <b>Tu agente de código.</b> Escríbele lo que quieres cambiar. En la terminal también puedes usar <code>jmd chat</code>.
              </p>
              <button type="button" class="btn ghost sm" onClick$={() => abrirPestana("terminal")}>
                <Icon name="terminal" size={14} /> Abrir la terminal
              </button>
            </div>
            <div id="lv-tp-skills" role="tabpanel" aria-labelledby="lv-tab-skills" class="lv-tp lv-tp-skills" hidden={panel.value !== "skills"}>
              {skillsAbierta.value && <MisSkills prueba={prueba} onIr$={irA} nueva={props.skillNueva} />}
            </div>
          </section>
        </div>

        <footer class="lv-estado" aria-label="Barra de estado">
          {props.staff && props.onVista$ && (
            <button type="button" class="lv-ei lv-ei-control" aria-label="Volver al control del instructor" title="Volver al control del instructor" onClick$={() => props.onVista$?.(false)}>
              <Icon name="chevronLeft" size={13} />
              Control
            </button>
          )}
          <a class="lv-ei lv-ei-salir" href={`/lessons/${props.lesson}/`} title="Salir del modo LIVE y volver a la lección">
            <Icon name="logout" size={13} />
            <span class="lv-ocultable">Salir del LIVE</span>
          </a>
          <span class="lv-ei lv-con" role="status" title={con.det}>
            <i class={`lv-punto ${con.cls}`} aria-hidden="true" />
            {con.txt}
          </span>
          <span class="lv-ei lv-ei-escena" title={numero ? `Clase ${props.lesson} · escena ${numero}: ${titulo}` : `Clase ${props.lesson}`}>
            <span class="lv-ocultable">{props.lesson} ·</span>
            <span>{numero ? `Escena ${numero}` : "Sin escena"}</span>
            {titulo && <span class="lv-ei-t lv-ocultable">{titulo}</span>}
          </span>
          <span class="lv-ei lv-ocultable" title={modo.value === "libre" ? "Modo libre: avanzas a tu ritmo" : "Modo guiado: la escena la pone el instructor"}>
            {modo.value === "libre" ? "Modo libre" : "Modo guiado"}
          </span>
          {lista.length > 0 && (
            <span class="lv-ei lv-ei-nav" role="group" aria-label="Adelantar o retroceder la escena">
              <button type="button" class="lv-nav-btn" aria-label="Escena anterior" title="Escena anterior" disabled={anterior === efectiva} onClick$={() => (local.value = anterior)}>
                <Icon name="chevronLeft" size={13} />
                <span class="lv-ocultable">Anterior</span>
              </button>
              <button type="button" class="lv-nav-btn" aria-label="Escena siguiente" title="Escena siguiente" disabled={siguiente === efectiva} onClick$={() => (local.value = siguiente)}>
                <span class="lv-ocultable">Siguiente</span>
                <Icon name="chevronRight" size={13} />
              </button>
              {local.value && local.value !== escena.value && (
                <button type="button" class="lv-nav-btn lv-nav-volver" title="Volver a la escena que muestra el instructor" onClick$={() => (local.value = "")}>
                  A la del instructor
                </button>
              )}
            </span>
          )}
          {props.conectados !== undefined && props.conectados > 0 && (
            <span class="lv-ei lv-ocultable" title="Conectados a la clase" aria-label={`${props.conectados} conectados a la clase`}>
              <Icon name="users" size={13} />
              {props.conectados}
            </span>
          )}
          <span class="lv-hueco" />
          {prueba.estado && (
            <span class="lv-ei live-prueba" title={`Prueba de la skill ${prueba.nombre}`}>
              <span class="live-prueba-n lv-ocultable">{prueba.nombre}</span>
              <ChipPrueba estado={prueba.estado} />
            </span>
          )}
          {actual &&
            compuerta !== "ninguna" &&
            (logrado || (compuerta === "presentes" && conexion === "conectado") ? (
              <span class="lv-ei lv-ocultable" title={`La clase avanza cuando el ${umbral} % cumple esta escena`}>
                <Icon name="checkCircle" size={13} />
                Compuerta cumplida
              </span>
            ) : compuerta === "lo_logre" && conLogre ? (
              <button type="button" class="lv-ei lv-ei-falta" title={`La clase avanza cuando el ${umbral} % pulsa «Lo logré». Te lleva al botón.`} onClick$={irALogre}>
                <Icon name="lock" size={13} />
                <span class="lv-ocultable">Compuerta: falta tu «Lo logré»</span>
                <span class="lv-solo-movil">Falta «Lo logré»</span>
              </button>
            ) : (
              <span class="lv-ei lv-ocultable" title={`Se anota sola cuando haces lo que pide la escena. La clase avanza cuando el ${umbral} % cumple.`}>
                <Icon name="lock" size={13} />
                Compuerta: {compuerta === "presentes" ? "estar conectado" : "evidencia"}
              </span>
            ))}
          <span class="lv-ei lv-sem" title="Así te ve el instructor: verde cumpliste, ámbar trabajando, gris sin conexión" aria-label={`Tu semáforo: ${sem.txt}`}>
            <i class={`semaforo ${sem.cls}`} aria-hidden="true" />
            <span class="lv-ocultable-xs" aria-hidden="true">
              {sem.txt}
            </span>
          </span>
          <span class="mario-score" role="status" aria-label={`Puntaje de «Lo logré»: ${puntaje.total}`} title="Puntaje de «Lo logré»" key={`s${puntaje.golpe}`}>
            <span class="mario-score-moneda" aria-hidden="true" />
            <span class="mario-score-x" aria-hidden="true">
              ×
            </span>
            <span class="mario-score-n" aria-hidden="true">
              {String(puntaje.mostrado).padStart(6, "0")}
            </span>
          </span>
        </footer>

        {flot.on && session.me && (
          <section
            class={["lv-flot", flot.moviendo ? "moviendo" : ""].join(" ")}
            role="dialog"
            aria-label="Visor flotante"
            style={`left:${flot.x}px;top:${flot.y}px;width:${flot.w}px;height:${flot.h}px`}
          >
            <header class="lv-flot-cab" onPointerDown$={moverFlot} onDblClick$={centrarFlot} title="Arrastra para moverlo. Doble clic: al centro.">
              <Icon name="eye" size={14} />
              <span class="lv-flot-titulo">Visor</span>
              <button type="button" class="lv-ico-btn" aria-label="Centrar el visor" title="Al centro" onClick$={centrarFlot}>
                <Icon name="target" size={15} />
              </button>
              <button type="button" class="lv-ico-btn" aria-label="Acoplar el visor al panel" title="Acoplar al panel" onClick$={acoplar}>
                <Icon name="panelDerecha" size={15} />
              </button>
              <button type="button" class="lv-ico-btn" aria-label="Cerrar el visor flotante" title="Cerrar" onClick$={() => (flot.on = false)}>
                <Icon name="x" size={15} />
              </button>
            </header>
            <div class="lv-flot-cuerpo">
              <LiveVisor lesson={props.lesson} escena={efectiva} sub={session.me.id} ruta={rutaVisor} proy={proyVisor} />
            </div>
            <span class="lv-flot-esquina" aria-hidden="true" preventdefault:pointerdown onPointerDown$={redimFlot} />
          </section>
        )}
      </div>
    );
  },
);
