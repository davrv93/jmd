#!/usr/bin/env bash
# Instala la protección anti-scraping en el nginx de jmd-learn.online y la recarga (sin reiniciar nada).
# Uso: LLAVE=~/Downloads/curdilmer.pem ~/Documents/jmd/infra/proteger-jmd/aplicar.sh
# Deshacer: el script deja copia en /tmp/jmd-learn.antes-antiscraping-<fecha> y la indica al final.
set -euo pipefail
cd "$(dirname "$0")"
LLAVE=${LLAVE:-$HOME/Downloads/curdilmer.pem}
H=ubuntu@3.151.56.55
scp -q -i "$LLAVE" jmd-antiscraping.conf jmd-antiscraping-server.conf $H:/tmp/
ssh -i "$LLAVE" $H bash -s <<'REMOTO'
set -euo pipefail
ts=$(date +%Y%m%d-%H%M%S)
sudo cp -p /etc/nginx/sites-enabled/jmd-learn /tmp/jmd-learn.antes-antiscraping-$ts
sudo install -m 644 /tmp/jmd-antiscraping.conf /etc/nginx/conf.d/jmd-antiscraping.conf
sudo install -m 644 /tmp/jmd-antiscraping-server.conf /etc/nginx/snippets/jmd-antiscraping-server.conf
sudo python3 - <<'PY'
from pathlib import Path
p = Path('/etc/nginx/sites-enabled/jmd-learn'); assert p.is_file() and not p.is_symlink()
s = p.read_text()
raiz = """    location / {
        proxy_pass http://127.0.0.1:8080;
"""
assert s.count(raiz) == 1, "no encontré location / del LMS"
if 'jmd-antiscraping-server.conf' not in s:
    s = s.replace(raiz, "    include /etc/nginx/snippets/jmd-antiscraping-server.conf;\n" + raiz.replace(
        "        proxy_pass http://127.0.0.1:8080;\n",
        "        if ($jmd_bot) { return 403; }\n        limit_req zone=jmd_web burst=200 nodelay;\n        proxy_pass http://127.0.0.1:8080;\n"), 1)
    # El LMS confía en X-Forwarded-For: que nginx lo fije con la IP real y no lo herede del cliente.
    i = s.index("    location / {"); j = s.index("    }", i)
    bloque = s[i:j].replace("proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;", "proxy_set_header X-Forwarded-For $remote_addr;")
    s = s[:i] + bloque + s[j:]
    p.write_text(s)
    print("jmd-learn actualizado")
else:
    print("ya estaba aplicado")
PY
if sudo nginx -t 2>/tmp/nginx-t.log; then
  sudo systemctl reload nginx && echo "nginx recargado"
else
  cat /tmp/nginx-t.log; echo "nginx -t falló: restauro la copia"
  sudo cp -p /tmp/jmd-learn.antes-antiscraping-$ts /etc/nginx/sites-enabled/jmd-learn
  sudo rm -f /etc/nginx/conf.d/jmd-antiscraping.conf
  sudo nginx -t && sudo systemctl reload nginx; exit 1
fi
echo "copia: /tmp/jmd-learn.antes-antiscraping-$ts"
for ua in "Mozilla/5.0" "python-requests/2.32" "GPTBot/1.1"; do
  printf '%-22s %s\n' "$ua" "$(curl -s -o /dev/null -w '%{http_code}' -A "$ua" https://jmd-learn.online/)"
done
printf '%-22s %s\n' "robots.txt" "$(curl -s https://jmd-learn.online/robots.txt | head -1)"
printf '%-22s %s\n' "scraping-lab (python)" "$(curl -s -o /dev/null -w '%{http_code}' -A python-httpx/0.27 https://jmd-learn.online/scraping-lab/)"
REMOTO
