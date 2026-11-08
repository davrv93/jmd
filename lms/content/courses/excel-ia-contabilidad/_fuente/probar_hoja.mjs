#!/usr/bin/env node
// Prueba interactiva de la Hoja JMD (reto de la clase 1, empresa E07) como la usaría una persona, en Chrome headless:
//   node _fuente/probar_hoja.mjs [carpeta-capturas]
// A 1440 px (mouse y teclado): escribe fórmulas en español, copia con referencias relativas (Ctrl+C / Ctrl+V), arrastra el
// controlador de relleno, apunta celdas con el mouse mientras escribe una fórmula, resalta errores (#¡DIV/0!, una función
// en inglés, un paréntesis sin cerrar), cambia el formato, deshace, revisa (100 %), exporta .xlsx, rechaza y repara
// respuestas de IA mal formadas y carga un escenario con la IA simulada.
// A 390 px (tacto): toca una celda, escribe en la barra de fórmulas, revisa, exporta y genera un escenario.
// Levanta probar.mjs --servir (la IA es simulada: no hay red ni gasto).
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { mkdirSync, statSync, copyFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const aqui = dirname(fileURLToPath(import.meta.url));
const repo = join(aqui, "..", "..", "..", "..", "..");
const require = createRequire(join(repo, "lms", "web", "package.json"));
const { chromium } = require("playwright-core");
const CHROME = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const salida = process.argv[2] || null;
if (salida) mkdirSync(salida, { recursive: true });

const srv = spawn(process.execPath, [join(aqui, "probar.mjs"), "--servir", "0"], { stdio: ["ignore", "pipe", "inherit"] });
const BASE = await new Promise((ok) => srv.stdout.on("data", (d) => { const m = /Sirviendo el curso en (\S+)/.exec(String(d)); if (m) ok(m[1]); }));
const URL_RETO = `${BASE}/marco?src=${encodeURIComponent("/api/v1/live/ex-01/escenas/04-caso/html")}`;
let fallos = 0;
const bien = (m) => console.log("  ✓ " + m);
const mal = (m) => { fallos++; console.log("  ✗ " + m); };
const comprobar = (c, m, extra) => (c ? bien(m) : mal(m + (extra !== undefined ? " → " + JSON.stringify(extra) : "")));

const browser = await chromium.launch({ executablePath: CHROME, headless: true });

async function abrir(ctxOpc) {
  const ctx = await browser.newContext({ acceptDownloads: true, ...ctxOpc });
  const page = await ctx.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errores.push(m.text()); });
  await page.goto(URL_RETO);
  const fr = await (await page.waitForSelector("#f")).contentFrame();
  await fr.waitForSelector(".hj td[data-r]", { state: "attached" });
  await fr.selectOption("#ex-empresa", "E07");
  await fr.waitForFunction(() => /Clínica Santa Lucía/.test(document.querySelector(".hj-t").textContent));
  return { ctx, page, fr, errores };
}
const td = (r) => `.hj-t td[data-r="${r}"]`;
const texto = (fr, r) => fr.$eval(td(r), (x) => x.textContent);
const entrada = (fr, r, hoja) => fr.evaluate(([r, hoja]) => { const H = window.EX_RETO.hoja, L = H.libro(), c = L.celda(hoja || H.seleccionado().hoja, r); return c ? c.e : null; }, [r, hoja]);

