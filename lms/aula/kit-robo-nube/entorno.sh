# Uso:  . ./entorno.sh   (con el punto, en la terminal donde vas a abrir tu agente; en Windows usa entorno.ps1)
AQUI="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
export PYTHONUTF8=1
export JMD_SKILLS="$AQUI/skills"                  # jmd ve las skills s2-robo-*
export OSITO_TOKEN="local"                        # Robo lo manda al aula local; tu token real lo pone el aula
export JMD_URL_AULA="http://127.0.0.1:8800"
export IMAGEN_URL="http://127.0.0.1:8800/imagen"  # imagen (solo «maxima») y voz Piper
export STT_URL="http://127.0.0.1:8800/stt"        # dictado por servidor
# Tu agente también puede hablar con el gateway del curso a través del aula (sin claves de proveedor):
#   jmd: JMD_URL y JMD_API_KEY (abajo, solo si no los tenías) · OpenCode/otros OpenAI: OPENAI_BASE_URL
[ -z "$JMD_URL" ] && export JMD_URL="http://127.0.0.1:8800"
[ -z "$JMD_API_KEY" ] && export JMD_API_KEY="local"
# Python: el incluido con JMDesign (ya trae los paquetes) si está; si no, el .venv de iniciar.sh.
_jpy="${JMDESIGN_PYTHON:-}"
for _f in "$HOME/Library/Application Support/com.jmdesign.studio/python.txt" "${XDG_CONFIG_HOME:-$HOME/.config}/com.jmdesign.studio/python.txt"; do
  [ -z "$_jpy" ] && [ -f "$_f" ] && _jpy="$(head -n 1 "$_f")"
done
if [ -n "$_jpy" ] && [ -x "$_jpy" ]; then
  export PATH="$(dirname "$_jpy"):$PATH"   # python y python3 son el de JMDesign
  echo "Python incluido con JMDesign: $_jpy"
elif [ -f "$AQUI/.venv/bin/activate" ]; then . "$AQUI/.venv/bin/activate"; elif [ -f "$AQUI/.venv/Scripts/activate" ]; then . "$AQUI/.venv/Scripts/activate"; fi
unset _jpy _f
cd "$AQUI" && echo "Listo. Estás en $AQUI. Abre tu agente y pega el prompt de trabajo/plan-robo/PROMPT_ARMAR_ROBO.md"
