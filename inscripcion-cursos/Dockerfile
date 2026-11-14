# Se construye en el servidor con el binario ya compilado (GOOS=linux GOARCH=amd64 CGO_ENABLED=0).
FROM alpine:3.22
COPY inscripcion /inscripcion
USER 65534:65534
ENV INSCRIPCION_DATOS=/datos PORT=18650
EXPOSE 18650
ENTRYPOINT ["/inscripcion"]
