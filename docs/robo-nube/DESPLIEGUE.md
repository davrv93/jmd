# Despliegue de la nube del kit robo-local-nube (EC2 3.151.56.55, jmd-learn.online)

> **Nada de esto se ha ejecutado en el servidor.** Requiere la aprobación del usuario. Todo lo de abajo está probado en local en el Mac con los mismos archivos: nginx 1.29 con el mismo snippet, el binario real del gateway, el servicio STT, el de imagen sin torch y Keycloak/Cloudflare simulados.

## Qué se publica

| Ruta pública | Va a | Quién entra |
|---|---|---|
| `/aula-nube/v1/{chat/completions, messages, messages/count_tokens, models, auth/me, auth/exchange, auth/token}` | gateway `127.0.0.1:4000` | token personal `jg_…` del alumno; `auth/exchange` con un access token de Keycloak (aud `ai-gateway`) |
| `/aula-nube/imagen/{salud, generar, voz}` | imagen `127.0.0.1:18600` (puerto nuevo, solo loopback) | `auth_request` contra `/v1/auth/me`; además nginx pone `X-Aula-Nube: 1` y el servicio solo deja «maxima» y la voz |
| `/aula-nube/stt`, `/aula-nube/stt/salud` | stt `127.0.0.1:18610` (servicio nuevo) | igual que imagen |
| cualquier otra `/aula-nube/...` | 404 JSON (no cae al LMS) | — |

Las aulas del LMS **no cambian**: siguen hablando con `imagen:8000` y `ai-orchestrator:4000` por la red interna con el token de la clase. Ahora también pueden usar `http://stt:8000/stt`.

## Archivos (en `~/Documents/jmd`, sin commit)

- `lms/stt/` (nuevo): `app.py`, `nube.py`, `Dockerfile`, `requirements.txt`, `test_app.py`.
- `lms/imagen/`: `app.py` (reglas de la nube, `IMAGEN_LOCAL`, `CF_API_BASE`, `IMAGEN_VOCES`, cupo agotado), `nube.py` (nuevo, igual al de stt), `test_app.py` (nuevo), `Dockerfile` (copia `nube.py`), `Dockerfile.parche` (nuevo).
- `lms/nginx/aula-nube.conf` y `lms/nginx/aula-nube-zonas.conf` (nuevos).
- `compose.yaml`: puerto `127.0.0.1:18600` y variables nuevas en `imagen`; servicio `stt` (perfil `stt`) y volumen `stt_modelos`.
- `lms/content/courses/programacion-agentica*/live/_comun/avatar.js`: `montarAvatar` acepta `{tipo, color}` (compatible con las llamadas de siempre). **Ojo**: `lms/content` está montado en el contenedor del LMS, así que un `git pull` lo publica al instante a todos los cursos.
- `lms/aula/kit-robo-nube/` y `lms/scripts/armar-kit-robo-nube.sh` (el kit; no van al servidor).

## 0. Comprobaciones previas (solo lectura)

```sh
ssh -i ~/.ssh/curdilmer-600.pem ubuntu@3.151.56.55        # copia de ~/Downloads/curdilmer.pem con chmod 600
free -m; df -h /                                          # el 17-10: 7,6 GB de RAM (5,1 GB disponibles), 14 GB libres
ss -ltn | grep -E ':1860|:1861'                           # 18600 y 18610 libres (lo estaban el 17-10)
cd ~/jmd && git status --short                            # solo deben salir los .bak y compose.override.yaml
nginx -V 2>&1 | grep -o http_auth_request_module          # presente el 17-10
```

Hazlo **fuera del horario de clase**: el paso 2 recrea el contenedor `imagen`, que vuelve a cargar sd-turbo al arrancar (~2,5 GB y 1-2 min).

## 1. Código al servidor

En el Mac: revisa el diff, commit y push a `main` de davrv93/jmd. En el servidor:

```sh
cd ~/jmd && git pull --ff-only
```

## 2. Servicio de imagen (sin reinstalar torch)

```sh
cd ~/jmd
sudo docker tag jmd/imagen:latest jmd/imagen:antes-nube                       # para volver atrás
sudo docker build -f lms/imagen/Dockerfile.parche -t jmd/imagen:latest lms/imagen
sudo docker compose --profile imagen up -d --no-build imagen                    # recrea con el puerto 127.0.0.1:18600
sudo docker exec -e IMAGEN_LOCAL=0 imagen python -m unittest test_app 2>&1 | tail -1   # OK (9 pruebas, sin tocar Cloudflare)
curl -s 127.0.0.1:18600/salud; echo                                           # "calidades": baja y media true para las aulas
curl -s -H 'X-Aula-Nube: 1' 127.0.0.1:18600/salud; echo                       # baja y media false
```

## 3. Servicio de voz a texto

