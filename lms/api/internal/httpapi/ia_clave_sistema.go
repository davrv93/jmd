package httpapi

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"sort"
	"strings"
	"time"

	"github.com/davrv93/jmd/lms/api/internal/store"
)

// Clave de DeepSeek DEL SISTEMA para el botón «Abrir DeepSeek Harness», puesta desde el panel del instructor (admin):
//
//	GET    /api/v1/admin/ia/deepseek         estado sin la clave (pista «…abcd»), grupos y saldo si hay clave
//	PUT    /api/v1/admin/ia/deepseek         {clave?, grupos[]}  clave vacía = conservar la guardada; se prueba antes
//	POST   /api/v1/admin/ia/deepseek/probar  {clave?}  pide el saldo a DeepSeek (con la escrita o la guardada)
//	DELETE /api/v1/admin/ia/deepseek         quita la clave del sistema
//
// Se guarda en la base del LMS (tabla settings), igual que la clave del Estudio, y se aplica en caliente al relé
// (IAConfig.PonerSistema): sin SSH, sin variables de entorno y sin reiniciar. Al aula nunca entra: el relé de
// ia_rele.go reenvía con el token del aula. La clave nunca vuelve al navegador ni se registra.

const (
	keyIADeepSeekClave  = "ia.deepseek.clave"
	keyIADeepSeekGrupos = "ia.deepseek.grupos"
	keyIADeepSeekPor    = "ia.deepseek.por"
	keyIADeepSeekFecha  = "ia.deepseek.fecha"
	iaSaldoTope         = 8 * time.Second
)

type iaSistema struct {
	Clave  string
	Grupos []string
	Por    string
	Fecha  string
}

func (s *Server) leerIASistema(ctx context.Context) (iaSistema, error) {
	var out iaSistema
	var grupos string
	for _, kv := range []struct {
		k string
		v *string
	}{{keyIADeepSeekClave, &out.Clave}, {keyIADeepSeekGrupos, &grupos}, {keyIADeepSeekPor, &out.Por}, {keyIADeepSeekFecha, &out.Fecha}} {
		v, err := s.DB.Setting(ctx, kv.k)
		if err != nil && !errors.Is(err, store.ErrNotFound) {
			return out, err
		}
		*kv.v = v
	}
	out.Grupos = listaGrupos(grupos)
	return out, nil
}

// listaGrupos parte «grupo-6, grupo-9» en una lista ordenada, sin vacíos ni repetidos.
func listaGrupos(raw string) []string {
	vistos := map[string]bool{}
	out := []string{}
	for _, g := range strings.Split(raw, ",") {
		g = strings.TrimSpace(g)
		if g != "" && !vistos[g] {
			vistos[g] = true
			out = append(out, g)
		}
	}
	sort.Strings(out)
	return out
}

// CargarClaveSistema aplica al relé la clave guardada en la base (al arrancar el LMS).
func (s *Server) CargarClaveSistema(ctx context.Context) {
	if s.IA == nil {
		return
	}
	cfg, err := s.leerIASistema(ctx)
	if err != nil {
		slog.Warn("relé de IA: no se pudo leer la clave del sistema", "err", err)
		return
	}
	s.IA.PonerSistema(cfg.Clave, cfg.Grupos)
	if cfg.Clave != "" {
		slog.Info("relé de IA: clave del sistema activa", "grupos", strings.Join(cfg.Grupos, ","))
	}
}

// cohortesDelCatalogo: cada grupo de los cursos publicados con los títulos de sus cursos.
func (s *Server) cohortesDelCatalogo() []map[string]any {
	cursos := map[string][]string{}
	for _, c := range s.Content.Get().Courses() {
		for _, g := range c.Cohorts {
			cursos[g] = append(cursos[g], c.Title)
		}
	}
	ids := make([]string, 0, len(cursos))
	for g := range cursos {
		ids = append(ids, g)
	}
	sort.Strings(ids)
	out := make([]map[string]any, 0, len(ids))
	for _, g := range ids {
		out = append(out, map[string]any{"id": g, "cursos": cursos[g]})
	}
	return out
}

