// GoldenQuerys — estudio de reportes. Sin build: JS plano.
// IMPORTANTE: todas las llamadas al servidor usan rutas ABSOLUTAS "/api/..." (el visor las reenvía al aula).
'use strict';

const ICONOS = {
  botica: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7z"/></svg>',
  polleria: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-4 2-5 0 2 1 3 2 3 0-3 0-5 1-8zM5 19h14v2H5z"/></svg>',
  ferreteria: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M3 6l5-3 4 3-2 2 10 10-2 2L8 10l-2 2-3-3zM14 3h6v4h-2V5h-4z"/></svg>',
  academia: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 3L1 9l11 6 9-4.9V17h2V9zM5 13.2V17c0 1.7 3.1 3 7 3s7-1.3 7-3v-3.8l-7 3.8z"/></svg>',
  courier: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M2 5h12v10H2zM14 8h4l4 4v3h-8zM6 19a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm12 0a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"/></svg>',
};
const RE_SOLES = /(soles|total|monto|precio|importe|saldo|deuda|costo|subtotal|igv|tarifa|ticket|pagado|pension|limite|exceso|margen|venta_promedio)/i;
const RE_ID = /(^id$|_id$)/i;
const fmtNum = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 2 });
const fmtSoles = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const $ = (s) => document.querySelector(s);
const estado = { db: null, bases: [], esquema: null, res: null, chart: null, pestana: 'tabla' };

