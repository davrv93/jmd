# Dashboards y BI con IA · ClickHouse + Claude, sin programar

**JMD Learning** · marca de Consultoría Digital (RUC 10732672546), empresa especializada en software.

> **Conecta tu Excel, tus macros, OneDrive, Access y tus bases de datos, y termina con un dashboard
> publicado en la web que se actualiza solo.** Curso taller práctico de 8 horas. Claude escribe los
> prompts y las consultas; tú decides qué quieres ver. No necesitas ningún conocimiento de programación.

---

## Ficha del curso

| | |
|---|---|
| **Modalidad** | Curso taller en vivo por Zoom. **Las clases quedan grabadas** y disponibles en jmd-learn.online. |
| **Fechas** | **Domingo 15 y domingo 22 de noviembre de 2026**, de 9:00 a. m. a 1:00 p. m. (hora de Lima), con descanso. |
| **Duración** | 8 horas: **2 sesiones de 4 horas**. |
| **Inversión** | S/ 80. **Preventa: S/ 50** inscribiéndote hasta el 2 de noviembre. |
| **Regalo** | El curso **Diseño y edición con IA** de JMD Learning. |
| **Inscripciones** | WhatsApp 986 149 476. |
| **Nivel** | Desde cero. Sin conocimientos de programación ni de bases de datos. |
| **Público** | Analistas, asistentes administrativos y contables, jefes de área, emprendedores y cualquier persona que hoy arma reportes a mano en Excel. |
| **Herramientas** | ClickHouse (base de datos analítica), Metabase (dashboards), Claude u otras IA gratuitas (ChatGPT, Gemini, DeepSeek) y tus archivos de siempre: Excel, OneDrive y Access. |
| **Proyecto final** | Tu dashboard con datos reales o de ejemplo, conectado a tus fuentes, con refresco automático y **publicado en la web** en un enlace. |
| **Certificado** | Certificado de participación de JMD Learning. |
| **Sorteo** | Entre los participantes se sortea **una licencia de Claude Pro**. |
| **Trayectoria** | Más de 300 alumnos ya capacitados. **Nuevo grupo: apertura.** |

**Requisitos**

- Laptop con Chrome o Edge y conexión estable.
- Zoom instalado.
- Un Excel tuyo para practicar (opcional: también trabajamos con datos de ejemplo).
- Cuenta gratuita de Claude (te enseñamos a crearla en la primera sesión).

---

## Cómo trabajamos: Claude como copiloto

En cada etapa usamos **Claude para generar el prompt** y luego la consulta. No memorizas comandos:
aprendes a pedir. La plantilla del curso:

```text
Actúa como analista de datos experto en ClickHouse.
Mis datos: [pega aquí los nombres de las columnas y 5 filas de ejemplo].
Lo que necesito: [qué quieres saber o arreglar, en tus palabras].
Entrégame: la consulta lista para copiar, una explicación en una línea
y cómo verifico que el resultado está bien.
```

Y el truco que más se usa en el curso: **pedirle a Claude que escriba el prompt por ti**.

```text
Quiero un reporte de ventas por vendedor y por mes desde mi Excel.
No sé cómo pedírtelo bien. Hazme las preguntas que necesites y
luego escríbeme el prompt ideal para obtener la consulta en ClickHouse.
```

---

## Las 6 etapas del curso

| Etapa | Qué haces | Dónde |
|---|---|---|
| 1 · Conectar | Llevas tus datos de Excel, OneDrive, Access y bases de datos a ClickHouse. | Sesión 1 |
| 2 · Limpiar | Quitas duplicados, arreglas fechas y textos, rellenas vacíos. | Sesión 1 |
| 3 · Estructurar | Ordenas los datos en tablas que responden rápido: hechos y catálogos. | Sesión 1 |
| 4 · Visualizar | Armas indicadores, gráficos y filtros sin escribir código. | Sesión 2 |
| 5 · Automatizar | Refresco automático: el dashboard se actualiza solo; reemplazas la macro. | Sesión 2 |
| 6 · Publicar | Publicas el dashboard en la web y lo compartes con un enlace. | Sesión 2 |

---

## Sesión 1 (4 h) · Conecta, limpia y estructura tus datos

**Bloque 1 · Del Excel al BI (30 min)**

- Por qué el Excel se pone lento y se rompe con muchos datos.
- Qué es una base de datos analítica y por qué ClickHouse responde en segundos con millones de filas.
- Lo que vas a construir hoy y el próximo domingo: vista del dashboard final.

**Bloque 2 · Claude como copiloto (40 min)**

- Crear la cuenta y ordenar tus conversaciones por proyecto.
- La plantilla de 4 partes: rol, datos, necesidad y entrega.
- Pedirle a Claude que genere el prompt. Cómo verificar lo que responde: nunca copiar a ciegas.

**Bloque 3 · Conecta tus fuentes (80 min)**

