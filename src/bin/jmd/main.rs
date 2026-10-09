//! `jmd`: el CLI del gateway, para la terminal de VS Code (o cualquiera).
//!
//! ```text
//! jmd                 modo interactivo: comandos (models, stats…) y, si no es un comando, chat
//! jmd models          agentes y modelos con su estado
//! jmd providers       proveedores con cuota y saldo
//! jmd stats           uso, éxito, latencia, calidad y ahorro de tokens (+ `rtk gain`)
//! jmd chat "…"        una pregunta (o sin texto: chat interactivo)
//! jmd setup claude    conecta Claude Code (y RTK) · `jmd setup opencode` · `jmd setup all`
//! jmd style full      respuestas cortas (a la manera de caveman) para todos los clientes
//! jmd help            todo lo demás
//! ```

mod agent;
mod client;
mod gateway;
mod init;
mod lms;
mod mcp;
mod mcp_server;
mod out;
mod setup;
mod skills;
mod sso;
mod tools;

use anyhow::{anyhow, bail, Result};
use clap::{Parser, Subcommand};
use client::{Client, Settings};
use out::{bold, cyan, dim, green, red, table, yellow};
use reqwest::Method;
use serde_json::{json, Value};
use std::io::{BufRead, IsTerminal, Write};

#[derive(Parser)]
#[command(name = "jmd", version, about = "CLI del gateway de IA: modelos, cuotas, estadísticas, chat e integración con Claude Code, OpenCode, RTK y caveman",
    after_help = "Sin comando entra en modo interactivo. Configuración: `jmd login` (o JMD_URL, JMD_ADMIN_TOKEN, JMD_API_KEY).")]
struct Cli {
    /// Salida en JSON (para scripts)
    #[arg(long, global = true)]
    json: bool,
    #[command(subcommand)]
    cmd: Option<Cmd>,
}

#[derive(Subcommand)]
enum Cmd {
    /// Asistente: monta el gateway en esta máquina (pide y verifica las claves) o conéctate a uno
    Init {
        /// Gateway en esta máquina, sin preguntar
        #[arg(long, conflicts_with = "remote")]
        local: bool,
        /// Gateway existente en esta URL, sin preguntar
        #[arg(long)]
        remote: Option<String>,
        /// Clave de un proveedor: --key openrouter=sk-or-… (repetible)
        #[arg(long = "key", value_name = "PROVEEDOR=CLAVE")]
        keys: Vec<String>,
        /// Puerto del gateway local (por defecto 4000, o el siguiente libre)
        #[arg(long)]
        port: Option<u16>,
        /// No verificar las claves contra el proveedor
        #[arg(long)]
        no_verify: bool,
        /// Guardar la configuración sin arrancar el gateway
        #[arg(long)]
        no_start: bool,
        /// Gateway remoto: clave de /v1
        #[arg(long = "api-key")]
        api_key: Option<String>,
        /// Gateway remoto: token de administración
        #[arg(long)]
        token: Option<String>,
    },
    /// El gateway local: start · stop · restart · status · logs · token
    Gateway {
        #[arg(value_parser = ["start", "stop", "restart", "status", "logs", "token"], default_value = "status")]
        action: String,
        /// Líneas de log a mostrar
        #[arg(short = 'n', default_value_t = 40)]
        n: usize,
    },
    /// Entra con tu cuenta del LMS (--sso, --device) o guarda la URL y las claves del gateway
    Login {
        #[arg(long)]
        url: Option<String>,
        /// Token de administración (ADMIN_TOKEN)
        #[arg(long)]
        token: Option<String>,
        /// Clave de /v1 (una de GATEWAY_API_KEYS), si el gateway la pide
        #[arg(long)]
        key: Option<String>,
        /// Entrar con la cuenta del LMS (abre el navegador; con el LMS en modo local pide correo y contraseña)
        #[arg(long)]
        sso: bool,
        /// Sin navegador: muestra una dirección y un código (WSL, servidores)
        #[arg(long)]
        device: bool,
        /// URL del LMS (se recuerda)
        #[arg(long)]
        lms: Option<String>,
        /// Ir directo al servidor de identidad (realm), sin pasar por el LMS
        #[arg(long)]
        issuer: Option<String>,
        /// Modo local del LMS, sin preguntar: correo
        #[arg(long)]
        email: Option<String>,
        /// Modo local del LMS, sin preguntar: contraseña
        #[arg(long)]
        password: Option<String>,
    },
    /// Cierra la sesión del LMS (revoca el refresh token) y borra los tokens
    Logout,
    /// Quién eres en el LMS y en el gateway, y cuánto te queda hoy
    Whoami,
    /// Un token vigente para el gateway (lo usa Claude Code como apiKeyHelper)
    Token,
    /// Mis cursos
    Courses,
    /// Temario de un curso
    Course { id: String },
    /// Una sesión: `lesson <id>` la muestra; `lesson open <id>` clona el repo y baja los materiales
    Lesson {
        #[arg(required = true, num_args = 1..=2)]
        args: Vec<String>,
    },
    /// Materiales de una sesión: `materials pull <sesión>` los baja a ./materiales/
    Materials {
        #[arg(value_parser = ["pull"])]
        action: String,
        lesson: String,
    },
    /// Tareas (de un curso o de todos)
    Assignments {
        #[arg(long)]
        course: Option<String>,
    },
    /// Enunciado de una tarea, rúbrica y mis entregas
    Assignment { id: String },
    /// Entrega la tarea con el origin y el HEAD del repo actual
    Submit {
        id: String,
        /// Nota para quien califica
        #[arg(long)]
        notes: Option<String>,
        /// Entregar aunque haya cambios sin commit o sin push
        #[arg(long, short = 'y')]
        yes: bool,
    },
    /// Mis notas
    Grades {
        #[arg(long)]
        course: Option<String>,
    },
    /// Publica una pregunta en una sesión: `ask <sesión> "¿…?" [--line archivo:N]`
    Ask {
        lesson: String,
        #[arg(required = true, num_args = 1..)]
        text: Vec<String>,
        /// Cita una línea de código: archivo:N
        #[arg(long)]
        line: Option<String>,
    },
    /// Comprueba el gateway, los tokens y qué agentes y herramientas hay instalados
    #[command(alias = "doctor")]
    Status,
    /// Agentes (perfiles) y modelos con su estado
    #[command(alias = "model")]
    Models,
    /// Proveedores con cuota y saldo
    Providers,
    /// Detalle de un proveedor; `test` lista sus modelos reales, `balance` consulta el saldo
    Provider {
        name: String,
        #[arg(value_parser = ["show", "test", "balance"], default_value = "show")]
        action: String,
    },
    /// Cuotas: lo que queda por proveedor y por modelo
    #[command(alias = "quota")]
    Quotas,
    /// Uso, éxito, latencia, calidad y ahorro de tokens
    Stats,
    /// Últimas peticiones
    Requests {
        #[arg(short = 'n', default_value_t = 20)]
        n: u32,
    },
    /// Qué agente y qué cadena tocarían a un texto, sin llamar a ningún modelo
    Route {
        #[arg(required = true, num_args = 1..)]
        text: Vec<String>,
        #[arg(long, short = 'm', default_value = "auto")]
        model: String,
    },
    /// Pregunta al gateway (sin texto: chat interactivo)
    Chat {
        text: Vec<String>,
        #[arg(long, short = 'm', default_value = "auto")]
        model: String,
        /// off · lite · full · ultra
        #[arg(long, short = 's')]
        style: Option<String>,
        /// quality · speed · cost
        #[arg(long, short = 'p')]
        priority: Option<String>,
        /// Conectar los servidores MCP también en una pregunta suelta (en el chat interactivo, siempre)
        #[arg(long)]
        mcp: bool,
        /// Ejecutar las herramientas (comandos, archivos, MCP) sin pedir confirmación
        #[arg(long)]
        auto: bool,
    },
    /// Servidores MCP: list (por defecto) · tools <nombre> · add <nombre> … · remove <nombre>
    Mcp {
        #[command(subcommand)]
        action: Option<McpCmd>,
    },
    /// Skills disponibles para el chat (las de Claude Code y las incluidas, como «prototipo»)
    Skills,
    /// Estilo de respuesta para todos los clientes (a la manera de caveman) y compresión de salidas
    Style {
        /// off · lite · full · ultra
        level: Option<String>,
        /// Compresión de salidas de herramientas (a la manera de RTK, en el servidor): on · off
        #[arg(long)]
        compress: Option<String>,
        /// Máximo de caracteres por salida de herramienta
        #[arg(long)]
        max: Option<usize>,
    },
    /// Cierra el circuito y quita los cooldowns de un modelo
    Reset { model: String },
    /// Conecta un agente de terminal con el gateway: claude · opencode · all
    Setup {
        #[arg(value_parser = ["claude", "opencode", "all"])]
        target: String,
        /// Solo para este proyecto (.claude/settings.local.json, ./opencode.json)
        #[arg(long)]
        project: bool,
        /// No preguntar (instala el hook de RTK si está disponible)
        #[arg(long, short = 'y')]
        yes: bool,
        /// Quita la conexión de Claude Code con el gateway
        #[arg(long)]
        undo: bool,
    },
    /// Abre la UI de gestión en el navegador
    Ui,
    /// Muestra cómo actualizar jmd en este sistema
    Update,
}

