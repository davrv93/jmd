#!/usr/bin/env bash
# Instalador de prerrequisitos del curso «Programación agéntica» (macOS, Linux y WSL).
#
#   curl -fsSL https://raw.githubusercontent.com/davrv93/jmd/main/instalador/instalar.sh | bash
#
# Con opciones (hay que pasar los argumentos a bash, no al curl):
#   curl -fsSL .../instalar.sh | bash -s -- --verificar
#
# Opciones:
#   --verificar        solo comprueba qué hay y muestra la tabla; no instala nada
#   --sin-docker       no instala Docker
#   --sin-openpencil   no instala OpenPencil ni su CLI `op`
#   --si               no pide confirmaciones (modo desatendido)
#   --ayuda            muestra esta ayuda
#
# Es idempotente: lo que ya está instalado se salta. El detalle de cada comando
# queda en ~/curso-agentico/instalador.log. En Windows nativo usa instalar.ps1.
set -u

# ----------------------------------------------------------------------------
# Opciones
# ----------------------------------------------------------------------------
VERIFICAR=0; SIN_DOCKER=0; SIN_OPENPENCIL=0; SI=0
for arg in "$@"; do
  case "$arg" in
    --verificar) VERIFICAR=1 ;;
    --sin-docker) SIN_DOCKER=1 ;;
    --sin-openpencil) SIN_OPENPENCIL=1 ;;
    --si | --yes | -y) SI=1 ;;
    --ayuda | --help | -h) sed -n '2,19p' "$0" 2>/dev/null | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) printf 'error: opción desconocida: %s (prueba --ayuda)\n' "$arg" >&2; exit 2 ;;
  esac
done

# ----------------------------------------------------------------------------
# Salida y registro
# ----------------------------------------------------------------------------
CURSO_DIR="$HOME/curso-agentico"
mkdir -p "$CURSO_DIR"
LOG="$CURSO_DIR/instalador.log"
{ printf '\n===== %s · instalar.sh %s =====\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"; } >>"$LOG" 2>/dev/null || LOG=/dev/null

if [ -t 1 ]; then
  C_OK=$'\033[32m'; C_NO=$'\033[31m'; C_AV=$'\033[33m'; C_T=$'\033[1m'; C_0=$'\033[0m'
else
  C_OK=''; C_NO=''; C_AV=''; C_T=''; C_0=''
fi

say()   { printf '%s\n' "$*"; printf '%s\n' "$*" >>"$LOG"; }
avisa() { printf '%s  aviso: %s%s\n' "$C_AV" "$*" "$C_0"; printf 'aviso: %s\n' "$*" >>"$LOG"; }
die()   { printf '%serror: %s%s\n' "$C_NO" "$*" "$C_0" >&2; printf 'error: %s\n' "$*" >>"$LOG"; exit 1; }
paso()  { printf '\n%s[%s] %s%s\n' "$C_T" "$1" "$2" "$C_0"; printf '\n[%s] %s\n' "$1" "$2" >>"$LOG"; }
hecho() { printf '%s  ok: %s%s\n' "$C_OK" "$*" "$C_0"; printf 'ok: %s\n' "$*" >>"$LOG"; }
fallo() { printf '%s  fallo: %s%s\n' "$C_NO" "$*" "$C_0"; printf 'fallo: %s\n' "$*" >>"$LOG"; }
falta() { printf '%s  falta: %s%s\n' "$C_NO" "$*" "$C_0"; printf 'falta: %s\n' "$*" >>"$LOG"; }

# Ejecuta un comando mandando su salida al log. Devuelve su código de salida.
ejecutar() {
  printf '  $ %s\n' "$*"
  printf '$ %s\n' "$*" >>"$LOG"
  "$@" >>"$LOG" 2>&1
}
# Igual, pero con una cadena para el shell (tuberías, redirecciones).
ejecutar_sh() {
  printf '  $ %s\n' "$1"
  printf '$ %s\n' "$1" >>"$LOG"
  bash -c "$1" >>"$LOG" 2>&1
}
tiene() { command -v "$1" >/dev/null 2>&1; }

# Pregunta sí/no leyendo de la terminal (con `curl | bash` la entrada es el script).
preguntar() {
  [ "$SI" = 1 ] && return 0
  if [ -r /dev/tty ]; then
    printf '%s [S/n] ' "$1"
    read -r resp </dev/tty || resp=n
  else
    say "No hay terminal para preguntar; usa --si para el modo desatendido."
    return 1
  fi
  case "$resp" in '' | s | S | si | Si | SI | sí | Sí | y | Y) return 0 ;; *) return 1 ;; esac
}

