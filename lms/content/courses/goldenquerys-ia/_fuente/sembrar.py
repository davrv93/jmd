#!/usr/bin/env python3
"""GoldenQuerys — siembra las 5 bases SQLite del kit (solo biblioteca estándar).

Uso:  python3 _fuente/sembrar.py
Escribe materials/kit/goldenquerys/bases/*.sqlite, bases/preguntas.json y ESQUEMAS.md.
Es determinista: cada giro usa su propia semilla (random.Random(semilla)).
Fechas: 2025-01-01 a 2026-10-31. Montos en soles con 2 decimales; precios incluyen IGV 18 %.
"""
import datetime as dt
import json
import os
import random
import sqlite3

AQUI = os.path.dirname(os.path.abspath(__file__))
KIT = os.path.normpath(os.path.join(AQUI, '..', 'materials', 'kit', 'goldenquerys'))
BASES = os.path.join(KIT, 'bases')
INICIO = dt.date(2025, 1, 1)
FIN = dt.date(2026, 10, 31)
HOY = '2026-10-31'  # fecha de corte para deudas y morosidad
IGV = 0.18

NOMBRES_M = ['José', 'Luis', 'Carlos', 'Jorge', 'Miguel', 'Juan', 'Pedro', 'César', 'Víctor', 'Raúl', 'Óscar',
             'Renzo', 'Diego', 'Andrés', 'Christian', 'Kevin', 'Alonso', 'Piero', 'Franco', 'Jhon', 'Wilmer',
             'Edwin', 'Percy', 'Walter', 'Hugo', 'Manuel', 'Fernando', 'Sebastián', 'Mateo', 'Gonzalo']
NOMBRES_F = ['María', 'Rosa', 'Carmen', 'Ana', 'Lucía', 'Milagros', 'Patricia', 'Karina', 'Jessica', 'Gabriela',
             'Diana', 'Flor', 'Sofía', 'Valeria', 'Camila', 'Fiorella', 'Yesenia', 'Mariela', 'Elena', 'Gladys',
             'Luz', 'Nathaly', 'Andrea', 'Ximena', 'Daniela', 'Rocío', 'Pilar', 'Teresa', 'Juana', 'Kiara']
APELLIDOS = ['Quispe', 'Flores', 'Sánchez', 'Rodríguez', 'García', 'Huamán', 'Mamani', 'Chávez', 'Rojas', 'Mendoza',
             'Ramírez', 'Torres', 'Vásquez', 'Castillo', 'Gutiérrez', 'Díaz', 'Espinoza', 'Ccahuana', 'Condori',
             'Salazar', 'Paredes', 'Cárdenas', 'Vargas', 'Ríos', 'Palomino', 'Huaraca', 'Aguilar', 'Zapata',
             'Villanueva', 'Medina', 'Cruz', 'Pérez', 'Gómez', 'Navarro', 'Tello', 'Alvarado', 'Ticona', 'Inga']
DISTRITOS = ['Miraflores', 'San Isidro', 'Santiago de Surco', 'San Borja', 'La Molina', 'Jesús María', 'Lince',
             'Pueblo Libre', 'Magdalena del Mar', 'San Miguel', 'Breña', 'Cercado de Lima', 'La Victoria',
             'Surquillo', 'Barranco', 'Chorrillos', 'San Juan de Miraflores', 'Villa El Salvador',
             'Villa María del Triunfo', 'Ate', 'Santa Anita', 'San Juan de Lurigancho', 'Los Olivos', 'Comas',
             'Independencia', 'San Martín de Porres', 'Puente Piedra', 'Callao', 'Rímac', 'El Agustino']


# ----------------------------------------------------------------- utilidades
def r2(x):
    return round(x + 1e-9, 2) if x >= 0 else round(x - 1e-9, 2)


def dias():
    d = INICIO
    while d <= FIN:
        yield d
        d += dt.timedelta(days=1)


def enesimo(y, m, dia_semana, n):
    """n-ésimo día de la semana (0=lunes … 6=domingo) del mes."""
    d = dt.date(y, m, 1)
    while d.weekday() != dia_semana:
        d += dt.timedelta(days=1)
    return d + dt.timedelta(days=7 * (n - 1))


def reparto(rng, total, peso):
    """Reparte `total` registros entre los días según la función peso(fecha)."""
    ds = list(dias())
    ws = [peso(d) for d in ds]
    s = sum(ws)
    out = []
    for d, w in zip(ds, ws):
        e = total * w / s
        n = int(e)
        if rng.random() < e - n:
            n += 1
        out.append((d, n))
    return out


def hora(rng, d, horas):
    h = rng.choices([x for x, _ in horas], [p for _, p in horas])[0]
    return f'{d.isoformat()} {h:02d}:{rng.randrange(60):02d}:{rng.randrange(60):02d}'


def persona(rng):
    nom = rng.choice(NOMBRES_M if rng.random() < 0.5 else NOMBRES_F)
    return nom, f'{rng.choice(APELLIDOS)} {rng.choice(APELLIDOS)}'


def dni(rng):
    return str(rng.randrange(10000000, 79999999))


def telefono(rng):
    return '9' + ''.join(str(rng.randrange(10)) for _ in range(8))


def fecha_rand(rng, a, b):
    return a + dt.timedelta(days=rng.randrange((b - a).days + 1))


def desglose(total):
    sub = r2(total / (1 + IGV))
    return sub, r2(total - sub)


def nueva_base(nombre):
    ruta = os.path.join(BASES, nombre + '.sqlite')
    for suf in ('', '-journal', '-wal', '-shm'):
        if os.path.exists(ruta + suf):
            os.remove(ruta + suf)
    con = sqlite3.connect(ruta)
    con.execute('PRAGMA foreign_keys=ON')
    return con


def indices(con):
    """Índice en cada FK y en cada columna de fecha."""
    tablas = [r[0] for r in con.execute("SELECT name FROM sqlite_master WHERE type='table'")]
    for t in tablas:
        cols = [c[1] for c in con.execute(f'PRAGMA table_info({t})')]
        fks = [f[3] for f in con.execute(f'PRAGMA foreign_key_list({t})')]
        for c in sorted(set(fks + [c for c in cols if c.startswith('fecha') or c in ('mes', 'semana_inicio')])):
            con.execute(f'CREATE INDEX IF NOT EXISTS ix_{t}_{c} ON {t}({c})')


def cerrar(con):
    indices(con)
    con.commit()
    fk = con.execute('PRAGMA foreign_key_check').fetchall()
    assert not fk, fk
    con.execute('VACUUM')
    con.close()


