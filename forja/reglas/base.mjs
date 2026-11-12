// Forja · tablas base. De aquí el compilador (compilar.mjs) expande las más de 10 000 reglas concretas.
// Todo es dato: nada de esto dibuja. Unidades: 1 = alto típico de un torso.

// f(id, nombre, rig, sinónimos, descripción para el buscador, tono base, rasgos)
const f = (id, nombre, rig, sin, desc, tono, r = {}) => ({
  id, nombre, rig, sin, desc, tono,
  sat: 0.62, luz: 0.58, torso: 'capsula', cabeza: 'esfera', tw: 0.8, th: 1, cab: 0.62, brazo: 0.7, pierna: 0.6,
  orejas: 'ninguna', cola: 'ninguna', cuernos: 0, alas: 'ninguna', antenas: 0, hocico: 'ninguno', ojos: 2, ojo: 'redondo',
  kPeso: 1, kAlto: 1, fijo: [], ...r,
});

export const FAMILIAS = [
  // ---- bípedos
  f('aventurero', 'Aventurero', 'bipedo', ['humano', 'persona', 'explorador', 'heroe', 'chico', 'chica', 'nino', 'nina'], 'persona aventurera, héroe humano explorador con mochila', 196, { humano: 1, fijo: ['mochila'], sat: 0.5 }),
  f('guerrero', 'Guerrero', 'bipedo', ['caballero', 'soldado', 'luchador', 'gladiador', 'paladin'], 'guerrero caballero con armadura, espada y escudo', 215, { humano: 1, tw: 0.95, fijo: ['casco', 'espada'], kPeso: 1.15 }),
  f('mago', 'Mago', 'bipedo', ['hechicero', 'brujo', 'bruja', 'wizard', 'hechicera'], 'mago hechicero con sombrero puntiagudo, túnica y varita', 268, { humano: 1, torso: 'cono', fijo: ['sombrero_mago', 'varita'], pierna: 0.35 }),
  f('ninja', 'Ninja', 'bipedo', ['shinobi', 'asesino', 'sigiloso'], 'ninja sigiloso con máscara y bufanda, ágil y rápido', 235, { tw: 0.68, luz: 0.3, sat: 0.35, fijo: ['mascara', 'bufanda'], ojo: 'enojado', kPeso: 0.8 }),
  f('astronauta', 'Astronauta', 'bipedo', ['cosmonauta', 'espacial', 'astro'], 'astronauta con traje espacial blanco y casco de burbuja', 205, { tw: 0.95, sat: 0.18, luz: 0.86, cab: 0.7, fijo: ['burbuja', 'jetpack'] }),
  f('pirata', 'Pirata', 'bipedo', ['corsario', 'bucanero', 'capitan'], 'pirata capitán con parche en el ojo, sombrero y espada', 8, { humano: 1, fijo: ['parche', 'gorro'], sat: 0.7 }),
  f('duende', 'Duende', 'bipedo', ['elfo', 'goblin', 'trasgo'], 'duende travieso de orejas largas y puntiagudas, pequeño y verde', 118, { th: 0.8, cab: 0.72, orejas: 'punta', pierna: 0.45, kAlto: 0.8 }),
  f('zombi', 'Zombi', 'bipedo', ['zombie', 'muerto viviente', 'no muerto'], 'zombi muerto viviente verdoso que camina con los brazos estirados', 95, { sat: 0.32, luz: 0.5, ojo: 'dormilon', brazo: 0.8 }),
  f('esqueleto', 'Esqueleto', 'bipedo', ['calavera', 'huesos', 'craneo'], 'esqueleto de huesos blancos con calavera sonriente', 48, { tw: 0.55, sat: 0.1, luz: 0.9, ojo: 'hueco', kPeso: 0.5 }),
  f('vampiro', 'Vampiro', 'bipedo', ['dracula', 'chupasangre', 'nosferatu'], 'vampiro elegante de capa oscura, colmillos y piel pálida', 350, { humano: 1, sat: 0.55, luz: 0.36, orejas: 'punta', fijo: ['capa'], ojo: 'enojado' }),
  f('robot', 'Robot', 'bipedo', ['bot', 'maquina', 'automata', 'mecha'], 'robot de metal con cuerpo cuadrado, antenas y ojos de luz', 195, { torso: 'caja', cabeza: 'caja', sat: 0.28, luz: 0.66, antenas: 2, ojo: 'robot', kPeso: 1.1 }),
  f('androide', 'Androide', 'bipedo', ['cyborg', 'humanoide', 'ciborg'], 'androide cyborg estilizado con visor brillante y cuerpo liso', 178, { tw: 0.7, sat: 0.45, luz: 0.74, ojo: 'visor', antenas: 1 }),
  f('alien', 'Alien', 'bipedo', ['extraterrestre', 'marciano', 'alienigena', 'ovni'], 'alien extraterrestre verde de cabeza grande, ojos enormes y antenas', 135, { tw: 0.6, cab: 0.86, antenas: 2, ojo: 'ovalado', brazo: 0.8, kPeso: 0.7 }),
  f('hada', 'Hada', 'bipedo', ['ninfa', 'pixie', 'hadita'], 'hada pequeña con alas brillantes y varita mágica', 312, { humano: 1, th: 0.8, tw: 0.6, alas: 'hada', orejas: 'punta', fijo: ['varita'], luz: 0.72, kAlto: 0.75, kPeso: 0.6 }),
  f('ogro', 'Ogro', 'bipedo', ['troll', 'gigante', 'bestia', 'orco'], 'ogro enorme y fuerte, de brazos largos, cuernos y colmillos', 84, { tw: 1.25, th: 1.15, cab: 0.55, brazo: 0.95, cuernos: 2, ojo: 'enojado', kPeso: 1.4, kAlto: 1.25 }),
  f('gnomo', 'Gnomo', 'bipedo', ['enano', 'gnomito', 'duendecillo'], 'gnomo bajito de barba blanca con gorro puntiagudo', 4, { humano: 1, th: 0.7, tw: 0.9, cab: 0.7, pierna: 0.3, fijo: ['gorro', 'barba'], kAlto: 0.65, kPeso: 1.1 }),
  f('escuadron', 'Héroe de escuadrón', 'bipedo', ['ranger', 'power ranger', 'sentai', 'escuadron', 'heroe de color', 'patrullero'], 'héroe de escuadrón con traje de color, casco con visor y cinturón, pelea en equipo', 0, { sat: 0.82, luz: 0.5, ojo: 'visor', fijo: ['casco', 'cinturon'], tw: 0.78 }),
  f('samurai', 'Samurái', 'bipedo', ['samurai', 'ronin', 'bushido', 'espadachin japones'], 'samurái con armadura, casco con cuernos y katana', 355, { humano: 1, sat: 0.6, luz: 0.4, cuernos: 2, fijo: ['casco', 'espada', 'cinturon'], ojo: 'enojado', tw: 0.9 }),
  f('superheroe', 'Superhéroe', 'bipedo', ['super heroe', 'heroina', 'justiciero', 'vengador', 'enmascarado'], 'superhéroe con capa al viento, antifaz y pecho fuerte', 225, { humano: 1, sat: 0.8, tw: 0.98, th: 1.05, fijo: ['capa', 'antifaz', 'cinturon'], kPeso: 1.1 }),
  f('vaquero', 'Vaquero', 'bipedo', ['cowboy', 'sheriff', 'pistolero', 'forajido'], 'vaquero del oeste con sombrero de ala ancha y pañuelo', 356, { humano: 1, sat: 0.5, luz: 0.5, fijo: ['sombrero_ala', 'bufanda', 'cinturon'] }),
  f('futbolista', 'Futbolista', 'bipedo', ['jugador', 'delantero', 'goleador', 'arquero', 'crack', 'pelotero'], 'futbolista jugador de fútbol con camiseta, medias y balón', 140, { humano: 1, sat: 0.75, pierna: 0.72, fijo: ['balon'], tw: 0.76 }),
  // ---- cuadrúpedos
  f('gato', 'Gato', 'cuadrupedo', ['gatito', 'michi', 'minino', 'felino', 'gata'], 'gato gatito tierno de orejas triangulares, bigotes y cola larga', 30, { orejas: 'gato', cola: 'larga', hocico: 'corto' }),
  f('perro', 'Perro', 'cuadrupedo', ['perrito', 'cachorro', 'can', 'firulais', 'perra'], 'perro cachorro juguetón de orejas caídas y cola alegre', 34, { orejas: 'caida', cola: 'corta', hocico: 'largo', sat: 0.5 }),
  f('zorro', 'Zorro', 'cuadrupedo', ['zorrito', 'fox', 'vulpino'], 'zorro astuto naranja de cola esponjosa y hocico fino', 20, { orejas: 'gato', cola: 'pompon', hocico: 'largo', sat: 0.78, tw: 0.7 }),
  f('oso', 'Oso', 'cuadrupedo', ['osito', 'panda', 'osezno', 'peluche'], 'oso grande y redondo de orejas redondas, fuerte y abrazable', 26, { orejas: 'redonda', cola: 'corta', hocico: 'corto', tw: 1.15, sat: 0.42, luz: 0.42, kPeso: 1.35 }),
  f('dinosaurio', 'Dinosaurio', 'cuadrupedo', ['dino', 'rex', 'saurio', 'reptil', 'lagarto'], 'dinosaurio reptil verde con cresta en la espalda y cola gruesa', 110, { cola: 'dragon', hocico: 'largo', cresta: 1, tw: 0.95 }),
  f('dragon', 'Dragón', 'cuadrupedo', ['dragoncito', 'wyvern', 'draco'], 'dragón con alas, cuernos y cola larga que lanza fuego', 6, { cola: 'dragon', alas: 'murcielago', cuernos: 2, hocico: 'largo', cresta: 1, sat: 0.74 }),
  f('unicornio', 'Unicornio', 'cuadrupedo', ['caballo', 'pony', 'poni', 'pegaso', 'corcel'], 'unicornio caballo mágico blanco de crin de colores y un cuerno', 300, { cola: 'pompon', cuernos: 1, hocico: 'largo', orejas: 'gato', sat: 0.3, luz: 0.9, pierna: 0.85 }),
  f('cerdito', 'Cerdito', 'cuadrupedo', ['cerdo', 'chancho', 'puerco', 'chanchito', 'cochinito'], 'cerdito rosado y gordito de nariz chata y cola enroscada', 342, { orejas: 'caida', cola: 'corta', hocico: 'chato', tw: 1.1, luz: 0.76, pierna: 0.4, kPeso: 1.3 }),
  f('tortuga', 'Tortuga', 'cuadrupedo', ['tortuguita', 'galapago', 'caparazon'], 'tortuga lenta de caparazón duro y patas cortas', 142, { cola: 'corta', caparazon: 1, tw: 1.1, pierna: 0.32, hocico: 'corto', kPeso: 1.2 }),
  f('rana', 'Rana', 'cuadrupedo', ['sapo', 'ranita', 'sapito', 'anfibio'], 'rana verde saltarina de ojos saltones sobre la cabeza', 125, { ojo: 'saltones', tw: 1, pierna: 0.45, cab: 0.7, luz: 0.56 }),
  f('raton', 'Ratón', 'cuadrupedo', ['ratoncito', 'raton', 'mickey', 'mouse', 'roedor', 'laucha', 'pericote'], 'ratón de orejas redondas enormes, hocico pequeño y cola fina', 20, { orejas: 'redonda', orejaK: 1.7, cola: 'larga', hocico: 'corto', sat: 0.18, luz: 0.5, tw: 0.72, cab: 0.72, pierna: 0.45, kPeso: 0.8 }),
  f('conejo', 'Conejo', 'cuadrupedo', ['conejito', 'liebre', 'bunny'], 'conejo de orejas largas y paradas, cola de pompón y dientes grandes', 32, { orejas: 'larga', cola: 'pompon', hocico: 'corto', sat: 0.2, luz: 0.86, tw: 0.82 }),
  f('leon', 'León', 'cuadrupedo', ['leoncito', 'rey de la selva', 'tigre', 'felino grande'], 'león de gran melena dorada, fuerte y valiente', 38, { orejas: 'redonda', cola: 'pompon', hocico: 'corto', melena: 1, sat: 0.72, luz: 0.58, tw: 1, kPeso: 1.2 }),
  f('mono', 'Mono', 'bipedo', ['monito', 'chimpance', 'gorila', 'simio', 'macaco'], 'mono travieso de brazos largos, orejas redondas y cola larga', 24, { orejas: 'redonda', cola: 'larga', hocico: 'corto', brazo: 0.95, pierna: 0.42, sat: 0.5, luz: 0.4, panza: 0, ojo: 'redondo' }),
  // ---- aves
  f('abeja', 'Abeja', 'ave', ['abejita', 'avispa', 'insecto', 'bicho', 'mariquita'], 'abeja amarilla con rayas negras, alitas transparentes y antenas', 48, { torso: 'esfera', alas: 'ave', antenas: 2, sat: 0.9, luz: 0.58, rayas: 1, patronBase: 'rayas', cab: 0.66 }),
  f('pollito', 'Pollito', 'ave', ['pollo', 'gallina', 'pio', 'gallo'], 'pollito amarillo redondo con pico pequeño y alitas', 50, { hocico: 'pico', alas: 'ave', torso: 'esfera', sat: 0.85, luz: 0.64, cresta: 1 }),
  f('pinguino', 'Pingüino', 'ave', ['pinguinito', 'pajaro bobo'], 'pingüino blanco y negro de panza blanca que camina balanceándose', 220, { hocico: 'pico', alas: 'ave', sat: 0.25, luz: 0.24, th: 1.15, panza: 1 }),
  f('buho', 'Búho', 'ave', ['lechuza', 'tecolote', 'mochuelo'], 'búho sabio de ojos enormes y plumas en forma de orejas', 32, { hocico: 'pico', alas: 'ave', orejas: 'punta', ojo: 'ovalado', sat: 0.4, luz: 0.45, cab: 0.8, panza: 1 }),
  f('loro', 'Loro', 'ave', ['papagayo', 'perico', 'guacamayo', 'pajaro', 'ave', 'colibri'], 'loro pájaro tropical de plumas de colores y pico curvo', 150, { hocico: 'pico', alas: 'ave', cola: 'larga', sat: 0.85, cresta: 1, tw: 0.7 }),
  // ---- flotantes
  f('fantasma', 'Fantasma', 'flotante', ['espectro', 'espiritu', 'alma', 'bu'], 'fantasma blanco translúcido que flota, con sábana ondulada', 210, { torso: 'gota', sat: 0.1, luz: 0.94, ojo: 'hueco', translucido: 1, brazo: 0.4 }),
  f('medusa', 'Medusa', 'flotante', ['aguaviva', 'malagua', 'pulpo', 'calamar'], 'medusa marina con cabeza de campana y tentáculos que ondulan', 290, { torso: 'campana', tentaculos: 6, translucido: 1, luz: 0.72, brazo: 0 }),
  f('nube', 'Nube', 'flotante', ['nubecita', 'tormenta', 'niebla'], 'nube esponjosa con carita que flota y a veces llueve', 205, { torso: 'nube', sat: 0.12, luz: 0.95, brazo: 0 }),
  f('estrella', 'Estrella', 'flotante', ['estrellita', 'lucero', 'astro brillante'], 'estrella amarilla brillante con carita feliz', 48, { torso: 'estrella', sat: 0.9, luz: 0.62, brazo: 0.35, emisivo: 0.35 }),
  f('llama', 'Espíritu de fuego', 'flotante', ['flama', 'fueguito', 'chispa', 'fogata'], 'espíritu de fuego con forma de llama viva que arde y flota', 22, { torso: 'gota', sat: 0.95, luz: 0.56, emisivo: 0.5, brazo: 0.35 }),
  // ---- blobs
  f('slime', 'Slime', 'blob', ['baba', 'gelatina', 'moco', 'gota', 'blob'], 'slime gelatinoso y rebotón, una gota blanda con carita', 160, { torso: 'gota', translucido: 1, sat: 0.7, pierna: 0 }),
  f('hongo', 'Hongo', 'blob', ['seta', 'champinon', 'honguito'], 'hongo seta con sombrero rojo de puntos blancos y patitas', 2, { torso: 'hongo', sat: 0.8, pierna: 0, tw: 0.9, th: 0.95, patronBase: 'lunares' }),
  f('cactus', 'Cactus', 'blob', ['nopal', 'planta', 'suculenta', 'arbol'], 'cactus verde con espinas, brazos y una flor encima', 128, { torso: 'capsula', brazo: 0.5, espinas: 1, fijo: ['flor'], th: 1.25 }),
  f('calabaza', 'Calabaza', 'blob', ['zapallo', 'halloween', 'fruta', 'verdura'], 'calabaza naranja de Halloween con cara tallada y tallo', 28, { torso: 'calabaza', sat: 0.9, ojo: 'hueco', pierna: 0 }),
  f('golem', 'Gólem', 'blob', ['roca', 'piedra', 'cubo', 'bloque', 'cristal'], 'gólem de piedra con cuerpo de bloque, brazos pesados y ojos de cristal', 40, { torso: 'caja', sat: 0.14, luz: 0.5, brazo: 0.75, pierna: 0.3, ojo: 'robot', kPeso: 1.5 }),
];

