---
name: relevar-maquinas
description: Antes de un taller o una demo con modelos locales (Ollama, Whisper, difusión de imágenes), relevar la máquina de cada alumno (SO, RAM, GPU, VRAM), decidir qué nivel le toca, qué descargar y cómo repartirlo sin colgar la red del aula, y qué decir a quien tiene AMD o Intel integrada. Palabras gatillo: relevar máquinas, qué laptop tienen, requisitos del taller, "¿le corre?", VRAM, GPU de los alumnos, descargar modelos antes de clase, USB, diagnóstico, "no tengo NVIDIA", AMD, ROCm, taller con Edge AI.
nivel: completo
compat: [claude, codex, gpt, deepseek, glm, nemotron, ollama-pequeno]
---

# Relevar máquinas: saber qué corre en qué laptop antes de entrar al aula

## Cuándo usar

- Una semana antes de cualquier taller en el que los alumnos vayan a correr un modelo en su propia laptop: chat con Ollama, voz con Whisper, imágenes con difusión.
- Antes de prometer una demo "en cualquier máquina". No existe esa máquina; existen cinco distintas y hay que conocerlas.
- Cuando un alumno dice "no me corre" en plena clase: aquí está la tabla para decidir en un minuto si es la máquina o la instalación.
- No lo uses para elegir el modelo de imagen en sí (eso es `imagenes-locales`) ni para medir tiempos ya instalado (eso es `pruebas-de-rendimiento`).

## Principios

1. **Cuatro datos bastan:** sistema operativo, RAM, GPU y VRAM. Con eso se decide el nivel de cada alumno. Sin ellos se decide a ciegas y se descubre en clase.
2. **Cada alumno recibe su nivel, no el nivel del docente.** La Mac de 24 GB del docente corre FLUX; la Radeon integrada del alumno corre sd-turbo en CPU. Las dos son válidas si cada uno sabe qué esperar.
3. **La red del aula no descarga nada.** Cinco laptops bajando 2,4 GB a la vez es una tarde perdida. Los pesos llegan la noche anterior o por USB.
4. **Un script de diagnóstico sustituye a la pregunta.** El alumno corre un comando y pega la salida; no tiene que saber qué es VRAM.
5. **AMD en Windows e integradas corren en CPU y eso es normal.** Se avisa antes para que nadie pierda la clase peleando con drivers.
6. **El relevamiento queda escrito en una tabla con nombre, máquina, nivel y nota de instalación.** Es la primera fila del plan de trabajo del taller.

## Procedimiento paso a paso

1. Manda el mensaje de relevamiento (plantilla abajo) al grupo con cinco días de margen. Pide los cuatro datos y una captura si no saben dónde verlos.
2. Explica dónde mirarlos: Windows, `Win+R`, `dxdiag`, pestañas Sistema y Pantalla; macOS, menú Apple, "Acerca de esta Mac"; Linux, `free -g` y `lspci | grep -i vga` (o `nvidia-smi`).
3. Vuelca cada respuesta en la tabla de decisión y asigna nivel con las reglas de abajo. Anota la línea de instalación de torch que le toca.
4. Prepara los paquetes de descarga: una carpeta por nivel con el modelo ya bajado (`~/.cache/huggingface/hub/models--stabilityai--sd-turbo` para rápida; añade `models--stabilityai--sdxl-turbo` para buena) y el modelo de Ollama (`qwen3:1.7b`) y de Whisper (`small`). Cópialas a dos USB.
5. Manda a cada alumno su línea de instalación y el comando de diagnóstico (`python backend/diagnostico.py`) dos días antes. Pide que peguen la salida.
6. Revisa las salidas: el nivel que imprime el diagnóstico debe coincidir con el que asignaste. Si no coincide, manda la máquina, no la tabla.
7. El día del taller, lo primero es correr el diagnóstico otra vez en cada laptop (un minuto) y repartir por USB a quien no bajó nada.
8. Deja escrito en el plan de trabajo del taller la tabla final y qué alumno quedó en modo demo (sin modelo real) por si su máquina no llegó.

## Tabla de decisión por máquina

