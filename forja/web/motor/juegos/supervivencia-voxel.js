// Catálogo de reglas de la plantilla Supervivencia voxel (plantillas/supervivencia-voxel.js, motor voxel). Contrato en ./index.js.
// Las claves son rutas de la configuración del motor (motores/voxel/config.js); la plantilla las copia ahí.
import { reglasVoxel } from './voxel-comun.js';
export const ficha = { tipo: 'Sobrevivir', objetivo: 'Recolectar, fabricar herramientas y refugiarte antes de que caiga la noche.', recursos: ['Salud, hambre y resistencia', 'Inventario y herramientas que se gastan', 'Minerales: carbón, hierro, oro y cristales'],
  conflicto: 'Hambre, caídas, lava y criaturas hostiles que salen de noche.', limites: 'Tus fuerzas y la luz del día.', gana: 'Cumples las misiones de supervivencia.', pierde: 'Tu salud llega a cero (reapareces o pierdes, según tus reglas).' };
export function reglas() { return reglasVoxel('supervivencia-voxel', 'supervivencia-voxel'); }
