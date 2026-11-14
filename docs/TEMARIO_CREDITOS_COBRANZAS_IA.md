# Créditos y Cobranzas con IA · Indicadores, análisis y dashboard gerencial

> **Del Excel de cartera al dashboard que lee la gerencia, con la IA como analista.**
> Tres sesiones en vivo. Llegas con un Excel (o usas la cartera de ejemplo del curso) y te vas con
> tus indicadores bien calculados, un análisis que explica **por qué** se movió la mora y un
> **dashboard gerencial** de una página, con resumen ejecutivo escrito por la IA y un informe mensual
> listo para el directorio. Tú pones el criterio; la IA calcula, busca causas y redacta.
> No hace falta saber programar.

---

## Ficha del curso

| | |
|---|---|
| **Público** | Jefes y analistas de créditos y cobranzas, controllers, gerentes financieros y comerciales, dueños de empresas que venden al crédito, cooperativas y financieras pequeñas. |
| **Nivel** | Programación: ninguno. Excel: básico. Negocio: conoce qué es una cuenta por cobrar y un atraso. |
| **Duración** | 3 sesiones en vivo de 2 h (ajustable a 1 h 15 min). |
| **Formato** | Modo LIVE de jmd-learn.online: aula propia con el agente JMD, visor en el navegador y asistente Robo. |
| **Proyecto final** | El dashboard gerencial de tu cartera publicado en un enlace, con su resumen ejecutivo y el informe mensual en PDF. |
| **Certificado** | Insignia Open Badges por sesión y certificado del curso (Consultoría Digital). |

**Requisitos**

- Laptop con Chrome, Edge o Firefox actual.
- Cuenta en jmd-learn.online.
- Opcional: un Excel de tu cartera **sin nombres ni DNI** (te damos la plantilla de anonimización).
  Si no, trabajas con la cartera de ejemplo del curso (1 000 créditos ficticios, 12 meses).

**Qué te llevas, en una línea por sesión**

| Sesión | Pregunta de la gerencia | Entregable |
|---|---|---|
| 1 · Medir | ¿Cómo está la cartera, con números en los que podamos confiar? | Tu **ficha de indicadores**: datos limpios, 10 KPI calculados, cada uno con su fórmula, su meta y su semáforo. |
| 2 · Entender | ¿Por qué subió la mora y qué va a pasar? | Un **informe de hallazgos**: causas por zona, producto, asesor y cosecha, alertas y proyección a 3 meses. |
| 3 · Comunicar | ¿Qué le muestro al directorio y qué decidimos? | El **dashboard gerencial** publicado + resumen ejecutivo + informe mensual en PDF que se arma solo. |

---

## Sesión 1 · Medir: indicadores en los que se puede confiar

**Objetivos**

1. Conocer los indicadores que usa un área de créditos y cobranzas y qué pregunta responde cada uno.
2. Limpiar y validar la data con IA: duplicados, fechas vacías, saldos negativos, columnas con nombres distintos.
3. Calcular los indicadores con su fórmula a la vista y compararlos con la meta.
4. Entender por qué la IA **no inventa** el número: calcula con código que tú puedes revisar.

**Indicadores del curso**

| Indicador | Fórmula | Qué responde |
|---|---|---|
| Morosidad | Cartera atrasada / cartera total | ¿Qué parte de lo que nos deben está vencida? |
| Cartera de alto riesgo | (Atrasada + refinanciada + reestructurada) / cartera total | ¿Cuánto riesgo hay escondido en refinanciaciones? |
| Aging (antigüedad) | Saldo por tramo: al día, 1–30, 31–60, 61–90, más de 90 días | ¿Qué tan vieja es la deuda? |
| Roll rate | % de saldo que pasa de un tramo al siguiente en el mes | ¿La mora se está curando o empeorando? |
| Cosechas (*vintage*) | Mora de cada mes de desembolso a los 1, 2, 3… meses | ¿Estamos aprobando peor que antes? |
| Cobertura de provisiones | Provisiones / cartera atrasada | ¿Tenemos reservado lo que podríamos perder? |
| DSO (período medio de cobro) | Cuentas por cobrar / ventas al crédito × días del período | ¿En cuántos días convertimos la venta en caja? |
| CEI (índice de efectividad de cobranza) | (CxC inicial + ventas al crédito − CxC final) / (CxC inicial + ventas al crédito − CxC corriente final) | ¿Qué parte de lo cobrable cobramos de verdad? |
| Tasa de recupero | Cobrado de cartera vencida / cartera vencida al inicio del mes | ¿Cuánto recupera la gestión? |
| Promesas cumplidas | Promesas pagadas a tiempo / promesas registradas | ¿Las promesas valen algo? ¿Qué gestor las consigue mejor? |

