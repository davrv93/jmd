import { component$ } from "@builder.io/qwik";
import { QwikCityProvider, RouterOutlet } from "@builder.io/qwik-city";
import { RouterHead } from "./components/router-head/router-head";

import "./global.css";

const TEMA_INICIAL = `try{var t=localStorage.getItem("lms.tema");if(t==="dark"||t==="light")document.documentElement.setAttribute("data-theme",t)}catch(e){}`;

export default component$(() => {
  return (
    <QwikCityProvider>
      <head>
        <meta charset="utf-8" />
        {/* Tema guardado (claro/oscuro) antes del primer pintado; «auto» no pone nada y manda el sistema. */}
        <script dangerouslySetInnerHTML={TEMA_INICIAL} />
        <RouterHead />
      </head>
      <body lang="es">
        <RouterOutlet />
      </body>
    </QwikCityProvider>
  );
});
