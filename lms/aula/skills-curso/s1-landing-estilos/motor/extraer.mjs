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
// Mezcla con el modelo de la clase (opcional): --modelo auto|qwen-landing|no (auto por defecto).
// Si hay JMD_URL y JMD_API_KEY, pide al modelo «qwen-landing» SOLO la redacción (título, subtítulo,
// antetítulo, lema); los hechos (nombre, WhatsApp, precios, servicios…) salen SIEMPRE de las reglas.
// Si el modelo falla, tarda más de 60 s o no devuelve JSON, sigue solo con reglas y avisa en stderr.
//
// Después: bun motor/construir.mjs --negocio negocio.json --estilo apple --imagenes no

import fs from 'node:fs';

// ---------------------------------------------------------------------------------------------
// Catálogo de giros del Perú. Una línea por giro:  alias1|alias2|…;Menú;Título genérico;imagen (inglés)
// El primer alias es el nombre canónico que va en negocio.rubro. Los alias se buscan sin tildes,
// en minúsculas, como palabra completa y admitiendo plural (-s/-es). Cuando varios alias aparecen
// en el texto, gana el más largo («clínica dental» antes que «clínica»).
// El título es creativo pero NO afirma hechos (ni cifras, ni años, ni premios).
const TABLA = `
cafetería|cafeteria|café|cafe|coffee shop|coffee;Carta;Café que se *siente* de verdad.;coffee shop counter with espresso machine and pastries
restaurante|restaurant|resto|comida criolla|menú del día;Carta;Sabor *casero* con mesa puesta.;restaurant dining room with set wooden tables
pollería|polleria|pollos a la brasa|pollo a la brasa;Carta;El pollo a la brasa que *vale* el viaje.;roasted rotisserie chicken with fries on a wooden table
cevichería|cevicheria|cebichería|cebicheria|ceviches|cebiches|comida marina;Carta;Pescado *fresco*, sazón de barrio.;ceviche dish with sweet potato and corn on a rustic table
pizzería|pizzeria|pizzas;Carta;Pizza *artesanal*, horno de verdad.;wood fired pizza on a stone oven counter
chifa|comida china;Carta;Chifa *de barrio*, wok caliente.;wok with fried rice and vegetables in a chinese restaurant kitchen
sanguchería|sangucheria|sánguches|sanguches|sandwiches;Carta;Sánguches *grandes*, pan crocante.;sandwich with crispy bread and fillings on a wooden board
hamburguesería|hamburgueseria|hamburguesas|burger;Carta;Hamburguesas *hechas* a mano.;gourmet burger with fries on a slate board
anticuchería|anticucheria|anticuchos|parrilla|parrillas;Carta;Carne *al carbón*, como debe ser.;grilled meat skewers over glowing charcoal
picantería|picanteria|comida arequipeña;Carta;Cocina *tradicional* de siempre.;traditional clay pots and stews on a rustic kitchen table
juguería|jugueria|jugos naturales|jugos;Carta;Fruta *fresca*, licuada al momento.;fresh fruit juices in glasses next to tropical fruits
heladería|heladeria|helados artesanales|helados;Carta;Helados *artesanales* todo el año.;artisan ice cream scoops in a display freezer
panadería|panaderia|panes;Productos;Pan *recién* salido, todos los días.;freshly baked bread loaves on a wooden bakery shelf
pastelería|pasteleria|repostería|reposteria|tortas|tortas por encargo|cake;Productos;Tortas que *cuentan* historias.;decorated layer cake on a marble counter in a bakery
catering|buffet|buffets|servicio de catering;Servicios;Comida *rica* para tu evento, sin estrés.;elegant buffet table with covered dishes at an event
bar|cantina|pub|licorería|licoreria;Carta;Tragos *bien* servidos, noche larga.;cocktail bar counter with bottles and warm backlight
discoteca|disco|club nocturno;Eventos;La noche *empieza* aquí.;nightclub dance floor with colorful lights and haze
food truck|foodtruck|carrito de comida|carreta;Carta;Comida *rica* donde estés.;food truck parked at dusk with string lights
bodega|abarrotes|tienda de abarrotes;Productos;Todo lo de *casa*, a una cuadra.;corner grocery store shelves with everyday products
minimarket|mini market|market|autoservicio;Productos;Lo que *necesitas*, abierto hasta tarde.;small supermarket aisle with tidy shelves
frutería|fruteria|frutas y verduras|verdulería|verduleria;Productos;Fruta *del día*, precio de mercado.;colorful fresh fruit and vegetables stall
carnicería|carniceria|carnes;Productos;Carne *fresca*, corte a tu gusto.;butcher shop counter with fresh cuts on display
pescadería|pescaderia|pescados y mariscos;Productos;Del mar a tu *mesa*, cada mañana.;fresh fish on ice at a seafood market counter
distribuidora|distribuidor|distribución|distribucion;Productos;Abastecemos tu negocio *a tiempo*.;warehouse shelves with stacked boxes and a pallet jack
mayorista|al por mayor|por mayor;Productos;Precio *de mayorista*, trato directo.;wholesale store aisle with bulk products
farmacia|botica|droguería|drogueria;Productos;Tu salud, *cerca* de casa.;clean pharmacy counter with organized shelves of products
óptica|optica|lentes de medida|lentes;Productos;Ver *bien* cambia todo.;optical shop display with rows of eyeglasses frames
ferretería|ferreteria;Productos;Todo para tu *obra*, en un solo lugar.;hardware store aisle with organized tools and paint cans
librería|libreria|papelería|papeleria|útiles escolares|utiles escolares;Productos;Todo para tu *lista* escolar.;bookstore with wooden shelves full of books and notebooks
tienda de ropa|ropa|boutique|moda|tienda de moda|prendas;Colección;Viste *distinto*.;clothing boutique with garments on wooden racks
zapatería|zapateria|calzado|zapatos|zapatillas;Productos;Calzado que *aguanta* el día.;shoe store display with shelves of shoes
joyería|joyeria|joyas|relojería|relojeria;Productos;Joyas que *duran* generaciones.;jewelry display case with rings and necklaces under soft light
juguetería|jugueteria|juguetes;Productos;Juegos que *crecen* con ellos.;toy store shelves with colorful toys
tienda de regalos|regalos|detalles|tienda de detalles;Productos;El detalle *perfecto*, listo para dar.;gift shop display with wrapped boxes and ribbons
florería|floreria|flores|arreglos florales;Arreglos;Flores que *dicen* lo que sientes.;flower shop display with fresh bouquets in buckets
mueblería|muebleria|muebles;Productos;Muebles *hechos* para tu casa.;furniture showroom with a wooden table and sofa
vivero|plantas|plantas ornamentales;Productos;Plantas *sanas* para tu casa.;plant nursery with rows of potted plants in greenhouse light
pet shop|petshop|tienda de mascotas|mascotas;Productos;Todo para quien te *espera* en casa.;pet store shelves with food bags and accessories
celulares|servicio técnico de celulares|servicio tecnico de celulares|reparación de celulares|reparacion de celulares|accesorios para celular;Servicios;Tu celular, *listo* el mismo día.;phone repair bench with tools and a smartphone open
computadoras|reparación de computadoras|reparacion de computadoras|laptops|servicio técnico de computadoras|servicio tecnico de computadoras;Servicios;Tu computadora *rápida* otra vez.;computer repair desk with an open laptop and tools
videojuegos|consolas|gamer|tienda gamer;Productos;Juega *más*, paga menos.;video game store shelves with consoles and controllers
cibercafé|cibercafe|cabinas de internet|cabinas|ciber;Servicios;Internet *rápido* y a la mano.;internet cafe with rows of computers and chairs
fotocopias|copias e impresiones|impresiones|copias;Servicios;Copias *al toque*, sin cola.;copy shop counter with a photocopier and stacked paper
imprenta|gráfica|grafica|impresión gráfica|impresion grafica;Servicios;Impresión *nítida*, entrega puntual.;print shop with a large format printer and colorful flyers
serigrafía|serigrafia|estampados|polos estampados|sublimación|sublimacion;Servicios;Tu marca *estampada* con calidad.;screen printing workshop with printed shirts hanging
llantas|llantería|llanteria|neumáticos|neumaticos;Productos;Llantas *seguras*, montaje incluido.;tire shop with stacked tires and a mounting machine
repuestos|autopartes|auto partes|repuestos automotrices;Productos;El repuesto *correcto*, a la primera.;auto parts store shelves with boxed parts
motos|venta de motos|tienda de motos|motocicletas;Productos;Tu próxima moto *te espera*.;motorcycles lined up in a showroom
bicicletas|bicicletería|bicicleteria|taller de bicicletas|bicis;Servicios;Pedalea *sin* preocupaciones.;bicycle workshop with bikes hanging and tools on the wall
agropecuaria|agroveterinaria|agrícola|agricola|agroquímicos|agroquimicos;Productos;Para el *campo*, con asesoría.;farm supply store with sacks of feed and tools
pesca|artículos de pesca|articulos de pesca|pesquera;Productos;Todo para tu *jornada* de pesca.;fishing tackle shop with rods and nets
clínica dental|clinica dental|dentista|odontología|odontologia|consultorio dental|odontólogo|odontologo;Tratamientos;Una sonrisa *sana* empieza con una consulta.;bright modern dental treatment room with a dental chair
veterinaria|veterinario|clínica veterinaria|clinica veterinaria;Servicios;Cuidamos a quien te *espera* en casa.;bright veterinary clinic reception with a waiting bench
psicólogo|psicologo|psicóloga|psicologa|psicología|psicologia|terapia psicológica|terapia psicologica;Servicios;Hablar *ayuda*. Aquí te escuchamos.;calm therapy office with two armchairs and a plant
nutricionista|nutrición|nutricion;Servicios;Come *bien*, sin dietas imposibles.;healthy meal bowls and fresh vegetables on a light table
clínica estética|clinica estetica|estética|estetica|centro estético|centro estetico|cosmetología|cosmetologia;Tratamientos;Piel que se *nota* cuidada.;serene aesthetic clinic treatment room with soft lights
spa|masajes|centro de masajes;Tratamientos;Un respiro *para ti*.;spa room with towels, candles and a massage table
consultorio médico|consultorio medico|consultorio|médico|medico|clínica|clinica|policlínico|policlinico|centro médico|centro medico;Servicios;Atención *cercana* y sin esperas.;clean medical consultation room with a desk and examination bed
fisioterapia|fisioterapeuta|terapia física|terapia fisica|rehabilitación|rehabilitacion;Tratamientos;Vuelve a *moverte* sin dolor.;physiotherapy room with exercise balls and a treatment table
laboratorio clínico|laboratorio clinico|laboratorio|análisis clínicos|analisis clinicos;Servicios;Resultados *confiables*, el mismo día.;clinical laboratory bench with test tubes and a microscope
peluquería|peluqueria|salón de belleza|salon de belleza|salón|salon|estilista;Servicios;Tu cabello, en *buenas* manos.;stylish hair salon with mirrors and chairs
barbería|barberia|barber shop|barbershop|barber;Servicios;Corte *limpio*, barba al punto.;classic barbershop chair with mirror and leather details
uñas|unas|manicure|manicura|nail|nail bar;Servicios;Uñas *perfectas*, sin apuro.;nail salon table with polish bottles in many colors
maquillaje|maquilladora|maquillador|makeup;Servicios;Maquillaje que *resalta* lo tuyo.;makeup brushes and palettes on a vanity table with ring light
tatuajes|tattoo|estudio de tatuajes|tatuador|tatuadora;Trabajos;Tinta *limpia*, diseño propio.;tattoo studio workstation with machine and ink caps
gimnasio|gym|fitness|box de crossfit|crossfit;Planes;Entrena *hoy*, agradece mañana.;modern gym interior with dumbbell rack and training floor
gimnasio de box|box|boxeo|escuela de boxeo;Planes;Golpea *fuerte*, entrena con cabeza.;boxing gym with heavy bags and a ring under spotlights
cancha de fútbol|cancha de futbol|cancha sintética|cancha sintetica|canchas|fútbol|futbol|losa deportiva|grass sintético|grass sintetico;Reservas;Tu *pichanga*, cancha lista.;small artificial turf football pitch under floodlights
yoga|pilates|meditación|meditacion;Clases;Respira *hondo*. Empieza hoy.;yoga studio with mats on a wooden floor and soft light
academia de baile|baile|danza|academia de danza|marinera|salsa;Clases;Baila *como* siempre quisiste.;dance studio with mirrors and a wooden floor
academia de música|academia de musica|música|musica|clases de guitarra|clases de piano|escuela de música|escuela de musica;Clases;Música *para todos*, desde la primera clase.;music classroom with a piano and guitars on the wall
academia de inglés|academia de ingles|inglés|ingles|idiomas|instituto de idiomas|english;Cursos;Inglés que *se usa*, no que se memoriza.;bright language classroom with whiteboard and world map
academia preuniversitaria|preuniversitaria|pre universitaria|academia pre|preuniversitario;Cursos;Ingresa *a la primera*.;lecture classroom with desks and a whiteboard full of formulas
academia;Cursos;Aprende *haciendo*, con quien sabe.;classroom with desks and a whiteboard
clases particulares|profesor particular|profesora particular|reforzamiento|nivelación|nivelacion|tutorías|tutorias;Cursos;Clases *a tu ritmo*, resultados reales.;study desk with notebooks, pencils and a lamp
colegio|escuela|institución educativa|institucion educativa|i.e.;Niveles;Educación que *acompaña*.;school hallway with lockers and classroom doors
instituto|instituto técnico|instituto tecnico|instituto superior|cetpro;Carreras;Aprende un *oficio*, consigue trabajo.;technical institute workshop with workbenches
guardería|guarderia|nido|cuna jardín|cuna jardin|cuna|jardín de niños|jardin de niños|jardín infantil|jardin infantil;Servicios;Cuidado *con cariño* desde el primer día.;bright nursery playroom with colorful toys and small tables
escuela de manejo|autoescuela|clases de manejo|brevete|escuela de conductores;Cursos;Maneja *seguro* desde la primera clase.;driving school car on an empty practice lot
estudio contable|contador|contadora|contabilidad|contadores|asesoría contable|asesoria contable;Servicios;Tus impuestos, *sin* dolores de cabeza.;tidy accounting office desk with documents and calculator
estudio de abogados|abogado|abogada|abogados|estudio jurídico|estudio juridico|asesoría legal|asesoria legal;Servicios;Defendemos lo *tuyo*.;law office desk with legal books and a leather chair
notaría|notaria|notario|notaría pública|notaria publica;Servicios;Trámites *claros*, firmas seguras.;notary office with documents, seal and fountain pen
arquitecto|arquitecta|arquitectura|estudio de arquitectura|diseño de interiores|diseno de interiores;Proyectos;Espacios *pensados* para vivir.;architecture studio desk with blueprints and a scale model
inmobiliaria|bienes raíces|bienes raices|agente inmobiliario|corredor inmobiliario;Propiedades;Tu *próximo* hogar empieza aquí.;modern apartment building facade at golden hour
construcción|construccion|constructora|obras|maestro de obra|albañilería|albanileria;Proyectos;Construimos *bien*, a tiempo.;construction site with scaffolding and a crane at sunrise
drywall|tabiquería|tabiqueria|cielo raso;Trabajos;Ambientes *nuevos* en días, no meses.;interior wall being built with drywall panels and metal studs
vidriería|vidrieria|vidrios y aluminio|vidrios|aluminio|mamparas;Trabajos;Vidrio *a medida*, instalado.;glass and aluminum workshop with large panes and frames
metalmecánica|metalmecanica|soldadura|estructuras metálicas|estructuras metalicas|soldador|herrería|herreria;Trabajos;Metal *fuerte*, trabajo preciso.;metal workshop with welding sparks and steel beams
carpintería|carpinteria|carpintero|muebles a medida|melamina;Trabajos;Madera *bien* trabajada.;woodworking workshop with planks, tools and a custom table
cerrajería|cerrajeria|cerrajero|cerrajeros;Servicios;Abrimos puertas, *cerramos* problemas.;locksmith workbench with keys, locks and cutting machine
gasfitería|gasfiteria|gasfitero|plomería|plomeria|plomero;Servicios;Agua *donde* debe, sin fugas.;plumbing tools and copper pipes on a workbench
electricista|instalaciones eléctricas|instalaciones electricas|electricidad;Servicios;Luz *segura* en tu casa.;electrician tools, cables and a breaker panel on a wall
pintor|pintura de casas|pintado|pintamos casas|pintores;Servicios;Color *nuevo*, paredes como nuevas.;paint rollers, cans and a freshly painted wall
jardinería|jardineria|jardinero|mantenimiento de jardines|jardines|paisajismo;Servicios;Jardines *vivos* todo el año.;well kept garden with trimmed hedges and flowers
piscinas|mantenimiento de piscinas|limpieza de piscinas;Servicios;Agua *cristalina*, sin complicarte.;clean swimming pool with clear blue water at midday
limpieza|servicio de limpieza|limpieza de oficinas|empresa de limpieza|limpieza del hogar;Servicios;Limpieza *impecable*, horario a tu medida.;cleaning supplies cart in a bright office corridor
seguridad|vigilancia|cámaras de seguridad|camaras de seguridad|alarmas|cctv;Servicios;Protegemos lo que *importa*.;security cameras mounted on a building wall at dusk
lavandería|lavanderia|lavado de ropa|lavado al seco;Servicios;Ropa *limpia*, tiempo libre.;clean laundromat with rows of washing machines and folded towels
lavado de autos|car wash|carwash|autolavado;Servicios;Tu auto *brillando* en 20 minutos.;shiny clean car at a car wash bay with water droplets
taller mecánico|taller mecanico|mecánica|mecanica|mecánico|mecanico|taller automotriz|automotriz|taller;Servicios;Tu auto, *listo* el mismo día.;clean auto repair workshop with a car on a lift
taller de motos|mecánica de motos|mecanica de motos|mecánico de motos|mecanico de motos;Servicios;Tu moto *rodando* hoy.;motorcycle workshop with a bike on a stand and tools
vulcanizadora|vulcanizado|parchado de llantas|vulca;Servicios;Llanta *lista* en minutos.;roadside tire repair shop with tires and an air compressor
grúa|grua|grúas|gruas|remolque|auxilio mecánico|auxilio mecanico;Servicios;Llegamos *rápido*, donde estés.;tow truck on a highway at dusk
taxi|transporte|movilidad|traslados|empresa de transporte|transporte de personal;Servicios;Llega *a tiempo*, viaja seguro.;clean sedan car parked on a city street at dawn
mudanzas|mudanza|fletes|flete|transporte de carga;Servicios;Tu mudanza *sin* dolores de cabeza.;moving truck with open door and stacked boxes
courier|mensajería|mensajeria|envíos|envios|delivery express|encomiendas;Servicios;Entregas *puntuales*, seguimiento real.;delivery motorcycle with a parcel box on a city street
hostal|hospedaje|hostel;Habitaciones;Descansa *bien*, paga justo.;cozy hostel room with a made bed and a window
hotel;Habitaciones;Tu estadía *perfecta* empieza aquí.;hotel room with a large bed, soft light and a city view
agencia de viajes|viajes|travel|paquetes turísticos|paquetes turisticos;Destinos;Tu *próximo* viaje empieza aquí.;scenic mountain valley landscape at golden hour with a winding road
tours|tour|guía turístico|guia turistico|turismo|operador turístico|operador turistico;Tours;Vive el *destino*, no solo lo visites.;hiking trail with a view over green mountains and ruins
eventos|organización de eventos|organizacion de eventos|bodas|matrimonios|quinceañeros|quinceaneros|local de eventos;Servicios;Tu evento *inolvidable*, sin estrés.;decorated event hall with round tables and string lights
cumpleaños infantiles|cumpleanos infantiles|fiestas infantiles|animación infantil|animacion infantil|shows infantiles|payasos;Shows;Fiestas que los niños *recuerdan*.;colorful kids party setup with balloons and a bouncy castle
dj|discjockey|disc jockey|sonido e iluminación|sonido e iluminacion|sonido y luces;Servicios;Música que *mueve* tu fiesta.;dj console with turntables and colorful stage lights
fotógrafo|fotografo|fotógrafa|fotografa|fotografía|fotografia|estudio fotográfico|estudio fotografico|filmación|filmacion;Servicios;Momentos que *se quedan*.;photography studio with softbox lights and a backdrop
funeraria|servicios funerarios|velatorio;Servicios;Acompañamos *con respeto* en cada paso.;quiet funeral home chapel with white flowers and soft light
seguros|asesor de seguros|corredor de seguros|soat;Planes;Protege lo tuyo *hoy*.;insurance office desk with a folder, pen and a small house model
préstamos|prestamos|financiera|créditos|creditos|casa de empeño|casa de empeno|prestamista;Servicios;Dinero *a tiempo*, sin letra chica.;finance office desk with calculator and documents
cambio de moneda|casa de cambio|cambistas|cambio de dólares|cambio de dolares;Servicios;Tipo de cambio *justo*, al instante.;currency exchange counter with a rates board
consultora|consultoría|consultoria|asesoría|asesoria|asesoría empresarial|asesoria empresarial;Servicios;Decisiones *claras* para tu negocio.;modern meeting room with a glass table and a whiteboard
marketing|agencia de marketing|publicidad|agencia digital|agencia de publicidad;Servicios;Más clientes, *menos* ruido.;creative agency desk with laptop, notebook and color swatches
diseño gráfico|diseno grafico|diseñador gráfico|disenador grafico|diseñadora gráfica|disenadora grafica|diseño de logos|diseno de logos|branding;Servicios;Tu marca *se nota*.;designer desk with a tablet, color swatches and printed logos
community manager|redes sociales|manejo de redes|gestión de redes|gestion de redes;Planes;Tus redes, *vivas* todos los días.;smartphone on a desk showing a social media grid, coffee beside it
desarrollo web|páginas web|paginas web|desarrollo de software|software|programador|programadora|apps|aplicaciones móviles|aplicaciones moviles|ingeniero de software|diseño web|diseno web;Servicios;Tu negocio *en línea* en semanas.;minimal desk with a laptop showing a clean website layout
soporte ti|soporte técnico|soporte tecnico|sistemas|redes y soporte|informática|informatica;Servicios;Tecnología que *funciona*, siempre.;server rack with blinking lights and neat cables
ingeniería|ingenieria|ingeniero|ingeniera|servicios de ingeniería|servicios de ingenieria;Servicios;Soluciones *a medida*, bien hechas.;engineering desk with technical drawings and a hard hat
sastrería|sastreria|sastre|costura|costurera|confecciones|arreglos de ropa|modista;Servicios;A tu medida, *de verdad*.;tailor workshop with a sewing machine, fabric rolls and measuring tape
artesanía|artesania|artesanías|artesanias|artesanos|artesano;Productos;Hecho *a mano*, con historia.;handmade ceramics and woven textiles on a wooden display
`;

