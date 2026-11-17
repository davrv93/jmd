---
id: gq-03
starts_at: 2026-11-17T18:30:00-05:00
duration: 60
title: "Curso · Sesión 2: pregúntale a tus propios archivos"
published: true
objectives:
  - id: gq-03-o1
    title: Escanear sin IA tus propios Excel, CSV y PDF y armar la ficha de cada uno (encabezado, tipos de columna, vacíos, duplicados, fila de totales; RUC con su dígito verificador, DNI, fechas, montos, serie-número, correos y teléfonos)
  - id: gq-03-o2
    title: Decidir qué va con reglas y qué necesita IA (costo, precisión, privacidad y reproducibilidad) y mandarle a la IA solo el texto con los datos personales tapados
  - id: gq-03-o3
    title: Verificar cada campo que entrega la IA contra su cita literal en el texto y exportar tu lote clasificado (CSV o JSON) para tu tablero
recording:
  url: ""
  passcode: ""
materials:
  - id: gq-03-factura
    title: "Archivo de muestra · factura de un proveedor (PDF ficticio)"
    kind: pdf
    file: materials/archivos-muestra/factura-compra.pdf
    objective_ids: [gq-03-o1]
  - id: gq-03-boleta
    title: "Archivo de muestra · boleta de una venta (PDF ficticio)"
    kind: pdf
    file: materials/archivos-muestra/boleta-venta.pdf
    objective_ids: [gq-03-o1]
  - id: gq-03-recibo
    title: "Archivo de muestra · recibo por honorarios (PDF ficticio)"
    kind: pdf
    file: materials/archivos-muestra/recibo-honorarios.pdf
    objective_ids: [gq-03-o1, gq-03-o2]
  - id: gq-03-extracto
    title: "Archivo de muestra · estado de cuenta del banco (PDF ficticio)"
    kind: pdf
    file: materials/archivos-muestra/extracto-banco.pdf
    objective_ids: [gq-03-o1]
  - id: gq-03-escaneo
    title: "Archivo de muestra · nota de crédito escaneada, solo imagen (PDF ficticio)"
    kind: pdf
    file: materials/archivos-muestra/nota-credito-escaneada.pdf
    objective_ids: [gq-03-o1, gq-03-o2]
  - id: gq-03-ventas
    title: "Archivo de muestra · ventas.xlsx, un Excel desordenado de octubre"
    kind: file
    file: materials/archivos-muestra/ventas.xlsx
    objective_ids: [gq-03-o1]
  - id: gq-03-gastos
    title: "Archivo de muestra · gastos.csv, separado por punto y coma"
    kind: file
    file: materials/archivos-muestra/gastos.csv
    objective_ids: [gq-03-o1, gq-03-o2]
  - id: gq-03-correo
    title: "Archivo de muestra · correo de un proveedor (texto libre)"
    kind: file
    file: materials/archivos-muestra/correo-proveedor.txt
    objective_ids: [gq-03-o2, gq-03-o3]
  - id: gq-03-kit
    title: goldenquerys-kit.zip · las 5 bases, la API de solo lectura, el skill del dashboard y el plan de trabajo
    kind: zip
    file: materials/goldenquerys-kit.zip
    objective_ids: [gq-03-o3]
  - id: gq-03-ziemann
    title: "Ziemann, Eren y El-Osta (2016) · Gene name errors are widespread in the scientific literature, Genome Biology 17: 177"
    kind: doc
    url: https://doi.org/10.1186/s13059-016-1044-7
    objective_ids: [gq-03-o1]
  - id: gq-03-bruford
    title: "Bruford et al. (2020) · Guidelines for human gene nomenclature, Nature Genetics 52: 754–758"
    kind: doc
    url: https://doi.org/10.1038/s41588-020-0669-3
    objective_ids: [gq-03-o1]
  - id: gq-03-ley29733
    title: "Ley N.º 29733 y su Reglamento (D. S. 016-2024-JUS) · Protección de Datos Personales, compendio del Minjusdh"
    kind: doc
    url: https://spijweb.minjus.gob.pe/wp-content/uploads/2025/12/Compendio_Proteccion_Datos_Personales.pdf
    objective_ids: [gq-03-o2]
  - id: gq-03-atil
    title: "Atil et al. (2024) · Non-determinism of «deterministic» LLM settings, arXiv:2408.04667"
    kind: doc
    url: https://arxiv.org/abs/2408.04667
    objective_ids: [gq-03-o2]
  - id: gq-03-avianca
    title: "Mata v. Avianca, Inc., 22-cv-1461 (S.D.N.Y. 2023) · resolución de sanciones del 22 de junio de 2023"
    kind: doc
    url: https://www.nhd.uscourts.gov/sites/default/files/pdf/Mata-v-Avianca-sanctions-order.PDF
    objective_ids: [gq-03-o3]
