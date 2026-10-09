//! Un issuer OIDC de mentira (como el realm `lms` de Keycloak) para las pruebas del gateway y de
//! `jmd login --sso`: descubrimiento, JWKS, authorize (redirige con el `code`), token (code +
//! PKCE, refresh y device), device_authorization y revoke. Firma RS256 con una clave fija.
#![allow(dead_code)]

use axum::extract::{Form, Query, State};
use axum::http::StatusCode;
use axum::response::{IntoResponse, Redirect, Response};
use axum::routing::{get, post};
use axum::{Json, Router};
use base64::Engine as _;
use serde_json::{json, Value};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};

/// Clave RSA de prueba (PKCS#8 DER en base64). Solo para las pruebas.
const KEY_B64: &str = "MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCOvpN7SeeaegH72vCsP9KLT2nFF3jzE9X2z1woWxptHABABXoU57So8z7GBqJPwi1JrlOzDhmUaJQB2gtl8YQBHEjIbyXTsXVNrPF/Jqe2K5Busp8qA3OHx+xql/G+oT1RHZfg4/nyyDhas9nyqxC/oEDAtg5mqGinQOnNTgNz/VuCAVNM1untV4Bpgt6JE9oh51G0pljImmgcnLRnezjvdANTWg28dzoLgrzAqEED+oESLvEaG5InZETF9U6e+5QZoFWFpO0EHz7tc+ukScYpMfLiZicTJc+oIesd6cnpEzxxKKoPsFWQrsQOwOWUKiiSrF7jQt7/9lTmAdG+83x/AgMBAAECggEAFV3tkZzkcDknJt4E/KOpDnVarcfvsOMdOg6cCuZoNEDmwK6RMaPlZQzULqw7i5jTUp4npTvNFGv7C7Pp1N6sFcZ4Fpicnu2HU5M5qwDMRfaLbiaKsK1Hk+GXP/VymEhmd0fovh8iAPd7iAg37Z0xqp2AU9hsm21GDRMobDTrS2c+Fdq23LR7I2q5m8955RZUeLoqxjPrS+NGvsHwy7enCRTLTbLtVj4A5fHuiXhwu5vM/PFnvHHehs44+r61kjnk/RMHcD2JD+ZSHqn9hq2KhDV6PJ8wRy9Mr0w2s6pPII7rj6rar0d9F/bScWwVygFpy5H7M5eCjHKU39Qm7VRd8QKBgQDEHpNdEIWHLTnn8FviVACnF+mWwsbg/Ccc73GDW6WmW2hPDTSy+hTdAU+7T4MUpnKkognlsGhDJ1LYcNAYxzZWgZB6fiJ5JzikM4UXXVskrl9y0rEdwZlUESxtp2O6sAQhxT1V5EYQj1UHvuABJb9pNXCTi2SniNlpJqT7PVph+wKBgQC6VAMbW+k3HvON+AB5tqk1rFe4vjy/W8DwNJ098k0FA/L0j62MNNuTKfZYq3hPLQffIfOMl1OC9y0JxQAKp+y3zTFMCxXcKBKnVLr/eW0B/Re/Ne0rzrcgco7UQsZ+1pJ3qWc4+Wk3SwwdsfwoLHeyPQmDfIpJ8TZAZELuXxDMTQKBgQDDG6QBbwFYZO75xw6yUF3B3jE+EhJnG5QR3khwpUlcAg34ryuhbtg4sihPMaA3eAwPq0DraB+hx0pNF5Z/QBjX4NgKdNf47cMU4Ehk4TRefrdodSFNeCABGYC4qlG2FYxWyHHntEzcBqxSI1uY6KPPmCGiN4fwgF3ClXaGmBgF5wKBgH/59gxTi5ItcxE+lm0CtaPE1JdyKl0wkwsoyBtlEdtxA+1Pxd5365xfhPEQDNksz6xFMHeO9HAOf2OnaEjpX6A6kjJtpr0I1Q8TFkEkUGe+QxI04spk98iUhl9p4dX6YK1JsDkkrUyqAg9fURbyu9+zJpal8oGo6B8//eylZO89AoGBAJiMnR13avvkiObL93P5GJpvEA9wRYdMG1sZaMW6oV7k0MyIu2FOd1m4NWqDtazP6VUZFcQadMkisXhMrw8xCfAuan71y0YubLFlnhPASKxBonoQMUWuCmksuvTci70T8AF811wchShroWeMBVWJgv8rYYBphFMghSNXKqlBH3gF";

