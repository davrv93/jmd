---
name: pruebas-de-uso
description: Úsalo cuando hay una pantalla, flujo o asistente (con texto o con voz) que ya funciona y hay que saber si una persona real lo entiende y lo termina sin ayuda. Palabras gatillo: prueba de usabilidad, usuarios reales, pensar en voz alta, SUS, hallazgos, severidad, "¿lo entienden?", test con usuarios, piloto, observar.
nivel: completo
compat: [claude, codex, gpt, deepseek, glm, nemotron, ollama-pequeno]
---

# Pruebas de uso: cinco personas, una tarde, hallazgos con severidad

## Cuándo usar

Cuando algo ya se puede operar de punta a punta y la duda es si el usuario lo logra solo. Sirve para una pantalla de registro de avance de obra, un formulario de matrícula, un chat que responde dudas de alumnos o un asistente que escucha por voz. No sirve para decidir si la idea es buena (eso es entrevista, no prueba) ni para medir rendimiento (eso es `pruebas-de-rendimiento`).

Cinco usuarios bastan para encontrar la mayoría de los problemas graves de una interfaz. Más usuarios en la misma ronda encuentran los mismos problemas; es mejor corregir y hacer una segunda ronda con otros cinco.

## Principios

1. Observa, no ayudes. El momento en que el usuario se traba es el dato. Si le dices dónde hacer clic, perdiste el hallazgo.
2. Tareas, no funciones. No se pide "prueba el módulo de reportes"; se pide "averigua cuánto se gastó en cemento en septiembre".
3. El usuario tiene siempre la razón sobre su propia confusión. Si tres de cinco no encuentran el botón, el botón está mal puesto, no los usuarios.
4. Se mide lo que pasó, no lo que el usuario opina que pasó. Éxito, tiempo y errores se cuentan; la opinión se recoge aparte con el SUS.
5. Cada hallazgo lleva severidad de 1 a 4 y evidencia (qué hizo, qué dijo). Sin evidencia es una impresión.
6. En asistentes con voz, la primera pregunta es si el usuario supo qué entendió el sistema. Un reconocimiento equivocado que el usuario no detecta es el fallo más grave.
7. El informe cabe en una página. Lo que no cabe, no se va a corregir esta semana.

## Procedimiento paso a paso

1. Define el objetivo de la ronda en una frase: "Saber si un residente registra un avance de partida sin ayuda en menos de 3 minutos".
2. Elige entre tres y cinco tareas representativas. Escribe cada una como un escenario con contexto y meta, sin nombrar botones ni menús. Ejemplo: "Llegaste a la obra y terminaron de vaciar la losa del nivel 3. Deja constancia en el sistema".
3. Define para cada tarea el criterio de éxito (qué estado final cuenta como logrado) y un tiempo tope (tras el cual se declara fallo aunque siga intentando).
4. Recluta cinco personas del perfil real o lo más cercano. No valen compañeros del equipo que ya vieron el sistema. Avisa que se prueba el sistema, no a ellos, y que pueden dejar cuando quieran.
5. Prepara el entorno: datos de prueba cargados, sesión iniciada o no según el flujo real, cronómetro, hoja de observación impresa o en otra pantalla. Si es con voz, graba audio con permiso.
6. Lee al inicio el protocolo de pensar en voz alta: "Mientras haces la tarea, cuéntame qué estás pensando, qué buscas y qué esperas que pase. No hay respuestas incorrectas". Haz una tarea de calentamiento trivial para que se acostumbre.
7. Lee cada tarea tal como está escrita. Arranca el cronómetro. Durante la tarea, anota: cada clic o frase equivocada (error), cada pausa mayor de 5 segundos (duda), cada comentario literal relevante.
8. No ayudes. Si el usuario pregunta "¿dónde está?", responde "¿Dónde crees tú que estaría?". Si pide ayuda por segunda vez o supera el tiempo tope, anota fallo y pasa a la siguiente tarea.
9. En asistentes con voz, tras cada turno pregunta "¿Qué crees que entendió el sistema?" y compara con la transcripción real. Anota si coincide, si el usuario detectó el error y si pudo corregirlo.
10. Al terminar las tareas, entrega el cuestionario SUS de diez preguntas (plantilla abajo). El usuario lo responde solo, sin comentar.
11. Calcula el SUS: para las preguntas impares (1,3,5,7,9) resta 1 a la respuesta; para las pares (2,4,6,8,10) resta la respuesta a 5; suma los diez valores y multiplica por 2,5. El resultado va de 0 a 100. Por debajo de 68 hay trabajo pendiente; por encima de 80 el sistema se percibe como bueno.
12. Pasa las notas a la hoja de hallazgos. Agrupa lo que vieron varios usuarios. Asigna severidad: 1 cosmético, 2 menor (molesta, se resuelve solo), 3 mayor (frena, necesita ayuda o varios intentos), 4 crítico (impide terminar o produce un dato incorrecto sin que el usuario lo note).
13. Redacta el informe de una página con la plantilla. Ordena los hallazgos por severidad y frecuencia. Propón una corrección concreta para cada hallazgo de severidad 3 y 4.
14. Convierte las correcciones en tareas de `PLAN_TRABAJO.md`. Programa la segunda ronda después de aplicarlas.