# ----------------------------------------------------------------------------
# Sistema operativo
# ----------------------------------------------------------------------------
OS=$(uname -s); ARCH=$(uname -m)
SO=''; GESTOR=''; WSL=0
case "$OS" in
  Darwin) SO=macos ;;
  Linux)
    SO=linux
    if grep -qi microsoft /proc/version 2>/dev/null; then WSL=1; fi
    # shellcheck source=/dev/null
    if [ -r /etc/os-release ]; then . /etc/os-release; fi
    ID_LIKE_ALL="${ID:-} ${ID_LIKE:-}"
    case " $ID_LIKE_ALL " in
      *debian* | *ubuntu*) GESTOR=apt ;;
      *fedora* | *rhel* | *centos*) GESTOR=dnf ;;
      *) GESTOR='' ;;
    esac ;;
  MINGW* | MSYS* | CYGWIN*)
    die "en Windows nativo usa PowerShell: irm https://raw.githubusercontent.com/davrv93/jmd/main/instalador/instalar.ps1 | iex" ;;
  *) die "sistema no soportado: $OS" ;;
esac
case "$ARCH" in
  x86_64 | amd64) ARCH_OP=x64 ;;
  aarch64 | arm64) ARCH_OP=arm64 ;;
  *) ARCH_OP='' ;;
esac

# Rutas donde dejan binarios los instaladores que usamos; que la sesión las vea ya.
for d in "$HOME/.local/bin" "$HOME/.opencode/bin" /opt/homebrew/bin /usr/local/bin "$HOME/.npm-global/bin"; do
  case ":$PATH:" in *":$d:"*) ;; *) [ -d "$d" ] && PATH="$d:$PATH" ;; esac
done
export PATH

# sudo: en Linux se pide una sola vez al inicio (y solo si no somos root).
SUDO=''
if [ "$SO" = linux ] && [ "$(id -u)" != 0 ]; then
  tiene sudo || die "hace falta sudo para instalar paquetes del sistema (apt-get install sudo, como root)"
  SUDO=sudo
fi

# ----------------------------------------------------------------------------
# Tabla de resultados (bash 3.2 de macOS: sin arrays asociativos)
# ----------------------------------------------------------------------------
RESULTADOS=''
registrar() { # nombre estado version [obligatorio=1|0]
  RESULTADOS="$RESULTADOS$1|$2|$3|${4:-1}
"
}
# Estados: ok · falta · reinicio · omitido · pendiente · fallo

# ----------------------------------------------------------------------------
# Detectores de versión (cadena vacía si no está)
# ----------------------------------------------------------------------------
v_git()    { tiene git && git --version 2>/dev/null | sed 's/^git version //'; }
v_node()   { tiene node && node --version 2>/dev/null; }
v_npm()    { tiene npm && npm --version 2>/dev/null; }
v_python() {
  for p in python3.13 python3.12 python3.11 python3; do
    if tiene "$p"; then
      ver=$("$p" -c 'import sys; print("%d.%d.%d" % sys.version_info[:3])' 2>/dev/null) || continue
      case "$ver" in 3.1[1-9].* | 3.[2-9][0-9].*) printf '%s' "$ver"; return 0 ;; esac
    fi
  done
  return 1
}
v_docker() { tiene docker && docker --version 2>/dev/null | sed 's/^Docker version //; s/,.*//'; }
v_code() {
  if tiene code; then
    # Como root, `code --version` solo imprime una advertencia: nos quedamos con la línea numérica.
    ver=$(code --version 2>/dev/null | grep -m1 -E '^[0-9]+\.[0-9]+')
    [ -n "$ver" ] || ver=$(dpkg -s code 2>/dev/null | sed -n 's/^Version: //p')
    printf '%s' "${ver:-instalado}"
  elif [ "$SO" = macos ] && [ -d "/Applications/Visual Studio Code.app" ]; then
    defaults read "/Applications/Visual Studio Code.app/Contents/Info.plist" CFBundleShortVersionString 2>/dev/null || printf 'instalado'
  else return 1; fi
}
v_rg()       { tiene rg && rg --version 2>/dev/null | head -1 | sed 's/^ripgrep //; s/ .*//'; }
v_opencode() { tiene opencode && opencode --version 2>/dev/null | head -1 | sed 's/^opencode //'; }
v_rtk()      { tiene rtk && rtk --version 2>/dev/null | sed 's/^rtk //'; }
v_caveman()  { tiene caveman && caveman --version 2>/dev/null | grep -o '"version": *"[^"]*"' | head -1 | sed 's/.*: *"//; s/"//'; }
v_jmd()      { tiene jmd && jmd --version 2>/dev/null | head -1 | sed 's/^jmd //'; }
v_op()       { tiene op && op --version 2>/dev/null | head -1 | sed 's/^op //'; }
v_openpencil() {
  if [ "$SO" = macos ]; then
    [ -d /Applications/OpenPencil.app ] || return 1
    defaults read /Applications/OpenPencil.app/Contents/Info.plist CFBundleShortVersionString 2>/dev/null || printf 'instalado'
  else
    if tiene openpencil-desktop; then printf 'instalado'
    elif [ -x "$HOME/.local/bin/OpenPencil.AppImage" ]; then printf 'AppImage'
    elif dpkg -s openpencil >/dev/null 2>&1; then dpkg -s openpencil | sed -n 's/^Version: //p'
    else return 1; fi
  fi
}
v_claude() { tiene claude && claude --version 2>/dev/null | head -1 | sed 's/ .*//'; }
mcp_caveman_en_opencode() { grep -q 'caveman-mcp' "$HOME/.config/opencode/opencode.json" 2>/dev/null; }

