/*
 * Centro de Salud Santa Rosa · Citas, atenciones y farmacia (Lima)
 * ----------------------------------------------------------------------------
 * Configuración del sistema de práctica «centro-salud». Es lo ÚNICO que cambia
 * entre sistemas: el núcleo (nucleo/js) lee este archivo y arma la aplicación.
 *
 * AVISO DE PRÁCTICA: todos los datos de pacientes, diagnósticos, recetas y
 * medicamentos son 100 % ficticios (DNI, nombres, pesos y diagnósticos
 * inventados) y no corresponden a ninguna persona real. Los códigos CIE-10
 * son solo de ejemplo. No uses datos clínicos reales en este sistema.
 * Todo el código es ES5 (sin flechas, let, const ni plantillas).
 *
 * Reglas propias del rubro:
 *  - Edad en años cumplidos y grupo etario.
 *  - IMC (kg/m²) con su clasificación para adultos (OMS); en menores de 18 años no aplica.
 *  - Dosis pediátrica: en menores de la edad límite, la dosis diaria recetada
 *    (unidades por día × mg por unidad) no puede superar peso × mg/kg/día máximo.
 *  - Copago de la consulta: copago fijo del seguro + la parte no cubierta, sin pasar de la tarifa.
 *  - Tiempo de espera: minutos entre la llegada y el inicio de la atención.
 */
