// Reglas que comparten todas las plantillas (las lee plantillas/comun.js o cada plantilla con la misma clave).
import { clave } from './index.js';
export const tamanoHeroe = (p) => clave(p, 'jugadores', 'Tu héroe', 'jugador.tamano', 'Tamaño del héroe', [
  ['chico', 'Pequeño', 0.8, 'Más fácil de esquivar'], ['normal', 'Normal', 1, '', true], ['grande', 'Grande', 1.2, 'Más fácil de ver, más fácil de tocar']], { simple: true });
export const inmunidad = (p, def) => clave(p, 'jugadores', 'Tu héroe', 'jugador.inmunidad', 'Invencible tras un golpe', [
  ['corta', 'Medio segundo', 0.6], ['normal', `${String(def).replace('.', ',')} s`, def, '', true], ['larga', '2,5 segundos', 2.5, 'Más tiempo para escapar']]);
export const vidas = (p, def = 3, simple = true) => clave(p, 'recursos', 'Vidas', 'vidas.inicio', 'Vidas al empezar', [1, 2, 3, 5, 9].map((n) => [`v${n}`, `${n}`, n, n === 1 ? 'Sin margen de error' : '', n === def]), { simple });
