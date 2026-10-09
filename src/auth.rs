//! Cuentas del LMS en el gateway (contrato 2.4): access tokens OIDC del realm con audiencia
//! `ai-gateway`, tokens personales que el gateway emite a cambio de uno de ellos (para OpenCode y
//! otros clientes que no saben refrescar), y cuotas por alumno y por cohorte.
//!
//! El JWT se valida con el JWKS del issuer (RS256, con caché): `iss`, `exp` y `aud`. No se guarda
//! el email: la telemetría registra `sub` y la cohorte.

use crate::config::{AuthCfg, UserQuota};
use crate::reliability::now;
use base64::Engine as _;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::sync::Mutex;

/// Audiencia por defecto de los access tokens que acepta el gateway.
pub const AUDIENCE: &str = "ai-gateway";
/// Prefijo de los tokens personales que emite el gateway.
pub const TOKEN_PREFIX: &str = "jg_";

/// Quién hace la petición, cuando trae una cuenta del LMS.
#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
pub struct Principal {
    pub sub: String,
    #[serde(default)]
    pub name: Option<String>,
    #[serde(default)]
    pub cohorts: Vec<String>,
    #[serde(default)]
    pub roles: Vec<String>,
}

impl Principal {
    /// La cohorte que cuenta para la cuota (la primera).
    pub fn cohort(&self) -> Option<&str> {
        self.cohorts.first().map(String::as_str)
    }
}

fn b64url(s: &str) -> Result<Vec<u8>, String> {
    base64::engine::general_purpose::URL_SAFE_NO_PAD.decode(s.trim_end_matches('='))
        .map_err(|_| "base64url inválido".to_string())
}

/// Lee el payload de un JWT sin verificarlo (para `exp` o `sub` en el cliente).
pub fn peek(token: &str) -> Option<Value> {
    let mut parts = token.split('.');
    let (_h, p, _s) = (parts.next()?, parts.next()?, parts.next()?);
    serde_json::from_slice(&b64url(p).ok()?).ok()
}

/// Módulo y exponente de una clave pública RSA del JWKS.
type RsaKey = (Vec<u8>, Vec<u8>);

/// Claves públicas del issuer (JWKS), con caché. Se vuelve a pedir si falta el `kid`,
/// como mucho una vez por minuto, para que una rotación de claves no cueste nada.
pub struct Jwks {
    client: reqwest::Client,
    state: Mutex<JwksState>,
}

#[derive(Default)]
struct JwksState {
    /// URL del JWKS descubierta para este issuer.
    issuer: String,
    jwks_url: String,
    keys: HashMap<String, RsaKey>,
    fetched_at: f64,
}

impl Default for Jwks {
    fn default() -> Self {
        Self {
            client: reqwest::Client::builder().connect_timeout(std::time::Duration::from_secs(5)).build().expect("http"),
            state: Mutex::new(JwksState::default()),
        }
    }
}

impl Jwks {
    async fn fetch(&self, cfg: &AuthCfg) -> Result<(), String> {
        let cached: Option<String> = {
            let st = self.state.lock().unwrap();
            (st.issuer == cfg.issuer && !st.jwks_url.is_empty()).then(|| st.jwks_url.clone())
        };
        let jwks_url = match (&cfg.jwks_url, cached) {
            (Some(u), _) if !u.is_empty() => u.clone(),
            (_, Some(u)) => u,
            _ => {
                let disc = format!("{}/.well-known/openid-configuration", cfg.issuer.trim_end_matches('/'));
                let v: Value = self.client.get(&disc).send().await.map_err(|e| format!("descubrir {disc}: {e}"))?
                    .json().await.map_err(|e| format!("descubrir {disc}: {e}"))?;
                v["jwks_uri"].as_str().map(String::from).ok_or_else(|| format!("{disc} no trae jwks_uri"))?
            }
        };
        let v: Value = self.client.get(&jwks_url).send().await.map_err(|e| format!("JWKS {jwks_url}: {e}"))?
            .json().await.map_err(|e| format!("JWKS {jwks_url}: {e}"))?;
        let mut keys = HashMap::new();
        for k in v["keys"].as_array().into_iter().flatten() {
            if k["kty"].as_str() != Some("RSA") {
                continue;
            }
            let (Some(kid), Some(n), Some(e)) = (k["kid"].as_str(), k["n"].as_str(), k["e"].as_str()) else { continue };
            if let (Ok(n), Ok(e)) = (b64url(n), b64url(e)) {
                keys.insert(kid.to_string(), (n, e));
            }
        }
        let mut st = self.state.lock().unwrap();
        st.issuer = cfg.issuer.clone();
        st.jwks_url = jwks_url;
        st.keys = keys;
        st.fetched_at = now();
        Ok(())
    }

