// Comprueba que el JS del navegador elige lo mismo que Go: node verificar_test.mjs
import { elegir } from "./web/static/comun.js";
const f = await elegir("semilla-de-prueba", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 3);
const [g] = await elegir("otra-semilla", f, 1);
const esperado = "finalistas=[5 4 7] ganador=7";
const obtenido = `finalistas=[${f.join(" ")}] ganador=${g}`;
console.log(obtenido);
if (obtenido !== esperado && process.argv[2] !== "--ver") { console.error("NO coincide con Go:", esperado); process.exit(1); }
