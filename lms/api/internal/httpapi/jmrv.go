package httpapi

import (
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"
	"time"
)

// JMRV embebido: el Image Studio corre como servicio propio (compose: jmrv) y el
// LMS lo publica en /jmrv/ con la sesión del alumno como llave. Sin sondeo: el
// visor lo muestra en un iframe vivo. Sin JMRV configurado responde 503.

const maxJMRVBody = 20 << 20 // 20 MB (subidas de referencia/cuadros)

// jmrvProxy: /jmrv/ y todo lo que cuelga (solo usuarios con sesión).
func (s *Server) jmrvProxy(w http.ResponseWriter, r *http.Request, p *Principal) {
	base := strings.TrimRight(s.JmrvURL, "/")
	if base == "" {
		writeErr(w, 503, "sin_jmrv", "el estudio de imágenes no está configurado en este servidor")
		return
	}
	if r.Header.Get("Upgrade") != "" {
		writeErr(w, 400, "sin_websocket", "JMRV no usa WebSocket")
		return
	}
	resto := strings.TrimPrefix(strings.TrimPrefix(r.URL.Path, "/jmrv/"), "/jmrv")
	resto = strings.TrimPrefix(resto, "/")
	if strings.Contains(resto, "..") {
		notFound(w, "la ruta")
		return
	}
	destino, err := url.Parse(base + "/" + resto)
	if err != nil || destino.Host == "" {
		internal(w, err)
		return
	}
	destino.RawQuery = r.URL.RawQuery
	r.Body = http.MaxBytesReader(w, r.Body, maxJMRVBody)
	// El middleware general pone DENY; aquí el iframe es del mismo origen.
	w.Header().Set("X-Frame-Options", "SAMEORIGIN")
	proxy := &httputil.ReverseProxy{
		Rewrite: func(pr *httputil.ProxyRequest) {
			pr.Out.URL = destino
			pr.Out.Host = destino.Host
			pr.Out.Header.Del("Cookie")
			pr.Out.Header.Del("Authorization")
		},
		Transport: &http.Transport{
			Proxy:                 nil,
			DisableKeepAlives:     true,
			ResponseHeaderTimeout: 300 * time.Second,
		},
		FlushInterval: -1,
		ErrorHandler: func(w http.ResponseWriter, _ *http.Request, err error) {
			if ne, ok := err.(net.Error); ok && ne.Timeout() {
				writeErr(w, 504, "jmrv_lento", "JMRV tardó demasiado; intenta de nuevo")
				return
			}
			writeErr(w, 503, "jmrv_apagado", "el estudio de imágenes no responde")
		},
	}
	proxy.ServeHTTP(w, r)
}
