import { component$ } from "@builder.io/qwik";
import { Link } from "@builder.io/qwik-city";
import type { Certificate, Horario } from "~/lib/api";
import { Camino, type PasoCamino } from "~/components/graficos";

/** Los cursos del alumno con la fecha en que terminan (o terminaron), desde Mi horario. */
export function pasosCamino(h: Horario | null, nombre?: (slug: string) => string): PasoCamino[] {
  if (!h) return [];
  return h.cursos
    .map((c) => ({
      nombre: nombre?.(c.slug) || c.nombre,
      fin: Math.max(0, ...h.clases.filter((k) => k.curso_slug === c.slug).map((k) => Date.parse(k.fin))),
    }))
    .filter((x) => x.fin > 0);
}

/**
 * «Tu camino»: cuántos cursos terminaste, cuántos vienen y la escalera en el tiempo. Las insignias y
 * los certificados se cuentan solo cuando hay alguno: un «0» al lado de lo logrado se lee como falta.
 */
export const CaminoBloque = component$((p: { pasos: PasoCamino[]; ahora: number; certs: Certificate[] }) => {
  const terminados = p.pasos.filter((x) => x.fin <= p.ahora).length;
  const insignias = p.certs.filter((c) => c.estado === "valido" && c.ambito === "clase").length;
  const certificados = p.certs.filter((c) => c.estado === "valido" && c.ambito !== "clase").length;
  return (
    <div class="ini-camino-card">
      <dl class="ini-cifras">
        <div><dt>{terminados === 1 ? "Curso terminado" : "Cursos terminados"}</dt><dd>{terminados}</dd></div>
        <div><dt>Por terminar</dt><dd>{p.pasos.length - terminados}</dd></div>
        {insignias > 0 && <div><dt>{insignias === 1 ? "Insignia" : "Insignias"}</dt><dd>{insignias}</dd></div>}
        {certificados > 0 && <div><dt>{certificados === 1 ? "Certificado" : "Certificados"}</dt><dd>{certificados}</dd></div>}
      </dl>
      {p.pasos.length > 0 ? (
        <Camino pasos={p.pasos} ahora={p.ahora} />
      ) : (
        <p class="ini-vacio">Tu camino empieza con tu primer curso. Cada curso que termines suma un peldaño aquí.</p>
      )}
      {insignias === 0 && p.pasos.length > 0 && (
        <p class="ini-camino-nota">
          Las insignias de tus clases y tus certificados aparecen en <Link href="/grades/">Logros</Link> cuando el instructor los emite.
        </p>
      )}
    </div>
  );
});
