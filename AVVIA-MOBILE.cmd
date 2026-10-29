@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Installa Node.js 24.22.1 o una versione 24 successiva aggiornata e riapri questo file.
  pause
  exit /b 1
)
echo ClickSocial per il test Wi-Fi. Tieni aperta questa finestra.
echo Per fermare il collegamento premi Ctrl+C.
node scripts/mobile-local.mjs
if errorlevel 1 pause