// v(id, nombre, sinónimos, descripción, efectos)
const v = (id, nombre, sin, desc, e = {}) => ({ id, nombre, sin, desc, dTono: null, dSat: 0, dLuz: 0, escala: 1, kCab: 1, kTw: 1, acc: [], patron: null, emisivo: 0, ...e });

export const VARIANTES = [
  v('clasico', 'Clásico', ['normal', 'comun', 'basico', 'original'], 'versión clásica y normal'),
  v('fuego', 'de fuego', ['llamas', 'ardiente', 'lava', 'volcan', 'candela', 'magma'], 'de fuego, ardiente, con llamas y lava', { dTono: 12, dSat: 0.25, acc: ['llama'], patron: 'llamas', emisivo: 0.25 }),
  v('hielo', 'de hielo', ['helado', 'congelado', 'nieve', 'frio', 'glacial', 'polar'], 'de hielo, congelado, frío como la nieve', { dTono: 195, dSat: -0.1, dLuz: 0.16, acc: ['bufanda'], patron: 'cristales' }),
  v('bosque', 'del bosque', ['selva', 'naturaleza', 'hojas', 'planta', 'musgo', 'jungla'], 'del bosque, de naturaleza, cubierto de hojas y musgo', { dTono: 115, acc: ['hoja'], patron: 'manchas' }),
  v('sombra', 'sombrío', ['oscuro', 'tenebroso', 'noche', 'malvado', 'siniestro', 'dark'], 'sombrío, oscuro, tenebroso y de la noche', { dTono: 265, dSat: -0.2, dLuz: -0.3, acc: ['capa'], emisivo: 0.1 }),
  v('real', 'real', ['rey', 'reina', 'principe', 'princesa', 'monarca', 'majestuoso'], 'de la realeza, rey o reina con corona y capa', { dSat: 0.1, acc: ['corona', 'capa'] }),
  v('bebe', 'bebé', ['cria', 'chiquito', 'tierno', 'kawaii', 'cute', 'adorable'], 'bebé tierno y adorable, cabezón y de ojos grandes', { escala: 0.68, kCab: 1.32, dLuz: 0.08, acc: ['lazo'] }),
  v('anciano', 'anciano', ['viejo', 'abuelo', 'abuela', 'sabio', 'veterano'], 'anciano sabio con barba, bastón y lentes', { dSat: -0.25, dLuz: 0.05, acc: ['barba', 'baston', 'lentes'], escala: 0.92 }),
  v('gigante', 'gigante', ['enorme', 'colosal', 'titan', 'jefe', 'boss', 'grandote'], 'gigante, enorme, un jefe colosal', { escala: 1.45, kCab: 0.82, kTw: 1.18 }),
  v('mini', 'mini', ['diminuto', 'pequenito', 'chibi', 'pocket', 'enano'], 'mini, diminuto, de bolsillo', { escala: 0.55, kCab: 1.2 }),
  v('mecanico', 'mecánico', ['cibernetico', 'metalico', 'acero', 'engranajes', 'steampunk', 'blindado'], 'mecánico, de metal y acero, con engranajes', { dSat: -0.35, dLuz: 0.06, acc: ['antena', 'jetpack'], patron: 'placas' }),
  v('dulce', 'de caramelo', ['dulce', 'azucar', 'chicle', 'golosina', 'postre', 'helado de fresa'], 'de caramelo, dulce, de colores pastel como una golosina', { dTono: 330, dLuz: 0.2, acc: ['lazo'], patron: 'lunares' }),
  v('espacial', 'espacial', ['galactico', 'cosmico', 'galaxia', 'estelar', 'nebulosa'], 'espacial, galáctico, con estrellas y colores de nebulosa', { dTono: 250, dLuz: -0.12, acc: ['burbuja'], patron: 'estrellas', emisivo: 0.12 }),
  v('acuatico', 'acuático', ['marino', 'agua', 'oceano', 'pez', 'sirena', 'buzo'], 'acuático, marino, con aletas y escamas', { dTono: 188, acc: ['aleta'], patron: 'escamas' }),
  v('electrico', 'eléctrico', ['rayo', 'trueno', 'voltaje', 'relampago', 'energia'], 'eléctrico, con rayos, chispas y energía', { dTono: 52, dSat: 0.3, dLuz: 0.06, patron: 'rayos', emisivo: 0.3 }),
  v('toxico', 'tóxico', ['veneno', 'radiactivo', 'mutante', 'acido', 'pantano'], 'tóxico, venenoso, radiactivo y mutante', { dTono: 82, dSat: 0.3, acc: ['mascara'], patron: 'manchas', emisivo: 0.2 }),
  v('dorado', 'dorado', ['oro', 'legendario', 'brillante', 'tesoro', 'epico'], 'dorado, de oro, legendario y brillante', { dTono: 44, dSat: 0.35, dLuz: 0.04, acc: ['aureola'], emisivo: 0.18 }),
  v('arcoiris', 'arcoíris', ['multicolor', 'colorido', 'colores', 'unicolor no'], 'arcoíris, multicolor, de todos los colores', { patron: 'arcoiris', dSat: 0.25, dLuz: 0.06 }),
  v('fantasmal', 'fantasmal', ['espectral', 'transparente', 'etereo', 'translucido'], 'fantasmal, espectral, translúcido y etéreo', { dSat: -0.4, dLuz: 0.24, acc: ['aureola'], translucido: 1 }),
  v('armado', 'armado', ['guerrero', 'combate', 'batalla', 'espadachin', 'defensor'], 'armado para el combate, con espada, escudo y casco', { acc: ['espada', 'escudo', 'casco'] }),
];

