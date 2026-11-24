package httpapi

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/url"
	"strings"
	"testing"
	"time"

	"github.com/davrv93/jmd/lms/api/internal/auth"
	"github.com/davrv93/jmd/lms/api/internal/store"
)

const claveInternaPrueba = "clave-interna-de-prueba-0123456789abcdef"

func internoPost(t *testing.T, e *env, clave string, body any) (int, map[string]any) {
	t.Helper()
	b, _ := json.Marshal(body)
	req, _ := http.NewRequest("POST", e.srv.URL+"/api/v1/interno/inscripcion", bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	if clave != "" {
		req.Header.Set("X-Interno-Clave", clave)
	}
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	var m map[string]any
	_ = json.NewDecoder(res.Body).Decode(&m)
	return res.StatusCode, m
}

func envInterno(t *testing.T) *env {
	e := newEnv(t)
	e.s.IA = iaConfig("http://deepseek.invalid/anthropic", nil)
	e.s.InternoClave = claveInternaPrueba
	return e
}

func TestInternoSinClaveNoExiste(t *testing.T) {
	e := newEnv(t)
	cuerpo := map[string]any{"email": "a@x.test", "name": "Ana", "cohorts": []string{"c1"}}
	if c, _ := internoPost(t, e, "", cuerpo); c != 404 {
		t.Fatalf("sin clave configurada: %d", c)
	}
	e.s.InternoClave = "corta"
	if c, _ := internoPost(t, e, "corta", cuerpo); c != 404 {
		t.Fatalf("clave corta configurada: %d", c)
	}
	e.s.InternoClave = claveInternaPrueba
	if c, _ := internoPost(t, e, claveInternaPrueba+"x", cuerpo); c != 404 {
		t.Fatalf("clave equivocada: %d", c)
	}
}

func TestInternoCreaCuentaYEnlace(t *testing.T) {
	e := envInterno(t)
	c, m := internoPost(t, e, claveInternaPrueba, map[string]any{"email": " Nuevo@X.test ", "name": " Nuevo  Alumno ",
		"cohorts": []string{"c1", "c1"}, "destino": "/courses/"})
	if c != 200 || m["creado"] != true {
		t.Fatalf("crear: %d %v", c, m)
	}
	u, err := e.db.UserByEmail(t.Context(), "nuevo@x.test")
	if err != nil || u.Name != "Nuevo Alumno" || len(u.Cohorts) != 1 || u.Cohorts[0] != "c1" || len(u.Roles) != 1 || u.Roles[0] != "student" {
		t.Fatalf("cuenta: %+v %v", u, err)
	}
	enlace, _ := m["enlace"].(string)
	if !strings.HasPrefix(enlace, "http://lms.test/api/v1/auth/enlace?t=") || !strings.Contains(enlace, "a=%2Fcourses%2F") {
		t.Fatalf("enlace: %q", enlace)
	}
	vence, _ := time.Parse(time.RFC3339, m["vence"].(string))
	if d := time.Until(vence); d < 6*24*time.Hour || d > 7*24*time.Hour+time.Minute {
		t.Fatalf("vigencia: %v", d)
	}
	// El enlace abre la sesión del alumno.
	q, _ := url.Parse(enlace)
	cli := &http.Client{CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}
	res, err := cli.Get(e.srv.URL + "/api/v1/auth/enlace?" + q.RawQuery)
	if err != nil {
		t.Fatal(err)
	}
	res.Body.Close()
	if res.StatusCode != 303 || res.Header.Get("Location") != "/courses/" {
		t.Fatalf("canje: %d %q", res.StatusCode, res.Header.Get("Location"))
	}
}

func TestInternoSumaGruposSinQuitar(t *testing.T) {
	e := envInterno(t)
	hash, _ := auth.HashPassword("viejo12345")
	if err := e.db.CreateUser(t.Context(), &store.User{Email: "ya@x.test", Name: "Ya Existe", PasswordHash: hash,
		Roles: []string{"student"}, Cohorts: []string{"grupo-viejo"}}); err != nil {
		t.Fatal(err)
	}
	c, m := internoPost(t, e, claveInternaPrueba, map[string]any{"email": "ya@x.test", "name": "Otro Nombre", "cohorts": []string{"c1"}})
	if c != 200 || m["creado"] != false {
		t.Fatalf("existente: %d %v", c, m)
	}
	u, _ := e.db.UserByEmail(t.Context(), "ya@x.test")
	if u.Name != "Ya Existe" || strings.Join(u.Cohorts, ",") != "grupo-viejo,c1" {
		t.Fatalf("debe sumar sin quitar ni renombrar: %+v", u)
	}
	// La contraseña vieja sigue sirviendo.
	e.login("ya@x.test", "viejo12345")
}

func TestInternoTodoONada(t *testing.T) {
	e := envInterno(t)
	c, m := internoPost(t, e, claveInternaPrueba, map[string]any{"email": "b@x.test", "name": "Bea", "cohorts": []string{"c1", "no-existe"}})
	if c != 422 || !strings.Contains(m["message"].(string), "no-existe") {
		t.Fatalf("grupo inexistente: %d %v", c, m)
	}
	if _, err := e.db.UserByEmail(t.Context(), "b@x.test"); err == nil {
		t.Fatal("no debió crear la cuenta")
	}
}

func TestInternoNoFirmaAStaff(t *testing.T) {
	e := envInterno(t)
	c, m := internoPost(t, e, claveInternaPrueba, map[string]any{"email": "profe@x.test", "name": "Profe", "cohorts": []string{"c1"}})
	if c != 409 || m["enlace"] != nil {
		t.Fatalf("staff: %d %v", c, m)
	}
}

func TestInternoDestinoExterno(t *testing.T) {
	e := envInterno(t)
	_, m := internoPost(t, e, claveInternaPrueba, map[string]any{"email": "c@x.test", "name": "Caro", "cohorts": []string{"c1"}, "destino": "//malo.example/"})
	if !strings.HasSuffix(m["enlace"].(string), "&a=%2F") {
		t.Fatalf("destino: %v", m["enlace"])
	}
}