- **Excel y CSV**: subir el archivo y crear la tabla con un clic.
- **OneDrive**: compartir el archivo como enlace y leerlo directo desde ClickHouse. Si cambias el
  Excel, el dato cambia.
- **Access**: exportar las tablas paso a paso y cargarlas.
- **Bases de datos** (MySQL, PostgreSQL): conectarlas sin copiar nada a mano. Para SQL Server, la
  ruta guiada por exportación.
- **Macros de Excel**: identificar qué hace tu macro. Claude te la explica en castellano para
  convertirla en un proceso automático en la sesión 2.

*Pausa (15 min)*

**Bloque 4 · Limpieza de datos (45 min)**

- Los 6 problemas que tiene todo Excel: duplicados, fechas como texto, espacios, mayúsculas
  mezcladas, vacíos y códigos distintos para lo mismo.
- Claude detecta los problemas con una muestra de tus datos y te da la consulta para arreglarlos.
- Antes y después: contar filas y totales para comprobar que no perdiste nada.

**Bloque 5 · Estructura (30 min)**

- Una tabla de hechos (ventas, pagos, atenciones) y sus catálogos (clientes, productos, sedes).
- Tipos de dato correctos: fecha, número, texto. Por qué importa.
- Ordenar la tabla para que las consultas vuelen, explicado sin tecnicismos.

**Entregable 1:** tus datos conectados, limpios y estructurados en ClickHouse, listos para el dashboard.

---

## Sesión 2 (4 h) · Dashboards, refresco automático y publicación en la web

**Bloque 1 · Preguntas de negocio e indicadores (30 min)**

- De «quiero un reporte» a 5 preguntas concretas: cuánto, dónde, quién, cuándo y comparado con qué.
- Indicadores clave por área: ventas, cobranza, inventario, atención.
- Claude propone los indicadores y la consulta de cada uno.

**Bloque 2 · Tu primer dashboard sin código (75 min)**

- Conectar Metabase a ClickHouse.
- Preguntas visuales: elegir tabla, filtrar, agrupar y graficar con clics.
- El gráfico correcto para cada pregunta: número grande, línea, barras, tabla y mapa de calor.
  Lo que no se hace: tortas de 10 colores, 3D y dos ejes.
- Filtros por fecha, sede o vendedor que mueven todo el tablero a la vez.

*Pausa (15 min)*

**Bloque 3 · Refresco automático (45 min)**

- Vistas que se recalculan solas cada hora o cada día.
- El Excel de OneDrive que se actualiza y el dashboard que lo refleja sin que toques nada.
- **Adiós a la macro**: el proceso que hacías a mano cada lunes ahora corre solo.
- Alertas por correo cuando un indicador pasa un límite.

**Bloque 4 · Publicar en la web (30 min)**

- Enlace público o tablero embebido en tu página.
- Qué publicar y qué no: datos personales, montos sensibles y permisos por usuario.
- Revisar el tablero en el celular.

**Bloque 5 · Proyecto final y cierre (45 min)**

- Presentación de dashboards: 3 minutos por participante o por grupo.
- Recomendaciones para llevarlo a tu trabajo el lunes.
- **Sorteo de la licencia de Claude Pro** y entrega del certificado de participación.

**Entregable 2:** tu dashboard publicado en la web, con refresco automático y el enlace para compartirlo.

---

## Lo que te llevas

- Las grabaciones de las 2 sesiones.
- La biblioteca de prompts del curso: conectar, limpiar, estructurar, indicadores y automatizar.
- Datos de ejemplo y la guía paso a paso en PDF.
- Tu dashboard publicado y funcionando.
- Certificado de participación de JMD Learning.
- De regalo: el curso Diseño y edición con IA.

---

## Notas internas (no van al alumno)

- **Entorno:** decidir si cada alumno usa la prueba gratuita de ClickHouse Cloud o un entorno del curso
  (ClickHouse + Metabase por alumno en el servidor de jmd-learn.online). El segundo evita registros y
  tarjetas, pero hay que medir RAM: el EC2 del LMS tiene 3,8 GB.
- **OneDrive:** el enlace compartido debe convertirse en enlace de descarga directa; probarlo con
  cuentas personales y de empresa antes de la clase (las de empresa suelen bloquear el acceso anónimo).
- **Access:** preparar la exportación en Windows; en macOS no hay Access.
- **Horario (4 h por sesión, según los bloques del temario):** sesión 1: 9:00–11:30 bloques 1 a 3,
  descanso 11:30–11:45, 11:45–13:00 bloques 4 y 5. Sesión 2: 9:00–10:45 bloques 1 y 2, descanso
  10:45–11:00, 11:00–13:00 bloques 3 a 5.
- **Regalo:** confirmar si es el acceso a las grabaciones de «¿Difícil de explicar? · Diseño y edición
  con IA» o un cupo en el próximo grupo en vivo.
