package main

// Taxonomía, equipo y tickets de ejemplo. Todo es ficticio: empresas,
// personas, proyectos y correos (dominios .example). No son datos de Sperant
// ni de ningún cliente real.

type Categoria struct {
	ID          string `json:"id"`
	Nombre      string `json:"nombre"`
	Descripcion string `json:"descripcion"`
	Area        string `json:"area"` // área responsable por defecto
}

type Area struct {
	ID     string `json:"id"`
	Nombre string `json:"nombre"`
}

type Persona struct {
	ID     string `json:"id"`
	Nombre string `json:"nombre"`
	Correo string `json:"correo"`
	Area   string `json:"area"`
	Cargo  string `json:"cargo"`
}

var areas = []Area{
	{"comercial", "Soporte comercial"},
	{"cobranzas", "Cobranzas"},
	{"facturacion", "Facturación y contabilidad"},
	{"datos", "Datos y reportes"},
	{"accesos", "Accesos y portal"},
}

var categorias = []Categoria{
	{"proyectos", "Proyectos y unidades", "Stock, tipologías, estados de unidad, listas de precios, tablero de disponibilidad.", "comercial"},
	{"cotizaciones", "Cotizaciones y proformas", "Generación, envío, vigencia y descuentos de cotizaciones y proformas; simulador de crédito.", "comercial"},
	{"separaciones", "Separaciones y contratos", "Separaciones, desistimientos, titulares, minutas y contratos de compraventa.", "comercial"},
	{"pagos", "Cronograma de pagos y cuotas", "Cronogramas, cuotas, mora, refinanciamientos, registro y conciliación de pagos.", "cobranzas"},
	{"contabilidad", "Integración contable y facturación", "Facturas, boletas, notas de crédito, SUNAT, asientos e interfaz contable.", "facturacion"},
	{"reportes", "Reportes", "Reportes comerciales y de gestión, exportaciones, tableros de gerencia.", "datos"},
	{"usuarios", "Usuarios y permisos", "Altas, bajas, perfiles, permisos, contraseñas, licencias y autenticación.", "accesos"},
	{"portal", "Portal del cliente", "Portal de propietarios: activación, documentos, avance de obra, notificaciones.", "accesos"},
	{"importacion", "Importación de datos", "Cargas masivas por plantilla: prospectos, unidades, clientes, pagos; migraciones.", "datos"},
}

// Equipo ficticio: 2–3 personas por área.
var equipo = []Persona{
	{"lparedes", "Lucía Paredes", "lucia.paredes@mesa-demo.example", "comercial", "Analista funcional comercial"},
	{"mquispe", "Martín Quispe", "martin.quispe@mesa-demo.example", "comercial", "Analista funcional comercial"},
	{"ecastro", "Elena Castro", "elena.castro@mesa-demo.example", "comercial", "Consultora senior"},
	{"rhuaman", "Rosa Huamán", "rosa.huaman@mesa-demo.example", "cobranzas", "Analista de cobranzas"},
	{"dsalazar", "Diego Salazar", "diego.salazar@mesa-demo.example", "cobranzas", "Analista de cobranzas"},
	{"cvillanueva", "Carmen Villanueva", "carmen.villanueva@mesa-demo.example", "facturacion", "Especialista en facturación electrónica"},
	{"jcardenas", "Jorge Cárdenas", "jorge.cardenas@mesa-demo.example", "facturacion", "Analista contable"},
	{"rgutierrez", "Renzo Gutiérrez", "renzo.gutierrez@mesa-demo.example", "datos", "Analista de datos"},
	{"pnavarro", "Patricia Navarro", "patricia.navarro@mesa-demo.example", "datos", "Analista de reportes"},
	{"smendoza", "Sofía Mendoza", "sofia.mendoza@mesa-demo.example", "accesos", "Administradora de accesos"},
	{"lalvarado", "Luis Alvarado", "luis.alvarado@mesa-demo.example", "accesos", "Soporte de portal"},
}

// Quien recibe la cola de revisión humana.
var coordinacion = Persona{"vrios", "Valeria Ríos", "valeria.rios@mesa-demo.example", "mesa", "Coordinadora de la mesa de ayuda"}

