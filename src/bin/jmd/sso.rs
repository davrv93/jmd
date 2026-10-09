//! `jmd login --sso`: la cuenta del LMS en la terminal (contrato 2.1 y 2.4).
//!
//! - **Con navegador**: Authorization Code + PKCE S256 contra el realm, con retorno a
//!   `http://127.0.0.1:{puerto}/callback` (RFC 8252). Cliente público `jmd-cli`, sin secreto.
//! - **Sin navegador** (`--device`, WSL o servidores): Device Authorization Grant.
//! - **Sin SSO todavía** (el LMS en modo local): correo y contraseña contra `POST /api/v1/auth/login`.
//!
//! Los tokens se guardan en `tokens.json` junto a `config.json`, con permisos 600 (el llavero del
//! sistema vendrá después). El access token se refresca solo antes de vencer, y para el gateway se
//! pide además un token personal de larga vida (`jg_…`) para los clientes que no refrescan.

use crate::client::{config_path, Settings};
use crate::out::{bold, cyan, dim, green, yellow};
use ai_orchestrator::auth::peek;
use anyhow::{anyhow, bail, Context, Result};
use base64::Engine as _;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::io::{BufRead, IsTerminal, Write};
use std::path::PathBuf;
use std::time::Duration;

pub const CLIENT_ID: &str = "jmd-cli";
pub const SCOPES: &str = "openid profile email offline_access lms:read lms:submit ai:use";

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct Tokens {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub issuer: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub token_endpoint: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub revocation_endpoint: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub access_token: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub refresh_token: Option<String>,
    #[serde(default)]
    pub expires_at: f64,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub sub: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub email: Option<String>,
    /// El LMS al que pertenece la cuenta.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub lms_url: Option<String>,
    /// Token opaco del modo local del LMS (`lms_…`), mientras no haya SSO.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub lms_token: Option<String>,
    /// Token personal del gateway (`jg_…`) y su vencimiento.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub gateway_url: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub gateway_token: Option<String>,
    #[serde(default)]
    pub gateway_token_expires: f64,
}

pub fn tokens_path() -> PathBuf {
    config_path().with_file_name("tokens.json")
}

fn now() -> f64 {
    std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_secs_f64()).unwrap_or(0.0)
}

impl Tokens {
    pub fn load() -> Self {
        std::fs::read_to_string(tokens_path()).ok().and_then(|t| serde_json::from_str(&t).ok()).unwrap_or_default()
    }

    pub fn save(&self) -> Result<PathBuf> {
        let path = tokens_path();
        if let Some(d) = path.parent() {
            std::fs::create_dir_all(d)?;
        }
        crate::gateway::write_private(&path, &serde_json::to_string_pretty(self)?)?;
        Ok(path)
    }

    pub fn clear() -> Result<()> {
        match std::fs::remove_file(tokens_path()) {
            Ok(()) => Ok(()),
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(()),
            Err(e) => Err(e.into()),
        }
    }

    /// ¿Hay una cuenta (SSO o local)?
    pub fn logged_in(&self) -> bool {
        self.refresh_token.is_some() || self.access_token.is_some() || self.lms_token.is_some()
    }

    pub fn has_sso(&self) -> bool {
        self.issuer.is_some() && (self.refresh_token.is_some() || self.access_token.is_some())
    }

    /// Lo que identifica a la persona en pantalla.
    pub fn who(&self) -> String {
        match (&self.name, &self.email, &self.sub) {
            (Some(n), Some(e), _) => format!("{n} <{e}>"),
            (Some(n), None, _) => n.clone(),
            (None, Some(e), _) => e.clone(),
            (None, None, Some(s)) => s.clone(),
            _ => "(sin cuenta)".into(),
        }
    }

    fn apply(&mut self, resp: &Value) {
        if let Some(at) = resp["access_token"].as_str() {
            self.access_token = Some(at.to_string());
            self.expires_at = now() + resp["expires_in"].as_f64().unwrap_or(300.0);
            if let Some(c) = peek(at) {
                self.sub = c["sub"].as_str().map(String::from).or(self.sub.take());
                self.name = c["name"].as_str().or(c["preferred_username"].as_str()).map(String::from).or(self.name.take());
                self.email = c["email"].as_str().map(String::from).or(self.email.take());
            }
        }
        if let Some(rt) = resp["refresh_token"].as_str() {
            self.refresh_token = Some(rt.to_string());
        }
        if let Some(id) = resp["id_token"].as_str().and_then(peek) {
            if self.name.is_none() {
                self.name = id["name"].as_str().map(String::from);
            }
            if self.email.is_none() {
                self.email = id["email"].as_str().map(String::from);
            }
        }
    }
}

