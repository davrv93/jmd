---
name: planificacion-proyecto
description: Úsalo cuando alguien llega con un pedido vago ("quiero un sistema de…", "necesito una app que…", "automatiza esto") y hay que cerrar alcance en 30 minutos. Palabras gatillo: planificar, alcance, proyecto nuevo, qué entra y qué no, MVP, propuesta, estimar, descubrimiento, "hecho significa".
nivel: completo
compat: [claude, codex, gpt, deepseek, glm, nemotron, ollama-pequeno]
---

# Planificación de proyecto: del pedido vago al alcance cerrado

## Cuándo usar

Cuando el pedido cabe en una frase y no cabe en una semana. Un gerente de obra pide "un tablero de avance"; un coordinador académico pide "que los sílabos se generen solos"; un docente pide "un asistente que responda a los alumnos". Todos son pedidos reales y ninguno es un alcance. Este skill convierte esa frase en un `PLAN_PROYECTO.md` de una o dos páginas, en una sola sesión de 30 minutos, antes de escribir código.

No lo uses para arreglar un bug ni para una tarea de una hora: ahí basta el skill `plan-de-trabajo` o ninguno. Tampoco lo uses para rediseñar un sistema que ya existe y funciona; eso es otra conversación.

## Principios

1. Alcance cerrado vence a alcance completo. Un plan que cabe en dos semanas y se cumple vale más que uno perfecto que no termina.
2. Siete preguntas como máximo. Si no alcanzó con siete, el problema no es de información sino de decisión; decide y anota el supuesto.
3. Un solo usuario objetivo por entregable. "Todos" no es un usuario. El residente de obra y el contador quieren pantallas distintas.
4. "Hecho significa" se escribe en pasado y se puede demostrar: "el residente registra el avance desde el celular y el gerente lo ve en el tablero sin recargar".
5. Cada entregable es vertical: toca pantalla, lógica y datos, y se puede mostrar funcionando. Nunca "primero toda la base de datos".
6. Lo que no entra se escribe con la misma letra que lo que entra. Lo que no está escrito en "No entra" volverá como "yo pensé que sí".
7. Un riesgo sin mitigación es una queja. Cada riesgo lleva una acción concreta y quién la ejecuta.

## Procedimiento paso a paso

1. Lee el pedido original y cópialo literal al inicio del plan. No lo reformules todavía; la frase del cliente es evidencia.
2. Haz las preguntas de descubrimiento, como máximo siete, de esta lista, eligiendo las que tengan respuesta desconocida:
   - ¿Quién va a usar esto el primer día y qué hace hoy sin el sistema?
   - ¿Qué pasa si no se construye? (Mide la urgencia real.)
   - ¿Qué dato o documento ya existe y de dónde sale? (Excel, ERP, correo, WhatsApp.)
   - ¿Cómo sabremos en una demo de 5 minutos que quedó bien?
   - ¿Qué no debe hacer nunca el sistema? (Pagar, borrar, enviar mensajes a terceros, calificar.)
   - ¿Quién aprueba el resultado y cuándo lo necesita?
   - ¿Con qué infraestructura cuenta? (Servidor propio, hosting barato, solo la laptop, sin internet en obra.)
3. Si una pregunta no tiene respuesta en 2 minutos, anótala como supuesto explícito ("Supongo que el residente tiene Android con datos móviles") y sigue. Los supuestos van en su propia sección.
4. Escribe el usuario objetivo en una línea: rol, contexto físico, dispositivo, frecuencia de uso. Ejemplo: "Residente de obra, en campo, celular Android con señal irregular, 3 veces al día".
5. Redacta "Hecho significa" en tres frases como máximo, en pasado, demostrables. Si alguna frase no se puede mostrar en una demo, reescríbela.
6. Descompón en entregables verticales. Cada uno responde a "qué puede hacer el usuario que antes no podía". Ordena del más valioso al menos valioso. Entre tres y seis entregables; si salen más, agrúpalos o pásalos a "No entra".
7. Asigna talla a cada entregable: S (medio día o menos), M (uno a dos días), L (tres a cinco días). Si algo pide XL, pártelo o sácalo. La talla es una conversación, no una promesa.
8. Lista los riesgos: técnicos (API externa, dato sucio), humanos (el usuario no adopta), de entorno (sin internet, servidor pequeño). Para cada uno, una mitigación con verbo y responsable.
9. Escribe la sección "No entra en esta versión" con al menos tres ítems. Si está vacía, no cerraste alcance: vuelve al paso 6.
10. Lee el plan completo en voz alta o pídele al agente que lo lea como si fuera el cliente. Cualquier frase que necesite explicación oral se reescribe.
11. Guarda como `PLAN_PROYECTO.md` en la raíz del proyecto y comparte el enlace o el archivo. El paso siguiente es `plan-de-trabajo`.

## Reglas duras

- Nunca más de siete preguntas de descubrimiento. Si hace falta más, es una segunda sesión con otro interlocutor.
- Nunca un entregable horizontal ("modelo de datos", "autenticación", "API") como ítem del plan. Si hace falta, es parte del primer entregable vertical.
- Nunca una talla sin rango explícito en horas o días en el mismo documento. S/M/L sin leyenda no significa nada seis meses después.
- Nunca un plan sin sección "No entra". Vacía tampoco vale.
- Nunca prometas fechas en este documento. Aquí van tallas; las fechas se negocian en `PLAN_TRABAJO.md` con el calendario a la vista.
- Nunca inventes respuestas al cliente. Lo que no se preguntó o no se respondió va en "Supuestos".
- El documento cabe en dos páginas impresas. Si no cabe, sobra texto, no falta.

## Lista de comprobación

