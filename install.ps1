# Instalador de jmd para Windows (PowerShell 5.1 o 7+).
#
#   irm https://raw.githubusercontent.com/davrv93/jmd/main/install.ps1 | iex
#
# Variables opcionales (defínelas antes, p. ej. $env:JMD_VERSION = "v0.2.0"):
#   JMD_VERSION        versión concreta (por defecto, la última publicada)
#   JMD_INSTALL_DIR    carpeta destino (por defecto %LOCALAPPDATA%\Programs\jmd)
#   JMD_WITH_GATEWAY   "1" para instalar también el gateway (ai-orchestrator.exe) sin Docker
#   JMD_ARCHIVE        instala desde un .zip local (sin descargar)
#   JMD_DOWNLOAD_BASE  espejo de descarga (por defecto, GitHub Releases)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'   # Invoke-WebRequest es lentísimo con la barra
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$Repo = if ($env:JMD_REPO) { $env:JMD_REPO } else { 'davrv93/jmd' }
$Version = if ($env:JMD_VERSION) { $env:JMD_VERSION } else { 'latest' }
$Dir = if ($env:JMD_INSTALL_DIR) { $env:JMD_INSTALL_DIR } else { Join-Path $env:LOCALAPPDATA 'Programs\jmd' }

# x64 nativo; en Windows ARM64 el binario x64 corre con la emulación del sistema.
$arch = $env:PROCESSOR_ARCHITECTURE
if ($arch -eq 'ARM64') { Write-Host 'Windows ARM64: se instala la versión x64 (corre emulada).' }
elseif ($arch -ne 'AMD64') { throw "arquitectura no soportada: $arch" }
$Asset = 'jmd-x86_64-pc-windows-msvc.zip'

if ($env:JMD_DOWNLOAD_BASE) { $Base = $env:JMD_DOWNLOAD_BASE }
elseif ($Version -eq 'latest') { $Base = "https://github.com/$Repo/releases/latest/download" }
else { $Base = "https://github.com/$Repo/releases/download/$Version" }

$Tmp = Join-Path ([IO.Path]::GetTempPath()) ("jmd-" + [Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $Tmp | Out-Null
try {
    $Zip = Join-Path $Tmp $Asset
    if ($env:JMD_ARCHIVE) {
        Copy-Item $env:JMD_ARCHIVE $Zip
    } else {
        Write-Host "Descargando $Asset ($Version)..."
        Invoke-WebRequest -UseBasicParsing -Uri "$Base/$Asset" -OutFile $Zip
        $Sums = (Invoke-WebRequest -UseBasicParsing -Uri "$Base/SHA256SUMS").Content
        if ($Sums -is [byte[]]) { $Sums = [Text.Encoding]::UTF8.GetString($Sums) }
        $line = ($Sums -split "`n") | Where-Object { $_.Trim().EndsWith(" $Asset") } | Select-Object -First 1
        if (-not $line) { throw "$Asset no figura en SHA256SUMS" }
        $expected = ($line.Trim() -split '\s+')[0].ToLower()
        $actual = (Get-FileHash -Algorithm SHA256 $Zip).Hash.ToLower()
        if ($actual -ne $expected) { throw 'la suma SHA-256 no coincide: descarga corrupta' }
    }

    $Out = Join-Path $Tmp 'x'
    Expand-Archive -Path $Zip -DestinationPath $Out -Force
    New-Item -ItemType Directory -Force -Path $Dir | Out-Null

    $bins = @('jmd.exe')
    if ($env:JMD_WITH_GATEWAY -eq '1') { $bins += 'ai-orchestrator.exe' }
    foreach ($b in $bins) {
        $src = Join-Path $Out $b
        if (-not (Test-Path $src)) { throw "el paquete no trae $b" }
        $dst = Join-Path $Dir $b
        # Un .exe en uso no se puede sobrescribir, pero sí renombrar.
        if (Test-Path $dst) {
            $old = "$dst.old"
            Remove-Item $old -Force -ErrorAction SilentlyContinue
            Rename-Item $dst (Split-Path $old -Leaf) -ErrorAction SilentlyContinue
        }
        Copy-Item $src $dst -Force
        Unblock-File $dst   # quita la marca «descargado de internet»
        Write-Host "OK $dst"
    }
} finally {
    Remove-Item -Recurse -Force $Tmp -ErrorAction SilentlyContinue
}

# PATH del usuario (sin tocar el del sistema).
$userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
if (-not $userPath) { $userPath = '' }
if (($userPath -split ';') -notcontains $Dir) {
    $newPath = if ($userPath) { "$userPath;$Dir" } else { $Dir }
    [Environment]::SetEnvironmentVariable('Path', $newPath, 'User')
    Write-Host "Añadido $Dir al PATH de tu usuario (abre una terminal nueva para que lo tome)."
}
if (($env:Path -split ';') -notcontains $Dir) { $env:Path = "$env:Path;$Dir" }

& (Join-Path $Dir 'jmd.exe') --version
Write-Host ''
Write-Host 'Siguiente paso: jmd login --url <URL del gateway> --token <token>   ·   jmd status'
