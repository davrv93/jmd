#!/usr/bin/env node
// Genera los archivos de muestra de la sesión 2 de GoldenQuerys (gq-03) en materials/archivos-muestra/:
//   factura-compra.pdf, boleta-venta.pdf, recibo-honorarios.pdf, extracto-banco.pdf  (HTML → PDF con Chrome sin ventana)
//   nota-credito-escaneada.pdf  (una foto: captura PNG de la nota y luego PDF con solo esa imagen, sin capa de texto)
//   ventas.xlsx (desordenado: títulos arriba, fechas en cinco formatos, montos como texto, un duplicado y la fila TOTAL)
//   gastos.csv (separado por «;», coma decimal, un RUC con el dígito verificador mal, un duplicado y su TOTAL)
//   correo-proveedor.txt (texto libre: ninguna regla sabe qué es)
// Todo es ficticio: empresas, personas, RUC, DNI, teléfonos y correos se inventaron para la clase. Los RUC tienen el
// dígito verificador correcto (módulo 11 de SUNAT) salvo el que lleva el error a propósito; los de empresa empiezan
// por 209…, un rango que SUNAT aún no asigna.
//
// Uso:  /opt/homebrew/bin/node lms/content/courses/goldenquerys-ia/_fuente/muestras/generar.mjs
// Necesita Google Chrome y SheetJS (live/_comun/xlsx.full.min.js, la misma copia que usan las escenas).
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync, mkdtempSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const aqui = dirname(fileURLToPath(import.meta.url));
const curso = join(aqui, "..", "..");
const salida = join(curso, "materials", "archivos-muestra");
const CHROME = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const require = createRequire(import.meta.url);
const XLSX = require(join(curso, "live", "_comun", "xlsx.full.min.js"));
mkdirSync(salida, { recursive: true });

function chrome(args) {
  execFileSync(CHROME, ["--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check", "--hide-scrollbars", ...args], { stdio: "pipe" });
}
function pdf(html, archivo) {
  chrome(["--no-pdf-header-footer", "--print-to-pdf=" + join(salida, archivo), pathToFileURL(join(aqui, html)).href]);
  console.log("✓", archivo);
}

// ---------- los cuatro PDF con texto ----------
pdf("factura-compra.html", "factura-compra.pdf");
pdf("boleta-venta.html", "boleta-venta.pdf");
pdf("recibo-honorarios.html", "recibo-honorarios.pdf");
pdf("extracto-banco.html", "extracto-banco.pdf");

// ---------- la nota de crédito escaneada: foto → PDF de solo imagen ----------
{
  const tmp = mkdtempSync(join(tmpdir(), "gq-nota-"));
  const png = join(tmp, "nota.png");
  chrome(["--window-size=900,1180", "--force-device-scale-factor=1.25", "--screenshot=" + png, pathToFileURL(join(aqui, "nota-credito.html")).href]);
  const envoltura = join(tmp, "escaneo.html");
  writeFileSync(envoltura, `<!doctype html><meta charset="utf-8"><style>@page{size:210mm 275.3mm;margin:0}html,body{margin:0;background:#8e8a84}img{display:block;width:210mm;height:275.3mm}</style><img src="nota.png" alt="">`);
  chrome(["--no-pdf-header-footer", "--print-to-pdf=" + join(salida, "nota-credito-escaneada.pdf"), pathToFileURL(envoltura).href]);
  rmSync(tmp, { recursive: true, force: true });
  console.log("✓ nota-credito-escaneada.pdf (solo imagen)");
}