type Solicitante struct {
	Nombre  string
	Empresa string
	Correo  string
}

var solicitantes = []Solicitante{
	{"Marisol Ugarte", "Inmobiliaria Cedro Alto", "m.ugarte@cedroalto.example"},
	{"Andrés Polo", "Constructora Brisa del Valle", "apolo@brisadelvalle.example"},
	{"Karina Zevallos", "Grupo Ladera Norte", "kzevallos@laderanorte.example"},
	{"Hugo Talavera", "Habitarte Inversiones", "htalavera@habitarte.example"},
	{"Paola Ríos", "Desarrollos Puerto Lúcuma", "prios@puertolucuma.example"},
	{"Gonzalo Arce", "Inmobiliaria Cedro Alto", "garce@cedroalto.example"},
	{"Milagros Chávez", "Constructora Brisa del Valle", "mchavez@brisadelvalle.example"},
	{"Tomás Ibáñez", "Grupo Ladera Norte", "tibanez@laderanorte.example"},
	{"Daniela Ruiz", "Habitarte Inversiones", "druiz@habitarte.example"},
	{"Óscar Medina", "Desarrollos Puerto Lúcuma", "omedina@puertolucuma.example"},
	{"Verónica Lazo", "Inmobiliaria Cedro Alto", "vlazo@cedroalto.example"},
	{"Raúl Benavides", "Grupo Ladera Norte", "rbenavides@laderanorte.example"},
}

type Etiqueta struct {
	Categoria string `json:"categoria"`
	Area      string `json:"area"`
	Prioridad string `json:"prioridad"`
}

type TicketSemilla struct {
	ID          int
	Asunto      string
	Descripcion string
	Proyecto    string
	Oro         Etiqueta // etiqueta real, oculta: solo la usa la evaluación
}

func et(c, a, p string) Etiqueta { return Etiqueta{c, a, p} }

