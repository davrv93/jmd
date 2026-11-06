package httpapi

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

var veoMP4 = append([]byte{0, 0, 0, 24, 'f', 't', 'y', 'p'}, bytes.Repeat([]byte{7}, 200)...)

// veoEnv deja la actividad de Veo en la lección de prueba y sustituye al proveedor.
func veoEnv(t *testing.T, generar func(prompt string) ([]byte, bool, error)) *env {
	e := newEnvRepaso(t)
	escena, real := veoEscena, veoGenerar
	veoEscena = repasoEscena
	veoGenerar = func(_ context.Context, _ *http.Client, _, prompt, _ string) ([]byte, bool, error) {
		return generar(prompt)
	}
	t.Setenv("OPENROUTER_API_KEY", "prueba")
	t.Setenv("LMS_VEO_TOPE", "")
	t.Setenv("LMS_VEO_TOPE_TOTAL", "")
	t.Cleanup(func() {
		veoEscena, veoGenerar = escena, real
		veoLive.Lock()
		veoLive.trabajos = make(map[string]*veoTrabajo)
		veoLive.Unlock()
	})
	return e
}

func veoPedir(metodo, ruta, cuerpo string, valores map[string]string) *http.Request {
	r := httptest.NewRequest(metodo, "/api/v1/live/de-02/veo"+ruta, strings.NewReader(cuerpo))
	r.SetPathValue("lesson", "de-02")
	for k, v := range valores {
		r.SetPathValue(k, v)
	}
	return r
}

func veoJSON(t *testing.T, w *httptest.ResponseRecorder) map[string]any {
	t.Helper()
	out := map[string]any{}
	if err := json.Unmarshal(w.Body.Bytes(), &out); err != nil {
		t.Fatal(err, w.Body.String())
	}
	return out
}

// veoGenera pide un video y espera a que el trabajo termine; devuelve el código HTTP y el id.
func veoGenera(t *testing.T, e *env, p *Principal) (int, string) {
	t.Helper()
	w := httptest.NewRecorder()
	e.s.liveVeoCrear(w, veoPedir("POST", "", `{"prompt":"un colibrí frente a una flor roja","formato":"9:16"}`, nil), p)
	if w.Code != 202 {
		return w.Code, ""
	}
	id := veoJSON(t, w)["id"].(string)
	for i := 0; i < 400; i++ {
		veoLive.Lock()
		estado := veoLive.trabajos[id].Estado
		veoLive.Unlock()
		if estado != "generando" {
			return 202, id
		}
		time.Sleep(5 * time.Millisecond)
	}
	t.Fatal("el trabajo no terminó")
	return 0, ""
}

func veoCuentaDe(t *testing.T, e *env, p *Principal) map[string]any {
	t.Helper()
	w := httptest.NewRecorder()
	e.s.liveVeoCuenta(w, veoPedir("GET", "", "", nil), p)
	if w.Code != 200 {
		t.Fatal(w.Code, w.Body.String())
	}
	return veoJSON(t, w)
}

