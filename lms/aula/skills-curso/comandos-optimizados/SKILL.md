---
name: comandos-optimizados
description: Úsalo cuando un agente va a ejecutar comandos de terminal (bash, zsh, docker, git, npm, rg) y hay que pedirle comandos baratos en tokens, seguros ante errores y repetibles. Palabras gatillo: terminal, comando, shell, bash, logs, "muéstrame", verificar, dry-run, rsync, docker, grep, salida muy larga, gasto de contexto, tokens.
nivel: completo
compat: [claude, codex, gpt, deepseek, glm, nemotron, ollama-pequeno]
---

# Comandos optimizados: pedir al agente terminal barata y segura

## Cuándo usar

Cada vez que un agente va a tocar la terminal. El contexto de un modelo es una cuenta corriente: cada línea de salida que vuelve se cobra en tokens, en atención y en la probabilidad de que el modelo se pierda. Un `cat` de un log de 4 000 líneas puede costar más que toda la conversación anterior y no aporta nada que un `tail -3` no diga. Este skill define cómo pedir y cómo escribir comandos que devuelven lo justo, no rompen nada que no se pueda recuperar y se pueden repetir sin efectos acumulados.

Sirve con Claude Code, Codex y con cualquier modelo que llame herramientas; y sirve igual para la persona que escribe en la terminal mientras el agente mira.

## Principios

1. Un comando compuesto bien pensado vale más que cinco sueltos. Cada ida y vuelta cuesta tokens y pierde estado.
2. La salida se recorta antes de volver al modelo. `| head -20`, `| tail -3`, `--quiet`, `-q`, `| wc -l`. El modelo lee lo que necesita decidir, no todo lo que existe.
3. Verifica con un booleano, no con un listado. "¿Existe el archivo?" es `test -f ruta && echo sí || echo no`, no `ls -la carpeta/`.
4. Antes de destruir, ensaya. `--dry-run`, `-n`, `echo` delante del comando, o lista lo que se va a borrar y cuenta.
5. Rutas absolutas siempre. El directorio actual del agente cambia entre llamadas y `cd` dentro de un comando compuesto es una fuente clásica de errores.
6. Idempotente: correr dos veces da el mismo resultado. `mkdir -p`, `ln -sfn`, `rsync` en lugar de `cp`, `grep -q || append`.
7. Los secretos no se imprimen jamás. Se comprueba su presencia con un booleano (`test -n "$VAR"`), nunca su valor.

## Procedimiento paso a paso

1. Antes de pedir un comando, formula qué decisión vas a tomar con su resultado. Si no hay decisión, no hay comando.
2. Pide el comando con la salida ya recortada: "dame solo las tres últimas líneas", "solo el conteo", "solo sí o no".
3. Si hace falta más de un paso, encadénalos con `&&` (parar al primer fallo) y termina con un mensaje de éxito explícito: `... && echo LISTO`. Así la salida esperada es una palabra.
4. Si el comando borra, sobrescribe, mueve o despliega, pide primero la versión de ensayo: `rsync -n`, `git clean -n`, `find ... -print` (sin `-delete`), `docker compose config`, `terraform plan`. Lee la salida, decide, y recién pide la versión real.
5. Usa rutas absolutas en cada archivo y carpeta. En agentes, el cwd se reinicia entre llamadas.
6. Para buscar, prefiere `rg` (ripgrep) sobre `grep -r` y `fd` sobre `find` cuando existan: son más rápidos, respetan `.gitignore` y producen menos ruido. Comprueba si existen con `command -v rg fd`.
7. Para logs, nunca el archivo entero. Pide `tail -n 50`, un rango por tiempo (`--since 10m` en `docker logs` o `journalctl`), o un filtro (`rg -i "error|fatal" | tail -20`).
8. Redirige stderr a stdout cuando el error es lo que buscas: `comando 2>&1 | tail -3`. Un error sin su mensaje es una adivinanza.
9. Para instalar dependencias, aprovecha la caché: `npm ci --prefer-offline`, `pip install --cache-dir`, imágenes Docker con capas de dependencias antes del código. Reinstalar desde cero en cada iteración es el gasto más caro y más invisible.
10. Para comprobar que algo quedó bien, pide un booleano: `curl -sf URL >/dev/null && echo arriba || echo caído`, `php -l archivo.php | tail -1`, `git diff --quiet && echo limpio || echo cambios`.
11. Para variables sensibles: `test -n "$API_KEY" && echo presente || echo falta`. Nunca `echo $API_KEY`, nunca `cat .env`, nunca `env` sin filtrar.
12. Añade tiempo máximo a lo que puede colgarse: `timeout 30 comando`. Un agente esperando a un comando colgado consume el turno sin devolver nada.
13. Cuando el resultado es largo por naturaleza (una tabla, un diff), guárdalo en un archivo y devuelve solo la ruta y el conteo: `comando > /ruta/salida.txt && wc -l /ruta/salida.txt`. El modelo lee el archivo por partes si lo necesita.
14. Al final de cada comando destructivo real, pide una verificación independiente de una línea: después de `rm`, `test ! -e ruta && echo borrado`; después de `rsync`, `md5sum` del destino.

