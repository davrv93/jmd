// Package skills sabe qué necesita cada familia de modelos para obedecer una skill y genera, sin
// llamar a ningún modelo, la variante de una skill para cada perfil. Los perfiles salen de la
// matriz de adaptación del taller (skills/_perfiles/MODELOS.md): longitud (completa o corta),
// rol al inicio, formato de salida al final, reglas negativas agrupadas y listas numeradas.
package skills

import (
	"regexp"
	"strconv"
	"strings"
)

// Perfil describe cómo se le entrega una skill a una familia de modelos.
type Perfil struct {
	ID, Nombre     string
	Longitud       string // "completa" | "corta"
	Rol            bool   // antepone «Rol:» y «Formato de salida:»
	FormatoAlFinal bool   // última línea con el formato obligatorio
	Prohibido      bool   // agrupa las reglas negativas bajo «Prohibido:»
	ListaNumerada  bool   // viñetas -> lista numerada
	MaxLineas      int    // tope de líneas del cuerpo (0 = sin tope)
}

// Perfiles son todos los perfiles conocidos, en el orden en que se muestran.
var Perfiles = []Perfil{
	{ID: "claude", Nombre: "Claude", Longitud: "completa"},
	{ID: "gpt", Nombre: "GPT y similares", Longitud: "completa", FormatoAlFinal: true},
	{ID: "deepseek", Nombre: "DeepSeek", Longitud: "corta", ListaNumerada: true, FormatoAlFinal: true},
	{ID: "glm", Nombre: "GLM", Longitud: "corta", ListaNumerada: true, FormatoAlFinal: true},
	{ID: "nemotron", Nombre: "Nemotron", Longitud: "corta", Rol: true, Prohibido: true},
	{ID: "ollama-pequeno", Nombre: "Modelo pequeño local", Longitud: "corta", Rol: true, FormatoAlFinal: true, MaxLineas: 25},
}

// PerfilPorID devuelve el perfil con ese id.
func PerfilPorID(id string) (Perfil, bool) {
	for _, p := range Perfiles {
		if p.ID == id {
			return p, true
		}
	}
	return Perfil{}, false
}

var tamanoB = regexp.MustCompile(`(\d+(?:[.,]\d+)?)b(?:[^a-z]|$)`)

// PerfilDeModelo elige el perfil de un id de modelo (p. ej. «qwen3:1.7b», «deepseek-flash»).
func PerfilDeModelo(modeloID string) string {
	m := strings.ToLower(modeloID)
	switch {
	case strings.Contains(m, "deepseek"):
		return "deepseek"
	case strings.Contains(m, "glm"):
		return "glm"
	case strings.Contains(m, "nemotron"):
		return "nemotron"
	}
	if strings.Contains(m, "qwen") || strings.Contains(m, "gemma") || strings.Contains(m, "llama") {
		if g := tamanoB.FindStringSubmatch(m); g != nil {
			if n, err := strconv.ParseFloat(strings.Replace(g[1], ",", ".", 1), 64); err == nil && n <= 4 {
				return "ollama-pequeno"
			}
		}
	}
	switch {
	case strings.Contains(m, "claude"):
		return "claude"
	case strings.Contains(m, "gpt"), strings.Contains(m, "kimi"), strings.Contains(m, "minimax"), strings.Contains(m, "qwen3-235b"):
		return "gpt"
	}
	return "deepseek"
}

const (
	tituloCorta    = "## Versión corta para modelos pequeños"
	lineaRol       = "Rol: asistente técnico que sigue estas reglas."
	lineaFormatoRo = "Formato de salida: pasos numerados en español, sin saludos."
	lineaFormato   = "Formato de salida obligatorio: lista numerada, un verbo por paso, en español."
)

// Variantes genera la variante de la skill para todos los perfiles (clave = id del perfil).
func Variantes(cuerpo string) map[string]string {
	out := make(map[string]string, len(Perfiles))
	for _, p := range Perfiles {
		out[p.ID] = Variante(cuerpo, p)
	}
	return out
}

// partir separa el front matter (con sus «---», o "" si no hay) del cuerpo.
func partir(texto string) (cabecera, cuerpo string) {
	t := strings.ReplaceAll(texto, "\r\n", "\n")
	if !strings.HasPrefix(t, "---\n") {
		return "", t
	}
	i := strings.Index(t[4:], "\n---")
	if i < 0 {
		return "", t
	}
	fin := 4 + i + len("\n---")
	if j := strings.IndexByte(t[fin:], '\n'); j >= 0 {
		fin += j + 1
	} else {
		fin = len(t)
	}
	return t[:fin], t[fin:]
}

// seccion devuelve el rango de líneas [desde, hasta) de la sección «## título» (hasta el siguiente «## »).
func seccion(lineas []string, prefijo string) (int, int) {
	enCodigo := false
	desde := -1
	for i, l := range lineas {
		if strings.HasPrefix(l, "```") {
			enCodigo = !enCodigo
		}
		if enCodigo || !strings.HasPrefix(l, "## ") {
			continue
		}
		titulo := strings.ToLower(strings.TrimSpace(l[3:]))
		if desde >= 0 {
			return desde, i
		}
		if strings.HasPrefix(titulo, prefijo) {
			desde = i
		}
	}
	if desde >= 0 {
		return desde, len(lineas)
	}
	return -1, -1
}

