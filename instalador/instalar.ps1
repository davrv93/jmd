#Requires -Version 5.1
# Instalador de prerrequisitos del curso "Programacion agentica" para Windows (PowerShell 5.1 o 7+).
#
#   irm https://raw.githubusercontent.com/davrv93/jmd/main/instalador/instalar.ps1 | iex
#
# Con opciones (el "| iex" no admite argumentos; se pasan asi):
#   & ([scriptblock]::Create((irm https://raw.githubusercontent.com/davrv93/jmd/main/instalador/instalar.ps1))) --verificar
# O descargado:   .\instalar.ps1 --verificar
#
# Si PowerShell no deja ejecutar scripts, antes (solo para esta ventana):
#   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
#
# Opciones (tambien por variable de entorno: $env:CURSO_VERIFICAR = "1", etc.):
#   --verificar        solo comprueba y muestra la tabla; no instala nada
#   --sin-docker       no instala Docker Desktop
#   --sin-openpencil   no instala OpenPencil ni la CLI op
#   --si               no pide confirmaciones
#
# Idempotente: lo que ya esta se salta. Registro en %USERPROFILE%\curso-agentico\instalador.log.
# Este archivo es ASCII a proposito (sin acentos): PowerShell 5.1 lee los .ps1 sin BOM como Windows-1252.

$ErrorActionPreference = 'Continue'
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

# ---------------------------------------------------------------------------
# Opciones
# ---------------------------------------------------------------------------
$Verificar = $env:CURSO_VERIFICAR -eq '1'
$SinDocker = $env:CURSO_SIN_DOCKER -eq '1'
$SinOpenPencil = $env:CURSO_SIN_OPENPENCIL -eq '1'
$Si = $env:CURSO_SI -eq '1'
foreach ($a in $args) {
    switch ($a) {
        '--verificar' { $Verificar = $true }
        '--sin-docker' { $SinDocker = $true }
        '--sin-openpencil' { $SinOpenPencil = $true }
        '--si' { $Si = $true }
        '-y' { $Si = $true }
        default { Write-Host "opcion desconocida: $a" -ForegroundColor Red; return }
    }
}
$EsArchivo = [bool]$MyInvocation.MyCommand.Path   # con "irm | iex" no hay archivo: no se puede usar exit

# ---------------------------------------------------------------------------
# Salida y registro
# ---------------------------------------------------------------------------
$CursoDir = Join-Path $env:USERPROFILE 'curso-agentico'
New-Item -ItemType Directory -Force -Path $CursoDir | Out-Null
$Log = Join-Path $CursoDir 'instalador.log'
Add-Content -Path $Log -Value ("`n===== {0} instalar.ps1 {1} =====" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), ($args -join ' '))

function Say($t) { Write-Host $t; Add-Content -Path $Log -Value $t }
function Paso($n, $t) { Write-Host ""; Write-Host "[$n] $t" -ForegroundColor White; Add-Content -Path $Log -Value "`n[$n] $t" }
function Hecho($t) { Write-Host "  ok: $t" -ForegroundColor Green; Add-Content -Path $Log -Value "ok: $t" }
function Falta($t) { Write-Host "  falta: $t" -ForegroundColor Red; Add-Content -Path $Log -Value "falta: $t" }
function Fallo($t) { Write-Host "  fallo: $t" -ForegroundColor Red; Add-Content -Path $Log -Value "fallo: $t" }
function Avisa($t) { Write-Host "  aviso: $t" -ForegroundColor Yellow; Add-Content -Path $Log -Value "aviso: $t" }
function Tiene($cmd) { [bool](Get-Command $cmd -ErrorAction SilentlyContinue) }

# Ejecuta un programa mandando su salida al log; devuelve $true si salio con 0.
function Ejecutar([string]$Exe, [string[]]$Argumentos) {
    $linea = "$Exe $($Argumentos -join ' ')"
    Write-Host "  > $linea"; Add-Content -Path $Log -Value "> $linea"
    try {
        & $Exe @Argumentos 2>&1 | ForEach-Object { Add-Content -Path $Log -Value ($_ | Out-String).TrimEnd() }
        return ($LASTEXITCODE -eq 0 -or $null -eq $LASTEXITCODE)
    } catch {
        Add-Content -Path $Log -Value $_.Exception.Message
        return $false
    }
}

