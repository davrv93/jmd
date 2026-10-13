# jmd/aula: contenedor de clase. Sin Node, sin modelos, sin socket de Docker.
# amd64 (servidor): rtk musl. arm64 (Mac de pruebas): rtk glibc, por eso gcompat.
# Clase 3 (WhatsApp): Bun (binario musl oficial) para el backend Elysia y psql para la base del alumno.
ARG JMD_IMAGE=localhost/ai-orchestrator:latest
FROM ${JMD_IMAGE} AS jmd

FROM docker.io/library/alpine:3.22 AS rtk
RUN apk add --no-cache curl tar && mkdir -p /out \
 && case "$(uname -m)" in x86_64) T=x86_64-unknown-linux-musl;; aarch64|arm64) T=aarch64-unknown-linux-gnu;; *) echo "arquitectura no soportada: $(uname -m)" >&2; exit 1;; esac \
 && curl -fsSL "https://github.com/rtk-ai/rtk/releases/latest/download/rtk-${T}.tar.gz" | tar -xz -C /out \
 && chmod +x /out/rtk

# Bun fijado a una versión probada (1.4.2, 05-09-2026): el día de clase no se estrena versión.
FROM docker.io/library/alpine:3.22 AS bun
ARG BUN_VERSION=1.4.2
RUN apk add --no-cache curl unzip libstdc++ libgcc && mkdir -p /out \
 && case "$(uname -m)" in x86_64) T=x64-musl;; aarch64|arm64) T=aarch64-musl;; *) echo "arquitectura no soportada: $(uname -m)" >&2; exit 1;; esac \
 && curl -fsSL "https://github.com/oven-sh/bun/releases/download/bun-v${BUN_VERSION}/bun-linux-${T}.zip" -o /tmp/bun.zip \
 && unzip -j /tmp/bun.zip '*/bun' -d /out && chmod +x /out/bun && /out/bun --version
# Respaldo sin red: elysia y el cliente postgres ya instalados en /node_modules. Bun busca node_modules
# subiendo carpetas, así que «import { Elysia } from "elysia"» funciona en /trabajo aunque falle bun install.
RUN mkdir -p /base && cd /base && printf '{"name":"base","private":true}' > package.json \
 && /out/bun add elysia @elysiajs/cors postgres && test -f /base/node_modules/elysia/package.json

FROM docker.io/library/alpine:3.22
RUN apk add --no-cache curl git python3 py3-pip ca-certificates gcompat libgcc libstdc++ font-dejavu postgresql16-client \
 && adduser -D -u 10001 -h /home/alumno alumno \
 && mkdir -p /trabajo /opt/skills-curso /opt/osito /home/alumno/.config/jmd \
 && chown -R alumno:alumno /trabajo /home/alumno
COPY requirements-nube.txt /opt/requirements-nube.txt
RUN python3 -m venv /opt/venv && /opt/venv/bin/pip install --no-cache-dir -r /opt/requirements-nube.txt
COPY --from=jmd /usr/local/bin/jmd /usr/local/bin/jmd
COPY --from=rtk /out/rtk /usr/local/bin/rtk
COPY --from=bun /out/bun /usr/local/bin/bun
COPY --from=bun /base/node_modules /node_modules
COPY skills-curso /opt/skills-curso
COPY osito /opt/osito
COPY plantillas /opt/plantillas
COPY AGENTS.md /home/alumno/AGENTS.md
COPY bin/aula /usr/local/bin/aula
RUN chmod -R a+rX /opt/osito /opt/skills-curso /opt/plantillas /home/alumno/AGENTS.md && chmod 0755 /usr/local/bin/aula && ln -s bun /usr/local/bin/bunx && chmod -R a+rX /node_modules && ln -s /opt/skills-curso /home/alumno/.config/jmd/skills && chown -R alumno:alumno /home/alumno
ENV HOME=/home/alumno PATH=/opt/venv/bin:/usr/local/bin:/usr/bin:/bin TERM=xterm-256color \
    JMD_URL=http://ai-orchestrator:4000 OSITO_PERFIL=nube OSITO_PUERTO=8766 PYTHONDONTWRITEBYTECODE=1 \
    BUN_INSTALL_CACHE_DIR=/trabajo/.bun-cache DO_NOT_TRACK=1
USER alumno
WORKDIR /trabajo
CMD ["sleep", "2147483647"]