// cortar deja la parte corta del cuerpo: la «Versión corta…» hasta el final; si no existe, desde
// «Principios» (o «Procedimiento») hasta el final de «Reglas duras»; si tampoco, el cuerpo entero.
func cortar(cuerpo string) string {
	lineas := strings.Split(cuerpo, "\n")
	if i, _ := seccion(lineas, "versión corta"); i >= 0 {
		return strings.Join(lineas[i:], "\n")
	}
	ini, _ := seccion(lineas, "principios")
	if ini < 0 {
		ini, _ = seccion(lineas, "procedimiento")
	}
	_, fin := seccion(lineas, "reglas duras")
	if ini >= 0 && fin > ini {
		return strings.TrimRight(strings.Join(lineas[ini:fin], "\n"), "\n") + "\n"
	}
	return cuerpo
}

var (
	reMarca   = regexp.MustCompile(`^(\s*)(?:[-*]|\d+\.)\s+`)
	reViñeta  = regexp.MustCompile(`^- (\S.*)$`)
	reNumerad = regexp.MustCompile(`^\d+\. `)
	reNegativ = regexp.MustCompile(`^(?:Nunca|No)\b`)
)

// enCodigo marca qué líneas están dentro de un bloque de código (incluidas las cercas).
func enCodigo(lineas []string) []bool {
	r := make([]bool, len(lineas))
	dentro := false
	for i, l := range lineas {
		if strings.HasPrefix(strings.TrimSpace(l), "```") {
			r[i] = true
			dentro = !dentro
			continue
		}
		r[i] = dentro
	}
	return r
}

// renumerar recorre las listas numeradas y las deja 1., 2., 3. sin saltos.
func renumerar(lineas []string) []string {
	cod := enCodigo(lineas)
	n := 0
	for i, l := range lineas {
		if cod[i] {
			n = 0
			continue
		}
		if reNumerad.MatchString(l) {
			n++
			lineas[i] = strconv.Itoa(n) + ". " + reNumerad.ReplaceAllString(l, "")
		} else if strings.TrimSpace(l) != "" && !strings.HasPrefix(l, " ") {
			n = 0
		}
	}
	return lineas
}

// agruparProhibido saca las reglas que empiezan por «Nunca» o «No » y las junta al final.
func agruparProhibido(cuerpo string) string {
	lineas := strings.Split(cuerpo, "\n")
	cod := enCodigo(lineas)
	var resto, reglas []string
	for i, l := range lineas {
		if !cod[i] {
			if txt := reMarca.ReplaceAllString(l, ""); txt != l && reNegativ.MatchString(txt) {
				reglas = append(reglas, txt)
				continue
			}
		}
		resto = append(resto, l)
	}
	if len(reglas) == 0 {
		return cuerpo
	}
	s := strings.TrimRight(strings.Join(renumerar(resto), "\n"), "\n")
	var b strings.Builder
	b.WriteString(s + "\n\nProhibido:\n")
	for _, r := range reglas {
		b.WriteString("- " + r + "\n")
	}
	return b.String()
}

// numerarViñetas pasa las viñetas «- » a listas numeradas (cada lista arranca en 1). Deja en paz
// las casillas «- [ ]» y las líneas dentro de bloques de código.
func numerarViñetas(cuerpo string) string {
	lineas := strings.Split(cuerpo, "\n")
	cod := enCodigo(lineas)
	n := 0
	for i, l := range lineas {
		if !cod[i] {
			if g := reViñeta.FindStringSubmatch(l); g != nil && !strings.HasPrefix(g[1], "[") {
				n++
				lineas[i] = strconv.Itoa(n) + ". " + g[1]
				continue
			}
		}
		if strings.TrimSpace(l) != "" && !strings.HasPrefix(l, " ") {
			n = 0
		}
	}
	return strings.Join(lineas, "\n")
}

// Variante adapta una skill (front matter + cuerpo) a un perfil, sin LLM. Siempre conserva el
// front matter.
func Variante(cuerpo string, p Perfil) string {
	if p.Longitud != "corta" && !p.Rol && !p.FormatoAlFinal && !p.Prohibido && !p.ListaNumerada && p.MaxLineas == 0 {
		return cuerpo
	}
	cab, c := partir(cuerpo)
	if p.Longitud == "corta" {
		c = cortar(c)
	}
	if p.Prohibido {
		c = agruparProhibido(c)
	}
	if p.ListaNumerada {
		c = numerarViñetas(c)
	}
	c = strings.TrimLeft(c, "\n")
	if p.MaxLineas > 0 {
		l := strings.Split(strings.TrimRight(c, "\n"), "\n")
		if len(l) > p.MaxLineas {
			c = strings.Join(l[:p.MaxLineas], "\n") + "\n"
		}
	}
	c = strings.TrimRight(c, "\n") + "\n"
	if p.Rol {
		c = lineaRol + "\n" + lineaFormatoRo + "\n\n" + c
	}
	if p.FormatoAlFinal {
		c += "\n" + lineaFormato + "\n"
	}
	return cab + c
}