    async fn key(&self, kid: &str, cfg: &AuthCfg) -> Result<RsaKey, String> {
        let hit: Result<Option<RsaKey>, String> = {
            let st = self.state.lock().unwrap();
            if st.issuer != cfg.issuer {
                Ok(None)
            } else if let Some(k) = st.keys.get(kid) {
                Ok(Some(k.clone()))
            } else if now() - st.fetched_at < 60.0 {
                Err(format!("clave {kid} desconocida para el issuer"))
            } else {
                Ok(None)
            }
        };
        if let Some(k) = hit? {
            return Ok(k);
        }
        self.fetch(cfg).await?;
        let st = self.state.lock().unwrap();
        st.keys.get(kid).cloned().ok_or_else(|| format!("clave {kid} desconocida para el issuer"))
    }

    /// Valida un access token del realm: firma RS256, `iss`, `exp` y `aud`.
    pub async fn verify(&self, token: &str, cfg: &AuthCfg) -> Result<Principal, String> {
        let parts: Vec<&str> = token.split('.').collect();
        if parts.len() != 3 {
            return Err("no es un JWT".into());
        }
        let header: Value = serde_json::from_slice(&b64url(parts[0])?).map_err(|_| "cabecera inválida")?;
        if header["alg"].as_str() != Some("RS256") {
            return Err(format!("algoritmo no soportado: {}", header["alg"].as_str().unwrap_or("?")));
        }
        let kid = header["kid"].as_str().ok_or("el token no trae kid")?;
        let (n, e) = self.key(kid, cfg).await?;
        let sig = b64url(parts[2])?;
        let signed = format!("{}.{}", parts[0], parts[1]);
        ring::signature::RsaPublicKeyComponents { n: &n, e: &e }
            .verify(&ring::signature::RSA_PKCS1_2048_8192_SHA256, signed.as_bytes(), &sig)
            .map_err(|_| "firma inválida".to_string())?;
        let claims: Value = serde_json::from_slice(&b64url(parts[1])?).map_err(|_| "payload inválido")?;
        check_claims(&claims, cfg)
    }
}

/// Comprueba `iss`, `exp` (con 60 s de margen) y `aud`, y saca el principal.
pub fn check_claims(claims: &Value, cfg: &AuthCfg) -> Result<Principal, String> {
    let iss = claims["iss"].as_str().unwrap_or("");
    if iss.trim_end_matches('/') != cfg.issuer.trim_end_matches('/') {
        return Err(format!("issuer inesperado: {iss}"));
    }
    let exp = claims["exp"].as_f64().ok_or("el token no trae exp")?;
    if exp + 60.0 < now() {
        return Err("token vencido".into());
    }
    let aud_ok = match &claims["aud"] {
        Value::String(a) => a == &cfg.audience,
        Value::Array(a) => a.iter().any(|x| x.as_str() == Some(cfg.audience.as_str())),
        _ => false,
    };
    if !aud_ok {
        return Err(format!("el token no es para {}", cfg.audience));
    }
    let sub = claims["sub"].as_str().filter(|s| !s.is_empty()).ok_or("el token no trae sub")?;
    let list = |v: &Value| v.as_array().into_iter().flatten().filter_map(|x| x.as_str().map(String::from)).collect::<Vec<_>>();
    Ok(Principal {
        sub: sub.to_string(),
        name: claims["name"].as_str().or(claims["preferred_username"].as_str()).map(String::from),
        cohorts: list(&claims["groups"]).into_iter().map(|g| g.trim_start_matches('/').to_string()).filter(|g| !g.is_empty()).collect(),
        roles: list(&claims["realm_access"]["roles"]),
    })
}