# ======================================================================= BOTICA
def botica():
    rng = random.Random(101)
    con = nueva_base('botica')
    con.executescript('''
    CREATE TABLE sedes(id INTEGER PRIMARY KEY, nombre TEXT NOT NULL, distrito TEXT NOT NULL, direccion TEXT,
        fecha_apertura TEXT);
    CREATE TABLE categorias(id INTEGER PRIMARY KEY, nombre TEXT NOT NULL);
    CREATE TABLE productos(id INTEGER PRIMARY KEY, codigo TEXT UNIQUE, nombre TEXT NOT NULL,
        categoria_id INTEGER NOT NULL REFERENCES categorias(id), laboratorio TEXT, presentacion TEXT,
        precio_venta REAL NOT NULL, costo_unitario REAL NOT NULL, requiere_receta INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE clientes(id INTEGER PRIMARY KEY, dni TEXT, nombres TEXT, apellidos TEXT, distrito TEXT,
        telefono TEXT, fecha_registro TEXT);
    CREATE TABLE empleados(id INTEGER PRIMARY KEY, nombres TEXT, apellidos TEXT, cargo TEXT,
        sede_id INTEGER NOT NULL REFERENCES sedes(id), fecha_ingreso TEXT);
    CREATE TABLE ventas(id INTEGER PRIMARY KEY, fecha TEXT NOT NULL, sede_id INTEGER NOT NULL REFERENCES sedes(id),
        cliente_id INTEGER REFERENCES clientes(id), empleado_id INTEGER REFERENCES empleados(id),
        tipo_comprobante TEXT, serie_numero TEXT, medio_pago TEXT, subtotal REAL, igv REAL, total REAL,
        estado TEXT NOT NULL DEFAULT 'emitida', observacion TEXT);
    CREATE TABLE venta_detalle(id INTEGER PRIMARY KEY, venta_id INTEGER NOT NULL REFERENCES ventas(id),
        producto_id INTEGER NOT NULL REFERENCES productos(id), cantidad INTEGER NOT NULL,
        precio_unitario REAL NOT NULL, importe REAL NOT NULL);
    ''')
    sedes = [(1, 'Botica Salud Total – Lince', 'Lince', 'Av. Arequipa 2150', '2019-03-01'),
             (2, 'Botica Salud Total – Los Olivos', 'Los Olivos', 'Av. Carlos Izaguirre 845', '2020-08-15'),
             (3, 'Botica Salud Total – SJL', 'San Juan de Lurigancho', 'Av. Próceres de la Independencia 1520',
              '2021-05-10'),
             (4, 'Botica Salud Total – Surco', 'Santiago de Surco', 'Av. Caminos del Inca 1302', '2023-11-20')]
    con.executemany('INSERT INTO sedes VALUES (?,?,?,?,?)', sedes)
    peso_sede = [1.0, 1.25, 1.35, 0.8]
    cats = {1: 'Analgésicos', 2: 'Antigripales', 3: 'Antibióticos', 4: 'Vitaminas y suplementos',
            5: 'Gastrointestinal', 6: 'Cuidado personal', 7: 'Dermatología', 8: 'Bebés y maternidad',
            9: 'Cardiovascular', 10: 'Diabetes'}
    con.executemany('INSERT INTO categorias VALUES (?,?)', cats.items())
    base = {
        1: [('Paracetamol 500 mg', 0.30, 0), ('Ibuprofeno 400 mg', 0.50, 0), ('Naproxeno 550 mg', 0.90, 0),
            ('Diclofenaco 50 mg', 0.40, 0), ('Metamizol 500 mg', 0.50, 0), ('Ketorolaco 10 mg', 0.80, 0)],
        2: [('Panadol Antigripal', 1.20, 0), ('Nastizol Compuesto', 1.50, 0), ('Antalgina Gripe', 0.90, 0),
            ('Clorfenamina 4 mg', 0.20, 0), ('Jarabe para la tos Ambroxol 120 ml', 14.90, 0),
            ('Vick VapoRub 50 g', 16.50, 0)],
        3: [('Amoxicilina 500 mg', 0.60, 1), ('Azitromicina 500 mg', 3.50, 1), ('Ciprofloxacino 500 mg', 1.20, 1),
            ('Cefalexina 500 mg', 1.00, 1)],
        4: [('Vitamina C 1 g efervescente', 1.50, 0), ('Complejo B', 0.60, 0), ('Ensure vainilla 400 g', 69.90, 0),
            ('Zinc + Vitamina C', 0.90, 0)],
        5: [('Omeprazol 20 mg', 0.40, 0), ('Sal de Andrews sobre', 1.20, 0), ('Loperamida 2 mg', 0.50, 0),
            ('Suero oral Electrolight 625 ml', 6.50, 0)],
        6: [('Alcohol 70° 1 L', 9.90, 0), ('Bloqueador solar FPS 50', 49.90, 0), ('Pasta dental 90 g', 7.50, 0),
            ('Mascarilla KN95', 1.50, 0), ('Jabón antibacterial', 4.20, 0)],
        7: [('Clotrimazol crema 20 g', 6.90, 0), ('Hipoglós 60 g', 18.90, 0), ('Betametasona crema', 9.50, 1)],
        8: [('Pañales Huggies M x 50', 59.90, 0), ('Leche de fórmula etapa 1', 64.90, 0),
            ('Toallitas húmedas x 80', 8.90, 0)],
        9: [('Losartán 50 mg', 0.50, 1), ('Atorvastatina 20 mg', 0.90, 1), ('Ácido acetilsalicílico 100 mg', 0.20, 0)],
        10: [('Metformina 850 mg', 0.30, 1), ('Tiras reactivas glucosa x 50', 89.90, 0), ('Glibenclamida 5 mg', 0.30, 1)],
    }
    labs = ['Genfar', 'Portugal', 'Medifarma', 'Bayer', 'Teva', 'Hersil', 'IQFarma', 'Farmindustria', 'AC Farma']
    productos = []
    pid = 0
    for cid, items in base.items():
        for nombre, precio, receta in items:
            unitario = precio < 4
            pres = ['unidad', 'blíster x 10'] if unitario else ['unidad']
            for p in pres:
                pid += 1
                pv = r2(precio * (10 if p.startswith('blíster') else 1) * (0.92 if p.startswith('blíster') else 1))
                costo = r2(pv * rng.uniform(0.52, 0.72))
                productos.append((pid, f'P{pid:04d}', nombre, cid, rng.choice(labs), p, pv, costo, receta))
    con.executemany('INSERT INTO productos VALUES (?,?,?,?,?,?,?,?,?)', productos)

    clientes = []
    for i in range(1, 1501):
        n, a = persona(rng)
        clientes.append([i, dni(rng), n, a, rng.choice(DISTRITOS), telefono(rng) if rng.random() > 0.12 else None,
                         fecha_rand(rng, dt.date(2023, 1, 1), FIN).isoformat()])
    for i in rng.sample(range(1500), 25):
        clientes[i][4] = None  # suciedad: distrito vacío
    dup = list(clientes[6])  # suciedad: cliente duplicado (mismo DNI, escrito distinto)
    dup[0], dup[2], dup[3] = 1501, dup[2].upper(), dup[3].upper()
    clientes.append(dup)
    con.executemany('INSERT INTO clientes VALUES (?,?,?,?,?,?,?)', clientes)

    empleados = []
    eid = 0
    for s in sedes:
        for cargo in ['Químico farmacéutico', 'Técnico en farmacia', 'Técnico en farmacia', 'Cajero']:
            eid += 1
            n, a = persona(rng)
            empleados.append((eid, n, a, cargo, s[0], fecha_rand(rng, dt.date(2020, 1, 1), dt.date(2024, 12, 31)).isoformat()))
    con.executemany('INSERT INTO empleados VALUES (?,?,?,?,?,?)', empleados)
    emp_por_sede = {s[0]: [e[0] for e in empleados if e[4] == s[0]] for s in sedes}

    def peso(d):
        w = {0: 1.0, 1: 0.95, 2: 0.95, 3: 1.0, 4: 1.05, 5: 1.2, 6: 0.85}[d.weekday()]
        w *= {5: 1.15, 6: 1.3, 7: 1.35, 8: 1.2}.get(d.month, 1.0)  # invierno limeño
        return w * (1 + 0.08 * (d.year - 2025))

    ventas, detalle = [], []
    vid = did = 0
    correl = {s[0]: 0 for s in sedes}
    for d, n in reparto(rng, 9000, peso):
        invierno = d.month in (5, 6, 7, 8, 9)
        for _ in range(n):
            vid += 1
            sede = rng.choices([1, 2, 3, 4], peso_sede)[0]
            if d < dt.date(2023, 11, 20) and sede == 4:
                sede = 1
            correl[sede] += 1
            factura = rng.random() < 0.08
            total = 0.0
            for _ in range(rng.choices([1, 2, 3, 4], [50, 30, 14, 6])[0]):
                pesos_cat = {2: 3.0 if invierno else 0.7, 1: 1.6, 6: 1.2, 4: 1.3 if invierno else 0.9}
                prods = productos
                pr = rng.choices(prods, [pesos_cat.get(p[3], 1.0) * (1.6 if p[5] == 'unidad' else 0.8) for p in prods])[0]
                cant = rng.choices([1, 2, 3, 6, 10], [55, 20, 10, 8, 7])[0] if pr[5] == 'unidad' and pr[6] < 4 else rng.choice([1, 1, 1, 2])
                imp = r2(cant * pr[6])
                did += 1
                detalle.append((did, vid, pr[0], cant, pr[6], imp))
                total += imp
            total = r2(total)
            sub, igv = desglose(total)
            cli = rng.randrange(1, 1501) if (factura or rng.random() < 0.55) else None
            estado, obs = ('anulada', 'Anulada por error de digitación') if rng.random() < 0.008 else ('emitida', None)
            ventas.append((vid, hora(rng, d, [(h, 3 if 9 <= h <= 13 or 17 <= h <= 21 else 1) for h in range(8, 23)]),
                           sede, cli, rng.choice(emp_por_sede[sede]), 'factura' if factura else 'boleta',
                           f'{"F" if factura else "B"}{sede:03d}-{correl[sede]:06d}',
                           rng.choices(['efectivo', 'Yape', 'Plin', 'tarjeta'], [40, 32, 10, 18])[0],
                           sub, igv, total, estado, obs))
    # suciedad: una venta negativa (devolución mal registrada)
    v = list(ventas[4321])
    v[8], v[9], v[10], v[11], v[12] = -38.98, -7.02, -46.00, 'anulada', 'Devolución registrada como venta negativa'
    ventas[4321] = tuple(v)
    con.executemany('INSERT INTO ventas VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)', ventas)
    con.executemany('INSERT INTO venta_detalle VALUES (?,?,?,?,?,?)', detalle)
    con.executescript('''
    CREATE VIEW v_ventas_mensuales AS
      SELECT substr(fecha,1,7) AS mes, COUNT(*) AS operaciones, ROUND(SUM(total),2) AS total_soles,
             ROUND(AVG(total),2) AS ticket_promedio
      FROM ventas WHERE estado='emitida' GROUP BY mes ORDER BY mes;
    CREATE VIEW v_ventas_por_sede AS
      SELECT s.nombre AS sede, substr(v.fecha,1,7) AS mes, COUNT(*) AS operaciones, ROUND(SUM(v.total),2) AS total_soles
      FROM ventas v JOIN sedes s ON s.id=v.sede_id WHERE v.estado='emitida' GROUP BY s.nombre, mes ORDER BY mes, sede;
    CREATE VIEW v_top_productos AS
      SELECT p.nombre || ' (' || p.presentacion || ')' AS producto, c.nombre AS categoria,
             SUM(d.cantidad) AS unidades, ROUND(SUM(d.importe),2) AS venta_soles,
             ROUND(SUM(d.importe - d.cantidad*p.costo_unitario),2) AS margen_soles
      FROM venta_detalle d JOIN ventas v ON v.id=d.venta_id JOIN productos p ON p.id=d.producto_id
      JOIN categorias c ON c.id=p.categoria_id WHERE v.estado='emitida'
      GROUP BY p.id ORDER BY venta_soles DESC;
    ''')
    cerrar(con)


