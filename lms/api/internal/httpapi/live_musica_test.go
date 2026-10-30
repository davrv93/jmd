package httpapi

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

type musicaTransporte func(*http.Request) (*http.Response, error)

func (f musicaTransporte) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }
func TestMusicaProveedorYStream(t *testing.T) {
	mp3 := append([]byte("ID3"), bytes.Repeat([]byte{42}, 200)...)
	encoded := base64.StdEncoding.EncodeToString(mp3)
	event := func(data string) string {
		b, _ := json.Marshal(map[string]any{"choices": []any{map[string]any{"delta": map[string]any{"audio": map[string]string{"data": data}}}}})
		return "data: " + string(b) + "\n\n"
	}
	stream := event(encoded[:40]) + event(encoded[40:]) + "data: [DONE]\n\n"
	client := &http.Client{Transport: musicaTransporte(func(r *http.Request) (*http.Response, error) {
		if r.URL.Host != "openrouter.ai" || r.Header.Get("Authorization") != "Bearer prueba" {
			t.Fatal("proveedor o autenticación")
		}
		var in map[string]any
		json.NewDecoder(r.Body).Decode(&in)
		if in["model"] != musicaModelo || in["stream"] != true {
			t.Fatal(in)
		}
		return &http.Response{StatusCode: 200, Body: io.NopCloser(strings.NewReader(stream))}, nil
	})}
	got, err := generarMusica(context.Background(), client, "prueba", "ska instrumental")
	if err != nil || !bytes.Equal(got, mp3) {
		t.Fatal(err)
	}
	for _, bad := range []string{event(encoded), "data: {\"error\":{\"message\":\"falló\"}}\n\n", event(base64.StdEncoding.EncodeToString([]byte("no es audio"))) + "data: [DONE]\n\n"} {
		if _, err := leerMusicaSSE(strings.NewReader(bad)); err == nil {
			t.Fatal("aceptó pista inválida o interrumpida")
		}
	}
}
func TestMusicaPrivacidadDescargaYLimite(t *testing.T) {
	e := newEnvRepaso(t)
	p := &Principal{ID: "ana", Cohorts: []string{"c1"}}
	id := "pista-prueba"
	mp3 := append([]byte("ID3"), bytes.Repeat([]byte{42}, 200)...)
	musicaLive.Lock()
	musicaLive.trabajos = map[string]*musicaTrabajo{id: {ID: id, Alumno: "ana", Leccion: "de-02", Estado: "listo", Creado: time.Now(), Audio: mp3}}
	musicaLive.dia = time.Now().UTC().Format("2006-01-02")
	musicaLive.intentos = map[string]int{"ana": 3}
	musicaLive.Unlock()
	t.Cleanup(func() {
		musicaLive.Lock()
		defer musicaLive.Unlock()
		musicaLive.trabajos = make(map[string]*musicaTrabajo)
		musicaLive.intentos = make(map[string]int)
	})
	req := func(method, body string) *http.Request {
		r := httptest.NewRequest(method, "/api/v1/live/de-02/musica/"+id+"/mp3?descargar=1", strings.NewReader(body))
		r.SetPathValue("lesson", "de-02")
		r.SetPathValue("id", id)
		return r
	}
	w := httptest.NewRecorder()
	e.s.liveMusicaMP3(w, req("GET", ""), p)
	if w.Code != 200 || !bytes.Equal(w.Body.Bytes(), mp3) || !strings.Contains(w.Header().Get("Content-Disposition"), "attachment") {
		t.Fatal(w.Code, w.Header())
	}
	w = httptest.NewRecorder()
	r := req("GET", "")
	r.Header.Set("Range", "bytes=0-9")
	e.s.liveMusicaMP3(w, r, p)
	if w.Code != 206 || w.Body.Len() != 10 {
		t.Fatal("Range", w.Code)
	}
	w = httptest.NewRecorder()
	e.s.liveMusicaMP3(w, req("GET", ""), &Principal{ID: "otro", Cohorts: []string{"c1"}})
	if w.Code != 404 {
		t.Fatal("filtró audio", w.Code)
	}
	w = httptest.NewRecorder()
	e.s.liveMusicaEstado(w, req("GET", ""), &Principal{ID: "otro", Cohorts: []string{"c1"}})
	if w.Code != 404 {
		t.Fatal("filtró estado", w.Code)
	}
	t.Setenv("OPENROUTER_API_KEY", "prueba")
	w = httptest.NewRecorder()
	e.s.liveMusicaCrear(w, req("POST", `{"prompt":"ska pop instrumental"}`), p)
	if w.Code != 429 {
		t.Fatal("no limita", w.Code, w.Body)
	}
	musicaLive.Lock()
	musicaLive.trabajos[id].Estado = "generando"
	musicaLive.Unlock()
	w = httptest.NewRecorder()
	e.s.liveMusicaCrear(w, req("POST", `{"prompt":"ska pop instrumental"}`), p)
	if w.Code != 202 || !strings.Contains(w.Body.String(), id) {
		t.Fatal("no recupera trabajo", w.Code)
	}
	musicaLive.Lock()
	musicaLive.trabajos[id].Creado = time.Now().Add(-3 * time.Hour)
	musicaLive.Unlock()
	w = httptest.NewRecorder()
	e.s.liveMusicaEstado(w, req("GET", ""), p)
	if w.Code != 404 {
		t.Fatal("no expira", w.Code)
	}
	if got := e.call("POST", "/api/v1/live/de-02/musica", "", false, map[string]string{"prompt": "ska pop instrumental"}, ""); got.code != 401 {
		t.Fatal("sin autenticación", got.code)
	}
}