#[derive(Subcommand)]
enum McpCmd {
    /// Conecta con cada servidor configurado y muestra si responde y cuántas herramientas tiene
    List,
    /// Herramientas de un servidor
    Tools { name: String },
    /// Añade un servidor a la configuración de jmd: `add fs -- npx -y @modelcontextprotocol/server-filesystem .`
    /// o `add docs --url https://…/mcp`
    Add {
        name: String,
        #[arg(long)]
        url: Option<String>,
        /// Cabecera HTTP «Nombre: valor» (repetible)
        #[arg(long = "header")]
        headers: Vec<String>,
        /// Variable de entorno NOMBRE=valor para un servidor stdio (repetible)
        #[arg(long = "env")]
        envs: Vec<String>,
        #[arg(last = true)]
        command: Vec<String>,
    },
    /// Quita un servidor de la configuración de jmd
    Remove { name: String },
    /// Sirve el LMS como servidor MCP por stdio (lo registran `jmd setup claude|opencode`)
    Serve,
}

#[tokio::main]
async fn main() {
    let cli = Cli::parse();
    let mut settings = Settings::load();
    if settings.api_key.as_deref().is_none_or(str::is_empty) && !matches!(cli.cmd, Some(Cmd::Token) | Some(Cmd::Logout)) {
        if let Some(b) = sso::gateway_bearer().await {
            settings.api_key = Some(b);
        }
    }
    let mut c = Client::new(settings);
    let res = match cli.cmd {
        None => repl(&mut c).await,
        Some(cmd) => run(&mut c, cmd, cli.json).await,
    };
    if let Err(e) = res {
        eprintln!("{} {e:#}", red("error:"));
        std::process::exit(1);
    }
}

fn print_json(v: &Value) {
    println!("{}", serde_json::to_string_pretty(v).unwrap_or_default());
}

fn prompt(label: &str, current: Option<&str>) -> Result<String> {
    match current {
        Some(c) if !c.is_empty() => print!("{label} [{c}]: "),
        _ => print!("{label}: "),
    }
    std::io::stdout().flush()?;
    let mut s = String::new();
    std::io::stdin().lock().read_line(&mut s)?;
    let s = s.trim().to_string();
    Ok(if s.is_empty() { current.unwrap_or("").to_string() } else { s })
}

async fn run(c: &mut Client, cmd: Cmd, as_json: bool) -> Result<()> {
    match cmd {
        Cmd::Init { local, remote, keys, port, no_verify, no_start, api_key, token } => {
            init::run(init::Opts { local, remote, keys, port, no_verify, no_start, api_key, token }).await
        }
        Cmd::Gateway { action, n } => gateway_cmd(&action, n, as_json).await,
        Cmd::Login { url, token, key, sso: false, device: false, lms: None, issuer: None, email: None, password: None } =>
            login(c, url, token, key).await,
        Cmd::Login { lms, issuer, device, email, password, .. } =>
            sso::login(sso::LoginOpts { lms, issuer, device, email, password }, &c.s).await,
        Cmd::Logout => sso::logout().await,
        Cmd::Whoami => sso::whoami(&c.s, as_json).await,
        Cmd::Token => sso::token().await,
        Cmd::Courses => lms::courses(as_json).await,
        Cmd::Course { id } => lms::course(&id, as_json).await,
        Cmd::Lesson { args } => match args.as_slice() {
            [open, id] if open == "open" => lms::lesson_open(id).await,
            [id] => lms::lesson(id, as_json).await,
            _ => bail!("uso: jmd lesson <id> · jmd lesson open <id>"),
        },
        Cmd::Materials { lesson, .. } => lms::materials_pull(&lesson).await,
        Cmd::Assignments { course } => lms::assignments(course.as_deref(), as_json).await,
        Cmd::Assignment { id } => lms::assignment(&id, as_json).await,
        Cmd::Submit { id, notes, yes } => lms::submit(&id, notes, yes, as_json).await,
        Cmd::Grades { course } => lms::grades(course.as_deref(), as_json).await,
        Cmd::Ask { lesson, text, line } => lms::ask(&lesson, &text.join(" "), line.as_deref(), as_json).await,
        Cmd::Status => status(c, as_json).await,
        Cmd::Models => models(c, as_json).await,
        Cmd::Providers => providers(c, as_json).await,
        Cmd::Provider { name, action } => provider(c, &name, &action, as_json).await,
        Cmd::Quotas => quotas(c, as_json).await,
        Cmd::Stats => stats(c, as_json).await,
        Cmd::Requests { n } => requests(c, n, as_json).await,
        Cmd::Route { text, model } => route(c, &text.join(" "), &model, as_json).await,
        Cmd::Chat { text, model, style, priority, mcp, auto } => {
            let interactive = text.is_empty();
            let pool = if interactive || mcp { start_mcp_quietly() } else { None };
            let mut session = Session::new(model, style, priority, pool);
            session.agent.auto = auto;
            if interactive {
                chat_repl(c, &mut session).await
            } else {
                if mcp {
                    wait_mcp(&session).await;
                }
                ask(c, &mut session, &text.join(" ")).await.map(|_| ())
            }
        }
        Cmd::Mcp { action: Some(McpCmd::Serve) } => mcp_server::serve().await,
        Cmd::Mcp { action } => mcp_cmd(action.unwrap_or(McpCmd::List), as_json).await,
        Cmd::Skills => {
            let cwd = std::env::current_dir().unwrap_or_else(|_| ".".into());
            let list = skills::discover(&cwd);
            if as_json {
                print_json(&json!(list.iter().map(|k| json!({"name": k.name, "description": k.description, "source": k.source}))
                    .collect::<Vec<_>>()));
                return Ok(());
            }
            let rows: Vec<Vec<String>> = list.iter().map(|k| vec![cyan(&k.name), dim(&k.source),
                k.description.chars().take(90).collect()]).collect();
            table(&["skill", "origen", "para qué"], &rows);
            println!("{}", dim("en el chat, el modelo las carga solo; para prototipos: /proto <descripción>"));
            Ok(())
        }
        Cmd::Style { level, compress, max } => style(c, level, compress, max, as_json).await,
        Cmd::Reset { model } => {
            c.admin_send(Method::POST, &format!("/admin/api/models/{model}/reset"), None).await?;
            println!("{} {model}: circuito cerrado y cooldowns quitados", green("✓"));
            Ok(())
        }
        Cmd::Setup { target, project, yes, undo } => setup_cmd(c, &target, project, yes, undo).await,
        Cmd::Update => {
            println!("jmd {} · {}", env!("CARGO_PKG_VERSION"), std::env::consts::OS);
            if cfg!(windows) {
                println!("En PowerShell:\n  irm https://raw.githubusercontent.com/davrv93/jmd/main/install.ps1 | iex");
            } else {
                println!("En la terminal:\n  curl -fsSL https://raw.githubusercontent.com/davrv93/jmd/main/install.sh | sh");
            }
            println!("{}", dim("una versión concreta: JMD_VERSION=v0.2.0 · novedades: https://github.com/davrv93/jmd/releases"));
            Ok(())
        }
        Cmd::Ui => {
            let url = format!("{}/ui/", c.s.url);
            println!("{url}");
            let opener = if cfg!(target_os = "macos") { "open" } else if cfg!(windows) { "explorer" } else { "xdg-open" };
            let _ = std::process::Command::new(opener).arg(&url).spawn();
            Ok(())
        }
    }
}

// ---------------------------------------------------------------------------
// MCP
// ---------------------------------------------------------------------------

