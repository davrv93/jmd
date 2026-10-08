//! `jmd init`: el asistente que deja todo listo, sin variables de entorno ni dos terminales.
//!
//! - **Local**: pide (sin mostrarlas) y **verifica** las claves de los proveedores, genera el
//!   token de administración, guarda todo en la carpeta del gateway, lo arranca en segundo plano
//!   y conecta `jmd`.
//! - **Remoto**: pide la URL de un gateway existente y su clave, y conecta `jmd`.
//!
//! También sirve sin preguntas (scripts/CI): `jmd init --local --key openrouter=sk-or-…`.

use crate::client::{Client, Settings};
use crate::gateway;
use crate::out::{bold, cyan, dim, green, red, yellow};
use ai_orchestrator::config::Config;
use ai_orchestrator::keys::{check_key, KeyState};
use anyhow::{bail, Context, Result};
use std::collections::BTreeMap;
use std::io::{BufRead, IsTerminal, Write};

/// La configuración semilla del gateway, dentro del binario.
const SEED: &str = include_str!("../../../config.yaml");

#[derive(Default)]
pub struct Opts {
    pub local: bool,
    pub remote: Option<String>,
    pub keys: Vec<String>,
    pub port: Option<u16>,
    pub no_verify: bool,
    pub no_start: bool,
    pub api_key: Option<String>,
    pub token: Option<String>,
}

