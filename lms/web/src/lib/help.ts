// Ayuda contextual: cada página declara su tema y el panel «?» muestra lo que toca.

export interface HelpTopic {
  title: string;
  points: string[];
}

export const HELP: Record<string, HelpTopic> = {
  inicio: {
    title: "Inicio",
    points: [
      "Arriba está tu próxima clase: «Entrar» abre el LIVE cuando la clase está por empezar y, antes, la sesión.",
      "«Pendiente» muestra hasta tres tareas por entregar, primero las vencidas.",
      "«Tu avance» tiene un anillo por curso: afuera las sesiones hechas, adentro (en oro) las tareas entregadas.",
      "«Tu siguiente paso» te sugiere cursos que vienen, según las áreas que ya llevaste.",
      "«Tu camino» cuenta los cursos que terminaste; la línea punteada es lo que terminarás pronto.",
    ],
  },
  catalogo: {
    title: "Catálogo",
    points: [
      "Aquí están todos los cursos que empiezan pronto y los que ya están en curso.",
      "Filtra por área con los botones de arriba; el filtro vale para las dos vistas.",
      "«Línea de tiempo» muestra las próximas 8 semanas: un punto por sesión y la línea dorada es hoy. Toca un punto para ver su fecha.",
      "«Inscribirme» abre la inscripción por enlace. Si el grupo no la tiene, «Quiero inscribirme» abre WhatsApp con un mensaje listo.",
    ],
  },
  perfil: {
    title: "Perfil",
    points: [
      "Desde aquí llegas a tus logros y certificados, tu horario, tus proyectos, los recursos y el estudio.",
      "El tema claro u oscuro se cambia desde el menú de tu cuenta (tus iniciales, arriba a la derecha).",
    ],
  },
  pase: {
    title: "Pase libre",
    points: [
      "Con el pase libre tienes todos los cursos sin costo.",
      "Cada fila es un curso. Ábrela y elige uno de sus grupos con los botones de arriba.",
      "Punto dorado: grupo por empezar. Punto verde: en curso. Punto gris: ya dictado.",
      "En un grupo que viene, «Inscribirme gratis» te deja dentro y lo verás en Aprender y en Horario.",
      "En un grupo ya dictado, «Ver las clases de este grupo» te muestra sus clases y grabaciones. Puedes elegir más de un grupo.",
    ],
  },
  curso: {
    title: "Curso",
    points: [
      "Cada sesión recorre las cuatro fases del ciclo de Kolb; aquí ves la ruta completa.",
      "Temario: módulos y sesiones. El círculo indica el estado: vacío = sin empezar, a medias = en curso, check = completada.",
      "Tareas: estado de cada entrega y su nota.",
      "Prácticas: código listo para copiar, relacionado con las sesiones.",
    ],
  },
  sesion: {
    title: "Sesión",
    points: [
      "«Mi ruta» organiza la sesión en las cuatro fases del ciclo de Kolb; el resto de pestañas son apoyo: diapositivas, contenido, materiales, preguntas y tareas.",
      "Marca cada paso del ciclo cuando lo completes; el instructor ve tu avance.",
      "La pestaña y la diapositiva quedan en la URL: F5 te deja donde estabas y puedes compartir el enlace.",
      "Diapositivas: flechas ← → para avanzar, F para pantalla completa.",
      "Preguntas: pega el error completo; también desde la terminal con jmd ask.",
    ],
  },
  tarea: {
    title: "Tarea",
    points: [
      "Lee el enunciado y la rúbrica antes de empezar.",
      "Entrega la URL del repositorio y el commit (git rev-parse HEAD), o usa jmd submit desde el repo.",
      "Puedes entregar varias veces: cuenta la última. El estado cambia a «calificada» cuando el instructor pone nota.",
    ],
  },
  notas: {
    title: "Notas",
    points: [
      "Todas tus entregas con su estado, nota y comentarios.",
      "Mis certificados: cada uno tiene un código público; cualquiera puede verificarlo en /verificar/ sin iniciar sesión.",
      "La insignia digital (Open Badges 3.0) se descarga en JSON o firmada en JWT, y se puede añadir a LinkedIn.",
      "También en la terminal: jmd grades.",
    ],
  },
  enlaces: { title: "Recursos", points: ["Todo lo publicado en las sesiones.", "Filtra por tipo o busca por texto; el filtro queda en la URL."] },
  ejemplos: {
    title: "Prácticas",
    points: ["Casos prácticos con código para copiar.", "Filtra por nivel o etiqueta; cada práctica indica la sesión con la que va."],
  },
  instructor: {
    title: "Instructor",
    points: [
      "El temario vive en lms/content: sesiones, tareas y ejemplos en Markdown. Al hacer commit y desplegar, el servidor lo recarga solo.",
      "Avance: pasos del ciclo hechos por alumno y sesión.",
      "Para calificar, abre la tarea y ve a la pestaña «Calificar».",
      "Certificados: desde el avance del curso, «Emitir certificado» por alumno. Solo un certificado vigente por alumno y curso; el admin puede anularlo.",
    ],
  },
};

export const SHORTCUTS: [string, string][] = [
  ["?", "Abrir o cerrar esta ayuda"],
  ["g i", "Ir a Inicio"],
  ["g c", "Ir a Mis cursos"],
  ["g k", "Ir al Catálogo"],
  ["g p", "Ir a Proyectos"],
  ["g e", "Ir a Prácticas"],
  ["g n", "Ir a Notas"],
  ["/", "Buscar (en Ejemplos y Enlaces)"],
  ["← →", "Diapositiva anterior / siguiente"],
  ["f", "Diapositivas a pantalla completa"],
];