const limpiar = (s) => String(s || '').replace(/\s+/g, ' ').replace(/^[\s:,.;-]+|[\s:,.;-]+$/g, '').trim();
const capital = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const sinTildes = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
const norm = (s) => sinTildes(String(s || '').toLowerCase());
const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Catálogo de giros: { rubro, alias[], menu, titulo, imagen }. */
export const GIROS = TABLA.trim().split('\n').map((linea) => {
  const [alias, menu, titulo, imagen] = linea.split(';');
  const lista = alias.split('|').map((a) => a.trim()).filter(Boolean);
  return { rubro: lista[0], alias: lista, menu: menu.trim(), titulo: titulo.trim(), imagen: imagen.trim() };
});
/** Lista plana de palabras de rubro (compatibilidad con la primera versión). */
export const RUBROS = GIROS.flatMap((g) => g.alias);
const MENUS = [...new Set(GIROS.map((g) => g.menu))];

// Alias ordenados del más largo al más corto, con su expresión ya compilada (palabra completa + plural).
const ALIAS = GIROS.flatMap((g) => g.alias.map((a) => ({ a: norm(a), g })))
  .sort((x, y) => y.a.length - x.a.length)
  .map(({ a, g }) => ({ g, re: new RegExp(`(?:^|[^a-z0-9ñ])${escapar(a)}(?:s|es)?(?=$|[^a-z0-9ñ])`) }));