fn http() -> reqwest::Client {
    reqwest::Client::builder().user_agent(concat!("jmd/", env!("CARGO_PKG_VERSION")))
        .connect_timeout(Duration::from_secs(10)).timeout(Duration::from_secs(30)).build().expect("http")
}

// ---------------------------------------------------------------------------
// OIDC
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Default)]
pub struct Discovery {
    pub issuer: String,
    pub authorization_endpoint: String,
    pub token_endpoint: String,
    pub device_authorization_endpoint: Option<String>,
    pub revocation_endpoint: Option<String>,
}

pub async fn discover(http: &reqwest::Client, issuer: &str) -> Result<Discovery> {
    let issuer = issuer.trim_end_matches('/').to_string();
    let url = format!("{issuer}/.well-known/openid-configuration");
    let v: Value = http.get(&url).send().await.with_context(|| format!("no se pudo llegar al issuer {issuer}"))?
        .error_for_status().with_context(|| format!("el issuer no responde en {url}"))?
        .json().await.context("descubrimiento OIDC: respuesta inválida")?;
    let s = |k: &str| v[k].as_str().map(String::from);
    Ok(Discovery {
        issuer: s("issuer").unwrap_or(issuer),
        authorization_endpoint: s("authorization_endpoint").context("el issuer no publica authorization_endpoint")?,
        token_endpoint: s("token_endpoint").context("el issuer no publica token_endpoint")?,
        device_authorization_endpoint: s("device_authorization_endpoint"),
        revocation_endpoint: s("revocation_endpoint"),
    })
}

fn b64url(b: &[u8]) -> String {
    base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(b)
}

fn random(n: usize) -> String {
    use rand::RngCore;
    let mut b = vec![0u8; n];
    rand::thread_rng().fill_bytes(&mut b);
    b64url(&b)
}

/// PKCE S256: (verifier, challenge).
pub fn pkce() -> (String, String) {
    use sha2::{Digest, Sha256};
    let verifier = random(32);
    let challenge = b64url(&Sha256::digest(verifier.as_bytes()));
    (verifier, challenge)
}

fn urlencode(s: &str) -> String {
    let mut out = String::new();
    for b in s.bytes() {
        match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => out.push(b as char),
            _ => out.push_str(&format!("%{b:02X}")),
        }
    }
    out
}

fn urldecode(s: &str) -> String {
    let b = s.as_bytes();
    let mut out = Vec::with_capacity(b.len());
    let mut i = 0;
    while i < b.len() {
        if b[i] == b'%' && i + 2 < b.len() {
            if let Ok(v) = u8::from_str_radix(std::str::from_utf8(&b[i + 1..i + 3]).unwrap_or("zz"), 16) {
                out.push(v);
                i += 3;
                continue;
            }
        }
        out.push(if b[i] == b'+' { b' ' } else { b[i] });
        i += 1;
    }
    String::from_utf8_lossy(&out).to_string()
}

pub fn open_url(url: &str) {
    let on_wsl = std::env::var_os("WSL_DISTRO_NAME").is_some();
    let _ = if cfg!(target_os = "macos") {
        std::process::Command::new("open").arg(url).spawn()
    } else if cfg!(windows) {
        std::process::Command::new("cmd").args(["/C", "start", "", url]).spawn()
    } else if on_wsl {
        std::process::Command::new("wslview").arg(url).spawn()
            .or_else(|_| std::process::Command::new("explorer.exe").arg(url).spawn())
    } else {
        std::process::Command::new("xdg-open").arg(url).spawn()
    };
}

async fn token_request(http: &reqwest::Client, endpoint: &str, form: &[(&str, &str)]) -> Result<Value> {
    let r = http.post(endpoint).form(form).send().await.with_context(|| format!("no se pudo llegar a {endpoint}"))?;
    let status = r.status();
    let v: Value = r.json().await.unwrap_or(Value::Null);
    if !status.is_success() {
        let e = v["error"].as_str().unwrap_or("error");
        let d = v["error_description"].as_str().unwrap_or("");
        bail!("{e}{}", if d.is_empty() { String::new() } else { format!(": {d}") });
    }
    Ok(v)
}

