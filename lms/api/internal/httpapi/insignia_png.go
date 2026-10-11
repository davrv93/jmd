package httpapi

import (
	"bytes"
	"fmt"
	"image"
	"image/color"
	"image/draw"
	"image/png"
	"math"
	"net/http"
	"strings"
	"sync"

	"golang.org/x/image/font"
	"golang.org/x/image/font/gofont/gobold"
	"golang.org/x/image/font/gofont/gomonobold"
	"golang.org/x/image/font/gofont/goregular"
	"golang.org/x/image/font/opentype"
	"golang.org/x/image/math/fixed"
	"golang.org/x/image/vector"
)

// PNG 600x600 de la insignia, en Go puro: Credly y Badgr/Canvas Credentials solo aceptan PNG
// al crear la plantilla de insignia, así que el SVG no basta. Misma composición que el SVG
// (hexágono con vértices arriba y abajo, degradado azul #1f4fbf → morado #6d28d9, doble borde
// blanco) rasterizada con golang.org/x/image/vector y texto con las fuentes Go (gobold,
// goregular, gomonobold) vía opentype. Fondo transparente fuera del hexágono.

const pngLado = 600

// insigniaPNGData describe qué insignia se dibuja: la del curso (ClaseNum 0) o la de una clase.
type insigniaPNGData struct {
	Curso    string // título del curso (nombre de la insignia del curso)
	Emisor   string
	ClaseNum int    // 0 = insignia del curso
	Clase    string // título de la clase sin el prefijo «Clase N ·»
}

var (
	pngAzul   = color.NRGBA{0x1f, 0x4f, 0xbf, 0xff}
	pngMorado = color.NRGBA{0x6d, 0x28, 0xd9, 0xff}
	pngBlanco = color.NRGBA{0xff, 0xff, 0xff, 0xff}
)

type fuentesPNG struct {
	once                sync.Once
	bold, regular, mono *opentype.Font
	err                 error
}

var pngFuentes fuentesPNG

func (f *fuentesPNG) cargar() error {
	f.once.Do(func() {
		if f.bold, f.err = opentype.Parse(gobold.TTF); f.err != nil {
			return
		}
		if f.regular, f.err = opentype.Parse(goregular.TTF); f.err != nil {
			return
		}
		f.mono, f.err = opentype.Parse(gomonobold.TTF)
	})
	return f.err
}

func cara(f *opentype.Font, px float64) font.Face {
	face, err := opentype.NewFace(f, &opentype.FaceOptions{Size: px, DPI: 72, Hinting: font.HintingNone})
	if err != nil {
		panic(err)
	}
	return face
}

// hexagono traza en el rasterizador un hexágono regular de circunradio rad centrado en (cx, cy)
// con vértices arriba y abajo (igual que el SVG).
func hexagono(r *vector.Rasterizer, cx, cy, rad float64) {
	for i := 0; i < 6; i++ {
		ang := (float64(i)*60 - 90) * math.Pi / 180
		x, y := float32(cx+rad*math.Cos(ang)), float32(cy+rad*math.Sin(ang))
		if i == 0 {
			r.MoveTo(x, y)
		} else {
			r.LineTo(x, y)
		}
	}
	r.ClosePath()
}

func rellenarHex(dst *image.RGBA, rad float64, src image.Image) {
	r := vector.NewRasterizer(pngLado, pngLado)
	hexagono(r, pngLado/2, pngLado/2, rad)
	r.Draw(dst, dst.Bounds(), src, image.Point{})
}

// degradado devuelve la imagen del degradado diagonal azul → morado (arriba-izquierda a
// abajo-derecha), como el linearGradient del SVG.
func degradado() *image.RGBA {
	img := image.NewRGBA(image.Rect(0, 0, pngLado, pngLado))
	mix := func(a, b uint8, t float64) uint8 { return uint8(float64(a) + (float64(b)-float64(a))*t + 0.5) }
	for y := 0; y < pngLado; y++ {
		for x := 0; x < pngLado; x++ {
			t := float64(x+y) / float64(2*(pngLado-1))
			img.SetRGBA(x, y, color.RGBA{mix(pngAzul.R, pngMorado.R, t), mix(pngAzul.G, pngMorado.G, t), mix(pngAzul.B, pngMorado.B, t), 0xff})
		}
	}
	return img
}

// ancho mide una cadena con interletraje opcional (px).
func ancho(face font.Face, s string, gap float64) float64 {
	w := 0.0
	prev := rune(-1)
	for _, c := range s {
		if prev >= 0 {
			w += float64(face.Kern(prev, c)) / 64
		}
		adv, _ := face.GlyphAdvance(c)
		w += float64(adv)/64 + gap
		prev = c
	}
	if len(s) > 0 {
		w -= gap
	}
	return w
}

