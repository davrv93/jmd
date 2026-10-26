// Genera el banco de pruebas giros-100.jsonl: 100 textos de cliente (uno por giro) con el JSON esperado.
// Determinista (semilla fija): el mismo comando produce el mismo archivo. No usa IA ni red.
//
//   bun motor/pruebas/generar-banco.mjs                     # escribe motor/pruebas/giros-100.jsonl
//   bun motor/pruebas/generar-banco.mjs --n 100 --semilla 7 --salida otro.jsonl
//
// Cada línea: {"giro", "forma", "texto", "esperado"}. «esperado» sigue el contrato del motor
// (precios en «planes», rubro canónico del catálogo). Lo que el cliente no dijo, no aparece.
import fs from 'node:fs';
import path from 'node:path';
import { GIROS } from '../extraer.mjs';

const AQUI = path.dirname(new URL(import.meta.url).pathname);

// Generador pseudoaleatorio con semilla (mulberry32): mismos números en Bun y en Node.
function azar(semilla) {
  let a = semilla >>> 0;
  const siguiente = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  return {
    r: siguiente,
    entre: (a, b) => a + Math.floor(siguiente() * (b - a + 1)),
    uno: (lista) => lista[Math.floor(siguiente() * lista.length)],
    varios(lista, n) { const c = [...lista]; const out = []; while (out.length < n && c.length) out.push(c.splice(Math.floor(siguiente() * c.length), 1)[0]); return out; },
    si: (p) => siguiente() < p,
  };
}

