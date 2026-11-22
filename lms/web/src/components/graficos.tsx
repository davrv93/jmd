import { component$, useSignal, useStyles$, useVisibleTask$, $, type QRL } from "@builder.io/qwik";
import type { CatalogoCurso } from "~/lib/api";
import { fCorta, fDia, fHora, fMes } from "~/lib/marca";
import CSS from "./graficos.css?inline";

// Gráficos del portal del alumno. Cada uno responde a una pregunta y nada más:
// - AnillosCurso: ¿cuánto llevo de este curso? Sesiones hechas (color del curso) y tareas entregadas
//   (oro), dos anillos concéntricos con su leyenda en texto al lado; van en múltiplos pequeños, uno por
//   curso activo, para comparar de un vistazo.
// - LineaTiempo: ¿qué viene en las próximas 8 semanas? Una cinta tipo Gantt: una fila por grupo, un
//   punto por sesión, la línea de hoy en oro. Lleva su tabla (lista de fechas) para leerla sin color.
// - Camino: ¿estoy avanzando? Escalera de cursos terminados en el tiempo; lo que ya está inscrito y
//   termina después de hoy sigue en trazo discontinuo (lo que viene).
// Reglas (skill dataviz): marcas finas, rejilla de un píxel, texto con tokens de tinta (nunca del color
// de la serie), cifras tabulares solo en ejes, información por foco de teclado igual que al pasar el
// cursor y una vista en lista para lo que solo diga el color.

/** Dos anillos: sesiones (afuera, color del curso) y tareas (adentro, oro). Sin texto propio: la
 *  tarjeta que lo contiene da las cifras con su leyenda. */
export const AnillosCurso = component$((p: { hechas: number; sesiones: number; entregadas: number; tareas: number; size?: number }) => {
  useStyles$(CSS);
  const s = p.size ?? 72;
  const c = s / 2;
  const ro = c - 4, ri = c - 13;
  const arco = (r: number, v: number, t: number) => {
    const L = 2 * Math.PI * r;
    const f = t > 0 ? Math.max(0, Math.min(1, v / t)) : 0;
    return { L, d: f * L };
  };
  const a = arco(ro, p.hechas, p.sesiones);
  const b = arco(ri, p.entregadas, p.tareas);
  const pct = p.sesiones ? Math.round((100 * p.hechas) / p.sesiones) : 0;
  return (
    <svg class="anillos" width={s} height={s} viewBox={`0 0 ${s} ${s}`} role="img" aria-label={`${p.hechas} de ${p.sesiones} sesiones hechas; ${p.entregadas} de ${p.tareas} tareas entregadas`}>
      <circle cx={c} cy={c} r={ro} class="an-pista" />
      {a.d > 0 && <circle cx={c} cy={c} r={ro} class="an-ses" stroke-dasharray={`${a.d} ${a.L}`} transform={`rotate(-90 ${c} ${c})`} />}
      {p.tareas > 0 && <circle cx={c} cy={c} r={ri} class="an-pista" />}
      {p.tareas > 0 && b.d > 0 && <circle cx={c} cy={c} r={ri} class="an-tar" stroke-dasharray={`${b.d} ${b.L}`} transform={`rotate(-90 ${c} ${c})`} />}
      <text x={c} y={c} class="an-txt" text-anchor="middle" dominant-baseline="central">{pct}%</text>
    </svg>
  );
});

/** Lunes 00:00 (hora de Lima) de la semana de `ms`. */
function lunesLima(ms: number): number {
  const d = new Date(ms - 5 * 3600e3); // reloj de Lima en UTC
  const dia = (d.getUTCDay() + 6) % 7;
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - dia) + 5 * 3600e3;
}

interface Tip {
  x: number;
  y: number;
  titulo: string;
  linea: string;
  extra: string;
}

