---
name: s2-robo-estilos
description: Arma el Robo de un negocio a partir de asistente.json (nombre, personalidad, saludo, preguntas frecuentes, colores) y lo muestra en 4 estilos (neon, claro, atardecer, cabina) con chat, avatar 3D, voz e imagen ya funcionando. El alumno programa sus herramientas en Python en herramientas.py, con un editor web (codigo.html) que guarda, marca la línea del error y prueba al instante. Palabras gatillo: mi robo, robo del negocio, asistente del negocio, asistente.json, estilo neon, estilo claro, atardecer, cabina, cambiar de estilo, herramientas.py, mi código, programar a robo, herramienta, horario, cotizar, descuento.
nivel: completo
compat: [claude, codex, gpt, deepseek, glm, nemotron, ollama-pequeno]
---

# S2 · Robo con estilo

## Cuándo usar

- El alumno quiere su Robo para un negocio real (o de ejemplo) en minutos, con aspecto profesional.
- Hay que mostrar el **mismo asistente en otro estilo** o el **mismo estilo para otro negocio**.
- El alumno quiere **programar** algo propio: una respuesta que salga de su código y no de la IA.
- No lo uses para construir Robo pieza por pieza desde cero: eso es `s2-robo-aula` + `s2-robo-chat`, `s2-robo-avatar`, etc.

## Cómo funciona (en una frase)

`asistente.json` (el contenido) + un estilo de `motor/estilos/` = la carpeta `/trabajo/mi-robo/` con el asistente de la clase ya armado: tu nombre, tu personalidad, tus preguntas y tu piel. Cambiar de estilo o de negocio es cambiar un parámetro o el JSON: **nunca se edita el HTML generado ni el estilo**. Lo único que es tuyo para programar es `backend/herramientas.py`.

## Procedimiento paso a paso

1. **Copia la plantilla** (o el ejemplo de la cafetería, para ir rápido):
   ```sh
   mkdir -p /trabajo/negocio && cd /trabajo/negocio
   cp /opt/skills-curso/s2-robo-estilos/motor/asistente.plantilla.json asistente.json
   # o: cp /opt/skills-curso/s2-robo-estilos/motor/ejemplos/cafeteria.json asistente.json
   ```
2. **Llena `asistente.json`** con el negocio. Reglas:
   - `nombre`: cómo se llama tu Robo (máximo 24 letras).
   - `negocio`: `nombre`, `rubro` y `whatsapp` (solo dígitos con código de país: `51986149476`).
   - `personalidad`: cómo habla, en una o dos frases.
   - `saludo`: lo primero que dice al abrir.
   - `preguntas_frecuentes`: lista de `{"preguntas": [...], "respuesta": "...", "animo": "feliz"}`. Varias formas de preguntar lo mismo en `preguntas`. **Solo datos reales**: no inventes precios, horarios ni promociones.
   - `reglas` (opcional): límites del asistente («nunca prometas descuentos»).
   - `marca` (opcional): `primario` y `acento` en hexadecimal; pintan al robot.
3. **Arma tu Robo** con un estilo:
   ```sh
   python3 /opt/skills-curso/s2-robo-estilos/motor/construir.py --asistente asistente.json --estilo neon
   ```
   Para comparar todos: `--todos` (deja `/trabajo/mi-robo/index.html` con enlaces a los 4).
4. **Arráncalo** (cada vez que cambies `asistente.json` y vuelvas a armar):
   ```sh
   sh /trabajo/mi-robo/robo.sh reiniciar
   ```
   Comprueba: `curl -s localhost:8766/api/salud`. Si falla: `tail -n 20 /trabajo/mi-robo.log`.