pub const KID: &str = "prueba-1";

fn b64(b: &[u8]) -> String {
    base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(b)
}

pub fn key_pair() -> ring::signature::RsaKeyPair {
    let der = base64::engine::general_purpose::STANDARD.decode(KEY_B64).unwrap();
    ring::signature::RsaKeyPair::from_pkcs8(&der).unwrap()
}

pub fn jwks() -> Value {
    let kp = key_pair();
    let c = ring::signature::RsaPublicKeyComponents::<Vec<u8>>::from(kp.public());
    json!({"keys": [{"kty": "RSA", "alg": "RS256", "use": "sig", "kid": KID, "n": b64(&c.n), "e": b64(&c.e)}]})
}

/// Firma un JWT RS256 con la clave de prueba.
pub fn sign(claims: &Value, kid: &str) -> String {
    let kp = key_pair();
    let header = json!({"alg": "RS256", "typ": "JWT", "kid": kid});
    let signed = format!("{}.{}", b64(header.to_string().as_bytes()), b64(claims.to_string().as_bytes()));
    let mut sig = vec![0u8; kp.public().modulus_len()];
    kp.sign(&ring::signature::RSA_PKCS1_SHA256, &ring::rand::SystemRandom::new(), signed.as_bytes(), &mut sig).unwrap();
    format!("{signed}.{}", b64(&sig))
}

fn now() -> f64 {
    std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_secs_f64()
}

/// Un access token como el del realm: `aud` lms-api y ai-gateway, roles y cohortes.
pub fn access_token(issuer: &str, sub: &str, cohorts: &[&str], ttl: f64) -> String {
    sign(&json!({"iss": issuer, "sub": sub, "aud": ["lms-api", "ai-gateway"], "exp": now() + ttl, "iat": now(),
        "name": format!("Alumna {sub}"), "email": format!("{sub}@ejemplo.edu"), "preferred_username": sub,
        "groups": cohorts.iter().map(|c| format!("/{c}")).collect::<Vec<_>>(),
        "realm_access": {"roles": ["student"]}, "scope": "openid profile email lms:read lms:submit ai:use"}), KID)
}

// --- El issuer de mentira -----------------------------------------------------

#[derive(Default)]
pub struct Issuer {
    pub url: Mutex<String>,
    /// code → (code_challenge, redirect_uri)
    codes: Mutex<HashMap<String, (String, String)>>,
    /// device_code → sondeos hechos (se aprueba al segundo)
    devices: Mutex<HashMap<String, u32>>,
    pub revoked: Mutex<Vec<String>>,
    pub token_calls: Mutex<Vec<HashMap<String, String>>>,
    /// Si es true, /token devuelve refresh tokens distintos en cada refresco (rotación).
    pub sub: Mutex<String>,
    pub cohorts: Mutex<Vec<String>>,
}

impl Issuer {
    fn tokens(&self) -> Value {
        let url = self.url.lock().unwrap().clone();
        let sub = self.sub.lock().unwrap().clone();
        let cohorts: Vec<String> = self.cohorts.lock().unwrap().clone();
        let c: Vec<&str> = cohorts.iter().map(String::as_str).collect();
        let at = access_token(&url, &sub, &c, 900.0);
        let id = sign(&json!({"iss": url, "sub": sub, "aud": "jmd-cli", "exp": now() + 900.0, "name": format!("Alumna {sub}"),
            "email": format!("{sub}@ejemplo.edu")}), KID);
        json!({"access_token": at, "token_type": "Bearer", "expires_in": 900, "refresh_token": format!("rt-{}", uuid::Uuid::new_v4().simple()),
            "id_token": id, "scope": "openid profile email offline_access lms:read lms:submit ai:use"})
    }
}

async fn discovery(State(i): State<Arc<Issuer>>) -> Json<Value> {
    let u = i.url.lock().unwrap().clone();
    Json(json!({"issuer": u, "authorization_endpoint": format!("{u}/authorize"), "token_endpoint": format!("{u}/token"),
        "jwks_uri": format!("{u}/jwks"), "device_authorization_endpoint": format!("{u}/device"),
        "revocation_endpoint": format!("{u}/revoke"), "end_session_endpoint": format!("{u}/logout"),
        "code_challenge_methods_supported": ["S256"], "grant_types_supported": ["authorization_code", "refresh_token",
        "urn:ietf:params:oauth:grant-type:device_code"]}))
}