| Qué tiene el alumno | Acelerador que usará torch | Nivel de imagen | Tiempo estimado por imagen | Instalación de torch |
|---|---|---|---|---|
| NVIDIA RTX 50 (Blackwell), 8 GB o más | CUDA 12.8 | buena (sdxl-turbo con cpu offload si hay menos de 10 GB) | 2 a 4 s | `pip install torch --index-url https://download.pytorch.org/whl/cu128` |
| NVIDIA con 6 GB o más (series 20, 30, 40) | CUDA | buena | 2 a 4 s | `pip install torch --index-url https://download.pytorch.org/whl/cu126` |
| NVIDIA con menos de 6 GB (RTX 3050 4 GB) | CUDA | rápida; buena posible con offload pero lenta | 2 s / 15 s | igual que arriba |
| AMD dedicada en Windows (RX 5700 XT) | CPU (Windows no tiene ROCm) | buena solo si tiene 24 GB o más de RAM (fp32 pide 14 GB); si no, rápida | 60 a 120 s / 20 a 30 s | torch normal de PyPI; no intentar DirectML |
| AMD o Intel integrada (Radeon 780M, Iris) | CPU | rápida | 25 a 40 s | torch normal |
| Sin GPU conocida (i5 de oficina) | CPU | rápida | 30 a 60 s | torch normal; si resulta tener NVIDIA, cu126 |
| Apple Silicon, 16 GB o más | MPS + MLX | máxima (FLUX.2 Klein) con `pip install mflux`; buena sin mflux | 45 s / 7 s | torch normal |
| Apple Silicon, 8 GB | MPS | rápida | 3 a 5 s | torch normal |
| Linux con NVIDIA | CUDA | según VRAM, mismas reglas | | cu126 o cu128 según la serie |

Whisper `small` y `qwen3:1.7b` corren en CPU en todas estas máquinas; no dependen del nivel de imagen. Memoria que suman junto a la imagen: Ollama ~1,5 GB, Whisper ~0,5 GB, Chrome ~0,4 GB, sd-turbo 5 GB o sdxl-turbo 12 GB. Con 8 GB de RAM solo entra sd-turbo y con el navegador cerrado al generar.

Relevamiento real del 08-10-2026 (cinco alumnos y el docente): RTX 5060 8 GB en Win10 (buena, cu128), RTX 3050 4 GB en Ubuntu (rápida, cu126), RX 5700 XT con 32 GB en Win11 (buena en CPU), Radeon 780M en Win11 (rápida), i5 en Windows con GPU por verificar (rápida), Mac 24 GB (máxima). sd-turbo alcanzaba para todos; sdxl-turbo solo para tres.

## Qué descargar y cómo repartirlo