/** Giro del catálogo que aparece en un fragmento de texto (el alias más largo gana), o null. */
export function buscarGiro(fragmento) {
  const t = norm(fragmento);
  for (const { g, re } of ALIAS) if (re.test(t)) return g;
  return null;
}

// Ciudades y distritos: el distrito permite deducir la ciudad cuando el cliente no la nombra.
const CIUDADES = ['Lima', 'Arequipa', 'Trujillo', 'Cusco', 'Chiclayo', 'Piura', 'Huancayo', 'Tacna', 'Iquitos', 'Juliaca', 'Puno', 'Ica', 'Cajamarca', 'Pucallpa', 'Chimbote', 'Huánuco', 'Ayacucho', 'Tarapoto', 'Callao', 'Huaraz', 'Sullana', 'Tumbes', 'Moquegua', 'Chincha', 'Cañete', 'Huacho', 'Barranca', 'Huaral', 'Jaén', 'Tarma', 'Cerro de Pasco', 'Abancay', 'Andahuaylas', 'Moyobamba', 'Puerto Maldonado', 'Ilo', 'Talara', 'Paita', 'Lambayeque', 'Nazca', 'Pisco', 'Satipo', 'La Merced', 'Bagua', 'Chachapoyas', 'Yurimaguas', 'Tingo María', 'Sicuani', 'Quillabamba', 'Camaná', 'Mollendo', 'Pacasmayo', 'Chepén', 'Casma', 'Nuevo Chimbote', 'Huanta', 'Chulucanas', 'Ferreñafe', 'Majes'];
const DISTRITOS = {
  Lima: ['Miraflores', 'San Isidro', 'Surco', 'Santiago de Surco', 'Los Olivos', 'San Miguel', 'Jesús María', 'Lince', 'Pueblo Libre', 'Comas', 'La Molina', 'San Borja', 'Barranco', 'Chorrillos', 'Surquillo', 'Magdalena', 'Breña', 'Rímac', 'Independencia', 'San Juan de Lurigancho', 'SJL', 'San Juan de Miraflores', 'SJM', 'San Martín de Porres', 'SMP', 'Villa El Salvador', 'Villa María del Triunfo', 'Ate', 'Santa Anita', 'El Agustino', 'La Victoria', 'Puente Piedra', 'Carabayllo', 'Lurín', 'Chaclacayo', 'Chosica', 'Cercado de Lima', 'Lima Norte', 'Lima Sur'],
  Arequipa: ['Cayma', 'Yanahuara', 'Cerro Colorado', 'José Luis Bustamante', 'Paucarpata', 'Sachaca', 'Hunter', 'Socabaya'],
  Cusco: ['Wanchaq', 'San Sebastián', 'San Jerónimo'],
  Trujillo: ['Víctor Larco', 'La Esperanza', 'El Porvenir', 'Huanchaco', 'Florencia de Mora'],
  Chiclayo: ['José Leonardo Ortiz', 'Pimentel'],
  Piura: ['Castilla', 'Veintiséis de Octubre'],
  Huancayo: ['El Tambo', 'Chilca'],
  Callao: ['Bellavista', 'La Perla', 'Ventanilla', 'La Punta'],
};
const reLugar = (nombre) => new RegExp(`(?:^|[^a-zñ])${escapar(norm(nombre))}(?=$|[^a-zñ])`);
const LUGARES = [
  ...CIUDADES.map((c) => ({ ciudad: c, re: reLugar(c), largo: c.length })),
  ...Object.entries(DISTRITOS).flatMap(([ciudad, ds]) => ds.map((d) => ({ ciudad, re: reLugar(d), largo: d.length }))),
].sort((a, b) => b.largo - a.largo);