**Contenido**

- De la exportación del ERP o del Excel a una tabla limpia: qué columnas hacen falta y cuáles sobran.
- Calidad de datos con IA: el agente revisa, reporta y propone correcciones; tú apruebas cada una.
- El cálculo con DuckDB (SQL sobre el Excel, sin instalar una base de datos). La IA escribe la consulta;
  la consulta queda a la vista para auditarla.
- Metas y semáforos: por qué un indicador sin meta no dice nada.
- Errores clásicos: mezclar saldo y monto desembolsado, contar créditos en vez de soles, comparar meses
  con distinto número de días.

**Práctica en el aula (patrón «llenar y construir»)**

1. Subes `cartera.xlsx`. La IA mapea tus columnas (`F. Venc.` → `fecha_vencimiento`) y te muestra el
   reporte de calidad.
2. Llenas `metas.json` (morosidad meta 5 %, DSO meta 40 días…).
3. `cartera construir --modulo indicadores` arma la **Ficha de indicadores**.
4. Programas tu propio indicador en `indicadores.py` (por ejemplo, «mora de clientes nuevos») y aparece
   en la ficha con la marca «tu indicador».

**Entregable 1:** ficha de indicadores de octubre con 10 KPI, fórmula, meta y semáforo.

**Tarea:** calcula los mismos indicadores para los 3 meses anteriores y anota cuál cambió más.

---

## Sesión 2 · Entender: la IA como analista de cartera

**Objetivos**

1. Hacerle preguntas a la cartera en castellano y obtener respuesta con número, gráfico y la consulta usada.
2. Descomponer un cambio: cuánto de la subida de la mora viene de cada zona, producto, asesor o cosecha.
3. Detectar anomalías y alertas tempranas antes de que lleguen al cierre del mes.
4. Proyectar la mora a 3 meses con un método simple y explicable, y saber cuándo no confiar en él.

**Contenido**

- Preguntar bien: de «¿cómo vamos?» a «¿qué zona explica la subida de la mora entre setiembre y octubre?».
- Descomposición del cambio (cascada): efecto mezcla vs. efecto tasa, explicado sin fórmulas.
- Cosechas y roll rates para separar «aprobamos mal» de «cobramos mal».
- Segmentación: puede y quiere, puede y no quiere, quiere y no puede, ni puede ni quiere.
- Anomalías: un asesor con cobros récord y promesas incumplidas, una zona que cambia de tendencia.
- Proyección: promedio móvil y tendencia con intervalo; la IA dice cuánto se equivocó en meses pasados.
- Límites de la IA: alucinación, números sin fuente, correlación que no es causa. Regla del curso:
  **ningún número sin su consulta**.

**Práctica en el aula**

1. `cartera construir --modulo analisis` abre el **Analista**: chat + gráfico + consulta.
2. Preguntas «¿por qué subió la mora en octubre?» y obtienes la cascada por zona.
3. Programas una alerta en `alertas.py` (por ejemplo, «avísame si una cosecha pasa 3 % de mora al mes 2»).
4. La IA redacta 3 hallazgos y tú los corriges: qué está bien dicho, qué es exagerado, qué falta.

**Entregable 2:** informe de hallazgos con 3 causas, 2 alertas y la proyección a 3 meses.

**Tarea:** escribe 5 preguntas que tu gerente te hace cada mes y deja que el Analista las responda.

---

## Sesión 3 · Comunicar: dashboard gerencial e informe automático

**Objetivos**

1. Diseñar un dashboard gerencial de una página: lo primero que mira un gerente, lo segundo, el detalle.
2. Generarlo con IA desde tus indicadores y publicarlo en un enlace que se abre en el celular.
3. Obtener el **resumen ejecutivo** escrito por la IA: qué pasó, por qué y qué recomiendo.
4. Dejar armado el informe mensual en PDF y el aviso semanal (correo o WhatsApp) que se envían solos.

