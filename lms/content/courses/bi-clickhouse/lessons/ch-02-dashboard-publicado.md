---
id: ch-02
title: "Sesión 2 · De tus datos al dashboard ejecutivo"
starts_at: 2026-12-06T15:00:00-05:00
duration: 120
published: true
objectives:
  - {id: ch-02-o1, title: "Convertir preguntas de negocio en indicadores, gráficos y filtros"}
  - {id: ch-02-o2, title: "Adjuntar tu archivo, aceptar las reglas de limpieza que propone la IA y obtener tu dashboard"}
  - {id: ch-02-o3, title: "Llevar los datos a tu servidor ClickHouse y compartir el dashboard con tu equipo"}
materials:
  - {id: ch-02-repo-ejemplos, title: "Repo en GitHub · ejemplos para levantar en Windows y Mac con Docker (videos 5–14)", kind: link, url: https://github.com/davrv93/clickhouse-bi-ejemplos}
  - {id: ch-02-v05, title: "Video 5 · De las preguntas de negocio a los KPIs", kind: video, file: materials/grabaciones/05-preguntas-a-kpis.mp4}
  - {id: ch-02-v06, title: "Video 6 · Importar Excel, PDF y Word", kind: video, file: materials/grabaciones/06-importar-excel-pdf-word.mp4}
  - {id: ch-02-v07, title: "Video 7 · Reglas de IA para unir fuentes distintas", kind: video, file: materials/grabaciones/07-reglas-ia-unir-fuentes.mp4}
  - {id: ch-02-v08, title: "Video 8 · Modelar las tablas en ClickHouse", kind: video, file: materials/grabaciones/08-modelar-tablas-clickhouse.mp4}
  - {id: ch-02-v09, title: "Video 9 · Las consultas clave del tablero", kind: video, file: materials/grabaciones/09-consultas-clave-del-tablero.mp4}
  - {id: ch-02-v10, title: "Video 10 · El dashboard estilo Apple", kind: video, file: materials/grabaciones/10-dashboard-estilo-apple.mp4}
  - {id: ch-02-v11, title: "Video 11 · Filtros y alertas", kind: video, file: materials/grabaciones/11-filtros-y-alertas.mp4}
  - {id: ch-02-v12, title: "Video 12 · Refresco automático", kind: video, file: materials/grabaciones/12-refresco-automatico.mp4}
  - {id: ch-02-v13, title: "Video 13 · Publicar o compartir sin regalar tu clave", kind: video, file: materials/grabaciones/13-compartir-sin-regalar-tu-clave.mp4}
  - {id: ch-02-v14, title: "Video 14 · Caso final de punta a punta", kind: video, file: materials/grabaciones/14-caso-final-punta-a-punta.mp4}
---
## Sesión 2 · De tus datos al dashboard ejecutivo

**Domingo 6 de diciembre, 3:00 – 5:00 p. m. (hora de Lima).** En vivo por Zoom; la clase queda grabada.

- **Preguntas de negocio e indicadores:** qué quieres decidir y con qué cifra se mide.
- **El gráfico según la pregunta:** barras, líneas o una sola cifra, y por qué casi nunca un pastel.
- **Tu dashboard de ventas:** adjuntas tu Excel, CSV, PDF o Word; la IA propone reglas de limpieza, tú aceptas cada una y obtienes venta total, ticket promedio, margen, ventas por mes, sede y categoría, y la alerta de caída.
- **Levanta tu servidor:** ClickHouse con Docker en Windows, Mac o Linux, y la carga con el SQL que genera tu dashboard.
- **Refresco y publicación:** vistas que se actualizan solas y un archivo que compartes con tu equipo.

**Proyecto final:** tu dashboard ejecutivo de ventas, hecho a partir de tu archivo, y una decisión que tomas con él.
Sorteo de una licencia de Claude Pro entre los participantes.

---

## Teoría de la sesión 2 · Lecturas

Seis lecturas cortas (unos **45 minutos**) y una autoevaluación. Se apoyan en lo que viste en la sesión 1.

| # | Lectura | Tiempo |
|---|---|---|
| 2.1 | De la pregunta de negocio al indicador (KPI) | 8 min |
| 2.2 | Resumir datos en ClickHouse: agrupar, filtrar y comparar | 8 min |
| 2.3 | Diseñar un dashboard que se lee de un vistazo | 9 min |
| 2.4 | Elegir el gráfico correcto | 7 min |
| 2.5 | Alertas: detectar una caída a tiempo | 6 min |
| 2.6 | Compartir sin regalar tus datos | 7 min |

### Lectura 2.1 · De la pregunta de negocio al indicador (KPI) (8 min)

Un dashboard empieza por las **preguntas**, no por los gráficos. Escribe primero qué decisión quieres tomar: «¿en qué sede reforzar personal?», «¿qué categoría dejar de comprar?».

Luego conviértela en indicadores. Una **métrica** es cualquier número medible (unidades vendidas). Un **KPI** (*key performance indicator*) es la métrica que dice si vas bien o mal respecto de una meta.

| Pregunta | KPI | Cómo se calcula |
|---|---|---|
| ¿Vendemos más que antes? | Ventas netas y variación mensual | Suma de importes del mes vs. mes anterior |
| ¿Cuánto compra cada cliente? | Ticket promedio | Ventas ÷ número de boletas |
| ¿Qué se mueve? | Unidades por categoría | Suma de cantidades por categoría |
| ¿Qué sede preocupa? | Variación por sede | (Mes actual − mes anterior) ÷ mes anterior |

Un buen KPI es **específico, medible, comparable en el tiempo y accionable**: si sube o baja, alguien sabe qué hacer.

> **Para recordar:** pregunta → decisión → KPI. Si un número no cambia ninguna decisión, no va arriba del dashboard.

### Lectura 2.2 · Resumir datos en ClickHouse: agrupar, filtrar y comparar (8 min)

Casi todo dashboard se construye con tres ideas de SQL:

- **Agrupar:** `GROUP BY` junta filas y las resume con `sum()`, `count()` o `avg()`.
- **Llevar fechas a periodos:** `toStartOfMonth(fecha)` convierte cada día en el primer día de su mes.
- **Sumar con condición:** ClickHouse permite `sumIf(importe, condición)`, muy útil para poner dos periodos lado a lado.

```sql
-- Ventas y ticket promedio por mes
SELECT toStartOfMonth(fecha)          AS mes,
       sum(importe)                   AS ventas,
       count(DISTINCT boleta)         AS boletas,
       round(ventas / boletas, 2)     AS ticket_promedio
FROM ventas
GROUP BY mes
ORDER BY mes;

-- Este mes contra el anterior, por sede
SELECT sede,
       sumIf(importe, toStartOfMonth(fecha) = toStartOfMonth(today()))                  AS actual,
       sumIf(importe, toStartOfMonth(fecha) = toStartOfMonth(today()) - INTERVAL 1 MONTH) AS anterior
FROM ventas
GROUP BY sede;
```

Cuando una consulta se repite todo el día, ClickHouse puede guardar el resumen ya calculado con una **vista materializada**: se actualiza sola cada vez que entran datos nuevos.

> **Para recordar:** agrupar, llevar a periodos y comparar con `sumIf` resuelven la mayoría de los indicadores.

### Lectura 2.3 · Diseñar un dashboard que se lee de un vistazo (9 min)

Stephen Few lo define como la información más importante, en **una sola pantalla**, para entenderla de un vistazo. Tres principios:

1. **Jerarquía.** Arriba, las cifras clave (ventas, variación, ticket promedio). En medio, la tendencia en el tiempo. Abajo, el detalle por sede y categoría.
2. **Contexto en cada número.** «S/ 182 400» no dice nada solo. «S/ 182 400, −8 % frente a octubre» sí.
3. **Menos tinta, más datos.** Edward Tufte propone quitar todo lo que no informa: fondos, sombras, efectos 3D, bordes gruesos. Cada elemento debe ganarse su lugar.

El color se usa **con intención**: un color neutro para todo y uno de alerta solo para lo que requiere atención. Si todo está en rojo, nada lo está.

> **Para recordar:** cifras clave arriba, tendencia al medio, detalle abajo; cada número con su comparación.

### Lectura 2.4 · Elegir el gráfico correcto (7 min)

| Quiero mostrar… | Usa | Evita |
|---|---|---|
| Evolución en el tiempo | Líneas | Barras 3D |
| Comparar categorías o sedes | Barras horizontales ordenadas | Torta con muchas porciones |
| Parte de un total (2 o 3 partes) | Barra apilada al 100 % | Torta 3D |
| Una cifra y su meta | Número grande con variación | Velocímetro |
| Detalle exacto | Tabla | Gráfico ilegible |

Ordena las barras de mayor a menor y empieza el eje en cero: si no, una diferencia pequeña parece enorme.

> **Para recordar:** tiempo → líneas; comparar → barras ordenadas; exacto → tabla.

### Lectura 2.5 · Alertas: detectar una caída a tiempo (6 min)

Una alerta compara el valor actual con una **referencia** y avisa si se aleja más de un **umbral**:

- **Referencia:** el mes anterior, el mismo mes del año pasado (si tu negocio es estacional) o el promedio de las últimas semanas.
- **Umbral:** por ejemplo, «avisar si una sede cae más de 15 %».

Cuidado con los periodos incompletos: comparar los primeros 10 días de noviembre contra octubre completo siempre «cae». Compara días equivalentes (del 1 al 10 de cada mes) o espera a cerrar el periodo.

> **Para recordar:** una alerta útil tiene referencia, umbral y periodos comparables.

### Lectura 2.6 · Compartir sin regalar tus datos (7 min)

Compartir un dashboard no es entregar tu clave de administrador. Aplica el principio de **mínimo privilegio**: cada persona recibe solo el acceso que necesita.

```sql
CREATE USER equipo IDENTIFIED BY 'una-clave-larga-y-unica';
GRANT SELECT ON bi.* TO equipo;   -- solo leer, solo la base del dashboard
```

Buenas prácticas:

- Un usuario de **solo lectura** para el dashboard; el administrador, solo para ti.
- No publiques los puertos de ClickHouse a internet sin necesidad; si hace falta acceso remoto, que sea con HTTPS y contraseña.
- Si alguien deja el equipo, borra su usuario (`DROP USER`) en lugar de compartir una clave común.

> **Para recordar:** solo lectura para el equipo, administrador solo para ti, nada expuesto sin necesidad.

### Autoevaluación · Sesión 2

<details><summary><b>1.</b> ¿Cuál es la diferencia entre una métrica y un KPI?</summary>

La métrica es cualquier número medible; el KPI es la métrica que se compara contra una meta y orienta una decisión.
</details>

<details><summary><b>2.</b> ¿Qué función usarías para agrupar ventas diarias por mes?</summary>

`toStartOfMonth(fecha)` dentro de un `GROUP BY`.
</details>

<details><summary><b>3.</b> Quieres comparar las ventas de 6 sedes. ¿Qué gráfico eliges?</summary>

Barras horizontales ordenadas de mayor a menor, con el eje empezando en cero.
</details>

<details><summary><b>4.</b> El día 8 el dashboard marca una caída de 70 % frente al mes pasado. ¿Qué revisas primero?</summary>

Que se estén comparando periodos equivalentes: 8 días contra un mes completo siempre «cae».
</details>

<details><summary><b>5.</b> ¿Qué permisos debe tener el usuario con el que tu equipo mira el dashboard?</summary>

Solo `SELECT` sobre la base del dashboard. Nunca el usuario administrador.
</details>

**Para ir más lejos:** Stephen Few, *Information Dashboard Design* (O'Reilly, 2006); Edward R. Tufte, *The Visual Display of Quantitative Information* (Graphics Press, 1983); documentación de ClickHouse sobre funciones de agregación y control de acceso ([clickhouse.com/docs](https://clickhouse.com/docs)).
