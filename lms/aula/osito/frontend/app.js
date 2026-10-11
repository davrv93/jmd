// app.js — UI, chat, voz, micrófono, imágenes y salud del backend.
import { crearEscena, crearOsito, COLORES_LED } from './osito.js';
import { crearRobot } from './robot.js';

// ---- Configuración ----
// ?avatar=robot elige el robotito (por defecto el osito); ?nombre=... cambia el nombre mostrado.
const PARAMS_URL = new URLSearchParams(location.search);
const AVATAR = PARAMS_URL.get('avatar') === 'robot' ? 'robot' : 'osito';
const NOMBRE_OSITO = (PARAMS_URL.get('nombre') || '').trim().slice(0, 40) || 'Tecnosito';
const BASE = location.origin;
const OBRA_URL = 'http://localhost:8787/obra.html?compacto=1';
// Sobreescribible con ?obra=http://localhost:8797 (se toma la base y se añade /obra.html?compacto=1).
const URL_OBRA = (() => {
  try {
    const base = new URLSearchParams(location.search).get('obra');
    if (!base) return OBRA_URL;
    const u = new URL(base, location.href);
    return `${u.origin}/obra.html?compacto=1`;
  } catch { return OBRA_URL; }
})();
const TIEMPO_CHAT_MS = 60_000;
const TIEMPO_STT_MS = 60_000;
const TIEMPO_IMAGEN_MS = 180_000;
const INTERVALO_SALUD_MS = 30_000;
const DORMIR_TRAS_MS = 90_000;

// Motores de imagen, de menor a mayor exigencia, y su nivel de calidad.
const MOTORES = [
  { id: 'demo', nivel: '', etiqueta: 'Demo (sin modelo)' },
  { id: 'sd-turbo', nivel: 'rapida', etiqueta: 'Rápida · sd-turbo' },
  { id: 'sdxl-turbo', nivel: 'buena', etiqueta: 'Buena · sdxl-turbo' },
  { id: 'flux2-klein', nivel: 'maxima', etiqueta: 'Máxima · FLUX.2 Klein' },
];
const ORDEN_MOTOR = Object.fromEntries(MOTORES.map((m, i) => [m.id, i]));
const ESPERA_POR_CALIDAD = {
  rapida: 'Dibujando en calidad rápida... unos 10 s.',
  buena: 'Dibujando en calidad buena... unos 10 s.',
  maxima: 'Dibujando en calidad máxima... cerca de un minuto.',
};
const CAMPOS_FLYER = [
  ['titulo', 'Título'], ['subtitulo', 'Subtítulo'], ['descripcion', 'Descripción'],
  ['fecha', 'Fecha'], ['hora', 'Hora'], ['precio', 'Precio'], ['lugar', 'Lugar'],
  ['ponente', 'Ponente'], ['contacto', 'Contacto'], ['tema_visual', 'Tema visual'],
];

/** "flyer/sd-turbo" -> "Flyer · Rápida · sd-turbo". */
function motorLegible(motor) {
  const m = String(motor || '');
  const [cabeza, resto] = m.startsWith('flyer/') ? ['Flyer · ', m.slice(6)] : ['', m];
  const conocido = MOTORES.find((x) => x.id === resto);
  return cabeza + (conocido ? conocido.etiqueta : (resto || 'desconocido'));
}

const ENLATADAS = [
  'Ahora mismo no tengo conexión con mi cerebro, pero aquí sigo contigo. Cuéntame más.',
  'Mi servidor está descansando, así que respondo con lo que tengo a mano: me encanta aprender contigo.',
  'Sin backend puedo poco, pero escucharte sí. Cuando vuelva la conexión te respondo mejor.',
  'Nota mental: cuando mi cerebro despierte, retomamos esto. Mientras, respira hondo conmigo.',
  'Estoy en modo tierno y desconectado. Prueba de nuevo en un momento o sigue contándome.',
  'No alcanzo al servidor, pero te leo. Si quieres, pregúntame otra cosa.',
];

// ---- Elementos ----
const $ = (sel) => document.querySelector(sel);
const el = {
  lienzo: $('#lienzo'),
  sinWebgl: $('#sin-webgl'),
  nombre: $('#nombre-osito'),
  chipAnimo: $('#chip-animo'),
  chipAnimoTexto: $('#chip-animo-texto'),
  chipSinBackend: $('#chip-sin-backend'),
  chipSalud: $('#chip-salud'),
  popSalud: $('#popover-salud'),
  fichaSalud: $('#ficha-salud'),
  btnDiagnostico: $('#btn-diagnostico'),
  diagnostico: $('#diagnostico'),
  fichaDiagnostico: $('#ficha-diagnostico'),
  listaMotores: $('#lista-motores'),
  grupoCalidad: $('#grupo-calidad'),
  mensajes: $('#mensajes'),
  progreso: $('#progreso'),
  form: $('#form-chat'),
  entrada: $('#entrada'),
  btnMic: $('#btn-mic'),
  btnImagen: $('#btn-imagen'),
  btnEnviar: $('#btn-enviar'),
  btnSilencio: $('#btn-silencio'),
  btnAjustes: $('#btn-ajustes'),
  btnObra: $('#btn-obra'),
  popAjustes: $('#popover-ajustes'),
  popImagen: $('#popover-imagen'),
  imagenPrompt: $('#imagen-prompt'),
  btnImagenCancelar: $('#btn-imagen-cancelar'),
  btnImagenGenerar: $('#btn-imagen-generar'),
  ajusteEnviarAlSoltar: $('#ajuste-enviar-al-soltar'),
  ajusteLeer: $('#ajuste-leer-subtitulos'),
  ajusteVelocidad: $('#ajuste-velocidad'),
  salidaVelocidad: $('#salida-velocidad'),
  panelObra: $('#panel-obra'),
  iframeObra: $('#iframe-obra'),
  toasts: $('#toasts'),
};

