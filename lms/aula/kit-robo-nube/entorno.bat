@echo off
rem Prepara esta ventana de cmd para tu agente (no depende de la ExecutionPolicy de PowerShell):  entorno.bat
chcp 65001 >nul
set "AQUI=%~dp0"
set "PYTHONUTF8=1"
set "JMD_SKILLS=%AQUI%skills"
set "OSITO_TOKEN=local"
set "JMD_URL_AULA=http://127.0.0.1:8800"
set "IMAGEN_URL=http://127.0.0.1:8800/imagen"
set "STT_URL=http://127.0.0.1:8800/stt"
if not defined JMD_URL set "JMD_URL=http://127.0.0.1:8800"
if not defined JMD_API_KEY set "JMD_API_KEY=local"
rem Python: el incluido con JMDesign (ya trae los paquetes) si esta; si no, el .venv de iniciar.bat.
set "JPY=%JMDESIGN_PYTHON%"
if not defined JPY if exist "%APPDATA%\com.jmdesign.studio\python.txt" set /p JPY=<"%APPDATA%\com.jmdesign.studio\python.txt"
if not defined JPY set "JPY=%LOCALAPPDATA%\Programs\JMDesign Studio\python\python.exe"
if exist "%JPY%" (
  for %%I in ("%JPY%") do set "PATH=%%~dpI;%%~dpIScripts;%PATH%"
  echo Python incluido con JMDesign: %JPY%
) else if exist "%AQUI%.venv\Scripts\activate.bat" (call "%AQUI%.venv\Scripts\activate.bat") else (echo No encuentro Python: instala JMDesign Studio, que lo trae, o arranca primero iniciar.bat)
cd /d "%AQUI%"
echo Listo. Abre tu agente y pega el prompt de trabajo\plan-robo\PROMPT_ARMAR_ROBO.md
echo Criterios del plan:  python herramientas\verificar.py F1-T2