// Servicios por giro: [título, descripción]. Son los que el cliente «escribe»; el extractor debe sacarlos tal cual.
export const SERVICIOS = {
  'cafetería': [['Café de especialidad', 'granos de Cajamarca tostados cada semana'], ['Desayunos', 'pan de masa madre y fruta'], ['Pastelería propia', 'tortas y galletas hechas en casa'], ['Café para llevar', 'listo en 3 minutos']],
  'restaurante': [['Menú del día', 'entrada, segundo y refresco'], ['Carta criolla', 'lomo saltado y ají de gallina'], ['Eventos', 'almuerzos corporativos'], ['Delivery', 'por WhatsApp']],
  'pollería': [['Pollo a la brasa', 'con papas y ensalada'], ['Salchipapas', 'clásica y especial'], ['Parrillas', 'los fines de semana'], ['Delivery', 'pedidos por WhatsApp']],
  'cevichería': [['Ceviche clásico', 'pescado del día con camote y choclo'], ['Jaleas', 'para compartir'], ['Chicharrón de pescado', 'con yuca'], ['Menú marino', 'de martes a domingo']],
  'pizzería': [['Pizzas artesanales', 'masa de 48 horas'], ['Pastas', 'caseras'], ['Calzones', 'rellenos al gusto'], ['Delivery', 'en 30 minutos']],
  'chifa': [['Arroz chaufa', 'de pollo, carne o mixto'], ['Tallarín saltado', 'al wok'], ['Combos familiares', 'para 4 personas'], ['Wantán frito', 'con salsa tamarindo']],
  'sanguchería': [['Sánguches criollos', 'chicharrón, pavo y lechón'], ['Hamburguesas', 'carne de la casa'], ['Jugos', 'fruta fresca'], ['Desayunos', 'desde temprano']],
  'hamburguesería': [['Hamburguesas clásicas', 'carne 150 g'], ['Hamburguesas dobles', 'con tocino'], ['Papas', 'rústicas y francesas'], ['Combos', 'con gaseosa']],
  'anticuchería': [['Anticuchos', 'de corazón al carbón'], ['Rachi y mollejitas', 'con papa dorada'], ['Picarones', 'con miel de chancaca'], ['Parrilla mixta', 'para compartir']],
  'picantería': [['Rocoto relleno', 'con pastel de papa'], ['Chupe de camarones', 'los viernes'], ['Adobo', 'los domingos'], ['Chicha de jora', 'de la casa']],
  'juguería': [['Jugos naturales', 'fruta del día'], ['Batidos', 'proteicos'], ['Desayunos', 'con pan y sándwich'], ['Ensaladas de fruta', 'con yogur y granola']],
  'heladería': [['Helados artesanales', 'de lúcuma, chirimoya y más'], ['Paletas', 'de fruta natural'], ['Tortas heladas', 'por encargo'], ['Milkshakes', 'con helado de la casa']],
  'panadería': [['Pan del día', 'francés, ciabatta y masa madre'], ['Tortas por encargo', 'cumpleaños y eventos'], ['Empanadas', 'de carne, pollo y verduras'], ['Delivery', 'pedidos por WhatsApp']],
  'pastelería': [['Tortas personalizadas', 'con diseño a pedido'], ['Postres', 'cheesecake y tres leches'], ['Cupcakes', 'por docena'], ['Mesa dulce', 'para eventos']],
  'catering': [['Almuerzos corporativos', 'desde 20 personas'], ['Buffet criollo', 'para eventos'], ['Coffee break', 'para reuniones'], ['Mozos y vajilla', 'incluidos']],
  'bar': [['Cócteles', 'pisco sour y chilcano'], ['Cervezas artesanales', 'de barril'], ['Piqueos', 'para compartir'], ['Música en vivo', 'los sábados']],
  'discoteca': [['Fiestas temáticas', 'cada fin de semana'], ['Zona VIP', 'con reserva'], ['Barra abierta', 'promociones'], ['Alquiler para eventos', 'privados']],
  'food truck': [['Hamburguesas', 'al carbón'], ['Alitas', 'BBQ y picantes'], ['Papas cargadas', 'con queso y tocino'], ['Eventos', 'llevamos el truck a tu fiesta']],
  'bodega': [['Abarrotes', 'arroz, azúcar, aceite'], ['Bebidas', 'gaseosas y cervezas frías'], ['Pan y lácteos', 'todos los días'], ['Recargas', 'de celular']],
  'minimarket': [['Abarrotes', 'marcas conocidas'], ['Frutas y verduras', 'frescas'], ['Licores', 'nacionales e importados'], ['Delivery', 'en la zona']],
  'frutería': [['Frutas de estación', 'del mercado mayorista'], ['Verduras', 'frescas cada mañana'], ['Canastas', 'de fruta para regalo'], ['Delivery', 'pedidos por WhatsApp']],
  'carnicería': [['Cortes de res', 'lomo, bife y asado'], ['Pollo', 'entero y en piezas'], ['Embutidos', 'chorizo y hot dog'], ['Cortes para parrilla', 'por encargo']],
  'pescadería': [['Pescado fresco', 'del día'], ['Mariscos', 'conchas, langostinos y pulpo'], ['Filetes', 'listos para cocinar'], ['Delivery', 'por la mañana']],
  'distribuidora': [['Abarrotes al por mayor', 'para bodegas'], ['Bebidas', 'por cajas'], ['Reparto', 'en camión'], ['Crédito', 'a clientes frecuentes']],
  'mayorista': [['Venta por mayor', 'a bodegas y minimarkets'], ['Precios por volumen', 'desde 10 unidades'], ['Reparto', 'a toda la ciudad'], ['Catálogo', 'por WhatsApp']],
  'farmacia': [['Medicamentos', 'genéricos y de marca'], ['Delivery', 'pedidos por WhatsApp'], ['Toma de presión', 'gratis'], ['Productos de cuidado', 'bebé y adulto mayor']],
  'óptica': [['Medida de la vista', 'gratis con tu compra'], ['Lentes de medida', 'en 24 horas'], ['Lentes de sol', 'con protección UV'], ['Lentes de contacto', 'de marca']],
  'ferretería': [['Herramientas', 'manuales y eléctricas'], ['Pinturas', 'preparación de color al instante'], ['Gasfitería y electricidad', 'todo para tu instalación'], ['Delivery', 'en moto']],
  'librería': [['Útiles escolares', 'listas completas por colegio'], ['Libros', 'novedades y por encargo'], ['Impresiones y copias', 'a color y blanco y negro'], ['Regalos', 'agendas y papelería fina']],
  'tienda de ropa': [['Ropa de mujer', 'colección nueva cada mes'], ['Ropa de hombre', 'básicos y de oficina'], ['Tallas grandes', 'del L al XXXL'], ['Envíos', 'a todo el país']],
  'zapatería': [['Calzado de dama', 'casual y de vestir'], ['Calzado de caballero', 'cuero legítimo'], ['Zapatillas', 'deportivas y urbanas'], ['Reparación', 'de suelas y tacos']],
  'joyería': [['Anillos de compromiso', 'en oro y plata'], ['Aretes y collares', 'diseño propio'], ['Grabados', 'personalizados'], ['Reparación de joyas', 'con garantía']],
  'juguetería': [['Juguetes didácticos', 'por edades'], ['Juegos de mesa', 'para toda la familia'], ['Peluches', 'de todos los tamaños'], ['Envoltura de regalo', 'gratis']],
  'tienda de regalos': [['Detalles personalizados', 'tazas, cuadros y llaveros'], ['Cajas de regalo', 'armadas a pedido'], ['Peluches y globos', 'para toda ocasión'], ['Delivery', 'el mismo día']],
  'florería': [['Arreglos florales', 'para cumpleaños y aniversarios'], ['Ramos de novia', 'diseño a medida'], ['Decoración de eventos', 'bodas y corporativos'], ['Delivery', 'el mismo día']],
  'mueblería': [['Juegos de sala', 'en tela y cuero'], ['Dormitorios', 'camas y roperos'], ['Comedores', 'de 4 y 6 sillas'], ['Crédito directo', 'sin tarjeta']],
  'vivero': [['Plantas de interior', 'fáciles de cuidar'], ['Suculentas y cactus', 'en maceta'], ['Tierra y abonos', 'orgánicos'], ['Asesoría de jardín', 'a domicilio']],
  'pet shop': [['Alimento para mascotas', 'marcas premium'], ['Accesorios', 'camas, correas y juguetes'], ['Baño y corte', 'con cita'], ['Delivery', 'en la zona']],
  'celulares': [['Cambio de pantalla', 'en el día'], ['Cambio de batería', 'con garantía'], ['Accesorios', 'fundas y cargadores'], ['Liberación', 'de equipos']],
  'computadoras': [['Formateo', 'con respaldo de archivos'], ['Cambio de disco SSD', 'con instalación'], ['Limpieza interna', 'y cambio de pasta térmica'], ['Venta de laptops', 'nuevas y seminuevas']],
  'videojuegos': [['Consolas', 'nuevas y usadas'], ['Juegos', 'físicos y digitales'], ['Accesorios', 'mandos y audífonos'], ['Reparación de consolas', 'con garantía']],
  'cibercafé': [['Internet', 'por horas'], ['Impresiones y escaneo', 'a color'], ['Trámites en línea', 'con ayuda'], ['Videollamadas', 'cabinas privadas']],
  'fotocopias': [['Fotocopias', 'blanco y negro y color'], ['Impresiones', 'desde tu celular'], ['Anillados y empastados', 'para tesis'], ['Escaneo', 'a PDF']],
  'imprenta': [['Tarjetas y volantes', 'desde 100 unidades'], ['Banners y gigantografías', 'en 24 horas'], ['Merchandising', 'polos, tazas y lapiceros'], ['Diseño', 'incluido']],
  'serigrafía': [['Polos estampados', 'por docena'], ['Sublimación', 'tazas y gorras'], ['Bordados', 'para uniformes'], ['Diseño', 'sin costo']],
  'llantas': [['Llantas nuevas', 'todas las marcas'], ['Alineamiento y balanceo', 'computarizado'], ['Parchado', 'al instante'], ['Aros', 'de aluminio']],
  'repuestos': [['Repuestos originales', 'para Toyota, Hyundai y Kia'], ['Filtros y aceites', 'de marca'], ['Frenos', 'pastillas y discos'], ['Envíos', 'a provincia']],
  'motos': [['Motos nuevas', 'lineales y scooters'], ['Motos seminuevas', 'revisadas'], ['Crédito', 'con DNI'], ['Cascos y accesorios', 'de marca']],
  'bicicletas': [['Mantenimiento', 'completo de bicicletas'], ['Repuestos', 'frenos, cadenas y llantas'], ['Venta de bicicletas', 'urbanas y de montaña'], ['Armado', 'a medida']],
  'agropecuaria': [['Alimento para animales', 'pollos, cerdos y vacas'], ['Semillas', 'certificadas'], ['Fertilizantes', 'y agroquímicos'], ['Asesoría técnica', 'en campo']],
  'pesca': [['Cañas y carretes', 'para mar y río'], ['Anzuelos y señuelos', 'de todas las medidas'], ['Ropa de pesca', 'impermeable'], ['Asesoría', 'para principiantes']],
  'clínica dental': [['Limpieza dental', 'profilaxis y fluorización'], ['Ortodoncia', 'brackets y alineadores'], ['Blanqueamiento', 'en una sola sesión'], ['Implantes', 'con tomografía y garantía']],
  'veterinaria': [['Consulta general', 'vacunas y desparasitación'], ['Baño y corte', 'con productos hipoalergénicos'], ['Cirugías', 'esterilización y emergencias'], ['Atención a domicilio', 'en toda la zona']],
  'psicólogo': [['Terapia individual', 'adultos y adolescentes'], ['Terapia de pareja', 'presencial u online'], ['Evaluación psicológica', 'con informe'], ['Sesiones online', 'por videollamada']],
  'nutricionista': [['Plan de alimentación', 'personalizado'], ['Control de peso', 'con seguimiento semanal'], ['Nutrición deportiva', 'para competir'], ['Consulta online', 'por videollamada']],
  'clínica estética': [['Limpieza facial', 'profunda con hidratación'], ['Depilación láser', 'diodo'], ['Rejuvenecimiento', 'radiofrecuencia y peelings'], ['Masajes reductores', 'con aparatología']],
  'spa': [['Masaje relajante', 'con aceites esenciales'], ['Masaje descontracturante', 'de espalda y cuello'], ['Facial hidratante', 'con mascarilla'], ['Circuito de spa', 'sauna y jacuzzi']],
  'consultorio médico': [['Medicina general', 'consulta y receta'], ['Pediatría', 'control del niño sano'], ['Certificados médicos', 'el mismo día'], ['Atención a domicilio', 'en la zona']],
  'fisioterapia': [['Rehabilitación', 'de lesiones deportivas'], ['Terapia de columna', 'lumbalgia y cervicalgia'], ['Masoterapia', 'descontracturante'], ['Electroterapia', 'y ultrasonido']],
  'laboratorio clínico': [['Análisis de sangre', 'hemograma y perfil lipídico'], ['Pruebas de embarazo', 'y hormonales'], ['Toma de muestra a domicilio', 'sin costo'], ['Resultados por WhatsApp', 'el mismo día']],
  'peluquería': [['Corte y peinado', 'para dama, caballero y niños'], ['Coloración', 'tintes, mechas y balayage'], ['Tratamientos', 'keratina y botox capilar'], ['Manicure y pedicure', 'con esmaltado semipermanente']],
  'barbería': [['Corte clásico', 'con máquina y tijera'], ['Perfilado de barba', 'con toalla caliente'], ['Corte y barba', 'combo completo'], ['Corte para niños', 'con paciencia']],
  'uñas': [['Manicure', 'tradicional y semipermanente'], ['Uñas acrílicas', 'con diseño'], ['Pedicure', 'spa'], ['Nail art', 'a mano alzada']],
  'maquillaje': [['Maquillaje de novia', 'con prueba previa'], ['Maquillaje social', 'para fiestas y graduaciones'], ['Peinados', 'recogidos y ondas'], ['Clases de automaquillaje', 'individuales']],
  'tatuajes': [['Tatuajes personalizados', 'diseño propio'], ['Fine line', 'y minimalistas'], ['Cover up', 'de tatuajes antiguos'], ['Piercings', 'con joyería de titanio']],
  'gimnasio': [['Musculación', 'máquinas y pesos libres'], ['Clases grupales', 'funcional, spinning y baile'], ['Entrenador personal', 'plan a tu medida'], ['Nutrición', 'evaluación y plan mensual']],
  'gimnasio de box': [['Boxeo recreativo', 'para todas las edades'], ['Boxeo competitivo', 'con entrenador'], ['Funcional', 'con saco y cuerda'], ['Clases para niños', 'desde los 8 años']],
  'cancha de fútbol': [['Alquiler de cancha', 'por hora'], ['Campeonatos', 'cada mes'], ['Cumpleaños deportivos', 'con cancha y parrilla'], ['Escuela de fútbol', 'para niños']],
  'yoga': [['Hatha yoga', 'para principiantes'], ['Vinyasa', 'nivel intermedio'], ['Yoga prenatal', 'grupos pequeños'], ['Meditación', 'los domingos']],
  'academia de baile': [['Salsa y bachata', 'desde cero'], ['Marinera', 'para niños y adultos'], ['Baile urbano', 'para jóvenes'], ['Coreografías', 'para 15 años y bodas']],
  'academia de música': [['Clases de guitarra', 'acústica y eléctrica'], ['Clases de piano', 'desde los 5 años'], ['Canto', 'técnica vocal'], ['Batería', 'con instrumento en el aula']],
  'academia de inglés': [['Clases para niños', 'grupos de 6'], ['Inglés para adultos', 'horarios de noche y sábados'], ['Preparación de exámenes', 'TOEFL e IELTS'], ['Clases online', 'en vivo']],
  'academia preuniversitaria': [['Ciclo regular', 'para San Marcos y UNI'], ['Ciclo intensivo', 'de verano'], ['Simulacros', 'semanales'], ['Asesoría', 'personalizada']],
  'academia': [['Cursos técnicos', 'cortos y prácticos'], ['Talleres', 'de fin de semana'], ['Certificación', 'al terminar'], ['Clases online', 'grabadas y en vivo']],
  'clases particulares': [['Matemática', 'primaria y secundaria'], ['Física y química', 'para universidad'], ['Reforzamiento escolar', 'a domicilio'], ['Preparación de exámenes', 'de admisión']],
  'colegio': [['Inicial', 'desde los 3 años'], ['Primaria', 'con inglés diario'], ['Secundaria', 'con preparación preuniversitaria'], ['Talleres', 'deporte, música y robótica']],
  'instituto': [['Computación e informática', '3 años'], ['Administración', 'con prácticas'], ['Enfermería técnica', 'con convenio hospitalario'], ['Carreras cortas', 'de 6 meses']],
  'guardería': [['Cuidado por horas', 'desde los 6 meses'], ['Estimulación temprana', 'grupos pequeños'], ['Alimentación', 'incluida'], ['Horario extendido', 'hasta las 7 pm']],
  'escuela de manejo': [['Clases prácticas', 'en auto mecánico y automático'], ['Curso teórico', 'para el examen de reglas'], ['Trámite de brevete', 'acompañamiento completo'], ['Clases a domicilio', 'te recogemos']],
  'estudio contable': [['Contabilidad mensual', 'libros, planillas y declaraciones'], ['Constitución de empresas', 'SAC y EIRL'], ['Declaración anual', 'personas y empresas'], ['Asesoría tributaria', 'SUNAT y fiscalizaciones']],
  'estudio de abogados': [['Derecho laboral', 'despidos y beneficios'], ['Derecho de familia', 'divorcios y alimentos'], ['Contratos', 'redacción y revisión'], ['Consulta inicial', 'gratuita']],
  'notaría': [['Escrituras públicas', 'compraventa y donación'], ['Poderes', 'generales y especiales'], ['Legalizaciones', 'de firmas y copias'], ['Constitución de empresas', 'en una semana']],
  'arquitecto': [['Diseño de viviendas', 'planos y 3D'], ['Remodelaciones', 'de casas y oficinas'], ['Licencias de construcción', 'ante la municipalidad'], ['Diseño de interiores', 'a medida']],
  'inmobiliaria': [['Venta de departamentos', 'proyectos en planos'], ['Alquiler', 'casas y oficinas'], ['Asesoría legal', 'en cada operación'], ['Tasaciones', 'en 48 horas']],
  'construcción': [['Construcción de casas', 'desde los cimientos'], ['Ampliaciones', 'segundo y tercer piso'], ['Acabados', 'pisos, pintura y techos'], ['Planos y licencias', 'incluidos']],
  'drywall': [['Tabiques de drywall', 'para dividir ambientes'], ['Cielo raso', 'con iluminación'], ['Oficinas modulares', 'en días'], ['Acabado pintado', 'incluido']],
  'vidriería': [['Mamparas', 'de vidrio templado'], ['Ventanas de aluminio', 'con vidrio insulado'], ['Espejos', 'a medida'], ['Puertas de ducha', 'instaladas']],
  'metalmecánica': [['Estructuras metálicas', 'techos y coberturas'], ['Puertas y rejas', 'de fierro'], ['Escaleras', 'metálicas'], ['Soldadura', 'a domicilio']],
  'carpintería': [['Muebles a medida', 'closets, cocinas y escritorios'], ['Puertas y ventanas', 'en madera'], ['Restauración', 'de muebles antiguos'], ['Melamina', 'proyectos completos']],
  'cerrajería': [['Apertura de puertas', 'sin dañar la chapa'], ['Cambio de chapas', 'de seguridad'], ['Duplicado de llaves', 'al instante'], ['Cerrajería automotriz', 'llaves con chip']],
  'gasfitería': [['Reparación de fugas', 'de agua y desagüe'], ['Instalación de termas', 'eléctricas y a gas'], ['Destape de desagües', 'con máquina'], ['Instalaciones nuevas', 'en obra']],
  'electricista': [['Instalaciones eléctricas', 'en casas y locales'], ['Tableros y pozos a tierra', 'con certificado'], ['Reparación de cortos', 'emergencias'], ['Iluminación LED', 'ahorro de energía']],
  'pintor': [['Pintado de interiores', 'con látex lavable'], ['Pintado de fachadas', 'con andamios'], ['Empastado', 'y resane de paredes'], ['Pintura de muebles', 'y puertas']],
  'jardinería': [['Mantenimiento de jardines', 'mensual'], ['Poda de árboles', 'y setos'], ['Instalación de grass', 'natural y sintético'], ['Riego tecnificado', 'por goteo']],
  'piscinas': [['Mantenimiento de piscinas', 'semanal'], ['Limpieza y cloración', 'con control de pH'], ['Reparación de bombas', 'y filtros'], ['Construcción de piscinas', 'a medida']],
  'limpieza': [['Limpieza de oficinas', 'diaria o semanal'], ['Limpieza de casas', 'por horas'], ['Lavado de muebles', 'y alfombras'], ['Limpieza final de obra', 'con equipo']],
  'seguridad': [['Cámaras de seguridad', 'con acceso desde el celular'], ['Alarmas', 'con sensores de movimiento'], ['Cercos eléctricos', 'instalados'], ['Vigilancia', 'con personal capacitado']],
  'lavandería': [['Lavado por kilo', 'lavado, secado y doblado'], ['Lavado en seco', 'ternos, vestidos y abrigos'], ['Edredones y cortinas', 'piezas grandes'], ['Recojo y entrega', 'a domicilio']],
  'lavado de autos': [['Lavado exterior', 'en 20 minutos'], ['Lavado completo', 'interior y exterior'], ['Encerado', 'con cera de carnauba'], ['Lavado de motor', 'con protección']],
  'taller mecánico': [['Mantenimiento preventivo', 'cambio de aceite y filtros'], ['Frenos', 'pastillas, discos y purgado'], ['Diagnóstico por escáner', 'en 15 minutos'], ['Planchado y pintura', 'con horno']],
  'taller de motos': [['Mantenimiento de motos', 'aceite, cadena y frenos'], ['Reparación de motor', 'con repuestos originales'], ['Cambio de llantas', 'al instante'], ['Sistema eléctrico', 'luces y batería']],
  'vulcanizadora': [['Parchado de llantas', 'en 10 minutos'], ['Cambio de llantas', 'autos y camionetas'], ['Balanceo', 'computarizado'], ['Auxilio en ruta', 'en la zona']],
  'grúa': [['Remolque de autos', 'con plataforma'], ['Auxilio mecánico', 'en carretera'], ['Traslado de maquinaria', 'ligera'], ['Servicio 24 horas', 'todos los días']],
  'taxi': [['Traslados al aeropuerto', 'puntuales'], ['Servicio por horas', 'para trámites'], ['Viajes a provincia', 'autos y vans'], ['Transporte de personal', 'para empresas']],
  'mudanzas': [['Mudanzas locales', 'con embalaje'], ['Mudanzas a provincia', 'con seguro'], ['Fletes', 'de muebles y electrodomésticos'], ['Embalaje', 'con cajas y protectores']],
  'courier': [['Envíos en la ciudad', 'el mismo día'], ['Envíos a provincia', 'en 24 a 48 horas'], ['Recojo a domicilio', 'sin costo'], ['Seguimiento', 'por WhatsApp']],
  'hostal': [['Habitaciones simples', 'con baño privado'], ['Habitaciones dobles', 'con TV y wifi'], ['Desayuno', 'incluido'], ['Estacionamiento', 'sin costo']],
  'hotel': [['Habitaciones ejecutivas', 'con escritorio y wifi'], ['Suites', 'con jacuzzi'], ['Restaurante', 'desayuno buffet'], ['Salón de eventos', 'para 100 personas']],
  'agencia de viajes': [['Paquetes nacionales', 'Cusco, Arequipa y la selva'], ['Viajes al extranjero', 'con asesoría de visas'], ['Full days', 'cada fin de semana'], ['Viajes corporativos', 'grupos y eventos']],
  'tours': [['City tour', 'medio día'], ['Tour gastronómico', 'con degustaciones'], ['Trekking', 'de un día'], ['Tours privados', 'con guía']],
  'eventos': [['Bodas', 'organización completa'], ['Quinceañeros', 'decoración y catering'], ['Eventos corporativos', 'con sonido y pantalla'], ['Alquiler de mobiliario', 'mesas y sillas']],
  'cumpleaños infantiles': [['Shows infantiles', 'con animadores'], ['Inflables', 'y juegos'], ['Decoración temática', 'globos y fondos'], ['Pintacaritas', 'y globoflexia']],
  'dj': [['DJ para bodas', 'con playlist a tu gusto'], ['Sonido e iluminación', 'equipos profesionales'], ['Fiestas corporativas', 'y aniversarios'], ['Karaoke', 'con pantalla']],
  'fotógrafo': [['Sesiones de retrato', 'en estudio o exteriores'], ['Bodas y eventos', 'cobertura completa'], ['Fotografía de producto', 'para tu tienda'], ['Entrega digital', 'en 7 días']],
  'funeraria': [['Servicio funerario completo', 'velatorio y traslado'], ['Cremación', 'con urna'], ['Planes previsionales', 'en cuotas'], ['Atención 24 horas', 'todos los días']],
  'seguros': [['SOAT', 'al instante'], ['Seguro vehicular', 'todo riesgo'], ['Seguro de salud', 'familiar'], ['Seguro de vida', 'con ahorro']],
  'préstamos': [['Préstamos personales', 'con DNI'], ['Préstamos para negocio', 'con boletas'], ['Empeño de joyas', 'tasación gratis'], ['Desembolso', 'en el día']],
  'cambio de moneda': [['Cambio de dólares', 'al mejor tipo'], ['Cambio de euros', 'y otras monedas'], ['Cambio por delivery', 'en la zona'], ['Cambio para empresas', 'montos grandes']],
  'consultora': [['Planes de negocio', 'para emprendedores'], ['Formalización', 'de empresas'], ['Gestión financiera', 'flujo de caja'], ['Capacitaciones', 'para equipos']],
  'marketing': [['Campañas en redes', 'Facebook e Instagram'], ['Publicidad digital', 'Google Ads'], ['Diseño de contenido', 'fotos y videos'], ['Estrategia de marca', 'mensual']],
  'diseño gráfico': [['Logos', 'con manual de marca'], ['Diseño para redes', 'paquetes mensuales'], ['Tarjetas y volantes', 'listos para imprimir'], ['Empaques', 'y etiquetas']],
  'community manager': [['Manejo de redes', 'Instagram, Facebook y TikTok'], ['Creación de contenido', 'fotos y reels'], ['Pauta publicitaria', 'con reporte mensual'], ['Atención de mensajes', 'en horario de oficina']],
  'desarrollo web': [['Páginas web', 'landing y tiendas'], ['Apps móviles', 'Android e iOS'], ['Sistemas a medida', 'ventas e inventario'], ['Soporte', 'mensual']],
  'soporte ti': [['Soporte técnico', 'remoto y presencial'], ['Redes y cableado', 'para oficinas'], ['Servidores', 'instalación y respaldo'], ['Mantenimiento de equipos', 'preventivo']],
  'ingeniería': [['Diseño estructural', 'de edificaciones'], ['Supervisión de obra', 'con informes'], ['Topografía', 'con drone'], ['Estudios de suelos', 'certificados']],
  'sastrería': [['Ternos a medida', 'con dos pruebas'], ['Arreglos de ropa', 'bastas y cierres'], ['Vestidos', 'de fiesta'], ['Uniformes', 'para empresas']],
  'artesanía': [['Cerámica', 'hecha a mano'], ['Textiles', 'de alpaca y algodón'], ['Joyería artesanal', 'en plata'], ['Envíos', 'a todo el país']],
};

