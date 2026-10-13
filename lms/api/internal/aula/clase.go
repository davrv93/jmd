package aula

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// Clase son los servicios compartidos de la clase 3 (chatbot de WhatsApp): una base de Postgres por alumno
// en aula-pg y una instancia de Evolution Go por alumno en evogo-clase. Todo es opcional: sin configurar,
// el aula se crea igual que antes y sin estas variables.
//
// Las credenciales de cada alumno no se guardan: se derivan con HMAC de Secreto y el id del alumno, así que
// crear la base y la instancia es idempotente y sobrevive a reinicios del LMS.
type Clase struct {
	PG         string // contenedor de Postgres que el LMS administra con «exec psql» (p. ej. aula-pg); vacío = sin base
	PGHost     string // host de Postgres visto desde el aula; por defecto, PG
	EvoURL     string // Evolution Go visto desde el LMS (p. ej. http://evogo-clase:8080); vacío = sin WhatsApp
	EvoKey     string // GLOBAL_API_KEY de Evolution Go. Vive SOLO en el LMS: nunca entra al aula
	EvoURLAula string // Evolution Go visto desde el aula; por defecto http://evogo-clase:8080
	Proxy      string // HTTPS_PROXY del aula para «bun install» (p. ej. http://npm-proxy:8888); vacío = sin proxy
	Secreto    []byte // semilla de las credenciales por alumno

	HTTP *http.Client // nil = cliente con tope de 10 s
}

// PGActivo dice si el LMS crea una base por alumno.
func (c *Clase) PGActivo() bool { return c != nil && c.PG != "" && len(c.Secreto) > 0 }

// EvoActivo dice si el LMS crea una instancia de Evolution Go por alumno.
func (c *Clase) EvoActivo() bool {
	return c != nil && c.EvoURL != "" && c.EvoKey != "" && len(c.Secreto) > 0
}

func (c *Clase) derivar(proposito, userID string, n int) string {
	m := hmac.New(sha256.New, c.Secreto)
	m.Write([]byte(proposito + "\x00" + userID))
	return hex.EncodeToString(m.Sum(nil))[:n]
}

// PGUsuario y PGBase son el rol y la base del alumno en aula-pg (sin datos personales: solo el hash).
func PGUsuario(userID string) string { return "alumno_" + sufijo(userID) }
func PGBase(userID string) string    { return "aula_" + sufijo(userID) }

// PGClave es la clave del rol del alumno (hex: segura dentro de una URL y de un literal SQL).
func (c *Clase) PGClave(userID string) string { return c.derivar("pg", userID, 32) }

// EvoToken es el token de la instancia de Evolution Go del alumno. Solo sirve para SU instancia.
func (c *Clase) EvoToken(userID string) string { return c.derivar("evo", userID, 40) }

// EvoInstancia es el nombre de la instancia: el mismo del contenedor del aula.
func EvoInstancia(userID string) string { return Nombre(userID) }

// Webhook es la URL a la que Evolution Go entrega los mensajes del alumno: su backend en el puerto 8766,
// alcanzado por el nombre del contenedor en la red del aula.
func Webhook(userID string) string { return "http://" + Nombre(userID) + ":8766/api/webhook" }

func (c *Clase) pgHost() string {
	if c.PGHost != "" {
		return c.PGHost
	}
	return c.PG
}

func (c *Clase) evoURLAula() string {
	if c.EvoURLAula != "" {
		return strings.TrimRight(c.EvoURLAula, "/")
	}
	return "http://evogo-clase:8080"
}

// DatabaseURL es la DATABASE_URL que recibe el aula del alumno.
func (c *Clase) DatabaseURL(userID string) string {
	return fmt.Sprintf("postgres://%s:%s@%s:5432/%s", PGUsuario(userID), c.PGClave(userID), c.pgHost(), PGBase(userID))
}

// entorno devuelve los «-e» del aula. La GLOBAL_API_KEY no aparece nunca aquí.
func (c *Clase) entorno(userID string) []string {
	if c == nil {
		return nil
	}
	var e []string
	if c.PGActivo() {
		e = append(e, "-e", "DATABASE_URL="+c.DatabaseURL(userID))
	}
	if c.EvoActivo() {
		e = append(e,
			"-e", "EVO_URL="+c.evoURLAula(),
			"-e", "EVO_TOKEN="+c.EvoToken(userID),
			"-e", "EVO_INSTANCE="+EvoInstancia(userID),
			"-e", "EVO_WEBHOOK="+Webhook(userID),
		)
	}
	if c.Proxy != "" {
		// Solo HTTPS: el registro de npm. Lo interno (http://) nunca pasa por el proxy.
		sin := "localhost,127.0.0.1,ai-orchestrator,imagen,evogo-clase,aula-pg"
		if h := c.pgHost(); h != "" && h != "aula-pg" {
			sin += "," + h
		}
		e = append(e, "-e", "HTTPS_PROXY="+c.Proxy, "-e", "https_proxy="+c.Proxy, "-e", "NO_PROXY="+sin, "-e", "no_proxy="+sin)
	}
	return e
}