async fn mcp_cmd(action: McpCmd, as_json: bool) -> Result<()> {
    let cwd = std::env::current_dir().unwrap_or_else(|_| ".".into());
    match action {
        McpCmd::List => {
            let servers = mcp::discover(&cwd);
            if servers.is_empty() {
                println!("{}", dim("No hay servidores MCP configurados (ni en jmd, ni en Claude Code, ni en OpenCode)."));
                println!("{}", dim("Añade uno: jmd mcp add fs -- npx -y @modelcontextprotocol/server-filesystem ."));
                return Ok(());
            }
            if !as_json {
                println!("{}", dim(&format!("conectando con {} servidor(es)…", servers.iter().filter(|s| s.enabled).count())));
            }
            let probes = futures::future::join_all(servers.iter().filter(|s| s.enabled).cloned().map(mcp::probe)).await;
            if as_json {
                print_json(&json!(servers.iter().map(|s| {
                    let p = probes.iter().find(|p| p.server.name == s.name);
                    json!({"name": s.name, "source": s.source, "transport": s.kind(), "target": s.target(), "enabled": s.enabled,
                        "ok": p.map(|p| p.result.is_ok()), "tools": p.and_then(|p| p.result.as_ref().ok().map(|(t, _)| t.len())),
                        "error": p.and_then(|p| p.result.as_ref().err().map(|e| format!("{e:#}")))})
                }).collect::<Vec<_>>()));
                return Ok(());
            }
            let rows: Vec<Vec<String>> = servers.iter().map(|s| {
                let state = match probes.iter().find(|p| p.server.name == s.name) {
                    None => dim("desactivado"),
                    Some(p) => match &p.result {
                        Ok((tools, _)) => green(&format!("✓ activo · {} herramientas · {:.1} s", tools.len(), p.seconds)),
                        Err(e) => red(&format!("✗ {}", format!("{e:#}").chars().take(70).collect::<String>())),
                    },
                };
                vec![cyan(&s.name), state, dim(s.kind()), dim(&s.source), dim(&s.target().chars().take(50).collect::<String>())]
            }).collect();
            table(&["servidor", "estado", "tipo", "origen", "comando / URL"], &rows);
            println!("{}", dim("herramientas: jmd mcp tools <servidor> · en el chat (jmd) se conectan solos: /mcp"));
            Ok(())
        }
        McpCmd::Tools { name } => {
            let server = mcp::discover(&cwd).into_iter().find(|s| s.name == name)
                .ok_or_else(|| anyhow!("no hay un servidor MCP llamado «{name}» (jmd mcp list)"))?;
            let p = mcp::probe(server).await;
            let (tools, version) = p.result?;
            if as_json {
                print_json(&json!(tools.iter().map(|t| json!({"name": t.name, "description": t.description,
                    "input_schema": t.input_schema})).collect::<Vec<_>>()));
                return Ok(());
            }
            println!("{} {} {}", bold(&name), dim(&version), dim(&format!("· {} herramientas", tools.len())));
            let rows: Vec<Vec<String>> = tools.iter().map(|t| vec![cyan(&t.name),
                t.description.lines().next().unwrap_or("").chars().take(90).collect()]).collect();
            table(&["herramienta", "descripción"], &rows);
            Ok(())
        }
        McpCmd::Add { name, url, headers, envs, command } => {
            let entry = match (url, command.is_empty()) {
                (Some(u), _) => {
                    let h: serde_json::Map<String, Value> = headers.iter().filter_map(|h| h.split_once(':'))
                        .map(|(k, v)| (k.trim().to_string(), json!(v.trim()))).collect();
                    json!({"type": "http", "url": u, "headers": h})
                }
                (None, false) => {
                    let env: serde_json::Map<String, Value> = envs.iter().filter_map(|e| e.split_once('='))
                        .map(|(k, v)| (k.to_string(), json!(v))).collect();
                    json!({"command": command[0], "args": command[1..], "env": env})
                }
                (None, true) => bail!("indica el comando (tras --) o --url. Ej.: jmd mcp add fs -- npx -y @modelcontextprotocol/server-filesystem ."),
            };
            let path = mcp::edit_jmd_config(|m| { m.insert(name.clone(), entry); })?;
            println!("{} «{name}» añadido en {}", green("✓"), path.display());
            println!("{}", dim(&format!("compruébalo: jmd mcp tools {name}")));
            Ok(())
        }
        McpCmd::Serve => mcp_server::serve().await,
        McpCmd::Remove { name } => {
            let mut found = false;
            let path = mcp::edit_jmd_config(|m| { found = m.remove(&name).is_some(); })?;
            if found {
                println!("{} «{name}» quitado de {}", green("✓"), path.display());
            } else {
                println!("{} «{name}» no está en {} (los de Claude Code/OpenCode se quitan allí)", yellow("!"), path.display());
            }
            Ok(())
        }
    }
}

// ---------------------------------------------------------------------------
// gateway local
// ---------------------------------------------------------------------------

async fn gateway_cmd(action: &str, n: usize, as_json: bool) -> Result<()> {
    let dir = gateway::data_dir();
    match action {
        "start" | "restart" => {
            if action == "restart" {
                gateway::stop(&dir).await?;
            }
            if let Some(st) = gateway::running(&dir) {
                if gateway::healthy(st.port).await {
                    println!("{} ya está corriendo en http://127.0.0.1:{} (pid {})", green("✓"), st.port, st.pid);
                    return Ok(());
                }
                gateway::stop(&dir).await?;
            }
            if !dir.join("config.yaml").exists() {
                bail!("el gateway local aún no está configurado: jmd init");
            }
            let mut s = Settings::load();
            let wanted = url_port(&s.url).unwrap_or(gateway::DEFAULT_PORT);
            let port = if gateway::port_free(wanted) { wanted } else {
                gateway::free_port(wanted + 1).ok_or_else(|| anyhow!("no hay puertos libres"))?
            };
            let st = gateway::start(&dir, port).await?;
            s.url = format!("http://127.0.0.1:{port}");
            if s.admin_token.is_none() {
                s.admin_token = gateway::read_token(&dir);
            }
            s.save()?;
            println!("{} gateway en http://127.0.0.1:{} (pid {})", green("✓"), st.port, st.pid);
            Ok(())
        }
        "stop" => {
            if gateway::stop(&dir).await? {
                println!("{} gateway detenido", green("✓"));
            } else {
                println!("{}", dim("el gateway local no estaba corriendo"));
            }
            Ok(())
        }
        "logs" => {
            println!("{}", gateway::tail(&dir, n));
            println!("{}", dim(&format!("({})", gateway::log_path(&dir).display())));
            Ok(())
        }
        "token" => {
            let t = gateway::read_token(&dir).ok_or_else(|| anyhow!("no hay gateway local configurado: jmd init"))?;
            eprintln!("{}", dim("token de administración del gateway local (para la UI). No lo compartas:"));
            println!("{t}");
            Ok(())
        }
        _ => {
            let st = gateway::running(&dir);
            let up = match &st {
                Some(s) => gateway::healthy(s.port).await,
                None => false,
            };
            if as_json {
                print_json(&json!({"dir": dir, "running": st.is_some(), "healthy": up,
                    "pid": st.as_ref().map(|s| s.pid), "port": st.as_ref().map(|s| s.port)}));
                return Ok(());
            }
            match (&st, up) {
                (Some(s), true) => println!("{} corriendo en http://127.0.0.1:{} (pid {})", green("✓"), s.port, s.pid),
                (Some(s), false) => println!("{} el proceso {} existe pero no responde: jmd gateway logs", yellow("!"), s.pid),
                (None, _) if dir.join("config.yaml").exists() => println!("{} detenido · jmd gateway start", dim("·")),
                (None, _) => println!("{} sin configurar · jmd init", dim("·")),
            }
            println!("{}", dim(&format!("datos: {}", dir.display())));
            Ok(())
        }
    }
}

fn url_port(url: &str) -> Option<u16> {
    let host = url.split("://").nth(1)?;
    if !(host.starts_with("127.0.0.1") || host.starts_with("localhost")) {
        return None;
    }
    host.split(':').nth(1)?.trim_end_matches('/').parse().ok()
}

// ---------------------------------------------------------------------------
// login y status
// ---------------------------------------------------------------------------

