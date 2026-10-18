@echo off
title Parche del plan de Robo
set "KIT_RAIZ=%~dp0"
set "JMD_BAT=%~f0"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$f=$env:JMD_BAT; $s=[IO.File]::ReadAllText($f,[Text.Encoding]::UTF8); $i=$s.IndexOf('#'+'#PS#'+'#'); Invoke-Expression $s.Substring($i)"
echo.
pause
exit /b
##PS##
$ErrorActionPreference = 'Stop'
$cands = @()
if ($env:KIT_RAIZ) { $cands += (Join-Path $env:KIT_RAIZ 'trabajo\plan-robo\PLAN_TRABAJO.md') }
$cands += (Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'robo-kit\trabajo\plan-robo\PLAN_TRABAJO.md')
$cands += (Join-Path $env:USERPROFILE 'Documents\robo-kit\trabajo\plan-robo\PLAN_TRABAJO.md')
$cands += (Join-Path $env:USERPROFILE 'OneDrive\Documents\robo-kit\trabajo\plan-robo\PLAN_TRABAJO.md')
$cands += (Join-Path $env:USERPROFILE 'OneDrive\Documentos\robo-kit\trabajo\plan-robo\PLAN_TRABAJO.md')
$p = $cands | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $p) { Write-Host 'No encontre robo-kit\trabajo\plan-robo\PLAN_TRABAJO.md en Documentos.'; exit 1 }
$kit = Split-Path (Split-Path (Split-Path $p))
Write-Host "Kit: $kit"
# Los respaldos van FUERA del kit (dentro, JMDesign los toma como cambios a la plantilla).
$resp = Join-Path $env:LOCALAPPDATA ('jmd-robo-parche\' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
New-Item -ItemType Directory -Force -Path $resp | Out-Null
Get-ChildItem -Path $kit -Recurse -Force -Filter '*.antes-del-parche' -ErrorAction SilentlyContinue | ForEach-Object { Move-Item $_.FullName (Join-Path $resp $_.Name) -Force }
function Respaldar($f) { if (Test-Path $f) { Copy-Item $f (Join-Path $resp ((Split-Path $f -Leaf) + '.' + ((Split-Path (Split-Path $f) -Leaf)))) -Force } }
function Guardar($f, $t) { [IO.File]::WriteAllText($f, $t, (New-Object Text.UTF8Encoding $false)) }
function ParchearPlan($f) {
  Respaldar $f
  $t = [IO.File]::ReadAllText($f, [Text.Encoding]::UTF8)
  $t = $t -replace '#\s*200 \(tu token del curso vale\)', '# 200'
  $t = $t -replace '(?m)^(curl -s http://127\.0\.0\.1:8800/imagen/salud\s+)#\s*contiene "maxima":true y "baja":false', ('$1# contiene "maxima":true' + "`n" + '$1# contiene "baja":false')
  $t = $t -replace '#\s*personalidad ok:[^\r\n]*', '# empieza personalidad ok'
  $t = $t -replace '#\s*\{"nombre":[^\r\n]*', '# contiene "llm":true'
  $t = $t -replace '#\s*\{"texto":[^\r\n]*', '# contiene "texto"'
  $t = $t -replace '#\s*200 y m.s de 1000', '# empieza 200'
  $t = $t -replace '#\s*\.\.\. no est. disponible \.\.\. 422', '# contiene 422'
  $t = $t -replace '#\s*modulos intactos', '# empieza modulos intactos'
  $t = $t -replace '\|\s*bloqueada[^|\r\n]*\|', '| pendiente |'
  # La prueba de voz se guarda dentro de trabajo/robo (el JMDesign instalado no deja escribir fuera).
  $t = $t.Replace('-o trabajo/voz.wav', '-o trabajo/robo/voz.wav')
  # F2: el JMDesign instalado busca el nombre, el color y el tipo de avatar escritos tal cual en el código.
  $compat = ' **Compatibilidad con JMDesign (obligatorio, v4):** en personalidad.json copia las 3 preguntas de la tabla «Personaliza aquí» EXACTAMENTE como están escritas (mismas letras, sin añadir tildes, signos ni mayúsculas) en `faq` como `{"p": pregunta, "r": respuesta}`. Además de leer personalidad.json, escribe en app.js tres constantes literales con TUS valores del plan: `const NOMBRE = "<tu nombre>"`, `const COLOR = "<tu color #rrggbb>"` y `const TIPO = "robot"` (u «osito», el que elegiste); monta el avatar exactamente así: `montarAvatar(document.getElementById("robot"), TIPO && { tipo: TIPO, color: COLOR, animo: "neutral" })`. En index.html el lienzo es `<canvas id="robot"></canvas>` y tu nombre va literal en `<title>` y en el encabezado visible. No copies ni edites los módulos.'
  # Quita una indicación anterior (v3) y pone la vigente en F0-T2, F2-T1 y F2-T2.
  $t = [regex]::Replace($t, ' \*\*Compatibilidad con JMDesign[^\r\n]*', '')
  foreach ($id in @('F0-T2', 'F2-T1', 'F2-T2')) {
    $t = [regex]::Replace($t, ('(?m)^(\*\*' + $id + '\*\* ·[^\r\n]*)'), { param($m) $m.Groups[1].Value + $compat })
  }
  # v6: el robo.py que reescribe la IA no encuentra el proceso anterior y el reinicio falla (8788 ocupado, 405).
  $lanzador = ' **Lanzador (obligatorio, v6):** NO reescribas `trabajo/robo/robo.py` si ya existe. Si de verdad tienes que cambiarlo, su `parar` debe cerrar también el proceso que escucha en el puerto 8788 aunque su PID no esté en `.robo.pid` (Windows: `netstat -ano` + `taskkill /PID <pid> /T /F`; macOS/Linux: `lsof -ti :8788` + `kill`).'
  $t = [regex]::Replace($t, ' \*\*Lanzador \(obligatorio, v6\):\*\*[^\r\n]*', '')
  $t = [regex]::Replace($t, '(?m)^(\*\*F[1-6]-T[0-9][^\r\n]*)', { param($m) $m.Groups[1].Value + $lanzador })
  Guardar $f $t
}
ParchearPlan $p
$plantilla = Join-Path $kit '.jmdesign\plan-plantilla.md'
if (Test-Path $plantilla) { ParchearPlan $plantilla; Write-Host 'Copia interna de JMDesign corregida.' }
# revisar.py: JMDesign guarda el avatar como objeto {tipo, ...}; se aceptan las dos formas.
$rev = Join-Path $kit 'herramientas\revisar.py'
if (Test-Path $rev) {
  Respaldar $rev
  $t = [IO.File]::ReadAllText($rev, [Text.Encoding]::UTF8)
  $tipo = '((d.get("avatar") or {}).get("tipo") if isinstance(d.get("avatar"), dict) else d.get("avatar"))'
  $t = $t.Replace('if d.get("avatar") not in AVATARES:', ('if ' + $tipo + ' not in AVATARES:'))
  $t = $t.Replace("{d['avatar']}", ('{' + $tipo + '}'))
  Guardar $rev $t
  Write-Host 'revisar.py acepta el avatar como texto u objeto.'
}
# trabajo\voz.wav de un intento anterior: fuera de la carpeta de construcción, JMDesign lo cuenta como cambio.
$vozVieja = Join-Path $kit 'trabajo\voz.wav'
if (Test-Path $vozVieja) { Move-Item $vozVieja (Join-Path $resp 'voz.wav') -Force; Write-Host 'trabajo\voz.wav movido a los respaldos.' }
# Si quedó un Robo viejo en el 8788, JMDesign no puede reiniciarlo con los cambios nuevos.
try {
  Get-NetTCPConnection -LocalPort 8788 -State Listen -ErrorAction Stop | ForEach-Object {
    $pr = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue
    if ($pr -and $pr.ProcessName -like 'python*') { Stop-Process -Id $pr.Id -Force; Write-Host "Robo viejo detenido en el puerto 8788 (PID $($pr.Id))." }
  }
} catch { }
# v7: lanzador robusto (cierra lo que ocupe el 8788) y reinicio de Robo con el código actual.
$dirRobo = Join-Path $kit 'trabajo\robo'
if (Test-Path (Join-Path $dirRobo 'servidor.py')) {
  $lanz = Join-Path $dirRobo 'robo.py'
  if (Test-Path $lanz) { Copy-Item $lanz (Join-Path $resp 'robo.py.anterior') -Force }
  [IO.File]::WriteAllBytes($lanz, [Convert]::FromBase64String('IiIicHl0aG9uIHRyYWJham8vcm9iby9yb2JvLnB5IGFycmFuY2FyIHwgcGFyYXIgfCByZWluaWNpYXIgfCBlc3RhZG8gfCBsb2cKCkxhbnphZG9yIGRlIFJvYm8gKHZlcnNpw7NuIHJvYnVzdGEgZGVsIHBhcmNoZSBkZWwgY3Vyc28pLiDCq3BhcmFywrsgY2llcnJhIGVsIHByb2Nlc28KZGUgLnJvYm8ucGlkIHksIGFkZW3DoXMsIGN1YWxxdWllciBwcm9jZXNvIHF1ZSBlc2N1Y2hlIGVuIGVsIHB1ZXJ0byBkZSBSb2JvLCBhdW5xdWUgbG8KaGF5YSBhcnJhbmNhZG8gb3RybyBsYW56YWRvci4gU2FsZSBjb24gY8OzZGlnbyAxIHNpIG5vIHB1ZWRlIGxpYmVyYXIgbyBhcnJhbmNhci4KIiIiCmltcG9ydCBvcywgcmUsIHNpZ25hbCwgc29ja2V0LCBzdWJwcm9jZXNzLCBzeXMsIHRpbWUKZnJvbSBwYXRobGliIGltcG9ydCBQYXRoCgpBUVVJID0gUGF0aChfX2ZpbGVfXykucmVzb2x2ZSgpLnBhcmVudApQVUVSVE8gPSBpbnQob3MuZW52aXJvbi5nZXQoIlJPQk9fUFVFUlRPIiwgIjg3ODgiKSkKUElEID0gQVFVSSAvICIucm9iby5waWQiCkxPRyA9IEFRVUkucGFyZW50IC8gInJvYm8ubG9nIgpFTlRPUk5PID0geyJPU0lUT19UT0tFTiI6ICJsb2NhbCIsICJKTURfVVJMIjogImh0dHA6Ly8xMjcuMC4wLjE6ODgwMCIsCiAgICAgICAgICAgIklNQUdFTl9VUkwiOiAiaHR0cDovLzEyNy4wLjAuMTo4ODAwL2ltYWdlbiIsICJTVFRfVVJMIjogImh0dHA6Ly8xMjcuMC4wLjE6ODgwMC9zdHQifQpWRVJfUFVFUlRPID0gZiJuZXRzdGF0IC1hbm8gfCBmaW5kc3RyIDp7UFVFUlRPfSIgaWYgb3MubmFtZSA9PSAibnQiIGVsc2UgZiJsc29mIC1pIDp7UFVFUlRPfSIKCgpkZWYgdml2bygpOgogICAgd2l0aCBzb2NrZXQuc29ja2V0KCkgYXMgczoKICAgICAgICBzLnNldHRpbWVvdXQoMC41KQogICAgICAgIHJldHVybiBzLmNvbm5lY3RfZXgoKCIxMjcuMC4wLjEiLCBQVUVSVE8pKSA9PSAwCgoKZGVmIG1pbygpOgogICAgdHJ5OgogICAgICAgIHJldHVybiBpbnQoUElELnJlYWRfdGV4dCgpLnN0cmlwKCkpCiAgICBleGNlcHQgKE9TRXJyb3IsIFZhbHVlRXJyb3IpOgogICAgICAgIHJldHVybiBOb25lCgoKZGVmIHBpZHNfZGVsX3B1ZXJ0bygpOgogICAgIiIiUElEcyBxdWUgZXNjdWNoYW4gZW4gZWwgcHVlcnRvIChXaW5kb3dzOiBuZXRzdGF0OyBtYWNPUy9MaW51eDogbHNvZikuIiIiCiAgICBwaWRzID0gc2V0KCkKICAgIHRyeToKICAgICAgICBpZiBvcy5uYW1lID09ICJudCI6CiAgICAgICAgICAgIG91dCA9IHN1YnByb2Nlc3MucnVuKFsibmV0c3RhdCIsICItYW5vIiwgIi1wIiwgIlRDUCJdLCBjYXB0dXJlX291dHB1dD1UcnVlLCB0ZXh0PVRydWUsIGVycm9ycz0icmVwbGFjZSIpLnN0ZG91dAogICAgICAgICAgICBmb3IgbGluZWEgaW4gb3V0LnNwbGl0bGluZXMoKToKICAgICAgICAgICAgICAgIGMgPSBsaW5lYS5zcGxpdCgpCiAgICAgICAgICAgICAgICBpZiBsZW4oYykgPj0gNSBhbmQgY1swXS51cHBlcigpID09ICJUQ1AiIGFuZCBjWzFdLmVuZHN3aXRoKGYiOntQVUVSVE99IikgYW5kIGNbM10udXBwZXIoKSBpbiAoIkxJU1RFTklORyIsICJFU0NVQ0hBTkRPIikgYW5kIGNbNF0uaXNkaWdpdCgpOgogICAgICAgICAgICAgICAgICAgIHBpZHMuYWRkKGludChjWzRdKSkKICAgICAgICBlbHNlOgogICAgICAgICAgICBvdXQgPSBzdWJwcm9jZXNzLnJ1bihbImxzb2YiLCAiLXRpIiwgZiJ0Y3A6e1BVRVJUT30iLCAiLXNUQ1A6TElTVEVOIl0sIGNhcHR1cmVfb3V0cHV0PVRydWUsIHRleHQ9VHJ1ZSkuc3Rkb3V0CiAgICAgICAgICAgIHBpZHMgPSB7aW50KHgpIGZvciB4IGluIG91dC5zcGxpdCgpIGlmIHguaXNkaWdpdCgpfQogICAgZXhjZXB0IE9TRXJyb3I6CiAgICAgICAgcGFzcwogICAgcmV0dXJuIHBpZHMKCgpkZWYgbWF0YXIocGlkKToKICAgIGlmIG9zLm5hbWUgPT0gIm50IjogICMgV2luZG93czogc2luIHNlw7FhbGVzOyB0YXNra2lsbCBjaWVycmEgZWwgcHJvY2VzbyB5IHN1cyBoaWpvcwogICAgICAgIHN1YnByb2Nlc3MucnVuKFsidGFza2tpbGwiLCAiL1BJRCIsIHN0cihwaWQpLCAiL1QiLCAiL0YiXSwgY2FwdHVyZV9vdXRwdXQ9VHJ1ZSkKICAgIGVsc2U6CiAgICAgICAgdHJ5OgogICAgICAgICAgICBvcy5raWxsKHBpZCwgc2lnbmFsLlNJR1RFUk0pCiAgICAgICAgZXhjZXB0IE9TRXJyb3I6CiAgICAgICAgICAgIHBhc3MKCgpkZWYgcGFyYXIoKToKICAgIHBpZHMgPSBzZXQocGlkc19kZWxfcHVlcnRvKCkpCiAgICBpZiBtaW8oKToKICAgICAgICBwaWRzLmFkZChtaW8oKSkKICAgIGZvciBwaWQgaW4gcGlkczoKICAgICAgICBpZiBwaWQgYW5kIHBpZCAhPSBvcy5nZXRwaWQoKToKICAgICAgICAgICAgbWF0YXIocGlkKQogICAgUElELnVubGluayhtaXNzaW5nX29rPVRydWUpCiAgICBmb3IgXyBpbiByYW5nZSg0MCk6CiAgICAgICAgaWYgbm90IHZpdm8oKToKICAgICAgICAgICAgcHJpbnQoInBhcmFkbyIpCiAgICAgICAgICAgIHJldHVybiBUcnVlCiAgICAgICAgdGltZS5zbGVlcCgwLjI1KQogICAgaWYgb3MubmFtZSAhPSAibnQiOiAgIyDDumx0aW1vIHJlY3Vyc28gZW4gbWFjT1MvTGludXgKICAgICAgICBmb3IgcGlkIGluIHBpZHNfZGVsX3B1ZXJ0bygpOgogICAgICAgICAgICB0cnk6CiAgICAgICAgICAgICAgICBvcy5raWxsKHBpZCwgc2lnbmFsLlNJR0tJTEwpCiAgICAgICAgICAgIGV4Y2VwdCBPU0Vycm9yOgogICAgICAgICAgICAgICAgcGFzcwogICAgICAgIHRpbWUuc2xlZXAoMC41KQogICAgICAgIGlmIG5vdCB2aXZvKCk6CiAgICAgICAgICAgIHByaW50KCJwYXJhZG8iKQogICAgICAgICAgICByZXR1cm4gVHJ1ZQogICAgcHJpbnQoZiJlbCBwdWVydG8ge1BVRVJUT30gc2lndWUgb2N1cGFkbyBwb3Igb3RybyBwcm9ncmFtYS4gUGFyYSB2ZXJsbzoge1ZFUl9QVUVSVE99IikKICAgIHJldHVybiBGYWxzZQoKCmRlZiBhcnJhbmNhcigpOgogICAgaWYgdml2bygpOgogICAgICAgIHByaW50KCJ5YSBhcnJhbmNhZG8iIGlmIG1pbygpIGVsc2UgZiJlbCBwdWVydG8ge1BVRVJUT30gZXN0w6Egb2N1cGFkbyBwb3Igb3RybyBwcm9ncmFtYS4gUGFyYSB2ZXJsbzoge1ZFUl9QVUVSVE99IikKICAgICAgICByZXR1cm4gYm9vbChtaW8oKSkKICAgIGVudiA9IHsqKkVOVE9STk8sICoqb3MuZW52aXJvbiwgIlBZVEhPTlVURjgiOiAiMSIsICJQWVRIT05JT0VOQ09ESU5HIjogInV0Zi04In0KICAgIGV4dHJhID0gKHsiY3JlYXRpb25mbGFncyI6IHN1YnByb2Nlc3MuQ1JFQVRFX05FV19QUk9DRVNTX0dST1VQIHwgc3VicHJvY2Vzcy5ERVRBQ0hFRF9QUk9DRVNTfQogICAgICAgICAgICAgaWYgb3MubmFtZSA9PSAibnQiIGVsc2UgeyJzdGFydF9uZXdfc2Vzc2lvbiI6IFRydWV9KQogICAgd2l0aCBvcGVuKExPRywgImFiIikgYXMgbG9nOgogICAgICAgIHAgPSBzdWJwcm9jZXNzLlBvcGVuKFtzeXMuZXhlY3V0YWJsZSwgIi1tIiwgInV2aWNvcm4iLCAic2Vydmlkb3I6YXBwIiwgIi0taG9zdCIsICIxMjcuMC4wLjEiLCAiLS1wb3J0Iiwgc3RyKFBVRVJUTyldLAogICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN3ZD1BUVVJLCBlbnY9ZW52LCBzdGRvdXQ9bG9nLCBzdGRlcnI9bG9nLCBzdGRpbj1zdWJwcm9jZXNzLkRFVk5VTEwsICoqZXh0cmEpCiAgICBQSUQud3JpdGVfdGV4dChzdHIocC5waWQpKQogICAgZm9yIF8gaW4gcmFuZ2UoODApOgogICAgICAgIGlmIHZpdm8oKToKICAgICAgICAgICAgcHJpbnQoZiJhcnJhbmNhZG8gZW4ge1BVRVJUT30iKQogICAgICAgICAgICByZXR1cm4gVHJ1ZQogICAgICAgIGlmIHAucG9sbCgpIGlzIG5vdCBOb25lOgogICAgICAgICAgICBicmVhawogICAgICAgIHRpbWUuc2xlZXAoMC4yNSkKICAgIHByaW50KCJubyBhcnJhbmPDszsgw7psdGltYXMgbMOtbmVhcyBkZSB0cmFiYWpvL3JvYm8ubG9nOiIpCiAgICB2ZXJfbG9nKCkKICAgIHJldHVybiBGYWxzZQoKCmRlZiB2ZXJfbG9nKG49MjApOgogICAgaWYgTE9HLmV4aXN0cygpOgogICAgICAgIHByaW50KCIiLmpvaW4oTE9HLnJlYWRfdGV4dChlbmNvZGluZz0idXRmLTgiLCBlcnJvcnM9InJlcGxhY2UiKS5zcGxpdGxpbmVzKFRydWUpWy1uOl0pKQoKCm9yZGVuID0gc3lzLmFyZ3ZbMV0gaWYgbGVuKHN5cy5hcmd2KSA+IDEgZWxzZSAiZXN0YWRvIgppZiBvcmRlbiA9PSAiYXJyYW5jYXIiOgogICAgc3lzLmV4aXQoMCBpZiBhcnJhbmNhcigpIGVsc2UgMSkKZWxpZiBvcmRlbiA9PSAicGFyYXIiOgogICAgc3lzLmV4aXQoMCBpZiBwYXJhcigpIGVsc2UgMSkKZWxpZiBvcmRlbiA9PSAicmVpbmljaWFyIjoKICAgIG9rID0gcGFyYXIoKQogICAgdGltZS5zbGVlcCgwLjUpCiAgICBzeXMuZXhpdCgwIGlmIG9rIGFuZCBhcnJhbmNhcigpIGVsc2UgMSkKZWxpZiBvcmRlbiA9PSAiZXN0YWRvIjoKICAgIHByaW50KCJhcnJhbmNhZG8iIGlmIHZpdm8oKSBhbmQgbWlvKCkgZWxzZSAoInBhcmFkbyIgaWYgbm90IHZpdm8oKSBlbHNlIGYiZWwgcHVlcnRvIHtQVUVSVE99IGxvIHVzYSBvdHJvIHByb2dyYW1hICh7VkVSX1BVRVJUT30pIikpCmVsaWYgb3JkZW4gPT0gImxvZyI6CiAgICB2ZXJfbG9nKCkKZWxzZToKICAgIHN5cy5leGl0KCJ1c286IHB5dGhvbiB0cmFiYWpvL3JvYm8vcm9iby5weSBhcnJhbmNhcnxwYXJhcnxyZWluaWNpYXJ8ZXN0YWRvfGxvZyIpCg=='))
  Write-Host 'robo.py del kit instalado (cierra lo que ocupe el puerto 8788).'
  $py = Join-Path $env:LOCALAPPDATA 'Programs\JMDesign Studio\python\python.exe'
  $args0 = @()
  if (-not (Test-Path $py)) { if (Get-Command py -ErrorAction SilentlyContinue) { $py = 'py'; $args0 = @('-3') } else { $py = 'python' } }
  Push-Location $kit
  try {
    $env:PYTHONUTF8 = '1'
    & $py @args0 'trabajo\robo\robo.py' 'reiniciar'
    Start-Sleep -Seconds 2
    $wav = Join-Path $kit 'herramientas\prueba-voz.wav'
    if (Test-Path $wav) {
      $code = & curl.exe -s -o NUL -w '%{http_code}' -X POST 'http://127.0.0.1:8788/api/stt' -H 'Content-Type: audio/wav' --data-binary ('@' + $wav)
      Write-Host ('Prueba /api/stt: HTTP ' + $code)
      if ($code -eq '405' -or $code -eq '404') { Write-Host 'Tu servidor.py todavia no tiene /api/stt y /api/voz (o los tapa un montaje en «/»). En JMDesign pulsa Reintentar: la IA los anade y ahora el reinicio si funciona.' }
    }
    Write-Host '--- ultimas lineas de trabajo\robo.log ---'
    if (Test-Path 'trabajo\robo.log') { Get-Content 'trabajo\robo.log' -Tail 8 }
  } finally { Pop-Location }
}
Write-Host "Respaldos en: $resp"
Write-Host 'Listo. En JMDesign: pulsa Cerrar (arriba a la derecha) > Plan de trabajo > Abrir robo-kit > Construir > Reintentar.'
