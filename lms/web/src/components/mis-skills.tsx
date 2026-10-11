import { $, component$, type QRL, useContext, useStore, useVisibleTask$ } from "@builder.io/qwik";
import { api, errMsg, fmtDate, type SkillCurso, type SkillResumen } from "~/lib/api";
import { SessionContext, toast } from "~/lib/session";
import { Icon } from "~/components/icon";
import { Prose } from "~/components/prose";

// Panel «Mis skills» del modo LIVE: cada alumno crea, copia, edita y prueba SUS skills. Se guardan en
// su cuenta (nadie más las ve) y el LMS las deja en su contenedor, en /trabajo/skills/<nombre>/.

/** Estado de la prueba con el agente; lo comparte LiveAlumno para mostrar el chip también en la barra. */
export interface PruebaSkill {
  estado: "" | "esperando" | "cargo" | "nocargo";
  nombre: string;
  desde: number;
}

const PERFILES: [string, string][] = [
  ["generico", "Texto completo (sin adaptar)"],
  ["claude", "Claude"],
  ["gpt", "GPT y similares"],
  ["deepseek", "DeepSeek"],
  ["glm", "GLM"],
  ["nemotron", "Nemotron"],
  ["ollama-pequeno", "Modelo pequeño local"],
];

const PLANTILLA = `---
name: mi-skill
description: Úsala cuando [qué te pide la persona]. Palabras gatillo: [las que diría un alumno].
---

# Título de la skill

## Cuándo usar

Describe en una o dos frases la situación que activa esta skill y lo que NO cubre.

## Procedimiento

1. Primer paso, con un verbo en imperativo (lee, pregunta, escribe).
2. Segundo paso, con su resultado esperado.
3. Último paso: cómo se entrega el resultado.

## Reglas duras

- Nunca hagas [lo que no debe pasar].
- Siempre [lo que debe cumplirse].

## Lista de comprobación

- [ ] Revisé que el resultado cumple lo que se pidió.
- [ ] Lo literal (nombres, números, rutas) está sin cambios.

## Versión corta para modelos pequeños

1. Lee el pedido.
2. Aplica el procedimiento paso a paso.
3. No inventes datos: pregunta si falta algo.
4. Entrega el resultado en pocas líneas.
`;