# Vuelve a leer el PATH del registro: winget y npm lo cambian para sesiones nuevas, no para esta.
function Recargar-Path {
    $m = [Environment]::GetEnvironmentVariable('Path', 'Machine')
    $u = [Environment]::GetEnvironmentVariable('Path', 'User')
    $env:Path = "$m;$u"
    foreach ($d in @((Join-Path $env:APPDATA 'npm'), (Join-Path $env:LOCALAPPDATA 'Programs\jmd'), (Join-Path $env:USERPROFILE 'scoop\shims'), (Join-Path $env:USERPROFILE '.local\bin'))) {
        if ((Test-Path $d) -and ($env:Path -split ';' -notcontains $d)) { $env:Path = "$d;$env:Path" }
    }
}

# Anade una carpeta al PATH del usuario (persistente) si no esta.
function Asegurar-EnPath($d) {
    $u = [Environment]::GetEnvironmentVariable('Path', 'User')
    if (($u -split ';') -notcontains $d) {
        [Environment]::SetEnvironmentVariable('Path', "$u;$d", 'User')
        Say "  Anadido $d al PATH del usuario (abre una terminal nueva para que lo tome)."
    }
    if ($env:Path -split ';' -notcontains $d) { $env:Path = "$d;$env:Path" }
}

function Preguntar($t) {
    if ($Si) { return $true }
    $r = Read-Host "$t [S/n]"
    return ($r -eq '' -or $r -match '^(s|si|y)$')
}

# winget: instala si falta; con --accept-* no pregunta. Devuelve $true si quedo instalado.
function Winget-Instalar($id) {
    Ejecutar 'winget' @('install', '--id', $id, '-e', '--source', 'winget', '--accept-package-agreements', '--accept-source-agreements', '--disable-interactivity', '--silent') | Out-Null
    Recargar-Path
    return $true
}

# ---------------------------------------------------------------------------
# Tabla de resultados
# ---------------------------------------------------------------------------
$Resultados = New-Object System.Collections.ArrayList
function Registrar($nombre, $estado, $version, $obligatorio = $true) {
    [void]$Resultados.Add([pscustomobject]@{ Nombre = $nombre; Estado = $estado; Version = "$version"; Obligatorio = $obligatorio })
}

# ---------------------------------------------------------------------------
# Detectores de version ($null si no esta)
# ---------------------------------------------------------------------------
function V-Git { if (Tiene git) { (git --version 2>$null) -replace '^git version ', '' } }
function V-Node { if (Tiene node) { node --version 2>$null } }
function V-NodeApto { $v = V-Node; if ($v -and ($v -match '^v(\d+)') -and ([int]$Matches[1] -ge 20)) { $v } }
function V-Python {
    foreach ($p in @('py', 'python', 'python3')) {
        if (-not (Tiene $p)) { continue }
        try {
            $v = if ($p -eq 'py') { & py -3 -c 'import sys; print("%d.%d.%d" % sys.version_info[:3])' 2>$null } else { & $p -c 'import sys; print("%d.%d.%d" % sys.version_info[:3])' 2>$null }
            if ($v -match '^3\.(\d+)\.' -and [int]$Matches[1] -ge 11) { return $v }
        } catch { $null = $_ }   # ese interprete no responde: se prueba el siguiente
    }
}
function V-Docker { if (Tiene docker) { ((docker --version 2>$null) -replace '^Docker version ', '') -replace ',.*', '' } }
function V-Code {
    if (Tiene code) { return (code --version 2>$null | Select-Object -First 1) }
    foreach ($d in @((Join-Path $env:LOCALAPPDATA 'Programs\Microsoft VS Code'), (Join-Path $env:ProgramFiles 'Microsoft VS Code'))) {
        if (Test-Path (Join-Path $d 'Code.exe')) { return (Get-Item (Join-Path $d 'Code.exe')).VersionInfo.ProductVersion }
    }
}
function V-Rg { if (Tiene rg) { ((rg --version 2>$null | Select-Object -First 1) -replace '^ripgrep ', '') -replace ' .*', '' } }
function V-OpenCode { if (Tiene opencode) { (opencode --version 2>$null | Select-Object -First 1) -replace '^opencode ', '' } }
function V-Rtk { if (Tiene rtk) { (rtk --version 2>$null) -replace '^rtk ', '' } }
function V-Caveman { if (Tiene caveman) { $j = (caveman --version 2>$null) -join ' '; if ($j -match '"version":\s*"([^"]+)"') { $Matches[1] } else { 'instalado' } } }
function V-Jmd { if (Tiene jmd) { (jmd --version 2>$null | Select-Object -First 1) -replace '^jmd ', '' } }
function V-Op { if (Tiene op) { (op --version 2>$null | Select-Object -First 1) -replace '^op ', '' } }
function V-OpenPencil {
    if (Tiene scoop) { $l = scoop list openpencil 2>$null | Out-String; if ($l -match 'openpencil\s+(\S+)') { return $Matches[1] } }
    foreach ($d in @((Join-Path $env:LOCALAPPDATA 'Programs\OpenPencil'), (Join-Path $env:ProgramFiles 'OpenPencil'))) {
        if (Test-Path $d) { return 'instalado' }
    }
}
function V-Claude { if (Tiene claude) { (claude --version 2>$null | Select-Object -First 1) -replace ' .*', '' } }
function V-Wsl { try { $s = wsl --status 2>$null | Out-String; if ($LASTEXITCODE -eq 0 -and $s) { return $true } } catch { $null = $_ }; return $false }
$OpenCodeCfg = Join-Path $env:USERPROFILE '.config\opencode\opencode.json'
function Mcp-CavemanEnOpenCode { (Test-Path $OpenCodeCfg) -and ((Get-Content -Raw $OpenCodeCfg) -match 'caveman-mcp') }

