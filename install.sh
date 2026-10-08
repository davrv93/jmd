#!/bin/sh
# Instalador de jmd para macOS, Linux y WSL.
#
#   curl -fsSL https://raw.githubusercontent.com/davrv93/jmd/main/install.sh | sh
#
# Variables opcionales:
#   JMD_VERSION=v0.2.0        versión concreta (por defecto, la última publicada)
#   JMD_INSTALL_DIR=~/bin     dónde dejar el binario (por defecto ~/.local/bin)
#   JMD_WITH_GATEWAY=0        no instalar el gateway (ai-orchestrator); por defecto se instala
#   JMD_NO_INIT=1             no lanzar el asistente `jmd init` al terminar
#   JMD_ARCHIVE=ruta.tar.gz   instala desde un archivo local (sin descargar)
#   JMD_DOWNLOAD_BASE=URL     espejo de descarga (por defecto, GitHub Releases)
set -eu

REPO="${JMD_REPO:-davrv93/jmd}"
VERSION="${JMD_VERSION:-latest}"
DIR="${JMD_INSTALL_DIR:-$HOME/.local/bin}"

say() { printf '%s\n' "$*"; }
die() { printf 'error: %s\n' "$*" >&2; exit 1; }

os=$(uname -s)
arch=$(uname -m)
case "$os" in
  Linux)
    case "$arch" in
      x86_64 | amd64) target=x86_64-unknown-linux-musl ;;
      aarch64 | arm64) target=aarch64-unknown-linux-musl ;;
      *) die "arquitectura no soportada: $arch" ;;
    esac ;;
  Darwin) target=universal-apple-darwin ;;
  MINGW* | MSYS* | CYGWIN*) die "en Windows usa PowerShell: irm https://raw.githubusercontent.com/$REPO/main/install.ps1 | iex" ;;
  *) die "sistema no soportado: $os" ;;
esac

asset="jmd-$target.tar.gz"
if [ -n "${JMD_DOWNLOAD_BASE:-}" ]; then
  base="$JMD_DOWNLOAD_BASE"
elif [ "$VERSION" = latest ]; then
  base="https://github.com/$REPO/releases/latest/download"
else
  base="https://github.com/$REPO/releases/download/$VERSION"
fi

download() { # url destino
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL --retry 3 -o "$2" "$1"
  elif command -v wget >/dev/null 2>&1; then
    wget -q -O "$2" "$1"
  else
    die "hace falta curl o wget"
  fi
}

sha256() {
  if command -v sha256sum >/dev/null 2>&1; then sha256sum "$1" | cut -d' ' -f1
  else shasum -a 256 "$1" | cut -d' ' -f1
  fi
}

tmp=$(mktemp -d 2>/dev/null || mktemp -d -t jmd)
trap 'rm -rf "$tmp"' EXIT INT TERM

if [ -n "${JMD_ARCHIVE:-}" ]; then
  [ -f "$JMD_ARCHIVE" ] || die "no existe $JMD_ARCHIVE"
  cp "$JMD_ARCHIVE" "$tmp/$asset"
else
  say "Descargando $asset ($VERSION)…"
  download "$base/$asset" "$tmp/$asset" || die "no se pudo descargar $base/$asset"
  download "$base/SHA256SUMS" "$tmp/SHA256SUMS" || die "no se pudo descargar SHA256SUMS"
  expected=$(grep " $asset\$" "$tmp/SHA256SUMS" | cut -d' ' -f1)
  [ -n "$expected" ] || die "$asset no figura en SHA256SUMS"
  [ "$(sha256 "$tmp/$asset")" = "$expected" ] || die "la suma SHA-256 no coincide: descarga corrupta"
fi

mkdir -p "$tmp/x" "$DIR"
tar -xzf "$tmp/$asset" -C "$tmp/x"
install_bin() {
  [ -f "$tmp/x/$1" ] || die "el paquete no trae $1"
  cp "$tmp/x/$1" "$DIR/$1.new"
  chmod 755 "$DIR/$1.new"
  mv -f "$DIR/$1.new" "$DIR/$1"
  # macOS: quitar la cuarentena si el archivo vino del navegador.
  if [ "$os" = Darwin ]; then xattr -d com.apple.quarantine "$DIR/$1" 2>/dev/null || true; fi
  say "✓ $DIR/$1"
}
install_bin jmd
if [ "${JMD_WITH_GATEWAY:-1}" != 0 ]; then install_bin ai-orchestrator; fi

"$DIR/jmd" --version

case ":$PATH:" in
  *":$DIR:"*) ;;
  *)
    rc="$HOME/.profile"
    case "${SHELL:-}" in
      */zsh) rc="$HOME/.zshrc" ;;
      */bash) rc="$HOME/.bashrc" ;;
      */fish) rc="$HOME/.config/fish/config.fish" ;;
    esac
    say ""
    say "$DIR no está en tu PATH. Añádelo y abre una terminal nueva:"
    case "$rc" in
      *fish*) say "  fish_add_path $DIR" ;;
      *) say "  echo 'export PATH=\"$DIR:\$PATH\"' >> $rc" ;;
    esac ;;
esac

# Asistente: solo con una terminal de verdad (con `curl | sh` la entrada es el script,
# así que se lee de /dev/tty). Si ya estaba configurado es una actualización: no pregunta.
say ""
if "$DIR/jmd" gateway status --json 2>/dev/null | grep -q '"running": true'; then
  "$DIR/jmd" gateway restart
  say "Actualizado. Todo sigue configurado: jmd status"
elif [ -f "${XDG_CONFIG_HOME:-$HOME/.config}/jmd/config.json" ]; then
  say "Actualizado. Ya estaba configurado: jmd status  (para cambiar algo: jmd init)"
elif [ "${JMD_NO_INIT:-0}" != 1 ] && [ -t 1 ] && (: < /dev/tty) 2>/dev/null; then
  "$DIR/jmd" init < /dev/tty || say "Puedes repetirlo cuando quieras: jmd init"
else
  say "Siguiente paso: jmd init   (monta el gateway en esta máquina o conéctate a uno)"
fi
