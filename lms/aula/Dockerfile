# jmd/aula: contenedor de clase. Sin Node, sin modelos, sin socket de Docker.
# amd64 (servidor): rtk musl. arm64 (Mac de pruebas): rtk glibc, por eso gcompat.
ARG JMD_IMAGE=localhost/ai-orchestrator:latest
FROM ${JMD_IMAGE} AS jmd

FROM docker.io/library/alpine:3.22 AS rtk
ARG TARGETARCH
RUN apk add --no-cache curl tar && mkdir -p /out \
 && case "$TARGETARCH" in amd64) T=x86_64-unknown-linux-musl;; arm64) T=aarch64-unknown-linux-gnu;; *) echo "arquitectura no soportada: $TARGETARCH" >&2; exit 1;; esac \
 && curl -fsSL "https://github.com/rtk-ai/rtk/releases/latest/download/rtk-${T}.tar.gz" | tar -xz -C /out \
 && chmod +x /out/rtk

FROM docker.io/library/alpine:3.22
RUN apk add --no-cache curl git python3 py3-pip ca-certificates gcompat libgcc font-dejavu \
 && adduser -D -u 10001 -h /home/alumno alumno \
 && mkdir -p /trabajo /opt/skills-curso /opt/osito /home/alumno/.config/jmd \
 && chown -R alumno:alumno /trabajo /home/alumno
COPY requirements-nube.txt /opt/requirements-nube.txt
RUN python3 -m venv /opt/venv && /opt/venv/bin/pip install --no-cache-dir -r /opt/requirements-nube.txt
COPY --from=jmd /usr/local/bin/jmd /usr/local/bin/jmd
COPY --from=rtk /out/rtk /usr/local/bin/rtk
COPY skills-curso /opt/skills-curso
COPY osito /opt/osito
COPY plantillas /opt/plantillas
COPY AGENTS.md /home/alumno/AGENTS.md
COPY bin/aula /usr/local/bin/aula
RUN chmod -R a+rX /opt/osito /opt/skills-curso /opt/plantillas && chmod +x /usr/local/bin/aula && ln -s /opt/skills-curso /home/alumno/.config/jmd/skills && chown -R alumno:alumno /home/alumno
ENV HOME=/home/alumno PATH=/opt/venv/bin:/usr/local/bin:/usr/bin:/bin TERM=xterm-256color \
    JMD_URL=http://ai-orchestrator:4000 OSITO_PERFIL=nube OSITO_PUERTO=8766 PYTHONDONTWRITEBYTECODE=1
USER alumno
WORKDIR /trabajo
CMD ["sleep", "2147483647"]
