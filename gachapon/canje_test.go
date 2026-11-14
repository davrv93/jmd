package main

import (
	"bytes"
	"encoding/json"
	"io/fs"
	"net/http/httptest"
	"testing"
	"time"
)

func sorteoConCupon(t *testing.T, descuento int) (*Sorteo, *Participante) {
	t.Helper()
	s := sorteoDePrueba(t, configBase(t))
	web, _ := fs.Sub(webFS, "web")
	var err error
	if s.cursosCanje, err = leerCursos(cursosCanjeJSON, web); err != nil {
		t.Fatal(err)
	}
	if s.cursos, err = leerCursos(cursosJSON, web); err != nil {
		t.Fatal(err)
	}
	s.ahora = func() time.Time { return time.Date(2026, 11, 8, 12, 0, 0, 0, lima) }
	p := &Participante{Nombre: "Raúl Gamboa", WhatsApp: "994697248", Descuento: descuento, Codigo: "JMD-90-HX695", Vence: "2026-11-15", Creado: time.Now()}
	s.lista = append(s.lista, p)
	s.porNumero[p.WhatsApp] = p
	s.porCodigo[p.Codigo] = p
	return s, p
}

func TestCanjeCatalogoSegunDescuento(t *testing.T) {
	s, p := sorteoConCupon(t, 90)
	if len(s.cursosDelCupon(p)) != len(s.cursosCanje) || len(s.cursosCanje) < 10 {
		t.Fatalf("un cupón de 90 %% debe ver el catálogo completo: %d", len(s.cursosDelCupon(p)))
	}
	p.Descuento = 30
	if len(s.cursosDelCupon(p)) != len(s.cursos) {
		t.Fatal("un cupón de 30 % solo ve el catálogo actual del gachapon")
	}
}

func TestCanjePideElNumeroCorrecto(t *testing.T) {
	s, _ := sorteoConCupon(t, 90)
	h := s.rutas()
	pedir := func(cuerpo map[string]string) int {
		b, _ := json.Marshal(cuerpo)
		w := httptest.NewRecorder()
		h.ServeHTTP(w, httptest.NewRequest("POST", "/api/canje", bytes.NewReader(b)))
		return w.Code
	}
	if c := pedir(map[string]string{"codigo": "jmd-90-hx695", "whatsapp": "911111111", "slug": "claude-code-pro"}); c != 403 {
		t.Fatalf("otro número: %d", c)
	}
	if c := pedir(map[string]string{"codigo": "JMD-90-HX695", "whatsapp": "994 697 248", "slug": "no-existe"}); c != 400 {
		t.Fatalf("curso inválido: %d", c)
	}
	if c := pedir(map[string]string{"codigo": "JMD-90-HX695", "whatsapp": "994 697 248", "slug": "claude-code-pro"}); c != 200 {
		t.Fatalf("canje bueno: %d", c)
	}
	if s.porCodigo["JMD-90-HX695"].Eleccion == nil || s.porCodigo["JMD-90-HX695"].Eleccion.Slug != "claude-code-pro" {
		t.Fatal("no guardó la elección")
	}
	w := httptest.NewRecorder()
	h.ServeHTTP(w, httptest.NewRequest("GET", "/api/canje?c=JMD-90-HX695", nil))
	if w.Code != 200 || !bytes.Contains(w.Body.Bytes(), []byte(`"eleccion":"claude-code-pro"`)) || bytes.Contains(w.Body.Bytes(), []byte("994697248")) {
		t.Fatalf("GET canje: %d %s", w.Code, w.Body.String()[:200])
	}
}

func TestCanjeVencido(t *testing.T) {
	s, _ := sorteoConCupon(t, 90)
	s.ahora = func() time.Time { return time.Date(2026, 11, 16, 9, 0, 0, 0, lima) }
	if _, _, err := s.elegirCurso("JMD-90-HX695", "994697248", "claude-code-pro"); err != errVencido {
		t.Fatalf("quiero errVencido, salió %v", err)
	}
}