// ---------- ventas.xlsx ----------
// f: excel (fecha de Excel), dt (fecha y hora de Excel), dmy («03/10/2026» como texto), iso («2026-10-05» como texto),
// mes («6-oct-2026» como texto). tot: número, o el texto tal cual lo escribió la cajera.
const V = [
  ["excel", 1, "B001-00012101", "", "", "Paracetamol 500 mg x 10", 2, 1.5],
  ["excel", 1, "B001-00012102", "Marisol Ccahuana Y.", "45127839", "Losartán 50 mg x 30", 1, 18.5],
  ["dmy", 2, "B001-00012115", "", "", "Alcohol 70° x 250 mL", 1, 4.5],
  ["dmy", 3, "F001-00000841", "Inversiones Qori Inti S.A.C.", "20984127635", "Mascarilla KN95 x 20", 5, 15],
  ["iso", 4, "B001-00012160", "", "", "Suero oral x 1 L", 3, 5.2],
  ["iso", 5, "B001-00012188", "Julio Huaylla P.", "70315864", "Amoxicilina 500 mg x 10", 2, 4.8],
  ["mes", 6, "B001-00012203", "", "", "Vitamina C 1 g x 10", 1, 9.9],
  ["excel", 7, "B001-00012230", "", "", "Termómetro digital", 1, 17.7],
  ["excel", 8, "B001-00012251", "Rosa Inés T. M.", "41893207", "Omeprazol 20 mg x 14", 1, 12.9],
  ["dmy", 9, "B001-00012277", "", "", "Paracetamol 500 mg x 100", 1, 12.5, "12,50"],
  ["dmy", 10, "F001-00000852", "Inversiones Qori Inti S.A.C.", "20984127635", "Alcohol medicinal 70° x 1 L", 10, 8.9],
  ["dt", 11, "B001-00012310", "", "", "Gasas estériles x 10", 4, 2.5],
  ["iso", 12, "B001-00012342", "", "", "Ibuprofeno 400 mg x 10", 2, 3.2],
  ["mes", 13, "B001-00012365", "Marisol Ccahuana Y.", "45127839", "Losartán 50 mg x 30", 1, 18.5],
  ["excel", 14, "B001-00012390", "", "", "Pañales talla M x 30", 1, 42.9, "S/ 42.90"],
  ["excel", 15, "B001-00012411", "", "", "Suero oral x 1 L", 2, 5.2],
  ["dmy", 16, "B001-00012437", "Carlos Ñahui R.", "47260518", "Insulina NPH 10 mL", 1, 38],
  ["dmy", 16, "B001-00012437", "Carlos Ñahui R.", "47260518", "Insulina NPH 10 mL", 1, 38], // pegada dos veces
  ["excel", 17, "B001-00012459", "", "", "Alcohol 70° x 250 mL", 2, 4.5],
  ["iso", 18, "F001-00000867", "Inversiones Qori Inti S.A.C.", "20984127635", "Guantes de nitrilo x 100", 3, 24],
  ["excel", 19, "B001-00012490", "", "", "Vitamina C 1 g x 10", 2, 9.9],
  ["mes", 20, "B001-00012512", "", "", "Termómetro digital", 1, 17.7, null, ""],
  ["excel", 21, "B001-00012873", "Marisol Ccahuana Y.", "45127839", "Losartán, omeprazol, vitamina C y termómetro", 1, 87.4],
  ["dmy", 22, "B001-00012901", "", "", "Ibuprofeno 400 mg x 10", 1, 3.2],
  ["excel", 23, "B001-00012926", "Rosa Inés T. M.", "41893207", "Omeprazol 20 mg x 14", 2, 12.9],
  ["excel", 24, "B001-00012950", "", "", "Gasas estériles x 10", 2, 2.5],
  ["iso", 25, "B001-00012977", "", "", "Pañales talla G x 30", 1, 45.9],
  ["dmy", 27, "B001-00013004", "Julio Huaylla P.", "70315864", "Amoxicilina 500 mg x 10", 1, 4.8],
  ["excel", 29, "B001-00013031", "", "", "Suero oral x 1 L", 4, 5.2],
  ["excel", 31, "F001-00000881", "Inversiones Qori Inti S.A.C.", "20984127635", "Mascarilla KN95 x 20", 4, 15],
];
const MEDIOS = ["Efectivo", "Yape", "Efectivo", "Transferencia", "Yape", "Plin", "Efectivo", "Tarjeta", "Yape", "Efectivo", "Transferencia", "Efectivo", "Yape", "Yape", "Tarjeta",
  "Efectivo", "Plin", "Plin", "Efectivo", "Transferencia", "Yape", "", "Yape", "Efectivo", "Yape", "Efectivo", "Tarjeta", "Plin", "Yape", "Transferencia"];
const MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "set", "oct", "nov", "dic"];
const serial = (d, h = 0, m = 0) => (Date.UTC(2026, 9, d, h, m) - Date.UTC(1899, 11, 30)) / 86400000;
const dd = (n) => String(n).padStart(2, "0");
const ws = {};
const put = (r, c, cell) => { ws[XLSX.utils.encode_cell({ r, c })] = cell; };
const s = (v) => ({ t: "s", v });
put(0, 0, s("BOTICA SANTA KANTUTA E.I.R.L."));
put(1, 0, s("Reporte de ventas · octubre 2026"));
["Fecha", "Comprobante", "Cliente", "DNI / RUC", "Producto", "Cant.", "P. unit.", "Total", "Medio de pago"].forEach((h, c) => put(3, c, s(h)));
let r = 4, sumaFilas = 0, sumaUnicas = 0;
V.forEach((v, i) => {
  const [f, dia, comp, cli, doc, prod, cant, pu, totTexto, medio] = v;
  if (f === "excel") put(r, 0, { t: "n", v: serial(dia), z: "dd/mm/yyyy" });
  else if (f === "dt") put(r, 0, { t: "n", v: serial(dia, 10, 35), z: "dd/mm/yyyy hh:mm" });
  else if (f === "dmy") put(r, 0, s(dd(dia) + "/10/2026"));
  else if (f === "iso") put(r, 0, s("2026-10-" + dd(dia)));
  else put(r, 0, s(dia + "-" + MES[9] + "-2026"));
  put(r, 1, s(comp));
  if (cli) put(r, 2, s(cli));
  if (doc) put(r, 3, s(doc));
  put(r, 4, s(prod));
  put(r, 5, { t: "n", v: cant });
  put(r, 6, { t: "n", v: pu, z: "0.00" });
  const tot = Math.round(cant * pu * 100) / 100;
  put(r, 7, totTexto ? s(totTexto) : { t: "n", v: tot, z: "#,##0.00" });
  const md = medio === undefined ? MEDIOS[i] : medio;
  if (md) put(r, 8, s(md));
  sumaFilas += tot; if (i !== 17) sumaUnicas += tot;
  r++;
});
r++; // fila vacía
put(r, 0, s("TOTAL DEL MES"));
put(r, 7, { t: "n", v: Math.round(sumaUnicas * 100) / 100, z: "#,##0.00" }); // escrito a mano antes de que pegaran el duplicado
r += 2;
put(r, 0, s("Elaborado por: Rocío · 01/11/2026"));
ws["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r, c: 8 } });
ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } }];
ws["!cols"] = [{ wch: 16 }, { wch: 15 }, { wch: 26 }, { wch: 13 }, { wch: 40 }, { wch: 6 }, { wch: 8 }, { wch: 10 }, { wch: 14 }];
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Octubre");
writeFileSync(join(salida, "ventas.xlsx"), XLSX.write(wb, { type: "buffer", bookType: "xlsx", compression: true }));
console.log("✓ ventas.xlsx ·", V.length, "filas · suma", sumaFilas.toFixed(2), "· TOTAL escrito", sumaUnicas.toFixed(2));

