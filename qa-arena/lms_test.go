package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

// lmsFalso imita /api/v1/me y /api/v1/lessons/qa-01/progress según la cookie lms_session.
func lmsFalso(t *testing.T, progreso map[string][]string) *httptest.Server {
	t.Helper()
	cuentas := map[string]map[string]any{
		"ana":   {"id": "u1", "email": "ana@upeu.edu.pe", "name": "Ana Pérez", "roles": []string{"student"}, "cohorts": []string{"qa-ia-2"}},
		"profe": {"id": "u2", "email": "profe@jmd.pe", "name": "Instructor", "roles": []string{"instructor"}, "cohorts": []string{}},
	}
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		c, err := r.Cookie("lms_session")
		cuenta, ok := cuentas[strings.TrimSpace(func() string {
			if err != nil {
				return ""
			}
			return c.Value
		}())]
		if !ok {
			w.WriteHeader(401)
			_, _ = w.Write([]byte(`{"error":{"code":"unauthorized","message":"inicia sesión"}}`))
			return
		}
		switch r.URL.Path {
		case "/api/v1/me":
			_ = json.NewEncoder(w).Encode(cuenta)
		case "/api/v1/lessons/qa-01/progress":
			steps := map[string]any{}
			for _, p := range pasos {
				steps[p.ID] = nil
			}
			for _, p := range progreso[c.Value] {
				steps[p] = "2026-11-01T14:00:00Z"
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"steps": steps, "done": len(progreso[c.Value]), "total": len(pasos)})
		default:
			w.WriteHeader(404)
		}
	}))
}

func TestIdentidadDesdeElLMS(t *testing.T) {
	progreso := map[string][]string{"ana": {"ver", "casos"}}
	lms := lmsFalso(t, progreso)
	defer lms.Close()
	s := nuevoServidor("", lms.URL)
	srv := httptest.NewServer(s.rutas())
	defer srv.Close()
	pedir := func(metodo, ruta, cookie string) (int, map[string]any) {
		req, _ := http.NewRequest(metodo, srv.URL+ruta, strings.NewReader("{}"))
		req.Header.Set("Content-Type", "application/json")
		if cookie != "" {
			req.AddCookie(&http.Cookie{Name: "lms_session", Value: cookie})
		}
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatal(err)
		}
		defer resp.Body.Close()
		var out map[string]any
		_ = json.NewDecoder(resp.Body).Decode(&out)
		return resp.StatusCode, out
	}
	if code, _ := pedir("GET", "/api/yo", ""); code != 401 {
		t.Fatalf("sin cookie debía ser 401, fue %d", code)
	}
	if code, _ := pedir("GET", "/api/yo", "intruso"); code != 401 {
		t.Fatalf("cookie inválida debía ser 401, fue %d", code)
	}
	code, out := pedir("GET", "/api/yo", "ana")
	if code != 200 || out["jugador"] == nil || out["jugador"].(map[string]any)["nombre"] != "Ana Pérez" {
		t.Fatalf("alta automática: %d %v", code, out)
	}
	if code, out := pedir("GET", "/api/yo", "ana"); code != 200 || out["jugador"].(map[string]any)["id"] != 1.0 || s.activos() != 1 {
		t.Fatalf("segunda vez debía ser el mismo héroe: %d %v (%d activos)", code, out, s.activos())
	}
	if code, out := pedir("GET", "/api/yo", "profe"); code != 200 || out["staff"] != true || s.activos() != 1 {
		t.Fatalf("staff no compite: %d %v", code, out)
	}
	if code, _ := pedir("POST", "/api/unirse", ""); code != 404 {
		t.Fatalf("no hay alta manual: %d", code)
	}
	// Pasos: los concede el servidor leyendo el progreso con la cookie.
	code, out = pedir("POST", "/api/pasos", "ana")
	if code != 200 || out["nuevos"] != 2.0 || out["jugador"].(map[string]any)["puntos"] != 300.0 {
		t.Fatalf("pasos desde el servidor: %d %v", code, out)
	}
	if code, out := pedir("POST", "/api/pasos", "ana"); code != 200 || out["nuevos"] != 0.0 {
		t.Fatalf("repetir no suma: %d %v", code, out)
	}
	// Refresco periódico: el alumno marca un paso más en el LMS y la arena lo ve sin que recargue.
	progreso["ana"] = append(progreso["ana"], "pom")
	s.refrescarTodos()
	if j := s.jugadorID(1); j.Puntos != 450 {
		t.Fatalf("refresco: %d puntos, se esperaban 450", j.Puntos)
	}
	// Admin: solo staff.
	if code, _ := pedir("GET", "/api/admin/estado", "ana"); code != 401 {
		t.Fatalf("alumno no es admin: %d", code)
	}
	if code, _ := pedir("GET", "/api/admin/estado", ""); code != 401 {
		t.Fatalf("anónimo no es admin: %d", code)
	}
	if code, _ := pedir("GET", "/api/admin/estado", "profe"); code != 200 {
		t.Fatalf("instructor sí es admin: %d", code)
	}
	// Sesión que caduca: el refresco la descarta.
	delete(progreso, "ana")
	s.cacheMu.Lock()
	s.cache = map[string]entradaCache{}
	s.cacheMu.Unlock()
	lmsCaido := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(401) }))
	s.lms = lmsCaido.URL
	s.refrescarTodos()
	lmsCaido.Close()
	if _, ok := s.sesiones[1]; ok {
		t.Error("tras el 401 la cookie debía descartarse")
	}
	_ = time.Second
}
