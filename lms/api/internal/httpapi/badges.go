package httpapi

import (
	"context"
	"crypto/ed25519"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"html"
	"math"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/davrv93/jmd/lms/api/internal/content"
	"github.com/davrv93/jmd/lms/api/internal/store"
)

// Insignias digitales. Cada certificado válido tiene su credencial siguiendo el modelo de datos
// Open Badges 3.0 de 1EdTech (OpenBadgeCredential sobre Verifiable Credentials 2.0): perfil del
// emisor, logro por curso (Achievement) con imagen SVG, credencial por certificado en JSON y
// firmada como VC-JWT (EdDSA / Ed25519). Es una implementación del modelo de datos; no se afirma
// certificación de conformidad por 1EdTech.
//
// Estado de la credencial: se usa el tipo «1EdTechRevocationList» apuntando a una lista real de
// revocación (/api/v1/insignias/revocados.json) con los códigos anulados, que es lo que la
// especificación define para ese tipo. La verificación humana sigue en /verificar/<codigo>/.

var obContext = []string{"https://www.w3.org/ns/credentials/v2", "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json"}

// --- clave de firma --------------------------------------------------------------------------

type badgeKeys struct {
	Kid  string             `json:"kid"`
	Pub  ed25519.PublicKey  `json:"-"`
	Priv ed25519.PrivateKey `json:"-"`
}

type badgeKeyFile struct {
	Kid     string `json:"kid"`
	Private string `json:"private"` // seed Ed25519 en base64url
	Public  string `json:"public"`
}

type badgeKeyCache struct {
	once sync.Once
	keys *badgeKeys
	err  error
}

func b64url(b []byte) string { return base64.RawURLEncoding.EncodeToString(b) }

// badgeKey carga la clave de LMS_DATA_DIR/badge-key.json o la genera una vez (0600). Sin DataDir
// (pruebas de rutas estáticas) usa una clave efímera en memoria.
func (s *Server) badgeKey() (*badgeKeys, error) {
	if s.badge == nil {
		s.badge = &badgeKeyCache{}
	}
	s.badge.once.Do(func() {
		s.badge.keys, s.badge.err = loadOrCreateBadgeKey(s.DataDir)
	})
	return s.badge.keys, s.badge.err
}

func loadOrCreateBadgeKey(dir string) (*badgeKeys, error) {
	var path string
	if dir != "" {
		path = filepath.Join(dir, "badge-key.json")
		if raw, err := os.ReadFile(path); err == nil {
			var f badgeKeyFile
			if err := json.Unmarshal(raw, &f); err != nil {
				return nil, fmt.Errorf("badge-key.json: %w", err)
			}
			seed, err := base64.RawURLEncoding.DecodeString(f.Private)
			if err != nil || len(seed) != ed25519.SeedSize {
				return nil, errors.New("badge-key.json: clave privada inválida")
			}
			priv := ed25519.NewKeyFromSeed(seed)
			pub := priv.Public().(ed25519.PublicKey)
			kid := f.Kid
			if kid == "" {
				kid = kidDe(pub)
			}
			return &badgeKeys{Kid: kid, Pub: pub, Priv: priv}, nil
		} else if !errors.Is(err, os.ErrNotExist) {
			return nil, err
		}
	}
	pub, priv, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		return nil, err
	}
	k := &badgeKeys{Kid: kidDe(pub), Pub: pub, Priv: priv}
	if path != "" {
		raw, _ := json.MarshalIndent(badgeKeyFile{Kid: k.Kid, Private: b64url(priv.Seed()), Public: b64url(pub)}, "", "  ")
		if err := os.WriteFile(path, raw, 0o600); err != nil {
			return nil, err
		}
	}
	return k, nil
}

// kidDe es una huella corta de la clave pública (primeros 8 bytes del SHA-256, base64url).
func kidDe(pub ed25519.PublicKey) string {
	h := sha256.Sum256(pub)
	return b64url(h[:8])
}

// jwk devuelve la clave pública como JWK OKP/Ed25519.
func (k *badgeKeys) jwk() map[string]any {
	return map[string]any{"kty": "OKP", "crv": "Ed25519", "x": b64url(k.Pub), "kid": k.Kid, "use": "sig", "alg": "EdDSA"}
}