**Contenido**

- Anatomía de un dashboard gerencial: titular, 4–6 KPI con meta, una tendencia, un desglose y las acciones.
  Lo que sobra: velocímetros, gráficos 3D, tortas de 9 colores, dos ejes en un gráfico.
- Elegir el gráfico por la pregunta: número grande, línea para el tiempo, barras para comparar, mapa de
  calor para cosechas.
- Narrativa con datos: el resumen ejecutivo en 5 líneas y la recomendación con dueño y fecha.
- Del dashboard al directorio: el informe mensual de 1 página en PDF.
- Automatizar: corte de datos, recálculo, dashboard nuevo y aviso al gerente cada lunes.
- Dónde más vive esto: cómo llevar los mismos indicadores a Excel, Power BI o Looker Studio si la
  empresa ya los usa.

**Práctica en el aula**

1. Llenas `dashboard.json`: qué KPI van arriba, el período, el logo y la paleta de la empresa.
2. `cartera construir --modulo dashboard` genera el **Dashboard gerencial** y lo publica en tu aula.
3. Le pides a la IA el resumen ejecutivo y el informe mensual; los revisas y apruebas.
4. Programas en `envio.py` a quién le llega el aviso semanal y con qué umbral se manda una alerta.

**Entregable 3 y proyecto final:** tu dashboard publicado, el informe mensual en PDF y una
presentación de 3 minutos como si fuera el comité de créditos.

---

## La herramienta del curso: Cartera Clara

No es un sistema de cobranza: es el **tablero de análisis** que se alimenta de la data que ya tiene la
empresa. Cuatro piezas, una por etapa:

| Pieza | Sesión | Qué hace |
|---|---|---|
| **Datos e indicadores** | 1 | Carga el Excel, revisa la calidad, calcula los 10 KPI con fórmula y meta. |
| **Analista** | 2 | Preguntas en castellano → respuesta con gráfico, cascada de causas y la consulta usada. |
| **Dashboard gerencial** | 3 | Una página con KPI, tendencias, cosechas, ranking y resumen ejecutivo de la IA. |
| **Informe mensual** | 3 | PDF de 1 página para el directorio, generado del mismo dashboard. |

**Cómo encaja en lo que ya tenemos**

- Mismo patrón que `s1-landing-estilos` y `s2-robo-estilos`: llenar un JSON, correr un comando, obtener
  una pantalla profesional y programar una función propia (`indicadores.py`, `alertas.py`, `envio.py`).
- Aula por alumno, visor y gateway de IA (DeepSeek / Qwen por OpenRouter) ya existen. DuckDB corre dentro
  del aula.
- Datos: generador de cartera ficticia peruana de 12 meses (montos en S/, zonas, productos, asesores,
  cosechas con una historia que descubrir). Nunca datos reales en el aula.

**Qué hay que construir (estimado)**

| Pieza | Esfuerzo |
|---|---|
| Generador de cartera ficticia de 12 meses con «historias» escondidas (una zona que empeora, una cosecha mala, un asesor raro) | 1 día |
| Skill `cc-indicadores` + ficha de indicadores + reporte de calidad | 1,5 días |
| Skill `cc-analista` + chat con gráfico, cascada y consulta visible | 2 días |
| Skill `cc-dashboard` + dashboard, resumen ejecutivo e informe PDF | 2 días |
| Guion LIVE (12 escenas por sesión), diapositivas y tareas | 2 días |
| Ensayo completo en local y en el EC2 | 1 día |

---

## Preguntas abiertas para cerrar con el cliente

1. ¿Duración por sesión: 2 h o 1 h 15 min? ¿Fechas y hora?
2. ¿Público principal: financiera o cooperativa (indicadores SBS) o empresa comercial (DSO, CEI)? El
   temario cubre los dos; cambia el énfasis.
3. ¿Usan ya Excel, Power BI o Looker Studio? Si sí, la sesión 3 termina mostrando cómo llevar el
   dashboard ahí.
4. ¿Los alumnos traerán su cartera real? Si sí, hay que darles la plantilla de anonimización antes de la sesión 1.
5. ¿Nombre del curso y de la herramienta? (Propuesta: *Créditos y Cobranzas con IA: indicadores,
   análisis y dashboard gerencial* · herramienta *Cartera Clara*.)
