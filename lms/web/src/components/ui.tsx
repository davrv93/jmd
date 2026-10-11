import { component$, Slot, useSignal, $, type QRL } from "@builder.io/qwik";
import { Link } from "@builder.io/qwik-city";
import { Icon } from "./icon";

// Piezas comunes de la interfaz: pestañas, estados (cargando, vacío, error), progreso,
// estado de una sesión, cabecera de página y comando copiable.

export interface TabDef {
  id: string;
  label: string;
  icon?: string;
  count?: number;
}

export const Tabs = component$((props: { tabs: TabDef[]; active: string; onSelect$: QRL<(id: string) => void> }) => {
  return (
    <div class="tabs" role="tablist">
      {props.tabs.map((t) => (
        <button
          key={t.id}
          id={`tab-${t.id}`}
          type="button"
          role="tab"
          class={`tab ${t.id === props.active ? "on" : ""}`}
          aria-selected={t.id === props.active}
          onClick$={() => props.onSelect$(t.id)}
        >
          {t.icon && <Icon name={t.icon} size={15} />}
          <span>{t.label}</span>
          {t.count !== undefined && t.count > 0 && <span class="count">{t.count}</span>}
        </button>
      ))}
    </div>
  );
});

export const Loading = component$((props: { lines?: number }) => (
  <div class="skel-wrap" aria-busy="true" aria-label="Cargando">
    <div class="skel h" />
    {Array.from({ length: props.lines ?? 4 }, (_, i) => (
      <div key={i} class="skel" style={`width:${92 - i * 11}%`} />
    ))}
  </div>
));

export const Empty = component$((props: { icon?: string; title: string; text?: string }) => (
  <div class="empty">
    <span class="empty-ico">
      <Icon name={props.icon ?? "info"} size={22} />
    </span>
    <b>{props.title}</b>
    {props.text && <p>{props.text}</p>}
    <Slot />
  </div>
));

export const ErrorState = component$((props: { message: string; retry$?: QRL<() => void> }) => (
  <div class="empty bad" role="alert">
    <span class="empty-ico">
      <Icon name="alert" size={22} />
    </span>
    <b>No se pudo cargar</b>
    <p>{props.message}</p>
    {props.retry$ && (
      <button type="button" class="btn ghost sm" onClick$={props.retry$}>
        <Icon name="refresh" size={14} /> Reintentar
      </button>
    )}
  </div>
));

export const Ring = component$((props: { pct: number; size?: number; label?: string }) => {
  const s = props.size ?? 44;
  const r = (s - 6) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, Math.round(props.pct)));
  return (
    <span class="ring" style={`width:${s}px;height:${s}px`} title={props.label ?? `${pct}% completado`}>
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} aria-hidden="true">
        <circle cx={s / 2} cy={s / 2} r={r} class="ring-bg" />
        <circle cx={s / 2} cy={s / 2} r={r} class="ring-fg" stroke-dasharray={`${(c * pct) / 100} ${c}`} transform={`rotate(-90 ${s / 2} ${s / 2})`} />
      </svg>
      <span class="ring-txt">{pct}%</span>
    </span>
  );
});

/** Anillo del ciclo de Kolb: cuatro arcos, uno por fase, con el progreso global en el centro. */
export const CycleRing = component$((props: { phases: { token: string; done: number; total: number }[]; size?: number; label?: string }) => {
  const s = props.size ?? 52;
  const r = (s - 5) / 2;
  const c = 2 * Math.PI * r;
  const seg = c / props.phases.length;
  const done = props.phases.reduce((a, p) => a + p.done, 0);
  const total = props.phases.reduce((a, p) => a + p.total, 0);
  const pct = total ? Math.round((100 * done) / total) : 0;
  return (
    <span class="cycle-ring" style={`width:${s}px;height:${s}px`} title={props.label ?? `${pct}% del ciclo`} aria-label={`${pct}% del ciclo de aprendizaje`}>
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} aria-hidden="true">
        <circle cx={s / 2} cy={s / 2} r={r} class="cr-bg" />
        {props.phases.map((p, i) => {
          const frac = p.total ? Math.min(1, p.done / p.total) : 0;
          const gap = seg * 0.07;
          const len = (seg - gap) * frac;
          return (
            <circle
              key={i}
              cx={s / 2}
              cy={s / 2}
              r={r}
              class="cr-seg"
              style={`stroke:var(--ph-${p.token})`}
              stroke-dasharray={`${len} ${c - len}`}
              stroke-dashoffset={-(i * seg + gap / 2)}
              transform={`rotate(-90 ${s / 2} ${s / 2})`}
            />
          );
        })}
      </svg>
      <span class="cr-txt">{pct}%</span>
    </span>
  );
});

export const Bar = component$((props: { pct: number }) => (
  <span class="bar" role="progressbar" aria-valuenow={Math.round(props.pct)} aria-valuemin={0} aria-valuemax={100}>
    <i style={`width:${Math.max(0, Math.min(100, props.pct))}%`} />
  </span>
));

/** Estado de una sesión según los pasos del ciclo hechos. */
export function lessonState(done: number, total: number, published = true): { icon: string; cls: string; label: string } {
  if (!published) return { icon: "lock", cls: "muted", label: "Borrador" };
  if (total > 0 && done >= total) return { icon: "checkCircle", cls: "ok", label: "Completada" };
  if (done > 0) return { icon: "half", cls: "accent", label: "En curso" };
  return { icon: "circle", cls: "muted", label: "Sin empezar" };
}

export const Crumbs = component$((props: { items: { href?: string; label: string }[] }) => (
  <nav class="crumbs" aria-label="Ruta">
    {props.items.map((it, i) => (
      <span key={i}>
        {i > 0 && <Icon name="chevronRight" size={12} />}
        {it.href ? <Link href={it.href}>{it.label}</Link> : <span>{it.label}</span>}
      </span>
    ))}
  </nav>
));

/** Comando de una línea con botón de copiar. */
export const Copy = component$((props: { text: string }) => {
  const done = useSignal(false);
  const copy = $(async () => {
    try {
      await navigator.clipboard.writeText(props.text);
      done.value = true;
      setTimeout(() => (done.value = false), 1400);
    } catch {
      /* sin portapapeles: se copia a mano */
    }
  });
  return (
    <span class="cmd">
      <code>{props.text}</code>
      <button type="button" class="icon-btn" onClick$={copy} title={done.value ? "Copiado" : "Copiar"} aria-label="Copiar">
        <Icon name={done.value ? "check" : "copy"} size={14} />
      </button>
    </span>
  );
});

export const Chip = component$((props: { on?: boolean; onClick$?: QRL<() => void> }) => (
  <button type="button" class={`chip ${props.on ? "on" : ""}`} aria-pressed={!!props.on} onClick$={props.onClick$}>
    <Slot />
  </button>
));

export const Status = component$((props: { s: { label: string; cls: string; icon: string } }) => (
  <span class={`badge ${props.s.cls}`}>
    <Icon name={props.s.icon} size={12} />
    {props.s.label}
  </span>
));
