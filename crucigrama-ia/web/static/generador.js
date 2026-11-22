// generador.js · banco de palabras, generación determinista y validación de crucigramas.
// Módulo ES sin dependencias, válido en navegador y en Node 20+.

import { normalizarSemilla, rngDesdeSemilla } from './semilla.js';

/** Expresión que deben cumplir todas las palabras del banco y del puzzle. */
const LETRA_VALIDA = /^[A-ZÑ]$/;
const PALABRA_VALIDA = /^[A-ZÑ]{3,12}$/;

/** Intentos de barajar de nuevo cuando no se alcanza minPalabras. */
const MAX_INTENTOS = 30;

/**
 * Banco de palabras sobre Inteligencia Artificial y programación.
 * Palabras en MAYÚSCULAS, solo A-Z y Ñ (sin tildes), largo 3..12. Pistas en español.
 */
export const BANCO = [
  { palabra: 'ALGORITMO', pista: 'Secuencia de pasos para resolver un problema.' },
  { palabra: 'MODELO', pista: 'Sistema entrenado que hace predicciones.' },
  { palabra: 'DATOS', pista: 'Materia prima con la que aprende una IA.' },
  { palabra: 'RED', pista: 'Conjunto de neuronas artificiales conectadas.' },
  { palabra: 'NEURONA', pista: 'Unidad básica de una red neuronal.' },
  { palabra: 'TENSOR', pista: 'Arreglo multidimensional de números.' },
  { palabra: 'PYTHON', pista: 'Lenguaje favorito para ciencia de datos.' },
  { palabra: 'TOKEN', pista: 'Fragmento de texto que procesa un modelo de lenguaje.' },
  { palabra: 'PROMPT', pista: 'Instrucción que se le escribe a una IA.' },
  { palabra: 'ENTRENAR', pista: 'Ajustar un modelo mostrándole ejemplos.' },
  { palabra: 'GRADIENTE', pista: 'Dirección de máximo cambio de la función de pérdida.' },
  { palabra: 'PERDIDA', pista: 'Función que mide el error del modelo.' },
  { palabra: 'SESGO', pista: 'Inclinación injusta que un modelo aprende de los datos.' },
  { palabra: 'AGENTE', pista: 'IA que actúa por su cuenta para cumplir un objetivo.' },
  { palabra: 'CHATBOT', pista: 'Programa que conversa por texto.' },
  { palabra: 'TRANSFORMER', pista: 'Arquitectura detrás de los grandes modelos de lenguaje.' },
  { palabra: 'ATENCION', pista: 'Mecanismo que pondera qué partes del texto importan.' },
  { palabra: 'EMBEDDING', pista: 'Vector que representa el significado de una palabra.' },
  { palabra: 'VECTOR', pista: 'Lista ordenada de números.' },
  { palabra: 'MATRIZ', pista: 'Tabla de números con filas y columnas.' },
  { palabra: 'CAPA', pista: 'Nivel de una red neuronal profunda.' },
  { palabra: 'EPOCA', pista: 'Pasada completa por los datos de entrenamiento.' },
  { palabra: 'LOTE', pista: 'Grupo de ejemplos procesados a la vez (batch).' },
  { palabra: 'SOBREAJUSTE', pista: 'Cuando el modelo memoriza y no generaliza.' },
  { palabra: 'PRUEBA', pista: 'Conjunto de datos reservado para evaluar.' },
  { palabra: 'ETIQUETA', pista: 'Respuesta correcta asociada a un ejemplo.' },
  { palabra: 'CLUSTER', pista: 'Grupo de datos parecidos entre sí.' },
  { palabra: 'REGRESION', pista: 'Técnica para predecir un valor numérico.' },
  { palabra: 'CLASIFICAR', pista: 'Asignar una categoría a cada ejemplo.' },
  { palabra: 'INFERENCIA', pista: 'Uso del modelo ya entrenado para predecir.' },
  { palabra: 'GPU', pista: 'Chip que acelera el entrenamiento de redes.' },
  { palabra: 'NUBE', pista: 'Servidores remotos donde suele correr la IA.' },
  { palabra: 'API', pista: 'Interfaz para que los programas se comuniquen.' },
  { palabra: 'BUCLE', pista: 'Repetición de instrucciones en el código.' },
  { palabra: 'VARIABLE', pista: 'Nombre que guarda un valor en un programa.' },
  { palabra: 'FUNCION', pista: 'Bloque de código reutilizable con nombre.' },
  { palabra: 'CODIGO', pista: 'Texto que escribe un programador.' },
  { palabra: 'BIT', pista: 'Unidad mínima de información: 0 o 1.' },
  { palabra: 'BYTE', pista: 'Ocho bits.' },
  { palabra: 'ERROR', pista: 'Fallo que detiene o desvía un programa.' },
  { palabra: 'DEPURAR', pista: 'Buscar y corregir fallos en el código.' },
  { palabra: 'COMPILAR', pista: 'Traducir código fuente a lenguaje de máquina.' },
  { palabra: 'SCRIPT', pista: 'Programa corto que automatiza una tarea.' },
  { palabra: 'ROBOT', pista: 'Máquina programada para actuar sola.' },
  { palabra: 'VISION', pista: 'Rama de la IA que interpreta imágenes.' },
  { palabra: 'VOZ', pista: 'Lo que reconoce un asistente cuando le hablas.' },
  { palabra: 'TURING', pista: 'Matemático cuyo test evalúa si una máquina parece humana.' },
  { palabra: 'PERCEPTRON', pista: 'La red neuronal más simple, de una sola capa.' },
  { palabra: 'SIGMOIDE', pista: 'Función de activación con forma de S.' },
  { palabra: 'RELU', pista: 'Activación que anula los valores negativos.' },
  { palabra: 'SOFTMAX', pista: 'Convierte puntajes en probabilidades.' },
  { palabra: 'DROPOUT', pista: 'Técnica que apaga neuronas al azar para regularizar.' },
  { palabra: 'OPTIMIZADOR', pista: 'Algoritmo que actualiza los pesos (ej. Adam).' },
  { palabra: 'PESO', pista: 'Parámetro que multiplica una entrada en la neurona.' },
  { palabra: 'ARBOL', pista: 'Modelo de decisión con ramas y hojas.' },
  { palabra: 'BOSQUE', pista: 'Conjunto de árboles de decisión (random forest).' },
  { palabra: 'BAYES', pista: 'Apellido del teorema de probabilidad condicional.' },
  { palabra: 'MEMORIA', pista: 'Donde el programa guarda datos mientras corre.' },
  { palabra: 'SERVIDOR', pista: 'Computadora que atiende peticiones.' },
  { palabra: 'TERMINAL', pista: 'Ventana de texto para dar órdenes al sistema.' },
  { palabra: 'GITHUB', pista: 'Plataforma para alojar código con Git.' },
  { palabra: 'COMMIT', pista: 'Guardar un cambio en el historial de Git.' },
  { palabra: 'JSON', pista: 'Formato de texto para intercambiar datos.' },
  { palabra: 'HTML', pista: 'Lenguaje de marcado de las páginas web.' },
  { palabra: 'LENGUAJE', pista: 'Lo que procesa un LLM: natural o de programación.' },
  { palabra: 'DISEÑO', pista: 'Planificación previa de un sistema o interfaz.' },
  { palabra: 'SEÑAL', pista: 'Dato que varía en el tiempo, como el audio.' },
  { palabra: 'ENSEÑAR', pista: 'Lo que hacen los ejemplos etiquetados con el modelo.' },
  { palabra: 'ARAÑA', pista: 'Programa que recorre la web recolectando páginas.' },
  { palabra: 'CONTRASEÑA', pista: 'Clave secreta para entrar a un sistema.' },
  { palabra: 'TAMAÑO', pista: 'Cantidad de parámetros que define a un modelo grande.' },
  { palabra: 'PIXEL', pista: 'Punto mínimo de una imagen digital.' },
  { palabra: 'AUDIO', pista: 'Sonido que una IA puede transcribir.' },
  { palabra: 'TEXTO', pista: 'Entrada típica de un modelo de lenguaje.' },
  { palabra: 'IMAGEN', pista: 'Lo que genera un modelo de difusión.' },
  { palabra: 'DIFUSION', pista: 'Técnica generativa que quita ruido paso a paso.' },
  { palabra: 'RUIDO', pista: 'Perturbación aleatoria en datos o señales.' },
  { palabra: 'MUESTRA', pista: 'Un ejemplo individual del conjunto de datos.' },
  { palabra: 'HARDWARE', pista: 'Parte física de una computadora.' },
  { palabra: 'SOFTWARE', pista: 'Programas e instrucciones de una computadora.' },
  { palabra: 'KERNEL', pista: 'Núcleo del sistema operativo.' },
  { palabra: 'LINUX', pista: 'Sistema operativo libre muy usado en servidores.' },
  { palabra: 'BINARIO', pista: 'Sistema numérico de base dos.' },
  { palabra: 'ENTERO', pista: 'Número sin decimales.' },
  { palabra: 'CADENA', pista: 'Tipo de dato para texto (string).' },
  { palabra: 'LISTA', pista: 'Colección ordenada de elementos.' },
  { palabra: 'OBJETO', pista: 'Instancia de una clase.' },
  { palabra: 'CLASE', pista: 'Molde para crear objetos.' },
  { palabra: 'HERENCIA', pista: 'Cuando una clase recibe atributos de otra.' },
  { palabra: 'RECURSION', pista: 'Función que se llama a sí misma.' },
  { palabra: 'PILA', pista: 'Estructura donde el último en entrar es el primero en salir.' },
  { palabra: 'COLA', pista: 'Estructura donde el primero en entrar es el primero en salir.' },
  { palabra: 'GRAFO', pista: 'Nodos unidos por aristas.' },
  { palabra: 'NODO', pista: 'Elemento de un grafo o de un árbol.' },
  { palabra: 'HASH', pista: 'Huella digital de largo fijo de un dato.' },
  { palabra: 'CACHE', pista: 'Memoria rápida que guarda resultados recientes.' },
  { palabra: 'LATENCIA', pista: 'Tiempo de espera hasta recibir una respuesta.' },
  { palabra: 'SINTAXIS', pista: 'Reglas de escritura de un lenguaje.' },
];