// Profesiones: el negocio suele llevar el nombre de la persona.
const PROFESIONALES = new Set(['psicólogo', 'nutricionista', 'estudio de abogados', 'estudio contable', 'arquitecto', 'fotógrafo', 'dj', 'pintor', 'electricista', 'gasfitería', 'cerrajería', 'notaría', 'ingeniería', 'consultora', 'community manager', 'diseño gráfico', 'desarrollo web', 'soporte ti', 'seguros', 'clases particulares', 'maquillaje', 'tatuajes', 'sastrería', 'fisioterapia']);
// Palabra de marca cuando el rubro canónico no suena a nombre («tienda de ropa» → «Boutique»).
const MARCA = { 'tienda de ropa': 'Boutique', 'gimnasio de box': 'Box', 'cancha de fútbol': 'Cancha', 'lavado de autos': 'Car Wash', 'taller mecánico': 'Taller', 'taller de motos': 'Motos', 'academia de inglés': 'English', 'academia de baile': 'Danza', 'academia de música': 'Música', 'academia preuniversitaria': 'Academia', 'clínica dental': 'Dental', 'clínica estética': 'Estética', 'consultorio médico': 'Consultorio', 'laboratorio clínico': 'Laboratorio', 'tienda de regalos': 'Regalos', 'pet shop': 'Pet Shop', 'food truck': 'Food Truck', 'cumpleaños infantiles': 'Fiestas', 'cambio de moneda': 'Cambios', 'escuela de manejo': 'Autoescuela', 'estudio de abogados': 'Legal', 'estudio contable': 'Contable', 'agencia de viajes': 'Travel', 'desarrollo web': 'Digital', 'soporte ti': 'Sistemas', 'uñas': 'Nails', 'dj': 'DJ', 'cafetería': 'Café', 'spa': 'Spa', 'bar': 'Bar', 'yoga': 'Yoga' };