function esc(v) {
  return String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function aviso(txt) {
  const a = $('#aviso'); a.textContent = txt; a.hidden = false;
  clearTimeout(aviso.t); aviso.t = setTimeout(() => (a.hidden = true), 1800);
}
async function api(ruta, opciones) {
  const r = await fetch(ruta, opciones);
  let datos;
  try { datos = await r.json(); } catch { throw new Error(`El servidor respondió ${r.status} sin JSON. ¿Está corriendo? (sh arrancar.sh)`); }
  if (!r.ok) throw new Error(datos.error || `Error ${r.status}`);
  return datos;
}

// ------------------------------------------------------------------ arranque
async function iniciar() {
  try {
    const salud = await api('/api/salud');
    $('#estado').textContent = `servidor OK · ${salud.bases.length} bases`;
    $('#estado').className = 'pildora ok';
    const { bases } = await api('/api/bases');
    estado.bases = bases;
    pintarBases();
    elegirBase(bases.find((b) => b.nombre === 'botica') ? 'botica' : bases[0].nombre);
    cargarReportes();
  } catch (e) {
    $('#estado').textContent = 'sin servidor';
    $('#estado').className = 'pildora mal';
    mostrarError('No pude hablar con el servidor de GoldenQuerys.\n' + e.message +
      '\n\nEn la terminal del aula: cd /trabajo/goldenquerys && sh arrancar.sh');
  }
}

function pintarBases() {
  $('#bases').innerHTML = estado.bases.map((b) => `
    <button class="base" data-db="${esc(b.nombre)}" title="${esc(b.giro)}">
      ${ICONOS[b.nombre] || ICONOS.botica}
      <span><strong>${esc(b.nombre)}</strong><small>${esc(b.giro)}</small>
      <small>${b.tablas} tablas · ${b.vistas} vistas · ${fmtNum.format(b.tamano_kb)} KB</small></span>
    </button>`).join('');
  $('#bases').querySelectorAll('.base').forEach((el) => el.addEventListener('click', () => elegirBase(el.dataset.db)));
}

async function elegirBase(db) {
  estado.db = db;
  document.querySelectorAll('.base').forEach((el) => el.classList.toggle('activa', el.dataset.db === db));
  $('#esquema-db').textContent = db;
  const base = estado.bases.find((b) => b.nombre === db);
  $('#preguntas').innerHTML = (base.preguntas || []).map((p, i) =>
    `<button data-i="${i}">${esc(p.titulo)}</button>`).join('');
  $('#preguntas').querySelectorAll('button').forEach((el) => el.addEventListener('click', () => {
    const p = base.preguntas[+el.dataset.i];
    $('#sql').value = p.sql;
    $('#titulo-consulta').textContent = p.titulo;
    ejecutar();
  }));
  try {
    estado.esquema = await api('/api/esquema?db=' + encodeURIComponent(db));
    pintarEsquema();
  } catch (e) { mostrarError(e.message); }
  if (base.preguntas && base.preguntas[0]) {
    $('#sql').value = base.preguntas[0].sql;
    $('#titulo-consulta').textContent = base.preguntas[0].titulo;
    ejecutar();
  }
}

function pintarEsquema() {
  const f = $('#filtro').value.trim().toLowerCase();
  const objs = estado.esquema.objetos.filter((o) => !f || o.nombre.includes(f) || o.columnas.some((c) => c.nombre.includes(f)));
  $('#esquema').innerHTML = objs.map((o) => `
    <details class="${o.tipo}" ${f ? 'open' : ''}>
      <summary><span>${o.tipo === 'vista' ? '◇ ' : ''}${esc(o.nombre)}</span><span class="n">${fmtNum.format(o.filas)}</span></summary>
      <ul>${o.columnas.map((c) => `<li data-ins="${esc(c.nombre)}"><span>${esc(c.nombre)}</span><span class="t">${esc(c.tipo)}</span>
        ${c.pk ? '<span class="k">PK</span>' : ''}${c.fk ? `<span class="k">→ ${esc(c.fk)}</span>` : ''}</li>`).join('')}
        <li data-ins="SELECT * FROM ${esc(o.nombre)} LIMIT 100;" data-todo="1"><span class="k">▸ ver 100 filas</span></li></ul>
    </details>`).join('') || '<p class="vacio">Nada coincide.</p>';
  $('#esquema').querySelectorAll('li').forEach((li) => li.addEventListener('click', () => {
    if (li.dataset.todo) { $('#sql').value = li.dataset.ins; $('#titulo-consulta').textContent = 'Consulta SQL'; ejecutar(); return; }
    insertar(li.dataset.ins);
  }));
}

function insertar(txt) {
  const t = $('#sql'); const a = t.selectionStart, b = t.selectionEnd;
  t.value = t.value.slice(0, a) + txt + t.value.slice(b);
  t.focus(); t.selectionStart = t.selectionEnd = a + txt.length;
}

async function cargarReportes() {
  try {
    const { reportes } = await api('/api/reportes');
    $('#reportes').innerHTML = reportes.map((r) => `<li><span class="tipo">${r.tipo === 'reporte' ? 'HTML' : 'SQL'}</span>
      ${r.tipo === 'reporte'
        ? `<a href="${esc(r.archivo)}" target="_blank" rel="noopener">${esc(r.titulo || r.archivo)}</a>`
        : `<a data-sql="${esc(r.archivo)}">${esc(r.titulo || r.archivo)}</a>`}</li>`).join('') || '<li class="vacio">Aún no hay reportes.</li>';
    $('#reportes').querySelectorAll('a[data-sql]').forEach((a) => a.addEventListener('click', async () => {
      try {
        const txt = await (await fetch(a.dataset.sql, { cache: 'no-store' })).text();
        const m = txt.match(/^--\s*base:\s*(\w+)/mi);
        if (m && m[1] !== estado.db && estado.bases.some((b) => b.nombre === m[1])) await elegirBase(m[1]);
        $('#sql').value = txt; $('#titulo-consulta').textContent = a.textContent; ejecutar();
      } catch (e) { mostrarError('No pude leer ' + a.dataset.sql + ': ' + e.message); }
    }));
  } catch (e) { $('#reportes').innerHTML = `<li class="vacio">${esc(e.message)}</li>`; }
}

// ------------------------------------------------------------------ ejecutar
async function ejecutar() {
  const sql = $('#sql').value;
  const btn = $('#ejecutar');
  btn.disabled = true; $('#metricas').textContent = 'ejecutando…';
  ocultarError();
  try {
    const res = await api('/api/consulta', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ db: estado.db, sql }),
    });
    estado.res = res;
    $('#metricas').innerHTML = `<b>${fmtNum.format(res.total)}</b> filas · <b>${res.ms}</b> ms` +
      (res.truncado ? ` · <span style="color:var(--error)">truncado a ${fmtNum.format(res.limite)}</span>` : '');
    pintarTodo();
  } catch (e) {
    $('#metricas').textContent = '';
    mostrarError(e.message);
  } finally { btn.disabled = false; }
}

function mostrarError(m) { const e = $('#error'); e.textContent = m; e.hidden = false; }
function ocultarError() { $('#error').hidden = true; }

function esNumCol(i) {
  const filas = estado.res.filas;
  let hay = false;
  for (const f of filas) { const v = f[i]; if (v === null) continue; if (typeof v !== 'number') return false; hay = true; }
  return hay;
}
function formatear(col, v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') {
    if (RE_SOLES.test(col) && !RE_ID.test(col)) return 'S/ ' + fmtSoles.format(v);
    if (RE_ID.test(col)) return String(v);
    return fmtNum.format(v);
  }
  return String(v);
}

