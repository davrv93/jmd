// Catálogo de reglas de la plantilla Creativo voxel (plantillas/creativo-voxel.js, motor voxel). Contrato en ./index.js.
// Las claves son rutas de la configuración del motor (motores/voxel/config.js); la plantilla las copia ahí.
import { reglasVoxel } from './voxel-comun.js';
export const ficha = { tipo: 'Construir', objetivo: 'Construir lo que imagines con todos los bloques, volando y sin peligros.', recursos: ['Todos los bloques', 'Vuelo', 'Tiempo sin límite'],
  conflicto: 'Tu propia imaginación: no hay enemigos.', limites: 'El borde del mundo y la altura máxima.', gana: 'Terminas tus proyectos de construcción.', pierde: 'No se puede perder.' };
export function reglas() { return reglasVoxel('creativo-voxel', 'creativo-voxel'); }
