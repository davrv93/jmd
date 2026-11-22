// Crucigrama IA · tablero.js
// UI del tablero y de las pistas. Las funciones puras (sin DOM) van primero y se
// exportan para poder probarlas con Node; `document` solo se toca dentro de montarTablero.

export const LETRA_VALIDA = /^[A-ZÑ]$/;

/** Devuelve la última letra válida (A-Z/Ñ) de un texto, en mayúscula, o ''. */
export function normalizarLetra(texto) {
  if (texto == null) return '';
  const mayus = String(texto).toUpperCase();
  for (let i = mayus.length - 1; i >= 0; i--) {
    if (LETRA_VALIDA.test(mayus[i])) return mayus[i];
  }
  return '';
}

/** Coordenadas de cada celda de una palabra, en orden. */
export function celdasDePalabra(palabra) {
  const celdas = [];
  for (let k = 0; k < palabra.largo; k++) {
    celdas.push(palabra.dir === 'H'
      ? { fila: palabra.fila, col: palabra.col + k }
      : { fila: palabra.fila + k, col: palabra.col });
  }
  return celdas;
}

/** Celda blanca = letra distinta de null. */
export function esBlanca(puzzle, fila, col) {
  if (fila < 0 || col < 0 || fila >= puzzle.filas || col >= puzzle.columnas) return false;
  return puzzle.celdas[fila][col] != null;
}

/** Matriz de respuestas vacía: '' en blancas, null en negras. */
export function respuestasVacias(puzzle) {
  return puzzle.celdas.map(fila => fila.map(l => (l == null ? null : '')));
}

/** Palabra que pasa por (fila, col) en la dirección dada, o null. */
export function palabraEn(puzzle, fila, col, dir) {
  return puzzle.palabras.find(p => {
    if (p.dir !== dir) return false;
    if (dir === 'H') return p.fila === fila && col >= p.col && col < p.col + p.largo;
    return p.col === col && fila >= p.fila && fila < p.fila + p.largo;
  }) || null;
}

/**
 * Siguiente celda blanca en la dirección dir ('H'|'V'), avanzando `paso` (+1 o -1).
 * Salta celdas negras; devuelve null si se acaba la grilla.
 */
export function siguienteCelda(puzzle, fila, col, dir, paso = 1) {
  const df = dir === 'V' ? paso : 0;
  const dc = dir === 'H' ? paso : 0;
  let f = fila + df, c = col + dc;
  while (f >= 0 && c >= 0 && f < puzzle.filas && c < puzzle.columnas) {
    if (puzzle.celdas[f][c] != null) return { fila: f, col: c };
    f += df; c += dc;
  }
  return null;
}

/** Siguiente palabra en el orden de puzzle.palabras (circular). paso = +1 o -1. */
export function siguientePalabra(puzzle, id, paso = 1) {
  const n = puzzle.palabras.length;
  if (!n) return null;
  const i = puzzle.palabras.findIndex(p => p.id === id);
  if (i < 0) return puzzle.palabras[0];
  return puzzle.palabras[((i + paso) % n + n) % n];
}

/** Primera celda vacía de la palabra según respuestas, o su primera celda si está llena. */
export function primeraCeldaVacia(palabra, respuestas) {
  const celdas = celdasDePalabra(palabra);
  return celdas.find(({ fila, col }) => !respuestas[fila][col]) || celdas[0];
}

/** Estado del juego a partir de la matriz de respuestas. */
export function calcularEstado(puzzle, respuestas) {
  let total = 0, llenas = 0, correctas = 0, incorrectas = 0;
  for (let f = 0; f < puzzle.filas; f++) {
    for (let c = 0; c < puzzle.columnas; c++) {
      const sol = puzzle.celdas[f][c];
      if (sol == null) continue;
      total++;
      const r = respuestas[f]?.[c] || '';
      if (!r) continue;
      llenas++;
      if (r === sol) correctas++; else incorrectas++;
    }
  }
  const porPalabra = {};
  for (const p of puzzle.palabras) {
    let completa = true, bien = true;
    for (const { fila, col } of celdasDePalabra(p)) {
      const r = respuestas[fila]?.[col] || '';
      if (!r) completa = false;
      if (r !== puzzle.celdas[fila][col]) bien = false;
    }
    porPalabra[p.id] = !completa ? 'incompleta' : bien ? 'ok' : 'mal';
  }
  return {
    total, llenas, correctas, incorrectas,
    completo: total > 0 && llenas === total,
    perfecto: total > 0 && correctas === total,
    porPalabra,
  };
}