const RE_SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Lee name y description del front matter (mismo criterio que jmd y el servidor). */
export function leerCabecera(texto: string): { ok: boolean; name: string; description: string } {
  const t = texto.replace(/\r\n/g, "\n");
  if (!t.startsWith("---\n")) return { ok: false, name: "", description: "" };
  const fin = t.indexOf("\n---", 4);
  if (fin < 0) return { ok: false, name: "", description: "" };
  const campo = (k: string) => {
    for (const l of t.slice(4, fin).split("\n")) {
      const m = l.trim();
      if (m.startsWith(k + ":")) return m.slice(k.length + 1).trim().replace(/^["']|["']$/g, "");
    }
    return "";
  };
  return { ok: true, name: campo("name"), description: campo("description") };
}

/** Problemas del texto antes de guardar. «nombreFijo» = estoy editando una existente; «descPrevia» = su descripción guardada. */
export function problemas(texto: string, nombreFijo: string, descPrevia: string): string[] {
  const p: string[] = [];
  if (new TextEncoder().encode(texto).length > 64 * 1024) p.push("La skill pasa de 64 KB.");
  const c = leerCabecera(texto);
  if (!c.ok) {
    p.push("Falta la cabecera: empieza con --- , name: y description: , y ciérrala con ---.");
    return p;
  }
  if (c.name.length < 2 || c.name.length > 40 || !RE_SLUG.test(c.name)) p.push("name: de 2 a 40 caracteres, solo minúsculas, números y guiones (ej. mi-skill).");
  else if (nombreFijo && c.name !== nombreFijo) p.push(`Para cambiar el nombre crea una skill nueva: esta se llama ${nombreFijo}.`);
  const tope = c.description === descPrevia && descPrevia ? 1000 : 300;
  const n = [...c.description].length;
  if (n < 10 || n > tope) p.push(`description: entre 10 y ${tope} caracteres (ahora ${n}).`);
  return p;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function inline(s: string): string {
  return esc(s)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>");
}

/** Markdown mínimo y seguro (se escapa todo el HTML) para la vista previa. */
export function mdAHtml(texto: string): string {
  const t = texto.replace(/\r\n/g, "\n");
  let cuerpo = t;
  let cab = "";
  if (t.startsWith("---\n")) {
    const fin = t.indexOf("\n---", 4);
    if (fin > 0) {
      cab = t.slice(4, fin);
      cuerpo = t.slice(fin + 4).replace(/^\n/, "");
    }
  }
  const out: string[] = [];
  if (cab) out.push(`<pre class="sk-cab"><code>${esc(cab)}</code></pre>`);
  let lista: "" | "ul" | "ol" = "";
  let codigo = false;
  let buf: string[] = [];
  let parrafo: string[] = [];
  const cierraLista = () => {
    if (lista) out.push(`</${lista}>`);
    lista = "";
  };
  const cierraParrafo = () => {
    if (parrafo.length) out.push(`<p>${inline(parrafo.join(" "))}</p>`);
    parrafo = [];
  };
  for (const l of cuerpo.split("\n")) {
    if (l.startsWith("```")) {
      if (codigo) {
        out.push(`<pre><code>${esc(buf.join("\n"))}</code></pre>`);
        buf = [];
      } else {
        cierraParrafo();
        cierraLista();
      }
      codigo = !codigo;
      continue;
    }
    if (codigo) {
      buf.push(l);
      continue;
    }
    const h = /^(#{1,3})\s+(.*)$/.exec(l);
    const ul = /^\s*[-*]\s+(.*)$/.exec(l);
    const ol = /^\s*\d+\.\s+(.*)$/.exec(l);
    if (h) {
      cierraParrafo();
      cierraLista();
      out.push(`<h${h[1]!.length + 1}>${inline(h[2]!)}</h${h[1]!.length + 1}>`);
    } else if (ul || ol) {
      cierraParrafo();
      const tipo = ul ? "ul" : "ol";
      if (lista !== tipo) {
        cierraLista();
        out.push(`<${tipo}>`);
        lista = tipo;
      }
      const item = (ul ?? ol)![1]!;
      const caja = /^\[( |x)\]\s+(.*)$/.exec(item);
      out.push(caja ? `<li>${caja[1] === "x" ? "&#9745;" : "&#9744;"} ${inline(caja[2]!)}</li>` : `<li>${inline(item)}</li>`);
    } else if (!l.trim()) {
      cierraParrafo();
      cierraLista();
    } else {
      cierraLista();
      parrafo.push(l.trim());
    }
  }
  if (codigo) out.push(`<pre><code>${esc(buf.join("\n"))}</code></pre>`);
  cierraParrafo();
  cierraLista();
  return out.join("\n");
}

// Quita los códigos de color de la terminal para poder buscar texto en su salida.
const ANSI = new RegExp(String.fromCharCode(27) + "\\[[0-9;?]*[ -/]*[@-~]", "g");

/** Comillas simples seguras para pegar el texto en una shell. */
const entreComillas = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`;

export const MisSkills = component$((props: { prueba: PruebaSkill; onIr$: QRL<(panel: "terminal") => void>; nueva?: string }) => {
  const session = useContext(SessionContext);
  const st = useStore({
    vista: "editor" as "editor" | "curso",
    lista: [] as SkillResumen[],
    curso: [] as SkillCurso[],
    cargando: true,
    sel: "", // nombre de la skill abierta; "" = ninguna
    nueva: false, // editando una skill que aún no existe
    texto: "",
    original: "",
    descPrevia: "",
    modelo: "generico",
    modeloPrevio: "generico",
    previa: false,
    borrar: false, // confirmación en línea
    guardando: false,
    detectadas: [] as string[],
    pedido: "explica en una frase para qué sirves",
    error: "",
  });

  const refrescar = $(async () => {
    try {
      st.lista = (await api.misSkills()) ?? [];
      st.error = "";
    } catch (e) {
      st.error = errMsg(e);
    } finally {
      st.cargando = false;
    }
    try {
      st.detectadas = (await api.skillsDetectadas()).nombres ?? [];
    } catch {
      st.detectadas = [];
    }
  });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ track }) => {
    track(() => props.nueva);
    void refrescar();
  });

  // Mira la salida de la terminal mientras hay una prueba en curso: si el agente carga la skill, imprime
  // «↳ skill <nombre>». Pasados 60 s sin verla, se da por no cargada.
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ cleanup }) => {
    let ventana = "";
    let estabaEsperando = false;
    const alSalir = (ev: Event) => {
      const p = props.prueba;
      if (p.estado !== "esperando") return;
      ventana = (ventana + String((ev as CustomEvent<string>).detail ?? "").replace(ANSI, "")).slice(-4000);
      if (ventana.includes(`↳ skill ${p.nombre}`)) p.estado = "cargo";
    };
    const reloj = setInterval(() => {
      const p = props.prueba;
      if (p.estado === "esperando") {
        if (!estabaEsperando) ventana = "";
        if (Date.now() - p.desde > 60000) p.estado = "nocargo";
      }
      estabaEsperando = p.estado === "esperando";
    }, 500);
    addEventListener("pjg-term-salida", alSalir);
    cleanup(() => {
      removeEventListener("pjg-term-salida", alSalir);
      clearInterval(reloj);
    });
  });

  const abrir = $(async (nombre: string) => {
    try {
      const k = await api.miSkill(nombre);
      Object.assign(st, {
        vista: "editor", sel: k.nombre, nueva: false, texto: k.cuerpo, original: k.cuerpo, descPrevia: k.descripcion,
        modelo: k.modelo_destino, modeloPrevio: k.modelo_destino, previa: false, borrar: false,
      });
      props.prueba.estado = "";
      setTimeout(() => document.querySelector(".skills-texto")?.scrollTo(0, 0), 50);
    } catch (e) {
      toast(session, errMsg(e), "bad");
    }
  });

  const nueva = $(() => {
    Object.assign(st, {
      vista: "editor", sel: "", nueva: true, texto: PLANTILLA, original: "", descPrevia: "", modelo: "generico", modeloPrevio: "generico",
      previa: false, borrar: false,
    });
  });

  const verCurso = $(async () => {
    st.vista = "curso";
    if (st.curso.length) return;
    try {
      st.curso = (await api.skillsCurso()) ?? [];
    } catch (e) {
      toast(session, errMsg(e), "bad");
    }
  });

  const copiar = $(async (nombre: string) => {
    try {
      const k = await api.copiarSkill(nombre);
      await refrescar();
      await abrir(k.nombre);
      toast(session, `Copiada: ${k.nombre}`);
    } catch (e) {
      toast(session, errMsg(e), "bad");
    }
  });

  const guardar = $(async (): Promise<boolean> => {
    const falla = problemas(st.texto, st.nueva ? "" : st.sel, st.descPrevia);
    if (falla.length) return false;
    st.guardando = true;
    try {
      const k = st.nueva ? await api.crearSkill(st.texto, st.modelo) : await api.saveSkill(st.sel, st.texto, st.modelo);
      Object.assign(st, { sel: k.nombre, nueva: false, original: k.cuerpo, descPrevia: k.descripcion, modeloPrevio: k.modelo_destino });
      await refrescar();
      toast(session, `Guardada: ${k.nombre} (v${k.version})`);
      return true;
    } catch (e) {
      toast(session, errMsg(e), "bad");
      return false;
    } finally {
      st.guardando = false;
    }
  });

  const borrar = $(async () => {
    try {
      await api.deleteSkill(st.sel);
      toast(session, `Borrada: ${st.sel}`);
      Object.assign(st, { sel: "", nueva: false, texto: "", original: "", borrar: false });
      await refrescar();
    } catch (e) {
      toast(session, errMsg(e), "bad");
    }
  });

  const importar = $(async (nombre: string) => {
    try {
      const k = await api.importarSkill(nombre);
      await refrescar();
      await abrir(k.nombre);
      toast(session, `Importada de tu terminal: ${k.nombre}`);
    } catch (e) {
      toast(session, errMsg(e), "bad");
    }
  });

  const probar = $(async () => {
    if (!st.sel) return;
    if (st.texto !== st.original || st.modelo !== st.modeloPrevio) {
      if (!(await guardar())) return;
    }
    // jmd chat con texto suelto no interpreta «/skill»: se manda el mismo pedido que armaría /skill.
    const prompt = `Carga la skill «${st.sel}» con load_skill ANTES de hacer nada y síguela al pie de la letra. Pedido: ${st.pedido.trim() || "explica en una frase para qué sirves"}`;
    const w = window as unknown as { __pjgTermCola?: string[] };
    w.__pjgTermCola = [...(w.__pjgTermCola ?? []), `jmd chat ${entreComillas(prompt)}\n`];
    props.prueba.estado = "esperando";
    props.prueba.nombre = st.sel;
    props.prueba.desde = Date.now();
    await props.onIr$("terminal");
    setTimeout(() => dispatchEvent(new Event("pjg-term-escribir")), 150);
  });

  const falla = st.sel || st.nueva ? problemas(st.texto, st.nueva ? "" : st.sel, st.descPrevia) : [];
  const sucio = st.texto !== st.original || st.modelo !== st.modeloPrevio;
  const tieneEditor = st.sel !== "" || st.nueva;

  return (
    <div class="skills">
      <aside class="skills-lado" aria-label="Mis skills">
        <div class="skills-acciones">
          <button type="button" class="btn sm" onClick$={nueva}>
            <Icon name="plus" size={14} /> Nueva
          </button>
          <button type="button" class={`btn ghost sm${st.vista === "curso" ? " on" : ""}`} aria-pressed={st.vista === "curso"} onClick$={verCurso}>
            <Icon name="copy" size={14} /> Copiar del curso
          </button>
        </div>
        {st.detectadas.length > 0 && (
          <div class="skills-detectada" role="status">
            <Icon name="terminal" size={14} />
            <span>
              Creaste <b>{st.detectadas[0]}</b> en la terminal.
            </span>
            <button type="button" class="btn sm" onClick$={() => importar(st.detectadas[0]!)}>
              Importar
            </button>
          </div>
        )}
        {st.error && <p class="skills-error">{st.error}</p>}
        {!st.cargando && st.lista.length === 0 && !st.error && (
          <p class="skills-vacio">
            Aún no tienes skills. Crea una con <b>Nueva</b> o copia una del curso para adaptarla.
          </p>
        )}
        <ul class="skills-lista">
          {st.lista.map((k) => (
            <li key={k.nombre}>
              <button type="button" class={`skills-item${st.sel === k.nombre && st.vista === "editor" ? " on" : ""}`} onClick$={() => abrir(k.nombre)}>
                <span class="skills-nombre">{k.nombre}</span>
                <span class="skills-desc">{k.descripcion}</span>
                <span class="skills-meta">
                  <span class="badge">{k.modelo_destino === "generico" ? "genérica" : k.modelo_destino}</span>
                  <span class="badge">v{k.version}</span>
                  {k.origen !== "propia" && <span class="badge info">{k.origen}</span>}
                  {k.compartida && <span class="badge ok">compartida</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section class="skills-main">
        {st.vista === "curso" && (
          <div class="skills-curso">
            <div class="skills-barra">
              <b>Skills del curso</b>
              <span class="skills-pista">Copia una a tu cuenta y edítala: la del curso no cambia.</span>
              <span class="grow" />
              <button type="button" class="btn ghost sm" onClick$={() => (st.vista = "editor")}>
                <Icon name="x" size={14} /> Cerrar
              </button>
            </div>
            <ul class="skills-curso-lista">
              {st.curso.map((c) => {
                const ya = st.lista.some((k) => k.nombre === c.nombre);
                return (
                  <li key={c.nombre}>
                    <div>
                      <span class="skills-nombre">{c.nombre}</span>
                      <span class="skills-desc">{c.descripcion}</span>
                    </div>
                    <button type="button" class="btn ghost sm" disabled={ya} onClick$={() => copiar(c.nombre)} title={ya ? "Ya la tienes" : "Copiar a mi cuenta"}>
                      <Icon name={ya ? "check" : "copy"} size={14} />
                      <span>{ya ? "Copiada" : "Copiar"}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {st.vista === "editor" && !tieneEditor && (
          <div class="skills-vacio-main">
            <Icon name="wand" size={22} />
            <p>
              Una <b>skill</b> son instrucciones que tu agente carga cuando las necesita. Elige una de la lista, crea una nueva o copia una del curso.
            </p>
          </div>
        )}

        {st.vista === "editor" && tieneEditor && (
          <div class="skills-editor">
            <div class="skills-barra">
              <b class="skills-titulo">{st.nueva ? "Skill nueva" : st.sel}</b>
              <label class="skills-modelo">
                <span>Variante para</span>
                <select
                  aria-label="Modelo destino"
                  value={st.modelo}
                  onChange$={(_, el) => (st.modelo = el.value)}
                >
                  {PERFILES.map(([id, nombre]) => (
                    <option key={id} value={id} selected={st.modelo === id}>
                      {nombre}
                    </option>
                  ))}
                </select>
              </label>
              <span class="grow" />
              <button type="button" class={`btn ghost sm${st.previa ? " on" : ""}`} aria-pressed={st.previa} onClick$={() => (st.previa = !st.previa)}>
                <Icon name={st.previa ? "edit" : "eye"} size={14} />
                <span>{st.previa ? "Editar" : "Vista previa"}</span>
              </button>
              {!st.nueva && !st.borrar && (
                <button type="button" class="btn ghost sm" onClick$={() => (st.borrar = true)}>
                  <Icon name="trash" size={14} /> Borrar
                </button>
              )}
              {!st.nueva && st.borrar && (
                <span class="skills-confirma" role="alert">
                  ¿Borrar {st.sel}?
                  <button type="button" class="btn sm danger" onClick$={borrar}>
                    Sí, borrar
                  </button>
                  <button type="button" class="btn ghost sm" onClick$={() => (st.borrar = false)}>
                    No
                  </button>
                </span>
              )}
              <button type="button" class="btn sm" disabled={st.guardando || falla.length > 0 || (!sucio && !st.nueva)} onClick$={guardar}>
                <Icon name="save" size={14} /> Guardar
              </button>
            </div>

            {st.previa ? (
              <div class="skills-previa">
                <Prose html={mdAHtml(st.texto)} />
              </div>
            ) : (
              <textarea
                class="skills-texto"
                spellcheck={false}
                aria-label="Contenido de la skill"
                value={st.texto}
                onInput$={(_, el) => (st.texto = el.value)}
              />
            )}

            <div class="skills-pie">
              {falla.length > 0 ? (
                <ul class="skills-problemas" role="alert">
                  {falla.map((f) => (
                    <li key={f}>
                      <Icon name="alert" size={13} /> {f}
                    </li>
                  ))}
                </ul>
              ) : (
                <span class="skills-valida">
                  <Icon name="checkCircle" size={14} /> Cabecera válida{sucio ? " · cambios sin guardar" : ""}
                </span>
              )}
              {!st.nueva && (
                <div class="skills-probar">
                  <label class="skills-pedido">
                    <span>Pedido de prueba</span>
                    <input value={st.pedido} onInput$={(_, el) => (st.pedido = el.value)} maxLength={300} />
                  </label>
                  <button type="button" class="btn sm ok" disabled={st.guardando || falla.length > 0} onClick$={probar}>
                    <Icon name="play" size={14} /> Probar
                  </button>
                  {props.prueba.nombre === st.sel && <ChipPrueba estado={props.prueba.estado} />}
                </div>
              )}
              {!st.nueva && st.lista.find((k) => k.nombre === st.sel) && (
                <span class="skills-pista">
                  Guardada {fmtDate(st.lista.find((k) => k.nombre === st.sel)!.actualizada_en)} · en tu terminal: <code>/trabajo/skills/{st.sel}/</code>
                </span>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
});

/** Resultado de «Probar»: verde si el agente cargó la skill, ámbar si no. */
export const ChipPrueba = component$((props: { estado: PruebaSkill["estado"] }) => {
  if (props.estado === "esperando") {
    return (
      <span class="badge info" role="status">
        <Icon name="loader" size={12} /> Esperando al agente (hasta 60 s)
      </span>
    );
  }
  if (props.estado === "cargo") {
    return (
      <span class="badge ok" role="status">
        <Icon name="checkCircle" size={12} /> El agente cargó la skill
      </span>
    );
  }
  if (props.estado === "nocargo") {
    return (
      <span class="badge warn" role="status">
        <Icon name="alert" size={12} /> No se cargó: revisa la description
      </span>
    );
  }
  return null;
});
