package main

// Cliente del API del LMS (lms/api/internal/httpapi). Solo usa rutas que ya existen:
//
//	POST /api/v1/auth/login             {email, password, label}             → {token}      (cuenta admin del instructor)
//	GET  /api/v1/auth/config                                                  → {register}  (¿hay LMS_INVITE_CODE?)
//	POST /api/v1/auth/register          {email, name, password, invite_code} → 201 {token, user{id…}} · 409 si ya existe
//	POST /api/v1/auth/logout            (Bearer del alumno recién creado: se cierra esa sesión que nadie usará)
//	GET  /api/v1/admin/users                                                  → [{id, email, name, roles, cohorts…}]
//	PUT  /api/v1/admin/users/{id}       {roles, cohorts}                      (reemplaza ambos: hay que mandar los que ya tenía)
//	GET  /api/v1/live/{lesson}/accesos  (staff) enlaces firmados por el LMS: sirven para comprobar la semilla

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"
)

var errYaExiste = errors.New("ya hay una cuenta con ese correo")

type Usuario struct {
	ID      string   `json:"id"`
	Email   string   `json:"email"`
	Name    string   `json:"name"`
	Roles   []string `json:"roles"`
	Cohorts []string `json:"cohorts"`
}

type LMS struct {
	Base       string // http://127.0.0.1:8080
	Correo     string // cuenta admin
	Clave      string
	Invitacion string // LMS_INVITE_CODE del LMS
	// Puente: grupo con inscripción abierta en el LMS (LMS_INSCRIPCION) por el que se crea la cuenta cuando el
	// LMS no tiene LMS_INVITE_CODE. Justo después, Asignar deja a la persona solo en el grupo del curso.
	Puente string
	HC     *http.Client

	mu    sync.Mutex
	token string
}

func (l *LMS) pedir(ctx context.Context, metodo, ruta string, cuerpo any, token string, cab map[string]string, salida any) (int, error) {
	var rd io.Reader
	if cuerpo != nil {
		b, err := json.Marshal(cuerpo)
		if err != nil {
			return 0, err
		}
		rd = bytes.NewReader(b)
	}
	req, err := http.NewRequestWithContext(ctx, metodo, strings.TrimRight(l.Base, "/")+ruta, rd)
	if err != nil {
		return 0, err
	}
	if cuerpo != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	for k, v := range cab {
		req.Header.Set(k, v)
	}
	res, err := l.HC.Do(req)
	if err != nil {
		return 0, err
	}
	defer res.Body.Close()
	b, _ := io.ReadAll(io.LimitReader(res.Body, 8<<20))
	if salida != nil && res.StatusCode/100 == 2 {
		if err := json.Unmarshal(b, salida); err != nil {
			return res.StatusCode, fmt.Errorf("%s %s: respuesta ilegible: %w", metodo, ruta, err)
		}
	}
	return res.StatusCode, nil
}

func (l *LMS) login(ctx context.Context) (string, error) {
	var out struct {
		Token string `json:"token"`
	}
	code, err := l.pedir(ctx, "POST", "/api/v1/auth/login", map[string]string{"email": l.Correo, "password": l.Clave, "label": "rsg-ingreso"}, "", nil, &out)
	if err != nil {
		return "", err
	}
	if code != 200 || out.Token == "" {
		return "", fmt.Errorf("login admin del LMS: HTTP %d", code)
	}
	return out.Token, nil
}

// admin hace una llamada con la sesión de administrador; si la sesión venció (401), entra de nuevo una vez.
func (l *LMS) admin(ctx context.Context, metodo, ruta string, cuerpo, salida any) (int, error) {
	for intento := 0; intento < 2; intento++ {
		l.mu.Lock()
		if l.token == "" {
			t, err := l.login(ctx)
			if err != nil {
				l.mu.Unlock()
				return 0, err
			}
			l.token = t
		}
		tok := l.token
		l.mu.Unlock()
		code, err := l.pedir(ctx, metodo, ruta, cuerpo, tok, nil, salida)
		if err != nil {
			return code, err
		}
		if code == 401 {
			l.mu.Lock()
			if l.token == tok {
				l.token = ""
			}
			l.mu.Unlock()
			continue
		}
		return code, nil
	}
	return 401, errors.New("el LMS rechaza la cuenta admin")
}

// RegistroAbierto: el registro propio del LMS solo existe si tiene LMS_INVITE_CODE.
func (l *LMS) RegistroAbierto(ctx context.Context) (bool, error) {
	if l.Puente != "" {
		code, err := l.pedir(ctx, "GET", "/api/v1/inscripcion/"+url.PathEscape(l.Puente), nil, "", nil, nil)
		if err != nil {
			return false, err
		}
		return code == 200, nil
	}
	var out struct {
		Register bool `json:"register"`
	}
	code, err := l.pedir(ctx, "GET", "/api/v1/auth/config", nil, "", nil, &out)
	if err != nil {
		return false, err
	}
	if code != 200 {
		return false, fmt.Errorf("auth/config: HTTP %d", code)
	}
	return out.Register, nil
}

