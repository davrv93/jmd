package main

// Filtro de nombres y códigos ofensivos. Se normaliza el texto (minúsculas,
// sin tildes, números leídos como letras, letras repetidas juntas) y se busca
// de dos formas: las palabras cortas solo como palabra entera (para no
// rechazar «Computadora» por «puta» ni el apellido Concha), y las largas e
// inequívocas en cualquier parte, también con espacios o puntos en medio.

import (
	"strings"
	"unicode"

	"golang.org/x/text/unicode/norm"
)

var lisurasPalabra = map[string]bool{
	"puta": true, "puto": true, "putas": true, "putos": true, "puton": true, "ptm": true, "ptmr": true, "ctm": true, "csm": true,
	"hdp": true, "mrd": true, "carajo": true, "carajos": true, "culo": true, "culos": true, "culero": true, "culera": true,
	"verga": true, "vergas": true, "pinga": true, "pingas": true, "pinga2": true, "cojudo": true, "cojuda": true,
	"zorra": true, "marica": true, "maricon": true, "mariconazo": true, "cabro": true,
	"cabron": true, "cabrona": true, "pendejo": true, "pendeja": true, "imbecil": true, "idiota": true, "estupido": true,
	"estupida": true, "tarado": true, "tarada": true, "mongol": true, "mongolo": true, "retrasado": true, "retrasada": true,
	"baboso": true, "babosa": true, "cachero": true, "cachera": true, "chuchatumare": true,
	"chucha": true, "conchatumare": true, "joto": true, "ojete": true, "mierda": true, "mierdas": true, "caca": true,
	"poto": true, "anal": true, "anus": true, "orto": true, "chupapinga": true, "teta": true, "tetas": true, "pene": true, "vagina": true, "sexo": true, "porno": true, "nazi": true,
	"hitler": true, "fuck": true, "shit": true, "bitch": true, "dick": true, "ass": true, "asshole": true,
}

var lisurasDentro = []string{
	"conchatumadre", "conchatumare", "conchasumadre", "conchasumare", "concha de tu", "concha de su",
	"chuchatumadre", "chuchatumare", "chuchasumadre", "chuchasumare", "hijodeputa", "hijueputa", "hijoeputa",
	"putamadre", "puta madre", "mierda", "malparid", "maricon", "huevon", "guevon", "webon", "wevon", "cojud", "pendej",
	"pichul", "cabron", "imbecil", "pajer", "chupala", "chupamela", "mamaguevo", "motherfuck", "fucking",
}

var leet = strings.NewReplacer("0", "o", "1", "i", "3", "e", "4", "a", "5", "s", "7", "t", "@", "a", "$", "s", "!", "i")

// normalizar: minúsculas, sin tildes ni signos, (con conLeet) números a
// letras, y sin letras repetidas seguidas («puuuta» → «puta»). Devuelve las
// palabras.
func normalizar(s string, conLeet bool) []string {
	s = strings.ToLower(s)
	if conLeet {
		s = leet.Replace(s)
	}
	var b strings.Builder
	for _, r := range norm.NFD.String(s) {
		switch {
		case unicode.Is(unicode.Mn, r):
		case r == 'ñ':
			b.WriteRune('n')
		case unicode.IsLetter(r):
			b.WriteRune(r)
		default:
			b.WriteRune(' ')
		}
	}
	var palabras []string
	for _, p := range strings.Fields(b.String()) {
		var c []rune
		for _, r := range p {
			if len(c) == 0 || c[len(c)-1] != r {
				c = append(c, r)
			}
		}
		palabras = append(palabras, string(c))
	}
	return palabras
}

// Las listas pasan por la misma normalización que el texto.
var palabraNorm, dentroNorm = func() (map[string]bool, []string) {
	m := map[string]bool{}
	for p := range lisurasPalabra {
		for _, w := range normalizar(p, false) {
			m[w] = true
		}
	}
	var d []string
	for _, l := range lisurasDentro {
		d = append(d, strings.Join(normalizar(l, false), " "))
	}
	return m, d
}()

func esOfensivo(s string) bool {
	for _, conLeet := range []bool{false, true} {
		palabras := normalizar(s, conLeet)
		for _, p := range palabras {
			if palabraNorm[p] {
				return true
			}
		}
		// letras sueltas seguidas («p.u.t.a», «p u t a») se leen como una palabra
		suelta := ""
		for _, p := range append(palabras, "  ") {
			if len([]rune(p)) == 1 {
				suelta += p
				continue
			}
			if palabraNorm[suelta] {
				return true
			}
			suelta = ""
		}
		junto := strings.Join(palabras, "")
		conEspacios := strings.Join(palabras, " ")
		for _, l := range dentroNorm {
			if strings.Contains(l, " ") {
				if strings.Contains(" "+conEspacios+" ", " "+l+" ") {
					return true
				}
			} else if strings.Contains(junto, l) {
				return true
			}
		}
	}
	return false
}