// ---------------------------------------------------------------------------
// UI
// ---------------------------------------------------------------------------

const FLECHAS = { ArrowLeft: ['H', -1], ArrowRight: ['H', 1], ArrowUp: ['V', -1], ArrowDown: ['V', 1] };

/**
 * Monta el tablero y las pistas dentro de los contenedores.
 * @param {{tablero: HTMLElement, pistas: HTMLElement}} contenedores
 * @param {object} puzzle  salida de generarCrucigrama
 * @param {{onCambio?: (estado) => void}} opciones
 */
export function montarTablero(contenedores, puzzle, opciones = {}) {
  const { tablero: contTablero, pistas: contPistas } = contenedores;
  const onCambio = typeof opciones.onCambio === 'function' ? opciones.onCambio : () => {};
  const doc = contTablero.ownerDocument || document;

  const respuestas = respuestasVacias(puzzle);
  const inputs = puzzle.celdas.map(fila => fila.map(() => null));   // input por celda (null en negras)
  const celdasEl = puzzle.celdas.map(fila => fila.map(() => null)); // div.celda por celda
  const pistasEl = new Map();                                        // id → li.pista
  let activa = null;        // { fila, col }
  let dir = 'H';
  let bloqueado = false;

  // ----- grilla -----
  const grilla = doc.createElement('div');
  grilla.className = 'grilla';
  grilla.style.setProperty('--n', puzzle.columnas);
  grilla.setAttribute('role', 'grid');
  grilla.setAttribute('aria-label', `Crucigrama de ${puzzle.filas} por ${puzzle.columnas}`);

  const numeroDe = new Map(); // "f,c" → numero
  for (const p of puzzle.palabras) numeroDe.set(`${p.fila},${p.col}`, p.numero);

  for (let f = 0; f < puzzle.filas; f++) {
    for (let c = 0; c < puzzle.columnas; c++) {
      const celda = doc.createElement('div');
      celda.className = 'celda';
      celda.dataset.fila = f;
      celda.dataset.col = c;
      celdasEl[f][c] = celda;
      if (puzzle.celdas[f][c] == null) {
        celda.classList.add('negra');
        celda.setAttribute('aria-hidden', 'true');
      } else {
        celda.setAttribute('role', 'gridcell');
        const num = numeroDe.get(`${f},${c}`);
        if (num != null) {
          const span = doc.createElement('span');
          span.className = 'numero';
          span.textContent = num;
          span.setAttribute('aria-hidden', 'true');
          celda.appendChild(span);
        }
        const input = doc.createElement('input');
        input.type = 'text';
        input.maxLength = 1;
        input.setAttribute('maxlength', '1');
        input.setAttribute('inputmode', 'text');
        input.setAttribute('autocapitalize', 'characters');
        input.setAttribute('autocomplete', 'off');
        input.setAttribute('autocorrect', 'off');
        input.setAttribute('spellcheck', 'false');
        input.setAttribute('enterkeyhint', 'next');
        input.setAttribute('aria-label', `Fila ${f + 1}, columna ${c + 1}`);
        input.dataset.fila = f;
        input.dataset.col = c;
        inputs[f][c] = input;
        celda.appendChild(input);
      }
      grilla.appendChild(celda);
    }
  }
  contTablero.innerHTML = '';
  contTablero.appendChild(grilla);

  // ----- pistas -----
  const pistas = doc.createElement('div');
  pistas.className = 'pistas';
  for (const [d, titulo] of [['H', 'Horizontales'], ['V', 'Verticales']]) {
    const lista = puzzle.palabras.filter(p => p.dir === d);
    if (!lista.length) continue;
    const sec = doc.createElement('section');
    sec.className = `pistas-${d.toLowerCase()}`;
    const h3 = doc.createElement('h3');
    h3.textContent = titulo;
    sec.appendChild(h3);
    const ol = doc.createElement('ol');
    for (const p of lista) {
      const li = doc.createElement('li');
      li.className = 'pista';
      li.dataset.id = p.id;
      li.setAttribute('role', 'button');
      li.tabIndex = 0;
      const b = doc.createElement('b');
      b.textContent = `${p.numero}.`;
      li.appendChild(b);
      li.appendChild(doc.createTextNode(' '));
      const span = doc.createElement('span');
      span.textContent = `${p.pista} (${p.largo})`;
      li.appendChild(span);
      li.addEventListener('click', () => irAPalabra(p));
      li.addEventListener('keydown', ev => {
        if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); irAPalabra(p); }
      });
      pistasEl.set(p.id, li);
      ol.appendChild(li);
    }
    sec.appendChild(ol);
    pistas.appendChild(sec);
  }
  contPistas.innerHTML = '';
  contPistas.appendChild(pistas);

  // ----- helpers de estado visual -----
  function palabraActiva() {
    return activa ? palabraEn(puzzle, activa.fila, activa.col, dir) : null;
  }

  function pintarResaltado() {
    for (let f = 0; f < puzzle.filas; f++) {
      for (let c = 0; c < puzzle.columnas; c++) {
        const el = celdasEl[f][c];
        if (el) el.classList.remove('activa', 'en-palabra');
      }
    }
    for (const li of pistasEl.values()) li.classList.remove('activa');
    if (!activa) return;
    const p = palabraActiva();
    if (p) {
      for (const { fila, col } of celdasDePalabra(p)) celdasEl[fila][col].classList.add('en-palabra');
      const li = pistasEl.get(p.id);
      if (li) {
        li.classList.add('activa');
        if (typeof li.scrollIntoView === 'function') {
          try { li.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch { /* sin scroll */ }
        }
      }
    }
    celdasEl[activa.fila][activa.col].classList.add('activa');
  }

  function pintarPistasOk(est) {
    for (const [id, li] of pistasEl) li.classList.toggle('ok', est.porPalabra[id] === 'ok');
  }

  function estado() {
    return calcularEstado(puzzle, respuestas);
  }

  function notificar() {
    const est = estado();
    pintarPistasOk(est);
    onCambio(est);
    return est;
  }

  // ----- navegación -----
  function activar(fila, col, nuevaDir) {
    if (!esBlanca(puzzle, fila, col)) return;
    if (nuevaDir) dir = nuevaDir;
    // Si en la dirección actual no hay palabra pero en la otra sí, cambia.
    if (!palabraEn(puzzle, fila, col, dir)) {
      const otra = dir === 'H' ? 'V' : 'H';
      if (palabraEn(puzzle, fila, col, otra)) dir = otra;
    }
    activa = { fila, col };
    pintarResaltado();
  }

  function enfocar(fila, col, nuevaDir) {
    activar(fila, col, nuevaDir);
    const input = inputs[fila]?.[col];
    if (input && !bloqueado) {
      input.focus({ preventScroll: true });
      try { input.setSelectionRange(0, input.value.length); } catch { /* algunos navegadores */ }
    }
  }

  function alternarDireccion() {
    if (!activa) return;
    const otra = dir === 'H' ? 'V' : 'H';
    if (palabraEn(puzzle, activa.fila, activa.col, otra)) {
      dir = otra;
      pintarResaltado();
    }
  }

  function irAPalabra(p) {
    if (!p) return;
    const { fila, col } = primeraCeldaVacia(p, respuestas);
    enfocar(fila, col, p.dir);
  }

  function saltarPalabra(paso) {
    const actual = palabraActiva();
    const sig = siguientePalabra(puzzle, actual ? actual.id : null, paso);
    irAPalabra(sig);
  }

  /** Avanza (o retrocede) dentro de la palabra activa; si no hay palabra, por la grilla. */
  function moverEnPalabra(paso) {
    if (!activa) return;
    const p = palabraActiva();
    if (p) {
      const celdas = celdasDePalabra(p);
      const i = celdas.findIndex(x => x.fila === activa.fila && x.col === activa.col);
      const j = i + paso;
      if (j >= 0 && j < celdas.length) enfocar(celdas[j].fila, celdas[j].col);
      return;
    }
    const sig = siguienteCelda(puzzle, activa.fila, activa.col, dir, paso);
    if (sig) enfocar(sig.fila, sig.col);
  }

  // ----- escritura -----
  function ponerLetra(fila, col, letra) {
    respuestas[fila][col] = letra;
    const input = inputs[fila][col];
    if (input.value !== letra) input.value = letra;
    celdasEl[fila][col].classList.remove('ok', 'mal');
  }

  function escribir(letra) {
    if (!activa || bloqueado) return;
    const l = normalizarLetra(letra);
    if (!l) {
      // Reimpone el valor previo si entró basura.
      inputs[activa.fila][activa.col].value = respuestas[activa.fila][activa.col];
      return;
    }
    ponerLetra(activa.fila, activa.col, l);
    notificar();
    moverEnPalabra(1);
  }

  function borrar(retroceder) {
    if (!activa || bloqueado) return;
    const { fila, col } = activa;
    if (respuestas[fila][col]) {
      ponerLetra(fila, col, '');
      notificar();
      if (retroceder) moverEnPalabra(-1);
    } else if (retroceder) {
      moverEnPalabra(-1);
      if (respuestas[activa.fila][activa.col]) {
        ponerLetra(activa.fila, activa.col, '');
        notificar();
      }
    }
  }

  // ----- eventos -----
  grilla.addEventListener('keydown', ev => {
    const input = ev.target;
    if (!input || input.tagName !== 'INPUT') return;
    const fila = +input.dataset.fila, col = +input.dataset.col;
    if (!activa || activa.fila !== fila || activa.col !== col) activar(fila, col);
    if (ev.isComposing || ev.keyCode === 229) return; // IME en curso: lo resuelve `input`/`compositionend`

    if (ev.key in FLECHAS) {
      ev.preventDefault();
      const [eje, paso] = FLECHAS[ev.key];
      const destino = siguienteCelda(puzzle, fila, col, eje, paso);
      if (eje !== dir) {
        // Flecha perpendicular: cambia la dirección si la celda tiene palabra en ese eje.
        if (palabraEn(puzzle, fila, col, eje)) {
          dir = eje;
          if (destino && palabraEn(puzzle, destino.fila, destino.col, eje)) enfocar(destino.fila, destino.col, eje);
          else pintarResaltado();
          return;
        }
      }
      if (destino) enfocar(destino.fila, destino.col);
      return;
    }
    if (ev.key === 'Tab' || ev.key === 'Enter') {
      ev.preventDefault();
      saltarPalabra(ev.shiftKey ? -1 : 1);
      return;
    }
    if (ev.key === 'Backspace') { ev.preventDefault(); borrar(true); return; }
    if (ev.key === 'Delete') { ev.preventDefault(); borrar(false); return; }
    if (ev.key === ' ') { ev.preventDefault(); alternarDireccion(); return; }
    if (ev.key === 'Home' || ev.key === 'End') {
      ev.preventDefault();
      const p = palabraActiva();
      if (p) {
        const celdas = celdasDePalabra(p);
        const d = ev.key === 'Home' ? celdas[0] : celdas[celdas.length - 1];
        enfocar(d.fila, d.col);
      }
      return;
    }
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    if (ev.key && ev.key.length === 1) {
      ev.preventDefault();
      if (bloqueado) return;
      if (normalizarLetra(ev.key)) escribir(ev.key);
    }
  });

  // Teclados virtuales (móvil): la letra llega por beforeinput/input, no por keydown.
  grilla.addEventListener('beforeinput', ev => {
    const input = ev.target;
    if (!input || input.tagName !== 'INPUT') return;
    if (bloqueado) { ev.preventDefault(); return; }
    const fila = +input.dataset.fila, col = +input.dataset.col;
    if (!activa || activa.fila !== fila || activa.col !== col) activar(fila, col);
    if (ev.inputType === 'insertText' && ev.data != null && !ev.isComposing) {
      ev.preventDefault();
      escribir(ev.data);
    } else if (ev.inputType === 'deleteContentBackward' && !ev.isComposing) {
      ev.preventDefault();
      borrar(true);
    } else if (ev.inputType === 'deleteContentForward') {
      ev.preventDefault();
      borrar(false);
    }
  });

  function desdeValor(input) {
    const fila = +input.dataset.fila, col = +input.dataset.col;
    if (!activa || activa.fila !== fila || activa.col !== col) activar(fila, col);
    const l = normalizarLetra(input.value);
    if (l) {
      escribir(l);
    } else if (input.value === '' && respuestas[fila][col]) {
      borrar(true);
    } else {
      input.value = respuestas[fila][col];
    }
  }

  grilla.addEventListener('input', ev => {
    const input = ev.target;
    if (!input || input.tagName !== 'INPUT') return;
    if (bloqueado) { input.value = respuestas[+input.dataset.fila][+input.dataset.col]; return; }
    if (ev.isComposing) return; // espera a compositionend
    desdeValor(input);
  });

  grilla.addEventListener('compositionend', ev => {
    const input = ev.target;
    if (!input || input.tagName !== 'INPUT' || bloqueado) return;
    desdeValor(input);
  });

  grilla.addEventListener('focusin', ev => {
    const input = ev.target;
    if (!input || input.tagName !== 'INPUT') return;
    const fila = +input.dataset.fila, col = +input.dataset.col;
    if (!activa || activa.fila !== fila || activa.col !== col) activar(fila, col);
    else pintarResaltado();
  });

  // Clic: en la celda ya activa alterna H/V; en otra, la activa.
  grilla.addEventListener('pointerdown', ev => {
    const celda = ev.target.closest ? ev.target.closest('.celda') : null;
    if (!celda || celda.classList.contains('negra')) return;
    const fila = +celda.dataset.fila, col = +celda.dataset.col;
    if (activa && activa.fila === fila && activa.col === col) {
      alternarDireccion();
    }
  });
  grilla.addEventListener('click', ev => {
    const celda = ev.target.closest ? ev.target.closest('.celda') : null;
    if (!celda || celda.classList.contains('negra')) return;
    const fila = +celda.dataset.fila, col = +celda.dataset.col;
    if (!activa || activa.fila !== fila || activa.col !== col) enfocar(fila, col);
    else if (!bloqueado) inputs[fila][col].focus({ preventScroll: true });
  });

  // ----- controlador -----
  function respuestasCopia() {
    return respuestas.map(f => f.slice());
  }

  function cargar(nuevas) {
    for (let f = 0; f < puzzle.filas; f++) {
      for (let c = 0; c < puzzle.columnas; c++) {
        if (puzzle.celdas[f][c] == null) continue;
        const l = normalizarLetra(nuevas?.[f]?.[c] ?? '');
        respuestas[f][c] = l;
        inputs[f][c].value = l;
        celdasEl[f][c].classList.remove('ok', 'mal');
      }
    }
    pintarPistasOk(estado());
  }

  function revisar() {
    for (let f = 0; f < puzzle.filas; f++) {
      for (let c = 0; c < puzzle.columnas; c++) {
        const el = celdasEl[f][c];
        if (puzzle.celdas[f][c] == null) continue;
        el.classList.remove('ok', 'mal');
        const r = respuestas[f][c];
        if (!r) continue;
        el.classList.add(r === puzzle.celdas[f][c] ? 'ok' : 'mal');
      }
    }
    const est = estado();
    pintarPistasOk(est);
    return est;
  }

  function limpiarMarcas() {
    for (const fila of celdasEl) for (const el of fila) el && el.classList.remove('ok', 'mal');
  }

  function bloquear() {
    bloqueado = true;
    grilla.classList.add('bloqueada');
    pistas.classList.add('bloqueada');
    for (const fila of inputs) for (const i of fila) if (i) i.disabled = true;
  }

  function desbloquear() {
    bloqueado = false;
    grilla.classList.remove('bloqueada');
    pistas.classList.remove('bloqueada');
    for (const fila of inputs) for (const i of fila) if (i) i.disabled = false;
  }

  function enfocarPrimera() {
    const p = puzzle.palabras[0];
    if (p) { irAPalabra(p); return; }
    for (let f = 0; f < puzzle.filas; f++) {
      for (let c = 0; c < puzzle.columnas; c++) {
        if (puzzle.celdas[f][c] != null) { enfocar(f, c); return; }
      }
    }
  }

  // Resaltado inicial sin robar el foco.
  if (puzzle.palabras[0]) activar(puzzle.palabras[0].fila, puzzle.palabras[0].col, puzzle.palabras[0].dir);

  return {
    estado,
    respuestas: respuestasCopia,
    cargar,
    revisar,
    limpiarMarcas,
    bloquear,
    desbloquear,
    enfocarPrimera,
  };
}