// signJWT firma un payload como JWT compacto EdDSA.
func (k *badgeKeys) signJWT(payload map[string]any) (string, error) {
	hb, _ := json.Marshal(map[string]any{"alg": "EdDSA", "typ": "JWT", "kid": k.Kid})
	pb, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}
	signing := b64url(hb) + "." + b64url(pb)
	sig := ed25519.Sign(k.Priv, []byte(signing))
	return signing + "." + b64url(sig), nil
}

// jwks: GET /.well-known/jwks.json.
func (s *Server) jwks(w http.ResponseWriter, r *http.Request) {
	k, err := s.badgeKey()
	if err != nil {
		internal(w, err)
		return
	}
	publicJSON(w, map[string]any{"keys": []any{k.jwk()}})
}

// publicJSON responde JSON cacheable un rato y legible desde otros orígenes (verificadores).
func publicJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "public, max-age=300")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.WriteHeader(200)
	enc := json.NewEncoder(w)
	enc.SetEscapeHTML(false)
	_ = enc.Encode(v)
}

// --- perfil del emisor y logros ------------------------------------------------------------

func (s *Server) emisorID(cfg certSettings) string { return cfg.URL + "/api/v1/emisor.json" }

func (s *Server) emisorProfile(cfg certSettings) map[string]any {
	return map[string]any{
		"@context":    obContext,
		"id":          s.emisorID(cfg),
		"type":        "Profile",
		"name":        cfg.Emisor,
		"url":         cfg.URL,
		"description": "Emisor de credenciales digitales · RUC " + cfg.RUC,
	}
}

// emisorJSON: GET /api/v1/emisor.json → Profile OB3.
func (s *Server) emisorJSON(w http.ResponseWriter, r *http.Request) {
	cfg, err := s.certConfig(r.Context())
	if err != nil {
		internal(w, err)
		return
	}
	publicJSON(w, s.emisorProfile(cfg))
}

// achievement arma el logro OB3 de un curso. La imagen es el PNG (lo que aceptan Credly y
// Badgr); el SVG sigue disponible en la misma ruta con extensión .svg.
func (s *Server) achievement(cfg certSettings, c *content.Course) map[string]any {
	desc := strings.TrimSpace(c.Description)
	if desc == "" {
		desc = "Curso " + c.Title
	}
	return map[string]any{
		"id":          cfg.URL + "/api/v1/insignias/" + c.ID + ".json",
		"type":        []string{"Achievement"},
		"name":        c.Title,
		"description": desc,
		"criteria":    map[string]any{"id": cfg.URL + "/courses/" + c.Slug + "/", "narrative": "Completar las sesiones y aprobar las tareas del curso"},
		"image":       map[string]any{"id": cfg.URL + "/api/v1/insignias/" + c.ID + ".png", "type": "Image"},
		"creator":     s.emisorID(cfg),
	}
}

// achievementClase arma el logro OB3 de una clase (microcredencial): criterios = asistir y
// completar el ciclo de aprendizaje de la clase; alignment con los objetivos de la clase.
func (s *Server) achievementClase(cfg certSettings, c *content.Course, l *content.Lesson, num int) map[string]any {
	nombre := tituloClase(num, l.Title)
	desc := fmt.Sprintf("Clase %d del curso %s.", num, c.Title)
	if len(l.Objectives) > 0 {
		var objs []string
		for _, o := range l.Objectives {
			objs = append(objs, strings.TrimRight(strings.TrimSpace(o.Title), "."))
		}
		desc += " Objetivos: " + strings.Join(objs, "; ") + "."
	}
	base := cfg.URL + "/api/v1/insignias/" + c.ID + "/" + l.ID
	a := map[string]any{
		"id":          base + ".json",
		"type":        []string{"Achievement"},
		"name":        nombre,
		"description": desc,
		"criteria": map[string]any{
			"id":        cfg.URL + "/courses/" + c.Slug + "/",
			"narrative": fmt.Sprintf("Asistir a la clase %d (en vivo o grabación) y completar los %d pasos del ciclo de aprendizaje de la clase en el LMS", num, len(l.Cycle)),
		},
		"image":   map[string]any{"id": base + ".png", "type": "Image"},
		"creator": s.emisorID(cfg),
	}
	if len(l.Objectives) > 0 {
		var al []map[string]any
		for _, o := range l.Objectives {
			al = append(al, map[string]any{"type": []string{"Alignment"}, "targetName": o.Title, "targetUrl": cfg.URL + "/lessons/" + l.ID + "/#" + o.ID})
		}
		a["alignment"] = al
	}
	return a
}

