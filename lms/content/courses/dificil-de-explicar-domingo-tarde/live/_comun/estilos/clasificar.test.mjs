// Prueba del clasificador con 30 frases de vendedores peruanos.
//   /opt/homebrew/bin/node live/_comun/estilos/clasificar.test.mjs
// Cada frase lleva el pack esperado y, cuando la frase admite dos lecturas razonables, una alternativa válida.
import { clasificar, contraste } from '../estilos-clasificar.js';

const CASOS = [
  ['perfume árabe de lujo para mujer, dorado y negro', ['oud-oriental']],
  ['vendo perfumes originales y decants, envíos a todo Lima', ['lujo-noir-dorado']],
  ['fragancias para caballero, aroma amaderado e intenso, presentación de regalo', ['lujo-noir-dorado']],
  ['cremas naturales de sábila y jabones artesanales sin químicos', ['botanico-natural', 'artesanal-manos']],
  ['skincare coreano, sérums y labiales, todo en rosa palo', ['belleza-nude']],
  ['salón de uñas y pestañas en Los Olivos, separa tu cita', ['belleza-nude']],
  ['ropa de mujer por mayor en Gamarra, blusas y vestidos de temporada', ['moda-editorial']],
  ['zapatillas urbanas y polos oversize, drop de edición limitada', ['urbano-impacto']],
  ['tienda vintage de ropa americana de segunda mano, estilo setentero', ['retro-setentero']],
  ['marca de ropa minimalista, básicos de algodón en colores neutros', ['minimal-galeria', 'moda-editorial']],
  ['pollo a la brasa con papas fritas y ensalada, delivery en SJL', ['comida-callejera']],
  ['hamburguesas a la parrilla y alitas picantes, promo 2x1 los jueves', ['comida-callejera']],
  ['cevichería en Chorrillos: ceviche, chicharrón de pescado y leche de tigre', ['criollo-peruano']],
  ['menú del día casero, lomo saltado y ají de gallina, sazón de la abuela', ['criollo-peruano']],
  ['tortas personalizadas para cumpleaños y mesas de dulces', ['pasteleria-fina']],
  ['alfajores y cheesecake de fresa por encargo', ['pasteleria-fina']],
  ['café de Chanchamayo tostado en grano, cafetería de especialidad', ['cafe-artesanal']],
  ['panadería artesanal, pan de masa madre recién horneado', ['cafe-artesanal', 'artesanal-manos']],
  ['espresso bar nocturno, ambiente oscuro y elegante', ['cafe-nocturno']],
  ['jugos naturales y batidos de frutas tropicales, mango y maracuyá', ['tropical-vibrante']],
  ['bar de cócteles con pisco sour y chilcano, happy hour', ['coctel-nocturno']],
  ['reparación de celulares y laptops, servicio técnico garantizado', ['tech-oscuro']],
  ['laptops gamer y accesorios con luces RGB', ['tech-oscuro']],
  ['sistema de facturación electrónica y punto de venta para bodegas', ['saas-claro']],
  ['curso de Excel con inteligencia artificial, clases online en vivo', ['saas-claro']],
  ['estudio contable, asesoría tributaria para empresas', ['corporativo-sobrio']],
  ['inmobiliaria: departamentos de estreno en Miraflores, azul marino y dorado', ['corporativo-sobrio']],
  ['consultorio dental, limpieza y blanqueamiento con garantía', ['servicio-cercano']],
  ['velas aromáticas de soya y cerámica hecha a mano', ['artesanal-manos']],
  ['decoración de bodas y eventos, elegante en blanco y dorado', ['lujo-marfil']],
];

let aciertos = 0;
const fallos = [];
for (const [frase, esperados] of CASOS) {
  const r = clasificar(frase);
  const ok = esperados.includes(r.id);
  const p = r.pack.paleta;
  const aa = contraste(p.texto, p.fondo) >= 4.5 && contraste(p.sobre_acento, p.acento) >= 4.5 && contraste(p.acento, p.fondo) >= 3 && contraste(p.texto_suave, p.fondo) >= 4.5;
  if (ok) aciertos++; else fallos.push({ frase, esperados, obtenido: r.id, alternativas: r.alternativas, motivos: r.motivos });
  const col = r.colores.length ? ' · colores: ' + r.colores.map((c) => c.nombre).join(', ') : '';
  console.log(`${ok ? '✓' : '✗'} ${r.id.padEnd(19)} ${String(r.puntaje).padStart(5)} ${aa ? 'AA' : '!!'}  ${frase}${col}${r.ajustes.length ? ' → ' + r.ajustes.join('; ') : ''}`);
  if (!aa) { console.log('   contraste roto', p); process.exitCode = 1; }
}
console.log(`\nAciertos: ${aciertos}/${CASOS.length}`);
for (const f of fallos) console.log('\n✗', f.frase, '\n  esperado', f.esperados.join('|'), 'obtenido', f.obtenido, '\n  ', f.motivos.join(' · '), '\n  alt', f.alternativas.map((a) => a.id + ' ' + a.puntaje).join(', '));
if (aciertos < 27) process.exitCode = 1;