// 60 tickets con etiqueta. Varios mezclan temas a propósito (una proforma que
// termina en contrato, una importación de pagos): son los que ponen a prueba
// al clasificador y alimentan la cola de revisión.
var semilla = []TicketSemilla{
	{1001, "No puedo cambiar el estado de la unidad 504 a «bloqueada»", "En Torre Alameda Sur, al intentar bloquear el departamento 504 para una visita el sistema dice «estado no permitido». Con otras unidades sí funciona.", "Torre Alameda Sur", et("proyectos", "comercial", "media")},
	{1002, "Cuotas duplicadas en el cronograma de la clienta", "El cronograma de pagos de la clienta del dpto. 302 (Residencial Los Ficus) muestra la cuota 7 dos veces y el saldo no cuadra. Vino hoy a pagar y no sabemos cuál cobrar.", "Residencial Los Ficus", et("pagos", "cobranzas", "alta")},
	{1003, "Crear usuario para nueva asesora de ventas", "Ingresó Fiorella Campos como asesora en la sala de ventas de Villa Huarango. Necesita usuario con perfil vendedor, solo para ese proyecto.", "Villa Huarango", et("usuarios", "accesos", "media")},
	{1004, "Facturas de separación rechazadas por SUNAT", "Desde ayer las facturas electrónicas que emite el sistema por separaciones salen con estado «rechazado» y código 2800. Tenemos 14 comprobantes pendientes.", "Varios", et("contabilidad", "facturacion", "alta")},
	{1005, "La proforma no aplica el descuento por pronto pago", "Al generar la proforma del depa 1102 con «descuento contado 5 %», el PDF muestra el precio de lista sin descuento. En pantalla sí aparece.", "Torre Alameda Sur", et("cotizaciones", "comercial", "media")},
	{1006, "¿Cómo exporto el reporte de visitas por canal?", "Gerencia quiere el reporte de visitas de octubre separado por canal (Facebook, portal inmobiliario, referidos). ¿Dónde se configura esa vista?", "Varios", et("reportes", "datos", "baja")},
	{1007, "Error al importar Excel de prospectos", "Subimos la plantilla de prospectos de la feria (430 filas) y la importación se detiene en la fila 212 con «formato de teléfono inválido». No dice qué filas fallaron.", "Varios", et("importacion", "datos", "media")},
	{1008, "Cliente no puede ingresar al portal de propietarios", "El señor Benavides dice que el enlace de activación del portal del cliente le llega vencido. Ya se lo reenviamos dos veces.", "Parque Arequipa Norte", et("portal", "accesos", "media")},
	{1009, "No se genera el contrato de compraventa", "Al darle «generar minuta» a la separación SEP-2291 aparece un error y no se crea el contrato. El cliente firma mañana en notaría.", "Edificio Mirador 28", et("separaciones", "comercial", "alta")},
	{1010, "Lista de precios nueva no se refleja", "Cargamos la lista de precios de noviembre para Edificio Mirador 28, pero las unidades siguen mostrando el precio anterior en el tablero de disponibilidad.", "Edificio Mirador 28", et("proyectos", "comercial", "media")},
	{1011, "Reprogramar cronograma por refinanciamiento", "El cliente del lote 45 de Parque Arequipa Norte pidió pasar de 24 a 36 cuotas. ¿Cómo se reprograma el cronograma sin perder los pagos ya hechos?", "Parque Arequipa Norte", et("pagos", "cobranzas", "media")},
	{1012, "Usuarios bloqueados después del cambio de contraseña", "Toda el área de ventas de Brisas de Lurín quedó bloqueada tras la política de cambio de contraseña. Nadie puede ingresar al sistema desde las 9 a. m.", "Condominio Brisas de Lurín", et("usuarios", "accesos", "alta")},
	{1013, "Asiento contable de la separación va a cuenta equivocada", "La interfaz contable está enviando los abonos de separación a la cuenta 12 en lugar de la 122 (anticipos). El contador lo detectó en el cierre.", "Varios", et("contabilidad", "facturacion", "media")},
	{1014, "Agregar logo nuevo en la proforma", "Cambiamos de logo y queremos que las proformas y cotizaciones salgan con la imagen nueva. ¿Nos indican el tamaño recomendado?", "Varios", et("cotizaciones", "comercial", "baja")},
	{1015, "Reporte de ventas no coincide con el tablero", "El reporte de ventas mensual dice 18 unidades vendidas en octubre y el tablero de gerencia dice 21. ¿Cuál es el correcto?", "Varios", et("reportes", "datos", "media")},
	{1016, "Anular separación por desistimiento", "La clienta desistió de la compra del depa 803. Necesitamos anular la separación y liberar la unidad, pero el botón «anular» está deshabilitado.", "Torre Alameda Sur", et("separaciones", "comercial", "media")},
	{1017, "Carga masiva de unidades del nuevo proyecto", "Vamos a lanzar Condominio Brisas de Lurín etapa 2 con 160 unidades. ¿Pueden validar nuestra plantilla de importación de unidades antes de cargarla?", "Condominio Brisas de Lurín", et("importacion", "datos", "media")},
	{1018, "Cliente pide ver su estado de cuenta en el portal", "Varios propietarios preguntan si pueden descargar su estado de cuenta desde el portal del cliente en vez de pedirlo por correo.", "Residencial Los Ficus", et("portal", "accesos", "baja")},
	{1019, "Pago registrado dos veces por el banco", "La conciliación bancaria cargó dos veces el pago de la cuota 3 del cliente y el sistema le marca saldo a favor. Le están llegando avisos raros.", "Villa Huarango", et("pagos", "cobranzas", "alta")},
	{1020, "Agregar plano en la ficha de la unidad", "¿Se puede adjuntar el plano en PDF a cada tipología para que el asesor lo muestre en la ficha de la unidad?", "Varios", et("proyectos", "comercial", "baja")},
	{1021, "Asesor ve clientes de otro proyecto", "Un asesor de Torre Alameda Sur puede ver prospectos de Villa Huarango. Debería ver solo su proyecto. Revisar los permisos del perfil.", "Torre Alameda Sur", et("usuarios", "accesos", "media")},
	{1022, "Nota de crédito por devolución de separación", "Tenemos que emitir nota de crédito por la separación anulada SEP-2240 y el sistema no deja elegir la factura de origen.", "Edificio Mirador 28", et("contabilidad", "facturacion", "media")},
	{1023, "Cotización vence antes de tiempo", "Configuramos una vigencia de 15 días para las cotizaciones, pero los clientes reciben el correo diciendo que vence en 7.", "Varios", et("cotizaciones", "comercial", "media")},
	{1024, "Reporte de cobranza para directorio sale vacío", "Mañana es el directorio y el reporte de cobranza proyectada sale en blanco para todos los proyectos. Ayer funcionaba.", "Varios", et("reportes", "datos", "alta")},
	{1025, "Cambiar titular de la separación", "El cliente quiere poner a su esposa como cotitular antes de firmar el contrato. ¿Cómo agregamos un copropietario a la separación?", "Villa Huarango", et("separaciones", "comercial", "media")},
	{1026, "Importación de pagos del banco duplicó registros", "Subimos el archivo de recaudación del banco y se duplicaron 37 pagos. Necesitamos revertir la importación antes del cierre de hoy.", "Varios", et("importacion", "cobranzas", "alta")},
	{1027, "El portal muestra avance de obra desactualizado", "En el portal del cliente, la sección de avance de obra de Edificio Mirador 28 sigue con las fotos de agosto.", "Edificio Mirador 28", et("portal", "accesos", "media")},
	{1028, "Mora calculada sobre cuota ya pagada", "Al cliente del depa 1205 le aparece interés moratorio de la cuota 10, que pagó a tiempo. Adjunto el voucher.", "Torre Alameda Sur", et("pagos", "cobranzas", "media")},
	{1029, "Unidad aparece disponible pero ya está vendida", "El estacionamiento E-14 figura disponible en el tablero, pero se vendió con el depa 701. Un asesor casi lo vuelve a ofrecer.", "Edificio Mirador 28", et("proyectos", "comercial", "media")},
	{1030, "Dar de baja usuario de ex trabajador", "Jaime Osorio ya no trabaja con nosotros. Por favor desactivar su usuario y reasignar sus prospectos a otra asesora.", "Varios", et("usuarios", "accesos", "baja")},
	{1031, "Boletas sin enviar a SUNAT desde el lunes", "Las boletas de las cuotas iniciales no se están enviando a SUNAT. Aparecen «pendiente de envío» desde el lunes.", "Varios", et("contabilidad", "facturacion", "alta")},
	{1032, "Agregar columna de canal en reporte de prospectos", "¿Es posible agregar la columna «medio de captación» al reporte de prospectos que exportamos a Excel?", "Varios", et("reportes", "datos", "baja")},
	{1033, "No se puede enviar cotización por correo", "Desde esta mañana el botón «enviar cotización» da error 500 en todos los proyectos. Los asesores están mandando capturas por WhatsApp.", "Varios", et("cotizaciones", "comercial", "alta")},
	{1034, "Separación vencida liberó unidad con pago hecho", "La separación del depa 405 venció automáticamente y la unidad quedó libre, pero el cliente sí pagó la separación ayer. Otro asesor ya la está ofreciendo.", "Residencial Los Ficus", et("separaciones", "comercial", "alta")},
	{1035, "Plantilla para migrar clientes antiguos", "¿Tienen una plantilla de Excel para migrar los clientes de nuestro sistema anterior? Son unos 2000 registros.", "Varios", et("importacion", "datos", "baja")},
	{1036, "Portal del cliente caído", "El portal de propietarios muestra «servicio no disponible» para todos. Tenemos entrega de llaves esta semana y los clientes están llamando.", "Varios", et("portal", "accesos", "alta")},
	{1037, "Enviar recordatorio de cuota por WhatsApp", "¿El sistema puede enviar el recordatorio de vencimiento de cuota por WhatsApp además del correo?", "Varios", et("pagos", "cobranzas", "baja")},
	{1038, "Crear nueva tipología de departamento", "En Villa Huarango agregaron una tipología dúplex de 3 dormitorios. ¿Cómo la creamos y la asignamos a las unidades 901 a 908?", "Villa Huarango", et("proyectos", "comercial", "media")},
	{1039, "Permiso para aprobar descuentos", "La jefa de ventas necesita permiso para aprobar descuentos mayores al 3 % en cotizaciones. Hoy solo lo tiene gerencia.", "Varios", et("usuarios", "accesos", "media")},
	{1040, "Tipo de cambio incorrecto en facturas en dólares", "Las facturas de los departamentos vendidos en dólares toman el tipo de cambio del día anterior y no el de la fecha de emisión.", "Varios", et("contabilidad", "facturacion", "media")},
	{1041, "Embudo comercial no cuenta prospectos de la feria", "El reporte de embudo comercial no considera los 430 prospectos que importamos de la feria. ¿Hay que reprocesar algo?", "Varios", et("reportes", "datos", "media")},
	{1042, "Contrato generado con precio equivocado", "La minuta del depa 1102 (Torre Alameda Sur) salió con el precio de lista y no con el precio negociado de la proforma. El cliente lo detectó antes de firmar.", "Torre Alameda Sur", et("separaciones", "comercial", "alta")},
	{1043, "Simulador de crédito hipotecario en la cotización", "Al agregar el simulador de crédito en la cotización, la cuota mensual estimada sale en cero para plazos de 25 años.", "Varios", et("cotizaciones", "comercial", "media")},
	{1044, "Cliente pide constancia de no adeudo", "El propietario del depa 206 terminó de pagar y pide su constancia de no adeudo. El cronograma aún muestra una cuota pendiente de S/ 0.40.", "Residencial Los Ficus", et("pagos", "cobranzas", "media")},
	{1045, "Importación de unidades sobrescribió precios", "Al reimportar la plantilla de unidades para corregir áreas, se sobrescribieron también los precios de lista de toda la torre B.", "Torre Alameda Sur", et("importacion", "datos", "media")},
	{1046, "Clientes no reciben notificaciones del portal", "Los propietarios de Parque Arequipa Norte no reciben el correo del portal cuando se publica un documento nuevo.", "Parque Arequipa Norte", et("portal", "accesos", "media")},
	{1047, "No puedo ingresar, dice «usuario sin licencia»", "Al iniciar sesión me aparece «usuario sin licencia asignada». Soy la administradora del sistema y tengo que aprobar separaciones hoy.", "Varios", et("usuarios", "accesos", "alta")},
	{1048, "Consulta sobre centro de costos por proyecto", "¿La interfaz contable puede mandar el centro de costos por proyecto en cada asiento? Hoy lo agregamos a mano.", "Varios", et("contabilidad", "facturacion", "baja")},
	{1049, "Tablero de disponibilidad no carga", "El tablero de disponibilidad de unidades se queda cargando en todos los proyectos. Hay feria inmobiliaria este fin de semana.", "Varios", et("proyectos", "comercial", "alta")},
	{1050, "Reporte de comisiones de asesores incompleto", "El reporte de comisiones no incluye las ventas cuyo contrato se firmó con fecha del mes anterior.", "Varios", et("reportes", "datos", "media")},
	{1051, "Plantilla de contrato con nueva cláusula", "Legal agregó una cláusula de penalidad. ¿Cómo actualizamos la plantilla de contrato de compraventa en el sistema?", "Varios", et("separaciones", "comercial", "baja")},
	{1052, "Mostrar metraje de terraza en la proforma", "¿Se puede mostrar el área de terraza separada del área techada en la proforma que se entrega al cliente?", "Varios", et("cotizaciones", "comercial", "baja")},
	{1053, "No se puede registrar pago de cuota inicial", "Al registrar el pago de la cuota inicial del lote 12 aparece «cronograma bloqueado». El cliente está en la oficina esperando su recibo.", "Parque Arequipa Norte", et("pagos", "cobranzas", "alta")},
	{1054, "DNI se importa sin ceros a la izquierda", "Al importar clientes, los DNI que empiezan con 0 pierden el cero y luego no se encuentran al buscar.", "Varios", et("importacion", "datos", "media")},
	{1055, "¿El portal tiene versión en inglés?", "Tenemos compradores extranjeros. ¿El portal del cliente tiene versión en inglés?", "Varios", et("portal", "accesos", "baja")},
	{1056, "Factura de cuota sale con IGV en lote exonerado", "Las cuotas de los lotes de Parque Arequipa Norte están exoneradas, pero la factura de cada cuota sale con IGV.", "Parque Arequipa Norte", et("contabilidad", "facturacion", "media")},
	{1057, "Doble factor de autenticación para gerentes", "Queremos activar doble factor de autenticación solo para los perfiles de gerencia. ¿Está disponible?", "Varios", et("usuarios", "accesos", "media")},
	{1058, "Programar envío automático de reporte semanal", "Gerencia quiere recibir cada lunes el reporte de ventas y separaciones por correo sin tener que entrar al sistema.", "Varios", et("reportes", "datos", "media")},
	{1059, "Bloqueo masivo de unidades para canje", "Necesitamos bloquear 12 unidades de Edificio Mirador 28 que se entregarán al propietario del terreno por canje.", "Edificio Mirador 28", et("proyectos", "comercial", "media")},
	{1060, "Separación con dos unidades (depa + estacionamiento)", "Al separar el depa 604 con su estacionamiento, el sistema crea dos separaciones y cobra dos montos de separación.", "Villa Huarango", et("separaciones", "comercial", "media")},
}