// ================================================================ escritorio
console.log("Escritorio 1440x900 (mouse y teclado)");
{
  const { ctx, page, fr, errores } = await abrir({ viewport: { width: 1440, height: 900 } });
  const tecla = (k) => page.keyboard.press(k);
  const escribir = async (r, t, fin = "Enter") => { await fr.click(td(r)); await page.keyboard.type(t, { delay: 2 }); await tecla(fin); };

  await escribir("I5", '=SI(G5="Gravada",REDONDEAR(H5*$N$2,2),0)', "Tab");
  await page.keyboard.type("=H5+I5", { delay: 2 }); await tecla("Enter");
  const esperadoI5 = await fr.evaluate(() => { const L = window.EX_RETO.hoja.libro(); return L.evaluarEn('=SI(G5="Gravada",REDONDEAR(H5*$N$2,2),0)', "Ventas", "I5"); });
  comprobar((await texto(fr, "I5")) === Number(esperadoI5).toFixed(2), "I5 calcula el IGV con SI y REDONDEAR: " + (await texto(fr, "I5")));
  comprobar(/^=H5\+I5$/.test(await entrada(fr, "J5")), "Tab pasa a J5 y Enter confirma =H5+I5");

  // copiar I5:J5 y pegar en I6:J28 (referencias relativas)
  await fr.click(td("I5")); await fr.click(td("J5"), { modifiers: ["Shift"] });
  await tecla("Meta+c");
  await fr.click(td("I6")); await fr.click(td("J28"), { modifiers: ["Shift"] });
  await tecla("Meta+v");
  comprobar((await entrada(fr, "I17")) === '=SI(G17="Gravada",REDONDEAR(H17*$N$2,2),0)', "Ctrl+V ajusta las referencias relativas y respeta $N$2", await entrada(fr, "I17"));
  comprobar((await entrada(fr, "J28")) === "=H28+I28", "J28 quedó =H28+I28");

  // controlador de relleno
  await escribir("L5", "=H5*2");
  await fr.click(td("L5"));
  const asa = await fr.$(".hj-asa"), a = await asa.boundingBox(), dest = await (await fr.$(td("L8"))).boundingBox();
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await page.mouse.down();
  await page.mouse.move(dest.x + dest.width / 2, dest.y + dest.height / 2, { steps: 8 }); await page.mouse.up();
  comprobar((await entrada(fr, "L8")) === "=H8*2", "el controlador de relleno copia =H5*2 hasta L8 como =H8*2", await entrada(fr, "L8"));
  await fr.click(td("L5")); await fr.click(td("L8"), { modifiers: ["Shift"] }); await tecla("Delete");
  comprobar((await entrada(fr, "L6")) === null, "Supr borra el rango L5:L8");

  // errores resaltados y explicados
  await escribir("L30", "=H5/0");
  comprobar((await texto(fr, "L30")) === "#¡DIV/0!" && (await fr.$eval(td("L30"), (x) => x.classList.contains("t-err"))), "=H5/0 da #¡DIV/0! resaltado en rojo");
  await fr.click(td("L30"));
  comprobar(/Divides entre cero/.test(await fr.textContent(".hj-estado")), "la barra de estado explica el error");
  await escribir("L31", '=SUMIF(G5:G28,"Gravada",H5:H28)');
  await fr.click(td("L31"));
  comprobar((await texto(fr, "L31")) === "#¿NOMBRE?" && /SUMAR\.SI/.test(await fr.textContent(".hj-estado")), "una función en inglés da #¿NOMBRE? y sugiere SUMAR.SI", await fr.textContent(".hj-estado"));
  await escribir("L32", "=SUMA(H5:H28");
  comprobar((await entrada(fr, "L32")) === "=SUMA(H5:H28)" && /\d/.test(await texto(fr, "L32")), "cierra el paréntesis que falta (=SUMA(H5:H28)): " + (await texto(fr, "L32")));
  await escribir("L33", '=BUSCARX("F001-000999",C5:C28,H5:H28)');
  comprobar((await texto(fr, "L33")) === "#N/D", "BUSCARX sin coincidencia da #N/D");
  // modo puntero: escribir = y hacer clic en una celda
  await fr.click(td("L34")); await page.keyboard.type("="); await fr.click(td("H5")); await page.keyboard.type("*2"); await tecla("Enter");
  comprobar((await entrada(fr, "L34")) === "=H5*2", "con = escrito, un clic en H5 inserta la referencia", await entrada(fr, "L34"));
  await fr.click(td("L30")); await fr.click(td("L34"), { modifiers: ["Shift"] }); await tecla("Delete");

  // formato y deshacer
  await fr.click(td("H5"));
  const antes = await texto(fr, "H5");
  await fr.selectOption(".hj-formato", "0.0%");
  const pct = await texto(fr, "H5");
  await tecla("Meta+z");
  comprobar(/%$/.test(pct) && (await texto(fr, "H5")) === antes, `formato porcentaje (${pct}) y Ctrl+Z lo deshace (${antes})`);

  // resumen: escribir las fórmulas (en español) de la columna N
  const resumen = await fr.evaluate(() => window.EX_RETO.hoja.revision().filter((x) => /^N/.test(x.ref)).map((x) => [x.ref, x.r]));
  for (const [r, f] of resumen) await escribir(r, f);
  comprobar(resumen.length === 7, "escribió las 7 fórmulas del resumen (N5:N11)");

  // revisar
  await fr.click(".hj-b.pri");
  const rev = await fr.textContent("#reto-revision .rv-total");
  comprobar(/^55 de 55/.test(rev.trim()), "Revisar: " + rev.trim());
  await fr.evaluate(() => { const g = document.querySelector(".hj-rejilla"); g.scrollLeft = g.scrollWidth; });
  if (salida) await page.screenshot({ path: join(salida, "hoja-1440-revisada.png") });

  // un error a propósito para ver el rojo y la pista
  await escribir("I9", "100");
  await fr.click(".hj-b.pri");
  const rev2 = await fr.textContent("#reto-revision");
  comprobar(/54 de 55/.test(rev2) && /escritas a mano|Revisa/.test(rev2), "un número escrito a mano en I9 no cuenta (54 de 55)");
  comprobar(await fr.$eval(td("I9"), (x) => x.classList.contains("rv-mal")), "I9 queda marcada en rojo");
  await fr.click("text=💡 Ver la fórmula de referencia");
  comprobar(/I9: =SI\(/.test(await fr.textContent("#reto-revision")), "desde el segundo intento muestra la fórmula de referencia");
  if (salida) await page.screenshot({ path: join(salida, "hoja-1440-error.png") });
  await fr.click(td("I9")); await tecla("Meta+z");

  // exportar
  const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 5000 }).catch(() => null), fr.click(".hj-b.hoja")]);
  comprobar(!!dl && /^ex-01-E07-clinica-santa-lucia-hoja-jmd\.xlsx$/.test(dl.suggestedFilename()), "exporta " + (dl && dl.suggestedFilename()));
  if (dl && salida) { await dl.saveAs(join(salida, "hoja-1440-exportada.xlsx")); bien("guardado en " + join(salida, "hoja-1440-exportada.xlsx") + " (" + statSync(join(salida, "hoja-1440-exportada.xlsx")).size + " B)"); }

  // respuestas de IA mal formadas (pegadas desde DeepSeek Harness)
  await fr.click(".ia-manual summary");
  await fr.fill(".ia-manual .ia-pegar", "Claro, aquí tienes: {tablas: Ventas}");
  await fr.click("[data-ia-cargar]");
  comprobar(/no es un JSON válido/.test(await fr.textContent(".ia-estado")), "rechaza un JSON roto");
  await fr.fill(".ia-manual .ia-pegar", JSON.stringify({ tablas: { Ventas: [["32/13/2026", "Factura", "F001-1", "X", "99123456789", "Arroz", "Gravada", 10]] } }));
  await fr.click("[data-ia-cargar]");
  comprobar(/quedó con 0 filas/.test(await fr.textContent(".ia-estado")), "rechaza filas sin fecha válida: " + (await fr.textContent(".ia-estado")));
  const reparable = { titulo: "Bodega Don Lucho · noviembre 2026", supuestos: ["Régimen MYPE Tributario"], parametros: { "Ventas!N2": "18%", Z9: 4 },
    tablas: { Ventas: [["05/11/2026", "factura", "F001-000901", "Bodega Sur", "99123456789", "Arroz (saco)", "gravada", "1,250.50"],
                       ["2026-11-06", "Boleta", "B001-000301", "Cliente con DNI", "45678912", "Aceite", "Inafecta", "80"],
                       { Fecha: "07/11/2026", Tipo: "Factura", "Serie-Número": "F001-000902", Cliente: "Minimarket Lía", "RUC / DNI": "99876543210", "Producto o servicio": "Azúcar", Operación: "Exonerada", "Valor de venta": -5 }],
              Otra: [] } };
  await fr.fill(".ia-manual .ia-pegar", "```json\n" + JSON.stringify(reparable) + "\n```");
  await fr.click("[data-ia-cargar]");
  const est = await fr.textContent(".ia-estado");
  comprobar(/Listo: 3 filas · reparamos 3 datos/.test(est), "repara y carga: " + est);
  const vals = await Promise.all(["H5", "G5", "G6", "H7", "A6"].map((r) => texto(fr, r)));
  comprobar(vals.join("|") === "1,250.50|Gravada|Exonerada|0.00|06/11/2026", "«1,250.50» → número, «gravada» → Gravada, «Inafecta» → primera opción, −5 → 0, 2026-11-06 → fecha", vals);
  comprobar((await texto(fr, "A1")) === "Bodega Don Lucho · noviembre 2026", "el título del escenario va en A1");
  const nRev = await fr.evaluate(() => window.EX_RETO.hoja.revision().length);
  comprobar(nRev === 3 * 2 + 7, `la revisión se rehace para 3 filas (${nRev} celdas)`);

  // IA de la clase (simulada)
  await fr.click("[data-ia-volver]");
  await fr.waitForFunction(() => /Clínica Santa Lucía/.test(document.querySelector(".hj-t").textContent));
  await fr.click(".ia-chip >> nth=1");
  await fr.click("[data-ia-generar]");
  await fr.waitForSelector(".ia-estado.ok", { timeout: 8000 });
  comprobar(/Listo/.test(await fr.textContent(".ia-estado")), "genera un escenario con la IA simulada: " + (await fr.textContent(".ia-estado")));
  if (salida) await page.screenshot({ path: join(salida, "hoja-1440-escenario-ia.png") });
  await fr.click("[data-ia-copiar]");
  await page.waitForTimeout(300);
  const pedido = await fr.evaluate(() => window.EX_RETO.armarPedido("una bodega con 3 trabajadores"));
  comprobar(/Formato de la respuesta/.test(pedido) && /Ventas \(hoja Ventas; entre 1 y 24 filas\)/.test(pedido), "arma el pedido para DeepSeek Harness (" + pedido.length + " caracteres)");
  comprobar(!errores.length, "sin errores de consola", errores);
  await ctx.close();
}

