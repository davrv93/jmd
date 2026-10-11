---
id: ej-diagnostico-maquina
title: "Qué nivel de imagen le toca a tu laptop"
summary: Correr diagnostico.py, leer su salida, decidir el nivel con la tabla y descargar solo lo que tu máquina aguanta.
tags: [edge-ai, imagenes-locales, relevar-maquinas, gpu]
level: básico
lesson: pa-02
phase: experiencia
order: 12
---
No existe «una máquina cualquiera»: existen la tuya y la de tus compañeros, y cada una aguanta un
nivel distinto de generación de imágenes. El script `diagnostico.py` lo decide por ti.

## 1. Corre el diagnóstico

Con el entorno creado (`python3 -m venv .venv`, `pip install -r osito/backend/requirements.txt`):

```bash
cd taller-agentico
source .venv/bin/activate            # en Windows: .venv\Scripts\activate
python osito/backend/diagnostico.py
```

## 2. Lee la salida

Una laptop con NVIDIA de 8 GB:

```text
Sistema      : Windows 10 (AMD64)
Python       : 3.12.4
Acelerador   : cuda - NVIDIA GeForce RTX 5060
Memoria util : 8.0 GB (RAM total 16.0 GB)
Ollama       : si

Nivel maximo de imagen para esta maquina: sdxl-turbo
  flux2-klein  falta       no cabe aqui
  sdxl-turbo   falta       usable
  sd-turbo     descargado  usable

VRAM justa: sdxl-turbo corre con cpu offload (mas lento, pero corre).
```

Una laptop sin GPU usable:

```text
Sistema      : Windows 11 (AMD64)
Python       : 3.12.4
Acelerador   : cpu - AMD Radeon 780M
Memoria util : 16.0 GB (RAM total 16.0 GB)
Ollama       : NO instalado

Nivel maximo de imagen para esta maquina: sd-turbo
  flux2-klein  falta       no cabe aqui
  sdxl-turbo   falta       no cabe aqui
  sd-turbo     falta       usable

Sin GPU usable por torch: sd-turbo tarda 20-60 s por imagen. Suficiente para la clase.
GPU AMD o Intel en Windows: torch no la usa; es normal, no pierdas tiempo con drivers.
```

| Línea | Qué te dice |
|---|---|
| `Acelerador` | `cuda` (NVIDIA), `mps` (Apple Silicon) o `cpu`. Si tienes AMD o Intel y dice `cpu`, es lo esperado |
| `Memoria util` | VRAM si es `cuda`; RAM en los demás casos. Es la cifra que decide el nivel |
| `Ollama` | Si dice `NO instalado`, falta `ollama pull qwen3:1.7b` |
| `Nivel maximo` | El nivel más alto que cabe. No descargues nada por encima |
| `descargado` / `falta` | Qué modelos ya tienes en la caché de Hugging Face |
| `usable` / `no cabe aqui` | Qué niveles puede usar esta máquina |

## 3. Tabla de decisión

| Qué tienes | Acelerador | Nivel | Tiempo por imagen | Instalación de torch |
|---|---|---|---|---|
| NVIDIA RTX serie 50, 8 GB o más | CUDA 12.8 | buena (sdxl-turbo con offload si hay menos de 10 GB) | 2 a 4 s | `pip install torch --index-url https://download.pytorch.org/whl/cu128` |
| NVIDIA con 6 GB o más (series 20, 30, 40) | CUDA | buena | 2 a 4 s | `pip install torch --index-url https://download.pytorch.org/whl/cu126` |
| NVIDIA con menos de 6 GB | CUDA | rápida | 2 s | igual que arriba |
| Apple Silicon con 16 GB o más | MPS + MLX | máxima con `pip install mflux`; buena sin él | 45 s / 7 s | torch normal |
| Apple Silicon con 8 GB | MPS | rápida | 3 a 5 s | torch normal |
| AMD dedicada en Windows | CPU (Windows no tiene ROCm) | buena solo con 24 GB o más de RAM; si no, rápida | 60 a 120 s / 20 a 30 s | torch normal; no intentes DirectML |
| AMD o Intel integrada | CPU | rápida | 25 a 40 s | torch normal |
| Sin GPU conocida | CPU | rápida | 30 a 60 s | torch normal |

Whisper `small` y `qwen3:1.7b` corren en CPU en todas estas máquinas; no dependen del nivel.
Memoria que suman junto a la imagen: Ollama ~1,5 GB, whisper ~0,5 GB, Chrome ~0,4 GB, sd-turbo
5 GB o sdxl-turbo 12 GB. Con 8 GB de RAM solo entra sd-turbo, y con el navegador cerrado al
generar.

## 4. Descarga por nivel

Una sola vez, un modelo a la vez, con `HF_HUB_DISABLE_XET=1` delante (el protocolo xet se queda
colgado en algunas redes). Nunca en el aula.

**Rápida** (todos, 2,4 GB):

```bash
HF_HUB_DISABLE_XET=1 .venv/bin/python -c "from huggingface_hub import snapshot_download as s; s('stabilityai/sd-turbo', allow_patterns=['*.json','*.txt','tokenizer/*','scheduler/*','*/*.fp16.safetensors'])"
```

**Buena** (solo si el diagnóstico dice `sdxl-turbo`, 7 GB):

```bash
HF_HUB_DISABLE_XET=1 .venv/bin/python -c "from huggingface_hub import snapshot_download as s; s('stabilityai/sdxl-turbo', allow_patterns=['*.json','*.txt','tokenizer*/*','scheduler/*','*/*.fp16.safetensors'])"
```

**Máxima** (solo Apple Silicon con 16 GB o más, 4,6 GB):

```bash
pip install mflux
HF_HUB_DISABLE_XET=1 .venv/bin/python -c "from huggingface_hub import snapshot_download as s; s('mflux-community/flux2-klein-4b-mflux-q4')"
```

## 5. RTX serie 50: torch con CUDA 12.8

El `torch` que instala `pip` por defecto no ve las gráficas Blackwell (RTX 5060, 5070, 5080,
5090). El diagnóstico dirá `cpu` aunque tengas la tarjeta. Reinstala primero:

```bash
pip uninstall -y torch
pip install torch --index-url https://download.pytorch.org/whl/cu128
python osito/backend/diagnostico.py       # ahora debe decir cuda
```

## 6. Si llegaste sin modelo

El asistente sigue funcionando en **modo demo**: una lámina con formas y colores en lugar de la
imagen generada. Puedes seguir toda la clase; solo el bloque de flyers se ve distinto. También
puedes copiar la carpeta `models--stabilityai--sd-turbo` desde la caché de un compañero
(`~/.cache/huggingface/hub/`, en Windows `%USERPROFILE%\.cache\huggingface\hub\`) por USB:
Hugging Face la reconoce sin volver a bajar nada.

## Comprobaciones

- `diagnostico.py` imprime tu nivel y, después de descargar, tu modelo dice `descargado`.
- `curl -s http://localhost:8765/api/salud` lista tu modelo en `motores_imagen` y el nivel en
  `tope_imagen`.
- Pide una imagen en `maxima` desde una máquina de nivel `rapida`: `motor` debe decir
  `sd-turbo`, sin error.