// Accesorios: dónde se anclan y qué rigs los admiten.
const a = (id, nombre, ancla, sin, rigs = ['bipedo', 'cuadrupedo', 'ave', 'flotante', 'blob']) => ({ id, nombre, ancla, sin, rigs });
export const ACCESORIOS = [
  a('sombrero_mago', 'Sombrero de mago', 'cabeza', ['sombrero puntiagudo', 'sombrero de bruja']),
  a('corona', 'Corona', 'cabeza', ['tiara', 'diadema']),
  a('casco', 'Casco', 'cabeza', ['yelmo']),
  a('gorro', 'Gorro', 'cabeza', ['sombrero', 'gorra', 'boina']),
  a('lazo', 'Lazo', 'cabeza', ['mono', 'cinta', 'liston']),
  a('lentes', 'Lentes', 'cara', ['gafas', 'anteojos', 'lentecitos']),
  a('parche', 'Parche', 'cara', ['parche en el ojo']),
  a('mascara', 'Máscara', 'cara', ['cubreboca', 'tapaboca']),
  a('barba', 'Barba', 'cara', ['barbudo', 'bigote']),
  a('bufanda', 'Bufanda', 'cuello', ['chalina', 'panuelo']),
  a('collar', 'Collar', 'cuello', ['cadena', 'medalla', 'cascabel']),
  a('capa', 'Capa', 'espalda', ['manto', 'capote']),
  a('mochila', 'Mochila', 'espalda', ['morral', 'bolso']),
  a('jetpack', 'Jetpack', 'espalda', ['cohete', 'propulsor']),
  a('aleta', 'Aleta', 'espalda', ['aleta dorsal']),
  a('alas_extra', 'Alas', 'espalda', ['alitas', 'alado', 'con alas']),
  a('espada', 'Espada', 'mano', ['sable', 'katana', 'daga'], ['bipedo', 'flotante', 'blob']),
  a('baston', 'Bastón', 'mano', ['baculo', 'cayado'], ['bipedo', 'flotante', 'blob']),
  a('escudo', 'Escudo', 'mano2', ['rodela'], ['bipedo', 'flotante', 'blob']),
  a('varita', 'Varita', 'mano', ['varita magica'], ['bipedo', 'flotante', 'blob']),
  a('antena', 'Antena', 'cabeza', ['antenita']),
  a('auricular', 'Audífonos', 'cabeza', ['auriculares', 'audifonos', 'cascos de musica']),
  a('cuerno_extra', 'Cuernos', 'cabeza', ['cachos', 'con cuernos']),
  a('flor', 'Flor', 'cabeza', ['florecita', 'margarita']),
  a('hoja', 'Hoja', 'cabeza', ['brote', 'ramita']),
  a('aureola', 'Aureola', 'cabeza', ['halo', 'angelical']),
  a('cinturon', 'Cinturón', 'cintura', ['correa', 'faja']),
  a('burbuja', 'Casco burbuja', 'cabeza', ['escafandra', 'pecera']),
  a('llama', 'Llama', 'cabeza', ['fuego en la cabeza', 'mechon de fuego']),
  a('cola_extra', 'Cola', 'cola', ['con cola', 'rabo']),
  a('sombrero_ala', 'Sombrero de ala ancha', 'cabeza', ['sombrero vaquero', 'sombrero de paja', 'chullo']),
  a('antifaz', 'Antifaz', 'cara', ['mascara de heroe', 'enmascarado']),
  a('balon', 'Balón', 'suelo', ['pelota', 'balon de futbol']),
];

