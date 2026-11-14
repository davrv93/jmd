package main

// Sala multijugador de la clase (/clase/multi): hasta 20 ositos de personas a la vez en el mismo témpano.
// A diferencia del juego de uno contra la máquina, aquí la física corre en el SERVIDOR (30 Hz) para que
// todos vean lo mismo: cada navegador manda su palanca (x, y, embestida) y recibe el estado por SSE a 15 Hz.
// El témpano crece con la cantidad de jugadores y, además de las grietas del borde, caen rayos: avisan con un
// círculo rojo y al caer parten un trozo del hielo y empujan a quien esté cerca.

import (
	"encoding/json"
	"fmt"
	"io/fs"
	"math"
	"math/rand/v2"
	"net/http"
	"strings"
	"sync"
	"time"
)

const (
	mMax          = 20
	mROso         = 24.0
	mRMin         = 66.0
	mSectores     = 40
	mDuracion     = 90.0
	mAcel         = 560.0
	mRoce         = 2.6
	mVMax         = 620.0
	mEmbestida    = 300.0
	mEnfria       = 1.2
	mRebote       = 0.3
	mAvisoGrieta  = 0.75
	mAvisoRayo    = 1.4
	mRadioRayo    = 85.0
	mTick         = time.Second / 30
	mEnvio        = time.Second / 15
	mInactivo     = 12 * time.Second
	mCuentaAtras  = 8.0
	mFinPausa     = 7.0
	mMinParaJugar = 2
)

var mColores = [][2]string{
	{"#ff7a3d", "#c4501b"}, {"#3db7ff", "#1f7fbd"}, {"#7be08f", "#3b9c52"}, {"#ff6fb5", "#c23d81"},
	{"#ffd23d", "#c49a1b"}, {"#a66bff", "#6f3fc4"}, {"#3dffd8", "#1fbda0"}, {"#ff4d4d", "#bd1f1f"},
	{"#9ad13d", "#6a9c1f"}, {"#ff9e3d", "#c46f1b"}, {"#4d7dff", "#1f45bd"}, {"#e07bd8", "#9c3b94"},
	{"#3dd1ff", "#1f93bd"}, {"#c8a06b", "#8c6a3b"}, {"#ff3d9e", "#bd1f6a"}, {"#6bffa6", "#3bc46f"},
	{"#b0b8c8", "#6f7889"}, {"#ffe66b", "#c4ad3b"}, {"#6b8cff", "#3b55c4"}, {"#ff8a8a", "#c45555"},
}

type mOso struct {
	ID       int     `json:"id"`
	Nombre   string  `json:"nombre"`
	Color    int     `json:"color"`
	X        float64 `json:"x"`
	Y        float64 `json:"y"`
	VX       float64 `json:"vx"`
	VY       float64 `json:"vy"`
	FX       float64 `json:"fx"`
	FY       float64 `json:"fy"`
	Vivo     bool    `json:"vivo"`
	Cayendo  float64 `json:"cayendo"`
	Dash     float64 `json:"dash"`
	Golpe    float64 `json:"golpe"`
	Juega    bool    `json:"juega"` // está en la ronda en curso (los que llegan tarde miran)
	Ganadas  int     `json:"ganadas"`
	cd       float64
	paso     float64
	clave    string
	visto    time.Time
	mx, my   float64
	quiereDa bool
}

type mGrieta struct {
	i, n int
	prof float64
	t0   float64
}

type mTrozo struct {
	Pts [][2]float64 `json:"pts"`
	X   float64      `json:"x"`
	Y   float64      `json:"y"`
	VX  float64      `json:"-"`
	VY  float64      `json:"-"`
	Rot float64      `json:"rot"`
	VR  float64      `json:"-"`
	T   float64      `json:"t"`
}

type mRayo struct {
	X  float64 `json:"x"`
	Y  float64 `json:"y"`
	T  float64 `json:"t"`  // segundos desde el aviso
	Ya bool    `json:"ya"` // ya cayó
}