// sqlBase crea (o deja como está) el rol y la base del alumno. Idempotente: se puede correr en cada arranque.
// Va por stdin de psql, así la clave no aparece en la línea de comandos del host.
func (c *Clase) sqlBase(userID string) string {
	u, b, k := PGUsuario(userID), PGBase(userID), c.PGClave(userID)
	return strings.Join([]string{
		fmt.Sprintf("SELECT 'CREATE ROLE %s LOGIN' WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '%s')\\gexec", u, u),
		// 15 conexiones: el «sql» de Bun abre 10 de golpe (medido) y aún quedan para psql y un --watch.
		fmt.Sprintf("ALTER ROLE %s WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE CONNECTION LIMIT 15 PASSWORD '%s';", u, k),
		// Las conexiones ociosas de un backend olvidado se cierran a los 10 min; Bun.sql y postgres.js
		// reconectan solos en la siguiente consulta (probado).
		fmt.Sprintf("ALTER ROLE %s SET idle_session_timeout = '10min';", u),
		fmt.Sprintf("SELECT 'CREATE DATABASE %s OWNER %s' WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = '%s')\\gexec", b, u, b),
		// Nadie más entra a la base del alumno (por defecto PUBLIC puede conectarse a cualquier base).
		fmt.Sprintf("REVOKE ALL ON DATABASE %s FROM PUBLIC;", b),
		fmt.Sprintf("GRANT ALL ON DATABASE %s TO %s;", b, u),
		"",
	}, "\n")
}

// scriptPG es lo que corre dentro del contenedor de Postgres: psql como superusuario por el socket local.
const scriptPG = "psql -X -q -t -A -v ON_ERROR_STOP=1 -U postgres -d postgres"

// scriptPGEvo: lo mismo, en la base de instancias de evolution-go (evogo_users, ver lms/clase/initdb-evogo.sh).
const scriptPGEvo = "psql -X -q -t -A -v ON_ERROR_STOP=1 -U postgres -d evogo_users"

// sqlWebhook deja guardados el webhook y el evento MESSAGE de la instancia del alumno sin arrancar su cliente
// de WhatsApp (POST /instance/connect lo arrancaría y pediría QR para cada alumno de cualquier clase). Así el
// QR que pida el alumno por su cuenta (GET /instance/qr arranca el cliente con lo guardado) ya entrega los
// mensajes a su backend. Solo rellena lo vacío: si alguien lo borró con un connect sin webhookUrl, se repara al
// volver a abrir el aula; si el alumno puso otro, se respeta.
func sqlWebhook(userID string) string {
	n := EvoInstancia(userID)
	return fmt.Sprintf("UPDATE instances SET webhook = '%s' WHERE name = '%s' AND coalesce(webhook, '') = '';\n", Webhook(userID), n) +
		fmt.Sprintf("UPDATE instances SET events = 'MESSAGE' WHERE name = '%s' AND coalesce(events, '') = '';\n", n)
}

func (c *Clase) cliente() *http.Client {
	if c.HTTP != nil {
		return c.HTTP
	}
	return &http.Client{Timeout: 10 * time.Second}
}

// asegurarInstancia crea la instancia de Evolution Go del alumno si no existe. «instance already exists» es
// éxito: la instancia lleva el mismo nombre y el mismo token derivado.
func (c *Clase) asegurarInstancia(ctx context.Context, userID string) error {
	cuerpo, _ := json.Marshal(map[string]string{"name": EvoInstancia(userID), "token": c.EvoToken(userID)})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, strings.TrimRight(c.EvoURL, "/")+"/instance/create", bytes.NewReader(cuerpo))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("apikey", c.EvoKey)
	res, err := c.cliente().Do(req)
	if err != nil {
		return fmt.Errorf("evolution-go no responde: %w", err)
	}
	defer res.Body.Close()
	raw, _ := io.ReadAll(io.LimitReader(res.Body, 4096))
	if res.StatusCode/100 == 2 || strings.Contains(strings.ToLower(string(raw)), "already exists") {
		return nil
	}
	return fmt.Errorf("evolution-go respondió %d: %s", res.StatusCode, strings.TrimSpace(string(raw)))
}