func (s *Server) iaSistemaVista(cfg iaSistema) map[string]any {
	entorno := []string{}
	if s.IA != nil {
		for g, k := range s.IA.Claves {
			if k != "" {
				entorno = append(entorno, g)
			}
		}
		sort.Strings(entorno)
	}
	return map[string]any{
		"disponible":   s.IA != nil,
		"clave_puesta": cfg.Clave != "",
		"clave_pista":  keyHint(cfg.Clave),
		"grupos":       cfg.Grupos,
		"por":          cfg.Por,
		"fecha":        cfg.Fecha,
		"entorno":      entorno,
		"cohortes":     s.cohortesDelCatalogo(),
	}
}

// adminIADeepSeekGet: GET /api/v1/admin/ia/deepseek.
func (s *Server) adminIADeepSeekGet(w http.ResponseWriter, r *http.Request, p *Principal) {
	cfg, err := s.leerIASistema(r.Context())
	if err != nil {
		internal(w, err)
		return
	}
	v := s.iaSistemaVista(cfg)
	if cfg.Clave != "" && s.IA != nil {
		v["saldo"] = s.IA.saldoDeepSeek(r.Context(), cfg.Clave)
	}
	writeJSON(w, 200, v)
}

// adminIADeepSeekPut: PUT /api/v1/admin/ia/deepseek {clave?, grupos[]}.
func (s *Server) adminIADeepSeekPut(w http.ResponseWriter, r *http.Request, p *Principal) {
	if s.IA == nil {
		writeErr(w, 503, "sin_rele", "Este servidor no tiene el relé de IA (falta la semilla del aula).")
		return
	}
	var in struct {
		Clave  string   `json:"clave"`
		Grupos []string `json:"grupos"`
	}
	if !readJSON(w, r, &in) {
		return
	}
	actual, err := s.leerIASistema(r.Context())
	if err != nil {
		internal(w, err)
		return
	}
	clave := limpiarClaveDeepSeek(in.Clave)
	in.Clave = ""
	nueva := clave != ""
	if !nueva {
		clave = actual.Clave
	} else if !reClaveDeepSeek.MatchString(clave) {
		writeErr(w, 400, "clave_invalida", "Esa clave no parece de DeepSeek: cópiala completa desde platform.deepseek.com (empieza por «sk-»), sin comillas ni espacios.")
		return
	}
	if clave == "" {
		writeErr(w, 400, "sin_clave", "Pega la clave de DeepSeek.")
		return
	}
	grupos := listaGrupos(strings.Join(in.Grupos, ","))
	if len(grupos) == 0 {
		writeErr(w, 400, "sin_grupos", "Elige al menos un grupo que use la clave.")
		return
	}
	var saldo map[string]any
	if nueva {
		saldo = s.IA.saldoDeepSeek(r.Context(), clave)
		if saldo["estado"] == 401 || saldo["estado"] == 403 {
			writeErr(w, 400, "clave_rechazada", "DeepSeek rechazó esa clave (API key is invalid). Revisa que esté completa.")
			return
		}
	}
	ctx := r.Context()
	fecha := time.Now().UTC().Format(time.RFC3339)
	for k, v := range map[string]string{keyIADeepSeekClave: clave, keyIADeepSeekGrupos: strings.Join(grupos, ","), keyIADeepSeekPor: p.Email, keyIADeepSeekFecha: fecha} {
		if err := s.DB.SetSetting(ctx, k, v); err != nil {
			internal(w, err)
			return
		}
	}
	s.IA.PonerSistema(clave, grupos)
	slog.Info("relé de IA: clave del sistema guardada", "por", p.Email, "clave_nueva", nueva, "grupos", strings.Join(grupos, ","))
	v := s.iaSistemaVista(iaSistema{Clave: clave, Grupos: grupos, Por: p.Email, Fecha: fecha})
	if saldo == nil {
		saldo = s.IA.saldoDeepSeek(ctx, clave)
	}
	v["saldo"] = saldo
	writeJSON(w, 200, v)
}

