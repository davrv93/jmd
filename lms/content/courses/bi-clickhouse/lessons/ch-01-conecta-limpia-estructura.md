---
id: ch-01
title: "Sesión 1 · De tu archivo a datos confiables"
starts_at: 2026-11-29T15:00:00-05:00
duration: 120
published: true
objectives:
  - {id: ch-01-o1, title: "Levantar ClickHouse con Docker y cargar tu Excel, CSV o Access"}
  - {id: ch-01-o2, title: "Pedirle a Claude o DeepSeek la consulta de limpieza y verificar lo que responde"}
  - {id: ch-01-o3, title: "Limpiar y estructurar los datos sin perder filas ni totales"}
materials:
  - {id: ch-01-repo-ejemplos, title: "Repo en GitHub · ejemplos para levantar en Windows y Mac con Docker (videos 1–4)", kind: link, url: https://github.com/davrv93/clickhouse-bi-ejemplos}
  - {id: ch-01-resumen, title: "Video · Sesión 1 paso a paso: Docker en Windows, Mac y Linux, carga y limpieza en ClickHouse", kind: video, file: materials/grabaciones/ch-01-resumen.mp4, objective_ids: [ch-01-o1, ch-01-o2, ch-01-o3]}
  - {id: ch-01-v01, title: "Video 1 · Docker en Windows, Mac y Linux, paso a paso", kind: video, file: materials/grabaciones/01-docker-windows-mac-linux.mp4}
  - {id: ch-01-v02, title: "Video 2 · Tu primer contenedor y la persistencia", kind: video, file: materials/grabaciones/02-contenedor-y-persistencia.mp4}
  - {id: ch-01-v03, title: "Video 3 · Cargar CSV y Excel con tipos correctos", kind: video, file: materials/grabaciones/03-cargar-csv-y-excel.mp4}
  - {id: ch-01-v04, title: "Video 4 · Limpieza con reglas de IA y verificación de totales", kind: video, file: materials/grabaciones/04-limpieza-reglas-ia-y-totales.mp4}
  - {id: ch-01-sucio, title: "ventas-sucio.csv · ventas de 4 boticas (ene–oct 2026) con errores a propósito para limpiar", kind: file, file: materials/ventas-sucio.csv, objective_ids: [ch-01-o1, ch-01-o3]}
  - {id: ch-01-limpio, title: "ventas-ejemplo.csv · los mismos datos ya limpios, para comparar", kind: file, file: materials/ventas-ejemplo.csv, objective_ids: [ch-01-o3]}
---
## Sesión 1 · De tu archivo a datos confiables

**Domingo 29 de noviembre, 3:00 – 5:00 p. m. (hora de Lima).** En vivo por Zoom; la clase queda grabada.

- **Qué es ClickHouse:** una base analítica por columnas, por qué se separa de la base que vende y en qué se diferencia de DuckDB.
- **Levanta tu servidor:** ClickHouse con Docker en Windows, Mac o Linux, con los mismos comandos.
- **Carga tu archivo:** Excel, CSV o Access a una tabla, sin perder filas.
- **Limpia con IA:** Claude o DeepSeek proponen la consulta; tú compruebas filas y totales antes y después.
- **Estructura:** tabla de hechos y catálogos, con los tipos de dato correctos.

**Entregable:** tus datos cargados, limpios y comprobados en ClickHouse, listos para el dashboard de la sesión 2.

El video de la sesión repasa todo paso a paso, para que lo repliques a tu ritmo.

---

## Teoría de la sesión 1 · Lecturas

Lee esto antes o después de la clase, a tu ritmo. Son 8 lecturas cortas (unos **55 minutos** en total) y una autoevaluación al final. No necesitas saber programar.

| # | Lectura | Tiempo |
|---|---|---|
| 1.1 | La base que vende y la base que analiza | 6 min |
| 1.2 | Por qué ClickHouse es tan rápido: guardar por columnas | 8 min |
| 1.3 | ClickHouse, DuckDB o PostgreSQL: cuándo usar cada uno | 5 min |
| 1.4 | Docker en diez minutos: imagen, contenedor y volumen | 7 min |
| 1.5 | Tipos de datos: el dinero no es un número cualquiera | 7 min |
| 1.6 | Calidad de datos: qué significa «limpio» | 7 min |
| 1.7 | La IA como copiloto: pedir, revisar y comprobar | 6 min |
| 1.8 | Hechos y dimensiones: cómo se ordena una base para analizar | 8 min |

### Lectura 1.1 · La base que vende y la base que analiza (6 min)

Todo negocio tiene, como mínimo, una base de datos que **registra operaciones**: cada venta, cada boleta, cada ingreso al almacén. A ese tipo de sistema se le llama **OLTP** (*online transaction processing*). Está hecho para escribir rápido muchas operaciones pequeñas y para que nada se pierda si dos cajeros venden a la vez.

Analizar es otra cosa. Preguntas como «¿cuánto vendí por mes y por sede en los últimos dos años?» recorren millones de filas de una sola vez. Si esas consultas corren en la misma base que está vendiendo, la caja se pone lenta justo cuando más clientes hay. Por eso se separa una segunda base, **OLAP** (*online analytical processing*), pensada para leer y resumir grandes volúmenes.

| | Base que vende (OLTP) | Base que analiza (OLAP) |
|---|---|---|
| Para qué | Registrar operaciones | Responder preguntas |
| Consultas típicas | Una venta, un cliente | Totales por mes, sede, categoría |
| Filas por consulta | Pocas | Miles o millones |
| Ejemplos | PostgreSQL, MySQL, SQL Server | ClickHouse, DuckDB, BigQuery |

> **Para recordar:** no analices sobre la base que vende. Copia los datos a una base analítica y pregúntale ahí.

### Lectura 1.2 · Por qué ClickHouse es tan rápido: guardar por columnas (8 min)

Una base tradicional guarda **por filas**: toda la venta junta (fecha, sede, producto, cantidad, precio). Para sumar solo el importe de un año, igual tiene que leer cada fila completa.

ClickHouse guarda **por columnas**: todas las fechas juntas, todos los importes juntos. Si la pregunta usa tres columnas de veinte, lee solo esas tres. Eso trae dos ventajas más:

- **Compresión.** Una columna de sedes repite pocos valores («Centro», «Norte», «Sur»…), y los valores repetidos se comprimen muy bien. Menos disco significa menos que leer.
- **Procesamiento en bloques.** ClickHouse no suma valor por valor: procesa bloques enteros de una columna a la vez, aprovechando bien el procesador.

La tabla más usada de ClickHouse se llama **MergeTree**. Al crearla eliges un `ORDER BY`, por ejemplo `ORDER BY (sede, fecha)`. ClickHouse guarda los datos en ese orden y arma un **índice disperso**: no apunta a cada fila, sino a bloques de unas 8 192 filas. Cuando filtras por sede y fecha, salta directamente los bloques que no sirven.

```sql
CREATE TABLE ventas (
  fecha     Date,
  sede      LowCardinality(String),
  producto  String,
  cantidad  UInt32,
  importe   Decimal(12, 2)
) ENGINE = MergeTree
ORDER BY (sede, fecha);
```

> **Para recordar:** por columnas = lee solo lo que la pregunta necesita. El `ORDER BY` de la tabla decide qué filtros serán más rápidos.

### Lectura 1.3 · ClickHouse, DuckDB o PostgreSQL: cuándo usar cada uno (5 min)

- **PostgreSQL** es la base que vende: transacciones, usuarios, integridad. Sirve para reportes pequeños, pero se resiente con millones de filas.
- **DuckDB** es analítico y por columnas, como ClickHouse, pero vive **dentro de tu programa o de tu laptop**, sin servidor. Ideal para analizar un archivo grande tú solo.
- **ClickHouse** es analítico y es **un servidor**: varios usuarios y un dashboard consultan los mismos datos a la vez, y crece a cientos de millones de filas.

Regla práctica del curso: si el análisis es tuyo y puntual, DuckDB alcanza. Si un equipo va a mirar el mismo dashboard todos los días, usa ClickHouse.

### Lectura 1.4 · Docker en diez minutos: imagen, contenedor y volumen (7 min)

Docker permite levantar un programa ya configurado con un solo comando, igual en Windows, Mac o Linux.

- **Imagen:** el «molde» con el programa instalado. ClickHouse publica la suya: `clickhouse/clickhouse-server`.
- **Contenedor:** una copia en marcha de esa imagen. Puedes detenerlo, borrarlo y volver a crearlo.
- **Volumen:** una carpeta que vive fuera del contenedor. Si guardas los datos ahí, sobreviven aunque borres el contenedor. Sin volumen, **los datos se pierden** al recrearlo.
- **Puerto:** la puerta por la que entras. ClickHouse escucha en el **8123** (HTTP) y en el **9000** (cliente nativo).

```bash
docker run -d --name clickhouse \
  -p 8123:8123 -p 9000:9000 \
  -v clickhouse_datos:/var/lib/clickhouse \
  clickhouse/clickhouse-server
```

> **Para recordar:** imagen = molde, contenedor = copia en marcha, volumen = donde viven tus datos de verdad.

### Lectura 1.5 · Tipos de datos: el dinero no es un número cualquiera (7 min)

Cuando cargas un Excel, cada columna necesita un **tipo**. Elegirlo bien evita errores silenciosos.

| Dato | Tipo recomendado | Por qué |
|---|---|---|
| Fecha de venta | `Date` | Permite agrupar por mes con `toStartOfMonth(fecha)` |
| Importe en soles | `Decimal(12, 2)` | Exacto al céntimo |
| Cantidad | `UInt32` | Entero sin signo |
| Sede, categoría | `LowCardinality(String)` | Pocos valores distintos: ocupa menos y filtra más rápido |
| Campo que puede faltar | `Nullable(...)` | Distingue «vacío» de «cero» |

El caso clásico: guardar dinero como `Float64`. Los decimales binarios no representan exacto valores como 0.10, y al sumar miles de ventas aparecen diferencias de céntimos que no cuadran con la caja. Con `Decimal` eso no pasa.

> **Para recordar:** fechas como fecha, dinero como `Decimal`, categorías repetidas como `LowCardinality`.

### Lectura 1.6 · Calidad de datos: qué significa «limpio» (7 min)

«Limpio» no es una sensación: se mide. Las dimensiones más usadas:

- **Completitud:** ¿faltan valores donde no deberían? (ventas sin fecha, sin sede).
- **Validez:** ¿los valores tienen sentido? (cantidades negativas, fechas del año 2099).
- **Unicidad:** ¿hay filas duplicadas? (la misma boleta importada dos veces).
- **Consistencia:** ¿se escribe igual lo mismo? («Lima Centro», «LIMA CENTRO», «Lima centro »).

Y una regla de oro, la **conciliación**: antes y después de limpiar, compara el **número de filas** y la **suma de importes**. Si cambian, cada diferencia debe tener una explicación (por ejemplo, «quité 12 duplicados por S/ 1 340.00»). Si no la tiene, la limpieza rompió algo.

```sql
SELECT count() AS filas, sum(importe) AS total FROM ventas_crudo;
SELECT count() AS filas, sum(importe) AS total FROM ventas;
```

> **Para recordar:** limpiar sin conciliar filas y totales es adivinar.

### Lectura 1.7 · La IA como copiloto: pedir, revisar y comprobar (6 min)

Claude o DeepSeek escriben muy bien consultas SQL de limpieza, pero no conocen tu negocio y a veces se equivocan con seguridad. El método del curso tiene tres pasos:

1. **Pide con contexto.** Dale las columnas, un ejemplo de filas y la regla en palabras: «unifica los nombres de sede sin importar mayúsculas ni espacios».
2. **Revisa lo que propone.** Lee la consulta. Pregúntale qué hace cada parte si no lo entiendes.
3. **Comprueba con datos.** Ejecuta la conciliación de la lectura 1.6. La IA propone; los totales deciden.

> **Para recordar:** la IA escribe la consulta, tú firmas el resultado.

### Lectura 1.8 · Hechos y dimensiones: cómo se ordena una base para analizar (8 min)

El modelo más usado en BI viene de Ralph Kimball y separa dos tipos de tablas:

- **Tabla de hechos:** lo que pasó y se puede sumar. Una fila por venta (o por línea de venta), con cantidades e importes.
- **Tablas de dimensiones:** el contexto para describir y filtrar: productos (nombre, categoría), sedes (ciudad, zona), fechas (mes, trimestre).

Antes de crear la tabla de hechos define su **granularidad**: ¿una fila es una boleta completa o una línea de producto? Mezclar granularidades es el error más común y produce totales inflados.

```text
ventas (hechos) ──► productos (dimensión)
       └────────► sedes (dimensión)
```

> **Para recordar:** los hechos se suman, las dimensiones se usan para filtrar y agrupar. Primero decide qué es una fila.

### Autoevaluación · Sesión 1

Responde mentalmente y luego abre la respuesta.

<details><summary><b>1.</b> ¿Por qué no conviene hacer el dashboard sobre la base que registra las ventas?</summary>

Porque las consultas de análisis recorren muchas filas y vuelven lenta la base que atiende a los clientes. Se copian los datos a una base analítica (OLAP).
</details>

<details><summary><b>2.</b> Una consulta suma el importe de un año en una tabla de 20 columnas. ¿Cuántas columnas lee ClickHouse?</summary>

Solo las que usa la consulta (importe y fecha, para filtrar el año). Esa es la ventaja de guardar por columnas.
</details>

<details><summary><b>3.</b> Borraste el contenedor de ClickHouse y perdiste los datos. ¿Qué faltó?</summary>

Un volumen montado en `/var/lib/clickhouse`, para que los datos vivan fuera del contenedor.
</details>

<details><summary><b>4.</b> ¿Con qué tipo guardarías el importe de una venta y por qué?</summary>

`Decimal(12, 2)`: es exacto al céntimo. `Float64` acumula diferencias al sumar.
</details>

<details><summary><b>5.</b> Antes de limpiar tenías 10 500 filas y S/ 182 400.00; después, 10 488 filas y S/ 182 400.00. ¿Está bien?</summary>

Depende de la explicación. Si quitaste 12 filas vacías de importe 0, sí. Si eran ventas reales, los totales deberían haber cambiado: revisa qué regla las quitó.
</details>

<details><summary><b>6.</b> En una tabla de hechos, ¿qué es la granularidad?</summary>

Lo que representa una fila (una boleta, una línea de producto, un día por sede). Se define antes de cargar para no mezclar niveles ni inflar totales.
</details>

**Para ir más lejos:** documentación oficial de ClickHouse ([clickhouse.com/docs](https://clickhouse.com/docs)); Ralph Kimball y Margy Ross, *The Data Warehouse Toolkit*, 3.ª ed. (Wiley, 2013).
