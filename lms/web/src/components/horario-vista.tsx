import { component$, useSignal, useTask$ } from "@builder.io/qwik";
import { Link } from "@builder.io/qwik-city";
import { proximaClase, crucesPendientes, type Horario, type HorarioClase, type HorarioOferta } from "~/lib/api";
import { Icon } from "~/components/icon";
import { Empty } from "~/components/ui";

// La vista de Mi horario: calendario del mes, mis cursos al lado y las ofertas que encajan. La usan la
// portada del alumno (/horario/) y el simulador del instructor (/instructor/simulador/), que la pinta
// con los datos de otro alumno y con el botón de inscripción desactivado.

const LIMA = "America/Lima";
const fHora = new Intl.DateTimeFormat("es-PE", { timeZone: LIMA, hour: "numeric", minute: "2-digit", hour12: true });
const fHoraCorta = new Intl.DateTimeFormat("es-PE", { timeZone: LIMA, hour: "numeric", minute: "2-digit", hour12: false });
const fDia = new Intl.DateTimeFormat("es-PE", { timeZone: LIMA, weekday: "long", day: "numeric", month: "long" });
const fCorto = new Intl.DateTimeFormat("es-PE", { timeZone: LIMA, weekday: "short", day: "numeric", month: "short" });
const fClave = new Intl.DateTimeFormat("en-CA", { timeZone: LIMA, year: "numeric", month: "2-digit", day: "2-digit" });
const fDow = new Intl.DateTimeFormat("es-PE", { timeZone: LIMA, weekday: "long" });
const fNum = new Intl.DateTimeFormat("es-PE", { timeZone: LIMA, day: "numeric" });
const fMesCorto = new Intl.DateTimeFormat("es-PE", { timeZone: LIMA, month: "short" });
const fMesTitulo = new Intl.DateTimeFormat("es-PE", { timeZone: "UTC", month: "long", year: "numeric" });

const hora = (iso: string) => fHora.format(new Date(iso)).replace(/\s+/g, " ");
const horaCorta = (iso: string) => fHoraCorta.format(new Date(iso));
const corto = (iso: string) => fCorto.format(new Date(iso)).replace(/\./g, "");
const clave = (t: number) => fClave.format(new Date(t));
const mayus = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const OFERTAS_VISIBLES = 4;
const DIAS = ["L", "M", "M", "J", "V", "S", "D"];
const DIAS_LARGOS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];

/** «Hoy», «Mañana» o «Domingo 8 de noviembre», según el día de Lima. */
function tituloDia(iso: string, ahora: number): string {
  const d = clave(Date.parse(iso));
  if (d === clave(ahora)) return "Hoy";
  if (d === clave(ahora + 864e5)) return "Mañana";
  return mayus(fDia.format(new Date(iso)));
}

/** El nombre sin el grupo repetido: algunos cursos ya lo llevan en el título. */
const sinGrupo = (nombre: string, grupo: string) => nombre.replace(new RegExp(` · ${grupo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`), "");
const sesion = (c: HorarioClase) => (c.numero && c.total ? `Sesión ${c.numero} de ${c.total}` : c.titulo);

