// Validación del JSON del negocio: mensajes en español que un modelo pequeño pueda corregir.
const TIPOS = ['cifras', 'caracteristicas', 'pasos', 'galeria', 'precios', 'testimonios', 'preguntas', 'contacto'];

export function validar(n) {
  const p = [];
  const hay = (v) => v !== undefined && v !== null && String(v).trim() !== '';
  if (!n || typeof n !== 'object') return ['El archivo no es un objeto JSON.'];
  if (!n.negocio) p.push('Falta «negocio» (nombre, rubro, whatsapp…).');
  else {
    if (!hay(n.negocio.nombre)) p.push('Falta negocio.nombre.');
    if (!hay(n.negocio.rubro)) p.push('Falta negocio.rubro (ej.: «cafetería de especialidad»).');
    if (hay(n.negocio.whatsapp) && !/^\d{9,15}$/.test(String(n.negocio.whatsapp))) {
      p.push('negocio.whatsapp debe ser solo dígitos con código de país, sin + ni espacios (ej.: 51986149476).');
    }
  }
  if (!n.hero) p.push('Falta «hero» (titulo, subtitulo, cta).');
  else if (!hay(n.hero.titulo)) p.push('Falta hero.titulo.');
  const imgs = n.imagenes || {};
  const usada = (clave, donde) => {
    if (!hay(clave)) return;
    if (!imgs[clave]) p.push(`${donde} usa la imagen «${clave}», que no está en «imagenes».`);
  };
  if (n.hero) usada(n.hero.imagen, 'hero.imagen');
  (n.secciones || []).forEach((s, i) => {
    const d = `secciones[${i}]`;
    if (!TIPOS.includes(s.tipo)) p.push(`${d}.tipo «${s.tipo}» no existe. Usa uno de: ${TIPOS.join(', ')}.`);
    (s.items || []).forEach((it, j) => usada(it.imagen, `${d}.items[${j}].imagen`));
    (s.imagenes || []).forEach((k, j) => usada(k, `${d}.imagenes[${j}]`));
    if (s.tipo === 'testimonios' && (s.items || []).some((t) => !t.real)) {
      p.push(`${d}: cada testimonio necesita "real": true (solo testimonios que el cliente entregó; no se inventan).`);
    }
  });
  for (const [k, im] of Object.entries(imgs)) {
    if (!hay(im.archivo) && !hay(im.prompt)) p.push(`imagenes.${k} necesita «prompt» (en inglés) o «archivo».`);
    if (im.semilla !== undefined && !Number.isInteger(im.semilla)) p.push(`imagenes.${k}.semilla debe ser un número entero (cámbialo para obtener otra versión de la imagen).`);
    if (im.prompt && /\b(face|faces|smile|smiling|teeth|tooth|mouth|lips|hands?|fingers?|portrait|close[- ]?up of a (man|woman|person|girl|boy))\b/i.test(im.prompt)) {
      p.push(`imagenes.${k}: el prompt pide caras, sonrisas, dientes o manos; el modelo de la clase las deforma. Muestra objetos, espacios o personas de espaldas y lejos.`);
    }
    if (im.orientacion && !['cuadrado', 'horizontal', 'vertical'].includes(im.orientacion)) {
      p.push(`imagenes.${k}.orientacion debe ser cuadrado, horizontal o vertical.`);
    }
  }
  return p;
}
