package httpapi

import (
	"bytes"
	"fmt"
	"image/color"
	"strings"
	"time"

	"github.com/go-pdf/fpdf"
	"github.com/skip2/go-qrcode"
)

// PDF del certificado: A4 apaisado, paleta azul (#1f4fbf), blanco y morado (#6d28d9), estética
// «de programación»: franja lateral en degradado, marca </> decorativa, una línea de código con
// los datos reales y el código del certificado en monoespaciada. Fuentes core de fpdf (Helvetica,
// Courier) con traducción a cp1252 para acentos y «ñ». Sin imágenes externas: el QR se genera
// aquí mismo.

type certPDFData struct {
	Codigo, Alumno, Curso, Tipo string
	Horas                       int
	Emisor, RUC                 string
	Instructor, Cargo           string
	EmitidoEn                   time.Time
	Anulado                     bool
	Base                        string // URL pública base, sin barra final
	Muestra                     bool   // marca de agua «MUESTRA»
}

type rgb struct{ r, g, b int }

var (
	colAzul    = rgb{0x1f, 0x4f, 0xbf}
	colMorado  = rgb{0x6d, 0x28, 0xd9}
	colLila    = rgb{0xed, 0xe9, 0xfe}
	colTinta   = rgb{0x1b, 0x20, 0x33}
	colGris    = rgb{0x5c, 0x59, 0x66}
	colGrisCl  = rgb{0x9a, 0x97, 0xa6}
	colLinea   = rgb{0xd9, 0xd6, 0xe8}
	colRojo    = rgb{0xc0, 0x26, 0x26}
	colBlanco  = rgb{0xff, 0xff, 0xff}
	mesesLargo = []string{"enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"}
)

// fechaLarga: «10 de octubre de 2026», en hora de Lima.
func fechaLarga(t time.Time) string {
	loc, err := time.LoadLocation("America/Lima")
	if err != nil {
		loc = time.FixedZone("Lima", -5*3600)
	}
	t = t.In(loc)
	return fmt.Sprintf("%d de %s de %d", t.Day(), mesesLargo[t.Month()-1], t.Year())
}

