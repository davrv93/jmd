package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http/httptest"
	"testing"
)

func TestGanadoresDeterministasYSinRepetir(t *testing.T) {
	nums := []int{5, 1, 3, 2, 4, 6, 7}
	a := elegirGanadores("abc", nums, 3)
	b := elegirGanadores("abc", nums, 3)
	if fmt.Sprint(a) != fmt.Sprint(b) || len(a) != 3 {
		t.Fatalf("no determinista: %v %v", a, b)
	}
	vistos := map[int]bool{}
	for _, n := range a {
		if vistos[n] {
			t.Fatalf("repetido: %v", a)
		}
		vistos[n] = true
	}
	if fmt.Sprint(elegirGanadores("otra", nums, 3)) == fmt.Sprint(a) && fmt.Sprint(elegirGanadores("tercera", nums, 3)) == fmt.Sprint(a) {
		t.Fatal("la semilla no cambia nada")
	}
}

func TestPenales(t *testing.T) {
	for n := 1; n <= 300; n++ {
		semilla := fmt.Sprintf("s%d", n)
		for _, tiro := range penales(semilla, n, true) {
			if tiro.Resultado != "gol" || tiro.Arquero == tiro.Lado {
				t.Fatalf("ganador %d con %+v", n, tiro)
			}
		}
		fallos := 0
		for _, tiro := range penales(semilla, n, false) {
			if tiro.Resultado != "gol" {
				fallos++
			}
			if tiro.Resultado == "atajada" && tiro.Arquero != tiro.Lado {
				t.Fatalf("atajada sin arquero en el lado: %+v", tiro)
			}
		}
		if fallos == 0 {
			t.Fatalf("el número %d sin ganar metió los 3", n)
		}
	}
}

func TestFlujo(t *testing.T) {
	s := &Servidor{archivo: t.TempDir() + "/estado.json", clave: "clave-de-prueba-123", porIP: map[string]int{}, e: Estado{Edicion: 1, Titulo: "Prueba", Fase: "inscripcion", Ganadores: 3}}
	h := s.rutas()
	pedir := func(metodo, ruta string, cuerpo any, admin bool) (int, map[string]any) {
		b, _ := json.Marshal(cuerpo)
		r := httptest.NewRequest(metodo, ruta, bytes.NewReader(b))
		r.Header.Set("X-Real-IP", "1.2.3."+fmt.Sprint(len(ruta)%7))
		if admin {
			r.Header.Set("X-Clave", "clave-de-prueba-123")
		}
		w := httptest.NewRecorder()
		h.ServeHTTP(w, r)
		var out map[string]any
		_ = json.Unmarshal(w.Body.Bytes(), &out)
		return w.Code, out
	}
	nombres := []string{"Ana Pérez", "Luis Soto", "María Quispe", "José Ñahui", "Rosa Lima"}
	tokens := []string{}
	for _, n := range nombres {
		code, out := pedir("POST", "/api/inscribir", map[string]string{"nombre": n}, false)
		if code != 200 {
			t.Fatalf("%s: %d %v", n, code, out)
		}
		tokens = append(tokens, out["t"].(string))
	}
	if code, _ := pedir("POST", "/api/inscribir", map[string]string{"nombre": "ana  pérez"}, false); code != 409 {
		t.Fatalf("duplicado aceptado: %d", code)
	}
	if code, _ := pedir("POST", "/api/inscribir", map[string]string{"nombre": "Ana"}, false); code != 400 {
		t.Fatalf("sin apellido aceptado: %d", code)
	}
	if code, _ := pedir("POST", "/api/admin/sortear", nil, true); code != 409 {
		t.Fatal("sorteó sin cerrar")
	}
	if code, _ := pedir("POST", "/api/admin/cerrar", map[string]int{"ganadores": 3}, false); code != 401 {
		t.Fatal("cerró sin clave")
	}
	_, cerrado := pedir("POST", "/api/admin/cerrar", map[string]int{"ganadores": 3}, true)
	if cerrado["semilla"] != nil || cerrado["compromiso"] == "" {
		t.Fatalf("la semilla se filtró antes de sortear: %v", cerrado)
	}
	if code, _ := pedir("POST", "/api/inscribir", map[string]string{"nombre": "Tarde Mucho"}, false); code != 409 {
		t.Fatal("inscribió con el sorteo cerrado")
	}
	_, sorteado := pedir("POST", "/api/admin/sortear", nil, true)
	if sha(sorteado["semilla"].(string)) != cerrado["compromiso"] {
		t.Fatal("la semilla no cumple el compromiso")
	}
	if len(sorteado["resultado"].([]any)) != 3 {
		t.Fatalf("resultado: %v", sorteado["resultado"])
	}
	gana := 0
	for _, tk := range tokens {
		_, e := pedir("GET", "/api/estado?t="+tk, nil, false)
		if e["gane"] == true {
			gana++
		}
		if len(e["misPenales"].([]any)) != 3 {
			t.Fatal("sin penales")
		}
	}
	if gana != 3 {
		t.Fatalf("ganan %d", gana)
	}
}