// ---------- gastos.csv ----------
const G = [
  ["02/10/2026", "Taxi Wayra S.A.C.", "20985774120", "B005-00088123", "Taxi al banco para depositar la venta del fin de semana", "18,00", "Efectivo"],
  ["04/10/2026", "Imprenta Tinta Viva E.I.R.L.", "20984551208", "F002-00001342", "Volantes para la campaña de vacunación (un millar)", "160,00", "Transferencia"],
  ["07/10/2026", "Energía Andina del Este S.A.A.", "20985362794", "S001-04500127", "Luz del local, consumo de setiembre", "412,80", "Débito automático"],
  ["09/10/2026", "Ferretería El Tornillo Feliz S.A.C.", "20985018464", "B001-00031877", "Candado y cadena para la puerta enrollable", "54,90", "Yape"], // RUC con el dígito mal
  ["11/10/2026", "Restaurante El Fogón de Pariachi E.I.R.L.", "20986481932", "B003-00120455", "Almuerzo con la visitadora médica del laboratorio", "72,00", "Tarjeta"],
  ["14/10/2026", "Distribuidora Ruraq Hampi S.A.C.", "20982631841", "F001-00004587", "Medicamentos del mes (ver factura)", "1.077,10", "Crédito"],
  ["15/10/2026", "", "", "", "Propina al vigilante del mercado", "10,00", "Efectivo"],
  ["20/10/2026", "Taipe Rojas Jorge Luis", "10463182758", "E001-36", "Mantenimiento de la refrigeradora de vacunas", "1.800,00", "Transferencia"],
  ["20/10/2026", "Taxi Wayra S.A.C.", "20985774120", "B005-00091544", "Taxi para llevar muestras al laboratorio", "22,50", "Efectivo"],
  ["22/10/2026", "Imprenta Tinta Viva E.I.R.L.", "20984551208", "F002-00001377", "Bolsas con logo y cinta de embalaje", "95,00", "Yape"],
  ["22/10/2026", "Imprenta Tinta Viva E.I.R.L.", "20984551208", "F002-00001377", "Bolsas con logo y cinta de embalaje", "95,00", "Yape"], // dos veces
  ["2026-10-25", "Telefonía Chaski S.A.", "20986915274", "B010-00774310", "Recarga del celular de la botica", "30,00", "Yape"],
  ["28/10/2026", "Ferretería El Tornillo Feliz S.A.C.", "20985018465", "B001-00032011", "Foco LED y extensión para el almacén", "38,40", "Efectivo"],
  ["30/10/2026", "", "", "", "Café y galletas para la reunión del personal", "24,60", ""],
];
const total = G.reduce((a, g) => a + Number(g[5].replace(/\./g, "").replace(",", ".")), 0);
const csv = ["fecha;proveedor;ruc;comprobante;descripcion;monto;medio_pago"].concat(G.map((g) => g.join(";")))
  .concat(["TOTAL;;;;;" + total.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+,)/g, ".") + ";"]).join("\r\n") + "\r\n";
writeFileSync(join(salida, "gastos.csv"), "﻿" + csv, "utf8");
console.log("✓ gastos.csv ·", G.length, "filas · TOTAL", total.toFixed(2));

// ---------- correo-proveedor.txt ----------
writeFileSync(join(salida, "correo-proveedor.txt"), `De: Ventas Ruraq Hampi <ventas@ruraqhampi.example>
Para: compras@santakantuta.example
Fecha: 27 de octubre de 2026, 10:14
Asunto: Cambio de precios y retraso en la entrega de noviembre

Estimada Sra. Rocío:

Le escribimos para avisarle que desde el 1 de noviembre la amoxicilina de 500 mg sube de S/ 28.00 a S/ 31.50 la caja de 100 cápsulas, por el alza del principio activo. El paracetamol y el alcohol medicinal mantienen su precio hasta fin de año.

Además, el pedido del 3 de noviembre llegará con dos días de retraso porque nuestro camión está en mantenimiento. Si necesita antes la mascarilla KN95, podemos enviársela por courier sin costo adicional.

Quedamos atentos a su confirmación. Cualquier consulta, al 954 118 203.

Atentamente,
Gerardo Wamán
Ejecutivo comercial · Distribuidora Ruraq Hampi S.A.C.

(Correo ficticio para la clase GoldenQuerys de JMD Learning.)
`, "utf8");
console.log("✓ correo-proveedor.txt");
if (!existsSync(join(salida, "factura-compra.pdf"))) process.exit(1);