// Tickets sin etiqueta para «simular llegada» desde /admin.
var llegadas = []TicketSemilla{
	{0, "No aparece el botón de descargar proforma", "Desde la actualización los asesores no ven el botón para descargar la proforma en PDF.", "Varios", Etiqueta{}},
	{0, "Cliente pagó la cuota 5 y sigue como vencida", "El voucher está conciliado pero la cuota 5 sigue en rojo en el cronograma del cliente.", "Villa Huarango", Etiqueta{}},
	{0, "Solicito acceso de solo lectura para auditoría", "Viene un auditor externo la próxima semana; necesita un usuario de solo lectura por 5 días.", "Varios", Etiqueta{}},
	{0, "El reporte de stock no suma estacionamientos", "En el reporte de stock por proyecto los estacionamientos y depósitos no se incluyen en el total.", "Edificio Mirador 28", Etiqueta{}},
	{0, "Factura emitida con RUC del cliente equivocado", "Se emitió la factura de la separación con el RUC de otra empresa del cliente. Hay que anularla y reemitir.", "Torre Alameda Sur", Etiqueta{}},
	{0, "Importar lista de referidos del evento", "Tenemos 85 referidos del evento de propietarios en Excel. ¿Los podemos cargar con la plantilla de prospectos?", "Varios", Etiqueta{}},
	{0, "Contrato no muestra el estacionamiento", "La minuta del depa 210 no lista el estacionamiento que sí está en la separación.", "Residencial Los Ficus", Etiqueta{}},
	{0, "Portal: los planos no se pueden abrir", "En el portal del cliente, al abrir los planos de la unidad aparece un archivo dañado.", "Condominio Brisas de Lurín", Etiqueta{}},
	{0, "Consulta general sobre el sistema", "Hola, tengo un problema con el sistema, ¿me pueden llamar?", "Varios", Etiqueta{}},
	{0, "Cambiar precio de un lote y su cronograma", "Se renegoció el precio del lote 33 y hay que actualizar la lista de precios y también las cuotas pendientes.", "Parque Arequipa Norte", Etiqueta{}},
}

func nombreArea(id string) string {
	for _, a := range areas {
		if a.ID == id {
			return a.Nombre
		}
	}
	if id == "mesa" {
		return "Coordinación de mesa"
	}
	return id
}

func nombreCategoria(id string) string {
	for _, c := range categorias {
		if c.ID == id {
			return c.Nombre
		}
	}
	if id == "sin_clasificar" {
		return "Sin clasificar"
	}
	return id
}

func categoriaValida(id string) bool {
	for _, c := range categorias {
		if c.ID == id {
			return true
		}
	}
	return false
}

func areaValida(id string) bool {
	for _, a := range areas {
		if a.ID == id {
			return true
		}
	}
	return false
}

func areaPorDefecto(cat string) string {
	for _, c := range categorias {
		if c.ID == cat {
			return c.Area
		}
	}
	return "mesa"
}

func persona(id string) (Persona, bool) {
	if id == coordinacion.ID {
		return coordinacion, true
	}
	for _, p := range equipo {
		if p.ID == id {
			return p, true
		}
	}
	return Persona{}, false
}
