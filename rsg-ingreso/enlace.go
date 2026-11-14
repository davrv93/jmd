package main

// Enlace de acceso del LMS (lms/api/internal/httpapi/live_instructor.go). El token es
//
//	base64url(sub) + "." + vence_unix + "." + hex(HMAC_SHA256(clave, sub + "\x00" + vence))[:40]
//
// con clave = HMAC_SHA256(semilla_del_aula, "enlace-de-acceso"). El LMS lo canjea en
// GET /api/v1/auth/enlace?t=<token>&a=<ruta>: abre la sesión de ese usuario y redirige (303).
// Quien tenga el enlace entra como ese alumno hasta que vence: es una credencial.

import (
	"crypto/hmac"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/hex"
	"net/url"
	"strconv"
	"strings"
	"time"
)

func claveEnlace(semilla []byte) []byte {
	m := hmac.New(sha256.New, semilla)
	m.Write([]byte("enlace-de-acceso"))
	return m.Sum(nil)
}

func firmaEnlace(clave []byte, sub string, vence int64) string {
	m := hmac.New(sha256.New, clave)
	m.Write([]byte(sub + "\x00" + strconv.FormatInt(vence, 10)))
	return hex.EncodeToString(m.Sum(nil))[:40]
}

func tokenEnlace(semilla []byte, sub string, vence time.Time) string {
	v := vence.Unix()
	return base64.RawURLEncoding.EncodeToString([]byte(sub)) + "." + strconv.FormatInt(v, 10) + "." + firmaEnlace(claveEnlace(semilla), sub, v)
}

// urlEnlace arma la dirección pública que canjea el token y deja al alumno en «destino».
func urlEnlace(publico, token, destino string) string {
	return strings.TrimRight(publico, "/") + "/api/v1/auth/enlace?t=" + url.QueryEscape(token) + "&a=" + url.QueryEscape(destino)
}

// firmaValida comprueba con nuestra semilla un token que firmó el LMS (sirve para saber si la
// semilla que nos dieron es la buena antes de repartir enlaces que no abrirían).
func firmaValida(semilla []byte, token string) bool {
	partes := strings.Split(token, ".")
	if len(partes) != 3 {
		return false
	}
	raw, err := base64.RawURLEncoding.DecodeString(partes[0])
	if err != nil || len(raw) == 0 {
		return false
	}
	v, err := strconv.ParseInt(partes[1], 10, 64)
	if err != nil {
		return false
	}
	return subtle.ConstantTimeCompare([]byte(partes[2]), []byte(firmaEnlace(claveEnlace(semilla), string(raw), v))) == 1
}