/** Cinta de las próximas `semanas` semanas: una fila por grupo, un punto por sesión. */
export const LineaTiempo = component$((p: { cursos: CatalogoCurso[]; ahora: number; semanas?: number; onCurso$?: QRL<(id: string) => void> }) => {
  useStyles$(CSS);
  const tip = useSignal<Tip | null>(null);
  const caja = useSignal<HTMLElement>();
  const semanas = p.semanas ?? 8;
  const ini = lunesLima(p.ahora);
  const fin = ini + semanas * 7 * 86400e3;
  const pos = (ms: number) => ((ms - ini) / (fin - ini)) * 100;
  const filas = p.cursos
    .map((c) => {
      const ses = c.sesiones.map((s) => ({ ...s, t: Date.parse(s.inicio) }));
      return { c, ses, dentro: ses.filter((s) => s.t >= ini && s.t < fin) };
    })
    .filter((f) => f.dentro.length > 0);
  const despues = p.cursos.filter((c) => Date.parse(c.inicio) >= fin).length;

  const mostrar = $((e: Event, titulo: string, linea: string, extra: string) => {
    const el = e.target as HTMLElement;
    const box = caja.value?.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    if (!box) return;
    const medio = Math.min(110, box.width / 2 - 4);
    const x = Math.min(Math.max(r.left + r.width / 2 - box.left, medio), box.width - medio);
    tip.value = { x, y: r.top - box.top, titulo, linea, extra };
  });
  const ocultar = $(() => (tip.value = null));

  return (
    <div class="lt" ref={caja} onPointerLeave$={ocultar}>
      <div class="lt-cab" aria-hidden="true">
        <span class="lt-cab-hueco" />
        <span class="lt-escala">
          {Array.from({ length: semanas }, (_, i) => (
            <span key={i} style={`left:${(100 * i) / semanas}%`}>{fCorta(ini + i * 7 * 86400e3)}</span>
          ))}
        </span>
      </div>
      <ul class="lt-filas">
        {filas.map(({ c, ses, dentro }) => {
          const a = Math.max(0, pos(dentro[0].t));
          const b = Math.min(100, pos(ses[ses.length - 1].t));
          const sigue = ses.some((s) => s.t >= fin);
          return (
            <li key={c.id} class={`lt-fila${c.inscrito ? " mio" : ""}`} data-idc={c.identidad.color}>
              <button type="button" class="lt-nombre" onClick$={() => p.onCurso$?.(c.id)} aria-label={`${c.nombre}, ${c.grupo}: ver la tarjeta para inscribirte`}>
                <b>{c.nombre}</b>
                <span>
                  {c.grupo}
                  {c.inscrito ? " · estás inscrito" : ""}
                </span>
              </button>
              <span class="lt-pista">
                <i class="lt-hoy" style={`left:${pos(p.ahora)}%`} aria-hidden="true" />
                <i class="lt-tramo" style={`left:${a}%;width:${Math.max(0, b - a)}%`} aria-hidden="true" />
                {dentro.map((s) => {
                  const pasada = s.t + s.minutos * 60e3 < p.ahora;
                  const titulo = `${c.nombre} · ${c.grupo}`;
                  const linea = `Sesión ${s.n} de ${ses.length} · ${fDia(s.t)}, ${fHora(s.t)}`;
                  return (
                    <button
                      key={s.n}
                      type="button"
                      class={`lt-ses${pasada ? " pasada" : ""}`}
                      style={`left:${pos(s.t)}%`}
                      aria-label={`${titulo}. ${linea}. ${s.titulo}`}
                      onPointerEnter$={(e) => mostrar(e, titulo, linea, s.titulo)}
                      onFocus$={(e) => mostrar(e, titulo, linea, s.titulo)}
                      onBlur$={ocultar}
                      onClick$={(e) => mostrar(e, titulo, linea, s.titulo)}
                    />
                  );
                })}
                {sigue && <span class="lt-sigue" aria-hidden="true">→</span>}
              </span>
            </li>
          );
        })}
      </ul>
      {tip.value && (
        <div class="lt-tip" role="status" style={`left:${tip.value.x}px;top:${tip.value.y}px`}>
          <b>{tip.value.linea}</b>
          <span>{tip.value.titulo}</span>
          {tip.value.extra && <span class="muted">{tip.value.extra}</span>}
        </div>
      )}
      <p class="lt-pie">
        <span class="lt-ley"><i class="hoy" /> Hoy</span>
        <span class="lt-ley"><i class="pto" /> Sesión en vivo</span>
        <span class="lt-ley"><i class="pto pasada" /> Ya pasó</span>
        {despues > 0 && <span>{despues === 1 ? "1 curso empieza" : `${despues} cursos empiezan`} después del {fCorta(fin - 86400e3)}</span>}
      </p>
      <details class="tabla-vista">
        <summary>Ver las fechas como lista</summary>
        <table>
          <thead>
            <tr>
              <th scope="col">Fecha</th>
              <th scope="col">Curso</th>
              <th scope="col">Sesión</th>
            </tr>
          </thead>
          <tbody>
            {filas
              .flatMap(({ c, ses, dentro }) => dentro.map((s) => ({ c, s, total: ses.length })))
              .sort((x, y) => x.s.t - y.s.t)
              .map(({ c, s, total }) => (
                <tr key={`${c.id}-${s.n}`}>
                  <td class="num">{fDia(s.t)}, {fHora(s.t)}</td>
                  <td>{c.nombre} · {c.grupo}</td>
                  <td>{s.n} de {total} · {s.titulo}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </details>
    </div>
  );
});

/** Un punto del camino: un curso del alumno y cuándo termina (o terminó). */
export interface PasoCamino {
  nombre: string;
  fin: number;
}

/** Escalera de cursos terminados en el tiempo, con lo inscrito por delante en trazo discontinuo. */
export const Camino = component$((p: { pasos: PasoCamino[]; ahora: number }) => {
  useStyles$(CSS);
  const caja = useSignal<HTMLElement>();
  const ancho = useSignal(0);
  const foco = useSignal(-1);
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ cleanup }) => {
    const el = caja.value;
    if (!el) return;
    const ro = new ResizeObserver(() => (ancho.value = el.clientWidth));
    ro.observe(el);
    ancho.value = el.clientWidth;
    cleanup(() => ro.disconnect());
  });

  const pasos = [...p.pasos].sort((a, b) => a.fin - b.fin);
  const W = ancho.value || 320;
  const H = 150;
  const m = { l: 26, r: 14, t: 16, b: 26 };
  const hechos = pasos.filter((x) => x.fin <= p.ahora).length;
  const t0 = Math.min(p.ahora, ...pasos.map((x) => x.fin)) - 10 * 86400e3;
  const t1 = Math.max(p.ahora, ...pasos.map((x) => x.fin)) + 10 * 86400e3;
  const X = (t: number) => m.l + ((t - t0) / (t1 - t0)) * (W - m.l - m.r);
  const total = Math.max(1, pasos.length);
  const Y = (v: number) => H - m.b - (v / total) * (H - m.t - m.b);

  // Escalera: horizontal hasta la fecha, sube un peldaño. Hecha (sólida) hasta hoy; por venir, discontinua.
  let dSol = `M${X(t0)} ${Y(0)}`;
  let dFut = `M${X(p.ahora)} ${Y(hechos)}`;
  pasos.forEach((x, i) => {
    const seg = ` H${X(x.fin)} V${Y(i + 1)}`;
    if (i < hechos) dSol += seg;
    else dFut += seg;
  });
  dSol += ` H${X(p.ahora)}`;
  if (hechos === pasos.length) dFut = "";
  const area = `${dSol} V${Y(0)} Z`;
  // Meses en el eje.
  const meses: number[] = [];
  const d = new Date(t0);
  for (let k = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1) + 5 * 3600e3; k < t1; ) {
    meses.push(k);
    const q = new Date(k - 5 * 3600e3);
    k = Date.UTC(q.getUTCFullYear(), q.getUTCMonth() + 1, 1) + 5 * 3600e3;
  }
  const sel = foco.value >= 0 ? pasos[foco.value] : null;

  const xs = pasos.map((q) => X(q.fin));
  const mover = $((e: PointerEvent) => {
    const el = caja.value;
    if (!el || xs.length === 0) return;
    const x = e.clientX - el.getBoundingClientRect().left;
    let best = 0;
    xs.forEach((q, i) => {
      if (Math.abs(q - x) < Math.abs(xs[best] - x)) best = i;
    });
    foco.value = best;
  });

  return (
    <div class="camino" ref={caja}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${hechos} ${hechos === 1 ? "curso terminado" : "cursos terminados"} y ${pasos.length - hechos} por terminar`} onPointerMove$={mover} onPointerLeave$={() => (foco.value = -1)}>
        <line x1={m.l} x2={W - m.r} y1={Y(0)} y2={Y(0)} class="cm-eje" />
        {total > 1 && <line x1={m.l} x2={W - m.r} y1={Y(total)} y2={Y(total)} class="cm-rej" />}
        <text x={m.l - 6} y={Y(0)} class="cm-tick" text-anchor="end" dominant-baseline="central">0</text>
        <text x={m.l - 6} y={Y(total)} class="cm-tick" text-anchor="end" dominant-baseline="central">{total}</text>
        {meses.map((k) => (
          <text key={k} x={X(k)} y={H - 8} class="cm-tick" text-anchor="middle">{fMes(k)}</text>
        ))}
        <path d={area} class="cm-area" />
        <path d={dSol} class="cm-linea" />
        {dFut && <path d={dFut} class="cm-linea futura" />}
        <line x1={X(p.ahora)} x2={X(p.ahora)} y1={m.t - 6} y2={Y(0)} class="cm-hoy" />
        <text x={X(p.ahora)} y={m.t - 8} class="cm-tick hoy" text-anchor={X(p.ahora) > W - 40 ? "end" : "middle"}>Hoy</text>
        {pasos.map((x, i) => (
          <circle
            key={i}
            cx={X(x.fin)}
            cy={Y(i + 1)}
            r={foco.value === i ? 6 : 4.5}
            class={`cm-pto${x.fin > p.ahora ? " futuro" : ""}`}
            tabindex={0}
            aria-label={`${x.nombre}: ${x.fin > p.ahora ? "termina" : "terminó"} el ${fCorta(x.fin)}`}
            onFocus$={() => (foco.value = i)}
            onBlur$={() => (foco.value = -1)}
          />
        ))}
      </svg>
      {sel && (
        <div class="lt-tip cm-tip" role="status" style={`left:${Math.min(Math.max(X(sel.fin), 100), W - 100)}px;top:${Y(pasos.indexOf(sel) + 1)}px`}>
          <b>{sel.fin > p.ahora ? `Termina el ${fCorta(sel.fin)}` : `Terminaste el ${fCorta(sel.fin)}`}</b>
          <span>{sel.nombre}</span>
        </div>
      )}
      <details class="tabla-vista">
        <summary>Ver como lista</summary>
        <table>
          <tbody>
            {pasos.map((x, i) => (
              <tr key={i}>
                <td class="num">{fCorta(x.fin)}</td>
                <td>{x.nombre}</td>
                <td>{x.fin > p.ahora ? "Por terminar" : "Terminado"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
});