el.nombre.textContent = NOMBRE_OSITO;
document.title = NOMBRE_OSITO;
el.entrada.placeholder = `Escríbele a ${NOMBRE_OSITO}...`;

// ---- Preferencias (localStorage es solo comodidad; puede fallar) ----
const prefs = leerPrefs();
function leerPrefs() {
  const base = { silencio: false, enviarAlSoltar: false, leer: true, velocidad: 1 };
  try { return { ...base, ...JSON.parse(localStorage.getItem('tecnosito.prefs') || '{}') }; } catch { return base; }
}
function guardarPrefs() {
  try { localStorage.setItem('tecnosito.prefs', JSON.stringify(prefs)); } catch { /* sin almacenamiento */ }
}

// ---- anime.js opcional (si no carga, quedan las transiciones CSS) ----
let anime = null;
import('animejs').then((m) => { anime = m; }).catch(() => { anime = null; });

// ---- Estado ----
const estado = {
  historial: [],
  sinBackend: false,
  salud: null,
  ocupado: false,
  grabando: false,
  mediaRecorder: null,
  trozos: [],
  reconocimiento: null,
  ultimaInteraccion: performance.now(),
  dormido: false,
  voz: null,
  animoActual: 'neutral',
  calidadElegida: false,
};

// ---- Escena 3D ----
let escena = null;
let osito = null;
try {
  escena = crearEscena(el.lienzo);
  osito = AVATAR === 'robot' ? crearRobot(escena.scene) : crearOsito(escena.scene);
  if (AVATAR === 'robot') {
    const icono = document.querySelector('.marca-icono');
    if (icono) icono.innerHTML = '<svg viewBox="0 0 64 64" width="28" height="28"><rect x="12" y="16" width="40" height="34" rx="10" fill="#eef1f8"/><rect x="18" y="22" width="28" height="20" rx="6" fill="#141a2e"/><ellipse cx="26" cy="32" rx="3.5" ry="4.5" fill="#9ad5ff"/><ellipse cx="38" cy="32" rx="3.5" ry="4.5" fill="#9ad5ff"/><circle cx="32" cy="9" r="4" fill="#ffb3d9"/><rect x="31" y="12" width="2" height="5" fill="#8b95b5"/><rect x="6" y="28" width="6" height="12" rx="3" fill="#8b95b5"/><rect x="52" y="28" width="6" height="12" rx="3" fill="#8b95b5"/></svg>';
  }
} catch (e) {
  console.warn('Sin WebGL:', e);
  el.sinWebgl.hidden = false;
  el.lienzo.hidden = true;
}

let tAnterior = performance.now();
function cuadro(ahora) {
  const dt = (ahora - tAnterior) / 1000;
  tAnterior = ahora;
  if (osito) osito.update(dt);
  if (escena) escena.render(dt);
  requestAnimationFrame(cuadro);
}
if (escena) {
  const ro = new ResizeObserver(() => escena.resize());
  ro.observe(el.lienzo.parentElement);
  requestAnimationFrame(cuadro);
}

// Paralaje y mirada: puntero sobre toda la ventana, normalizado en [-1, 1].
addEventListener('pointermove', (ev) => {
  const nx = (ev.clientX / innerWidth) * 2 - 1;
  const ny = (ev.clientY / innerHeight) * 2 - 1;
  if (escena) escena.apuntar(nx, ny);
  if (osito) osito.mirar(nx, ny);
}, { passive: true });

// ---- Ánimo ----
function setAnimo(nombre) {
  if (!(nombre in COLORES_LED)) nombre = 'neutral';
  estado.animoActual = nombre;
  if (osito) osito.setAnimo(nombre);
  el.chipAnimoTexto.textContent = nombre;
  el.chipAnimo.style.setProperty('--color-animo', '#' + COLORES_LED[nombre].toString(16).padStart(6, '0'));
  if (anime) {
    anime.animate(el.chipAnimo, { scale: [0.85, 1], duration: 320, ease: 'outBack' });
  } else {
    el.chipAnimo.classList.remove('pop');
    void el.chipAnimo.offsetWidth;
    el.chipAnimo.classList.add('pop');
  }
  document.querySelectorAll('.chip-boton[data-animo]').forEach((b) => b.classList.toggle('activo', b.dataset.animo === nombre));
}

