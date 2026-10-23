import { component$, useContext, useSignal, useStore, useVisibleTask$, $ } from "@builder.io/qwik";
import { useLocation, type DocumentHead, type StaticGenerateHandler } from "@builder.io/qwik-city";
import { api, ApiError, errMsg, type Sorteo } from "~/lib/api";
import { SessionContext } from "~/lib/session";
import { getParam, pathId, setTitle, urlActual } from "~/lib/url";
import { Icon } from "~/components/icon";
import { ErrorState, Loading } from "~/components/ui";

// Sorteo de cupos (/sorteo/<id>/): flyer del taller nuevo + formulario con el
// correo de registro. Ganan 6 personas como máximo en la ventana; al sortear,
// cada ganador entra solo a la cohorte del premio.

export default component$(() => {
  const loc = useLocation();
  const session = useContext(SessionContext);
  const st = useStore<{ info: Sorteo | null; error: string }>({ info: null, error: "" });
  const email = useSignal("");
  const msg = useSignal("");
  const mal = useSignal(false);
  const busy = useSignal(false);
  const ya = useSignal(false);
  const numero = useSignal<number | null>(null); // tu número de rifa, fijo desde el registro
  const copiado = useSignal(false);              // «enlace copiado» del bloque de compartir
  // Enlace personalizado del ganador: /sorteo/<id>/?ganador=Junior%20Cercado
  // La página le pone su nombre al anuncio; el enlace es el que comparte en redes.
  // Se lee de `location` (getParam) y no de loc.url: estas rutas se generan como
  // /sorteo/_/ y loc.url devuelve esa plantilla, sin el query real.
  const ganador = useSignal("");
  // URL real para compartir: la pone el navegador (loc.url trae la plantilla).
  const urlPagina = useSignal("");

  const load = $(async () => {
    st.error = "";
    msg.value = "";
    try {
      st.info = await api.sorteo(pathId("sorteo"));
      setTitle(`Sorteo · ${st.info.titulo}`);
    } catch (e) {
      st.error = e instanceof ApiError && e.status === 404 ? "Este sorteo no existe." : errMsg(e);
    }
  });
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async ({ track }) => {
    track(() => loc.url.pathname);
    ganador.value = getParam("ganador").trim().slice(0, 60);
    urlPagina.value = urlActual();
    await load();
  });

  const participar = $(async () => {
    msg.value = "";
    mal.value = false;
    ya.value = false;
    numero.value = null;
    busy.value = true;
    try {
      const r = await api.participarSorteo(pathId("sorteo"), email.value.trim());
      ya.value = true;
      numero.value = r.numero ?? null;
      if (st.info) st.info = { ...st.info, participantes: r.participantes };
      msg.value = "¡Listo! Ya estás participando. Guarda esta página para ver a los ganadores.";
    } catch (e) {
      const extra = e instanceof ApiError ? (e.extra as { numero?: number } | null) : null;
      if (e instanceof ApiError && e.status === 409 && extra?.numero) {
        // Ya jugaba: se le devuelve SU número, el mismo desde que se anotó.
        ya.value = true;
        numero.value = extra.numero;
        msg.value = "Ya estabas participando con ese correo.";
      } else {
        mal.value = true;
        msg.value = errMsg(e);
      }
    } finally {
      busy.value = false;
    }
  });

  const sortear = $(async () => {
    msg.value = "";
    mal.value = false;
    busy.value = true;
    try {
      const r = await api.sortear(pathId("sorteo"));
      await load();
      msg.value = r.ganadores.length ? `Salieron ${r.ganadores.length} ganador(es) y ya entraron al curso.` : "Sin candidatos nuevos.";
    } catch (e) {
      mal.value = true;
      msg.value = errMsg(e);
    } finally {
      busy.value = false;
    }
  });

  if (st.error) return <ErrorState message={st.error} retry$={load} />;
  if (!st.info || !session.loaded) return <Loading lines={6} />;
  const info = st.info;
  const soyStaff = !!session.me && session.me.roles.some((x) => x === "admin" || x === "instructor");
  // Compartir: se arma con la URL real de la página (cliente) y el título del taller.
  const url = urlPagina.value;   // "" durante el prerender: el bloque de compartir espera
  const textoCompartir = [
    ganador.value ? `¡${ganador.value} ganó un cupo!` : "",
    `${info.titulo} · ${info.subtitulo}`,
    info.fechas_texto || "",
    info.whatsapp_bonito ? `Inscríbete por WhatsApp al ${info.whatsapp_bonito}.` : "",
  ].filter(Boolean).join(" — ");
  const enc = (x: string) => encodeURIComponent(x);

  return (
    <div class="hte">
      {ganador.value && (
        /* Anuncio personalizado del ganador: lo primero que se ve al abrir su enlace. */
        <div style={{ gridColumn: "1 / -1", border: "1.5px solid #ffd23f", borderRadius: 14, padding: "1rem 1.2rem", textAlign: "center", background: "rgba(255,210,63,.08)", marginBottom: ".4rem" }}>
          <p style={{ margin: 0, fontSize: ".72rem", letterSpacing: ".16em", textTransform: "uppercase", color: "#ffd23f", fontWeight: 700 }}>
            Ganador del sorteo
          </p>
          <p style={{ margin: ".3rem 0 0", fontSize: "1.7rem", fontWeight: 800, lineHeight: 1.12 }}>
            🎉 ¡{ganador.value}, ganaste un cupo!
          </p>
          {info.fechas_texto && <p style={{ margin: ".5rem 0 0", fontSize: ".95rem" }}><b>{info.fechas_texto}</b></p>}
          {info.whatsapp_bonito && (
            <p style={{ margin: ".3rem 0 0", fontSize: ".95rem" }}>
              Para inscribirte, envía un mensaje al <b>WhatsApp {info.whatsapp_bonito}</b>.
            </p>
          )}
          <p class="xs muted" style={{ margin: ".55rem 0 0" }}>Comparte este anuncio en tus redes 👇</p>
        </div>
      )}
      <section class="hte-hero">
        <p class="hte-eyebrow">Sorteo · {info.quedan > 0 ? `quedan ${info.quedan} de ${info.max_ganadores}` : "completo"}</p>
        <h1 class="hte-title">{info.titulo}</h1>
        <p class="hte-sub">{info.subtitulo}</p>
        <p class="hte-desc">{info.descripcion}</p>
        <p class="hte-fechas">Del {info.inicia} al {info.termina} · {info.participantes} participando</p>
      </section>
      <div class="login">
        <div class="card" style="padding:1.1rem 1.2rem">
          <img src={info.flyer} alt={`Flyer: ${info.titulo}`} style="width:100%;border-radius:12px;display:block;margin-bottom:1rem" loading="lazy" />
          {ya.value ? (
            <div style="margin-top:0">
              {numero.value !== null && (
                <div style="border:1.5px dashed var(--line, #dde4ec); border-radius:12px; padding:.9rem 1rem; margin:.2rem 0 .7rem; text-align:center">
                  <p class="xs muted" style="margin:0; letter-spacing:.14em; text-transform:uppercase">Tu número de sorteo</p>
                  <p style="margin:.25rem 0 0; font-size:2.6rem; font-weight:800; line-height:1">{numero.value}</p>
                  <p class="xs muted" style="margin:.35rem 0 0">Se fijó al anotarte y no cambia: los ganadores salen por número.</p>
                </div>
              )}
              <p class="sm" role="status" style="margin:0">
                ¡Ya estás dentro! Comparte el sorteo; los ganadores salen aquí mismo.
              </p>
            </div>
          ) : info.abierto ? (
            <form preventdefault:submit onSubmit$={participar}>
              <label for="sorteo-email">Tu correo</label>
              <input
                id="sorteo-email"
                type="email"
                required
                autoComplete="email"
                placeholder="tucorreo@ejemplo.com"
                value={email.value}
                onInput$={(_, el) => (email.value = el.value)}
              />
              <div class="hint">Escribe tu correo y participa: no hace falta tener cuenta. Uno por correo.</div>
              {msg.value && (
                <p class={`sm row ${mal.value ? "bad" : ""}`} style="flex-wrap:nowrap" role={mal.value ? "alert" : "status"}>
                  {!mal.value && <Icon name="checkCircle" size={13} />} {msg.value}
                </p>
              )}
              <button type="submit" class="btn" style="width:100%;justify-content:center;margin-top:.9rem" disabled={busy.value}>
                {busy.value ? "Anotando…" : "Quiero participar"}
              </button>
            </form>
          ) : (
            <p class="sm" style="margin-top:0">
              {info.quedan > 0 ? "El sorteo ya cerró." : "Ya salieron los 6 ganadores. ¡Gracias por participar!"}
            </p>
          )}
          {soyStaff && (
            <button type="button" class="btn ghost" style="width:100%;justify-content:center;margin-top:.6rem" disabled={busy.value} onClick$={sortear}>
              Sortear ahora (staff)
            </button>
          )}
          {ya.value && msg.value && (
            <p class={`sm row ${mal.value ? "bad" : ""}`} style="flex-wrap:nowrap;margin-top:.6rem" role="status">{msg.value}</p>
          )}
        </div>
        {info.ganadores.length > 0 && (
          <div class="card" style="margin-top:.9rem;padding:1rem 1.2rem">
            <p style="margin:0 0 .5rem;font-weight:700">Ganadores</p>
            <ul class="sm" style="list-style:none;padding:0;margin:0;display:grid;gap:.3rem">
              {info.ganadores.map((g) => (
                <li key={g.posicion}>
                  <b>{g.posicion}.</b> <code>#{g.numero}</code> {g.nombre} <span class="muted">{g.correo}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* CTA + compartir: lo pequeño que se comparte en redes. */}
        <div class="card" style="margin-top:.9rem;padding:1rem 1.2rem">
          {info.whatsapp_url ? (
            <>
              <a class="btn" href={info.whatsapp_url} target="_blank" rel="noopener"
                 style="width:100%;justify-content:center;display:inline-flex;text-decoration:none">
                ⚡ ¡Inscríbete ya!
              </a>
              <p class="sm" style="margin:.6rem 0 0;text-align:center">
                {info.fechas_texto ? <><b>{info.fechas_texto}</b><br /></> : null}
                Envía un mensaje al <b>WhatsApp {info.whatsapp_bonito}</b> y te damos tu cupo.
              </p>
            </>
          ) : info.inscripcion ? (
            <a class="btn" href={info.inscripcion} style="width:100%;justify-content:center;display:inline-flex;text-decoration:none;margin-bottom:.7rem">
              ⚡ ¡Inscríbete ya!
            </a>
          ) : null}
          {info.whatsapp_url && info.inscripcion && (
            <p class="xs muted" style="margin:.5rem 0 0;text-align:center">
              ¿Prefieres hacerlo tú? <a href={info.inscripcion}>Regístrate aquí</a>.
            </p>
          )}
          <p class="xs muted" style="margin:0 0 .5rem;letter-spacing:.14em;text-transform:uppercase;text-align:center">
            Comparte en tus redes sociales
          </p>
          <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center">
            <a class="btn ghost sm" style="text-decoration:none" aria-disabled={!url}
               href={`https://wa.me/?text=${enc(textoCompartir + " " + url)}`} target="_blank" rel="noopener">
              WhatsApp
            </a>
            <a class="btn ghost sm" style="text-decoration:none" aria-disabled={!url}
               href={`https://twitter.com/intent/tweet?text=${enc(textoCompartir)}&url=${enc(url)}`} target="_blank" rel="noopener">
              X
            </a>
            <a class="btn ghost sm" style="text-decoration:none" aria-disabled={!url}
               href={`https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`} target="_blank" rel="noopener">
              Facebook
            </a>
            <a class="btn ghost sm" style="text-decoration:none" aria-disabled={!url}
               href={`https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`} target="_blank" rel="noopener">
              LinkedIn
            </a>
            <button type="button" class="btn ghost sm" disabled={!url}
                    onClick$={$(async () => {
                      try {
                        await navigator.clipboard.writeText(url);
                        copiado.value = true;
                        setTimeout(() => (copiado.value = false), 1800);
                      } catch { /* sin portapapeles */ }
                    })}>
              {copiado.value ? "¡Copiado!" : "Copiar enlace"}
            </button>
          </div>
          {!url && <p class="xs muted" style="margin:.4rem 0 0;text-align:center">Preparando el enlace…</p>}
        </div>
      </div>
    </div>
  );
});

export const onStaticGenerate: StaticGenerateHandler = async () => ({ params: [{ id: "_" }] });

// Vista previa al compartir en redes: WhatsApp, Facebook, X y LinkedIn leen
// estas etiquetas del HTML. La URL de la imagen va ABSOLUTA (lo exigen los
// rastreadores) y apunta al dominio público de esta instalación.
const TITULO_REDES = "⚡ Menos tokens. Más poder · Potencia tus agentes";
const DESCRIPCION_REDES =
  "Tres clases en vivo: 8, 10 y 11 de noviembre, de 9:30 a 10:45 pm. " +
  "Potencia tus agentes con RTK, Cortex, Graphify y Caveman. Inscríbete por WhatsApp al 986 149 476.";
const IMAGEN_REDES = "https://jmd-learn.online/sorteo-potencia.jpg";

export const head: DocumentHead = {
  title: TITULO_REDES,
  meta: [
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: "JMD · Programación agéntica" },
    { property: "og:title", content: TITULO_REDES },
    { property: "og:description", content: DESCRIPCION_REDES },
    { property: "og:image", content: IMAGEN_REDES },
    { property: "og:image:width", content: "1024" },
    { property: "og:image:height", content: "1536" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: TITULO_REDES },
    { name: "twitter:description", content: DESCRIPCION_REDES },
    { name: "twitter:image", content: IMAGEN_REDES },
  ],
};