type mEvento struct {
	Tipo  string  `json:"tipo"`
	X     float64 `json:"x"`
	Y     float64 `json:"y"`
	ID    int     `json:"id"`
	Fuerz float64 `json:"fuerza,omitempty"`
}

type Multi struct {
	mu        sync.Mutex
	osos      []*mOso
	siguiente int
	fase      string // espera | cuenta | jugando | fin
	reloj     float64
	t         float64
	r         [mSectores]float64
	r0        float64
	grietas   []mGrieta
	trozos    []*mTrozo
	rayos     []*mRayo
	proxGr    float64
	proxRayo  float64
	rayosOn   bool
	empezaron int
	ganador   string
	eventos   []mEvento
	subs      map[chan []byte]bool
	azar      *rand.Rand
}

func nuevoMulti() *Multi {
	m := &Multi{fase: "espera", subs: map[chan []byte]bool{}, rayosOn: true, azar: rand.New(rand.NewPCG(uint64(time.Now().UnixNano()), 7))}
	for i := range m.r {
		m.r[i] = 300
	}
	m.r0 = 300
	go m.correr()
	return m
}

func (m *Multi) az() float64 { return m.azar.Float64() }

func (m *Multi) activos() []*mOso {
	var l []*mOso
	for _, o := range m.osos {
		if time.Since(o.visto) < mInactivo {
			l = append(l, o)
		}
	}
	return l
}

func (m *Multi) radioEn(ang float64) float64 {
	u := math.Mod(math.Mod(ang, 2*math.Pi)+2*math.Pi, 2*math.Pi) / (2 * math.Pi) * mSectores
	i := int(math.Floor(u)) % mSectores
	k := u - math.Floor(u)
	return m.r[i]*(1-k) + m.r[(i+1)%mSectores]*k
}

func (m *Multi) margen(o *mOso) float64 {
	return m.radioEn(math.Atan2(o.Y, o.X)) - math.Hypot(o.X, o.Y)
}

func (m *Multi) radioMedio() float64 {
	s := 0.0
	for _, v := range m.r {
		s += v
	}
	return s / mSectores
}

func enPieM(o *mOso) bool { return o.Juega && o.Vivo && o.Cayendo < 0 }

// prepararHielo deja el témpano entero, del tamaño que tocará para la gente conectada, mientras se espera.
func (m *Multi) prepararHielo() {
	n := len(m.activos())
	m.r0 = math.Min(540, math.Max(300, 300+14*float64(n-4)))
	for i := range m.r {
		m.r[i] = m.r0
	}
	m.grietas, m.rayos = nil, nil
	m.flotar(mTick.Seconds())
}

// empezar arma la ronda: el témpano crece con la gente (300 para 4, ~520 para 20) y todos en un anillo.
func (m *Multi) empezar() {
	act := m.activos()
	n := len(act)
	m.r0 = math.Min(540, math.Max(300, 300+14*float64(n-4)))
	for i := range m.r {
		m.r[i] = m.r0
	}
	m.grietas, m.trozos, m.rayos = nil, nil, nil
	m.t, m.proxGr, m.proxRayo = 0, 4.5, 6+m.az()*3
	m.empezaron = n
	m.ganador = ""
	for _, o := range m.osos {
		o.Juega = false
	}
	giro := m.az() * 2 * math.Pi
	d := m.r0 * 0.62
	for i, o := range act {
		a := giro + float64(i)*2*math.Pi/float64(n)
		*o = mOso{ID: o.ID, Nombre: o.Nombre, Color: o.Color, Ganadas: o.Ganadas, clave: o.clave, visto: o.visto,
			X: math.Cos(a) * d, Y: math.Sin(a) * d, FX: -math.Cos(a), FY: -math.Sin(a),
			Vivo: true, Cayendo: -1, Juega: true, cd: 0.6}
	}
	m.fase = "jugando"
	m.eventos = append(m.eventos, mEvento{Tipo: "inicio"})
}