func TestVeoTopePorAlumnoYAmpliacion(t *testing.T) {
	e := veoEnv(t, func(string) ([]byte, bool, error) { return veoMP4, true, nil })
	ana := &Principal{ID: "ana", Name: "Ana", Cohorts: []string{"c1"}}
	profe := &Principal{ID: "profe", Name: "Profe", Roles: []string{"instructor"}, Cohorts: []string{"c1"}}

	if c := veoCuentaDe(t, e, ana); c["usados"] != 0.0 || c["limite"] != 3.0 || c["quedan"] != 3.0 || c["solicitud"] != false {
		t.Fatal("cuenta inicial", c)
	}
	var id string
	for i := 0; i < 3; i++ {
		code, nuevo := veoGenera(t, e, ana)
		if code != 202 {
			t.Fatal("intento", i, code)
		}
		id = nuevo
	}
	if code, _ := veoGenera(t, e, ana); code != 429 {
		t.Fatal("el cuarto intento debía dar 429 y dio", code)
	}
	if c := veoCuentaDe(t, e, ana); c["usados"] != 3.0 || c["quedan"] != 0.0 {
		t.Fatal("cuenta agotada", c)
	}

	// El video es solo del alumno que lo generó.
	w := httptest.NewRecorder()
	e.s.liveVeoMP4(w, veoPedir("GET", "/"+id+"/mp4", "", map[string]string{"id": id}), ana)
	if w.Code != 200 || !bytes.Equal(w.Body.Bytes(), veoMP4) || w.Header().Get("Content-Type") != "video/mp4" {
		t.Fatal("mp4 propio", w.Code)
	}
	w = httptest.NewRecorder()
	e.s.liveVeoMP4(w, veoPedir("GET", "/"+id+"/mp4", "", map[string]string{"id": id}), &Principal{ID: "beto", Cohorts: []string{"c1"}})
	if w.Code != 404 {
		t.Fatal("otro alumno vio el video", w.Code)
	}

	// Pide ampliación: el instructor la ve y la concede.
	w = httptest.NewRecorder()
	e.s.liveVeoSolicitar(w, veoPedir("POST", "/ampliar", "", nil), ana)
	if w.Code != 200 || veoCuentaDe(t, e, ana)["solicitud"] != true {
		t.Fatal("solicitud", w.Code)
	}
	w = httptest.NewRecorder()
	e.s.liveVeoSolicitudes(w, veoPedir("GET", "/solicitudes", "", nil), profe)
	lista := veoJSON(t, w)
	fila := lista["alumnos"].([]any)[0].(map[string]any)
	if w.Code != 200 || lista["total"] != 3.0 || fila["alumno"] != "ana" || fila["nombre"] != "Ana" || fila["pidio"] != true || fila["usados"] != 3.0 {
		t.Fatal("solicitudes", lista)
	}
	for cuerpo, esperado := range map[string]int{`{"extra":0}`: 400, `{"extra":11}`: 400, `{"extra":2}`: 200} {
		w = httptest.NewRecorder()
		e.s.liveVeoAmpliar(w, veoPedir("POST", "/ampliar/ana", cuerpo, map[string]string{"alumno": "ana"}), profe)
		if w.Code != esperado {
			t.Fatal("ampliar", cuerpo, w.Code)
		}
	}
	w = httptest.NewRecorder()
	e.s.liveVeoAmpliar(w, veoPedir("POST", "/ampliar/nadie", `{"extra":2}`, map[string]string{"alumno": "nadie"}), profe)
	if w.Code != 404 {
		t.Fatal("amplió a un alumno que no existe", w.Code)
	}
	if c := veoCuentaDe(t, e, ana); c["limite"] != 5.0 || c["quedan"] != 2.0 || c["solicitud"] != false {
		t.Fatal("tras ampliar", c)
	}
	if code, _ := veoGenera(t, e, ana); code != 202 {
		t.Fatal("tras ampliar debía generar", code)
	}

	// La cuenta vive en la base: sobrevive a que se pierdan los trabajos en memoria (un reinicio).
	veoLive.Lock()
	veoLive.trabajos = make(map[string]*veoTrabajo)
	veoLive.Unlock()
	if c := veoCuentaDe(t, e, ana); c["usados"] != 4.0 || c["quedan"] != 1.0 {
		t.Fatal("la cuenta no sobrevivió", c)
	}
}

