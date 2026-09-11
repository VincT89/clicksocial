@echo off
setlocal
cd /d "%~dp0"
if not defined JAVA_HOME if exist "%ProgramFiles%\Android\Android Studio\jbr\bin\java.exe" set "JAVA_HOME=%ProgramFiles%\Android\Android Studio\jbr"
echo Preparazione e compilazione di ClickSocial per il collaudo Android.
node scripts/mobile-android.mjs
if errorlevel 1 (
  echo Compilazione non riuscita. Consulta il messaggio sopra e MOBILE.md.
  pause
  exit /b 1
)
echo APK pronto in work\mobile-builds\ClickSocial-test.apk
pause
