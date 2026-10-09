// Package auth: cuentas locales (contraseña + token de sesión) y OIDC (Keycloak) con go-oidc.
//
// El contrato manda Keycloak como servidor de autorización; aquí no se implementa OAuth a mano:
// el flujo web (Authorization Code + PKCE) y la validación de access tokens los hace go-oidc.
// El modo local existe para arrancar la clase sin Keycloak (ver docs/DECISIONES.md).
package auth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"

	"github.com/coreos/go-oidc/v3/oidc"
	"golang.org/x/crypto/bcrypt"
	"golang.org/x/oauth2"
)

// TokenPrefix distingue los tokens locales de los JWT de Keycloak.
const TokenPrefix = "lms_"

// HashPassword usa bcrypt.
func HashPassword(pw string) (string, error) {
	h, err := bcrypt.GenerateFromPassword([]byte(pw), bcrypt.DefaultCost)
	return string(h), err
}

// CheckPassword compara con el hash.
func CheckPassword(hash, pw string) bool {
	return hash != "" && bcrypt.CompareHashAndPassword([]byte(hash), []byte(pw)) == nil
}

// NewToken genera un token de sesión opaco.
func NewToken() string {
	var b [32]byte
	if _, err := rand.Read(b[:]); err != nil {
		panic(err)
	}
	return TokenPrefix + base64.RawURLEncoding.EncodeToString(b[:])
}

// HashToken es lo único que se guarda en la base de datos.
func HashToken(tok string) string {
	s := sha256.Sum256([]byte(tok))
	return hex.EncodeToString(s[:])
}

// RandomString devuelve n bytes aleatorios en base64url (state, verifier PKCE).
func RandomString(n int) string {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		panic(err)
	}
	return base64.RawURLEncoding.EncodeToString(b)
}

// --- OIDC ----------------------------------------------------------------------------------

// OIDCConfig es la configuración del realm.
type OIDCConfig struct {
	Issuer       string // https://auth.<dominio>/realms/lms
	ClientID     string // lms-web
	ClientSecret string // vacío si el cliente es público (PKCE)
	RedirectURL  string // https://lms.<dominio>/auth/oidc/callback
	Audience     string // lms-api: audiencia de los access tokens de jmd
}

// OIDC envuelve el proveedor descubierto y sus verificadores.
type OIDC struct {
	cfg      OIDCConfig
	provider *oidc.Provider
	oauth    oauth2.Config
	idVerif  *oidc.IDTokenVerifier // ID tokens del flujo web (aud = client_id)
	apiVerif *oidc.IDTokenVerifier // access tokens de jmd/MCP (aud = lms-api)
}

// Claims es lo que el LMS usa del token (contrato 2.1).
type Claims struct {
	Sub         string   `json:"sub"`
	Email       string   `json:"email"`
	Name        string   `json:"name"`
	Groups      []string `json:"groups"`
	RealmAccess struct {
		Roles []string `json:"roles"`
	} `json:"realm_access"`
}

// NewOIDC descubre el issuer (/.well-known/openid-configuration).
func NewOIDC(ctx context.Context, cfg OIDCConfig) (*OIDC, error) {
	if cfg.Issuer == "" || cfg.ClientID == "" {
		return nil, errors.New("OIDC: faltan issuer o client_id")
	}
	if cfg.Audience == "" {
		cfg.Audience = "lms-api"
	}
	p, err := oidc.NewProvider(ctx, cfg.Issuer)
	if err != nil {
		return nil, fmt.Errorf("OIDC: descubrir %s: %w", cfg.Issuer, err)
	}
	o := &OIDC{cfg: cfg, provider: p}
	o.oauth = oauth2.Config{
		ClientID:     cfg.ClientID,
		ClientSecret: cfg.ClientSecret,
		Endpoint:     p.Endpoint(),
		RedirectURL:  cfg.RedirectURL,
		Scopes:       []string{oidc.ScopeOpenID, "profile", "email", "lms:read", "lms:submit"},
	}
	o.idVerif = p.Verifier(&oidc.Config{ClientID: cfg.ClientID})
	o.apiVerif = p.Verifier(&oidc.Config{ClientID: cfg.Audience})
	return o, nil
}

// AuthURL construye la URL de login con state y PKCE S256.
func (o *OIDC) AuthURL(state, verifier string) string {
	return o.oauth.AuthCodeURL(state, oauth2.S256ChallengeOption(verifier))
}

// Exchange canjea el code y devuelve los claims del ID token verificado.
func (o *OIDC) Exchange(ctx context.Context, code, verifier string) (*Claims, error) {
	tok, err := o.oauth.Exchange(ctx, code, oauth2.VerifierOption(verifier))
	if err != nil {
		return nil, fmt.Errorf("OIDC: canjear code: %w", err)
	}
	raw, ok := tok.Extra("id_token").(string)
	if !ok {
		return nil, errors.New("OIDC: la respuesta no trae id_token")
	}
	idt, err := o.idVerif.Verify(ctx, raw)
	if err != nil {
		return nil, fmt.Errorf("OIDC: id_token: %w", err)
	}
	var c Claims
	if err := idt.Claims(&c); err != nil {
		return nil, err
	}
	// Los roles y grupos pueden venir solo en el access token según el mapper del realm.
	if len(c.RealmAccess.Roles) == 0 || len(c.Groups) == 0 {
		if at, err := o.apiVerif.Verify(ctx, tok.AccessToken); err == nil {
			var ac Claims
			if err := at.Claims(&ac); err == nil {
				if len(c.RealmAccess.Roles) == 0 {
					c.RealmAccess.Roles = ac.RealmAccess.Roles
				}
				if len(c.Groups) == 0 {
					c.Groups = ac.Groups
				}
			}
		}
	}
	return &c, nil
}

// VerifyAccessToken valida un Bearer JWT del realm (iss, exp, aud = lms-api, firma JWKS).
func (o *OIDC) VerifyAccessToken(ctx context.Context, raw string) (*Claims, error) {
	t, err := o.apiVerif.Verify(ctx, raw)
	if err != nil {
		return nil, err
	}
	var c Claims
	if err := t.Claims(&c); err != nil {
		return nil, err
	}
	return &c, nil
}

// Issuer devuelve el issuer configurado.
func (o *OIDC) Issuer() string { return o.cfg.Issuer }

// EndSessionURL es la URL de logout del realm, si la publica.
func (o *OIDC) EndSessionURL() string {
	var extra struct {
		EndSession string `json:"end_session_endpoint"`
	}
	if err := o.provider.Claims(&extra); err == nil {
		return extra.EndSession
	}
	return ""
}

// NormalizeRoles deja solo los roles que el LMS conoce.
func NormalizeRoles(in []string) []string {
	out := []string{}
	for _, r := range in {
		switch r {
		case "admin", "instructor", "student":
			out = append(out, r)
		}
	}
	return out
}

// NormalizeCohorts quita la barra inicial de los grupos de Keycloak.
func NormalizeCohorts(in []string) []string {
	out := []string{}
	for _, g := range in {
		g = strings.TrimPrefix(g, "/")
		if g != "" {
			out = append(out, g)
		}
	}
	return out
}