/** «a», «a y b», «a, b y c». */
const enLista = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} y ${xs[xs.length - 1]}`);
const plural = (dia: string) => (dia.endsWith("s") ? dia : dia + "s");

/** Las fechas de una oferta, cortas: «Domingos 15, 22 y 29 de nov.» o «Lunes 9 y miércoles 11 de nov.». */
function fechasOferta(o: HorarioOferta): string {
  const dows = new Set(o.clases.map((c) => fDow.format(new Date(c.inicio))));
  const porMes = new Map<string, string[]>();
  for (const c of o.clases) {
    const d = new Date(c.inicio);
    const mes = fMesCorto.format(d).replace(/\./g, "").toLowerCase();
    const dia = dows.size === 1 ? fNum.format(d) : `${fDow.format(d)} ${fNum.format(d)}`;
    porMes.set(mes, [...(porMes.get(mes) ?? []), dia]);
  }
  const texto = enLista([...porMes].map(([mes, ds]) => `${enLista(ds)} de ${mes}`));
  if (dows.size !== 1) return mayus(texto);
  const dow = [...dows][0];
  return `${mayus(o.clases.length > 1 ? plural(dow) : dow)} ${texto}`;
}

/** El horario de una oferta si todas sus clases van a la misma hora. */
function horasOferta(o: HorarioOferta): string {
  const rangos = new Set(o.clases.map((c) => `${hora(c.inicio)} a ${hora(c.fin)}`));
  return rangos.size === 1 ? [...rangos][0] : "Horario según la clase";
}

/** Las celdas de un mes (lunes primero): null para los huecos antes del día 1 y después del último. */
function celdasMes(mes: string): (string | null)[] {
  const [y, m] = mes.split("-").map(Number);
  const hueco = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
  const dias = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const out: (string | null)[] = Array(hueco).fill(null);
  for (let d = 1; d <= dias; d++) out.push(`${mes}-${String(d).padStart(2, "0")}`);
  while (out.length % 7) out.push(null);
  return out;
}

function moverMes(mes: string, delta: number): string {
  const [y, m] = mes.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

const tituloMes = (mes: string) => {
  const [y, m] = mes.split("-").map(Number);
  return mayus(fMesTitulo.format(new Date(Date.UTC(y, m - 1, 15))));
};

const diaLargo = (dia: string) => {
  const [y, m, d] = dia.split("-").map(Number);
  return mayus(fDia.format(new Date(Date.UTC(y, m - 1, d, 17))));
};


type Props = { h: Horario; ahora: number; staff?: boolean; simulado?: boolean };

export const VistaHorario = component$<Props>((props) => {
  const mes = useSignal("");
  const sel = useSignal("");
  const verTodas = useSignal(false);

  // Cada horario nuevo abre en hoy si hay clase hoy; si no, en el día de la próxima clase.
  useTask$(({ track }) => {
    const h = track(() => props.h);
    const hoy = clave(props.ahora);
    const prox = proximaClase(h.clases, props.ahora);
    sel.value = h.clases.some((c) => clave(Date.parse(c.inicio)) === hoy) || !prox ? hoy : clave(Date.parse(prox.inicio));
    mes.value = sel.value.slice(0, 7);
    verTodas.value = false;
  });

  const h = props.h;
  const staff = !!props.staff;
  const ahora = { value: props.ahora };
  const cruces = h ? crucesPendientes(h.clases, ahora.value) : [];
  const nombrePorId = new Map((h?.clases ?? []).map((c) => [c.id, sinGrupo(c.nombre, c.grupo)]));
  const porDia = new Map<string, HorarioClase[]>();
  for (const c of h?.clases ?? []) {
    const d = clave(Date.parse(c.inicio));
    porDia.set(d, [...(porDia.get(d) ?? []), c]);
  }
  const hoy = clave(ahora.value);
  const delDia = porDia.get(sel.value) ?? [];
  const ofertas = !staff ? (h?.ofertas ?? []) : [];

  const calendario = mes.value && (
    <section class="hr-cal" aria-labelledby="hr-cal-t">
      <header class="hr-cal-cab">
        <h2 id="hr-cal-t">{tituloMes(mes.value)}</h2>
        <button type="button" class="btn ghost sm hr-hoy" onClick$={() => { sel.value = hoy; mes.value = hoy.slice(0, 7); }}>
          Hoy
        </button>
        <button type="button" class="btn ghost sm hr-nav" aria-label="Mes anterior" onClick$={() => (mes.value = moverMes(mes.value, -1))}>
          <Icon name="chevronLeft" size={16} />
        </button>
        <button type="button" class="btn ghost sm hr-nav" aria-label="Mes siguiente" onClick$={() => (mes.value = moverMes(mes.value, 1))}>
          <Icon name="chevronRight" size={16} />
        </button>
      </header>
      <div class="hr-cal-grid" role="grid" aria-labelledby="hr-cal-t">
        {DIAS.map((d, i) => (
          <span key={i} class="hr-cal-dow" role="columnheader" aria-label={DIAS_LARGOS[i]}>{d}</span>
        ))}
        {celdasMes(mes.value).map((dia, i) => {
          if (!dia) return <span key={`h${i}`} class="hr-celda vacia" aria-hidden="true" />;
          const ks = porDia.get(dia) ?? [];
          const cruza = ks.some((k) => (k.cruces ?? []).length > 0 && Date.parse(k.fin) > ahora.value);
          const pasado = dia < hoy;
          const clases = ks.length === 1 ? "1 clase" : `${ks.length} clases`;
          return (
            <button
              key={dia}
              type="button"
              role="gridcell"
              class={["hr-celda", dia === hoy && "hoy", dia === sel.value && "sel", pasado && "pasado", ks.length && "con", cruza && "cruce"].filter(Boolean).join(" ")}
              aria-pressed={dia === sel.value}
              aria-label={`${diaLargo(dia)}${ks.length ? `, ${clases}` : ""}${cruza ? ", con cruce" : ""}`}
              onClick$={() => (sel.value = dia)}
            >
              <span class="hr-num">{Number(dia.slice(8))}</span>
              {ks.slice(0, 2).map((k) => (
                <span key={k.id} class="hr-chip" data-area={k.area || undefined}>
                  <b>{horaCorta(k.inicio)}</b> {sinGrupo(k.nombre, k.grupo)}
                </span>
              ))}
              {ks.length > 2 && <span class="hr-mas">+{ks.length - 2}</span>}
            </button>
          );
        })}
      </div>

      <div class="hr-dia" aria-live="polite">
        <h3>{sel.value === hoy ? "Hoy" : diaLargo(sel.value)}</h3>
        {delDia.length === 0 ? (
          <p class="muted hr-libre">Sin clases este día.</p>
        ) : (
          <ol class="ag-lista">
            {delDia.map((c) => {
              const cruzadas = (c.cruces ?? []).filter((id) => nombrePorId.has(id));
              const cuerpo = (
                <>
                  <span class="hr-hora">
                    <b>{hora(c.inicio)}</b>
                    <span>a {hora(c.fin)}</span>
                  </span>
                  <span class="ag-grupo">
                    <span class="ag-nombre">
                      <i class="ag-punto" aria-hidden="true" />
                      <b>{sinGrupo(c.nombre, c.grupo)}</b>
                    </span>
                    <span class="ag-sig muted">
                      {c.estado === "por-confirmar" && <span class="badge warn">por confirmar</span>}
                      {[c.grupo, sesion(c)].filter(Boolean).join(" · ")}
                    </span>
                    {cruzadas.length > 0 && (
                      <span class="hr-aviso">
                        <Icon name="alert" size={13} /> Se cruza con {cruzadas.map((id) => nombrePorId.get(id)).join(" y ")}
                      </span>
                    )}
                  </span>
                </>
              );
              return (
                <li key={c.id} data-area={c.area || undefined} class={cruzadas.length ? "cruce" : ""}>
                  {c.tipo === "sesion" && c.publicada ? (
                    <Link class="hr-clase" href={`/lessons/${c.id}/`}>{cuerpo}</Link>
                  ) : (
                    <div class="hr-clase">{cuerpo}</div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );

  // Un curso puede abrir varios grupos (varios horarios): una tarjeta por curso, un grupo por opción.
  const tarjetas: { nombre: string; area?: string; desc?: string; grupos: HorarioOferta[] }[] = [];
  for (const o of ofertas) {
    const nombre = sinGrupo(o.nombre, o.nombre_grupo);
    const t = tarjetas.find((x) => x.nombre === nombre);
    if (t) t.grupos.push(o);
    else tarjetas.push({ nombre, area: o.area, desc: o.cursos.length === 1 ? o.cursos[0].descripcion : o.cursos.map((c) => c.nombre).join(" · "), grupos: [o] });
  }
  const visibles = verTodas.value ? tarjetas : tarjetas.slice(0, OFERTAS_VISIBLES);

  const panelOfertas = tarjetas.length > 0 && (
    <section class="hr-ofertas" aria-labelledby="hr-of-t" data-testid="ofertas">
      <h2 id="hr-of-t" class="hr-lado-t">
        <Icon name="sparkles" size={16} /> Encajan en tu horario
      </h2>
      <p class="hr-of-sub muted">Cursos por empezar cuyas clases no se cruzan con las tuyas.</p>
      <ul>
        {visibles.map((t) => (
          <li key={t.nombre} class="hr-oferta" data-area={t.area || undefined}>
            <span class="ag-nombre">
              <i class="ag-punto" aria-hidden="true" />
              <b>{t.nombre}</b>
            </span>
            {t.desc && <p class="hr-of-desc">{t.desc}</p>}
            <ul class="hr-of-grupos">
              {t.grupos.map((o) => (
                <li key={o.grupo}>
                  <span class="hr-of-cuando">
                    {t.grupos.length > 1 && <b>{o.nombre_grupo}:</b>} {fechasOferta(o)}
                  </span>
                  <span class="hr-of-cuando">
                    {horasOferta(o)} · {o.clases.length === 1 ? "1 clase" : `${o.clases.length} clases`}
                  </span>
                  {props.simulado ? (
                    <span class="btn sm hr-of-btn" aria-disabled="true" title="Vista simulada: el botón no inscribe a nadie">
                      Inscribirme <Icon name="chevronRight" size={14} />
                    </span>
                  ) : (
                    <Link class="btn sm hr-of-btn" href={o.inscripcion} aria-label={`Inscribirme en ${t.nombre}, ${o.nombre_grupo}`}>
                      Inscribirme <Icon name="chevronRight" size={14} />
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
      {tarjetas.length > OFERTAS_VISIBLES && (
        <button type="button" class="btn ghost sm hr-of-mas" aria-expanded={verTodas.value} onClick$={() => (verTodas.value = !verTodas.value)}>
          {verTodas.value ? "Ver menos" : `Ver los ${tarjetas.length} cursos`}
          <Icon name={verTodas.value ? "chevronUp" : "chevronDown"} size={14} />
        </button>
      )}
    </section>
  );
  return (
    <>
      {cruces.length > 0 && (
        <section class="hr-cruces" aria-labelledby="hr-cruces-t" data-testid="cruces">
          <h2 id="hr-cruces-t">
            <Icon name="alert" size={17} />
            {cruces.length === 1 ? "Tienes 1 cruce de horario" : `Tienes ${cruces.length} cruces de horario`}
          </h2>
          <ul>
            {cruces.map(([a, b]) => (
              <li key={`${a.id}-${b.id}`}>
                <b>{mayus(corto(a.inicio))}</b>: {sinGrupo(a.nombre, a.grupo)} ({hora(a.inicio)} a {hora(a.fin)}) y {sinGrupo(b.nombre, b.grupo)} ({hora(b.inicio)} a {hora(b.fin)})
              </li>
            ))}
          </ul>
          <p>Avisa al instructor para decidir a cuál entras y cómo recuperas la otra.</p>
        </section>
      )}

      {h.cursos.length === 0 && (
        <>
          <Empty
            icon="calendar"
            title={props.simulado ? "Sin matrícula en ningún curso" : "No estás matriculado en ningún curso"}
            text={props.simulado ? "Así ve la portada quien aún no tiene grupo: solo las ofertas." : staff ? "Tus clases como instructor están en la agenda." : "Si te inscribiste, escribe al instructor para que te añada a tu grupo."}
          >
            {staff && <Link class="btn ghost sm" href="/instructor/agenda/">Abrir agenda</Link>}
          </Empty>
          {panelOfertas}
        </>
      )}

      {h.cursos.length > 0 && (
        <div class="hr-tablero">
          {calendario}
          <aside class="hr-lado">
            <section aria-labelledby="hr-mis-t">
              <h2 id="hr-mis-t" class="hr-lado-t">
                Mis cursos <span class="muted">{h.cursos.length}</span>
              </h2>
              <ul class="ag-lista hr-cursos" data-testid="matriculas">
                {h.cursos.map((c) => {
                  const suyas = h.clases.filter((k) => k.curso_slug === c.slug);
                  const prox = proximaClase(suyas, ahora.value);
                  return (
                    <li key={c.slug} data-area={c.area || undefined}>
                      <Link href={`/courses/${c.slug}/`}>
                        <i class="ag-punto" aria-hidden="true" />
                        <span class="grow">
                          <b>{sinGrupo(c.nombre, c.grupo)}</b>
                          <span class="muted">{c.grupo}</span>
                          <span class="hr-prox">
                            {prox ? `Próxima: ${tituloDia(prox.inicio, ahora.value).toLowerCase() === "hoy" ? "hoy" : corto(prox.inicio)}, ${hora(prox.inicio)}` : suyas.length ? "Clases terminadas" : "Fechas por confirmar"}
                          </span>
                        </span>
                        <Icon name="chevronRight" size={14} class="faint" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
            {panelOfertas}
          </aside>
        </div>
      )}
    </>
  );
});
