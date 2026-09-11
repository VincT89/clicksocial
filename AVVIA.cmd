@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Installa Node.js 24.10 o successivo e riapri questo file.
  pause
  exit /b 1
)
if not exist "node_modules\vite\bin\vite.js" (
  echo Installa prima le dipendenze con npm ci nella cartella APP.
  pause
  exit /b 1
)
echo ClickSocial: apri http://127.0.0.1:5180 nel browser.
echo Tieni aperta questa finestra. Per fermare l'app premi Ctrl+C.
node scripts/local.mjs
if errorlevel 1 pause
