// Extractor por reglas: texto del cliente → negocio.json, SIN modelo de lenguaje.
// Es el respaldo cuando no hay cuota de IA: saca lo que el texto dice con patrones
// (nombre, rubro, ciudad, dirección, WhatsApp, correo, horario, servicios, precios,
// promoción, lema) y arma el JSON mínimo que entiende construir.mjs. Lo que no
// encuentra, no lo inventa: lo deja fuera o con un marcador «[completar]».
//
//   bun motor/extraer.mjs cliente.txt > negocio.json
//   bun motor/extraer.mjs cliente.txt --estilo express --salida negocio.json
//   cat cliente.txt | bun motor/extraer.mjs -
//
// Después: bun motor/construir.mjs --negocio negocio.json --estilo apple --imagenes no

import fs from 'node:fs';

export const RUBROS = [
  'cafetería', 'cafeteria', 'clínica dental', 'clinica dental', 'dentista', 'taller mecánico', 'taller mecanico', 'mecánica', 'gimnasio', 'gym',
  'veterinaria', 'peluquería', 'peluqueria', 'salón de belleza', 'barbería', 'barberia', 'panadería', 'panaderia', 'pastelería', 'academia de inglés',
  'academia de ingles', 'academia', 'estudio contable', 'contador', 'restaurante', 'restaurant', 'ferretería', 'ferreteria', 'lavandería', 'lavanderia',
  'florería', 'floreria', 'desarrollo de software', 'agencia digital', 'clínica estética', 'clinica estetica', 'spa', 'librería', 'libreria', 'cevichería',
  'cevicheria', 'pizzería', 'pizzeria', 'pollería', 'polleria', 'escuela de manejo', 'tienda de ropa', 'boutique', 'agencia de viajes', 'inmobiliaria',
  'farmacia', 'botica', 'óptica', 'optica', 'imprenta', 'carpintería', 'carpinteria', 'guardería', 'guarderia', 'consultorio', 'clínica', 'clinica',
  'hotel', 'hostal', 'minimarket', 'bodega', 'juguería', 'jugueria', 'heladería', 'heladeria', 'estudio de abogados', 'abogado', 'fotógrafo', 'fotografo',
  'estudio fotográfico', 'taller de bicicletas', 'lavado de autos', 'car wash', 'tienda', 'consultora', 'asesoría', 'asesoria',
];
const CIUDADES = ['Lima', 'Arequipa', 'Trujillo', 'Cusco', 'Chiclayo', 'Piura', 'Huancayo', 'Tacna', 'Iquitos', 'Juliaca', 'Puno', 'Ica', 'Cajamarca', 'Pucallpa', 'Chimbote', 'Huánuco', 'Ayacucho', 'Tarapoto', 'Callao', 'Huaraz', 'Sullana', 'Tumbes', 'Moquegua'];

const limpiar = (s) => String(s || '').replace(/\s+/g, ' ').replace(/^[\s:,.;-]+|[\s:,.;-]+$/g, '').trim();
const capital = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const sinTildes = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Primer grupo que capture alguno de los patrones, limpio. */
function primero(texto, patrones, max = 80) {
  for (const re of patrones) {
    const m = re.exec(texto);
    if (m && m[1]) {
      const v = limpiar(m[1].split(/\n/)[0]);
      if (v && v.length <= max) return v;
    }
  }
  return '';
}