// ---------------------------------------------------------------------------
// Utilidades internas
// ---------------------------------------------------------------------------

/** Clave de una celda en la grilla virtual (coordenadas pueden ser negativas). */
function clave(fila, col) {
  return fila + ',' + col;
}

/** Baraja una copia del arreglo (Fisher-Yates) usando el rng dado. */
function barajar(arreglo, rng) {
  const copia = arreglo.slice();
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const aux = copia[i];
    copia[i] = copia[j];
    copia[j] = aux;
  }
  return copia;
}

/** Convierte una opción a entero dentro de [minimo, maximo], con valor por defecto. */
function enteroEnRango(valor, porDefecto, minimo, maximo) {
  const n = Number.isFinite(valor) ? Math.floor(valor) : porDefecto;
  return Math.min(maximo, Math.max(minimo, n));
}

/**
 * Grilla virtual de tamaño ilimitado que registra, por celda, la letra y a qué
 * direcciones (H/V) pertenece. Mantiene el bounding box de lo colocado.
 */
class GrillaVirtual {
  constructor(filasMax, columnasMax) {
    this.celdas = new Map();
    this.filasMax = filasMax;
    this.columnasMax = columnasMax;
    this.minF = Infinity;
    this.maxF = -Infinity;
    this.minC = Infinity;
    this.maxC = -Infinity;
  }