# ---------------------------------------------------------------------------
# Pasos
# ---------------------------------------------------------------------------
function Paso-Git {
    Paso 1 'Git'
    $v = V-Git; if ($v) { Hecho "ya esta: git $v"; Registrar 'git' 'ok' $v; return }
    if ($Verificar) { Falta 'git'; Registrar 'git' 'falta' ''; return }
    Winget-Instalar 'Git.Git' | Out-Null
    $v = V-Git; if ($v) { Hecho "git $v"; Registrar 'git' 'ok' $v } else { Fallo 'git no quedo instalado'; Registrar 'git' 'fallo' '' }
}
function Paso-Node {
    Paso 2 'Node.js LTS (22.x)'
    $v = V-NodeApto; if ($v) { Hecho "ya esta: node $v"; Registrar 'node' 'ok' $v; return }
    if (V-Node) { Avisa "hay node $(V-Node), muy antiguo: se instala la LTS" }
    if ($Verificar) { Falta 'node 22 (LTS)'; Registrar 'node' 'falta' "$(V-Node)"; return }
    Winget-Instalar 'OpenJS.NodeJS.LTS' | Out-Null
    $v = V-NodeApto; if ($v) { Hecho "node $v"; Registrar 'node' 'ok' $v } else { Fallo 'Node LTS no quedo instalado'; Registrar 'node' 'fallo' "$(V-Node)" }
}
function Paso-Python {
    Paso 3 'Python 3.11 o superior'
    $v = V-Python; if ($v) { Hecho "ya esta: python $v"; Registrar 'python' 'ok' $v; return }
    if ($Verificar) { Falta 'python 3.11+'; Registrar 'python' 'falta' ''; return }
    Winget-Instalar 'Python.Python.3.12' | Out-Null
    $v = V-Python; if ($v) { Hecho "python $v"; Registrar 'python' 'ok' $v } else { Fallo 'Python no quedo instalado'; Registrar 'python' 'fallo' '' }
}
function Paso-Docker {
    Paso 4 'Docker Desktop (con WSL2)'
    if ($SinDocker) { Say '  omitido (--sin-docker)'; Registrar 'docker' 'omitido' '' $false; return }
    $v = V-Docker; if ($v) { Hecho "ya esta: docker $v"; Registrar 'docker' 'ok' $v; return }
    if ($Verificar) { Falta 'docker'; if (-not (V-Wsl)) { Avisa 'WSL tampoco esta (Docker Desktop lo necesita)' }; Registrar 'docker' 'falta' ''; return }
    $reinicio = $false
    if (-not (V-Wsl)) {
        Say '  WSL no esta: se instala (wsl --install). Pide permisos de administrador y un reinicio de Windows.'
        Ejecutar 'wsl' @('--install', '--no-launch') | Out-Null
        $reinicio = $true
    }
    Winget-Instalar 'Docker.DockerDesktop' | Out-Null
    if ((Tiene docker) -or (Test-Path (Join-Path $env:ProgramFiles 'Docker\Docker\Docker Desktop.exe'))) {
        if ($reinicio) { Avisa 'reinicia Windows (WSL recien instalado) y luego abre Docker Desktop una vez' }
        else { Avisa 'abre Docker Desktop una vez y acepta los permisos; hasta entonces "docker" no responde' }
        Registrar 'docker' 'reinicio' "$(V-Docker)"
    } else { Fallo 'Docker Desktop no quedo instalado'; Registrar 'docker' 'fallo' '' }
}
function Paso-Code {
    Paso 5 'Visual Studio Code (+ extension WSL)'
    $v = V-Code
    if (-not $v) {
        if ($Verificar) { Falta 'VS Code'; Registrar 'code' 'falta' ''; return }
        Winget-Instalar 'Microsoft.VisualStudioCode' | Out-Null
        $v = V-Code
    } else { Hecho "ya esta: code $v" }
    if (-not $v) { Fallo 'VS Code no quedo instalado'; Registrar 'code' 'fallo' ''; return }
    if (-not $Verificar -and (Tiene code)) {
        $ext = (code --list-extensions 2>$null) -join "`n"
        if ($ext -match 'ms-vscode-remote.remote-wsl') { Hecho 'extension WSL ya instalada' }
        else { if (Ejecutar 'code' @('--install-extension', 'ms-vscode-remote.remote-wsl')) { Hecho 'extension WSL instalada' } else { Avisa 'no se pudo instalar la extension WSL: code --install-extension ms-vscode-remote.remote-wsl' } }
    }
    Registrar 'code' 'ok' $v
}
function Paso-Rg {
    Paso 6 'ripgrep (rg)'
    $v = V-Rg; if ($v) { Hecho "ya esta: rg $v"; Registrar 'ripgrep' 'ok' $v; return }
    if ($Verificar) { Falta 'ripgrep'; Registrar 'ripgrep' 'falta' ''; return }
    Winget-Instalar 'BurntSushi.ripgrep.MSVC' | Out-Null
    $v = V-Rg; if ($v) { Hecho "rg $v"; Registrar 'ripgrep' 'ok' $v } else { Fallo 'ripgrep no quedo instalado'; Registrar 'ripgrep' 'fallo' '' }
}
function Paso-OpenCode {
    Paso 7 'OpenCode'
    $v = V-OpenCode; if ($v) { Hecho "ya esta: opencode $v"; Registrar 'opencode' 'ok' $v; return }
    if ($Verificar) { Falta 'opencode'; Registrar 'opencode' 'falta' ''; return }
    if (-not (Tiene npm)) { Fallo 'sin npm (Node) no se puede instalar OpenCode'; Registrar 'opencode' 'fallo' ''; return }
    Ejecutar 'npm' @('install', '-g', 'opencode-ai') | Out-Null; Recargar-Path
    $v = V-OpenCode; if ($v) { Hecho "opencode $v"; Registrar 'opencode' 'ok' $v } else { Fallo 'OpenCode no quedo instalado'; Registrar 'opencode' 'fallo' '' }
}
function Paso-Rtk {
    Paso 8 'RTK (ahorro de tokens en las herramientas)'
    $v = V-Rtk
    if ($v) { Hecho "ya esta: rtk $v" }
    else {
        if ($Verificar) { Falta 'rtk'; Registrar 'rtk' 'falta' ''; return }
        Winget-Instalar 'rtk-ai.rtk' | Out-Null
        $v = V-Rtk
        if ($v) { Hecho "rtk $v" } else { Fallo 'RTK no quedo instalado'; Registrar 'rtk' 'fallo' ''; return }
    }
    if (-not $Verificar) {
        if (Ejecutar 'rtk' @('init', '-g', '--opencode', '--auto-patch')) { Hecho 'hooks de rtk activados (rtk init -g --opencode --auto-patch)' }
        else { Avisa 'rtk init devolvio error; ejecutalo a mano: rtk init -g --opencode --auto-patch' }
    }
    Registrar 'rtk' 'ok' $v
}
function Registrar-McpCavemanOpenCode {
    if (Mcp-CavemanEnOpenCode) { Hecho 'MCP caveman ya registrado en OpenCode'; return }
    New-Item -ItemType Directory -Force -Path (Split-Path $OpenCodeCfg) | Out-Null
    $cfg = @{}
    if (Test-Path $OpenCodeCfg) {
        try { $cfg = Get-Content -Raw $OpenCodeCfg | ConvertFrom-Json } catch { Avisa "no se pudo leer $OpenCodeCfg (comentarios?). Anade a mano la seccion mcp.caveman del README."; return }
    } else { $cfg = [pscustomobject]@{ '$schema' = 'https://opencode.ai/config.json' } }
    if (-not $cfg.PSObject.Properties['mcp']) { $cfg | Add-Member -NotePropertyName 'mcp' -NotePropertyValue ([pscustomobject]@{}) }
    $srv = [pscustomobject]@{ type = 'local'; command = @('npx', '-y', 'caveman-mcp'); enabled = $true }
    if ($cfg.mcp.PSObject.Properties['caveman']) { $cfg.mcp.caveman = $srv } else { $cfg.mcp | Add-Member -NotePropertyName 'caveman' -NotePropertyValue $srv }
    $cfg | ConvertTo-Json -Depth 10 | Set-Content -Path $OpenCodeCfg -Encoding UTF8
    Hecho "MCP caveman registrado en OpenCode ($OpenCodeCfg)"
}
function Paso-Caveman {
    Paso 9 'caveman (compresion de contexto) y su MCP'
    $v = V-Caveman
    if ($v) { Hecho "ya esta: caveman $v" }
    else {
        if ($Verificar) { Falta 'caveman'; Registrar 'caveman' 'falta' ''; Registrar 'caveman-mcp' 'falta' '' $false; return }
        if (-not (V-NodeApto)) { Fallo 'sin Node 22 no se puede instalar caveman'; Registrar 'caveman' 'fallo' ''; Registrar 'caveman-mcp' 'falta' '' $false; return }
        Ejecutar 'npm' @('install', '-g', '@caveman-ai/cli') | Out-Null; Recargar-Path
        $v = V-Caveman
        if (-not $v) { Fallo 'caveman no quedo instalado (npm install -g @caveman-ai/cli)'; Registrar 'caveman' 'fallo' ''; Registrar 'caveman-mcp' 'falta' '' $false; return }
        Hecho "caveman $v"
    }
    if (-not $Verificar) {
        if (-not (Ejecutar 'caveman' @('setup', '--install'))) { Avisa "caveman setup --install devolvio error (detalle en $Log)" }
        if (-not (Ejecutar 'npx' @('-y', 'skills', 'add', 'JuliusBrussee/caveman', '-g', '-y'))) { Avisa 'no se pudo anadir la skill: npx skills add JuliusBrussee/caveman -g' }
        Registrar-McpCavemanOpenCode
        if (Tiene claude) {
            & claude mcp get caveman *> $null
            if ($LASTEXITCODE -eq 0) { Hecho 'MCP caveman ya registrado en Claude Code' }
            elseif (Ejecutar 'claude' @('mcp', 'add', '--scope', 'user', 'caveman', '--', 'npx', '-y', 'caveman-mcp')) { Hecho 'MCP caveman registrado en Claude Code' }
        }
    }
    Registrar 'caveman' 'ok' $v
    if (Mcp-CavemanEnOpenCode) { Registrar 'caveman-mcp' 'ok' 'npx -y caveman-mcp' $false } else { Registrar 'caveman-mcp' 'falta' '' $false }
}
function Paso-OpenPencil {
    Paso 10 'OpenPencil (diseno con agentes) y su CLI op'
    if ($SinOpenPencil) { Say '  omitido (--sin-openpencil)'; Registrar 'openpencil' 'omitido' '' $false; Registrar 'op' 'omitido' '' $false; return }
    $v = V-OpenPencil
    if ($v) { Hecho "ya esta: OpenPencil $v"; Registrar 'openpencil' 'ok' $v $false }
    elseif ($Verificar) { Falta 'OpenPencil (opcional)'; Registrar 'openpencil' 'falta' '' $false }
    else {
        if (-not (Tiene scoop)) {
            Say '  Scoop no esta: se instala (gestor de paquetes de usuario, sin administrador).'
            try { Invoke-RestMethod -UseBasicParsing 'https://get.scoop.sh' | Invoke-Expression *>> $Log } catch { Add-Content -Path $Log -Value $_.Exception.Message }
            Recargar-Path
        }
        if (Tiene scoop) {
            Ejecutar 'scoop' @('bucket', 'add', 'openpencil', 'https://github.com/zseven-w/scoop-openpencil') | Out-Null
            Ejecutar 'scoop' @('install', 'openpencil') | Out-Null
            Recargar-Path
        } else { Fallo 'no se pudo instalar Scoop; OpenPencil queda pendiente: https://github.com/ZSeven-W/openpencil/releases' }
        $v = V-OpenPencil
        if ($v) { Hecho "OpenPencil $v"; Registrar 'openpencil' 'ok' $v $false } else { Fallo 'OpenPencil no quedo instalado (opcional)'; Registrar 'openpencil' 'fallo' '' $false }
    }
    $v = V-Op
    if ($v) { Hecho "ya esta: op $v"; Registrar 'op' 'ok' $v $false }
    elseif ($Verificar) { Falta 'op (opcional)'; Registrar 'op' 'falta' '' $false }
    else {
        try { Invoke-RestMethod -UseBasicParsing 'https://raw.githubusercontent.com/ZSeven-W/openpencil/main/scripts/install-op.ps1' | Invoke-Expression *>> $Log } catch { Add-Content -Path $Log -Value $_.Exception.Message }
        Recargar-Path
        $v = V-Op
        if ($v) { Hecho "op $v"; Registrar 'op' 'ok' $v $false } else { Fallo 'la CLI op no quedo instalada (opcional)'; Registrar 'op' 'fallo' '' $false }
    }
    if (-not $Verificar) { Avisa 'el MCP de OpenPencil se activa desde la propia app (ajustes del agente > MCP): el puerto lo elige la app. Ver README.' }
}
function Paso-Jmd {
    Paso 11 'jmd (CLI del curso, sin gateway)'
    $v = V-Jmd; if ($v) { Hecho "ya esta: jmd $v"; Registrar 'jmd' 'ok' $v; return }
    if ($Verificar) { Falta 'jmd'; Registrar 'jmd' 'falta' ''; return }
    $env:JMD_NO_INIT = '1'; $env:JMD_WITH_GATEWAY = '0'
    try { Invoke-RestMethod -UseBasicParsing 'https://raw.githubusercontent.com/davrv93/jmd/main/install.ps1' | Invoke-Expression *>> $Log } catch { Add-Content -Path $Log -Value $_.Exception.Message }
    Recargar-Path
    $v = V-Jmd; if ($v) { Hecho "jmd $v"; Registrar 'jmd' 'ok' $v } else { Fallo 'jmd no quedo instalado'; Registrar 'jmd' 'fallo' '' }
}
function Paso-Carpeta {
    Paso 12 "Carpeta de trabajo $CursoDir"
    if ($Verificar) { Say '  (no se toca en modo --verificar)'; return }
    $agents = Join-Path $CursoDir 'AGENTS.md'
    if (-not (Test-Path $agents)) {
        @(
            '# AGENTS.md',
            '- Responde siempre en espa' + [char]0x00F1 + 'ol.',
            '- Respuestas cortas: primero el cambio, despu' + [char]0x00E9 + 's la explicaci' + [char]0x00F3 + 'n si hace falta.',
            '- Pregunta antes de borrar archivos o ejecutar comandos destructivos.'
        ) | Set-Content -Path $agents -Encoding UTF8
        Hecho "creado $agents"
    } else { Hecho "ya existe $agents" }
    $oc = Join-Path $CursoDir 'opencode.json'
    if (-not (Test-Path $oc)) {
        @'
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "clase": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "Gateway de la clase",
      "options": {
        "baseURL": "PON_AQUI_LA_URL_DEL_GATEWAY",
        "apiKey": "{env:GATEWAY_API_KEY}"
      },
      "models": { "auto": { "name": "auto" } }
    }
  },
  "model": "clase/auto"
}
'@ | Set-Content -Path $oc -Encoding UTF8
        Hecho "creado $oc (plantilla)"
    } else { Hecho "ya existe $oc" }
    Avisa 'opencode.json necesita la URL del gateway (baseURL, termina en /v1) y la clave que da el instructor: $env:GATEWAY_API_KEY = "..."'
}

