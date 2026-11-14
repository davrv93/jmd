# Se construye en el servidor con el binario ya compilado (GOOS=linux GOARCH=amd64 CGO_ENABLED=0).
FROM alpine:3.22
COPY sorteo-piramide-hk /sorteo-piramide-hk
USER 65534:65534
ENV PIRAMIDE_DATOS=/datos PORT=18695
EXPOSE 18695
ENTRYPOINT ["/sorteo-piramide-hk"]