  obtener(fila, col) {
    return this.celdas.get(clave(fila, col));
  }

  ocupada(fila, col) {
    return this.celdas.has(clave(fila, col));
  }

  /** ¿Cabe el segmento dado dentro del bounding box máximo permitido? */
  cabe(fila, col, dir, largo) {
    const finF = dir === 'V' ? fila + largo - 1 : fila;
    const finC = dir === 'H' ? col + largo - 1 : col;
    const minF = Math.min(this.minF, fila);
    const maxF = Math.max(this.maxF, finF);
    const minC = Math.min(this.minC, col);
    const maxC = Math.max(this.maxC, finC);
    return maxF - minF + 1 <= this.filasMax && maxC - minC + 1 <= this.columnasMax;
  }

  /**
   * Evalúa si la palabra puede colocarse en (fila, col) con dirección dir.
   * Devuelve la cantidad de cruces o -1 si no es válida.
   */
  evaluar(palabra, fila, col, dir, exigirCruce) {
    const largo = palabra.length;
    if (!this.cabe(fila, col, dir, largo)) return -1;
    const dF = dir === 'V' ? 1 : 0;
    const dC = dir === 'H' ? 1 : 0;

    // Celda anterior al inicio y posterior al fin deben estar libres.
    if (this.ocupada(fila - dF, col - dC)) return -1;
    if (this.ocupada(fila + dF * largo, col + dC * largo)) return -1;

    let cruces = 0;
    for (let i = 0; i < largo; i++) {
      const f = fila + dF * i;
      const c = col + dC * i;
      const celda = this.obtener(f, c);
      if (celda) {
        // Cruce: misma letra y la celda no puede pertenecer ya a una palabra en esta dirección.
        if (celda.letra !== palabra[i]) return -1;
        if (celda[dir]) return -1;
        cruces++;
      } else {
        // Celda nueva: sin vecinos laterales ocupados (evita secuencias no declaradas).
        if (this.ocupada(f - dC, c - dF)) return -1;
        if (this.ocupada(f + dC, c + dF)) return -1;
      }
    }
    if (exigirCruce && cruces === 0) return -1;
    return cruces;
  }