func (m *Multi) radioObjetivo(t float64) float64 {
	if t < 4 {
		return m.r0
	}
	fin := math.Max(110, m.r0*0.3)
	return math.Max(fin, m.r0-(m.r0-fin)*math.Min(1, (t-4)/55))
}

// partir quita un trozo del borde (sectores i…i+n) y lo deja flotando.
func (m *Multi) partir(ini, n int, prof float64) {
	var afuera, adentro [][2]float64
	for k := 0; k <= n; k++ {
		i := ((ini+k)%mSectores + mSectores) % mSectores
		a := float64(i) / mSectores * 2 * math.Pi
		viejo := m.r[i]
		borde := k == 0 || k == n
		nuevo := viejo
		if !borde {
			nuevo = math.Max(mRMin, viejo-prof*(0.75+m.az()*0.5))
			m.r[i] = nuevo
		}
		afuera = append(afuera, [2]float64{math.Cos(a) * viejo, math.Sin(a) * viejo})
		adentro = append([][2]float64{{math.Cos(a) * nuevo, math.Sin(a) * nuevo}}, adentro...)
	}
	pts := append(afuera, adentro...)
	cx, cy := 0.0, 0.0
	for _, p := range pts {
		cx += p[0]
		cy += p[1]
	}
	cx /= float64(len(pts))
	cy /= float64(len(pts))
	d := math.Max(1, math.Hypot(cx, cy))
	for i := range pts {
		pts[i] = [2]float64{math.Round(pts[i][0] - cx), math.Round(pts[i][1] - cy)}
	}
	m.trozos = append(m.trozos, &mTrozo{Pts: pts, X: cx, Y: cy, VX: cx / d * 26, VY: cy / d * 26, VR: (m.az() - 0.5) * 0.8})
	m.eventos = append(m.eventos, mEvento{Tipo: "grieta", X: cx, Y: cy})
}

