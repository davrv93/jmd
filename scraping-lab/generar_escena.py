"""Genera la escena LIVE ws-01/10b-laboratorio a partir de escena/escena.plantilla.html y del kit.

    python3 ~/Documents/jmd/scraping-lab/generar_escena.py

{{KIT:archivo}}    → <pre> con «cat > archivo <<'EOF' … EOF» (se pega tal cual en la Terminal)
{{KIT_JS:archivo}} → <pre> con el contenido solo (para pegar en Tampermonkey)
"""
import html
import re
from pathlib import Path

AQUI = Path(__file__).resolve().parent
DESTINO = Path.home() / "Documents/jmd/lms/content/courses/web-scraping-etico/live/ws-01/10b-laboratorio/escena.html"


def kit(nombre):
    texto = (AQUI / "kit" / nombre).read_text(encoding="utf-8").rstrip("\n")
    assert "\nEOF\n" not in texto
    return texto


def heredoc(m):
    n = m.group(1)
    cab = html.escape("cat > " + n + " <<'EOF'", quote=False)
    return '<pre class="esc-cmd p-script"><span class="p">$ </span>' + cab + "\n" + html.escape(kit(n), quote=False) + "\nEOF</pre>"


def solo(m):
    return f'<pre class="esc-cmd p-script">{html.escape(kit(m.group(1)), quote=False)}</pre>'


s = (AQUI / "escena" / "escena.plantilla.html").read_text(encoding="utf-8")
s = re.sub(r"\{\{KIT:([\w.]+)\}\}", heredoc, s)
s = re.sub(r"\{\{KIT_JS:([\w.]+)\}\}", solo, s)
assert "{{" not in s
DESTINO.parent.mkdir(parents=True, exist_ok=True)
DESTINO.write_text(s, encoding="utf-8")
print(f"escena escrita: {DESTINO} ({len(s)} bytes)")