  /** Escribe la palabra en la grilla (se asume ya evaluada como válida). */
  colocar(palabra, fila, col, dir) {
    const dF = dir === 'V' ? 1 : 0;
    const dC = dir === 'H' ? 1 : 0;
    for (let i = 0; i < palabra.length; i++) {
      const f = fila + dF * i;
      const c = col + dC * i;
      const k = clave(f, c);
      let celda = this.celdas.get(k);
      if (!celda) {
        celda = { letra: palabra[i], H: false, V: false, fila: f, col: c };
        this.celdas.set(k, celda);
      }
      celda[dir] = true;
      if (f < this.minF) this.minF = f;
      if (f > this.maxF) this.maxF = f;
      if (c < this.minC) this.minC = c;
      if (c > this.maxC) this.maxC = c;
    }
  }

  /** Todas las posiciones válidas de la palabra cruzando alguna celda existente. */
  posiciones(palabra) {
    const vistas = new Set();
    const resultado = [];
    for (const celda of this.celdas.values()) {
      for (let i = 0; i < palabra.length; i++) {
        if (palabra[i] !== celda.letra) continue;
        // Si la celda ya es vertical, la nueva palabra debe ir horizontal y viceversa.
        const dir = celda.V && !celda.H ? 'H' : (celda.H && !celda.V ? 'V' : null);
        if (!dir) continue;
        const fila = dir === 'H' ? celda.fila : celda.fila - i;
        const col = dir === 'H' ? celda.col - i : celda.col;
        const k = dir + ':' + clave(fila, col);
        if (vistas.has(k)) continue;
        vistas.add(k);
        const cruces = this.evaluar(palabra, fila, col, dir, true);
        if (cruces > 0) resultado.push({ fila, col, dir, cruces });
      }
    }
    return resultado;
  }
}

