#!/bin/sh
# aula-pg, primer arranque del volumen: bases de evolution-go (evogo_auth, evogo_users) con un rol propio, y
# nadie más que su dueño puede conectarse a ellas (ni a la base «postgres»). Las bases de los alumnos las crea
# el LMS (lms/api/internal/aula/clase.go) con «docker exec aula-pg psql».
set -eu
: "${EVOGO_DB_PASSWORD:?falta EVOGO_DB_PASSWORD (ver lms/.env.example)}"
psql -v ON_ERROR_STOP=1 -U postgres -d postgres -v clave="$EVOGO_DB_PASSWORD" <<'SQL'
CREATE ROLE evogo LOGIN PASSWORD :'clave';
CREATE DATABASE evogo_auth OWNER evogo;
CREATE DATABASE evogo_users OWNER evogo;
REVOKE ALL ON DATABASE evogo_auth FROM PUBLIC;
REVOKE ALL ON DATABASE evogo_users FROM PUBLIC;
REVOKE CONNECT ON DATABASE postgres FROM PUBLIC;
-- evolution-go mira en «postgres» si sus bases existen (si no, solo avisa).
GRANT CONNECT ON DATABASE postgres TO evogo;
REVOKE CONNECT ON DATABASE template1 FROM PUBLIC;
SQL
