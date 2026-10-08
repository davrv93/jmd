package httpapi

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
)

// apiError es el formato de error del contrato: {"error": {"code", "message"}}.
type apiError struct {
	Error struct {
		Code    string `json:"code"`
		Message string `json:"message"`
	} `json:"error"`
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(status)
	enc := json.NewEncoder(w)
	enc.SetEscapeHTML(false)
	_ = enc.Encode(v)
}

func writeErr(w http.ResponseWriter, status int, code, msg string) {
	var e apiError
	e.Error.Code, e.Error.Message = code, msg
	writeJSON(w, status, e)
}

func badRequest(w http.ResponseWriter, msg string) { writeErr(w, 400, "bad_request", msg) }
func unauthorized(w http.ResponseWriter)           { writeErr(w, 401, "unauthorized", "inicia sesión") }
func forbidden(w http.ResponseWriter)              { writeErr(w, 403, "forbidden", "no tienes permiso") }
func notFound(w http.ResponseWriter, what string)  { writeErr(w, 404, "not_found", what+" no existe") }
func internal(w http.ResponseWriter, err error) {
	writeErr(w, 500, "internal", "error interno: "+err.Error())
}

// maxBody limita el tamaño de las entradas JSON.
const maxBody = 256 << 10

// readJSON decodifica el cuerpo con límite de tamaño y sin campos desconocidos.
func readJSON(w http.ResponseWriter, r *http.Request, v any) bool {
	r.Body = http.MaxBytesReader(w, r.Body, maxBody)
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(v); err != nil {
		var mb *http.MaxBytesError
		switch {
		case errors.As(err, &mb):
			writeErr(w, 413, "too_large", "el cuerpo supera el límite")
		case errors.Is(err, io.EOF):
			badRequest(w, "falta el cuerpo JSON")
		default:
			badRequest(w, "JSON inválido: "+err.Error())
		}
		return false
	}
	return true
}
