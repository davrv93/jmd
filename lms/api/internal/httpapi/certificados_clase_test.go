package httpapi

import (
	"bytes"
	"encoding/csv"
	"image/png"
	"os"
	"strings"
	"testing"
)

// Insignias por clase: emisión con lesson_id, unicidad por (alumno, curso, clase), logro OB3 de
// la clase con alignment, SVG/PNG de la clase, credencial apuntando al logro de la clase y PDF
// como CONSTANCIA.
func TestInsigniaPorClase(t *testing.T) {
	e := newEnv(t)
	ptok := e.login("profe@x.test", "profe1234")
	ana := e.register("ana@x.test")
	var anaID string
	if r := e.call("GET", "/api/v1/me", ana, false, nil, ""); r.code == 200 {
		anaID = r.body["id"].(string)
	}

	// Clase inexistente → 404; clase de otro curso no se admite.
	if r := e.call("POST", "/api/v1/admin/certificados", ptok, false, map[string]any{"user_id": anaID, "course_id": "curso", "lesson_id": "nada"}, ""); r.code != 404 {
		t.Fatalf("clase inexistente: %d %s", r.code, r.raw)
	}
	// Emitir insignia de la clase 1 (l1): horas por defecto 2, título «Clase 1 · …», URLs de clase.
	r := e.call("POST", "/api/v1/admin/certificados", ptok, false, map[string]any{"user_id": anaID, "course_id": "curso", "lesson_id": "l1", "tipo": "participacion"}, "")
	if r.code != 201 {
		t.Fatalf("emitir clase: %d %s", r.code, r.raw)
	}
	code := r.body["codigo"].(string)
	if r.body["ambito"] != "clase" || r.body["lesson_id"] != "l1" || r.body["clase"] != "Clase 1 · Sesión publicada" || r.body["clase_num"].(float64) != 1 || r.body["horas"].(float64) != 2 {
		t.Fatalf("ficha de clase: %s", r.raw)
	}
	if r.body["url_insignia"] != "http://lms.test/api/v1/insignias/curso/l1.svg" || r.body["url_insignia_png"] != "http://lms.test/api/v1/insignias/curso/l1.png" {
		t.Fatalf("urls de insignia de clase: %s", r.raw)
	}
	// Unicidad por clase: repetir la clase 1 → 409; el certificado del curso sigue libre; otra clase también.
	if r = e.call("POST", "/api/v1/admin/certificados", ptok, false, map[string]any{"user_id": anaID, "course_id": "curso", "lesson_id": "l1"}, ""); r.code != 409 || r.body["codigo"] != code {
		t.Fatalf("duplicado por clase: %d %s", r.code, r.raw)
	}
	if r = e.call("POST", "/api/v1/admin/certificados", ptok, false, map[string]any{"user_id": anaID, "course_id": "curso"}, ""); r.code != 201 || r.body["ambito"] != "curso" || r.body["horas"].(float64) != 6 {
		t.Fatalf("certificado del curso con insignia previa: %d %s", r.code, r.raw)
	}
	if r = e.call("POST", "/api/v1/admin/certificados", ptok, false, map[string]any{"user_id": anaID, "course_id": "curso", "lesson_id": "l2"}, ""); r.code != 201 || r.body["clase_num"].(float64) != 2 {
		t.Fatalf("insignia clase 2: %d %s", r.code, r.raw)
	}
	// Mis certificados trae los tres; la verificación pública dice que es de clase.
	if r = e.call("GET", "/api/v1/certificados", ana, false, nil, ""); r.code != 200 || len(r.list) != 3 {
		t.Fatalf("mis certificados: %d %s", r.code, r.raw)
	}
	if r = e.call("GET", "/api/v1/verificar/"+code, "", false, nil, ""); r.code != 200 || r.body["ambito"] != "clase" || r.body["clase"] != "Clase 1 · Sesión publicada" {
		t.Fatalf("verificar clase: %d %s", r.code, r.raw)
	}

	// Logro OB3 de la clase: criterios, alignment con objetivos e imagen PNG.
	r = e.call("GET", "/api/v1/insignias/curso/l1.json", "", false, nil, "")
	if r.code != 200 || r.body["name"] != "Clase 1 · Sesión publicada" || r.body["id"] != "http://lms.test/api/v1/insignias/curso/l1.json" {
		t.Fatalf("logro de clase: %d %s", r.code, r.raw)
	}
	if img, _ := r.body["image"].(map[string]any); img["id"] != "http://lms.test/api/v1/insignias/curso/l1.png" {
		t.Fatalf("imagen del logro de clase: %s", r.raw)
	}
	if cr, _ := r.body["criteria"].(map[string]any); !strings.Contains(cr["narrative"].(string), "ciclo de aprendizaje") {
		t.Fatalf("criterios: %s", r.raw)
	}
	if al, _ := r.body["alignment"].([]any); len(al) != 1 || al[0].(map[string]any)["targetName"] != "Objetivo 1" {
		t.Fatalf("alignment: %s", r.raw)
	}
	if r = e.call("GET", "/api/v1/insignias/curso/nada.json", "", false, nil, ""); r.code != 404 {
		t.Fatalf("logro de clase inexistente: %d", r.code)
	}
	// SVG de clase con el número grande.
	r = e.call("GET", "/api/v1/insignias/curso/l1.svg", "", false, nil, "")
	if r.code != 200 || !strings.HasPrefix(r.hdr.Get("Content-Type"), "image/svg+xml") || !strings.Contains(string(r.raw), ">01<") || !strings.Contains(string(r.raw), "CLASE") {
		t.Fatalf("svg de clase: %d %s", r.code, r.raw[:min(len(r.raw), 300)])
	}
	// La credencial del certificado de clase apunta al logro de la clase.
	r = e.call("GET", "/api/v1/certificados/"+code+"/badge.json", "", false, nil, "")
	if r.code != 200 {
		t.Fatalf("badge.json clase: %d %s", r.code, r.raw)
	}
	ach := r.body["credentialSubject"].(map[string]any)["achievement"].(map[string]any)
	if ach["id"] != "http://lms.test/api/v1/insignias/curso/l1.json" || !strings.HasPrefix(r.body["name"].(string), "Insignia de clase · Clase 1") {
		t.Fatalf("credencial de clase: %s", r.raw)
	}
	if r = e.call("GET", "/api/v1/certificados/"+code+"/badge.jwt", "", false, nil, ""); r.code != 200 || len(strings.Split(strings.TrimSpace(string(r.raw)), ".")) != 3 {
		t.Fatalf("badge.jwt clase: %d", r.code)
	}
	// PDF: CONSTANCIA.
	r = e.call("GET", "/api/v1/certificados/"+code+"/pdf", "", false, nil, "")
	if r.code != 200 || !bytes.HasPrefix(r.raw, []byte("%PDF")) {
		t.Fatalf("pdf clase: %d", r.code)
	}
	if out := os.Getenv("LMS_PDF_CLASE_OUT"); out != "" {
		_ = os.WriteFile(out, r.raw, 0o644)
	}
	pdf, err := renderCertPDF(certPDFData{Codigo: "CD-2026-ABCDEF", Alumno: "Ana", Curso: "Curso", Tipo: "participacion", Horas: 2, Emisor: "E", RUC: "1", Base: "http://x", Clase: "Clase 1 · Sesión", ClaseNum: 1})
	if err != nil {
		t.Fatal(err)
	}
	// fpdf comprime los flujos; el título del documento va en claro en /Title.
	if !bytes.Contains(pdf, []byte("Constancia CD-2026-ABCDEF")) {
		t.Fatal("el PDF de clase debería titularse Constancia")
	}
}

