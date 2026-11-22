import { component$, useContext, useStore, useStyles$, useVisibleTask$ } from "@builder.io/qwik";
import { Link, type DocumentHead } from "@builder.io/qwik-city";
import { SessionContext, initials, isStaff } from "~/lib/session";
import { setTitle } from "~/lib/url";
import { Icon } from "~/components/icon";
import { Loading } from "~/components/ui";
import { api, type Certificate, type Horario } from "~/lib/api";
import { CaminoBloque, pasosCamino } from "~/components/camino-bloque";

// Perfil (/perfil/): tu camino (los cursos que terminaste y los que vienen) y la puerta a lo tuyo: tus
// logros y certificados, tu horario, tus proyectos, los recursos y el estudio, para que nada quede a más
// de dos toques desde la barra de navegación. La línea de crecimiento por habilidades y el perfil
// público vienen en la fase 2.

const ENLACES = [
  { href: "/grades/", icon: "award", t: "Logros y certificados", d: "Tus insignias por clase, tus notas y los certificados para compartir." },
  { href: "/horario/", icon: "calendar", t: "Mi horario", d: "Todas tus clases en un calendario, y si dos se cruzan." },
  { href: "/projects/", icon: "task", t: "Proyectos y tareas", d: "Lo que tienes que entregar y lo que ya te calificaron." },
  { href: "/links/", icon: "link", t: "Recursos", d: "Enlaces, grabaciones y materiales de tus cursos." },
  { href: "/studio/", icon: "wand", t: "Estudio", d: "Tu espacio para crear con IA: landings, terminal y más." },
];

export default component$(() => {
  useStyles$(`
.pf { max-width: 52rem; margin: 0 auto; }
.pf-cab { display: flex; align-items: center; gap: 1rem; margin: .3rem 0 1.4rem; }
.pf-avatar { width: 56px; height: 56px; border-radius: 50%; display: grid; place-items: center; flex: none; background: linear-gradient(135deg, var(--gold), var(--accent)); color: #fff; font-weight: 750; font-size: 1.15rem; }
.pf-cab p { margin: .15rem 0 0; color: var(--muted); font-size: .9rem; overflow-wrap: anywhere; }
.pf-lista { list-style: none; margin: 0; padding: 0; border: 1px solid var(--line); border-radius: var(--r2); background: var(--s1); overflow: hidden; }
.pf-lista li + li { border-top: 1px solid var(--line); }
.pf-lista a { display: flex; align-items: center; gap: .8rem; padding: .8rem 1rem; color: inherit; min-height: 56px; }
.pf-lista a:hover { background: var(--s2); text-decoration: none; }
.pf-lista b { display: block; font-weight: 650; }
.pf-lista span.d { display: block; font-size: .84rem; color: var(--muted); }
.pf-h2 { margin: 1.4rem 0 .6rem; font-size: 1.08rem; font-weight: 700; }
`);
  const session = useContext(SessionContext);
  const st = useStore<{ horario: Horario | null; certs: Certificate[] }>({ horario: null, certs: [] });
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(() => {
    session.help = "perfil";
    setTitle("Perfil");
    api.horario().then((h) => (st.horario = h)).catch(() => undefined);
    api.misCertificados().then((c) => (st.certs = c)).catch(() => undefined);
  });
  const me = session.me;
  if (!me) return <Loading lines={4} />;
  const enlaces = [
    ...ENLACES,
    ...(me.cohorts.includes("pase-libre") ? [{ href: "/pase/", icon: "grad", t: "Pase libre", d: "Todos los cursos de JMD Learning, también los ya dictados." }] : []),
    ...(isStaff(me) ? [{ href: "/instructor/", icon: "users", t: "Instructor", d: "Agenda, avance de alumnos y herramientas del instructor." }] : []),
  ];
  return (
    <div class="pf">
      <div class="pf-cab">
        <span class="pf-avatar" aria-hidden="true">{initials(me.name)}</span>
        <div class="grow">
          <h1>{me.name}</h1>
          <p>{me.email}</p>
        </div>
      </div>
      <h2 class="pf-h2">Tu camino</h2>
      {st.horario ? <CaminoBloque pasos={pasosCamino(st.horario)} ahora={Date.now()} certs={st.certs} /> : <Loading lines={2} />}
      <h2 class="pf-h2">Lo tuyo</h2>
      <ul class="pf-lista">
        {enlaces.map((e) => (
          <li key={e.href}>
            <Link href={e.href}>
              <span class="lead-ico"><Icon name={e.icon} /></span>
              <span class="grow">
                <b>{e.t}</b>
                <span class="d">{e.d}</span>
              </span>
              <Icon name="chevronRight" size={16} class="faint" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
});

export const head: DocumentHead = { title: "Perfil" };