function buscarCiudad(fragmento) {
  const t = norm(fragmento);
  for (const l of LUGARES) if (l.re.test(t)) return l.ciudad;
  return '';
}

/** Primer grupo que capture alguno de los patrones, limpio (y pasado por «post» antes de medir el largo). */
function primero(texto, patrones, max = 80, post = (x) => x) {
  for (const re of patrones) {
    const m = re.exec(texto);
    if (m && m[1]) {
      const v = post(limpiar(m[1].split(/\n/)[0]));
      if (v && v.length <= max) return v;
    }
  }
  return '';
}

// Nombre propio: si el cliente escribió todo en minúsculas, se pone mayúscula a cada palabra.
const MINUSCULAS_NOMBRE = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'y', 'e', 'a', 'en', 'con', '&']);
function nombrePropio(s) {
  if (/[A-ZÁÉÍÓÚÑ]/.test(s)) return s;
  return s.split(' ').map((p, i) => (i > 0 && MINUSCULAS_NOMBRE.has(p) ? p : capital(p))).join(' ');
}

const marcada = (s) => (s.includes('*') ? s : s.replace(/^(\S+)/, '*$1*'));
const precioTexto = (n) => 'S/ ' + String(n).replace(',', '.').replace(/\.00$/, '');

// En un mensaje de WhatsApp todo va en una línea: estas frases marcan dónde empieza OTRO dato…
const RUIDO = 'wsp|whatsapp|mi whatsapp|cel|celular|n[uú]mero|tel[eé]fono|tel|correo|mail|horario|atendemos|abrimos|abierto|ofrecemos|hacemos|lo que vendemos|vendemos|precios?\\s*:|tarifas?\\s*:|cobramos|promo(?:ci[oó]n)?|oferta|lema|nos diferencia|lo nuestro|preguntas|quiero|que tenga|algo simple|gracias|saludos|atte|la direcci[oó]n|direcci[oó]n|nos encuentras|estamos en|se llama|es el nombre';
// …y estas palabras solo cuando van como etiqueta («servicios:», «local:»): «Productos de cuidado» es un servicio.
const ETIQUETA = '(?:servicios|productos|local|nombre|ciudad|rubro)\\s*:';
// (Nunca corta dentro de un paréntesis: «Delivery (pedidos por WhatsApp)» es un solo servicio.)
const reRuidoFinal = new RegExp(`(?:[.,;]\\s+|\\s+)(?![^()]*\\))(?:\\p{Extended_Pictographic}|(?:${RUIDO})\\b|${ETIQUETA})[^\\n]*$`, 'iu');
const reEsRuido = new RegExp(`^(?:${RUIDO})\\b|^${ETIQUETA}|\\b(?:${RUIDO})\\s*:|\\b9\\d{2}[\\s.-]?\\d{3}[\\s.-]?\\d{3}\\b|^\\p{Extended_Pictographic}`, 'iu');
/** Corta un dato en cuanto empieza el siguiente («Av. Larco 123, Lima. wsp 987…» → «Av. Larco 123, Lima»). */
const sinRuido = (s) => limpiar(String(s).replace(reRuidoFinal, ''));
/** ¿Este trozo de lista es otro dato (teléfono, cierre, lema…) y no un servicio? */
const esRuido = (s, ciudadDe) => !s || reEsRuido.test(s) || (ciudadDe(s) && s.split(' ').length <= 3);

