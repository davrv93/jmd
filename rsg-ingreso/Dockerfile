# Se construye en el servidor con el binario ya compilado en la Mac (GOOS=linux GOARCH=amd64 CGO_ENABLED=0).
# Corre con --network host: el LMS publica su puerto solo en 127.0.0.1:8080 del host, y desde la red bridge
# de docker esa dirección no se alcanza (host-gateway llega a la IP del puente, no al loopback).
FROM alpine:3.22
COPY rsg-ingreso /rsg-ingreso
USER 65534:65534
ENV RSG_DATOS=/datos RSG_ADDR=127.0.0.1:18690
ENTRYPOINT ["/rsg-ingreso"]
