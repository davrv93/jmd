# Armar Robo en tu máquina (kit robo-local-nube)

Mismo plan y mismas skills que en el aula del LMS, pero en tu laptop: **Windows 10/11 o Mac** (también Linux), sin GPU. **No instalas modelos ni paquetes pesados**: el texto, las imágenes, el dictado y la voz los pone la nube del curso. Solo necesitas internet, Python y tu cuenta del curso. En Windows **no** hace falta Git Bash ni WSL.

## Con JMDesign Studio (lo más fácil: sin instalar Python)

JMDesign Studio trae su propio Python con todo lo que usa el kit. No hace falta instalar Python ni ejecutar `iniciar.bat`:

1. Abre JMDesign Studio → **Plan de trabajo** → **Abrir** y elige esta carpeta (la que tiene `modulos/` y `aula_local.py`).
2. Pulsa **«Arrancar el aula»**. Si es la primera vez, se abre tu navegador: **entra con tu cuenta del curso** (la del LMS) y confirma.
3. Sigue con «Personalizar» y «Construir». Tu robot se ve en http://127.0.0.1:8800/vista/yo/robo/.

Al cerrar JMDesign se apagan el aula y tu robot. Si prefieres tu terminal y tu agente, sigue con los pasos de abajo: `iniciar.*` y `entorno.*` usan también el Python de JMDesign si está instalado (Windows 7/8: JMDesign no trae Python; instálalo o usa otro equipo).

## Sin JMDesign: qué necesitas

| | Windows 10/11 | Mac |
|---|---|---|
| Python 3.10 o más nuevo (no hace falta si tienes JMDesign Studio) | `winget install Python.Python.3.12` o python.org (marca «Add python.exe to PATH») | python.org o `brew install python@3.12` |
| Tu cuenta del curso | la del LMS | la del LMS |
| Un agente de terminal | `jmd`, OpenCode o Claude Code | `jmd`, OpenCode o Claude Code |
| Navegador | Chrome o Edge | Chrome |

## Los 5 pasos

| Paso | Windows 10/11 | Mac |
|---|---|---|
| 1. Descomprime y entra | Clic derecho en el zip → «Extraer todo» y abre la carpeta `robo-local-nube` | Doble clic en el zip y `cd robo-local-nube` en la Terminal |
| 2. Arranca el aula local (déjala abierta) | Doble clic en **`iniciar.bat`** (o en PowerShell: `powershell -ExecutionPolicy Bypass -File iniciar.ps1`) | `sh iniciar.sh` |
| 3. Prepara la terminal del agente (otra ventana, en la carpeta) | PowerShell: `. .\entorno.ps1` (si bloquea scripts, en cmd: `entorno.bat`) | `. ./entorno.sh` |
| 4. Abre tu agente y pega el prompt | El de `trabajo\plan-robo\PROMPT_ARMAR_ROBO.md` | El de `trabajo/plan-robo/PROMPT_ARMAR_ROBO.md` |
| 5. Mira tu robot | http://127.0.0.1:8800/vista/yo/robo/ | http://127.0.0.1:8800/vista/yo/robo/ |

En el paso 2, la primera vez (sin JMDesign) se instala lo mínimo (~45 MB, un minuto) y se abre tu navegador para que **entres con tu cuenta del curso**: confirma y vuelve a la ventana. Tu token personal queda guardado fuera de esta carpeta, solo para tu usuario (Windows: `%APPDATA%\jmd-robo`; Mac: `~/.config/jmd-robo`). No lo copies a ningún archivo.

En el paso 4 el agente te hace 6 preguntas (nombre, negocio, tono, color y avatar robot u osito, tus tres preguntas frecuentes, estilo y flyer), personaliza el plan y construye a tu robot tarea por tarea en `trabajo/robo/`. Cada tarea se comprueba igual en los dos sistemas: `python herramientas/verificar.py F1-T2` (o `todo`).

## Qué hay en esta versión

| Pieza | De dónde sale |
|---|---|
| Texto (modelo `clase`) | Gateway del curso, con tu token y tu cuota diaria |
| Imágenes | Servicio de imagen del curso: **solo calidad «máxima»** (FLUX). «baja» y «media» **no están disponibles** y lo dicen con un mensaje claro |
| Dictado (voz a texto) | Whisper en el servidor del curso; si falla, el dictado de Chrome |
| Voz (texto a voz) | Piper en el servidor del curso; si falla, la del navegador. Arranca apagada |
| Avatar 3D | `modulos/` (robot u osito, se tiñe de tu color). No se edita |

## Qué hay en la carpeta

| Carpeta o archivo | Para qué |
|---|---|
| `trabajo/plan-robo/` | El plan de trabajo (plantilla a personalizar) y el prompt. |
| `skills/` | Las 7 skills `s2-robo-*` que usa tu agente. |
| `modulos/` | El avatar 3D (Three.js y `avatar.js`). No se toca: se elige y se tiñe con parámetros. |
| `herramientas/verificar.py` | Corre el criterio de cada tarea del plan (PASA o FALLA) en Windows y Mac. |
| `herramientas/revisar.py` | Comprueba tu personalidad, que los módulos 3D sigan intactos y que no haya claves en el kit. |
| `aula_local.py` | El «aula»: sirve tus archivos y reenvía texto, imagen, dictado y voz a la nube del curso. |
| `cuenta.py` | Tu token: `python cuenta.py ver` (sin mostrarlo), `entrar`, `salir`. |
| `iniciar.bat` / `iniciar.ps1` / `iniciar.sh` | Arrancan el aula (Windows / Windows / Mac y Linux). |
| `entorno.ps1` / `entorno.bat` / `entorno.sh` | Preparan la terminal del agente (PowerShell / cmd / Mac y Linux). |

## Si algo falla

- **Mira primero** http://127.0.0.1:8800/nube: dice si tu token vale, cuándo vence y qué servicios responden.
- «No encuentro Python» (Windows): `winget install Python.Python.3.12`, cierra y vuelve a abrir `iniciar.bat`.
- PowerShell dice que «la ejecución de scripts está deshabilitada»: usa `iniciar.bat`, o `powershell -ExecutionPolicy Bypass -File iniciar.ps1` (no cambia nada del sistema).
- `token_invalido` o «venció»: `iniciar.bat --token` (Mac: `sh iniciar.sh --token`) y vuelve a entrar.
- «La calidad baja no está disponible»: es lo esperado; pide calidad máxima.
- `429` en imágenes: se acabó el cupo del día de la clase (vuelve a las 19:00, hora de Lima) o tu tope personal. El flyer sale igual con fondo liso.
- `nube_sin_ruta`: el servidor del curso aún no publicó el kit; avisa al instructor.
- Robo no responde en el visor: `python trabajo/robo/robo.py arrancar` y, si no arranca, `python trabajo/robo/robo.py log`.
- «el puerto 8800 (u 8788) está ocupado»: mira quién lo usa con `netstat -ano | findstr :8800` (Windows) o `lsof -i :8800` (Mac) y ciérralo, o arranca en otro puerto (`$env:AULA_PUERTO=8801` antes de `iniciar.bat`; Mac: `AULA_PUERTO=8801 sh iniciar.sh`).
- Tu agente no tiene modelo: `entorno.sh`/`entorno.ps1` dejan `JMD_URL=http://127.0.0.1:8800` para `jmd`, así habla con el gateway del curso a través del aula, con tu cuota.

Para dejar de usar el kit en este equipo: `python cuenta.py salir` (revoca tu token y lo borra).
