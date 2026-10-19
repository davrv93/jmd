import { component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";
import "@xterm/xterm/css/xterm.css";

// Terminal interactivo: xterm.js conectado por WebSocket a /api/v1/term, que lanza una shell
// DENTRO de un contenedor efímero (sin red, sin socket, sin privilegios). Nunca toca el host.
export const Terminal = component$(() => {
  const ref = useSignal<HTMLDivElement>();

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async ({ cleanup }) => {
    const el = ref.value;
    if (!el) return;
    const [{ Terminal }, { FitAddon }] = await Promise.all([import("@xterm/xterm"), import("@xterm/addon-fit")]);
    const term = new Terminal({
      convertEol: true,
      cursorBlink: true,
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
      fontSize: 13,
      theme: { background: "#16151d", foreground: "#e9e8f2", cursor: "#e2b84a", selectionBackground: "#3a3550" },
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(el);

    const proto = location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${proto}://${location.host}/api/v1/term`);
    ws.binaryType = "arraybuffer";
    const enc = new TextEncoder();
    const sendSize = () => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ cols: term.cols, rows: term.rows }));
    };

    // Columnas y filas a la medida exacta de la caja (la caja no lleva relleno: el FitAddon mide el alto
    // del padre sin restarle el padding, y con relleno la última fila quedaba cortada). Con la caja oculta
    // (otra pestaña, panel cerrado) no se toca nada: al volver a verse, el observador la reajusta.
    let cols = 0;
    let rows = 0;
    let pendiente = 0;
    const ajustar = () => {
      pendiente = 0;
      if (!el.clientWidth || !el.clientHeight) return;
      fit.fit();
      if (term.cols !== cols || term.rows !== rows) {
        cols = term.cols;
        rows = term.rows;
        sendSize();
      }
    };
    const pedirAjuste = () => {
      if (!pendiente) pendiente = requestAnimationFrame(ajustar);
    };
    // El panel se redimensiona sin que cambie la ventana (divisor, posición, maximizar): se mira la caja.
    const observador = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(pedirAjuste);
    observador?.observe(el);
    ajustar();
    let abrio = false;
    // Texto que otras partes de la pantalla (p. ej. «Probar» de Mis skills) piden escribir en la terminal.
    // Va en una cola global para que no se pierda si la terminal aún está conectando.
    const cola = window as unknown as { __pjgTermCola?: string[] };
    const volcar = () => {
      while (cola.__pjgTermCola?.length && ws.readyState === WebSocket.OPEN) ws.send(enc.encode(cola.__pjgTermCola.shift()!));
    };
    const dec = new TextDecoder();
    ws.onopen = () => {
      abrio = true;
      ajustar();
      sendSize();
      term.focus();
      setTimeout(volcar, 700); // deja que la shell muestre su prompt antes de escribirle
    };
    ws.onmessage = (ev) => {
      term.write(ev.data instanceof ArrayBuffer ? new Uint8Array(ev.data) : String(ev.data));
      // Lo que sale por la terminal, para quien necesite mirarlo (p. ej. saber si el agente cargó una skill).
      dispatchEvent(new CustomEvent("pjg-term-salida", { detail: ev.data instanceof ArrayBuffer ? dec.decode(ev.data, { stream: true }) : String(ev.data) }));
    };
    ws.onclose = () =>
      term.writeln(
        abrio
          ? "\r\n\x1b[33m[sesión cerrada — recarga para abrir otra]\x1b[0m"
          : "\r\n\x1b[33m[el terminal no está disponible en este servidor, o ya tienes otro abierto]\x1b[0m",
      );
    term.onData((d) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(enc.encode(d));
    });

    const alFoco = () => {
      pedirAjuste();
      term.focus();
    };
    addEventListener("resize", pedirAjuste);
    addEventListener("pjg-term-foco", alFoco);
    addEventListener("pjg-term-escribir", volcar);

    cleanup(() => {
      observador?.disconnect();
      if (pendiente) cancelAnimationFrame(pendiente);
      removeEventListener("resize", pedirAjuste);
      removeEventListener("pjg-term-foco", alFoco);
      removeEventListener("pjg-term-escribir", volcar);
      try {
        ws.close();
      } catch {
        /* ya cerrado */
      }
      term.dispose();
    });
  });

  return (
    <div class="term" aria-label="Terminal">
      <div ref={ref} class="term-host" />
    </div>
  );
});