# ===================================================================== POLLERÍA
def polleria():
    rng = random.Random(202)
    con = nueva_base('polleria')
    con.executescript('''
    CREATE TABLE locales(id INTEGER PRIMARY KEY, nombre TEXT NOT NULL, distrito TEXT NOT NULL, direccion TEXT,
        aforo INTEGER);
    CREATE TABLE platos(id INTEGER PRIMARY KEY, nombre TEXT NOT NULL, categoria TEXT NOT NULL, precio REAL NOT NULL,
        costo REAL NOT NULL, activo INTEGER NOT NULL DEFAULT 1);
    CREATE TABLE clientes(id INTEGER PRIMARY KEY, nombres TEXT, apellidos TEXT, telefono TEXT, distrito TEXT,
        fecha_registro TEXT);
    CREATE TABLE repartidores(id INTEGER PRIMARY KEY, nombres TEXT, apellidos TEXT,
        local_id INTEGER NOT NULL REFERENCES locales(id), vehiculo TEXT, fecha_ingreso TEXT);
    CREATE TABLE pedidos(id INTEGER PRIMARY KEY, fecha TEXT NOT NULL, local_id INTEGER NOT NULL REFERENCES locales(id),
        cliente_id INTEGER REFERENCES clientes(id), canal TEXT NOT NULL, repartidor_id INTEGER REFERENCES repartidores(id),
        medio_pago TEXT, subtotal REAL, igv REAL, costo_delivery REAL NOT NULL DEFAULT 0, total REAL,
        estado TEXT NOT NULL DEFAULT 'entregado', minutos_entrega INTEGER, calificacion INTEGER, observacion TEXT);
    CREATE TABLE pedido_detalle(id INTEGER PRIMARY KEY, pedido_id INTEGER NOT NULL REFERENCES pedidos(id),
        plato_id INTEGER NOT NULL REFERENCES platos(id), cantidad INTEGER NOT NULL, precio_unitario REAL NOT NULL,
        importe REAL NOT NULL);
    ''')
    locales = [(1, 'El Leñador – San Miguel', 'San Miguel', 'Av. La Marina 2480', 120),
               (2, 'El Leñador – Comas', 'Comas', 'Av. Túpac Amaru 3560', 90),
               (3, 'El Leñador – Ate', 'Ate', 'Carretera Central km 3.5', 110)]
    con.executemany('INSERT INTO locales VALUES (?,?,?,?,?)', locales)
    platos = [(1, '1/4 de pollo a la brasa con papas y ensalada', 'Pollo a la brasa', 19.90),
              (2, '1/2 pollo a la brasa con papas y ensalada', 'Pollo a la brasa', 36.90),
              (3, '1 pollo a la brasa con papas familiares', 'Pollo a la brasa', 64.90),
              (4, 'Combo familiar (1 pollo + papas + ensalada + Inca Kola 1.5 L)', 'Combos', 79.90),
              (5, 'Mostrito (1/4 pollo + chaufa)', 'Combos', 22.90),
              (6, 'Chaufa de pollo', 'Platos', 24.90), (7, 'Parrilla personal', 'Parrillas', 34.90),
              (8, 'Anticuchos (2 palitos) con papa', 'Parrillas', 26.90), (9, 'Mollejitas a la parrilla', 'Parrillas', 18.90),
              (10, 'Alitas BBQ x 8', 'Platos', 24.90), (11, 'Papas fritas familiares', 'Acompañamientos', 14.90),
              (12, 'Ensalada clásica', 'Acompañamientos', 8.90), (13, 'Inca Kola 1.5 L', 'Bebidas', 9.90),
              (14, 'Chicha morada (jarra 1 L)', 'Bebidas', 14.90), (15, 'Limonada (jarra 1 L)', 'Bebidas', 13.90),
              (16, 'Picarones con miel', 'Postres', 12.90), (17, 'Helado de lúcuma', 'Postres', 6.90)]
    con.executemany('INSERT INTO platos VALUES (?,?,?,?,?,1)',
                    [(i, n, c, p, r2(p * rng.uniform(0.32, 0.45))) for i, n, c, p in platos])
    pesos_plato = [16, 18, 10, 9, 10, 7, 6, 4, 3, 4, 5, 4, 12, 7, 5, 3, 2]

    clientes = []
    for i in range(1, 2201):
        n, a = persona(rng)
        dist = rng.choice(['San Miguel', 'Magdalena del Mar', 'Pueblo Libre', 'Callao', 'Comas', 'Independencia',
                           'Los Olivos', 'Ate', 'Santa Anita', 'La Molina'])
        clientes.append([i, n, a, telefono(rng), dist, fecha_rand(rng, dt.date(2024, 1, 1), FIN).isoformat()])
    for i in rng.sample(range(2200), 30):
        clientes[i][3] = None
    dup = list(clientes[11])
    dup[0], dup[1] = 2201, dup[1] + ' '  # duplicado con espacio de más
    clientes.append(dup)
    con.executemany('INSERT INTO clientes VALUES (?,?,?,?,?,?)', clientes)
    zona_local = {1: ['San Miguel', 'Magdalena del Mar', 'Pueblo Libre', 'Callao'],
                  2: ['Comas', 'Independencia', 'Los Olivos'], 3: ['Ate', 'Santa Anita', 'La Molina']}
    cli_local = {k: [c[0] for c in clientes if c[4] in v] for k, v in zona_local.items()}

    reps = []
    for i in range(1, 13):
        n, a = persona(rng)
        reps.append((i, n, a, (i - 1) % 3 + 1, rng.choice(['moto', 'moto', 'bicicleta']),
                     fecha_rand(rng, dt.date(2023, 1, 1), dt.date(2025, 6, 30)).isoformat()))
    con.executemany('INSERT INTO repartidores VALUES (?,?,?,?,?,?)', reps)

    especiales = {}
    for y in (2025, 2026):
        especiales[enesimo(y, 6, 6, 3)] = 3.5   # Día del Padre
        especiales[enesimo(y, 5, 6, 2)] = 2.2   # Día de la Madre
        especiales[enesimo(y, 7, 6, 3)] = 3.0   # Día del Pollo a la Brasa
        especiales[dt.date(y, 7, 28)] = 1.8
        especiales[dt.date(y, 7, 29)] = 1.6
        especiales[dt.date(y, 12, 24)] = 1.5
        especiales[dt.date(y, 12, 31)] = 1.5

    def peso(d):
        w = {0: 0.75, 1: 0.7, 2: 0.8, 3: 0.85, 4: 1.3, 5: 1.6, 6: 1.8}[d.weekday()]
        return w * especiales.get(d, 1.0) * (1 + 0.1 * (d.year - 2025))

    pedidos, detalle = [], []
    pid = did = 0
    for d, n in reparto(rng, 11000, peso):
        finde = d.weekday() >= 4 or d in especiales
        for _ in range(n):
            pid += 1
            loc = rng.choices([1, 2, 3], [1.2, 1.0, 0.9])[0]
            canal = rng.choices(['salón', 'delivery', 'para llevar', 'app'], [40, 35, 15, 10])[0]
            total = 0.0
            for _ in range(rng.choices([1, 2, 3, 4], [35, 35, 20, 10])[0]):
                pl = rng.choices(platos, pesos_plato)[0]
                cant = rng.choices([1, 2, 3], [75, 20, 5])[0]
                did += 1
                imp = r2(cant * pl[3])
                detalle.append((did, pid, pl[0], cant, pl[3], imp))
                total += imp
            rep = mins = cal = None
            delivery = 0.0
            cli = None
            if canal in ('delivery', 'app'):
                rep = rng.choice([r[0] for r in reps if r[3] == loc])
                delivery = 5.00 if canal == 'delivery' else 0.0
                mins = int(max(15, rng.gauss(42 if finde else 33, 11)))
                cal = max(1, min(5, round(rng.gauss(4.6 - max(0, mins - 45) / 15, 0.7))))
                cli = rng.choice(cli_local[loc])
            elif rng.random() < 0.25:
                cli = rng.choice(cli_local[loc])
            total = r2(total + delivery)
            sub, igv = desglose(total)
            estado, obs = ('anulado', 'Cliente canceló el pedido') if rng.random() < 0.012 else ('entregado', None)
            if estado == 'anulado':
                mins = cal = None
            horas = [(h, {12: 5, 13: 9, 14: 6, 15: 2, 18: 3, 19: 8, 20: 10, 21: 7, 22: 3}.get(h, 1)) for h in range(11, 24)]
            pedidos.append((pid, hora(rng, d, horas), loc, cli, canal, rep,
                            rng.choices(['efectivo', 'Yape', 'Plin', 'tarjeta'], [30, 38, 10, 22])[0],
                            sub, igv, delivery, total, estado, mins, cal, obs))
    # suciedad: delivery sin repartidor y un pedido negativo
    for i in (777, 3210, 8001):
        p = list(pedidos[i])
        if p[4] in ('delivery', 'app'):
            p[5] = None
            pedidos[i] = tuple(p)
    p = list(pedidos[5000])
    p[7], p[8], p[10], p[11], p[14] = -33.81, -6.09, -39.90, 'anulado', 'Reembolso cargado como pedido negativo'
    pedidos[5000] = tuple(p)
    con.executemany('INSERT INTO pedidos VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', pedidos)
    con.executemany('INSERT INTO pedido_detalle VALUES (?,?,?,?,?,?)', detalle)
    con.executescript('''
    CREATE VIEW v_ventas_mensuales AS
      SELECT substr(fecha,1,7) AS mes, COUNT(*) AS operaciones, ROUND(SUM(total),2) AS total_soles,
             ROUND(AVG(total),2) AS ticket_promedio
      FROM pedidos WHERE estado='entregado' GROUP BY mes ORDER BY mes;
    CREATE VIEW v_ventas_por_dia_semana AS
      SELECT CAST(strftime('%w',fecha) AS INTEGER) AS num_dia,
             CASE strftime('%w',fecha) WHEN '0' THEN 'domingo' WHEN '1' THEN 'lunes' WHEN '2' THEN 'martes'
               WHEN '3' THEN 'miércoles' WHEN '4' THEN 'jueves' WHEN '5' THEN 'viernes' ELSE 'sábado' END AS dia,
             COUNT(*) AS pedidos, ROUND(SUM(total),2) AS total_soles
      FROM pedidos WHERE estado='entregado' GROUP BY num_dia ORDER BY num_dia;
    CREATE VIEW v_delivery_por_repartidor AS
      SELECT r.nombres || ' ' || r.apellidos AS repartidor, l.nombre AS local, COUNT(*) AS pedidos,
             ROUND(AVG(p.minutos_entrega),1) AS minutos_promedio, ROUND(AVG(p.calificacion),2) AS calificacion
      FROM pedidos p JOIN repartidores r ON r.id=p.repartidor_id JOIN locales l ON l.id=p.local_id
      WHERE p.estado='entregado' GROUP BY r.id ORDER BY minutos_promedio;
    ''')
    cerrar(con)


