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
    fit.fit();

    const proto = location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${proto}://${location.host}/api/v1/term`);
    ws.binaryType = "arraybuffer";
    const enc = new TextEncoder();
    const sendSize = () => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ cols: term.cols, rows: term.rows }));
    };
    ws.onopen = () => {
      sendSize();
      term.focus();
    };
    ws.onmessage = (ev) => term.write(ev.data instanceof ArrayBuffer ? new Uint8Array(ev.data) : String(ev.data));
    ws.onclose = () => term.writeln("\r\n\x1b[33m[sesión cerrada — recarga para abrir otra]\x1b[0m");
    term.onData((d) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(enc.encode(d));
    });

    const onResize = () => {
      fit.fit();
      sendSize();
    };
    addEventListener("resize", onResize);

    cleanup(() => {
      removeEventListener("resize", onResize);
      try {
        ws.close();
      } catch {
        /* ya cerrado */
      }
      term.dispose();
    });
  });

  return <div ref={ref} class="term" aria-label="Terminal" />;
});