/**
 * Un intento de armado: baraja el banco y coloca palabras con el algoritmo voraz.
 * Devuelve la lista de palabras colocadas (coordenadas virtuales) y la grilla.
 */
function intentarArmado(rng, opciones) {
  const { filas, columnas, maxPalabras } = opciones;
  const ladoMayor = Math.max(filas, columnas);
  const baraja = barajar(BANCO, rng).filter((e) => e.palabra.length <= ladoMayor);
  const grilla = new GrillaVirtual(filas, columnas);
  const colocadas = [];
  if (baraja.length === 0) return { colocadas, grilla };

  // Primera palabra: la más larga entre las primeras candidatas que entre en horizontal.
  const ventana = baraja.slice(0, Math.max(1, maxPalabras)).filter((e) => e.palabra.length <= columnas);
  const universo = ventana.length > 0 ? ventana : baraja.filter((e) => e.palabra.length <= columnas);
  if (universo.length === 0) return { colocadas, grilla };
  let primera = universo[0];
  for (const e of universo) if (e.palabra.length > primera.palabra.length) primera = e;

  grilla.colocar(primera.palabra, 0, 0, 'H');
  colocadas.push({ palabra: primera.palabra, pista: primera.pista, fila: 0, col: 0, dir: 'H' });
  let candidatas = baraja.filter((e) => e !== primera);

  // Pasadas sucesivas: cada candidata se coloca en su mejor cruce disponible.
  let progreso = true;
  while (progreso && colocadas.length < maxPalabras && candidatas.length > 0) {
    progreso = false;
    const restantes = [];
    for (const candidata of candidatas) {
      if (colocadas.length >= maxPalabras) {
        restantes.push(candidata);
        continue;
      }
      const posiciones = grilla.posiciones(candidata.palabra);
      if (posiciones.length === 0) {
        restantes.push(candidata);
        continue;
      }
      let mejorPuntaje = -1;
      for (const p of posiciones) if (p.cruces > mejorPuntaje) mejorPuntaje = p.cruces;
      const mejores = posiciones.filter((p) => p.cruces === mejorPuntaje);
      // Desempate determinista con el rng (nunca Math.random).
      const elegida = mejores[Math.floor(rng() * mejores.length)];
      grilla.colocar(candidata.palabra, elegida.fila, elegida.col, elegida.dir);
      colocadas.push({
        palabra: candidata.palabra,
        pista: candidata.pista,
        fila: elegida.fila,
        col: elegida.col,
        dir: elegida.dir,
      });
      progreso = true;
    }
    candidatas = restantes;
  }
  return { colocadas, grilla };
}

/**
 * Recorta al bounding box, centra en filas×columnas, numera al estilo crucigrama
 * y arma el objeto final del puzzle.
 */
function armarPuzzle(semilla, opciones, colocadas, grilla) {
  const { filas, columnas } = opciones;
  const celdas = [];
  for (let f = 0; f < filas; f++) celdas.push(new Array(columnas).fill(null));

  if (colocadas.length === 0) {
    return { semilla, filas, columnas, celdas, palabras: [] };
  }

  const alto = grilla.maxF - grilla.minF + 1;
  const ancho = grilla.maxC - grilla.minC + 1;
  const desplF = Math.floor((filas - alto) / 2) - grilla.minF;
  const desplC = Math.floor((columnas - ancho) / 2) - grilla.minC;

  for (const celda of grilla.celdas.values()) {
    celdas[celda.fila + desplF][celda.col + desplC] = celda.letra;
  }

  // Índice de inicios: clave → palabras que empiezan ahí.
  const inicios = new Map();
  for (const p of colocadas) {
    const fila = p.fila + desplF;
    const col = p.col + desplC;
    const k = clave(fila, col);
    if (!inicios.has(k)) inicios.set(k, []);
    inicios.get(k).push({ ...p, fila, col });
  }

  const palabras = [];
  let numero = 0;
  for (let f = 0; f < filas; f++) {
    for (let c = 0; c < columnas; c++) {
      const lista = inicios.get(clave(f, c));
      if (!lista) continue;
      numero++;
      // H antes de V cuando comparten celda de inicio.
      lista.sort((a, b) => (a.dir === b.dir ? 0 : a.dir === 'H' ? -1 : 1));
      for (const p of lista) {
        palabras.push({
          id: p.dir.toLowerCase() + numero,
          numero,
          palabra: p.palabra,
          pista: p.pista,
          fila: p.fila,
          col: p.col,
          dir: p.dir,
          largo: p.palabra.length,
        });
      }
    }
  }

  return { semilla, filas, columnas, celdas, palabras };
}

