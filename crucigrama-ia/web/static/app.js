// Crucigrama IA · integración de pantallas.
// Módulos: semilla (rng), generador (tablero por semilla), tablero (UI), cronometro, partidas (localStorage), exportar (anuncio).
import { normalizarSemilla, semillaAleatoria } from './semilla.js';
import { generarCrucigrama, validarCrucigrama } from './generador.js';
import { montarTablero } from './tablero.js';
import { crearCronometro, formatearTiempo } from './cronometro.js';
import {
  guardarPartida, listarPartidas, mejorPartida, borrarPartida, borrarTodo,
  guardarEnCurso, cargarEnCurso, borrarEnCurso, importarPartidasJson,
} from './partidas.js';
import {
  textoAnuncio, copiarAnuncio, descargarAnuncioTxt, dibujarAnuncio, descargarAnuncioPng,
  compartirAnuncio, descargarPartidasJson,
} from './exportar.js';

const $ = (id) => document.getElementById(id);
const pantallas = { inscripcion: $('inscripcion'), juego: $('juego'), resultado: $('resultado') };

// ---- estado de la partida en curso ----
let jugador = '';
let puzzle = null;
let control = null;          // controlador del tablero
let inicio = null;           // ISO del inicio
let revisiones = 0;
let terminada = false;
let ultimaPartida = null;    // la última partida guardada (para el anuncio)
let guardadoPendiente = 0;

const reloj = crearCronometro((ms) => { $('reloj').textContent = formatearTiempo(ms); }, 100);

function mostrar(nombre) {
  for (const [k, el] of Object.entries(pantallas)) el.hidden = k !== nombre;
  if (nombre !== 'inscripcion') window.scrollTo({ top: 0, behavior: 'smooth' });
}

function aviso(texto, tipo = '') {
  const el = $('aviso');
  el.textContent = texto;
  el.className = 'aviso ' + tipo;
  el.hidden = !texto;
}

// ---- inscripción ----
$('azar').addEventListener('click', () => { $('semilla').value = semillaAleatoria(); $('semilla').focus(); });
$('semilla').addEventListener('input', (e) => { e.target.value = normalizarSemilla(e.target.value); });

$('form').addEventListener('submit', (e) => {
  e.preventDefault();
  const nombre = $('nombre').value.trim().replace(/\s+/g, ' ');
  $('err1').textContent = '';
  if (nombre.length < 3) { $('err1').textContent = 'Escribe tu nombre y apellido (mínimo 3 letras).'; return; }
  const semilla = normalizarSemilla($('semilla').value) || semillaAleatoria();
  empezar(nombre, semilla);
});

function empezar(nombre, semilla, reanudacion = null) {
  jugador = nombre;
  try {
    puzzle = generarCrucigrama(semilla);
  } catch (err) {
    $('err1').textContent = 'No se pudo generar el tablero con esa semilla. Prueba otra.';
    console.error(err);
    return;
  }
  const v = validarCrucigrama(puzzle);
  if (!v.ok) {
    console.error('Crucigrama inválido', v.errores);
    $('err1').textContent = 'La semilla produjo un tablero inválido. Prueba otra.';
    return;
  }
  terminada = false;
  revisiones = reanudacion ? (reanudacion.revisiones || 0) : 0;
  inicio = reanudacion ? reanudacion.inicio : new Date().toISOString();
  ultimaPartida = null;

  $('nom').textContent = jugador;
  $('semillaActual').textContent = puzzle.semilla;
  $('nPal').textContent = puzzle.palabras.length;
  aviso('');
  $('pausar').textContent = 'Pausar';

  control = montarTablero({ tablero: $('tablero'), pistas: $('pistas') }, puzzle, { onCambio: alCambiar });
  if (reanudacion && reanudacion.respuestas) control.cargar(reanudacion.respuestas);
  const est = control.estado();
  $('nTot').textContent = est.total;
  pintarProgreso(est);

  mostrar('juego');
  reloj.iniciar(reanudacion ? (reanudacion.transcurridoMs || 0) : 0);
  $('reloj').textContent = formatearTiempo(reloj.transcurrido());
  control.enfocarPrimera();
  programarGuardadoEnCurso();
}

function pintarProgreso(est) {
  $('nLlenas').textContent = est.llenas;
  $('nOk').textContent = Object.values(est.porPalabra).filter((x) => x === 'ok').length;
}

function alCambiar(est) {
  if (terminada) return;
  pintarProgreso(est);
  programarGuardadoEnCurso();
  if (est.perfecto) terminar(est);
  else if (est.completo) aviso('Tablero lleno, pero hay letras incorrectas. Pulsa Revisar para ver cuáles.', 'tibio');
  else aviso('');
}