# =================================================================== FERRETERÍA
def ferreteria():
    rng = random.Random(303)
    con = nueva_base('ferreteria')
    con.executescript('''
    CREATE TABLE sedes(id INTEGER PRIMARY KEY, nombre TEXT NOT NULL, distrito TEXT NOT NULL);
    CREATE TABLE categorias(id INTEGER PRIMARY KEY, nombre TEXT NOT NULL);
    CREATE TABLE productos(id INTEGER PRIMARY KEY, codigo TEXT UNIQUE, nombre TEXT NOT NULL,
        categoria_id INTEGER NOT NULL REFERENCES categorias(id), unidad TEXT NOT NULL, precio_venta REAL NOT NULL,
        costo_unitario REAL NOT NULL);
    CREATE TABLE clientes(id INTEGER PRIMARY KEY, tipo TEXT NOT NULL, nombre TEXT NOT NULL, documento TEXT,
        distrito TEXT, telefono TEXT, limite_credito REAL NOT NULL DEFAULT 0, fecha_registro TEXT);
    CREATE TABLE ventas(id INTEGER PRIMARY KEY, fecha TEXT NOT NULL, sede_id INTEGER NOT NULL REFERENCES sedes(id),
        cliente_id INTEGER REFERENCES clientes(id), condicion TEXT NOT NULL, dias_credito INTEGER,
        fecha_vencimiento TEXT, subtotal REAL, igv REAL, total REAL, estado TEXT NOT NULL DEFAULT 'emitida',
        observacion TEXT);
    CREATE TABLE venta_detalle(id INTEGER PRIMARY KEY, venta_id INTEGER NOT NULL REFERENCES ventas(id),
        producto_id INTEGER NOT NULL REFERENCES productos(id), cantidad REAL NOT NULL, precio_unitario REAL NOT NULL,
        importe REAL NOT NULL);
    CREATE TABLE pagos(id INTEGER PRIMARY KEY, venta_id INTEGER NOT NULL REFERENCES ventas(id), fecha TEXT NOT NULL,
        monto REAL NOT NULL, medio_pago TEXT);
    ''')
    sedes = [(1, 'Ferretería El Maestro – Villa El Salvador', 'Villa El Salvador'),
             (2, 'Ferretería El Maestro – Carabayllo', 'Puente Piedra'),
             (3, 'Ferretería El Maestro – Huachipa', 'Ate')]
    con.executemany('INSERT INTO sedes VALUES (?,?,?)', sedes)
    cats = {1: 'Cemento y agregados', 2: 'Fierro y acero', 3: 'Ladrillos y bloques', 4: 'Gasfitería', 5: 'Electricidad',
            6: 'Pinturas', 7: 'Herramientas', 8: 'Acabados'}
    con.executemany('INSERT INTO categorias VALUES (?,?)', cats.items())
    prods = [(1, 'Cemento Sol tipo I 42.5 kg', 'bolsa', 31.50, 12), (1, 'Cemento Andino tipo I 42.5 kg', 'bolsa', 30.90, 8),
             (1, 'Arena gruesa', 'm3', 75.00, 5), (1, 'Piedra chancada 1/2"', 'm3', 85.00, 4),
             (1, 'Hormigón', 'm3', 70.00, 3),
             (2, 'Fierro corrugado 1/2" x 9 m', 'varilla', 42.00, 10), (2, 'Fierro corrugado 3/8" x 9 m', 'varilla', 24.50, 10),
             (2, 'Fierro corrugado 1/4" x 9 m', 'varilla', 11.90, 6), (2, 'Alambre negro N.° 16', 'kg', 6.50, 6),
             (2, 'Clavos de 3"', 'kg', 7.00, 5),
             (3, 'Ladrillo King Kong 18 huecos', 'millar', 1050.00, 4), (3, 'Ladrillo pandereta', 'millar', 780.00, 3),
             (3, 'Bloque de concreto 15 cm', 'unidad', 3.20, 2),
             (4, 'Tubo PVC desagüe 4" x 3 m', 'unidad', 28.90, 4), (4, 'Tubo PVC agua 1/2" x 5 m', 'unidad', 9.90, 4),
             (4, 'Codo PVC 4"', 'unidad', 4.50, 3), (4, 'Grifo de lavatorio cromado', 'unidad', 45.00, 2),
             (4, 'Tanque de agua 1100 L', 'unidad', 489.00, 1),
             (5, 'Cable THW 14 AWG (rollo 100 m)', 'rollo', 145.00, 3), (5, 'Interruptor termomagnético 2x20 A', 'unidad', 32.00, 2),
             (5, 'Tomacorriente doble', 'unidad', 8.50, 2), (5, 'Foco LED 12 W', 'unidad', 7.90, 2),
             (6, 'Pintura látex blanco (balde 4 gal)', 'balde', 189.00, 3), (6, 'Pintura esmalte (galón)', 'galón', 62.00, 2),
             (6, 'Thinner acrílico (galón)', 'galón', 28.00, 2),
             (7, 'Carretilla buggy', 'unidad', 189.00, 1), (7, 'Pala cuchara', 'unidad', 35.00, 1),
             (7, 'Martillo de uña 16 oz', 'unidad', 29.90, 1), (7, 'Wincha 5 m', 'unidad', 18.50, 1),
             (8, 'Cerámico piso 45x45', 'm2', 32.90, 3), (8, 'Porcelanato 60x60', 'm2', 58.00, 2),
             (8, 'Pegamento para cerámico 25 kg', 'bolsa', 22.00, 3), (8, 'Fragua (1 kg)', 'kg', 6.00, 2)]
    productos = []
    for i, (c, n, u, p, w) in enumerate(prods, 1):
        productos.append((i, f'FM-{i:03d}', n, c, u, p, r2(p * rng.uniform(0.7, 0.84)), w))
    con.executemany('INSERT INTO productos VALUES (?,?,?,?,?,?,?)', [p[:7] for p in productos])

    clientes = []
    for i in range(1, 421):
        tipo = rng.choices(['maestro de obra', 'constructora', 'particular'], [55, 10, 35])[0]
        if tipo == 'constructora':
            nom = f'Constructora {rng.choice(APELLIDOS)} {rng.choice(["S.A.C.", "E.I.R.L.", "S.R.L."])}'
            doc = '20' + str(rng.randrange(100000000, 999999999))
            lim = rng.choice([15000, 20000, 30000, 50000])
        else:
            n, a = persona(rng)
            nom = f'{n} {a}'
            doc = dni(rng)
            lim = rng.choice([1500, 2000, 3000, 5000, 8000]) if tipo == 'maestro de obra' else 0
        dist = rng.choice(['Villa El Salvador', 'Villa María del Triunfo', 'San Juan de Miraflores', 'Lurín',
                           'Puente Piedra', 'Carabayllo', 'Comas', 'Ate', 'Lurigancho', 'Santa Anita'])
        clientes.append([i, tipo, nom, doc, dist, telefono(rng) if rng.random() > 0.1 else None, lim,
                         fecha_rand(rng, dt.date(2022, 1, 1), dt.date(2026, 6, 30)).isoformat()])
    for i in rng.sample(range(420), 6):
        clientes[i][3] = None  # suciedad: sin documento
    dup = list(clientes[20])
    dup[0], dup[2] = 421, dup[2].replace(' ', '  ', 1)
    clientes.append(dup)
    con.executemany('INSERT INTO clientes VALUES (?,?,?,?,?,?,?,?)', clientes)
    morosos = set(rng.sample([c[0] for c in clientes if c[1] != 'particular'], 25))

    def peso(d):
        w = {0: 1.1, 1: 1.05, 2: 1.0, 3: 1.0, 4: 1.05, 5: 1.15, 6: 0.4}[d.weekday()]
        w *= {1: 0.85, 2: 0.8, 3: 0.9, 9: 1.15, 10: 1.25, 11: 1.3, 12: 1.2}.get(d.month, 1.0)
        return w

    ventas, detalle, pagos = [], [], []
    vid = did = pgid = 0
    for d, n in reparto(rng, 7000, peso):
        for _ in range(n):
            vid += 1
            cli = rng.choice(clientes)
            if rng.random() < 0.3:
                cli = None
            credito = cli is not None and cli[1] != 'particular' and rng.random() < 0.6
            total = 0.0
            for _ in range(rng.choices([1, 2, 3, 4, 5], [30, 28, 20, 14, 8])[0]):
                pr = rng.choices(productos, [p[7] for p in productos])[0]
                u = pr[4]
                if u in ('m3',):
                    cant = rng.choice([0.5, 1, 1, 2, 3])
                elif u == 'millar':
                    cant = rng.choice([0.5, 1, 1, 2])
                elif u in ('bolsa', 'varilla'):
                    cant = rng.choice([2, 5, 10, 10, 20, 30, 50])
                elif u in ('kg', 'm2'):
                    cant = rng.choice([1, 2, 5, 10, 20])
                else:
                    cant = rng.choice([1, 1, 2, 3, 6])
                if cli is None or cli[1] == 'particular':
                    cant = max(0.5, cant / 3) if u in ('m3', 'millar') else max(1, round(cant / 3))
                did += 1
                imp = r2(cant * pr[5])
                detalle.append((did, vid, pr[0], cant, pr[5], imp))
                total += imp
            total = r2(total)
            sub, igv = desglose(total)
            dias_c = rng.choice([15, 30, 30, 45]) if credito else None
            venc = (d + dt.timedelta(days=dias_c)).isoformat() if credito else None
            estado, obs = ('anulada', 'Anulada: cliente devolvió el material') if rng.random() < 0.007 else ('emitida', None)
            ventas.append((vid, hora(rng, d, [(h, 3 if h < 13 else 2) for h in range(7, 19)]), rng.choices([1, 2, 3], [1.3, 1.0, 0.9])[0],
                           cli[0] if cli else None, 'crédito' if credito else 'contado', dias_c, venc, sub, igv, total,
                           estado, obs))
            if estado != 'emitida':
                continue
            medio = rng.choices(['efectivo', 'transferencia', 'Yape', 'depósito'], [35, 35, 20, 10])[0]
            if not credito:
                pgid += 1
                pagos.append((pgid, vid, ventas[-1][1][:10], total, medio))
                continue
            moroso = cli[0] in morosos
            saldo = total
            fp = d
            partes = rng.choice([1, 1, 2, 3])
            for k in range(partes):
                fp = fp + dt.timedelta(days=rng.randint(5, dias_c + (60 if moroso else 10)))
                if fp > FIN or (moroso and rng.random() < 0.45):
                    break
                monto = saldo if k == partes - 1 else r2(saldo * rng.uniform(0.3, 0.7))
                pgid += 1
                pagos.append((pgid, vid, fp.isoformat(), r2(monto), medio))
                saldo = r2(saldo - monto)
                if saldo <= 0:
                    break
    v = list(ventas[2500])
    v[7], v[8], v[9], v[10], v[11] = -110.17, -19.83, -130.00, 'anulada', 'Nota de crédito digitada como venta negativa'
    ventas[2500] = tuple(v)
    pagos = [p for p in pagos if p[1] != 2501]
    con.executemany('INSERT INTO ventas VALUES (?,?,?,?,?,?,?,?,?,?,?,?)', ventas)
    con.executemany('INSERT INTO venta_detalle VALUES (?,?,?,?,?,?)', detalle)
    con.executemany('INSERT INTO pagos VALUES (?,?,?,?,?)', pagos)
    con.executescript(f'''
    CREATE VIEW v_ventas_mensuales AS
      SELECT substr(fecha,1,7) AS mes, COUNT(*) AS operaciones, ROUND(SUM(total),2) AS total_soles,
             ROUND(SUM(CASE WHEN condicion='contado' THEN total ELSE 0 END),2) AS contado_soles,
             ROUND(SUM(CASE WHEN condicion='crédito' THEN total ELSE 0 END),2) AS credito_soles
      FROM ventas WHERE estado='emitida' GROUP BY mes ORDER BY mes;
    CREATE VIEW v_cuentas_por_cobrar AS
      SELECT v.id AS venta_id, v.fecha, v.fecha_vencimiento, c.id AS cliente_id, c.nombre AS cliente, c.tipo,
             v.total, ROUND(COALESCE(SUM(p.monto),0),2) AS pagado, ROUND(v.total-COALESCE(SUM(p.monto),0),2) AS saldo,
             CAST(julianday('{HOY}') - julianday(v.fecha_vencimiento) AS INTEGER) AS dias_vencido
      FROM ventas v JOIN clientes c ON c.id=v.cliente_id LEFT JOIN pagos p ON p.venta_id=v.id
      WHERE v.condicion='crédito' AND v.estado='emitida'
      GROUP BY v.id HAVING saldo > 0.009;
    CREATE VIEW v_deuda_por_cliente AS
      SELECT cliente_id, cliente, tipo, COUNT(*) AS facturas_pendientes, ROUND(SUM(saldo),2) AS deuda_soles,
             MAX(dias_vencido) AS max_dias_vencido
      FROM v_cuentas_por_cobrar GROUP BY cliente_id ORDER BY deuda_soles DESC;
    ''')
    cerrar(con)


