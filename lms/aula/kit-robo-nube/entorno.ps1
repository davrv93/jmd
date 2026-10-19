# Uso (PowerShell, en la terminal donde vas a abrir tu agente):  . .\entorno.ps1
# Si PowerShell no deja cargar scripts:  powershell -ExecutionPolicy Bypass -NoExit -File entorno.ps1
$aqui = $PSScriptRoot
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$env:PYTHONUTF8 = "1"
$env:JMD_SKILLS = Join-Path $aqui "skills"
$env:OSITO_TOKEN = "local"                         # Robo lo manda al aula local; tu token real lo pone el aula
$env:JMD_URL_AULA = "http://127.0.0.1:8800"
$env:IMAGEN_URL = "http://127.0.0.1:8800/imagen"
$env:STT_URL = "http://127.0.0.1:8800/stt"
if (-not $env:JMD_URL) { $env:JMD_URL = "http://127.0.0.1:8800" }
if (-not $env:JMD_API_KEY) { $env:JMD_API_KEY = "local" }
# Python: el incluido con JMDesign (ya trae los paquetes) si está; si no, el .venv de iniciar.bat.
$jpy = $env:JMDESIGN_PYTHON
$nota = Join-Path $env:APPDATA "com.jmdesign.studio\python.txt"
if (-not $jpy -and (Test-Path -LiteralPath $nota)) { $jpy = Get-Content -LiteralPath $nota -TotalCount 1 }
if (-not $jpy -and $env:LOCALAPPDATA) { $jpy = Join-Path $env:LOCALAPPDATA "Programs\JMDesign Studio\python\python.exe" }
$act = Join-Path $aqui ".venv\Scripts\Activate.ps1"
if ($jpy -and (Test-Path -LiteralPath $jpy)) {
  $dir = Split-Path -Parent $jpy
  $env:PATH = "$dir;$dir\Scripts;$env:PATH"   # python es el de JMDesign
  Write-Host "Python incluido con JMDesign: $jpy"
} elseif (Test-Path $act) { . $act } else { Write-Host "No encuentro Python: instala JMDesign Studio (lo trae) o arranca primero iniciar.bat." }
Set-Location -LiteralPath $aqui
Write-Host "Listo. Estás en $aqui. Abre tu agente y pega el prompt de trabajo\plan-robo\PROMPT_ARMAR_ROBO.md"
Write-Host "Criterios del plan en cualquier sistema:  python herramientas\verificar.py F1-T2"
