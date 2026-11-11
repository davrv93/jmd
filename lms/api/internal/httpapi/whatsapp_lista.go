package httpapi

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"os"
	"sort"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/davrv93/jmd/lms/api/internal/aula"
)

// Lista blanca del WhatsApp de la clase. El alumno vincula SU número: sin filtro, su robot contestaría a toda
// su agenda. Evolution Go entrega los mensajes al relé del LMS (aula.Clase.Webhook); el relé solo reenvía al
// backend del alumno los chats de su lista y anota los demás en «bloqueados» para aprobarlos con un clic.
// El QR no se entrega mientras la lista esté vacía.

const maxPermitidos = 30

func clavePermitidos(nombre string) string { return "wa.permitidos." + nombre }

// normalizarPermitido: «+51 999 888 777», «999888777» (Perú), «51999888777@s.whatsapp.net» → «51999888777»;
// «1234567890@lid» → «1234567890@lid». Un «@usuario» no se puede resolver a número: se aprueba desde
// «bloqueados» cuando esa persona escribe primero.
func normalizarPermitido(s string) (string, string) {
	s = strings.ToLower(strings.TrimSpace(s))
	if s == "" {
		return "", ""
	}
	if strings.HasPrefix(s, "@") {
		return "", "«" + s + "» es un nombre de usuario: pide a esa persona que escriba primero a tu número y apruébala abajo, en «Te escribieron y no están en tu lista»."
	}
	if i := strings.Index(s, "@"); i >= 0 {
		usuario, servidor := s[:i], s[i+1:]
		if j := strings.Index(usuario, ":"); j >= 0 {
			usuario = usuario[:j]
		}
		switch servidor {
		case "lid":
			if soloDigitos(usuario) && usuario != "" {
				return usuario + "@lid", ""
			}
		case "s.whatsapp.net", "c.us":
			s = usuario
		default:
			return "", "«" + s + "» no es un número de WhatsApp (los grupos no se permiten)."
		}
	}
	d := strings.Map(func(r rune) rune {
		if r >= '0' && r <= '9' {
			return r
		}
		return -1
	}, s)
	if len(d) == 9 && d[0] == '9' { // celular peruano sin código de país
		d = "51" + d
	}
	if len(d) < 8 || len(d) > 15 {
		return "", "«" + s + "» no parece un número: escríbelo con código de país, p. ej. +51 999 888 777."
	}
	return d, ""
}

func soloDigitos(s string) bool {
	for _, r := range s {
		if r < '0' || r > '9' {
			return false
		}
	}
	return true
}

// idDeJID: «51999@s.whatsapp.net» y «51999:12@s.whatsapp.net» → «51999»; «123@lid» → «123@lid»; otro → "".
func idDeJID(j string) string {
	i := strings.Index(j, "@")
	if i < 0 {
		return ""
	}
	u, srv := j[:i], j[i+1:]
	if k := strings.Index(u, ":"); k >= 0 {
		u = u[:k]
	}
	u = strings.TrimPrefix(u, "+")
	switch srv {
	case "s.whatsapp.net":
		return u
	case "lid":
		return u + "@lid"
	}
	return ""
}

// permitido: algún id del mensaje está en la lista. Los números se comparan también por sus últimos 9
// dígitos (el mismo celular escrito con o sin código de país).
func permitido(lista []string, ids []string) bool {
	for _, id := range ids {
		if id == "" {
			continue
		}
		for _, p := range lista {
			if p == id {
				return true
			}
			if !strings.Contains(p, "@") && !strings.Contains(id, "@") && len(p) >= 9 && len(id) >= 9 &&
				p[len(p)-9:] == id[len(id)-9:] {
				return true
			}
		}
	}
	return false
}

func (s *Server) leerPermitidos(ctx context.Context, nombre string) []string {
	v, err := s.DB.Setting(ctx, clavePermitidos(nombre))
	if err != nil {
		return []string{}
	}
	var l []string
	if json.Unmarshal([]byte(v), &l) != nil || l == nil {
		return []string{}
	}
	return l
}

// bloqueados recientes por aula, en memoria: quién escribió y no estaba en la lista.
type bloqueado struct {
	ID     string `json:"id"`
	Nombre string `json:"nombre,omitempty"`
	Hora   string `json:"hora"`
}

var waBloqueados = struct {
	sync.Mutex
	m map[string][]bloqueado
}{m: map[string][]bloqueado{}}

func anotarBloqueado(aulaNombre string, b bloqueado) {
	waBloqueados.Lock()
	defer waBloqueados.Unlock()
	l := waBloqueados.m[aulaNombre][:0:0]
	for _, x := range waBloqueados.m[aulaNombre] {
		if x.ID != b.ID {
			l = append(l, x)
		}
	}
	l = append([]bloqueado{b}, l...)
	if len(l) > 10 {
		l = l[:10]
	}
	waBloqueados.m[aulaNombre] = l
}

func verBloqueados(aulaNombre string, lista []string) []bloqueado {
	waBloqueados.Lock()
	defer waBloqueados.Unlock()
	out := []bloqueado{}
	for _, b := range waBloqueados.m[aulaNombre] {
		if !permitido(lista, []string{b.ID}) {
			out = append(out, b)
		}
	}
	return out
}

// recursosServidor: memoria disponible (MiB) y disco libre (GiB) del host, para el botón «Iniciar WhatsApp».
func recursosServidor() (ramMiB int, discoGiB float64) {
	if b, err := os.ReadFile("/proc/meminfo"); err == nil {
		for _, l := range strings.Split(string(b), "\n") {
			if strings.HasPrefix(l, "MemAvailable:") {
				f := strings.Fields(l)
				if len(f) >= 2 {
					kb, _ := strconv.Atoi(f[1])
					ramMiB = kb / 1024
				}
			}
		}
	}
	var st syscall.Statfs_t
	if syscall.Statfs("/", &st) == nil {
		discoGiB = float64(st.Bavail) * float64(st.Bsize) / (1 << 30)
	}
	return
}