// Emisión en lote: emite a los alumnos que faltan, omite los que ya tienen y, con
// solo_con_progreso, a quienes no marcaron ningún paso de la clase.
func TestEmisionEnLote(t *testing.T) {
	e := newEnv(t)
	ptok := e.login("profe@x.test", "profe1234")
	ana := e.register("ana@x.test")
	beto := e.register("beto@x.test")
	e.register("caro@x.test")
	ids := map[string]string{}
	for _, x := range []struct{ tok, email string }{{ana, "ana@x.test"}, {beto, "beto@x.test"}} {
		if r := e.call("GET", "/api/v1/me", x.tok, false, nil, ""); r.code == 200 {
			ids[x.email] = r.body["id"].(string)
		}
	}
	// Solo el personal.
	if r := e.call("POST", "/api/v1/admin/certificados/lote", ana, false, map[string]any{"course_id": "curso", "lesson_id": "l1"}, ""); r.code != 403 {
		t.Fatalf("lote como alumno: %d", r.code)
	}
	if r := e.call("POST", "/api/v1/admin/certificados/lote", ptok, false, map[string]any{"course_id": "curso", "lesson_id": "l1", "tipo": "raro"}, ""); r.code != 400 {
		t.Fatalf("lote con tipo raro: %d", r.code)
	}
	// Ana ya tiene la clase 1; solo Ana y Beto marcaron progreso.
	if r := e.call("POST", "/api/v1/admin/certificados", ptok, false, map[string]any{"user_id": ids["ana@x.test"], "course_id": "curso", "lesson_id": "l1"}, ""); r.code != 201 {
		t.Fatalf("emitir a ana: %d %s", r.code, r.raw)
	}
	for _, tok := range []string{ana, beto} {
		if r := e.call("PUT", "/api/v1/lessons/l1/progress/ver", tok, false, map[string]any{"done": true}, ""); r.code != 200 {
			t.Fatalf("progreso: %d %s", r.code, r.raw)
		}
	}
	r := e.call("POST", "/api/v1/admin/certificados/lote", ptok, false, map[string]any{"course_id": "curso", "lesson_id": "l1", "tipo": "participacion", "solo_con_progreso": true}, "")
	if r.code != 200 {
		t.Fatalf("lote: %d %s", r.code, r.raw)
	}
	em, _ := r.body["emitidos"].([]any)
	om, _ := r.body["omitidos"].([]any)
	if len(em) != 1 || em[0].(map[string]any)["email"] != "beto@x.test" || !reCode.MatchString(em[0].(map[string]any)["codigo"].(string)) {
		t.Fatalf("emitidos: %s", r.raw)
	}
	motivos := map[string]string{}
	for _, o := range om {
		m := o.(map[string]any)
		motivos[m["email"].(string)] = m["motivo"].(string)
	}
	if len(om) != 2 || !strings.Contains(motivos["ana@x.test"], "ya tiene") || !strings.Contains(motivos["caro@x.test"], "sin progreso") {
		t.Fatalf("omitidos: %s", r.raw)
	}
	// Sin el filtro de progreso: emite a Caro y omite a los otros dos; repetir no emite nada.
	r = e.call("POST", "/api/v1/admin/certificados/lote", ptok, false, map[string]any{"course_id": "curso", "lesson_id": "l1", "horas": 3}, "")
	em, _ = r.body["emitidos"].([]any)
	om, _ = r.body["omitidos"].([]any)
	if r.code != 200 || len(em) != 1 || em[0].(map[string]any)["email"] != "caro@x.test" || len(om) != 2 {
		t.Fatalf("lote sin filtro: %s", r.raw)
	}
	r = e.call("POST", "/api/v1/admin/certificados/lote", ptok, false, map[string]any{"course_id": "curso", "lesson_id": "l1"}, "")
	if em, _ = r.body["emitidos"].([]any); len(em) != 0 {
		t.Fatalf("repetir el lote debería no emitir: %s", r.raw)
	}
	// Lote del curso completo (sin lesson_id): tres emitidos; el personal no cuenta como alumno.
	r = e.call("POST", "/api/v1/admin/certificados/lote", ptok, false, map[string]any{"course_id": "curso", "tipo": "aprobacion"}, "")
	if em, _ = r.body["emitidos"].([]any); r.code != 200 || len(em) != 3 {
		t.Fatalf("lote del curso: %s", r.raw)
	}
	if r = e.call("GET", "/api/v1/admin/certificados?course=curso", ptok, false, nil, ""); len(r.list) != 6 {
		t.Fatalf("total de certificados: %d", len(r.list))
	}

	// Exportación CSV genérica: BOM, cabecera y una fila por insignia vigente de la clase.
	r = e.call("GET", "/api/v1/admin/certificados/export.csv?course=curso&lesson=l1", ptok, false, nil, "")
	if r.code != 200 || !strings.HasPrefix(r.hdr.Get("Content-Type"), "text/csv") || !bytes.HasPrefix(r.raw, []byte(bomUTF8)) {
		t.Fatalf("export.csv: %d %q %q", r.code, r.hdr.Get("Content-Type"), r.raw[:min(len(r.raw), 20)])
	}
	rows, err := csv.NewReader(bytes.NewReader(bytes.TrimPrefix(r.raw, []byte(bomUTF8)))).ReadAll()
	if err != nil {
		t.Fatal(err)
	}
	if strings.Join(rows[0], ",") != "codigo,nombre,apellido,email,insignia,emitido_en,url_verificacion,url_evidencia,url_insignia_png" {
		t.Fatalf("cabecera: %v", rows[0])
	}
	if len(rows) != 4 || rows[1][4] != "Clase 1 · Sesión publicada" || !strings.HasPrefix(rows[1][6], "http://lms.test/verificar/CD-") || !strings.HasSuffix(rows[1][8], "/insignias/curso/l1.png") || len(rows[1][5]) != 10 {
		t.Fatalf("filas: %v", rows)
	}
	// Formato Badgr / Canvas Credentials.
	r = e.call("GET", "/api/v1/admin/certificados/export-badgr.csv?course=curso&lesson=l1", ptok, false, nil, "")
	rows, _ = csv.NewReader(bytes.NewReader(bytes.TrimPrefix(r.raw, []byte(bomUTF8)))).ReadAll()
	if r.code != 200 || strings.Join(rows[0], ",") != "Identifier,First Name,Last Name,Narrative,Evidence Narrative,Evidence URL,Issue Date,Expiration Date" || len(rows) != 4 || !strings.Contains(rows[1][0], "@x.test") {
		t.Fatalf("export-badgr.csv: %d %v", r.code, rows)
	}
	// Sin lesson → certificados del curso completo (3); lesson=* → todos (6); curso desconocido → 400.
	r = e.call("GET", "/api/v1/admin/certificados/export.csv?course=curso", ptok, false, nil, "")
	if rows, _ = csv.NewReader(bytes.NewReader(bytes.TrimPrefix(r.raw, []byte(bomUTF8)))).ReadAll(); len(rows) != 4 || rows[1][4] != "Curso de prueba" {
		t.Fatalf("export del curso: %v", rows)
	}
	r = e.call("GET", "/api/v1/admin/certificados/export.csv?course=curso&lesson=*", ptok, false, nil, "")
	if rows, _ = csv.NewReader(bytes.NewReader(bytes.TrimPrefix(r.raw, []byte(bomUTF8)))).ReadAll(); len(rows) != 7 {
		t.Fatalf("export de todo: %d filas", len(rows))
	}
	if r = e.call("GET", "/api/v1/admin/certificados/export.csv?course=nada", ptok, false, nil, ""); r.code != 400 {
		t.Fatalf("export curso desconocido: %d", r.code)
	}
	if r = e.call("GET", "/api/v1/admin/certificados/export.csv?course=curso", ana, false, nil, ""); r.code != 403 {
		t.Fatalf("export como alumno: %d", r.code)
	}
}