// textoCentrado escribe s centrada en cx con la línea base en y; gap es el interletraje extra.
func textoCentrado(dst *image.RGBA, face font.Face, s string, cx, y float64, col color.Color, gap float64) {
	x := cx - ancho(face, s, gap)/2
	d := &font.Drawer{Dst: dst, Src: image.NewUniform(col), Face: face}
	prev := rune(-1)
	for _, c := range s {
		if prev >= 0 {
			x += float64(face.Kern(prev, c)) / 64
		}
		d.Dot = fixed.Point26_6{X: fixed.Int26_6(x * 64), Y: fixed.Int26_6(y * 64)}
		d.DrawString(string(c))
		adv, _ := face.GlyphAdvance(c)
		x += float64(adv)/64 + gap
		prev = c
	}
}

// ajustaCara baja el tamaño hasta que s quepa en maxW (sin bajar de min).
func ajustaCara(f *opentype.Font, s string, size, min, maxW, gap float64) font.Face {
	for size > min {
		face := cara(f, size)
		if ancho(face, s, gap) <= maxW {
			return face
		}
		size -= 2
	}
	return cara(f, min)
}

// taparBarraCero quita la barra diagonal de cada «0» del número: las fuentes Go llevan el cero
// barrado, que en un «01» de 168 px se lee como «Ø1». El anillo del cero es simétrico respecto
// a su eje vertical y la barra no, así que para cada píxel del glifo se toma el mínimo entre su
// cobertura y la del píxel espejo: el anillo (y su antialiasing) se conserva y la barra se va.
// Queda solo el rombo donde la barra cruza su propio espejo, en el centro, que se tapa con una
// elipse pequeña rellena con el fondo. El tramo del número se repinta entero sobre el fondo.
func taparBarraCero(dst *image.RGBA, face font.Face, s string, cx, y, gap float64, fondo *image.RGBA) {
	x := cx - ancho(face, s, gap)/2
	prev := rune(-1)
	for _, c := range s {
		if prev >= 0 {
			x += float64(face.Kern(prev, c)) / 64
		}
		adv, _ := face.GlyphAdvance(c)
		if c == '0' {
			b, _, _ := face.GlyphBounds(c)
			x0, x1 := int(math.Floor(x+float64(b.Min.X)/64))-1, int(math.Ceil(x+float64(b.Max.X)/64))+1
			y0, y1 := int(math.Floor(y+float64(b.Min.Y)/64))-1, int(math.Ceil(y+float64(b.Max.Y)/64))+1
			m := image.NewAlpha(image.Rect(x0, y0, x1, y1))
			(&font.Drawer{Dst: m, Src: image.White, Face: face, Dot: fixed.Point26_6{X: fixed.Int26_6(x * 64), Y: fixed.Int26_6(y * 64)}}).DrawString("0")
			// Eje de simetría: el centro del tramo con tinta (no del rectángulo del glifo).
			minX, maxX := x1, x0
			for py := y0; py < y1; py++ {
				for px := x0; px < x1; px++ {
					if m.AlphaAt(px, py).A > 0 {
						if px < minX {
							minX = px
						}
						if px > maxX {
							maxX = px
						}
					}
				}
			}
			for py := y0; py < y1; py++ {
				for px := x0; px < x1; px++ {
					a := m.AlphaAt(px, py).A
					if esp := m.AlphaAt(minX+maxX-px, py).A; esp < a {
						a = esp
					}
					f := fondo.RGBAAt(px, py)
					t := float64(a) / 255
					mix := func(bg uint8) uint8 { return uint8(float64(bg)*(1-t) + 255*t + 0.5) }
					dst.SetRGBA(px, py, color.RGBA{mix(f.R), mix(f.G), mix(f.B), 0xff})
				}
			}
			bw, bh := float64(maxX-minX), float64(y1-y0-2)
			elipse(dst, float64(minX+maxX)/2+0.5, float64(y0+y1)/2, bw*0.16, bh*0.2, fondo)
		}
		x += float64(adv)/64 + gap
		prev = c
	}
}

// elipse rellena una elipse con src (cuatro curvas de Bézier cúbicas).
func elipse(dst *image.RGBA, cx, cy, rx, ry float64, src image.Image) {
	if rx <= 0 || ry <= 0 {
		return
	}
	const k = 0.5523
	r := vector.NewRasterizer(pngLado, pngLado)
	f := func(v float64) float32 { return float32(v) }
	r.MoveTo(f(cx+rx), f(cy))
	r.CubeTo(f(cx+rx), f(cy+ry*k), f(cx+rx*k), f(cy+ry), f(cx), f(cy+ry))
	r.CubeTo(f(cx-rx*k), f(cy+ry), f(cx-rx), f(cy+ry*k), f(cx-rx), f(cy))
	r.CubeTo(f(cx-rx), f(cy-ry*k), f(cx-rx*k), f(cy-ry), f(cx), f(cy-ry))
	r.CubeTo(f(cx+rx*k), f(cy-ry), f(cx+rx), f(cy-ry*k), f(cx+rx), f(cy))
	r.ClosePath()
	r.Draw(dst, dst.Bounds(), src, image.Point{})
}