```sh
cd ~/jmd
sudo docker compose --profile stt build stt                  # ~3-5 min, sin torch; la imagen trae el modelo base (~140 MB)
sudo docker compose --profile stt up -d stt
sudo docker exec stt python -m unittest test_app 2>&1 | tail -1      # OK (14 pruebas)
curl -s 127.0.0.1:18610/salud; echo                          # "modelo":"base","cargado":false
```

## 4. Gateway: aceptar las cuentas del curso

Activa la validación de los access tokens de Keycloak y los tokens personales `jg_` (el código ya existe en el gateway 0.4.1; hoy `auth.issuer` está vacío). La configuración viva está en el volumen; se cambia por la API de administración, sin reiniciar:

```sh
cd ~/jmd
ADMIN=$(grep '^ADMIN_TOKEN=' .env | cut -d= -f2-)
umask 077
curl -sf -H "Authorization: Bearer $ADMIN" http://127.0.0.1:4000/admin/api/config.yaml > ~/gateway-config-antes-nube.yaml   # respaldo (puede traer claves: 600)
python3 - <<'PY'
import re
s = open('/home/ubuntu/gateway-config-antes-nube.yaml').read()
bloque = re.search(r'^auth:\n(?:[ \t]+.*\n?)*', s, re.M)
assert bloque, 'no encontré el bloque auth'
nuevo = re.sub(r'^([ \t]+)issuer:.*$', r'\1issuer: https://jmd-learn.online/kc/realms/lms', bloque.group(0), count=1, flags=re.M)
open('/home/ubuntu/gateway-config-nube.yaml', 'w').write(s.replace(bloque.group(0), nuevo))
PY
diff ~/gateway-config-antes-nube.yaml ~/gateway-config-nube.yaml          # solo debe cambiar la línea issuer
curl -sf -X PUT -H "Authorization: Bearer $ADMIN" --data-binary @$HOME/gateway-config-nube.yaml http://127.0.0.1:4000/admin/api/config.yaml >/dev/null && echo aplicado
curl -s -H "Authorization: Bearer $ADMIN" http://127.0.0.1:4000/admin/api/usage | head -c 200; echo   # "enabled":true, issuer correcto
unset ADMIN
```

- El gateway descubre el JWKS en `https://jmd-learn.online/kc/realms/lms/.well-known/openid-configuration` (desde el contenedor responde: comprobado el 17-10).
- Cuotas: `per_user.requests_per_day` sigue en 6000. Para el kit basta con 300-500: cámbialo en el mismo archivo si quieres frenar a un agente desbocado. Cuotas por grupo en `auth.cohorts` (la cohorte sale del claim `groups`).
- La clave estática de las aulas (`GATEWAY_API_KEYS`) sigue valiendo igual.

## 5. nginx

```sh
cd ~/jmd
sudo cp lms/nginx/aula-nube-zonas.conf /etc/nginx/conf.d/aula-nube-zonas.conf
sudo mkdir -p /etc/nginx/snippets && sudo cp lms/nginx/aula-nube.conf /etc/nginx/snippets/aula-nube.conf
sudo cp /etc/nginx/sites-enabled/jmd-learn ~/jmd-learn.nginx.antes-nube
# Dentro del server { } del 443, ANTES de «location / {»:   include /etc/nginx/snippets/aula-nube.conf;
sudo sed -i '0,/^    location \/ {/s//    include \/etc\/nginx\/snippets\/aula-nube.conf;\n\n    location \/ {/' /etc/nginx/sites-enabled/jmd-learn
grep -n 'aula-nube' /etc/nginx/sites-enabled/jmd-learn            # una sola línea include, en el bloque 443
sudo nginx -t && sudo systemctl reload nginx
```

`sites-enabled/jmd-learn` puede ser un enlace a `sites-available/`: `sed -i` sobre un enlace lo convierte en archivo. Si es enlace, edita el destino (`readlink -f`).

## 6. Comprobación desde fuera

```sh
curl -s -o /dev/null -w '%{http_code}\n' https://jmd-learn.online/aula-nube/imagen/salud          # 401 (sin token)
curl -s -w ' %{http_code}\n' https://jmd-learn.online/aula-nube/v1/admin/api/config               # 404 JSON
curl -s -w ' %{http_code}\n' https://jmd-learn.online/aula-nube/v1/auth/me                        # 401 «clave inválida»
```

Y una vuelta completa con una cuenta de prueba (p. ej. `prueba.clase3@jmd-learn.online`), en un Mac y en un Windows:
`sh iniciar.sh` / `iniciar.bat` → entra con la cuenta → `http://127.0.0.1:8800/nube` dice `gateway: true`, `imagen.calidades.maxima: true`, `stt.ok: true`. Luego, en el kit, `python herramientas/verificar.py todo` con un Robo armado.

Si `cuenta.py entrar` dice «el token no es para ai-gateway», al cliente `jmd-cli` le falta el mapper de audiencia:

```sh
sudo docker exec keycloak /opt/keycloak/bin/kcadm.sh config credentials --server http://localhost:8080/kc --realm master --user <admin> --password <ver ~/credenciales-keycloak.txt>
sudo docker exec keycloak /opt/keycloak/bin/kcadm.sh get clients -r lms -q clientId=jmd-cli --fields id,protocolMappers
```

## 7. Tokens de los alumnos

- **Autoservicio, sin trabajo del instructor**: la primera vez, `iniciar` hace el *device grant* con el cliente público `jmd-cli` de Keycloak (el mismo de `jmd login --sso`). El alumno confirma en el navegador con su cuenta del LMS y el kit canjea el acceso en `/aula-nube/v1/auth/exchange` por un token personal `jg_…` de 30 días (`auth.personal_token_days`). Queda en `~/.config/jmd-robo/token.json` (Mac/Linux, 600) o `%APPDATA%\jmd-robo\token.json` (Windows, solo su usuario con `icacls`), nunca dentro del kit.
- Alumno sin cuenta: créala en Keycloak (realm `lms`, ver `~/credenciales-keycloak.txt`) y que corra `iniciar` otra vez.
- Renovar: `iniciar.bat --token` / `sh iniciar.sh --token`.
- Ver y revocar: `curl -s -H "Authorization: Bearer $ADMIN" http://127.0.0.1:4000/admin/api/tokens` y `curl -X DELETE -H "Authorization: Bearer $ADMIN" http://127.0.0.1:4000/admin/api/tokens/<hash>`. El alumno puede revocar el suyo con `python cuenta.py salir`.
- Uso de hoy: `GET /admin/api/usage`.

## 8. Topes

| Qué | Dónde | Por defecto |
|---|---|---|
| Texto por alumno | gateway `auth.per_user` | 6000 peticiones/día |
| Ritmo de texto | nginx `aula_nube_texto` | 60/min por token (ráfaga 40) |
| Imágenes «maxima» por alumno | `IMAGEN_MAXIMA_POR_ALUMNO` | 15/día |
| Ritmo de imagen y voz | nginx `aula_nube_imagen` | 10/min por token (la salud no cuenta) |
| Cupo de Cloudflare de toda la clase | `CF_NEURONS_DIA` | 9800 neurons/día (capa gratuita; se reinicia 00:00 UTC = 19:00 Lima) |
| Dictados por alumno | `STT_POR_ALUMNO_DIA` | 300/día |
| Ritmo de dictado | nginx `aula_nube_stt` | 20/min por token |
| Toda una IP | nginx `aula_nube_ip` | 600/min (en clase todos salen por la misma IP) |

El contador de neurons y los topes por alumno viven en memoria: un reinicio del contenedor los pone a cero.

## 9. RAM esperada

| Pieza | Reposo | Pico | Medido |
|---|---|---|---|
| stt, modelo `base` int8 | ~110-150 MB | ~380 MB mientras transcribe | Mac, `--cpus 2`: RSS pico 377 MB, cgroup 340 MiB; tras soltar el modelo, 150 MB (110 MiB cgroup) |
| stt, modelo `small` int8 | igual | ~820 MB | RSS pico 632-819 MB; necesita `STT_MEMORIA=1g` |
| imagen | sin cambio | sin cambio | los pedidos del kit (solo «maxima») no cargan sd-turbo |
| gateway, nginx | despreciable | despreciable | |

`mem_limit` del stt: 600m (base). Hoy el servidor tiene 7,6 GB y ~5,1 GB disponibles con `imagen` en 1,8 GB. Con la clase llena (aulas de 52-384 MB cada una, aula-pg hasta 1 GB, Keycloak ~500 MB, imagen hasta ~2,5 GB) el stt suma como mucho 0,4 GB. Si la clase no usa «baja» ni «media», `IMAGEN_LOCAL=0` en `.env` devuelve ~2,5 GB.

## 10. Vuelta atrás

```sh
# nginx (inmediato)
sudo cp ~/jmd-learn.nginx.antes-nube /etc/nginx/sites-enabled/jmd-learn && sudo rm -f /etc/nginx/conf.d/aula-nube-zonas.conf
sudo nginx -t && sudo systemctl reload nginx
# gateway
ADMIN=$(grep '^ADMIN_TOKEN=' ~/jmd/.env | cut -d= -f2-); curl -sf -X PUT -H "Authorization: Bearer $ADMIN" --data-binary @$HOME/gateway-config-antes-nube.yaml http://127.0.0.1:4000/admin/api/config.yaml; unset ADMIN
# stt
cd ~/jmd && sudo docker compose --profile stt stop stt && sudo docker compose --profile stt rm -f stt
# imagen
sudo docker tag jmd/imagen:antes-nube jmd/imagen:latest
git checkout <commit-anterior> -- compose.yaml lms/imagen && sudo docker compose --profile imagen up -d --no-build imagen
```

Los tokens `jg_` emitidos siguen en la base del gateway, pero sin la ruta pública no sirven desde fuera; se pueden revocar uno por uno (paso 7).