// insigniaClase: GET /api/v1/insignias/{course}/{archivo}: <clase>.json (Achievement de la
// clase), <clase>.svg o <clase>.png.
func (s *Server) insigniaClase(w http.ResponseWriter, r *http.Request) {
	cfg, err := s.certConfig(r.Context())
	if err != nil {
		internal(w, err)
		return
	}
	c := s.Content.Get().Course(r.PathValue("course"))
	archivo := r.PathValue("archivo")
	id, ext := archivo, ""
	if i := strings.LastIndexByte(archivo, '.'); i > 0 {
		id, ext = archivo[:i], archivo[i+1:]
	}
	if c == nil {
		notFound(w, "la insignia")
		return
	}
	l, num := lessonEnCurso(c, id)
	if l == nil {
		notFound(w, "la insignia")
		return
	}
	switch ext {
	case "json":
		a := s.achievementClase(cfg, c, l, num)
		a["@context"] = obContext
		publicJSON(w, a)
	case "svg":
		servirSVG(w, insigniaClaseSVG(num, l.Title, cfg.Emisor))
	case "png":
		servirPNG(w, insigniaPNGData{Curso: c.Title, Emisor: cfg.Emisor, ClaseNum: num, Clase: tituloSinPrefijo(l.Title)}, fmt.Sprintf("insignia-%s-clase-%02d.png", c.ID, num))
	default:
		notFound(w, "la insignia")
	}
}

func servirSVG(w http.ResponseWriter, svg string) {
	w.Header().Set("Content-Type", "image/svg+xml; charset=utf-8")
	w.Header().Set("Cache-Control", "public, max-age=3600")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'")
	w.WriteHeader(200)
	_, _ = w.Write([]byte(svg))
}

// tituloSinPrefijo quita el «Clase N ·» inicial del título de una clase.
func tituloSinPrefijo(t string) string {
	return rePrefijoClase.ReplaceAllString(strings.TrimSpace(t), "")
}

// insignia: GET /api/v1/insignias/{archivo}: <curso>.json (Achievement), <curso>.svg o
// <curso>.png (imagen) o revocados.json (lista de revocación).
func (s *Server) insignia(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	cfg, err := s.certConfig(ctx)
	if err != nil {
		internal(w, err)
		return
	}
	archivo := r.PathValue("archivo")
	if archivo == "revocados.json" {
		s.revocados(w, ctx, cfg)
		return
	}
	id, ext := archivo, ""
	if i := strings.LastIndexByte(archivo, '.'); i > 0 {
		id, ext = archivo[:i], archivo[i+1:]
	}
	c := s.Content.Get().Course(id)
	if c == nil {
		notFound(w, "la insignia")
		return
	}
	switch ext {
	case "json":
		a := s.achievement(cfg, c)
		a["@context"] = obContext
		publicJSON(w, a)
	case "svg":
		servirSVG(w, insigniaSVG(c.Title, cfg.Emisor))
	case "png":
		servirPNG(w, insigniaPNGData{Curso: c.Title, Emisor: cfg.Emisor}, "insignia-"+c.ID+".png")
	default:
		notFound(w, "la insignia")
	}
}

// revocados devuelve la lista de revocación 1EdTech con los certificados anulados.
func (s *Server) revocados(w http.ResponseWriter, ctx context.Context, cfg certSettings) {
	list, err := s.DB.Certificates(ctx, "", "")
	if err != nil {
		internal(w, err)
		return
	}
	rev := []map[string]any{}
	for _, c := range list {
		if c.Anulado() {
			rev = append(rev, map[string]any{"id": s.credentialID(cfg, c.ID), "revocationReason": "Anulado por el emisor el " + c.AnuladoEn.UTC().Format("2006-01-02")})
		}
	}
	publicJSON(w, map[string]any{
		"@context":           obContext,
		"id":                 cfg.URL + "/api/v1/insignias/revocados.json",
		"type":               "1EdTechRevocationList",
		"issuer":             s.emisorID(cfg),
		"revokedCredentials": rev,
	})
}

// insigniaSVG dibuja la insignia hexagonal 600x600: degradado azul→morado, borde blanco, símbolo
// </> al centro, nombre corto del curso (dos líneas) y el emisor abajo. Todo el texto va escapado.
func insigniaSVG(curso, emisor string) string {
	return insigniaSVGBase("Insignia: "+curso+" · "+emisor, 0, curso, emisor)
}

