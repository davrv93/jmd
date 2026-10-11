package skills

import (
	"regexp"
	"strings"
)

// Cabecera lee name y description del front matter, igual que jmd (src/bin/jmd/skills.rs, `parse`):
// líneas «clave: valor» entre los dos «---», con o sin comillas. ok es false si no hay front matter.
func Cabecera(texto string) (nombre, descripcion string, ok bool) {
	cab, _ := partir(texto)
	if cab == "" {
		return "", "", false
	}
	for _, l := range strings.Split(cab, "\n") {
		l = strings.TrimSpace(l)
		if v, found := strings.CutPrefix(l, "name:"); found && nombre == "" {
			nombre = limpiar(v)
		} else if v, found := strings.CutPrefix(l, "description:"); found && descripcion == "" {
			descripcion = limpiar(v)
		}
	}
	return nombre, descripcion, true
}

func limpiar(v string) string {
	return strings.Trim(strings.TrimSpace(v), `"'`)
}

var reName = regexp.MustCompile(`(?m)^name:.*$`)

// ConNombre devuelve el texto con el name del front matter cambiado (para copiar con otro nombre).
func ConNombre(texto, nombre string) string {
	cab, cuerpo := partir(texto)
	if cab == "" {
		return texto
	}
	return reName.ReplaceAllLiteralString(cab, "name: "+nombre) + cuerpo
}
