/*
 * Hostal Plaza Mayor · Reservas y hospedaje (Cusco)
 * ----------------------------------------------------------------------------
 * Configuración del sistema de práctica «hotel». Es lo ÚNICO que cambia entre
 * sistemas: el núcleo (nucleo/js) lee este archivo y arma la aplicación.
 * Los datos son inventados (DNI, pasaportes y teléfonos de ejemplo) y no
 * corresponden a personas reales. Todo el código es ES5 (sin flechas, let,
 * const ni plantillas).
 *
 * Cómo se calcula una reserva (resumen para quien lea este archivo):
 *   - Noches = salida - entrada. Cada noche se cobra con la tarifa vigente del
 *     tipo de habitación en la temporada de esa noche (alta o baja).
 *   - Estadías largas reciben un descuento sobre el alojamiento.
 *   - Los consumos (frigobar, desayunos, tours…) son las líneas de la reserva.
 *   - El IGV se calcula con el parámetro del negocio; el alojamiento de
 *     extranjeros no domiciliados puede quedar exonerado.
 *   - Ocupación = noches vendidas / noches disponibles; ADR = ingreso por
 *     alojamiento / noches vendidas; RevPAR = ingreso por alojamiento / noches
 *     disponibles (= ADR × ocupación).
 */
(function () {
  'use strict';

  /* ---------- Ayudas locales (solo para este archivo) ---------- */

  var MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  var TIPOS_HAB = ['Simple', 'Doble', 'Matrimonial', 'Triple', 'Familiar', 'Suite'];
  var CAPACIDAD_MINIMA = { 'Simple': 1, 'Doble': 2, 'Matrimonial': 2, 'Triple': 3, 'Familiar': 4, 'Suite': 2 };

  /* '2026-06' → 'jun 2026' */
  function nombreMes(clave) {
    return MESES[parseInt(clave.slice(5, 7), 10) - 1] + ' ' + clave.slice(0, 4);
  }

  /* Cantidad de días de un mes 'AAAA-MM'. */
  function diasDelMes(clave) {
    return new Date(parseInt(clave.slice(0, 4), 10), parseInt(clave.slice(5, 7), 10), 0).getDate();
  }

  /* Las claves 'AAAA-MM' desde el mes de `desde` hasta el mes de `hasta`, en orden. */
  function mesesEntre(desde, hasta) {
    var a = parseInt(desde.slice(0, 4), 10), m = parseInt(desde.slice(5, 7), 10), fin = hasta.slice(0, 7), r = [], clave;
    while (true) {
      clave = a + '-' + (m < 10 ? '0' : '') + m;
      if (clave > fin || r.length > 120) { break; }
      r.push(clave);
      m += 1;
      if (m > 12) { m = 1; a += 1; }
    }
    return r;
  }

  /* Las últimas n claves 'AAAA-MM' hasta el mes de hoy. */
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

  /*
   * Temporada de una noche. Alta: junio a septiembre (vacaciones, Inti Raymi) y
   * las fiestas de fin de año, del 20 de diciembre al 6 de enero. El resto del año es baja.
   */
  function temporadaDe(fecha) {
    var mes = parseInt(fecha.slice(5, 7), 10), dia = parseInt(fecha.slice(8, 10), 10);
    if (mes >= 6 && mes <= 9) { return 'Alta'; }
    if (mes === 12 && dia >= 20) { return 'Alta'; }
    if (mes === 1 && dia <= 6) { return 'Alta'; }
    return 'Baja';
  }

  /* Precio de la tarifa vigente en `fecha` (la de vigencia más reciente que ya empezó). Sin tarifa → 0. */
  function precioVigente(tarifas, temporada, fecha) {
    var mejor = null, i, t;
    for (i = 0; i < tarifas.length; i++) {
      t = tarifas[i];
      if (t.temporada === temporada && t.vigenteDesde <= fecha && (!mejor || t.vigenteDesde > mejor.vigenteDesde)) { mejor = t; }
    }
    return mejor ? mejor.precio : 0;
  }

  /* Las noches de una reserva con su temporada y su tarifa: [{ fecha, temporada, tarifa }]. */
  function nochesDe(doc, ctx) {
    var hab = doc.habitacion ? ctx.datos.obtener('habitaciones', doc.habitacion) : null, n = 0, i, f, t, r = [], tarifas;
    if (doc.fecha && doc.salida) { n = ctx.diasEntre(doc.fecha, doc.salida); }
    if (n < 0) { n = 0; }
    tarifas = hab ? ctx.datos.listar('tarifas', function (x) { return x.tipoHabitacion === hab.tipo; }) : [];
    for (i = 0; i < n; i++) {
      f = ctx.fechaMas(doc.fecha, i);
      t = temporadaDe(f);
      r.push({ fecha: f, temporada: t, tarifa: precioVigente(tarifas, t, f) });
    }
    return r;
  }

  /* Porcentaje de descuento por estadía larga según el número de noches. */
  function descuentoLargaPct(noches, ctx) {
    var umbral = ctx.param('nochesEstadiaLarga');
    return umbral > 0 && noches >= umbral ? ctx.param('descEstadiaLargaPct') : 0;
  }

  /* ¿Es una reserva que ya ocupó (u ocupa) la habitación? */
  function esRealizada(d) { return d.estado === 'En casa' || d.estado === 'Finalizada'; }

  /*
   * Noches vendidas e ingreso de alojamiento (sin IGV, neto del descuento por estadía larga)
   * por mes, solo hasta hoy. Devuelve { 'AAAA-MM': { noches, ingreso } }.
   */
  function vendidoPorMes(ctx, desde, hasta) {
    var res = {}, hoy = ctx.hoy(), reservas, i, j, d, noches, pct, mes;
    reservas = ctx.datos.listar('reservas', function (x) { return esRealizada(x) && x.fecha <= hasta && x.salida > desde; });
    for (i = 0; i < reservas.length; i++) {
      d = reservas[i];
      noches = nochesDe(d, ctx);
      pct = descuentoLargaPct(noches.length, ctx);
      for (j = 0; j < noches.length; j++) {
        if (noches[j].fecha < desde || noches[j].fecha > hasta || noches[j].fecha > hoy) { continue; }
        mes = ctx.mes(noches[j].fecha);
        if (!res[mes]) { res[mes] = { noches: 0, ingreso: 0 }; }
        res[mes].noches += 1;
        res[mes].ingreso += noches[j].tarifa * (1 - pct / 100);
      }
    }
    return res;
  }

  /* Habitaciones que cuentan en el inventario (las fuera de servicio no se ofrecen). */
  function inventario(ctx) {
    return ctx.datos.listar('habitaciones', function (h) { return h.estado !== 'Fuera de servicio'; }).length;
  }

  /* Noches disponibles de un mes dentro del rango [desde, hasta], contando solo hasta hoy. */
  function diasDelMesEnRango(ctx, clave, desde, hasta) {
    var ini = clave + '-01', fin = clave + '-' + (diasDelMes(clave) < 10 ? '0' : '') + diasDelMes(clave), hoy = ctx.hoy();
    if (desde > ini) { ini = desde; }
    if (hasta < fin) { fin = hasta; }
    if (hoy < fin) { fin = hoy; }
    return fin >= ini ? ctx.diasEntre(ini, fin) + 1 : 0;
  }

  /* Tabla mensual: [{ mes, noches, disponibles, ingreso }] para los meses del rango que tienen días transcurridos. */
  function resumenMensual(ctx, desde, hasta) {
    var vendido = vendidoPorMes(ctx, desde, hasta), meses = mesesEntre(desde, hasta), inv = inventario(ctx), r = [], i, dias, v;
    for (i = 0; i < meses.length; i++) {
      dias = diasDelMesEnRango(ctx, meses[i], desde, hasta);
      if (dias <= 0) { continue; }
      v = vendido[meses[i]] || { noches: 0, ingreso: 0 };
      r.push({ mes: meses[i], noches: v.noches, disponibles: dias * inv, ingreso: ctx.redondear(v.ingreso) });
    }
    return r;
  }

  /* Cantidad de claves propias de un objeto (para contar elementos distintos). */
  function contarClaves(obj) {
    var k, n = 0;
    for (k in obj) { if (obj.hasOwnProperty(k)) { n += 1; } }
    return n;
  }

  function porcentaje(ctx, parte, total) { return total > 0 ? ctx.redondear(parte / total * 100) : 0; }

  /* Reservas En casa que duermen en la habitación esta noche (entran hoy o antes y salen después de hoy). */
  function enCasaEstaNoche(ctx) {
    var hoy = ctx.hoy();
    return ctx.datos.listar('reservas', function (d) { return d.estado === 'En casa' && d.fecha <= hoy && d.salida > hoy; });
  }

  /* ---------- Datos de demostración ---------- */

  var habitaciones = [
    { id: 'HAB-0001', numero: '101', tipo: 'Simple', piso: 1, capacidad: 1, estado: 'Operativa', limpieza: 'Limpia' },
    { id: 'HAB-0002', numero: '102', tipo: 'Simple', piso: 1, capacidad: 2, estado: 'Operativa', limpieza: 'Limpia' },
    { id: 'HAB-0003', numero: '103', tipo: 'Doble', piso: 1, capacidad: 2, estado: 'Operativa', limpieza: 'Por limpiar' },
    { id: 'HAB-0004', numero: '104', tipo: 'Doble', piso: 1, capacidad: 3, estado: 'Operativa', limpieza: 'Limpia' },
    { id: 'HAB-0005', numero: '105', tipo: 'Matrimonial', piso: 1, capacidad: 2, estado: 'Operativa', limpieza: 'Limpia' },
    { id: 'HAB-0006', numero: '106', tipo: 'Matrimonial', piso: 1, capacidad: 2, estado: 'Operativa', limpieza: 'En limpieza' },
    { id: 'HAB-0007', numero: '201', tipo: 'Triple', piso: 2, capacidad: 3, estado: 'Operativa', limpieza: 'Limpia' },
    { id: 'HAB-0008', numero: '202', tipo: 'Triple', piso: 2, capacidad: 3, estado: 'Operativa', limpieza: 'Limpia' },
    { id: 'HAB-0009', numero: '203', tipo: 'Familiar', piso: 2, capacidad: 5, estado: 'Operativa', limpieza: 'Por limpiar' },
    { id: 'HAB-0010', numero: '204', tipo: 'Familiar', piso: 2, capacidad: 4, estado: 'Operativa', limpieza: 'Limpia' },
    { id: 'HAB-0011', numero: '205', tipo: 'Matrimonial', piso: 2, capacidad: 2, estado: 'Operativa', limpieza: 'Limpia' },
    { id: 'HAB-0012', numero: '301', tipo: 'Suite', piso: 3, capacidad: 3, estado: 'Operativa', limpieza: 'Limpia' },
    { id: 'HAB-0013', numero: '302', tipo: 'Suite', piso: 3, capacidad: 4, estado: 'Operativa', limpieza: 'Limpia' },
    { id: 'HAB-0014', numero: '303', tipo: 'Doble', piso: 3, capacidad: 2, estado: 'En mantenimiento', limpieza: 'Limpia', observaciones: 'Filtración en el baño; el gasfitero vuelve la próxima semana.' }
  ];

  var huespedes = [
    { id: 'HUE-0001', nombre: 'Ricardo Salas Vega', tipoDocumento: 'DNI', documento: '41286735', nacionalidad: 'Perú', procedencia: 'Lima', telefono: '987 120 441', email: 'ricardo.salas@correo.example.pe' },
    { id: 'HUE-0002', nombre: 'María Fernanda Rojas Cueva', tipoDocumento: 'DNI', documento: '45310822', nacionalidad: 'Perú', procedencia: 'Arequipa', telefono: '958 330 217', email: 'mf.rojas@correo.example.pe' },
    { id: 'HUE-0003', nombre: 'Johannes Weber', tipoDocumento: 'Pasaporte', documento: 'C4F8821K', nacionalidad: 'Alemania', procedencia: 'Múnich', email: 'j.weber@correo.example.de', notas: 'Prefiere habitación silenciosa, lejos de la calle.' },
    { id: 'HUE-0004', nombre: 'Camila Torres Benítez', tipoDocumento: 'Pasaporte', documento: 'AAB204519', nacionalidad: 'Argentina', procedencia: 'Buenos Aires', telefono: '+54 11 5550 2210', email: 'camila.torres@correo.example.ar' },
    { id: 'HUE-0005', nombre: 'Pedro Condori Quispe', tipoDocumento: 'DNI', documento: '29674418', nacionalidad: 'Perú', procedencia: 'Puno', telefono: '951 440 876' },
    { id: 'HUE-0006', nombre: 'Sophie Martin', tipoDocumento: 'Pasaporte', documento: '19FA42087', nacionalidad: 'Francia', procedencia: 'Lyon', email: 'sophie.martin@correo.example.fr', notas: 'Vegetariana.' },
    { id: 'HUE-0007', nombre: 'Andrés Felipe Gómez Mora', tipoDocumento: 'Pasaporte', documento: 'AT903415', nacionalidad: 'Colombia', procedencia: 'Bogotá', telefono: '+57 1 555 0142' },
    { id: 'HUE-0008', nombre: 'Carla Vilca Mamani', tipoDocumento: 'DNI', documento: '70215566', nacionalidad: 'Perú', procedencia: 'Tacna', telefono: '952 118 337', email: 'carla.vilca@correo.example.pe' },
    { id: 'HUE-0009', nombre: 'Daniel Harris', tipoDocumento: 'Pasaporte', documento: '561248890', nacionalidad: 'Estados Unidos', procedencia: 'Austin', email: 'd.harris@correo.example.com', notas: 'Viaja con dos niños.' },
    { id: 'HUE-0010', nombre: 'Ana Lucía Paredes Ochoa', tipoDocumento: 'DNI', documento: '46789013', nacionalidad: 'Perú', procedencia: 'Trujillo', telefono: '944 205 118', email: 'ana.paredes@correo.example.pe' },
    { id: 'HUE-0011', nombre: 'Luis Alberto Huamaní Flores', tipoDocumento: 'DNI', documento: '31548790', nacionalidad: 'Perú', procedencia: 'Cusco', telefono: '984 770 205' },
    { id: 'HUE-0012', nombre: 'Mariana Souza Lima', tipoDocumento: 'Pasaporte', documento: 'FG771204', nacionalidad: 'Brasil', procedencia: 'São Paulo', email: 'mariana.souza@correo.example.br' },
    { id: 'HUE-0013', nombre: 'Javier Cornejo Bustamante', tipoDocumento: 'DNI', documento: '40927561', nacionalidad: 'Perú', procedencia: 'Arequipa', telefono: '959 662 340' },
    { id: 'HUE-0014', nombre: 'Elena Ruiz Sánchez', tipoDocumento: 'Pasaporte', documento: 'PAA445812', nacionalidad: 'España', procedencia: 'Madrid', email: 'elena.ruiz@correo.example.es' },
    { id: 'HUE-0015', nombre: 'Tomás Aguilar Neyra', tipoDocumento: 'DNI', documento: '72418835', nacionalidad: 'Perú', procedencia: 'Lima', telefono: '966 301 552', email: 'tomas.aguilar@correo.example.pe' },
    { id: 'HUE-0016', nombre: 'Valeria Mendoza Ccama', tipoDocumento: 'DNI', documento: '48350297', nacionalidad: 'Perú', procedencia: 'Juliaca', telefono: '953 884 019' }
  ];

  /* Más huéspedes (generados con semilla fija) para que cada persona no repita decenas de estadías. */
  function masHuespedes(cuantos) {
    var nombres = ['Luis', 'Carmen', 'José', 'Rosa', 'Miguel', 'Patricia', 'Jorge', 'Lucía', 'Víctor', 'Elena', 'Raúl', 'Silvia', 'Óscar', 'Marisol', 'Hugo', 'Paola', 'Diego', 'Karen', 'Alonso', 'Fiorella'];
    var apellidos = ['Quispe', 'Mamani', 'Flores', 'Huamán', 'Ccopa', 'Vargas', 'Rojas', 'Salazar', 'Cáceres', 'Torres', 'Delgado', 'Villanueva', 'Apaza', 'Chávez', 'Medina', 'Cutipa', 'Zegarra', 'Bellido', 'Linares', 'Ugarte'];
    var ciudades = ['Lima', 'Arequipa', 'Puno', 'Tacna', 'Trujillo', 'Cusco', 'Juliaca', 'Piura', 'Chiclayo', 'Huancayo', 'Ayacucho', 'Ica'];
    var extranjeros = [['Argentina', 'Córdoba', 'Martín'], ['Chile', 'Santiago', 'Javiera'], ['Colombia', 'Medellín', 'Santiago'], ['Brasil', 'Río de Janeiro', 'Beatriz'], ['Estados Unidos', 'Denver', 'Emily'], ['España', 'Barcelona', 'Pablo'], ['Francia', 'París', 'Camille'], ['Alemania', 'Berlín', 'Katrin'], ['Otro', 'Toronto', 'Oliver']];
    var apellidosExt = ['Moreau', 'Fischer', 'Silva', 'Miller', 'Ortega', 'Rossi', 'Costa', 'Lefevre', 'Schmidt'];
    var semilla = 4242, r = [], i, n, a, b, e, num;
    function azar() { semilla = (semilla * 16807) % 2147483647; return semilla / 2147483647; }
    for (i = 0; i < cuantos; i++) {
      n = 17 + i;
      if (azar() < 0.7) {
        a = Math.floor(azar() * nombres.length);
        b = Math.floor(azar() * apellidos.length);
        num = 30000000 + (i * 1873559 + 12345) % 40000000;
        r.push({
          id: 'HUE-00' + n, nombre: nombres[a] + ' ' + apellidos[b] + ' ' + apellidos[(b + 7) % apellidos.length], tipoDocumento: 'DNI', documento: String(num),
          nacionalidad: 'Perú', procedencia: ciudades[Math.floor(azar() * ciudades.length)], telefono: '9' + String(10000000 + (i * 7919) % 89999999).slice(0, 2) + ' ' + String(100000 + (i * 4513) % 899999).slice(0, 3) + ' ' + String(100000 + (i * 3331) % 899999).slice(0, 3)
        });
      } else {
        e = extranjeros[Math.floor(azar() * extranjeros.length)];
        b = Math.floor(azar() * apellidosExt.length);
        r.push({
          id: 'HUE-00' + n, nombre: e[2] + ' ' + apellidosExt[b], tipoDocumento: 'Pasaporte', documento: 'XP' + String(1000000 + (i * 7717) % 8999999),
          nacionalidad: e[0], procedencia: e[1]
        });
      }
    }
    return r;
  }
  huespedes = huespedes.concat(masHuespedes(44));

  var servicios = [
    { id: 'SRV-0001', codigo: 'FRI-AGU', nombre: 'Agua mineral 625 ml (frigobar)', categoria: 'Bebidas', precio: 4, controlaStock: true, stock: 120, stockMin: 30, activo: true },
    { id: 'SRV-0002', codigo: 'FRI-CER', nombre: 'Cerveza Cusqueña 330 ml (frigobar)', categoria: 'Bebidas', precio: 9, controlaStock: true, stock: 48, stockMin: 12, activo: true },
    { id: 'SRV-0003', codigo: 'FRI-SNK', nombre: 'Chocolates y snacks (frigobar)', categoria: 'Alimentos', precio: 6, controlaStock: true, stock: 60, stockMin: 15, activo: true },
    { id: 'SRV-0004', codigo: 'DES-AME', nombre: 'Desayuno americano', categoria: 'Alimentos', precio: 18, controlaStock: false, stock: 0, stockMin: 0, activo: true },
    { id: 'SRV-0005', codigo: 'DES-CON', nombre: 'Desayuno continental', categoria: 'Alimentos', precio: 15, controlaStock: false, stock: 0, stockMin: 0, activo: true },
    { id: 'SRV-0006', codigo: 'ALM-DIA', nombre: 'Almuerzo del día', categoria: 'Alimentos', precio: 28, controlaStock: false, stock: 0, stockMin: 0, activo: true },
    { id: 'SRV-0007', codigo: 'CEN-LIG', nombre: 'Cena ligera', categoria: 'Alimentos', precio: 35, controlaStock: false, stock: 0, stockMin: 0, activo: true },
    { id: 'SRV-0008', codigo: 'LAV-PRE', nombre: 'Lavandería por prenda', categoria: 'Lavandería', precio: 6, controlaStock: false, stock: 0, stockMin: 0, activo: true },
    { id: 'SRV-0009', codigo: 'PLA-PRE', nombre: 'Planchado por prenda', categoria: 'Lavandería', precio: 4, controlaStock: false, stock: 0, stockMin: 0, activo: true },
    { id: 'SRV-0010', codigo: 'TRA-AER', nombre: 'Traslado aeropuerto', categoria: 'Transporte', precio: 60, controlaStock: false, stock: 0, stockMin: 0, activo: true },
    { id: 'SRV-0011', codigo: 'TOU-VSG', nombre: 'Tour Valle Sagrado (por persona)', categoria: 'Excursiones', precio: 120, controlaStock: false, stock: 0, stockMin: 0, activo: true },
    { id: 'SRV-0012', codigo: 'CAM-EXT', nombre: 'Cama extra (por noche)', categoria: 'Otros', precio: 40, controlaStock: false, stock: 0, stockMin: 0, activo: true },
    { id: 'SRV-0013', codigo: 'LAT-OUT', nombre: 'Salida tardía hasta las 3 p. m.', categoria: 'Otros', precio: 50, controlaStock: false, stock: 0, stockMin: 0, activo: true },
    { id: 'SRV-0014', codigo: 'SIN-CON', nombre: 'Sin consumos adicionales', categoria: 'Otros', precio: 0, controlaStock: false, stock: 0, stockMin: 0, activo: true }
  ];

  /* Tarifa: [tipo, temporada, precio por noche sin IGV, vigente desde]. Las tres primeras habitaciones tuvieron un reajuste hace unos meses. */
  var TARIFAS = [
    ['Simple', 'Baja', 70, '@-300'], ['Simple', 'Alta', 95, '@-300'],
    ['Doble', 'Baja', 100, '@-300'], ['Doble', 'Alta', 140, '@-300'],
    ['Matrimonial', 'Baja', 110, '@-300'], ['Matrimonial', 'Alta', 155, '@-300'],
    ['Triple', 'Baja', 140, '@-300'], ['Triple', 'Alta', 190, '@-300'],
    ['Familiar', 'Baja', 170, '@-300'], ['Familiar', 'Alta', 230, '@-300'],
    ['Suite', 'Baja', 230, '@-300'], ['Suite', 'Alta', 320, '@-300'],
    ['Simple', 'Baja', 75, '@-110'], ['Simple', 'Alta', 100, '@-110'],
    ['Doble', 'Baja', 105, '@-110'], ['Doble', 'Alta', 150, '@-110'],
    ['Matrimonial', 'Baja', 115, '@-110'], ['Matrimonial', 'Alta', 165, '@-110']
  ];

  function armarTarifas() {
    var r = [], i, t, n;
    for (i = 0; i < TARIFAS.length; i++) {
      t = TARIFAS[i];
      n = i + 1;
      r.push({ id: 'TAR-' + (n < 10 ? '000' : '00') + n, tipoHabitacion: t[0], temporada: t[1], precio: t[2], vigenteDesde: t[3] });
    }
    return r;
  }

  /*
   * Fila de reserva: [días desde la entrada hasta hoy (negativo = futura), noches, habitación n.º, huésped n.º,
   * personas, canal, adelanto, estado (F finalizada, C en casa, R reservada, X cancelada), [[servicio n.º, cantidad]]]
   * Estas son las estadías de los últimos días y las futuras, escritas a mano para que el tablero tenga llegadas,
   * salidas y huéspedes en casa. El historial de los meses anteriores lo genera historicas() más abajo.
   */
  var RECIENTES = [
    [10, 2, 1, 2, 1, 'Directo', 0, 'X', [[14, 1]]],
    [6, 4, 2, 7, 2, 'Booking', 0, 'F', [[2, 3], [4, 4]]], [1, 3, 2, 10, 2, 'Directo', 0, 'C', [[4, 3]]], [-5, 2, 2, 9, 2, 'Directo', 100, 'R', []],
    [3, 3, 3, 14, 2, 'Booking', 0, 'C', [[4, 3], [1, 2], [8, 2]]],
    [15, 3, 4, 2, 2, 'WhatsApp', 0, 'F', [[4, 3]]], [1, 4, 4, 15, 3, 'Directo', 0, 'C', [[5, 4]]], [-3, 2, 4, 11, 2, 'Teléfono', 60, 'R', []],
    [0, 2, 5, 4, 2, 'Booking', 0, 'C', [[1, 2], [4, 2]]],
    [-1, 3, 6, 3, 2, 'Directo', 90, 'R', []],
    [1, 3, 7, 6, 3, 'Booking', 0, 'C', [[4, 3], [12, 3]]],
    [12, 2, 8, 13, 3, 'Teléfono', 0, 'F', [[8, 4]]], [2, 4, 8, 1, 3, 'Directo', 0, 'C', [[5, 4], [6, 2]]], [-7, 3, 8, 4, 3, 'Booking', 150, 'R', []],
    [9, 4, 9, 8, 4, 'WhatsApp', 0, 'F', [[4, 8], [2, 5]]], [3, 5, 9, 12, 5, 'Agencia', 200, 'C', [[10, 1], [4, 5]]],
    [-2, 4, 10, 9, 4, 'Agencia', 250, 'R', []],
    [4, 5, 11, 7, 2, 'Booking', 0, 'C', [[4, 5], [8, 3], [1, 4]]],
    [5, 6, 12, 9, 3, 'Booking', 200, 'C', [[4, 6], [2, 6], [6, 3]]],
    [8, 3, 13, 5, 4, 'Teléfono', 0, 'F', [[4, 3], [7, 3]]], [0, 2, 13, 16, 4, 'WhatsApp', 100, 'R', [[10, 1]]], [-10, 4, 13, 7, 4, 'Booking', 0, 'R', []]
  ];

  /* Capacidad de cada habitación (para no sembrar más personas de las que caben). */
  var CAPACIDADES = [1, 2, 2, 3, 2, 2, 3, 3, 5, 4, 2, 3, 4, 2];

  /*
   * Historial de estadías finalizadas de los últimos seis meses, con un generador pseudoaleatorio de semilla fija
   * (siempre produce lo mismo). Cada habitación se llena por tramos de 30 días con una ocupación distinta
   * (más alta en la temporada alta) y sin cruzarse con otras estadías de la misma habitación.
   */
  var PESO_LLEGADA = [0.2, 0.35, 0.42, 0.38, 0.3, 0.15];

  function historicas() {
    var filas = [], semilla = 20261031, ocupado = [], hab, e, n, r, i, q, libre, pers, canal, adel, ls, k, srv, cant, hue, estado, x, usados, cap;
    function azar() { semilla = (semilla * 16807) % 2147483647; return semilla / 2147483647; }
    for (hab = 1; hab <= 14; hab++) { ocupado[hab] = []; }
    for (i = 0; i < RECIENTES.length; i++) {
      if (RECIENTES[i][7] !== 'X') { ocupado[RECIENTES[i][2]].push([-RECIENTES[i][0], -RECIENTES[i][0] + RECIENTES[i][1]]); }
    }
    for (hab = 1; hab <= 14; hab++) {
      e = -180;
      while (e < 0) {
        q = PESO_LLEGADA[Math.min(5, Math.floor(-e / 30))] * (hab === 14 ? 0.5 : 1);
        if (hab === 14 && e > -40) { e += 1; continue; }
        if (azar() >= q) { e += 1; continue; }
        r = azar();
        n = r < 0.15 ? 1 : (r < 0.45 ? 2 : (r < 0.75 ? 3 : (r < 0.88 ? 4 : (r < 0.95 ? 5 : (r < 0.985 ? 7 : 8)))));
        estado = azar() < 0.05 ? 'X' : 'F';
        libre = e + n <= 0;
        for (k = 0; k < ocupado[hab].length && libre; k++) { if (e < ocupado[hab][k][1] && ocupado[hab][k][0] < e + n) { libre = false; } }
        if (!libre) { e += 1; continue; }
        if (estado === 'F') { ocupado[hab].push([e, e + n]); }
        cap = CAPACIDADES[hab - 1];
        pers = Math.min(cap, 1 + Math.floor(azar() * 3));
        x = azar();
        canal = x < 0.3 ? 'Directo' : (x < 0.6 ? 'Booking' : (x < 0.75 ? 'WhatsApp' : (x < 0.85 ? 'Teléfono' : 'Agencia')));
        adel = n >= 3 && azar() < 0.25 ? (azar() < 0.5 ? 50 : 100) : 0;
        hue = 1 + Math.floor(azar() * 60);
        ls = [];
        usados = {};
        k = Math.floor(azar() * 4);
        while (k > 0) {
          srv = 1 + Math.floor(azar() * 13);
          if (!usados[srv]) {
            usados[srv] = true;
            cant = srv <= 3 ? 1 + Math.floor(azar() * 4) : (srv === 12 ? n : (srv === 10 || srv === 13 ? 1 : (srv === 8 || srv === 9 ? 2 + Math.floor(azar() * 5) : (srv === 11 ? pers : pers * Math.min(n, 3)))));
            ls.push([srv, cant]);
          }
          k -= 1;
        }
        if (!ls.length) { ls.push([14, 1]); }
        filas.push([-e, n, hab, hue, pers, canal, adel, estado, ls]);
        e += n;
      }
    }
    return filas;
  }

  var RESERVAS = RECIENTES.concat(historicas());

  var ESTADO_RES = { F: 'Finalizada', C: 'En casa', R: 'Reservada', X: 'Cancelada' };

  function idCorto(prefijo, n) { return prefijo + '-' + (n < 10 ? '000' : '00') + n; }

  function armarReservas() {
    var r = [], i, f, ls, j, s, fecha, salida, orden = RESERVAS.slice(0);
    for (i = 0; i < orden.length; i++) {
      f = orden[i];
      ls = [];
      for (j = 0; j < f[8].length; j++) {
        s = servicios[f[8][j][0] - 1];
        ls.push({ item: s.id, cantidad: f[8][j][1], precio: s.precio });
      }
      fecha = f[0] === 0 ? 'hoy' : (f[0] > 0 ? '@-' + f[0] : '@' + (-f[0]));
      salida = f[0] - f[1] === 0 ? 'hoy' : (f[0] - f[1] > 0 ? '@-' + (f[0] - f[1]) : '@' + (f[1] - f[0]));
      r.push({
        id: idCorto('RSV', i + 1), fecha: fecha, salida: salida, habitacion: idCorto('HAB', f[2]), huesped: idCorto('HUE', f[3]),
        personas: f[4], canal: f[5], adelanto: f[6], estado: ESTADO_RES[f[7]], lineas: ls
      });
    }
    return r;
  }

  /* ---------- Configuración del sistema ---------- */

  window.SISTEMA = {
    id: 'hotel',
    nombre: 'Hostal Plaza Mayor · Reservas',
    rubro: 'Hospedaje (Cusco)',
    version: '1.0.0',
    moneda: 'S/',
    tema: { primario: '#0f5c63', acento: '#f2b134', siglas: 'PM' },

    parametros: [
      { id: 'igv', etiqueta: 'IGV', tipo: 'porcentaje', valor: 18, ayuda: 'Impuesto General a las Ventas que se suma al alojamiento y a los consumos.' },
      { id: 'exoneraExtranjeros', etiqueta: 'Exonerar alojamiento a extranjeros', tipo: 'entero', valor: 1, ayuda: '1 = el alojamiento de huéspedes extranjeros no domiciliados no paga IGV (los consumos sí); 0 = se cobra siempre.' },
      { id: 'diasExoneracionMax', etiqueta: 'Noches máximas con exoneración', tipo: 'entero', valor: 60, ayuda: 'Pasadas estas noches de permanencia, la exoneración ya no se aplica.' },
      { id: 'nochesEstadiaLarga', etiqueta: 'Noches para estadía larga', tipo: 'entero', valor: 7, ayuda: 'Desde este número de noches se aplica el descuento por estadía larga (0 = nunca).' },
      { id: 'descEstadiaLargaPct', etiqueta: 'Descuento por estadía larga', tipo: 'porcentaje', valor: 10, ayuda: 'Porcentaje que se descuenta del alojamiento de las estadías largas.' },
      { id: 'nochesMax', etiqueta: 'Noches máximas por reserva', tipo: 'entero', valor: 30, ayuda: 'Una reserva no puede pasar de este número de noches.' }
    ],

    seguridad: {
      minClave: 10,
      intentosMax: 5,
      bloqueoMin: 5,
      sesionMin: 15,
      cadenaBitacora: false,
      confirmarEliminar: true,
      exigirCambioClave: true,
      ayudaLogin: true,
      exportaRespetaPermisos: true,
      cspMeta: true
    },

    roles: [
      { id: 'admin', nombre: 'Administrador', descripcion: 'Acceso total: mantenimientos, reservas, usuarios, bitácora, respaldo y parámetros.' },
      { id: 'gerente', nombre: 'Gerente del hostal', descripcion: 'Fija tarifas y servicios, administra habitaciones y reservas y ve todos los reportes. No gestiona usuarios.' },
      { id: 'recepcion', nombre: 'Recepcionista', descripcion: 'Registra huéspedes, crea y confirma reservas (check-in), las cancela y consulta ocupación. No cambia tarifas ni ve ingresos.' },
      { id: 'housekeeping', nombre: 'Ama de llaves', descripcion: 'Ve las habitaciones y marca su estado de limpieza o mantenimiento. No ve huéspedes, reservas ni precios.' },
      { id: 'contabilidad', nombre: 'Contabilidad', descripcion: 'Consulta reservas, huéspedes, tarifas e ingresos para facturar y conciliar. No crea ni modifica nada.' },
      { id: 'auditor', nombre: 'Auditor', descripcion: 'Solo lectura de todo el negocio y de la bitácora. No crea ni modifica nada.' }
    ],

    usuarios: [
      { usuario: 'admin', nombre: 'Marco Quispe Huamán', rol: 'admin', clave: 'Admin#2026x' },
      { usuario: 'gerente', nombre: 'Lucía Paredes Salas', rol: 'gerente', clave: 'Gerente#2026x' },
      { usuario: 'recepcion', nombre: 'Carlos Ccori Mamani', rol: 'recepcion', clave: 'Recep#2026x' },
      { usuario: 'housekeeping', nombre: 'Rosa Apaza Condori', rol: 'housekeeping', clave: 'Limpia#2026x' },
      { usuario: 'contabilidad', nombre: 'Jorge Valdivia Ríos', rol: 'contabilidad', clave: 'Conta#2026x' },
      { usuario: 'auditor', nombre: 'Elena Zegarra Núñez', rol: 'auditor', clave: 'Audita#2026x' }
    ],

    /* ------------------------------ Entidades ------------------------------ */
    entidades: [
      {
        id: 'habitaciones', nombre: 'Habitación', plural: 'Habitaciones', prefijo: 'HAB',
        campos: [
          { id: 'numero', etiqueta: 'Número', tipo: 'texto', requerido: true, unico: true, max: 6, ayuda: 'Como figura en la puerta, por ejemplo 101 o 204.' },
          { id: 'tipo', etiqueta: 'Tipo de habitación', tipo: 'lista', requerido: true, opciones: TIPOS_HAB },
          { id: 'piso', etiqueta: 'Piso', tipo: 'entero', min: 1, max: 4, requerido: true, defecto: 1 },
          { id: 'capacidad', etiqueta: 'Capacidad (personas)', tipo: 'entero', min: 1, max: 8, requerido: true, defecto: 2 },
          { id: 'estado', etiqueta: 'Estado de la habitación', tipo: 'lista', requerido: true, opciones: ['Operativa', 'En mantenimiento', 'Fuera de servicio'], defecto: 'Operativa', ayuda: 'Solo las habitaciones operativas se pueden reservar.' },
          { id: 'limpieza', etiqueta: 'Limpieza', tipo: 'lista', requerido: true, opciones: ['Limpia', 'Por limpiar', 'En limpieza'], defecto: 'Limpia' },
          { id: 'observaciones', etiqueta: 'Observaciones', tipo: 'textarea', max: 200 }
        ],
        lista: ['numero', 'tipo', 'piso', 'capacidad', 'estado', 'limpieza', 'situacion'],
        buscar: ['numero', 'tipo', 'estado'],
        calculados: [
          {
            id: 'situacion', etiqueta: 'Situación hoy', tipo: 'texto',
            formula: function (r, ctx) {
              var hoy = ctx.hoy(), en;
              if (r.estado !== 'Operativa') { return r.estado; }
              en = ctx.datos.listar('reservas', function (d) { return d.habitacion === r.id && d.estado === 'En casa' && d.fecha <= hoy && d.salida >= hoy; });
              if (!en.length) { return 'Libre'; }
              return en[0].salida === hoy ? 'Sale hoy' : 'Ocupada';
            }
          }
        ],
        reglas: [
          {
            id: 'capacidad-por-tipo', mensaje: 'La capacidad es menor a la mínima para ese tipo de habitación (Doble y Matrimonial 2, Triple 3, Familiar 4).',
            validar: function (r) { return !r.tipo || !r.capacidad || r.capacidad >= (CAPACIDAD_MINIMA[r.tipo] || 1); }
          }
        ],
        permisos: { ver: ['admin', 'gerente', 'recepcion', 'housekeeping', 'auditor'], crear: ['admin', 'gerente'], editar: ['admin', 'gerente', 'housekeeping'], eliminar: ['admin'] }
      },
      {
        id: 'huespedes', nombre: 'Huésped', plural: 'Huéspedes', prefijo: 'HUE',
        campos: [
          { id: 'nombre', etiqueta: 'Nombre completo', tipo: 'texto', requerido: true, max: 80 },
          { id: 'tipoDocumento', etiqueta: 'Tipo de documento', tipo: 'lista', requerido: true, opciones: ['DNI', 'Pasaporte', 'Carné de extranjería'], defecto: 'DNI' },
          { id: 'documento', etiqueta: 'N.º de documento', tipo: 'texto', requerido: true, unico: true, max: 12, patron: '^[A-Za-z0-9]{6,12}$', mensajePatron: 'Usa de 6 a 12 letras o números, sin espacios ni guiones.' },
          { id: 'nacionalidad', etiqueta: 'Nacionalidad', tipo: 'lista', requerido: true, opciones: ['Perú', 'Argentina', 'Chile', 'Colombia', 'Brasil', 'Estados Unidos', 'España', 'Francia', 'Alemania', 'Otro'], defecto: 'Perú' },
          { id: 'procedencia', etiqueta: 'Procedencia (ciudad)', tipo: 'texto', requerido: true, max: 40, ayuda: 'Ciudad desde la que viaja; alimenta el reporte de procedencia.' },
          { id: 'telefono', etiqueta: 'Teléfono', tipo: 'telefono', ver: ['admin', 'gerente', 'recepcion'] },
          { id: 'email', etiqueta: 'Correo electrónico', tipo: 'email', max: 80, ver: ['admin', 'gerente', 'recepcion'] },
          { id: 'notas', etiqueta: 'Preferencias y notas', tipo: 'textarea', max: 200, ver: ['admin', 'gerente', 'recepcion'] }
        ],
        lista: ['nombre', 'tipoDocumento', 'documento', 'nacionalidad', 'procedencia', 'estadias'],
        buscar: ['nombre', 'documento', 'procedencia', 'nacionalidad'],
        calculados: [
          {
            id: 'estadias', etiqueta: 'Estadías', tipo: 'entero',
            formula: function (r, ctx) { return ctx.datos.listar('reservas', function (d) { return d.huesped === r.id && esRealizada(d); }).length; }
          }
        ],
        reglas: [
          {
            id: 'dni-8-digitos', mensaje: 'Un DNI tiene exactamente 8 dígitos.',
            validar: function (r) { return r.tipoDocumento !== 'DNI' || /^[0-9]{8}$/.test(r.documento || ''); }
          }
        ],
        permisos: { ver: ['admin', 'gerente', 'recepcion', 'contabilidad', 'auditor'], crear: ['admin', 'gerente', 'recepcion'], editar: ['admin', 'gerente', 'recepcion'], eliminar: ['admin'] }
      },
      {
        id: 'servicios', nombre: 'Servicio', plural: 'Servicios y consumos', prefijo: 'SRV',
        campos: [
          { id: 'codigo', etiqueta: 'Código', tipo: 'texto', requerido: true, unico: true, max: 12, patron: '^[A-Z0-9-]+$', mensajePatron: 'Usa solo mayúsculas, números y guiones.' },
          { id: 'nombre', etiqueta: 'Nombre del servicio', tipo: 'texto', requerido: true, max: 60 },
          { id: 'categoria', etiqueta: 'Categoría', tipo: 'lista', requerido: true, opciones: ['Alimentos', 'Bebidas', 'Lavandería', 'Transporte', 'Excursiones', 'Otros'], defecto: 'Otros' },
          { id: 'precio', etiqueta: 'Precio (sin IGV)', tipo: 'moneda', min: 0, requerido: true },
          { id: 'controlaStock', etiqueta: 'Controla stock', tipo: 'booleano', defecto: false, ayuda: 'Actívalo para el frigobar: cada consumo descuenta del stock al hacer el check-in.' },
          { id: 'stock', etiqueta: 'Stock actual', tipo: 'entero', min: 0, defecto: 0 },
          { id: 'stockMin', etiqueta: 'Stock mínimo', tipo: 'entero', min: 0, defecto: 0 },
          { id: 'activo', etiqueta: 'Servicio activo', tipo: 'booleano', defecto: true }
        ],
        lista: ['codigo', 'nombre', 'categoria', 'precio', 'stock', 'situacion'],
        buscar: ['codigo', 'nombre', 'categoria'],
        calculados: [
          {
            id: 'situacion', etiqueta: 'Situación', tipo: 'texto',
            formula: function (r) {
              if (!r.controlaStock) { return 'Sin control'; }
              return r.stock <= 0 ? 'Agotado' : (r.stock <= r.stockMin ? 'Stock bajo' : 'Normal');
            }
          }
        ],
        reglas: [
          {
            id: 'precio-con-stock', mensaje: 'Un servicio con control de stock debe tener un precio mayor a cero.',
            validar: function (r) { return !r.controlaStock || r.precio > 0; }
          }
        ],
        permisos: { ver: ['admin', 'gerente', 'recepcion', 'housekeeping', 'contabilidad', 'auditor'], crear: ['admin', 'gerente'], editar: ['admin', 'gerente'], eliminar: ['admin'] }
      },
      {
        id: 'tarifas', nombre: 'Tarifa', plural: 'Tarifas por temporada', prefijo: 'TAR',
        campos: [
          { id: 'tipoHabitacion', etiqueta: 'Tipo de habitación', tipo: 'lista', requerido: true, opciones: TIPOS_HAB },
          { id: 'temporada', etiqueta: 'Temporada', tipo: 'lista', requerido: true, opciones: ['Baja', 'Alta'] },
          { id: 'precio', etiqueta: 'Precio por noche (sin IGV)', tipo: 'moneda', min: 20, max: 2000, requerido: true },
          { id: 'vigenteDesde', etiqueta: 'Vigente desde', tipo: 'fecha', requerido: true, defecto: 'hoy', ayuda: 'Cada noche se cobra con la tarifa más reciente que ya estaba vigente ese día.' }
        ],
        lista: ['tipoHabitacion', 'temporada', 'precio', 'vigenteDesde', 'vigente'],
        buscar: ['tipoHabitacion', 'temporada'],
        calculados: [
          {
            id: 'vigente', etiqueta: '¿Vigente hoy?', tipo: 'texto',
            formula: function (r, ctx) {
              var hoy = ctx.hoy(), otras;
              if (r.vigenteDesde > hoy) { return 'Futura'; }
              otras = ctx.datos.listar('tarifas', function (t) { return t.id !== r.id && t.tipoHabitacion === r.tipoHabitacion && t.temporada === r.temporada && t.vigenteDesde <= hoy && t.vigenteDesde > r.vigenteDesde; });
              return otras.length ? 'Reemplazada' : 'Sí';
            }
          }
        ],
        reglas: [
          {
            id: 'tarifa-unica', mensaje: 'Ya existe una tarifa para ese tipo, temporada y fecha de vigencia.',
            validar: function (r, ctx) {
              return ctx.datos.listar('tarifas', function (t) {
                return t.id !== r.id && t.tipoHabitacion === r.tipoHabitacion && t.temporada === r.temporada && t.vigenteDesde === r.vigenteDesde;
              }).length === 0;
            }
          }
        ],
        permisos: { ver: ['admin', 'gerente', 'recepcion', 'contabilidad', 'auditor'], crear: ['admin', 'gerente'], editar: ['admin', 'gerente'], eliminar: ['admin'] }
      }
    ],

    /* ------------------------------ Operaciones ------------------------------ */
    operaciones: [
      {
        id: 'reservas', nombre: 'Reserva', plural: 'Reservas', prefijo: 'RSV', serie: 'RS01',
        campos: [
          { id: 'fecha', etiqueta: 'Entrada (check-in)', tipo: 'fecha', requerido: true, defecto: 'hoy' },
          { id: 'salida', etiqueta: 'Salida (check-out)', tipo: 'fecha', requerido: true, defecto: '@1' },
          { id: 'habitacion', etiqueta: 'Habitación', tipo: 'ref', entidad: 'habitaciones', mostrar: 'numero', requerido: true },
          { id: 'huesped', etiqueta: 'Huésped', tipo: 'ref', entidad: 'huespedes', mostrar: 'nombre', requerido: true },
          { id: 'personas', etiqueta: 'Personas', tipo: 'entero', min: 1, max: 8, requerido: true, defecto: 1 },
          { id: 'canal', etiqueta: 'Canal de reserva', tipo: 'lista', requerido: true, opciones: ['Directo', 'Teléfono', 'WhatsApp', 'Booking', 'Agencia'], defecto: 'Directo' },
          { id: 'adelanto', etiqueta: 'Adelanto recibido', tipo: 'moneda', min: 0, defecto: 0, ayuda: 'Se descuenta del saldo por cobrar.' },
          { id: 'observaciones', etiqueta: 'Observaciones', tipo: 'textarea', max: 300 }
        ],
        lista: ['fecha', 'salida', 'habitacion', 'huesped'],
        /* Reservada = borrador · En casa = check-in hecho (se «emite») · Finalizada = check-out · Cancelada = anulada */
        estados: ['Reservada', 'En casa', 'Finalizada', 'Cancelada'],
        lineas: {
          entidad: 'servicios', mostrar: 'nombre', precio: 'precio',
          campos: [{ id: 'cantidad', etiqueta: 'Cant.', tipo: 'entero', min: 1, requerido: true, defecto: 1 }],
          importe: function (l) { return l.cantidad * l.precio; },
          info: function (item) {
            return item.controlaStock ? 'Stock disponible: ' + item.stock + ' · Precio: S/ ' + item.precio.toFixed(2) : 'Precio: S/ ' + item.precio.toFixed(2);
          }
        },
        calcular: function (doc, ctx) {
          var noches = nochesDe(doc, ctx), n = noches.length, bruto = 0, i, pct, descuento, alojamiento, consumos, hue, exonera, baseIgv, igv, subtotal, total;
          for (i = 0; i < n; i++) { bruto += noches[i].tarifa; }
          bruto = ctx.redondear(bruto);
          pct = descuentoLargaPct(n, ctx);
          descuento = ctx.redondear(bruto * pct / 100);
          alojamiento = ctx.redondear(bruto - descuento);
          consumos = ctx.redondear(ctx.suma(doc.lineas, function (l) { return l.cantidad * l.precio; }));
          hue = doc.huesped ? ctx.datos.obtener('huespedes', doc.huesped) : null;
          exonera = ctx.param('exoneraExtranjeros') >= 1 && !!hue && !!hue.nacionalidad && hue.nacionalidad !== 'Perú' && n <= ctx.param('diasExoneracionMax');
          baseIgv = (exonera ? 0 : alojamiento) + consumos;
          igv = ctx.redondear(baseIgv * ctx.param('igv') / 100);
          subtotal = ctx.redondear(alojamiento + consumos);
          total = ctx.redondear(subtotal + igv);
          return { noches: n, alojamiento: alojamiento, descuento: descuento, consumos: consumos, subtotal: subtotal, igv: igv, total: total, saldo: ctx.redondear(total - (doc.adelanto || 0)) };
        },
        totales: [
          { id: 'noches', etiqueta: 'Noches', tipo: 'entero' },
          { id: 'alojamiento', etiqueta: 'Alojamiento (con descuento)' },
          { id: 'descuento', etiqueta: 'Descuento por estadía larga' },
          { id: 'consumos', etiqueta: 'Consumos' },
          { id: 'igv', etiqueta: 'IGV' },
          { id: 'total', etiqueta: 'Total de la estadía', fuerte: true },
          { id: 'saldo', etiqueta: 'Saldo por cobrar (total - adelanto)' }
        ],
        reglas: [
          {
            id: 'salida-posterior', mensaje: 'La salida debe ser posterior a la entrada (mínimo una noche).',
            validar: function (d) { return !d.fecha || !d.salida || d.salida > d.fecha; }
          },
          {
            id: 'estadia-maxima', mensaje: 'La estadía supera el máximo de noches por reserva (revisa el parámetro de noches máximas).',
            validar: function (d, ctx) { return !d.fecha || !d.salida || ctx.diasEntre(d.fecha, d.salida) <= ctx.param('nochesMax'); }
          },
          {
            id: 'habitacion-operativa', mensaje: 'La habitación no está operativa (mantenimiento o fuera de servicio).',
            validar: function (d, ctx) {
              var h = d.habitacion ? ctx.datos.obtener('habitaciones', d.habitacion) : null;
              return !h || h.estado === 'Operativa';
            }
          },
          {
            id: 'capacidad-habitacion', mensaje: 'Hay más personas que la capacidad de la habitación.',
            validar: function (d, ctx) {
              var h = d.habitacion ? ctx.datos.obtener('habitaciones', d.habitacion) : null;
              return !h || !d.personas || d.personas <= h.capacidad;
            }
          },
          {
            id: 'sin-cruce', mensaje: 'La habitación ya está reservada o en uso en esas fechas. Elige otra habitación u otras fechas.',
            validar: function (d, ctx) {
              if (!d.habitacion || !d.fecha || !d.salida) { return true; }
              return ctx.datos.listar('reservas', function (x) {
                return x.id !== d.id && x.habitacion === d.habitacion && x.estado !== 'Cancelada' && x.fecha < d.salida && d.fecha < x.salida;
              }).length === 0;
            }
          },
          {
            id: 'hay-tarifa', mensaje: 'No hay una tarifa vigente para ese tipo de habitación en la fecha de entrada. Pide a gerencia que la registre.',
            validar: function (d, ctx) {
              var noches;
              if (!d.habitacion || !d.fecha || !d.salida || d.salida <= d.fecha) { return true; }
              noches = nochesDe(d, ctx);
              return noches.length === 0 || noches[0].tarifa > 0;
            }
          }
        ],
        /* Check-in: valida la fecha y descuenta del stock los consumos de frigobar. */
        alEmitir: function (doc, ctx) {
          var i, l, s;
          if (doc.fecha > ctx.hoy()) { throw new Error('Todavía no es la fecha de entrada (' + ctx.fmt.fecha(doc.fecha) + '): el check-in no se puede adelantar.'); }
          if (doc.salida <= ctx.hoy()) { throw new Error('La fecha de salida ya pasó: corrige las fechas antes del check-in.'); }
          for (i = 0; i < doc.lineas.length; i++) {
            l = doc.lineas[i];
            s = ctx.datos.obtener('servicios', l.item);
            if (s.controlaStock && s.stock < l.cantidad) { throw new Error('Stock insuficiente de «' + s.nombre + '»: hay ' + s.stock + ' y se piden ' + l.cantidad + '.'); }
          }
          for (i = 0; i < doc.lineas.length; i++) {
            l = doc.lineas[i];
            s = ctx.datos.obtener('servicios', l.item);
            if (s.controlaStock) { ctx.datos.actualizar('servicios', l.item, { stock: s.stock - l.cantidad }); }
          }
        },
        /* Cancelación: lo no consumido vuelve al frigobar. */
        alAnular: function (doc, ctx) {
          var i, l, s;
          for (i = 0; i < doc.lineas.length; i++) {
            l = doc.lineas[i];
            s = ctx.datos.obtener('servicios', l.item);
            if (s.controlaStock) { ctx.datos.actualizar('servicios', l.item, { stock: s.stock + l.cantidad }); }
          }
        },
        permisos: {
          ver: ['admin', 'gerente', 'recepcion', 'contabilidad', 'auditor'], crear: ['admin', 'gerente', 'recepcion'], editar: ['admin', 'gerente', 'recepcion'],
          emitir: ['admin', 'gerente', 'recepcion'], anular: ['admin', 'gerente', 'recepcion'], eliminar: ['admin', 'gerente', 'recepcion']
        }
      }
    ],

    /* ------------------------------ Reportes ------------------------------ */
    reportes: [
      {
        id: 'ocupacion-mes', titulo: 'Ocupación por mes',
        descripcion: 'Noches vendidas frente a noches disponibles de cada mes. Cuenta solo estadías en casa o finalizadas y solo hasta hoy; las habitaciones fuera de servicio no cuentan como disponibles.',
        roles: ['admin', 'gerente', 'recepcion', 'auditor'],
        parametros: [
          { id: 'desde', etiqueta: 'Desde', tipo: 'fecha', requerido: true, defecto: '@-180' },
          { id: 'hasta', etiqueta: 'Hasta', tipo: 'fecha', requerido: true, defecto: 'hoy' }
        ],
        ejecutar: function (p, ctx) {
          var meses = resumenMensual(ctx, p.desde, p.hasta), filas = [], etiquetas = [], valores = [], i, m, vend = 0, disp = 0, pct;
          for (i = 0; i < meses.length; i++) { vend += meses[i].noches; }
          if (vend > 0) {
            for (i = 0; i < meses.length; i++) {
              m = meses[i];
              pct = porcentaje(ctx, m.noches, m.disponibles);
              filas.push([nombreMes(m.mes), m.noches, m.disponibles, pct]);
              etiquetas.push(nombreMes(m.mes));
              valores.push(pct);
              disp += m.disponibles;
            }
          }
          return {
            columnas: ['Mes', 'Noches vendidas', 'Noches disponibles', 'Ocupación %'], tipos: ['texto', 'entero', 'entero', 'porcentaje'], filas: filas,
            grafico: { tipo: 'columnas', etiquetas: etiquetas, valores: valores, formato: 'porcentaje' },
            resumen: [
              { etiqueta: 'Ocupación del periodo', valor: porcentaje(ctx, vend, disp), tipo: 'porcentaje' },
              { etiqueta: 'Noches vendidas', valor: vend, tipo: 'entero' },
              { etiqueta: 'Habitaciones en inventario', valor: inventario(ctx), tipo: 'entero' }
            ]
          };
        }
      },
      {
        id: 'ingresos-tipo', titulo: 'Ingresos por tipo de habitación',
        descripcion: 'Alojamiento y consumos (sin IGV) de las estadías con entrada en el periodo, agrupados por tipo de habitación. Las canceladas y las reservas sin check-in no cuentan.',
        roles: ['admin', 'gerente', 'contabilidad', 'auditor'],
        parametros: [
          { id: 'desde', etiqueta: 'Desde', tipo: 'fecha', requerido: true, defecto: '@-180' },
          { id: 'hasta', etiqueta: 'Hasta', tipo: 'fecha', requerido: true, defecto: 'hoy' }
        ],
        ejecutar: function (p, ctx) {
          var reservas = ctx.datos.listar('reservas', function (d) { return esRealizada(d) && d.fecha >= p.desde && d.fecha <= p.hasta; }), porTipo = {}, i, d, h, t, filas = [], etiquetas = [], valores = [], totalAloj = 0, totalCons = 0, totalNoches = 0;
          for (i = 0; i < reservas.length; i++) {
            d = reservas[i];
            h = ctx.datos.obtener('habitaciones', d.habitacion);
            t = h ? h.tipo : 'Sin habitación';
            if (!porTipo[t]) { porTipo[t] = { reservas: 0, noches: 0, aloj: 0, cons: 0 }; }
            porTipo[t].reservas += 1;
            porTipo[t].noches += d.totales.noches;
            porTipo[t].aloj += d.totales.alojamiento;
            porTipo[t].cons += d.totales.consumos;
          }
          for (i = 0; i < TIPOS_HAB.length; i++) {
            t = TIPOS_HAB[i];
            if (!porTipo[t]) { continue; }
            filas.push([t, porTipo[t].reservas, porTipo[t].noches, ctx.redondear(porTipo[t].aloj), ctx.redondear(porTipo[t].cons), ctx.redondear(porTipo[t].aloj + porTipo[t].cons)]);
            etiquetas.push(t);
            valores.push(ctx.redondear(porTipo[t].aloj + porTipo[t].cons));
            totalAloj += porTipo[t].aloj;
            totalCons += porTipo[t].cons;
            totalNoches += porTipo[t].noches;
          }
          return {
            columnas: ['Tipo de habitación', 'Estadías', 'Noches', 'Alojamiento', 'Consumos', 'Total sin IGV'], tipos: ['texto', 'entero', 'entero', 'moneda', 'moneda', 'moneda'], filas: filas,
            grafico: { tipo: 'barras', etiquetas: etiquetas, valores: valores, formato: 'moneda' },
            resumen: [
              { etiqueta: 'Ingreso total (sin IGV)', valor: ctx.redondear(totalAloj + totalCons), tipo: 'moneda' },
              { etiqueta: 'Por alojamiento', valor: ctx.redondear(totalAloj), tipo: 'moneda' },
              { etiqueta: 'Por consumos', valor: ctx.redondear(totalCons), tipo: 'moneda' },
              { etiqueta: 'Noches', valor: totalNoches, tipo: 'entero' }
            ]
          };
        }
      },
      {
        id: 'adr-revpar', titulo: 'ADR y RevPAR por mes',
        descripcion: 'ADR = ingreso por alojamiento ÷ noches vendidas (precio medio por habitación vendida). RevPAR = ingreso por alojamiento ÷ noches disponibles (ingreso por habitación disponible). Sin IGV y neto del descuento por estadía larga.',
        roles: ['admin', 'gerente', 'auditor'],
        parametros: [
          { id: 'desde', etiqueta: 'Desde', tipo: 'fecha', requerido: true, defecto: '@-180' },
          { id: 'hasta', etiqueta: 'Hasta', tipo: 'fecha', requerido: true, defecto: 'hoy' }
        ],
        ejecutar: function (p, ctx) {
          var meses = resumenMensual(ctx, p.desde, p.hasta), filas = [], etiquetas = [], valores = [], i, m, vend = 0, disp = 0, ing = 0;
          for (i = 0; i < meses.length; i++) { vend += meses[i].noches; }
          if (vend > 0) {
            for (i = 0; i < meses.length; i++) {
              m = meses[i];
              filas.push([nombreMes(m.mes), m.ingreso, m.noches, m.noches > 0 ? ctx.redondear(m.ingreso / m.noches) : 0, porcentaje(ctx, m.noches, m.disponibles), m.disponibles > 0 ? ctx.redondear(m.ingreso / m.disponibles) : 0]);
              etiquetas.push(nombreMes(m.mes));
              valores.push(m.disponibles > 0 ? ctx.redondear(m.ingreso / m.disponibles) : 0);
              ing += m.ingreso;
              disp += m.disponibles;
            }
          }
          return {
            columnas: ['Mes', 'Ingreso alojamiento', 'Noches vendidas', 'ADR', 'Ocupación %', 'RevPAR'], tipos: ['texto', 'moneda', 'entero', 'moneda', 'porcentaje', 'moneda'], filas: filas,
            grafico: { tipo: 'columnas', etiquetas: etiquetas, valores: valores, formato: 'moneda' },
            resumen: [
              { etiqueta: 'ADR del periodo', valor: vend > 0 ? ctx.redondear(ing / vend) : 0, tipo: 'moneda' },
              { etiqueta: 'RevPAR del periodo', valor: disp > 0 ? ctx.redondear(ing / disp) : 0, tipo: 'moneda' },
              { etiqueta: 'Ocupación del periodo', valor: porcentaje(ctx, vend, disp), tipo: 'porcentaje' }
            ]
          };
        }
      },
      {
        id: 'huespedes-procedencia', titulo: 'Huéspedes por procedencia',
        descripcion: 'De dónde vienen los huéspedes: estadías y noches por ciudad de procedencia, para decidir dónde promocionar el hostal.',
        roles: ['admin', 'gerente', 'recepcion', 'auditor'],
        parametros: [
          { id: 'desde', etiqueta: 'Desde', tipo: 'fecha', requerido: true, defecto: '@-180' },
          { id: 'hasta', etiqueta: 'Hasta', tipo: 'fecha', requerido: true, defecto: 'hoy' }
        ],
        ejecutar: function (p, ctx) {
          var reservas = ctx.datos.listar('reservas', function (d) { return esRealizada(d) && d.fecha >= p.desde && d.fecha <= p.hasta; }), acum = {}, i, d, h, c, k, lista = [], filas = [], etiquetas = [], valores = [], totalEst = 0, extranjeros = 0;
          for (i = 0; i < reservas.length; i++) {
            d = reservas[i];
            h = ctx.datos.obtener('huespedes', d.huesped);
            c = h ? h.procedencia : 'Sin dato';
            if (!acum[c]) { acum[c] = { ciudad: c, pais: h ? h.nacionalidad : '', estadias: 0, noches: 0, personas: {} }; }
            acum[c].estadias += 1;
            acum[c].noches += d.totales.noches;
            acum[c].personas[d.huesped] = true;
            if (h && h.nacionalidad !== 'Perú') { extranjeros += 1; }
            totalEst += 1;
          }
          for (k in acum) { if (acum.hasOwnProperty(k)) { lista.push(acum[k]); } }
          lista.sort(function (a, b) { return b.estadias - a.estadias || (a.ciudad < b.ciudad ? -1 : 1); });
          for (i = 0; i < lista.length; i++) {
            filas.push([lista[i].ciudad, lista[i].pais, contarClaves(lista[i].personas), lista[i].estadias, lista[i].noches, porcentaje(ctx, lista[i].estadias, totalEst)]);
            etiquetas.push(lista[i].ciudad);
            valores.push(lista[i].estadias);
          }
          return {
            columnas: ['Procedencia', 'País', 'Huéspedes distintos', 'Estadías', 'Noches', '% de estadías'], tipos: ['texto', 'texto', 'entero', 'entero', 'entero', 'porcentaje'], filas: filas,
            grafico: { tipo: 'barras', etiquetas: etiquetas, valores: valores, formato: 'entero' },
            resumen: [
              { etiqueta: 'Estadías del periodo', valor: totalEst, tipo: 'entero' },
              { etiqueta: 'De huéspedes extranjeros', valor: porcentaje(ctx, extranjeros, totalEst), tipo: 'porcentaje' },
              { etiqueta: 'Procedencias distintas', valor: lista.length, tipo: 'entero' }
            ]
          };
        }
      },
      {
        id: 'consumos-servicio', titulo: 'Consumos por servicio',
        descripcion: 'Cantidad e importe (sin IGV) de cada servicio consumido en estadías con check-in hecho. Sirve para reponer el frigobar y ver qué extras se venden más.',
        roles: ['admin', 'gerente', 'contabilidad', 'auditor'],
        parametros: [
          { id: 'desde', etiqueta: 'Desde', tipo: 'fecha', requerido: true, defecto: '@-180' },
          { id: 'hasta', etiqueta: 'Hasta', tipo: 'fecha', requerido: true, defecto: 'hoy' }
        ],
        ejecutar: function (p, ctx) {
          var reservas = ctx.datos.listar('reservas', function (d) { return esRealizada(d) && d.fecha >= p.desde && d.fecha <= p.hasta; }), acum = {}, i, j, l, k, lista = [], filas = [], etiquetas = [], valores = [], total = 0, unidades = 0, s;
          for (i = 0; i < reservas.length; i++) {
            for (j = 0; j < reservas[i].lineas.length; j++) {
              l = reservas[i].lineas[j];
              if (!acum[l.item]) { acum[l.item] = { id: l.item, cantidad: 0, importe: 0 }; }
              acum[l.item].cantidad += l.cantidad;
              acum[l.item].importe += l.cantidad * l.precio;
            }
          }
          for (k in acum) { if (acum.hasOwnProperty(k) && acum[k].importe > 0) { lista.push(acum[k]); total += acum[k].importe; unidades += acum[k].cantidad; } }
          lista.sort(function (a, b) { return b.importe - a.importe; });
          for (i = 0; i < lista.length; i++) {
            s = ctx.datos.obtener('servicios', lista[i].id);
            filas.push([s ? s.nombre : lista[i].id, s ? s.categoria : '', lista[i].cantidad, ctx.redondear(lista[i].importe), porcentaje(ctx, lista[i].importe, total)]);
            etiquetas.push(s ? s.nombre : lista[i].id);
            valores.push(ctx.redondear(lista[i].importe));
          }
          return {
            columnas: ['Servicio', 'Categoría', 'Cantidad', 'Importe', '% del total'], tipos: ['texto', 'texto', 'entero', 'moneda', 'porcentaje'], filas: filas,
            grafico: { tipo: 'barras', etiquetas: etiquetas, valores: valores, formato: 'moneda' },
            resumen: [
              { etiqueta: 'Consumos del periodo', valor: ctx.redondear(total), tipo: 'moneda' },
              { etiqueta: 'Unidades consumidas', valor: unidades, tipo: 'entero' },
              { etiqueta: 'Servicios distintos', valor: lista.length, tipo: 'entero' }
            ]
          };
        }
      }
    ],

    /* ------------------------------ Tablero ------------------------------ */
    tablero: [
      {
        titulo: 'Ocupación de esta noche', tipo: 'porcentaje',
        calcular: function (ctx) {
          var operativas = ctx.datos.listar('habitaciones', function (h) { return h.estado === 'Operativa'; }).length;
          return porcentaje(ctx, enCasaEstaNoche(ctx).length, operativas);
        }
      },
      {
        titulo: 'Llegadas pendientes de hoy', tipo: 'entero',
        calcular: function (ctx) {
          var hoy = ctx.hoy();
          return ctx.datos.listar('reservas', function (d) { return d.estado === 'Reservada' && d.fecha <= hoy && d.salida > hoy; }).length;
        }
      },
      {
        titulo: 'Salidas de hoy', tipo: 'entero',
        calcular: function (ctx) {
          var hoy = ctx.hoy();
          return ctx.datos.listar('reservas', function (d) { return d.estado === 'En casa' && d.salida === hoy; }).length;
        }
      },
      {
        titulo: 'Habitaciones por limpiar', tipo: 'entero', roles: ['admin', 'gerente', 'recepcion', 'housekeeping'],
        calcular: function (ctx) { return ctx.datos.listar('habitaciones', function (h) { return h.limpieza === 'Por limpiar'; }).length; }
      },
      {
        titulo: 'ADR de los últimos 30 días', tipo: 'moneda', roles: ['admin', 'gerente', 'contabilidad', 'auditor'],
        nota: 'Precio medio por habitación vendida, sin IGV.',
        calcular: function (ctx) {
          var m = resumenMensual(ctx, ctx.fechaMas(ctx.hoy(), -29), ctx.hoy()), i, vend = 0, ing = 0;
          for (i = 0; i < m.length; i++) { vend += m[i].noches; ing += m[i].ingreso; }
          return vend > 0 ? ctx.redondear(ing / vend) : 0;
        }
      },
      {
        titulo: 'RevPAR de los últimos 30 días', tipo: 'moneda', roles: ['admin', 'gerente', 'contabilidad', 'auditor'],
        nota: 'Ingreso por habitación disponible, sin IGV.',
        calcular: function (ctx) {
          var m = resumenMensual(ctx, ctx.fechaMas(ctx.hoy(), -29), ctx.hoy()), i, disp = 0, ing = 0;
          for (i = 0; i < m.length; i++) { disp += m[i].disponibles; ing += m[i].ingreso; }
          return disp > 0 ? ctx.redondear(ing / disp) : 0;
        }
      }
    ],

    tableroGrafico: {
      titulo: 'Ocupación de los últimos 6 meses (%)', tipo: 'columnas', formato: 'porcentaje',
      calcular: function (ctx) {
        var meses = ultimosMeses(ctx, 6), res = resumenMensual(ctx, meses[0] + '-01', ctx.hoy()), porMes = {}, etiquetas = [], valores = [], i;
        for (i = 0; i < res.length; i++) { porMes[res[i].mes] = res[i]; }
        for (i = 0; i < meses.length; i++) {
          etiquetas.push(MESES[parseInt(meses[i].slice(5, 7), 10) - 1]);
          valores.push(porMes[meses[i]] ? porcentaje(ctx, porMes[meses[i]].noches, porMes[meses[i]].disponibles) : 0);
        }
        return { etiquetas: etiquetas, valores: valores };
      }
    },

    /* ------------------------------ Semillas ------------------------------ */
    semillas: {
      habitaciones: habitaciones,
      huespedes: huespedes,
      servicios: servicios,
      tarifas: armarTarifas(),
      reservas: armarReservas()
    }
  };
})();
