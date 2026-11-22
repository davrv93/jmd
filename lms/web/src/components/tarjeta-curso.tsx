import { component$, useStyles$ } from "@builder.io/qwik";
import { Link } from "@builder.io/qwik-city";
import type { CatalogoCurso } from "~/lib/api";
import { fCorta, fDia, fHora, nombreArea, whatsappInscripcion } from "~/lib/marca";
import { Icon } from "~/components/icon";
import { Portada } from "~/components/portada";
import CSS from "./tarjeta-curso.css?inline";

/** Minutos en palabras: «1 h 15 min», «90 min». */
const duracion = (m: number) => (m >= 60 && m % 60 !== 0 ? `${Math.floor(m / 60)} h ${m % 60} min` : m % 60 === 0 && m >= 60 ? `${m / 60} h` : `${m} min`);

/**
 * Tarjeta de un grupo del catálogo: portada con la identidad del curso, nombre, la promesa en una
 * línea, cuándo empieza, cuántas sesiones, una cinta mínima con sus fechas y la acción para entrar.
 */
export const TarjetaCurso = component$((p: { c: CatalogoCurso; ahora: number; razon?: boolean }) => {
  useStyles$(CSS);
  const c = p.c;
  const id = c.identidad;
  const ini = Date.parse(c.inicio);
  const fin = Date.parse(c.fin);
  const n = c.sesiones.length;
  // Cinta mínima: las sesiones del grupo entre su primera y su última fecha.
  const span = Math.max(1, fin - ini);
  const cuando =
    c.estado === "en_curso"
      ? `En curso · termina el ${fCorta(fin)}`
      : `Empieza el ${fDia(ini)}, ${fHora(ini)}`;
  return (
    <article class="tc" data-idc={id.color} id={`curso-${c.id}`} aria-labelledby={`tc-${c.id}`}>
      <Portada class="tc-portada" nombre={c.nombre} area={c.area} identidad={id} aspecto={2} />
      <div class="tc-cuerpo">
        <p class="tc-area" data-area={c.area || undefined}>
          <i aria-hidden="true" />
          <span>
            {nombreArea(c.area)}
            {id.nivel && <span class="tc-nivel">{` · ${id.nivel}`}</span>}
          </span>
        </p>
        <h3 id={`tc-${c.id}`} class="tc-nombre">{c.nombre}</h3>
        <p class="tc-grupo">{c.grupo}</p>
        {id.frase && <p class="tc-frase">{id.frase}</p>}
        {p.razon && c.recomendado && (
          <p class="tc-razon">
            <Icon name="route" size={14} /> {c.recomendado.razon}
          </p>
        )}
        <div class="tc-fechas">
          <b>{cuando}</b>
          <span>
            {n} {n === 1 ? "sesión en vivo" : "sesiones en vivo"} de {duracion(c.minutos)}
            {n > 1 ? ` · ${fCorta(ini)} – ${fCorta(fin)}` : ""}
          </span>
          {n > 1 && (
            <span class="tc-cinta" aria-hidden="true">
              {c.sesiones.map((s) => {
                const t = Date.parse(s.inicio);
                return <i key={s.n} class={t + s.minutos * 60e3 < p.ahora ? "pasada" : ""} style={`left:${(100 * (t - ini)) / span}%`} />;
              })}
            </span>
          )}
        </div>
        <div class="tc-accion">
          {c.inscrito ? (
            <>
              <span class="badge ok"><Icon name="check" size={12} /> Ya estás inscrito</span>
              <Link class="btn ghost sm" href={`/courses/${c.slug}/`}>Ir al curso</Link>
            </>
          ) : c.inscripcion ? (
            <a class="btn" href={c.inscripcion} aria-label={`Inscribirme en ${c.nombre}, ${c.grupo}`}>
              Inscribirme <Icon name="chevronRight" size={14} />
            </a>
          ) : (
            <a class="btn ghost tc-wa" href={whatsappInscripcion(c.nombre, c.grupo, c.estado === "proximo" ? c.inicio : undefined)} target="_blank" rel="noopener noreferrer" aria-label={`${c.estado === "en_curso" ? "Preguntar por el próximo grupo de" : "Quiero inscribirme en"} ${c.nombre}, ${c.grupo} (abre WhatsApp)`}>
              <Icon name="whatsapp" size={15} /> {c.estado === "en_curso" ? "Preguntar por el próximo grupo" : "Quiero inscribirme"}
            </a>
          )}
        </div>
      </div>
    </article>
  );
});
