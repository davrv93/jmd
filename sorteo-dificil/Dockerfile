# Se construye en el servidor con el binario ya compilado (GOOS=linux GOARCH=amd64 CGO_ENABLED=0).
FROM alpine:3.22
COPY sorteo-dificil /sorteo-dificil
USER 65534:65534
ENV GACHAPON_DATOS=/datos PORT=18700
EXPOSE 18700
ENTRYPOINT ["/sorteo-dificil"]
