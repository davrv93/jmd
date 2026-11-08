package httpapi

import (
	"strings"
	"testing"
	"time"
)

func entradasMuro(t *testing.T, r resp) []map[string]any {
	t.Helper()
	raw, _ := r.body["entradas"].([]any)
	out := make([]map[string]any, 0, len(raw))
	for _, x := range raw {
		out = append(out, x.(map[string]any))
	}
	return out
}

// Muro con «me gusta»: id público sin el sub, alternar, nunca a la propia, orden por «me gusta» y
// las escenas viejas siguen leyendo los mismos campos.
func TestMuroMeGusta(t *testing.T) {
	e := newEnv(t)
	ana := e.alumnoCon("ana@x.test", "Ana Ruiz")
	beto := e.alumnoCon("beto@x.test", "Beto")
	caro := e.alumnoCon("caro@x.test", "Caro")
	const esc = "zz-muro-likes"
	t.Cleanup(func() { muroLive.Lock(); delete(muroLive.v["l1"], esc); muroLive.Unlock() })

	e.call("POST", "/api/v1/live/l1/muro", ana, false, map[string]any{"escena": esc, "texto": "hola de Ana"}, "")
	r := e.call("POST", "/api/v1/live/l1/muro", beto, false, map[string]any{"escena": esc, "texto": "hola de Beto"}, "")
	ents := entradasMuro(t, r)
	if r.code != 200 || len(ents) != 2 || ents[0]["texto"] != "hola de Beto" {
		t.Fatalf("muro: %d %s", r.code, r.raw)
	}
	// Compatibilidad: siguen nombre, texto, fecha y mia; se añaden id, likes y me_gusta.
	for _, k := range []string{"nombre", "texto", "fecha", "mia", "id", "likes", "me_gusta"} {
		if _, ok := ents[0][k]; !ok {
			t.Fatalf("falta %q: %s", k, r.raw)
		}
	}
	if strings.Contains(string(r.raw), `"sub"`) {
		t.Fatalf("el sub se filtra: %s", r.raw)
	}
	idAna := ents[1]["id"].(string)
	if ents[1]["nombre"] != "Ana R." || idAna == "" {
		t.Fatalf("entrada de Ana: %v", ents[1])
	}

	// No a la propia.
	if r := e.call("POST", "/api/v1/live/l1/muro/like", ana, false, map[string]any{"escena": esc, "id": idAna}, ""); r.code != 403 || errCode(r) != "propia" {
		t.Fatalf("me gusta propio: %d %s", r.code, r.raw)
	}
	// Alternar: Beto pone, quita, pone; Caro pone. Ana queda con 2 y sube al primer lugar con ?orden=likes.
	for i, want := range []float64{1, 0, 1} {
		r := e.call("POST", "/api/v1/live/l1/muro/like", beto, false, map[string]any{"escena": esc, "id": idAna}, "")
		en, _ := r.body["entrada"].(map[string]any)
		if r.code != 200 || en["likes"] != want || en["me_gusta"] != (want == 1) {
			t.Fatalf("vuelta %d: %d %s", i, r.code, r.raw)
		}
	}
	e.call("POST", "/api/v1/live/l1/muro/like", caro, false, map[string]any{"escena": esc, "id": idAna}, "")
	r = e.call("GET", "/api/v1/live/l1/muro?escena="+esc+"&orden=likes", caro, false, nil, "")
	ents = entradasMuro(t, r)
	if ents[0]["id"] != idAna || ents[0]["likes"] != float64(2) || ents[0]["me_gusta"] != true || ents[1]["me_gusta"] != false {
		t.Fatalf("orden por me gusta: %s", r.raw)
	}
	// Sin ?orden, la más nueva primero (como siempre).
	if ents := entradasMuro(t, e.call("GET", "/api/v1/live/l1/muro?escena="+esc, caro, false, nil, "")); ents[0]["texto"] != "hola de Beto" {
		t.Fatalf("orden por fecha: %v", ents)
	}

	// Republicar el mismo texto conserva id y «me gusta»; cambiarlo da otra entrada desde cero.
	r = e.call("POST", "/api/v1/live/l1/muro?orden=likes", ana, false, map[string]any{"escena": esc, "texto": "hola de Ana"}, "")
	if ents := entradasMuro(t, r); ents[0]["id"] != idAna || ents[0]["likes"] != float64(2) || ents[0]["mia"] != true {
		t.Fatalf("mismo texto: %s", r.raw)
	}
	r = e.call("POST", "/api/v1/live/l1/muro?orden=likes", ana, false, map[string]any{"escena": esc, "texto": "otra cosa"}, "")
	for _, en := range entradasMuro(t, r) {
		if en["mia"] == true && (en["id"] == idAna || en["likes"] != float64(0)) {
			t.Fatalf("texto nuevo: %s", r.raw)
		}
	}
	if r := e.call("POST", "/api/v1/live/l1/muro/like", beto, false, map[string]any{"escena": esc, "id": idAna}, ""); r.code != 404 {
		t.Fatalf("id viejo: %d", r.code)
	}
	if r := e.call("POST", "/api/v1/live/l1/muro/like", beto, false, map[string]any{"escena": esc}, ""); r.code != 400 {
		t.Fatalf("sin id: %d", r.code)
	}
	if r := e.call("POST", "/api/v1/live/l2/muro/like", beto, false, map[string]any{"escena": esc, "id": "x"}, ""); r.code != 404 {
		t.Fatalf("sesión en borrador: %d", r.code)
	}
}

// Cada cambio del muro (publicar, me gusta, vaciar) llega por el stream como evento «muro».
func TestMuroAvisaPorStream(t *testing.T) {
	e := newEnv(t)
	profe := e.login("profe@x.test", "profe1234")
	ana := e.alumnoCon("ana@x.test", "Ana")
	const esc = "zz-muro-stream"
	t.Cleanup(func() { muroLive.Lock(); delete(muroLive.v["l1"], esc); muroLive.Unlock() })

	salidas := make(chan []string, 1)
	clienteStream(t, e.srv.URL+"/api/v1/live/l1/stream", profe, 3, salidas)
	time.Sleep(300 * time.Millisecond)
	r := e.call("POST", "/api/v1/live/l1/muro", ana, false, map[string]any{"escena": esc, "texto": "hola"}, "")
	id := entradasMuro(t, r)[0]["id"].(string)
	e.call("POST", "/api/v1/live/l1/muro/like", profe, false, map[string]any{"escena": esc, "id": id}, "")
	select {
	case bs := <-salidas:
		n := 0
		for _, b := range bs {
			if strings.HasPrefix(b, "event: muro") && strings.Contains(b, `"escena":"`+esc+`"`) {
				n++
			}
		}
		if n != 2 {
			t.Fatalf("eventos muro: %v", bs)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("el stream no trajo los eventos")
	}
}