let temporizadorAnimo = 0;
/** Ánimo pasajero: vuelve a `despues` tras `ms`. */
function animoTemporal(nombre, ms, despues = 'neutral') {
  clearTimeout(temporizadorAnimo);
  setAnimo(nombre);
  temporizadorAnimo = setTimeout(() => { if (estado.animoActual === nombre) setAnimo(despues); }, ms);
}

document.querySelectorAll('.chip-boton[data-animo]').forEach((b) => {
  b.addEventListener('click', () => { despertar(); setAnimo(b.dataset.animo); });
});

// ---- Chat: burbujas ----
function burbuja(rol, texto, extra = {}) {
  const div = document.createElement('div');
  div.className = `burbuja ${rol}`;
  const p = document.createElement('p');
  p.style.margin = '0';
  p.textContent = texto;
  div.append(p);
  if (extra.meta) {
    const m = document.createElement('span');
    m.className = 'meta';
    m.textContent = extra.meta;
    div.append(m);
  }
  el.mensajes.append(div);
  desplazarAbajo();
  if (anime && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    anime.animate(div, { opacity: [0, 1], translateY: [10, 0], duration: 280, ease: 'outCubic' });
  }
  return div;
}
function desplazarAbajo() { el.mensajes.scrollTop = el.mensajes.scrollHeight; }

let indicador = null;
function mostrarEscribiendo(si) {
  if (si && !indicador) {
    indicador = document.createElement('div');
    indicador.className = 'burbuja osito';
    indicador.setAttribute('aria-label', `${NOMBRE_OSITO} está escribiendo`);
    indicador.innerHTML = '<span class="escribiendo"><i></i><i></i><i></i></span>';
    el.mensajes.append(indicador);
    desplazarAbajo();
  } else if (!si && indicador) {
    indicador.remove();
    indicador = null;
  }
}

function toast(texto, ms = 3200) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = texto;
  el.toasts.append(t);
  setTimeout(() => t.remove(), ms);
}

// ---- Voz (Web Speech API) ----
function elegirVoz() {
  if (!('speechSynthesis' in window)) return null;
  const voces = speechSynthesis.getVoices();
  if (!voces.length) return null;
  const buscar = (pref) => voces.find((v) => v.lang.replace('_', '-').toLowerCase().startsWith(pref));
  return buscar('es-pe') || buscar('es-mx') || buscar('es-es') || buscar('es') || null;
}
if ('speechSynthesis' in window) {
  estado.voz = elegirVoz();
  speechSynthesis.addEventListener('voiceschanged', () => { estado.voz = elegirVoz(); });
}

/**
 * El osito dice `texto`: siempre va al chat como subtítulo; por voz si no está silenciado.
 * Mueve la boca con los eventos de la utterance (o con una estimación de 60 ms/carácter).
 */
function decir(texto, animoFinal = 'neutral', opciones = {}) {
  const b = opciones.sinBurbuja ? null : burbuja('osito', texto, opciones);
  if (!opciones.sinHistorial) estado.historial.push({ rol: 'osito', texto });
  const estimadoMs = Math.min(20_000, Math.max(600, texto.length * 60));

  const empezar = () => { setAnimo('hablando'); osito?.hablar(estimadoMs); b?.classList.add('hablando'); };
  const terminar = () => { b?.classList.remove('hablando'); osito?.hablar(0); setAnimo(animoFinal); };

  const puedeHablar = 'speechSynthesis' in window && !prefs.silencio && prefs.leer;
  if (!puedeHablar) {
    // Sin voz: la boca se mueve el tiempo estimado de lectura.
    empezar();
    setTimeout(terminar, estimadoMs);
    return;
  }
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(texto);
    if (estado.voz) u.voice = estado.voz;
    u.lang = estado.voz?.lang || 'es-PE';
    u.rate = prefs.velocidad;
    u.pitch = 1.15;
    let termino = false;
    const fin = () => { if (!termino) { termino = true; terminar(); } };
    u.onstart = () => { empezar(); osito?.hablar(estimadoMs * 1.3); };
    u.onboundary = () => { osito?.hablar(1200); };
    u.onend = fin;
    u.onerror = fin;
    // Red de seguridad por si el navegador nunca dispara onend.
    setTimeout(fin, estimadoMs * 2 + 2000);
    speechSynthesis.speak(u);
  } catch {
    empezar();
    setTimeout(terminar, estimadoMs);
  }
}

