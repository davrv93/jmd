# Se construye en el servidor con el binario ya compilado (GOOS=linux GOARCH=amd64 CGO_ENABLED=0).
FROM alpine:3.22
RUN apk add --no-cache tzdata
COPY arena /arena
USER 65534:65534
ENV ARENA_DATOS=/data PORT=18630 TZ=America/Lima
ENTRYPOINT ["/arena"]