- [ ] El pedido original está copiado literal al inicio.
- [ ] Hay entre una y siete preguntas de descubrimiento con su respuesta o su supuesto.
- [ ] El usuario objetivo tiene rol, contexto, dispositivo y frecuencia.
- [ ] "Hecho significa" tiene máximo tres frases, en pasado, demostrables en 5 minutos.
- [ ] Hay entre tres y seis entregables, todos verticales, ordenados por valor.
- [ ] Cada entregable tiene talla S/M/L y la leyenda de tallas está en el documento.
- [ ] Cada riesgo tiene mitigación con verbo y responsable.
- [ ] "No entra en esta versión" tiene al menos tres ítems.
- [ ] No hay fechas comprometidas.
- [ ] El documento cabe en dos páginas.

## Plantilla

Copia esto en `PLAN_PROYECTO.md` y rellena entre corchetes.

```markdown
# PLAN DE PROYECTO: [nombre corto]

Fecha: [AAAA-MM-DD]   Autor: [nombre]   Interlocutor: [quién pidió]

## 1. Pedido original (literal)
> "[frase tal como la dijo o escribió el cliente]"

## 2. Descubrimiento (máx. 7)
| # | Pregunta | Respuesta o supuesto |
|---|----------|----------------------|
| 1 | ¿Quién lo usa el primer día? | [respuesta] |
| 2 | ¿Qué pasa si no se construye? | [respuesta] |
| 3 | ¿Qué dato ya existe y dónde? | [respuesta] |
| 4 | ¿Cómo lo demostramos en 5 min? | [respuesta] |
| 5 | ¿Qué no debe hacer nunca? | [respuesta] |
| 6 | ¿Quién aprueba y cuándo? | [respuesta] |
| 7 | ¿Qué infraestructura hay? | [respuesta] |

## 3. Supuestos explícitos
- [Supongo que …]

## 4. Usuario objetivo
[Rol], [contexto físico], [dispositivo], [frecuencia].

## 5. Hecho significa
1. [Frase en pasado, demostrable.]
2. [Frase en pasado, demostrable.]
3. [Frase en pasado, demostrable.]

## 6. Entregables verticales (ordenados por valor)
Leyenda de tallas: S = hasta medio día · M = 1 a 2 días · L = 3 a 5 días.

| # | Entregable (qué puede hacer el usuario) | Talla | Cómo se demuestra |
|---|------------------------------------------|-------|-------------------|
| E1 | [El usuario puede …] | [S/M/L] | [acción visible] |
| E2 | [El usuario puede …] | [S/M/L] | [acción visible] |
| E3 | [El usuario puede …] | [S/M/L] | [acción visible] |

## 7. Riesgos y mitigación
| Riesgo | Probabilidad | Mitigación (verbo + responsable) |
|--------|--------------|----------------------------------|
| [riesgo] | [alta/media/baja] | [acción], [quién] |

## 8. No entra en esta versión
- [ítem]
- [ítem]
- [ítem]

## 9. Siguiente paso
Convertir en `PLAN_TRABAJO.md` con el skill `plan-de-trabajo`.
```

## Aprendido en la demo Tecnosito (10-10-2026)

- Si el proyecto corre modelos en la máquina del usuario, la pregunta 7 ("¿qué infraestructura hay?") se responde máquina por máquina: sistema operativo, RAM, GPU y VRAM de cada una. En el taller había RTX 5060 8 GB, RTX 3050 4 GB en Ubuntu, RX 5700 XT con 32 GB, Radeon 780M integrada y un i5 sin GPU conocida: cinco niveles distintos para el mismo entregable. El skill `relevar-maquinas` tiene la plantilla y la tabla; el relevamiento es un entregable de la Fase 0, no un supuesto.
- Riesgos de entorno nuevos con mitigación concreta: "la red del aula no aguanta las descargas (5 × 2,4 GB)" se mitiga descargando la noche anterior o repartiendo por USB, responsable el docente; "AMD en Windows no tiene ROCm" se mitiga asignando nivel de CPU de antemano y avisando al alumno.
- Cuando el plan va a ejecutarse con varios agentes en paralelo, el primer entregable es el contrato: rutas de API con JSON exacto de entrada y salida y el esquema de los archivos compartidos (`estado.json`). La demo se construyó con cinco agentes a la vez y funcionó porque el contrato de cinco rutas estaba cerrado antes de arrancar. Sin contrato, paralelizar es multiplicar los conflictos.

## Versión corta para modelos pequeños

Recibes un pedido vago. Produce `PLAN_PROYECTO.md`.

1. Copia el pedido literal entre comillas.
2. Haz máximo 7 preguntas de esta lista: quién lo usa, qué pasa si no se hace, qué dato existe, cómo se demuestra en 5 minutos, qué no debe hacer nunca, quién aprueba, qué infraestructura hay.
3. Lo que no se responda, escríbelo como "Supongo que …".
4. Escribe el usuario en una línea: rol, lugar, dispositivo, frecuencia.
5. Escribe "Hecho significa" en 3 frases en pasado. Cada frase se debe poder mostrar funcionando.
6. Lista de 3 a 6 entregables. Cada uno empieza con "El usuario puede …".
7. Da talla a cada uno: S = medio día, M = 1 a 2 días, L = 3 a 5 días. Escribe la leyenda.
8. Lista riesgos. Cada riesgo lleva una acción y un responsable.
9. Escribe "No entra en esta versión" con al menos 3 ítems.
10. No pongas fechas.
11. Usa la plantilla de arriba tal cual.

Prohibido: entregables como "base de datos" o "API" sueltos. Prohibido: más de 7 preguntas. Prohibido: inventar respuestas del cliente.