const APELLIDOS = ['Rojas', 'Quispe', 'Castillo', 'Huamán', 'Ramos', 'Torres', 'Mendoza', 'Vargas', 'Paredes', 'Salazar', 'Chávez', 'Soto', 'Ñahui', 'Pérez', 'Delgado', 'Vega', 'Zapata', 'Gutiérrez', 'Mamani', 'Carrasco'];
const NOMBRES = ['Lucía', 'Mateo', 'Valeria', 'Diego', 'Camila', 'Renzo', 'Ana', 'Jorge', 'Rosa', 'Luis', 'Mía', 'Carlos', 'Fiorella', 'Álvaro', 'Daniela', 'Paolo'];
const CIUDADES = ['Lima', 'Arequipa', 'Trujillo', 'Cusco', 'Chiclayo', 'Piura', 'Huancayo', 'Tacna', 'Iquitos', 'Juliaca', 'Ica', 'Cajamarca', 'Pucallpa', 'Chimbote', 'Tarapoto', 'Huaraz', 'Callao'];
const DISTRITOS = { Lima: ['Miraflores', 'San Isidro', 'Surco', 'Los Olivos', 'San Miguel', 'Jesús María', 'Lince', 'Pueblo Libre', 'Comas', 'La Molina', 'San Borja', 'Barranco', 'San Juan de Lurigancho'], Arequipa: ['Cayma', 'Yanahuara', 'Cerro Colorado', 'Paucarpata'], Cusco: ['Wanchaq', 'San Sebastián'], Trujillo: ['Víctor Larco', 'La Esperanza'], Callao: ['Bellavista', 'La Perla'] };
const VIAS = ['Av. Larco', 'Jr. Unión', 'Av. Arequipa', 'Calle Los Pinos', 'Av. Brasil', 'Jr. Cusco', 'Av. La Marina', 'Calle Las Begonias', 'Av. Angamos', 'Jr. Puno', 'Av. Universitaria', 'Calle Schell'];
const HORARIOS = ['Lun a sáb · {a}:00 a {b}:00', 'Lunes a viernes de {a} a {b}, sábados hasta las 14', 'Todos los días de {a}:00 a {b}:00', 'Lun a vie {a}:30 a {b}:00 · sáb {a}:30 a 13:00', 'de lunes a domingo de {a}am a {bpm}pm', 'L-V {a}:00-{b}:00', 'lunes a sabado {a} a {b} hrs', '{a}am - {bpm}pm todos los días'];
const LEMAS = ['atención personalizada', 'calidad a buen precio', 'rápido y con garantía', 'trato de familia', 'sin cita previa', 'años de experiencia', 'puntualidad y buen trato'];
const FAQ = [['¿Aceptan tarjeta?', 'Sí, todas las tarjetas y Yape.'], ['¿Hacen delivery?', 'Sí, dentro de la zona.'], ['¿Necesito cita?', 'No, atendemos por orden de llegada.'], ['¿Hay estacionamiento?', 'Sí, frente al local.'], ['¿Atienden feriados?', 'Sí, en horario normal.']];
const FORMAS = ['whatsapp', 'correo', 'notas', 'minusculas', 'emojis', 'telegrama', 'numerado', 'escueto'];