export function extraer(textoBruto, opciones = {}) {
  const texto = String(textoBruto || '').replace(/\r/g, '');
  const avisos = [];
  const t = ' ' + texto + ' ';
  // «necesito una página web para mi botica»: la petición no es el rubro.
  const textoRubro = texto.replace(/\b(?:una?\s+)?(?:p[aá]ginas?(?:\s+web)?|web|landing(?:\s+page)?|sitios?(?:\s+web)?)\s+(?:para|de)\s+(?:mi|nuestr[oa]|el|la|su)\b/gi, ' para mi ');

  // ---- datos de contacto: patrones estrictos, nunca se inventan
  let whatsapp = '';
  let telefono = '';
  const mTel = /(?<!\d)(?:\+?51[\s.-]?)?(9\d{2})[\s.-]?(\d{3})[\s.-]?(\d{3})(?!\d)/.exec(texto);
  if (mTel) {
    const nueve = mTel[1] + mTel[2] + mTel[3];
    whatsapp = '51' + nueve;
    telefono = `${nueve.slice(0, 3)} ${nueve.slice(3, 6)} ${nueve.slice(6)}`;
  } else {
    const mFijo = /(?<!\d)\(?(0?1)\)?[\s.-]?(\d{3})[\s.-]?(\d{4})(?!\d)/.exec(texto);
    if (mFijo) telefono = `(01) ${mFijo[2]} ${mFijo[3]}`;
    avisos.push('No encontré un número de WhatsApp (9 dígitos): completa negocio.whatsapp.');
  }
  const correo = (/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/.exec(texto) || [''])[0].toLowerCase();

  const direccion = primero(t, [
    /(?:direcci[oó]n|local|estamos en|nos encuentras en|ubicados en|ubicadas en|queda en|nos ubicamos en|visítanos en|visitanos en)\s*(?:es|:)?\s*((?:av\.?|avenida|jr\.?|jir[oó]n|calle|ca\.|psje\.?|pasaje|mz\.?|mza\.?|urb\.?|urbanizaci[oó]n|carretera|km\.?)\s[^\n;]*?\d+[^\n;]*)/i,
    /((?:av\.?|avenida|jr\.?|jir[oó]n|calle|psje\.?|pasaje|mz\.?|mza\.?|urb\.?|carretera)\s+[A-ZÁÉÍÓÚa-záéíóúñ0-9][^\n;]*?\d{1,5}[^\n;]*)/i,
  ], 120, sinRuido).replace(/\s*[-–]\s*/g, ', ').replace(/\s*\(([^)]+)\)\s*$/, ', $1').replace(/[.(]+$/, '').replace(/,\s*,/g, ',');

  // ---- ciudad: primero la frase «en X / ciudad: X», luego la dirección, luego cualquier mención
  let ciudad = '';
  for (const m of t.matchAll(/(?:ciudad|estamos en|atendemos en|trabajamos en|ubicados en|ubicadas en|aqu[ií] en|somos de|desde)\s*:?\s*([^\n.;!?]{2,60})/gi)) {
    ciudad = buscarCiudad(m[1]);
    if (ciudad) break;
  }
  if (!ciudad && direccion) ciudad = buscarCiudad(direccion);
  if (!ciudad) ciudad = buscarCiudad(texto);

  let horario = primero(t, [
    /(?:horario|horarios|atendemos|abrimos|atenci[oó]n|abierto|abiertos)\s*(?:es|son|:)?\s*((?:de\s+)?(?:lun|lunes|mar|mi[eé]|jue|vie|s[aá]b|dom|todos los d[ií]as|l-v|l-s|l a v|l a s|24 horas|las 24|\d{1,2}(?::\d{2})?\s*(?:am|pm|h\b|hrs|a\s))[^\n]*)/i,
    /\b((?:lun(?:es)?|l)\s*(?:a|-|–)\s*(?:vie(?:rnes)?|s[aá]b(?:ado)?|dom(?:ingo)?)[^\n.;]*\d[^\n.;]*)/i,
    /(?:horario|horarios)\s*(?:es|:)?\s*([^\n.;]{6,80})/i,
    /(?:atendemos|abrimos|abierto)\s+(de\s+\d{1,2}(?::\d{2})?\s*(?:am|pm|h|hrs)?\s*a\s+\d{1,2}(?::\d{2})?\s*(?:am|pm|h|hrs)?[^\n.;]*)/i,
  ], 90, sinRuido).replace(/[.,;(]+$/, '');
  // Un horario de verdad trae una hora o un día; «horario de oficina» o «horario normal» no sirven.
  if (horario && !/\d|lun|mar|mi[eé]|jue|vie|s[aá]b|dom|d[ií]as/i.test(horario)) horario = '';

  // ---- rubro: la frase de presentación manda; si no, el alias más largo en todo el texto
  let giro = null;
  for (const m of textoRubro.matchAll(/(?:tengo|tenemos|somos|soy|mi negocio es|mi emprendimiento es|negocio|rubro|giro|mi (?:empresa|local|tienda|marca) es|para mi|para nuestr[oa]|de mi|es una?|dirijo|atiendo|manejo|administro)\s*:?\s+(?:una?\s+|el\s+|la\s+|mi\s+)?([^\n.,;:!?()]{3,60})/gi)) {
    giro = buscarGiro(m[1]);
    if (giro) break;
  }
  if (!giro) giro = buscarGiro(textoRubro);
  let rubro = giro ? giro.rubro : primero(t, [/(?:tengo|somos|soy due[nñ][oa] de|mi negocio es|negocio:|rubro:)\s*(?:una?\s+)?([^\n.,;]{3,40})/i], 40).toLowerCase();
  if (!giro) avisos.push(rubro ? `El rubro «${rubro}» no está en el catálogo: revisa negocio.rubro.` : 'No encontré el rubro: completa negocio.rubro.');

  // ---- nombre: lo que el cliente dice que se llama; si no, una frase con mayúsculas
  let nombre = primero(t, [
    /(?:se llama|el nombre es|nombre del negocio es|nombre comercial es|nombre comercial:|nombre:|nombre del negocio:|raz[oó]n social:|llamado|llamada|marca:)\s*([^\n.,;(]{2,50})/i,
    /\b([^\n.,;]{2,40}?)\s+es el nombre\b/i,
    /(?:mi (?:negocio|empresa|local|tienda|marca|estudio|consultorio)|nuestro (?:negocio|local|estudio))\s+(?:es|se llama)\s+([^\n.,;(]{2,50})/i,
    /\bsomos\s+((?:[A-ZÁÉÍÓÚÑ][\wáéíóúñ&'-]*)(?:[ \t]+(?:de|del|la|el|los|las|y|&)?[ \t]*(?:[A-ZÁÉÍÓÚÑ][\wáéíóúñ&'-]*)){0,4})\b/,
  ], 50);
  if (!nombre) {
    // frase de 2 a 5 palabras con mayúscula inicial (en la misma línea), que no sea una ciudad, una vía ni el dueño («soy Ana»)
    for (const m of texto.matchAll(/(?<!\bsoy\s)(?<!\bsra\.?\s)(?<!\bsr\.?\s)\b((?:[A-ZÁÉÍÓÚÑ][\wáéíóúñ&'-]+)(?:[ \t]+(?:de|del|la|el|los|las|y|&)?[ \t]*(?:[A-ZÁÉÍÓÚÑ][\wáéíóúñ&'-]+)){1,4})\b/g)) {
      const c = m[1];
      if (buscarCiudad(c) && c.split(' ').length <= 2) continue;
      if (/^(Av|Jr|Calle|Psje|Mz|Lun|Lunes|Hola|Buenas|Buenos|Gracias|Whatsapp|WhatsApp|Nombre|Precios?|Horario|Promo|Oferta|Correo|Mail|Cel|Tel|Wsp|Ciudad|Direcci[oó]n|Local|Rubro|Estimad[oa]s?|Saludos|Atte|Quiero|Necesito|Carta|Servicios|Productos|Tratamientos|Cursos|Clases)\b/i.test(c)) continue;
      nombre = c;
      break;
    }
  }
  if (!nombre) { nombre = capital(rubro) || '[completar]'; avisos.push('No encontré el nombre del negocio: lo puse como «' + nombre + '».'); }
  nombre = nombrePropio(nombre.replace(/\s+(es el nombre|y|que|en)$/i, ''));

  const lema = primero(t, [/(?:lema|eslogan|slogan|nos diferencia|lo nuestro es|nos caracteriza|nuestro lema es|frase)\s*(?:es|:)?\s*"?([^\n.;"]{4,70})"?/i], 70, sinRuido);

  // ---- servicios: viñetas (-, •, ✅, 1.), o la lista tras «ofrecemos / hacemos / servicios / vendemos»
  let servicios = [];
  // Palabras que anuncian la lista: verbos y cabeceras genéricas (con o sin «:») y los nombres de
  // sección del catálogo («Carta:», «Reservas:», «Tratamientos:»…), que solo cuentan con «:».
  const CLAVE_LISTA = new RegExp(`(?:(?:ofrecemos|hacemos|servicios|vendemos|lo que vendemos|productos|trabajamos con|nos dedicamos a|tenemos|carta|tratamientos|cursos|clases|especialidades|men[uú])\\s*:?|(?:${MENUS.join('|')})\\s*:)\\s*([^\\n]+)`, 'gi');
  // La lista en línea termina donde empiezan precios, promo, horario o una pregunta (fuera de paréntesis).
  // («Precios por volumen» es un servicio: «precios» solo corta si va con «:», «desde» o un monto.)
  const corte = (s) => s.split(/\.?\s*(?:(?:precios?|tarifas?)\s*(?::|desde\b|S\/)|cobramos|promo(?:ci[oó]n)?|oferta|horario|¿)(?![^(]*\))/i)[0];
  const trozos = (s) => corte(s).split(/;|,(?![^(]*\))| y (?=[A-ZÁÉÍÓÚ])/).map((x) => sinRuido(x));
  // En una línea corrida, la lista acaba en el primer trozo que es otro dato (teléfono, cierre, lema…).
  const partir = (s) => { const out = []; for (const x of trozos(s)) { if (esRuido(x, buscarCiudad)) break; out.push(x); } return out; };
  const vinetas = [...texto.matchAll(/^\s*(?:[-•*·▪●◦➡️➡→👉✅✔️✔✓🔹🔸⭐]+|\d{1,2}[.)])\s*(.+)$/gmu)]
    // «- servicios: corte, barba» dentro de una lista de viñetas se abre en sus items
    .flatMap((m) => (/^(?:servicios|ofrecemos|hacemos|productos|carta|tratamientos|cursos|clases|vendemos)\s*:/i.test(m[1]) ? partir(m[1].replace(/^[^:]*:\s*/, '')) : [corte(m[1])]))
    .filter((x) => !esRuido(limpiar(x), buscarCiudad));
  let items = vinetas.length >= 2 ? vinetas : [];
  if (!items.length) {
    // Varias frases pueden traer la palabra clave («tenemos oferta…», «servicios: …»): gana la que más items da.
    for (const m of texto.matchAll(CLAVE_LISTA)) {
      const cand = partir(m[1]).filter(Boolean);
      if (cand.length > items.length) items = cand;
    }
  }
  for (const it of items) {
    const s = limpiar(it);
    if (!s || /^(?:precios?|tarifas?)\s*(?::|desde\b|S\/)|^(?:promo|oferta|horario|direcci[oó]n|whatsapp|wsp|cel|tel[eé]fono|correo|mail|nombre|ciudad|local|rubro)\b/i.test(s)) continue;
    let titulo = s, textoItem = '';
    const par = /^(.*?)\s*\((.*)\)\s*$/.exec(s);
    const dosPuntos = /^([^:]{2,50}):\s*(.+)$/.exec(s);
    if (par) { titulo = par[1]; textoItem = par[2]; } else if (dosPuntos) { titulo = dosPuntos[1]; textoItem = dosPuntos[2]; }
    // «Corte S/ 25» o «corte a 25 soles»: el precio no es parte del nombre
    titulo = capital(limpiar(titulo).replace(/\s*(?:a|por|desde|:)?\s*S\/\.?\s*\d+.*$/i, '').replace(/\s*(?:a|por|desde)?\s*\d+(?:[.,]\d{2})?\s*soles.*$/i, ''));
    if (titulo.length > 2 && titulo.length <= 60) servicios.push({ titulo, texto: capital(limpiar(textoItem)) });
  }
  servicios = servicios.slice(0, 6);
  if (!servicios.length) avisos.push('No encontré la lista de servicios: agrega items en secciones[0].');

  // ---- precios: «Nombre S/ 25», «Nombre a 25 soles». Solo lo que está escrito.
  const precios = [];
  // La línea de la promoción no cuenta como lista de precios («antes S/ 24» no es un servicio).
  const textoSinPromo = texto.replace(/\b(?:promo(?:ci[oó]n)?|oferta|descuento)\b[^\n]*?(?=\.\s|\n|$)/gi, '');
  const agregarPrecio = (nombreP, precio) => {
    nombreP = capital(limpiar(nombreP).replace(/^(?:precios?|tarifas?|cobramos|desde|a|por|el|la|los|las|y|e|cuesta|sale|est[aá] a|est[aá] en|:)\s+/i, '').replace(/\s+(?:a|por|desde|cuesta|sale|est[aá] a|est[aá] en)$/i, ''));
    if (nombreP.length >= 3 && !/^(antes|normal|precio|total|solo|desde)$/i.test(nombreP) && !precios.some((p) => p.nombre === nombreP)) precios.push({ nombre: nombreP, precio });
  };
  for (const m of textoSinPromo.matchAll(/([A-Za-zÁÉÍÓÚáéíóúñÑ][^\n,;:()]{2,40}?)(?:\s+(?:a|por|desde|cuesta|sale|est[aá] a|est[aá] en)|\s*:)?\s*S\/\.?\s*(\d+(?:[.,]\d{2})?)/gi)) agregarPrecio(m[1], precioTexto(m[2]));
  for (const m of textoSinPromo.matchAll(/([A-Za-zÁÉÍÓÚáéíóúñÑ][^\n,;:()]{2,40}?)\s+(?:a|por|desde|cuesta|sale|est[aá] a|est[aá] en)\s+(\d+(?:[.,]\d{2})?)\s*soles\b/gi)) agregarPrecio(m[1], precioTexto(m[2]));
  // ---- promoción
  let oferta = null;
  const mOf = /(?:promo(?:ci[oó]n)?|oferta|descuento)\s*:?\s*([^\n]+)/i.exec(texto);
  if (mOf) {
    const linea = mOf[1];
    const ps = [...linea.matchAll(/S\/\.?\s*(\d+(?:[.,]\d{2})?)|(\d+(?:[.,]\d{2})?)\s*soles\b/gi)].map((x) => precioTexto(x[1] || x[2]));
    oferta = {
      etiqueta: 'Promoción',
      titulo: capital(limpiar(linea.split(/\s+(?:a|por)\s+(?:S\/|\d)/i)[0].replace(/S\/\.?\s*\d+.*$/, '').replace(/\d+(?:[.,]\d{2})?\s*soles.*$/i, '').replace(/^(?:tenemos|hay|esta semana|este mes|solo hoy)\s*:?\s*/i, '')) || 'Promoción del momento'),
      precio: ps[0] || '',
      antes: ps[1] || '',
      detalle: '',
      vigencia: (/(hasta[^\n,;.()]*|solo esta semana|esta semana|este mes|fin de mes|solo hoy|todo el mes)/i.exec(linea) || [''])[0].trim(),
      cta: 'Lo quiero',
    };
    if (!oferta.precio) oferta = null;
  }
  // ---- preguntas frecuentes: «¿...? respuesta.»
  const preguntas = [];
  for (const m of texto.matchAll(/(¿[^?\n]{5,90}\?)\s*([^¿\n]{3,120}?[.!])/g)) preguntas.push({ pregunta: limpiar(m[1]), respuesta: limpiar(m[2]) });

  const nombreCorto = nombre.split(' ')[0];
  const menu = giro ? giro.menu : 'Servicios';
  const negocio = { nombre, rubro: rubro || '[completar]', ciudad, whatsapp, telefono, correo, direccion, horario };
  if (lema) negocio.lema = capital(lema);
  for (const k of Object.keys(negocio)) if (!negocio[k]) delete negocio[k];
  const secciones = [
    { tipo: 'caracteristicas', id: 'servicios', menu, titulo: `Lo que *hacemos* en ${nombreCorto}`, items: servicios.length ? servicios : [{ titulo: '[completar]', texto: '' }] },
  ];
  // La sección de precios se dibuja desde «planes» (ver secciones.mjs), no desde «items».
  if (precios.length) secciones.push({ tipo: 'precios', id: 'precios', menu: 'Precios', titulo: 'Precios *claros*', planes: precios.slice(0, 8).map((p) => ({ nombre: p.nombre, precio: p.precio })) });
  if (preguntas.length) secciones.push({ tipo: 'preguntas', id: 'preguntas', titulo: 'Preguntas *frecuentes*', items: preguntas.slice(0, 6) });
  secciones.push({ tipo: 'contacto', id: 'contacto', menu: 'Contacto', titulo: 'Escríbenos', texto: horario ? `Atendemos ${horario.replace(/^(de\s+)?/i, '')}.` : 'Escríbenos por WhatsApp y te respondemos.' });

  const lugar = direccion ? direccion.split(',').pop().trim() : ciudad;
  const tituloGiro = giro ? giro.titulo : `${capital(rubro || 'Tu negocio')} en ${ciudad || 'tu ciudad'}.`;
  const salida = {
    estilo: opciones.estilo || 'apple',
    negocio,
    marca: { logo_texto: nombre },
    hero: {
      antetitulo: lugar ? `En ${lugar}` : 'Atención por WhatsApp',
      titulo: marcada(lema ? capital(lema).replace(/[.!]*$/, '.') : tituloGiro),
      subtitulo: servicios.length ? servicios.slice(0, 3).map((s) => s.titulo).join(', ') + (ciudad ? ` en ${ciudad}.` : '.') : (ciudad ? `${capital(rubro || 'Negocio')} en ${ciudad}.` : ''),
      cta: { texto: 'Escríbenos por WhatsApp', corto: 'Escríbenos', mensaje: `Hola, vi la página de ${nombre} y quiero información.` },
      cta2: { texto: `Ver ${menu.toLowerCase()}`, ancla: '#servicios' },
      imagen: 'hero',
    },
    oferta,
    secciones,
    imagenes: { hero: { descripcion: `Imagen principal de ${nombre}`, prompt: `${giro ? giro.imagen : sinTildes(rubro || 'small business') + ' storefront interior'}, clean, warm light, no people`, orientacion: 'horizontal' } },
  };
  return { negocio: salida, avisos, giro };
}

