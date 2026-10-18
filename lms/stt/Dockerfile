# Voz a texto de la clase (faster-whisper, int8 en CPU). Sin torch: la imagen pesa unos 400 MB con el modelo.
# El modelo de la etiqueta MODELO viene dentro de la imagen (no baja nada al arrancar); otro modelo, con
# STT_MODELO, se baja una vez al volumen /modelos.
#   docker build -t jmd/stt:latest lms/stt                    (base, el de la clase)
#   docker build --build-arg MODELO=small -t jmd/stt:small lms/stt
FROM docker.io/library/python:3.12-slim
ENV PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 PIP_DISABLE_PIP_VERSION_CHECK=1 \
    MALLOC_ARENA_MAX=2 HF_HUB_DISABLE_TELEMETRY=1 HF_HUB_DISABLE_XET=1 HF_HOME=/tmp/hf \
    STT_MODELOS=/app/modelos
WORKDIR /app
COPY requirements.txt .
# onnxruntime solo sirve para el filtro VAD, que aquí va apagado: fuera 60 MB.
RUN pip install -r requirements.txt && pip uninstall -y onnxruntime hf-xet
ARG MODELO=base
RUN python -c "import sys; from faster_whisper import download_model; download_model(sys.argv[1], output_dir='/app/modelos/' + sys.argv[1])" "$MODELO" \
    && rm -rf /tmp/hf /root/.cache
COPY app.py nube.py test_app.py ./
RUN useradd -r -u 10002 stt && mkdir -p /modelos && chown stt /modelos
ENV STT_MODELO=$MODELO
USER stt
EXPOSE 8000
HEALTHCHECK --interval=60s --timeout=5s --start-period=20s CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/salud', timeout=4)"
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1", "--no-access-log"]
