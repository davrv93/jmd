import { staticAdapter } from "@builder.io/qwik-city/adapters/static/vite";
import { extendConfig } from "@builder.io/qwik-city/vite";
import baseConfig from "../../vite.config";

// Build estático: cada ruta queda como HTML en dist/ y el servidor Go la sirve tal cual.
// Las rutas con parámetro ([slug], [id]) se enumeran en su onStaticGenerate leyendo ../content.
export default extendConfig(baseConfig, () => {
  return {
    build: {
      ssr: true,
      rollupOptions: {
        input: ["@qwik-city-plan"],
      },
    },
    plugins: [
      staticAdapter({
        origin: process.env.LMS_ORIGIN || "http://localhost:8080",
      }),
    ],
  };
});
