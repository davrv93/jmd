/*
 * Laboratorio de Redes Andino · Instituto superior tecnológico (sur del Perú)
 * ----------------------------------------------------------------------------
 * Configuración del sistema de práctica «lab-redes». Es lo ÚNICO que cambia
 * entre sistemas: el núcleo (nucleo/js) lee este archivo y arma la aplicación.
 * Los datos son inventados (DNI de ejemplo, direcciones IP privadas y dominios
 * .example.pe) y no corresponden a personas ni empresas reales. Todo el código
 * es ES5 (sin flechas, let, const ni plantillas).
 *
 * Fórmulas del rubro:
 *   Subred (IPv4)   = dirección de red, máscara, difusión, primer y último host, hosts útiles
 *                     (/31 y /32 siguen la RFC 3021: sin difusión; /31 = 2 hosts, /32 = 1)
 *   Depreciación    = (valor − residual) / vida útil por año, en línea recta, hasta el valor residual
 *   Ocupación       = horas reservadas / (horas de apertura por semana × días / 7)
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

  /* Un entero de 0 a 255. */
  function esOcteto(n) { return typeof n === 'number' && n >= 0 && n <= 255 && Math.floor(n) === n; }

  /* Pasa un número de 32 bits (0 a 4294967295) a «a.b.c.d». No usa operadores de bits: en JavaScript serían con signo. */
  function numeroAIp(n) {
    return [Math.floor(n / 16777216) % 256, Math.floor(n / 65536) % 256, Math.floor(n / 256) % 256, n % 256].join('.');
  }

  /* Cálculo de una subred IPv4 a partir de una IP del segmento y el prefijo CIDR; null si los datos no son válidos. */
  function calcularSubred(a, b, c, d, prefijo) {
    var ip, tam, red, bc, primero, ultimo, hosts, difusion;
    if (!esOcteto(a) || !esOcteto(b) || !esOcteto(c) || !esOcteto(d) || typeof prefijo !== 'number' || Math.floor(prefijo) !== prefijo || prefijo < 0 || prefijo > 32) { return null; }
    ip = ((a * 256 + b) * 256 + c) * 256 + d;
    tam = Math.pow(2, 32 - prefijo);
    red = Math.floor(ip / tam) * tam;
    bc = red + tam - 1;
    if (prefijo === 32) { primero = red; ultimo = red; hosts = 1; difusion = 'No aplica (/32)'; }
    else if (prefijo === 31) { primero = red; ultimo = bc; hosts = 2; difusion = 'No aplica (/31)'; }
    else { primero = red + 1; ultimo = bc - 1; hosts = tam - 2; difusion = numeroAIp(bc); }
    return {
      red: numeroAIp(red), mascara: numeroAIp(4294967296 - tam), broadcast: difusion, primerHost: numeroAIp(primero), ultimoHost: numeroAIp(ultimo),
      hostsUtiles: hosts, cidr: numeroAIp(red) + '/' + prefijo, redNum: red, finNum: bc
    };
  }

  function subredDe(r) { return calcularSubred(r.ip1, r.ip2, r.ip3, r.ip4, r.prefijo); }

  /* ¿Dos rangos [inicio, fin] de direcciones comparten alguna? */
  function seSolapanRangos(a, b) { return a.redNum <= b.finNum && b.redNum <= a.finNum; }

  /* Depreciación lineal de un lote de equipos: devuelve la anual, la acumulada y el valor en libros (todo del lote). */
  function depreciacion(valorUnidad, residualUnidad, vidaAnios, antiguedadAnios, unidades) {
    var base = Math.max(0, (valorUnidad || 0) - (residualUnidad || 0)), anual = vidaAnios > 0 ? base / vidaAnios : 0, acum = Math.min(base, anual * Math.max(0, antiguedadAnios || 0)), u = unidades || 1;
    return { anual: anual * u, acumulada: acum * u, libros: ((valorUnidad || 0) - acum) * u, compra: (valorUnidad || 0) * u };
  }

  /* Antigüedad en años (días / 365) de un bien comprado en una fecha. */
  function antiguedadAnios(fechaCompra, ctx) {
    return fechaCompra ? Math.max(0, ctx.diasEntre(fechaCompra, ctx.hoy())) / 365 : 0;
  }

  /* Ocupación de un laboratorio: horas reservadas sobre las horas que estuvo abierto en el periodo. */
  function ocupacion(horasReservadas, horasSemana, dias) {
    var disponibles = horasSemana * dias / 7;
    return disponibles > 0 ? horasReservadas / disponibles * 100 : 0;
  }

  /* Reservas que ocupan el laboratorio (confirmadas o ya realizadas). */
  function reservasVigentes(ctx) {
    return ctx.datos.listar('reservas', function (r) { return r.estado === 'Reservada' || r.estado === 'Realizada'; });
  }

  function solapanHoras(iniA, finA, iniB, finB) { return iniA < finB && iniB < finA; }

  /* Fechas de las sesiones de una reserva: la primera y luego una por semana, a la misma hora. */
  function fechasSesiones(r, ctx) {
    var n = r.sesiones || 1, f = [], i;
    for (i = 0; i < n; i++) { f.push(ctx.fechaMas(r.fecha, 7 * i)); }
    return f;
  }

  function sesionesEnRango(r, desde, hasta, ctx) {
    var f = fechasSesiones(r, ctx), n = 0, i;
    for (i = 0; i < f.length; i++) { if ((!desde || f[i] >= desde) && (!hasta || f[i] <= hasta)) { n += 1; } }
    return n;
  }

  function horasPorSesion(r) { return Math.max(0, (r.horaFin || 0) - (r.horaInicio || 0)); }

  /* Horas de laboratorio que una reserva ocupa dentro de un rango de fechas. */
  function horasEn(r, desde, hasta, ctx) { return horasPorSesion(r) * sesionesEnRango(r, desde, hasta, ctx); }

  /* ¿Dos reservas coinciden en alguna fecha y en parte de su horario? */
  function reservasChocan(a, b, ctx) {
    var f, i, d;
    if (!solapanHoras(a.horaInicio, a.horaFin, b.horaInicio, b.horaFin)) { return false; }
    f = fechasSesiones(a, ctx);
    for (i = 0; i < f.length; i++) {
      d = ctx.diasEntre(b.fecha, f[i]);
      if (d >= 0 && d % 7 === 0 && d / 7 < (b.sesiones || 1)) { return true; }
    }
    return false;
  }

  function incidenciasVigentes(ctx, desde, hasta) {
    return ctx.datos.listar('incidencias', function (i) {
      return (i.estado === 'Abierta' || i.estado === 'En reparación' || i.estado === 'Resuelta') && (!desde || i.fecha >= desde) && (!hasta || i.fecha <= hasta);
    });
  }

  function incidenciasAbiertas(ctx) {
    return ctx.datos.listar('incidencias', function (i) { return i.estado === 'Abierta' || i.estado === 'En reparación'; });
  }

  /* Horas-equipo que un lote lleva acumuladas en sesiones ya dictadas (unidades × horas de cada sesión). */
  function horasUsoEquipo(e, ctx) {
    var rs = reservasVigentes(ctx), h = 0, i, j;
    for (i = 0; i < rs.length; i++) {
      for (j = 0; j < rs[i].lineas.length; j++) { if (rs[i].lineas[j].item === e.id) { h += horasEn(rs[i], null, ctx.hoy(), ctx) * rs[i].lineas[j].cantidad; } }
    }
    return Math.round(h);
  }

  /* Subredes que se vigilan por saturación: se excluyen los enlaces punto a punto y los loopback, que nacen llenos. */
  function subredSaturable(s) { return s.uso !== 'Enlace punto a punto' && s.uso !== 'Loopback'; }

  /* '@-n' para n ≥ 0 y '@n' para fechas futuras. */
  function rel(n) { return n >= 0 ? '@-' + n : '@' + (-n); }

  /* ---------- Datos de demostración ---------- */

  /* Equipo (lote): [código, nombre, tipo, marca, laboratorio, comprado hace (días), valor por unidad, residual por unidad, vida útil, unidades, costo de uso por hora, estado] */
  var EQUIPOS = [
    ['EQ-RTR-01', 'Router Cisco ISR 4331', 'Router', 'Cisco', 'LAB-0001', 1500, 5200, 520, 5, 6, 6.5, 'Operativo'],
    ['EQ-RTR-02', 'Router Cisco 2911', 'Router', 'Cisco', 'LAB-0001', 2400, 3800, 380, 5, 4, 3, 'Operativo'],
    ['EQ-SWT-01', 'Switch Cisco Catalyst 2960-24', 'Switch', 'Cisco', 'LAB-0001', 1700, 2100, 210, 5, 8, 2.5, 'Operativo'],
    ['EQ-SWT-02', 'Switch Cisco Catalyst 3650', 'Switch', 'Cisco', 'LAB-0002', 900, 6800, 680, 6, 2, 5.5, 'Operativo'],
    ['EQ-RTR-03', 'Router MikroTik RB4011', 'Router', 'MikroTik', 'LAB-0002', 600, 1450, 145, 5, 6, 1.8, 'Operativo'],
    ['EQ-SWT-03', 'Switch MikroTik CRS326', 'Switch', 'MikroTik', 'LAB-0002', 600, 980, 98, 5, 6, 1.2, 'Operativo'],
    ['EQ-APT-01', 'Punto de acceso Ubiquiti UniFi 6 Lite', 'Punto de acceso', 'Ubiquiti', 'LAB-0006', 420, 520, 52, 5, 10, 0.9, 'Operativo'],
    ['EQ-APT-02', 'Punto de acceso TP-Link EAP245', 'Punto de acceso', 'TP-Link', 'LAB-0006', 800, 410, 41, 5, 8, 0.7, 'Operativo'],
    ['EQ-SWT-04', 'Switch TP-Link TL-SG1024', 'Switch', 'TP-Link', 'LAB-0005', 1100, 330, 33, 5, 6, 0.5, 'Operativo'],
    ['EQ-FWL-01', 'Firewall Fortinet FortiGate 60F', 'Firewall', 'Fortinet', 'LAB-0003', 500, 3900, 390, 5, 4, 3.2, 'Operativo'],
    ['EQ-FWL-02', 'Firewall Cisco ASA 5506-X', 'Firewall', 'Cisco', 'LAB-0003', 2000, 3100, 310, 5, 2, 2.4, 'Operativo'],
    ['EQ-SRV-01', 'Servidor Dell PowerEdge R340', 'Servidor', 'Dell', 'LAB-0003', 1300, 8900, 890, 5, 2, 7, 'Operativo'],
    ['EQ-RTR-04', 'Router Huawei AR651', 'Router', 'Huawei', 'LAB-0004', 1200, 2600, 260, 5, 4, 2, 'Operativo'],
    ['EQ-SWT-05', 'Switch Huawei S5735-L', 'Switch', 'Huawei', 'LAB-0004', 1200, 1900, 190, 5, 4, 1.6, 'Operativo'],
    ['EQ-RAD-01', 'Antena y enlace de radio Ubiquiti airMAX', 'Enlace de radio', 'Ubiquiti', 'LAB-0004', 700, 750, 75, 5, 6, 0.8, 'Operativo'],
    ['EQ-PPN-01', 'Patch panel Cat6 de 24 puertos', 'Patch panel', 'Otra', 'LAB-0005', 1800, 190, 0, 10, 12, 0.2, 'Operativo'],
    ['EQ-HER-01', 'Kit de crimpado y probador de cable', 'Herramientas y medición', 'Fluke', 'LAB-0005', 900, 1650, 165, 5, 5, 0.6, 'Operativo'],
    ['EQ-HER-02', 'Equipo certificador de cableado Fluke', 'Herramientas y medición', 'Fluke', 'LAB-0005', 300, 28500, 2850, 8, 1, 15, 'Operativo'],
    ['EQ-RTR-05', 'Router Cisco ISR 1100', 'Router', 'Cisco', 'LAB-0001', 250, 1900, 190, 5, 6, 1.9, 'Operativo'],
    ['EQ-SWT-06', 'Switch Cisco Catalyst 9200L', 'Switch', 'Cisco', 'LAB-0002', 150, 7400, 740, 6, 2, 6, 'Operativo'],
    ['EQ-APT-03', 'Punto de acceso Cisco Aironet 2802', 'Punto de acceso', 'Cisco', 'LAB-0006', 2300, 1250, 125, 5, 4, 0.6, 'De baja'],
    ['EQ-SWT-07', 'Switch D-Link DGS-1210', 'Switch', 'D-Link', 'LAB-0001', 2600, 450, 45, 5, 5, 0.4, 'De baja'],
    ['EQ-SRV-02', 'Servidor Dell PowerEdge T140', 'Servidor', 'Dell', 'LAB-0004', 400, 5200, 520, 5, 1, 4, 'En mantenimiento'],
    ['EQ-RTR-06', 'Router MikroTik hAP ac2', 'Router', 'MikroTik', 'LAB-0006', 350, 220, 22, 4, 12, 0.3, 'Operativo']
  ];

  function armarEquipos() {
    var r = [], i, f, n;
    for (i = 0; i < EQUIPOS.length; i++) {
      f = EQUIPOS[i];
      n = i + 1;
      r.push({ id: 'EQP-' + (n < 10 ? '000' : '00') + n, codigo: f[0], nombre: f[1], tipo: f[2], marca: f[3], laboratorio: f[4], fechaCompra: rel(f[5]), valorCompra: f[6], valorResidual: f[7], vidaUtilAnios: f[8], unidades: f[9], tarifaHora: f[10], estado: f[11] });
    }
    return r;
  }

  /* Práctica: [código, nombre, curso, nivel, horas, equipos por grupo] */
  var PRACTICAS = [
    ['PR-CAB-01', 'Cableado estructurado: crimpado de cable UTP', 'Redes I', 'Básico', 2, 1],
    ['PR-RTR-01', 'Configuración básica de un router', 'Redes I', 'Básico', 2, 2],
    ['PR-DIR-01', 'Direccionamiento IPv4 y subredes', 'Redes I', 'Básico', 3, 2],
    ['PR-RTR-02', 'Enrutamiento estático', 'Redes I', 'Intermedio', 2, 3],
    ['PR-RTR-03', 'Enrutamiento dinámico con OSPF', 'Redes II', 'Avanzado', 4, 4],
    ['PR-SWT-01', 'VLAN y enlaces troncales', 'Redes II', 'Intermedio', 3, 3],
    ['PR-SEG-01', 'Seguridad de puertos en switches', 'Seguridad en redes', 'Intermedio', 2, 2],
    ['PR-SEG-02', 'Listas de control de acceso (ACL)', 'Seguridad en redes', 'Intermedio', 3, 3],
    ['PR-WIF-01', 'Redes inalámbricas: cobertura y canales', 'Telecomunicaciones', 'Básico', 3, 2],
    ['PR-SEG-03', 'Firewall perimetral y zona desmilitarizada', 'Seguridad en redes', 'Avanzado', 4, 3],
    ['PR-SEG-04', 'Túnel VPN entre sedes', 'Seguridad en redes', 'Avanzado', 4, 4],
    ['PR-RED-01', 'Redundancia de puerta de enlace con HSRP', 'Redes II', 'Avanzado', 3, 4],
    ['PR-MED-01', 'Medición de rendimiento con iperf', 'Administración de redes', 'Intermedio', 2, 2],
    ['PR-CAB-02', 'Certificación de enlaces de cobre', 'Redes I', 'Intermedio', 2, 1]
  ];

  function armarPracticas() {
    var r = [], i, f, n;
    for (i = 0; i < PRACTICAS.length; i++) {
      f = PRACTICAS[i];
      n = i + 1;
      r.push({ id: 'PRC-' + (n < 10 ? '000' : '00') + n, codigo: f[0], nombre: f[1], curso: f[2], nivel: f[3], duracionHoras: f[4], equiposPorGrupo: f[5] });
    }
    return r;
  }

  /* Subred: [nombre, laboratorio, VLAN, IP (4 números), prefijo, uso, equipos previstos, incorporada hace (días)] */
  var SUBREDES = [
    ['Gestión · Redes 1', 'LAB-0001', 10, [10, 10, 10, 1], 24, 'Gestión', 18, 170],
    ['Prácticas · Redes 1', 'LAB-0001', 20, [10, 10, 20, 1], 25, 'Laboratorio de práctica', 96, 170],
    ['Estudiantes · Redes 1', 'LAB-0001', 30, [10, 10, 30, 1], 26, 'Estudiantes', 52, 150],
    ['Gestión · Redes 2', 'LAB-0002', 10, [10, 10, 11, 1], 24, 'Gestión', 14, 170],
    ['Prácticas · Redes 2', 'LAB-0002', 20, [10, 10, 21, 1], 25, 'Laboratorio de práctica', 88, 170],
    ['Servidores · Seguridad', 'LAB-0003', 40, [10, 10, 40, 1], 27, 'Servidores', 20, 140],
    ['Estaciones · Seguridad', 'LAB-0003', 20, [10, 10, 41, 1], 26, 'Laboratorio de práctica', 40, 140],
    ['Gestión · Telecomunicaciones', 'LAB-0004', 10, [10, 20, 10, 1], 24, 'Gestión', 12, 120],
    ['Prácticas · Telecomunicaciones', 'LAB-0004', 20, [10, 20, 20, 1], 26, 'Laboratorio de práctica', 30, 120],
    ['Gestión · Cableado', 'LAB-0005', 10, [10, 30, 10, 1], 28, 'Gestión', 9, 100],
    ['Prácticas · Cableado', 'LAB-0005', 20, [10, 30, 20, 1], 27, 'Laboratorio de práctica', 20, 100],
    ['Gestión · Inalámbricas', 'LAB-0006', 10, [10, 40, 10, 1], 24, 'Gestión', 11, 90],
    ['Invitados · Inalámbricas', 'LAB-0006', 50, [10, 40, 50, 1], 25, 'Invitados', 60, 90],
    ['Enlace Arequipa – Cusco', 'LAB-0001', 100, [172, 16, 0, 1], 30, 'Enlace punto a punto', 2, 80],
    ['Enlace Arequipa – Puno', 'LAB-0001', 101, [172, 16, 0, 5], 31, 'Enlace punto a punto', 2, 80],
    ['Loopback del router de borde', 'LAB-0001', 99, [172, 16, 255, 1], 32, 'Loopback', 1, 80]
  ];

  function armarSubredes() {
    var r = [], i, f, n;
    for (i = 0; i < SUBREDES.length; i++) {
      f = SUBREDES[i];
      n = i + 1;
      r.push({ id: 'SUB-' + (n < 10 ? '000' : '00') + n, nombre: f[0], laboratorio: f[1], vlan: f[2], ip1: f[3][0], ip2: f[3][1], ip3: f[3][2], ip4: f[3][3], prefijo: f[4], uso: f[5], hostsPrevistos: f[6], fechaAlta: rel(f[7]) });
    }
    return r;
  }

  /* Prácticas que se dictan en cada laboratorio (posiciones en PRACTICAS). */
  var PRACTICAS_POR_LAB = {
    'LAB-0001': [1, 2, 3, 4, 5], 'LAB-0002': [4, 5, 11, 2], 'LAB-0003': [7, 6, 9, 10],
    'LAB-0004': [10, 12, 3], 'LAB-0005': [0, 13], 'LAB-0006': [8, 12]
  };
  var LABS = ['LAB-0001', 'LAB-0002', 'LAB-0003', 'LAB-0004', 'LAB-0005', 'LAB-0006'];
  var AFORO = { 'LAB-0001': 24, 'LAB-0002': 24, 'LAB-0003': 20, 'LAB-0004': 20, 'LAB-0005': 16, 'LAB-0006': 18 };
  /* Franjas de tres horas y días de la semana (lunes = 1 … sábado = 6). */
  var FRANJAS = [[8, 11], [11, 14], [14, 17], [17, 20]];
  var DOCENTES_ACTIVOS = 11;

  /* Días hacia atrás desde hoy hasta el último día de la semana pedida (0 = hoy o antes); así la primera sesión cae en el día correcto. */
  function diasAtrasHastaDia(minimo, diaSemana) {
    var n = minimo, d;
    for (;;) {
      d = new Date();
      d.setDate(d.getDate() - n);
      if (d.getDay() === diaSemana) { return n; }
      n += 1;
    }
  }

  /* Cada laboratorio dicta doce prácticas semanales (de 8 a 16 sesiones). Cada una tiene su propio día y franja: nunca chocan. */
  function armarReservas() {
    var r = [], j, l, lab, prac, pr, idsEq, eq, e, lineas, doc, franja, dia, inicio, sesiones, ultima, estado, usados, cant, n, num = 0, dispon;
    for (j = 0; j < 12; j++) {
      for (l = 0; l < LABS.length; l++) {
        lab = LABS[l];
        prac = PRACTICAS_POR_LAB[lab][(j + l) % PRACTICAS_POR_LAB[lab].length];
        pr = PRACTICAS[prac];
        franja = FRANJAS[j % 4];
        dia = ((j % 6) + l) % 6 + 1;
        inicio = diasAtrasHastaDia(175 - j * 14 - l * 3, dia);
        sesiones = 8 + (j % 5) * 2;
        ultima = inicio - 7 * (sesiones - 1);
        doc = (j * 5 + l * 2) % DOCENTES_ACTIVOS + 1;
        idsEq = [];
        for (e = 0; e < EQUIPOS.length; e++) { if (EQUIPOS[e][4] === lab && EQUIPOS[e][11] === 'Operativo') { idsEq.push(e); } }
        lineas = [];
        usados = {};
        for (e = 0; e < 3 && e < idsEq.length; e++) {
          eq = idsEq[(j + e) % idsEq.length];
          if (usados[eq]) { continue; }
          usados[eq] = true;
          dispon = EQUIPOS[eq][9];
          cant = Math.min(dispon, Math.max(1, pr[5] * (1 + (j + e) % 2)));
          lineas.push({ item: 'EQP-' + (eq + 1 < 10 ? '000' : '00') + (eq + 1), precio: EQUIPOS[eq][10], cantidad: cant });
        }
        estado = ultima >= 0 ? 'Realizada' : 'Reservada';
        if (j === 9 && l === 2) { estado = 'Cancelada'; }
        num += 1;
        n = { id: 'RSV-' + (num < 10 ? '000' : '00') + num, fecha: '@-' + inicio, laboratorio: lab, docente: 'DOC-' + (doc < 10 ? '000' : '00') + doc, practica: 'PRC-' + (prac + 1 < 10 ? '000' : '00') + (prac + 1), horaInicio: franja[0], horaFin: franja[1], sesiones: sesiones, alumnos: Math.min(AFORO[lab], 12 + (j * 5 + l * 3) % 12), estado: estado, lineas: lineas };
        if (estado === 'Cancelada') { n.observaciones = 'La coordinación canceló el bloque por cambio de horario del curso.'; }
        r.push(n);
      }
    }
    /* Bloques que empiezan en los próximos días (los dos últimos aún son solicitudes en borrador). */
    r.push({ id: 'RSV-0073', fecha: '@3', laboratorio: 'LAB-0001', docente: 'DOC-0001', practica: 'PRC-0005', horaInicio: 17, horaFin: 20, sesiones: 8, alumnos: 22, estado: 'Reservada', lineas: [{ item: 'EQP-0001', precio: 6.5, cantidad: 4 }, { item: 'EQP-0003', precio: 2.5, cantidad: 4 }] });
    r.push({ id: 'RSV-0074', fecha: '@4', laboratorio: 'LAB-0003', docente: 'DOC-0002', practica: 'PRC-0010', horaInicio: 8, horaFin: 11, sesiones: 6, alumnos: 16, estado: 'Reservada', lineas: [{ item: 'EQP-0010', precio: 3.2, cantidad: 3 }, { item: 'EQP-0012', precio: 7, cantidad: 1 }] });
    r.push({ id: 'RSV-0075', fecha: '@5', laboratorio: 'LAB-0002', docente: 'DOC-0010', practica: 'PRC-0012', horaInicio: 18, horaFin: 20, sesiones: 4, alumnos: 18, estado: 'Borrador', lineas: [{ item: 'EQP-0004', precio: 5.5, cantidad: 2 }, { item: 'EQP-0020', precio: 6, cantidad: 2 }] });
    r.push({ id: 'RSV-0076', fecha: '@6', laboratorio: 'LAB-0006', docente: 'DOC-0004', practica: 'PRC-0009', horaInicio: 20, horaFin: 22, sesiones: 1, alumnos: 15, estado: 'Borrador', lineas: [{ item: 'EQP-0007', precio: 0.9, cantidad: 4 }] });
    return r;
  }

  /* Incidencia: [días atrás, equipo, tipo, prioridad, descripción, unidades afectadas, horas de técnico, repuestos, horas parado, estado] */
  var INCIDENCIAS = [
    [172, 'EQP-0002', 'Falla de hardware', 'Alta', 'Dos routers no encienden: fuente de poder dañada.', 2, 3, 240, 72, 'Resuelta'],
    [158, 'EQP-0003', 'Cableado o puerto dañado', 'Media', 'Puertos 11 al 14 sin enlace en el switch del rack 1.', 1, 1.5, 0, 24, 'Resuelta'],
    [141, 'EQP-0012', 'Firmware o sistema operativo', 'Alta', 'El servidor no arranca tras una actualización del BIOS.', 1, 6, 0, 96, 'Resuelta'],
    [127, 'EQP-0007', 'Configuración perdida', 'Baja', 'Tres puntos de acceso volvieron a valores de fábrica.', 3, 1, 0, 8, 'Resuelta'],
    [110, 'EQP-0001', 'Daño por mal uso', 'Media', 'Cable de consola doblado y puerto serial roto en un router.', 1, 2, 85, 24, 'Resuelta'],
    [96, 'EQP-0013', 'Energía', 'Alta', 'Variación de voltaje apagó los routers del laboratorio de telecomunicaciones.', 4, 4, 0, 48, 'Resuelta'],
    [81, 'EQP-0010', 'Firmware o sistema operativo', 'Media', 'El firewall perdió la licencia de actualizaciones.', 1, 1, 0, 16, 'Resuelta'],
    [66, 'EQP-0016', 'Robo o pérdida', 'Alta', 'Faltan dos patch panel luego del cambio de rack.', 2, 2, 0, 0, 'Resuelta'],
    [49, 'EQP-0005', 'Falla de hardware', 'Crítica', 'Un router se reinicia solo cada pocos minutos.', 1, 5, 380, 56, 'Resuelta'],
    [33, 'EQP-0020', 'Configuración perdida', 'Media', 'Las VLAN del switch de núcleo no se guardaron al reiniciar.', 1, 2.5, 0, 12, 'Resuelta'],
    [21, 'EQP-0004', 'Cableado o puerto dañado', 'Baja', 'Puerto 48 con conector flojo.', 1, 0.5, 18, 4, 'En reparación'],
    [12, 'EQP-0023', 'Falla de hardware', 'Alta', 'El servidor de laboratorio presenta errores de disco.', 1, 4, 520, 40, 'En reparación'],
    [6, 'EQP-0008', 'Daño por mal uso', 'Media', 'Antena rota en un punto de acceso durante una práctica.', 1, 1, 60, 12, 'Abierta'],
    [3, 'EQP-0014', 'Energía', 'Media', 'Un switch no enciende; se sospecha de la fuente.', 1, 1, 0, 6, 'Abierta'],
    [1, 'EQP-0017', 'Robo o pérdida', 'Media', 'Falta una pinza de crimpado del kit.', 1, 0.5, 0, 0, 'Borrador']
  ];

  function armarIncidencias() {
    var r = [], i, f, n, docs = ['DOC-0001', 'DOC-0002', 'DOC-0003', 'DOC-0006', 'DOC-0009'];
    for (i = 0; i < INCIDENCIAS.length; i++) {
      f = INCIDENCIAS[i];
      n = i + 1;
      r.push({ id: 'INC-' + (n < 10 ? '000' : '00') + n, fecha: '@-' + f[0], equipo: f[1], tipo: f[2], prioridad: f[3], reportadoPor: docs[i % docs.length], descripcion: f[4], unidadesAfectadas: f[5], horasTecnico: f[6], costoRepuestos: f[7], horasParado: f[8], estado: f[9] });
    }
    return r;
  }

  /* ---------- Configuración del sistema ---------- */

  window.SISTEMA = {
    id: 'lab-redes',
    nombre: 'Laboratorio de Redes Andino',
    rubro: 'Laboratorio de redes de un instituto tecnológico',
    version: '1.0.0',
    moneda: 'S/',
    tema: { primario: '#146c43', acento: '#e0a100', siglas: 'LR' },

    parametros: [
      { id: 'ocupacionMeta', etiqueta: 'Meta de ocupación de los laboratorios', tipo: 'porcentaje', valor: 40, ayuda: 'Porcentaje de las horas de apertura que deberían estar reservadas.' },
      { id: 'umbralSubred', etiqueta: 'Alerta de ocupación de una subred', tipo: 'porcentaje', valor: 80, ayuda: 'Una subred con más equipos previstos que este porcentaje de sus hosts útiles se marca como saturada.' },
      { id: 'tarifaTecnicoHora', etiqueta: 'Costo de la hora de técnico', tipo: 'moneda', valor: 35, ayuda: 'Valoriza las horas de mano de obra de cada incidencia.' },
      { id: 'mantenimientoCadaHoras', etiqueta: 'Horas de uso entre mantenimientos preventivos', tipo: 'entero', valor: 400, ayuda: 'Cada cuántas horas de uso acumuladas un equipo debe pasar por mantenimiento.' }
    ],

    seguridad: {
      minClave: 6,
      intentosMax: 5,
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
      { id: 'coordinador', nombre: 'Coordinador de laboratorios', descripcion: 'Confirma y cancela reservas, administra equipos, laboratorios y el plan de direccionamiento, y ve valores y depreciación.' },
      { id: 'tecnico', nombre: 'Técnico de laboratorio', descripcion: 'Actualiza el estado de los equipos, registra incidencias y mantiene el plan de direccionamiento. No da de alta compras ni ve valores o docentes.' },
      { id: 'docente', nombre: 'Docente', descripcion: 'Solicita reservas para sus prácticas y reporta incidencias. No ve valores de equipos ni el plan de direccionamiento.' },
      { id: 'estudiante', nombre: 'Estudiante', descripcion: 'Consulta prácticas, laboratorios y reservas, y puede solicitar una reserva que luego confirma la coordinación.' },
      { id: 'auditor', nombre: 'Auditor', descripcion: 'Solo lectura de todo el negocio y de la bitácora. No crea ni modifica nada.' }
    ],

    usuarios: [
      { usuario: 'admin', nombre: 'Teodoro Velarde Quispe', rol: 'admin', clave: 'Admin#2026x' },
      { usuario: 'coordinador', nombre: 'Mirtha Sánchez Gutiérrez', rol: 'coordinador', clave: 'Coordina#2026x' },
      { usuario: 'tecnico', nombre: 'Elmer Choque Apaza', rol: 'tecnico', clave: 'Tecnico#2026x' },
      { usuario: 'docente', nombre: 'Edwin Cáceres Mamani', rol: 'docente', clave: 'Docente#2026x' },
      { usuario: 'estudiante', nombre: 'Camila Flores Huamán', rol: 'estudiante', clave: 'Alumno#2026x' },
      { usuario: 'auditor', nombre: 'Julia Bernedo Salas', rol: 'auditor', clave: 'Audita#2026x' }
    ],

    /* ------------------------------ Entidades ------------------------------ */
    entidades: [
      {
        id: 'equipos', nombre: 'Equipo', plural: 'Equipos', prefijo: 'EQP',
        campos: [
          { id: 'codigo', etiqueta: 'Código de inventario', tipo: 'texto', requerido: true, unico: true, max: 20, patron: '^[A-Z0-9-]+$', mensajePatron: 'Usa solo mayúsculas, números y guiones.' },
          { id: 'nombre', etiqueta: 'Equipo o modelo', tipo: 'texto', requerido: true, max: 80 },
          { id: 'tipo', etiqueta: 'Tipo', tipo: 'lista', requerido: true, opciones: ['Router', 'Switch', 'Punto de acceso', 'Firewall', 'Servidor', 'Patch panel', 'Enlace de radio', 'Herramientas y medición'] },
          { id: 'marca', etiqueta: 'Marca', tipo: 'lista', requerido: true, opciones: ['Cisco', 'MikroTik', 'Ubiquiti', 'TP-Link', 'Huawei', 'Dell', 'Fluke', 'Fortinet', 'D-Link', 'Otra'] },
          { id: 'laboratorio', etiqueta: 'Laboratorio donde está', tipo: 'ref', entidad: 'laboratorios', mostrar: 'nombre', requerido: true },
          { id: 'unidades', etiqueta: 'Unidades del lote', tipo: 'entero', min: 1, max: 100, requerido: true, defecto: 1, ayuda: 'Los equipos iguales comprados juntos se registran como un solo lote.' },
          { id: 'fechaCompra', etiqueta: 'Fecha de compra', tipo: 'fecha', requerido: true, max: 'hoy' },
          { id: 'valorCompra', etiqueta: 'Valor de compra por unidad', tipo: 'moneda', min: 1, requerido: true, ver: ['admin', 'coordinador', 'auditor'] },
          { id: 'valorResidual', etiqueta: 'Valor residual por unidad', tipo: 'moneda', min: 0, requerido: true, defecto: 0, ver: ['admin', 'coordinador', 'auditor'], ayuda: 'Lo que se espera recuperar al terminar su vida útil.' },
          { id: 'vidaUtilAnios', etiqueta: 'Vida útil (años)', tipo: 'entero', min: 1, max: 10, requerido: true, defecto: 5 },
          { id: 'tarifaHora', etiqueta: 'Costo de uso por hora (S/)', tipo: 'moneda', min: 0, requerido: true, defecto: 0, ayuda: 'Referencial: sirve para costear la reserva de un laboratorio.' },
          { id: 'estado', etiqueta: 'Estado', tipo: 'lista', requerido: true, opciones: ['Operativo', 'En mantenimiento', 'De baja'], defecto: 'Operativo' }
        ],
        lista: ['codigo', 'nombre', 'laboratorio', 'unidades', 'situacion', 'antiguedad', 'valorLibros'],
        buscar: ['codigo', 'nombre', 'tipo', 'marca'],
        calculados: [
          { id: 'antiguedad', etiqueta: 'Antigüedad (años)', tipo: 'numero', formula: function (r, ctx) { return ctx.redondear(antiguedadAnios(r.fechaCompra, ctx)); } },
          {
            id: 'depreciacionAnual', etiqueta: 'Depreciación anual del lote', tipo: 'moneda', ver: ['admin', 'coordinador', 'auditor'],
            formula: function (r, ctx) { return ctx.redondear(depreciacion(r.valorCompra, r.valorResidual, r.vidaUtilAnios, antiguedadAnios(r.fechaCompra, ctx), r.unidades).anual); }
          },
          {
            id: 'depreciacionAcumulada', etiqueta: 'Depreciación acumulada', tipo: 'moneda', ver: ['admin', 'coordinador', 'auditor'],
            formula: function (r, ctx) { return ctx.redondear(depreciacion(r.valorCompra, r.valorResidual, r.vidaUtilAnios, antiguedadAnios(r.fechaCompra, ctx), r.unidades).acumulada); }
          },
          {
            id: 'valorLibros', etiqueta: 'Valor en libros del lote', tipo: 'moneda', ver: ['admin', 'coordinador', 'auditor'],
            formula: function (r, ctx) { return ctx.redondear(depreciacion(r.valorCompra, r.valorResidual, r.vidaUtilAnios, antiguedadAnios(r.fechaCompra, ctx), r.unidades).libros); }
          },
          {
            id: 'situacion', etiqueta: 'Situación', tipo: 'texto',
            formula: function (r, ctx) {
              if (r.estado === 'De baja') { return 'De baja'; }
              var abiertas = ctx.datos.listar('incidencias', function (i) { return i.equipo === r.id && (i.estado === 'Abierta' || i.estado === 'En reparación'); }).length;
              return abiertas ? 'Con incidencia abierta' : r.estado;
            }
          },
          {
            id: 'horasUso', etiqueta: 'Horas-equipo de uso', tipo: 'entero',
            formula: function (r, ctx) { return horasUsoEquipo(r, ctx); }
          },
          {
            id: 'horasMantenimiento', etiqueta: 'Horas para el próximo mantenimiento', tipo: 'entero',
            formula: function (r, ctx) {
              var cada = ctx.param('mantenimientoCadaHoras');
              return cada > 0 ? cada - (horasUsoEquipo(r, ctx) % cada) : null;
            }
          }
        ],
        reglas: [
          { id: 'residual-menor', mensaje: 'El valor residual no puede superar al valor de compra.', validar: function (r) { return !(r.valorResidual > r.valorCompra); } }
        ],
        permisos: { ver: ['admin', 'coordinador', 'tecnico', 'docente', 'auditor'], crear: ['admin', 'coordinador'], editar: ['admin', 'coordinador', 'tecnico'], eliminar: ['admin'] }
      },
      {
        id: 'docentes', nombre: 'Docente', plural: 'Docentes', prefijo: 'DOC',
        campos: [
          { id: 'nombre', etiqueta: 'Nombre completo', tipo: 'texto', requerido: true, max: 80 },
          { id: 'dni', etiqueta: 'DNI', tipo: 'texto', requerido: true, unico: true, max: 8, patron: '^[0-9]{8}$', mensajePatron: 'El DNI tiene 8 dígitos.' },
          { id: 'especialidad', etiqueta: 'Especialidad', tipo: 'lista', requerido: true, opciones: ['Redes y comunicaciones', 'Seguridad informática', 'Telecomunicaciones', 'Sistemas operativos', 'Administración de redes'] },
          { id: 'certificacion', etiqueta: 'Certificación principal', tipo: 'lista', opciones: ['Ninguna', 'CCNA', 'CCNP', 'MTCNA', 'Network+', 'Security+'], defecto: 'Ninguna' },
          { id: 'condicion', etiqueta: 'Condición laboral', tipo: 'lista', requerido: true, opciones: ['Tiempo completo', 'Tiempo parcial', 'Por horas'], defecto: 'Tiempo completo' },
          { id: 'email', etiqueta: 'Correo institucional', tipo: 'email', max: 80 },
          { id: 'telefono', etiqueta: 'Teléfono', tipo: 'telefono' },
          { id: 'fechaIngreso', etiqueta: 'Fecha de ingreso', tipo: 'fecha', max: 'hoy' },
          { id: 'activo', etiqueta: 'Docente activo', tipo: 'booleano', defecto: true }
        ],
        lista: ['nombre', 'especialidad', 'certificacion', 'condicion', 'horas30', 'activo'],
        buscar: ['nombre', 'dni', 'especialidad', 'certificacion'],
        calculados: [
          {
            id: 'horas30', etiqueta: 'Horas reservadas (30 días)', tipo: 'numero',
            formula: function (r, ctx) {
              var desde = ctx.fechaMas(ctx.hoy(), -29);
              return ctx.redondear(ctx.suma(reservasVigentes(ctx), function (x) { return x.docente === r.id ? horasEn(x, desde, ctx.hoy(), ctx) : 0; }));
            }
          }
        ],
        permisos: { ver: ['admin', 'coordinador', 'auditor'], crear: ['admin', 'coordinador'], editar: ['admin', 'coordinador'], eliminar: ['admin'] }
      },
      {
        id: 'practicas', nombre: 'Práctica', plural: 'Prácticas', prefijo: 'PRC',
        campos: [
          { id: 'codigo', etiqueta: 'Código', tipo: 'texto', requerido: true, unico: true, max: 20, patron: '^[A-Z0-9-]+$', mensajePatron: 'Usa solo mayúsculas, números y guiones.' },
          { id: 'nombre', etiqueta: 'Nombre de la práctica', tipo: 'texto', requerido: true, max: 80 },
          { id: 'curso', etiqueta: 'Curso', tipo: 'lista', requerido: true, opciones: ['Redes I', 'Redes II', 'Seguridad en redes', 'Telecomunicaciones', 'Administración de redes'] },
          { id: 'nivel', etiqueta: 'Nivel', tipo: 'lista', requerido: true, opciones: ['Básico', 'Intermedio', 'Avanzado'] },
          { id: 'duracionHoras', etiqueta: 'Duración (horas)', tipo: 'entero', min: 1, max: 8, requerido: true, defecto: 2 },
          { id: 'equiposPorGrupo', etiqueta: 'Equipos por grupo', tipo: 'entero', min: 1, max: 12, requerido: true, defecto: 2, ayuda: 'Equipos que necesita cada grupo de trabajo para completar la práctica.' },
          { id: 'descripcion', etiqueta: 'Descripción', tipo: 'textarea', max: 300 }
        ],
        lista: ['codigo', 'nombre', 'curso', 'nivel', 'duracionHoras', 'veces'],
        buscar: ['codigo', 'nombre', 'curso', 'nivel'],
        calculados: [
          { id: 'veces', etiqueta: 'Sesiones dictadas', tipo: 'entero', formula: function (r, ctx) { return ctx.suma(reservasVigentes(ctx).filter(function (x) { return x.practica === r.id; }), function (x) { return sesionesEnRango(x, null, ctx.hoy(), ctx); }); } }
        ],
        reglas: [
          { id: 'avanzada-con-equipos', mensaje: 'Una práctica de nivel Avanzado necesita al menos 3 equipos por grupo.', validar: function (r) { return !(r.nivel === 'Avanzado' && r.equiposPorGrupo < 3); } }
        ],
        permisos: { ver: ['admin', 'coordinador', 'tecnico', 'docente', 'estudiante', 'auditor'], crear: ['admin', 'coordinador'], editar: ['admin', 'coordinador', 'docente'], eliminar: ['admin'] }
      },
      {
        id: 'laboratorios', nombre: 'Laboratorio', plural: 'Laboratorios', prefijo: 'LAB',
        campos: [
          { id: 'codigo', etiqueta: 'Código', tipo: 'texto', requerido: true, unico: true, max: 20, patron: '^[A-Z0-9-]+$', mensajePatron: 'Usa solo mayúsculas, números y guiones.' },
          { id: 'nombre', etiqueta: 'Nombre del laboratorio', tipo: 'texto', requerido: true, max: 80 },
          { id: 'sede', etiqueta: 'Sede', tipo: 'lista', requerido: true, opciones: ['Campus Arequipa', 'Campus Cusco', 'Campus Puno'] },
          { id: 'aforo', etiqueta: 'Aforo (alumnos)', tipo: 'entero', min: 1, max: 60, requerido: true },
          { id: 'horasSemana', etiqueta: 'Horas de apertura por semana', tipo: 'entero', min: 1, max: 96, requerido: true, defecto: 60, ayuda: 'Base para medir la ocupación del laboratorio.' },
          { id: 'responsable', etiqueta: 'Responsable', tipo: 'texto', max: 60 },
          { id: 'activo', etiqueta: 'Laboratorio activo', tipo: 'booleano', defecto: true }
        ],
        lista: ['codigo', 'nombre', 'sede', 'aforo', 'equipos', 'ocupacion'],
        buscar: ['codigo', 'nombre', 'sede', 'responsable'],
        calculados: [
          {
            id: 'equipos', etiqueta: 'Equipos instalados', tipo: 'entero',
            formula: function (r, ctx) { return ctx.suma(ctx.datos.listar('equipos', function (e) { return e.laboratorio === r.id && e.estado !== 'De baja'; }), function (e) { return e.unidades; }); }
          },
          {
            id: 'ocupacion', etiqueta: 'Ocupación (30 días)', tipo: 'porcentaje',
            formula: function (r, ctx) {
              var desde = ctx.fechaMas(ctx.hoy(), -29), h = ctx.suma(reservasVigentes(ctx), function (x) { return x.laboratorio === r.id ? horasEn(x, desde, ctx.hoy(), ctx) : 0; });
              return ctx.redondear(ocupacion(h, r.horasSemana, 30));
            }
          }
        ],
        permisos: { ver: ['admin', 'coordinador', 'tecnico', 'docente', 'estudiante', 'auditor'], crear: ['admin', 'coordinador'], editar: ['admin', 'coordinador', 'tecnico'], eliminar: ['admin'] }
      },
      {
        id: 'subredes', nombre: 'Subred', plural: 'Subredes y VLAN', prefijo: 'SUB',
        campos: [
          { id: 'nombre', etiqueta: 'Nombre del segmento', tipo: 'texto', requerido: true, max: 80 },
          { id: 'laboratorio', etiqueta: 'Laboratorio', tipo: 'ref', entidad: 'laboratorios', mostrar: 'nombre', requerido: true },
          { id: 'vlan', etiqueta: 'VLAN', tipo: 'entero', min: 1, max: 4094, requerido: true },
          { id: 'ip1', etiqueta: 'Dirección IP · primer octeto', tipo: 'entero', min: 1, max: 255, requerido: true, ayuda: 'Cualquier IP del segmento sirve (por ejemplo, la del router): el sistema calcula la dirección de red.' },
          { id: 'ip2', etiqueta: 'Dirección IP · segundo octeto', tipo: 'entero', min: 0, max: 255, requerido: true },
          { id: 'ip3', etiqueta: 'Dirección IP · tercer octeto', tipo: 'entero', min: 0, max: 255, requerido: true },
          { id: 'ip4', etiqueta: 'Dirección IP · cuarto octeto', tipo: 'entero', min: 0, max: 255, requerido: true },
          { id: 'prefijo', etiqueta: 'Prefijo CIDR (/n)', tipo: 'entero', min: 8, max: 32, requerido: true, defecto: 24 },
          { id: 'uso', etiqueta: 'Uso', tipo: 'lista', requerido: true, opciones: ['Gestión', 'Laboratorio de práctica', 'Estudiantes', 'Servidores', 'Invitados', 'Enlace punto a punto', 'Loopback'] },
          { id: 'hostsPrevistos', etiqueta: 'Equipos previstos', tipo: 'entero', min: 0, requerido: true, defecto: 0 },
          { id: 'fechaAlta', etiqueta: 'Incorporada el', tipo: 'fecha', requerido: true, max: 'hoy' }
        ],
        lista: ['nombre', 'laboratorio', 'vlan', 'cidr', 'hostsUtiles', 'ocupacionPct'],
        buscar: ['nombre', 'uso'],
        calculados: [
          { id: 'cidr', etiqueta: 'Red (CIDR)', tipo: 'texto', formula: function (r) { var s = subredDe(r); return s ? s.cidr : null; } },
          { id: 'red', etiqueta: 'Dirección de red', tipo: 'texto', formula: function (r) { var s = subredDe(r); return s ? numeroAIp(s.redNum) : null; } },
          { id: 'mascara', etiqueta: 'Máscara', tipo: 'texto', formula: function (r) { var s = subredDe(r); return s ? s.mascara : null; } },
          { id: 'broadcast', etiqueta: 'Difusión (broadcast)', tipo: 'texto', formula: function (r) { var s = subredDe(r); return s ? s.broadcast : null; } },
          { id: 'primerHost', etiqueta: 'Primer host', tipo: 'texto', formula: function (r) { var s = subredDe(r); return s ? s.primerHost : null; } },
          { id: 'ultimoHost', etiqueta: 'Último host', tipo: 'texto', formula: function (r) { var s = subredDe(r); return s ? s.ultimoHost : null; } },
          { id: 'hostsUtiles', etiqueta: 'Hosts útiles', tipo: 'entero', formula: function (r) { var s = subredDe(r); return s ? s.hostsUtiles : null; } },
          {
            id: 'ocupacionPct', etiqueta: 'Ocupación de la subred', tipo: 'porcentaje',
            formula: function (r, ctx) { var s = subredDe(r); return s && s.hostsUtiles > 0 ? ctx.redondear((r.hostsPrevistos || 0) / s.hostsUtiles * 100) : null; }
          }
        ],
        reglas: [
          {
            id: 'caben-los-equipos', mensaje: 'La subred no alcanza para los equipos previstos: aumenta el prefijo o reduce los equipos.',
            validar: function (r) { var s = subredDe(r); return !s || (r.hostsPrevistos || 0) <= s.hostsUtiles; }
          },
          {
            id: 'sin-solapamiento', mensaje: 'Esta subred se solapa con otra ya registrada: dos segmentos no pueden compartir direcciones.',
            validar: function (r, ctx) {
              var mia = subredDe(r), otras, i, s;
              if (!mia) { return true; }
              otras = ctx.datos.listar('subredes', function (x) { return x.id !== r.id; });
              for (i = 0; i < otras.length; i++) {
                s = subredDe(otras[i]);
                if (s && seSolapanRangos(mia, s)) { return false; }
              }
              return true;
            }
          },
          {
            id: 'vlan-unica', mensaje: 'Ese número de VLAN ya se usa en el mismo laboratorio.',
            validar: function (r, ctx) { return ctx.datos.listar('subredes', function (x) { return x.id !== r.id && x.laboratorio === r.laboratorio && x.vlan === r.vlan; }).length === 0; }
          }
        ],
        permisos: { ver: ['admin', 'coordinador', 'tecnico', 'auditor'], crear: ['admin', 'coordinador', 'tecnico'], editar: ['admin', 'coordinador', 'tecnico'], eliminar: ['admin'] }
      }
    ],

    /* ------------------------------ Operaciones ------------------------------ */
    operaciones: [
      {
        id: 'reservas', nombre: 'Reserva', plural: 'Reservas de laboratorio', prefijo: 'RSV', serie: 'RL01',
        campos: [
          { id: 'fecha', etiqueta: 'Fecha', tipo: 'fecha', requerido: true, defecto: 'hoy' },
          { id: 'laboratorio', etiqueta: 'Laboratorio', tipo: 'ref', entidad: 'laboratorios', mostrar: 'nombre', requerido: true },
          { id: 'docente', etiqueta: 'Docente a cargo', tipo: 'ref', entidad: 'docentes', mostrar: 'nombre', requerido: true },
          { id: 'practica', etiqueta: 'Práctica', tipo: 'ref', entidad: 'practicas', mostrar: 'nombre', requerido: true },
          { id: 'horaInicio', etiqueta: 'Hora de inicio (7–21)', tipo: 'entero', min: 7, max: 21, requerido: true, defecto: 8 },
          { id: 'horaFin', etiqueta: 'Hora de fin (8–22)', tipo: 'entero', min: 8, max: 22, requerido: true, defecto: 10 },
          { id: 'sesiones', etiqueta: 'Sesiones semanales', tipo: 'entero', min: 1, max: 20, requerido: true, defecto: 1, ayuda: 'Se repite cada semana, el mismo día y a la misma hora. 1 = una sola sesión.' },
          { id: 'alumnos', etiqueta: 'Alumnos', tipo: 'entero', min: 1, max: 60, requerido: true },
          { id: 'observaciones', etiqueta: 'Observaciones', tipo: 'textarea', max: 300 }
        ],
        lista: ['fecha', 'laboratorio', 'docente'],
        estados: ['Borrador', 'Reservada', 'Realizada', 'Cancelada'],
        lineas: {
          entidad: 'equipos', mostrar: 'nombre', precio: 'tarifaHora',
          campos: [{ id: 'cantidad', etiqueta: 'Unidades', tipo: 'entero', min: 1, max: 100, requerido: true, defecto: 1 }],
          info: function (item) { return 'Unidades del lote: ' + item.unidades + ' · Estado: ' + item.estado + ' · Costo de uso por hora y unidad'; }
        },
        calcular: function (doc, ctx) {
          var sesiones = doc.sesiones || 1, horas = horasPorSesion(doc) * sesiones, unidades = ctx.suma(doc.lineas, function (l) { return Number(l.cantidad) || 0; });
          return {
            sesiones: sesiones, horas: horas, equipos: unidades, alumnoHoras: (doc.alumnos || 0) * horas,
            total: ctx.redondear(ctx.suma(doc.lineas, function (l) { return (Number(l.cantidad) || 0) * (Number(l.precio) || 0); }) * horas)
          };
        },
        totales: [
          { id: 'sesiones', etiqueta: 'Sesiones', tipo: 'entero' },
          { id: 'horas', etiqueta: 'Horas reservadas en total', tipo: 'entero' },
          { id: 'equipos', etiqueta: 'Unidades de equipo reservadas', tipo: 'entero' },
          { id: 'total', etiqueta: 'Costo de uso referencial', fuerte: true }
        ],
        reglas: [
          { id: 'horario-valido', mensaje: 'La hora de fin debe ser posterior a la de inicio.', validar: function (d) { return !(d.horaFin <= d.horaInicio); } },
          {
            id: 'aforo-del-laboratorio', mensaje: 'Hay más alumnos que el aforo del laboratorio.',
            validar: function (d, ctx) { var l = d.laboratorio ? ctx.datos.obtener('laboratorios', d.laboratorio) : null; return !l || d.alumnos <= l.aforo; }
          },
          {
            id: 'laboratorio-activo', mensaje: 'El laboratorio elegido está inactivo.',
            validar: function (d, ctx) { var l = d.laboratorio ? ctx.datos.obtener('laboratorios', d.laboratorio) : null; return !l || l.activo !== false; }
          },
          {
            id: 'laboratorio-libre', mensaje: 'El laboratorio ya está reservado en ese horario.',
            validar: function (d, ctx) {
              return ctx.datos.listar('reservas', function (x) {
                return x.id !== d.id && x.laboratorio === d.laboratorio && (x.estado === 'Reservada' || x.estado === 'Realizada') && reservasChocan(d, x, ctx);
              }).length === 0;
            }
          },
          {
            id: 'equipos-aptos', mensaje: 'Un equipo de la reserva está dado de baja o no tiene unidades suficientes en ese horario.',
            validar: function (d, ctx) {
              var otras = ctx.datos.listar('reservas', function (x) {
                return x.id !== d.id && (x.estado === 'Reservada' || x.estado === 'Realizada') && reservasChocan(d, x, ctx);
              }), i, j, k, e, tomadas;
              for (i = 0; i < (d.lineas || []).length; i++) {
                e = ctx.datos.obtener('equipos', d.lineas[i].item);
                if (!e || e.estado === 'De baja') { return false; }
                tomadas = 0;
                for (j = 0; j < otras.length; j++) {
                  for (k = 0; k < otras[j].lineas.length; k++) { if (otras[j].lineas[k].item === e.id) { tomadas += otras[j].lineas[k].cantidad; } }
                }
                if (tomadas + (Number(d.lineas[i].cantidad) || 0) > e.unidades) { return false; }
              }
              return true;
            }
          },
          {
            id: 'cubre-la-practica', mensaje: 'Las unidades reservadas no alcanzan para los equipos que exige la práctica por grupo.',
            validar: function (d, ctx) {
              var p = d.practica ? ctx.datos.obtener('practicas', d.practica) : null;
              return !p || ctx.suma(d.lineas || [], function (l) { return Number(l.cantidad) || 0; }) >= p.equiposPorGrupo;
            }
          }
        ],
        permisos: { ver: ['admin', 'coordinador', 'tecnico', 'docente', 'estudiante', 'auditor'], crear: ['admin', 'coordinador', 'docente', 'estudiante'], editar: ['admin', 'coordinador', 'docente', 'estudiante'], emitir: ['admin', 'coordinador'], anular: ['admin', 'coordinador'] }
      },
      {
        id: 'incidencias', nombre: 'Incidencia', plural: 'Incidencias de equipos', prefijo: 'INC', serie: 'IN01',
        campos: [
          { id: 'fecha', etiqueta: 'Fecha', tipo: 'fecha', requerido: true, defecto: 'hoy', max: 'hoy' },
          { id: 'equipo', etiqueta: 'Equipo', tipo: 'ref', entidad: 'equipos', mostrar: 'nombre', requerido: true },
          { id: 'tipo', etiqueta: 'Tipo de incidencia', tipo: 'lista', requerido: true, opciones: ['Falla de hardware', 'Configuración perdida', 'Cableado o puerto dañado', 'Energía', 'Firmware o sistema operativo', 'Daño por mal uso', 'Robo o pérdida'], defecto: 'Falla de hardware' },
          { id: 'prioridad', etiqueta: 'Prioridad', tipo: 'lista', requerido: true, opciones: ['Baja', 'Media', 'Alta', 'Crítica'], defecto: 'Media' },
          { id: 'reportadoPor', etiqueta: 'Reportada por', tipo: 'ref', entidad: 'docentes', mostrar: 'nombre' },
          { id: 'descripcion', etiqueta: 'Descripción', tipo: 'textarea', requerido: true, max: 300 },
          { id: 'unidadesAfectadas', etiqueta: 'Unidades afectadas', tipo: 'entero', min: 1, requerido: true, defecto: 1 },
          { id: 'horasTecnico', etiqueta: 'Horas de técnico', tipo: 'numero', min: 0, requerido: true, defecto: 0 },
          { id: 'costoRepuestos', etiqueta: 'Costo de repuestos (S/)', tipo: 'moneda', min: 0, requerido: true, defecto: 0 },
          { id: 'horasParado', etiqueta: 'Horas fuera de servicio', tipo: 'numero', min: 0, defecto: 0 }
        ],
        lista: ['fecha', 'equipo', 'tipo'],
        estados: ['Borrador', 'Abierta', 'En reparación', 'Resuelta', 'Anulada'],
        calcular: function (doc, ctx) {
          var mano = ctx.redondear((doc.horasTecnico || 0) * ctx.param('tarifaTecnicoHora')), rep = ctx.redondear(doc.costoRepuestos || 0);
          return { manoObra: mano, repuestos: rep, total: ctx.redondear(mano + rep) };
        },
        totales: [
          { id: 'manoObra', etiqueta: 'Mano de obra' },
          { id: 'repuestos', etiqueta: 'Repuestos' },
          { id: 'total', etiqueta: 'Costo de la incidencia', fuerte: true }
        ],
        reglas: [
          {
            id: 'unidades-del-lote', mensaje: 'Las unidades afectadas superan a las del lote del equipo.',
            validar: function (d, ctx) { var e = d.equipo ? ctx.datos.obtener('equipos', d.equipo) : null; return !e || d.unidadesAfectadas <= e.unidades; }
          },
          {
            id: 'equipo-en-servicio', mensaje: 'No se registran incidencias de un equipo dado de baja.',
            validar: function (d, ctx) { var e = d.equipo ? ctx.datos.obtener('equipos', d.equipo) : null; return !e || e.estado !== 'De baja'; }
          }
        ],
        alEmitir: function (doc, ctx) {
          var e = ctx.datos.obtener('equipos', doc.equipo);
          if (!e) { return; }
          if (doc.tipo === 'Robo o pérdida') {
            /* Los equipos perdidos salen del inventario: si era todo el lote, el lote se da de baja. */
            if (doc.unidadesAfectadas >= e.unidades) { ctx.datos.actualizar('equipos', e.id, { estado: 'De baja' }); }
            else { ctx.datos.actualizar('equipos', e.id, { unidades: e.unidades - doc.unidadesAfectadas }); }
          } else if (doc.prioridad === 'Crítica' && e.estado === 'Operativo') {
            ctx.datos.actualizar('equipos', e.id, { estado: 'En mantenimiento' });
          }
        },
        alAnular: function (doc, ctx) {
          var e = ctx.datos.obtener('equipos', doc.equipo);
          if (!e) { return; }
          if (doc.tipo === 'Robo o pérdida') {
            if (e.estado === 'De baja') { ctx.datos.actualizar('equipos', e.id, { estado: 'Operativo' }); }
            else { ctx.datos.actualizar('equipos', e.id, { unidades: e.unidades + doc.unidadesAfectadas }); }
          } else if (doc.prioridad === 'Crítica' && e.estado === 'En mantenimiento') {
            ctx.datos.actualizar('equipos', e.id, { estado: 'Operativo' });
          }
        },
        permisos: { ver: ['admin', 'coordinador', 'tecnico', 'docente', 'auditor'], crear: ['admin', 'coordinador', 'tecnico', 'docente'], editar: ['admin', 'coordinador', 'tecnico', 'docente'], emitir: ['admin', 'coordinador', 'tecnico'], anular: ['admin', 'coordinador'] }
      }
    ],

    /* ------------------------------ Reportes ------------------------------ */
    reportes: [
      {
        id: 'ocupacion', titulo: 'Ocupación por laboratorio',
        descripcion: 'Horas reservadas (confirmadas o realizadas) frente a las horas de apertura del laboratorio en el periodo, comparadas con la meta de ocupación.',
        roles: ['admin', 'coordinador', 'tecnico', 'auditor'],
        parametros: [
          { id: 'desde', etiqueta: 'Desde', tipo: 'fecha', requerido: true, defecto: '@-94' },
          { id: 'hasta', etiqueta: 'Hasta', tipo: 'fecha', requerido: true, defecto: 'hoy' }
        ],
        ejecutar: function (p, ctx) {
          var rs = reservasVigentes(ctx), labs = ctx.datos.listar('laboratorios'), dias = ctx.diasEntre(p.desde, p.hasta) + 1, filas = [], etiquetas = [], valores = [], i, mias, h, disp, oc, meta = ctx.param('ocupacionMeta'), enMeta = 0, totH = 0, totD = 0;
          for (i = 0; i < labs.length; i++) {
            mias = rs.filter(function (x) { return x.laboratorio === labs[i].id && sesionesEnRango(x, p.desde, p.hasta, ctx) > 0; });
            if (!mias.length) { continue; }
            h = ctx.suma(mias, function (x) { return horasEn(x, p.desde, p.hasta, ctx); });
            disp = ctx.redondear(labs[i].horasSemana * dias / 7);
            oc = ctx.redondear(ocupacion(h, labs[i].horasSemana, dias));
            filas.push([labs[i].nombre, labs[i].sede, mias.length, h, disp, oc, ctx.suma(mias, function (x) { return horasEn(x, p.desde, p.hasta, ctx) * x.alumnos; }), oc >= meta ? 'En meta' : 'Bajo la meta']);
            if (oc >= meta) { enMeta += 1; }
            totH += h;
            totD += labs[i].horasSemana * dias / 7;
          }
          filas.sort(function (a, b) { return b[5] - a[5]; });
          for (i = 0; i < filas.length; i++) { etiquetas.push(filas[i][0]); valores.push(filas[i][5]); }
          return {
            columnas: ['Laboratorio', 'Sede', 'Reservas activas', 'Horas reservadas', 'Horas de apertura', 'Ocupación %', 'Alumnos-hora', 'Situación'],
            tipos: ['texto', 'texto', 'entero', 'entero', 'numero', 'porcentaje', 'entero', 'texto'], filas: filas,
            grafico: { tipo: 'barras', etiquetas: etiquetas, valores: valores, formato: 'porcentaje' },
            resumen: [
              { etiqueta: 'Ocupación global', valor: totD > 0 ? ctx.redondear(totH / totD * 100) : null, tipo: 'porcentaje' },
              { etiqueta: 'Laboratorios en la meta', valor: enMeta, tipo: 'entero' },
              { etiqueta: 'Meta de ocupación', valor: meta, tipo: 'porcentaje' }
            ]
          };
        }
      },
      {
        id: 'incidencias-tipo', titulo: 'Incidencias por tipo',
        descripcion: 'Incidencias abiertas, en reparación o resueltas en el periodo, agrupadas por tipo, con unidades afectadas, horas fuera de servicio y costo de atención.',
        roles: ['admin', 'coordinador', 'tecnico', 'auditor'],
        parametros: [
          { id: 'desde', etiqueta: 'Desde', tipo: 'fecha', requerido: true, defecto: '@-190' },
          { id: 'hasta', etiqueta: 'Hasta', tipo: 'fecha', requerido: true, defecto: 'hoy' }
        ],
        ejecutar: function (p, ctx) {
          var is = incidenciasVigentes(ctx, p.desde, p.hasta), grupos = ctx.agrupar(is, function (x) { return x.tipo; }), claves = [], k, filas = [], etiquetas = [], valores = [], g, costo = 0, parado = 0;
          for (k in grupos) { if (grupos.hasOwnProperty(k)) { claves.push(k); } }
          claves.sort(function (a, b) { return grupos[b].length - grupos[a].length || (a < b ? -1 : 1); });
          for (k = 0; k < claves.length; k++) {
            g = grupos[claves[k]];
            filas.push([claves[k], g.length, g.filter(function (x) { return x.estado === 'Resuelta'; }).length, ctx.suma(g, function (x) { return x.unidadesAfectadas; }), ctx.redondear(ctx.suma(g, function (x) { return x.horasParado || 0; })), ctx.redondear(ctx.suma(g, function (x) { return x.totales ? x.totales.total : 0; }))]);
            etiquetas.push(claves[k]);
            valores.push(g.length);
            costo += ctx.suma(g, function (x) { return x.totales ? x.totales.total : 0; });
            parado += ctx.suma(g, function (x) { return x.horasParado || 0; });
          }
          return {
            columnas: ['Tipo de incidencia', 'Incidencias', 'Resueltas', 'Unidades afectadas', 'Horas fuera de servicio', 'Costo de atención'],
            tipos: ['texto', 'entero', 'entero', 'entero', 'numero', 'moneda'], filas: filas,
            grafico: { tipo: 'barras', etiquetas: etiquetas, valores: valores, formato: 'entero' },
            resumen: [
              { etiqueta: 'Incidencias', valor: is.length, tipo: 'entero' },
              { etiqueta: 'Costo de atención', valor: ctx.redondear(costo), tipo: 'moneda' },
              { etiqueta: 'Horas fuera de servicio', valor: ctx.redondear(parado), tipo: 'numero' }
            ]
          };
        }
      },
      {
        id: 'antiguedad-equipos', titulo: 'Equipos por antigüedad y valor depreciado',
        descripcion: 'Cada lote de equipos con su antigüedad, la depreciación lineal acumulada y el valor en libros. Un lote que llegó al final de su vida útil queda en su valor residual.',
        roles: ['admin', 'coordinador', 'auditor'],
        parametros: [
          { id: 'desde', etiqueta: 'Comprados desde', tipo: 'fecha', requerido: true, defecto: '@-4000' },
          { id: 'hasta', etiqueta: 'Hasta', tipo: 'fecha', requerido: true, defecto: 'hoy' },
          { id: 'tipo', etiqueta: 'Tipo de equipo', tipo: 'lista', opciones: ['Todos', 'Router', 'Switch', 'Punto de acceso', 'Firewall', 'Servidor', 'Patch panel', 'Enlace de radio', 'Herramientas y medición'], defecto: 'Todos' }
        ],
        ejecutar: function (p, ctx) {
          var es = ctx.datos.listar('equipos', function (e) { return e.fechaCompra >= p.desde && e.fechaCompra <= p.hasta && (!p.tipo || p.tipo === 'Todos' || e.tipo === p.tipo); }), filas = [], porTipo = {}, claves = [], etiquetas = [], valores = [], i, a, d, lab, totCompra = 0, totLibros = 0, totAcum = 0, k;
          for (i = 0; i < es.length; i++) {
            a = antiguedadAnios(es[i].fechaCompra, ctx);
            d = depreciacion(es[i].valorCompra, es[i].valorResidual, es[i].vidaUtilAnios, a, es[i].unidades);
            lab = ctx.datos.obtener('laboratorios', es[i].laboratorio);
            filas.push([es[i].codigo, es[i].nombre, es[i].tipo, lab ? lab.nombre : '', es[i].fechaCompra, ctx.redondear(a), es[i].unidades, ctx.redondear(d.compra), ctx.redondear(d.acumulada), ctx.redondear(d.libros), d.compra > 0 ? ctx.redondear(d.acumulada / d.compra * 100) : 0]);
            porTipo[es[i].tipo] = (porTipo[es[i].tipo] || 0) + d.libros;
            totCompra += d.compra;
            totLibros += d.libros;
            totAcum += d.acumulada;
          }
          filas.sort(function (x, y) { return y[5] - x[5]; });
          for (k in porTipo) { if (porTipo.hasOwnProperty(k)) { claves.push(k); } }
          claves.sort(function (x, y) { return porTipo[y] - porTipo[x]; });
          for (i = 0; i < claves.length; i++) { etiquetas.push(claves[i]); valores.push(ctx.redondear(porTipo[claves[i]])); }
          return {
            columnas: ['Código', 'Equipo', 'Tipo', 'Laboratorio', 'Compra', 'Antigüedad (años)', 'Unidades', 'Valor de compra', 'Depreciación acumulada', 'Valor en libros', '% depreciado'],
            tipos: ['texto', 'texto', 'texto', 'texto', 'fecha', 'numero', 'entero', 'moneda', 'moneda', 'moneda', 'porcentaje'], filas: filas,
            grafico: { tipo: 'barras', etiquetas: etiquetas, valores: valores, formato: 'moneda' },
            resumen: [
              { etiqueta: 'Valor de compra', valor: ctx.redondear(totCompra), tipo: 'moneda' },
              { etiqueta: 'Valor en libros', valor: ctx.redondear(totLibros), tipo: 'moneda' },
              { etiqueta: 'Depreciado', valor: totCompra > 0 ? ctx.redondear(totAcum / totCompra * 100) : null, tipo: 'porcentaje' }
            ]
          };
        }
      },
      {
        id: 'reservas-docente', titulo: 'Reservas por docente',
        descripcion: 'Sesiones de laboratorio por docente en el periodo: horas, alumnos, prácticas distintas dictadas y costo de uso referencial de los equipos.',
        roles: ['admin', 'coordinador', 'auditor'],
        parametros: [
          { id: 'desde', etiqueta: 'Desde', tipo: 'fecha', requerido: true, defecto: '@-94' },
          { id: 'hasta', etiqueta: 'Hasta', tipo: 'fecha', requerido: true, defecto: 'hoy' }
        ],
        ejecutar: function (p, ctx) {
          var rs = reservasVigentes(ctx), docentes = ctx.datos.listar('docentes'), filas = [], etiquetas = [], valores = [], i, mias, vistas, j, totH = 0, totC = 0;
          for (i = 0; i < docentes.length; i++) {
            mias = rs.filter(function (x) { return x.docente === docentes[i].id && sesionesEnRango(x, p.desde, p.hasta, ctx) > 0; });
            if (!mias.length) { continue; }
            vistas = {};
            for (j = 0; j < mias.length; j++) { vistas[mias[j].practica] = true; }
            filas.push([docentes[i].nombre, ctx.suma(mias, function (x) { return sesionesEnRango(x, p.desde, p.hasta, ctx); }), ctx.suma(mias, function (x) { return horasEn(x, p.desde, p.hasta, ctx); }), ctx.suma(mias, function (x) { return x.alumnos; }), contarClaves(vistas), ctx.redondear(ctx.suma(mias, function (x) { return x.totales && x.totales.horas > 0 ? x.totales.total / x.totales.horas * horasEn(x, p.desde, p.hasta, ctx) : 0; }))]);
            totH += filas[filas.length - 1][2];
            totC += filas[filas.length - 1][5];
          }
          filas.sort(function (a, b) { return b[2] - a[2]; });
          for (i = 0; i < filas.length; i++) { etiquetas.push(filas[i][0]); valores.push(filas[i][2]); }
          return {
            columnas: ['Docente', 'Sesiones', 'Horas reservadas', 'Alumnos (suma por reserva)', 'Prácticas distintas', 'Costo de uso'],
            tipos: ['texto', 'entero', 'entero', 'entero', 'entero', 'moneda'], filas: filas,
            grafico: { tipo: 'barras', etiquetas: etiquetas, valores: valores, formato: 'entero' },
            resumen: [
              { etiqueta: 'Docentes con reservas', valor: filas.length, tipo: 'entero' },
              { etiqueta: 'Horas reservadas', valor: totH, tipo: 'entero' },
              { etiqueta: 'Costo de uso referencial', valor: ctx.redondear(totC), tipo: 'moneda' }
            ]
          };
        }
      },
      {
        id: 'uso-vlan', titulo: 'Uso de VLAN y subredes',
        descripcion: 'Plan de direccionamiento: cada subred con su VLAN, su máscara, los hosts útiles y qué tan llena está según los equipos previstos.',
        parametros: [
          { id: 'desde', etiqueta: 'Incorporadas desde', tipo: 'fecha', requerido: true, defecto: '@-400' },
          { id: 'hasta', etiqueta: 'Hasta', tipo: 'fecha', requerido: true, defecto: 'hoy' }
        ],
        ejecutar: function (p, ctx) {
          var ss = ctx.datos.listar('subredes', function (s) { return s.fechaAlta >= p.desde && s.fechaAlta <= p.hasta; }), filas = [], etiquetas = [], valores = [], vlans = {}, i, c, lab, oc, umbral = ctx.param('umbralSubred'), saturadas = 0, totUtiles = 0, sumaOc = 0, nOc = 0;
          for (i = 0; i < ss.length; i++) {
            c = subredDe(ss[i]);
            if (!c) { continue; }
            lab = ctx.datos.obtener('laboratorios', ss[i].laboratorio);
            oc = ctx.redondear((ss[i].hostsPrevistos || 0) / c.hostsUtiles * 100);
            filas.push([ss[i].nombre, lab ? lab.nombre : '', ss[i].vlan, c.cidr, c.mascara, c.hostsUtiles, ss[i].hostsPrevistos || 0, oc, subredSaturable(ss[i]) && oc >= umbral ? 'Saturada' : 'Con holgura']);
            vlans[ss[i].vlan] = true;
            totUtiles += c.hostsUtiles;
            if (subredSaturable(ss[i])) {
              sumaOc += oc;
              nOc += 1;
              if (oc >= umbral) { saturadas += 1; }
            }
          }
          filas.sort(function (a, b) { return b[7] - a[7]; });
          for (i = 0; i < filas.length; i++) { if (filas[i][7] < 100) { etiquetas.push(filas[i][0]); valores.push(filas[i][7]); } }
          return {
            columnas: ['Segmento', 'Laboratorio', 'VLAN', 'Red', 'Máscara', 'Hosts útiles', 'Equipos previstos', 'Ocupación %', 'Situación'],
            tipos: ['texto', 'texto', 'entero', 'texto', 'texto', 'entero', 'entero', 'porcentaje', 'texto'], filas: filas,
            grafico: { tipo: 'barras', etiquetas: etiquetas, valores: valores, formato: 'porcentaje' },
            resumen: [
              { etiqueta: 'Subredes', valor: filas.length, tipo: 'entero' },
              { etiqueta: 'VLAN distintas', valor: contarClaves(vlans), tipo: 'entero' },
              { etiqueta: 'Subredes saturadas', valor: saturadas, tipo: 'entero' },
              { etiqueta: 'Ocupación media (sin enlaces)', valor: nOc ? ctx.redondear(sumaOc / nOc) : null, tipo: 'porcentaje' }
            ]
          };
        }
      }
    ],

    /* ------------------------------ Tablero ------------------------------ */
    tablero: [
      {
        titulo: 'Sesiones de laboratorio (30 días)', tipo: 'entero',
        calcular: function (ctx) { var desde = ctx.fechaMas(ctx.hoy(), -29); return ctx.suma(reservasVigentes(ctx), function (x) { return sesionesEnRango(x, desde, ctx.hoy(), ctx); }); }
      },
      {
        titulo: 'Ocupación de los laboratorios (30 días)', tipo: 'porcentaje',
        calcular: function (ctx) {
          var desde = ctx.fechaMas(ctx.hoy(), -29), labs = ctx.datos.listar('laboratorios', function (l) { return l.activo !== false; }), horas = ctx.suma(reservasVigentes(ctx), function (x) { return horasEn(x, desde, ctx.hoy(), ctx); });
          return labs.length ? ctx.redondear(ocupacion(horas, ctx.suma(labs, function (l) { return l.horasSemana; }), 30)) : null;
        }
      },
      {
        titulo: 'Incidencias abiertas', tipo: 'entero',
        calcular: function (ctx) { return incidenciasAbiertas(ctx).length; }
      },
      {
        titulo: 'Equipos operativos', tipo: 'porcentaje',
        calcular: function (ctx) {
          var es = ctx.datos.listar('equipos', function (e) { return e.estado !== 'De baja'; }), abiertas = incidenciasAbiertas(ctx), total = ctx.suma(es, function (e) { return e.unidades; }), ok = 0, i, afectadas;
          for (i = 0; i < es.length; i++) {
            if (es[i].estado !== 'Operativo') { continue; }
            afectadas = ctx.suma(abiertas.filter(function (x) { return x.equipo === es[i].id; }), function (x) { return x.unidadesAfectadas; });
            ok += Math.max(0, es[i].unidades - afectadas);
          }
          return total ? ctx.redondear(ok / total * 100) : null;
        }
      },
      {
        titulo: 'Valor en libros del parque', tipo: 'moneda', roles: ['admin', 'coordinador', 'auditor'],
        calcular: function (ctx) {
          return ctx.redondear(ctx.suma(ctx.datos.listar('equipos', function (e) { return e.estado !== 'De baja'; }), function (e) {
            return depreciacion(e.valorCompra, e.valorResidual, e.vidaUtilAnios, antiguedadAnios(e.fechaCompra, ctx), e.unidades).libros;
          }));
        }
      },
      {
        titulo: 'Subredes saturadas', tipo: 'entero', roles: ['admin', 'coordinador', 'tecnico', 'auditor'],
        calcular: function (ctx) {
          var umbral = ctx.param('umbralSubred');
          return ctx.datos.listar('subredes', subredSaturable).filter(function (s) {
            var c = subredDe(s);
            return c && (s.hostsPrevistos || 0) / c.hostsUtiles * 100 >= umbral;
          }).length;
        }
      }
    ],

    tableroGrafico: {
      titulo: 'Horas de laboratorio reservadas por mes', tipo: 'columnas', formato: 'entero',
      calcular: function (ctx) {
        var meses = ultimosMeses(ctx, 6), rs = reservasVigentes(ctx), porMes = {}, etiquetas = [], valores = [], i, j, f;
        for (i = 0; i < rs.length; i++) {
          f = fechasSesiones(rs[i], ctx);
          for (j = 0; j < f.length; j++) { if (f[j] <= ctx.hoy()) { porMes[ctx.mes(f[j])] = (porMes[ctx.mes(f[j])] || 0) + horasPorSesion(rs[i]); } }
        }
        for (i = 0; i < meses.length; i++) {
          etiquetas.push(MESES[parseInt(meses[i].slice(5, 7), 10) - 1]);
          valores.push(porMes[meses[i]] || 0);
        }
        return { etiquetas: etiquetas, valores: valores };
      }
    },

    /* ------------------------------ Semillas ------------------------------ */
    semillas: {
      equipos: armarEquipos(),
      docentes: [
        { id: 'DOC-0001', nombre: 'Edwin Cáceres Mamani', dni: '29451237', especialidad: 'Redes y comunicaciones', certificacion: 'CCNP', condicion: 'Tiempo completo', email: 'ecaceres@institutoandino.example.pe', telefono: '959 120 331', fechaIngreso: '2019-03-04', activo: true },
        { id: 'DOC-0002', nombre: 'Gladys Ticona Quispe', dni: '40128933', especialidad: 'Seguridad informática', certificacion: 'Security+', condicion: 'Tiempo completo', email: 'gticona@institutoandino.example.pe', telefono: '958 440 217', fechaIngreso: '2020-08-17', activo: true },
        { id: 'DOC-0003', nombre: 'Rodolfo Paredes Yáñez', dni: '43872106', especialidad: 'Telecomunicaciones', certificacion: 'CCNA', condicion: 'Tiempo completo', email: 'rparedes@institutoandino.example.pe', telefono: '957 301 882', fechaIngreso: '2018-04-09', activo: true },
        { id: 'DOC-0004', nombre: 'Milagros Huanca Soncco', dni: '46210378', especialidad: 'Redes y comunicaciones', certificacion: 'CCNA', condicion: 'Tiempo parcial', email: 'mhuanca@institutoandino.example.pe', telefono: '956 118 903', fechaIngreso: '2022-03-14', activo: true },
        { id: 'DOC-0005', nombre: 'Henry Apaza Layme', dni: '41563902', especialidad: 'Seguridad informática', certificacion: 'CCNP', condicion: 'Tiempo parcial', email: 'hapaza@institutoandino.example.pe', telefono: '955 672 410', fechaIngreso: '2021-09-06', activo: true },
        { id: 'DOC-0006', nombre: 'Luz Marina Condori Ccasa', dni: '44917560', especialidad: 'Sistemas operativos', certificacion: 'Network+', condicion: 'Tiempo parcial', email: 'lcondori@institutoandino.example.pe', telefono: '954 209 337', fechaIngreso: '2023-03-13', activo: true },
        { id: 'DOC-0007', nombre: 'Víctor Hugo Llerena Bedoya', dni: '29876543', especialidad: 'Telecomunicaciones', certificacion: 'MTCNA', condicion: 'Por horas', email: 'vllerena@institutoandino.example.pe', telefono: '953 884 120', fechaIngreso: '2024-03-11', activo: true },
        { id: 'DOC-0008', nombre: 'Katherine Mendoza Flores', dni: '47035921', especialidad: 'Redes y comunicaciones', certificacion: 'CCNA', condicion: 'Por horas', email: 'kmendoza@institutoandino.example.pe', telefono: '952 316 774', fechaIngreso: '2024-08-19', activo: true },
        { id: 'DOC-0009', nombre: 'Jorge Luis Salas Huarca', dni: '42650189', especialidad: 'Redes y comunicaciones', certificacion: 'MTCNA', condicion: 'Tiempo completo', email: 'jsalas@institutoandino.example.pe', telefono: '951 450 628', fechaIngreso: '2020-03-02', activo: true },
        { id: 'DOC-0010', nombre: 'Patricia Zea Valdivia', dni: '40771834', especialidad: 'Administración de redes', certificacion: 'CCNP', condicion: 'Tiempo completo', email: 'pzea@institutoandino.example.pe', telefono: '950 773 215', fechaIngreso: '2017-08-21', activo: true },
        { id: 'DOC-0011', nombre: 'Alberto Cuba Sarmiento', dni: '44302685', especialidad: 'Seguridad informática', certificacion: 'CCNA', condicion: 'Por horas', email: 'acuba@institutoandino.example.pe', telefono: '949 118 602', fechaIngreso: '2025-03-10', activo: true },
        { id: 'DOC-0012', nombre: 'Rocío Pinto Chávez', dni: '46189027', especialidad: 'Telecomunicaciones', certificacion: 'Network+', condicion: 'Tiempo parcial', email: 'rpinto@institutoandino.example.pe', telefono: '948 340 775', fechaIngreso: '2022-08-08', activo: false }
      ],
      practicas: armarPracticas(),
      laboratorios: [
        { id: 'LAB-0001', codigo: 'LAB-AQP-01', nombre: 'Laboratorio de Redes 1', sede: 'Campus Arequipa', aforo: 24, horasSemana: 66, responsable: 'Ing. Edwin Cáceres', activo: true },
        { id: 'LAB-0002', codigo: 'LAB-AQP-02', nombre: 'Laboratorio de Redes 2', sede: 'Campus Arequipa', aforo: 24, horasSemana: 66, responsable: 'Ing. Patricia Zea', activo: true },
        { id: 'LAB-0003', codigo: 'LAB-AQP-03', nombre: 'Laboratorio de Seguridad', sede: 'Campus Arequipa', aforo: 20, horasSemana: 54, responsable: 'Ing. Gladys Ticona', activo: true },
        { id: 'LAB-0004', codigo: 'LAB-CUS-01', nombre: 'Laboratorio de Telecomunicaciones', sede: 'Campus Cusco', aforo: 20, horasSemana: 54, responsable: 'Ing. Rodolfo Paredes', activo: true },
        { id: 'LAB-0005', codigo: 'LAB-CUS-02', nombre: 'Laboratorio de Cableado Estructurado', sede: 'Campus Cusco', aforo: 16, horasSemana: 42, responsable: 'Téc. Elmer Choque', activo: true },
        { id: 'LAB-0006', codigo: 'LAB-PUN-01', nombre: 'Laboratorio de Redes Inalámbricas', sede: 'Campus Puno', aforo: 18, horasSemana: 48, responsable: 'Ing. Jorge Salas', activo: true }
      ],
      subredes: armarSubredes(),
      reservas: armarReservas(),
      incidencias: armarIncidencias()
    }
  };

  /* Cantidad de claves de un objeto usado como conjunto. */
  function contarClaves(obj) {
    var k, n = 0;
    for (k in obj) { if (Object.prototype.hasOwnProperty.call(obj, k)) { n += 1; } }
    return n;
  }
})();