func (m *Multi) hielo(dt float64) {
	if m.t >= m.proxGr {
		m.proxGr = m.t + 0.85 + m.az()*0.5
		obj := m.radioObjetivo(m.t + mAvisoGrieta)
		mejor, peso := -1, -1.0
		for i := 0; i < mSectores; i++ {
			if p := (m.r[i] - mRMin) * (0.6 + m.az()*0.8); p > peso {
				peso, mejor = p, i
			}
		}
		exceso := m.radioMedio() - obj
		if mejor >= 0 && m.r[mejor] > mRMin+8 && exceso > -10 {
			n := 3 + m.azar.IntN(3)
			prof := math.Min(80, math.Max(16, exceso*0.9+14+m.az()*16))
			m.grietas = append(m.grietas, mGrieta{i: mejor - n/2, n: n, prof: prof, t0: m.t})
		}
	}
	for g := len(m.grietas) - 1; g >= 0; g-- {
		gr := m.grietas[g]
		if m.t-gr.t0 < mAvisoGrieta {
			continue
		}
		m.grietas = append(m.grietas[:g], m.grietas[g+1:]...)
		m.partir(gr.i, gr.n, gr.prof)
	}
	// Rayos: avisan, caen, parten el hielo en esa dirección y empujan a los de cerca.
	if m.rayosOn && m.t >= m.proxRayo {
		m.proxRayo = m.t + 5 + m.az()*5
		var x, y float64
		pie := []*mOso{}
		for _, o := range m.osos {
			if enPieM(o) {
				pie = append(pie, o)
			}
		}
		if len(pie) > 0 && m.az() < 0.7 {
			o := pie[m.azar.IntN(len(pie))]
			x, y = o.X+(m.az()-0.5)*90, o.Y+(m.az()-0.5)*90
		} else {
			a, d := m.az()*2*math.Pi, m.radioMedio()*(0.35+m.az()*0.55)
			x, y = math.Cos(a)*d, math.Sin(a)*d
		}
		m.rayos = append(m.rayos, &mRayo{X: x, Y: y})
		m.eventos = append(m.eventos, mEvento{Tipo: "rayo_aviso", X: x, Y: y})
	}
	for k := len(m.rayos) - 1; k >= 0; k-- {
		ry := m.rayos[k]
		ry.T += dt
		if !ry.Ya && ry.T >= mAvisoRayo {
			ry.Ya = true
			m.eventos = append(m.eventos, mEvento{Tipo: "rayo", X: ry.X, Y: ry.Y})
			// Parte el hielo: una cuña desde el borde hasta cerca del impacto.
			a := math.Atan2(ry.Y, ry.X)
			i := int(math.Round(math.Mod(a+2*math.Pi, 2*math.Pi)/(2*math.Pi)*mSectores)) % mSectores
			dist := math.Hypot(ry.X, ry.Y)
			borde := m.radioEn(a)
			prof := math.Max(30, math.Min(borde-mRMin, borde-dist+40))
			if prof > 10 {
				m.partir(i-2, 4, prof)
			}
			for _, o := range m.osos {
				if !enPieM(o) {
					continue
				}
				dx, dy := o.X-ry.X, o.Y-ry.Y
				d := math.Hypot(dx, dy)
				if d < mRadioRayo {
					if d < 1 {
						dx, dy, d = math.Cos(a), math.Sin(a), 1
					}
					f := 380 * (1 - d/mRadioRayo*0.5)
					o.VX += dx / d * f
					o.VY += dy / d * f
					o.Golpe = 1
				}
			}
		}
		if ry.T > mAvisoRayo+0.6 {
			m.rayos = append(m.rayos[:k], m.rayos[k+1:]...)
		}
	}
	m.flotar(dt)
}

// flotar mueve los trozos sueltos hasta que se hunden.
func (m *Multi) flotar(dt float64) {
	for k := len(m.trozos) - 1; k >= 0; k-- {
		tr := m.trozos[k]
		tr.T += dt
		tr.X += tr.VX * dt
		tr.Y += tr.VY * dt
		tr.Rot += tr.VR * dt
		tr.VX *= 1 - 0.6*dt
		tr.VY *= 1 - 0.6*dt
		if tr.T > 5 {
			m.trozos = append(m.trozos[:k], m.trozos[k+1:]...)
		}
	}
}

