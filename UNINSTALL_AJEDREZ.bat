@echo off
setlocal
set "SCRIPT=%~dp0scripts\windows\uninstall.ps1"
if not exist "%SCRIPT%" (
  echo No se encontro el launcher: "%SCRIPT%"
  pause
  exit /b 1
)
"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT%"
set "RESULT=%ERRORLEVEL%"
if not "%RESULT%"=="0" pause
exit /b %RESULT%