/// Authorization Code + PKCE con retorno a un puerto local. Devuelve la respuesta del token endpoint.
pub async fn login_browser(http: &reqwest::Client, d: &Discovery) -> Result<Value> {
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.context("no se pudo abrir un puerto local")?;
    let port = listener.local_addr()?.port();
    let redirect = format!("http://127.0.0.1:{port}/callback");
    let (verifier, challenge) = pkce();
    let state = random(16);
    let url = format!("{}?response_type=code&client_id={}&redirect_uri={}&scope={}&state={}&code_challenge={}&code_challenge_method=S256",
        d.authorization_endpoint, CLIENT_ID, urlencode(&redirect), urlencode(SCOPES), state, challenge);
    println!("{}", bold("Entra con tu cuenta en el navegador."));
    println!("{} {url}", dim("Si no se abre solo, copia esta dirección:"));
    if std::env::var_os("JMD_NO_BROWSER").is_none() {
        open_url(&url);
    }
    print!("{}", dim("esperando la respuesta del navegador… "));
    let _ = std::io::stdout().flush();
    let code = tokio::time::timeout(Duration::from_secs(300), wait_callback(listener, &state)).await
        .map_err(|_| anyhow!("pasaron 5 minutos sin respuesta del navegador"))??;
    println!("{}", green("✓"));
    token_request(http, &d.token_endpoint, &[("grant_type", "authorization_code"), ("code", &code), ("redirect_uri", &redirect),
        ("client_id", CLIENT_ID), ("code_verifier", &verifier)]).await.context("canjear el código")
}

/// Atiende una sola petición al puerto local y devuelve el `code`.
async fn wait_callback(listener: tokio::net::TcpListener, state: &str) -> Result<String> {
    use tokio::io::{AsyncReadExt, AsyncWriteExt};
    loop {
        let (mut sock, _) = listener.accept().await?;
        let mut buf = vec![0u8; 8192];
        let mut n = 0;
        while n < buf.len() {
            let k = sock.read(&mut buf[n..]).await?;
            if k == 0 {
                break;
            }
            n += k;
            if buf[..n].windows(4).any(|w| w == b"\r\n\r\n") {
                break;
            }
        }
        let req = String::from_utf8_lossy(&buf[..n]).to_string();
        let first = req.lines().next().unwrap_or("");
        let path = first.split_whitespace().nth(1).unwrap_or("");
        let page = |ok: bool, msg: &str| format!(
            "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nConnection: close\r\n\r\n\
            <!doctype html><html lang=\"es\"><meta charset=\"utf-8\"><title>jmd</title>\
            <body style=\"font-family:system-ui;margin:3rem;max-width:40rem\"><h1>{}</h1><p>{msg}</p></body></html>",
            if ok { "Listo ✓" } else { "Algo falló" });
        if !path.starts_with("/callback") {
            let _ = sock.write_all(b"HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n").await;
            continue;
        }
        let query = path.split_once('?').map(|(_, q)| q).unwrap_or("");
        let mut code = None;
        let mut got_state = None;
        let mut err = None;
        for kv in query.split('&') {
            let (k, v) = kv.split_once('=').unwrap_or((kv, ""));
            match k {
                "code" => code = Some(urldecode(v)),
                "state" => got_state = Some(urldecode(v)),
                "error" => err = Some(urldecode(v)),
                "error_description" => err = Some(urldecode(v)),
                _ => {}
            }
        }
        if let Some(e) = err {
            let _ = sock.write_all(page(false, &e).as_bytes()).await;
            bail!("el servidor de identidad devolvió un error: {e}");
        }
        if got_state.as_deref() != Some(state) {
            let _ = sock.write_all(page(false, "La respuesta no corresponde a esta sesión de login.").as_bytes()).await;
            continue;
        }
        let Some(code) = code else {
            let _ = sock.write_all(page(false, "Falta el código.").as_bytes()).await;
            continue;
        };
        let _ = sock.write_all(page(true, "Ya puedes cerrar esta pestaña y volver a la terminal.").as_bytes()).await;
        let _ = sock.shutdown().await;
        return Ok(code);
    }
}