cycle:
  - id: ver
    title: Ver la clase
    tool: zoom
    phase: experiencia
    description: Asiste en vivo al LIVE o mira la grabación.
    check: Has visto la clase completa (o la grabación)
  - id: traer
    title: Tus archivos sobre la mesa
    tool: lms
    phase: experiencia
    description: Cargas en la escena dos o tres archivos tuyos (PDF, Excel o CSV) o los de muestra. Se leen en tu navegador y nada se sube.
    check: Tu mesa muestra al menos un archivo leído
  - id: datos
    title: Tres clases de datos
    tool: lms
    phase: conceptualizacion
    description: Estructurados, semiestructurados y no estructurados, y por qué el tipo de cada columna lo decides tú y no el programa.
    check: Sabes decir de qué clase es cada uno de tus archivos
  - id: escanear
    title: Escanea tu Excel o CSV sin IA
    tool: lms
    phase: experimentacion
    description: Las reglas encuentran el encabezado, el tipo de cada columna, las celdas vacías, los duplicados y si la fila TOTAL cuadra.
    check: Tienes la ficha de tu tabla y registraste tu hallazgo
  - id: pdf
    title: Lee tu PDF con reglas
    tool: lms
    phase: experimentacion
    description: Del texto del PDF salen el RUC (con su dígito verificador), el DNI, las fechas, los montos, la serie-número, los correos y los teléfonos, y el tipo de documento por palabras clave.
    check: Tienes la ficha de tu PDF y sabes si es venta, compra u otra cosa
  - id: juego
    title: ¿Regla o IA?
    tool: lms
    phase: conceptualizacion
    description: Juego de la clase. Cada tarjeta trae una tarea y la llevas a «Regla» o a «IA».
    check: Jugaste una ronda y publicaste tu reflexión
  - id: entender
    title: La IA entiende lo que la regla no
    tool: lms
    phase: experimentacion
    description: Tapas tus datos personales en el navegador y le pides a la IA que clasifique, resuma y saque los campos sin patrón fijo.
    check: Revisaste tu texto tapado antes de enviarlo y viste qué modelo respondió
  - id: verificar
    title: Cada campo con su cita
    tool: lms
    phase: experimentacion
    description: Buscas en el texto la cita de cada campo de la IA; lo que no aparece es inventado.
    check: Marcaste qué campo no tenía cita y registraste tu hallazgo
  - id: lote
    title: Tu lote clasificado
    tool: lms
    phase: experimentacion
    description: Clasificas varios archivos con reglas y solo los dudosos con IA, cuentas cuántos la necesitaron y exportas el lote para tu tablero.
    check: Descargaste lote.csv o lote.json
  - id: entregar
    title: Insignia y tarea
    tool: lms
    phase: experimentacion
    description: Enciendes tu insignia, descargas tu fotito, dices en el muro qué te llevas y anotas la tarea.
    check: Tu fotito descargada y tu línea en el muro de cierre
---