# ----------------------------------------------------------------------------
# Homebrew (solo macOS)
# ----------------------------------------------------------------------------
asegurar_brew() {
  if tiene brew; then return 0; fi
  [ "$SO" = macos ] || return 1
  say "  Homebrew no está; se instala con el comando oficial (pedirá tu contraseña de macOS)."
  if [ "$SI" = 1 ]; then export NONINTERACTIVE=1; fi
  # shellcheck disable=SC2016  # el $(…) lo expande el bash hijo, a propósito
  ejecutar_sh '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"' || return 1
  for b in /opt/homebrew/bin/brew /usr/local/bin/brew; do
    if [ -x "$b" ]; then eval "$("$b" shellenv)"; break; fi
  done
  tiene brew
}
brew_tiene() { brew list "$1" >/dev/null 2>&1 || brew list --cask "$1" >/dev/null 2>&1; }

APT_ACTUALIZADO=0
apt_instalar() {
  if [ "$APT_ACTUALIZADO" = 0 ]; then ejecutar $SUDO apt-get update -q || return 1; APT_ACTUALIZADO=1; fi
  ejecutar $SUDO env DEBIAN_FRONTEND=noninteractive apt-get install -y -q "$@"
}
dnf_instalar() { ejecutar $SUDO dnf install -y -q "$@"; }

# Añade una ruta al PATH en el archivo de arranque del shell del usuario.
asegurar_en_path() {
  d="$1"
  case ":$PATH:" in *":$d:"*) return 0 ;; esac
  rc="$HOME/.profile"
  case "${SHELL:-}" in
    */zsh) rc="$HOME/.zshrc" ;;
    */bash) rc="$HOME/.bashrc" ;;
    */fish) rc="$HOME/.config/fish/config.fish" ;;
  esac
  mkdir -p "$(dirname "$rc")"
  if ! grep -qs "$d" "$rc" 2>/dev/null; then
    # shellcheck disable=SC2016  # $PATH debe quedar literal en el archivo de arranque
    case "$rc" in
      *fish*) printf '\nfish_add_path %s\n' "$d" >>"$rc" ;;
      *) printf '\n# curso agéntico\nexport PATH="%s:$PATH"\n' "$d" >>"$rc" ;;
    esac
    say "  Añadido $d al PATH en $rc (abre una terminal nueva para que lo tome)."
  fi
  PATH="$d:$PATH"; export PATH
}

# ----------------------------------------------------------------------------
# Pasos. Cada uno: detecta → instala si falta → registra estado y versión.
# ----------------------------------------------------------------------------
paso_git() {
  paso 1 "Git"
  if ver=$(v_git); then hecho "ya está: git $ver"; registrar git ok "$ver"; return; fi
  [ "$VERIFICAR" = 1 ] && { falta git; registrar git falta ''; return; }
  case "$SO:$GESTOR" in
    macos:*) asegurar_brew && ejecutar brew install git ;;
    linux:apt) apt_instalar git ;;
    linux:dnf) dnf_instalar git ;;
    *) fallo "no sé instalar git en esta distribución; hazlo con tu gestor de paquetes" ;;
  esac
  if ver=$(v_git); then hecho "git $ver"; registrar git ok "$ver"; else fallo "git no quedó instalado"; registrar git fallo ''; fi
}