function pintarTodo() {
  pintarTabla();
  const { columnas, filas } = estado.res;
  $('#txt-csv').value = aCSV(columnas, filas);
  $('#txt-md').value = aMarkdown(columnas, filas);
  $('#txt-json').value = JSON.stringify(filas.map((f) => Object.fromEntries(columnas.map((c, i) => [c, f[i]]))), null, 2);
  $('#xlsx-nota').textContent = `${fmtNum.format(filas.length)} filas × ${columnas.length} columnas`;
  if (estado.pestana === 'grafico') pintarGrafico();
}

function pintarTabla() {
  const { columnas, filas } = estado.res;
  if (!columnas.length) { $('#tabla').innerHTML = '<p class="vacio">La consulta no devolvió columnas.</p>'; return; }
  const nums = columnas.map((_, i) => esNumCol(i));
  const max = Math.min(filas.length, 2000);
  let h = '<table><thead><tr>' + columnas.map((c) => `<th>${esc(c)}</th>`).join('') + '</tr></thead><tbody>';
  for (let r = 0; r < max; r++) {
    h += '<tr>' + filas[r].map((v, i) => {
      const t = formatear(columnas[i], v);
      return t === null ? '<td class="nulo">NULL</td>' : `<td class="${nums[i] ? 'num' : ''}">${esc(t)}</td>`;
    }).join('') + '</tr>';
  }
  h += '</tbody></table>';
  if (!filas.length) h += '<p class="vacio" style="padding:10px">0 filas.</p>';
  if (filas.length > max) h += `<p class="vacio" style="padding:10px">Mostrando ${max} de ${filas.length} filas (descárgalas todas en Excel o CSV).</p>`;
  $('#tabla').innerHTML = h;
}