/// Token personal nuevo (`jg_…`) y su hash, que es lo único que se guarda.
pub fn new_personal_token() -> (String, String) {
    use rand::RngCore;
    let mut b = [0u8; 32];
    rand::thread_rng().fill_bytes(&mut b);
    let t = format!("{TOKEN_PREFIX}{}", base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(b));
    let h = hash_token(&t);
    (t, h)
}

pub fn hash_token(t: &str) -> String {
    use sha2::{Digest, Sha256};
    let mut h = Sha256::new();
    h.update(t.as_bytes());
    h.finalize().iter().map(|b| format!("{b:02x}")).collect()
}

// ---------------------------------------------------------------------------
// Cuotas por alumno y por cohorte (peticiones y tokens por día, en memoria)
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Default, PartialEq)]
pub struct Used {
    pub requests: u64,
    pub tokens: u64,
}

#[derive(Default)]
pub struct Usage {
    /// (clave, día UTC) → uso. La clave es `u:<sub>` o `c:<cohorte>`.
    counters: Mutex<HashMap<(String, u32), Used>>,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct QuotaExceeded {
    /// `user` o `cohort`.
    pub scope: String,
    /// `requests_per_day` o `tokens_per_day`.
    pub what: String,
    pub limit: u64,
    pub used: u64,
    /// Segundos hasta la medianoche UTC.
    pub retry_after: u64,
}

fn day(t: f64) -> u32 {
    (t / 86_400.0) as u32
}

fn until_tomorrow(t: f64) -> u64 {
    (86_400.0 - t.rem_euclid(86_400.0)).ceil() as u64
}

impl Usage {
    pub fn used(&self, key: &str, t: f64) -> Used {
        self.counters.lock().unwrap().get(&(key.to_string(), day(t))).cloned().unwrap_or_default()
    }

    /// Antes de atender: ¿cabe una petición más?
    pub fn check(&self, p: &Principal, cfg: &AuthCfg, t: f64) -> Result<(), QuotaExceeded> {
        let scopes = [("user", format!("u:{}", p.sub), cfg.per_user.clone())]
            .into_iter()
            .chain(p.cohort().map(|c| ("cohort", format!("c:{c}"), cfg.cohort_quota(c))));
        for (scope, key, q) in scopes {
            let used = self.used(&key, t);
            let over = if q.requests_per_day > 0 && used.requests >= q.requests_per_day {
                Some(("requests_per_day", q.requests_per_day, used.requests))
            } else if q.tokens_per_day > 0 && used.tokens >= q.tokens_per_day {
                Some(("tokens_per_day", q.tokens_per_day, used.tokens))
            } else {
                None
            };
            if let Some((what, limit, used)) = over {
                return Err(QuotaExceeded { scope: scope.into(), what: what.into(), limit, used, retry_after: until_tomorrow(t) });
            }
        }
        Ok(())
    }

    pub fn record(&self, p: &Principal, tokens: u64, t: f64) {
        let mut c = self.counters.lock().unwrap();
        let mut keys = vec![format!("u:{}", p.sub)];
        keys.extend(p.cohort().map(|c| format!("c:{c}")));
        for k in keys {
            let u = c.entry((k, day(t))).or_default();
            u.requests += 1;
            u.tokens += tokens;
        }
        // Que no crezca sin fin: fuera los días anteriores.
        let today = day(t);
        c.retain(|(_, d), _| *d == today);
    }

    /// Lo de hoy, para la UI: `[{scope, id, requests, tokens, limits}]`.
    pub fn today(&self, cfg: &AuthCfg, t: f64) -> Vec<Value> {
        let c = self.counters.lock().unwrap();
        let mut rows: Vec<Value> = c.iter().filter(|((_, d), _)| *d == day(t)).map(|((k, _), u)| {
            let (scope, id) = k.split_once(':').unwrap_or(("?", k));
            let q = if scope == "u" { cfg.per_user.clone() } else { cfg.cohort_quota(id) };
            serde_json::json!({"scope": if scope == "u" { "user" } else { "cohort" }, "id": id,
                "requests": u.requests, "tokens": u.tokens, "limits": q})
        }).collect();
        rows.sort_by(|a, b| b["requests"].as_u64().cmp(&a["requests"].as_u64()));
        rows
    }