func linea(dst *image.RGBA, x1, x2, y int, col color.Color) {
	draw.Draw(dst, image.Rect(x1, y-1, x2, y+1), image.NewUniform(col), image.Point{}, draw.Over)
}

// insigniaPNG dibuja la insignia y devuelve los bytes PNG.
func insigniaPNG(d insigniaPNGData) ([]byte, error) {
	if err := pngFuentes.cargar(); err != nil {
		return nil, err
	}
	img := image.NewRGBA(image.Rect(0, 0, pngLado, pngLado))
	grad := degradado()
	blanco := image.NewUniform(pngBlanco)
	blancoSuave := image.NewUniform(color.NRGBA{0xff, 0xff, 0xff, 0x59}) // 35 %
	// Hexágono exterior, anillo blanco (268 ± 5) y anillo fino translúcido (250 ± 1).
	rellenarHex(img, 290, grad)
	rellenarHex(img, 273, blanco)
	rellenarHex(img, 263, grad)
	rellenarHex(img, 251, blancoSuave)
	rellenarHex(img, 249, grad)

	const cx = pngLado / 2
	maxW := 400.0
	emisor := strings.ToUpper(recortarRunas(d.Emisor, 24))
	if d.ClaseNum == 0 {
		// Insignia del curso: símbolo </>, nombre en hasta dos líneas, emisor.
		textoCentrado(img, cara(pngFuentes.mono, 128), "</>", cx, 268, pngBlanco, 0)
		l1, l2 := nombreCorto(d.Curso)
		y := 352.0
		if l2 == "" {
			y = 366
		}
		textoCentrado(img, ajustaCara(pngFuentes.bold, l1, 40, 24, maxW, 0), l1, cx, y, pngBlanco, 0)
		if l2 != "" {
			textoCentrado(img, ajustaCara(pngFuentes.bold, l2, 40, 24, maxW, 0), l2, cx, y+46, pngBlanco, 0)
		}
		linea(img, 230, 370, 440, color.NRGBA{0xff, 0xff, 0xff, 0x99})
		textoCentrado(img, ajustaCara(pngFuentes.bold, emisor, 21, 14, maxW, 1.5), emisor, cx, 472, pngBlanco, 1.5)
		textoCentrado(img, cara(pngFuentes.mono, 16), "open badges 3.0", cx, 502, color.NRGBA{0xff, 0xff, 0xff, 0xbf}, 0)
	} else {
		// Insignia de clase: «CLASE» pequeño, el número grande y el título corto en hasta tres líneas.
		textoCentrado(img, cara(pngFuentes.regular, 24), "CLASE", cx, 160, color.NRGBA{0xff, 0xff, 0xff, 0xd9}, 6)
		num := fmt.Sprintf("%02d", d.ClaseNum)
		caraNum := cara(pngFuentes.bold, 168)
		textoCentrado(img, caraNum, num, cx, 300, pngBlanco, -6)
		taparBarraCero(img, caraNum, num, cx, 300, -6, grad)
		ls := partirLineas(d.Clase, 24, 3)
		y := 352.0 + float64(3-len(ls))*12
		for i, l := range ls {
			textoCentrado(img, ajustaCara(pngFuentes.bold, l, 28, 20, maxW, 0), l, cx, y+float64(i)*34, pngBlanco, 0)
		}
		linea(img, 230, 370, 446, color.NRGBA{0xff, 0xff, 0xff, 0x99})
		textoCentrado(img, ajustaCara(pngFuentes.bold, emisor, 19, 13, maxW, 1.5), emisor, cx, 476, pngBlanco, 1.5)
		textoCentrado(img, cara(pngFuentes.mono, 15), "open badges 3.0", cx, 503, color.NRGBA{0xff, 0xff, 0xff, 0xbf}, 0)
	}
	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// servirPNG responde la insignia como image/png cacheable y legible desde otros orígenes.
func servirPNG(w http.ResponseWriter, d insigniaPNGData, nombre string) {
	b, err := insigniaPNG(d)
	if err != nil {
		internal(w, err)
		return
	}
	w.Header().Set("Content-Type", "image/png")
	w.Header().Set("Cache-Control", "public, max-age=3600")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Disposition", fmt.Sprintf("inline; filename=%q", nombre))
	w.WriteHeader(200)
	_, _ = w.Write(b)
}