/// Device Authorization Grant: muestra la URL y el código, y sondea hasta que la persona entra.
pub async fn login_device(http: &reqwest::Client, d: &Discovery) -> Result<Value> {
    let endpoint = d.device_authorization_endpoint.clone()
        .context("este servidor de identidad no ofrece el flujo de dispositivo; usa `jmd login --sso` con navegador")?;
    let v = token_request(http, &endpoint, &[("client_id", CLIENT_ID), ("scope", SCOPES)]).await?;
    let device_code = v["device_code"].as_str().context("falta device_code")?.to_string();
    let user_code = v["user_code"].as_str().unwrap_or("").to_string();
    let uri = v["verification_uri_complete"].as_str().or(v["verification_uri"].as_str()).unwrap_or("").to_string();
    let interval = v["interval"].as_u64().unwrap_or(5).max(1);
    let expires = now() + v["expires_in"].as_f64().unwrap_or(600.0);
    println!("{}", bold("Entra con tu cuenta desde cualquier navegador:"));
    println!("  {} {}", dim("dirección:"), cyan(&uri));
    println!("  {} {}", dim("código:   "), bold(&user_code));
    print!("{}", dim("esperando… "));
    let _ = std::io::stdout().flush();
    let mut wait = interval;
    loop {
        tokio::time::sleep(Duration::from_secs(wait)).await;
        if now() > expires {
            bail!("el código venció sin que se completara el login");
        }
        match token_request(http, &d.token_endpoint, &[("grant_type", "urn:ietf:params:oauth:grant-type:device_code"),
            ("device_code", &device_code), ("client_id", CLIENT_ID)]).await {
            Ok(t) => {
                println!("{}", green("✓"));
                return Ok(t);
            }
            Err(e) => {
                let m = e.to_string();
                if m.starts_with("authorization_pending") {
                    continue;
                }
                if m.starts_with("slow_down") {
                    wait += 5;
                    continue;
                }
                return Err(e);
            }
        }
    }
}

/// Access token vigente, refrescado si hace falta. `Ok(None)` si no hay sesión SSO.
pub async fn fresh_access_token() -> Result<Option<String>> {
    let mut t = Tokens::load();
    if !t.has_sso() {
        return Ok(None);
    }
    if t.expires_at - 60.0 > now() {
        return Ok(t.access_token.clone());
    }
    let (Some(rt), Some(endpoint)) = (t.refresh_token.clone(), t.token_endpoint.clone()) else {
        bail!("la sesión caducó: vuelve a entrar con `jmd login --sso`");
    };
    let resp = token_request(&http(), &endpoint, &[("grant_type", "refresh_token"), ("refresh_token", &rt), ("client_id", CLIENT_ID)])
        .await.map_err(|e| anyhow!("no se pudo refrescar la sesión ({e}): vuelve a entrar con `jmd login --sso`"))?;
    t.apply(&resp);
    t.save()?;
    Ok(t.access_token)
}

/// Lo que `jmd` manda al gateway como Bearer cuando no hay clave fija: el token personal si lo
/// tiene, si no el access token. Nunca falla: sin cuenta, `None`.
pub async fn gateway_bearer() -> Option<String> {
    let t = Tokens::load();
    if let Some(g) = t.gateway_token.clone().filter(|_| t.gateway_token_expires > now() + 60.0) {
        return Some(g);
    }
    fresh_access_token().await.ok().flatten()
}

/// Si el gateway acepta cuentas del LMS, pide un token personal y lo guarda.
pub async fn exchange_with_gateway(url: &str, access: &str) -> Result<Option<f64>> {
    let http = http();
    let me: Value = http.get(format!("{url}/v1/auth/me")).bearer_auth(access).send().await
        .with_context(|| format!("no se pudo llegar al gateway {url}"))?.json().await.unwrap_or(Value::Null);
    if me["anonymous"].as_bool() == Some(true) && me["auth_enabled"].as_bool() != Some(true) {
        return Ok(None);
    }
    let host = hostname();
    let r = http.post(format!("{url}/v1/auth/exchange")).bearer_auth(access).json(&json!({"label": format!("jmd en {host}")}))
        .send().await?;
    if !r.status().is_success() {
        let v: Value = r.json().await.unwrap_or(Value::Null);
        bail!("{}", v["error"]["message"].as_str().unwrap_or("el gateway no emitió el token"));
    }
    let v: Value = r.json().await?;
    let mut t = Tokens::load();
    t.gateway_url = Some(url.to_string());
    t.gateway_token = v["token"].as_str().map(String::from);
    t.gateway_token_expires = v["expires_at"].as_f64().unwrap_or(0.0);
    t.save()?;
    Ok(Some(t.gateway_token_expires))
}