node_apto() { # Node 20 o superior sirve; el objetivo es la LTS 22
  ver=$(v_node) || return 1
  case "$ver" in v2[0-9].* | v[3-9][0-9].*) return 0 ;; *) return 1 ;; esac
}
paso_node() {
  paso 2 "Node.js LTS (22.x)"
  if node_apto; then ver=$(v_node); hecho "ya está: node $ver (npm $(v_npm))"; registrar node ok "$ver"; return; fi
  if ver=$(v_node); then avisa "hay node $ver, muy antiguo: se instala la LTS 22"; fi
  [ "$VERIFICAR" = 1 ] && { falta "node 22 (LTS)"; registrar node falta "${ver:-}"; return; }
  case "$SO:$GESTOR" in
    macos:*)
      asegurar_brew && ejecutar brew install node@22 && ejecutar brew link --overwrite --force node@22 ;;
    linux:apt)
      ejecutar_sh "curl -fsSL https://deb.nodesource.com/setup_22.x | ${SUDO:+$SUDO -E }bash -" && apt_instalar nodejs ;;
    linux:dnf)
      dnf_instalar nodejs npm ;;
    *) fallo "no sé instalar Node en esta distribución: https://nodejs.org/en/download" ;;
  esac
  hash -r 2>/dev/null
  if node_apto; then ver=$(v_node); hecho "node $ver (npm $(v_npm))"; registrar node ok "$ver"
  else fallo "Node 22 no quedó instalado"; registrar node fallo "$(v_node)"; fi
}

paso_python() {
  paso 3 "Python 3.11 o superior"
  if ver=$(v_python); then
    if [ "$SO" = linux ] && [ "$GESTOR" = apt ] && ! python3 -c 'import ensurepip' >/dev/null 2>&1; then
      if [ "$VERIFICAR" = 1 ]; then avisa "falta python3-venv (no se pueden crear entornos virtuales)"; registrar python falta "$ver"; return; fi
      apt_instalar python3-venv python3-pip
    fi
    hecho "ya está: python $ver"; registrar python ok "$ver"; return
  fi
  if tiene python3; then avisa "hay python3 $(python3 --version 2>&1 | sed 's/Python //'), hace falta 3.11 o superior"; fi
  [ "$VERIFICAR" = 1 ] && { falta "python 3.11+"; registrar python falta ''; return; }
  case "$SO:$GESTOR" in
    macos:*) asegurar_brew && ejecutar brew install python@3.12 ;;
    linux:apt) apt_instalar python3 python3-venv python3-pip ;;
    linux:dnf) dnf_instalar python3 python3-pip ;;
    *) fallo "no sé instalar Python en esta distribución: https://www.python.org/downloads/" ;;
  esac
  hash -r 2>/dev/null
  if ver=$(v_python); then hecho "python $ver"; registrar python ok "$ver"
  else fallo "Python 3.11+ no quedó instalado"; registrar python fallo ''; fi
}

paso_docker() {
  paso 4 "Docker"
  if [ "$SIN_DOCKER" = 1 ]; then say "  omitido (--sin-docker)"; registrar docker omitido '' 0; return; fi
  if ver=$(v_docker); then hecho "ya está: docker $ver"; registrar docker ok "$ver"; return; fi
  if [ "$WSL" = 1 ]; then
    avisa "en WSL se usa el Docker Desktop de Windows: instálalo allí y activa Settings > Resources > WSL integration"
    registrar docker falta ''; return
  fi
  [ "$VERIFICAR" = 1 ] && { falta docker; registrar docker falta ''; return; }
  case "$SO" in
    macos)
      asegurar_brew && ejecutar brew install --cask docker
      if [ -d /Applications/Docker.app ]; then
        avisa "abre Docker Desktop una vez (Launchpad > Docker) y acepta los permisos; hasta entonces 'docker' no responde"
        registrar docker reinicio "$(v_docker)"
      else fallo "Docker Desktop no quedó instalado"; registrar docker fallo ''; fi ;;
    linux)
      say "  Se usa el script oficial https://get.docker.com (añade el repositorio de Docker e instala el motor)."
      if ejecutar_sh "curl -fsSL https://get.docker.com | $SUDO sh"; then
        if [ -n "$SUDO" ]; then ejecutar $SUDO usermod -aG docker "$USER"; fi
        avisa "cierra sesión y vuelve a entrar para usar docker sin sudo (grupo 'docker')"
        registrar docker reinicio "$(v_docker)"
      else fallo "el script de Docker falló (detalle en $LOG)"; registrar docker fallo ''; fi ;;
  esac
}

