// Pasa cada brochure HTML a PDF (A4) y PNG. Si el contenido no cabe en la página, encoge el texto y avisa.
import { chromium, CHROME } from "../lms/scripts/_pw.mjs";
import fs from "node:fs"; import path from "node:path";
const html = path.resolve("salida/html"), pdf = path.resolve("salida/pdf"), png = path.resolve("salida/png");
fs.mkdirSync(pdf, { recursive: true }); fs.mkdirSync(png, { recursive: true });
const b = await chromium.launch({ executablePath: CHROME, headless: true });
const p = await b.newPage({ viewport: { width: 794, height: 1123 }, deviceScaleFactor: 2 });
for (const f of fs.readdirSync(html).filter((x) => x.endsWith(".html")).sort()) {
  const nombre = f.replace(".html", ""), indice = nombre.startsWith("00-");
  await p.goto("file://" + path.join(html, f));
  let k = 1, nota = "";
  const fijo = await p.evaluate(() => document.body.hasAttribute("data-fijo"));   // maqueta propia: no se reescala
  if (fijo) nota = "maqueta propia";
  if (!indice && !fijo) {
    // El cuerpo no debe chocar con el pie.
    const choca = () => p.evaluate(() => { const c = document.querySelector(".cuerpo"); const hijos = [...c.children]; return Math.max(hijos[0].scrollHeight, hijos[1].scrollHeight) + hijos[2].offsetHeight + 18 + 8 - c.clientHeight; });
    const fijar = (v) => p.evaluate((x) => document.documentElement.style.setProperty("--k", x), v);
    // Aprovecha la página: agranda el texto mientras quede aire, y lo encoge si no cabe.
    while ((await choca()) < -40 && k < 1.3) { k += 0.02; await fijar(k); }
    while ((await choca()) > 0 && k > 0.8) { k -= 0.02; await fijar(k); }
    const resto = await choca();
    nota = `texto ${Math.round(k * 100)} %` + (resto > 0 ? `  ← NO CABE (${Math.round(resto)} px)` : `  · aire ${Math.round(-resto)} px`);
  }
  await p.pdf({ path: path.join(pdf, nombre + ".pdf"), format: "A4", printBackground: true, margin: { top: indice ? "0" : "0", bottom: "0", left: "0", right: "0" } });
  await p.screenshot({ path: path.join(png, nombre + ".png"), fullPage: indice });
  console.log(nombre, nota);
}
await b.close();