export function extraer(textoBruto, opciones = {}) {
  const texto = String(textoBruto || '').replace(/\r/g, '');
  const avisos = [];
  const t = ' ' + texto + ' ';

  // ---- datos de contacto: patrones estrictos, nunca se inventan
  const digitos = (s) => s.replace(/\D/g, '');
  let whatsapp = '';
  let telefono = '';
  const mTel = /(?:\+?51[\s.-]?)?(9\d{2})[\s.-]?(\d{3})[\s.-]?(\d{3})\b/.exec(texto);
  if (mTel) {
    const nueve = mTel[1] + mTel[2] + mTel[3];
    whatsapp = '51' + nueve;
    telefono = `${nueve.slice(0, 3)} ${nueve.slice(3, 6)} ${nueve.slice(6)}`;
  } else {
    const mFijo = /\b(0?1)[\s.-]?(\d{3})[\s.-]?(\d{4})\b/.exec(texto);
    if (mFijo) telefono = `(0${digitos(mFijo[1]).replace(/^0/, '')}) ${mFijo[2]} ${mFijo[3]}`;
    avisos.push('No encontré un número de WhatsApp (9 dígitos): completa negocio.whatsapp.');
  }
  const correo = (/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/.exec(texto) || [''])[0].toLowerCase();

  const direccion = primero(t, [
    /(?:direcci[oó]n|local|estamos en|nos encuentras en|ubicados en|queda en)\s*(?:es|:)?\s*((?:av\.?|avenida|jr\.?|jir[oó]n|calle|ca\.|psje\.?|pasaje|mz\.?|urb\.?)[^\n.;]*?\d+[^\n.;]*)/i,
    /((?:av\.?|avenida|jr\.?|jir[oó]n|calle|psje\.?|pasaje)\s+[A-ZÁÉÍÓÚa-záéíóúñ][^\n.;]*?\d{1,5}[^\n.;]*)/,
  ], 120);

  let ciudad = '';
  for (const c of CIUDADES) if (new RegExp(`\\b${c}\\b`, 'i').test(sinTildes(texto)) || new RegExp(`\\b${c}\\b`, 'i').test(texto)) { ciudad = c; break; }

  const horario = primero(t, [
    /(?:horario|horarios|atendemos|abrimos|atenci[oó]n)\s*(?:es|son|:)?\s*((?:de\s+)?(?:lun|lunes|mar|mi[eé]|jue|vie|s[aá]b|dom|todos los d[ií]as|l-v|l-s)[^\n]*)/i,
    /\b((?:lun(?:es)?|l)\s*(?:a|-|–)\s*(?:vie(?:rnes)?|s[aá]b(?:ado)?|dom(?:ingo)?)[^\n.;]*\d[^\n.;]*)/i,
    /(?:horario|horarios)\s*(?:es|:)?\s*([^\n.;]{6,80})/i,
  ], 90);

  // ---- rubro: el primero de la lista que aparezca
  let rubro = '';
  const tx = sinTildes(texto.toLowerCase());
  for (const r of [...RUBROS].sort((a, b) => b.length - a.length)) {
    if (tx.includes(sinTildes(r))) { rubro = r; break; }
  }
  if (!rubro) { rubro = primero(t, [/(?:tengo|somos|soy due[nñ][oa] de|mi negocio es|negocio:)\s*(?:una?\s+)?([^\n.,;]{3,40})/i], 40).toLowerCase(); }

  // ---- nombre: lo que el cliente dice que se llama; si no, una frase con mayúsculas
  let nombre = primero(t, [
    /(?:se llama|el nombre es|nombre del negocio es|nombre:|nombre del negocio:|llamado|llamada)\s*([^\n.,;(]{2,50})/i,
    /\b([^\n.,;]{2,40}?)\s+es el nombre\b/i,
    /(?:mi (?:negocio|empresa|local|tienda|marca)|nuestro (?:negocio|local))\s+(?:es|se llama)\s+([^\n.,;(]{2,50})/i,
  ], 50);
  if (!nombre) {
    // frase de 2 a 4 palabras con mayúscula inicial, que no sea una ciudad ni una vía
    const m = /\b((?:[A-ZÁÉÍÓÚÑ][\wáéíóúñ&'-]+)(?:\s+(?:de|del|la|el|los|las|y|&)?\s*(?:[A-ZÁÉÍÓÚÑ][\wáéíóúñ&'-]+)){1,3})\b/.exec(texto);
    if (m && !CIUDADES.includes(m[1]) && !/^(Av|Jr|Calle|Lun|Lunes|Hola|Buenas|Gracias)\b/i.test(m[1])) nombre = m[1];
  }
  if (!nombre) { nombre = capital(rubro) || '[completar]'; avisos.push('No encontré el nombre del negocio: lo puse como «' + nombre + '».'); }
  nombre = nombre.replace(/\s+(es el nombre|y|que)$/i, '');

  const lema = primero(t, [/(?:lema|eslogan|slogan|nos diferencia|lo nuestro es|nos caracteriza)\s*(?:es|:)?\s*([^\n.;]{4,70})/i], 70);

  // ---- servicios: viñetas, o la lista tras «ofrecemos / hacemos / servicios / vendemos»
  let servicios = [];
  const vinetas = [...texto.matchAll(/^\s*[-•*·]\s*(.+)$/gm)].map((m) => m[1]);
  const listaInline = /(?:ofrecemos|hacemos|servicios|vendemos|lo que vendemos|productos|trabajamos con|nos dedicamos a)\s*:?\s*([^\n]+)/i.exec(texto);
  // La lista en línea termina donde empiezan precios, promo, horario o una pregunta.
  const corte = (s) => s.split(/\.?\s*(?:precios?|tarifas?|promo(?:ci[oó]n)?|oferta|horario|¿)\b/i)[0];
  const items = vinetas.length >= 2 ? vinetas.map(corte) : listaInline ? corte(listaInline[1]).split(/;|,(?![^(]*\))| y (?=[A-ZÁÉÍÓÚ])/) : [];
  for (const it of items) {
    let s = limpiar(it);
    if (!s || /^(precios?|tarifas?|promo|oferta|horario)/i.test(s)) continue;
    let titulo = s, textoItem = '';
    const par = /^(.*?)\s*\((.*)\)\s*$/.exec(s);
    const dosPuntos = /^([^:]{2,50}):\s*(.+)$/.exec(s);
    if (par) { titulo = par[1]; textoItem = par[2]; } else if (dosPuntos) { titulo = dosPuntos[1]; textoItem = dosPuntos[2]; }
    titulo = capital(limpiar(titulo).replace(/\s*S\/\s*\d+.*$/, ''));
    if (titulo.length > 2 && titulo.length <= 60) servicios.push({ titulo, texto: capital(limpiar(textoItem)) });
  }
  servicios = servicios.slice(0, 6);
  if (!servicios.length) avisos.push('No encontré la lista de servicios: agrega items en secciones[0].');

  // ---- precios: «Nombre S/ 25» o «S/ 25 ...»
  const precios = [];
  // La línea de la promoción no cuenta como lista de precios («antes S/ 24» no es un servicio).
  const textoSinPromo = texto.replace(/\b(?:promo(?:ci[oó]n)?|oferta)\b[^\n]*?(?=\.\s|\n|$)/gi, '');
  for (const m of textoSinPromo.matchAll(/([A-Za-zÁÉÍÓÚáéíóúñ0-9][^\n,;:()]{2,40}?)\s+(S\/\.?\s*\d+(?:[.,]\d{2})?)/g)) {
    const nombreP = capital(limpiar(m[1]).replace(/^(precios?|tarifas?|cobramos|desde|a|por)\s+/i, ''));
    if (nombreP.length >= 3 && !/^(antes|normal|precio)$/i.test(nombreP)) precios.push({ nombre: nombreP, precio: m[2].replace(/S\/\.?\s*/, 'S/ ') });
  }
  // ---- promoción
  let oferta = null;
  const mOf = /(?:promo(?:ci[oó]n)?|oferta)\s*:?\s*([^\n]+)/i.exec(texto);
  if (mOf) {
    const linea = mOf[1];
    const ps = [...linea.matchAll(/S\/\.?\s*(\d+(?:[.,]\d{2})?)/g)].map((x) => 'S/ ' + x[1]);
    oferta = {
      etiqueta: 'Promoción',
      titulo: capital(limpiar(linea.split(/\s+(?:a|por)\s+S\//i)[0].replace(/S\/\.?\s*\d+.*$/, '')) || 'Promoción del momento'),
      precio: ps[0] || '',
      antes: ps[1] || '',
      detalle: '',
      vigencia: (/(hasta[^\n,;.]*|solo esta semana|este mes|fin de mes)/i.exec(linea) || [''])[0],
      cta: 'Lo quiero',
    };
    if (!oferta.precio) oferta = null;
  }
  // ---- preguntas frecuentes: «¿...? respuesta.»
  const preguntas = [];
  for (const m of texto.matchAll(/(¿[^?]{5,90}\?)\s*([^¿\n]{3,120}?[.!])/g)) preguntas.push({ pregunta: limpiar(m[1]), respuesta: limpiar(m[2]) });

  const marcada = (s) => (s.includes('*') ? s : s.replace(/^(\S+)/, '*$1*'));
  const nombreCorto = nombre.split(' ')[0];
  const menu = /caf|restaur|cevich|pizz|poll|panad|past|juguer|helad/.test(rubro) ? 'Carta' : /dent|est[eé]tic|cl[ií]nic|spa|vet/.test(rubro) ? 'Tratamientos' : /tienda|boutique|ferret|librer|minimarket|bodega|farmacia|botica/.test(rubro) ? 'Productos' : /academ|escuela|curso/.test(rubro) ? 'Cursos' : 'Servicios';
  const negocio = { nombre, rubro: rubro || '[completar]', ciudad, whatsapp, telefono, correo, direccion, horario };
  if (lema) negocio.lema = capital(lema);
  for (const k of Object.keys(negocio)) if (!negocio[k]) delete negocio[k];
  const secciones = [
    { tipo: 'caracteristicas', id: 'servicios', menu, titulo: `Lo que *hacemos* en ${nombreCorto}`, items: servicios.length ? servicios : [{ titulo: '[completar]', texto: '' }] },
  ];
  if (precios.length) secciones.push({ tipo: 'precios', id: 'precios', menu: 'Precios', titulo: 'Precios *claros*', items: precios.slice(0, 8) });
  if (preguntas.length) secciones.push({ tipo: 'preguntas', id: 'preguntas', titulo: 'Preguntas *frecuentes*', items: preguntas.slice(0, 6) });
  secciones.push({ tipo: 'contacto', id: 'contacto', menu: 'Contacto', titulo: 'Escríbenos', texto: horario ? `Atendemos ${horario.replace(/^(de\s+)?/i, '')}.` : 'Escríbenos por WhatsApp y te respondemos.' });

  const lugar = direccion ? direccion.split(',').pop().trim() : ciudad;
  const salida = {
    estilo: opciones.estilo || 'apple',
    negocio,
    marca: { logo_texto: nombre },
    hero: {
      antetitulo: ciudad ? `En ${lugar || ciudad}` : '',
      titulo: marcada(lema ? capital(lema) + '.' : `${capital(rubro || 'Tu negocio')} en ${ciudad || 'tu ciudad'}.`),
      subtitulo: servicios.length ? servicios.slice(0, 3).map((s) => s.titulo).join(', ') + (ciudad ? ` en ${ciudad}.` : '.') : '',
      cta: { texto: 'Escríbenos por WhatsApp', corto: 'Escríbenos', mensaje: `Hola, vi la página de ${nombre} y quiero información.` },
      cta2: { texto: `Ver ${menu.toLowerCase()}`, ancla: '#servicios' },
      imagen: 'hero',
    },
    oferta,
    secciones,
    imagenes: { hero: { descripcion: `Imagen principal de ${nombre}`, prompt: `${sinTildes(rubro || 'small business')} storefront interior, clean, warm light, no people`, orientacion: 'horizontal' } },
  };
  return { negocio: salida, avisos };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const archivo = args.find((a) => !a.startsWith('--'));
  const opt = (k) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : undefined; };
  if (!archivo) { console.error('Uso: bun motor/extraer.mjs cliente.txt [--estilo apple] [--salida negocio.json]'); process.exit(2); }
  const texto = archivo === '-' ? fs.readFileSync(0, 'utf8') : fs.readFileSync(archivo, 'utf8');
  const { negocio, avisos } = extraer(texto, { estilo: opt('estilo') });
  const json = JSON.stringify(negocio, null, 2);
  const salida = opt('salida');
  if (salida) fs.writeFileSync(salida, json + '\n'); else console.log(json);
  for (const a of avisos) console.error('aviso: ' + a);
  if (salida) console.error(`OK ${salida} · ${negocio.secciones.length} secciones · siguiente: bun motor/construir.mjs --negocio ${salida} --estilo ${negocio.estilo} --imagenes no`);
}
