// lms: backend del LMS de programación agéntica. API REST (contrato v1), login y front.
//
// Configuración por variables de entorno (ver lms/.env.example):
//
//	LMS_ADDR            :8080
//	LMS_DATA_DIR        ./data            (lms.db y badge-key.json, clave Ed25519 de las insignias)
//	LMS_CONTENT_DIR     ../content        cursos, sesiones y tareas (YAML + Markdown)
//	LMS_PUBLIC_URL      http://localhost:8080
//	LMS_ADMIN_EMAIL / LMS_ADMIN_PASSWORD / LMS_ADMIN_NAME   cuenta del instructor (se crea si no existe)
//	LMS_INVITE_CODE     código para que los alumnos se registren (vacío = sin registro)
//	LMS_COHORT          cohorte de quien se registra (p. ej. cohorte-2026-2)
//	LMS_RUNNER          docker | podman para ejecutar código; vacío = deshabilitado
//	LMS_RUNNER_TIMEOUT  tope por ejecución (p. ej. 15s, 1m); por defecto 15s
//	LMS_TERM_IMAGE      imagen de la shell interactiva del estudio (por defecto python:3.12-alpine)
//	LMS_LLM_URL         endpoint OpenAI-compatible (chat/completions) para generar landings; vacío = deshabilitado
//	LMS_LLM_KEY / LMS_LLM_MODEL   clave y modelo del gateway (modelo por defecto «auto»)
//	                    Las tres son solo el valor inicial: lo que el instructor guarda en el panel
//	                    (Instructor > Inteligencia artificial) queda en la base y manda sobre ellas.
//	OIDC_ISSUER / OIDC_CLIENT_ID / OIDC_CLIENT_SECRET / OIDC_AUDIENCE   Keycloak (opcional)
package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"github.com/davrv93/jmd/lms/api/internal/auth"
	"github.com/davrv93/jmd/lms/api/internal/content"
	"github.com/davrv93/jmd/lms/api/internal/httpapi"
	"github.com/davrv93/jmd/lms/api/internal/runner"
	"github.com/davrv93/jmd/lms/api/internal/store"
	"github.com/davrv93/jmd/lms/api/internal/webdist"
)

func env(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func main() {
	slog.SetDefault(slog.New(slog.NewTextHandler(os.Stderr, nil)))
	if err := run(); err != nil {
		slog.Error("lms", "err", err)
		os.Exit(1)
	}
}

func run() error {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	dataDir := env("LMS_DATA_DIR", "./data")
	if err := os.MkdirAll(dataDir, 0o700); err != nil {
		return err
	}
	db, err := store.Open(filepath.Join(dataDir, "lms.db"))
	if err != nil {
		return err
	}
	defer db.Close()

	contentDir := env("LMS_CONTENT_DIR", "../content")
	cs, err := content.NewStore(contentDir)
	if err != nil {
		return err
	}
	go cs.Watch(ctx, 5*time.Second)
	for _, c := range cs.Get().Courses() {
		n := 0
		for _, m := range c.Modules {
			n += len(m.Lessons)
		}
		slog.Info("curso cargado", "id", c.ID, "lessons", n, "assignments", len(cs.Get().Assignments(c.ID)))
	}

	if err := bootstrapAdmin(ctx, db); err != nil {
		return err
	}

	srv := &httpapi.Server{
		Content:       cs,
		DB:            db,
		InviteCode:    os.Getenv("LMS_INVITE_CODE"),
		DefaultCohort: os.Getenv("LMS_COHORT"),
		PublicURL:     strings.TrimRight(env("LMS_PUBLIC_URL", "http://localhost:8080"), "/"),
		Web:           webdist.FS(),
		DataDir:       dataDir,
		Runner: &runner.Runner{
			Runtime: os.Getenv("LMS_RUNNER"), // "docker" o "podman"; vacío = deshabilitado
			Timeout: runner.ParseTimeout(os.Getenv("LMS_RUNNER_TIMEOUT")),
		},
		TermImage: os.Getenv("LMS_TERM_IMAGE"),
		LLM: httpapi.LLMConfig{
			URL:   os.Getenv("LMS_LLM_URL"),
			Key:   os.Getenv("LMS_LLM_KEY"),
			Model: env("LMS_LLM_MODEL", "auto"),
		},
	}
	if srv.Runner.Available() {
		slog.Info("runner de código activo", "runtime", srv.Runner.Runtime, "timeout", srv.Runner.Timeout)
	} else {
		slog.Info("runner de código desactivado (define LMS_RUNNER=docker para activarlo)")
	}
	if srv.LLM.URL != "" {
		slog.Info("generación por IA activa", "url", srv.LLM.URL, "model", srv.LLM.Model)
	} else {
		slog.Info("generación por IA sin valor inicial (configúrala desde el panel del instructor o con LMS_LLM_URL)")
	}
	if iss := os.Getenv("OIDC_ISSUER"); iss != "" {
		o, err := auth.NewOIDC(ctx, auth.OIDCConfig{
			Issuer: iss, ClientID: env("OIDC_CLIENT_ID", "lms-web"), ClientSecret: os.Getenv("OIDC_CLIENT_SECRET"),
			RedirectURL: srv.PublicURL + "/auth/oidc/callback", Audience: env("OIDC_AUDIENCE", "lms-api"),
		})
		if err != nil {
			return err
		}
		srv.OIDC = o
		slog.Info("SSO activo", "issuer", iss)
	} else {
		slog.Info("SSO no configurado: cuentas locales (LMS_ADMIN_* y LMS_INVITE_CODE)")
	}

	addr := env("LMS_ADDR", ":8080")
	hs := &http.Server{Addr: addr, Handler: srv.Handler(), ReadHeaderTimeout: 10 * time.Second}
	go func() {
		<-ctx.Done()
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = hs.Shutdown(shutdownCtx)
	}()
	slog.Info("LMS escuchando", "addr", addr, "content", contentDir, "public_url", srv.PublicURL)
	if err := hs.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		return err
	}
	return nil
}

// bootstrapAdmin crea la cuenta del instructor (admin + instructor) si LMS_ADMIN_EMAIL está definida.
func bootstrapAdmin(ctx context.Context, db *store.DB) error {
	email, pw := os.Getenv("LMS_ADMIN_EMAIL"), os.Getenv("LMS_ADMIN_PASSWORD")
	if email == "" {
		return nil
	}
	if len(pw) < 8 {
		return errors.New("LMS_ADMIN_PASSWORD debe tener al menos 8 caracteres")
	}
	if _, err := db.UserByEmail(ctx, email); err == nil {
		return nil
	} else if !errors.Is(err, store.ErrNotFound) {
		return err
	}
	hash, err := auth.HashPassword(pw)
	if err != nil {
		return err
	}
	u := &store.User{Email: email, Name: env("LMS_ADMIN_NAME", "Instructor"), PasswordHash: hash,
		Roles: []string{"admin", "instructor"}, Cohorts: []string{}}
	if err := db.CreateUser(ctx, u); err != nil {
		return err
	}
	slog.Info("cuenta del instructor creada", "email", u.Email)
	return nil
}