func (m *Multi) paso(dt float64) {
	m.t += dt
	m.hielo(dt)
	for _, o := range m.osos {
		if !o.Juega {
			continue
		}
		if o.Cayendo >= 0 {
			o.Cayendo += dt
			o.X += o.VX * dt
			o.Y += o.VY * dt
			o.VX *= 1 - 3*dt
			o.VY *= 1 - 3*dt
			if o.Cayendo > 0.75 && o.Vivo {
				o.Vivo = false
				m.eventos = append(m.eventos, mEvento{Tipo: "hundido", ID: o.ID})
			}
			continue
		}
		if !o.Vivo {
			continue
		}
		mx, my := o.mx, o.my
		if time.Since(o.visto) > 3*time.Second { // se fue: se queda quieto
			mx, my = 0, 0
		}
		ml := math.Hypot(mx, my)
		if ml > 1 {
			mx /= ml
			my /= ml
		}
		o.VX += mx * mAcel * dt
		o.VY += my * mAcel * dt
		o.VX *= 1 - mRoce*dt
		o.VY *= 1 - mRoce*dt
		if ml > 0.15 {
			k := math.Min(1, dt*12)
			o.FX += (mx/math.Max(ml, 1e-6) - o.FX) * k
			o.FY += (my/math.Max(ml, 1e-6) - o.FY) * k
			fl := math.Max(1e-6, math.Hypot(o.FX, o.FY))
			o.FX /= fl
			o.FY /= fl
		}
		o.cd = math.Max(0, o.cd-dt)
		o.Dash = math.Max(0, o.Dash-dt)
		o.Golpe = math.Max(0, o.Golpe-dt*3)
		if o.quiereDa && o.cd <= 0 {
			ex, ey := o.FX, o.FY
			if ml > 0.15 {
				ex, ey = mx/ml, my/ml
			}
			o.VX += ex * mEmbestida
			o.VY += ey * mEmbestida
			o.FX, o.FY = ex, ey
			o.cd, o.Dash = mEnfria, 0.24
			m.eventos = append(m.eventos, mEvento{Tipo: "embestida", ID: o.ID, X: o.X, Y: o.Y})
		}
		o.quiereDa = false
		if v := math.Hypot(o.VX, o.VY); v > mVMax {
			o.VX *= mVMax / v
			o.VY *= mVMax / v
		}
		o.X += o.VX * dt
		o.Y += o.VY * dt
		o.paso += math.Hypot(o.VX, o.VY) * dt * 0.05
	}
	var en []*mOso
	for _, o := range m.osos {
		if enPieM(o) {
			en = append(en, o)
		}
	}
	for a := 0; a < len(en); a++ {
		for b := a + 1; b < len(en); b++ {
			p, q := en[a], en[b]
			nx, ny := q.X-p.X, q.Y-p.Y
			d := math.Hypot(nx, ny)
			if d >= mROso*2 || d == 0 {
				continue
			}
			nx /= d
			ny /= d
			mp, mq := 1.0, 1.0
			if p.Dash > 0 {
				mp = 1.6
			}
			if q.Dash > 0 {
				mq = 1.6
			}
			ip, iq := 1/mp, 1/mq
			sol := mROso*2 - d
			p.X -= nx * sol * ip / (ip + iq)
			p.Y -= ny * sol * ip / (ip + iq)
			q.X += nx * sol * iq / (ip + iq)
			q.Y += ny * sol * iq / (ip + iq)
			vn := (p.VX-q.VX)*nx + (p.VY-q.VY)*ny
			if vn <= 0 {
				continue
			}
			j := (mRebote + 1) * vn / (ip + iq)
			p.VX -= j * ip * nx
			p.VY -= j * ip * ny
			q.VX += j * iq * nx
			q.VY += j * iq * ny
			g := math.Min(1, vn/300)
			p.Golpe, q.Golpe = g, g
			if vn > 120 {
				m.eventos = append(m.eventos, mEvento{Tipo: "golpe", X: (p.X + q.X) / 2, Y: (p.Y + q.Y) / 2, Fuerz: vn})
			}
		}
	}
	for _, o := range en {
		if m.margen(o) < -4 {
			o.Cayendo = 0
			m.eventos = append(m.eventos, mEvento{Tipo: "caida", ID: o.ID, X: o.X, Y: o.Y})
		}
	}
}