// ---- Red ----
async function pedir(ruta, opciones = {}, timeoutMs = 30_000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(BASE + ruta, { ...opciones, signal: ctrl.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

function marcarSinBackend(si) {
  estado.sinBackend = si;
  el.chipSinBackend.hidden = !si;
  if (si) {
    el.chipSalud.querySelectorAll('.salud-item').forEach((s) => { s.classList.remove('ok', 'demo'); });
  }
}

/** Error de red: triste 2 s, mensaje corto, vuelve a neutral. */
function fallaDeRed(mensaje = 'Ups, no alcanzo a mi servidor ahora mismo.') {
  marcarSinBackend(true);
  decir(mensaje, 'neutral', { sinHistorial: true });
  animoTemporal('triste', 2000, 'neutral');
}

// ---- Salud ----
async function consultarSalud() {
  try {
    const s = await pedir('/api/salud', {}, 8000);
    estado.salud = s;
    marcarSinBackend(false);
    pintarSalud(s);
  } catch {
    estado.salud = null;
    marcarSinBackend(true);
  }
}
function pintarSalud(s) {
  const item = (clave) => el.chipSalud.querySelector(`[data-salud="${clave}"]`);
  item('ollama').classList.toggle('ok', !!s.ollama);
  item('whisper').classList.toggle('ok', !!s.whisper);
  const img = item('imagen');
  const motorVivo = s.imagen && s.imagen !== 'demo';
  img.classList.toggle('ok', !!motorVivo);
  img.classList.toggle('demo', s.imagen === 'demo');
  pintarFicha(el.fichaSalud, s);
  pintarFicha(el.fichaDiagnostico, s);
  pintarMotores(s);
  pintarCalidades(s);
}

/** Rellena una lista de definiciones con máquina, memoria, tope de imagen y modelo. */
function pintarFicha(dl, s) {
  const maq = s.maquina || {};
  const memoria = maq.memoria_gb != null ? `${Number(maq.memoria_gb).toFixed(1)} GB` : 'desconocida';
  const ram = maq.ram_gb != null && maq.ram_gb !== maq.memoria_gb ? ` (RAM ${Number(maq.ram_gb).toFixed(1)} GB)` : '';
  const filas = [
    ['Dispositivo', [maq.dispositivo, maq.nombre].filter(Boolean).join(' · ') || 'desconocido'],
    ['Memoria', memoria + ram],
    ['Tope de imagen', motorLegible(s.tope_imagen || 'demo')],
    ['Modelo Ollama', s.modelo || 'desconocido'],
  ];
  dl.replaceChildren(...filas.flatMap(([k, v]) => {
    const dt = document.createElement('dt'); dt.textContent = k;
    const dd = document.createElement('dd'); dd.textContent = v;
    return [dt, dd];
  }));
}

/** Lista de motores con "descargado" o "falta" (diagnóstico). */
function pintarMotores(s) {
  const descargados = new Set(s.motores_imagen || []);
  const tope = ORDEN_MOTOR[s.tope_imagen] ?? 0;
  el.listaMotores.replaceChildren(...MOTORES.filter((m) => m.id !== 'demo').map((m) => {
    const li = document.createElement('li');
    const esta = descargados.has(m.id);
    const cabe = ORDEN_MOTOR[m.id] <= tope;
    li.className = esta ? 'descargado' : 'falta';
    li.innerHTML = `<span class="punto" aria-hidden="true"></span><span class="motor-nombre"></span><span class="motor-estado"></span>`;
    li.querySelector('.motor-nombre').textContent = m.etiqueta;
    li.querySelector('.motor-estado').textContent = (esta ? 'descargado' : 'falta') + (cabe ? '' : ' · no cabe en esta máquina');
    return li;
  }));
}

/**
 * Radios de calidad: por encima del tope se deshabilitan; si cabe pero no está
 * descargado, punto gris. La calidad marcada por defecto es la mejor habilitada.
 */
function pintarCalidades(s) {
  const descargados = new Set(s.motores_imagen || []);
  const tope = ORDEN_MOTOR[s.tope_imagen] ?? 0;
  let mejor = null;
  for (const etiqueta of el.grupoCalidad.querySelectorAll('.chip-radio')) {
    const motor = etiqueta.dataset.motor;
    const radio = etiqueta.querySelector('input');
    const punto = etiqueta.querySelector('.punto-motor');
    const cabe = ORDEN_MOTOR[motor] <= tope || radio.value === 'rapida'; // rápida siempre queda (cae a demo)
    const esta = descargados.has(motor);
    radio.disabled = !cabe;
    etiqueta.classList.toggle('deshabilitado', !cabe);
    punto.hidden = !(cabe && !esta);
    if (!cabe) etiqueta.title = `No cabe en esta máquina (tope: ${motorLegible(s.tope_imagen || 'demo')}).`;
    else if (!esta) etiqueta.title = 'no descargado: caerá al nivel inferior';
    else etiqueta.removeAttribute('title');
    if (cabe) mejor = radio;
  }
  // Si lo marcado quedó deshabilitado, o el usuario aún no eligió, marcar el mejor nivel habilitado.
  const marcado = el.grupoCalidad.querySelector('input:checked');
  if (mejor && (!estado.calidadElegida || !marcado || marcado.disabled)) mejor.checked = true;
}
el.grupoCalidad.addEventListener('change', () => { estado.calidadElegida = true; });

// Popover de salud: al pasar el ratón, al enfocar o al tocar el chip.
// En táctil el navegador emula mouseenter + focus antes del click, así que
// esos dos se ignoran cuando el puntero es un dedo y el click alterna.
let saludTactil = false;
function mostrarSalud(abrir) { el.popSalud.hidden = !abrir || !estado.salud; }
el.chipSalud.addEventListener('pointerdown', (ev) => { saludTactil = ev.pointerType === 'touch'; });
el.chipSalud.addEventListener('pointermove', (ev) => { if (ev.pointerType === 'mouse') saludTactil = false; });
el.chipSalud.addEventListener('mouseenter', () => { if (!saludTactil) mostrarSalud(true); });
el.chipSalud.addEventListener('mouseleave', () => { if (!saludTactil) mostrarSalud(false); });
el.chipSalud.addEventListener('focus', () => { if (!saludTactil) mostrarSalud(true); });
el.chipSalud.addEventListener('blur', () => mostrarSalud(false));
el.chipSalud.addEventListener('click', () => { if (saludTactil) mostrarSalud(el.popSalud.hidden); });
el.chipSalud.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); mostrarSalud(el.popSalud.hidden); } });