**Martes 17 de noviembre, 6:30 – 7:30 pm (hora de Lima).** Última sesión del curso.

Traes tus propios archivos (facturas y boletas en PDF, tu Excel de ventas, el estado de cuenta del banco) y les
preguntas cosas. Primero con reglas, que no cuestan nada, no sacan tus datos de tu compu y dan siempre la misma
respuesta. Después, solo para lo que las reglas no pueden, con IA: con tus datos personales tapados y cada respuesta
con su cita en el texto.

## Avance de la clase

Tus archivos ya saben cosas. Hoy les preguntamos: primero reglas, luego IA.

### Bloques (60 minutos)

- 0:00 a 0:02 · Bienvenida: tus archivos ya saben cosas (voto).
- 0:02 a 0:05 · Tus archivos sobre la mesa: se leen en tu navegador y nada se sube (voto de predicción).
- 0:05 a 0:10 · Teoría: tres clases de datos (Abiteboul; los genes que Excel volvió fechas).
- 0:10 a 0:16 · Escanea tu Excel o CSV sin IA: encabezado, columnas, vacíos, duplicados y la fila TOTAL (hallazgo y muro).
- 0:16 a 0:22 · Lee tu PDF con reglas: RUC con su dígito verificador, DNI, fechas, montos, serie, correos y teléfonos (voto).
- 0:22 a 0:25 · Reflexión: ¿dónde se detienen las reglas? (voto y muro).
- 0:25 a 0:32 · Juego: ¿regla o IA?
- 0:32 a 0:37 · Teoría: primero la regla (costo, precisión, privacidad y reproducibilidad).
- 0:37 a 0:43 · La IA entiende lo que la regla no, con lo personal tapado (voto).
- 0:43 a 0:47 · Teoría: si no está en el texto, es inventado (Mata contra Avianca).
- 0:47 a 0:51 · Verifica cada campo con su cita (hallazgo).
- 0:51 a 0:57 · Clasifica tu lote, expórtalo y llévalo a tu tablero (voto).
- 0:57 a 1:00 · Ticket de salida, tu insignia, tu fotito y la tarea.

## 1. Tus archivos sobre la mesa · Experiencia

Trae dos o tres archivos de tu negocio: un PDF (factura, boleta, recibo por honorarios, estado de cuenta) y un Excel o
CSV (ventas, gastos, cobranzas). Los sueltas en la escena y tu navegador los lee con FileReader: **nada se sube**. Si no
trajiste, usa los de muestra: son de una botica ficticia, la Botica Santa Kantuta, y todos sus nombres, RUC, DNI,
teléfonos y correos se inventaron para la clase.

Lo que cargas queda en tu «mesa» mientras la pestaña del LIVE esté abierta; al cerrarla se borra.

## 2. Tres clases de datos · Conceptos

| Clase | Ejemplo | Cómo se ordena |
|---|---|---|
| Estructurado | tu Excel de ventas | reglas de columna: encabezado, tipo, vacíos, duplicados, totales |
| Semiestructurado | una factura en PDF | reglas de patrón: «RUC», «F001-», «S/», fechas |
| No estructurado | el correo de un proveedor | aquí la regla se detiene: hay que entender |

Abiteboul (1997) llamó semiestructurados a los datos cuya estructura es irregular o implícita: está, pero no en una
tabla. Y aun lo estructurado miente cuando el programa adivina el tipo: Excel convertía nombres de genes como SEPT2 en
la fecha «2-sep»; Ziemann, Eren y El-Osta (2016) encontraron ese error en 704 de 3 597 artículos con listas de genes en
Excel (19,6 %), y en 2020 el comité que nombra los genes humanos los renombró (SEPT1 pasó a SEPTIN1 y MARCH1 a MARCHF1;
Bruford et al., 2020). El tipo de cada columna lo decide tu regla, no el programa.

## 3. Escanea tu Excel o CSV sin IA · Aplicación

La escena arma la ficha de tu tabla con reglas que puedes leer:

