window.SISTEMA = {
  id: 'taller',
  nombre: 'Taller Demo · Ventas',
  rubro: 'Taller mecánico',
  version: '1.0.0',
  moneda: 'S/',
  parametros: [
    { id: 'igv', etiqueta: 'IGV', tipo: 'porcentaje', valor: 18 },
    { id: 'horaTaller', etiqueta: 'Tarifa por hora', tipo: 'moneda', valor: 45 }
  ],
  seguridad: { minClave: 6, sesionMin: 0, ayudaLogin: true, cadenaBitacora: true },
  roles: [
    { id: 'admin', nombre: 'Administrador', descripcion: 'Todo el sistema' },
    { id: 'vendedor', nombre: 'Vendedor', descripcion: 'Registra ventas' },
    { id: 'auditor', nombre: 'Auditor', descripcion: 'Solo lectura' }
  ],
  usuarios: [
    { usuario: 'admin', nombre: 'Rosa Quispe', rol: 'admin', clave: 'admin' },
    { usuario: 'ventas', nombre: 'Luis Ramos', rol: 'vendedor', clave: 'Ventas#2026x' },
    { usuario: 'auditor', nombre: 'Ana Pérez', rol: 'auditor', clave: 'Audit#2026xy' }
  ],
  entidades: [
    {
      id: 'clientes', nombre: 'Cliente', plural: 'Clientes', prefijo: 'CLI',
      campos: [
        { id: 'nombre', etiqueta: 'Nombre', tipo: 'texto', requerido: true, max: 60 },
        { id: 'dni', etiqueta: 'DNI', tipo: 'texto', requerido: true, unico: true, patron: '^[0-9]{8}$' }
      ],
      lista: ['nombre', 'dni'], buscar: ['nombre', 'dni'],
      permisos: { ver: ['admin', 'vendedor', 'auditor'], crear: ['admin', 'vendedor'], editar: ['admin'], eliminar: ['admin'] }
    },
    {
      id: 'productos', nombre: 'Producto', plural: 'Productos', prefijo: 'PRD',
      campos: [
        { id: 'codigo', etiqueta: 'Código', tipo: 'texto', requerido: true, unico: true, max: 20, patron: '^[A-Z0-9-]+$' },
        { id: 'precio', etiqueta: 'Precio', tipo: 'moneda', min: 0, requerido: true },
        { id: 'costo', etiqueta: 'Costo', tipo: 'moneda', min: 0 },
        { id: 'stock', etiqueta: 'Stock', tipo: 'entero', min: 0 },
        { id: 'categoria', etiqueta: 'Categoría', tipo: 'lista', opciones: ['Repuesto', 'Servicio'] }
      ],
      lista: ['codigo', 'precio', 'stock'], buscar: ['codigo'],
      calculados: [
        { id: 'valor', etiqueta: 'Valor en stock', tipo: 'moneda', formula: function (r, ctx) { return ctx.redondear(r.precio * r.stock); } },
        { id: 'margen', etiqueta: 'Margen %', tipo: 'porcentaje', formula: function (r, ctx) { return r.costo ? Math.round((r.precio - r.costo) / r.costo * 100) : 0; } }
      ],
      reglas: [
        { id: 'precio-coherente', mensaje: 'El precio no puede ser menor al costo', validar: function (r, ctx) { return !(r.costo && r.precio < r.costo); } }
      ],
      permisos: { ver: ['admin', 'vendedor', 'auditor'], crear: ['admin'], editar: ['admin', 'auditor'], eliminar: ['admin'] }
    }
  ],
  operaciones: [
    {
      id: 'ventas', nombre: 'Venta', plural: 'Ventas', prefijo: 'VTA', serie: 'F001',
      campos: [
        { id: 'fecha', etiqueta: 'Fecha', tipo: 'fecha', requerido: true, defecto: 'hoy' },
        { id: 'cliente', etiqueta: 'Cliente', tipo: 'ref', entidad: 'clientes', mostrar: 'nombre', requerido: true }
      ],
      estados: ['Borrador', 'Emitida', 'Anulada'],
      lineas: { entidad: 'productos', mostrar: 'codigo', precio: 'precio', campos: [ { id: 'cantidad', etiqueta: 'Cant.', tipo: 'entero', min: 1, requerido: true } ] },
      calcular: function (doc, ctx) {
        var sub = ctx.suma(doc.lineas, function (l) { return l.cantidad * l.precio; });
        var igv = ctx.redondear(sub * 0.18);
        return { subtotal: ctx.redondear(sub), igv: igv, total: ctx.redondear(sub + igv) };
      },
      totales: [ { id: 'subtotal', etiqueta: 'Subtotal' }, { id: 'igv', etiqueta: 'IGV' }, { id: 'total', etiqueta: 'Total', fuerte: true } ],
      alEmitir: function (doc, ctx) { doc.lineas.forEach(function (l) { ctx.datos.actualizar('productos', l.item, { stock: ctx.datos.obtener('productos', l.item).stock - l.cantidad }); }); },
      permisos: { ver: ['admin', 'vendedor', 'auditor'], crear: ['vendedor'], editar: ['vendedor'], emitir: ['vendedor'], anular: ['admin'] }
    }
  ],
  reportes: [
    {
      id: 'ventas-mes', titulo: 'Ventas por mes', descripcion: 'Total emitido por mes',
      roles: ['admin', 'auditor'],
      parametros: [ { id: 'desde', tipo: 'fecha', defecto: '@-180' }, { id: 'hasta', tipo: 'fecha', defecto: 'hoy' } ],
      ejecutar: function (p, ctx) { return { columnas: ['Mes', 'Total'], filas: [], tipos: ['texto', 'moneda'] }; }
    },
    {
      id: 'stock-bajo', titulo: 'Stock bajo', descripcion: 'Productos con stock menor a 5',
      ejecutar: function (p, ctx) { return { columnas: ['Código', 'Stock'], filas: ctx.datos.listar('productos', function (x) { return x.stock < 5; }).map(function (x) { return [x.codigo, x.stock]; }) }; }
    }
  ],
  tablero: [ { titulo: 'Ventas del mes', tipo: 'moneda', calcular: function (ctx) { return 0; } } ],
  semillas: { clientes: [ { id: 'CLI-0001', nombre: 'Juan Torres', dni: '12345678' } ], productos: [ { id: 'PRD-0001', codigo: 'ACE-01', precio: 120, costo: 90, stock: 8 } ] }
};
