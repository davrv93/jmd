// Ayuda contextual: cada página declara su tema y el panel «?» muestra lo que toca.

export interface HelpTopic {
  title: string;
  points: string[];
}

export const HELP: Record<string, HelpTopic> = {
  inicio: {
    title: "Inicio",
    points: [
      "«Continuar» te lleva a la última sesión que abriste en este navegador.",
      "Cada curso muestra tu avance: pasos del ciclo de aprendizaje que marcaste como hechos.",
      "«Próximas entregas» lista las tareas pendientes, la más cercana primero.",
    ],
  },
  curso: {
    title: "Curso",
    points: [
      "Temario: módulos y sesiones. El círculo indica el estado: vacío = sin empezar, a medias = en curso, check = completada.",
      "Tareas: estado de cada entrega y su nota.",
      "Ejemplos: código listo para copiar, relacionado con las sesiones.",
    ],
  },
  sesion: {
    title: "Sesión",
    points: [
      "Las pestañas agrupan la sesión: resumen, diapositivas, contenido, ciclo, materiales, preguntas y tareas.",
      "La pestaña y la diapositiva quedan en la URL: F5 te deja donde estabas y puedes compartir el enlace.",
      "Diapositivas: flechas ← → para avanzar, F para pantalla completa.",
      "Ciclo: marca cada paso cuando lo completes; el instructor ve tu avance.",
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
  notas: { title: "Notas", points: ["Todas tus entregas con su estado, nota y comentarios.", "También en la terminal: jmd grades."] },
  enlaces: { title: "Enlaces", points: ["Todo lo publicado en las sesiones.", "Filtra por tipo o busca por texto; el filtro queda en la URL."] },
  ejemplos: {
    title: "Ejemplos",
    points: ["Casos prácticos con código para copiar.", "Filtra por nivel o etiqueta; cada ejemplo indica la sesión con la que va."],
  },
  instructor: {
    title: "Instructor",
    points: [
      "El temario vive en lms/content: sesiones, tareas y ejemplos en Markdown. Al hacer commit y desplegar, el servidor lo recarga solo.",
      "Avance: pasos del ciclo hechos por alumno y sesión.",
      "Para calificar, abre la tarea y ve a la pestaña «Calificar».",
    ],
  },
};

export const SHORTCUTS: [string, string][] = [
  ["?", "Abrir o cerrar esta ayuda"],
  ["g i", "Ir a Inicio"],
  ["g e", "Ir a Ejemplos"],
  ["g n", "Ir a Notas"],
  ["/", "Buscar (en Ejemplos y Enlaces)"],
  ["← →", "Diapositiva anterior / siguiente"],
  ["f", "Diapositivas a pantalla completa"],
];
