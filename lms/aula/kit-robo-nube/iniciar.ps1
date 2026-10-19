# Arranca el aula local en http://127.0.0.1:8800 en Windows 10/11 (sin Git Bash ni WSL).
# Con JMDesign Studio no hace falta: «Plan de trabajo → Abrir → Arrancar el aula» hace lo mismo.
# Si JMDesign está instalado se usa su Python incluido (ya trae los paquetes: sin .venv ni pip).
# Lo más simple: doble clic en iniciar.bat. Desde PowerShell:
#   powershell -ExecutionPolicy Bypass -File iniciar.ps1            arrancar
#   powershell -ExecutionPolicy Bypass -File iniciar.ps1 --token    volver a pedir tu token
# «Continue» y no «Stop»: en PowerShell 5.1 lo que pip o uvicorn escriben en stderr no debe cortar el script;
# cada paso se comprueba con $LASTEXITCODE.
$ErrorActionPreference = "Continue"
Set-Location -LiteralPath $PSScriptRoot
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$env:PYTHONUTF8 = "1"
$env:PYTHONIOENCODING = "utf-8"
$venv = if ($env:VENV) { $env:VENV } else { ".venv" }
$puerto = if ($env:AULA_PUERTO) { $env:AULA_PUERTO } else { "8800" }
$vpy = Join-Path $venv "Scripts\python.exe"

function Buscar-PythonJMDesign {
  # El Python incluido con JMDesign: JMDESIGN_PYTHON, la ruta que JMDesign anota al abrirse,
  # o la carpeta donde lo deja el instalador (por usuario, en %LOCALAPPDATA%\Programs).
  $candidatos = @()
  if ($env:JMDESIGN_PYTHON) { $candidatos += $env:JMDESIGN_PYTHON }
  $nota = Join-Path $env:APPDATA "com.jmdesign.studio\python.txt"
  if (Test-Path -LiteralPath $nota) { $candidatos += (Get-Content -LiteralPath $nota -TotalCount 1) }
  $carpeta = (Get-ItemProperty -Path "HKCU:\Software\JMDesignStudio" -Name Carpeta -ErrorAction SilentlyContinue).Carpeta
  if ($carpeta) { $candidatos += (Join-Path $carpeta "python\python.exe") }
  if ($env:LOCALAPPDATA) { $candidatos += (Join-Path $env:LOCALAPPDATA "Programs\JMDesign Studio\python\python.exe") }
  foreach ($c in $candidatos) {
    if ($c -and (Test-Path -LiteralPath $c)) {
      & $c -c "import fastapi, uvicorn, httpx, PIL, multipart" 2>$null
      if ($LASTEXITCODE -eq 0) { return $c }
    }
  }
  return $null
}

function Buscar-Python {
  # py -3 (el lanzador de python.org) primero; luego python y python3 (el alias de la Tienda no cuenta si no abre).
  foreach ($orden in @("py -3", "python", "python3")) {
    $partes = $orden -split " "
    $exe = $partes[0]; $extra = @($partes | Select-Object -Skip 1)
    if (Get-Command $exe -ErrorAction SilentlyContinue) {
      & $exe @extra -c "import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)" 2>$null
      if ($LASTEXITCODE -eq 0) { return $orden }
    }
  }
  return $null
}

$jpy = Buscar-PythonJMDesign
if ($jpy) {
  Write-Host "Uso el Python incluido con JMDesign ($jpy)."
  $vpy = $jpy
} elseif (-not (Test-Path $vpy)) {
  $py = Buscar-Python
  if (-not $py) {
    Write-Host ""
    Write-Host "No encuentro Python 3.10 o más nuevo. Lo más fácil: instala JMDesign Studio (trae Python) y arranca el aula desde «Plan de trabajo»."
    Write-Host "O instala Python de una de estas formas y vuelve a abrir iniciar.bat:"
    Write-Host "  winget install Python.Python.3.12"
    Write-Host "  o https://www.python.org/downloads/  (marca 'Add python.exe to PATH')"
    exit 1
  }
  Write-Host "Creando el entorno de Python en $venv (solo la primera vez, ~1 min)..."
  $partes = $py -split " "
  $exe = $partes[0]; $extra = @($partes | Select-Object -Skip 1)
  & $exe @extra -m venv $venv
  if ($LASTEXITCODE -ne 0) { Write-Host "No se pudo crear el entorno $venv."; exit 1 }
  & $vpy -m pip install -q --upgrade pip
  & $vpy -m pip install -q -r requirements.txt
  if ($LASTEXITCODE -ne 0) { Write-Host "Falló la instalación de paquetes (¿hay internet?)."; exit 1 }
}

& $vpy herramientas\verificar.py puerto $puerto
if ($LASTEXITCODE -ne 0) { Write-Host "Cierra ese programa o usa otro puerto:  `$env:AULA_PUERTO=8801; .\iniciar.bat"; exit 1 }

$estado = & $vpy cuenta.py ver
if (($args -contains "--token") -or -not ("$estado".StartsWith("Token presente"))) {
  Write-Host "Vas a entrar con tu cuenta del curso (la del LMS) para recibir tu token personal."
  & $vpy cuenta.py entrar
  if ($LASTEXITCODE -ne 0) { exit 1 }
}
& $vpy cuenta.py ver
$nube = if ($env:JMD_NUBE) { $env:JMD_NUBE } else { "https://jmd-learn.online/aula-nube" }
Write-Host "Aula local en http://127.0.0.1:$puerto  ·  nube del curso: $nube"
Write-Host "Déjala abierta (cierra esta ventana para apagarla). Estado de tu conexión: http://127.0.0.1:$puerto/nube"
& $vpy -m uvicorn aula_local:app --host 127.0.0.1 --port $puerto