paso_code() {
  paso 5 "Visual Studio Code"
  if ver=$(v_code); then
    hecho "ya está: code $ver"
    if [ "$SO" = macos ] && ! tiene code; then avisa "el comando 'code' no está en el PATH: en VS Code, Cmd+Shift+P > 'Shell Command: Install code command in PATH'"; fi
    registrar code ok "$ver"; return
  fi
  if [ "$WSL" = 1 ]; then
    avisa "en WSL, VS Code se instala en Windows (instalar.ps1) y se abre desde aquí con 'code .'"
    registrar code falta ''; return
  fi
  [ "$VERIFICAR" = 1 ] && { falta "VS Code"; registrar code falta ''; return; }
  case "$SO:$GESTOR" in
    macos:*) asegurar_brew && ejecutar brew install --cask visual-studio-code ;;
    linux:apt)
      apt_instalar wget gpg apt-transport-https
      ejecutar_sh "curl -fsSL https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor | $SUDO tee /usr/share/keyrings/microsoft-vscode.gpg >/dev/null"
      ejecutar_sh "echo 'deb [arch=amd64,arm64,armhf signed-by=/usr/share/keyrings/microsoft-vscode.gpg] https://packages.microsoft.com/repos/code stable main' | $SUDO tee /etc/apt/sources.list.d/vscode.list >/dev/null"
      APT_ACTUALIZADO=0; apt_instalar code ;;
    linux:dnf)
      ejecutar_sh "$SUDO rpm --import https://packages.microsoft.com/keys/microsoft.asc"
      ejecutar_sh "printf '[code]\nname=Visual Studio Code\nbaseurl=https://packages.microsoft.com/yumrepos/vscode\nenabled=1\ngpgcheck=1\ngpgkey=https://packages.microsoft.com/keys/microsoft.asc\n' | $SUDO tee /etc/yum.repos.d/vscode.repo >/dev/null"
      dnf_instalar code ;;
    *) fallo "no sé instalar VS Code en esta distribución: https://code.visualstudio.com/download" ;;
  esac
  hash -r 2>/dev/null
  if ver=$(v_code); then hecho "code $ver"; registrar code ok "$ver"; else fallo "VS Code no quedó instalado"; registrar code fallo ''; fi
}

paso_rg() {
  paso 6 "ripgrep (rg)"
  if ver=$(v_rg); then hecho "ya está: rg $ver"; registrar ripgrep ok "$ver"; return; fi
  [ "$VERIFICAR" = 1 ] && { falta ripgrep; registrar ripgrep falta ''; return; }
  case "$SO:$GESTOR" in
    macos:*) asegurar_brew && ejecutar brew install ripgrep ;;
    linux:apt) apt_instalar ripgrep ;;
    linux:dnf) dnf_instalar ripgrep ;;
    *) fallo "no sé instalar ripgrep en esta distribución" ;;
  esac
  hash -r 2>/dev/null
  if ver=$(v_rg); then hecho "rg $ver"; registrar ripgrep ok "$ver"; else fallo "ripgrep no quedó instalado"; registrar ripgrep fallo ''; fi
}

paso_opencode() {
  paso 7 "OpenCode"
  if ver=$(v_opencode); then hecho "ya está: opencode $ver"; registrar opencode ok "$ver"; return; fi
  [ "$VERIFICAR" = 1 ] && { falta opencode; registrar opencode falta ''; return; }
  ejecutar_sh 'curl -fsSL https://opencode.ai/install | bash'
  asegurar_en_path "$HOME/.opencode/bin"
  hash -r 2>/dev/null
  if ver=$(v_opencode); then hecho "opencode $ver"; registrar opencode ok "$ver"; else fallo "OpenCode no quedó instalado"; registrar opencode fallo ''; fi
}

paso_rtk() {
  paso 8 "RTK (ahorro de tokens en las herramientas)"
  if ver=$(v_rtk); then hecho "ya está: rtk $ver"
  else
    [ "$VERIFICAR" = 1 ] && { falta rtk; registrar rtk falta ''; return; }
    case "$SO" in
      macos) asegurar_brew && ejecutar brew install rtk ;;
      linux) ejecutar_sh 'curl -fsSL https://raw.githubusercontent.com/rtk-ai/rtk/refs/heads/master/install.sh | sh'; asegurar_en_path "$HOME/.local/bin" ;;
    esac
    hash -r 2>/dev/null
    if ver=$(v_rtk); then hecho "rtk $ver"; else fallo "RTK no quedó instalado"; registrar rtk fallo ''; return; fi
  fi
  if [ "$VERIFICAR" = 0 ]; then
    # Hooks para Claude Code y el plugin de OpenCode, sin preguntar (banderas comprobadas en rtk 0.49).
    if ejecutar rtk init -g --opencode --auto-patch; then hecho "hooks de rtk activados (rtk init -g --opencode --auto-patch)"
    else avisa "rtk init devolvió error; ejecútalo a mano: rtk init -g --opencode --auto-patch"; fi
  fi
  registrar rtk ok "$ver"
}