# ===================================================================== ACADEMIA
def academia():
    rng = random.Random(404)
    con = nueva_base('academia')
    con.executescript('''
    CREATE TABLE sedes(id INTEGER PRIMARY KEY, nombre TEXT NOT NULL, distrito TEXT NOT NULL);
    CREATE TABLE ciclos(id INTEGER PRIMARY KEY, nombre TEXT NOT NULL, tipo TEXT NOT NULL, fecha_inicio TEXT NOT NULL,
        fecha_fin TEXT NOT NULL, meses INTEGER NOT NULL, pension_mensual REAL NOT NULL, monto_matricula REAL NOT NULL);
    CREATE TABLE alumnos(id INTEGER PRIMARY KEY, dni TEXT, nombres TEXT, apellidos TEXT, fecha_nacimiento TEXT,
        colegio_procedencia TEXT, distrito TEXT, carrera_postula TEXT, universidad_objetivo TEXT,
        telefono_apoderado TEXT, fecha_registro TEXT);
    CREATE TABLE matriculas(id INTEGER PRIMARY KEY, alumno_id INTEGER NOT NULL REFERENCES alumnos(id),
        ciclo_id INTEGER NOT NULL REFERENCES ciclos(id), sede_id INTEGER NOT NULL REFERENCES sedes(id),
        fecha_matricula TEXT NOT NULL, monto_matricula REAL NOT NULL, descuento_pct REAL NOT NULL DEFAULT 0,
        estado TEXT NOT NULL, fecha_retiro TEXT);
    CREATE TABLE pensiones(id INTEGER PRIMARY KEY, matricula_id INTEGER NOT NULL REFERENCES matriculas(id),
        numero_cuota INTEGER NOT NULL, fecha_vencimiento TEXT NOT NULL, monto REAL NOT NULL, fecha_pago TEXT,
        monto_pagado REAL, medio_pago TEXT, observacion TEXT);
    CREATE TABLE asistencias(id INTEGER PRIMARY KEY, matricula_id INTEGER NOT NULL REFERENCES matriculas(id),
        mes TEXT NOT NULL, sesiones_programadas INTEGER NOT NULL, sesiones_asistidas INTEGER NOT NULL);
    CREATE TABLE simulacros(id INTEGER PRIMARY KEY, matricula_id INTEGER NOT NULL REFERENCES matriculas(id),
        fecha TEXT NOT NULL, puntaje REAL NOT NULL);
    ''')
    sedes = [(1, 'Academia Pre Futuro – Cercado', 'Cercado de Lima'), (2, 'Academia Pre Futuro – Los Olivos', 'Los Olivos'),
             (3, 'Academia Pre Futuro – San Juan de Lurigancho', 'San Juan de Lurigancho')]
    con.executemany('INSERT INTO sedes VALUES (?,?,?)', sedes)
    ciclos = []
    cid = 0
    for y in (2025, 2026):
        alza = 1.0 if y == 2025 else 1.06
        for nom, tipo, ini, fin, meses, pen, mat, demanda in [
            (f'Ciclo Verano {y}', 'verano', f'{y}-01-06', f'{y}-02-28', 2, 450, 80, 1.0),
            (f'Ciclo Anual {y}', 'anual', f'{y}-03-03', f'{y}-12-12', 10, 520, 120, 1.4),
            (f'Ciclo Semestral {y}-I', 'semestral', f'{y}-03-10', f'{y}-07-25', 5, 480, 100, 1.1),
            (f'Ciclo Semestral {y}-II', 'semestral', f'{y}-08-11', f'{y}-12-19', 5, 480, 100, 0.7),
            (f'Repaso San Marcos {y}-II', 'repaso', f'{y}-08-04', f'{y}-09-26', 2, 400, 60, 0.5)]:
            cid += 1
            ciclos.append((cid, nom, tipo, ini, fin, meses, r2(pen * alza), r2(mat * alza), demanda))
    con.executemany('INSERT INTO ciclos VALUES (?,?,?,?,?,?,?,?)', [c[:8] for c in ciclos])

    carreras = [('Medicina Humana', 'UNMSM'), ('Ingeniería de Sistemas', 'UNI'), ('Derecho', 'UNMSM'),
                ('Ingeniería Civil', 'UNI'), ('Contabilidad', 'UNMSM'), ('Psicología', 'UNFV'),
                ('Administración', 'UNFV'), ('Enfermería', 'UNMSM'), ('Arquitectura', 'UNI'),
                ('Ingeniería Industrial', 'UNMSM'), ('Educación', 'UNE'), ('Economía', 'UNI')]
    colegios = ['I.E. Melitón Carvajal', 'I.E. Ricardo Palma', 'I.E. Bartolomé Herrera', 'Colegio Trilce',
                'I.E. Alfonso Ugarte', 'Colegio Saco Oliveros', 'I.E. José Granda', 'I.E. Fe y Alegría N.° 5',
                'I.E. Juana Alarco de Dammert', 'Colegio Pamer', 'I.E. Mariano Melgar']
    alumnos = []
    for i in range(1, 1601):
        n, a = persona(rng)
        car, uni = rng.choices(carreras, [18, 12, 9, 9, 7, 7, 6, 6, 5, 6, 4, 5])[0]
        alumnos.append([i, dni(rng), n, a, fecha_rand(rng, dt.date(2007, 1, 1), dt.date(2010, 12, 31)).isoformat(),
                        rng.choice(colegios), rng.choice(DISTRITOS), car, uni,
                        telefono(rng) if rng.random() > 0.08 else None, None])
    dup = list(alumnos[41])
    dup[0], dup[3] = 1601, dup[3].lower()
    alumnos.append(dup)

    matriculas, pensiones, asist, simul = [], [], [], []
    mid = pid = aid = sid = 0
    medios = ['efectivo', 'transferencia', 'Yape', 'tarjeta']
    for c in ciclos:
        ini = dt.date.fromisoformat(c[3])
        fin = dt.date.fromisoformat(c[4])
        if ini > FIN:
            continue
        n = int(250 * c[8])
        for _ in range(n):
            mid += 1
            al = rng.choice(alumnos)
            antes = 4 if ini.month == 1 else 35  # el Verano se llena en la primera semana de enero
            fm = ini + dt.timedelta(days=rng.randint(-antes, 14))
            fm = min(max(fm, INICIO), FIN)
            if al[10] is None or al[10] > fm.isoformat():
                al[10] = fm.isoformat()
            desc = rng.choices([0, 10, 15, 20, 50], [60, 18, 10, 8, 4])[0]
            sede = rng.choices([1, 2, 3], [1.2, 1.0, 1.1])[0]
            moroso = rng.random() < 0.12
            retiro = None
            if rng.random() < (0.22 if moroso else 0.08):
                retiro = fecha_rand(rng, ini + dt.timedelta(days=20), fin)
            if retiro and retiro > FIN:
                retiro = None
            estado = 'retirada' if retiro else ('culminada' if fin <= FIN else 'activa')
            matriculas.append((mid, al[0], c[0], sede, fm.isoformat(), c[7], desc, estado,
                               retiro.isoformat() if retiro else None))
            pen = r2(c[6] * (1 - desc / 100))
            for k in range(c[5]):
                y, m = ini.year, ini.month + k
                y += (m - 1) // 12
                m = (m - 1) % 12 + 1
                venc = dt.date(y, m, min(ini.day, 28)) if k else ini
                if retiro and venc > retiro:
                    break
                pid += 1
                fpago = monto = medio = None
                r = rng.random()
                if moroso and r < 0.45:
                    pass  # no pagó
                else:
                    atraso = rng.randint(-5, 3) if r < 0.75 else rng.randint(5, 50)
                    f = venc + dt.timedelta(days=atraso)
                    if f <= FIN:
                        fpago, monto, medio = f.isoformat(), pen, rng.choice(medios)
                pensiones.append([pid, mid, k + 1, venc.isoformat(), pen, fpago, monto, medio, None])
                # asistencia mensual
                if venc <= FIN:
                    prog = rng.randint(18, 22)
                    base = 0.6 if moroso or retiro else 0.88
                    aid += 1
                    asist.append((aid, mid, f'{y}-{m:02d}', prog, max(0, min(prog, round(prog * rng.gauss(base, 0.1))))))
                    if rng.random() < 0.5:
                        sid += 1
                        simul.append((sid, mid, (venc + dt.timedelta(days=14)).isoformat(),
                                      r2(max(0, min(20, rng.gauss(13.5 if not moroso else 10.5, 2.8) + k * 0.25)))))
    con.executemany('INSERT INTO alumnos VALUES (?,?,?,?,?,?,?,?,?,?,?)', alumnos)
    con.executemany('INSERT INTO matriculas VALUES (?,?,?,?,?,?,?,?,?)', matriculas)
    pensiones[1234][6] = -pensiones[1234][4]
    pensiones[1234][8] = 'Reversión de pago duplicado'
    if pensiones[1234][5] is None:
        pensiones[1234][5] = pensiones[1234][3]
    con.executemany('INSERT INTO pensiones VALUES (?,?,?,?,?,?,?,?,?)', pensiones)
    con.executemany('INSERT INTO asistencias VALUES (?,?,?,?,?)', asist)
    con.executemany('INSERT INTO simulacros VALUES (?,?,?,?)', [s for s in simul if s[2] <= FIN.isoformat()])
    con.executescript(f'''
    CREATE VIEW v_ventas_mensuales AS
      SELECT substr(fecha_pago,1,7) AS mes, COUNT(*) AS operaciones, ROUND(SUM(monto_pagado),2) AS total_soles
      FROM pensiones WHERE fecha_pago IS NOT NULL AND monto_pagado > 0 GROUP BY mes ORDER BY mes;
    CREATE VIEW v_matriculas_mensuales AS
      SELECT substr(fecha_matricula,1,7) AS mes, COUNT(*) AS matriculas,
             ROUND(SUM(monto_matricula),2) AS matricula_soles
      FROM matriculas GROUP BY mes ORDER BY mes;
    CREATE VIEW v_morosidad AS
      SELECT p.id AS pension_id, a.nombres || ' ' || a.apellidos AS alumno, a.telefono_apoderado, c.nombre AS ciclo,
             s.nombre AS sede, p.numero_cuota, p.fecha_vencimiento, p.monto,
             CAST(julianday('{HOY}') - julianday(p.fecha_vencimiento) AS INTEGER) AS dias_atraso
      FROM pensiones p JOIN matriculas m ON m.id=p.matricula_id JOIN alumnos a ON a.id=m.alumno_id
      JOIN ciclos c ON c.id=m.ciclo_id JOIN sedes s ON s.id=m.sede_id
      WHERE p.fecha_pago IS NULL AND p.fecha_vencimiento < '{HOY}';
    ''')
    cerrar(con)