// adminIADeepSeekProbar: POST /api/v1/admin/ia/deepseek/probar {clave?}.
func (s *Server) adminIADeepSeekProbar(w http.ResponseWriter, r *http.Request, p *Principal) {
	if s.IA == nil {
		writeErr(w, 503, "sin_rele", "Este servidor no tiene el relé de IA (falta la semilla del aula).")
		return
	}
	var in struct {
		Clave string `json:"clave"`
	}
	if !readJSONAllowEmpty(w, r, &in) {
		return
	}
	clave := limpiarClaveDeepSeek(in.Clave)
	in.Clave = ""
	if clave == "" {
		cfg, err := s.leerIASistema(r.Context())
		if err != nil {
			internal(w, err)
			return
		}
		clave = cfg.Clave
	}
	if clave == "" {
		writeErr(w, 400, "sin_clave", "Pega la clave de DeepSeek.")
		return
	}
	writeJSON(w, 200, s.IA.saldoDeepSeek(r.Context(), clave))
}

// adminIADeepSeekBorrar: DELETE /api/v1/admin/ia/deepseek.
func (s *Server) adminIADeepSeekBorrar(w http.ResponseWriter, r *http.Request, p *Principal) {
	ctx := r.Context()
	for _, k := range []string{keyIADeepSeekClave, keyIADeepSeekGrupos, keyIADeepSeekPor, keyIADeepSeekFecha} {
		if err := s.DB.SetSetting(ctx, k, ""); err != nil {
			internal(w, err)
			return
		}
	}
	if s.IA != nil {
		s.IA.PonerSistema("", nil)
	}
	slog.Info("relé de IA: clave del sistema quitada", "por", p.Email)
	writeJSON(w, 200, s.iaSistemaVista(iaSistema{}))
}

func limpiarClaveDeepSeek(raw string) string {
	c := strings.Join(strings.Fields(raw), "")
	return strings.TrimPrefix(c, "DEEPSEEK_API_KEY=")
}

// saldoDeepSeek pide GET /user/balance a DeepSeek (mismo host que el relé). Devuelve {ok, estado, ms, saldo,
// disponible, detalle}; nunca la clave ni el cuerpo de un error (el 401 de DeepSeek trae la clave enmascarada).
func (c *IAConfig) saldoDeepSeek(ctx context.Context, clave string) map[string]any {
	c.iniciar()
	t0 := time.Now()
	res := map[string]any{"ok": false, "estado": 0, "ms": 0}
	up, err := url.Parse(c.upstream())
	if err != nil || up.Host == "" {
		res["detalle"] = "relé mal configurado (LMS_IA_UPSTREAM)"
		return res
	}
	ctx, cancel := context.WithTimeout(ctx, iaSaldoTope)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, up.Scheme+"://"+up.Host+"/user/balance", nil)
	if err != nil {
		res["detalle"] = "no se pudo armar la petición"
		return res
	}
	req.Header.Set("Authorization", "Bearer "+clave)
	req.Header.Set("Accept", "application/json")
	resp, err := (&http.Client{Transport: c.transport}).Do(req)
	res["ms"] = time.Since(t0).Milliseconds()
	if err != nil {
		res["detalle"] = "DeepSeek no responde"
		return res
	}
	defer resp.Body.Close()
	res["estado"] = resp.StatusCode
	cuerpo, _ := io.ReadAll(io.LimitReader(resp.Body, 64<<10))
	switch {
	case resp.StatusCode == 401 || resp.StatusCode == 403:
		res["detalle"] = "DeepSeek rechazó la clave"
		return res
	case resp.StatusCode != 200:
		res["detalle"] = "DeepSeek respondió HTTP " + http.StatusText(resp.StatusCode)
		return res
	}
	var b struct {
		Disponible bool `json:"is_available"`
		Infos      []struct {
			Moneda string `json:"currency"`
			Total  string `json:"total_balance"`
		} `json:"balance_infos"`
	}
	if json.Unmarshal(cuerpo, &b) != nil {
		res["ok"] = true
		res["detalle"] = "clave válida (saldo ilegible)"
		return res
	}
	saldos := []string{}
	for _, i := range b.Infos {
		saldos = append(saldos, i.Total+" "+i.Moneda)
	}
	res["ok"] = true
	res["disponible"] = b.Disponible
	res["saldo"] = strings.Join(saldos, " · ")
	if !b.Disponible {
		res["detalle"] = "la cuenta no tiene saldo: recarga en platform.deepseek.com"
	}
	return res
}
