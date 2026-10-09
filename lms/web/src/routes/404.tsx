import { component$ } from "@builder.io/qwik";
import { Link, type DocumentHead } from "@builder.io/qwik-city";
import { Empty } from "~/components/ui";

export default component$(() => (
  <div style="max-width:30rem;margin:3rem auto">
    <Empty icon="search" title="Esta página no existe" text="Puede que el enlace esté mal o que el contenido se haya movido.">
      <Link class="btn sm" href="/courses/">Ir al inicio</Link>
    </Empty>
  </div>
));

export const head: DocumentHead = { title: "No encontrada" };
