# Los 15 sistemas de práctica

Cada uno es un negocio distinto con **entidades, operaciones, fórmulas y reportes propios**. Todos cumplen ESQUEMA_SISTEMA.md.
Los nombres y datos son inventados; nada de datos reales.

| # | id | Negocio | Entidades (3–5) | Operaciones | Fórmulas propias | Roles |
|---|---|---|---|---|---|---|
| 1 | `muebleria` | Maderas del Sur · venta de muebles (Arequipa) | clientes, productos, proveedores, categorías | ventas, compras | comisión de vendedor, valorización de stock, IGV | admin, gerente, vendedor, almacén, auditor |
| 2 | `papeleria` | Papelería Útil · artículos de escritorio y útiles | clientes (personas y empresas), productos, combos/kits, proveedores | ventas de mostrador y pedidos corporativos, compras | descuento escalonado por volumen, margen por categoría, punto de reposición y compra sugerida | admin, gerente, cajero, almacén, auditor |
| 3 | `abogados` | Estudio Jurídico Paredes & Asociados | clientes, expedientes (materia, juzgado, etapa), abogados, tarifas | actuaciones con horas, honorarios y provisiones | horas facturables × tarifa, cuota litis %, plazos en días hábiles, saldo de provisión de fondos | socio, abogado, asistente, contador, auditor |
| 4 | `centro-salud` | Centro de Salud Santa Rosa | pacientes, médicos, medicamentos, seguros | citas y atenciones (diagnóstico, receta) | edad, IMC con clasificación, dosis pediátrica por peso, copago según seguro, tiempo de espera | director, médico, enfermería, admisión, farmacia, auditor |
| 5 | `consultora-software` | Nexa Soluciones TI · consultora de software | clientes, proyectos, consultores, propuestas | partes de horas, facturación por hitos | costo hora cargado, margen del proyecto, valor ganado (PV, EV, CPI), utilización | gerente, PM, consultor, comercial, finanzas, auditor |
| 6 | `fabrica-bi` | DataFactory · fábrica de inteligencia de negocios | clientes, fuentes de datos, pipelines, tableros | ejecuciones de pipelines, tickets de soporte | SLA de entrega, costo de cómputo por ejecución, tasa de éxito, puntaje de calidad de datos | líder de datos, ingeniero, analista, cuenta, auditor |
| 7 | `lab-redes` | Laboratorio de Redes Andino | equipos, laboratorios, docentes, prácticas | reservas de laboratorio, incidencias, planes de direccionamiento | cálculo de subred (red, broadcast, hosts útiles desde IP/CIDR), ocupación del laboratorio, depreciación lineal | coordinador, técnico, docente, estudiante, auditor |
| 8 | `linea-produccion` | Manufacturas Altiplano · cadena de producción | productos con lista de materiales (BOM), líneas y estaciones, insumos, turnos | órdenes de producción, registros de producción por turno | OEE (disponibilidad × rendimiento × calidad), takt time, costo estándar por BOM, rendimiento a la primera | gerente de planta, supervisor, operador, calidad, mantenimiento, auditor |
| 9 | `botica` | Botica Salud Total | productos, lotes con vencimiento, proveedores, clientes | ventas (con y sin receta), compras con lote | margen, alerta de vencimiento en días, salida por vencimiento (FEFO), descuento por tarjeta | químico farmacéutico, cajero, almacén, admin, auditor |
| 10 | `restaurante` | Sabores del Colca · restaurante | mesas, platos con receta, insumos, personal | comandas, cierres de caja | costo del plato por receta, food cost %, ticket promedio, rotación de mesa, servicio y propina | administrador, mozo, cocina, cajero, auditor |
| 11 | `taller-mecanico` | Taller Automotriz Los Andes | clientes, vehículos (placa), repuestos, mecánicos | órdenes de trabajo (servicios + repuestos), compras de repuestos | mano de obra = tiempo estándar × tarifa, margen en repuestos, próximo mantenimiento por km, comisión por técnico | jefe de taller, asesor de servicio, mecánico, almacén, auditor |
| 12 | `colegio` | I.E. San Martín · colegio | alumnos, apoderados, cursos y secciones, docentes | matrículas, notas por bimestre, pensiones y pagos | promedio ponderado, escala literal AD/A/B/C, % de asistencia, interés moratorio de pensión, beca % | director, docente, secretaría, tesorería, auditor |
| 13 | `transportes` | Transportes Andes Cargo | vehículos, conductores, clientes, rutas | viajes con carga, mantenimiento, combustible | costo por km (combustible + peajes + viáticos + depreciación), margen del viaje, rendimiento km/galón, ocupación de carga | gerente de operaciones, despachador, conductor, contabilidad, auditor |
| 14 | `hotel` | Hostal Plaza Mayor | habitaciones, huéspedes, tarifas por temporada, servicios | reservas (check-in/out), consumos | noches, tarifa por temporada (alta/baja), ocupación, ADR y RevPAR | gerente, recepción, housekeeping, contabilidad, auditor |
| 15 | `constructora` | Constructora Ingeniería Sur | proyectos, partidas (metrados), insumos, proveedores | valorizaciones mensuales, requisiciones de materiales | costo directo, gastos generales %, utilidad %, IGV, avance valorizado, retención de garantía | gerente de proyectos, residente, almacenero, administración, auditor |

## Datos y tono

- Ciudad y moneda del Perú (S/, IGV 18 %, DNI de 8, RUC de 11 dígitos de ejemplo, distritos reales como lugar, personas inventadas).
- Datos sensibles (salud, notas, expedientes) siempre ficticios, con el aviso de práctica.
- Cada sistema trae `tema` propio (color primario y acento) para que se vean distintos.