# ====================================================================== COURIER
def courier():
    rng = random.Random(505)
    con = nueva_base('courier')
    con.executescript('''
    CREATE TABLE zonas(id INTEGER PRIMARY KEY, nombre TEXT NOT NULL, descripcion TEXT, tarifa_base REAL NOT NULL,
        tarifa_kg_adicional REAL NOT NULL, sla_horas INTEGER NOT NULL);
    CREATE TABLE repartidores(id INTEGER PRIMARY KEY, nombres TEXT, apellidos TEXT, vehiculo TEXT,
        zona_id INTEGER NOT NULL REFERENCES zonas(id), fecha_ingreso TEXT, activo INTEGER NOT NULL DEFAULT 1);
    CREATE TABLE clientes(id INTEGER PRIMARY KEY, razon_social TEXT NOT NULL, ruc TEXT, tipo TEXT NOT NULL,
        distrito TEXT, telefono TEXT, fecha_registro TEXT);
    CREATE TABLE envios(id INTEGER PRIMARY KEY, codigo TEXT UNIQUE NOT NULL,
        cliente_id INTEGER NOT NULL REFERENCES clientes(id), zona_id INTEGER NOT NULL REFERENCES zonas(id),
        repartidor_id INTEGER REFERENCES repartidores(id), distrito_destino TEXT, fecha_registro TEXT NOT NULL,
        fecha_recojo TEXT, fecha_entrega TEXT, peso_kg REAL, contra_entrega INTEGER NOT NULL DEFAULT 0,
        subtotal REAL, igv REAL, total REAL, estado TEXT NOT NULL, observacion TEXT);
    CREATE TABLE incidencias(id INTEGER PRIMARY KEY, envio_id INTEGER NOT NULL REFERENCES envios(id),
        fecha TEXT NOT NULL, tipo TEXT NOT NULL, descripcion TEXT, resuelta INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE calificaciones(id INTEGER PRIMARY KEY, envio_id INTEGER NOT NULL REFERENCES envios(id),
        puntaje INTEGER NOT NULL, comentario TEXT);
    ''')
    zonas = [(1, 'Lima Centro', 'Cercado, Breña, La Victoria, Rímac', 8.00, 1.00, 24, ['Cercado de Lima', 'Breña', 'La Victoria', 'Rímac']),
             (2, 'Lima Moderna', 'Miraflores, San Isidro, Surco, San Borja…', 9.00, 1.00, 24, ['Miraflores', 'San Isidro', 'Santiago de Surco', 'San Borja', 'Lince', 'Jesús María', 'Barranco']),
             (3, 'Lima Norte', 'Los Olivos, Comas, SMP, Independencia', 10.00, 1.20, 48, ['Los Olivos', 'Comas', 'San Martín de Porres', 'Independencia', 'Puente Piedra']),
             (4, 'Lima Sur', 'Chorrillos, SJM, VES, VMT', 10.00, 1.20, 48, ['Chorrillos', 'San Juan de Miraflores', 'Villa El Salvador', 'Villa María del Triunfo']),
             (5, 'Lima Este', 'Ate, SJL, Santa Anita, La Molina', 10.00, 1.20, 48, ['Ate', 'San Juan de Lurigancho', 'Santa Anita', 'La Molina', 'El Agustino']),
             (6, 'Callao', 'Callao, Bellavista, La Perla', 10.00, 1.20, 48, ['Callao']),
             (7, 'Provincias costa', 'Ica, Trujillo, Chiclayo, Piura, Arequipa', 18.00, 2.50, 72, ['Ica', 'Trujillo', 'Chiclayo', 'Piura', 'Arequipa']),
             (8, 'Provincias sierra y selva', 'Huancayo, Cusco, Puno, Tarapoto, Iquitos', 24.00, 3.50, 120, ['Huancayo', 'Cusco', 'Puno', 'Tarapoto', 'Iquitos'])]
    con.executemany('INSERT INTO zonas VALUES (?,?,?,?,?,?)', [z[:6] for z in zonas])
    reps = []
    for i in range(1, 25):
        n, a = persona(rng)
        z = (i - 1) % 8 + 1
        reps.append((i, n, a, 'furgoneta' if z >= 7 else rng.choice(['moto', 'moto', 'auto']), z,
                     fecha_rand(rng, dt.date(2022, 1, 1), dt.date(2025, 3, 1)).isoformat(), 0 if i in (5, 17) else 1))
    con.executemany('INSERT INTO repartidores VALUES (?,?,?,?,?,?,?)', reps)
    reps_zona = {z[0]: [r[0] for r in reps if r[4] == z[0]] for z in zonas}
    malos = {3, 14}  # repartidores con más incidencias

    tiendas = ['Moda Gamarra', 'TecnoPerú Store', 'Belleza Natural', 'Zapatillas Lima', 'Juguetería Arcoíris',
               'Suplementos Fit', 'Café de Altura', 'Mascotas Felices', 'Libros & Más', 'Hogar Bonito',
               'Celulares Express', 'Artesanías del Ande', 'Repuestos Moto', 'Vinos Ica', 'Ropa Bebé Kids']
    clientes = []
    for i in range(1, 181):
        tipo = rng.choices(['e-commerce', 'pyme', 'persona'], [40, 35, 25])[0]
        if tipo == 'persona':
            n, a = persona(rng)
            rs, ruc = f'{n} {a}', '10' + dni(rng) + str(rng.randrange(10))
        else:
            rs = f'{rng.choice(tiendas)} {rng.choice(APELLIDOS)} {rng.choice(["S.A.C.", "E.I.R.L."])}'
            ruc = '20' + str(rng.randrange(100000000, 999999999))
        clientes.append([i, rs, ruc, tipo, rng.choice(DISTRITOS), telefono(rng) if rng.random() > 0.1 else None,
                         fecha_rand(rng, dt.date(2023, 1, 1), dt.date(2026, 6, 30)).isoformat()])
    dup = list(clientes[9])
    dup[0], dup[1] = 181, dup[1].replace('S.A.C.', 'SAC').replace('E.I.R.L.', 'EIRL')
    clientes.append(dup)
    con.executemany('INSERT INTO clientes VALUES (?,?,?,?,?,?,?)', clientes)
    peso_cli = [8 if c[3] == 'e-commerce' else 3 if c[3] == 'pyme' else 1 for c in clientes[:180]]

    especiales = {}
    for y in (2025, 2026):
        for m in (7, 11):  # Cyber Wow
            for k in range(3):
                especiales[enesimo(y, m, 0, 1) + dt.timedelta(days=k + 1)] = 2.2
        especiales[enesimo(y, 11, 4, 4)] = 2.0  # Black Friday
        for k in range(10, 24):
            especiales[dt.date(y, 12, k)] = 1.8
        especiales[enesimo(y, 5, 6, 2) - dt.timedelta(days=3)] = 1.7

    def peso(d):
        w = {0: 1.15, 1: 1.1, 2: 1.05, 3: 1.05, 4: 1.0, 5: 0.6, 6: 0.15}[d.weekday()]
        return w * especiales.get(d, 1.0) * (1 + 0.15 * (d.year - 2025))

    envios, incid, calif = [], [], []
    eid = iid = cid = 0
    tipos_inc = ['cliente ausente', 'dirección errada', 'paquete dañado', 'retraso en ruta', 'rechazado por el cliente',
                 'robo en ruta']
    for d, n in reparto(rng, 8500, peso):
        pico = especiales.get(d, 1.0) > 1.5
        for _ in range(n):
            eid += 1
            cli = rng.choices(clientes[:180], peso_cli)[0]
            z = zonas[rng.choices(range(8), [14, 18, 17, 14, 16, 8, 8, 5])[0]]
            rep = rng.choice(reps_zona[z[0]])
            peso_kg = r2(max(0.2, rng.lognormvariate(0.3, 0.8)))
            total = r2(z[3] + max(0, peso_kg - 1) * z[4])
            sub, igv = desglose(total)
            freg = hora(rng, d, [(h, 2 if 9 <= h <= 17 else 1) for h in range(7, 22)])
            rec = dt.datetime.fromisoformat(freg) + dt.timedelta(hours=rng.uniform(1, 20))
            factor = rng.lognormvariate(-0.5 + (0.35 if pico else 0) + (0.25 if rep in malos else 0), 0.45)
            ent = rec + dt.timedelta(hours=z[5] * factor)
            r = rng.random()
            estado = 'entregado'
            if r < 0.04:
                estado = 'devuelto'
            elif r < 0.06:
                estado = 'cancelado'
            fent = ent.strftime('%Y-%m-%d %H:%M:%S') if estado == 'entregado' else None
            frec = rec.strftime('%Y-%m-%d %H:%M:%S') if estado != 'cancelado' else None
            if estado == 'entregado' and ent.date() > FIN:
                estado, fent = 'en ruta', None
            envios.append([eid, f'GQ{d.strftime("%y%m")}{eid:06d}', cli[0], z[0], rep if frec else None,
                           rng.choice(z[6]), freg, frec, fent, peso_kg, 1 if rng.random() < 0.3 else 0,
                           sub, igv, total, estado, None])
            p_inc = 0.06 + (0.08 if rep in malos else 0) + (0.04 if pico else 0) + (0.5 if estado == 'devuelto' else 0)
            if frec and rng.random() < p_inc:
                iid += 1
                t = rng.choices(tipos_inc, [30, 22, 12, 25, 9, 2])[0]
                incid.append((iid, eid, (rec + dt.timedelta(hours=rng.uniform(2, 30))).strftime('%Y-%m-%d %H:%M:%S'),
                              t, f'Incidencia: {t}', 1 if rng.random() < 0.8 else 0))
            if fent and rng.random() < 0.4:
                cid += 1
                horas_ent = (ent - rec).total_seconds() / 3600
                pt = max(1, min(5, round(rng.gauss(4.7 - (1.5 if horas_ent > z[5] else 0), 0.6))))
                com = {5: 'Excelente, llegó rápido', 4: 'Bien', 3: 'Regular', 2: 'Demoró bastante', 1: 'Muy mal servicio'}[pt]
                calif.append((cid, eid, pt, com if rng.random() < 0.7 else None))
    for i in rng.sample(range(len(envios)), 12):
        envios[i][9] = None  # suciedad: peso sin registrar
    e = envios[6000]
    e[11], e[12], e[13], e[14], e[15] = -6.78, -1.22, -8.00, 'cancelado', 'Nota de crédito cargada como envío negativo'
    con.executemany('INSERT INTO envios VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', envios)
    con.executemany('INSERT INTO incidencias VALUES (?,?,?,?,?,?)', incid)
    con.executemany('INSERT INTO calificaciones VALUES (?,?,?,?)', calif)
    con.executescript('''
    CREATE VIEW v_ventas_mensuales AS
      SELECT substr(fecha_registro,1,7) AS mes, COUNT(*) AS operaciones, ROUND(SUM(total),2) AS total_soles,
             ROUND(AVG(total),2) AS ticket_promedio
      FROM envios WHERE estado <> 'cancelado' GROUP BY mes ORDER BY mes;
    CREATE VIEW v_cumplimiento_sla AS
      SELECT z.nombre AS zona, z.sla_horas, COUNT(*) AS entregados,
             SUM((julianday(e.fecha_entrega)-julianday(e.fecha_recojo))*24 <= z.sla_horas) AS dentro_sla,
             ROUND(100.0*SUM((julianday(e.fecha_entrega)-julianday(e.fecha_recojo))*24 <= z.sla_horas)/COUNT(*),1) AS pct_sla,
             ROUND(AVG((julianday(e.fecha_entrega)-julianday(e.fecha_recojo))*24),1) AS horas_promedio
      FROM envios e JOIN zonas z ON z.id=e.zona_id WHERE e.estado='entregado' GROUP BY z.id ORDER BY z.id;
    CREATE VIEW v_incidencias_por_repartidor AS
      SELECT r.nombres || ' ' || r.apellidos AS repartidor, z.nombre AS zona, COUNT(DISTINCT e.id) AS envios,
             COUNT(i.id) AS incidencias, ROUND(100.0*COUNT(i.id)/COUNT(DISTINCT e.id),1) AS incidencias_x100
      FROM envios e JOIN repartidores r ON r.id=e.repartidor_id JOIN zonas z ON z.id=r.zona_id
      LEFT JOIN incidencias i ON i.envio_id=e.id GROUP BY r.id ORDER BY incidencias_x100 DESC;
    ''')
    cerrar(con)