async fn authorize(State(i): State<Arc<Issuer>>, Query(q): Query<HashMap<String, String>>) -> Response {
    let (Some(redirect), Some(state), Some(challenge)) = (q.get("redirect_uri"), q.get("state"), q.get("code_challenge")) else {
        return (StatusCode::BAD_REQUEST, "faltan parámetros").into_response();
    };
    if q.get("code_challenge_method").map(String::as_str) != Some("S256") || q.get("client_id").map(String::as_str) != Some("jmd-cli")
        || !redirect.starts_with("http://127.0.0.1:") {
        return (StatusCode::BAD_REQUEST, format!("petición inválida: {q:?}")).into_response();
    }
    let code = format!("code-{}", uuid::Uuid::new_v4().simple());
    i.codes.lock().unwrap().insert(code.clone(), (challenge.clone(), redirect.clone()));
    Redirect::to(&format!("{redirect}?code={code}&state={state}")).into_response()
}

async fn token(State(i): State<Arc<Issuer>>, Form(f): Form<HashMap<String, String>>) -> Response {
    i.token_calls.lock().unwrap().push(f.clone());
    let err = |e: &str| (StatusCode::BAD_REQUEST, Json(json!({"error": e}))).into_response();
    match f.get("grant_type").map(String::as_str) {
        Some("authorization_code") => {
            let Some((challenge, redirect)) = f.get("code").and_then(|c| i.codes.lock().unwrap().remove(c)) else { return err("invalid_grant") };
            if f.get("redirect_uri") != Some(&redirect) {
                return err("invalid_grant");
            }
            let verifier = f.get("code_verifier").cloned().unwrap_or_default();
            let digest = ring::digest::digest(&ring::digest::SHA256, verifier.as_bytes());
            if b64(digest.as_ref()) != challenge {
                return err("invalid_grant");
            }
            Json(i.tokens()).into_response()
        }
        Some("refresh_token") => {
            let rt = f.get("refresh_token").cloned().unwrap_or_default();
            if !rt.starts_with("rt-") || i.revoked.lock().unwrap().contains(&rt) {
                return err("invalid_grant");
            }
            Json(i.tokens()).into_response()
        }
        Some("urn:ietf:params:oauth:grant-type:device_code") => {
            let dc = f.get("device_code").cloned().unwrap_or_default();
            let mut d = i.devices.lock().unwrap();
            let Some(n) = d.get_mut(&dc) else { return err("invalid_grant") };
            *n += 1;
            if *n < 2 {
                return err("authorization_pending");
            }
            Json(i.tokens()).into_response()
        }
        _ => err("unsupported_grant_type"),
    }
}

async fn device(State(i): State<Arc<Issuer>>, Form(f): Form<HashMap<String, String>>) -> Response {
    if f.get("client_id").map(String::as_str) != Some("jmd-cli") {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "invalid_client"}))).into_response();
    }
    let u = i.url.lock().unwrap().clone();
    let dc = format!("dev-{}", uuid::Uuid::new_v4().simple());
    i.devices.lock().unwrap().insert(dc.clone(), 0);
    Json(json!({"device_code": dc, "user_code": "ABCD-1234", "verification_uri": format!("{u}/device-login"),
        "verification_uri_complete": format!("{u}/device-login?user_code=ABCD-1234"), "expires_in": 600, "interval": 1})).into_response()
}

async fn revoke(State(i): State<Arc<Issuer>>, Form(f): Form<HashMap<String, String>>) -> StatusCode {
    if let Some(t) = f.get("token") {
        i.revoked.lock().unwrap().push(t.clone());
    }
    StatusCode::OK
}

/// Arranca el issuer y devuelve su URL (que es su `iss`).
pub async fn start_issuer(sub: &str, cohorts: &[&str]) -> (String, Arc<Issuer>) {
    let issuer = Arc::new(Issuer::default());
    *issuer.sub.lock().unwrap() = sub.to_string();
    *issuer.cohorts.lock().unwrap() = cohorts.iter().map(|c| c.to_string()).collect();
    let app = Router::new()
        .route("/.well-known/openid-configuration", get(discovery))
        .route("/jwks", get(|| async { Json(jwks()) }))
        .route("/authorize", get(authorize))
        .route("/token", post(token))
        .route("/device", post(device))
        .route("/revoke", post(revoke))
        .with_state(issuer.clone());
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let url = format!("http://{}", listener.local_addr().unwrap());
    *issuer.url.lock().unwrap() = url.clone();
    tokio::spawn(async move { axum::serve(listener, app).await.unwrap() });
    (url, issuer)
}
