// Mide la dificultad sin pantalla: una «persona» manejada por la misma IA
// (con su propio nivel) contra los 3 ositos de la máquina, con 2 rescates por
// ronda que acierta con probabilidad «acierto».
//   node simular.mjs [rondas] [nivelCPU] [nivelPersona] [acierto]
import { nuevaRonda, paso, pensar, rescatar, resultado } from "./web/static/fisica.js";

const N = +(process.argv[2] || 2000), NIV = +(process.argv[3] ?? 0.5), YO = +(process.argv[4] ?? 0.5), AC = +(process.argv[5] ?? 0.7);
let semilla = 12345; // mulberry32
const azar = () => { semilla |= 0; semilla = (semilla + 0x6d2b79f5) | 0; let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const res = { gano: 0, perdio: 0, tiempo: 0 };
let dur = 0, vivo = 0, resc = 0;
for (let r = 0; r < N; r++) {
  const m = nuevaRonda(azar, NIV);
  const yo = m.osos[0];
  let rescates = 0, fin = null, tVivo = 0;
  while (!fin) {
    pensar(m, yo, 1 / 120, YO);
    const c = { x: yo.ia.mx, y: yo.ia.my, dash: yo.ia.quiere };
    yo.ia.quiere = false;
    paso(m, 1 / 120, { 0: c });
    if (yo.vivo && yo.cayendo < 0) tVivo += 1 / 120;
    for (const e of m.eventos) {
      if (e.tipo === "hundido" && e.id === 0) {
        if (rescates < 2 && azar() < AC) { rescates++; resc++; rescatar(m); } else yo.fuera = true;
      }
    }
    m.eventos.length = 0;
    fin = resultado(m, false);
  }
  res[fin]++; dur += m.t; vivo += tVivo;
}
console.log(`rondas ${N} · cpu ${NIV} · persona ${YO} · acierto ${AC}`);
console.log(`gana ${(100 * res.gano / N).toFixed(1)} % · pierde ${(100 * res.perdio / N).toFixed(1)} % · tiempo ${(100 * res.tiempo / N).toFixed(1)} %`);
console.log(`duración media ${(dur / N).toFixed(1)} s · vivo ${(vivo / N).toFixed(1)} s · rescates/ronda ${(resc / N).toFixed(2)}`);