const sinTildes = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
const titulo = (s) => s.split(' ').map((p) => (['de', 'del', 'la', 'el', 'y'].includes(p) ? p : p[0].toUpperCase() + p.slice(1))).join(' ');
const art = (r) => (/(a|ía|ción|ad)$/.test(r) && !/(dj|spa|bar|chifa|yoga|catering|food truck|pet shop|drywall|marketing|minimarket|hotel|hostal|courier|taxi|gimnasio|colegio|instituto|arquitecto|psicólogo|fotógrafo|pintor|electricista|nutricionista|vivero|laboratorio clínico|consultorio médico|taller de motos|taller mecánico|estudio contable|estudio de abogados|lavado de autos|desarrollo web|soporte ti|cambio de moneda|community manager|catering)$/.test(r) ? 'una' : 'un');

function nombrePara(giro, r) {
  const ap = r.uno(APELLIDOS), nom = r.uno(NOMBRES);
  const G = MARCA[giro.rubro] || titulo(giro.rubro);
  const patrones = PROFESIONALES.has(giro.rubro)
    ? ['{nom} {ap}', 'Estudio {ap}', '{ap} & Asociados', '{nom} {ap} {G}']
    : giro.menu === 'Carta'
      ? ['{G} {nom}', '{G} Don {nom}', 'El Rincón de {nom}', '{ap} {G}', 'Sabor {ap}']
      : ['{G} {ap}', '{G} {nom}', '{ap} {G}', '{G} San {nom}', 'Casa {ap}'];
  return r.uno(patrones).replace('{nom}', nom).replace('{ap}', ap).replace('{G}', G);
}
const correoDe = (nombre, r) => `${r.uno(['hola', 'info', 'contacto', 'ventas'])}@${sinTildes(nombre.toLowerCase()).replace(/[^a-z0-9]/g, '').slice(0, 14)}.${r.uno(['pe', 'com', 'com.pe'])}`;
function horarioDe(r) {
  const [a, b] = r.uno([[7, 21], [8, 18], [9, 20], [10, 22], [6, 14], [8, 17], [11, 23]]);
  return r.uno(HORARIOS).replace(/\{a\}/g, a).replace(/\{b\}/g, b).replace(/\{bpm\}/g, b > 12 ? b - 12 : b);
}
const precioDe = (r) => r.uno([15, 18, 20, 25, 30, 35, 45, 50, 60, 80, 99, 120, 150, 180, 250, 300]);
function waFormato(wa, r) {
  const a = wa.slice(0, 3), b = wa.slice(3, 6), c = wa.slice(6);
  return r.uno([`${a} ${b} ${c}`, `+51 ${a} ${b} ${c}`, `${a}-${b}-${c}`, wa, `+51${wa}`, `51 ${a} ${b} ${c}`]);
}