// ---------------------------------------------------------------------------------------------
// Mezcla reglas + modelo. El modelo de la clase (qwen-landing) se entrenó con este prompt exacto.
export const SISTEMA = 'Convierte el texto de un cliente en el JSON de su landing (negocio.json). '
  + 'Usa solo datos que el cliente dio: no inventes precios, cifras, direcciones ni testimonios. '
  + 'whatsapp: solo dígitos con código de país. En hero.titulo marca una palabra con *asteriscos*. '
  + 'Responde únicamente con el JSON.';

/** Saca el primer objeto JSON de una respuesta de modelo (quita <think>, vallas ``` y texto suelto). */
export function extraerJSON(contenido) {
  const s = String(contenido || '').replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/```(?:json)?/gi, '');
  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a < 0 || b <= a) throw new Error('la respuesta no trae un objeto JSON');
  return JSON.parse(s.slice(a, b + 1));
}

/** Llama al gateway (API compatible con OpenAI) y devuelve el JSON del modelo, o lanza un error con el motivo. */
export async function consultarModelo(texto, { url, clave, modelo = 'qwen-landing', tiempoMs = 60000, fetchImpl = globalThis.fetch } = {}) {
  if (!url || !clave) throw new Error('faltan JMD_URL o JMD_API_KEY');
  const ctrl = new AbortController();
  const reloj = setTimeout(() => ctrl.abort(), tiempoMs);
  try {
    const r = await fetchImpl(url.replace(/\/+$/, '') + '/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${clave}` },
      body: JSON.stringify({ model: modelo, temperature: 0.2, max_tokens: 1200, messages: [{ role: 'system', content: SISTEMA }, { role: 'user', content: texto }] }),
      signal: ctrl.signal,
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const cuerpo = await r.json();
    const contenido = cuerpo?.choices?.[0]?.message?.content;
    if (typeof contenido !== 'string') throw new Error('respuesta sin choices[0].message.content');
    return extraerJSON(contenido);
  } catch (e) {
    throw new Error(e.name === 'AbortError' ? `tardó más de ${Math.round(tiempoMs / 1000)} s` : e.message);
  } finally {
    clearTimeout(reloj);
  }
}

