// Catálogo de reglas de la plantilla Aventura voxel (plantillas/aventura-voxel.js, motor voxel). Contrato en ./index.js.
// Las claves son rutas de la configuración del motor (motores/voxel/config.js); la plantilla las copia ahí.
import { reglasVoxel } from './voxel-comun.js';
export const ficha = { tipo: 'Aventura', objetivo: 'Explorar las ruinas del reino perdido, bajar a la mazmorra y vencer al guardián.', recursos: ['Salud y experiencia', 'Botín de los cofres', 'Herramientas'],
  conflicto: 'Gólems de barro, chispas y el guardián de la mazmorra.', limites: 'Las regiones del reino: ruinas, torres, templos y mazmorras.', gana: 'Vences al guardián de la mazmorra (o cumples las misiones).', pierde: 'Tu salud llega a cero.' };
export function reglas() { return reglasVoxel('aventura-voxel', 'aventura-voxel'); }
