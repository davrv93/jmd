# npm-proxy: la única salida a internet de las aulas, y solo hacia el registro de npm (para «bun install»).
# Proxy CONNECT (HTTPS de punta a punta: no ve ni guarda nada) con lista blanca de dominios. ~2 MB de RAM.
FROM docker.io/library/alpine:3.22
RUN apk add --no-cache tinyproxy
COPY tinyproxy.conf /etc/tinyproxy/tinyproxy.conf
COPY permitidos /etc/tinyproxy/permitidos
USER nobody
EXPOSE 8888
CMD ["tinyproxy", "-d", "-c", "/etc/tinyproxy/tinyproxy.conf"]