// recursosOK: con menos de 300 MiB de RAM o 1 GiB de disco no se arranca nada más (0 = no se pudo medir).
func recursosOK() (map[string]any, bool) {
	ram, disco := recursosServidor()
	ok := (ram == 0 || ram >= 300) && (disco == 0 || disco >= 1)
	return map[string]any{"ram_libre_mb": ram, "disco_libre_gb": float64(int(disco*10)) / 10, "ok": ok}, ok
}

// livePermitidosPut: PUT /api/v1/live/{lesson}/whatsapp/permitidos {"numeros":["+51 999 888 777", …]}.
func (s *Server) livePermitidosPut(w http.ResponseWriter, r *http.Request, p *Principal) {
	if s.liveLeccion(w, r, p) == nil {
		return
	}
	var in struct {
		Numeros []string `json:"numeros"`
	}
	if !readJSON(w, r, &in) {
		return
	}
	vistos := map[string]bool{}
	lista, avisos := []string{}, []string{}
	for _, n := range in.Numeros {
		for _, parte := range strings.FieldsFunc(n, func(r rune) bool { return r == ',' || r == ';' || r == '\n' }) {
			v, aviso := normalizarPermitido(parte)
			if aviso != "" {
				avisos = append(avisos, aviso)
			}
			if v != "" && !vistos[v] {
				vistos[v] = true
				lista = append(lista, v)
			}
		}
	}
	if len(lista) > maxPermitidos {
		writeErr(w, 422, "demasiados", "La lista admite hasta 30 números.")
		return
	}
	sort.Strings(lista)
	b, _ := json.Marshal(lista)
	if err := s.DB.SetSetting(r.Context(), clavePermitidos(aula.Nombre(p.ID)), string(b)); err != nil {
		internal(w, err)
		return
	}
	writeJSON(w, 200, map[string]any{"permitidos": lista, "avisos": avisos,
		"bloqueados": verBloqueados(aula.Nombre(p.ID), lista)})
}

// waRele: POST /api/v1/aula/wa/{nombre}/{firma}. Lo llama Evolution Go (sin sesión: la firma autentica).
// Responde 200 al instante y reenvía en segundo plano al backend del alumno solo los chats permitidos.
func (s *Server) waRele(w http.ResponseWriter, r *http.Request) {
	nombre, firma := r.PathValue("nombre"), r.PathValue("firma")
	wm, ok := s.Aula.(WhatsAppMotor)
	if !ok || !wm.WebhookValido(nombre, firma) {
		writeErr(w, 404, "no_encontrado", "no existe")
		return
	}
	raw, err := io.ReadAll(io.LimitReader(r.Body, 8<<20))
	if err != nil {
		writeErr(w, 400, "cuerpo", "cuerpo ilegible")
		return
	}
	writeJSON(w, 200, map[string]any{"ok": true})

	var ev map[string]any
	if json.Unmarshal(raw, &ev) != nil {
		return
	}
	data, _ := ev["data"].(map[string]any)
	info, _ := data["Info"].(map[string]any)
	if info != nil { // un mensaje: se filtra
		chat, _ := info["Chat"].(string)
		if strings.HasSuffix(chat, "@g.us") || strings.HasSuffix(chat, "@broadcast") || strings.HasSuffix(chat, "@newsletter") {
			return // el robot de la clase no contesta en grupos ni estados
		}
		var ids []string
		for _, k := range []string{"Chat", "Sender", "SenderAlt", "RecipientAlt"} {
			if v, _ := info[k].(string); v != "" {
				ids = append(ids, idDeJID(v))
			}
		}
		desdeMi, _ := info["IsFromMe"].(bool)
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		lista := s.leerPermitidos(ctx, nombre)
		cancel()
		if !desdeMi && !permitido(lista, ids) {
			quien := idDeJID(chat)
			if quien == "" && len(ids) > 0 {
				quien = ids[0]
			}
			push, _ := info["PushName"].(string)
			anotarBloqueado(nombre, bloqueado{ID: quien, Nombre: push, Hora: time.Now().UTC().Format(time.RFC3339)})
			return
		}
		// A quién responder, ya listo para «number» de /send/text: dígitos para un número, el JID completo para
		// un contacto con nombre de usuario (@lid). Es lo que más falla al escribir el bot a mano.
		if dest := idDeJID(chat); dest != "" {
			data["responder_a"] = dest
		} else {
			data["responder_a"] = chat
		}
		raw, _ = json.Marshal(ev)
	}
	go func(cuerpo []byte) {
		ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
		defer cancel()
		out, err := s.Aula.ExecTope(ctx, nombre,
			`curl -s -m 15 -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" --data-binary @- http://127.0.0.1:8766/api/webhook`,
			cuerpo, 18*time.Second)
		if err != nil {
			slog.Debug("relé WhatsApp: el backend del alumno no recibió", "aula", nombre, "salida", out, "err", err)
		}
	}(raw)
}

// waEstadoLista agrega la lista, los bloqueados y los recursos a la respuesta de liveWhatsApp.
func (s *Server) waEstadoLista(ctx context.Context, userID string) ([]string, []bloqueado) {
	n := aula.Nombre(userID)
	l := s.leerPermitidos(ctx, n)
	return l, verBloqueados(n, l)
}