async fn login(c: &mut Client, url: Option<String>, token: Option<String>, key: Option<String>) -> Result<()> {
    let interactive = url.is_none() && token.is_none() && key.is_none() && std::io::stdin().is_terminal();
    let mut s = c.s.clone();
    if interactive {
        s.url = prompt("URL del gateway", Some(&s.url))?;
        s.admin_token = Some(prompt("Token de administración (ADMIN_TOKEN)", s.admin_token.as_deref().map(|_| "guardado"))?)
            .filter(|t| t != "guardado").or(s.admin_token);
        let k = prompt("Clave de /v1 (vacío si el gateway no pide)", None)?;
        if !k.is_empty() {
            s.api_key = Some(k);
        }
    } else {
        if let Some(u) = url {
            s.url = u;
        }
        if token.is_some() {
            s.admin_token = token;
        }
        if key.is_some() {
            s.api_key = key;
        }
    }
    s.url = s.url.trim_end_matches('/').trim_end_matches("/v1").to_string();
    *c = Client::new(s);
    let h = c.health().await?;
    println!("{} gateway {} (versión {})", green("✓"), c.s.url, h["version"].as_str().unwrap_or("?"));
    match c.admin_get("/admin/api/status").await {
        Ok(_) => println!("{} token de administración válido", green("✓")),
        Err(e) => println!("{} token de administración: {e}", yellow("!")),
    }
    let path = c.s.save()?;
    println!("guardado en {}", path.display());
    Ok(())
}

async fn status(c: &Client, as_json: bool) -> Result<()> {
    let health = c.health().await;
    let admin = c.admin_get("/admin/api/status").await;
    let v1 = c.models().await;
    let savings = c.admin_get("/admin/api/savings").await.ok();
    let keys = if health.is_ok() { c.admin_get("/admin/api/keys").await.ok() } else { None };
    let rtk = setup::rtk();
    let claude_cfg = std::fs::read_to_string(setup::claude_path(false)).ok()
        .and_then(|t| serde_json::from_str::<Value>(&t).ok());
    let claude_url = claude_cfg.as_ref().and_then(|v| v["env"]["ANTHROPIC_BASE_URL"].as_str().map(String::from));
    let oc_cfg = [setup::opencode_path(true), setup::opencode_path(false)].iter()
        .filter_map(|p| std::fs::read_to_string(p).ok()).filter_map(|t| serde_json::from_str::<Value>(&t).ok())
        .find(|v| v["provider"]["jmd"].is_object());
    if as_json {
        print_json(&json!({
            "url": c.s.url, "gateway": health.as_ref().ok(), "admin": admin.is_ok(), "v1": v1.is_ok(),
            "savings": savings.as_ref().map(|s| &s["config"]),
            "claude": setup::version_of("claude"), "claude_points_to_gateway": claude_url.as_deref() == Some(&c.s.url),
            "opencode": setup::version_of("opencode"), "opencode_configured": oc_cfg.is_some(),
            "rtk": matches!(rtk, setup::Rtk::Ok(_)), "caveman": setup::caveman_installed(), "keys": keys,
        }));
        return Ok(());
    }
    let ok = |b: bool| if b { green("✓") } else { red("✗") };
    println!("{}", bold("Gateway"));
    match &health {
        Ok(h) => println!("  {} {} · versión {}", ok(true), c.s.url, h["version"].as_str().unwrap_or("?")),
        Err(e) => {
            println!("  {} {e}", ok(false));
            if gateway::data_dir().join("config.yaml").exists() {
                println!("  {} hay un gateway local configurado: jmd gateway start", yellow("→"));
            } else {
                println!("  {} ¿primera vez? jmd init", yellow("→"));
            }
        }
    }
    let up = health.is_ok();
    match &admin {
        _ if !up => {}
        Ok(s) => {
            println!("  {} token de administración", ok(true));
            for w in s["warnings"].as_array().into_iter().flatten() {
                println!("  {} {}", yellow("!"), w.as_str().unwrap_or(""));
            }
        }
        Err(e) => println!("  {} administración: {e}", ok(false)),
    }
    match &v1 {
        _ if !up => {}
        Ok(m) => println!("  {} /v1 ({} perfiles y modelos)", ok(true), m["data"].as_array().map(|a| a.len()).unwrap_or(0)),
        Err(e) => println!("  {} /v1: {e}", ok(false)),
    }
    if let Some(s) = &savings {
        let cfg = &s["config"];
        println!("  estilo {} · compresión de herramientas {}", cyan(cfg["style"].as_str().unwrap_or("off")),
            if cfg["compress_tool_output"].as_bool() == Some(true) { cyan("on") } else { dim("off") });
    }
    if let Some(keys) = keys.as_ref().and_then(|k| k.as_object()) {
        println!("\n{}", bold("Claves de los proveedores"));
        for (name, k) in keys {
            let msg = k["message"].as_str().unwrap_or("");
            match k["state"].as_str() {
                Some("valid") => println!("  {} {name}", ok(true)),
                Some("rejected") => println!("  {} {name}: clave rechazada · cámbiala con jmd init --local (o en la UI) · {}",
                    ok(false), dim(msg)),
                Some("missing") => println!("  {} {name}: sin clave (sus modelos se saltan)", dim("·")),
                _ => println!("  {} {name}: no se pudo comprobar · {}", yellow("!"), dim(msg)),
            }
        }
    }
    println!("\n{}", bold("Agentes de terminal"));
    match setup::version_of("claude") {
        Some(v) => {
            let linked = claude_url.as_deref() == Some(c.s.url.as_str());
            println!("  {} Claude Code {v} · {}", ok(true),
                if linked { green("apunta al gateway") } else { yellow("no apunta al gateway: jmd setup claude") });
            // Una variable de entorno gana a settings.json: avisar si apunta a otro sitio.
            if let Ok(env_url) = std::env::var("ANTHROPIC_BASE_URL") {
                if env_url.trim_end_matches('/') != c.s.url {
                    println!("  {} ANTHROPIC_BASE_URL está definida en tu terminal ({env_url}) y tiene prioridad sobre \
                        settings.json: quítala (unset ANTHROPIC_BASE_URL) para usar el gateway", yellow("!"));
                }
            }
        }
        None => println!("  {} Claude Code no instalado {}", dim("·"), dim("(npm i -g @anthropic-ai/claude-code)")),
    }
    match setup::version_of("opencode") {
        Some(v) => println!("  {} OpenCode {v} · {}", ok(true),
            if oc_cfg.is_some() { green("proveedor jmd configurado") } else { yellow("sin proveedor jmd: jmd setup opencode") }),
        None => println!("  {} OpenCode no instalado {}", dim("·"), dim("(https://opencode.ai)")),
    }
    println!("\n{}", bold("Ahorro de tokens"));
    match rtk {
        setup::Rtk::Ok(v) => println!("  {} RTK {v} {}", ok(true), dim("(`rtk gain` para ver lo ahorrado)")),
        setup::Rtk::Other(v) => println!("  {} hay un `rtk` ({v}) que no es Rust Token Killer", yellow("!")),
        setup::Rtk::Missing => println!("  {} RTK no instalado {}", dim("·"), dim("(brew install rtk · cargo install --git https://github.com/rtk-ai/rtk)")),
    }
    let style_on = savings.as_ref().and_then(|s| s["config"]["style"].as_str()).is_some_and(|s| s != "off");
    if setup::caveman_installed() {
        println!("  {} caveman instalado en Claude Code{}", ok(true),
            if style_on { yellow(" · ojo: el estilo del gateway también está activo (doble recorte)") } else { String::new() });
    } else {
        println!("  {} caveman no instalado {}", dim("·"),
            dim("(el estilo del gateway hace lo mismo para cualquier agente: jmd style full)"));
    }
    Ok(())
}

// ---------------------------------------------------------------------------
// models, providers, quotas
// ---------------------------------------------------------------------------

fn circuit(m: &Value) -> String {
    if let Some(cd) = m["cooldown"].as_object() {
        return yellow(&format!("cooldown {} ({})", out::ago_or_in(cd["until"].as_f64().unwrap_or(0.0)),
            cd["reason"].as_str().unwrap_or("")));
    }
    match m["circuit"].as_str() {
        Some("open") => red(&format!("circuito abierto {}", out::ago_or_in(m["open_until"].as_f64().unwrap_or(0.0)))),
        Some("half_open") => yellow("semiabierto"),
        _ if m["deployments"].as_array().is_some_and(|d| d.iter().any(|d| d["usable"] == true)) => green("disponible"),
        _ => {
            let why = m["deployments"].as_array().and_then(|d| d.iter().find_map(|d| d["reason"].as_str())).unwrap_or("");
            red(&format!("no usable: {why}"))
        }
    }
}