paso_caveman() {
  paso 9 "caveman (compresión de contexto) y su MCP"
  if ! node_apto && [ "$VERIFICAR" = 0 ]; then fallo "sin Node 22 no se puede instalar caveman"; registrar caveman fallo ''; registrar caveman-mcp falta '' 0; return; fi
  if ver=$(v_caveman); then hecho "ya está: caveman $ver"
  else
    [ "$VERIFICAR" = 1 ] && { falta caveman; registrar caveman falta ''; registrar caveman-mcp falta '' 0; return; }
    ejecutar npm install -g @caveman-ai/cli
    hash -r 2>/dev/null
    if ver=$(v_caveman); then hecho "caveman $ver"; else fallo "caveman no quedó instalado (npm install -g @caveman-ai/cli)"; registrar caveman fallo ''; registrar caveman-mcp falta '' 0; return; fi
  fi
  if [ "$VERIFICAR" = 0 ]; then
    ejecutar caveman setup --install || avisa "caveman setup --install devolvió error (detalle en $LOG)"
    # Skill global (SKILL.md) para OpenCode / Claude Code y demás agentes detectados.
    ejecutar_sh 'npx -y skills add JuliusBrussee/caveman -g -y </dev/null' || avisa "no se pudo añadir la skill: npx skills add JuliusBrussee/caveman -g"
    # Servidor MCP (mcp/README.md del repo): se arranca con `npx -y caveman-mcp`.
    registrar_mcp_caveman_opencode
    if tiene claude; then
      if claude mcp get caveman >/dev/null 2>&1; then hecho "MCP caveman ya registrado en Claude Code"
      else ejecutar claude mcp add --scope user caveman -- npx -y caveman-mcp && hecho "MCP caveman registrado en Claude Code"; fi
    fi
  fi
  registrar caveman ok "$ver"
  if mcp_caveman_en_opencode; then registrar caveman-mcp ok 'npx -y caveman-mcp' 0; else registrar caveman-mcp falta '' 0; fi
}

# Funde la entrada en ~/.config/opencode/opencode.json sin pisar lo demás (formato de
# https://opencode.ai/docs/mcp-servers: type local + command como lista).
registrar_mcp_caveman_opencode() {
  if mcp_caveman_en_opencode; then hecho "MCP caveman ya registrado en OpenCode"; return; fi
  cfg="$HOME/.config/opencode/opencode.json"
  mkdir -p "$(dirname "$cfg")"
  # shellcheck disable=SC2016  # "$schema" es una clave JSON literal
  [ -f "$cfg" ] || printf '{\n  "$schema": "https://opencode.ai/config.json"\n}\n' >"$cfg"
  if node -e '
    const fs = require("fs"); const f = process.argv[1];
    let c; try { c = JSON.parse(fs.readFileSync(f, "utf8")); } catch (e) { console.error("opencode.json no es JSON válido"); process.exit(1); }
    c.mcp = c.mcp || {};
    c.mcp.caveman = { type: "local", command: ["npx", "-y", "caveman-mcp"], enabled: true };
    fs.writeFileSync(f, JSON.stringify(c, null, 2) + "\n");
  ' "$cfg" >>"$LOG" 2>&1; then hecho "MCP caveman registrado en OpenCode ($cfg)"
  else avisa "no se pudo editar $cfg (¿tiene comentarios?). Añade a mano la sección mcp.caveman del README."; fi
}

paso_openpencil() {
  paso 10 "OpenPencil (diseño con agentes) y su CLI op"
  if [ "$SIN_OPENPENCIL" = 1 ]; then say "  omitido (--sin-openpencil)"; registrar openpencil omitido '' 0; registrar op omitido '' 0; return; fi
  if ver=$(v_openpencil); then hecho "ya está: OpenPencil $ver"; registrar openpencil ok "$ver" 0
  elif [ "$VERIFICAR" = 1 ]; then falta "OpenPencil (opcional)"; registrar openpencil falta '' 0
  else
    case "$SO:$GESTOR" in
      macos:*)
        asegurar_brew && ejecutar brew tap zseven-w/openpencil && ejecutar brew install --cask openpencil ;;
      linux:*)
        instalar_openpencil_linux ;;
    esac
    if ver=$(v_openpencil); then hecho "OpenPencil $ver"; registrar openpencil ok "$ver" 0
    else fallo "OpenPencil no quedó instalado (opcional): https://github.com/ZSeven-W/openpencil/releases"; registrar openpencil fallo '' 0; fi
  fi
  if ver=$(v_op); then hecho "ya está: op $ver"; registrar op ok "$ver" 0
  elif [ "$VERIFICAR" = 1 ]; then falta "op (opcional)"; registrar op falta '' 0
  else
    ejecutar_sh 'curl -fsSL https://raw.githubusercontent.com/ZSeven-W/openpencil/main/scripts/install-op.sh | bash'
    asegurar_en_path "$HOME/.local/bin"; hash -r 2>/dev/null
    if ver=$(v_op); then hecho "op $ver"; registrar op ok "$ver" 0; else fallo "la CLI op no quedó instalada (opcional)"; registrar op fallo '' 0; fi
  fi
  if [ "$VERIFICAR" = 0 ]; then
    avisa "el MCP de OpenPencil se activa desde la propia app (ajustes del agente > MCP): el puerto lo elige la app. Ver README."
  fi
}

