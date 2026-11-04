# jmd/aula: contenedor de clase. Sin modelos locales y sin socket de Docker.
# amd64 (servidor): rtk musl. arm64 (Mac de pruebas): rtk glibc, por eso gcompat.
# Clase 3 (WhatsApp): Bun (binario musl oficial) para el backend Elysia y psql para la base del alumno.
# Curso DeepSeek Harness: Node >= 24.9 (solo para `dsh`) y DeepSeek Harness 0.2.1-rc.5 PREINSTALADO y FIJADO en
# /opt/dsh (etapa «dsh»). Peso añadido (medido el 31-10-2026, arm64): node 122 MB + /opt/dsh 301 MB = ~423 MB en disco
# (~100 MB comprimido). El aula sale a internet solo por el proxy de la clase (HTTPS_PROXY): dsh lo respeta sin
# ajustes (ver README.md). Memoria: ver «Memoria con dsh» en README.md (recomendado LMS_AULA_MEMORIA=768m).
ARG JMD_IMAGE=localhost/ai-orchestrator:latest
ARG NODE_VERSION=24.22.2
ARG DSH_VERSION=0.2.1-rc.5
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

# DeepSeek Harness fijado (no se estrena versión el día de clase). La etapa falla si Node es < 24.9, que es lo que
# pide dsh. npm instala en /opt/dsh y dsh/instalar.sh lo adelgaza (de 859 MB a 301 MB; ver ese archivo).
FROM docker.io/library/node:${NODE_VERSION}-alpine AS dsh
ARG DSH_VERSION
RUN node -e 'const [a,b]=process.versions.node.split(".").map(Number); console.log("node", process.version); if (a<24 || (a===24 && b<9)) { console.error("dsh pide Node >= 24.9"); process.exit(1) }'
COPY dsh/instalar.sh /tmp/instalar.sh
RUN sh /tmp/instalar.sh "${DSH_VERSION}"

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
# Node solo para `dsh` (musl; usa libstdc++ y libgcc, ya instalados arriba).
COPY --from=dsh /usr/local/bin/node /usr/local/bin/node
COPY --from=dsh /opt/dsh /opt/dsh
COPY dsh/aula.patch.yml /opt/dsh-aula.patch.yml
COPY skills-curso /opt/skills-curso
COPY osito /opt/osito
COPY plantillas /opt/plantillas
# Sistemas de práctica del curso DeepSeek Harness (15 SPA ya construidas: dist/<id>/ + indice.json). `aula sistema` los copia a /trabajo/sistema.
COPY sistemas-practica/dist /opt/sistemas-practica/dist
COPY AGENTS.md /home/alumno/AGENTS.md
COPY bin/aula /usr/local/bin/aula
COPY bin/aula-paso /usr/local/bin/aula-paso
COPY bin/jmrv /usr/local/bin/jmrv
COPY bin/aula-dsh-uso.mjs /usr/local/lib/aula-dsh-uso.mjs
# Con gcompat ya instalado (como en el aula): koffi y node-pty deben cargar sus binarios de musl. Si un día vuelve a
# cargarse uno de glibc, aquí revienta con «Segmentation fault» y el build falla (ver dsh/instalar.sh, pasos 0 y 0b).
RUN node -e 'require("/opt/dsh/node_modules/koffi"); const p=require("/opt/dsh/node_modules/node-pty").spawn("/bin/sh",["-c","echo pty-ok"],{cwd:"/",env:process.env}); let o=""; p.onData(d=>o+=d); p.onExit(()=>{ if(o.trim()!=="pty-ok"){console.error("node-pty no abrió la shell");process.exit(1)} console.log("dsh nativo: koffi y node-pty OK (musl)") })'
RUN chmod a+r /opt/dsh-aula.patch.yml /usr/local/lib/aula-dsh-uso.mjs && chmod -R a+rX /opt/osito /opt/skills-curso /opt/plantillas /opt/sistemas-practica /home/alumno/AGENTS.md && chmod 0755 /usr/local/bin/aula /usr/local/bin/aula-paso /usr/local/bin/jmrv && ln -s bun /usr/local/bin/bunx && ln -s /opt/dsh/node_modules/@deepseek-ai/dsh/lib/bin.js /usr/local/bin/dsh && chmod -R a+rX /node_modules && ln -s /opt/skills-curso /home/alumno/.config/jmd/skills && chown -R alumno:alumno /home/alumno
# DeepSeek Harness corre cada comando del agente con «bash -c»: sin bash, toda herramienta falla con «spawn bash ENOENT».
RUN apk add --no-cache bash
ENV HOME=/home/alumno PATH=/opt/venv/bin:/usr/local/bin:/usr/bin:/bin TERM=xterm-256color \
    JMD_URL=http://ai-orchestrator:4000 OSITO_PERFIL=nube OSITO_PUERTO=8766 PYTHONDONTWRITEBYTECODE=1 \
    JMRV_URL=http://jmrv:8790 \
    BUN_INSTALL_CACHE_DIR=/trabajo/.bun-cache DO_NOT_TRACK=1 \
    DSH_TELEMETRY_DISABLED=1 DSH_TELEMETRY_MODE=DISABLED
USER alumno
WORKDIR /trabajo
CMD ["sleep", "2147483647"]