async fn models(c: &Client, as_json: bool) -> Result<()> {
    let v1 = c.models().await?;
    let st = c.admin_get("/admin/api/status").await.ok();
    if as_json {
        print_json(&json!({"models": v1, "status": st}));
        return Ok(());
    }
    let data = v1["data"].as_array().cloned().unwrap_or_default();
    println!("{}", bold("Perfiles (úsalos como `model`)"));
    let rows: Vec<Vec<String>> = data.iter().filter(|m| m["owned_by"] != "upstream").map(|m| vec![
        cyan(m["id"].as_str().unwrap_or("")),
        m["description"].as_str().unwrap_or("").to_string(),
        dim(&m["chain"].as_array().map(|c| c.iter().filter_map(Value::as_str).collect::<Vec<_>>().join(" → ")).unwrap_or_default()),
    ]).collect();
    table(&["perfil", "para qué", "cadena"], &rows);
    println!("\n{}", bold("Modelos"));
    let mut stats: std::collections::HashMap<String, (f64, f64)> = Default::default();
    if let Some(s) = &st {
        for r in s["stats"].as_array().into_iter().flatten() {
            let e = stats.entry(r["model"].as_str().unwrap_or("").into()).or_default();
            let n = r["calls"].as_f64().unwrap_or(0.0);
            e.0 += n;
            e.1 += n * r["success_rate"].as_f64().unwrap_or(0.0);
        }
    }
    let rows: Vec<Vec<String>> = data.iter().filter(|m| m["owned_by"] == "upstream").map(|m| {
        let id = m["id"].as_str().unwrap_or("");
        let state = st.as_ref().map(|s| circuit(&s["models"][id])).unwrap_or_else(|| dim("(sin token de admin)"));
        let (n, ok) = stats.get(id).copied().unwrap_or_default();
        vec![id.to_string(), state,
             m["capabilities"].as_array().map(|c| c.iter().filter_map(Value::as_str).collect::<Vec<_>>().join(",")).unwrap_or_default(),
             format!("{}k", m["context"].as_u64().unwrap_or(0) / 1000),
             if n > 0.0 { format!("{n:.0} · {:.0} %", ok / n * 100.0) } else { dim("—") }]
    }).collect();
    table(&["modelo", "estado", "capacidades", "contexto", "llamadas · éxito"], &rows);
    Ok(())
}

fn quota_cell(used: &Value, limit: &Value, remaining: &Value) -> String {
    match (limit.as_u64(), remaining.as_u64()) {
        (Some(l), Some(r)) => {
            let txt = format!("{r}/{l}");
            if r == 0 { red(&txt) } else if (r as f64) < l as f64 * 0.2 { yellow(&txt) } else { green(&txt) }
        }
        _ => format!("{} usadas", used.as_u64().unwrap_or(0)),
    }
}

fn balance_cell(p: &Value) -> String {
    let b = &p["balance"];
    if p["balance_kind"] == "none" {
        return dim("—");
    }
    if b.is_null() {
        return dim("sin consultar");
    }
    if let Some(e) = b["error"].as_str() {
        return red(&format!("error: {}", e.chars().take(40).collect::<String>()));
    }
    let rem = out::num(&b["remaining"], 2);
    match b["limit"].as_f64() {
        Some(l) => format!("{rem}/{l:.2} {}", b["unit"].as_str().unwrap_or("")),
        None => format!("{rem} {}", b["unit"].as_str().unwrap_or("")),
    }
}

async fn providers(c: &Client, as_json: bool) -> Result<()> {
    let q = c.admin_get("/admin/api/quotas").await?;
    if as_json {
        print_json(&q);
        return Ok(());
    }
    let mut rows = vec![];
    for (name, p) in q.as_object().into_iter().flatten() {
        let state = if p["enabled"] == false { dim("desactivado") } else if p["has_key"] == false { red("sin clave") } else { green("activo") };
        rows.push(vec![cyan(name), state, quota_cell(&p["requests_today"], &p["requests_per_day"], &p["remaining_today"]),
            format!("{}{}", p["requests_last_minute"], p["requests_per_minute"].as_u64().map(|l| format!("/{l}")).unwrap_or_default()),
            out::num(&p["tokens_today"], 0), balance_cell(p),
            dim(&out::ago_or_in(p["resets_at"].as_f64().unwrap_or(0.0)))]);
    }
    table(&["proveedor", "estado", "hoy (rest./límite)", "último min", "tokens hoy", "saldo", "reinicio"], &rows);
    println!("{}", dim("detalle: jmd provider <nombre> · modelos reales: jmd provider <nombre> test"));
    Ok(())
}

async fn provider(c: &Client, name: &str, action: &str, as_json: bool) -> Result<()> {
    match action {
        "test" => {
            let r = c.admin_send(Method::POST, &format!("/admin/api/providers/{name}/models"), None).await?;
            if as_json {
                print_json(&r);
                return Ok(());
            }
            if r["ok"] == true {
                println!("{} {} modelos · {:.2} s", green("✓"), r["models"].as_array().map(|m| m.len()).unwrap_or(0),
                    r["latency"].as_f64().unwrap_or(0.0));
            } else {
                println!("{} HTTP {} {}", red("✗"), r["status"], r["error"].as_str().unwrap_or(""));
            }
            let rows: Vec<Vec<String>> = r["configured"].as_array().into_iter().flatten().map(|d| vec![
                d["group"].as_str().unwrap_or("").into(), d["model"].as_str().unwrap_or("").into(),
                match d["exists"].as_bool() { Some(true) => green("existe"), Some(false) => red("no está en /models"), None => dim("?") },
            ]).collect();
            if !rows.is_empty() {
                println!("\n{}", bold("Deployments configurados"));
                table(&["modelo", "id en el proveedor", ""], &rows);
            }
            let free: Vec<&str> = r["models"].as_array().into_iter().flatten()
                .filter(|m| m["free"] == true).filter_map(|m| m["id"].as_str()).take(30).collect();
            if !free.is_empty() {
                println!("\n{} {}", bold("Gratis en este proveedor:"), free.join(", "));
            }
            Ok(())
        }
        "balance" => {
            let b = c.admin_send(Method::POST, &format!("/admin/api/providers/{name}/balance"), None).await?;
            if as_json {
                print_json(&b);
            } else if let Some(e) = b["error"].as_str() {
                println!("{} {e}", yellow("!"));
            } else {
                println!("saldo {} de {} {} · gastado {}", out::num(&b["remaining"], 2), out::num(&b["limit"], 2),
                    b["unit"].as_str().unwrap_or(""), out::num(&b["usage"], 2));
            }
            Ok(())
        }
        _ => {
            let q = c.admin_get("/admin/api/quotas").await?;
            let p = q.get(name).ok_or_else(|| anyhow!("proveedor desconocido: {name}"))?;
            if as_json {
                print_json(p);
                return Ok(());
            }
            println!("{} · saldo {} · hoy {} · último minuto {}", bold(name), balance_cell(p),
                quota_cell(&p["requests_today"], &p["requests_per_day"], &p["remaining_today"]), p["requests_last_minute"]);
            deployments_table(p);
            Ok(())
        }
    }
}

fn deployments_table(p: &Value) {
    let rows: Vec<Vec<String>> = p["deployments"].as_array().into_iter().flatten().map(|d| {
        let h = &d["headers"];
        let said = if h["remaining_requests"].is_number() {
            format!("{}{} req{}", out::num(&h["remaining_requests"], 0),
                h["limit_requests"].as_f64().map(|l| format!("/{l:.0}")).unwrap_or_default(),
                h["reset_requests_at"].as_f64().map(|t| format!(" · reinicia {}", out::ago_or_in(t))).unwrap_or_default())
        } else {
            dim("—")
        };
        vec![d["group"].as_str().unwrap_or("").into(), dim(d["model"].as_str().unwrap_or("")),
             quota_cell(&d["requests_today"], &d["requests_per_day"], &d["remaining_today"]), said]
    }).collect();
    table(&["  modelo", "id", "hoy", "el proveedor dice"], &rows);
}

