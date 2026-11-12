// Forja · intérprete léxico: texto libre en español -> familia, variante, cambios de parámetros y accesorios.
// Corre igual en el navegador (respaldo sin servidor) y en Node (el servidor lo combina con embeddings).
export const normaliza = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

// busca la frase como palabras completas; admite plural simple
function busca(texto, frase) {
  const m = new RegExp(`(^| )${frase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(s|es)?( |$)`).exec(texto);
  return m ? { i: m.index + (m[1] ? 1 : 0), n: m[0].trim().length } : null;
}
const tacha = (texto, h) => texto.slice(0, h.i) + ' '.repeat(h.n) + texto.slice(h.i + h.n);

export function interpretar(textoCrudo, lexico, modificadores) {
  let texto = normaliza(textoCrudo);
  const res = { familia: null, variante: null, cambios: {}, accesorios: [], entendido: [], resto: '' };
  const mejor = (lista) => {
    let top = null;
    for (const it of lista) for (const pal of it.pal) { const h = busca(texto, pal); if (h && (!top || h.i < top.h.i || (h.i === top.h.i && h.n > top.h.n))) top = { it, h, pal }; }
    return top;
  };
  // accesorios primero: «sombrero de mago» no debe convertir al personaje en mago
  for (const a of lexico.accesorios) for (const pal of [...a.pal].sort((x, y) => y.length - x.length)) {
    const h = busca(texto, pal); if (h) { res.accesorios.push(a.id); res.entendido.push({ tipo: 'accesorio', id: a.id, texto: pal }); texto = tacha(texto, h); break; }
  }
  // modificadores de varias palabras antes que familias («ojos grandes», «cabeza pequeña»)
  const mods = [...lexico.modificadores].sort((a, b) => b.length - a.length);
  for (const pal of mods.filter((p) => p.includes(' '))) { const h = busca(texto, pal); if (h) { Object.assign(res.cambios, modificadores[pal]); res.entendido.push({ tipo: 'rasgo', texto: pal }); texto = tacha(texto, h); } }
  const fam = mejor(lexico.familias);
  if (fam) { res.familia = fam.it.id; res.entendido.push({ tipo: 'familia', id: fam.it.id, texto: fam.pal }); texto = tacha(texto, fam.h); }
  const va = mejor(lexico.variantes);
  if (va) { res.variante = va.it.id; res.entendido.push({ tipo: 'variante', id: va.it.id, texto: va.pal }); texto = tacha(texto, va.h); }
  for (const pal of mods.filter((p) => !p.includes(' '))) { const h = busca(texto, pal); if (h) { Object.assign(res.cambios, modificadores[pal]); res.entendido.push({ tipo: 'rasgo', texto: pal }); texto = tacha(texto, h); } }
  res.resto = texto.replace(/\s+/g, ' ').trim();
  return res;
}

// convierte los «cambios» de las reglas de modificador en parámetros del resolver
export function aParams(cambios) {
  const p = {};
  for (const [k, v] of Object.entries(cambios)) {
    if (['altura', 'peso', 'cabeza', 'ojos', 'brazos', 'piernas', 'tono', 'luzAbs', 'satAbs', 'animo', 'expresion', 'patron'].includes(k)) p[k] = v;
  }
  return p;
}