export const PATRONES = ['liso', 'manchas', 'rayas', 'lunares', 'escamas', 'estrellas', 'llamas', 'cristales', 'placas', 'rayos', 'arcoiris'];

// Armonías de color: desplazamientos de tono para [panza, extremidad, detalle, accesorio].
export const ARMONIAS = [
  { id: 'analoga', nombre: 'Análoga', d: [6, 0, 34, -30] },
  { id: 'complementaria', nombre: 'Complementaria', d: [6, 0, 180, 150] },
  { id: 'triada', nombre: 'Tríada', d: [6, 0, 120, 240] },
  { id: 'mono', nombre: 'Monocroma', d: [0, 0, 0, 0] },
  { id: 'dividida', nombre: 'Complementaria dividida', d: [6, 0, 150, 210] },
  { id: 'tetrada', nombre: 'Tétrada', d: [6, 0, 90, 180] },
];

export const ANIMOS = [
  { id: 'vivo', nombre: 'Vivo', s: 1, l: 1.04 },
  { id: 'pastel', nombre: 'Pastel', s: 0.62, l: 1.24 },
  { id: 'oscuro', nombre: 'Oscuro', s: 0.85, l: 0.66 },
  { id: 'neon', nombre: 'Neón', s: 1.4, l: 1.04 },
  { id: 'tierra', nombre: 'Tierra', s: 0.5, l: 0.86 },
];

