// Forja · el aula del alumno en jmd-learn.online. Cuando la Forja corre dentro del LMS (mismo origen, con sesión),
// el juego se guarda en /trabajo/juego-<plantilla>/ del aula del alumno: el Visor del LIVE lo muestra como un proyecto
// más y el alumno lo recupera desde cualquier computadora. Fuera del LMS (en local) estas funciones devuelven null
// y la Forja sigue igual: ZIP y localStorage.
//
//   POST /api/v1/aula/proyecto {carpeta, archivos:[{ruta, b64}]}   escribe la carpeta (el LMS valida rutas y tipos)
//   GET  /api/v1/vista/proyectos                                     carpetas con index.html del aula del alumno
//   GET  /vista/<sub>/<carpeta>/forja.json                           lo que la Forja necesita para volver a abrirlo

const pedir = (ruta, op = {}) => fetch(ruta, { credentials: 'same-origin', ...op });
let yo;   // undefined = sin preguntar; null = sin sesión del LMS
export async function sesion() {
  if (yo !== undefined) return yo;
  try { const r = await pedir('/api/v1/me', { headers: { Accept: 'application/json' } }); yo = r.ok ? await r.json() : null; }
  catch { yo = null; }
  if (yo && !yo.id) yo = null;
  return yo;
}

export const carpetaDe = (plantilla) => `juego-${String(plantilla).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'forja'}`;

function base64(datos) {
  const b = typeof datos === 'string' ? new TextEncoder().encode(datos) : datos instanceof Uint8Array ? datos : new Uint8Array(datos);
  let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
  return btoa(s);
}

// archivos: [{ nombre, datos }] (los mismos del ZIP); ficha: lo que va en forja.json para recuperarlo.
export async function guardarEnAula(plantilla, archivos, ficha) {
  const u = await sesion(); if (!u) throw new Error('abre la Forja desde jmd-learn.online con tu sesión iniciada');
  const carpeta = carpetaDe(plantilla);
  const lista = [...archivos, { nombre: 'forja.json', datos: JSON.stringify({ forja: 1, plantilla, guardado: new Date().toISOString(), ...ficha }, null, 1) }]
    .map((a) => ({ ruta: a.nombre, b64: base64(a.datos) }));
  const r = await pedir('/api/v1/aula/proyecto', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ carpeta, archivos: lista }) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.message || d.error || `el aula respondió ${r.status}`);
  return { ...d, visor: `/vista/${encodeURIComponent(d.sub)}/${carpeta}/index.html` };
}

// Los juegos de la Forja que el alumno tiene en su aula, del más reciente al más antiguo.
export async function misJuegos() {
  const u = await sesion(); if (!u) return [];
  let lista = [];
  try { const r = await pedir('/api/v1/vista/proyectos'); if (r.ok) lista = await r.json(); } catch { return []; }
  const carpetas = [...new Set((lista || []).map((p) => String(p.ruta || '').split('/')[0]).filter((c) => /^juego-[a-z0-9-]+$/.test(c)))];
  const fichas = await Promise.all(carpetas.map(async (c) => {
    try {
      const r = await pedir(`/vista/${encodeURIComponent(u.id)}/${c}/forja.json?t=${Date.now()}`);
      if (!r.ok) return null; const f = await r.json(); if (!f || f.forja !== 1 || !f.estado) return null;
      return { carpeta: c, visor: `/vista/${encodeURIComponent(u.id)}/${c}/index.html`, ...f };
    } catch { return null; }
  }));
  return fichas.filter(Boolean).sort((a, b) => String(b.guardado).localeCompare(String(a.guardado)));
}
