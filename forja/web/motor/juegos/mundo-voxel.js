// Catálogo de reglas de la plantilla Mundo voxel (plantillas/mundo-voxel.js, motor voxel). Contrato en ./index.js.
// Las claves son rutas de la configuración del motor (motores/voxel/config.js); la plantilla las copia ahí.
import { reglasVoxel } from './voxel-comun.js';
export const ficha = { tipo: 'Explorar', objetivo: 'Descubrir un mundo infinito que nace de una semilla: montañas, bosques, océanos, cuevas y aldeas, y construir lo que quieras.', recursos: ['Los bloques que rompes y pones', 'El tiempo del día y la noche', 'Tu alcance de 6 bloques'],
  conflicto: 'La geografía: montañas altas, cuevas oscuras, agua profunda.', limites: 'Ninguno: el mundo se genera bajo demanda mientras caminas (o el borde que elijas).', gana: 'Cumples las misiones de exploración o simplemente decides que tu mundo está listo.', pierde: 'No hay derrota en el modo libre.' };
export function reglas() { return reglasVoxel('mundo-voxel', 'mundo-voxel'); }
