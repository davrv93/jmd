import { component$, useContext, useSignal, useStore, useStyles$, useVisibleTask$, $ } from "@builder.io/qwik";
import { type DocumentHead, type StaticGenerateHandler } from "@builder.io/qwik-city";
import { SessionContext } from "~/lib/session";
import { pathId, setTitle } from "~/lib/url";
import { Icon } from "~/components/icon";
import { ErrorState, Loading } from "~/components/ui";

// Patrocinadores (/patrocinio/<código>/): eligen hasta 5 cursos y crean su usuario y contraseña, sin
// pago. Quien ya tiene cuenta entra y suma los cursos. El código de la URL es la invitación: el
// servidor lo compara con LMS_PATROCINIO y solo ofrece cursos con inscripción abierta que no terminaron.

interface ClaseP { inicio: string; minutos: number }
interface CursoP { id: string; slug: string; title: string; description: string; fechas: string[]; clases?: ClaseP[]; nombre?: string; grupo?: string }

// Calendario que se arma mientras el patrocinador marca: cada curso elegido toma un color y sus clases
// aparecen en el mes; si dos clases se cruzan, el día se marca y se avisa debajo. Hora de Lima (-05:00).
const COLORES = ["var(--accent)", "var(--ph-or)", "var(--gold)", "var(--ph-ea)", "var(--k-link)"];
const LIMA = -5 * 3600e3;
const enLima = (iso: string) => new Date(Date.parse(iso) + LIMA); // leer con getUTC*
const claveDia = (d: Date) => `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
const MES = new Intl.DateTimeFormat("es-PE", { month: "long", year: "numeric", timeZone: "UTC" });
const HORA_C = new Intl.DateTimeFormat("es-PE", { hour: "numeric", minute: "2-digit", timeZone: "America/Lima" });
const corto = (c: CursoP) => (c.nombre || c.title.split(" · ")[0]) + (c.grupo ? ` · ${c.grupo}` : "");
interface InfoP { max: number; cursos: CursoP[] }

const DIA = new Intl.DateTimeFormat("es-PE", { weekday: "short", day: "numeric", month: "short", timeZone: "America/Lima" });
const HORA = new Intl.DateTimeFormat("es-PE", { hour: "numeric", minute: "2-digit", timeZone: "America/Lima" });

async function llamar<T>(metodo: string, ruta: string, cuerpo?: unknown): Promise<{ ok: boolean; status: number; datos: T & { error?: { code: string; message: string } } }> {
  const r = await fetch(ruta, { method: metodo, credentials: "same-origin", headers: cuerpo ? { "Content-Type": "application/json" } : {}, body: cuerpo ? JSON.stringify(cuerpo) : undefined });
  const datos = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, datos };
}

const CSS = `
.pt { max-width: 72rem; margin: 0 auto; }
.pt-cab { max-width: 46rem; }
.pt-cols { display: grid; grid-template-columns: minmax(0, 1fr) 24rem; grid-template-areas: "cuenta cal" "lista cal" "form cal"; column-gap: 1.4rem; align-items: start; }
.pt-cols > .pt-cuenta { grid-area: cuenta; }
.pt-cols > .pt-cal { grid-area: cal; }
.pt-cols > .pt-lista { grid-area: lista; }
.pt-cols > .pt-form { grid-area: form; }
.pt-cal { position: sticky; top: 64px; padding: 1rem; }
.pt-cal h2 { margin: 0 0 .15rem; font-size: 1.05rem; }
.pt-cal-sub { margin: 0 0 .7rem; font-size: .85rem; color: var(--muted); font-variant-numeric: tabular-nums; }
.pt-leyenda { list-style: none; margin: 0 0 .8rem; padding: 0; display: grid; gap: .25rem; font-size: .84rem; }
.pt-leyenda li { display: flex; align-items: center; gap: .45rem; min-width: 0; }
.pt-leyenda i, .pt-sw { width: .7rem; height: .7rem; border-radius: 3px; background: var(--c); flex: none; }
.pt-leyenda span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pt-mes { margin: 0 0 .8rem; }
.pt-mes h3 { margin: 0 0 .35rem; font-size: .88rem; font-weight: 650; }
.pt-grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 3px; }
.pt-grid .dn { font-size: .68rem; font-weight: 650; color: var(--faint); text-align: center; padding-bottom: .15rem; }
.pt-dia { min-height: 2.6rem; padding: .2rem .25rem; border-radius: 6px; background: var(--s2); font-size: .7rem; color: var(--muted); font-variant-numeric: tabular-nums; display: flex; flex-direction: column; gap: 2px; }
.pt-dia.fuera { background: none; }
.pt-dia.hoy { box-shadow: inset 0 0 0 1px var(--line2); color: var(--fg); font-weight: 650; }
.pt-dia.cruce { box-shadow: inset 0 0 0 2px var(--bad); background: var(--bad-bg); }
.pt-ses { display: block; border-radius: 3px; padding: 1px 3px; background: var(--c); color: #fff; font-size: .62rem; font-weight: 650; line-height: 1.25; white-space: nowrap; overflow: hidden; }
.pt-ses.pasada { opacity: .45; }
.pt-avisos { list-style: none; margin: .2rem 0 0; padding: .6rem .7rem; border-radius: var(--r); background: var(--bad-bg); color: var(--bad); font-size: .84rem; display: grid; gap: .3rem; }
.pt-vacio { font-size: .88rem; color: var(--muted); padding: .8rem; border: 1px dashed var(--line2); border-radius: var(--r); text-align: center; }
.pt-cuenta .pt-vercal, .pt-cal .pt-cerrar { display: none; }
.pt-cal-cab { display: flex; align-items: flex-start; justify-content: space-between; gap: .6rem; }
@media (max-width: 960px) {
  .pt-cols { grid-template-columns: 1fr; grid-template-areas: "cuenta" "cal" "lista" "form"; }
  .pt-cal { display: none; }
  /* En el celular el horario se abre como una hoja desde abajo, encima de la lista: se ve mientras se marca. */
  .pt-cal.abierto { display: block; position: fixed; left: 0; right: 0; bottom: 0; top: auto; z-index: 40; max-height: 72vh; overflow: auto; border-radius: var(--r2) var(--r2) 0 0; box-shadow: 0 -12px 32px rgba(20, 16, 60, .22); padding-bottom: calc(1rem + env(safe-area-inset-bottom)); }
  .pt-cuenta .pt-vercal, .pt-cal .pt-cerrar { display: inline-flex; }
  .pt-cuenta { flex-wrap: wrap; }
}
.pt h1 { margin: 0 0 .35rem; }
.pt-intro { margin: 0 0 1.2rem; color: var(--muted); max-width: 60ch; }
.pt-cuenta { position: sticky; top: 52px; z-index: 2; display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: .6rem .9rem; margin: 0 0 .6rem; border: 1px solid var(--line); border-radius: var(--r2); background: var(--s1); box-shadow: var(--shadow-xs); font-size: .9rem; font-variant-numeric: tabular-nums; }
.pt-cuenta b { font-size: 1rem; }
.pt-tramos { display: flex; gap: 3px; }
.pt-tramos i { width: 1.4rem; height: 6px; border-radius: 3px; background: var(--s3); }
.pt-tramos i.on { background: var(--accent); }
.pt-lista { list-style: none; margin: 0 0 1.4rem; padding: 0; display: grid; gap: .5rem; }
.pt-curso { margin: 0; font-size: 1rem; font-weight: 400; color: var(--fg); letter-spacing: normal; text-transform: none; display: grid; grid-template-columns: auto minmax(0, 1fr); gap: .8rem; align-items: start; padding: .85rem 1rem; border: 1px solid var(--line); border-radius: var(--r2); background: var(--s1); cursor: pointer; }
.pt-curso:hover { background: var(--s2); }
.pt-curso:has(input:checked) { border-color: var(--accent); background: var(--accent-bg); }
.pt-curso:has(input:disabled) { cursor: not-allowed; opacity: .55; }
.pt-curso:has(input:checked) .pt-sw { display: inline-block; }
.pt-sw { display: none; margin-right: .35rem; vertical-align: .05em; }
.pt-curso input { width: 20px; height: 20px; margin: .15rem 0 0; accent-color: var(--accent); }
.pt-t { display: block; font-size: 1rem; font-weight: 650; line-height: 1.3; color: var(--fg); }
.pt-d { margin-top: .2rem; font-size: .85rem; color: var(--muted); font-variant-numeric: tabular-nums; }
.pt-desc { margin-top: .3rem; font-size: .85rem; color: var(--muted); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.pt-form { padding: 1.1rem 1.2rem; }
.pt-form h2 { margin: 0 0 .2rem; font-size: 1.1rem; }
.pt-ok { text-align: center; padding: 2rem 1.2rem; }
@media (max-width: 640px) { .pt-curso { padding: .8rem .8rem; } .pt-form .btn { min-height: 44px; } }
`;

export default component$(() => {
  useStyles$(CSS);
  const session = useContext(SessionContext);
  const st = useStore<{ info: InfoP | null; error: string; codigo: string; elegidos: string[]; hecho: string[] | null }>({ info: null, error: "", codigo: "", elegidos: [], hecho: null });
  const form = useStore({ name: "", email: "", password: "" });
  const error = useSignal("");
  const yaTiene = useSignal(false);
  const busy = useSignal(false);
  const verCal = useSignal(false);

  const load = $(async () => {
    st.error = "";
    st.codigo = pathId("patrocinio");
    const r = await llamar<InfoP>("GET", `/api/v1/patrocinio/${encodeURIComponent(st.codigo)}`);
    if (!r.ok) {
      st.error = r.status === 404 ? "Este enlace de patrocinadores no es válido o ya se cerró. Pide el enlace actualizado a JMD Learning." : r.datos.error?.message || "No se pudo cargar la página.";
      return;
    }
    st.info = r.datos;
    setTitle("Patrocinadores · elige tus cursos");
  });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async () => {
    await load();
  });

  const alternar = $((id: string) => {
    if (st.elegidos.includes(id)) st.elegidos = st.elegidos.filter((x) => x !== id);
    else if (st.elegidos.length < (st.info?.max ?? 5)) st.elegidos = [...st.elegidos, id];
  });

  const enviar = $(async () => {
    error.value = "";
    yaTiene.value = false;
    if (!st.elegidos.length) {
      error.value = "Elige al menos un curso.";
      return;
    }
    busy.value = true;
    try {
      const base = `/api/v1/patrocinio/${encodeURIComponent(st.codigo)}`;
      const r = session.me
        ? await llamar<{ cursos: string[] }>("POST", `${base}/unirme`, { cursos: st.elegidos })
        : await llamar<{ cursos: string[] }>("POST", base, { ...form, cursos: st.elegidos });
      if (r.ok) {
        st.hecho = r.datos.cursos ?? [];
        return;
      }
      if (r.datos.error?.code === "ya_registrado") yaTiene.value = true;
      error.value = r.datos.error?.message || "No se pudo completar la inscripción. Vuelve a intentarlo.";
    } catch {
      error.value = "Sin conexión. Revisa tu internet y vuelve a intentarlo.";
    } finally {
      busy.value = false;
    }
  });

  if (st.error) return <ErrorState message={st.error} retry$={load} />;
  const info = st.info;
  if (!info) return <Loading lines={5} />;
  const me = session.me;
  const entrar = `/?next=${encodeURIComponent(typeof location === "undefined" ? "/" : location.pathname)}`;
  const n = st.elegidos.length;

  if (st.hecho)
    return (
      <div class="pt">
        <div class="card pt-ok" data-testid="patrocinio-listo">
          <span class="lead-ico gold" style="width:52px;height:52px;margin:0 auto .8rem"><Icon name="check" size={24} /></span>
          <h1>¡Listo! Ya estás en {st.hecho.length} {st.hecho.length === 1 ? "curso" : "cursos"}</h1>
          <p class="pt-intro" style="margin:0 auto 1.2rem">Gracias por apoyar a JMD Learning. Entra con tu correo y tu contraseña cuando quieras; tus cursos están en «Aprender».</p>
          <a class="btn" href="/courses/">Ver mis cursos <Icon name="chevronRight" size={14} /></a>
        </div>
      </div>
    );

  // Calendario de lo elegido.
  const elegidos = st.elegidos.map((id) => info.cursos.find((c) => c.id === id)).filter((c): c is CursoP => !!c);
  const color = (id: string) => COLORES[st.elegidos.indexOf(id) % COLORES.length];
  const sesiones = elegidos.flatMap((c) =>
    (c.clases?.length ? c.clases : c.fechas.map((f) => ({ inicio: f, minutos: 90 }))).map((k) => ({ c, ini: Date.parse(k.inicio), fin: Date.parse(k.inicio) + k.minutos * 60e3, iso: k.inicio })),
  );
  sesiones.sort((a, b) => a.ini - b.ini);
  const cruces: { a: (typeof sesiones)[number]; b: (typeof sesiones)[number] }[] = [];
  sesiones.forEach((a, i) => sesiones.slice(i + 1).forEach((b) => a.c.id !== b.c.id && b.ini < a.fin && a.ini < b.fin && cruces.push({ a, b })));
  const diasCruce = new Set(cruces.flatMap(({ a, b }) => [claveDia(enLima(a.iso)), claveDia(enLima(b.iso))]));
  const ahoraMs = Date.now();
  const hoyClave = claveDia(new Date(ahoraMs + LIMA));
  // Meses a mostrar: desde el mes de la primera clase elegida (o de hoy) hasta el de la última.
  const desde = enLima(sesiones[0]?.iso ?? new Date(ahoraMs).toISOString());
  const hasta = enLima(sesiones[sesiones.length - 1]?.iso ?? new Date(ahoraMs).toISOString());
  const meses: Date[] = [];
  for (let m = new Date(Date.UTC(desde.getUTCFullYear(), desde.getUTCMonth(), 1)); m <= hasta && meses.length < 4; m = new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth() + 1, 1))) meses.push(m);
  if (!meses.length) meses.push(new Date(Date.UTC(desde.getUTCFullYear(), desde.getUTCMonth(), 1)));
  const porDia = new Map<string, typeof sesiones>();
  for (const x of sesiones) {
    const k = claveDia(enLima(x.iso));
    porDia.set(k, [...(porDia.get(k) ?? []), x]);
  }
  const totalClases = sesiones.length;

  const calendario = (
    <aside class={`card pt-cal${verCal.value ? " abierto" : ""}`} aria-labelledby="pt-cal-t" data-testid="patrocinio-calendario">
      <div class="pt-cal-cab">
        <h2 id="pt-cal-t">Tu horario</h2>
        <button type="button" class="btn sm pt-cerrar" onClick$={() => (verCal.value = false)}>Listo</button>
      </div>
      <p class="pt-cal-sub">
        {totalClases ? `${totalClases} ${totalClases === 1 ? "clase" : "clases"} · ${cruces.length ? `${cruces.length} ${cruces.length === 1 ? "cruce" : "cruces"}` : "sin cruces"}` : "Marca un curso y sus clases aparecen aquí."}
      </p>
      {elegidos.length > 0 && (
        <ul class="pt-leyenda">
          {elegidos.map((c) => (
            <li key={c.id} style={`--c:${color(c.id)}`}><i /><span>{corto(c)}</span></li>
          ))}
        </ul>
      )}
      {totalClases === 0 ? (
        <div class="pt-vacio">Aún no eliges cursos.</div>
      ) : (
        meses.map((m) => {
          const primerDia = (m.getUTCDay() + 6) % 7; // lunes = 0
          const diasMes = new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth() + 1, 0)).getUTCDate();
          const celdas = Array.from({ length: Math.ceil((primerDia + diasMes) / 7) * 7 }, (_, i) => i - primerDia + 1);
          return (
            <section key={m.toISOString()} class="pt-mes">
              <h3>{(() => { const t = MES.format(m); return t.charAt(0).toUpperCase() + t.slice(1); })()}</h3>
              <div class="pt-grid">
                {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => <span key={i} class="dn">{d}</span>)}
                {celdas.map((d, i) => {
                  if (d < 1 || d > diasMes) return <span key={i} class="pt-dia fuera" />;
                  const k = `${m.getUTCFullYear()}-${m.getUTCMonth()}-${d}`;
                  const ses = porDia.get(k) ?? [];
                  return (
                    <span key={i} class={`pt-dia${k === hoyClave ? " hoy" : ""}${diasCruce.has(k) ? " cruce" : ""}`}>
                      {d}
                      {ses.map((x) => (
                        <span key={x.c.id + x.iso} class={`pt-ses${x.fin < ahoraMs ? " pasada" : ""}`} style={`--c:${color(x.c.id)}`} title={`${corto(x.c)} · ${HORA_C.format(new Date(x.ini))}`}>
                          {HORA_C.format(new Date(x.ini)).replace(/\s?p\.\s?m\./, "p").replace(/\s?a\.\s?m\./, "a")}
                        </span>
                      ))}
                    </span>
                  );
                })}
              </div>
            </section>
          );
        })
      )}
      {cruces.length > 0 && (
        <ul class="pt-avisos" role="status">
          {cruces.slice(0, 4).map(({ a, b }) => (
            <li key={a.iso + b.iso + a.c.id + b.c.id}>
              <Icon name="alert" size={13} /> {DIA.format(new Date(a.ini)).replace(/\./g, "")}: {corto(a.c)} ({HORA_C.format(new Date(a.ini))}) se cruza con {corto(b.c)} ({HORA_C.format(new Date(b.ini))}).
            </li>
          ))}
        </ul>
      )}
    </aside>
  );

  return (
    <div class="pt">
      <div class="pt-cab">
      <h1>Elige tus cursos</h1>
      <p class="pt-intro">
        Gracias por patrocinar a JMD Learning. Elige hasta <b>{info.max} cursos</b>, sin costo, y crea tu usuario para entrar a las clases. Mientras marcas, se arma tu horario.
      </p>
      </div>

      {info.cursos.length === 0 ? (
        <div class="card" style="padding:1rem">No hay cursos abiertos en este momento. Escríbenos y te avisamos del próximo grupo.</div>
      ) : (
        <>
        <div class="pt-cols">
          <div class="pt-cuenta" aria-live="polite">
            <span><b>{n}</b> de {info.max} cursos elegidos</span>
            <button type="button" class="btn ghost sm pt-vercal" aria-expanded={verCal.value} onClick$={() => (verCal.value = !verCal.value)}>
              <Icon name="calendar" size={14} /> {verCal.value ? "Ocultar horario" : `Ver horario${totalClases ? ` · ${totalClases}` : ""}`}{cruces.length ? " · cruce" : ""}
            </button>
            <span class="pt-tramos" aria-hidden="true">
              {Array.from({ length: info.max }, (_, i) => <i key={i} class={i < n ? "on" : ""} />)}
            </span>
          </div>
          {calendario}
          <ul class="pt-lista" aria-label="Cursos disponibles">
            {info.cursos.map((c) => {
              const on = st.elegidos.includes(c.id);
              const lleno = !on && n >= info.max;
              const ahora = Date.now();
              const proxima = c.fechas.find((f) => Date.parse(f) + 3 * 3600e3 > ahora);
              const empezo = c.fechas.length > 0 && Date.parse(c.fechas[0]) < ahora;
              const cuando = (f: string) => `${DIA.format(new Date(f)).replace(/\./g, "")}, ${HORA.format(new Date(f))}`;
              return (
                <li key={c.id}>
                  <label class="pt-curso">
                    <input type="checkbox" checked={on} disabled={lleno} onChange$={() => alternar(c.id)} />
                    <span style="min-width:0">
                      <span class="pt-t"><i class="pt-sw" style={`--c:${on ? color(c.id) : "transparent"}`} aria-hidden="true" />{c.title}</span>
                      <span class="pt-d" style="display:block">
                        {c.fechas.length} {c.fechas.length === 1 ? "clase" : "clases"}
                        {proxima && (empezo ? ` · en curso, próxima clase el ${cuando(proxima)}` : ` · empieza el ${cuando(proxima)}`)}
                      </span>
                      {c.description && <span class="pt-desc">{c.description}</span>}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>

          <section class="card pt-form" aria-labelledby="pt-form-t">
            {me ? (
              <>
                <h2 id="pt-form-t">Agregar a tu cuenta</h2>
                <p class="sm muted" style="margin:0 0 .8rem">Entraste como <b>{me.name}</b>. Los cursos elegidos se suman a los que ya tienes.</p>
              </>
            ) : (
              <>
                <h2 id="pt-form-t">Crea tu usuario</h2>
                <p class="sm muted" style="margin:0 0 .4rem">Con este correo y esta contraseña entrarás a tus clases.</p>
              </>
            )}
            <form preventdefault:submit onSubmit$={enviar}>
              {!me && (
                <>
                  <label for="pt-name">Nombre y apellido</label>
                  <input id="pt-name" required minLength={3} autoComplete="name" value={form.name} onInput$={(_, el) => (form.name = el.value)} />
                  <label for="pt-email">Correo</label>
                  <input id="pt-email" type="email" required autoComplete="email" inputMode="email" value={form.email} onInput$={(_, el) => (form.email = el.value)} />
                  <label for="pt-pass">Contraseña</label>
                  <input id="pt-pass" type="password" required minLength={8} autoComplete="new-password" value={form.password} onInput$={(_, el) => (form.password = el.value)} />
                  <div class="hint">Mínimo 8 caracteres.</div>
                </>
              )}
              {error.value && (
                <p class="sm bad row" style="flex-wrap:nowrap" role="alert"><Icon name="alert" /> {error.value}</p>
              )}
              {yaTiene.value && (
                <a class="btn ghost" style="width:100%;justify-content:center;margin-top:.5rem" href={entrar}>Entrar con mi cuenta</a>
              )}
              <button type="submit" class="btn" style="width:100%;justify-content:center;margin-top:.9rem" disabled={busy.value || n === 0}>
                {busy.value ? "Guardando…" : n === 0 ? "Elige al menos un curso" : me ? `Agregar ${n} ${n === 1 ? "curso" : "cursos"}` : `Crear mi cuenta con ${n} ${n === 1 ? "curso" : "cursos"}`}
              </button>
            </form>
            {!me && (
              <p class="xs muted" style="text-align:center;margin:.8rem 0 0">
                ¿Ya tienes cuenta de JMD Learning? <a href={entrar}>Entra con ella</a> y agrega los cursos.
              </p>
            )}
          </section>
        </div>
        </>
      )}
    </div>
  );
});

export const onStaticGenerate: StaticGenerateHandler = async () => ({ params: [{ codigo: "_" }] });

export const head: DocumentHead = { title: "Patrocinadores", meta: [{ name: "robots", content: "noindex" }] };
