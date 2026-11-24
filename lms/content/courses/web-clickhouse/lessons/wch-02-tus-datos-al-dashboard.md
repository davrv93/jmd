---
id: wch-02
title: "Parte 2 · De tus datos al dashboard ejecutivo"
published: true
duration: 40
objectives:
  - {id: wch-02-o1, title: "Convertir preguntas de negocio en indicadores, gráficos y filtros"}
  - {id: wch-02-o2, title: "Unir Excel, PDF y Word con reglas de IA y obtener tu dashboard"}
  - {id: wch-02-o3, title: "Mantenerlo al día y compartirlo con un usuario de solo lectura"}
materials:
  - {id: wch-02-repo-ejemplos, title: "Repo en GitHub · ejemplos para levantar en Windows y Mac con Docker (videos 5–14)", kind: link, url: https://github.com/davrv93/clickhouse-bi-ejemplos}
  - {id: wch-02-v05, title: "Video 5 · De las preguntas de negocio a los KPIs", kind: video, file: materials/grabaciones/05-preguntas-a-kpis.mp4}
  - {id: wch-02-v06, title: "Video 6 · Importar Excel, PDF y Word", kind: video, file: materials/grabaciones/06-importar-excel-pdf-word.mp4}
  - {id: wch-02-v07, title: "Video 7 · Reglas de IA para unir fuentes distintas", kind: video, file: materials/grabaciones/07-reglas-ia-unir-fuentes.mp4}
  - {id: wch-02-v08, title: "Video 8 · Modelar las tablas en ClickHouse", kind: video, file: materials/grabaciones/08-modelar-tablas-clickhouse.mp4}
  - {id: wch-02-v09, title: "Video 9 · Las consultas clave del tablero", kind: video, file: materials/grabaciones/09-consultas-clave-del-tablero.mp4}
  - {id: wch-02-v10, title: "Video 10 · El dashboard estilo Apple", kind: video, file: materials/grabaciones/10-dashboard-estilo-apple.mp4}
  - {id: wch-02-v11, title: "Video 11 · Filtros y alertas", kind: video, file: materials/grabaciones/11-filtros-y-alertas.mp4}
  - {id: wch-02-v12, title: "Video 12 · Refresco automático", kind: video, file: materials/grabaciones/12-refresco-automatico.mp4}
  - {id: wch-02-v13, title: "Video 13 · Publicar o compartir sin regalar tu clave", kind: video, file: materials/grabaciones/13-compartir-sin-regalar-tu-clave.mp4}
  - {id: wch-02-v14, title: "Video 14 · Caso final de punta a punta", kind: video, file: materials/grabaciones/14-caso-final-punta-a-punta.mp4}
---
## Parte 2 · De tus datos al dashboard ejecutivo

Diez videos cortos, del 5 al 14. Cada uno termina en algo que funciona en tu máquina:

- **5 · Preguntas a KPIs:** pregunta → indicador → gráfico → acción.
- **6 y 7 · Varias fuentes:** extraer Excel, PDF y Word, y unirlas con reglas de IA sin perder el total.
- **8 y 9 · Modelo y consultas:** la tabla del tablero y las cinco consultas clave.
- **10 y 11 · El dashboard:** estilo Apple, con filtros y una alerta de caída.
- **12 · Refresco automático:** el resumen se actualiza solo cada minuto.
- **13 · Compartir:** un usuario de solo lectura, para no regalar tu clave.
- **14 · Caso final:** de los tres archivos al tablero con un solo comando.

**Entregable:** tu dashboard funcionando con tus datos (o con los de ejemplo).

## Prompts de esta parte

Cópialos en orden. Cada uno corresponde a un video; el repositorio los tiene en la carpeta `prompts/`.

```prompt
# Video 7 · Reglas de IA para unir fuentes distintas
Eres analista de datos. Te paso el PERFIL de mi tabla de ventas (no los datos). Propón reglas de limpieza en JSON con la forma {"reglas":[...]}. Cada regla tiene: id, columna, problema (qué ves en el perfil), regla (en una frase), accion (una de: recortar_y_capitalizar, convertir_fecha, quitar_duplicados, dejar_vacio_como_nulo, convertir_tipo), parametros y verificacion (cómo compruebo que funcionó). No inventes columnas ni valores que no estén en el perfil. No rellenes datos que faltan con promedios: es mejor dejarlos vacíos y decirlo.
```

```prompt
# Video 10 · El dashboard estilo Apple
Crea una página HTML de un solo archivo, sin frameworks ni librerías, con un tablero de ventas
que consulte mi tabla ventas_tablero en ClickHouse por su API HTTP:
http://127.0.0.1:8123/?add_http_cors_header=1&default_format=JSON&user=…&password=…&query=…
Columnas: fecha (Date), sede, categoria, unidades, venta (Decimal), margen (puede ser nulo).
Muestra arriba 4 KPIs: venta total, unidades, margen ponderado por venta (sin contar los nulos)
y la variación del último mes frente al anterior. Debajo: venta por mes (línea), venta por sede
y por categoría (barras horizontales ordenadas) y lo más vendido por sede × categoría (tabla).
Estilo Apple: fondo #FFFFFF y #F5F5F7, texto #1D1D1F y #6E6E73, un solo acento #0071E3,
apoyo #34C759 y #FF9F0A; tipografía del sistema, esquinas de 18 px, sombras suaves, mucho aire.
Usuario y clave por parámetros de la URL. Si una consulta falla, muestra el error en la página.
```

```prompt
# Video 11 · Filtros y alerta de caída
Agrega a mi tablero:
1. Filtros de sede, categoría y período (desde / hasta, por mes). Llénalos con los valores
   que hay en la tabla. Al cambiar uno, recalcula todo: KPIs, gráficos y tabla.
2. Una alerta arriba de los KPIs: compara el último mes del período con el anterior, sede
   por sede (respetando el filtro de categoría). Si alguna cae más de 15 %, muéstrala en rojo
   con la sede, el porcentaje y los dos montos. Si no, un aviso verde que lo diga.
3. Escapa los valores de los filtros antes de ponerlos en el SQL.
No cambies el estilo.
```