# ---------------------------------------------------------------------------
# Resumen
# ---------------------------------------------------------------------------
function Resumen {
    Say ''; Say 'Resumen'
    Say ('  {0,-24} {1,-18} {2}' -f 'Herramienta', 'Estado', 'Version')
    Say ('  {0,-24} {1,-18} {2}' -f '-----------', '------', '-------')
    foreach ($r in $Resultados) {
        $n = $r.Nombre; if (-not $r.Obligatorio) { $n = "$n (opcional)" }
        $et = switch ($r.Estado) { 'reinicio' { 'requiere reinicio' } default { $r.Estado } }
        $col = switch ($r.Estado) { 'ok' { 'Green' } 'reinicio' { 'Yellow' } 'falta' { 'Red' } 'fallo' { 'Red' } default { 'Gray' } }
        Write-Host ('  {0,-24} ' -f $n) -NoNewline
        Write-Host ('{0,-18}' -f $et) -ForegroundColor $col -NoNewline
        Write-Host (' {0}' -f $r.Version)
        Add-Content -Path $Log -Value ('{0,-24} {1,-18} {2}' -f $n, $r.Estado, $r.Version)
    }
    $faltan = @($Resultados | Where-Object { $_.Obligatorio -and ($_.Estado -eq 'falta' -or $_.Estado -eq 'fallo') }).Count
    $reinicios = @($Resultados | Where-Object { $_.Estado -eq 'reinicio' }).Count
    Say ''
    if ($faltan -eq 0) {
        if ($Verificar) { Write-Host 'Todo lo obligatorio esta instalado.' -ForegroundColor Green }
        else { Write-Host 'Listo. Abre una terminal nueva para que el PATH se actualice.' -ForegroundColor Green }
        if ($reinicios -gt 0) { Write-Host 'Hay pasos que requieren abrir una app o reiniciar: revisa los avisos de arriba.' -ForegroundColor Yellow }
        Say "Registro: $Log"
        return 0
    }
    Write-Host "Faltan $faltan herramientas obligatorias." -ForegroundColor Red
    if ($Verificar) { Say 'Para instalarlas, vuelve a ejecutar el instalador sin --verificar.' } else { Say "Revisa los fallos arriba y el registro: $Log" }
    return 1
}

