// Formulario de opinión de JMD Learning: cada WhatsApp opina una vez, recibe su número y entra al sorteo de OpenCode Go.
// Se guarda aparte de los cupones y deja de recibir a la hora de cierre.
package main

import (
	"encoding/json"
	"errors"
	"io/fs"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"
	"unicode/utf8"
)

// Hora de cierre de las opiniones: viernes 6 de noviembre de 2026, 6:00 p. m. de Lima.
var finOpiniones = time.Date(2026, 11, 6, 18, 0, 0, 0, lima)

const maxOpinionesPorIP = 20

type Opinion struct {
	Nombre   string    `json:"nombre"`
	WhatsApp string    `json:"whatsapp"`
	Texto    string    `json:"texto"`
	Creado   time.Time `json:"creado"`
	IP       string    `json:"ip"`
}

type Opiniones struct {
	mu      sync.Mutex
	archivo string
	lista   []*Opinion
	ahora   func() time.Time
}

func cargarOpiniones(archivo string) (*Opiniones, error) {
	o := &Opiniones{archivo: archivo, ahora: time.Now}
	b, err := os.ReadFile(archivo)
	if errors.Is(err, fs.ErrNotExist) {
		return o, nil
	}
	if err != nil {
		return nil, err
	}
	return o, json.Unmarshal(b, &o.lista)
}

func (o *Opiniones) guardar() error {
	b, err := json.MarshalIndent(o.lista, "", " ")
	if err != nil {
		return err
	}
	tmp := o.archivo + ".tmp"
	if err := os.WriteFile(tmp, b, 0o600); err != nil {
		return err
	}
	return os.Rename(tmp, o.archivo)
}

func (o *Opiniones) abierto() bool { return o.ahora().Before(finOpiniones) }

// agregar devuelve el número de sorteo (orden de llegada). repetido = true si ese WhatsApp ya opinó: conserva la primera opinión.
func (o *Opiniones) agregar(nombre, numero, texto, ip string) (sorteo int, repetido bool, err error) {
	o.mu.Lock()
	defer o.mu.Unlock()
	desdeIP := 0
	for i, x := range o.lista {
		if x.WhatsApp == numero {
			return i + 1, true, nil
		}
		if x.IP == ip {
			desdeIP++
		}
	}
	if !o.abierto() {
		return 0, false, errCerrado
	}
	if desdeIP >= maxOpinionesPorIP {
		return 0, false, errMuchas
	}
	o.lista = append(o.lista, &Opinion{Nombre: nombre, WhatsApp: numero, Texto: texto, Creado: o.ahora().UTC().Truncate(time.Second), IP: ip})
	if err := o.guardar(); err != nil {
		o.lista = o.lista[:len(o.lista)-1]
		log.Printf("guardar opinión: %v", err)
		return 0, false, errGuardar
	}
	return len(o.lista), false, nil
}

func (s *Sorteo) rutasOpinion(mux *http.ServeMux, o *Opiniones, web fs.FS) {
	mux.HandleFunc("GET /opinion", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-cache")
		http.ServeFileFS(w, r, web, "opinion.html")
	})
	mux.HandleFunc("GET /api/opinion/estado", func(w http.ResponseWriter, r *http.Request) {
		responder(w, 200, map[string]any{"abierto": o.abierto()})
	})
	mux.HandleFunc("POST /api/opinion", func(w http.ResponseWriter, r *http.Request) {
		var p struct {
			Nombre   string `json:"nombre"`
			WhatsApp string `json:"whatsapp"`
			Texto    string `json:"texto"`
		}
		r.Body = http.MaxBytesReader(w, r.Body, 4<<10)
		if json.NewDecoder(r.Body).Decode(&p) != nil {
			fallo(w, 400, "formulario", "No pudimos leer tus datos. Vuelve a intentarlo.")
			return
		}
		nombre := limpiarNombre(p.Nombre)
		if !nombreBueno(nombre) {
			fallo(w, 400, "nombre", "Escribe tu nombre, solo con letras (de 2 a 40).")
			return
		}
		numero, ok := limpiarNumero(p.WhatsApp)
		if !ok {
			fallo(w, 400, "whatsapp", "Escribe tu WhatsApp: 9 dígitos y empieza con 9.")
			return
		}
		texto := strings.TrimSpace(p.Texto)
		if k := utf8.RuneCountInString(texto); k < 10 || k > 1000 {
			fallo(w, 400, "texto", "Cuéntanos tu opinión en 10 a 1000 caracteres.")
			return
		}
		sorteo, repetido, err := o.agregar(nombre, numero, texto, ipDe(r))
		switch {
		case errors.Is(err, errCerrado):
			fallo(w, 409, "cerrado", "El plazo para opinar ya terminó. ¡Gracias por tu interés!")
		case errors.Is(err, errMuchas):
			fallo(w, 429, "conexion", "Hubo muchas opiniones desde esta conexión. Prueba con tus datos móviles.")
		case err != nil:
			fallo(w, 500, "servidor", "No pudimos guardar tu opinión. Vuelve a intentarlo en un momento.")
		default:
			responder(w, 200, map[string]any{"numero": sorteo, "repetido": repetido})
		}
	})
	mux.HandleFunc("GET /api/admin/opiniones", func(w http.ResponseWriter, r *http.Request) {
		if !s.esAdmin(r) {
			fallo(w, 401, "clave", "Clave incorrecta.")
			return
		}
		o.mu.Lock()
		defer o.mu.Unlock()
		responder(w, 200, map[string]any{"total": len(o.lista), "opiniones": o.lista})
	})
}