// renderCertPDF dibuja el certificado y devuelve los bytes del PDF.
func renderCertPDF(d certPDFData) ([]byte, error) {
	pdf := fpdf.New("L", "mm", "A4", "")
	tr := pdf.UnicodeTranslatorFromDescriptor("cp1252")
	pdf.SetAutoPageBreak(false, 0)
	pdf.SetMargins(0, 0, 0)
	pdf.SetTitle(tr("Certificado "+d.Codigo), false)
	pdf.SetAuthor(tr(d.Emisor), false)
	pdf.SetSubject(tr(d.Alumno+" · "+d.Curso), false)
	pdf.AddPage()
	W, H := pdf.GetPageSize() // 297 x 210

	fill := func(c rgb) { pdf.SetFillColor(c.r, c.g, c.b) }
	text := func(c rgb) { pdf.SetTextColor(c.r, c.g, c.b) }
	draw := func(c rgb) { pdf.SetDrawColor(c.r, c.g, c.b) }

	// Franja lateral: 40 rectángulos de azul (arriba) a morado (abajo).
	const franja = 18.0
	n := 40
	h := H / float64(n)
	for i := 0; i < n; i++ {
		t := float64(i) / float64(n-1)
		fill(mezcla(colAzul, colMorado, t))
		// Un pelo de solape para que no se vean juntas blancas al rasterizar.
		pdf.Rect(0, float64(i)*h, franja, h+0.3, "F")
	}
	// Código en vertical dentro de la franja (se lee de abajo arriba) y una marca pequeña arriba.
	text(colBlanco)
	pdf.SetFont("Courier", "B", 11)
	wCode := pdf.GetStringWidth(d.Codigo)
	pdf.TransformBegin()
	pdf.TransformRotate(90, 11.3, H-14)
	pdf.Text(11.3, H-14, tr(d.Codigo))
	pdf.TransformEnd()
	pdf.SetFont("Courier", "", 7.5)
	pdf.SetAlpha(0.75, "Normal")
	pdf.TransformBegin()
	pdf.TransformRotate(90, 11.3, H-14-wCode-7)
	pdf.Text(11.3, H-14-wCode-7, tr("certificado verificable"))
	pdf.TransformEnd()
	pdf.SetAlpha(1, "Normal")
	pdf.SetFont("Courier", "B", 16)
	pdf.Text(4.6, 15, "{ }")

	// Marco fino interior.
	draw(colLinea)
	pdf.SetLineWidth(0.35)
	pdf.Rect(franja+8, 9, W-franja-17, H-18, "D")

	// Marca decorativa </> arriba a la derecha, en lila muy claro.
	text(colLila)
	pdf.SetFont("Courier", "B", 118)
	pdf.Text(W-16-pdf.GetStringWidth("</>")-3, 62, "</>")

	x0 := franja + 20.0
	ancho := W - x0 - 16

	// Comentario de código con el código del certificado.
	text(colGrisCl)
	pdf.SetFont("Courier", "", 9)
	pdf.Text(x0, 26, tr("// certificado verificable · "+d.Codigo))

	// Título con espaciado entre letras y subtítulo.
	text(colAzul)
	pdf.SetFont("Helvetica", "B", 34)
	espaciado(pdf, x0, 49, tr("CERTIFICADO"), 2.4)
	text(colGris)
	pdf.SetFont("Helvetica", "", 15)
	pdf.Text(x0, 59, tr(tiposCert[d.Tipo]))

	// Línea de código decorativa con los datos reales.
	text(colGrisCl)
	pdf.SetFont("Courier", "", 9.5)
	linea := fmt.Sprintf(`const certificado = { alumno: "%s", curso: "%s" };`, d.Alumno, d.Curso)
	pdf.Text(x0, 68, tr(recortarAncho(pdf, tr, linea, ancho)))
	draw(colLinea)
	pdf.Line(x0, 73, x0+ancho, 73)

	// Alumno.
	text(colGrisCl)
	pdf.SetFont("Helvetica", "", 9)
	espaciado(pdf, x0, 91, tr("SE OTORGA A"), 1.2)
	text(colTinta)
	ajustaFuente(pdf, "Helvetica", "B", 30, 18, tr(d.Alumno), ancho)
	pdf.Text(x0, 106, tr(d.Alumno))

	// Curso.
	text(colGris)
	pdf.SetFont("Helvetica", "", 12)
	pdf.Text(x0, 119, tr("por haber completado el curso"))
	text(colMorado)
	ajustaFuente(pdf, "Helvetica", "B", 18, 11, tr(d.Curso), ancho)
	pdf.Text(x0, 129, tr(d.Curso))

	// Emisión.
	text(colGris)
	pdf.SetFont("Helvetica", "", 11)
	horas := "horas lectivas"
	if d.Horas == 1 {
		horas = "hora lectiva"
	}
	pdf.Text(x0, 141, tr(fmt.Sprintf("Emitido el %s · %d %s", fechaLarga(d.EmitidoEn), d.Horas, horas)))

	// Pie: emisor (izquierda), firma (centro), QR (derecha), separado por una regla fina.
	yPie := 180.0
	draw(colLinea)
	pdf.SetLineWidth(0.35)
	pdf.Line(x0, 150, x0+ancho, 150)
	text(colGrisCl)
	pdf.SetFont("Helvetica", "", 8)
	espaciado(pdf, x0, yPie, tr("EMITE"), 1)
	text(colTinta)
	pdf.SetFont("Helvetica", "B", 11)
	pdf.Text(x0, yPie+6.5, tr(d.Emisor))
	text(colGris)
	pdf.SetFont("Helvetica", "", 9.5)
	pdf.Text(x0, yPie+12, tr("RUC "+d.RUC))

	if d.Instructor != "" {
		cx := x0 + ancho*0.5 - 4
		draw(colTinta)
		pdf.SetLineWidth(0.3)
		pdf.Line(cx-34, yPie+1.5, cx+34, yPie+1.5)
		text(colTinta)
		pdf.SetFont("Helvetica", "B", 10.5)
		centrado(pdf, cx, yPie+6.5, tr(d.Instructor))
		text(colGris)
		pdf.SetFont("Helvetica", "", 9)
		cargo := d.Cargo
		if cargo == "" {
			cargo = "Instructor"
		}
		centrado(pdf, cx, yPie+11.5, tr(cargo))
	}

	// QR con la URL pública de verificación.
	urlVer := d.Base + "/verificar/" + d.Codigo + "/"
	q, err := qrcode.New(urlVer, qrcode.Medium)
	if err != nil {
		return nil, err
	}
	q.DisableBorder = true
	q.ForegroundColor = color.RGBA{R: uint8(colTinta.r), G: uint8(colTinta.g), B: uint8(colTinta.b), A: 255}
	png, err := q.PNG(512)
	if err != nil {
		return nil, err
	}
	const qr = 26.0
	qx, qy := W-16-qr-9, 156.0
	opt := fpdf.ImageOptions{ImageType: "PNG", ReadDpi: false}
	pdf.RegisterImageOptionsReader("qr", opt, bytes.NewReader(png))
	pdf.ImageOptions("qr", qx, qy, qr, qr, false, opt, 0, urlVer)
	qc := qx + qr/2
	text(colTinta)
	pdf.SetFont("Courier", "B", 9.5)
	centrado(pdf, qc, qy+qr+5, tr(d.Codigo))
	text(colGrisCl)
	pdf.SetFont("Helvetica", "", 7)
	centrado(pdf, qc, qy+qr+9, tr("Verifica en "+sinEsquema(d.Base)+"/verificar"))
	centrado(pdf, qc, qy+qr+12.5, tr("Incluye insignia digital Open Badges 3.0"))

	// Sellos: anulado (rojo) o muestra (gris), en diagonal y translúcidos.
	if d.Anulado || d.Muestra {
		msg, c := "MUESTRA", colGris
		if d.Anulado {
			msg, c = "ANULADO", colRojo
		}
		pdf.SetAlpha(0.10, "Normal")
		text(c)
		pdf.SetFont("Helvetica", "B", 84)
		pdf.TransformBegin()
		pdf.TransformRotate(22, W/2+8, H/2+12)
		centrado(pdf, W/2+8, H/2+12+16, msg)
		pdf.TransformEnd()
		pdf.SetAlpha(1, "Normal")
		if d.Anulado {
			text(colRojo)
			pdf.SetFont("Helvetica", "B", 9)
			pdf.Text(x0, 149, tr("Este certificado fue anulado por el emisor y ya no es válido."))
		}
	}

	var buf bytes.Buffer
	if err := pdf.Output(&buf); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// mezcla interpola dos colores (t en 0..1).
func mezcla(a, b rgb, t float64) rgb {
	m := func(x, y int) int { return int(float64(x) + (float64(y)-float64(x))*t + 0.5) }
	return rgb{m(a.r, b.r), m(a.g, b.g), m(a.b, b.b)}
}

// espaciado escribe letra a letra con un hueco fijo (fpdf no trae interletraje).
func espaciado(pdf *fpdf.Fpdf, x, y float64, s string, gap float64) {
	for _, r := range s {
		ch := string(r)
		pdf.Text(x, y, ch)
		x += pdf.GetStringWidth(ch) + gap
	}
}

// centrado escribe s centrada en cx.
func centrado(pdf *fpdf.Fpdf, cx, y float64, s string) {
	pdf.Text(cx-pdf.GetStringWidth(s)/2, y, s)
}

// ajustaFuente baja el tamaño hasta que s quepa en ancho (sin pasar de min).
func ajustaFuente(pdf *fpdf.Fpdf, family, style string, size, min float64, s string, ancho float64) {
	for size > min {
		pdf.SetFont(family, style, size)
		if pdf.GetStringWidth(s) <= ancho {
			return
		}
		size -= 1
	}
	pdf.SetFont(family, style, min)
}

// recortarAncho corta s con «…» para que quepa en ancho con la fuente actual.
func recortarAncho(pdf *fpdf.Fpdf, tr func(string) string, s string, ancho float64) string {
	if pdf.GetStringWidth(tr(s)) <= ancho {
		return s
	}
	r := []rune(s)
	for len(r) > 4 {
		r = r[:len(r)-1]
		cand := strings.TrimRight(string(r), " ") + `…" };`
		if pdf.GetStringWidth(tr(cand)) <= ancho {
			return cand
		}
	}
	return s
}

func sinEsquema(u string) string {
	u = strings.TrimPrefix(strings.TrimPrefix(u, "https://"), "http://")
	return u
}