# Última versión publicada (las de OpenPencil son pre-releases, así que /releases/latest no sirve).
instalar_openpencil_linux() {
  [ -n "$ARCH_OP" ] || { fallo "arquitectura $ARCH sin paquete de OpenPencil"; return 1; }
  json=$(curl -fsSL "https://api.github.com/repos/ZSeven-W/openpencil/releases?per_page=1") || { fallo "no se pudo consultar GitHub Releases"; return 1; }
  tag=$(printf '%s' "$json" | grep -o '"tag_name": *"[^"]*"' | head -1 | sed 's/.*"\(v[^"]*\)"/\1/')
  ver="${tag#v}"
  [ -n "$ver" ] || { fallo "no se pudo leer la versión de OpenPencil"; return 1; }
  base="https://github.com/ZSeven-W/openpencil/releases/download/$tag"
  tmp=$(mktemp -d 2>/dev/null || mktemp -d -t curso)
  if [ "$GESTOR" = apt ]; then
    f="OpenPencil-$ver-$ARCH_OP-linux.deb"
    say "  Descargando $f…"
    ejecutar curl -fsSL --retry 3 -o "$tmp/$f" "$base/$f" || { rm -rf "$tmp"; return 1; }
    APT_ACTUALIZADO=1
    ejecutar_sh "$SUDO env DEBIAN_FRONTEND=noninteractive apt-get install -y -q '$tmp/$f'" || ejecutar $SUDO dpkg -i "$tmp/$f"
  else
    f="OpenPencil-$ver-$ARCH_OP-linux.AppImage"
    say "  Descargando $f (AppImage) a ~/.local/bin…"
    mkdir -p "$HOME/.local/bin"
    ejecutar curl -fsSL --retry 3 -o "$HOME/.local/bin/OpenPencil.AppImage" "$base/$f" || { rm -rf "$tmp"; return 1; }
    chmod +x "$HOME/.local/bin/OpenPencil.AppImage"
    asegurar_en_path "$HOME/.local/bin"
    avisa "las AppImage necesitan libfuse2 (apt: libfuse2 / dnf: fuse-libs); se abre con OpenPencil.AppImage"
  fi
  rm -rf "$tmp"
}

paso_jmd() {
  paso 11 "jmd (CLI del curso, sin gateway)"
  if ver=$(v_jmd); then hecho "ya está: jmd $ver"; registrar jmd ok "$ver"; return; fi
  [ "$VERIFICAR" = 1 ] && { falta jmd; registrar jmd falta ''; return; }
  ejecutar_sh 'curl -fsSL https://raw.githubusercontent.com/davrv93/jmd/main/install.sh | JMD_NO_INIT=1 JMD_WITH_GATEWAY=0 sh'
  asegurar_en_path "$HOME/.local/bin"; hash -r 2>/dev/null
  if ver=$(v_jmd); then hecho "jmd $ver"; registrar jmd ok "$ver"; else fallo "jmd no quedó instalado"; registrar jmd fallo ''; fi
}

paso_carpeta() {
  paso 12 "Carpeta de trabajo ~/curso-agentico"
  [ "$VERIFICAR" = 1 ] && { say "  (no se toca en modo --verificar)"; return; }
  if [ ! -f "$CURSO_DIR/AGENTS.md" ]; then
    cat >"$CURSO_DIR/AGENTS.md" <<'EOF'
# AGENTS.md
- Responde siempre en español.
- Respuestas cortas: primero el cambio, después la explicación si hace falta.
- Pregunta antes de borrar archivos o ejecutar comandos destructivos.
EOF
    hecho "creado $CURSO_DIR/AGENTS.md"
  else hecho "ya existe $CURSO_DIR/AGENTS.md"; fi
  if [ ! -f "$CURSO_DIR/opencode.json" ]; then
    cat >"$CURSO_DIR/opencode.json" <<'EOF'
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "clase": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "Gateway de la clase",
      "options": {
        "baseURL": "PON_AQUI_LA_URL_DEL_GATEWAY",
        "apiKey": "{env:GATEWAY_API_KEY}"
      },
      "models": { "auto": { "name": "auto" } }
    }
  },
  "model": "clase/auto"
}
EOF
    hecho "creado $CURSO_DIR/opencode.json (plantilla)"
  else hecho "ya existe $CURSO_DIR/opencode.json"; fi
  avisa "opencode.json necesita la URL del gateway (baseURL, termina en /v1) y la clave que da el instructor: export GATEWAY_API_KEY=\"...\""
}

