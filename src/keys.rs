//! Verificación de claves de los proveedores.
//!
//! El listado de modelos de muchos proveedores es público (OpenRouter), así que «/models
//! responde» no prueba nada de la clave. Por proveedor:
//! - OpenRouter: `GET /key` (exige clave y la describe).
//! - El resto: `GET /models` con la clave; 401/403, o un 400 que habla de la clave (Gemini),
//!   es «rechazada»; 200 es «aceptada» (aunque en algunos proveedores /models sea público).

use crate::config::Provider;
use serde::Serialize;
use std::time::Duration;

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum KeyState {
    /// El proveedor confirmó la clave.
    Valid,
    /// El proveedor rechazó la clave.
    Rejected,
    /// No hay clave configurada.
    Missing,
    /// No se pudo comprobar (red, proveedor caído, respuesta rara).
    Unknown,
}

#[derive(Debug, Clone, Serialize)]
pub struct KeyCheck {
    pub state: KeyState,
    pub status: Option<u16>,
    pub message: String,
}

fn rejects_key(status: u16, body: &str) -> bool {
    let t = body.to_lowercase();
    matches!(status, 401 | 403)
        || (status == 400 && (t.contains("api key") || t.contains("api_key") || t.contains("invalid key")))
}

/// Comprueba `key` (o, si es None, la clave configurada del proveedor).
pub async fn check_key(client: &reqwest::Client, p: &Provider, key: Option<&str>) -> KeyCheck {
    let key = key.map(String::from).or_else(|| p.key()).filter(|k| !k.trim().is_empty());
    let Some(key) = key else {
        return KeyCheck { state: KeyState::Missing, status: None, message: "sin clave".into() };
    };
    let base = p.base_url.trim_end_matches('/');
    let url = if base.contains("openrouter.ai") { format!("{base}/key") } else { format!("{base}/models") };
    let mut req = client.get(&url).bearer_auth(key.trim()).timeout(Duration::from_secs(15));
    for (k, v) in &p.headers {
        req = req.header(k, v);
    }
    let resp = match req.send().await {
        Ok(r) => r,
        Err(e) => {
            return KeyCheck { state: KeyState::Unknown, status: None, message: format!("sin conexión: {e}") }
        }
    };
    let status = resp.status().as_u16();
    let body = resp.text().await.unwrap_or_default();
    if (200..300).contains(&status) {
        return KeyCheck { state: KeyState::Valid, status: Some(status), message: "aceptada".into() };
    }
    if rejects_key(status, &body) {
        let detail: String = body.chars().take(160).collect();
        return KeyCheck { state: KeyState::Rejected, status: Some(status), message: format!("rechazada: {detail}") };
    }
    let detail: String = body.chars().take(160).collect();
    KeyCheck { state: KeyState::Unknown, status: Some(status), message: format!("HTTP {status}: {detail}") }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn recognises_rejections() {
        assert!(rejects_key(401, ""));
        assert!(rejects_key(403, "forbidden"));
        assert!(rejects_key(400, r#"[{"error":{"message":"Please pass a valid API key"}}]"#));
        assert!(!rejects_key(400, "messages required"));
        assert!(!rejects_key(500, "api key"));
    }
}
