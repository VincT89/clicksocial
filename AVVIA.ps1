$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
if (-not (Test-Path -LiteralPath 'node_modules\vite\bin\vite.js')) {
  Write-Host 'Installare prima le dipendenze con npm install.'
  exit 1
}
Write-Host 'Apri http://127.0.0.1:5180 nel browser. Per fermare premi Ctrl+C.'
node scripts/local.mjs