func TestCurso(t *testing.T) {
	dir := t.TempDir()
	s := &Servidor{archivo: dir + "/estado.json", clave: "clave-de-prueba-123", porIP: map[string]int{}, curso: Curso{archivo: dir + "/curso.json"},
		e: Estado{Edicion: 1, Fase: "sorteado", Ganadores: 1, Resultado: []int{7},
			Participantes: []Participante{{Numero: 7, Nombre: "José Pérez", Token: "tok7"}, {Numero: 8, Nombre: "Otro Jugador", Token: "tok8"}}}}
	s.curso.cargar()
	h := s.rutas()
	post := func(cuerpo map[string]string) (int, map[string]any) {
		b, _ := json.Marshal(cuerpo)
		w := httptest.NewRecorder()
		h.ServeHTTP(w, httptest.NewRequest("POST", "/api/curso", bytes.NewReader(b)))
		var out map[string]any
		_ = json.Unmarshal(w.Body.Bytes(), &out)
		return w.Code, out
	}
	casos := []struct {
		nombre, correo, dorsal string
		code                   int
	}{
		{"Jose Perez", "ana@", "7", 400},
		{"Jose Perez", "jose@correo.com", "", 400},
		{"Otro Jugador", "otro@correo.com", "8", 403},
	}
	for _, c := range casos {
		if code, out := post(map[string]string{"nombre": c.nombre, "correo": c.correo, "dorsal": c.dorsal}); code != c.code {
			t.Fatalf("%+v: %d %v", c, code, out)
		}
	}
	if c, out := post(map[string]string{"nombre": "jose  PEREZ", "correo": "Jose@Correo.com", "dorsal": "7", "t": "tok7"}); c != 200 || out["ganador"] != true {
		t.Fatalf("ganador: %d %v", c, out)
	}
	if c, _ := post(map[string]string{"nombre": "José Pérez", "correo": "ladron@correo.com", "dorsal": "7"}); c != 409 {
		t.Fatalf("segundo reclamo aceptado: %d", c)
	}
	if c, out := post(map[string]string{"nombre": "José Pérez", "correo": "jose@correo.com", "dorsal": "7"}); c != 200 || out["repetido"] != true {
		t.Fatalf("repetido: %d %v", c, out)
	}
	if len(s.curso.lista) != 1 || !s.curso.lista[0].Verificado || !s.curso.lista[0].Parecido || s.curso.lista[0].NombreSorteo != "José Pérez" {
		t.Fatalf("lista: %+v", s.curso.lista)
	}
	otra := Curso{archivo: dir + "/curso.json"}
	otra.cargar()
	if len(otra.lista) != 1 {
		t.Fatal("no se guardó en disco")
	}
	w := httptest.NewRecorder()
	r := httptest.NewRequest("GET", "/api/admin/curso?formato=csv", nil)
	r.Header.Set("X-Clave", "clave-de-prueba-123")
	h.ServeHTTP(w, r)
	if !bytes.Contains(w.Body.Bytes(), []byte("jose@correo.com,7,José Pérez,sí,sí")) {
		t.Fatalf("csv: %s", w.Body.String())
	}
}

func TestNombreDistintoNoBloquea(t *testing.T) {
	if !compartenPalabra("Jack Castillo", "jack castillo ramos") || compartenPalabra("Jack Castillo", "Juan Pérez") {
		t.Fatal("compartenPalabra")
	}
}