## Reglas duras

- Nunca expliques cómo hacer la tarea antes ni durante. La ayuda convierte la prueba en capacitación.
- Nunca pruebes con menos de tres personas ni declares conclusiones con una sola.
- Nunca uses como usuarios a quienes construyeron o diseñaron el sistema.
- Nunca cambies el enunciado de una tarea entre usuarios. Si está mal redactada, se anota y se corrige para la siguiente ronda.
- Nunca mezcles la opinión del usuario con la medición. El "me pareció fácil" va en el SUS; el "tardó 4 minutos y pidió ayuda dos veces" va en la hoja de hallazgos.
- Un hallazgo sin evidencia literal (qué hizo o qué dijo) no entra en el informe.
- En voz: si el sistema entendió otra cosa y el usuario no lo notó, la severidad es 4, sin discusión.
- Graba o anota solo con permiso explícito. Sin permiso, solo observación en papel.

## Lista de comprobación

- [ ] Objetivo de la ronda escrito en una frase.
- [ ] Entre tres y cinco tareas como escenarios, sin nombrar botones.
- [ ] Cada tarea tiene criterio de éxito y tiempo tope.
- [ ] Cinco personas del perfil real, ninguna del equipo.
- [ ] Protocolo de pensar en voz alta leído al inicio.
- [ ] Hoja de observación lista: éxito, tiempo, errores, dudas, citas.
- [ ] En voz: pregunta "¿qué entendió el sistema?" tras cada turno y comparación con la transcripción.
- [ ] SUS aplicado a los cinco y calculado con la fórmula.
- [ ] Hallazgos con severidad 1 a 4 y evidencia literal.
- [ ] Informe de una página con correcciones propuestas para severidad 3 y 4.
- [ ] Correcciones convertidas en tareas del plan de trabajo.

## Plantilla

### Guion de sesión (para el moderador)

```markdown
# Sesión de prueba de uso: [sistema] · Usuario [N] · [fecha]
Perfil: [rol, experiencia con sistemas, dispositivo]
Permiso para grabar: [sí/no]

Lectura inicial: "Vamos a probar el sistema, no a ti. Mientras haces cada tarea, cuéntame
en voz alta qué piensas, qué buscas y qué esperas que pase. No hay respuestas incorrectas.
No te voy a ayudar, porque necesito ver dónde se traba el sistema. Puedes parar cuando quieras."

Tarea de calentamiento: [acción trivial, no se mide]

| # | Escenario (leer literal) | Éxito = | Tope | Logrado | Tiempo | Errores | Dudas >5 s | Citas |
|---|--------------------------|---------|------|---------|--------|---------|------------|-------|
| 1 | [contexto + meta] | [estado final] | [min] | sí/no/con ayuda | | | | |
| 2 | [contexto + meta] | [estado final] | [min] | | | | | |
| 3 | [contexto + meta] | [estado final] | [min] | | | | | |

Solo para voz, por turno:
| Turno | Lo que dijo el usuario | Lo que transcribió el sistema | ¿Usuario supo qué entendió? | ¿Pudo corregir? |
|-------|------------------------|-------------------------------|-----------------------------|-----------------|
```