/**
 * Mezcla: hechos de las reglas + redacción del modelo. Del modelo se toman solo hero.titulo,
 * hero.subtitulo, hero.antetitulo, negocio.lema (si el cliente dio lema) y el texto de los items
 * cuyo título coincide y a los que el cliente no puso descripción. Un texto del modelo que traiga
 * un número que no está en el escrito del cliente se descarta (es un hecho inventado).
 */
export function mezclar(reglas, modelo, texto) {
  const salida = JSON.parse(JSON.stringify(reglas));
  const tomados = [], descartados = [];
  if (!modelo || typeof modelo !== 'object') return { negocio: salida, tomados, descartados: ['respuesta vacía'] };
  const numeros = new Set((String(texto).match(/\d+/g) || []));
  const sirve = (v, max) => {
    if (typeof v !== 'string') return false;
    const s = v.trim();
    if (s.length < 3 || s.length > max) return false;
    return (s.match(/\d+/g) || []).every((n) => numeros.has(n));
  };
  const tomar = (ruta, valor, max, transformar = (x) => x) => {
    if (valor === undefined || valor === null) return undefined;
    if (sirve(valor, max)) { tomados.push(ruta); return transformar(valor.trim()); }
    descartados.push(ruta);
    return undefined;
  };
  const h = modelo.hero || {};
  const titulo = tomar('hero.titulo', h.titulo, 90, marcada);
  if (titulo) salida.hero.titulo = titulo;
  const sub = tomar('hero.subtitulo', h.subtitulo, 220);
  if (sub) salida.hero.subtitulo = sub;
  const ante = tomar('hero.antetitulo', h.antetitulo, 60);
  if (ante) salida.hero.antetitulo = ante;
  if (reglas.negocio.lema && modelo.negocio && modelo.negocio.lema) {
    const lema = tomar('negocio.lema', modelo.negocio.lema, 80);
    if (lema) salida.negocio.lema = lema;
  }
  const itemsModelo = (modelo.secciones || []).filter((s) => s && s.tipo === 'caracteristicas').flatMap((s) => s.items || []);
  for (const it of salida.secciones[0].items) {
    if (it.texto || it.titulo === '[completar]') continue;
    const par = itemsModelo.find((x) => x && norm(x.titulo) === norm(it.titulo));
    if (!par) continue;
    const tx = tomar(`items.${it.titulo}.texto`, par.texto, 160);
    if (tx) it.texto = tx;
  }
  return { negocio: salida, tomados, descartados };
}