# ============================================================ PREGUNTAS (5 x giro)
GIROS = {
    'botica': 'Botica de barrio con 4 sedes en Lima (ventas con boleta/factura, productos por categoría)',
    'polleria': 'Pollería con 3 locales: salón, para llevar, delivery propio y app',
    'ferreteria': 'Ferretería y materiales de construcción: ventas al contado y a crédito a maestros de obra',
    'academia': 'Academia preuniversitaria: ciclos, matrículas, pensiones, morosidad y asistencia',
    'courier': 'Empresa de envíos (courier): envíos por zona, repartidores, SLA, incidencias y calificaciones',
}

PREGUNTAS = {
    'botica': [
        ('¿Cuánto vendimos cada mes?', 'SELECT mes, operaciones, total_soles, ticket_promedio\nFROM v_ventas_mensuales;'),
        ('¿Qué sede vende más y con qué ticket promedio?',
         "SELECT s.nombre AS sede, COUNT(*) AS ventas, ROUND(SUM(v.total),2) AS total_soles,\n       ROUND(AVG(v.total),2) AS ticket_promedio\nFROM ventas v JOIN sedes s ON s.id = v.sede_id\nWHERE v.estado = 'emitida'\nGROUP BY s.nombre\nORDER BY total_soles DESC;"),
        ('Top 10 productos por margen bruto',
         'SELECT producto, categoria, unidades, venta_soles, margen_soles\nFROM v_top_productos\nORDER BY margen_soles DESC\nLIMIT 10;'),
        ('¿Se venden más antigripales en invierno?',
         "SELECT substr(v.fecha,1,7) AS mes, ROUND(SUM(d.importe),2) AS antigripales_soles\nFROM venta_detalle d\nJOIN ventas v ON v.id = d.venta_id\nJOIN productos p ON p.id = d.producto_id\nJOIN categorias c ON c.id = p.categoria_id\nWHERE c.nombre = 'Antigripales' AND v.estado = 'emitida'\nGROUP BY mes ORDER BY mes;"),
        ('Calidad de datos: DNI duplicados y ventas negativas',
         "SELECT 'DNI duplicado' AS problema, dni AS detalle, COUNT(*) AS casos\nFROM clientes GROUP BY dni HAVING COUNT(*) > 1\nUNION ALL\nSELECT 'Venta con total negativo', serie_numero, 1 FROM ventas WHERE total < 0\nUNION ALL\nSELECT 'Clientes sin distrito', NULL, COUNT(*) FROM clientes WHERE distrito IS NULL;"),
    ],
    'polleria': [
        ('¿Cuánto vendimos cada mes?', 'SELECT mes, operaciones, total_soles, ticket_promedio\nFROM v_ventas_mensuales;'),
        ('¿Qué día de la semana vendemos más?', 'SELECT dia, pedidos, total_soles\nFROM v_ventas_por_dia_semana;'),
        ('Domingos especiales vs. un domingo normal',
         "SELECT CASE\n         WHEN date(fecha) IN ('2025-06-15','2026-06-21') THEN 'Día del Padre'\n         WHEN date(fecha) IN ('2025-07-20','2026-07-19') THEN 'Día del Pollo a la Brasa'\n         WHEN date(fecha) IN ('2025-05-11','2026-05-10') THEN 'Día de la Madre'\n         ELSE 'Domingo normal' END AS tipo_dia,\n       COUNT(DISTINCT date(fecha)) AS dias,\n       ROUND(SUM(total) / COUNT(DISTINCT date(fecha)), 2) AS venta_promedio_por_dia\nFROM pedidos\nWHERE estado = 'entregado' AND strftime('%w', fecha) = '0'\nGROUP BY tipo_dia\nORDER BY venta_promedio_por_dia DESC;"),
        ('Tiempo de delivery por repartidor', 'SELECT repartidor, local, pedidos, minutos_promedio, calificacion\nFROM v_delivery_por_repartidor;'),
        ('Platos más pedidos por canal',
         "SELECT p.canal, pl.nombre AS plato, SUM(d.cantidad) AS unidades, ROUND(SUM(d.importe),2) AS total_soles\nFROM pedido_detalle d\nJOIN pedidos p ON p.id = d.pedido_id\nJOIN platos pl ON pl.id = d.plato_id\nWHERE p.estado = 'entregado'\nGROUP BY p.canal, pl.nombre\nORDER BY p.canal, unidades DESC;"),
    ],
    'ferreteria': [
        ('Ventas por mes: contado vs. crédito', 'SELECT mes, contado_soles, credito_soles, total_soles\nFROM v_ventas_mensuales;'),
        ('¿Quién nos debe más?', 'SELECT cliente, tipo, facturas_pendientes, deuda_soles, max_dias_vencido\nFROM v_deuda_por_cliente\nLIMIT 15;'),
        ('Antigüedad de la deuda (0-30, 31-60, 61-90, +90 días)',
         "SELECT CASE\n         WHEN dias_vencido <= 0 THEN '1. Por vencer'\n         WHEN dias_vencido <= 30 THEN '2. 1-30 días'\n         WHEN dias_vencido <= 60 THEN '3. 31-60 días'\n         WHEN dias_vencido <= 90 THEN '4. 61-90 días'\n         ELSE '5. Más de 90 días' END AS tramo,\n       COUNT(*) AS facturas, ROUND(SUM(saldo),2) AS saldo_soles\nFROM v_cuentas_por_cobrar\nGROUP BY tramo ORDER BY tramo;"),
        ('Productos estrella por categoría',
         "SELECT c.nombre AS categoria, p.nombre AS producto, p.unidad,\n       SUM(d.cantidad) AS cantidad, ROUND(SUM(d.importe),2) AS venta_soles\nFROM venta_detalle d\nJOIN ventas v ON v.id = d.venta_id\nJOIN productos p ON p.id = d.producto_id\nJOIN categorias c ON c.id = p.categoria_id\nWHERE v.estado = 'emitida'\nGROUP BY p.id\nORDER BY venta_soles DESC\nLIMIT 12;"),
        ('Maestros y constructoras que superan su límite de crédito',
         'SELECT c.nombre, c.tipo, c.limite_credito, d.deuda_soles,\n       ROUND(d.deuda_soles - c.limite_credito, 2) AS exceso_soles\nFROM v_deuda_por_cliente d JOIN clientes c ON c.id = d.cliente_id\nWHERE d.deuda_soles > c.limite_credito\nORDER BY exceso_soles DESC;'),
    ],
    'academia': [
        ('Matrículas por mes (pico de enero a marzo)', 'SELECT mes, matriculas, matricula_soles\nFROM v_matriculas_mensuales;'),
        ('Cobranza de pensiones por mes', 'SELECT mes, operaciones AS pagos, total_soles\nFROM v_ventas_mensuales;'),
        ('Morosidad por ciclo y sede',
         'SELECT ciclo, sede, COUNT(*) AS cuotas_vencidas, ROUND(SUM(monto),2) AS deuda_soles,\n       ROUND(AVG(dias_atraso)) AS dias_atraso_promedio\nFROM v_morosidad\nGROUP BY ciclo, sede\nORDER BY deuda_soles DESC;'),
        ('¿Los que faltan más se retiran más?',
         'SELECT m.estado, COUNT(DISTINCT m.id) AS matriculas,\n       ROUND(100.0 * SUM(a.sesiones_asistidas) / SUM(a.sesiones_programadas), 1) AS pct_asistencia\nFROM matriculas m JOIN asistencias a ON a.matricula_id = m.id\nGROUP BY m.estado\nORDER BY pct_asistencia;'),
        ('Carreras más postuladas por universidad',
         'SELECT universidad_objetivo AS universidad, carrera_postula AS carrera, COUNT(*) AS alumnos\nFROM alumnos\nGROUP BY universidad, carrera\nORDER BY alumnos DESC;'),
    ],
    'courier': [
        ('Envíos y facturación por mes', 'SELECT mes, operaciones AS envios, total_soles, ticket_promedio\nFROM v_ventas_mensuales;'),
        ('% de entregas dentro del SLA por zona', 'SELECT zona, sla_horas, entregados, dentro_sla, pct_sla, horas_promedio\nFROM v_cumplimiento_sla;'),
        ('Repartidores con más incidencias cada 100 envíos', 'SELECT repartidor, zona, envios, incidencias, incidencias_x100\nFROM v_incidencias_por_repartidor\nLIMIT 10;'),
        ('Tipos de incidencia y cuántas siguen sin resolver',
         'SELECT tipo, COUNT(*) AS incidencias, SUM(resuelta = 0) AS sin_resolver\nFROM incidencias\nGROUP BY tipo\nORDER BY incidencias DESC;'),
        ('Clientes que más facturan y su tasa de devolución',
         "SELECT c.razon_social, c.tipo, COUNT(*) AS envios, ROUND(SUM(e.total),2) AS total_soles,\n       ROUND(100.0 * SUM(e.estado = 'devuelto') / COUNT(*), 1) AS pct_devueltos\nFROM envios e JOIN clientes c ON c.id = e.cliente_id\nWHERE e.estado <> 'cancelado'\nGROUP BY c.id\nORDER BY total_soles DESC\nLIMIT 15;"),
    ],
}