// ================================================================ celular
console.log("Celular 390x844 (tacto)");
{
  const { ctx, page, fr, errores } = await abrir({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  await fr.evaluate(() => document.querySelector(".hj").scrollIntoView());
  await fr.tap(td("I5"));
  await fr.tap(td("I5"));
  comprobar(await fr.evaluate(() => document.activeElement && document.activeElement.classList.contains("hj-fx-in")), "el segundo toque abre la barra de fórmulas");
  await page.keyboard.type('=SI(G5="Gravada",REDONDEAR(H5*$N$2,2),0)', { delay: 2 });
  await fr.tap(".hj-fx-b >> nth=0");
  comprobar(/^\d/.test(await texto(fr, "I5")), "✓ confirma: I5 = " + (await texto(fr, "I5")));
  const med = await fr.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  comprobar(med.sw <= med.cw + 1, `sin desborde horizontal (${med.sw} ≤ ${med.cw})`);
  await fr.tap(".hj-b.pri");
  comprobar(/^1 de 55/.test((await fr.textContent("#reto-revision .rv-total")).trim()), "revisar: " + (await fr.textContent("#reto-revision .rv-total")).trim());
  if (salida) { await page.screenshot({ path: join(salida, "hoja-390.png") }); await fr.evaluate(() => document.querySelector("#reto-revision").scrollIntoView()); await page.screenshot({ path: join(salida, "hoja-390-revision.png") }); }
  const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 5000 }).catch(() => null), fr.tap(".hj-b.hoja")]);
  comprobar(!!dl, "exporta desde el celular");
  await fr.fill(".ia-pedido", "una bodega con 3 trabajadores y ventas en dólares");
  await fr.tap("[data-ia-generar]");
  await fr.waitForSelector(".ia-estado.ok", { timeout: 8000 });
  comprobar(true, "escenario IA en el celular: " + (await fr.textContent(".ia-estado")));
  if (salida) { await fr.evaluate(() => document.querySelector(".hj").scrollIntoView()); await page.screenshot({ path: join(salida, "hoja-390-escenario.png") }); }
  comprobar(!errores.length, "sin errores de consola", errores);
  await ctx.close();
}

await browser.close();
srv.kill();
console.log(fallos ? `\n${fallos} fallo(s)` : "\nHoja JMD: todo en verde");
process.exit(fallos ? 1 : 0);