fn hostname() -> String {
    std::env::var("HOSTNAME").or_else(|_| std::env::var("COMPUTERNAME")).ok()
        .or_else(|| std::fs::read_to_string("/etc/hostname").ok().map(|s| s.trim().to_string()))
        .filter(|h| !h.is_empty()).unwrap_or_else(|| "esta máquina".into())
}

// ---------------------------------------------------------------------------
// Comandos
// ---------------------------------------------------------------------------

#[derive(Default)]
pub struct LoginOpts {
    pub lms: Option<String>,
    pub issuer: Option<String>,
    pub device: bool,
    pub email: Option<String>,
    pub password: Option<String>,
}

fn ask(label: &str, default: Option<&str>) -> Result<String> {
    match default {
        Some(d) if !d.is_empty() => print!("{label} [{d}]: "),
        _ => print!("{label}: "),
    }
    std::io::stdout().flush()?;
    let mut s = String::new();
    std::io::stdin().lock().read_line(&mut s)?;
    let s = s.trim().to_string();
    Ok(if s.is_empty() { default.unwrap_or("").to_string() } else { s })
}

fn norm_url(u: &str) -> String {
    let u = u.trim().trim_end_matches('/');
    if u.starts_with("http://") || u.starts_with("https://") { u.to_string() } else { format!("https://{u}") }
}

/// `jmd login --sso` (o `--device`, o `--lms URL --email … --password …`).
pub async fn login(opts: LoginOpts, settings: &Settings) -> Result<()> {
    let http = http();
    let mut t = Tokens::load();
    let interactive = std::io::stdin().is_terminal();
    let lms = match opts.lms.clone().or(t.lms_url.clone()) {
        Some(u) => Some(norm_url(&u)),
        None if opts.issuer.is_some() => None,
        None if interactive => Some(norm_url(&ask("URL del LMS (p. ej. https://lms.tu-dominio)", None)?)).filter(|u| u != "https://"),
        None => bail!("dime el LMS: `jmd login --sso --lms https://…` (o `--issuer URL` para ir directo al realm)"),
    };
    // ¿Cómo se entra en ese LMS?
    let mut issuer = opts.issuer.clone();
    let mut local = false;
    if let (None, Some(lms)) = (&issuer, &lms) {
        let cfg: Value = http.get(format!("{lms}/api/v1/auth/config")).send().await
            .with_context(|| format!("no se pudo llegar al LMS {lms}"))?.json().await
            .with_context(|| format!("{lms} no parece el LMS (no responde /api/v1/auth/config)"))?;
        if cfg["oidc"].as_bool() == Some(true) {
            issuer = cfg["issuer"].as_str().map(String::from);
        }
        if issuer.is_none() {
            if cfg["local"].as_bool() == Some(false) {
                bail!("el LMS no tiene SSO activo ni cuentas locales");
            }
            local = true;
        }
    }
    t.lms_url = lms.clone();
    if local {
        let lms = lms.clone().unwrap();
        println!("{} el SSO todavía no está activo en este LMS: entras con tu correo y contraseña", dim("·"));
        let email = match opts.email.clone() {
            Some(e) => e,
            None if interactive => ask("Correo", t.email.as_deref())?,
            None => bail!("falta --email (y --password) para entrar sin terminal"),
        };
        let password = match opts.password.clone() {
            Some(p) => p,
            None if interactive => rpassword::prompt_password("Contraseña: ")?,
            None => bail!("falta --password"),
        };
        let r = http.post(format!("{lms}/api/v1/auth/login")).json(&json!({"email": email, "password": password,
            "label": format!("jmd en {}", hostname())})).send().await?;
        let status = r.status();
        let v: Value = r.json().await.unwrap_or(Value::Null);
        if !status.is_success() {
            bail!("{}", v["error"]["message"].as_str().unwrap_or("el LMS rechazó el acceso"));
        }
        t.lms_token = v["token"].as_str().map(String::from);
        t.sub = v["user"]["id"].as_str().map(String::from).or_else(|| v["user"]["id"].as_u64().map(|n| n.to_string()));
        t.name = v["user"]["name"].as_str().map(String::from);
        t.email = v["user"]["email"].as_str().map(String::from).or(Some(email));
        t.issuer = None;
        t.access_token = None;
        t.refresh_token = None;
        let path = t.save()?;
        println!("{} {} en {lms}", green("✓"), t.who());
        println!("{}", dim(&format!("guardado en {}", path.display())));
        next_steps(&t);
        return Ok(());
    }
    let issuer = issuer.context("no hay issuer")?;
    let d = discover(&http, &issuer).await?;
    let resp = if opts.device { login_device(&http, &d).await? } else { login_browser(&http, &d).await? };
    t.issuer = Some(d.issuer.clone());
    t.token_endpoint = Some(d.token_endpoint.clone());
    t.revocation_endpoint = d.revocation_endpoint.clone();
    t.lms_token = None;
    t.apply(&resp);
    let path = t.save()?;
    println!("{} {} {}", green("✓"), t.who(), dim(&format!("(realm {})", d.issuer)));
    println!("{}", dim(&format!("guardado en {}", path.display())));
    // Comprobar contra el LMS, si lo hay.
    if let Some(lms) = &lms {
        match crate::lms::Lms::from_tokens(&t).await {
            Ok(l) => match l.get("/me").await {
                Ok(me) => println!("{} LMS {lms}: {} ({})", green("✓"), me["name"].as_str().unwrap_or("?"),
                    me["roles"].as_array().map(|r| r.iter().filter_map(|x| x.as_str()).collect::<Vec<_>>().join(", ")).unwrap_or_default()),
                Err(e) => println!("{} LMS {lms}: {e}", yellow("!")),
            },
            Err(e) => println!("{} LMS: {e}", yellow("!")),
        }
    }
    // Token personal para el gateway, si lo acepta.
    if let Some(at) = t.access_token.clone() {
        let url = settings.url.clone();
        match exchange_with_gateway(&url, &at).await {
            Ok(Some(_)) => println!("{} gateway {url}: token personal guardado (Claude Code y OpenCode lo usan solos)", green("✓")),
            Ok(None) => println!("{} gateway {url}: no acepta cuentas del LMS (auth.issuer vacío); seguirás con tu clave", dim("·")),
            Err(e) => println!("{} gateway {url}: {e}", yellow("!")),
        }
    }
    next_steps(&t);
    Ok(())
}