// Diagnóstico dentro de ajustes.
el.btnDiagnostico.addEventListener('click', () => {
  const abrir = el.diagnostico.hidden;
  el.diagnostico.hidden = !abrir;
  el.btnDiagnostico.setAttribute('aria-expanded', String(abrir));
  if (abrir && !estado.salud) {
    el.fichaDiagnostico.innerHTML = '<dt>Servidor</dt><dd>sin respuesta</dd>';
    el.listaMotores.replaceChildren();
  }
});
consultarSalud();
setInterval(consultarSalud, INTERVALO_SALUD_MS);

// ---- Enviar mensaje ----
let indiceEnlatada = 0;
async function enviar(texto) {
  texto = (texto || '').trim();
  if (!texto || estado.ocupado) return;
  despertar();
  estado.ocupado = true;
  el.btnEnviar.disabled = true;
  burbuja('usuario', texto);
  const historialPrevio = estado.historial.slice(-20);
  estado.historial.push({ rol: 'usuario', texto });
  el.entrada.value = '';
  setAnimo('pensando');
  mostrarEscribiendo(true);

  try {
    if (estado.sinBackend && estado.salud === null) {
      // Modo degradado: respuesta enlatada tras una pausa breve.
      await new Promise((r) => setTimeout(r, 700));
      // Un intento rápido por si el servidor volvió.
      try {
        await consultarSalud();
      } catch { /* sigue degradado */ }
      if (estado.sinBackend) {
        mostrarEscribiendo(false);
        const r = ENLATADAS[indiceEnlatada++ % ENLATADAS.length];
        decir(r, 'neutral');
        return;
      }
    }
    const resp = await pedir('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mensaje: texto, historial: historialPrevio }),
    }, TIEMPO_CHAT_MS);
    mostrarEscribiendo(false);
    const animo = resp.animo in COLORES_LED ? resp.animo : 'neutral';
    // El modelo a veces deja la etiqueta "ANIMO: x" pegada al final del texto; no se muestra.
    const textoLimpio = String(resp.texto || '...').replace(/\s*ANIMO\s*:\s*\w+\s*$/i, '').trim() || '...';
    decir(textoLimpio, animo, { meta: resp.fuente === 'faq' ? 'respuesta rápida' : undefined });
  } catch (e) {
    mostrarEscribiendo(false);
    console.warn('Chat falló:', e);
    fallaDeRed();
  } finally {
    estado.ocupado = false;
    el.btnEnviar.disabled = false;
    el.entrada.focus({ preventScroll: true });
  }
}

el.form.addEventListener('submit', (ev) => {
  ev.preventDefault();
  enviar(el.entrada.value);
});

// ---- Micrófono ----
function tipoMimeGrabacion() {
  if (!('MediaRecorder' in window)) return '';
  for (const t of ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/ogg']) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return '';
}

async function alternarMic() {
  despertar();
  if (estado.grabando) { detenerGrabacion(); return; }
  if (!navigator.mediaDevices?.getUserMedia || !('MediaRecorder' in window)) {
    toast('Tu navegador no permite grabar audio.');
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mime = tipoMimeGrabacion();
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    estado.trozos = [];
    rec.ondataavailable = (ev) => { if (ev.data.size) estado.trozos.push(ev.data); };
    rec.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(estado.trozos, { type: rec.mimeType || mime || 'audio/webm' });
      await transcribir(blob);
    };
    rec.start();
    estado.mediaRecorder = rec;
    estado.grabando = true;
    el.btnMic.classList.add('grabando');
    el.btnMic.setAttribute('aria-pressed', 'true');
    el.btnMic.setAttribute('aria-label', 'Detener grabación');
    osito?.escuchar(true);
    setAnimo('escuchando');
  } catch (e) {
    console.warn('Micrófono:', e);
    toast('No pude usar el micrófono. Revisa los permisos.');
    animoTemporal('triste', 1500);
  }
}
function detenerGrabacion() {
  estado.grabando = false;
  el.btnMic.classList.remove('grabando');
  el.btnMic.setAttribute('aria-pressed', 'false');
  el.btnMic.setAttribute('aria-label', 'Hablar por micrófono');
  osito?.escuchar(false);
  try { estado.mediaRecorder?.stop(); } catch { /* ya detenido */ }
}