// insigniaClaseSVG es la misma insignia con el número de clase grande («01») y el título corto
// de la clase en dos líneas.
func insigniaClaseSVG(num int, titulo, emisor string) string {
	t := tituloSinPrefijo(titulo)
	return insigniaSVGBase(fmt.Sprintf("Insignia de clase %d: %s · %s", num, t, emisor), num, t, emisor)
}

func insigniaSVGBase(label string, num int, nombre, emisor string) string {
	l1, l2 := "", ""
	if num == 0 {
		l1, l2 = nombreCorto(nombre)
	}
	esc := html.EscapeString
	var b strings.Builder
	b.WriteString(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600" role="img" aria-label="`)
	b.WriteString(esc(label))
	b.WriteString(`">`)
	b.WriteString(`<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1f4fbf"/><stop offset="1" stop-color="#6d28d9"/></linearGradient></defs>`)
	// Hexágono (vértices arriba y abajo) con borde blanco doble.
	hex := func(r float64) string {
		var p []string
		for i := 0; i < 6; i++ {
			ang := (float64(i)*60 - 90) * math.Pi / 180
			x := 300 + r*math.Cos(ang)
			y := 300 + r*math.Sin(ang)
			p = append(p, fmt.Sprintf("%.1f,%.1f", x, y))
		}
		return strings.Join(p, " ")
	}
	b.WriteString(`<polygon points="` + hex(290) + `" fill="url(#g)"/>`)
	b.WriteString(`<polygon points="` + hex(268) + `" fill="none" stroke="#ffffff" stroke-width="10"/>`)
	b.WriteString(`<polygon points="` + hex(250) + `" fill="none" stroke="#ffffff" stroke-opacity=".35" stroke-width="2"/>`)
	const sans = `font-family="Inter, Helvetica, Arial, sans-serif"`
	if num == 0 {
		// Símbolo central y nombre del curso (hasta dos líneas).
		b.WriteString(`<text x="300" y="268" text-anchor="middle" font-family="Menlo, Consolas, 'Courier New', monospace" font-weight="700" font-size="128" fill="#ffffff">&lt;/&gt;</text>`)
		y := 352
		if l2 == "" {
			y = 366
		}
		b.WriteString(fmt.Sprintf(`<text x="300" y="%d" text-anchor="middle" %s font-weight="700" font-size="40" fill="#ffffff">%s</text>`, y, sans, esc(l1)))
		if l2 != "" {
			b.WriteString(fmt.Sprintf(`<text x="300" y="%d" text-anchor="middle" %s font-weight="700" font-size="40" fill="#ffffff">%s</text>`, y+46, sans, esc(l2)))
		}
	} else {
		// «CLASE», el número grande y el título corto de la clase.
		b.WriteString(fmt.Sprintf(`<text x="300" y="160" text-anchor="middle" %s font-weight="500" font-size="24" letter-spacing="6" fill="#ffffff" fill-opacity=".85">CLASE</text>`, sans))
		b.WriteString(fmt.Sprintf(`<text x="300" y="300" text-anchor="middle" %s font-weight="800" font-size="168" letter-spacing="-6" fill="#ffffff">%02d</text>`, sans, num))
		ls := partirLineas(nombre, 24, 3)
		y := 352 + (3-len(ls))*12
		for i, l := range ls {
			b.WriteString(fmt.Sprintf(`<text x="300" y="%d" text-anchor="middle" %s font-weight="700" font-size="28" fill="#ffffff">%s</text>`, y+i*34, sans, esc(l)))
		}
	}
	ySep, yEm, yOB := 440, 472, 502
	if num != 0 {
		ySep, yEm, yOB = 446, 476, 503
	}
	b.WriteString(fmt.Sprintf(`<line x1="230" y1="%d" x2="370" y2="%d" stroke="#ffffff" stroke-opacity=".6" stroke-width="2"/>`, ySep, ySep))
	b.WriteString(fmt.Sprintf(`<text x="300" y="%d" text-anchor="middle" font-family="Inter, Helvetica, Arial, sans-serif" font-weight="600" font-size="21" letter-spacing="1.5" fill="#ffffff">%s</text>`, yEm, esc(strings.ToUpper(recortarRunas(emisor, 24)))))
	b.WriteString(fmt.Sprintf(`<text x="300" y="%d" text-anchor="middle" font-family="Menlo, Consolas, 'Courier New', monospace" font-size="16" fill="#ffffff" fill-opacity=".75">open badges 3.0</text>`, yOB))
	b.WriteString(`</svg>`)
	return b.String()
}

// nombreCorto quita el paréntesis final del título y lo parte en dos líneas de ~18 caracteres.
func nombreCorto(titulo string) (string, string) {
	ls := partirLineas(titulo, 18, 2)
	l1, l2 := "", ""
	if len(ls) > 0 {
		l1 = ls[0]
	}
	if len(ls) > 1 {
		l2 = ls[1]
	}
	return l1, l2
}

// partirLineas quita el paréntesis final del título («(vibecoding)») y, si hay un subtítulo tras
// «:» con una parte principal suficientemente larga, se queda con la principal; luego reparte las
// palabras en hasta n líneas de ~max caracteres y marca con «…» lo que no cabe.
func partirLineas(titulo string, max, n int) []string {
	t := strings.TrimSpace(titulo)
	if i := strings.Index(t, " ("); i > 0 {
		t = t[:i]
	}
	if i := strings.Index(t, ":"); i >= 12 && len([]rune(t)) > max*n {
		t = strings.TrimSpace(t[:i])
	}
	var out []string
	for _, w := range strings.Fields(t) {
		if len(out) > 0 && len([]rune(out[len(out)-1]+" "+w)) <= max {
			out[len(out)-1] += " " + w
			continue
		}
		if len(out) == n {
			out[n-1] = strings.TrimRight(recortarRunas(out[n-1], max-1), " ,;:") + "…"
			return out
		}
		out = append(out, w)
	}
	return out
}

func recortarRunas(s string, n int) string {
	r := []rune(s)
	if len(r) <= n {
		return s
	}
	return string(r[:n])
}

func lessonExiste(c *content.Course, id string) bool {
	l, _ := lessonEnCurso(c, id)
	return l != nil
}

// --- credencial por certificado -------------------------------------------------------------

func (s *Server) credentialID(cfg certSettings, code string) string {
	return cfg.URL + "/api/v1/certificados/" + code + "/badge.json"
}

// loadCertForBadge busca el certificado y responde él mismo 404 o 410 si no procede.
func (s *Server) loadCertForBadge(w http.ResponseWriter, r *http.Request) (*store.Certificate, *store.User, certSettings, bool) {
	code := normCode(r.PathValue("codigo"))
	if code == "" {
		notFound(w, "el certificado")
		return nil, nil, certSettings{}, false
	}
	c, err := s.DB.Certificate(r.Context(), code)
	if errors.Is(err, store.ErrNotFound) {
		notFound(w, "el certificado")
		return nil, nil, certSettings{}, false
	}
	if err != nil {
		internal(w, err)
		return nil, nil, certSettings{}, false
	}
	if c.Anulado() {
		writeJSON(w, 410, map[string]any{"codigo": c.ID, "estado": "anulado", "anulado_en": c.AnuladoEn.UTC().Format(time.RFC3339)})
		return nil, nil, certSettings{}, false
	}
	u, err := s.DB.UserByID(r.Context(), c.UserID)
	if err != nil {
		internal(w, err)
		return nil, nil, certSettings{}, false
	}
	cfg, err := s.certConfig(r.Context())
	if err != nil {
		internal(w, err)
		return nil, nil, certSettings{}, false
	}
	// La URL base y el emisor se toman del snapshot, como en el PDF: el certificado no cambia.
	sn := parseSnapshot(c)
	if sn.URL != "" {
		cfg.URL = sn.URL
	}
	if sn.Emisor != "" {
		cfg.Emisor, cfg.RUC = sn.Emisor, sn.RUC
	}
	return c, u, cfg, true
}

// credential arma la OpenBadgeCredential de un certificado válido.
func (s *Server) credential(cfg certSettings, c *store.Certificate, u *store.User) map[string]any {
	sn := parseSnapshot(c)
	course := s.Content.Get().Course(c.CourseID)
	var ach map[string]any
	switch {
	case c.LessonID != "" && course != nil && lessonExiste(course, c.LessonID):
		l, num := lessonEnCurso(course, c.LessonID)
		ach = s.achievementClase(cfg, course, l, num)
	case c.LessonID != "":
		// La clase ya no está en el temario: se reconstruye el logro desde el snapshot.
		base := cfg.URL + "/api/v1/insignias/" + c.CourseID + "/" + c.LessonID
		ach = map[string]any{
			"id": base + ".json", "type": []string{"Achievement"}, "name": sn.Clase,
			"description": fmt.Sprintf("Clase %d del curso %s.", sn.ClaseNum, sn.Curso),
			"criteria":    map[string]any{"narrative": fmt.Sprintf("Asistir a la clase %d y completar el ciclo de aprendizaje de la clase", sn.ClaseNum)},
			"image":       map[string]any{"id": base + ".png", "type": "Image"}, "creator": s.emisorID(cfg),
		}
	case course != nil:
		ach = s.achievement(cfg, course)
	default:
		// El curso ya no está en el temario: se reconstruye el logro desde el snapshot.
		ach = map[string]any{
			"id": cfg.URL + "/api/v1/insignias/" + c.CourseID + ".json", "type": []string{"Achievement"}, "name": sn.Curso,
			"description": "Curso " + sn.Curso, "criteria": map[string]any{"narrative": "Completar las sesiones y aprobar las tareas del curso"},
			"image": map[string]any{"id": cfg.URL + "/api/v1/insignias/" + c.CourseID + ".png", "type": "Image"}, "creator": s.emisorID(cfg),
		}
	}
	salt := sn.Salt
	if salt == "" {
		salt = hex.EncodeToString([]byte(c.ID)) // certificados anteriores a la sal: sal determinista
	}
	h := sha256.Sum256([]byte(strings.ToLower(strings.TrimSpace(u.Email)) + salt))
	nombre := tiposCert[c.Tipo]
	if nombre == "" {
		nombre = "certificado"
	}
	nombreVC := "Certificado " + nombre + " · " + sn.Curso
	if c.LessonID != "" {
		nombreVC = "Insignia de clase · " + sn.Clase + " · " + sn.Curso
	}
	return map[string]any{
		"@context":  obContext,
		"id":        s.credentialID(cfg, c.ID),
		"type":      []string{"VerifiableCredential", "OpenBadgeCredential"},
		"issuer":    map[string]any{"id": s.emisorID(cfg), "type": "Profile", "name": cfg.Emisor, "url": cfg.URL},
		"validFrom": c.EmitidoEn.UTC().Format(time.RFC3339),
		"name":      nombreVC,
		"credentialSubject": map[string]any{
			"type": []string{"AchievementSubject"},
			"identifier": []map[string]any{{
				"type": "IdentityObject", "hashed": true, "identityHash": "sha256$" + hex.EncodeToString(h[:]),
				"identityType": "emailAddress", "salt": salt,
			}},
			"achievement": ach,
		},
		"credentialStatus": map[string]any{"id": cfg.URL + "/api/v1/insignias/revocados.json", "type": "1EdTechRevocationList"},
	}
}

// badgeJSON: GET /api/v1/certificados/{codigo}/badge.json.
func (s *Server) badgeJSON(w http.ResponseWriter, r *http.Request) {
	c, u, cfg, ok := s.loadCertForBadge(w, r)
	if !ok {
		return
	}
	w.Header().Set("Content-Disposition", fmt.Sprintf("inline; filename=%q", "insignia-"+c.ID+".json"))
	publicJSON(w, s.credential(cfg, c, u))
}

// badgeJWT: GET /api/v1/certificados/{codigo}/badge.jwt → VC-JWT compacto (EdDSA).
func (s *Server) badgeJWT(w http.ResponseWriter, r *http.Request) {
	c, u, cfg, ok := s.loadCertForBadge(w, r)
	if !ok {
		return
	}
	k, err := s.badgeKey()
	if err != nil {
		internal(w, err)
		return
	}
	vc := s.credential(cfg, c, u)
	payload := map[string]any{
		"iss": s.emisorID(cfg),
		"sub": c.ID,
		"nbf": c.EmitidoEn.UTC().Unix(),
		"iat": c.EmitidoEn.UTC().Unix(),
		"jti": vc["id"],
		"vc":  vc,
	}
	tok, err := k.signJWT(payload)
	if err != nil {
		internal(w, err)
		return
	}
	w.Header().Set("Content-Type", "application/jwt")
	w.Header().Set("Cache-Control", "public, max-age=300")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Disposition", fmt.Sprintf("inline; filename=%q", "insignia-"+c.ID+".jwt"))
	w.WriteHeader(200)
	_, _ = w.Write([]byte(tok))
}