/**
 * Genera un crucigrama determinista a partir de una semilla.
 * opciones: { filas = 13, columnas = 13, maxPalabras = 10, minPalabras = 6 }
 */
export function generarCrucigrama(semilla, opciones = {}) {
  const semillaNormal = normalizarSemilla(semilla);
  const filas = enteroEnRango(opciones.filas, 13, 3, 60);
  const columnas = enteroEnRango(opciones.columnas, 13, 3, 60);
  const maxPalabras = enteroEnRango(opciones.maxPalabras, 10, 1, BANCO.length);
  const minPalabras = enteroEnRango(opciones.minPalabras, 6, 1, maxPalabras);
  const config = { filas, columnas, maxPalabras, minPalabras };

  const rng = rngDesdeSemilla(semillaNormal);
  let mejor = null;
  for (let intento = 0; intento < MAX_INTENTOS; intento++) {
    const resultado = intentarArmado(rng, config);
    if (!mejor || resultado.colocadas.length > mejor.colocadas.length) mejor = resultado;
    if (resultado.colocadas.length >= minPalabras) break;
  }
  return armarPuzzle(semillaNormal, config, mejor.colocadas, mejor.grilla);
}

// ---------------------------------------------------------------------------
// Validación
// ---------------------------------------------------------------------------

/**
 * Valida la consistencia de un puzzle: letras válidas, celdas acordes a las palabras,
 * sin secuencias no declaradas, sin duplicados, todo conectado y numeración correcta.
 * Devuelve { ok, errores }.
 */
