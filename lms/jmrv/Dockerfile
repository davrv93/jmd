FROM docker.io/library/python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1

RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt ./
RUN pip install -r requirements.txt

COPY server.py studio.py ./
COPY web/ ./web/

# Las claves (Pollinations, Cloudflare) entran por entorno en compose.yaml;
# nunca van en la imagen ni en el repo.
ENV JMRV_HOST=0.0.0.0 JMRV_PORT=8790
EXPOSE 8790

VOLUME ["/app/outputs"]
CMD ["python", "server.py"]