// correr: el reloj de la sala. Física a 30 Hz y difusión a 15 Hz, solo mientras haya alguien.
func (m *Multi) correr() {
	tick := time.NewTicker(mTick)
	defer tick.Stop()
	ultimoEnvio := time.Now()
	for range tick.C {
		m.mu.Lock()
		dt := mTick.Seconds()
		act := m.activos()
		switch m.fase {
		case "espera":
			if len(act) >= mMinParaJugar {
				m.fase, m.reloj = "cuenta", mCuentaAtras
			}
			m.prepararHielo()
		case "cuenta":
			m.reloj -= dt
			m.prepararHielo()
			if len(act) < 1 {
				m.fase = "espera"
			} else if m.reloj <= 0 {
				m.empezar()
			}
		case "jugando":
			m.paso(dt)
			pie := []*mOso{}
			for _, o := range m.osos {
				if enPieM(o) {
					pie = append(pie, o)
				}
			}
			fin := len(pie) == 0 || m.t >= mDuracion || (m.empezaron >= 2 && len(pie) <= 1)
			if fin {
				if len(pie) == 1 {
					pie[0].Ganadas++
					m.ganador = pie[0].Nombre
				} else if len(pie) > 1 {
					m.ganador = fmt.Sprintf("%d ositos aguantaron hasta el final", len(pie))
				} else {
					m.ganador = "Nadie: el mar ganó"
				}
				m.fase, m.reloj = "fin", mFinPausa
				m.eventos = append(m.eventos, mEvento{Tipo: "fin"})
			}
		case "fin":
			m.flotar(dt) // los trozos siguen flotando; ya no caen rayos ni grietas
			m.reloj -= dt
			if m.reloj <= 0 {
				m.fase = "espera"
				m.prepararHielo()
				if len(m.activos()) >= mMinParaJugar {
					m.fase, m.reloj = "cuenta", 5
				}
			}
		}
		// limpieza de los que se fueron hace rato y no juegan
		if len(m.osos) > 0 {
			l := m.osos[:0]
			for _, o := range m.osos {
				if time.Since(o.visto) < 2*time.Minute || (o.Juega && m.fase == "jugando") {
					l = append(l, o)
				}
			}
			m.osos = l
		}
		if len(m.eventos) > 60 {
			m.eventos = m.eventos[len(m.eventos)-60:]
		}
		var msg []byte
		if time.Since(ultimoEnvio) >= mEnvio && len(m.subs) > 0 {
			ultimoEnvio = time.Now()
			msg = m.instante()
			for c := range m.subs {
				select {
				case c <- msg:
				default:
				}
			}
		}
		m.mu.Unlock()
	}
}

func r1(v float64) float64 { return math.Round(v*10) / 10 }

func (m *Multi) instante() []byte {
	osos := make([]map[string]any, 0, len(m.osos))
	for _, o := range m.osos {
		if time.Since(o.visto) > mInactivo && !o.Juega {
			continue
		}
		osos = append(osos, map[string]any{"id": o.ID, "n": o.Nombre, "c": o.Color, "x": r1(o.X), "y": r1(o.Y),
			"vx": r1(o.VX), "vy": r1(o.VY), "fx": r1(o.FX*100) / 100, "fy": r1(o.FY*100) / 100, "v": o.Vivo, "ca": r1(o.Cayendo),
			"d": r1(o.Dash), "g": r1(o.Golpe), "j": o.Juega, "w": o.Ganadas, "cd": r1(o.cd)})
	}
	r := make([]float64, mSectores)
	for i, v := range m.r {
		r[i] = r1(v)
	}
	gr := make([]map[string]any, 0, len(m.grietas))
	for _, g := range m.grietas {
		gr = append(gr, map[string]any{"i": g.i, "n": g.n, "prof": r1(g.prof), "t0": r1(g.t0)})
	}
	b, _ := json.Marshal(map[string]any{"fase": m.fase, "reloj": r1(m.reloj), "t": r1(m.t), "dur": mDuracion,
		"r": r, "grietas": gr, "trozos": m.trozos, "rayos": m.rayos, "osos": osos, "ganador": m.ganador,
		"eventos": m.eventos, "max": mMax, "conectados": len(m.activos())})
	m.eventos = m.eventos[:0]
	return b
}

