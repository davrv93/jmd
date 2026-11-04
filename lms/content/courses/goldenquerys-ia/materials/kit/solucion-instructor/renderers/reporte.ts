// Renderer Bun (bun:sqlite): consulta → tabla Markdown en pantalla + archivo CSV.
//
// Uso:
//   bun renderers/reporte.ts botica                      # «ventas por mes» (v_ventas_mensuales)
//   bun renderers/reporte.ts botica consultas/botica-top-productos.sql
//   bun renderers/reporte.ts botica consultas/x.sql --nombre mi-reporte
// Escribe reportes/<nombre>.csv. Abre la base en SOLO LECTURA.
import { Database } from "bun:sqlite";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";

const KIT = dirname(dirname(import.meta.path));
const SQL_DEFECTO = "SELECT * FROM v_ventas_mensuales;";

const args = process.argv.slice(2);
if (!args.length || args[0] === "-h" || args[0] === "--help") {
  console.log("Uso: bun renderers/reporte.ts <base> [archivo.sql] [--nombre salida]");
  process.exit(1);
}
let nombre: string | undefined;
const iN = args.indexOf("--nombre");
if (iN >= 0) { nombre = args[iN + 1]; args.splice(iN, 2); }
const [base, sqlFile] = args;

const rutaDb = join(KIT, "bases", `${base}.sqlite`);
if (!existsSync(rutaDb)) {
  const hay = readdirSync(join(KIT, "bases")).filter((f) => f.endsWith(".sqlite")).map((f) => f.slice(0, -7));
  console.error(`Base desconocida: ${base}. Hay: ${hay.join(", ")}`);
  process.exit(1);
}

let sql = SQL_DEFECTO;
if (sqlFile) {
  const ruta = [sqlFile, join(KIT, sqlFile)].find((r) => existsSync(r));
  if (!ruta) { console.error(`No encuentro el archivo SQL: ${sqlFile}`); process.exit(1); }
  sql = readFileSync(ruta, "utf8");
}
nombre ??= sqlFile ? basename(sqlFile, ".sql") : `${base}-ventas-por-mes`;

const db = new Database(rutaDb, { readonly: true });
const consulta = db.query(sql.trim().replace(/;\s*$/, ""));
const filas = consulta.all() as Record<string, unknown>[];
const columnas: string[] = consulta.columnNames;
db.close();

const celda = (v: unknown) => (v === null || v === undefined ? "" : String(v));
// Markdown (máx. 40 filas en pantalla)
const esNum = columnas.map((c) => filas.length > 0 && filas.every((f) => f[c] === null || typeof f[c] === "number"));
const md = [
  `| ${columnas.join(" | ")} |`,
  `| ${esNum.map((n) => (n ? "---:" : "---")).join(" | ")} |`,
  ...filas.slice(0, 40).map((f) => `| ${columnas.map((c) => celda(f[c]).replace(/\|/g, "\\|")).join(" | ")} |`),
].join("\n");
console.log(`\n## ${base} · ${nombre}\n`);
console.log(md);
if (filas.length > 40) console.log(`\n… y ${filas.length - 40} filas más (todas en el CSV).`);

// CSV completo
const csvCelda = (v: unknown) => { const s = celda(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const csv = [columnas.map(csvCelda).join(","), ...filas.map((f) => columnas.map((c) => csvCelda(f[c])).join(","))].join("\n");
mkdirSync(join(KIT, "reportes"), { recursive: true });
writeFileSync(join(KIT, "reportes", `${nombre}.csv`), "﻿" + csv + "\n");
console.log(`\nCSV listo: reportes/${nombre}.csv (${filas.length} filas)`);
