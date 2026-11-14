# Se construye en el servidor con el binario ya compilado (GOOS=linux GOARCH=amd64 CGO_ENABLED=0).
FROM alpine:3.22
COPY sorteo-selva /sorteo-selva
USER 65534:65534
ENV SELVA_DATOS=/datos PORT=18675
EXPOSE 18675
ENTRYPOINT ["/sorteo-selva"]