func TestMusicaInstructorGeneraYRecupera(t *testing.T) {
	e := newEnvRepaso(t)
	p := &Principal{ID: "profe-musica", Roles: []string{"instructor"}, Cohorts: []string{"c1"}}
	t.Setenv("OPENROUTER_API_KEY", "prueba")
	mp3 := append([]byte("ID3"), bytes.Repeat([]byte{42}, 200)...)
	payload, _ := json.Marshal(map[string]any{"choices": []any{map[string]any{"delta": map[string]any{"audio": map[string]string{"data": base64.StdEncoding.EncodeToString(mp3)}}}}})
	old := http.DefaultClient
	http.DefaultClient = &http.Client{Transport: musicaTransporte(func(r *http.Request) (*http.Response, error) {
		return &http.Response{StatusCode: 200, Body: io.NopCloser(strings.NewReader("data: " + string(payload) + "\n\ndata: [DONE]\n\n"))}, nil
	})}
	defer func() { http.DefaultClient = old }()
	r := httptest.NewRequest("POST", "/", strings.NewReader(`{"prompt":"ska instrumental para mi taller"}`))
	r.SetPathValue("lesson", "de-02")
	w := httptest.NewRecorder()
	e.s.liveMusicaCrear(w, r, p)
	if w.Code != 202 {
		t.Fatal(w.Code, w.Body)
	}
	var out map[string]string
	json.Unmarshal(w.Body.Bytes(), &out)
	id := out["id"]
	if len(id) != 32 {
		t.Fatal(out)
	}
	deadline := time.Now().Add(time.Second)
	for time.Now().Before(deadline) {
		musicaLive.Lock()
		j := musicaLive.trabajos[id]
		state := j.Estado
		got := j.Audio
		musicaLive.Unlock()
		if state == "listo" {
			if !bytes.Equal(got, mp3) {
				t.Fatal("audio distinto")
			}
			musicaLive.Lock()
			delete(musicaLive.trabajos, id)
			delete(musicaLive.intentos, p.ID)
			musicaLive.Unlock()
			return
		}
		time.Sleep(time.Millisecond)
	}
	t.Fatal("no terminó la generación del instructor")
}
