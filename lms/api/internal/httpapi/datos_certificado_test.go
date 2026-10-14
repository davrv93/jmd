package httpapi

import (
	"strings"
	"testing"
)

// Datos para el certificado: el alumno guarda su nombre completo y correo, se validan, el
// certificado sale con ese nombre y el instructor los descarga en CSV con los pendientes primero.
func TestDatosCertificado(t *testing.T) {
	e := newEnv(t)
	ptok := e.login("profe@x.test", "profe1234")
	ana := e.register("ana@x.test")
	beto := e.register("beto@x.test")
	anaID := e.call("GET", "/api/v1/me", ana, false, nil, "").body["id"].(string)

	// Sin datos: vacío y con la cuenta como sugerencia.
	r := e.call("GET", "/api/v1/mis-datos-certificado", ana, false, nil, "")
	if r.code != 200 || r.body["completo"] != false || r.body["sugerido_correo"] != "ana@x.test" {
		t.Fatalf("sin datos: %d %s", r.code, r.raw)
	}
	// Validaciones.
	for _, in := range []map[string]any{
		{"nombre": "Ana", "correo": "ana@x.test"},                      // una sola palabra
		{"nombre": "Ana María 2", "correo": "ana@x.test"},              // dígitos
		{"nombre": "Ana María Pérez", "correo": "no-es-correo"},        // correo inválido
		{"nombre": "Ana María Pérez", "correo": "ana@x.test", "x": 1}, // campo desconocido
	} {
		if r = e.call("PUT", "/api/v1/mis-datos-certificado", ana, false, in, ""); r.code != 400 {
			t.Fatalf("debió rechazar %v: %d %s", in, r.code, r.raw)
		}
	}
	// Guardar: espacios de más fuera, correo en minúsculas.
	r = e.call("PUT", "/api/v1/mis-datos-certificado", ana, false, map[string]any{"nombre": "  Ana   María Pérez O'Neill ", "correo": " Ana.Perez@Gmail.com "}, "")
	if r.code != 200 || r.body["nombre"] != "Ana María Pérez O'Neill" || r.body["correo"] != "ana.perez@gmail.com" || r.body["completo"] != true {
		t.Fatalf("guardar: %d %s", r.code, r.raw)
	}
	// Sin sesión no hay datos.
	if r = e.call("GET", "/api/v1/mis-datos-certificado", "", false, nil, ""); r.code != 401 {
		t.Fatalf("sin sesión: %d", r.code)
	}
	// El certificado sale con el nombre completo confirmado.
	r = e.call("POST", "/api/v1/admin/certificados", ptok, false, map[string]any{"user_id": anaID, "course_id": "curso", "tipo": "participacion"}, "")
	if r.code != 201 || r.body["alumno"] != "Ana María Pérez O'Neill" {
		t.Fatalf("certificado con nombre completo: %d %s", r.code, r.raw)
	}
	// CSV: solo staff; pendientes primero; BOM para Excel.
	if r = e.call("GET", "/api/v1/admin/certificados/datos.csv", beto, false, nil, ""); r.code != 403 {
		t.Fatalf("alumno no descarga: %d", r.code)
	}
	r = e.call("GET", "/api/v1/admin/certificados/datos.csv", ptok, false, nil, "")
	if r.code != 200 || !strings.HasPrefix(string(r.raw), bomUTF8+"estado,nombre_completo,correo_certificado") {
		t.Fatalf("csv: %d %s", r.code, r.raw)
	}
	lineas := strings.Split(strings.TrimSpace(strings.TrimPrefix(string(r.raw), bomUTF8)), "\n")
	if len(lineas) != 3 || !strings.HasPrefix(lineas[1], "pendiente,,,") || !strings.Contains(lineas[1], "beto@x.test") ||
		!strings.HasPrefix(lineas[2], "listo,Ana María Pérez O'Neill,ana.perez@gmail.com") {
		t.Fatalf("filas: %q", lineas)
	}
}
