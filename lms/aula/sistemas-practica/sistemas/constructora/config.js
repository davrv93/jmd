/*
 * Constructora Ingeniería Sur · Obras, valorizaciones y requisiciones (Arequipa)
 * ----------------------------------------------------------------------------
 * Configuración del sistema de práctica «constructora». Es lo ÚNICO que cambia
 * entre sistemas: el núcleo (nucleo/js) lee este archivo y arma la aplicación.
 * Los datos son inventados (RUC y teléfonos de ejemplo, nombres de obras y
 * empresas ficticios) y no corresponden a personas ni empresas reales. Todo el
 * código es ES5 (sin flechas, let, const ni plantillas).
 *
 * Cómo se calcula una valorización (resumen para quien lea este archivo):
 *   - Costo directo = Σ metrado del periodo × precio unitario de cada partida.
 *   - Se le suman gastos generales y utilidad (porcentajes de la obra o, si la
 *     obra no define el suyo, los del negocio) y sobre ese subtotal se calcula el IGV.
 *   - Del total se descuentan la retención de garantía y la amortización del
 *     adelanto directo (proporcional al subtotal); lo que queda es el neto a cobrar.
 *   - El avance real acumulado compara lo valorizado con el presupuesto; el
 *     programado sigue una curva S: 100 × (3t² − 2t³), con t = tiempo transcurrido / plazo.
 */