function programarGuardadoEnCurso() {
  clearTimeout(guardadoPendiente);
  guardadoPendiente = setTimeout(() => {
    if (!control || terminada) return;
    guardarEnCurso({ jugador, semilla: puzzle.semilla, inicio, transcurridoMs: reloj.transcurrido(), respuestas: control.respuestas(), revisiones });
  }, 300);
}

// ---- acciones del juego ----
$('revisar').addEventListener('click', () => {
  if (!control || terminada) return;
  revisiones += 1;
  const est = control.revisar();
  if (est.perfecto) { terminar(est); return; }
  aviso(`${est.correctas} letras correctas, ${est.incorrectas} incorrectas, ${est.total - est.llenas} vacías. Revisión ${revisiones}.`, 'tibio');
  programarGuardadoEnCurso();
});

$('pausar').addEventListener('click', () => {
  if (!control || terminada) return;
  if (reloj.corriendo()) {
    reloj.pausar(); control.bloquear(); $('pausar').textContent = 'Reanudar';
    aviso('Partida en pausa. El tiempo no corre.', 'pausa');
  } else {
    reloj.reanudar(); control.desbloquear(); $('pausar').textContent = 'Pausar'; aviso(''); control.enfocarPrimera();
  }
  programarGuardadoEnCurso();
});

$('reiniciar').addEventListener('click', () => {
  if (!puzzle) return;
  if (!confirm('¿Reiniciar el tablero y el cronómetro desde cero?')) return;
  reloj.detener();
  empezar(jugador, puzzle.semilla);
});

$('abandonar').addEventListener('click', () => {
  if (!confirm('¿Salir sin terminar? La partida quedará guardada para reanudarla luego.')) return;
  reloj.pausar();
  guardarEnCurso({ jugador, semilla: puzzle.semilla, inicio, transcurridoMs: reloj.transcurrido(), respuestas: control.respuestas(), revisiones });
  reloj.detener();
  terminada = true;
  pintarReanudar();
  mostrar('inscripcion');
});

$('copiarSemilla').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(puzzle.semilla); $('copiarSemilla').textContent = '¡Copiada!'; }
  catch (e) { $('copiarSemilla').textContent = puzzle.semilla; }
  setTimeout(() => { $('copiarSemilla').textContent = 'Copiar'; }, 1500);
});

// ---- fin de partida ----
function terminar(est) {
  terminada = true;
  clearTimeout(guardadoPendiente);
  const duracionMs = reloj.detener();
  control.bloquear();
  control.revisar();
  const partida = guardarPartida({
    jugador, semilla: puzzle.semilla, inicio, fin: new Date().toISOString(), duracionMs,
    completada: true, correctas: puzzle.palabras.length, total: puzzle.palabras.length, revisiones,
    respuestas: control.respuestas(),
  });
  borrarEnCurso();
  ultimaPartida = partida;
  pintarResultado(partida);
  pintarHistorial();
  mostrar('resultado');
}

function pintarResultado(p) {
  $('resTitulo').textContent = p.completada ? '¡CRUCIGRAMA COMPLETO!' : 'PARTIDA SIN TERMINAR';
  $('resTiempo').textContent = formatearTiempo(p.duracionMs);
  $('resOk').textContent = `${p.correctas}/${p.total}`;
  $('resRev').textContent = p.revisiones;
  const mejor = mejorPartida(p.semilla);
  $('resMejor').textContent = mejor ? formatearTiempo(mejor.duracionMs) : '–';
  const esRecord = mejor && mejor.id === p.id;
  $('resDetalle').textContent = esRecord
    ? `${p.jugador}, tienes el mejor tiempo registrado en este navegador para la semilla ${p.semilla}.`
    : `${p.jugador}, el mejor tiempo para la semilla ${p.semilla} es ${mejor ? formatearTiempo(mejor.duracionMs) + ' (' + mejor.jugador + ')' : 'el tuyo'}.`;
  $('anuncio').textContent = textoAnuncio(p);
  try { dibujarAnuncio($('lienzo'), p); } catch (e) { console.warn('No se pudo dibujar el anuncio', e); }
  $('compartirAnuncio').hidden = !navigator.share;
  $('err3').textContent = '';
}

$('copiarAnuncio').addEventListener('click', async () => {
  const ok = await copiarAnuncio(ultimaPartida);
  $('err3').textContent = ok ? 'Anuncio copiado al portapapeles.' : 'No se pudo copiar; selecciona el texto manualmente.';
});
$('txtAnuncio').addEventListener('click', () => descargarAnuncioTxt(ultimaPartida));
$('pngAnuncio').addEventListener('click', async () => {
  try { await descargarAnuncioPng(ultimaPartida); } catch (e) { $('err3').textContent = 'No se pudo generar el PNG en este navegador.'; }
});
$('compartirAnuncio').addEventListener('click', async () => {
  const ok = await compartirAnuncio(ultimaPartida);
  if (!ok) $('err3').textContent = 'Este navegador no permite compartir; copia el texto.';
});
$('otraVez').addEventListener('click', () => empezar(jugador, puzzle.semilla));
$('nuevaSemilla').addEventListener('click', () => {
  $('semilla').value = ''; $('nombre').value = jugador; pintarReanudar(); mostrar('inscripcion'); $('semilla').focus();
});