export const PARTES = ['cuerpo', 'panza', 'extremidad', 'detalle', 'ojo', 'accesorio'];
export const ANIMACIONES = ['quieto', 'caminar', 'correr', 'saltar', 'golpe', 'dano', 'morir', 'celebrar', 'agachado'];
export const SONIDOS = ['salto', 'golpe', 'dano', 'moneda', 'morir', 'celebrar', 'paso'];
export const OBJETOS = ['moneda', 'gema', 'corazon', 'llave', 'cofre', 'pocion', 'estrella', 'bomba', 'proyectil', 'meta'];
export const HORAS = ['dia', 'tarde', 'noche', 'amanecer'];
export const CAPAS = ['cielo', 'lejos', 'medio', 'cerca', 'suelo', 'plataforma'];
export const EXPRESIONES = ['feliz', 'serio', 'enojado', 'sorpresa', 'dormido', 'travieso', 'triste', 'valiente'];
export const OJOS = ['redondo', 'ovalado', 'enojado', 'dormilon', 'hueco', 'robot', 'visor', 'saltones'];
export const EDADES = ['bebe', 'joven', 'adulto', 'anciano'];
export const FONDOS = ['noche', 'bosque', 'cielo', 'desierto', 'nieve', 'cueva', 'ciudad', 'lava'];
export const TAMANOS = [64, 96, 128, 192];
export const CLASES5 = ['muy_bajo', 'bajo', 'medio', 'alto', 'muy_alto']; // se usa para altura y para peso

