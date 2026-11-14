// Mide el tablero sin pantalla: cuatro robots de la máquina juegan rondas
// completas; cuenta casillas, poderes tomados, cohetes, choques y ganadores.
//   node simular.mjs [rondas] [nivel]
import { nuevaRonda, paso, resultado } from "./web/static/tablero.js";

const RONDAS = +(process.argv[2] || 300), NIV = +(process.argv[3] ?? 0.68);
const gana = [0, 0, 0, 0, 0], tot = [0, 0, 0, 0], tomados = {}, aplicados = {};
let salidos = 0, impactos = 0, choques = 0, cobradas = 0, cobros = 0, mareos = 0, maxTotal = 0;
for (let r = 0; r < RONDAS; r++) {
  const m = nuevaRonda(Math.random, NIV, { todosCpu: true });
  while (!m.fin) {
    paso(m, 1 / 60, null);
    for (const e of m.eventos) {
      if (e.tipo === "tomar") tomados[e.poder] = (tomados[e.poder] || 0) + 1;
      else if (e.tipo === "poder") aplicados[e.poder] = (aplicados[e.poder] || 0) + 1;
      else if (e.tipo === "cobro") { cobros++; cobradas += e.n; }
      else if (e.tipo === "impacto") impactos++;
      else if (e.tipo === "choque") choques++;
      else if (e.tipo === "mareo") mareos++;
    }
    m.eventos.length = 0;
  }
  salidos += m.salidos;
  const res = resultado(m);
  res.conteo.forEach((x, i) => { tot[i] += x; maxTotal = Math.max(maxTotal, x); });
  gana[res.lider < 0 ? 4 : res.lider]++;
}
const f = (x) => (x / RONDAS).toFixed(1);
const por = (o) => Object.entries(o).map(([k, v]) => `${k} ${f(v)}`).join(", ");
console.log(`rondas ${RONDAS}, nivel ${NIV}`);
console.log(`casillas por robot (cobradas + pintadas, triples ×3): ${tot.map(f).join(" · ")} · máximo de un robot ${maxTotal}`);
console.log(`ganadas: ${gana.slice(0, 4).join(" · ")} · empates ${gana[4]}`);
console.log(`por ronda: poderes ${f(salidos)}; tomados: ${por(tomados)}; aplicados: ${por(aplicados)}`);
console.log(`por ronda: cobros ${f(cobros)} (${(cobradas / Math.max(1, cobros)).toFixed(1)} c/u), impactos de cohete ${f(impactos)}, mareos ${f(mareos)}, choques ${f(choques)}`);