fn next_steps(t: &Tokens) {
    println!("\n{}", bold("Ahora:"));
    if t.lms_url.is_some() {
        println!("  jmd courses              {}", dim("tus cursos · jmd lesson <id> · jmd assignments · jmd grades"));
    }
    println!("  jmd whoami               {}", dim("quién eres y cuánto te queda hoy"));
    println!("  jmd setup claude         {}", dim("Claude Code y OpenCode con tu cuenta (y el MCP del LMS)"));
}

pub async fn logout() -> Result<()> {
    let t = Tokens::load();
    if !t.logged_in() {
        println!("{}", dim("no había sesión"));
        return Ok(());
    }
    let http = http();
    if let (Some(rt), Some(ep)) = (&t.refresh_token, &t.revocation_endpoint) {
        match http.post(ep).form(&[("token", rt.as_str()), ("token_type_hint", "refresh_token"), ("client_id", CLIENT_ID)]).send().await {
            Ok(r) if r.status().is_success() => println!("{} sesión revocada en el realm", green("✓")),
            Ok(r) => println!("{} el realm no revocó la sesión (HTTP {})", yellow("!"), r.status()),
            Err(e) => println!("{} el realm no responde: {e}", yellow("!")),
        }
    }
    if let (Some(lms), Some(tok)) = (&t.lms_url, &t.lms_token) {
        let _ = http.post(format!("{lms}/api/v1/auth/logout")).bearer_auth(tok).send().await;
    }
    if let (Some(g), Some(tok)) = (&t.gateway_url, &t.gateway_token) {
        let _ = http.delete(format!("{g}/v1/auth/token")).bearer_auth(tok).send().await;
    }
    Tokens::clear()?;
    println!("{} sesión cerrada ({})", green("✓"), t.who());
    Ok(())
}