# ---------------------------------------------------------------------------
# Programa principal
# ---------------------------------------------------------------------------
Say 'Prerrequisitos del curso "Programacion agentica"'
Say ("Sistema: Windows {0} ({1}) - PowerShell {2}" -f [Environment]::OSVersion.Version, $env:PROCESSOR_ARCHITECTURE, $PSVersionTable.PSVersion)

if (-not (Tiene winget)) {
    Write-Host 'winget (App Installer) es obligatorio y no esta.' -ForegroundColor Red
    Say 'Instalalo desde Microsoft Store: https://apps.microsoft.com/detail/9NBLGGH4NNS1  (o actualiza Windows) y vuelve a ejecutar.'
    if ($EsArchivo) { exit 1 } else { return }
}

if ($Verificar) {
    Say 'Modo --verificar: solo se comprueba, no se instala nada.'
} else {
    Say ''
    Say 'Se va a instalar (lo que ya este se salta):'
    Say '  1. Git            2. Node.js LTS 22    3. Python 3.12'
    if ($SinDocker) { Say '  4. Docker Desktop (omitido)' } else { Say '  4. Docker Desktop (+ WSL2 si falta)' }
    Say '  5. VS Code        6. ripgrep           7. OpenCode'
    Say '  8. RTK            9. caveman + MCP'
    if ($SinOpenPencil) { Say ' 10. OpenPencil (omitido)' } else { Say ' 10. OpenPencil (Scoop) + CLI op' }
    Say " 11. jmd          12. carpeta $CursoDir (AGENTS.md y opencode.json)"
    Say 'Los paquetes van por winget; algunos piden confirmacion de administrador (UAC).'
    Say "Registro detallado: $Log"
    Say ''
    if (-not (Preguntar 'Continuar?')) { Say 'Cancelado.'; if ($EsArchivo) { exit 1 } else { return } }
}

Recargar-Path
Paso-Git
Paso-Node
Paso-Python
Paso-Docker
Paso-Code
Paso-Rg
Paso-OpenCode
Paso-Rtk
Paso-Caveman
Paso-OpenPencil
Paso-Jmd
Paso-Carpeta
if (Tiene claude) { Registrar 'claude-code' 'ok' (V-Claude) $false }

$codigo = Resumen
if ($EsArchivo) { exit $codigo }