### SUS en español (1 = totalmente en desacuerdo, 5 = totalmente de acuerdo)

```markdown
1. Creo que me gustaría usar este sistema con frecuencia.
2. Encontré el sistema innecesariamente complejo.
3. Pensé que el sistema era fácil de usar.
4. Creo que necesitaría ayuda de una persona técnica para poder usar este sistema.
5. Encontré que las distintas funciones del sistema estaban bien integradas.
6. Pensé que había demasiada inconsistencia en este sistema.
7. Imagino que la mayoría de las personas aprenderían a usar este sistema muy rápido.
8. Encontré el sistema muy incómodo de usar.
9. Me sentí muy seguro usando el sistema.
10. Necesité aprender muchas cosas antes de poder empezar a usar este sistema.

Cálculo: impares (respuesta − 1) + pares (5 − respuesta); suma × 2,5. Rango 0–100. Referencia: 68 promedio.
```

### Informe de una página

```markdown
# Informe de prueba de uso: [sistema] · [fecha]
Objetivo: [frase]. Usuarios: 5 ([perfil]). Tareas: [N]. Moderador: [nombre].

## Resultados
| Tarea | Éxito (de 5) | Tiempo mediano | Errores totales |
|-------|--------------|----------------|-----------------|
| 1 | | | |
SUS promedio: [valor] (mín [ ], máx [ ]).

## Hallazgos (ordenados por severidad y frecuencia)
| # | Severidad (1–4) | Usuarios afectados | Qué pasó (evidencia literal) | Corrección propuesta |
|---|-----------------|--------------------|------------------------------|----------------------|
| 1 | 4 | 3 de 5 | "[cita]"; [acción observada] | [cambio concreto] |

## Siguiente ronda
Fecha prevista: [ ]. Correcciones a aplicar antes: [IDs del PLAN_TRABAJO].
```

## Aprendido en la demo Tecnosito (10-10-2026)

- En un flyer generado con un LLM local, el dato alterado es el hallazgo de severidad 4: el modelo cambió la hora y adornó el título ("PHP para Dummies") sin que nada avisara. La pantalla muestra ahora los datos extraídos (título, fecha, hora, precio, lugar) junto a la imagen para que el usuario corrija un campo y regenere.
- Tarea de prueba que vale la pena: "Pide un flyer para tu taller del domingo 11 a las 6 pm a S/ 100". Mide si el usuario detecta un dato alterado por el LLM antes de compartir el flyer, igual que en voz se mide si detecta una transcripción errónea. Si no lo detecta, la severidad es 4 aunque la imagen sea bonita.
- Anota también la espera: 9 s en rápida y 45 s en máxima. Si el usuario abandona o pulsa dos veces durante la espera, es hallazgo de carga percibida, no de rendimiento.

## Versión corta para modelos pequeños

Ayuda a preparar y registrar una prueba de uso con 5 personas.

1. Escribe el objetivo en una frase.
2. Escribe de 3 a 5 tareas como situaciones: "Terminaron la losa. Deja constancia". No menciones botones.
3. Para cada tarea: qué cuenta como éxito y cuántos minutos máximo.
4. Al inicio di al usuario: "Piensa en voz alta. No te voy a ayudar. Probamos el sistema, no a ti".
5. Lee la tarea literal. Cronometra.
6. Anota: logró sí/no, tiempo, errores, pausas largas, frases textuales.
7. No ayudes. Si pregunta dónde está algo, responde "¿dónde crees tú?".
8. Si es con voz, tras cada turno pregunta: "¿Qué crees que entendió el sistema?". Compara con la transcripción.
9. Al final entrega las 10 preguntas SUS. Calcula: impares resta 1, pares resta de 5, suma, multiplica por 2,5.
10. Severidad: 1 cosmético, 2 menor, 3 frena, 4 impide o produce dato falso sin que se note.
11. Cada hallazgo lleva cita o acción observada.
12. Informe en una página con la plantilla. Propón corrección para severidad 3 y 4.

Prohibido: ayudar durante la tarea. Prohibido: probar con gente del equipo. Prohibido: hallazgo sin evidencia.