async fn quotas(c: &Client, as_json: bool) -> Result<()> {
    let q = c.admin_get("/admin/api/quotas").await?;
    if as_json {
        print_json(&q);
        return Ok(());
    }
    for (name, p) in q.as_object().into_iter().flatten() {
        println!("{} · saldo {} · hoy {} · tokens {} · reinicio {}", bold(name), balance_cell(p),
            quota_cell(&p["requests_today"], &p["requests_per_day"], &p["remaining_today"]), out::num(&p["tokens_today"], 0),
            dim(&out::ago_or_in(p["resets_at"].as_f64().unwrap_or(0.0))));
        deployments_table(p);
        println!();
    }
    Ok(())
}

// ---------------------------------------------------------------------------
// stats, requests, route
// ---------------------------------------------------------------------------

async fn stats(c: &Client, as_json: bool) -> Result<()> {
    let st = c.admin_get("/admin/api/status").await?;
    let sv = c.admin_get("/admin/api/savings").await?;
    let gain = setup::rtk_gain();
    if as_json {
        print_json(&json!({"stats": st["stats"], "savings": sv, "rtk_gain": gain}));
        return Ok(());
    }
    println!("{} {}", bold("Uso por agente y modelo"), dim(&format!("(últimos {} días)", sv["window_days"])));
    let rows: Vec<Vec<String>> = st["stats"].as_array().into_iter().flatten().map(|r| {
        let rate = r["success_rate"].as_f64().unwrap_or(0.0) * 100.0;
        let rate_s = format!("{rate:.0} %");
        vec![cyan(r["agent"].as_str().unwrap_or("")), r["model"].as_str().unwrap_or("").into(), out::num(&r["calls"], 0),
             if rate >= 90.0 { green(&rate_s) } else if rate >= 60.0 { yellow(&rate_s) } else { red(&rate_s) },
             r["latency"].as_f64().map(|l| format!("{l:.1} s")).unwrap_or_else(|| dim("—")), out::num(&r["quality"], 2)]
    }).collect();
    if rows.is_empty() {
        println!("  {}", dim("sin peticiones todavía"));
    } else {
        table(&["agente", "modelo", "intentos", "éxito", "latencia", "calidad"], &rows);
    }
    println!("\n{}", bold("Ahorro de tokens por estilo y cliente"));
    let rows: Vec<Vec<String>> = sv["by_style"].as_array().into_iter().flatten().map(|r| vec![
        cyan(r["style"].as_str().unwrap_or("")), r["client"].as_str().unwrap_or("").into(), out::num(&r["responses"], 0),
        out::num(&r["avg_output_tokens"], 0), out::num(&r["avg_input_tokens"], 0),
        format!("≈{} tok", r["tool_chars_saved"].as_i64().unwrap_or(0) / 4),
    ]).collect();
    if rows.is_empty() {
        println!("  {}", dim("sin datos"));
    } else {
        table(&["estilo", "cliente", "respuestas", "tokens salida (media)", "tokens entrada (media)", "quitado de herramientas"], &rows);
        println!("{}", dim("compara «tokens salida» entre off y full/ultra para ver cuánto ahorra el estilo"));
    }
    if let Some(g) = gain {
        println!("\n{}", bold("RTK (rtk gain)"));
        println!("{}", g.trim_end());
    }
    Ok(())
}

async fn requests(c: &Client, n: u32, as_json: bool) -> Result<()> {
    let r = c.admin_get(&format!("/admin/api/requests?limit={n}")).await?;
    if as_json {
        print_json(&r);
        return Ok(());
    }
    let rows: Vec<Vec<String>> = r.as_array().into_iter().flatten().rev().map(|r| vec![
        dim(&out::ago_or_in(r["ts"].as_f64().unwrap_or(0.0))), cyan(r["agent"].as_str().unwrap_or("")),
        r["model"].as_str().unwrap_or("").into(), dim(r["provider"].as_str().unwrap_or("")),
        if r["ok"] == true { green("ok") } else { red(&format!("{} {}", r["error_kind"].as_str().unwrap_or(""), r["status"])) },
        r["latency"].as_f64().map(|l| format!("{l:.1} s")).unwrap_or_default(),
        match (r["prompt_tokens"].as_u64(), r["completion_tokens"].as_u64()) {
            (Some(p), Some(c)) => format!("{p}+{c}"),
            _ => String::new(),
        },
    ]).collect();
    table(&["cuándo", "agente", "modelo", "proveedor", "resultado", "latencia", "tokens"], &rows);
    Ok(())
}

async fn route(c: &Client, text: &str, model: &str, as_json: bool) -> Result<()> {
    let plan = c.route(&json!({"model": model, "messages": [{"role": "user", "content": text}]})).await?;
    if as_json {
        print_json(&plan);
        return Ok(());
    }
    let d = &plan["decision"];
    println!("{} {} · {} · confianza {} · prioridad {}", bold("→"), cyan(d["agent"].as_str().unwrap_or("")),
        d["source"].as_str().unwrap_or(""), out::num(&d["confidence"], 2), plan["priority"].as_str().unwrap_or(""));
    println!("  {} · contexto {} · razonamiento {}", d["modality"].as_str().unwrap_or(""),
        d["context"].as_str().unwrap_or(""), d["reasoning"].as_str().unwrap_or(""));
    println!("  cadena: {}", plan["ranked"].as_array().filter(|r| !r.is_empty()).map(|r| r.iter()
        .map(|x| format!("{} {}", x["model"].as_str().unwrap_or(""), dim(&format!("({:.3})", x["score"].as_f64().unwrap_or(0.0)))))
        .collect::<Vec<_>>().join(" → "))
        .unwrap_or_else(|| plan["chain"].as_array().map(|c| c.iter().filter_map(Value::as_str).collect::<Vec<_>>().join(" → ")).unwrap_or_default()));
    for r in d["reasons"].as_array().into_iter().flatten() {
        println!("  {}", dim(r.as_str().unwrap_or("")));
    }
    for (m, why) in plan["dropped"].as_object().into_iter().flatten() {
        println!("  {} {m}: {}", dim("descartado"), dim(why.as_str().unwrap_or("")));
    }
    Ok(())
}

// ---------------------------------------------------------------------------
// style
// ---------------------------------------------------------------------------

async fn style(c: &Client, level: Option<String>, compress: Option<String>, max: Option<usize>, as_json: bool) -> Result<()> {
    let sv = c.admin_get("/admin/api/savings").await?;
    let mut cfg = sv["config"].clone();
    let changed = level.is_some() || compress.is_some() || max.is_some();
    if let Some(l) = level {
        let l = l.to_lowercase();
        if !["off", "lite", "full", "ultra"].contains(&l.as_str()) {
            bail!("estilo: off · lite · full · ultra");
        }
        cfg["style"] = json!(l);
    }
    if let Some(cmp) = compress {
        cfg["compress_tool_output"] = json!(matches!(cmp.as_str(), "on" | "si" | "sí" | "true" | "1"));
    }
    if let Some(m) = max {
        cfg["tool_output_max_chars"] = json!(m);
    }
    if changed {
        c.admin_send(Method::PUT, "/admin/api/savings", Some(&cfg)).await?;
    }
    if as_json {
        print_json(&cfg);
        return Ok(());
    }
    println!("{} estilo {} · compresión de herramientas {} (máx. {} caracteres)", if changed { green("✓") } else { String::new() },
        cyan(cfg["style"].as_str().unwrap_or("off")),
        if cfg["compress_tool_output"] == true { cyan("on") } else { dim("off") }, cfg["tool_output_max_chars"]);
    if !changed {
        println!("{}", dim("cambiar: jmd style off|lite|full|ultra [--compress on|off] [--max 12000]"));
    } else if cfg["style"] != "off" && setup::caveman_installed() {
        println!("{} caveman también está instalado en Claude Code: las respuestas se recortarán dos veces", yellow("!"));
    }
    Ok(())
}

// ---------------------------------------------------------------------------
// setup
// ---------------------------------------------------------------------------

fn confirm(question: &str, yes: bool) -> bool {
    if yes {
        return true;
    }
    if !std::io::stdin().is_terminal() {
        return false;
    }
    print!("{question} [s/N] ");
    let _ = std::io::stdout().flush();
    let mut s = String::new();
    let _ = std::io::stdin().lock().read_line(&mut s);
    matches!(s.trim().to_lowercase().as_str(), "s" | "si" | "sí" | "y" | "yes")
}

async fn setup_cmd(c: &Client, target: &str, project: bool, yes: bool, undo: bool) -> Result<()> {
    if target == "claude" || target == "all" {
        setup_claude(c, project, yes, undo)?;
    }
    if (target == "opencode" || target == "all") && !undo {
        if target == "all" {
            println!();
        }
        setup_opencode(c, project).await?;
    }
    Ok(())
}