// Modificadores de texto: palabra -> cambio de parámetros (0..1) o de color.
const m = (pal, cambio, sin = []) => ({ pal, sin, cambio });
export const MODIFICADORES = [
  m('alto', { altura: 0.85 }, ['larguirucho', 'espigado']), m('muy alto', { altura: 1 }, ['altisimo']),
  m('bajo', { altura: 0.2 }, ['bajito', 'chato', 'petiso', 'chaparro']), m('pequeno', { altura: 0.12 }, ['chico', 'chiquito', 'pequenito']),
  m('grande', { altura: 0.8, peso: 0.65 }, ['grandote']),
  m('gordo', { peso: 0.9 }, ['gordito', 'rechoncho', 'panzon', 'regordete', 'redondo', 'obeso', 'robusto']),
  m('flaco', { peso: 0.1 }, ['delgado', 'flaquito', 'esbelto', 'huesudo', 'fino']),
  m('fuerte', { peso: 0.72, brazos: 0.8 }, ['musculoso', 'forzudo', 'macizo']),
  m('cabezon', { cabeza: 0.95 }, ['cabeza grande', 'cabezota']), m('cabeza pequena', { cabeza: 0.1 }, ['cabecita']),
  m('ojos grandes', { ojos: 0.95 }, ['ojazos', 'ojon', 'ojos enormes']), m('ojos pequenos', { ojos: 0.1 }, ['ojitos']),
  m('brazos largos', { brazos: 0.95 }, ['brazudo']), m('brazos cortos', { brazos: 0.1 }, ['bracitos']),
  m('piernas largas', { piernas: 0.95 }, ['patas largas', 'zancudo']), m('piernas cortas', { piernas: 0.1 }, ['patas cortas', 'patitas', 'paticorto']),
  m('rapido', { peso: 0.25, piernas: 0.75 }, ['veloz', 'agil']), m('lento', { peso: 0.75, piernas: 0.25 }, ['pesado', 'torpe']),
  m('rojo', { tono: 2 }, ['roja', 'carmesi', 'colorado']), m('naranja', { tono: 26 }, ['anaranjado', 'mandarina']),
  m('amarillo', { tono: 50 }, ['amarilla', 'limon']), m('verde', { tono: 125 }, ['esmeralda', 'verdoso']),
  m('celeste', { tono: 195 }, ['turquesa', 'cian', 'aguamarina']), m('azul', { tono: 222 }, ['azulado', 'marino']),
  m('morado', { tono: 272 }, ['violeta', 'purpura', 'lila', 'morada']), m('rosado', { tono: 330 }, ['rosa', 'rosada', 'fucsia', 'magenta']),
  m('blanco', { luzAbs: 0.93, satAbs: 0.08 }, ['blanca', 'albino', 'nevado']), m('negro', { luzAbs: 0.2, satAbs: 0.12 }, ['negra', 'azabache']),
  m('gris', { luzAbs: 0.55, satAbs: 0.06 }, ['plomo', 'plateado', 'plata']), m('marron', { tono: 26, luzAbs: 0.36, satAbs: 0.5 }, ['cafe', 'chocolate', 'pardo']),
  m('pastel', { animo: 'pastel' }, ['suave', 'clarito']), m('neon', { animo: 'neon' }, ['fosforescente', 'chillon', 'fluorescente']),
  m('feliz', { expresion: 'feliz' }, ['alegre', 'contento', 'sonriente']), m('enojado', { expresion: 'enojado' }, ['molesto', 'furioso', 'bravo', 'renegon']),
  m('triste', { expresion: 'triste' }, ['lloron', 'apenado']), m('dormido', { expresion: 'dormido' }, ['sonoliento', 'cansado', 'flojo']),
  m('sorprendido', { expresion: 'sorpresa' }, ['asustado', 'asombrado']), m('travieso', { expresion: 'travieso' }, ['picaro', 'jugueton', 'palomilla']),
  m('valiente', { expresion: 'valiente' }, ['decidido', 'heroico']), m('serio', { expresion: 'serio' }, ['formal', 'frio de caracter']),
  m('a rayas', { patron: 'rayas' }, ['rayado', 'rayas', 'atigrado', 'cebra']), m('con manchas', { patron: 'manchas' }, ['manchado', 'manchas', 'vaca', 'moteado']),
  m('con lunares', { patron: 'lunares' }, ['lunares', 'puntitos', 'pecas']), m('con escamas', { patron: 'escamas' }, ['escamoso', 'escamas']),
  m('con estrellas', { patron: 'estrellas' }, ['estrellado']), m('liso', { patron: 'liso' }, ['sin patron', 'simple']),
];