## Reglas duras

- Nunca volcar un log completo al chat. Máximo 50 líneas y siempre filtradas o `tail`.
- Nunca ejecutar `rm -rf`, `git reset --hard`, `git push --force`, `docker compose down`, `DROP`, `truncate` o similar sin una versión de ensayo previa y sin confirmación explícita de la persona.
- Nunca imprimir el valor de una variable que parezca secreto (`KEY`, `TOKEN`, `PASSWORD`, `SECRET`, `PEM`). Solo su presencia como booleano.
- Nunca `cd` suelto en un comando compuesto para agentes. Rutas absolutas o `cd ruta && ...` dentro del mismo comando, con el `&&`.
- Nunca `ls -R`, `find /` ni `cat` sobre carpetas enteras. Primero `wc -l`, `du -sh` o `head`.
- Nunca un comando que pueda colgarse sin `timeout`.
- Nunca reinstalar todas las dependencias para probar un cambio de una línea.
- Un comando que modifica el sistema termina con un mensaje de éxito explícito (`&& echo LISTO`), para que la salida vacía nunca se confunda con éxito.

## Tabla "caro vs barato"

| # | Caro (gasta tokens, arriesga) | Barato (devuelve lo justo, seguro) |
|---|-------------------------------|-------------------------------------|
| 1 | `cat /var/log/app.log` | `tail -n 30 /var/log/app.log \| rg -i "error\|warn"` |
| 2 | `ls -la /ruta/carpeta/` para ver si existe un archivo | `test -f /ruta/carpeta/archivo && echo sí \|\| echo no` |
| 3 | `docker logs contenedor` | `docker logs --since 10m contenedor 2>&1 \| tail -20` |
| 4 | `grep -r "TenantScope" .` | `rg -n "TenantScope" /ruta/proyecto/app \| head -20` |
| 5 | `find . -name "*.log" -delete` directo | `fd -e log . /ruta \| head -20`; luego `fd -e log . /ruta -x rm` |
| 6 | `rsync -av origen/ destino/` sin mirar | `rsync -avn origen/ destino/ \| tail -5` y después sin `-n` |
| 7 | `echo $API_KEY` para "ver si está" | `test -n "$API_KEY" && echo presente \|\| echo falta` |
| 8 | `npm install` en cada iteración | `npm ci --prefer-offline --no-audit --no-fund 2>&1 \| tail -2` una vez |
| 9 | `git status` + `git diff` + `git log` en tres llamadas | `git status --short \| head; git log --oneline -3` en una |
| 10 | `curl URL` que devuelve una página entera | `curl -sf -o /dev/null -w "%{http_code}\n" URL` |
| 11 | `php artisan route:list` (revienta si falta una clase) | `php -l /ruta/archivo.php \| tail -1` y verificación por tinker con match |
| 12 | `docker compose down` para reiniciar un servicio | `docker compose -f /ruta/docker-compose.yml restart NOMBRE && echo LISTO` |

## Lista de comprobación

- [ ] Sé qué decisión tomaré con la salida antes de pedir el comando.
- [ ] La salida está recortada (`head`, `tail`, `wc -l`, `-q`, filtro).
- [ ] Los pasos están encadenados con `&&` y terminan en `&& echo LISTO`.
- [ ] Todo lo destructivo tuvo versión de ensayo (`-n`, `--dry-run`, `-print`).
- [ ] Todas las rutas son absolutas.
- [ ] El comando se puede repetir sin efectos acumulados.
- [ ] Ningún secreto se imprime; solo `test -n` como booleano.
- [ ] Hay `timeout` en lo que puede colgarse.
- [ ] Uso `rg`/`fd` si `command -v rg fd` los encuentra.
- [ ] Las dependencias se instalan una vez y con caché.
- [ ] Tras un cambio real, hay verificación independiente de una línea.

