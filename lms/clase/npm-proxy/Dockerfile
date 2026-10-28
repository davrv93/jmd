# npm-proxy: la única salida a internet de las aulas (aula_net es interna). Nació solo para el registro de
# npm («bun install»); desde el 20-10-2026 «permitidos» abre todo y desde el 27-10 también el http:// plano.
# Proxy CONNECT (HTTPS de punta a punta: no ve ni guarda nada) con lista de dominios. ~2 MB de RAM.
FROM docker.io/library/alpine:3.22
RUN apk add --no-cache tinyproxy
COPY tinyproxy.conf /etc/tinyproxy/tinyproxy.conf
COPY permitidos /etc/tinyproxy/permitidos
USER nobody
EXPOSE 8888
CMD ["tinyproxy", "-d", "-c", "/etc/tinyproxy/tinyproxy.conf"]