# ----------------------------------------------------------------------------
# Resumen
# ----------------------------------------------------------------------------
resumen() {
  say ""
  say "${C_T}Resumen${C_0}"
  printf '  %-24s %-18s %s\n' "Herramienta" "Estado" "Versión"
  printf '  %-24s %-18s %s\n' "-----------" "------" "-------"
  printf '%s' "$RESULTADOS" | while IFS='|' read -r n e v o; do
    [ -n "$n" ] || continue
    case "$e" in
      ok) et="ok"; col="$C_OK" ;;
      reinicio) et="requiere reinicio"; col="$C_AV" ;;
      omitido) et="omitido"; col='' ;;
      falta) et="falta"; col="$C_NO" ;;
      fallo) et="fallo"; col="$C_NO" ;;
      *) et="$e"; col='' ;;
    esac
    [ "$o" = 0 ] && n="$n (opcional)"
    printf '  %-24s %s%-18s%s %s\n' "$n" "$col" "$et" "$C_0" "$v"
    printf '%-24s %-18s %s\n' "$n" "$e" "$v" >>"$LOG"
  done
  faltan=$(printf '%s' "$RESULTADOS" | awk -F'|' '$4==1 && ($2=="falta" || $2=="fallo") {n++} END {print n+0}')
  reinicios=$(printf '%s' "$RESULTADOS" | awk -F'|' '$2=="reinicio" {n++} END {print n+0}')
  say ""
  if [ "$faltan" = 0 ]; then
    if [ "$VERIFICAR" = 1 ]; then say "${C_OK}Todo lo obligatorio está instalado.${C_0}"
    else say "${C_OK}Listo. Abre una terminal nueva para que el PATH se actualice.${C_0}"; fi
    [ "$reinicios" -gt 0 ] && say "${C_AV}Hay pasos que requieren abrir una app o cerrar sesión: revisa los avisos de arriba.${C_0}"
    say "Registro: $LOG"
    return 0
  fi
  if [ "$VERIFICAR" = 1 ]; then say "${C_NO}Faltan $faltan herramientas obligatorias.${C_0} Para instalarlas: bash instalar.sh"
  else say "${C_NO}Faltan $faltan herramientas obligatorias.${C_0} Revisa los fallos arriba y el registro: $LOG"; fi
  return 1
}

# ----------------------------------------------------------------------------
# Programa principal
# ----------------------------------------------------------------------------
say "${C_T}Prerrequisitos del curso «Programación agéntica»${C_0}"
if [ "$SO" = macos ]; then say "Sistema: macOS ($ARCH)"
elif [ "$WSL" = 1 ]; then say "Sistema: WSL · ${PRETTY_NAME:-Linux} ($ARCH)"
else say "Sistema: ${PRETTY_NAME:-Linux} ($ARCH) · gestor: ${GESTOR:-desconocido}"; fi
if [ "$SO" = linux ] && [ -z "$GESTOR" ]; then avisa "distribución sin apt ni dnf: varios pasos se saltarán con aviso"; fi

if [ "$VERIFICAR" = 1 ]; then
  say "Modo --verificar: solo se comprueba, no se instala nada."
else
  say ""
  say "Se va a instalar (lo que ya esté se salta):"
  say "  1. Git            2. Node.js LTS 22    3. Python 3.11+"
  if [ "$SIN_DOCKER" = 0 ]; then say "  4. Docker"; else say "  4. Docker (omitido)"; fi
  say "  5. VS Code        6. ripgrep           7. OpenCode"
  say "  8. RTK            9. caveman + MCP"
  if [ "$SIN_OPENPENCIL" = 0 ]; then say " 10. OpenPencil + CLI op"; else say " 10. OpenPencil (omitido)"; fi
  say " 11. jmd          12. carpeta ~/curso-agentico (AGENTS.md y opencode.json)"
  if [ "$SO" = macos ]; then say "En macOS se usa Homebrew (se instala si falta; pedirá tu contraseña)."; fi
  if [ -n "$SUDO" ]; then say "En Linux los paquetes del sistema se instalan con sudo: se pide la contraseña una sola vez ahora."; fi
  say "Registro detallado: $LOG"
  say ""
  preguntar "¿Continuar?" || { say "Cancelado."; exit 1; }
  if [ -n "$SUDO" ]; then sudo -v || die "sin sudo no se pueden instalar paquetes del sistema"; fi
fi

paso_git
paso_node
paso_python
paso_docker
paso_code
paso_rg
paso_opencode
paso_rtk
paso_caveman
paso_openpencil
paso_jmd
paso_carpeta
if tiene claude; then registrar claude-code ok "$(v_claude)" 0; fi

resumen
