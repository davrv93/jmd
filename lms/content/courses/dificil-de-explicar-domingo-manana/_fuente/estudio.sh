#!/usr/bin/env bash
# Publica la escena «Estudio de diseño» (10b) en dm-01 y dt-01 y copia sus fuentes (todas de Google Fonts, licencia OFL)
# a _comun de los dos cursos. Las fuentes salen de los estilos de landing del aula y de OpenMontage.
# Uso: bash _fuente/estudio.sh   (desde el curso de la mañana o desde cualquier lado)
set -euo pipefail
AQUI="$(cd "$(dirname "$0")" && pwd)"
CURSOS="$(cd "$AQUI/../.." && pwd)"
EST="$HOME/Documents/jmd/lms/aula/skills-curso/s1-landing-estilos/motor/estilos"
OM="$HOME/Downloads/OpenMontage/remotion-composer/src/fonts"
declare -a FUENTES=(
  "$EST/inmersivo/recursos/fuente-fraunces-300_600.woff2:fuente-fraunces-300_600.woff2"
  "$EST/inmersivo/recursos/fuente-fraunces-300_600-italica.woff2:fuente-fraunces-300_600-italica.woff2"
  "$OM/PlayfairDisplay-latin.woff2:fuente-playfair.woff2"
  "$OM/PlayfairDisplay-Italic-latin.woff2:fuente-playfair-italica.woff2"
  "$EST/dificil/recursos/fuente-instrument-serif-400.woff2:fuente-instrument-serif-400.woff2"
  "$EST/dificil/recursos/fuente-instrument-serif-400-italica.woff2:fuente-instrument-serif-400-italica.woff2"
  "$EST/gta6/recursos/fuente-anton-400.woff2:fuente-anton-400.woff2"
  "$EST/gta6/recursos/fuente-barlow-condensed-700.woff2:fuente-barlow-condensed-700.woff2"
  "$EST/dificil/recursos/fuente-archivo-black-400.woff2:fuente-archivo-black-400.woff2"
  "$OM/SpaceGrotesk-latin.woff2:fuente-space-grotesk.woff2"
  "$EST/nova5t/recursos/fuente-sora-400.woff2:fuente-sora-400.woff2"
  "$EST/huawei/recursos/fuente-outfit-200.woff2:fuente-outfit-200.woff2"
  "$EST/dificil/recursos/fuente-ibm-plex-mono-500.woff2:fuente-ibm-plex-mono-500.woff2"
  "$EST/inmersivo/recursos/fuente-inter-400.woff2:fuente-inter-400.woff2"
)
for curso in dificil-de-explicar-domingo-manana:dm-01 dificil-de-explicar-domingo-tarde:dt-01; do
  c="${curso%%:*}"; l="${curso##*:}"
  for f in "${FUENTES[@]}"; do cp "${f%%:*}" "$CURSOS/$c/live/_comun/${f##*:}"; done
  d="$CURSOS/$c/live/$l/10b-estudio-de-diseno"; mkdir -p "$d"
  cp "$AQUI/estudio.html" "$d/escena.html"
  cat > "$d/escena.yaml" <<'YAML'
id: 10b-estudio-de-diseno
titulo: "Estudio: reglas, recorte y tipografía"
fase: "experimentacion"
paso: "aplicar"
duracion_min: 15
lo_logre: true
evidencia: "captura"
umbral_pct: 60
compuerta: "lo_logre"
oculta: false
YAML
  echo "ok $c/$l"
done