- **Encabezado:** la primera fila con tres o más celdas de texto seguidas; lo de arriba son títulos.
- **Tipo de cada columna:** fecha, monto, RUC, DNI, serie-número, categoría (pocos valores que se repiten) o texto libre.
- **Fechas:** cuántos formatos conviven (fecha de Excel, «03/10/2026», «2026-10-05», «6-oct-2026») y todas a aaaa-mm-dd.
  En Perú va día/mes/año.
- **Vacíos y duplicados:** cuántas celdas vacías tiene cada columna y qué filas son idénticas.
- **Fila TOTAL:** si la suma de las filas cuadra con lo que dice el total, y si no, por cuánto.

En `ventas.xlsx` la fila TOTAL dice S/ 765,80 y las filas suman S/ 803,80: la diferencia, S/ 38,00, es justo la fila
22, pegada dos veces. En `gastos.csv` el total cuadra… porque incluye un gasto repetido, y un RUC tiene el dígito
verificador mal.

## 4. Lee tu PDF con reglas · Aplicación

Del texto del PDF, sin IA:

- **RUC:** 11 dígitos que empiezan en 10, 15, 16, 17 o 20, y el último es el dígito verificador de SUNAT: cada uno de
  los diez primeros se multiplica por 5, 4, 3, 2, 7, 6, 5, 4, 3 y 2; se suma; el dígito es 11 menos el resto de
  dividir entre 11 (si da 10 es 0 y si da 11 es 1). Un RUC que empieza en 10 lleva adentro el DNI de una persona.