fn interactive() -> bool {
    std::io::stdin().is_terminal()
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

fn ask_secret(label: &str) -> Result<String> {
    Ok(rpassword::prompt_password(format!("{label}: "))?.trim().to_string())
}

/// Dónde sacar la clave de cada proveedor conocido.
fn key_url(name: &str, base_url: &str) -> String {
    match name {
        "openrouter" => "https://openrouter.ai/keys (gratis)".into(),
        "gemini" => "https://aistudio.google.com/apikey (gratis)".into(),
        "opencode" => "https://opencode.ai (OpenCode Zen)".into(),
        "deepseek" => "https://platform.deepseek.com/api_keys".into(),
        _ => base_url.to_string(),
    }
}

pub async fn run(opts: Opts) -> Result<()> {
    println!("{}", bold("jmd init · configurar el gateway de IA"));
    let can_local = gateway::binary().is_some();
    let local = if opts.local {
        true
    } else if opts.remote.is_some() {
        false
    } else if interactive() {
        println!("\n¿Dónde va a estar el gateway?");
        println!("  1) En esta máquina {}", if can_local { dim("(recomendado para empezar)") } else { dim("(falta ai-orchestrator)") });
        println!("  2) Ya hay uno: me dieron una URL");
        ask("Elige", Some(if can_local { "1" } else { "2" }))? != "2"
    } else {
        bail!("sin terminal interactiva: usa `jmd init --local` o `jmd init --remote <URL>`");
    };
    if local { run_local(opts).await } else { run_remote(opts).await }
}

async fn run_remote(opts: Opts) -> Result<()> {
    let mut s = Settings::load();
    let url = match opts.remote.clone() {
        Some(u) => u,
        None => ask("URL del gateway", Some(if s.url.is_empty() { "https://" } else { &s.url }))?,
    };
    s.url = url.trim().trim_end_matches('/').trim_end_matches("/v1").to_string();
    s.api_key = match opts.api_key.clone() {
        Some(k) => Some(k),
        None if interactive() => Some(ask_secret("Clave de acceso (/v1) que te dieron (Enter si no hace falta)")?)
            .filter(|k| !k.is_empty()).or(s.api_key),
        None => s.api_key,
    };
    s.admin_token = match opts.token.clone() {
        Some(t) => Some(t),
        None if interactive() => Some(ask_secret("Token de administración (Enter si no lo tienes)")?)
            .filter(|t| !t.is_empty()).or(s.admin_token),
        None => s.admin_token,
    };
    let c = Client::new(s);
    let h = c.health().await?;
    println!("{} gateway {} (versión {})", green("✓"), c.s.url, h["version"].as_str().unwrap_or("?"));
    match c.models().await {
        Ok(_) => println!("{} acceso a /v1", green("✓")),
        Err(e) => println!("{} /v1: {e}", yellow("!")),
    }
    if c.s.admin_token.is_some() {
        match c.admin_get("/admin/api/status").await {
            Ok(_) => println!("{} token de administración", green("✓")),
            Err(e) => println!("{} administración: {e}", yellow("!")),
        }
    }
    let path = c.s.save()?;
    println!("guardado en {}", path.display());
    next_steps(&c.s.url, false);
    Ok(())
}

async fn run_local(opts: Opts) -> Result<()> {
    let bin = gateway::binary().context(
        "no encuentro `ai-orchestrator` (el gateway). Vuelve a ejecutar el instalador de jmd: lo instala junto a jmd")?;
    let dir = gateway::data_dir();
    std::fs::create_dir_all(&dir)?;
    println!("{} {}", dim("gateway:"), dim(&bin.display().to_string()));
    println!("{} {}", dim("datos:  "), dim(&dir.display().to_string()));

    // Si ya corre, se detiene para aplicar lo nuevo y se vuelve a arrancar al final.
    let was_running = gateway::running(&dir);
    let cfg_path = dir.join("config.yaml");
    let mut cfg = match std::fs::read_to_string(&cfg_path) {
        Ok(t) => Config::from_yaml(&t).map_err(|e| anyhow::anyhow!("{}: {e}", cfg_path.display()))?,
        Err(_) => Config::from_yaml(SEED).map_err(|e| anyhow::anyhow!("semilla: {e}"))?,
    };

    // Claves dadas por argumento: proveedor=clave
    let mut given: BTreeMap<String, String> = BTreeMap::new();
    for kv in &opts.keys {
        let (p, k) = kv.split_once('=').context("--key va como proveedor=clave")?;
        if !cfg.providers.contains_key(p) {
            bail!("proveedor desconocido: {p} (hay: {})", cfg.providers.keys().cloned().collect::<Vec<_>>().join(", "));
        }
        given.insert(p.to_string(), k.trim().to_string());
    }

    let http = reqwest::Client::builder().connect_timeout(std::time::Duration::from_secs(5)).build()?;
    // OpenRouter primero: con su clave ya funcionan casi todos los modelos gratis.
    let mut names: Vec<String> = cfg.providers.keys().cloned().collect();
    names.sort_by_key(|n| match n.as_str() { "openrouter" => 0, "gemini" => 1, _ => 2 });
    if interactive() && given.is_empty() {
        println!("\n{}", bold("Claves de los proveedores"));
        println!("{}", dim("Se guardan solo en tu máquina (archivo con permisos 600). Enter = omitir ese proveedor."));
    }
    for name in &names {
        let provider = cfg.providers[name].clone();
        let saved = provider.api_key.clone().filter(|k| !k.is_empty());
        let mut key = given.get(name).cloned();
        let mut tries = 0;
        loop {
            if key.is_none() && interactive() && given.is_empty() {
                println!("\n{} · {}", cyan(name), dim(&key_url(name, &provider.base_url)));
                let hint = if saved.is_some() { "Clave (Enter = conservar la guardada)" } else { "Clave (Enter = omitir)" };
                let k = ask_secret(hint)?;
                key = if k.is_empty() { saved.clone() } else { Some(k) };
            }
            let Some(k) = key.clone() else {
                println!("  {} {name}: sin clave, sus modelos se saltan", dim("·"));
                break;
            };
            if opts.no_verify {
                cfg.providers.get_mut(name).unwrap().api_key = Some(k);
                println!("  {} {name}: guardada sin verificar", dim("·"));
                break;
            }
            let check = check_key(&http, &provider, Some(&k)).await;
            match check.state {
                KeyState::Valid => {
                    cfg.providers.get_mut(name).unwrap().api_key = Some(k);
                    println!("  {} {name}: clave verificada", green("✓"));
                    break;
                }
                KeyState::Rejected => {
                    println!("  {} {name}: el proveedor rechazó la clave ({})", red("✗"), check.message);
                    tries += 1;
                    if !interactive() || !given.is_empty() || tries >= 3 {
                        println!("  {} {name}: no se guarda", dim("·"));
                        break;
                    }
                    key = None; // vuelve a pedirla
                }
                KeyState::Unknown | KeyState::Missing => {
                    cfg.providers.get_mut(name).unwrap().api_key = Some(k);
                    println!("  {} {name}: no se pudo comprobar ({}); se guarda igual", yellow("!"), check.message);
                    break;
                }
            }
        }
    }
    if !cfg.providers.values().any(|p| p.api_key.as_ref().is_some_and(|k| !k.is_empty()) || p.key().is_some()) {
        println!("\n{} Ningún proveedor tiene clave: el gateway arrancará, pero no podrá responder.", yellow("!"));
        println!("  Añádelas luego con: jmd init --local");
    }
    cfg.validate().map_err(|e| anyhow::anyhow!(e))?;
    gateway::write_private(&cfg_path, &cfg.to_yaml())?;
    let token = gateway::ensure_token(&dir)?;

    if let Some(s) = &was_running {
        gateway::stop(&dir).await?;
        println!("\n{} gateway detenido (pid {}) para aplicar la configuración", dim("·"), s.pid);
    }
    let wanted = opts.port.or(was_running.as_ref().map(|s| s.port)).unwrap_or(gateway::DEFAULT_PORT);
    let port = if gateway::port_free(wanted) {
        wanted
    } else {
        let p = gateway::free_port(wanted + 1).context("no hay puertos libres cerca del 4000")?;
        println!("{} el puerto {wanted} está ocupado (¿otro gateway arrancado a mano?); uso el {p}", yellow("!"));
        p
    };
    let url = format!("http://127.0.0.1:{port}");
    let mut s = Settings::load();
    s.url = url.clone();
    s.admin_token = Some(token);
    let path = s.save()?;

    if opts.no_start {
        println!("\n{} configuración lista (sin arrancar). Arranca con: jmd gateway start", green("✓"));
        return Ok(());
    }
    let st = gateway::start(&dir, port).await?;
    println!("\n{} gateway corriendo en {url} (pid {}) · sigue activo aunque cierres la terminal", green("✓"), st.pid);
    println!("{} jmd conectado ({})", green("✓"), path.display());
    next_steps(&url, true);
    Ok(())
}

fn next_steps(url: &str, local: bool) {
    println!("\n{}", bold("Listo. Ahora:"));
    println!("  jmd chat \"hola\"          {}", dim("prueba rápida"));
    println!("  jmd status               {}", dim("todo de un vistazo (también las claves)"));
    println!("  jmd setup claude         {}", dim("conecta Claude Code · o: jmd setup opencode"));
    println!("  {url}/ui/   {}", dim(if local { "la UI (token: jmd gateway token)" } else { "la UI" }));
    if local {
        println!("  jmd gateway stop|start|logs   {}", dim("gestionar el gateway"));
    }
}