async function transcribir(blob) {
  el.btnMic.classList.add('procesando');
  el.btnMic.disabled = true;
  setAnimo('pensando');
  try {
    const fd = new FormData();
    const ext = blob.type.includes('ogg') ? 'ogg' : 'webm';
    fd.append('audio', blob, `voz.${ext}`);
    const r = await pedir('/api/stt', { method: 'POST', body: fd }, TIEMPO_STT_MS);
    const texto = (r.texto || '').trim();
    if (!texto) {
      decir('No alcancé a escuchar nada. Prueba otra vez, más cerquita del micrófono.', 'neutral', { sinHistorial: true });
      return;
    }
    // Mostrar qué escuchó antes de actuar.
    el.entrada.value = texto;
    setAnimo('feliz');
    setTimeout(() => { if (estado.animoActual === 'feliz') setAnimo('neutral'); }, 1500);
    if (prefs.enviarAlSoltar) enviar(texto);
    else { el.entrada.focus(); toast('Esto fue lo que escuché. Revísalo y envíalo.'); }
  } catch (e) {
    console.warn('STT falló:', e);
    if (!reconocimientoNavegador()) fallaDeRed('Mi oído del servidor no responde ahora.');
  } finally {
    el.btnMic.classList.remove('procesando');
    el.btnMic.disabled = false;
  }
}

/** Respaldo: reconocimiento del navegador solo si /api/stt falló. Devuelve true si lo pudo iniciar. */
function reconocimientoNavegador() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return false;
  try {
    const rec = new SR();
    rec.lang = 'es-PE';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (ev) => {
      const texto = ev.results[0]?.[0]?.transcript?.trim() || '';
      if (!texto) return;
      el.entrada.value = texto;
      if (prefs.enviarAlSoltar) enviar(texto);
      else el.entrada.focus();
    };
    rec.onerror = () => { animoTemporal('triste', 1500); toast('El reconocimiento del navegador tampoco pudo.'); };
    rec.onend = () => { osito?.escuchar(false); if (estado.animoActual === 'escuchando') setAnimo('neutral'); };
    estado.reconocimiento = rec;
    decir('Mi oído del servidor no responde; usaré el del navegador. Habla de nuevo, por favor.', 'escuchando', { sinHistorial: true });
    setTimeout(() => { osito?.escuchar(true); setAnimo('escuchando'); rec.start(); }, 2500);
    return true;
  } catch {
    return false;
  }
}

el.btnMic.addEventListener('click', alternarMic);

// ---- Imagen ----
function abrirPopover(pop, boton, abrir) {
  pop.hidden = !abrir;
  boton.setAttribute('aria-expanded', String(abrir));
}
el.btnImagen.addEventListener('click', () => {
  const abrir = el.popImagen.hidden;
  abrirPopover(el.popAjustes, el.btnAjustes, false);
  abrirPopover(el.popImagen, el.btnImagen, abrir);
  if (abrir) {
    if (el.entrada.value.trim()) el.imagenPrompt.value = el.entrada.value.trim();
    el.imagenPrompt.focus();
  }
});
el.btnImagenCancelar.addEventListener('click', () => abrirPopover(el.popImagen, el.btnImagen, false));
el.btnImagenGenerar.addEventListener('click', () => {
  const prompt = el.imagenPrompt.value.trim();
  if (!prompt) { el.imagenPrompt.focus(); toast('Describe la imagen primero.'); return; }
  const estilo = document.querySelector('input[name="estilo"]:checked')?.value || 'kawaii';
  const tipo = document.querySelector('input[name="tipo"]:checked')?.value || 'auto';
  const calidad = document.querySelector('input[name="calidad"]:checked')?.value || 'buena';
  abrirPopover(el.popImagen, el.btnImagen, false);
  generarImagen(prompt, estilo, tipo, calidad);
});

