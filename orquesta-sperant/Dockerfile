# Se construye en el servidor con el binario ya compilado (GOOS=linux GOARCH=amd64 CGO_ENABLED=0).
FROM alpine:3.22
COPY orquesta /orquesta
USER 65534:65534
ENV ORQUESTA_DATOS=/datos PORT=18570
ENTRYPOINT ["/orquesta"]