// ---- reanudar ----
function pintarReanudar() {
  const ec = cargarEnCurso();
  $('reanudar').hidden = !ec;
  if (!ec) return;
  $('reanudarQuien').textContent = ec.jugador;
  $('reanudarSemilla').textContent = ec.semilla;
}
$('btnReanudar').addEventListener('click', () => {
  const ec = cargarEnCurso();
  if (ec) empezar(ec.jugador, ec.semilla, ec);
});
$('btnDescartar').addEventListener('click', () => { borrarEnCurso(); pintarReanudar(); });

// ---- historial ----
function fechaCorta(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return '–';
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: '2-digit' }) + ' ' +
    d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
}

function pintarHistorial() {
  const partidas = listarPartidas();
  const completas = partidas.filter((p) => p.completada);
  const mejor = mejorPartida();
  $('hPartidas').textContent = partidas.length;
  $('hCompletas').textContent = completas.length;
  $('hMejor').textContent = mejor ? formatearTiempo(mejor.duracionMs) : '–';
  const tbody = $('tablaPartidas').querySelector('tbody');
  tbody.innerHTML = '';
  $('sinPartidas').hidden = partidas.length > 0;
  $('tablaPartidas').hidden = partidas.length === 0;
  for (const p of partidas) {
    const tr = document.createElement('tr');
    if (mejor && p.id === mejor.id) tr.className = 'mejor';
    const celdas = [fechaCorta(p.fin), p.jugador, p.semilla, formatearTiempo(p.duracionMs), `${p.correctas}/${p.total}`];
    for (const [i, t] of celdas.entries()) {
      const td = document.createElement('td');
      td.textContent = t;
      if (i === 2 || i === 3) td.className = 'mono';
      tr.appendChild(td);
    }
    const td = document.createElement('td');
    const bAn = document.createElement('button'); bAn.type = 'button'; bAn.className = 'mini'; bAn.textContent = 'Anuncio';
    bAn.addEventListener('click', () => { ultimaPartida = p; puzzle = puzzle || { semilla: p.semilla, palabras: [] }; pintarResultado(p); mostrar('resultado'); });
    const bJ = document.createElement('button'); bJ.type = 'button'; bJ.className = 'mini'; bJ.textContent = 'Jugar';
    bJ.addEventListener('click', () => { $('semilla').value = p.semilla; $('nombre').value = $('nombre').value || p.jugador; mostrar('inscripcion'); $('nombre').focus(); });
    const bX = document.createElement('button'); bX.type = 'button'; bX.className = 'mini'; bX.textContent = '✕'; bX.setAttribute('aria-label', 'Borrar partida');
    bX.addEventListener('click', () => { if (confirm('¿Borrar esta partida?')) { borrarPartida(p.id); pintarHistorial(); } });
    td.append(bAn, bJ, bX);
    tr.appendChild(td);
    tbody.appendChild(tr);
  }
}

$('exportarJson').addEventListener('click', () => descargarPartidasJson());
$('importarJson').addEventListener('click', () => $('archivoJson').click());
$('archivoJson').addEventListener('change', async (e) => {
  const archivo = e.target.files && e.target.files[0];
  if (!archivo) return;
  try {
    const n = importarPartidasJson(await archivo.text());
    $('err4').textContent = `Se importaron ${n} partidas nuevas.`;
    $('err4').style.color = 'var(--ok)';
    pintarHistorial();
  } catch (err) {
    $('err4').textContent = err.message || 'No se pudo importar el archivo.';
    $('err4').style.color = '';
  }
  e.target.value = '';
});
$('borrarTodo').addEventListener('click', () => {
  if (!confirm('¿Borrar todas las partidas guardadas en este navegador? No se puede deshacer.')) return;
  borrarTodo(); pintarHistorial();
});

// ---- arranque ----
(function arrancar() {
  const url = new URL(location.href);
  const s = normalizarSemilla(url.searchParams.get('semilla') || '');
  if (s) $('semilla').value = s;
  pintarReanudar();
  pintarHistorial();
  mostrar('inscripcion');
  window.addEventListener('beforeunload', () => {
    if (control && !terminada) guardarEnCurso({ jugador, semilla: puzzle.semilla, inicio, transcurridoMs: reloj.transcurrido(), respuestas: control.respuestas(), revisiones });
  });
})();
