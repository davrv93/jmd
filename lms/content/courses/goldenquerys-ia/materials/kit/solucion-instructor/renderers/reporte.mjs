// Renderer Node 24 (node:sqlite): consulta → console.table + archivo JSON.
//
// Uso:
//   node renderers/reporte.mjs botica                      # «ventas por mes» (v_ventas_mensuales)
//   node renderers/reporte.mjs botica consultas/botica-top-productos.sql
//   node renderers/reporte.mjs botica consultas/x.sql --nombre mi-reporte
// Escribe reportes/<nombre>.json. Abre la base en SOLO LECTURA.
// (Node puede avisar «ExperimentalWarning: SQLite…»: es normal.)
import { DatabaseSync } from 'node:sqlite';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const KIT = dirname(dirname(fileURLToPath(import.meta.url)));
const SQL_DEFECTO = 'SELECT * FROM v_ventas_mensuales;';

const args = process.argv.slice(2);
if (!args.length || args[0] === '-h' || args[0] === '--help') {
  console.log('Uso: node renderers/reporte.mjs <base> [archivo.sql] [--nombre salida]');
  process.exit(1);
}
let nombre;
const iN = args.indexOf('--nombre');
if (iN >= 0) { nombre = args[iN + 1]; args.splice(iN, 2); }
const [base, sqlFile] = args;

const rutaDb = join(KIT, 'bases', `${base}.sqlite`);
if (!existsSync(rutaDb)) {
  const hay = readdirSync(join(KIT, 'bases')).filter((f) => f.endsWith('.sqlite')).map((f) => f.slice(0, -7));
  console.error(`Base desconocida: ${base}. Hay: ${hay.join(', ')}`);
  process.exit(1);
}
let sql = SQL_DEFECTO;
if (sqlFile) {
  const ruta = [sqlFile, join(KIT, sqlFile)].find((r) => existsSync(r));
  if (!ruta) { console.error(`No encuentro el archivo SQL: ${sqlFile}`); process.exit(1); }
  sql = readFileSync(ruta, 'utf8');
}
nombre ??= sqlFile ? basename(sqlFile, '.sql') : `${base}-ventas-por-mes`;

const db = new DatabaseSync(rutaDb, { readOnly: true });
const inicio = performance.now();
const filas = db.prepare(sql.trim().replace(/;\s*$/, '')).all();
const ms = Math.round((performance.now() - inicio) * 10) / 10;
db.close();

console.log(`\n${base} · ${nombre} — ${filas.length} filas en ${ms} ms`);
console.table(filas.slice(0, 25));
if (filas.length > 25) console.log(`… y ${filas.length - 25} filas más (todas en el JSON).`);

mkdirSync(join(KIT, 'reportes'), { recursive: true });
const salida = { base, nombre, generado: new Date().toISOString(), sql: sql.trim(), total: filas.length, filas };
writeFileSync(join(KIT, 'reportes', `${nombre}.json`), JSON.stringify(salida, null, 2) + '\n');
console.log(`JSON listo: reportes/${nombre}.json`);