func TestVeoTopeDeClaseRechazoYActividad(t *testing.T) {
	falla := errors.New("rechazado")
	e := veoEnv(t, func(string) ([]byte, bool, error) { return nil, false, falla })
	ana := &Principal{ID: "ana", Name: "Ana", Cohorts: []string{"c1"}}
	beto := &Principal{ID: "beto", Name: "Beto", Cohorts: []string{"c1"}}

	// El proveedor rechazó antes de generar: el intento vuelve al alumno.
	code, id := veoGenera(t, e, ana)
	veoLive.Lock()
	estado, mensaje := veoLive.trabajos[id].Estado, veoLive.trabajos[id].Mensaje
	veoLive.Unlock()
	if code != 202 || estado != "error" || !strings.Contains(mensaje, "no contó") || veoCuentaDe(t, e, ana)["usados"] != 0.0 {
		t.Fatal("rechazo", code, estado, mensaje)
	}

	// Falló después de enviado: se asume costo y el intento cuenta.
	veoGenerar = func(context.Context, *http.Client, string, string, string) ([]byte, bool, error) {
		return nil, true, falla
	}
	if _, _ = veoGenera(t, e, ana); veoCuentaDe(t, e, ana)["usados"] != 1.0 {
		t.Fatal("un fallo con costo debía contar")
	}

	// Tope de clase: con 1 generación en total, el siguiente alumno ya no entra.
	t.Setenv("LMS_VEO_TOPE_TOTAL", "1")
	w := httptest.NewRecorder()
	e.s.liveVeoCrear(w, veoPedir("POST", "", `{"prompt":"una taza de café humeante"}`, nil), beto)
	if w.Code != 429 || veoJSON(t, w)["error"].(map[string]any)["code"] != "limite_clase" {
		t.Fatal("tope de clase", w.Code, w.Body.String())
	}
	if veoCuentaDe(t, e, beto)["clase_agotada"] != true {
		t.Fatal("la cuenta no avisa que la clase se agotó")
	}

	// Prompt inválido y servidor sin llave no gastan intento.
	t.Setenv("LMS_VEO_TOPE_TOTAL", "")
	w = httptest.NewRecorder()
	e.s.liveVeoCrear(w, veoPedir("POST", "", `{"prompt":"corto"}`, nil), beto)
	if w.Code != 400 {
		t.Fatal("prompt corto", w.Code)
	}
	t.Setenv("OPENROUTER_API_KEY", "")
	w = httptest.NewRecorder()
	e.s.liveVeoCrear(w, veoPedir("POST", "", `{"prompt":"una taza de café humeante"}`, nil), beto)
	if w.Code != 503 || veoCuentaDe(t, e, beto)["usados"] != 0.0 {
		t.Fatal("sin llave", w.Code)
	}

	// La actividad solo existe donde está la escena.
	veoEscena = "no-existe"
	w = httptest.NewRecorder()
	e.s.liveVeoCuenta(w, veoPedir("GET", "", "", nil), ana)
	if w.Code != 404 {
		t.Fatal("sin escena", w.Code)
	}
}

func TestVeoProveedor(t *testing.T) {
	pausa := veoPausa
	veoPausa = time.Millisecond
	t.Cleanup(func() { veoPausa = pausa })
	consultas := 0
	responder := func(code int, body string) *http.Response {
		return &http.Response{StatusCode: code, Body: io.NopCloser(strings.NewReader(body))}
	}
	client := &http.Client{Transport: musicaTransporte(func(r *http.Request) (*http.Response, error) {
		if r.URL.Host != "openrouter.ai" || r.Header.Get("Authorization") != "Bearer prueba" {
			t.Fatal("proveedor o autenticación")
		}
		switch {
		case r.Method == "POST" && r.URL.Path == "/api/v1/videos":
			var in map[string]any
			json.NewDecoder(r.Body).Decode(&in)
			if in["model"] != "google/veo-3.1-lite" || in["duration"] != 4.0 || in["generate_audio"] != false || in["aspect_ratio"] != "9:16" || in["resolution"] != "720p" {
				t.Fatal(in)
			}
			return responder(200, `{"id":"v1","status":"pending"}`), nil
		case r.URL.Path == "/api/v1/videos/v1":
			consultas++
			if consultas < 2 {
				return responder(200, `{"id":"v1","status":"in_progress"}`), nil
			}
			return responder(200, `{"id":"v1","status":"completed"}`), nil
		case r.URL.Path == "/api/v1/videos/v1/content":
			return &http.Response{StatusCode: 200, Body: io.NopCloser(bytes.NewReader(veoMP4))}, nil
		}
		t.Fatal("ruta inesperada", r.URL.Path)
		return nil, nil
	})}
	t.Setenv("LMS_VEO_MODELO", "")
	t.Setenv("LMS_VEO_SEGUNDOS", "")
	video, cobrado, err := generarVeo(context.Background(), client, "prueba", "un colibrí", "9:16")
	if err != nil || !cobrado || !bytes.Equal(video, veoMP4) || consultas != 2 {
		t.Fatal(err, cobrado, consultas)
	}
	rechaza := &http.Client{Transport: musicaTransporte(func(*http.Request) (*http.Response, error) {
		return responder(402, `{"error":{"message":"sin saldo"}}`), nil
	})}
	if _, cobrado, err = generarVeo(context.Background(), rechaza, "prueba", "un colibrí", "9:16"); err == nil || cobrado {
		t.Fatal("un rechazo al enviar no debe contar como cobrado")
	}
}