def esquemas_md():
    out = ['# GoldenQuerys — esquemas de las bases', '',
           'Generado por `_fuente/sembrar.py`. Datos ficticios, fechas del 2025-01-01 al 2026-10-31,',
           'montos en soles (REAL, 2 decimales). Precios con IGV 18 % incluido: `total = subtotal + igv`.',
           'Las fechas son TEXT ISO (`YYYY-MM-DD` o `YYYY-MM-DD HH:MM:SS`): usa `substr(fecha,1,7)` para el mes,',
           "`strftime('%w', fecha)` para el día de la semana (0 = domingo) y `julianday()` para restar fechas.", '',
           '**Suciedad a propósito** (para preguntas de calidad de datos): algunos NULL (teléfonos, distritos,',
           'pesos), un cliente/alumno duplicado (mismo DNI/RUC, escrito distinto) y un registro con monto',
           'negativo marcado como anulado/cancelado con `observacion`. Filtra `estado` antes de sumar.', '']
    for base in GIROS:
        ruta = os.path.join(BASES, base + '.sqlite')
        con = sqlite3.connect(f'file:{ruta}?mode=ro', uri=True)
        out += [f'## {base}  (`bases/{base}.sqlite`, {os.path.getsize(ruta) // 1024} KB)', '', GIROS[base], '']
        for nombre, tipo in con.execute("SELECT name, type FROM sqlite_master WHERE type IN ('table','view') "
                                        "ORDER BY type, name"):
            cols = con.execute(f'PRAGMA table_info({nombre})').fetchall()
            fks = {f[3]: f'{f[2]}.{f[4]}' for f in con.execute(f'PRAGMA foreign_key_list({nombre})')}
            filas = con.execute(f'SELECT COUNT(*) FROM {nombre}').fetchone()[0]
            partes = []
            for c in cols:
                s = f'{c[1]} {c[2] or ""}'.strip()
                if c[5]:
                    s += ' PK'
                if c[1] in fks:
                    s += f' → {fks[c[1]]}'
                partes.append(s)
            etiqueta = 'vista' if tipo == 'view' else 'tabla'
            out.append(f'- **{nombre}** ({etiqueta}, {filas:,} filas): ' + ', '.join(partes))
        out += ['', '**Preguntas de negocio:**', '']
        for i, (t, sql) in enumerate(PREGUNTAS[base], 1):
            out += [f'{i}. {t}', '', '```sql', sql, '```', '']
        con.close()
    with open(os.path.join(KIT, 'ESQUEMAS.md'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(out))


def main():
    os.makedirs(BASES, exist_ok=True)
    for fn in (botica, polleria, ferreteria, academia, courier):
        fn()
    # verifica que cada pregunta devuelve filas
    for base, qs in PREGUNTAS.items():
        con = sqlite3.connect(f'file:{os.path.join(BASES, base + ".sqlite")}?mode=ro', uri=True)
        for t, sql in qs:
            filas = con.execute(sql).fetchall()
            assert filas, f'{base}: «{t}» no devolvió filas'
        con.close()
    with open(os.path.join(BASES, 'preguntas.json'), 'w', encoding='utf-8') as f:
        json.dump({b: {'giro': GIROS[b], 'preguntas': [{'titulo': t, 'sql': s} for t, s in PREGUNTAS[b]]}
                   for b in GIROS}, f, ensure_ascii=False, indent=1)
    esquemas_md()
    for base in GIROS:
        ruta = os.path.join(BASES, base + '.sqlite')
        print(f'{base:11s} {os.path.getsize(ruta) / 1024:8.0f} KB')


if __name__ == '__main__':
    main()