pub async fn whoami(settings: &Settings, as_json: bool) -> Result<()> {
    let t = Tokens::load();
    if !t.logged_in() {
        bail!("no has entrado: `jmd login --sso`");
    }
    let mut out = json!({"who": t.who(), "sub": t.sub, "name": t.name, "email": t.email, "issuer": t.issuer, "lms": t.lms_url,
        "mode": if t.has_sso() { "sso" } else { "local" }});
    if t.lms_url.is_some() {
        match crate::lms::Lms::from_tokens(&t).await {
            Ok(l) => match l.get("/me").await {
                Ok(me) => out["lms_me"] = me,
                Err(e) => out["lms_error"] = json!(e.to_string()),
            },
            Err(e) => out["lms_error"] = json!(e.to_string()),
        }
    }
    if let Some(b) = gateway_bearer().await {
        if let Ok(r) = http().get(format!("{}/v1/auth/me", settings.url)).bearer_auth(&b).send().await {
            out["gateway"] = r.json().await.unwrap_or(Value::Null);
        }
    }
    if as_json {
        println!("{}", serde_json::to_string_pretty(&out)?);
        return Ok(());
    }
    println!("{} {}", bold(&t.who()), dim(&format!("[{}]", out["mode"].as_str().unwrap_or(""))));
    if let Some(i) = &t.issuer {
        println!("  {} {i}", dim("realm:  "));
    }
    if let Some(l) = &t.lms_url {
        match (&out["lms_me"], &out["lms_error"]) {
            (me, _) if me.is_object() => println!("  {} {l} · roles: {} · cohortes: {}", dim("LMS:    "),
                me["roles"].as_array().map(|r| r.iter().filter_map(|x| x.as_str()).collect::<Vec<_>>().join(", ")).unwrap_or_default(),
                me["cohorts"].as_array().map(|r| r.iter().filter_map(|x| x.as_str()).collect::<Vec<_>>().join(", ")).unwrap_or_default()),
            (_, e) => println!("  {} {l} · {}", dim("LMS:    "), yellow(e.as_str().unwrap_or("?"))),
        }
    }
    let g = &out["gateway"];
    if g.is_object() {
        if g["anonymous"].as_bool() == Some(true) {
            println!("  {} {} · sin cuenta (usa clave fija)", dim("gateway:"), settings.url);
        } else {
            let u = &g["usage"]["user"];
            let fmt = |used: &Value, lim: &Value| match lim.as_u64() {
                Some(0) | None => format!("{} (sin límite)", used.as_u64().unwrap_or(0)),
                Some(l) => format!("{}/{l}", used.as_u64().unwrap_or(0)),
            };
            println!("  {} {} · hoy: {} peticiones, {} tokens", dim("gateway:"), settings.url,
                fmt(&u["requests"], &u["requests_per_day"]), fmt(&u["tokens"], &u["tokens_per_day"]));
            if g["usage"]["cohort"].is_object() {
                let c = &g["usage"]["cohort"];
                println!("  {} {} peticiones, {} tokens", dim("cohorte:"), fmt(&c["requests"], &c["requests_per_day"]),
                    fmt(&c["tokens"], &c["tokens_per_day"]));
            }
        }
    }
    Ok(())
}

/// `jmd token`: un token vigente para el gateway (lo llama Claude Code como `apiKeyHelper`).
pub async fn token() -> Result<()> {
    match gateway_bearer().await {
        Some(t) => {
            println!("{t}");
            Ok(())
        }
        None => bail!("no has entrado: `jmd login --sso`"),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pkce_and_encoding() {
        let (v, c) = pkce();
        assert!(v.len() >= 43 && c.len() == 43);
        assert_eq!(urlencode("a b/c"), "a%20b%2Fc");
        assert_eq!(urldecode("a%20b%2Fc+d"), "a b/c d");
        assert_eq!(norm_url("lms.x.edu/"), "https://lms.x.edu");
    }

    #[test]
    fn tokens_apply_reads_claims() {
        let mut t = Tokens::default();
        let b = |v: &Value| base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(v.to_string());
        let at = format!("{}.{}.x", b(&json!({"alg": "none"})), b(&json!({"sub": "u1", "name": "Ana", "email": "a@x"})));
        t.apply(&json!({"access_token": at, "expires_in": 900, "refresh_token": "rt"}));
        assert_eq!(t.sub.as_deref(), Some("u1"));
        assert_eq!(t.who(), "Ana <a@x>");
        assert!(t.expires_at > now() + 800.0);
    }
}
