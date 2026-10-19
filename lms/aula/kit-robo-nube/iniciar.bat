@echo off
rem Arranca el aula local en Windows 10/11. Doble clic, o en una terminal: iniciar.bat [--token]
rem Con JMDesign Studio no hace falta: Plan de trabajo, Abrir, Arrancar el aula.
rem Llama a iniciar.ps1 saltando la ExecutionPolicy solo para este script (no cambia nada del sistema).
chcp 65001 >nul
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0iniciar.ps1" %*
if errorlevel 1 pause