function aCSV(cols, filas) {
  const c = (v) => { if (v === null) return ''; const s = String(v); return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  return [cols.map(c).join(','), ...filas.map((f) => f.map(c).join(','))].join('\n');
}
function aMarkdown(cols, filas) {
  const c = (v) => (v === null ? '' : String(v).replace(/\|/g, '\\|').replace(/\n/g, ' '));
  const nums = cols.map((_, i) => esNumCol(i));
  return ['| ' + cols.map(c).join(' | ') + ' |', '| ' + nums.map((n) => (n ? '---:' : '---')).join(' | ') + ' |',
    ...filas.map((f) => '| ' + f.map(c).join(' | ') + ' |')].join('\n');
}

// ------------------------------------------------------------------ gráfico
const PALETA = ['#e0b44c', '#5fb3b3', '#d97a6c', '#8fa8e8', '#9ccf7a', '#c79be0', '#f0a35e', '#7a8597'];
function pintarGrafico() {
  const nota = $('#graf-nota');
  if (!estado.res) { nota.textContent = 'Ejecuta una consulta primero.'; return; }
  if (!window.Chart) { nota.textContent = 'Chart.js no cargó (¿sin internet?). Usa la pestaña Tabla.'; return; }
  const { columnas, filas } = estado.res;
  const nums = columnas.map((c, i) => esNumCol(i) && !RE_ID.test(c));
  let iEt = columnas.findIndex((c, i) => !esNumCol(i));
  const series = columnas.map((c, i) => i).filter((i) => nums[i] && i !== iEt);
  if (!series.length) { nota.textContent = 'No hay columnas numéricas para graficar.'; if (estado.chart) estado.chart.destroy(); estado.chart = null; return; }
  const lim = Math.min(filas.length, 300);
  const etiquetas = filas.slice(0, lim).map((f, r) => (iEt >= 0 ? (f[iEt] ?? '(vacío)') : r + 1));
  const pareceFecha = iEt >= 0 && /^\d{4}-\d{2}/.test(String(filas[0]?.[iEt] ?? ''));
  let tipo = $('#tipo-graf').value;
  if (tipo === 'auto') tipo = pareceFecha || lim > 30 ? 'line' : 'bar';
  const usadas = tipo === 'pie' ? series.slice(0, 1) : series.slice(0, 6);
  // Si una serie es mucho menor que otra (p. ej. operaciones vs. soles), va al eje derecho.
  const maxDe = (i) => Math.max(...filas.slice(0, lim).map((f) => Math.abs(f[i] || 0)));
  const iMax = usadas.reduce((a, i) => (maxDe(i) > maxDe(a) ? i : a), usadas[0]);
  const m0 = maxDe(iMax);
  const datasets = usadas.map((i, k) => {
    const der = tipo !== 'pie' && i !== iMax && maxDe(i) * 8 < m0;
    return {
      label: columnas[i], data: filas.slice(0, lim).map((f) => f[i]), yAxisID: der ? 'y2' : 'y',
      backgroundColor: tipo === 'pie' ? etiquetas.map((_, j) => PALETA[j % PALETA.length]) : PALETA[k % PALETA.length] + (tipo === 'line' ? '33' : 'cc'),
      borderColor: PALETA[k % PALETA.length], borderWidth: 2, tension: 0.25, pointRadius: lim > 60 ? 0 : 3, fill: false,
    };
  });
  const usaDer = datasets.some((d) => d.yAxisID === 'y2');
  nota.textContent = `Etiquetas: ${iEt >= 0 ? columnas[iEt] : 'n.º de fila'} · series: ${usadas.map((i) => columnas[i]).join(', ')}` +
    (filas.length > lim ? ` · primeras ${lim} filas` : '') + (usaDer ? ' · eje derecho para series pequeñas' : '');
  if (estado.chart) estado.chart.destroy();
  const ejeTxt = { color: '#a3a6ae' }, rejilla = { color: '#2b303b' };
  const tick = (i) => (v) => (RE_SOLES.test(columnas[i]) ? 'S/ ' : '') + fmtNum.format(v);
  estado.chart = new Chart($('#grafico'), {
    type: tipo,
    data: { labels: etiquetas, datasets },
    options: {
      responsive: true, maintainAspectRatio: false, animation: { duration: 300 },
      plugins: { legend: { labels: { color: '#e9e6df' } },
        tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${formatear(c.dataset.label, c.raw)}` } } },
      scales: tipo === 'pie' ? {} : {
        x: { ticks: ejeTxt, grid: rejilla },
        y: { ticks: { ...ejeTxt, callback: tick(iMax) }, grid: rejilla, beginAtZero: true },
        ...(usaDer ? { y2: { position: 'right', ticks: ejeTxt, grid: { display: false }, beginAtZero: true } } : {}),
      },
    },
  });
}

// ------------------------------------------------------------------ descargas
function descargar(nombre, contenido, tipo) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([contenido], { type: tipo }));
  a.download = nombre; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
function nombreArchivo(ext) {
  const t = ($('#titulo-consulta').textContent || 'consulta').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'consulta';
  return `${estado.db}-${t}.${ext}`;
}

// ------------------------------------------------------------------ eventos
document.addEventListener('DOMContentLoaded', () => {
  $('#ejecutar').addEventListener('click', ejecutar);
  $('#limpiar').addEventListener('click', () => { $('#sql').value = ''; $('#titulo-consulta').textContent = 'Consulta SQL'; $('#sql').focus(); });
  $('#sql').addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); ejecutar(); }
    if (e.key === 'Tab') { e.preventDefault(); insertar('  '); }
  });
  $('#sql').addEventListener('input', () => { $('#titulo-consulta').textContent = 'Consulta SQL'; });
  $('#filtro').addEventListener('input', () => estado.esquema && pintarEsquema());
  $('#tipo-graf').addEventListener('change', pintarGrafico);
  document.querySelectorAll('.pestanas button').forEach((b) => b.addEventListener('click', () => {
    estado.pestana = b.dataset.p;
    document.querySelectorAll('.pestanas button').forEach((x) => x.classList.toggle('activa', x === b));
    document.querySelectorAll('.panel').forEach((p) => (p.hidden = p.dataset.panel !== b.dataset.p));
    if (b.dataset.p === 'grafico') pintarGrafico();
  }));
  document.querySelectorAll('[data-copiar]').forEach((b) => b.addEventListener('click', async () => {
    const t = document.getElementById(b.dataset.copiar);
    try { await navigator.clipboard.writeText(t.value); } catch { t.select(); document.execCommand('copy'); }
    aviso('Copiado al portapapeles');
  }));
  $('#btn-csv').addEventListener('click', () => estado.res && descargar(nombreArchivo('csv'), '﻿' + $('#txt-csv').value, 'text/csv;charset=utf-8'));
  $('#btn-xlsx').addEventListener('click', () => {
    if (!estado.res) return mostrarError('Ejecuta una consulta primero.');
    if (!window.XLSX) return mostrarError('SheetJS no cargó (¿sin internet?). Descarga el CSV y ábrelo en Excel.');
    const { columnas, filas } = estado.res;
    const hoja = XLSX.utils.aoa_to_sheet([columnas, ...filas]);
    hoja['!cols'] = columnas.map((c) => ({ wch: Math.max(10, c.length + 2) }));
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, (estado.db || 'consulta').slice(0, 31));
    XLSX.writeFile(libro, nombreArchivo('xlsx'));
    aviso('Excel generado');
  });
  iniciar();
});