- Rápida: `sd-turbo` fp16, 2,4 GB. Todos.
- Buena: `sdxl-turbo` fp16, 7 GB. Solo quien tenga 6 GB de VRAM o 24 GB de RAM.
- Máxima: `flux2-klein-4b-mflux-q4`, 4,6 GB. Solo Mac con 16 GB o más.
- Siempre: `ollama pull qwen3:1.7b` (~1,5 GB) y el `small` de faster-whisper (~0,5 GB, se baja solo la primera vez).
- Descarga con `HF_HUB_DISABLE_XET=1` y `allow_patterns` de fp16 (comandos en `imagenes-locales`). El protocolo xet se quedó dos horas en 1,1 GB; sin xet baja a 11 MB/s.
- Una descarga a la vez por máquina y por red. Dos en paralelo se frenan entre sí.
- Reparto por USB: copiar la carpeta `models--<org>--<modelo>` entera dentro de `~/.cache/huggingface/hub/` (en Windows, `%USERPROFILE%\.cache\huggingface\hub\`). Hugging Face la reconoce sin volver a bajar nada.

## Qué decir a quien tiene AMD o Intel integrada

- "Tu máquina va a dibujar en CPU. Tarda entre 25 y 60 segundos por imagen. Es suficiente para la clase y no hay nada que instalar aparte."
- No instalar ROCm en Windows (no existe), ni DirectML, ni drivers nuevos el día del taller.
- Cerrar el navegador y otros programas pesados mientras genera, si tiene 8 GB.
- Si la imagen sale negra, el backend reintenta solo en fp32; no es culpa de la máquina.
- Si de todos modos no llega, el modo demo (lámina con Pillow) permite seguir la clase sin modelo.

## Reglas duras

- Nunca se arranca un taller con modelos locales sin la tabla de máquinas llena. "Ya veremos en clase" cuesta la clase.
- Nunca se descarga en el aula. Noche anterior o USB.
- Nunca se asigna a un alumno un nivel por encima del que da `diagnostico.py` en su máquina.
- Nunca se le pide a un alumno con AMD en Windows que "pruebe con la GPU". Va por CPU y punto.
- Nunca se da por bueno un relevamiento por WhatsApp sin la salida del diagnóstico pegada: "tengo una buena laptop" no es un dato.
- La tabla final va al plan de trabajo del taller, con fecha.

## Lista de comprobación

- [ ] Mensaje de relevamiento enviado con cinco días de margen.
- [ ] Tabla con nombre, SO, RAM, GPU, VRAM, nivel asignado y línea de torch para cada alumno.
- [ ] Salida de `diagnostico.py` recibida de cada uno y coincidente con el nivel asignado.
- [ ] Paquetes por nivel en dos USB: pesos de difusión, modelo de Ollama, modelo de Whisper.
- [ ] Alumnos con AMD o Intel integrada avisados de que irán por CPU y cuánto tardará.
- [ ] Plan B escrito: quién queda en modo demo si su máquina no llega.
- [ ] Tabla final copiada al plan de trabajo del taller con fecha.

## Plantilla: mensaje de WhatsApp para el grupo

```
Hola a todos. Para el taller del [fecha] vamos a correr modelos de IA en su propia laptop,
así que necesito saber qué máquina tiene cada uno. Respondan por aquí con estos cuatro datos:

1. Sistema operativo (Windows 10 u 11, macOS, Ubuntu...)
2. Memoria RAM (8, 16, 32 GB)
3. Tarjeta de video (NVIDIA RTX xxxx, AMD Radeon xxxx, Intel integrada, Apple M1/M2/M3, o "no sé")
4. Memoria de la tarjeta de video (VRAM) si es NVIDIA o AMD dedicada

Dónde verlo: en Windows, Win+R, escriban dxdiag, pestañas Sistema y Pantalla. En Mac, menú Apple,
"Acerca de esta Mac". En Linux: free -g y lspci | grep -i vga. Si no están seguros, manden captura.

Con eso les mando a cada uno qué instalar y un USB con los modelos ya descargados, para que
nadie dependa del wifi del aula. Plazo: [día], así alcanzo a preparar los USB.
```

## Versión corta para modelos pequeños

Vas a preparar un taller donde cada alumno corre modelos en su laptop. Sigue estas órdenes:

1. Pide a cada alumno cuatro datos: sistema operativo, RAM, tarjeta de video, VRAM. Usa la plantilla de mensaje de arriba.
2. Haz una tabla: alumno, SO, RAM, GPU, VRAM, nivel, instalación.
3. Asigna nivel: NVIDIA con 6 GB o más de VRAM → buena (sdxl-turbo). NVIDIA con menos → rápida (sd-turbo). AMD o Intel en Windows → CPU; buena solo con 24 GB de RAM, si no rápida. Mac con 16 GB o más → máxima (FLUX con mflux). Sin GPU → rápida en CPU.
4. RTX 50: `pip install torch --index-url https://download.pytorch.org/whl/cu128`. Otras NVIDIA: `cu126`. El resto: torch normal.
5. Pide a cada alumno que corra `python backend/diagnostico.py` y pegue la salida. El nivel que imprime manda sobre tu tabla.
6. Descarga los modelos la noche anterior con `HF_HUB_DISABLE_XET=1`, uno a la vez. Nunca en el aula.
7. Copia la carpeta `models--stabilityai--sd-turbo` de `~/.cache/huggingface/hub/` a un USB y repártela.
8. A quien tiene AMD o Intel integrada dile: "va por CPU, tarda de 25 a 60 s por imagen, no instales drivers".
9. Escribe la tabla final en el plan de trabajo con la fecha.

Prohibido: empezar sin la tabla llena. Prohibido: descargar en clase. Prohibido: pedir a AMD en Windows que use la GPU.