5. **Ábrelo en el Visor**: `mi-robo/index.html` (la galería) o `mi-robo/neon/index.html`.
6. **Prográmalo**: abre `mi-robo/codigo.html` en el Visor. Es el editor de `herramientas.py`:
   - Quita los `#` del **Reto 1**, pon el horario real, **Ctrl+S** y pregunta «¿a qué hora abren?» en el panel de prueba.
   - Si respondió tu código verás `⚙ tu código: horario()`. Si te equivocaste, el editor marca **la línea** en rojo y Robo dice qué falló.
   - Sigue con el Reto 2 (cotizar) y el Reto 3 (una herramienta tuya).
   - No hace falta reiniciar: tu código se recarga solo en cada mensaje.

## Los 4 estilos

| `--estilo` | Cómo se ve | Para qué negocios |
|---|---|---|
| `neon` | Retro arcade: pantalla CRT, verde fósforo, letra de terminal, líneas de barrido | Tecnología, gaming, academias, todo lo que quiera verse «hacker» |
| `claro` | Blanco, aire, azul de marca, sombras suaves | Clínicas, estudios, servicios profesionales |
| `atardecer` | Magenta, naranja y violeta de playa al anochecer | Bares, eventos, marcas jóvenes |
| `cabina` | HUD cian sobre azul profundo, cuadrícula técnica | Servicios técnicos, logística, empresas |

## Herramientas: cómo se programa una

```python
@herramienta("horario", "abren", "atienden")     # palabras que la activan
def horario(mensaje):                            # recibe el mensaje tal cual
    return "Atendemos de lunes a viernes de 9 a.m. a 6 p.m."   # lo que Robo responde
```

- `numeros(mensaje)` saca los números del mensaje: `"cotiza 3"` → `[3.0]`.
- `ahora_en_lima()` da la fecha y hora de Lima.
- Si varias herramientas coinciden, gana la palabra más larga («horario» le gana a «hora»).
- Devuelve `None` para dejar pasar la pregunta a la IA.
- `herramientas.py` **nunca se pisa** al volver a armar. `robo_base.py` sí: no lo edites.

## Verificación antes de entregar

- [ ] `construir.py` termina con `OK` y sin avisos.
- [ ] `curl -s localhost:8766/api/salud` responde.
- [ ] Robo saluda con tu saludo y responde una pregunta de tus `preguntas_frecuentes`.
- [ ] Al menos una respuesta sale de tu código (`⚙ tu código: ...`).
- [ ] Ningún dato inventado: todo sale del negocio real.

## Errores comunes

| Síntoma | Causa | Arreglo |
|---|---|---|
| `El JSON está mal escrito en la línea N` | Coma de más o comilla sin cerrar | Ve a esa línea; la coma antes de `}` o `]` sobra |
| `El asistente.json tiene problemas` | Campo que falta o mal escrito | La lista dice el campo exacto |
| El visor dice `asistente_apagado` | Robo no está arrancado | `sh /trabajo/mi-robo/robo.sh arrancar` |
| `Address already in use` | El asistente de ejemplo ocupa el 8766 | `aula parar` y `sh /trabajo/mi-robo/robo.sh reiniciar` |
| El editor marca una línea en rojo | Error de Python (falta `:`, sangría) | Corrige esa línea; en Python la sangría importa |
| Mi herramienta no responde | Ninguna palabra coincide, o devuelve `None` | Revisa las palabras de `@herramienta(...)` |
| El cambio de `asistente.json` no se ve | No volviste a armar ni reiniciar | Paso 3 y paso 4 |

## Versión corta para modelos pequeños

1. `cp /opt/skills-curso/s2-robo-estilos/motor/asistente.plantilla.json /trabajo/negocio/asistente.json` y llénalo con datos reales.
2. `python3 /opt/skills-curso/s2-robo-estilos/motor/construir.py --asistente /trabajo/negocio/asistente.json --estilo neon`
3. `sh /trabajo/mi-robo/robo.sh reiniciar`
4. Visor: `mi-robo/neon/index.html`. Código: `mi-robo/codigo.html`.
5. Programa en `/trabajo/mi-robo/backend/herramientas.py` con `@herramienta("palabra")`. No edites `robo_base.py` ni el HTML generado.
