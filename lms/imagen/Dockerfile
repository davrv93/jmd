# Servicio de imágenes (sd-turbo en CPU, bf16 con AMX) y de voz (Piper) para las aulas del LIVE.
# Una sola copia del modelo para toda la clase; las aulas piden por HTTP a http://imagen:8000.
FROM python:3.12-slim
ENV PYTHONUNBUFFERED=1 HF_HOME=/modelos PIP_NO_CACHE_DIR=1
WORKDIR /app
COPY requirements.txt .
RUN pip install --extra-index-url https://download.pytorch.org/whl/cpu -r requirements.txt
RUN python -m piper.download_voices es_MX-claude-high --data-dir /voces
COPY app.py .
EXPOSE 8000
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