async function generarImagen(prompt, estilo, tipo = 'auto', calidad = 'buena') {
  if (estado.ocupado) { toast('Espera a que termine lo anterior.'); return; }
  despertar();
  estado.ocupado = true;
  el.btnImagen.disabled = true;
  burbuja('usuario', `Imagen (${estilo}): ${prompt}`);
  estado.historial.push({ rol: 'usuario', texto: `Genera una imagen (${estilo}): ${prompt}` });
  setAnimo('pensando');
  el.progreso.hidden = false;
  el.progreso.setAttribute('aria-hidden', 'false');
  const aviso = burbuja('sistema', ESPERA_POR_CALIDAD[calidad] || ESPERA_POR_CALIDAD.buena);
  try {
    const r = await pedir('/api/imagen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, estilo, tipo, calidad }),
    }, TIEMPO_IMAGEN_MS);
    aviso.remove();
    const url = new URL(r.url, BASE).href;
    const div = document.createElement('div');
    div.className = 'burbuja osito';
    const img = document.createElement('img');
    img.src = url;
    img.alt = `Imagen generada: ${prompt}`;
    img.loading = 'lazy';
    const pie = document.createElement('div');
    pie.className = 'pie-imagen';
    const texto = document.createElement('span');
    texto.textContent = `${motorLegible(r.motor)} · ${Number(r.segundos || 0).toFixed(1)} s`;
    const desc = document.createElement('a');
    desc.href = url;
    desc.download = `tecnosito-${Date.now()}.png`;
    desc.target = '_blank';
    desc.rel = 'noopener';
    desc.setAttribute('aria-label', 'Descargar imagen');
    desc.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M12 4v11m0 0l-4-4m4 4l4-4M5 20h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>Descargar';
    pie.append(texto, desc);
    div.append(img, pie);
    if (String(r.motor || '').startsWith('flyer/') && r.datos) div.append(bloqueDatosFlyer(r, estilo, calidad));
    el.mensajes.append(div);
    img.addEventListener('load', desplazarAbajo);
    desplazarAbajo();
    decir('Listo, aquí está tu imagen.', 'emocionado', { sinBurbuja: true });
    setTimeout(() => { if (estado.animoActual === 'emocionado') setAnimo('feliz'); }, 2500);
    estado.historial.push({ rol: 'osito', texto: `[imagen generada: ${prompt}]` });
  } catch (e) {
    aviso.remove();
    console.warn('Imagen falló:', e);
    fallaDeRed('No pude dibujar esta vez. Mi servidor de imágenes no respondió.');
  } finally {
    el.progreso.hidden = true;
    el.progreso.setAttribute('aria-hidden', 'true');
    estado.ocupado = false;
    el.btnImagen.disabled = false;
  }
}

/** Bloque plegable con los datos del flyer, editables, y botón para regenerar. */
function bloqueDatosFlyer(r, estilo, calidad) {
  const det = document.createElement('details');
  det.className = 'datos-flyer';
  const sum = document.createElement('summary');
  sum.textContent = 'Datos del flyer';
  const origen = document.createElement('span');
  origen.className = 'meta-origen';
  origen.textContent = r.datos_por === 'ollama' ? 'leídos por Ollama' : 'leídos por reglas';
  sum.append(origen);
  det.append(sum);
  const rejilla = document.createElement('div');
  rejilla.className = 'rejilla-flyer';
  const sufijo = Math.random().toString(36).slice(2, 8);
  const entradas = {};
  for (const [clave, etiqueta] of CAMPOS_FLYER) {
    const id = `flyer-${clave}-${sufijo}`;
    const lab = document.createElement('label');
    lab.htmlFor = id;
    lab.textContent = etiqueta;
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.id = id;
    inp.value = r.datos[clave] ?? '';
    inp.placeholder = etiqueta.toLowerCase();
    if (clave === 'descripcion' || clave === 'tema_visual') lab.classList.add('ancho');
    lab.append(inp);
    rejilla.append(lab);
    entradas[clave] = inp;
  }
  det.append(rejilla);
  const acciones = document.createElement('div');
  acciones.className = 'popover-acciones';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'boton-texto boton-primario';
  btn.textContent = 'Regenerar con estos datos';
  btn.addEventListener('click', () => {
    const v = (k) => entradas[k].value.trim();
    const partes = [
      v('titulo') ? `flyer: ${v('titulo')}.` : 'flyer.',
      v('subtitulo') ? `${v('subtitulo')}.` : '',
      v('descripcion') ? `${v('descripcion')}.` : '',
      v('fecha') || v('hora') ? `Fecha ${v('fecha')}${v('hora') ? ` a las ${v('hora')}` : ''}.` : '',
      v('precio') ? `Precio ${v('precio')}.` : '',
      v('lugar') ? `Lugar ${v('lugar')}.` : '',
      v('ponente') ? `Dicta ${v('ponente')}.` : '',
      v('contacto') ? `Contacto ${v('contacto')}.` : '',
      v('tema_visual') ? `Tema visual: ${v('tema_visual')}.` : '',
    ].filter(Boolean);
    generarImagen(partes.join(' '), estilo, 'flyer', calidad);
  });
  acciones.append(btn);
  det.append(acciones);
  return det;
}

// ---- Silencio y ajustes ----
function pintarSilencio() {
  el.btnSilencio.setAttribute('aria-pressed', String(prefs.silencio));
  el.btnSilencio.setAttribute('aria-label', prefs.silencio ? 'Activar voz' : 'Silenciar voz');
}
el.btnSilencio.addEventListener('click', () => {
  prefs.silencio = !prefs.silencio;
  guardarPrefs();
  pintarSilencio();
  if (prefs.silencio && 'speechSynthesis' in window) speechSynthesis.cancel();
  toast(prefs.silencio ? 'Voz silenciada. Seguirás leyendo los subtítulos.' : 'Voz activada.');
});
pintarSilencio();