export function validarCrucigrama(puzzle) {
  const errores = [];
  const agregar = (msg) => errores.push(msg);

  if (!puzzle || typeof puzzle !== 'object') {
    return { ok: false, errores: ['El puzzle no es un objeto.'] };
  }
  const { filas, columnas, celdas, palabras } = puzzle;
  if (!Number.isInteger(filas) || filas < 1) agregar('filas debe ser un entero positivo.');
  if (!Number.isInteger(columnas) || columnas < 1) agregar('columnas debe ser un entero positivo.');
  if (!Array.isArray(celdas)) agregar('celdas debe ser un arreglo.');
  if (!Array.isArray(palabras)) agregar('palabras debe ser un arreglo.');
  if (errores.length > 0) return { ok: false, errores };

  // 1. Forma de la grilla y letras válidas.
  if (celdas.length !== filas) agregar(`celdas tiene ${celdas.length} filas y se esperaban ${filas}.`);
  for (let f = 0; f < celdas.length; f++) {
    const fila = celdas[f];
    if (!Array.isArray(fila) || fila.length !== columnas) {
      agregar(`La fila ${f} no tiene ${columnas} columnas.`);
      continue;
    }
    for (let c = 0; c < fila.length; c++) {
      const v = fila[c];
      if (v !== null && !(typeof v === 'string' && LETRA_VALIDA.test(v))) {
        agregar(`Letra inválida en (${f},${c}): ${JSON.stringify(v)}.`);
      }
    }
  }
  if (errores.length > 0) return { ok: false, errores };

  const letraEn = (f, c) =>
    f >= 0 && f < filas && c >= 0 && c < columnas ? celdas[f][c] : null;

  // 2. Cada palabra: forma, rango, letras coincidentes, extremos libres.
  const declaradas = new Set(); // 'H:f,c:largo'
  const textos = new Set();
  const ids = new Set();
  const cubiertas = new Set(); // celdas cubiertas por alguna palabra
  for (let i = 0; i < palabras.length; i++) {
    const p = palabras[i];
    const ref = p && p.id ? p.id : `#${i}`;
    if (!p || typeof p !== 'object') {
      agregar(`La palabra ${ref} no es un objeto.`);
      continue;
    }
    if (typeof p.palabra !== 'string' || !PALABRA_VALIDA.test(p.palabra)) {
      agregar(`La palabra ${ref} tiene texto inválido: ${JSON.stringify(p.palabra)}.`);
      continue;
    }
    if (p.dir !== 'H' && p.dir !== 'V') {
      agregar(`La palabra ${ref} tiene dirección inválida: ${JSON.stringify(p.dir)}.`);
      continue;
    }
    if (!Number.isInteger(p.fila) || !Number.isInteger(p.col)) {
      agregar(`La palabra ${ref} tiene coordenadas inválidas.`);
      continue;
    }
    if (p.largo !== p.palabra.length) {
      agregar(`La palabra ${ref} declara largo ${p.largo} pero tiene ${p.palabra.length} letras.`);
    }
    if (typeof p.pista !== 'string' || p.pista.trim() === '') {
      agregar(`La palabra ${ref} no tiene pista.`);
    }
    if (textos.has(p.palabra)) agregar(`Palabra duplicada: ${p.palabra}.`);
    textos.add(p.palabra);
    if (typeof p.id === 'string') {
      if (ids.has(p.id)) agregar(`Id duplicado: ${p.id}.`);
      ids.add(p.id);
    }

    const dF = p.dir === 'V' ? 1 : 0;
    const dC = p.dir === 'H' ? 1 : 0;
    const largo = p.palabra.length;
    const finF = p.fila + dF * (largo - 1);
    const finC = p.col + dC * (largo - 1);
    if (p.fila < 0 || p.col < 0 || finF >= filas || finC >= columnas) {
      agregar(`La palabra ${ref} se sale de la grilla.`);
      continue;
    }
    for (let k = 0; k < largo; k++) {
      const f = p.fila + dF * k;
      const c = p.col + dC * k;
      if (celdas[f][c] !== p.palabra[k]) {
        agregar(`La palabra ${ref} no coincide con la celda (${f},${c}): '${celdas[f][c]}' ≠ '${p.palabra[k]}'.`);
      }
      cubiertas.add(clave(f, c));
    }
    if (letraEn(p.fila - dF, p.col - dC) !== null || letraEn(finF + dF, finC + dC) !== null) {
      agregar(`La palabra ${ref} está pegada a otra letra en su mismo eje.`);
    }
    declaradas.add(p.dir + ':' + clave(p.fila, p.col) + ':' + largo);
  }

  // 3. Secuencias contiguas de ≥2 letras no declaradas (H y V) y letras sueltas.
  const encontradas = new Set();
  const recorrer = (dir) => {
    const dF = dir === 'V' ? 1 : 0;
    const dC = dir === 'H' ? 1 : 0;
    const lineas = dir === 'H' ? filas : columnas;
    const largoLinea = dir === 'H' ? columnas : filas;
    for (let l = 0; l < lineas; l++) {
      let k = 0;
      while (k < largoLinea) {
        const f0 = dir === 'H' ? l : k;
        const c0 = dir === 'H' ? k : l;
        if (celdas[f0][c0] === null) {
          k++;
          continue;
        }
        let largo = 0;
        let texto = '';
        while (k + largo < largoLinea) {
          const f = f0 + dF * largo;
          const c = c0 + dC * largo;
          if (celdas[f][c] === null) break;
          texto += celdas[f][c];
          largo++;
        }
        if (largo >= 2) {
          const k2 = dir + ':' + clave(f0, c0) + ':' + largo;
          encontradas.add(k2);
          if (!declaradas.has(k2)) {
            agregar(`Secuencia ${dir} no declarada en (${f0},${c0}): ${texto}.`);
          }
        }
        k += largo;
      }
    }
  };
  recorrer('H');
  recorrer('V');
  for (const d of declaradas) {
    if (!encontradas.has(d)) agregar(`La palabra declarada ${d} no corresponde a una secuencia completa de la grilla.`);
  }
  for (let f = 0; f < filas; f++) {
    for (let c = 0; c < columnas; c++) {
      if (celdas[f][c] !== null && !cubiertas.has(clave(f, c))) {
        agregar(`Letra suelta en (${f},${c}) sin palabra que la cubra.`);
      }
    }
  }

  // 4. Conectividad: grafo de palabras unidas por celdas compartidas.
  const validas = palabras.filter(
    (p) => p && typeof p.palabra === 'string' && (p.dir === 'H' || p.dir === 'V') &&
      Number.isInteger(p.fila) && Number.isInteger(p.col),
  );
  if (validas.length > 1) {
    const porCelda = new Map();
    validas.forEach((p, idx) => {
      const dF = p.dir === 'V' ? 1 : 0;
      const dC = p.dir === 'H' ? 1 : 0;
      for (let k = 0; k < p.palabra.length; k++) {
        const kc = clave(p.fila + dF * k, p.col + dC * k);
        if (!porCelda.has(kc)) porCelda.set(kc, []);
        porCelda.get(kc).push(idx);
      }
    });
    const visitados = new Set([0]);
    const pila = [0];
    while (pila.length > 0) {
      const actual = validas[pila.pop()];
      const dF = actual.dir === 'V' ? 1 : 0;
      const dC = actual.dir === 'H' ? 1 : 0;
      for (let k = 0; k < actual.palabra.length; k++) {
        const vecinos = porCelda.get(clave(actual.fila + dF * k, actual.col + dC * k)) || [];
        for (const v of vecinos) {
          if (!visitados.has(v)) {
            visitados.add(v);
            pila.push(v);
          }
        }
      }
    }
    if (visitados.size !== validas.length) {
      const sueltas = validas.filter((_, idx) => !visitados.has(idx)).map((p) => p.palabra);
      agregar(`Palabras desconectadas del resto: ${sueltas.join(', ')}.`);
    }
  }

  // 5. Numeración estilo crucigrama y orden del arreglo.
  if (validas.length === palabras.length) {
    const iniciosOrdenados = [...new Set(palabras.map((p) => clave(p.fila, p.col)))]
      .map((k) => k.split(',').map(Number))
      .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const numeroEsperado = new Map();
    iniciosOrdenados.forEach(([f, c], idx) => numeroEsperado.set(clave(f, c), idx + 1));
    for (const p of palabras) {
      const esperado = numeroEsperado.get(clave(p.fila, p.col));
      if (p.numero !== esperado) {
        agregar(`La palabra ${p.palabra} tiene número ${p.numero} y se esperaba ${esperado}.`);
      }
      const idEsperado = p.dir.toLowerCase() + esperado;
      if (p.id !== idEsperado) {
        agregar(`La palabra ${p.palabra} tiene id ${JSON.stringify(p.id)} y se esperaba '${idEsperado}'.`);
      }
    }
    for (let i = 1; i < palabras.length; i++) {
      const a = palabras[i - 1];
      const b = palabras[i];
      const ordenOk = a.numero < b.numero || (a.numero === b.numero && a.dir === 'H' && b.dir === 'V');
      if (!ordenOk) {
        agregar(`Orden incorrecto en palabras: ${a.id} debe ir después de ${b.id}.`);
        break;
      }
    }
  }

  return { ok: errores.length === 0, errores };
}
