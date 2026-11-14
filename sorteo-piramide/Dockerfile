# Se construye en el servidor con el binario ya compilado (GOOS=linux GOARCH=amd64 CGO_ENABLED=0).
FROM alpine:3.22
COPY sorteo-piramide /sorteo-piramide
USER 65534:65534
ENV PIRAMIDE_DATOS=/datos PORT=18680
EXPOSE 18680
ENTRYPOINT ["/sorteo-piramide"]