func (l *LMS) Usuarios(ctx context.Context) ([]Usuario, error) {
	var us []Usuario
	code, err := l.admin(ctx, "GET", "/api/v1/admin/users", nil, &us)
	if err != nil {
		return nil, err
	}
	if code != 200 {
		return nil, fmt.Errorf("admin/users: HTTP %d", code)
	}
	return us, nil
}

// Buscar devuelve la cuenta con ese correo (sin distinguir mayúsculas) o nil si no hay.
func (l *LMS) Buscar(ctx context.Context, campo func(Usuario) bool) (*Usuario, error) {
	us, err := l.Usuarios(ctx)
	if err != nil {
		return nil, err
	}
	for i := range us {
		if campo(us[i]) {
			return &us[i], nil
		}
	}
	return nil, nil
}

func porCorreo(correo string) func(Usuario) bool {
	return func(u Usuario) bool { return strings.EqualFold(strings.TrimSpace(u.Email), correo) }
}

func porID(id string) func(Usuario) bool {
	return func(u Usuario) bool { return u.ID == id }
}

// Registrar crea la cuenta de alumno por el registro normal del LMS, con una contraseña larga al azar que
// nadie ve (el alumno entra por su enlace). La sesión que abre el registro se cierra en el acto.
// ip va en X-Forwarded-For: el LMS limita el registro por IP y así no se bloquea a todos por venir de 127.0.0.1.
func (l *LMS) Registrar(ctx context.Context, nombre, correo, ip string) (*Usuario, error) {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return nil, err
	}
	var out struct {
		Token string  `json:"token"`
		User  Usuario `json:"user"`
	}
	cab := map[string]string{}
	if ip != "" {
		cab["X-Forwarded-For"] = ip
	}
	ruta, cuerpo := "/api/v1/auth/register", map[string]string{"email": correo, "name": nombre, "password": hex.EncodeToString(buf), "invite_code": l.Invitacion}
	if l.Puente != "" {
		ruta, cuerpo = "/api/v1/inscripcion/"+url.PathEscape(l.Puente), map[string]string{"email": correo, "name": nombre, "password": hex.EncodeToString(buf)}
	}
	code, err := l.pedir(ctx, "POST", ruta, cuerpo, "", cab, &out)
	if err != nil {
		return nil, err
	}
	switch {
	case code == 409:
		return nil, errYaExiste
	case code == 429:
		return nil, errLimiteLMS
	case code != 201 || out.User.ID == "":
		return nil, fmt.Errorf("auth/register: HTTP %d", code)
	}
	if out.Token != "" {
		if c, err := l.pedir(ctx, "POST", "/api/v1/auth/logout", nil, out.Token, nil, nil); err != nil || c != 200 {
			logf("aviso: no se cerró la sesión del registro de %s (HTTP %d, %v)", out.User.ID, c, err)
		}
	}
	return &out.User, nil
}

var errLimiteLMS = errors.New("el LMS pide esperar un minuto")

// Asignar reemplaza roles y grupos de la cuenta (el LMS no tiene «agregar»: se manda la lista completa).
func (l *LMS) Asignar(ctx context.Context, id string, roles, cohorts []string) error {
	code, err := l.admin(ctx, "PUT", "/api/v1/admin/users/"+url.PathEscape(id), map[string][]string{"roles": roles, "cohorts": cohorts}, nil)
	if err != nil {
		return err
	}
	if code != 200 {
		return fmt.Errorf("admin/users/%s: HTTP %d", id, code)
	}
	return nil
}

// ComprobarSemilla pide al LMS los enlaces que él mismo firma para los alumnos de una lección y verifica uno
// con nuestra semilla. "ok", "distinta" o "sin-alumnos" (no hay con qué comparar). Los enlaces recibidos no se
// guardan ni se registran.
func (l *LMS) ComprobarSemilla(ctx context.Context, semilla []byte, lecciones []string) (string, error) {
	for _, lec := range lecciones {
		var out struct {
			Alumnos []struct {
				URL string `json:"url"`
			} `json:"alumnos"`
		}
		code, err := l.admin(ctx, "GET", "/api/v1/live/"+url.PathEscape(lec)+"/accesos", nil, &out)
		if err != nil {
			return "", err
		}
		if code == 503 {
			return "lms-sin-semilla", nil // el LMS no puede firmar enlaces: los nuestros tampoco abrirían
		}
		if code != 200 || len(out.Alumnos) == 0 {
			continue
		}
		u, err := url.Parse(out.Alumnos[0].URL)
		if err != nil {
			return "", err
		}
		if firmaValida(semilla, u.Query().Get("t")) {
			return "ok", nil
		}
		return "distinta", nil
	}
	return "sin-alumnos", nil
}

func cliente() *http.Client { return &http.Client{Timeout: 20 * time.Second} }
