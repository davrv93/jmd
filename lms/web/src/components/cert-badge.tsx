import { component$ } from "@builder.io/qwik";
import { linkedinAddUrl, type Certificate } from "~/lib/api";
import { Icon } from "./icon";

// Botones de la insignia digital (Open Badges 3.0) de un certificado válido: JSON, JWT firmado y
// «Añadir a LinkedIn». Se usan en la ficha pública y en «Mis certificados».
export const BadgeActions = component$((props: { c: Certificate; small?: boolean }) => {
  const c = props.c;
  if (c.estado !== "valido" || !c.url_badge) return null;
  const cls = `btn ghost${props.small ? " sm" : ""}`;
  return (
    <>
      <a class={cls} href={c.url_badge} download={`insignia-${c.codigo}.json`}>
        <Icon name="badge" size={14} /> Descargar insignia (JSON)
      </a>
      <a class={cls} href={c.url_badge_jwt} download={`insignia-${c.codigo}.jwt`}>
        <Icon name="shieldCheck" size={14} /> Credencial firmada (JWT)
      </a>
      <a class={cls} href={linkedinAddUrl(c)} target="_blank" rel="noopener">
        <Icon name="share" size={14} /> Añadir a LinkedIn
      </a>
    </>
  );
});