/** Un caso del banco: texto del cliente + JSON esperado. */
export function caso(giro, forma, r) {
  const rubroEscrito = r.uno(giro.alias); // sinónimo o sin tilde: el extractor debe devolver el canónico
  const nombre = nombrePara(giro, r);
  const ciudad = r.uno(CIUDADES);
  const distrito = DISTRITOS[ciudad] ? r.uno(DISTRITOS[ciudad]) : '';
  const via = `${r.uno(VIAS)} ${r.entre(100, 2999)}`;
  const wa = '9' + String(r.entre(10000000, 99999999));
  const servicios = r.varios(SERVICIOS[giro.rubro], r.entre(2, Math.min(4, SERVICIOS[giro.rubro].length)));
  const con = { correo: r.si(0.55), direccion: r.si(0.75), horario: r.si(0.7), precios: r.si(0.45), oferta: r.si(0.3), faq: r.si(0.3), lema: r.si(0.4), soloDistrito: !!distrito && r.si(0.25) };
  const dueno = r.uno(NOMBRES);
  const lema = r.uno(LEMAS);
  const precios = con.precios ? servicios.slice(0, r.entre(1, servicios.length)).map((s) => [s[0], precioDe(r)]) : [];
  const enSoles = con.precios && r.si(0.35);
  const pOferta = r.uno([20, 25, 30, 40, 50, 80]);
  const oferta = con.oferta ? { titulo: `${servicios[0][0]} con descuento`, precio: pOferta, antes: pOferta + r.uno([5, 10, 15, 20]), vigencia: r.uno(['hasta fin de mes', 'solo esta semana', 'hasta el domingo']) } : null;
  const faq = con.faq ? r.varios(FAQ, 2) : [];
  const mail = con.correo ? correoDe(nombre, r) : '';
  const hor = con.horario ? horarioDe(r) : '';
  const direccionTxt = con.direccion ? `${via}, ${distrito || ciudad}` : '';
  const lugarFrase = con.soloDistrito ? r.uno([`atendemos en ${distrito}`, `estamos en ${distrito}`]) : r.uno([`estamos en ${ciudad}`, distrito ? `atendemos en ${distrito}, ${ciudad}` : `atendemos en ${ciudad}`, `ciudad: ${ciudad}`]);

  const P = [];
  const sep = forma === 'whatsapp' || forma === 'minusculas' ? r.uno(['. ', '\n', ', ']) : '\n';
  const servParen = () => servicios.map(([t, d]) => `${t} (${d})`).join('; ');
  const servVinetas = (b) => servicios.map(([t, d]) => `${b} ${t}: ${d}`).join('\n');
  const preciosFrase = () => (enSoles ? precios.map(([t, p]) => `${t} a ${p} soles`).join(', ') : r.uno(['precios: ', 'tarifas: ', 'cobramos ']) + precios.map(([t, p]) => `${t} S/ ${p}`).join(', '));
  const ofertaFrase = () => r.uno([`promo: ${oferta.titulo.toLowerCase()} a S/ ${oferta.precio} (antes S/ ${oferta.antes}) ${oferta.vigencia}`, `tenemos oferta ${oferta.vigencia}: ${oferta.titulo.toLowerCase()} S/ ${oferta.precio}, normal S/ ${oferta.antes}`]);
  const faqFrase = () => 'preguntas que siempre hacen: ' + faq.map(([q, a]) => `${q} ${a}`).join(' ');
  const lemaFrase = () => r.uno([`lo nuestro es ${lema}`, `nos diferencia: ${lema}`, `lema: ${lema}`]);

  if (forma === 'telegrama') {
    // Sin frase de presentación: nombre arriba, datos sueltos, rubro en una línea aparte
    P.push(nombre, `Rubro: ${rubroEscrito}`);
    if (direccionTxt) P.push(direccionTxt);
    P.push(lugarFrase, `WhatsApp ${waFormato(wa, r)}`);
    if (mail) P.push(mail);
    if (hor) P.push(`Horario: ${hor}`);
    P.push(`${giro.menu}: ${servParen()}`);
  } else if (forma === 'correo') {
    P.push(r.uno(['Buenas tardes,', 'Estimados,', 'Hola, buen día.']));
    P.push(`Les escribo porque necesito una página web para mi ${rubroEscrito}. El nombre es ${nombre}.`);
    P.push(`${lugarFrase[0].toUpperCase()}${lugarFrase.slice(1)}.${direccionTxt ? ` La dirección es ${direccionTxt}.` : ''}`);
    P.push(`Mi WhatsApp es ${waFormato(wa, r)}${mail ? ` y el correo ${mail}` : ''}.`);
    if (hor) P.push(`Atendemos ${hor}.`);
    P.push(`Ofrecemos: ${servParen()}.`);
  } else if (forma === 'escueto') {
    // Lista corta de servicios sin descripciones, separada por comas
    P.push(r.uno([`${rubroEscrito} en ${ciudad}, se llama ${nombre}`, `tengo ${art(giro.rubro)} ${rubroEscrito}, ${nombre} es el nombre, ${lugarFrase}`]));
    if (direccionTxt) P.push(`local: ${direccionTxt}`);
    P.push(r.uno([`wsp ${waFormato(wa, r)}`, `cel ${waFormato(wa, r)} (whatsapp)`]));
    if (mail) P.push(`mail: ${mail}`);
    if (hor) P.push(`horario ${hor}`);
    P.push(`hacemos ${servicios.map(([t]) => t).slice(0, -1).join(', ')}${servicios.length > 1 ? ' y ' : ''}${servicios[servicios.length - 1][0]}`);
  } else {
    const pres = r.uno([`hola, soy ${dueno} y tengo ${art(giro.rubro)} ${rubroEscrito}`, `buenas! necesito una pagina para mi ${rubroEscrito}`, `Hola. Te escribo por la web de mi negocio, es ${art(giro.rubro)} ${rubroEscrito}`, `mi negocio: ${rubroEscrito}`]);
    P.push(pres);
    if (forma === 'emojis') P.push(r.uno(['✨', '📍', '🙌', '🔥']));
    P.push(r.uno([`se llama ${nombre}`, `el nombre es ${nombre}`, `Nombre: ${nombre}`, `${nombre} es el nombre`]));
    P.push(lugarFrase);
    if (direccionTxt) P.push(r.uno([`la direccion es ${direccionTxt}`, `local: ${via} - ${distrito || ciudad}`, `nos encuentras en ${via} (${distrito || ciudad})`]));
    P.push(r.uno([`mi whatsapp es ${waFormato(wa, r)}`, `wsp: ${waFormato(wa, r)}`, `numero ${waFormato(wa, r)}`, `cel ${waFormato(wa, r)} (whatsapp)`]));
    if (mail) P.push(r.uno([`correo ${mail}`, `mail: ${mail}`]));
    if (hor) P.push(r.uno([`horario: ${hor}`, `atendemos ${hor}`, `abrimos ${hor}`]));
    const clave = r.uno(['ofrecemos', 'hacemos', 'servicios:', 'lo que vendemos:']);
    if (forma === 'notas') P.push(`${clave}\n${servVinetas('-')}`);
    else if (forma === 'emojis') P.push(`${clave}\n${servVinetas('✅')}`);
    else if (forma === 'numerado') P.push(`${clave}\n${servicios.map(([t, d], i) => `${i + 1}. ${t}: ${d}`).join('\n')}`);
    else P.push(`${clave} ${servParen()}`);
  }
  if (precios.length) P.push(preciosFrase());
  if (oferta) P.push(ofertaFrase());
  if (faq.length) P.push(faqFrase());
  if (con.lema) P.push(lemaFrase());
  if (forma !== 'telegrama') P.push(r.uno(['quiero que se vea profesional', 'que tenga boton de whatsapp', 'algo simple y bonito', 'gracias!', '', '🙏', '👍 gracias']));
  if (forma === 'correo') P.push(r.uno(['Saludos,', 'Gracias de antemano.', 'Quedo atento.']));
  let texto = P.filter(Boolean).join(sep);
  if (forma === 'minusculas') texto = texto.toLowerCase();

  // ---- JSON esperado: solo lo que dio el cliente, con el contrato del motor
  const negocio = { nombre, rubro: giro.rubro, ciudad, whatsapp: '51' + wa, telefono: `${wa.slice(0, 3)} ${wa.slice(3, 6)} ${wa.slice(6)}` };
  if (con.lema) negocio.lema = lema[0].toUpperCase() + lema.slice(1);
  if (mail) negocio.correo = mail;
  if (direccionTxt) negocio.direccion = direccionTxt;
  if (hor) negocio.horario = hor;
  const secciones = [{ tipo: 'caracteristicas', id: 'servicios', menu: giro.menu, titulo: `Lo que *hacemos* en ${nombre}`, items: servicios.map(([t, d]) => ({ titulo: t, texto: forma === 'escueto' ? '' : d[0].toUpperCase() + d.slice(1) })) }];
  if (precios.length) secciones.push({ tipo: 'precios', id: 'precios', menu: 'Precios', titulo: 'Precios *claros*', planes: precios.map(([t, p]) => ({ nombre: t, precio: `S/ ${p}` })) });
  if (faq.length) secciones.push({ tipo: 'preguntas', id: 'preguntas', titulo: 'Preguntas *frecuentes*', items: faq.map(([q, a]) => ({ pregunta: q, respuesta: a })) });
  secciones.push({ tipo: 'contacto', id: 'contacto', menu: 'Contacto', titulo: 'Escríbenos', texto: 'Respondemos por WhatsApp en horario de atención.' });
  const esperado = {
    estilo: 'apple',
    negocio,
    marca: { logo_texto: nombre },
    hero: {
      antetitulo: `En ${distrito && con.direccion ? distrito : ciudad}`,
      titulo: con.lema ? `*${negocio.lema.split(' ')[0]}*${negocio.lema.slice(negocio.lema.split(' ')[0].length)}.` : giro.titulo,
      subtitulo: `${servicios[0][0]} y ${servicios[1] ? servicios[1][0].toLowerCase() : 'más'} en ${ciudad}.`,
      cta: { texto: 'Escríbenos por WhatsApp', corto: 'Escríbenos', mensaje: `Hola, vi la página de ${nombre} y quiero información.` },
      cta2: { texto: `Ver ${giro.menu.toLowerCase()}`, ancla: '#servicios' },
      imagen: 'hero',
    },
    oferta: oferta ? { etiqueta: 'Promoción', titulo: oferta.titulo, precio: `S/ ${oferta.precio}`, antes: `S/ ${oferta.antes}`, detalle: '', vigencia: oferta.vigencia, cta: 'Lo quiero' } : null,
    secciones,
    imagenes: { hero: { descripcion: `Imagen principal de ${nombre}`, prompt: `${giro.imagen}, clean, warm light, no people`, orientacion: 'horizontal' } },
  };
  return { giro: giro.rubro, forma, texto, esperado };
}

export function generarBanco({ n = 100, semilla = 7 } = {}) {
  const r = azar(semilla);
  const faltan = GIROS.filter((g) => !SERVICIOS[g.rubro]).map((g) => g.rubro);
  if (faltan.length) throw new Error('Giros sin servicios en SERVICIOS: ' + faltan.join(', '));
  const elegidos = r.varios(GIROS, Math.min(n, GIROS.length));
  return elegidos.map((g, i) => caso(g, FORMAS[i % FORMAS.length], r));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
  const salida = opt('salida', path.join(AQUI, 'giros-100.jsonl'));
  const casos = generarBanco({ n: Number(opt('n', 100)), semilla: Number(opt('semilla', 7)) });
  fs.writeFileSync(salida, casos.map((c) => JSON.stringify(c)).join('\n') + '\n');
  const porForma = {};
  for (const c of casos) porForma[c.forma] = (porForma[c.forma] || 0) + 1;
  console.log(`OK ${salida} · ${casos.length} casos · ${GIROS.length} giros en el catálogo · formas: ${Object.entries(porForma).map(([k, v]) => `${k} ${v}`).join(', ')}`);
}
