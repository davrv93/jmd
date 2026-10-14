import { component$, useContext, useStore, useVisibleTask$, $ } from "@builder.io/qwik";
import { api, errMsg, fmtDate, requireLogin } from "~/lib/api";
import { SessionContext, toast } from "~/lib/session";
import { Icon } from "./icon";

// Tarjeta «Datos para tu certificado» (alumno): nombre completo tal como irá impreso y el correo
// donde lo recibe. Sin datos, se abre como formulario con los de la cuenta de sugerencia; con
// datos, se ve en una línea con «Editar». El nombre se congela en el certificado al emitirlo.

interface St {
  loaded: boolean;
  loadError: string;
  completo: boolean;
  editando: boolean;
  nombre: string;
  correo: string;
  guardadoNombre: string;
  guardadoCorreo: string;
  actualizado: string;
  saving: boolean;
  error: string;
}

const nombreOk = (n: string) => {
  const t = n.trim().replace(/\s+/g, " ");
  return t.length >= 5 && t.split(" ").length >= 2 && !/[0-9@#$%^*=_~`"<>{}[\]\\/|]/.test(t);
};
const correoOk = (c: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c.trim());

export const DatosCertificado = component$(() => {
  const session = useContext(SessionContext);
  const st = useStore<St>({
    loaded: false, loadError: "", completo: false, editando: false, nombre: "", correo: "",
    guardadoNombre: "", guardadoCorreo: "", actualizado: "", saving: false, error: "",
  });

  const load = $(async () => {
    st.loadError = "";
    try {
      const d = await api.misDatosCert();
      st.completo = d.completo;
      st.guardadoNombre = d.nombre;
      st.guardadoCorreo = d.correo;
      st.actualizado = d.actualizado_en ?? "";
      st.nombre = d.completo ? d.nombre : d.sugerido_nombre;
      st.correo = d.completo ? d.correo : d.sugerido_correo;
      st.editando = !d.completo;
      st.loaded = true;
    } catch (e) {
      if (!requireLogin(e)) st.loadError = errMsg(e);
    }
  });
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async () => {
    await load();
  });

  const guardar = $(async () => {
    st.saving = true;
    st.error = "";
    try {
      const d = await api.guardarDatosCert({ nombre: st.nombre, correo: st.correo });
      st.completo = true;
      st.guardadoNombre = st.nombre = d.nombre;
      st.guardadoCorreo = st.correo = d.correo;
      st.actualizado = d.actualizado_en ?? "";
      st.editando = false;
      toast(session, "Listo: así saldrá tu certificado");
    } catch (e) {
      if (!requireLogin(e)) st.error = errMsg(e);
    } finally {
      st.saving = false;
    }
  });

  if (st.loadError) {
    return (
      <div class="studio-strip bad" role="alert" style="margin-bottom:1rem">
        <Icon name="alert" size={15} />
        <span>No se pudieron cargar tus datos para el certificado: {st.loadError}</span>
        <button type="button" class="btn ghost sm" onClick$={load}>
          <Icon name="refresh" size={13} /> Reintentar
        </button>
      </div>
    );
  }
  if (!st.loaded) return null;

  if (!st.editando) {
    return (
      <section class="card datos-cert datos-cert--ok" aria-labelledby="dc-t" data-testid="datos-certificado">
        <span class="lead-ico gold"><Icon name="award" /></span>
        <div class="grow">
          <b id="dc-t">Datos para tu certificado</b>
          <div class="sm">
            {st.guardadoNombre} · <span class="muted">{st.guardadoCorreo}</span>
          </div>
          {st.actualizado && <div class="xs faint">Actualizado el {fmtDate(st.actualizado)}</div>}
        </div>
        <span class="badge ok">Listo</span>
        <button type="button" class="btn ghost sm" onClick$={() => (st.editando = true)}>
          <Icon name="edit" size={13} /> Editar
        </button>
      </section>
    );
  }

  const nOk = nombreOk(st.nombre);
  const cOk = correoOk(st.correo);
  return (
    <section class="studio-card cert-card datos-cert" aria-labelledby="dc-t" data-testid="datos-certificado">
      <div class="studio-card__bar">
        <Icon name="award" size={14} />
        <span id="dc-t">Datos para tu certificado</span>
        {!st.completo && <span class="studio-right"><span class="badge warn">Falta completar</span></span>}
      </div>
      <form class="cert-form" preventdefault:submit onSubmit$={guardar} aria-busy={st.saving}>
        <p class="sm muted" style="margin:0">
          Escribe tu nombre <b>tal como quieres que salga impreso</b> y el correo donde quieres recibir tu certificado.
        </p>
        <div class="cert-2">
          <div>
            <label for="dc-nombre">Nombre completo</label>
            <input
              id="dc-nombre"
              type="text"
              autoComplete="name"
              maxLength={120}
              placeholder="Nombres y apellidos"
              value={st.nombre}
              aria-invalid={st.nombre !== "" && !nOk}
              aria-describedby="dc-nombre-h"
              onInput$={(_, el) => (st.nombre = el.value)}
            />
            <div class="hint" id="dc-nombre-h">
              {st.nombre !== "" && !nOk ? <span class="bad">Nombres y apellidos, solo letras.</span> : "Con tildes y mayúsculas como en tu DNI."}
            </div>
          </div>
          <div>
            <label for="dc-correo">Correo para recibir el certificado</label>
            <input
              id="dc-correo"
              type="email"
              autoComplete="email"
              inputMode="email"
              spellcheck={false}
              maxLength={254}
              placeholder="tu@correo.com"
              value={st.correo}
              aria-invalid={st.correo !== "" && !cOk}
              aria-describedby="dc-correo-h"
              onInput$={(_, el) => (st.correo = el.value)}
            />
            <div class="hint" id="dc-correo-h">
              {st.correo !== "" && !cOk ? <span class="bad">Revisa el correo.</span> : "Uno que revises seguido."}
            </div>
          </div>
        </div>
        <div class="studio-actions">
          {st.completo && (
            <button
              type="button"
              class="btn ghost"
              onClick$={() => {
                st.nombre = st.guardadoNombre;
                st.correo = st.guardadoCorreo;
                st.error = "";
                st.editando = false;
              }}
            >
              Cancelar
            </button>
          )}
          <button type="submit" class="btn" disabled={st.saving || !nOk || !cOk} aria-busy={st.saving}>
            {st.saving ? <Icon name="loader" size={14} class="studio-spin" /> : <Icon name="check" size={14} />}
            {st.saving ? "Guardando" : "Guardar mis datos"}
          </button>
        </div>
        {st.error && (
          <div class="studio-strip bad" role="alert">
            <Icon name="alert" size={15} />
            <span>No se pudo guardar: {st.error}</span>
          </div>
        )}
      </form>
    </section>
  );
});