/**
 * Reglas siempre; modelo si el modo lo permite y hay gateway. Nunca falla por culpa del modelo.
 * opciones: { estilo, modo: 'auto'|'qwen-landing'|'no', url, clave, tiempoMs, fetchImpl }
 */
export async function extraerConModelo(texto, opciones = {}) {
  const modo = opciones.modo || 'auto';
  const reglas = extraer(texto, opciones);
  const url = opciones.url ?? process.env.JMD_URL;
  const clave = opciones.clave ?? process.env.JMD_API_KEY;
  const resultado = { ...reglas, modelo: 'no', tomados: [], descartados: [] };
  if (modo === 'no') return resultado;
  if (!url || !clave) {
    if (modo !== 'auto') reglas.avisos.push('Pediste el modelo pero faltan JMD_URL o JMD_API_KEY: sigo solo con reglas.');
    return resultado;
  }
  try {
    const respuesta = await consultarModelo(texto, { url, clave, modelo: modo === 'auto' ? 'qwen-landing' : modo, tiempoMs: opciones.tiempoMs, fetchImpl: opciones.fetchImpl });
    const { negocio, tomados, descartados } = mezclar(reglas.negocio, respuesta, texto);
    const { validar } = await import('./validar.mjs');
    const problemas = validar(negocio);
    if (problemas.length) {
      reglas.avisos.push('La mezcla con el modelo no pasó la validación (' + problemas[0] + '): sigo solo con reglas.');
      return resultado;
    }
    return { ...reglas, negocio, modelo: 'qwen-landing', tomados, descartados };
  } catch (e) {
    reglas.avisos.push(`El modelo no respondió (${e.message}): sigo solo con reglas.`);
    return resultado;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const archivo = args.find((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')));
  const opt = (k) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : undefined; };
  if (!archivo) { console.error('Uso: bun motor/extraer.mjs cliente.txt [--estilo apple] [--salida negocio.json] [--modelo auto|qwen-landing|no]'); process.exit(2); }
  const texto = archivo === '-' ? fs.readFileSync(0, 'utf8') : fs.readFileSync(archivo, 'utf8');
  const { negocio, avisos, modelo, tomados } = await extraerConModelo(texto, { estilo: opt('estilo'), modo: opt('modelo') || 'auto' });
  const json = JSON.stringify(negocio, null, 2);
  const salida = opt('salida');
  if (salida) fs.writeFileSync(salida, json + '\n'); else console.log(json);
  for (const a of avisos) console.error('aviso: ' + a);
  if (modelo !== 'no') console.error(`modelo: ${modelo} redactó ${tomados.length ? tomados.join(', ') : 'nada (todo quedó por reglas)'}; los datos salen de las reglas.`);
  if (salida) console.error(`OK ${salida} · ${negocio.secciones.length} secciones · siguiente: bun motor/construir.mjs --negocio ${salida} --estilo ${negocio.estilo} --imagenes no`);
}