func (m *Multi) rutas(cla *Servidor, mux *http.ServeMux) {
	web, _ := fs.Sub(webFS, "web")
	mux.HandleFunc("GET /clase/multi", func(w http.ResponseWriter, r *http.Request) {
		b, err := fs.ReadFile(web, "multi.html")
		if err != nil {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.Header().Set("Cache-Control", "no-cache")
		_, _ = w.Write(b)
	})
	mux.HandleFunc("POST /clase/api/multi/unir", func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			T string `json:"t"`
		}
		if err := leerJSON(r, &in, 1024); err != nil {
			fallo(w, 400, "Pedido inválido.")
			return
		}
		cla.mu.Lock()
		i := cla.jugador(in.T)
		nombre := ""
		if i >= 0 {
			nombre = cla.e.Jugadores[i].Nombre
		}
		cla.mu.Unlock()
		if i < 0 {
			fallo(w, 404, "No te encontramos. Escribe tu nombre otra vez.")
			return
		}
		corto := strings.Fields(nombre)
		if len(corto) > 1 {
			nombre = corto[0] + " " + string([]rune(corto[1])[:1]) + "."
		}
		m.mu.Lock()
		defer m.mu.Unlock()
		for _, o := range m.osos { // misma persona, otra pestaña: recupera su osito
			if o.Nombre == nombre && o.clave != "" && time.Since(o.visto) < mInactivo && strings.HasPrefix(o.clave, in.T[:min(8, len(in.T))]) {
				o.visto = time.Now()
				responder(w, 200, map[string]any{"id": o.ID, "clave": o.clave})
				return
			}
		}
		if len(m.activos()) >= mMax {
			fallo(w, 409, "La sala está llena (20 ositos). Espera a que alguien salga o mira la partida.")
			return
		}
		usados := map[int]bool{}
		for _, o := range m.activos() {
			usados[o.Color] = true
		}
		color := 0
		for usados[color] && color < len(mColores)-1 {
			color++
		}
		m.siguiente++
		o := &mOso{ID: m.siguiente, Nombre: nombre, Color: color, clave: in.T[:min(8, len(in.T))] + nuevoToken(), visto: time.Now(), Cayendo: -1}
		m.osos = append(m.osos, o)
		responder(w, 200, map[string]any{"id": o.ID, "clave": o.clave})
	})
	mux.HandleFunc("POST /clase/api/multi/control", func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Clave string  `json:"k"`
			X     float64 `json:"x"`
			Y     float64 `json:"y"`
			Dash  bool    `json:"d"`
		}
		if err := leerJSON(r, &in, 512); err != nil {
			fallo(w, 400, "Pedido inválido.")
			return
		}
		m.mu.Lock()
		defer m.mu.Unlock()
		for _, o := range m.osos {
			if o.clave != "" && o.clave == in.Clave {
				o.visto = time.Now()
				if !math.IsNaN(in.X) && !math.IsNaN(in.Y) {
					o.mx, o.my = math.Max(-1, math.Min(1, in.X)), math.Max(-1, math.Min(1, in.Y))
				}
				if in.Dash {
					o.quiereDa = true
				}
				w.WriteHeader(204)
				return
			}
		}
		fallo(w, 404, "Tu osito salió de la sala. Vuelve a entrar.")
	})
	mux.HandleFunc("GET /clase/api/multi/stream", func(w http.ResponseWriter, r *http.Request) {
		fl, ok := w.(http.Flusher)
		if !ok {
			http.Error(w, "sin streaming", 500)
			return
		}
		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("X-Accel-Buffering", "no")
		c := make(chan []byte, 4)
		m.mu.Lock()
		if len(m.subs) >= 150 {
			m.mu.Unlock()
			http.Error(w, "sala llena", 503)
			return
		}
		m.subs[c] = true
		primero := m.instante()
		m.mu.Unlock()
		defer func() { m.mu.Lock(); delete(m.subs, c); m.mu.Unlock() }()
		fmt.Fprintf(w, "data: %s\n\n", primero)
		fl.Flush()
		latido := time.NewTicker(15 * time.Second)
		defer latido.Stop()
		for {
			select {
			case <-r.Context().Done():
				return
			case b := <-c:
				fmt.Fprintf(w, "data: %s\n\n", b)
				fl.Flush()
			case <-latido.C:
				fmt.Fprint(w, ": latido\n\n")
				fl.Flush()
			}
		}
	})
}