(function () {
  'use strict';

  /* ---------- Ayudas locales (solo para este archivo) ---------- */

  var MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

  /* '2026-06' → 'jun 2026' */
  function nombreMes(clave) {
    return MESES[parseInt(clave.slice(5, 7), 10) - 1] + ' ' + clave.slice(0, 4);
  }

  function diasDelMes(clave) {
    return new Date(parseInt(clave.slice(0, 4), 10), parseInt(clave.slice(5, 7), 10), 0).getDate();
  }

  /* Último día de un mes 'AAAA-MM' como fecha ISO. */
  function finDeMes(clave) {
    var d = diasDelMes(clave);
    return clave + '-' + (d < 10 ? '0' : '') + d;
  }

  /* Las últimas n claves 'AAAA-MM' hasta el mes de hoy, en orden cronológico. */
  function ultimosMeses(ctx, n) {
    var hoy = ctx.hoy(), a = parseInt(hoy.slice(0, 4), 10), m = parseInt(hoy.slice(5, 7), 10), r = [], i, mm, aa;
    for (i = n - 1; i >= 0; i--) {
      mm = m - i;
      aa = a;
      while (mm < 1) { mm += 12; aa -= 1; }
      r.push(aa + '-' + (mm < 10 ? '0' : '') + mm);
    }
    return r;
  }

  function porcentaje(ctx, parte, total) { return total > 0 ? ctx.redondear(parte / total * 100) : 0; }

  /* Curva S: avance programado (en %) cuando ha transcurrido la fracción t del plazo. */
  function curvaS(t) {
    if (t <= 0) { return 0; }
    if (t >= 1) { return 100; }
    return 100 * (3 * t * t - 2 * t * t * t);
  }

  /* Avance programado de una obra en una fecha, según la curva S. */
  function programado(obra, fecha, ctx) {
    if (!obra || !obra.fechaInicio || !obra.plazoDias) { return 0; }
    return ctx.redondear(curvaS(ctx.diasEntre(obra.fechaInicio, fecha) / obra.plazoDias));
  }

  /* Valorizaciones aprobadas (no borradores ni anuladas), con filtro opcional. */
  function aprobadas(ctx, filtro) {
    return ctx.datos.listar('valorizaciones', function (v) { return v.estado === 'Aprobada' && (!filtro || filtro(v)); });
  }

  /* Costo directo valorizado de una obra hasta una fecha (inclusive). */
  function valorizadoCD(ctx, obraId, hasta) {
    return ctx.redondear(ctx.suma(aprobadas(ctx, function (v) { return v.proyecto === obraId && (!hasta || v.fecha <= hasta); }), function (v) { return v.totales.costoDirecto; }));
  }

  /* Metrado de una partida ya valorizado en documentos aprobados (sin contar el documento `excluirId`). */
  function metradoAcumulado(ctx, partidaId, excluirId) {
    var total = 0, docs = aprobadas(ctx, function (v) { return v.id !== excluirId; }), i, j;
    for (i = 0; i < docs.length; i++) {
      for (j = 0; j < docs[i].lineas.length; j++) {
        if (docs[i].lineas[j].item === partidaId) { total += docs[i].lineas[j].metrado; }
      }
    }
    return Math.round(total * 1e6) / 1e6;
  }

  /* Avance real de una obra en %: costo directo valorizado entre el presupuesto. */
  function avanceReal(obra, ctx, hasta) {
    return obra.presupuesto > 0 ? ctx.redondear(valorizadoCD(ctx, obra.id, hasta) / obra.presupuesto * 100) : 0;
  }

  /* Nombre de una obra por su id (o el id si ya no existe). */
  function nombreObra(ctx, id) {
    var o = ctx.datos.obtener('proyectos', id);
    return o ? o.nombre : id;
  }

  /* La partida sin el nombre de la obra que la encabeza: «02.01 Concreto…». */
  function descripcionPartida(pt) {
    var i = pt.nombre.indexOf(' · ');
    return i >= 0 ? pt.nombre.slice(i + 3) : pt.nombre;
  }

  /* Materiales requisitados (requisiciones atendidas, sin IGV) de una partida hasta una fecha. */
  function materialesRequisitados(ctx, partidaId, hasta) {
    var docs = ctx.datos.listar('requisiciones', function (r) { return r.estado === 'Atendida' && r.partida === partidaId && (!hasta || r.fecha <= hasta); });
    return ctx.suma(docs, function (r) { return r.totales.subtotal; });
  }

  /* ---------- Datos de demostración ---------- */

  var proveedores = [
    { id: 'PRV-0001', ruc: '20512345671', nombre: 'Cementos del Misti S.A.C.', contacto: 'Hugo Velásquez', telefono: '054 255 101', email: 'ventas@cementosmisti.example.pe', ciudad: 'Arequipa', rubro: 'Cemento y agregados', diasCredito: 30 },
    { id: 'PRV-0002', ruc: '20523456782', nombre: 'Aceros del Sur S.A.', contacto: 'Teresa Ramírez', telefono: '054 281 330', email: 'comercial@acerosdelsur.example.pe', ciudad: 'Arequipa', rubro: 'Acero', diasCredito: 45 },
    { id: 'PRV-0003', ruc: '20534567893', nombre: 'Ladrillera Andina E.I.R.L.', contacto: 'Walter Ccama', telefono: '054 233 870', email: 'pedidos@ladrilleraandina.example.pe', ciudad: 'Arequipa', rubro: 'Albañilería', diasCredito: 15 },
    { id: 'PRV-0004', ruc: '20545678904', nombre: 'Agregados Chilina S.R.L.', contacto: 'Mónica Aguirre', telefono: '054 260 718', email: 'agregados@chilina.example.pe', ciudad: 'Arequipa', rubro: 'Cemento y agregados', diasCredito: 15 },
    { id: 'PRV-0005', ruc: '20556789015', nombre: 'Ferretería Industrial Chili S.A.C.', contacto: 'Sergio Bravo', telefono: '054 243 118', email: 'ventas@ferrochili.example.pe', ciudad: 'Arequipa', rubro: 'Ferretería', diasCredito: 30 },
    { id: 'PRV-0006', ruc: '20567890126', nombre: 'Eléctricos y Cables Perú S.A.C.', contacto: 'Lourdes Palomino', telefono: '01 441 7788', email: 'obras@electricosperu.example.pe', ciudad: 'Lima', rubro: 'Eléctricos y sanitarios', diasCredito: 30 },
    { id: 'PRV-0007', ruc: '20578901237', nombre: 'Sanitarios y PVC Arequipa S.R.L.', contacto: 'Edwin Mayta', telefono: '054 238 266', email: 'pedidos@pvcarequipa.example.pe', ciudad: 'Arequipa', rubro: 'Eléctricos y sanitarios', diasCredito: 30 },
    { id: 'PRV-0008', ruc: '20589012348', nombre: 'Asfaltos y Pavimentos del Sur S.A.', contacto: 'Raúl Salinas', telefono: '054 265 904', email: 'despacho@asfaltosur.example.pe', ciudad: 'Arequipa', rubro: 'Asfalto y combustibles', diasCredito: 0 },
    { id: 'PRV-0009', ruc: '20590123459', nombre: 'Maderas y Encofrados Cayma E.I.R.L.', contacto: 'Daniela Rojas', telefono: '054 251 760', email: 'ventas@maderascayma.example.pe', ciudad: 'Arequipa', rubro: 'Maderas', diasCredito: 15 },
    { id: 'PRV-0010', ruc: '20601234560', nombre: 'Pinturas Volcán S.A.C.', contacto: 'Percy Huillca', telefono: '01 336 2210', email: 'proyectos@pinturasvolcan.example.pe', ciudad: 'Lima', rubro: 'Pinturas', diasCredito: 30 },
    { id: 'PRV-0011', ruc: '20612345671', nombre: 'Cerámicos Sillar S.A.C.', contacto: 'Karina Quispe', telefono: '054 270 515', email: 'obras@ceramicossillar.example.pe', ciudad: 'Arequipa', rubro: 'Acabados', diasCredito: 30 }
  ];

  /* Insumo: [código, nombre, tipo, unidad, precio, stock, mínimo, proveedor n.º] */
  var INSUMOS = [
    ['CEM-I', 'Cemento Portland Tipo I (bolsa de 42.5 kg)', 'Material', 'bls', 29.5, 850, 200, 1],
    ['ARE-GRU', 'Arena gruesa', 'Material', 'm3', 68, 90, 25, 4],
    ['PIE-CHA', 'Piedra chancada de 1/2"', 'Material', 'm3', 82, 70, 20, 4],
    ['ACE-420', 'Acero corrugado fy=4200 kg/cm²', 'Material', 'kg', 4.35, 12000, 3000, 2],
    ['ALA-N16', 'Alambre negro N.º 16', 'Material', 'kg', 5.2, 600, 150, 5],
    ['LAD-KK', 'Ladrillo King Kong de 18 huecos', 'Material', 'und', 0.98, 42000, 10000, 3],
    ['MAD-ENC', 'Madera tornillo para encofrado', 'Material', 'p2', 3.9, 5200, 1500, 9],
    ['CLA-3', 'Clavos con cabeza de 3"', 'Material', 'kg', 4.8, 380, 100, 5],
    ['TUB-PVC4', 'Tubería PVC SAP de 4" x 3 m', 'Material', 'und', 38, 260, 80, 7],
    ['CAB-THW25', 'Cable eléctrico THW de 2.5 mm²', 'Material', 'm', 2.1, 5400, 1000, 6],
    ['PIN-LAT', 'Pintura látex lavable', 'Material', 'gal', 46, 120, 30, 10],
    ['CER-45', 'Cerámico de piso de 45 x 45 cm', 'Material', 'm2', 38, 520, 100, 11],
    ['ASF-MC30', 'Asfalto líquido MC-30', 'Material', 'gal', 14.5, 3500, 800, 8],
    ['TR4-PRE', 'Plancha TR4 prepintada', 'Material', 'm2', 58, 1800, 400, 5],
    ['DIE-B5', 'Petróleo diésel B5 para maquinaria', 'Combustible', 'gal', 17.8, 4200, 900, 8]
  ];

  function idCorto(prefijo, n) { return prefijo + '-' + (n < 10 ? '000' : '00') + n; }

  function armarInsumos() {
    var r = [], i, f;
    for (i = 0; i < INSUMOS.length; i++) {
      f = INSUMOS[i];
      r.push({ id: idCorto('INS', i + 1), codigo: f[0], nombre: f[1], tipo: f[2], unidad: f[3], precio: f[4], stock: f[5], stockMin: f[6], proveedor: idCorto('PRV', f[7]) });
    }
    return r;
  }

  /*
   * Obras: [nombre, cliente, ubicación, estado, días desde el inicio hasta hoy, plazo en días, gastos generales %,
   * utilidad %, adelanto %, residente, presupuesto (solo si la obra aún no tiene partidas), cortes de valorización (días atrás),
   * ¿tiene borrador del mes en curso?]
   */
  var OBRAS = [
    ['Almacén Logístico Parque Industrial', 'Distribuidora Andina S.A.C.', 'Cerro Colorado, Arequipa', 'En ejecución', 125, 160, 9, 8, 10, 'Ing. Carlos Delgado Pinto', 0, [92, 61, 31], true],
    ['Ampliación Colegio Santa Fe', 'Gobierno Regional de Arequipa', 'Cayma, Arequipa', 'En ejecución', 210, 240, 10, 7, 15, 'Ing. Marisol Cutipa Huamán', 0, [153, 123, 92, 61, 31, 4], false],
    ['Centro de Salud Alto Selva Alegre', 'Red de Salud Arequipa Caylloma', 'Alto Selva Alegre, Arequipa', 'En ejecución', 160, 210, 10, 8, 10, 'Ing. Jorge Mamani Torres', 0, [123, 92, 61, 31], true],
    ['Condominio Los Cedros Etapa 2', 'Inmobiliaria Campiña Verde S.A.C.', 'Sachaca, Arequipa', 'En ejecución', 190, 300, 8, 10, 20, 'Ing. Elena Paredes Zegarra', 0, [153, 123, 92, 61, 31], true],
    ['Edificio Multifamiliar Av. Ejército', 'Familia Cáceres Zevallos', 'Yanahuara, Arequipa', 'Terminada', 330, 300, 9, 9, 0, 'Ing. Luis Ccopa Rivera', 0, [184, 153, 123, 92], false],
    ['Hospital de Día Cayma', 'Seguro Social de Salud (convenio)', 'Cayma, Arequipa', 'En ejecución', 100, 200, 11, 7, 15, 'Ing. Rosa Quispe Mamani', 0, [61, 31, 4], false],
    ['Losa Deportiva Villa Hermosa', 'Municipalidad Distrital de Cerro Colorado', 'Cerro Colorado, Arequipa', 'Terminada', 200, 120, 9, 6, 10, 'Ing. Diego Alarcón Ríos', 0, [153, 123, 92], false],
    ['Mejoramiento Vía Camaná-Quilca', 'Gobierno Regional de Arequipa', 'Camaná, Arequipa', 'Pausada', 170, 240, 8, 6, 20, 'Ing. Karen Choque Apaza', 0, [123, 92], false],
    ['Planta de Tratamiento Characato', 'Empresa de Agua y Saneamiento del Sur', 'Characato, Arequipa', 'Planificación', 20, 400, 10, 8, 20, 'Ing. Óscar Linares Pinto', 1850000, [], false],
    ['Puente Peatonal Río Chili', 'Municipalidad Provincial de Arequipa', 'Cercado, Arequipa', 'Planificación', 10, 150, 9, 7, 10, 'Ing. Brenda Valdivia Mendoza', 640000, [], false],
    ['Remodelación Hotel Misti Plaza', 'Hotel Misti Plaza S.A.C.', 'Cercado, Arequipa', 'En ejecución', 75, 100, 12, 10, 0, 'Ing. Raúl Tapia Salazar', 0, [61, 31, 4], false],
    ['Reservorio Apoyado Paucarpata', 'Empresa de Agua y Saneamiento del Sur', 'Paucarpata, Arequipa', 'En ejecución', 140, 210, 10, 8, 10, 'Ing. Patricia Salas Ugarte', 0, [92, 61, 31, 4], false]
  ];

  /* Recetas de materiales por tipo de partida: [[insumo n.º, parte del costo de materiales]] */
  var RECETAS = {
    excav: [[15, 1]],
    concreto: [[1, 0.45], [2, 0.25], [3, 0.3]],
    acero: [[4, 0.88], [5, 0.12]],
    encofrado: [[7, 0.78], [8, 0.12], [5, 0.1]],
    muro: [[6, 0.62], [1, 0.22], [2, 0.16]],
    tarrajeo: [[1, 0.5], [2, 0.5]],
    piso: [[12, 0.8], [1, 0.12], [2, 0.08]],
    pintura: [[11, 1]],
    tuberia: [[9, 1]],
    electrica: [[10, 1]],
    cobertura: [[14, 0.85], [8, 0.15]],
    asfalto: [[13, 0.7], [15, 0.3]],
    sardinel: [[1, 0.4], [2, 0.3], [3, 0.3]]
  };

  /*
   * Partida: [obra n.º, código, descripción, unidad, metrado, precio unitario, % de materiales, receta,
   * corte en que empieza a ejecutarse (0 = el primero), fracción del metrado que avanza en cada corte]
   */
  var PARTIDAS = [
    [1, '01.01', 'Excavación masiva con maquinaria', 'm3', 3200, 18.5, 5, 'excav', 0, 0.25],
    [1, '01.02', 'Relleno compactado con material propio', 'm3', 1100, 32, 30, 'excav', 0, 0.2],
    [1, '02.01', "Concreto f'c=210 kg/cm² en zapatas", 'm3', 240, 520, 70, 'concreto', 0, 0.35],
    [1, '02.02', 'Acero corrugado fy=4200 en zapatas y columnas', 'kg', 18500, 5.8, 78, 'acero', 1, 0.35],
    [1, '03.01', 'Cobertura metálica tipo TR4', 'm2', 2400, 95, 65, 'cobertura', 2, 0.3],
    [2, '01.01', 'Excavación de zanjas para cimientos', 'm3', 420, 38, 5, 'excav', 0, 0.4],
    [2, '02.01', "Concreto f'c=210 en cimientos y sobrecimientos", 'm3', 160, 520, 70, 'concreto', 1, 0.3],
    [2, '02.02', 'Acero corrugado fy=4200 en cimientos', 'kg', 9800, 5.8, 78, 'acero', 1, 0.25],
    [2, '02.03', 'Encofrado y desencofrado de cimientos', 'm2', 520, 48, 40, 'encofrado', 1, 0.3],
    [2, '03.01', 'Muro de ladrillo king kong de soga', 'm2', 1350, 98, 55, 'muro', 2, 0.3],
    [2, '03.02', 'Tarrajeo frotachado en muros', 'm2', 2600, 32, 45, 'tarrajeo', 3, 0.4],
    [2, '04.01', 'Piso cerámico de 45 x 45 cm', 'm2', 780, 85, 60, 'piso', 3, 0.35],
    [2, '05.01', 'Pintura látex en dos manos', 'm2', 3100, 18, 40, 'pintura', 4, 0.2],
    [3, '01.01', 'Excavación para cimentación', 'm3', 900, 24.5, 5, 'excav', 0, 0.5],
    [3, '02.01', "Concreto f'c=210 en columnas y placas", 'm3', 210, 640, 65, 'concreto', 1, 0.3],
    [3, '02.02', 'Acero corrugado fy=4200 en columnas y placas', 'kg', 16500, 5.8, 78, 'acero', 1, 0.28],
    [3, '03.01', 'Muro de ladrillo king kong de soga', 'm2', 980, 98, 55, 'muro', 2, 0.4],
    [3, '04.01', 'Instalaciones eléctricas (puntos de salida)', 'pto', 310, 78, 50, 'electrica', 3, 0.25],
    [4, '01.01', 'Excavación masiva con maquinaria', 'm3', 2800, 22, 5, 'excav', 0, 0.3],
    [4, '02.01', 'Losa aligerada de 20 cm (concreto y ladrillo)', 'm2', 1850, 165, 55, 'concreto', 1, 0.2],
    [4, '02.02', 'Acero corrugado fy=4200 en losas', 'kg', 24000, 5.8, 78, 'acero', 1, 0.2],
    [4, '02.03', 'Encofrado y desencofrado de losas', 'm2', 2100, 48, 40, 'encofrado', 1, 0.2],
    [4, '03.01', 'Muro de ladrillo king kong de soga', 'm2', 3300, 98, 55, 'muro', 2, 0.22],
    [4, '03.02', 'Tarrajeo frotachado en muros', 'm2', 6400, 32, 45, 'tarrajeo', 3, 0.25],
    [4, '05.01', 'Tubería PVC SAP de 4" para desagüe', 'ml', 640, 42, 55, 'tuberia', 3, 0.3],
    [5, '01.01', 'Excavación de zanjas y zapatas', 'm3', 650, 38, 5, 'excav', 0, 1],
    [5, '02.01', "Concreto f'c=210 en estructura", 'm3', 190, 540, 70, 'concreto', 0, 0.5],
    [5, '03.01', 'Muro de ladrillo king kong de soga', 'm2', 1100, 98, 55, 'muro', 1, 0.5],
    [5, '04.01', 'Tarrajeo frotachado en muros', 'm2', 2200, 32, 45, 'tarrajeo', 2, 0.6],
    [5, '05.01', 'Pintura látex en dos manos', 'm2', 2300, 18, 40, 'pintura', 3, 1],
    [6, '01.01', 'Excavación masiva con maquinaria', 'm3', 5200, 19.5, 5, 'excav', 0, 0.35],
    [6, '02.01', "Concreto f'c=210 en zapatas", 'm3', 380, 520, 70, 'concreto', 0, 0.25],
    [6, '02.02', 'Acero corrugado fy=4200 en zapatas', 'kg', 41000, 5.8, 78, 'acero', 1, 0.15],
    [6, '03.01', 'Cobertura metálica tipo TR4', 'm2', 3200, 95, 65, 'cobertura', 2, 0.3],
    [7, '01.01', 'Excavación y nivelación del terreno', 'm3', 380, 18.5, 5, 'excav', 0, 1],
    [7, '02.01', "Concreto f'c=175 en losa", 'm3', 125, 480, 70, 'concreto', 0, 0.5],
    [7, '02.02', 'Sardinel de concreto', 'ml', 340, 56, 50, 'sardinel', 1, 0.6],
    [7, '03.01', 'Pintura de demarcación deportiva', 'm2', 520, 18, 40, 'pintura', 2, 1],
    [8, '01.01', 'Corte y explanación de plataforma', 'm3', 7200, 17, 5, 'excav', 0, 0.4],
    [8, '02.01', 'Base granular compactada', 'm3', 2400, 56, 30, 'excav', 1, 0.3],
    [8, '03.01', 'Carpeta asfáltica en caliente de 2"', 'm2', 9000, 52, 50, 'asfalto', 2, 0.3],
    [11, '01.01', 'Demolición y eliminación de desmonte', 'm3', 85, 120, 5, 'excav', 0, 0.8],
    [11, '02.01', 'Tabiquería de ladrillo king kong', 'm2', 420, 98, 55, 'muro', 0, 0.3],
    [11, '03.01', 'Piso cerámico de 45 x 45 cm', 'm2', 640, 85, 60, 'piso', 1, 0.25],
    [11, '03.02', 'Pintura látex en dos manos', 'm2', 1800, 18, 40, 'pintura', 1, 0.2],
    [12, '01.01', 'Excavación para cuba del reservorio', 'm3', 1500, 24.5, 5, 'excav', 0, 0.5],
    [12, '02.01', "Concreto f'c=280 en cuba y losa", 'm3', 320, 640, 65, 'concreto', 1, 0.3],
    [12, '02.02', 'Acero corrugado fy=4200 en cuba', 'kg', 28000, 5.8, 78, 'acero', 1, 0.25],
    [12, '03.01', 'Tarrajeo impermeabilizado', 'm2', 1250, 38, 45, 'tarrajeo', 2, 0.3]
  ];

  function redondear2(n) { return Math.round(n * 100) / 100; }

  function armarPartidas() {
    var r = [], i, f;
    for (i = 0; i < PARTIDAS.length; i++) {
      f = PARTIDAS[i];
      r.push({
        id: idCorto('PAR', i + 1), proyecto: idCorto('PRY', f[0]), codigo: f[1], nombre: OBRAS[f[0] - 1][0] + ' · ' + f[1] + ' ' + f[2],
        unidad: f[3], metrado: f[4], precioUnitario: f[5], incidenciaMateriales: f[6]
      });
    }
    return r;
  }

  /* Presupuesto de costo directo de una obra = suma de metrado × precio de sus partidas. */
  function presupuestoDe(n) {
    var total = 0, i;
    for (i = 0; i < PARTIDAS.length; i++) { if (PARTIDAS[i][0] === n) { total += PARTIDAS[i][4] * PARTIDAS[i][5]; } }
    return redondear2(total);
  }

  function armarProyectos() {
    var r = [], i, f, pres;
    for (i = 0; i < OBRAS.length; i++) {
      f = OBRAS[i];
      pres = f[10] || presupuestoDe(i + 1);
      r.push({
        id: idCorto('PRY', i + 1), codigo: 'OB-26' + (i < 9 ? '0' : '') + (i + 1), nombre: f[0], cliente: f[1], ubicacion: f[2], estado: f[3],
        fechaInicio: '@-' + f[4], plazoDias: f[5], presupuesto: pres, ggPct: f[6], utilidadPct: f[7], adelantoPct: f[8], residente: f[9]
      });
    }
    return r;
  }

  /*
   * Valorizaciones y requisiciones se generan a partir del plan de cada partida: cada corte mensual avanza una fracción
   * de su metrado (sin pasar del contratado). Así los metrados acumulados siempre cuadran con las partidas.
   */
  function planificar() {
    var docsVal = [], docsReq = [], ejecutado = [], i, p, obra, cortes, c, k, avance, lineas, trozo, ultimo, objetivo, n, hechos;
    var FACTORES = [0.93, 1.02, 1.22, 0.98, 1.34, 0.96, 0.88, 1.08, 1.0, 0.95], contFactor = 0;
    var porObra = {};
    for (i = 0; i < PARTIDAS.length; i++) { ejecutado[i] = 0; (porObra[PARTIDAS[i][0]] = porObra[PARTIDAS[i][0]] || []).push(i); }
    function lineasDelCorte(idxs, corte) {
      var ls = [], j, pp, chunk, tope;
      for (j = 0; j < idxs.length; j++) {
        pp = PARTIDAS[idxs[j]];
        if (corte < pp[8]) { continue; }
        tope = redondear2(pp[4] - ejecutado[idxs[j]]);
        chunk = Math.min(redondear2(pp[4] * pp[9]), tope);
        if (chunk > 0) { ls.push([idxs[j], chunk]); }
      }
      return ls;
    }
    for (n = 1; n <= OBRAS.length; n++) {
      obra = OBRAS[n - 1];
      cortes = obra[11];
      if (!porObra[n]) { continue; }
      hechos = {};
      for (c = 0; c < cortes.length; c++) {
        lineas = lineasDelCorte(porObra[n], c);
        for (k = 0; k < lineas.length; k++) { ejecutado[lineas[k][0]] = redondear2(ejecutado[lineas[k][0]] + lineas[k][1]); hechos[lineas[k][0]] = cortes[c]; }
        if (lineas.length) { docsVal.push({ dias: cortes[c], obra: n, estado: 'Aprobada', lineas: lineas }); }
      }
      /* Borrador del mes en curso con lo que sigue avanzando */
      if (obra[12]) {
        lineas = lineasDelCorte(porObra[n], cortes.length);
        if (lineas.length) { docsVal.push({ dias: 0, obra: n, estado: 'Borrador', lineas: lineas }); }
      }
      /* Requisiciones atendidas: materiales de lo ya valorizado, con un factor de consumo distinto por partida */
      for (k = 0; k < porObra[n].length; k++) {
        p = PARTIDAS[porObra[n][k]];
        avance = ejecutado[porObra[n][k]];
        if (!avance) { continue; }
        objetivo = avance * p[5] * p[6] / 100 * FACTORES[contFactor % FACTORES.length];
        contFactor += 1;
        docsReq.push({ dias: hechos[porObra[n][k]] + 4, obra: n, partida: porObra[n][k], estado: 'Atendida', objetivo: objetivo, prioridad: 'Normal' });
      }
    }
    /* Requisiciones recientes sin atender (borradores de los almacenes de obra) */
    [[1, 0], [1, 3], [3, 1], [4, 1], [6, 0], [12, 1], [11, 1], [4, 4]].forEach(function (par, j) {
      var idx = porObra[par[0]][par[1]], pp = PARTIDAS[idx];
      docsReq.push({ dias: 2 + j, obra: par[0], partida: idx, estado: 'Borrador', objetivo: pp[4] * pp[9] * pp[5] * pp[6] / 100 * 0.5, prioridad: j % 3 === 0 ? 'Urgente' : 'Normal' });
    });
    return { vals: docsVal, reqs: docsReq };
  }

  var PLAN = planificar();

  function fechaRel(dias) { return dias === 0 ? 'hoy' : '@-' + dias; }

  function armarValorizaciones() {
    var r = [], i, d, ls, j, p, extra;
    for (i = 0; i < PLAN.vals.length; i++) {
      d = PLAN.vals[i];
      ls = [];
      for (j = 0; j < d.lineas.length; j++) {
        p = PARTIDAS[d.lineas[j][0]];
        ls.push({ item: idCorto('PAR', d.lineas[j][0] + 1), metrado: d.lineas[j][1], precio: p[5] });
      }
      r.push({ id: idCorto('VAL', r.length + 1), fecha: fechaRel(d.dias), proyecto: idCorto('PRY', d.obra), estado: d.estado, lineas: ls });
    }
    /* Dos valorizaciones anuladas (se rehicieron con otro metrado) */
    extra = [[92, 3, 13, 40], [31, 6, 30, 100]];
    for (i = 0; i < extra.length; i++) {
      p = PARTIDAS[extra[i][2]];
      r.push({
        id: idCorto('VAL', r.length + 1), fecha: fechaRel(extra[i][0]), proyecto: idCorto('PRY', extra[i][1]), estado: 'Anulada',
        observaciones: 'Se rehízo con el metrado verificado en campo.', lineas: [{ item: idCorto('PAR', extra[i][2] + 1), metrado: extra[i][3], precio: p[5] }]
      });
    }
    return r;
  }

  function armarRequisiciones() {
    var r = [], i, d, ls, j, receta, ins, precio, cantidad, unidad;
    for (i = 0; i < PLAN.reqs.length; i++) {
      d = PLAN.reqs[i];
      receta = RECETAS[PARTIDAS[d.partida][7]];
      ls = [];
      for (j = 0; j < receta.length; j++) {
        ins = INSUMOS[receta[j][0] - 1];
        precio = ins[4];
        unidad = ins[3];
        cantidad = receta[j][1] * d.objetivo / precio;
        cantidad = unidad === 'bls' || unidad === 'und' || unidad === 'p2' ? Math.max(1, Math.round(cantidad)) : Math.max(0.1, Math.round(cantidad * 10) / 10);
        ls.push({ item: idCorto('INS', receta[j][0]), cantidad: cantidad, precio: precio });
      }
      r.push({
        id: idCorto('REQ', i + 1), fecha: fechaRel(d.dias), proyecto: idCorto('PRY', d.obra), partida: idCorto('PAR', d.partida + 1),
        prioridad: d.prioridad, estado: d.estado, lineas: ls
      });
    }
    r[4].estado = 'Anulada';
    r[4].observaciones = 'Pedido duplicado por la obra vecina.';
    return r;
  }

  /* ---------- Configuración del sistema ---------- */

  window.SISTEMA = {
    id: 'constructora',
    nombre: 'Constructora Ingeniería Sur · Obras',
    rubro: 'Construcción y obras civiles',
    version: '1.0.0',
    moneda: 'S/',
    tema: { primario: '#c2571a', acento: '#2b3a4a', siglas: 'IS' },

    parametros: [
      { id: 'igv', etiqueta: 'IGV', tipo: 'porcentaje', valor: 18, ayuda: 'Impuesto General a las Ventas que se suma a las valorizaciones y a las requisiciones.' },
      { id: 'ggPct', etiqueta: 'Gastos generales (por defecto)', tipo: 'porcentaje', valor: 10, ayuda: 'Se usa cuando la obra no tiene su propio porcentaje de gastos generales.' },
      { id: 'utilidadPct', etiqueta: 'Utilidad (por defecto)', tipo: 'porcentaje', valor: 8, ayuda: 'Se usa cuando la obra no tiene su propio porcentaje de utilidad.' },
      { id: 'retencionGarantia', etiqueta: 'Retención de garantía', tipo: 'porcentaje', valor: 5, ayuda: 'Porcentaje del subtotal de cada valorización que se retiene hasta la liquidación de la obra.' },
      { id: 'diasPagoValorizacion', etiqueta: 'Días de pago de una valorización', tipo: 'entero', valor: 30, ayuda: 'El cliente paga la valorización aprobada pasados estos días (para el flujo de pagos).' },
      { id: 'toleranciaAtraso', etiqueta: 'Tolerancia de atraso (puntos)', tipo: 'numero', valor: 5, ayuda: 'Una obra se considera atrasada si su avance real queda por debajo del programado en más de estos puntos porcentuales.' }
    ],

    seguridad: {
      minClave: 10,
      intentosMax: 5,
      bloqueoMin: 5,
      sesionMin: 0,
      cadenaBitacora: true,
      confirmarEliminar: true,
      exigirCambioClave: true,
      ayudaLogin: false,
      exportaRespetaPermisos: true,
      cspMeta: false
    },

    roles: [
      { id: 'admin', nombre: 'Administrador', descripcion: 'Acceso total: mantenimientos, valorizaciones, requisiciones, usuarios, bitácora, respaldo y parámetros.' },
      { id: 'gerente', nombre: 'Gerente de proyectos', descripcion: 'Administra obras y partidas, aprueba y anula valorizaciones y ve todos los reportes. No registra requisiciones ni gestiona usuarios.' },
      { id: 'residente', nombre: 'Residente de obra', descripcion: 'Prepara las valorizaciones de su obra y pide materiales; consulta avance y sobrecostos. No aprueba valorizaciones ni atiende requisiciones.' },
      { id: 'almacenero', nombre: 'Almacenero', descripcion: 'Administra insumos y proveedores y atiende las requisiciones (descuenta el stock). No ve precios de partidas ni valorizaciones.' },
      { id: 'administracion', nombre: 'Administración y finanzas', descripcion: 'Consulta valorizaciones, requisiciones, obras y proveedores y ve el flujo de pagos con retención. Registra proveedores; no modifica obras ni valorizaciones.' },
      { id: 'auditor', nombre: 'Auditor', descripcion: 'Solo lectura de todo el negocio y de la bitácora. No crea ni modifica nada.' }
    ],

    usuarios: [
      { usuario: 'admin', nombre: 'Walter Condori Apaza', rol: 'admin', clave: 'Admin#2026x' },
      { usuario: 'gerente', nombre: 'Inés Valdivia Cornejo', rol: 'gerente', clave: 'Gerente#2026x' },
      { usuario: 'residente', nombre: 'Carlos Delgado Pinto', rol: 'residente', clave: 'Obra#2026xyz' },
      { usuario: 'almacenero', nombre: 'Hugo Ccama Ramos', rol: 'almacenero', clave: 'Almac#2026x' },
      { usuario: 'administracion', nombre: 'Paola Zevallos Núñez', rol: 'administracion', clave: 'Finanzas#2026x' },
      { usuario: 'auditor', nombre: 'Elena Paredes Zegarra', rol: 'auditor', clave: 'Audita#2026x' }
    ],

    /* ------------------------------ Entidades ------------------------------ */
    entidades: [
      {
        id: 'proyectos', nombre: 'Proyecto', plural: 'Obras', prefijo: 'PRY',
        campos: [
          { id: 'codigo', etiqueta: 'Código de obra', tipo: 'texto', requerido: true, unico: true, max: 12, patron: '^[A-Z0-9-]+$', mensajePatron: 'Usa solo mayúsculas, números y guiones.' },
          { id: 'nombre', etiqueta: 'Nombre de la obra', tipo: 'texto', requerido: true, unico: true, max: 70 },
          { id: 'cliente', etiqueta: 'Cliente', tipo: 'texto', requerido: true, max: 80 },
          { id: 'ubicacion', etiqueta: 'Ubicación', tipo: 'texto', max: 80, ayuda: 'Distrito y provincia, por ejemplo Cayma, Arequipa.' },
          { id: 'estado', etiqueta: 'Estado de la obra', tipo: 'lista', requerido: true, opciones: ['Planificación', 'En ejecución', 'Pausada', 'Terminada'], defecto: 'Planificación', ayuda: 'Solo las obras en ejecución admiten valorizaciones y requisiciones.' },
          { id: 'fechaInicio', etiqueta: 'Fecha de inicio', tipo: 'fecha', requerido: true, defecto: 'hoy' },
          { id: 'plazoDias', etiqueta: 'Plazo (días calendario)', tipo: 'entero', min: 1, max: 1500, requerido: true, defecto: 180 },
          { id: 'presupuesto', etiqueta: 'Presupuesto de costo directo', tipo: 'moneda', min: 1, requerido: true, ayuda: 'Costo directo contratado, sin gastos generales, utilidad ni IGV.' },
          { id: 'ggPct', etiqueta: 'Gastos generales de la obra', tipo: 'porcentaje', min: 0, max: 30, ayuda: 'Déjalo vacío para usar el porcentaje del negocio.' },
          { id: 'utilidadPct', etiqueta: 'Utilidad de la obra', tipo: 'porcentaje', min: 0, max: 30, ayuda: 'Déjalo vacío para usar el porcentaje del negocio.' },
          { id: 'adelantoPct', etiqueta: 'Adelanto directo recibido', tipo: 'porcentaje', min: 0, max: 40, defecto: 0, ayuda: 'Se amortiza en cada valorización en proporción a su subtotal.' },
          { id: 'residente', etiqueta: 'Residente de obra', tipo: 'texto', max: 60 }
        ],
        lista: ['codigo', 'nombre', 'estado', 'plazoDias', 'presupuesto', 'avanceFisico', 'avanceProgramado'],
        buscar: ['codigo', 'nombre', 'cliente', 'ubicacion', 'residente'],
        calculados: [
          {
            id: 'fechaFin', etiqueta: 'Fecha de término contractual', tipo: 'fecha',
            formula: function (r, ctx) { return r.fechaInicio && r.plazoDias ? ctx.fechaMas(r.fechaInicio, r.plazoDias) : null; }
          },
          {
            id: 'avanceFisico', etiqueta: 'Avance real %', tipo: 'porcentaje',
            formula: function (r, ctx) { return avanceReal(r, ctx); }
          },
          {
            id: 'avanceProgramado', etiqueta: 'Avance programado %', tipo: 'porcentaje',
            formula: function (r, ctx) { return programado(r, ctx.hoy(), ctx); }
          },
          {
            id: 'desvio', etiqueta: 'Desvío (puntos)', tipo: 'numero',
            formula: function (r, ctx) { return ctx.redondear(avanceReal(r, ctx) - programado(r, ctx.hoy(), ctx)); }
          }
        ],
        reglas: [
          {
            id: 'inicio-coherente', mensaje: 'Una obra en ejecución o terminada no puede tener fecha de inicio futura.',
            validar: function (r, ctx) { return (r.estado !== 'En ejecución' && r.estado !== 'Terminada') || !r.fechaInicio || r.fechaInicio <= ctx.hoy(); }
          }
        ],
        permisos: { ver: ['admin', 'gerente', 'residente', 'administracion', 'auditor'], crear: ['admin', 'gerente'], editar: ['admin', 'gerente'], eliminar: ['admin'] }
      },
      {
        id: 'partidas', nombre: 'Partida', plural: 'Partidas', prefijo: 'PAR',
        campos: [
          { id: 'proyecto', etiqueta: 'Obra', tipo: 'ref', entidad: 'proyectos', mostrar: 'nombre', requerido: true },
          { id: 'codigo', etiqueta: 'Código de partida', tipo: 'texto', requerido: true, max: 20, ayuda: 'Numeración del presupuesto, por ejemplo 02.01.' },
          { id: 'nombre', etiqueta: 'Descripción', tipo: 'texto', requerido: true, max: 120, ayuda: 'Empieza con el nombre de la obra para distinguirla en las listas.' },
          { id: 'unidad', etiqueta: 'Unidad de medida', tipo: 'lista', requerido: true, opciones: ['m', 'm2', 'm3', 'kg', 'und', 'glb', 'ml', 'pto'], defecto: 'm3' },
          { id: 'metrado', etiqueta: 'Metrado contratado', tipo: 'numero', min: 0.01, requerido: true },
          { id: 'precioUnitario', etiqueta: 'Precio unitario (costo directo)', tipo: 'moneda', min: 0.01, requerido: true, ver: ['admin', 'gerente', 'residente', 'administracion', 'auditor'] },
          { id: 'incidenciaMateriales', etiqueta: 'Materiales dentro del precio %', tipo: 'porcentaje', min: 0, max: 100, defecto: 50, ayuda: 'Parte del precio unitario que corresponde a materiales; sirve para detectar sobrecostos.' }
        ],
        lista: ['nombre', 'unidad', 'metrado', 'precioUnitario', 'ejecutado', 'avance'],
        buscar: ['codigo', 'nombre', 'proyecto'],
        calculados: [
          {
            id: 'ejecutado', etiqueta: 'Metrado ejecutado', tipo: 'numero',
            formula: function (r, ctx) { return ctx.redondear(metradoAcumulado(ctx, r.id)); }
          },
          {
            id: 'avance', etiqueta: 'Avance físico %', tipo: 'porcentaje',
            formula: function (r, ctx) { return porcentaje(ctx, metradoAcumulado(ctx, r.id), r.metrado); }
          },
          {
            id: 'costoTotal', etiqueta: 'Costo directo contratado', tipo: 'moneda', ver: ['admin', 'gerente', 'residente', 'administracion', 'auditor'],
            formula: function (r, ctx) { return ctx.redondear((r.metrado || 0) * (r.precioUnitario || 0)); }
          }
        ],
        reglas: [
          {
            id: 'codigo-unico-en-obra', mensaje: 'Esa obra ya tiene una partida con el mismo código.',
            validar: function (r, ctx) {
              return ctx.datos.listar('partidas', function (x) { return x.id !== r.id && x.proyecto === r.proyecto && x.codigo === r.codigo; }).length === 0;
            }
          },
          {
            id: 'metrado-no-menor-al-ejecutado', mensaje: 'El metrado contratado no puede ser menor al metrado ya valorizado.',
            validar: function (r, ctx) { return !r.id || r.metrado >= metradoAcumulado(ctx, r.id) - 1e-9; }
          }
        ],
        permisos: { ver: ['admin', 'gerente', 'residente', 'almacenero', 'administracion', 'auditor'], crear: ['admin', 'gerente', 'residente'], editar: ['admin', 'gerente', 'residente'], eliminar: ['admin'] }
      },
      {
        id: 'insumos', nombre: 'Insumo', plural: 'Insumos', prefijo: 'INS',
        campos: [
          { id: 'codigo', etiqueta: 'Código', tipo: 'texto', requerido: true, unico: true, max: 12, patron: '^[A-Z0-9-]+$', mensajePatron: 'Usa solo mayúsculas, números y guiones.' },
          { id: 'nombre', etiqueta: 'Nombre del insumo', tipo: 'texto', requerido: true, max: 70 },
          { id: 'tipo', etiqueta: 'Tipo', tipo: 'lista', requerido: true, opciones: ['Material', 'Herramienta', 'Combustible'], defecto: 'Material' },
          { id: 'unidad', etiqueta: 'Unidad', tipo: 'lista', requerido: true, opciones: ['bls', 'm', 'm2', 'm3', 'kg', 'gal', 'und', 'p2'], defecto: 'und' },
          { id: 'precio', etiqueta: 'Precio referencial (sin IGV)', tipo: 'moneda', min: 0.01, requerido: true },
          { id: 'stock', etiqueta: 'Stock en almacén', tipo: 'numero', min: 0, requerido: true, defecto: 0 },
          { id: 'stockMin', etiqueta: 'Stock mínimo', tipo: 'numero', min: 0, requerido: true, defecto: 0, ayuda: 'Por debajo de esta cantidad el insumo aparece como stock bajo.' },
          { id: 'proveedor', etiqueta: 'Proveedor habitual', tipo: 'ref', entidad: 'proveedores', mostrar: 'nombre', requerido: true }
        ],
        lista: ['codigo', 'nombre', 'unidad', 'precio', 'stock', 'situacion'],
        buscar: ['codigo', 'nombre', 'tipo'],
        calculados: [
          {
            id: 'situacion', etiqueta: 'Situación', tipo: 'texto',
            formula: function (r) { return r.stock <= 0 ? 'Agotado' : (r.stock <= r.stockMin ? 'Stock bajo' : 'Normal'); }
          },
          {
            id: 'valorStock', etiqueta: 'Valor en almacén', tipo: 'moneda',
            formula: function (r, ctx) { return ctx.redondear((r.precio || 0) * (r.stock || 0)); }
          }
        ],
        permisos: { ver: ['admin', 'gerente', 'residente', 'almacenero', 'administracion', 'auditor'], crear: ['admin', 'almacenero'], editar: ['admin', 'almacenero'], eliminar: ['admin'] }
      },
      {
        id: 'proveedores', nombre: 'Proveedor', plural: 'Proveedores', prefijo: 'PRV',
        campos: [
          { id: 'ruc', etiqueta: 'RUC', tipo: 'texto', requerido: true, unico: true, max: 11, patron: '^[0-9]{11}$', mensajePatron: 'El RUC tiene 11 dígitos.' },
          { id: 'nombre', etiqueta: 'Razón social', tipo: 'texto', requerido: true, max: 80 },
          { id: 'rubro', etiqueta: 'Rubro', tipo: 'lista', requerido: true, opciones: ['Cemento y agregados', 'Acero', 'Albañilería', 'Ferretería', 'Eléctricos y sanitarios', 'Asfalto y combustibles', 'Maderas', 'Pinturas', 'Acabados'] },
          { id: 'contacto', etiqueta: 'Persona de contacto', tipo: 'texto', max: 60 },
          { id: 'telefono', etiqueta: 'Teléfono', tipo: 'telefono' },
          { id: 'email', etiqueta: 'Correo electrónico', tipo: 'email', max: 80 },
          { id: 'ciudad', etiqueta: 'Ciudad', tipo: 'texto', max: 40 },
          { id: 'diasCredito', etiqueta: 'Días de crédito que otorga', tipo: 'entero', min: 0, max: 90, defecto: 30 }
        ],
        lista: ['ruc', 'nombre', 'rubro', 'ciudad', 'diasCredito'],
        buscar: ['ruc', 'nombre', 'rubro', 'contacto'],
        permisos: { ver: ['admin', 'gerente', 'almacenero', 'administracion', 'auditor'], crear: ['admin', 'almacenero', 'administracion'], editar: ['admin', 'almacenero', 'administracion'], eliminar: ['admin'] }
      }
    ],

    /* ------------------------------ Operaciones ------------------------------ */
    operaciones: [
      {
        id: 'valorizaciones', nombre: 'Valorización', plural: 'Valorizaciones', prefijo: 'VAL', serie: 'VL01',
        campos: [
          { id: 'fecha', etiqueta: 'Fecha de corte', tipo: 'fecha', requerido: true, defecto: 'hoy', max: 'hoy', ayuda: 'Se permite una valorización aprobada por obra y por mes.' },
          { id: 'proyecto', etiqueta: 'Obra', tipo: 'ref', entidad: 'proyectos', mostrar: 'nombre', requerido: true },
          { id: 'observaciones', etiqueta: 'Observaciones', tipo: 'textarea', max: 300 }
        ],
        lista: ['fecha', 'proyecto'],
        estados: ['Borrador', 'Aprobada', 'Anulada'],
        lineas: {
          entidad: 'partidas', mostrar: 'nombre', precio: 'precioUnitario',
          campos: [{ id: 'metrado', etiqueta: 'Metrado del periodo', tipo: 'numero', min: 0.01, requerido: true, defecto: 1 }],
          importe: function (l) { return l.metrado * l.precio; },
          info: function (item, ctx) {
            var acum = metradoAcumulado(ctx, item.id);
            return 'Contratado: ' + ctx.fmt.num(item.metrado, 2) + ' ' + item.unidad + ' · Ya valorizado: ' + ctx.fmt.num(acum, 2) + ' · Saldo: ' + ctx.fmt.num(Math.max(0, item.metrado - acum), 2);
          }
        },
        calcular: function (doc, ctx) {
          var cd = ctx.redondear(ctx.suma(doc.lineas, function (l) { return l.metrado * l.precio; }));
          var obra = doc.proyecto ? ctx.datos.obtener('proyectos', doc.proyecto) : null;
          var ggPct = obra && obra.ggPct !== undefined ? obra.ggPct : ctx.param('ggPct');
          var utPct = obra && obra.utilidadPct !== undefined ? obra.utilidadPct : ctx.param('utilidadPct');
          var adPct = obra && obra.adelantoPct ? obra.adelantoPct : 0;
          var gg = ctx.redondear(cd * ggPct / 100);
          var ut = ctx.redondear(cd * utPct / 100);
          var sub = ctx.redondear(cd + gg + ut);
          var igv = ctx.redondear(sub * ctx.param('igv') / 100);
          var ret = ctx.redondear(sub * 0.05);
          var amort = ctx.redondear(sub * adPct / 100);
          var total = ctx.redondear(sub + igv);
          return { costoDirecto: cd, gastosGenerales: gg, utilidad: ut, subtotal: sub, igv: igv, total: total, retencion: ret, amortizacion: amort, neto: ctx.redondear(total - ret - amort) };
        },
        totales: [
          { id: 'costoDirecto', etiqueta: 'Costo directo' },
          { id: 'gastosGenerales', etiqueta: 'Gastos generales' },
          { id: 'utilidad', etiqueta: 'Utilidad' },
          { id: 'subtotal', etiqueta: 'Subtotal (sin IGV)' },
          { id: 'igv', etiqueta: 'IGV' },
          { id: 'total', etiqueta: 'Total valorizado' },
          { id: 'retencion', etiqueta: 'Retención de garantía' },
          { id: 'amortizacion', etiqueta: 'Amortización de adelanto' },
          { id: 'neto', etiqueta: 'Neto a cobrar', fuerte: true }
        ],
        reglas: [
          {
            id: 'obra-en-ejecucion', mensaje: 'La obra no está en ejecución: solo se valoriza una obra en ejecución.',
            validar: function (d, ctx) {
              var o = d.proyecto ? ctx.datos.obtener('proyectos', d.proyecto) : null;
              return !o || o.estado === 'En ejecución';
            }
          },
          {
            id: 'fecha-desde-el-inicio', mensaje: 'La fecha de corte es anterior al inicio de la obra.',
            validar: function (d, ctx) {
              var o = d.proyecto ? ctx.datos.obtener('proyectos', d.proyecto) : null;
              return !o || !d.fecha || d.fecha >= o.fechaInicio;
            }
          },
          {
            id: 'partidas-de-la-obra', mensaje: 'Hay partidas que no pertenecen a la obra elegida.',
            validar: function (d, ctx) {
              var i, p;
              for (i = 0; i < (d.lineas || []).length; i++) {
                p = ctx.datos.obtener('partidas', d.lineas[i].item);
                if (p && p.proyecto !== d.proyecto) { return false; }
              }
              return true;
            }
          },
          {
            id: 'un-corte-por-mes', mensaje: 'Esa obra ya tiene una valorización aprobada en el mismo mes.',
            validar: function (d, ctx) {
              if (!d.proyecto || !d.fecha) { return true; }
              return aprobadas(ctx, function (v) { return v.id !== d.id && v.proyecto === d.proyecto && ctx.mes(v.fecha) === ctx.mes(d.fecha); }).length === 0;
            }
          },
          {
            id: 'metrado-contratado', mensaje: 'Una partida supera su metrado contratado (contando lo ya valorizado). Revisa los metrados.',
            validar: function (d, ctx) {
              var i, p, l;
              for (i = 0; i < (d.lineas || []).length; i++) {
                l = d.lineas[i];
                p = ctx.datos.obtener('partidas', l.item);
                if (p && metradoAcumulado(ctx, p.id, d.id) + l.metrado > p.metrado + 1e-9) { return false; }
              }
              return true;
            }
          }
        ],
        permisos: {
          ver: ['admin', 'gerente', 'residente', 'administracion', 'auditor'], crear: ['admin', 'residente'], editar: ['admin', 'residente'],
          emitir: ['admin', 'gerente'], anular: ['admin', 'gerente'], eliminar: ['admin', 'residente']
        }
      },
      {
        id: 'requisiciones', nombre: 'Requisición', plural: 'Requisiciones de materiales', prefijo: 'REQ', serie: 'RQ01',
        campos: [
          { id: 'fecha', etiqueta: 'Fecha', tipo: 'fecha', requerido: true, defecto: 'hoy', max: 'hoy' },
          { id: 'proyecto', etiqueta: 'Obra', tipo: 'ref', entidad: 'proyectos', mostrar: 'nombre', requerido: true },
          { id: 'partida', etiqueta: 'Partida a la que se carga', tipo: 'ref', entidad: 'partidas', mostrar: 'nombre', requerido: true },
          { id: 'prioridad', etiqueta: 'Prioridad', tipo: 'lista', requerido: true, opciones: ['Normal', 'Urgente'], defecto: 'Normal' },
          { id: 'observaciones', etiqueta: 'Observaciones', tipo: 'textarea', max: 300 }
        ],
        lista: ['fecha', 'proyecto', 'prioridad'],
        estados: ['Borrador', 'Atendida', 'Anulada'],
        lineas: {
          entidad: 'insumos', mostrar: 'nombre', precio: 'precio', precioEditable: true,
          campos: [{ id: 'cantidad', etiqueta: 'Cant.', tipo: 'numero', min: 0.01, requerido: true, defecto: 1 }],
          importe: function (l) { return l.cantidad * l.precio; },
          info: function (item) { return 'Stock en almacén: ' + item.stock + ' ' + item.unidad + ' · Precio referencial: S/ ' + item.precio.toFixed(2); }
        },
        calcular: function (doc, ctx) {
          var sub = ctx.redondear(ctx.suma(doc.lineas, function (l) { return l.cantidad * l.precio; }));
          var igv = ctx.redondear(sub * ctx.param('igv') / 100);
          return { subtotal: sub, igv: igv, total: ctx.redondear(sub + igv) };
        },
        totales: [
          { id: 'subtotal', etiqueta: 'Subtotal (sin IGV)' },
          { id: 'igv', etiqueta: 'IGV' },
          { id: 'total', etiqueta: 'Total de la requisición', fuerte: true }
        ],
        reglas: [
          {
            id: 'obra-en-ejecucion', mensaje: 'La obra no está en ejecución: no se piden materiales para ella.',
            validar: function (d, ctx) {
              var o = d.proyecto ? ctx.datos.obtener('proyectos', d.proyecto) : null;
              return !o || o.estado === 'En ejecución';
            }
          },
          {
            id: 'partida-de-la-obra', mensaje: 'La partida elegida no pertenece a la obra.',
            validar: function (d, ctx) {
              var p = d.partida ? ctx.datos.obtener('partidas', d.partida) : null;
              return !p || p.proyecto === d.proyecto;
            }
          }
        ],
        /* Atender la requisición: sale el material del almacén. */
        alEmitir: function (doc, ctx) {
          var i, l, s;
          for (i = 0; i < doc.lineas.length; i++) {
            l = doc.lineas[i];
            s = ctx.datos.obtener('insumos', l.item);
            if (s.stock < l.cantidad) { throw new Error('Stock insuficiente de «' + s.nombre + '»: hay ' + s.stock + ' ' + s.unidad + ' y se piden ' + l.cantidad + '.'); }
          }
          for (i = 0; i < doc.lineas.length; i++) {
            l = doc.lineas[i];
            s = ctx.datos.obtener('insumos', l.item);
            ctx.datos.actualizar('insumos', l.item, { stock: Math.round((s.stock - l.cantidad) * 1e6) / 1e6 });
          }
        },
        /* Anular una requisición atendida: el material vuelve al almacén. */
        alAnular: function (doc, ctx) {
          var i, l, s;
          for (i = 0; i < doc.lineas.length; i++) {
            l = doc.lineas[i];
            s = ctx.datos.obtener('insumos', l.item);
            ctx.datos.actualizar('insumos', l.item, { stock: Math.round((s.stock + l.cantidad) * 1e6) / 1e6 });
          }
        },
        permisos: {
          ver: ['admin', 'gerente', 'residente', 'almacenero', 'administracion', 'auditor'], crear: ['admin', 'residente', 'almacenero'], editar: ['admin', 'residente', 'almacenero'],
          emitir: ['admin', 'almacenero'], anular: ['admin', 'gerente'], eliminar: ['admin', 'residente', 'almacenero']
        }
      }
    ],

    /* ------------------------------ Reportes ------------------------------ */
    reportes: [
      {
        id: 'avance-obra', titulo: 'Avance físico y financiero por obra',
        descripcion: 'Por cada obra con valorizaciones en el periodo, al corte de «Hasta»: avance físico (costo directo valorizado ÷ presupuesto), avance programado (curva S) y avance financiero (neto a cobrar ÷ monto contractual con gastos generales, utilidad e IGV; queda por debajo del físico por la retención y la amortización del adelanto).',
        roles: ['admin', 'gerente', 'residente', 'administracion', 'auditor'],
        parametros: [
          { id: 'desde', etiqueta: 'Desde', tipo: 'fecha', requerido: true, defecto: '@-180' },
          { id: 'hasta', etiqueta: 'Hasta', tipo: 'fecha', requerido: true, defecto: 'hoy' }
        ],
        ejecutar: function (p, ctx) {
          var obras = ctx.datos.listar('proyectos'), filas = [], etiquetas = [], valores = [], i, o, vals, hasta = p.hasta > ctx.hoy() ? ctx.hoy() : p.hasta, fis, prog, neto, contrato, atrasadas = 0, sumaFis = 0, sumaPres = 0, sumaVal = 0, ggp, utp;
          for (i = 0; i < obras.length; i++) {
            o = obras[i];
            vals = aprobadas(ctx, function (v) { return v.proyecto === o.id && v.fecha >= p.desde && v.fecha <= p.hasta; });
            if (!vals.length) { continue; }
            fis = avanceReal(o, ctx, hasta);
            prog = programado(o, hasta, ctx);
            neto = ctx.suma(aprobadas(ctx, function (v) { return v.proyecto === o.id && v.fecha <= hasta; }), function (v) { return v.totales.neto; });
            ggp = o.ggPct !== undefined ? o.ggPct : ctx.param('ggPct');
            utp = o.utilidadPct !== undefined ? o.utilidadPct : ctx.param('utilidadPct');
            contrato = o.presupuesto * (1 + (ggp + utp) / 100) * (1 + ctx.param('igv') / 100);
            filas.push([o.nombre, o.estado, o.presupuesto, valorizadoCD(ctx, o.id, hasta), fis, prog, ctx.redondear(fis - prog), ctx.redondear(neto), porcentaje(ctx, neto, contrato)]);
            etiquetas.push(o.nombre);
            valores.push(fis);
            if (o.estado === 'En ejecución') {
              sumaFis += valorizadoCD(ctx, o.id, hasta);
              sumaPres += o.presupuesto;
              if (fis < prog - ctx.param('toleranciaAtraso')) { atrasadas += 1; }
            }
            sumaVal += valorizadoCD(ctx, o.id, hasta);
          }
          return {
            columnas: ['Obra', 'Estado', 'Presupuesto', 'Valorizado (costo directo)', 'Avance físico %', 'Programado %', 'Desvío (puntos)', 'Neto aprobado', 'Avance financiero %'],
            tipos: ['texto', 'texto', 'moneda', 'moneda', 'porcentaje', 'porcentaje', 'numero', 'moneda', 'porcentaje'], filas: filas,
            grafico: { tipo: 'barras', etiquetas: etiquetas, valores: valores, formato: 'porcentaje' },
            resumen: [
              { etiqueta: 'Obras con valorizaciones', valor: filas.length, tipo: 'entero' },
              { etiqueta: 'Avance de las obras en ejecución', valor: porcentaje(ctx, sumaFis, sumaPres), tipo: 'porcentaje' },
              { etiqueta: 'Obras en ejecución con atraso', valor: atrasadas, tipo: 'entero' },
              { etiqueta: 'Costo directo valorizado', valor: ctx.redondear(sumaVal), tipo: 'moneda' }
            ]
          };
        }
      },
      {
        id: 'valorizaciones-mes', titulo: 'Valorizaciones y curva S por mes',
        descripcion: 'Valorizaciones aprobadas de cada mes y la curva S de las obras valorizadas: avance real acumulado frente al programado al cierre de cada mes. Puedes limitarlo a una obra.',
        roles: ['admin', 'gerente', 'residente', 'administracion', 'auditor'],
        parametros: [
          { id: 'desde', etiqueta: 'Desde', tipo: 'fecha', requerido: true, defecto: '@-180' },
          { id: 'hasta', etiqueta: 'Hasta', tipo: 'fecha', requerido: true, defecto: 'hoy' },
          { id: 'obra', etiqueta: 'Obra (opcional)', tipo: 'ref', entidad: 'proyectos', mostrar: 'nombre' }
        ],
        ejecutar: function (p, ctx) {
          var todas = aprobadas(ctx, function (v) { return !p.obra || v.proyecto === p.obra; }), grupos = {}, claves = [], k, i, j, filas = [], etiquetas = [], valores = [], g, cd, sub, neto, corte, obrasIds = {}, base = 0, real, prog, o, vistas = 0, totalSub = 0, totalNeto = 0, ultimoReal = 0, hoy = ctx.hoy();
          for (i = 0; i < todas.length; i++) { obrasIds[todas[i].proyecto] = true; }
          for (k in obrasIds) { if (obrasIds.hasOwnProperty(k)) { o = ctx.datos.obtener('proyectos', k); if (o) { base += o.presupuesto; } } }
          for (i = 0; i < todas.length; i++) {
            if (todas[i].fecha < p.desde || todas[i].fecha > p.hasta) { continue; }
            k = ctx.mes(todas[i].fecha);
            (grupos[k] = grupos[k] || []).push(todas[i]);
          }
          for (k in grupos) { if (grupos.hasOwnProperty(k)) { claves.push(k); } }
          claves.sort();
          for (i = 0; i < claves.length; i++) {
            g = grupos[claves[i]];
            cd = ctx.redondear(ctx.suma(g, function (v) { return v.totales.costoDirecto; }));
            sub = ctx.redondear(ctx.suma(g, function (v) { return v.totales.subtotal; }));
            neto = ctx.redondear(ctx.suma(g, function (v) { return v.totales.neto; }));
            corte = finDeMes(claves[i]) > hoy ? hoy : finDeMes(claves[i]);
            real = 0;
            prog = 0;
            for (k in obrasIds) {
              if (obrasIds.hasOwnProperty(k)) {
                o = ctx.datos.obtener('proyectos', k);
                if (!o) { continue; }
                real += valorizadoCD(ctx, k, corte);
                prog += o.presupuesto * programado(o, corte, ctx) / 100;
              }
            }
            filas.push([nombreMes(claves[i]), g.length, cd, sub, neto, porcentaje(ctx, real, base), porcentaje(ctx, prog, base)]);
            etiquetas.push(nombreMes(claves[i]));
            valores.push(porcentaje(ctx, real, base));
            totalSub += sub;
            totalNeto += neto;
            vistas += g.length;
            ultimoReal = porcentaje(ctx, real, base);
          }
          return {
            columnas: ['Mes', 'Valorizaciones', 'Costo directo', 'Subtotal (sin IGV)', 'Neto a cobrar', 'Real acumulado %', 'Programado acumulado %'],
            tipos: ['texto', 'entero', 'moneda', 'moneda', 'moneda', 'porcentaje', 'porcentaje'], filas: filas,
            grafico: { tipo: 'linea', etiquetas: etiquetas, valores: valores, formato: 'porcentaje' },
            resumen: [
              { etiqueta: 'Valorizado en el periodo (sin IGV)', valor: ctx.redondear(totalSub), tipo: 'moneda' },
              { etiqueta: 'Neto a cobrar del periodo', valor: ctx.redondear(totalNeto), tipo: 'moneda' },
              { etiqueta: 'Valorizaciones aprobadas', valor: vistas, tipo: 'entero' },
              { etiqueta: 'Avance real acumulado al cierre', valor: ultimoReal, tipo: 'porcentaje' }
            ]
          };
        }
      },
      {
        id: 'consumo-insumos', titulo: 'Consumo de insumos',
        descripcion: 'Cantidad e importe (sin IGV) de cada insumo entregado en requisiciones atendidas durante el periodo, de mayor a menor importe.',
        roles: ['admin', 'gerente', 'residente', 'almacenero', 'administracion', 'auditor'],
        parametros: [
          { id: 'desde', etiqueta: 'Desde', tipo: 'fecha', requerido: true, defecto: '@-180' },
          { id: 'hasta', etiqueta: 'Hasta', tipo: 'fecha', requerido: true, defecto: 'hoy' }
        ],
        ejecutar: function (p, ctx) {
          var reqs = ctx.datos.listar('requisiciones', function (r) { return r.estado === 'Atendida' && r.fecha >= p.desde && r.fecha <= p.hasta; }), acum = {}, i, j, l, k, lista = [], filas = [], etiquetas = [], valores = [], total = 0, ins;
          for (i = 0; i < reqs.length; i++) {
            for (j = 0; j < reqs[i].lineas.length; j++) {
              l = reqs[i].lineas[j];
              if (!acum[l.item]) { acum[l.item] = { id: l.item, cantidad: 0, importe: 0 }; }
              acum[l.item].cantidad += l.cantidad;
              acum[l.item].importe += l.cantidad * l.precio;
            }
          }
          for (k in acum) { if (acum.hasOwnProperty(k)) { lista.push(acum[k]); total += acum[k].importe; } }
          lista.sort(function (a, b) { return b.importe - a.importe; });
          for (i = 0; i < lista.length; i++) {
            ins = ctx.datos.obtener('insumos', lista[i].id);
            filas.push([ins ? ins.nombre : lista[i].id, ins ? ins.unidad : '', ctx.redondear(lista[i].cantidad), ctx.redondear(lista[i].importe), porcentaje(ctx, lista[i].importe, total)]);
            etiquetas.push(ins ? ins.nombre : lista[i].id);
            valores.push(ctx.redondear(lista[i].importe));
          }
          return {
            columnas: ['Insumo', 'Unidad', 'Cantidad', 'Importe', '% del total'], tipos: ['texto', 'texto', 'numero', 'moneda', 'porcentaje'], filas: filas,
            grafico: { tipo: 'barras', etiquetas: etiquetas, valores: valores, formato: 'moneda' },
            resumen: [
              { etiqueta: 'Consumo del periodo (sin IGV)', valor: ctx.redondear(total), tipo: 'moneda' },
              { etiqueta: 'Requisiciones atendidas', valor: reqs.length, tipo: 'entero' },
              { etiqueta: 'Insumos distintos', valor: lista.length, tipo: 'entero' }
            ]
          };
        }
      },
      {
        id: 'sobrecosto-partidas', titulo: 'Partidas con sobrecosto de materiales',
        descripcion: 'Compara los materiales entregados a cada partida (requisiciones atendidas) con lo presupuestado para el metrado ya valorizado: metrado ejecutado × precio unitario × % de materiales. Lista las partidas cuyo sobrecosto supera el umbral.',
        roles: ['admin', 'gerente', 'residente', 'administracion', 'auditor'],
        parametros: [
          { id: 'desde', etiqueta: 'Desde', tipo: 'fecha', requerido: true, defecto: '@-180' },
          { id: 'hasta', etiqueta: 'Hasta', tipo: 'fecha', requerido: true, defecto: 'hoy' },
          { id: 'umbral', etiqueta: 'Sobrecosto mínimo (%)', tipo: 'porcentaje', requerido: true, defecto: 5 }
        ],
        ejecutar: function (p, ctx) {
          var partidas = ctx.datos.listar('partidas'), filas = [], etiquetas = [], valores = [], i, pt, real, presup, dif, pct, tocadas, totalDif = 0, mayor = 0, hasta = p.hasta, umbral = p.umbral === undefined ? 0 : p.umbral;
          for (i = 0; i < partidas.length; i++) {
            pt = partidas[i];
            tocadas = ctx.datos.listar('requisiciones', function (r) { return r.estado === 'Atendida' && r.partida === pt.id && r.fecha >= p.desde && r.fecha <= p.hasta; }).length;
            if (!tocadas) { continue; }
            real = materialesRequisitados(ctx, pt.id, hasta);
            presup = ctx.redondear(ctx.suma(aprobadas(ctx, function (v) { return v.fecha <= hasta; }), function (v) {
              return ctx.suma(v.lineas, function (l) { return l.item === pt.id ? l.metrado * pt.precioUnitario * pt.incidenciaMateriales / 100 : 0; });
            }));
            if (presup <= 0) { continue; }
            dif = ctx.redondear(real - presup);
            pct = ctx.redondear(dif / presup * 100);
            if (pct <= umbral) { continue; }
            filas.push([nombreObra(ctx, pt.proyecto), descripcionPartida(pt), presup, ctx.redondear(real), dif, pct]);
            totalDif += dif;
            if (pct > mayor) { mayor = pct; }
          }
          filas.sort(function (a, b) { return b[4] - a[4]; });
          for (i = 0; i < filas.length; i++) { etiquetas.push(filas[i][0].slice(0, 22) + ' · ' + filas[i][1]); valores.push(filas[i][4]); }
          return {
            columnas: ['Obra', 'Partida', 'Materiales presupuestados', 'Materiales entregados', 'Sobrecosto', 'Sobrecosto %'],
            tipos: ['texto', 'texto', 'moneda', 'moneda', 'moneda', 'porcentaje'], filas: filas,
            grafico: { tipo: 'barras', etiquetas: etiquetas, valores: valores, formato: 'moneda' },
            resumen: [
              { etiqueta: 'Partidas con sobrecosto', valor: filas.length, tipo: 'entero' },
              { etiqueta: 'Sobrecosto total', valor: ctx.redondear(totalDif), tipo: 'moneda' },
              { etiqueta: 'Mayor sobrecosto', valor: mayor, tipo: 'porcentaje' }
            ]
          };
        }
      },
      {
        id: 'flujo-pagos', titulo: 'Flujo de pagos con retención',
        descripcion: 'Cuándo se cobran las valorizaciones aprobadas: fecha de corte más los días de pago del negocio. Muestra lo valorizado, la retención de garantía, la amortización del adelanto y el neto a cobrar de cada mes, con la retención que se acumula hasta la liquidación.',
        roles: ['admin', 'gerente', 'administracion', 'auditor'],
        parametros: [
          { id: 'desde', etiqueta: 'Cobro desde', tipo: 'fecha', requerido: true, defecto: '@-150' },
          { id: 'hasta', etiqueta: 'Cobro hasta', tipo: 'fecha', requerido: true, defecto: '@30' }
        ],
        ejecutar: function (p, ctx) {
          var dias = ctx.param('diasPagoValorizacion'), todas = aprobadas(ctx), grupos = {}, claves = [], k, i, filas = [], etiquetas = [], valores = [], g, cobro, acumulada = 0, totalNeto = 0, totalRet = 0, totalTotal = 0, retPorMes = {};
          for (i = 0; i < todas.length; i++) {
            cobro = ctx.fechaMas(todas[i].fecha, dias);
            k = ctx.mes(cobro);
            retPorMes[k] = (retPorMes[k] || 0) + todas[i].totales.retencion;
            if (cobro < p.desde || cobro > p.hasta) { continue; }
            (grupos[k] = grupos[k] || []).push(todas[i]);
          }
          for (k in grupos) { if (grupos.hasOwnProperty(k)) { claves.push(k); } }
          claves.sort();
          /* La retención acumulada cuenta todo lo retenido hasta ese mes de cobro, aunque sea anterior al filtro. */
          for (i = 0; i < claves.length; i++) {
            g = grupos[claves[i]];
            acumulada = 0;
            for (k in retPorMes) { if (retPorMes.hasOwnProperty(k) && k <= claves[i]) { acumulada += retPorMes[k]; } }
            filas.push([
              nombreMes(claves[i]), g.length, ctx.redondear(ctx.suma(g, function (v) { return v.totales.total; })), ctx.redondear(ctx.suma(g, function (v) { return v.totales.retencion; })),
              ctx.redondear(ctx.suma(g, function (v) { return v.totales.amortizacion; })), ctx.redondear(ctx.suma(g, function (v) { return v.totales.neto; })), ctx.redondear(acumulada)
            ]);
            etiquetas.push(nombreMes(claves[i]));
            valores.push(ctx.redondear(ctx.suma(g, function (v) { return v.totales.neto; })));
            totalNeto += ctx.suma(g, function (v) { return v.totales.neto; });
            totalRet += ctx.suma(g, function (v) { return v.totales.retencion; });
            totalTotal += ctx.suma(g, function (v) { return v.totales.total; });
          }
          return {
            columnas: ['Mes de cobro', 'Valorizaciones', 'Total valorizado', 'Retención de garantía', 'Amortización de adelanto', 'Neto a cobrar', 'Retención acumulada'],
            tipos: ['texto', 'entero', 'moneda', 'moneda', 'moneda', 'moneda', 'moneda'], filas: filas,
            grafico: { tipo: 'columnas', etiquetas: etiquetas, valores: valores, formato: 'moneda' },
            resumen: [
              { etiqueta: 'Neto a cobrar del periodo', valor: ctx.redondear(totalNeto), tipo: 'moneda' },
              { etiqueta: 'Retención del periodo', valor: ctx.redondear(totalRet), tipo: 'moneda' },
              { etiqueta: 'Total valorizado (con IGV)', valor: ctx.redondear(totalTotal), tipo: 'moneda' }
            ]
          };
        }
      }
    ],

    /* ------------------------------ Tablero ------------------------------ */
    tablero: [
      {
        titulo: 'Obras en ejecución', tipo: 'entero',
        calcular: function (ctx) { return ctx.datos.listar('proyectos', function (o) { return o.estado === 'En ejecución'; }).length; }
      },
      {
        titulo: 'Valorizado en los últimos 30 días (sin IGV)', tipo: 'moneda', roles: ['admin', 'gerente', 'residente', 'administracion', 'auditor'],
        calcular: function (ctx) {
          var desde = ctx.fechaMas(ctx.hoy(), -29), hoy = ctx.hoy();
          return ctx.redondear(ctx.suma(aprobadas(ctx, function (v) { return v.fecha >= desde && v.fecha <= hoy; }), function (v) { return v.totales.subtotal; }));
        }
      },
      {
        titulo: 'Retención de garantía acumulada', tipo: 'moneda', roles: ['admin', 'gerente', 'administracion', 'auditor'],
        nota: 'Retenida en las valorizaciones aprobadas; se devuelve al liquidar cada obra.',
        calcular: function (ctx) { return ctx.redondear(ctx.suma(aprobadas(ctx), function (v) { return v.totales.retencion; })); }
      },
      {
        titulo: 'Avance de las obras en ejecución', tipo: 'porcentaje', roles: ['admin', 'gerente', 'residente', 'administracion', 'auditor'],
        nota: 'Costo directo valorizado entre el presupuesto.',
        calcular: function (ctx) {
          var obras = ctx.datos.listar('proyectos', function (o) { return o.estado === 'En ejecución'; }), i, val = 0, pres = 0;
          for (i = 0; i < obras.length; i++) { val += valorizadoCD(ctx, obras[i].id); pres += obras[i].presupuesto; }
          return porcentaje(ctx, val, pres);
        }
      },
      {
        titulo: 'Obras con atraso', tipo: 'entero', roles: ['admin', 'gerente', 'residente', 'administracion', 'auditor'],
        nota: 'Avance real por debajo del programado más allá de la tolerancia.',
        calcular: function (ctx) {
          var obras = ctx.datos.listar('proyectos', function (o) { return o.estado === 'En ejecución'; }), i, n = 0;
          for (i = 0; i < obras.length; i++) {
            if (avanceReal(obras[i], ctx) < programado(obras[i], ctx.hoy(), ctx) - ctx.param('toleranciaAtraso')) { n += 1; }
          }
          return n;
        }
      },
      {
        titulo: 'Requisiciones por atender', tipo: 'entero', roles: ['admin', 'gerente', 'residente', 'almacenero'],
        calcular: function (ctx) { return ctx.datos.listar('requisiciones', function (r) { return r.estado === 'Borrador'; }).length; }
      }
    ],

    tableroGrafico: {
      titulo: 'Valorizado por mes, últimos 6 meses (sin IGV)', tipo: 'columnas', formato: 'moneda',
      calcular: function (ctx) {
        var meses = ultimosMeses(ctx, 6), vals = aprobadas(ctx, function (v) { return v.fecha >= meses[0] + '-01' && v.fecha <= ctx.hoy(); }), g = ctx.agrupar(vals, function (v) { return ctx.mes(v.fecha); }), etiquetas = [], valores = [], i;
        for (i = 0; i < meses.length; i++) {
          etiquetas.push(MESES[parseInt(meses[i].slice(5, 7), 10) - 1]);
          valores.push(ctx.redondear(ctx.suma(g[meses[i]] || [], function (v) { return v.totales.subtotal; })));
        }
        return { etiquetas: etiquetas, valores: valores };
      }
    },

    /* ------------------------------ Semillas ------------------------------ */
    semillas: {
      proyectos: armarProyectos(),
      partidas: armarPartidas(),
      insumos: armarInsumos(),
      proveedores: proveedores,
      valorizaciones: armarValorizaciones(),
      requisiciones: armarRequisiciones()
    }
  };
})();