(function () {
  'use strict';

  /* ---------- Constantes del negocio ---------- */

  var MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  var ESPECIALIDADES = ['Medicina general', 'Pediatría', 'Ginecología y obstetricia', 'Obstetricia', 'Odontología', 'Medicina interna'];
  var CLINICO = ['admin', 'director', 'medico', 'enfermeria', 'farmacia', 'auditor'];
  var PATRON_HORA = '^([01][0-9]|2[0-3]):[0-5][0-9]$';
  var MSG_HORA = 'Escribe la hora en formato 24 horas, por ejemplo 08:30.';

  /* ---------- Ayudas locales (solo para este archivo) ---------- */

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

  /* Años cumplidos de una persona nacida en `nac` a la fecha `ref` (ambas AAAA-MM-DD); null si naciera después de `ref`. */
  function edadEn(nac, ref) {
    var a;
    if (!nac || !ref) { return null; }
    a = parseInt(ref.slice(0, 4), 10) - parseInt(nac.slice(0, 4), 10);
    if (ref.slice(5) < nac.slice(5)) { a -= 1; }
    return a < 0 ? null : a;
  }

  function edadDe(p, ctx) { return edadEn(p.fechaNacimiento, ctx.hoy()); }

  /* Grupo etario según la edad en años y la edad límite pediátrica de Configuración. */
  function grupoEtario(edad, ctx) {
    if (edad === null) { return null; }
    if (edad < 1) { return 'Lactante'; }
    if (edad < ctx.param('edadPediatrica')) { return 'Niño'; }
    if (edad < 18) { return 'Adolescente'; }
    if (edad < 60) { return 'Adulto'; }
    return 'Adulto mayor';
  }

  /* IMC = peso (kg) / talla (m)², con un decimal; null si falta el peso o la talla. */
  function imcDe(peso, tallaCm) {
    var m;
    if (!(peso > 0) || !(tallaCm > 0)) { return null; }
    m = tallaCm / 100;
    return Math.round(peso / (m * m) * 10) / 10;
  }

  /* Clasificación del IMC para adultos (OMS). La clase se decide con el IMC ya redondeado, el mismo que se muestra. */
  function claseImc(imc, edad) {
    if (imc === null) { return 'Sin datos'; }
    if (edad === null || edad < 18) { return 'No aplica (menor de 18 años)'; }
    if (imc < 18.5) { return 'Bajo peso'; }
    if (imc < 25) { return 'Normal'; }
    if (imc < 30) { return 'Sobrepeso'; }
    if (imc < 35) { return 'Obesidad I'; }
    if (imc < 40) { return 'Obesidad II'; }
    return 'Obesidad III';
  }

  /* Copago de la consulta: copago fijo del seguro + la parte que el seguro no cubre, sin pasar de la tarifa. Sin seguro paga todo. */
  function copagoConsulta(tarifa, seguro, ctx) {
    var fijo, variable;
    if (!seguro) { return ctx.redondear(tarifa); }
    fijo = seguro.copagoFijo || 0;
    variable = tarifa * (100 - (seguro.coberturaConsultaPct || 0)) / 100;
    return ctx.redondear(Math.min(tarifa, fijo + variable));
  }

  /* 'HH:MM' → minutos desde la medianoche, o null si no es una hora válida. */
  function minutos(hhmm) {
    var m = /^([01][0-9]|2[0-3]):([0-5][0-9])$/.exec(String(hhmm || ''));
    return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : null;
  }

  /* Tiempo de espera en minutos (llegada → inicio de la atención), o null si falta algún dato o el orden es imposible. */
  function esperaMin(doc) {
    var a = minutos(doc.horaLlegada), b = minutos(doc.horaInicio);
    if (a === null || b === null || b < a) { return null; }
    return b - a;
  }

  /* Atenciones que ya se dieron (atendidas o derivadas) dentro de un rango. */
  function atencionesDadas(ctx, desde, hasta) {
    return ctx.datos.listar('atenciones', function (a) {
      return (a.estado === 'Atendida' || a.estado === 'Derivada') && (!desde || a.fecha >= desde) && (!hasta || a.fecha <= hasta);
    });
  }

  /* Citas no atendidas: anuladas, o programadas cuya fecha ya pasó sin atenderse. */
  function esNoAtendida(a, ctx) {
    return a.estado === 'Anulada' || (a.estado === 'Programada' && a.fecha < ctx.hoy());
  }

  /* Clasificación de una cita no atendida. */
  function motivoNoAtencion(a) {
    if (a.estado === 'Programada') { return 'Programada vencida sin atender'; }
    return /^No asisti/.test(a.motivoAnulacion || '') ? 'No asistió' : 'Cancelada o reprogramada';
  }

  /* Estado de un medicamento según vencimiento, existencias y la alerta de Configuración. */
  function situacionMedicamento(m, ctx) {
    var dias = ctx.diasEntre(ctx.hoy(), m.vencimiento);
    if (m.vencimiento && dias < 0) { return 'Vencido'; }
    if (m.stock <= 0) { return 'Agotado'; }
    if (m.stock <= m.stockMin) { return 'Stock bajo'; }
    if (m.vencimiento && dias <= ctx.param('diasPorVencer')) { return 'Por vencer'; }
    return 'Normal';
  }

  /* ---------- Datos de demostración ---------- */

  function id4(prefijo, n) { return prefijo + '-' + (n < 10 ? '000' : '00') + n; }
  function fechaRel(dias) { return dias >= 0 ? '@-' + dias : '@' + (-dias); }

  /* Fila de paciente: [n.º, DNI, nombre, años, días extra, sexo, seguro, distrito, teléfono, peso, talla, alergias, apoderado] */
  var PACIENTES_FILAS = [
    [1, '40123401', 'Alberto Mendoza Cárdenas', 58, 40, 'M', 3, 'San Juan de Lurigancho', '987 410 221', 82, 168, '', ''],
    [2, '42678902', 'Ana Lucía Quispe Rojas', 34, 120, 'F', 4, 'Comas', '987 410 222', 61, 158, 'Penicilina', ''],
    [3, '71234503', 'Brenda Salazar Huamán', 27, 200, 'F', 2, 'Villa El Salvador', '987 410 223', 55, 160, '', ''],
    [4, '78123404', 'Camila Ríos Torres', 9, 90, 'F', 2, 'Villa María del Triunfo', '987 410 224', 29, 132, '', 'Marta Torres Gil'],
    [5, '09234505', 'Carlos Eduardo Palomino Vega', 45, 15, 'M', 1, 'Ate', '987 410 225', 96, 172, 'Sulfas', ''],
    [6, '75123406', 'Diego Alonso Cuya Paredes', 5, 60, 'M', 2, 'San Juan de Lurigancho', '987 410 226', 18, 108, '', 'Karen Paredes Lazo'],
    [7, '08345607', 'Elena Cornejo Valdez', 74, 250, 'F', 3, 'Rímac', '987 410 227', 66, 150, 'Ibuprofeno', ''],
    [8, '72456708', 'Fiorella Mamani Condori', 23, 30, 'F', 1, 'Los Olivos', '987 410 228', 52, 159, '', ''],
    [9, '79345609', 'Gabriel Anyelo Torres Quispe', 0, 190, 'M', 2, 'Comas', '987 410 229', 7.5, 66, '', 'Luz Quispe Mena'],
    [10, '06456710', 'Hilda Barrios Campos', 81, 100, 'F', 2, 'Rímac', '987 410 230', 58, 148, '', ''],
    [11, '43567811', 'Ivonne Delgado Ruiz', 39, 300, 'F', 6, 'San Martín de Porres', '987 410 231', 71, 162, '', ''],
    [12, '77678912', 'Joaquín Salas Medina', 11, 20, 'M', 5, 'Los Olivos', '987 410 232', 38, 145, 'Mariscos', 'Sandra Medina Ortiz'],
    [13, '74789013', 'Karla Jimena Vásquez Lara', 15, 150, 'F', 2, 'Villa El Salvador', '987 410 233', 52, 160, '', 'Rosa Lara Quispe'],
    [14, '07890114', 'Luis Alberto Huanca Flores', 66, 70, 'M', 3, 'Ate', '987 410 234', 74, 165, '', ''],
    [15, '80901215', 'Mateo Isaac Cárdenas Ponce', 3, 200, 'M', 1, 'San Juan de Lurigancho', '987 410 235', 14, 95, '', 'Julia Ponce Reyes'],
    [16, '41012316', 'Nilda Soto Arévalo', 52, 10, 'F', 4, 'San Martín de Porres', '987 410 236', 88, 156, '', '']
  ];

  function armarPacientes() {
    var r = [], i, f, p;
    for (i = 0; i < PACIENTES_FILAS.length; i++) {
      f = PACIENTES_FILAS[i];
      p = { id: id4('PAC', f[0]), dni: f[1], nombre: f[2], fechaNacimiento: '@-' + (f[3] * 365 + f[4]), sexo: f[5] === 'F' ? 'Femenino' : 'Masculino', seguro: id4('SEG', f[6]), distrito: f[7], telefono: f[8], pesoKg: f[9], tallaCm: f[10] };
      if (f[11]) { p.alergias = f[11]; }
      if (f[12]) { p.apoderado = f[12]; }
      r.push(p);
    }
    return r;
  }

  /* Fila de médico: [n.º, CMP, nombre, especialidad, consultorio, turno, tarifa, activo] */
  var MEDICOS_FILAS = [
    [1, '45120', 'Alicia Rojas Benavides', ESPECIALIDADES[0], 'Consultorio 1', 'Mañana', 35, true],
    [2, '47231', 'Bruno Zavaleta Ortiz', ESPECIALIDADES[0], 'Consultorio 2', 'Tarde', 35, true],
    [3, '39842', 'Cecilia Montalvo Prado', ESPECIALIDADES[1], 'Consultorio 3', 'Mañana', 45, true],
    [4, '41953', 'Daniel Huerta Salcedo', ESPECIALIDADES[1], 'Consultorio 4', 'Tarde', 45, true],
    [5, '36064', 'Elsa Villafuerte Meza', ESPECIALIDADES[2], 'Consultorio 5', 'Mañana', 50, true],
    [6, '52175', 'Fernando Casas Leiva', ESPECIALIDADES[4], 'Consultorio dental 1', 'Mañana', 40, true],
    [7, '53286', 'Gladys Pomalaya Ñaupa', ESPECIALIDADES[4], 'Consultorio dental 2', 'Tarde', 40, true],
    [8, '33397', 'Héctor Bernal Soto', ESPECIALIDADES[5], 'Consultorio 6', 'Mixto', 55, true],
    [9, '58408', 'Irma Collantes Vera', ESPECIALIDADES[3], 'Consultorio 7', 'Mañana', 40, true],
    [10, '49519', 'Jorge Luna Cabrera', ESPECIALIDADES[0], 'Consultorio 8', 'Mañana', 35, true],
    [11, '50620', 'Lucero Arana Tapia', ESPECIALIDADES[0], 'Consultorio 9', 'Tarde', 35, true],
    [12, '31731', 'Mauricio Espinoza Gil', ESPECIALIDADES[5], 'Consultorio 10', 'Tarde', 55, false]
  ];

  function armarMedicos() {
    var r = [], i, f;
    for (i = 0; i < MEDICOS_FILAS.length; i++) {
      f = MEDICOS_FILAS[i];
      r.push({ id: id4('MED', f[0]), cmp: f[1], nombre: f[2], especialidad: f[3], consultorio: f[4], turno: f[5], tarifaConsulta: f[6], activo: f[7] });
    }
    return r;
  }

  /* Fila de medicamento: [n.º, código, nombre, forma, mg por unidad, precio, stock, mínimo, vence (días desde hoy), dosis máx. pediátrica mg/kg/día] */
  var MEDICAMENTOS_FILAS = [
    [1, 'PAR-500', 'Paracetamol 500 mg tableta', 'Tableta', 500, 0.20, 600, 200, 420, 60],
    [2, 'PAR-160', 'Paracetamol 160 mg tableta dispersable', 'Tableta', 160, 0.35, 240, 100, 300, 60],
    [3, 'IBU-400', 'Ibuprofeno 400 mg tableta', 'Tableta', 400, 0.30, 400, 150, 380, 30],
    [4, 'AMX-500', 'Amoxicilina 500 mg cápsula', 'Cápsula', 500, 0.60, 300, 120, 250, 50],
    [5, 'AMX-250', 'Amoxicilina 250 mg tableta dispersable', 'Tableta', 250, 0.55, 160, 80, 40, 50],
    [6, 'AZI-500', 'Azitromicina 500 mg tableta', 'Tableta', 500, 2.20, 90, 40, 200, 12],
    [7, 'ALB-400', 'Albendazol 400 mg tableta', 'Tableta', 400, 0.90, 120, 40, 330, 15],
    [8, 'LOR-10', 'Loratadina 10 mg tableta', 'Tableta', 10, 0.25, 260, 100, 280, 0.4],
    [9, 'SAL-2', 'Salbutamol 2 mg tableta', 'Tableta', 2, 0.15, 150, 60, 260, 0.3],
    [10, 'OME-20', 'Omeprazol 20 mg cápsula', 'Cápsula', 20, 0.40, 200, 80, 310, 1],
    [11, 'MET-850', 'Metformina 850 mg tableta', 'Tableta', 850, 0.35, 280, 100, 360, 0],
    [12, 'ENA-10', 'Enalapril 10 mg tableta', 'Tableta', 10, 0.25, 35, 80, 340, 0],
    [13, 'LOS-50', 'Losartán 50 mg tableta', 'Tableta', 50, 0.45, 180, 80, 45, 0],
    [14, 'FER-300', 'Sulfato ferroso 300 mg tableta (60 mg de hierro)', 'Tableta', 60, 0.15, 500, 150, 400, 6],
    [15, 'FOL-5', 'Ácido fólico 5 mg tableta', 'Tableta', 5, 0.10, 220, 80, 360, 0.5],
    [16, 'DEX-4', 'Dexametasona 4 mg ampolla', 'Inyectable', 4, 2.80, 40, 20, -15, 0.3]
  ];

  var MED_PRECIO = {};
  function armarMedicamentos() {
    var r = [], i, f;
    for (i = 0; i < MEDICAMENTOS_FILAS.length; i++) {
      f = MEDICAMENTOS_FILAS[i];
      MED_PRECIO[id4('MDC', f[0])] = f[5];
      r.push({ id: id4('MDC', f[0]), codigo: f[1], nombre: f[2], forma: f[3], mgPorUnidad: f[4], precio: f[5], stock: f[6], stockMin: f[7], vencimiento: fechaRel(-f[8]), dosisMaxMgKgDia: f[9], activo: true });
    }
    return r;
  }

  var TIPO_ATN = { P: 'Cita programada', D: 'Demanda espontánea', C: 'Control' };
  var ESTADO_ATN = { A: 'Atendida', D: 'Derivada', N: 'Anulada', X: 'Anulada', P: 'Programada' };

  /* Fila de atención: [días atrás (negativo = futuro), paciente, médico, tipo, motivo, diagnóstico (0 = ninguno), estado, hora de la cita, llegada, inicio] */
  var ATENCIONES = [
    [178, 1, 10, 'P', 'Control de presión arterial', 7, 'A', '08:30', '08:20', '08:50'],
    [174, 4, 3, 'P', 'Tos y fiebre de dos días', 3, 'A', '09:00', '08:55', '09:35'],
    [171, 9, 4, 'D', 'Diarrea y vómitos desde ayer', 4, 'A', '', '10:05', '10:40'],
    [168, 3, 5, 'P', 'Control prenatal mensual', 12, 'A', '10:00', '09:50', '10:10'],
    [165, 5, 8, 'P', 'Control de glucosa', 6, 'A', '11:00', '10:45', '11:20'],
    [162, 7, 1, 'P', 'Dolor de cabeza frecuente', 15, 'A', '08:00', '07:50', '08:25'],
    [158, 6, 3, 'P', 'Resfrío y congestión nasal', 1, 'A', '15:00', '14:50', '15:50'],
    [155, 8, 11, 'D', 'Ardor al orinar', 8, 'A', '', '09:20', '09:45'],
    [151, 2, 2, 'P', 'Dolor de estómago', 5, 'A', '16:00', '15:40', '16:30'],
    [148, 12, 4, 'P', 'Tos persistente', 3, 'A', '16:30', '16:20', '17:15'],
    [144, 14, 8, 'P', 'Control de hipertensión', 7, 'A', '10:30', '10:10', '10:55'],
    [140, 15, 3, 'P', 'Control de crecimiento', 14, 'A', '09:30', '09:25', '09:45'],
    [137, 16, 10, 'D', 'Dolor lumbar', 10, 'A', '', '08:10', '08:35'],
    [134, 16, 8, 'P', 'Control de peso', 13, 'A', '11:30', '11:20', '11:45'],
    [130, 11, 1, 'P', 'Dolor al orinar', 8, 'A', '09:00', '08:50', '09:30'],
    [127, 13, 6, 'P', 'Dolor de muelas', 11, 'A', '10:00', '09:55', '10:20'],
    [123, 4, 3, 'C', 'Control de anemia', 14, 'A', '09:00', '08:55', '09:15'],
    [119, 9, 4, 'D', 'Fiebre en el lactante', 2, 'D', '', '14:30', '15:20'],
    [116, 5, 8, 'C', 'Control de diabetes', 6, 'A', '11:00', '10:50', '11:10'],
    [112, 7, 1, 'P', 'Control de presión arterial', 0, 'N', '08:30', '', ''],
    [108, 2, 5, 'P', 'Dolor pélvico', 8, 'A', '10:00', '09:45', '10:40'],
    [104, 12, 4, 'D', 'Fiebre y dolor de garganta', 2, 'A', '', '09:15', '10:05'],
    [100, 1, 2, 'P', 'Control de presión arterial', 7, 'A', '08:00', '07:45', '08:20'],
    [97, 3, 9, 'P', 'Control prenatal', 12, 'A', '10:30', '10:20', '10:40'],
    [93, 10, 8, 'P', 'Control de hipertensión', 7, 'A', '15:30', '15:20', '16:25'],
    [89, 6, 4, 'D', 'Diarrea aguda', 4, 'A', '', '11:10', '11:30'],
    [85, 16, 8, 'P', 'Control de peso y presión', 0, 'X', '11:00', '', ''],
    [80, 8, 1, 'P', 'Dolor de cabeza', 15, 'A', '08:30', '08:30', '08:40'],
    [76, 14, 11, 'P', 'Dolor lumbar persistente', 10, 'A', '16:00', '15:50', '16:20'],
    [71, 15, 3, 'D', 'Tos y silbidos', 3, 'A', '', '10:00', '10:25'],
    [66, 11, 1, 'C', 'Control de infección urinaria', 8, 'A', '09:00', '08:55', '09:10'],
    [61, 13, 7, 'P', 'Limpieza dental y revisión', 11, 'A', '14:30', '14:25', '14:40'],
    [55, 5, 8, 'C', 'Control de diabetes', 6, 'A', '11:00', '10:40', '11:25'],
    [49, 15, 3, 'C', 'Control del niño sano', 14, 'A', '09:00', '08:50', '09:05'],
    [42, 4, 4, 'P', 'Dolor de estómago y náuseas', 5, 'A', '16:00', '15:45', '16:35'],
    [36, 10, 1, 'P', 'Control de hipertensión', 7, 'N', '08:30', '', ''],
    [30, 12, 3, 'P', 'Control de crecimiento', 14, 'A', '09:30', '09:20', '09:50'],
    [24, 7, 10, 'P', 'Control de presión arterial', 7, 'A', '08:00', '07:55', '08:15'],
    [19, 6, 4, 'D', 'Fiebre y tos', 2, 'A', '', '15:10', '16:20'],
    [14, 3, 5, 'P', 'Control prenatal', 12, 'A', '10:00', '09:55', '10:15'],
    [9, 15, 3, 'P', 'Control de crecimiento', 0, 'P', '09:00', '', ''],
    [6, 1, 2, 'P', 'Control de presión arterial', 7, 'A', '08:30', '08:15', '08:55'],
    [4, 8, 11, 'P', 'Dolor de cabeza', 0, 'X', '14:00', '', ''],
    [2, 16, 8, 'P', 'Control de peso', 13, 'A', '11:00', '10:50', '11:05'],
    [1, 14, 11, 'D', 'Dolor lumbar', 10, 'A', '', '15:00', '15:30'],
    [0, 5, 8, 'P', 'Control de glucosa', 0, 'P', '11:00', '', ''],
    [-2, 7, 1, 'P', 'Control de presión arterial', 0, 'P', '08:30', '', ''],
    [-5, 13, 6, 'P', 'Revisión dental', 0, 'P', '10:00', '', '']
  ];

  function armarAtenciones() {
    var r = [], i, f, d;
    for (i = 0; i < ATENCIONES.length; i++) {
      f = ATENCIONES[i];
      d = { id: id4('ATN', i + 1), fecha: fechaRel(f[0]), paciente: id4('PAC', f[1]), medico: id4('MED', f[2]), tipo: TIPO_ATN[f[3]], motivo: f[4], estado: ESTADO_ATN[f[6]] };
      if (f[5]) { d.diagnostico = id4('DIA', f[5]); }
      if (f[7]) { d.hora = f[7]; }
      if (f[8]) { d.horaLlegada = f[8]; }
      if (f[9]) { d.horaInicio = f[9]; }
      if (f[6] === 'N') { d.motivoAnulacion = 'No asistió a la cita; se llamó dos veces sin respuesta.'; }
      if (f[6] === 'X') { d.motivoAnulacion = 'El paciente canceló por viaje y pidió reprogramar.'; }
      r.push(d);
    }
    return r;
  }

  var ESTADO_REC = { D: 'Dispensada', A: 'Anulada', B: 'Borrador' };

  /* Fila de receta: [días atrás, paciente, médico, diagnóstico, peso del día (0 = el de la ficha), estado, [[medicamento, cantidad, días de tratamiento]]] */
  var RECETAS = [
    [178, 1, 10, 7, 0, 'D', [[13, 90, 30]]],
    [174, 4, 3, 3, 29, 'D', [[1, 9, 3], [8, 5, 5]]],
    [171, 9, 4, 4, 7.4, 'D', [[2, 6, 3]]],
    [168, 3, 5, 12, 0, 'D', [[14, 30, 30], [15, 30, 30]]],
    [165, 5, 8, 6, 0, 'D', [[11, 60, 30], [10, 30, 30]]],
    [162, 7, 1, 15, 0, 'D', [[1, 10, 5]]],
    [158, 6, 3, 1, 18, 'D', [[2, 12, 3]]],
    [155, 8, 11, 8, 0, 'D', [[4, 21, 7], [1, 10, 5]]],
    [151, 2, 2, 5, 0, 'D', [[10, 14, 14], [1, 6, 3]]],
    [148, 12, 4, 3, 38, 'D', [[4, 21, 7], [3, 10, 5]]],
    [144, 14, 8, 7, 0, 'D', [[12, 30, 30], [13, 30, 30]]],
    [140, 15, 3, 14, 14, 'D', [[14, 30, 30]]],
    [130, 11, 1, 8, 0, 'D', [[4, 21, 7]]],
    [119, 9, 4, 2, 7.5, 'D', [[2, 6, 3]]],
    [112, 16, 8, 13, 0, 'A', [[11, 60, 30]]],
    [104, 12, 4, 2, 38, 'D', [[3, 6, 3], [1, 6, 3]]],
    [93, 10, 8, 7, 0, 'D', [[12, 30, 30], [13, 30, 30]]],
    [85, 6, 4, 4, 18, 'D', [[5, 21, 7], [2, 8, 2]]],
    [71, 15, 3, 3, 14, 'D', [[9, 6, 3], [2, 9, 3]]],
    [49, 15, 3, 14, 0, 'D', [[14, 14, 14]]],
    [36, 4, 4, 5, 29, 'D', [[10, 7, 7], [7, 1, 1]]],
    [24, 7, 10, 7, 0, 'D', [[13, 30, 30], [12, 30, 30]]],
    [14, 3, 5, 12, 0, 'D', [[14, 30, 30], [15, 30, 30]]],
    [6, 1, 2, 7, 0, 'B', [[13, 30, 30]]],
    [1, 14, 11, 10, 0, 'B', [[3, 10, 5]]]
  ];

  function armarRecetas() {
    var r = [], i, f, d, ls, j;
    for (i = 0; i < RECETAS.length; i++) {
      f = RECETAS[i];
      ls = [];
      for (j = 0; j < f[6].length; j++) { ls.push({ item: id4('MDC', f[6][j][0]), cantidad: f[6][j][1], dias: f[6][j][2], precio: MEDICAMENTOS_FILAS[f[6][j][0] - 1][5] }); }
      d = { id: id4('REC', i + 1), fecha: fechaRel(f[0]), paciente: id4('PAC', f[1]), medico: id4('MED', f[2]), diagnostico: id4('DIA', f[3]), estado: ESTADO_REC[f[5]], lineas: ls };
      if (f[4]) { d.pesoKg = f[4]; }
      if (f[5] === 'A') { d.motivoAnulacion = 'Receta duplicada: el paciente ya tenía una vigente.'; }
      r.push(d);
    }
    return r;
  }

  /* ---------- Configuración del sistema ---------- */

  window.SISTEMA = {
    id: 'centro-salud',
    nombre: 'Centro de Salud Santa Rosa · Citas y farmacia',
    rubro: 'Atención primaria de salud · datos clínicos 100 % ficticios',
    version: '1.0.0',
    moneda: 'S/',
    tema: { primario: '#0b6e5c', acento: '#e5604d', siglas: 'SR' },

    parametros: [
      { id: 'esperaMaxMin', etiqueta: 'Espera máxima aceptable (minutos)', tipo: 'entero', min: 0, max: 600, valor: 30, ayuda: 'Una atención con más espera que esto cuenta como espera excesiva en los reportes.' },
      { id: 'edadPediatrica', etiqueta: 'Edad límite pediátrica (años)', tipo: 'entero', min: 1, max: 18, valor: 12, ayuda: 'Por debajo de esta edad la receta se valida con la dosis máxima por peso.' },
      { id: 'edadMaxPediatria', etiqueta: 'Edad máxima de atención en Pediatría (años)', tipo: 'entero', min: 1, max: 18, valor: 14, ayuda: 'Pediatría solo atiende pacientes menores de esta edad.' },
      { id: 'diasPorVencer', etiqueta: 'Alerta de vencimiento de medicamentos (días)', tipo: 'entero', min: 0, max: 365, valor: 60, ayuda: 'Un medicamento que vence en este número de días o menos aparece como «por vencer».' }
    ],

    seguridad: {
      minClave: 10,
      intentosMax: 5,
      bloqueoMin: 5,
      sesionMin: 15,
      cadenaBitacora: true,
      confirmarEliminar: false,
      exigirCambioClave: true,
      ayudaLogin: true,
      exportaRespetaPermisos: true,
      cspMeta: true
    },

    roles: [
      { id: 'admin', nombre: 'Administración y sistemas', descripcion: 'Acceso total: catálogos, citas, recetas, usuarios, bitácora, respaldo y parámetros del centro.' },
      { id: 'director', nombre: 'Director médico', descripcion: 'Ve todos los reportes e indicadores, administra médicos, seguros y diagnósticos y autoriza las anulaciones de citas y recetas. No gestiona usuarios.' },
      { id: 'medico', nombre: 'Médico', descripcion: 'Atiende y registra el diagnóstico, receta los medicamentos y ve la historia clínica. No dispensa ni ve cobros.' },
      { id: 'enfermeria', nombre: 'Enfermería (triaje)', descripcion: 'Toma peso, talla y signos vitales, actualiza la ficha clínica y deja listas las atenciones. No receta.' },
      { id: 'admision', nombre: 'Admisión y citas', descripcion: 'Registra pacientes y programa citas. No ve peso, talla, alergias ni diagnósticos, y no puede anular citas.' },
      { id: 'farmacia', nombre: 'Farmacia', descripcion: 'Administra los medicamentos y dispensa las recetas, que descuentan stock. No ve citas ni diagnósticos de los pacientes.' },
      { id: 'auditor', nombre: 'Auditor', descripcion: 'Solo lectura de todo el establecimiento y de la bitácora. No crea ni modifica nada.' }
    ],

    usuarios: [
      { usuario: 'admin', nombre: 'Teresa Bardales Cueva', rol: 'admin', clave: 'Salud#Adm2026' },
      { usuario: 'director', nombre: 'Manuel Ugarte Salinas', rol: 'director', clave: 'Salud#Dir2026' },
      { usuario: 'medico', nombre: 'Karina Huertas Pinto', rol: 'medico', clave: 'Salud#Med2026' },
      { usuario: 'enfermeria', nombre: 'Rosario Chávez Palomino', rol: 'enfermeria', clave: 'Salud#Enf2026' },
      { usuario: 'admision', nombre: 'Jimena Cueto Arias', rol: 'admision', clave: 'Salud#Adm2027' },
      { usuario: 'farmacia', nombre: 'Óscar Landeo Ramos', rol: 'farmacia', clave: 'Salud#Far2026' },
      { usuario: 'auditor', nombre: 'Pilar Montesinos Díaz', rol: 'auditor', clave: 'Salud#Aud2026' }
    ],

    /* ------------------------------ Entidades ------------------------------ */
    entidades: [
      {
        id: 'pacientes', nombre: 'Paciente', plural: 'Pacientes', prefijo: 'PAC',
        campos: [
          { id: 'dni', etiqueta: 'DNI', tipo: 'texto', requerido: true, unico: true, max: 8, patron: '^[0-9]{8}$', mensajePatron: 'El DNI tiene 8 dígitos.', ayuda: 'Sistema de práctica: usa solo datos ficticios.' },
          { id: 'nombre', etiqueta: 'Nombres y apellidos', tipo: 'texto', requerido: true, max: 80 },
          { id: 'fechaNacimiento', etiqueta: 'Fecha de nacimiento', tipo: 'fecha', requerido: true, max: 'hoy' },
          { id: 'sexo', etiqueta: 'Sexo', tipo: 'lista', requerido: true, opciones: ['Femenino', 'Masculino'] },
          { id: 'seguro', etiqueta: 'Seguro de salud', tipo: 'ref', entidad: 'seguros', mostrar: 'nombre', requerido: true },
          { id: 'distrito', etiqueta: 'Distrito', tipo: 'lista', opciones: ['Ate', 'Comas', 'Los Olivos', 'Rímac', 'San Juan de Lurigancho', 'San Martín de Porres', 'Villa El Salvador', 'Villa María del Triunfo'] },
          { id: 'telefono', etiqueta: 'Teléfono', tipo: 'telefono' },
          { id: 'apoderado', etiqueta: 'Apoderado', tipo: 'texto', max: 80, ayuda: 'Solo para menores de edad.' },
          { id: 'pesoKg', etiqueta: 'Peso (kg)', tipo: 'numero', min: 0.5, max: 250, ver: CLINICO },
          { id: 'tallaCm', etiqueta: 'Talla (cm)', tipo: 'numero', min: 30, max: 230, ver: CLINICO },
          { id: 'alergias', etiqueta: 'Alergias conocidas', tipo: 'texto', max: 120, ver: CLINICO }
        ],
        lista: ['dni', 'nombre', 'edad', 'sexo', 'seguro', 'claseImc'],
        buscar: ['dni', 'nombre', 'distrito'],
        calculados: [
          {
            id: 'edad', etiqueta: 'Edad (años)', tipo: 'entero',
            formula: function (r, ctx) { return edadDe(r, ctx); }
          },
          {
            id: 'grupoEtario', etiqueta: 'Grupo etario', tipo: 'texto',
            formula: function (r, ctx) { return grupoEtario(edadDe(r, ctx), ctx); }
          },
          {
            id: 'imc', etiqueta: 'IMC (kg/m²)', tipo: 'numero', ver: CLINICO,
            formula: function (r) { return imcDe(r.pesoKg, r.tallaCm); }
          },
          {
            id: 'claseImc', etiqueta: 'Clasificación del IMC', tipo: 'texto', ver: CLINICO,
            formula: function (r, ctx) { return claseImc(imcDe(r.pesoKg, r.tallaCm), edadDe(r, ctx)); }
          }
        ],
        permisos: { ver: ['admin', 'director', 'medico', 'enfermeria', 'admision', 'farmacia', 'auditor'], crear: ['admin', 'admision'], editar: ['admin', 'admision', 'enfermeria'], eliminar: ['admin'] }
      },
      {
        id: 'medicos', nombre: 'Médico', plural: 'Médicos', prefijo: 'MED',
        campos: [
          { id: 'cmp', etiqueta: 'Colegiatura (CMP)', tipo: 'texto', requerido: true, unico: true, max: 6, patron: '^[0-9]{5,6}$', mensajePatron: 'El CMP tiene 5 o 6 dígitos.' },
          { id: 'nombre', etiqueta: 'Nombre completo', tipo: 'texto', requerido: true, max: 80 },
          { id: 'especialidad', etiqueta: 'Especialidad', tipo: 'lista', requerido: true, opciones: ESPECIALIDADES },
          { id: 'consultorio', etiqueta: 'Consultorio', tipo: 'texto', max: 40 },
          { id: 'turno', etiqueta: 'Turno', tipo: 'lista', opciones: ['Mañana', 'Tarde', 'Mixto'], defecto: 'Mañana' },
          { id: 'tarifaConsulta', etiqueta: 'Tarifa de la consulta (S/)', tipo: 'moneda', min: 0, requerido: true },
          { id: 'activo', etiqueta: 'Médico activo', tipo: 'booleano', defecto: true }
        ],
        lista: ['cmp', 'nombre', 'especialidad', 'consultorio', 'turno', 'tarifaConsulta'],
        buscar: ['cmp', 'nombre', 'especialidad'],
        permisos: { ver: ['admin', 'director', 'medico', 'enfermeria', 'admision', 'auditor'], crear: ['admin', 'director'], editar: ['admin', 'director'], eliminar: ['admin'] }
      },
      {
        id: 'medicamentos', nombre: 'Medicamento', plural: 'Medicamentos', prefijo: 'MDC',
        campos: [
          { id: 'codigo', etiqueta: 'Código', tipo: 'texto', requerido: true, unico: true, max: 20, patron: '^[A-Z0-9-]+$', mensajePatron: 'Usa solo mayúsculas, números y guiones.' },
          { id: 'nombre', etiqueta: 'Medicamento', tipo: 'texto', requerido: true, max: 80 },
          { id: 'forma', etiqueta: 'Forma farmacéutica', tipo: 'lista', requerido: true, opciones: ['Tableta', 'Cápsula', 'Inyectable', 'Sobre', 'Crema'], defecto: 'Tableta' },
          { id: 'mgPorUnidad', etiqueta: 'Miligramos por unidad', tipo: 'numero', min: 0, requerido: true, ayuda: 'Los mg de principio activo de una tableta, cápsula o ampolla. Se usa en la dosis pediátrica.' },
          { id: 'dosisMaxMgKgDia', etiqueta: 'Dosis pediátrica máx.', tipo: 'numero', min: 0, requerido: true, defecto: 0, ayuda: 'En mg por kg de peso al día. Cero significa que no hay dosis pediátrica definida: no se receta a menores.' },
          { id: 'precio', etiqueta: 'Precio por unidad (S/)', tipo: 'moneda', min: 0, requerido: true },
          { id: 'stock', etiqueta: 'Stock actual', tipo: 'entero', min: 0, requerido: true, defecto: 0 },
          { id: 'stockMin', etiqueta: 'Stock mínimo', tipo: 'entero', min: 0, requerido: true, defecto: 20 },
          { id: 'vencimiento', etiqueta: 'Vence (lote más próximo)', tipo: 'fecha', requerido: true },
          { id: 'activo', etiqueta: 'Medicamento activo', tipo: 'booleano', defecto: true }
        ],
        lista: ['codigo', 'nombre', 'forma', 'precio', 'stock', 'vencimiento', 'situacion'],
        buscar: ['codigo', 'nombre'],
        calculados: [
          {
            id: 'situacion', etiqueta: 'Situación', tipo: 'texto',
            formula: function (r, ctx) { return situacionMedicamento(r, ctx); }
          },
          {
            id: 'diasParaVencer', etiqueta: 'Días para vencer', tipo: 'entero',
            formula: function (r, ctx) { return r.vencimiento ? ctx.diasEntre(ctx.hoy(), r.vencimiento) : null; }
          },
          {
            id: 'valorStock', etiqueta: 'Valor en stock', tipo: 'moneda',
            formula: function (r, ctx) { return ctx.redondear((r.precio || 0) * (r.stock || 0)); }
          }
        ],
        reglas: [
          {
            id: 'stock-minimo-razonable', mensaje: 'El stock mínimo no puede ser negativo ni exceder 100 000 unidades.',
            validar: function (r) { return r.stockMin >= 0 && r.stockMin <= 100000; }
          }
        ],
        permisos: { ver: ['admin', 'director', 'medico', 'enfermeria', 'farmacia', 'auditor'], crear: ['admin', 'farmacia'], editar: ['admin', 'farmacia'], eliminar: ['admin'] }
      },
      {
        id: 'seguros', nombre: 'Seguro', plural: 'Seguros', prefijo: 'SEG',
        campos: [
          { id: 'nombre', etiqueta: 'Seguro o convenio', tipo: 'texto', requerido: true, unico: true, max: 60 },
          { id: 'tipo', etiqueta: 'Tipo', tipo: 'lista', requerido: true, opciones: ['Público', 'Privado', 'Ninguno'], defecto: 'Privado' },
          { id: 'coberturaConsultaPct', etiqueta: 'Cobertura de la consulta', tipo: 'porcentaje', min: 0, max: 100, requerido: true, defecto: 0 },
          { id: 'copagoFijo', etiqueta: 'Copago fijo (S/)', tipo: 'moneda', min: 0, requerido: true, defecto: 0, ayuda: 'Monto fijo que paga el paciente además de la parte no cubierta.' },
          { id: 'coberturaMedicamentosPct', etiqueta: 'Cobertura de medicamentos', tipo: 'porcentaje', min: 0, max: 100, requerido: true, defecto: 0 }
        ],
        lista: ['nombre', 'tipo', 'coberturaConsultaPct', 'copagoFijo', 'coberturaMedicamentosPct', 'pacientes'],
        buscar: ['nombre', 'tipo'],
        calculados: [
          {
            id: 'pacientes', etiqueta: 'Pacientes afiliados', tipo: 'entero',
            formula: function (r, ctx) { return ctx.datos.listar('pacientes', function (p) { return p.seguro === r.id; }).length; }
          }
        ],
        permisos: { ver: ['admin', 'director', 'admision', 'auditor'], crear: ['admin', 'director'], editar: ['admin', 'director'], eliminar: ['admin'] }
      },
      {
        id: 'diagnosticos', nombre: 'Diagnóstico', plural: 'Diagnósticos (CIE-10)', prefijo: 'DIA',
        campos: [
          { id: 'codigo', etiqueta: 'Código CIE-10 (ejemplo)', tipo: 'texto', requerido: true, unico: true, max: 10, patron: '^[A-Z][0-9A-Z.]{1,9}$', mensajePatron: 'Una letra seguida de números, por ejemplo J06.9.' },
          { id: 'descripcion', etiqueta: 'Diagnóstico', tipo: 'texto', requerido: true, unico: true, max: 100 },
          { id: 'capitulo', etiqueta: 'Grupo', tipo: 'lista', requerido: true, opciones: ['Respiratorio', 'Digestivo', 'Infeccioso', 'Endocrino y metabólico', 'Cardiovascular', 'Genitourinario', 'Piel', 'Musculoesquelético', 'Salud bucal', 'Embarazo y parto', 'Sangre', 'Síntomas generales'] }
        ],
        lista: ['codigo', 'descripcion', 'capitulo', 'casos'],
        buscar: ['codigo', 'descripcion', 'capitulo'],
        calculados: [
          {
            id: 'casos', etiqueta: 'Casos atendidos', tipo: 'entero',
            formula: function (r, ctx) { return ctx.datos.listar('atenciones', function (a) { return a.diagnostico === r.id && (a.estado === 'Atendida' || a.estado === 'Derivada'); }).length; }
          }
        ],
        permisos: { ver: ['admin', 'director', 'medico', 'enfermeria', 'auditor'], crear: ['admin', 'director'], editar: ['admin', 'director'], eliminar: ['admin'] }
      }
    ],

    /* ------------------------------ Operaciones ------------------------------ */
    operaciones: [
      {
        id: 'atenciones', nombre: 'Atención', plural: 'Citas y atenciones', prefijo: 'ATN', serie: 'CE01',
        campos: [
          { id: 'fecha', etiqueta: 'Fecha de la cita', tipo: 'fecha', requerido: true, defecto: 'hoy', max: '@60' },
          { id: 'hora', etiqueta: 'Hora de la cita', tipo: 'texto', max: 5, patron: PATRON_HORA, mensajePatron: MSG_HORA, placeholder: '08:30' },
          { id: 'paciente', etiqueta: 'Paciente', tipo: 'ref', entidad: 'pacientes', mostrar: 'nombre', requerido: true },
          { id: 'medico', etiqueta: 'Médico', tipo: 'ref', entidad: 'medicos', mostrar: 'nombre', requerido: true },
          { id: 'tipo', etiqueta: 'Tipo de atención', tipo: 'lista', requerido: true, opciones: ['Cita programada', 'Demanda espontánea', 'Control'], defecto: 'Cita programada' },
          { id: 'motivo', etiqueta: 'Motivo de la consulta', tipo: 'texto', requerido: true, max: 120 },
          { id: 'horaLlegada', etiqueta: 'Hora de llegada', tipo: 'texto', max: 5, patron: PATRON_HORA, mensajePatron: MSG_HORA, placeholder: '08:20', ayuda: 'Se registra en admisión o triaje.' },
          { id: 'horaInicio', etiqueta: 'Hora de inicio', tipo: 'texto', max: 5, patron: PATRON_HORA, mensajePatron: MSG_HORA, placeholder: '08:50' },
          { id: 'pesoKg', etiqueta: 'Peso de hoy (kg)', tipo: 'numero', min: 0.5, max: 250, ver: CLINICO },
          { id: 'tallaCm', etiqueta: 'Talla de hoy (cm)', tipo: 'numero', min: 30, max: 230, ver: CLINICO },
          { id: 'presionArterial', etiqueta: 'Presión arterial (mmHg)', tipo: 'texto', max: 7, patron: '^[0-9]{2,3}/[0-9]{2,3}$', mensajePatron: 'Escribe sistólica/diastólica, por ejemplo 120/80.', ver: CLINICO },
          { id: 'temperatura', etiqueta: 'Temperatura (°C)', tipo: 'numero', min: 34, max: 42, ver: CLINICO },
          { id: 'diagnostico', etiqueta: 'Diagnóstico (CIE-10)', tipo: 'ref', entidad: 'diagnosticos', mostrar: 'descripcion', ver: CLINICO, ayuda: 'Obligatorio para dar la atención por realizada.' },
          { id: 'indicaciones', etiqueta: 'Indicaciones', tipo: 'textarea', max: 300, ver: CLINICO }
        ],
        lista: ['fecha', 'paciente', 'medico', 'motivo'],
        estados: ['Programada', 'Atendida', 'Derivada', 'Anulada'],
        calcular: function (doc, ctx) {
          var med = doc.medico ? ctx.datos.obtener('medicos', doc.medico) : null;
          var pac = doc.paciente ? ctx.datos.obtener('pacientes', doc.paciente) : null;
          var seg = pac && pac.seguro ? ctx.datos.obtener('seguros', pac.seguro) : null;
          var tarifa = med ? med.tarifaConsulta : 0;
          var copago = copagoConsulta(tarifa, seg, ctx);
          var espera = esperaMin(doc);
          return { tarifa: tarifa, cobertura: tarifa - copago, copago: copago, esperaMin: espera === null ? 0 : espera, total: tarifa };
        },
        totales: [
          { id: 'esperaMin', etiqueta: 'Tiempo de espera (min)', tipo: 'entero' },
          { id: 'cobertura', etiqueta: 'Cubierto por el seguro' },
          { id: 'copago', etiqueta: 'Copago del paciente' },
          { id: 'total', etiqueta: 'Valor de la consulta', fuerte: true }
        ],
        reglas: [
          {
            id: 'espera-coherente', mensaje: 'La hora de inicio no puede ser anterior a la hora de llegada.',
            validar: function (d) { return !d.horaLlegada || !d.horaInicio || esperaMin(d) !== null; }
          },
          {
            id: 'medico-activo', mensaje: 'El médico elegido no está activo.',
            validar: function (d, ctx) {
              var m = ctx.datos.obtener('medicos', d.medico);
              return !!m && m.activo !== false;
            }
          },
          {
            id: 'especialidad-compatible', mensaje: 'La especialidad del médico no corresponde al paciente (Ginecología y Obstetricia solo para mujeres; Pediatría solo para menores de la edad máxima).',
            validar: function (d, ctx) {
              var m = ctx.datos.obtener('medicos', d.medico), p = ctx.datos.obtener('pacientes', d.paciente), edad;
              if (!m || !p) { return true; }
              if ((m.especialidad === 'Ginecología y obstetricia' || m.especialidad === 'Obstetricia') && p.sexo !== 'Femenino') { return false; }
              if (m.especialidad === 'Pediatría') {
                edad = edadDe(p, ctx);
                return edad !== null && edad < ctx.param('edadMaxPediatria');
              }
              return true;
            }
          }
        ],
        alEmitir: function (doc, ctx) {
          var parche = {};
          if (!doc.diagnostico) { throw new Error('Para dar la atención por realizada hay que registrar el diagnóstico principal.'); }
          if (doc.fecha > ctx.hoy()) { throw new Error('No se puede dar por atendida una cita con fecha futura (' + ctx.fmt.fecha(doc.fecha) + ').'); }
          /* Triaje: el peso y la talla de hoy pasan a la ficha del paciente. */
          if (doc.pesoKg) { parche.pesoKg = doc.pesoKg; }
          if (doc.tallaCm) { parche.tallaCm = doc.tallaCm; }
          if (parche.pesoKg || parche.tallaCm) { ctx.datos.actualizar('pacientes', doc.paciente, parche); }
        },
        permisos: { ver: ['admin', 'director', 'medico', 'enfermeria', 'admision', 'auditor'], crear: ['admin', 'medico', 'enfermeria', 'admision'], editar: ['admin', 'medico', 'enfermeria', 'admision'], emitir: ['admin', 'medico'], anular: ['admin', 'director'] }
      },
      {
        id: 'recetas', nombre: 'Receta', plural: 'Recetas y dispensación', prefijo: 'REC', serie: 'RX01',
        campos: [
          { id: 'fecha', etiqueta: 'Fecha', tipo: 'fecha', requerido: true, defecto: 'hoy', max: 'hoy' },
          { id: 'paciente', etiqueta: 'Paciente', tipo: 'ref', entidad: 'pacientes', mostrar: 'nombre', requerido: true },
          { id: 'medico', etiqueta: 'Médico que receta', tipo: 'ref', entidad: 'medicos', mostrar: 'nombre', requerido: true },
          { id: 'diagnostico', etiqueta: 'Diagnóstico (CIE-10)', tipo: 'ref', entidad: 'diagnosticos', mostrar: 'descripcion', requerido: true },
          { id: 'pesoKg', etiqueta: 'Peso del paciente hoy (kg)', tipo: 'numero', min: 0.5, max: 250, ayuda: 'Obligatorio en menores si la ficha no tiene el peso: la dosis se limita por peso.' },
          { id: 'observaciones', etiqueta: 'Indicaciones al paciente', tipo: 'textarea', max: 300 }
        ],
        lista: ['fecha', 'paciente', 'medico', 'diagnostico'],
        estados: ['Borrador', 'Dispensada', 'Anulada'],
        lineas: {
          entidad: 'medicamentos', mostrar: 'nombre', precio: 'precio',
          campos: [
            { id: 'cantidad', etiqueta: 'Unidades', tipo: 'entero', min: 1, max: 600, requerido: true, defecto: 1 },
            { id: 'dias', etiqueta: 'Días de tratamiento', tipo: 'entero', min: 1, max: 90, requerido: true, defecto: 5 }
          ],
          info: function (item, ctx) {
            var venc = item.vencimiento ? ' · Vence: ' + ctx.fmt.fecha(item.vencimiento) : '';
            return 'Stock: ' + item.stock + ' u.' + venc + (item.dosisMaxMgKgDia > 0 ? ' · Máx. pediátrico: ' + item.dosisMaxMgKgDia + ' mg/kg/día' : ' · Sin dosis pediátrica');
          }
        },
        calcular: function (doc, ctx) {
          var pac = doc.paciente ? ctx.datos.obtener('pacientes', doc.paciente) : null;
          var seg = pac && pac.seguro ? ctx.datos.obtener('seguros', pac.seguro) : null;
          var valor = ctx.redondear(ctx.suma(doc.lineas, function (l) { return l.cantidad * l.precio; }));
          var cobertura = seg ? ctx.redondear(valor * (seg.coberturaMedicamentosPct || 0) / 100) : 0;
          return { total: valor, cobertura: cobertura, copago: ctx.redondear(valor - cobertura) };
        },
        totales: [
          { id: 'total', etiqueta: 'Valor de los medicamentos' },
          { id: 'cobertura', etiqueta: 'Cubierto por el seguro' },
          { id: 'copago', etiqueta: 'Paga el paciente', fuerte: true }
        ],
        reglas: [
          {
            id: 'menor-con-peso', mensaje: 'Para recetar a un menor hace falta su peso (en la ficha o en esta receta).',
            validar: function (d, ctx) {
              var p = ctx.datos.obtener('pacientes', d.paciente), edad;
              if (!p) { return true; }
              edad = edadDe(p, ctx);
              return edad === null || edad >= ctx.param('edadPediatrica') || !!(d.pesoKg || p.pesoKg);
            }
          },
          {
            id: 'dosis-pediatrica', mensaje: 'En menores la dosis diaria no puede superar el máximo por peso (mg/kg/día) y el medicamento debe tener dosis pediátrica definida.',
            validar: function (d, ctx) {
              var p = ctx.datos.obtener('pacientes', d.paciente), edad, peso, i, l, m, mgDia;
              if (!p) { return true; }
              edad = edadDe(p, ctx);
              if (edad === null || edad >= ctx.param('edadPediatrica')) { return true; }
              peso = d.pesoKg || p.pesoKg;
              if (!peso) { return true; }
              for (i = 0; i < (d.lineas || []).length; i++) {
                l = d.lineas[i];
                m = ctx.datos.obtener('medicamentos', l.item);
                if (!m) { continue; }
                if (!(m.dosisMaxMgKgDia > 0)) { return false; }
                /* Dosis diaria = unidades por día × mg por unidad; el tope es peso × mg/kg/día. */
                mgDia = l.cantidad / (l.dias || 1) * m.mgPorUnidad;
                if (mgDia > peso * m.dosisMaxMgKgDia + 1e-9) { return false; }
              }
              return true;
            }
          }
        ],
        alEmitir: function (doc, ctx) {
          var i, l, m;
          for (i = 0; i < doc.lineas.length; i++) {
            l = doc.lineas[i];
            m = ctx.datos.obtener('medicamentos', l.item);
            if (m.vencimiento && m.vencimiento < doc.fecha) { throw new Error('«' + m.nombre + '» está vencido (venció el ' + ctx.fmt.fecha(m.vencimiento) + ') y no se puede dispensar.'); }
            if (m.stock < l.cantidad) { throw new Error('Stock insuficiente de «' + m.nombre + '»: hay ' + m.stock + ' y se piden ' + l.cantidad + '.'); }
          }
          for (i = 0; i < doc.lineas.length; i++) {
            l = doc.lineas[i];
            m = ctx.datos.obtener('medicamentos', l.item);
            ctx.datos.actualizar('medicamentos', l.item, { stock: m.stock - l.cantidad });
          }
        },
        alAnular: function (doc, ctx) {
          var i, l, m;
          for (i = 0; i < doc.lineas.length; i++) {
            l = doc.lineas[i];
            m = ctx.datos.obtener('medicamentos', l.item);
            ctx.datos.actualizar('medicamentos', l.item, { stock: m.stock + l.cantidad });
          }
        },
        permisos: { ver: ['admin', 'director', 'medico', 'farmacia', 'auditor'], crear: ['admin', 'medico'], editar: ['admin', 'medico'], emitir: ['admin', 'farmacia'], anular: ['admin', 'director'] }
      }
    ],

    /* ------------------------------ Reportes ------------------------------ */
    reportes: [
      {
        id: 'atenciones-especialidad', titulo: 'Atenciones por especialidad',
        descripcion: 'Atenciones realizadas (atendidas o derivadas) agrupadas por la especialidad del médico, con pacientes distintos, valor de las consultas y lo que pagó el paciente frente a lo que cubrió el seguro.',
        roles: ['admin', 'director', 'medico', 'auditor'],
        parametros: [
          { id: 'desde', etiqueta: 'Desde', tipo: 'fecha', requerido: true, defecto: '@-180' },
          { id: 'hasta', etiqueta: 'Hasta', tipo: 'fecha', requerido: true, defecto: 'hoy' }
        ],
        ejecutar: function (p, ctx) {
          var atenciones = atencionesDadas(ctx, p.desde, p.hasta), grupos = ctx.agrupar(atenciones, function (a) { var m = ctx.datos.obtener('medicos', a.medico); return m ? m.especialidad : 'Sin especialidad'; });
          var filas = [], etiquetas = [], valores = [], k, g, pacientes, i, copago = 0;
          for (k in grupos) {
            if (grupos.hasOwnProperty(k)) {
              g = grupos[k];
              pacientes = {};
              for (i = 0; i < g.length; i++) { pacientes[g[i].paciente] = true; }
              filas.push([k, g.length, contarClaves(pacientes), ctx.redondear(ctx.suma(g, function (a) { return a.totales.total; })), ctx.redondear(ctx.suma(g, function (a) { return a.totales.copago; })), ctx.redondear(ctx.suma(g, function (a) { return a.totales.cobertura; })), g.filter(function (a) { return a.estado === 'Derivada'; }).length]);
              copago += ctx.suma(g, function (a) { return a.totales.copago; });
            }
          }
          filas.sort(function (a, b) { return b[1] - a[1]; });
          for (i = 0; i < filas.length; i++) { etiquetas.push(filas[i][0]); valores.push(filas[i][1]); }
          return {
            columnas: ['Especialidad', 'Atenciones', 'Pacientes distintos', 'Valor de las consultas', 'Pagado por pacientes', 'Cubierto por seguros', 'Derivadas'],
            tipos: ['texto', 'entero', 'entero', 'moneda', 'moneda', 'moneda', 'entero'], filas: filas,
            grafico: { tipo: 'barras', etiquetas: etiquetas, valores: valores, formato: 'entero' },
            resumen: [
              { etiqueta: 'Atenciones', valor: atenciones.length, tipo: 'entero' },
              { etiqueta: 'Copagos recaudados', valor: ctx.redondear(copago), tipo: 'moneda' },
              { etiqueta: 'Especialidades con atención', valor: filas.length, tipo: 'entero' }
            ]
          };
        }
      },
      {
        id: 'morbilidad', titulo: 'Morbilidad por diagnóstico',
        descripcion: 'Los diagnósticos más frecuentes (CIE-10 de ejemplo) en las atenciones realizadas, con su grupo, el número de casos, el porcentaje y cuántos son menores de 18 años.',
        roles: ['admin', 'director', 'medico', 'auditor'],
        parametros: [
          { id: 'desde', etiqueta: 'Desde', tipo: 'fecha', requerido: true, defecto: '@-180' },
          { id: 'hasta', etiqueta: 'Hasta', tipo: 'fecha', requerido: true, defecto: 'hoy' },
          { id: 'top', etiqueta: 'Cantidad de diagnósticos', tipo: 'entero', min: 1, max: 50, requerido: true, defecto: 15 }
        ],
        ejecutar: function (p, ctx) {
          var atenciones = atencionesDadas(ctx, p.desde, p.hasta).filter(function (a) { return !!a.diagnostico; }), grupos = ctx.agrupar(atenciones, function (a) { return a.diagnostico; });
          var filas = [], etiquetas = [], valores = [], k, g, d, menores, i, pac, edad;
          for (k in grupos) {
            if (grupos.hasOwnProperty(k)) {
              g = grupos[k];
              d = ctx.datos.obtener('diagnosticos', k);
              menores = 0;
              for (i = 0; i < g.length; i++) {
                pac = ctx.datos.obtener('pacientes', g[i].paciente);
                edad = pac ? edadEn(pac.fechaNacimiento, g[i].fecha) : null;
                if (edad !== null && edad < 18) { menores += 1; }
              }
              filas.push([d ? d.codigo : k, d ? d.descripcion : '', d ? d.capitulo : '', g.length, ctx.redondear(g.length / atenciones.length * 100), menores]);
            }
          }
          filas.sort(function (a, b) { return b[3] - a[3]; });
          filas = filas.slice(0, p.top || 15);
          for (i = 0; i < filas.length; i++) { etiquetas.push(filas[i][0] + ' ' + filas[i][1]); valores.push(filas[i][3]); }
          return {
            columnas: ['Código', 'Diagnóstico', 'Grupo', 'Casos', '% del total', 'Menores de 18'], tipos: ['texto', 'texto', 'texto', 'entero', 'porcentaje', 'entero'], filas: filas,
            grafico: { tipo: 'barras', etiquetas: etiquetas, valores: valores, formato: 'entero' },
            resumen: [
              { etiqueta: 'Atenciones con diagnóstico', valor: atenciones.length, tipo: 'entero' },
              { etiqueta: 'Diagnósticos distintos', valor: contarClaves(grupos), tipo: 'entero' },
              { etiqueta: 'Casos en menores de 18', valor: ctx.suma(filas, function (f) { return f[5]; }), tipo: 'entero' }
            ]
          };
        }
      },
      {
        id: 'consumo-medicamentos', titulo: 'Consumo de medicamentos',
        descripcion: 'Unidades dispensadas por medicamento en las recetas dispensadas del periodo, su valor, el stock actual y para cuántos días alcanza al ritmo de consumo del periodo.',
        roles: ['admin', 'director', 'farmacia', 'auditor'],
        parametros: [
          { id: 'desde', etiqueta: 'Desde', tipo: 'fecha', requerido: true, defecto: '@-90' },
          { id: 'hasta', etiqueta: 'Hasta', tipo: 'fecha', requerido: true, defecto: 'hoy' }
        ],
        ejecutar: function (p, ctx) {
          var recetas = ctx.datos.listar('recetas', function (r) { return r.estado === 'Dispensada' && r.fecha >= p.desde && r.fecha <= p.hasta; });
          var acum = {}, i, j, l, k, m, filas = [], etiquetas = [], valores = [], dias = Math.max(1, ctx.diasEntre(p.desde, p.hasta) + 1), valorTotal = 0, a, diario;
          for (i = 0; i < recetas.length; i++) {
            for (j = 0; j < recetas[i].lineas.length; j++) {
              l = recetas[i].lineas[j];
              if (!acum[l.item]) { acum[l.item] = { unidades: 0, valor: 0 }; }
              acum[l.item].unidades += l.cantidad;
              acum[l.item].valor += l.cantidad * l.precio;
            }
          }
          for (k in acum) {
            if (acum.hasOwnProperty(k)) {
              a = acum[k];
              m = ctx.datos.obtener('medicamentos', k);
              diario = a.unidades / dias;
              filas.push([m ? m.nombre : k, a.unidades, ctx.redondear(a.valor), m ? m.stock : 0, ctx.redondear(diario), m && diario > 0 ? Math.floor(m.stock / diario) : null]);
              valorTotal += a.valor;
            }
          }
          filas.sort(function (x, y) { return y[1] - x[1]; });
          for (i = 0; i < filas.length && i < 10; i++) { etiquetas.push(filas[i][0]); valores.push(filas[i][1]); }
          return {
            columnas: ['Medicamento', 'Unidades dispensadas', 'Valor', 'Stock actual', 'Consumo diario', 'Días de cobertura'], tipos: ['texto', 'entero', 'moneda', 'entero', 'numero', 'entero'], filas: filas,
            grafico: { tipo: 'barras', etiquetas: etiquetas, valores: valores, formato: 'entero' },
            resumen: [
              { etiqueta: 'Recetas dispensadas', valor: recetas.length, tipo: 'entero' },
              { etiqueta: 'Unidades dispensadas', valor: ctx.suma(filas, function (f) { return f[1]; }), tipo: 'entero' },
              { etiqueta: 'Valor dispensado', valor: ctx.redondear(valorTotal), tipo: 'moneda' }
            ]
          };
        }
      },
      {
        id: 'tiempos-espera', titulo: 'Tiempos de espera',
        descripcion: 'Minutos entre la llegada del paciente y el inicio de su atención, por especialidad: promedio, máximo y porcentaje de atenciones que superan la espera máxima de Configuración. Solo cuentan las atenciones con ambas horas registradas.',
        roles: ['admin', 'director', 'enfermeria', 'auditor'],
        parametros: [
          { id: 'desde', etiqueta: 'Desde', tipo: 'fecha', requerido: true, defecto: '@-180' },
          { id: 'hasta', etiqueta: 'Hasta', tipo: 'fecha', requerido: true, defecto: 'hoy' }
        ],
        ejecutar: function (p, ctx) {
          var medidas = atencionesDadas(ctx, p.desde, p.hasta).filter(function (a) { return esperaMin(a) !== null; }), grupos = ctx.agrupar(medidas, function (a) { var m = ctx.datos.obtener('medicos', a.medico); return m ? m.especialidad : 'Sin especialidad'; });
          var filas = [], etiquetas = [], valores = [], k, g, esperas, i, tope = ctx.param('esperaMaxMin'), sobre, total = 0, totalSobre = 0, mx;
          for (k in grupos) {
            if (grupos.hasOwnProperty(k)) {
              g = grupos[k];
              esperas = g.map(function (a) { return esperaMin(a); });
              sobre = esperas.filter(function (e) { return e > tope; }).length;
              mx = 0;
              for (i = 0; i < esperas.length; i++) { if (esperas[i] > mx) { mx = esperas[i]; } }
              filas.push([k, g.length, ctx.redondear(ctx.suma(esperas) / g.length), mx, sobre, ctx.redondear(sobre / g.length * 100)]);
              total += ctx.suma(esperas);
              totalSobre += sobre;
            }
          }
          filas.sort(function (a, b) { return b[2] - a[2]; });
          for (i = 0; i < filas.length; i++) { etiquetas.push(filas[i][0]); valores.push(filas[i][2]); }
          return {
            columnas: ['Especialidad', 'Atenciones medidas', 'Espera promedio (min)', 'Espera máxima (min)', 'Sobre el límite', '% sobre el límite'], tipos: ['texto', 'entero', 'numero', 'entero', 'entero', 'porcentaje'], filas: filas,
            grafico: { tipo: 'barras', etiquetas: etiquetas, valores: valores, formato: 'numero' },
            resumen: [
              { etiqueta: 'Espera promedio (min)', valor: medidas.length ? ctx.redondear(total / medidas.length) : 0, tipo: 'numero' },
              { etiqueta: 'Atenciones sobre el límite', valor: totalSobre, tipo: 'entero' },
              { etiqueta: '% sobre el límite', valor: medidas.length ? ctx.redondear(totalSobre / medidas.length * 100) : 0, tipo: 'porcentaje' }
            ]
          };
        }
      },
      {
        id: 'citas-no-atendidas', titulo: 'Citas no atendidas',
        descripcion: 'Citas anuladas (no asistió o canceladas) y citas programadas cuya fecha ya pasó sin atenderse, con los datos de contacto del paciente para el seguimiento.',
        parametros: [
          { id: 'desde', etiqueta: 'Desde', tipo: 'fecha', requerido: true, defecto: '@-180' },
          { id: 'hasta', etiqueta: 'Hasta', tipo: 'fecha', requerido: true, defecto: 'hoy' }
        ],
        ejecutar: function (p, ctx) {
          var citas = ctx.datos.listar('atenciones', function (a) { return esNoAtendida(a, ctx) && a.fecha >= p.desde && a.fecha <= p.hasta; });
          var filas = [], i, a, pac, med, seg, conteo = { 'No asistió': 0, 'Cancelada o reprogramada': 0, 'Programada vencida sin atender': 0 }, tipo;
          citas.sort(function (x, y) { return y.fecha < x.fecha ? -1 : (y.fecha > x.fecha ? 1 : 0); });
          for (i = 0; i < citas.length; i++) {
            a = citas[i];
            pac = ctx.datos.obtener('pacientes', a.paciente);
            med = ctx.datos.obtener('medicos', a.medico);
            seg = pac ? ctx.datos.obtener('seguros', pac.seguro) : null;
            tipo = motivoNoAtencion(a);
            conteo[tipo] += 1;
            filas.push([a.fecha, pac ? pac.nombre : a.paciente, pac ? pac.dni : '', pac ? pac.telefono || '' : '', seg ? seg.nombre : '', med ? med.nombre : '', tipo]);
          }
          return {
            columnas: ['Fecha', 'Paciente', 'DNI', 'Teléfono', 'Seguro', 'Médico', 'Situación'], tipos: ['fecha', 'texto', 'texto', 'texto', 'texto', 'texto', 'texto'], filas: filas,
            grafico: { tipo: 'columnas', etiquetas: ['No asistió', 'Cancelada', 'Vencida sin atender'], valores: [conteo['No asistió'], conteo['Cancelada o reprogramada'], conteo['Programada vencida sin atender']], formato: 'entero' },
            resumen: [
              { etiqueta: 'Citas no atendidas', valor: citas.length, tipo: 'entero' },
              { etiqueta: 'No asistieron', valor: conteo['No asistió'], tipo: 'entero' },
              { etiqueta: 'Vencidas sin atender', valor: conteo['Programada vencida sin atender'], tipo: 'entero' }
            ]
          };
        }
      }
    ],

    /* ------------------------------ Tablero ------------------------------ */
    tablero: [
      {
        titulo: 'Atenciones de los últimos 30 días', tipo: 'entero',
        calcular: function (ctx) { return atencionesDadas(ctx, ctx.fechaMas(ctx.hoy(), -29), ctx.hoy()).length; }
      },
      {
        titulo: 'Espera promedio (30 días, minutos)', tipo: 'numero', roles: ['admin', 'director', 'enfermeria', 'auditor'],
        calcular: function (ctx) {
          var esperas = atencionesDadas(ctx, ctx.fechaMas(ctx.hoy(), -29), ctx.hoy()).map(function (a) { return esperaMin(a); }).filter(function (e) { return e !== null; });
          return esperas.length ? ctx.redondear(ctx.suma(esperas) / esperas.length) : null;
        }
      },
      {
        titulo: 'Citas no atendidas (30 días)', tipo: 'porcentaje', roles: ['admin', 'director', 'admision', 'auditor'],
        nota: 'Sobre todas las citas con fecha en el periodo',
        calcular: function (ctx) {
          var desde = ctx.fechaMas(ctx.hoy(), -29), citas = ctx.datos.listar('atenciones', function (a) { return a.fecha >= desde && a.fecha <= ctx.hoy(); }), no = citas.filter(function (a) { return esNoAtendida(a, ctx); }).length;
          return citas.length ? ctx.redondear(no / citas.length * 100) : null;
        }
      },
      {
        titulo: 'Medicamentos bajo el stock mínimo', tipo: 'entero', roles: ['admin', 'director', 'farmacia', 'auditor'],
        calcular: function (ctx) { return ctx.datos.listar('medicamentos', function (m) { return m.activo !== false && m.stock <= m.stockMin; }).length; }
      },
      {
        titulo: 'Medicamentos vencidos o por vencer', tipo: 'entero', roles: ['admin', 'director', 'farmacia', 'auditor'],
        calcular: function (ctx) {
          return ctx.datos.listar('medicamentos', function (m) { var s = situacionMedicamento(m, ctx); return m.activo !== false && (s === 'Vencido' || s === 'Por vencer'); }).length;
        }
      },
      {
        titulo: 'Copagos recaudados (30 días)', tipo: 'moneda', roles: ['admin', 'director', 'auditor'],
        calcular: function (ctx) {
          return ctx.redondear(ctx.suma(atencionesDadas(ctx, ctx.fechaMas(ctx.hoy(), -29), ctx.hoy()), function (a) { return a.totales.copago; }));
        }
      }
    ],

    tableroGrafico: {
      titulo: 'Atenciones realizadas en los últimos 6 meses', tipo: 'columnas', formato: 'entero',
      calcular: function (ctx) {
        var meses = ultimosMeses(ctx, 6), atenciones = atencionesDadas(ctx, meses[0] + '-01', ctx.hoy()), g = ctx.agrupar(atenciones, function (a) { return ctx.mes(a.fecha); }), etiquetas = [], valores = [], i;
        for (i = 0; i < meses.length; i++) {
          etiquetas.push(MESES[parseInt(meses[i].slice(5, 7), 10) - 1]);
          valores.push((g[meses[i]] || []).length);
        }
        return { etiquetas: etiquetas, valores: valores };
      }
    },

    /* ------------------------------ Semillas ------------------------------ */
    semillas: {
      seguros: [
        { id: 'SEG-0001', nombre: 'Particular (sin seguro)', tipo: 'Ninguno', coberturaConsultaPct: 0, copagoFijo: 0, coberturaMedicamentosPct: 0 },
        { id: 'SEG-0002', nombre: 'SIS (Seguro Integral de Salud)', tipo: 'Público', coberturaConsultaPct: 100, copagoFijo: 0, coberturaMedicamentosPct: 100 },
        { id: 'SEG-0003', nombre: 'EsSalud (convenio de referencia)', tipo: 'Público', coberturaConsultaPct: 100, copagoFijo: 0, coberturaMedicamentosPct: 70 },
        { id: 'SEG-0004', nombre: 'EPS Vida Andina · Plan Estándar', tipo: 'Privado', coberturaConsultaPct: 80, copagoFijo: 15, coberturaMedicamentosPct: 70 },
        { id: 'SEG-0005', nombre: 'EPS Salud Familiar · Plan Premium', tipo: 'Privado', coberturaConsultaPct: 90, copagoFijo: 10, coberturaMedicamentosPct: 80 },
        { id: 'SEG-0006', nombre: 'Convenio empresarial Los Cedros', tipo: 'Privado', coberturaConsultaPct: 70, copagoFijo: 25, coberturaMedicamentosPct: 60 }
      ],
      diagnosticos: [
        { id: 'DIA-0001', codigo: 'J00', descripcion: 'Rinofaringitis aguda (resfriado común)', capitulo: 'Respiratorio' },
        { id: 'DIA-0002', codigo: 'J06.9', descripcion: 'Infección aguda de las vías respiratorias superiores', capitulo: 'Respiratorio' },
        { id: 'DIA-0003', codigo: 'J20.9', descripcion: 'Bronquitis aguda', capitulo: 'Respiratorio' },
        { id: 'DIA-0004', codigo: 'A09', descripcion: 'Diarrea y gastroenteritis de presunto origen infeccioso', capitulo: 'Infeccioso' },
        { id: 'DIA-0005', codigo: 'K29.7', descripcion: 'Gastritis, no especificada', capitulo: 'Digestivo' },
        { id: 'DIA-0006', codigo: 'E11.9', descripcion: 'Diabetes mellitus tipo 2 sin complicaciones', capitulo: 'Endocrino y metabólico' },
        { id: 'DIA-0007', codigo: 'I10', descripcion: 'Hipertensión esencial (primaria)', capitulo: 'Cardiovascular' },
        { id: 'DIA-0008', codigo: 'N39.0', descripcion: 'Infección de vías urinarias, sitio no especificado', capitulo: 'Genitourinario' },
        { id: 'DIA-0009', codigo: 'L30.9', descripcion: 'Dermatitis, no especificada', capitulo: 'Piel' },
        { id: 'DIA-0010', codigo: 'M54.5', descripcion: 'Lumbago no especificado', capitulo: 'Musculoesquelético' },
        { id: 'DIA-0011', codigo: 'K02.1', descripcion: 'Caries de la dentina', capitulo: 'Salud bucal' },
        { id: 'DIA-0012', codigo: 'Z34.9', descripcion: 'Supervisión de embarazo normal, no especificado', capitulo: 'Embarazo y parto' },
        { id: 'DIA-0013', codigo: 'E66.9', descripcion: 'Obesidad, no especificada', capitulo: 'Endocrino y metabólico' },
        { id: 'DIA-0014', codigo: 'D50.9', descripcion: 'Anemia por deficiencia de hierro, sin otra especificación', capitulo: 'Sangre' },
        { id: 'DIA-0015', codigo: 'R51', descripcion: 'Cefalea', capitulo: 'Síntomas generales' }
      ],
      pacientes: armarPacientes(),
      medicos: armarMedicos(),
      medicamentos: armarMedicamentos(),
      atenciones: armarAtenciones(),
      recetas: armarRecetas()
    }
  };

  /* Cuenta las claves propias de un objeto. */
  function contarClaves(obj) {
    var n = 0, k;
    for (k in obj) { if (obj.hasOwnProperty(k)) { n += 1; } }
    return n;
  }
})();