## Plantilla

Pega esto al inicio de la conversación con el agente, o en el archivo de instrucciones del proyecto.

```markdown
## Reglas de terminal para este proyecto

Cuando ejecutes comandos:
1. Encadena pasos con `&&` y termina con `&& echo LISTO`. Un comando por decisión.
2. Recorta la salida: `| tail -n 20`, `| head -n 20`, `| wc -l`, `--quiet`. Nunca un log entero.
3. Verifica con booleanos: `test -f ruta && echo sí || echo no`, `curl -sf -o /dev/null -w "%{http_code}" URL`.
4. Antes de borrar, mover, sobrescribir o desplegar: versión de ensayo (`-n`, `--dry-run`, `-print`) y espera mi confirmación.
5. Rutas absolutas siempre. Raíz del proyecto: `/RUTA/ABSOLUTA/PROYECTO`.
6. Secretos: nunca imprimas su valor. Comprueba con `test -n "$VAR" && echo presente || echo falta`.
7. Usa `rg` y `fd` si existen (`command -v rg fd`). Si no, `grep -rn` y `find` con filtros.
8. Pon `timeout 60` a lo que pueda colgarse (red, builds, pruebas).
9. Dependencias: instala una vez con caché (`npm ci --prefer-offline`); no reinstales por cada cambio.
10. Si la salida es larga por naturaleza, guárdala en `/RUTA/tmp/salida.txt` y devuélveme la ruta y `wc -l`.

Prohibido sin mi confirmación escrita: `rm -rf`, `git reset --hard`, `git push --force`, `docker compose down`, `DROP`, `TRUNCATE`.
```

## Aprendido en la demo Tecnosito (10-10-2026)

- Rutas absolutas en cada comando, sin excepción. Un agente escribió por error en el README de otro proyecto (`SILA-IA/web`) porque un `cd` encadenado dentro de un comando largo lo dejó parado en otra carpeta. El principio 5 no es estilo: es lo único que evita escribir donde no toca.
- Antes de arrancar un servidor, comprueba el puerto: `lsof -i :8765 | tail -n +2 | head -3`. En la Mac del docente 8765 lo ocupaba `jev-style serve` y 8787 el proxy de caveman; se usaron 8766 y 8797. Un puerto ocupado no siempre falla ruidoso: a veces sirve la app equivocada.
- Descargas de Hugging Face: `HF_HUB_DISABLE_XET=1` delante del comando. El protocolo xet se quedó dos horas en 1,1 GB; sin xet baja a 11 MB/s sostenidos. Una descarga a la vez (dos en paralelo se frenan entre sí) y solo la variante fp16 con `allow_patterns`. No juzgues el avance por el tamaño de los `.incomplete`: se reservan antes de llenarse.
- Para medir memoria de un proceso con pesos en GPU en macOS: `footprint -p <pid> | tail -5`, no `ps -o rss`.
- Fila nueva para la tabla "caro vs barato": `cd carpeta; comando` (cambia el cwd y lo arrastra a la siguiente llamada) frente a `comando /ruta/absoluta/archivo && echo LISTO`.

## Versión corta para modelos pequeños

Al ejecutar comandos de terminal, sigue estas reglas en cada comando.

1. Un solo comando compuesto con `&&`. Termina con `&& echo LISTO`.
2. Recorta la salida: agrega `| tail -n 20` o `| head -n 20` o `| wc -l`.
3. Nunca muestres un log completo. Usa `tail -n 30` y filtra con `grep -i error`.
4. Para saber si existe un archivo: `test -f /ruta && echo sí || echo no`.
5. Para saber si una web responde: `curl -sf -o /dev/null -w "%{http_code}\n" URL`.
6. Antes de borrar o sobrescribir: ejecuta primero con `-n` o `--dry-run`. Espera confirmación.
7. Usa rutas absolutas. Nunca `cd` solo.
8. Nunca imprimas claves ni tokens. Usa `test -n "$VAR" && echo presente || echo falta`.
9. Usa `rg` en vez de `grep -r`. Usa `fd` en vez de `find`. Si no existen, usa los normales con filtro.
10. Pon `timeout 60` antes de comandos de red o de build.
11. Instala dependencias una sola vez: `npm ci --prefer-offline`.
12. Si la salida es larga, guárdala en un archivo y muestra solo `wc -l`.

Prohibido sin confirmación: `rm -rf`, `git reset --hard`, `git push --force`, `docker compose down`, `DROP`, `TRUNCATE`.