    /// Lo que le queda hoy a un principal, para `GET /v1/auth/me`.
    pub fn remaining(&self, p: &Principal, cfg: &AuthCfg, t: f64) -> Value {
        let row = |q: &UserQuota, used: Used| serde_json::json!({
            "requests": used.requests, "tokens": used.tokens,
            "requests_per_day": q.requests_per_day, "tokens_per_day": q.tokens_per_day,
        });
        let mut v = serde_json::json!({"user": row(&cfg.per_user, self.used(&format!("u:{}", p.sub), t))});
        if let Some(c) = p.cohort() {
            v["cohort"] = row(&cfg.cohort_quota(c), self.used(&format!("c:{c}"), t));
        }
        v["reset_in"] = serde_json::json!(until_tomorrow(t));
        v
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn cfg() -> AuthCfg {
        let mut c = AuthCfg { issuer: "https://auth.x/realms/lms".into(), ..Default::default() };
        c.per_user = UserQuota { requests_per_day: 2, tokens_per_day: 0 };
        c.cohorts.insert("c1".into(), UserQuota { requests_per_day: 3, tokens_per_day: 100 });
        c
    }

    #[test]
    fn claims_are_checked() {
        let c = cfg();
        let ok = serde_json::json!({"iss": "https://auth.x/realms/lms/", "exp": now() + 100.0, "aud": ["lms-api", "ai-gateway"],
            "sub": "u1", "groups": ["/c1"], "realm_access": {"roles": ["student"]}});
        let p = check_claims(&ok, &c).unwrap();
        assert_eq!(p.cohorts, vec!["c1"]);
        assert_eq!(p.roles, vec!["student"]);
        let mut bad = ok.clone();
        bad["aud"] = serde_json::json!("lms-api");
        assert!(check_claims(&bad, &c).unwrap_err().contains("ai-gateway"));
        bad = ok.clone();
        bad["exp"] = serde_json::json!(now() - 120.0);
        assert!(check_claims(&bad, &c).unwrap_err().contains("vencido"));
        bad = ok.clone();
        bad["iss"] = serde_json::json!("https://otro");
        assert!(check_claims(&bad, &c).is_err());
    }

    #[test]
    fn quotas_per_user_and_cohort() {
        let c = cfg();
        let u = Usage::default();
        let t = now();
        let a = Principal { sub: "a".into(), cohorts: vec!["c1".into()], ..Default::default() };
        let b = Principal { sub: "b".into(), cohorts: vec!["c1".into()], ..Default::default() };
        assert!(u.check(&a, &c, t).is_ok());
        u.record(&a, 10, t);
        u.record(&a, 10, t);
        let e = u.check(&a, &c, t).unwrap_err();
        assert_eq!((e.scope.as_str(), e.what.as_str(), e.limit), ("user", "requests_per_day", 2));
        // b todavía puede (1 petición más en la cohorte: 3 - 2)
        assert!(u.check(&b, &c, t).is_ok());
        u.record(&b, 90, t);
        let e = u.check(&b, &c, t).unwrap_err();
        assert_eq!(e.scope, "cohort");
        // Al día siguiente, limpio.
        assert!(u.check(&a, &c, t + 86_400.0).is_ok());
        assert_eq!(u.today(&c, t).len(), 3);
        let r = u.remaining(&b, &c, t);
        assert_eq!(r["cohort"]["tokens"], 110);
    }

    #[test]
    fn personal_tokens() {
        let (t, h) = new_personal_token();
        assert!(t.starts_with(TOKEN_PREFIX) && h.len() == 64);
        assert_eq!(hash_token(&t), h);
        assert!(peek("a.b").is_none());
    }
}
