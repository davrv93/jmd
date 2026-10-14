package httpapi

import (
	"testing"
)

// Ficha del curso: proyecto final, requisitos y objetivos de cada clase en el detalle del curso.
func TestFichaDelCurso(t *testing.T) {
	e := newEnv(t)
	ana := e.register("ana@x.test")
	r := e.call("GET", "/api/v1/courses/curso", ana, false, nil, "")
	if r.code != 200 || r.body["proyecto_final"] != "Un chatbot que responde por WhatsApp" {
		t.Fatalf("proyecto_final: %d %s", r.code, r.raw)
	}
	if req, _ := r.body["requisitos"].([]any); len(req) != 2 || req[1] != "Una cuenta de GitHub" {
		t.Fatalf("requisitos: %s", r.raw)
	}
	if _, ok := r.body["dedicacion"]; !ok {
		t.Fatalf("dedicacion debe venir (vacía): %s", r.raw)
	}
	l := r.body["modules"].([]any)[0].(map[string]any)["lessons"].([]any)[0].(map[string]any)
	if objs, _ := l["objetivos"].([]any); len(objs) != 1 || objs[0] != "Objetivo 1" {
		t.Fatalf("objetivos de la clase: %v", l)
	}
}

// Calificación por criterio: la nota es la suma de los niveles, se guarda el detalle y el alumno
// lo ve en su entrega; los niveles fuera de rango y el número de criterios se validan.
func TestCalificacionPorCriterio(t *testing.T) {
	e := newEnv(t)
	ptok := e.login("profe@x.test", "profe1234")
	ana := e.register("ana@x.test")
	r := e.call("POST", "/api/v1/assignments/t1/submissions", ana, false, map[string]string{"repo_url": "https://github.com/ana/clase-01", "commit_sha": "abcdef1"}, "")
	if r.code != 201 {
		t.Fatalf("entregar: %d %s", r.code, r.raw)
	}
	sid := r.body["id"].(string)
	// Validaciones: nivel fuera de rango y criterios de más.
	if r = e.call("POST", "/api/v1/submissions/"+sid+"/grade", ptok, false, map[string]any{"criterios": []map[string]any{{"nivel": 5}}}, ""); r.code != 400 {
		t.Fatalf("nivel fuera de rango: %d %s", r.code, r.raw)
	}
	if r = e.call("POST", "/api/v1/submissions/"+sid+"/grade", ptok, false, map[string]any{"criterios": []map[string]any{{"nivel": 1}, {"nivel": 0}}}, ""); r.code != 400 {
		t.Fatalf("criterios de más: %d %s", r.code, r.raw)
	}
	// Calificar: C1 en «sí» (10 puntos) con una nota; el score enviado se ignora.
	r = e.call("POST", "/api/v1/submissions/"+sid+"/grade", ptok, false, map[string]any{"score": 3, "feedback_md": "Bien", "criterios": []map[string]any{{"nivel": 1, "nota": " claro "}}}, "")
	if r.code != 200 || r.body["score"].(float64) != 10 || r.body["status"] != "graded" {
		t.Fatalf("calificar por criterio: %d %s", r.code, r.raw)
	}
	rub := r.body["rubrica"].([]any)
	c := rub[0].(map[string]any)
	if len(rub) != 1 || c["criterio"] != "C1" || c["titulo"] != "sí" || c["puntos"].(float64) != 10 || c["max"].(float64) != 10 || c["mejor"] != "sí" || c["nota"] != "claro" {
		t.Fatalf("detalle: %s", r.raw)
	}
	// El alumno lo ve en su entrega.
	r = e.call("GET", "/api/v1/assignments/t1/submissions", ana, false, nil, "")
	if r.code != 200 || len(r.list) != 1 {
		t.Fatalf("mis entregas: %d %s", r.code, r.raw)
	}
	if rr, _ := r.list[0]["rubrica"].([]any); len(rr) != 1 {
		t.Fatalf("rubrica en mis entregas: %s", r.raw)
	}
	// Nota global sin criterios sigue funcionando y deja la rúbrica vacía.
	r = e.call("POST", "/api/v1/submissions/"+sid+"/grade", ptok, false, map[string]any{"score": 7, "feedback_md": "ok"}, "")
	if r.code != 200 || r.body["score"].(float64) != 7 || len(r.body["rubrica"].([]any)) != 0 {
		t.Fatalf("nota global: %d %s", r.code, r.raw)
	}
}
