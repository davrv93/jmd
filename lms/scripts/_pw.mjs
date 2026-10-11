// Localiza playwright-core sin exigir que sea dependencia de lms/web: prueba, en orden,
// PLAYWRIGHT_DIR, lms/web/node_modules y los node_modules de proyectos vecinos que ya lo traen.
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import os from "node:os";

const aqui = path.dirname(fileURLToPath(import.meta.url));
const candidatos = [
  process.env.PLAYWRIGHT_DIR,
  path.join(aqui, "..", "web", "node_modules"),
  path.join(os.homedir(), "Downloads", "PjgFactSalud_completo", "SILA-IA", "web", "node_modules"),
].filter(Boolean);

const require = createRequire(import.meta.url);
let ruta = "";
for (const dir of candidatos) {
  try {
    ruta = require.resolve("playwright-core", { paths: [dir] });
    break;
  } catch {}
}
if (!ruta) {
  console.error("No encuentro playwright-core. Define PLAYWRIGHT_DIR=<carpeta node_modules que lo tenga>.");
  process.exit(2);
}
export const { chromium } = require(ruta);
export const CHROME = process.env.PLAYWRIGHT_CHROMIUM || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