el.btnAjustes.addEventListener('click', () => {
  const abrir = el.popAjustes.hidden;
  abrirPopover(el.popImagen, el.btnImagen, false);
  abrirPopover(el.popAjustes, el.btnAjustes, abrir);
});
el.ajusteEnviarAlSoltar.checked = prefs.enviarAlSoltar;
el.ajusteLeer.checked = prefs.leer;
el.ajusteVelocidad.value = String(prefs.velocidad);
el.salidaVelocidad.value = prefs.velocidad.toFixed(1);
el.ajusteEnviarAlSoltar.addEventListener('change', () => { prefs.enviarAlSoltar = el.ajusteEnviarAlSoltar.checked; guardarPrefs(); });
el.ajusteLeer.addEventListener('change', () => { prefs.leer = el.ajusteLeer.checked; guardarPrefs(); });
el.ajusteVelocidad.addEventListener('input', () => {
  prefs.velocidad = Number(el.ajusteVelocidad.value);
  el.salidaVelocidad.value = prefs.velocidad.toFixed(2).replace(/0$/, '');
  guardarPrefs();
});

// Cerrar popovers con Escape o clic fuera.
addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape') {
    abrirPopover(el.popAjustes, el.btnAjustes, false);
    abrirPopover(el.popImagen, el.btnImagen, false);
  }
});
addEventListener('pointerdown', (ev) => {
  if (!el.popAjustes.hidden && !el.popAjustes.contains(ev.target) && !el.btnAjustes.contains(ev.target)) abrirPopover(el.popAjustes, el.btnAjustes, false);
  if (!el.popImagen.hidden && !el.popImagen.contains(ev.target) && !el.btnImagen.contains(ev.target)) abrirPopover(el.popImagen, el.btnImagen, false);
});

// ---- Panel Obra: se muestra solo si el servidor responde y el iframe carga en 3 s ----
(async () => {
  const ocultar = () => { el.panelObra.hidden = true; el.btnObra.hidden = true; el.iframeObra.removeAttribute('src'); };
  try {
    const ctrl = new AbortController();
    const tAbort = setTimeout(() => ctrl.abort(), 3000);
    // Si el servidor permite CORS, un 404 se detecta aquí; si no, basta con que responda.
    const r = await fetch(URL_OBRA, { mode: 'cors', signal: ctrl.signal }).catch(() => null);
    if (r && !r.ok) throw new Error(`obra HTTP ${r.status}`);
    if (!r) await fetch(URL_OBRA, { mode: 'no-cors', signal: ctrl.signal });
    clearTimeout(tAbort);
    const cargo = await new Promise((resolver) => {
      const t = setTimeout(() => resolver(false), 8000);
      el.iframeObra.addEventListener('load', () => { clearTimeout(t); resolver(true); }, { once: true });
      el.iframeObra.addEventListener('error', () => { clearTimeout(t); resolver(false); }, { once: true });
      el.iframeObra.src = URL_OBRA;
    });
    if (!cargo) { ocultar(); return; }
    el.panelObra.hidden = false;
    el.btnObra.hidden = false;
    el.btnObra.addEventListener('click', () => {
      el.panelObra.open = !el.panelObra.open;
      el.btnObra.setAttribute('aria-expanded', String(el.panelObra.open));
    });
    el.panelObra.addEventListener('toggle', () => el.btnObra.setAttribute('aria-expanded', String(el.panelObra.open)));
  } catch {
    ocultar();
  }
})();

// ---- Sueño por inactividad ----
function despertar() {
  estado.ultimaInteraccion = performance.now();
  if (estado.dormido) {
    estado.dormido = false;
    animoTemporal('sorprendido', 900, 'neutral');
  }
}
['pointerdown', 'keydown', 'touchstart'].forEach((ev) => addEventListener(ev, despertar, { passive: true }));
setInterval(() => {
  if (!estado.dormido && !estado.ocupado && !estado.grabando && performance.now() - estado.ultimaInteraccion > DORMIR_TRAS_MS) {
    estado.dormido = true;
    setAnimo('dormido');
  }
}, 5000);

// ---- Bienvenida ----
// ?animo=feliz fuerza un ánimo al terminar el saludo (para capturas y pruebas).
const ANIMO_FORZADO = (() => {
  const a = new URLSearchParams(location.search).get('animo');
  return a && a in COLORES_LED ? a : '';
})();
// Gancho de pruebas: window.osito.setAnimo('feliz').
window.osito = { setAnimo, get animo() { return estado.animoActual; } };
setAnimo('neutral');
osito?.saludar();
setTimeout(() => {
  decir(`Hola, soy ${NOMBRE_OSITO}. Puedes escribirme, hablarme por el micrófono o pedirme una imagen.`, ANIMO_FORZADO || 'feliz');
  if (!ANIMO_FORZADO) setTimeout(() => { if (estado.animoActual === 'feliz') setAnimo('neutral'); }, 4000);
}, 600);
