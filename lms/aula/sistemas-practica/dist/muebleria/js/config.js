/*
 * Maderas del Sur · Ventas de muebles (Arequipa)
 * ----------------------------------------------------------------------------
 * Configuración del sistema de práctica «muebleria». Es lo ÚNICO que cambia
 * entre sistemas: el núcleo (nucleo/js) lee este archivo y arma la aplicación.
 * Los datos son inventados (RUC y DNI de ejemplo) y no corresponden a personas
 * ni empresas reales. Todo el código es ES5 (sin flechas, let, const ni plantillas).
 */
(function () {
  'use strict';

  /* ---------- Ayudas locales (solo para este archivo) ---------- */

  var MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

  /* '2026-06' → 'jun 2026' */
  function nombreMes(clave) {
    return MESES[parseInt(clave.slice(5, 7), 10) - 1] + ' ' + clave.slice(0, 4);
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

  /* Ventas emitidas (no borradores ni anuladas) dentro de un rango de fechas. */
  function ventasEmitidas(ctx, desde, hasta) {
    return ctx.datos.listar('ventas', function (v) {
      return v.estado === 'Emitida' && (!desde || v.fecha >= desde) && (!hasta || v.fecha <= hasta);
    });
  }

  /* Importe de una línea de venta con su descuento. */
  function importeLinea(l) {
    return l.cantidad * l.precio * (1 - (l.descuentoPct || 0) / 100);
  }

  /* ¿Hay stock bajo? (en o por debajo del mínimo) */
  function stockBajo(p) { return p.activo !== false && p.stock <= p.stockMin; }

  /* ---------- Datos de demostración ---------- */

  var productos = [
    { id: 'PRD-0001', codigo: 'SOF-3C', nombre: 'Sofá 3 cuerpos Tarma', categoria: 'CAT-0001', proveedor: 'PRV-0003', material: 'Mixto', medidas: '210 x 90 x 85 cm', costo: 780, precio: 1290, stock: 8, stockMin: 3, activo: true },
    { id: 'PRD-0002', codigo: 'SOF-L', nombre: 'Sofá esquinero en L Cayma', categoria: 'CAT-0001', proveedor: 'PRV-0003', material: 'Mixto', medidas: '260 x 170 x 85 cm', costo: 1350, precio: 2190, stock: 4, stockMin: 2, activo: true },
    { id: 'PRD-0003', codigo: 'MSA-CEN', nombre: 'Mesa de centro de cedro', categoria: 'CAT-0001', proveedor: 'PRV-0001', material: 'Cedro', medidas: '110 x 60 x 45 cm', costo: 210, precio: 390, stock: 12, stockMin: 4, activo: true },
    { id: 'PRD-0004', codigo: 'RAC-TV', nombre: 'Rack para TV 1.80 m', categoria: 'CAT-0001', proveedor: 'PRV-0005', material: 'Melamina', medidas: '180 x 40 x 55 cm', costo: 260, precio: 480, stock: 9, stockMin: 3, activo: true },
    { id: 'PRD-0005', codigo: 'CMD-6R', nombre: 'Comedor 6 sillas de roble', categoria: 'CAT-0002', proveedor: 'PRV-0001', material: 'Roble', medidas: '180 x 90 x 76 cm', costo: 1180, precio: 1890, stock: 5, stockMin: 2, activo: true },
    { id: 'PRD-0006', codigo: 'CMD-4T', nombre: 'Comedor 4 sillas de tornillo', categoria: 'CAT-0002', proveedor: 'PRV-0001', material: 'Tornillo', medidas: '140 x 80 x 76 cm', costo: 720, precio: 1190, stock: 7, stockMin: 2, activo: true },
    { id: 'PRD-0007', codigo: 'SIL-COM', nombre: 'Silla de comedor tapizada', categoria: 'CAT-0002', proveedor: 'PRV-0012', material: 'Mixto', medidas: '45 x 52 x 98 cm', costo: 95, precio: 180, stock: 36, stockMin: 12, activo: true },
    { id: 'PRD-0008', codigo: 'APA-VID', nombre: 'Aparador con vitrina', categoria: 'CAT-0002', proveedor: 'PRV-0011', material: 'Cedro', medidas: '160 x 45 x 190 cm', costo: 640, precio: 1050, stock: 3, stockMin: 2, activo: true },
    { id: 'PRD-0009', codigo: 'CAM-2P', nombre: 'Cama 2 plazas con cabecera', categoria: 'CAT-0003', proveedor: 'PRV-0001', material: 'Tornillo', medidas: '140 x 190 cm', costo: 540, precio: 890, stock: 10, stockMin: 3, activo: true },
    { id: 'PRD-0010', codigo: 'CAM-KB', nombre: 'Cama King con baúl', categoria: 'CAT-0003', proveedor: 'PRV-0001', material: 'Roble', medidas: '200 x 200 cm', costo: 890, precio: 1490, stock: 4, stockMin: 2, activo: true },
    { id: 'PRD-0011', codigo: 'COL-2P', nombre: 'Colchón ortopédico 2 plazas', categoria: 'CAT-0003', proveedor: 'PRV-0007', material: 'Mixto', medidas: '140 x 190 x 24 cm', costo: 430, precio: 760, stock: 14, stockMin: 5, activo: true },
    { id: 'PRD-0012', codigo: 'ROP-6P', nombre: 'Ropero de 6 puertas', categoria: 'CAT-0003', proveedor: 'PRV-0005', material: 'Melamina', medidas: '240 x 55 x 210 cm', costo: 690, precio: 1150, stock: 6, stockMin: 2, activo: true },
    { id: 'PRD-0013', codigo: 'VEL-CED', nombre: 'Velador de cedro', categoria: 'CAT-0003', proveedor: 'PRV-0001', material: 'Cedro', medidas: '45 x 40 x 55 cm', costo: 85, precio: 160, stock: 20, stockMin: 6, activo: true },
    { id: 'PRD-0014', codigo: 'ESC-EJE', nombre: 'Escritorio ejecutivo', categoria: 'CAT-0004', proveedor: 'PRV-0005', material: 'Melamina', medidas: '160 x 75 x 75 cm', costo: 420, precio: 740, stock: 5, stockMin: 2, activo: true },
    { id: 'PRD-0015', codigo: 'SIL-ERG', nombre: 'Silla ergonómica de oficina', categoria: 'CAT-0004', proveedor: 'PRV-0012', material: 'Metal', medidas: '60 x 60 x 120 cm', costo: 260, precio: 450, stock: 15, stockMin: 5, activo: true },
    { id: 'PRD-0016', codigo: 'LIB-5E', nombre: 'Librero de 5 estantes', categoria: 'CAT-0004', proveedor: 'PRV-0005', material: 'Melamina', medidas: '80 x 30 x 180 cm', costo: 150, precio: 280, stock: 11, stockMin: 4, activo: true },
    { id: 'PRD-0017', codigo: 'TAB-BAR', nombre: 'Juego de 3 taburetes de bar', categoria: 'CAT-0005', proveedor: 'PRV-0008', material: 'Metal', medidas: '40 x 40 x 75 cm', costo: 180, precio: 340, stock: 2, stockMin: 4, activo: true },
    { id: 'PRD-0018', codigo: 'JAR-4P', nombre: 'Juego de jardín de 4 piezas', categoria: 'CAT-0006', proveedor: 'PRV-0008', material: 'Metal', medidas: 'Mesa 90 cm + 3 sillones', costo: 520, precio: 890, stock: 1, stockMin: 3, activo: true }
  ];

  var PRECIOS = {}, COSTOS = {};
  (function () {
    var i;
    for (i = 0; i < productos.length; i++) { PRECIOS[productos[i].id] = productos[i].precio; COSTOS[productos[i].id] = productos[i].costo; }
  })();

  /* Fila de venta: [días atrás, cliente, vendedor, forma de pago, flete, estado, [[producto, cantidad, % desc.]]] */
  var VENTAS = [
    [176, 'CLI-0001', 'VEN-0001', 'Contado', 0, 'Emitida', [['PRD-0001', 1, 0], ['PRD-0003', 1, 5]]],
    [171, 'CLI-0002', 'VEN-0006', 'Crédito 30 días', 150, 'Emitida', [['PRD-0009', 6, 10], ['PRD-0013', 6, 5], ['PRD-0011', 6, 8]]],
    [166, 'CLI-0008', 'VEN-0002', 'Tarjeta', 0, 'Emitida', [['PRD-0007', 4, 0]]],
    [160, 'CLI-0009', 'VEN-0003', 'Contado', 60, 'Emitida', [['PRD-0005', 1, 5]]],
    [154, 'CLI-0004', 'VEN-0006', 'Crédito 60 días', 200, 'Emitida', [['PRD-0014', 6, 12], ['PRD-0015', 10, 10], ['PRD-0016', 4, 0]]],
    [149, 'CLI-0010', 'VEN-0001', 'Transferencia', 0, 'Emitida', [['PRD-0010', 1, 0], ['PRD-0011', 1, 0], ['PRD-0013', 2, 0]]],
    [143, 'CLI-0011', 'VEN-0004', 'Contado', 0, 'Emitida', [['PRD-0004', 1, 0], ['PRD-0003', 1, 0]]],
    [138, 'CLI-0003', 'VEN-0006', 'Crédito 30 días', 100, 'Emitida', [['PRD-0015', 8, 15], ['PRD-0014', 3, 10]]],
    [132, 'CLI-0012', 'VEN-0005', 'Tarjeta', 50, 'Emitida', [['PRD-0006', 1, 0], ['PRD-0007', 2, 0]]],
    [127, 'CLI-0013', 'VEN-0002', 'Contado', 0, 'Anulada', [['PRD-0012', 1, 0]]],
    [121, 'CLI-0005', 'VEN-0006', 'Crédito 30 días', 80, 'Emitida', [['PRD-0007', 12, 10], ['PRD-0006', 3, 8]]],
    [115, 'CLI-0014', 'VEN-0003', 'Transferencia', 0, 'Emitida', [['PRD-0002', 1, 5]]],
    [110, 'CLI-0001', 'VEN-0001', 'Tarjeta', 0, 'Emitida', [['PRD-0013', 2, 0], ['PRD-0009', 1, 0]]],
    [104, 'CLI-0006', 'VEN-0006', 'Crédito 60 días', 180, 'Emitida', [['PRD-0014', 8, 15], ['PRD-0015', 12, 12], ['PRD-0016', 6, 5]]],
    [98, 'CLI-0015', 'VEN-0004', 'Contado', 0, 'Emitida', [['PRD-0008', 1, 0]]],
    [93, 'CLI-0008', 'VEN-0002', 'Contado', 0, 'Emitida', [['PRD-0015', 1, 0]]],
    [88, 'CLI-0007', 'VEN-0006', 'Crédito 60 días', 300, 'Emitida', [['PRD-0009', 10, 12], ['PRD-0011', 10, 10], ['PRD-0012', 4, 8], ['PRD-0013', 10, 5]]],
    [82, 'CLI-0009', 'VEN-0003', 'Tarjeta', 60, 'Emitida', [['PRD-0010', 1, 5], ['PRD-0013', 2, 0]]],
    [76, 'CLI-0010', 'VEN-0001', 'Contado', 0, 'Emitida', [['PRD-0016', 2, 0]]],
    [70, 'CLI-0011', 'VEN-0005', 'Transferencia', 40, 'Emitida', [['PRD-0001', 1, 0], ['PRD-0004', 1, 5]]],
    [64, 'CLI-0002', 'VEN-0006', 'Crédito 30 días', 120, 'Emitida', [['PRD-0007', 16, 12], ['PRD-0005', 2, 10]]],
    [58, 'CLI-0012', 'VEN-0002', 'Tarjeta', 0, 'Emitida', [['PRD-0011', 2, 0]]],
    [52, 'CLI-0013', 'VEN-0004', 'Contado', 0, 'Emitida', [['PRD-0017', 1, 0], ['PRD-0018', 1, 5]]],
    [46, 'CLI-0014', 'VEN-0001', 'Contado', 70, 'Emitida', [['PRD-0006', 1, 0], ['PRD-0007', 4, 0]]],
    [40, 'CLI-0004', 'VEN-0006', 'Crédito 30 días', 250, 'Emitida', [['PRD-0015', 10, 15], ['PRD-0016', 5, 8], ['PRD-0014', 2, 10]]],
    [35, 'CLI-0008', 'VEN-0003', 'Contado', 0, 'Anulada', [['PRD-0003', 2, 0]]],
    [30, 'CLI-0001', 'VEN-0001', 'Tarjeta', 0, 'Emitida', [['PRD-0012', 1, 0], ['PRD-0013', 2, 5]]],
    [25, 'CLI-0009', 'VEN-0002', 'Transferencia', 0, 'Emitida', [['PRD-0002', 1, 0], ['PRD-0003', 1, 5]]],
    [20, 'CLI-0003', 'VEN-0006', 'Crédito 30 días', 140, 'Emitida', [['PRD-0009', 4, 10], ['PRD-0011', 4, 8]]],
    [15, 'CLI-0015', 'VEN-0005', 'Contado', 0, 'Emitida', [['PRD-0001', 1, 5]]],
    [11, 'CLI-0010', 'VEN-0004', 'Tarjeta', 0, 'Emitida', [['PRD-0008', 1, 0], ['PRD-0007', 3, 0]]],
    [8, 'CLI-0005', 'VEN-0006', 'Crédito 30 días', 90, 'Emitida', [['PRD-0006', 2, 8], ['PRD-0007', 8, 10]]],
    [5, 'CLI-0011', 'VEN-0003', 'Contado', 0, 'Emitida', [['PRD-0010', 1, 0]]],
    [3, 'CLI-0014', 'VEN-0001', 'Tarjeta', 50, 'Emitida', [['PRD-0013', 2, 0], ['PRD-0004', 1, 0]]],
    [1, 'CLI-0012', 'VEN-0002', 'Contado', 0, 'Borrador', [['PRD-0015', 2, 0]]],
    [0, 'CLI-0008', 'VEN-0004', 'Contado', 0, 'Borrador', [['PRD-0016', 1, 0]]]
  ];

  /* Fila de compra: [días atrás, proveedor, condición, referencia, estado, [[producto, cantidad, costo unitario]]] */
  var COMPRAS = [
    [172, 'PRV-0001', 'Crédito 30 días', 'GR-0451', 'Emitida', [['PRD-0003', 20, 205], ['PRD-0009', 12, 535], ['PRD-0013', 30, 82]]],
    [150, 'PRV-0003', 'Crédito 30 días', 'GR-1120', 'Emitida', [['PRD-0001', 10, 775], ['PRD-0002', 6, 1340]]],
    [128, 'PRV-0005', 'Contado', 'F-7781', 'Emitida', [['PRD-0004', 12, 258], ['PRD-0012', 8, 685], ['PRD-0014', 8, 415], ['PRD-0016', 14, 148]]],
    [105, 'PRV-0012', 'Crédito 60 días', 'GR-0092', 'Emitida', [['PRD-0007', 40, 94], ['PRD-0015', 20, 258]]],
    [84, 'PRV-0007', 'Crédito 30 días', 'F-3304', 'Emitida', [['PRD-0011', 20, 428]]],
    [60, 'PRV-0001', 'Contado', 'GR-0502', 'Emitida', [['PRD-0005', 6, 1170], ['PRD-0006', 8, 715], ['PRD-0010', 5, 885]]],
    [41, 'PRV-0008', 'Crédito 30 días', 'GR-2210', 'Emitida', [['PRD-0017', 6, 178], ['PRD-0018', 4, 515]]],
    [22, 'PRV-0011', 'Contado', 'F-0914', 'Emitida', [['PRD-0008', 4, 636]]],
    [9, 'PRV-0003', 'Crédito 30 días', 'GR-1187', 'Borrador', [['PRD-0001', 4, 780]]]
  ];

  /* Convierte las filas compactas en los documentos que espera el núcleo. */
  function armarVentas() {
    var r = [], i, f, ls, j, n;
    for (i = 0; i < VENTAS.length; i++) {
      f = VENTAS[i];
      ls = [];
      for (j = 0; j < f[6].length; j++) { ls.push({ item: f[6][j][0], cantidad: f[6][j][1], precio: PRECIOS[f[6][j][0]], descuentoPct: f[6][j][2] }); }
      n = i + 1;
      r.push({ id: 'VTA-' + (n < 10 ? '000' : '00') + n, fecha: '@-' + f[0], cliente: f[1], vendedor: f[2], formaPago: f[3], flete: f[4], estado: f[5], lineas: ls });
    }
    return r;
  }

  function armarCompras() {
    var r = [], i, f, ls, j;
    for (i = 0; i < COMPRAS.length; i++) {
      f = COMPRAS[i];
      ls = [];
      for (j = 0; j < f[5].length; j++) { ls.push({ item: f[5][j][0], cantidad: f[5][j][1], precio: f[5][j][2] }); }
      r.push({ id: 'CMP-000' + (i + 1), fecha: '@-' + f[0], proveedor: f[1], condicion: f[2], referencia: f[3], estado: f[4], lineas: ls });
    }
    return r;
  }

  /* ---------- Configuración del sistema ---------- */

  window.SISTEMA = {
    id: 'muebleria',
    nombre: 'Maderas del Sur · Ventas',
    rubro: 'Venta de muebles',
    version: '1.0.0',
    moneda: 'S/',
    tema: { primario: '#7a4a2b', acento: '#d9a441', siglas: 'MS' },

    parametros: [
      { id: 'igv', etiqueta: 'IGV', tipo: 'porcentaje', valor: 18, ayuda: 'Impuesto General a las Ventas que se suma a las ventas.' },
      { id: 'recargoMensual', etiqueta: 'Recargo financiero mensual', tipo: 'porcentaje', valor: 2, ayuda: 'Se cobra por cada mes de crédito sobre el subtotal de la venta.' },
      { id: 'comisionBase', etiqueta: 'Comisión base del vendedor', tipo: 'porcentaje', valor: 3, ayuda: 'Se usa cuando el vendedor no tiene una comisión propia.' }
    ],

    seguridad: {
      minClave: 10,
      intentosMax: 0,
      bloqueoMin: 5,
      sesionMin: 15,
      cadenaBitacora: true,
      confirmarEliminar: true,
      exigirCambioClave: true,
      ayudaLogin: true,
      exportaRespetaPermisos: true,
      cspMeta: true
    },

    roles: [
      { id: 'admin', nombre: 'Administrador', descripcion: 'Acceso total: mantenimientos, operaciones, usuarios, bitácora, respaldo y parámetros.' },
      { id: 'gerente', nombre: 'Gerente comercial', descripcion: 'Ve todos los reportes, administra vendedores y categorías y puede anular ventas.' },
      { id: 'vendedor', nombre: 'Vendedor de tienda', descripcion: 'Registra clientes y ventas; consulta productos y el top de ventas. No ve costos.' },
      { id: 'almacen', nombre: 'Encargado de almacén', descripcion: 'Administra productos y proveedores y registra las compras que suben el stock.' },
      { id: 'auditor', nombre: 'Auditor', descripcion: 'Solo lectura de todo el negocio y de la bitácora. No crea ni modifica nada.' }
    ],

    usuarios: [
      { usuario: 'admin', nombre: 'Rosa Quispe Mamani', rol: 'admin', clave: 'Admin#2026x' },
      { usuario: 'gerente', nombre: 'Luis Ccopa Rivera', rol: 'gerente', clave: 'Gerente#2026x' },
      { usuario: 'vendedor', nombre: 'Marisol Huamán Cutipa', rol: 'vendedor', clave: 'Vende#2026x' },
      { usuario: 'almacen', nombre: 'Jorge Mamani Torres', rol: 'almacen', clave: 'Almacen#2026x' },
      { usuario: 'auditor', nombre: 'Elena Paredes Zegarra', rol: 'auditor', clave: 'Audita#2026x' }
    ],

    /* ------------------------------ Entidades ------------------------------ */
    entidades: [
      {
        id: 'clientes', nombre: 'Cliente', plural: 'Clientes', prefijo: 'CLI',
        campos: [
          { id: 'documento', etiqueta: 'DNI o RUC', tipo: 'texto', requerido: true, unico: true, max: 11, patron: '^([0-9]{8}|[0-9]{11})$', mensajePatron: 'Escribe un DNI de 8 dígitos o un RUC de 11 dígitos.' },
          { id: 'nombre', etiqueta: 'Nombre o razón social', tipo: 'texto', requerido: true, max: 80 },
          { id: 'tipo', etiqueta: 'Tipo de cliente', tipo: 'lista', requerido: true, opciones: ['Persona', 'Empresa'], defecto: 'Persona' },
          { id: 'distrito', etiqueta: 'Distrito', tipo: 'lista', opciones: ['Arequipa (Cercado)', 'Yanahuara', 'Cayma', 'Cerro Colorado', 'Sachaca', 'José Luis Bustamante y Rivero', 'Paucarpata', 'Miraflores', 'Socabaya', 'Characato'] },
          { id: 'direccion', etiqueta: 'Dirección de entrega', tipo: 'texto', max: 120 },
          { id: 'telefono', etiqueta: 'Teléfono', tipo: 'telefono' },
          { id: 'email', etiqueta: 'Correo electrónico', tipo: 'email', max: 80 },
          { id: 'limiteCredito', etiqueta: 'Límite de crédito', tipo: 'moneda', min: 0, defecto: 0, ayuda: 'Cero significa que el cliente solo compra al contado.' }
        ],
        lista: ['documento', 'nombre', 'tipo', 'distrito', 'limiteCredito', 'comprado'],
        buscar: ['documento', 'nombre', 'distrito', 'email'],
        calculados: [
          {
            id: 'comprado', etiqueta: 'Compras acumuladas', tipo: 'moneda',
            formula: function (r, ctx) {
              var ventas = ctx.datos.listar('ventas', function (v) { return v.cliente === r.id && v.estado === 'Emitida'; });
              return ctx.redondear(ctx.suma(ventas, function (v) { return v.totales ? v.totales.total : 0; }));
            }
          }
        ],
        permisos: { ver: ['admin', 'gerente', 'vendedor', 'auditor'], crear: ['admin', 'vendedor'], editar: ['admin', 'vendedor'], eliminar: ['admin'] }
      },
      {
        id: 'productos', nombre: 'Producto', plural: 'Productos', prefijo: 'PRD',
        campos: [
          { id: 'codigo', etiqueta: 'Código', tipo: 'texto', requerido: true, unico: true, max: 20, patron: '^[A-Z0-9-]+$', mensajePatron: 'Usa solo mayúsculas, números y guiones.' },
          { id: 'nombre', etiqueta: 'Nombre del producto', tipo: 'texto', requerido: true, max: 80 },
          { id: 'categoria', etiqueta: 'Categoría', tipo: 'ref', entidad: 'categorias', mostrar: 'nombre', requerido: true },
          { id: 'proveedor', etiqueta: 'Proveedor habitual', tipo: 'ref', entidad: 'proveedores', mostrar: 'nombre', requerido: true },
          { id: 'material', etiqueta: 'Material principal', tipo: 'lista', opciones: ['Cedro', 'Roble', 'Tornillo', 'Melamina', 'Metal', 'Mixto'] },
          { id: 'medidas', etiqueta: 'Medidas', tipo: 'texto', max: 40 },
          { id: 'costo', etiqueta: 'Costo promedio', tipo: 'moneda', min: 0, requerido: true, ver: ['admin', 'gerente', 'almacen', 'auditor'], ayuda: 'Se recalcula solo al emitir una compra.' },
          { id: 'precio', etiqueta: 'Precio de venta (sin IGV)', tipo: 'moneda', min: 0, requerido: true },
          { id: 'stock', etiqueta: 'Stock actual', tipo: 'entero', min: 0, requerido: true, defecto: 0 },
          { id: 'stockMin', etiqueta: 'Stock mínimo', tipo: 'entero', min: 0, requerido: true, defecto: 2, ayuda: 'Por debajo de esta cantidad el producto aparece como stock bajo.' },
          { id: 'activo', etiqueta: 'Producto activo', tipo: 'booleano', defecto: true }
        ],
        lista: ['codigo', 'nombre', 'categoria', 'precio', 'stock', 'situacion'],
        buscar: ['codigo', 'nombre', 'categoria', 'material'],
        calculados: [
          {
            id: 'situacion', etiqueta: 'Situación', tipo: 'texto',
            formula: function (r) { return r.stock <= 0 ? 'Agotado' : (r.stock <= r.stockMin ? 'Stock bajo' : 'Normal'); }
          },
          {
            id: 'margen', etiqueta: 'Margen sobre precio', tipo: 'porcentaje', ver: ['admin', 'gerente', 'almacen', 'auditor'],
            formula: function (r, ctx) { return r.precio > 0 && r.costo !== undefined ? ctx.redondear((r.precio - r.costo) / r.precio * 100) : null; }
          },
          {
            id: 'valorStock', etiqueta: 'Valor en stock (costo)', tipo: 'moneda', ver: ['admin', 'gerente', 'almacen', 'auditor'],
            formula: function (r, ctx) { return ctx.redondear((r.costo || 0) * (r.stock || 0)); }
          }
        ],
        reglas: [
          {
            id: 'precio-coherente', mensaje: 'El precio de venta no puede ser menor al costo.',
            validar: function (r) { return !(r.costo !== undefined && r.precio < r.costo); }
          }
        ],
        permisos: { ver: ['admin', 'gerente', 'vendedor', 'almacen', 'auditor'], crear: ['admin', 'almacen'], editar: ['admin', 'almacen'], eliminar: ['admin'] }
      },
      {
        id: 'proveedores', nombre: 'Proveedor', plural: 'Proveedores', prefijo: 'PRV',
        campos: [
          { id: 'ruc', etiqueta: 'RUC', tipo: 'texto', requerido: true, unico: true, max: 11, patron: '^[0-9]{11}$', mensajePatron: 'El RUC tiene 11 dígitos.' },
          { id: 'nombre', etiqueta: 'Razón social', tipo: 'texto', requerido: true, max: 80 },
          { id: 'contacto', etiqueta: 'Persona de contacto', tipo: 'texto', max: 60 },
          { id: 'telefono', etiqueta: 'Teléfono', tipo: 'telefono' },
          { id: 'email', etiqueta: 'Correo electrónico', tipo: 'email', max: 80 },
          { id: 'ciudad', etiqueta: 'Ciudad', tipo: 'texto', max: 40 },
          { id: 'diasCredito', etiqueta: 'Días de crédito que otorga', tipo: 'entero', min: 0, max: 90, defecto: 30 }
        ],
        lista: ['ruc', 'nombre', 'ciudad', 'contacto', 'diasCredito'],
        buscar: ['ruc', 'nombre', 'ciudad', 'contacto'],
        permisos: { ver: ['admin', 'gerente', 'almacen', 'auditor'], crear: ['admin', 'almacen'], editar: ['admin', 'almacen'], eliminar: ['admin'] }
      },
      {
        id: 'categorias', nombre: 'Categoría', plural: 'Categorías', prefijo: 'CAT',
        campos: [
          { id: 'nombre', etiqueta: 'Nombre', tipo: 'texto', requerido: true, unico: true, max: 40 },
          { id: 'descripcion', etiqueta: 'Descripción', tipo: 'textarea', max: 200 },
          { id: 'garantiaMeses', etiqueta: 'Garantía (meses)', tipo: 'entero', min: 0, max: 60, defecto: 12 }
        ],
        lista: ['nombre', 'descripcion', 'garantiaMeses', 'productos'],
        buscar: ['nombre', 'descripcion'],
        calculados: [
          {
            id: 'productos', etiqueta: 'Productos', tipo: 'entero',
            formula: function (r, ctx) { return ctx.datos.listar('productos', function (p) { return p.categoria === r.id; }).length; }
          }
        ],
        permisos: { ver: ['admin', 'gerente', 'vendedor', 'almacen', 'auditor'], crear: ['admin', 'gerente'], editar: ['admin', 'gerente'], eliminar: ['admin'] }
      },
      {
        id: 'vendedores', nombre: 'Vendedor', plural: 'Vendedores', prefijo: 'VEN',
        campos: [
          { id: 'nombre', etiqueta: 'Nombre completo', tipo: 'texto', requerido: true, max: 80 },
          { id: 'dni', etiqueta: 'DNI', tipo: 'texto', requerido: true, unico: true, max: 8, patron: '^[0-9]{8}$', mensajePatron: 'El DNI tiene 8 dígitos.' },
          { id: 'sucursal', etiqueta: 'Sucursal', tipo: 'lista', requerido: true, opciones: ['Tienda Cercado', 'Tienda Yanahuara', 'Tienda Cayma', 'Tienda Cerro Colorado', 'Ventas corporativas'] },
          { id: 'comision', etiqueta: 'Comisión propia', tipo: 'porcentaje', min: 0, max: 10, requerido: true, defecto: 3, ayuda: 'Porcentaje sobre el subtotal de cada venta emitida (máximo 10 %).' },
          { id: 'metaMensual', etiqueta: 'Meta mensual de ventas', tipo: 'moneda', min: 0, requerido: true, defecto: 20000 },
          { id: 'fechaIngreso', etiqueta: 'Fecha de ingreso', tipo: 'fecha', max: 'hoy' }
        ],
        lista: ['nombre', 'sucursal', 'comision', 'metaMensual', 'fechaIngreso'],
        buscar: ['nombre', 'dni', 'sucursal'],
        permisos: { ver: ['admin', 'gerente', 'auditor'], crear: ['admin', 'gerente'], editar: ['admin', 'gerente'], eliminar: ['admin'] }
      }
    ],

    /* ------------------------------ Operaciones ------------------------------ */
    operaciones: [
      {
        id: 'ventas', nombre: 'Venta', plural: 'Ventas', prefijo: 'VTA', serie: 'F001',
        campos: [
          { id: 'fecha', etiqueta: 'Fecha', tipo: 'fecha', requerido: true, defecto: 'hoy', max: 'hoy' },
          { id: 'cliente', etiqueta: 'Cliente', tipo: 'ref', entidad: 'clientes', mostrar: 'nombre', requerido: true },
          { id: 'vendedor', etiqueta: 'Vendedor', tipo: 'ref', entidad: 'vendedores', mostrar: 'nombre', requerido: true },
          { id: 'formaPago', etiqueta: 'Forma de pago', tipo: 'lista', requerido: true, opciones: ['Contado', 'Tarjeta', 'Transferencia', 'Crédito 30 días', 'Crédito 60 días'], defecto: 'Contado', ayuda: 'El crédito exige línea de crédito del cliente y suma un recargo financiero.' },
          { id: 'flete', etiqueta: 'Flete de entrega (sin IGV)', tipo: 'moneda', min: 0, defecto: 0 },
          { id: 'observaciones', etiqueta: 'Observaciones', tipo: 'textarea', max: 300 }
        ],
        lista: ['fecha', 'cliente', 'formaPago'],
        estados: ['Borrador', 'Emitida', 'Anulada'],
        lineas: {
          entidad: 'productos', mostrar: 'nombre', precio: 'precio',
          campos: [
            { id: 'cantidad', etiqueta: 'Cant.', tipo: 'entero', min: 1, requerido: true, defecto: 1 },
            { id: 'descuentoPct', etiqueta: 'Desc. %', tipo: 'porcentaje', min: 0, max: 30, defecto: 0 }
          ],
          importe: function (l) { return l.cantidad * l.precio * (1 - (l.descuentoPct || 0) / 100); },
          info: function (item) { return 'Stock disponible: ' + item.stock + ' · Precio de lista: S/ ' + item.precio.toFixed(2); }
        },
        calcular: function (doc, ctx) {
          var sub = ctx.redondear(ctx.suma(doc.lineas, function (l) { return l.cantidad * l.precio * (1 - (l.descuentoPct || 0) / 100); }));
          var meses = doc.formaPago === 'Crédito 60 días' ? 2 : (doc.formaPago === 'Crédito 30 días' ? 1 : 0);
          var recargo = ctx.redondear(sub * ctx.param('recargoMensual') / 100 * meses);
          var flete = ctx.redondear(doc.flete || 0);
          var base = sub + recargo + flete;
          var igv = ctx.redondear(base * ctx.param('igv') / 100);
          var vend = doc.vendedor ? ctx.datos.obtener('vendedores', doc.vendedor) : null;
          var pctCom = vend && vend.comision !== undefined ? vend.comision : ctx.param('comisionBase');
          return { subtotal: sub, recargo: recargo, flete: flete, igv: igv, total: ctx.redondear(base + igv), comision: ctx.redondear(sub * pctCom / 100) };
        },
        totales: [
          { id: 'subtotal', etiqueta: 'Subtotal (con descuentos)' },
          { id: 'recargo', etiqueta: 'Recargo financiero' },
          { id: 'flete', etiqueta: 'Flete' },
          { id: 'igv', etiqueta: 'IGV' },
          { id: 'total', etiqueta: 'Total a pagar', fuerte: true }
        ],
        reglas: [
          {
            id: 'credito-con-linea', mensaje: 'El cliente no tiene línea de crédito: elige Contado, Tarjeta o Transferencia.',
            validar: function (d, ctx) {
              var cli;
              if (d.formaPago !== 'Crédito 30 días' && d.formaPago !== 'Crédito 60 días') { return true; }
              cli = ctx.datos.obtener('clientes', d.cliente);
              return !!cli && cli.limiteCredito > 0;
            }
          }
        ],
        alEmitir: function (doc, ctx) {
          var i, l, p, exposicion, cli, desde;
          for (i = 0; i < doc.lineas.length; i++) {
            l = doc.lineas[i];
            p = ctx.datos.obtener('productos', l.item);
            if (p.stock < l.cantidad) { throw new Error('Stock insuficiente de «' + p.nombre + '»: hay ' + p.stock + ' y se piden ' + l.cantidad + '.'); }
          }
          if (doc.formaPago === 'Crédito 30 días' || doc.formaPago === 'Crédito 60 días') {
            cli = ctx.datos.obtener('clientes', doc.cliente);
            desde = ctx.fechaMas(ctx.hoy(), -60);
            /* La venta ya figura como emitida cuando se llama a alEmitir, así que la exposición ya la incluye. */
            exposicion = ctx.suma(ctx.datos.listar('ventas', function (v) {
              return v.cliente === doc.cliente && v.estado === 'Emitida' && v.fecha >= desde && (v.formaPago === 'Crédito 30 días' || v.formaPago === 'Crédito 60 días');
            }), function (v) { return v.totales ? v.totales.total : 0; });
            if (exposicion > cli.limiteCredito) {
              throw new Error('La venta supera el límite de crédito de ' + cli.nombre + ' (' + ctx.fmt.moneda(cli.limiteCredito) + '). Crédito vigente: ' + ctx.fmt.moneda(ctx.redondear(exposicion)) + '.');
            }
          }
          for (i = 0; i < doc.lineas.length; i++) {
            l = doc.lineas[i];
            p = ctx.datos.obtener('productos', l.item);
            ctx.datos.actualizar('productos', l.item, { stock: p.stock - l.cantidad });
          }
        },
        alAnular: function (doc, ctx) {
          var i, l, p;
          for (i = 0; i < doc.lineas.length; i++) {
            l = doc.lineas[i];
            p = ctx.datos.obtener('productos', l.item);
            ctx.datos.actualizar('productos', l.item, { stock: p.stock + l.cantidad });
          }
        },
        permisos: { ver: ['admin', 'gerente', 'vendedor', 'auditor'], crear: ['admin', 'vendedor'], editar: ['admin', 'vendedor'], emitir: ['admin', 'vendedor'], anular: ['admin', 'gerente'] }
      },
      {
        id: 'compras', nombre: 'Compra', plural: 'Compras', prefijo: 'CMP', serie: 'OC01',
        campos: [
          { id: 'fecha', etiqueta: 'Fecha', tipo: 'fecha', requerido: true, defecto: 'hoy', max: 'hoy' },
          { id: 'proveedor', etiqueta: 'Proveedor', tipo: 'ref', entidad: 'proveedores', mostrar: 'nombre', requerido: true },
          { id: 'condicion', etiqueta: 'Condición de pago', tipo: 'lista', requerido: true, opciones: ['Contado', 'Crédito 30 días', 'Crédito 60 días'], defecto: 'Contado' },
          { id: 'referencia', etiqueta: 'Guía o factura del proveedor', tipo: 'texto', max: 30 },
          { id: 'observaciones', etiqueta: 'Observaciones', tipo: 'textarea', max: 300 }
        ],
        lista: ['fecha', 'proveedor', 'condicion'],
        estados: ['Borrador', 'Emitida', 'Anulada'],
        lineas: {
          entidad: 'productos', mostrar: 'nombre', precio: 'costo', precioEditable: true,
          campos: [{ id: 'cantidad', etiqueta: 'Cant.', tipo: 'entero', min: 1, requerido: true, defecto: 1 }],
          info: function (item) { return 'Stock actual: ' + item.stock + ' · Costo promedio: S/ ' + (item.costo || 0).toFixed(2); }
        },
        calcular: function (doc, ctx) {
          var sub = ctx.redondear(ctx.suma(doc.lineas, function (l) { return l.cantidad * l.precio; }));
          var igv = ctx.redondear(sub * 0.18);
          return { subtotal: sub, igv: igv, total: ctx.redondear(sub + igv) };
        },
        totales: [
          { id: 'subtotal', etiqueta: 'Subtotal' },
          { id: 'igv', etiqueta: 'IGV' },
          { id: 'total', etiqueta: 'Total de la compra', fuerte: true }
        ],
        alEmitir: function (doc, ctx) {
          var i, l, p, nuevoCosto;
          for (i = 0; i < doc.lineas.length; i++) {
            l = doc.lineas[i];
            p = ctx.datos.obtener('productos', l.item);
            /* Costo promedio ponderado: mezcla lo que ya hay con lo que entra. */
            nuevoCosto = ctx.redondear((p.stock * (p.costo || 0) + l.cantidad * l.precio) / (p.stock + l.cantidad));
            ctx.datos.actualizar('productos', l.item, { stock: p.stock + l.cantidad, costo: nuevoCosto });
          }
        },
        alAnular: function (doc, ctx) {
          var i, l, p;
          for (i = 0; i < doc.lineas.length; i++) {
            l = doc.lineas[i];
            p = ctx.datos.obtener('productos', l.item);
            if (p.stock < l.cantidad) { throw new Error('No se puede anular: ya se vendió parte de «' + p.nombre + '» (stock ' + p.stock + ', la compra trajo ' + l.cantidad + ').'); }
          }
          for (i = 0; i < doc.lineas.length; i++) {
            l = doc.lineas[i];
            p = ctx.datos.obtener('productos', l.item);
            ctx.datos.actualizar('productos', l.item, { stock: p.stock - l.cantidad });
          }
        },
        permisos: { ver: ['admin', 'gerente', 'almacen', 'auditor'], crear: ['admin', 'almacen'], editar: ['admin', 'almacen'], emitir: ['admin', 'almacen'], anular: ['admin'] }
      }
    ],

    /* ------------------------------ Reportes ------------------------------ */
    reportes: [
      {
        id: 'ventas-mes', titulo: 'Ventas por mes',
        descripcion: 'Ventas emitidas agrupadas por mes: subtotal, IGV y total. Las anuladas y los borradores no cuentan.',
        roles: ['admin', 'gerente', 'auditor'],
        parametros: [
          { id: 'desde', etiqueta: 'Desde', tipo: 'fecha', requerido: true, defecto: '@-180' },
          { id: 'hasta', etiqueta: 'Hasta', tipo: 'fecha', requerido: true, defecto: 'hoy' }
        ],
        ejecutar: function (p, ctx) {
          var ventas = ventasEmitidas(ctx, p.desde, p.hasta), grupos = ctx.agrupar(ventas, function (v) { return ctx.mes(v.fecha); });
          var claves = [], k, filas = [], etiquetas = [], valores = [], total = 0, n = 0, g, sub, igv, tot;
          for (k in grupos) { if (grupos.hasOwnProperty(k)) { claves.push(k); } }
          claves.sort();
          for (k = 0; k < claves.length; k++) {
            g = grupos[claves[k]];
            sub = ctx.redondear(ctx.suma(g, function (v) { return v.totales.subtotal; }));
            igv = ctx.redondear(ctx.suma(g, function (v) { return v.totales.igv; }));
            tot = ctx.redondear(ctx.suma(g, function (v) { return v.totales.total; }));
            filas.push([nombreMes(claves[k]), g.length, sub, igv, tot]);
            etiquetas.push(nombreMes(claves[k]));
            valores.push(tot);
            total += tot;
            n += g.length;
          }
          return {
            columnas: ['Mes', 'N.º de ventas', 'Subtotal', 'IGV', 'Total'], tipos: ['texto', 'entero', 'moneda', 'moneda', 'moneda'], filas: filas,
            grafico: { tipo: 'columnas', etiquetas: etiquetas, valores: valores, formato: 'moneda' },
            resumen: [
              { etiqueta: 'Total del periodo', valor: ctx.redondear(total), tipo: 'moneda' },
              { etiqueta: 'Ventas emitidas', valor: n, tipo: 'entero' },
              { etiqueta: 'Ticket promedio', valor: n ? ctx.redondear(total / n) : 0, tipo: 'moneda' }
            ]
          };
        }
      },
      {
        id: 'ventas-vendedor', titulo: 'Ventas y comisión por vendedor',
        descripcion: 'Venta neta de cada vendedor, su comisión (porcentaje propio sobre el subtotal) y el cumplimiento de su meta mensual en el periodo.',
        roles: ['admin', 'gerente', 'auditor'],
        parametros: [
          { id: 'desde', etiqueta: 'Desde', tipo: 'fecha', requerido: true, defecto: '@-90' },
          { id: 'hasta', etiqueta: 'Hasta', tipo: 'fecha', requerido: true, defecto: 'hoy' }
        ],
        ejecutar: function (p, ctx) {
          var ventas = ventasEmitidas(ctx, p.desde, p.hasta), vendedores = ctx.datos.listar('vendedores'), filas = [], etiquetas = [], valores = [], i, v, mias, neta, com, meta, meses, totalCom = 0;
          meses = Math.max(1, Math.round(ctx.diasEntre(p.desde, p.hasta) / 30));
          for (i = 0; i < vendedores.length; i++) {
            v = vendedores[i];
            mias = ventas.filter(function (x) { return x.vendedor === v.id; });
            if (!mias.length) { continue; }
            neta = ctx.redondear(ctx.suma(mias, function (x) { return x.totales.subtotal; }));
            com = ctx.redondear(ctx.suma(mias, function (x) { return x.totales.comision; }));
            meta = ctx.redondear(v.metaMensual * meses);
            filas.push([v.nombre, v.sucursal, mias.length, neta, com, meta, meta > 0 ? ctx.redondear(neta / meta * 100) : 0]);
            totalCom += com;
          }
          filas.sort(function (a, b) { return b[3] - a[3]; });
          for (i = 0; i < filas.length; i++) { etiquetas.push(filas[i][0]); valores.push(filas[i][3]); }
          return {
            columnas: ['Vendedor', 'Sucursal', 'Ventas', 'Venta neta', 'Comisión', 'Meta del periodo', 'Cumplimiento %'],
            tipos: ['texto', 'texto', 'entero', 'moneda', 'moneda', 'moneda', 'porcentaje'], filas: filas,
            grafico: { tipo: 'barras', etiquetas: etiquetas, valores: valores, formato: 'moneda' },
            resumen: [
              { etiqueta: 'Comisiones del periodo', valor: ctx.redondear(totalCom), tipo: 'moneda' },
              { etiqueta: 'Vendedores con ventas', valor: filas.length, tipo: 'entero' },
              { etiqueta: 'Meses considerados', valor: meses, tipo: 'entero' }
            ]
          };
        }
      },
      {
        id: 'productos-top', titulo: 'Productos más vendidos',
        descripcion: 'Unidades e ingreso (sin IGV) por producto en el periodo, de mayor a menor ingreso.',
        roles: ['admin', 'gerente', 'vendedor', 'almacen', 'auditor'],
        parametros: [
          { id: 'desde', etiqueta: 'Desde', tipo: 'fecha', requerido: true, defecto: '@-90' },
          { id: 'hasta', etiqueta: 'Hasta', tipo: 'fecha', requerido: true, defecto: 'hoy' },
          { id: 'top', etiqueta: 'Cantidad de productos', tipo: 'entero', min: 1, max: 50, requerido: true, defecto: 10 }
        ],
        ejecutar: function (p, ctx) {
          var ventas = ventasEmitidas(ctx, p.desde, p.hasta), acum = {}, i, j, l, k, lista = [], filas = [], etiquetas = [], valores = [], prod, cat;
          for (i = 0; i < ventas.length; i++) {
            for (j = 0; j < ventas[i].lineas.length; j++) {
              l = ventas[i].lineas[j];
              if (!acum[l.item]) { acum[l.item] = { id: l.item, unidades: 0, ingreso: 0 }; }
              acum[l.item].unidades += l.cantidad;
              acum[l.item].ingreso += importeLinea(l);
            }
          }
          for (k in acum) { if (acum.hasOwnProperty(k)) { lista.push(acum[k]); } }
          lista.sort(function (a, b) { return b.ingreso - a.ingreso; });
          lista = lista.slice(0, p.top || 10);
          for (i = 0; i < lista.length; i++) {
            prod = ctx.datos.obtener('productos', lista[i].id);
            cat = prod ? ctx.datos.obtener('categorias', prod.categoria) : null;
            filas.push([prod ? prod.nombre : lista[i].id, cat ? cat.nombre : '', lista[i].unidades, ctx.redondear(lista[i].ingreso)]);
            etiquetas.push(prod ? prod.nombre : lista[i].id);
            valores.push(ctx.redondear(lista[i].ingreso));
          }
          return {
            columnas: ['Producto', 'Categoría', 'Unidades', 'Ingreso'], tipos: ['texto', 'texto', 'entero', 'moneda'], filas: filas,
            grafico: { tipo: 'barras', etiquetas: etiquetas, valores: valores, formato: 'moneda' },
            resumen: [{ etiqueta: 'Ingreso de estos productos', valor: ctx.redondear(ctx.suma(valores)), tipo: 'moneda' }, { etiqueta: 'Unidades vendidas', valor: ctx.suma(filas, function (f) { return f[2]; }), tipo: 'entero' }]
          };
        }
      },
      {
        id: 'stock', titulo: 'Stock bajo y valorizado',
        descripcion: 'Existencias por producto, con alerta de stock bajo y valor al costo y a precio de venta.',
        parametros: [
          { id: 'filtro', etiqueta: 'Mostrar', tipo: 'lista', opciones: ['Todos los productos', 'Solo stock bajo'], defecto: 'Todos los productos' }
        ],
        ejecutar: function (p, ctx) {
          var prods = ctx.datos.listar('productos', function (x) { return x.activo !== false; }), filas = [], i, x, porCat = {}, k, etiquetas = [], valores = [], valCosto = 0, valVenta = 0, bajos = 0, cat;
          for (i = 0; i < prods.length; i++) {
            x = prods[i];
            if (stockBajo(x)) { bajos += 1; }
            if (p.filtro === 'Solo stock bajo' && !stockBajo(x)) { continue; }
            cat = ctx.datos.obtener('categorias', x.categoria);
            filas.push([x.codigo, x.nombre, cat ? cat.nombre : '', x.stock, x.stockMin, x.stock <= 0 ? 'Agotado' : (stockBajo(x) ? 'Stock bajo' : 'Normal'), x.costo || 0, ctx.redondear((x.costo || 0) * x.stock), ctx.redondear(x.precio * x.stock)]);
            valCosto += (x.costo || 0) * x.stock;
            valVenta += x.precio * x.stock;
            porCat[cat ? cat.nombre : 'Sin categoría'] = (porCat[cat ? cat.nombre : 'Sin categoría'] || 0) + (x.costo || 0) * x.stock;
          }
          for (k in porCat) { if (porCat.hasOwnProperty(k)) { etiquetas.push(k); valores.push(ctx.redondear(porCat[k])); } }
          return {
            columnas: ['Código', 'Producto', 'Categoría', 'Stock', 'Mínimo', 'Situación', 'Costo unit.', 'Valor al costo', 'Valor a precio'],
            tipos: ['texto', 'texto', 'texto', 'entero', 'entero', 'texto', 'moneda', 'moneda', 'moneda'], filas: filas,
            grafico: { tipo: 'barras', etiquetas: etiquetas, valores: valores, formato: 'moneda' },
            resumen: [
              { etiqueta: 'Valor al costo', valor: ctx.redondear(valCosto), tipo: 'moneda' },
              { etiqueta: 'Valor a precio de venta', valor: ctx.redondear(valVenta), tipo: 'moneda' },
              { etiqueta: 'Productos con stock bajo', valor: bajos, tipo: 'entero' }
            ]
          };
        }
      },
      {
        id: 'formas-pago', titulo: 'Ventas por forma de pago',
        descripcion: 'Cuánto se vende al contado y cuánto a crédito, y cuánto recargo financiero se cobró.',
        roles: ['admin', 'gerente', 'auditor'],
        parametros: [
          { id: 'desde', etiqueta: 'Desde', tipo: 'fecha', requerido: true, defecto: '@-180' },
          { id: 'hasta', etiqueta: 'Hasta', tipo: 'fecha', requerido: true, defecto: 'hoy' }
        ],
        ejecutar: function (p, ctx) {
          var ventas = ventasEmitidas(ctx, p.desde, p.hasta), grupos = ctx.agrupar(ventas, function (v) { return v.formaPago; }), formas = ['Contado', 'Tarjeta', 'Transferencia', 'Crédito 30 días', 'Crédito 60 días'];
          var filas = [], etiquetas = [], valores = [], i, g, tot, totalGeneral = ctx.suma(ventas, function (v) { return v.totales.total; }), recargo = 0, credito = 0;
          for (i = 0; i < formas.length; i++) {
            g = grupos[formas[i]] || [];
            if (!g.length) { continue; }
            tot = ctx.redondear(ctx.suma(g, function (v) { return v.totales.total; }));
            filas.push([formas[i], g.length, tot, totalGeneral > 0 ? ctx.redondear(tot / totalGeneral * 100) : 0, ctx.redondear(ctx.suma(g, function (v) { return v.totales.recargo; }))]);
            etiquetas.push(formas[i]);
            valores.push(tot);
            recargo += ctx.suma(g, function (v) { return v.totales.recargo; });
            if (formas[i].indexOf('Crédito') === 0) { credito += tot; }
          }
          return {
            columnas: ['Forma de pago', 'Ventas', 'Total', '% del total', 'Recargo cobrado'], tipos: ['texto', 'entero', 'moneda', 'porcentaje', 'moneda'], filas: filas,
            grafico: { tipo: 'barras', etiquetas: etiquetas, valores: valores, formato: 'moneda' },
            resumen: [
              { etiqueta: 'Vendido a crédito', valor: ctx.redondear(credito), tipo: 'moneda' },
              { etiqueta: 'Recargo financiero cobrado', valor: ctx.redondear(recargo), tipo: 'moneda' },
              { etiqueta: 'Total del periodo', valor: ctx.redondear(totalGeneral), tipo: 'moneda' }
            ]
          };
        }
      }
    ],

    /* ------------------------------ Tablero ------------------------------ */
    tablero: [
      {
        titulo: 'Ventas de los últimos 30 días', tipo: 'moneda',
        calcular: function (ctx) {
          return ctx.redondear(ctx.suma(ventasEmitidas(ctx, ctx.fechaMas(ctx.hoy(), -29), ctx.hoy()), function (v) { return v.totales.total; }));
        }
      },
      {
        titulo: 'Variación frente a los 30 días anteriores', tipo: 'porcentaje',
        calcular: function (ctx) {
          var hoy = ctx.hoy();
          var actual = ctx.suma(ventasEmitidas(ctx, ctx.fechaMas(hoy, -29), hoy), function (v) { return v.totales.total; });
          var previo = ctx.suma(ventasEmitidas(ctx, ctx.fechaMas(hoy, -59), ctx.fechaMas(hoy, -30)), function (v) { return v.totales.total; });
          return previo > 0 ? ctx.redondear((actual - previo) / previo * 100) : null;
        }
      },
      {
        titulo: 'Ticket promedio (30 días)', tipo: 'moneda',
        calcular: function (ctx) {
          var v = ventasEmitidas(ctx, ctx.fechaMas(ctx.hoy(), -29), ctx.hoy());
          return v.length ? ctx.redondear(ctx.suma(v, function (x) { return x.totales.total; }) / v.length) : 0;
        }
      },
      {
        titulo: 'Productos con stock bajo', tipo: 'entero',
        calcular: function (ctx) { return ctx.datos.listar('productos', stockBajo).length; }
      },
      {
        titulo: 'Valor del inventario al costo', tipo: 'moneda', roles: ['admin', 'gerente', 'almacen', 'auditor'],
        calcular: function (ctx) {
          return ctx.redondear(ctx.suma(ctx.datos.listar('productos'), function (p) { return (p.costo || 0) * p.stock; }));
        }
      },
      {
        titulo: 'Borradores por emitir', tipo: 'entero',
        calcular: function (ctx) {
          var sinEmitir = function (d) { return d.estado === 'Borrador'; };
          return ctx.datos.listar('ventas', sinEmitir).length + ctx.datos.listar('compras', sinEmitir).length;
        }
      }
    ],

    tableroGrafico: {
      titulo: 'Ventas de los últimos 6 meses (con IGV)', tipo: 'columnas', formato: 'moneda',
      calcular: function (ctx) {
        var meses = ultimosMeses(ctx, 6), ventas = ventasEmitidas(ctx, meses[0] + '-01', ctx.hoy()), g = ctx.agrupar(ventas, function (v) { return ctx.mes(v.fecha); }), etiquetas = [], valores = [], i;
        for (i = 0; i < meses.length; i++) {
          etiquetas.push(MESES[parseInt(meses[i].slice(5, 7), 10) - 1]);
          valores.push(ctx.redondear(ctx.suma(g[meses[i]] || [], function (v) { return v.totales.total; })));
        }
        return { etiquetas: etiquetas, valores: valores };
      }
    },

    /* ------------------------------ Semillas ------------------------------ */
    semillas: {
      categorias: [
        { id: 'CAT-0001', nombre: 'Sala', descripcion: 'Sofás, mesas de centro y racks para la sala de estar.', garantiaMeses: 12 },
        { id: 'CAT-0002', nombre: 'Comedor', descripcion: 'Juegos de comedor, sillas y aparadores.', garantiaMeses: 12 },
        { id: 'CAT-0003', nombre: 'Dormitorio', descripcion: 'Camas, colchones, roperos y veladores.', garantiaMeses: 24 },
        { id: 'CAT-0004', nombre: 'Oficina', descripcion: 'Escritorios, sillas ergonómicas y libreros.', garantiaMeses: 12 },
        { id: 'CAT-0005', nombre: 'Cocina y bar', descripcion: 'Taburetes y mobiliario de barra.', garantiaMeses: 6 },
        { id: 'CAT-0006', nombre: 'Exteriores', descripcion: 'Muebles de jardín y terraza.', garantiaMeses: 6 }
      ],
      proveedores: [
        { id: 'PRV-0001', ruc: '20512345671', nombre: 'Aserradero Los Andes S.A.C.', contacto: 'Hugo Velásquez', telefono: '054 255 101', email: 'ventas@losandes.example.pe', ciudad: 'Arequipa', diasCredito: 30 },
        { id: 'PRV-0002', ruc: '20523456782', nombre: 'Maderas Pucallpa E.I.R.L.', contacto: 'Teresa Ramírez', telefono: '061 575 220', email: 'contacto@pucallpa.example.pe', ciudad: 'Pucallpa', diasCredito: 45 },
        { id: 'PRV-0003', ruc: '20534567893', nombre: 'Tapizados Chili S.R.L.', contacto: 'Walter Ccama', telefono: '054 281 330', email: 'tapizados@chili.example.pe', ciudad: 'Arequipa', diasCredito: 30 },
        { id: 'PRV-0004', ruc: '20545678904', nombre: 'Herrajes y Accesorios Perú S.A.C.', contacto: 'Mónica Aguirre', telefono: '01 612 4400', email: 'pedidos@herrajes.example.pe', ciudad: 'Lima', diasCredito: 15 },
        { id: 'PRV-0005', ruc: '20556789015', nombre: 'Melamine Industrial S.A.', contacto: 'Sergio Bravo', telefono: '01 441 7788', email: 'comercial@melamine.example.pe', ciudad: 'Lima', diasCredito: 30 },
        { id: 'PRV-0006', ruc: '20567890126', nombre: 'Cuero y Tela Premium S.A.C.', contacto: 'Lourdes Palomino', telefono: '044 244 905', email: 'ventas@cueroytela.example.pe', ciudad: 'Trujillo', diasCredito: 30 },
        { id: 'PRV-0007', ruc: '20578901237', nombre: 'Colchones Andino S.A.', contacto: 'Edwin Mayta', telefono: '051 321 640', email: 'mayoristas@andino.example.pe', ciudad: 'Juliaca', diasCredito: 30 },
        { id: 'PRV-0008', ruc: '20589012348', nombre: 'Metalmecánica Sur E.I.R.L.', contacto: 'Raúl Salinas', telefono: '054 233 870', email: 'info@metalsur.example.pe', ciudad: 'Arequipa', diasCredito: 30 },
        { id: 'PRV-0009', ruc: '20590123459', nombre: 'Barnices y Lacas Nacional S.A.C.', contacto: 'Daniela Rojas', telefono: '01 336 2210', email: 'ventas@lacas.example.pe', ciudad: 'Lima', diasCredito: 15 },
        { id: 'PRV-0010', ruc: '20601234560', nombre: 'Muebles Ensamblados Cusco S.R.L.', contacto: 'Percy Huillca', telefono: '084 232 415', email: 'cusco@ensamblados.example.pe', ciudad: 'Cusco', diasCredito: 30 },
        { id: 'PRV-0011', ruc: '20612345671', nombre: 'Vidrios y Espejos Misti S.A.C.', contacto: 'Karina Quispe', telefono: '054 260 718', email: 'misti@vidrios.example.pe', ciudad: 'Arequipa', diasCredito: 0 },
        { id: 'PRV-0012', ruc: '20623456782', nombre: 'Importadora Sillas Confort S.A.C.', contacto: 'Andrés Wong', telefono: '01 575 9033', email: 'importaciones@confort.example.pe', ciudad: 'Callao', diasCredito: 60 }
      ],
      clientes: [
        { id: 'CLI-0001', documento: '43215678', nombre: 'Carmen Rosa Delgado Flores', tipo: 'Persona', distrito: 'Yanahuara', direccion: 'Calle Jerusalén 412', telefono: '959 120 331', email: 'carmen.delgado@correo.example.pe', limiteCredito: 0 },
        { id: 'CLI-0002', documento: '20493827561', nombre: 'Hotel Misti Plaza S.A.C.', tipo: 'Empresa', distrito: 'Arequipa (Cercado)', direccion: 'Plaza de Armas 118', telefono: '054 228 400', email: 'compras@mistiplaza.example.pe', limiteCredito: 30000 },
        { id: 'CLI-0003', documento: '20481726354', nombre: 'Constructora Volcán E.I.R.L.', tipo: 'Empresa', distrito: 'Cerro Colorado', direccion: 'Av. Aviación 2210', telefono: '054 270 515', email: 'logistica@volcan.example.pe', limiteCredito: 25000 },
        { id: 'CLI-0004', documento: '20470615243', nombre: 'Clínica San Lucas del Sur S.A.', tipo: 'Empresa', distrito: 'Cayma', direccion: 'Av. Ejército 905', telefono: '054 251 760', email: 'administracion@sanlucas.example.pe', limiteCredito: 40000 },
        { id: 'CLI-0005', documento: '20459504132', nombre: 'Restaurante El Fogón Arequipeño S.R.L.', tipo: 'Empresa', distrito: 'Sachaca', direccion: 'Calle Ugarte 330', telefono: '054 243 118', email: 'gerencia@elfogon.example.pe', limiteCredito: 12000 },
        { id: 'CLI-0006', documento: '20448493021', nombre: 'Oficinas Colca Corp S.A.C.', tipo: 'Empresa', distrito: 'José Luis Bustamante y Rivero', direccion: 'Av. Parra 504, of. 301', telefono: '054 265 904', email: 'compras@colcacorp.example.pe', limiteCredito: 20000 },
        { id: 'CLI-0007', documento: '20437382910', nombre: 'Inmobiliaria Campiña Verde S.A.C.', tipo: 'Empresa', distrito: 'Miraflores', direccion: 'Av. Mariscal Castilla 1450', telefono: '054 238 266', email: 'proyectos@campinaverde.example.pe', limiteCredito: 50000 },
        { id: 'CLI-0008', documento: '29345612', nombre: 'Mario Antonio Cáceres Zevallos', tipo: 'Persona', distrito: 'Paucarpata', direccion: 'Urb. Los Álamos B-12', telefono: '958 440 217', email: 'mario.caceres@correo.example.pe', limiteCredito: 3000 },
        { id: 'CLI-0009', documento: '40128765', nombre: 'Lucía Fernández Valdivia', tipo: 'Persona', distrito: 'Cayma', direccion: 'Calle Los Cedros 245', telefono: '957 301 882', email: 'lucia.fernandez@correo.example.pe', limiteCredito: 0 },
        { id: 'CLI-0010', documento: '44587321', nombre: 'José Luis Condori Mamani', tipo: 'Persona', distrito: 'Socabaya', direccion: 'Av. Socabaya 780', telefono: '956 118 903', email: 'jose.condori@correo.example.pe', limiteCredito: 0 },
        { id: 'CLI-0011', documento: '41236987', nombre: 'Patricia Salas Ugarte', tipo: 'Persona', distrito: 'Yanahuara', direccion: 'Calle Misti 156', telefono: '955 672 410', email: 'patricia.salas@correo.example.pe', limiteCredito: 5000 },
        { id: 'CLI-0012', documento: '45870123', nombre: 'Rodrigo Medina Bellido', tipo: 'Persona', distrito: 'José Luis Bustamante y Rivero', direccion: 'Calle Alfonso Ugarte 91', telefono: '954 209 337', email: 'rodrigo.medina@correo.example.pe', limiteCredito: 0 },
        { id: 'CLI-0013', documento: '42319854', nombre: 'Ana María Quispe Huanca', tipo: 'Persona', distrito: 'Characato', direccion: 'Calle Real 33', telefono: '953 884 120', email: 'ana.quispe@correo.example.pe', limiteCredito: 0 },
        { id: 'CLI-0014', documento: '46721039', nombre: 'Fernando Cuadros Linares', tipo: 'Persona', distrito: 'Cerro Colorado', direccion: 'Asoc. Villa Hermosa Mz. C Lt. 8', telefono: '952 316 774', email: 'fernando.cuadros@correo.example.pe', limiteCredito: 0 },
        { id: 'CLI-0015', documento: '47015682', nombre: 'Gabriela Núñez Paredes', tipo: 'Persona', distrito: 'Miraflores', direccion: 'Calle Piérola 207', telefono: '951 450 628', email: 'gabriela.nunez@correo.example.pe', limiteCredito: 0 }
      ],
      vendedores: [
        { id: 'VEN-0001', nombre: 'Marisol Huamán Cutipa', dni: '42650178', sucursal: 'Tienda Cercado', comision: 3.5, metaMensual: 28000, fechaIngreso: '2023-03-06' },
        { id: 'VEN-0002', nombre: 'Diego Alarcón Ríos', dni: '45128803', sucursal: 'Tienda Yanahuara', comision: 3, metaMensual: 25000, fechaIngreso: '2024-01-15' },
        { id: 'VEN-0003', nombre: 'Karen Choque Apaza', dni: '47730915', sucursal: 'Tienda Cayma', comision: 4, metaMensual: 22000, fechaIngreso: '2022-08-22' },
        { id: 'VEN-0004', nombre: 'Óscar Linares Pinto', dni: '43391276', sucursal: 'Tienda Cercado', comision: 2.5, metaMensual: 18000, fechaIngreso: '2025-02-03' },
        { id: 'VEN-0005', nombre: 'Brenda Valdivia Mendoza', dni: '48204561', sucursal: 'Tienda Cerro Colorado', comision: 3, metaMensual: 20000, fechaIngreso: '2024-09-09' },
        { id: 'VEN-0006', nombre: 'Raúl Tapia Salazar', dni: '40872350', sucursal: 'Ventas corporativas', comision: 2, metaMensual: 60000, fechaIngreso: '2021-05-17' }
      ],
      productos: productos,
      ventas: armarVentas(),
      compras: armarCompras()
    }
  };
})();