fn setup_claude(c: &Client, project: bool, yes: bool, undo: bool) -> Result<()> {
    let path = setup::claude_path(project);
    let existing = std::fs::read_to_string(&path).ok();
    if undo {
        let Some(text) = existing else {
            println!("{} no existe, nada que quitar", path.display());
            return Ok(());
        };
        setup::write_with_backup(&path, &setup::claude_undo(&text)?)?;
        println!("{} Claude Code ya no usa el gateway ({})", green("✓"), path.display());
        return Ok(());
    }
    let tokens = sso::Tokens::load();
    let with_account = tokens.logged_in();
    let merged = if with_account {
        setup::claude_settings_sso(existing.as_deref(), &c.s.url)?
    } else {
        let token = c.s.api_key.clone().filter(|k| !k.is_empty()).unwrap_or_else(|| setup::NO_KEY.into());
        setup::claude_settings(existing.as_deref(), &c.s.url, &token)?
    };
    let backup = setup::write_with_backup(&path, &merged)?;
    println!("{} {}", bold("Claude Code"), dim(&path.display().to_string()));
    println!("  {} ANTHROPIC_BASE_URL={} {}", green("✓"), c.s.url,
        backup.map(|b| dim(&format!("(copia: {})", b.display()))).unwrap_or_default());
    if with_account {
        println!("  {} apiKeyHelper = `jmd token`: entra al gateway con tu cuenta ({})", green("✓"), tokens.who());
        let mcp_path = setup::claude_mcp_path(project);
        let what = mcp_path.display().to_string();
        let existing = std::fs::read_to_string(&mcp_path).ok();
        match setup::claude_mcp(existing.as_deref(), &what).and_then(|v| setup::write_with_backup(&mcp_path, &v)) {
            Ok(_) => println!("  {} servidor MCP «{}» registrado en {what} (cursos, sesiones, tareas, notas, preguntas)", green("✓"), setup::LMS_MCP),
            Err(e) => println!("  {} MCP del LMS: {e}", yellow("!")),
        }
    }
    if project && setup::gitignore(".claude/settings.local.json")? {
        println!("  {} .claude/settings.local.json añadido a .gitignore", green("✓"));
    }
    println!("  {}", dim("los modelos claude-opus/sonnet/haiku van a coding-deep/coding/cheap (compat.model_aliases en la UI)"));
    if setup::version_of("claude").is_none() {
        println!("  {} Claude Code no está instalado: npm i -g @anthropic-ai/claude-code", yellow("!"));
    }
    match setup::rtk() {
        setup::Rtk::Ok(v) => {
            if confirm(&format!("  ¿Instalar el hook de RTK ({v}) en Claude Code? (`rtk init --global`)"), yes) {
                match setup::rtk_init_global() {
                    Ok(_) => println!("  {} RTK conectado: los comandos se comprimen antes de llegar al modelo", green("✓")),
                    Err(e) => println!("  {} {e}", yellow("!")),
                }
            } else {
                println!("  {} RTK sin conectar: `rtk init --global` cuando quieras", dim("·"));
            }
        }
        setup::Rtk::Other(v) => println!("  {} el `rtk` instalado ({v}) no es Rust Token Killer", yellow("!")),
        setup::Rtk::Missing => println!("  {} RTK: brew install rtk · cargo install --git https://github.com/rtk-ai/rtk · luego jmd setup claude",
            dim("·")),
    }
    if setup::caveman_installed() {
        println!("  {} caveman instalado (si activas también `jmd style`, el recorte se duplica)", green("✓"));
    } else {
        println!("  {} caveman: plugin de Claude Code (https://github.com/JuliusBrussee/caveman) o, para todos los agentes, `jmd style full`",
            dim("·"));
    }
    Ok(())
}

async fn setup_opencode(c: &Client, project: bool) -> Result<()> {
    let v1 = c.models().await?;
    let models: Vec<(String, String)> = v1["data"].as_array().into_iter().flatten()
        .filter(|m| m["owned_by"] != "upstream")
        .map(|m| (m["id"].as_str().unwrap_or("").to_string(), m["description"].as_str().unwrap_or("").to_string()))
        .collect();
    let tokens = sso::Tokens::load();
    let personal = tokens.gateway_token.clone().filter(|_| tokens.has_sso() || tokens.logged_in());
    let key = match &personal {
        Some(p) => p.as_str(),
        None if c.s.api_key.as_deref().is_some_and(|k| !k.is_empty()) => "{env:JMD_API_KEY}",
        None => setup::NO_KEY,
    };
    let path = setup::opencode_path(project);
    let existing = std::fs::read_to_string(&path).ok();
    let mut merged = setup::opencode_config(existing.as_deref(), &c.s.url, &models, key)?;
    if tokens.logged_in() {
        setup::opencode_mcp(&mut merged)?;
    }
    let backup = setup::write_with_backup(&path, &merged)?;
    println!("{} {}", bold("OpenCode"), dim(&path.display().to_string()));
    println!("  {} proveedor jmd → {}/v1 con {} perfiles (modelo por defecto: {}) {}", green("✓"), c.s.url, models.len(),
        merged["model"].as_str().unwrap_or(""), backup.map(|b| dim(&format!("(copia: {})", b.display()))).unwrap_or_default());
    if personal.is_some() {
        println!("  {} entra al gateway con tu cuenta ({}) mediante un token personal ({} días)", green("✓"), tokens.who(),
            ((tokens.gateway_token_expires - std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_secs_f64()).unwrap_or(0.0)) / 86_400.0).round());
    } else if key != setup::NO_KEY {
        println!("  {} exporta la clave antes de abrir OpenCode: export JMD_API_KEY=…", yellow("!"));
    }
    if tokens.logged_in() {
        println!("  {} servidor MCP «{}»: cursos, sesiones, tareas, notas y preguntas del LMS", green("✓"), setup::LMS_MCP);
    }
    println!("  {}", dim("en OpenCode: /models → jmd/auto, jmd/coding, jmd/coding-deep…"));
    if setup::version_of("opencode").is_none() {
        println!("  {} OpenCode no está instalado: https://opencode.ai", yellow("!"));
    }
    Ok(())
}

// ---------------------------------------------------------------------------
// chat y modo interactivo
// ---------------------------------------------------------------------------

struct Session {
    model: String,
    style: Option<String>,
    priority: Option<String>,
    history: Vec<Value>,
    last: Option<String>,
    agent: agent::Agent,
}

impl Session {
    fn new(model: String, style: Option<String>, priority: Option<String>, pool: Option<agent::McpPool>) -> Self {
        Session { model, style, priority, history: vec![], last: None, agent: agent::Agent::new(pool) }
    }
}

/// Conecta los servidores MCP en segundo plano (JMD_NO_MCP=1 lo desactiva).
fn start_mcp_quietly() -> Option<agent::McpPool> {
    if std::env::var("JMD_NO_MCP").is_ok_and(|v| v == "1") {
        return None;
    }
    let cwd = std::env::current_dir().unwrap_or_else(|_| ".".into());
    let servers = mcp::discover(&cwd);
    (!servers.is_empty()).then(|| agent::start_mcp(servers))
}

/// En una pregunta suelta con --mcp: esperar a que terminen de conectar (máx. 45 s).
async fn wait_mcp(s: &Session) {
    let Some(pool) = &s.agent.mcp else { return };
    for _ in 0..90 {
        if !pool.lock().await.iter().any(|m| matches!(m.state, agent::McpState::Connecting)) {
            break;
        }
        tokio::time::sleep(std::time::Duration::from_millis(500)).await;
    }
    eprintln!("{}", agent::mcp_summary(pool).await);
}

async fn ask(c: &Client, s: &mut Session, text: &str) -> Result<client::ChatMeta> {
    let mut hints = json!({});
    if let Some(st) = &s.style {
        hints["style"] = json!(st);
    }
    if let Some(p) = &s.priority {
        hints["priority"] = json!(p);
    }
    let mark = s.history.len();
    s.history.push(json!({"role": "user", "content": text}));
    match agent::run_turn(c, &mut s.agent, &mut s.history, &s.model, &hints).await {
        Ok(meta) => {
            let upstream = if meta.upstream_model.is_empty() { String::new() } else { format!(" ({})", meta.upstream_model) };
            eprintln!("{}", dim(&format!("↳ {} · {}{} · {:.1} s · intentos {}{}", meta.agent, meta.model, upstream,
                meta.seconds, meta.attempts, meta.output_tokens.map(|t| format!(" · {t} tok")).unwrap_or_default())));
            s.last = Some(meta.request_id.clone()).filter(|r| !r.is_empty());
            Ok(meta)
        }
        Err(e) => {
            s.history.truncate(mark);
            Err(e)
        }
    }
}

