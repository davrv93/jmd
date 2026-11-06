#!/usr/bin/env node
// Corre todas las simulaciones sin navegador. Uso: npm run comparar  (o  npm run comparar -- --json)
import { arrancar } from "../src/arranque.mjs";
import { correrEscenario, ESCENARIOS } from "../src/escenarios.mjs";

const ctx = await arrancar({ puertos: { panel: 0, directo: 0, gateway: 0, backend: 0 } });
const salida = [];
for (const e of ESCENARIOS) salida.push(await correrEscenario(ctx, e.id));
await ctx.detener();

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(salida, null, 2));
} else {
  for (const r of salida) {
    console.log(`\n${r.titulo}\n  ${r.pregunta}`);
    console.log(`  ${(r.directo.nombre || "Sin gateway").padEnd(26)} ${String(r.directo.status).padEnd(4)} ${r.directo.veredicto.padEnd(10)} ${r.directo.nota}`);
    console.log(`  ${(r.gateway.nombre || "Con gateway").padEnd(26)} ${String(r.gateway.status).padEnd(4)} ${r.gateway.veredicto.padEnd(10)} ${r.gateway.nota}`);
    if (r.gateway.registro || r.directo.registro) console.log(`  Registro: ${r.gateway.registro || r.directo.registro}`);
    console.log(`  Lección: ${r.leccion}`);
  }
}
