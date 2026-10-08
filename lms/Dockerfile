# LMS: front Qwik (estático) + backend Go en un solo binario. Funciona con Docker y Podman.
#   docker build -t lms -f lms/Dockerfile lms

FROM docker.io/library/node:22-alpine AS web
WORKDIR /src/web
COPY web/package.json web/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY web ./
COPY content /src/content
RUN npm run build

FROM docker.io/library/golang:1.26-alpine AS api
WORKDIR /src/api
COPY api/go.mod api/go.sum ./
RUN go mod download
COPY api ./
COPY --from=web /src/web/dist ./internal/webdist/dist
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /lms ./cmd/lms

FROM docker.io/library/alpine:3.22
RUN adduser -D -H -u 10001 lms && mkdir -p /data /app/content && chown lms /data
COPY --from=api /lms /usr/local/bin/lms
COPY content /app/content
ENV LMS_ADDR=:8080 LMS_DATA_DIR=/data LMS_CONTENT_DIR=/app/content
USER lms
VOLUME /data
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s CMD wget -qO- http://127.0.0.1:8080/api/v1/health || exit 1
ENTRYPOINT ["/usr/local/bin/lms"]