- **DNI** (8 dígitos), **fechas**, **montos en S/**, **serie-número** (F001-123, B001-…, E001-… de los recibos por
  honorarios), **correos** y **teléfonos**.
- **Tipo de documento** por palabras clave: factura, boleta, nota de crédito, recibo por honorarios, estado de cuenta,
  planilla.
- **Venta o compra:** escribe tu RUC. Si el RUC de arriba (el del emisor) es el tuyo, es venta; si el tuyo aparece
  como cliente, es compra.

Un PDF escaneado (solo imagen) da 0 caracteres: ahí las reglas se detienen.

## 5. ¿Regla o IA? · Conceptos

Juego de la clase. Cada tarjeta trae una tarea: sacar el RUC, sumar una columna, ¿reclamo o felicitación?, clasificar un
gasto por su descripción libre… La llevas a «Regla» o a «IA»; al acertar, una pregunta rápida (+5). Errar no resta: la
lupa explica por qué.

## 6. Primero la regla · Conceptos

| | Regla | IA |
|---|---|---|
| Costo | S/ 0, milisegundos, en tu navegador | tokens: gratis con tope o de pago, segundos |
| Precisión | exacta donde hay patrón; ciega al sentido | entiende el sentido; puede inventar |
| Privacidad | el archivo no sale de tu compu | el texto viaja a un servidor, a menudo en otro país |
| Reproducibilidad | el mismo archivo da siempre lo mismo | puede cambiar de una vez a otra |

La Ley N.º 29733 define dato personal como «toda información sobre una persona natural que la identifica o la hace
identificable», y mandar datos personales a un destinatario en otro país es un flujo transfronterizo (Reglamento,
D. S. 016-2024-JUS). Por eso, antes de enviar, se tapan el DNI, los teléfonos, los correos, las cuentas y los RUC de
persona. Y sobre la reproducibilidad: Atil et al. (2024) corrieron cinco modelos configurados para ser deterministas,
diez veces cada tarea, y la precisión varió hasta 15 %; casi nunca dieron diez veces el mismo texto.

## 7. La IA entiende lo que la regla no · Aplicación

En la escena eliges un archivo de tu mesa y ves lado a lado tu texto y el texto tapado. Si hay un nombre que tapar,
lo escribes. Lo revisas y recién entonces lo mandas. La IA devuelve el tipo de documento, la categoría (venta, compra,
gasto, bancario, planilla u otro), su confianza, un resumen y los campos sin patrón fijo, cada uno con su cita. La
escena muestra qué modelo respondió, si fue gratis o de pago y cuántas consultas te quedan hoy (20 al día, 6 de pago).

Con toda la clase a la vez la respuesta puede tardar de 10 a 25 segundos.

## 8. Si no está en el texto, es inventado · Conceptos

En 2023 dos abogados de Nueva York presentaron a un juez seis sentencias que no existían, con citas y todo, sacadas de
ChatGPT; cuando dudaron, le preguntaron al mismo ChatGPT si eran reales y dijo que sí. El juez P. Kevin Castel los multó
con US$ 5 000 (Mata v. Avianca, 22 de junio de 2023). La regla de hoy: cada campo de la IA trae su cita literal; la
buscas en el texto. Si aparece y dice el valor, vale. Si aparece pero no dice el valor, revísalo. Si no aparece, es
inventado.

## 9. Clasifica tu lote · Aplicación

Cargas varios archivos (o las ocho muestras), escribes tu RUC y las reglas clasifican primero. Solo los que quedan «por
decidir» van a la IA, uno por uno. La escena cuenta cuántos salieron por regla, cuántos necesitaron IA y cuántos no
tenían texto, y exporta `lote.csv` o `lote.json` con archivo, tipo, categoría, origen (regla o IA), confianza, fecha,
RUC del emisor, serie-número, total y motivo.

Para llevarlo a tu tablero, la escena copia este pedido con tu lote adentro (en lugar de `<<LOTE>>`):

```text
Guarda tal cual, sin cambiar nada, este lote de mis archivos (lo exporté en la clase de GoldenQuerys) en goldenquerys/archivos/lote.csv: <<LOTE>> Luego, con python3 y sqlite3 (sin instalar nada), crea goldenquerys/bases/misarchivos.sqlite con una tabla archivos que tenga esas mismas columnas (total_soles y confianza como números). Comprueba con curl -s "localhost:8766/api/consulta?db=misarchivos" --get --data-urlencode "sql=SELECT categoria, origen, COUNT(*) AS archivos, SUM(total_soles) AS soles FROM archivos GROUP BY categoria, origen" y muéstrame el resultado en una tabla. Si curl no responde, corre antes sh /trabajo/goldenquerys/arrancar.sh; si no existe /trabajo/goldenquerys, crea solo la carpeta goldenquerys/archivos y dame la tabla con python3. NO inventes filas ni completes celdas vacías.
```

Y para sumarlo a tu tablero:

```text
Con la base misarchivos (tabla archivos), agrega a mi tablero goldenquerys/dashboard/index.html una tarjeta «Mis archivos» que responda: ¿cuánto fue venta, compra y gasto según mis archivos?, con barras que empiezan en cero y debajo cuántos archivos salieron por regla y cuántos necesitaron IA. Usa el SQL tal cual con /api/consulta y muestra ese SQL en la caja. No toques mis tres preguntas de oro. Si mi tablero no existe todavía, crea solo esa tarjeta en goldenquerys/dashboard/archivos.html. Al terminar dime qué escribir en el visor.
```

## Tarea · Aplicación

Hasta el domingo 22 de noviembre:

1. Escanea al menos cinco archivos reales de tu negocio en las escenas de la clase (siguen abiertas): la ficha de cada
   uno sale sin IA.
2. Pasa por IA solo los que queden «por decidir», con lo personal tapado, y verifica cada campo con su cita.
3. Exporta tu `lote.csv`, llévalo a tu aula con el primer pedido y súmalo a tu tablero con el segundo.
4. Comparte en el grupo de la clase una línea: cuántos de tus archivos salieron por regla y cuántos necesitaron IA.

El proyecto final del curso sigue siendo tu tablero con tres preguntas de oro verificadas; la tarjeta «Mis archivos» se
suma como cuarta pregunta.
