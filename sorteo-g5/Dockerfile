# Se construye en el servidor con el binario ya compilado (GOOS=linux GOARCH=amd64 CGO_ENABLED=0).
FROM alpine:3.22
COPY sorteo /sorteo
USER 65534:65534
ENV SORTEO_DATOS=/datos PORT=18550
ENTRYPOINT ["/sorteo"]