// PNG de la insignia (curso y clase): image/png, firma PNG, 600x600 y píxel transparente en la
// esquina (fuera del hexágono).
func TestInsigniaPNG(t *testing.T) {
	e := newEnv(t)
	for _, path := range []string{"/api/v1/insignias/curso.png", "/api/v1/insignias/curso/l1.png"} {
		r := e.call("GET", path, "", false, nil, "")
		if r.code != 200 || r.hdr.Get("Content-Type") != "image/png" || !bytes.HasPrefix(r.raw, []byte("\x89PNG\r\n\x1a\n")) {
			t.Fatalf("%s: %d %q %d bytes", path, r.code, r.hdr.Get("Content-Type"), len(r.raw))
		}
		img, err := png.Decode(bytes.NewReader(r.raw))
		if err != nil {
			t.Fatalf("%s: %v", path, err)
		}
		if b := img.Bounds(); b.Dx() != 600 || b.Dy() != 600 {
			t.Fatalf("%s: tamaño %v", path, b)
		}
		if _, _, _, a := img.At(2, 2).RGBA(); a != 0 {
			t.Fatalf("%s: la esquina debería ser transparente", path)
		}
		if _, _, _, a := img.At(300, 300).RGBA(); a == 0 {
			t.Fatalf("%s: el centro debería estar pintado", path)
		}
		if out := os.Getenv("LMS_PNG_OUT"); out != "" && strings.Contains(path, "/l1") {
			_ = os.WriteFile(out, r.raw, 0o644)
		}
	}
	if r := e.call("GET", "/api/v1/insignias/nada.png", "", false, nil, ""); r.code != 404 {
		t.Fatalf("png de curso inexistente: %d", r.code)
	}
	if r := e.call("GET", "/api/v1/insignias/curso/nada.png", "", false, nil, ""); r.code != 404 {
		t.Fatalf("png de clase inexistente: %d", r.code)
	}
	if dir := os.Getenv("LMS_PNG_DIR"); dir != "" {
		titulos := []string{"Instalar las herramientas y entender qué hay detrás", "Construir un asistente con skills, plan de trabajo y Edge AI",
			"Llevar el asistente a WhatsApp: wireframe, UI, desarrollo, pruebas y despliegue"}
		for i, tt := range titulos {
			b, err := insigniaPNG(insigniaPNGData{Curso: "Programación agéntica (vibecoding)", Emisor: "Consultoría Digital", ClaseNum: i + 1, Clase: tt})
			if err != nil {
				t.Fatal(err)
			}
			_ = os.WriteFile(dir+"/clase-"+string(rune('0'+i+1))+".png", b, 0o644)
		}
		b, _ := insigniaPNG(insigniaPNGData{Curso: "Programación agéntica (vibecoding)", Emisor: "Consultoría Digital"})
		_ = os.WriteFile(dir+"/curso.png", b, 0o644)
	}
	if n, a := partirNombre("Ana María Quispe Huamán"); n != "Ana María" || a != "Quispe Huamán" {
		t.Fatalf("partirNombre: %q %q", n, a)
	}
	if n, a := partirNombre("Luis Pérez"); n != "Luis" || a != "Pérez" {
		t.Fatalf("partirNombre 2: %q %q", n, a)
	}
}
