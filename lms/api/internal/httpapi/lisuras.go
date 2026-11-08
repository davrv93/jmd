package httpapi

// Filtro de lisuras para textos libres (opiniones de las clases). Es el mismo de los sorteos
// (~/Documents/jmd/sorteo-seguridad/lisuras.go: minúsculas, sin tildes, números leídos como letras,
// letras repetidas juntas) con un cambio para frases: las lisuras largas se buscan DENTRO de cada
// palabra y no en el texto pegado, porque al pegar palabras aparecen falsos positivos («la web
// online» → «webon», «Mari conectó» → «maricon»). Las cortas siguen yendo solo como palabra entera.

import (
	"strings"
	"unicode"

	"golang.org/x/text/unicode/norm"
)

var lisurasPalabra = map[string]bool{
	"puta": true, "puto": true, "putas": true, "putos": true, "puton": true, "ptm": true, "ptmr": true, "ctm": true, "csm": true,
	"hdp": true, "mrd": true, "carajo": true, "carajos": true, "culo": true, "culos": true, "culero": true, "culera": true,
	"verga": true, "vergas": true, "pinga": true, "pingas": true, "cojudo": true, "cojuda": true,
	"zorra": true, "marica": true, "maricon": true, "mariconazo": true, "cabro": true,
	"cabron": true, "cabrona": true, "pendejo": true, "pendeja": true, "imbecil": true, "idiota": true, "estupido": true,
	"estupida": true, "tarado": true, "tarada": true, "mongol": true, "mongolo": true, "retrasado": true, "retrasada": true,
	"baboso": true, "babosa": true, "cachero": true, "cachera": true, "chuchatumare": true,
	"chucha": true, "conchatumare": true, "joto": true, "ojete": true, "mierda": true, "mierdas": true, "caca": true,
	"poto": true, "anal": true, "orto": true, "chupapinga": true, "teta": true, "tetas": true, "pene": true, "vagina": true, "porno": true, "nazi": true,
	"hitler": true, "fuck": true, "shit": true, "bitch": true, "dick": true, "asshole": true,
}

var lisurasDentro = []string{
	"conchatumadre", "conchatumare", "conchasumadre", "conchasumare", "concha de tu", "concha de su",
	"chuchatumadre", "chuchatumare", "chuchasumadre", "chuchasumare", "hijodeputa", "hijueputa", "hijoeputa",
	"putamadre", "puta madre", "hijo de puta", "mierda", "malparid", "maricon", "huevon", "guevon", "webon", "wevon", "cojud", "pendej",
	"pichul", "cabron", "imbecil", "pajer", "chupala", "chupamela", "mamaguevo", "motherfuck", "fucking",
}

var lisuraLeet = strings.NewReplacer("0", "o", "1", "i", "3", "e", "4", "a", "5", "s", "7", "t", "@", "a", "$", "s", "!", "i")

// lisuraPalabras: minúsculas, sin tildes ni signos, (con conLeet) números a letras, y sin letras
// repetidas seguidas («puuuta» → «puta»). Devuelve las palabras.
func lisuraPalabras(s string, conLeet bool) []string {
	s = strings.ToLower(s)
	if conLeet {
		s = lisuraLeet.Replace(s)
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
var lisuraPalabraNorm, lisuraDentroNorm = func() (map[string]bool, []string) {
	m := map[string]bool{}
	for p := range lisurasPalabra {
		for _, w := range lisuraPalabras(p, false) {
			m[w] = true
		}
	}
	var d []string
	for _, l := range lisurasDentro {
		d = append(d, strings.Join(lisuraPalabras(l, false), " "))
	}
	return m, d
}()

// tieneLisuras dice si el texto lleva una lisura.
func tieneLisuras(s string) bool {
	for _, conLeet := range []bool{false, true} {
		palabras := lisuraPalabras(s, conLeet)
		for _, p := range palabras {
			if lisuraPalabraNorm[p] {
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
			if lisuraPalabraNorm[suelta] {
				return true
			}
			suelta = ""
		}
		conEspacios := " " + strings.Join(palabras, " ") + " "
		for _, l := range lisuraDentroNorm {
			if strings.Contains(l, " ") {
				if strings.Contains(conEspacios, " "+l+" ") {
					return true
				}
				continue
			}
			for _, p := range palabras {
				if strings.Contains(p, l) {
					return true
				}
			}
		}
	}
	return false
}