const REPL_HELP: &str = "\
Comandos (con o sin «/»):
  models · providers · provider <n> [test|balance] · quotas · stats · requests [-n N]
  route <texto> · style [off|lite|full|ultra] · reset <modelo> · status · setup <claude|opencode|all> · ui
  gateway [start|stop|restart|status|logs|token] · init
  mcp [list|tools <n>|add|remove] · skills
  login --sso · logout · whoami · courses · course <id> · lesson [open] <id> · assignments · assignment <id>
  submit <id> · grades · ask <sesión> \"…\" (publica una pregunta en el LMS)
Sesión de chat:
  /todos              la lista de tareas del agente
  /mcp                servidores MCP de esta sesión y su estado · /tools: herramientas que ve el modelo
  /auto               ejecutar herramientas (comandos, archivos, MCP) sin preguntar (otra vez: volver a preguntar)
  /skills             skills disponibles · /proto <descripción>: prototipo de UI en HTML
  /model <perfil>     cambia el perfil (auto, coding, coding-deep, reasoning… o un modelo)
  /style <nivel>      estilo solo para esta sesión (off · lite · full · ultra)
  /priority <p>       quality · speed · cost
  /rate <0..1>        valora la última respuesta (alimenta el aprendizaje)
  /clear              olvida la conversación
  /exit               salir
Cualquier otra cosa se envía como mensaje.";

fn is_command(word: &str) -> bool {
    matches!(word, "help" | "login" | "status" | "doctor" | "models" | "model" | "providers" | "provider" | "quotas" | "quota"
        | "stats" | "requests" | "route" | "style" | "reset" | "setup" | "ui" | "chat" | "ask" | "update" | "init"
        | "gateway" | "mcp" | "skills" | "logout" | "whoami" | "token" | "courses" | "course" | "lesson" | "materials"
        | "assignments" | "assignment" | "submit" | "grades")
}

async fn repl(c: &mut Client) -> Result<()> {
    let mut s = Session::new("auto".into(), None, None, start_mcp_quietly());
    match c.health().await {
        Ok(h) => println!("{} {} · gateway {} · {}", bold("jmd"), env!("CARGO_PKG_VERSION"), h["version"].as_str().unwrap_or("?"), c.s.url),
        Err(e) => println!("{} {e}", yellow("!")),
    }
    println!("{}", dim("escribe help para ver los comandos; lo que no sea un comando se envía como mensaje (perfil auto)"));
    if let Some(pool) = &s.agent.mcp {
        println!("{}", dim(&format!("MCP: conectando {} servidor(es) en segundo plano · /mcp para ver su estado", pool.lock().await.len())));
    }
    chat_loop(c, &mut s, true).await
}

async fn chat_repl(c: &mut Client, s: &mut Session) -> Result<()> {
    println!("{}", dim(&format!("chat con {} · /help · /exit", s.model)));
    chat_loop(c, s, false).await
}

async fn chat_loop(c: &mut Client, s: &mut Session, commands: bool) -> Result<()> {
    let stdin = std::io::stdin();
    loop {
        print!("{} ", cyan(&format!("jmd[{}]>", s.model)));
        std::io::stdout().flush()?;
        let mut line = String::new();
        if stdin.lock().read_line(&mut line)? == 0 {
            println!();
            return Ok(());
        }
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        let stripped = line.strip_prefix('/').unwrap_or(line);
        let mut words = stripped.split_whitespace();
        let first = words.next().unwrap_or("").to_lowercase();
        let rest: Vec<&str> = words.collect();
        let slash = line.starts_with('/');
        let result: Result<()> = match first.as_str() {
            "exit" | "quit" | "salir" if slash || rest.is_empty() => return Ok(()),
            "help" | "ayuda" | "?" if slash || rest.is_empty() => {
                println!("{REPL_HELP}");
                Ok(())
            }
            "clear" if slash => {
                s.history.clear();
                s.agent.todos.clear();
                println!("{}", dim("conversación y tareas borradas"));
                Ok(())
            }
            "todos" | "tareas" if slash => {
                println!("{}", agent::render_todos(&s.agent.todos));
                Ok(())
            }
            "mcp" if slash && rest.is_empty() => {
                match &s.agent.mcp {
                    Some(pool) => print!("{}", agent::mcp_details(pool).await),
                    None => println!("{}", dim("MCP: ningún servidor configurado (jmd mcp add …) o desactivado con JMD_NO_MCP=1")),
                }
                Ok(())
            }
            "tools" | "herramientas" if slash => {
                let defs = s.agent.tool_defs().await;
                for d in &defs {
                    println!("  {} {}", cyan(d["function"]["name"].as_str().unwrap_or("")),
                        dim(&d["function"]["description"].as_str().unwrap_or("").chars().take(80).collect::<String>()));
                }
                Ok(())
            }
            "auto" if slash => {
                s.agent.auto = !s.agent.auto;
                println!("{}", if s.agent.auto { yellow("herramientas sin confirmación: comandos, archivos y MCP (vuelve con /auto)") }
                    else { dim("las herramientas vuelven a pedir confirmación") });
                Ok(())
            }
            "skills" if slash => {
                for k in &s.agent.skills {
                    println!("  {} {} {}", cyan(&k.name), dim(&format!("[{}]", k.source)),
                        k.description.chars().take(80).collect::<String>());
                }
                Ok(())
            }
            "proto" | "prototipo" if slash => {
                if rest.is_empty() {
                    Err(anyhow!("uso: /proto <qué pantalla o flujo quieres> (p. ej. /proto panel de alumnos con notas)"))
                } else {
                    let prompt = format!("Usa la skill «prototipo»: carga sus instrucciones con load_skill y luego \
                        crea el prototipo con save_prototype. Pedido: {}", rest.join(" "));
                    ask(c, s, &prompt).await.map(|_| ())
                }
            }
            "model" if slash && !rest.is_empty() => {
                s.model = rest[0].to_string();
                Ok(())
            }
            "style" if slash && !rest.is_empty() => {
                s.style = Some(rest[0].to_string()).filter(|v| v != "default");
                println!("{}", dim(&format!("estilo de la sesión: {}", rest[0])));
                Ok(())
            }
            "priority" if slash && !rest.is_empty() => {
                s.priority = Some(rest[0].to_string());
                Ok(())
            }
            "rate" if slash => match (&s.last, rest.first().and_then(|q| q.replace(',', ".").parse::<f64>().ok())) {
                (Some(rid), Some(q)) if (0.0..=1.0).contains(&q) => {
                    c.feedback(rid, q).await.map(|_| println!("{}", dim("valoración guardada")))
                }
                (None, _) => Err(anyhow!("todavía no hay respuesta que valorar")),
                _ => Err(anyhow!("uso: /rate 0..1 (1 = buena)")),
            },
            w if (slash || commands) && is_command(w) => {
                let mut argv = vec!["jmd".to_string(), w.to_string()];
                // route y chat llevan el resto como un único texto
                if matches!(w, "route" | "chat") {
                    if !rest.is_empty() {
                        argv.push(rest.join(" "));
                    }
                } else {
                    argv.extend(rest.iter().map(|x| x.to_string()));
                }
                if w == "help" {
                    println!("{REPL_HELP}");
                    Ok(())
                } else {
                    match Cli::try_parse_from(&argv) {
                        Ok(Cli { cmd: Some(Cmd::Chat { text, .. }), .. }) => ask(c, s, &text.join(" ")).await.map(|_| ()),
                        Ok(Cli { cmd: Some(cmd), json, .. }) => Box::pin(run(c, cmd, json)).await,
                        Ok(_) => Ok(()),
                        Err(e) => {
                            println!("{e}");
                            Ok(())
                        }
                    }
                }
            }
            _ if slash => Err(anyhow!("comando desconocido: /{first} (escribe /help)")),
            _ => ask(c, s, line).await.map(|_| ()),
        };
        if let Err(e) = result {
            eprintln!("{} {e:#}", red("error:"));
        }
    }
}
