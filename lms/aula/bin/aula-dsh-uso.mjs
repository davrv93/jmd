// aula-dsh-uso: lee el flujo «dsh --profile headless --json» (JSON por línea) de la entrada estándar,
// va mostrando el avance, imprime la respuesta y un RESUMEN DE USO, y suma el uso a un archivo de totales.
// Uso:  dsh ... --json | node aula-dsh-uso.mjs <totales.json> <segundos-de-inicio>
//       node aula-dsh-uso.mjs --total <totales.json>        (imprime el acumulado de la sesión)
// Sin dependencias: corre con el Node de la imagen. No imprime nunca la clave (no la recibe).
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createInterface } from "node:readline";

const N = (n) => Number(n || 0).toLocaleString("es-PE");
const vacio = () => ({ tareas: 0, llamadas: 0, entrada_fallo: 0, entrada_acierto: 0, salida: 0, herramientas: 0, segundos: 0 });
const leer = (f) => {
  try {
    return existsSync(f) ? { ...vacio(), ...JSON.parse(readFileSync(f, "utf8")) } : vacio();
  } catch {
    return vacio();
  }
};

function tabla(titulo, u) {
  const entrada = u.entrada_fallo + u.entrada_acierto;
  const pct = entrada > 0 ? Math.round((100 * u.entrada_acierto) / entrada) : 0;
  const s = u.segundos < 10 ? u.segundos.toFixed(1) : String(Math.round(u.segundos));
  return [
    `── ${titulo} ──`,
    `  Entrada:  ${N(entrada)} tokens  (caché acierto ${N(u.entrada_acierto)} · caché fallo ${N(u.entrada_fallo)} · ${pct}% de acierto)`,
    `  Salida:   ${N(u.salida)} tokens`,
    `  Llamadas: ${N(u.llamadas)} al modelo · ${N(u.herramientas)} herramientas`,
    `  Duración: ${s} s`,
  ].join("\n");
}

if (process.argv[2] === "--total") {
  const t = leer(process.argv[3]);
  if (t.tareas > 0) console.log(tabla(`USO DE LA SESIÓN (${t.tareas} ${t.tareas === 1 ? "tarea" : "tareas"})`, t));
  process.exit(0);
}

const totales = process.argv[2];
const inicio = Date.now() / 1000;
const uso = vacio();
let final = null;
let razon = "";
let errorMsg = "";
const rl = createInterface({ input: process.stdin });

rl.on("line", (linea) => {
  let e;
  try {
    e = JSON.parse(linea);
  } catch {
    return;
  }
  switch (e.type) {
    case "tool_call": {
      uso.herramientas++;
      let det = "";
      const i = e.input || {};
      const v = i.command ?? i.cmd ?? i.path ?? i.file ?? i.pattern ?? i.query ?? "";
      if (typeof v === "string" && v) det = " " + v.replace(/\s+/g, " ").slice(0, 70);
      process.stderr.write(`  · ${e.tool}${det}\n`);
      break;
    }
    case "status":
      if (e.phase === "step_end" && e.usage) {
        uso.llamadas++;
        uso.entrada_fallo += e.usage.inputTokens || 0;
        uso.entrada_acierto += e.usage.cacheReadTokens || 0;
        uso.salida += e.usage.outputTokens || 0;
      } else if (e.phase === "step_end") {
        uso.llamadas++;
      }
      if (e.phase === "turn_end") {
        const r = e.reason;
        razon = typeof r === "string" ? r : r?.error?.message || r?.kind || "";
      }
      break;
    case "final":
      final = e.text ?? "";
      break;
    case "error":
      errorMsg = e.message || "error";
      break;
  }
});

rl.on("close", () => {
  uso.segundos = Math.max(0, Date.now() / 1000 - inicio);
  uso.tareas = 1;
  console.log("");
  if (final && final.trim()) {
    console.log("── RESPUESTA ──");
    console.log(final.trim());
  } else if (errorMsg) {
    console.log(`(sin respuesta: ${errorMsg})`);
  } else if (razon) {
    console.log(`(sin respuesta: ${razon})`);
  } else {
    console.log(`(sin respuesta${razon ? ": " + razon : ""})`);
  }
  console.log("");
  console.log(tabla("RESUMEN DE USO", uso));
  if (totales) {
    const t = leer(totales);
    for (const k of Object.keys(uso)) t[k] = (t[k] || 0) + uso[k];
    try {
      writeFileSync(totales, JSON.stringify(t), { mode: 0o600 });
    } catch {}
  }
});
