# Se construye en el servidor con el binario ya compilado (GOOS=linux GOARCH=amd64 CGO_ENABLED=0).
FROM alpine:3.22
COPY sorteo-colibri /sorteo-colibri
USER 65534:65534
ENV COLIBRI_DATOS=/datos PORT=18665
EXPOSE 18665
ENTRYPOINT ["/sorteo-colibri"]
